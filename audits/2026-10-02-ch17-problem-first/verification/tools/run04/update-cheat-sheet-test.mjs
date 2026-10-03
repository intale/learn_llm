import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const run=process.argv[2],audit='audits/2026-10-02-ch17-problem-first',path='site/tests/e2e/cheat-sheets.spec.ts';
const source=readFileSync(path,'utf8'),old='title: "Initialize trainable weights reproducibly"';
if(source.split(old).length!==2)throw Error('One Chapter17 title expectation required');
const value=JSON.parse(readFileSync(run+'/publish/site/src/content/cheat-sheets/en/17-parameter-initialization.json')).title;
writeFileSync(run+'/publish/'+path,source.replace(old,'title: '+JSON.stringify(value)));
if(!existsSync(audit+'/baseline-extra/cheat-sheets.spec.ts')){
  writeFileSync(audit+'/baseline-extra/cheat-sheets.spec.ts',source,{flag:'wx'});
  writeFileSync(audit+'/baseline-extra/cheat-sheet-inventory.json',JSON.stringify([{path,frozen:audit+'/baseline-extra/cheat-sheets.spec.ts',sha256:createHash('sha256').update(source).digest('hex')}],null,2)+'\n',{flag:'wx'});
}
console.log('Updated only Chapter17 shared cheat-sheet title expectation; all behavior/layout assertions unchanged.');
