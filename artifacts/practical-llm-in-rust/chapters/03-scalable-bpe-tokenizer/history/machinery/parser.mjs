import {createRequire} from 'node:module';
const require=createRequire('/opt/learn-llm/site/package.json');
const {parse}=require('parse5');
export function strictUtf8(bytes){return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
const ignored=new Set(['script','style','template','noscript','nav','header','footer','aside']);
const blocks=new Set(['main','article','section','div','p','pre','table','tr','li','h1','h2','h3','h4','h5','h6','blockquote']);
function attrs(node){return Object.fromEntries((node.attrs??[]).map(a=>[a.name,a.value]));}
function hidden(node){const a=attrs(node);return Object.hasOwn(a,'hidden')||a['aria-hidden']==='true'||/display\s*:\s*none|visibility\s*:\s*hidden/i.test(a.style??'');}
export function visibleMain(bytes){
 const doc=parse(strictUtf8(bytes));
 const mains=[];
 const visit=node=>{if(ignored.has(node.tagName)||hidden(node))return;const a=attrs(node);if(node.tagName==='main'||a.role==='main'){mains.push(node);return;}for(const child of node.childNodes??[])visit(child);};
 visit(doc);
 if(mains.length!==1)throw Error('exactly one visible main required');
 let text='';
 const walk=node=>{if(ignored.has(node.tagName)||hidden(node))return;if(node.nodeName==='#text'){text+=node.value;return;}if(node.tagName==='br')text+='\n';const block=blocks.has(node.tagName);if(block&&text&&!text.endsWith('\n'))text+='\n';for(const child of node.childNodes??[])walk(child);if(block&&text&&!text.endsWith('\n'))text+='\n';};
 walk(mains[0]);
 return {text,main_count:mains.length,rules:'One visible main or role=main; exclude script/style/template/noscript/nav/header/footer/aside and hidden/aria-hidden/inline display:none or visibility:hidden; text nodes in document order; LF around block roles and br.'};
}
