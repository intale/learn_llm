#!/usr/bin/env node
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readdirSync} from 'node:fs';
import {runChapterContractCheck,validateChapterContractText,validateChapterContractIntegration} from './check-chapter-contract.mjs';
import {readLocaleConfiguration} from './locale-config.mjs';
import {parseJsonFrontmatter} from './check-site-content.mjs';
import {readRegularFile} from './check-functional-step-receipt.mjs';
import {readFunctionalChapterLocaleConfiguration} from './functional-chapter-locale-config.mjs';
import {demoPaths} from './check-functional-rust-examples.mjs';
import {parseRegistryFragment,readFunctionalPlan,ownedSources} from './check-functional-rust-ownership.mjs';
import {readPrivateBuildScope} from './check-functional-site-content.mjs';

export function contractDispatch(chapterId) {
  if (!/^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(chapterId))throw new Error('invalid chapter ID');
  const order=Number(chapterId.slice(0,2));
  if(order>85)throw new Error('chapter ID outside course range');
  return order<=39?'legacy-demo':'successor-demo';
}
export function validateDemoContractBinding(data,plan) {
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
export function checkFunctionalContract(root,path,{structureOnly=false}={}) {
  const source=readRegularFile(root,path).toString();
  const data=parseJsonFrontmatter(source,path).data;
  if(contractDispatch(data.chapter_id)==='legacy-demo')
    return runChapterContractCheck([resolve(root,path),...(structureOnly?['--structure-only']:[])],root);
  const config=readFunctionalChapterLocaleConfiguration(root);
  const chapter=config.byChapter[data.chapter_id];
  if(!chapter||chapter.order!==data.order)throw new Error('contract chapter/order absent from exact functional plan');
  const privateScope=readPrivateBuildScope(root);
  const requiredLocales=privateScope?.chapterId===data.chapter_id
    ? Object.keys(privateScope.sourceHashes):chapter.activeLocales;
  const parsed=validateChapterContractText(source,{sourceName:path,supportedLocales:requiredLocales});
  const binding=validateDemoContractBinding(data,readFunctionalPlan(root));
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
  const root=cwd.endsWith('/site')?resolve(cwd,'..'):cwd;
  const structureOnly=args.includes('--structure-only');
  if(args.some(a=>a.startsWith('--')&&a!=='--structure-only'))throw new Error('unknown contract option');
  const paths=args.filter(a=>a!=='--structure-only');
  const selected=paths.length?paths.map(p=>resolve(cwd,p).slice(root.length+1)):
    readdirSync(resolve(root,'curriculum/chapters')).filter(p=>p.endsWith('.md')).map(p=>'curriculum/chapters/'+p);
  return selected.map(p=>checkFunctionalContract(root,p,{structureOnly}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {console.log('Functional/legacy contracts checked:',runFunctionalContractCheck(process.argv.slice(2),process.cwd()).length);}
  catch(error){console.error(error.message);process.exitCode=1;}
}
