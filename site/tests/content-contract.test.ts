// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { tmpdir } from 'node:os';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import { validateChapterContractText } from '../../scripts/check-chapter-contract.mjs';
// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import {
  findPublishablePairs,
  validateCatalogParity,
  validateChapterDocument,
  validateChapterPair,
} from '../../scripts/check-site-content.mjs';
// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import { auditStaticSite } from '../../scripts/check-static-links.mjs';

declare const process: { cwd(): string };

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function chapterMetadata(locale: 'en' | 'ru' = 'en') {
  const english = locale === 'en';
  return {
    chapter_id: '01-text-units',
    locale,
    content_revision: 1,
    order: 1,
    concept_id: 'text-units',
    title: english ? 'Text units' : 'Единицы текста',
    description: english ? 'Map text to stable IDs.' : 'Преобразуйте текст в устойчивые ID.',
    objective: english ? 'Implement an observable mapping.' : 'Реализуйте наблюдаемое отображение.',
    formula: {
      latex: 'i = V(t)',
      symbols: [
        {
          symbol: 't',
          meaning: english ? 'text unit' : 'единица текста',
        },
        {
          symbol: 'i',
          meaning: english ? 'vocabulary ID' : 'ID словаря',
        },
      ],
    },
    history: {
      approach: english ? 'Whitespace splitting' : 'Разбиение по пробелам',
      summary: english ? 'Words came first.' : 'Сначала использовали слова.',
      rust_source: 'rust/demos/ch01-text-units/src/main.rs',
    },
    rust_sources: [
      {
        path: 'rust/demos/ch01-text-units/src/main.rs',
        purpose: english ? 'Runnable contrast' : 'Исполняемое сравнение',
      },
    ],
    visualization: {
      decision: 'useful' as const,
      id: 'text-units',
      rationale: english ? 'Shows each mapping.' : 'Показывает каждое отображение.',
    },
  };
}

function chapterBody() {
  return [
    '{/* chapter-section:worked-example */}',
    '## Worked example',
    '{/* chapter-section:formula */}',
    '## Formula',
    '{/* chapter-section:symbol-glossary */}',
    '## Symbols',
    '{/* chapter-section:history */}',
    '## History',
    '{/* chapter-section:rust-implementation */}',
    '## Rust',
    '<RustSource path="rust/demos/ch01-text-units/src/main.rs" />',
    '{/* chapter-section:visualization */}',
    '## Visualization',
    '{/* chapter-section:exercises */}',
    '## Exercises',
    '{/* chapter-section:decoder-connection */}',
    '## Decoder connection',
    '',
  ].join('\n');
}

function chapterSource(
  data = chapterMetadata(),
  body = chapterBody(),
) {
  return ['---', JSON.stringify(data, null, 2), '---', '', body].join('\n');
}

function parsedChapter(locale: 'en' | 'ru') {
  return validateChapterDocument(chapterSource(chapterMetadata(locale)), {
    sourceName: locale + ' fixture',
    checkSourceFiles: false,
  });
}

describe('localized chapter documents', () => {
  it('accepts the complete ordered contract and declared Rust source reference', () => {
    const result = parsedChapter('en');

    expect(result.data.chapter_id).toBe('01-text-units');
    expect(result.references).toEqual([
      expect.objectContaining({
        path: 'rust/demos/ch01-text-units/src/main.rs',
        region: undefined,
      }),
    ]);
  });

  it('rejects missing sections and Rust paths outside the allowlist', () => {
    const missingSection = chapterBody().replace(
      '{/* chapter-section:exercises */}',
      '',
    );
    expect(() =>
      validateChapterDocument(chapterSource(chapterMetadata(), missingSection), {
        checkSourceFiles: false,
      }),
    ).toThrow(/section markers/);

    const unsafe = chapterMetadata();
    unsafe.history.rust_source = '../secret.rs';
    unsafe.rust_sources[0].path = '../secret.rs';
    expect(() =>
      validateChapterDocument(chapterSource(unsafe), {
        checkSourceFiles: false,
      }),
    ).toThrow(/repository Rust path|repository-relative/);
  });

  it('publishes only one complete, same-revision bilingual pair', () => {
    const english = parsedChapter('en');
    const russian = parsedChapter('ru');

    expect(findPublishablePairs([english])).toEqual([]);
    expect(findPublishablePairs([english, russian])).toHaveLength(1);

    const staleData = chapterMetadata('ru');
    staleData.content_revision = 2;
    const staleRussian = validateChapterDocument(chapterSource(staleData), {
      checkSourceFiles: false,
    });
    expect(findPublishablePairs([english, staleRussian])).toEqual([]);
  });

  it('detects drift in locale-neutral formula metadata', () => {
    const english = parsedChapter('en');
    const russianData = chapterMetadata('ru');
    russianData.formula.latex = 'different';
    const russian = validateChapterDocument(chapterSource(russianData), {
      checkSourceFiles: false,
    });

    expect(() => validateChapterPair(english, russian)).toThrow(/locale-neutral/);
  });
});

