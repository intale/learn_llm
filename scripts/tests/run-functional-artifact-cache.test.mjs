import test from 'node:test';
import assert from 'node:assert/strict';
import {bridgeRequest,bindProductionProvenance,runtimeMountPlan,exactKeys} from '../lib/functional-artifact-cache-boundary.mjs';
import {validateRuntimeBinding,parseCacheArguments} from '../lib/run-functional-artifact-cache.mjs';
const digest='a'.repeat(64);
test('public command shapes refuse ignored options and arbitrary source overrides',()=>{assert.throws(()=>parseCacheArguments(['build-tools','--run-id','20261006T000000Z-example-01','--input','/ignored']));assert.throws(()=>parseCacheArguments(['acquire','--run-id','20261006T000000Z-example-01','--url','https://example.invalid']));assert.throws(()=>parseCacheArguments(['--help','--input','/ignored']));assert.equal(parseCacheArguments(['build-tools','--run-id','20261006T000000Z-example-01']).mode,'build-tools');});
test('new fixed-workflow image binds per build without historical image pin',()=>{const image='sha256:'+'f'.repeat(64);assert.equal(validateRuntimeBinding({image_id:image,network:'none',cargo_locked:true},image),true);});
test('stale image receipt and online build-tool evidence refuse',()=>{const image='sha256:'+'f'.repeat(64);assert.throws(()=>validateRuntimeBinding({image_id:'sha256:'+'a'.repeat(64),network:'none',cargo_locked:true},image));assert.throws(()=>validateRuntimeBinding({image_id:image,network:'bridge',cargo_locked:true},image));});
const roots={runRoot:'/run-owned',inputRoot:'/candidate',cacheRoot:'/cache-owned',digest,policyKind:'production-source-policy',targetKind:'raw-pair'};

test('acquisition has no cache mount',()=>{
 const p=runtimeMountPlan('acquire',roots);assert.equal(p.network,'none');assert.equal(p.transfer,'checksum-bound-image-build');assert.equal(p.buildNetworkEnabled,true);assert.equal(p.cacheMounted,false);assert.deepEqual(p.mounts,[{source:'/run-owned',target:'/output',readOnly:false}]);
});
test('publication is network none with exact input RO and cache RW',()=>{
 const p=runtimeMountPlan('publish',roots);assert.equal(p.network,'none');assert.equal(p.mounts.length,2);assert.equal(p.mounts[0].readOnly,true);assert.equal(p.mounts[1].readOnly,false);
});
test('replay mounts only selected digest read only',()=>{
 const p=runtimeMountPlan('replay',roots);assert.deepEqual(p.mounts,[{source:'/cache-owned/'+digest,target:'/entry/'+digest,readOnly:true}]);assert.equal(p.network,'none');
});
test('production cannot downgrade to fixture policy',()=>assert.throws(()=>runtimeMountPlan('publish',{...roots,policyKind:'synthetic-offline-fixture'})));
test('unadmitted filtered or model target refuses',()=>{
 for(const kind of ['filtered-corpus-v1','model','generic'])assert.throws(()=>runtimeMountPlan('publish',{...roots,targetKind:kind}));
 for(const mode of ['transform','publish-generated'])assert.throws(()=>runtimeMountPlan(mode,roots));
});
test('self-test generated handoff cannot acquire network input',()=>{
 const fixture={...roots,targetKind:'self-test',policyKind:'synthetic-offline-fixture'};
 assert.throws(()=>runtimeMountPlan('acquire',fixture));
 assert.equal(runtimeMountPlan('transform',fixture).network,'none');
 assert.equal(runtimeMountPlan('publish-generated',fixture).network,'none');
});
test('bridge aliases and operation are closed',()=>{
 assert.equal(bridgeRequest('publish').cache_parent,'/cache');
 assert.equal(bridgeRequest('replay',{digest}).entry_root,'/entry/'+digest);
 assert.throws(()=>bridgeRequest('fetch'));assert.throws(()=>bridgeRequest('replay',{digest:'../escape'}));
});
test('final manifest request has exactly two private endpoint strings and no write aliases',()=>{
 const r=bridgeRequest('finalize-manifest',{finalUrls:['https://example.invalid/train','https://example.invalid/valid']});
 assert.equal(r.operation,'finalize-manifest');assert.equal(Object.hasOwn(r,'cache_parent'),false);
 for(const urls of [[],['one'],['one','two','three']])assert.throws(()=>bridgeRequest('finalize-manifest',{finalUrls:urls}));
});
test('unknown binding field refuses',()=>assert.throws(()=>exactKeys({a:1,b:2},['a'])));
const binding={licenseTextSha256:digest,attributionSha256:'b'.repeat(64),attributionReferences:['https://example.invalid/fixed'],producerScriptSha256:'c'.repeat(64),producerConfigSha256:'d'.repeat(64)};
const manifest={producer:{script_sha256:binding.producerScriptSha256,config_sha256:binding.producerConfigSha256},sources:[0,1].map(()=>({license_text_sha256:binding.licenseTextSha256,attribution_sha256:binding.attributionSha256,attribution_references:binding.attributionReferences}))};
test('accepted external provenance binding compares exactly',()=>bindProductionProvenance(manifest,binding));
test('caller manifest cannot authorize changed license attribution or producer',()=>{
 for(const field of ['license_text_sha256','attribution_sha256']){
  const changed=structuredClone(manifest);changed.sources[0][field]='e'.repeat(64);assert.throws(()=>bindProductionProvenance(changed,binding));
 }
 for(const field of ['script_sha256','config_sha256']){const changed=structuredClone(manifest);changed.producer[field]='e'.repeat(64);assert.throws(()=>bindProductionProvenance(changed,binding));}
 const changed=structuredClone(manifest);changed.sources[1].attribution_references=[];assert.throws(()=>bindProductionProvenance(changed,binding));
});
