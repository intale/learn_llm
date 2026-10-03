import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
const run=process.argv[2],audit='audits/2026-10-02-ch17-problem-first';
const sha=b=>createHash('sha256').update(b).digest('hex');
const items=[];
function preserve(source,target){
  const bytes=readFileSync(source);
  if(existsSync(target))throw Error('Archive destination already exists: '+target);
  mkdirSync(dirname(target),{recursive:true});
  writeFileSync(target,bytes,{flag:'wx'});
  if(!readFileSync(target).equals(bytes))throw Error('Archive byte drift');
  items.push({source,path:target,bytes:bytes.length,sha256:sha(bytes)});
}
for(const name of readdirSync(run).filter(x=>/\.(?:mjs|sh|ts)$/.test(x)).sort()){
  preserve(run+'/'+name,audit+'/verification/tools/run04/'+name);
}
for(const name of readdirSync(run+'/evidence').filter(x=>/\.(?:log|json)$/.test(x)).sort()){
  preserve(run+'/evidence/'+name,audit+'/verification/evidence/run04/'+name);
}
for(const name of ['author-inputs.json','preflight.md',...readdirSync(run+'/ru-author-notes').filter(x=>/^(?:context-.*\.json|meaning-lock\.md|revision-r[1-9][0-9]*\.md|cheat-sheet-correspondence\.json)$/.test(x)).sort().map(x=>'ru-author-notes/'+x)]){
  preserve(run+'/'+name,audit+'/verification/provenance/run04/'+name);
}
const index=audit+'/verification/run04/archive-index.json';
if(existsSync(index))throw Error('Archive already frozen');
writeFileSync(index,JSON.stringify({schemaVersion:1,run,items,limitations:'Byte-identical promotion of narrowly scoped tools, recorded attempts and provenance. Failed trials remain failed; this archive supplies no new semantic verdict.'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({files:items.length,index,sha256:sha(readFileSync(index))}));
