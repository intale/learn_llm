// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync, readdirSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { extname, join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

declare const process: { cwd(): string };

type UnknownRecord = Record<string, unknown>;

interface PolicyRule {
  readonly label: string;
  readonly pattern: RegExp;
}

interface PolicyViolation {
  readonly label: string;
  readonly location: string;
  readonly sourceLine: string;
}

interface RecursiveDirectoryEntry {
  readonly name: string;
  readonly parentPath?: string;
  readonly path?: string;
  isFile(): boolean;
}

interface BuiltCheatSheet {
  readonly chapter_id: string;
  readonly locale: string;
  readonly terms: ReadonlyArray<{
    readonly definition: string;
    readonly term: string;
  }>;
}

const repositoryRoot = resolve(process.cwd(), '..');
const policyTestPath = 'site/tests/firefox-only-browser-policy.test.ts';

const policyRules: readonly PolicyRule[] = [
  { label: 'Chromium browser policy', pattern: /\bchromium\b/i },
  {
    label: 'WebKit browser policy',
    pattern: /(?:^|[^-\w])webkit(?:$|[^-\w])/i,
  },
  {
    label: 'disabled JavaScript environment',
    pattern:
      /\b(?:no[- ]?js|no[- ]javascript|javascript[- ]disabled|without\s+javascript)\b/i,
  },
  {
    label: 'disabled script environment',
    pattern:
      /\b(?:no-script|disabled[- ]script|script[- ]disabled|scripting\s+(?:off|disabled)|(?:off|disabled)[- ]scripting)\b/i,
  },
  {
    label: 'disabled Playwright scripting',
    pattern: /javascriptEnabled\s*:\s*false/i,
  },
  {
    label: 'multi-engine policy',
    pattern: /\b(?:both\s+(?:browser\s+)?engines?|two[- ]engine|dual[- ]engine|engine[- ]parity)\b/i,
  },
  {
    label: 'non-Firefox browser selector',
    pattern: /--(?:browser|project)=(?!firefox(?:\b|$))[\w-]+/i,
  },
  {
    label: 'non-Firefox browser selector',
    pattern: /--(?:browser|project)\s+(?!firefox(?:\b|$))[\w-]+/i,
  },
];

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function regularFilesBelow(
  directory: string,
  extensions: ReadonlySet<string>,
): string[] {
  return readdirSync(resolve(repositoryRoot, directory), {
    recursive: true,
    withFileTypes: true,
  })
    .filter(
      (entry: RecursiveDirectoryEntry) =>
        entry.isFile() && extensions.has(extname(entry.name)),
    )
    .map((entry: RecursiveDirectoryEntry) => {
      const parent = entry.parentPath ?? entry.path;
      if (!parent) throw new Error(`Missing parent path for ${entry.name}.`);
      return relative(repositoryRoot, join(parent, entry.name));
    })
    .sort();
}

function policyViolations(location: string, source: string): PolicyViolation[] {
  return source.split(/\r?\n/).flatMap((sourceLine, lineIndex) =>
    policyRules
      .filter(({ pattern }) => pattern.test(sourceLine))
      .map(({ label }) => ({
        label,
        location: `${location}:${lineIndex + 1}`,
        sourceLine: sourceLine.trim(),
      })),
  );
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  const record = asRecord(value);
  return record ? Object.values(record).flatMap(collectStrings) : [];
}

