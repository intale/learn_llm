// @ts-ignore Node APIs are supplied by Vitest.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by Vitest.
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-ignore Maintained repository diagram presentation validator.
import { validateDiagramComponentSource } from '../../scripts/check-site-content.mjs';
import { filteringRuleOrder, parseFilteringTrace, parseStageEvidence } from '../src/lib/deterministic-corpus-filtering-diagram';
declare const process: { cwd(): string };
const read = (path: string) => readFileSync(resolve(process.cwd(), '..', path), 'utf8');
const golden = read('rust/demos/ch42-deterministic-corpus-filtering/expected.txt');
const source = read('site/src/components/chapters/DeterministicCorpusFilteringDiagram.astro');
type ObjectValue = Record<string, unknown>;
const object = (value: unknown) => value as ObjectValue;
const array = (value: unknown) => value as unknown[];
function changed(mutate: (value: ObjectValue) => void): string {
  const value = JSON.parse(golden) as ObjectValue;
  mutate(value);
  return JSON.stringify(value);
}

describe('Chapter42 closed Rust-produced diagram evidence', () => {
  it('returns the original trace values without estimating or replacing rates', () => {
    const trace = parseFilteringTrace(golden);
    expect(trace).toEqual(JSON.parse(golden));
    expect(trace.stages.map(stage => stage.rule)).toEqual(filteringRuleOrder);
    expect(trace.stages.map(stage => [stage.seen, stage.terminal, stage.survived])).toEqual([
      ['8', '1', '7'], ['7', '1', '6'], ['6', '1', '5'], ['5', '1', '4'],
      ['4', '2', '2'], ['2', '1', '1'], ['1', '0', '1'],
    ]);
    expect(trace.stages[4].rate).toEqual({ denominator: '4', numerator: '2' });
    expect(trace.dispositions).toEqual({ eligible: '1', ineligible: '7', manual_review: '1', rejected: '6', retained: '1' });
    expect(trace.filtered_artifact_id).not.toBe(trace.swapped_order.filtered_artifact_id);
    expect(trace.policy_sha256).not.toBe(trace.swapped_order.policy_sha256);
  });
  it('rejects missing or unknown report and displayed nested fields', () => {
    for (const mutate of [
      (value: ObjectValue) => { value.extra = true; },
      (value: ObjectValue) => { delete value.count_kind; },
      (value: ObjectValue) => { object(value.input).extra = '0'; },
      (value: ObjectValue) => { object(array(value.stages)[0]).extra = false; },
      (value: ObjectValue) => { object(object(array(value.sources)[0]).source).path = 'invented'; },
      (value: ObjectValue) => { object(object(array(value.sources)[0]).scan).extra = '0'; },
      (value: ObjectValue) => { object(value.withdrawal).extra = []; },
    ]) expect(() => parseFilteringTrace(changed(mutate))).toThrow();
  });
  it('rejects numerical JSON, noncanonical decimals and values outside u64', () => {
    for (const invalid of [287, '-1', '+287', '0287', '2.87e2', '287.0', '', '18446744073709551616', '9'.repeat(80)]) {
      expect(() => parseFilteringTrace(changed(value => { object(value.input).physical_bytes = invalid; }))).toThrow();
    }
    const maximum = '18446744073709551615';
    expect(parseStageEvidence({ rule: 'raw-size', seen: maximum, survived: maximum, terminal: '0', terminal_disposition: 'rejected', rate: { numerator: '0', denominator: maximum } }).seen).toBe(maximum);
  });
  it('distinguishes an unavailable zero-seen rate from an observed zero terminal fraction', () => {
    const zeroSeen = { rule: 'manual-marker', seen: '0', terminal: '0', survived: '0', terminal_disposition: 'manual-review', rate: null };
    expect(parseStageEvidence(zeroSeen).rate).toBeNull();
    for (const rate of [0, '0', { numerator: '0', denominator: '0' }]) expect(() => parseStageEvidence({ ...zeroSeen, rate })).toThrow();
    const reached = { ...zeroSeen, seen: '1', survived: '1', rate: { numerator: '0', denominator: '1' } };
    expect(parseStageEvidence(reached).rate).toEqual({ numerator: '0', denominator: '1' });
    expect(() => parseStageEvidence({ ...reached, rate: null })).toThrow();
  });
  it('rejects reordered stages, conservation drift and a whole-input rate denominator', () => {
    for (const mutate of [
      (value: ObjectValue) => { const stages = array(value.stages); [stages[4], stages[5]] = [stages[5], stages[4]]; },
      (value: ObjectValue) => { object(array(value.stages)[4]).survived = '3'; },
      (value: ObjectValue) => { object(object(array(value.stages)[4]).rate).denominator = '8'; },
      (value: ObjectValue) => { object(object(array(value.stages)[4]).rate).numerator = '0'; },
      (value: ObjectValue) => { object(array(value.stages)[4]).terminal_disposition = 'manual-review'; },
    ]) expect(() => parseFilteringTrace(changed(mutate))).toThrow();
  });
  it('rejects invented later r7 evaluation and changed eligibility or accounting', () => {
    for (const mutate of [
      (value: ObjectValue) => { object(value.r7).manual_rule_evaluated = true; },
      (value: ObjectValue) => { object(value.r7).first_terminal_rule = 'manual-marker'; },
      (value: ObjectValue) => { object(value.dispositions).eligible = '2'; },
      (value: ObjectValue) => { object(value.byte_accounting).normalized_rejected = '66'; },
      (value: ObjectValue) => { object(array(value.sources)[0]).undecoded_raw_bytes = '0'; },
      (value: ObjectValue) => { value.retained_text = ['contact=alex@example.invalid']; },
    ]) expect(() => parseFilteringTrace(changed(mutate))).toThrow();
  });
  it('rejects expanded capability claims and unbound identity changes', () => {
    for (const mutate of [
      (value: ObjectValue) => { value.scope = 'real-corpus'; },
      (value: ObjectValue) => { value.privacy_certified = true; },
      (value: ObjectValue) => { value.real_corpus_filtered = true; },
      (value: ObjectValue) => { value.model_trained = true; },
      (value: ObjectValue) => { value.findings_body_free = false; },
      (value: ObjectValue) => { value.policy_sha256 = 'G'.repeat(64); },
      (value: ObjectValue) => { object(value.swapped_order).policy_sha256 = value.policy_sha256; },
      (value: ObjectValue) => { object(value.swapped_order).filtered_artifact_id = value.filtered_artifact_id; },
      (value: ObjectValue) => { object(value.swapped_order).source_artifact_unchanged = false; },
      (value: ObjectValue) => { object(object(array(value.sources)[0]).source).evidence_kind = 'production-source-policy'; },
    ]) expect(() => parseFilteringTrace(changed(mutate))).toThrow();
  });
  it('rejects unknown withdrawals and malformed or duplicated sampled references', () => {
    expect(() => parseFilteringTrace(changed(value => { object(value.withdrawal).artifacts = ['a0', 'f0', 's0', 'tok0', 'f9']; }))).toThrow();
    expect(() => parseFilteringTrace(changed(value => { value.withdrawal_scope = 'all-copies-erased'; }))).toThrow();
    expect(() => parseFilteringTrace(changed(value => {
      const source = object(array(value.sources)[1]);
      object(array(source.samples)[5]).record_ids = ['bad', 'bad'];
    }))).toThrow();
  });
});

