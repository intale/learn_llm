import {readFileSync,writeFileSync,mkdirSync,cpSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
const run=process.argv[2],phase=process.argv[3],locale=process.argv[4];
if(!['staged','published'].includes(phase)||!['en','ru'].includes(locale))throw Error('Invalid mode');
const revision=process.argv[5]??'r1';
if(!/^r[1-9][0-9]*$/.test(revision))throw Error('Invalid locale revision');
const audit='audits/2026-10-02-ch17-problem-first',candidate=audit+'/'+(locale==='en'?'english-r6':'ru-'+revision);
const root='/tmp/ch17-'+locale+'-'+phase+'-verification';
const read=p=>readFileSync('/repo/'+p),sha=b=>createHash('sha256').update(b).digest('hex');
const put=(p,b)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,b)};
const prefix=phase==='staged'?run+'/publish/':'';
const namespace=locale==='en'?'en':'ru-'+revision;
const report=audit+'/verification/run04/'+namespace+'-'+phase+'-verification/report.json';
const mapping=audit+'/verification/run04/'+namespace+'-'+phase+'-publication-map.json';
if(existsSync('/repo/'+report)||existsSync('/repo/'+mapping))throw Error('Verification already frozen');
mkdirSync(root+'/'+audit,{recursive:true});
cpSync('/repo/'+audit,root+'/'+audit,{recursive:true});
// The isolated verifier root carries exact current schemas, not skill prose or
// modified candidate data. The verifier rechecks their frozen bindings itself.
for(const path of [
  '.agents/skills/author-llm-course-english/references/review-record.schema.json',
  '.agents/skills/author-llm-course-english/references/adjudication-record.schema.json',
  '.agents/skills/author-llm-course-english/references/evidence-receipt.schema.json',
  '.agents/skills/localize-llm-course/references/review-record.schema.json',
])put(root+'/'+path,read(path));
mkdirSync(dirname(root+'/'+report),{recursive:true});
const facts=[];
function map(actual,logical,frozen){
  const bytes=read(actual),expected=read(frozen);
  if(!bytes.equals(expected))throw Error('Actual publication bytes differ: '+actual);
  put(root+'/'+logical,bytes);facts.push({actual,logical,frozen,sha256:sha(bytes),bytes:bytes.length});
}
const ch='17-parameter-initialization';
for(const [dir,extension,name] of [['chapters','mdx','lesson'],['cheat-sheets','json','sheet']]){
  const canonical='site/src/content/'+dir+'/'+locale+'/'+ch+'.'+extension;
  map(prefix+canonical,canonical,candidate+'/frozen/'+name+'.'+locale+'.'+extension);
}
const metadata=t=>JSON.parse(/^---\n([\s\S]*?)\n---/.exec(t)[1]);
const contractText=read(prefix+'curriculum/chapters/'+ch+'.md').toString();
if(locale==='en'){
  const match=/^---\n([\s\S]*?)\n---\n/.exec(contractText);
  const project=v=>Array.isArray(v)?v.map(project):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>k!=='ru'&&k!=='translation_notes').map(([k,x])=>[k,project(x)])):v;
  const actual='---\n'+JSON.stringify(project(metadata(contractText)),null,2)+'\n---\n'+contractText.slice(match[0].length);
  if(actual!==read(candidate+'/frozen/contract.en.md').toString())throw Error('Actual English/shared contract changed');
  put(root+'/'+candidate+'/publication/contract.en.md',actual);
  facts.push({actual:prefix+'curriculum/chapters/'+ch+'.md',projection:'English/shared metadata and unchanged body, excluding Russian/translation_notes',logical:candidate+'/publication/contract.en.md',sha256:sha(Buffer.from(actual))});
  map(candidate+'/frozen/isolated.en.html',candidate+'/publication/isolated.en.html',candidate+'/frozen/isolated.en.html');
  const oldLogical='.build/runs/20261002T142126Z-rewrite-ch17-problem-first-content-03/final-build/dist/en/course/'+ch+'/index.html';
  map(run+'/'+(phase==='staged'?'final':'published')+'-build/dist/en/course/'+ch+'/index.html',oldLogical,candidate+'/frozen/lesson.en.html');
  const {runCli}=await import('/repo/.agents/skills/author-llm-course-english/scripts/english-review.mjs');
  const code=runCli(['verify','--spec',candidate+'/review-spec.json','--bundle',candidate+'/bundle','--review-routing',candidate+'/review-routing/review-routing.json','--review-seals',candidate+'/review-seals','--adjudication-bundle',candidate+'/adjudication-bundle','--adjudication-routing',candidate+'/adjudication-routing/adjudication-routing.json','--adjudication-seals',candidate+'/adjudication-seals','--root',root,'--report',report],{parserRoot:'/workspace'});
  if(code!==0)throw Error('English verification failed');
}else{
  const fields=(v,path=[],result=[])=>{if(v&&typeof v==='object'&&!Array.isArray(v)&&typeof v.ru==='string')result.push({path:path.join('.'),value:v.ru});else if(v&&typeof v==='object')Object.entries(v).filter(([k])=>k!=='translation_notes').forEach(([k,x])=>fields(x,[...path,k],result));return result};
  const actual=JSON.stringify({localizedFields:fields(metadata(contractText))},null,2)+'\n';
  if(actual!==read(candidate+'/frozen/contract.ru.json').toString())throw Error('Actual Russian contract changed');
  put(root+'/'+candidate+'/publication/contract.ru.json',actual);
  facts.push({actual:prefix+'curriculum/chapters/'+ch+'.md',projection:'Every Russian localized field; author notes excluded',logical:candidate+'/publication/contract.ru.json',sha256:sha(Buffer.from(actual))});
  map(run+'/'+(phase==='staged'?'final':'published')+'-build/dist/ru/course/'+ch+'/index.html',run+'/final-build/dist/ru/course/'+ch+'/index.html',candidate+'/frozen/lesson.ru.html');
  const {runCli}=await import('/repo/.agents/skills/localize-llm-course/scripts/localization-review.mjs');
  const code=runCli(['verify','--spec',candidate+'/review-spec.json','--bundle',candidate+'/bundle','--bilingual-record',candidate+'/raw/bilingual.json','--target-only-record',candidate+'/raw/target-only.json','--root',root,'--report',report]);
  if(code!==0)throw Error('Russian verification failed');
}
put('/repo/'+report,readFileSync(root+'/'+report));
put('/repo/'+mapping,JSON.stringify({schemaVersion:1,phase,locale,candidate,facts,limitations:'Hash-bound actual publication adapter only; no semantic record changed, no prior run artifact overwritten, no new language verdict.'},null,2)+'\n');
console.log(JSON.stringify({locale,phase,report,sha256:sha(read(report))}));
