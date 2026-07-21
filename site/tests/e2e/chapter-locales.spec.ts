// @ts-ignore Node APIs are available in the Playwright test runner.
import { spawn, spawnSync } from 'node:child_process';
// @ts-ignore Node APIs are available in the Playwright test runner.
import * as nodeFs from 'node:fs';
// @ts-ignore Node APIs are available in the Playwright test runner.
import { createServer } from 'node:net';
// @ts-ignore Node APIs are available in the Playwright test runner.
import { tmpdir } from 'node:os';
// @ts-ignore Node APIs are available in the Playwright test runner.
import { basename, join, resolve, sep } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import {
  chapterLocaleDefinitions,
  chapterPath,
  expectLocalizedChapterRoute,
  expectNoOverflowOrClientScripts,
  expectOrderedChapterNavigation,
  readOrderedCourseChapters,
} from './chapter-helpers';

const {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} = nodeFs;

declare const process: {
  cwd(): string;
  env: Record<string, string | undefined>;
  kill(pid: number, signal: 'SIGKILL' | 'SIGTERM'): void;
  platform: string;
};

const previousChapterId = '07-language-model-metrics';
const fixtureChapterId = '08-tensor-storage';
const fixtureTitle = 'Synthetic English-only tensor storage fixture';
const fixtureRevision = 1;
const fixtureSource = `---
{
  "chapter_id": "${fixtureChapterId}",
  "locale": "en",
  "content_revision": ${fixtureRevision},
  "order": 8,
  "concept_id": "tensor-storage",
  "title": "${fixtureTitle}",
  "description": "A test-only lesson that proves selective static route publication without becoming course content.",
  "objective": "Verify that one active lesson locale can publish beside earlier multilingual chapters.",
  "worked_inputs": "Inspect the generated English route and the intentionally absent Russian route.",
  "formula": {
    "latex": "o = i_0 s_0 + i_1 s_1",
    "symbols": [
      { "symbol": "o", "meaning": "a synthetic flat offset" },
      { "symbol": "i_0", "meaning": "a synthetic first-axis index" },
      { "symbol": "s_0", "meaning": "a synthetic first-axis stride" }
    ]
  },
  "history": {
    "approach": "Nested arrays",
    "summary": "This metadata exists only to exercise the production chapter schema.",
    "rust_source": "rust/demos/ch07-language-model-metrics/src/main.rs"
  },
  "rust_sources": [
    {
      "path": "rust/demos/ch07-language-model-metrics/src/main.rs",
      "purpose": "A schema-valid path that is not rendered by this route fixture."
    }
  ],
  "visualization": {
    "decision": "not-useful",
    "id": null,
    "rationale": "Route selection is proven more directly through links and generated files."
  },
  "decoder_connection": "The fixture stops at the static publication boundary."
}
---

## Test-only route body

This short body is created under the operating system temporary directory and is
never copied into the canonical chapter tree.
`;

let fixtureRepository = '';
let fixtureSite = '';
let fixtureOrigin = '';
let previewProcess: ReturnType<typeof spawn> | undefined;
let previewOutput = '';

