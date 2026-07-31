export interface SelfAttentionTraceVector {
  readonly latex: string;
  readonly values: readonly string[];
}

export type SelfAttentionInputRole = 'query' | 'key' | 'value';

export interface SelfAttentionTensorRecord {
  readonly role: SelfAttentionInputRole;
  readonly symbol: 'Q' | 'K' | 'V';
  readonly shape: string;
  readonly values: SelfAttentionTraceVector;
}

export interface SelfAttentionTrace {
  readonly meta: {
    readonly shape: string;
    readonly keyWidth: string;
    readonly valueWidth: string;
    readonly scale: string;
    readonly softmaxAxis: string;
    readonly masked: string;
  };
  readonly inputs: readonly SelfAttentionTensorRecord[];
  readonly dotProducts: {
    readonly shape: string;
    readonly values: SelfAttentionTraceVector;
  };
  readonly scaledScores: {
    readonly shape: string;
    readonly values: SelfAttentionTraceVector;
  };
  readonly probabilityRows: readonly {
    readonly query: string;
    readonly values: SelfAttentionTraceVector;
    readonly sum: string;
  }[];
  readonly mixtureRows: readonly {
    readonly query: string;
    readonly probabilities: SelfAttentionTraceVector;
    readonly terms: readonly SelfAttentionTraceVector[];
    readonly output: SelfAttentionTraceVector;
  }[];
  readonly backward: {
    readonly seed: SelfAttentionTraceVector;
    readonly queryGradient: SelfAttentionTraceVector;
    readonly keyGradient: SelfAttentionTraceVector;
    readonly valueGradient: SelfAttentionTraceVector;
  };
  readonly batchShape: {
    readonly batches: string;
    readonly query: string;
    readonly key: string;
    readonly value: string;
    readonly probabilities: string;
    readonly output: string;
    readonly isolated: string;
  };
  readonly singleToken: {
    readonly shape: string;
    readonly query: SelfAttentionTraceVector;
    readonly key: SelfAttentionTraceVector;
    readonly value: SelfAttentionTraceVector;
    readonly raw: SelfAttentionTraceVector;
    readonly scaled: SelfAttentionTraceVector;
    readonly probabilities: SelfAttentionTraceVector;
    readonly output: SelfAttentionTraceVector;
    readonly queryGradientZero: string;
    readonly keyGradientZero: string;
  };
  readonly errors: readonly {
    readonly case: string;
    readonly kind: string;
    readonly evidence: string;
    readonly rejected: string;
  }[];
  readonly history: {
    readonly earlier: string;
    readonly bridge: string;
    readonly transformer: string;
    readonly comparison: string;
  };
  readonly proof: {
    readonly rowSumTolerance: string;
    readonly queryChecks: string;
    readonly keyChecks: string;
    readonly valueChecks: string;
    readonly gradientTolerance: string;
    readonly gradcheck: string;
    readonly replay: string;
    readonly unmasked: string;
  };
  readonly nextChapter: string;
}

export interface SelfAttentionDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly sections: {
    readonly calculation: string;
    readonly evidence: string;
    readonly history: string;
  };
  readonly stages: {
    readonly inputs: string;
    readonly dotProducts: string;
    readonly scaledScores: string;
    readonly probabilities: string;
    readonly mixtures: string;
  };
  readonly fields: {
    readonly shape: string;
    readonly scale: string;
    readonly gradientTolerance: string;
    readonly softmaxAxis: string;
    readonly mask: string;
    readonly rowSum: string;
    readonly weightedTerms: string;
    readonly output: string;
    readonly backward: string;
    readonly batchShape: string;
    readonly singleToken: string;
    readonly errors: string;
    readonly proof: string;
    readonly checkCount: string;
    readonly batchIsolation: string;
    readonly queryGradient: string;
    readonly keyGradient: string;
    readonly replay: string;
    readonly gradientCheck: string;
    readonly errorKind: string;
    readonly errorEvidence: string;
    readonly queryRowsKeyColumns: string;
    readonly tokenRowsFeatureColumns: string;
    readonly earlier: string;
    readonly bridge: string;
    readonly transformer: string;
  };
  readonly roles: {
    readonly query: string;
    readonly key: string;
    readonly value: string;
  };
  readonly cues: {
    readonly query: string;
    readonly key: string;
    readonly value: string;
    readonly score: string;
    readonly probability: string;
    readonly verified: string;
    readonly rejected: string;
    readonly unmasked: string;
  };
  readonly errorReasons: {
    readonly queryRank: string;
    readonly batchMismatch: string;
    readonly tokenMismatch: string;
    readonly emptyTokens: string;
    readonly queryKeyWidth: string;
  };
  readonly historyDetails: {
    readonly earlier: string;
    readonly bridge: string;
    readonly transformer: string;
    readonly comparison: string;
  };
  readonly captions: {
    readonly calculation: string;
    readonly evidence: string;
    readonly history: string;
  };
  readonly scrollers: {
    readonly inputs: string;
    readonly scores: string;
    readonly probabilities: string;
    readonly mixtures: string;
    readonly gradients: string;
    readonly history: string;
  };
}

