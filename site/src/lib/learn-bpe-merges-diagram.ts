export const learnBpeMergesDiagramId = 'learn-bpe-merges';

export interface BpeTraceDocument {
  id: string;
  tokens: readonly number[];
}

export interface BpeTraceStage {
  index: number;
  documents: readonly BpeTraceDocument[];
}

export interface BpeTraceCandidate {
  left: number;
  right: number;
  count: number;
  winner: boolean;
}

export interface BpeTraceMerge {
  rank: number;
  left: number;
  right: number;
  count: number;
  replacements: number;
  token: number;
  bytesHex: readonly string[];
}

export interface BpeTraceRound {
  rank: number;
  candidates: readonly BpeTraceCandidate[];
  merge: BpeTraceMerge;
}

export interface LearnBpeMergesTrace {
  stages: readonly BpeTraceStage[];
  rounds: readonly BpeTraceRound[];
}

export interface LearnBpeMergesDiagramLabels {
  title: string;
  description: string;
  trainingSource: string;
  stagesLabel: string;
  roundsLabel: string;
  documentBoundary: string;
  fields: Readonly<{
    stage: string;
    document: string;
    tokens: string;
    candidates: string;
    pair: string;
    count: string;
    selected: string;
    rank: string;
    newToken: string;
    bytesHex: string;
    replacements: string;
  }>;
  values: Readonly<{
    winner: string;
    notWinner: string;
  }>;
  invariantsLabel: string;
  invariants: Readonly<{
    overlap: string;
    replacement: string;
    tie: string;
    barrier: string;
  }>;
}

const beginMarker = 'TRACE bpe-merges-v1 BEGIN';
const endMarker = 'TRACE bpe-merges-v1 END';
const stagePattern = /^STAGE index=(0|[1-9][0-9]*)$/;
const documentPattern =
  /^DOCUMENT stage=(0|[1-9][0-9]*) id=([a-z][a-z0-9]*(?:-[a-z0-9]+)*) tokens=([0-9]+(?:,[0-9]+)*)$/;
const candidatePattern =
  /^CANDIDATE rank=(0|[1-9][0-9]*) left=([0-9]+) right=([0-9]+) count=([1-9][0-9]*) winner=(yes|no)$/;
const mergePattern =
  /^MERGE rank=(0|[1-9][0-9]*) left=([0-9]+) right=([0-9]+) count=([1-9][0-9]*) replacements=([1-9][0-9]*) token=([0-9]+) bytes_hex=([0-9a-f]{2}(?:,[0-9a-f]{2})*)$/;

function parseSafeInteger(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`BPE trace ${label} is not a safe nonnegative integer.`);
  }
  return parsed;
}

function pairOrder(
  left: Readonly<{ left: number; right: number }>,
  right: Readonly<{ left: number; right: number }>,
): number {
  return left.left - right.left || left.right - right.right;
}

function parseStage(
  lines: readonly string[],
  cursor: number,
  expectedIndex: number,
  expectedDocumentIds: readonly string[] | null,
  vocabulary: ReadonlyMap<number, readonly number[]>,
): { stage: BpeTraceStage; next: number } {
  const header = lines[cursor]?.match(stagePattern);
  if (!header) {
    throw new Error(`BPE trace expected STAGE index=${expectedIndex}.`);
  }
  const index = parseSafeInteger(header[1], 'stage index');
  if (index !== expectedIndex) {
    throw new Error(`BPE trace stage index ${index} is not contiguous.`);
  }

  const documents: BpeTraceDocument[] = [];
  let next = cursor + 1;
  while (next < lines.length) {
    const match = lines[next].match(documentPattern);
    if (!match) break;
    const documentStage = parseSafeInteger(match[1], 'document stage');
    if (documentStage !== index) {
      throw new Error(`BPE trace document stage differs from stage ${index}.`);
    }
    const id = match[2];
    if (documents.some((document) => document.id === id)) {
      throw new Error(`BPE trace repeats document ${id} in stage ${index}.`);
    }
    const tokens = match[3].split(',').map((value) =>
      parseSafeInteger(value, `token in ${id}`),
    );
    const unknownToken = tokens.find((token) => !vocabulary.has(token));
    if (unknownToken !== undefined) {
      throw new Error(
        `BPE trace stage ${index} document ${id} references unknown token ID ${unknownToken}.`,
      );
    }
    documents.push({ id, tokens });
    next += 1;
  }
  if (documents.length === 0) {
    throw new Error(`BPE trace stage ${index} has no documents.`);
  }
  const ids = documents.map((document) => document.id);
  if (
    expectedDocumentIds &&
    JSON.stringify(ids) !== JSON.stringify(expectedDocumentIds)
  ) {
    throw new Error(`BPE trace document identity or order changes at stage ${index}.`);
  }
  return { stage: { index, documents }, next };
}

