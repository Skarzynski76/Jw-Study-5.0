/* Osobny cache dla każdej instalacji (np. dwóch projektów GitHub Pages).
   Starszych, wspólnych cache nie usuwamy: mogą należeć do innej instalacji. */
const CACHE_PREFIX = 'jwstudy-' + encodeURIComponent(self.registration.scope) + '-';
const CACHE = CACHE_PREFIX + 'v358-modern';
/* Instalacja jest uznawana za gotową dopiero po zapisaniu wszystkich plików,
   których potrzebują podstawowe funkcje. Dzięki temu komunikat „gotowa offline”
   nie pojawi się po częściowym pobraniu na niestabilnym łączu. */
const CORE = [
  './index.html', './search-worker.js',
  './lib/jszip.min.js', './lib/sql-wasm.js', './lib/sql-wasm.wasm',
  './lib/supabase.js',
  './manifest.webmanifest', './onenote.html',
  './icon-192.png', './icon-512.png', './icon-1024.png',
  './icon-maskable-512.png', './apple-touch-icon.png', './favicon-32.png'
];
/* Drugie kopie bibliotek są zapasowe. Ich brak nie blokuje instalacji,
   ponieważ komplet w katalogu lib/ jest obowiązkowy i sprawdzany powyżej. */
const EXTRA = ['./jszip.min.js', './sql-wasm.js', './sql-wasm.wasm', './supabase.js', './icon.svg'];
function pobierzSwieze(req){
  return fetch(new Request(req, {cache:'no-store'}));
}
async function zapiszOdpowiedz(cache, key, res){
  if(!res || !res.ok) throw new Error('Nie można pobrać pliku do pracy offline.');
  await cache.put(key, res.clone());
  return res;
}
self.addEventListener('message', e=>{
  if(e.data==='SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(async c=>{
    const glownaRes = await zapiszOdpowiedz(c, './index.html', await pobierzSwieze('./index.html'));
    try{ await c.put('./', glownaRes.clone()); }catch(_){}
    await Promise.all(CORE.filter(a=>a!=='./index.html').map(async a=>zapiszOdpowiedz(c,a,await pobierzSwieze(a))));
    await Promise.allSettled(EXTRA.map(async a=>zapiszOdpowiedz(c,a,await pobierzSwieze(a))));
  }));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e=>{
  const req=e.request, url=new URL(req.url), scope=new URL(self.registration.scope);
  if(req.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname)) return;
  if(req.mode==='navigate'||req.destination==='document'){
    /* Tylko strona główna używa klucza index.html. OneNote ma własną kopię. */
    const index=new URL('./index.html',scope).href;
    const glowna=url.pathname===scope.pathname||url.pathname===new URL(index).pathname;
    const key=glowna?index:url.origin+url.pathname;
    const net=pobierzSwieze(req).then(async res=>{
      if(!res||!res.ok) throw new Error('zła odpowiedź');
      const copy=res.clone();
      try{await (await caches.open(CACHE)).put(key,copy);}catch(_){}
      return res;
    });
    e.waitUntil(net.then(()=>{},()=>{}));
    e.respondWith(new Promise(resolve=>{
      let done=false;
      const fallback=async()=>{
        const cached=await (await caches.open(CACHE)).match(key);
        return cached||new Response('Ta strona nie jest dostępna offline. Połącz się z internetem i otwórz ją ponownie.',
          {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
      };
      const timer=setTimeout(()=>{if(!done){done=true;resolve(fallback());}},3500);
      net.then(res=>{clearTimeout(timer);if(!done){done=true;resolve(res);}},()=>{
        clearTimeout(timer);if(!done){done=true;resolve(fallback());}
      });
    }));
    return;
  }
  const cache=caches.open(CACHE);
  const net=pobierzSwieze(req).then(async res=>{
    if(res&&res.ok&&res.type==='basic'){
      const copy=res.clone();try{await (await cache).put(req,copy);}catch(_){}
    }
    return res;
  });
  e.waitUntil(net.then(()=>{},()=>{}));
  e.respondWith(cache.then(async c=>{
    const cached=await c.match(req);
    return cached||net.catch(()=>Response.error());
  }));
});
