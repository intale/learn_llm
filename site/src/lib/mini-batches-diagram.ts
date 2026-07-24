export interface MiniBatchesDiagramLabels {
  title: string;
  description: string;
  summary: {
    contextLength: string;
    requestedCapacity: string;
    shuffleSeed: string;
    completeWindows: string;
    batchCount: string;
  };
  stages: {
    shuffle: string;
    batches: string;
    finalBatch: string;
    proof: string;
  };
  fields: {
    slot: string;
    origin: string;
    input: string;
    target: string;
    tokenLosses: string;
    shape: string;
    actualWidth: string;
    targetTokens: string;
    lossSum: string;
    denominator: string;
    meanLoss: string;
    meanGradient: string;
    capacitySlot: string;
    duplicates: string;
    padding: string;
    crossPartition: string;
    sameSeed: string;
    differentSeed: string;
    rawAccumulation: string;
  };
  notes: {
    shuffle: string;
    tokenMean: string;
    finalBatch: string;
    proof: string;
  };
  symbols: {
    batch: string;
    window: string;
    unused: string;
    equal: string;
    same: string;
    changed: string;
  };
  captions: {
    batchRows: string;
    proof: string;
  };
  scrollers: {
    batchRows: string;
  };
}

export const miniBatchesDiagramId = 'mini-batches' as const;

export interface TraceVector {
  lexeme: string;
  items: readonly string[];
}

export interface MiniBatchWindowTrace {
  slot: string;
  batch: string;
  row: string;
  document: string;
  documentIndex: string;
  start: string;
  input: TraceVector;
  target: TraceVector;
  losses: TraceVector;
}

export interface MiniBatchTrace {
  index: string;
  width: string;
  shape: TraceVector;
  tokens: string;
  lossSum: string;
  meanLoss: string;
  meanGradient: TraceVector;
  accumulation: 'equal';
  windows: readonly MiniBatchWindowTrace[];
}

export interface MiniBatchesTrace {
  meta: {
    context: string;
    capacity: string;
    seed: string;
    windows: string;
    batches: string;
  };
  windows: readonly MiniBatchWindowTrace[];
  batches: readonly MiniBatchTrace[];
  final: {
    width: string;
    tokens: string;
    capacityTokens: string;
    actualDenominator: string;
  };
  proof: {
    coverage: string;
    duplicates: string;
    padding: string;
    crossPartition: string;
    replay: 'same';
    differentSeed: 'changed';
    accumulation: 'equal';
  };
}

const INTEGER = /^(?:0|[1-9][0-9]*)$/;
const DECIMAL = /^-?(?:0|[1-9][0-9]*)\.[0-9]{6}$/;
const DOCUMENT_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function fail(message: string): never {
  throw new Error(`invalid mini-batches trace: ${message}`);
}

function parseFields(
  line: string,
  kind: string,
  keys: readonly string[],
): Readonly<Record<string, string>> {
  const parts = line.split('|');
  if (parts.shift() !== kind) fail(`expected ${kind} line, received ${line}`);
  if (parts.length !== keys.length) {
    fail(`${kind} must contain exactly ${keys.length} ordered fields`);
  }
  const fields: Record<string, string> = {};
  parts.forEach((part, index) => {
    const separator = part.indexOf('=');
    if (separator <= 0) fail(`${kind} field ${index} has no key/value separator`);
    const key = part.slice(0, separator);
    const value = part.slice(separator + 1);
    if (key !== keys[index]) {
      fail(`${kind} field ${index} must be ${keys[index]}, received ${key}`);
    }
    if (value.length === 0) fail(`${kind}.${key} must not be empty`);
    fields[key] = value;
  });
  return fields;
}

function requirePattern(value: string, pattern: RegExp, label: string): string {
  if (!pattern.test(value)) fail(`${label} has invalid lexeme ${value}`);
  return value;
}

function requireExact(value: string, expected: string, label: string): string {
  if (value !== expected) fail(`${label} must be ${expected}, received ${value}`);
  return value;
}

function parseVector(
  value: string,
  label: string,
  itemPattern: RegExp,
  expectedLength: number,
): TraceVector {
  const match = /^\[(.*)\]$/.exec(value);
  if (!match) fail(`${label} must be a bracketed vector`);
  const items = match[1].length === 0 ? [] : match[1].split(', ');
  if (items.length !== expectedLength) {
    fail(`${label} must contain ${expectedLength} items, received ${items.length}`);
  }
  items.forEach((item, index) =>
    requirePattern(item, itemPattern, `${label}[${index}]`),
  );
  return Object.freeze({ lexeme: value, items: Object.freeze(items) });
}