const expectedLines = [
  'META|shape=[1,2,2]|key_width=2|value_width=2|scale=0.707107|softmax_axis=key|masked=false',
  'QUERY|shape=[1,2,2]|values=[0.000000,3.000000,2.000000,-1.000000]',
  'KEY|shape=[1,2,2]|values=[3.000000,0.000000,-1.000000,2.000000]',
  'VALUE|shape=[1,2,2]|values=[3.000000,-3.000000,1.000000,3.000000]',
  'DOT_PRODUCTS|shape=[1,2,2]|values=[0.000000,6.000000,6.000000,-4.000000]',
  'SCALED_SCORES|shape=[1,2,2]|values=[0.000000,4.242641,4.242641,-2.828427]',
  'PROBABILITY_ROW|query=0|values=[0.014166,0.985834]|sum=1.000000',
  'PROBABILITY_ROW|query=1|values=[0.999151,0.000849]|sum=1.000000',
  'MIXTURE_ROW|query=0|probabilities=[0.014166,0.985834]|terms=[[0.042498,-0.042498],[0.985834,2.957502]]|output=[1.028332,2.915004]',
  'MIXTURE_ROW|query=1|probabilities=[0.999151,0.000849]|terms=[[2.997454,-2.997454],[0.000849,0.002546]]|output=[2.998303,-2.994908]',
  'BACKWARD|seed=[1.000000,0.000000,0.000000,1.000000]|query_gradient=[0.079000,-0.039500,-0.014389,0.007195]|key_gradient=[-0.007195,0.062847,0.007195,-0.062847]|value_gradient=[0.014166,0.999151,0.985834,0.000849]',
  'BATCH_SHAPE|batches=2|query=[2,2,2]|key=[2,2,2]|value=[2,2,2]|probabilities=[2,2,2]|output=[2,2,2]|isolated=true',
  'SINGLE_TOKEN|shape=[1,1,2]|query=[2.000000,-1.000000]|key=[-3.000000,4.000000]|value=[5.000000,-2.000000]|raw=[-10.000000]|scaled=[-7.071068]|probabilities=[1.000000]|output=[5.000000,-2.000000]|query_gradient_zero=true|key_gradient_zero=true',
  'ERROR|case=query-rank|kind=input-rank|operand=query|rank=2|rejected=true',
  'ERROR|case=batch-mismatch|kind=batch-mismatch|query=1|key=2|value=1|rejected=true',
  'ERROR|case=token-mismatch|kind=token-mismatch|query=2|key=3|value=2|rejected=true',
  'ERROR|case=empty-tokens|kind=empty-token-axis|tokens=0|rejected=true',
  'ERROR|case=query-key-width|kind=query-key-width-mismatch|query=2|key=3|rejected=true',
  'HISTORY|earlier=recurrent-fixed-context|bridge=additive-encoder-decoder-alignment|transformer=scaled-dot-product-self-attention|comparison=all-sequence-positions',
  'PROOF|row_sum_tolerance=0.000000000001|query_checks=4|key_checks=4|value_checks=4|gradient_tolerance=0.000002|gradcheck=true|replay=bitwise|unmasked=true',
  'NEXT|chapter=28-causal-masking',
] as const;

