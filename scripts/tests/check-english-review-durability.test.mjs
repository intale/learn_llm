import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {checkReviewDurability} from '../check-english-review-durability.mjs';
function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'english-durability-'));const put=(p,s)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),s);return {path:p,sha256:createHash('sha256').update(s).digest('hex')};};const a=put('audits/candidate/input.txt','exact');const source={file:a,publicationPath:'site/source.txt'};put(source.publicationPath,'exact');const spec={authorContext:a,commitmentMap:a,reviewSchema:a,adjudicationSchema:a,receiptSchema:a,rubrics:{technical:a,isolated:a},evidence:[a],sourceDocuments:[source],builtDocuments:[]};put('audits/candidate/spec.json',JSON.stringify(spec));return {root,spec,put,options:{root,specPath:'audits/candidate/spec.json'}};}
test('canonical archive verifies with no original .build tree',()=>{const f=fixture();assert.equal(fs.existsSync(path.join(f.root,'.build')),false);assert.equal(checkReviewDurability(f.options).publicationFiles,1);});
test('staging path dependency refuses before routing',()=>{const f=fixture();f.spec.authorContext=f.put('.build/run/input.txt','exact');f.put(f.options.specPath,JSON.stringify(f.spec));assert.throws(()=>checkReviewDurability(f.options),/Non-durable/);});
test('publication mismatch, missing archive or symlink refuses',()=>{const f=fixture();f.put('site/source.txt','changed');assert.throws(()=>checkReviewDurability(f.options),/Publication/);f.put('site/source.txt','exact');fs.unlinkSync(path.join(f.root,'audits/candidate/input.txt'));assert.throws(()=>checkReviewDurability(f.options));fs.symlinkSync('../../site/source.txt',path.join(f.root,'audits/candidate/input.txt'));assert.throws(()=>checkReviewDurability(f.options),/Non-regular/);});
