// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertBigramBaselineDiagramLabels,
  bigramBaselineDiagramId,
  parseBigramBaselineTrace,
  type BigramBaselineDiagramLabels,
} from '../src/lib/bigram-baseline-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const fixture = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch06-bigram-baseline/diagram-trace.txt'),
  'utf8',
);
const contract = readFileSync(
  resolve(repositoryRoot, 'curriculum/chapters/06-bigram-baseline.md'),
  'utf8',
);

const englishLabels: BigramBaselineDiagramLabels = {
  title: 'Follow two count rows all the way to probabilities',
  description:
    'The same Rust fixture supplies the separated training documents and both tables. Compare a known context with one missing successor against a context with no outgoing observations at all.',
  summary: {
    vocabularySize: 'Vocabulary size',
    alpha: 'Smoothing amount α',
    trainingDocuments: 'Training documents',
    countedTransitions: 'Transitions counted',
  },
  sections: {
    trainingDocuments: 'Evidence counted inside document boundaries',
    tokenLegend: 'Vocabulary tokens and their roles',
    knownContext: 'Known context: one successor is missing',
    unseenContext: 'Context with no outgoing observations',
    boundaryGuard: 'Transition that must not be counted',
  },
  fields: {
    document: 'Training document',
    context: 'Current token',
    rowTotal: 'Observed row total',
    denominator: 'Smoothed denominator',
  },
  columns: {
    nextToken: 'Next token',
    count: 'Observed count',
    pseudocount: 'Added α',
    smoothedNumerator: 'Cᵢⱼ + α',
    mle: 'MLE probability',
    smoothed: 'Add-α probability',
  },
  values: {
    undefinedMle: 'undefined (row total is zero)',
    boundaryTransition: 'must not transition to',
  },
  roles: {
    boundary: 'document-boundary token',
    content: 'observed content token',
    unseen: 'absent from these training documents',
  },
  notes: {
    countOnce:
      'Every arrow within a document contributes once. No arrow connects the end of one line to the beginning of the next.',
    unseenSuccessor:
      'The A→C count is zero inside a row whose total is three. Its MLE probability is therefore a defined zero; add-one smoothing changes it to 0.125.',
    unseenContext:
      'No transition leaves C, so its row total is zero and an MLE row cannot be normalized. Add-one smoothing imposes a uniform fallback; it does not reveal evidence about C.',
    boundary:
      'Flattening the two documents would insert EOS→BOS between them. Fitting documents separately prevents that fabricated observation.',
  },
};

