export const languageModelMetricsDiagramId = 'language-model-metrics';

export interface LanguageModelMetricsNumericLexeme {
  readonly lexeme: string;
  readonly value: number;
}

export interface LanguageModelMetricsFixture {
  readonly id: 'tiny';
  readonly targetCount: LanguageModelMetricsNumericLexeme;
}

export interface LanguageModelMetricsTarget {
  readonly index: LanguageModelMetricsNumericLexeme;
  readonly probability: LanguageModelMetricsNumericLexeme;
  readonly surprise: LanguageModelMetricsNumericLexeme;
}

export interface LanguageModelMetricsAggregate {
  readonly id: 'tiny';
  readonly totalSurprise: LanguageModelMetricsNumericLexeme;
  readonly targetCount: LanguageModelMetricsNumericLexeme;
  readonly meanNll: LanguageModelMetricsNumericLexeme;
  readonly perplexity: LanguageModelMetricsNumericLexeme;
}

export interface LanguageModelMetricsProvenance {
  readonly corpusChecksum: 'fnv1a64:04786e7303f1dfd6';
  readonly splitStrategy: 'fixed-paired-document-holdout-v1';
  readonly tokenizerLayout: LanguageModelMetricsNumericLexeme;
  readonly requestedMerges: LanguageModelMetricsNumericLexeme;
  readonly learnedMerges: LanguageModelMetricsNumericLexeme;
  readonly vocabulary: LanguageModelMetricsNumericLexeme;
  readonly alpha: LanguageModelMetricsNumericLexeme;
  readonly fittedPartition: 'train';
  readonly fittedDocuments: LanguageModelMetricsNumericLexeme;
  readonly fittedTargets: LanguageModelMetricsNumericLexeme;
}

export type LanguageModelMetricsScoredPartitionName = 'train' | 'validation';

export interface LanguageModelMetricsScoredPartition {
  readonly partition: LanguageModelMetricsScoredPartitionName;
  readonly documents: LanguageModelMetricsNumericLexeme;
  readonly targets: LanguageModelMetricsNumericLexeme;
  readonly totalSurprise: LanguageModelMetricsNumericLexeme;
  readonly meanNll: LanguageModelMetricsNumericLexeme;
  readonly perplexity: LanguageModelMetricsNumericLexeme;
}

export interface LanguageModelMetricsBoundaryEvidence {
  readonly bosTarget: 'no';
  readonly eosTarget: 'yes';
  readonly crossDocument: 'no';
  readonly testSelectable: 'no';
}

export interface LanguageModelMetricsTrace {
  readonly fixture: LanguageModelMetricsFixture;
  readonly targets: readonly [LanguageModelMetricsTarget, LanguageModelMetricsTarget];
  readonly aggregate: LanguageModelMetricsAggregate;
  readonly provenance: LanguageModelMetricsProvenance;
  readonly scored: readonly [
    LanguageModelMetricsScoredPartition,
    LanguageModelMetricsScoredPartition,
  ];
  readonly boundary: LanguageModelMetricsBoundaryEvidence;
}

export interface LanguageModelMetricsDiagramLabels {
  readonly title: string;
  readonly caption: string;
  readonly accessibleName: string;
  readonly accessibleDescription: string;
  readonly sections: Readonly<{
    calculationChain: string;
    frozenModel: string;
    provenance: string;
    boundaries: string;
  }>;
  readonly stages: Readonly<{
    probability: string;
    surprise: string;
    aggregate: string;
    meanNll: string;
    perplexity: string;
  }>;
  readonly columns: Readonly<{
    targetIndex: string;
    probability: string;
    surprise: string;
    partition: string;
    documents: string;
    targets: string;
    totalSurprise: string;
    meanNll: string;
    perplexity: string;
  }>;
  readonly facts: Readonly<{
    totalSurprise: string;
    targetCount: string;
    corpusChecksum: string;
    splitStrategy: string;
    tokenizerLayout: string;
    requestedMerges: string;
    learnedMerges: string;
    vocabulary: string;
    alpha: string;
    fittedPartition: string;
    fittedDocuments: string;
    fittedTargets: string;
  }>;
  readonly partitions: Readonly<{
    train: string;
    validation: string;
  }>;
  readonly boundaries: Readonly<{
    bosContextOnly: string;
    eosIsTarget: string;
    documentsSeparate: string;
    testUnavailable: string;
  }>;
  readonly notes: Readonly<{
    frozenModel: string;
    scrollInstruction: string;
    nextStep: string;
  }>;
}

