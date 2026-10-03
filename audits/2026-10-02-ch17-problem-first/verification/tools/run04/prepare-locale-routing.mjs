import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
const root='/repo',base=process.argv[2];
if(!/^audits\/2026-10-02-ch17-problem-first\/ru-r[1-9][0-9]*$/.test(base))throw Error('Unexpected locale candidate');
const read=p=>readFileSync(resolve(root,p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const put=(p,b)=>{if(existsSync(resolve(root,p)))throw Error('Frozen routing output exists: '+p);mkdirSync(dirname(resolve(root,p)),{recursive:true});writeFileSync(resolve(root,p),b)};
const json=(p,v)=>put(p,JSON.stringify(v,null,2)+'\n');
const schema='.agents/skills/localize-llm-course/references/review-record.schema.json';
const prompts={
  bilingual:'Review every required unit in the exact frozen English/Russian bundle, including complete documents and actual isolated or grouped roles. Compare facts, actors, operations, causal links, order, conditions, scope, limitations, terminology, formulas, symbols, code, identifiers, values, links, history, optional practice, checked answers, handoff and accessibility meaning. Audit inventory grouping and coverage against the complete source/rendered documents. Contextual headings and grouped values retain their actual role; do not demand unrelated context-free repetition. Report source ambiguity as a blocking source defect rather than repairing it. Return concrete findings and a verdict only; do not edit the candidate. A clean pass is valid. Read only your context manifest, this exact prompt, your bilingual bundle and the record schema; do not inspect sibling records, author notes, prior findings, repository instructions, statuses or other files. Compute exact input-file hashes from those routed bytes for the required record fields. Return one schema-valid JSON object to the response destination, with no Markdown or commentary and one final LF. coveredSurfaceIds must contain every supplied ID exactly once in UTF-8 byte order. Record your actual inherited model/reasoning, context ID and truthful timestamps. Preserve your authored response bytes; no host reserialization or repair.',
  'target-only':'Прочитайте замороженный русский кандидат как самостоятельный технический учебный текст, не обращаясь к другому языку и не разыскивая оригинал. Оцените связность, естественный синтаксис и порядок изложения, технический регистр, уместность терминов, явно названные объекты, исполнителей и условия, причинные связи, переходы, грамматику и пунктуацию. Проверьте полные документы и каждую изолированную или связанную единицу в её реальной учебной или доступной роли. Контекстные заголовки не обязаны повторять тему всей страницы; самостоятельная подпись должна сохранять необходимые референты без опоры на соседний текст, цвет или положение. Проверьте полноту инвентаря по полным документам. Верните конкретные замечания и итоговый вердикт; не редактируйте кандидат. Чистый результат pass допустим. Читайте только манифест своего контекста, этот точный запрос, свой target-only bundle и схему записи; не открывайте другой язык, соседние записи, авторские заметки, прежние замечания, инструкции репозитория, статусы или иные файлы. Вычислите точные хеши прочитанных файлов для обязательных полей записи. Запишите один допустимый по схеме JSON-объект в указанный выходной файл, без Markdown и комментариев, с одним завершающим LF. coveredSurfaceIds должен содержать все предоставленные ID ровно по одному в порядке байтов UTF-8. Укажите реальные унаследованные модель и настройки reasoning, ID свежего контекста и достоверное время. Не изменяйте авторские байты ответа внешним преобразованием.'
};
const routes={schemaVersion:1,candidate:base,roles:{}};
const revision=base.split('/').at(-1).replace('ru-','');
for(const role of ['bilingual','target-only']){
  const bundlePath=base+'/bundle/'+role+'/review-bundle.json';
  const bundle=JSON.parse(read(bundlePath));
  if(bundle.role!==role||bundle.targetLocale!=='ru')throw Error('Wrong role/locale');
  const id='ch17_v5_ru_'+revision+'_'+role.replaceAll('-','_');
  const contextPath=base+'/contexts/'+role+'.json',promptPath=base+'/prompts/'+role+'.txt';
  const context={schemaVersion:1,contextId:id,role,freshContext:true,model:bundle.requiredReviewer.model,reasoning:bundle.requiredReviewer.reasoning,createdAt:new Date().toISOString(),accessBoundary:[contextPath,promptPath,bundlePath,schema]};
  json(contextPath,context);put(promptPath,prompts[role]+'\n');
  const artifacts=Object.fromEntries([contextPath,promptPath,bundlePath,schema].map(p=>[p,{sha256:hash(read(p)),bytes:read(p).length}]));
  routes.roles[role]={contextId:id,contextPath,promptPath,bundlePath,schemaPath:schema,responsePath:base+'/raw/'+role+'.json',artifacts};
}
json(base+'/routing.json',routes);
console.log(JSON.stringify({status:'locale-routing-frozen',roles:Object.keys(routes.roles)}));
