export const bigramBaselineDiagramId = 'bigram-baseline';

export type BigramTokenRole = 'boundary' | 'content' | 'unseen';

export interface BigramTraceConfig {
  vocabularySize: number;
  alpha: number;
  alphaDisplay: string;
  documentCount: number;
  transitionCount: number;
}

export interface BigramTraceToken {
  id: number;
  symbol: string;
  role: BigramTokenRole;
}

export interface BigramTraceDocument {
  id: string;
  tokens: readonly number[];
}

export interface BigramTraceRow {
  context: number;
  symbol: string;
  counts: readonly number[];
  total: number;
  pseudocount: string;
  numerators: readonly string[];
  denominator: string;
  mle: readonly string[] | null;
  smoothed: readonly string[];
}

export interface BigramBoundaryGuard {
  forbiddenFrom: number;
  forbiddenTo: number;
}

export interface BigramBaselineTrace {
  config: BigramTraceConfig;
  tokens: readonly BigramTraceToken[];
  documents: readonly BigramTraceDocument[];
  rows: readonly BigramTraceRow[];
  boundary: BigramBoundaryGuard;
}

export interface BigramBaselineDiagramLabels {
  title: string;
  description: string;
  summary: Readonly<{
    vocabularySize: string;
    alpha: string;
    trainingDocuments: string;
    countedTransitions: string;
  }>;
  sections: Readonly<{
    trainingDocuments: string;
    tokenLegend: string;
    knownContext: string;
    unseenContext: string;
    boundaryGuard: string;
  }>;
  fields: Readonly<{
    document: string;
    context: string;
    rowTotal: string;
    denominator: string;
  }>;
  columns: Readonly<{
    nextToken: string;
    count: string;
    pseudocount: string;
    smoothedNumerator: string;
    mle: string;
    smoothed: string;
  }>;
  values: Readonly<{
    undefinedMle: string;
    boundaryTransition: string;
  }>;
  roles: Readonly<Record<BigramTokenRole, string>>;
  notes: Readonly<{
    countOnce: string;
    unseenSuccessor: string;
    unseenContext: string;
    boundary: string;
  }>;
}

const beginMarker = 'TRACE bigram-baseline-v2 BEGIN';
const endMarker = 'TRACE bigram-baseline-v2 END';
const integer = '(?:0|[1-9][0-9]*)';
const decimal = '(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?';
const identifier = '([a-z][a-z0-9]*(?:-[a-z0-9]+)*)';
const symbol = '([A-Z][A-Z0-9_-]*)';
const integerList = `${integer}(?:,${integer})*`;
const decimalList = `${decimal}(?:,${decimal})*`;
const configPattern = new RegExp(
  `^CONFIG vocabulary=(${integer}) alpha=(${decimal}) documents=(${integer}) transitions=(${integer})$`,
);
const tokenPattern = new RegExp(
  `^TOKEN id=(${integer}) symbol=${symbol} role=(boundary|content|unseen)$`,
);
const documentPattern = new RegExp(`^DOCUMENT id=${identifier} tokens=(${integerList})$`);
const rowPattern = new RegExp(
  `^ROW context=(${integer}) symbol=${symbol} counts=(${integerList}) total=(${integer}) pseudocount=(${decimal}) numerators=(${decimalList}) denominator=(${decimal}) mle=(undefined|${decimalList}) smoothed=(${decimalList})$`,
);
const boundaryPattern = new RegExp(
  `^BOUNDARY forbidden-from=(${integer}) forbidden-to=(${integer})$`,
);

function parseSafeInteger(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Bigram trace ${label} is not a safe nonnegative integer.`);
  }
  return parsed;
}

function parsePositiveDecimal(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Bigram trace ${label} must be a finite positive number.`);
  }
  return parsed;
}

function parseIntegerList(value: string, label: string): number[] {
  return value.split(',').map((part, index) => parseSafeInteger(part, `${label}[${index}]`));
}

