/* ==========================================================================
   JW Study — boot.js
   Start aplikacji: wczytanie danych i pierwsze renderowanie
   ========================================================================== */
"use strict";
/* ================= START ================= */
async function decodeEmbedded(){
  const b64 = $("APPDATA").textContent.trim();
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  const txt = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
  let dane;
  try{ dane = JSON.parse(txt); }
  catch(e){ throw new Error("Wbudowane dane są uszkodzone (błąd formatu JSON)"); }
  return dane;
}
/**
 * Uruchomienie aplikacji. Kolejność ma znaczenie:
 *  1. otwarcie IndexedDB,
 *  2. wczytanie tego, co zapisane w przeglądarce (zmiany użytkownika mają pierwszeństwo),
 *  3. rozpakowanie wbudowanej paczki i scalenie — uzupełnia braki po nieudanym zapisie,
 *  4. odtworzenie ustawień (filtry, sekcje, kosz),
 *  5. pierwsze renderowanie i rejestracja Service Workera.
 * Żaden błąd na etapie 3 nie przerywa startu — aplikacja ma ruszyć nawet pusta.
 * @returns {Promise<void>}
 */
async function boot(){
  try{
    idb = await idbOpen();
    idb.onversionchange=()=>{idb.close();idb=null;pokazBrakPamieci();};
    idb.onclose=()=>{idb=null;pokazBrakPamieci();};
    if(navigator.storage && navigator.storage.persist){
      navigator.storage.persist().then(trwaly=>{
        if(trwaly) console.info("Pamięć trwała IndexedDB aktywna.");
      }).catch(()=>{});
    }
  }catch(e){ console.warn("IndexedDB niedostępne", e); pokazBrakPamieci(); }
  // 1. wczytaj to, co zapisane w przeglądarce (Twoje zmiany mają pierwszeństwo)
  let stored = [], storedTags = [];
  if(idb){
    try{ stored = await idbAll("notes") || []; storedTags = await idbAll("tags") || []; }catch(e){}
  }

  if(stored.length){
    // BŁYSKAWICZNY START: Jeśli dane są w pamięci urządzenia, wczytujemy je natychmiast bez ciężkiego rozpakowywania!
    notes = sanitizeNotes(stored, "pamięć przeglądarki");
    tags = sanitizeTags(storedTags, "pamięć przeglądarki");
  } else {
    // Pierwsze uruchomienie lub pusta baza — rozpakowujemy dane wbudowane tylko gdy są potrzebne
    $("loadMsg").textContent = "Pierwsze uruchomienie — rozpakowywanie notatek…";
    let emb = null;
    try{ emb = await decodeEmbedded(); }catch(e){ console.warn("Nie można rozpakować danych wbudowanych", e); }
    if(emb && (!Array.isArray(emb.notes) || !Array.isArray(emb.tags))){
      console.warn("Dane wbudowane mają nieoczekiwaną budowę — pomijam je");
      emb = null;
    }
    if(!emb){
      notes = []; tags = [];
      console.warn("Start bez danych wbudowanych — pusta aplikacja");
      setTimeout(()=>toast("Zaczynasz z pustą listą — możesz wczytać kopię przez ⚙️ Plik"), 800);
    } else {
      notes = sanitizeNotes(emb.notes, "dane wbudowane");
      tags = sanitizeTags(emb.tags, "dane wbudowane");
      if(idb){
        try{
          await idbBulkChunked("tags", tags);
          await idbBulkChunked("notes", notes);
          await idbPut("meta", 2, "dataV");
          const cnt = await idbCount("notes");
          if(cnt !== notes.length) console.warn("Zapisano tylko", cnt, "z", notes.length);
        }catch(e){ console.warn(e); }
      }
    }
  }
  sortTags();
  const sf = lsGet(KP+"Filt", null);
  if(sf){ try{ Object.assign(filt, JSON.parse(sf)); }catch(e){ console.warn("Nieczytelne zapamiętane filtry — pomijam", e); } }
  /* Migracja ze starszych wersji: publikacja była zapisana w polu księgi.
     Od 3.49 oba filtry są niezależne, więc wybór publikacji nie kasuje Biblii. */
  if(typeof filt.book==="string" && /^(pub|ptb):/.test(filt.book)){
    filt.pub=filt.book; filt.book="all"; filt.ch=null;
  }
  if(!filt.pub) filt.pub="all";
  if(typeof filt.book==="number" && filt.book>0) expandedBook = filt.book;
  if(idb){ try{ deletedTagNames = (await idbGet("meta","deletedTags")) || []; }catch(e){} }
  if(idb){ try{ deletedGuids = (await idbGet("meta","deletedGuids")) || []; }catch(e){} }
  if(idb){ try{ sections = (await idbGet("meta","sections")) || []; }catch(e){ sections=[]; } }
  if(typeof autoTematyWczytaj==="function") await autoTematyWczytaj();
  if(typeof loadPubTabs==="function") await loadPubTabs();
  if(typeof loadSecTabs==="function") await loadSecTabs();
  if(typeof loadSzablony==="function") await loadSzablony();
  purgeOldTrash();   // usuń trwale notatki, które są w koszu ponad 30 dni
  buildStatic();
  initViewBar();
  renderAll();
  // Przy stylu paska `default` iPadOS sam rezerwuje miejsce na pasek stanu.
  // Nie dokładamy stałych pikseli: na iPadOS 27 tworzyły drugi, pusty pas.
  if(isIOS() && navigator.standalone){
    document.body.classList.add("ios-standalone");
    document.documentElement.classList.add("ios-standalone");
    const ipadOS = /iPad/.test(navigator.userAgent) ||
      (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
    if(ipadOS) {
      document.body.classList.add("ipad-standalone");
      document.documentElement.classList.add("ipad-standalone");
    }
  }
  $("loading").style.display = "none";
  updateBackupBadge();
  /* Pierwsze wciśnięcie klawisza w polu szukania buduje pamięć podręczną tekstu
     dla WSZYSTKICH notatek — przy ośmiu tysiącach to trzy czwarte sekundy
     zamrożonego okna. Robimy tę pracę teraz, w przerwach między klatkami, gdy
     użytkownik dopiero patrzy na świeżo narysowaną listę. */
  if(!(typeof uruchomIndeksWorkerSzukania==="function" && uruchomIndeksWorkerSzukania()) && typeof rozgrzejCacheSzukania === "function")
    setTimeout(rozgrzejCacheSzukania, 60);
  /* Zamiast znikającego dymka z instrukcją szukania przycisku — pasek, który
     zostaje i sam robi kopię. Z opóźnieniem, żeby nie wyskakiwał w tej samej
     chwili, w której pojawiają się notatki. */
  if(typeof sprawdzKopie==="function") setTimeout(sprawdzKopie, 1500);
  /* Znacznik „widziano" stawiamy dopiero po ZAMKNIĘCIU okna, nie po otwarciu.
     Gdyby cokolwiek przerwało pierwsze uruchomienie, powitanie pokaże się ponownie
     zamiast przepaść bez śladu. */
  if(!lsGet(KP+"Onboarded", null)) setTimeout(()=>{
    openModal("modalHelp");
    const okno = $("modalHelp");
    const obserwuj = new MutationObserver(()=>{
      if(!okno.classList.contains("show")){
        lsSet(KP+"Onboarded","1");
        obserwuj.disconnect();
      }
    });
    obserwuj.observe(okno, {attributes:true, attributeFilter:["class"]});
  }, 400);
  // tryb offline: zapamiętaj aplikację w pamięci podręcznej urządzenia
  if(location.protocol.indexOf("http")===0 && "serviceWorker" in navigator) zarejestrujSW();
  /* Uzgadnianie z drugim urządzeniem — dopiero po pierwszym renderowaniu, żeby
     czytanie pliku z chmury nie opóźniało pojawienia się notatek na ekranie. */
  if(typeof syncStart==="function") syncStart();
}

/**
 * Rejestracja obsługi offline wraz z wykrywaniem nowej wersji.
 *
 * updateViaCache:"none" jest tu najważniejsze: bez tego przeglądarka podaje
 * plik sw.js ze swojej pamięci podręcznej i po wgraniu nowej wersji na serwer
 * aplikacja potrafi tygodniami pokazywać starą.
 */
function zarejestrujSW(){
  /* Bez sieci rejestracja nie ma prawa się udać: przeglądarka musi pobrać sw.js
     z serwera. Próba i tak kończy się błędem „Script … load failed", który
     trafia do okna jako zwykły błąd strony — a to nie jest usterka aplikacji,
     tylko brak połączenia. Nie próbujemy więc na pusto, tylko czekamy na sieć. */
  if(navigator.onLine === false){
    addEventListener("online", ()=>zarejestrujSW(), {once:true});
    return;
  }
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(rej=>{
    const oznaczOffline = ()=>{
      lsSet(KP+"OfflineOK","1");
      const stW = document.getElementById("stWersja");
      if(stW) stW.textContent = "Wersja v" + APP_VERSION + " · zapisana do pracy offline";
    };
    if(rej.active) oznaczOffline();
    rej.addEventListener("updatefound", ()=>{
      const ins = rej.installing;
      if(ins) ins.addEventListener("statechange", ()=>{ if(ins.state==="activated"||ins.state==="installed") oznaczOffline(); });
    });
    navigator.serviceWorker.ready.then(()=>{
      oznaczOffline();
      if(!lsGet(KP+"OfflineNotif", null)){
        lsSet(KP+"OfflineNotif","1");
        setTimeout(()=>toast("✓ Aplikacja gotowa do pracy offline"), 2000);
      }
    });
    // sprawdzaj nową wersję przy starcie i po każdym powrocie do aplikacji
    /* Sprawdzanie nowej wersji też wymaga sieci — offline kończyłoby się tym
       samym błędem, tyle że po każdym powrocie do aplikacji. */
    const sprawdz = async ()=>{ if(navigator.onLine === false || !navigator.serviceWorker) return; try{ const reg = await navigator.serviceWorker.getRegistration(); if(reg && typeof reg.update === "function") await reg.update().catch(()=>{}); }catch(e){} };
    setTimeout(sprawdz, 1200);
    document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) sprawdz(); });
    /* Po wybraniu „Później” nowy pracownik już czeka. Przy kolejnym otwarciu
       updatefound nie musi wystąpić, więc pokazujemy także wersję waiting. */
    if(rej.waiting && navigator.serviceWorker.controller) pokazNowaWersje(rej.waiting);
    rej.addEventListener("updatefound", ()=>{
      const nowy = rej.installing;
      if(!nowy) return;
      nowy.addEventListener("statechange", ()=>{
        // „installed" przy działającym starym pracowniku = jest nowsza wersja
        if(nowy.state==="installed" && navigator.serviceWorker.controller) pokazNowaWersje(nowy);
      });
    });
  }).catch(err=>{
    /* Cicho, ale nie bez śladu: wpis trafia do dziennika, żeby przy zgłoszeniu
       było widać, że obsługa offline się nie zarejestrowała. */
    if(typeof slad==="function") slad("obsługa offline nieaktywna: " + (err && err.message || err));
    addEventListener("online", ()=>zarejestrujSW(), {once:true});
  });
  /* Gdy NOWA wersja zastępuje starą, przeładowujemy raz — inaczej w bieżącej
     sesji zostałyby stare pliki CSS i JS wczytane przed podmianą.

     Uwaga na pierwsze uruchomienie: obsługa offline dopiero wtedy przejmuje stronę,
     więc to samo zdarzenie pada, choć niczego nie zastępuje. Bez poniższego warunku
     aplikacja przeładowywała się sekundę po starcie i zdmuchiwała okno powitalne. */
  const bylaObsluga = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", ()=>przejeloObsluge(bylaObsluga));
}
/**
 * Reakcja na przejęcie strony przez obsługę offline.
 * @param {boolean} bylaObsluga  czy jakaś obsługa działała już przy wczytywaniu strony
 */
