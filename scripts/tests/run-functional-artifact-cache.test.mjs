import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,existsSync,readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {bridgeRequest,bindProductionProvenance,selectedPolicy,runtimeMountPlan,exactKeys,runtimeSelection,freezeRuntime,checkRuntimeUnchanged} from '../lib/functional-artifact-cache-boundary.mjs';
import {validateRuntimeBinding,parseCacheArguments} from '../lib/run-functional-artifact-cache.mjs';
const digest='a'.repeat(64);
test('self-test receipt names are attempt-bound and never overwritten',()=>{
 const source=readFileSync(new URL('../lib/run-functional-artifact-cache.mjs',import.meta.url),'utf8');
 assert.ok(source.includes('`artifact-cache-receipt-v2-${attempt}.json`'));
 assert.ok(source.includes("{flag:'wx',mode:0o600}"));
 assert.ok(!source.includes("join(run,'artifact-cache-receipt-v2.json')"));
});
test('closed public command refuses arbitrary source and ignored option',()=>{
 for(const args of [['build-tools','--run-id','20261006T000000Z-example-01','--input','/ignored'],['acquire','--run-id','20261006T000000Z-example-01','--url','https://example.invalid'],['--help','--input','/ignored']])assert.throws(()=>parseCacheArguments(args));
 assert.equal(parseCacheArguments(['build-tools','--run-id','20261006T000000Z-example-01']).mode,'build-tools');
});
test('generated publication has a closed producer-bound command rather than arbitrary candidate input',()=>{
 const base=['publish-generated','--run-id','20261007T000000Z-filter-01','--step','execute-functional-corpus-filtering','--target','corpus-filtering-v1'];
 assert.equal(parseCacheArguments(base).mode,'publish-generated');
 for(const extra of [['--input','/candidate'],['--receipt','/self-declared'],['--url','https://example.invalid']])assert.throws(()=>parseCacheArguments([...base,...extra]));
 const code=readFileSync(new URL('../lib/run-functional-artifact-cache.mjs',import.meta.url),'utf8');
 assert.ok(code.includes("filtering?['--release','--bins']"));assert.ok(code.includes("cargo_profile:profile,build_argv:args"));
});
test('runtime evidence binds actual workflow image and offline boundary',()=>{const image='sha256:'+'f'.repeat(64);assert.equal(validateRuntimeBinding({image_id:image,network:'none',cargo_locked:true},image),true);for(const record of [{image_id:'sha256:'+'a'.repeat(64),network:'none',cargo_locked:true},{image_id:image,network:'bridge',cargo_locked:true}])assert.throws(()=>validateRuntimeBinding(record,image));});
const roots={runRoot:'/run-owned',inputRoot:'/candidate',cacheRoot:'/cache-owned',digest,policyKind:'production-source-policy',targetKind:'raw-pair'};
test('acquisition build authority has no runtime network or cache mount',()=>{const p=runtimeMountPlan('acquire',roots);assert.equal(p.network,'none');assert.equal(p.buildNetworkEnabled,true);assert.equal(p.cacheMounted,false);});
test('publication mounts exact input read-only and cache writable',()=>{const p=runtimeMountPlan('publish',roots);assert.deepEqual(p.mounts,[{source:'/candidate',target:'/input',readOnly:true},{source:'/cache-owned',target:'/cache',readOnly:false}]);});
test('replay chooses one entry mounted at closed alias without manifest filename',()=>{const p=runtimeMountPlan('replay',roots);assert.deepEqual(p.mounts,[{source:'/cache-owned/'+digest,target:'/entry',readOnly:true}]);assert.equal(bridgeRequest('replay',{digest}).entry_root,'/entry');});
test('production cannot downgrade selected policy or select unadmitted stage',()=>{assert.throws(()=>runtimeMountPlan('publish',{...roots,policyKind:'synthetic-offline-fixture'}));for(const kind of ['filtered','model','generic'])assert.throws(()=>runtimeMountPlan('publish',{...roots,targetKind:kind}));});
test('fixture handoff is offline and cannot acquire',()=>{const fixture={...roots,targetKind:'self-test',policyKind:'synthetic-offline-fixture'};assert.throws(()=>runtimeMountPlan('acquire',fixture));assert.equal(runtimeMountPlan('publish-generated',fixture).network,'none');});
test('bridge is v2 content-only with independent mount selection',()=>{assert.deepEqual(bridgeRequest('verify'),{operation:'verify',expected_evidence_kind:'production-source-policy',input_root:'/input'});for(const operation of ['fetch','finalize-manifest'])assert.throws(()=>bridgeRequest(operation));assert.throws(()=>bridgeRequest('replay',{digest:'../escape'}));});
test('selected recipe requires external producer and never uses candidate fields',()=>{
 const asset={evidence_kind:'production-source-policy',manifest_recipe:{producer:null,payload:[{id:'opaque',sha256:digest}]}},binding={producer:{config_sha256:digest,script_sha256:'b'.repeat(64)},selected_asset_sha256:'c'.repeat(64)};
 const selected=selectedPolicy(asset,binding);assert.deepEqual(selected.manifest.producer,binding.producer);assert.equal(asset.manifest_recipe.producer,null);bindProductionProvenance(selected.manifest,selected);
 for(const field of ['producer','payload']){const changed=structuredClone(selected.manifest);changed[field]={changed:true};assert.throws(()=>bindProductionProvenance(changed,selected));}
 assert.throws(()=>selectedPolicy({...asset,manifest_recipe:{producer:binding.producer}},binding));assert.throws(()=>exactKeys({a:1,b:2},['a']));
});

