/* JW Study — Service Worker (Obsługa trybu offline) */
const CACHE_PREFIX = 'jwstudy-' + encodeURIComponent(self.registration.scope) + '-';
const CACHE = CACHE_PREFIX + 'v562';

const CORE = [
  './index.html',
  './jesus-plan-data.js',
  './search-worker.js',
  './manifest.webmanifest',
  './onenote.html',
  './icon-192.png',
  './icon-512.png',
  './icon-1024.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  './icon.svg',
  './lib/jszip.min.js',
  './lib/sql-wasm.js',
  './lib/sql-wasm.wasm',
  './lib/smart-import/mammoth.browser.min.js',
  './lib/smart-import/pdf.min.js',
  './lib/smart-import/pdf.worker.min.js',
  './lib/smart-import/tesseract.min.js',
  './lib/smart-import/tesseract.worker.min.js',
  './lib/smart-import/tesseract-core-lstm.wasm.js',
  './lib/smart-import/lang/pol.traineddata.gz'
];

function pobierzSwieze(req){
  return fetch(new Request(req, {cache:'no-store'}));
}

self.addEventListener('message', e=>{
  if(e.data === 'SKIP_WAITING' || e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('install', e=>{
  // Usunięto bezwarunkowe self.skipWaiting() — nowa wersja czeka na zatwierdzenie przez użytkownika w pasku #nowaWersja
  e.waitUntil(caches.open(CACHE).then(async c=>{
    // Główny dokument index.html
    try{
      const glownaRes = await pobierzSwieze('./index.html');
      if(glownaRes && glownaRes.ok){
        await c.put('./index.html', glownaRes.clone());
        try{ await c.put('./', glownaRes.clone()); }catch(_){}
      }
    }catch(err){
      console.warn("Błąd pobierania index.html do cache:", err);
    }

    // Wszystkie pozostałe pliki pobieramy z allSettled — brak pojedynczego pliku nie psuje instalacji
    const pliki = CORE.filter(a=>a!=='./index.html');
    await Promise.allSettled(pliki.map(async a=>{
      try{
        const res = await pobierzSwieze(a);
        if(res && res.ok){
          await c.put(a, res.clone());
        }
      }catch(_){}
    }));
  }));
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX) && k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  const req = e.request, url = new URL(req.url), scope = new URL(self.registration.scope);
  if(req.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  // 1. Dokumenty HTML — najpierw sieć (Network First), a w razie braku sieci natychmiast cache
  if(req.mode === 'navigate' || req.destination === 'document'){
    const index = new URL('./index.html', scope).href;
    const glowna = url.pathname === scope.pathname || url.pathname === new URL(index).pathname;
    const key = glowna ? index : url.origin + url.pathname;

    const net = pobierzSwieze(req).then(async res=>{
      if(res && res.ok){
        const copy = res.clone();
        try{ const c = await caches.open(CACHE); await c.put(key, copy); }catch(_){}
      }
      return res;
    });

    e.waitUntil(net.then(()=>{}, ()=>{}));

    e.respondWith(new Promise(resolve=>{
      let done = false;
      const fallback = async ()=>{
        const cached = await (await caches.open(CACHE)).match(key);
        if(cached) return cached;
        const mainCached = await (await caches.open(CACHE)).match(index);
        if(mainCached) return mainCached;
        return new Response('JW Study jest gotowe do pracy offline. Wróć na stronę główną.',
          {status: 200, headers: {'Content-Type': 'text/html; charset=utf-8'}});
      };
      const timer = setTimeout(()=>{ if(!done){ done=true; resolve(fallback()); } }, 2500);
      net.then(res=>{
        clearTimeout(timer);
        if(!done){ done=true; resolve(res); }
      }, ()=>{
        clearTimeout(timer);
        if(!done){ done=true; resolve(fallback()); }
      });
    }));
    return;
  }

  // 2. Pliki dynamiczne (search-worker.js, manifest.webmanifest) — Stale-While-Revalidate z odpytywaniem sieci
  const isDynamicNetworkFile = url.pathname.endsWith('/search-worker.js') || 
                               url.pathname.endsWith('/manifest.webmanifest');

  if(isDynamicNetworkFile){
    const cachePromise = caches.open(CACHE);
    const netPromise = pobierzSwieze(req).then(async res=>{
      if(res && res.ok && res.type === 'basic'){
        const copy = res.clone();
        try{ const c = await cachePromise; await c.put(req, copy); }catch(_){}
      }
      return res;
    });

    e.waitUntil(netPromise.then(()=>{}, ()=>{}));

    e.respondWith(cachePromise.then(async c=>{
      const cached = await c.match(req);
      return cached || netPromise.catch(()=>Response.error());
    }));
    return;
  }

  // 3. Ścisłe Cache First: zasoby statyczne (katalog ./lib/ np. sql-wasm.wasm, sql-wasm.js, jszip.min.js oraz ikony i grafiki)
  // Jeśli plik znajduje się w bieżącym CACHE, zwracamy go natychmiast bez odpytywania sieci w tle.
  e.respondWith((async ()=>{
    const c = await caches.open(CACHE);
    let cached = await c.match(req);
    if(!cached){
      cached = await c.match(url.pathname);
    }
    if(!cached){
      const rel = url.pathname.slice(scope.pathname.length).replace(/^\.\//, '');
      if(rel) cached = await c.match('./' + rel);
    }
    if(cached) return cached;

    // Brak w cache — pobierz z sieci (cache miss) i zachowaj na przyszłość
    try{
      const res = await pobierzSwieze(req);
      if(res && res.ok && res.type === 'basic'){
        c.put(req, res.clone());
      }
      return res;
    }catch(_){
      return Response.error();
    }
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const notifData = e.notification ? e.notification.data : null;

  e.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    let targetClient = null;

    for (const client of clientList) {
      if (client.url && 'focus' in client) {
        try {
          targetClient = await client.focus();
          break;
        } catch (_) {}
      }
    }

    if (targetClient) {
      if (notifData) {
        try {
          targetClient.postMessage({ type: 'NOTIFICATION_ACTION', data: notifData });
          targetClient.postMessage({ type: 'JW_NOTIF_CLICK', data: notifData });
        } catch (_) {}
      }
      return targetClient;
    }

    if (self.clients.openWindow) {
      let openUrl = './index.html';
      if (notifData) {
        try {
          openUrl = './index.html#notif=' + encodeURIComponent(JSON.stringify(notifData));
        } catch (_) {}
      }
      const newClient = await self.clients.openWindow(openUrl);
      if (newClient && notifData) {
        setTimeout(() => {
          try {
            newClient.postMessage({ type: 'NOTIFICATION_ACTION', data: notifData });
            newClient.postMessage({ type: 'JW_NOTIF_CLICK', data: notifData });
          } catch (_) {}
        }, 1200);
      }
      return newClient;
    }
  })());
});
