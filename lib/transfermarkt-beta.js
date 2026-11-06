'use strict';
// Optional, rate-limited experimental verification only. Never replace local/Wikidata answers.
// Enable through TM_API_ENABLED=1; turn off instantly with TM_API_ENABLED=0.
const {normalize,resolve,teamAliases}=require('./name-match');
const BASE='https://transfermarkt-api.fly.dev';
const suffixes=['footballclub','futbolkulubu','sportclub','fc','fk','jk','sk'];
function clubKeys(name){
 const n=normalize(name),out=new Set([n]);
 for(const [alias,target] of Object.entries(teamAliases))if(normalize(target)===n)out.add(normalize(alias));
 return [...out].filter(x=>x.length>=5);
}
function stripClubSuffix(name){
 let n=normalize(name);
 for(const suffix of suffixes)if(n.endsWith(suffix)&&n.length>suffix.length+3){n=n.slice(0,-suffix.length);break}
 return n;
}
function clubMatches(clubName,targetName){
 const remote=stripClubSuffix(clubName);
 return !!remote&&clubKeys(targetName).some(key=>remote===key||stripClubSuffix(key)===remote);
}
function createTransfermarktBeta({enabled=false,fetchImpl=fetch,delay=ms=>new Promise(ok=>setTimeout(ok,ms)),timeoutMs=2700}={}){
 const cache=new Map();let nextRequest=0,cooldownUntil=0,active=0;
 const enabledFlag=enabled===true;
 async function getJson(path){
  const waitUntil=Math.max(Date.now(),nextRequest,cooldownUntil);
  nextRequest=waitUntil+1750; // <=2 calls / 3 s from this process.
  if(waitUntil>Date.now())await delay(waitUntil-Date.now());
  const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),timeoutMs);
  try{
   const res=await fetchImpl(BASE+path,{headers:{Accept:'application/json'},signal:abort.signal});
   if(res.status===429||res.status===503)cooldownUntil=Date.now()+12000;
   if(!res.ok)throw Error('API HTTP '+res.status);
   return await res.json();
  }finally{clearTimeout(timeout)}
 }
 async function verify(input,teams){
  if(!enabledFlag||!Array.isArray(teams)||teams.length!==2)return null;
  const name=String(input||'').trim();
  if(normalize(name).length<4||name.length>80)return null;
  const key=normalize(name)+'|'+teams.map(normalize).sort().join('|');
  const existing=cache.get(key);
  if(existing&&existing.until>Date.now())return existing.value;
  // Avoid bursts from simultaneous unknown guesses, including suspicious inputs.
  if(active>=2||cooldownUntil>Date.now())return null;
  active++;
  let result=null;
  try{
   const search=await getJson('/players/search/'+encodeURIComponent(name)+'?page_number=1');
   const people=(search?.results||[]).filter(x=>x?.id&&x?.name).slice(0,10);
   const hit=resolve(name,people.map(x=>x.name),'player');
   if(hit.kind!=='correct'&&hit.kind!=='suggest')return null;
   const matches=people.filter(x=>x.name===hit.name);
   if(matches.length!==1)return null;
   const player=matches[0];
   // High similarity from Transfermarkt is only a name match, not proof of club history.
   const transfer=await getJson('/players/'+encodeURIComponent(player.id)+'/transfers');
   const memberships=teams.map(team=>new Set());
   for(const t of transfer?.transfers||[]){
    for(const club of [t?.clubFrom,t?.clubTo]){
     if(!club?.id||!club.name)continue;
     teams.forEach((team,i)=>{if(clubMatches(club.name,team))memberships[i].add(String(club.id))});
    }
   }
   if(memberships.some(s=>!s.size))return null;
   // A transfer record alone does not prove a player appeared for a club.
   const stats=await getJson('/players/'+encodeURIComponent(player.id)+'/stats');
   const appeared=(stats?.stats||[]).filter(s=>Number(s.appearances)>0).map(s=>String(s.clubId||s.club_id||''));
   if(!memberships.every(ids=>appeared.some(id=>ids.has(id))))return null;
   result={name:player.name,source:'Transfermarkt beta',kind:hit.kind};
  }catch(e){
   // The public API is a testing endpoint and may be rate-limited or blocked.
   if(process.env.TM_API_DEBUG==='1')console.warn('Transfermarkt pilot unavailable:',String(e.message).slice(0,120));
  }finally{
   active--;
   if(cache.size>300)cache.clear();
   cache.set(key,{until:Date.now()+(result?60*60*1000:2*60*1000),value:result});
  }
  return result;
 }
 return {verify,enabled:enabledFlag};
}
module.exports={createTransfermarktBeta,clubMatches,stripClubSuffix};
