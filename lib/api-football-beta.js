'use strict';

// Server-side only: API-Sports credentials must never be sent to the browser or Expo Go.
// Conservative optional beta: verifies previously unknown answers using both club histories.
// API-Football's historical coverage is incomplete; a null result is NOT proof of a wrong answer.
const {normalize,resolve}=require('./name-match');
const {clubMatches}=require('./transfermarkt-beta');
const BASE='https://v3.football.api-sports.io';

function createApiFootballBeta({
  enabled=false,
  apiKey='',
  fetchImpl=globalThis.fetch,
  timeoutMs=4500,
  maxRequestsPerDay=80,
  maxRequestsPerMinute=8,
  now=()=>Date.now()
}={}){
  const active= new Map(),cache=new Map();
  let minuteStart=0,minuteCalls=0,dayStart='',dayCalls=0,cooldownUntil=0;
  const ready=enabled===true&&typeof apiKey==='string'&&apiKey.trim().length>0;
  const limitDay=Math.max(1,Math.min(150000,Number(maxRequestsPerDay)||80));
  const limitMinute=Math.max(1,Math.min(60,Number(maxRequestsPerMinute)||8));

  function mayCall(){
    if(!ready||now()<cooldownUntil)return false;
    const stamp=new Date(now()).toISOString().slice(0,10);
    if(stamp!==dayStart){dayStart=stamp;dayCalls=0}
    if(now()-minuteStart>=60000){minuteStart=now();minuteCalls=0}
    return dayCalls<limitDay&&minuteCalls<limitMinute;
  }

  async function get(endpoint,params){
    if(!['players/profiles','players/teams'].includes(endpoint)||!mayCall())return null;
    dayCalls++;minuteCalls++;
    const query=new URLSearchParams(params);
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
    try{
      const res=await fetchImpl(BASE+'/'+endpoint+'?'+query.toString(),{
        headers:{'x-apisports-key':apiKey,Accept:'application/json'},
        signal:ctrl.signal
      });
      if(res.status===429){cooldownUntil=now()+60000;return null}
      if(!res.ok)return null;
      const remaining=res.headers?.get?.('x-ratelimit-requests-remaining');
      if(remaining!==null&&remaining!==undefined&&Number(remaining)<=1){
        // Never spend the last daily call. Local reset follows UTC day boundary.
        dayCalls=limitDay;
      }
      const data=await res.json();
      if(data?.errors&&Object.keys(data.errors).length)return null;
      return Array.isArray(data?.response)?data.response:null;
    }catch{
      // Avoid logging secrets, URLs or response bodies.
      return null;
    }finally{clearTimeout(timer)}
  }

  function names(profile){
    const p=profile?.player||profile;
    if(!p||typeof p!=='object')return [];
    return [...new Set([
      String(p.name||'').trim(),
      [p.firstname,p.lastname].filter(Boolean).join(' ').trim()
    ].filter(Boolean))];
  }

  function searchTerm(input){
    const parts=String(input).trim().split(/\s+/).filter(Boolean);
    const last=parts[parts.length-1]||'';
    return last.length>=3?last:String(input).trim();
  }

  function matchingProfiles(input,rows){
    const matches=[];
    for(const row of rows.slice(0,100)){
      const p=row?.player||row;
      if(!p?.id)continue;
      const options=names(p);
      if(!options.length)continue;
      const match=resolve(input,options,'player');
      if(match.kind!=='correct'&&match.kind!=='suggest')continue;
      matches.push({id:Number(p.id),name:options.find(n=>normalize(n)===normalize(input))||options[options.length-1],kind:match.kind});
    }
    // Same-name players require manual verification: never award a guessed identity.
    const ids=new Set(matches.map(p=>p.id));
    if(ids.size!==1)return null;
    return matches[0];
  }

  async function lookup(input,teams){
    const rows=await get('players/profiles',{search:searchTerm(input),page:1});
    if(!rows)return null;
    const player=matchingProfiles(input,rows);
    if(!player)return null;
    const history=await get('players/teams',{player:player.id});
    if(!history)return null;
    const clubs=history.map(item=>item?.team?.name).filter(Boolean);
    if(!teams.every(team=>clubs.some(club=>clubMatches(club,team))))return null;
    return {name:player.name,kind:player.kind,source:'API-Football',playerId:player.id};
  }

  async function verify(input,teams){
    if(!ready||!Array.isArray(teams)||teams.length!==2||teams.some(t=>!t||String(t).length>100))return null;
    const name=String(input||'').trim();
    if(normalize(name).length<4||name.length>80)return null;
    const key=normalize(name)+'|'+teams.map(normalize).sort().join('|');
    const cached=cache.get(key);
    if(cached&&cached.until>now())return cached.value;
    if(active.has(key))return active.get(key);
    if(active.size>=2||!mayCall())return null;
    const job=(async()=>{
      let value=null;
      try{value=await lookup(name,teams)}catch{value=null}
      if(cache.size>=300)cache.clear();
      cache.set(key,{value,until:now()+(value?24*3600000:5*60000)});
      return value;
    })();
    active.set(key,job);
    try{return await job}finally{active.delete(key)}
  }

  return {enabled:ready,verify,stats:()=>({dayCalls,minuteCalls,cacheEntries:cache.size})};
}
module.exports={createApiFootballBeta};