function npmExecutable(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function fixtureUrl(path: string): string {
  if (!fixtureOrigin) throw new Error('The chapter-locale fixture server is not ready.');
  return new URL(path, fixtureOrigin).href;
}

function rememberPreviewOutput(chunk: unknown): void {
  previewOutput = (previewOutput + String(chunk)).slice(-12_000);
}

function previewHasExited(child: ReturnType<typeof spawn> | undefined): boolean {
  return Boolean(
    child && (child.exitCode !== null || child.signalCode !== null),
  );
}

function createFixtureRepository(): void {
  const sourceSite = resolve(process.cwd());
  const sourceRepository = resolve(sourceSite, '..');
  const sourceDependencies = join(sourceSite, 'node_modules');
  const sourceRust = join(sourceRepository, 'rust');
  if (!existsSync(join(sourceSite, 'src')) || !existsSync(sourceDependencies)) {
    throw new Error(
      'The isolated chapter-locale fixture requires the checked-out site and its existing node_modules.',
    );
  }
  if (!existsSync(sourceRust)) {
    throw new Error('The isolated chapter-locale fixture requires the repository Rust tree.');
  }

  fixtureRepository = mkdtempSync(join(tmpdir(), 'learn-llm-chapter-locales-'));
  fixtureSite = join(fixtureRepository, 'site');
  mkdirSync(fixtureSite, { recursive: true });
  cpSync(join(sourceSite, 'src'), join(fixtureSite, 'src'), { recursive: true });
  const sourcePublic = join(sourceSite, 'public');
  if (existsSync(sourcePublic)) {
    cpSync(sourcePublic, join(fixtureSite, 'public'), { recursive: true });
  }
  for (const file of ['astro.config.mjs', 'package.json', 'tsconfig.json']) {
    copyFileSync(join(sourceSite, file), join(fixtureSite, file));
  }

  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  symlinkSync(sourceDependencies, join(fixtureSite, 'node_modules'), linkType);
  symlinkSync(sourceRust, join(fixtureRepository, 'rust'), linkType);

  const fixtureDirectory = join(
    fixtureSite,
    'src',
    'content',
    'chapters',
    'en',
  );
  mkdirSync(fixtureDirectory, { recursive: true });
  writeFileSync(join(fixtureDirectory, `${fixtureChapterId}.mdx`), fixtureSource, 'utf8');
}

function buildFixtureSite(): void {
  const result = spawnSync(npmExecutable(), ['run', 'build'], {
    cwd: fixtureSite,
    encoding: 'utf8',
    env: {
      ...process.env,
      ASTRO_TELEMETRY_DISABLED: '1',
      FORCE_COLOR: '0',
      SITE_BASE: '/',
    },
    maxBuffer: 16 * 1024 * 1024,
    timeout: 90_000,
    shell: false,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      [
        'The isolated chapter-locale Astro build failed.',
        result.error?.message ?? '',
        result.stdout ?? '',
        result.stderr ?? '',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  const englishRoute = join(
    fixtureSite,
    'dist',
    'en',
    'course',
    fixtureChapterId,
    'index.html',
  );
  const russianRoute = join(
    fixtureSite,
    'dist',
    'ru',
    'course',
    fixtureChapterId,
    'index.html',
  );
  if (!existsSync(englishRoute) || existsSync(russianRoute)) {
    throw new Error(
      'The fixture build must emit only the English synthetic Chapter 8 route.',
    );
  }
}

async function reserveAvailablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Could not reserve a TCP port for the fixture preview.');
  }
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error: Error | null) =>
      error ? rejectClose(error) : resolveClose(),
    );
  });
  return address.port;
}