const runId='20261006T000000Z-runtime-cache-01',image='sha256:'+'a'.repeat(64),reference='approved-cache:local';
test('shared runtime selection validates expected ID and before/after snapshots without changing default',()=>{
 const original=runtimeSelection('learn-llm-workspace:local');assert.deepEqual(original,{selection:'default',image_reference:'learn-llm-workspace:local',expected_image_id:null});
 const selected=runtimeSelection('learn-llm-workspace:local',{runtimeImage:reference,expectedImageId:image}),frozen=freezeRuntime(selected,()=>image);assert.equal(checkRuntimeUnchanged(frozen,()=>image).identity_check,'before-and-after-snapshots');assert.throws(()=>freezeRuntime(selected,()=> 'sha256:'+'b'.repeat(64)));assert.throws(()=>checkRuntimeUnchanged(frozen,()=> 'sha256:'+'c'.repeat(64)));assert.throws(()=>freezeRuntime(selected,()=>null));
});
test('cache optional runtime flags stay paired and closed for every existing mode',()=>{
 const vectors=[['build-tools'],['self-test','--step','s','--target','t'],['publish','--step','s','--target','t','--input','/input'],['verify','--step','s','--target','t','--input','/input'],['replay','--step','s','--target','t','--receipt','/receipt']];
 for(const [mode,...args] of vectors){const base=[mode,'--run-id',runId,...args];assert.equal(parseCacheArguments(base).mode,mode);assert.equal(parseCacheArguments([...base,'--runtime-image',reference,'--expected-image-id',image])['runtime-image'],reference);}
 for(const extra of [['--runtime-image',reference],['--expected-image-id',image],['--runtime-image',reference,'--expected-image-id','bad'],['--runtime-image','','--expected-image-id',image],['--runtime-image=--option','--expected-image-id',image],['--runtime-image',reference,'--runtime-image',reference,'--expected-image-id',image],['--run-id',runId],['--ignored','x'],['positional']])assert.throws(()=>parseCacheArguments(['build-tools','--run-id',runId,...extra]));
});
function cacheFixture({drift=false,missing=false}={}){
 const root=mkdtempSync(join(tmpdir(),'cache-runtime-caller-')),bin=join(root,'bin'),run=join(root,'.build/runs',runId),trace=join(root,'trace.jsonl');mkdirSync(bin);mkdirSync(run,{recursive:true,mode:0o700});
 for(const [path,value] of [['Cargo.toml','stub'],['Cargo.lock','stub'],['rust/stub.txt','stub'],['configs/functional-artifact-cache-targets.json',JSON.stringify({schema_version:2,runtime_tag:'learn-llm-workspace:local',targets:{}})]]){const target=join(root,path);mkdirSync(join(target,'..'),{recursive:true});writeFileSync(target,value);}
 writeFileSync(join(bin,'docker'),`#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path'),args=process.argv.slice(2),trace=process.env.DOCKER_TRACE;fs.appendFileSync(trace,JSON.stringify(args)+'\\n');
if(args[0]==='image'){if(process.env.STUB_MISSING==='1')process.exit(1);const count=fs.readFileSync(trace,'utf8').trim().split('\\n').map(JSON.parse).filter(a=>a[0]==='image').length;process.stdout.write('sha256:'+(process.env.STUB_DRIFT==='1'&&count>1?'c':'a').repeat(64)+'\\n');}
else if(args[0]==='run'){if(args.at(-1).includes('rustc --version'))process.stdout.write('rustc 1.93.1 (stub)\\nv22.12.0\\n');else{const mount=args.find(a=>a.startsWith('type=bind,source=')&&a.endsWith('target=/cache')),source=mount.split(',')[1].slice('source='.length);fs.mkdirSync(path.join(source,'registry'));}}else process.exit(3);
`,{mode:0o755});
 mkdirSync(join(root,'scripts'));writeFileSync(join(root,'scripts/run-functional-rust-overlay.sh'),`#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path'),args=process.argv.slice(2),run=path.join(process.cwd(),'.build/runs',args[0]);fs.appendFileSync(process.env.DOCKER_TRACE,JSON.stringify(['overlay',...args])+'\\n');fs.mkdirSync(path.join(run,'rust-target/debug'),{recursive:true});fs.writeFileSync(path.join(run,'rust-target/debug/functional-artifact-cache'),'stub binary');
`,{mode:0o755});
 return {root,run,trace,env:{...process.env,PATH:bin+':'+process.env.PATH,DOCKER_TRACE:trace,STUB_DRIFT:drift?'1':'0',STUB_MISSING:missing?'1':'0'}};
}
function invokeCache(fixture,flags=[]){return spawnSync(process.execPath,[fileURLToPath(new URL('../lib/run-functional-artifact-cache.mjs',import.meta.url)),'build-tools','--run-id',runId,...flags],{cwd:fixture.root,env:fixture.env,encoding:'utf8'});}
test('actual cache caller preserves default or explicit selector and every ordinary container uses frozen offline ID',()=>{
 for(const explicit of [false,true]){const fixture=cacheFixture(),result=invokeCache(fixture,explicit?['--runtime-image',reference,'--expected-image-id',image]:[]);assert.equal(result.status,0,result.stderr);const calls=readFileSync(fixture.trace,'utf8').trim().split('\n').map(JSON.parse),inspects=calls.filter(args=>args[0]==='image'),runs=calls.filter(args=>args[0]==='run');assert.equal(inspects.length,2);assert.ok(inspects.every(args=>args.at(-1)===(explicit?reference:'learn-llm-workspace:local')));assert.equal(runs.length,2);for(const args of runs){assert.equal(args[args.indexOf('--network')+1],'none');assert.ok(args.includes(image));}const overlay=calls.find(args=>args[0]==='overlay');assert.equal(overlay[3],image);const receipt=JSON.parse(readFileSync(join(fixture.run,'tool-build-receipt-v2-1.json')));assert.equal(receipt.image_id,image);assert.equal(receipt.runtime_identity.post_operation_image_id,image);assert.equal(receipt.runtime_identity.selection,explicit?'explicit':'default');}
});
test('actual cache caller refuses missing or mismatched runtime before any container, seed or compilation',()=>{
 for(const missing of [false,true]){const fixture=cacheFixture({missing}),result=invokeCache(fixture,['--runtime-image',reference,'--expected-image-id','sha256:'+'f'.repeat(64)]);assert.equal(result.status,2);const calls=readFileSync(fixture.trace,'utf8').trim().split('\n').map(JSON.parse);assert.equal(calls.length,1);assert.equal(calls[0][0],'image');assert.deepEqual(readdirSync(fixture.run),[]);}
});
test('actual cache caller refuses persistent post-compilation tag drift without an accepted tool receipt',()=>{
 const fixture=cacheFixture({drift:true}),result=invokeCache(fixture,['--runtime-image',reference,'--expected-image-id',image]);assert.equal(result.status,2);assert.ok(existsSync(join(fixture.run,'rust-target/debug/functional-artifact-cache')));assert.equal(existsSync(join(fixture.run,'tool-build-receipt-v2-1.json')),false);
});
test('actual generated-cache dispatch uses its complete sibling module, not an incomplete staged module',()=>{
 const fixture=cacheFixture(),staged=join(fixture.run,'publish/scripts/lib');mkdirSync(staged,{recursive:true});writeFileSync(join(staged,'run-functional-corpus-filtering.mjs'),"throw Error('INCOMPLETE_STAGE_SELECTED');\n");
 const result=spawnSync(process.execPath,[fileURLToPath(new URL('../lib/run-functional-artifact-cache.mjs',import.meta.url)),'publish-generated','--run-id',runId,'--step','execute-functional-corpus-filtering','--target','corpus-filtering-v1'],{cwd:fixture.root,env:fixture.env,encoding:'utf8'});
 assert.equal(result.status,2);assert.match(result.stderr,/Functional corpus filtering refused/);assert.doesNotMatch(result.stderr,/INCOMPLETE_STAGE_SELECTED|ERR_MODULE_NOT_FOUND/);assert.equal(existsSync(fixture.trace),false);
 const source=readFileSync(new URL('../lib/run-functional-artifact-cache.mjs',import.meta.url),'utf8');assert.ok(source.includes("['--max-old-space-size=128',fileURLToPath(new URL('./run-functional-corpus-filtering.mjs',import.meta.url))"));
});
