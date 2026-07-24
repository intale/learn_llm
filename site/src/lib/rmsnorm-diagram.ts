export interface RmsNormTraceVector {
  readonly latex: string;
  readonly values: readonly string[];
}

export interface RmsNormScaleRecord {
  readonly mode: 'ideal' | 'production' | 'near-zero';
  readonly epsilon: string;
  readonly factor: string;
  readonly base: RmsNormTraceVector;
  readonly scaled: RmsNormTraceVector;
  readonly maxAbsDiff: string;
}

export interface RmsNormTrace {
  readonly meta: {
    readonly epsilon: string;
    readonly featureWidth: string;
    readonly gainName: string;
    readonly noDecay: string;
    readonly siteArithmetic: string;
  };
  readonly primary: {
    readonly input: RmsNormTraceVector;
    readonly meanSquare: RmsNormTraceVector;
    readonly inverseRms: RmsNormTraceVector;
    readonly normalized: RmsNormTraceVector;
    readonly gain: RmsNormTraceVector;
    readonly output: RmsNormTraceVector;
  };
  readonly backward: {
    readonly upstream: RmsNormTraceVector;
    readonly inputGradient: RmsNormTraceVector;
    readonly gainGradient: RmsNormTraceVector;
  };
  readonly scales: readonly RmsNormScaleRecord[];
  readonly zero: {
    readonly input: RmsNormTraceVector;
    readonly output: RmsNormTraceVector;
    readonly finite: string;
  };
  readonly batch: {
    readonly shape: string;
    readonly output: RmsNormTraceVector;
    readonly axis: string;
  };
  readonly history: {
    readonly batchAnchorA: RmsNormTraceVector;
    readonly batchAnchorB: RmsNormTraceVector;
    readonly layerNorm: RmsNormTraceVector;
    readonly rmsNorm: RmsNormTraceVector;
    readonly rmsMean: string;
  };
  readonly errors: readonly {
    readonly case: string;
    readonly rejected: string;
    readonly message: string;
  }[];
  readonly proof: {
    readonly normalizedMeanSquare: string;
    readonly inputChecks: string;
    readonly gainChecks: string;
    readonly tolerance: string;
    readonly gradcheck: string;
    readonly replay: string;
    readonly trace: string;
  };
  readonly nextChapter: string;
}

export interface RmsNormDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly sections: {
    readonly primary: string;
    readonly scaling: string;
    readonly history: string;
    readonly safeguards: string;
  };
  readonly stages: {
    readonly input: string;
    readonly meanSquare: string;
    readonly inverseRms: string;
    readonly normalized: string;
    readonly gain: string;
    readonly output: string;
  };
  readonly fields: {
    readonly ideal: string;
    readonly production: string;
    readonly nearZero: string;
    readonly base: string;
    readonly scaled: string;
    readonly maximumDifference: string;
    readonly zeroInput: string;
    readonly batchAxis: string;
    readonly batchNorm: string;
    readonly layerNorm: string;
    readonly rmsNorm: string;
    readonly companionA: string;
    readonly companionB: string;
    readonly outputMean: string;
    readonly backward: string;
    readonly inputGradient: string;
    readonly gainGradient: string;
    readonly parameter: string;
    readonly optimizerPolicy: string;
    readonly errors: string;
    readonly proof: string;
  };
  readonly cues: {
    readonly input: string;
    readonly normalized: string;
    readonly scaled: string;
    readonly accepted: string;
    readonly rejected: string;
  };
  readonly captions: {
    readonly primary: string;
    readonly scaling: string;
    readonly history: string;
  };
  readonly scrollers: {
    readonly primary: string;
    readonly scales: string;
    readonly history: string;
  };
}

