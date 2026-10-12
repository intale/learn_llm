import assert from 'node:assert/strict';
import {cpSync,mkdtempSync,mkdirSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,resolve} from 'node:path';
import test from 'node:test';
import {canonicalJson,hash} from '../lib/bound-files.mjs';
import {verifySourceMetadata,verifySourceProductionHistory,SOURCE_METADATA_MANIFEST,SOURCE_ASSET_CONFIG} from '../lib/source-metadata-inputs.mjs';
import {parseCacheArguments} from '../lib/run-functional-artifact-cache.mjs';
const project=resolve(import.meta.dirname,'../..');
function fixture(t) {
  const root=mkdtempSync(resolve(tmpdir(),'course-source-inputs-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const paths=[SOURCE_ASSET_CONFIG,SOURCE_METADATA_MANIFEST,'scripts/data/tinystories/attribution-and-permission.json','scripts/data/tinystories/cdla-page-text.txt'];
  for(const path of paths){mkdirSync(dirname(resolve(root,path)),{recursive:true});cpSync(resolve(project,path),resolve(root,path));}
  return root;
}
test('minimal source-image inputs retain the exact existing policy and two required metadata payloads',t=>{
  const root=fixture(t),{manifest,asset}=verifySourceMetadata(root);
  assert.equal(manifest.files.length,2);assert.equal(asset.manifest_recipe.producer,null);
  assert.equal(hash(readFileSync(resolve(root,SOURCE_ASSET_CONFIG))),hash(readFileSync(resolve(project,SOURCE_ASSET_CONFIG))));
  assert.throws(()=>verifySourceProductionHistory(root,root,{stepId:'acquire-functional-tinystories-raw-pair',targetId:'acquire-functional-tinystories-raw-pair-v2'}),/ENOENT/);
});
test('matching rewritten metadata hashes cannot change the original source-policy payloads',t=>{
  const root=fixture(t),path=resolve(root,SOURCE_METADATA_MANIFEST),manifest=JSON.parse(readFileSync(path));
  const file=manifest.files[1],bytes=Buffer.from('changed license\n');
  writeFileSync(resolve(root,file.path),bytes);file.bytes=bytes.length;file.sha256=hash(bytes);writeFileSync(path,canonicalJson(manifest));
  assert.throws(()=>verifySourceMetadata(root),/byte\/coverage/);
});
test('source-policy drift, extra descriptors, duplicate JSON and symlink metadata refuse',t=>{
  const root=fixture(t),path=resolve(root,SOURCE_METADATA_MANIFEST),before=readFileSync(path),manifest=JSON.parse(before);
  manifest.files.push(manifest.files[0]);writeFileSync(path,canonicalJson(manifest));assert.throws(()=>verifySourceMetadata(root),/identity/);
  writeFileSync(path,'{"schemaVersion":1,"schemaVersion":1}\n');assert.throws(()=>verifySourceMetadata(root),/noncanonical/);
  writeFileSync(path,before);const file=resolve(root,manifest.files[0].path);rmSync(file);symlinkSync(resolve(project,manifest.files[0].path),file);assert.throws(()=>verifySourceMetadata(root),/symlink/);
  writeFileSync(resolve(root,SOURCE_ASSET_CONFIG),'{}\n');assert.throws(()=>verifySourceMetadata(root),/recipe drift/);
});
test('only accepted production-cache modes require an explicit exported history root',()=>{
  const common=['--run-id','20261010T000000Z-example-01','--step','s','--target','t'];
  for(const mode of ['publish','verify','replay']) {
    const args=[mode,...common,...(mode==='replay'?['--receipt','/receipt']:['--input','/input'])];
    assert.throws(()=>parseCacheArguments(args));
    assert.equal(parseCacheArguments([...args,'--history-root','/exported-checkpoint'])['history-root'],'/exported-checkpoint');
  }
  assert.equal(parseCacheArguments(['self-test',...common]).mode,'self-test');
  assert.throws(()=>parseCacheArguments(['self-test',...common,'--history-root','/unrelated']));
});
