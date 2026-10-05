import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseRegistryFragment,ownedSources,readFunctionalPlan,checkFunctionalRustOwnership} from '../check-functional-rust-ownership.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const owners=ownedSources(readFunctionalPlan(root));
const filename='ch40-reference-core-handoff.module';
const good='version=1\nmodule=functional::integration::reference_handoff\nsource=src/integration/reference_handoff.rs\n';
test('Node grammar exactly preserves approved module mapping',()=>{
  assert.deepEqual(parseRegistryFragment(filename,Buffer.from(good),owners),
    [{module:'functional::integration::reference_handoff',source:'src/integration/reference_handoff.rs'}]);
});
test('malformed/duplicate/unsafe/cross-owner fragment corpus refuses',()=>{
  for(const bad of [good.replace('version=1','version=2'),good.replace('module=','unknown='),
    good.replace('integration::','other::'),good.replace('src/','../src/'),
    good.replaceAll('\n','\r\n'),good.trimEnd(),good+'\n',good+'\n'+good,
    good.replace('reference_handoff.rs','reference_handöff.rs')])
    assert.throws(()=>parseRegistryFragment(filename,Buffer.from(bad),owners));
  assert.throws(()=>parseRegistryFragment('ch41-governed-corpus-acquisition.module',Buffer.from(good),owners));
});
test('canonical registry exhaustively validates actual owned functional sources',()=>{
  const result=checkFunctionalRustOwnership(resolve(root));
  assert.ok(Number.isSafeInteger(result.registeredSources));
  assert.ok(result.registeredSources>=0);
});
