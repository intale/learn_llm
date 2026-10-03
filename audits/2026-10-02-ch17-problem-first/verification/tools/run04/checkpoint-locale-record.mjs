import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const base=process.argv[2],role=process.argv[3];
if(!/^audits\/2026-10-02-ch17-problem-first\/ru-r[1-9][0-9]*$/.test(base)||!['bilingual','target-only'].includes(role))throw Error('Invalid checkpoint target');
const read=p=>readFileSync(p),sha=b=>createHash('sha256').update(b).digest('hex');
const routing=JSON.parse(read(base+'/routing.json')),route=routing.roles[role];
for(const [path,entry] of Object.entries(route.artifacts))if(read(path).length!==entry.bytes||sha(read(path))!==entry.sha256)throw Error('Routing input drift: '+path);
const bytes=read(route.responsePath),record=JSON.parse(bytes),bundle=JSON.parse(read(route.bundlePath));
if(bytes.at(-1)!==10||bytes.at(-2)===10)throw Error('Raw response must end in one LF');
if(record.reviewer.contextId!==route.contextId||record.reviewer.contextSha256!==sha(read(route.contextPath))||record.reviewer.promptSha256!==sha(read(route.promptPath)))throw Error('Context/prompt identity mismatch');
const author=JSON.parse(read(base+'/frozen/author-context.json'));
if(author.contextId===record.reviewer.contextId)throw Error('Author self-review');
// Reuse the repository's exact structural validator without changing it or any
// semantic record. A temporary lexical export makes its final gate observable.
const executable='.agents/skills/localize-llm-course/scripts/localization-review.mjs';
const original=read(executable),temporary='/tmp/ch17-localization-record-validator.mjs';
writeFileSync(temporary,Buffer.concat([original,Buffer.from('\nexport { validateReviewRecord };\n')]),{flag:'wx'});
const {validateReviewRecord}=await import(pathToFileURL(temporary).href);
const expected={...bundle,bundleSha256:sha(read(route.bundlePath)),requiredSurfaceIds:bundle.surfaces.map(s=>s.id).sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b)))};
try { validateReviewRecord(record,expected,role); }
catch(error){if(record.verdict!=='fail'||error.code!=='review-verdict')throw error;}
const directory=base+'/record-checkpoints';mkdirSync(directory,{recursive:true});
const proof={schemaVersion:1,status:'structurally-valid-'+record.verdict,role,contextId:route.contextId,rawPath:route.responsePath,rawSha256:sha(bytes),rawBytes:bytes.length,coveredSurfaces:record.coveredSurfaceIds.length,findings:record.findings.length,structuralValidatorSha256:sha(original),limits:'Untouched raw bytes. A failed semantic judgment remains failed and cannot authorize publication.'};
writeFileSync(directory+'/'+role+'.json',JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(proof));
