import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const repository=resolve(process.argv[2]??'.'),run='.build/runs/20261005T045500Z-reference-core-command-reframe-04',stage=`${run}/publish`;
const base='audits/functional-laptop/reviews/reference-core-reframe';
const read=p=>readFileSync(resolve(repository,p)),sha=b=>createHash('sha256').update(b).digest('hex');
const bound=p=>({path:p,sha256:sha(read(`${stage}/${p}`))});
const input=`${stage}/${base}/closure-occurrence-proposal-01.json`;
if(sha(read(input))!=='231112be3110ccbaa97cd691890573020f614f926b11876c160c47d1a04499b5')throw Error('Root-approved occurrence mapping drift');
const proposal=JSON.parse(read(input));
const manifest={schemaVersion:1,baselineCommit:'365f70dde3510f40e84f9700aa11a3dea79e2ff0',coverage:{path:'audits/2026-08-10-functional-llm-capability/coverage.md',sha256:'42a2fd6ea482995c280f1c55d1a8c30a494968116edc57594579a7b1da2f4fb1'},plan:{path:'curriculum/functional-laptop-llm-extension-plan.md',sha256:'be619fa7e8a09adc95b7e7d7ab89b23a1c2998389f43b69a53bd92748aedfd6d'},inventories:{english:bound(`${base}/english-candidate-01/bundle/inventory.json`),russian:bound(`${base}/closure-evidence/ru-inventory.json`)},dispositions:proposal.dispositions.map(row=>({surfaceId:row.surfaceId,disposition:row.disposition,ownerStep:row.ownerStep,locators:row.locators.map(locator=>({canonicalPath:locator.canonicalPath,role:locator.role,source:locator.source,mode:locator.mode,inventoryLinks:locator.inventoryLinks}))})),localeRouting:bound(`${base}/ru-candidate-01/routes/routing.json`),localeAuthorContext:bound(`${base}/ru-candidate-01/frozen/author-context.json`)};
for(const [name,d]of Object.entries(manifest.inventories))if(d.sha256!==proposal.inventories[name].sha256)throw Error('Approved inventory drift');
for(const row of manifest.dispositions)for(const locator of row.locators){const p=existsSync(resolve(repository,stage,locator.canonicalPath))?`${stage}/${locator.canonicalPath}`:locator.canonicalPath;if(sha(read(p))!==locator.source.sha256)throw Error('Current source drift');}
const output=`${stage}/${base}/closure.json`;if(existsSync(resolve(repository,output)))throw Error('Immutable closure manifest exists');
writeFileSync(resolve(repository,output),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({path:output,sha256:sha(read(output)),records:manifest.dispositions.length,status:'Frozen deterministic closure inputs only; real final language records and all maintained verification gates still required'}));
