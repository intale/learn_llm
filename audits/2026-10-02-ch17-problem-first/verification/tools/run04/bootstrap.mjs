import {readFileSync,writeFileSync,mkdirSync,cpSync} from 'node:fs';
import {createHash} from 'node:crypto';
const previous='.build/runs/20261002T142126Z-rewrite-ch17-problem-first-content-03';
const run='.build/runs/20261003T063100Z-rewrite-ch17-problem-first-content-04';
const sha=b=>createHash('sha256').update(b).digest('hex');
mkdirSync(run+'/evidence',{recursive:true});
cpSync(previous+'/publish',run+'/publish',{recursive:true,errorOnExist:true});
cpSync('BUILD_STATE.yaml',run+'/state-before.yaml');
cpSync('DECISIONS.md',run+'/decisions-before.md');
const inputs=JSON.parse(readFileSync(previous+'/author-inputs.json'));
inputs.baseline_commit=process.argv[2];
if(!/^[a-f0-9]{40}$/.test(inputs.baseline_commit))throw Error('Explicit verified HEAD required');
inputs.run_id=run.split('/').at(-1);
for(const path of Object.keys(inputs.files))inputs.files[path]='sha256:'+sha(readFileSync(path));
inputs.reuse={approvedEnglish:'audits/2026-10-02-ch17-problem-first/english-r6',previousRun:previous,cacheReceipt:{path:previous+'/browser-cache-receipt.json',sha256:sha(readFileSync(previous+'/browser-cache-receipt.json'))}};
inputs.scope.staged_author_outputs=['Russian lesson','Russian cheat sheet','Russian contract fields'];
inputs.scope.network='none in this continuation';
writeFileSync(run+'/author-inputs.json',JSON.stringify(inputs,null,2)+'\n');
for(const name of ['offline-node.sh','browser-validation.sh','build-stage.sh','prepare-english.mjs','prepare-localization.mjs','prepare-locale-routing.mjs','verify-locale-routing.mjs','verify-locale-routing.test.mjs','verify-locale-stage.sh','update-test-copy.mjs','verify-protected.mjs','publish-chapter.mjs']){
  let text=readFileSync(previous+'/'+name,'utf8').replaceAll(previous,run);
  if(name==='browser-validation.sh')text=text.replaceAll('source="$task_run/browser-node_modules"','source="/home/int/rust/learn_llm/'+previous+'/browser-node_modules"').replaceAll('source="$task_run/browser-tools"','source="/home/int/rust/learn_llm/'+previous+'/browser-tools"');
  writeFileSync(run+'/'+name,text);
}
console.log(JSON.stringify({run,manifest:sha(readFileSync(run+'/author-inputs.json')),head:inputs.baseline_commit}));
