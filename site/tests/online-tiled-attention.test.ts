import {describe,expect,it} from 'vitest';
// @ts-ignore Node filesystem APIs are supplied only by the test runtime.
import {readFileSync} from 'node:fs';
import {parse} from 'parse5';
// @ts-ignore Reuse the maintained frontmatter and Rust-source extractors.
import {extractRustRegion,extractRustSourceReferences,parseJsonFrontmatter} from '../../scripts/check-site-content.mjs';
import {sortCheatSheetTerms} from '../src/lib/cheat-sheets';

const chapter='19-online-tiled-attention';
const read=(path:string)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const raw=read('rust/demos/practical-ch'+chapter+'/expected.txt');
const observed=JSON.parse(raw);
const contract=parseJsonFrontmatter(read('curriculum/practical/chapters/'+chapter+'.md'),chapter).data;
const lesson=parseJsonFrontmatter(read('site/src/content/practical-chapters/en/'+chapter+'.mdx'),chapter);
const sheet=JSON.parse(read('site/src/content/practical-cheat-sheets/en/'+chapter+'.json'));
interface HtmlNode {nodeName:string;tagName?:string;value?:string;attrs?:{name:string;value:string}[];childNodes?:HtmlNode[]}
const attribute=(node:HtmlNode,name:string)=>node.attrs?.find(item=>item.name===name)?.value;
const walk=(node:HtmlNode):HtmlNode[]=>[node,...(node.childNodes??[]).flatMap(walk)];
const text=(node:HtmlNode):string=>node.value??(node.childNodes??[]).map(text).join('');
const annotations=(node:HtmlNode)=>walk(node).filter(item=>item.tagName==='annotation'&&attribute(item,'encoding')==='application/x-tex').map(text);
const built=()=>parse(read('site/dist/en/practical-llm-in-rust/'+chapter+'/index.html')) as unknown as HtmlNode;
const byId=(root:HtmlNode,id:string)=>{const matches=walk(root).filter(node=>attribute(node,'id')===id);expect(matches).toHaveLength(1);return matches[0];};
const numeric=(value:number)=>String(value).replace(/e([+-]?\d+)$/,'\\times10^{$1}');
const valuePair=(root:HtmlNode,id:string,expected:string[])=>{
  const pair=byId(root,id);
  expect((pair.childNodes??[]).filter(node=>node.tagName==='dt')).toHaveLength(1);
  expect((pair.childNodes??[]).filter(node=>node.tagName==='dd')).toHaveLength(1);
  expect(annotations(pair)).toEqual(expected);
};

