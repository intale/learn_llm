import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,cpSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {validateCourseBoundaries,courseById,courseRouteSuffix,validateCourseChapterIdentity} from '../../lib/course-boundaries.mjs';
import {readPracticalBuildScope,validatePracticalChapterSource,PRACTICAL_PRIVATE_SCOPE,practicalPublicationChapterIds} from '../../check-course-boundaries.mjs';
import {readPracticalPublication,FOUNDATION_CHAPTER_IDS,CURRENT_CHAPTER_IDS,PRACTICAL_PUBLICATION_RECEIPT,PRACTICAL_ENGLISH_AUDIT_ROOT,PRACTICAL_CURRENT_PUBLICATION_RECEIPT,PRACTICAL_CURRENT_ENGLISH_AUDIT_ROOT} from '../../reviews/practical-publication-history.mjs';
import {canonicalJson} from '../../../scripts/reviews/english/scripts/english-review.mjs';

const project=resolve(import.meta.dirname,'../../..');
const historyRoot=process.env.COURSE_HISTORY_ROOT;
if(!historyRoot)throw new Error('COURSE_HISTORY_ROOT must select an exact MCP-exported checkpoint');
const manifest=JSON.parse(readFileSync(resolve(historyRoot,'configs/course-boundaries-v1.json')));
const config=validateCourseBoundaries(manifest,undefined,{historical:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const write=(root,path,bytes)=>{mkdirSync(dirname(resolve(root,path)),{recursive:true});writeFileSync(resolve(root,path),bytes);};
function fixture(t,chapterIds=FOUNDATION_CHAPTER_IDS){
  const root=mkdtempSync(resolve(tmpdir(),'course-boundary-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  for(const path of ['configs/course-boundaries-v1.json','site/src/i18n/locales.json'])write(root,path,readFileSync(resolve(historyRoot,path)));
  const candidates=chapterIds.map((chapterId,index)=>{
    const path='site/src/content/practical-chapters/en/'+chapterId+'.mdx';
    const contentRevision=chapterIds===CURRENT_CHAPTER_IDS && index===0?2:1;
    const source='---\n'+JSON.stringify({chapter_id:chapterId,locale:'en',order:index,chapter_kind:index===0?'orientation':'lesson',content_revision:contentRevision})+'\n---\nFixture.\n';
    write(root,path,source);
    return {chapterId,contentRevision,sourceHashes:{en:sha(source)}};
  });
  const scope={schemaVersion:1,courseId:'practical-llm-in-rust',scopeId:'fixture.foundation',candidates};
  write(root,'site/src/i18n/practical-catalogs/private-review.json',canonicalJson(scope));
  return {root,scope,save:()=>write(root,'site/src/i18n/practical-catalogs/private-review.json',canonicalJson(scope))};
}
const ENGLISH_FIELDS=['specPath','bundleDir','reviewRoutingPath','reviewSealsDir','adjudicationBundleDir','adjudicationRoutingPath','adjudicationSealsDir'];
const englishPaths=prefix=>({specPath:prefix+'/spec.json',bundleDir:prefix+'/review-bundles',reviewRoutingPath:prefix+'/review-routing/review-routing.json',reviewSealsDir:prefix+'/review-seals',adjudicationBundleDir:prefix+'/adjudication-bundles',adjudicationRoutingPath:prefix+'/adjudication-routing/adjudication-routing.json',adjudicationSealsDir:prefix+'/adjudication-seals'});
function publicationFixture(t,chapterIds=FOUNDATION_CHAPTER_IDS){
  const f=fixture(t,chapterIds);
  const current=chapterIds===CURRENT_CHAPTER_IDS;
  const receiptPath=current?PRACTICAL_CURRENT_PUBLICATION_RECEIPT:PRACTICAL_PUBLICATION_RECEIPT;
  const auditRoot=current?PRACTICAL_CURRENT_ENGLISH_AUDIT_ROOT:PRACTICAL_ENGLISH_AUDIT_ROOT;
  const receipt={schemaVersion:1,courseId:'practical-llm-in-rust',
    chapters:f.scope.candidates.map(({chapterId,contentRevision})=>({chapterId,contentRevision})),
    sourceHashes:Object.fromEntries(f.scope.candidates.map(candidate=>['site/src/content/practical-chapters/en/'+candidate.chapterId+'.mdx',candidate.sourceHashes.en])),
    english:englishPaths(auditRoot)};
  const save=()=>write(f.root,receiptPath,canonicalJson(receipt));
  save();
  return {...f,receipt,receiptPath,auditRoot,save};
}
function incompleteCurrentSpec(f){
  const sourceDocuments=f.receipt.chapters.map(({chapterId})=>{
    const path='site/src/content/practical-chapters/en/'+chapterId+'.mdx';
    return {publicationPath:path,file:{sha256:f.receipt.sourceHashes[path]}};
  });
  const routes=['/en/','/en/practical-llm-in-rust/',...CURRENT_CHAPTER_IDS.map(id=>'/en/practical-llm-in-rust/'+id+'/')];
  const builtDocuments=routes.map((route,index)=>{
    const publicationPath='artifacts/practical-llm-in-rust/chapters/03-scalable-bpe-tokenizer/fixture-html/'+index+'.html';
    const bytes='<!doctype html><title>Mechanical fixture '+index+'</title>\n';
    write(f.root,publicationPath,bytes);f.receipt.sourceHashes[publicationPath]=sha(bytes);
    return {route,publicationPath,file:{sha256:sha(bytes)}};
  });
  // Deliberately incomplete input, never a fabricated review or publication pass.
  const spec={candidateId:'practical.ch03.en.20261009.02',scopeId:'practical.ch03.en',sourceDocuments,builtDocuments};
  f.save();write(f.root,f.receipt.english.specPath,canonicalJson(spec));
  return {spec,save:()=>write(f.root,f.receipt.english.specPath,canonicalJson(spec))};
}
function sealedPublicationFixture(t,{current=false}={}){
  const root=mkdtempSync(resolve(tmpdir(),'course-sealed-boundary-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const origin=resolve((current?process.env.COURSE_BOUNDARY_CURRENT_ROOT:process.env.COURSE_BOUNDARY_FOUNDATION_ROOT)??historyRoot);
  const receiptPath=current?PRACTICAL_CURRENT_PUBLICATION_RECEIPT:PRACTICAL_PUBLICATION_RECEIPT;
  let receiptBytes=readFileSync(resolve(origin,receiptPath));
  const currentHead=JSON.parse(receiptBytes);
  let amendment;
  if(currentHead.schemaVersion===2){
    amendment=JSON.parse(readFileSync(resolve(origin,currentHead.mechanicalAmendment.path)));
    receiptBytes=readFileSync(resolve(origin,amendment.baselineReceipt.path));
  }
  if(!current)assert.equal(sha(receiptBytes),'756404dc7021af73b2f329d36c0ca026cbe48789395e222d1ecfab7dd3026ce4','foundation fixture must retain the exact accepted receipt');
  const receipt=JSON.parse(receiptBytes);
  assert.deepEqual(receipt.chapters.map(chapter=>chapter.chapterId),current?CURRENT_CHAPTER_IDS:FOUNDATION_CHAPTER_IDS);
  assert.deepEqual(receipt.chapters.map(chapter=>chapter.contentRevision),current?[2,1,1,1]:[1,1,1]);
  const auditRoot=current?PRACTICAL_CURRENT_ENGLISH_AUDIT_ROOT:PRACTICAL_ENGLISH_AUDIT_ROOT;
  assert.equal(receipt.english.specPath,auditRoot+'/spec.json');
  for(const [path,digest] of Object.entries(receipt.sourceHashes)){
    const bytes=readFileSync(resolve(origin,amendment?.baselineFiles?.[path]?.path??path));
    assert.equal(sha(bytes),digest,'immutable publication fixture drift: '+path);
    write(root,path,bytes);
  }
  write(root,receiptPath,receiptBytes);
  cpSync(resolve(origin,auditRoot),resolve(root,auditRoot),{recursive:true});
  const spec=JSON.parse(readFileSync(resolve(origin,receipt.english.specPath)));
  for(const field of ['reviewSchema','adjudicationSchema','receiptSchema']){
    const descriptor=spec[field],bytes=readFileSync(resolve(origin,descriptor.path));
    assert.equal(sha(bytes),descriptor.sha256);write(root,descriptor.path,bytes);
  }
  for(const path of ['site/src/i18n/locales.json','site/package.json','site/package-lock.json'])write(root,path,readFileSync(resolve(origin,path)));
  assert.equal(sha(readFileSync(resolve(root,'site/package-lock.json'))),sha(readFileSync(resolve(project,'site/package-lock.json'))),'fixture parser graph must match the executing locked graph');
  // Reuse the provisioned parser and its one supporting package in temporary
  // scratch; no install, parser implementation or judgment-record rewrite.
  for(const name of ['parse5','entities'])cpSync(resolve(project,'site/node_modules/'+name),resolve(root,'site/node_modules/'+name),{recursive:true});
  return {root,receipt,receiptPath,spec,save:()=>write(root,receiptPath,canonicalJson(receipt))};
}

test('renamed historical reviews and an unbound status cannot publish the new course',t=>{
  const {root}=fixture(t);
  assert.equal(readPracticalPublication(root),null);
  write(root,'artifacts/practical-llm-in-rust/foundation/publication-receipt.json',canonicalJson({schemaVersion:1,status:'complete'}));
  assert.throws(()=>readPracticalPublication(root));
});
test('publication selects only each declared foundation or current audit namespace',t=>{
  const prefixes=['audits/practical-llm-in-rust/foundation/english','audits/functional-laptop/chapters/41-corpus-preparation/english',
    'audits/practical-llm-in-rust/foundation/20261008T105206Z-01/english','audits/practical-llm-in-rust/foundation/20261008T152502Z-02/english',
    'audits/practical-llm-in-rust/foundation/20261008T172459Z-03/english',PRACTICAL_ENGLISH_AUDIT_ROOT,PRACTICAL_CURRENT_ENGLISH_AUDIT_ROOT,
    'audits/practical-llm-in-rust/chapters/03-scalable-bpe-tokenizer/20261009T051600Z-04/english',
    'audits/practical-llm-in-rust/chapters/03-scalable-bpe-tokenizer/20261009T105211Z-01/english'];
  for(const chapterIds of [FOUNDATION_CHAPTER_IDS,CURRENT_CHAPTER_IDS]){
    const f=publicationFixture(t,chapterIds);
    for(const prefix of prefixes){
      f.receipt.english=englishPaths(prefix);f.save();
      if(prefix===f.auditRoot)assert.throws(()=>readPracticalPublication(f.root),/ENOENT/,'declared namespace must read the actual spec and never fabricate a chain');
      else assert.throws(()=>readPracticalPublication(f.root),/audit namespace/);
    }
    for(const field of ENGLISH_FIELDS){
      f.receipt.english=englishPaths(f.auditRoot);f.receipt.english[field]=PRACTICAL_ENGLISH_AUDIT_ROOT+'/renamed-old/'+field;
      if(f.auditRoot===PRACTICAL_ENGLISH_AUDIT_ROOT)f.receipt.english[field]='audits/practical-llm-in-rust/foundation/old/'+field;
      f.save();assert.throws(()=>readPracticalPublication(f.root),/audit namespace/);
    }
  }
});
test('published missing reordered duplicate and mixed chapter IDs cannot select a profile',t=>{
  for(const chapterIds of [FOUNDATION_CHAPTER_IDS,CURRENT_CHAPTER_IDS]){
    const f=publicationFixture(t,chapterIds),original=structuredClone(f.receipt.chapters);
    for(const change of [items=>items.pop(),items=>items.reverse(),items=>items[1]=structuredClone(items[0]),
      items=>items[2].chapterId='02-bpe-merges',items=>items.push({chapterId:'04-unowned',contentRevision:1})]){
      f.receipt.chapters=structuredClone(original);change(f.receipt.chapters);f.save();
      assert.throws(()=>readPracticalPublication(f.root),/invalid practical publication/);
    }
  }
});
test('publication schemas and the 256-source bound remain closed for the current head',t=>{
  const f=publicationFixture(t,CURRENT_CHAPTER_IDS),original=structuredClone(f.receipt);
  for(const change of [value=>value.extra='unknown',value=>value.english.extra='unknown',
    value=>value.chapters[3].extra='unknown',value=>value.chapters[3].contentRevision=0,
    value=>value.sourceHashes=[],value=>value.sourceHashes={},
    value=>{for(let index=0;index<257;index++)value.sourceHashes['fixture/'+index+'.txt']='a'.repeat(64);},
    value=>delete value.sourceHashes['site/src/content/practical-chapters/en/03-scalable-bpe-tokenizer.mdx']]){
    const value=structuredClone(original);change(value);write(f.root,f.receiptPath,canonicalJson(value));
    assert.throws(()=>readPracticalPublication(f.root));
  }
});
test('current publication checks actual source metadata candidate and all six built bindings',t=>{
  const f=publicationFixture(t,CURRENT_CHAPTER_IDS),s=incompleteCurrentSpec(f),original=structuredClone(s.spec);
  assert.throws(()=>readPracticalPublication(f.root),error=>error.code==='missing-key','incomplete real English verification stays mandatory');
  for(const change of [value=>value.candidateId='practical.foundation.en.20261009.04',value=>value.scopeId='practical.foundation.en']){
    Object.assign(s.spec,structuredClone(original));change(s.spec);s.save();
    assert.throws(()=>readPracticalPublication(f.root),/candidate\/scope drift/);
  }
  for(const route of original.builtDocuments.map(document=>document.route)){
    Object.assign(s.spec,structuredClone(original));s.spec.builtDocuments=s.spec.builtDocuments.filter(document=>document.route!==route);s.save();
    assert.throws(()=>readPracticalPublication(f.root),/matching English built binding/);
  }
  Object.assign(s.spec,structuredClone(original));s.spec.builtDocuments.push(structuredClone(s.spec.builtDocuments[0]));s.save();
  assert.throws(()=>readPracticalPublication(f.root),/matching English built binding/);
  Object.assign(s.spec,structuredClone(original));s.save();
  const path='site/src/content/practical-chapters/en/03-scalable-bpe-tokenizer.mdx',originalBytes=readFileSync(resolve(f.root,path));
  write(f.root,path,'changed\n');assert.throws(()=>readPracticalPublication(f.root),/source drift/);
  write(f.root,path,originalBytes);
  f.receipt.chapters[0].contentRevision=1;f.save();
  assert.throws(()=>readPracticalPublication(f.root),/metadata drift/);
  f.receipt.chapters[0].contentRevision=2;f.save();
  s.spec.sourceDocuments=s.spec.sourceDocuments.filter(document=>document.publicationPath!==path);s.save();
  assert.throws(()=>readPracticalPublication(f.root),/matching English source binding/);
});
test('a malformed or nonregular current head never falls back to the sealed foundation',t=>{
  const f=sealedPublicationFixture(t);
  assert.deepEqual(readPracticalPublication(f.root),f.receipt);
  for(const bytes of ['not JSON\n',canonicalJson({schemaVersion:1,status:'complete'}),canonicalJson(f.receipt)]){
    write(f.root,PRACTICAL_CURRENT_PUBLICATION_RECEIPT,bytes);
    assert.throws(()=>readPracticalPublication(f.root),'present malformed current head must refuse with a valid foundation present');
    rmSync(resolve(f.root,PRACTICAL_CURRENT_PUBLICATION_RECEIPT));
  }
  const target=resolve(f.root,PRACTICAL_CURRENT_PUBLICATION_RECEIPT);
  symlinkSync('missing-receipt.json',target);
  assert.throws(()=>readPracticalPublication(f.root),/symlink\/nonregular/);
  rmSync(target);mkdirSync(target);
  assert.throws(()=>readPracticalPublication(f.root),/symlink\/nonregular/);
  rmSync(target,{recursive:true});
  assert.deepEqual(readPracticalPublication(f.root),f.receipt);
});
test('sealed foundation admission retains its exact revision one sources and original chain',t=>{
  const f=sealedPublicationFixture(t);
  assert.deepEqual(readPracticalPublication(f.root),f.receipt);
  assert.deepEqual(readPracticalPublication(f.root).chapters.map(chapter=>chapter.chapterId),FOUNDATION_CHAPTER_IDS);
  const path='site/src/content/practical-chapters/en/00-course-structure.mdx';
  const bytes=readFileSync(resolve(f.root,path)).toString().replace('"content_revision": 1','"content_revision": 2');
  assert.notEqual(sha(bytes),f.receipt.sourceHashes[path],'revision amendment must change exact source bytes');
  write(f.root,path,bytes);assert.throws(()=>readPracticalPublication(f.root),/source drift/);
});
test('sealed current publication admits the four IDs through the existing selector',t=>{
  const f=sealedPublicationFixture(t,{current:true});
  assert.deepEqual(readPracticalPublication(f.root),f.receipt);
  assert.deepEqual(readPracticalPublication(f.root).chapters.map(chapter=>chapter.chapterId),CURRENT_CHAPTER_IDS);
  write(f.root,PRACTICAL_PRIVATE_SCOPE,canonicalJson({schemaVersion:1,courseId:'practical-llm-in-rust',scopeId:'fixture.current',
    candidates:f.receipt.chapters.map(chapter=>({...chapter,sourceHashes:{en:f.receipt.sourceHashes['site/src/content/practical-chapters/en/'+chapter.chapterId+'.mdx']}}))}));
  assert.throws(()=>practicalPublicationChapterIds(f.root,{buildRole:'production'}),/production forbids/);
});
test('sealed current publication refuses old practical index and Chapter 2 navigation bytes',t=>{
  const f=sealedPublicationFixture(t,{current:true});
  assert.deepEqual(readPracticalPublication(f.root),f.receipt);
  const foundation=resolve(process.env.COURSE_BOUNDARY_FOUNDATION_ROOT??historyRoot);
  for(const route of ['/en/practical-llm-in-rust/','/en/practical-llm-in-rust/02-corpus-preparation/']){
    const document=f.spec.builtDocuments.find(document=>document.route===route),path=document.publicationPath;
    const currentBytes=readFileSync(resolve(f.root,path));
    const oldPath='artifacts/practical-llm-in-rust/foundation/english-html'+route+'index.html';
    const oldBytes=readFileSync(resolve(foundation,oldPath));
    assert.notEqual(sha(oldBytes),sha(currentBytes),'current rendered index/navigation must differ from the foundation');
    write(f.root,path,oldBytes);assert.throws(()=>readPracticalPublication(f.root),/source drift/);
    f.receipt.sourceHashes[path]=sha(oldBytes);f.save();
    assert.throws(()=>readPracticalPublication(f.root),/matching English built binding/,'rewriting a receipt hash cannot replace the reviewed built candidate');
    write(f.root,path,currentBytes);f.receipt.sourceHashes[path]=sha(currentBytes);f.save();
  }
  assert.deepEqual(readPracticalPublication(f.root),f.receipt);
});
test('sealed current publication refuses incomplete or byte-drifted English chains',t=>{
  const f=sealedPublicationFixture(t,{current:true});
  assert.deepEqual(readPracticalPublication(f.root),f.receipt);
  for(const directory of [f.receipt.english.reviewSealsDir,f.receipt.english.adjudicationSealsDir]){
    for(const role of ['technical-pedagogical','isolated-surface']){
      const path=directory+'/'+role+'/receipt.json',bytes=readFileSync(resolve(f.root,path));
      rmSync(resolve(f.root,path));assert.throws(()=>readPracticalPublication(f.root));write(f.root,path,bytes);
    }
  }
  const reviewReceipt=JSON.parse(readFileSync(resolve(f.root,f.receipt.english.reviewSealsDir+'/technical-pedagogical/receipt.json')));
  const path=reviewReceipt.rawResponse.path;
  const bytes=readFileSync(resolve(f.root,path));
  write(f.root,path,Buffer.concat([bytes,Buffer.from('\n')]));
  assert.throws(()=>readPracticalPublication(f.root));
  write(f.root,path,bytes);
  assert.deepEqual(readPracticalPublication(f.root),f.receipt);
});
test('sealed foundation English artifacts cannot supply a current head chain',t=>{
  const f=publicationFixture(t,CURRENT_CHAPTER_IDS);
  f.receipt.english=englishPaths(PRACTICAL_ENGLISH_AUDIT_ROOT);f.save();
  assert.throws(()=>readPracticalPublication(f.root),/audit namespace/);
  f.receipt.english=englishPaths(PRACTICAL_CURRENT_ENGLISH_AUDIT_ROOT);f.save();
  incompleteCurrentSpec(f);
  assert.throws(()=>readPracticalPublication(f.root),error=>error.code==='missing-key');
});
test('failed English status flags cannot replace the maintained current chain',t=>{
  const f=publicationFixture(t,CURRENT_CHAPTER_IDS),s=incompleteCurrentSpec(f);
  for(const status of ['pass','complete','fail']){
    s.spec.status=status;s.save();
    assert.throws(()=>readPracticalPublication(f.root),error=>error.code==='unknown-key');
  }
});
