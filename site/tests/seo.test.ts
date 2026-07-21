// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { tmpdir } from 'node:os';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import {
  auditStaticSite,
  deriveSeoExpectations,
} from '../../scripts/check-static-links.mjs';

const temporaryDirectories: string[] = [];

const localeConfiguration = {
  defaultLocale: 'en',
  locales: ['en', 'ru'],
  definitions: [
    {
      code: 'en',
      languageTag: 'en',
      nativeName: 'English',
      direction: 'ltr',
    },
    {
      code: 'ru',
      languageTag: 'ru',
      nativeName: 'Русский',
      direction: 'ltr',
    },
  ],
};

const chapterLocaleConfiguration = {
  schemaVersion: 1,
  planId: 'seo-test-plan',
  planRevision: 1,
  policyId: 'seo-test-policy',
  referenceLocale: 'en',
  chapters: [
    {
      chapterId: '01-first',
      order: 1,
      activeLocales: ['en', 'ru'],
    },
    {
      chapterId: '02-second',
      order: 2,
      activeLocales: ['en'],
    },
  ],
  byChapter: {
    '01-first': {
      chapterId: '01-first',
      order: 1,
      activeLocales: ['en', 'ru'],
    },
    '02-second': {
      chapterId: '02-second',
      order: 2,
      activeLocales: ['en'],
    },
  },
};

const descriptions = {
  root: 'Learn how language models work by implementing each part in Rust.',
  enHome: 'Learn how language models work by implementing each part in Rust.',
  ruHome:
    'Разберитесь, как устроены языковые модели, реализовав каждый компонент на Rust.',
  enCourse: 'Follow a practical Rust course from text to a tiny language model.',
  ruCourse:
    'Пройдите практический курс на Rust: от текста до небольшой языковой модели.',
  enFirst: 'Learn the first bilingual concept with a deterministic Rust example.',
  ruFirst:
    'Изучите первую двуязычную тему на детерминированном примере на Rust.',
  enSecond: 'Learn the English-only second concept with a focused Rust example.',
};

