// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertAutoregressiveExamplesDiagramLabels,
  autoregressiveExamplesDiagramId,
  parseAutoregressiveExamplesTrace,
  type AutoregressiveExamplesDiagramLabels,
} from '../src/lib/autoregressive-examples-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const sharedStyles = readFileSync(
  resolve(process.cwd(), 'src/styles/diagram.module.css'),
  'utf8',
);
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch05-autoregressive-examples/diagram-trace.txt'),
  'utf8',
);
const contract = readFileSync(
  resolve(repositoryRoot, 'curriculum/chapters/05-autoregressive-examples.md'),
  'utf8',
);

const englishLabels: AutoregressiveExamplesDiagramLabels = {
  title: 'Build aligned next-token pairs one document at a time',
  description:
    'The diagram shows four short encoded documents. In every complete pair, the target begins one source position after the input; no pair crosses a document or partition boundary.',
  partitionTitles: { train: 'Training partition', validation: 'Validation partition', test: 'Test partition' },
  fields: {
    contextLength: 'Context length',
    stride: 'Stride',
    requiredSourceTokens: 'Source tokens required',
    document: 'Document',
    start: 'Candidate start',
    bos: 'document beginning',
    eos: 'document ending',
  },
  lanes: {
    source: 'Wrapped source tokens',
    input: 'Input context',
    target: 'Next-token targets',
    incompleteTail: 'Too few tokens for another pair',
  },
  values: { emitted: 'Complete pair', notEmitted: 'No new pair' },
  shiftLabel: 'Each target lies one source position to the right',
  boundaryLabel: 'Hard boundary',
  boundaryNote:
    'Pair construction restarts at every document or partition boundary: no pair crosses the boundary, and no shift arrow joins separate tapes.',
  tailNote:
    'At each shown start, too few tokens remain for a new pair, although those tokens may already occur in earlier complete pairs.',
  invariantsLabel: 'Rules shown in the diagram',
  invariants: {
    complete: 'Only spans containing all required source tokens become pairs.',
  },
};

const russianLabels: AutoregressiveExamplesDiagramLabels = {
  title: 'Пары для следующего токена внутри каждого документа',
  description:
    'На схеме четыре коротких закодированных документа. В каждой полной паре цель начинается на одну позицию позже входа; ни одна пара не пересекает границы документов и частей корпуса.',
  partitionTitles: { train: 'Обучающая выборка', validation: 'Валидационная выборка', test: 'Тестовая выборка' },
  fields: {
    contextLength: 'Длина контекста',
    stride: 'Шаг',
    requiredSourceTokens: 'Токенов нужно для пары',
    document: 'Документ',
    start: 'Начало окна',
    bos: 'начало документа',
    eos: 'конец документа',
  },
  lanes: {
    source: 'Токены документа, включая BOS и EOS',
    input: 'Входная последовательность',
    target: 'Следующие токены — цели',
    incompleteTail: 'Остаток: токенов не хватает',
  },
  values: { emitted: 'Пара построена', notEmitted: 'Новой пары нет' },
  shiftLabel: 'Цель сдвинута относительно входа на один токен',
  boundaryLabel: 'Граница документа или части корпуса',
  boundaryNote:
    'На каждой границе документа или части корпуса построение пар начинается заново: ни одна пара не пересекает границу, а стрелки сдвига не соединяют разные ленты.',
  tailNote:
    'В каждой показанной позиции токенов уже не хватает на новую пару, но они могли войти в пары, начавшиеся раньше.',
  invariantsLabel: 'Что показывает схема',
  invariants: {
    complete: 'Пара строится только при наличии всех необходимых исходных токенов.',
  },
};

function mutate(search: string, replacement: string): string {
  const first = fixture.indexOf(search);
  if (first === -1 || fixture.indexOf(search, first + search.length) !== -1) {
    throw new Error(`Mutation anchor must occur exactly once: ${search}`);
  }
  return fixture.replace(search, replacement);
}

