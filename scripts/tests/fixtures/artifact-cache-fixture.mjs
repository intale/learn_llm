// Fixed artificial input only. Rust must validate every byte and policy claim.
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function createCacheFixture(directory){
 const data=[['provenance/ATTRIBUTION.txt','attribution','course-authored fixture\n'],['provenance/LICENSE.txt','license','fixture-only\n'],['raw/train.txt','raw-train','abc'],['raw/valid.txt','raw-validation','hello\n']];
 for(const folder of ['provenance','raw'])mkdirSync(join(directory,'payload',folder),{recursive:true});
 const payload=data.map(([path,role,text])=>{const b=Buffer.from(text);writeFileSync(join(directory,'payload',path),b,{flag:'wx'});return {bytes:b.length,media_type:'text/plain',path,role,sha256:sha(b)};});
 const attribution=payload[0].sha256,license=payload[1].sha256;
 const sources=[0,1].map(index=>{
  const entry=payload[index+2],file=index?'valid':'train',url=`https://example.invalid/fixtures/${file}.txt`;
  return {attribution_path:'provenance/ATTRIBUTION.txt',attribution_references:['https://example.invalid/fixtures'],attribution_sha256:attribution,bytes:entry.bytes,filter_config_sha256:null,filter_script_sha256:null,license_id:'LicenseRef-Course-Test-Only',license_path:'provenance/LICENSE.txt',license_text_sha256:license,media_type:'text/plain',payload_path:entry.path,requested_url:url,resolved_url:{host:'example.invalid',path:`/fixtures/${file}.txt`,query_key_inventory_sha256:sha(Buffer.from('[]\n')),query_keys:[],query_values_redacted:true,scheme:'https',transport_caps_passed:true},sha256:entry.sha256,source_id:`fixture-${file}`,source_kind:index?'raw-heldout-source':'raw-corpus',upstream_revision:'fixture-revision-1'};
 });
 const manifest={dataset_scope:{domain:'synthetic-policy-fixture',language:'fixture',selected_source:'fixture-pair'},kind:'dataset',payload,producer:{config_sha256:'0'.repeat(64),script_sha256:'0'.repeat(64)},redistribution:{adapter:'not-approved',derived_model:'not-approved',raw_input:'not-approved'},schema_version:1,sources};
 writeFileSync(join(directory,'artifact-manifest.json'),JSON.stringify(manifest)+'\n',{flag:'wx'});
 return manifest;
}
