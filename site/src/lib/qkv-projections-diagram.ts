export interface QkvTraceVector {
  readonly latex: string;
  readonly values: readonly string[];
}

export type QkvRole = 'query' | 'key' | 'value';

export interface QkvProjectionRecord {
  readonly role: QkvRole;
  readonly tensor: 'Q' | 'K' | 'V';
  readonly parameter: string;
  readonly weightShape: string;
  readonly weights: QkvTraceVector;
  readonly outputShape: string;
  readonly output: QkvTraceVector;
}

export interface QkvTrace {
  readonly meta: {
    readonly inputShape: string;
    readonly modelWidth: string;
    readonly headWidth: string;
    readonly bias: string;
    readonly parameterCount: string;
    readonly branchOrder: string;
  };
  readonly input: QkvTraceVector;
  readonly projections: readonly QkvProjectionRecord[];
  readonly backward: {
    readonly queryUpstream: QkvTraceVector;
    readonly keyUpstream: QkvTraceVector;
    readonly valueUpstream: QkvTraceVector;
    readonly inputGradientShape: string;
    readonly inputGradient: QkvTraceVector;
  };
  readonly weightGradients: readonly {
    readonly role: QkvRole;
    readonly shape: string;
    readonly values: QkvTraceVector;
  }[];
  readonly independence: {
    readonly changed: QkvRole;
    readonly queryChanged: string;
    readonly keyOutput: string;
    readonly valueOutput: string;
  };
  readonly emptyShapes: {
    readonly batchInput: string;
    readonly batchQuery: string;
    readonly batchKey: string;
    readonly batchValue: string;
    readonly tokenInput: string;
    readonly tokenQuery: string;
    readonly tokenKey: string;
    readonly tokenValue: string;
  };
  readonly errors: readonly {
    readonly case: string;
    readonly rejected: string;
    readonly message: string;
  }[];
  readonly history: {
    readonly earlierLeft: string;
    readonly earlierRight: string;
    readonly transformerSource: string;
    readonly mapping: string;
  };
  readonly proof: {
    readonly inputChecks: string;
    readonly queryWeightChecks: string;
    readonly keyWeightChecks: string;
    readonly valueWeightChecks: string;
    readonly tolerance: string;
    readonly gradcheck: string;
    readonly replay: string;
    readonly names: string;
    readonly initialization: string;
  };
  readonly nextChapter: string;
}

export interface QkvProjectionsDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly sections: {
    readonly projections: string;
    readonly history: string;
    readonly evidence: string;
  };
  readonly stages: {
    readonly input: string;
    readonly query: string;
    readonly key: string;
    readonly value: string;
  };
  readonly fields: {
    readonly shape: string;
    readonly weight: string;
    readonly parameter: string;
    readonly output: string;
    readonly biasPolicy: string;
    readonly inputGradient: string;
    readonly weightGradient: string;
    readonly independence: string;
    readonly emptyBatch: string;
    readonly emptyTokens: string;
    readonly errors: string;
    readonly proof: string;
    readonly earlierAttention: string;
    readonly selfAttention: string;
    readonly decoderState: string;
    readonly encoderAnnotations: string;
    readonly oneSequence: string;
  };
  readonly roles: {
    readonly query: string;
    readonly key: string;
    readonly value: string;
  };
  readonly cues: {
    readonly shared: string;
    readonly query: string;
    readonly key: string;
    readonly value: string;
    readonly accepted: string;
    readonly rejected: string;
    readonly changed: string;
    readonly unchanged: string;
    readonly notUsed: string;
  };
  readonly errorReasons: {
    readonly rankTwo: string;
    readonly inputWidth: string;
    readonly branchMismatch: string;
  };
  readonly captions: {
    readonly projections: string;
    readonly history: string;
    readonly evidence: string;
  };
  readonly scrollers: {
    readonly branches: string;
    readonly history: string;
    readonly gradients: string;
  };
}

