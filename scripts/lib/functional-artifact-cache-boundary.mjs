// Development authority plumbing only. Rust validates manifests and payloads.
import {lstatSync,realpathSync} from 'node:fs';
import {resolve,sep} from 'node:path';

const refused=()=>new Error('artifact cache boundary refused');
const SHA=/^[0-9a-f]{64}$/;
export function exactKeys(value,keys){
  if(!value||Array.isArray(value)||typeof value!=='object'
      ||Object.keys(value).sort().join('\0')!==[...keys].sort().join('\0'))throw refused();
}

export function ownedPath(path,{root,uid=1000,directory=true,privateMode=false}){
  const absolute=resolve(path),allowed=resolve(root);
  if(absolute!==path||(!absolute.startsWith(allowed+sep)&&absolute!==allowed))throw refused();
  if(realpathSync(absolute)!==absolute)throw refused();
  const info=lstatSync(absolute);
  if(info.isSymbolicLink()||info.uid!==uid||(directory?!info.isDirectory():!info.isFile())
      ||(info.mode&0o022)!==0||(privateMode&&(info.mode&0o077)!==0))throw refused();
  return absolute;
}

export function bindProductionProvenance(manifest,binding){
  exactKeys(binding,['licenseTextSha256','attributionSha256','attributionReferences','producerScriptSha256','producerConfigSha256']);
  for(const key of ['licenseTextSha256','attributionSha256','producerScriptSha256','producerConfigSha256'])if(!SHA.test(binding[key]))throw refused();
  if(manifest.producer?.script_sha256!==binding.producerScriptSha256
      ||manifest.producer?.config_sha256!==binding.producerConfigSha256
      ||!Array.isArray(manifest.sources)||manifest.sources.length!==2)throw refused();
  for(const source of manifest.sources){
    if(source.license_text_sha256!==binding.licenseTextSha256
        ||source.attribution_sha256!==binding.attributionSha256
        ||JSON.stringify(source.attribution_references)!==JSON.stringify(binding.attributionReferences))throw refused();
  }
}

export function bridgeRequest(operation,{digest,policyKind='production-source-policy',finalUrls}={}){
  if(!['production-source-policy','synthetic-offline-fixture'].includes(policyKind))throw refused();
  const request={operation,policy_kind:policyKind,policy_config_path:'/policy/source-policy.json'};
  if(operation==='publish')Object.assign(request,{manifest_path:'/input/artifact-manifest.json',payload_root:'/input/payload',cache_parent:'/cache'});
  else if(operation==='verify')Object.assign(request,{manifest_path:'/input/artifact-manifest.json',payload_root:'/input/payload'});
  else if(operation==='replay'){
    if(!SHA.test(digest))throw refused();
    Object.assign(request,{manifest_path:`/entry/${digest}/artifact-manifest.json`,entry_root:`/entry/${digest}`,selected_artifact_id:digest});
  }else if(operation==='finalize-manifest'){
    if(!Array.isArray(finalUrls)||finalUrls.length!==2||finalUrls.some(x=>typeof x!=='string'))throw refused();
    Object.assign(request,{manifest_path:'/input/artifact-manifest.json',final_urls:finalUrls});
  }else throw refused();
  return request;
}

export function runtimeMountPlan(mode,{runRoot,inputRoot,cacheRoot,digest,policyKind,targetKind}){
  if(!['self-test','raw-pair'].includes(targetKind)
      ||(targetKind==='raw-pair'&&policyKind!=='production-source-policy')
      ||(targetKind==='self-test'&&policyKind!=='synthetic-offline-fixture'))throw refused();
  if(mode==='acquire'){
    if(targetKind!=='raw-pair')throw refused();
    return {network:'none',transfer:'checksum-bound-image-build',buildNetworkEnabled:true,mounts:[{source:runRoot,target:'/output',readOnly:false}],cacheMounted:false};
  }
  if(['verify','publish','transform','publish-generated'].includes(mode)){
    if(['transform','publish-generated'].includes(mode)&&targetKind!=='self-test')throw refused();
    const mounts=[{source:inputRoot,target:'/input',readOnly:true}];
    if(mode==='transform')mounts.push({source:runRoot,target:'/output',readOnly:false});
    if(['publish','publish-generated'].includes(mode))mounts.push({source:cacheRoot,target:'/cache',readOnly:false});
    return {network:'none',mounts,cacheMounted:mounts.some(m=>m.target==='/cache')};
  }
  if(mode==='replay'){
    if(!SHA.test(digest))throw refused();
    return {network:'none',mounts:[{source:resolve(cacheRoot,digest),target:`/entry/${digest}`,readOnly:true}],cacheMounted:true};
  }
  throw refused();
}
