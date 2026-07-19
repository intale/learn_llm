export const applyBpeTokenizerDiagramId = 'apply-bpe-tokenizer';

export interface ApplyBpeTokenizerLayout {
  version: number;
  bos: number;
  eos: number;
  contentOffset: number;
  byteCount: number;
  mergeCount: number;
  vocabularySize: number;
}

export interface ApplyBpeTokenizerRule {
  rank: number;
  trainingLeft: number;
  trainingRight: number;
  trainingToken: number;
  contentLeft: number;
  contentRight: number;
  contentToken: number;
  bytesHex: readonly string[];
}

export interface ApplyBpeTokenizerPiece {
  index: number;
  token: number;
  bytesHex: readonly string[];
  mergeRank: number | null;
}

export interface ApplyBpeTokenizerCase {
  id: 'ascii-bee' | 'cyrillic-a';
  inputBytesHex: readonly string[];
  inputText: string;
  initialTokens: readonly number[];
  appliedRanks: readonly number[];
  contentTokens: readonly number[];
  documentTokens: readonly number[];
  pieces: readonly ApplyBpeTokenizerPiece[];
  decodedBytesHex: readonly string[];
}

export interface ApplyBpeTokenizerTrace {
  layout: ApplyBpeTokenizerLayout;
  rules: readonly ApplyBpeTokenizerRule[];
  cases: readonly ApplyBpeTokenizerCase[];
}

export interface ApplyBpeTokenizerDiagramLabels {
  title: string;
  description: string;
  caseTitles: Readonly<{
    asciiBee: string;
    cyrillicA: string;
  }>;
  lanes: Readonly<{
    input: string;
    bytes: string;
    initial: string;
    grouped: string;
    document: string;
    decoded: string;
  }>;
  fields: Readonly<{
    layoutVersion: string;
    contentOffset: string;
    tokenId: string;
    byteExpansion: string;
    appliedRank: string;
    byteFallback: string;
    bos: string;
    eos: string;
  }>;
  values: Readonly<{
    exactMatch: string;
  }>;
  invariantsLabel: string;
  invariants: Readonly<{
    ranks: string;
    offset: string;
    controls: string;
    bytes: string;
  }>;
}

const beginMarker = 'TRACE apply-bpe-tokenizer-v1 BEGIN';
const endMarker = 'TRACE apply-bpe-tokenizer-v1 END';
const integer = '(0|[1-9][0-9]*)';
const tokenList = `${integer}(?:,${integer})*`;
const hexList = '([0-9a-f]{2}(?:,[0-9a-f]{2})*)';
const layoutPattern = new RegExp(
  `^LAYOUT version=${integer} bos=${integer} eos=${integer} content_offset=${integer} byte_count=${integer} merge_count=${integer} vocabulary_size=${integer}$`,
);
const rulePattern = new RegExp(
  `^RULE rank=${integer} training_pair=${integer},${integer} training_token=${integer} content_pair=${integer},${integer} content_token=${integer} bytes_hex=${hexList}$`,
);
const casePattern = new RegExp(
  `^CASE id=(ascii-bee|cyrillic-a) input_hex=${hexList}$`,
);
const initialPattern = new RegExp(`^INITIAL case=([a-z][a-z0-9-]*) tokens=(${tokenList})$`);
const appliedPattern = new RegExp(`^APPLIED case=([a-z][a-z0-9-]*) ranks=(${tokenList})$`);
const contentPattern = new RegExp(`^CONTENT case=([a-z][a-z0-9-]*) tokens=(${tokenList})$`);
const documentPattern = new RegExp(`^DOCUMENT case=([a-z][a-z0-9-]*) tokens=(${tokenList})$`);
const piecePattern = new RegExp(
  `^PIECE case=([a-z][a-z0-9-]*) index=${integer} token=${integer} bytes_hex=${hexList}$`,
);
const decodedPattern = new RegExp(`^DECODED case=([a-z][a-z0-9-]*) bytes_hex=${hexList}$`);

