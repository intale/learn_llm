// @ts-ignore Node APIs are available in the Vitest runtime.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Vitest runtime.
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  LanguageModelMetricsTraceError,
  assertLanguageModelMetricsDiagramLabels,
  languageModelMetricsDiagramId,
  parseLanguageModelMetricsTrace,
  type LanguageModelMetricsDiagramLabels,
} from '../src/lib/language-model-metrics-diagram';

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), '..');
const frozenTrace = readFileSync(
  resolve(repositoryRoot, 'rust/demos/ch07-language-model-metrics/diagram-trace.txt'),
  'utf8',
);
const parserSource = readFileSync(
  resolve(process.cwd(), 'src/lib/language-model-metrics-diagram.ts'),
  'utf8',
);
const componentSource = readFileSync(
  resolve(process.cwd(), 'src/components/chapters/LanguageModelMetricsDiagram.astro'),
  'utf8',
);

const completeLabels: LanguageModelMetricsDiagramLabels = {
  title: 'label:title',
  caption: 'label:caption',
  accessibleName: 'label:accessible-name',
  accessibleDescription: 'label:accessible-description',
  sections: {
    calculationChain: 'label:section-calculation-chain',
    frozenModel: 'label:section-frozen-model',
    provenance: 'label:section-provenance',
    boundaries: 'label:section-boundaries',
  },
  stages: {
    probability: 'label:stage-probability',
    surprise: 'label:stage-surprise',
    aggregate: 'label:stage-aggregate',
    meanNll: 'label:stage-mean-nll',
    perplexity: 'label:stage-perplexity',
  },
  columns: {
    targetIndex: 'label:column-target-index',
    probability: 'label:column-probability',
    surprise: 'label:column-surprise',
    partition: 'label:column-partition',
    documents: 'label:column-documents',
    targets: 'label:column-targets',
    totalSurprise: 'label:column-total-surprise',
    meanNll: 'label:column-mean-nll',
    perplexity: 'label:column-perplexity',
  },
  facts: {
    totalSurprise: 'label:fact-total-surprise',
    targetCount: 'label:fact-target-count',
    corpusChecksum: 'label:fact-corpus-checksum',
    splitStrategy: 'label:fact-split-strategy',
    tokenizerLayout: 'label:fact-tokenizer-layout',
    requestedMerges: 'label:fact-requested-merges',
    learnedMerges: 'label:fact-learned-merges',
    vocabulary: 'label:fact-vocabulary',
    alpha: 'label:fact-alpha',
    fittedPartition: 'label:fact-fitted-partition',
    fittedDocuments: 'label:fact-fitted-documents',
    fittedTargets: 'label:fact-fitted-targets',
  },
  partitions: {
    train: 'label:partition-train',
    validation: 'label:partition-validation',
  },
  boundaries: {
    bosContextOnly: 'label:boundary-bos-context-only',
    eosIsTarget: 'label:boundary-eos-is-target',
    documentsSeparate: 'label:boundary-documents-separate',
    testUnavailable: 'label:boundary-test-unavailable',
  },
  notes: {
    frozenModel: 'label:note-frozen-model',
    scrollInstruction: 'label:note-scroll-instruction',
    nextStep: 'label:note-next-step',
  },
};

function mutate(search: string, replacement: string): string {
  const first = frozenTrace.indexOf(search);
  if (first === -1 || frozenTrace.indexOf(search, first + search.length) !== -1) {
    throw new Error(`Mutation anchor must occur exactly once: ${search}`);
  }
  return frozenTrace.replace(search, replacement);
}

function mutateMany(replacements: readonly (readonly [string, string])[]): string {
  let source = frozenTrace;
  for (const [search, replacement] of replacements) {
    const first = source.indexOf(search);
    if (first === -1 || source.indexOf(search, first + search.length) !== -1) {
      throw new Error(`Mutation anchor must occur exactly once: ${search}`);
    }
    source = source.replace(search, replacement);
  }
  return source;
}

function swapScoredRecords(): string {
  const records = frozenTrace.slice(0, -1).split('\n');
  const train = records[6];
  records[6] = records[7];
  records[7] = train;
  return `${records.join('\n')}\n`;
}