const unsignedIntegerPattern = String.raw`(?:0|[1-9]\d*)`;
const decimalPattern = String.raw`-?(?:0|[1-9]\d*)\.\d{6}`;
const decimalTwelvePattern = String.raw`(?:0|[1-9]\d*)\.\d{12}`;
const vectorPattern = String.raw`\[${decimalPattern}(?:,${decimalPattern})*\]`;
const pairPattern = String.raw`\[${decimalPattern},${decimalPattern}\]`;
const shapePattern = String.raw`\[${unsignedIntegerPattern}(?:,${unsignedIntegerPattern})*\]`;

function invalid(message: string): never {
  throw new Error(`invalid self-attention trace: ${message}`);
}

function exactMatch(line: string, pattern: RegExp, label: string): RegExpMatchArray {
  return line.match(pattern) ?? invalid(`${label} does not match its exact record grammar`);
}

function vector(latex: string, expectedLength: number): SelfAttentionTraceVector {
  if (!new RegExp(`^${vectorPattern}$`).test(latex) || latex.includes('-0.000000')) {
    invalid(`noncanonical vector ${latex}`);
  }
  const values = latex.slice(1, -1).split(',');
  if (values.length !== expectedLength) invalid(`vector ${latex} has the wrong coordinate count`);
  return Object.freeze({ latex, values: Object.freeze(values) });
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.join('|') !== expected.join('|')) invalid(`${label} labels have unexpected keys`);
}

function exactStringKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  exactKeys(value, keys, label);
  for (const key of keys) {
    if (typeof value[key] !== 'string' || (value[key] as string).trim() === '') {
      invalid(`${label}.${key} must be a nonblank string`);
    }
  }
}

export function validateSelfAttentionLabels(
  labels: SelfAttentionDiagramLabels,
): SelfAttentionDiagramLabels {
  exactKeys(
    labels as unknown as Record<string, unknown>,
    ['title', 'description', 'sections', 'stages', 'fields', 'roles', 'cues', 'errorReasons', 'historyDetails', 'captions', 'scrollers'],
    'root',
  );
  if (labels.title.trim() === '') invalid('root.title must be a nonblank string');
  if (labels.description.trim() === '') invalid('root.description must be a nonblank string');
  exactStringKeys(
    labels.sections as unknown as Record<string, unknown>,
    ['calculation', 'evidence', 'history'],
    'sections',
  );
  exactStringKeys(
    labels.stages as unknown as Record<string, unknown>,
    ['inputs', 'dotProducts', 'scaledScores', 'probabilities', 'mixtures'],
    'stages',
  );
  exactStringKeys(
    labels.fields as unknown as Record<string, unknown>,
    [
      'shape', 'scale', 'gradientTolerance', 'softmaxAxis', 'mask', 'rowSum', 'weightedTerms', 'output',
      'backward', 'batchShape', 'singleToken', 'errors', 'proof', 'checkCount',
      'batchIsolation', 'queryGradient', 'keyGradient', 'replay', 'gradientCheck',
      'errorKind', 'errorEvidence',
      'queryRowsKeyColumns', 'tokenRowsFeatureColumns',
      'earlier', 'bridge', 'transformer',
    ],
    'fields',
  );
  exactStringKeys(
    labels.roles as unknown as Record<string, unknown>,
    ['query', 'key', 'value'],
    'roles',
  );
  exactStringKeys(
    labels.cues as unknown as Record<string, unknown>,
    ['query', 'key', 'value', 'score', 'probability', 'verified', 'rejected', 'unmasked'],
    'cues',
  );
  exactStringKeys(
    labels.errorReasons as unknown as Record<string, unknown>,
    ['queryRank', 'batchMismatch', 'tokenMismatch', 'emptyTokens', 'queryKeyWidth'],
    'errorReasons',
  );
  exactStringKeys(
    labels.historyDetails as unknown as Record<string, unknown>,
    ['earlier', 'bridge', 'transformer', 'comparison'],
    'historyDetails',
  );
  exactStringKeys(
    labels.captions as unknown as Record<string, unknown>,
    ['calculation', 'evidence', 'history'],
    'captions',
  );
  exactStringKeys(
    labels.scrollers as unknown as Record<string, unknown>,
    ['inputs', 'scores', 'probabilities', 'mixtures', 'gradients', 'history'],
    'scrollers',
  );
  return labels;
}

