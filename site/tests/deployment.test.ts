// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync, realpathSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { createRequire } from 'node:module';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// @ts-ignore This plain ESM helper has no TypeScript declaration file.
import { validateDeploymentWorkflow } from '../../scripts/check-deployment-workflow.mjs';

declare const process: { cwd(): string };

const workflowPath = resolve(
  process.cwd(),
  '../.github/workflows/deploy-pages.yml',
);
const workflowSource = readFileSync(workflowPath, 'utf8');

function replaceOnce(source: string, search: string, replacement: string): string {
  expect(source.split(search)).toHaveLength(2);
  return source.replace(search, replacement);
}

describe('GitHub Pages deployment workflow', () => {
  it('resolves root validator dependencies from the site installation', () => {
    const requireFromChecker = createRequire(
      resolve(process.cwd(), '../scripts/check-site-content.mjs'),
    );
    const requireFromSite = createRequire(resolve(process.cwd(), 'package.json'));

    for (const moduleId of ['@astrojs/compiler/sync', 'typescript']) {
      expect(realpathSync(requireFromChecker.resolve(moduleId))).toBe(
        realpathSync(requireFromSite.resolve(moduleId)),
      );
    }
  });

  it('rejects enabling or omitting corpus acquisition in the cloud build',()=>{
    expect(()=>validateDeploymentWorkflow(workflowSource.replace('--build-arg COURSE_CORPUS=false','--build-arg COURSE_CORPUS=true'))).toThrow(/COURSE_CORPUS=false/);
    expect(()=>validateDeploymentWorkflow(workflowSource.replace('--build-arg COURSE_CORPUS=false',''))).toThrow(/COURSE_CORPUS=false/);
  });
  it('validates the canonical main-branch artifact deployment', () => {
    expect(validateDeploymentWorkflow(workflowSource)).toEqual(
      expect.objectContaining({
        triggers: ['push:main', 'workflow_dispatch'],
      }),
    );
  });

  it('rejects action-version drift and persisted checkout credentials', () => {
    expect(() =>
      validateDeploymentWorkflow(
        replaceOnce(
          workflowSource,
          'actions/deploy-pages@v5',
          'actions/deploy-pages@v4',
        ),
      ),
    ).toThrow(/deploy-pages@v5/);
    expect(() =>
      validateDeploymentWorkflow(
        replaceOnce(
          workflowSource,
          'persist-credentials: false',
          'persist-credentials: true',
        ),
      ),
    ).toThrow(/disable persisted Git credentials/);
    expect(() =>
      validateDeploymentWorkflow(
        replaceOnce(
          workflowSource,
          '      - name: Configure GitHub Pages',
          [
            '      - name: Unreviewed action',
            '        uses: example/action@v1',
            '',
            '      - name: Configure GitHub Pages',
          ].join('\n'),
        ),
      ),
    ).toThrow(/exactly five reviewed steps/);
  });

  it('rejects untrusted triggers, secrets, and unordered deployment', () => {
    expect(() =>
      validateDeploymentWorkflow(
        replaceOnce(workflowSource, 'workflow_dispatch:', 'pull_request:'),
      ),
    ).toThrow(/pull-request events/);
    expect(() =>
      validateDeploymentWorkflow(
        workflowSource.replace(
          'SITE_BASE: ${{ steps.pages.outputs.base_path }}/',
          'SITE_BASE: ${{ secrets.PAGES_DEPLOY_TOKEN }}',
        ),
      ),
    ).toThrow(/secret token/);
    expect(() =>
      validateDeploymentWorkflow(
        replaceOnce(workflowSource, 'needs: build', 'needs: []'),
      ),
    ).toThrow(/depend on build/);
    expect(() =>
      validateDeploymentWorkflow(
        replaceOnce(
          workflowSource,
          "if: github.ref == 'refs/heads/main'",
          "if: github.ref != 'refs/heads/main'",
        ),
      ),
    ).toThrow(/main-only/);
  });

  it('derives the complete sitemap project URL from the Pages configuration', () => {
    expect(workflowSource).toContain(
      'SITE_URL: ${{ steps.pages.outputs.base_url }}',
    );
    expect(workflowSource).toContain(
      '--build-arg "SITE_URL=${SITE_URL}"',
    );
    expect(workflowSource).toContain('test -f pages-artifact/sitemap.xml');

    expect(() =>
      validateDeploymentWorkflow(
        replaceOnce(
          workflowSource,
          'SITE_URL: ${{ steps.pages.outputs.base_url }}',
          'SITE_URL: https://intale.github.io',
        ),
      ),
    ).toThrow(/SITE_URL must come from configure-pages base_url/);
    expect(() =>
      validateDeploymentWorkflow(
        replaceOnce(
          workflowSource,
          '            --build-arg "SITE_URL=${SITE_URL}" \\',
          '            --build-arg "UNRELATED=value" \\',
        ),
      ),
    ).toThrow(/SITE_URL/);
    expect(() =>
      validateDeploymentWorkflow(
        replaceOnce(
          workflowSource,
          '          test -f pages-artifact/sitemap.xml',
          '          test -f pages-artifact/missing.xml',
        ),
      ),
    ).toThrow(/sitemap\.xml/);
  });
});