const expectedLines = [
  'META|input_shape=[1,2,3]|model_width=3|head_width=2|bias=false|parameter_count=18|branch_order=query,key,value',
  'INPUT|values=[1.000000,2.000000,-1.000000,0.000000,1.000000,2.000000]',
  'PROJECTION|role=query|tensor=Q|parameter=decoder.block.0.attention.query.weight|weight_shape=[3,2]|weights=[1.000000,0.000000,0.000000,1.000000,1.000000,-1.000000]|output_shape=[1,2,2]|output=[0.000000,3.000000,2.000000,-1.000000]',
  'PROJECTION|role=key|tensor=K|parameter=decoder.block.0.attention.key.weight|weight_shape=[3,2]|weights=[0.000000,1.000000,1.000000,0.000000,-1.000000,1.000000]|output_shape=[1,2,2]|output=[3.000000,0.000000,-1.000000,2.000000]',
  'PROJECTION|role=value|tensor=V|parameter=decoder.block.0.attention.value.weight|weight_shape=[3,2]|weights=[1.000000,1.000000,1.000000,-1.000000,0.000000,2.000000]|output_shape=[1,2,2]|output=[3.000000,-3.000000,1.000000,3.000000]',
  'BACKWARD|query_upstream=[1.000000,0.000000,-1.000000,2.000000]|key_upstream=[0.500000,-1.000000,1.000000,0.000000]|value_upstream=[2.000000,1.000000,0.000000,-0.500000]|input_gradient_shape=[1,2,3]|input_gradient=[3.000000,1.500000,1.500000,-1.500000,3.500000,-5.000000]',
  'WEIGHT_GRADIENT|role=query|shape=[3,2]|values=[1.000000,0.000000,1.000000,2.000000,-3.000000,4.000000]',
  'WEIGHT_GRADIENT|role=key|shape=[3,2]|values=[0.500000,-1.000000,2.000000,-2.000000,1.500000,1.000000]',
  'WEIGHT_GRADIENT|role=value|shape=[3,2]|values=[2.000000,1.000000,4.000000,1.500000,-2.000000,-2.000000]',
  'INDEPENDENCE|changed=query|query_changed=true|key_output=bitwise-unchanged|value_output=bitwise-unchanged',
  'EMPTY_SHAPES|batch_input=[0,2,3]|batch_query=[0,2,2]|batch_key=[0,2,2]|batch_value=[0,2,2]|token_input=[2,0,3]|token_query=[2,0,2]|token_key=[2,0,2]|token_value=[2,0,2]',
  'ERROR|case=rank-two|rejected=true|message=Q/K/V input must have rank three [batch, tokens, model_width], got rank 2',
  'ERROR|case=input-width|rejected=true|message=Q/K/V input final width must equal model width 3, got 4',
  'ERROR|case=branch-mismatch|rejected=true|message=Q/K/V model widths must match, got query 3, key 4, value 3',
  'HISTORY|earlier_left=decoder-state|earlier_right=encoder-annotations|transformer_source=one-sequence|mapping=retrospective',
  'PROOF|input_checks=6|query_weight_checks=6|key_weight_checks=6|value_weight_checks=6|tolerance=0.000002|gradcheck=true|replay=bitwise|names=unique|initialization=transactional',
  'NEXT|chapter=27-self-attention',
] as const;

const unsignedIntegerPattern = String.raw`(?:0|[1-9]\d*)`;
const decimalPattern = String.raw`-?(?:0|[1-9]\d*)\.\d{6}`;
const vectorPattern = String.raw`\[${decimalPattern}(?:,${decimalPattern})*\]`;
const shapePattern = String.raw`\[${unsignedIntegerPattern}(?:,${unsignedIntegerPattern})*\]`;

function invalid(message: string): never {
  throw new Error(`invalid Q/K/V projection trace: ${message}`);
}

function exactMatch(line: string, pattern: RegExp, label: string): RegExpMatchArray {
  return line.match(pattern) ?? invalid(`${label} does not match its exact record grammar`);
}