function tensorRecord(
  line: string,
  role: SelfAttentionInputRole,
  symbol: SelfAttentionTensorRecord['symbol'],
): SelfAttentionTensorRecord {
  const record = exactMatch(
    line,
    new RegExp(`^${symbol === 'Q' ? 'QUERY' : symbol === 'K' ? 'KEY' : 'VALUE'}\\|shape=(${shapePattern})\\|values=(${vectorPattern})$`),
    symbol,
  );
  return Object.freeze({ role, symbol, shape: record[1], values: vector(record[2], 4) });
}

export function parseSelfAttentionTrace(source: string): SelfAttentionTrace {
  if (source.includes('\r')) invalid('trace must use LF line endings');
  if (!source.endsWith('\n') || source.endsWith('\n\n')) {
    invalid('trace must end with exactly one LF');
  }
  const lines = source.slice(0, -1).split('\n');
  if (lines.length !== expectedLines.length) invalid('trace must contain exactly 21 lines');
  for (const [index, expected] of expectedLines.entries()) {
    if (lines[index] !== expected) invalid(`line ${index} differs from the frozen Rust fixture`);
  }

  const meta = exactMatch(
    lines[0],
    new RegExp(
      `^META\\|shape=(${shapePattern})\\|key_width=(${unsignedIntegerPattern})\\|value_width=(${unsignedIntegerPattern})\\|scale=(${decimalPattern})\\|softmax_axis=([^|]+)\\|masked=(true|false)$`,
    ),
    'META',
  );
  const dotProducts = exactMatch(
    lines[4],
    new RegExp(`^DOT_PRODUCTS\\|shape=(${shapePattern})\\|values=(${vectorPattern})$`),
    'DOT_PRODUCTS',
  );
  const scaledScores = exactMatch(
    lines[5],
    new RegExp(`^SCALED_SCORES\\|shape=(${shapePattern})\\|values=(${vectorPattern})$`),
    'SCALED_SCORES',
  );
  const probabilityRows = Object.freeze(
    lines.slice(6, 8).map((line) => {
      const record = exactMatch(
        line,
        new RegExp(
          `^PROBABILITY_ROW\\|query=(${unsignedIntegerPattern})\\|values=(${vectorPattern})\\|sum=(${decimalPattern})$`,
        ),
        'PROBABILITY_ROW',
      );
      return Object.freeze({ query: record[1], values: vector(record[2], 2), sum: record[3] });
    }),
  );
  const mixtureRows = Object.freeze(
    lines.slice(8, 10).map((line) => {
      const record = exactMatch(
        line,
        new RegExp(
          `^MIXTURE_ROW\\|query=(${unsignedIntegerPattern})\\|probabilities=(${vectorPattern})\\|terms=(\\[(${pairPattern}),(${pairPattern})\\])\\|output=(${vectorPattern})$`,
        ),
        'MIXTURE_ROW',
      );
      return Object.freeze({
        query: record[1],
        probabilities: vector(record[2], 2),
        terms: Object.freeze([vector(record[4], 2), vector(record[5], 2)]),
        output: vector(record[6], 2),
      });
    }),
  );
  const backward = exactMatch(
    lines[10],
    new RegExp(
      `^BACKWARD\\|seed=(${vectorPattern})\\|query_gradient=(${vectorPattern})\\|key_gradient=(${vectorPattern})\\|value_gradient=(${vectorPattern})$`,
    ),
    'BACKWARD',
  );
  const batch = exactMatch(
    lines[11],
    new RegExp(
      `^BATCH_SHAPE\\|batches=(${unsignedIntegerPattern})\\|query=(${shapePattern})\\|key=(${shapePattern})\\|value=(${shapePattern})\\|probabilities=(${shapePattern})\\|output=(${shapePattern})\\|isolated=(true|false)$`,
    ),
    'BATCH_SHAPE',
  );
  const single = exactMatch(
    lines[12],
    new RegExp(
      `^SINGLE_TOKEN\\|shape=(${shapePattern})\\|query=(${vectorPattern})\\|key=(${vectorPattern})\\|value=(${vectorPattern})\\|raw=(${vectorPattern})\\|scaled=(${vectorPattern})\\|probabilities=(${vectorPattern})\\|output=(${vectorPattern})\\|query_gradient_zero=(true|false)\\|key_gradient_zero=(true|false)$`,
    ),
    'SINGLE_TOKEN',
  );
  const errors = Object.freeze(
    lines.slice(13, 18).map((line) => {
      const record = exactMatch(
        line,
        /^ERROR\|case=([^|]+)\|kind=([^|]+)\|(.+)\|rejected=(true|false)$/,
        'ERROR',
      );
      return Object.freeze({
        case: record[1],
        kind: record[2],
        evidence: record[3],
        rejected: record[4],
      });
    }),
  );
  const history = exactMatch(
    lines[18],
    /^HISTORY\|earlier=([^|]+)\|bridge=([^|]+)\|transformer=([^|]+)\|comparison=([^|]+)$/,
    'HISTORY',
  );
  const proof = exactMatch(
    lines[19],
    new RegExp(
      `^PROOF\\|row_sum_tolerance=(${decimalTwelvePattern})\\|query_checks=(${unsignedIntegerPattern})\\|key_checks=(${unsignedIntegerPattern})\\|value_checks=(${unsignedIntegerPattern})\\|gradient_tolerance=(${decimalPattern})\\|gradcheck=(true|false)\\|replay=([^|]+)\\|unmasked=(true|false)$`,
    ),
    'PROOF',
  );
  const next = exactMatch(lines[20], /^NEXT\|chapter=([^|]+)$/, 'NEXT');

  return Object.freeze({
    meta: Object.freeze({
      shape: meta[1],
      keyWidth: meta[2],
      valueWidth: meta[3],
      scale: meta[4],
      softmaxAxis: meta[5],
      masked: meta[6],
    }),
    inputs: Object.freeze([
      tensorRecord(lines[1], 'query', 'Q'),
      tensorRecord(lines[2], 'key', 'K'),
      tensorRecord(lines[3], 'value', 'V'),
    ]),
    dotProducts: Object.freeze({ shape: dotProducts[1], values: vector(dotProducts[2], 4) }),
    scaledScores: Object.freeze({ shape: scaledScores[1], values: vector(scaledScores[2], 4) }),
    probabilityRows,
    mixtureRows,
    backward: Object.freeze({
      seed: vector(backward[1], 4),
      queryGradient: vector(backward[2], 4),
      keyGradient: vector(backward[3], 4),
      valueGradient: vector(backward[4], 4),
    }),
    batchShape: Object.freeze({
      batches: batch[1],
      query: batch[2],
      key: batch[3],
      value: batch[4],
      probabilities: batch[5],
      output: batch[6],
      isolated: batch[7],
    }),
    singleToken: Object.freeze({
      shape: single[1],
      query: vector(single[2], 2),
      key: vector(single[3], 2),
      value: vector(single[4], 2),
      raw: vector(single[5], 1),
      scaled: vector(single[6], 1),
      probabilities: vector(single[7], 1),
      output: vector(single[8], 2),
      queryGradientZero: single[9],
      keyGradientZero: single[10],
    }),
    errors,
    history: Object.freeze({
      earlier: history[1],
      bridge: history[2],
      transformer: history[3],
      comparison: history[4],
    }),
    proof: Object.freeze({
      rowSumTolerance: proof[1],
      queryChecks: proof[2],
      keyChecks: proof[3],
      valueChecks: proof[4],
      gradientTolerance: proof[5],
      gradcheck: proof[6],
      replay: proof[7],
      unmasked: proof[8],
    }),
    nextChapter: next[1],
  });
}
