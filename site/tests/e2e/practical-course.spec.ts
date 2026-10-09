import {expect,test,type Locator,type Page} from '@playwright/test';
// @ts-ignore Node filesystem APIs are supplied only by Playwright.
import {readFileSync} from 'node:fs';
// @ts-ignore The maintained parser is a Node module, shared with content checks.
import {parseJsonFrontmatter} from '../../../scripts/check-site-content.mjs';
import {auditDiagramContainment} from './helpers/diagram-containment';
import {expectNoPageOverflow,expectOnlySharedDiagramClientScript,expectSeoDescription,expectStackedDiagramText} from './chapter-helpers';

const prefix='/en/practical-llm-in-rust/';
const ids=['00-course-structure','01-reference-core-handoff','02-corpus-preparation'] as const;
const documents=ids.map(id=>({id,path:prefix+id+'/',data:parseJsonFrontmatter(
  readFileSync(new URL('../../src/content/practical-chapters/en/'+id+'.mdx',import.meta.url),'utf8'),id).data}));
const reference=JSON.parse(readFileSync(new URL('../../../rust/demos/practical-ch01-reference-core-handoff/expected.txt',import.meta.url),'utf8'));
const corpusTrace=JSON.parse(readFileSync(new URL('../../../artifacts/functional-laptop/chapters/41-corpus-preparation/corpus-preparation-trace.json',import.meta.url),'utf8'));
const home=JSON.parse(readFileSync(new URL('../../src/i18n/catalogs/en.json',import.meta.url),'utf8'));
const russianHome=JSON.parse(readFileSync(new URL('../../src/i18n/catalogs/ru.json',import.meta.url),'utf8'));
const lessons=documents.slice(1).map(document=>({...document,
  figureId:document.data.visualization.id,
  boxCount:document.id===ids[1]?3:7,
  sheet:JSON.parse(readFileSync(new URL('../../src/content/practical-cheat-sheets/en/'+document.id+'.json',import.meta.url),'utf8'))}));
const figureFor=(page:Page,id:string)=>page.locator('figure[data-visualization-id="'+id+'"]');

async function auditOrdinaryLayout(container:Locator) {
 return container.evaluate(root=>{
  const errors:string[]=[],records:unknown[]=[];
  const visible=(element:HTMLElement)=>{const style=getComputedStyle(element);return element.getClientRects().length>0&&style.display!=='none'&&style.visibility!=='hidden'&&!element.closest('dialog:not([open])');};
  for(const element of root.querySelectorAll<HTMLElement>('p,h1,h2,h3,h4,li,th,td,.feature-card,a[rel="prev"],a[rel="next"]')){
   if(!visible(element))continue;
   const style=getComputedStyle(element),box=element.getBoundingClientRect();
   if([style.overflowX,style.overflowY].some(value=>value==='hidden'||value==='clip')||style.textOverflow==='ellipsis')errors.push('concealed ordinary content');
   const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
   while(walker.nextNode()){
    const parent=walker.currentNode.parentElement;
    if(!parent||!visible(parent)||!walker.currentNode.textContent?.trim()||parent.closest('.katex,.visually-hidden,pre'))continue;
    const range=document.createRange();range.selectNodeContents(walker.currentNode);
    for(const rect of range.getClientRects())if(rect.width>0&&(rect.left<box.left-2||rect.right>box.right+2))errors.push('ordinary ink outside its containing box');
   }
  }
  for(const formula of root.querySelectorAll<HTMLElement>('.katex-display')){
   if(!visible(formula))continue;
   const box=formula.getBoundingClientRect(),ink=formula.querySelector<HTMLElement>('.katex-html');
   if(!ink){errors.push('formula has no painted HTML');continue;}
   if(formula.clientHeight===0)errors.push('formula has no readable height');
   const walker=document.createTreeWalker(ink,NodeFilter.SHOW_TEXT);
   const rects:DOMRect[]=[];
   while(walker.nextNode()){const range=document.createRange();range.selectNodeContents(walker.currentNode);rects.push(...[...range.getClientRects()].filter(rect=>rect.width>0&&rect.height>0));}
   for(const rect of rects)if(rect.top<box.top-2||rect.bottom>box.bottom+2)errors.push('formula ink outside its vertical box');
   const style=getComputedStyle(formula);
   if(formula.scrollWidth>formula.clientWidth+2&&!['auto','scroll'].includes(style.overflowX))errors.push('formula horizontal travel lacks a scroll owner');
   if(rects.length===0)errors.push('formula has no painted text');
   records.push({kind:'formula',clientWidth:formula.clientWidth,scrollWidth:formula.scrollWidth,height:box.height,paintedRects:rects.length});
  }
  for(const command of root.querySelectorAll<HTMLElement>('pre[data-language="sh"]')){
   const box=command.getBoundingClientRect(),style=getComputedStyle(command);
   if(box.left<-2||box.right>innerWidth+2)errors.push('command outside viewport');
   if(['hidden','clip'].includes(style.overflowX)||style.textOverflow==='ellipsis')errors.push('concealed command');
   if(command.scrollWidth>command.clientWidth+2&&!['auto','scroll'].includes(style.overflowX))errors.push('command has no horizontal scroll owner');
   records.push({kind:'command',clientWidth:command.clientWidth,scrollWidth:command.scrollWidth});
  }
  return {errors,records};
 });
}

