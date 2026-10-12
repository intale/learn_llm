// Passive historical inputs are read from an explicitly exported MCP checkpoint.
// Retrieved JavaScript is never evaluated or imported by this loader.
import {hash,readRegularFile} from './bound-files.mjs';
export const ORIGINAL_FUNCTIONAL_CHECKER='scripts/check-functional-laptop-llm-plan.mjs';
export const ORIGINAL_FUNCTIONAL_CHECKER_SHA256='638b03f7aa80b4059a2faebcf3c1db26bd1ac7a76d2dd9e1d5329dd94d7c325d';
export const FROZEN_ASSIGNMENTS=Object.freeze({
  EMBEDDED_CONSTANTS:'embedded frozen constants',
  EMBEDDED_SCHEMA:'embedded frozen schema',
  EMBEDDED_QUEUE:'embedded frozen queue',
  EMBEDDED_CHAPTER_RECORDS:'embedded frozen chapter records',
  EMBEDDED_PLAN_DATA:'embedded frozen plan frontmatter',
  EMBEDDED_PLAN_BODY:'embedded frozen plan body',
});
export function parseFrozenFunctionalAssignments(bytes) {
  if(!Buffer.isBuffer(bytes) || bytes.length>8*1024*1024)throw new Error('bounded original functional source required');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),values={};
  for(const [name,marker] of Object.entries(FROZEN_ASSIGNMENTS)) {
    const prefix='const '+name+' = /* '+marker+' */ ';
    const matches=text.split('\n').filter(line=>line.startsWith('const '+name+' = '));
    if(matches.length!==1 || !matches[0].startsWith(prefix) || !matches[0].endsWith(';'))
      throw new Error('one exact complete frozen assignment required: '+name);
    const value=JSON.parse(matches[0].slice(prefix.length,-1));
    if(name==='EMBEDDED_PLAN_BODY'?typeof value!=='string':!value || typeof value!=='object' || Array.isArray(value))
      throw new Error('frozen assignment shape: '+name);
    values[name]=value;
  }
  return values;
}
export function loadFrozenFunctionalDesign(historyRoot) {
  if(typeof historyRoot!=='string' || !historyRoot)throw new Error('explicit exported functional history root required');
  const bytes=readRegularFile(historyRoot,ORIGINAL_FUNCTIONAL_CHECKER,8*1024*1024);
  if(hash(bytes)!==ORIGINAL_FUNCTIONAL_CHECKER_SHA256)throw new Error('original functional source identity drift');
  return parseFrozenFunctionalAssignments(bytes);
}
