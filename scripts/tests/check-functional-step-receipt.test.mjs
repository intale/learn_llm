import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {publicationInputPaths,publicationReceiptPath,languageVerifierInvocations,readRegularFile,jsonFile,verifyPublicationReceipt,readPublicationEvidence,verifySharedEnglishProjection,hash} from '../check-functional-step-receipt.mjs';
import {canonicalJson} from '../../.agents/skills/author-llm-course-english/scripts/english-review.mjs';
import {localizedContractProjection} from '../check-chapter-contract.mjs';
import {parseJsonFrontmatter} from '../check-site-content.mjs';
test('Chapter40 preserves actual maintained English and Russian verifier routes',()=>{
  const commands=languageVerifierInvocations('40-reference-core-handoff',['en','ru'],'/fixture');
  assert.equal(commands.length,2);
  const english='audits/functional-laptop/reviews/40-reference-core-handoff/english-candidate-03';
  assert.deepEqual(commands[0].args,[
    '/fixture/.agents/skills/author-llm-course-english/scripts/english-review.mjs',
    'verify','--spec',english+'/spec.json','--bundle',english+'/bundle',
    '--review-routing',english+'/review-routing/review-routing.json',
    '--review-seals',english+'/review-seals',
    '--adjudication-bundle',english+'/adjudication-bundle',
    '--adjudication-routing',english+'/adjudication-routing/adjudication-routing.json',
    '--adjudication-seals',english+'/adjudication-seals','--root','/fixture',
  ]);
  assert.ok(commands[1].args.includes('audits/functional-laptop/reviews/40-reference-core-handoff/ru/target-only.raw.json'));
});
test('merged41 and shifted42 use fresh English-only generic verifier routes',()=>{
  for(const chapterId of ['41-corpus-preparation','42-scalable-bpe-tokenizer']){
    const commands=languageVerifierInvocations(chapterId,['en'],'/fixture');
    assert.equal(commands.length,1);
    const english='audits/functional-laptop/reviews/'+chapterId+'/english';
    for(const path of ['/spec.json','/review-routing.json','/adjudication-routing.json'])assert.ok(commands[0].args.includes(english+path));
    assert.ok(!commands[0].args.some(path=>path.includes('english-history-v5')));
    assert.throws(()=>languageVerifierInvocations(chapterId,['en','ru'],'/fixture'));
  }
  for(const oldId of ['41-governed-corpus-acquisition','42-deterministic-corpus-filtering','43-deduplication-decontamination'])assert.throws(()=>languageVerifierInvocations(oldId,['en'],'/fixture'));
});
test('closed activation inventory contains exact real locale and four seal paths',()=>{
  const paths=publicationInputPaths('40-reference-core-handoff',['en','ru']);
  assert.ok(paths.includes('site/src/i18n/functional-catalogs/ru/40-reference-core-handoff.json'));
  assert.ok(paths.includes('audits/functional-laptop/reviews/40-reference-core-handoff/english/adjudication-seals/technical-pedagogical/receipt.json'));
  const current=publicationInputPaths('41-corpus-preparation',['en']);
  assert.equal(current.length,9);
  assert.equal(current.filter(path=>path.startsWith('audits/')&&path.includes('/english/')).length,5);
  assert.ok(!current.some(path=>path.includes('/ru/')||path.includes('english-history-v5')));
  for(const kind of ['review-seals','adjudication-seals'])for(const role of ['technical-pedagogical','isolated-surface'])assert.ok(current.includes('audits/functional-laptop/reviews/41-corpus-preparation/english/'+kind+'/'+role+'/receipt.json'));
  assert.ok(publicationInputPaths('42-scalable-bpe-tokenizer',['en']).includes('audits/functional-laptop/reviews/42-scalable-bpe-tokenizer/english/spec.json'));
});
test('missing receipt and unsafe paths refuse before any verifier',()=>{
  const root=mkdtempSync(join(tmpdir(),'functional-receipt-'));
  try{
    assert.throws(()=>verifyPublicationReceipt(root,{chapterId:'41-corpus-preparation',activeLocales:['en']},{run:()=>{throw new Error('must not run');}}));
    for(const path of ['../outside','/absolute','a//b','a/./b','a\\b'])assert.throws(()=>readRegularFile(root,path));
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('canonical JSON rejects duplicate/unknown spelling and symlink inputs',()=>{
  const root=mkdtempSync(join(tmpdir(),'functional-json-'));
  try{
    mkdirSync(join(root,'inputs'));
    writeFileSync(join(root,'inputs/a.json'),'{"x":1,"x":2}\n');
    assert.throws(()=>jsonFile(root,'inputs/a.json',1024,true));
    writeFileSync(join(root,'inputs/a.json'),'{"x":1}\n');
    assert.deepEqual(jsonFile(root,'inputs/a.json',1024,true),{x:1});
    symlinkSync('a.json',join(root,'inputs/link.json'));
    assert.throws(()=>readRegularFile(root,'inputs/link.json'));
    assert.throws(()=>readRegularFile(root,'inputs/a.json',1));
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('current40revision2 directly shares41English seals without deferred Russian inputs',()=>{
  const id='40-reference-core-handoff', english='audits/functional-laptop/reviews/41-corpus-preparation/english';
  const old=publicationInputPaths(id,['en','ru']);
  const current=publicationInputPaths(id,['en'],2);
  assert.equal(current.length,old.length-6);
  assert.equal(current.filter(path=>path.startsWith(english+'/')).length,5);
  assert.ok(!current.some(path=>path.startsWith('audits/functional-laptop/reviews/'+id+'/english/')));
  assert.ok(!current.some(path=>path.includes('/ru-r02/')||path.includes('/ru/')));
  const commands=languageVerifierInvocations(id,['en'],'/fixture',2);
  assert.equal(commands.length,1);
  for(const suffix of ['/spec.json','/review-routing.json','/adjudication-routing.json'])assert.ok(commands[0].args.includes(english+suffix));
  assert.throws(()=>publicationInputPaths(id,['en','ru'],2));
  assert.throws(()=>publicationInputPaths(id,['en'],1));
  const chapter41=publicationInputPaths('41-corpus-preparation',['en']);
  assert.deepEqual(current.filter(path=>path.startsWith(english+'/')),chapter41.filter(path=>path.startsWith(english+'/')));
  assert.equal(publicationReceiptPath(id),'artifacts/functional-laptop/chapters/'+id+'/publication-receipt.json');
  assert.equal(publicationReceiptPath(id,2),'artifacts/functional-laptop/chapters/'+id+'/publication-receipt-r02.json');
  for(const revision of [0,-1,3,1.5,'2']){
    assert.throws(()=>publicationReceiptPath(id,revision));
    assert.throws(()=>publicationInputPaths(id,['en','ru'],revision));
    assert.throws(()=>languageVerifierInvocations(id,['en','ru'],'/fixture',revision));
  }
  assert.throws(()=>publicationReceiptPath('../outside',2));
});
test('live revision2 configuration does not reuse original40receipt when current receipt is absent',()=>{
  const root=mkdtempSync(join(tmpdir(),'functional-live-receipt-'));
  try{
    const chapter={chapterId:'40-reference-core-handoff',order:40,activeLocales:['en']};
    const old=publicationReceiptPath(chapter.chapterId);
    mkdirSync(dirname(join(root,old)),{recursive:true});writeFileSync(join(root,old),'old noncurrent receipt\n');
    assert.deepEqual(readPublicationEvidence(root,{functional:{planRevision:2,chapters:[chapter]}}),{});
    assert.throws(()=>readPublicationEvidence(root,{functional:{planRevision:1,chapters:[chapter]}}));
    const current=publicationReceiptPath(chapter.chapterId,2);writeFileSync(join(root,current),'invalid current receipt\n');
    assert.throws(()=>readPublicationEvidence(root,{functional:{planRevision:2,chapters:[chapter]}}));
    writeFileSync(join(root,current),canonicalJson({schemaVersion:1,chapterId:chapter.chapterId,contentRevision:1,files:{}}));
    assert.throws(()=>verifyPublicationReceipt(root,chapter,{contentRevision:2,run:()=>{throw Error('must not invoke verifier');}}),/identity drift/);
    assert.equal(readFileSync(join(root,old),'utf8'),'old noncurrent receipt\n');
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('shared40English projection checks exact scope/source paths/bytes, never review substance',()=>{
  const root=mkdtempSync(join(tmpdir(),'functional-shared-projection-'));
  try{
    const contract=parseJsonFrontmatter(readFileSync('curriculum/chapters/40-reference-core-handoff.md','utf8')).data;
    const english='audits/functional-laptop/reviews/41-corpus-preparation/english';
    const paths={
      'source.ch40.contract':english+'/contract-projections/40.en.json',
      'source.ch40.lesson':'site/src/content/chapters/en/40-reference-core-handoff.mdx',
      'source.ch40.catalog':'site/src/i18n/functional-catalogs/en/40-reference-core-handoff.json',
      'source.ch40.sheet':'site/src/content/cheat-sheets/en/40-reference-core-handoff.json',
      'source.ch40.figure':'site/src/components/chapters/ReferenceCoreHandoffDiagram.astro',
      'source.lesson':'site/src/content/chapters/en/41-corpus-preparation.mdx',
      'source.catalog':'site/src/i18n/functional-catalogs/en/41-corpus-preparation.json',
    };
    const sourceDocuments=Object.entries(paths).map(([id,path])=>{
      const bytes=id==='source.ch40.contract'?canonicalJson(localizedContractProjection(contract,'en')):'binding-only fixture\n';
      mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),bytes);
      return{id,publicationPath:path,file:{path,sha256:hash(Buffer.from(bytes))}};
    });
    const spec={scopeId:'ch40-ch41.en.corpus-handoff',sourceDocuments};
    const specPath=join(root,english+'/spec.json');writeFileSync(specPath,JSON.stringify(spec));
    verifySharedEnglishProjection(root,'40-reference-core-handoff',2,contract);
    const changed=structuredClone(contract);changed.decoder_connection.en+=' changed';
    assert.throws(()=>verifySharedEnglishProjection(root,'40-reference-core-handoff',2,changed),/projection drift/);
    const wrongScope={...spec,scopeId:'ch41-only'};writeFileSync(specPath,JSON.stringify(wrongScope));
    assert.throws(()=>verifySharedEnglishProjection(root,'40-reference-core-handoff',2,contract),/scope/);
    const wrongPath=structuredClone(spec);wrongPath.sourceDocuments[0].publicationPath=english+'/other.json';writeFileSync(specPath,JSON.stringify(wrongPath));
    assert.throws(()=>verifySharedEnglishProjection(root,'40-reference-core-handoff',2,contract),/path drift/);
    writeFileSync(specPath,JSON.stringify(spec));writeFileSync(join(root,paths['source.ch40.lesson']),'drift\n');
    assert.throws(()=>verifySharedEnglishProjection(root,'40-reference-core-handoff',2,contract),/byte drift/);
    verifySharedEnglishProjection(root,'40-reference-core-handoff',1,contract);
  }finally{rmSync(root,{recursive:true,force:true});}
});
