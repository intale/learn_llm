import {readFileSync,writeFileSync,mkdirSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const repo=resolve(process.argv[2]??'.'),require=createRequire('/workspace/site/package.json');
const {parse}=require('yaml');
const {canonicalJson}=await import(resolve(repo,'.agents/skills/author-llm-course-english/scripts/english-review.mjs'));
const state=parse(readFileSync(resolve(repo,'BUILD_STATE.yaml'),'utf8'));
const step=state.builds.flatMap(b=>b.steps??[]).find(s=>s.id==='reframe-functional-reference-core-surfaces');
if(!step)throw Error('Current owned step missing');
const output='artifacts/functional-laptop/step-output-inventories/reframe-functional-reference-core-surfaces.json';
if(existsSync(resolve(repo,output)))throw Error('Inventory already frozen');
const paths=new Set();
function walk(p){for(const entry of readdirSync(resolve(repo,p),{withFileTypes:true})){if(entry.isSymbolicLink())throw Error('Nonregular inventory entry');const f=p.replace(/\/$/,'')+'/'+entry.name;if(entry.isDirectory())walk(f);else if(entry.isFile())paths.add(f);else throw Error('Nonregular inventory entry');}}
for(const path of step.outputs){if(['BUILD_STATE.yaml','DECISIONS.md',output].includes(path))continue;if(path.endsWith('/'))walk(path);else paths.add(path);}
const sha=b=>createHash('sha256').update(b).digest('hex');
const files=[...paths].sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b))).map(path=>{const b=readFileSync(resolve(repo,path));return{path,bytes:b.length,sha256:sha(b)};});
const inventory={schema_version:1,step_id:step.id,declared_outputs_sha256:sha(Buffer.from(JSON.stringify(step.outputs))),files,inventory_root_sha256:sha(Buffer.from(files.map(f=>`${f.path}\t${f.bytes}\t${f.sha256}\n`).join('')))};
const bytes=canonicalJson(inventory);mkdirSync(dirname(resolve(repo,output)),{recursive:true});writeFileSync(resolve(repo,output),bytes,{flag:'wx'});
console.log(JSON.stringify({path:output,sha256:sha(bytes),files:files.length,bytes:Buffer.byteLength(bytes),inventoryRootSha256:inventory.inventory_root_sha256,directArtifacts:files.filter(f=>step.outputs.includes(f.path))}));
