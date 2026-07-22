export const gradientCheckingDiagramId = 'gradient-checking';

export interface TraceNumber {
  readonly lexeme: string;
  readonly value: number;
}

export type CheckStatus = 'pass' | 'fail';
export type ScanPhase = 'truncation' | 'converging' | 'trusted' | 'rounding';

export interface CentralDifferenceEvidence {
  readonly name: 'quadratic';
  readonly point: TraceNumber;
  readonly step: TraceNumber;
  readonly minusPoint: TraceNumber;
  readonly plusPoint: TraceNumber;
  readonly minusValue: TraceNumber;
  readonly plusValue: TraceNumber;
  readonly numerical: TraceNumber;
}

export interface GradientComparisonEvidence {
  readonly name: 'quadratic-correct' | 'quadratic-wrong';
  readonly analytic: TraceNumber;
  readonly numerical: TraceNumber;
  readonly absoluteError: TraceNumber;
  readonly scale: TraceNumber;
  readonly scaledError: TraceNumber;
  readonly tolerance: TraceNumber;
  readonly status: CheckStatus;
}

export interface StepScanEvidence {
  readonly index: TraceNumber;
  readonly phase: ScanPhase;
  readonly step: TraceNumber;
  readonly minusPoint: TraceNumber;
  readonly plusPoint: TraceNumber;
  readonly minusValue: TraceNumber;
  readonly plusValue: TraceNumber;
  readonly numerical: TraceNumber;
  readonly absoluteError: TraceNumber;
  readonly scale: TraceNumber;
  readonly scaledError: TraceNumber;
  readonly status: CheckStatus;
}

export interface TraceCoordinate {
  readonly lexeme: string;
  readonly indices: readonly TraceNumber[];
}

export interface TensorFixtureEvidence {
  readonly shape: readonly TraceNumber[];
  readonly targets: readonly TraceNumber[];
  readonly values: readonly TraceNumber[];
  readonly loss: TraceNumber;
  readonly step: TraceNumber;
  readonly tolerance: TraceNumber;
}

export interface SampleSelectionEvidence {
  readonly requested: TraceNumber;
  readonly selected: TraceNumber;
  readonly flatIndices: readonly TraceNumber[];
  readonly coordinates: readonly TraceCoordinate[];
}

export interface CoordinateCheckEvidence {
  readonly flatIndex: TraceNumber;
  readonly coordinate: TraceCoordinate;
  readonly analytic: TraceNumber;
  readonly numerical: TraceNumber;
  readonly absoluteError: TraceNumber;
  readonly scale: TraceNumber;
  readonly scaledError: TraceNumber;
  readonly status: 'pass';
}

export type GradientTraceError =
  | { readonly kind: 'invalid-step'; readonly step: TraceNumber }
  | {
      readonly kind: 'collapsed-perturbation';
      readonly side: 'minus';
      readonly point: TraceNumber;
      readonly step: TraceNumber;
    }
  | {
      readonly kind: 'non-finite-evaluation';
      readonly side: 'minus';
      readonly value: 'NaN';
    }
  | {
      readonly kind: 'shape-mismatch';
      readonly parameters: readonly TraceNumber[];
      readonly analytic: readonly TraceNumber[];
    };

export interface GradientCheckingTrace {
  readonly config: {
    readonly point: TraceNumber;
    readonly analytic: TraceNumber;
    readonly tolerance: TraceNumber;
    readonly steps: readonly TraceNumber[];
  };
  readonly central: CentralDifferenceEvidence;
  readonly comparisons: readonly GradientComparisonEvidence[];
  readonly stepScan: readonly StepScanEvidence[];
  readonly tensor: TensorFixtureEvidence;
  readonly samples: SampleSelectionEvidence;
  readonly coordinates: readonly CoordinateCheckEvidence[];
  readonly restoration: { readonly exactBits: 'yes'; readonly checked: TraceNumber };
  readonly errors: readonly GradientTraceError[];
}

