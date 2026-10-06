#!/usr/bin/env node
// Publication topology only: never a semantic review or approval.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const hash=b=>createHash('sha256').update(b).digest('hex');
function regular(root,relative){
  if(typeof relative!=='string'||!relative||relative.startsWith('/')||relative.split('/').some(p=>!p||p==='.'||p==='..'||p==='.build'||!/^[A-Za-z0-9_.-]+$/.test(p)))throw Error('Non-durable repository path');
  let current=root;const segments=relative.split('/');
  for(let i=0;i<segments.length;i++){current=path.join(current,segments[i]);const s=fs.lstatSync(current);if(s.isSymbolicLink()||(i===segments.length-1?!s.isFile():!s.isDirectory()))throw Error('Non-regular topology');if(i===segments.length-1&&s.size>16777216)throw Error('Bound file too large');}
  return fs.readFileSync(current);
}
export function checkReviewDurability({root,specPath,routingPath}){
  root=fs.realpathSync(root);const spec=JSON.parse(regular(root,specPath));
  const bound=[spec.authorContext,spec.commitmentMap,spec.reviewSchema,spec.adjudicationSchema,spec.receiptSchema,...Object.values(spec.rubrics),...spec.evidence,...spec.sourceDocuments.map(d=>d.file),...spec.builtDocuments.map(d=>d.file)];
  for(const d of bound){if(!d||hash(regular(root,d.path))!==d.sha256)throw Error('Bound input mismatch');}
  for(const d of [...spec.sourceDocuments,...spec.builtDocuments])if(!regular(root,d.file.path).equals(regular(root,d.publicationPath)))throw Error('Publication bytes differ');
  if(routingPath){const routing=JSON.parse(regular(root,routingPath));for(const role of routing.reviewers??routing.adjudicators??[])for(const key of ['context','prompt','bundle','schema'])if(hash(regular(root,role[key].path))!==role[key].sha256)throw Error('Routing bytes differ');}
  return {schemaVersion:1,status:'durable-paths-and-publication-bytes-verified',boundFiles:bound.length,publicationFiles:spec.sourceDocuments.length+spec.builtDocuments.length,limitation:'Checks paths, exact bytes and hashes only; independent judgment and maintained complete-chain verification remain required.'};
}
export function runDurabilityCli(args){const options={};for(let i=0;i<args.length;i+=2){const flag=args[i];if(!['--root','--spec','--routing'].includes(flag)||!args[i+1]||Object.hasOwn(options,flag))throw Error('usage: --root ROOT --spec PATH [--routing PATH]');options[flag]=args[i+1];}if(!options['--root']||!options['--spec'])throw Error('Missing required input');console.log(JSON.stringify(checkReviewDurability({root:options['--root'],specPath:options['--spec'],routingPath:options['--routing']})));}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{runDurabilityCli(process.argv.slice(2));}catch(e){console.error('English review durability refused: '+e.message);process.exitCode=1;}}
