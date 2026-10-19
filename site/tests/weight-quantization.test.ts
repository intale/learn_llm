import {describe,expect,it} from 'vitest';
// @ts-ignore Node filesystem APIs are supplied only by the test runtime.
import {readFileSync} from 'node:fs';
import {parse} from 'parse5';
// @ts-ignore Use the maintained course frontmatter and Rust-source extractors.
import {extractRustRegion,extractRustSourceReferences,parseJsonFrontmatter} from '../../scripts/check-site-content.mjs';
import {sortCheatSheetTerms} from '../src/lib/cheat-sheets';

const chapter='17-weight-quantization';
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

describe('Chapter17 executed quantization evidence and static projections',()=>{
  it('binds the contract and all nine declared Rust excerpts to the executed report',()=>{
    expect(contract.rust.expected_output).toBe(raw);
    expect(contract.rust.package).toBe('practical-ch'+chapter);
    expect(observed.chapter).toBe(chapter);
    const references=extractRustSourceReferences(lesson.body);
    const identities=(entries:{path:string;region:string}[])=>entries.map(({path,region})=>path+'#'+region).sort();
    expect(identities(references)).toEqual(identities(lesson.data.rust_sources));
    expect(references).toHaveLength(9);
    for(const entry of references){expect(contract.rust.sources).toContain(entry.path);expect(extractRustRegion(read(entry.path),entry.region,entry.path).length).toBeGreaterThan(0);}
  });

  it('keeps formula metadata and all nine glossary definitions in their chapter projections',()=>{
    expect(lesson.data.formula.latex).toBe(contract.formula.latex);
    expect(lesson.data.formula.symbols).toEqual(contract.formula.symbols.map((symbol:{symbol:string;en:string})=>({symbol:symbol.symbol,meaning:symbol.en})));
    expect(lesson.data.visualization.id).toBe('weight-quantization');
    expect(sheet.terms.map((term:{term:string})=>term.term)).toEqual(contract.terminology.map((term:{en:string})=>term.en));
    expect(sheet.terms).toHaveLength(9);
    const nodes=walk(built()),dialogs=nodes.filter(node=>node.tagName==='dialog'&&attribute(node,'data-cheat-sheet-dialog')!==undefined);
    expect(dialogs).toHaveLength(1);
    const terms=sortCheatSheetTerms(sheet.terms,'en');
    expect(walk(dialogs[0]).filter(node=>node.tagName==='dt').map(text)).toEqual(terms.map(term=>term.term));
    expect(walk(dialogs[0]).filter(node=>node.tagName==='dd').map(text)).toEqual(terms.map(term=>term.definition));
    expect(annotations(built())).toContain(contract.formula.latex);
  });

  it('renders both code-and-scale comparison cards from the same accepted Rust report',()=>{
    const document=built(),figure=byId(document,'weight-quantization-figure');
    expect(attribute(figure,'aria-labelledby')).toBe('weight-quantization-figure-title');
    expect(attribute(figure,'aria-describedby')).toBe('weight-quantization-figure-description weight-quantization-figure-scope');
    expect(walk(figure).filter(node=>attribute(node,'data-quantization-role')!==undefined).map(node=>attribute(node,'data-quantization-role'))).toEqual(['source-matrix','code-and-scale-storage','dequantized-matmul','group-comparison','group-comparison']);
    expect(walk(figure).filter(node=>attribute(node,'data-diagram-box')!==undefined)).toHaveLength(5);
    for(const probe of observed.matrix_probes){
      const card=byId(figure,'weight-quantization-group-'+probe.group_size);
      expect(attribute(card,'data-quantization-group-size')).toBe(String(probe.group_size));
      expect(attribute(card,'aria-labelledby')).toBe('weight-quantization-group-'+probe.group_size+'-title');
      expect(walk(card).filter(node=>node.tagName==='code').map(text)).toEqual([probe.packed_hex.join(' ')]);
      expect(annotations(card)).toEqual([String(probe.group_size),String(probe.scale_bytes),probe.output_error.max_absolute_error.toFixed(12),probe.output_error.mean_squared_error.toFixed(12)]);
      expect(walk(card).filter(node=>node.tagName==='dt')).toHaveLength(4);
      expect(walk(card).filter(node=>node.tagName==='dd')).toHaveLength(4);
    }
  });

  it('binds the displayed storage rows to source and both derived archives',()=>{
    const document=built(),representations=[observed.source,...observed.quantized_models];
    for(const[id,key]of[['codes','weight_bytes'],['scales','scale_bytes'],['shapes','logical_shape_bytes'],['unchanged','unchanged_payload_bytes'],['payload','total_payload_bytes'],['file','file_bytes']]){
      const row=byId(document,'weight-quantization-storage-'+id);
      expect(annotations(row)).toEqual(representations.map(item=>String(item.storage[key])));
      expect(walk(row).filter(node=>node.tagName==='th'&&attribute(node,'scope')==='row')).toHaveLength(1);
    }
    for(const id of ['weight-quantization-probe-errors','weight-quantization-model-storage','weight-quantization-model-nll']){
      const table=byId(document,id);
      expect(walk(table).filter(node=>node.tagName==='caption')).toHaveLength(1);
      expect(walk(table).filter(node=>node.tagName==='th'&&attribute(node,'scope')==='col').length).toBeGreaterThan(1);
    }
    const nodes=walk(document);
    expect(nodes.filter(node=>node.tagName==='a'&&attribute(node,'rel')==='prev').map(node=>attribute(node,'href'))).toEqual(['/en/practical-llm-in-rust/16-language-model-evaluation/']);
    expect(nodes.filter(node=>node.tagName==='a'&&attribute(node,'rel')==='next')).toHaveLength(0);
  });
});
