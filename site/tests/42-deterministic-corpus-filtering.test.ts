// @ts-ignore Node APIs are supplied by Vitest.
import { readFileSync, existsSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by Vitest.
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-ignore Maintained repository frontmatter parser.
import { parseJsonFrontmatter } from '../../scripts/check-site-content.mjs';
import { parseFilteringTrace } from '../src/lib/deterministic-corpus-filtering-diagram';
declare const process: { cwd(): string };
const read = (path: string) => readFileSync(resolve(process.cwd(), '..', path), 'utf8');
const id = '42-deterministic-corpus-filtering';
const parsed = parseJsonFrontmatter(read(`site/src/content/chapters/en/${id}.mdx`));
const contract = parseJsonFrontmatter(read(`curriculum/chapters/${id}.md`)).data;
const golden = read(`rust/demos/ch${id}/expected.txt`);
const report = parseFilteringTrace(golden);

describe('Chapter42 evidence-bound problem-first English chapter', () => {
  it('selects the actual demo and three exactly named one-test practice commands', () => {
    const commands = [...parsed.body.matchAll(/```sh\n([\s\S]*?)\n\s*```/g)]
      .map(match => match[1].replace(/\\\n\s*/g, ' ').trim().split(/\s+/));
    expect(commands).toHaveLength(4);
    expect(commands[0]).toEqual(['COURSE_CORPUS=false', './course', 'run', 'cargo', 'run', '--offline', '--locked', '-p', `ch${id}`]);
    const names = ['fixture_counts_and_byte_conservation', 'swapping_secret_and_review_changes_first_terminal', 'withdrawal_reaches_known_descendants_once'];
    names.forEach((name, index) => {
      expect(commands[index + 1]).toEqual(['COURSE_CORPUS=false', './course', 'run', 'cargo', 'test', '--offline', '--locked', '-p', `ch${id}`, '--test', 'corpus_filtering', name, '--', '--exact']);
      expect(read(`rust/demos/ch${id}/tests/corpus_filtering.rs`)).toContain(`fn ${name}()`);
    });
    expect(parsed.body).toContain('repository root');
    expect(parsed.body).toContain('Docker');
    expect(parsed.body).toContain('Each selects exactly one test; expect one passing test, not zero selected tests.');
    const exercises = parsed.body.split('{/* chapter-section:exercises */}')[1]
      .split('{/* chapter-section:decoder-connection */}')[0];
    const detailsStart = exercises.indexOf('<details>');
    expect(detailsStart).toBeGreaterThan(0);
    const tasks = exercises.slice(0, detailsStart);
    const answers = exercises.match(/<details>\s*<summary>[^<]+<\/summary>([\s\S]*?)<\/details>/)?.[1] ?? '';
    expect([...tasks.matchAll(/^\s*(\d+)\.\s+\S/gm)].map(match => match[1]))
      .toEqual(['1', '2', '3']);
    expect([...answers.matchAll(/^\s*(\d+)\.\s+\S/gm)].map(match => match[1]))
      .toEqual(['1', '2', '3']);
    const answerText = answers.replace(/\s+/g, ' ');
    expect(answerText).toContain('normalization trims it');
    expect(answerText).toContain('derived policy and artifact');
    expect(answerText).toContain('neither deletes stored bytes nor unlearns');
  });
  it('opens with the processing problem, not prediction, and retains the taught formula', () => {
    const headings = [...parsed.body.matchAll(/^## (.+)$/gm)].map(match => match[1]);
    expect(headings[0]).toBe('The problem: verified text is not yet training input');
    expect(headings.indexOf('The solution: stop once, count at every reached rule')).toBeGreaterThan(0);
    expect(parsed.body).not.toMatch(/\bpredict(?:ion|ions)?\b/i);
    expect(parsed.body).toContain('{/* chapter-section:symbol-glossary */}\n\n## Symbols in the filtering fraction');
    expect(parsed.data.formula.latex).toBe('r_k=\\frac{n_{\\mathrm{disposition},k}}{n_{\\mathrm{seen},k}}');
    expect(parsed.body).toContain('unavailable, not zero');
    expect(parsed.body).toContain('a different quantity');
    expect(parsed.body).toContain('not all eight');
  });
  it('binds eight actual Rust regions in seven shared or demo files', () => {
    expect(parsed.data.rust_sources).toHaveLength(8);
    expect(new Set(parsed.data.rust_sources.map((entry: { path: string }) => entry.path)).size).toBe(7);
    expect(new Set(contract.rust.sources)).toEqual(new Set(parsed.data.rust_sources.map((entry: { path: string }) => entry.path)));
    for (const entry of parsed.data.rust_sources) {
      const source = read(entry.path);
      const start = `// region:${entry.region}`, end = `// endregion:${entry.region}`;
      expect(source.split(start)).toHaveLength(2);
      expect(source.split(end)).toHaveLength(2);
      expect(source.indexOf(end)).toBeGreaterThan(source.indexOf(start));
      expect(parsed.body.split(`region="${entry.region}"`)).toHaveLength(2);
    }
  });
  it('matches exact Rust output, English metadata and contract commitments', () => {
    expect(contract.rust.expected_output).toBe(golden);
    const catalog = JSON.parse(read(`site/src/i18n/functional-catalogs/en/${id}.json`));
    expect(catalog.chapterId).toBe(id); expect(catalog.locale).toBe('en');
    for (const key of ['title', 'description', 'objective']) expect(catalog[key]).toBe(parsed.data[key]);
    expect(catalog.contentRevision).toBe(1); expect(parsed.data.content_revision).toBe(1); expect(contract.content_revision).toBe(1);
    for (const key of ['objective', 'worked_inputs', 'decoder_connection']) expect(parsed.data[key]).toBe(contract[key].en);
    expect(parsed.data.formula.latex).toBe(contract.formula.latex);
    expect(parsed.data.formula.symbols).toEqual(contract.formula.symbols.map((symbol: { symbol: string; en: string }) => ({ symbol: symbol.symbol, meaning: symbol.en })));
    expect(parsed.data.visualization).toEqual({ ...contract.visualization, rationale: contract.visualization.rationale.en });
    expect(report.retained_text).toEqual(['cat sat.']);
    expect(report.real_corpus_filtered).toBe(false); expect(report.model_trained).toBe(false); expect(report.privacy_certified).toBe(false);
  });
  it('preserves exact source-supported historical claims in the visible lesson', () => {
    const sources = contract.history.llm_evolution.sources;
    expect(sources.map((source: { source_url: string }) => source.source_url)).toEqual([
      'https://aclanthology.org/2021.emnlp-main.98/',
      'https://proceedings.neurips.cc/paper_files/paper/2023/hash/fa3ed726cc5073b9c31e3e49a807789c-Abstract-Datasets_and_Benchmarks.html',
    ]);
    expect(parsed.data.history.llm_evolution.sources).toEqual(sources.map((source: { claim: { en: string } }) => ({ ...source, claim: source.claim.en })));
    for (const source of sources) {
      expect(parsed.body).toContain(source.source_url);
      expect(parsed.body.replace(/\s+/g, ' ')).toContain(source.claim.en);
    }
    expect(parsed.body).toContain('not an implementation reproduced from either paper');
  });
  it('retains seven chapter-used cheat-sheet terms and defers every Russian surface', () => {
    const sheet = JSON.parse(read(`site/src/content/cheat-sheets/en/${id}.json`));
    expect(sheet.locale).toBe('en'); expect(sheet.chapter_id).toBe(id);
    expect(sheet.terms.map((term: { term: string }) => term.term)).toEqual([
      'Record frame', 'First-terminal decision', 'Stage population', 'Manual review',
      'Normalization', 'Occurrence identity', 'Known-source withdrawal',
    ]);
    expect(sheet.terms.map((term: { term: string }) => term.term)).toEqual(contract.terminology.map((term: { en: string }) => term.en));
    for (const path of [`site/src/content/chapters/ru/${id}.mdx`, `site/src/content/cheat-sheets/ru/${id}.json`, `site/src/i18n/functional-catalogs/ru/${id}.json`]) expect(existsSync(resolve(process.cwd(), '..', path))).toBe(false);
  });
});