describe('Chapter42 static shared figure', () => {
  it('owns one semantic tree, shared roles and no private enhancement', () => {
    expect(source.match(/<figure\b/g)).toHaveLength(1);
    expect(source.match(/<figcaption\b/g)).toHaveLength(1);
    expect(source).toContain('data-visualization-id="deterministic-corpus-filtering"');
    expect(source).toContain('data-diagram-style="course-v1"');
    expect(source.match(/<figure\b[^>]*\bclass="([^"]*)"/)?.[1].trim().split(/\s+/))
      .toEqual(['course-diagram', 'deterministic-corpus-filtering-diagram']);
    expect(source).toContain('aria-labelledby="filtering-figure-title"');
    expect(source).toContain('aria-describedby="filtering-figure-description"');
    expect(source.match(/data-diagram-box/g)).toHaveLength(2);
    expect(source).toContain('data-diagram-scroll role="region" tabindex="0"');
    expect(source).toContain('class="course-diagram__grid filtering-evidence-grid"');
    expect(() => validateDiagramComponentSource(source, 'Chapter42 figure')).not.toThrow();
    expect(source).not.toMatch(/<(?:script|dialog|button)\b|client:|overflow:\s*(?:hidden|clip)/);
  });
  it('renders checked Rust evidence and math annotations without applying filters in JavaScript', () => {
    expect(source).toContain('ch42-deterministic-corpus-filtering/expected.txt?raw');
    expect(source).toContain('parseFilteringTrace(traceSource)');
    for (const field of ['stage.rule', 'stage.seen', 'stage.terminal', 'stage.survived', 'stage.rate.numerator', 'stage.rate.denominator', 'trace.dispositions.retained', 'trace.dispositions.rejected', 'trace.dispositions.manual_review']) expect(source).toContain(field);
    expect(source).toContain('<InlineMath');
    expect(source).toContain('Not evaluated');
    expect(source.match(/<table\b/g)).toHaveLength(1);
    expect(source).not.toContain('BigInt');
  });
});
