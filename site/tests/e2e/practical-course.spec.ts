import {expect,test,type Locator,type Page} from '@playwright/test';
// @ts-ignore Node filesystem APIs are supplied only by Playwright.
import {readFileSync} from 'node:fs';
// @ts-ignore The maintained parser is a Node module, shared with content checks.
import {parseJsonFrontmatter} from '../../../scripts/check-site-content.mjs';
import {auditDiagramContainment} from './helpers/diagram-containment';
import {getCheatSheetCopy,paginateCheatSheetTerms,sortCheatSheetTerms} from '../../src/lib/cheat-sheets';
import {expectNoPageOverflow,expectOnlySharedDiagramClientScript,expectOrderedChapterNavigation,expectSeoDescription,expectStackedDiagramText,expectVisualizationDecision} from './chapter-helpers';

const prefix='/en/practical-llm-in-rust/';
const ids=['00-course-structure','01-reference-core-handoff','02-corpus-preparation','03-scalable-bpe-tokenizer'] as const;
const documents=ids.map(id=>({id,path:prefix+id+'/',data:parseJsonFrontmatter(
  readFileSync(new URL('../../src/content/practical-chapters/en/'+id+'.mdx',import.meta.url),'utf8'),id).data}));
const chapterLinks=documents.map(document=>({chapterId:document.id,href:document.path,order:document.data.order,title:document.data.title}));
const reference=JSON.parse(readFileSync(new URL('../../../rust/demos/practical-ch01-reference-core-handoff/expected.txt',import.meta.url),'utf8'));
const corpusTrace=JSON.parse(readFileSync(new URL('../../../artifacts/functional-laptop/chapters/41-corpus-preparation/corpus-preparation-trace.json',import.meta.url),'utf8'));
// This path is populated from actual Rust execution by the current run. No private predicted trace is used.
const tokenizerTrace=JSON.parse(readFileSync(new URL('../../../artifacts/practical-llm-in-rust/chapters/03-scalable-bpe-tokenizer/scalable-bpe-tokenizer-trace.json',import.meta.url),'utf8'));
const home=JSON.parse(readFileSync(new URL('../../src/i18n/catalogs/en.json',import.meta.url),'utf8'));
const russianHome=JSON.parse(readFileSync(new URL('../../src/i18n/catalogs/ru.json',import.meta.url),'utf8'));
const glossaryCopy=getCheatSheetCopy('en')!;
const lessons=documents.slice(1).map(document=>({...document,
  figureId:document.data.visualization.id,
  boxCount:document.id===ids[1]?3:document.id===ids[2]?7:4+tokenizerTrace.rounds.length,
  sheet:JSON.parse(readFileSync(new URL('../../src/content/practical-cheat-sheets/en/'+document.id+'.json',import.meta.url),'utf8'))}));
const figureFor=(page:Page,id:string)=>page.locator('figure[data-visualization-id="'+id+'"]');
const figureGeometry=(figure:Locator)=>figure.evaluate(node=>({clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,clientHeight:node.clientHeight,scrollHeight:node.scrollHeight}));
const controlValues=async(toggle:Locator)=>({outerHTML:await toggle.evaluate(node=>node.outerHTML),text:await toggle.textContent(),ariaLabel:await toggle.getAttribute('aria-label'),title:await toggle.getAttribute('title'),ariaKeyshortcuts:await toggle.getAttribute('aria-keyshortcuts'),ariaSnapshot:await toggle.ariaSnapshot()});

