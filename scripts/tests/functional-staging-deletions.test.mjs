import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {applyStagingDeletions} from '../lib/functional-staging-deletions.mjs';
function fixture(){const root=mkdtempSync(join(tmpdir(),'candidate-delete-')),work=join(root,'work'),path='rust/demos/example/src/bin/old.rs',manifest=join(root,'deleted.json');mkdirSync(join(work,'rust/demos/example/src/bin'),{recursive:true});writeFileSync(join(work,path),'old');return {root,work,path,manifest,write(paths){writeFileSync(manifest,JSON.stringify({schema_version:1,paths}));},close(){rmSync(root,{recursive:true,force:true});}};}
test('declared regular candidate file is removed, sibling baseline preserved',()=>{const f=fixture();try{writeFileSync(join(f.work,'rust/demos/example/src/bin/keep.rs'),'keep');f.write([f.path]);assert.deepEqual(applyStagingDeletions(f.manifest,f.work),[f.path]);assert.equal(existsSync(join(f.work,f.path)),false);assert.equal(readFileSync(join(f.work,'rust/demos/example/src/bin/keep.rs'),'utf8'),'keep');}finally{f.close();}});
test('whole list validates before any deletion',()=>{const f=fixture();try{for(const bad of ['../outside','/absolute','rust//bad','rust/../bad','site/lesson.mdx',f.path]){f.write([f.path,bad]);assert.throws(()=>applyStagingDeletions(f.manifest,f.work));assert.equal(existsSync(join(f.work,f.path)),true);}}finally{f.close();}});
test('symlink target and malformed shape refuse',()=>{const f=fixture();try{symlinkSync(join(f.work,f.path),join(f.work,'rust/link.rs'));f.write(['rust/link.rs']);assert.throws(()=>applyStagingDeletions(f.manifest,f.work));writeFileSync(f.manifest,'{"schema_version":1,"paths":[],"extra":true}');assert.throws(()=>applyStagingDeletions(f.manifest,f.work));}finally{f.close();}});
test('empty obsolete member parents are pruned without touching Rust root or unrelated empty directories',()=>{
 const f=fixture();try{
  mkdirSync(join(f.work,'unrelated-empty'));
  f.write([f.path]);applyStagingDeletions(f.manifest,f.work);
  assert.equal(existsSync(join(f.work,'rust/demos/example')),false);
  assert.equal(existsSync(join(f.work,'rust')),true);
  assert.equal(existsSync(join(f.work,'unrelated-empty')),true);
 }finally{f.close();}
});
test('explicit empty child is removed only if empty and stays inside owned Rust candidate',()=>{
 const f=fixture();try{
  const child='rust/demos/example/empty-child';mkdirSync(join(f.work,child));
  writeFileSync(f.manifest,JSON.stringify({schema_version:1,paths:[f.path],empty_directories:[child]}));
  applyStagingDeletions(f.manifest,f.work);
  assert.equal(existsSync(join(f.work,'rust/demos/example')),false);
  assert.equal(existsSync(join(f.work,'rust')),true);
 }finally{f.close();}
 for(const bad of ['../outside','site/empty','rust/../outside','rust/link']){
  const g=fixture();try{writeFileSync(g.manifest,JSON.stringify({schema_version:1,paths:[g.path],empty_directories:[bad]}));assert.throws(()=>applyStagingDeletions(g.manifest,g.work));assert.equal(existsSync(join(g.work,g.path)),true);}finally{g.close();}
 }
 const g=fixture();try{
  const child='rust/demos/example/not-empty';mkdirSync(join(g.work,child));writeFileSync(join(g.work,child,'keep'),'keep');
  writeFileSync(g.manifest,JSON.stringify({schema_version:1,paths:[g.path],empty_directories:[child]}));
  assert.throws(()=>applyStagingDeletions(g.manifest,g.work));assert.equal(existsSync(join(g.work,g.path)),true);
  assert.equal(readFileSync(join(g.work,child,'keep'),'utf8'),'keep');
 }finally{g.close();}
});
