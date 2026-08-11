export const gradientCheckingDiagramId = 'gradient-checking';

export interface TraceNumber {
  readonly lexeme: string;
  readonly value: number;
}

export type CheckStatus = 'pass' | 'fail';
export type ScanPhase = 'truncation' | 'converging' | 'trusted' | 'rounding';
export type DifferenceStencil = 'symmetric' | 'unequal';

export interface DifferenceEvidence {
  readonly requestedStep: TraceNumber;
  readonly minusPoint: TraceNumber;
  readonly centerPoint: TraceNumber;
  readonly plusPoint: TraceNumber;
  readonly minusSpacing: TraceNumber;
  readonly plusSpacing: TraceNumber;
  readonly minusValue: TraceNumber;
  readonly centerValue: TraceNumber;
  readonly plusValue: TraceNumber;
  readonly leftSlope: TraceNumber;
  readonly rightSlope: TraceNumber;
  readonly leftWeight: TraceNumber;
  readonly rightWeight: TraceNumber;
  readonly stencil: DifferenceStencil;
  readonly numerical: TraceNumber;
}

export interface CentralDifferenceEvidence extends DifferenceEvidence {
  readonly name: 'quadratic';
  readonly point: TraceNumber;
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

export interface RoundedLinearEvidence extends DifferenceEvidence {
  readonly analytic: TraceNumber;
  readonly status: 'pass';
}

export interface KinkEvidence extends DifferenceEvidence {
  readonly name: 'absolute';
  readonly knownNondifferentiable: 'yes';
  readonly oneSidedScaledGap: TraceNumber;
  readonly tolerance: TraceNumber;
  readonly consistency: 'disagree';
}

export interface StepScanEvidence extends DifferenceEvidence {
  readonly index: TraceNumber;
  readonly phase: ScanPhase;
  readonly absoluteError: TraceNumber;
  readonly scale: TraceNumber;
  readonly scaledError: TraceNumber;
  readonly status: CheckStatus;
}

export interface OracleBoundaryEvidence {
  readonly analyticPath: 'local-row-max-exp-sum-normalize-target-gradient';
  readonly objectivePath: 'indexed-mean-nll';
  readonly sharedPrimitives: 'f64-exp,frozen-inputs-and-targets';
  readonly materialCoursePath: 'separate';
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
  readonly requestedStep: TraceNumber;
  readonly tolerance: TraceNumber;
}

export interface SampleSelectionEvidence {
  readonly requested: TraceNumber;
  readonly selected: TraceNumber;
  readonly flatIndices: readonly TraceNumber[];
  readonly coordinates: readonly TraceCoordinate[];
}

export interface CoordinateCheckEvidence extends DifferenceEvidence {
  readonly flatIndex: TraceNumber;
  readonly coordinate: TraceCoordinate;
  readonly analytic: TraceNumber;
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
  readonly roundedLinear: RoundedLinearEvidence;
  readonly kink: KinkEvidence;
  readonly stepScan: readonly StepScanEvidence[];
  readonly oracle: OracleBoundaryEvidence;
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
  readonly display: {
    readonly summaryQuadratic: string;
    readonly numerical: string;
    readonly analytic: string;
    readonly scaledError: string;
  };
  readonly sections: {
    readonly quadratic: string;
    readonly scan: string;
    readonly candidates: string;
    readonly tensor: string;
    readonly boundaries: string;
    readonly errors: string;
  };
  readonly fields: {
    readonly requestedStep: string;
    readonly minusProbe: string;
    readonly minusSpacing: string;
    readonly center: string;
    readonly plusProbe: string;
    readonly plusSpacing: string;
    readonly leftSlope: string;
    readonly rightSlope: string;
    readonly stencil: string;
    readonly numerical: string;
    readonly analytic: string;
    readonly scaledError: string;
    readonly tolerance: string;
    readonly phase: string;
    readonly restored: string;
  };
  readonly phases: Record<ScanPhase, string>;
  readonly statuses: Record<CheckStatus, string> & { readonly restored: string };
  readonly sides: { readonly minus: string };
  readonly errors: Record<GradientTraceError['kind'], string>;
  readonly notes: {
    readonly tensor: string;
    readonly boundaries: string;
    readonly oracle: string;
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

const beginMarker = 'TRACE gradient-checking-v2 BEGIN';
const endMarker = 'TRACE gradient-checking-v2 END';
const expectedGradientCheckingTrace = String.raw`TRACE gradient-checking-v2 BEGIN
CONFIG point=1.500000000000 analytic=4.750000000000 tolerance=1.000000000000e-6 steps=1.000000000000e0,1.000000000000e-1,1.000000000000e-3,1.000000000000e-5,1.000000000000e-13,1.000000000000e-15
CENTRAL name=quadratic point=3.000000000000 requested-step=1.00000000000000006e-1 minus-point=2.900000000000 center-point=3.000000000000 plus-point=3.100000000000 minus-spacing=1.00000000000000089e-1 plus-spacing=1.00000000000000089e-1 minus-value=8.410000000000 center-value=9.000000000000 plus-value=9.610000000000 left-slope=5.900000000000 right-slope=6.100000000000 left-weight=5.00000000000000000e-1 right-weight=5.00000000000000000e-1 stencil=symmetric numerical=6.000000000000
COMPARE name=quadratic-correct analytic=6.000000000000 numerical=6.000000000000 absolute-error=0.000000000000e0 scale=6.000000000000 scaled-error=0.000000000000e0 tolerance=1.000000000000e-6 status=pass
COMPARE name=quadratic-wrong analytic=5.500000000000 numerical=6.000000000000 absolute-error=5.000000000000e-1 scale=6.000000000000 scaled-error=8.333333333333e-2 tolerance=1.000000000000e-6 status=fail
ROUNDED-LINEAR analytic=1.000000000000 status=pass requested-step=1.33226762955018780e-16 minus-point=1.000000000000 center-point=1.000000000000 plus-point=1.000000000000 minus-spacing=1.11022302462515654e-16 plus-spacing=2.22044604925031308e-16 minus-value=1.000000000000 center-value=1.000000000000 plus-value=1.000000000000 left-slope=1.000000000000 right-slope=1.000000000000 left-weight=6.66666666666666630e-1 right-weight=3.33333333333333315e-1 stencil=unequal numerical=1.000000000000
KINK name=absolute known-nondifferentiable=yes one-sided-scaled-gap=2.000000000000e0 tolerance=1.000000000000e-12 consistency=disagree requested-step=1.00000000000000006e-1 minus-point=-0.100000000000 center-point=0.000000000000 plus-point=0.100000000000 minus-spacing=1.00000000000000006e-1 plus-spacing=1.00000000000000006e-1 minus-value=0.100000000000 center-value=0.000000000000 plus-value=0.100000000000 left-slope=-1.000000000000 right-slope=1.000000000000 left-weight=5.00000000000000000e-1 right-weight=5.00000000000000000e-1 stencil=symmetric numerical=0.000000000000
H-SCAN index=0 phase=truncation requested-step=1.00000000000000000e0 minus-point=0.500000000000 center-point=1.500000000000 plus-point=2.500000000000 minus-spacing=1.00000000000000000e0 plus-spacing=1.00000000000000000e0 minus-value=-0.875000000000 center-value=0.375000000000 plus-value=10.625000000000 left-slope=1.250000000000 right-slope=10.250000000000 left-weight=5.00000000000000000e-1 right-weight=5.00000000000000000e-1 stencil=symmetric numerical=5.750000000000 absolute-error=1.000000000000e0 scale=5.750000000000 scaled-error=1.739130434783e-1 status=fail
H-SCAN index=1 phase=truncation requested-step=1.00000000000000006e-1 minus-point=1.400000000000 center-point=1.500000000000 plus-point=1.600000000000 minus-spacing=1.00000000000000089e-1 plus-spacing=1.00000000000000089e-1 minus-value=-0.056000000000 center-value=0.375000000000 plus-value=0.896000000000 left-slope=4.310000000000 right-slope=5.210000000000 left-weight=5.00000000000000000e-1 right-weight=5.00000000000000000e-1 stencil=symmetric numerical=4.760000000000 absolute-error=1.000000000000e-2 scale=4.760000000000 scaled-error=2.100840336135e-3 status=fail
H-SCAN index=2 phase=converging requested-step=1.00000000000000002e-3 minus-point=1.499000000000 center-point=1.500000000000 plus-point=1.501000000000 minus-spacing=9.99999999999889866e-4 plus-spacing=9.99999999999889866e-4 minus-value=0.370254499000 center-value=0.375000000000 plus-value=0.379754501000 left-slope=4.745501000000 right-slope=4.754501000000 left-weight=5.00000000000000000e-1 right-weight=5.00000000000000000e-1 stencil=symmetric numerical=4.750001000000 absolute-error=1.000000193763e-6 scale=4.750001000000 scaled-error=2.105263122720e-7 status=pass
H-SCAN index=3 phase=trusted requested-step=1.00000000000000008e-5 minus-point=1.499990000000 center-point=1.500000000000 plus-point=1.500010000000 minus-spacing=1.00000000000655120e-5 plus-spacing=1.00000000000655120e-5 minus-value=0.374952500450 center-value=0.375000000000 plus-value=0.375047500450 left-slope=4.749955000096 right-slope=4.750045000104 left-weight=5.00000000000000000e-1 right-weight=5.00000000000000000e-1 stencil=symmetric numerical=4.750000000100 absolute-error=9.992007221626e-11 scale=4.750000000100 scaled-error=2.103583973678e-11 status=pass
H-SCAN index=4 phase=rounding requested-step=1.00000000000000003e-13 minus-point=1.500000000000 center-point=1.500000000000 plus-point=1.500000000000 minus-spacing=9.99200722162640886e-14 plus-spacing=9.99200722162640886e-14 minus-value=0.375000000000 center-value=0.375000000000 plus-value=0.375000000000 left-slope=4.751111111111 right-slope=4.751111111111 left-weight=5.00000000000000000e-1 right-weight=5.00000000000000000e-1 stencil=symmetric numerical=4.751111111111 absolute-error=1.111111111111e-3 scale=4.751111111111 scaled-error=2.338634237605e-4 status=fail
H-SCAN index=5 phase=rounding requested-step=1.00000000000000008e-15 minus-point=1.500000000000 center-point=1.500000000000 plus-point=1.500000000000 minus-spacing=1.11022302462515654e-15 plus-spacing=1.11022302462515654e-15 minus-value=0.375000000000 center-value=0.375000000000 plus-value=0.375000000000 left-slope=4.400000000000 right-slope=5.200000000000 left-weight=5.00000000000000000e-1 right-weight=5.00000000000000000e-1 stencil=symmetric numerical=4.800000000000 absolute-error=5.000000000000e-2 scale=4.800000000000 scaled-error=1.041666666667e-2 status=fail
ORACLE analytic-path=local-row-max-exp-sum-normalize-target-gradient objective-path=indexed-mean-nll shared-primitives=f64-exp,frozen-inputs-and-targets material-course-path=separate
TENSOR shape=2,3 targets=0,2 values=0.000000000000,1.000000000000,-1.000000000000,2.000000000000,0.000000000000,-2.000000000000 loss=2.775268796472 requested-step=1.00000000000000008e-5 tolerance=1.000000000000e-6
SAMPLES requested=4 selected=4 flat=0,1,3,5 coordinates=0:0,0:1,1:0,1:2
COORD flat=0 coordinate=0:0 analytic=-0.377635764473 requested-step=1.00000000000000008e-5 minus-point=-0.000010000000 center-point=0.000000000000 plus-point=0.000010000000 minus-spacing=1.00000000000000008e-5 plus-spacing=1.00000000000000008e-5 minus-value=2.775272572834 center-value=2.775268796472 plus-value=2.775265020119 left-slope=-0.377636226556 right-slope=-0.377635302407 left-weight=5.00000000000000000e-1 right-weight=5.00000000000000000e-1 stencil=symmetric numerical=-0.377635764481 absolute-error=8.753164859598e-12 scale=1.000000000000 scaled-error=8.753164859598e-12 status=pass
COORD flat=1 coordinate=0:1 analytic=0.332620477887 requested-step=1.00000000000000008e-5 minus-point=0.999990000000 center-point=1.000000000000 plus-point=1.000010000000 minus-spacing=9.99999999995448974e-6 plus-spacing=1.00000000000655120e-5 minus-value=2.775265470273 center-value=2.775268796472 plus-value=2.775272122682 left-slope=0.332619921163 right-slope=0.332621034624 left-weight=5.00000000002775558e-1 right-weight=4.99999999997224442e-1 stencil=unequal numerical=0.332620477894 absolute-error=6.430855847839e-12 scale=1.000000000000 scaled-error=6.430855847839e-12 status=pass
COORD flat=3 coordinate=1:0 analytic=0.433406666099 requested-step=1.00000000000000008e-5 minus-point=1.999990000000 center-point=2.000000000000 plus-point=2.000010000000 minus-spacing=1.00000000000655120e-5 plus-spacing=1.00000000000655120e-5 minus-value=2.775264462408 center-value=2.775268796472 plus-value=2.775273130542 left-slope=0.433406377451 right-slope=0.433406954722 left-weight=5.00000000000000000e-1 right-weight=5.00000000000000000e-1 stencil=symmetric numerical=0.433406666087 absolute-error=1.213129596778e-11 scale=1.000000000000 scaled-error=1.213129596778e-11 status=pass
COORD flat=5 coordinate=1:2 analytic=-0.492061880012 requested-step=1.00000000000000008e-5 minus-point=-2.000010000000 center-point=-2.000000000000 plus-point=-1.999990000000 minus-spacing=1.00000000000655120e-5 plus-spacing=1.00000000000655120e-5 minus-value=2.775273717091 center-value=2.775268796472 plus-value=2.775263875854 left-slope=-0.492061919074 right-slope=-0.492061840914 left-weight=5.00000000000000000e-1 right-weight=5.00000000000000000e-1 stencil=symmetric numerical=-0.492061879994 absolute-error=1.748279299107e-11 scale=1.000000000000 scaled-error=1.748279299107e-11 status=pass
RESTORE exact-bits=yes checked=4
ERROR kind=invalid-step step=0.000000000000
ERROR kind=collapsed-perturbation side=minus point=1.000000000000 step=1.000000000000e-20
ERROR kind=non-finite-evaluation side=minus value=NaN
ERROR kind=shape-mismatch parameters=2 analytic=1,2
TRACE gradient-checking-v2 END
`;
const integer = '(?:0|[1-9]\\d*)';
const integerList = `${integer}(?:,${integer})*`;
const fixed = '-?(?:0|[1-9]\\d*)\\.\\d{12}';
const fixedList = `${fixed}(?:,${fixed})*`;
const scientific = '-?(?:0|[1-9]\\d*)\\.\\d{12}e(?:0|[1-9]\\d*|-[1-9]\\d*)';
const scientificList = `${scientific}(?:,${scientific})*`;
const exactScientific = '-?(?:0|[1-9]\\d*)\\.\\d{17}e(?:0|[1-9]\\d*|-[1-9]\\d*)';
const coordinate = `${integer}:${integer}`;
const coordinateList = `${coordinate}(?:,${coordinate})*`;
const differenceFields =
  `requested-step=(${exactScientific}) minus-point=(${fixed}) center-point=(${fixed}) plus-point=(${fixed}) `
  + `minus-spacing=(${exactScientific}) plus-spacing=(${exactScientific}) minus-value=(${fixed}) center-value=(${fixed}) plus-value=(${fixed}) `
  + `left-slope=(${fixed}) right-slope=(${fixed}) left-weight=(${exactScientific}) right-weight=(${exactScientific}) `
  + `stencil=(symmetric|unequal) numerical=(${fixed})`;

const configPattern = new RegExp(
  `^CONFIG point=(${fixed}) analytic=(${fixed}) tolerance=(${scientific}) steps=(${scientificList})$`,
);
const centralPattern = new RegExp(
  `^CENTRAL name=(quadratic) point=(${fixed}) ${differenceFields}$`,
);
const comparisonPattern = new RegExp(
  `^COMPARE name=(quadratic-correct|quadratic-wrong) analytic=(${fixed}) numerical=(${fixed}) absolute-error=(${scientific}) scale=(${fixed}) scaled-error=(${scientific}) tolerance=(${scientific}) status=(pass|fail)$`,
);
const roundedPattern = new RegExp(
  `^ROUNDED-LINEAR analytic=(${fixed}) status=(pass) ${differenceFields}$`,
);
const kinkPattern = new RegExp(
  `^KINK name=(absolute) known-nondifferentiable=(yes) one-sided-scaled-gap=(${scientific}) tolerance=(${scientific}) consistency=(disagree) ${differenceFields}$`,
);
const scanPattern = new RegExp(
  `^H-SCAN index=(${integer}) phase=(truncation|converging|trusted|rounding) ${differenceFields} absolute-error=(${scientific}) scale=(${fixed}) scaled-error=(${scientific}) status=(pass|fail)$`,
);
const oraclePattern = /^ORACLE analytic-path=(local-row-max-exp-sum-normalize-target-gradient) objective-path=(indexed-mean-nll) shared-primitives=(f64-exp,frozen-inputs-and-targets) material-course-path=(separate)$/;
const tensorPattern = new RegExp(
  `^TENSOR shape=(${integerList}) targets=(${integerList}) values=(${fixedList}) loss=(${fixed}) requested-step=(${exactScientific}) tolerance=(${scientific})$`,
);
const samplesPattern = new RegExp(
  `^SAMPLES requested=(${integer}) selected=(${integer}) flat=(${integerList}) coordinates=(${coordinateList})$`,
);
const coordinatePattern = new RegExp(
  `^COORD flat=(${integer}) coordinate=(${coordinate}) analytic=(${fixed}) ${differenceFields} absolute-error=(${scientific}) scale=(${fixed}) scaled-error=(${scientific}) status=(pass)$`,
);
const restorationPattern = new RegExp(`^RESTORE exact-bits=(yes) checked=(${integer})$`);
const invalidStepPattern = new RegExp(`^ERROR kind=(invalid-step) step=(${fixed})$`);
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

function requireMatch(
  line: string,
  pattern: RegExp,
  lineNumber: number,
  record: string,
): RegExpMatchArray {
  const match = line.match(pattern);
  if (!match) {
    throw new Error(`Gradient-checking trace line ${lineNumber} must be ${record}.`);
  }
  return match;
}

function parseDifference(
  match: RegExpMatchArray,
  offset: number,
  label: string,
): DifferenceEvidence {
  return {
    requestedStep: parseFinite(match[offset]!, `${label} requested step`),
    minusPoint: parseFinite(match[offset + 1]!, `${label} minus point`),
    centerPoint: parseFinite(match[offset + 2]!, `${label} center point`),
    plusPoint: parseFinite(match[offset + 3]!, `${label} plus point`),
    minusSpacing: parseFinite(match[offset + 4]!, `${label} minus spacing`),
    plusSpacing: parseFinite(match[offset + 5]!, `${label} plus spacing`),
    minusValue: parseFinite(match[offset + 6]!, `${label} minus value`),
    centerValue: parseFinite(match[offset + 7]!, `${label} center value`),
    plusValue: parseFinite(match[offset + 8]!, `${label} plus value`),
    leftSlope: parseFinite(match[offset + 9]!, `${label} left slope`),
    rightSlope: parseFinite(match[offset + 10]!, `${label} right slope`),
    leftWeight: parseFinite(match[offset + 11]!, `${label} left weight`),
    rightWeight: parseFinite(match[offset + 12]!, `${label} right weight`),
    stencil: match[offset + 13] as DifferenceStencil,
    numerical: parseFinite(match[offset + 14]!, `${label} numerical gradient`),
  };
}

/** Parses Rust-authored lexemes without differentiating, scaling errors, or sampling. */
export function parseGradientCheckingTrace(stdout: string): GradientCheckingTrace {
  if (stdout.includes('\r')) {
    throw new Error('Gradient-checking trace must use LF line endings.');
  }
  if (!stdout.endsWith('\n') || stdout.endsWith('\n\n')) {
    throw new Error('Gradient-checking trace must end with exactly one LF.');
  }
  if (stdout !== expectedGradientCheckingTrace) {
    throw new Error(
      'Gradient-checking trace must match the exact ordered Rust v2 schema and values.',
    );
  }
  const lines = stdout.slice(0, -1).split('\n');
  if (lines.length !== 26 || lines[0] !== beginMarker || lines[25] !== endMarker) {
    throw new Error('Gradient-checking trace must contain one exact ordered 26-line v2 block.');
  }

  const configMatch = requireMatch(lines[1]!, configPattern, 2, 'CONFIG');
  const config = {
    point: parseFinite(configMatch[1]!, 'config point'),
    analytic: parseFinite(configMatch[2]!, 'config analytic'),
    tolerance: parseFinite(configMatch[3]!, 'config tolerance'),
    steps: parseFiniteList(configMatch[4]!, 'config steps'),
  };

  const centralMatch = requireMatch(lines[2]!, centralPattern, 3, 'CENTRAL');
  const central: CentralDifferenceEvidence = {
    name: 'quadratic',
    point: parseFinite(centralMatch[2]!, 'central point'),
    ...parseDifference(centralMatch, 3, 'central'),
  };

  const comparisonNames = ['quadratic-correct', 'quadratic-wrong'] as const;
  const comparisonStatuses = ['pass', 'fail'] as const;
  const comparisons = comparisonNames.map((name, index): GradientComparisonEvidence => {
    const lineNumber = index + 4;
    const match = requireMatch(lines[index + 3]!, comparisonPattern, lineNumber, 'COMPARE');
    if (match[1] !== name || match[8] !== comparisonStatuses[index]) {
      throw new Error(`Gradient-checking trace line ${lineNumber} has the wrong COMPARE identity.`);
    }
    return {
      name,
      analytic: parseFinite(match[2]!, `${name} analytic`),
      numerical: parseFinite(match[3]!, `${name} numerical`),
      absoluteError: parseFinite(match[4]!, `${name} absolute error`),
      scale: parseFinite(match[5]!, `${name} scale`),
      scaledError: parseFinite(match[6]!, `${name} scaled error`),
      tolerance: parseFinite(match[7]!, `${name} tolerance`),
      status: comparisonStatuses[index]!,
    };
  });

  const roundedMatch = requireMatch(lines[5]!, roundedPattern, 6, 'ROUNDED-LINEAR');
  const roundedLinear: RoundedLinearEvidence = {
    analytic: parseFinite(roundedMatch[1]!, 'rounded linear analytic'),
    status: 'pass',
    ...parseDifference(roundedMatch, 3, 'rounded linear'),
  };

  const kinkMatch = requireMatch(lines[6]!, kinkPattern, 7, 'KINK');
  const kink: KinkEvidence = {
    name: 'absolute',
    knownNondifferentiable: 'yes',
    oneSidedScaledGap: parseFinite(kinkMatch[3]!, 'kink one-sided scaled gap'),
    tolerance: parseFinite(kinkMatch[4]!, 'kink tolerance'),
    consistency: 'disagree',
    ...parseDifference(kinkMatch, 6, 'kink'),
  };

  const scanPhases = [
    'truncation',
    'truncation',
    'converging',
    'trusted',
    'rounding',
    'rounding',
  ] as const;
  const scanStatuses = ['fail', 'fail', 'pass', 'pass', 'fail', 'fail'] as const;
  const stepScan = scanPhases.map((phase, index): StepScanEvidence => {
    const lineNumber = index + 8;
    const match = requireMatch(lines[index + 7]!, scanPattern, lineNumber, 'H-SCAN');
    if (match[1] !== String(index) || match[2] !== phase || match[21] !== scanStatuses[index]) {
      throw new Error(`Gradient-checking trace line ${lineNumber} has the wrong H-SCAN identity.`);
    }
    return {
      index: parseInteger(match[1]!, `scan ${index} index`),
      phase,
      ...parseDifference(match, 3, `scan ${index}`),
      absoluteError: parseFinite(match[18]!, `scan ${index} absolute error`),
      scale: parseFinite(match[19]!, `scan ${index} scale`),
      scaledError: parseFinite(match[20]!, `scan ${index} scaled error`),
      status: scanStatuses[index]!,
    };
  });

  const oracleMatch = requireMatch(lines[13]!, oraclePattern, 14, 'ORACLE');
  const oracle: OracleBoundaryEvidence = {
    analyticPath: oracleMatch[1] as OracleBoundaryEvidence['analyticPath'],
    objectivePath: oracleMatch[2] as OracleBoundaryEvidence['objectivePath'],
    sharedPrimitives: oracleMatch[3] as OracleBoundaryEvidence['sharedPrimitives'],
    materialCoursePath: oracleMatch[4] as OracleBoundaryEvidence['materialCoursePath'],
  };

  const tensorMatch = requireMatch(lines[14]!, tensorPattern, 15, 'TENSOR');
  const tensor: TensorFixtureEvidence = {
    shape: parseIntegerList(tensorMatch[1]!, 'tensor shape'),
    targets: parseIntegerList(tensorMatch[2]!, 'tensor targets'),
    values: parseFiniteList(tensorMatch[3]!, 'tensor values'),
    loss: parseFinite(tensorMatch[4]!, 'tensor loss'),
    requestedStep: parseFinite(tensorMatch[5]!, 'tensor requested step'),
    tolerance: parseFinite(tensorMatch[6]!, 'tensor tolerance'),
  };

  const samplesMatch = requireMatch(lines[15]!, samplesPattern, 16, 'SAMPLES');
  const samples: SampleSelectionEvidence = {
    requested: parseInteger(samplesMatch[1]!, 'samples requested'),
    selected: parseInteger(samplesMatch[2]!, 'samples selected'),
    flatIndices: parseIntegerList(samplesMatch[3]!, 'sample flat indices'),
    coordinates: samplesMatch[4]!
      .split(',')
      .map((value, index) => parseCoordinate(value, `sample coordinate ${index}`)),
  };

  const coordinates = [0, 1, 2, 3].map((index): CoordinateCheckEvidence => {
    const lineNumber = index + 17;
    const match = requireMatch(lines[index + 16]!, coordinatePattern, lineNumber, 'COORD');
    return {
      flatIndex: parseInteger(match[1]!, `coordinate ${index} flat index`),
      coordinate: parseCoordinate(match[2]!, `coordinate ${index}`),
      analytic: parseFinite(match[3]!, `coordinate ${index} analytic`),
      ...parseDifference(match, 4, `coordinate ${index}`),
      absoluteError: parseFinite(match[19]!, `coordinate ${index} absolute error`),
      scale: parseFinite(match[20]!, `coordinate ${index} scale`),
      scaledError: parseFinite(match[21]!, `coordinate ${index} scaled error`),
      status: 'pass',
    };
  });

  const restorationMatch = requireMatch(lines[20]!, restorationPattern, 21, 'RESTORE');
  const restoration = {
    exactBits: restorationMatch[1] as 'yes',
    checked: parseInteger(restorationMatch[2]!, 'restoration checked'),
  };

  const invalidMatch = requireMatch(lines[21]!, invalidStepPattern, 22, 'invalid-step ERROR');
  const collapsedMatch = requireMatch(
    lines[22]!,
    collapsedPattern,
    23,
    'collapsed-perturbation ERROR',
  );
  requireMatch(lines[23]!, nonfinitePattern, 24, 'non-finite-evaluation ERROR');
  const shapeMatch = requireMatch(lines[24]!, shapePattern, 25, 'shape-mismatch ERROR');
  const errors: GradientTraceError[] = [
    { kind: 'invalid-step', step: parseFinite(invalidMatch[2]!, 'invalid step') },
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

  return {
    config,
    central,
    comparisons,
    roundedLinear,
    kink,
    stepScan,
    oracle,
    tensor,
    samples,
    coordinates,
    restoration,
    errors,
  };
}

interface RequiredLabelGroup {
  readonly [key: string]: true | RequiredLabelGroup;
}

type RequiredLabelShape = true | RequiredLabelGroup;

const requiredLabelShape: RequiredLabelShape = {
  title: true,
  description: true,
  summary: { quadratic: true, scanPoint: true, tensorLoss: true },
  display: {
    summaryQuadratic: true,
    numerical: true,
    analytic: true,
    scaledError: true,
  },
  sections: {
    quadratic: true,
    scan: true,
    candidates: true,
    tensor: true,
    boundaries: true,
    errors: true,
  },
  fields: {
    requestedStep: true,
    minusProbe: true,
    minusSpacing: true,
    center: true,
    plusProbe: true,
    plusSpacing: true,
    leftSlope: true,
    rightSlope: true,
    stencil: true,
    numerical: true,
    analytic: true,
    scaledError: true,
    tolerance: true,
    phase: true,
    restored: true,
  },
  phases: { truncation: true, converging: true, trusted: true, rounding: true },
  statuses: { pass: true, fail: true, restored: true },
  sides: { minus: true },
  errors: {
    'invalid-step': true,
    'collapsed-perturbation': true,
    'non-finite-evaluation': true,
    'shape-mismatch': true,
  },
  notes: { tensor: true, boundaries: true, oracle: true, errors: true },
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
  for (const key of Object.keys(actual)) {
    if (!Object.prototype.hasOwnProperty.call(shape, key)) {
      throw new Error(`Diagram label ${path}.${key} is unexpected.`);
    }
  }
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
