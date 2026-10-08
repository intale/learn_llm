// @ts-ignore Node APIs are supplied only by the Playwright runner.
import {existsSync} from 'node:fs';
// @ts-ignore Node APIs are supplied only by the Playwright runner.
import {resolve} from 'node:path';
import base from '../../../src/i18n/chapter-locales.json' with {type:'json'};
import functional from '../../../src/i18n/functional-chapter-locales.json' with {type:'json'};
// @ts-ignore Shared filesystem-neutral composition.
import {composeChapterConfigurations} from '../../../src/lib/functional-course-publication.mjs';
// @ts-ignore Maintained private-stage descriptor binding.
import {readPrivateBuildScope,privateReviewCandidateForChapter} from '../../../../scripts/check-functional-site-content.mjs';

declare const process: {cwd():string};
interface PublishedChapter {chapterId:string;order:number;activeLocales:('en'|'ru')[]}
const root=process.cwd().endsWith('/site')?resolve(process.cwd(),'..'):process.cwd();
const configuration=composeChapterConfigurations({...base,byChapter:Object.fromEntries(base.chapters.map(c=>[c.chapterId,c]))},functional);
const privateScope=readPrivateBuildScope(root);
const published:PublishedChapter[]=[];
let ended=false;
for(const chapter of configuration.chapters) {
  const actual=chapter.activeLocales.filter((locale:string)=>
    existsSync(resolve(root,'site/dist',locale,'course',chapter.chapterId,'index.html')));
  if(!actual.length){ended=true;continue;}
  if(ended)throw new Error('Rendered publication has a gap');
  const privateCandidate=privateReviewCandidateForChapter(privateScope,chapter.chapterId);
  if(actual.length!==chapter.activeLocales.length &&
      !(privateCandidate&&JSON.stringify(actual)===JSON.stringify(Object.keys(privateCandidate.sourceHashes))))
    throw new Error('Partial active-locale publication outside private review');
  published.push({...chapter,activeLocales:actual});
}
// Browser discovery only, never an activation seal or semantic approval.
export const publishableChapterLocaleManifest:Omit<typeof base,'chapters'> & {chapters:PublishedChapter[]}={...configuration,chapters:published};
export function publishedChapterNeighbors(chapterId:string,locale:'en'|'ru') {
  const chapters=published.filter(c=>c.activeLocales.includes(locale));
  const index=chapters.findIndex(c=>c.chapterId===chapterId);
  if(index<0)throw new Error('Missing published chapter');
  return {previous:chapters[index-1]??null,next:chapters[index+1]??null};
}
