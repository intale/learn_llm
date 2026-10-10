import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,cpSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import test from 'node:test';
import {readPracticalPublication,PRACTICAL_CURRENT_PUBLICATION_RECEIPT,CURRENT_CHAPTER_IDS} from '../check-course-boundaries.mjs';
import {LINK_AMENDMENT_ROOT,LINK_AMENDMENT_PATH,SOURCE_CHANGES,amendedSource,amendedBuilt} from '../lib/practical-link-amendment.mjs';
import {hash} from '../check-functional-step-receipt.mjs';
import {canonicalJson} from '../../.agents/skills/author-llm-course-english/scripts/english-review.mjs';
const project=resolve(import.meta.dirname,'../..');
const write=(root,path,bytes)=>{mkdirSync(dirname(resolve(root,path)),{recursive:true});writeFileSync(resolve(root,path),bytes);};
const json=(root,path)=>JSON.parse(readFileSync(resolve(root,path)));
function fixture(t){
  const root=mkdtempSync(resolve(tmpdir(),'practical-link-overlay-test-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const receipt=json(project,PRACTICAL_CURRENT_PUBLICATION_RECEIPT);
  assert.equal(receipt.schemaVersion,2,'tests require the actual current mechanical overlay, not a fabricated judgment');
  for(const [path,digest] of Object.entries(receipt.sourceHashes)){const bytes=readFileSync(resolve(project,path));assert.equal(hash(bytes),digest);write(root,path,bytes);}
  write(root,PRACTICAL_CURRENT_PUBLICATION_RECEIPT,canonicalJson(receipt));
  const audit=dirname(receipt.english.specPath);cpSync(resolve(project,audit),resolve(root,audit),{recursive:true});
  const spec=json(project,receipt.english.specPath);
  for(const key of ['reviewSchema','adjudicationSchema','receiptSchema']){const d=spec[key],bytes=readFileSync(resolve(project,d.path));assert.equal(hash(bytes),d.sha256);write(root,d.path,bytes);}
  cpSync(resolve(project,LINK_AMENDMENT_ROOT),resolve(root,LINK_AMENDMENT_ROOT),{recursive:true});
  for(const path of ['site/package.json','site/package-lock.json'])write(root,path,readFileSync(resolve(project,path)));
  for(const name of ['parse5','entities'])cpSync(resolve(project,'site/node_modules/'+name),resolve(root,'site/node_modules/'+name),{recursive:true});
  return {root,receipt,amendment:json(root,LINK_AMENDMENT_PATH)};
}
function updateReceipt(f,path,bytes){write(f.root,path,bytes);f.receipt.sourceHashes[path]=hash(bytes);write(f.root,PRACTICAL_CURRENT_PUBLICATION_RECEIPT,canonicalJson(f.receipt));}
function updateAmendment(f){const bytes=Buffer.from(canonicalJson(f.amendment));write(f.root,LINK_AMENDMENT_PATH,bytes);f.receipt.mechanicalAmendment={path:LINK_AMENDMENT_PATH,bytes:bytes.length,sha256:hash(bytes)};write(f.root,PRACTICAL_CURRENT_PUBLICATION_RECEIPT,canonicalJson(f.receipt));}
test('fixed source delta cannot add prose, labels, formulas, hrefs or revisions',()=>{
  for(const [path,changes] of Object.entries(SOURCE_CHANGES)){
    const before=readFileSync(resolve(project,LINK_AMENDMENT_ROOT+'/baseline/files/'+path));
    assert.deepEqual(amendedSource(before,path),readFileSync(resolve(project,path)));
    assert.throws(()=>amendedSource(Buffer.from(before.toString().replace(changes[0][0],changes[0][0]+' duplicate '+changes[0][0])),path),/single/);
  }
  assert.throws(()=>amendedSource(Buffer.from('value'),'site/src/content/chapters/en/03-learn-bpe-merges.mdx'),/unlisted/);
});
test('current mechanical amendment admits all four chapters and six exact routes',t=>{
  const f=fixture(t);assert.deepEqual(readPracticalPublication(f.root),f.receipt);
  assert.deepEqual(f.receipt.chapters.map(c=>c.chapterId),CURRENT_CHAPTER_IDS);
  assert.deepEqual(f.receipt.chapters.map(c=>c.contentRevision),[3,1,1,2]);
});
test('matching rewritten hashes cannot admit unapproved teaching or algorithm changes',t=>{
  const f=fixture(t),originalReceipt=structuredClone(f.receipt);
  const cases=[
    ['site/src/content/practical-chapters/en/00-course-structure.mdx',s=>s.replace('[LLM from scratch]','[Different label]')],
    ['site/src/content/practical-chapters/en/00-course-structure.mdx',s=>s+'\nNew teaching prose.\n'],
    ['site/src/content/practical-chapters/en/03-scalable-bpe-tokenizer.mdx',s=>s.replace('../../course/03-learn-bpe-merges/','../../course/05-byte-pair-encoding/')],
    ['site/src/content/practical-chapters/en/03-scalable-bpe-tokenizer.mdx',s=>s.replace('"content_revision":2','"content_revision":3')],
    ['curriculum/practical/chapters/00-course-structure.md',s=>s+'\nUnlisted requirement.\n'],
    ['site/src/content/practical-chapters/en/01-reference-core-handoff.mdx',s=>s.replace('1188','1189')],
    ['rust/crates/llm-from-scratch-practical/src/tokenizer/bpe.rs',s=>s+'\n// changed algorithm source\n'],
  ];
  for(const [path,change] of cases){const before=readFileSync(resolve(f.root,path));updateReceipt(f,path,Buffer.from(change(before.toString())));assert.throws(()=>readPracticalPublication(f.root),/non-permitted|unchanged baseline/);write(f.root,path,before);f.receipt=structuredClone(originalReceipt);write(f.root,PRACTICAL_CURRENT_PUBLICATION_RECEIPT,canonicalJson(f.receipt));}
});
test('rendered wording math roles order and unlisted href changes fail exact byte comparison',t=>{
  const f=fixture(t),path='artifacts/practical-llm-in-rust/chapters/03-scalable-bpe-tokenizer/english-html/en/practical-llm-in-rust/00-course-structure/index.html',before=readFileSync(resolve(f.root,path)),original=structuredClone(f.receipt);
  for(const change of [s=>s.replace('LLM from scratch</a>','Different label</a>'),s=>s.replace('Chapter 00 ·','Chapter zero ·'),s=>s.replace('href="../../course/"','href="../wrong/"'),s=>s.replace('<h1>','<h2>'),s=>s+'<p>Additional sentence</p>',s=>s.replace('<main ','<aside ')]){
    const bytes=Buffer.from(change(before.toString()));assert.notDeepEqual(bytes,before,'negative mutation must change actual bytes');
    updateReceipt(f,path,bytes);assert.throws(()=>readPracticalPublication(f.root),/non-permitted rendered/);write(f.root,path,before);f.receipt=structuredClone(original);write(f.root,PRACTICAL_CURRENT_PUBLICATION_RECEIPT,canonicalJson(f.receipt));
  }
  const p3=path.replace('00-course-structure','03-scalable-bpe-tokenizer'),p3before=readFileSync(resolve(f.root,p3));
  const bytes=Buffer.from(p3before.toString().replace('application/x-tex','application/x-tex-changed'));assert.notDeepEqual(bytes,p3before);updateReceipt(f,p3,bytes);assert.throws(()=>readPracticalPublication(f.root),/non-permitted rendered/);
});
test('original receipt preimages and untouched original judgment chain cannot drift',t=>{
  const f=fixture(t),baselinePath=f.amendment.baselineReceipt.path,before=readFileSync(resolve(f.root,baselinePath));
  write(f.root,baselinePath,Buffer.concat([before,Buffer.from('\n')]));assert.throws(()=>readPracticalPublication(f.root),/original receipt/);write(f.root,baselinePath,before);
  const descriptor=Object.values(f.amendment.baselineFiles)[0],original=readFileSync(resolve(f.root,descriptor.path));write(f.root,descriptor.path,Buffer.from('changed'));assert.throws(()=>readPracticalPublication(f.root),/baseline preimage/);write(f.root,descriptor.path,original);
  const review=json(f.root,f.receipt.english.reviewSealsDir+'/technical-pedagogical/receipt.json'),raw=review.rawResponse.path;write(f.root,raw,Buffer.concat([readFileSync(resolve(f.root,raw)),Buffer.from('\n')]));assert.throws(()=>readPracticalPublication(f.root));
});
test('malformed authority coverage proof report and present current head fail closed',t=>{
  const f=fixture(t),amendment=structuredClone(f.amendment),receipt=structuredClone(f.receipt);
  for(const change of [a=>a.kind='fresh-reviewed',a=>a.extra='unknown',a=>delete a.baselineFiles[Object.keys(a.baselineFiles)[0]],a=>a.renderedDelta.roleOrderIsolationUnchanged=false,a=>a.sourceDelta[Object.keys(a.sourceDelta)[0]].push(['word','changed'])]){
    f.amendment=structuredClone(amendment);change(f.amendment);updateAmendment(f);assert.throws(()=>readPracticalPublication(f.root));
  }
  f.amendment=structuredClone(amendment);f.receipt=structuredClone(receipt);updateAmendment(f);
  const reportPath=f.amendment.browserReports.root.path,report=json(f.root,reportPath);report.stats.expected=0;const bytes=Buffer.from(JSON.stringify(report));write(f.root,reportPath,bytes);f.amendment.browserReports.root={path:reportPath,bytes:bytes.length,sha256:hash(bytes)};updateAmendment(f);assert.throws(()=>readPracticalPublication(f.root),/selection/);
  write(f.root,PRACTICAL_CURRENT_PUBLICATION_RECEIPT,'not JSON\n');assert.throws(()=>readPracticalPublication(f.root));
  rmSync(resolve(f.root,PRACTICAL_CURRENT_PUBLICATION_RECEIPT));symlinkSync('missing.json',resolve(f.root,PRACTICAL_CURRENT_PUBLICATION_RECEIPT));assert.throws(()=>readPracticalPublication(f.root),/symlink/);
});
