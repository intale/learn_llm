// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  chapterLocales,
  chapterLocaleDefinitions,
  chapterPath,
  chapterTag,
  expectLocalizedChapterRoute,
  expectNoOverflowOrClientScripts,
  expectOrderedChapterNavigation,
  expectVisualizationDecision,
  readOrderedCourseChapters,
  type ChapterLocale,
  type CourseChapterLink,
} from './chapter-helpers';

declare const process: { cwd(): string };

const chapterId = '05-autoregressive-examples';
const contentRevision = 8;
const formulaLatex = String.raw`x^{(s)}=z_{s:s+T}, \quad y^{(s)}=z_{s+1:s+T+1}`;
const repositoryRoot = resolve(process.cwd(), '..');
const diagramSelector = 'figure[data-visualization-id="autoregressive-examples"]';
const diagramInstanceId = 'autoregressive-examples-diagram';
const desktop = { width: 1440, height: 1000 } as const;
const standardFullView = { width: 1280, height: 900 } as const;
const minimumFullView = { width: 1024, height: 576 } as const;
const narrow = { width: 390, height: 844 } as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line: string) => line.trim() === `// region:${region}`);
  const end = lines.findIndex((line: string) => line.trim() === `// endregion:${region}`);
  if (start === -1 || end <= start) {
    throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  }
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustSources = [
  readRustRegion('rust/demos/ch05-autoregressive-examples/src/lib.rs', 'hand-labeled-contrast'),
  readRustRegion('rust/crates/llm-from-scratch/src/data.rs', 'causal-window-policy'),
  readRustRegion('rust/crates/llm-from-scratch/src/data.rs', 'causal-window-iterator'),
  readRustRegion('rust/crates/llm-from-scratch/src/data.rs', 'partition-encoding'),
  readRustRegion('rust/demos/ch05-autoregressive-examples/src/main.rs', 'chapter-output'),
];

const copy = {
  en: {
    indexTitle: 'From text to a tiny language model',
    chapterTitle: 'Building autoregressive input–target pairs',
    revisionLabel: 'Content revision',
    headings: {
      formula: 'Express the one-token shift with slices',
      history: 'Derive next-token targets from the sequence itself',
      rust: 'Build complete pairs without flattening the corpus',
      visualization: 'Inspect shifts and hard boundaries on separate token tapes',
      exercises: 'Predict the pairs, then check them',
      decoder: 'Connect the pairs to the decoder’s task',
    },
    rustCaptions: [
      'Two token sequences with separately supplied sentiment labels',
      'Set the context, stride, count, and too-short-suffix policy',
      'Borrow the input and its one-token-shifted target',
      'Keep encoded documents owned and separated by frozen partition',
      'Run the worked pairs and preserve the frozen 8/2/2 corpus split',
    ],
    policyRustLabel:
      'Rust configuration that validates context and stride, counts complete pairs, and reports a suffix that is too short for another pair',
    diagramTitle: 'Build aligned next-token pairs one document at a time',
    summaryFacts: [
      ['Context length', '3'],
      ['Stride', '1'],
      ['Source tokens required', '4'],
    ],
    partitionTitles: ['Training partition', 'Validation partition', 'Test partition'],
    sourceLane: 'Wrapped source tokens',
    inputLane: 'Input context',
    targetLane: 'Next-token targets',
    startField: 'Candidate start',
    requiredSourceTokensField: 'Source tokens required',
    bosMeaning: 'document beginning',
    eosMeaning: 'document ending',
    completeExample: 'Complete pair',
    tailLane: 'Too few tokens for another pair',
    notEmitted: 'No new pair',
    tailNote:
      'At each shown start, too few tokens remain for a new pair, although those tokens may already occur in earlier complete pairs.',
    shiftLabel: 'Each target lies one source position to the right',
    boundaryLabel: 'Hard boundary',
    boundaryNote:
      'Pair construction restarts at every document or partition boundary: no pair crosses the boundary, and no shift arrow joins separate tapes.',
    invariantsLabel: 'Rules shown in the diagram',
    completeRule: 'Only spans containing all required source tokens become pairs.',
    exerciseSummary: 'Check your predictions',
    exerciseAnswer: 'The complete two-token source span gives [0] -> [1].',
  },
  ru: {
    indexTitle: 'От текста к небольшой языковой модели',
    chapterTitle: 'Как составлять авторегрессионные пары «вход — цель»',
    revisionLabel: 'Версия материала',
    headings: {
      formula: 'Опишите сдвиг на один токен с помощью срезов',
      history: 'Откуда языковая модель берёт целевые токены',
      rust: 'Стройте пары, обходя документы по одному',
      visualization: 'Сдвиг цели и границы на отдельных лентах',
      exercises: 'Решите задачи и проверьте себя',
      decoder: 'Что пары «вход — цель» дают декодеру',
    },
    rustCaptions: [
      'Метки тональности задаются отдельно от последовательностей',
      'Проверка параметров, подсчёт пар и поиск остатка',
      'Входной и целевой срезы без копирования',
      'Документы остаются в своих частях корпуса',
      'Пары из примера и неизменное разбиение корпуса 8/2/2',
    ],
    policyRustLabel:
      'Фрагмент кода Rust: конфигурация проверяет длину контекста и шаг, считает полные пары и находит остаток, которого недостаточно для новой пары',
    diagramTitle: 'Пары для следующего токена внутри каждого документа',
    summaryFacts: [
      ['Длина контекста', '3'],
      ['Шаг', '1'],
      ['Токенов нужно для пары', '4'],
    ],
    partitionTitles: ['Обучающая выборка', 'Валидационная выборка', 'Тестовая выборка'],
    sourceLane: 'Токены документа, включая BOS и EOS',
    inputLane: 'Входная последовательность',
    targetLane: 'Следующие токены — цели',
    startField: 'Начало окна',
    requiredSourceTokensField: 'Токенов нужно для пары',
    bosMeaning: 'начало документа',
    eosMeaning: 'конец документа',
    completeExample: 'Пара построена',
    tailLane: 'Остаток: токенов не хватает',
    notEmitted: 'Новой пары нет',
    tailNote:
      'В каждой показанной позиции токенов уже не хватает на новую пару, но они могли войти в пары, начавшиеся раньше.',
    shiftLabel: 'Цель сдвинута относительно входа на один токен',
    boundaryLabel: 'Граница документа или части корпуса',
    boundaryNote:
      'На каждой границе документа или части корпуса построение пар начинается заново: ни одна пара не пересекает границу, а стрелки сдвига не соединяют разные ленты.',
    invariantsLabel: 'Что показывает схема',
    completeRule: 'Пара строится только при наличии всех необходимых исходных токенов.',
    exerciseSummary: 'Проверьте решения',
    exerciseAnswer: 'Из двух токенов получается полная пара [0] -> [1].',
  },
} as const satisfies Record<ChapterLocale, unknown>;

const expectedDocumentEvidence = [
  {
    partition: 'train',
    id: 'train-a',
    source: ['0', '41', '42', '43', '44', '1'],
    windows: [
      { index: '0', start: '0', input: ['0', '41', '42'], target: ['41', '42', '43'] },
      { index: '1', start: '1', input: ['41', '42', '43'], target: ['42', '43', '44'] },
      { index: '2', start: '2', input: ['42', '43', '44'], target: ['43', '44', '1'] },
    ],
    tail: { start: '3', tokens: ['43', '44', '1'] },
  },
  {
    partition: 'train',
    id: 'train-b',
    source: ['0', '51', '52', '1'],
    windows: [
      { index: '0', start: '0', input: ['0', '51', '52'], target: ['51', '52', '1'] },
    ],
    tail: { start: '1', tokens: ['51', '52', '1'] },
  },
  {
    partition: 'validation',
    id: 'validation-a',
    source: ['0', '61', '62', '63', '1'],
    windows: [
      { index: '0', start: '0', input: ['0', '61', '62'], target: ['61', '62', '63'] },
      { index: '1', start: '1', input: ['61', '62', '63'], target: ['62', '63', '1'] },
    ],
    tail: { start: '2', tokens: ['62', '63', '1'] },
  },
  {
    partition: 'test',
    id: 'test-a',
    source: ['0', '71', '1'],
    windows: [],
    tail: { start: '0', tokens: ['0', '71', '1'] },
  },
] as const;

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    );
  });
}

