import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bridgeRequest,bindProductionProvenance,selectedPolicy,runtimeMountPlan,exactKeys} from '../lib/functional-artifact-cache-boundary.mjs';
import {validateRuntimeBinding,parseCacheArguments} from '../lib/run-functional-artifact-cache.mjs';
const digest='a'.repeat(64);
test('self-test receipt names are attempt-bound and never overwritten',()=>{
 const source=readFileSync(new URL('../lib/run-functional-artifact-cache.mjs',import.meta.url),'utf8');
 assert.ok(source.includes('`artifact-cache-receipt-v2-${attempt}.json`'));
 assert.ok(source.includes("{flag:'wx',mode:0o600}"));
 assert.ok(!source.includes("join(run,'artifact-cache-receipt-v2.json')"));
});
test('closed public command refuses arbitrary source and ignored option',()=>{
 for(const args of [['build-tools','--run-id','20261006T000000Z-example-01','--input','/ignored'],['acquire','--run-id','20261006T000000Z-example-01','--url','https://example.invalid'],['--help','--input','/ignored']])assert.throws(()=>parseCacheArguments(args));
 assert.equal(parseCacheArguments(['build-tools','--run-id','20261006T000000Z-example-01']).mode,'build-tools');
});
test('runtime evidence binds actual workflow image and offline boundary',()=>{const image='sha256:'+'f'.repeat(64);assert.equal(validateRuntimeBinding({image_id:image,network:'none',cargo_locked:true},image),true);for(const record of [{image_id:'sha256:'+'a'.repeat(64),network:'none',cargo_locked:true},{image_id:image,network:'bridge',cargo_locked:true}])assert.throws(()=>validateRuntimeBinding(record,image));});
const roots={runRoot:'/run-owned',inputRoot:'/candidate',cacheRoot:'/cache-owned',digest,policyKind:'production-source-policy',targetKind:'raw-pair'};
test('acquisition build authority has no runtime network or cache mount',()=>{const p=runtimeMountPlan('acquire',roots);assert.equal(p.network,'none');assert.equal(p.buildNetworkEnabled,true);assert.equal(p.cacheMounted,false);});
test('publication mounts exact input read-only and cache writable',()=>{const p=runtimeMountPlan('publish',roots);assert.deepEqual(p.mounts,[{source:'/candidate',target:'/input',readOnly:true},{source:'/cache-owned',target:'/cache',readOnly:false}]);});
test('replay chooses one entry mounted at closed alias without manifest filename',()=>{const p=runtimeMountPlan('replay',roots);assert.deepEqual(p.mounts,[{source:'/cache-owned/'+digest,target:'/entry',readOnly:true}]);assert.equal(bridgeRequest('replay',{digest}).entry_root,'/entry');});
test('production cannot downgrade selected policy or select unadmitted stage',()=>{assert.throws(()=>runtimeMountPlan('publish',{...roots,policyKind:'synthetic-offline-fixture'}));for(const kind of ['filtered','model','generic'])assert.throws(()=>runtimeMountPlan('publish',{...roots,targetKind:kind}));});
test('fixture handoff is offline and cannot acquire',()=>{const fixture={...roots,targetKind:'self-test',policyKind:'synthetic-offline-fixture'};assert.throws(()=>runtimeMountPlan('acquire',fixture));assert.equal(runtimeMountPlan('publish-generated',fixture).network,'none');});
test('bridge is v2 content-only with independent mount selection',()=>{assert.deepEqual(bridgeRequest('verify'),{operation:'verify',expected_evidence_kind:'production-source-policy',input_root:'/input'});for(const operation of ['fetch','finalize-manifest'])assert.throws(()=>bridgeRequest(operation));assert.throws(()=>bridgeRequest('replay',{digest:'../escape'}));});
test('selected recipe requires external producer and never uses candidate fields',()=>{
 const asset={evidence_kind:'production-source-policy',manifest_recipe:{producer:null,payload:[{id:'opaque',sha256:digest}]}},binding={producer:{config_sha256:digest,script_sha256:'b'.repeat(64)},selected_asset_sha256:'c'.repeat(64)};
 const selected=selectedPolicy(asset,binding);assert.deepEqual(selected.manifest.producer,binding.producer);assert.equal(asset.manifest_recipe.producer,null);bindProductionProvenance(selected.manifest,selected);
 for(const field of ['producer','payload']){const changed=structuredClone(selected.manifest);changed[field]={changed:true};assert.throws(()=>bindProductionProvenance(changed,selected));}
 assert.throws(()=>selectedPolicy({...asset,manifest_recipe:{producer:binding.producer}},binding));assert.throws(()=>exactKeys({a:1,b:2},['a']));
});
