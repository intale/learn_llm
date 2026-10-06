import {readFileSync,writeFileSync} from 'node:fs';
import {parse} from '/workspace/site/node_modules/parse5/dist/index.js';
const tree=parse(readFileSync('/output/responses/cdla-sharing-1-0-0.body','utf8'));
const skip=new Set(['script','style','noscript']);
function text(node) {
  if(skip.has(node.tagName)) return '';
  if(node.nodeName==='#text') return node.value;
  const value=(node.childNodes??[]).map(text).join('');
  return ['p','div','section','article','h1','h2','h3','h4','li','br'].includes(node.tagName)?value+'\n':value;
}
writeFileSync('/output/cdla-page-text.txt',text(tree).split('\n').map(x=>x.trim().replace(/\s+/g,' ')).filter(Boolean).join('\n')+'\n',{flag:'wx'});