async function expectSummaryFacts(
  diagram: Locator,
  expectedFacts: readonly (readonly [string, string])[],
) {
  const facts = diagram.locator('.config-facts > [data-diagram-box]');
  await expect(facts).toHaveCount(expectedFacts.length);
  await expect(facts.locator('dt')).toHaveText(expectedFacts.map(([label]) => label));
  await expect(facts.locator('dd')).toHaveText(expectedFacts.map(([, value]) => value));

  const problems = await facts.evaluateAll((items) => {
    const epsilon = 2;
    const completeBorder = (style: CSSStyleDeclaration) =>
      [
        [style.borderTopStyle, style.borderTopWidth],
        [style.borderRightStyle, style.borderRightWidth],
        [style.borderBottomStyle, style.borderBottomWidth],
        [style.borderLeftStyle, style.borderLeftWidth],
      ].every(
        ([borderStyle, borderWidth]) =>
          !['none', 'hidden'].includes(borderStyle) && Number.parseFloat(borderWidth) > 0,
      );
    const textRect = (node: Node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getBoundingClientRect();
    };

    return items.flatMap((item, index) => {
      const issues: string[] = [];
      const style = getComputedStyle(item);
      const box = item.getBoundingClientRect();
      const label = item.querySelector('dt');
      const value = item.querySelector('dd');
      if (!label || !value) return [`fact ${index} lacks its dt or dd`];
      const labelInk = textRect(label);
      const valueInk = textRect(value);
      const inner = {
        top: box.top + Number.parseFloat(style.borderTopWidth),
        right: box.right - Number.parseFloat(style.borderRightWidth),
        bottom: box.bottom - Number.parseFloat(style.borderBottomWidth),
        left: box.left + Number.parseFloat(style.borderLeftWidth),
      };

      if (style.display !== 'flex' || style.alignItems !== 'baseline') {
        issues.push(`fact ${index} is not a baseline-aligned flex unit`);
      }
      if (!completeBorder(style)) issues.push(`fact ${index} lacks a complete border`);
      for (const [kind, ink] of [
        ['label', labelInk],
        ['value', valueInk],
      ] as const) {
        if (
          ink.top < inner.top - epsilon ||
          ink.right > inner.right + epsilon ||
          ink.bottom > inner.bottom + epsilon ||
          ink.left < inner.left - epsilon
        ) {
          issues.push(`fact ${index} ${kind} crosses its box border`);
        }
      }
      if (Math.abs(labelInk.bottom - valueInk.bottom) > epsilon) {
        issues.push(`fact ${index} label and value do not share a text baseline`);
      }
      if (
        (item as HTMLElement).scrollWidth - (item as HTMLElement).clientWidth > epsilon ||
        (item as HTMLElement).scrollHeight - (item as HTMLElement).clientHeight > epsilon
      ) {
        issues.push(`fact ${index} has hidden layout debt`);
      }
      return issues;
    });
  });
  expect(problems).toEqual([]);
}

