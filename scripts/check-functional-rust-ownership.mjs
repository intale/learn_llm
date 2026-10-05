#!/usr/bin/env node
import {existsSync, readdirSync, lstatSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readRegularFile, jsonFile, hash} from './check-functional-step-receipt.mjs';

export function readFunctionalPlan(root) {
  const text = readRegularFile(root, 'curriculum/functional-laptop-llm-extension-plan.md').toString('utf8');
  if (!text.startsWith('---\n') || text.indexOf('\n---', 4) < 0) throw new Error('missing accepted plan frontmatter');
  return JSON.parse(text.slice(4, text.indexOf('\n---', 4)));
}
export function ownedSources(plan) {
  const prefix = 'rust/crates/llm-from-scratch/';
  const exclusions = plan.resource_projection.rust_module_registry_contract.registry_subset;
  const excluded = [...exclusions.exclude_declared_edits, ...exclusions.exclude_auto_discovered_binary];
  // Chapter40's user-approved demo is not a cumulative library module.
  return plan.rust_owners.filter(owner => owner.chapter_id !== '40-reference-core-handoff').flatMap(owner => owner.paths
    .filter(path => path.startsWith(prefix + 'src/') && path.endsWith('.rs') && !excluded.includes(path.slice(prefix.length)))
    .map(path => ({fragment:'ch' + owner.chapter_id + '.module',source:path.slice(prefix.length)})));
}
export function parseRegistryFragment(filename, bytes, owners) {
  if (bytes.length > 65536 || bytes.some(b => b > 127 || b === 13) || !bytes.length ||
      bytes.at(-1) !== 10 || bytes.at(-2) === 10) throw new Error('bounded ASCII/LF fragment required');
  const records = bytes.toString('ascii').slice(0,-1).split('\n\n').map(record => {
    const lines = record.split('\n');
    if (lines.length !== 3 || lines[0] !== 'version=1' ||
        !lines[1].startsWith('module=') || !lines[2].startsWith('source=')) throw new Error('exact three registry lines required');
    const module = lines[1].slice(7), source = lines[2].slice(7);
    if (!/^src\/(?:[a-z_][a-z0-9_]*\/)*[a-z_][a-z0-9_]*\.rs$/.test(source) ||
        module !== 'functional::' + source.slice(4,-3).replaceAll('/', '::') ||
        !owners.some(o => o.fragment === filename && o.source === source)) throw new Error('source/module/owner drift');
    return {module,source};
  });
  if (records.some((r,i) => i && records[i-1].module >= r.module)) throw new Error('duplicate/unsorted module');
  return records;
}
function files(directory) {
  if (!existsSync(directory)) return [];
  const result = [];
  for (const e of readdirSync(directory,{withFileTypes:true})) {
    const full = resolve(directory,e.name);
    if (e.isSymbolicLink()) throw new Error('symlink in Rust input tree');
    if (e.isDirectory()) result.push(...files(full));
    else if (e.isFile()) result.push(full);
    else throw new Error('nonregular Rust input');
  }
  return result.sort();
}
export function checkFunctionalRustOwnership(root) {
  const prefix='rust/crates/llm-from-scratch/', plan=readFunctionalPlan(root), owners=ownedSources(plan);
  const manifest=jsonFile(root,'configs/functional-reference-source-v1.json',32768,true);
  if (Object.keys(manifest.dependencyHashes).length || Object.keys(manifest.sourceHashes).length !== 40)
    throw new Error('reference census must bind exactly40course source files, not dependencies');
  for (const [path,sha] of Object.entries({...manifest.sourceHashes,...manifest.dependencyHashes})) {
    if (hash(readRegularFile(root,path)) !== sha) throw new Error('protected baseline source drift: '+path);
  }
  const seenSources=new Set(),seenModules=new Set();
  for (const full of files(resolve(root,prefix,'module-registry/functional-v1'))) {
    const filename=full.split('/').at(-1), relative=prefix+'module-registry/functional-v1/'+filename;
    const records=parseRegistryFragment(filename,readRegularFile(root,relative,65536),owners);
    const expected=owners.filter(o=>o.fragment===filename).map(o=>o.source).sort();
    if (JSON.stringify(records.map(r=>r.source).sort())!==JSON.stringify(expected)) throw new Error('fragment missing owned source');
    for (const r of records) {
      if (seenSources.has(r.source) || seenModules.has(r.module) ||
          [...seenModules].some(m=>m.startsWith(r.module+'::')||r.module.startsWith(m+'::'))) throw new Error('duplicate/prefix collision');
      readRegularFile(root,prefix+r.source);
      seenSources.add(r.source);seenModules.add(r.module);
    }
  }
  const binaries = plan.resource_projection.rust_infrastructure_owners.map(o=>o.path);
  const autoBinary = plan.resource_projection.rust_module_registry_contract.registry_subset.exclude_auto_discovered_binary.map(p=>prefix+p);
  for (const full of files(resolve(root,prefix,'src')).filter(p=>p.endsWith('.rs'))) {
    const relative=full.slice(resolve(root).length+1);
    if (Object.hasOwn(manifest.sourceHashes,relative) ||
        relative===prefix+'src/lib.rs' || relative===prefix+'src/reference_source_identity.rs' ||
        [...binaries,...autoBinary].includes(relative)) continue;
    const source=relative.slice(prefix.length);
    if (!owners.some(o=>o.source===source) || !seenSources.has(source)) throw new Error('unknown/unregistered source: '+relative);
  }
  const lib=readRegularFile(root,prefix+'src/lib.rs');
  if (hash(lib.subarray(0,1819))!=='d84daa75c403999975a266475788a4969d1c9c4d925b1b8926cc6f16dcf1d9d7' ||
      lib.subarray(1819).toString()!=='\ninclude!(concat!(env!("OUT_DIR"), "/functional-modules.rs"));\n') throw new Error('base lib prefix/sole include drift');
  return {registeredSources:seenSources.size};
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {console.log(checkFunctionalRustOwnership(resolve(dirname(fileURLToPath(import.meta.url)),'..')));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