async function auditOrdinaryLayout(container:Locator) {
 return container.evaluate(root=>{
  const errors:string[]=[],records:unknown[]=[];
  const visible=(element:HTMLElement)=>{const style=getComputedStyle(element);return element.getClientRects().length>0&&style.display!=='none'&&style.visibility!=='hidden'&&!element.closest('dialog:not([open])');};
  for(const element of root.querySelectorAll<HTMLElement>('p,h1,h2,h3,h4,li,dt,dd,th,td,summary,small,.feature-card,a[rel="prev"],a[rel="next"]')){
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
  for(const formula of root.querySelectorAll<HTMLElement>('.katex')){
   if(!visible(formula)||formula.closest('figure,.katex-display')||formula.parentElement?.closest('.katex'))continue;
   const ink=formula.querySelector<HTMLElement>('.katex-html'),owner=formula.closest<HTMLElement>('p,h1,h2,h3,h4,li,dt,dd,th,td');
   if(!ink||!owner){errors.push('inline formula has no painted HTML or containing text box');continue;}
   const box=owner.getBoundingClientRect(),formulaBox=formula.getBoundingClientRect(),style=getComputedStyle(formula);
   const horizontalTravel=formula.clientWidth>0&&formula.scrollWidth>formula.clientWidth+2;
   const walker=document.createTreeWalker(ink,NodeFilter.SHOW_TEXT);let paintedRects=0;
   while(walker.nextNode()){
    const range=document.createRange();range.selectNodeContents(walker.currentNode);
    for(const rect of range.getClientRects())if(rect.width>0&&rect.height>0){
     paintedRects++;
     if(rect.top<box.top-2||rect.bottom>box.bottom+2)errors.push('inline formula ink outside its vertical text box');
     if(!horizontalTravel&&(rect.left<box.left-2||rect.right>box.right+2))errors.push('inline formula ink outside its horizontal text box');
    }
   }
   if(horizontalTravel&&!['auto','scroll'].includes(style.overflowX))errors.push('inline formula horizontal travel lacks a scroll owner');
   if(paintedRects===0)errors.push('inline formula has no painted text');
   if(formulaBox.height===0||formulaBox.width===0||(formula.clientHeight>0&&formula.scrollHeight>formula.clientHeight+2&&['auto','scroll','hidden','clip'].includes(style.overflowY)))errors.push('inline formula has unreadable vertical clipping');
   records.push({kind:'inline-formula',display:style.display,boxWidth:formulaBox.width,boxHeight:formulaBox.height,horizontalTravel,clientWidth:formula.clientWidth,scrollWidth:formula.scrollWidth,clientHeight:formula.clientHeight,scrollHeight:formula.scrollHeight,paintedRects});
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
 expect((await page.locator('.course-list .feature-number').allTextContents()).map(Number)).toEqual([0,1,2,3]);
 for(const document of documents){
  const link=page.locator('a[href="'+document.path+'"]');await expect(link).toHaveCount(1);await expect(link).toHaveText(document.data.title);
  await expect(link.locator('xpath=ancestor::article')).toContainText(document.data.description);
  await expect(link.locator('xpath=ancestor::article').locator('small')).toHaveText(home.contentRevisionLabel+': '+document.data.content_revision);
 }
 await expect(page.locator('head link[hreflang="ru"]')).toHaveCount(0);
 await expect(page.locator('[data-locale="ru"]')).toHaveAttribute('href','/ru/');
 for(const route of ['/ru/practical-llm-in-rust/',...ids.map(id=>'/ru/practical-llm-in-rust/'+id+'/'),prefix+'04-variable-length-batches/','/en/course/40-reference-core-handoff/','/en/course/41-corpus-preparation/'])expect((await request.get(route)).status()).toBe(404);
});

test('Practical orientation has a scoped ordered path without lesson widgets',async({page})=>{
 const document=documents[0];await page.goto(document.path);
 await expect(page.locator('h1')).toHaveText(document.data.title);await expectSeoDescription(page,document.data.description);
 const article=page.locator('article[data-chapter-root]');await expect(article).toHaveAttribute('data-chapter-id',document.id);
 await expect(article.locator('.lesson-header .eyebrow')).toHaveText('Chapter 00 · '+home.contentRevisionLabel+' 2');
 await expect(article.locator('figure,.katex,pre.rust-source-code,[data-cheat-sheet-open],[data-cheat-sheet-dialog]')).toHaveCount(0);
 const links=article.locator('.lesson-body ol a');
 expect(await links.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')))).toEqual(ids.slice(1).map(id=>'../'+id+'/'));
 await expectOrderedChapterNavigation(page,'en',document.id,chapterLinks,prefix);
});

for(const lesson of lessons){
 test('Practical '+lesson.id+' built metadata formulas sources and evidence',async({page,request})=>{
  const response=await request.get(lesson.path);expect(response.ok()).toBe(true);const html=await response.text();
  expect(html).toContain('data-visualization-id="'+lesson.figureId+'"');expect(html).toContain('application/x-tex');
  for(const term of lesson.sheet.terms){expect(html).toContain(term.term);}
  await page.goto(lesson.path);await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.locator('h1')).toHaveText(lesson.data.title);await expectSeoDescription(page,lesson.data.description);
  await expect(page.locator('article[data-chapter-root]')).toHaveAttribute('data-chapter-id',lesson.id);
  await expect(page.locator('.lesson-header .eyebrow')).toHaveText('Chapter '+String(lesson.data.order).padStart(2,'0')+' · '+home.contentRevisionLabel+' '+lesson.data.content_revision);
  const math=page.locator('.lesson-body .katex');expect(await math.count()).toBeGreaterThan(0);
  await expect(page.locator('.lesson-body .katex-error')).toHaveCount(0);
  await expect(math.locator('annotation[encoding="application/x-tex"]')).toHaveCount(await math.count());
  await expect(math.locator('.katex-mathml')).toHaveCount(await math.count());
  const annotations=await page.locator('annotation[encoding="application/x-tex"]').allTextContents();expect(annotations).toContain(lesson.data.formula.latex);
  await expectVisualizationDecision(page,lesson.data.visualization);
  const figure=figureFor(page,lesson.figureId);await expect(figure).toHaveCount(1);await expect(figure.locator('figcaption')).toHaveCount(1);
  await expect(figure).toHaveClass(/course-diagram/);await expect(figure).toHaveAttribute('data-diagram-style','course-v1');await expect(figure.locator('[data-diagram-box]')).toHaveCount(lesson.boxCount);
  await expect(page.locator('pre.rust-source-code')).toHaveCount(lesson.data.rust_sources.length);await expectOnlySharedDiagramClientScript(page);
  await expectOrderedChapterNavigation(page,'en',lesson.id,chapterLinks,prefix);
  await expect(page.locator('[data-locale="ru"]')).toHaveAttribute('href','/ru/');await expect(page.locator('[data-locale="ru"]')).toHaveAttribute('data-locale-fallback','locale-home');
  await expect(page.locator('head link[hreflang="ru"]')).toHaveCount(0);
  if(lesson.id===ids[1]){for(const value of [reference.reference_identity,String(reference.model.parameters),String(reference.evaluation.window_target_slots),String(reference.evaluation.document_transition_occurrences),JSON.stringify(reference.generation.token_ids)])await expect(figure).toContainText(value);}
  else if(lesson.id===ids[2]){expect(await figure.locator('annotation[encoding="application/x-tex"]').textContent()).toBe('\\frac{'+corpusTrace.documents.prepared+'}{'+corpusTrace.documents.input+'}');for(const role of ['train','validation','test']){const card=figure.locator('[data-corpus-role="'+role+'"]');await expect(card).toContainText(String(corpusTrace.splits[role].documents)+' fixture document');await expect(card).toContainText(String(corpusTrace.splits[role].decoded_text_utf8_bytes)+' decoded text bytes');}}
  else {
   // Check only rendering of the executed own-course trace. Historical policy behavior has no assertion or oracle here.
   const tables=figure.locator('table[data-diagram-table][data-bpe-rank]');await expect(tables).toHaveCount(tokenizerTrace.rounds.length);
   for(const [rank,round] of tokenizerTrace.rounds.entries()){
    const table=tables.nth(rank);await expect(table.locator('tbody tr')).toHaveCount(round.counts.length);
    expect(await table.locator('tbody tr').evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll('td')].map(cell=>cell.textContent)))).toEqual(round.counts.map((pair:{left:number;right:number;count:number})=>[String(pair.left),String(pair.right),String(pair.count)]));
    for(const value of round.sequences)await expect(table.locator('xpath=..')).toContainText(JSON.stringify(value));
   }
   for(const value of [tokenizerTrace.payloads.scalar_sha256,tokenizerTrace.payloads.incremental_sha256,JSON.stringify(tokenizerTrace.heldout.content_tokens),JSON.stringify(tokenizerTrace.heldout.document_tokens)])await expect(figure).toContainText(value);
   expect(await figure.locator('annotation[encoding="application/x-tex"]').textContent()).toBe('\\frac{'+tokenizerTrace.efficiency.content_tokens+'}{'+tokenizerTrace.efficiency.input_bytes+'}='+tokenizerTrace.efficiency.content_tokens/tokenizerTrace.efficiency.input_bytes);
  }
 });
 for(const viewport of [{width:1280,height:900},{width:320,height:844}]){
  test('Practical '+lesson.id+' formula and nearest-box containment '+viewport.width,async({page},testInfo)=>{
   await page.setViewportSize(viewport);await page.goto(lesson.path);await page.locator('article[data-chapter-root] details').evaluateAll(nodes=>nodes.forEach(node=>(node as HTMLDetailsElement).open=true));await page.evaluate(()=>document.fonts.ready);
   await expectNoPageOverflow(page);const figure=figureFor(page,lesson.figureId);const diagram=await auditDiagramContainment(figure),geometry=await figureGeometry(figure);
   await expectStackedDiagramText(figure.locator('figcaption'),'h3','.course-diagram__description');
   const layout=await auditOrdinaryLayout(page.locator('main'));
   if(viewport.width<800)await expect(figure.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
   await testInfo.attach('programmatic-geometry',{body:JSON.stringify({route:lesson.path,figureId:lesson.figureId,state:'inline',answerDetails:'open',viewport,geometry,diagram,layout}),contentType:'application/json'});
   expect(diagram.errors).toEqual([]);expect(layout.errors).toEqual([]);
  });
 }
 test('Practical '+lesson.id+' full view keyboard tree focus and bounded travel',async({page},testInfo)=>{
  const viewport={width:1280,height:900};await page.setViewportSize(viewport);await page.goto(lesson.path);await page.evaluate(()=>document.fonts.ready);
  const figure=figureFor(page,lesson.figureId),toggle=figure.locator('[data-diagram-full-view-toggle]');await expect(toggle).toHaveCount(1);
  const before=await figure.evaluate(node=>({text:[...node.querySelectorAll('figcaption,[data-diagram-box]')].map(element=>element.textContent),font:parseFloat(getComputedStyle(node).fontSize)}));
  const ordinaryControl=await controlValues(toggle);
  await figure.evaluate(node=>{(window as typeof window&{__practicalFigure?:Element}).__practicalFigure=node;});
  await toggle.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.fullscreenElement!==null);
  expect(await figure.evaluate(node=>(window as typeof window&{__practicalFigure?:Element}).__practicalFigure===node)).toBe(true);
  expect(await figure.locator('figcaption,[data-diagram-box]').allTextContents()).toEqual(before.text);
  expect(await figure.evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(before.font);
  const diagram=await auditDiagramContainment(figure),geometry=await figureGeometry(figure),expandedControl=await controlValues(toggle);
  await testInfo.attach('programmatic-full-view-geometry',{body:JSON.stringify({route:lesson.path,figureId:lesson.figureId,state:'full-view',viewport,diagram,geometry}),contentType:'application/json'});
  expect(diagram.errors).toEqual([]);
  expect(geometry.scrollHeight,'full view must not require more than 50% additional vertical travel').toBeLessThanOrEqual(geometry.clientHeight*1.5+2);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.fullscreenElement===null);await expect(toggle).toBeFocused();await expect(figure).toHaveCount(1);
  const restoredControl=await controlValues(toggle);expect(restoredControl).toEqual(ordinaryControl);
  await testInfo.attach('programmatic-full-view-controls',{body:JSON.stringify({route:lesson.path,figureId:lesson.figureId,viewport,states:{inline:ordinaryControl,fullView:expandedControl,restored:restoredControl}}),contentType:'application/json'});
 });
 test('Practical '+lesson.id+' no-API state has no usable enhancement',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(document,'fullscreenEnabled',{get:()=>false,configurable:true});});
  await page.setViewportSize({width:1280,height:900});await page.goto(lesson.path);await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
 });
 test('Practical '+lesson.id+' forced colors and RTL keep ordinary and expanded evidence',async({page},testInfo)=>{
  const viewport={width:1280,height:900};await page.setViewportSize(viewport);await page.emulateMedia({forcedColors:'active'});await page.goto(lesson.path);await page.locator('html').evaluate(node=>node.setAttribute('dir','rtl'));await page.evaluate(()=>document.fonts.ready);
  const figure=figureFor(page,lesson.figureId),ordinary={diagram:await auditDiagramContainment(figure),geometry:await figureGeometry(figure),layout:await auditOrdinaryLayout(page.locator('main'))};
  await testInfo.attach('programmatic-direction-geometry-inline',{body:JSON.stringify({route:lesson.path,figureId:lesson.figureId,state:'inline',viewport,direction:'rtl',forcedColors:'active',...ordinary}),contentType:'application/json'});
  expect(ordinary.diagram.errors).toEqual([]);expect(ordinary.layout.errors).toEqual([]);await expectNoPageOverflow(page);
  const toggle=figure.locator('[data-diagram-full-view-toggle]');await toggle.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.fullscreenElement!==null);
  const expanded={diagram:await auditDiagramContainment(figure),geometry:await figureGeometry(figure)};
  await testInfo.attach('programmatic-direction-geometry-full-view',{body:JSON.stringify({route:lesson.path,figureId:lesson.figureId,state:'full-view',viewport,direction:'rtl',forcedColors:'active',...expanded}),contentType:'application/json'});
  expect(expanded.diagram.errors).toEqual([]);expect(expanded.geometry.scrollHeight).toBeLessThanOrEqual(expanded.geometry.clientHeight*1.5+2);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.fullscreenElement===null);await expect(toggle).toBeFocused();
 });
 for(const viewport of [{width:1280,height:900},{width:320,height:480}]){
  test('Practical '+lesson.id+' glossary keyboard scrolling and focus '+viewport.width,async({page},testInfo)=>{
   await page.setViewportSize(viewport);await page.goto(lesson.path);
   const trigger=page.locator('[data-cheat-sheet-open]'),dialog=page.locator('[data-cheat-sheet-dialog]'),close=dialog.locator('[data-cheat-sheet-close]');
   await expect(page.locator('[data-cheat-sheet]')).toHaveCount(1);await expect(trigger).toHaveCount(1);await expect(dialog).toHaveCount(1);
   await expect(page.locator('[data-cheat-sheet] dl')).toHaveCount(1);
   const terms=sortCheatSheetTerms(lesson.sheet.terms,'en'),pages=paginateCheatSheetTerms(terms);expect(pages).toHaveLength(1);
   await expect(dialog.locator('dt')).toHaveText(terms.map(term=>term.term));await expect(dialog.locator('dd')).toHaveText(terms.map(term=>term.definition));
   await expect(trigger).toHaveText(glossaryCopy.openLabel);await expect(close).toHaveAttribute('aria-label',glossaryCopy.closeLabel);
   await expect(dialog.locator('dt')).toHaveCount(lesson.sheet.terms.length);await expect(dialog.locator('dd')).toHaveCount(lesson.sheet.terms.length);
   await trigger.focus();await page.keyboard.press('Enter');await expect(dialog).toBeVisible();await expect(close).toBeFocused();
   const group=dialog.locator('[data-cheat-sheet-page][role="group"]');await expect(group).toHaveAttribute('aria-label',glossaryCopy.pageStatus({currentPage:1,startTerm:1,endTerm:terms.length,totalTerms:terms.length,pageCount:pages.length}));
   const geometry=await dialog.evaluate(node=>{const errors:string[]=[],bounds=node.getBoundingClientRect();if(bounds.left<-2||bounds.right>innerWidth+2||bounds.top<-2||bounds.bottom>innerHeight+2)errors.push('dialog outside viewport');if(node.scrollWidth>node.clientWidth+2)errors.push('horizontal dialog overflow');for(const element of node.querySelectorAll<HTMLElement>('dt,dd,.cheat-sheet-term')){const box=element.getBoundingClientRect(),style=getComputedStyle(element);if([style.overflowX,style.overflowY].some(value=>value==='hidden'||value==='clip')||style.textOverflow==='ellipsis')errors.push('concealed term');const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const range=document.createRange();range.selectNodeContents(walker.currentNode);for(const rect of range.getClientRects())if(rect.width>0&&(rect.left<box.left-2||rect.right>box.right+2))errors.push('term ink outside nearest box');}}node.scrollTop=node.scrollHeight;return{errors,reachedEnd:node.scrollTop+node.clientHeight>=node.scrollHeight-2,clientHeight:node.clientHeight,scrollHeight:node.scrollHeight};});
   await testInfo.attach('programmatic-glossary-geometry',{body:JSON.stringify({route:lesson.path,state:'dialog-open',viewport,geometry}),contentType:'application/json'});
   expect(geometry.errors).toEqual([]);expect(geometry.reachedEnd).toBe(true);
   await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();await page.keyboard.press('Enter');await close.click();await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();await expectNoPageOverflow(page);
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
   const firstEnding=path==='/en/course/39-end-to-end-llm/';
   const layout=firstEnding?null:await auditOrdinaryLayout(page.locator('main'));
   let firstEndingDiagram:null|Awaited<ReturnType<typeof auditDiagramContainment>>=null;
   if(firstEnding){
    await expect(page.locator('article[data-chapter-root]')).toHaveAttribute('data-chapter-id','39-end-to-end-llm');
    await expect(page.locator('nav[data-chapter-navigation] a[data-chapter-direction="previous"]')).toHaveAttribute('data-chapter-id','38-cached-generation');
    await expect(page.locator('nav[data-chapter-navigation] a[data-chapter-direction="next"]')).toHaveCount(0);
    firstEndingDiagram=await auditDiagramContainment(figureFor(page,'end-to-end-llm'));
    expect(firstEndingDiagram.errors,path).toEqual([]);
   }else expect(layout!.errors,path).toEqual([]);
   records.push({path,viewport:routeViewport,actualDimensions:await page.evaluate(()=>({width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth})),ordinaryParagraphAuditEnforced:!firstEnding,ordinaryParagraphAuditRun:!firstEnding,layout,firstEndingDiagram});
  }
  await testInfo.attach('programmatic-surface-geometry',{body:JSON.stringify({requestedViewport:viewport,records}),contentType:'application/json'});
 });
}
