// Mechanical candidate deletion only, inside the owned tmpfs workspace.
import {readFileSync,lstatSync,realpathSync,unlinkSync,rmdirSync,readdirSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {pathToFileURL} from 'node:url';

export function applyStagingDeletions(manifestPath,workspace) {
 const bytes=readFileSync(manifestPath);if(bytes.length>65536)throw new Error('deletion manifest bound');
 const value=JSON.parse(bytes.toString('utf8'));
 const keys=Object.keys(value??{}).sort().join();
 if(!value||!['paths,schema_version','empty_directories,paths,schema_version'].includes(keys)||value.schema_version!==1||!Array.isArray(value.paths)||value.paths.length>128)throw new Error('deletion manifest shape');
 const empty=value.empty_directories??[];
 if(!Array.isArray(empty)||empty.length>128)throw new Error('empty directory manifest shape');
 const root=realpathSync(workspace),seen=new Set(),targets=[];
 for(const path of value.paths){
  if(typeof path!=='string'||path.length>4096||!path.startsWith('rust/')||path.split('/').some(p=>!p||p==='.'||p==='..'||!/^[A-Za-z0-9_.-]+$/.test(p))||seen.has(path))throw new Error('deletion path');
  seen.add(path);const target=resolve(root,path),parent=realpathSync(dirname(target));
  if(relative(root,parent).startsWith('..')||parent!==dirname(target)||!lstatSync(target).isFile()||lstatSync(target).isSymbolicLink())throw new Error('deletion target');
  targets.push(target);
 }
 const directories=[];
 for(const path of empty){
  if(typeof path!=='string'||path.length>4096||!path.startsWith('rust/')||path.split('/').some(p=>!p||p==='.'||p==='..'||!/^[A-Za-z0-9_.-]+$/.test(p))||seen.has(path))throw new Error('empty directory path');
  seen.add(path);const target=resolve(root,path),parent=realpathSync(dirname(target)),stat=lstatSync(target);
  if(relative(root,parent).startsWith('..')||parent!==dirname(target)||!stat.isDirectory()||stat.isSymbolicLink()||readdirSync(target).length!==0)throw new Error('empty directory target');
  directories.push(target);
 }
 for(const directory of directories)rmdirSync(directory);
 for(const target of targets)unlinkSync(target);
 // Prune only empty parents touched by declared deletions. Cargo's member
 // glob otherwise still selects an empty obsolete demo directory. Never
 // recurse through contents or remove the owned Rust boundary itself.
 const boundary=resolve(root,'rust');
 for(const target of targets){
  let parent=dirname(target);
  while(parent!==boundary&&parent.startsWith(boundary+'/')){
   try{rmdirSync(parent);}catch(error){
    if(error.code==='ENOENT'){parent=dirname(parent);continue;}
    if(error.code==='ENOTEMPTY'||error.code==='EEXIST')break;
    throw error;
   }
   parent=dirname(parent);
  }
 }
 return value.paths;
}
if(import.meta.url===pathToFileURL(resolve(process.argv[1]??'')).href){
 if(process.argv.length!==4||process.argv[3]!=='/work')throw new Error('only owned /work candidate permitted');
 applyStagingDeletions(process.argv[2],process.argv[3]);
}