export interface GradientCheckingDiagramLabels {
  readonly title: string;
  readonly description: string;
  readonly summary: {
    readonly quadratic: string;
    readonly scanPoint: string;
    readonly tensorLoss: string;
  };
  readonly sections: {
    readonly quadratic: string;
    readonly scan: string;
    readonly candidates: string;
    readonly tensor: string;
    readonly errors: string;
  };
  readonly fields: {
    readonly point: string;
    readonly step: string;
    readonly minusProbe: string;
    readonly center: string;
    readonly plusProbe: string;
    readonly functionValue: string;
    readonly numerical: string;
    readonly analytic: string;
    readonly scaledError: string;
    readonly tolerance: string;
    readonly phase: string;
    readonly verdict: string;
    readonly flatIndex: string;
    readonly coordinate: string;
    readonly loss: string;
    readonly restored: string;
  };
  readonly phases: Record<ScanPhase, string>;
  readonly statuses: Record<CheckStatus, string>;
  readonly errors: Record<GradientTraceError['kind'], string>;
  readonly notes: {
    readonly schematic: string;
    readonly scan: string;
    readonly candidates: string;
    readonly tensor: string;
    readonly errors: string;
  };
  readonly symbols: {
    readonly truncation: string;
    readonly converging: string;
    readonly trusted: string;
    readonly rounding: string;
    readonly pass: string;
    readonly fail: string;
    readonly rejected: string;
  };
}

const beginMarker = 'TRACE gradient-checking-v1 BEGIN';
const endMarker = 'TRACE gradient-checking-v1 END';
const integer = '(?:0|[1-9]\\d*)';
const integerList = `${integer}(?:,${integer})*`;
const fixed = '-?(?:0|[1-9]\\d*)\\.\\d{12}';
const fixedList = `${fixed}(?:,${fixed})*`;
const scientific = '-?(?:0|[1-9]\\d*)\\.\\d{12}e(?:0|[1-9]\\d*|-[1-9]\\d*)';
const scientificList = `${scientific}(?:,${scientific})*`;
const coordinate = `${integer}:${integer}`;
const coordinateList = `${coordinate}(?:,${coordinate})*`;

const configPattern = new RegExp(
  `^CONFIG point=(${fixed}) analytic=(${fixed}) tolerance=(${scientific}) steps=(${scientificList})$`,
);
const centralPattern = new RegExp(
  `^CENTRAL name=(quadratic) point=(${fixed}) step=(${fixed}) minus-point=(${fixed}) plus-point=(${fixed}) minus-value=(${fixed}) plus-value=(${fixed}) numerical=(${fixed})$`,
);
const comparisonPattern = new RegExp(
  `^COMPARE name=(quadratic-correct|quadratic-wrong) analytic=(${fixed}) numerical=(${fixed}) absolute-error=(${scientific}) scale=(${fixed}) scaled-error=(${scientific}) tolerance=(${scientific}) status=(pass|fail)$`,
);
const scanPattern = new RegExp(
  `^H-SCAN index=(${integer}) phase=(truncation|converging|trusted|rounding) step=(${scientific}) minus-point=(${fixed}) plus-point=(${fixed}) minus-value=(${fixed}) plus-value=(${fixed}) numerical=(${fixed}) absolute-error=(${scientific}) scale=(${fixed}) scaled-error=(${scientific}) status=(pass|fail)$`,
);
const tensorPattern = new RegExp(
  `^TENSOR shape=(${integerList}) targets=(${integerList}) values=(${fixedList}) loss=(${fixed}) step=(${scientific}) tolerance=(${scientific})$`,
);
const samplesPattern = new RegExp(
  `^SAMPLES requested=(${integer}) selected=(${integer}) flat=(${integerList}) coordinates=(${coordinateList})$`,
);
const coordinatePattern = new RegExp(
  `^COORD flat=(${integer}) coordinate=(${coordinate}) analytic=(${fixed}) numerical=(${fixed}) absolute-error=(${scientific}) scale=(${fixed}) scaled-error=(${scientific}) status=(pass)$`,
);
const restorationPattern = new RegExp(
  `^RESTORE exact-bits=(yes) checked=(${integer})$`,
);
const invalidStepPattern = new RegExp(
  `^ERROR kind=(invalid-step) step=(${fixed})$`,
);
const collapsedPattern = new RegExp(
  `^ERROR kind=(collapsed-perturbation) side=(minus) point=(${fixed}) step=(${scientific})$`,
);
const nonfinitePattern = /^ERROR kind=(non-finite-evaluation) side=(minus) value=(NaN)$/;
const shapePattern = new RegExp(
  `^ERROR kind=(shape-mismatch) parameters=(${integerList}) analytic=(${integerList})$`,
);

