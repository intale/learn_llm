// @ts-ignore Node APIs are supplied only by the Playwright runner.
import {existsSync} from 'node:fs';
// @ts-ignore Node APIs are supplied only by the Playwright runner.
import {resolve} from 'node:path';
import base from '../../../src/i18n/chapter-locales.json' with {type:'json'};

declare const process: {cwd():string};
interface PublishedChapter {chapterId:string;order:number;activeLocales:('en'|'ru')[]}
const root=process.cwd().endsWith('/site')?resolve(process.cwd(),'..'):process.cwd();
const published:PublishedChapter[]=[];
let ended=false;
for(const chapter of base.chapters) {
  if(chapter.order>39)throw new Error('First-course browser discovery exceeds its boundary');
  const actual=chapter.activeLocales.filter(locale=>
    existsSync(resolve(root,'site/dist',locale,'course',chapter.chapterId,'index.html')));
  if(!actual.length){ended=true;continue;}
  if(ended)throw new Error('Rendered first-course publication has a gap');
  if(actual.length!==chapter.activeLocales.length)
    throw new Error('First-course publication lacks an active locale');
  published.push({...chapter,activeLocales:actual as ('en'|'ru')[]});
}
// Actual built-route discovery only, never an activation seal or review verdict.
export const publishableChapterLocaleManifest:Omit<typeof base,'chapters'> & {chapters:PublishedChapter[]}={...base,chapters:published};
export function publishedChapterNeighbors(chapterId:string,locale:'en'|'ru') {
  const chapters=published.filter(chapter=>chapter.activeLocales.includes(locale));
  const index=chapters.findIndex(chapter=>chapter.chapterId===chapterId);
  if(index<0)throw new Error('Missing published first-course chapter');
  return {previous:chapters[index-1]??null,next:chapters[index+1]??null};
}
