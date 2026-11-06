'use strict';

// Turkish/English tolerant, deterministic name matching for short timed rounds.
// No automatic acceptance for typos: >=80% similarity yields a confirmation.
const normalize=s=>String(s??'').toLocaleLowerCase('tr-TR').normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/æ/g,'ae')
 .replace(/œ/g,'oe').replace(/ß/g,'ss').replace(/[^a-z0-9]/g,'');

// Optimal-string-alignment distance: a neighbouring letter swap costs one edit.
function distance(a,b){
 if(a===b)return 0;
 const m=a.length,n=b.length;
 if(!m)return n;if(!n)return m;
 const d=Array.from({length:m+1},()=>Array(n+1).fill(0));
 for(let i=0;i<=m;i++)d[i][0]=i;
 for(let j=0;j<=n;j++)d[0][j]=j;
 for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){
  d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])
   d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);
 }
 return d[m][n];
}
const similarity=(a,b)=>{const max=Math.max(a.length,b.length);return max?1-distance(a,b)/max:1};

const teamAliases={
 gs:'Galatasaray',galata:'Galatasaray',
 fb:'Fenerbahce',fener:'Fenerbahce',fenerbahce:'Fenerbahce',
 bjk:'Besiktas',besik:'Besiktas',besiktas:'Besiktas',besiktasjk:'Besiktas',
 manu:'Manchester United',manutd:'Manchester United',manunited:'Manchester United',
 manchesterunited:'Manchester United',mancity:'Manchester City',
 psg:'Paris Saint-Germain',paris:'Paris Saint-Germain',
 real:'Real Madrid',barca:'Barcelona',bayern:'Bayern Munich',
 bvb:'Borussia Dortmund',milan:'AC Milan',intermilan:'Inter',
 juve:'Juventus',basaksehir:'Istanbul Basaksehir',basak:'Istanbul Basaksehir',
 ibb:'Istanbul Basaksehir',istanbulbasaksehir:'Istanbul Basaksehir',
 basaksehirfk:'Istanbul Basaksehir',istanbulbasaksehirfk:'Istanbul Basaksehir',
 trabzon:'Trabzonspor',adana:'Adana Demirspor',
 gok:'Goztepe'
};
const playerAliases={
 cr7:'Cristiano Ronaldo',ronaldo:'Cristiano Ronaldo',
 leo:'Lionel Messi',neymarjr:'Neymar',
 dimaria:'Angel Di Maria',
 kleberson:'Kleberson'
};
function variants(name,type,aliases){
 const tokens=String(name).split(/[\s\-]+/).map(normalize).filter(Boolean);
 const output=[normalize(name)];
 if(type==='player')output.push(...tokens.filter(t=>t.length>=4));
 if(type==='team'){
  const canonical=normalize(name);
  for(const [alias,target] of Object.entries({...teamAliases,...aliases}))
   if(normalize(target)===canonical)output.push(normalize(alias));
 }else{
  const canonical=normalize(name);
  for(const [alias,target] of Object.entries({...playerAliases,...aliases}))
   if(normalize(target)===canonical)output.push(normalize(alias));
 }
 return [...new Set(output.filter(Boolean))];
}
function resolve(input,choices,type='player',aliases={}){
 const query=normalize(input);
 if(query.length<2)return {kind:'wrong'};
 const candidates=[];
 for(const name of new Set(choices||[])){
  const vs=variants(name,type,aliases);
  let score=-1,exact=false;
  for(const v of vs){
   if(v===query){exact=true;score=1;break}
   // Two/three-letter abbreviations require an exact match.
   if(query.length<4||v.length<4)continue;
   const s=similarity(query,v);
   if(s>score)score=s;
  }
  candidates.push({name,score,exact});
 }
 const exacts=candidates.filter(c=>c.exact);
 if(exacts.length===1)return {kind:'correct',name:exacts[0].name};
 if(exacts.length>1)return {kind:'ambiguous',options:exacts.map(c=>c.name)};
 const bestScore=Math.max(-1,...candidates.map(c=>c.score));
 if(bestScore>=.8&&query.length>=4){
  const near=candidates.filter(c=>bestScore-c.score<.001);
  if(near.length===1)return {kind:'suggest',name:near[0].name,similarity:bestScore};
  return {kind:'ambiguous',options:near.map(c=>c.name)};
 }
 if(type==='team'&&query.length>=5){
  const prefix=candidates.filter(c=>variants(c.name,type,aliases).some(v=>v.length>query.length&&v.startsWith(query)));
  if(prefix.length===1)return {kind:'suggest',name:prefix[0].name};
 }
 return {kind:'wrong'};
}
module.exports={normalize,distance,similarity,resolve,variants,teamAliases,playerAliases};