async function expectExactDiagramEvidence(diagram: Locator, locale: ChapterLocale) {
  const localized = copy[locale];
  await expect(diagram).toHaveCount(1);
  await expect(diagram.locator(':scope > .partition-list')).toHaveCount(0);
  await expect(diagram.locator(':scope > [data-consolidated-rule-key]')).toHaveCount(1);
  await expect(diagram.locator(':scope > .partition[data-partition]')).toHaveCount(3);

  const directStructure = await diagram.evaluate((root) =>
    Array.from(root.children)
      .filter((child) => !child.matches('[data-diagram-full-view-controls]'))
      .map((child) => ({
        tag: child.tagName,
        role:
          child.matches('figcaption')
            ? 'caption'
            : child.matches('[data-consolidated-rule-key]')
              ? 'rules'
              : child.getAttribute('data-partition'),
      })),
  );
  expect(directStructure).toEqual([
    { tag: 'FIGCAPTION', role: 'caption' },
    { tag: 'SECTION', role: 'rules' },
    { tag: 'SECTION', role: 'train' },
    { tag: 'SECTION', role: 'validation' },
    { tag: 'SECTION', role: 'test' },
  ]);

  const ruleKey = diagram.locator('[data-consolidated-rule-key]');
  await expect(ruleKey).toHaveAccessibleName(localized.invariantsLabel);
  await expect(ruleKey.locator('li')).toHaveCount(0);
  expect(
    await ruleKey.evaluate((node) =>
      Array.from(node.children).map((child) =>
        `${child.tagName}.${Array.from(child.classList).join('.')}`,
      ),
    ),
  ).toEqual([
    'H4.visually-hidden',
    'DIV.global-window-legend',
    'SPAN.rule-separator',
    'P.complete-rule',
    'SPAN.rule-separator',
    'P.boundary-note',
    'SPAN.rule-separator',
    'P.tail-policy',
    'SPAN.rule-separator',
    'P.control-key',
  ]);
  await expect(ruleKey.locator(':scope > .rule-separator')).toHaveCount(4);
  await expect(ruleKey.locator('.control-key > .rule-separator')).toHaveCount(1);
  await expect(ruleKey.locator('.rule-separator')).toHaveCount(5);
  expect(
    await ruleKey.locator('.rule-separator').evaluateAll((separators) =>
      separators.every(
        (separator) =>
          separator.getAttribute('aria-hidden') === 'true' &&
          separator.textContent?.trim() === '·' &&
          getComputedStyle(separator, '::before').content === 'none' &&
          getComputedStyle(separator, '::after').content === 'none',
      ),
    ),
  ).toBe(true);

  const globalLegend = ruleKey.locator('[data-global-window-legend]');
  await expect(globalLegend).toHaveCount(1);
  await expect(globalLegend.locator(':scope > :not([aria-hidden="true"])')).toHaveText([
    localized.inputLane,
    localized.shiftLabel,
    localized.targetLane,
  ]);
  await expect(globalLegend.locator(':scope > [aria-hidden="true"]')).toHaveCount(2);
  await expect(ruleKey.locator(':scope > .complete-rule')).toContainText(localized.completeRule);
  await expect(ruleKey.locator(':scope > .boundary-note')).toContainText(localized.boundaryNote);
  await expect(ruleKey.locator(':scope > .tail-policy')).toContainText(localized.tailNote);
  await expect(
    ruleKey.locator(':scope > .control-key > span:not(.rule-separator)'),
  ).toHaveText([
    `BOS — ${localized.bosMeaning}`,
    `EOS — ${localized.eosMeaning}`,
  ]);

  const partitions = diagram.locator(':scope > [data-partition].partition');
  await expect(partitions.getByRole('heading', { level: 4 })).toHaveText([
    ...localized.partitionTitles,
  ]);
  expect(await partitions.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-partition')))).toEqual([
    'train',
    'validation',
    'test',
  ]);
  await expect(diagram.locator('.boundary-label')).toHaveCount(3);
  await expect(diagram.locator('.boundary-label')).toHaveText([
    localized.boundaryLabel,
    localized.boundaryLabel,
    localized.boundaryLabel,
  ]);

  const documentLists = diagram.locator('.document-list');
  expect(
    await documentLists.evaluateAll((lists) =>
      lists.map((list) => ({
        children: Array.from(list.children).map((child) => child.tagName),
        tag: list.tagName,
      })),
    ),
  ).toEqual([
    { tag: 'OL', children: ['LI', 'LI'] },
    { tag: 'OL', children: ['LI'] },
    { tag: 'OL', children: ['LI'] },
  ]);

  const documents = diagram.locator('article[data-document]');
  await expect(documents).toHaveCount(4);
  const renderedDocuments = await documents.evaluateAll((nodes) =>
    nodes.map((node) => ({
      id: node.getAttribute('data-document'),
      partition: node.getAttribute('data-partition'),
      source: Array.from(node.querySelectorAll('.source-lane [data-token-id]')).map((token) =>
        token.getAttribute('data-token-id'),
      ),
      windows: Array.from(node.querySelectorAll<HTMLElement>('[data-window-index]')).map(
        (windowNode) => ({
          index: windowNode.getAttribute('data-window-index'),
          start: windowNode.getAttribute('data-window-start'),
          status: windowNode.getAttribute('data-status'),
          input: Array.from(windowNode.querySelectorAll('[data-input-position]')).map((token) =>
            token.getAttribute('data-token-id'),
          ),
          target: Array.from(windowNode.querySelectorAll('[data-target-position]')).map((token) =>
            token.getAttribute('data-token-id'),
          ),
        }),
      ),
      tail: (() => {
        const tail = node.querySelector<HTMLElement>('[data-tail-start]');
        return tail
          ? {
              start: tail.getAttribute('data-tail-start'),
              status: tail.getAttribute('data-status'),
              tokens: Array.from(tail.querySelectorAll('[data-tail-position]')).map((token) =>
                token.getAttribute('data-token-id'),
              ),
            }
          : null;
      })(),
      causalOrder: Array.from(node.children)
        .filter((child) => child.matches('.source-lane, .window-list, .incomplete-tail'))
        .map((child) =>
          child.matches('.source-lane')
            ? 'source'
            : child.matches('.window-list')
              ? 'windows'
              : 'tail',
        ),
    })),
  );
  expect(renderedDocuments).toEqual(
    expectedDocumentEvidence.map((document) => ({
      id: document.id,
      partition: document.partition,
      source: [...document.source],
      windows: document.windows.map((window) => ({ ...window, input: [...window.input], target: [...window.target], status: 'emitted' })),
      tail: { ...document.tail, tokens: [...document.tail.tokens], status: 'not-emitted' },
      causalOrder: ['source', 'windows', 'tail'],
    })),
  );

  const windowLists = diagram.locator('.window-list');
  expect(
    await windowLists.evaluateAll((lists) =>
      lists.map((list) => ({
        count: list.children.length,
        directChildrenAreListItems: Array.from(list.children).every(
          (child) => child.tagName === 'LI',
        ),
        tag: list.tagName,
      })),
    ),
  ).toEqual([
    { tag: 'OL', count: 3, directChildrenAreListItems: true },
    { tag: 'OL', count: 1, directChildrenAreListItems: true },
    { tag: 'OL', count: 2, directChildrenAreListItems: true },
    { tag: 'OL', count: 0, directChildrenAreListItems: true },
  ]);
  await expect(diagram.locator('[data-window-index][data-status="emitted"]')).toHaveCount(6);
  await expect(diagram.locator('[data-tail-start][data-status="not-emitted"]')).toHaveCount(4);
  await expect(diagram.locator('.aligned-window > .lane-label')).toHaveCount(0);
  await expect(diagram.locator('.aligned-window > .shift-cue')).toHaveCount(0);
  await expect(diagram.locator('.incomplete-tail > .tail-note')).toHaveCount(0);
  await expect(diagram.locator('.invariants')).toHaveCount(0);
  await expect(diagram.locator('.control-key')).toHaveCount(1);
  await expect(diagram.locator('.tail-policy')).toHaveCount(1);
  await expect(diagram.locator('[data-control="bos"]')).toHaveCount(4);
  await expect(diagram.locator('[data-control="eos"]')).toHaveCount(4);

  const tapes = diagram.locator('.token-tape, .aligned-tape, .tail-tape');
  await expect(tapes).toHaveCount(20);
  await expect(diagram.locator('.token-tape')).toHaveCount(4);
  await expect(diagram.locator('.aligned-tape:not(.target)')).toHaveCount(6);
  await expect(diagram.locator('.aligned-tape.target')).toHaveCount(6);
  await expect(diagram.locator('.tail-tape')).toHaveCount(4);
  await expect(diagram.locator('[data-diagram-scroll]')).toHaveCount(20);
  expect(
    await tapes.evaluateAll((nodes) =>
      nodes.every(
        (node) =>
          node.matches('[data-diagram-scroll].course-diagram__scroll') &&
          !node.hasAttribute('data-diagram-box') &&
          node.getAttribute('role') === 'region' &&
          node.getAttribute('tabindex') === '0' &&
          node.getAttribute('dir') === 'ltr',
      ),
    ),
  ).toBe(true);
  await expect(diagram.locator(':is(.token-tape, .aligned-tape, .tail-tape) > [data-diagram-box]')).toHaveCount(100);
  await expect(diagram.locator(':is(.token-tape, .aligned-tape, .tail-tape) > code[data-token-id][data-diagram-box]')).toHaveCount(66);
  await expect(diagram.locator(':is(.token-tape, .aligned-tape, .tail-tape) > .empty-cell[data-diagram-box]')).toHaveCount(34);
  await expect(diagram.locator('[data-diagram-box]')).toHaveCount(115);

  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
}

