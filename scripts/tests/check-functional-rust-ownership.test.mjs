import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseRegistryFragment,ownedSources,readFunctionalPlan,checkFunctionalRustOwnership} from '../check-functional-rust-ownership.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const owners=ownedSources(readFunctionalPlan(root));
const filename='ch41-corpus-preparation.module';
const good='version=1\nmodule=functional::data::prepared_corpus\nsource=src/data/prepared_corpus.rs\n';
test('Node grammar exactly preserves approved module mapping',()=>{
  assert.deepEqual(parseRegistryFragment(filename,Buffer.from(good),owners),
    [{module:'functional::data::prepared_corpus',source:'src/data/prepared_corpus.rs'}]);
});
test('malformed/duplicate/unsafe/cross-owner fragment corpus refuses',()=>{
  for(const bad of [good.replace('version=1','version=2'),good.replace('module=','unknown='),
    good.replace('data::','other::'),good.replace('src/','../src/'),
    good.replaceAll('\n','\r\n'),good.trimEnd(),good+'\n',good+'\n'+good,
    good.replace('prepared_corpus.rs','prepared_corpüs.rs')])
    assert.throws(()=>parseRegistryFragment(filename,Buffer.from(bad),owners));
  assert.throws(()=>parseRegistryFragment('ch40-reference-core-handoff.module',Buffer.from(good),owners));
  assert(!owners.some(o=>o.fragment==='ch40-reference-core-handoff.module'));
  assert.throws(()=>parseRegistryFragment('ch40-reference-core-handoff.module',Buffer.from('version=1\nmodule=functional::integration::reference_handoff\nsource=src/integration/reference_handoff.rs\n'),owners));
});
test('canonical registry exhaustively validates actual owned functional sources',()=>{
  const result=checkFunctionalRustOwnership(resolve(root));
  assert.ok(Number.isSafeInteger(result.registeredSources));
  assert.ok(result.registeredSources>=0);
});