const russianLabels: BigramBaselineDiagramLabels = {
  title: 'Проследите путь от двух строк чисел переходов к вероятностям',
  description:
    'Документы и обе таблицы получены из одного и того же примера на Rust. Сравните строку A, где не встречался переход A→C, со строкой C, где нет ни одного наблюдавшегося продолжения.',
  summary: {
    vocabularySize: 'Размер словаря',
    alpha: 'Параметр сглаживания α',
    trainingDocuments: 'Документы в обучающей выборке',
    countedTransitions: 'Учтено переходов',
  },
  sections: {
    trainingDocuments: 'Переходы внутри границ документов',
    tokenLegend: 'Токены словаря и их назначение',
    knownContext: 'Строка A: переход A→C не встречался',
    unseenContext: 'Строка C: после C нет наблюдавшихся переходов',
    boundaryGuard: 'Почему переход EOS→BOS не учитывается',
  },
  fields: {
    document: 'Обучающий документ',
    context: 'Текущий токен',
    rowTotal: 'Сумма строки Nᵢ',
    denominator: 'Знаменатель после сглаживания',
  },
  columns: {
    nextToken: 'Следующий токен',
    count: 'Число переходов',
    pseudocount: 'Добавка α',
    smoothedNumerator: 'Cᵢⱼ + α',
    mle: 'Вероятность MLE',
    smoothed: 'После сглаживания',
  },
  values: {
    undefinedMle: 'не определена (сумма строки равна нулю)',
    boundaryTransition: 'не должен переходить в',
  },
  roles: {
    boundary: 'токен границы документа',
    content: 'токен содержимого из обучающих данных',
    unseen: 'есть в словаре, но отсутствует в этих обучающих документах',
  },
  notes: {
    countOnce:
      'Каждая стрелка внутри документа учитывается один раз. Конец одного документа не соединяется с началом следующего.',
    unseenSuccessor:
      'Переход A→C не наблюдался, но сумма строки A равна трём. Поэтому вероятность этого перехода по MLE определена и равна нулю, а после сглаживания с добавлением единицы равна 0.125.',
    unseenContext:
      'После C не наблюдалось ни одного токена: сумма строки равна нулю, и нормировать её методом максимального правдоподобия нельзя. Равномерное распределение после сглаживания задано правилом, а не получено из сведений о C.',
    boundary:
      'При склеивании документов между ними появился бы переход EOS→BOS. Раздельная обработка не даёт принять его за наблюдение.',
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
  source: BigramBaselineDiagramLabels,
  path: readonly string[],
): BigramBaselineDiagramLabels {
  const copy = structuredClone(source) as unknown as Record<string, unknown>;
  let cursor = copy;
  for (const part of path.slice(0, -1)) cursor = cursor[part] as Record<string, unknown>;
  cursor[path.at(-1) ?? ''] = '   ';
  return copy as unknown as BigramBaselineDiagramLabels;
}

describe('bigram-baseline Rust trace parser', () => {
  it('matches the contract ID and parses every exact Rust-authored value', () => {
    expect(bigramBaselineDiagramId).toBe('bigram-baseline');
    expect(contract).toContain(`"id": "${bigramBaselineDiagramId}"`);
    expect(parseBigramBaselineTrace(fixture)).toEqual({
      config: {
        vocabularySize: 5,
        alpha: 1,
        alphaDisplay: '1.000',
        documentCount: 2,
        transitionCount: 7,
      },
      tokens: [
        { id: 0, symbol: 'BOS', role: 'boundary' },
        { id: 1, symbol: 'EOS', role: 'boundary' },
        { id: 2, symbol: 'A', role: 'content' },
        { id: 3, symbol: 'B', role: 'content' },
        { id: 4, symbol: 'C', role: 'unseen' },
      ],
      documents: [
        { id: 'd1', tokens: [0, 2, 2, 3, 1] },
        { id: 'd2', tokens: [0, 2, 3, 1] },
      ],
      rows: [
        {
          context: 2,
          symbol: 'A',
          counts: [0, 0, 1, 2, 0],
          total: 3,
          pseudocount: '1.000',
          numerators: ['1.000', '1.000', '2.000', '3.000', '1.000'],
          denominator: '8',
          mle: ['0.000', '0.000', '0.333', '0.667', '0.000'],
          smoothed: ['0.125', '0.125', '0.250', '0.375', '0.125'],
        },
        {
          context: 4,
          symbol: 'C',
          counts: [0, 0, 0, 0, 0],
          total: 0,
          pseudocount: '1.000',
          numerators: ['1.000', '1.000', '1.000', '1.000', '1.000'],
          denominator: '5',
          mle: null,
          smoothed: ['0.200', '0.200', '0.200', '0.200', '0.200'],
        },
      ],
      boundary: { forbiddenFrom: 1, forbiddenTo: 0 },
    });
  });

  it('requires one ordered block and a valid positive configuration', () => {
    expect(() => parseBigramBaselineTrace(fixture.replace('TRACE bigram-baseline-v2 BEGIN\n', ''))).toThrow(/exactly one ordered/);
    expect(() => parseBigramBaselineTrace(`${fixture}\nTRACE bigram-baseline-v2 BEGIN\nTRACE bigram-baseline-v2 END\n`)).toThrow(/exactly one ordered/);
    expect(() => parseBigramBaselineTrace(mutate('alpha=1.000', 'alpha=0'))).toThrow(/finite positive/);
    expect(() => parseBigramBaselineTrace(mutate('vocabulary=5', 'vocabulary=0'))).toThrow(/nonempty vocabulary/);
    expect(() => parseBigramBaselineTrace(mutate('transitions=7', 'transitions=8'))).toThrow(/transition count disagrees/);
  });

  it('validates token identity, document wrapping, ranges, and unseen roles', () => {
    expect(() => parseBigramBaselineTrace(mutate('TOKEN id=1 symbol=EOS', 'TOKEN id=2 symbol=EOS'))).toThrow(/expected TOKEN 1/);
    expect(() => parseBigramBaselineTrace(mutate('TOKEN id=3 symbol=B', 'TOKEN id=3 symbol=A'))).toThrow(/repeats token symbol/);
    expect(() => parseBigramBaselineTrace(mutate('TOKEN id=0 symbol=BOS role=boundary', 'TOKEN id=0 symbol=BOS role=content'))).toThrow(/BOS and EOS as boundary/);
    expect(() => parseBigramBaselineTrace(mutate('DOCUMENT id=d2 tokens=0,2,3,1', 'DOCUMENT id=d2 tokens=2,2,3,1'))).toThrow(/not wrapped/);
    expect(() => parseBigramBaselineTrace(mutate('DOCUMENT id=d2 tokens=0,2,3,1', 'DOCUMENT id=d2 tokens=0,2,5,1'))).toThrow(/out-of-range/);
    expect(() => parseBigramBaselineTrace(mutate('DOCUMENT id=d2 tokens=0,2,3,1', 'DOCUMENT id=d2 tokens=0,4,3,1'))).toThrow(/marked unseen/);
  });

  it('checks counts, totals, pseudocounts, numerators, and denominators against the documents', () => {
    expect(() => parseBigramBaselineTrace(mutate('counts=0,0,1,2,0', 'counts=0,0,2,1,0'))).toThrow(/disagrees with its training documents/);
    expect(() => parseBigramBaselineTrace(mutate('counts=0,0,1,2,0 total=3', 'counts=0,0,1,2,0 total=4'))).toThrow(/total disagrees/);
    expect(() => parseBigramBaselineTrace(mutate('total=3 pseudocount=1.000', 'total=3 pseudocount=0.500'))).toThrow(/disagrees with alpha/);
    expect(() => parseBigramBaselineTrace(mutate('numerators=1.000,1.000,2.000,3.000,1.000', 'numerators=1.000,1.000,2.000,2.000,1.000'))).toThrow(/numerator 3 disagrees/);
    expect(() => parseBigramBaselineTrace(mutate('denominator=8', 'denominator=7'))).toThrow(/wrong smoothing denominator/);
  });

  it('distinguishes a defined zero from an undefined row and verifies printed probabilities', () => {
    expect(() => parseBigramBaselineTrace(mutate('mle=0.000,0.000,0.333,0.667,0.000', 'mle=undefined'))).toThrow(/omits a defined MLE/);
    expect(() => parseBigramBaselineTrace(mutate('mle=undefined smoothed=0.200', 'mle=0.000,0.000,0.000,0.000,0.000 smoothed=0.200'))).toThrow(/defines MLE without observations/);
    expect(() => parseBigramBaselineTrace(mutate('mle=0.000,0.000,0.333,0.667,0.000', 'mle=0.000,0.000,0.500,0.500,0.000'))).toThrow(/disagrees with its counts/);
    expect(() => parseBigramBaselineTrace(mutate('smoothed=0.125,0.125,0.250,0.375,0.125', 'smoothed=0.125,0.125,0.250,0.250,0.250'))).toThrow(/disagrees with its counts/);
  });

  it('requires the EOS-to-BOS guard and rejects extra or reordered records', () => {
    expect(() => parseBigramBaselineTrace(mutate('BOUNDARY forbidden-from=1 forbidden-to=0', 'BOUNDARY forbidden-from=0 forbidden-to=1'))).toThrow(/forbid EOS-to-BOS/);
    expect(() => parseBigramBaselineTrace(mutate('TRACE bigram-baseline-v2 END', 'UNKNOWN record\nTRACE bigram-baseline-v2 END'))).toThrow(/unknown or reordered/);
    expect(() => parseBigramBaselineTrace(fixture.replace('BOUNDARY forbidden-from=1 forbidden-to=0\n', ''))).toThrow(/missing its exact BOUNDARY/);
  });

  it('validates every locale-owned label leaf', () => {
    expect(() => assertBigramBaselineDiagramLabels(englishLabels)).not.toThrow();
    expect(() => assertBigramBaselineDiagramLabels(russianLabels)).not.toThrow();
    const paths = stringLeafPaths(englishLabels);
    expect(paths).toHaveLength(30);
    for (const path of paths) {
      expect(() => assertBigramBaselineDiagramLabels(blankLabelAt(englishLabels, path))).toThrow(path.join('.'));
    }

    const missingColumns = structuredClone(englishLabels) as unknown as Record<string, unknown>;
    delete missingColumns.columns;
    expect(() =>
      assertBigramBaselineDiagramLabels(
        missingColumns as unknown as BigramBaselineDiagramLabels,
      ),
    ).toThrow(/labels\.columns is missing/);
  });
});

describe('bigram-baseline diagram component contract', () => {
  it('stays semantic, static, responsive, keyboard-readable, and locale-neutral', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/chapters/BigramBaselineDiagram.astro'),
      'utf8',
    );
    expect(source).toContain('<figure');
    expect(source).toContain('<figcaption>');
    expect(source).toContain('<ol class="document-list">');
    expect(source).toContain('<table aria-labelledby={headingId}>');
    expect(source).toContain('<th scope="col">');
    expect(source).toContain('<th scope="row">');
    expect(source).toContain('data-context-id={row.context}');
    expect(source).toContain('data-candidate-id={token.id}');
    expect(source).toContain('data-value="pseudocount"');
    expect(source).toContain('data-value="numerator"');
    expect(source).toContain('data-unseen-successor=');
    expect(source).toContain('tabindex="0"');
    expect(source).toContain('aria-labelledby={titleId}');
    expect(source).toContain('aria-describedby={descriptionId}');
    expect(source).toContain('role="img"');
    expect(source).toContain('dir="ltr"');
    expect(source).toContain('overflow-x: auto');
    expect(source).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(source).toContain('min-width: 35rem');
    expect(source).toContain('table-layout: fixed');
    expect(source).toContain('font-size: 0.9rem');
    expect(source).toContain('border-inline-start');
    expect(source).toContain(':focus-visible');
    expect(source).toContain('@media (forced-colors: active)');
    expect(source).toContain("readFileSync(fixtureUrl, 'utf8')");
    expect(source).toContain('parseBigramBaselineTrace');
    expect(source).not.toContain('Math.random');
    expect(source).not.toContain('<script');
    expect(source).not.toContain('client:');
    for (const localized of [
      englishLabels.title,
      englishLabels.sections.knownContext,
      russianLabels.title,
      russianLabels.sections.knownContext,
    ]) {
      expect(source).not.toContain(localized);
    }
  });
});
