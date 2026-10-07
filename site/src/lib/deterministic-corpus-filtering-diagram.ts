// Validate course-produced presentation evidence; filtering decisions remain Rust-owned.
export const filteringRuleOrder = [
  'raw-size', 'utf8', 'min-length', 'ascii-letters', 'secret-marker',
  'manual-marker', 'ascii-share-review',
] as const;
export type FilteringRule = (typeof filteringRuleOrder)[number];
export type FilteringDisposition = 'retained' | 'rejected' | 'manual-review';
export interface FilteringStageCounts {
  rule: FilteringRule;
  seen: string;
  survived: string;
  terminal: string;
}
export interface FilteringStage extends FilteringStageCounts {
  terminal_disposition: 'rejected' | 'manual-review';
  rate: { denominator: string; numerator: string } | null;
}
export interface FilteringSource {
  decoded_raw_bytes: string;
  manual_review: string;
  normalized_bytes: string;
  normalized_manual_bytes: string;
  normalized_rejected_bytes: string;
  normalized_retained_bytes: string;
  policy_sha256: string;
  rejected: string;
  retained: string;
  samples: {
    disposition: FilteringDisposition;
    first_terminal_rule: FilteringRule | null;
    record_ids: string[];
  }[];
  scan: { delimiter_bytes: string; payload_bytes: string; records: string; source_bytes: string };
  source: {
    artifact_id: string;
    bytes: string;
    declared_language: string;
    evidence_kind: string;
    file_sha256: string;
    payload_id: string;
    source_id: string;
  };
  stages: FilteringStageCounts[];
  undecoded_raw_bytes: string;
}
export interface FilteringTrace {
  chapter: '42-deterministic-corpus-filtering';
  count_kind: 'utf8-byte-base-v1';
  dispositions: {
    eligible: string; ineligible: string; manual_review: string; rejected: string; retained: string;
  };
  filtered_artifact_id: string;
  input: { delimiter_bytes: string; payload_bytes: string; physical_bytes: string; records: string };
  byte_accounting: {
    decoded_raw: string; normalized: string; normalized_manual: string;
    normalized_rejected: string; normalized_retained: string; undecoded_raw: string;
  };
  policy_sha256: string;
  r7: { first_terminal_rule: 'secret-marker'; manual_rule_evaluated: false; occurrence_id: string };
  scope: 'synthetic-first-terminal-fixture';
  source_artifact_id: string;
  sources: FilteringSource[];
  stages: FilteringStage[];
  swapped_order: {
    filtered_artifact_id: string; manual_review: string; policy_sha256: string;
    rejected: string; retained: string; source_artifact_unchanged: true;
  };
  retained_text: string[];
  retained_rows_read: string;
  withdrawal: { artifacts: string[]; sources: string[] };
  withdrawal_scope: 'fictional-known-graph-no-physical-deletion';
  real_corpus_filtered: false;
  privacy_certified: false;
  model_trained: false;
  findings_body_free: true;
}

type ObjectValue = Record<string, unknown>;
const maximumU64 = 18_446_744_073_709_551_615n;
const stageKeys = ['rule', 'seen', 'survived', 'terminal'] as const;
const sourceCounts = [
  'decoded_raw_bytes', 'manual_review', 'normalized_bytes', 'normalized_manual_bytes',
  'normalized_rejected_bytes', 'normalized_retained_bytes', 'rejected', 'retained',
  'undecoded_raw_bytes',
] as const;

