#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import nodePath from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { repositoryRootFromCwd } from './check-site-content.mjs';

const requireFromSite = createRequire(new URL('../site/package.json', import.meta.url));
const { parse } = requireFromSite('yaml');

export class DeploymentWorkflowValidationError extends Error {
  constructor(issues) {
    super(
      'GitHub Pages workflow validation failed:\n' +
        issues.map((issue) => `- ${issue}`).join('\n'),
    );
    this.name = 'DeploymentWorkflowValidationError';
    this.issues = issues;
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, expected) {
  if (!isRecord(value)) return false;
  return (
    JSON.stringify(Object.keys(value).sort()) ===
    JSON.stringify([...expected].sort())
  );
}

function exactPermissions(value, expected) {
  return (
    exactKeys(value, Object.keys(expected)) &&
    Object.entries(expected).every(([key, permission]) => value[key] === permission)
  );
}

function actionStep(steps, action) {
  return steps.filter((step) => isRecord(step) && step.uses === action);
}

export function validateDeploymentWorkflow(source) {
  const issues = [];
  let workflow;
  try {
    workflow = parse(source, {
      maxAliasCount: 0,
      prettyErrors: true,
      strict: true,
      uniqueKeys: true,
    });
  } catch (error) {
    throw new DeploymentWorkflowValidationError([
      `workflow YAML cannot be parsed: ${error.message}`,
    ]);
  }

  if (!isRecord(workflow)) {
    throw new DeploymentWorkflowValidationError(['workflow root must be a mapping']);
  }

  const triggers = workflow.on;
  if (!exactKeys(triggers, ['push', 'workflow_dispatch'])) {
    issues.push('triggers must be exactly push and workflow_dispatch');
  }
  if (
    !isRecord(triggers?.push) ||
    !Array.isArray(triggers.push.branches) ||
    triggers.push.branches.length !== 1 ||
    triggers.push.branches[0] !== 'main'
  ) {
    issues.push('push trigger must select only the main branch');
  }

  if (!exactKeys(workflow.permissions, [])) {
    issues.push('top-level permissions must default to none');
  }
  if (
    !isRecord(workflow.concurrency) ||
    workflow.concurrency.group !== 'github-pages' ||
    workflow.concurrency['cancel-in-progress'] !== false
  ) {
    issues.push('deployments must share github-pages concurrency without interruption');
  }

  if (!exactKeys(workflow.jobs, ['build', 'deploy'])) {
    issues.push('jobs must be exactly build and deploy');
  }
  const build = workflow.jobs?.build;
  const deploy = workflow.jobs?.deploy;
  if (!isRecord(build)) issues.push('build job is missing');
  if (!isRecord(deploy)) issues.push('deploy job is missing');

  if (isRecord(build)) {
    if (
      build.if !== "github.ref == 'refs/heads/main'" ||
      build['runs-on'] !== 'ubuntu-latest' ||
      build['timeout-minutes'] !== 30
    ) {
      issues.push(
        'build job must be main-only and use ubuntu-latest with a 30-minute timeout',
      );
    }
    if (!exactPermissions(build.permissions, { contents: 'read', pages: 'write' })) {
      issues.push('build token permissions must be only contents:read and pages:write');
    }
    if (!Array.isArray(build.steps)) {
      issues.push('build job must contain an ordered steps list');
    } else {
      if (build.steps.length !== 5) {
        issues.push('build job must contain exactly five reviewed steps');
      }
      const checkout = actionStep(build.steps, 'actions/checkout@v7');
      const configure = actionStep(build.steps, 'actions/configure-pages@v5');
      const upload = actionStep(build.steps, 'actions/upload-pages-artifact@v5');
      if (checkout.length !== 1) {
        issues.push('build must use actions/checkout@v7 exactly once');
      } else if (checkout[0].with?.['persist-credentials'] !== false) {
        issues.push('checkout must disable persisted Git credentials');
      }
      if (configure.length !== 1 || configure[0].id !== 'pages') {
        issues.push('build must configure Pages once with id pages and v5');
      }
      if (upload.length !== 1 || upload[0].with?.path !== 'pages-artifact') {
        issues.push('build must upload only pages-artifact with upload-pages-artifact@v5');
      }

      const buildStep = build.steps.find(
        (step) =>
          isRecord(step) &&
          typeof step.run === 'string' &&
          step.run.includes('docker build'),
      );
      if (!buildStep) {
        issues.push('build job must build the validated Docker site image');
      } else {
        if (buildStep.env?.SITE_BASE !== '${{ steps.pages.outputs.base_path }}/') {
          issues.push('Docker build SITE_BASE must come from configure-pages base_path');
        }
        for (const required of [
          '--build-arg "SITE_BASE=${SITE_BASE}"',
          '--target site',
          '--tag learn-llm-site:pages',
        ]) {
          if (!buildStep.run.includes(required)) {
            issues.push(`Docker build is missing ${required}`);
          }
        }
      }

      const exportStep = build.steps.find(
        (step) =>
          isRecord(step) &&
          typeof step.run === 'string' &&
          step.run.includes('docker cp'),
      );
      if (!exportStep) {
        issues.push('build job must export the static tree from the validated image');
      } else {
        for (const required of [
          '/usr/share/nginx/html/.',
          'pages-artifact/index.html',
          'pages-artifact/en/course/index.html',
          'pages-artifact/ru/course/index.html',
          'find pages-artifact -type l',
        ]) {
          if (!exportStep.run.includes(required)) {
            issues.push(`artifact export is missing ${required}`);
          }
        }
      }

      const indices = [
        build.steps.indexOf(configure[0]),
        build.steps.indexOf(buildStep),
        build.steps.indexOf(exportStep),
        build.steps.indexOf(upload[0]),
      ];
      if (
        indices.some((index) => index < 0) ||
        indices.some((index, i) => i > 0 && index <= indices[i - 1])
      ) {
        issues.push('configure, build, export, and upload steps must run in that order');
      }
    }
  }

  if (isRecord(deploy)) {
    if (
      deploy.needs !== 'build' ||
      deploy['runs-on'] !== 'ubuntu-latest' ||
      deploy['timeout-minutes'] !== 15
    ) {
      issues.push('deploy job must depend on build and use the bounded hosted runner');
    }
    if (!exactPermissions(deploy.permissions, { pages: 'write', 'id-token': 'write' })) {
      issues.push('deploy token permissions must be only pages:write and id-token:write');
    }
    if (
      !isRecord(deploy.environment) ||
      deploy.environment.name !== 'github-pages' ||
      deploy.environment.url !== '${{ steps.deployment.outputs.page_url }}'
    ) {
      issues.push('deploy must target github-pages and expose the action page_url');
    }
    if (!Array.isArray(deploy.steps)) {
      issues.push('deploy job must contain an ordered steps list');
    } else {
      if (deploy.steps.length !== 1) {
        issues.push('deploy job must contain exactly one reviewed step');
      }
      const deployment = actionStep(deploy.steps, 'actions/deploy-pages@v5');
      if (deployment.length !== 1 || deployment[0].id !== 'deployment') {
        issues.push('deploy must use actions/deploy-pages@v5 once with id deployment');
      }
    }
  }

  if (/\b(?:pull_request|pull_request_target)\b/.test(source)) {
    issues.push('untrusted pull-request events may not invoke this workflow');
  }
  if (/\bsecrets\.|PAGES_DEPLOY_TOKEN|\bgit\s+push\b/.test(source)) {
    issues.push('native Pages deployment may not use a secret token or git push');
  }

  if (issues.length > 0) throw new DeploymentWorkflowValidationError(issues);
  return {
    triggers: ['push:main', 'workflow_dispatch'],
    actions: [
      'actions/checkout@v7',
      'actions/configure-pages@v5',
      'actions/upload-pages-artifact@v5',
      'actions/deploy-pages@v5',
    ],
  };
}

export function runDeploymentWorkflowCheck(cwd = process.cwd()) {
  const repositoryRoot = repositoryRootFromCwd(cwd);
  const workflowPath = nodePath.join(
    repositoryRoot,
    '.github/workflows/deploy-pages.yml',
  );
  return validateDeploymentWorkflow(readFileSync(workflowPath, 'utf8'));
}

function isMainModule() {
  return (
    process.argv[1] &&
    nodePath.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

if (isMainModule()) {
  try {
    const result = runDeploymentWorkflowCheck();
    console.log(
      `GitHub Pages workflow check passed: ${result.triggers.join(', ')}; ` +
        result.actions.join(', ') + '.',
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
