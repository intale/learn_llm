import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,readdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseSourceBuildArguments} from '../build-functional-tinystories-image.mjs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('default corpus enabled and cloud explicitly disabled',()=>{assert.ok(read('Dockerfile').startsWith('ARG COURSE_CORPUS=true\n'));assert.ok(read('.github/workflows/deploy-pages.yml').includes('--build-arg COURSE_CORPUS=false'));});
test('mature client executable replaces custom response downloader',()=>{const docker=read('Dockerfile');assert.ok(docker.includes('cargo build --locked --release -p course-asset-fetch'));assert.ok(docker.includes('RUN /source-build/course-asset-fetch'));assert.ok(!docker.includes('download-fixed-tinystories-image.mjs'));assert.ok(docker.indexOf('RUN /source-build/course-asset-fetch')<docker.indexOf('COPY . .'));});
test('download cache stage copies only built executable and selected assets before provenance',()=>{const docker=read('Dockerfile'),stage=docker.slice(docker.indexOf('AS course-corpus'),docker.indexOf('FROM node:22'));assert.ok(stage.includes('COPY --from=corpus-tools'));assert.ok(!stage.includes('COPY rust/ rust/'));assert.ok(stage.indexOf('RUN /source-build/course-asset-fetch')<stage.indexOf('COPY Dockerfile /source-private'));});
test('selected production recipe owns values; shared content and client have no asset literals',()=>{const config=JSON.parse(read('configs/functional-corpus-assets.json')),asset=config.assets[config.default_asset];assert.equal(config.schema_version,2);assert.equal(asset.manifest_recipe.producer,null);assert.equal(asset.transport.expected_payload_ceiling_bytes,2000000000);assert.equal(Object.hasOwn(asset.transport,'body_ceiling'),false);assert.equal(asset.transport.allowed_hosts.length,6);for(const path of ['rust/tools/course-asset-fetch/src/lib.rs','rust/tools/course-asset-fetch/src/main.rs',...['acquisition','canonical_manifest','inventory','lineage'].map(n=>'rust/crates/llm-from-scratch/src/artifact/'+n+'.rs')]){const source=read(path);for(const literal of ['TinyStories','roneneldan','huggingface.co','f54c09fd23315a6f9c86f9dc80f725de7d8f9c64','CDLA-Sharing-1.0'])assert.ok(!source.includes(literal),path+' asset literal');}});