function parseRound(
  lines: readonly string[],
  cursor: number,
  expectedRank: number,
  vocabulary: Map<number, readonly number[]>,
): { round: BpeTraceRound; next: number } {
  const candidates: BpeTraceCandidate[] = [];
  let next = cursor;
  while (next < lines.length) {
    const match = lines[next].match(candidatePattern);
    if (!match) break;
    const rank = parseSafeInteger(match[1], 'candidate rank');
    if (rank !== expectedRank) {
      throw new Error(`BPE trace candidate rank ${rank} is not contiguous.`);
    }
    const candidate = {
      left: parseSafeInteger(match[2], 'candidate left ID'),
      right: parseSafeInteger(match[3], 'candidate right ID'),
      count: parseSafeInteger(match[4], 'candidate count'),
      winner: match[5] === 'yes',
    };
    if (!vocabulary.has(candidate.left) || !vocabulary.has(candidate.right)) {
      throw new Error(
        `BPE trace rank ${rank} candidate references an unknown token ID.`,
      );
    }
    const previous = candidates.at(-1);
    if (previous && pairOrder(previous, candidate) >= 0) {
      throw new Error(`BPE trace rank ${rank} candidates are not unique numeric pairs in order.`);
    }
    candidates.push(candidate);
    next += 1;
  }
  if (candidates.length === 0) {
    throw new Error(`BPE trace rank ${expectedRank} has no candidates.`);
  }

  const winners = candidates.filter((candidate) => candidate.winner);
  if (winners.length !== 1) {
    throw new Error(`BPE trace rank ${expectedRank} must mark exactly one winner.`);
  }
  const expectedWinner = [...candidates].sort(
    (left, right) => right.count - left.count || pairOrder(left, right),
  )[0];
  if (winners[0] !== expectedWinner) {
    throw new Error(`BPE trace rank ${expectedRank} winner violates the numeric tie rule.`);
  }

  const mergeMatch = lines[next]?.match(mergePattern);
  if (!mergeMatch) {
    throw new Error(`BPE trace rank ${expectedRank} is missing its MERGE line.`);
  }
  const merge: BpeTraceMerge = {
    rank: parseSafeInteger(mergeMatch[1], 'merge rank'),
    left: parseSafeInteger(mergeMatch[2], 'merge left ID'),
    right: parseSafeInteger(mergeMatch[3], 'merge right ID'),
    count: parseSafeInteger(mergeMatch[4], 'merge count'),
    replacements: parseSafeInteger(mergeMatch[5], 'replacement count'),
    token: parseSafeInteger(mergeMatch[6], 'new token ID'),
    bytesHex: mergeMatch[7].split(','),
  };
  const winner = winners[0];
  if (
    merge.rank !== expectedRank ||
    merge.left !== winner.left ||
    merge.right !== winner.right ||
    merge.count !== winner.count
  ) {
    throw new Error(`BPE trace rank ${expectedRank} MERGE differs from its winner.`);
  }
  if (merge.replacements > merge.count) {
    throw new Error(`BPE trace rank ${expectedRank} replaces more positions than it counted.`);
  }
  const expectedToken = 256 + expectedRank;
  if (merge.token !== expectedToken) {
    throw new Error(`BPE trace rank ${expectedRank} must create token ${expectedToken}.`);
  }
  const leftBytes = vocabulary.get(merge.left);
  const rightBytes = vocabulary.get(merge.right);
  if (!leftBytes || !rightBytes) {
    throw new Error(`BPE trace rank ${expectedRank} references an unknown token ID.`);
  }
  const expectedBytes = [...leftBytes, ...rightBytes];
  const actualBytes = merge.bytesHex.map((byte) => Number.parseInt(byte, 16));
  if (JSON.stringify(actualBytes) !== JSON.stringify(expectedBytes)) {
    throw new Error(`BPE trace rank ${expectedRank} byte expansion is inconsistent.`);
  }
  vocabulary.set(merge.token, actualBytes);

  return {
    round: { rank: expectedRank, candidates, merge },
    next: next + 1,
  };
}

