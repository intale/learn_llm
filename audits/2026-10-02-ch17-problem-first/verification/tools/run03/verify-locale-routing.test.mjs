import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const verifier=fileURLToPath(new URL('./verify-locale-routing.mjs',import.meta.url));
const base='audits/2026-10-02-ch17-problem-first/ru-r1';
const hash=b=>createHash('sha256').update(b).digest('hex');
function fixture(){
  const root=mkdtempSync(resolve(tmpdir(),'ch17-route-test-'));
  const put=(p,v)=>{const path=resolve(root,p);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,typeof v==='string'?v:JSON.stringify(v)+'\n');};
  const read=p=>readFileSync(resolve(root,p));
  put(base+'/frozen/author-context.json',{contextId:'fixture-author',model:'fixture-user-selection',reasoning:'fixture-configuration'});
  put(base+'/fixture.schema.json','{"fixtureOnly":true}\n');
  const routing={candidate:base,roles:{}};
  for(const role of ['bilingual','target-only']){
    const contextId='fixture-'+role;
    const contextPath=base+'/contexts/'+role+'.json',promptPath=base+'/prompts/'+role+'.txt',bundlePath=base+'/bundle/'+role+'.json',responsePath=base+'/raw/'+role+'.json';
    put(contextPath,{contextId,model:'fixture-user-selection',reasoning:'fixture-configuration'});
    put(promptPath,'Synthetic verifier fixture, not a judgment.\n');put(bundlePath,{fixtureOnly:true});
    put(responsePath,{role,verdict:'pass',bundleSha256:hash(read(bundlePath)),reviewer:{contextId,contextSha256:hash(read(contextPath)),promptSha256:hash(read(promptPath)),model:'fixture-user-selection',reasoning:'fixture-configuration',freshContext:true}});
    routing.roles[role]={contextId,contextPath,promptPath,bundlePath,responsePath,artifacts:Object.fromEntries([contextPath,promptPath,bundlePath,base+'/fixture.schema.json'].map(p=>[p,{bytes:read(p).length,sha256:hash(read(p))}]))};
  }
  put(base+'/routing.json',routing);
  return {root,put,read,routing,run:()=>spawnSync(process.execPath,[verifier,'staged',root],{encoding:'utf8'})};
}
test('accepts exact synthetic routes and preserves raw bytes',()=>{const f=fixture();const raw=f.read(f.routing.roles.bilingual.responsePath);assert.equal(f.run().status,0);assert.deepEqual(f.read(f.routing.roles.bilingual.responsePath),raw);assert.notEqual(f.run().status,0);});
test('rejects prompt byte drift',()=>{const f=fixture();f.put(f.routing.roles.bilingual.promptPath,'Changed\n');assert.notEqual(f.run().status,0);});
test('rejects record hash drift',()=>{const f=fixture(),p=f.routing.roles.bilingual.responsePath,r=JSON.parse(f.read(p));r.reviewer.promptSha256='0'.repeat(64);f.put(p,r);assert.notEqual(f.run().status,0);});
test('rejects reused author identity',()=>{const f=fixture();f.put(base+'/frozen/author-context.json',{contextId:f.routing.roles.bilingual.contextId,model:'fixture-user-selection',reasoning:'fixture-configuration'});assert.notEqual(f.run().status,0);});
test('rejects changed model or reasoning',()=>{const f=fixture(),p=f.routing.roles.bilingual.responsePath,r=JSON.parse(f.read(p));r.reviewer.reasoning='substitution';f.put(p,r);assert.notEqual(f.run().status,0);});
test('rejects nonpassing verdict and invalid terminator',()=>{for(const mutate of [r=>({...r,verdict:'fail'}),r=>JSON.stringify(r)]){const f=fixture(),p=f.routing.roles.bilingual.responsePath;f.put(p,mutate(JSON.parse(f.read(p))));assert.notEqual(f.run().status,0);}});
