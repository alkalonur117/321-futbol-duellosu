/* Turkish / English UI language switch. No external translation service. */
(() => {
  const dict={"SAHAYA HOŞ GELDİN":"WELCOME TO THE PITCH","KULLANICI ADI":"USERNAME","ŞİFRE":"PASSWORD","SAHAYA GİR":"SIGN IN","HESAP OLUŞTUR":"CREATE ACCOUNT","Çıkış Yap":"Log out","SAHANI SEÇ.":"CHOOSE YOUR GAME.","RAKİBİNİ BELİRLE":"CHOOSE YOUR OPPONENT","Arkadaşla Oyna · 1V1":"Play with a friend · 1V1","Tek Kişilik · Antrenman":"Solo · Practice","⚽ MAÇA BAŞLA / ODA OLUŞTUR":"⚽ START MATCH / CREATE ROOM","AÇIK ODALAR":"OPEN ROOMS","↻ Odaları Yenile":"↻ Refresh rooms","ARKADAŞINA KATIL":"JOIN YOUR FRIEND","ODA KODUNU GİR":"ENTER ROOM CODE","KODLA ODAYA KATIL":"JOIN WITH CODE","← ODA LİSTESİNE DÖN":"← BACK TO ROOMS","KOPYALA":"COPY","🔗 DAVET LİNKİNİ KOPYALA":"🔗 COPY INVITE LINK","TAKIMINI SEÇ":"CHOOSE YOUR TEAM","TAKIMIMI ONAYLA":"CONFIRM MY TEAM","CEVABI GÖNDER →":"SUBMIT ANSWER →","Soru bekleniyor...":"Waiting for question...","FUTBOL BULMACASI":"FOOTBALL GRID","BU KAREYİ AL →":"CLAIM THIS SQUARE →","EVET":"YES","HAYIR":"NO","↻ YENİ MAÇ / RÖVANŞ":"↻ NEW MATCH / REMATCH","MAÇ BİLDİRİMİ":"MATCH NOTICE","Sahadan çıkıyor musun?":"Leave the match?","MAÇA DEVAM ET":"CONTINUE MATCH","ODADAN AYRIL":"LEAVE ROOM","Rakip bekleniyor...":"Waiting for opponent...","SEÇİM SÜRESİ":"SELECTION TIME","KALAN SÜRE":"TIME LEFT","CEVAP SÜRESİ":"ANSWER TIME","HAMLE SÜRESİ":"MOVE TIME","Klasik 3-2-1":"Classic 3-2-1","Takımları Sen Seç":"Choose Your Teams","Futbol Bilgi Yarışması":"Football Quiz","Oda kodunu kopyala":"Copy room code","Takımını seçmek için 20 saniyen var.":"You have 20 seconds to choose your team."};
  const reverse=Object.fromEntries(Object.entries(dict).map(([tr,en])=>[en,tr]));
  const prefKey='footballUiLanguage';
  let lang=localStorage.getItem(prefKey)==='en'?'en':'tr';
  const staticNodes=new WeakMap();
  const excluded='SCRIPT,STYLE,TEXTAREA,INPUT,OPTION[disabled]';
  function translate(root=document){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      if(node.parentElement?.closest(excluded))continue;
      const value=node.nodeValue,trim=value.trim();if(!trim)continue;
      const original=staticNodes.get(node)||reverse[trim]||trim;
      if(!dict[original])continue;
      staticNodes.set(node,original);
      const next=lang==='en'?dict[original]:original;
      if(trim!==next)node.nodeValue=value.replace(trim,next);
    }
    for(const element of document.querySelectorAll('[placeholder],[aria-label]')){
      for(const attr of ['placeholder','aria-label']){
        const current=element.getAttribute(attr);if(!current)continue;
        const original=reverse[current]||current;
        if(dict[original])element.setAttribute(attr,lang==='en'?dict[original]:original);
      }
    }
    document.documentElement.lang=lang;
    const button=document.getElementById('languageSwitch');
    if(button){button.textContent=lang==='en'?'🌐 English ▾':'🌐 Türkçe ▾';button.setAttribute('aria-label',lang==='en'?'Switch to Turkish':'İngilizceye geç');}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const btn=document.createElement('button');
    btn.type='button';btn.id='languageSwitch';btn.className='alt';btn.style.cssText='position:fixed;top:10px;right:10px;z-index:60;padding:7px 11px;font-size:12px;border-radius:999px;max-width:150px;box-shadow:0 3px 12px #0008';
    btn.addEventListener('click',()=>{lang=lang==='tr'?'en':'tr';localStorage.setItem(prefKey,lang);translate();});
    document.body.appendChild(btn);translate();
    let scheduled=false;
    const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;translate();});});
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  });
})();