export function parseLearnBpeMergesTrace(source: string): LearnBpeMergesTrace {
  const sourceLines = source.split(/\r?\n/);
  const beginIndexes = sourceLines
    .map((line, index) => (line === beginMarker ? index : -1))
    .filter((index) => index >= 0);
  const endIndexes = sourceLines
    .map((line, index) => (line === endMarker ? index : -1))
    .filter((index) => index >= 0);
  if (beginIndexes.length !== 1 || endIndexes.length !== 1) {
    throw new Error('BPE trace must contain exactly one BEGIN and one END marker.');
  }
  if (endIndexes[0] <= beginIndexes[0] + 1) {
    throw new Error('BPE trace markers are empty or reversed.');
  }
  const lines = sourceLines.slice(beginIndexes[0] + 1, endIndexes[0]);

  const vocabulary = new Map<number, readonly number[]>(
    Array.from({ length: 256 }, (_, id) => [id, [id]] as const),
  );
  const stages: BpeTraceStage[] = [];
  const rounds: BpeTraceRound[] = [];
  const first = parseStage(lines, 0, 0, null, vocabulary);
  stages.push(first.stage);
  const documentIds = first.stage.documents.map((document) => document.id);
  let cursor = first.next;

  while (cursor < lines.length) {
    const parsedRound = parseRound(lines, cursor, rounds.length, vocabulary);
    rounds.push(parsedRound.round);
    const parsedStage = parseStage(
      lines,
      parsedRound.next,
      stages.length,
      documentIds,
      vocabulary,
    );
    stages.push(parsedStage.stage);
    cursor = parsedStage.next;
  }
  if (stages.length !== rounds.length + 1) {
    throw new Error('BPE trace must have one more stage than merge round.');
  }
  return { stages, rounds };
}

export function assertLearnBpeMergesDiagramLabels(
  labels: LearnBpeMergesDiagramLabels,
): void {
  const required: readonly (readonly [string, string])[] = [
    ['title', labels.title],
    ['description', labels.description],
    ['trainingSource', labels.trainingSource],
    ['stagesLabel', labels.stagesLabel],
    ['roundsLabel', labels.roundsLabel],
    ['documentBoundary', labels.documentBoundary],
    ...Object.entries(labels.fields).map(
      ([key, value]) => [`fields.${key}`, value] as const,
    ),
    ...Object.entries(labels.values).map(
      ([key, value]) => [`values.${key}`, value] as const,
    ),
    ['invariantsLabel', labels.invariantsLabel],
    ...Object.entries(labels.invariants).map(
      ([key, value]) => [`invariants.${key}`, value] as const,
    ),
  ];
  const missing = required
    .filter(([, value]) => value.trim().length === 0)
    .map(([path]) => path);
  if (missing.length > 0) {
    throw new Error(
      `Learn-BPE-merges diagram labels must not be empty: ${missing.join(', ')}.`,
    );
  }
}
