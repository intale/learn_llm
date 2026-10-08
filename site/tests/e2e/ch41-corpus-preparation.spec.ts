import {expect,test} from '@playwright/test';
// @ts-ignore Node filesystem APIs are supplied by Playwright.
import {writeFileSync} from 'node:fs';
declare const process:{env:Record<string,string|undefined>};
import {auditDiagramContainment} from './helpers/diagram-containment';
import {expectNoPageOverflow,expectOnlySharedDiagramClientScript} from './chapter-helpers';
const path='/en/course/41-corpus-preparation/';
const figureSelector='figure[data-visualization-id="corpus-preparation"]';

test('Chapter41 static evidence and English-only current navigation',async({page,request})=>{
 const response=await request.get(path);expect(response.ok()).toBe(true);const html=await response.text();
 expect(html).toContain('data-visualization-id="corpus-preparation"');expect(html).toContain('application/x-tex');expect(html).toContain('Terms 1–9 of 9; page 1 of 1');
 await page.goto(path);await expect(page.locator('html')).toHaveAttribute('lang','en');
 await expect(page.locator('h1')).toHaveText('Prepare text externally, then load it in Rust');
 const figure=page.locator(figureSelector);await expect(figure).toHaveCount(1);await expect(figure.locator('figcaption')).toHaveCount(1);await expect(figure.locator('[data-diagram-box]')).toHaveCount(7);
 await expect(figure).toHaveAttribute('data-diagram-style','course-v1');
 expect(await figure.locator('annotation[encoding="application/x-tex"]').textContent()).toBe('\\frac{3}{6}');
 for(const [role,bytes]of [['train','11'],['validation','11'],['test','17']]){const card=figure.locator(`[data-corpus-role="${role}"]`);await expect(card).toContainText('1 fixture document');await expect(card).toContainText(bytes+' decoded text bytes');}
 const formula=page.locator('.katex-display annotation[encoding="application/x-tex"]').filter({hasText:'r_'});
 await expect(formula).toHaveCount(1);expect(await formula.textContent()).toBe('r_{\\mathrm{keep}}=\\frac{N_{\\mathrm{prepared}}}{N_{\\mathrm{input}}}');
 await expect(page.locator('pre.rust-source-code')).toHaveCount(5);await expectOnlySharedDiagramClientScript(page);
 await expect(page.locator('a[rel="prev"]')).toHaveAttribute('href','/en/course/40-reference-core-handoff/');
 await expect(page.locator('[data-locale="ru"]')).toHaveAttribute('href','/ru/course/');await expect(page.locator('[data-locale="ru"]')).toHaveAttribute('data-locale-fallback','course-index');
 await page.goto('/en/course/');await expect(page.locator(`a[href="${path}"]`)).toHaveCount(1);
 await page.goto('/ru/course/');await expect(page.locator('a[href="/ru/course/41-corpus-preparation/"]')).toHaveCount(0);
 for(const old of ['41-governed-corpus-acquisition','42-deterministic-corpus-filtering'])expect((await request.get('/en/course/'+old+'/')).status()).toBe(404);
});

