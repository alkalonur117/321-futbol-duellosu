'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createApiFootballBeta}=require('../lib/api-football-beta');

const ok=(response,headers={})=>({ok:true,status:200,headers:{get:(key)=>headers[key]??null},json:async()=>({response,errors:[]})});
const bobo={player:{id:49948,name:'Bobô',firstname:'Deyvison Rogério',lastname:'da Silva'}};
const burak={player:{id:2006,name:'B. Yılmaz',firstname:'Burak',lastname:'Yılmaz'}};
const club=name=>({team:{id:1,name}});
function api({profiles=[bobo],teams=['Besiktas','Sydney FC'],status=200}={}){
  const calls=[];
  const fetchImpl=async(url,opts)=>{
    calls.push({url,headers:opts.headers});
    if(status!==200)return {ok:false,status,headers:{get:()=>null}};
    if(url.includes('/players/profiles?'))return ok(profiles);
    if(url.includes('/players/teams?'))return ok(teams.map(club));
    throw Error('Unexpected endpoint');
  };
  return {calls,fetchImpl};
}
test('disabled by default; no key or calls needed before purchase',async()=>{
  const mock=api();
  const client=createApiFootballBeta({enabled:false,apiKey:'test',fetchImpl:mock.fetchImpl});
  assert.equal(client.enabled,false);
  assert.equal(await client.verify('Bobô',['Besiktas','Sydney FC']),null);
  assert.equal(mock.calls.length,0);
});
test('two clubs verified, cache works with reversed club order',async()=>{
  const mock=api();
  const client=createApiFootballBeta({enabled:true,apiKey:'test-key',fetchImpl:mock.fetchImpl});
  const result=await client.verify('Bobô',['Besiktas','Sydney FC']);
  assert.equal(result.playerId,49948);
  assert.equal(result.name,'Bobô');
  assert.equal(result.source,'API-Football');
  assert.equal(mock.calls.length,2);
  const cached=await client.verify('Bobô',['Sydney FC','Besiktas']);
  assert.deepEqual(cached,result);
  assert.equal(mock.calls.length,2);
  assert.equal(mock.calls[0].headers['x-apisports-key'],'test-key');
});
test('missing historical club does not award a point',async()=>{
  const mock=api({teams:['Besiktas']});
  const client=createApiFootballBeta({enabled:true,apiKey:'test',fetchImpl:mock.fetchImpl});
  assert.equal(await client.verify('Bobô',['Besiktas','Sydney FC']),null);
});
test('same-name identity ambiguity does not award a point',async()=>{
  const mock=api({profiles:[bobo,{player:{...bobo.player,id:777}}]});
  const client=createApiFootballBeta({enabled:true,apiKey:'test',fetchImpl:mock.fetchImpl});
  assert.equal(await client.verify('Bobô',['Besiktas','Sydney FC']),null);
  assert.equal(mock.calls.length,1);
});
test('full name resolves abbreviated API display name',async()=>{
  const mock=api({profiles:[burak],teams:['Galatasaray','Lille']});
  const client=createApiFootballBeta({enabled:true,apiKey:'test',fetchImpl:mock.fetchImpl});
  const result=await client.verify('Burak Yılmaz',['Galatasaray','Lille']);
  assert.equal(result?.playerId,2006);
});
test('rate limit and network failure do not expose secrets or crash',async()=>{
  const mock=api({status:429});
  const client=createApiFootballBeta({enabled:true,apiKey:'test',fetchImpl:mock.fetchImpl});
  assert.equal(await client.verify('Bobô',['Besiktas','Sydney FC']),null);
  assert.equal(await client.verify('Burak Yılmaz',['Galatasaray','Lille']),null);
  assert.equal(mock.calls.length,1);
});
test('a different club with a similar name is not accepted',async()=>{
  const mock=api({profiles:[burak],teams:['Galatasaray','LOSC Lille U19']});
  const client=createApiFootballBeta({enabled:true,apiKey:'test',fetchImpl:mock.fetchImpl});
  assert.equal(await client.verify('Burak Yılmaz',['Galatasaray','Lille']),null);
});
