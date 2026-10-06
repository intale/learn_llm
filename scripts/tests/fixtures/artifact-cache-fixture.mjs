// Artificial bytes only. Independent configured policy and physical mapping.
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
export function createCacheFixture(directory,{policyPath,layoutPath}){
 const policy=JSON.parse(readFileSync(policyPath,'utf8')),layout=JSON.parse(readFileSync(layoutPath,'utf8'));
 const data={attribution:'course-authored fixture\n',license:'fixture-only\n',train:'abc',validation:'hello\n'};
 for(const entry of policy.manifest.payload){const path=layout.files.payload_paths[entry.id];if(!path||!Object.hasOwn(data,entry.id))throw Error('fixture selection refused');const target=join(directory,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,data[entry.id],{flag:'wx',mode:0o600});}
 const metadata=join(directory,layout.files.manifest_path);mkdirSync(dirname(metadata),{recursive:true});writeFileSync(metadata,JSON.stringify(policy.manifest)+'\n',{flag:'wx',mode:0o600});
 return policy.manifest;
}
