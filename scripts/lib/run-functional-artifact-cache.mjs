// Host orchestration only: fixed Docker argv, closed targets, bounded evidence.
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync,cpSync,readdirSync,chmodSync,symlinkSync,statSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {ownedPath,bridgeRequest,bindProductionProvenance,runtimeMountPlan} from './functional-artifact-cache-boundary.mjs';
import {createCacheFixture} from '../tests/fixtures/artifact-cache-fixture.mjs';

const SHA=/^[0-9a-f]{64}$/;
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=()=>{throw new Error('artifact cache boundary refused');};
const parseFile=p=>JSON.parse(readFileSync(p,'utf8'));
const save=(p,value)=>writeFileSync(p,JSON.stringify(value)+'\n',{flag:'wx',mode:0o600});
const TOOL_FILES=['Cargo.toml','Cargo.lock','rust/tools/functional-artifact-cache/Cargo.toml','rust/tools/functional-artifact-cache/src/main.rs'];
function sourceTreeHash(root){
 const paths=['Cargo.toml','Cargo.lock'];
 const visit=directory=>{for(const entry of readdirSync(join(root,directory),{withFileTypes:true})){const path=join(directory,entry.name);if(entry.isSymbolicLink())fail();if(entry.isDirectory())visit(path);else if(entry.isFile())paths.push(path);else fail();}};
 visit('rust');visit('configs');paths.sort();return sha(JSON.stringify(paths.map(path=>({path,sha256:sha(readFileSync(join(root,path)))}))));
}

export function validateRuntimeBinding(receipt,image){
 if(receipt?.image_id!==image||receipt.network!=='none'||receipt.cargo_locked!==true)fail();
 return true;
}
function runtimeImage(config){
 if(config.runtime_tag!=='learn-llm-workspace:local')fail();
 const result=spawnSync('docker',['image','inspect','--format','{{.Id}}',config.runtime_tag],{encoding:'utf8',maxBuffer:65536});
 const image=result.stdout?.trim();if(result.status!==0||!/^sha256:[0-9a-f]{64}$/.test(image))fail();
 // Required versions are tested separately below, without a mutable image alias.
 const check=spawnSync('docker',['run','--rm','--pull=never','--network','none','--read-only','--entrypoint','sh',image,'-c','rustc --version; node --version'],{encoding:'utf8',maxBuffer:65536});
 if(check.status!==0||!check.stdout.startsWith('rustc 1.93.1 ')||!check.stdout.trim().endsWith('v22.12.0'))fail();
 return image;
}

export function parseCacheArguments(args){
 const [mode,...rest]=args,parsed={mode};
 if(mode==='--help'){if(args.length!==1)fail();return parsed;}
 for(let i=0;i<rest.length;i+=2){if(!['--run-id','--step','--target','--input','--receipt'].includes(rest[i])||!rest[i+1]||Object.hasOwn(parsed,rest[i].slice(2)))fail();parsed[rest[i].slice(2)]=rest[i+1];}
 if(!/^[0-9]{8}T[0-9]{6}Z-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parsed['run-id']??''))fail();
 const allowed=mode==='build-tools'?['mode','run-id']:mode==='self-test'?['mode','run-id','step','target']:['publish','verify'].includes(mode)?['mode','run-id','step','target','input']:mode==='replay'?['mode','run-id','step','target','receipt']:[];
 if(Object.keys(parsed).sort().join()!==allowed.sort().join())fail();
 return parsed;
}

function docker(image,mounts,args,{input='',expectSuccess=true,network='none'}={}){
 if(network!=='none')fail();
 const argv=['run','--rm','-i','--pull=never','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--user','1000:1000'];
 for(const mount of mounts){if(mount.source.includes(',')||mount.target.includes(','))fail();argv.push('--mount',`type=bind,source=${mount.source},target=${mount.target}${mount.readOnly?',readonly':''}`);}
 const result=spawnSync('docker',[...argv,...args,image],{input,encoding:'utf8',maxBuffer:2_097_152});
 if(result.error||result.signal||expectSuccess&&result.status!==0)fail();
 return {status:result.status,stdout:result.stdout,stderr:result.stderr,argv};
}

