import {describe,expect,it} from 'vitest';
// @ts-ignore Node filesystem APIs are supplied only by the test runtime.
import {readFileSync} from 'node:fs';
import {parse} from 'parse5';
// @ts-ignore Reuse the maintained frontmatter and Rust-source extractors.
import {extractRustRegion,extractRustSourceReferences,parseJsonFrontmatter} from '../../scripts/check-site-content.mjs';
import {sortCheatSheetTerms} from '../src/lib/cheat-sheets';

const chapter='18-grouped-query-attention-context';
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
const vector=(values:number[])=>'('+values.join(',\\,')+')';

describe('Chapter18 executed shared-head/window evidence and static projections',()=>{
  it('binds the exact report and nine displayed regions to six registered Rust sources',()=>{
    expect(contract.rust.expected_output).toBe(raw);
    expect(contract.rust.package).toBe('practical-ch'+chapter);
    const references=extractRustSourceReferences(lesson.body);
    const identities=(entries:{path:string;region:string}[])=>entries.map(({path,region})=>path+'#'+region).sort();
    expect(identities(references)).toEqual(identities(lesson.data.rust_sources));
    expect(references).toHaveLength(9);
    expect(new Set(identities(references)).size).toBe(9);
    for(const entry of references){expect(contract.rust.sources).toContain(entry.path);expect(extractRustRegion(read(entry.path),entry.region,entry.path).length).toBeGreaterThan(0);}
    expect([...contract.rust.sources].sort()).toEqual([...new Set([...references.map((entry:{path:string})=>entry.path),'rust/demos/practical-ch'+chapter+'/src/main.rs'])].sort());
  });

  it('retains formula metadata and nine associated glossary definitions in built HTML',()=>{
    expect(lesson.data.formula.latex).toBe(contract.formula.latex);
    expect(lesson.data.formula.symbols).toEqual(contract.formula.symbols.map((symbol:{symbol:string;en:string})=>({symbol:symbol.symbol,meaning:symbol.en})));
    expect(lesson.data.visualization.id).toBe('grouped-query-attention');
    expect(sheet.terms.map((term:{term:string})=>term.term)).toEqual(contract.terminology.map((term:{en:string})=>term.en));
    expect(sheet.terms).toHaveLength(9);
    const document=built(),dialogs=walk(document).filter(node=>node.tagName==='dialog'&&attribute(node,'data-cheat-sheet-dialog')!==undefined);
    expect(dialogs).toHaveLength(1);
    const terms=sortCheatSheetTerms(sheet.terms,'en');
    expect(walk(dialogs[0]).filter(node=>node.tagName==='dt').map(text)).toEqual(terms.map(term=>term.term));
    expect(walk(dialogs[0]).filter(node=>node.tagName==='dd').map(text)).toEqual(terms.map(term=>term.definition));
    expect(annotations(document)).toContain(contract.formula.latex);
    for(let index=0;index<terms.length;index++)byId(dialogs[0],'grouped-query-attention-term-'+(index+1));
  });

  it('associates each observed query group with its actual KV identity and four value vectors',()=>{
    const figure=byId(built(),'grouped-query-attention-figure'),fixture=observed.worked_example,source=fixture.cases[0];
    expect(attribute(figure,'aria-labelledby')).toBe('grouped-query-attention-figure-title');
    expect(attribute(figure,'aria-describedby')).toBe('grouped-query-attention-figure-description grouped-query-attention-figure-scope');
    expect(walk(figure).filter(node=>attribute(node,'data-diagram-box')!==undefined)).toHaveLength(6);
    expect(walk(figure).filter(node=>attribute(node,'data-grouped-query-role')!==undefined).map(node=>attribute(node,'data-grouped-query-role'))).toEqual(['shared-kv-group','shared-kv-group','context-comparison','context-comparison']);
    for(let head=0;head<fixture.kv_heads;head++){
      const card=byId(figure,'grouped-query-attention-kv-'+head);
      expect(attribute(card,'data-kv-head')).toBe(String(head));
      expect(attribute(card,'aria-labelledby')).toBe('grouped-query-attention-kv-'+head+'-title');
      const queries=source.head_mapping.flatMap((shared:number,query:number)=>shared===head?[query]:[]);
      expect(annotations(byId(card,'grouped-query-attention-kv-'+head+'-relationship'))).toEqual([queries.join(',\\,'),'\\longrightarrow',String(head)]);
      for(let cell=0;cell<source.key_shape[2];cell++){
        const offset=(head*source.key_shape[2]+cell)*fixture.head_width;
        expect(annotations(byId(card,'grouped-query-attention-kv-'+head+'-cell-'+cell))).toEqual([String(cell),vector(source.value_heads.slice(offset,offset+fixture.head_width))]);
      }
    }
  });

  it('renders the two observed final-query probability vectors and every corresponding head output',()=>{
    const figure=byId(built(),'grouped-query-attention-figure'),fixture=observed.worked_example;
    for(const[rowIndex,row]of fixture.cases.entries()){
      const card=byId(figure,'grouped-query-attention-context-'+rowIndex);
      expect(attribute(card,'data-context-case')).toBe(String(rowIndex));
      expect(attribute(card,'aria-labelledby')).toBe('grouped-query-attention-context-'+rowIndex+'-title');
      expect(annotations(byId(card,'grouped-query-attention-context-'+rowIndex+'-probabilities'))).toEqual([vector(row.last_query_weights[0])]);
      const table=byId(card,'grouped-query-attention-context-'+rowIndex+'-outputs');
      expect(walk(table).filter(node=>node.tagName==='caption')).toHaveLength(1);
      expect(walk(table).filter(node=>node.tagName==='th'&&attribute(node,'scope')==='col')).toHaveLength(2);
      for(let query=0;query<row.head_mapping.length;query++)expect(annotations(byId(table,'grouped-query-attention-context-'+rowIndex+'-output-'+query))).toEqual([String(query),vector(row.last_merged_output.slice(query*fixture.head_width,(query+1)*fixture.head_width))]);
    }
  });

  it('binds all four storage rows to the actual initialized-model report',()=>{
    const document=built(),table=byId(document,'grouped-query-attention-storage-table');
    expect(walk(table).filter(node=>node.tagName==='caption')).toHaveLength(1);
    expect(walk(table).filter(node=>node.tagName==='th'&&attribute(node,'scope')==='col')).toHaveLength(5);
    for(const[index,id]of['mha','gqa','mqa','window'].entries()){
      const row=byId(table,'grouped-query-attention-storage-'+id),model=observed.model_comparisons[index];
      const cells=walk(row).filter(node=>node.tagName==='td');
      expect(cells).toHaveLength(4);
      expect(cells.flatMap(annotations)).toEqual([model.attention_scalars_per_layer,model.model_scalars,model.allocated_kv_payload_bytes,model.logical_kv_payload_bytes].map(String));
      expect(walk(row).filter(node=>node.tagName==='th'&&attribute(node,'scope')==='row')).toHaveLength(1);
    }
    const nodes=walk(document);
    expect(nodes.filter(node=>node.tagName==='a'&&attribute(node,'rel')==='prev').map(node=>attribute(node,'href'))).toEqual(['/en/practical-llm-in-rust/17-weight-quantization/']);
    expect(nodes.filter(node=>node.tagName==='a'&&attribute(node,'rel')==='next')).toHaveLength(0);
  });
});
