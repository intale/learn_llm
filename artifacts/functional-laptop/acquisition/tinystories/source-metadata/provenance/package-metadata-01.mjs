import {readFileSync,writeFileSync,mkdirSync,copyFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const run='/output';
const relative='artifacts/functional-laptop/acquisition/tinystories/source-metadata';
const target=join(run,'publish',relative);
const sha=b=>createHash('sha256').update(b).digest('hex');
mkdirSync(join(target,'responses'),{recursive:true});
mkdirSync(join(target,'provenance'),{recursive:true});
for(const f of readdirSync(join(run,'responses'))) copyFileSync(join(run,'responses',f),join(target,'responses',f));
for(const f of ['tinystories-card.receipt.json','cdla-sharing-1-0.receipt.json','cdla-page-text.txt'])copyFileSync(join(run,f),join(target,f));
for(const f of ['capture-metadata-01.mjs','extract-cdla-01.mjs','package-metadata-01.mjs'])copyFileSync(join(run,f),join(target,'provenance',f));
copyFileSync('/repo/scripts/lib/bounded-response.mjs',join(target,'provenance','bounded-response.mjs'));
for(const id of ['tinystories-card','cdla-sharing-1-0']){
 const receipt=JSON.parse(readFileSync(join(target,id+'.receipt.json'),'utf8'));
 if(receipt.hops.at(-1).status!==200)throw Error('source status refused');
 for(const hop of receipt.hops){const b=readFileSync(join(target,hop.body_path));if(b.length!==hop.body_bytes||sha(b)!==hop.body_sha256||hop.overflow)throw Error('body drift refused');}
}
const files=[];
function walk(dir,part=''){for(const f of readdirSync(dir,{withFileTypes:true})){const p=join(part,f.name);if(f.isDirectory())walk(join(dir,f.name),p);else{const b=readFileSync(join(dir,f.name));files.push({path:relative+'/'+p,bytes:b.length,sha256:sha(b)});}}}
walk(target);files.sort((a,b)=>Buffer.compare(Buffer.from(a.path),Buffer.from(b.path)));
const inventory={schema_version:1,step_id:'capture-functional-tinystories-source-metadata',files};
const inventoryPath=join(run,'publish','artifacts/functional-laptop/step-output-inventories/capture-functional-tinystories-source-metadata.json');
mkdirSync(join(run,'publish','artifacts/functional-laptop/step-output-inventories'),{recursive:true});
writeFileSync(inventoryPath,JSON.stringify(inventory)+'\n',{flag:'wx'});
console.log(JSON.stringify({files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),inventory_sha256:sha(readFileSync(inventoryPath))}));