function parseDecimalDisplays(value: string, label: string): string[] {
  return value.split(',').map((part, index) => {
    const parsed = Number(part);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
      throw new Error(`Bigram trace ${label}[${index}] is not a probability.`);
    }
    return part;
  });
}

function parseNonnegativeDecimalDisplays(value: string, label: string): string[] {
  return value.split(',').map((part, index) => {
    const parsed = Number(part);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error(`Bigram trace ${label}[${index}] is not a finite nonnegative number.`);
    }
    return part;
  });
}

function assertLength(values: readonly unknown[], expected: number, label: string): void {
  if (values.length !== expected) {
    throw new Error(`Bigram trace ${label} has ${values.length} entries, not vocabulary size ${expected}.`);
  }
}

function nearlyEqual(actual: number, expected: number, tolerance = 0.000_51): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

function assertPrintedDistribution(
  displays: readonly string[],
  expected: readonly number[],
  label: string,
): void {
  displays.forEach((display, index) => {
    if (!nearlyEqual(Number(display), expected[index])) {
      throw new Error(`Bigram trace ${label}[${index}] disagrees with its counts and formula.`);
    }
  });
  if (!nearlyEqual(displays.reduce((sum, value) => sum + Number(value), 0), 1, 0.001_1)) {
    throw new Error(`Bigram trace ${label} does not sum to one at its printed precision.`);
  }
}

function expectedCountsForContext(
  documents: readonly BigramTraceDocument[],
  context: number,
  vocabularySize: number,
): number[] {
  const counts = Array.from({ length: vocabularySize }, () => 0);
  for (const document of documents) {
    for (let position = 0; position + 1 < document.tokens.length; position += 1) {
      if (document.tokens[position] === context) counts[document.tokens[position + 1]] += 1;
    }
  }
  return counts;
}

function equalNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** Parses and verifies the Rust-authored trace; it never invents display values. */
export function parseBigramBaselineTrace(stdout: string): BigramBaselineTrace {
  const lines = stdout.split(/\r?\n/);
  const beginIndices = lines.flatMap((line, index) => (line === beginMarker ? [index] : []));
  const endIndices = lines.flatMap((line, index) => (line === endMarker ? [index] : []));
  if (beginIndices.length !== 1 || endIndices.length !== 1 || endIndices[0] <= beginIndices[0]) {
    throw new Error('Bigram trace must contain exactly one ordered BEGIN/END block.');
  }

  const traceLines = lines.slice(beginIndices[0] + 1, endIndices[0]);
  let cursor = 0;
  const configMatch = traceLines[cursor]?.match(configPattern);
  if (!configMatch) throw new Error('Bigram trace is missing its exact CONFIG line.');
  const config: BigramTraceConfig = {
    vocabularySize: parseSafeInteger(configMatch[1], 'vocabulary size'),
    alpha: parsePositiveDecimal(configMatch[2], 'alpha'),
    alphaDisplay: configMatch[2],
    documentCount: parseSafeInteger(configMatch[3], 'document count'),
    transitionCount: parseSafeInteger(configMatch[4], 'transition count'),
  };
  if (config.vocabularySize === 0 || config.documentCount === 0) {
    throw new Error('Bigram trace requires a nonempty vocabulary and at least one document.');
  }
  cursor += 1;

  const tokens: BigramTraceToken[] = [];
  for (let expectedId = 0; expectedId < config.vocabularySize; expectedId += 1) {
    const match = traceLines[cursor]?.match(tokenPattern);
    if (!match) throw new Error(`Bigram trace is missing TOKEN ${expectedId}.`);
    const id = parseSafeInteger(match[1], 'token ID');
    if (id !== expectedId) throw new Error(`Bigram trace expected TOKEN ${expectedId}, not ${id}.`);
    if (tokens.some((token) => token.symbol === match[2])) {
      throw new Error(`Bigram trace repeats token symbol ${match[2]}.`);
    }
    tokens.push({ id, symbol: match[2], role: match[3] as BigramTokenRole });
    cursor += 1;
  }

  const bos = tokens.find((token) => token.symbol === 'BOS');
  const eos = tokens.find((token) => token.symbol === 'EOS');
  if (!bos || !eos || bos.role !== 'boundary' || eos.role !== 'boundary') {
    throw new Error('Bigram trace must identify BOS and EOS as boundary tokens.');
  }

  const documents: BigramTraceDocument[] = [];
  const documentIds = new Set<string>();
  for (let index = 0; index < config.documentCount; index += 1) {
    const match = traceLines[cursor]?.match(documentPattern);
    if (!match) throw new Error(`Bigram trace is missing training document ${index + 1}.`);
    const id = match[1];
    if (documentIds.has(id)) throw new Error(`Bigram trace repeats document ${id}.`);
    documentIds.add(id);
    const documentTokens = parseIntegerList(match[2], `${id} token`);
    if (documentTokens.length < 2 || documentTokens[0] !== bos.id || documentTokens.at(-1) !== eos.id) {
      throw new Error(`Bigram trace document ${id} is not wrapped by its declared BOS and EOS.`);
    }
    if (documentTokens.some((token) => token >= config.vocabularySize)) {
      throw new Error(`Bigram trace document ${id} contains an out-of-range token ID.`);
    }
    if (documentTokens.slice(1, -1).some((token) => token === bos.id || token === eos.id)) {
      throw new Error(`Bigram trace document ${id} contains an interior boundary token.`);
    }
    documents.push({ id, tokens: documentTokens });
    cursor += 1;
  }

  const actualTransitions = documents.reduce((sum, document) => sum + document.tokens.length - 1, 0);
  if (actualTransitions !== config.transitionCount) {
    throw new Error('Bigram trace transition count disagrees with its separate documents.');
  }
  for (const token of tokens.filter((candidate) => candidate.role === 'unseen')) {
    if (documents.some((document) => document.tokens.includes(token.id))) {
      throw new Error(`Bigram trace token ${token.symbol} is marked unseen but occurs in training data.`);
    }
  }

  const rows: BigramTraceRow[] = [];
  const seenContexts = new Set<number>();
  while (traceLines[cursor]?.startsWith('ROW ')) {
    const match = traceLines[cursor].match(rowPattern);
    if (!match) throw new Error('Bigram trace contains an invalid ROW line.');
    const context = parseSafeInteger(match[1], 'row context');
    if (context >= config.vocabularySize) throw new Error('Bigram trace ROW context is out of range.');
    if (seenContexts.has(context)) throw new Error(`Bigram trace repeats context row ${context}.`);
    seenContexts.add(context);
    if (tokens[context].symbol !== match[2]) {
      throw new Error(`Bigram trace row ${context} has the wrong token symbol.`);
    }
    const counts = parseIntegerList(match[3], `row ${context} count`);
    assertLength(counts, config.vocabularySize, `row ${context} counts`);
    const expectedCounts = expectedCountsForContext(documents, context, config.vocabularySize);
    if (!equalNumbers(counts, expectedCounts)) {
      throw new Error(`Bigram trace row ${context} disagrees with its training documents.`);
    }
    const total = parseSafeInteger(match[4], `row ${context} total`);
    if (counts.reduce((sum, count) => sum + count, 0) !== total) {
      throw new Error(`Bigram trace row ${context} total disagrees with its counts.`);
    }
    const pseudocountValue = parsePositiveDecimal(match[5], `row ${context} pseudocount`);
    if (!nearlyEqual(pseudocountValue, config.alpha, 1e-9)) {
      throw new Error(`Bigram trace row ${context} pseudocount disagrees with alpha.`);
    }
    const numerators = parseNonnegativeDecimalDisplays(match[6], `row ${context} numerator`);
    assertLength(numerators, config.vocabularySize, `row ${context} numerators`);
    numerators.forEach((numerator, index) => {
      if (!nearlyEqual(Number(numerator), counts[index] + config.alpha)) {
        throw new Error(`Bigram trace row ${context} numerator ${index} disagrees with count plus alpha.`);
      }
    });
    const denominatorValue = Number(match[7]);
    if (!Number.isFinite(denominatorValue) || !nearlyEqual(denominatorValue, total + config.alpha * config.vocabularySize, 1e-9)) {
      throw new Error(`Bigram trace row ${context} has the wrong smoothing denominator.`);
    }
    const mle = match[8] === 'undefined' ? null : parseDecimalDisplays(match[8], `row ${context} MLE`);
    const smoothed = parseDecimalDisplays(match[9], `row ${context} smoothed`);
    assertLength(smoothed, config.vocabularySize, `row ${context} smoothed distribution`);
    if (total === 0) {
      if (mle !== null) throw new Error(`Bigram trace row ${context} defines MLE without observations.`);
    } else {
      if (mle === null) throw new Error(`Bigram trace row ${context} omits a defined MLE row.`);
      assertLength(mle, config.vocabularySize, `row ${context} MLE distribution`);
      assertPrintedDistribution(mle, counts.map((count) => count / total), `row ${context} MLE`);
    }
    const denominator = total + config.alpha * config.vocabularySize;
    assertPrintedDistribution(
      smoothed,
      counts.map((count) => (count + config.alpha) / denominator),
      `row ${context} smoothed`,
    );
    rows.push({
      context,
      symbol: match[2],
      counts,
      total,
      pseudocount: match[5],
      numerators,
      denominator: match[7],
      mle,
      smoothed,
    });
    cursor += 1;
  }
  if (rows.length === 0) throw new Error('Bigram trace contains no probability rows.');

  const boundaryMatch = traceLines[cursor]?.match(boundaryPattern);
  if (!boundaryMatch) throw new Error('Bigram trace is missing its exact BOUNDARY line.');
  const boundary = {
    forbiddenFrom: parseSafeInteger(boundaryMatch[1], 'forbidden boundary source'),
    forbiddenTo: parseSafeInteger(boundaryMatch[2], 'forbidden boundary target'),
  };
  if (boundary.forbiddenFrom !== eos.id || boundary.forbiddenTo !== bos.id) {
    throw new Error('Bigram trace BOUNDARY must forbid EOS-to-BOS flattening.');
  }
  cursor += 1;
  if (cursor !== traceLines.length) {
    throw new Error(`Bigram trace contains unknown or reordered record: ${traceLines[cursor]}`);
  }

  return { config, tokens, documents, rows, boundary };
}

interface RequiredLabelGroup {
  readonly [key: string]: true | RequiredLabelGroup;
}

type RequiredLabelShape = true | RequiredLabelGroup;

const requiredLabelShape: RequiredLabelShape = {
  title: true,
  description: true,
  summary: {
    vocabularySize: true,
    alpha: true,
    trainingDocuments: true,
    countedTransitions: true,
  },
  sections: {
    trainingDocuments: true,
    tokenLegend: true,
    knownContext: true,
    unseenContext: true,
    boundaryGuard: true,
  },
  fields: { document: true, context: true, rowTotal: true, denominator: true },
  columns: {
    nextToken: true,
    count: true,
    pseudocount: true,
    smoothedNumerator: true,
    mle: true,
    smoothed: true,
  },
  values: { undefinedMle: true, boundaryTransition: true },
  roles: { boundary: true, content: true, unseen: true },
  notes: { countOnce: true, unseenSuccessor: true, unseenContext: true, boundary: true },
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
export function assertBigramBaselineDiagramLabels(labels: BigramBaselineDiagramLabels): void {
  assertLabelShape(labels, requiredLabelShape, 'labels');
}