function stringLeafPaths(value: object, prefix: readonly string[] = []): string[][] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = [...prefix, key];
    return typeof child === 'string' ? [path] : stringLeafPaths(child as object, path);
  });
}

function blankLabelAt(
  source: AutoregressiveExamplesDiagramLabels,
  path: readonly string[],
): AutoregressiveExamplesDiagramLabels {
  const copy = structuredClone(source) as unknown as Record<string, unknown>;
  let cursor = copy;
  for (const part of path.slice(0, -1)) cursor = cursor[part] as Record<string, unknown>;
  cursor[path.at(-1) ?? ''] = '   ';
  return copy as unknown as AutoregressiveExamplesDiagramLabels;
}

describe('autoregressive-examples Rust trace parser', () => {
  it('matches the contract ID and parses the complete exact fixture', () => {
    expect(autoregressiveExamplesDiagramId).toBe('autoregressive-examples');
    expect(contract).toContain(`"id": "${autoregressiveExamplesDiagramId}"`);
    expect(parseAutoregressiveExamplesTrace(fixture)).toEqual({
      config: { contextLength: 3, stride: 1, requiredSourceTokens: 4 },
      partitions: [
        {
          name: 'train',
          documents: [
            {
              partition: 'train',
              id: 'train-a',
              tokens: [0, 41, 42, 43, 44, 1],
              windows: [
                { index: 0, start: 0, input: [0, 41, 42], target: [41, 42, 43] },
                { index: 1, start: 1, input: [41, 42, 43], target: [42, 43, 44] },
                { index: 2, start: 2, input: [42, 43, 44], target: [43, 44, 1] },
              ],
              incompleteTail: { start: 3, tokens: [43, 44, 1], requiredSourceTokens: 4 },
            },
            {
              partition: 'train',
              id: 'train-b',
              tokens: [0, 51, 52, 1],
              windows: [
                { index: 0, start: 0, input: [0, 51, 52], target: [51, 52, 1] },
              ],
              incompleteTail: { start: 1, tokens: [51, 52, 1], requiredSourceTokens: 4 },
            },
          ],
        },
        {
          name: 'validation',
          documents: [
            {
              partition: 'validation',
              id: 'validation-a',
              tokens: [0, 61, 62, 63, 1],
              windows: [
                { index: 0, start: 0, input: [0, 61, 62], target: [61, 62, 63] },
                { index: 1, start: 1, input: [61, 62, 63], target: [62, 63, 1] },
              ],
              incompleteTail: { start: 2, tokens: [62, 63, 1], requiredSourceTokens: 4 },
            },
          ],
        },
        {
          name: 'test',
          documents: [
            {
              partition: 'test',
              id: 'test-a',
              tokens: [0, 71, 1],
              windows: [],
              incompleteTail: { start: 0, tokens: [0, 71, 1], requiredSourceTokens: 4 },
            },
          ],
        },
      ],
    });
  });

  it('requires one ordered block and an exact positive configuration', () => {
    expect(() => parseAutoregressiveExamplesTrace(fixture.replace('TRACE autoregressive-examples-v1 BEGIN\n', ''))).toThrow(/exactly one ordered/);
    expect(() => parseAutoregressiveExamplesTrace(`${fixture}\nTRACE autoregressive-examples-v1 BEGIN\nTRACE autoregressive-examples-v1 END\n`)).toThrow(/exactly one ordered/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('CONFIG context=3', 'CONFIG context=0'))).toThrow(/positive T\/S/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('CONFIG context=3 stride=1 required=4', 'CONFIG context=3 stride=0 required=4'))).toThrow(/positive T\/S/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('required=4\nPARTITION train', 'required=5\nPARTITION train'))).toThrow(/required=T\+1/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('CONFIG context=3', 'CONFIG context=9007199254740992'))).toThrow(/safe nonnegative/);
  });

  it('enforces partition order, document identity, wrapping, and u32 tokens', () => {
    expect(() => parseAutoregressiveExamplesTrace(mutate('PARTITION validation', 'PARTITION test'))).toThrow(/expected PARTITION validation/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('id=validation-a tokens=', 'id=train-a tokens='))).toThrow(/repeats document train-a/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('DOCUMENT partition=validation', 'DOCUMENT partition=train'))).toThrow(/crosses a partition boundary/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('DOCUMENT partition=test id=test-a tokens=0,71,1', 'DOCUMENT partition=test id=test-a tokens=9,71,1'))).toThrow(/not wrapped/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('DOCUMENT partition=train id=train-b tokens=0,51,52,1', 'DOCUMENT partition=train id=train-b tokens=0,51,1,1'))).toThrow(/interior control/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('DOCUMENT partition=test id=test-a tokens=0,71,1', 'DOCUMENT partition=test id=test-a tokens=0,4294967296,1'))).toThrow(/u32 token-ID space/);
  });

  it('validates sequential scheduled windows and the one-token source shift', () => {
    expect(() => parseAutoregressiveExamplesTrace(mutate('index=1 start=1 input=41', 'index=2 start=1 input=41'))).toThrow(/nonsequential window index/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('index=1 start=1 input=41', 'index=1 start=2 input=41'))).toThrow(/not scheduled/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('input=41,42,43 target=42,43,44', 'input=41,42 target=42,43,44'))).toThrow(/does not contain T/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('input=41,42,43 target=42,43,44', 'input=41,42,43 target=42,43,45'))).toThrow(/shifted by one token/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('WINDOW partition=train document=train-a index=2 start=2 input=42,43,44 target=43,44,1\n', ''))).toThrow(/omits a complete WINDOW/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('WINDOW partition=train document=train-b index=0 start=0 input=0,51,52 target=51,52,1\n', ''))).toThrow(/omits a complete WINDOW/);
  });

  it('requires the exact too-short suffix without inventing empty remainders', () => {
    expect(() => parseAutoregressiveExamplesTrace(mutate('TAIL partition=test document=test-a start=0 tokens=0,71,1 required=4\n', ''))).toThrow(/missing its terminal TAIL/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('TAIL partition=train document=train-a start=3', 'TAIL partition=train document=train-a start=2'))).toThrow(/inconsistent TAIL/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('tokens=43,44,1 required=4', 'tokens=44,1 required=4'))).toThrow(/inconsistent TAIL/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('tokens=0,71,1 required=4', 'tokens=0,71,1 required=3'))).toThrow(/inconsistent TAIL/);
    expect(() => parseAutoregressiveExamplesTrace(mutate('TRACE autoregressive-examples-v1 END', 'UNKNOWN record\nTRACE autoregressive-examples-v1 END'))).toThrow(/unknown or reordered record/);
  });

  it('validates every locale-owned label leaf', () => {
    expect(() => assertAutoregressiveExamplesDiagramLabels(englishLabels)).not.toThrow();
    expect(() => assertAutoregressiveExamplesDiagramLabels(russianLabels)).not.toThrow();
    const paths = stringLeafPaths(englishLabels);
    expect(paths).toHaveLength(24);
    for (const path of paths) {
      expect(() => assertAutoregressiveExamplesDiagramLabels(blankLabelAt(englishLabels, path))).toThrow(path.join('.'));
    }

    const missingTitle = structuredClone(englishLabels) as unknown as Record<string, unknown>;
    delete missingTitle.title;
    expect(() =>
      assertAutoregressiveExamplesDiagramLabels(
        missingTitle as unknown as AutoregressiveExamplesDiagramLabels,
      ),
    ).toThrow(/labels\.title is missing/);

    const missingFields = structuredClone(englishLabels) as unknown as Record<string, unknown>;
    delete missingFields.fields;
    expect(() =>
      assertAutoregressiveExamplesDiagramLabels(
        missingFields as unknown as AutoregressiveExamplesDiagramLabels,
      ),
    ).toThrow(/labels\.fields is missing/);

    const repeatedInvariant = structuredClone(englishLabels) as unknown as Record<string, unknown>;
    (repeatedInvariant.invariants as Record<string, unknown>).shift =
      'A repeated shift rule.';
    expect(() =>
      assertAutoregressiveExamplesDiagramLabels(
        repeatedInvariant as unknown as AutoregressiveExamplesDiagramLabels,
      ),
    ).toThrow(/labels\.invariants\.shift is unexpected/);
  });
});

