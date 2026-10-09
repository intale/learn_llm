import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync,brotliDecompressSync} from 'node:zlib';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {strictUtf8,visibleMain} from './parser.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const specBytes=readFileSync('/inputs/current-source-spec.json');const spec=JSON.parse(specBytes);
const records=[];
for(const source of spec.sources){
 const input=join('/inputs/transport-01',source.source_id);const out=join('/evidence',source.source_id);mkdirSync(out,{recursive:true});
 const exit=Number(readFileSync(join(input,'exit-status.txt'),'utf8').trim());assert.equal(exit,0,'transport failed '+source.source_id);
 const metadataText=strictUtf8(readFileSync(join(input,'curl-metadata.jsonl')));const split=metadataText.indexOf('\n');assert(split>0);const metadata=JSON.parse(metadataText.slice(0,split));const headers=JSON.parse(metadataText.slice(split+1));
 assert.equal(metadata.http_code,200);assert.equal(metadata.num_redirects,0);assert.equal(metadata.url_effective,source.request_url);
 const media=metadata.content_type.split(';')[0].trim().toLowerCase();assert(source.accepted_media_types.includes(media));
 const encoding=(headers['content-encoding']?.[0]??'identity').trim().toLowerCase();assert(source.accepted_content_encodings.includes(encoding));
 const body=readFileSync(join(input,'response-body.bin'));assert(body.length<=source.request_bytes_max);assert.equal(metadata.size_download,body.length);
 const options={maxOutputLength:source.expanded_bytes_max};let decoded;
 if(encoding==='identity')decoded=body;else if(encoding==='gzip')decoded=gunzipSync(body,options);else if(encoding==='br')decoded=brotliDecompressSync(body,options);else throw Error('unsupported content encoding');
 assert(decoded.length<=source.expanded_bytes_max);
 writeFileSync(join(out,'response-decoded.bin'),decoded,{flag:'wx'});
 let text;let extraction;
 if(media==='application/pdf'){
  const pdf=join(out,'response-decoded.bin');const info=execFileSync('pdfinfo',[pdf],{encoding:'utf8'});writeFileSync(join(out,'pdfinfo.txt'),info,{flag:'wx'});
  const pageCount=Number(info.match(/^Pages:\s+(\d+)\s*$/m)?.[1]);assert(Number.isSafeInteger(pageCount)&&pageCount>=1&&pageCount<=4096);
  execFileSync('pdftotext',['-enc','UTF-8','-eol','unix','-nopgbrk',pdf,join(out,'whole-document.txt')]);const whole=readFileSync(join(out,'whole-document.txt'));strictUtf8(whole);
  const pieces=[];const pages=[];let offset=0;
  for(let page=1;page<=pageCount;page++){
   const path=join(out,'page-'+String(page).padStart(3,'0')+'.txt');
   execFileSync('pdftotext',['-enc','UTF-8','-eol','unix','-nopgbrk','-f',String(page),'-l',String(page),pdf,path]);const bytes=readFileSync(path);strictUtf8(bytes);pieces.push(bytes);pages.push({page,decoded_utf8_byte_start:offset,decoded_utf8_byte_end:offset+bytes.length,text_sha256:hash(bytes),path:path.slice('/evidence/'.length)});offset+=bytes.length;
  }
  const concatenated=Buffer.concat(pieces);assert.deepEqual(concatenated,whole,'whole-document/per-page extraction mismatch');text=whole;
  writeFileSync(join(out,'page-map.json'),JSON.stringify({schema_version:1,page_count:pageCount,span_unit:'UTF-8 bytes, zero-based half-open [start,end)',pages},null,2)+'\n',{flag:'wx'});
  extraction={method:'pinned-pdf-text-and-page-map-v1',page_count:pageCount,pdfinfo_sha256:hash(Buffer.from(info)),page_map_sha256:hash(readFileSync(join(out,'page-map.json'))),whole_equals_ordered_pages:true,argv:['pdftotext','-enc','UTF-8','-eol','unix','-nopgbrk','<input.pdf>','<output.txt>']};
 }else if(media==='text/html'||media==='application/xhtml+xml'){
  const result=visibleMain(decoded);text=Buffer.from(result.text);extraction={method:'standards-parser-visible-main-text-v1',main_count:result.main_count,rules:result.rules};
 }else if(media==='text/plain'){
  strictUtf8(decoded);text=decoded;extraction={method:'strict-UTF8-no-replacement-v1'};
 }else throw Error('this two-source packet has no authorized JSON extraction');
 writeFileSync(join(out,'extracted.txt'),text,{flag:'wx'});
 const record={source_id:source.source_id,title:source.title,canonical_citation_locator:source.canonical_citation_locator,requested_url:source.request_url,original_request_url:source.original_request_url??source.request_url,final_url:metadata.url_effective,status:metadata.http_code,redirects:[],content_type:media,content_encoding:encoding,request_bytes:body.length,response_sha256:hash(body),response_header_sha256:hash(readFileSync(join(input,'response-headers.bin'))),decoded_response_bytes:decoded.length,decoded_response_sha256:hash(decoded),extracted_text_bytes:text.length,extracted_text_sha256:hash(text),extraction,started_at:readFileSync(join(input,'started-at.txt'),'utf8').trim(),finished_at:readFileSync(join(input,'finished-at.txt'),'utf8').trim(),transport_wall_seconds:metadata.time_total};
 writeFileSync(join(out,'source-record.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});records.push(record);
}
assert(records.reduce((n,r)=>n+r.request_bytes,0)<=spec.per_chapter_download_bytes_max);assert(records.reduce((n,r)=>n+r.decoded_response_bytes,0)<=spec.per_chapter_expanded_bytes_max);
writeFileSync('/evidence/extraction-summary.json',JSON.stringify({schema_version:1,current_source_spec_sha256:hash(specBytes),runtime_image:spec.runtime_image,network:'none',records},null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify({status:'extracted',source_count:records.length,total_response_bytes:records.reduce((n,r)=>n+r.request_bytes,0),total_extracted_text_bytes:records.reduce((n,r)=>n+r.extracted_text_bytes,0)})+'\n');
