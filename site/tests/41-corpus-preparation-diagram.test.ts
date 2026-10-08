// @ts-ignore Node APIs are supplied by Vitest.
import {readFileSync} from 'node:fs';
// @ts-ignore Node APIs are supplied by Vitest.
import {resolve} from 'node:path';
import {describe,it,expect} from 'vitest';
// @ts-ignore Maintained diagram style validator.
import {validateDiagramComponentSource} from '../../scripts/check-site-content.mjs';
declare const process:{cwd():string};
const read=(path:string)=>readFileSync(resolve(process.cwd(),'..',path),'utf8');
const component=read('site/src/components/chapters/CorpusPreparationDiagram.astro');
const trace=JSON.parse(read('artifacts/functional-laptop/chapters/41-corpus-preparation/corpus-preparation-trace.json'));
describe('Chapter41 actual two-producer static figure evidence',()=>{
 it('matches recorded external and Rust counts without implying a bulk result',()=>{
  expect(trace.documents).toEqual({input:6,after_quality:4,prepared:3});
  expect(trace.loading.all_roles).toEqual({documents:3,text_utf8_bytes:39});
  expect(trace.loading.training_only).toEqual({documents:1,text_utf8_bytes:11});
  expect(['train','validation','test'].map(key=>[trace.splits[key].documents,trace.splits[key].decoded_text_utf8_bytes])).toEqual([[1,11],[1,11],[1,17]]);
  expect(trace.scope).not.toMatch(/bulk|approved-corpus/);
  for(const field of ['trace.documents.input','trace.documents.after_quality','trace.documents.prepared','trace.loading.all_roles.documents','trace.loading.training_only.text_utf8_bytes'])expect(component).toContain(field);
 });
 it('uses exactly one shared semantic figure with local geometry only',()=>{
  expect(component.match(/<figure\b/g)).toHaveLength(1);expect(component.match(/<figcaption\b/g)).toHaveLength(1);
  expect(component).toContain('data-visualization-id="corpus-preparation"');expect(component).toContain('class="course-diagram corpus-preparation-diagram"');
  expect(component).toContain('data-diagram-style="course-v1"');expect(component).toContain('<InlineMath');
  expect(()=>validateDiagramComponentSource(component,'Chapter41 corpus-preparation')).not.toThrow();
  expect(component).not.toMatch(/<(?:script|dialog|button)\b|client:|overflow:\s*(?:hidden|clip)/);
 });
});
