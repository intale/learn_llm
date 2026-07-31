export interface DecoderBlockTraceVector {
  readonly latex: string;
  readonly values: readonly string[];
}

export interface DecoderBlockTrace {
  readonly config: Readonly<Record<string, string>>;
  readonly shapes: Readonly<Record<string, string>>;
  readonly stages: readonly {
    readonly name: string;
    readonly tokens: readonly DecoderBlockTraceVector[];
  }[];
  readonly weights: readonly {
    readonly head: string;
    readonly query: string;
    readonly visibility: readonly string[];
    readonly values: DecoderBlockTraceVector;
    readonly rowSum: string;
  }[];
  readonly merges: readonly Readonly<Record<string, string>>[];
  readonly probes: readonly {
    readonly token: string;
    readonly values: DecoderBlockTraceVector;
  }[];
  readonly orderProof: {
    readonly pre_norm: string;
    readonly post_norm_differs: string;
    readonly postNormToken: DecoderBlockTraceVector;
    readonly preNormToken: DecoderBlockTraceVector;
  };
  readonly causalProof: Readonly<Record<string, string>>;
  readonly parameters: {
    readonly tensors: string;
    readonly scalars: string;
    readonly bias: string;
    readonly stable_order: string;
    readonly distinct: string;
    readonly names: readonly string[];
  };
  readonly gradients: Readonly<Record<string, string>>;
  readonly history: {
    readonly sequential: string;
    readonly original_post_norm: string;
    readonly modern_pre_norm: string;
    readonly numeric_order_contrast: string;
    readonly rnnStates: DecoderBlockTraceVector;
  };
}

export interface DecoderBlockDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly sections: {
    readonly overview: string;
    readonly attention: string;
    readonly feedForward: string;
    readonly proof: string;
  };
  readonly stages: {
    readonly input: string;
    readonly attentionNormalization: string;
    readonly attention: string;
    readonly attentionResidual: string;
    readonly feedForwardNormalization: string;
    readonly feedForward: string;
    readonly output: string;
  };
  readonly shapeStages: {
    readonly input: string;
    readonly attentionNormalization: string;
    readonly attentionWeights: string;
    readonly attentionBranch: string;
    readonly attentionResidual: string;
    readonly feedForwardNormalization: string;
    readonly feedForwardBranch: string;
    readonly output: string;
    readonly probeLogits: string;
  };
  readonly fields: {
    readonly shape: string;
    readonly token: string;
    readonly query: string;
    readonly rowSum: string;
    readonly identity: string;
    readonly branch: string;
    readonly probe: string;
    readonly orderContrast: string;
    readonly causality: string;
    readonly parameterCount: string;
    readonly gradientCount: string;
  };
  readonly cues: {
    readonly identity: string;
    readonly branch: string;
    readonly merge: string;
    readonly allowed: string;
    readonly blocked: string;
    readonly unchanged: string;
    readonly changed: string;
    readonly verified: string;
  };
  readonly states: {
    readonly allowed: string;
    readonly blocked: string;
  };
  readonly captions: {
    readonly attention: string;
    readonly feedForward: string;
    readonly proof: string;
  };
  readonly scrollers: {
    readonly formula: string;
    readonly flow: string;
    readonly weights: string;
    readonly evidence: string;
  };
}