test('English chooser and course indexes use independent current routes',async({page,request})=>{
 await page.goto('/en/');
 const chooser=page.locator('[data-course-selection]');await expect(chooser).toHaveCount(1);
 await expect(chooser.locator('h2')).toHaveText(home.courseSelectionTitle);
 await expect(chooser.locator('[data-course-id]')).toHaveCount(2);
 await expect(chooser.locator('a.course-cta')).toHaveCount(2);
 await expect(page.locator('a.course-cta')).toHaveCount(2);
 await expect(page.locator('.course-actions a.course-cta')).toHaveCount(0);
 await expect(chooser.locator('[data-course-id="llm-from-scratch"] .course-cta')).toHaveAttribute('href','/en/course/00-llm-parts/');
 const practical=chooser.locator('[data-course-id="practical-llm-in-rust"] .course-cta');
 await expect(practical).toHaveAttribute('href',prefix+ids[0]+'/');await expect(practical).toHaveAttribute('hreflang','en');
 expect(await practical.getAttribute('lang')).toBeNull();
 await page.goto('/en/course/');
 const first=await page.locator('.course-list .feature-number').allTextContents();
 expect(first.map(Number)).toEqual(Array.from({length:40},(_,index)=>index));
 await expect(page.locator('a[href^="/en/course/40-"]')).toHaveCount(0);
 await page.goto('/en/course/39-end-to-end-llm/');await expect(page.locator('a[rel="next"]')).toHaveCount(0);
 await page.goto(prefix);await expect(page.locator('h1')).toHaveText(home.practicalCourseTitle);
 expect((await page.locator('.course-list .feature-number').allTextContents()).map(Number)).toEqual([0,1,2]);
 for(const document of documents)await expect(page.locator('a[href="'+document.path+'"]')).toHaveCount(1);
 await expect(page.locator('head link[hreflang="ru"]')).toHaveCount(0);
 await expect(page.locator('[data-locale="ru"]')).toHaveAttribute('href','/ru/');
 for(const route of ['/ru/practical-llm-in-rust/',prefix+'03-scalable-bpe-tokenizer/','/en/course/40-reference-core-handoff/','/en/course/41-corpus-preparation/'])expect((await request.get(route)).status()).toBe(404);
});