function expectedSeoDescriptions() {
  return new Map([
    ['/', descriptions.root],
    ['/en/', descriptions.enHome],
    ['/ru/', descriptions.ruHome],
    ['/en/course/', descriptions.enCourse],
    ['/ru/course/', descriptions.ruCourse],
    ['/en/course/01-first/', descriptions.enFirst],
    ['/ru/course/01-first/', descriptions.ruFirst],
    ['/en/course/02-second/', descriptions.enSecond],
  ]);
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function temporaryDirectory(prefix: string) {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

function siteReference(path: string, basePath: string) {
  return basePath === '/' ? path : basePath + path.slice(1);
}

function encodeAttribute(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function descriptionMeta(value: string, uppercase = false) {
  const tag = '<meta name="description" content="' + encodeAttribute(value) + '">';
  return uppercase ? tag.toUpperCase().replace(value.toUpperCase(), encodeAttribute(value)) : tag;
}

function alternates(
  suffix: string,
  basePath: string,
  activeLocales: readonly ('en' | 'ru')[] = ['en', 'ru'],
) {
  return (
    activeLocales
      .map(
        (locale) =>
          '<link rel="alternate" hreflang="' +
          locale +
          '" href="' +
          siteReference('/' + locale + suffix, basePath) +
          '">',
      )
      .join('') +
    '<link rel="alternate" hreflang="x-default" href="' + basePath + '">'
  );
}

function localizedPage(
  locale: 'en' | 'ru',
  suffix: string,
  description: string,
  body: string,
  basePath: string,
  activeLocales: readonly ('en' | 'ru')[] = ['en', 'ru'],
  uppercaseMeta = false,
) {
  return (
    '<html lang="' +
    locale +
    '" dir="ltr"><head>' +
    descriptionMeta(description, uppercaseMeta) +
    alternates(suffix, basePath, activeLocales) +
    '</head><body>' +
    body +
    '</body></html>'
  );
}

function writeRoute(
  root: string,
  route: string,
  source: string,
  paths: Map<string, string>,
) {
  const relative = route === '/' ? '' : route.slice(1);
  const directory = join(root, relative);
  mkdirSync(directory, { recursive: true });
  const path = join(directory, 'index.html');
  writeFileSync(path, source);
  paths.set(route, path);
}

function createStaticFixture(basePath = '/') {
  const root = temporaryDirectory('learn-llm-seo-static-');
  const paths = new Map<string, string>();
  const href = (path: string) => siteReference(path, basePath);

  writeRoute(
    root,
    '/',
    '<html lang="mul" dir="ltr"><head>' +
      descriptionMeta(descriptions.root) +
      alternates('/', basePath) +
      '</head><body>' +
      '<a href="' +
      href('/en/') +
      '">English</a><a href="' +
      href('/ru/') +
      '">Русский</a></body></html>',
    paths,
  );

  for (const locale of ['en', 'ru'] as const) {
    const alternate = locale === 'en' ? 'ru' : 'en';
    const homeDescription =
      locale === 'en' ? descriptions.enHome : descriptions.ruHome;
    const courseDescription =
      locale === 'en' ? descriptions.enCourse : descriptions.ruCourse;
    writeRoute(
      root,
      '/' + locale + '/',
      localizedPage(
        locale,
        '/',
        homeDescription,
        '<a href="' +
          href('/' + alternate + '/') +
          '">language</a><a href="' +
          href('/' + locale + '/course/') +
          '">course</a>',
        basePath,
      ),
      paths,
    );
    writeRoute(
      root,
      '/' + locale + '/course/',
      localizedPage(
        locale,
        '/course/',
        courseDescription,
        '<a href="' + href('/' + alternate + '/course/') + '">language</a>',
        basePath,
      ),
      paths,
    );
    writeRoute(
      root,
      '/' + locale + '/course/01-first/',
      localizedPage(
        locale,
        '/course/01-first/',
        locale === 'en' ? descriptions.enFirst : descriptions.ruFirst,
        '<a href="' +
          href('/' + alternate + '/course/01-first/') +
          '">language</a>',
        basePath,
      ),
      paths,
    );
  }

  const fallback =
    '<a data-locale="ru" data-locale-fallback="course-index" lang="ru" ' +
    'hreflang="ru" dir="ltr" aria-label="Русский: course index" href="' +
    href('/ru/course/') +
    '">Русский</a>';
  writeRoute(
    root,
    '/en/course/02-second/',
    localizedPage(
      'en',
      '/course/02-second/',
      descriptions.enSecond,
      fallback,
      basePath,
      ['en'],
      true,
    ),
    paths,
  );

  return {
    root,
    paths,
    basePath,
    seoExpectations: expectedSeoDescriptions(),
  };
}

function auditFixture(fixture: ReturnType<typeof createStaticFixture>) {
  return auditStaticSite(fixture.root, localeConfiguration, {
    basePath: fixture.basePath,
    chapterLocaleConfiguration,
    seoExpectations: fixture.seoExpectations,
  });
}

function descriptionTag(source: string) {
  const match = source.match(/<meta\b[^>]*\bname=["']description["'][^>]*>/i);
  expect(match).not.toBeNull();
  return match![0];
}

function replaceDescriptionTag(path: string, replacement: string) {
  const source = readFileSync(path, 'utf8');
  writeFileSync(path, source.replace(descriptionTag(source), replacement));
}

function setDescription(path: string, value: string) {
  replaceDescriptionTag(path, descriptionMeta(value));
}

function expectSeoFailure(
  mutate: (fixture: ReturnType<typeof createStaticFixture>) => void,
  pattern: RegExp,
) {
  const fixture = createStaticFixture();
  mutate(fixture);
  expect(() => auditFixture(fixture)).toThrow(pattern);
}

function writeLesson(
  root: string,
  locale: string,
  chapterId: string,
  description: string,
  extension: '.md' | '.mdx' = '.mdx',
) {
  const directory = join(root, 'site/src/content/chapters', locale);
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, chapterId + extension),
    [
      '---',
      JSON.stringify({
        chapter_id: chapterId,
        locale,
        description,
      }),
      '---',
      '',
      '# Fixture',
      '',
    ].join('\n'),
  );
}

describe('SEO source contract', () => {
  it('derives root, localized general pages, bilingual lessons, and an EN-only lesson', () => {
    const root = temporaryDirectory('learn-llm-seo-source-');
    const catalogDirectory = join(root, 'site/src/i18n/catalogs');
    mkdirSync(catalogDirectory, { recursive: true });
    writeFileSync(
      join(catalogDirectory, 'en.json'),
      JSON.stringify({
        siteDescription: descriptions.enHome,
        courseDescription: descriptions.enCourse,
      }),
    );
    writeFileSync(
      join(catalogDirectory, 'ru.json'),
      JSON.stringify({
        siteDescription: descriptions.ruHome,
        courseDescription: descriptions.ruCourse,
      }),
    );
    writeLesson(root, 'en', '01-first', descriptions.enFirst);
    writeLesson(root, 'ru', '01-first', descriptions.ruFirst);
    writeLesson(root, 'en', '02-second', descriptions.enSecond, '.md');

    const result = deriveSeoExpectations(
      root,
      localeConfiguration,
      chapterLocaleConfiguration,
    );
    expect(result).toEqual(expectedSeoDescriptions());
    expect(result.has('/ru/course/02-second/')).toBe(false);
  });
});

describe('static SEO audit', () => {
  it('accepts exact route-specific descriptions at root and project bases', () => {
    const rootFixture = createStaticFixture();
    expect(auditFixture(rootFixture)).toEqual(
      expect.objectContaining({ htmlCount: 8, seoRouteCount: 8 }),
    );

    const projectFixture = createStaticFixture('/learn_llm/');
    expect(auditFixture(projectFixture)).toEqual(
      expect.objectContaining({ htmlCount: 8, seoRouteCount: 8 }),
    );
  });

  it('keeps legacy direct audits compatible when SEO expectations are omitted', () => {
    const fixture = createStaticFixture();
    for (const path of fixture.paths.values()) {
      replaceDescriptionTag(path, '');
    }
    expect(
      auditStaticSite(fixture.root, localeConfiguration, {
        chapterLocaleConfiguration,
      }),
    ).toEqual(
      expect.objectContaining({ htmlCount: 8 }),
    );
    expect(
      auditStaticSite(fixture.root, localeConfiguration, {
        chapterLocaleConfiguration,
      }),
    ).not.toHaveProperty('seoRouteCount');
  });

  it('rejects missing, duplicate, outside-head, blank, and entity-only metadata', () => {
    expectSeoFailure(
      ({ paths }) => replaceDescriptionTag(paths.get('/en/')!, ''),
      /expected exactly one meta\[name="description"\]; found 0/,
    );
    expectSeoFailure(
      ({ paths }) => {
        const path = paths.get('/en/')!;
        const source = readFileSync(path, 'utf8');
        const tag = descriptionTag(source);
        writeFileSync(path, source.replace(tag, tag + tag));
      },
      /expected exactly one meta\[name="description"\]; found 2/,
    );
    expectSeoFailure(
      ({ paths }) => {
        const path = paths.get('/en/')!;
        const source = readFileSync(path, 'utf8');
        const tag = descriptionTag(source);
        writeFileSync(
          path,
          source.replace(tag, '').replace('</body>', tag + '</body>'),
        );
      },
      /must be inside the head element/,
    );
    expectSeoFailure(
      ({ paths }) =>
        replaceDescriptionTag(
          paths.get('/en/')!,
          '<meta name="description" content="   ">',
        ),
      /content must not be blank/,
    );
    expectSeoFailure(
      ({ paths }) =>
        replaceDescriptionTag(
          paths.get('/en/')!,
          '<meta name="description" content="&nbsp;&#32;&#x09;&zwj;&zwnj;">',
        ),
      /content must not be blank/,
    );
  });

  it('rejects English and Russian placeholders and stale or swapped descriptions', () => {
    for (const [route, placeholder] of [
      ['/en/', 'TODO: add description'],
      ['/ru/', 'Описание страницы'],
      ['/ru/course/', 'Добавьте описание'],
    ] as const) {
      expectSeoFailure(
        ({ paths }) => setDescription(paths.get(route)!, placeholder),
        /placeholder text/,
      );
    }

    expectSeoFailure(
      ({ paths }) => setDescription(paths.get('/en/')!, 'A stale description.'),
      /does not match its source/,
    );
    expectSeoFailure(
      ({ paths }) => {
        setDescription(paths.get('/en/')!, descriptions.enCourse);
        setDescription(paths.get('/en/course/')!, descriptions.enHome);
      },
      /does not match its source/,
    );
  });

  it('rejects extra generated routes and expected routes missing from output', () => {
    expectSeoFailure(
      (fixture) => {
        const source = readFileSync(fixture.paths.get('/en/')!, 'utf8');
        writeRoute(fixture.root, '/en/extra/', source, fixture.paths);
      },
      /generated HTML route \/en\/extra\/ has no SEO expectation/,
    );
    expectSeoFailure(
      ({ paths }) => rmSync(paths.get('/en/course/02-second/')!),
      /\/en\/course\/02-second\/: expected SEO route has no generated HTML file/,
    );
  });
});
