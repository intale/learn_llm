import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, dirname} from 'node:path';

const root='/repo';
const run=process.argv[2];
const phase=process.argv[3]??'freeze';
if(!['freeze','staged','published'].includes(phase))throw Error('Invalid phase');
const audit='audits/2026-10-02-ch17-problem-first';
const read=p=>readFileSync(resolve(root,p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const inputs=JSON.parse(read(run+'/author-inputs.json'));
const mutable=[
  'curriculum/chapters/17-parameter-initialization.md',
  'site/src/content/chapters/en/17-parameter-initialization.mdx',
  'site/src/content/chapters/ru/17-parameter-initialization.mdx',
  'site/src/content/cheat-sheets/en/17-parameter-initialization.json',
  'site/src/content/cheat-sheets/ru/17-parameter-initialization.json',
  'site/tests/17-parameter-initialization-diagram.test.ts',
  'site/tests/e2e/ch17-parameter-initialization.spec.ts',
  'curriculum/course-plan.md',
  'site/tests/content-contract.test.ts',
  'site/tests/e2e/cheat-sheets.spec.ts',
];
const put=(p,b)=>{mkdirSync(dirname(resolve(root,p)),{recursive:true});writeFileSync(resolve(root,p),b)};
if(phase==='freeze'){
  if(existsSync(resolve(root,audit+'/baseline/inventory.json')))throw Error('Baseline already frozen');
  const records=mutable.map(path=>{
    const bytes=read(path);
    if('sha256:'+sha(bytes)!==inputs.files[path])throw Error('Baseline drift: '+path);
    const frozen=audit+'/baseline/'+path;
    put(frozen,bytes);
    return {path,frozen,sha256:sha(bytes)};
  });
  put(audit+'/baseline/inventory.json',JSON.stringify(records,null,2)+'\n');
  process.stdout.write('Eight exact baseline content/integration files frozen.\n');
}else{
  const records=[...JSON.parse(read(audit+'/baseline/inventory.json')),...JSON.parse(read(audit+'/baseline-extra/inventory.json')),...JSON.parse(read(audit+'/baseline-extra/cheat-sheet-inventory.json'))];
  const protectedRecords=[];
  for(const [path,expected] of Object.entries(inputs.files)){
    if(mutable.includes(path))continue;
    const actual=sha(read(path));
    if('sha256:'+actual!==expected)throw Error('Protected byte drift: '+path);
    protectedRecords.push({path,sha256:actual});
  }
  const prefix=phase==='staged'?run+'/publish/':'';
  const math=text=>[...text.matchAll(/\$\$([^$]*?)\$\$|(?<!\\)\$([^$\n]*?)(?<!\\)\$/g)].map(m=>m[1]??m[2]);
  const mathRecords=[];
  for(const record of records.filter(r=>/chapters\/(?:en|ru)\//.test(r.path))){
    const before=math(read(record.frozen).toString());
    const after=math(read(prefix+record.path).toString());
    const missing=[...new Set(before)].filter(value=>!after.includes(value));
    if(missing.length)throw Error('Baseline math literal missing: '+record.path+' '+JSON.stringify(missing));
    mathRecords.push({path:record.path,baselineOccurrences:before.length,currentOccurrences:after.length,missing});
  }
  const contract=JSON.parse(/^---\n([\s\S]*?)\n---/.exec(read(prefix+'curriculum/chapters/17-parameter-initialization.md').toString())[1]);
  if(contract.formula.latex!==inputs.protected_contracts.formula_latex)throw Error('Formula drift');
  if(contract.visualization.id!==inputs.protected_contracts.diagram_id)throw Error('Figure identity drift');
  const report={phase,protectedRecords,mathRecords,formula:contract.formula.latex,figureId:contract.visualization.id};
  const revision=process.argv[4]??null;
  if(revision&&!/^r[1-9][0-9]*$/.test(revision))throw Error('Invalid validation revision');
  const reportPath=audit+'/verification/run04/'+phase+'-protected'+(revision?'-'+revision:'')+'.json';
  if(existsSync(resolve(root,reportPath)))throw Error('Verification evidence already exists');
  put(reportPath,JSON.stringify(report,null,2)+'\n');
  process.stdout.write(JSON.stringify({phase,protected:protectedRecords.length,math:mathRecords})+'\n');
}