test('Practical orientation has a scoped ordered path without lesson widgets',async({page})=>{
 const document=documents[0];await page.goto(document.path);
 await expect(page.locator('h1')).toHaveText(document.data.title);await expectSeoDescription(page,document.data.description);
 const article=page.locator('article[data-chapter-root]');await expect(article).toHaveAttribute('data-chapter-id',document.id);
 await expect(article.locator('figure,.katex,pre.rust-source-code,[data-cheat-sheet-open],[data-cheat-sheet-dialog]')).toHaveCount(0);
 const links=article.locator('.lesson-body ol a');
 expect(await links.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')))).toEqual(['../01-reference-core-handoff/','../02-corpus-preparation/']);
 await expect(page.locator('a[rel="prev"]')).toHaveCount(0);
 await expect(page.locator('a[rel="next"]')).toHaveAttribute('href',documents[1].path);
});

for(const [index,lesson] of lessons.entries()){
 test('Practical '+lesson.id+' built metadata formulas sources and evidence',async({page,request})=>{
  const response=await request.get(lesson.path);expect(response.ok()).toBe(true);const html=await response.text();
  expect(html).toContain('data-visualization-id="'+lesson.figureId+'"');expect(html).toContain('application/x-tex');
  for(const term of lesson.sheet.terms){expect(html).toContain(term.term);}
  await page.goto(lesson.path);await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.locator('h1')).toHaveText(lesson.data.title);await expectSeoDescription(page,lesson.data.description);
  await expect(page.locator('article[data-chapter-root]')).toHaveAttribute('data-chapter-id',lesson.id);
  const annotations=await page.locator('annotation[encoding="application/x-tex"]').allTextContents();expect(annotations).toContain(lesson.data.formula.latex);
  const figure=figureFor(page,lesson.figureId);await expect(figure).toHaveCount(1);await expect(figure.locator('figcaption')).toHaveCount(1);
  await expect(figure).toHaveClass(/course-diagram/);await expect(figure).toHaveAttribute('data-diagram-style','course-v1');await expect(figure.locator('[data-diagram-box]')).toHaveCount(lesson.boxCount);
  await expect(page.locator('pre.rust-source-code')).toHaveCount(lesson.data.rust_sources.length);await expectOnlySharedDiagramClientScript(page);
  await expect(page.locator('a[rel="prev"]')).toHaveAttribute('href',documents[index].path);
  if(index===0)await expect(page.locator('a[rel="next"]')).toHaveAttribute('href',documents[2].path);else await expect(page.locator('a[rel="next"]')).toHaveCount(0);
  await expect(page.locator('[data-locale="ru"]')).toHaveAttribute('href','/ru/');await expect(page.locator('[data-locale="ru"]')).toHaveAttribute('data-locale-fallback','locale-home');
  await expect(page.locator('head link[hreflang="ru"]')).toHaveCount(0);
  if(index===0){for(const value of [reference.reference_identity,String(reference.model.parameters),String(reference.evaluation.window_target_slots),String(reference.evaluation.document_transition_occurrences),JSON.stringify(reference.generation.token_ids)])await expect(figure).toContainText(value);}
  else {expect(await figure.locator('annotation[encoding="application/x-tex"]').textContent()).toBe('\\frac{'+corpusTrace.documents.prepared+'}{'+corpusTrace.documents.input+'}');for(const role of ['train','validation','test']){const card=figure.locator('[data-corpus-role="'+role+'"]');await expect(card).toContainText(String(corpusTrace.splits[role].documents)+' fixture document');await expect(card).toContainText(String(corpusTrace.splits[role].decoded_text_utf8_bytes)+' decoded text bytes');}}
 });
 for(const viewport of [{width:1280,height:900},{width:320,height:844}]){
  test('Practical '+lesson.id+' formula and nearest-box containment '+viewport.width,async({page},testInfo)=>{
   await page.setViewportSize(viewport);await page.goto(lesson.path);await page.evaluate(()=>document.fonts.ready);
   await expectNoPageOverflow(page);const figure=figureFor(page,lesson.figureId);const diagram=await auditDiagramContainment(figure);expect(diagram.errors).toEqual([]);
   await expectStackedDiagramText(figure.locator('figcaption'),'h3','.course-diagram__description');
   const layout=await auditOrdinaryLayout(page.locator('main'));expect(layout.errors).toEqual([]);
   if(viewport.width<800)await expect(figure.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
   await testInfo.attach('programmatic-geometry',{body:JSON.stringify({route:lesson.path,viewport,diagram,layout}),contentType:'application/json'});
  });
 }
 test('Practical '+lesson.id+' full view keyboard tree focus and bounded travel',async({page},testInfo)=>{
  await page.setViewportSize({width:1280,height:900});await page.goto(lesson.path);
  const figure=figureFor(page,lesson.figureId),toggle=figure.locator('[data-diagram-full-view-toggle]');await expect(toggle).toHaveCount(1);
  const before=await figure.evaluate(node=>({text:[...node.querySelectorAll('figcaption,[data-diagram-box]')].map(element=>element.textContent),font:parseFloat(getComputedStyle(node).fontSize)}));
  await figure.evaluate(node=>{(window as typeof window&{__practicalFigure?:Element}).__practicalFigure=node;});
  await toggle.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.fullscreenElement!==null);
  expect(await figure.evaluate(node=>(window as typeof window&{__practicalFigure?:Element}).__practicalFigure===node)).toBe(true);
  expect(await figure.locator('figcaption,[data-diagram-box]').allTextContents()).toEqual(before.text);
  expect(await figure.evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(before.font);
  const diagram=await auditDiagramContainment(figure);expect(diagram.errors).toEqual([]);
  const geometry=await figure.evaluate(node=>({clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,clientWidth:node.clientWidth,scrollWidth:node.scrollWidth}));
  expect(geometry.scrollHeight,'full view must not require more than 50% additional vertical travel').toBeLessThanOrEqual(geometry.clientHeight*1.5+2);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.fullscreenElement===null);await expect(toggle).toBeFocused();await expect(figure).toHaveCount(1);
  await testInfo.attach('programmatic-full-view-geometry',{body:JSON.stringify({route:lesson.path,diagram,geometry}),contentType:'application/json'});
 });
 test('Practical '+lesson.id+' no-API state has no usable enhancement',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(document,'fullscreenEnabled',{get:()=>false,configurable:true});});
  await page.setViewportSize({width:1280,height:900});await page.goto(lesson.path);await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
 });
 test('Practical '+lesson.id+' forced colors and RTL keep ordinary and expanded evidence',async({page})=>{
  await page.setViewportSize({width:1280,height:900});await page.emulateMedia({forcedColors:'active'});await page.goto(lesson.path);await page.locator('html').evaluate(node=>node.setAttribute('dir','rtl'));
  const figure=figureFor(page,lesson.figureId);expect((await auditDiagramContainment(figure)).errors).toEqual([]);await expectNoPageOverflow(page);
  const toggle=figure.locator('[data-diagram-full-view-toggle]');await toggle.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.fullscreenElement!==null);
  expect((await auditDiagramContainment(figure)).errors).toEqual([]);await page.keyboard.press('Escape');await page.waitForFunction(()=>document.fullscreenElement===null);await expect(toggle).toBeFocused();
 });
 for(const viewport of [{width:1280,height:900},{width:390,height:480}]){
  test('Practical '+lesson.id+' glossary keyboard scrolling and focus '+viewport.width,async({page},testInfo)=>{
   await page.setViewportSize(viewport);await page.goto(lesson.path);
   const trigger=page.locator('[data-cheat-sheet-open]'),dialog=page.locator('[data-cheat-sheet-dialog]'),close=dialog.locator('[data-cheat-sheet-close]');
   await expect(dialog.locator('dt')).toHaveCount(lesson.sheet.terms.length);await expect(dialog.locator('dd')).toHaveCount(lesson.sheet.terms.length);
   await trigger.focus();await page.keyboard.press('Enter');await expect(dialog).toBeVisible();await expect(close).toBeFocused();
   const group=dialog.locator('[data-cheat-sheet-page][role="group"]');await expect(group).toHaveAttribute('aria-label','Terms 1–'+lesson.sheet.terms.length+' of '+lesson.sheet.terms.length+'; page 1 of 1');
   const geometry=await dialog.evaluate(node=>{const errors:string[]=[],bounds=node.getBoundingClientRect();if(bounds.left<-2||bounds.right>innerWidth+2||bounds.top<-2||bounds.bottom>innerHeight+2)errors.push('dialog outside viewport');if(node.scrollWidth>node.clientWidth+2)errors.push('horizontal dialog overflow');for(const element of node.querySelectorAll<HTMLElement>('dt,dd,.cheat-sheet-term')){const box=element.getBoundingClientRect(),style=getComputedStyle(element);if([style.overflowX,style.overflowY].some(value=>value==='hidden'||value==='clip')||style.textOverflow==='ellipsis')errors.push('concealed term');const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const range=document.createRange();range.selectNodeContents(walker.currentNode);for(const rect of range.getClientRects())if(rect.width>0&&(rect.left<box.left-2||rect.right>box.right+2))errors.push('term ink outside nearest box');}}node.scrollTop=node.scrollHeight;return{errors,reachedEnd:node.scrollTop+node.clientHeight>=node.scrollHeight-2,clientHeight:node.clientHeight,scrollHeight:node.scrollHeight};});
   expect(geometry.errors).toEqual([]);expect(geometry.reachedEnd).toBe(true);
   await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();await page.keyboard.press('Enter');await close.click();await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();await expectNoPageOverflow(page);
   await testInfo.attach('programmatic-glossary-geometry',{body:JSON.stringify({route:lesson.path,viewport,geometry}),contentType:'application/json'});
  });
 }
}

