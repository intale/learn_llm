// Fixed image-build transport only; offline Rust owns artifact admission.
import {mkdir,open,rename,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readBoundedResponse} from './lib/bounded-response.mjs';
export const REVISION='f54c09fd23315a6f9c86f9dc80f725de7d8f9c64';
export const FIXED_PAIR=[
 {name:'TinyStories-train.txt',file:'TinyStories-train.txt',bytes:1924281556,sha256:'c5cf5e22ff13614e830afbe61a99fbcbe8bcb7dd72252b989fa1117a368d401f'},
 {name:'TinyStories-valid.txt',file:'TinyStories-valid.txt',bytes:19447282,sha256:'94e431816c4cce81ff71e4408ff8d3bda9a42e8d2663986697c3954288cb38b4'}
].map(record=>({...record,url:`https://huggingface.co/datasets/roneneldan/TinyStories/resolve/${REVISION}/${record.file}`}));
const HOSTS=new Set(['huggingface.co','cdn-lfs.huggingface.co','cdn-lfs-us-1.huggingface.co','cdn-lfs-eu-1.huggingface.co','cas-bridge.xethub.hf.co']);
const sha=b=>createHash('sha256').update(b).digest('hex');
export function buildFlag(value='true'){if(value!=='true'&&value!=='false')throw Error('invalid corpus build flag');return value==='true';}
export function fixedEndpoint(value){const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.port||!HOSTS.has(url.hostname))throw Error('source endpoint refused');return url;}

// Exported only for injected offline transport tests. The executable has no
// request/spec/path options and always selects FIXED_PAIR and absolute paths.
export async function transferOne(spec,{fetchImpl=fetch,output,total,signal,now=()=>Date.now(),deadline,maxBodyBytes=2000000000,onProgress=()=>{}}){
 let url=fixedEndpoint(spec.url),redirects=0;const hops=[];
 for(;;){
  if(now()>=deadline)throw Error('source deadline exceeded');
  const response=await fetchImpl(url,{redirect:'manual',signal,headers:{'Accept-Encoding':'identity'}});
  const hop={url:url.href,status:response.status,headers:Object.fromEntries(response.headers)};hops.push(hop);
  if([301,302,303,307,308].includes(response.status)){
   const body=await readBoundedResponse(response,65536);total.bytes_received+=body.bytesReceived;hop.bytes_received=body.bytesReceived;hop.body_sha256=sha(body.body);
   if(body.overflow||total.bytes_received>maxBodyBytes||redirects===5||!response.headers.get('location'))throw Error('source redirect refused');
   url=fixedEndpoint(new URL(response.headers.get('location'),url).href);redirects++;continue;
  }
  if(response.status!==200){const body=await readBoundedResponse(response,65536);total.bytes_received+=body.bytesReceived;hop.bytes_received=body.bytesReceived;throw Error('source status refused');}
  if(response.headers.get('content-encoding')&&!['identity',''].includes(response.headers.get('content-encoding')))throw Error('encoded source refused');
  if(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='text/plain')throw Error('source media refused');
  const length=response.headers.get('content-length');if(length!==null&&length!==String(spec.bytes))throw Error('source length refused');
  const partial=output+'.part',file=await open(partial,'wx',0o600),digest=createHash('sha256');let received=0;
  try{for await(const raw of response.body??[]){const chunk=Buffer.from(raw);received+=chunk.length;total.bytes_received+=chunk.length;
    if(now()>=deadline||received>spec.bytes||total.bytes_received>maxBodyBytes)throw Error('source body bound exceeded');
    digest.update(chunk);await file.writeFile(chunk);onProgress(total.bytes_received);
   }await file.sync();}finally{await file.close();}
  const hash=digest.digest('hex');if(received!==spec.bytes||hash!==spec.sha256)throw Error('source checksum refused');
  await rename(partial,output);hop.bytes_received=received;hop.body_sha256=hash;
  return {name:spec.name,requested_url:spec.url,final_url:url.href,bytes:received,sha256:hash,redirects,hops};
 }
}

export async function imageBuild({enabled=true,fetchImpl=fetch,root='/source-payload',privateRoot='/source-private',metadata='/source-build/metadata',files=FIXED_PAIR,report=value=>console.log(JSON.stringify(value))}={}){
 await mkdir(root,{mode:0o700});if(!enabled){report({schema_version:1,enabled:false,bytes_received:0});return;}
 await mkdir(privateRoot,{mode:0o700});await mkdir(join(root,'raw'),{mode:0o700});await mkdir(join(root,'provenance'),{mode:0o700});
 const started=Date.now(),deadline=started+14400000,total={bytes_received:0},records=[],controller=new AbortController();const timer=setTimeout(()=>controller.abort(),14400000);
 try{
  let nextProgress=67108864;
  for(const spec of files){records.push(await transferOne(spec,{fetchImpl,output:join(root,'raw',spec.name),total,deadline,signal:controller.signal,onProgress:bytes=>{if(bytes>=nextProgress){report({schema_version:1,enabled:true,status:'receiving',bytes_received:bytes});nextProgress+=67108864;}}}));report({schema_version:1,enabled:true,completed_files:records.length,bytes_received:total.bytes_received});}
  await copyFile(join(metadata,'cdla-page-text.txt'),join(root,'provenance/LICENSE.txt'));
  await copyFile(join(metadata,'attribution-and-permission.json'),join(root,'provenance/ATTRIBUTION.txt'));
  await writeFile(join(privateRoot,'transport.json'),JSON.stringify({schema_version:1,transport:'fixed-pair-image-build',started_at:new Date(started).toISOString(),elapsed_ms:Date.now()-started,bytes_received:total.bytes_received,records})+'\n',{flag:'wx',mode:0o600});
  report({schema_version:1,enabled:true,status:'downloaded-not-admitted',bytes_received:total.bytes_received,completed_files:records.length});
 }catch(error){report({schema_version:1,enabled:true,status:'failed',bytes_received:total.bytes_received,completed_files:records.length});throw Error('fixed source image build refused');}finally{clearTimeout(timer);}
}
if(import.meta.url===pathToFileURL(resolve(process.argv[1]??'')).href){try{if(process.argv.length!==2)throw Error('no build options');await imageBuild({enabled:buildFlag(process.env.COURSE_CORPUS??'true')});}catch{console.error('Fixed source image build refused; cumulative body accounting retained in build output.');process.exitCode=2;}}
