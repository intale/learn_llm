import {describe, expect, it} from 'vitest';
// @ts-ignore Node filesystem APIs are supplied only by the test runtime.
import {readFileSync} from 'node:fs';
import {parse} from 'parse5';
// @ts-ignore Use the maintained course frontmatter and Rust-source extractors.
import {extractRustRegion, extractRustSourceReferences, parseJsonFrontmatter} from '../../scripts/check-site-content.mjs';
import {sortCheatSheetTerms} from '../src/lib/cheat-sheets';

const chapter='16-language-model-evaluation';
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

describe('Chapter16 executed evaluation evidence and static projections',()=>{
  it('binds the contract and every declared Rust excerpt to the executed example',()=>{
    expect(contract.rust.expected_output).toBe(raw);
    expect(contract.rust.package).toBe('practical-ch'+chapter);
    expect(observed.chapter).toBe(chapter);
    const references=extractRustSourceReferences(lesson.body);
    expect(references.map(({path,region}:{path:string;region:string})=>({path,region}))).toEqual(lesson.data.rust_sources.map(({path,region}:{path:string;region:string})=>({path,region})));
    expect(references.length).toBeGreaterThan(0);
    for(const entry of references){
      expect(contract.rust.sources).toContain(entry.path);
      expect(extractRustRegion(read(entry.path),entry.region,entry.path).length).toBeGreaterThan(0);
    }
  });

  it('keeps mathematical metadata and glossary definitions in their matching chapter projection',()=>{
    expect(lesson.data.formula.latex).toBe(contract.formula.latex);
    expect(lesson.data.formula.symbols).toEqual(contract.formula.symbols.map((symbol:{symbol:string;en:string})=>({symbol:symbol.symbol,meaning:symbol.en})));
    expect(lesson.data.visualization.id).toBe('language-model-evaluation');
    expect(sheet.terms.map((term:{term:string})=>term.term)).toEqual(contract.terminology.map((term:{en:string})=>term.en));
    expect(sheet.locale).toBe('en');
  });

  it('preserves the full seed and checkpoint observations without selecting a favorable run',()=>{
    expect(observed.runs.map((run:{initialization_seed:number})=>run.initialization_seed)).toEqual([39,40,41]);
    for(const run of observed.runs){
      expect(run.checkpoints.map((point:{update:number})=>point.update)).toEqual([0,10,20,40,80]);
      for(const point of run.checkpoints){
        expect(point.train.valid_targets).toBe(9);
        expect(point.validation.valid_targets).toBe(9);
        expect(point.recorded_graphs).toBe(0);
      }
    }
    expect(observed.baseline.fitted_documents).toBe(2);
    expect(observed.baseline.fitted_transitions).toBe(9);
    expect(observed.baseline.validation.valid_targets).toBe(9);
    expect(observed.saved_first_seed_model.seed).toBe(39);
    expect(observed.saved_first_seed_model.update).toBe(80);
    expect(observed.final_validation_seed_summary.seed_count).toBe(3);
  });

  it('renders all fifteen Rust checkpoint rows as static table values and math annotations',()=>{
    const nodes=walk(built());
    const figures=nodes.filter(node=>node.tagName==='figure'&&attribute(node,'data-visualization-id')==='language-model-evaluation');
    expect(figures).toHaveLength(1);
    const figure=figures[0];
    expect(attribute(figure,'aria-labelledby')).toBe('language-model-evaluation-figure-title');
    expect(attribute(figure,'aria-describedby')).toBe('language-model-evaluation-figure-description language-model-evaluation-figure-scope');
    expect(walk(figure).filter(node=>attribute(node,'data-evaluation-role')!==undefined).map(node=>attribute(node,'data-evaluation-role'))).toEqual(['training-only-update','frozen-weights','two-split-evaluation']);
    expect(walk(figure).filter(node=>attribute(node,'data-evaluation-update')!==undefined)).toHaveLength(15);
    for(const run of observed.runs){
      const cards=walk(figure).filter(node=>attribute(node,'data-evaluation-seed')===String(run.initialization_seed));
      expect(cards).toHaveLength(1);
      const rows=walk(cards[0]).filter(node=>attribute(node,'data-evaluation-update')!==undefined);
      expect(rows).toHaveLength(run.checkpoints.length);
      rows.forEach((row,index)=>{
        const point=run.checkpoints[index];
        expect(attribute(row,'data-evaluation-update')).toBe(String(point.update));
        expect(attribute(row,'data-train-nll')).toBe(String(point.train.mean_nll_nats_per_target));
        expect(attribute(row,'data-validation-nll')).toBe(String(point.validation.mean_nll_nats_per_target));
        expect(annotations(row)).toEqual([String(point.update),point.train.mean_nll_nats_per_target.toFixed(6),point.validation.mean_nll_nats_per_target.toFixed(6)]);
      });
    }
  });

  it('keeps one static glossary tree, exact formula notation and the preceding chapter destination',()=>{
    const nodes=walk(built());
    const dialogs=nodes.filter(node=>node.tagName==='dialog'&&attribute(node,'data-cheat-sheet-dialog')!==undefined);
    expect(dialogs).toHaveLength(1);
    const terms=sortCheatSheetTerms(sheet.terms,'en');
    expect(walk(dialogs[0]).filter(node=>node.tagName==='dt').map(text)).toEqual(terms.map(term=>term.term));
    expect(walk(dialogs[0]).filter(node=>node.tagName==='dd').map(text)).toEqual(terms.map(term=>term.definition));
    expect(annotations(built())).toContain(contract.formula.latex);
    expect(nodes.filter(node=>node.tagName==='a'&&attribute(node,'rel')==='prev').map(node=>attribute(node,'href'))).toContain('/en/practical-llm-in-rust/15-save-load-resume-model/');
    expect(nodes.filter(node=>node.tagName==='a'&&attribute(node,'rel')==='next')).toHaveLength(0);
  });
});
