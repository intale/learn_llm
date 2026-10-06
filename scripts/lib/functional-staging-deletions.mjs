// Mechanical candidate deletion only, inside the owned tmpfs workspace.
import {readFileSync,lstatSync,realpathSync,unlinkSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {pathToFileURL} from 'node:url';

export function applyStagingDeletions(manifestPath,workspace) {
 const bytes=readFileSync(manifestPath);if(bytes.length>65536)throw new Error('deletion manifest bound');
 const value=JSON.parse(bytes.toString('utf8'));
 if(!value||Object.keys(value).sort().join()!=='paths,schema_version'||value.schema_version!==1||!Array.isArray(value.paths)||value.paths.length>128)throw new Error('deletion manifest shape');
 const root=realpathSync(workspace),seen=new Set(),targets=[];
 for(const path of value.paths){
  if(typeof path!=='string'||path.length>4096||!path.startsWith('rust/')||path.split('/').some(p=>!p||p==='.'||p==='..'||!/^[A-Za-z0-9_.-]+$/.test(p))||seen.has(path))throw new Error('deletion path');
  seen.add(path);const target=resolve(root,path),parent=realpathSync(dirname(target));
  if(relative(root,parent).startsWith('..')||parent!==dirname(target)||!lstatSync(target).isFile()||lstatSync(target).isSymbolicLink())throw new Error('deletion target');
  targets.push(target);
 }
 for(const target of targets)unlinkSync(target);
 return value.paths;
}
if(import.meta.url===pathToFileURL(resolve(process.argv[1]??'')).href){
 if(process.argv.length!==4||process.argv[3]!=='/work')throw new Error('only owned /work candidate permitted');
 applyStagingDeletions(process.argv[2],process.argv[3]);
}
