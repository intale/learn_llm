#!/usr/bin/env node
// Cargo owns resolution, tomllib owns TOML syntax, and Rust owns graph policy.
// From the repository root in the provisioned course image (Cargo, Node and
// Python 3.11+ must already be available; execution does not acquire packages):
//   node scripts/check-practical-dependencies.mjs snapshot --out tmp/observed.json
//     --inventory-out tmp/sources.json [--roles tmp/root-role-records.json]
//   scripts/check-rust-dependencies.sh --approved tmp/root-approved-graph.json
//     --approved-sources tmp/root-approved-sources.json --roles tmp/roles.json
//     --role-reviews tmp/root-source-reviews.json --out tmp/result.json
// Join each displayed command's continuation lines with a shell backslash.
// Outputs must be new root-relative files with existing parent directories.
// A snapshot is an observation, never an approval. The check uses the independent
// approved graph/inventory and role/review arrays supplied by their owner; the
// Rust result keeps full future dependency admission explicitly pending.
import {readdirSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {canonicalJson, hash, jsonFile, readRegularFile} from './lib/bound-files.mjs';

export const PRACTICAL_MANIFEST = 'rust/crates/llm-from-scratch-practical/Cargo.toml';
export const CHECK_EXAMPLE = 'practical-ch09-dependency-error-contract-check';
const utf8Compare = (a,b) => Buffer.compare(Buffer.from(a),Buffer.from(b));
const sortRecords = values => values.sort((a,b) => utf8Compare(canonicalJson(a),canonicalJson(b)));

function run(command,args,{root,input,maxBuffer=32*1024*1024}={}) {
  const result=spawnSync(command,args,{cwd:root,input,encoding:'utf8',maxBuffer,
    env:{...process.env,CARGO_NET_OFFLINE:'true',CARGO_TERM_COLOR:'never'}});
  if(result.error) throw result.error;
  if(result.status!==0) throw new Error(`${command} failed (${result.status}): ${result.stderr.slice(0,2048)}`);
  return result.stdout;
}
function relativeFile(root,absolute) {
  const path=relative(root,absolute).split(sep).join('/');
  readRegularFile(root,path);
  return path;
}
function assertAbsentOutput(root,path) {
  try {readRegularFile(root,path);}
  catch(error) {if(error.code==='ENOENT') return; throw error;}
  throw new Error('Output already exists: '+path);
}
function output(root,path,bytes) {
  assertAbsentOutput(root,path);
  writeFileSync(resolve(root,path),bytes,{flag:'wx'});
}

/** Bind practical source, macros/reexports, its build script and reference inputs. */
export function sourceInventory(root) {
  const crate='rust/crates/llm-from-scratch-practical';
  const referenceManifest='configs/practical-reference-source-v1.json';
  const paths=[crate+'/Cargo.toml',crate+'/build.rs',referenceManifest,'configs/first-course-core-v1.json',
    ...Object.keys(jsonFile(root,referenceManifest).sourceHashes)];
  function walk(path) {
    for(const entry of readdirSync(resolve(root,path),{withFileTypes:true}).sort((a,b)=>utf8Compare(a.name,b.name))) {
      const child=path+'/'+entry.name;
      if(entry.isSymbolicLink()) throw new Error('Symlink in practical source inventory: '+child);
      if(entry.isDirectory()) walk(child);
      else {readRegularFile(root,child);paths.push(child);}
    }
  }
  walk(crate+'/src');
  walk(crate+'/configs');
  return paths.sort(utf8Compare).map(source=>({source,
    sha256:Array.from(Buffer.from(hash(readRegularFile(root,source)),'hex'))}));
}

/** Normalize Cargo's resolved records; do not decide whether a graph is approved. */
export function normalizeCargoMetadata({root,metadata,lockPackages,roles=[],toolchain}) {
  if(!metadata || metadata.version!==1 || !Array.isArray(metadata.packages) ||
      !Array.isArray(metadata.workspace_members) || !Array.isArray(metadata.resolve?.nodes))
    throw new Error('Complete cargo metadata format-version 1 with resolved nodes is required');
  if(resolve(metadata.workspace_root)!==resolve(root)) throw new Error('Cargo metadata workspace root mismatch');
  const packages=new Map(metadata.packages.map(pkg=>[pkg.id,pkg]));
  const nodes=new Map(metadata.resolve.nodes.map(node=>[node.id,node]));
  if(packages.size!==metadata.packages.length || nodes.size!==metadata.resolve.nodes.length)
    throw new Error('Duplicate Cargo metadata identity');
  const roots=metadata.packages.filter(pkg=>metadata.workspace_members.includes(pkg.id) &&
    relative(root,pkg.manifest_path).split(sep).join('/')===PRACTICAL_MANIFEST);
  if(roots.length!==1) throw new Error('Exactly one practical workspace root is required');
  const selected=new Set(),pending=[roots[0].id];
  while(pending.length) {
    const id=pending.pop();
    if(selected.has(id)) continue;
    const node=nodes.get(id);
    if(!node || !packages.has(id) || !Array.isArray(node.deps) || !Array.isArray(node.features))
      throw new Error('Incomplete resolved Cargo package: '+id);
    selected.add(id);
    for(const edge of node.deps) pending.push(edge.pkg);
  }
  const identities=new Map();
  for(const id of selected) {
    const pkg=packages.get(id);
    identities.set(id,pkg.source
      ? `${pkg.source}#${pkg.name}@${pkg.version}`
      : `workspace:${dirname(relativeFile(root,pkg.manifest_path))}#${pkg.name}@${pkg.version}`);
  }
  const records=[];
  for(const id of selected) {
    const pkg=packages.get(id);
    let source,checksum;
    if(pkg.source) {
      const locked=lockPackages.filter(record=>record.name===pkg.name && record.version===pkg.version && record.source===pkg.source);
      if(locked.length!==1 || typeof locked[0].checksum!=='string')
        throw new Error('One exact locked source/checksum is required: '+id);
      source=pkg.source;checksum=locked[0].checksum;
    } else {
      const manifest=relativeFile(root,pkg.manifest_path);
      source='workspace:'+dirname(manifest);
      checksum='manifest-sha256:'+hash(readRegularFile(root,manifest));
    }
    records.push({id:identities.get(id),name:pkg.name,version:pkg.version,source,checksum});
  }
  const edges=[],features=[];
  for(const id of selected) {
    const node=nodes.get(id),from=identities.get(id);
    for(const dependency of node.deps) {
      if(!Array.isArray(dependency.dep_kinds) || dependency.dep_kinds.length===0)
        throw new Error('Resolved Cargo edge lacks dependency-kind observations');
      for(const detail of dependency.dep_kinds) {
        const kind=detail.kind??'normal',target=detail.target??null,to=identities.get(dependency.pkg);
        if(!['normal','build','dev'].includes(kind) || typeof dependency.name!=='string' || !to)
          throw new Error('Malformed resolved Cargo dependency edge');
        const value={from,to,alias:dependency.name,kind,target};
        edges.push({id:'cargo-edge:'+hash(Buffer.from(canonicalJson(value))),...value});
      }
    }
    for(const feature of node.features) features.push({package:from,feature});
  }
  return {schema_version:1,context:{
    id:'practical-default-workspace-resolution-all-targets-v1',toolchain,
    targets:['all-targets-no-platform-filter'],roots:[identities.get(roots[0].id)],
    feature_request:['cargo-metadata-workspace-default-features'],
    dependency_kinds:['normal','build','dev'],policy_revision:'practical-ch09-local-contract-v1',
  },packages:sortRecords(records),edges:sortRecords(edges),features:sortRecords(features),roles};
}

export function collectSnapshot(root,{roles=[]}={}) {
  readRegularFile(root,'Cargo.toml');readRegularFile(root,'Cargo.lock');
  const metadata=JSON.parse(run('cargo',['metadata','--format-version','1','--locked','--offline'],{root}));
  // Python's existing standard-library parser decodes only the locked TOML syntax.
  const lock=JSON.parse(run('python3',['-c',
    'import json,sys,tomllib; print(json.dumps(tomllib.load(open(sys.argv[1],"rb"))))',
    resolve(root,'Cargo.lock')],{root}));
  const toolchain=run('cargo',['--version'],{root}).trim()+'; '+run('rustc',['--version','--verbose'],{root}).trim();
  const observed=normalizeCargoMetadata({root,metadata,lockPackages:lock.package,roles,toolchain});
  return {observed,sources:sourceInventory(root),metadata};
}

export function runPracticalDependencyCli(args,{cwd=process.cwd(),stdout=process.stdout,stderr=process.stderr}={}) {
  const {values,positionals}=parseArgs({args,allowPositionals:true,options:Object.fromEntries(
    ['root','out','inventory-out','metadata-out','approved','approved-sources','roles','role-reviews'].map(name=>[name,{type:'string'}]))});
  const [action]=positionals,root=resolve(values.root??cwd);
  if(positionals.length!==1 || !['snapshot','check'].includes(action) || !values.out)
    throw new Error('Usage: check-practical-dependencies.mjs snapshot|check --out ROOT_RELATIVE_PATH [options]');
  if(action==='snapshot' && !values['inventory-out']) throw new Error('snapshot requires --inventory-out');
  if(action==='check' && ['approved','approved-sources','roles','role-reviews'].some(name=>!values[name]))
    throw new Error('check requires separate --approved, --approved-sources, --roles and --role-reviews records');
  const outputs=['out','inventory-out','metadata-out'].flatMap(name=>values[name]?[values[name]]:[]);
  if(new Set(outputs).size!==outputs.length) throw new Error('Output paths must be distinct');
  for(const path of outputs) assertAbsentOutput(root,path);
  const roles=values.roles?jsonFile(root,values.roles):[];
  const observation=collectSnapshot(root,{roles});
  if(values['inventory-out']) output(root,values['inventory-out'],canonicalJson(observation.sources));
  if(values['metadata-out']) output(root,values['metadata-out'],canonicalJson(observation.metadata));
  if(action==='snapshot') {
    output(root,values.out,canonicalJson(observation.observed));
    stdout.write(canonicalJson({status:'observed',approval:'not-issued',packages:observation.observed.packages.length,
      edges:observation.observed.edges.length,features:observation.observed.features.length,sources:observation.sources.length}));
    return 0;
  }
  const request={schema_version:1,approved:jsonFile(root,values.approved),observed:observation.observed,
    approved_sources:jsonFile(root,values['approved-sources']),sources:observation.sources,
    source_role_reviews:jsonFile(root,values['role-reviews'])};
  const result=spawnSync('cargo',['run','--quiet','--locked','--offline','-p','practical-ch09-dependency-error-contract','--example',CHECK_EXAMPLE],
    {cwd:root,input:canonicalJson(request),encoding:'utf8',maxBuffer:4*1024*1024,
      env:{...process.env,CARGO_NET_OFFLINE:'true',CARGO_TERM_COLOR:'never'}});
  if(result.error) throw result.error;
  if(result.stderr) stderr.write(result.stderr);
  const diagnostic=JSON.parse(result.stdout);
  if(![0,1].includes(result.status) || diagnostic.status!==(result.status===0?'matched':'rejected'))
    throw new Error('Rust checker did not return a typed complete result');
  output(root,values.out,result.stdout);
  stdout.write(result.stdout);
  return result.status;
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {process.exitCode=runPracticalDependencyCli(process.argv.slice(2));}
  catch(error) {process.stderr.write('Practical dependency adapter: '+error.message+'\n');process.exitCode=2;}
}