function parseInteger(lexeme: string, label: string): TraceNumber {
  const value = Number(lexeme);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Gradient-checking trace ${label} must be a safe nonnegative integer.`);
  }
  return { lexeme, value };
}

function parseFinite(lexeme: string, label: string): TraceNumber {
  const value = Number(lexeme);
  if (!Number.isFinite(value)) {
    throw new Error(`Gradient-checking trace ${label} must be finite.`);
  }
  return { lexeme, value };
}

function parseIntegerList(lexemes: string, label: string): TraceNumber[] {
  return lexemes
    .split(',')
    .map((lexeme, index) => parseInteger(lexeme, `${label}[${index}]`));
}

function parseFiniteList(lexemes: string, label: string): TraceNumber[] {
  return lexemes
    .split(',')
    .map((lexeme, index) => parseFinite(lexeme, `${label}[${index}]`));
}

function parseCoordinate(lexeme: string, label: string): TraceCoordinate {
  return {
    lexeme,
    indices: lexeme
      .split(':')
      .map((value, index) => parseInteger(value, `${label}[${index}]`)),
  };
}

function joined(values: readonly TraceNumber[]): string {
  return values.map(({ lexeme }) => lexeme).join(',');
}

function joinedCoordinates(values: readonly TraceCoordinate[]): string {
  return values.map(({ lexeme }) => lexeme).join(',');
}

function requireLexeme(value: TraceNumber, expected: string, label: string): void {
  if (value.lexeme !== expected) {
    throw new Error(`Gradient-checking trace ${label} must be ${expected}.`);
  }
}

function requireLexemes(
  values: readonly TraceNumber[],
  expected: string,
  label: string,
): void {
  if (joined(values) !== expected) {
    throw new Error(`Gradient-checking trace ${label} must be ${expected}.`);
  }
}

function requireCoordinates(
  values: readonly TraceCoordinate[],
  expected: string,
  label: string,
): void {
  if (joinedCoordinates(values) !== expected) {
    throw new Error(`Gradient-checking trace ${label} must be ${expected}.`);
  }
}

/** Parses Rust-authored lexemes without differentiation, error scaling, or sampling. */
export function parseGradientCheckingTrace(stdout: string): GradientCheckingTrace {
  if (stdout.includes('\r')) {
    throw new Error('Gradient-checking trace must use LF line endings.');
  }
  if (!stdout.endsWith('\n') || stdout.endsWith('\n\n')) {
    throw new Error('Gradient-checking trace must end with exactly one LF.');
  }
  const lines = stdout.slice(0, -1).split('\n');
  if (lines.length !== 23 || lines[0] !== beginMarker || lines[22] !== endMarker) {
    throw new Error('Gradient-checking trace must contain one exact ordered 23-line block.');
  }

  const configMatch = lines[1]!.match(configPattern);
  if (!configMatch) throw new Error('Gradient-checking trace line 2 must be CONFIG.');
  const config = {
    point: parseFinite(configMatch[1]!, 'config point'),
    analytic: parseFinite(configMatch[2]!, 'config analytic'),
    tolerance: parseFinite(configMatch[3]!, 'config tolerance'),
    steps: parseFiniteList(configMatch[4]!, 'config steps'),
  };
  requireLexeme(config.point, '1.500000000000', 'config point');
  requireLexeme(config.analytic, '4.750000000000', 'config analytic');
  requireLexeme(config.tolerance, '1.000000000000e-6', 'config tolerance');
  requireLexemes(
    config.steps,
    '1.000000000000e0,1.000000000000e-1,1.000000000000e-3,1.000000000000e-5,1.000000000000e-8,1.000000000000e-12',
    'config steps',
  );

  const centralMatch = lines[2]!.match(centralPattern);
  if (!centralMatch) throw new Error('Gradient-checking trace line 3 must be CENTRAL.');
  const central: CentralDifferenceEvidence = {
    name: 'quadratic',
    point: parseFinite(centralMatch[2]!, 'central point'),
    step: parseFinite(centralMatch[3]!, 'central step'),
    minusPoint: parseFinite(centralMatch[4]!, 'central minus point'),
    plusPoint: parseFinite(centralMatch[5]!, 'central plus point'),
    minusValue: parseFinite(centralMatch[6]!, 'central minus value'),
    plusValue: parseFinite(centralMatch[7]!, 'central plus value'),
    numerical: parseFinite(centralMatch[8]!, 'central numerical'),
  };
  const centralExpected = [
    '3.000000000000',
    '0.100000000000',
    '2.900000000000',
    '3.100000000000',
    '8.410000000000',
    '9.610000000000',
    '6.000000000000',
  ];
  [central.point, central.step, central.minusPoint, central.plusPoint, central.minusValue, central.plusValue, central.numerical]
    .forEach((value, index) => requireLexeme(value, centralExpected[index]!, `central field ${index}`));

  const comparisonExpected = [
    {
      name: 'quadratic-correct',
      analytic: '6.000000000000',
      numerical: '6.000000000000',
      absoluteError: '5.329070518201e-15',
      scale: '6.000000000000',
      scaledError: '8.881784197001e-16',
      status: 'pass',
    },
    {
      name: 'quadratic-wrong',
      analytic: '5.500000000000',
      numerical: '6.000000000000',
      absoluteError: '5.000000000000e-1',
      scale: '6.000000000000',
      scaledError: '8.333333333333e-2',
      status: 'fail',
    },
  ] as const;
  const comparisons = comparisonExpected.map((expected, index) => {
    const match = lines[index + 3]!.match(comparisonPattern);
    if (!match || match[1] !== expected.name || match[8] !== expected.status) {
      throw new Error(`Gradient-checking trace line ${index + 4} must be ${expected.name} COMPARE.`);
    }
    const record: GradientComparisonEvidence = {
      name: match[1] as GradientComparisonEvidence['name'],
      analytic: parseFinite(match[2]!, `${expected.name} analytic`),
      numerical: parseFinite(match[3]!, `${expected.name} numerical`),
      absoluteError: parseFinite(match[4]!, `${expected.name} absolute error`),
      scale: parseFinite(match[5]!, `${expected.name} scale`),
      scaledError: parseFinite(match[6]!, `${expected.name} scaled error`),
      tolerance: parseFinite(match[7]!, `${expected.name} tolerance`),
      status: match[8] as CheckStatus,
    };
    requireLexeme(record.analytic, expected.analytic, `${expected.name} analytic`);
    requireLexeme(record.numerical, expected.numerical, `${expected.name} numerical`);
    requireLexeme(record.absoluteError, expected.absoluteError, `${expected.name} absolute error`);
    requireLexeme(record.scale, expected.scale, `${expected.name} scale`);
    requireLexeme(record.scaledError, expected.scaledError, `${expected.name} scaled error`);
    requireLexeme(record.tolerance, config.tolerance.lexeme, `${expected.name} tolerance`);
    return record;
  });

  const scanExpected = [
    ['truncation', '0.500000000000', '2.500000000000', '-0.875000000000', '10.625000000000', '5.750000000000', '1.000000000000e0', '5.750000000000', '1.739130434783e-1', 'fail'],
    ['truncation', '1.400000000000', '1.600000000000', '-0.056000000000', '0.896000000000', '4.760000000000', '1.000000000001e-2', '4.760000000000', '2.100840336136e-3', 'fail'],
    ['converging', '1.499000000000', '1.501000000000', '0.370254499000', '0.379754501000', '4.750001000000', '9.999996706256e-7', '4.750001000000', '2.105262021379e-7', 'pass'],
    ['trusted', '1.499990000000', '1.500010000000', '0.374952500450', '0.375047500450', '4.750000000131', '1.310382913289e-10', '4.750000000131', '2.758704376049e-11', 'pass'],
    ['rounding', '1.499999990000', '1.500000010000', '0.374999952500', '0.375000047500', '4.749999971132', '2.886798711188e-8', '4.750000000000', '6.077470970922e-9', 'pass'],
    ['rounding', '1.499999999999', '1.500000000001', '0.374999999995', '0.375000000005', '4.750422277766', '4.222777661198e-4', '4.750422277766', '8.889267973000e-5', 'fail'],
  ] as const;
  const stepScan = scanExpected.map((expected, index) => {
    const match = lines[index + 5]!.match(scanPattern);
    if (!match || match[2] !== expected[0] || match[12] !== expected[9]) {
      throw new Error(`Gradient-checking trace line ${index + 6} must be H-SCAN ${index}.`);
    }
    const record: StepScanEvidence = {
      index: parseInteger(match[1]!, `scan ${index} index`),
      phase: match[2] as ScanPhase,
      step: parseFinite(match[3]!, `scan ${index} step`),
      minusPoint: parseFinite(match[4]!, `scan ${index} minus point`),
      plusPoint: parseFinite(match[5]!, `scan ${index} plus point`),
      minusValue: parseFinite(match[6]!, `scan ${index} minus value`),
      plusValue: parseFinite(match[7]!, `scan ${index} plus value`),
      numerical: parseFinite(match[8]!, `scan ${index} numerical`),
      absoluteError: parseFinite(match[9]!, `scan ${index} absolute error`),
      scale: parseFinite(match[10]!, `scan ${index} scale`),
      scaledError: parseFinite(match[11]!, `scan ${index} scaled error`),
      status: match[12] as CheckStatus,
    };
    requireLexeme(record.index, String(index), `scan ${index} index`);
    requireLexeme(record.step, config.steps[index]!.lexeme, `scan ${index} step`);
    [record.minusPoint, record.plusPoint, record.minusValue, record.plusValue, record.numerical, record.absoluteError, record.scale, record.scaledError]
      .forEach((value, field) => requireLexeme(value, expected[field + 1]!, `scan ${index} field ${field}`));
    return record;
  });

  const tensorMatch = lines[11]!.match(tensorPattern);
  if (!tensorMatch) throw new Error('Gradient-checking trace line 12 must be TENSOR.');
  const tensor: TensorFixtureEvidence = {
    shape: parseIntegerList(tensorMatch[1]!, 'tensor shape'),
    targets: parseIntegerList(tensorMatch[2]!, 'tensor targets'),
    values: parseFiniteList(tensorMatch[3]!, 'tensor values'),
    loss: parseFinite(tensorMatch[4]!, 'tensor loss'),
    step: parseFinite(tensorMatch[5]!, 'tensor step'),
    tolerance: parseFinite(tensorMatch[6]!, 'tensor tolerance'),
  };
  requireLexemes(tensor.shape, '2,3', 'tensor shape');
  requireLexemes(tensor.targets, '0,2', 'tensor targets');
  requireLexemes(tensor.values, '0.000000000000,1.000000000000,-1.000000000000,2.000000000000,0.000000000000,-2.000000000000', 'tensor values');
  requireLexeme(tensor.loss, '2.775268796472', 'tensor loss');
  requireLexeme(tensor.step, '1.000000000000e-5', 'tensor step');
  requireLexeme(tensor.tolerance, config.tolerance.lexeme, 'tensor tolerance');

  const samplesMatch = lines[12]!.match(samplesPattern);
  if (!samplesMatch) throw new Error('Gradient-checking trace line 13 must be SAMPLES.');
  const samples: SampleSelectionEvidence = {
    requested: parseInteger(samplesMatch[1]!, 'samples requested'),
    selected: parseInteger(samplesMatch[2]!, 'samples selected'),
    flatIndices: parseIntegerList(samplesMatch[3]!, 'sample flat indices'),
    coordinates: samplesMatch[4]!.split(',').map((value, index) => parseCoordinate(value, `sample coordinate ${index}`)),
  };
  requireLexeme(samples.requested, '4', 'samples requested');
  requireLexeme(samples.selected, '4', 'samples selected');
  requireLexemes(samples.flatIndices, '0,1,3,5', 'sample flat indices');
  requireCoordinates(samples.coordinates, '0:0,0:1,1:0,1:2', 'sample coordinates');

  const coordinateExpected = [
    ['0', '0:0', '-0.377635764473', '-0.377635764481', '8.753164859598e-12'],
    ['1', '0:1', '0.332620477887', '0.332620477894', '6.763478666016e-12'],
    ['3', '1:0', '0.433406666099', '0.433406666089', '9.292122626903e-12'],
    ['5', '1:2', '-0.492061880012', '-0.492061879998', '1.425926043908e-11'],
  ] as const;
  const coordinates = coordinateExpected.map((expected, index) => {
    const match = lines[index + 13]!.match(coordinatePattern);
    if (!match) throw new Error(`Gradient-checking trace line ${index + 14} must be COORD.`);
    const record: CoordinateCheckEvidence = {
      flatIndex: parseInteger(match[1]!, `coordinate ${index} flat`),
      coordinate: parseCoordinate(match[2]!, `coordinate ${index}`),
      analytic: parseFinite(match[3]!, `coordinate ${index} analytic`),
      numerical: parseFinite(match[4]!, `coordinate ${index} numerical`),
      absoluteError: parseFinite(match[5]!, `coordinate ${index} absolute error`),
      scale: parseFinite(match[6]!, `coordinate ${index} scale`),
      scaledError: parseFinite(match[7]!, `coordinate ${index} scaled error`),
      status: 'pass',
    };
    requireLexeme(record.flatIndex, expected[0], `coordinate ${index} flat`);
    requireCoordinates([record.coordinate], expected[1], `coordinate ${index}`);
    requireLexeme(record.analytic, expected[2], `coordinate ${index} analytic`);
    requireLexeme(record.numerical, expected[3], `coordinate ${index} numerical`);
    requireLexeme(record.absoluteError, expected[4], `coordinate ${index} absolute error`);
    requireLexeme(record.scale, '1.000000000000', `coordinate ${index} scale`);
    requireLexeme(record.scaledError, expected[4], `coordinate ${index} scaled error`);
    return record;
  });

  const restorationMatch = lines[17]!.match(restorationPattern);
  if (!restorationMatch) throw new Error('Gradient-checking trace line 18 must be RESTORE.');
  const restoration = {
    exactBits: restorationMatch[1] as 'yes',
    checked: parseInteger(restorationMatch[2]!, 'restoration checked'),
  };
  requireLexeme(restoration.checked, samples.selected.lexeme, 'restoration checked');

  const invalidMatch = lines[18]!.match(invalidStepPattern);
  const collapsedMatch = lines[19]!.match(collapsedPattern);
  const nonfiniteMatch = lines[20]!.match(nonfinitePattern);
  const shapeMatch = lines[21]!.match(shapePattern);
  if (!invalidMatch || !collapsedMatch || !nonfiniteMatch || !shapeMatch) {
    throw new Error('Gradient-checking trace lines 19 through 22 must be the ordered ERROR records.');
  }
  const errors: GradientTraceError[] = [
    {
      kind: 'invalid-step',
      step: parseFinite(invalidMatch[2]!, 'invalid step'),
    },
    {
      kind: 'collapsed-perturbation',
      side: 'minus',
      point: parseFinite(collapsedMatch[3]!, 'collapsed point'),
      step: parseFinite(collapsedMatch[4]!, 'collapsed step'),
    },
    { kind: 'non-finite-evaluation', side: 'minus', value: 'NaN' },
    {
      kind: 'shape-mismatch',
      parameters: parseIntegerList(shapeMatch[2]!, 'shape parameters'),
      analytic: parseIntegerList(shapeMatch[3]!, 'shape analytic'),
    },
  ];
  const invalid = errors[0] as Extract<GradientTraceError, { kind: 'invalid-step' }>;
  requireLexeme(invalid.step, '0.000000000000', 'invalid step');
  const collapsed = errors[1] as Extract<GradientTraceError, { kind: 'collapsed-perturbation' }>;
  requireLexeme(collapsed.point, '1.000000000000', 'collapsed point');
  requireLexeme(collapsed.step, '1.000000000000e-20', 'collapsed step');
  const mismatch = errors[3] as Extract<GradientTraceError, { kind: 'shape-mismatch' }>;
  requireLexemes(mismatch.parameters, '2', 'shape parameters');
  requireLexemes(mismatch.analytic, '1,2', 'shape analytic');

  return { config, central, comparisons, stepScan, tensor, samples, coordinates, restoration, errors };
}

interface RequiredLabelGroup {
  readonly [key: string]: true | RequiredLabelGroup;
}

type RequiredLabelShape = true | RequiredLabelGroup;

const requiredLabelShape: RequiredLabelShape = {
  title: true,
  description: true,
  summary: { quadratic: true, scanPoint: true, tensorLoss: true },
  sections: { quadratic: true, scan: true, candidates: true, tensor: true, errors: true },
  fields: {
    point: true,
    step: true,
    minusProbe: true,
    center: true,
    plusProbe: true,
    functionValue: true,
    numerical: true,
    analytic: true,
    scaledError: true,
    tolerance: true,
    phase: true,
    verdict: true,
    flatIndex: true,
    coordinate: true,
    loss: true,
    restored: true,
  },
  phases: { truncation: true, converging: true, trusted: true, rounding: true },
  statuses: { pass: true, fail: true },
  errors: {
    'invalid-step': true,
    'collapsed-perturbation': true,
    'non-finite-evaluation': true,
    'shape-mismatch': true,
  },
  notes: { schematic: true, scan: true, candidates: true, tensor: true, errors: true },
  symbols: {
    truncation: true,
    converging: true,
    trusted: true,
    rounding: true,
    pass: true,
    fail: true,
    rejected: true,
  },
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
    if (!Object.prototype.hasOwnProperty.call(actual, key)) {
      throw new Error(`Diagram label ${path}.${key} is missing.`);
    }
    assertLabelShape(actual[key], childShape, `${path}.${key}`);
  }
}

export function assertGradientCheckingDiagramLabels(
  labels: GradientCheckingDiagramLabels,
): void {
  assertLabelShape(labels, requiredLabelShape, 'labels');
}
