// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertTextUnitsDiagramLabels,
  formatByteCount,
  textUnitsDiagramId,
  textUnitsExamples,
  type TextUnitsDiagramLabels,
} from '../src/lib/text-units-diagram';

declare const process: { cwd(): string };

function contractExpectedOutput(): string {
  const source = readFileSync(
    resolve(process.cwd(), '../curriculum/chapters/01-text-units.md'),
    'utf8',
  );
  const frontmatter = source.match(/^---\n(.*?)\n---\n/s);
  if (!frontmatter) throw new Error('Chapter contract frontmatter is missing.');
  const contract = JSON.parse(frontmatter[1]) as {
    rust: { expected_output: string };
  };
  return contract.rust.expected_output;
}

const englishLabels: TextUnitsDiagramLabels = {
  title: 'From text to token IDs',
  description: 'Compare the four representations.',
  pipelineLabel: 'Ordered text-unit pipeline',
  examples: {
    ascii: 'ASCII example',
    cyrillic: 'Cyrillic example',
  },
  stages: {
    input: 'Input',
    bytes: 'UTF-8 bytes',
    scalars: 'Unicode scalar values',
    tokenIds: 'Token IDs',
  },
  byteCount: {
    one: '{count} byte',
    many: '{count} bytes',
  },
};

const russianLabels: TextUnitsDiagramLabels = {
  title: 'Одни и те же три позиции в четырёх представлениях',
  description: 'Проследите путь от входных единиц к ID фиксированного словаря.',
  pipelineLabel: 'Этапы представления текста',
  examples: {
    ascii: 'Пример ASCII: cat',
    cyrillic: 'Пример на кириллице: кот',
  },
  stages: {
    input: 'Входные единицы',
    bytes: 'Байты UTF-8',
    scalars: 'Скалярные значения Unicode',
    tokenIds: 'ID токенов',
  },
  byteCount: {
    one: 'Число байтов: {count}',
    many: 'Число байтов: {count}',
  },
};

describe('text-unit diagram data', () => {
  it('matches the deterministic English and Cyrillic contract examples', () => {
    expect(textUnitsDiagramId).toBe('text-units-pipeline');
    expect(textUnitsExamples).toEqual([
      {
        id: 'ascii',
        input: 'cat',
        units: [
          { value: 'c', bytes: [99], scalar: 'U+0063', tokenId: 3 },
          { value: 'a', bytes: [97], scalar: 'U+0061', tokenId: 2 },
          { value: 't', bytes: [116], scalar: 'U+0074', tokenId: 4 },
        ],
      },
      {
        id: 'cyrillic',
        input: 'кот',
        units: [
          { value: 'к', bytes: [208, 186], scalar: 'U+043A', tokenId: 5 },
          { value: 'о', bytes: [208, 190], scalar: 'U+043E', tokenId: 6 },
          { value: 'т', bytes: [209, 130], scalar: 'U+0442', tokenId: 7 },
        ],
      },
    ]);

    for (const example of textUnitsExamples) {
      expect(example.units.map((unit) => unit.value).join('')).toBe(example.input);
    }
    expect(textUnitsExamples[0].units.every((unit) => unit.bytes.length === 1)).toBe(true);
    expect(textUnitsExamples[1].units.every((unit) => unit.bytes.length === 2)).toBe(true);

    const expectedOutput = contractExpectedOutput();
    for (const example of textUnitsExamples) {
      const bytes = example.units.flatMap((unit) => unit.bytes);
      const scalars = example.units.map((unit) => unit.scalar);
      const tokenIds = example.units.map((unit) => unit.tokenId);
      expect(expectedOutput).toContain(
        [
          `input: ${example.input}`,
          `utf8 bytes: [${bytes.join(', ')}]`,
          `unicode scalars: [${scalars.join(', ')}]`,
          `token ids: [${tokenIds.join(', ')}]`,
        ].join('\n'),
      );
    }
  });

  it('formats and validates locale-owned labels', () => {
    expect(() => assertTextUnitsDiagramLabels(englishLabels)).not.toThrow();
    expect(() => assertTextUnitsDiagramLabels(russianLabels)).not.toThrow();
    expect(formatByteCount(englishLabels.byteCount, 1)).toBe('1 byte');
    expect(formatByteCount(englishLabels.byteCount, 2)).toBe('2 bytes');
    expect(formatByteCount(russianLabels.byteCount, 1)).toBe('Число байтов: 1');
    expect(formatByteCount(russianLabels.byteCount, 2)).toBe('Число байтов: 2');
    expect(formatByteCount(russianLabels.byteCount, 6)).toBe('Число байтов: 6');

    expect(() =>
      assertTextUnitsDiagramLabels({
        ...englishLabels,
        stages: { ...englishLabels.stages, scalars: ' ' },
      }),
    ).toThrow(/stages\.scalars/);
    expect(() =>
      formatByteCount({ one: 'one byte', many: '{count} bytes' }, 1),
    ).toThrow(/\{count\}/);
    expect(() => formatByteCount(englishLabels.byteCount, 0)).toThrow(/positive integer/);
  });
});

describe('text-unit diagram component contract', () => {
  it('keeps semantics, localization, keyboard access, and responsive cues in source', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/chapters/TextUnitsDiagram.astro'),
      'utf8',
    );

    expect(source).toContain('<figure');
    expect(source).toContain('<figcaption');
    expect(source).toContain('tabindex="0"');
    expect(source).toContain('aria-labelledby={titleId}');
    expect(source).toContain('aria-describedby={descriptionId}');
    expect(source).toContain('aria-label={labels.pipelineLabel}');
    expect(source).toMatch(/<ol\s+class="text-units-pipeline"[\s\S]*?dir="ltr"/);
    expect(source).toContain('data-stage="bytes"');
    expect(source).toContain('data-stage="scalars"');
    expect(source).toContain('data-stage="token-ids"');
    expect(source).toContain('content: "→"');
    expect(source).toContain('content: "↓"');
    expect(source).toContain('inset-inline-start: calc(100% + 0.25rem)');
    expect(source).toContain('unicode-bidi: isolate');
    expect(source).toContain('@media (max-width: 44rem)');
    expect(source).toContain('@media (forced-colors: active)');
    expect(source).not.toContain('<script');
    expect(source).not.toContain('client:');

    for (const localizedText of [
      englishLabels.title,
      englishLabels.stages.bytes,
      russianLabels.title,
      russianLabels.stages.bytes,
    ]) {
      expect(source).not.toContain(localizedText);
    }
  });
});
