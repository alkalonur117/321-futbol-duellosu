'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createTransfermarktBeta,clubMatches}=require('../lib/transfermarkt-beta');

const response=value=>({ok:true,status:200,json:async()=>value});
function fakeApi(appearances=[3,5]){
 const calls=[];
 const fetchImpl=async url=>{
  calls.push(url);
  if(url.includes('/players/search/'))return response({results:[{id:'100',name:'Kleberson'}]});
  if(url.endsWith('/transfers'))return response({transfers:[{clubFrom:{id:'200',name:'Manchester United'},clubTo:{id:'300',name:'Beşiktaş JK'}}]});
  if(url.endsWith('/stats'))return response({stats:[{clubId:'200',appearances:appearances[0]},{clubId:'300',appearances:appearances[1]}]});
  throw Error('Unexpected URL '+url);
 };
 return {fetchImpl,calls};
}
test('Club matching excludes youth/reserve variants and handles Turkish aliases',()=>{
 assert.equal(clubMatches('Beşiktaş JK','Besiktas'),true);
 assert.equal(clubMatches('Başakşehir FK','Istanbul Basaksehir'),true);
 assert.equal(clubMatches('Manchester United U21','Manchester United'),false);
 assert.equal(clubMatches('Manchester City','Manchester United'),false);
});
test('Beta verifies that a candidate played for both clubs',async()=>{
 const mock=fakeApi();
 const client=createTransfermarktBeta({enabled:true,fetchImpl:mock.fetchImpl,delay:async()=>{}});
 const found=await client.verify('Kleberson',['Besiktas','Manchester United']);
 assert.equal(found.name,'Kleberson');
 assert.equal(mock.calls.length,3);
 const cached=await client.verify('Kleberson',['Manchester United','Besiktas']);
 assert.equal(cached.name,'Kleberson');
 assert.equal(mock.calls.length,3);
});
test('Transfer-only matches are not counted as actual playing appearances',async()=>{
 const mock=fakeApi([4,0]);
 const client=createTransfermarktBeta({enabled:true,fetchImpl:mock.fetchImpl,delay:async()=>{}});
 const found=await client.verify('Kleberson',['Besiktas','Manchester United']);
 assert.equal(found,null);
});
test('Disabled beta makes no outgoing requests',async()=>{
 const mock=fakeApi();
 const client=createTransfermarktBeta({enabled:false,fetchImpl:mock.fetchImpl});
 const found=await client.verify('Kleberson',['Besiktas','Manchester United']);
 assert.equal(found,null);assert.equal(mock.calls.length,0);
});
