import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {canonicalJson} from '../../.agents/skills/author-llm-course-english/scripts/english-review.mjs';
import {readPrivateBuildScope} from '../check-functional-site-content.mjs';
import {hash} from '../check-functional-step-receipt.mjs';
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