for(const viewport of [{width:1280,height:900},{width:320,height:844}]){
 test('Affected chooser indexes orientation and first ending containment '+viewport.width,async({page},testInfo)=>{
  await page.setViewportSize(viewport);const records:unknown[]=[];
  for(const path of ['/en/','/ru/','/en/course/','/en/course/39-end-to-end-llm/',prefix,documents[0].path]){
   const routeViewport=path==='/en/course/39-end-to-end-llm/'&&viewport.width===320?{width:390,height:844}:viewport;
   await page.setViewportSize(routeViewport);await page.goto(path);await page.evaluate(()=>document.fonts.ready);await expectNoPageOverflow(page);
   if(path==='/ru/'){
    await expect(page.locator('html')).toHaveAttribute('lang','ru');
    const chooser=page.locator('[data-course-selection]');await expect(chooser).toHaveCount(1);
    await expect(chooser.locator('h2')).toHaveText(russianHome.courseSelectionTitle);
    await expect(chooser.locator('[data-course-id]')).toHaveCount(2);
    await expect(page.locator('a.course-cta')).toHaveCount(2);await expect(page.locator('.course-actions a.course-cta')).toHaveCount(0);
    const first=chooser.locator('[data-course-id="llm-from-scratch"] .course-cta');
    await expect(first).toHaveText(russianHome.basicsCourseStart);await expect(first).toHaveAttribute('href','/ru/course/00-llm-parts/');
    const practical=chooser.locator('[data-course-id="practical-llm-in-rust"] .course-cta');
    await expect(practical).toHaveText(russianHome.practicalCourseStart);await expect(practical).toHaveAttribute('href',prefix+ids[0]+'/');
    await expect(practical).toHaveAttribute('hreflang','en');expect(await practical.getAttribute('lang')).toBeNull();
    expect(await practical.evaluate(node=>node.closest('[lang]')?.getAttribute('lang'))).toBe('ru');
   }
   const layout=await auditOrdinaryLayout(page.locator('main'));
   const firstEnding=path==='/en/course/39-end-to-end-llm/';
   let firstEndingDiagram:null|Awaited<ReturnType<typeof auditDiagramContainment>>=null;
   if(firstEnding){
    await expect(page.locator('article[data-chapter-root]')).toHaveAttribute('data-chapter-id','39-end-to-end-llm');
    await expect(page.locator('nav[data-chapter-navigation] a[data-chapter-direction="previous"]')).toHaveAttribute('data-chapter-id','38-cached-generation');
    await expect(page.locator('nav[data-chapter-navigation] a[data-chapter-direction="next"]')).toHaveCount(0);
    firstEndingDiagram=await auditDiagramContainment(figureFor(page,'end-to-end-llm'));
    expect(firstEndingDiagram.errors,path).toEqual([]);
   }else expect(layout.errors,path).toEqual([]);
   records.push({path,viewport:routeViewport,actualDimensions:await page.evaluate(()=>({width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth})),ordinaryParagraphAuditEnforced:!firstEnding,layout,firstEndingDiagram});
  }
  await testInfo.attach('programmatic-surface-geometry',{body:JSON.stringify({requestedViewport:viewport,records}),contentType:'application/json'});
 });
}
