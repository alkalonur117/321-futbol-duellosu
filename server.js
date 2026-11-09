const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {WebSocketServer}=require('ws');const questions=require('./questions.json');const PORT=process.env.PORT||3000;
const rooms=new Map(),sessions=new Map();
const ADMIN_USERNAME=String(process.env.ADMIN_USERNAME||"admin321").trim().toLocaleLowerCase("tr-TR");
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||"";
const wikidataCache=new Map();const cacheTTL=7*86400000;const enrichmentJobs=new Map();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchJSON(url,ms=14000){const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),ms);try{const r=await fetch(url,{headers:{'User-Agent':'321FutbolDuellosu/5.0 (football trivia; https://github.com/alkalonur117/321-futbol-duellosu)','Accept':'application/json'},signal:ctrl.signal});if(!r.ok)throw Error('Wikidata HTTP '+r.status);return await r.json()}finally{clearTimeout(t)}}
function wdQid(uri){return String(uri||'').match(/Q\d+$/)?.[0]}
async function wdClub(name){const key='club:'+norm(name);let old=wikidataCache.get(key);if(old&&old.until>Date.now())return old.data;const u='https://www.wikidata.org/w/api.php?action=wbsearchentities&search='+encodeURIComponent(name)+'&language=en&uselang=en&type=item&limit=8&format=json&origin=*';let data=await fetchJSON(u);let arr=(data.search||[]).filter(x=>x.id&&x.label);if(!arr.length)return null;let exact=arr.find(x=>norm(x.label)===norm(name)||[...(x.aliases||[])].some(a=>norm(a)===norm(name)));let pick=exact||arr[0];let result={id:pick.id,name:pick.label};wikidataCache.set(key,{data:result,until:Date.now()+cacheTTL});return result}
async function wdPair(a,b){const key='pair:'+[norm(a),norm(b)].sort().join('|');let cached=wikidataCache.get(key);if(cached&&cached.until>Date.now())return cached.data;const clubs=await Promise.all([wdClub(a),wdClub(b)]);if(!clubs[0]||!clubs[1]||clubs[0].id===clubs[1].id)return null;const [c1,c2]=clubs;const sparql=`SELECT DISTINCT ?player ?playerLabel WHERE { ?player wdt:P54 wd:${c1.id}, wd:${c2.id}. SERVICE wikibase:label { bd:serviceParam wikibase:language "tr,en". } } LIMIT 250`;const url='https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(sparql);let result=await fetchJSON(url,20000);let names=[...new Set((result.results?.bindings||[]).map(x=>x.playerLabel?.value).filter(x=>x&&!/^Q\d+$/.test(x)))];const obj=names.length?{teams:[a,b],answers:names,source:'Wikidata',clubIds:[c1.id,c2.id]}:null;wikidataCache.set(key,{data:obj,until:Date.now()+cacheTTL});return obj}
function listRooms(){return [...rooms.values()].filter(r=>!r.solo&&r.players.length===1&&r.phase==='waiting').map(r=>({code:r.code,mode:r.mode,host:r.players[0]?.name,players:r.players.length,maxPlayers:2}))}
function roomsUpdate(){for(const ws of wss.clients)if(ws.username)send(ws,{type:'rooms',rooms:listRooms()})}

const accountPath=path.join(__dirname,'accounts.json');
let accounts={};try{accounts=JSON.parse(fs.readFileSync(accountPath,'utf8'))}catch{}
const pg=process.env.DATABASE_URL?new (require('pg').Pool)({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}}):null;
const dbReady=pg?pg.query('CREATE TABLE IF NOT EXISTS game_users (username TEXT PRIMARY KEY, salt TEXT NOT NULL, hash TEXT NOT NULL)').catch(e=>{console.error('DB init failed',e.message);throw e}):Promise.resolve();
const userKey=s=>String(s||'').trim().toLocaleLowerCase('tr-TR');
const validUsername=s=>/^[a-zA-Z0-9_]{3,20}$/.test(s);
const hashPassword=(password,salt)=>crypto.scryptSync(password,salt,64).toString('hex');
async function getUser(username){await dbReady;if(pg){const r=await pg.query('SELECT username,salt,hash FROM game_users WHERE username=$1',[username]);return r.rows[0]}return accounts[username]}
async function saveUser(username,salt,hash){await dbReady;if(pg)await pg.query('INSERT INTO game_users(username,salt,hash) VALUES($1,$2,$3)',[username,salt,hash]);else{accounts[username]={username,salt,hash};fs.writeFileSync(accountPath,JSON.stringify(accounts))}}
async function listUsers(){await dbReady;if(pg){const r=await pg.query('SELECT username FROM game_users ORDER BY username');return r.rows.map(x=>x.username)}return Object.keys(accounts).sort()}
async function resetUserPassword(username,password){await dbReady;const salt=crypto.randomBytes(16).toString('hex'),hash=hashPassword(password,salt);if(pg){const r=await pg.query('UPDATE game_users SET salt=$2,hash=$3 WHERE username=$1',[username,salt,hash]);if(!r.rowCount)return false}else{if(!accounts[username])return false;accounts[username]={username,salt,hash};fs.writeFileSync(accountPath,JSON.stringify(accounts))}for(const [token,v] of sessions)if(v.username===username)sessions.delete(token);for(const client of wss.clients)if(client.username===username){client.username=null;send(client,{type:'authError',message:'Şifreniz yönetici tarafından yenilendi. Tekrar giriş yapın.'});try{client.close()}catch{}}return true}
function authSession(token){let v=sessions.get(token);if(!v||v.expires<Date.now())return null;return v.username}

