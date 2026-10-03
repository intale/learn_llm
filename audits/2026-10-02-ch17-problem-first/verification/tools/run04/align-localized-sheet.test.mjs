import test from 'node:test';
import assert from 'node:assert/strict';
import {alignLocalizedSheet} from './align-localized-sheet.mjs';
const fixture=()=>{
  const sourceSheet={terms:[{term:'A',definition:'first concept'},{term:'B',definition:'second concept'}]};
  const targetSheet={terms:[{term:'Я',definition:'первое понятие'},{term:'А',definition:'второе понятие'}]};
  const node=(id,value,path)=>({id,kind:'cheat-sheet-term-definition',value,origin:{nodePath:path}});
  const common={id:'unit.000',kind:'heading',value:'Chapter',origin:{nodePath:[0]}};
  const sourceUnits=[common,node('unit.001','A first concept',[1]),node('unit.002','B second concept',[2])];
  const targetUnits=[{...common,value:'Глава'},node('unit.001','А второе понятие',[1]),node('unit.002','Я первое понятие',[2])];
  const pairs=[{englishTerm:'A',russianTerm:'Я'},{englishTerm:'B',russianTerm:'А'}];
  return [sourceUnits,targetUnits,sourceSheet,targetSheet,pairs];
};
test('pairs independently sorted rendered values by explicit concept and retains actual DOM order',()=>{
  const args=fixture(),before=JSON.stringify(args),result=alignLocalizedSheet(...args);
  assert.equal(result.units[1].value,'Я первое понятие');
  assert.equal(result.units[1].id,'unit.001');
  assert.equal(result.units[1].origin.renderedInventoryId,'unit.002');
  assert.equal(result.units[1].origin.renderedExtractionOrder,3);
  assert.deepEqual(result.units[1].origin.nodePath,[2]);
  assert.equal(result.units[0],args[1][0]);
  assert.equal(JSON.stringify(args),before);
});
test('rejects incomplete correspondences',()=>{const a=fixture();a[4].pop();assert.throws(()=>alignLocalizedSheet(...a),/Incomplete/);});
test('rejects duplicate correspondence targets',()=>{const a=fixture();a[4][1].russianTerm='Я';assert.throws(()=>alignLocalizedSheet(...a),/Duplicate/);});
test('rejects unknown named terms',()=>{const a=fixture();a[4][1].russianTerm='missing';assert.throws(()=>alignLocalizedSheet(...a),/Unknown/);});
test('rejects mismatched rendered definitions',()=>{const a=fixture();a[1][1].value='А первое понятие';assert.throws(()=>alignLocalizedSheet(...a),/does not match/);});
test('rejects duplicate complete-sheet terms',()=>{const a=fixture();a[3].terms[1].term='Я';assert.throws(()=>alignLocalizedSheet(...a),/Duplicate sheet/);});
test('rejects changed non-sheet roles',()=>{const a=fixture();a[1][0].kind='description';assert.throws(()=>alignLocalizedSheet(...a),/Non-sheet/);});
