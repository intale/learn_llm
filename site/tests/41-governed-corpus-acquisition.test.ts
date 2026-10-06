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

describe('Chapter41 exact content-only corpus evidence', () => {
  it('selects the actual demo and three named practice checks', () => {
    const commands = [...parsed.body.matchAll(/```sh\n([\s\S]*?)\n\s*```/g)]
      .map(match => match[1].replace(/\\\n\s*/g, ' ').trim().split(/\s+/));
    expect(commands[0]).toEqual(['COURSE_CORPUS=false', './course', 'run', 'cargo', 'run', '--offline', '--locked', '-p', `ch${id}`]);
    const names = [
      'size_digest_truncation_and_overrun_are_separate_failures',
      'provenance_changes_identity_without_changing_raw_digests',
      'failure_preserves_prior_bundle_without_publishing_partial_candidate',
    ];
    expect(commands).toHaveLength(4);
    names.forEach((name, index) => {
      expect(commands[index + 1]).toEqual([
        'COURSE_CORPUS=false', './course', 'run', 'cargo', 'test', '--offline', '--locked',
        '-p', `ch${id}`, '--test', 'governed_acquisition', name, '--', '--exact',
      ]);
      expect(read(`rust/demos/ch${id}/tests/governed_acquisition.rs`)).toContain(`fn ${name}()`);
    });
  });
  it('binds exact generated v2 output and the observed independent checks', () => {
    expect(contract.rust.expected_output).toBe(golden);
    expect(report.schema_version).toBe(2);
    expect(report.scope).toBe('synthetic-offline-fixture');
    expect(report.artifact_id).toBe('c6a8351f4c3236687f7dbad72b333d01364416b2e0f8f74f88221cab4a6da2df');
    expect(report.attribution_variant_artifact_id).toBe('a11d314b5c084d51cf145a194963e73547fc82123a08a2f2422a28e1da5d30cb');
    expect(report.privacy_quality_or_redistribution_approval).toBe(false);
    expect(report.checks).toEqual({
      attribution_change_changes_bundle_identity: true,
      attribution_change_preserves_raw_digests: true,
      complete_bundle_replay_identity: true,
      failure_preserves_prior_bundle: true,
      same_size_wrong_bytes_refusal: 'Hash',
      size_only_contrast_accepts_abd: true,
    });
  });
  it('keeps manifest, raw and complete-payload quantities distinct', () => {
    expect(report.artifact_manifest_bytes).toBe(1756);
    expect(report.logical_sources).toBe(2);
    expect(report.inventoried_payloads).toBe(4);
    expect(report.raw_bytes).toBe(9);
    expect(report.total_payload_bytes).toBe(46);
    expect(report.payloads.map((p: { id: string; bytes: number }) => [p.id, p.bytes]))
      .toEqual([['attribution',24], ['license',13], ['train',3], ['validation',6]]);
    expect(report).not.toHaveProperty('resume');
    expect(report).not.toHaveProperty('budget_case');
  });
  it('matches current English contract/catalog and preserves deferred Russian', () => {
    const catalog = JSON.parse(read(`site/src/i18n/functional-catalogs/en/${id}.json`));
    for (const key of ['title', 'description', 'objective']) expect(catalog[key]).toBe(parsed.data[key]);
    expect(catalog.contentRevision).toBe(4);
    expect(parsed.data.content_revision).toBe(4);
    expect(contract.content_revision).toBe(4);
    for (const key of ['objective', 'worked_inputs', 'decoder_connection']) expect(parsed.data[key]).toBe(contract[key].en);
    expect(parsed.data.formula.latex).toBe(contract.formula.latex);
    expect(parsed.data.formula.symbols).toEqual(contract.formula.symbols.map((s: { symbol: string; en: string }) => ({ symbol: s.symbol, meaning: s.en })));
    expect(existsSync(resolve(process.cwd(), `src/content/chapters/ru/${id}.mdx`))).toBe(false);
    expect(existsSync(resolve(process.cwd(), `src/content/cheat-sheets/ru/${id}.json`))).toBe(false);
  });
  it('binds six actual Rust regions in five implementation files', () => {
    expect(parsed.data.rust_sources).toHaveLength(6);
    expect(new Set(parsed.data.rust_sources.map((s: { path: string }) => s.path)).size).toBe(5);
    expect(new Set(contract.rust.sources)).toEqual(new Set(parsed.data.rust_sources.map((s: { path: string }) => s.path)));
    for (const item of parsed.data.rust_sources) {
      const source = read(item.path);
      const start = `// region:${item.region}`, end = `// endregion:${item.region}`;
      expect(source.split(start)).toHaveLength(2);
      expect(source.split(end)).toHaveLength(2);
      expect(source.indexOf(end)).toBeGreaterThan(source.indexOf(start));
      expect(parsed.body.split(`region="${item.region}"`)).toHaveLength(2);
    }
  });
  it('keeps source and metadata IDs independent of physical layout', () => {
    const policy = JSON.parse(read(`rust/demos/ch${id}/fixtures/source-policy.json`));
    expect(policy.manifest.schema_version).toBe(2);
    expect(policy.manifest.payload.map((p: { id: string }) => p.id)).toEqual(['attribution','license','train','validation']);
    for (const source of policy.manifest.sources) {
      expect(source.license.content_id).toBe('license');
      expect(source.attribution.content_id).toBe('attribution');
      expect(source).not.toHaveProperty('requested_url');
      expect(source).not.toHaveProperty('path');
    }
    for (const payload of policy.manifest.payload) expect(payload).not.toHaveProperty('path');
  });
  it('binds six chapter-used glossary terms and the direct-evidence presentation', () => {
    const sheet = JSON.parse(read(`site/src/content/cheat-sheets/en/${id}.json`));
    expect(sheet.locale).toBe('en');
    expect(sheet.chapter_id).toBe(id);
    expect(sheet.terms.map((t: { term: string }) => t.term)).toEqual([
      'Corpus bundle', 'Source provenance', 'Canonical manifest',
      'Dataset artifact identity', 'Content ID', 'Raw held-out source',
    ]);
    expect(parsed.data.visualization).toEqual({ ...contract.visualization, rationale: contract.visualization.rationale.en });
    expect(parsed.data.visualization.decision).toBe('not-useful');
    expect(parsed.data.visualization.id).toBeNull();
  });
});