const expectedLines = [
  'META|epsilon=0.000010|feature_width=2|gain_name=decoder.block.0.attention_norm.gain|no_decay=true|site_arithmetic=none',
  'PRIMARY|input=[3.000000,4.000000]|mean_square=[12.500000]|inverse_rms=[0.282843]|normalized=[0.848528,1.131370]|gain=[1.500000,0.500000]|output=[1.272792,0.565685]',
  'BACKWARD|upstream=[1.000000,-2.000000]|input_gradient=[0.407293,-0.305470]|gain_gradient=[0.848528,-2.262741]',
  'SCALE|mode=ideal|epsilon=0.000000|factor=10.000000|base=[0.848528,1.131371]|scaled=[0.848528,1.131371]|max_abs_diff=0.000000000',
  'SCALE|mode=production|epsilon=0.000010|factor=10.000000|base=[0.848528,1.131370]|scaled=[0.848528,1.131371]|max_abs_diff=0.000000448',
  'SCALE|mode=near-zero|epsilon=0.000010|factor=10.000000|base=[0.094281,0.125708]|scaled=[0.632456,0.843274]|max_abs_diff=0.717566',
  'ZERO|input=[0.000000,0.000000]|output=[0.000000,0.000000]|finite=true',
  'BATCH|shape=[2,2]|output=[1.272792,0.565685,0.000000,0.707106]|axis=last',
  'HISTORY|batch_anchor_a=[-0.999999,-0.999999]|batch_anchor_b=[0.000000,0.000000]|layer_norm=[-0.999995,0.999995]|rms_norm=[0.447214,1.341641]|rms_mean=0.894427',
  'ERROR|case=rank-zero|rejected=true|message=RMSNorm input must have at least one axis',
  'ERROR|case=width-mismatch|rejected=true|message=RMSNorm input feature width must be 2, got 3',
  'ERROR|case=zero-energy-epsilon-zero|rejected=true|message=RMSNorm epsilon is zero but feature row 0 has zero mean square',
  'PROOF|normalized_mean_square=0.999999|input_checks=2|gain_checks=2|tolerance=0.000002|gradcheck=true|replay=bitwise|trace=rust-authored',
  'NEXT|chapter=26-qkv-projections',
] as const;

const decimalPattern = String.raw`(?:0|[1-9]\d*)\.\d{6}`;
const signedDecimalPattern = String.raw`[+-]?${decimalPattern}`;
const vectorPattern = String.raw`\[${signedDecimalPattern}(?:,${signedDecimalPattern})*\]`;

function invalid(message: string): never {
  throw new Error(`invalid rmsnorm trace: ${message}`);
}

function exactMatch(line: string, pattern: RegExp, label: string): RegExpMatchArray {
  return line.match(pattern) ?? invalid(`${label} does not match its exact record grammar`);
}