function parseWindow(
  line: string,
  expected: {
    slot: string;
    batch: string;
    row: string;
  },
): MiniBatchWindowTrace {
  const fields = parseFields(line, 'WINDOW', [
    'slot',
    'batch',
    'row',
    'document',
    'document_index',
    'start',
    'input',
    'target',
    'losses',
  ]);
  return Object.freeze({
    slot: requireExact(fields.slot, expected.slot, 'WINDOW.slot'),
    batch: requireExact(fields.batch, expected.batch, 'WINDOW.batch'),
    row: requireExact(fields.row, expected.row, 'WINDOW.row'),
    document: requirePattern(fields.document, DOCUMENT_ID, 'WINDOW.document'),
    documentIndex: requirePattern(
      fields.document_index,
      INTEGER,
      'WINDOW.document_index',
    ),
    start: requirePattern(fields.start, INTEGER, 'WINDOW.start'),
    input: parseVector(fields.input, 'WINDOW.input', INTEGER, 2),
    target: parseVector(fields.target, 'WINDOW.target', INTEGER, 2),
    losses: parseVector(fields.losses, 'WINDOW.losses', DECIMAL, 2),
  });
}

function parseBatch(
  line: string,
  expected: {
    index: string;
    width: string;
    shape: string;
    tokens: string;
  },
  windows: readonly MiniBatchWindowTrace[],
): MiniBatchTrace {
  const fields = parseFields(line, 'BATCH', [
    'index',
    'width',
    'shape',
    'tokens',
    'loss_sum',
    'mean_loss',
    'mean_gradient',
    'accumulation',
  ]);
  return Object.freeze({
    index: requireExact(fields.index, expected.index, 'BATCH.index'),
    width: requireExact(fields.width, expected.width, 'BATCH.width'),
    shape: parseVector(
      requireExact(fields.shape, expected.shape, 'BATCH.shape'),
      'BATCH.shape',
      INTEGER,
      2,
    ),
    tokens: requireExact(fields.tokens, expected.tokens, 'BATCH.tokens'),
    lossSum: requirePattern(fields.loss_sum, DECIMAL, 'BATCH.loss_sum'),
    meanLoss: requirePattern(fields.mean_loss, DECIMAL, 'BATCH.mean_loss'),
    meanGradient: parseVector(
      fields.mean_gradient,
      'BATCH.mean_gradient',
      DECIMAL,
      2,
    ),
    accumulation: requireExact(
      fields.accumulation,
      'equal',
      'BATCH.accumulation',
    ) as 'equal',
    windows: Object.freeze([...windows]),
  });
}