for(const viewport of [{width:1280,height:900},{width:320,height:844}]){
 test(`Chapter41 nearest-box mathematics commands and predecessor navigation ${viewport.width}`,async({page})=>{
  await page.setViewportSize(viewport);await page.goto(path);await page.evaluate(()=>document.fonts.ready);
  await expectNoPageOverflow(page);expect((await auditDiagramContainment(page.locator(figureSelector))).errors).toEqual([]);
  const commands=page.locator('pre[data-language="sh"]');expect(await commands.count()).toBeGreaterThanOrEqual(4);
  await expect(commands.last()).toContainText('tests::malformed_later_input_has_no_success_summary');await expect(commands.last()).toContainText('-- --exact');
  const errors=await page.locator('main').evaluate(node=>{
   const errors:string[]=[];
   for(const element of node.querySelectorAll<HTMLElement>('p,th,td,.katex-display')){
    if(element.closest('dialog:not([open])'))continue;const style=getComputedStyle(element),box=element.getBoundingClientRect(),math=element.matches('.katex-display');
    if((!math&&[style.overflowX,style.overflowY].some(v=>v==='hidden'||v==='clip'))||style.overflowX==='clip'||style.textOverflow==='ellipsis')errors.push('concealed content');
    const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){if(walker.currentNode.parentElement?.closest('.katex-mathml,annotation'))continue;const range=document.createRange();range.selectNodeContents(walker.currentNode);for(const rect of range.getClientRects())if(rect.width>0){if(math){if(rect.top<box.top-1||rect.bottom>box.bottom+1)errors.push('vertical formula ink');}else if(rect.left<box.left-1||rect.right>box.right+1)errors.push('ordinary ink outside nearest box');}}
   }
   for(const command of node.querySelectorAll<HTMLElement>('pre[data-language="sh"]')){const box=command.getBoundingClientRect(),style=getComputedStyle(command);if(box.left<-1||box.right>innerWidth+1)errors.push('command outside viewport');if(['hidden','clip'].includes(style.overflowX))errors.push('concealed command');}
   return errors;
  });expect(errors).toEqual([]);
  if(viewport.width<800)await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
  await page.goto('/en/course/40-reference-core-handoff/');const next=page.locator('a[rel="next"]');await expect(next).toHaveAttribute('href',path);await expect(next).toHaveText('Next chapter → Prepare text externally, then load it in Rust');await expectNoPageOverflow(page);
  const handoff=page.locator('h2').filter({hasText:'What the next extension must preserve'}).locator('..');
  await expect(handoff).toContainText('it is a historical label, not the current course index');
  await expect(handoff).toContainText('Chapter 41 now uses NVIDIA NeMo Curator to prepare supplied text');
  await expect(handoff).toContainText('then loads the prepared documents in Rust');
  await expect(page.locator('[data-locale="ru"]')).toHaveAttribute('href','/ru/course/');
  await expect(page.locator('[data-locale="ru"]')).toHaveAttribute('data-locale-fallback','course-index');
  await expect(page.locator('[data-locale="ru"]')).toHaveAttribute('aria-label','Русский: Все главы');
  await expect(page.locator('head link[rel="alternate"][hreflang="ru"]')).toHaveCount(0);
  const navigationErrors=await next.evaluate(link=>{const errors:string[]=[];const own=link.getBoundingClientRect(),parent=link.closest('nav')!.getBoundingClientRect();if(own.left<parent.left-1||own.right>parent.right+1||own.top<parent.top-1||own.bottom>parent.bottom+1)errors.push('link outside navigation');const walker=document.createTreeWalker(link,NodeFilter.SHOW_TEXT);while(walker.nextNode()){if(!walker.currentNode.textContent?.trim())continue;const range=document.createRange();range.selectNodeContents(walker.currentNode);for(const rect of range.getClientRects())if(rect.width>0&&(rect.left<own.left-1||rect.right>own.right+1||rect.top<own.top-1||rect.bottom>own.bottom+1))errors.push('link ink outside own box');}return errors;});expect(navigationErrors).toEqual([]);
 });
}

test('Chapter41 keyboard full view keeps one readable seven-box tree',async({page})=>{
 await page.setViewportSize({width:1280,height:900});await page.goto(path);const figure=page.locator(figureSelector),toggle=figure.locator('[data-diagram-full-view-toggle]');await expect(toggle).toHaveCount(1);
 const labels=async()=>({outerHTML:await toggle.evaluate(node=>node.outerHTML),ariaSnapshot:await toggle.ariaSnapshot(),text:await toggle.textContent(),ariaLabel:await toggle.getAttribute('aria-label'),title:await toggle.getAttribute('title'),ariaKeyshortcuts:await toggle.getAttribute('aria-keyshortcuts')});
 const ordinary=await labels();
 const content=async()=>figure.locator('figcaption,[data-diagram-box]').allTextContents();
 const before={content:await content(),font:await figure.evaluate(node=>parseFloat(getComputedStyle(node).fontSize))};await figure.evaluate(node=>{(window as typeof window&{__corpusFigure?:Element}).__corpusFigure=node;});
 await toggle.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.fullscreenElement!==null);
 expect(await figure.evaluate(node=>(window as typeof window&{__corpusFigure?:Element}).__corpusFigure===node)).toBe(true);expect(await content()).toEqual(before.content);expect(await figure.evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(before.font);
 expect((await auditDiagramContainment(figure)).errors).toEqual([]);await expect(figure.locator('[data-diagram-box]').last()).toBeInViewport();await expect(toggle).toBeInViewport();const expanded=await labels();await page.keyboard.press('Escape');await page.waitForFunction(()=>document.fullscreenElement===null);await expect(toggle).toBeFocused();await expect(figure).toHaveCount(1);
 const restored=await labels();
 const destination=process.env.COURSE_DYNAMIC_LABEL_EVIDENCE;
 if(destination){if(destination!=='/evidence/dynamic-control-labels.json')throw Error('closed dynamic evidence destination');writeFileSync(destination,JSON.stringify({schema_version:1,scope:'Programmatic actual DOM/accessibility values only; not language judgment or screenshot',route:path,figure_id:'corpus-preparation',figure_title:await figure.locator('figcaption h3').textContent(),ordinary,expanded,restored},null,2)+'\n',{flag:'wx'});}
});

