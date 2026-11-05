
const $=id=>document.getElementById(id);let ws,myId,phase='waiting',mode='classic',solo=false,deadline=null,selected=-1,locked=false,turn=0,board=[],players=[],rows=[],cols=[],boardNames=[],ticker,selection=[],selectionDeadline=null,authToken=sessionStorage.getItem('gameToken')||'',authUser='',quizLocked=false;
const send=o=>ws?.readyState===1&&ws.send(JSON.stringify(o));const notice=s=>$('notice').textContent=s;const hideSuggest=()=>$('suggestion').classList.add('hidden');const modeNames={classic:'Klasik 3-2-1',custom:'Takımları Sen Seç',tictactoe:'Tic Tac Toe',quiz:'Futbol Bilgi Yarışması'};
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));$('players').disabled=false});
const codeFromUrl=new URLSearchParams(location.search).get('room');if(codeFromUrl)$('codeInput').value=codeFromUrl.toUpperCase();
let soundContext=null,soundEnabled=false,fxTimeout=null,lastFxTime=0;
document.addEventListener('pointerdown',()=>{soundEnabled=true;if(soundContext?.state==='suspended')soundContext.resume().catch(()=>{})},{once:true});
document.addEventListener('keydown',()=>{soundEnabled=true;if(soundContext?.state==='suspended')soundContext.resume().catch(()=>{})},{once:true});
const fxOverlay=document.createElement('div');fxOverlay.id='matchFxOverlay';fxOverlay.setAttribute('aria-live','polite');
fxOverlay.style.cssText='position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;pointer-events:none;background:rgba(0,0,0,.36)';
const fxCard=document.createElement('div');fxCard.style.cssText='text-align:center;padding:30px 45px;border-radius:22px;background:rgba(3,25,32,.95);border:3px solid #ef5555;box-shadow:0 15px 75px #0008;max-width:90vw;animation:popMatchFx .3s ease-out';
const fxSymbol=document.createElement('div');fxSymbol.style.cssText='font-size:clamp(65px,13vw,125px);line-height:1.1;font-weight:900';
const fxText=document.createElement('div');fxText.style.cssText='font-size:clamp(20px,4vw,36px);font-weight:900;margin-top:10px;color:white';
fxCard.append(fxSymbol,fxText);fxOverlay.append(fxCard);document.body.append(fxOverlay);
const fxStyle=document.createElement('style');fxStyle.textContent='@keyframes popMatchFx{0%{transform:scale(.45);opacity:0}70%{transform:scale(1.12);opacity:1}100%{transform:scale(1);opacity:1}}';document.head.append(fxStyle);
function audioCtx(){if(!soundEnabled)return null;try{soundContext??=new (window.AudioContext||window.webkitAudioContext)();if(soundContext.state==='suspended')soundContext.resume().catch(()=>{});return soundContext}catch{return null}}
function tone(ctx,freq,start,duration,wave='sine',volume=.12,endFreq=null){
 const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=wave;osc.frequency.setValueAtTime(freq,start);
 if(endFreq)osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),start+duration);
 gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.018);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
 osc.connect(gain).connect(ctx.destination);osc.start(start);osc.stop(start+duration+.03)
}
function playMatchSound(kind){
 const ctx=audioCtx();if(!ctx)return;const t=ctx.currentTime+.015;
 if(kind==='goal'||kind==='opponentGoal'){
  // Stadium-style original crowd cheer, with a human voice yelling "Gol".
  const duration=kind==='opponentGoal'?1.8:2.5,buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*duration),ctx.sampleRate),samples=buffer.getChannelData(0);
  let low=0;
  for(let i=0;i<samples.length;i++){
   const time=i/ctx.sampleRate;
   low=low*.985+(Math.random()*2-1)*.015;
   const swell=Math.min(1,time/.35)*Math.min(1,(duration-time)/.8);
   samples[i]=low*swell;
  }
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  src.buffer=buffer;filter.type='lowpass';filter.frequency.value=kind==='opponentGoal'?380:1900;
  gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(kind==='opponentGoal'?.2:.52,t+.28);
  gain.gain.setValueAtTime(kind==='opponentGoal'?.2:.52,t+Math.min(1.1,duration-.5));gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  src.connect(filter).connect(gain).connect(ctx.destination);src.start(t);
  for(let i=0;i<(kind==='opponentGoal'?3:9);i++){const start=t+i*.19;tone(ctx,kind==='opponentGoal'?75+i*9:170+(i%3)*38,start,kind==='opponentGoal'?.6:.75,'sawtooth',kind==='opponentGoal'?.012:.023,kind==='opponentGoal'?60:135+(i%3)*25)}
  if(false && 'speechSynthesis' in window){
   try{
    window.speechSynthesis.cancel();
    const voice=new SpeechSynthesisUtterance('Goooooooool! Gooooool!');
    voice.lang='tr-TR';voice.rate=.72;voice.pitch=.65;voice.volume=1;
    const turkish=window.speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('tr'));
    if(turkish)voice.voice=turkish;
    window.speechSynthesis.speak(voice)
   }catch(e){console.warn('Goal voice unavailable',e)}
  }
 }else if(kind==='wrong'){tone(ctx,330,t,.18,'sawtooth',.13,190);tone(ctx,210,t+.18,.35,'sawtooth',.12,90)}
 else{tone(ctx,730,t,.12,'square',.08,610);tone(ctx,580,t+.16,.23,'triangle',.09,420)}
}
function showMatchFx(kind,label){
 const now=Date.now();if((kind==='goal'||kind==='opponentGoal')&&now-lastFxTime<550)return;lastFxTime=now;
 clearTimeout(fxTimeout);fxSymbol.textContent=(kind==='goal'||kind==='opponentGoal')?'⚽':kind==='wrong'?'✖':'⚠';
 fxSymbol.style.color=kind==='goal'?'#66e8aa':kind==='opponentGoal'?'#ff7272':kind==='wrong'?'#ff5555':'#ffce63';
 fxCard.style.borderColor=kind==='goal'?'#66e8aa':kind==='opponentGoal'?'#ff7272':kind==='wrong'?'#ff5555':'#ffce63';
 fxText.textContent=label||(kind==='goal'?'GOOOL!':kind==='opponentGoal'?'RAKİP GOL ATTI!':kind==='wrong'?'YANLIŞ CEVAP!':'UYARI!');
 fxOverlay.style.display='flex';playMatchSound(kind);
 fxTimeout=setTimeout(()=>{fxOverlay.style.display='none'},(kind==='goal'||kind==='opponentGoal')?1900:1400)
}
function goalFx(winnerId=myId){const el=$('goalFx');el.classList.remove('play');void el.offsetWidth;el.classList.add('play');setTimeout(()=>el.classList.remove('play'),1500);showMatchFx(winnerId===myId?'goal':'opponentGoal',winnerId===myId?'GOOOL!':'RAKİP GOL ATTI!')}

