import {expect,test,type Locator,type Page} from '@playwright/test';
// @ts-ignore Node filesystem APIs are supplied only by Playwright.
import {readFileSync} from 'node:fs';
// @ts-ignore The maintained parser is a Node module, shared with content checks.
import {parseJsonFrontmatter} from '../../../scripts/check-site-content.mjs';
import {auditDiagramContainment} from './helpers/diagram-containment';
import {getCheatSheetCopy,paginateCheatSheetTerms,sortCheatSheetTerms} from '../../src/lib/cheat-sheets';
import {expectNoPageOverflow,expectOnlySharedDiagramClientScript,expectOrderedChapterNavigation,expectSeoDescription,expectStackedDiagramText,expectVisualizationDecision} from './chapter-helpers';

const prefix='/en/practical-llm-in-rust/';
const ids=['00-course-structure','01-reference-core-handoff','02-corpus-preparation','03-scalable-bpe-tokenizer','04-padded-variable-batches','05-packed-sequence-masks','06-depth-stable-decoder','07-configurable-decoder-core','08-dropout-semantics','09-dependency-error-contract','10-input-encoding-boundary'] as const;
const documents=ids.map(id=>({id,path:prefix+id+'/',data:parseJsonFrontmatter(
  readFileSync(new URL('../../src/content/practical-chapters/en/'+id+'.mdx',import.meta.url),'utf8'),id).data}));
const chapterLinks=documents.map(document=>({chapterId:document.id,href:document.path,order:document.data.order,title:document.data.title}));
const reference=JSON.parse(readFileSync(new URL('../../../rust/demos/practical-ch01-reference-core-handoff/expected.txt',import.meta.url),'utf8'));
const corpusTrace=JSON.parse(readFileSync(new URL('../../../site/src/data/course/corpus-preparation-trace.json',import.meta.url),'utf8'));
// This path is populated from actual Rust execution by the current run. No private predicted trace is used.
const tokenizerTrace=JSON.parse(readFileSync(new URL('../../../site/src/data/course/scalable-bpe-tokenizer-trace.json',import.meta.url),'utf8'));
const paddedTrace=JSON.parse(readFileSync(new URL('../../../site/src/data/course/padded-variable-batches-trace.json',import.meta.url),'utf8'));
const packedTrace=JSON.parse(readFileSync(new URL('../../../site/src/data/course/packed-sequence-masks-trace.json',import.meta.url),'utf8'));
const depthTrace=JSON.parse(readFileSync(new URL('../../../site/src/data/course/depth-stable-decoder-trace.json',import.meta.url),'utf8'));
const configurableTrace=JSON.parse(readFileSync(new URL('../../../site/src/data/course/configurable-decoder-core-trace.json',import.meta.url),'utf8'));
const dropoutTrace=JSON.parse(readFileSync(new URL('../../../site/src/data/course/dropout-semantics-trace.json',import.meta.url),'utf8'));
const inputBoundary=JSON.parse(readFileSync(new URL('../../../rust/demos/practical-ch10-input-encoding-boundary/expected.txt',import.meta.url),'utf8'));
const home=JSON.parse(readFileSync(new URL('../../src/i18n/catalogs/en.json',import.meta.url),'utf8'));
const russianHome=JSON.parse(readFileSync(new URL('../../src/i18n/catalogs/ru.json',import.meta.url),'utf8'));
const glossaryCopy=getCheatSheetCopy('en')!;
const lessons=documents.slice(1).map(document=>({...document,
  figureId:document.data.visualization.id,
  boxCount:document.id===ids[10]?8:document.id===ids[1]?3:document.id===ids[2]?7:document.id===ids[3]?4+tokenizerTrace.rounds.length:document.id===ids[6]?7+depthTrace.fixtures.length:document.id===ids[7]?10:document.id===ids[8]?3:4,
  sheet:JSON.parse(readFileSync(new URL('../../src/content/practical-cheat-sheets/en/'+document.id+'.json',import.meta.url),'utf8'))}));