function vector(latex: string, expectedLength: number): QkvTraceVector {
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

export function validateQkvProjectionsLabels(
  labels: QkvProjectionsDiagramLabels,
): QkvProjectionsDiagramLabels {
  exactKeys(
    labels as unknown as Record<string, unknown>,
    ['title', 'description', 'sections', 'stages', 'fields', 'roles', 'cues', 'errorReasons', 'captions', 'scrollers'],
    'root',
  );
  if (labels.title.trim() === '') invalid('root.title must be a nonblank string');
  if (labels.description.trim() === '') invalid('root.description must be a nonblank string');
  exactStringKeys(
    labels.sections as unknown as Record<string, unknown>,
    ['projections', 'history', 'evidence'],
    'sections',
  );
  exactStringKeys(
    labels.stages as unknown as Record<string, unknown>,
    ['input', 'query', 'key', 'value'],
    'stages',
  );
  exactStringKeys(
    labels.fields as unknown as Record<string, unknown>,
    [
      'shape', 'weight', 'parameter', 'output', 'biasPolicy', 'inputGradient',
      'weightGradient', 'independence', 'emptyBatch', 'emptyTokens', 'errors', 'proof',
      'earlierAttention', 'selfAttention', 'decoderState', 'encoderAnnotations', 'oneSequence',
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
    ['shared', 'query', 'key', 'value', 'accepted', 'rejected', 'changed', 'unchanged', 'notUsed'],
    'cues',
  );
  exactStringKeys(
    labels.errorReasons as unknown as Record<string, unknown>,
    ['rankTwo', 'inputWidth', 'branchMismatch'],
    'errorReasons',
  );
  exactStringKeys(
    labels.captions as unknown as Record<string, unknown>,
    ['projections', 'history', 'evidence'],
    'captions',
  );
  exactStringKeys(
    labels.scrollers as unknown as Record<string, unknown>,
    ['branches', 'history', 'gradients'],
    'scrollers',
  );
  return labels;
}

function projection(line: string): QkvProjectionRecord {
  const match = exactMatch(
    line,
    new RegExp(
      `^PROJECTION\\|role=(query|key|value)\\|tensor=(Q|K|V)\\|parameter=([^|]+)\\|weight_shape=(${shapePattern})\\|weights=(${vectorPattern})\\|output_shape=(${shapePattern})\\|output=(${vectorPattern})$`,
    ),
    'PROJECTION',
  );
  return Object.freeze({
    role: match[1] as QkvRole,
    tensor: match[2] as QkvProjectionRecord['tensor'],
    parameter: match[3],
    weightShape: match[4],
    weights: vector(match[5], 6),
    outputShape: match[6],
    output: vector(match[7], 4),
  });
}

export function parseQkvProjectionsTrace(source: string): QkvTrace {
  if (source.includes('\r')) invalid('trace must use LF line endings');
  if (!source.endsWith('\n') || source.endsWith('\n\n')) {
    invalid('trace must end with exactly one LF');
  }
  const lines = source.slice(0, -1).split('\n');
  if (lines.length !== expectedLines.length) invalid('trace must contain exactly 17 lines');
  for (const [index, expected] of expectedLines.entries()) {
    if (lines[index] !== expected) invalid(`line ${index + 1} differs from the frozen Rust fixture`);
  }

  const meta = exactMatch(
    lines[0],
    new RegExp(
      `^META\\|input_shape=(${shapePattern})\\|model_width=(${unsignedIntegerPattern})\\|head_width=(${unsignedIntegerPattern})\\|bias=(true|false)\\|parameter_count=(${unsignedIntegerPattern})\\|branch_order=([^|]+)$`,
    ),
    'META',
  );
  const input = exactMatch(lines[1], new RegExp(`^INPUT\\|values=(${vectorPattern})$`), 'INPUT');
  const projections = Object.freeze(lines.slice(2, 5).map(projection));
  const backward = exactMatch(
    lines[5],
    new RegExp(
      `^BACKWARD\\|query_upstream=(${vectorPattern})\\|key_upstream=(${vectorPattern})\\|value_upstream=(${vectorPattern})\\|input_gradient_shape=(${shapePattern})\\|input_gradient=(${vectorPattern})$`,
    ),
    'BACKWARD',
  );
  const weightGradients = Object.freeze(
    lines.slice(6, 9).map((line) => {
      const match = exactMatch(
        line,
        new RegExp(
          `^WEIGHT_GRADIENT\\|role=(query|key|value)\\|shape=(${shapePattern})\\|values=(${vectorPattern})$`,
        ),
        'WEIGHT_GRADIENT',
      );
      return Object.freeze({
        role: match[1] as QkvRole,
        shape: match[2],
        values: vector(match[3], 6),
      });
    }),
  );
  const independence = exactMatch(
    lines[9],
    /^INDEPENDENCE\|changed=(query|key|value)\|query_changed=(true|false)\|key_output=([^|]+)\|value_output=([^|]+)$/,
    'INDEPENDENCE',
  );
  const empty = exactMatch(
    lines[10],
    new RegExp(
      `^EMPTY_SHAPES\\|batch_input=(${shapePattern})\\|batch_query=(${shapePattern})\\|batch_key=(${shapePattern})\\|batch_value=(${shapePattern})\\|token_input=(${shapePattern})\\|token_query=(${shapePattern})\\|token_key=(${shapePattern})\\|token_value=(${shapePattern})$`,
    ),
    'EMPTY_SHAPES',
  );
  const errors = Object.freeze(
    lines.slice(11, 14).map((line) => {
      const match = exactMatch(
        line,
        /^ERROR\|case=([^|]+)\|rejected=(true|false)\|message=(.+)$/,
        'ERROR',
      );
      return Object.freeze({ case: match[1], rejected: match[2], message: match[3] });
    }),
  );
  const history = exactMatch(
    lines[14],
    /^HISTORY\|earlier_left=([^|]+)\|earlier_right=([^|]+)\|transformer_source=([^|]+)\|mapping=([^|]+)$/,
    'HISTORY',
  );
  const proof = exactMatch(
    lines[15],
    new RegExp(
      `^PROOF\\|input_checks=(${unsignedIntegerPattern})\\|query_weight_checks=(${unsignedIntegerPattern})\\|key_weight_checks=(${unsignedIntegerPattern})\\|value_weight_checks=(${unsignedIntegerPattern})\\|tolerance=(${decimalPattern})\\|gradcheck=(true|false)\\|replay=([^|]+)\\|names=([^|]+)\\|initialization=([^|]+)$`,
    ),
    'PROOF',
  );
  const next = exactMatch(lines[16], /^NEXT\|chapter=([^|]+)$/, 'NEXT');

  return Object.freeze({
    meta: Object.freeze({
      inputShape: meta[1],
      modelWidth: meta[2],
      headWidth: meta[3],
      bias: meta[4],
      parameterCount: meta[5],
      branchOrder: meta[6],
    }),
    input: vector(input[1], 6),
    projections,
    backward: Object.freeze({
      queryUpstream: vector(backward[1], 4),
      keyUpstream: vector(backward[2], 4),
      valueUpstream: vector(backward[3], 4),
      inputGradientShape: backward[4],
      inputGradient: vector(backward[5], 6),
    }),
    weightGradients,
    independence: Object.freeze({
      changed: independence[1] as QkvRole,
      queryChanged: independence[2],
      keyOutput: independence[3],
      valueOutput: independence[4],
    }),
    emptyShapes: Object.freeze({
      batchInput: empty[1],
      batchQuery: empty[2],
      batchKey: empty[3],
      batchValue: empty[4],
      tokenInput: empty[5],
      tokenQuery: empty[6],
      tokenKey: empty[7],
      tokenValue: empty[8],
    }),
    errors,
    history: Object.freeze({
      earlierLeft: history[1],
      earlierRight: history[2],
      transformerSource: history[3],
      mapping: history[4],
    }),
    proof: Object.freeze({
      inputChecks: proof[1],
      queryWeightChecks: proof[2],
      keyWeightChecks: proof[3],
      valueWeightChecks: proof[4],
      tolerance: proof[5],
      gradcheck: proof[6],
      replay: proof[7],
      names: proof[8],
      initialization: proof[9],
    }),
    nextChapter: next[1],
  });
}
