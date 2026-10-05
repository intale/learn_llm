// @ts-ignore Node APIs are supplied by Vitest.
import { readFileSync, existsSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by Vitest.
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-ignore Maintained repository parser, not a test-local frontmatter parser.
import { parseJsonFrontmatter } from '../../scripts/check-site-content.mjs';
declare const process: { cwd(): string };
const read = (path: string) => readFileSync(resolve(process.cwd(), '..', path), 'utf8');
const id = '41-governed-corpus-acquisition';
const lesson = read(`site/src/content/chapters/en/${id}.mdx`);
const parsed = parseJsonFrontmatter(lesson);
const contract = parseJsonFrontmatter(read(`curriculum/chapters/${id}.md`)).data;
const golden = read(`rust/demos/ch${id}/expected.txt`);
const report = JSON.parse(golden);

describe('Chapter41 exact offline corpus evidence', () => {
  it('binds the actual fixture output without production-acquisition claims', () => {
    expect(contract.rust.expected_output).toBe(golden);
    expect(report.schema_version).toBe(1);
    expect(report.scope).toBe('synthetic-offline-fixture');
    expect(report.artifact_id).toBe('569de16c16720f73aca07de6a3184b779b80700c3f5f8eefc01f60fea3019b89');
    expect(report.attribution_variant_artifact_id).not.toBe(report.artifact_id);
    expect(report.privacy_quality_or_redistribution_approval).toBe(false);
    expect(report.checks).toEqual({ attribution_change_changes_bundle_identity: true, attribution_change_preserves_raw_digests: true, complete_bundle_replay_identity: true, same_size_wrong_bytes_refusal: 'Hash', size_only_contrast_accepts_abd: true });
  });
  it('keeps manifest, raw, shared-payload and delivered-byte counts distinct', () => {
    expect(report.artifact_manifest_bytes).toBe(3084);
    expect(report.logical_sources).toBe(2);
    expect(report.inventoried_files).toBe(4);
    expect(report.raw_bytes).toBe(9);
    expect(report.total_payload_bytes).toBe(46);
    expect(report.files.map((f: { bytes: number }) => f.bytes)).toEqual([24, 13, 3, 6]);
    expect(report.resume).toEqual({ acknowledged_body_bytes: 9, attempts: [2, 1], complete_pair: true, uncertain_body_bytes: 0 });
    expect(report.budget_case).toEqual({ acknowledged_body_bytes: 2, attempts_after_refusal: 1, ceiling_bytes: 10, dispatch_permitted: false, projected_required_bytes: 11, refusal: 'TransferBudget', remaining_raw_bytes: 9 });
  });
  it('uses the actual selected report values rather than inventing a second output', () => {
    const block = parsed.body.match(/```json\n([\s\S]*?)\n```/);
    expect(block).not.toBeNull();
    const selected = JSON.parse(block![1]);
    expect(Object.keys(selected)).toEqual(['artifact_id', 'artifact_manifest_bytes', 'inventoried_files', 'logical_sources', 'raw_bytes', 'scope', 'total_payload_bytes']);
    for (const key of Object.keys(selected)) expect(selected[key]).toEqual(report[key]);
  });
  it('matches English contract/catalog and preserves the absent Russian chapter', () => {
    const catalog = JSON.parse(read(`site/src/i18n/functional-catalogs/en/${id}.json`));
    for (const key of ['title', 'description', 'objective']) expect(catalog[key]).toBe(parsed.data[key]);
    expect(catalog.contentRevision).toBe(parsed.data.content_revision);
    for (const key of ['objective', 'worked_inputs', 'decoder_connection']) expect(parsed.data[key]).toBe(contract[key].en);
    expect(parsed.data.formula.latex).toBe(contract.formula.latex);
    expect(parsed.body.indexOf('## The problem:')).toBeLessThan(parsed.body.indexOf('## The solution:'));
    expect(existsSync(resolve(process.cwd(), `src/content/chapters/ru/${id}.mdx`))).toBe(false);
    expect(existsSync(resolve(process.cwd(), `src/content/cheat-sheets/ru/${id}.json`))).toBe(false);
  });
  it('binds three actual Rust excerpts and the six-term English glossary', () => {
    expect(parsed.data.rust_sources).toHaveLength(3);
    for (const item of parsed.data.rust_sources) {
      const source = read(item.path);
      const start = `// region:${item.region}`, end = `// endregion:${item.region}`;
      expect(source.split(start)).toHaveLength(2);
      expect(source.split(end)).toHaveLength(2);
      expect(source.indexOf(end)).toBeGreaterThan(source.indexOf(start));
      expect(lesson).toContain(`region="${item.region}"`);
    }
    const sheet = JSON.parse(read(`site/src/content/cheat-sheets/en/${id}.json`));
    expect(sheet.locale).toBe('en');
    expect(sheet.chapter_id).toBe(id);
    expect(sheet.terms).toHaveLength(6);
    expect(new Set(sheet.terms.map((t: { term: string }) => t.term)).size).toBe(6);
  });
});