const {normalize:norm,resolve}=require('./lib/name-match');
const {createTransfermarktBeta}=require('./lib/transfermarkt-beta');
const tmBeta=createTransfermarktBeta({enabled:process.env.TM_API_ENABLED==='1'});
// Transfermarkt is a rate-limited opt-in beta fallback; local and Wikidata answers stay primary.
// Expand verified club intersections using player memberships already present in curated questions.
const playerClubs=new Map(),playerNames=new Map();
for(const q of questions)for(const answer of q.answers||[]){
 const key=norm(answer);if(!key)continue;
 if(!playerClubs.has(key))playerClubs.set(key,new Set());
 q.teams.forEach(team=>playerClubs.get(key).add(team));playerNames.set(key,answer)
}
const generatedPairs=new Map(),originalPairs=new Set(questions.map(q=>q.teams.slice().sort().join('|')));
for(const [key,clubs] of playerClubs){
 const arr=[...clubs];
 for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){
   const teams=[arr[i],arr[j]].sort(),id=teams.join('|');
   if(originalPairs.has(id))continue;
   if(!generatedPairs.has(id))generatedPairs.set(id,{teams,answers:[]});
   const entry=generatedPairs.get(id),name=playerNames.get(key);
   if(!entry.answers.includes(name))entry.answers.push(name)
 }
}
questions.push(...generatedPairs.values());
const extraTeams=['Istanbul Basaksehir','Trabzonspor','Adana Demirspor','Samsunspor','Konyaspor','Antalyaspor','Kasimpasa','Goztepe','Besiktas','Galatasaray','Fenerbahce','Bursaspor','Celtic','Rangers','Feyenoord','PSV Eindhoven','Sporting CP','Braga','Napoli','Lazio','Fiorentina','Atalanta','Bologna','Torino','Villarreal','Real Betis','Real Sociedad','Athletic Bilbao','Valencia','Girona','Bayer Leverkusen','RB Leipzig','Eintracht Frankfurt','Stuttgart','Wolfsburg','Borussia Monchengladbach','Marseille','Lyon','Monaco','Lille','Nice','Lens','Newcastle United','Aston Villa','West Ham United','Everton','Brighton','Nottingham Forest','Leicester City','Leeds United','Wolverhampton Wanderers','Boca Juniors','River Plate','Flamengo','Palmeiras','Al Hilal','Al Nassr','Al Ittihad','Inter Miami'];const teamNames=[...new Set([...questions.flatMap(q=>q.teams),...extraTeams])].sort();
const pair=(a,b)=>questions.find(q=>q.teams.includes(a)&&q.teams.includes(b));
async function enrichPair(q){
 if(!q?.teams||q.teams.length!==2)return;
 const key=q.teams.slice().sort().join('|');
 if(enrichmentJobs.has(key))return enrichmentJobs.get(key);
 const job=(async()=>{
   try{
     const remote=await wdPair(...q.teams);
     if(remote?.answers?.length){
       const seen=new Set(q.answers.map(norm));
       for(const name of remote.answers){if(!seen.has(norm(name))){q.answers.push(name);seen.add(norm(name))}}
       q.sources??=['local'];if(!q.sources.includes('Wikidata'))q.sources.push('Wikidata');
     }
   }catch(err){console.warn('Wikidata enrichment unavailable:',key,err.message)}
 })();
 enrichmentJobs.set(key,job);return job
}
async function resolvePair(a,b){let local=pair(a,b);if(local){enrichPair(local);return local}const remote=await wdPair(a,b);if(remote){questions.push(remote);enrichPair(remote)}return remote}
// Precompute a bounded collection of valid 3x3 boards without cubic search over all clubs.
const grids=[];const coreTeams=['AC Milan','Arsenal','Barcelona','Bayern Munich','Chelsea','Inter','Juventus','Liverpool','Manchester City','Manchester United','Paris Saint-Germain','Real Madrid','Tottenham Hotspur','Atletico Madrid','Roma','Sevilla','Porto','Benfica','Ajax'];
for(const a of coreTeams)for(const b of coreTeams)for(const c of coreTeams){if(!(a<b&&b<c))continue;let rows=[a,b,c],available=coreTeams.filter(t=>!rows.includes(t)&&rows.every(r=>pair(r,t)));for(let i=0;i<available.length;i++)for(let j=i+1;j<available.length;j++)for(let k=j+1;k<available.length;k++){if(grids.length<5000)grids.push({rows,cols:[available[i],available[j],available[k]]})}}
if(!grids.length)throw new Error('No 3x3 board available');
const send=(ws,obj)=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(obj))};const broadcast=(r,obj)=>r.players.forEach(p=>send(p.ws,obj));const stop=r=>{clearTimeout(r.timer);r.timer=null};
function showAttempt(r,p,answer,correct,extra={}){
 const name=String(answer||'').trim().slice(0,100);
 broadcast(r,{type:'opponentAttempt',playerId:p.id,playerName:p.name,answer:name||'—',correct:!!correct,round:r.round,mode:r.mode,...extra});
}
function scheduleBot(r){
 if(!r.bot)return;
 clearTimeout(r.botTimer);
 const phase=r.phase,deadline=phase==='setup'?r.selectionDeadline:r.deadline;
 if(!deadline||!['setup','playing'].includes(phase))return;
 if(phase==='setup'){
   if(r.selection?.[1]||!r.selection?.[0])return;
   r.botTimer=setTimeout(()=>{
     if(r.phase!=='setup'||r.selection?.[1])return;
     const human=r.selection[0];
     const options=questions.filter(q=>q.teams.includes(human));
     const chosen=options.length?options[crypto.randomInt(options.length)].teams.find(t=>t!==human):teamNames[crypto.randomInt(teamNames.length)];
     r.selection[1]=chosen;state(r);finalizeCustom(r);
   },1200);return;
 }
 if(r.mode==='tictactoe'&&r.turn!==1)return;
 if(r.mode!=='tictactoe'&&r.bot.attempted)return;
 const difficulty=r.botDifficulty||'hard';
 const interval=difficulty==='easy'?3:difficulty==='medium'?2:1;
 const turnKey=r.mode==='tictactoe'?'grid-'+r.deadline:'round-'+r.round;
 if(r.botLastTurnKey!==turnKey){r.botLastTurnKey=turnKey;r.botTurnCount=(r.botTurnCount||0)+1}
 const willKnow=difficulty==='hard'?Math.random()<0.58:r.botTurnCount%interval===0;
 const remaining=deadline-Date.now();
 const delay=difficulty==='hard'?3500+crypto.randomInt(5500):Math.max(0,remaining-950);
 if(delay>=remaining-100)return;
 r.botTimer=setTimeout(()=>{
   if(r.phase!=='playing'||Date.now()>r.deadline)return;
   const bot=r.bot;
   if(r.mode==='quiz'){
     if(bot.attempted)return;bot.attempted=true;
     if(willKnow){showAttempt(r,bot,r.quizQuestion.options[r.quizQuestion.correct],true);quizEnd(r,bot,bot.name+' doğru bildi!')}
     else{const wrong=r.quizQuestion.options.find((_,i)=>i!==r.quizQuestion.correct)||'Bilmiyorum';showAttempt(r,bot,wrong,false);if(r.players.every(p=>p.attempted))quizEnd(r,null,'Kimse doğru cevaplayamadı.');}
   }else if(r.mode==='classic'||r.mode==='custom'){
     if(bot.attempted)return;bot.attempted=true;
     if(willKnow&&r.question?.answers?.length){
       bot.lastAnswer=r.question.answers[crypto.randomInt(r.question.answers.length)];
       showAttempt(r,bot,bot.lastAnswer,true);endRound(r,bot,bot.name+' doğru cevap verdi!');
     }else{showAttempt(r,bot,'Bilmiyorum',false);if(r.players.every(p=>p.attempted))endRound(r,null,'İki oyuncu da yanlış cevap verdi.');}
   }else if(r.mode==='tictactoe'&&r.turn===1){
     const open=r.board.map((v,i)=>v?-1:i).filter(i=>i>=0);
     if(!open.length)return;
     const winning=idx=>{const board=r.board.slice();board[idx]=bot.id;return !!boardWinner(board)};
     const blocking=idx=>{const board=r.board.slice();board[idx]=r.players[0].id;return !!boardWinner(board)};
     let idx;
     if(difficulty==='hard'&&Math.random()<0.65)idx=open.find(winning)??open.find(blocking);
     if(idx===undefined)idx=open[crypto.randomInt(open.length)];
     const q=pair(r.grid.rows[Math.floor(idx/3)],r.grid.cols[idx%3]);
     if(willKnow&&q?.answers?.length){const answer=q.answers[crypto.randomInt(q.answers.length)];showAttempt(r,bot,answer,true,{cell:idx});claim(r,bot,idx,answer)}
     else{showAttempt(r,bot,'Bilmiyorum',false,{cell:idx});r.turn=0;startGridTurn(r)}
   }
 },delay);
}

