'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalize,distance,resolve}=require('../lib/name-match');

test('Turkish diacritics, spacing and neighboring transpositions',()=>{
 assert.equal(normalize('İSTANBUL Başakşehir'),'istanbulbasaksehir');
 assert.equal(distance('weghorts','weghorst'),1);
 assert.equal(resolve('klberson',['Kleberson'],'player').kind,'suggest');
 assert.equal(resolve('Kléberson',['Kleberson'],'player').kind,'correct');
 assert.deepEqual(resolve('weghorts',['Wout Weghorst'],'player').name,'Wout Weghorst');
 assert.equal(resolve('weghorst',['Wout Weghorst'],'player').kind,'correct');
});
test('Known club short names are accepted without redundant confirmation',()=>{
 const teams=['Istanbul Basaksehir','Fenerbahce','Besiktas','Manchester United','Galatasaray'];
 for(const [input,name] of [['Başakşehir','Istanbul Basaksehir'],['İstanbul Başakşehir','Istanbul Basaksehir'],['basaksehir','Istanbul Basaksehir'],['FB','Fenerbahce'],['BJK','Besiktas'],['man utd','Manchester United'],['gs','Galatasaray']]){
  assert.deepEqual(resolve(input,teams,'team').kind,'correct',input);
  assert.equal(resolve(input,teams,'team').name,name,input);
 }
});
test('Confident typo gets suggestion but unrelated name is not awarded',()=>{
 assert.equal(resolve('basaksehiri',['Istanbul Basaksehir'],'team').kind,'suggest');
 assert.equal(resolve('weghorts',['Wout Weghorst','Eric Bailly'],'player').kind,'suggest');
 assert.equal(resolve('notaplayer',['Kleberson'],'player').kind,'wrong');
 assert.equal(resolve('k',['Kleberson'],'player').kind,'wrong');
});
