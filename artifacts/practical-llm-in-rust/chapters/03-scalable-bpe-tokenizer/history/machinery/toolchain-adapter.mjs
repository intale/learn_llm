import {readFileSync,writeFileSync,mkdirSync,readdirSync,lstatSync,realpathSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {visibleMain,strictUtf8} from './parser.mjs';
const out='/evidence/toolchain';mkdirSync(out,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=(name,value)=>writeFileSync(join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const run=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',maxBuffer:16*1024*1024});
const file=path=>({path,bytes:lstatSync(realpathSync(path)).size,sha256:hash(readFileSync(path))});
assert.equal(process.version,'v22.12.0');
const archive='/opt/learn-llm/cache/debian/workspace/poppler-utils_22.12.0-2+deb12u2_amd64.deb';
assert.equal(file(archive).sha256,'237d8ae3012bb0b275b681bb7fbd00ee591215e9dc276231d7e4f7bb64efacea');
assert.equal(file(archive).bytes,191800);
assert.equal(file('/usr/bin/pdftotext').sha256,'fc66428c317090606e4bc03e9862d3fb1ae08720fe122c48ed25ef282af383c3');
assert.equal(file('/usr/bin/pdfinfo').sha256,'4aa5fe4f3e1c83f9bddd3d5cf611de4cea65285df8edb8dbba1dd312d1fb0f18');
const archiveVersion=run('dpkg-deb',['-f',archive,'Version']).trim();assert.equal(archiveVersion,'22.12.0-2+deb12u2');
const installed=run('dpkg-query',['-W','-f=${binary:Package}\t${Version}\t${Architecture}\t${Depends}\t${Pre-Depends}\n']);
writeFileSync(join(out,'installed-packages.tsv'),installed,{flag:'wx'});
const packageRecords=new Map(installed.trimEnd().split('\n').map(row=>{const [name,version,architecture,depends,pre_depends]=row.split('\t');return[name,{name,version,architecture,depends,pre_depends}];}));
const linked=[];const packageNames=new Set(['poppler-utils']);
for(const exe of ['/usr/bin/pdftotext','/usr/bin/pdfinfo']){
 const raw=run('ldd',[exe]);writeFileSync(join(out,exe.split('/').at(-1)+'-ldd.txt'),raw,{flag:'wx'});
 for(const line of raw.split('\n')){if(line.includes('not found'))throw Error('unresolved shared library');const path=line.match(/(?:=>\s+)?(\/[^\s]+)\s+\(/)?.[1];if(!path)continue;const resolved=realpathSync(path);let owner;for(const candidate of [...new Set([resolved,path])]){try{owner=run('dpkg-query',['-S',candidate]).trim().split('\n')[0].split(': ')[0];break;}catch{}}if(!owner)throw Error('shared library has no installed package owner '+path);packageNames.add(owner);linked.push({executable:exe,requested_path:path,resolved_path:resolved,owner,...file(resolved)});}
}
json('linked-libraries.json',linked.sort((a,b)=>a.executable.localeCompare(b.executable)||a.path.localeCompare(b.path)));
const graph=[];const licenses=[];const installedFiles=[];
for(const name of [...packageNames].sort()){
 const record=packageRecords.get(name)||packageRecords.get(name+':amd64');if(!record)throw Error('package record missing '+name);
 if(name==='poppler-utils'||name.startsWith('libpoppler126'))assert.equal(record.version,'22.12.0-2+deb12u2');
 const paths=run('dpkg-query',['-L',name]).trimEnd().split('\n');
 for(const p of paths){try{if(lstatSync(realpathSync(p)).isFile())installedFiles.push({package:name,...file(p)});}catch(error){if(error.code!=='ENOENT')throw error;}}
 const license='/usr/share/doc/'+name.split(':')[0]+'/copyright';const dest='license-'+name.replaceAll(':','_')+'.txt';copyFileSync(license,join(out,dest));licenses.push({package:name,...file(license),retained_path:dest});
 graph.push({...record,linked_role:name==='poppler-utils'?'PDF CLI extraction':'ELF shared-library closure for pdftotext/pdfinfo'});
}
json('poppler-package-graph.json',graph);json('installed-file-inventory.json',installedFiles.sort((a,b)=>a.path.localeCompare(b.path)));json('license-inventory.json',licenses);
for(const p of ['workspace-debian-archive-evidence.json','base-installed-packages.tsv'])copyFileSync('/opt/learn-llm/provenance/'+p,join(out,p));
copyFileSync('/opt/learn-llm/site/package-lock.json',join(out,'site-package-lock.json'));
const lock=JSON.parse(readFileSync(join(out,'site-package-lock.json')));const npm=[];
for(const name of ['parse5','entities']){
 const base='/opt/learn-llm/site/node_modules/'+name;const pkg=JSON.parse(readFileSync(join(base,'package.json')));
 assert.equal(pkg.version,name==='parse5'?'7.3.0':'6.0.1');const entry=lock.packages['node_modules/'+name];assert.equal(entry.version,pkg.version);
 const files=[];const walk=dir=>{for(const child of readdirSync(dir).sort()){const path=join(dir,child);if(lstatSync(path).isDirectory())walk(path);else if(lstatSync(path).isFile())files.push(file(path));else throw Error('unexpected npm symlink');}};walk(base);
 const dest='license-'+name+'.txt';copyFileSync(join(base,'LICENSE'),join(out,dest));npm.push({name,version:pkg.version,dependencies:pkg.dependencies??{},resolved:entry.resolved,integrity:entry.integrity,files,license_file:dest});
}
json('npm-parser-graph.json',npm);
const results=[];
const html=Buffer.from('<!doctype html><header>chrome</header><main><p>A &amp; café</p><script>script</script><style>style</style><template>template</template><noscript>noscript</noscript><nav>nav</nav><p hidden>hidden</p><p aria-hidden="true">aria</p><p style="display:none">none</p><pre>line1\nline2</pre></main><footer>footer</footer>');
assert.equal(visibleMain(html).text,'A & café\nline1\nline2\n');results.push({name:'standards-parser-visible-main-and-hidden-exclusion',outcome:'pass'});
assert.throws(()=>visibleMain(Buffer.from('<main>a</main><main>b</main>')));results.push({name:'ambiguous-main-refusal',outcome:'pass'});
assert.equal(strictUtf8(Buffer.from('café\n')),'café\n');assert.throws(()=>strictUtf8(Buffer.from([0xc3,0x28])));results.push({name:'strict-utf8-no-replacement',outcome:'pass'});
const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>',null,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',null,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
for(const [index,text] of [[3,'first page'],[5,'second page']]){const stream='BT /F1 12 Tf 20 100 Td ('+text+') Tj ET\n';objects[index]='<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'endstream';}
let pdf='%PDF-1.4\n';const offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}const xref=Buffer.byteLength(pdf);pdf+='xref\n0 8\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
writeFileSync(join(out,'self-test-two-pages.pdf'),pdf,{flag:'wx'});const info=run('pdfinfo',[join(out,'self-test-two-pages.pdf')]);assert.match(info,/Pages:\s+2\b/);writeFileSync(join(out,'self-test-pdfinfo.txt'),info,{flag:'wx'});
const pieces=[];for(let page=1;page<=2;page++){const p=join(out,'self-test-page-'+page+'.txt');run('pdftotext',['-enc','UTF-8','-eol','unix','-nopgbrk','-f',String(page),'-l',String(page),join(out,'self-test-two-pages.pdf'),p]);const text=strictUtf8(readFileSync(p));assert.match(text,page===1?/first page/:/second page/);pieces.push(text);}
results.push({name:'pdfinfo-page-count-and-ordered-page-extraction',outcome:'pass',pages:2,text_byte_lengths:pieces.map(p=>Buffer.byteLength(p))});
json('network-none-self-test.json',{schema_version:1,network:'none',image:'sha256:1e23bf3c37dd21fb8a1bcba0b80386c0889c8908f3293aa07c0aad958758f8c3',results});
json('observed-toolchain.json',{schema_version:1,node_version:process.version,poppler_archive:file(archive),poppler_archive_version:archiveVersion,pdftotext:file('/usr/bin/pdftotext'),pdfinfo:file('/usr/bin/pdfinfo'),parser_packages:npm.map(({name,version,resolved,integrity})=>({name,version,resolved,integrity})),current_run_only:true,historical_foundation_completion_claimed:false});
process.stdout.write(JSON.stringify({status:'collected',package_count:graph.length,linked_library_records:linked.length,installed_file_records:installedFiles.length,self_tests:results.length})+'\n');
