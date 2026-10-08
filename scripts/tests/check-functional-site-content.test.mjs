import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {canonicalJson} from '../../.agents/skills/author-llm-course-english/scripts/english-review.mjs';
import {readPrivateBuildScope} from '../check-functional-site-content.mjs';
import {hash,readPublicationEvidence} from '../check-functional-step-receipt.mjs';
import {productionEvidenceConfiguration} from '../../site/src/lib/functional-course-publication.mjs';
import {deriveSeoExpectations} from '../check-static-links.mjs';
test('private descriptor requires explicit review role and every actual source hash',()=>{
  const root=mkdtempSync(join(tmpdir(),'functional-private-'));
  const original=process.env.COURSE_BUILD_ROLE;
  try{
    mkdirSync(join(root,'site/src/i18n/functional-catalogs'),{recursive:true});
    mkdirSync(join(root,'site/src/content/chapters/en'),{recursive:true});
    writeFileSync(join(root,'site/src/content/chapters/en/40-reference-core-handoff.mdx'),'fixture\n');
    const scope={schemaVersion:1,chapterId:'40-reference-core-handoff',scopeId:'fixture.en',sourceHashes:{en:hash(Buffer.from('fixture\n'))}};
    writeFileSync(join(root,'site/src/i18n/functional-catalogs/private-review.json'),canonicalJson(scope));
    delete process.env.COURSE_BUILD_ROLE;
    assert.throws(()=>readPrivateBuildScope(root),/Production/);
    process.env.COURSE_BUILD_ROLE='private-review';
    assert.deepEqual(readPrivateBuildScope(root),scope);
    writeFileSync(join(root,'site/src/content/chapters/en/40-reference-core-handoff.mdx'),'drift\n');
    assert.throws(()=>readPrivateBuildScope(root),/drift/);
  }finally{
    if(original===undefined)delete process.env.COURSE_BUILD_ROLE;else process.env.COURSE_BUILD_ROLE=original;
    rmSync(root,{recursive:true,force:true});
  }
});
test('only explicitv2 excludes candidate receipts; production and unselected predecessors fail closed',()=>{
  const root=mkdtempSync(join(tmpdir(),'functional-evidence-prefix-'));
  try{
    const ids=['40-reference-core-handoff','41-corpus-preparation'];
    const chapters=ids.map((chapterId,i)=>({chapterId,order:40+i,activeLocales:i?['en']:['en','ru']}));
    const configuration={functional:{chapters,byChapter:Object.fromEntries(chapters.map(chapter=>[chapter.chapterId,chapter]))}};
    const scope={schemaVersion:2,scopeId:'fixture.current-pair',candidates:ids.map((chapterId,i)=>({chapterId,contentRevision:i?1:2,sourceHashes:{en:'a'.repeat(64)}}))};
    mkdirSync(join(root,'artifacts/functional-laptop/chapters/'+ids[0]),{recursive:true});
    writeFileSync(join(root,'artifacts/functional-laptop/chapters/'+ids[0]+'/publication-receipt.json'),'not a receipt\n');
    assert.deepEqual(readPublicationEvidence(root,productionEvidenceConfiguration(configuration,scope)),{});
    assert.equal(productionEvidenceConfiguration(configuration,null),configuration);
    assert.throws(()=>readPublicationEvidence(root,productionEvidenceConfiguration(configuration,null)));
    const legacy={schemaVersion:1,chapterId:ids[1],scopeId:'fixture.legacy',sourceHashes:{en:'a'.repeat(64)}};
    assert.equal(productionEvidenceConfiguration(configuration,legacy),configuration);
    assert.throws(()=>readPublicationEvidence(root,productionEvidenceConfiguration(configuration,legacy)));
    const predecessor={chapterId:'39-predecessor-fixture',order:39,activeLocales:['en']};
    const withPredecessor={functional:{...configuration.functional,chapters:[predecessor,...chapters]}};
    mkdirSync(join(root,'artifacts/functional-laptop/chapters/'+predecessor.chapterId),{recursive:true});
    writeFileSync(join(root,'artifacts/functional-laptop/chapters/'+predecessor.chapterId+'/publication-receipt.json'),'not a predecessor receipt\n');
    assert.throws(()=>readPublicationEvidence(root,productionEvidenceConfiguration(withPredecessor,scope)));
  }finally{rmSync(root,{recursive:true,force:true});}
});
test('privatev2 SEO expects selectedEN only while production and legacy retain bilingual40',()=>{
  const root=mkdtempSync(join(tmpdir(),'functional-private-seo-'));
  const original=process.env.COURSE_BUILD_ROLE;
  try{
    const ids=['40-reference-core-handoff','41-corpus-preparation'];
    const source=(chapter_id,locale,content_revision)=>'---\n'+JSON.stringify({chapter_id,locale,content_revision,description:'Fixture description.'})+'\n---\nFixture.\n';
    const configuration={byChapter:Object.fromEntries(ids.map((chapterId,i)=>[chapterId,{chapterId,activeLocales:i?['en']:['en','ru']}]))};
    mkdirSync(join(root,'site/src/i18n/functional-catalogs'),{recursive:true});
    mkdirSync(join(root,'site/src/i18n/catalogs'),{recursive:true});
    for(const locale of ['en','ru']){
      mkdirSync(join(root,'site/src/content/chapters/'+locale),{recursive:true});
      writeFileSync(join(root,'site/src/i18n/catalogs/'+locale+'.json'),JSON.stringify({siteDescription:'Fixture site.',courseDescription:'Fixture course.'}));
    }
    for(let i=0;i<2;i++)writeFileSync(join(root,'site/src/content/chapters/en/'+ids[i]+'.mdx'),source(ids[i],'en',i?1:2));
    writeFileSync(join(root,'site/src/content/chapters/ru/'+ids[0]+'.mdx'),source(ids[0],'ru',1));
    const locales={locales:['en','ru'],defaultLocale:'en'};
    assert.equal(deriveSeoExpectations(root,locales,configuration).has('/ru/course/'+ids[0]+'/'),true);
    const scope={schemaVersion:2,scopeId:'fixture.current-pair',candidates:ids.map((chapterId,i)=>({chapterId,contentRevision:i?1:2,sourceHashes:{en:hash(Buffer.from(source(chapterId,'en',i?1:2)))}}))};
    const descriptor=join(root,'site/src/i18n/functional-catalogs/private-review.json');
    writeFileSync(descriptor,canonicalJson(scope));process.env.COURSE_BUILD_ROLE='private-review';
    const selected=deriveSeoExpectations(root,locales,configuration);
    assert.equal(selected.has('/ru/course/'+ids[0]+'/'),false);
    assert.equal(selected.has('/en/course/'+ids[0]+'/'),true);
    assert.equal(selected.has('/en/course/'+ids[1]+'/'),true);
    writeFileSync(descriptor,canonicalJson({schemaVersion:1,chapterId:ids[1],scopeId:'fixture.legacy',sourceHashes:scope.candidates[1].sourceHashes}));
    assert.equal(deriveSeoExpectations(root,locales,configuration).has('/ru/course/'+ids[0]+'/'),true);
    delete process.env.COURSE_BUILD_ROLE;assert.throws(()=>deriveSeoExpectations(root,locales,configuration),/Production/);
  }finally{
    if(original===undefined)delete process.env.COURSE_BUILD_ROLE;else process.env.COURSE_BUILD_ROLE=original;
    rmSync(root,{recursive:true,force:true});
  }
});
test('privatev2 group binds both actualEN bytes/revisions and remains forbiddeninproduction',()=>{
  const root=mkdtempSync(join(tmpdir(),'functional-private-pair-'));
  const original=process.env.COURSE_BUILD_ROLE;
  try{
    mkdirSync(join(root,'site/src/i18n/functional-catalogs'),{recursive:true});
    mkdirSync(join(root,'site/src/content/chapters/en'),{recursive:true});
    const ids=['40-reference-core-handoff','41-corpus-preparation'];
    const source=revision=>'---\n'+JSON.stringify({content_revision:revision})+'\n---\nFixture.\n';
    const scope={schemaVersion:2,scopeId:'fixture.current-pair',candidates:ids.map((chapterId,i)=>({chapterId,contentRevision:i?1:2,sourceHashes:{en:hash(Buffer.from(source(i?1:2)))}}))};
    for(let i=0;i<2;i++)writeFileSync(join(root,'site/src/content/chapters/en/'+ids[i]+'.mdx'),source(i?1:2));
    const descriptor=join(root,'site/src/i18n/functional-catalogs/private-review.json');
    writeFileSync(descriptor,canonicalJson(scope));
    delete process.env.COURSE_BUILD_ROLE;assert.throws(()=>readPrivateBuildScope(root),/Production/);
    process.env.COURSE_BUILD_ROLE='private-review';assert.deepEqual(readPrivateBuildScope(root),scope);
    for(let i=0;i<2;i++){
      const path=join(root,'site/src/content/chapters/en/'+ids[i]+'.mdx');writeFileSync(path,source(i?1:2)+'drift\n');
      assert.throws(()=>readPrivateBuildScope(root),/byte drift/);writeFileSync(path,source(i?1:2));
    }
    const wrong=structuredClone(scope);wrong.candidates[1].contentRevision=2;
    writeFileSync(descriptor,canonicalJson(wrong));assert.throws(()=>readPrivateBuildScope(root),/revision drift/);
  }finally{
    if(original===undefined)delete process.env.COURSE_BUILD_ROLE;else process.env.COURSE_BUILD_ROLE=original;
    rmSync(root,{recursive:true,force:true});
  }
});
