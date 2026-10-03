import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {extractAccessibleText} from '/repo/.agents/skills/author-llm-course-english/scripts/english-review.mjs';
import {alignLocalizedSheet} from './align-localized-sheet.mjs';
const require=createRequire('/workspace/site/package.json');
const {parse}=require('parse5');
const root='/repo',run=process.argv[2],ch='17-parameter-initialization';
const approved=process.argv[3];
if(!/^r[1-9][0-9]*$/.test(approved))throw Error('Invalid approved English identity');
const en='audits/2026-10-02-ch17-problem-first/english-'+approved;
const revision=process.argv[4]??'r1';
if(!/^r[1-9][0-9]*$/.test(revision))throw Error('Invalid locale revision');
const base='audits/2026-10-02-ch17-problem-first/ru-'+revision;
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>readFileSync(resolve(root,p));
const put=(p,b)=>{mkdirSync(dirname(resolve(root,p)),{recursive:true});writeFileSync(resolve(root,p),b)};
const json=(p,v)=>put(p,JSON.stringify(v,null,2)+'\n');
const desc=p=>({path:p,sha256:sha(read(p))});
const englishGate=JSON.parse(read(en+'/staged-verification/report.json'));
if(englishGate.status!=='adjudication-verified'||englishGate.candidateId!=='ch17.en.r5.20261002.'+approved)throw Error('Approved English verification is required');
if(existsSync(resolve(root,base+'/review-spec.json')))throw Error('Frozen localization candidate exists');
for(const [path,name] of [['site/src/content/chapters/en/'+ch+'.mdx','lesson.en.mdx'],['site/src/content/cheat-sheets/en/'+ch+'.json','sheet.en.json']]){
  if(!read(run+'/publish/'+path).equals(read(en+'/frozen/'+name)))throw Error('Approved English source drift: '+path);
}
const contractRaw=read(run+'/publish/curriculum/chapters/'+ch+'.md').toString();
const contractMatch=/^---\n([\s\S]*?)\n---\n/.exec(contractRaw);
if(!contractMatch)throw Error('Missing staged contract frontmatter');
const project=v=>Array.isArray(v)?v.map(project):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>k!=='ru'&&k!=='translation_notes').map(([k,x])=>[k,project(x)])):v;
const englishProjection='---\n'+JSON.stringify(project(JSON.parse(contractMatch[1])),null,2)+'\n---\n'+contractRaw.slice(contractMatch[0].length);
if(englishProjection!==read(en+'/frozen/contract.en.md').toString())throw Error('Approved English/shared contract drift');
const freeze=(p,name)=>{const q=base+'/frozen/'+name;put(q,read(p));return desc(q)};
// Reuse the exact role-based extractor used for the reviewed English candidate.
// Only the locale, build source and extraction-evidence destination vary.
const extractor=read(run+'/prepare-english.mjs').toString();
const beginning=extractor.indexOf('const attrs=n=>');
const ending=extractor.indexOf('const escape=t=>');
if(beginning<0||ending<beginning)throw Error('Extractor boundary changed');
const extractionCode=extractor.slice(beginning,ending)
  .replace("run+'/english-build/dist/en/course/'","run+'/final-build/dist/'+locale+'/course/'")
  .replace("run+'/'+buildDirectory+'/dist/en/course/'","run+'/final-build/dist/'+locale+'/course/'")
  .replace("'/en/course/'+ch+'/'","'/'+locale+'/course/'+ch+'/'");
const extract=new Function('parse','read','put','desc','existsSync','resolve','root','run','base','html','extractAccessibleText','locale','ch',
  'const dom=parse(read(html.path).toString());\n'+extractionCode+'\nreturn units;');
