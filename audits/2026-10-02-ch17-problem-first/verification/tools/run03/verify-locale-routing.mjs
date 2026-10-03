import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';

const root=process.argv[3]??'/repo';
const base='audits/2026-10-02-ch17-problem-first/ru-r1';
const phase=process.argv[2];
if(!['staged','published'].includes(phase))throw Error('Unknown verification phase');
const read=p=>readFileSync(resolve(root,p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const routing=JSON.parse(read(base+'/routing.json'));
if(routing.candidate!==base)throw Error('Candidate identity differs');
const author=JSON.parse(read(base+'/frozen/author-context.json'));
const identities=new Set([author.contextId]);
const roles={};
for(const role of ['bilingual','target-only']){
  const route=routing.roles[role];
  for(const [path,identity] of Object.entries(route.artifacts)){
    const bytes=read(path);
    if(bytes.length!==identity.bytes||hash(bytes)!==identity.sha256)throw Error('Routed input drift: '+path);
  }
  const context=JSON.parse(read(route.contextPath));
  const bytes=read(route.responsePath);
  if(bytes.at(-1)!==10||bytes.at(-2)===10)throw Error('Raw response terminator differs');
  const record=JSON.parse(bytes);
  if(record.role!==role||record.reviewer.contextId!==route.contextId||context.contextId!==route.contextId)throw Error('Role/context mismatch');
  if(identities.has(route.contextId))throw Error('Context reused');
  identities.add(route.contextId);
  if(record.reviewer.contextSha256!==hash(read(route.contextPath))||record.reviewer.promptSha256!==hash(read(route.promptPath))||record.bundleSha256!==hash(read(route.bundlePath)))throw Error('Record is not bound to actual routed input bytes');
  if(record.reviewer.model!==context.model||record.reviewer.reasoning!==context.reasoning||context.model!==author.model||context.reasoning!==author.reasoning||record.reviewer.freshContext!==true)throw Error('Selection/freshness differs');
  if(record.verdict!=='pass')throw Error('Language verdict is not passing');
  roles[role]={contextId:route.contextId,recordSha256:hash(bytes),recordBytes:bytes.length,contextSha256:hash(read(route.contextPath)),promptSha256:hash(read(route.promptPath)),bundleSha256:hash(read(route.bundlePath))};
}
const output=base+'/'+phase+'-verification/routing-report.json';
if(existsSync(resolve(root,output)))throw Error('Verification report already frozen');
mkdirSync(dirname(resolve(root,output)),{recursive:true});
writeFileSync(resolve(root,output),JSON.stringify({schemaVersion:1,status:'exact-route-verified',phase,roles,limitations:'Checks bytes, routing and context/model identity only; language quality comes from independent judgments.'},null,2)+'\n');
process.stdout.write(JSON.stringify({status:'exact-route-verified',phase,contexts:identities.size})+'\n');