const expectedLines = [
  'CONFIG|batch=1|tokens=3|model_width=4|heads=2|head_width=2|feed_forward_width=4|epsilon=0.000000|stage_order=[attention-norm,attention,residual-1,feed-forward-norm,feed-forward,residual-2]',
  'SHAPE|stage=input|value=[1,3,4]',
  'SHAPE|stage=attention-norm|value=[1,3,4]',
  'SHAPE|stage=attention-weights|value=[1,2,3,3]',
  'SHAPE|stage=attention-branch|value=[1,3,4]',
  'SHAPE|stage=after-attention|value=[1,3,4]',
  'SHAPE|stage=feed-forward-norm|value=[1,3,4]',
  'SHAPE|stage=feed-forward-branch|value=[1,3,4]',
  'SHAPE|stage=output|value=[1,3,4]',
  'SHAPE|stage=probe-logits|value=[1,3,3]',
  'STAGE|name=input|token_0=[2.000000,0.000000,0.000000,0.000000]|token_1=[0.000000,2.000000,0.000000,0.000000]|token_2=[0.000000,0.000000,2.000000,0.000000]',
  'STAGE|name=attention-norm|token_0=[2.000000,0.000000,0.000000,0.000000]|token_1=[0.000000,2.000000,0.000000,0.000000]|token_2=[0.000000,0.000000,2.000000,0.000000]',
  'STAGE|name=attention-branch|token_0=[2.000000,0.000000,0.000000,0.000000]|token_1=[0.010881,1.989119,0.000000,0.000000]|token_2=[0.666667,0.666667,1.788570,0.000000]',
  'STAGE|name=after-attention|token_0=[4.000000,0.000000,0.000000,0.000000]|token_1=[0.010881,3.989119,0.000000,0.000000]|token_2=[0.666667,0.666667,3.788570,0.000000]',
  'STAGE|name=feed-forward-norm|token_0=[2.000000,0.000000,0.000000,0.000000]|token_1=[0.005455,1.999993,0.000000,0.000000]|token_2=[0.341520,0.341520,1.940806,0.000000]',
  'STAGE|name=feed-forward-branch|token_0=[3.523188,0.000000,0.000000,0.000000]|token_1=[0.000015,3.523159,0.000000,0.000000]|token_2=[0.068180,0.068180,3.293781,0.000000]',
  'STAGE|name=output|token_0=[7.523188,0.000000,0.000000,0.000000]|token_1=[0.010896,7.512278,0.000000,0.000000]|token_2=[0.734847,0.734847,7.082351,0.000000]',
  'WEIGHT|head=0|query=0|visibility=[allowed,blocked,blocked]|values=[1.000000,0.000000,0.000000]|row_sum=1.000000',
  'WEIGHT|head=0|query=1|visibility=[allowed,allowed,blocked]|values=[0.005440,0.994560,0.000000]|row_sum=1.000000',
  'WEIGHT|head=0|query=2|visibility=[allowed,allowed,allowed]|values=[0.333333,0.333333,0.333333]|row_sum=1.000000',
  'WEIGHT|head=1|query=0|visibility=[allowed,blocked,blocked]|values=[1.000000,0.000000,0.000000]|row_sum=1.000000',
  'WEIGHT|head=1|query=1|visibility=[allowed,allowed,blocked]|values=[0.500000,0.500000,0.000000]|row_sum=1.000000',
  'WEIGHT|head=1|query=2|visibility=[allowed,allowed,allowed]|values=[0.052857,0.052857,0.894285]|row_sum=1.000000',
  'MERGE|name=attention|identity=input|branch=attention-branch|result=after-attention|exact=true',
  'MERGE|name=feed-forward|identity=after-attention|branch=feed-forward-branch|result=output|exact=true',
  'PROBE|token=0|values=[7.523188,0.000000,-7.523188]',
  'PROBE|token=1|values=[0.010896,7.512278,-7.523174]',
  'PROBE|token=2|values=[7.817198,7.817198,-1.469694]',
  'ORDER_PROOF|pre_norm=true|post_norm_differs=true|post_norm_token_1=[-0.573144,1.732042,-0.579449,-0.579449]|pre_norm_token_1=[0.010881,3.989119,0.000000,0.000000]',
  'CAUSAL_PROOF|position_0=bitwise-unchanged|position_1=bitwise-unchanged|position_2=changed|future_probabilities=exact-zero',
  'PARAMETERS|tensors=9|scalars=120|bias=false|stable_order=true|distinct=true|names=[decoder.block.0.attention_norm.gain,decoder.block.0.attention.query.weight,decoder.block.0.attention.key.weight,decoder.block.0.attention.value.weight,decoder.block.0.attention.output.weight,decoder.block.0.ffn_norm.gain,decoder.block.0.ffn.gate.weight,decoder.block.0.ffn.up.weight,decoder.block.0.ffn.down.weight]',
  'GRADIENTS|input=12|parameters=120|total=132|tolerance=0.000020|passed=true|tape_finite=true',
  'HISTORY|rnn_style_states=[0.462117,0.096289,0.194699]|sequential=true|original_post_norm=true|modern_pre_norm=true|numeric_order_contrast=true',
] as const;

const decimalPattern = /^-?(?:0|[1-9]\d*)\.\d{6}$/;

function invalid(message: string): never {
  throw new Error('invalid decoder-block trace: ' + message);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.join('|') !== expected.join('|')) invalid(label + ' has unexpected keys');
}

function exactStringKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  exactKeys(value, keys, label);
  for (const key of keys) {
    if (typeof value[key] !== 'string' || (value[key] as string).trim() === '') {
      invalid(label + '.' + key + ' must be a nonblank string');
    }
  }
}