function state(r){broadcast(r,{type:'state',code:r.code,mode:r.mode,solo:r.solo,players:r.players.map(p=>({id:p.id,name:p.name,score:p.score})),phase:r.phase,round:r.round,teams:r.question?.teams||null,rows:r.grid?.rows||null,cols:r.grid?.cols||null,board:r.board,boardNames:r.boardNames,turn:r.turn,deadline:r.deadline,serverTime:Date.now(),customTeams:r.customTeams,selection:r.selection,selectionDeadline:r.selectionDeadline,winningScore:3,history:r.history||[],teamOptions:teamNames,quiz:r.mode==='quiz'&&r.phase==='playing'?{question:r.quizQuestion.question,options:r.quizQuestion.options}:null});scheduleBot(r)}
function choose(r){let pool=questions.filter(q=>!r.used.has(q.teams.join('|')));if(!pool.length){r.used.clear();pool=questions}let q=pool[Math.floor(Math.random()*pool.length)];r.used.add(q.teams.join('|'));return q}
function begin(r){stop(r);r.validationGraceDeadline=null;r.round++;r.pending={};r.players.forEach(p=>{p.attempted=false;p.suggestion=null});if(r.mode==='quiz'){r.phase='playing';if(!r.quizOrder||r.quizOrder.length===0){r.quizOrder=Array.from({length:quizQuestions.length},(_,i)=>i);for(let i=r.quizOrder.length-1;i>0;i--){let j=crypto.randomInt(i+1);[r.quizOrder[i],r.quizOrder[j]]=[r.quizOrder[j],r.quizOrder[i]]}}r.quizQuestion=quizQuestions[r.quizOrder.pop()];r.deadline=Date.now()+15000;state(r);r.timer=setTimeout(()=>quizEnd(r,null,'Süre doldu.'),15000)}else if(r.mode==='classic'||r.mode==='custom'){r.question=r.mode==='custom'?r.customQuestion:choose(r);if(r.question)enrichPair(r.question);if(!r.question){broadcast(r,{type:'notice',message:'Bu iki takım için doğrulanmış eşleşme bulunamadı. Başka takımlar seçin.'});r.phase='setup';state(r);return}r.phase='playing';r.deadline=Date.now()+15000;state(r);r.timer=setTimeout(()=>{if(r.phase!=='playing')return;const pending=r.players.some(p=>p.suggestion||p.verifying);if(!pending)return endRound(r,null,'Süre doldu.');r.validationGraceDeadline=Date.now()+3000;broadcast(r,{type:'notice',message:'Gönderilmiş cevap önerisini onaylamak veya doğrulamayı tamamlamak için 3 saniye ek süre.'});r.timer=setTimeout(()=>endRound(r,null,'Süre doldu.'),3000)},15000)}else{r.phase='playing';r.turn=0;startGridTurn(r)}}
function endRound(r,winner,reason){if(r.phase!=='playing')return;stop(r);r.validationGraceDeadline=null;r.phase='result';r.deadline=null;if(winner)winner.score++;if(r.mode==='custom'){r.history??=[];r.history.push({round:r.round,teams:[...(r.question?.teams||r.customTeams||[])],answer:winner?.lastAnswer||'—',winnerId:winner?.id||null,winnerName:winner?.name||'Puan yok',reason});}let finished=winner&&winner.score>=3;broadcast(r,{type:'roundResult',winnerId:winner?.id||null,reason,answers:r.question.answers,finished:!!finished});state(r);r.timer=setTimeout(()=>{if(finished){r.phase='finished';state(r);broadcast(r,{type:'gameOver',winnerId:winner.id})}else if(r.mode==='custom')beginCustomSelection(r);else begin(r)},finished?2500:3500)}
function quizEnd(r,winner,reason){if(r.phase!=='playing')return;stop(r);r.phase='result';r.deadline=null;if(winner)winner.score++;let finished=!!winner&&winner.score>=3;broadcast(r,{type:'quizResult',reason,correct:r.quizQuestion.options[r.quizQuestion.correct],finished});state(r);r.timer=setTimeout(()=>{if(finished){r.phase='finished';state(r);broadcast(r,{type:'gameOver',winnerId:winner.id})}else begin(r)},finished?2400:3500)}
function boardWinner(b){const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];return lines.find(l=>b[l[0]]&&b[l[0]]===b[l[1]]&&b[l[1]]===b[l[2]])}
function startGridTurn(r){stop(r);if(r.phase!=='playing')return;r.deadline=Date.now()+15000;state(r);r.timer=setTimeout(()=>{if(r.phase!=='playing')return;broadcast(r,{type:'notice',message:'15 saniye doldu! Sıra değişti.'});if(!r.solo)r.turn=1-r.turn;startGridTurn(r)},15000)}
function gridSubmit(r,p,idx,answer){if(r.phase!=='playing'||Date.now()>r.deadline||!Number.isInteger(idx)||idx<0||idx>8||r.board[idx])return;if(!r.solo&&r.players[r.turn]!==p)return;let q=pair(r.grid.rows[Math.floor(idx/3)],r.grid.cols[idx%3]);let result=resolve(answer,q.answers,'player');if(result.kind!=='suggest'&&result.kind!=='ambiguous')showAttempt(r,p,answer,result.kind==='correct',{cell:idx});if(result.kind==='suggest'){p.suggestion={name:result.name,idx};send(p.ws,{type:'suggestion',name:result.name});return}if(result.kind==='ambiguous'){send(p.ws,{type:'notice',message:'İsim birden fazla oyuncuyla eşleşiyor. Tam adı yazın.'});return}if(result.kind!=='correct'){send(p.ws,{type:'notice',message:'Yanlış cevap. Sıra değişti.'});if(!r.solo)r.turn=1-r.turn;startGridTurn(r);return}claim(r,p,idx,result.name)}
function claim(r,p,idx,name){if(r.phase!=='playing'||Date.now()>r.deadline||r.board[idx])return;r.board[idx]=p.id;r.boardNames[idx]=name;p.score++;broadcast(r,{type:'notice',message:p.name+' kareyi aldı: '+name});let win=boardWinner(r.board);let full=r.board.every(Boolean);if(win||full){stop(r);r.phase='finished';r.deadline=null;let victor=win?r.board[win[0]]:(r.players.length===2?r.players.slice().sort((a,b)=>b.score-a.score)[0]?.id:p.id);broadcast(r,{type:'gameOver',winnerId:victor,reason:'Bulmaca tamamlandı.'});state(r)}else{if(!r.solo)r.turn=1-r.turn;startGridTurn(r)}}
function beginCustomSelection(r){stop(r);clearTimeout(r.botTimer);r.phase='setup';r.question=null;r.deadline=null;r.customTeams=null;r.customQuestion=null;r.selection=Array(r.solo?1:2).fill(null);r.selectionDeadline=Date.now()+20000;r.deadline=r.selectionDeadline;state(r);r.timer=setTimeout(()=>{if(r.phase!=='setup')return;if(r.solo){if(!r.selection[0]){broadcast(r,{type:'notice',message:'20 saniyede takım seçilmedi. Yeniden seçin.'});beginCustomSelection(r);return}const options=questions.filter(q=>q.teams.includes(r.selection[0]));if(!options.length){broadcast(r,{type:'notice',message:'Tek kişilik modda seçilen takımla yerel havuzda eşleşme yok.'});beginCustomSelection(r);return}let q=options[crypto.randomInt(options.length)];r.selection=[r.selection[0],q.teams.find(t=>t!==r.selection[0])];finalizeCustom(r);return}if(!r.selection.every(Boolean)){
 const missing=r.players.map((p,i)=>!r.selection[i]&&p!==r.bot?i:-1).filter(i=>i>=0);
 for(const i of missing){
   r.selectionMisses??=[0,0];
   r.selectionMisses[i]++;
   const offender=r.players[i],opponent=r.players[1-i];
   if(r.selectionMisses[i]>=2&&opponent){
     opponent.score++;
     r.history??=[];
     r.history.push({round:r.round+1,teams:[],answer:'Takım seçilmedi',winnerId:opponent.id,winnerName:opponent.name,reason:offender.name+' iki kez 20 saniyede takım seçmedi'});
     broadcast(r,{type:'selectionPenalty',offenderId:offender.id,offenderName:offender.name,opponentName:opponent.name,level:2,message:offender.name+' ikinci kez takım seçmedi. '+opponent.name+' +1 puan kazandı.'});
     r.selectionMisses[i]=0;
   }else broadcast(r,{type:'selectionPenalty',offenderId:offender.id,offenderName:offender.name,level:1,message:offender.name+' 20 saniyede takım seçmedi. İlk uyarı! Tekrarında rakip 1 puan alır.'});
 }
 const winner=r.players.find(p=>p.score>=3);
 if(winner){stop(r);r.phase='finished';r.deadline=null;r.selectionDeadline=null;state(r);broadcast(r,{type:'gameOver',winnerId:winner.id,reason:'Takım seçme süresi cezası.'});return}
 beginCustomSelection(r);return
}finalizeCustom(r)},20000)}
async function finalizeCustom(r){if(r.phase!=='setup'||!r.selection[0]||!r.selection[1]||r.resolving)return;r.resolving=true;stop(r);broadcast(r,{type:'notice',message:'Takımların ortak futbolcuları kontrol ediliyor...'});let q=null,failed=false;try{q=await resolvePair(...r.selection)}catch(e){failed=true;console.error('Wikidata lookup:',e.message)}finally{r.resolving=false}if(r.phase!=='setup')return;if(!q){broadcast(r,{type:'notice',message:failed?'Wikidata şu anda yanıt vermiyor. Aynı oyuncu sırası korunarak yeniden seçim yapılacak.':'Bu eşleşme için kayıtlı ortak futbolcu bulunamadı. Oyuncu sırası değişmeyecek; yeniden takım seçin.'});r.timer=setTimeout(()=>beginCustomSelection(r),2800);return}r.customTeams=[...r.selection];r.customQuestion=q;r.selectionDeadline=null;broadcast(r,{type:'notice',message:'Takımlar belirlendi: '+r.customTeams.join(' / ')+'. Cevap için 15 saniye!'});begin(r)}
function reset(r){stop(r);r.players.forEach(p=>{p.score=0;p.attempted=false;p.suggestion=null;p.rematch=false});r.round=0;r.botTurnCount=0;r.botLastTurnKey=null;r.history=[];r.selectionMisses=[0,0];r.used.clear();r.quizOrder=[];r.customQuestion=null;r.board=Array(9).fill(null);r.boardNames=Array(9).fill(null);r.selection=null;r.selectionDeadline=null;r.turn=0;r.question=null;r.deadline=null;r.grid=null;r.phase='waiting';if(r.mode==='tictactoe'){r.grid=grids[Math.floor(Math.random()*grids.length)];r.phase='waiting'}if(r.solo||r.players.length===2){if(r.mode==='custom'){beginCustomSelection(r)}else begin(r)}else state(r)}
function join(ws,msg){let code=String(msg.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6),r=rooms.get(code);if(!r)return send(ws,{type:'error',message:'Oda bulunamadı.'});if((r.solo&&r.players.length>=1)||r.players.length>=2)return send(ws,{type:'error',message:'Oda dolu.'});let p={id:crypto.randomUUID(),name:ws.username,score:0,ws};r.players.push(p);ws.room=r;ws.player=p;send(ws,{type:'joined',id:p.id,code});if(r.players.length===2)reset(r);else state(r);roomsUpdate()}
const quizQuestions=require('./quiz.json');
const server=http.createServer((req,res)=>{let pathname=new URL(req.url,'http://localhost').pathname;let file=pathname==='/'?'index.html':pathname.slice(1);let full=path.resolve(__dirname,'public',file);if(!full.startsWith(path.resolve(__dirname,'public')+path.sep)){res.writeHead(403);return res.end()}fs.readFile(full,(e,data)=>{if(e){res.writeHead(404);return res.end('Not found')}const ext=path.extname(full).toLowerCase();const contentType={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'}[ext]||'application/octet-stream';res.writeHead(200,{'Content-Type':contentType,'X-Content-Type-Options':'nosniff','Cache-Control':ext==='.html'?'no-store':'public, max-age=300'});res.end(data)})});
const wss=new WebSocketServer({server});wss.on('connection',ws=>{ws.on('message',async raw=>{let m;try{m=JSON.parse(raw)}catch{return}
if(m.type==='auth'){try{let username=userKey(m.username),password=String(m.password||'');if(!validUsername(username)||password.length<8||password.length>128)return send(ws,{type:'authError',message:'Kullanıcı adı 3-20 harf/rakam/alt çizgi, şifre en az 8 karakter olmalı.'});let isAdmin=username===ADMIN_USERNAME;let u=isAdmin?null:await getUser(username);if(m.action==='register'){if(isAdmin)return send(ws,{type:'authError',message:'Yönetici hesabı kayıt ekranından oluşturulamaz.'});if(u)return send(ws,{type:'authError',message:'Bu kullanıcı adı kullanılıyor.'});let salt=crypto.randomBytes(16).toString('hex');await saveUser(username,salt,hashPassword(password,salt))}else{if(isAdmin){if(!ADMIN_PASSWORD||password!==ADMIN_PASSWORD)return send(ws,{type:'authError',message:'Yönetici bilgileri hatalı veya Render ortam değişkenleri eksik.'})}else{if(!u)return send(ws,{type:'authError',message:'Kullanıcı adı veya şifre yanlış.'});let candidate=Buffer.from(hashPassword(password,u.salt),'hex'),stored=Buffer.from(u.hash,'hex');if(candidate.length!==stored.length||!crypto.timingSafeEqual(candidate,stored))return send(ws,{type:'authError',message:'Kullanıcı adı veya şifre yanlış.'})}}let token=crypto.randomBytes(32).toString('hex');sessions.set(token,{username,expires:Date.now()+7*86400000});ws.username=username;send(ws,{type:'authenticated',username,token,isAdmin:username===ADMIN_USERNAME});roomsUpdate()}catch(e){console.error(e);send(ws,{type:'authError',message:'Hesap işlemi başarısız. Veritabanını kontrol edin.'})}return}
if(m.type==='resume'){let username=authSession(String(m.token||''));if(!username)return send(ws,{type:'authError',message:'Oturum sona erdi. Tekrar giriş yapın.'});ws.username=username;send(ws,{type:'authenticated',username,token:m.token,isAdmin:username===ADMIN_USERNAME});roomsUpdate();return}
if(!ws.username)return send(ws,{type:'error',message:'Önce hesabına giriş yap.'});
if(m.type==='listRooms'){return send(ws,{type:'rooms',rooms:listRooms()})}
if(m.type==='adminUsers'){if(ws.username!==ADMIN_USERNAME)return send(ws,{type:'error',message:'Yönetici yetkisi gerekli.'});try{const users=await listUsers();return send(ws,{type:'adminUsers',users,total:users.length,persistent:!!pg})}catch(e){console.error(e);return send(ws,{type:'error',message:'Kullanıcı listesi alınamadı.'})}}
if(m.type==='adminResetPassword'){if(ws.username!==ADMIN_USERNAME)return send(ws,{type:'error',message:'Yönetici yetkisi gerekli.'});const username=userKey(m.username),password=String(m.password||'');if(!validUsername(username)||username===ADMIN_USERNAME||password.length<8||password.length>128)return send(ws,{type:'error',message:'Geçersiz kullanıcı adı veya şifre (8–128 karakter).'});try{if(!await resetUserPassword(username,password))return send(ws,{type:'error',message:'Kullanıcı bulunamadı.'});return send(ws,{type:'adminPasswordReset',username})}catch(e){console.error(e);return send(ws,{type:'error',message:'Şifre güncellenemedi.'})}}
if(m.type==='adminStats'){if(ws.username!==ADMIN_USERNAME)return send(ws,{type:'error',message:'Yönetici yetkisi gerekli.'});return send(ws,{type:'adminStats',activeRooms:rooms.size,openRooms:listRooms().length,connectedUsers:[...wss.clients].filter(c=>c.username&&c.readyState===1).length,rooms:[...rooms.values()].map(r=>({code:r.code,mode:r.mode,players:r.players.map(p=>p.name),phase:r.phase}))})}
if(m.type==='adminCloseRoom'){if(ws.username!==ADMIN_USERNAME)return send(ws,{type:'error',message:'Yönetici yetkisi gerekli.'});let target=rooms.get(String(m.code||'').toUpperCase());if(!target)return send(ws,{type:'error',message:'Oda bulunamadı.'});stop(target);target.players.forEach(p=>{p.ws.room=null;p.ws.player=null;send(p.ws,{type:'leftRoom',message:'Oda yönetici tarafından kapatıldı.'})});rooms.delete(target.code);roomsUpdate();return send(ws,{type:'adminStats',activeRooms:rooms.size,openRooms:listRooms().length,connectedUsers:[...wss.clients].filter(c=>c.username&&c.readyState===1).length,rooms:[...rooms.values()].map(r=>({code:r.code,mode:r.mode,players:r.players.map(p=>p.name),phase:r.phase}))})}
if(m.type==='leaveRoom'){let old=ws.room;if(!old)return send(ws,{type:'leftRoom'});stop(old);old.players=old.players.filter(p=>p.ws!==ws);ws.room=null;ws.player=null;send(ws,{type:'leftRoom'});if(!old.players.length||old.bot){clearTimeout(old.botTimer);rooms.delete(old.code)}else{old.phase='waiting';old.deadline=null;broadcast(old,{type:'notice',message:'Rakip odadan ayrıldı.'});state(old)}roomsUpdate();return}
if(m.type==='create'){if(ws.room)return send(ws,{type:'error',message:'Önce mevcut odadan ayrıl.'});let mode=['classic','custom','tictactoe','quiz'].includes(m.mode)?m.mode:'classic',vsBot=m.opponent==='bot',solo=!vsBot&&!!m.solo&&mode!=='classic';let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(code));let r={code,mode,solo,players:[],phase:'waiting',round:0,used:new Set(),board:Array(9).fill(null),boardNames:Array(9).fill(null),turn:0,question:null,grid:null,deadline:null,timer:null,customTeams:null,selection:null,selectionDeadline:null};rooms.set(code,r);join(ws,{code,name:m.name});if(vsBot){r.botDifficulty=['easy','medium','hard'].includes(m.difficulty)?m.difficulty:'medium';r.bot={id:crypto.randomUUID(),name:'Futbol AI ('+({easy:'Kolay',medium:'Orta',hard:'Zor'}[r.botDifficulty])+')',score:0,ws:null,attempted:false};r.players.push(r.bot);reset(r)}else if(solo)reset(r);roomsUpdate();return}if(m.type==='join'){if(!ws.player)join(ws,m);roomsUpdate();return}let r=ws.room,p=ws.player;if(!r||!p)return;
if(m.type==='teamResolve'){let result=resolve(m.name,teamNames,'team');send(ws,{type:'teamResolution',slot:m.slot,result});return}
if(m.type==='selectTeam'&&r.mode==='custom'&&r.phase==='setup'&&Date.now()<=r.selectionDeadline){
 let slot=r.solo?0:r.players.indexOf(p);if(slot<0||r.selection[slot])return;
 const typed=String(m.name||'').trim();
 if(typed.length<2||typed.length>80)return send(ws,{type:'teamSelectionResult',result:{kind:'wrong'}});
 let result=resolve(typed,teamNames,'team');
 if(result.kind==='wrong'){
   const input=norm(typed);
   const candidates=teamNames.map(name=>({name,key:norm(name)})).filter(x=>x.key.startsWith(input)&&input.length>=3);
   if(candidates.length===1)result={kind:'suggest',name:candidates[0].name};
 }
 // Known abbreviations and unaccented club names are accepted immediately.
 if(result.kind!=='correct')return send(ws,{type:'teamSelectionResult',result});
 r.selection[slot]=result.name;r.selectionMisses[slot]=0;
 send(ws,{type:'teamSelectionResult',result:{kind:'correct',name:result.name}});
 broadcast(r,{type:'notice',message:p.name+' kendi takımını seçti.'});
 state(r);if(r.solo||r.selection.every(Boolean))finalizeCustom(r);return
}
if(m.type==='quizAnswer'&&r.mode==='quiz'&&r.phase==='playing'&&Date.now()<=r.deadline&&!p.attempted){const index=Number(m.index);if(!Number.isInteger(index)||index<0||index>=r.quizQuestion.options.length)return;p.attempted=true;const correct=index===r.quizQuestion.correct;showAttempt(r,p,r.quizQuestion.options[index],correct);send(ws,{type:'quizAnswerFeedback',round:r.round,selectedIndex:index,correctIndex:r.quizQuestion.correct,correctAnswer:r.quizQuestion.options[r.quizQuestion.correct],isCorrect:correct});if(correct)quizEnd(r,p,p.name+' doğru bildi!');else if(r.players.every(x=>x.attempted))quizEnd(r,null,'Kimse doğru cevaplayamadı.');else send(ws,{type:'notice',message:'Yanlış cevap. Bu tur hakkın bitti.'});return}
if(m.type==='answer'&&r.phase==='playing'&&(r.mode==='classic'||r.mode==='custom')&&!p.attempted&&!p.verifying&&Date.now()<=r.deadline){
 const text=String(m.answer||'').trim();
 const answeredQuestion=r.question,answeredRound=r.round;
 let result=resolve(text,answeredQuestion.answers,'player');
 if(result.kind==='wrong'&&tmBeta.enabled&&norm(text).length>=4){
  p.verifying=true;
  send(ws,{type:'notice',message:'Oyuncu kayıtlı cevaplarda bulunamadı. Alternatif API ile kontrol ediliyor (beta)...'});
  let remote=null;
  try{remote=await tmBeta.verify(text,answeredQuestion.teams)}finally{p.verifying=false}
  // Do not award a result from a different or already-finished round.
  if(r.phase!=='playing'||r.question!==answeredQuestion||r.round!==answeredRound||p.attempted)return;
  if(remote?.name){
   if(!answeredQuestion.answers.some(a=>norm(a)===norm(remote.name)))answeredQuestion.answers.push(remote.name);
   result=resolve(text,answeredQuestion.answers,'player');
   if(result.kind==='wrong')result={kind:'suggest',name:remote.name};
  }
 }
 if(result.kind==='suggest'){p.suggestion={name:result.name};send(ws,{type:'suggestion',name:result.name})}
 else if(result.kind==='ambiguous'){send(ws,{type:'notice',message:'Bu isim birden fazla oyuncuya ait. Tam adı veya soyadını yaz.'});send(ws,{type:'suggestionDismissed'})}
 else{
  p.attempted=true;
  showAttempt(r,p,text,result.kind==='correct');
  send(ws,{type:'attempt',correct:result.kind==='correct'});
  if(result.kind==='correct'){
   p.lastAnswer=result.name;endRound(r,p,p.name+' doğru cevap verdi!');
  }else{
   send(ws,{type:'notice',message:'Yanlış cevap. Bu turda hakkın bitti.'});
   if(r.players.every(x=>x.attempted))endRound(r,null,'İki oyuncu da yanlış cevap verdi.')
  }
 }
 return
}
if(m.type==='gridAnswer'&&r.mode==='tictactoe'){gridSubmit(r,p,Number(m.idx),m.answer);return}
if(m.type==='confirmSuggestion'&&r.phase==='playing'&&p.suggestion){let s=p.suggestion;p.suggestion=null;if(m.accept){if(r.mode==='classic'||r.mode==='custom'){if(Date.now()<=(r.validationGraceDeadline||r.deadline)&&!p.attempted){p.attempted=true;p.lastAnswer=s.name;showAttempt(r,p,s.name,true);endRound(r,p,p.name+' öneriyi onayladı!')}}else if(Date.now()<=r.deadline&&!r.board[s.idx]&&(r.solo||r.players[r.turn]===p)){showAttempt(r,p,s.name,true,{cell:s.idx});claim(r,p,s.idx,s.name)}}else send(ws,{type:'suggestionDismissed'});return}
if(m.type==='rematch'&&r.phase==='finished'){p.rematch=true;if(r.solo||r.bot||r.players.every(x=>x.rematch))reset(r);else send(ws,{type:'notice',message:'Rakibin rövanş isteği bekleniyor.'})}
});ws.on('close',()=>{let r=ws.room;if(!r)return;stop(r);r.players=r.players.filter(p=>p.ws!==ws);if(!r.players.length||r.bot){clearTimeout(r.botTimer);rooms.delete(r.code);roomsUpdate();return}r.phase='waiting';r.deadline=null;roomsUpdate();broadcast(r,{type:'notice',message:'Rakip ayrıldı. Yeni maç için sayfayı yenileyin.'});state(r)})});server.listen(PORT,()=>console.log('Listening on '+PORT));