export type LanguageModelMetricsTraceRecord =
  | 'header'
  | 'fixture'
  | 'target'
  | 'aggregate'
  | 'provenance'
  | 'scored'
  | 'boundary'
  | 'footer'
  | 'end-of-input';

export type LanguageModelMetricsTraceErrorCode =
  | 'terminal-newline'
  | 'line-count'
  | 'header'
  | 'footer'
  | 'record-order'
  | 'record-grammar'
  | 'numeric-lexeme'
  | 'constant';

export class LanguageModelMetricsTraceError extends Error {
  override readonly name = 'LanguageModelMetricsTraceError';

  constructor(
    readonly code: LanguageModelMetricsTraceErrorCode,
    readonly line: number,
    readonly expectedRecord: LanguageModelMetricsTraceRecord,
    detail: string,
  ) {
    super(
      `Language-model metrics trace ${code} at line ${line} ` +
        `(expected ${expectedRecord}): ${detail}`,
    );
  }
}

const header = 'TRACE language-model-metrics-v1 BEGIN';
const footer = 'TRACE language-model-metrics-v1 END';
const exactRecordCount = 10;
const integerPattern = /^(?:0|[1-9][0-9]*)$/;
const fixedDecimalPattern = /^(?:0|[1-9][0-9]*)\.[0-9]{12}$/;
const fixturePattern = /^FIXTURE id=([^ ]+) target_count=([^ ]+)$/;
const targetPattern = /^TARGET index=([^ ]+) probability=([^ ]+) surprise=([^ ]+)$/;
const aggregatePattern =
  /^AGGREGATE id=([^ ]+) total_surprise=([^ ]+) target_count=([^ ]+) mean_nll=([^ ]+) perplexity=([^ ]+)$/;
const provenancePattern =
  /^PROVENANCE corpus_checksum=([^ ]+) split_strategy=([^ ]+) tokenizer_layout=([^ ]+) requested_merges=([^ ]+) learned_merges=([^ ]+) vocabulary=([^ ]+) alpha=([^ ]+) fitted_partition=([^ ]+) fitted_documents=([^ ]+) fitted_targets=([^ ]+)$/;
const scoredPattern =
  /^SCORED partition=([^ ]+) documents=([^ ]+) targets=([^ ]+) total_surprise=([^ ]+) mean_nll=([^ ]+) perplexity=([^ ]+)$/;
const boundaryLine =
  'BOUNDARY bos_target=no eos_target=yes cross_document=no test_selectable=no';

function fail(
  code: LanguageModelMetricsTraceErrorCode,
  line: number,
  expectedRecord: LanguageModelMetricsTraceRecord,
  detail: string,
): never {
  throw new LanguageModelMetricsTraceError(code, line, expectedRecord, detail);
}

function matchRecord(
  lineText: string,
  line: number,
  expectedRecord: LanguageModelMetricsTraceRecord,
  prefix: string,
  pattern: RegExp,
): RegExpMatchArray {
  if (!lineText.startsWith(prefix)) {
    fail('record-order', line, expectedRecord, `found ${JSON.stringify(lineText)}.`);
  }
  const match = lineText.match(pattern);
  if (!match) {
    fail('record-grammar', line, expectedRecord, 'fields or spacing do not match the grammar.');
  }
  return match;
}

