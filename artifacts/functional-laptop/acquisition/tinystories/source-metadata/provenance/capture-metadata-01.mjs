import {writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {readBoundedResponse, responseBodyLimit} from '/repo/scripts/lib/bounded-response.mjs';

const targets = [
  ['tinystories-card','https://huggingface.co/datasets/roneneldan/TinyStories/resolve/f54c09fd23315a6f9c86f9dc80f725de7d8f9c64/README.md'],
  ['cdla-sharing-1-0','https://cdla.dev/sharing-1-0/'],
];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
mkdirSync('/output/responses', {recursive:true});
for (const [id, requestedUrl] of targets) {
  let url=requestedUrl;
  const hops=[];
  const signal=AbortSignal.timeout(60000);
  for (let index=0; index<4; index++) {
    const response=await fetch(url,{redirect:'manual',signal,headers:{'accept-encoding':'identity'}});
    const result=await readBoundedResponse(response,responseBodyLimit(response.status,1048576));
    const bodyPath=`responses/${id}-${index}.body`;
    writeFileSync(`/output/${bodyPath}`,result.body,{flag:'wx'});
    hops.push({url,status:response.status,headers:[...response.headers],body_path:bodyPath,body_bytes:result.body.length,body_sha256:digest(result.body),bytes_received:result.bytesReceived,overflow:result.overflow});
    writeFileSync(`/output/responses/${id}-${index}.json`,JSON.stringify(hops.at(-1))+'\n',{flag:'wx'});
    if(result.overflow) throw new Error('bounded response exceeded');
    if([301,302,303,307,308].includes(response.status)) {
      const next=new URL(response.headers.get('location'),url);
      if(next.protocol!=='https:' || next.hostname!==new URL(requestedUrl).hostname || next.username || next.password || next.port || index===3) throw new Error('closed redirect refused');
      url=next.href;
      continue;
    }
    const receipt={schema_version:1,id,requested_url:requestedUrl,final_url:url,observed_at:new Date().toISOString(),headers_representation:'Fetch response headers, not raw HTTP wire bytes',hops};
    writeFileSync(`/output/${id}.receipt.json`,JSON.stringify(receipt)+'\n',{flag:'wx'});
    if(response.status!==200) throw new Error('official source unsuccessful');
    console.log(JSON.stringify({id,status:response.status,bytes:result.body.length,sha256:digest(result.body),final_url:url,hops:hops.length}));
    break;
  }
}
