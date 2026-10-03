const kind='cheat-sheet-term-definition';
const normalized=s=>s.trim().replace(/\s+/gu,' ');
export function alignLocalizedSheet(sourceUnits,targetUnits,sourceSheet,targetSheet,pairs){
  const sources=sourceUnits.filter(u=>u.kind===kind),targets=targetUnits.filter(u=>u.kind===kind);
  const sourceTerms=new Map(sourceSheet.terms.map(t=>[t.term,t])),targetTerms=new Map(targetSheet.terms.map(t=>[t.term,t]));
  if(sourceTerms.size!==sourceSheet.terms.length||targetTerms.size!==targetSheet.terms.length)throw Error('Duplicate sheet term');
  if(pairs.length!==sources.length||pairs.length!==targets.length||pairs.length!==sourceTerms.size||pairs.length!==targetTerms.size)throw Error('Incomplete sheet pairing');
  if(new Set(pairs.map(p=>p.englishTerm)).size!==pairs.length||new Set(pairs.map(p=>p.russianTerm)).size!==pairs.length)throw Error('Duplicate correspondence');
  const mapped=new Map(),ledger=[];
  const find=(units,term)=>{
    const value=normalized(term.term+' '+term.definition),matches=units.filter(u=>normalized(u.value)===value);
    if(matches.length!==1)throw Error('Rendered term/definition does not match exact source: '+term.term);
    return matches[0];
  };
  for(const pair of pairs){
    const sourceTerm=sourceTerms.get(pair.englishTerm),targetTerm=targetTerms.get(pair.russianTerm);
    if(!sourceTerm||!targetTerm)throw Error('Unknown correspondence term');
    const source=find(sources,sourceTerm),target=find(targets,targetTerm);
    const renderedOrder=targetUnits.indexOf(target)+1;
    mapped.set(source.id,{...target,id:source.id,origin:{...target.origin,renderedInventoryId:target.id,renderedExtractionOrder:renderedOrder}});
    ledger.push({surfaceId:source.id,...pair,sourceOrigin:source.origin,targetOrigin:target.origin,targetRenderedInventoryId:target.id,targetRenderedExtractionOrder:renderedOrder});
  }
  const aligned=sourceUnits.map((source,i)=>{
    if(source.kind===kind)return mapped.get(source.id);
    const target=targetUnits[i];
    if(!target||target.id!==source.id||target.kind!==source.kind)throw Error('Non-sheet role inventory changed');
    return target;
  });
  return {units:aligned,ledger:ledger.sort((a,b)=>Buffer.compare(Buffer.from(a.surfaceId),Buffer.from(b.surfaceId)))};
}
