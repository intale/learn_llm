import {describe,expect,it} from 'vitest';
// @ts-ignore Node filesystem APIs are supplied only by the test runtime.
import {readFileSync} from 'node:fs';
import {parse} from 'parse5';
// @ts-ignore Reuse the maintained frontmatter and Rust-source extractors.
import {extractRustRegion,extractRustSourceReferences,parseJsonFrontmatter} from '../../scripts/check-site-content.mjs';
import {sortCheatSheetTerms} from '../src/lib/cheat-sheets';

const chapter='20-paged-kv-layout';
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

describe('Chapter20 actual paged-cache report and static projections',()=>{
  it('binds the exact stdout and seven declared Rust regions to the real sources',()=>{
    expect(contract.rust.expected_output).toBe(raw);
    expect(contract.rust.package).toBe('practical-ch'+chapter);
    const references=extractRustSourceReferences(lesson.body);
    const identities=(entries:{path:string;region:string}[])=>entries.map(({path,region})=>path+'#'+region).sort();
    expect(identities(references)).toEqual(identities(lesson.data.rust_sources));
    expect(references).toHaveLength(7);expect(new Set(identities(references)).size).toBe(7);
    for(const entry of references){expect(contract.rust.sources).toContain(entry.path);expect(extractRustRegion(read(entry.path),entry.region,entry.path).length).toBeGreaterThan(0);}
    expect([...contract.rust.sources].sort()).toEqual([...new Set([...references.map((entry:{path:string})=>entry.path),'rust/demos/practical-ch'+chapter+'/src/main.rs'])].sort());
    expect(walk(built()).filter(node=>node.tagName==='pre'&&attribute(node,'class')?.split(' ').includes('rust-source-code'))).toHaveLength(7);
  });

  it('projects the formula and all eight glossary pairs with unique native anchors',()=>{
    expect(lesson.data.formula.latex).toBe(contract.formula.latex);
    expect(lesson.data.formula.symbols).toEqual(contract.formula.symbols.map((symbol:{symbol:string;en:string})=>({symbol:symbol.symbol,meaning:symbol.en})));
    expect(lesson.data.visualization.id).toBe('paged-kv-layout');
    expect(sheet.terms.map((term:{term:string})=>term.term)).toEqual(contract.terminology.map((term:{en:string})=>term.en));
    expect(sheet.terms).toHaveLength(8);
    const document=built(),dialogs=walk(document).filter(node=>node.tagName==='dialog'&&attribute(node,'data-cheat-sheet-dialog')!==undefined);
    expect(dialogs).toHaveLength(1);const terms=sortCheatSheetTerms(sheet.terms,'en');
    expect(walk(dialogs[0]).filter(node=>node.tagName==='dt').map(text)).toEqual(terms.map(term=>term.term));
    expect(walk(dialogs[0]).filter(node=>node.tagName==='dd').map(text)).toEqual(terms.map(term=>term.definition));
    expect(annotations(document)).toContain(contract.formula.latex);
    for(let index=0;index<terms.length;index++)byId(dialogs[0],'paged-kv-layout-term-'+(index+1));
  });

  it('keeps every reported token within its logical-page mapping and annotation order',()=>{
    const figure=byId(built(),'paged-kv-layout-figure');
    expect(attribute(figure,'aria-labelledby')).toBe('paged-kv-layout-figure-title');
    expect(attribute(figure,'aria-describedby')).toBe('paged-kv-layout-figure-description paged-kv-layout-figure-scope');
    expect(walk(figure).filter(node=>attribute(node,'data-diagram-box')!==undefined)).toHaveLength(13);
    expect(annotations(byId(figure,'paged-kv-layout-figure-settings'))).toEqual(['C='+observed.capacity+',n='+observed.length+',P='+observed.page_tokens,'T=('+observed.page_table.join(',')+')']);
    const logical=walk(figure).filter(node=>attribute(node,'data-kv-role')==='logical-page');expect(logical).toHaveLength(3);
    for(const row of observed.mappings){
      const card=byId(figure,'paged-kv-layout-logical-page-'+row.address.logical_page);
      expect(attribute(card,'data-logical-page')).toBe(String(row.address.logical_page));
      expect(annotations(byId(card,'paged-kv-layout-logical-page-'+row.address.logical_page+'-title'))).toEqual([String(row.address.logical_page),String(row.address.physical_page)]);
      const token=byId(card,'paged-kv-layout-token-'+row.address.logical_position);
      expect(attribute(token,'data-physical-page')).toBe(String(row.address.physical_page));
      expect(annotations(token)).toEqual([row.address.logical_position,row.address.offset_in_page,row.key_scalar_start_head0].map(String));
    }
  });

  it('projects physical-page assignment and all twelve position states from Rust',()=>{
    const figure=byId(built(),'paged-kv-layout-figure');
    const pages=walk(figure).filter(node=>attribute(node,'data-kv-role')==='physical-page');expect(pages).toHaveLength(observed.physical_pages.length);
    for(const page of observed.physical_pages){
      const card=byId(figure,'paged-kv-layout-physical-page-'+page.physical_page);
      expect(annotations(card)).toEqual([page.physical_page,page.logical_page,...page.positions.map((position:{logical_position:number})=>position.logical_position)].map(String));
      expect(walk(card).filter(node=>attribute(node,'data-kv-position-state')!==undefined).map(node=>attribute(node,'data-kv-position-state'))).toEqual(page.positions.map((position:{state:string})=>position.state));
    }
  });

  it('projects both-buffer payload partitions and retains the actual navigation and practice',()=>{
    const document=built(),figure=byId(document,'paged-kv-layout-figure'),payload=observed.per_layer_payloads[0];
    for(const[id,fields]of[
      ['allocated',['allocated_scalar_slots','allocated_payload_bytes']],
      ['live',['live_scalar_slots','live_payload_bytes']],
      ['unused',['unused_scalar_slots','unused_payload_bytes','active_page_tail_scalar_slots','active_page_tail_payload_bytes','inactive_page_scalar_slots','inactive_page_payload_bytes']],
      ['tail',['active_page_tail_scalar_slots','active_page_tail_payload_bytes']],
      ['whole',['inactive_page_scalar_slots','inactive_page_payload_bytes']],
    ] as [string,string[]][])expect(annotations(byId(figure,'paged-kv-layout-'+id))).toEqual(fields.map(field=>String(payload[field])));
    expect(annotations(byId(figure,'paged-kv-layout-total'))).toEqual([String(observed.total_allocated_payload_bytes)]);
    const nodes=walk(document);expect(nodes.filter(node=>node.tagName==='a'&&attribute(node,'rel')==='prev').map(node=>attribute(node,'href'))).toEqual(['/en/practical-llm-in-rust/19-online-tiled-attention/']);
    expect(nodes.filter(node=>node.tagName==='a'&&attribute(node,'rel')==='next')).toHaveLength(0);
    for(let index=1;index<=4;index++){byId(document,'paged-kv-layout-practice-'+index);byId(document,'paged-kv-layout-answer-'+index);}
  });
});
