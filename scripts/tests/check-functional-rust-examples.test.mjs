import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {examplePaths,demoPaths,validateExampleOutput,checkFunctionalRustExamples} from '../check-functional-rust-examples.mjs';
import {readFunctionalPlan} from '../check-functional-rust-ownership.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const plan=readFunctionalPlan(root);

test('all46 exact planned functional IDs map to their chapter-specific demo',()=>{
  assert.equal(plan.chapters.length,46);
  for(const chapter of plan.chapters) {
    const id=chapter.chapter_id,prefix='rust/demos/ch'+id+'/';
    assert.deepEqual(demoPaths(id),{package:'ch'+id,source:prefix+'src/main.rs',
      library:prefix+'src/lib.rs',manifest:prefix+'Cargo.toml',expected:prefix+'expected.txt'});
    assert.throws(()=>examplePaths(id),/demo, not a cumulative example/);
  }
});

test('pure path construction checks syntax/range but is not execution authority',()=>{
  assert.equal(demoPaths('42-unapproved-demo').package,'ch42-unapproved-demo');
  for(const id of ['../40-ref','39-old','86-extra','40_bad','40-x/../../','',undefined])
    assert.throws(()=>demoPaths(id));
});

test('unknown/malformed/unsafe selections refuse before ownership/source access or Cargo',t=>{
  const fixture=mkdtempSync(join(tmpdir(),'functional-demo-selection-'));
  t.after(()=>rmSync(fixture,{recursive:true,force:true}));
  mkdirSync(join(fixture,'curriculum'),{recursive:true});
  writeFileSync(join(fixture,'curriculum/functional-laptop-llm-extension-plan.md'),
    readFileSync(join(root,'curriculum/functional-laptop-llm-extension-plan.md')));
  let calls=0;
  for(const chapterId of ['40-unapproved-demo','41-unapproved-demo','42-unapproved-demo',
    '85-unapproved-demo','39-old','86-extra','../40-ref','40_bad','40-x/../../',''])
    assert.throws(()=>checkFunctionalRustExamples(fixture,{chapterId,run:()=>{calls++;}}),/unknown chapter example/);
  assert.equal(calls,0);
  assert.equal(existsSync(join(fixture,'rust')),false);
});

test('--all runs each implemented exact demo and compares its actual selected golden',()=>{
  const calls=[];
  const result=checkFunctionalRustExamples(root,{run:(command,args,options)=>{
    assert.equal(command,'cargo');
    assert.equal(options.cwd,root);assert.equal(options.shell,false);
    assert.deepEqual(args.slice(0,4),['run','--quiet','--locked','-p']);
    assert.equal(args.length,5);
    const id=args[4].slice(2);
    assert.ok(plan.chapters.some(c=>c.chapter_id===id));
    calls.push(id);
    return {status:0,stdout:readFileSync(join(root,demoPaths(id).expected))};
  }});
  const implemented=plan.chapters.filter(c=>existsSync(join(root,demoPaths(c.chapter_id).source)))
    .map(c=>c.chapter_id);
  assert.deepEqual(calls,implemented);assert.equal(result.examples,implemented.length);
  assert.ok(calls.includes('40-reference-core-handoff'));assert.ok(calls.includes('41-governed-corpus-acquisition'));
});

test('a selected known absent demo fails rather than falling back to cumulative examples',()=>{
  const absent=plan.chapters.find(c=>!existsSync(join(root,demoPaths(c.chapter_id).source)));
  assert.ok(absent,'fixture requires a future chapter not yet implemented');
  let calls=0;
  assert.throws(()=>checkFunctionalRustExamples(root,{chapterId:absent.chapter_id,run:()=>{calls++;}}));
  assert.equal(calls,0);
});

test('failed Cargo and stdout byte drift are not acceptance',()=>{
  const chapterId='41-governed-corpus-acquisition';
  assert.throws(()=>checkFunctionalRustExamples(root,{chapterId,run:()=>({status:1,stderr:Buffer.from('fixture failure')})}),/Successor demo failed/);
  assert.throws(()=>checkFunctionalRustExamples(root,{chapterId,run:()=>({status:0,stdout:Buffer.from('wrong\n')})}),/stdout differs/);
});

test('stdout is compared as exact bytes, not trimmed or projected',()=>{
  validateExampleOutput(Buffer.from('ok\n'),Buffer.from('ok\n'));
  for(const bytes of ['ok','ok\n\n','different\n',' ok\n'])
    assert.throws(()=>validateExampleOutput(Buffer.from(bytes),Buffer.from('ok\n')));
});
