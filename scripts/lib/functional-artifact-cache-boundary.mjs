// External operational authority only. Opaque content IDs never become paths.
import {lstatSync,realpathSync} from 'node:fs';
import {resolve,sep} from 'node:path';
const SHA=/^[0-9a-f]{64}$/;
const refused=()=>new Error('artifact cache boundary refused');
export function exactKeys(value,keys){if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).sort().join('\0')!==[...keys].sort().join('\0'))throw refused();}
export function ownedPath(path,{root,uid=1000,directory=true,privateMode=false}){
 const absolute=resolve(path),allowed=resolve(root);if(absolute!==path||(!absolute.startsWith(allowed+sep)&&absolute!==allowed)||realpathSync(absolute)!==absolute)throw refused();
 const info=lstatSync(absolute);if(info.isSymbolicLink()||info.uid!==uid||(directory?!info.isDirectory():!info.isFile())||(info.mode&0o022)!==0||(privateMode&&(info.mode&0o077)!==0))throw refused();return absolute;
}
export function selectedPolicy(asset,binding){
 exactKeys(binding,['producer','selected_asset_sha256']);exactKeys(binding.producer,['config_sha256','script_sha256']);
 if(!SHA.test(binding.selected_asset_sha256)||Object.values(binding.producer).some(value=>!SHA.test(value))||asset.manifest_recipe?.producer!==null)throw refused();
 // Caller must verify the frozen selected-asset hash and producer snapshots
 // BEFORE using this mechanical assembly. Candidate metadata is never input.
 const manifest=structuredClone(asset.manifest_recipe);manifest.producer=structuredClone(binding.producer);
 return {evidence_kind:asset.evidence_kind,manifest};
}
export function bindProductionProvenance(manifest,expectedPolicy){
 if(JSON.stringify(manifest)!==JSON.stringify(expectedPolicy.manifest))throw refused();
}
export function bridgeRequest(operation,{digest,policyKind='production-source-policy'}={}){
 if(!['production-source-policy','synthetic-offline-fixture'].includes(policyKind))throw refused();
 const request={operation,expected_evidence_kind:policyKind};
 if(operation==='publish')Object.assign(request,{input_root:'/input',cache_parent:'/cache'});
 else if(operation==='verify')Object.assign(request,{input_root:'/input'});
 else if(operation==='replay'){if(!SHA.test(digest))throw refused();Object.assign(request,{entry_root:'/entry',selected_artifact_id:digest});}
 else throw refused();return request;
}
export function runtimeMountPlan(mode,{runRoot,inputRoot,cacheRoot,digest,policyKind,targetKind}){
 if(!['self-test','raw-pair'].includes(targetKind)||(targetKind==='raw-pair'&&policyKind!=='production-source-policy')||(targetKind==='self-test'&&policyKind!=='synthetic-offline-fixture'))throw refused();
 if(mode==='acquire'){if(targetKind!=='raw-pair')throw refused();return {network:'none',transfer:'checksum-bound-image-build',buildNetworkEnabled:true,mounts:[{source:runRoot,target:'/output',readOnly:false}],cacheMounted:false};}
 if(['verify','publish','transform','publish-generated'].includes(mode)){
  if(['transform','publish-generated'].includes(mode)&&targetKind!=='self-test')throw refused();
  const mounts=[{source:inputRoot,target:'/input',readOnly:true}];if(mode==='transform')mounts.push({source:runRoot,target:'/output',readOnly:false});if(['publish','publish-generated'].includes(mode))mounts.push({source:cacheRoot,target:'/cache',readOnly:false});return {network:'none',mounts,cacheMounted:mounts.some(m=>m.target==='/cache')};
 }
 if(mode==='replay'){if(!SHA.test(digest))throw refused();return {network:'none',mounts:[{source:resolve(cacheRoot,digest),target:'/entry',readOnly:true}],cacheMounted:true};}throw refused();
}