describe('autoregressive-examples diagram component contract', () => {
  it('stays semantic, static, responsive, keyboard-readable, and locale-neutral', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/chapters/AutoregressiveExamplesDiagram.astro'),
      'utf8',
    );
    expect(source.match(/<figure\b/g)).toHaveLength(1);
    expect(source).toContain('<figcaption class="course-diagram__caption">');
    const captionIndex = source.indexOf('<figcaption class="course-diagram__caption">');
    const ruleKeyIndex = source.indexOf('class="consolidated-rule-key course-diagram__card-stack"');
    const partitionMapIndex = source.indexOf('trace.partitions.map((partition) =>');
    expect(captionIndex).toBeGreaterThan(-1);
    expect(ruleKeyIndex).toBeGreaterThan(captionIndex);
    expect(partitionMapIndex).toBeGreaterThan(ruleKeyIndex);
    expect(source).toMatch(
      /\.config-facts > div\s*\{\s*display: flex;\s*align-items: baseline;\s*gap: 0\.4rem;\s*\}/,
    );
    expect(source).not.toContain('class="partition-list');
    expect(source).toContain('class="partition course-diagram__card-stack"');
    expect(source).toContain('<ol class="document-list course-diagram__grid">');
    expect(source).toContain(
      '<article data-diagram-card data-diagram-box\n                        class="document"',
    );
    expect(source).toContain('<ol class="window-list course-diagram__grid">');
    expect(source).toContain('data-partition={partition.name}');
    expect(source).toContain('data-document={document.id}');
    expect(source).toContain('data-window-start={window.start}');
    expect(source).toContain('data-status="not-emitted"');
    expect(source).toContain('data-control={isBos');
    expect(source).toContain('tabindex="0"');
    expect(source).toContain('aria-labelledby={titleId}');
    expect(source).toContain('aria-describedby={descriptionId}');
    expect(source).toContain('-input-sequence`');
    expect(source).toContain('-target-sequence`');
    expect(source).toContain('-tail-sequence`');
    expect(source).toContain('class="visually-hidden"');
    expect(source).toContain('dir="ltr"');
    expect(source).toContain('data-diagram-scroll');
    expect(source).toContain('data-global-window-legend');
    expect(source).toContain('data-consolidated-rule-key');
    const ruleKeySource = source.slice(ruleKeyIndex, partitionMapIndex);
    expect(ruleKeySource).toContain('class="visually-hidden">{labels.invariantsLabel}</h4>');
    expect(ruleKeySource).toContain('class="complete-rule"');
    expect(ruleKeySource).toContain('class="boundary-note"');
    expect(ruleKeySource).toContain('class="tail-policy"');
    expect(ruleKeySource).toContain('class="control-key"');
    expect(ruleKeySource.match(/class="rule-separator" aria-hidden="true"/g)).toHaveLength(5);
    expect(ruleKeySource).not.toContain('<ol');
    expect(ruleKeySource).not.toContain('<ul');
    expect(ruleKeySource).not.toContain('<li');
    for (const stableId of [
      '-rules-title`',
      '-input-label`',
      '-shift-rule`',
      '-target-label`',
      '-bos-definition`',
      '-eos-definition`',
      '-complete-rule`',
      '-boundary-rule`',
      '-tail-policy`',
      '-tail-status`',
    ]) {
      expect(source).toContain(stableId);
    }
    expect(source).not.toContain('class="lane-label"');
    expect(source).not.toContain('class="shift-cue"');
    expect(source).not.toContain('class="tail-note"');
    expect(source).not.toContain('class="invariants"');
    expect(source).not.toMatch(/\.rule-separator\s*::(?:before|after)/);
    expect(source).toMatch(/\.rule-separator\s*\{\s*display: none;\s*\}/);
    expect(source).toContain('--token-track-min: calc(5ch + 0.7rem + 6px)');
    expect(source).not.toContain('minmax(2.25rem, 1fr)');
    const tapeTags =
      source.match(/<p\n\s+class="(?:token|aligned|tail)-tape[^"]*"[\s\S]*?>/g) ?? [];
    expect(tapeTags).toHaveLength(4);
    for (const tag of tapeTags) {
      expect(tag).toContain('course-diagram__scroll');
      expect(tag).toContain('role="region"');
      expect(tag).toContain('tabindex="0"');
      expect(tag).toContain('data-diagram-scroll');
      expect(tag).not.toContain('data-diagram-box');
    }
    expect(source).not.toContain('overflow-x: auto');
    expect(source).toContain('border-inline-start');
    expect(sharedStyles).toContain(':focus-visible');
    expect(source).toContain('@container course-diagram (max-width: 48rem)');
    expect(source).toContain('@media (forced-colors: active)');
    const fullscreenStart = source.indexOf(
      "figure.autoregressive-diagram.course-diagram[data-diagram-style='course-v1']:fullscreen",
    );
    const fullscreenEnd = source.indexOf('@container course-diagram (max-width: 48rem)');
    expect(fullscreenStart).toBeGreaterThan(-1);
    expect(fullscreenEnd).toBeGreaterThan(fullscreenStart);
    const fullscreenStyles = source.slice(fullscreenStart, fullscreenEnd);
    expect(fullscreenStyles).toContain(
      'grid-template-columns: minmax(0, 5.72fr) minmax(0, 3fr) minmax(0, 3.58fr)',
    );
    expect(fullscreenStyles).toMatch(
      /> \.consolidated-rule-key\s*\{[\s\S]*?grid-column: 1 \/ 3;[\s\S]*?grid-row: 1;/,
    );
    expect(fullscreenStyles).toMatch(
      /> :global\(\.diagram-full-view-actions\)\s*\{[\s\S]*?grid-column: 3;[\s\S]*?grid-row: 1;/,
    );
    expect(fullscreenStyles).toMatch(
      /> figcaption\s*\{[\s\S]*?grid-column: 3;[\s\S]*?grid-row: 2;/,
    );
    expect(fullscreenStyles).toMatch(
      /> \.partition\[data-partition='test'\]\s*\{[\s\S]*?grid-column: 3;[\s\S]*?grid-row: 3;/,
    );
    const captionRule = fullscreenStyles.match(
      /> figcaption\s*\{(?<body>[\s\S]*?)\}/,
    )?.groups?.body;
    expect(captionRule).toBeDefined();
    expect(captionRule).not.toMatch(/display\s*:|grid-template|grid-auto-flow|flex-direction/);
    expect(fullscreenStyles).not.toMatch(/font-size\s*:/);
    expect(fullscreenStyles).not.toMatch(/\bzoom\s*:/);
    expect(fullscreenStyles).not.toMatch(/transform\s*:\s*scale/);
    expect(fullscreenStyles).not.toMatch(/overflow\s*:\s*(?:hidden|clip)/);
    expect(fullscreenStyles).toMatch(/\.rule-separator\s*\{[\s\S]*?display: inline;/);
    expect(source).toContain("readFileSync(fixtureUrl, 'utf8')");
    expect(source).toContain('parseAutoregressiveExamplesTrace');
    expect(source).not.toContain('Math.random');
    expect(source).not.toContain('<script');
    expect(source).not.toContain('client:');
    for (const localized of [
      englishLabels.title,
      englishLabels.partitionTitles.train,
      russianLabels.title,
      russianLabels.partitionTitles.train,
    ]) {
      expect(source).not.toContain(localized);
    }
  });
});
