#!/usr/bin/env node
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runChapterContractCheck,validateChapterContractText,validateChapterContractIntegration} from './check-chapter-contract.mjs';
import {readLocaleConfiguration} from './locale-config.mjs';
import {parseJsonFrontmatter} from './check-site-content.mjs';
import {readRegularFile} from './check-functional-step-receipt.mjs';
import {readFunctionalChapterLocaleConfiguration} from './functional-chapter-locale-config.mjs';
import {demoPaths} from './check-functional-rust-examples.mjs';
import {parseRegistryFragment,readFunctionalPlan,ownedSources} from './check-functional-rust-ownership.mjs';
import {readPrivateBuildScope,privateReviewCandidateForChapter} from './check-functional-site-content.mjs';
import {FIRST_COURSE_ID,PRACTICAL_COURSE_ID,validateCourseChapterIdentity} from './lib/course-boundaries.mjs';

export function contractDispatch(chapterId,{course,historical=false}={}) {
  if (!/^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(chapterId))throw new Error('invalid chapter ID');
  const order=Number(chapterId.slice(0,2));
  if(historical) {
    if(order>85)throw new Error('chapter ID outside historical course range');
    return order<=39?'legacy-demo':'successor-demo';
  }
  if(course) {
    validateCourseChapterIdentity(course,{chapter_id:chapterId,order,locale:course.referenceLocale,
      chapter_kind:order===0?'orientation':'lesson'});
    return course.id===PRACTICAL_COURSE_ID?'practical-demo':'legacy-demo';
  }
  if(order>39)throw new Error('chapter ID outside first course range');
  return 'legacy-demo';
}
export function validateDemoContractBinding(data,plan,{historical=false}={}) {
  if(!historical)throw new Error('historical demo binding requires explicit historical context');
  if(plan.chapters.filter(c=>c.chapter_id===data.chapter_id&&c.order===data.order).length!==1)
    throw new Error('contract chapter/order absent from exact functional plan');
  const demo=demoPaths(data.chapter_id),prefix='rust/demos/'+demo.package+'/';
  if(data.rust.package!==demo.package ||
      !data.rust.sources.includes(demo.source) || !data.rust.sources.includes(demo.library) ||
      data.rust.sources.some(p=>p.startsWith('rust/demos/')&&!p.startsWith(prefix)))
    throw new Error('Successor contract must bind its exact approved demo package/source');
  const owners=ownedSources(plan),filename='ch'+data.chapter_id+'.module';
  const expected=owners.filter(o=>o.fragment===filename).map(o=>o.source).sort();
  if(expected.length&&data.rust.sources.some(p=>p.startsWith('rust/crates/llm-from-scratch/src/')&&
      !expected.includes(p.slice('rust/crates/llm-from-scratch/'.length))))
    throw new Error('contract shared Rust source belongs to another chapter owner');
  return {demo,owners,expected,fragment:expected.length
    ? 'rust/crates/llm-from-scratch/module-registry/functional-v1/'+filename:null};
}
export function checkFunctionalContract(root,path,{structureOnly=false,course=FIRST_COURSE_ID,historical=false}={}) {
  if(!historical)
    return runChapterContractCheck(['--course',course,resolve(root,path),...(structureOnly?['--structure-only']:[])],root);
  const source=readRegularFile(root,path).toString();
  const data=parseJsonFrontmatter(source,path).data;
  if(contractDispatch(data.chapter_id,{historical:true})==='legacy-demo')
    return runChapterContractCheck([resolve(root,path),...(structureOnly?['--structure-only']:[])],root);
  const config=readFunctionalChapterLocaleConfiguration(root);
  const chapter=config.byChapter[data.chapter_id];
  if(!chapter||chapter.order!==data.order)throw new Error('contract chapter/order absent from exact functional plan');
  const privateScope=readPrivateBuildScope(root);
  const privateCandidate=privateReviewCandidateForChapter(privateScope,data.chapter_id);
  const requiredLocales=privateCandidate ? Object.keys(privateCandidate.sourceHashes):chapter.activeLocales;
  // The explicit current private group validates the declared current locales.
  // This is structure only; selectedEN lesson integration never certifiesRU.
  const structuralLocales=privateScope?.schemaVersion===2 && data.chapter_id==='40-reference-core-handoff'
    ? chapter.activeLocales : requiredLocales;
  const parsed=validateChapterContractText(source,{sourceName:path,supportedLocales:structuralLocales});
  const binding=validateDemoContractBinding(data,readFunctionalPlan(root),{historical:true});
  if(structureOnly)return parsed;
  if(binding.fragment) {
    const records=parseRegistryFragment(binding.fragment.split('/').at(-1),
      readRegularFile(root,binding.fragment,65536),binding.owners);
    if(JSON.stringify(records.map(r=>r.source).sort())!==JSON.stringify(binding.expected))
      throw new Error('fragment missing owned source');
  }
  validateChapterContractIntegration(parsed,{repositoryRoot:root,sourceName:path,
    localeConfiguration:{...readLocaleConfiguration(root),locales:requiredLocales},
    chapterLocaleConfiguration:{...config,byChapter:{...config.byChapter,
      [data.chapter_id]:{...chapter,activeLocales:requiredLocales}}}});
  return parsed;
}
export function runFunctionalContractCheck(args,cwd) {
  return runChapterContractCheck(args,cwd).results;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {console.log('Course contracts checked:',runFunctionalContractCheck(process.argv.slice(2),process.cwd()).length);}
  catch(error){console.error(error.message);process.exitCode=1;}
}
