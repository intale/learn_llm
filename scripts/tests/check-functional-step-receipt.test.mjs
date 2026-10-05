import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {publicationInputPaths,languageVerifierInvocations,readRegularFile,jsonFile,verifyPublicationReceipt} from '../check-functional-step-receipt.mjs';
test('Chapter40 routes actual maintained English and Russian verifiers',()=>{
  const commands=languageVerifierInvocations('40-reference-core-handoff',['en','ru'],'/fixture');
  assert.equal(commands.length,2);
  assert.ok(commands[0].args.includes('--adjudication-seals'));
  assert.ok(commands[0].args.includes('audits/functional-laptop/reviews/40-reference-core-handoff/english/spec.json'));
  assert.ok(commands[1].args.includes('audits/functional-laptop/reviews/40-reference-core-handoff/ru/target-only.raw.json'));
  assert.equal(languageVerifierInvocations('41-governed-corpus-acquisition',['en'],'/fixture').length,1);
  assert.throws(()=>languageVerifierInvocations('41-governed-corpus-acquisition',['en','ru'],'/fixture'));
});
test('closed activation inventory contains exact real locale input paths',()=>{
  const paths=publicationInputPaths('40-reference-core-handoff',['en','ru']);
  assert.ok(paths.includes('site/src/i18n/functional-catalogs/ru/40-reference-core-handoff.json'));
  assert.ok(paths.includes('audits/functional-laptop/reviews/40-reference-core-handoff/english/adjudication-seals/technical-pedagogical/receipt.json'));
  assert.ok(!publicationInputPaths('41-governed-corpus-acquisition',['en']).some(p=>p.includes('/ru/')));
});
test('missing receipt and unsafe paths refuse before any verifier',()=>{
  const root=mkdtempSync(join(tmpdir(),'functional-receipt-'));
  try{
    assert.throws(()=>verifyPublicationReceipt(root,{chapterId:'40-reference-core-handoff',activeLocales:['en','ru']},{run:()=>{throw new Error('must not run');}}));
    for(const p of ['../outside','/absolute','a//b','a/./b','a\\b'])assert.throws(()=>readRegularFile(root,p));
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('canonical JSON rejects duplicate/unknown spelling and symlink inputs',()=>{
  const root=mkdtempSync(join(tmpdir(),'functional-json-'));
  try{
    mkdirSync(join(root,'inputs'));
    writeFileSync(join(root,'inputs/a.json'),'{"x":1,"x":2}\n');
    assert.throws(()=>jsonFile(root,'inputs/a.json',1024,true));
    writeFileSync(join(root,'inputs/a.json'),'{"x":1}\n');
    assert.deepEqual(jsonFile(root,'inputs/a.json',1024,true),{x:1});
    symlinkSync('a.json',join(root,'inputs/link.json'));
    assert.throws(()=>readRegularFile(root,'inputs/link.json'));
    assert.throws(()=>readRegularFile(root,'inputs/a.json',1));
  }finally{rmSync(root,{recursive:true,force:true});}
});