async function waitForFixturePreview(): Promise<void> {
  const deadline = Date.now() + 20_000;
  const readyUrl = fixtureUrl(chapterPath('en', fixtureChapterId));
  while (Date.now() < deadline) {
    if (previewHasExited(previewProcess)) {
      throw new Error(
        `The isolated preview exited before it became ready.\n${previewOutput}`,
      );
    }
    try {
      const response = await fetch(readyUrl);
      const ready = response.status === 200;
      await response.body?.cancel();
      if (ready) return;
    } catch {
      // The preview process may still be binding its local socket.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`The isolated preview did not become ready.\n${previewOutput}`);
}

async function startFixturePreview(): Promise<void> {
  const port = await reserveAvailablePort();
  fixtureOrigin = `http://127.0.0.1:${port}`;
  previewProcess = spawn(
    npmExecutable(),
    [
      'run',
      'preview',
      '--',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
    ],
    {
      cwd: fixtureSite,
      detached: process.platform !== 'win32',
      env: {
        ...process.env,
        ASTRO_TELEMETRY_DISABLED: '1',
        FORCE_COLOR: '0',
        SITE_BASE: '/',
      },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  previewProcess.stdout?.on('data', rememberPreviewOutput);
  previewProcess.stderr?.on('data', rememberPreviewOutput);
  await waitForFixturePreview();
}

async function waitForPreviewExit(timeout: number): Promise<boolean> {
  const child = previewProcess;
  if (!child || previewHasExited(child)) return true;
  return await new Promise<boolean>((resolveExit) => {
    const timer = setTimeout(() => {
      child.off('exit', onExit);
      resolveExit(false);
    }, timeout);
    const onExit = () => {
      clearTimeout(timer);
      resolveExit(true);
    };
    child.once('exit', onExit);
  });
}

function signalPreview(signal: 'SIGKILL' | 'SIGTERM'): void {
  const child = previewProcess;
  if (!child || previewHasExited(child)) return;
  try {
    if (process.platform !== 'win32' && child.pid !== undefined) {
      process.kill(-child.pid, signal);
    } else {
      child.kill(signal);
    }
  } catch {
    // A concurrent normal exit needs no further cleanup.
  }
}

async function stopFixturePreview(): Promise<void> {
  signalPreview('SIGTERM');
  if (!(await waitForPreviewExit(5_000))) {
    signalPreview('SIGKILL');
    await waitForPreviewExit(5_000);
  }
  previewProcess = undefined;
}

function removeFixtureRepository(): void {
  if (!fixtureRepository) return;
  const temporaryRoot = resolve(tmpdir());
  const resolvedFixture = resolve(fixtureRepository);
  if (
    !resolvedFixture.startsWith(temporaryRoot + sep) ||
    !basename(resolvedFixture).startsWith('learn-llm-chapter-locales-')
  ) {
    throw new Error(`Refusing to remove unexpected fixture path ${resolvedFixture}.`);
  }
  rmSync(resolvedFixture, { force: true, recursive: true });
  fixtureRepository = '';
  fixtureSite = '';
}

async function expectAccessibleLessonShell(page: Page): Promise<void> {
  await expect(page.locator('main#main-content')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  const namedNavigations = page.locator('nav[aria-label]');
  expect(await namedNavigations.count()).toBeGreaterThanOrEqual(2);
  const navigationLabels = await namedNavigations.evaluateAll((navigations) =>
    navigations.map((navigation) => navigation.getAttribute('aria-label')?.trim()),
  );
  expect(navigationLabels.every(Boolean)).toBe(true);

  const ids = await page.locator('[id]').evaluateAll((nodes) =>
    nodes.map((node) => node.id),
  );
  expect(new Set(ids).size).toBe(ids.length);

  const skipLink = page.locator('a.skip-link');
  await expect(skipLink).toHaveAttribute('href', '#main-content');
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
}

test.describe(
  'selective chapter locale routes',
  { tag: '@chapter-locales' },
  () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async () => {
      test.setTimeout(120_000);
      createFixtureRepository();
      buildFixtureSite();
      await startFixturePreview();
    });

    test.afterAll(async () => {
      test.setTimeout(20_000);
      try {
        await stopFixturePreview();
      } finally {
        removeFixtureRepository();
      }
    });

    test('indexes, alternates, and navigation follow route availability at desktop width', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });

      const englishChapters = await readOrderedCourseChapters(page, 'en', {
        origin: fixtureOrigin,
      });
      expect(englishChapters.slice(-2).map(({ chapterId }) => chapterId)).toEqual([
        previousChapterId,
        fixtureChapterId,
      ]);
      for (const definition of chapterLocaleDefinitions) {
        await expect(
          page.locator(
            `link[rel="alternate"][hreflang="${definition.languageTag}"]`,
          ),
        ).toHaveAttribute('href', `/${definition.code}/course/`);
      }
      await expectNoOverflowOrClientScripts(page);

      const russianChapters = await readOrderedCourseChapters(page, 'ru', {
        origin: fixtureOrigin,
      });
      expect(russianChapters.at(-1)?.chapterId).toBe(previousChapterId);
      expect(
        russianChapters.some(({ chapterId }) => chapterId === fixtureChapterId),
      ).toBe(false);
      await expect(
        page.locator(`a[href="${chapterPath('ru', fixtureChapterId)}"]`),
      ).toHaveCount(0);
      await expectNoOverflowOrClientScripts(page);

      const englishPrevious = englishChapters.find(
        ({ chapterId }) => chapterId === previousChapterId,
      );
      expect(englishPrevious).toBeDefined();
      await page.goto(fixtureUrl(chapterPath('en', previousChapterId)));
      await expectLocalizedChapterRoute(page, {
        chapterId: previousChapterId,
        locale: 'en',
        order: 7,
        revision: 1,
        revisionLabel: 'Content revision',
        title: englishPrevious?.title ?? '',
      });
      await expectOrderedChapterNavigation(
        page,
        'en',
        previousChapterId,
        englishChapters,
      );
      await expect(
        page.locator('a[data-chapter-direction="next"]'),
      ).toHaveAttribute('data-chapter-id', fixtureChapterId);

      await page.goto(fixtureUrl(chapterPath('ru', previousChapterId)));
      await expectOrderedChapterNavigation(
        page,
        'ru',
        previousChapterId,
        russianChapters,
      );
      await expect(
        page.locator('a[data-chapter-direction="next"]'),
      ).toHaveCount(0);

      await page.goto(fixtureUrl(chapterPath('en', fixtureChapterId)));
      await expectLocalizedChapterRoute(page, {
        chapterId: fixtureChapterId,
        locale: 'en',
        order: 8,
        revision: fixtureRevision,
        revisionLabel: 'Content revision',
        title: fixtureTitle,
        equivalentLocales: ['en'],
        fallbackRouteSuffix: '/course/',
      });
      await expectOrderedChapterNavigation(
        page,
        'en',
        fixtureChapterId,
        englishChapters,
      );
      await expect(
        page.locator('a[data-chapter-direction="previous"]'),
      ).toHaveAttribute('data-chapter-id', previousChapterId);
      await expect(
        page.locator('a[data-chapter-direction="next"]'),
      ).toHaveCount(0);

      const russianFallback = page.locator(
        '.locale-switch a[data-locale="ru"]',
      );
      await expect(russianFallback).toHaveAttribute('href', '/ru/course/');
      await expect(russianFallback).toHaveAttribute(
        'data-locale-fallback',
        'course-index',
      );
      await expect(russianFallback).toHaveAttribute(
        'aria-label',
        'Русский: Все главы',
      );
      await russianFallback.focus();
      await expect(russianFallback).toBeFocused();
      await expectAccessibleLessonShell(page);
      await expectNoOverflowOrClientScripts(page);
    });

    test('the narrow lesson works without JavaScript and the deferred route stays a 404', async ({
      browser,
    }) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      try {
        const englishChapters = await readOrderedCourseChapters(page, 'en', {
          origin: fixtureOrigin,
        });
        await page.goto(fixtureUrl(chapterPath('en', fixtureChapterId)));
        await expectLocalizedChapterRoute(page, {
          chapterId: fixtureChapterId,
          locale: 'en',
          order: 8,
          revision: fixtureRevision,
          revisionLabel: 'Content revision',
          title: fixtureTitle,
          equivalentLocales: ['en'],
          fallbackRouteSuffix: '/course/',
        });
        await expectOrderedChapterNavigation(
          page,
          'en',
          fixtureChapterId,
          englishChapters,
        );
        await expectAccessibleLessonShell(page);
        await expect(page.locator('.locale-switch')).toHaveCSS('flex-wrap', 'wrap');
        const navigationColumns = await page
          .locator('nav[data-chapter-navigation]')
          .evaluate((navigation) =>
            window
              .getComputedStyle(navigation)
              .gridTemplateColumns.trim()
              .split(/\s+/)
              .filter(Boolean),
          );
        expect(navigationColumns).toHaveLength(1);
        await expectNoOverflowOrClientScripts(page);

        const russianFallback = page.locator(
          '.locale-switch a[data-locale="ru"]',
        );
        await russianFallback.click();
        await expect(page).toHaveURL(new RegExp('/ru/course/$'));
        await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
        await expect(
          page.locator(`a[href="${chapterPath('ru', fixtureChapterId)}"]`),
        ).toHaveCount(0);
        await expectNoOverflowOrClientScripts(page);

        expect(
          existsSync(
            join(
              fixtureSite,
              'dist',
              'ru',
              'course',
              fixtureChapterId,
              'index.html',
            ),
          ),
        ).toBe(false);
        const missingUrl = fixtureUrl(chapterPath('ru', fixtureChapterId));
        const missingResponse = await page.goto(missingUrl);
        expect(missingResponse?.status()).toBe(404);
        expect(page.url()).toBe(missingUrl);
      } finally {
        await context.close();
      }
    });
  },
);
