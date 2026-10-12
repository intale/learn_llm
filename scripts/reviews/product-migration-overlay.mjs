// The authorized migration changes transport paths only. This exact overlay is
// checked against the exported checkpoint, never a substitute language verdict.
import {canonicalJson,readRegularFile} from '../lib/bound-files.mjs';
import {PRODUCT_DIRECTORIES,PRODUCT_FILES,productInputPaths} from '../lib/course-publication-lock.mjs';
import {lstatSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';

export const MIGRATED_PRODUCT_FILES=Object.freeze({
  'configs/first-course-core-v1.json':'artifacts/practical-llm-in-rust/foundation/first-core-inventory.json',
  'site/src/data/course/corpus-preparation-trace.json':'artifacts/functional-laptop/chapters/41-corpus-preparation/corpus-preparation-trace.json',
  'site/src/data/course/scalable-bpe-tokenizer-trace.json':'artifacts/practical-llm-in-rust/chapters/03-scalable-bpe-tokenizer/scalable-bpe-tokenizer-trace.json',
});
export const MIGRATION_PATH_REPLACEMENTS=Object.freeze({
  'configs/course-boundaries-v1.json':[
    ['"inventory": "artifacts/practical-llm-in-rust/foundation/first-core-inventory.json"','"inventory": "configs/first-course-core-v1.json"'],
  ],
  'site/src/components/chapters/CorpusPreparationDiagram.astro':[
    ["import trace from '../../../../artifacts/functional-laptop/chapters/41-corpus-preparation/corpus-preparation-trace.json';","import trace from '../../data/course/corpus-preparation-trace.json';"],
  ],
  'site/src/components/chapters/ScalableBpeTokenizerDiagram.astro':[
    ["import trace from '../../../../artifacts/practical-llm-in-rust/chapters/03-scalable-bpe-tokenizer/scalable-bpe-tokenizer-trace.json';","import trace from '../../data/course/scalable-bpe-tokenizer-trace.json';"],
  ],
  'site/src/lib/course-boundaries.mjs':[
    ["export function validateCourseBoundaries(value, registeredLocales = ['en','ru']) {","export function validateCourseBoundaries(value, registeredLocales = ['en','ru'], {historical=false}={}) {"],
    ["value.firstCrateBaseline.inventory !== 'artifacts/practical-llm-in-rust/foundation/first-core-inventory.json' ||","value.firstCrateBaseline.inventory !== (historical?'artifacts/practical-llm-in-rust/foundation/first-core-inventory.json':'configs/first-course-core-v1.json') ||"],
  ],
});
export function migrationProductBytes(bytes,path) {
  let text=bytes.toString('utf8');
  for(const [before,after] of MIGRATION_PATH_REPLACEMENTS[path]??[]) {
    if(text.split(before).length!==2)throw new Error('migration requires one exact original path occurrence: '+path);
    text=text.replace(before,after);
  }
  return MIGRATION_PATH_REPLACEMENTS[path]?Buffer.from(text):bytes;
}
function originalFiles(root,path) {
  const stat=lstatSync(resolve(root,path));
  if(!stat.isDirectory() || stat.isSymbolicLink())throw new Error('nonregular original product directory');
  return readdirSync(resolve(root,path),{withFileTypes:true}).flatMap(entry=>{
    const child=path+'/'+entry.name;
    if(entry.isDirectory())return originalFiles(root,child);
    readRegularFile(root,child);return [child];
  });
}
export function verifyProductMigrationOverlay(root,historyRoot) {
  const current=productInputPaths(root);
  const original=[...PRODUCT_FILES.map(path=>MIGRATED_PRODUCT_FILES[path]??path),...PRODUCT_DIRECTORIES.flatMap(path=>originalFiles(historyRoot,path))];
  const expected=[...original.map(path=>Object.entries(MIGRATED_PRODUCT_FILES).find(([,old])=>old===path)?.[0]??path),...Object.keys(MIGRATED_PRODUCT_FILES).filter(path=>path.startsWith('site/'))].sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b)));
  if(canonicalJson(current)!==canonicalJson(expected))throw new Error('migration product inventory differs from original exact coverage');
  for(const path of current) {
    const oldPath=MIGRATED_PRODUCT_FILES[path]??path;
    const originalBytes=readRegularFile(historyRoot,oldPath);
    const expectedBytes=migrationProductBytes(originalBytes,path);
    if(!readRegularFile(root,path).equals(expectedBytes))throw new Error('non-permitted migration product byte change: '+path);
  }
  return {files:current.length,relocations:Object.keys(MIGRATED_PRODUCT_FILES).length,pathUpdates:Object.keys(MIGRATION_PATH_REPLACEMENTS).length};
}