function vector(latex: string): RmsNormTraceVector {
  if (!new RegExp(`^${vectorPattern}$`).test(latex) || latex.includes('-0.000000')) {
    invalid(`noncanonical vector ${latex}`);
  }
  return Object.freeze({
    latex,
    values: Object.freeze(latex.slice(1, -1).split(',')),
  });
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

export function validateRmsNormLabels(labels: RmsNormDiagramLabels): RmsNormDiagramLabels {
  exactKeys(labels as unknown as Record<string, unknown>, [
    'title',
    'description',
    'sections',
    'stages',
    'fields',
    'cues',
    'captions',
    'scrollers',
  ], 'root');
  if (labels.title.trim() === '') invalid('root.title must be a nonblank string');
  if (labels.description.trim() === '') invalid('root.description must be a nonblank string');
  exactStringKeys(labels.sections as unknown as Record<string, unknown>, [
    'primary',
    'scaling',
    'history',
    'safeguards',
  ], 'sections');
  exactStringKeys(labels.stages as unknown as Record<string, unknown>, [
    'input',
    'meanSquare',
    'inverseRms',
    'normalized',
    'gain',
    'output',
  ], 'stages');
  exactStringKeys(labels.fields as unknown as Record<string, unknown>, [
    'ideal',
    'production',
    'nearZero',
    'base',
    'scaled',
    'maximumDifference',
    'zeroInput',
    'batchAxis',
    'batchNorm',
    'layerNorm',
    'rmsNorm',
    'companionA',
    'companionB',
    'outputMean',
    'backward',
    'inputGradient',
    'gainGradient',
    'parameter',
    'optimizerPolicy',
    'errors',
    'proof',
  ], 'fields');
  exactStringKeys(labels.cues as unknown as Record<string, unknown>, [
    'input',
    'normalized',
    'scaled',
    'accepted',
    'rejected',
  ], 'cues');
  exactStringKeys(labels.captions as unknown as Record<string, unknown>, [
    'primary',
    'scaling',
    'history',
  ], 'captions');
  exactStringKeys(labels.scrollers as unknown as Record<string, unknown>, [
    'primary',
    'scales',
    'history',
  ], 'scrollers');
  return labels;
}

export function parseRmsNormTrace(source: string): RmsNormTrace {
  if (source.includes('\r')) invalid('trace must use LF line endings');
  if (!source.endsWith('\n') || source.endsWith('\n\n')) {
    invalid('trace must end with exactly one LF');
  }
  const lines = source.slice(0, -1).split('\n');
  if (lines.length !== expectedLines.length) invalid('trace must contain exactly 14 lines');
  for (const [index, expected] of expectedLines.entries()) {
    if (lines[index] !== expected) invalid(`line ${index + 1} differs from the frozen Rust fixture`);
  }

  const meta = exactMatch(
    lines[0],
    new RegExp(`^META\\|epsilon=(${decimalPattern})\\|feature_width=(\\d+)\\|gain_name=([^|]+)\\|no_decay=(true|false)\\|site_arithmetic=([^|]+)$`),
    'META',
  );
  const primary = exactMatch(
    lines[1],
    new RegExp(`^PRIMARY\\|input=(${vectorPattern})\\|mean_square=(${vectorPattern})\\|inverse_rms=(${vectorPattern})\\|normalized=(${vectorPattern})\\|gain=(${vectorPattern})\\|output=(${vectorPattern})$`),
    'PRIMARY',
  );
  const backward = exactMatch(
    lines[2],
    new RegExp(`^BACKWARD\\|upstream=(${vectorPattern})\\|input_gradient=(${vectorPattern})\\|gain_gradient=(${vectorPattern})$`),
    'BACKWARD',
  );
  const scales = lines.slice(3, 6).map((line) => {
    const match = exactMatch(
      line,
      new RegExp(`^SCALE\\|mode=(ideal|production|near-zero)\\|epsilon=(${decimalPattern})\\|factor=(${decimalPattern})\\|base=(${vectorPattern})\\|scaled=(${vectorPattern})\\|max_abs_diff=(${decimalPattern}|0\\.\\d{9})$`),
      'SCALE',
    );
    return Object.freeze({
      mode: match[1] as RmsNormScaleRecord['mode'],
      epsilon: match[2],
      factor: match[3],
      base: vector(match[4]),
      scaled: vector(match[5]),
      maxAbsDiff: match[6],
    });
  });
  const zero = exactMatch(
    lines[6],
    new RegExp(`^ZERO\\|input=(${vectorPattern})\\|output=(${vectorPattern})\\|finite=(true|false)$`),
    'ZERO',
  );
  const batch = exactMatch(
    lines[7],
    new RegExp(`^BATCH\\|shape=(\\[\\d+(?:,\\d+)*\\])\\|output=(${vectorPattern})\\|axis=([^|]+)$`),
    'BATCH',
  );
  const history = exactMatch(
    lines[8],
    new RegExp(`^HISTORY\\|batch_anchor_a=(${vectorPattern})\\|batch_anchor_b=(${vectorPattern})\\|layer_norm=(${vectorPattern})\\|rms_norm=(${vectorPattern})\\|rms_mean=(${decimalPattern})$`),
    'HISTORY',
  );
  const errors = lines.slice(9, 12).map((line) => {
    const match = exactMatch(
      line,
      /^ERROR\|case=([^|]+)\|rejected=(true|false)\|message=(.+)$/,
      'ERROR',
    );
    return Object.freeze({ case: match[1], rejected: match[2], message: match[3] });
  });
  const proof = exactMatch(
    lines[12],
    new RegExp(`^PROOF\\|normalized_mean_square=(${decimalPattern})\\|input_checks=(\\d+)\\|gain_checks=(\\d+)\\|tolerance=(${decimalPattern})\\|gradcheck=(true|false)\\|replay=([^|]+)\\|trace=([^|]+)$`),
    'PROOF',
  );
  const next = exactMatch(lines[13], /^NEXT\|chapter=([^|]+)$/, 'NEXT');

  return Object.freeze({
    meta: Object.freeze({
      epsilon: meta[1],
      featureWidth: meta[2],
      gainName: meta[3],
      noDecay: meta[4],
      siteArithmetic: meta[5],
    }),
    primary: Object.freeze({
      input: vector(primary[1]),
      meanSquare: vector(primary[2]),
      inverseRms: vector(primary[3]),
      normalized: vector(primary[4]),
      gain: vector(primary[5]),
      output: vector(primary[6]),
    }),
    backward: Object.freeze({
      upstream: vector(backward[1]),
      inputGradient: vector(backward[2]),
      gainGradient: vector(backward[3]),
    }),
    scales: Object.freeze(scales),
    zero: Object.freeze({ input: vector(zero[1]), output: vector(zero[2]), finite: zero[3] }),
    batch: Object.freeze({ shape: batch[1], output: vector(batch[2]), axis: batch[3] }),
    history: Object.freeze({
      batchAnchorA: vector(history[1]),
      batchAnchorB: vector(history[2]),
      layerNorm: vector(history[3]),
      rmsNorm: vector(history[4]),
      rmsMean: history[5],
    }),
    errors: Object.freeze(errors),
    proof: Object.freeze({
      normalizedMeanSquare: proof[1],
      inputChecks: proof[2],
      gainChecks: proof[3],
      tolerance: proof[4],
      gradcheck: proof[5],
      replay: proof[6],
      trace: proof[7],
    }),
    nextChapter: next[1],
  });
}