export function validateDecoderBlockDiagramLabels(
  labels: DecoderBlockDiagramLabels,
): DecoderBlockDiagramLabels {
  exactKeys(
    labels as unknown as Record<string, unknown>,
    ['title', 'description', 'sections', 'stages', 'shapeStages', 'fields', 'cues', 'states', 'captions', 'scrollers'],
    'labels',
  );
  if (labels.title.trim() === '') invalid('labels.title must be a nonblank string');
  if (labels.description.trim() === '') invalid('labels.description must be a nonblank string');
  exactStringKeys(
    labels.sections as unknown as Record<string, unknown>,
    ['overview', 'attention', 'feedForward', 'proof'],
    'sections',
  );
  exactStringKeys(
    labels.stages as unknown as Record<string, unknown>,
    ['input', 'attentionNormalization', 'attention', 'attentionResidual', 'feedForwardNormalization', 'feedForward', 'output'],
    'stages',
  );
  exactStringKeys(
    labels.shapeStages as unknown as Record<string, unknown>,
    [
      'input',
      'attentionNormalization',
      'attentionWeights',
      'attentionBranch',
      'attentionResidual',
      'feedForwardNormalization',
      'feedForwardBranch',
      'output',
      'probeLogits',
    ],
    'shapeStages',
  );
  exactStringKeys(
    labels.fields as unknown as Record<string, unknown>,
    [
      'shape',
      'token',
      'query',
      'rowSum',
      'identity',
      'branch',
      'probe',
      'orderContrast',
      'causality',
      'parameterCount',
      'gradientCount',
    ],
    'fields',
  );
  exactStringKeys(
    labels.cues as unknown as Record<string, unknown>,
    ['identity', 'branch', 'merge', 'allowed', 'blocked', 'unchanged', 'changed', 'verified'],
    'cues',
  );
  exactStringKeys(
    labels.states as unknown as Record<string, unknown>,
    ['allowed', 'blocked'],
    'states',
  );
  exactStringKeys(
    labels.captions as unknown as Record<string, unknown>,
    ['attention', 'feedForward', 'proof'],
    'captions',
  );
  exactStringKeys(
    labels.scrollers as unknown as Record<string, unknown>,
    ['formula', 'flow', 'weights', 'evidence'],
    'scrollers',
  );
  return labels;
}

function fields(line: string): Readonly<Record<string, string>> {
  const pieces = line.split('|');
  const record: Record<string, string> = {};
  for (const piece of pieces.slice(1)) {
    const match = /^([^=]+)=(.*)$/.exec(piece);
    if (match === null) invalid('record field is missing name or equals sign');
    if (Object.hasOwn(record, match[1])) invalid('record repeats field ' + match[1]);
    record[match[1]] = match[2];
  }
  return Object.freeze(record);
}

function required(record: Readonly<Record<string, string>>, key: string): string {
  return record[key] ?? invalid('record is missing field ' + key);
}

function vector(latex: string, expectedLength: number): DecoderBlockTraceVector {
  if (!latex.startsWith('[') || !latex.endsWith(']')) invalid('invalid vector ' + latex);
  const values = latex.slice(1, -1).split(',');
  if (values.length !== expectedLength) invalid('vector has the wrong coordinate count');
  for (const value of values) {
    if (!decimalPattern.test(value) || value === '-0.000000') {
      invalid('noncanonical coordinate ' + value);
    }
  }
  return Object.freeze({ latex, values: Object.freeze(values) });
}

function visibility(latex: string): readonly string[] {
  if (!latex.startsWith('[') || !latex.endsWith(']')) invalid('invalid visibility vector');
  const values = latex.slice(1, -1).split(',');
  if (
    values.length !== 3 ||
    values.some((value) => value !== 'allowed' && value !== 'blocked')
  ) {
    invalid('visibility vector has invalid cells');
  }
  return Object.freeze(values);
}