function integerLexeme(
  lexeme: string,
  line: number,
  expectedRecord: LanguageModelMetricsTraceRecord,
  field: string,
): LanguageModelMetricsNumericLexeme {
  if (!integerPattern.test(lexeme)) {
    fail('numeric-lexeme', line, expectedRecord, `${field} is not a canonical integer.`);
  }
  const value = Number(lexeme);
  if (!Number.isSafeInteger(value)) {
    fail('numeric-lexeme', line, expectedRecord, `${field} exceeds the safe integer range.`);
  }
  return { lexeme, value };
}

function positiveIntegerLexeme(
  lexeme: string,
  line: number,
  expectedRecord: LanguageModelMetricsTraceRecord,
  field: string,
): LanguageModelMetricsNumericLexeme {
  const parsed = integerLexeme(lexeme, line, expectedRecord, field);
  if (parsed.value === 0) {
    fail('numeric-lexeme', line, expectedRecord, `${field} must be positive.`);
  }
  return parsed;
}

function fixedDecimalLexeme(
  lexeme: string,
  line: number,
  expectedRecord: LanguageModelMetricsTraceRecord,
  field: string,
  bounds: Readonly<{ maximum?: number; positive?: boolean }> = {},
): LanguageModelMetricsNumericLexeme {
  if (!fixedDecimalPattern.test(lexeme)) {
    fail('numeric-lexeme', line, expectedRecord, `${field} is not a canonical 12-place decimal.`);
  }
  const value = Number(lexeme);
  if (!Number.isFinite(value)) {
    fail('numeric-lexeme', line, expectedRecord, `${field} is not finite.`);
  }
  if (bounds.positive && value === 0) {
    fail('numeric-lexeme', line, expectedRecord, `${field} must be positive.`);
  }
  if (bounds.maximum !== undefined && value > bounds.maximum) {
    fail('numeric-lexeme', line, expectedRecord, `${field} exceeds ${bounds.maximum}.`);
  }
  return { lexeme, value };
}

function requireConstant(
  actual: string,
  expected: string,
  line: number,
  expectedRecord: LanguageModelMetricsTraceRecord,
  field: string,
): void {
  if (actual !== expected) {
    fail('constant', line, expectedRecord, `${field} must be ${JSON.stringify(expected)}.`);
  }
}

function parseTarget(
  lineText: string,
  line: number,
  expectedIndex: '0' | '1',
): LanguageModelMetricsTarget {
  const match = matchRecord(lineText, line, 'target', 'TARGET ', targetPattern);
  requireConstant(match[1], expectedIndex, line, 'target', 'index');
  return {
    index: integerLexeme(match[1], line, 'target', 'index'),
    probability: fixedDecimalLexeme(match[2], line, 'target', 'probability', { maximum: 1 }),
    surprise: fixedDecimalLexeme(match[3], line, 'target', 'surprise'),
  };
}

function parseScoredPartition(
  lineText: string,
  line: number,
  expectedPartition: LanguageModelMetricsScoredPartitionName,
): LanguageModelMetricsScoredPartition {
  const match = matchRecord(lineText, line, 'scored', 'SCORED ', scoredPattern);
  requireConstant(match[1], expectedPartition, line, 'scored', 'partition');
  return {
    partition: expectedPartition,
    documents: positiveIntegerLexeme(match[2], line, 'scored', 'documents'),
    targets: positiveIntegerLexeme(match[3], line, 'scored', 'targets'),
    totalSurprise: fixedDecimalLexeme(match[4], line, 'scored', 'total_surprise'),
    meanNll: fixedDecimalLexeme(match[5], line, 'scored', 'mean_nll'),
    perplexity: fixedDecimalLexeme(match[6], line, 'scored', 'perplexity', { positive: true }),
  };
}