function socket(){if(ws&&(ws.readyState===WebSocket.OPEN||ws.readyState===WebSocket.CONNECTING))return;ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host);ws.onmessage=e=>handle(JSON.parse(e.data));ws.onclose=()=>{$('authMsg').textContent='Sunucu bağlantısı kesildi. Sayfayı yenileyin.';notice('Bağlantı kesildi. Sayfayı yenileyip yeniden katıl.')};ws.onerror=()=>{$('authMsg').textContent='Sunucuya bağlanılamadı. Render servisinin Live olduğunu kontrol edin.';notice('Sunucu bağlantı hatası.')};ws.onopen=()=>{if(authToken)send({type:'resume',token:authToken})}}
function connect(action){if(!authUser)return alert('Önce giriş yap.');if(ws?.readyState!==1)return alert('Sunucu bağlantısı kurulamadı. Sayfayı yenile.');send({type:action,code:$('codeInput').value,mode,solo:$('players').value==='solo',opponent:$('players').value.startsWith('bot-')?'bot':'human',difficulty:$('players').value.startsWith('bot-')?$('players').value.slice(4):'medium'})}
const attemptsPanel=document.createElement('section');
attemptsPanel.id='attemptsPanel';
attemptsPanel.style.cssText='margin:12px 0;padding:12px 14px;border:1px solid rgba(107,232,189,.24);border-radius:14px;background:rgba(3,28,35,.82)';
const attemptsHeading=document.createElement('div');attemptsHeading.textContent='⚔️ Canlı düello · Oyuncu cevapları';attemptsHeading.style.cssText='font-weight:750;margin-bottom:8px';
const attemptsList=document.createElement('div');attemptsList.id='attemptsList';attemptsList.style.cssText='display:grid;gap:7px;font-size:14px';
attemptsPanel.append(attemptsHeading,attemptsList);
$('game').insertBefore(attemptsPanel,$('customPanel'));
let lastAttemptRound='',attemptRoom='';
function clearAttempts(){attemptsList.replaceChildren()}
function addAttempt(m){
 const line=document.createElement('div');const mine=m.playerId===myId;
 line.style.cssText='padding:9px 11px;border-radius:9px;background:'+(mine?'rgba(24,138,103,.23)':'rgba(114,84,185,.23)')+';border-left:3px solid '+(mine?'#61e8af':'#bca2ff');
 const who=document.createElement('strong');who.textContent=(mine?'Sen':m.playerName)+' · ';
 const answer=document.createElement('span');answer.textContent=m.answer||'—';
 const result=document.createElement('small');result.textContent=m.correct?' ✓ Doğru':' ✕ Yanlış';result.style.cssText='margin-left:8px;color:'+(m.correct?'#75e9b6':'#ffb7ad');
 line.append(who,answer,result);attemptsList.prepend(line);
 while(attemptsList.children.length>8)attemptsList.lastChild.remove()
}
const historyPanel=document.createElement('aside');
historyPanel.id='customHistory';
historyPanel.style.cssText='display:none;max-width:380px;margin:8px 0 12px auto;padding:10px 12px;background:rgba(8,28,42,.82);border:1px solid rgba(255,255,255,.15);border-radius:12px;font-size:12px;overflow-x:auto';
$('game').insertBefore(historyPanel,$('customPanel'));
function renderCustomHistory(items){
 historyPanel.style.display=mode==='custom'&&items?.length?'block':'none';
 if(historyPanel.style.display==='none')return;
 historyPanel.replaceChildren();
 const heading=document.createElement('strong');heading.textContent='Önceki turlar';historyPanel.append(heading);
 const table=document.createElement('table');table.style.cssText='width:100%;margin-top:7px;border-collapse:collapse;text-align:left';
 const header=document.createElement('tr');for(const h of ['Tur','Takımlar','Cevap','Puan']){let th=document.createElement('th');th.textContent=h;th.style.padding='4px';header.append(th)}table.append(header);
 for(const entry of items){
 const tr=document.createElement('tr');const owner=players.findIndex(p=>p.id===entry.winnerId);
 tr.style.cssText='color:'+(owner===0?'#73e6b4':owner===1?'#c4a3ff':'#aab7c5')+';border-top:1px solid rgba(255,255,255,.1)';
 for(const v of [entry.round,entry.teams?.join(' / ')||'—',entry.answer||'—',entry.winnerName||'—']){const td=document.createElement('td');td.textContent=String(v);td.style.padding='5px 4px';tr.append(td)}table.append(tr)
 }
 historyPanel.append(table)
}
let previousCustomSelection=null;
const opponentSelect=$('players');
for(const [value,name] of [['bot-easy','Kolay AI'],['bot-medium','Orta AI'],['bot-hard','Zor AI']]){
 const option=document.createElement('option');option.value=value;option.textContent=name;opponentSelect.append(option)
}
opponentSelect.addEventListener('change',()=>{});
socket();let authWait=null;function submitAuth(action){const username=$('username').value.trim(),password=$('password').value;if(!username||!password){$('authMsg').textContent='Kullanıcı adı ve şifre girin.';return}if(!ws||ws.readyState!==WebSocket.OPEN){$('authMsg').textContent='Sunucu bağlantısı henüz hazır değil. Birkaç saniye bekleyip tekrar deneyin.';socket();return}clearTimeout(authWait);$('authMsg').textContent='Giriş kontrol ediliyor...';send({type:'auth',action,username,password});authWait=setTimeout(()=>{$('authMsg').textContent='Sunucu giriş isteğine yanıt vermiyor. Render Logs bölümünü kontrol edin.'},12000)}$('login').onclick=()=>submitAuth('login');$('register').onclick=()=>submitAuth('register');$('logout').onclick=()=>{sessionStorage.removeItem('gameToken');location.href='/'};
function handle(m){
if(m.type==='authError'||m.type==='authenticated')clearTimeout(authWait);
if(m.type==='authError'){$('authMsg').textContent=m.message;return}
if(m.type==='authenticated'){authToken=m.token;authUser=m.username;admin=!!m.isAdmin;$('adminPanel').classList.toggle('hidden',!admin);if(admin)send({type:'adminStats'});sessionStorage.setItem('gameToken',authToken);$('who').textContent='👤 '+authUser;$('auth').classList.add('hidden');$('lobby').classList.remove('hidden');send({type:'listRooms'});return}
if(m.type==='adminStats'){$('adminStats').replaceChildren();let summary=document.createElement('p');summary.textContent='Aktif oda: '+m.activeRooms+' · Açık oda: '+m.openRooms+' · Bağlı kullanıcı: '+m.connectedUsers;$('adminStats').append(summary);m.rooms.forEach(r=>{let line=document.createElement('div');line.className='row';let label=document.createElement('span');label.textContent=r.code+' · '+r.mode+' · '+r.phase+' · '+r.players.join(', ');let close=document.createElement('button');close.className='alt';close.textContent='Odayı kapat';close.onclick=()=>{if(confirm(r.code+' odası kapatılsın mı?'))send({type:'adminCloseRoom',code:r.code})};line.append(label,close);$('adminStats').append(line)});return}
if(m.type==='leftRoom'){myId=null;phase='waiting';clearInterval(ticker);$('game').classList.add('hidden');$('lobby').classList.remove('hidden');history.replaceState(null,'',location.pathname);send({type:'listRooms'});if(m.message)alert(m.message);return}
if(m.type==='rooms'){let target=$('roomsList');target.replaceChildren();if(!m.rooms.length)target.textContent='Şu anda katılabileceğin açık oda yok.';else m.rooms.forEach(room=>{let line=document.createElement('div');line.className='row';let title=document.createElement('span');title.textContent=room.host+' · '+(modeNames[room.mode]||room.mode)+' · '+room.players+'/'+room.maxPlayers;let btn=document.createElement('button');btn.textContent='Katıl';btn.onclick=()=>send({type:'join',code:room.code});line.append(title,btn);target.append(line)});return}
if(m.type==='error'){alert(m.message);return}
if(m.type==='joined'){myId=m.id;$('lobby').classList.add('hidden');$('game').classList.remove('hidden');$('roomCode').textContent=m.code;history.replaceState(null,'','?room='+m.code)}

if(m.type==='state'){const key=m.code+'|'+m.mode+'|'+m.round+'|'+(m.mode==='tictactoe'?m.deadline:'');if(m.code!==attemptRoom){attemptRoom=m.code;clearAttempts();lastAttemptRound=''}if(key!==lastAttemptRound){lastAttemptRound=key;if(m.mode!=='tictactoe')clearAttempts()}if(Number.isFinite(m.serverTime))serverOffset=m.serverTime-Date.now();mode=m.mode;solo=m.solo;phase=m.phase;deadline=m.deadline;turn=m.turn;board=m.board||[];boardNames=m.boardNames||[];selection=m.selection||[];selectionDeadline=m.selectionDeadline;rows=m.rows||[];cols=m.cols||[];players=m.players;renderCustomHistory(m.history||[]);if(mode==='custom'&&phase==='setup'&&selectionDeadline!==previousCustomSelection){previousCustomSelection=selectionDeadline;$('customOwn').value='';$('teamHint').textContent='';hideSuggest()}const mine=players.findIndex(p=>p.id===myId);$('p1').textContent=players[0]?.name||'Oyuncu 1';$('p2').textContent=solo?'Tek kişilik':players[1]?.name||'Rakip bekleniyor';$('s1').textContent=players[0]?.score||0;$('s2').textContent=solo?'—':players[1]?.score||0;$('modeLabel').textContent=modeNames[mode]+(solo?' · Tek kişilik':' · İki kişilik');$('customPanel').classList.toggle('hidden',mode!=='custom'||phase!=='setup');if(mode==='custom'&&phase==='setup'){let slot=solo?0:mine;let chosen=selection[slot];$('customOwn').disabled=!!chosen;$('submitOwn').disabled=!!chosen;$('customStatus').textContent=chosen?'Seçtiğin takım: '+chosen+' · Diğer oyuncu bekleniyor.':'';}$('duelPanel').classList.toggle('hidden',!['classic','custom'].includes(mode)||(mode==='custom'&&phase==='setup'));$('gridPanel').classList.toggle('hidden',!['tictactoe'].includes(mode));$('quizPanel').classList.toggle('hidden',mode!=='quiz');if(mode==='quiz'){$('quizRound').textContent='Soru '+m.round+' · İlk 3 puan';$('quizQuestion').textContent=m.quiz?.question||'Rakip bekleniyor';$('quizOptions').replaceChildren();if(m.quiz){m.quiz.options.forEach((option,i)=>{let b=document.createElement('button');b.textContent=String.fromCharCode(65+i)+') '+option;b.className='alt';b.disabled=phase!=='playing'||quizLocked;b.onclick=()=>{if(quizLocked)return;quizLocked=true;send({type:'quizAnswer',index:i});b.disabled=true};$('quizOptions').append(b)})}if(phase==='playing'&&deadline!==window.lastQuizDeadline){window.lastQuizDeadline=deadline;quizLocked=false;$('quizOptions').querySelectorAll('button').forEach(b=>b.disabled=false);notice('Soruyu ilk doğru yanıtlayan puanı kazanır!')}}$('rematch').classList.toggle('hidden',phase!=='finished');if(['classic','custom'].includes(mode)){$('team1').textContent=m.teams?.[0]||'?';$('team2').textContent=m.teams?.[1]||'?';$('roundLabel').textContent=phase==='playing'?'Tur '+m.round+' · İlk doğru cevap 1 puan':phase==='result'?'Tur bitti':phase==='finished'?'Maç bitti':'Yeni takımlar seçiliyor';$('answer').disabled=phase!=='playing'||locked;$('send').disabled=phase!=='playing'||locked;if(phase==='playing'&&deadline!==window.lastDeadline){window.lastDeadline=deadline;locked=false;$('answer').value='';$('answer').disabled=false;$('send').disabled=false;hideSuggest();notice('Doğru futbolcuyu ilk yazan puan kazanır!')}}else if(['tictactoe'].includes(mode)){renderGrid(mine);$('turnBanner').textContent=phase==='playing'?(solo?'Sıra sende!':(players[turn]?.id===myId?'🟢 SIRA SENDE!':'🟣 SIRA RAKİBİNDE: '+(players[turn]?.name||''))):'Tur bekleniyor';$('turnBanner').classList.toggle('other',!solo&&players[turn]?.id!==myId);$('gridInfo').textContent=phase==='finished'?'Oyun tamamlandı.':phase==='waiting'?'Rakip bekleniyor.':solo?'Bir kutu seçip doğru futbolcuyu yaz.':('Sıra: '+(players[turn]?.name||'Oyuncu'));if(phase==='finished')$('gridForm').classList.add('hidden');if(phase==='playing'&&deadline!==window.lastGridDeadline){window.lastGridDeadline=deadline;$('gridForm').classList.add('hidden');selected=-1;notice(solo?'15 saniye içinde cevapla!':(players[turn]?.id===myId?'Sıra sende! 15 saniyen var.':'Sıra rakibinde!'))}}tick()}
if(m.type==='notice'){notice(m.message);if(mode==='tictactoe'&&m.message&&m.message.includes('kareyi aldı:')){const scorer=players.find(p=>m.message.startsWith(p.name+' kareyi aldı:'));if(scorer)goalFx(scorer.id)}}if(m.type==='quizResult'){if(m.reason&&m.reason.includes('doğru bildi')){const scorer=players.find(p=>m.reason.startsWith(p.name+' doğru bildi'));if(scorer)goalFx(scorer.id)}quizLocked=true;notice(m.reason+' Doğru cevap: '+m.correct)}if(m.type==='selectionPenalty'){notice(m.message);showMatchFx(m.level===2?'wrong':'warning',m.level===2?'SÜRE DOLDU · +1 PUAN CEZASI':'UYARI · TAKIM SEÇME SÜRESİ DOLDU')}if(m.type==='opponentAttempt'){addAttempt(m);if(!m.correct&&m.playerId===myId)showMatchFx('wrong','YANLIŞ CEVAP!')}if(m.type==='attempt'){locked=true;$('answer').disabled=true;$('send').disabled=true;if(!m.correct)notice('Yanlış cevap, bu turda hakkın bitti.')}if(m.type==='roundResult'){if(m.winnerId)goalFx(m.winnerId);locked=true;$('answer').disabled=true;$('send').disabled=true;hideSuggest();notice(m.reason+' · Örnek cevaplar: '+m.answers.join(', '))}if(m.type==='suggestion'){$('suggestionText').textContent='Bunu mu demek istediniz? '+m.name;$('suggestion').classList.remove('hidden')}if(m.type==='suggestionDismissed'){hideSuggest();locked=false;$('answer').disabled=false;$('send').disabled=false}if(m.type==='gameOver'&&mode==='tictactoe'&&m.winnerId){}if(m.type==='gameOver')notice(m.winnerId===myId?'🏆 Kazandın! '+(m.reason||''):'Oyun tamamlandı. '+(m.reason||''));if(m.type==='teamSelectionResult'){let r=m.result;if(r.kind==='correct'){$('customOwn').value=r.name;$('teamHint').textContent='Takımın kaydedildi: '+r.name}else if(r.kind==='suggest'){const hint=$('teamHint');hint.replaceChildren();const label=document.createElement('span');label.textContent='Bunu mu demek istedin? ';const btn=document.createElement('button');btn.type='button';btn.className='alt';btn.textContent='✓ '+r.name;btn.style.cssText='margin:6px;padding:8px 12px';btn.onclick=()=>{hint.textContent='Takım doğrulanıyor...';send({type:'selectTeam',name:r.name})};hint.append(label,btn)}else if(r.kind==='ambiguous'){$('teamHint').textContent='Belirsiz takım adı: '+r.options.join(', ')}else $('teamHint').textContent='Takım bulunamadı. Tekrar dene.'}
}
function renderGrid(mine){$('gridTitle').textContent=modeNames[mode];let el=$('board');el.replaceChildren();const add=(tag,text,cls,click,ownerName)=>{let n=document.createElement(tag);n.className=cls;n.textContent=text;if(click)n.onclick=click;el.append(n)};add('div','','head');cols.forEach(c=>add('div',c,'head'));rows.forEach((r,i)=>{add('div',r,'head');cols.forEach((c,j)=>{let k=i*3+j,owner=board[k],mineOwner=owner===myId,ownerName='';add('button',owner?(boardNames[k]||'Oyuncu'):'+', 'cell '+(owner?(mineOwner?'mine':'theirs'):'')+(selected===k?' chosen':''),()=>{if(phase!=='playing'||owner||(!solo&&players[turn]?.id!==myId))return;selected=k;$('gridPrompt').textContent=r+' + '+c;$('gridForm').classList.remove('hidden');$('gridAnswer').value='';$('gridAnswer').focus()},ownerName)})})}
let serverOffset=0;function tick(){clearInterval(ticker);let update=()=>{const now=Date.now()+serverOffset;const playing=phase==='playing'&&Number.isFinite(deadline);const n=playing?Math.max(0,Math.ceil((deadline-now)/1000)):null;const value=n===null?'—':String(n);$('timer').textContent=value;$('quizClock').textContent=value;$('gridClock').textContent=value;const setup=phase==='setup'&&Number.isFinite(selectionDeadline);$('selectionClock').textContent=setup?String(Math.max(0,Math.ceil((selectionDeadline-now)/1000))):'—';$('timer').classList.toggle('low',n!==null&&n<=5)};update();ticker=setInterval(update,200)}
$('adminRefresh').onclick=()=>send({type:'adminStats'});$('backLobby').onclick=()=>{if(confirm('Odadan ayrılıp oda listesine dönmek istiyor musun?'))send({type:'leaveRoom'})};$('refreshRooms').onclick=()=>send({type:'listRooms'});$('create').onclick=()=>connect('create');$('join').onclick=()=>connect('join');$('copy').onclick=async()=>{let link=location.origin+'/?room='+$('roomCode').textContent;try{await navigator.clipboard.writeText(link);notice('Davet bağlantısı kopyalandı!')}catch{prompt('Bu linki kopyala:',link)}};
$('answerForm').onsubmit=e=>{e.preventDefault();let a=$('answer').value.trim();if(a&&!locked){locked=true;$('send').disabled=true;send({type:'answer',answer:a})}};$('gridForm').onsubmit=e=>{e.preventDefault();let a=$('gridAnswer').value.trim();if(a&&selected>=0){send({type:'gridAnswer',idx:selected,answer:a});$('gridForm').classList.add('hidden');selected=-1}};
document.addEventListener('keydown',e=>{
 if(e.key!=='Enter'||e.isComposing||e.repeat||e.defaultPrevented||e.ctrlKey||e.altKey||e.metaKey)return;
 const active=document.activeElement;
 if(active?.tagName==='TEXTAREA'||active?.tagName==='SELECT')return;
 if(active?.tagName==='BUTTON'){e.preventDefault();active.click();return}
 if(!$('auth').classList.contains('hidden')){
   if(active?.id==='username'||active?.id==='password'){e.preventDefault();$('login').click()}return
 }
 if(!$('lobby').classList.contains('hidden')){
   if(active?.id==='codeInput'){e.preventDefault();$('join').click()}
   else if(active?.tagName!=='INPUT'){e.preventDefault();$('create').click()}
   return
 }
 if($('game').classList.contains('hidden'))return;
 if(mode==='custom'&&phase==='setup'){
   if(active?.id==='customOwn'||active?.id==='customHistory'||active===document.body){e.preventDefault();const suggested=$('teamHint').querySelector('button');if(suggested)suggested.click();else $('submitOwn').click()}return
 }
 if(phase==='finished'){e.preventDefault();$('rematch').click();return}
 if(phase!=='playing')return;
 if(mode==='quiz'){
   const options=[...$('quizOptions').querySelectorAll('button:not(:disabled)')];
   if(options.length===1){e.preventDefault();options[0].click()}return
 }
 if(mode==='tictactoe'&&!$('gridForm').classList.contains('hidden')){
   e.preventDefault();$('gridForm').requestSubmit();return
 }
 if((mode==='classic'||mode==='custom')&&!locked){
   e.preventDefault();$('answerForm').requestSubmit()
 }
});
$('submitOwn').onclick=()=>{let value=$('customOwn').value.trim();if(value)send({type:'selectTeam',name:value})};$('yes').onclick=()=>{hideSuggest();send({type:'confirmSuggestion',accept:true})};$('no').onclick=()=>{hideSuggest();send({type:'confirmSuggestion',accept:false})};$('rematch').onclick=()=>{send({type:'rematch'});notice('Yeni maç hazırlanıyor...')};
