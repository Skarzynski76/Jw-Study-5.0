/* JW Study — Service Worker (Obsługa trybu offline) */
const CACHE_PREFIX = 'jwstudy-' + encodeURIComponent(self.registration.scope) + '-';
const CACHE = CACHE_PREFIX + 'v500';

const CORE = [
  './index.html',
  './search-worker.js',
  './manifest.webmanifest',
  './onenote.html',
  './css/app.css',
  './js/core.js',
  './js/storage.js',
  './js/boot.js',
  './js/filters.js',
  './js/publications.js',
  './js/tags.js',
  './js/appearance.js',
  './js/books.js',
  './js/notes.js',
  './js/reader.js',
  './js/theme.js',
  './js/actions.js',
  './js/editor.js',
  './js/images.js',
  './js/highlight.js',
  './js/newnote.js',
  './js/files.js',
  './js/export-jwl.js',
  './js/export-doc.js',
  './js/backup.js',
  './js/ui-helpers.js',
  './js/search.js',
  './js/context-menu.js',
  './js/settings.js',
  './js/pubtabs.js',
  './js/keyboard.js',
  './js/sekcje-zakladki.js',
  './js/porzadki.js',
  './js/przenoszenie.js',
  './js/bulk-actions.js',
  './js/udostepnianie.js',
  './js/chwytanie.js',
  './js/wszystkie.js',
  './js/miejsce.js',
  './js/diagnostyka.js',
  './js/wysokosc.js',
  './js/tablica.js',
  './js/wydobycie.js',
  './js/oszczedny.js',
  './js/rysik.js',
  './js/szablony.js',
  './js/powiazane.js',
  './js/zamykanie.js',
  './js/roznice.js',
  './js/przypomnienie.js',
  './js/powtorki.js',
  './js/podmenu.js',
  './js/kolumny-klawiatura.js',
  './js/historia.js',
  './js/centrum.js',
  './js/sync.js',
  './js/wzmianki.js',
  './js/przypisy.js',
  './js/mapa.js',
  './js/shortcuts.js',
  './js/search-rules.js',
  './js/granular-sync.js',
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
  './lib/supabase.js',
  './lib/smart-import/pdf.min.js',
  './lib/smart-import/pdf.worker.min.js',
  './lib/smart-import/mammoth.browser.min.js',
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
  self.skipWaiting();
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

  // Dokumenty HTML — najpierw sieć, a w razie braku sieci natychmiast cache
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

  // Pozostałe zasoby (skrypty, ikony, wasm) — cache lub sieć
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
});
