const CACHE='321-futbol-mobile-v23';
const ASSETS=['/','/app.js?v=23','/v20.css?v=20','/mobile-v23.css?v=23','/icon.svg','/manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('321-futbol-mobile-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).then(response=>{
   if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('/',copy)).catch(()=>{});}
   return response;
  }).catch(()=>caches.match('/')));
  return;
 }
 event.respondWith(fetch(request).then(response=>{
  if(response.ok&&['/app.js','/v20.css','/mobile-v23.css','/icon.svg','/manifest.webmanifest'].includes(url.pathname)){
   const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
  }
  return response;
 }).catch(()=>caches.match(request)));
});
