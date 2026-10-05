import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const repository=resolve(process.argv[2]??'.');
const run='.build/runs/20261005T045500Z-reference-core-command-reframe-04';
const stage=`${run}/publish`,candidate='audits/functional-laptop/reviews/reference-core-reframe/english-candidate-01';
const {canonicalReviewPrompt}=await import(resolve(repository,'.agents/skills/author-llm-course-english/scripts/english-review.mjs'));
const read=path=>readFileSync(resolve(repository,stage,path));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const routePath=`${candidate}/review-routing.json`,route=JSON.parse(read(routePath));
const contexts=route.reviewers.map(reviewer=>{
  const files=Object.fromEntries(['context','prompt','bundle','schema'].map(key=>{
    const descriptor=reviewer[key],bytes=read(descriptor.path);
    if(sha(bytes)!==descriptor.sha256)throw Error('Frozen route artifact drift');
    if(key==='prompt'&&!bytes.equals(Buffer.from(canonicalReviewPrompt(reviewer.role))))throw Error('Noncanonical role prompt');
    return [key,{...descriptor,absolutePath:resolve(repository,stage,descriptor.path),bytes:bytes.length}];
  }));
  const totalBytes=Object.values(files).reduce((n,file)=>n+file.bytes,0);
  if(totalBytes>8388608)throw Error('Per-context cap exceeded');
  return {role:reviewer.role,logicalContextId:JSON.parse(read(reviewer.context.path)).contextId,files,totalBytes};
});
const newBytes=contexts.reduce((n,context)=>n+context.totalBytes,0),cumulativeBytes=54553360+newBytes;
if(cumulativeBytes>83886080)throw Error('Cumulative input cap exceeded');
const report={schemaVersion:1,candidateId:route.candidateId,scopeId:route.scopeId,routing:{path:routePath,sha256:sha(read(routePath))},contexts,newBytes,priorRoutedInputBytes:54553360,cumulativeRoutedInputBytes:cumulativeBytes,effectiveInputByteCapPerContext:8388608,effectiveCumulativeInputByteCap:83886080,inputTokenCeiling:200000,tokenUsage:'unobserved-not-estimated',limitations:'Accessible file byte accounting, not actual model token usage or complete author-input accounting. No model judgment or publication approval.'};
const output=`${candidate}/routing-preflight-measurements-01.json`;
if(existsSync(resolve(repository,stage,output)))throw Error('Immutable measurement exists');
writeFileSync(resolve(repository,stage,output),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,measurement:{path:resolve(repository,stage,output),sha256:sha(read(output))}}));