export function parseMiniBatchesTrace(source: string): MiniBatchesTrace {
  if (!source.endsWith('\n')) fail('fixture must end with one newline');
  if (source.endsWith('\n\n')) fail('fixture must not end with a blank line');
  const lines = source.slice(0, -1).split('\n');
  if (lines.length !== 10) fail(`expected 10 lines, received ${lines.length}`);

  const metaFields = parseFields(lines[0], 'META', [
    'context',
    'capacity',
    'seed',
    'windows',
    'batches',
  ]);
  const meta = Object.freeze({
    context: requireExact(metaFields.context, '2', 'META.context'),
    capacity: requireExact(metaFields.capacity, '3', 'META.capacity'),
    seed: requireExact(metaFields.seed, '7', 'META.seed'),
    windows: requireExact(metaFields.windows, '5', 'META.windows'),
    batches: requireExact(metaFields.batches, '2', 'META.batches'),
  });

  const expectedWindows = [
    { line: 1, slot: '0', batch: '0', row: '0' },
    { line: 2, slot: '1', batch: '0', row: '1' },
    { line: 3, slot: '2', batch: '0', row: '2' },
    { line: 5, slot: '3', batch: '1', row: '0' },
    { line: 6, slot: '4', batch: '1', row: '1' },
  ] as const;
  const windows = Object.freeze(
    expectedWindows.map((expected) => parseWindow(lines[expected.line], expected)),
  );

  const firstWindows = windows.filter((window) => window.batch === '0');
  const finalWindows = windows.filter((window) => window.batch === '1');
  const batches = Object.freeze([
    parseBatch(
      lines[4],
      { index: '0', width: '3', shape: '[3, 2]', tokens: '6' },
      firstWindows,
    ),
    parseBatch(
      lines[7],
      { index: '1', width: '2', shape: '[2, 2]', tokens: '4' },
      finalWindows,
    ),
  ]);

  const finalFields = parseFields(lines[8], 'FINAL', [
    'width',
    'tokens',
    'capacity_tokens',
    'actual_denominator',
  ]);
  const final = Object.freeze({
    width: requireExact(finalFields.width, '2', 'FINAL.width'),
    tokens: requireExact(finalFields.tokens, '4', 'FINAL.tokens'),
    capacityTokens: requireExact(
      finalFields.capacity_tokens,
      '6',
      'FINAL.capacity_tokens',
    ),
    actualDenominator: requireExact(
      finalFields.actual_denominator,
      '4',
      'FINAL.actual_denominator',
    ),
  });

  const proofFields = parseFields(lines[9], 'PROOF', [
    'coverage',
    'duplicates',
    'padding',
    'cross_partition',
    'replay',
    'different_seed',
    'accumulation',
  ]);
  const proof = Object.freeze({
    coverage: requireExact(proofFields.coverage, '5/5', 'PROOF.coverage'),
    duplicates: requireExact(proofFields.duplicates, '0', 'PROOF.duplicates'),
    padding: requireExact(proofFields.padding, '0', 'PROOF.padding'),
    crossPartition: requireExact(
      proofFields.cross_partition,
      '0',
      'PROOF.cross_partition',
    ),
    replay: requireExact(proofFields.replay, 'same', 'PROOF.replay') as 'same',
    differentSeed: requireExact(
      proofFields.different_seed,
      'changed',
      'PROOF.different_seed',
    ) as 'changed',
    accumulation: requireExact(
      proofFields.accumulation,
      'equal',
      'PROOF.accumulation',
    ) as 'equal',
  });

  return Object.freeze({ meta, windows, batches, final, proof });
}

function assertText(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function assertStringRecord(
  value: unknown,
  label: string,
  keys: readonly string[],
): asserts value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a record`);
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join('|') !== [...keys].sort().join('|')) {
    throw new Error(`${label} must contain exactly ${keys.join(', ')}`);
  }
  keys.forEach((key) => assertText(record[key], `${label}.${key}`));
}

export function assertMiniBatchesDiagramLabels(
  value: unknown,
): asserts value is MiniBatchesDiagramLabels {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('labels must be a record');
  }
  const labels = value as Record<string, unknown>;
  if (
    Object.keys(labels).sort().join('|') !==
    ['captions', 'description', 'fields', 'notes', 'scrollers', 'stages', 'summary', 'symbols', 'title']
      .sort()
      .join('|')
  ) {
    throw new Error('labels contain missing or unexpected sections');
  }
  assertText(labels.title, 'labels.title');
  assertText(labels.description, 'labels.description');
  assertStringRecord(labels.summary, 'labels.summary', [
    'contextLength',
    'requestedCapacity',
    'shuffleSeed',
    'completeWindows',
    'batchCount',
  ]);
  assertStringRecord(labels.stages, 'labels.stages', [
    'shuffle',
    'batches',
    'finalBatch',
    'proof',
  ]);
  assertStringRecord(labels.fields, 'labels.fields', [
    'slot',
    'origin',
    'input',
    'target',
    'tokenLosses',
    'shape',
    'actualWidth',
    'targetTokens',
    'lossSum',
    'denominator',
    'meanLoss',
    'meanGradient',
    'capacitySlot',
    'duplicates',
    'padding',
    'crossPartition',
    'sameSeed',
    'differentSeed',
    'rawAccumulation',
  ]);
  assertStringRecord(labels.notes, 'labels.notes', [
    'shuffle',
    'tokenMean',
    'finalBatch',
    'proof',
  ]);
  assertStringRecord(labels.symbols, 'labels.symbols', [
    'batch',
    'window',
    'unused',
    'equal',
    'same',
    'changed',
  ]);
  assertStringRecord(labels.captions, 'labels.captions', ['batchRows', 'proof']);
  assertStringRecord(labels.scrollers, 'labels.scrollers', ['batchRows']);
}