function decodeHtmlText(source: string): string {
  return source
    .replace(/<[^>]*>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, digits: string) =>
      String.fromCodePoint(Number.parseInt(digits, 16)),
    )
    .replace(/&#([0-9]+);/g, (_, digits: string) =>
      String.fromCodePoint(Number.parseInt(digits, 10)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function liveStatePolicy(state: unknown): Array<[string, string]> {
  const root = asRecord(state);
  const builds = Array.isArray(root?.builds) ? root.builds : [];
  const liveBuildStatuses = new Set(['active', 'pending']);
  const liveStepStatuses = new Set(['running', 'pending', 'blocked']);
  const projected: Array<[string, string]> = [];

  for (const [buildIndex, buildValue] of builds.entries()) {
    const build = asRecord(buildValue);
    if (!build || !liveBuildStatuses.has(String(build.status))) continue;
    const buildId = String(build.build_id ?? buildIndex);
    for (const field of ['objective', 'completion_criteria', 'budget'] as const) {
      for (const source of collectStrings(build[field])) {
        projected.push([`BUILD_STATE.yaml build ${buildId} ${field}`, source]);
      }
    }

    const steps = Array.isArray(build.steps) ? build.steps : [];
    for (const [stepIndex, stepValue] of steps.entries()) {
      const step = asRecord(stepValue);
      if (!step || !liveStepStatuses.has(String(step.status))) continue;
      const stepId = String(step.id ?? stepIndex);
      for (const field of ['objective', 'acceptance', 'validate', 'cost'] as const) {
        for (const source of collectStrings(step[field])) {
          projected.push([`BUILD_STATE.yaml step ${stepId} ${field}`, source]);
        }
      }
    }
  }

  return projected;
}

function canonicalPolicyPaths(): string[] {
  const explicit = [
    'AGENTS.md',
    'SKILLS.md',
    '.agents/skills/localize-llm-course/SKILL.md',
    'README.md',
    'curriculum/README.md',
    'curriculum/course-plan.md',
    'site/package.json',
    'site/playwright.config.ts',
  ];
  const chapterContracts = regularFilesBelow(
    'curriculum/chapters',
    new Set(['.md']),
  );
  const siteSources = regularFilesBelow('site/src', new Set(['.astro', '.ts']));
  const endToEndSpecs = regularFilesBelow('site/tests/e2e', new Set(['.ts']));
  const staticTests = regularFilesBelow('site/tests', new Set(['.ts'])).filter(
    (path) =>
      path.endsWith('.test.ts') &&
      path !== policyTestPath,
  );
  return [...new Set([...explicit, ...chapterContracts, ...siteSources, ...endToEndSpecs, ...staticTests])].sort();
}

describe('Firefox-only JavaScript-enabled browser policy', () => {
  it('keeps every live canonical surface free of alternate browser and scripting policies', () => {
    const violations = canonicalPolicyPaths().flatMap((path) =>
      policyViolations(path, readFileSync(resolve(repositoryRoot, path), 'utf8')),
    );
    const state = parse(
      readFileSync(resolve(repositoryRoot, 'BUILD_STATE.yaml'), 'utf8'),
    );
    for (const [location, source] of liveStatePolicy(state)) {
      violations.push(...policyViolations(location, source));
    }

    expect(
      violations,
      violations
        .map(({ label, location, sourceLine }) => `${location}: ${label}: ${sourceLine}`)
        .join('\n'),
    ).toEqual([]);
  });

  it('requires every engine-aware E2E spec to reject a non-Firefox fixture', () => {
    const engineAwareSpecs = regularFilesBelow('site/tests/e2e', new Set(['.ts'])).filter(
      (path) => readFileSync(resolve(repositoryRoot, path), 'utf8').includes('browserName'),
    );
    expect(engineAwareSpecs).toEqual([
      'site/tests/e2e/ch05-autoregressive-examples.spec.ts',
      'site/tests/e2e/ch07-language-model-metrics.spec.ts',
      'site/tests/e2e/ch10-broadcasting-reductions.spec.ts',
      'site/tests/e2e/ch15-tensor-autodiff-core.spec.ts',
      'site/tests/e2e/ch16-model-autodiff-ops.spec.ts',
    ]);
    for (const path of engineAwareSpecs) {
      const source = readFileSync(resolve(repositoryRoot, path), 'utf8');
      expect(source, `${path} lacks the Firefox fail-fast guard`).toMatch(
        /if\s*\(\s*browserName\s*!==\s*['"]firefox['"]\s*\)/,
      );
    }
  });

  it('keeps one server-rendered cheat-sheet tree and no duplicate fallback surface', () => {
    const source = readFileSync(
      resolve(repositoryRoot, 'site/src/components/CheatSheet.astro'),
      'utf8',
    );
    expect(source.match(/<dl class="cheat-sheet-terms">/g)).toHaveLength(1);
    expect(source).not.toMatch(
      /<noscript\b|<details\b|data-cheat-sheet-fallback|fallbackSummary|fallback\.hidden|\.cheat-sheet-fallback/i,
    );
  });

  it('keeps every localized cheat-sheet term in the built static HTML exactly once', () => {
    const sheetPaths = regularFilesBelow(
      'site/src/content/cheat-sheets',
      new Set(['.json']),
    );
    expect(sheetPaths.length).toBeGreaterThan(0);

    for (const sheetPath of sheetPaths) {
      const sheet = JSON.parse(
        readFileSync(resolve(repositoryRoot, sheetPath), 'utf8'),
      ) as BuiltCheatSheet;
      const routePath = resolve(
        repositoryRoot,
        'site/dist',
        sheet.locale,
        'course',
        sheet.chapter_id,
        'index.html',
      );
      const builtHtml = readFileSync(routePath, 'utf8');
      const surface = builtHtml.match(
        /<aside\b[^>]*data-cheat-sheet[\s\S]*?<\/aside>/,
      )?.[0];
      expect(surface, `${sheetPath} has no built cheat-sheet surface`).toBeDefined();
      if (!surface) continue;

      expect(surface.match(/<dialog\b/g)).toHaveLength(1);
      expect(surface).not.toMatch(/<details\b|data-cheat-sheet-fallback/i);
      const terms = [...surface.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>/g)].map(
        (match) => decodeHtmlText(match[1]),
      );
      const definitions = [
        ...surface.matchAll(/<dd\b[^>]*>([\s\S]*?)<\/dd>/g),
      ].map((match) => decodeHtmlText(match[1]));
      expect(terms, `${sheetPath} term count`).toHaveLength(sheet.terms.length);
      expect(definitions, `${sheetPath} definition count`).toHaveLength(
        sheet.terms.length,
      );
      const actualPairs = terms
        .map((term, index) => JSON.stringify([term, definitions[index]]))
        .sort();
      const expectedPairs = sheet.terms
        .map(({ definition, term }) => JSON.stringify([term, definition]))
        .sort();
      expect(actualPairs, `${sheetPath} built term coverage`).toEqual(expectedPairs);
    }
  });

  it('fails loudly for every forbidden family without flagging vendor CSS or history', () => {
    for (const source of [
      'Chromium parity',
      'WebKit browser',
      'no-JavaScript fallback',
      'no-JS fallback',
      'JavaScript disabled',
      'without JavaScript',
      'disabled-script path',
      'no-script browser path',
      'scripting off path',
      'javaScriptEnabled: false',
      'both browser engines',
      'two-engine matrix',
      '--project=chromium',
    ]) {
      expect(policyViolations('fixture', source), source).not.toEqual([]);
    }
    expect(policyViolations('fixture', '-webkit-mask: none')).toEqual([]);
    expect(policyViolations('fixture', '--project=firefox')).toEqual([]);
    expect(policyViolations('fixture', 'line one\nChromium parity')[0]?.location).toBe(
      'fixture:2',
    );

    const terminalHistory = {
      builds: [
        {
          build_id: 'history',
          completion_criteria: ['Chromium history'],
          objective: 'Chromium history',
          status: 'completed',
          steps: [
            {
              acceptance: ['no-JavaScript history'],
              id: 'past',
              runs: [{ notes: 'WebKit history' }],
              status: 'completed',
            },
          ],
        },
      ],
    };
    expect(liveStatePolicy(terminalHistory)).toEqual([]);

    const liveMutation = {
      builds: [
        {
          build_id: 'future',
          completion_criteria: ['clean'],
          objective: 'clean',
          status: 'pending',
          steps: [
            {
              acceptance: ['Chromium parity'],
              id: 'next',
              runs: [{ notes: 'ignored WebKit history' }],
              status: 'pending',
            },
          ],
        },
      ],
    };
    const projected = liveStatePolicy(liveMutation);
    expect(projected.some(([, source]) => source === 'Chromium parity')).toBe(true);
    expect(projected.some(([, source]) => source.includes('ignored'))).toBe(false);
  });
});
