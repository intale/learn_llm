// @ts-ignore Node APIs are supplied by Vitest.
import {readFileSync,existsSync} from 'node:fs';
// @ts-ignore Node APIs are supplied by Vitest.
import {resolve} from 'node:path';
import {describe,it,expect} from 'vitest';
// @ts-ignore Maintained repository parser and content assertions.
import {parseJsonFrontmatter} from '../../scripts/check-site-content.mjs';
declare const process:{cwd():string};
const read=(path:string)=>readFileSync(resolve(process.cwd(),'..',path),'utf8');
const id='41-corpus-preparation';
const lesson=parseJsonFrontmatter(read(`site/src/content/chapters/en/${id}.mdx`));
const contract=parseJsonFrontmatter(read(`curriculum/chapters/${id}.md`)).data;
describe('Chapter41 exact active English source bindings',()=>{
 it('preserves author metadata and actual generated Rust stdout',()=>{
  const catalog=JSON.parse(read(`site/src/i18n/functional-catalogs/en/${id}.json`));
  for(const key of ['title','description','objective'])expect(catalog[key]).toBe(lesson.data[key]);
  for(const key of ['objective','worked_inputs','decoder_connection'])expect(contract[key].en).toBe(lesson.data[key]);
  expect(contract.formula.latex).toBe(lesson.data.formula.latex);
  expect(contract.rust.expected_output).toBe(read('rust/demos/ch41-corpus-preparation/expected.txt'));
 });
 it('binds all five declared source excerpts to actual unique Rust regions',()=>{
  expect(lesson.data.rust_sources).toHaveLength(5);
  expect([...new Set(lesson.data.rust_sources.map((entry:{path:string})=>entry.path))]).toEqual(contract.rust.sources);
  for(const entry of lesson.data.rust_sources){const source=read(entry.path);expect(source.split(`// region:${entry.region}`)).toHaveLength(2);expect(source.split(`// endregion:${entry.region}`)).toHaveLength(2);expect(lesson.body.split(`region="${entry.region}"`)).toHaveLength(2);}
 });
 it('selects the real stdin demo and one exact failure test without inventing a CLI',()=>{
  expect(lesson.body).toContain('./course run cargo run --offline --locked');
  expect(lesson.body).toContain('< rust/demos/ch41-corpus-preparation/fixtures/prepared.jsonl');
  expect(lesson.body).toContain('tests::malformed_later_input_has_no_success_summary -- --exact');
  expect(read('rust/demos/ch41-corpus-preparation/src/lib.rs')).toContain('fn malformed_later_input_has_no_success_summary(');
  expect(lesson.body).not.toContain('./course rust-run');
  expect(lesson.body).toContain('--network none');expect(lesson.body).toContain('--gpus all');
  expect(lesson.body).toContain('docker/nemo-curator.Dockerfile');
 });
 it('keeps exact history projections and the nine chapter terms',()=>{
  for(const source of contract.history.llm_evolution.sources){expect(lesson.body).toContain(source.source_url);expect(lesson.body.replace(/\s+/g,' ')).toContain(source.claim.en);}
  const sheet=JSON.parse(read(`site/src/content/cheat-sheets/en/${id}.json`));
  expect(sheet.terms).toHaveLength(9);expect(sheet.terms.map((term:{term:string})=>term.term)).toEqual(contract.terminology.map((term:{en:string})=>term.en));
 });
 it('is problem-first and uses matched optional task/answer lists',()=>{
  const opening=lesson.body.split('{/* chapter-section:formula */}')[0];
  expect(opening).toContain('## The problem:');expect(opening).not.toMatch(/\?|\b(?:predict the outcome|make a prediction|what do you expect)\b/i);
  const practice=lesson.body.split('{/* chapter-section:exercises */}')[1].split('{/* chapter-section:decoder-connection */}')[0];
  const parts=practice.split('<details>');
  for(const part of parts)expect([...part.matchAll(/^\s*(\d+)\.\s+\S/gm)].map(match=>match[1])).toEqual(['1','2']);
 });
 it('defers Russian and removes old published corpus routes in the current tree',()=>{
  for(const path of [`site/src/content/chapters/ru/${id}.mdx`,`site/src/i18n/functional-catalogs/ru/${id}.json`,`site/src/content/cheat-sheets/ru/${id}.json`])expect(existsSync(resolve(process.cwd(),'..',path))).toBe(false);
  for(const old of ['41-governed-corpus-acquisition','42-deterministic-corpus-filtering'])expect(existsSync(resolve(process.cwd(),'src/content/chapters/en/'+old+'.mdx'))).toBe(false);
 });
});