const figureFor=(page:Page,id:string)=>page.locator('figure[data-visualization-id="'+id+'"]');
const expectDepthScalar=async(owner:Locator,metric:string,value:number)=>{
 const cell=owner.locator('[data-depth-metric="'+metric+'"]');
 await expect(cell).toHaveCount(1);await expect(cell).toHaveAttribute('data-depth-value',String(value));
 await expect(cell.locator('annotation[encoding="application/x-tex"]')).toHaveText(value.toFixed(6));
 return {metric,raw:await cell.getAttribute('data-depth-value'),notation:await cell.locator('annotation[encoding="application/x-tex"]').textContent()};
};
const figureGeometry=(figure:Locator)=>figure.evaluate(node=>({clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,
 rootFontSize:getComputedStyle(document.documentElement).fontSize,containerType:getComputedStyle(node).containerType,
 grids:[...node.querySelectorAll<HTMLElement>('.course-diagram__grid')].map(grid=>({className:grid.className,width:grid.getBoundingClientRect().width,height:grid.getBoundingClientRect().height,columns:getComputedStyle(grid).gridTemplateColumns,containerType:getComputedStyle(grid).containerType})),
 cards:[...node.querySelectorAll<HTMLElement>('[data-diagram-box]')].map(card=>({tag:card.tagName,id:card.id,sourceDocument:card.getAttribute('data-source-document'),width:card.getBoundingClientRect().width,height:card.getBoundingClientRect().height})),
 captionHeight:node.querySelector('figcaption')?.getBoundingClientRect().height}));
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
   const walker=document.createTreeWalker(ink,NodeFilter.SHOW_TEXT);let paintedRects=0;const overflowRects:unknown[]=[];
   while(walker.nextNode()){
    const range=document.createRange();range.selectNodeContents(walker.currentNode);
    for(const rect of range.getClientRects())if(rect.width>0&&rect.height>0){
     paintedRects++;
     if(rect.top<box.top-2||rect.bottom>box.bottom+2){errors.push('inline formula ink outside its vertical text box');overflowRects.push({text:walker.currentNode.textContent,rect:rect.toJSON()});}
     if(!horizontalTravel&&(rect.left<box.left-2||rect.right>box.right+2))errors.push('inline formula ink outside its horizontal text box');
    }
   }
   if(horizontalTravel&&!['auto','scroll'].includes(style.overflowX))errors.push('inline formula horizontal travel lacks a scroll owner');
   if(paintedRects===0)errors.push('inline formula has no painted text');
   if(formulaBox.height===0||formulaBox.width===0||(formula.clientHeight>0&&formula.scrollHeight>formula.clientHeight+2&&['auto','scroll','hidden','clip'].includes(style.overflowY)))errors.push('inline formula has unreadable vertical clipping');
   records.push({kind:'inline-formula',tex:formula.querySelector('annotation[encoding="application/x-tex"]')?.textContent,owner:{tag:owner.tagName,id:owner.id,text:owner.textContent,box:box.toJSON()},overflowRects,display:style.display,boxWidth:formulaBox.width,boxHeight:formulaBox.height,horizontalTravel,clientWidth:formula.clientWidth,scrollWidth:formula.scrollWidth,clientHeight:formula.clientHeight,scrollHeight:formula.scrollHeight,paintedRects});
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
 expect((await page.locator('.course-list .feature-number').allTextContents()).map(Number)).toEqual([0,1,2,3,4,5,6,7,8,9,10]);
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
 await expect(article.locator('.lesson-header .eyebrow')).toHaveText('Chapter 00 · '+home.contentRevisionLabel+' '+document.data.content_revision);
 await expect(article.locator('figure,.katex,pre.rust-source-code,[data-cheat-sheet-open],[data-cheat-sheet-dialog]')).toHaveCount(0);
 const links=article.locator('.lesson-body ol a');
 expect(await links.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')))).toEqual(ids.slice(1,4).map(id=>'../'+id+'/'));
 await expectOrderedChapterNavigation(page,'en',document.id,chapterLinks,prefix);
});

 for(const lesson of lessons){
 const testLabel='Practical '+lesson.id+(lesson.id===ids[4]?' @chapter:04-padded-variable-batches':lesson.id===ids[5]?' @chapter:05-packed-sequence-masks':lesson.id===ids[6]?' @chapter:06-depth-stable-decoder':lesson.id===ids[7]?' @chapter:07-configurable-decoder-core':lesson.id===ids[8]?' @chapter:08-dropout-semantics':lesson.id===ids[9]?' @chapter:09-dependency-error-contract':lesson.id===ids[10]?' @chapter:10-input-encoding-boundary':'');
 test(testLabel+' built metadata formulas sources and evidence',async({page,request},testInfo)=>{
  const response=await request.get(lesson.path);expect(response.ok()).toBe(true);const html=await response.text();
  if(lesson.data.visualization.decision==='useful')expect(html).toContain('data-visualization-id="'+lesson.figureId+'"');
  expect(html).toContain('application/x-tex');
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
  const figure=figureFor(page,lesson.figureId);
  if(lesson.data.visualization.decision==='useful'){
   await expect(figure).toHaveCount(1);await expect(figure.locator('figcaption')).toHaveCount(1);
   await expect(figure).toHaveClass(/course-diagram/);await expect(figure).toHaveAttribute('data-diagram-style','course-v1');if(lesson.boxCount===null)expect(await figure.locator('[data-diagram-box]').count()).toBeGreaterThan(0);else await expect(figure.locator('[data-diagram-box]')).toHaveCount(lesson.boxCount);
  }else{
   await expect(page.locator('figure[data-visualization-id],[data-diagram-full-view-toggle]')).toHaveCount(0);
   expect(await page.locator('.lesson-body table thead th').count()).toBeGreaterThan(0);
  }
  await expect(page.locator('pre.rust-source-code')).toHaveCount(lesson.data.rust_sources.length);await expectOnlySharedDiagramClientScript(page);
  await expectOrderedChapterNavigation(page,'en',lesson.id,chapterLinks,prefix);
  await expect(page.locator('[data-locale="ru"]')).toHaveAttribute('href','/ru/');await expect(page.locator('[data-locale="ru"]')).toHaveAttribute('data-locale-fallback','locale-home');
  await expect(page.locator('head link[hreflang="ru"]')).toHaveCount(0);
  if(lesson.id===ids[1]){for(const value of [reference.reference_identity,String(reference.model.parameters),String(reference.evaluation.window_target_slots),String(reference.evaluation.document_transition_occurrences),JSON.stringify(reference.generation.token_ids)])await expect(figure).toContainText(value);}
  else if(lesson.id===ids[2]){expect(await figure.locator('annotation[encoding="application/x-tex"]').textContent()).toBe('\\frac{'+corpusTrace.documents.prepared+'}{'+corpusTrace.documents.input+'}');for(const role of ['train','validation','test']){const card=figure.locator('[data-corpus-role="'+role+'"]');await expect(card).toContainText(String(corpusTrace.splits[role].documents)+' fixture document');await expect(card).toContainText(String(corpusTrace.splits[role].decoded_text_utf8_bytes)+' decoded text bytes');}}
  else if(lesson.id===ids[3]) {
   // Check only rendering of the executed own-course trace. Historical policy behavior has no assertion or oracle here.
   const tables=figure.locator('table[data-diagram-table][data-bpe-rank]');await expect(tables).toHaveCount(tokenizerTrace.rounds.length);
   for(const [rank,round] of tokenizerTrace.rounds.entries()){
    const table=tables.nth(rank);await expect(table.locator('tbody tr')).toHaveCount(round.counts.length);
    expect(await table.locator('tbody tr').evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll('td')].map(cell=>cell.textContent)))).toEqual(round.counts.map((pair:{left:number;right:number;count:number})=>[String(pair.left),String(pair.right),String(pair.count)]));
    for(const value of round.sequences)await expect(table.locator('xpath=..')).toContainText(JSON.stringify(value));
   }
   for(const value of [tokenizerTrace.payloads.scalar_sha256,tokenizerTrace.payloads.incremental_sha256,JSON.stringify(tokenizerTrace.heldout.content_tokens),JSON.stringify(tokenizerTrace.heldout.document_tokens)])await expect(figure).toContainText(value);
   expect(await figure.locator('annotation[encoding="application/x-tex"]').textContent()).toBe('\\frac{'+tokenizerTrace.efficiency.content_tokens+'}{'+tokenizerTrace.efficiency.input_bytes+'}='+tokenizerTrace.efficiency.content_tokens/tokenizerTrace.efficiency.input_bytes);
  } else if(lesson.id===ids[4]) {
   for(const row of paddedTrace.rows){
    const card=figure.locator('article[data-source-document="'+row.document_id+'"]');
    await expect(card).toHaveCount(1);await expect(card).toContainText(JSON.stringify(row.encoded_document));
    const fields=card.locator('tbody tr');await expect(fields).toHaveCount(7);
    for(const [index,values] of [row.inputs,row.targets,row.positions,row.segments].entries())
     expect(await fields.nth(index).locator('td code').allTextContents()).toEqual(values.map(String));
    for(const [index,values] of [row.valid_tokens,row.valid_targets,row.loss_mask].entries())
     expect(await fields.nth(index+4).locator('td').allTextContents()).toEqual(values.map((value:boolean)=>value?'Yes':'No'));
    const keyLists=card.locator('ul li code');expect(await keyLists.allTextContents()).toEqual(row.allowed_keys.map((keys:number[])=>JSON.stringify(keys)));
   }
   const annotations=await figure.locator('annotation[encoding="application/x-tex"]').allTextContents();
   expect(annotations).toContain('\\approx '+paddedTrace.loss_probe.loss_sum_nats);
   expect(annotations).toContain(String(paddedTrace.loss_probe.valid_targets));
   expect(annotations).toContain('\\approx '+paddedTrace.loss_probe.mean_nats_per_valid_target);
  } else if(lesson.id===ids[5]) {
   await expect(figure.locator('table[data-diagram-table]')).toHaveCount(4);
   await expect(figure.locator('[data-diagram-scroll][role="region"][tabindex="0"]')).toHaveCount(4);
   for(const row of packedTrace.main.rows){
    const card=figure.locator('article[data-packed-row="'+row.row+'"]');await expect(card).toHaveCount(1);
    const metadata=card.locator('table[data-packed-metadata-row="'+row.row+'"]');
    await expect(metadata.locator('tbody tr')).toHaveCount(7);
    for(const [field,values] of [['input',row.inputs],['target',row.targets],['position',row.positions],['segment',row.segments]] as const)
     expect(await metadata.locator('tr[data-packed-field="'+field+'"] td code').allTextContents()).toEqual(values.map(String));
    for(const [field,values] of [['input-valid',row.valid_tokens],['target-valid',row.valid_targets],['loss-eligible',row.loss_mask]] as const)
     expect(await metadata.locator('tr[data-packed-field="'+field+'"] td').allTextContents()).toEqual(values.map((value:boolean)=>value?'Yes':'No'));
    const permissions=card.locator('table[data-packed-permission-row="'+row.row+'"]');
    await expect(permissions.locator('tbody tr')).toHaveCount(packedTrace.main.capacity_prediction_pairs);
    await expect(permissions.locator('td[data-query][data-key][data-permission]')).toHaveCount(packedTrace.main.capacity_prediction_pairs**2);
    for(const [query,keys] of row.allowed_keys.entries())for(let key=0;key<packedTrace.main.capacity_prediction_pairs;key++){
     const cell=permissions.locator('td[data-query="'+query+'"][data-key="'+key+'"]');
     const value=String(keys.includes(key)?1:0);await expect(cell).toHaveAttribute('data-permission',value);await expect(cell.locator('code')).toHaveText(value);
    }
   }
   for(const occurrence of packedTrace.main.occurrences){
    const item=figure.locator('[data-packed-occurrence="'+occurrence.ordinal+'"]');await expect(item).toHaveCount(1);
    const codes=await item.locator('code').allTextContents();
    expect(codes).toEqual([occurrence.example_id,String(occurrence.segment),JSON.stringify(occurrence.encoded_document),'['+occurrence.source_range.join(',')+')','['+occurrence.columns.join(',')+')']);
   }
   const counts=figure.locator('[data-packed-accounting="counts"]');
   expect(await counts.locator('annotation[encoding="application/x-tex"]').allTextContents()).toEqual([String(packedTrace.main.stored_cells),String(packedTrace.main.valid_targets),String(packedTrace.main.stored_cells-packedTrace.main.valid_targets),String(packedTrace.main.allowed_edges_per_head)]);
  } else if(lesson.id===ids[6]) {
   expect(depthTrace.inclusive_ratio_bounds).toEqual([0.01,100]);
   await expect(figure.locator('article[data-depth-fixture][data-depth-case="initialized"]')).toHaveCount(4);
   await expect(figure.locator('[data-depth-scroll][data-diagram-scroll][role="region"][tabindex="0"]')).toHaveCount(4);
   await expect(figure.locator('[data-diagram-scroll]:not([data-depth-scroll])[role="region"][tabindex="0"]')).toHaveCount(depthTrace.fixtures.length+1+depthTrace.synthetic_classifiers.length);
   const associations:unknown[]=[],normalizers:unknown[]=[],controls:unknown[]=[],synthetic:unknown[]=[];let siteCount=0;
   for(const fixture of depthTrace.fixtures){
    const card=figure.locator('article[data-depth-fixture="'+fixture.id+'"][data-depth-case="initialized"]');await expect(card).toHaveCount(1);
    for(const key of ['layers','width','heads','ff_width','vocabulary','max_positions','parameters'])
     await expect(card.locator('[data-depth-metric="'+key+'"] annotation[encoding="application/x-tex"]')).toHaveText(String(fixture[key]));
    await expectDepthScalar(card,'factor',fixture.factor);
    normalizers.push({fixture:fixture.id,input:await expectDepthScalar(card,'input_activation_normalizer',fixture.initialized.input_activation_normalizer),terminal:await expectDepthScalar(card,'terminal_adjoint_normalizer',fixture.initialized.terminal_adjoint_normalizer)});
    await expect(card.locator('[data-depth-metric="input_activation_normalizer"]')).toHaveAttribute('data-depth-site','0');
    await expect(card.locator('[data-depth-metric="terminal_adjoint_normalizer"]')).toHaveAttribute('data-depth-site',String(2*fixture.layers));
    await expect(card.locator('[data-depth-metric="within_band"]')).toHaveAttribute('data-depth-status',fixture.initialized.within_band?'within':'outside');
    const table=card.locator('table[data-depth-sites="'+fixture.id+'"]');await expect(table).toHaveCount(1);
    await expect(table.locator('tbody tr[data-depth-site]')).toHaveCount(2*fixture.layers+1);
    for(const site of fixture.initialized.sites){
     const row=table.locator('tr[data-depth-site="'+site.site+'"]');await expect(row).toHaveCount(1);
     const metrics=[];
     for(const metric of ['activation_rms','adjoint_rms','activation_ratio','adjoint_ratio'])metrics.push(await expectDepthScalar(row,metric,site[metric]));
     await expect(row.locator('[data-depth-metric="activation_status"]')).toHaveAttribute('data-depth-status',site.activation_status);
     await expect(row.locator('[data-depth-metric="adjoint_status"]')).toHaveAttribute('data-depth-status',site.adjoint_status);
     associations.push({fixture:fixture.id,site:site.site,traceLabel:site.label,metrics,activationStatus:site.activation_status,adjointStatus:site.adjoint_status});siteCount++;
    }
    const row=figure.locator('table[data-depth-controls] tr[data-depth-fixture="'+fixture.id+'"][data-depth-case="same_base_unscaled_control"]');await expect(row).toHaveCount(1);
    const control=fixture.same_base_unscaled_control;
    const activation=control.sites.map((site:{activation_ratio:number})=>site.activation_ratio),adjoint=control.sites.map((site:{adjoint_ratio:number})=>site.adjoint_ratio);
    const metrics=[];
    for(const [metric,value] of [['input_activation_normalizer',control.input_activation_normalizer],['terminal_adjoint_normalizer',control.terminal_adjoint_normalizer],['activation_ratio_min',Math.min(...activation)],['activation_ratio_max',Math.max(...activation)],['adjoint_ratio_min',Math.min(...adjoint)],['adjoint_ratio_max',Math.max(...adjoint)]] as const)metrics.push(await expectDepthScalar(row,metric,value));
    await expect(row.locator('[data-depth-metric="within_band"]')).toHaveAttribute('data-depth-status',control.within_band?'within':'outside');
    controls.push({fixture:fixture.id,metrics,withinBand:control.within_band});
   }
   expect(siteCount).toBe(30);
   await expect(figure.locator('[data-depth-synthetic]')).toHaveCount(depthTrace.synthetic_classifiers.length);
   for(const example of depthTrace.synthetic_classifiers){
    const region=figure.locator('[data-depth-synthetic="'+example.id+'"]');await expect(region.locator('tbody tr')).toHaveCount(example.ratios.length);
    for(const [site,ratio] of example.ratios.entries()){
     const row=region.locator('tr[data-depth-site="'+site+'"]');
     await expect(row.locator('[data-depth-metric="synthetic_ratio"]')).toHaveAttribute('data-depth-value',String(ratio));
     await expect(row.locator('[data-depth-metric="synthetic_ratio"] annotation[encoding="application/x-tex"]')).toHaveText(String(ratio));
     await expect(row.locator('[data-depth-metric="synthetic_status"]')).toHaveAttribute('data-depth-status',example.statuses[site]);
     synthetic.push({example:example.id,site,ratio,status:example.statuses[site]});
    }
   }
   await testInfo.attach('programmatic-depth-trace-associations',{body:JSON.stringify({route:lesson.path,figureId:lesson.figureId,siteCount,associations,normalizers,controls,synthetic}),contentType:'application/json'});
  } else if(lesson.id===ids[7]) {
   const reference=configurableTrace.scales.find((scale:{id:string})=>scale.id==='reference');
   const bridge=configurableTrace.scales.find((scale:{id:string})=>scale.id==='bridge');
   const laptop=configurableTrace.scales.find((scale:{id:string})=>scale.id==='laptop');
   const production=configurableTrace.scales.find((scale:{id:string})=>scale.id==='production-plan');
   const census:unknown[]=[];
   for(const key of ['embedding','attention','feed_forward','norms','total']){
    const cell=figure.locator('[data-configurable-parameter-group="'+key+'"] dd[data-configurable-count]');
    await expect(cell).toHaveCount(1);await expect(cell).toHaveAttribute('data-configurable-count',String(reference.census[key]));await expect(cell.locator('samp')).toHaveText(String(reference.census[key]));
    census.push({group:key,count:reference.census[key],rendered:await cell.textContent()});
   }
   for(const [kind,value] of [['semantic',reference.semantic_sha256],['run',reference.run_sha256]])await expect(figure.locator('[data-configurable-identity="'+kind+'"] code')).toHaveText(value);
   for(const [kind,value] of [['overlap',configurableTrace.toy_liveness.overlap_peak],['released',configurableTrace.toy_liveness.released_peak]])await expect(figure.locator('[data-configurable-liveness="'+kind+'"] samp')).toHaveText(String(value));
   const execute=figure.locator('#configurable-figure-execute'),refuse=figure.locator('#configurable-figure-refuse');
   await expect(execute).toHaveAttribute('data-configurable-reference-admissible',String(reference.admissible));await expect(execute).toHaveAttribute('data-configurable-bridge-admissible',String(bridge.admissible));
   await expect(refuse).toHaveAttribute('data-configurable-laptop-refusals',JSON.stringify(laptop.refusals));await expect(refuse).toHaveAttribute('data-configurable-production-refusals',JSON.stringify(production.refusals));
   await expect(figure.locator('[data-configurable-producer]')).toHaveCount(2);
   for(const producer of ['ordinary-text-token-forward','cached-text-token-forward'])await expect(figure.locator('[data-configurable-producer="'+producer+'"]')).toHaveCount(1);
   await expect(figure.locator('[data-configurable-consumer]')).toHaveCount(1);await expect(figure.locator('[data-configurable-consumer="one-causal-decoder"]')).toHaveCount(1);
   await testInfo.attach('programmatic-configurable-trace-associations',{body:JSON.stringify({route:lesson.path,figureId:lesson.figureId,census,identities:{semantic:reference.semantic_sha256,run:reference.run_sha256},liveness:configurableTrace.toy_liveness,admission:{reference:reference.admissible,bridge:bridge.admissible,laptop:laptop.refusals,production:production.refusals},producers:await figure.locator('[data-configurable-producer]').evaluateAll(nodes=>nodes.map(node=>({producer:node.getAttribute('data-configurable-producer'),text:node.textContent}))),consumer:await figure.locator('[data-configurable-consumer]').textContent()}),contentType:'application/json'});
  } else if(lesson.id===ids[8]) {
   const fixed=dropoutTrace.fixed_mask,display=(value:number)=>Object.is(value,-0)?'-0':String(value);
   const rows=figure.locator('#dropout-figure-values tbody tr');await expect(rows).toHaveCount(fixed.input.length);
   const associations:unknown[]=[];
   for(let index=0;index<fixed.input.length;index++){
    const row=figure.locator('tr[data-dropout-feature="'+(index+1)+'"]');await expect(row).toHaveCount(1);
    await expect(row.locator('th samp')).toHaveText(String(index+1));
    const state=index===2?'kept-zero':fixed.mask[index]===1?'kept':'dropped';await expect(row).toHaveAttribute('data-dropout-state',state);
    const values=[fixed.input[index],fixed.mask[index],fixed.mask[index]/fixed.keep_probability,fixed.training_output[index],fixed.upstream_gradient[index],fixed.input_gradient[index]].map(display);
    expect(await row.locator('td samp').allTextContents()).toEqual(values);
    associations.push({feature:index+1,state,values,trainingOutputBits:fixed.training_output_bits[index],inputGradientBits:fixed.input_gradient_bits[index]});
   }
   await expect(figure.locator('#dropout-figure-eval dd samp')).toHaveText('['+fixed.eval_output.map(display).join(',')+']');
   await expect(figure.locator('#dropout-figure-eval annotation[encoding="application/x-tex"]')).toHaveText('\\partial\\mathcal L/\\partial x_i=g_i');
   const r1=dropoutTrace.recompute.points.find((point:{point:string})=>point.point==='R1');expect(r1).toBeDefined();
   await expect(figure.locator('#dropout-figure-replay dd samp')).toHaveText(['['+r1.range.join(',')+')',r1.live_cursor_before+' → '+r1.live_cursor_after]);
   await expect(figure.locator('[data-diagram-scroll][role="region"][tabindex="0"]')).toHaveCount(1);
   await testInfo.attach('programmatic-dropout-trace-associations',{body:JSON.stringify({route:lesson.path,figureId:lesson.figureId,source:'actual compact Rust stdout',schema:dropoutTrace.schema,fixedMaskAssociations:associations,evalOutput:fixed.eval_output,replay:{point:r1.point,range:r1.range,liveCursorBefore:r1.live_cursor_before,liveCursorAfter:r1.live_cursor_after}}),contentType:'application/json'});
  } else if(lesson.id===ids[10]) {
   await expect(figure).toHaveAttribute('aria-labelledby','input-encoding-figure-title');
   await expect(figure).toHaveAttribute('aria-describedby','input-encoding-figure-description');
   const forward=figure.locator('#input-encoding-figure-flow');
   expect(await forward.locator(':scope > li').evaluateAll(nodes=>nodes.map(node=>node.id))).toEqual(['input-encoding-figure-encoder','input-encoding-figure-backbone','input-encoding-figure-head']);
   const annotations=await figure.locator('annotation[encoding="application/x-tex"]').allTextContents();
   for(const value of ['X\\;'+JSON.stringify(inputBoundary.shapes.embedding),'H\\;'+JSON.stringify(inputBoundary.shapes.hidden),JSON.stringify(inputBoundary.shapes.logits),'E\\;'+JSON.stringify(inputBoundary.shapes.table)])expect(annotations).toContain(value);
   const backward=figure.locator('section[aria-labelledby="input-encoding-gradient-title"]');
   await expect(backward.locator('[data-diagram-card]')).toHaveCount(3);
   const shared=backward.locator('#input-encoding-figure-shared-table');
   await expect(shared).toContainText(String(inputBoundary.shapes.table[0]*inputBoundary.shapes.table[1]));
   expect(await shared.locator('annotation[encoding="application/x-tex"]').allTextContents()).toContain('G_{\\mathrm{lookup}}+G_{\\mathrm{head}}');
   await testInfo.attach('programmatic-input-boundary-associations',{body:JSON.stringify({route:lesson.path,figureId:lesson.figureId,source:'actual new Rust golden stdout',shapes:inputBoundary.shapes,annotations,forward:await forward.ariaSnapshot(),backward:await backward.ariaSnapshot(),figureTitle:await figure.locator('#input-encoding-figure-title').textContent(),figureDescription:await figure.locator('#input-encoding-figure-description').textContent(),sourceCaptions:await page.locator('.lesson-body figure.rust-source figcaption').allTextContents()}),contentType:'application/json'});
  }
 });
 for(const viewport of [{width:1280,height:900},{width:320,height:844}]){
  test(testLabel+' formula and nearest-box containment '+viewport.width,async({page},testInfo)=>{
   await page.setViewportSize(viewport);await page.goto(lesson.path);await page.locator('article[data-chapter-root] details').evaluateAll(nodes=>nodes.forEach(node=>(node as HTMLDetailsElement).open=true));await page.evaluate(()=>document.fonts.ready);
   await expectNoPageOverflow(page);const figure=figureFor(page,lesson.figureId),hasFigure=lesson.data.visualization.decision==='useful';
   const diagram=hasFigure?await auditDiagramContainment(figure):null,geometry=hasFigure?await figureGeometry(figure):null;
   if(hasFigure)await expectStackedDiagramText(figure.locator('figcaption'),'h3','.course-diagram__description');
   const layout=await auditOrdinaryLayout(page.locator('main'));
   if(viewport.width<800)await expect(figure.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
   await testInfo.attach('programmatic-geometry',{body:JSON.stringify({route:lesson.path,figureId:lesson.figureId,state:'inline',answerDetails:'open',viewport,geometry,diagram,layout}),contentType:'application/json'});
   expect(diagram?.errors??[]).toEqual([]);expect(layout.errors).toEqual([]);
  });
 }
 if(lesson.data.visualization.decision==='useful'){
 test(testLabel+' full view keyboard tree focus and bounded travel',async({page},testInfo)=>{
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
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.fullscreenElement===null);await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(toggle).toBeFocused();await expect(figure).toHaveCount(1);
  const restoredControl=await controlValues(toggle);expect(restoredControl).toEqual(ordinaryControl);
  await testInfo.attach('programmatic-full-view-controls',{body:JSON.stringify({route:lesson.path,figureId:lesson.figureId,viewport,states:{inline:ordinaryControl,fullView:expandedControl,restored:restoredControl}}),contentType:'application/json'});
  if(lesson.id===ids[6])await testInfo.attach('programmatic-depth-full-view-names',{body:JSON.stringify({route:lesson.path,figureId:lesson.figureId,bodyTemplates:await page.locator('body').evaluate(node=>({open:node.getAttribute('data-diagram-full-view-open'),close:node.getAttribute('data-diagram-full-view-close')})),states:{inline:ordinaryControl,fullView:expandedControl,restored:restoredControl},button:await toggle.evaluate(node=>({text:node.textContent,ariaLabel:node.getAttribute('aria-label'),ariaControls:node.getAttribute('aria-controls'),title:node.getAttribute('title')}))}),contentType:'application/json'});
  if(lesson.id===ids[7])await testInfo.attach('programmatic-configurable-full-view-names',{body:JSON.stringify({route:lesson.path,figureId:lesson.figureId,bodyTemplates:await page.locator('body').evaluate(node=>({open:node.getAttribute('data-diagram-full-view-open'),close:node.getAttribute('data-diagram-full-view-close')})),states:{inline:ordinaryControl,fullView:expandedControl,restored:restoredControl},button:await toggle.evaluate(node=>({text:node.textContent,ariaLabel:node.getAttribute('aria-label'),ariaControls:node.getAttribute('aria-controls'),title:node.getAttribute('title')}))}),contentType:'application/json'});
 });
 test(testLabel+' no-API state has no usable enhancement',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(document,'fullscreenEnabled',{get:()=>false,configurable:true});});
  await page.setViewportSize({width:1280,height:900});await page.goto(lesson.path);await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
 });
 test(testLabel+' forced colors and RTL keep ordinary and expanded evidence',async({page},testInfo)=>{
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
 }else{
 test(testLabel+' forced colors and RTL preserve table and formula evidence',async({page},testInfo)=>{
  const viewport={width:1280,height:900};await page.setViewportSize(viewport);await page.emulateMedia({forcedColors:'active'});await page.goto(lesson.path);
  await page.locator('html').evaluate(node=>node.setAttribute('dir','rtl'));await page.locator('article[data-chapter-root] details').evaluateAll(nodes=>nodes.forEach(node=>(node as HTMLDetailsElement).open=true));await page.evaluate(()=>document.fonts.ready);
  const layout=await auditOrdinaryLayout(page.locator('main'));expect(layout.errors).toEqual([]);await expectNoPageOverflow(page);
  await expect(page.locator('figure[data-visualization-id],[data-diagram-full-view-toggle]')).toHaveCount(0);
  const tables=await page.locator('.lesson-body table').evaluateAll(nodes=>nodes.map(node=>({headers:[...node.querySelectorAll('thead th')].map(header=>header.textContent),rows:node.querySelectorAll('tbody tr').length})));
  expect(tables.length).toBeGreaterThan(0);for(const table of tables){expect(table.headers.length).toBeGreaterThan(0);expect(table.rows).toBeGreaterThan(0);}
  await testInfo.attach('programmatic-table-direction-geometry',{body:JSON.stringify({route:lesson.path,viewport,direction:'rtl',forcedColors:'active',tables,layout}),contentType:'application/json'});
 });
 }
 for(const viewport of [{width:1280,height:900},{width:320,height:480}]){
  test(testLabel+' glossary keyboard scrolling and focus '+viewport.width,async({page},testInfo)=>{
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
   if(lesson.id===ids[6])await testInfo.attach('programmatic-depth-glossary-associations',{body:JSON.stringify({route:lesson.path,viewport,openControl:await trigger.evaluate(node=>({text:node.textContent,ariaLabel:node.getAttribute('aria-label'),ariaControls:node.getAttribute('aria-controls')})),closeControl:await close.evaluate(node=>({text:node.textContent,ariaLabel:node.getAttribute('aria-label'),title:node.getAttribute('title')})),groups:await dialog.locator('[data-cheat-sheet-page][role="group"]').evaluateAll(nodes=>nodes.map(node=>({ariaLabel:node.getAttribute('aria-label'),terms:[...node.querySelectorAll('dt')].map(term=>term.textContent),definitions:[...node.querySelectorAll('dd')].map(term=>term.textContent)})))}),contentType:'application/json'});
   if(lesson.id===ids[7]){
    expect(await dialog.locator('.cheat-sheet-term').evaluateAll(nodes=>nodes.map(node=>node.id))).toEqual(terms.map((_,index)=>'configurable-decoder-term-'+(index+1)));
    await testInfo.attach('programmatic-configurable-glossary-associations',{body:JSON.stringify({route:lesson.path,viewport,openControl:await trigger.evaluate(node=>({outerHTML:node.outerHTML,text:node.textContent,ariaLabel:node.getAttribute('aria-label'),ariaControls:node.getAttribute('aria-controls')})),closeControl:await close.evaluate(node=>({outerHTML:node.outerHTML,text:node.textContent,ariaLabel:node.getAttribute('aria-label'),title:node.getAttribute('title')})),groups:await dialog.locator('[data-cheat-sheet-page][role="group"]').evaluateAll(nodes=>nodes.map(node=>({outerHTML:node.outerHTML,ariaLabel:node.getAttribute('aria-label'),ids:[...node.querySelectorAll('.cheat-sheet-term')].map(term=>term.id),terms:[...node.querySelectorAll('dt')].map(term=>term.textContent),definitions:[...node.querySelectorAll('dd')].map(term=>term.textContent)})))}),contentType:'application/json'});
   }
   if(lesson.id===ids[8]){
    expect(await dialog.locator('.cheat-sheet-term').evaluateAll(nodes=>nodes.map(node=>node.id))).toEqual(terms.map((_,index)=>'dropout-semantics-term-'+(index+1)));
    await testInfo.attach('programmatic-dropout-glossary-associations',{body:JSON.stringify({route:lesson.path,viewport,openControl:await trigger.evaluate(node=>({outerHTML:node.outerHTML,text:node.textContent,ariaLabel:node.getAttribute('aria-label'),ariaControls:node.getAttribute('aria-controls')})),closeControl:await close.evaluate(node=>({outerHTML:node.outerHTML,text:node.textContent,ariaLabel:node.getAttribute('aria-label'),title:node.getAttribute('title')})),groups:await dialog.locator('[data-cheat-sheet-page][role="group"]').evaluateAll(nodes=>nodes.map(node=>({outerHTML:node.outerHTML,ariaLabel:node.getAttribute('aria-label'),ids:[...node.querySelectorAll('.cheat-sheet-term')].map(term=>term.id),terms:[...node.querySelectorAll('dt')].map(term=>term.textContent),definitions:[...node.querySelectorAll('dd')].map(term=>term.textContent)})))}),contentType:'application/json'});
   }
   if(lesson.id===ids[10])expect(await dialog.locator('.cheat-sheet-term').evaluateAll(nodes=>nodes.map(node=>node.id))).toEqual(terms.map((_,index)=>'input-encoding-term-'+(index+1)));
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
