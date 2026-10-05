import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const repository=resolve(process.argv[2]??'.');
const run='.build/runs/20261005T045500Z-reference-core-command-reframe-04';
const root=resolve(repository,run,'publish');
const base='audits/functional-laptop/reviews/reference-core-reframe/ru-candidate-01';
if(existsSync(resolve(root,base)))throw Error('Frozen locale candidate exists');
const tool=await import(resolve(repository,'.agents/skills/localize-llm-course/scripts/localization-review.mjs'));
const read=p=>readFileSync(resolve(repository,p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const put=(p,b)=>{mkdirSync(dirname(resolve(root,p)),{recursive:true,mode:0o700});writeFileSync(resolve(root,p),b,{flag:'wx',mode:0o600});return{path:p,sha256:sha(b)};};
const copy=(original,p)=>put(p,read(original));
const json=(p,v)=>put(p,tool.canonicalJson(v));
const proposalPath=`${run}/publish/audits/functional-laptop/reviews/reference-core-reframe/russian-selection-01/inventory-proposal.json`;
const proposal=JSON.parse(read(proposalPath));
if(sha(read(proposalPath))!=='27326faec5942dca4abc02eace54d1e05f9c328a4d583948cf8a33afd7ea1be8')throw Error('Root-approved inventory proposal drift');
const sourceManifestPath=`${run}/authoring/russian-author-context-01.json`;
const author=copy(sourceManifestPath,`${base}/frozen/author-context.json`),facts=JSON.parse(read(sourceManifestPath));
const surfaces=[];
const neutralMap=[];
const originals=[];
const byId=new Map([...proposal.completeDocuments,...proposal.pairs].map(item=>[item.id,item]));
if(byId.size!==84||proposal.neutralRoleMap.length!==84)throw Error('Approved inventory count drift');
const ordered=proposal.neutralRoleMap.map((role,index)=>{const item=byId.get(role.id);if(!item||role.order!==index+1||item.kind!==role.kind||item.roleRequirement!==role.roleRequirement||item.requirementKey!==role.requirementKey)throw Error('Approved role/order drift '+role.id);return item;});
for(const [index,item]of ordered.entries()){
  const kind=item.id==='unit.055'?'chooser-introduction':item.kind;
  let source,target;
  if(item.source&&item.target){
    for(const d of [item.source,item.target])if(sha(read(d.path))!==d.sha256)throw Error('Complete input drift '+d.path);
    const extension=item.target.path.split('.').at(-1);
    source=copy(item.source.path,`${base}/frozen/en/${item.id}.${extension}`);
    target=copy(item.target.path,`${base}/frozen/ru/${item.id}.${extension}`);
    originals.push({id:item.id,source:item.source,target:item.target,projection:item.projection??false,original:item.original??null,origins:item.origins??null});
  }else {
    source=put(`${base}/surfaces/en/${item.id}.txt`,item.sourceValue+'\n');
    target=put(`${base}/surfaces/ru/${item.id}.txt`,item.targetValue+'\n');
    originals.push({id:item.id,provenance:item.provenance,sourceValueSha256:sha(Buffer.from(item.sourceValue)),targetValueSha256:sha(Buffer.from(item.targetValue))});
  }
  surfaces.push({id:item.id,kind,order:index+1,localization:item.id==='unit.050'||item.kind==='copyable-command'?'copy':'translate',source,target,...(item.publicationPath?{publicationPath:item.publicationPath}:{})});
  neutralMap.push({id:item.id,kind,order:index+1,requirementKey:item.requirementKey,roleRequirement:item.roleRequirement});
}
const rubrics={bilingual:copy(`${run}/authoring/bilingual-rubric-04.md`,`${base}/rubrics/bilingual.md`),targetOnly:copy(`${run}/authoring/target-only-rubric-04.md`,`${base}/rubrics/target-only.md`)};
for(const [role,file]of Object.entries(rubrics)){
  const text=readFileSync(resolve(root,file.path),'utf8');
  for(const u of neutralMap)if(!text.includes(u.id)||!text.includes(u.roleRequirement))throw Error('Root rubric map coverage missing '+role+':'+u.id);
}
copy(`.build/runs/20261004T221700Z-reframe-functional-reference-core-surfaces-01/authoring/bilingual-prompt.txt`,`${base}/frozen/bilingual-prompt.txt`);
copy(`.build/runs/20261004T221700Z-reframe-functional-reference-core-surfaces-01/authoring/target-only-prompt.txt`,`${base}/frozen/target-only-prompt.txt`);
json(`${base}/extraction-provenance.json`,{schemaVersion:1,proposal:{path:proposalPath,sha256:sha(read(proposalPath))},requirements:proposal.requirements,neutralRoleMap:neutralMap,originals,excluded:proposal.excluded,note:'Mechanical exact extraction/projection bindings only; not language approval. External provenance is not an extra reviewer input. Target-only bundles retain only actual target text and neutral rubric requirements.'});
const selected={model:facts.model,reasoning:facts.reasoning};
surfaces.sort((a,b)=>Buffer.compare(Buffer.from(a.id),Buffer.from(b.id)));
const spec={schemaVersion:1,candidateId:facts.candidateId,scopeId:facts.scopeId,referenceLocale:'en',targetLocale:'ru',authorContext:{id:facts.contextId,sha256:author.sha256},requiredReviewers:{bilingual:selected,targetOnly:selected},requiredSurfaceIds:surfaces.map(s=>s.id),rubrics,surfaces};
const specFile=json(`${base}/spec.json`,spec);
const bindings=tool.prepareEvidence({specPath:resolve(root,specFile.path),outDir:resolve(root,base,'bundle'),root});
const bundles=Object.fromEntries(['bilingual','target-only'].map(role=>[role,{bytes:readFileSync(resolve(root,base,'bundle',role,'review-bundle.json')).length,sha256:sha(readFileSync(resolve(root,base,'bundle',role,'review-bundle.json')))}]));
json(`${base}/prepare-measurements-01.json`,{schemaVersion:1,bundles,inputTokenCap:200000,tokenUsage:'unobserved-not-estimated',status:'Prepared only; actual four-file size and final English gate required before routing',bindings});
console.log(JSON.stringify({candidateId:spec.candidateId,surfaces:surfaces.length,specFile,bundles,status:'prepared-not-routed'}));