export function buildTools(root,run,image){
 const cache=join(run,'cargo-cache');
 if(!existsSync(cache)){
  mkdirSync(cache,{mode:0o700});
  const seed=spawnSync('docker',['run','--rm','--pull=never','--network','none','--read-only','--mount',`type=bind,source=${cache},target=/cache`,'--entrypoint','sh',image,'-c','set -eu; cp -a /root/.cargo/registry /cache/; chown -R 1000:1000 /cache'],{encoding:'utf8',maxBuffer:65536});
  if(seed.error||seed.status!==0)fail();
 }
 ownedPath(cache,{root:run});mkdirSync(join(run,'tool-target'),{recursive:true,mode:0o700});
 const script=`set -eu; tar -C /repo -cf - Cargo.toml Cargo.lock rust configs | tar -C /work -xf -; cd /work; CARGO_HOME=/cache CARGO_TARGET_DIR=/target cargo build --offline --locked -p functional-artifact-cache -p ch41-governed-corpus-acquisition --bin functional-artifact-cache --bin artifact-policy-worker; chown -R 1000:1000 /target /cache`;
 const result=spawnSync('docker',['run','--rm','--pull=never','--network','none','--tmpfs','/work:rw,nosuid,nodev,size=512m,mode=0755','--mount',`type=bind,source=${root},target=/repo,readonly`,'--mount',`type=bind,source=${cache},target=/cache`,'--mount',`type=bind,source=${join(run,'tool-target')},target=/target`,'--entrypoint','sh',image,'-c',script],{encoding:'utf8',maxBuffer:2_097_152});
 writeFileSync(join(run,'tool-build.stdout.txt'),result.stdout??'',{flag:'wx',mode:0o600});writeFileSync(join(run,'tool-build.stderr.txt'),result.stderr??'',{flag:'wx',mode:0o600});
 if(result.error||result.status!==0)fail();
 const sources=TOOL_FILES.map(path=>({path,sha256:sha(readFileSync(join(root,path)))}));
 const binaries=['functional-artifact-cache','artifact-policy-worker'].map(name=>({name,path:`tool-target/debug/${name}`,sha256:sha(readFileSync(join(run,'tool-target/debug',name)))}));
 const receipt={schema_version:1,image_id:image,sources,source_tree_sha256:sourceTreeHash(root),binaries,network:'none',cargo_locked:true};save(join(run,'tool-build-receipt.json'),receipt);return receipt;
}

function tools(root,run,image){
 const receipt=parseFile(join(run,'tool-build-receipt.json'));
 validateRuntimeBinding(receipt,image);
 if(receipt.schema_version!==1||receipt.sources.length!==TOOL_FILES.length||receipt.source_tree_sha256!==sourceTreeHash(root))fail();
 for(const [i,f] of receipt.sources.entries())if(f.path!==TOOL_FILES[i]||sha(readFileSync(join(root,f.path)))!==f.sha256)fail();
 for(const f of receipt.binaries){if(!['functional-artifact-cache','artifact-policy-worker'].includes(f.name)||f.path!==`tool-target/debug/${f.name}`)fail();const p=ownedPath(join(run,f.path),{root:run,directory:false});if(sha(readFileSync(p))!==f.sha256)fail();}
 return receipt;
}

function bridge(root,run,image,request,mounts,{expectSuccess=true}={}){
 const receipt=tools(root,run,image),tool=join(run,'tool-target/debug/functional-artifact-cache');
 const result=docker(image,[{source:tool,target:'/tool',readOnly:true},...mounts],['--entrypoint','/tool'],{input:JSON.stringify(request)+'\n',expectSuccess});
 if(result.stdout.length>2_097_152)fail();let output;try{output=JSON.parse(result.stdout);}catch{fail();}
 return {...result,output,tool_binary_sha256:receipt.binaries.find(b=>b.name==='functional-artifact-cache').sha256};
}

function verifyMetadata(root,config){
 const inventory=parseFile(join(root,config.metadata_inventory));
 if(inventory.step_id!=='capture-functional-tinystories-source-metadata')fail();
 for(const f of inventory.files){const bytes=readFileSync(join(root,f.path));if(bytes.length!==f.bytes||sha(bytes)!==f.sha256)fail();}
}