const expected=JSON.parse(read(en+'/evidence/extraction-provenance.json')).units;
const unitsByLocale={};
for(const locale of ['en','ru']){
  const html=freeze(run+'/final-build/dist/'+locale+'/course/'+ch+'/index.html','lesson.'+locale+'.html');
  let units=extract(parse,read,put,desc,existsSync,resolve,root,run,base+'/extraction/'+locale,html,extractAccessibleText,locale,ch);
  if(units.length!==expected.length)throw Error('Role inventory count changed');
  units.forEach((u,i)=>{
    if(u.id!==expected[i].id||u.kind!==expected[i].kind)throw Error('Role inventory identity changed');
    if(locale==='en'&&u.value!==expected[i].value)throw Error('Approved English extraction drift');
  });
  const renderedUnits=units;
  if(locale==='ru'){
    const correspondence=freeze(run+'/ru-author-notes/cheat-sheet-correspondence.json','cheat-sheet-correspondence.json');
    const result=alignLocalizedSheet(unitsByLocale.en,units,
      JSON.parse(read(run+'/publish/site/src/content/cheat-sheets/en/'+ch+'.json')),
      JSON.parse(read(run+'/publish/site/src/content/cheat-sheets/ru/'+ch+'.json')),
      JSON.parse(read(correspondence.path)));
    units=result.units;
    json(base+'/extraction/ru/sheet-correspondence-provenance.json',{schemaVersion:1,correspondence,ledger:result.ledger,limits:'Explicit author-owned semantic pairs, exact rendered values and original DOM paths/order. Deterministic checks do not certify translation semantics.'});
  }
  unitsByLocale[locale]=units;
  json(base+'/extraction/'+locale+'/provenance.json',{schemaVersion:1,html,units,renderedUnitsBeforeAlignment:renderedUnits});
}
if(sha(read(base+'/frozen/lesson.en.html'))!==sha(read(en+'/frozen/lesson.en.html')))throw Error('Approved English HTML drift');
const surfaces=[];
function pair(id,kind,source,target,publicationPath){
  surfaces.push({id,kind,order:surfaces.length+1,localization:'translate',source:desc(source),target:desc(target),...(publicationPath?{publicationPath}:{})});
}
freeze(en+'/frozen/lesson.en.mdx','lesson.en.mdx');
freeze(en+'/frozen/sheet.en.json','sheet.en.json');
freeze(run+'/publish/site/src/content/chapters/ru/'+ch+'.mdx','lesson.ru.mdx');
freeze(run+'/publish/site/src/content/cheat-sheets/ru/'+ch+'.json','sheet.ru.json');
pair('doc.lesson','complete-document',base+'/frozen/lesson.en.mdx',base+'/frozen/lesson.ru.mdx','site/src/content/chapters/ru/'+ch+'.mdx');
pair('doc.sheet','complete-document',base+'/frozen/sheet.en.json',base+'/frozen/sheet.ru.json','site/src/content/cheat-sheets/ru/'+ch+'.json');
pair('doc.rendered','complete-document',base+'/frozen/lesson.en.html',base+'/frozen/lesson.ru.html',run+'/final-build/dist/ru/course/'+ch+'/index.html');
const metadata=text=>JSON.parse(/^---\n([\s\S]*?)\n---/.exec(text)[1]);
const fields=(node,locale,path=[],result=[])=>{
  if(node&&typeof node==='object'&&!Array.isArray(node)&&typeof node[locale]==='string')result.push({path:path.join('.'),value:node[locale]});
  else if(node&&typeof node==='object')Object.entries(node).filter(([k])=>k!=='translation_notes').forEach(([k,v])=>fields(v,locale,[...path,k],result));
  return result;
};
const englishFields=fields(metadata(read(en+'/frozen/contract.en.md').toString()),'en');
const targetFields=fields(metadata(read(run+'/publish/curriculum/chapters/'+ch+'.md').toString()),'ru');
if(englishFields.length!==targetFields.length||englishFields.some((f,i)=>f.path!==targetFields[i].path))throw Error('Contract locale coverage drift');
json(base+'/frozen/contract.en.json',{localizedFields:englishFields});
json(base+'/frozen/contract.ru.json',{localizedFields:targetFields});
pair('doc.contract','complete-document',base+'/frozen/contract.en.json',base+'/frozen/contract.ru.json',base+'/publication/contract.ru.json');
for(let i=0;i<expected.length;i++){
  const id=expected[i].id;
  for(const locale of ['en','ru'])put(base+'/surfaces/'+locale+'/'+id+'.txt',unitsByLocale[locale][i].value+'\n');
  pair(id,expected[i].kind,base+'/surfaces/en/'+id+'.txt',base+'/surfaces/ru/'+id+'.txt');
}
const author=freeze(run+'/ru-author-notes/context-complete'+(revision==='r1'?'':'-'+revision)+'.json','author-context.json');
const facts=JSON.parse(read(author.path));
put(base+'/rubrics/bilingual.txt','Review every complete document and isolated rendered-role unit for English/Russian semantic parity, technical accuracy, mathematical and numerical identity, actors/referents, conditions, causal order, bounded history, optional practice/checked answers, and handoff. Audit inventory grouping and coverage against complete source/rendered bytes. Contextual headings and paired table/card values retain their real role; do not demand unrelated context-free repetition. Preserve problem-first explained-solution progression with no learner prediction activity. Source defects block rather than being silently repaired. A clean pass is valid; do not edit either candidate.\n');
put(base+'/rubrics/target-only.txt','Оцените полный русский учебный текст и все изолированные единицы в их реальной учебной или доступной роли: ясность причин и порядка действий, явно названные объекты и условия, связность, естественный технический русский, термины, грамматику и пунктуацию. Проверьте описание проблемы, объяснённое решение, историю, схемы, необязательную практику и проверенные ответы без задания на предсказание. Контекстный заголовок не обязан повторять тему всей страницы; связанные подписи и значения рассматриваются вместе. Самостоятельные описания должны сохранять нужные референты и ограничения. Код, идентификаторы, формулы и числовые данные являются неизменяемыми буквальными свидетельствами. Проверяйте полноту инвентаря по полным документам. Не ищите другой язык или оригинал, не редактируйте кандидат. Чистый результат pass допустим.\n');
const selected={model:facts.model,reasoning:facts.reasoning};
const spec={schemaVersion:1,candidateId:'ch17.ru.r5.20261002.'+revision,scopeId:'ch17.ru.20261002.'+revision,referenceLocale:'en',targetLocale:'ru',authorContext:{id:facts.contextId,sha256:author.sha256},requiredReviewers:{bilingual:selected,targetOnly:selected},requiredSurfaceIds:surfaces.map(s=>s.id).sort(),rubrics:{bilingual:desc(base+'/rubrics/bilingual.txt'),targetOnly:desc(base+'/rubrics/target-only.txt')},surfaces:surfaces.sort((a,b)=>Buffer.compare(Buffer.from(a.id),Buffer.from(b.id)))};
json(base+'/review-spec.json',spec);
console.log(JSON.stringify({candidateId:spec.candidateId,surfaces:surfaces.length,contractFields:englishFields.length}));
