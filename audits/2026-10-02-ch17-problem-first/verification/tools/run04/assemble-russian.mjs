import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const run=process.argv[2],ch='17-parameter-initialization';
const read=p=>readFileSync(p,'utf8');
const metadata=text=>JSON.parse(/^---\n([\s\S]*?)\n---/.exec(text)[1]);
const en=metadata(read(run+'/publish/site/src/content/chapters/en/'+ch+'.mdx'));
const translations=JSON.parse(read(run+'/ru-author-notes/metadata.json'));
const dictionary=new Map();
for(const [path,value] of Object.entries(translations)){
  const keys=path.split('.');let node=en;
  for(const key of keys.slice(0,-1))node=node[key];
  const key=keys.at(-1);dictionary.set(node[key],value);node[key]=value;
}
en.locale='ru';
mkdirSync(run+'/publish/site/src/content/chapters/ru',{recursive:true});
mkdirSync(run+'/publish/site/src/content/cheat-sheets/ru',{recursive:true});
writeFileSync(run+'/publish/site/src/content/chapters/ru/'+ch+'.mdx','---\n'+JSON.stringify(en,null,2)+'\n---\n\n'+read(run+'/ru-author-notes/body.mdx'));
writeFileSync(run+'/publish/site/src/content/cheat-sheets/ru/'+ch+'.json',read(run+'/ru-author-notes/sheet.json'));
const path=run+'/publish/curriculum/chapters/'+ch+'.md',text=read(path),match=/^---\n([\s\S]*?)\n---\n/.exec(text),contract=JSON.parse(match[1]);
for(const term of contract.terminology)dictionary.set(term.en,{'parameter':'именованный обучаемый параметр','seed':'начальное значение генератора','prng':'генератор псевдослучайных чисел','fan-in':'входная ширина','fan-out':'выходная ширина','xavier-uniform':'равномерная инициализация по схеме Ксавье','symmetry':'симметрия скрытых нейронов при одинаковой обработке','target-variance':'целевая дисперсия распределения весов'}[term.concept_id]);
for(let i=0;i<contract.formula.symbols.length;i++)dictionary.set(contract.formula.symbols[i].en,translations['formula.symbols.'+i+'.meaning']);
const update=v=>{if(v&&typeof v==='object'){if(typeof v.en==='string'&&typeof v.ru==='string'){if(!dictionary.has(v.en))throw Error('Untranslated contract field: '+v.en);v.ru=dictionary.get(v.en);}else Object.values(v).forEach(update)}};
update(contract);
contract.translation_notes=[
  'Russian revision5 is translated directly from approved English r6. Preserve problem-first explanation, solution before history, optional nonprediction practice and checked answers. Independent bilingual and target-only reviews remain required.',
  'Input/output width means dense connection counts; the token-table shape convention is not a row-lookup variance derivation. Target weight-distribution variance, finite measured population variance and expected linear signal variance remain distinct.',
  'Leaf means the trainable leaf on the operation tape, not merely equal values. Stable names, raw generator state, construction order and returned-error scope remain explicit. All formulas, source URLs, identifiers, values and Rust evidence are unchanged.'
];
writeFileSync(path,'---\n'+JSON.stringify(contract,null,2)+'\n---\n'+text.slice(match[0].length));
console.log('Russian lesson, sheet and every localized contract field assembled; English/shared bytes unchanged.');