async function expectExactTapeRelationships(diagram: Locator, locale: ChapterLocale) {
  const localized = copy[locale];
  const problems = await diagram.evaluate(
    (root, input) => {
      const issues: string[] = [];
      const normalize = (value: string | null | undefined) =>
        (value ?? '').replace(/\s+/g, ' ').trim();
      const accessibleText = (element: Element): string =>
        normalize(
          Array.from(element.childNodes)
            .map((child) => {
              if (child.nodeType === Node.TEXT_NODE) return child.textContent ?? '';
              const childElement = child as Element;
              return childElement.getAttribute('aria-hidden') === 'true'
                ? ''
                : accessibleText(childElement);
            })
            .join(' '),
        );
      const ids = Array.from(root.querySelectorAll<HTMLElement>('[id]')).map((node) => node.id);
      if (new Set(ids).size !== ids.length) issues.push('diagram IDs are not unique');
      const expectedGlobal = {
        rules: `${input.instanceId}-rules-title`,
        input: `${input.instanceId}-input-label`,
        shift: `${input.instanceId}-shift-rule`,
        target: `${input.instanceId}-target-label`,
        bos: `${input.instanceId}-bos-definition`,
        eos: `${input.instanceId}-eos-definition`,
        complete: `${input.instanceId}-complete-rule`,
        boundary: `${input.instanceId}-boundary-rule`,
        tail: `${input.instanceId}-tail-policy`,
      };
      const expectedGlobalText = {
        [expectedGlobal.rules]: input.labels.invariantsLabel,
        [expectedGlobal.input]: input.labels.inputLane,
        [expectedGlobal.shift]: input.labels.shiftLabel,
        [expectedGlobal.target]: input.labels.targetLane,
        [expectedGlobal.bos]: `BOS — ${input.labels.bosMeaning}`,
        [expectedGlobal.eos]: `EOS — ${input.labels.eosMeaning}`,
        [expectedGlobal.complete]: input.labels.completeRule,
        [expectedGlobal.boundary]: input.labels.boundaryNote,
        [expectedGlobal.tail]: input.labels.tailNote,
      };
      for (const [id, expectedText] of Object.entries(expectedGlobalText)) {
        const matches = root.querySelectorAll(`[id="${id}"]`);
        if (matches.length !== 1) {
          issues.push(`global ID ${id} resolves ${matches.length} times`);
        } else if (accessibleText(matches[0]!) !== normalize(expectedText)) {
          issues.push(`global ID ${id} has unexpected text`);
        }
      }
      const key = root.querySelector<HTMLElement>('[data-consolidated-rule-key]');
      if (key?.getAttribute('aria-labelledby') !== expectedGlobal.rules) {
        issues.push('consolidated rule key does not name its hidden heading directly');
      }

      const expectRefs = (
        node: HTMLElement | null,
        attribute: 'aria-labelledby' | 'aria-describedby',
        expected: readonly string[],
        label: string,
      ) => {
        if (!node) {
          issues.push(`${label} is missing`);
          return;
        }
        const actual = normalize(node.getAttribute(attribute)).split(/\s+/).filter(Boolean);
        if (actual.join(' ') !== expected.join(' ')) {
          issues.push(`${label} ${attribute} is ${actual.join(' ')}, expected ${expected.join(' ')}`);
        }
        for (const id of actual) {
          const matches = root.querySelectorAll(`[id="${id}"]`);
          if (matches.length !== 1 || !accessibleText(matches[0]!).trim()) {
            issues.push(`${label} has unresolved or blank ${attribute} reference ${id}`);
          }
        }
      };
      const textFromRefs = (node: HTMLElement, attribute: 'aria-labelledby' | 'aria-describedby') =>
        normalize(
          normalize(node.getAttribute(attribute))
            .split(/\s+/)
            .filter(Boolean)
            .map((id) => {
              const target = root.querySelector(`[id="${id}"]`);
              return target ? accessibleText(target) : '';
            })
            .join(' '),
        );
      const expectText = (
        node: HTMLElement | null,
        attribute: 'aria-labelledby' | 'aria-describedby',
        expected: string,
        label: string,
      ) => {
        if (node && textFromRefs(node, attribute) !== normalize(expected)) {
          issues.push(`${label} ${attribute} text is not exact`);
        }
      };

      for (const documentEvidence of input.documents) {
        const documentNode = root.querySelector<HTMLElement>(
          `article[data-document="${documentEvidence.id}"][data-partition="${documentEvidence.partition}"]`,
        );
        if (!documentNode) {
          issues.push(`document ${documentEvidence.id} is missing`);
          continue;
        }
        const documentId = `${input.instanceId}-${documentEvidence.partition}-${documentEvidence.id}`;
        const source = documentNode.querySelector<HTMLElement>('.token-tape');
        const sourceSequence = documentEvidence.source
          .map((token, position) =>
            position === 0
              ? `BOS:${token}`
              : position === documentEvidence.source.length - 1
                ? `EOS:${token}`
                : token,
          )
          .join(', ');
        expectRefs(
          source,
          'aria-labelledby',
          [`${documentId}-source`, `${documentId}-source-sequence`],
          `${documentEvidence.id} source`,
        );
        expectRefs(
          source,
          'aria-describedby',
          [expectedGlobal.bos, expectedGlobal.eos],
          `${documentEvidence.id} source`,
        );
        expectText(
          source,
          'aria-labelledby',
          `${input.labels.sourceLane} ${sourceSequence}`,
          `${documentEvidence.id} source`,
        );
        expectText(
          source,
          'aria-describedby',
          `BOS — ${input.labels.bosMeaning} EOS — ${input.labels.eosMeaning}`,
          `${documentEvidence.id} source`,
        );

        for (const windowEvidence of documentEvidence.windows) {
          const windowNode = documentNode.querySelector<HTMLElement>(
            `[data-window-index="${windowEvidence.index}"][data-window-start="${windowEvidence.start}"]`,
          );
          const windowId = `${documentId}-window-${windowEvidence.index}`;
          const inputTape = windowNode?.querySelector<HTMLElement>('.aligned-tape:not(.target)') ?? null;
          const targetTape = windowNode?.querySelector<HTMLElement>('.aligned-tape.target') ?? null;
          expectRefs(
            inputTape,
            'aria-labelledby',
            [`${windowId}-title`, `${windowId}-start`, expectedGlobal.input, `${windowId}-input-sequence`],
            `${documentEvidence.id} window ${windowEvidence.index} input`,
          );
          if (inputTape?.hasAttribute('aria-describedby')) {
            issues.push(`${documentEvidence.id} window ${windowEvidence.index} input has an unexpected description`);
          }
          expectText(
            inputTape,
            'aria-labelledby',
            `${input.labels.completeExample} #${windowEvidence.index} ${input.labels.startField}: ${windowEvidence.start} ${input.labels.inputLane} ${windowEvidence.input.join(', ')}`,
            `${documentEvidence.id} window ${windowEvidence.index} input`,
          );
          expectRefs(
            targetTape,
            'aria-labelledby',
            [`${windowId}-title`, `${windowId}-start`, expectedGlobal.target, `${windowId}-target-sequence`],
            `${documentEvidence.id} window ${windowEvidence.index} target`,
          );
          expectRefs(
            targetTape,
            'aria-describedby',
            [expectedGlobal.shift],
            `${documentEvidence.id} window ${windowEvidence.index} target`,
          );
          expectText(
            targetTape,
            'aria-labelledby',
            `${input.labels.completeExample} #${windowEvidence.index} ${input.labels.startField}: ${windowEvidence.start} ${input.labels.targetLane} ${windowEvidence.target.join(', ')}`,
            `${documentEvidence.id} window ${windowEvidence.index} target`,
          );
          expectText(
            targetTape,
            'aria-describedby',
            input.labels.shiftLabel,
            `${documentEvidence.id} window ${windowEvidence.index} target`,
          );
        }

        const tail = documentNode.querySelector<HTMLElement>('.tail-tape');
        expectRefs(
          tail,
          'aria-labelledby',
          [`${documentId}-tail`, `${documentId}-tail-status`, `${documentId}-tail-facts`, `${documentId}-tail-sequence`],
          `${documentEvidence.id} tail`,
        );
        expectRefs(
          tail,
          'aria-describedby',
          [expectedGlobal.tail],
          `${documentEvidence.id} tail`,
        );
        expectText(
          tail,
          'aria-labelledby',
          `${input.labels.tailLane} ${input.labels.notEmitted} ${input.labels.startField}: ${documentEvidence.tail.start} · ${input.labels.requiredSourceTokensField}: 4 ${documentEvidence.tail.tokens.join(', ')}`,
          `${documentEvidence.id} tail`,
        );
        expectText(
          tail,
          'aria-describedby',
          input.labels.tailNote,
          `${documentEvidence.id} tail`,
        );
      }
      return issues;
    },
    {
      instanceId: diagramInstanceId,
      documents: expectedDocumentEvidence,
      labels: {
        sourceLane: localized.sourceLane,
        inputLane: localized.inputLane,
        targetLane: localized.targetLane,
        startField: localized.startField,
        requiredSourceTokensField: localized.requiredSourceTokensField,
        bosMeaning: localized.bosMeaning,
        eosMeaning: localized.eosMeaning,
        completeExample: localized.completeExample,
        tailLane: localized.tailLane,
        notEmitted: localized.notEmitted,
        tailNote: localized.tailNote,
        shiftLabel: localized.shiftLabel,
        boundaryNote: localized.boundaryNote,
        invariantsLabel: localized.invariantsLabel,
        completeRule: localized.completeRule,
      },
    },
  );
  expect(problems).toEqual([]);

  const firstDocument = diagram.locator('article[data-document="train-a"]');
  const sourceTape = firstDocument.locator('.token-tape');
  const firstWindow = firstDocument.locator('[data-window-index="0"]');
  const inputTape = firstWindow.locator('.aligned-tape:not(.target)');
  const targetTape = firstWindow.locator('.aligned-tape.target');
  const tailTape = firstDocument.locator('.tail-tape');
  await expect(sourceTape).toHaveAccessibleName(
    new RegExp(`${escapeRegExp(localized.sourceLane)}.*BOS:0, 41, 42, 43, 44, EOS:1`),
  );
  await expect(sourceTape).toHaveAccessibleDescription(
    new RegExp(`BOS.*${escapeRegExp(localized.bosMeaning)}.*EOS.*${escapeRegExp(localized.eosMeaning)}`),
  );
  await expect(inputTape).toHaveAccessibleName(
    new RegExp(`${escapeRegExp(localized.completeExample)}.*#0.*${escapeRegExp(localized.startField)}.*0.*${escapeRegExp(localized.inputLane)}.*0, 41, 42`),
  );
  await expect(targetTape).toHaveAccessibleName(
    new RegExp(`${escapeRegExp(localized.completeExample)}.*#0.*${escapeRegExp(localized.startField)}.*0.*${escapeRegExp(localized.targetLane)}.*41, 42, 43`),
  );
  await expect(targetTape).toHaveAccessibleDescription(localized.shiftLabel);
  await expect(tailTape).toHaveAccessibleName(
    new RegExp(`${escapeRegExp(localized.tailLane)}.*${escapeRegExp(localized.notEmitted)}.*${escapeRegExp(localized.startField)}.*3.*${escapeRegExp(localized.requiredSourceTokensField)}.*4.*43, 44, 1`),
  );
  await expect(tailTape).toHaveAccessibleDescription(localized.tailNote);
}