function selfTest(root,run,config){
 const directory=join(run,'cache-self-test');if(existsSync(directory))fail();mkdirSync(directory,{mode:0o700});
 const source=join(directory,'source');mkdirSync(source,{mode:0o700});createCacheFixture(source);
 const cache=resolve(root,config.cache_parent);mkdirSync(cache,{recursive:true,mode:0o700});ownedPath(cache,{root:resolve(root,'.build/artifact-cache/functional-v1')});
 const image=config.runtime_image,policyKind='synthetic-offline-fixture';
 const verify=bridge(root,run,image,bridgeRequest('verify',{policyKind}),[{source,target:'/input',readOnly:true}]);
 const publish=bridge(root,run,image,bridgeRequest('publish',{policyKind}),[{source,target:'/input',readOnly:true},{source:cache,target:'/cache',readOnly:false}]);
 const digest=publish.output.artifact_id;if(!SHA.test(digest))fail();
 const entry=join(cache,digest);ownedPath(entry,{root:cache});
 const replay=bridge(root,run,image,bridgeRequest('replay',{policyKind,digest}),[{source:entry,target:`/entry/${digest}`,readOnly:true}]);
 if(JSON.stringify(verify.output)!==JSON.stringify(replay.output))fail();
 // The actual readonly assertion uses an explicitly scoped Node command below.
 const write=spawnSync('docker',['run','--rm','--pull=never','--network','none','--read-only','--user','1000:1000','--mount',`type=bind,source=${entry},target=/entry,readonly`,'--entrypoint','node',image,'-e',`try { require('node:fs').writeFileSync('/entry/payload/raw/train.txt','changed'); process.exit(3); } catch(error) { process.stdout.write(error.code); process.exit(error.code==='EROFS'?0:2); }`],{encoding:'utf8',maxBuffer:65536});
 if(write.status!==0||write.stdout!=='EROFS')fail();
 const generated=join(directory,'generated');cpSync(source,generated,{recursive:true});
 const producer={schema_version:1,kind:'synthetic-generated-fixture',producer_run:run.split('/').at(-1),source_manifest_sha256:sha(readFileSync(join(source,'artifact-manifest.json'))),generated_manifest_sha256:sha(readFileSync(join(generated,'artifact-manifest.json'))),operation:'exact-fixture-copy-no-course-transform',network:'none'};save(join(directory,'producer-receipt.json'),producer);
 const generatedPublish=bridge(root,run,image,bridgeRequest('publish',{policyKind}),[{source:generated,target:'/input',readOnly:true},{source:cache,target:'/cache',readOnly:false}]);
 if(generatedPublish.output.artifact_id!==digest)fail();
 const finalization=bridge(root,run,image,bridgeRequest('finalize-manifest',{policyKind,finalUrls:['https://example.invalid/fixtures/train.txt?key=PRIVATE-FIXTURE-VALUE','https://example.invalid/fixtures/valid.txt']}),[{source,target:'/input',readOnly:true}]);
 if(JSON.stringify(finalization.output).includes('PRIVATE-FIXTURE-VALUE'))fail();
 const wrongEndpoint=bridge(root,run,image,bridgeRequest('finalize-manifest',{policyKind,finalUrls:['https://unapproved.invalid/train','https://example.invalid/fixtures/valid.txt']}),[{source,target:'/input',readOnly:true}],{expectSuccess:false});
 if(wrongEndpoint.status===0)fail();
 const symlink=join(directory,'escaped');symlinkSync(source,symlink);let rejected=false;try{ownedPath(symlink,{root:directory});}catch{rejected=true;}if(!rejected)fail();
 chmodSync(generated,0o777);rejected=false;try{ownedPath(generated,{root:directory});}catch{rejected=true;}finally{chmodSync(generated,0o700);}if(!rejected)fail();
 rejected=false;try{ownedPath(source,{root:directory,uid:99999});}catch{rejected=true;}if(!rejected)fail();
 const receipt={schema_version:1,step_id:'establish-functional-artifact-cache-execution-boundary',target_id:'artifact-cache-v1',evidence_kind:'synthetic-offline-fixture',image_id:image,tool_build_receipt_sha256:sha(readFileSync(join(run,'tool-build-receipt.json'))),artifact_id:digest,verified_bundle:replay.output,producer_receipt_sha256:sha(readFileSync(join(directory,'producer-receipt.json'))),checks:{actual_publication:true,actual_readonly_replay:true,consumer_write_refused:true,generated_fixture_handoff:true,symlink_refused:true,wrong_mode_refused:true,wrong_uid_refused:true,private_url_redacted:true,unapproved_endpoint_refused:true},network:'none'};
 save(join(run,'artifact-cache-receipt.json'),receipt);return receipt;
}