describe('Chapter19 executed attention values and their static projections',()=>{
  it('binds the exact report and all nine Rust regions to registered current sources',()=>{
    expect(contract.rust.expected_output).toBe(raw);
    expect(contract.rust.package).toBe('practical-ch'+chapter);
    const references=extractRustSourceReferences(lesson.body);
    const identities=(entries:{path:string;region:string}[])=>entries.map(({path,region})=>path+'#'+region).sort();
    expect(identities(references)).toEqual(identities(lesson.data.rust_sources));
    expect(references).toHaveLength(9);
    expect(new Set(identities(references)).size).toBe(9);
    for(const entry of references){expect(contract.rust.sources).toContain(entry.path);expect(extractRustRegion(read(entry.path),entry.region,entry.path).length).toBeGreaterThan(0);}
    expect([...contract.rust.sources].sort()).toEqual([...new Set([...references.map((entry:{path:string})=>entry.path),'rust/demos/practical-ch'+chapter+'/src/main.rs'])].sort());
    expect(walk(built()).filter(node=>node.tagName==='pre'&&attribute(node,'class')?.split(' ').includes('rust-source-code'))).toHaveLength(9);
  });

  it('projects the formula and all eight glossary definitions with unique associated anchors',()=>{
    expect(lesson.data.formula.latex).toBe(contract.formula.latex);
    expect(lesson.data.formula.symbols).toEqual(contract.formula.symbols.map((symbol:{symbol:string;en:string})=>({symbol:symbol.symbol,meaning:symbol.en})));
    expect(lesson.data.visualization.id).toBe('online-tiled-attention');
    expect(sheet.terms.map((term:{term:string})=>term.term)).toEqual(contract.terminology.map((term:{en:string})=>term.en));
    expect(sheet.terms).toHaveLength(8);
    const document=built(),dialogs=walk(document).filter(node=>node.tagName==='dialog'&&attribute(node,'data-cheat-sheet-dialog')!==undefined);
    expect(dialogs).toHaveLength(1);
    const terms=sortCheatSheetTerms(sheet.terms,'en');
    expect(walk(dialogs[0]).filter(node=>node.tagName==='dt').map(text)).toEqual(terms.map(term=>term.term));
    expect(walk(dialogs[0]).filter(node=>node.tagName==='dd').map(text)).toEqual(terms.map(term=>term.definition));
    expect(annotations(document)).toContain(contract.formula.latex);
    for(let index=0;index<terms.length;index++)byId(dialogs[0],'online-tiled-attention-term-'+(index+1));
  });

  it('keeps both observed running states and each dt/dd value together in document order',()=>{
    const figure=byId(built(),'online-tiled-attention-figure'),fixture=observed.worked_example;
    expect(attribute(figure,'aria-labelledby')).toBe('online-tiled-attention-figure-title');
    expect(attribute(figure,'aria-describedby')).toBe('online-tiled-attention-figure-description online-tiled-attention-figure-scope');
    expect(walk(figure).filter(node=>attribute(node,'data-diagram-box')!==undefined)).toHaveLength(8);
    expect(walk(figure).filter(node=>attribute(node,'data-online-attention-role')!==undefined).map(node=>attribute(node,'data-online-attention-role'))).toEqual(['successive-summary','successive-summary','output-comparison','output-comparison']);
    for(const[index,state]of fixture.tile_summaries.entries()){
      const id='online-tiled-attention-state-'+index,card=byId(figure,id);
      expect(attribute(card,'data-summary-index')).toBe(String(index));
      expect(attribute(card,'aria-labelledby')).toBe(id+'-title');
      valuePair(card,id+'-keys',['['+state.key_start+','+state.key_end+')']);
      valuePair(card,id+'-maximum',['m',numeric(state.maximum)]);
      valuePair(card,id+'-rescale',['\\alpha',numeric(state.previous_rescale)]);
      valuePair(card,id+'-normalizer',['\\ell',numeric(state.normalizer)]);
      for(const[coordinate,value]of(state.weighted_sum as number[]).entries())valuePair(card,id+'-weighted-'+coordinate,[numeric(coordinate),numeric(value)]);
    }
  });

  it('projects every output coordinate and all-coordinate comparison bounds from the real report',()=>{
    const figure=byId(built(),'online-tiled-attention-figure'),fixture=observed.worked_example;
    for(const[coordinate,value]of(fixture.last_tiled_output as number[]).entries()){
      const id='online-tiled-attention-output-'+coordinate,card=byId(figure,id);
      expect(attribute(card,'aria-labelledby')).toBe(id+'-title');
      expect(annotations(byId(card,id+'-title'))).toEqual([String(coordinate)]);
      valuePair(card,id+'-tiled',[numeric(value)]);
      valuePair(card,id+'-reference',[numeric(fixture.last_reference_output[coordinate])]);
    }
    valuePair(figure,'online-tiled-attention-output-error',[numeric(fixture.max_abs_output_error)]);
    valuePair(figure,'online-tiled-attention-output-tolerance',[numeric(fixture.absolute_tolerance)]);
  });

  it('projects the actual storage rows, previous link and four authored practice/answer pairs',()=>{
    const document=built();
    for(const[id,values]of[
      ['online-tiled-attention-grid-counts',observed.storage_comparisons.flatMap((row:any)=>[row.tokens,row.reference_score_values,row.reference_probability_values,row.tiled.maximum_score_tile_values])],
      ['online-tiled-attention-linear-counts',observed.storage_comparisons.flatMap((row:any)=>[row.tokens,row.tiled.input_values,row.tiled.output_values,row.tiled.row_statistic_values])]
    ] as [string,number[]][]){
      const owner=byId(document,id),table=walk(owner).filter(node=>node.tagName==='table');expect(table).toHaveLength(1);
      expect(attribute(owner,'role')).toBe('region');expect(attribute(owner,'tabindex')).toBe('0');expect(attribute(owner,'aria-label')?.trim().length).toBeGreaterThan(0);
      expect(walk(table[0]).filter(node=>node.tagName==='th')).toHaveLength(4);
      expect(walk(table[0]).filter(node=>node.tagName==='td').flatMap(annotations)).toEqual(values.map(String));
    }
    const nodes=walk(document);
    expect(nodes.filter(node=>node.tagName==='a'&&attribute(node,'rel')==='prev').map(node=>attribute(node,'href'))).toEqual(['/en/practical-llm-in-rust/18-grouped-query-attention-context/']);
    expect(nodes.filter(node=>node.tagName==='a'&&attribute(node,'rel')==='next')).toHaveLength(0);
    for(let index=1;index<=4;index++){byId(document,'online-tiled-attention-practice-'+index);byId(document,'online-tiled-attention-answer-'+index);}
  });
});
