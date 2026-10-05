#!/usr/bin/env node
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {readRegularFile} from './check-functional-step-receipt.mjs';
import {readFunctionalPlan, checkFunctionalRustOwnership} from './check-functional-rust-ownership.mjs';

export function examplePaths(chapterId) {
  if (!/^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(chapterId) || Number(chapterId.slice(0,2))<40 ||
      Number(chapterId.slice(0,2))>85) throw new Error('invalid functional chapter');
  if(chapterId==='40-reference-core-handoff')throw new Error('Chapter40 uses its demo, not a cumulative example');
  const example='ch'+chapterId.replaceAll('-','_');
  const root='rust/crates/llm-from-scratch/';
  return {example,source:root+'examples/'+example+'.rs',expected:root+'examples/expected/'+example+'.txt',
    fragment:root+'module-registry/functional-v1/ch'+chapterId+'.module'};
}
export function demoPaths(chapterId) {
  if(chapterId!=='40-reference-core-handoff')throw new Error('only Chapter40 has the successor demo exception');
  return {package:'ch40-reference-core-handoff',source:'rust/demos/ch40-reference-core-handoff/src/main.rs',
    library:'rust/demos/ch40-reference-core-handoff/src/lib.rs',
    manifest:'rust/demos/ch40-reference-core-handoff/Cargo.toml',expected:'rust/demos/ch40-reference-core-handoff/expected.txt'};
}
export function validateExampleOutput(actual,expected) {
  if (!Buffer.isBuffer(actual) || !Buffer.isBuffer(expected) || !expected.length || !expected.equals(actual))
    throw new Error('example stdout differs from exact golden bytes');
}
export function checkFunctionalRustExamples(root,{chapterId,run=spawnSync}={}) {
  checkFunctionalRustOwnership(root);
  const chapters=readFunctionalPlan(root).chapters.filter(c=>!chapterId||c.chapter_id===chapterId);
  if (chapterId && chapters.length!==1) throw new Error('unknown chapter example');
  let count=0;
  for(const c of chapters){
    if(c.chapter_id==='40-reference-core-handoff') {
      const p=demoPaths(c.chapter_id);
      if(!chapterId&&!existsSync(resolve(root,p.source)))continue;
      readRegularFile(root,p.source);readRegularFile(root,p.library);readRegularFile(root,p.manifest,65536);
      const expected=readRegularFile(root,p.expected,1048576);
      const result=run('cargo',['run','--quiet','--locked','-p',p.package],{cwd:root,shell:false,maxBuffer:1048576});
      if(result.error||result.status!==0)throw new Error('Chapter40 demo failed: '+(result.error?.message??result.stderr?.toString()));
      validateExampleOutput(result.stdout,expected);count++;continue;
    }
    const p=examplePaths(c.chapter_id);
    if(!chapterId&&!existsSync(resolve(root,p.source)))continue;
    readRegularFile(root,p.source);readRegularFile(root,p.fragment,65536);
    const expected=readRegularFile(root,p.expected,1048576);
    const result=run('cargo',['run','--quiet','--locked','-p','llm-from-scratch','--example',p.example],
      {cwd:root,shell:false,maxBuffer:1048576});
    if(result.error||result.status!==0)throw new Error('functional example failed: '+(result.error?.message??result.stderr?.toString()));
    validateExampleOutput(result.stdout,expected);count++;
  }
  return {examples:count};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {const args=process.argv.slice(2);if(args.length&&!(args.length===1&&args[0]==='--all')&&!(args.length===2&&args[0]==='--chapter'))throw new Error('expected --all or --chapter <id>');
    console.log(checkFunctionalRustExamples(resolve(dirname(fileURLToPath(import.meta.url)),'..'),{chapterId:args[0]==='--chapter'?args[1]:undefined}));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
