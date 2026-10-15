import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeCargoMetadata,PRACTICAL_MANIFEST,runPracticalDependencyCli,sourceInventory} from '../check-practical-dependencies.mjs';

const repository=fileURLToPath(new URL('../../',import.meta.url));
function fixture(t) {
  const root=mkdtempSync(resolve(repository,'tmp/practical-dependency-adapter-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const crate=resolve(root,'rust/crates/llm-from-scratch-practical');
  mkdirSync(crate+'/src',{recursive:true});mkdirSync(crate+'/configs');
  writeFileSync(crate+'/Cargo.toml','[package]\nname="llm-from-scratch-practical"\nversion="0.1.0"\n');
  writeFileSync(crate+'/build.rs','fn main() {}\n');
  writeFileSync(crate+'/src/lib.rs','pub use serde_json as syntax;\n');
  writeFileSync(crate+'/configs/profiles.conf','schema_version = 1\n');
  mkdirSync(root+'/configs');mkdirSync(root+'/rust/crates/llm-from-scratch/src',{recursive:true});
  writeFileSync(root+'/rust/crates/llm-from-scratch/src/lib.rs','// fixed reference fixture\n');
  writeFileSync(root+'/configs/practical-reference-source-v1.json',JSON.stringify({sourceHashes:{'rust/crates/llm-from-scratch/src/lib.rs':'fixture-reference-hash'}})+'\n');
  writeFileSync(root+'/configs/first-course-core-v1.json','{"source":"fixed reference fixture"}\n');
  const registry='registry+https://github.com/rust-lang/crates.io-index';
  const rootId='path+file://'+crate+'#llm-from-scratch-practical@0.1.0';
  const jsonId=registry+'#serde_json@1.0.151',unusedId=registry+'#unselected@1.0.0';
  const metadata={version:1,workspace_root:root,workspace_members:[rootId],packages:[
    {id:rootId,name:'llm-from-scratch-practical',version:'0.1.0',source:null,manifest_path:crate+'/Cargo.toml'},
    {id:jsonId,name:'serde_json',version:'1.0.151',source:registry,manifest_path:'/cached/serde_json/Cargo.toml'},
    {id:unusedId,name:'unselected',version:'1.0.0',source:registry,manifest_path:'/cached/unselected/Cargo.toml'},
  ],resolve:{nodes:[
    {id:rootId,features:[],deps:[{name:'syntax_alias',pkg:jsonId,dep_kinds:[{kind:null,target:null}]}]},
    {id:jsonId,features:['std'],deps:[]},
    {id:unusedId,features:['unselected-feature'],deps:[]},
  ]}};
  const lockPackages=[{name:'serde_json',version:'1.0.151',source:registry,checksum:'a'.repeat(64)}];
  return {root,crate,metadata,lockPackages,rootId,jsonId,registry,toolchain:'frozen fixture toolchain'};
}

test('retains the exact resolved reachable graph without approving it or importing disconnected packages',t=>{
  const f=fixture(t),snapshot=normalizeCargoMetadata(f);
  assert.deepEqual(snapshot.packages.map(p=>p.name).sort(),['llm-from-scratch-practical','serde_json']);
  assert.equal(snapshot.edges.length,1);
  assert.equal(snapshot.edges[0].alias,'syntax_alias');
  assert.equal(snapshot.edges[0].kind,'normal');
  assert.equal(snapshot.edges[0].target,null);
  assert.deepEqual(snapshot.features,[{package:f.registry+'#serde_json@1.0.151',feature:'std'}]);
  assert.deepEqual(snapshot.roles,[]);
  assert.equal(Object.hasOwn(snapshot,'source_role_reviews'),false);
  assert.equal(Object.hasOwn(snapshot,'admitted'),false);
});

test('preserves aliases, normal/build edges and target conditions as separate observations',t=>{
  const f=fixture(t);
  f.metadata.resolve.nodes[0].deps[0].dep_kinds.push({kind:'build',target:'cfg(target_os = "windows")'});
  const snapshot=normalizeCargoMetadata(f);
  assert.equal(new Set(snapshot.edges.map(edge=>edge.id)).size,2);
  assert.deepEqual(snapshot.edges.map(edge=>[edge.alias,edge.kind,edge.target]).sort(),[
    ['syntax_alias','build','cfg(target_os = "windows")'],['syntax_alias','normal',null],
  ]);
});

test('uses exact source/version lock identities rather than selecting a checksum by package name',t=>{
  const f=fixture(t),alternate='registry+https://example.invalid/approved-fixture-index';
  const id=alternate+'#serde_json@1.0.151';
  f.metadata.packages.push({id,name:'serde_json',version:'1.0.151',source:alternate,manifest_path:'/cached/alternate/Cargo.toml'});
  f.metadata.resolve.nodes.push({id,features:[],deps:[]});
  f.metadata.resolve.nodes[0].deps.push({name:'other_syntax',pkg:id,dep_kinds:[{kind:null,target:null}]});
  f.lockPackages.push({name:'serde_json',version:'1.0.151',source:alternate,checksum:'b'.repeat(64)});
  const snapshot=normalizeCargoMetadata(f);
  assert.equal(snapshot.packages.find(p=>p.source===f.registry).checksum,'a'.repeat(64));
  assert.equal(snapshot.packages.find(p=>p.source===alternate).checksum,'b'.repeat(64));
});

test('normalizes only local path prefixes and keeps the declared independent role records unchanged',t=>{
  const f=fixture(t),roles=[{id:'root-reviewed-role',subject:{kind:'edge',edge:'root-frozen-edge'},role:'json',course_validation:null}];
  const snapshot=normalizeCargoMetadata({...f,roles});
  assert.equal(snapshot.context.roots[0],'workspace:rust/crates/llm-from-scratch-practical#llm-from-scratch-practical@0.1.0');
  assert.equal(JSON.stringify(snapshot).includes(f.root),false);
  assert.deepEqual(snapshot.roles,roles);
  assert.equal(snapshot.context.toolchain,'frozen fixture toolchain');
});

test('refuses incomplete metadata, changed workspace roots and missing or ambiguous locked checksums',t=>{
  const f=fixture(t);
  assert.throws(()=>normalizeCargoMetadata({...f,metadata:{...f.metadata,resolve:null}}),/Complete cargo metadata/);
  assert.throws(()=>normalizeCargoMetadata({...f,metadata:{...f.metadata,workspace_root:'/different'}}),/root mismatch/);
  assert.throws(()=>normalizeCargoMetadata({...f,lockPackages:[]}),/exact locked source\/checksum/);
  assert.throws(()=>normalizeCargoMetadata({...f,lockPackages:[...f.lockPackages,...f.lockPackages]}),/exact locked source\/checksum/);
  f.metadata.resolve.nodes[0].deps[0].pkg='missing-node';
  assert.throws(()=>normalizeCargoMetadata(f),/Incomplete resolved Cargo package/);
});

test('inventories every source, reexport/macro owner, shipped config and manifest with measured bytes',t=>{
  const f=fixture(t);
  writeFileSync(f.crate+'/src/reexports.rs','pub use crate::syntax;\nmacro_rules! m { () => {} }\n');
  const first=sourceInventory(f.root);
  assert.deepEqual(first.map(row=>row.source),[
    'configs/first-course-core-v1.json',
    'configs/practical-reference-source-v1.json',
    PRACTICAL_MANIFEST,
    'rust/crates/llm-from-scratch-practical/build.rs',
    'rust/crates/llm-from-scratch-practical/configs/profiles.conf',
    'rust/crates/llm-from-scratch-practical/src/lib.rs',
    'rust/crates/llm-from-scratch-practical/src/reexports.rs',
    'rust/crates/llm-from-scratch/src/lib.rs',
  ]);
  writeFileSync(f.crate+'/src/reexports.rs','pub use crate::syntax;\nmacro_rules! m { () => { 1 } }\n');
  const changed=sourceInventory(f.root);
  const changedSource='rust/crates/llm-from-scratch-practical/src/reexports.rs';
  assert.notDeepEqual(changed.find(row=>row.source===changedSource).sha256,first.find(row=>row.source===changedSource).sha256);
  assert.deepEqual(changed.filter(row=>row.source!==changedSource),first.filter(row=>row.source!==changedSource));
  writeFileSync(f.crate+'/src/new-owner.rs','pub fn added() {}\n');
  assert.equal(sourceInventory(f.root).length,9);
});

test('rejects symlinked source observations instead of silently omitting them',t=>{
  const f=fixture(t);
  symlinkSync('lib.rs',f.crate+'/src/alias.rs');
  assert.throws(()=>sourceInventory(f.root),/Symlink in practical source inventory/);
});

test('requires independently supplied approval inputs and refuses output reuse before invoking Cargo',t=>{
  const f=fixture(t);
  assert.throws(()=>runPracticalDependencyCli(['check','--out','result.json'],{cwd:f.root}),/separate --approved/);
  assert.throws(()=>runPracticalDependencyCli(['snapshot','--out','result.json'],{cwd:f.root}),/requires --inventory-out/);
  writeFileSync(f.root+'/existing.json','preserve exact previous bytes\n');
  assert.throws(()=>runPracticalDependencyCli(['snapshot','--out','existing.json','--inventory-out','sources.json'],{cwd:f.root}),/Output already exists/);
  assert.equal(readFileSync(f.root+'/existing.json','utf8'),'preserve exact previous bytes\n');
});
