// Fixed operational composition only. Rust owns filtering, eligibility and cache admission.
import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync,readdirSync,chmodSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {ownedPath,selectedPolicy,bridgeRequest,checkRuntimeUnchanged,runtimeSelection,exactKeys} from './functional-artifact-cache-boundary.mjs';
import {input,sourceHash,image,imageId,metadata,buildTools,tool} from './run-functional-artifact-cache.mjs';
const SHA=/^[0-9a-f]{64}$/;
const fail=()=>{throw Error('functional filtering boundary refused');};
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=p=>{const s=lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.size>1_048_576)fail();return readFileSync(p);};
const parse=p=>JSON.parse(bytes(p));
const save=(p,v)=>{mkdirSync(dirname(p),{recursive:true,mode:0o700});writeFileSync(p,JSON.stringify(v)+'\n',{flag:'wx',mode:0o600});};
const exactBytes=(p,b)=>{if(existsSync(p)){if(!bytes(p).equals(b))fail();}else{mkdirSync(dirname(p),{recursive:true,mode:0o700});writeFileSync(p,b,{flag:'wx',mode:0o600});}};
const saveControl=(p,v)=>exactBytes(p,Buffer.from(JSON.stringify(v)+'\n'));
export function parseFilterArguments(args){
 const [mode,...rest]=args;if(mode==='--help'){if(args.length!==1)fail();return {mode};}
 if(!['run','verify','publish-generated'].includes(mode))fail();
 const {values,tokens}=parseArgs({args:rest,options:Object.fromEntries(['run-id','step','target','runtime-image','expected-image-id'].map(name=>[name,{type:'string'}])),strict:true,allowPositionals:false,tokens:true});
 if(new Set(tokens.map(t=>t.name)).size!==tokens.length||Object.values(values).some(v=>!v))fail();
 const expected=['run-id','step','target'];if(runtimeSelection('learn-llm-workspace:local',{runtimeImage:values['runtime-image'],expectedImageId:values['expected-image-id']}).selection==='explicit')expected.push('runtime-image','expected-image-id');
 if(Object.keys(values).sort().join()!==expected.sort().join()||!/^[0-9]{8}T[0-9]{6}Z-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values['run-id'])||values.step!=='execute-functional-corpus-filtering'||values.target!==(mode==='publish-generated'?'corpus-filtering-v1':'execute-functional-corpus-filtering-v1'))fail();
 return {mode,...values};
}
export function fileBytes(path){
 const st=lstatSync(path);if(st.isSymbolicLink())fail();if(st.isFile()){if(!Number.isSafeInteger(st.size))fail();return st.size;}
 if(!st.isDirectory())fail();let count=0;for(const name of readdirSync(path)){count+=fileBytes(join(path,name));if(!Number.isSafeInteger(count))fail();}return count;
}
export function remainingMilliseconds(start,seconds,now=Date.now()){
 const left=start+seconds*1000-now;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(seconds)||seconds<=0||seconds>7200||left<=0)fail();return left;
}
export function ownedContainerName(runId,attempt){
 if(!/^[0-9]{8}T[0-9]{6}Z-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(runId)||!Number.isSafeInteger(attempt)||attempt<1)fail();
 return `course-filter-${runId.toLowerCase()}-${attempt}`;
}
export function controllerMemoryObservation(status,{maxRSS=process.resourceUsage().maxRSS}={}){
 if(process.platform!=='linux')fail();
 const field=name=>{const rows=status.split('\n').filter(s=>s.startsWith(`${name}:`));if(rows.length!==1)fail();const match=rows[0].match(new RegExp(`^${name}:\\s+([0-9]+)\\s+kB$`));if(!match)fail();const kib=Number(match[1]),value=kib*1024;if(!Number.isSafeInteger(kib)||!Number.isSafeInteger(value)||value<0)fail();return value;};
 return {method:'linux-current-exec-vmhwm-kib-v1',scope:'current-controller-exec',vm_hwm_bytes:field('VmHWM'),vm_rss_bytes:field('VmRSS'),getrusage_maxrss_kib:maxRSS,getrusage_scope:'diagnostic-may-include-preexec-launcher-not-controller-peak'};
}
export function selectedContinuation(root,run,spec,frozen){
 const selectionPath=join(run,'filter-continuation.json');if(!existsSync(selectionPath))return null;
 const c=parse(ownedPath(selectionPath,{root:run,directory:false,privateMode:true}));exactKeys(c,['schema_version','kind','origin_run_id','original_phase_start_sha256','producer_result_sha256','invocation_sha256','completion_sha256','manifest_sha256','memory_peak_sha256','cpu_stat_sha256']);
 if(c.schema_version!==1||c.kind!=='completed-generator-continuation-v1'||!/^[0-9]{8}T[0-9]{6}Z-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.origin_run_id)||c.origin_run_id===run.split('/').at(-1))fail();
 const origin=ownedPath(resolve(root,'.build/runs',c.origin_run_id),{root:resolve(root,'.build/runs')}),phase=ownedPath(join(origin,'filter-execution'),{root:origin,privateMode:true}),evidence=ownedPath(join(phase,'call-1'),{root:phase,privateMode:true});
 const bound=(path,digest)=>{const b=bytes(path);if(!SHA.test(digest)||sha(b)!==digest)fail();return b;};
 const start=JSON.parse(bound(join(origin,'filter-controls/phase-start.json'),c.original_phase_start_sha256)),stdout=bound(join(evidence,'stdout.json'),c.producer_result_sha256),invocation=JSON.parse(bound(join(evidence,'invocation.json'),c.invocation_sha256)),completion=JSON.parse(bound(join(evidence,'completion.json'),c.completion_sha256));
 const peak=Number(bound(join(evidence,'memory-peak.txt'),c.memory_peak_sha256).toString().trim()),cpu=bound(join(evidence,'cpu-stat.txt'),c.cpu_stat_sha256).toString();
 if(start.wall_seconds_max!==spec.resources.wall_seconds_max||invocation.request?.operation!=='generate'||invocation.argv?.[invocation.argv.indexOf('--network')+1]!=='none'||invocation.argv?.[invocation.argv.indexOf('--memory')+1]!==String(spec.resources.host_bytes_max-268435456)||!invocation.argv?.includes(frozen.runtime_image_id)||completion.status!==0||completion.signal!==null||completion.cancelled!==false||completion.container_absent!==true||!Number.isSafeInteger(peak)||peak<0||peak>spec.resources.host_bytes_max-268435456)fail();
 const produced=validateProduced(JSON.parse(stdout),{spec,specSha:frozen.phase_spec_sha256,sourceSha:frozen.producer_source_sha256,binarySha:frozen.producer_binary_sha256});
 const output=ownedPath(join(phase,'output'),{root:phase,privateMode:true});bound(join(output,spec.output_layout.manifest_path),c.manifest_sha256);
 return {selection:c,origin,phase,evidence,start,stdout,produced,output,generation:{origin_run_id:c.origin_run_id,producer_result_sha256:c.producer_result_sha256,invocation_sha256:c.invocation_sha256,completion_sha256:c.completion_sha256,observed_workload_cgroup_memory_peak_bytes:peak,observed_workload_cpu_stat:cpu,original_controller_peak_bytes:null,original_controller_peak_availability:'not-recorded-before-mis-scoped-postcheck-refusal',workload_cap_bytes:spec.resources.host_bytes_max-268435456,controller_reserved_bytes:268435456,resource_validation_kind:'configured-accounted-envelope-and-measured-workload-continuation-not-retrospective-whole-host'}};
}
export function validateProduced(p,{spec,specSha,sourceSha,binarySha}){
 if(p?.schema_version!==1||p.kind!=='verified-filter-output-v1'||p.evidence_kind!=='production-source-policy'||p.input_artifact_id!==spec.input_artifact_id||p.input_receipt_sha256!==spec.input_receipt_sha256||p.phase_spec_sha256!==specSha||p.producer_source_sha256!==sourceSha||p.producer_binary_sha256!==binarySha||p.manifest?.producer?.script_sha256!==sourceSha||p.manifest.producer.config_sha256!==p.filter_policy_sha256||!SHA.test(p.filter_policy_sha256))fail();
 for(const name of ['records','retained','rejected','manual_review','metadata_bytes','payload_bytes'])if(!Number.isSafeInteger(p[name])||p[name]<0)fail();
 if(p.retained+p.rejected+p.manual_review!==p.records||p.metadata_bytes>=spec.resources.metadata_bytes_exclusive||p.payload_bytes>spec.resources.generated_payload_bytes_max)fail();
 if(p.manifest?.schema_version!==2||p.manifest.dataset_scope?.selected_source!==spec.input_artifact_id||p.manifest.payload?.map(p=>p.id).join()!=='attribution,findings,license,receipt,retained'||p.manifest.sources?.some(s=>s.content_id!=='retained'))fail();
 return p;
}
export function containerArguments({name,cidfile,runId,imageId,binary,evidence,mounts,memoryBytes,remainingMs}){
 if(!/^course-filter-[a-z0-9-]+$/.test(name)||!/^sha256:[a-f0-9]{64}$/.test(imageId)||!Number.isSafeInteger(memoryBytes)||memoryBytes<=0||remainingMs<1000)fail();
 const argv=['run','-i','--pull=never','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--user','1000:1000','--pids-limit','64','--memory',String(memoryBytes),'--memory-swap',String(memoryBytes),'--name',name,'--cidfile',cidfile,'--label',`learn-llm.run-id=${runId}`];
 for(const m of [{source:binary,target:'/tool',readOnly:true},{source:evidence,target:'/evidence',readOnly:false},...mounts]){if(m.source.includes(',')||m.target.includes(','))fail();argv.push('--mount',`type=bind,source=${m.source},target=${m.target}${m.readOnly?',readonly':''}`);}
 // The independent in-container timeout also stops a workload after host disconnection.
 argv.push('--entrypoint','sh',imageId,'-c',`set +e; timeout --signal=TERM --kill-after=5s ${Math.max(1,Math.floor(remainingMs/1000))}s /tool; outcome=$?; cat /sys/fs/cgroup/memory.peak > /evidence/memory-peak.txt; cat /sys/fs/cgroup/cpu.stat > /evidence/cpu-stat.txt; printf '%s\\n' "$outcome" > /evidence/workload-exit.txt; exit "$outcome"`);return argv;
}
export function cleanupOwnedContainer({cidfile,name,runId},{execute=spawnSync}={}){
 let identity=name;if(existsSync(cidfile)){identity=bytes(cidfile).toString().trim();if(!SHA.test(identity))fail();}
 const absent=r=>r.status===1&&/No such (object|container)/.test(r.stderr??'');
 const state=execute('docker',['inspect','--format','{{json .Config.Labels}}',identity],{encoding:'utf8',maxBuffer:65536});if(state.status!==0){if(!absent(state))fail();return {container_absent:true};}
 let labels;try{labels=JSON.parse(state.stdout);}catch{fail();}if(labels?.['learn-llm.run-id']!==runId)fail();
 const removed=execute('docker',['rm','--force',identity],{encoding:'utf8',maxBuffer:65536});if(removed.status!==0)fail();
 if(!absent(execute('docker',['inspect',identity],{encoding:'utf8',maxBuffer:65536})))fail();return {container_absent:true,removed_owned_id:identity};
}
export async function runOwnedContainer(options,{launch=spawn,execute=spawnSync}={}){
 const {argv,evidence,request,remainingMs,...ownership}=options;save(join(evidence,'invocation.json'),{argv,request,remaining_ms:remainingMs});
 let stdout=Buffer.alloc(0),stderr=Buffer.alloc(0),cancelled=false,child,result,cleanup;
 const stop=()=>{cancelled=true;child?.kill('SIGTERM');};
 process.once('SIGINT',stop);process.once('SIGTERM',stop);const timer=setTimeout(stop,remainingMs);
 try{
  result=await new Promise((accept,reject)=>{
   child=launch('docker',argv,{stdio:['pipe','pipe','pipe']});
   for(const [stream,isOut] of [[child.stdout,true],[child.stderr,false]])stream.on('data',chunk=>{let value=isOut?stdout:stderr;if(value.length+chunk.length>2_097_152){stop();return;}value=Buffer.concat([value,chunk]);if(isOut)stdout=value;else stderr=value;});
   child.once('error',reject);child.once('close',(status,signal)=>accept({status,signal}));child.stdin.end(JSON.stringify(request)+'\n');
  });
 }finally{
  clearTimeout(timer);process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);
  writeFileSync(join(evidence,'stdout.json'),stdout,{flag:'wx',mode:0o600});writeFileSync(join(evidence,'stderr.txt'),stderr,{flag:'wx',mode:0o600});
  cleanup=cleanupOwnedContainer(ownership,{execute});save(join(evidence,'completion.json'),{...result,cancelled,...cleanup});
 }
 if(cancelled||result.status!==0||result.signal)fail();
 const peak=Number(bytes(join(evidence,'memory-peak.txt')).toString().trim());if(!Number.isSafeInteger(peak)||peak<0||peak>options.memoryBytes)fail();
 let output;try{output=JSON.parse(stdout);}catch{fail();}return {output,stdout,peak,cleanup};
}
function prepared(root,run,config,target){
 metadata(root,config);const raw=config.targets[target.raw_target];if(raw?.validator!=='rust-dataset-v2'||raw.policy_kind!=='production-source-policy')fail();
 const envelope=parse(input(root,run,raw.asset_config)),asset=envelope.assets?.[raw.asset_id],accepted=parse(join(root,raw.production_binding));
 if(envelope.schema_version!==2||envelope.default_asset!==raw.asset_id||!asset||accepted.schema_version!==2||accepted.step_id!==raw.step_id||accepted.target_id!==target.raw_target||accepted.metadata_inventory_sha256!==sha(bytes(join(root,config.metadata_inventory)))||accepted.binding?.selected_asset_sha256!==sha(Buffer.from(JSON.stringify(asset)+'\n')))fail();
 if(!Array.isArray(accepted.producer_inputs)||!accepted.producer_inputs.length)fail();for(const f of accepted.producer_inputs){const b=bytes(join(root,f.path));if(b.length!==f.bytes||sha(b)!==f.sha256)fail();}
 const policy=selectedPolicy(asset,accepted.binding);for(const [id,path]of Object.entries(asset.metadata_files)){const p=policy.manifest.payload.find(p=>p.id===id),b=bytes(join(root,path));if(!p||b.length!==p.bytes||sha(b)!==p.sha256)fail();}
 const specPath=input(root,run,target.phase_spec),specBytes=bytes(specPath),spec=JSON.parse(specBytes),receiptPath=join(root,target.input_receipt),receiptBytes=bytes(receiptPath),receipt=JSON.parse(receiptBytes);
 if(spec.schema_version!==1||spec.step_id!==target.step_id||spec.target_id!=='execute-functional-corpus-filtering-v1'||spec.evidence_kind!=='production-source-policy'||receipt.status!=='admitted-offline'||receipt.evidence_kind!=='production-source-policy'||receipt.artifact_id!==spec.input_artifact_id||sha(receiptBytes)!==spec.input_receipt_sha256)fail();
 const cache=ownedPath(resolve(root,config.cache_parent),{root:resolve(root,'.build/artifact-cache/functional-v2')}),rawRoot=ownedPath(join(cache,asset.storage.cache.entry_prefix+spec.input_artifact_id),{root:cache});
 if(sha(bytes(join(rawRoot,asset.storage.files.manifest_path)))!==spec.input_artifact_id)fail();
 const controls=join(run,'filter-controls');if(!existsSync(controls))mkdirSync(controls,{mode:0o700});ownedPath(controls,{root:run,privateMode:true});
 const policyPath=join(controls,'raw-content-policy.json'),layoutPath=join(controls,'raw-layout.json');saveControl(policyPath,policy);saveControl(layoutPath,asset.storage);
 return {asset,policy,spec,specPath,specSha:sha(specBytes),receiptPath,cache,rawRoot,controls,policyPath,layoutPath};
}
export async function runFilteringCommand(args,{root=process.cwd()}={}){
 const opts=parseFilterArguments(args);if(opts.mode==='--help'){console.log('Offline filtering: run/verify --run-id RUN --step execute-functional-corpus-filtering --target execute-functional-corpus-filtering-v1; publish-generated uses target corpus-filtering-v1. Optional paired runtime selector chooses an existing image only. run performs the full transform, verified atomic cache publication and replay under one 7200s envelope.');return 0;}
 const run=ownedPath(resolve(root,'.build/runs',opts['run-id']),{root:resolve(root,'.build/runs')}),config=parse(input(root,run,'configs/functional-artifact-cache-targets.json')),target=config.targets?.[opts.target];
 if(config.schema_version!==2||target?.step_id!==opts.step||target.validator!=='rust-filter-generated-v1'||target.policy_kind!=='production-source-policy'||!target.modes.includes(opts.mode))fail();
 const p=prepared(root,run,config,target),runtime=image(config,opts),id=runtime.image_id;
 if(opts.mode==='run'&&!readdirSync(run).some(n=>/^tool-build-receipt-v2-[0-9]+\.json$/.test(n)))buildTools(root,run,id,{runtime,filtering:true});
 const selected=tool(root,run,id),filter=selected.receipt.filter_binary;if(!filter||!/^filter-tool-binary-v1-[0-9]+$/.test(filter.path))fail();
 const filterBinary=ownedPath(join(run,filter.path),{root:run,directory:false});if(sha(readFileSync(filterBinary))!==filter.sha256)fail();
 const sourcePath=input(root,run,'rust/tools/functional-artifact-cache/src/corpus_filter.rs'),sourceSha=sha(bytes(sourcePath)),entrypointPath=input(root,run,'rust/tools/functional-artifact-cache/src/bin/llm-functional-corpus-filter.rs');
 const frozen={schema_version:1,input_artifact_id:p.spec.input_artifact_id,input_receipt_sha256:p.spec.input_receipt_sha256,phase_spec_sha256:p.specSha,producer_source_sha256:sourceSha,producer_entrypoint_sha256:sha(bytes(entrypointPath)),producer_binary_sha256:filter.sha256,source_tree_sha256:sourceHash(root,run),tool_build_receipt_sha256:sha(bytes(selected.receiptPath)),runtime_image_id:id};saveControl(join(p.controls,'frozen-inputs.json'),frozen);
 const continuation=selectedContinuation(root,run,p.spec,frozen);if(continuation&&opts.mode==='run')fail();
 const startPath=join(p.controls,'phase-start.json');if(continuation)saveControl(startPath,continuation.start);else if(opts.mode==='run'){if(existsSync(startPath))fail();save(startPath,{started_ms:Date.now(),wall_seconds_max:p.spec.resources.wall_seconds_max});}
 const start=parse(startPath);if(start.wall_seconds_max!==p.spec.resources.wall_seconds_max)fail();
 const phase=join(run,'filter-execution');if(!existsSync(phase))mkdirSync(phase,{mode:0o700});ownedPath(phase,{root:run,privateMode:true});
 const output=continuation?continuation.output:join(phase,'output'),producedPath=join(phase,'producer-result.json'),closurePath=join(phase,'producer-closure.json');
 const controllerReserve=268_435_456,memory=p.spec.resources.host_bytes_max-controllerReserve;if(memory<=0)fail();
 const rawBytes=fileBytes(p.rawRoot),controlPlan=fileBytes(p.controls)+lstatSync(filterBinary).size+lstatSync(selected.binary).size;
 if(controlPlan>controllerReserve||rawBytes+2*p.spec.resources.generated_payload_bytes_max+controllerReserve>p.spec.resources.disk_bytes_max)fail();
 const preparationMemory=controllerMemoryObservation(readFileSync('/proc/self/status','utf8'));save(join(phase,`controller-input-replay-${readdirSync(phase).filter(n=>/^controller-input-replay-[0-9]+\.json$/.test(n)).length+1}.json`),preparationMemory);if(preparationMemory.vm_hwm_bytes>controllerReserve)fail();
 const calls=[];const invoke=async(label,binary,request,mounts)=>{
  const number=readdirSync(phase).filter(n=>/^call-[0-9]+$/.test(n)).length+1,evidence=join(phase,`call-${number}`);mkdirSync(evidence,{mode:0o700});
  const remainingMs=remainingMilliseconds(start.started_ms,start.wall_seconds_max),name=ownedContainerName(opts['run-id'],number),cidfile=join(evidence,'container.cid');
  const argv=containerArguments({name,cidfile,runId:opts['run-id'],imageId:id,binary,evidence,mounts,memoryBytes:memory,remainingMs});
  const result=await runOwnedContainer({argv,evidence,request,remainingMs,name,cidfile,runId:opts['run-id'],memoryBytes:memory});
  const observation=controllerMemoryObservation(readFileSync('/proc/self/status','utf8'));save(join(evidence,'resource-observation.json'),{label,workload_cgroup_peak_bytes:result.peak,controller:observation});
  const controllerPeak=observation.vm_hwm_bytes;if(controllerPeak>controllerReserve||result.peak+controllerPeak>p.spec.resources.host_bytes_max)fail();
  const record={label,evidence:`filter-execution/call-${number}`,memory_peak_bytes:result.peak,controller_vm_hwm_bytes:controllerPeak,controller_observation:observation,network:'none',container_absent:true};calls.push(record);save(join(evidence,'resource-check.json'),record);return result;
 };
 const filterMounts=(candidate,withProducer)=>[{source:p.specPath,target:'/spec/corpus-filter-v1.json',readOnly:true},{source:p.policyPath,target:'/policy/raw-content-policy.json',readOnly:true},{source:p.layoutPath,target:'/layout/raw-layout.json',readOnly:true},{source:p.receiptPath,target:'/receipts/input.json',readOnly:true},{source:p.rawRoot,target:'/artifacts/input',readOnly:true},{source:sourcePath,target:'/producer/source.rs',readOnly:true},{source:candidate,target:'/output',readOnly:withProducer},...(withProducer?[{source:producedPath,target:'/producer/result.json',readOnly:true}]:[])];
 if(opts.mode==='run'){
  if(existsSync(output)||existsSync(producedPath)||existsSync(closurePath))fail();mkdirSync(output,{mode:0o700});
  const result=await invoke('generate',filterBinary,{operation:'generate'},filterMounts(output,false));
  validateProduced(result.output,{spec:p.spec,specSha:p.specSha,sourceSha,binarySha:filter.sha256});
  exactBytes(producedPath,result.stdout);save(closurePath,{...frozen,producer_result_sha256:sha(result.stdout),generator_evidence:calls.at(-1).evidence});
 }
 if(continuation){exactBytes(producedPath,continuation.stdout);saveControl(closurePath,{...frozen,producer_result_sha256:sha(continuation.stdout),origin_run_id:continuation.selection.origin_run_id,generator_evidence:'filter-execution/call-1'});}
 const producedBytes=bytes(ownedPath(producedPath,{root:phase,directory:false,privateMode:true})),produced=validateProduced(JSON.parse(producedBytes),{spec:p.spec,specSha:p.specSha,sourceSha,binarySha:filter.sha256}),closure=parse(closurePath);
 for(const [key,value]of Object.entries(frozen))if(closure[key]!==value)fail();if(closure.producer_result_sha256!==sha(producedBytes))fail();
 const generateEvidence=continuation?continuation.evidence:ownedPath(resolve(phase,closure.generator_evidence.replace(/^filter-execution\//,'')),{root:phase,privateMode:true});
 if(!bytes(join(generateEvidence,'stdout.json')).equals(producedBytes)||parse(join(generateEvidence,'completion.json')).status!==0||(!continuation&&parse(join(generateEvidence,'resource-check.json')).label!=='generate'))fail();
 const digest=sha(bytes(join(output,p.spec.output_layout.manifest_path))),entry=join(p.cache,p.asset.storage.cache.entry_prefix+digest);
 const generatedPolicyPath=join(p.controls,'generated-content-policy.json'),generatedLayoutPath=join(p.controls,'generated-layout.json');saveControl(generatedPolicyPath,{evidence_kind:'production-source-policy',manifest:produced.manifest});saveControl(generatedLayoutPath,{schema_version:1,files:p.spec.output_layout,cache:p.asset.storage.cache});
 await invoke('eligible-output-replay',filterBinary,{operation:'verify'},filterMounts(output,true));
 const cacheMounts=[{source:generatedPolicyPath,target:'/policy/content-policy.json',readOnly:true},{source:generatedLayoutPath,target:'/layout/storage-layout.json',readOnly:true}];
 if(!existsSync(entry)){
  if(opts.mode==='verify')fail();await invoke('publish-generated',selected.binary,bridgeRequest('publish'),[...cacheMounts,{source:output,target:'/input',readOnly:true},{source:p.cache,target:'/cache',readOnly:false}]);
 }
 ownedPath(entry,{root:p.cache});await invoke('immutable-cache-replay',selected.binary,bridgeRequest('replay',{digest}),[...cacheMounts,{source:entry,target:'/entry',readOnly:true}]);
 await invoke('eligible-cache-replay',filterBinary,{operation:'verify'},filterMounts(entry,true));
 remainingMilliseconds(start.started_ms,start.wall_seconds_max);const runtimeIdentity=checkRuntimeUnchanged(runtime,imageId);
 const originControls=continuation?fileBytes(join(continuation.origin,'filter-controls'))+fileBytes(continuation.phase)-fileBytes(output):0;
 const controlBytes=fileBytes(p.controls)+lstatSync(filterBinary).size+lstatSync(selected.binary).size+fileBytes(phase)-(continuation?0:fileBytes(output))+originControls;
 const actualDisk=rawBytes+fileBytes(output)+fileBytes(entry)+controlBytes;
 if(actualDisk>p.spec.resources.disk_bytes_max||controlBytes>controllerReserve)fail();
 const receipt={schema_version:1,step_id:opts.step,run_id:opts['run-id'],status:'admitted-offline',evidence_kind:'production-source-policy',artifact_id:digest,manifest_sha256:digest,input_artifact_id:p.spec.input_artifact_id,input_receipt_sha256:p.spec.input_receipt_sha256,producer:produced.manifest.producer,phase_spec_sha256:p.specSha,producer_binary_sha256:filter.sha256,producer_entrypoint_sha256:frozen.producer_entrypoint_sha256,source_tree_sha256:frozen.source_tree_sha256,producer_result_sha256:sha(producedBytes),runtime_identity:runtimeIdentity,counts:{records:produced.records,retained:produced.retained,rejected:produced.rejected,manual_review:produced.manual_review},resources:{wall_seconds_max:start.wall_seconds_max,whole_phase_elapsed_ms:Date.now()-start.started_ms,host_bytes_max:p.spec.resources.host_bytes_max,actual_disk_bytes:actualDisk,disk_bytes_upper_bound:rawBytes+2*p.spec.resources.generated_payload_bytes_max+controllerReserve,disk_bytes_max:p.spec.resources.disk_bytes_max,metadata_bytes:produced.metadata_bytes,payload_bytes:produced.payload_bytes,calls},network:'none',privacy_claim:'rule-based-filtering-not-comprehensive-clearance',redistribution:produced.manifest.redistribution};
 if(continuation){receipt.generation_origin=continuation.generation;receipt.resources.validation_kind='configured-accounted-envelope-plus-measured-workload-and-continuation-not-retrospective-whole-host';receipt.resources.controller_reservation_bytes=controllerReserve;receipt.resources.current_controller_input_replay=preparationMemory;receipt.resources.original_phase_start_ms=start.started_ms;}
 const checkpoint=join(phase,`completion-${readdirSync(phase).filter(n=>/^completion-[0-9]+\.json$/.test(n)).length+1}.json`);save(checkpoint,receipt);
 if((opts.mode==='run'||(opts.mode==='publish-generated'&&continuation))&&!existsSync(join(run,'publish/artifacts/functional-laptop/data/filtered-corpus-v1/receipt.json'))){
  const base=join(run,'publish/artifacts/functional-laptop/data/filtered-corpus-v1');exactBytes(join(base,'manifest.json'),bytes(join(output,p.spec.output_layout.manifest_path)));save(join(base,'receipt.json'),receipt);
  save(join(run,'publish/audits/functional-laptop/data/filtered-corpus-v1.json'),{schema_version:1,step_id:opts.step,run_id:opts['run-id'],status:'verified',input_artifact_id:p.spec.input_artifact_id,artifact_id:digest,counts:receipt.counts,filter_policy: p.spec.filter_policy,resources:receipt.resources,claims_excluded:['comprehensive-privacy','benchmark-protection','quality','model-redistribution-rights'],lineage:'all-selected-raw-source-occurrences-preserved-no-final-split',network:'none'});
 }
 console.log(JSON.stringify({artifact_id:digest,status:'verified-offline',retained:produced.retained,completion:checkpoint}));return 0;
}
if(import.meta.url===pathToFileURL(resolve(process.argv[1]??'')).href){try{process.exitCode=await runFilteringCommand(process.argv.slice(2));}catch{console.error('Functional corpus filtering refused; exact private evidence retained.');process.exitCode=2;}}
