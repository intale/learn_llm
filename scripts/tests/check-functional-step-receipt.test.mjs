import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync,readFileSync,cpSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicationInputPaths,languageVerifierInvocations,readRegularFile,jsonFile,verifyPublicationReceipt,reconstructCh41CommandBaseline,verifyCh41CommandAmendment,CH41_COMMAND_TESTS,ch41CommandBlock,CH41_COMMAND_SETUP} from '../check-functional-step-receipt.mjs';
import {canonicalJson} from '../../.agents/skills/author-llm-course-english/scripts/english-review.mjs';
test('Chapter40 routes actual maintained English and Russian verifiers',()=>{
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
  const future=languageVerifierInvocations('41-governed-corpus-acquisition',['en'],'/fixture');
  assert.equal(future.length,1);
  assert.ok(future[0].args.includes('audits/functional-laptop/reviews/41-governed-corpus-acquisition/english-candidate-02/spec.json'));
  assert.ok(future[0].args.includes('audits/functional-laptop/reviews/41-governed-corpus-acquisition/english-candidate-02/review-routing/review-routing.json'));
  assert.ok(future[0].args.includes('audits/functional-laptop/reviews/41-governed-corpus-acquisition/english-candidate-02/adjudication-routing/adjudication-routing.json'));
  const later=languageVerifierInvocations('42-deterministic-corpus-filtering',['en'],'/fixture');
  assert.ok(later[0].args.includes('audits/functional-laptop/reviews/42-deterministic-corpus-filtering/english/spec.json'));
  assert.throws(()=>languageVerifierInvocations('41-governed-corpus-acquisition',['en','ru'],'/fixture'));
});
test('Chapter41 command-only amendment reconstructs every exact reviewed source',()=>{
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
  const base='audits/functional-laptop/reviews/41-governed-corpus-acquisition/english-candidate-02';
  const spec=JSON.parse(readFileSync(join(root,base,'spec.json'),'utf8'));
  for(const d of spec.sourceDocuments){const current=readFileSync(join(root,d.publicationPath)),baseline=readFileSync(join(root,d.file.path));
    if(d.id==='source.sheet')assert.deepEqual(current,baseline);
    else assert.deepEqual(reconstructCh41CommandBaseline(current,d.id.slice(7)),baseline);
  }
  const lesson=readFileSync(join(root,'site/src/content/chapters/en/41-governed-corpus-acquisition.mdx'),'utf8');
  for(const changed of [lesson.replace(ch41CommandBlock(CH41_COMMAND_TESTS[0]),''),lesson.replace('--test governed_acquisition','--test wrong_target'),lesson.replace(CH41_COMMAND_SETUP,''),lesson.replace('"content_revision": 2','"content_revision": 3')])assert.throws(()=>reconstructCh41CommandBaseline(Buffer.from(changed),'lesson'));
  const baseline=readFileSync(join(root,base,'sources/site/src/content/chapters/en/41-governed-corpus-acquisition.mdx'));
  for(const changed of [lesson.replace('Their digests differ','Their digests match'),lesson.replace('cannot','can')])assert.notDeepEqual(reconstructCh41CommandBaseline(Buffer.from(changed),'lesson'),baseline);
});
test('closed activation inventory contains exact real locale input paths',()=>{
  const paths=publicationInputPaths('40-reference-core-handoff',['en','ru']);
  assert.ok(paths.includes('site/src/i18n/functional-catalogs/ru/40-reference-core-handoff.json'));
  assert.ok(paths.includes('audits/functional-laptop/reviews/40-reference-core-handoff/english/adjudication-seals/technical-pedagogical/receipt.json'));
  assert.ok(!publicationInputPaths('41-governed-corpus-acquisition',['en']).some(p=>p.includes('/ru/')));
});
test('Chapter41 amendment rejects unrelated edits, bad proof, authority and baseline drift',()=>{
  const repository=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
  const base='audits/functional-laptop/reviews/41-governed-corpus-acquisition/english-candidate-02';
  const artifact='artifacts/functional-laptop/chapters/41-governed-corpus-acquisition/revision-02';
  const path=artifact+'/command-amendment.json';
  const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
  const cases=[
    ['waiver',(_root,a)=>{a.authority='unapproved';}],
    ['revision',(_root,a)=>{a.contentRevision=3;}],
    ['built path',(_root,a)=>{a.built.reverse();}],
    ['wrong command',(root,a)=>{const d=a.files['site/src/content/chapters/en/41-governed-corpus-acquisition.mdx'];const bytes=Buffer.from(readFileSync(join(root,d.path),'utf8').replace('--test governed_acquisition','--test other'));writeFileSync(join(root,d.path),bytes);d.sha256=sha(bytes);d.bytes=bytes.length;}],
    ['unrelated prose',(root,a)=>{const d=a.files['site/src/content/chapters/en/41-governed-corpus-acquisition.mdx'];const bytes=Buffer.from(readFileSync(join(root,d.path),'utf8').replace('cannot','can'));writeFileSync(join(root,d.path),bytes);d.sha256=sha(bytes);d.bytes=bytes.length;}],
    ['catalog whitespace',(root,a)=>{const d=a.files['site/src/i18n/functional-catalogs/en/41-governed-corpus-acquisition.json'];const bytes=Buffer.from(readFileSync(join(root,d.path),'utf8').replace('"title":','"title" :'));writeFileSync(join(root,d.path),bytes);d.sha256=sha(bytes);d.bytes=bytes.length;}],
    ['zero tests',(root,a)=>{const d=a.tests[0].stdout,bytes=Buffer.from('running 0 tests\ntest result: ok. 0 passed; 0 failed;\n');writeFileSync(join(root,d.path),bytes);d.sha256=sha(bytes);d.bytes=bytes.length;}],
    ['baseline',(root,a)=>{writeFileSync(join(root,a.baselineSpec.path),'{}\n');}],
    ['Rust',(root)=>{writeFileSync(join(root,'rust/demos/ch41-governed-corpus-acquisition/src/lib.rs'),'// changed\n');}],
    ['shared Rust',(root)=>{writeFileSync(join(root,'rust/crates/llm-from-scratch/src/artifact/acquisition.rs'),'// changed\n');}],
    ['hash',(_root,a)=>{a.tests[0].stdout.sha256='0'.repeat(64);}],
  ];
  for(const [label,mutate]of cases){const root=mkdtempSync(join(tmpdir(),'ch41-command-negative-'));try{
    const spec=JSON.parse(readFileSync(join(repository,base,'spec.json')));
    for(const p of [base,artifact,'rust/demos/ch41-governed-corpus-acquisition','rust/crates/llm-from-scratch/src/artifact',...spec.sourceDocuments.map(d=>d.publicationPath)]){mkdirSync(dirname(join(root,p)),{recursive:true});cpSync(join(repository,p),join(root,p),{recursive:true});}
    const a=JSON.parse(readFileSync(join(root,path)));mutate(root,a);writeFileSync(join(root,path),canonicalJson(a));
    assert.throws(()=>verifyCh41CommandAmendment(root),undefined,label);
  }finally{rmSync(root,{recursive:true,force:true});}}
});
test('missing receipt and unsafe paths refuse before any verifier',()=>{
  const root=mkdtempSync(join(tmpdir(),'functional-receipt-'));
  try{
    assert.throws(()=>verifyPublicationReceipt(root,{chapterId:'40-reference-core-handoff',activeLocales:['en','ru']},{run:()=>{throw new Error('must not run');}}));
    for(const p of ['../outside','/absolute','a//b','a/./b','a\\b'])assert.throws(()=>readRegularFile(root,p));
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