let _przeladowano = false;
function przejeloObsluge(bylaObsluga){
  if(!bylaObsluga) return false;   // pierwsze uruchomienie — nie ma czego odświeżać
  if(_przeladowano) return false;
  _przeladowano = true;
  location.reload();
  return true;
}
/** Pasek z informacją o nowej wersji. Aktualizacja rusza dopiero po zgodzie. */
async function pokazNowaWersje(nowy){
  if(document.getElementById("nowaWersja")) return;
  let nowaVer = "";
  try {
    const res = await fetch("WERSJA?t=" + Date.now());
    if(res.ok) nowaVer = (await res.text()).trim();
  } catch(e) {}
  const verTxt = nowaVer ? ` do <b>v${esc(nowaVer)}</b>` : "";
  const verBadge = nowaVer ? `<span class="nwVerBadge">v${esc(nowaVer)}</span>` : `<span class="nwVerBadge">NOWA</span>`;

  const pasek = document.createElement("div");
  pasek.id = "nowaWersja";
  pasek.innerHTML = verBadge + `<span>Dostępna aktualizacja${verTxt} (Twoja: v${APP_VERSION}). Przed aktualizacją warto zapisać kopię.</span>` +
                    '<button type="button" id="nwOdswiez">Aktualizuj</button>' +
                    '<button type="button" id="nwPozniej" aria-label="Zamknij">✕</button>';
  document.body.appendChild(pasek);
  pasek.querySelector("#nwOdswiez").onclick = async ()=>{
    const dirty = +(lsGet(KP+"Dirty", 0)||0);
    let decyzja;
    const tytul = nowaVer ? `Zaktualizować aplikację do v${nowaVer}?` : "Zaktualizować aplikację?";
    if(dirty>0){
      decyzja = await askChoice(tytul,
        `Obecna wersja: <b>v${APP_VERSION}</b> ➔ Nowa wersja: <b>v${nowaVer || 'najnowsza'}</b>.<br>Masz <b>${dirty} niezapisanych w kopii zmian</b>. Kopia daje dodatkowe bezpieczeństwo.`, [
          {label:"Zrób kopię i aktualizuj", value:"kopia", style:"primary"},
          {label:"Aktualizuj bez kopii", value:"teraz"},
          {label:"Anuluj", value:"nie"}
        ]);
    }else{
      decyzja = await askChoice(tytul,
        `Obecna wersja: <b>v${APP_VERSION}</b> ➔ Nowa wersja: <b>v${nowaVer || 'najnowsza'}</b>.<br>Aplikacja przeładuje się po Twojej zgodzie.`, [
          {label:"Aktualizuj teraz", value:"teraz", style:"primary"},
          {label:"Później", value:"nie"}
        ]);
    }
    if(decyzja==="nie") return;
    if(decyzja==="kopia") await exportJson();
    
    // Wizualne potwierdzenie dla użytkownika
    pasek.innerHTML = '<span class="nwVerBadge">AKTUALIZACJA</span><span>Wgrywanie nowej wersji i restartowanie…</span>';
    
    // Wyślij sygnał aktywacji do nowego Service Workera
    try {
      if(nowy && typeof nowy.postMessage === "function") nowy.postMessage("SKIP_WAITING");
      if(navigator.serviceWorker){
        navigator.serviceWorker.getRegistration().then(reg => {
          if(reg){
            if(reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
            if(reg.installing) reg.installing.postMessage("SKIP_WAITING");
          }
        }).catch(()=>{});
      }
    } catch(err){}

    // Na iPadOS/iOS zdarzenie controllerchange bywa tłumione przez Safari.
    // Dajemy 500ms na normalne przejęcie, po czym wykonujemy bezpośrednie przeładowanie.
    setTimeout(()=>{
      if(!_przeladowano){
        _przeladowano = true;
        location.reload();
      }
    }, 500);
  };
  pasek.querySelector("#nwPozniej").onclick = ()=>pasek.remove();
}

/**
 * Awaryjne, pełne odświeżenie: kasuje pamięć podręczną aplikacji, wyrejestrowuje
 * obsługę offline i wczytuje wszystko od nowa z serwera. Notatki są w osobnej
 * bazie (IndexedDB) i pozostają nietknięte.
 */
async function wymusAktualizacje(){
  try{
    if(window.caches){
      const klucze = await caches.keys();
      await Promise.all(klucze.map(k=>caches.delete(k)));
    }
    if(navigator.serviceWorker){
      const rejs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(rejs.map(r=>r.unregister()));
    }
  }catch(e){ console.warn("Nie udało się wyczyścić pamięci podręcznej", e); }
  /* Zwykłe reload() może ponownie dostać dokument z pamięci HTTP GitHub Pages.
     Jednorazowy parametr tworzy nowe żądanie i wymusza pobranie pliku
     opublikowanego na serwerze. Nie dotyka danych użytkownika. */
  const swiezy = new URL(location.href);
  swiezy.searchParams.set("jw-odswiez", Date.now().toString());
  location.replace(swiezy.href);
}