async function readAutoregressiveGeometry(diagram: Locator) {
  return diagram.evaluate((root) => {
    const figure = root as HTMLElement;
    const epsilon = 2;
    const visible = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      return (
        element.getClientRects().length > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        !element.closest('.visually-hidden, [data-diagram-full-view-controls]')
      );
    };
    const describe = (element: HTMLElement) => {
      const classes = Array.from(element.classList).slice(0, 2).join('.');
      return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ''}`;
    };
    const borderEvidence = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      return {
        colors: [
          style.borderTopColor,
          style.borderRightColor,
          style.borderBottomColor,
          style.borderLeftColor,
        ],
        styles: [
          style.borderTopStyle,
          style.borderRightStyle,
          style.borderBottomStyle,
          style.borderLeftStyle,
        ],
        widths: [
          Number.parseFloat(style.borderTopWidth),
          Number.parseFloat(style.borderRightWidth),
          Number.parseFloat(style.borderBottomWidth),
          Number.parseFloat(style.borderLeftWidth),
        ],
      };
    };
    const colorIsTransparent = (value: string) => {
      const normalized = value.toLowerCase().replaceAll(' ', '');
      return (
        normalized === 'transparent' ||
        /^rgba\([^)]*,0(?:\.0+)?\)$/.test(normalized) ||
        /\/0(?:\.0+)?\)$/.test(normalized)
      );
    };
    const hasCompleteBorder = (element: HTMLElement) => {
      const evidence = borderEvidence(element);
      return (
        evidence.widths.every((width) => Number.isFinite(width) && width > 0) &&
        evidence.styles.every((style) => !['none', 'hidden'].includes(style)) &&
        evidence.colors.every((color) => !colorIsTransparent(color))
      );
    };
    const clips = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      return (
        [style.overflowX, style.overflowY].some((value) => ['hidden', 'clip'].includes(value)) ||
        /(?:paint|strict|content)/.test(style.contain)
      );
    };
    const innerRect = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const widths = borderEvidence(element).widths;
      return {
        left: rect.left + widths[3]!,
        right: rect.right - widths[1]!,
        top: rect.top + widths[0]!,
        bottom: rect.bottom - widths[2]!,
      };
    };
    const within = (
      child: { left: number; right: number; top: number; bottom: number },
      owner: { left: number; right: number; top: number; bottom: number },
      checkInline = true,
      checkBlock = true,
    ) =>
      (!checkInline || (child.left >= owner.left - epsilon && child.right <= owner.right + epsilon)) &&
      (!checkBlock || (child.top >= owner.top - epsilon && child.bottom <= owner.bottom + epsilon));

    const domElements = [figure, ...figure.querySelectorAll<HTMLElement>('*')];
    const all = domElements.filter(visible);
    const markedBoxes = all.filter((element) => element.hasAttribute('data-diagram-box'));
    const borderedOwners = all.filter(hasCompleteBorder);
    const boundedOwners = new Set<HTMLElement>([...markedBoxes, ...borderedOwners]);
    const nearestBoundedOwner = (element: HTMLElement | null) => {
      let current = element;
      while (current && figure.contains(current)) {
        if (boundedOwners.has(current)) return current;
        if (current === figure) break;
        current = current.parentElement;
      }
      return null;
    };
    const problems: string[] = [];

    for (const [index, owner] of [...boundedOwners].entries()) {
      if (!hasCompleteBorder(owner)) problems.push(`owner-${index} ${describe(owner)} lacks four borders`);
      if (clips(owner)) problems.push(`owner-${index} ${describe(owner)} clips or paint-contains overflow`);
      const inlineDebt = Math.max(0, owner.scrollWidth - owner.clientWidth);
      const blockDebt = Math.max(0, owner.scrollHeight - owner.clientHeight);
      if (owner !== figure && inlineDebt > epsilon) {
        problems.push(`owner-${index} ${describe(owner)} has ${inlineDebt}px inline debt`);
      }
      if (owner !== figure && blockDebt > epsilon) {
        problems.push(`owner-${index} ${describe(owner)} has ${blockDebt}px block debt`);
      }

      const ancestor = nearestBoundedOwner(owner.parentElement);
      if (!ancestor) continue;
      const scroller = owner.parentElement?.closest<HTMLElement>('[data-diagram-scroll]');
      const checkInline = !scroller || !ancestor.contains(scroller);
      if (!within(owner.getBoundingClientRect(), innerRect(ancestor), checkInline, ancestor !== figure)) {
        problems.push(`owner-${index} ${describe(owner)} escapes its nearest bounded ancestor`);
      }
    }

    const unmarkedBorderOwners = borderedOwners.filter(
      (owner) => !owner.hasAttribute('data-diagram-box'),
    );
    for (const owner of unmarkedBorderOwners) {
      if (owner !== figure) problems.push(`${describe(owner)} has an unmarked complete border`);
    }

    const scrollers = Array.from(
      figure.querySelectorAll<HTMLElement>('[data-diagram-scroll]'),
    );
    for (const [index, scroller] of scrollers.entries()) {
      const labelled = (scroller.getAttribute('aria-labelledby') ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .every((id) => document.getElementById(id)?.textContent?.trim());
      if (
        !scroller.classList.contains('course-diagram__scroll') ||
        scroller.getAttribute('role') !== 'region' ||
        scroller.getAttribute('tabindex') !== '0' ||
        !labelled
      ) {
        problems.push(`scroller-${index} has incomplete shared accessible semantics`);
      }
      if (scroller.hasAttribute('data-diagram-box')) {
        problems.push(`scroller-${index} falsely claims bounded-box ownership`);
      }
      if (clips(scroller)) problems.push(`scroller-${index} clips or paint-contains overflow`);
      const blockDebt = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      if (blockDebt > epsilon) problems.push(`scroller-${index} has ${blockDebt}px vertical travel`);
      const semanticOwner = scroller.parentElement?.closest<HTMLElement>(
        '[data-diagram-box], section, figure.course-diagram',
      );
      if (
        semanticOwner &&
        !within(scroller.getBoundingClientRect(), semanticOwner.getBoundingClientRect(), true, false)
      ) {
        problems.push(`scroller-${index} escapes its semantic owner`);
      }
      scroller.scrollLeft = 0;
    }

    const walker = document.createTreeWalker(figure, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      if (!textNode.textContent?.trim()) continue;
      const parent = textNode.parentElement;
      if (
        !parent ||
        parent.closest('.visually-hidden, [data-diagram-full-view-controls]') ||
        getComputedStyle(parent).display === 'none' ||
        getComputedStyle(parent).visibility === 'hidden'
      ) {
        continue;
      }
      const owner = nearestBoundedOwner(parent);
      if (!owner) continue;
      const range = document.createRange();
      range.selectNodeContents(textNode);
      for (const paint of Array.from(range.getClientRects())) {
        if (paint.width <= 0 || paint.height <= 0) continue;
        if (!within(paint, innerRect(owner))) {
          problems.push(`${describe(parent)} paints text outside ${describe(owner)}`);
          break;
        }
      }
    }

    let alignmentMaxDelta = 0;
    for (const documentNode of figure.querySelectorAll<HTMLElement>('article[data-document]')) {
      const source = documentNode.querySelector<HTMLElement>('.token-tape');
      if (!source) {
        problems.push(`${documentNode.dataset.document} lacks a source tape`);
        continue;
      }
      const reference = Array.from(source.children).map((cell) => cell.getBoundingClientRect());
      const tapes = Array.from(
        documentNode.querySelectorAll<HTMLElement>('.token-tape, .aligned-tape, .tail-tape'),
      );
      for (const [tapeIndex, tape] of tapes.entries()) {
        const cells = Array.from(tape.children);
        if (cells.length !== reference.length) {
          problems.push(`${documentNode.dataset.document} tape ${tapeIndex} has ${cells.length} cells`);
          continue;
        }
        for (let position = 0; position < cells.length; position += 1) {
          const actual = cells[position]!.getBoundingClientRect();
          const expected = reference[position]!;
          alignmentMaxDelta = Math.max(
            alignmentMaxDelta,
            Math.abs(actual.left - expected.left),
            Math.abs(actual.width - expected.width),
          );
        }
      }
    }
    if (alignmentMaxDelta >= 0.75) {
      problems.push(`cross-tape token alignment drifts ${alignmentMaxDelta}px`);
    }

    const fontSizes = domElements.flatMap((element, index) => {
      if (
        !visible(element) ||
        element.matches('.rule-separator') ||
        element.closest('.visually-hidden, [data-diagram-full-view-controls]')
      ) {
        return [];
      }
      const hasDirectText = Array.from(element.childNodes).some(
        (child) => child.nodeType === Node.TEXT_NODE && Boolean(child.textContent?.trim()),
      );
      return hasDirectText
        ? [{ index, pixels: Number.parseFloat(getComputedStyle(element).fontSize) }]
        : [];
    });
    const localTravel = scrollers.map((scroller) => ({
      debt: Math.max(0, scroller.scrollWidth - scroller.clientWidth),
      ratio:
        scroller.clientWidth > 0
          ? Math.max(0, scroller.scrollWidth - scroller.clientWidth) / scroller.clientWidth
          : Number.POSITIVE_INFINITY,
    }));

    return {
      alignmentMaxDelta,
      blockBudget: Math.ceil(figure.clientHeight * 0.2),
      blockDebt: Math.max(0, figure.scrollHeight - figure.clientHeight),
      blockViewport: figure.clientHeight,
      browserSurface: {
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth,
        screenHeight: window.screen.height,
        screenWidth: window.screen.width,
      },
      borderedOwnerCount: borderedOwners.length,
      cellBoxCount: figure.querySelectorAll(
        ':is(.token-tape, .aligned-tape, .tail-tape) > [data-diagram-box]',
      ).length,
      codeCellCount: figure.querySelectorAll(
        ':is(.token-tape, .aligned-tape, .tail-tape) > code[data-token-id][data-diagram-box]',
      ).length,
      dualRoleTapeCount: scrollers.filter((scroller) => scroller.hasAttribute('data-diagram-box')).length,
      emptyCellCount: figure.querySelectorAll(
        ':is(.token-tape, .aligned-tape, .tail-tape) > .empty-cell[data-diagram-box]',
      ).length,
      fontSizes,
      inlineDebt: Math.max(0, figure.scrollWidth - figure.clientWidth),
      markedBoxCount: markedBoxes.length,
      maxLocalTravel: Math.max(0, ...localTravel.map(({ debt }) => debt)),
      maxLocalTravelRatio: Math.max(0, ...localTravel.map(({ ratio }) => ratio)),
      problems: [...new Set(problems)],
      scrollerCount: scrollers.length,
      unmarkedBorderOwnerCount: unmarkedBorderOwners.length,
    };
  });
}

function expectCompleteAutoregressiveGeometry(
  geometry: Awaited<ReturnType<typeof readAutoregressiveGeometry>>,
) {
  expect(geometry.markedBoxCount).toBe(115);
  expect(geometry.borderedOwnerCount).toBe(116);
  expect(geometry.unmarkedBorderOwnerCount).toBe(1);
  expect(geometry.scrollerCount).toBe(20);
  expect(geometry.dualRoleTapeCount).toBe(0);
  expect(geometry.cellBoxCount).toBe(100);
  expect(geometry.codeCellCount).toBe(66);
  expect(geometry.emptyCellCount).toBe(34);
  expect(geometry.inlineDebt).toBeLessThanOrEqual(2);
  expect(geometry.alignmentMaxDelta).toBeLessThan(0.75);
  expect(geometry.problems).toEqual([]);
}

function expectBoundedTapeTravel(
  geometry: Awaited<ReturnType<typeof readAutoregressiveGeometry>>,
) {
  expect(geometry.maxLocalTravel).toBeLessThanOrEqual(154);
  expect(geometry.maxLocalTravelRatio).toBeLessThanOrEqual(0.6);
}

function expectFontsNotShrunk(
  inlineGeometry: Awaited<ReturnType<typeof readAutoregressiveGeometry>>,
  fullGeometry: Awaited<ReturnType<typeof readAutoregressiveGeometry>>,
) {
  expect(fullGeometry.fontSizes.map(({ index }) => index)).toEqual(
    inlineGeometry.fontSizes.map(({ index }) => index),
  );
  for (let index = 0; index < fullGeometry.fontSizes.length; index += 1) {
    expect(fullGeometry.fontSizes[index]!.pixels + 0.01).toBeGreaterThanOrEqual(
      inlineGeometry.fontSizes[index]!.pixels,
    );
  }
}

async function staticDiagramMarkup(diagram: Locator) {
  return diagram.evaluate((node) => {
    const clone = node.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll('[data-diagram-full-view-controls]')
      .forEach((control) => control.remove());
    return clone.innerHTML;
  });
}

async function readFullViewComposition(diagram: Locator) {
  return diagram.evaluate((root) => {
    const element = (selector: string) => {
      const match = root.querySelector<HTMLElement>(selector);
      if (!match) throw new Error(`Missing full-view element ${selector}`);
      const style = getComputedStyle(match);
      const rect = match.getBoundingClientRect();
      return {
        placement: {
          columnStart: style.gridColumnStart,
          columnEnd: style.gridColumnEnd,
          rowStart: style.gridRowStart,
          rowEnd: style.gridRowEnd,
        },
        rect: {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        },
      };
    };
    const items = {
      key: element(':scope > [data-consolidated-rule-key]'),
      actions: element(':scope > [data-diagram-full-view-controls]'),
      caption: element(':scope > figcaption'),
      train: element(':scope > [data-partition="train"]'),
      validation: element(':scope > [data-partition="validation"]'),
      test: element(':scope > [data-partition="test"]'),
    };
    const overlaps: string[] = [];
    const entries = Object.entries(items);
    for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
        const [leftName, left] = entries[leftIndex]!;
        const [rightName, right] = entries[rightIndex]!;
        const overlapWidth = Math.min(left.rect.right, right.rect.right) - Math.max(left.rect.left, right.rect.left);
        const overlapHeight = Math.min(left.rect.bottom, right.rect.bottom) - Math.max(left.rect.top, right.rect.top);
        if (overlapWidth > 2 && overlapHeight > 2) {
          overlaps.push(`${leftName} overlaps ${rightName}`);
        }
      }
    }
    return {
      display: getComputedStyle(root).display,
      rootColumns: getComputedStyle(root).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
      items,
      overlaps,
    };
  });
}

function expectFinalFullViewComposition(
  composition: Awaited<ReturnType<typeof readFullViewComposition>>,
) {
  expect(composition.display).toBe('grid');
  expect(composition.rootColumns).toBe(3);
  expect(composition.items.key.placement).toEqual({
    columnStart: '1',
    columnEnd: '3',
    rowStart: '1',
    rowEnd: 'auto',
  });
  expect(composition.items.actions.placement).toEqual({
    columnStart: '3',
    columnEnd: 'auto',
    rowStart: '1',
    rowEnd: 'auto',
  });
  expect(composition.items.caption.placement).toEqual({
    columnStart: '3',
    columnEnd: 'auto',
    rowStart: '2',
    rowEnd: 'auto',
  });
  expect(composition.items.train.placement).toEqual({
    columnStart: '1',
    columnEnd: 'auto',
    rowStart: '2',
    rowEnd: 'span 2',
  });
  expect(composition.items.validation.placement).toEqual({
    columnStart: '2',
    columnEnd: 'auto',
    rowStart: '2',
    rowEnd: 'span 2',
  });
  expect(composition.items.test.placement).toEqual({
    columnStart: '3',
    columnEnd: 'auto',
    rowStart: '3',
    rowEnd: 'auto',
  });
  expect(composition.overlaps).toEqual([]);
}

async function expectChapterContent(
  page: Page,
  locale: ChapterLocale,
  expectedDocumentColumns: number,
  chapters: readonly CourseChapterLink[],
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 5,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.chapterTitle,
  });

  for (const heading of Object.values(localized.headings)) {
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
  }
  const displayedFormula = page.locator('.katex-display');
  await expect(displayedFormula).toHaveCount(1);
  await expect(displayedFormula).toHaveCSS('direction', 'ltr');
  await expect(
    displayedFormula.locator('annotation[encoding="application/x-tex"]'),
  ).toHaveText(formulaLatex);

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(5);
  const highlightedRust = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlightedRust).toHaveCount(5);
  const highlightingEvidence = await highlightedRust.evaluateAll((blocks) =>
    blocks.map((block) => ({
      lineCount: block.querySelectorAll('code > span.line').length,
      tokenColors: [
        ...new Set(
          Array.from(block.querySelectorAll<HTMLElement>('code span[style*="color"]'))
            .map((token) => token.style.color)
            .filter(Boolean),
        ),
      ],
      tabIndex: block.getAttribute('tabindex'),
      label: block.getAttribute('aria-label'),
      direction: block.getAttribute('dir'),
    })),
  );
  for (const evidence of highlightingEvidence) {
    expect(evidence.lineCount).toBeGreaterThan(0);
    expect(evidence.tokenColors.length).toBeGreaterThan(1);
    expect(evidence.tabIndex).toBe('0');
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe('ltr');
  }
  expect(highlightingEvidence[1]?.label).toBe(localized.policyRustLabel);
  expect(
    await highlightedRust.locator('code').evaluateAll((blocks) =>
      blocks.map((block) => block.textContent),
    ),
  ).toEqual(expectedRustSources);
  await expect(rustSources.locator('figcaption span')).toHaveText([...localized.rustCaptions]);
  expect(
    await rustSources.evaluateAll((sources) =>
      sources.map((source) => source.getAttribute('data-source-region')),
    ),
  ).toEqual([
    'hand-labeled-contrast',
    'causal-window-policy',
    'causal-window-iterator',
    'partition-encoding',
    'chapter-output',
  ]);
  await highlightedRust.first().focus();
  await expect(highlightedRust.first()).toBeFocused();

  await expectVisualizationDecision(page, { decision: 'useful', id: 'autoregressive-examples' });
  const diagram = page.locator(diagramSelector);
  await expect(
    diagram.getByRole('heading', { level: 3, name: localized.diagramTitle }),
  ).toBeVisible();
  await expectSummaryFacts(diagram, localized.summaryFacts);
  await expectExactDiagramEvidence(diagram, locale);
  await expectExactTapeRelationships(diagram, locale);
  const geometry = await readAutoregressiveGeometry(diagram);
  expectCompleteAutoregressiveGeometry(geometry);
  expectBoundedTapeTravel(geometry);

  await diagram.focus();
  await expect(diagram).toBeFocused();
  const sourceTape = diagram.locator('.token-tape').first();
  await sourceTape.focus();
  await expect(sourceTape).toBeFocused();
  const columnCount = await diagram.locator('.document-list').first().evaluate((node) =>
    getComputedStyle(node).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
  );
  expect(columnCount).toBe(expectedDocumentColumns);

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await expect(exerciseDetails.locator('summary')).toHaveText(localized.exerciseSummary);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails).toContainText(localized.exerciseAnswer);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

async function expectPartitionsUseFigureWidth(page: Page, maximumInset: number) {
  const geometry = await page.locator(diagramSelector).evaluate((figure) => {
    const figureRect = figure.getBoundingClientRect();
    const partition = figure.querySelector<HTMLElement>(':scope > [data-partition].partition');
    if (!partition) throw new Error('Chapter 5 figure has no partition card.');
    const partitionRect = partition.getBoundingClientRect();
    return {
      figureWidth: figureRect.width,
      partitionWidth: partitionRect.width,
    };
  });
  expect(geometry.figureWidth - geometry.partitionWidth).toBeLessThanOrEqual(maximumInset);
}

test.describe('chapter 5 localized vertical slice', { tag: chapterTag(chapterId) }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(({ browserName }) => {
    if (browserName !== 'firefox') {
      throw new Error(`Chapter 5 browser validation requires Firefox; received ${browserName}.`);
    }
  });

  test('chapter 5 is fifth on every course index and preserves locale switching', async ({ page }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const localeDefinition = chapterLocaleDefinitions.find(({ code }) => code === locale);
      expect(localeDefinition).toBeDefined();
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(5);
      expect(chapters[4]).toEqual(
        expect.objectContaining({ chapterId, order: 5, title: localized.chapterTitle }),
      );
      await expect(page.locator('html')).toHaveAttribute(
        'lang',
        localeDefinition?.languageTag ?? '',
      );
      await expect(
        page.getByRole('heading', { level: 1, name: localized.indexTitle }),
      ).toBeVisible();
      await page.getByRole('link', { name: localized.chapterTitle }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 5,
        revision: contentRevision,
        revisionLabel: localized.revisionLabel,
        title: localized.chapterTitle,
      });
      await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
      await expectNoOverflowOrClientScripts(page);
    }

    for (const source of chapterLocaleDefinitions) {
      for (const target of chapterLocaleDefinitions.filter(({ code }) => code !== source.code)) {
        await page.goto(chapterPath(source.code, chapterId));
        await page.locator(`.locale-switch a[data-locale="${target.code}"]`).click();
        await expect(page).toHaveURL(new RegExp(`${chapterPath(target.code, chapterId)}$`));
        await expect(page.locator('html')).toHaveAttribute('lang', target.languageTag);
        await expect(
          page.getByRole('heading', { level: 1, name: copy[target.code].chapterTitle }),
        ).toBeVisible();
      }
    }
  });

  for (const locale of chapterLocales) {
    test(`chapter 5 ${locale} lesson renders every learning element at desktop and narrow widths`, async ({ page }) => {
      await page.setViewportSize(desktop);
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.goto(chapterPath(locale, chapterId));
      await settle(page);
      await expectChapterContent(page, locale, 2, chapters);
      await expectPartitionsUseFigureWidth(page, 64);

      await page.setViewportSize(narrow);
      await page.reload();
      await settle(page);
      await expectChapterContent(page, locale, 1, chapters);
      await expectPartitionsUseFigureWidth(page, 64);
    });
  }

  test('both localized figures recompose in place within the standard full-view budget', async ({
    page,
    browserName,
  }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize(standardFullView);

    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await page.waitForFunction(
        () => document.documentElement.dataset.diagramFullViewReady === 'true',
      );
      await settle(page);
      const diagram = page.locator(diagramSelector);
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toHaveCount(1);
      await expect(toggle).toBeVisible();
      await expectExactDiagramEvidence(diagram, locale);
      await expectExactTapeRelationships(diagram, locale);
      await expectSummaryFacts(diagram, copy[locale].summaryFacts);
      const inlineGeometry = await readAutoregressiveGeometry(diagram);
      expectCompleteAutoregressiveGeometry(inlineGeometry);
      expectBoundedTapeTravel(inlineGeometry);
      const staticMarkup = await staticDiagramMarkup(diagram);
      await diagram.evaluate((node) => {
        (window as unknown as { __chapter05Figure?: Element }).__chapter05Figure = node;
      });

      await toggle.focus();
      await expect(toggle).toBeFocused();
      await toggle.click();
      await page.waitForFunction(
        () => document.fullscreenElement?.getAttribute('data-visualization-id') === 'autoregressive-examples',
      );
      await settle(page);

      expect(
        await diagram.evaluate(
          (node) => (window as unknown as { __chapter05Figure?: Element }).__chapter05Figure === node,
        ),
      ).toBe(true);
      expect(await staticDiagramMarkup(diagram)).toBe(staticMarkup);
      await expectExactDiagramEvidence(diagram, locale);
      await expectExactTapeRelationships(diagram, locale);
      await expectSummaryFacts(diagram, copy[locale].summaryFacts);
      expectFinalFullViewComposition(await readFullViewComposition(diagram));
      const fullGeometry = await readAutoregressiveGeometry(diagram);
      expectCompleteAutoregressiveGeometry(fullGeometry);
      expectBoundedTapeTravel(fullGeometry);
      expect(fullGeometry.blockDebt).toBeLessThanOrEqual(fullGeometry.blockBudget);
      expectFontsNotShrunk(inlineGeometry, fullGeometry);
      await testInfo.attach(`ch05-${browserName}-${locale}-1280x900.json`, {
        body: JSON.stringify(
          {
            blockBudget20Percent: fullGeometry.blockBudget,
            blockDebt: fullGeometry.blockDebt,
            blockViewport: fullGeometry.blockViewport,
            browserSurface: fullGeometry.browserSurface,
            maxLocalTravel: fullGeometry.maxLocalTravel,
            maxLocalTravelRatio: fullGeometry.maxLocalTravelRatio,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });

      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('the requested 1024 by 576 eligibility surface meets the Firefox full-view contract', async ({
    page,
    browserName,
  }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize(minimumFullView);

    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await page.waitForFunction(
        () => document.documentElement.dataset.diagramFullViewReady === 'true',
      );
      await settle(page);
      const diagram = page.locator(diagramSelector);
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toHaveCount(1);
      await expect(toggle).toBeVisible();
      const inlineGeometry = await readAutoregressiveGeometry(diagram);
      expectCompleteAutoregressiveGeometry(inlineGeometry);
      const staticMarkup = await staticDiagramMarkup(diagram);

      await toggle.click();
      await page.waitForFunction(
        () => document.fullscreenElement?.getAttribute('data-visualization-id') === 'autoregressive-examples',
      );
      await settle(page);
      expect(await staticDiagramMarkup(diagram)).toBe(staticMarkup);
      await expectExactDiagramEvidence(diagram, locale);
      await expectExactTapeRelationships(diagram, locale);
      await expectSummaryFacts(diagram, copy[locale].summaryFacts);
      expectFinalFullViewComposition(await readFullViewComposition(diagram));
      const fullGeometry = await readAutoregressiveGeometry(diagram);
      expectCompleteAutoregressiveGeometry(fullGeometry);
      expectFontsNotShrunk(inlineGeometry, fullGeometry);
      expect({
        height: fullGeometry.browserSurface.screenHeight,
        width: fullGeometry.browserSurface.screenWidth,
      }).toEqual({ height: minimumFullView.height, width: minimumFullView.width });
      expect(fullGeometry.browserSurface.innerWidth).toBeGreaterThan(
        fullGeometry.browserSurface.screenWidth,
      );
      expect(fullGeometry.browserSurface.innerHeight).toBeGreaterThan(
        fullGeometry.browserSurface.screenHeight,
      );
      expect(fullGeometry.browserSurface.innerWidth).toBeGreaterThanOrEqual(1280);
      expect(fullGeometry.browserSurface.innerHeight).toBeGreaterThanOrEqual(768);
      expect(fullGeometry.blockViewport).toBe(
        fullGeometry.browserSurface.innerHeight - 2,
      );
      expect(fullGeometry.blockDebt).toBeLessThanOrEqual(fullGeometry.blockBudget);
      expectBoundedTapeTravel(fullGeometry);
      await testInfo.attach(`ch05-${browserName}-${locale}-1024x576.json`, {
        body: JSON.stringify(
          {
            blockBudget20Percent: fullGeometry.blockBudget,
            blockDebt: fullGeometry.blockDebt,
            blockViewport: fullGeometry.blockViewport,
            browserSurface: fullGeometry.browserSurface,
            maxLocalTravel: fullGeometry.maxLocalTravel,
            maxLocalTravelRatio: fullGeometry.maxLocalTravelRatio,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });

      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('Russian evidence remains explicit in forced colors and synthetic RTL', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize(standardFullView);
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('ru', chapterId));
    await page.waitForFunction(
      () => document.documentElement.dataset.diagramFullViewReady === 'true',
    );
    const diagram = page.locator(diagramSelector);
    await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
    await settle(page);
    await expectExactDiagramEvidence(diagram, 'ru');
    await expectExactTapeRelationships(diagram, 'ru');
    const inlineGeometry = await readAutoregressiveGeometry(diagram);
    expectCompleteAutoregressiveGeometry(inlineGeometry);
    expectBoundedTapeTravel(inlineGeometry);
    const directionEvidence = await diagram.evaluate((root) => ({
      allTechnicalLtr: Array.from(root.querySelectorAll<HTMLElement>('code, bdi')).every(
        (node) => getComputedStyle(node).direction === 'ltr',
      ),
      allTapesLtr: Array.from(
        root.querySelectorAll<HTMLElement>('.token-tape, .aligned-tape, .tail-tape'),
      ).every((node) => getComputedStyle(node).direction === 'ltr'),
      documentCardsRtl: Array.from(root.querySelectorAll<HTMLElement>('article[data-document]')).every(
        (node) => getComputedStyle(node).direction === 'rtl',
      ),
      controlBordersVisible: Array.from(root.querySelectorAll<HTMLElement>('code[data-control]')).every(
        (node) => {
          const style = getComputedStyle(node);
          return (
            style.borderTopStyle !== 'none' &&
            Number.parseFloat(style.borderTopWidth) > 0 &&
            style.borderTopColor === style.color
          );
        },
      ),
    }));
    expect(directionEvidence).toEqual({
      allTechnicalLtr: true,
      allTapesLtr: true,
      documentCardsRtl: true,
      controlBordersVisible: true,
    });

    const toggle = diagram.locator('[data-diagram-full-view-toggle]');
    await toggle.click();
    await page.waitForFunction(
      () => document.fullscreenElement?.getAttribute('data-visualization-id') === 'autoregressive-examples',
    );
    await settle(page);
    expectFinalFullViewComposition(await readFullViewComposition(diagram));
    const fullGeometry = await readAutoregressiveGeometry(diagram);
    expectCompleteAutoregressiveGeometry(fullGeometry);
    expectBoundedTapeTravel(fullGeometry);
    expect(fullGeometry.blockDebt).toBeLessThanOrEqual(fullGeometry.blockBudget);
    expectFontsNotShrunk(inlineGeometry, fullGeometry);
    await expectExactTapeRelationships(diagram, 'ru');

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.fullscreenElement === null);
    await expect(toggle).toBeFocused();
    await expectNoOverflowOrClientScripts(page);
  });

});