/** Validates and projects Rust-authored evidence without recomputing any metric. */
export function parseLanguageModelMetricsTrace(stdout: string): LanguageModelMetricsTrace {
  if (!stdout.endsWith('\n')) {
    const line = stdout.length === 0 ? 1 : stdout.split('\n').length;
    fail(
      'terminal-newline',
      line,
      'end-of-input',
      'trace must end with exactly one LF.',
    );
  }

  const source = stdout.slice(0, -1);
  if (source.endsWith('\n')) {
    fail(
      'terminal-newline',
      source.split('\n').length,
      'end-of-input',
      'trace must end with exactly one LF; found an additional terminal LF.',
    );
  }

  const lines = source.split('\n');
  if (lines.length !== exactRecordCount) {
    const line = lines.length < exactRecordCount ? lines.length + 1 : exactRecordCount + 1;
    const expectedRecord = lines.length < exactRecordCount ? 'footer' : 'end-of-input';
    fail(
      'line-count',
      line,
      expectedRecord,
      `found ${lines.length} records, not ${exactRecordCount}.`,
    );
  }
  if (lines[0] !== header) fail('header', 1, 'header', 'header marker is not exact.');
  if (lines[9] !== footer) fail('footer', 10, 'footer', 'footer marker is not exact.');

  const fixtureMatch = matchRecord(lines[1], 2, 'fixture', 'FIXTURE ', fixturePattern);
  requireConstant(fixtureMatch[1], 'tiny', 2, 'fixture', 'id');
  requireConstant(fixtureMatch[2], '2', 2, 'fixture', 'target_count');
  const fixture: LanguageModelMetricsFixture = {
    id: 'tiny',
    targetCount: integerLexeme(fixtureMatch[2], 2, 'fixture', 'target_count'),
  };

  const targets = [parseTarget(lines[2], 3, '0'), parseTarget(lines[3], 4, '1')] as const;

  const aggregateMatch = matchRecord(
    lines[4],
    5,
    'aggregate',
    'AGGREGATE ',
    aggregatePattern,
  );
  requireConstant(aggregateMatch[1], 'tiny', 5, 'aggregate', 'id');
  requireConstant(aggregateMatch[3], '2', 5, 'aggregate', 'target_count');
  const aggregate: LanguageModelMetricsAggregate = {
    id: 'tiny',
    totalSurprise: fixedDecimalLexeme(
      aggregateMatch[2],
      5,
      'aggregate',
      'total_surprise',
    ),
    targetCount: integerLexeme(aggregateMatch[3], 5, 'aggregate', 'target_count'),
    meanNll: fixedDecimalLexeme(aggregateMatch[4], 5, 'aggregate', 'mean_nll'),
    perplexity: fixedDecimalLexeme(aggregateMatch[5], 5, 'aggregate', 'perplexity', {
      positive: true,
    }),
  };

  const provenanceMatch = matchRecord(
    lines[5],
    6,
    'provenance',
    'PROVENANCE ',
    provenancePattern,
  );
  const provenanceConstants = [
    'fnv1a64:04786e7303f1dfd6',
    'fixed-paired-document-holdout-v1',
    '1',
    '8',
    '8',
    '266',
    '1.000000000000',
    'train',
    '8',
    '1844',
  ] as const;
  const provenanceFields = [
    'corpus_checksum',
    'split_strategy',
    'tokenizer_layout',
    'requested_merges',
    'learned_merges',
    'vocabulary',
    'alpha',
    'fitted_partition',
    'fitted_documents',
    'fitted_targets',
  ] as const;
  provenanceConstants.forEach((expected, index) => {
    requireConstant(
      provenanceMatch[index + 1],
      expected,
      6,
      'provenance',
      provenanceFields[index],
    );
  });
  const provenance: LanguageModelMetricsProvenance = {
    corpusChecksum: 'fnv1a64:04786e7303f1dfd6',
    splitStrategy: 'fixed-paired-document-holdout-v1',
    tokenizerLayout: integerLexeme(provenanceMatch[3], 6, 'provenance', 'tokenizer_layout'),
    requestedMerges: integerLexeme(provenanceMatch[4], 6, 'provenance', 'requested_merges'),
    learnedMerges: integerLexeme(provenanceMatch[5], 6, 'provenance', 'learned_merges'),
    vocabulary: integerLexeme(provenanceMatch[6], 6, 'provenance', 'vocabulary'),
    alpha: fixedDecimalLexeme(provenanceMatch[7], 6, 'provenance', 'alpha', {
      positive: true,
    }),
    fittedPartition: 'train',
    fittedDocuments: integerLexeme(
      provenanceMatch[9],
      6,
      'provenance',
      'fitted_documents',
    ),
    fittedTargets: integerLexeme(
      provenanceMatch[10],
      6,
      'provenance',
      'fitted_targets',
    ),
  };

  const scored = [
    parseScoredPartition(lines[6], 7, 'train'),
    parseScoredPartition(lines[7], 8, 'validation'),
  ] as const;

  if (lines[8] !== boundaryLine) {
    if (!lines[8].startsWith('BOUNDARY ')) {
      fail('record-order', 9, 'boundary', `found ${JSON.stringify(lines[8])}.`);
    }
    fail('constant', 9, 'boundary', 'boundary flags are not exact.');
  }

  return {
    fixture,
    targets,
    aggregate,
    provenance,
    scored,
    boundary: {
      bosTarget: 'no',
      eosTarget: 'yes',
      crossDocument: 'no',
      testSelectable: 'no',
    },
  };
}

