import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import test from 'node:test';
import {readRegularFile} from '../../lib/bound-files.mjs';
import * as maintained from '../../reviews/english/scripts/english-review.mjs';
import {verifyProductMigrationOverlay} from '../../reviews/product-migration-overlay.mjs';
const historyRoot=process.env.COURSE_HISTORY_ROOT;
if(!historyRoot)throw new Error('COURSE_HISTORY_ROOT must select an exact MCP-exported checkpoint');
const root=resolve(import.meta.dirname,'../../..');
const original=await import(pathToFileURL(resolve(historyRoot,'.agents/skills/author-llm-course-english/scripts/english-review.mjs')).href);
test('both canonical review and adjudication prompts retain exact original bytes in all four roles',()=>{
  for(const role of ['technical-pedagogical','isolated-surface']) {
    assert.equal(maintained.canonicalReviewPrompt(role),original.canonicalReviewPrompt(role));
    assert.equal(maintained.canonicalAdjudicationPrompt(role),original.canonicalAdjudicationPrompt(role));
  }
});
test('all four canonical schemas retain exact archived bytes',()=>{
  for(const [old,next] of [
    ['author-llm-course-english','english'],['localize-llm-course','localization'],
  ]) for(const schema of next==='english'?['review-record','adjudication-record','evidence-receipt']:['review-record'])
    assert.deepEqual(readRegularFile(root,'scripts/reviews/'+next+'/references/'+schema+'.schema.json'),readRegularFile(historyRoot,'.agents/skills/'+old+'/references/'+schema+'.schema.json'));
});
test('current complete product files differ only by the exact authorized mechanical transport overlay',()=>{
  const result=verifyProductMigrationOverlay(root,historyRoot);
  assert.equal(result.relocations,3);assert.equal(result.pathUpdates,4);
});
