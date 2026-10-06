// Fixed artificial input only. Rust must validate every byte and policy claim.
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,dirname} from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function createCacheFixture(directory){
 const policy=JSON.parse(readFileSync(new URL('../../../rust/demos/ch41-governed-corpus-acquisition/fixtures/source-policy.json',import.meta.url),'utf8'));
 const data=[[policy.attribution_path,'attribution','course-authored fixture\n'],[policy.license_path,'license','fixture-only\n'],[policy.sources[0].path,'raw-train','abc'],[policy.sources[1].path,'raw-validation','hello\n']];
 for(const [path] of data)mkdirSync(dirname(join(directory,'payload',path)),{recursive:true});
 const payload=data.map(([path,role,text])=>{const b=Buffer.from(text);writeFileSync(join(directory,'payload',path),b,{flag:'wx'});return {bytes:b.length,media_type:'text/plain',path,role,sha256:sha(b)};});
 const attribution=payload[0].sha256,license=payload[1].sha256;
 const sources=[0,1].map(index=>{
  const entry=payload[index+2],spec=policy.sources[index],url=new URL(spec.requested_url);
  return {attribution_path:policy.attribution_path,attribution_references:policy.attribution_references,attribution_sha256:attribution,bytes:entry.bytes,filter_config_sha256:null,filter_script_sha256:null,license_id:policy.license_id,license_path:policy.license_path,license_text_sha256:license,media_type:'text/plain',payload_path:entry.path,requested_url:spec.requested_url,resolved_url:{host:url.hostname,path:url.pathname,query_key_inventory_sha256:sha(Buffer.from('[]\n')),query_keys:[],query_values_redacted:true,scheme:'https',transport_caps_passed:true},sha256:entry.sha256,source_id:spec.source_id,source_kind:index?'raw-heldout-source':'raw-corpus',upstream_revision:spec.upstream_revision};
 });
 const manifest={dataset_scope:{domain:policy.domain,language:policy.language,selected_source:policy.selected_source},kind:'dataset',payload,producer:{config_sha256:'0'.repeat(64),script_sha256:'0'.repeat(64)},redistribution:{adapter:'not-approved',derived_model:'not-approved',raw_input:'not-approved'},schema_version:1,sources};
 writeFileSync(join(directory,'artifact-manifest.json'),JSON.stringify(manifest)+'\n',{flag:'wx'});
 return manifest;
}