function require(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid filtering trace: ${message}.`);
}
function closed(value: unknown, keys: readonly string[], label: string): ObjectValue {
  require(typeof value === 'object' && value !== null && !Array.isArray(value), `${label} object`);
  const object = value as ObjectValue;
  require(Object.keys(object).length === keys.length && keys.every(key => Object.hasOwn(object, key)), `${label} fields`);
  return object;
}
function list(value: unknown, length: number, label: string): unknown[] {
  require(Array.isArray(value) && value.length === length, `${label} length`);
  return value;
}
function count(value: unknown, label: string): bigint {
  require(typeof value === 'string' && /^(?:0|[1-9][0-9]*)$/.test(value), `${label} unsigned canonical decimal`);
  require(value.length <= 20, `${label} u64 range`);
  const integer = BigInt(value);
  require(integer <= maximumU64, `${label} u64 range`);
  return integer;
}
function digest(value: unknown, label: string): asserts value is string {
  require(typeof value === 'string' && /^[0-9a-f]{64}$/.test(value), `${label} digest`);
}
function exact(value: unknown, expected: unknown, label: string): void {
  require(value === expected, label);
}
function rule(value: unknown): FilteringRule {
  require(typeof value === 'string' && (filteringRuleOrder as readonly string[]).includes(value), 'rule');
  return value as FilteringRule;
}
function terminalDisposition(value: FilteringRule): 'rejected' | 'manual-review' {
  return value === 'manual-marker' || value === 'ascii-share-review' ? 'manual-review' : 'rejected';
}
function stageCounts(value: unknown, keys: readonly string[]): FilteringStageCounts {
  const object = closed(value, keys, 'stage');
  rule(object.rule);
  const seen = count(object.seen, 'stage seen');
  const terminal = count(object.terminal, 'stage terminal');
  const survived = count(object.survived, 'stage survived');
  require(seen === terminal + survived, 'stage conservation');
  return object as unknown as FilteringStageCounts;
}

/** A structural evidence check, including zero reached records, not a rate estimator. */
export function parseStageEvidence(value: unknown): FilteringStage {
  const stage = stageCounts(value, [...stageKeys, 'rate', 'terminal_disposition']) as FilteringStage;
  exact(stage.terminal_disposition, terminalDisposition(stage.rule), 'terminal disposition');
  if (stage.seen === '0') {
    exact(stage.rate, null, 'unavailable zero-seen rate');
  } else {
    const rate = closed(stage.rate, ['denominator', 'numerator'], 'rate');
    count(rate.denominator, 'rate denominator');
    count(rate.numerator, 'rate numerator');
    exact(rate.denominator, stage.seen, 'rate reached population');
    exact(rate.numerator, stage.terminal, 'rate terminal count');
  }
  return stage;
}

function validateStageSequence(values: unknown, inputRecords: string, rates: boolean): FilteringStageCounts[] {
  const stages = list(values, filteringRuleOrder.length, 'stages').map(value =>
    rates ? parseStageEvidence(value) : stageCounts(value, stageKeys));
  stages.forEach((stage, index) => {
    exact(stage.rule, filteringRuleOrder[index], 'stage order');
    exact(stage.seen, index === 0 ? inputRecords : stages[index - 1].survived, 'preceding survivors');
  });
  return stages;
}

function validateSource(value: unknown, trace: ObjectValue, index: number): FilteringSource {
  const object = closed(value, [...sourceCounts, 'policy_sha256', 'samples', 'scan', 'source', 'stages'], 'source report');
  sourceCounts.forEach(key => count(object[key], `source ${key}`));
  digest(object.policy_sha256, 'source policy');
  exact(object.policy_sha256, trace.policy_sha256, 'selected source policy');
  const scan = closed(object.scan, ['delimiter_bytes', 'payload_bytes', 'records', 'source_bytes'], 'source scan');
  Object.entries(scan).forEach(([key, value]) => count(value, `scan ${key}`));
  const binding = closed(object.source,
    ['artifact_id', 'bytes', 'declared_language', 'evidence_kind', 'file_sha256', 'payload_id', 'source_id'], 'source binding');
  digest(binding.artifact_id, 'source artifact');
  digest(binding.file_sha256, 'raw file');
  count(binding.bytes, 'source bytes');
  exact(binding.artifact_id, trace.source_artifact_id, 'raw artifact agreement');
  exact(binding.bytes, scan.source_bytes, 'bound source bytes');
  exact(binding.declared_language, 'en', 'declared fixture language');
  exact(binding.evidence_kind, 'synthetic-offline-fixture', 'source evidence kind');
  exact(binding.payload_id, index === 0 ? 'train' : 'validation', 'fixture payload order');
  exact(binding.source_id, index === 0 ? 'fixture-train' : 'fixture-validation', 'fixture source order');
  const stages = validateStageSequence(object.stages, scan.records as string, false);
  require(count(scan.source_bytes, 'physical source') === count(scan.payload_bytes, 'payload source') + count(scan.delimiter_bytes, 'delimiter source'), 'source physical conservation');
  require(count(scan.payload_bytes, 'payload source') === count(object.decoded_raw_bytes, 'decoded source') + count(object.undecoded_raw_bytes, 'undecoded source'), 'source decoding conservation');
  require(count(object.normalized_bytes, 'normalized source') === count(object.normalized_retained_bytes, 'retained source bytes') + count(object.normalized_rejected_bytes, 'rejected source bytes') + count(object.normalized_manual_bytes, 'manual source bytes'), 'source normalized conservation');
  require(count(scan.records, 'source records') === count(object.retained, 'source retained') + count(object.rejected, 'source rejected') + count(object.manual_review, 'source manual'), 'source disposition conservation');
  exact(stages[stages.length - 1].survived, object.retained, 'source final survivors');
  const sampleIds = new Set<string>();
  list(object.samples, filteringRuleOrder.length + 1, 'source samples').forEach((value, groupIndex) => {
    const group = closed(value, ['disposition', 'first_terminal_rule', 'record_ids'], 'sample group');
    const sampleRule = groupIndex === 0 ? null : filteringRuleOrder[groupIndex - 1];
    exact(group.first_terminal_rule, sampleRule, 'sample rule');
    exact(group.disposition, sampleRule === null ? 'retained' : terminalDisposition(sampleRule), 'sample disposition');
    require(Array.isArray(group.record_ids) && group.record_ids.length <= 32, 'sample reference bound');
    const population = groupIndex === 0 ? object.retained : stages[groupIndex - 1].terminal;
    exact(BigInt(group.record_ids.length), count(population, 'fixture sample population'), 'complete tiny-fixture samples');
    group.record_ids.forEach(value => {
      digest(value, 'sample occurrence');
      require(!sampleIds.has(value), 'duplicate sample occurrence');
      sampleIds.add(value);
    });
  });
  return object as unknown as FilteringSource;
}

/** Validate the exact synthetic report's presentation contract without rewriting it. */
export function parseFilteringTrace(raw: string): FilteringTrace {
  const object = closed(JSON.parse(raw) as unknown, [
    'chapter', 'count_kind', 'dispositions', 'filtered_artifact_id', 'input', 'byte_accounting',
    'policy_sha256', 'r7', 'scope', 'source_artifact_id', 'sources', 'stages', 'swapped_order',
    'retained_text', 'retained_rows_read', 'withdrawal', 'withdrawal_scope', 'real_corpus_filtered',
    'privacy_certified', 'model_trained', 'findings_body_free',
  ], 'report');
  exact(object.chapter, '42-deterministic-corpus-filtering', 'chapter');
  exact(object.count_kind, 'utf8-byte-base-v1', 'count basis');
  exact(object.scope, 'synthetic-first-terminal-fixture', 'synthetic scope');
  exact(object.withdrawal_scope, 'fictional-known-graph-no-physical-deletion', 'withdrawal scope');
  for (const key of ['real_corpus_filtered', 'privacy_certified', 'model_trained']) exact(object[key], false, key);
  exact(object.findings_body_free, true, 'body-free findings');
  for (const key of ['filtered_artifact_id', 'policy_sha256', 'source_artifact_id']) digest(object[key], key);
  require(object.filtered_artifact_id !== object.source_artifact_id, 'raw and filtered identity distinction');
  const dispositions = closed(object.dispositions, ['eligible', 'ineligible', 'manual_review', 'rejected', 'retained'], 'dispositions');
  const expectedDispositions = { eligible: '1', ineligible: '7', manual_review: '1', rejected: '6', retained: '1' };
  Object.entries(expectedDispositions).forEach(([key, expected]) => {
    count(dispositions[key], key); exact(dispositions[key], expected, `fixture ${key}`);
  });
  const input = closed(object.input, ['delimiter_bytes', 'payload_bytes', 'physical_bytes', 'records'], 'input');
  const expectedInput = { delimiter_bytes: '112', payload_bytes: '175', physical_bytes: '287', records: '8' };
  Object.entries(expectedInput).forEach(([key, expected]) => {
    count(input[key], key); exact(input[key], expected, `fixture ${key}`);
  });
  const bytes = closed(object.byte_accounting,
    ['decoded_raw', 'normalized', 'normalized_manual', 'normalized_rejected', 'normalized_retained', 'undecoded_raw'], 'byte accounting');
  const expectedBytes = { decoded_raw: '107', normalized: '101', normalized_manual: '28', normalized_rejected: '65', normalized_retained: '8', undecoded_raw: '68' };
  Object.entries(expectedBytes).forEach(([key, expected]) => {
    count(bytes[key], key); exact(bytes[key], expected, `fixture ${key}`);
  });
  require(count(input.physical_bytes, 'physical') === count(input.payload_bytes, 'payload') + count(input.delimiter_bytes, 'delimiter'), 'physical byte conservation');
  require(count(input.payload_bytes, 'payload') === count(bytes.decoded_raw, 'decoded') + count(bytes.undecoded_raw, 'undecoded'), 'decoded byte conservation');
  require(count(bytes.normalized, 'normalized') === count(bytes.normalized_retained, 'retained bytes') + count(bytes.normalized_rejected, 'rejected bytes') + count(bytes.normalized_manual, 'manual bytes'), 'normalized byte conservation');
  const stages = validateStageSequence(object.stages, input.records as string, true);
  const expectedStages = [['8', '1', '7'], ['7', '1', '6'], ['6', '1', '5'], ['5', '1', '4'], ['4', '2', '2'], ['2', '1', '1'], ['1', '0', '1']];
  stages.forEach((stage, index) => {
    exact(stage.seen, expectedStages[index][0], 'fixture stage seen');
    exact(stage.terminal, expectedStages[index][1], 'fixture stage terminal');
    exact(stage.survived, expectedStages[index][2], 'fixture stage survived');
  });
  const sources = list(object.sources, 2, 'sources').map((source, index) => validateSource(source, object, index));
  const sums = (read: (source: FilteringSource) => string) => sources.reduce((sum, source) => sum + count(read(source), 'source total'), 0n);
  for (const key of ['retained', 'rejected', 'manual_review'] as const) exact(sums(source => source[key]), count(dispositions[key], key), `aggregate ${key}`);
  for (const [inputKey, sourceKey] of [['physical_bytes', 'source_bytes'], ['payload_bytes', 'payload_bytes'], ['delimiter_bytes', 'delimiter_bytes'], ['records', 'records']] as const) exact(sums(source => source.scan[sourceKey]), count(input[inputKey], inputKey), `aggregate ${inputKey}`);
  for (const [byteKey, sourceKey] of [['decoded_raw', 'decoded_raw_bytes'], ['normalized', 'normalized_bytes'], ['normalized_manual', 'normalized_manual_bytes'], ['normalized_rejected', 'normalized_rejected_bytes'], ['normalized_retained', 'normalized_retained_bytes'], ['undecoded_raw', 'undecoded_raw_bytes']] as const) exact(sums(source => source[sourceKey]), count(bytes[byteKey], byteKey), `aggregate ${byteKey}`);
  stages.forEach((stage, index) => {
    for (const key of ['seen', 'terminal', 'survived'] as const) exact(sums(source => source.stages[index][key]), count(stage[key], key), `aggregate stage ${key}`);
  });
  exact(sources[0].scan.source_bytes, '136', 'train physical bytes');
  exact(sources[1].scan.source_bytes, '151', 'validation physical bytes');
  const r7 = closed(object.r7, ['first_terminal_rule', 'manual_rule_evaluated', 'occurrence_id'], 'r7');
  exact(r7.first_terminal_rule, 'secret-marker', 'r7 first terminal rule');
  exact(r7.manual_rule_evaluated, false, 'r7 unevaluated manual rule');
  digest(r7.occurrence_id, 'r7 occurrence');
  require(sources[1].samples[5].record_ids.includes(r7.occurrence_id), 'r7 sampled secret decision');
  const swap = closed(object.swapped_order,
    ['filtered_artifact_id', 'manual_review', 'policy_sha256', 'rejected', 'retained', 'source_artifact_unchanged'], 'swapped order');
  for (const key of ['filtered_artifact_id', 'policy_sha256']) {
    digest(swap[key], `swapped ${key}`);
    require(swap[key] !== object[key], `changed ${key}`);
  }
  exact(swap.source_artifact_unchanged, true, 'unchanged raw source');
  exact(swap.retained, '1', 'swapped retention');
  exact(swap.rejected, '5', 'swapped rejection');
  exact(swap.manual_review, '2', 'swapped manual review');
  exact(list(object.retained_text, 1, 'retained text')[0], 'cat sat.', 'retained fixture text');
  count(object.retained_rows_read, 'consumed rows');
  exact(object.retained_rows_read, '1', 'consumed retained rows');
  const withdrawal = closed(object.withdrawal, ['artifacts', 'sources'], 'withdrawal');
  list(withdrawal.artifacts, 5, 'withdrawal artifacts').forEach((value, index) => exact(value, ['a0', 'f0', 's0', 'tok0', 'w0'][index], 'known descendants'));
  exact(list(withdrawal.sources, 1, 'withdrawal sources')[0], 'r0', 'known withdrawn source');
  return object as unknown as FilteringTrace;
}