interface RequiredLabelGroup {
  readonly [key: string]: true | RequiredLabelGroup;
}

type RequiredLabelShape = true | RequiredLabelGroup;

const requiredLabelShape: RequiredLabelShape = {
  title: true,
  caption: true,
  accessibleName: true,
  accessibleDescription: true,
  sections: {
    calculationChain: true,
    frozenModel: true,
    provenance: true,
    boundaries: true,
  },
  stages: {
    probability: true,
    surprise: true,
    aggregate: true,
    meanNll: true,
    perplexity: true,
  },
  columns: {
    targetIndex: true,
    probability: true,
    surprise: true,
    partition: true,
    documents: true,
    targets: true,
    totalSurprise: true,
    meanNll: true,
    perplexity: true,
  },
  facts: {
    totalSurprise: true,
    targetCount: true,
    corpusChecksum: true,
    splitStrategy: true,
    tokenizerLayout: true,
    requestedMerges: true,
    learnedMerges: true,
    vocabulary: true,
    alpha: true,
    fittedPartition: true,
    fittedDocuments: true,
    fittedTargets: true,
  },
  partitions: { train: true, validation: true },
  boundaries: {
    bosContextOnly: true,
    eosIsTarget: true,
    documentsSeparate: true,
    testUnavailable: true,
  },
  notes: { frozenModel: true, scrollInstruction: true, nextStep: true },
};

function assertLabelShape(value: unknown, shape: RequiredLabelShape, path: string): void {
  if (shape === true) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Diagram label ${path} must not be blank.`);
    }
    return;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Diagram label group ${path} must be an object.`);
  }
  const actual = value as Record<string, unknown>;
  for (const [key, childShape] of Object.entries(shape)) {
    const childPath = `${path}.${key}`;
    if (!Object.prototype.hasOwnProperty.call(actual, key)) {
      throw new Error(`Diagram label ${childPath} is missing.`);
    }
    assertLabelShape(actual[key], childShape, childPath);
  }
}

/** Fails closed when a locale omits any visible or accessible diagram label. */
export function assertLanguageModelMetricsDiagramLabels(
  labels: LanguageModelMetricsDiagramLabels,
): void {
  assertLabelShape(labels, requiredLabelShape, 'labels');
}