export function parseDecoderBlockTrace(source: string): DecoderBlockTrace {
  if (source.includes('\r')) invalid('trace must use LF line endings');
  if (!source.endsWith('\n') || source.endsWith('\n\n')) {
    invalid('trace must end with exactly one LF');
  }
  const lines = source.slice(0, -1).split('\n');
  if (lines.length !== expectedLines.length) invalid('trace must contain exactly 33 lines');
  for (const [index, expected] of expectedLines.entries()) {
    if (lines[index] !== expected) invalid('line ' + (index + 1) + ' differs from Rust');
  }

  const config = fields(lines[0]);
  exactKeys(
    config,
    [
      'batch',
      'tokens',
      'model_width',
      'heads',
      'head_width',
      'feed_forward_width',
      'epsilon',
      'stage_order',
    ],
    'config',
  );

  const shapeEntries = lines.slice(1, 10).map((line) => {
    const record = fields(line);
    exactKeys(record, ['stage', 'value'], 'shape');
    return [required(record, 'stage'), required(record, 'value')] as const;
  });

  const stages = lines.slice(10, 17).map((line) => {
    const record = fields(line);
    exactKeys(record, ['name', 'token_0', 'token_1', 'token_2'], 'stage');
    return Object.freeze({
      name: required(record, 'name'),
      tokens: Object.freeze([
        vector(required(record, 'token_0'), 4),
        vector(required(record, 'token_1'), 4),
        vector(required(record, 'token_2'), 4),
      ]),
    });
  });

  const weights = lines.slice(17, 23).map((line) => {
    const record = fields(line);
    exactKeys(record, ['head', 'query', 'visibility', 'values', 'row_sum'], 'weight');
    const rowSum = required(record, 'row_sum');
    if (!decimalPattern.test(rowSum)) invalid('weight row sum is noncanonical');
    return Object.freeze({
      head: required(record, 'head'),
      query: required(record, 'query'),
      visibility: visibility(required(record, 'visibility')),
      values: vector(required(record, 'values'), 3),
      rowSum,
    });
  });

  const merges = Object.freeze(
    lines.slice(23, 25).map((line) => {
      const record = fields(line);
      exactKeys(record, ['name', 'identity', 'branch', 'result', 'exact'], 'merge');
      return record;
    }),
  );

  const probes = Object.freeze(
    lines.slice(25, 28).map((line) => {
      const record = fields(line);
      exactKeys(record, ['token', 'values'], 'probe');
      return Object.freeze({
        token: required(record, 'token'),
        values: vector(required(record, 'values'), 3),
      });
    }),
  );

  const orderRecord = fields(lines[28]);
  exactKeys(
    orderRecord,
    ['pre_norm', 'post_norm_differs', 'post_norm_token_1', 'pre_norm_token_1'],
    'order proof',
  );
  const causalProof = fields(lines[29]);
  exactKeys(
    causalProof,
    ['position_0', 'position_1', 'position_2', 'future_probabilities'],
    'causal proof',
  );
  const parameterRecord = fields(lines[30]);
  exactKeys(
    parameterRecord,
    ['tensors', 'scalars', 'bias', 'stable_order', 'distinct', 'names'],
    'parameters',
  );
  const namesSource = required(parameterRecord, 'names');
  if (!namesSource.startsWith('[') || !namesSource.endsWith(']')) {
    invalid('parameter names are not a vector');
  }
  const gradients = fields(lines[31]);
  exactKeys(
    gradients,
    ['input', 'parameters', 'total', 'tolerance', 'passed', 'tape_finite'],
    'gradients',
  );
  const historyRecord = fields(lines[32]);
  exactKeys(
    historyRecord,
    [
      'rnn_style_states',
      'sequential',
      'original_post_norm',
      'modern_pre_norm',
      'numeric_order_contrast',
    ],
    'history',
  );

  return Object.freeze({
    config,
    shapes: Object.freeze(Object.fromEntries(shapeEntries)),
    stages: Object.freeze(stages),
    weights: Object.freeze(weights),
    merges,
    probes,
    orderProof: Object.freeze({
      pre_norm: required(orderRecord, 'pre_norm'),
      post_norm_differs: required(orderRecord, 'post_norm_differs'),
      postNormToken: vector(required(orderRecord, 'post_norm_token_1'), 4),
      preNormToken: vector(required(orderRecord, 'pre_norm_token_1'), 4),
    }),
    causalProof,
    parameters: Object.freeze({
      tensors: required(parameterRecord, 'tensors'),
      scalars: required(parameterRecord, 'scalars'),
      bias: required(parameterRecord, 'bias'),
      stable_order: required(parameterRecord, 'stable_order'),
      distinct: required(parameterRecord, 'distinct'),
      names: Object.freeze(namesSource.slice(1, -1).split(',')),
    }),
    gradients,
    history: Object.freeze({
      sequential: required(historyRecord, 'sequential'),
      original_post_norm: required(historyRecord, 'original_post_norm'),
      modern_pre_norm: required(historyRecord, 'modern_pre_norm'),
      numeric_order_contrast: required(historyRecord, 'numeric_order_contrast'),
      rnnStates: vector(required(historyRecord, 'rnn_style_states'), 3),
    }),
  });
}
