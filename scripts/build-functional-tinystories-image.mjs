#!/usr/bin/env node
// Closed local image-build orchestration. No payload admission algorithm.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {ownedPath,runtimeSelection,freezeRuntime,checkRuntimeUnchanged} from './lib/functional-artifact-cache-boundary.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const refused=()=>{throw Error('fixed source image boundary refused');};
const INPUTS=['Dockerfile','Cargo.toml','Cargo.lock','configs/functional-corpus-assets.json','artifacts/functional-laptop/step-output-inventories/capture-functional-tinystories-source-metadata.json'];
function imageId(tag){const result=spawnSync('docker',['image','inspect','--format','{{.Id}}',tag],{encoding:'utf8',maxBuffer:65536});const id=result.stdout?.trim();if(result.status!==0||!/^sha256:[a-f0-9]{64}$/.test(id))refused();return id;}
export function parseSourceBuildArguments(args){
 const {values,tokens}=parseArgs({args,options:{'run-id':{type:'string'},corpus:{type:'string'},'runtime-image':{type:'string'},'expected-image-id':{type:'string'}},strict:true,allowPositionals:false,tokens:true});
 if(new Set(tokens.map(token=>token.name)).size!==tokens.length||!values['run-id'])refused();
 const selected={runId:values['run-id'],corpus:values.corpus??'true',runtimeImage:values['runtime-image'],expectedImageId:values['expected-image-id']};runtimeSelection('learn-llm-workspace:local',selected);return selected;
}
export async function buildSourceImage({root=process.cwd(),runId,corpus='true',runtimeImage,expectedImageId}){
 if(!/^[0-9]{8}T[0-9]{6}Z-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(runId??'')||!['true','false'].includes(corpus))refused();
 const run=ownedPath(resolve(root,'.build/runs',runId),{root:resolve(root,'.build/runs'),privateMode:true});
 const runtime=freezeRuntime(runtimeSelection('learn-llm-workspace:local',{runtimeImage,expectedImageId}),imageId);
 const attempt=readdirSync(run).filter(name=>name.startsWith('source-build-'+corpus+'-')).length+1,operation=join(run,'source-build-'+corpus+'-'+attempt);if(existsSync(operation))refused();mkdirSync(operation,{mode:0o700});
 const context=join(operation,'context');mkdirSync(context,{mode:0o700});const records=[];
 function copy(path){const candidate=join(run,'publish',path),source=existsSync(candidate)?candidate:join(root,path);const bytes=readFileSync(source),target=join(context,path);mkdirSync(dirname(target),{recursive:true});copyFileSync(source,target);records.push({path,bytes:bytes.length,sha256:sha(bytes)});}
 for(const path of INPUTS)copy(path);
 const deletedPath=join(run,'deleted-files.json'),deleted=existsSync(deletedPath)?JSON.parse(readFileSync(deletedPath,'utf8')).paths:[];
 function copyTree(path){for(const entry of readdirSync(join(root,path),{withFileTypes:true})){const selected=join(path,entry.name);if(deleted.includes(selected))continue;if(entry.isSymbolicLink())refused();if(entry.isDirectory())copyTree(selected);else if(entry.isFile()&&!records.some(r=>r.path===selected))copy(selected);else if(!entry.isFile())refused();}}
 copyTree('rust');
 copyTree('configs');
 function copyNew(path){if(!existsSync(join(run,'publish',path)))return;for(const entry of readdirSync(join(run,'publish',path),{withFileTypes:true})){const selected=join(path,entry.name);if(entry.isDirectory())copyNew(selected);else if(entry.isFile()&&!records.some(r=>r.path===selected))copy(selected);else if(entry.isSymbolicLink())refused();}}
 copyNew('rust');
 copyNew('configs');
 const inventory=JSON.parse(readFileSync(join(context,INPUTS.at(-1)),'utf8'));
 if(inventory.step_id!=='capture-functional-tinystories-source-metadata')refused();
 for(const file of inventory.files){const bytes=readFileSync(join(root,file.path));if(bytes.length!==file.bytes||sha(bytes)!==file.sha256)refused();copy(file.path);}
 records.sort((a,b)=>Buffer.compare(Buffer.from(a.path),Buffer.from(b.path)));
 const base=runtime.image_id,tag=corpus==='true'?'learn-llm-tinystories:local':'learn-llm-tinystories-disabled:local';
 // Official supporting-crate provisioning belongs to image BUILD. False
 // suppresses corpus HTTP entirely but does not suppress tool provisioning.
 const argv=['build','--network','default','--build-arg',`COURSE_CORPUS=${corpus}`,'--build-arg',`COURSE_CORPUS_BASE=${runtime.image_reference}`,'--target','course-corpus','--tag',tag,context];
 const started=Date.now(),log=join(operation,'build.log');writeFileSync(log,'',{flag:'wx',mode:0o600});let logBytes=0,lastAccounting=null;
 const outcome=await new Promise(resolvePromise=>{
  const child=spawn('docker',argv,{stdio:['ignore','pipe','pipe']}),timeout=setTimeout(()=>child.kill('SIGTERM'),14400000);let pending='';
  const collect=chunk=>{logBytes+=chunk.length;if(logBytes>1048576){child.kill('SIGTERM');return;}writeFileSync(log,chunk,{flag:'a'});process.stdout.write(chunk);pending+=chunk.toString();const lines=pending.split('\n');pending=lines.pop();for(const line of lines){const start=line.indexOf('{');if(start>=0){try{const record=JSON.parse(line.slice(start));if(record.schema_version===2&&typeof record.enabled==='boolean')lastAccounting=record;}catch{}}}};
  child.stdout.on('data',collect);child.stderr.on('data',collect);child.on('error',()=>{clearTimeout(timeout);resolvePromise({status:null,error:true});});child.on('close',(status,signal)=>{clearTimeout(timeout);resolvePromise({status,signal});});
 });
 let checkedRuntime=null;try{checkedRuntime=checkRuntimeUnchanged(runtime,imageId);}catch{}
 const receipt={schema_version:2,step_id:corpus==='false'?'refactor-ch41-content-only-boundary':'acquire-functional-tinystories-raw-pair',kind:'conditional-library-owned-source-image-build',corpus,base_image_id:base,runtime_identity:checkedRuntime??{...runtime,identity_check:'post-operation-refused'},source_image_tag:tag,source_image_id:outcome.status===0?imageId(tag):null,inputs:records,argv,started_at:new Date(started).toISOString(),elapsed_ms:Date.now()-started,observed_final_payload_accounting:lastAccounting,wire_body_accounting:'unavailable',build_log_sha256:sha(readFileSync(log)),outcome};
 writeFileSync(join(operation,'build-receipt.json'),JSON.stringify(receipt)+'\n',{flag:'wx',mode:0o600});if(outcome.status!==0||Date.now()-started>14400000||logBytes>1048576||checkedRuntime===null)refused();return receipt;
}
if(import.meta.url===pathToFileURL(resolve(process.argv[1]??'')).href){try{await buildSourceImage(parseSourceBuildArguments(process.argv.slice(2)));}catch{console.error('Fixed source image boundary refused; exact private build evidence retained.');process.exitCode=2;}}
