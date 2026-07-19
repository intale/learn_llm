export const autoregressiveExamplesDiagramId = 'autoregressive-examples';

export type AutoregressivePartitionName = 'train' | 'validation' | 'test';

export interface AutoregressiveExamplesConfig {
  contextLength: number;
  stride: number;
  requiredSourceTokens: number;
}

export interface AutoregressiveExampleWindow {
  index: number;
  start: number;
  input: readonly number[];
  target: readonly number[];
}

export interface AutoregressiveIncompleteTail {
  start: number;
  tokens: readonly number[];
  requiredSourceTokens: number;
}

export interface AutoregressiveExampleDocument {
  partition: AutoregressivePartitionName;
  id: string;
  tokens: readonly number[];
  windows: readonly AutoregressiveExampleWindow[];
  incompleteTail: AutoregressiveIncompleteTail | null;
}

export interface AutoregressiveExamplePartition {
  name: AutoregressivePartitionName;
  documents: readonly AutoregressiveExampleDocument[];
}

export interface AutoregressiveExamplesTrace {
  config: AutoregressiveExamplesConfig;
  partitions: readonly AutoregressiveExamplePartition[];
}

export interface AutoregressiveExamplesDiagramLabels {
  title: string;
  description: string;
  partitionTitles: Readonly<Record<AutoregressivePartitionName, string>>;
  fields: Readonly<{
    contextLength: string;
    stride: string;
    requiredSourceTokens: string;
    document: string;
    start: string;
    bos: string;
    eos: string;
  }>;
  lanes: Readonly<{
    source: string;
    input: string;
    target: string;
    incompleteTail: string;
  }>;
  values: Readonly<{
    emitted: string;
    notEmitted: string;
  }>;
  shiftLabel: string;
  boundaryLabel: string;
  boundaryNote: string;
  tailNote: string;
  invariantsLabel: string;
  invariants: Readonly<{
    shift: string;
    complete: string;
    boundaries: string;
    overlap: string;
  }>;
}

const beginMarker = 'TRACE autoregressive-examples-v1 BEGIN';
const endMarker = 'TRACE autoregressive-examples-v1 END';
const integer = '(?:0|[1-9][0-9]*)';
const tokenList = `${integer}(?:,${integer})*`;
const identifier = '([a-z][a-z0-9]*(?:-[a-z0-9]+)*)';
const configPattern = new RegExp(
  `^CONFIG context=(${integer}) stride=(${integer}) required=(${integer})$`,
);
const partitionPattern = /^PARTITION (train|validation|test)$/;
const documentPattern = new RegExp(
  `^DOCUMENT partition=(train|validation|test) id=${identifier} tokens=(${tokenList})$`,
);
const windowPattern = new RegExp(
  `^WINDOW partition=(train|validation|test) document=${identifier} index=(${integer}) start=(${integer}) input=(${tokenList}) target=(${tokenList})$`,
);
const tailPattern = new RegExp(
  `^TAIL partition=(train|validation|test) document=${identifier} start=(${integer}) tokens=(${tokenList}) required=(${integer})$`,
);
const partitionOrder = ['train', 'validation', 'test'] as const;

