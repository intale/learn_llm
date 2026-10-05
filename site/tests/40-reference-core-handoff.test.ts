// @ts-ignore Node APIs are supplied by Vitest.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by Vitest.
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-ignore Maintained repository ESM parser.
import { parseJsonFrontmatter } from '../../scripts/check-site-content.mjs';
declare const process: { cwd(): string };
const read = (path: string) => readFileSync(resolve(process.cwd(), '..', path), 'utf8');
const id = '40-reference-core-handoff';
const lesson = read(`site/src/content/chapters/en/${id}.mdx`);
const contract = parseJsonFrontmatter(read(`curriculum/chapters/${id}.md`)).data;
const metadata = parseJsonFrontmatter(lesson).data;
const golden = read(`rust/demos/ch${id}/expected.txt`);
const report = JSON.parse(golden);

describe('Chapter40 exact reference evidence', () => {
  it('binds actual stdout to the contract and the schema1 source-only identity', () => {
    expect(golden).toBe(contract.rust.expected_output);
    expect(golden.endsWith('\n')).toBe(true);
    expect(report.schema_version).toBe(1);
    expect(report.chapter).toBe(id);
    expect(report.scope).toBe('scalar-reference-fixed-fixture-regression');
    expect(report.reference_identity).toBe('cd06104ff61dc8a0c6cbe6e842847952343050eb4942c79aa1d17e8d0d0bb648');
    expect(report.source_revision).toBe('3ddda34cc3e765a3f96021abff6000e9520f5a15');
    const census = JSON.parse(read('configs/functional-reference-source-v1.json'));
    expect(census.dependencyHashes).toEqual({});
    expect(Object.keys(census.sourceHashes)).toHaveLength(40);
  });
  it('keeps metric units, replay arithmetic and unmeasured capabilities explicit', () => {
    expect(report.model.parameters).toBe(1188);
    expect(report.documents).toEqual({ test: 2, train: 8, validation: 2 });
    expect(report.evaluation).toMatchObject({ window_target_slots: 1744, document_transition_occurrences: 442, windows: 436, unit: 'overlapping-window-target-slot', once_per_transition_metric_reported: false, independent_generalization_estimate: false, transition_multiplicity_counts: [4, 4, 4, 430] });
    expect(report.training).toMatchObject({ independent_schedules: 2, updates_per_schedule: 32, valid_targets_per_schedule: 2048, valid_targets_primary_plus_replay: 4096, target_count_basis: 'derived-from-frozen-full-batch-schedules', within_invocation_replay_bitwise: true });
    expect(report.laptop_throughput_measured).toBe(false);
    expect(report.checkpoint.complete_job_resume_established).toBe(false);
    expect(report.generation.useful_language_quality_established).toBe(false);
    expect(report.generation.token_ids).toEqual([260, 34, 34]);
  });
  it('matches actual English metadata and catalog without requiring an unauthored locale', () => {
    const catalog = JSON.parse(read(`site/src/i18n/functional-catalogs/en/${id}.json`));
    for (const key of ['title', 'description', 'objective']) expect(catalog[key]).toBe(metadata[key]);
    expect(catalog.contentRevision).toBe(metadata.content_revision);
    expect(metadata.objective).toBe(contract.objective.en);
    expect(metadata.worked_inputs).toBe(contract.worked_inputs.en);
    expect(metadata.formula.latex).toBe(contract.formula.latex);
    expect(metadata.decoder_connection).toBe(contract.decoder_connection.en);
    const body = parseJsonFrontmatter(lesson).body;
    expect(body.indexOf('## The problem:')).toBeGreaterThanOrEqual(0);
    expect(body.indexOf('## The solution:')).toBeGreaterThan(body.indexOf('## The problem:'));
  });
  it('binds every declared excerpt to one actual unique Rust region', () => {
    expect(metadata.rust_sources).toHaveLength(4);
    for (const item of metadata.rust_sources) {
      const source = read(item.path);
      const begin = `// region:${item.region}`;
      const end = `// endregion:${item.region}`;
      expect(source.split(begin)).toHaveLength(2);
      expect(source.split(end)).toHaveLength(2);
      expect(source.indexOf(end)).toBeGreaterThan(source.indexOf(begin));
      expect(lesson).toContain(`region="${item.region}"`);
    }
    const sheet = JSON.parse(read(`site/src/content/cheat-sheets/en/${id}.json`));
    expect(sheet.chapter_id).toBe(id);
    expect(sheet.locale).toBe('en');
    expect(sheet.terms).toHaveLength(7);
    expect(new Set(sheet.terms.map((term: { term: string }) => term.term)).size).toBe(7);
    for (const term of sheet.terms) expect(term.definition.trim().length).toBeGreaterThan(0);
  });
});
