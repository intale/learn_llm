#!/usr/bin/env node
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readdirSync} from 'node:fs';
import {runChapterContractCheck,validateChapterContractText,validateContractLesson,validateExpectedOutput,validateChapterContractIntegration} from './check-chapter-contract.mjs';
import {readLocaleConfiguration} from './locale-config.mjs';
import {parseJsonFrontmatter,validateChapterDocument} from './check-site-content.mjs';
import {readRegularFile} from './check-functional-step-receipt.mjs';
import {readFunctionalChapterLocaleConfiguration} from './functional-chapter-locale-config.mjs';
import {examplePaths} from './check-functional-rust-examples.mjs';
import {parseRegistryFragment,readFunctionalPlan,ownedSources} from './check-functional-rust-ownership.mjs';
import {readPrivateBuildScope} from './check-functional-site-content.mjs';

export function contractDispatch(chapterId) {
  if (!/^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(chapterId))throw new Error('invalid chapter ID');
  if(chapterId==='40-reference-core-handoff')return 'successor-demo';
  return Number(chapterId.slice(0,2))<=39?'legacy-demo':'functional-example';
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
  if(contractDispatch(data.chapter_id)==='successor-demo') {
    const prefix='rust/demos/ch40-reference-core-handoff/';
    if(data.rust.package!=='ch40-reference-core-handoff' ||
        !data.rust.sources.includes(prefix+'src/main.rs') ||
        !data.rust.sources.includes(prefix+'src/lib.rs') ||
        data.rust.sources.some(p=>p.startsWith('rust/demos/')&&!p.startsWith(prefix)))
      throw new Error('Chapter40 contract must bind its exact demo package/source');
    if(structureOnly)return parsed;
    validateChapterContractIntegration(parsed,{repositoryRoot:root,sourceName:path,
      localeConfiguration:{...readLocaleConfiguration(root),locales:requiredLocales},
      chapterLocaleConfiguration:{...config,byChapter:{...config.byChapter,
        [data.chapter_id]:{...chapter,activeLocales:requiredLocales}}}});
    return parsed;
  }
  const p=examplePaths(data.chapter_id);
  if(data.rust.package!=='llm-from-scratch' ||
      !data.rust.sources.some(path=>path.startsWith('rust/crates/llm-from-scratch/src/')))
    throw new Error('functional contract must bind cumulative crate and actual owned source');
  if(structureOnly)return parsed;
  readRegularFile(root,p.source);
  validateExpectedOutput(data,readRegularFile(root,p.expected).toString(),path);
  parseRegistryFragment(p.fragment.split('/').at(-1),readRegularFile(root,p.fragment),ownedSources(readFunctionalPlan(root)));
  for(const locale of requiredLocales) {
    const lessonPath='site/src/content/chapters/'+locale+'/'+data.chapter_id+'.mdx';
    const lesson=validateChapterDocument(readRegularFile(root,lessonPath).toString(),{
      sourceName:lessonPath,repositoryRoot:root,checkSourceFiles:true,supportedLocales:requiredLocales});
    validateContractLesson(parsed.data,lesson,locale,lessonPath);
  }
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
