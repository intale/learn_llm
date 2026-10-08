#!/usr/bin/env node
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {readRegularFile} from './check-functional-step-receipt.mjs';
import {readFunctionalPlan, checkFunctionalRustOwnership} from './check-functional-rust-ownership.mjs';

export function examplePaths(chapterId) {
  demoPaths(chapterId);
  throw new Error('Functional chapter uses its demo, not a cumulative example');
}
export function demoPaths(chapterId) {
  // This pure path constructor does not authorize execution. Callers must first
  // select the exact chapter ID from their already loaded plan/configuration.
  if (!/^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(chapterId) || Number(chapterId.slice(0,2))<40 ||
      Number(chapterId.slice(0,2))>83) throw new Error('invalid functional chapter');
  const packageName='ch'+chapterId, prefix='rust/demos/'+packageName+'/';
  return {package:packageName,source:prefix+'src/main.rs',library:prefix+'src/lib.rs',
    manifest:prefix+'Cargo.toml',expected:prefix+'expected.txt'};
}
export function validateExampleOutput(actual,expected) {
  if (!Buffer.isBuffer(actual) || !Buffer.isBuffer(expected) || !expected.length || !expected.equals(actual))
    throw new Error('example stdout differs from exact golden bytes');
}
export function demoFixtureInput(root,chapterId) {
  const p=demoPaths(chapterId),path='rust/demos/'+p.package+'/fixtures/prepared.jsonl';
  return existsSync(resolve(root,path))?readRegularFile(root,path,1048576):undefined;
}
export function checkFunctionalRustExamples(root,{chapterId,run=spawnSync}={}) {
  const plan=readFunctionalPlan(root);
  const chapters=plan.chapters.filter(c=>chapterId===undefined||c.chapter_id===chapterId);
  if (chapterId!==undefined && chapters.length!==1) throw new Error('unknown chapter example');
  checkFunctionalRustOwnership(root);
  let count=0;
  for(const c of chapters){
    const p=demoPaths(c.chapter_id);
    if(chapterId===undefined&&!existsSync(resolve(root,p.source)))continue;
    readRegularFile(root,p.source);readRegularFile(root,p.library);readRegularFile(root,p.manifest,65536);
    const expected=readRegularFile(root,p.expected,1048576);
    const stdin=demoFixtureInput(root,c.chapter_id);
    const result=run('cargo',['run','--quiet','--locked','-p',p.package],{cwd:root,shell:false,maxBuffer:1048576,...(stdin===undefined?{}:{input:stdin})});
    if(result.error||result.status!==0)throw new Error('Successor demo failed: '+(result.error?.message??result.stderr?.toString()));
    validateExampleOutput(result.stdout,expected);count++;
  }
  return {examples:count};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {const args=process.argv.slice(2);if(args.length&&!(args.length===1&&args[0]==='--all')&&!(args.length===2&&args[0]==='--chapter'))throw new Error('expected --all or --chapter <id>');
    console.log(checkFunctionalRustExamples(resolve(dirname(fileURLToPath(import.meta.url)),'..'),{chapterId:args[0]==='--chapter'?args[1]:undefined}));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