const runId='20261006T000000Z-runtime-builder-01',image='sha256:'+'a'.repeat(64),reference='approved-cache:local';
test('builder runtime flags are paired, closed and duplicate-safe with unchanged defaults',()=>{
 assert.equal(parseSourceBuildArguments(['--run-id',runId]).corpus,'true');
 assert.equal(parseSourceBuildArguments(['--run-id',runId,'--runtime-image',reference,'--expected-image-id',image]).runtimeImage,reference);
 for(const extra of [['--runtime-image',reference],['--expected-image-id',image],['--runtime-image',reference,'--expected-image-id','invalid'],['--runtime-image','','--expected-image-id',image],['--runtime-image=--option','--expected-image-id',image],['--run-id',runId],['--runtime-image',reference,'--runtime-image',reference,'--expected-image-id',image],['--ignored','x'],['positional']])assert.throws(()=>parseSourceBuildArguments(['--run-id',runId,...extra]));
});
function builderFixture({drift=false,missing=false}={}){
 const root=mkdtempSync(join(tmpdir(),'corpus-runtime-builder-')),bin=join(root,'bin'),run=join(root,'.build/runs',runId),trace=join(root,'trace.jsonl');
 mkdirSync(bin);mkdirSync(run,{recursive:true,mode:0o700});
 for(const [path,value] of [['Dockerfile','stub'],['Cargo.toml','stub'],['Cargo.lock','stub'],['configs/functional-corpus-assets.json','{}'],['artifacts/functional-laptop/step-output-inventories/capture-functional-tinystories-source-metadata.json',JSON.stringify({step_id:'capture-functional-tinystories-source-metadata',files:[]})],['rust/stub.txt','stub']]){const destination=join(root,path);mkdirSync(join(destination,'..'),{recursive:true});writeFileSync(destination,value);}
 const script=`#!/usr/bin/env node
const fs=require('node:fs'),args=process.argv.slice(2),trace=process.env.DOCKER_TRACE;fs.appendFileSync(trace,JSON.stringify(args)+'\\n');
if(args[0]==='image'&&args[1]==='inspect'){if(process.env.STUB_MISSING==='1')process.exit(1);const ref=args.at(-1),calls=fs.readFileSync(trace,'utf8').trim().split('\\n').map(JSON.parse),count=calls.filter(a=>a[0]==='image'&&a.at(-1)===ref).length;process.stdout.write('sha256:'+((ref.startsWith('learn-llm-tinystories'))?'b':process.env.STUB_DRIFT==='1'&&count>1?'c':'a').repeat(64)+'\\n');}
else if(args[0]==='build'){process.stdout.write(JSON.stringify({schema_version:2,enabled:false})+'\\n');}else process.exit(3);
`;
 writeFileSync(join(bin,'docker'),script,{mode:0o755});
 return {root,run,trace,env:{...process.env,PATH:bin+':'+process.env.PATH,DOCKER_TRACE:trace,STUB_DRIFT:drift?'1':'0',STUB_MISSING:missing?'1':'0'}};
}
function invokeBuilder(fixture,flags=[]){return spawnSync(process.execPath,[fileURLToPath(new URL('../build-functional-tinystories-image.mjs',import.meta.url)),'--run-id',runId,'--corpus','false',...flags],{cwd:fixture.root,env:fixture.env,encoding:'utf8'});}
test('actual builder caller selects default or explicit cached base and preserves selected-target BUILD networking',()=>{
 for(const explicit of [false,true]){const fixture=builderFixture(),result=invokeBuilder(fixture,explicit?['--runtime-image',reference,'--expected-image-id',image]:[]);assert.equal(result.status,0,result.stderr);const calls=readFileSync(fixture.trace,'utf8').trim().split('\n').map(JSON.parse),build=calls.find(args=>args[0]==='build'),selected=explicit?reference:'learn-llm-workspace:local';assert.ok(build.includes('COURSE_CORPUS_BASE='+selected));assert.equal(build[build.indexOf('--network')+1],'default');assert.equal(build[build.indexOf('--target')+1],'course-corpus');assert.deepEqual(calls.filter(args=>args[0]==='image').map(args=>args.at(-1)),[selected,selected,'learn-llm-tinystories-disabled:local']);const receipt=JSON.parse(readFileSync(join(fixture.run,'source-build-false-1/build-receipt.json')));assert.equal(receipt.base_image_id,image);assert.equal(receipt.runtime_identity.selection,explicit?'explicit':'default');assert.equal(receipt.runtime_identity.post_operation_image_id,image);}
});
test('actual builder refuses missing or mismatched local runtime before a Docker BUILD or private operation',()=>{
 for(const missing of [false,true]){const fixture=builderFixture({missing}),result=invokeBuilder(fixture,['--runtime-image',reference,'--expected-image-id','sha256:'+'f'.repeat(64)]);assert.equal(result.status,2);const calls=readFileSync(fixture.trace,'utf8').trim().split('\n').map(JSON.parse);assert.equal(calls.length,1);assert.equal(calls[0][0],'image');assert.deepEqual(readdirSync(fixture.run),[]);}
});
test('actual builder refuses persistent post-BUILD tag drift and retains failed snapshot evidence',()=>{
 const fixture=builderFixture({drift:true}),result=invokeBuilder(fixture,['--runtime-image',reference,'--expected-image-id',image]);assert.equal(result.status,2);assert.ok(existsSync(join(fixture.run,'source-build-false-1/build-receipt.json')));const receipt=JSON.parse(readFileSync(join(fixture.run,'source-build-false-1/build-receipt.json')));assert.equal(receipt.runtime_identity.identity_check,'post-operation-refused');assert.equal(receipt.base_image_id,image);
});
