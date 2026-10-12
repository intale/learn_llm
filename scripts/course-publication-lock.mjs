#!/usr/bin/env node
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {canonicalJson} from './lib/bound-files.mjs';
import {captureProductLock,verifyProductLock,PRODUCT_LOCK_PATH} from './lib/course-publication-lock.mjs';
import {checkFirstCoreBaseline} from './check-course-boundaries.mjs';
import {readPracticalPublication as verifyOriginalPublication} from './reviews/practical-publication-history.mjs';
import {verifyProductMigrationOverlay} from './reviews/product-migration-overlay.mjs';

export function runProductLockCli(args) {
  const [command,...rest]=args;
  if(!['capture','verify'].includes(command)) throw new Error('usage: capture --root ROOT --history-root EXPORTED_CHECKPOINT --out configs/course-publication-v1.json | verify --root ROOT');
  const {values,tokens}=parseArgs({args:rest,options:{root:{type:'string'},out:{type:'string'},'history-root':{type:'string'}},strict:true,allowPositionals:false,tokens:true});
  if(!values.root || new Set(tokens.map(token=>token.name)).size!==tokens.length ||
      (command==='capture'?values.out!==PRODUCT_LOCK_PATH || !values['history-root']:values.out!==undefined || values['history-root']!==undefined)) throw new Error('closed product lock arguments');
  const root=resolve(values.root);
  checkFirstCoreBaseline(root);
  if(command==='capture') {
    // A new byte lock is derived only after the original archived candidate's
    // complete review/adjudication and allowed amendment have been verified.
    // That evidence is never reclassified as a fresh judgment of these paths.
    const original=verifyOriginalPublication(resolve(values['history-root']),{parserRoot:root});
    if(!original || original.chapters.length!==4 || original.chapters.some((chapter,index)=>chapter.contentRevision!==[3,1,1,2][index]))
      throw new Error('complete original current publication required before capture');
    verifyProductMigrationOverlay(root,resolve(values['history-root']));
  }
  const lock=command==='capture'?captureProductLock(root):verifyProductLock(root);
  if(command==='capture') writeFileSync(resolve(root,values.out),canonicalJson(lock),{flag:'wx'});
  return {schemaVersion:1,courses:lock.courses.map(({courseId,chapters})=>({courseId,chapters:chapters.length})),files:lock.files.length,limitation:'Exact product bytes and identity only; no semantic judgment.'};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {process.stdout.write(canonicalJson(runProductLockCli(process.argv.slice(2))));}
  catch(error) {console.error(error.message);process.exitCode=1;}
}
