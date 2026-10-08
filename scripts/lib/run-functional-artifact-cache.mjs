// Closed host orchestration. Rust owns content validation and publication.
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync,cpSync,readdirSync,chmodSync,symlinkSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {ownedPath,bridgeRequest,selectedPolicy,runtimeMountPlan,runtimeSelection,freezeRuntime,checkRuntimeUnchanged} from './functional-artifact-cache-boundary.mjs';
import {createCacheFixture} from '../tests/fixtures/artifact-cache-fixture.mjs';
const SHA=/^[0-9a-f]{64}$/;
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=()=>{throw Error('artifact cache boundary refused');};
const parse=p=>JSON.parse(readFileSync(p,'utf8'));
const save=(p,v)=>writeFileSync(p,JSON.stringify(v)+'\n',{flag:'wx',mode:0o600});
export function input(root,run,path){const staged=join(run,'publish',path);return existsSync(staged)?staged:join(root,path);}
export function sourceHash(root,run){
 const files=new Map();const visit=(base,path)=>{for(const f of readdirSync(join(base,path),{withFileTypes:true})){const p=join(path,f.name);if(f.isSymbolicLink())fail();if(f.isDirectory())visit(base,p);else if(f.isFile())files.set(p,sha(readFileSync(join(base,p))));else fail();}};
 for(const p of ['Cargo.toml','Cargo.lock'])files.set(p,sha(readFileSync(input(root,run,p))));
 visit(root,'rust');visit(root,'configs');for(const p of ['rust','configs'])if(existsSync(join(run,'publish',p)))visit(join(run,'publish'),p);
 const deletions=join(run,'deleted-files.json');if(existsSync(deletions))for(const p of parse(deletions).paths)files.delete(p);
 return sha(JSON.stringify([...files].sort(([a],[b])=>Buffer.compare(Buffer.from(a),Buffer.from(b)))));
}
export function validateRuntimeBinding(receipt,image){if(receipt?.image_id!==image||receipt.network!=='none'||receipt.cargo_locked!==true)fail();return true;}
export function imageId(reference){const inspect=spawnSync('docker',['image','inspect','--format','{{.Id}}',reference],{encoding:'utf8',maxBuffer:65536});const id=inspect.stdout?.trim();if(inspect.status!==0||!/^sha256:[0-9a-f]{64}$/.test(id))fail();return id;}
export function image(config,opts){
 if(config.runtime_tag!=='learn-llm-workspace:local')fail();const runtime=freezeRuntime(runtimeSelection(config.runtime_tag,{runtimeImage:opts['runtime-image'],expectedImageId:opts['expected-image-id']}),imageId),id=runtime.image_id;
 const check=spawnSync('docker',['run','--rm','--pull=never','--network','none','--read-only','--entrypoint','sh',id,'-c','rustc --version; node --version'],{encoding:'utf8',maxBuffer:65536});if(check.status!==0||!check.stdout.startsWith('rustc 1.93.1 ')||!check.stdout.trim().endsWith('v22.12.0'))fail();return runtime;
}
export function parseCacheArguments(args){
 const [mode,...rest]=args,p={mode};if(mode==='--help'){if(args.length!==1)fail();return p;}
 const {values,tokens}=parseArgs({args:rest,options:Object.fromEntries(['run-id','step','target','input','receipt','runtime-image','expected-image-id'].map(name=>[name,{type:'string'}])),strict:true,allowPositionals:false,tokens:true});
 if(new Set(tokens.map(token=>token.name)).size!==tokens.length||Object.values(values).some(value=>!value))fail();Object.assign(p,values);
 const selection=runtimeSelection('learn-llm-workspace:local',{runtimeImage:p['runtime-image'],expectedImageId:p['expected-image-id']});
 if(!/^[0-9]{8}T[0-9]{6}Z-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p['run-id']??''))fail();
 const keys=mode==='build-tools'?['mode','run-id']:['self-test','publish-generated'].includes(mode)?['mode','run-id','step','target']:['publish','verify'].includes(mode)?['mode','run-id','step','target','input']:mode==='replay'?['mode','run-id','step','target','receipt']:[];
 if(selection.selection==='explicit')keys.push('runtime-image','expected-image-id');
 if(Object.keys(p).sort().join()!==keys.sort().join())fail();return p;
}
export function buildTools(root,run,id,{runtime}={}){
 if(!existsSync(join(run,'publish')))mkdirSync(join(run,'publish'),{mode:0o700});
 if(!existsSync(join(run,'cargo-cache'))){
  const cache=join(run,'cargo-cache');mkdirSync(cache,{mode:0o700});
  const seed=spawnSync('docker',['run','--rm','--pull=never','--network','none','--read-only','--mount',`type=bind,source=${cache},target=/cache`,'--entrypoint','sh',id,'-c','set -eu; cp -a /root/.cargo/registry /cache/; chown -R 1000:1000 /cache'],{encoding:'utf8',maxBuffer:65536});if(seed.error||seed.status!==0)fail();
 }
 if(!existsSync(join(run,'validation')))mkdirSync(join(run,'validation'),{mode:0o700});
 const attempt=readdirSync(join(run,'validation')).filter(name=>/^cache-tools-v2-[0-9]+$/.test(name)).length+1;
 const args=[run.split('/').at(-1),`cache-tools-v2-${attempt}`,id,'--','cargo','build','--locked','--offline','-p','functional-artifact-cache','--bin','functional-artifact-cache'];
 const overlay=input(root,run,'scripts/run-functional-rust-overlay.sh');
 const result=spawnSync('bash',[overlay,...args],{encoding:'utf8',maxBuffer:2097152});if(result.error||result.status!==0)fail();
 const profile='debug',binary=join(run,`rust-target/${profile}/functional-artifact-cache`);
 const runtimeIdentity=runtime?checkRuntimeUnchanged(runtime,imageId):null;
 const receipt={schema_version:2,image_id:id,source_tree_sha256:sourceHash(root,run),binary:{path:`tool-binary-v2-${attempt}`,sha256:sha(readFileSync(binary))},cargo_profile:profile,build_argv:args,network:'none',cargo_locked:true,...(runtimeIdentity?{runtime_identity:runtimeIdentity}:{})};copyFileSync(binary,join(run,receipt.binary.path));
 save(join(run,`tool-build-receipt-v2-${attempt}.json`),receipt);return receipt;
}
export function tool(root,run,id){const names=readdirSync(run).filter(name=>/^tool-build-receipt-v2-[0-9]+\.json$/.test(name)).sort((a,b)=>Number(a.match(/([0-9]+)\.json$/)[1])-Number(b.match(/([0-9]+)\.json$/)[1]));if(!names.length)fail();const receipt=parse(join(run,names.at(-1)));validateRuntimeBinding(receipt,id);if(receipt.schema_version!==2||receipt.source_tree_sha256!==sourceHash(root,run)||!/^tool-binary-v2-[0-9]+$/.test(receipt.binary.path))fail();const binary=ownedPath(join(run,receipt.binary.path),{root:run,directory:false});if(sha(readFileSync(binary))!==receipt.binary.sha256)fail();return {receipt,binary,receiptPath:join(run,names.at(-1))};}
function bridge(root,run,id,request,mounts,policyPath,layoutPath,{expectSuccess=true}={}){
 const {receipt,binary}=tool(root,run,id),argv=['run','--rm','-i','--pull=never','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--user','1000:1000','--memory','256m'];
 for(const mount of [{source:binary,target:'/tool',readOnly:true},{source:policyPath,target:'/policy/content-policy.json',readOnly:true},{source:layoutPath,target:'/layout/storage-layout.json',readOnly:true},...mounts]){if(mount.source.includes(',')||mount.target.includes(','))fail();argv.push('--mount',`type=bind,source=${mount.source},target=${mount.target}${mount.readOnly?',readonly':''}`);}
 const result=spawnSync('docker',[...argv,'--entrypoint','/tool',id],{input:JSON.stringify(request)+'\n',encoding:'utf8',maxBuffer:2097152});if(result.error||result.signal||(expectSuccess&&result.status!==0))fail();let output;try{output=JSON.parse(result.stdout);}catch{fail();}return {status:result.status,output,argv,tool_binary_sha256:receipt.binary.sha256};
}
export function metadata(root,config){const inventory=parse(join(root,config.metadata_inventory));if(inventory.step_id!=='capture-functional-tinystories-source-metadata')fail();for(const f of inventory.files){const b=readFileSync(join(root,f.path));if(b.length!==f.bytes||sha(b)!==f.sha256)fail();}}
function selfTest(root,run,config,opts,id,runtime){
 const attempt=readdirSync(run).filter(name=>/^cache-self-test-v2-[0-9]+$/.test(name)).length+1;
 const directory=join(run,`cache-self-test-v2-${attempt}`);if(existsSync(directory))fail();mkdirSync(directory,{mode:0o700});
 const policyPath=input(root,run,config.fixture_policy_config),layoutPath=input(root,run,config.fixture_layout),layout=parse(layoutPath),source=join(directory,'source');mkdirSync(source,{mode:0o700});createCacheFixture(source,{policyPath,layoutPath});
 const cache=resolve(root,config.cache_parent);mkdirSync(cache,{recursive:true,mode:0o700});ownedPath(cache,{root:resolve(root,'.build/artifact-cache/functional-v2')});
 const policyKind='synthetic-offline-fixture';const call=(mode,path,extra=[])=>bridge(root,run,id,bridgeRequest(mode,{policyKind}),[{source:path,target:'/input',readOnly:true},...extra],policyPath,layoutPath);
 const verify=call('verify',source),publication=call('publish',source,[{source:cache,target:'/cache',readOnly:false}]),digest=publication.output.artifact_id;if(!SHA.test(digest))fail();
 const entry=join(cache,layout.cache.entry_prefix+digest);ownedPath(entry,{root:cache});const replay=bridge(root,run,id,bridgeRequest('replay',{policyKind,digest}),[{source:entry,target:'/entry',readOnly:true}],policyPath,layoutPath);if(JSON.stringify(verify.output)!==JSON.stringify(replay.output))fail();
 const write=spawnSync('docker',['run','--rm','--pull=never','--network','none','--read-only','--user','1000:1000','--mount',`type=bind,source=${entry},target=/entry,readonly`,'--entrypoint','node',id,'-e',`try{require('node:fs').writeFileSync(${JSON.stringify('/entry/'+layout.files.payload_paths.train)},'changed');process.exit(3);}catch(e){process.stdout.write(e.code);process.exit(e.code==='EROFS'?0:2);}`],{encoding:'utf8',maxBuffer:65536});if(write.status!==0||write.stdout!=='EROFS')fail();
 const generated=join(directory,'generated');cpSync(source,generated,{recursive:true});const producer={schema_version:2,kind:'synthetic-generated-fixture',producer_run:run.split('/').at(-1),source_manifest_sha256:sha(readFileSync(join(source,layout.files.manifest_path))),generated_manifest_sha256:sha(readFileSync(join(generated,layout.files.manifest_path))),operation:'exact-fixture-copy-no-course-transform',network:'none'};save(join(directory,'producer-receipt.json'),producer);if(call('publish',generated,[{source:cache,target:'/cache',readOnly:false}]).output.artifact_id!==digest)fail();
 const corrupt=join(directory,'corrupt');cpSync(source,corrupt,{recursive:true});writeFileSync(join(corrupt,layout.files.payload_paths.train),'abd');const refused=bridge(root,run,id,bridgeRequest('publish',{policyKind}),[{source:corrupt,target:'/input',readOnly:true},{source:cache,target:'/cache',readOnly:false}],policyPath,layoutPath,{expectSuccess:false});if(refused.status===0||refused.output.error!=='Hash')fail();
 const escaped=join(directory,'escaped');symlinkSync(source,escaped);let rejected=false;try{ownedPath(escaped,{root:directory});}catch{rejected=true;}if(!rejected)fail();chmodSync(generated,0o777);rejected=false;try{ownedPath(generated,{root:directory});}catch{rejected=true;}finally{chmodSync(generated,0o700);}if(!rejected)fail();rejected=false;try{ownedPath(source,{root:directory,uid:99999});}catch{rejected=true;}if(!rejected)fail();
 const runtimeIdentity=checkRuntimeUnchanged(runtime,imageId);
 const receipt={schema_version:2,step_id:opts.step,target_id:opts.target,evidence_kind:policyKind,image_id:id,runtime_identity:runtimeIdentity,tool_build_receipt_sha256:sha(readFileSync(tool(root,run,id).receiptPath)),artifact_id:digest,verified_bundle:replay.output,producer_receipt_sha256:sha(readFileSync(join(directory,'producer-receipt.json'))),checks:{actual_publication:true,actual_readonly_replay:true,consumer_write_refused:true,generated_fixture_handoff:true,corrupt_payload_refused:true,symlink_refused:true,wrong_mode_refused:true,wrong_uid_refused:true},network:'none'};save(join(run,`artifact-cache-receipt-v2-${attempt}.json`),receipt);return receipt;
}
export function runCacheCommand(args,{root=process.cwd()}={}){
 const opts=parseCacheArguments(args);if(opts.mode==='--help'){console.log('Offline v2 cache: build-tools --run-id RUN; self-test --run-id RUN --step STEP --target TARGET; publish/verify add --input; replay adds --receipt. Optional paired --runtime-image REF --expected-image-id sha256:ID selects an existing local image; otherwise the public workspace default remains. Independently selected policy and explicit physical layout.');return 0;}
 // No current bulk-preparation executable is frozen yet. Never route the
 // external NeMo job through removed Rust filtering machinery.
 if(opts.mode==='publish-generated')fail();
 const run=resolve(root,'.build/runs',opts['run-id']);ownedPath(run,{root:resolve(root,'.build/runs')});const config=parse(input(root,run,'configs/functional-artifact-cache-targets.json'));if(config.schema_version!==2)fail();const runtime=image(config,opts),id=runtime.image_id;if(opts.mode==='build-tools'){buildTools(root,run,id,{runtime});return 0;}
 const target=config.targets[opts.target];if(!target||target.step_id!==opts.step||!target.modes.includes(opts.mode)||target.validator!=='rust-dataset-v2')fail();metadata(root,config);if(opts.mode==='self-test'){selfTest(root,run,config,opts,id,runtime);return 0;}
 if(target.policy_kind!=='production-source-policy')fail();const envelope=parse(input(root,run,target.asset_config)),asset=envelope.assets?.[target.asset_id];if(envelope.schema_version!==2||envelope.default_asset!==target.asset_id||!asset)fail();
 // Only the closed registry selects an accepted frozen acquisition binding.
 // No caller-supplied binding path or untrusted manifest value is authoritative.
 const accepted=parse(join(root,target.production_binding));if(accepted.schema_version!==2||accepted.step_id!==opts.step||accepted.target_id!==opts.target||accepted.metadata_inventory_sha256!==sha(readFileSync(join(root,config.metadata_inventory)))||accepted.binding?.selected_asset_sha256!==sha(Buffer.from(JSON.stringify(asset)+'\n')))fail();
 if(!Array.isArray(accepted.producer_inputs)||accepted.producer_inputs.length===0)fail();for(const record of accepted.producer_inputs){const b=readFileSync(join(root,record.path));if(b.length!==record.bytes||sha(b)!==record.sha256)fail();}
 const policy=selectedPolicy(asset,accepted.binding);for(const [contentId,path] of Object.entries(asset.metadata_files)){const expected=policy.manifest.payload.find(p=>p.id===contentId),b=readFileSync(join(root,path));if(!expected||b.length!==expected.bytes||sha(b)!==expected.sha256)fail();}
 const policyPath=join(run,'selected-content-policy-v2.json'),layoutPath=join(run,'selected-storage-layout-v2.json');for(const [p,value] of [[policyPath,policy],[layoutPath,asset.storage]]){const b=Buffer.from(JSON.stringify(value)+'\n');if(existsSync(p)){if(!readFileSync(p).equals(b))fail();}else writeFileSync(p,b,{flag:'wx',mode:0o600});}
 const cache=resolve(root,config.cache_parent);mkdirSync(cache,{recursive:true,mode:0o700});ownedPath(cache,{root:resolve(root,'.build/artifact-cache/functional-v2')});let selected,digest;
 if(opts.mode==='replay'){const receipt=parse(ownedPath(resolve(opts.receipt),{root:run,directory:false,privateMode:true}));if(receipt.step_id!==opts.step||receipt.target_id!==opts.target||!SHA.test(receipt.artifact_id))fail();digest=receipt.artifact_id;selected=ownedPath(join(cache,asset.storage.cache.entry_prefix+digest),{root:cache});}else selected=ownedPath(resolve(opts.input),{root:run,privateMode:true});
 const plan=runtimeMountPlan(opts.mode,{runRoot:run,inputRoot:selected,cacheRoot:cache,digest,policyKind:target.policy_kind,targetKind:'raw-pair'});if(opts.mode==='replay')plan.mounts[0].source=selected;
 const result=bridge(root,run,id,bridgeRequest(opts.mode,{digest,policyKind:target.policy_kind}),plan.mounts,policyPath,layoutPath),runtimeIdentity=checkRuntimeUnchanged(runtime,imageId);save(join(run,`artifact-cache-${opts.mode}-receipt-v2.json`),{schema_version:2,step_id:opts.step,target_id:opts.target,evidence_kind:target.policy_kind,image_id:id,runtime_identity:runtimeIdentity,operation:opts.mode,artifact_id:result.output.artifact_id,verified_bundle:result.output,binding:accepted.binding,network:'none'});return 0;
}
if(import.meta.url===pathToFileURL(resolve(process.argv[1]??'')).href){try{process.exitCode=runCacheCommand(process.argv.slice(2));}catch{console.error('Artifact cache boundary refused; private evidence retained.');process.exitCode=2;}}
