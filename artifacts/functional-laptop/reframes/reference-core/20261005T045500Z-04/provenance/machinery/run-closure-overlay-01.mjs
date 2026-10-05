import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const repo=resolve(process.argv[2]??'.'),run='.build/runs/20261005T045500Z-reference-core-command-reframe-04',stage=resolve(repo,run,'publish');
const preflight=JSON.parse(readFileSync(resolve(repo,run,'preflight/product-inputs-01.json')));
const paths=preflight.records;
if(!Array.isArray(paths)||paths.length!==35)throw Error('Exact35 product inventory required');
const args=['run','--rm','--pull=never','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--user','1000:1000','--env','NODE_PATH=/workspace/site/node_modules','--mount',`type=bind,source=${repo},target=/source,readonly`];
for(const item of paths){const path=item.path??item.canonicalPath;args.push('--mount',`type=bind,source=${resolve(stage,path)},target=/source/${path},readonly`);}
for(const path of ['audits/functional-laptop/reviews/reference-core-reframe','artifacts/functional-laptop/reframes/reference-core/20261005T045500Z-04'])args.push('--mount',`type=bind,source=${resolve(stage,path)},target=/source/${path},readonly`);
args.push('--workdir','/source','--entrypoint','node','sha256:fc6a74e246e7c6959d56df2488beee12f922d15bcf571212e47e4f3936cf97b5','/source/scripts/check-functional-overbroad-surfaces.mjs');
const output=resolve(stage,'artifacts/functional-laptop/reframes/reference-core/20261005T045500Z-04/operations/closure-overlay-01.log');
if(existsSync(output))throw Error('Immutable log exists');
const result=spawnSync('docker',args,{encoding:'utf8',maxBuffer:4*1024*1024});
const log=(result.stdout??'')+(result.stderr??'');writeFileSync(output,log,{flag:'wx'});
console.log(JSON.stringify({argv:['docker',...args],exitCode:result.status,error:result.error?.message??null,log:output,logSha256:createHash('sha256').update(log).digest('hex')}));
process.exitCode=result.status??1;