describe('curriculum and catalog contracts', () => {
  it('keeps the checked-in chapter template structurally valid', () => {
    const template = readFileSync(
      resolve(process.cwd(), '../curriculum/chapter-template.md'),
      'utf8',
    );
    const result = validateChapterContractText(template, {
      sourceName: 'chapter-template.md',
    });

    expect(result.data.visualization.decision).toBe('useful');
  });

  it('keeps English and Russian message catalog keys in parity', () => {
    expect(validateCatalogParity(resolve(process.cwd(), '..'))).toBeGreaterThan(0);
  });
});

describe('static link and locale audit', () => {
  it('requires localized course entry links and rejects a missing local asset', () => {
    const root = mkdtempSync(join(tmpdir(), 'learn-llm-links-'));
    temporaryDirectories.push(root);
    mkdirSync(join(root, 'en/course'), { recursive: true });
    mkdirSync(join(root, 'ru/course'), { recursive: true });

    const alternates = [
      '<link rel="alternate" hreflang="en" href="/en/">',
      '<link rel="alternate" hreflang="ru" href="/ru/">',
      '<link rel="alternate" hreflang="x-default" href="/">',
    ].join('');
    const courseAlternates = [
      '<link rel="alternate" hreflang="en" href="/en/course/">',
      '<link rel="alternate" hreflang="ru" href="/ru/course/">',
      '<link rel="alternate" hreflang="x-default" href="/">',
    ].join('');
    writeFileSync(
      join(root, 'index.html'),
      '<html lang="mul"><head>' +
        alternates +
        '<link rel="stylesheet" href="/style.css"></head>' +
        '<body><a href="/en/">English</a><a href="/ru/">Русский</a></body></html>',
    );
    writeFileSync(
      join(root, 'en/index.html'),
      '<html lang="en"><head>' +
        alternates +
        '</head><body><a href="/ru/">Русский</a>' +
        '<a href="/en/course/">Course</a></body></html>',
    );
    writeFileSync(
      join(root, 'ru/index.html'),
      '<html lang="ru"><head>' +
        alternates +
        '</head><body><a href="/en/">English</a>' +
        '<a href="/ru/course/">Курс</a></body></html>',
    );
    writeFileSync(
      join(root, 'en/course/index.html'),
      '<html lang="en"><head>' + courseAlternates + '</head><body></body></html>',
    );
    writeFileSync(
      join(root, 'ru/course/index.html'),
      '<html lang="ru"><head>' + courseAlternates + '</head><body></body></html>',
    );
    writeFileSync(root + '/style.css', '@font-face{src:url("/font.woff2")}');
    writeFileSync(root + '/font.woff2', '');

    expect(auditStaticSite(root)).toEqual(
      expect.objectContaining({ htmlCount: 5 }),
    );

    writeFileSync(
      join(root, 'en/index.html'),
      '<html lang="en"><head>' +
        alternates +
        '</head><body><a href="/ru/">Русский</a></body></html>',
    );
    expect(() => auditStaticSite(root)).toThrow(
      /localized home must include an ordinary link to \/en\/course\//,
    );

    writeFileSync(
      join(root, 'en/index.html'),
      '<html lang="en"><head>' +
        alternates +
        '</head><body><a href="/en/course/">Course</a></body></html>',
    );
    writeFileSync(
      join(root, 'ru/index.html'),
      '<html lang="ru"><head>' +
        alternates +
        '</head><body><a href="/en/">English</a></body></html>',
    );
    expect(() => auditStaticSite(root)).toThrow(
      /localized home must include an ordinary link to \/ru\/course\//,
    );

    writeFileSync(
      join(root, 'ru/index.html'),
      '<html lang="ru"><head>' +
        alternates +
        '</head><body><a href="/ru/course/">Курс</a></body></html>',
    );
    writeFileSync(
      join(root, 'en/index.html'),
      '<html lang="en"><head>' +
        alternates +
        '</head><body><a href="/en/course/">Course</a>' +
        '<img src="/missing.svg"></body></html>',
    );
    expect(() => auditStaticSite(root)).toThrow(/missing\.svg/);
  });
});