function captureTraceError(source: string): LanguageModelMetricsTraceError {
  let caught: unknown;
  try {
    parseLanguageModelMetricsTrace(source);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(LanguageModelMetricsTraceError);
  return caught as LanguageModelMetricsTraceError;
}

function expectTraceError(
  source: string,
  expected: Pick<LanguageModelMetricsTraceError, 'code' | 'line' | 'expectedRecord'>,
): LanguageModelMetricsTraceError {
  const caught = captureTraceError(source);
  expect(caught).toMatchObject(expected);
  return caught;
}

function stringLeafPaths(value: object, prefix: readonly string[] = []): string[][] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = [...prefix, key];
    return typeof child === 'string' ? [path] : stringLeafPaths(child as object, path);
  });
}

function blankLabelAt(
  source: LanguageModelMetricsDiagramLabels,
  path: readonly string[],
): LanguageModelMetricsDiagramLabels {
  const copy = structuredClone(source) as unknown as Record<string, unknown>;
  let cursor = copy;
  for (const part of path.slice(0, -1)) cursor = cursor[part] as Record<string, unknown>;
  cursor[path.at(-1) ?? ''] = '   ';
  return copy as unknown as LanguageModelMetricsDiagramLabels;
}

describe('language-model-metrics Rust trace parser', () => {
  it('projects all exact Rust-authored lexemes and typed values', () => {
    expect(languageModelMetricsDiagramId).toBe('language-model-metrics');
    expect(frozenTrace.endsWith('\n')).toBe(true);

    expect(parseLanguageModelMetricsTrace(frozenTrace)).toEqual({
      fixture: { id: 'tiny', targetCount: { lexeme: '2', value: 2 } },
      targets: [
        {
          index: { lexeme: '0', value: 0 },
          probability: { lexeme: '0.500000000000', value: 0.5 },
          surprise: { lexeme: '0.693147180560', value: 0.69314718056 },
        },
        {
          index: { lexeme: '1', value: 1 },
          probability: { lexeme: '0.250000000000', value: 0.25 },
          surprise: { lexeme: '1.386294361120', value: 1.38629436112 },
        },
      ],
      aggregate: {
        id: 'tiny',
        totalSurprise: { lexeme: '2.079441541680', value: 2.07944154168 },
        targetCount: { lexeme: '2', value: 2 },
        meanNll: { lexeme: '1.039720770840', value: 1.03972077084 },
        perplexity: { lexeme: '2.828427124746', value: 2.828427124746 },
      },
      provenance: {
        corpusChecksum: 'fnv1a64:04786e7303f1dfd6',
        splitStrategy: 'fixed-paired-document-holdout-v1',
        tokenizerLayout: { lexeme: '1', value: 1 },
        requestedMerges: { lexeme: '8', value: 8 },
        learnedMerges: { lexeme: '8', value: 8 },
        vocabulary: { lexeme: '266', value: 266 },
        alpha: { lexeme: '1.000000000000', value: 1 },
        fittedPartition: 'train',
        fittedDocuments: { lexeme: '8', value: 8 },
        fittedTargets: { lexeme: '1844', value: 1844 },
      },
      scored: [
        {
          partition: 'train',
          documents: { lexeme: '8', value: 8 },
          targets: { lexeme: '1844', value: 1844 },
          totalSurprise: { lexeme: '7067.943541648752', value: 7067.943541648752 },
          meanNll: { lexeme: '3.832941183107', value: 3.832941183107 },
          perplexity: { lexeme: '46.198216022322', value: 46.198216022322 },
        },
        {
          partition: 'validation',
          documents: { lexeme: '2', value: 2 },
          targets: { lexeme: '469', value: 469 },
          totalSurprise: { lexeme: '1867.529710185699', value: 1867.529710185699 },
          meanNll: { lexeme: '3.981939680567', value: 3.981939680567 },
          perplexity: { lexeme: '53.620940919077', value: 53.620940919077 },
        },
      ],
      boundary: {
        bosTarget: 'no',
        eosTarget: 'yes',
        crossDocument: 'no',
        testSelectable: 'no',
      },
    });
  });

  it('rejects a missing final LF with exact typed semantics', () => {
    const error = expectTraceError(frozenTrace.slice(0, -1), {
      code: 'terminal-newline',
      line: 10,
      expectedRecord: 'end-of-input',
    });
    expect(error.message).toBe(
      'Language-model metrics trace terminal-newline at line 10 (expected end-of-input): trace must end with exactly one LF.',
    );
  });

  it.each([
    { suffix: '\n', line: 11 },
    { suffix: '\n\n', line: 12 },
  ])('rejects additional terminal LF records with exact typed semantics', ({ suffix, line }) => {
    const error = expectTraceError(`${frozenTrace}${suffix}`, {
      code: 'terminal-newline',
      line,
      expectedRecord: 'end-of-input',
    });
    expect(error.message).toBe(
      `Language-model metrics trace terminal-newline at line ${line} (expected end-of-input): trace must end with exactly one LF; found an additional terminal LF.`,
    );
  });

  it('rejects missing and trailing records before projecting shifted slots', () => {
    const records = frozenTrace.slice(0, -1).split('\n');
    const withoutAggregate = [...records.slice(0, 4), ...records.slice(5)].join('\n') + '\n';
    expectTraceError(withoutAggregate, {
      code: 'line-count',
      line: 10,
      expectedRecord: 'footer',
    });
    expectTraceError(
      mutate(
        'TRACE language-model-metrics-v1 END',
        'UNKNOWN key=value\nTRACE language-model-metrics-v1 END',
      ),
      { code: 'line-count', line: 11, expectedRecord: 'end-of-input' },
    );
  });

  it.each([
    {
      search: 'TRACE language-model-metrics-v1 BEGIN',
      replacement: 'TRACE language-model-metrics-v2 BEGIN',
      code: 'header',
      line: 1,
      expectedRecord: 'header',
    },
    {
      search: 'TRACE language-model-metrics-v1 END',
      replacement: 'TRACE language-model-metrics-v2 END',
      code: 'footer',
      line: 10,
      expectedRecord: 'footer',
    },
  ] as const)(
    'rejects an in-place marker mutation',
    ({ search, replacement, code, line, expectedRecord }) => {
      expectTraceError(mutate(search, replacement), { code, line, expectedRecord });
    },
  );

  it('rejects a record in the wrong slot with a typed order error', () => {
    expectTraceError(mutate('AGGREGATE id=tiny', 'SCORED id=tiny'), {
      code: 'record-order',
      line: 5,
      expectedRecord: 'aggregate',
    });
  });

  it.each([
    {
      name: 'missing fixture key',
      search: 'FIXTURE id=tiny target_count=2',
      replacement: 'FIXTURE id=tiny',
      line: 2,
      expectedRecord: 'fixture',
    },
    {
      name: 'duplicate aggregate key',
      search: 'AGGREGATE id=tiny',
      replacement: 'AGGREGATE id=tiny id=tiny',
      line: 5,
      expectedRecord: 'aggregate',
    },
    {
      name: 'unknown provenance key',
      search: 'PROVENANCE corpus_checksum=',
      replacement: 'PROVENANCE unknown=value corpus_checksum=',
      line: 6,
      expectedRecord: 'provenance',
    },
    {
      name: 'reordered target keys',
      search: 'TARGET index=0 probability=0.500000000000',
      replacement: 'TARGET probability=0.500000000000 index=0',
      line: 3,
      expectedRecord: 'target',
    },
    {
      name: 'additional scored spacing',
      search: 'SCORED partition=train documents=8',
      replacement: 'SCORED partition=train  documents=8',
      line: 7,
      expectedRecord: 'scored',
    },
  ] as const)(
    'rejects malformed $name at the exact record',
    ({ search, replacement, line, expectedRecord }) => {
      expectTraceError(mutate(search, replacement), {
        code: 'record-grammar',
        line,
        expectedRecord,
      });
    },
  );

  it.each([
    {
      name: 'leading-zero integer',
      search: 'SCORED partition=validation documents=2',
      replacement: 'SCORED partition=validation documents=02',
      line: 8,
      expectedRecord: 'scored',
    },
    {
      name: 'unsafe integer',
      search: 'SCORED partition=train documents=8',
      replacement: 'SCORED partition=train documents=9007199254740992',
      line: 7,
      expectedRecord: 'scored',
    },
    {
      name: 'zero documents',
      search: 'SCORED partition=validation documents=2',
      replacement: 'SCORED partition=validation documents=0',
      line: 8,
      expectedRecord: 'scored',
    },
    {
      name: 'wrong decimal precision',
      search: 'probability=0.500000000000',
      replacement: 'probability=0.50000000000',
      line: 3,
      expectedRecord: 'target',
    },
    {
      name: 'exponent decimal',
      search: 'surprise=0.693147180560',
      replacement: 'surprise=6.93147180560e-1',
      line: 3,
      expectedRecord: 'target',
    },
    {
      name: 'NaN decimal',
      search: 'total_surprise=2.079441541680',
      replacement: 'total_surprise=NaN',
      line: 5,
      expectedRecord: 'aggregate',
    },
    {
      name: 'negative decimal',
      search: 'mean_nll=3.981939680567',
      replacement: 'mean_nll=-3.981939680567',
      line: 8,
      expectedRecord: 'scored',
    },
    {
      name: 'probability above one',
      search: 'probability=0.250000000000',
      replacement: 'probability=1.250000000000',
      line: 4,
      expectedRecord: 'target',
    },
    {
      name: 'zero perplexity',
      search: 'perplexity=53.620940919077',
      replacement: 'perplexity=0.000000000000',
      line: 8,
      expectedRecord: 'scored',
    },
  ] as const)(
    'rejects the $name lexeme at its exact record',
    ({ search, replacement, line, expectedRecord }) => {
      expectTraceError(mutate(search, replacement), {
        code: 'numeric-lexeme',
        line,
        expectedRecord,
      });
    },
  );

  it('projects grammar-valid unrelated metric lexemes without deriving relationships', () => {
    const unrelated = mutateMany([
      ['probability=0.500000000000', 'probability=0.600000000000'],
      ['surprise=0.693147180560', 'surprise=9.000000000001'],
      ['total_surprise=2.079441541680', 'total_surprise=7.000000000002'],
      ['mean_nll=1.039720770840', 'mean_nll=6.000000000003'],
      ['perplexity=2.828427124746', 'perplexity=5.000000000004'],
      ['total_surprise=7067.943541648752', 'total_surprise=4.000000000005'],
      ['mean_nll=3.832941183107', 'mean_nll=3.000000000006'],
      ['perplexity=46.198216022322', 'perplexity=2.000000000007'],
    ]);
    const trace = parseLanguageModelMetricsTrace(unrelated);

    expect(trace.targets[0].probability.lexeme).toBe('0.600000000000');
    expect(trace.targets[0].surprise.lexeme).toBe('9.000000000001');
    expect([
      trace.aggregate.totalSurprise.lexeme,
      trace.aggregate.meanNll.lexeme,
      trace.aggregate.perplexity.lexeme,
    ]).toEqual(['7.000000000002', '6.000000000003', '5.000000000004']);
    expect([
      trace.scored[0].totalSurprise.lexeme,
      trace.scored[0].meanNll.lexeme,
      trace.scored[0].perplexity.lexeme,
    ]).toEqual(['4.000000000005', '3.000000000006', '2.000000000007']);
  });

  it.each([
    {
      name: 'fixture ID',
      search: 'FIXTURE id=tiny target_count=2',
      replacement: 'FIXTURE id=other target_count=2',
      line: 2,
      expectedRecord: 'fixture',
    },
    {
      name: 'fixture target count',
      search: 'FIXTURE id=tiny target_count=2',
      replacement: 'FIXTURE id=tiny target_count=3',
      line: 2,
      expectedRecord: 'fixture',
    },
    {
      name: 'first target index',
      search: 'TARGET index=0 probability=',
      replacement: 'TARGET index=2 probability=',
      line: 3,
      expectedRecord: 'target',
    },
    {
      name: 'second target index',
      search: 'TARGET index=1 probability=',
      replacement: 'TARGET index=0 probability=',
      line: 4,
      expectedRecord: 'target',
    },
    {
      name: 'aggregate identity',
      search: 'AGGREGATE id=tiny',
      replacement: 'AGGREGATE id=other',
      line: 5,
      expectedRecord: 'aggregate',
    },
    {
      name: 'aggregate target count',
      search: 'target_count=2 mean_nll=',
      replacement: 'target_count=3 mean_nll=',
      line: 5,
      expectedRecord: 'aggregate',
    },
    {
      name: 'corpus checksum',
      search: 'corpus_checksum=fnv1a64:04786e7303f1dfd6',
      replacement: 'corpus_checksum=fnv1a64:14786e7303f1dfd6',
      line: 6,
      expectedRecord: 'provenance',
    },
    {
      name: 'split strategy',
      search: 'split_strategy=fixed-paired-document-holdout-v1',
      replacement: 'split_strategy=fixed-paired-document-holdout-v2',
      line: 6,
      expectedRecord: 'provenance',
    },
    {
      name: 'tokenizer layout',
      search: 'tokenizer_layout=1',
      replacement: 'tokenizer_layout=2',
      line: 6,
      expectedRecord: 'provenance',
    },
    {
      name: 'requested merges',
      search: 'requested_merges=8',
      replacement: 'requested_merges=9',
      line: 6,
      expectedRecord: 'provenance',
    },
    {
      name: 'learned merges',
      search: 'learned_merges=8',
      replacement: 'learned_merges=7',
      line: 6,
      expectedRecord: 'provenance',
    },
    {
      name: 'vocabulary',
      search: 'vocabulary=266',
      replacement: 'vocabulary=267',
      line: 6,
      expectedRecord: 'provenance',
    },
    {
      name: 'alpha',
      search: 'alpha=1.000000000000',
      replacement: 'alpha=2.000000000000',
      line: 6,
      expectedRecord: 'provenance',
    },
    {
      name: 'fitted partition',
      search: 'fitted_partition=train',
      replacement: 'fitted_partition=validation',
      line: 6,
      expectedRecord: 'provenance',
    },
    {
      name: 'fitted document count',
      search: 'fitted_documents=8',
      replacement: 'fitted_documents=9',
      line: 6,
      expectedRecord: 'provenance',
    },
    {
      name: 'fitted target count',
      search: 'fitted_targets=1844',
      replacement: 'fitted_targets=1845',
      line: 6,
      expectedRecord: 'provenance',
    },
    {
      name: 'test partition',
      search: 'SCORED partition=validation',
      replacement: 'SCORED partition=test',
      line: 8,
      expectedRecord: 'scored',
    },
    {
      name: 'BOS target flag',
      search: 'bos_target=no',
      replacement: 'bos_target=yes',
      line: 9,
      expectedRecord: 'boundary',
    },
    {
      name: 'EOS target flag',
      search: 'eos_target=yes',
      replacement: 'eos_target=no',
      line: 9,
      expectedRecord: 'boundary',
    },
    {
      name: 'cross-document flag',
      search: 'cross_document=no',
      replacement: 'cross_document=yes',
      line: 9,
      expectedRecord: 'boundary',
    },
    {
      name: 'test-selectable flag',
      search: 'test_selectable=no',
      replacement: 'test_selectable=yes',
      line: 9,
      expectedRecord: 'boundary',
    },
  ] as const)(
    'rejects changed frozen $name evidence',
    ({ search, replacement, line, expectedRecord }) => {
      expectTraceError(mutate(search, replacement), {
        code: 'constant',
        line,
        expectedRecord,
      });
    },
  );

  it('rejects duplicate and validation-before-train partition order', () => {
    expectTraceError(
      mutate('SCORED partition=validation', 'SCORED partition=train'),
      { code: 'constant', line: 8, expectedRecord: 'scored' },
    );
    expectTraceError(swapScoredRecords(), {
      code: 'constant',
      line: 7,
      expectedRecord: 'scored',
    });
  });

  it('is a locale-neutral projection with no metric or model implementation', () => {
    expect(parserSource).toContain(
      '/** Validates and projects Rust-authored evidence without recomputing any metric. */',
    );
    expect(parserSource).not.toMatch(/\bMath\.(?:log|exp|pow)\s*\(/);
    expect(parserSource).not.toMatch(/\.reduce\s*\(/);
    expect(parserSource).not.toMatch(/(?:^|[^\w$.])eval\s*\(/m);
    expect(parserSource).not.toMatch(/(?:^|[^\w$.])(?:new\s+)?Function\s*\(/m);
    expect(parserSource).not.toMatch(/(?:^\s*import(?:\s|\{|\*)|(?:^|[^\w$.])import\s*\()/m);
    expect(parserSource).not.toMatch(/\bbigram\b/i);

    const frozenMetricLexemes = [
      '0.500000000000',
      '0.693147180560',
      '0.250000000000',
      '1.386294361120',
      '2.079441541680',
      '1.039720770840',
      '2.828427124746',
      '7067.943541648752',
      '3.832941183107',
      '46.198216022322',
      '1867.529710185699',
      '3.981939680567',
      '53.620940919077',
    ] as const;
    for (const lexeme of frozenMetricLexemes) expect(parserSource).not.toContain(lexeme);
  });
});

describe('language-model-metrics locale-owned labels', () => {
  it('requires every visible and accessible label leaf to be nonblank', () => {
    expect(() => assertLanguageModelMetricsDiagramLabels(completeLabels)).not.toThrow();
    const paths = stringLeafPaths(completeLabels);
    expect(paths).toHaveLength(43);
    for (const path of paths) {
      expect(() =>
        assertLanguageModelMetricsDiagramLabels(blankLabelAt(completeLabels, path)),
      ).toThrow(path.join('.'));
    }
  });

  it('fails closed for a missing group or a non-object group', () => {
    const missingSections = structuredClone(completeLabels) as unknown as Record<string, unknown>;
    delete missingSections.sections;
    expect(() =>
      assertLanguageModelMetricsDiagramLabels(
        missingSections as unknown as LanguageModelMetricsDiagramLabels,
      ),
    ).toThrow(/labels\.sections is missing/);

    const invalidNotes = structuredClone(completeLabels) as unknown as Record<string, unknown>;
    invalidNotes.notes = 'not-an-object';
    expect(() =>
      assertLanguageModelMetricsDiagramLabels(
        invalidNotes as unknown as LanguageModelMetricsDiagramLabels,
      ),
    ).toThrow(/label group labels\.notes must be an object/i);
  });
});

describe('language-model-metrics diagram component contract', () => {
  it('reads and parses the exact Rust fixture only during static generation', () => {
    expect(componentSource).toContain("import { readFileSync } from 'node:fs'");
    expect(componentSource).toContain(
      "'../../../../rust/demos/ch07-language-model-metrics/diagram-trace.txt'",
    );
    expect(componentSource).toContain("readFileSync(fixtureUrl, 'utf8')");
    expect(componentSource).toContain('parseLanguageModelMetricsTrace');
    expect(componentSource).toContain('assertLanguageModelMetricsDiagramLabels(labels)');
    expect(componentSource).not.toContain('fetch(');
    expect(componentSource).not.toContain('Math.random');
    expect(componentSource).not.toContain('<script');
    expect(componentSource).not.toContain('client:');
  });

  it('renders the five-stage causal chain from preserved trace lexemes', () => {
    expect(componentSource).toContain('data-stage="probability-surprise"');
    expect(componentSource).toContain('data-stage-number="1"');
    expect(componentSource).toContain('data-stage-number="2"');
    expect(componentSource).toContain('data-stage="aggregate"');
    expect(componentSource).toContain('data-stage="mean-nll"');
    expect(componentSource).toContain('data-stage="perplexity"');
    expect(componentSource).toContain('target.probability.lexeme');
    expect(componentSource).toContain('target.surprise.lexeme');
    expect(componentSource).toContain('trace.aggregate.totalSurprise.lexeme');
    expect(componentSource).toContain('trace.aggregate.targetCount.lexeme');
    expect(componentSource).toContain('trace.aggregate.meanNll.lexeme');
    expect(componentSource).toContain('trace.aggregate.perplexity.lexeme');
    expect(componentSource).not.toMatch(/\.value\b/);
    expect(componentSource).not.toMatch(/\bMath\.(?:log|exp|pow)\s*\(/);
    expect(componentSource).not.toMatch(/\.reduce\s*\(/);
  });

  it('exposes frozen provenance, train then validation, and boundary evidence', () => {
    expect(componentSource).toContain('trace.provenance.corpusChecksum');
    expect(componentSource).toContain('trace.provenance.fittedPartition');
    expect(componentSource).toContain('trace.provenance.fittedDocuments.lexeme');
    expect(componentSource).toContain('trace.provenance.fittedTargets.lexeme');
    expect(componentSource).toContain('trace.scored.map((score)');
    expect(componentSource).toContain('labels.partitions[score.partition]');
    expect(componentSource).toContain('data-scored-partition={score.partition}');
    expect(componentSource).toContain('labels.boundaries.bosContextOnly');
    expect(componentSource).toContain('labels.boundaries.eosIsTarget');
    expect(componentSource).toContain('labels.boundaries.documentsSeparate');
    expect(componentSource).toContain('labels.boundaries.testUnavailable');
    expect(componentSource).toContain('test_selectable={trace.boundary.testSelectable}');
  });

  it('uses semantic, accessible, responsive, and forced-colors-safe markup', () => {
    expect(componentSource).toContain('<figure');
    expect(componentSource).toContain('<figcaption>');
    expect(componentSource).toContain('<section');
    expect(componentSource).toContain('<table>');
    expect(componentSource).toContain('<table aria-labelledby={scoreTableTitleId}>');
    expect(componentSource).toContain('<caption>');
    expect(componentSource).toContain('<th scope="col"');
    expect(componentSource).toContain('<th scope="row"');
    expect(componentSource).toContain('<dl>');
    expect(componentSource).toContain('<ul>');
    expect(componentSource).toContain('tabindex="0"');
    expect(componentSource).toContain('role="region"');
    expect(componentSource).toContain('aria-labelledby={accessibleNameId}');
    expect(componentSource).toContain('aria-describedby={accessibleDescriptionId}');
    expect(componentSource).toContain('dir="ltr"');
    expect(componentSource).toContain('overflow-x: auto');
    expect(componentSource).toContain('inline-size: max-content');
    expect(componentSource).toContain('min-inline-size: 100%');
    expect(componentSource).toContain(':focus-visible');
    expect(componentSource).toContain('border-style: double');
    expect(componentSource).toContain('border-style: dashed');
    expect(componentSource).toContain('border-inline-start');
    expect(componentSource).toContain('@media (max-width: 42rem)');
    expect(componentSource).toContain('@media (forced-colors: active)');
  });

  it('keeps causal progression and arrow direction coherent in RTL locales', () => {
    const stagePositions = [
      'data-stage="probability-surprise"',
      'data-stage="aggregate"',
      'data-stage="mean-nll"',
      'data-stage="perplexity"',
    ].map((marker) => componentSource.indexOf(marker));
    expect(stagePositions.every((position) => position >= 0)).toBe(true);
    expect(stagePositions).toEqual([...stagePositions].sort((left, right) => left - right));

    const causalArrows = componentSource.match(
      /<span class="[^"]*\bcausal-arrow\b[^"]*" aria-hidden="true">→<\/span>/g,
    );
    expect(causalArrows).toHaveLength(4);
    expect(componentSource).toContain('.metrics-diagram:dir(rtl) .causal-arrow');
    expect(componentSource).toContain('transform: scaleX(-1)');
    expect(componentSource).not.toContain('<div class="calculation-chain" dir="ltr">');
    expect(componentSource).not.toContain('class="metrics-diagram"\n  dir="ltr"');
  });

  it('contains no hardcoded learner-visible English or Russian teaching labels', () => {
    for (const localizedText of [
      'Assigned target probability',
      'Mean negative log-likelihood',
      'Frozen model evaluation',
      'Вероятность целевого токена по модели',
      'Среднее значение NLL',
      'Оценка зафиксированной модели',
    ]) {
      expect(componentSource).not.toContain(localizedText);
    }
    expect(componentSource).toContain('{labels.title}');
    expect(componentSource).toContain('{labels.caption}');
    expect(componentSource).toContain('{labels.accessibleName}');
    expect(componentSource).toContain('{labels.accessibleDescription}');
  });
});
