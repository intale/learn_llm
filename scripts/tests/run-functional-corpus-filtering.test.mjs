import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,symlinkSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {createHash} from 'node:crypto';
import {parseFilterArguments,fileBytes,remainingMilliseconds,ownedContainerName,controllerMemoryObservation,selectedContinuation,validateProduced,containerArguments,cleanupOwnedContainer,runOwnedContainer} from '../lib/run-functional-corpus-filtering.mjs';

const runId='20261007T000000Z-filter-fixture-01',image='sha256:'+'a'.repeat(64),digest='b'.repeat(64),sourceSha='c'.repeat(64),binarySha='d'.repeat(64);
const base=['run','--run-id',runId,'--step','execute-functional-corpus-filtering','--target','execute-functional-corpus-filtering-v1'];
test('closed selectors reject acquisition, ambiguous runtime flags, duplicates and arbitrary input',()=>{
 assert.equal(parseFilterArguments(base).mode,'run');
 assert.equal(parseFilterArguments(['publish-generated',...base.slice(1,-1),'corpus-filtering-v1']).mode,'publish-generated');
 for(const extra of [['--input','/candidate'],['--url','https://example.invalid'],['--runtime-image','local'],['--step','execute-functional-corpus-filtering'],['positional']])assert.throws(()=>parseFilterArguments([...base,...extra]));
 assert.throws(()=>parseFilterArguments(['download',...base.slice(1)]));
 assert.throws(()=>parseFilterArguments(['publish-generated',...base.slice(1)]));
 assert.equal(parseFilterArguments([...base,'--runtime-image','local','--expected-image-id',image])['expected-image-id'],image);
});
function record(){const spec={input_artifact_id:digest,input_receipt_sha256:'e'.repeat(64),resources:{metadata_bytes_exclusive:104857600,generated_payload_bytes_max:4750000000}};
 const p={schema_version:1,kind:'verified-filter-output-v1',evidence_kind:'production-source-policy',input_artifact_id:digest,input_receipt_sha256:spec.input_receipt_sha256,phase_spec_sha256:'f'.repeat(64),producer_source_sha256:sourceSha,producer_binary_sha256:binarySha,filter_policy_sha256:'1'.repeat(64),records:6,retained:2,rejected:3,manual_review:1,metadata_bytes:2000,payload_bytes:4000,manifest:{schema_version:2,dataset_scope:{selected_source:digest},producer:{script_sha256:sourceSha,config_sha256:'1'.repeat(64)},payload:['attribution','findings','license','receipt','retained'].map(id=>({id})),sources:[{content_id:'retained'},{content_id:'retained'}]}};
 return {p,context:{spec,specSha:p.phase_spec_sha256,sourceSha,binarySha}};
}
test('source and binary bindings, complete counts and strict metadata caps remain independent',()=>{
 const {p,context}=record();assert.equal(validateProduced(p,context),p);assert.notEqual(sourceSha,binarySha);
 for(const mutate of [p=>p.manifest.producer.script_sha256=binarySha,p=>p.producer_binary_sha256=sourceSha,p=>p.records++,p=>p.metadata_bytes=104857600,p=>p.evidence_kind='synthetic-offline-fixture',p=>p.manifest.sources[1].content_id='raw',p=>p.retained=Number.MAX_SAFE_INTEGER+1]){const changed=structuredClone(p);mutate(changed);assert.throws(()=>validateProduced(changed,context));}
});
test('whole-phase time does not reset at publication or replay and cannot round up beyond budget',()=>{
 const start=1000;assert.equal(remainingMilliseconds(start,7200,2000),7199000);
 assert.equal(remainingMilliseconds(start,7200,7200999),1);
 assert.throws(()=>remainingMilliseconds(start,7200,7201000));assert.throws(()=>remainingMilliseconds(start,7201,2000));
});
test('actual production name builder lowers UTC T/Z while retaining the original run label',()=>{
 const realRun='20261007T071334Z-execute-functional-corpus-filtering-02',name=ownedContainerName(realRun,1);
 assert.equal(name,'course-filter-20261007t071334z-execute-functional-corpus-filtering-02-1');
 const argv=containerArguments({name,cidfile:'/evidence/container.cid',runId:realRun,imageId:image,binary:'/bin/filter',evidence:'/evidence',mounts:[],memoryBytes:8321499136,remainingMs:2000});
 assert.equal(argv[argv.indexOf('--name')+1],name);assert.ok(argv.includes(`learn-llm.run-id=${realRun}`));
 assert.throws(()=>ownedContainerName(realRun,0));assert.throws(()=>ownedContainerName('invalid',1));
});
test('current-exec VmHWM converts Linux kB as KiB and never substitutes inherited getrusage',()=>{
 const observed=controllerMemoryObservation('Name:\tnode\nVmHWM:\t   44832 kB\nVmRSS:\t   44832 kB\n',{maxRSS:2339752});
 assert.equal(observed.vm_hwm_bytes,44832*1024);assert.equal(observed.getrusage_maxrss_kib,2339752);assert.equal(observed.scope,'current-controller-exec');
 for(const text of ['VmRSS: 1 kB\n','VmHWM: 1 MB\nVmRSS: 1 kB\n','VmHWM: 1 kB\nVmHWM: 2 kB\nVmRSS: 1 kB\n','VmHWM: 9007199254740991 kB\nVmRSS: 1 kB\n'])assert.throws(()=>controllerMemoryObservation(text));
});
test('actual controller observation is saved before its reservation is enforced',()=>{
 const source=readFileSync(new URL('../lib/run-functional-corpus-filtering.mjs',import.meta.url),'utf8');
 assert.ok(source.indexOf("save(join(evidence,'resource-observation.json')")<source.indexOf('if(controllerPeak>controllerReserve'));
 assert.ok(source.includes("if(continuation&&opts.mode==='run')fail()"));
});
function continuationFixture({tamper=false}={}){
 const root=mkdtempSync(join(tmpdir(),'filter-continuation-')),originId='20261007T071334Z-execute-functional-corpus-filtering-02',origin=join(root,'.build/runs',originId),run=join(root,'.build/runs','20261007T073020Z-execute-functional-corpus-filtering-03'),phase=join(origin,'filter-execution'),evidence=join(phase,'call-1'),output=join(phase,'output');
 for(const p of [run,evidence,output,join(origin,'filter-controls')])mkdirSync(p,{recursive:true,mode:0o700});
 const {p,context}=record();context.spec.resources.host_bytes_max=8589934592;context.spec.resources.wall_seconds_max=7200;context.spec.output_layout={manifest_path:'descriptor.json'};
 const sha=b=>createHash('sha256').update(b).digest('hex'),write=(path,value)=>{const b=Buffer.from(typeof value==='string'?value:JSON.stringify(value)+'\n');writeFileSync(path,b,{mode:0o600});return sha(b);};
 const c={schema_version:1,kind:'completed-generator-continuation-v1',origin_run_id:originId,
 original_phase_start_sha256:write(join(origin,'filter-controls/phase-start.json'),{started_ms:1000,wall_seconds_max:7200}),producer_result_sha256:write(join(evidence,'stdout.json'),p),
 invocation_sha256:write(join(evidence,'invocation.json'),{request:{operation:'generate'},argv:['run','--network','none','--memory','8321499136',image]}),completion_sha256:write(join(evidence,'completion.json'),{status:0,signal:null,cancelled:false,container_absent:true}),manifest_sha256:write(join(output,'descriptor.json'),p.manifest),memory_peak_sha256:write(join(evidence,'memory-peak.txt'),'5229404160\n'),cpu_stat_sha256:write(join(evidence,'cpu-stat.txt'),'usage_usec 77557357\n')};
 write(join(run,'filter-continuation.json'),c);if(tamper)write(join(evidence,'completion.json'),{status:2});
 return {root,run,output,spec:context.spec,frozen:{phase_spec_sha256:p.phase_spec_sha256,producer_source_sha256:sourceSha,producer_binary_sha256:binarySha,runtime_image_id:image}};
}
test('continuation binds actual successful generator, reuses read-only bytes and preserves clock/unknown old host peak',()=>{
 const f=continuationFixture(),result=selectedContinuation(f.root,f.run,f.spec,f.frozen);assert.equal(result.output,f.output);assert.equal(result.start.started_ms,1000);assert.equal(result.generation.original_controller_peak_bytes,null);assert.equal(result.generation.observed_workload_cgroup_memory_peak_bytes,5229404160);
 assert.equal(existsSync(join(f.run,'filter-execution/output')),false);
 const changed=continuationFixture({tamper:true});assert.throws(()=>selectedContinuation(changed.root,changed.run,changed.spec,changed.frozen));
});
test('workload plan owns one offline bounded container and explicit read-only source mounts',()=>{
 const mounts=[{source:'/raw',target:'/artifacts/input',readOnly:true},{source:'/source.rs',target:'/producer/source.rs',readOnly:true},{source:'/output',target:'/output',readOnly:false}];
 const argv=containerArguments({name:'course-filter-fixture-1',cidfile:'/evidence/container.cid',runId,imageId:image,binary:'/bin/filter',evidence:'/evidence',mounts,memoryBytes:8321499136,remainingMs:1250});
 assert.equal(argv[argv.indexOf('--network')+1],'none');assert.equal(argv[argv.indexOf('--memory')+1],'8321499136');assert.equal(argv[argv.indexOf('--memory-swap')+1],'8321499136');
 assert.ok(argv.includes('type=bind,source=/raw,target=/artifacts/input,readonly'));assert.ok(argv.includes('type=bind,source=/source.rs,target=/producer/source.rs,readonly'));assert.ok(argv.includes('type=bind,source=/output,target=/output'));
 assert.ok(argv.at(-1).includes('timeout --signal=TERM --kill-after=5s 1s /tool'));assert.ok(argv.at(-1).includes('/sys/fs/cgroup/memory.peak'));
 assert.throws(()=>containerArguments({name:'unowned',imageId:image,memoryBytes:1,remainingMs:2000}));
});
function ownershipFixture({wrongLabel=false,daemonFailure=false}={}){
 const evidence=mkdtempSync(join(tmpdir(),'filter-control-')),cidfile=join(evidence,'container.cid'),cid='2'.repeat(64),name='course-filter-fixture-1';writeFileSync(cidfile,cid,{mode:0o600});
 let present=true;const calls=[];const execute=(cmd,args)=>{calls.push([cmd,...args]);if(daemonFailure)return {status:1,stderr:'Cannot connect to Docker daemon'};
  if(args[0]==='rm'){present=false;return {status:0,stdout:cid};}return present?{status:0,stdout:JSON.stringify({'learn-llm.run-id':wrongLabel?'another-run':runId})}:{status:1,stderr:`Error: No such object: ${cid}`};};
 return {evidence,cidfile,cid,name,runId,execute,calls,present:()=>present};
}
test('cleanup kills only the exact owned ID and proves absence, never a similarly named container',()=>{
 const f=ownershipFixture();assert.equal(cleanupOwnedContainer(f,{execute:f.execute}).container_absent,true);assert.equal(f.present(),false);
 assert.deepEqual(f.calls.filter(c=>c[1]==='rm'),[['docker','rm','--force',f.cid]]);assert.ok(f.calls.every(c=>!c.includes('prune')));
});
test('wrong label and unavailable daemon refuse cleanup rather than claiming absence',()=>{
 for(const opts of [{wrongLabel:true},{daemonFailure:true}]){const f=ownershipFixture(opts);assert.throws(()=>cleanupOwnedContainer(f,{execute:f.execute}));assert.equal(f.present(),true);assert.equal(f.calls.some(c=>c[1]==='rm'),false);}
});
function fakeLaunch(f,{hang=false,signal=false}={}){
 const launch=()=>{const child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{queueMicrotask(()=>child.emit('close',null,'SIGTERM'));return true;};
  child.stdin.on('finish',()=>{if(signal)setTimeout(()=>process.emit('SIGTERM'),5);if(!hang&&!signal)queueMicrotask(()=>{writeFileSync(join(f.evidence,'memory-peak.txt'),'1234\n',{mode:0o600});child.stdout.write('{"ok":true}\n');child.emit('close',0,null);});});return child;};return launch;
}
test('timeout and cancellation stop the owned writer, retain exact evidence and never return success',async()=>{
 for(const signal of [false,true]){const f=ownershipFixture();await assert.rejects(runOwnedContainer({...f,argv:['run'],request:{operation:'generate'},remainingMs:signal?1000:15,memoryBytes:10000},{launch:fakeLaunch(f,{hang:true,signal}),execute:f.execute}));
  assert.equal(f.present(),false);assert.equal(JSON.parse(readFileSync(join(f.evidence,'completion.json'))).cancelled,true);assert.ok(existsSync(join(f.evidence,'stdout.json')));assert.ok(f.calls.some(c=>c[1]==='rm'&&c.at(-1)===f.cid));}
});
test('successful container evidence preserves raw output, observed peak and confirmed cleanup',async()=>{
 const f=ownershipFixture(),result=await runOwnedContainer({...f,argv:['run'],request:{operation:'verify'},remainingMs:1000,memoryBytes:10000},{launch:fakeLaunch(f),execute:f.execute});
 assert.deepEqual(result.output,{ok:true});assert.equal(result.peak,1234);assert.equal(result.stdout.toString(),'{"ok":true}\n');assert.equal(f.present(),false);
});
test('disk accounting counts all coexisting files exactly and rejects symlink escapes',()=>{
 const path=mkdtempSync(join(tmpdir(),'filter-disk-'));mkdirSync(join(path,'nested'));writeFileSync(join(path,'a'),'abc');writeFileSync(join(path,'nested/b'),'12345');assert.equal(fileBytes(path),8);symlinkSync('/etc/passwd',join(path,'escape'));assert.throws(()=>fileBytes(path));
});
test('generated registration is exact and ordinary raw cache boundaries remain intact',()=>{
 const config=JSON.parse(readFileSync(new URL('../../configs/functional-artifact-cache-targets.json',import.meta.url)));
 assert.deepEqual(config.targets['corpus-filtering-v1'].modes,['publish-generated']);assert.equal(config.targets['execute-functional-corpus-filtering-v1'].validator,'rust-filter-generated-v1');assert.deepEqual(config.targets['acquire-functional-tinystories-raw-pair-v2'].modes,['publish','verify','replay']);
});
