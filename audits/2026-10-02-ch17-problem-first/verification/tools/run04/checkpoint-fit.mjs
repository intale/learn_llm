import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const run=process.argv[2];
const files=readdirSync(run+'/evidence').filter(x=>/^(fit|diagnose|cached-diagnose)-validation-\d\d\.log$/.test(x)).sort();
const entries=files.map(name=>{const path=run+'/evidence/'+name,b=readFileSync(path);return {path,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};});
const output=run+'/evidence/copy-fit-evidence-index.json';
writeFileSync(output,JSON.stringify({schemaVersion:1,entries,acceptance:{command:'browser-validation.sh fit 09',status:'passed',firefoxTests:10},limits:'Earlier trials preserved as failed or diagnostic evidence. Only model-authored wording changed. No screenshot, geometry or assertion changes; full validation and independent locale review remain required.'},null,2)+'\n',{flag:'wx'});
console.log(createHash('sha256').update(readFileSync(output)).digest('hex'));