test('Chapter40 shared full-view controls expose actual current English names',async({page})=>{
 const route='/en/course/40-reference-core-handoff/';
 await page.setViewportSize({width:1280,height:900});await page.goto(route);
 const figure=page.locator('figure[data-visualization-id="reference-core-handoff"]'),toggle=figure.locator('[data-diagram-full-view-toggle]');
 await expect(figure).toHaveCount(1);await expect(toggle).toHaveCount(1);
 const labels=async()=>({outerHTML:await toggle.evaluate(node=>node.outerHTML),ariaSnapshot:await toggle.ariaSnapshot(),text:await toggle.textContent(),ariaLabel:await toggle.getAttribute('aria-label'),title:await toggle.getAttribute('title'),ariaKeyshortcuts:await toggle.getAttribute('aria-keyshortcuts')});
 const ordinary=await labels();expect(ordinary.ariaKeyshortcuts).toBeNull();
 await toggle.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.fullscreenElement!==null);
 const expanded=await labels();expect(expanded.ariaKeyshortcuts).toBe('Escape');
 expect((await auditDiagramContainment(figure)).errors).toEqual([]);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.fullscreenElement===null);await expect(toggle).toBeFocused();
 const restored=await labels();expect(restored).toEqual(ordinary);await expectNoPageOverflow(page);
 const destination=process.env.COURSE_DYNAMIC_LABEL_CH40_EVIDENCE;
 if(destination){if(destination!=='/evidence/dynamic-control-labels-ch40.json')throw Error('closed Chapter40 dynamic evidence destination');writeFileSync(destination,JSON.stringify({schema_version:1,scope:'Programmatic actual DOM/accessibility values only; not language judgment or screenshot',route,figure_id:'reference-core-handoff',figure_title:await figure.locator('figcaption h3').textContent(),ordinary,expanded,restored},null,2)+'\n',{flag:'wx'});}
});

test('Chapter41 forced colors and RTL retain complete contained evidence',async({page})=>{
 await page.setViewportSize({width:1280,height:900});await page.emulateMedia({forcedColors:'active'});await page.goto(path);await page.locator('html').evaluate(node=>node.setAttribute('dir','rtl'));const figure=page.locator(figureSelector);await expect(figure.locator('[data-diagram-box]')).toHaveCount(7);expect((await auditDiagramContainment(figure)).errors).toEqual([]);await expectNoPageOverflow(page);
});

for(const viewport of [{width:1280,height:900},{width:390,height:480}]){
 test(`Chapter41 nine-term glossary keyboard and scrolling ${viewport.width}`,async({page})=>{
  await page.setViewportSize(viewport);await page.goto(path);const trigger=page.locator('[data-cheat-sheet-open]'),dialog=page.locator('[data-cheat-sheet-dialog]'),close=dialog.locator('[data-cheat-sheet-close]');await trigger.focus();await page.keyboard.press('Enter');await expect(dialog).toBeVisible();await expect(close).toBeFocused();const group=dialog.locator('[data-cheat-sheet-page][role="group"]');await expect(group).toHaveAttribute('aria-label','Terms 1–9 of 9; page 1 of 1');await expect(group.locator('dt')).toHaveCount(9);await expect(group.locator('dd')).toHaveCount(9);
  const safety=await dialog.evaluate(node=>{const errors:string[]=[],bounds=node.getBoundingClientRect();if(bounds.left<-1||bounds.right>innerWidth+1||bounds.top<-1||bounds.bottom>innerHeight+1)errors.push('dialog outside viewport');if(node.scrollWidth>node.clientWidth+1)errors.push('horizontal dialog overflow');for(const element of node.querySelectorAll<HTMLElement>('dt,dd,.cheat-sheet-term')){const box=element.getBoundingClientRect(),style=getComputedStyle(element);if([style.overflowX,style.overflowY].some(v=>v==='hidden'||v==='clip')||style.textOverflow==='ellipsis')errors.push('concealed term');const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const range=document.createRange();range.selectNodeContents(walker.currentNode);for(const rect of range.getClientRects())if(rect.width>0&&(rect.left<box.left-1||rect.right>box.right+1))errors.push('term ink outside nearest box');}}node.scrollTop=node.scrollHeight;return {errors,reachedEnd:node.scrollTop+node.clientHeight>=node.scrollHeight-1};});expect(safety.errors).toEqual([]);expect(safety.reachedEnd).toBe(true);
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();await page.keyboard.press('Enter');await close.click();await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();await expectNoPageOverflow(page);
 });
}
