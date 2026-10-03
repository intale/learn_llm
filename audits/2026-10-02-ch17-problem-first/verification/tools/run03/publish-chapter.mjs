import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';

const root='/repo',run=process.argv[2],mode=process.argv[3];
if(!['manifest','publish'].includes(mode))throw Error('Invalid publication mode');
const audit='audits/2026-10-02-ch17-problem-first';
const allowed=[
  'curriculum/chapters/17-parameter-initialization.md',
  'site/src/content/chapters/en/17-parameter-initialization.mdx',
  'site/src/content/chapters/ru/17-parameter-initialization.mdx',
  'site/src/content/cheat-sheets/en/17-parameter-initialization.json',
  'site/src/content/cheat-sheets/ru/17-parameter-initialization.json',
  'curriculum/course-plan.md',
  'site/tests/17-parameter-initialization-diagram.test.ts',
  'site/tests/e2e/ch17-parameter-initialization.spec.ts',
];
const assertScope=records=>{
  if(!Array.isArray(records)||records.length!==allowed.length||new Set(records.map(r=>r.path)).size!==allowed.length||records.some(r=>!allowed.includes(r.path)))throw Error('Publication output scope drift');
  for(const record of records)if(record.stagedPath!==run+'/publish/'+record.path)throw Error('Staging ownership drift');
};
const read=p=>readFileSync(resolve(root,p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const put=(p,b)=>{mkdirSync(dirname(resolve(root,p)),{recursive:true});writeFileSync(resolve(root,p),b,{flag:'wx'})};
const path=audit+'/verification/publication-manifest.json';
if(mode==='manifest'){
  const baseline=JSON.parse(read(audit+'/baseline/inventory.json'));
  const records=baseline.map(record=>{
    const stagedPath=run+'/publish/'+record.path;
    return {path:record.path,stagedPath,baselineSha256:record.sha256,sha256:sha(read(stagedPath))};
  });
  assertScope(records);
  put(path,JSON.stringify({schemaVersion:1,records},null,2)+'\n');
  process.stdout.write(JSON.stringify({count:records.length,manifest:path,sha256:sha(read(path))})+'\n');
}else{
  const records=JSON.parse(read(path)).records;
  assertScope(records);
  // Check the complete set before the first canonical replacement. Refuse user
  // changes, symlinks, staging drift or pre-existing temporary destinations.
  for(const record of records){
    if(!lstatSync(resolve(root,record.path)).isFile())throw Error('Not a regular canonical file: '+record.path);
    if(sha(read(record.path))!==record.baselineSha256)throw Error('Canonical baseline changed: '+record.path);
    if(sha(read(record.stagedPath))!==record.sha256)throw Error('Staging drift: '+record.path);
    if(existsSync(resolve(root,record.path+'.ch17-rewrite-stage')))throw Error('Temporary destination exists');
  }
  for(const record of records){
    const temporary=record.path+'.ch17-rewrite-stage';
    put(temporary,read(record.stagedPath));
    renameSync(resolve(root,temporary),resolve(root,record.path));
  }
  for(const record of records)if(sha(read(record.path))!==record.sha256)throw Error('Publication drift: '+record.path);
  put(audit+'/verification/publication.json',JSON.stringify({schemaVersion:1,manifestSha256:sha(read(path)),records:records.map(({path,sha256})=>({path,sha256})),result:'exact-byte-publication'},null,2)+'\n');
  process.stdout.write(JSON.stringify({count:records.length,result:'exact-byte-publication'})+'\n');
}
