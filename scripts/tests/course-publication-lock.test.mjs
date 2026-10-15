import assert from 'node:assert/strict';
import {cpSync,mkdtempSync,mkdirSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,resolve} from 'node:path';
import test from 'node:test';
import {canonicalJson,hash,jsonFile,readRegularFile} from '../lib/bound-files.mjs';
import {captureProductLock,verifyProductLock,PRODUCT_DIRECTORIES,PRODUCT_FILES,PRODUCT_LOCK_PATH} from '../lib/course-publication-lock.mjs';
import {runProductLockCli} from '../course-publication-lock.mjs';
import {readPracticalPublication} from '../check-course-boundaries.mjs';

const project=resolve(import.meta.dirname,'../..');
function fixture(t) {
  const root=mkdtempSync(resolve(tmpdir(),'course-product-lock-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  for(const path of [...PRODUCT_DIRECTORIES,...PRODUCT_FILES]) {
    mkdirSync(dirname(resolve(root,path)),{recursive:true});
    cpSync(resolve(project,path),resolve(root,path),{recursive:true});
  }
  const lock=captureProductLock(root);
  const save=()=>writeFileSync(resolve(root,PRODUCT_LOCK_PATH),canonicalJson(lock));
  save();
  return {root,lock,save};
}
test('required product head admits the current courses without local process history',t=>{
  const {root,lock}=fixture(t);
  for(const path of ['AGENTS.md','SKILLS.md','BUILD_STATE.yaml','DECISIONS.md','.agents','audits','artifacts'])
    assert.throws(()=>readRegularFile(root,path));
  assert.deepEqual(verifyProductLock(root),lock);
  assert.equal(lock.courses[0].chapters.length,40);
  assert.deepEqual(lock.courses[0].activeLocales,['en','ru']);
  assert.deepEqual(lock.courses[1].chapters.map(c=>c.contentRevision),[3,1,1,2,1,1,1,1,1,2]);
  assert.deepEqual(lock.courses[1].activeLocales,['en']);
  assert.deepEqual(readPracticalPublication(root).chapters.map(c=>c.chapterId),lock.courses[1].chapters.map(c=>c.chapterId));
  assert.equal(Object.hasOwn(lock,'status'),false);
});
test('missing malformed duplicate-key noncanonical and symlink heads fail without fallback or capture',t=>{
  const {root,lock}=fixture(t),path=resolve(root,PRODUCT_LOCK_PATH);
  rmSync(path);assert.throws(()=>readPracticalPublication(root),/ENOENT/);
  assert.throws(()=>readRegularFile(root,PRODUCT_LOCK_PATH));
  for(const bytes of ['not JSON\n','{"schemaVersion":1,"schemaVersion":1}\n',JSON.stringify(lock,null,2)+'\n',canonicalJson({...lock,status:'pass'})]) {
    writeFileSync(path,bytes);assert.throws(()=>readPracticalPublication(root));
  }
  rmSync(path);symlinkSync('absent.json',path);assert.throws(()=>readPracticalPublication(root),/symlink/);
});
test('changed or missing product bytes and extra files cannot pass the existing lock',t=>{
  const {root}=fixture(t),path='site/src/content/practical-chapters/en/03-scalable-bpe-tokenizer.mdx';
  const original=readRegularFile(root,path);
  writeFileSync(resolve(root,path),Buffer.concat([original,Buffer.from('\nchanged teaching\n')]));
  assert.throws(()=>verifyProductLock(root),/byte\/hash drift/);
  writeFileSync(resolve(root,path),original);
  const extra=resolve(root,'site/src/data/undeclared.json');writeFileSync(extra,'{}\n');
  assert.throws(()=>verifyProductLock(root),/inventory coverage/);rmSync(extra);
  rmSync(resolve(root,'rust/demos/practical-ch03-scalable-bpe-tokenizer/expected.txt'));
  assert.throws(()=>verifyProductLock(root));
});
test('closed inventory rejects reordered duplicate omitted unsafe nonregular and malformed descriptors',t=>{
  const f=fixture(t),original=structuredClone(f.lock),path=resolve(f.root,PRODUCT_LOCK_PATH);
  for(const change of [
    lock=>lock.files.reverse(),lock=>lock.files.push(lock.files[0]),lock=>lock.files.splice(3,1),
    lock=>lock.files[0].path='../outside',lock=>lock.files[0].path='/absolute',
    lock=>lock.files[0].path='site/src',lock=>lock.files[0].bytes=-1,
    lock=>lock.files[0].sha256='A'.repeat(64),lock=>lock.files[0].extra='unknown',
    lock=>lock.courses[1].chapters[0].extra='unknown',lock=>lock.courses[1].activeLocales.push('ru'),
    lock=>lock.courses[1].chapters.pop(),lock=>lock.courses.reverse(),
  ]) {
    const changed=structuredClone(original);change(changed);
    writeFileSync(path,canonicalJson(changed));assert.throws(()=>verifyProductLock(f.root));
  }
});
test('source metadata is validated even when a rewritten source hash agrees',t=>{
  const f=fixture(t),path='site/src/content/practical-chapters/en/03-scalable-bpe-tokenizer.mdx';
  const original=readRegularFile(f.root,path).toString();
  for(const [before,after] of [['"content_revision":2','"content_revision":3'],['"locale":"en"','"locale":"ru"'],['"order":3','"order":4']]) {
    const bytes=Buffer.from(original.replace(before,after));assert.notEqual(bytes.toString(),original);
    writeFileSync(resolve(f.root,path),bytes);
    const descriptor=f.lock.files.find(file=>file.path===path);descriptor.bytes=bytes.length;descriptor.sha256=hash(bytes);f.save();
    assert.throws(()=>verifyProductLock(f.root),/identity|revision/);
  }
});
test('symlink files and directories cannot escape the closed product roots',t=>{
  const {root}=fixture(t),path=resolve(root,'site/src/data/course/corpus-preparation-trace.json');
  rmSync(path);symlinkSync(resolve(project,'site/src/data/course/corpus-preparation-trace.json'),path);
  assert.throws(()=>verifyProductLock(root),/symlink/);
  rmSync(resolve(root,'site/src/data'),{recursive:true});symlinkSync(resolve(project,'site/src/data'),resolve(root,'site/src/data'));
  assert.throws(()=>verifyProductLock(root),/symlink/);
});
test('explicit CLI capture cannot overwrite a head or weaken the frozen first crate',t=>{
  const {root}=fixture(t);
  assert.throws(()=>runProductLockCli(['capture','--root',root,'--out',PRODUCT_LOCK_PATH]),/closed/);
  assert.throws(()=>runProductLockCli(['verify','--root',root,'--root',root]),/closed/);
  assert.throws(()=>runProductLockCli(['capture','--root',root,'--out','outside.json']),/closed/);
  assert.throws(()=>runProductLockCli(['verify','--root',root,'--out',PRODUCT_LOCK_PATH]),/closed/);
  const result=runProductLockCli(['verify','--root',root]);assert.equal(result.courses[1].chapters,10);
  rmSync(resolve(root,PRODUCT_LOCK_PATH));
  writeFileSync(resolve(root,'rust/crates/llm-from-scratch/src/tokenizer/bpe.rs'),'changed\n');
  assert.throws(()=>runProductLockCli(['capture','--root',root,'--out',PRODUCT_LOCK_PATH,'--history-root',root]),/baseline bytes changed/);
  assert.throws(()=>jsonFile(root,PRODUCT_LOCK_PATH));
});