function parseSafeInteger(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Autoregressive trace ${label} is not a safe nonnegative integer.`);
  }
  return parsed;
}

function parseToken(value: string, label: string): number {
  const parsed = parseSafeInteger(value, label);
  if (parsed > 0xffff_ffff) {
    throw new Error(`Autoregressive trace ${label} exceeds the u32 token-ID space.`);
  }
  return parsed;
}

function parseTokens(value: string, label: string): number[] {
  return value.split(',').map((token, index) => parseToken(token, `${label}[${index}]`));
}

function equalNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function requireIdentity(
  actualPartition: string,
  actualDocument: string,
  expectedPartition: AutoregressivePartitionName,
  expectedDocument: string,
  record: string,
): void {
  if (actualPartition !== expectedPartition || actualDocument !== expectedDocument) {
    throw new Error(
      `Autoregressive trace ${record} belongs to ${actualPartition}/${actualDocument}, not ${expectedPartition}/${expectedDocument}.`,
    );
  }
}

function checkedScheduledStart(index: number, stride: number, label: string): number {
  const start = index * stride;
  if (!Number.isSafeInteger(start)) {
    throw new Error(`Autoregressive trace ${label} exceeds the safe integer range.`);
  }
  return start;
}

function validateWindow(
  window: AutoregressiveExampleWindow,
  document: readonly number[],
  config: AutoregressiveExamplesConfig,
): void {
  const expectedStart = checkedScheduledStart(window.index, config.stride, 'window start');
  if (window.start !== expectedStart) {
    throw new Error(
      `Autoregressive trace window ${window.index} starts at ${window.start}, not scheduled ${expectedStart}.`,
    );
  }
  if (
    window.input.length !== config.contextLength ||
    window.target.length !== config.contextLength
  ) {
    throw new Error(`Autoregressive trace window ${window.index} does not contain T input/target IDs.`);
  }
  const sourceEnd = window.start + config.requiredSourceTokens;
  if (!Number.isSafeInteger(sourceEnd) || sourceEnd > document.length) {
    throw new Error(`Autoregressive trace window ${window.index} is not a complete source span.`);
  }
  const expectedInput = document.slice(window.start, window.start + config.contextLength);
  const expectedTarget = document.slice(window.start + 1, sourceEnd);
  if (!equalNumbers(window.input, expectedInput) || !equalNumbers(window.target, expectedTarget)) {
    throw new Error(
      `Autoregressive trace window ${window.index} is not the document slice shifted by one token.`,
    );
  }
}

function validateDocument(document: AutoregressiveExampleDocument, config: AutoregressiveExamplesConfig): void {
  if (document.tokens[0] !== 0 || document.tokens.at(-1) !== 1) {
    throw new Error(`Autoregressive trace document ${document.id} is not wrapped by BOS=0 and EOS=1.`);
  }
  if (document.tokens.slice(1, -1).some((token) => token === 0 || token === 1)) {
    throw new Error(`Autoregressive trace document ${document.id} has an interior control token.`);
  }
  document.windows.forEach((window, index) => {
    if (window.index !== index) {
      throw new Error(`Autoregressive trace document ${document.id} has a nonsequential window index.`);
    }
    validateWindow(window, document.tokens, config);
  });

  const expectedTailStart = checkedScheduledStart(
    document.windows.length,
    config.stride,
    `${document.id} tail start`,
  );
  const expectedTail = document.tokens.slice(expectedTailStart);
  if (expectedTailStart < document.tokens.length) {
    if (expectedTail.length >= config.requiredSourceTokens) {
      throw new Error(`Autoregressive trace document ${document.id} omits a complete WINDOW.`);
    }
    if (!document.incompleteTail) {
      throw new Error(`Autoregressive trace document ${document.id} is missing its terminal TAIL.`);
    }
    if (
      document.incompleteTail.start !== expectedTailStart ||
      document.incompleteTail.requiredSourceTokens !== config.requiredSourceTokens ||
      !equalNumbers(document.incompleteTail.tokens, expectedTail)
    ) {
      throw new Error(`Autoregressive trace document ${document.id} has an inconsistent TAIL.`);
    }
  } else if (document.incompleteTail) {
    throw new Error(`Autoregressive trace document ${document.id} reports a phantom TAIL.`);
  }
}

/** Parses and verifies the exact Rust-authored trace without constructing examples. */
export function parseAutoregressiveExamplesTrace(stdout: string): AutoregressiveExamplesTrace {
  const lines = stdout.split(/\r?\n/);
  const beginIndices = lines.flatMap((line, index) => (line === beginMarker ? [index] : []));
  const endIndices = lines.flatMap((line, index) => (line === endMarker ? [index] : []));
  if (beginIndices.length !== 1 || endIndices.length !== 1 || endIndices[0] <= beginIndices[0]) {
    throw new Error('Autoregressive trace must contain exactly one ordered BEGIN/END block.');
  }
  const traceLines = lines.slice(beginIndices[0] + 1, endIndices[0]);
  let cursor = 0;

  const configMatch = traceLines[cursor]?.match(configPattern);
  if (!configMatch) throw new Error('Autoregressive trace is missing its exact CONFIG line.');
  const config: AutoregressiveExamplesConfig = {
    contextLength: parseSafeInteger(configMatch[1], 'context length'),
    stride: parseSafeInteger(configMatch[2], 'stride'),
    requiredSourceTokens: parseSafeInteger(configMatch[3], 'required source tokens'),
  };
  if (
    config.contextLength === 0 ||
    config.stride === 0 ||
    config.requiredSourceTokens !== config.contextLength + 1
  ) {
    throw new Error('Autoregressive trace CONFIG violates positive T/S or required=T+1.');
  }
  cursor += 1;

  const partitions: AutoregressiveExamplePartition[] = [];
  const documentIds = new Set<string>();
  for (const expectedPartition of partitionOrder) {
    const partitionMatch = traceLines[cursor]?.match(partitionPattern);
    if (!partitionMatch || partitionMatch[1] !== expectedPartition) {
      throw new Error(`Autoregressive trace expected PARTITION ${expectedPartition}.`);
    }
    cursor += 1;
    const documents: AutoregressiveExampleDocument[] = [];

    while (cursor < traceLines.length && traceLines[cursor].startsWith('DOCUMENT ')) {
      const documentMatch = traceLines[cursor].match(documentPattern);
      if (!documentMatch) throw new Error('Autoregressive trace has an invalid DOCUMENT line.');
      const partition = documentMatch[1] as AutoregressivePartitionName;
      const id = documentMatch[2];
      if (partition !== expectedPartition) {
        throw new Error(`Autoregressive trace DOCUMENT ${id} crosses a partition boundary.`);
      }
      if (documentIds.has(id)) {
        throw new Error(`Autoregressive trace repeats document ${id}.`);
      }
      documentIds.add(id);
      const tokens = parseTokens(documentMatch[3], `${id} source token`);
      cursor += 1;

      const windows: AutoregressiveExampleWindow[] = [];
      while (cursor < traceLines.length && traceLines[cursor].startsWith('WINDOW ')) {
        const windowMatch = traceLines[cursor].match(windowPattern);
        if (!windowMatch) throw new Error('Autoregressive trace has an invalid WINDOW line.');
        requireIdentity(windowMatch[1], windowMatch[2], expectedPartition, id, 'WINDOW');
        windows.push({
          index: parseSafeInteger(windowMatch[3], `${id} window index`),
          start: parseSafeInteger(windowMatch[4], `${id} window start`),
          input: parseTokens(windowMatch[5], `${id} input token`),
          target: parseTokens(windowMatch[6], `${id} target token`),
        });
        cursor += 1;
      }

      let incompleteTail: AutoregressiveIncompleteTail | null = null;
      if (cursor < traceLines.length && traceLines[cursor].startsWith('TAIL ')) {
        const tailMatch = traceLines[cursor].match(tailPattern);
        if (!tailMatch) throw new Error('Autoregressive trace has an invalid TAIL line.');
        requireIdentity(tailMatch[1], tailMatch[2], expectedPartition, id, 'TAIL');
        incompleteTail = {
          start: parseSafeInteger(tailMatch[3], `${id} tail start`),
          tokens: parseTokens(tailMatch[4], `${id} tail token`),
          requiredSourceTokens: parseSafeInteger(tailMatch[5], `${id} tail requirement`),
        };
        cursor += 1;
      }

      const document = { partition, id, tokens, windows, incompleteTail };
      validateDocument(document, config);
      documents.push(document);
    }

    if (documents.length === 0) {
      throw new Error(`Autoregressive trace partition ${expectedPartition} contains no documents.`);
    }
    partitions.push({ name: expectedPartition, documents });
  }

  if (cursor !== traceLines.length) {
    throw new Error(`Autoregressive trace contains unknown or reordered record: ${traceLines[cursor]}`);
  }
  return { config, partitions };
}

interface RequiredLabelGroup {
  readonly [key: string]: true | RequiredLabelGroup;
}

type RequiredLabelShape = true | RequiredLabelGroup;

const requiredLabelShape: RequiredLabelShape = {
  title: true,
  description: true,
  partitionTitles: { train: true, validation: true, test: true },
  fields: {
    contextLength: true,
    stride: true,
    requiredSourceTokens: true,
    document: true,
    start: true,
    bos: true,
    eos: true,
  },
  lanes: { source: true, input: true, target: true, incompleteTail: true },
  values: { emitted: true, notEmitted: true },
  shiftLabel: true,
  boundaryLabel: true,
  boundaryNote: true,
  tailNote: true,
  invariantsLabel: true,
  invariants: { shift: true, complete: true, boundaries: true, overlap: true },
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
export function assertAutoregressiveExamplesDiagramLabels(
  labels: AutoregressiveExamplesDiagramLabels,
): void {
  assertLabelShape(labels, requiredLabelShape, 'labels');
}
