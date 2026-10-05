import {readFileSync,writeFileSync,mkdirSync,copyFileSync,cpSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const repo=resolve(process.argv[2]??'.'),run='.build/runs/20261005T045500Z-reference-core-command-reframe-04',stage=resolve(repo,run,'publish');
const artifact='artifacts/functional-laptop/reframes/reference-core/20261005T045500Z-04',audit='audits/functional-laptop/reviews/reference-core-reframe';
const preflight=JSON.parse(readFileSync(resolve(repo,run,'preflight/product-inputs-01.json')));
const sha=b=>createHash('sha256').update(b).digest('hex');
const copy=(from,to)=>{mkdirSync(dirname(to),{recursive:true});copyFileSync(from,to);if(sha(readFileSync(from))!==sha(readFileSync(to)))throw Error('Publication copy drift');};
if(existsSync(resolve(repo,audit))||existsSync(resolve(repo,artifact)))throw Error('Publication roots must be fresh');
// Preserve all frozen role artifacts unchanged; no path or semantic rewriting.
cpSync(resolve(stage,audit),resolve(repo,audit),{recursive:true,errorOnExist:true,force:false});
mkdirSync(resolve(repo,artifact),{recursive:true});
for(const path of ['operations'])cpSync(resolve(stage,artifact,path),resolve(repo,artifact,path),{recursive:true,errorOnExist:true,force:false});
// Keep the exact complete documents required by publication bindings durable;
// the full169-file build export remains immutable in run staging.
const en=JSON.parse(readFileSync(resolve(stage,audit,'english-candidate-01/spec.json'))),ru=JSON.parse(readFileSync(resolve(stage,audit,'ru-candidate-01/spec.json')));
const documents=new Set([...en.builtDocuments.map(x=>x.publicationPath),...ru.surfaces.map(x=>x.publicationPath)].filter(p=>p?.startsWith(artifact+'/build-01/')));
for(const path of documents)copy(resolve(stage,path),resolve(repo,path));
for(const path of ['machinery','authoring','preflight'])cpSync(resolve(repo,run,path),resolve(repo,artifact,'provenance',path),{recursive:true,errorOnExist:true,force:false});
for(const item of preflight.records)copy(resolve(stage,item.canonicalPath),resolve(repo,item.canonicalPath));
const receipt={schemaVersion:1,runId:run.split('/').at(-1),productFiles:preflight.records.map(r=>({path:r.canonicalPath,sha256:sha(readFileSync(resolve(repo,r.canonicalPath)))})),durableBuildDocuments:[...documents].sort(),completeBuildFilesRetainedInStaging:169,publicationRoots:[audit,artifact],limitations:'Exact byte publication only; unchanged proof reuse is separate. Frozen semantic records and historical failed runs unchanged.'};
writeFileSync(resolve(repo,artifact,'operations/publication-01.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({productFiles:receipt.productFiles.length,durableBuildDocuments:documents.size,roots:receipt.publicationRoots}));
