import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {extractAccessibleText,canonicalJson} from '/repo/.agents/skills/author-llm-course-english/scripts/english-review.mjs';
const require=createRequire('/workspace/site/package.json');
const {parse}=require('parse5');
const root='/repo';
const run=process.argv[2];
const version=process.argv[3]??'r1';
const buildDirectory=process.argv[4]??'english-build';
if(!/^r[1-9][0-9]*$/.test(version)||!/^english(?:-r[1-9][0-9]*)?-build$/.test(buildDirectory))throw Error('Unexpected preparation identity');
const audit='audits/2026-10-02-ch17-problem-first/english-'+version;
const base=audit;
if(existsSync(resolve(root,base+'/review-spec.json')))throw Error('Frozen English candidate already exists');
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>readFileSync(resolve(root,p));
const put=(p,b)=>{mkdirSync(dirname(resolve(root,p)),{recursive:true});writeFileSync(resolve(root,p),b)};
const json=(p,v)=>put(p,JSON.stringify(v,null,2)+'\n');
const desc=p=>({path:p,sha256:sha(read(p))});
const freeze=(p,name)=>{const q=base+'/frozen/'+name;put(q,read(p));return desc(q)};
const ch='17-parameter-initialization';
const lesson=freeze(run+'/publish/site/src/content/chapters/en/'+ch+'.mdx','lesson.en.mdx');
const sheet=freeze(run+'/publish/site/src/content/cheat-sheets/en/'+ch+'.json','sheet.en.json');
const contractRaw=read(run+'/publish/curriculum/chapters/'+ch+'.md').toString();
const match=contractRaw.match(/^---\n([\s\S]*?)\n---\n/);
if(!match)throw Error('contract frontmatter');
const project=v=>Array.isArray(v)?v.map(project):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>k!=='ru'&&k!=='translation_notes').map(([k,x])=>[k,project(x)])):v;
const projected='---\n'+JSON.stringify(project(JSON.parse(match[1])),null,2)+'\n---\n'+contractRaw.slice(match[0].length);
put(base+'/frozen/contract.en.md',projected);
const html=freeze(run+'/'+buildDirectory+'/dist/en/course/'+ch+'/index.html','lesson.en.html');
const dom=parse(read(html.path).toString());
const attrs=n=>Object.fromEntries((n.attrs??[]).map(a=>[a.name,a.value]));
const children=n=>n.childNodes??[];
const all=[];
const walk=(n,p=[])=>{if(n.tagName)all.push({node:n,path:p});children(n).forEach((c,i)=>walk(c,[...p,i]))};
walk(dom);
const find=(fn)=>all.filter(x=>fn(x.node,attrs(x.node)));
const main=find((n,a)=>a.id==='main-content')[0];
if(!main)throw Error('main missing');
const inside=(x,parent)=>x.path.length>=parent.path.length&&parent.path.every((v,i)=>x.path[i]===v);
const body=find((n,a)=>(a.class??'').split(' ').includes('lesson-body'))[0];
const figure=find((n,a)=>a['data-visualization-id']==='parameter-initialization')[0];
const cheat=find((n,a)=>a.id==='cheat-sheet-'+ch)[0];
if(!body||!figure||!cheat)throw Error('scoped roots missing');
const units=[];
const add=(entry,kind,req,attribute)=>{const a=attrs(entry.node);const value=attribute?a[attribute]:extractAccessibleText(entry.node);if(typeof value!=='string'||!value.trim())throw Error('empty '+kind);units.push({id:'unit.'+String(units.length+1).padStart(3,'0'),kind,roleRequirement:req,value,origin:{documentSha256:html.sha256,nodePath:entry.path,tag:entry.node.tagName,attributes:a,valueType:attribute?'attribute':'text',attribute:attribute??null}})};
find((n,a)=>n.tagName==='h1').forEach(x=>add(x,'page-title','Identify reproducible trainable-weight initialization as the chapter topic, with no learner prediction request.'));
find((n,a)=>(a.class??'').split(' ').includes('lesson-description')).forEach(x=>add(x,'page-description','State the initialization problem and bounded solution in standalone course/SEO copy without claiming measured decoder stability.'));
find((n,a)=>n.tagName==='meta'&&a.name==='description').forEach(x=>add(x,'seo-description','Describe the chapter problem and initialization solution accurately when read independently from the page.', 'content'));
const headingTopics=['the concrete starting-weight problem and explained worked solution','the distribution variance rule and its assumptions','the meanings of the matrix coordinates and widths, with their Rust connections','the bounded neural-language-model and initialization history','the related Rust evidence and safe parameter-construction boundary','measured distributions versus theoretical linear propagation','optional reproduction, inspection and explanation practice','the token-table handoff and its initialization convention'];
find((n,a)=>n.tagName==='h2').filter(x=>inside(x,body)).forEach((x,i)=>add(x,'contextual-heading','Orient the learner to '+headingTopics[i]+' in its associated section; this contextual navigation heading need not restate the whole page concept and must not request an outcome prediction.'));
find((n,a)=>n.tagName==='h3').filter(x=>inside(x,body)&&!inside(x,figure)).forEach(x=>add(x,'contextual-subheading','Identify the associated initialization subtopic in the chapter reading order without imposing a prediction activity.'));
find((n,a)=>n.tagName==='figcaption').filter(x=>inside(x,body)&&!inside(x,figure)).forEach(x=>add(x,'rust-source-caption','Identify the operation or executable evidence shown by this Rust source card, preserving its exact source path/region and avoiding unsupported algorithm claims.'));
find((n,a)=>a['aria-label']&&n.tagName==='pre').filter(x=>inside(x,body)).forEach(x=>add(x,'rust-accessible-name','Name the displayed Rust operation or evidence so the code panel has a meaningful accessible purpose.', 'aria-label'));
find((n,a)=>n.tagName==='summary').filter(x=>inside(x,body)).forEach(x=>add(x,'answer-summary','Identify the checked-answer disclosure for optional initialization practice without asking the learner to guess an unseen result.'));
const practice=find((n,a)=>n.tagName==='ol').filter(x=>inside(x,body)&&!inside(x,figure));
const practiceTopics=['fan-in 2/fan-out 2 target variance, standard deviation and bound','fan-in 4/fan-out 2 target variance, standard deviation and bound','zero-SiLU input-weight gradient equality under equal treatment','same-seed/request/order reproduction','the observed seed-18 difference without universal seed uniqueness','finite-sample variance versus the target distribution','declaration-order enumeration of the two named parameters','invalid requests, generator-state rollback and first duplicate','the original Transformer paper not prescribing this initializer','the near-linear independence limits and no exact decoder-variance guarantee'];
practice.forEach(list=>children(list.node).filter(n=>n.tagName==='li').forEach((n,i)=>{const x=all.find(e=>e.node===n);add(x,'practice-or-checked-answer','Preserve the complete task or checked result about '+(practiceTopics[i]??'initialization behavior')+' in its actual optional-practice/answer role, with local conditions and no learner outcome-prediction request.');}));
// Symbol rows and cheat-sheet terms are genuinely paired label-definition units.
find((n,a)=>n.tagName==='tr').filter(x=>inside(x,body)&&!inside(x,figure)).forEach(x=>add(x,'table-row','Preserve this complete header or value-definition row in its displayed initialization table role, distinguishing indices, widths, target variance and finite samples as applicable.'));
const cap=find((n,a)=>n.tagName==='figcaption').find(x=>inside(x,figure));
add(cap,'figure-caption','Identify the zero/oversized/Xavier comparison and distinguish measured finite-sample distributions from expected propagation through independent linear layers with equal input and output widths.');
const descriptionId=attrs(figure.node)['aria-describedby'];
const description=find((n,a)=>a.id===descriptionId)[0];
add(description,'figure-accessible-description','Describe the compared starting rules, the measured-distribution versus theoretical-variance distinction and the stated equal-width independent-linear-layer boundary for nonvisual reading.');
find((n,a)=>/^h[34]$/.test(n.tagName)).filter(x=>inside(x,figure)).forEach(x=>add(x,'figure-contextual-heading','Orient the learner within the initializer comparison figure without implying that an expected linear-model value is a measured decoder result.'));
find((n,a)=>a['data-initialization-kind']).forEach(x=>add(x,'distribution-card','Identify the selected starting rule and its fixed-seed finite-sample statistics, with quantities and values paired in the actual standalone comparison card.'));
find((n,a)=>a['data-pairing-seed']).forEach(x=>add(x,'controlled-comparison-card','Explain that the two uniform strategies share base draws and differ by their uniform bound, separating scale effects from a different draw stream.'));
find((n,a)=>a['data-reproducibility']).forEach(x=>add(x,'reproducibility-card','State the actual same-request equality or selected-alternate-seed difference with the seed and exact scope; do not assert universal seed uniqueness.'));
find((n,a)=>n.tagName==='div'&&children(n).some(c=>c.tagName==='dt')&&children(n).some(c=>c.tagName==='dd')).filter(x=>inside(x,figure)&&!find((n,a)=>a['data-initialization-kind']||a['data-pairing-seed']||a['data-reproducibility']).some(c=>inside(x,c))).forEach(x=>add(x,'figure-label-value','Preserve the paired quantity label and fixed fixture value in its contextual figure-summary role; identify the measured or assumed quantity accurately.'));
find((n,a)=>n.tagName==='p').filter(x=>inside(x,figure)&&!inside(x,cap)&&!find((n,a)=>a['data-initialization-kind']||a['data-pairing-seed']||a['data-reproducibility']).some(c=>inside(x,c))).forEach(x=>add(x,'figure-note','Explain the local histogram-bin, independent-linear propagation or finite-sample boundary without presenting theory as a measured decoder guarantee.'));
// The same language-neutral header or row name may occur more than once.
// Freeze one identical isolated value, with every occurrence retained in provenance.
const repeated=new Map();
find((n,a)=>n.tagName==='th').filter(x=>inside(x,figure)).forEach(x=>{const val=extractAccessibleText(x.node);if(!val)return;if(repeated.has(val)){units[repeated.get(val)].origin.duplicateNodePaths??=[];units[repeated.get(val)].origin.duplicateNodePaths.push(x.path);}else{repeated.set(val,units.length);add(x,'contextual-table-header','Name the displayed strategy, bin interval or layer-depth coordinate in this figure table-header role; unchanged numeric intervals are literal evidence, not prose.');}});
find((n,a)=>a.role==='region'&&a['aria-label']).filter(x=>inside(x,figure)).forEach(x=>add(x,'scroll-region-accessible-name','Name the contained comparison table and distinguish measured histograms from expected linear-layer variance for keyboard/nonvisual navigation.', 'aria-label'));
const bin=find((n,a)=>n.tagName==='td'&&a['aria-label']).filter(x=>inside(x,figure));
if(bin.length)add(bin[Math.floor(bin.length/2)],'histogram-cell-accessible-name','State the weight interval, exact finite-sample count and percentage for the bin; this contextual cell label must not imply a probability-density or decoder-quality measurement.', 'aria-label');
find((n,a)=>n.tagName==='h2'||n.tagName==='p'&&(a.class??'').includes('description')).filter(x=>inside(x,cheat)).forEach(x=>add(x,'cheat-sheet-heading-description','Identify the quick reference for the chapter-specific initialization concepts accurately in its modal/contextual role.'));
find((n,a)=>(a.class??'').split(' ').includes('cheat-sheet-term')).filter(x=>inside(x,cheat)).forEach(x=>add(x,'cheat-sheet-term-definition','Define the named initialization concept concisely in this chapter context; preserve conditions and distinguish the distribution target, measured sample, seed and named-parameter role where relevant.'));
const foreignEvidence=[];
for(const slug of ['16-model-autodiff-ops','18-token-embeddings','']){
 const p=run+'/'+buildDirectory+'/dist/en/course/'+(slug?slug+'/':'')+'index.html';
 if(!existsSync(resolve(root,p)))throw Error('missing navigation/catalog build '+p);
 const q=base+'/evidence/built-navigation-'+(slug||'catalog')+'.html';put(q,read(p));foreignEvidence.push(['built-navigation-'+(slug||'catalog'),q]);
 const foreign=parse(read(p).toString()),nodes=[];
 const scan=(n,path=[])=>{if(n.tagName)nodes.push({node:n,path});children(n).forEach((c,i)=>scan(c,[...path,i]))};scan(foreign);
 const links=nodes.filter(x=>x.node.tagName==='a'&&(attrs(x.node).href??'').endsWith('/en/course/'+ch+'/'));
 if(links.length!==1)throw Error('unexpected Chapter17 link count '+p+':'+links.length);
 let x=links[0];
 if(!slug){const card=nodes.find(c=>c.node.tagName==='article'&&inside(x,c));if(!card)throw Error('catalog card missing');x=card;}
 const text=extractAccessibleText(x.node);
 units.push({id:'unit.'+String(units.length+1).padStart(3,'0'),kind:slug?'chapter-navigation-destination':'course-catalog-card',roleRequirement:slug?'Identify Chapter17 initialization as the previous/next navigation destination with the correct direction and matching current lesson title.':'Identify Chapter17 and describe its current initialization problem/solution accurately in its standalone catalog-card role, with matching title and revision.',value:text,origin:{documentFile:desc(q),nodePath:x.path,tag:x.node.tagName,attributes:attrs(x.node),valueType:'text',attribute:null}});
}
find((n,a)=>n.tagName==='aside'&&(a.class??'').split(' ').includes('lesson-objective')).forEach(x=>add(x,'learning-objective','State the chapter-specific initialization capabilities and parameter-kind policies in the grouped learning-objective role, with bounded symmetry, scale and reproducibility claims.'));
find((n,a)=>n.tagName==='tr'&&a['aria-label']).filter(x=>inside(x,figure)).forEach(x=>add(x,'histogram-row-accessible-name','Identify the starting-weight rule whose finite-sample bin counts and percentages occupy this histogram row; make the nonvisual row-navigation purpose explicit.', 'aria-label'));
const axisNames=new Map();
find((n,a)=>n.tagName==='th'&&a['aria-label']).filter(x=>inside(x,figure)).forEach(x=>{
 const value=attrs(x.node)['aria-label'];
 if(children(x.node).some(n=>(attrs(n).class??'').split(' ').includes('histogram-range'))){
  add(x,'contextual-bin-interval-name','Identify the exact weight interval and endpoint closure for this contextual histogram-bin column; its numeric literal is interpreted under the named histogram table.', 'aria-label');
  return;
 }
 if(axisNames.has(value)){units[axisNames.get(value)].origin.duplicateNodePaths??=[];units[axisNames.get(value)].origin.duplicateNodePaths.push(x.path);}
 else{axisNames.set(value,units.length);add(x,'strategy-axis-accessible-name','Identify the zero, doubled-Xavier-bound or Xavier initialization rule represented by this contextual table-axis header, without relying on its hidden visual symbol.', 'aria-label');}
});
find((n,a)=>n.tagName==='title').forEach(x=>add(x,'browser-seo-title','Identify the initialization lesson and its course in the independent browser/search-title role without claiming a trained-model result.'));
const escape=t=>t.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const isolatedHtml='<!doctype html><html lang="en"><head><title>Frozen isolated-surface extraction</title></head><body>'+units.map(u=>'<div id="'+u.id+'">'+escape(u.value)+'</div>').join('')+'</body></html>\n';
put(base+'/frozen/isolated.en.html',isolatedHtml);
json(base+'/evidence/extraction-provenance.json',{schemaVersion:1,sourceHtml:html,method:'Exact accessible-text extraction from actual rendered role units. The derived HTML contains no added surrounding prose; repeated identical header values retain occurrence paths. The extra built document is an audit-only extraction view, not a served course page.',units});
const core='Explain why trainable dense weights need nonidentical reproducible starts and width-aware scales; work through the exact seed-17 matrix and variance/bound, state dense near-linear independence assumptions and finite-sample limits, preserve SplitMix64/f64 semantics, transactional validation and stable-name versus leaf identity, bounded paper claims and parameter-kind policies, distinguish measured histograms from expected linear propagation, give optional nonprediction practice with checked results, and hand off token-table lookup semantics without claiming its shape convention follows from dense variance.';
const authorSuffix=version==='r1'?'':'-'+version;
const authorFacts=JSON.parse(read(run+'/author-notes/context-start'+authorSuffix+'.json'));
const completed=JSON.parse(read(run+'/author-notes/context-complete'+authorSuffix+'.json'));
const configuredModel=authorFacts.model??authorFacts.configuredModel;
const configuredReasoning=authorFacts.reasoning??authorFacts.configuredReasoningEffort??authorFacts.configuredReasoning;
if(!authorFacts.contextId||!configuredModel||!configuredReasoning)throw Error('Missing actual author identity/configuration');
const contextId=authorFacts.contextId.replace(/^\/root\//,'');
if(!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(contextId))throw Error('Unsupported author context name');
const context={schemaVersion:1,contextId,candidateId:'ch17.en.r5.20261002.'+version,scopeId:'ch17.en.20261002.'+version,role:'english-author',freshContext:true,model:configuredModel,reasoning:configuredReasoning,startedAt:authorFacts.startedAt??authorFacts.started_at,completedAt:completed.completedAt??completed.completed_at,purpose:version==='r5'?'Dedicated diagram-copy revision author '+authorFacts.contextId+' adopts the unchanged whole-chapter source from ch17_whole_english_author_v5, whose original max provenance remains frozen in r4. This context owns only the fit correction; all independent judgments cover the complete successor. Inherited user selection and disjoint staged output ownership.':'Dedicated whole-chapter author context '+authorFacts.contextId+' and its own revisions; contextId is its local task-name alias, not another context. Inherited user selection and disjoint staged output ownership.'};
put(base+'/contexts/author.json',canonicalJson(context));
put(base+'/rubrics/technical.txt','Review the complete rewritten Chapter17 against exact Rust/stdout/trace, mathematical assumptions, primary historical evidence and frozen role requirements. Verify problem-first explained solution throughout, all scope/precision/transaction/identity distinctions, formula-source-output agreement, optional practice and checked answers, and the token-table handoff. Audit extraction provenance, inventories, grouping and requirements against complete rendered/source bytes. No expected defect or verdict is supplied.\n');
put(base+'/rubrics/isolated.txt','Judge each isolated unit solely in its frozen actual learner/accessibility role. Contextual headings and table coordinates need not restate the page; standalone captions, descriptions and definitions must carry required referents and conditions. Check clear natural English and non-color meaning. Do not invent missing context, narrow requirements or require preference-only rewrites.\n');
const evidencePaths=[
 ['historical-primary-sources',run+'/evidence/historical-sources.json'],
 ['mathematical-derivation',run+'/evidence/mathematical-boundary.md'],
 ['rust-initializer','rust/crates/llm-from-scratch/src/nn/init.rs'],
 ['rust-demo-lib','rust/demos/ch17-parameter-initialization/src/lib.rs'],
 ['rust-demo-main','rust/demos/ch17-parameter-initialization/src/main.rs'],
 ['rust-diagram-source','rust/demos/ch17-parameter-initialization/src/diagram_trace.rs'],
 ['exact-demo-output','rust/demos/ch17-parameter-initialization/expected.txt'],
 ['exact-diagram-trace','rust/demos/ch17-parameter-initialization/diagram-trace.txt'],
 ['figure-parser','site/src/lib/parameter-initialization-diagram.ts'],
 ['figure-renderer','site/src/components/chapters/ParameterInitializationDiagram.astro'],
 ['prerequisite-contract','curriculum/chapters/16-model-autodiff-ops.md'],
 ['handoff-contract','curriculum/chapters/18-token-embeddings.md'],
 ['extraction-provenance',base+'/evidence/extraction-provenance.json'],
 ['extractor-source',run+'/prepare-english.mjs']
 ,...foreignEvidence
].map(([id,path])=>{const q=base+'/evidence/frozen-'+id+'.'+(path.endsWith('.json')?'json':path.endsWith('.mjs')?'mjs':path.endsWith('.rs')?'rs':'txt');put(q,read(path));return {id,...desc(q)}}).sort((a,b)=>Buffer.compare(Buffer.from(a.id),Buffer.from(b.id)));
const clauses=[
 ['need','Equal hidden units under equal downstream treatment can receive equal gradients; a correct backward pass alone does not differentiate their roles. Width changes the variance of summed inputs under the stated independence assumptions. Initialization establishes starting values before optimization.',['mathematical-derivation','rust-demo-lib'],['page-title','page-description','seo-description','contextual-heading','cheat-sheet-term-definition']],
 ['tiny-fixture','Seed17, shape[2,2], fan-in/out2 target variance0.5 and bound1.224744871392 produce the exact row-major rounded values 0.004950883736,-0.265932089217,-0.420504358848,-0.676313443233. The selected columns differ; this is a recorded fixture, not a guarantee for all samples or a training-quality result.',['exact-demo-output','rust-demo-lib'],['practice-or-checked-answer','rust-source-caption','table-row']],
 ['distribution','The fixed formula targets the initialization distribution, not the empirical variance of one finite matrix. Under near-linear unit-slope, independence and centered input/arriving-gradient assumptions with common variances, forward fan-in and backward fan-out constraints motivate the compromise2/(sum). A uniform bound sqrt(6/sum) gives ideal variance a^2/3. Fans4+2 give variance1/3, SD0.577350269190 and bound1.',['mathematical-derivation','rust-initializer'],['table-row','practice-or-checked-answer','cheat-sheet-term-definition','contextual-heading']],
 ['represented-sampler','SplitMix64 begins from raw u64 seed including zero before the first wrapping increment, uses the high53 mixed bits for a binary64 unit draw, then doubles/subtracts/multiplies by a represented bound. One draw per row-major entry. Ideal real distribution, f64 grid and rounded display are distinct; no cryptographic claim.',['rust-initializer','rust-demo-lib'],['rust-source-caption','rust-accessible-name','cheat-sheet-term-definition']],
 ['replay','Identical seed/state, shape, fan values, construction order and implementation reproduce stored bits. Selected seed18 differs; no universal seed uniqueness. Earlier successful draws shift a shared stream; a valid name is not a sampling input.',['rust-initializer','rust-demo-lib','exact-demo-output'],['reproducibility-card','practice-or-checked-answer','cheat-sheet-term-definition']],
 ['identity','An immutable validated dot-separated ASCII name identifies a parameter role; a trainable TensorValue is a tape leaf. Clone preserves runtime leaf identity; equal independent recreation does not. Collections preserve declaration order and report the earliest repeated name and first occurrence rather than silently merge.',['rust-initializer','rust-demo-lib','exact-demo-output'],['rust-source-caption','rust-accessible-name','practice-or-checked-answer']],
 ['failure','Validate name before fans, checked fan sum before checked shape product, reservation/tensor creation before trainable leaf completion. Draw on a trial generator and commit only after success; returned errors leave caller state unchanged. This does not claim recovery from all process allocation aborts.',['rust-initializer','rust-demo-lib','exact-demo-output'],['rust-source-caption','rust-accessible-name','practice-or-checked-answer']],
 ['symmetry','The zero[2,2] SiLU path uses x=[1,-1], equal constant outgoing weights[1,1], and backward seed1. Output0, SiLU derivative1/2 at0, both input gradient columns[0.5,-0.5]^T. Equal updates retain equality only under equal treatment. Deliberate zero bias is a distinct parameter policy.',['mathematical-derivation','rust-demo-lib','exact-demo-output'],['practice-or-checked-answer','rust-source-caption','cheat-sheet-term-definition']],
 ['history','Bengio2003 jointly learns word-feature/neural next-word parameters and reports random word-feature initialization. Glorot/Bengio2010 supplies bounded independent/near-linear width-aware variance balance. Vaswani2017 repeats learned embeddings/projections but does not prescribe this initializer. Forward attention/embedding scaling is not initialization; course names/generator/error policy are not paper prescriptions.',['historical-primary-sources','mathematical-derivation'],['contextual-heading','practice-or-checked-answer']],
 ['figure','4096 weights per64x64 strategy: zeros use no draws; the two uniform strategies reuse seed17 base draws, oversized bound/values twice Xavier. Histograms and two-pass population variance measure those finite samples. A separate unit-input-variance ideal independent-linear rail with equal input and output widths at every layer has depth1-4 zero,4/16/64/256,or1/1/1/1; not actual decoder signal measurements.',['exact-diagram-trace','rust-diagram-source','figure-parser','figure-renderer'],['figure-caption','figure-accessible-description','figure-contextual-heading','distribution-card','controlled-comparison-card','figure-label-value','figure-note','contextual-table-header','scroll-region-accessible-name','histogram-cell-accessible-name']],
 ['handoff','Chapter17 constructs named trainable leaves. Chapter18 adds token-ID row lookup, table reuse across positions and repeated-row gradient scatter-add. Vocabulary size/feature width as sampler fans is a local shape convention, not a dense-variance derivation for lookup. Xavier matrices, zero optional biases and unit RMSNorm gains are separate course policies, not universal variance preservation or original Transformer requirements.',['rust-initializer','rust-demo-lib','historical-primary-sources','mathematical-derivation'],['contextual-heading','cheat-sheet-term-definition','practice-or-checked-answer']]
];
const commitmentMap={schemaVersion:1,evidenceKinds:['Observed executable/trace fixtures','Dense linear mathematical derivation with assumptions','Bounded primary-source history','Course-local initializer/ownership policy'],commitments:clauses.map(([id,claim,evidenceRefs,kinds])=>({id,claim,evidenceRefs,affectedSurfaceIds:['source.lesson','source.contract-en','source.sheet','built.lesson','reading.main',...units.filter(u=>kinds.includes(u.kind)).map(u=>u.id)].sort()})),classification:'All affected English fields are in the English-only contract projection, full lesson and sheet. Unchanged site chrome/navigation/control labels are shared invariants; source/code/math/trace literals remain language-neutral. Isolated atoms are chosen by rendered role, not arbitrary section slicing. Shared numeric histogram-cell templates and duplicate coordinate labels retain exact fixture/renderer evidence. The technical reviewer must audit these declarations and grouping; deterministic extraction is not a semantic certification.'};
for(const commitment of commitmentMap.commitments){
 const kinds=commitment.id==='figure'?['histogram-row-accessible-name','strategy-axis-accessible-name','contextual-bin-interval-name']:['learning-objective','browser-seo-title'];
 commitment.affectedSurfaceIds=[...new Set([...commitment.affectedSurfaceIds,...units.filter(u=>kinds.includes(u.kind)).map(u=>u.id)])].sort();
}
json(base+'/evidence/commitment-map.json',commitmentMap);
const schema='.agents/skills/author-llm-course-english/references/';
const selected={model:context.model,reasoning:context.reasoning};
// Preserve historical author provenance; fresh judgments inherit the current
// user-selected settings frozen by this continuation's preflight.
const inputs=JSON.parse(read(run+'/author-inputs.json'));
const currentJudgment={model:inputs.selected_configuration_provenance.model,reasoning:inputs.selected_configuration_provenance.model_reasoning_effort};
if(currentJudgment.model!==selected.model)throw Error('Selected model changed; author provenance requires separate reconciliation');
const spec={schemaVersion:1,candidateId:context.candidateId,scopeId:context.scopeId,authorContext:desc(base+'/contexts/author.json'),requiredAuthor:selected,requiredReviewers:{technicalPedagogical:selected,isolatedSurface:selected},requiredAdjudicators:{technicalPedagogical:selected,isolatedSurface:selected},evidence:evidencePaths,commitmentMap:desc(base+'/evidence/commitment-map.json'),reviewSchema:desc(schema+'review-record.schema.json'),adjudicationSchema:desc(schema+'adjudication-record.schema.json'),receiptSchema:desc(schema+'evidence-receipt.schema.json'),sourceDocuments:[
 {id:'source.contract-en',kind:'complete-source',roleRequirement:core+' Preserve the English-only contract projection and unchanged mathematical/code literals; later Russian fields are outside this projection.',file:desc(base+'/frozen/contract.en.md'),publicationPath:audit+'/publication/contract.en.md'},
 {id:'source.lesson',kind:'complete-source',roleRequirement:core,file:lesson,publicationPath:'site/src/content/chapters/en/'+ch+'.mdx'},
 {id:'source.sheet',kind:'complete-source',roleRequirement:'Define only Chapter17 initialization concepts concisely and accurately, retaining conditions for symmetry, reproduction, target variance and width-aware scale without turning the reference into a second lesson.',file:sheet,publicationPath:'site/src/content/cheat-sheets/en/'+ch+'.json'}
 ],builtDocuments:[
 {id:'built.isolation',kind:'complete-built-html',roleRequirement:'The audit-only extraction view must preserve exact accessible values and legitimate rendered isolation groups from the frozen course HTML; it adds no context or teaching content and must match extraction provenance.',file:desc(base+'/frozen/isolated.en.html'),route:'/review-inventory/ch17/en/',publicationPath:audit+'/publication/isolated.en.html'},
 {id:'built.lesson',kind:'complete-built-html',roleRequirement:core+' Render all affected math, source excerpts, diagram/accessibility and reference surfaces coherently without losing learner atoms.',file:html,route:'/en/course/'+ch+'/',publicationPath:run+'/final-build/dist/en/course/'+ch+'/index.html'}
 ],readingSurfaces:[{id:'reading.main',kind:'reading-main',roleRequirement:core,documentId:'built.lesson',order:1,locator:{tag:'main',id:'main-content'},value:{type:'text'}}],isolatedSurfaces:units.map((u,i)=>({id:u.id,kind:u.kind,roleRequirement:u.roleRequirement,documentId:'built.isolation',order:i+1,locator:{tag:'div',id:u.id},value:{type:'text'},literals:[]})),rubrics:{technicalPedagogical:desc(base+'/rubrics/technical.txt'),isolatedSurface:desc(base+'/rubrics/isolated.txt')}};
spec.requiredReviewers={technicalPedagogical:currentJudgment,isolatedSurface:currentJudgment};
spec.requiredAdjudicators={technicalPedagogical:currentJudgment,isolatedSurface:currentJudgment};
mkdirSync(resolve(root,audit+'/publication'),{recursive:true});
json(base+'/review-spec.json',spec);
console.log(JSON.stringify({isolated:units.length,source:3,built:2,reading:1,base}));
