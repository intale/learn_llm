// Exact mechanical publication overlay; original judgments remain original-only.
import {mkdtempSync,mkdirSync,writeFileSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {readRegularFile,jsonFile,closed,hash} from '../check-functional-step-receipt.mjs';
import {loadParse5,canonicalJson} from '../../.agents/skills/author-llm-course-english/scripts/english-review.mjs';

export const LINK_AMENDMENT_ROOT='artifacts/practical-llm-in-rust/chapters/03-scalable-bpe-tokenizer/link-amendments/20261010T072100Z-01';
export const LINK_AMENDMENT_PATH=LINK_AMENDMENT_ROOT+'/amendment.json';
export const ORIGINAL_RECEIPT_SHA256='4acdeebfcb0f4f84effeb7d6bef558f5273f0d71b7b6748e7af777e460e07030';
export const ORIGINAL_CANDIDATE='practical.ch03.en.20261009.02';
export const LINK_CASES=Object.freeze([
  {chapter:'00-course-structure',label:'LLM from scratch',oldHref:'/en/course/',href:'../../course/',target:'en/course/'},
  {chapter:'00-course-structure',label:'Chapter 39',oldHref:'/en/course/39-end-to-end-llm/',href:'../../course/39-end-to-end-llm/',target:'en/course/39-end-to-end-llm/'},
  {chapter:'00-course-structure',label:'practical course index',oldHref:'/en/practical-llm-in-rust/',href:'../',target:'en/practical-llm-in-rust/'},
  {chapter:'03-scalable-bpe-tokenizer',label:'Chapter 3',oldHref:'/en/course/03-learn-bpe-merges/',href:'../../course/03-learn-bpe-merges/',target:'en/course/03-learn-bpe-merges/'},
  {chapter:'03-scalable-bpe-tokenizer',label:'Chapter 4',oldHref:'/en/course/04-apply-bpe-tokenizer/',href:'../../course/04-apply-bpe-tokenizer/',target:'en/course/04-apply-bpe-tokenizer/'},
]);
const P0='00-course-structure',P3='03-scalable-bpe-tokenizer';
export const SOURCE_CHANGES=Object.freeze({
  ['site/src/content/practical-chapters/en/'+P0+'.mdx']:[['"content_revision": 2','"content_revision": 3'],...LINK_CASES.filter(c=>c.chapter===P0).map(c=>['['+c.label+']('+c.oldHref+')','['+c.label+']('+c.href+')'])],
  ['site/src/content/practical-chapters/en/'+P3+'.mdx']:[['"content_revision":1','"content_revision":2'],...LINK_CASES.filter(c=>c.chapter===P3).map(c=>['['+c.label+']('+c.oldHref+')','['+c.label+']('+c.href+')'])],
  ['curriculum/practical/chapters/'+P0+'.md']:[['"content_revision": 2','"content_revision": 3']],
  ['curriculum/practical/chapters/'+P3+'.md']:[['"content_revision": 1','"content_revision": 2']],
  ['site/src/i18n/practical-catalogs/en/'+P3+'.json']:[['"contentRevision": 1','"contentRevision": 2']],
});
export const OPERATIONAL_CHANGES=Object.freeze(['scripts/check-course-boundaries.mjs','scripts/tests/course-boundaries.test.mjs','scripts/README.md']);
export const ADDED_BINDINGS=Object.freeze(['scripts/lib/practical-link-amendment.mjs','scripts/tests/practical-link-amendment.test.mjs','site/tests/e2e/practical-links.spec.ts','site/playwright.config.ts','AGENTS.md','SKILLS.md','.agents/skills/author-llm-course-english/SKILL.md']);
const BUILT_PREFIX='artifacts/practical-llm-in-rust/chapters/03-scalable-bpe-tokenizer/english-html';
export const ROUTES=Object.freeze(['/en/','/en/practical-llm-in-rust/',...['00-course-structure','01-reference-core-handoff','02-corpus-preparation','03-scalable-bpe-tokenizer'].map(c=>'/en/practical-llm-in-rust/'+c+'/')]);
const changedBuilt=ROUTES.filter(r=>r==='/en/practical-llm-in-rust/'||r.includes(P0)||r.includes(P3)).map(r=>BUILT_PREFIX+r+'index.html');
export const BASELINE_CHANGED_PATHS=Object.freeze([...Object.keys(SOURCE_CHANGES),...OPERATIONAL_CHANGES,...changedBuilt].sort());
function replaceOnce(text,before,after,label){
  const index=text.indexOf(before);
  if(index<0||text.indexOf(before,index+before.length)>=0)throw new Error('exact single amendment token required: '+label);
  return text.slice(0,index)+after+text.slice(index+before.length);
}
export function amendedSource(bytes,path){
  const changes=SOURCE_CHANGES[path];if(!changes)throw new Error('unlisted source amendment');
  let text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  for(const [before,after] of changes)text=replaceOnce(text,before,after,path);
  return Buffer.from(text);
}
export function amendedBuilt(bytes,route){
  let text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  for(const c of LINK_CASES.filter(c=>route==='/en/practical-llm-in-rust/'+c.chapter+'/'))
    text=replaceOnce(text,'<a href="'+c.oldHref+'">'+c.label+'</a>','<a href="'+c.href+'">'+c.label+'</a>',route+' '+c.label);
  if(route.includes(P0))text=replaceOnce(text,'Chapter 00 · Content revision 2 </p>','Chapter 00 · Content revision 3 </p>',route);
  if(route.includes(P3))text=replaceOnce(text,'Chapter 03 · Content revision 1 </p>','Chapter 03 · Content revision 2 </p>',route);
  if(route==='/en/practical-llm-in-rust/'){
    text=replaceOnce(text,'>Content revision: 2</small>','>Content revision: 3</small>',route+' P0');
    const before='inspect a chapter-local GPT-2 segmentation example.</p> <small data-astro-cid-3tyg3jur>Content revision: 1</small>';
    text=replaceOnce(text,before,before.replace('revision: 1','revision: 2'),route+' P3');
  }
  return Buffer.from(text);
}
export function boundFile(root,descriptor,label){
  closed(descriptor,['path','bytes','sha256'],label);
  const bytes=readRegularFile(root,descriptor.path);
  if(!Number.isSafeInteger(descriptor.bytes)||descriptor.bytes!==bytes.length||!/^[0-9a-f]{64}$/.test(descriptor.sha256)||hash(bytes)!==descriptor.sha256)throw new Error(label+' byte/hash drift');
  return bytes;
}
function equalKeys(value,keys,label){closed(value,keys,label);}
function same(actual,expected,label){if(canonicalJson(actual)!==canonicalJson(expected))throw new Error(label+' drift');}
function nodes(node,out=[]){out.push(node);for(const c of node.childNodes??[])nodes(c,out);return out;}
function accessibleText(node){return (node.nodeName==='#text'?node.value:(node.childNodes??[]).map(accessibleText).join('')).trim();}
function checkReport(report,base){
  if(report.errors?.length||report.config?.projects?.length!==1||report.config.projects[0].name!=='firefox'||report.stats?.expected!==10||report.stats.skipped!==0||report.stats.unexpected!==0||report.stats.flaky!==0)throw new Error('navigation report selection/project/status drift');
  const specs=[];const walk=s=>{specs.push(...(s.specs??[]));for(const c of s.suites??[])walk(c);};walk(report);
  if(specs.length!==10)throw new Error('navigation report test count');
  const observations=[];
  for(const spec of specs){
    if(!spec.ok||spec.tests?.length!==1)throw new Error('navigation report spec failed');
    const test=spec.tests[0],result=test.results?.[0];
    if(test.projectName!=='firefox'||test.status!=='expected'||test.results?.length!==1||result.status!=='passed'||result.errors?.length)throw new Error('navigation report result failed');
    const a=test.annotations?.filter(a=>a.type==='navigation-observation');
    if(a?.length!==1)throw new Error('missing actual navigation observation');
    const o=JSON.parse(a[0].description),c=LINK_CASES.find(c=>c.chapter===o.chapter&&c.label===o.label);
    if(!c||o.href!==c.href||![1364,390].includes(o.viewport?.width)||o.viewport.height!==(o.viewport.width===1364?900:844)||new URL(o.sourceUrl).pathname!==base+'en/practical-llm-in-rust/'+c.chapter+'/'||new URL(o.resolvedUrl).pathname!==base+c.target||o.resolvedUrl!==new URL(o.href,o.sourceUrl).href||o.observedDestinationUrl!==o.resolvedUrl)throw new Error('actual navigation destination drift');
    observations.push(o);
  }
  if(new Set(observations.map(o=>o.chapter+'|'+o.label+'|'+o.viewport.width)).size!==10)throw new Error('duplicate/missing navigation observation');
  return observations;
}
export function verifyPracticalLinkAmendment(root,receipt,{verifyBaseline,parserRoot=root}){
  boundFile(root,receipt.mechanicalAmendment,'mechanical amendment');
  if(receipt.mechanicalAmendment.path!==LINK_AMENDMENT_PATH)throw new Error('foreign mechanical amendment');
  const amendment=jsonFile(root,LINK_AMENDMENT_PATH,65536,true);
  closed(amendment,['schemaVersion','kind','authority','originalCandidateId','baselineReceipt','baselineFiles','navigationEvidence','browserReports','projectBuilt','sourceDelta','renderedDelta'],'link amendment');
  if(amendment.schemaVersion!==1||amendment.kind!=='link-only'||amendment.authority!=='user-authorized-link-only-exception'||amendment.originalCandidateId!==ORIGINAL_CANDIDATE)throw new Error('link-only authority/baseline identity');
  same(amendment.sourceDelta,SOURCE_CHANGES,'permitted source delta');
  same(amendment.renderedDelta,{hrefChanges:5,revisionDigits:4,completeRoutes:6,readingUnits:354,roleOrderIsolationUnchanged:true},'permitted rendered delta');
  const baselineBytes=boundFile(root,amendment.baselineReceipt,'original receipt');
  if(amendment.baselineReceipt.path!==LINK_AMENDMENT_ROOT+'/baseline/publication-receipt.json'||hash(baselineBytes)!==ORIGINAL_RECEIPT_SHA256)throw new Error('original receipt identity drift');
  const baseline=JSON.parse(baselineBytes);
  if(baseline.schemaVersion!==1||JSON.stringify(baseline.english)!==JSON.stringify(receipt.english))throw new Error('original English chain relabeling');
  same(receipt.chapters.map(c=>c.contentRevision),[3,1,1,2],'current amendment revisions');
  equalKeys(amendment.baselineFiles,BASELINE_CHANGED_PATHS,'exact baseline preimages');
  equalKeys(receipt.sourceHashes,[...Object.keys(baseline.sourceHashes),...ADDED_BINDINGS],'current binding coverage');
  for(const [path,digest] of Object.entries(receipt.sourceHashes))if(!/^[0-9a-f]{64}$/.test(digest)||hash(readRegularFile(root,path))!==digest)throw new Error('publication source drift: '+path);
  const spec=jsonFile(root,baseline.english.specPath),originals=new Map();
  for(const [path,digest] of Object.entries(baseline.sourceHashes)){
    const bytes=Object.hasOwn(amendment.baselineFiles,path)?boundFile(root,amendment.baselineFiles[path],'baseline preimage '+path):readRegularFile(root,path);
    if(hash(bytes)!==digest)throw new Error('unchanged baseline source drift: '+path);
    originals.set(path,bytes);
    if(Object.hasOwn(SOURCE_CHANGES,path)&&!amendedSource(bytes,path).equals(readRegularFile(root,path)))throw new Error('non-permitted teaching source delta: '+path);
  }
  for(const route of ROUTES){
    const docs=spec.builtDocuments?.filter(d=>d.route===route);
    if(docs?.length!==1||docs[0].publicationPath!==BUILT_PREFIX+route+'index.html')throw new Error('original complete route coverage');
    const doc=docs[0],before=readRegularFile(root,doc.file.path),current=readRegularFile(root,doc.publicationPath);
    if(hash(before)!==doc.file.sha256||!amendedBuilt(before,route).equals(current))throw new Error('non-permitted rendered byte delta: '+route);
  }
  const audit=dirname(baseline.english.specPath),temporary=mkdtempSync(resolve(tmpdir(),'practical-reviewed-baseline-'));
  try{
    cpSync(resolve(root,audit),resolve(temporary,audit),{recursive:true});
    for(const key of ['reviewSchema','adjudicationSchema','receiptSchema']){const file=spec[key],bytes=readRegularFile(root,file.path);if(hash(bytes)!==file.sha256)throw new Error('original schema drift');mkdirSync(dirname(resolve(temporary,file.path)),{recursive:true});writeFileSync(resolve(temporary,file.path),bytes);}
    for(const [path,bytes] of originals){mkdirSync(dirname(resolve(temporary,path)),{recursive:true});writeFileSync(resolve(temporary,path),bytes);}
    for(const doc of [...spec.sourceDocuments,...spec.builtDocuments]){const bytes=readRegularFile(root,doc.file.path);if(hash(bytes)!==doc.file.sha256)throw new Error('original frozen publication drift');mkdirSync(dirname(resolve(temporary,doc.publicationPath)),{recursive:true});writeFileSync(resolve(temporary,doc.publicationPath),bytes);}
    const receiptPath='artifacts/practical-llm-in-rust/chapters/03-scalable-bpe-tokenizer/publication-receipt.json';mkdirSync(dirname(resolve(temporary,receiptPath)),{recursive:true});writeFileSync(resolve(temporary,receiptPath),baselineBytes);
    verifyBaseline(temporary,{parserRoot});
  }finally{rmSync(temporary,{recursive:true,force:true});}
  const evidenceBytes=boundFile(root,amendment.navigationEvidence,'navigation evidence'),evidence=JSON.parse(evidenceBytes);
  equalKeys(amendment.browserReports,['root','project'],'browser report coverage');
  equalKeys(amendment.projectBuilt,ROUTES,'project complete route coverage');
  const parser=loadParse5(parserRoot);
  for(const [name,base,siteUrl] of [['root','/','https://intale.github.io/learn_llm/'],['project','/learn_llm/','https://intale.github.io/learn_llm']]){
    const report=JSON.parse(boundFile(root,amendment.browserReports[name],'Firefox report '+name)),observed=checkReport(report,base);
    const execution=evidence.executionBindings?.find(e=>e.siteBase===base);
    if(!execution||execution.siteUrl!==siteUrl||execution.exitStatus!==0||execution.selected!==10||execution.passed!==10||execution.network!=='none'||execution.screenshots!==false||execution.report.sha256!==amendment.browserReports[name].sha256||execution.testSource.sha256!==receipt.sourceHashes['site/tests/e2e/practical-links.spec.ts']||execution.playwrightConfig.sha256!==receipt.sourceHashes['site/playwright.config.ts'])throw new Error('navigation execution binding drift');
    const recorded=evidence.browserObservations?.filter(o=>o.siteBase===base);
    if(recorded?.length!==10||recorded.some((o,i)=>canonicalJson(observed[i])!==canonicalJson(Object.fromEntries(Object.entries(o).filter(([k])=>!['browserProject','javascriptEnabled','siteBase','siteUrl'].includes(k))))||o.browserProject!=='firefox'||o.javascriptEnabled!==true))throw new Error('navigation report/observation mismatch');
    for(const route of ROUTES){
      const html=name==='root'?readRegularFile(root,BUILT_PREFIX+route+'index.html'):boundFile(root,amendment.projectBuilt[route],'project production HTML');
      for(const c of LINK_CASES.filter(c=>route==='/en/practical-llm-in-rust/'+c.chapter+'/')){
        const anchors=nodes(parser.parse(html.toString('utf8'))).filter(n=>n.tagName==='a'&&accessibleText(n)===c.label),href=anchors[0]?.attrs?.find(a=>a.name==='href')?.value;
        if(anchors.length!==1||href!==c.href||new URL(href,'https://intale.github.io'+base+route.slice(1)).pathname!==base+c.target)throw new Error('static actual navigation destination drift');
        const rows=evidence.observations?.filter(o=>o.siteBase===base&&o.chapter===c.chapter&&o.label===c.label);
        if(rows?.length!==1||rows[0].builtSha256!==hash(html)||rows[0].href!==href||rows[0].observedDestinationPath!==base+c.target)throw new Error('static observation/publication drift');
      }
    }
  }
  if(evidence.observations?.length!==10||evidence.browserObservations?.length!==20||evidence.executionBindings?.length!==2)throw new Error('navigation evidence coverage');
  return amendment;
}