function parseSafeInteger(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Apply-BPE trace ${label} is not a safe nonnegative integer.`);
  }
  return parsed;
}

function parseToken(value: string, label: string): number {
  const parsed = parseSafeInteger(value, label);
  if (parsed > 0xffff_ffff) {
    throw new Error(`Apply-BPE trace ${label} exceeds the u32 token-ID space.`);
  }
  return parsed;
}

function parseTokens(value: string, label: string): number[] {
  return value.split(',').map((token, index) => parseToken(token, `${label}[${index}]`));
}

function parseHex(value: string): string[] {
  return value.split(',');
}

function numericBytes(hex: readonly string[]): number[] {
  return hex.map((byte) => Number.parseInt(byte, 16));
}

function equalValues(left: readonly unknown[], right: readonly unknown[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function requireCase(matchCase: string, expectedCase: string, line: string): void {
  if (matchCase !== expectedCase) {
    throw new Error(`Apply-BPE trace ${line} belongs to ${matchCase}, not ${expectedCase}.`);
  }
}

function parseLayout(line: string): ApplyBpeTokenizerLayout {
  const match = line.match(layoutPattern);
  if (!match) throw new Error('Apply-BPE trace is missing its exact LAYOUT line.');
  const values = match.slice(1).map((value, index) =>
    parseSafeInteger(value, `layout field ${index}`),
  );
  const layout = {
    version: values[0],
    bos: values[1],
    eos: values[2],
    contentOffset: values[3],
    byteCount: values[4],
    mergeCount: values[5],
    vocabularySize: values[6],
  };
  if (
    layout.version !== 1 ||
    layout.bos !== 0 ||
    layout.eos !== 1 ||
    layout.contentOffset !== 2 ||
    layout.byteCount !== 256 ||
    layout.mergeCount < 1 ||
    layout.vocabularySize !== layout.contentOffset + layout.byteCount + layout.mergeCount
  ) {
    throw new Error('Apply-BPE trace LAYOUT violates tokenizer layout version 1.');
  }
  return layout;
}

function parseRule(
  line: string,
  expectedRank: number,
  layout: ApplyBpeTokenizerLayout,
  vocabulary: Map<number, readonly number[]>,
  seenPairs: Set<string>,
): ApplyBpeTokenizerRule {
  const match = line.match(rulePattern);
  if (!match) throw new Error(`Apply-BPE trace expected RULE rank=${expectedRank}.`);
  const rule: ApplyBpeTokenizerRule = {
    rank: parseSafeInteger(match[1], 'rule rank'),
    trainingLeft: parseToken(match[2], 'training left ID'),
    trainingRight: parseToken(match[3], 'training right ID'),
    trainingToken: parseToken(match[4], 'training merge ID'),
    contentLeft: parseToken(match[5], 'content left ID'),
    contentRight: parseToken(match[6], 'content right ID'),
    contentToken: parseToken(match[7], 'content merge ID'),
    bytesHex: parseHex(match[8]),
  };
  const expectedTrainingToken = 256 + expectedRank;
  if (
    rule.rank !== expectedRank ||
    rule.trainingToken !== expectedTrainingToken ||
    rule.contentLeft !== rule.trainingLeft + layout.contentOffset ||
    rule.contentRight !== rule.trainingRight + layout.contentOffset ||
    rule.contentToken !== rule.trainingToken + layout.contentOffset ||
    rule.contentToken !== 258 + expectedRank
  ) {
    throw new Error(`Apply-BPE trace rule ${expectedRank} violates the +2 ID mapping.`);
  }
  if (rule.trainingLeft >= expectedTrainingToken || rule.trainingRight >= expectedTrainingToken) {
    throw new Error(`Apply-BPE trace rule ${expectedRank} uses a future operand.`);
  }
  const pairKey = `${rule.trainingLeft},${rule.trainingRight}`;
  if (seenPairs.has(pairKey)) {
    throw new Error(`Apply-BPE trace rule ${expectedRank} repeats pair ${pairKey}.`);
  }
  seenPairs.add(pairKey);
  const leftBytes = vocabulary.get(rule.contentLeft);
  const rightBytes = vocabulary.get(rule.contentRight);
  if (!leftBytes || !rightBytes) {
    throw new Error(`Apply-BPE trace rule ${expectedRank} references an unknown operand.`);
  }
  const expectedBytes = [...leftBytes, ...rightBytes];
  const actualBytes = numericBytes(rule.bytesHex);
  if (!equalValues(expectedBytes, actualBytes)) {
    throw new Error(`Apply-BPE trace rule ${expectedRank} has inconsistent bytes.`);
  }
  if (rule.contentToken >= layout.vocabularySize || vocabulary.has(rule.contentToken)) {
    throw new Error(`Apply-BPE trace rule ${expectedRank} creates an invalid token ID.`);
  }
  vocabulary.set(rule.contentToken, actualBytes);
  return rule;
}

function parseCase(
  lines: readonly string[],
  cursor: number,
  layout: ApplyBpeTokenizerLayout,
  rules: readonly ApplyBpeTokenizerRule[],
  vocabulary: ReadonlyMap<number, readonly number[]>,
): { parsedCase: ApplyBpeTokenizerCase; next: number } {
  const caseMatch = lines[cursor]?.match(casePattern);
  if (!caseMatch) throw new Error('Apply-BPE trace expected a CASE line.');
  const id = caseMatch[1] as ApplyBpeTokenizerCase['id'];
  const inputBytesHex = parseHex(caseMatch[2]);
  let next = cursor + 1;

  const initialMatch = lines[next]?.match(initialPattern);
  if (!initialMatch) throw new Error(`Apply-BPE trace case ${id} is missing INITIAL.`);
  requireCase(initialMatch[1], id, 'INITIAL');
  const initialTokens = parseTokens(initialMatch[2], `${id} initial token`);
  next += 1;

  const appliedMatch = lines[next]?.match(appliedPattern);
  if (!appliedMatch) throw new Error(`Apply-BPE trace case ${id} is missing APPLIED.`);
  requireCase(appliedMatch[1], id, 'APPLIED');
  const appliedRanks = parseTokens(appliedMatch[2], `${id} applied rank`);
  next += 1;

  const contentMatch = lines[next]?.match(contentPattern);
  if (!contentMatch) throw new Error(`Apply-BPE trace case ${id} is missing CONTENT.`);
  requireCase(contentMatch[1], id, 'CONTENT');
  const contentTokens = parseTokens(contentMatch[2], `${id} content token`);
  next += 1;

  const documentMatch = lines[next]?.match(documentPattern);
  if (!documentMatch) throw new Error(`Apply-BPE trace case ${id} is missing DOCUMENT.`);
  requireCase(documentMatch[1], id, 'DOCUMENT');
  const documentTokens = parseTokens(documentMatch[2], `${id} document token`);
  next += 1;

  const pieces: ApplyBpeTokenizerPiece[] = [];
  while (next < lines.length) {
    const pieceMatch = lines[next].match(piecePattern);
    if (!pieceMatch) break;
    requireCase(pieceMatch[1], id, 'PIECE');
    const index = parseSafeInteger(pieceMatch[2], `${id} piece index`);
    const token = parseToken(pieceMatch[3], `${id} piece token`);
    const bytesHex = parseHex(pieceMatch[4]);
    const rule = rules.find((candidate) => candidate.contentToken === token);
    pieces.push({ index, token, bytesHex, mergeRank: rule?.rank ?? null });
    next += 1;
  }

  const decodedMatch = lines[next]?.match(decodedPattern);
  if (!decodedMatch) throw new Error(`Apply-BPE trace case ${id} is missing DECODED.`);
  requireCase(decodedMatch[1], id, 'DECODED');
  const decodedBytesHex = parseHex(decodedMatch[2]);
  next += 1;

  const expectedInitial = numericBytes(inputBytesHex).map((byte) => byte + layout.contentOffset);
  if (!equalValues(initialTokens, expectedInitial)) {
    throw new Error(`Apply-BPE trace case ${id} INITIAL does not map bytes through +2.`);
  }
  if (
    appliedRanks.length === 0 ||
    appliedRanks.some((rank, index) =>
      rank >= layout.mergeCount || (index > 0 && rank <= appliedRanks[index - 1]),
    )
  ) {
    throw new Error(`Apply-BPE trace case ${id} APPLIED ranks are not unique and ascending.`);
  }
  if (
    contentTokens.some(
      (token) => token === layout.bos || token === layout.eos || !vocabulary.has(token),
    )
  ) {
    throw new Error(`Apply-BPE trace case ${id} CONTENT contains a control or unknown ID.`);
  }
  if (!equalValues(documentTokens, [layout.bos, ...contentTokens, layout.eos])) {
    throw new Error(`Apply-BPE trace case ${id} DOCUMENT is not an endpoint-only wrapper.`);
  }
  if (pieces.length !== contentTokens.length) {
    throw new Error(`Apply-BPE trace case ${id} must expose one PIECE per content token.`);
  }
  for (const piece of pieces) {
    if (piece.mergeRank !== null && !appliedRanks.includes(piece.mergeRank)) {
      throw new Error(
        `Apply-BPE trace case ${id} PIECE merge rank ${piece.mergeRank} is absent from APPLIED.`,
      );
    }
  }
  const concatenatedBytes: number[] = [];
  pieces.forEach((piece, index) => {
    const expectedBytes = vocabulary.get(piece.token);
    if (
      piece.index !== index ||
      piece.token !== contentTokens[index] ||
      !expectedBytes ||
      !equalValues(numericBytes(piece.bytesHex), expectedBytes)
    ) {
      throw new Error(`Apply-BPE trace case ${id} PIECE ${index} is inconsistent.`);
    }
    concatenatedBytes.push(...numericBytes(piece.bytesHex));
  });
  const inputBytes = numericBytes(inputBytesHex);
  if (
    !equalValues(concatenatedBytes, inputBytes) ||
    !equalValues(numericBytes(decodedBytesHex), inputBytes)
  ) {
    throw new Error(`Apply-BPE trace case ${id} does not recover its exact input bytes.`);
  }

  let inputText: string;
  try {
    inputText = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(inputBytes));
  } catch {
    throw new Error(`Apply-BPE trace case ${id} input is not valid UTF-8.`);
  }

  return {
    parsedCase: {
      id,
      inputBytesHex,
      inputText,
      initialTokens,
      appliedRanks,
      contentTokens,
      documentTokens,
      pieces,
      decodedBytesHex,
    },
    next,
  };
}

export function parseApplyBpeTokenizerTrace(source: string): ApplyBpeTokenizerTrace {
  const sourceLines = source.split(/\r?\n/);
  const beginIndexes = sourceLines
    .map((line, index) => (line === beginMarker ? index : -1))
    .filter((index) => index >= 0);
  const endIndexes = sourceLines
    .map((line, index) => (line === endMarker ? index : -1))
    .filter((index) => index >= 0);
  if (beginIndexes.length !== 1 || endIndexes.length !== 1) {
    throw new Error('Apply-BPE trace must contain exactly one BEGIN and one END marker.');
  }
  if (endIndexes[0] <= beginIndexes[0] + 1) {
    throw new Error('Apply-BPE trace markers are empty or reversed.');
  }
  const lines = sourceLines.slice(beginIndexes[0] + 1, endIndexes[0]);
  const layout = parseLayout(lines[0] ?? '');
  const vocabulary = new Map<number, readonly number[]>(
    Array.from({ length: layout.byteCount }, (_, byte) => [byte + layout.contentOffset, [byte]]),
  );
  const seenPairs = new Set<string>();
  const rules: ApplyBpeTokenizerRule[] = [];
  let cursor = 1;
  for (let rank = 0; rank < layout.mergeCount; rank += 1) {
    rules.push(parseRule(lines[cursor] ?? '', rank, layout, vocabulary, seenPairs));
    cursor += 1;
  }

  const cases: ApplyBpeTokenizerCase[] = [];
  while (cursor < lines.length) {
    const result = parseCase(lines, cursor, layout, rules, vocabulary);
    if (cases.some((candidate) => candidate.id === result.parsedCase.id)) {
      throw new Error(`Apply-BPE trace repeats case ${result.parsedCase.id}.`);
    }
    cases.push(result.parsedCase);
    cursor = result.next;
  }
  if (!equalValues(cases.map((sample) => sample.id), ['ascii-bee', 'cyrillic-a'])) {
    throw new Error('Apply-BPE trace must contain ascii-bee then cyrillic-a exactly once.');
  }
  return { layout, rules, cases };
}

export function assertApplyBpeTokenizerDiagramLabels(
  labels: ApplyBpeTokenizerDiagramLabels,
): void {
  const leaves: readonly (readonly [string, string])[] = [
    ['title', labels.title],
    ['description', labels.description],
    ...Object.entries(labels.caseTitles).map(
      ([key, value]) => [`caseTitles.${key}`, value] as const,
    ),
    ...Object.entries(labels.lanes).map(([key, value]) => [`lanes.${key}`, value] as const),
    ...Object.entries(labels.fields).map(([key, value]) => [`fields.${key}`, value] as const),
    ...Object.entries(labels.values).map(([key, value]) => [`values.${key}`, value] as const),
    ['invariantsLabel', labels.invariantsLabel],
    ...Object.entries(labels.invariants).map(
      ([key, value]) => [`invariants.${key}`, value] as const,
    ),
  ];
  const missing = leaves.filter(([, value]) => value.trim() === '').map(([path]) => path);
  if (missing.length > 0) {
    throw new Error(`Apply-BPE tokenizer diagram labels must not be empty: ${missing.join(', ')}.`);
  }
}
