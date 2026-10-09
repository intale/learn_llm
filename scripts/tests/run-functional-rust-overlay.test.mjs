import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const launcher=fileURLToPath(new URL('../run-functional-rust-overlay.sh',import.meta.url));
const runId='20261005T114801Z-example-01';
const image='sha256:'+'a'.repeat(64);
function fixture() {
  const root=mkdtempSync(join(tmpdir(),'rust-overlay-'));
  const run=join(root,'.build/runs',runId),bin=join(root,'mock-bin');
  for(const p of ['rust','configs',bin,join(run,'publish'),join(run,'cargo-cache/registry')])
    mkdirSync(resolve(root,p),{recursive:true});
  writeFileSync(join(root,'Cargo.toml'),'[workspace]\n');
  const log=join(root,'mock-invocation.json');
  writeFileSync(join(bin,'docker'),`#!/usr/bin/env node
const fs=require('node:fs');
fs.writeFileSync(process.env.MOCK_DOCKER_LOG,JSON.stringify(process.argv.slice(2)));
if(process.argv.includes('-i'))fs.writeFileSync(process.env.MOCK_STDIN_LOG,fs.readFileSync(0));
process.stdout.write('mock Docker transport only\\n');
process.exit(Number(process.env.MOCK_DOCKER_EXIT||0));
`,{mode:0o700});
  const stdinLog=join(root,'stdin-bytes');
  return {root,run,log,stdinLog,call(args=[runId,'compile-01',image,'--','cargo','check','--locked','--offline'],exit=0,input=undefined){
    return spawnSync('bash',[launcher,...args],{cwd:root,encoding:'utf8',input,
      env:{...process.env,PATH:bin+':'+process.env.PATH,MOCK_DOCKER_LOG:log,MOCK_STDIN_LOG:stdinLog,MOCK_DOCKER_EXIT:String(exit)}});
  },close(){rmSync(root,{recursive:true,force:true});}};
}
test('fixed offline cached-image overlay preserves argv and scopes every mount',()=>{
  const f=fixture();try{
    const result=f.call();assert.equal(result.status,0,result.stderr);
    const args=JSON.parse(readFileSync(f.log,'utf8'));
    assert.deepEqual(args.slice(0,6),['run','--rm','--pull','never','--network','none']);
    assert.ok(!args.includes('-i') && !args.includes('-t'));
    assert.ok(args.includes('/work:rw,nosuid,nodev,size=512m,mode=0755'));
    assert.ok(args.includes(f.root+':/repo:ro'));
    assert.ok(args.includes(f.run+'/publish:/staged:ro'));
    assert.ok(args.includes(f.run+'/cargo-cache:/cache'));
    assert.ok(args.includes(f.run+'/rust-target:/target'));
    assert.deepEqual(args.slice(-5),['sh','cargo','check','--locked','--offline']);
    const program=args[args.indexOf('-c')+1];
    assert.match(program,/find \. -type f -print0/);
    assert.match(program,/input-hashes\.txt/);
    assert.match(program,/if "\$@"/);
    assert.equal(readFileSync(join(f.run,'validation/compile-01/argv.nul'),'utf8'),'cargo\0check\0--locked\0--offline\0');
  }finally{f.close();}
});
test('only Cargo run forwards supplied bytes, empty EOF and malformed input without a TTY',()=>{
  for(const input of ['{"id":"a","text":"one"}\n','','not-json\n']){
    const f=fixture();try{
      const result=f.call([runId,'stdin-run-01',image,'--','cargo','run','--locked','--offline','-p','ch41-corpus-preparation'],0,input);
      assert.equal(result.status,0,result.stderr);
      assert.equal(readFileSync(f.stdinLog,'utf8'),input);
      const args=JSON.parse(readFileSync(f.log,'utf8'));
      assert.deepEqual(args.slice(0,7),['run','--rm','--pull','never','--network','none','-i']);
      assert.ok(!args.includes('-t') && !args.includes('--tty'));
    }finally{f.close();}
  }
});
test('actual regular-file archive copy omits empty historical packages and preserves real source parents',()=>{
 const f=fixture();try{
  writeFileSync(join(f.root,'Cargo.lock'),'version = 4\n');
  mkdirSync(join(f.root,'rust/demos/ch41-governed-corpus-acquisition'),{recursive:true});
  mkdirSync(join(f.root,'rust/crates/actual/src'),{recursive:true});
  writeFileSync(join(f.root,'rust/crates/actual/src/lib.rs'),'pub fn current() {}\n');
  const work=join(f.root,'copy-work');mkdirSync(work);
  assert.equal(f.call().status,0);
  const args=JSON.parse(readFileSync(f.log,'utf8')),program=args[args.indexOf('-c')+1];
  const copy=program.slice(program.indexOf('cd /repo\n'),program.indexOf('\ncd /staged'))
    .replaceAll('/repo',f.root).replaceAll('/work',work);
  const result=spawnSync('bash',['-c',copy],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.equal(readFileSync(join(work,'Cargo.toml'),'utf8'),'[workspace]\n');
  assert.equal(readFileSync(join(work,'rust/crates/actual/src/lib.rs'),'utf8'),'pub fn current() {}\n');
  assert.equal(existsSync(join(work,'rust/demos/ch41-governed-corpus-acquisition')),false);
 }finally{f.close();}
});
test('Docker/Cargo failure is returned and recorded without replacing evidence',()=>{
  const f=fixture();try{
    const first=f.call(undefined,7);assert.equal(first.status,7);
    const receipt=join(f.run,'validation/compile-01/launcher-exit-status.txt');
    assert.equal(readFileSync(receipt,'utf8'),'7\n');
    const log=readFileSync(f.log);
    const repeat=f.call();assert.equal(repeat.status,2);assert.match(repeat.stderr,/already exists/);
    assert.deepEqual(readFileSync(f.log),log);assert.equal(readFileSync(receipt,'utf8'),'7\n');
  }finally{f.close();}
});
test('locked offline build preserves the same bounded execution boundary',()=>{
  const f=fixture();try{
    const result=f.call([runId,'build-01',image,'--','cargo','build','--locked','--offline']);
    assert.equal(result.status,0,result.stderr);
    const args=JSON.parse(readFileSync(f.log,'utf8'));
    assert.deepEqual(args.slice(-5),['sh','cargo','build','--locked','--offline']);
    assert.deepEqual(args.slice(0,6),['run','--rm','--pull','never','--network','none']);
  }finally{f.close();}
});
test('run-owned deletion manifest mounts readonly into the candidate only',()=>{
 const f=fixture();try{writeFileSync(join(f.run,'deleted-files.json'),JSON.stringify({schema_version:1,paths:['rust/demos/example/src/bin/old.rs']}));const result=f.call();assert.equal(result.status,0,result.stderr);const args=JSON.parse(readFileSync(f.log,'utf8'));assert.ok(args.includes(`type=bind,source=${f.run}/deleted-files.json,target=/deletions.json,readonly`));assert.match(args[args.indexOf('-c')+1],/functional-staging-deletions\.mjs \/deletions\.json \/work/);}finally{f.close();}
});
test('unsafe identities and non-Cargo/provisioning commands refuse before Docker',()=>{
  const f=fixture();try{
    for(const args of [
      ['../outside','compile-01',image,'--','cargo','check','--locked'],
      [runId,'../outside',image,'--','cargo','check','--locked'],
      [runId,'compile-01','latest','--','cargo','check','--locked'],
      [runId,'compile-01',image,'--','sh','-c','true'],
      [runId,'compile-01',image,'--','cargo','fetch','--locked'],
      [runId,'compile-01',image,'--','cargo','check'],
    ])assert.equal(f.call(args).status,2);
    assert.throws(()=>readFileSync(f.log),/ENOENT/);
  }finally{f.close();}
});
test('symlink stage or cache cannot escape run ownership',()=>{
  for(const name of ['publish','cargo-cache']){
    const f=fixture();try{
      rmSync(join(f.run,name),{recursive:true,force:true});
      symlinkSync(f.root,join(f.run,name),'dir');
      assert.equal(f.call().status,2);assert.throws(()=>readFileSync(f.log),/ENOENT/);
    }finally{f.close();}
  }
});
test('symlink evidence/target and a missing repository-root invocation refuse',()=>{
  for(const name of ['validation','rust-target']){
    const f=fixture();try{
      symlinkSync(f.root,join(f.run,name),'dir');
      assert.equal(f.call().status,2);assert.throws(()=>readFileSync(f.log),/ENOENT/);
    }finally{f.close();}
  }
  const result=spawnSync('bash',[launcher,runId,'compile-01',image,'--','cargo','check','--locked'],{cwd:tmpdir(),encoding:'utf8'});
  assert.equal(result.status,2);assert.match(result.stderr,/repository root/);
});
