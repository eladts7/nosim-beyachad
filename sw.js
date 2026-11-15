// Network first: always fresh when online, last copy when offline.
const C='nb-v2';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(['/','/app.js','/manifest.webmanifest','/icon-192.png'])).catch(()=>{}));});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/'))return;
  e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));}return res;})
    .catch(()=>caches.match(r).then(m=>m||caches.match('/'))));});
self.addEventListener('push',e=>{let d={};try{d=e.data.json();}catch(x){d={body:e.data&&e.data.text()};}
  e.waitUntil(self.registration.showNotification(d.title||'נוסעים ביחד',{body:d.body||'',icon:'/icon-192.png',badge:'/icon-192.png',dir:'rtl',lang:'he',data:{url:d.url||'/'},tag:d.tag}));});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=new URL(e.notification.data.url||'/',location.origin).href;
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{for(const w of ws){if(w.url.startsWith(location.origin)){w.focus();return w.navigate(url);}}return clients.openWindow(url);}));});
