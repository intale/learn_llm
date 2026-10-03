import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const run=process.argv[2],sha=b=>createHash('sha256').update(b).digest('hex');
const outputs=['curriculum/chapters/17-parameter-initialization.md','site/src/content/chapters/ru/17-parameter-initialization.mdx','site/src/content/cheat-sheets/ru/17-parameter-initialization.json'];
const context=JSON.parse(readFileSync(run+'/ru-author-notes/context-start.json'));
const revision=process.argv[3]??'r1';
if(!/^r[1-9][0-9]*$/.test(revision))throw Error('Invalid author revision');
const output=run+'/ru-author-notes/context-complete'+(revision==='r1'?'':'-'+revision)+'.json';
if(existsSync(output))throw Error('Author completion already frozen');
context.completedAt=new Date().toISOString();
context.candidateRevision=revision;
context.outputs=outputs.map(path=>({path:run+'/publish/'+path,sha256:sha(readFileSync(run+'/publish/'+path))}));
context.meaningLock={path:run+'/ru-author-notes/meaning-lock.md',sha256:sha(readFileSync(run+'/ru-author-notes/meaning-lock.md'))};
if(revision!=='r1'){
  for(const [key,name] of [['revisionNotes','revision-'+revision+'.md'],['cheatSheetCorrespondence','cheat-sheet-correspondence.json']]){
    const path=run+'/ru-author-notes/'+name;
    context[key]={path,sha256:sha(readFileSync(path))};
  }
}
context.selfAudit='Complete direct translation preserves mathematical literals, eight section roles, ten optional explained-result tasks/answers and source ordering; no learner prediction prompts. Self-audit is not publication certification.';
writeFileSync(output,JSON.stringify(context,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({context:context.contextId,completedAt:context.completedAt,sha256:sha(readFileSync(output))}));
