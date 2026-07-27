// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { tmpdir } from 'node:os';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import {
  auditStaticSite,
  GOOGLE_ANALYTICS_COOKIE_DOMAIN,
  GOOGLE_ANALYTICS_MEASUREMENT_ID,
  GOOGLE_ANALYTICS_SCRIPT_URL,
} from '../../scripts/check-static-links.mjs';

declare const process: { cwd(): string };

const temporaryDirectories: string[] = [];
const localeConfiguration = {
  defaultLocale: 'en',
  locales: [],
  definitions: [],
};

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function analyticsTag(measurementId = GOOGLE_ANALYTICS_MEASUREMENT_ID) {
  return [
    '<!-- Google tag (gtag.js) -->',
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>`,
    '<script>',
    'window.dataLayer = window.dataLayer || [];',
    'function gtag(){dataLayer.push(arguments);}',
    "gtag('js', new Date());",
    `gtag('set', 'cookie_domain', '${GOOGLE_ANALYTICS_COOKIE_DOMAIN}');`,
    `gtag('config', '${measurementId}');`,
    '</script>',
  ].join('\n');
}

function html(tag = analyticsTag(), basePath = '/') {
  return (
    '<html lang="mul" dir="ltr"><head>' +
    `<link rel="alternate" hreflang="x-default" href="${basePath}">` +
    tag +
    '</head><body></body></html>'
  );
}

function fixture(basePath = '/', tag = analyticsTag()) {
  const root = mkdtempSync(join(tmpdir(), 'learn-llm-analytics-'));
  temporaryDirectories.push(root);
  mkdirSync(join(root, 'nested'), { recursive: true });
  const paths = [join(root, 'index.html'), join(root, 'nested/index.html')];
  for (const path of paths) writeFileSync(path, html(tag, basePath));
  return { root, paths, basePath };
}

function audit(candidate: ReturnType<typeof fixture>) {
  return auditStaticSite(candidate.root, localeConfiguration, {
    basePath: candidate.basePath,
    googleAnalyticsMeasurementId: GOOGLE_ANALYTICS_MEASUREMENT_ID,
  });
}

function expectFailure(
  mutate: (source: string) => string,
  pattern: RegExp,
) {
  const candidate = fixture();
  writeFileSync(candidate.paths[0], mutate(readFileSync(candidate.paths[0], 'utf8')));
  expect(() => audit(candidate)).toThrow(pattern);
}

describe('Google Analytics head component', () => {
  it('owns the exact supplied tag and is rendered inside both HTML head templates', () => {
    const siteRoot = resolve(process.cwd());
    const component = readFileSync(
      join(siteRoot, 'src/components/GoogleAnalytics.astro'),
      'utf8',
    );
    expect(component).toContain('<!-- Google tag (gtag.js) -->');
    expect(component).toContain(
      `<script\n  is:inline\n  async\n  src="${GOOGLE_ANALYTICS_SCRIPT_URL}"\n></script>`,
    );
    expect(component).toContain('window.dataLayer = window.dataLayer || [];');
    expect(component).toContain('function gtag(){dataLayer.push(arguments);}');
    expect(component).toContain("gtag('js', new Date());");
    expect(component).toContain(
      `gtag('set', 'cookie_domain', '${GOOGLE_ANALYTICS_COOKIE_DOMAIN}');`,
    );
    expect(component).toContain(
      `gtag('config', '${GOOGLE_ANALYTICS_MEASUREMENT_ID}');`,
    );

    for (const relative of ['src/layouts/BaseLayout.astro', 'src/pages/index.astro']) {
      const source = readFileSync(join(siteRoot, relative), 'utf8');
      expect(source).toContain("import GoogleAnalytics from '../components/GoogleAnalytics.astro';");
      const head = source.match(/<head>[\s\S]*?<\/head>/)?.[0] ?? '';
      expect(head).toContain('<GoogleAnalytics />');
      expect(source.match(/<GoogleAnalytics \/>/g)).toHaveLength(1);
    }
  });
});

describe('built Google Analytics audit', () => {
  it('accepts exactly one complete head tag on every root and project-base HTML page', () => {
    expect(audit(fixture())).toEqual(
      expect.objectContaining({ htmlCount: 2, analyticsRouteCount: 2 }),
    );
    expect(audit(fixture('/learn_llm/'))).toEqual(
      expect.objectContaining({ htmlCount: 2, analyticsRouteCount: 2 }),
    );
  });

  it('keeps analytics enforcement opt-in for unrelated synthetic link fixtures', () => {
    const candidate = fixture('/', '');
    expect(auditStaticSite(candidate.root, localeConfiguration)).toEqual(
      expect.objectContaining({ htmlCount: 2 }),
    );
  });

  it('rejects missing, duplicate, misplaced, non-async, and wrong-ID loaders', () => {
    const loader = `<script async src="${GOOGLE_ANALYTICS_SCRIPT_URL}"></script>`;
    expectFailure((source) => source.replace(loader, ''), /exactly one Google Analytics loader; found 0/);
    expectFailure((source) => source.replace(loader, loader + loader), /exactly one Google Analytics loader; found 2/);
    expectFailure(
      (source) => source.replace(loader, '').replace('</body>', loader + '</body>'),
      /loader must be inside the head element/,
    );
    expectFailure((source) => source.replace('<script async src=', '<script src='), /loader must be async/);
    expectFailure((source) => source.replaceAll(GOOGLE_ANALYTICS_MEASUREMENT_ID, 'G-WRONG123'), /loader must use exactly/);
  });

  it('rejects missing, duplicate, misplaced, incomplete, augmented, wrong-ID, and reordered initializers', () => {
    const initializer = analyticsTag().match(/<script>[^]*?<\/script>$/)?.[0] ?? '';
    expect(initializer).not.toBe('');
    expectFailure((source) => source.replace(initializer, ''), /exactly one Google Analytics initializer; found 0/);
    expectFailure((source) => source.replace(initializer, initializer + initializer), /exactly one Google Analytics initializer; found 2/);
    expectFailure(
      (source) => source.replace(initializer, '').replace('</body>', initializer + '</body>'),
      /initializer must be inside the head element/,
    );
    expectFailure((source) => source.replace("gtag('js', new Date());", ''), /must exactly reproduce the supplied/);
    expectFailure(
      (source) => source.replace(
        'window.dataLayer = window.dataLayer || [];',
        "window.dataLayer = window.dataLayer || []; console.log('extra');",
      ),
      /must exactly reproduce the supplied/,
    );
    expectFailure((source) => source.replace("gtag('config', 'G-B5JVTL721S');", "gtag('config', 'G-WRONG123');"), /must exactly reproduce the supplied/);
    expectFailure(
      (source) => source.replace(
        "gtag('config', 'G-B5JVTL721S');",
        "gtag('config', 'G- B5JVTL721S');",
      ),
      /must exactly reproduce the supplied/,
    );
    expectFailure(
      (source) => {
        const loader = `<script async src="${GOOGLE_ANALYTICS_SCRIPT_URL}"></script>`;
        return source.replace(`${loader}\n${initializer}`, `${initializer}\n${loader}`);
      },
      /loader must appear before its initializer/,
    );
  });

  it('rejects missing, wrong, duplicate, separate, and late cookie-domain settings', () => {
    const cookieDomain =
      `gtag('set', 'cookie_domain', '${GOOGLE_ANALYTICS_COOKIE_DOMAIN}');`;
    const config = `gtag('config', '${GOOGLE_ANALYTICS_MEASUREMENT_ID}');`;
    expectFailure(
      (source) => source.replace(cookieDomain, ''),
      /exactly reproduce the supplied|exactly one cookie_domain set call/,
    );
    expectFailure(
      (source) => source.replace(GOOGLE_ANALYTICS_COOKIE_DOMAIN, 'example.com'),
      /must exactly reproduce the supplied/,
    );
    expectFailure(
      (source) =>
        source.replace(cookieDomain, `${cookieDomain}\n${cookieDomain}`),
      /exactly reproduce the supplied|exactly one cookie_domain set call/,
    );
    expectFailure(
      (source) =>
        source.replace('</head>', `<script>${cookieDomain}</script></head>`),
      /exactly one Google Analytics initializer; found 2/,
    );
    expectFailure(
      (source) => source.replace(
        `${cookieDomain}\n${config}`,
        `${config}\n${cookieDomain}`,
      ),
      /must exactly reproduce the supplied/,
    );
  });

  it('rejects an invalid configured measurement ID before accepting output', () => {
    const candidate = fixture();
    expect(() =>
      auditStaticSite(candidate.root, localeConfiguration, {
        googleAnalyticsMeasurementId: 'invalid',
      }),
    ).toThrow(/measurement ID must match G-\[A-Z0-9\]\+/);
  });
});
