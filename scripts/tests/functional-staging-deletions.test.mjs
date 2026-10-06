import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {applyStagingDeletions} from '../lib/functional-staging-deletions.mjs';
function fixture(){const root=mkdtempSync(join(tmpdir(),'candidate-delete-')),work=join(root,'work'),path='rust/demos/example/src/bin/old.rs',manifest=join(root,'deleted.json');mkdirSync(join(work,'rust/demos/example/src/bin'),{recursive:true});writeFileSync(join(work,path),'old');return {root,work,path,manifest,write(paths){writeFileSync(manifest,JSON.stringify({schema_version:1,paths}));},close(){rmSync(root,{recursive:true,force:true});}};}
test('declared regular candidate file is removed, sibling baseline preserved',()=>{const f=fixture();try{writeFileSync(join(f.work,'rust/demos/example/src/bin/keep.rs'),'keep');f.write([f.path]);assert.deepEqual(applyStagingDeletions(f.manifest,f.work),[f.path]);assert.equal(existsSync(join(f.work,f.path)),false);assert.equal(readFileSync(join(f.work,'rust/demos/example/src/bin/keep.rs'),'utf8'),'keep');}finally{f.close();}});
test('whole list validates before any deletion',()=>{const f=fixture();try{for(const bad of ['../outside','/absolute','rust//bad','rust/../bad','site/lesson.mdx',f.path]){f.write([f.path,bad]);assert.throws(()=>applyStagingDeletions(f.manifest,f.work));assert.equal(existsSync(join(f.work,f.path)),true);}}finally{f.close();}});
test('symlink target and malformed shape refuse',()=>{const f=fixture();try{symlinkSync(join(f.work,f.path),join(f.work,'rust/link.rs'));f.write(['rust/link.rs']);assert.throws(()=>applyStagingDeletions(f.manifest,f.work));writeFileSync(f.manifest,'{"schema_version":1,"paths":[],"extra":true}');assert.throws(()=>applyStagingDeletions(f.manifest,f.work));}finally{f.close();}});