export function runCacheCommand(args,{root=process.cwd()}={}){
 const opts=parseCacheArguments(args);if(opts.mode==='--help'){console.log('Artifact cache: build-tools --run-id RUN; self-test --run-id RUN --step STEP --target TARGET; publish/verify add --input PRIVATE_RUN_INPUT; replay adds --receipt PRIVATE_RUN_RECEIPT. Containers always offline. Source acquisition uses its separately declared image build target.');return 0;}
 const config=parseFile(join(root,'configs/functional-artifact-cache-targets.json')),run=resolve(root,'.build/runs',opts['run-id']);ownedPath(run,{root:resolve(root,'.build/runs')});
 config.runtime_image=runtimeImage(config);
 if(opts.mode==='build-tools'){buildTools(root,run,config.runtime_image);return 0;}
 const target=config.targets[opts.target];if(!target||target.step_id!==opts.step||!target.modes.includes(opts.mode)||target.validator!=='rust-dataset-v1')fail();
 verifyMetadata(root,config);
 if(opts.mode==='self-test'){selfTest(root,run,config);return 0;}
 if(!['publish','verify','replay'].includes(opts.mode)||target.policy_kind!=='production-source-policy')fail();
 const cache=resolve(root,config.cache_parent);mkdirSync(cache,{recursive:true,mode:0o700});ownedPath(cache,{root:resolve(root,'.build/artifact-cache/functional-v1')});
 let input,manifest,digest;
 if(opts.mode==='replay'){
  if(!opts.receipt||opts.input)fail();
  const selected=parseFile(ownedPath(resolve(opts.receipt),{root:run,directory:false,privateMode:true}));
  if(selected.step_id!==opts.step||selected.target_id!==opts.target||selected.evidence_kind!=='production-source-policy'||!SHA.test(selected.artifact_id))fail();
  digest=selected.artifact_id;input=ownedPath(join(cache,digest),{root:cache});manifest=parseFile(join(input,'artifact-manifest.json'));
 }else{
  if(!opts.input||opts.receipt)fail();input=ownedPath(resolve(opts.input),{root:run,privateMode:true});manifest=parseFile(join(input,'artifact-manifest.json'));
 }
 // The acquisition owner freezes this accepted producer binding once. Replay
 // compares historical production identities, not unrelated later tool edits.
 const accepted=parseFile(join(root,'artifacts/functional-laptop/acquisition/tinystories/production-binding.json'));
 if(accepted.schema_version!==1||accepted.step_id!==opts.step||accepted.target_id!==opts.target||accepted.metadata_inventory_sha256!==sha(readFileSync(join(root,config.metadata_inventory))))fail();
 const binding=accepted.producer_binding;
 if(binding?.licenseTextSha256!==target.license_text_sha256||binding?.attributionSha256!==sha(readFileSync(join(root,target.attribution)))||JSON.stringify(binding?.attributionReferences)!==JSON.stringify(target.attribution_references))fail();
 bindProductionProvenance(manifest,binding);
 const plan=runtimeMountPlan(opts.mode,{runRoot:run,inputRoot:input,cacheRoot:cache,digest,policyKind:target.policy_kind,targetKind:'raw-pair'});
 const result=bridge(root,run,config.runtime_image,bridgeRequest(opts.mode,{digest,policyKind:target.policy_kind}),plan.mounts);
 const receipt={schema_version:1,step_id:opts.step,target_id:opts.target,evidence_kind:target.policy_kind,image_id:config.runtime_image,operation:opts.mode,artifact_id:result.output.artifact_id,verified_bundle:result.output,tool_build_receipt_sha256:sha(readFileSync(join(run,'tool-build-receipt.json'))),metadata_inventory_sha256:sha(readFileSync(join(root,config.metadata_inventory))),producer_binding:binding,network:'none'};
 save(join(run,`artifact-cache-${opts.mode}-receipt.json`),receipt);return 0;
}
if(import.meta.url===pathToFileURL(resolve(process.argv[1]??'')).href){try{process.exitCode=runCacheCommand(process.argv.slice(2));}catch{console.error('Artifact cache boundary refused; private run evidence retained.');process.exitCode=2;}}
