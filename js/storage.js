/* ==========================================================================
   JW Study — storage.js
   IndexedDB, zapis notatek i etykiet, ochrona przed brakiem miejsca
   ========================================================================== */
"use strict";
/* ================= IndexedDB ================= */
/* Wersja bazy 2 (od wydania 2.57): doszedł magazyn „wersje" z historią zmian
   notatek. Wcześniej historia mieszkała w pamięci ustawień, która ma około
   pięciu megabajtów na CAŁĄ aplikację — przy kilkuset notatkach zajmowała ją
   w całości i przestawały zapisywać się zwykłe ustawienia.

   Każdy magazyn zakładamy warunkowo. Podniesienie numeru wersji uruchamia
   `onupgradeneeded` także u kogoś, kto ma już bazę z czterema magazynami —
   bezwarunkowe `createObjectStore` przerwałoby wtedy całą aktualizację
   błędem „store already exists", a wraz z nią odczyt notatek. */
function idbOpen(){return new Promise((res,rej)=>{
  const r = indexedDB.open(DBNAME, 2);
  let zakonczone = false;
  /* Otwarta karta starej wersji potrafi zablokować aktualizację bazy na zawsze.
     Wtedy boot() czekał bez końca, a pełnoekranowy #loading połykał każdy dotyk.
     Po kilku sekundach uruchamiamy aplikację bez bazy; odświeżenie po zamknięciu
     innych kart przywróci normalny zapis. Spóźnione połączenie od razu zamykamy. */
  const limit = setTimeout(()=>{
    if(zakonczone) return;
    zakonczone = true;
    rej(new Error("Otwarcie pamięci trwało zbyt długo"));
  }, 5000);
  const zakoncz = (fn, wartosc)=>{
    if(zakonczone){
      if(wartosc && typeof wartosc.close==="function") try{ wartosc.close(); }catch(_){}
      return;
    }
    zakonczone = true;
    clearTimeout(limit);
    fn(wartosc);
  };
  r.onupgradeneeded = e=>{
    const d = e.target.result;
    const zaloz = (nazwa, opcje)=>{
      if(!d.objectStoreNames.contains(nazwa)) d.createObjectStore(nazwa, opcje);
    };
    zaloz("notes", {keyPath:"g"});
    zaloz("tags",  {keyPath:"id"});
    zaloz("meta");
    zaloz("files");
    zaloz("wersje", {keyPath:"g"});
  };
  r.onsuccess = e=>zakoncz(res, e.target.result);
  r.onerror = e=>zakoncz(rej, r.error || e);
  r.onblocked = ()=>zakoncz(rej, new Error("Pamięć jest zablokowana przez inną kartę aplikacji"));
});}
function idbAll(store){return new Promise((res,rej)=>{const t=idb.transaction(store).objectStore(store).getAll();t.onsuccess=()=>res(t.result);t.onerror=rej;});}
function bladBrakuPamieci(){ return new Error("Trwała pamięć jest niedostępna. Zmiany nie zostały zapisane. Zrób kopię JSON i odśwież aplikację po zamknięciu pozostałych kart JW Study."); }
function pokazBrakPamieci(){
  let el=$("storageWarning");
  if(!el){
    el=document.createElement("div");el.id="storageWarning";el.setAttribute("role","alert");
    el.style.cssText="position:fixed;bottom:0;left:0;right:0;z-index:99999;padding:12px 18px;background:#7f1d1d;color:white;font:14px/1.5 sans-serif;text-align:center";
    document.body.appendChild(el);
  }
  el.textContent="Brak trwałego zapisu — zmiany znikną po zamknięciu lub odświeżeniu. Zapisz kopię JSON przez Plik. Zamknij inne karty JW Study, a następnie otwórz aplikację ponownie.";
}
/* Sukces operacji put/delete nie jest jeszcze zatwierdzeniem transakcji. */
function idbWrite(store, wykonaj){return new Promise((res,rej)=>{
  if(!idb){pokazBrakPamieci();return rej(bladBrakuPamieci());}
  let tx;
  try{
    tx=idb.transaction(store,"readwrite");
    tx.oncomplete=()=>res();
    tx.onerror=()=>rej(tx.error||new Error("Nie udało się zapisać danych."));
    tx.onabort=()=>rej(tx.error||new Error("Zapis danych został przerwany."));
    wykonaj(tx.objectStore(store));
  }catch(e){if(tx)try{tx.abort();}catch(_){}rej(e);}
});}
function idbPut(store,val,key){return idbWrite(store,os=>os.put(val,key));}
function idbDelKey(store,key){return idbWrite(store,os=>os.delete(key));}
function idbGet(store,key){return new Promise((res,rej)=>{const t=idb.transaction(store).objectStore(store).get(key);t.onsuccess=()=>res(t.result);t.onerror=rej;});}
function idbBulk(store,items){return idbWrite(store,os=>items.forEach(i=>os.put(i)));}
/**
 * Zapisuje dużą listę rekordów w porcjach, żeby jedna transakcja nie trwała zbyt długo
 * i nie zablokowała interfejsu na słabszym urządzeniu.
 * @param {string} store  nazwa magazynu
 * @param {Array} items   rekordy do zapisania
 */
async function idbBulkChunked(store,items){
  for(let i=0;i<items.length;i+=400){
    await idbBulk(store, items.slice(i,i+400));
  }
}
/**
 * Atomowy zapis importu z zewnętrznego programu (np. Notatek Apple).
 * Cały zestaw notatek i etykiet trafia do jednej transakcji. Nieudany zapis,
 * brak miejsca albo zamknięcie karty wycofuje wszystko.
 */
function idbZapiszImportZewnetrzny(noweNotatki, noweTagi, oczekiwaneNotatki, oczekiwaneTagi){
  return new Promise((res,rej)=>{
    if(!idb){pokazBrakPamieci();return rej(bladBrakuPamieci());}
    let tx;
    try{ tx=idb.transaction(["notes","tags"],"readwrite"); }
    catch(e){ return rej(e); }
    tx.oncomplete=()=>res(true);
    tx.onerror=()=>rej(tx.error||new Error("zapis importu się nie powiódł"));
    tx.onabort=()=>rej(tx.error||new Error("zapis importu został przerwany"));
    try{
      const sn=tx.objectStore("notes"), st=tx.objectStore("tags");
      for(const n of (noweNotatki||[])) sn.put(n);
      for(const t of (noweTagi||[])) st.put(t);
      const cn=sn.count(), ct=st.count();
      let ng=false,tg=false,nv=0,tv=0;
      const sprawdz=()=>{
        if(!ng||!tg) return;
        if(nv!==oczekiwaneNotatki || tv!==oczekiwaneTagi){
          try{ tx.abort(); }catch(_){}
        }
      };
      cn.onsuccess=()=>{ng=true;nv=cn.result;sprawdz();};
      ct.onsuccess=()=>{tg=true;tv=ct.result;sprawdz();};
      cn.onerror=ct.onerror=()=>{try{tx.abort();}catch(_){}};
    }catch(e){ try{tx.abort();}catch(_){} }
  });
}
/**
 * Zapis jednego importu z JW Library w jednej transakcji.
 *
 * Notatki, etykiety i plik bazowy do późniejszego eksportu muszą wejść razem.
 * Jeżeli zabraknie miejsca albo karta zostanie zamknięta, IndexedDB wycofa
 * całą transakcję — na urządzeniu nie zostaje połowa importu ani kopia bazowa
 * niepasująca do widocznych notatek.
 */
function idbZapiszImport(zmienione, noweTagi, buforKopii, nazwaKopii, dataKopii, ileNotatek, onProgress){
  return new Promise((res,rej)=>{
    if(!idb) return rej(new Error("Pamięć aplikacji nie jest dostępna na tym urządzeniu"));
    let tx;
    try{ tx=idb.transaction(["notes","tags","files","meta"],"readwrite"); }
    catch(e){ return rej(e); }
    tx.oncomplete=()=>res(true);
    tx.onerror=()=>rej(tx.error||new Error("zapis importu się nie powiódł"));
    tx.onabort=()=>rej(tx.error||new Error("zapis importu został przerwany"));
    try{
      const sn=tx.objectStore("notes"), st=tx.objectStore("tags");
      const listaN=zmienione||[], listaT=noweTagi||[];
      const razem=Math.max(1,listaN.length+listaT.length), PORCJA=400;
      let gotowe=0;
      const podajPostep=()=>{ if(typeof onProgress==="function") onProgress(gotowe/razem); };
      const zapiszPorcjami=(lista,sklep,koniec)=>{
        let i=0;
        const nastepna=()=>{
          const poczatek=i, doKad=Math.min(lista.length,i+PORCJA); let ostatnie=null;
          try{
            for(;i<doKad;i++) ostatnie=sklep.put(lista[i]);
          }catch(e){ try{tx.abort();}catch(_){} return; }
          gotowe+=doKad-poczatek;
          podajPostep();
          if(i<lista.length && ostatnie){ ostatnie.onsuccess=nastepna; return; }
          koniec();
        };
        nastepna();
      };
      zapiszPorcjami(listaN,sn,()=>zapiszPorcjami(listaT,st,()=>{
        tx.objectStore("files").put(buforKopii,"lastBackup");
        const sm=tx.objectStore("meta");
        sm.put(nazwaKopii,"lastBackupName");
        sm.put(dataKopii,"lastBackupDate");
        /* Odczyt kontrolny jest częścią tej samej transakcji. Jeżeli liczby nie
           pasują, abort wycofuje również wcześniejsze put() i plik bazowy. */
        const cn=sn.count(), ct=st.count();
        let nGot=false,tGot=false,nVal=0,tVal=0;
        const zweryfikuj=()=>{
          if(!nGot||!tGot) return;
          if(nVal!==ileNotatek || tVal!==listaT.length){ try{tx.abort();}catch(_){} }
        };
        cn.onsuccess=()=>{nGot=true;nVal=cn.result;zweryfikuj();};
        ct.onsuccess=()=>{tGot=true;tVal=ct.result;zweryfikuj();};
        cn.onerror=ct.onerror=()=>{try{tx.abort();}catch(_){}};
      }));
    }catch(e){ try{tx.abort();}catch(_){} }
  });
}
/** Kontrolny odczyt po imporcie — komunikat sukcesu wolno pokazać dopiero po nim. */
async function sprawdzImport(ileNotatek, ileEtykiet, nazwaKopii, dataKopii){
  if(!idb) return {zgadza:false};
  try{
    const [notatki,etykiety,nazwa,data]=await Promise.all([
      idbCount("notes"), idbCount("tags"),
      idbGet("meta","lastBackupName"), idbGet("meta","lastBackupDate")
    ]);
    return {notatki,etykiety,nazwa,data,
      zgadza:notatki===ileNotatek && etykiety===ileEtykiet &&
              nazwa===nazwaKopii && data===dataKopii};
  }catch(e){ return {zgadza:false,blad:e}; }
}
/**
 * Wymiana CAŁEJ zawartości bazy w jednej transakcji.
 *
 * Wcześniej „Zastąp wszystko" robiło to na dwa razy: najpierw czyszczenie
 * w jednej transakcji, potem zapis w kolejnych. Gdy drugi krok się nie udał
 * (brak miejsca, zamknięcie karty, błąd bazy), na urządzeniu zostawała
 * pusta baza — stare notatki skasowane, nowych nie ma.
 *
 * Teraz czyszczenie i zapis dzieją się w JEDNEJ transakcji: albo wchodzi
 * całość, albo baza zostaje dokładnie taka, jaka była.
 *
 * W transakcji jest KOMPLET tego, co składa się na kopię. Do wydania 2.48
 * zakładki sekcji zapisywały się osobno, już po niej, a szablony nie
 * zapisywały się wcale — więc nieudany zapis mógł zostawić notatki z pliku
 * i zakładki sprzed niego, a szablony zostawały cudze nawet przy zapisie
 * udanym. „Wszystko albo nic" musi obejmować wszystko.
 */
function saveDeletedGuids(){ if(idb) idbPut("meta", deletedGuids, "deletedGuids").catch(()=>{}); }
function idbZapiszMeta(klucz, wartosc){ if(idb) return idbPut("meta", wartosc, klucz); return Promise.resolve(); }
function idbWczytajMeta(klucz){ if(idb) return idbGet("meta", klucz); return Promise.resolve(null); }

/**
 * Wczytuje komplet danych z bazy IndexedDB:
 * notatki, etykiety oraz metadane (sekcje, zakładki, szablony, autotematy, tombstones).
 * @returns {Promise<{notes:Array, tags:Array, sections:Array, pubTabs:Array, secTabs:Array, szablony:Array, autoTopics:Object, deletedTags:Array, deletedGuids:Array}|null>}
 */
async function idbWczytajWszystko(){
  if(!idb) return null;
  try{
    const [wNotes, wTags, wSections, wPubTabs, wSecTabs, wSzablony, wAutoTopics, wDelTags, wDelGuids] = await Promise.all([
      idbAll("notes"),
      idbAll("tags"),
      idbGet("meta", "sections"),
      idbGet("meta", "pubTabs"),
      idbGet("meta", "secTabs"),
      idbGet("meta", "szablony"),
      idbGet("meta", "autoTopics"),
      idbGet("meta", "deletedTags"),
      idbGet("meta", "deletedGuids")
    ]);
    return {
      notes: wNotes || [],
      tags: wTags || [],
      sections: wSections || [],
      pubTabs: wPubTabs || [],
      secTabs: wSecTabs || [],
      szablony: wSzablony || [],
      autoTopics: wAutoTopics || null,
      deletedTags: wDelTags || [],
      deletedGuids: wDelGuids || []
    };
  }catch(e){
    console.warn("Błąd w idbWczytajWszystko:", e);
    return null;
  }
}

/**
 * Zastępuje zawartość całej bazy nowymi danymi w JEDNEJ transakcji.
 * @param {Note[]} noweNotes
 * @param {Tag[]} noweTags
 * @param {Object[]} noweSekcje
 * @param {Object[]} noweZakladki       zakładki publikacji
 * @param {Object[]} [noweZakladkiSekcji]
 * @param {Object[]} [noweSzablony]
 * @param {Object} [noweAutoTematy]
 * @param {string[]} [noweDeletedTags]
 * @param {string[]} [noweDeletedGuids]
 * @returns {Promise<boolean>}
 */
function idbZastapWszystko(noweNotes, noweTags, noweSekcje, noweZakladki, noweZakladkiSekcji, noweSzablony, noweAutoTematy, noweDeletedTags, noweDeletedGuids){
  return new Promise((res, rej)=>{
    if(!idb) return res(false);
    let tx;
    try{ tx = idb.transaction(["notes","tags","meta"], "readwrite"); }
    catch(e){ return rej(e); }
    tx.oncomplete = ()=>res(true);
    tx.onerror    = ()=>rej(tx.error || new Error("zapis się nie powiódł"));
    tx.onabort    = ()=>rej(tx.error || new Error("zapis przerwany"));
    try{
      const sn = tx.objectStore("notes");
      const st = tx.objectStore("tags");
      const sm = tx.objectStore("meta");
      sn.clear(); st.clear();
      for(const n of noweNotes) sn.put(n);
      for(const t of noweTags)  st.put(t);
      sm.put(noweSekcje,   "sections");
      sm.put(noweZakladki, "pubTabs");
      sm.put(Array.isArray(noweZakladkiSekcji) ? noweZakladkiSekcji : [], "secTabs");
      sm.put(Array.isArray(noweSzablony)       ? noweSzablony       : [], "szablony");
      sm.put(autoTematySanity(noweAutoTematy), "autoTopics");
      sm.put(Array.isArray(noweDeletedTags)    ? noweDeletedTags    : [], "deletedTags");
      sm.put(Array.isArray(noweDeletedGuids)   ? noweDeletedGuids   : [], "deletedGuids");
    }catch(e){
      try{ tx.abort(); }catch(_){}
      rej(e);
    }
  });
}
/**
 * Odczytuje z bazy to, co miało się zapisać, i porównuje liczby.
 * Zapis do IndexedDB potrafi „udać się" i nie zostawić danych (np. przy
 * wyczerpanym miejscu), więc po imporcie sprawdzamy wynik zamiast zakładać.
 * @returns {Promise<{notatki:number, etykiety:number, zgadza:boolean}|null>}
 */
async function sprawdzZapis(ileNotatek, ileEtykiet){
  if(!idb) return null;
  try{
    const [notatki, etykiety] = await Promise.all([idbCount("notes"), idbCount("tags")]);
    return {notatki, etykiety, zgadza: notatki===ileNotatek && etykiety===ileEtykiet};
  }catch(e){
    console.warn("Nie udało się sprawdzić zapisu", e);
    return null;
  }
}
function idbCount(store){return new Promise((res,rej)=>{const t=idb.transaction(store).objectStore(store).count();t.onsuccess=()=>res(t.result);t.onerror=rej;});}
/* ===== OCHRONA PRZED BRAKIEM MIEJSCA =====
   Gdy pamięć urządzenia się zapełni, zapis do bazy NIE UDAJE SIĘ.
   Notatka byłaby widoczna na ekranie, ale zniknęłaby po odświeżeniu — dlatego
   zamiast ignorować błąd, wyraźnie o tym informujemy i blokujemy ciszę. */
let storageFull = false;
function isQuotaError(e){
  const n=(e&&(e.name||e.message)||"")+"";
  return /quota|QuotaExceeded|storage|full/i.test(n);
}
/**
 * Jedyne miejsce, w którym kończą błędy zapisu. Brak miejsca w pamięci pokazuje pełną
 * instrukcję ratunkową (jednorazowo), pozostałe błędy — komunikat z podpowiedzią.
 * @param {Error} e
 * @param {string} [what]  czego dotyczył zapis, np. „notatka"
 */
function reportSaveError(e, what){
  console.error("Błąd zapisu:", e);
  if(isQuotaError(e)){
    if(storageFull) return;
    storageFull = true;
    showInfo("⚠️ Brak miejsca w pamięci urządzenia",
      "<b>Ostatnia zmiana NIE ZOSTAŁA ZAPISANA.</b><br><br>"+
      "Pamięć aplikacji na tym urządzeniu jest pełna. Żeby nie stracić danych:<br><br>"+
      "1. Zrób teraz kopię: <b>⚙️ Plik → Zapisz kopię danych (JSON)</b><br>"+
      "2. Usuń zbędne <b>zdjęcia</b> z notatek (zajmują najwięcej miejsca)<br>"+
      "3. Opróżnij <b>🗑 Kosz</b><br><br>"+
      "Do czasu zwolnienia miejsca nowe zmiany mogą się nie zapisywać.");
  } else {
    /* Komunikat mówi, co się nie zapisało i co z tym zrobić — sam „błąd zapisu" nic nie daje. */
    toastErr("Nie udało się zapisać"+(what?" ("+what+")":"")+". Zrób kopię danych przez Plik → Zapisz kopię (JSON) i odśwież stronę.");
  }
}
/**
 * Zapisuje pojedynczą notatkę. Błędy trafiają do reportSaveError, żeby użytkownik
 * dowiedział się o nieudanym zapisie zamiast stracić dane po cichu.
 * @param {Note} n
 */
function saveNote(n){
  /* Skorowidz rzadkich słów opisuje stan sprzed zmiany — po zapisie notatki
     przestaje być prawdziwy. Kasujemy go tutaj, w jednym miejscu, przez które
     przechodzi każdy zapis; wyliczy się od nowa dopiero wtedy, gdy będzie
     potrzebny. */
  if(typeof unieaktualnijPowiazane==="function") unieaktualnijPowiazane();
  if(typeof workerAktualizujNotatke==="function") workerAktualizujNotatke(n);
  if(!idb){pokazBrakPamieci();return Promise.resolve(false);}
  return idbPut("notes", n).then(()=>true).catch(e=>{
    reportSaveError(e,"notatka");
    return false;
  });
}
/* sprawdzenie miejsca przed wstawieniem zdjęcia */
async function checkSpaceForImage(bytes){
  try{
    if(!(navigator.storage && navigator.storage.estimate)) return true;
    const {usage=0, quota=0} = await navigator.storage.estimate();
    if(!quota) return true;
    const free = quota - usage;
    if(free < bytes*3){
      const mb=x=>(x/1048576).toFixed(1)+" MB";
      return await askConfirm("Mało miejsca w pamięci",
        "Zostało tylko <b>"+mb(free)+"</b> wolnego miejsca na tym urządzeniu.<br><br>"+
        "Dodanie zdjęcia może się nie udać albo zablokować zapis kolejnych zmian. Zalecam najpierw zrobić kopię danych i usunąć zbędne zdjęcia.<br><br>Wstawić mimo to?",
        {okLabel:"Wstaw mimo to", danger:true});
    }
  }catch(e){}
  return true;
}
/* natychmiastowy zapis treści edytowanej notatki (np. po operacji na zdjęciu) */
function ustawStanZapisu(ce, stan){
  const card=ce && ce.closest ? ce.closest(".ncard") : null;
  const el=card && card.querySelector(".editSaveState");
  if(!el) return;
  const etykiety={dirty:"Niezapisane",saving:"Zapisywanie…",draft:"Szkic zapisany",saved:"Zapisano",error:"Błąd zapisu"};
  el.dataset.state=stan;
  el.textContent=etykiety[stan]||etykiety.dirty;
  el.title=stan==="draft" ? "Szkic awaryjny zapisano na tym urządzeniu" : el.textContent;
}

/* ===== SZKICE AWARYJNE EDYTORA =====
   Szkic leży w magazynie meta, a nie w notes: jest więc fizycznie oddzielony
   od właściwej notatki i nie może pojawić się na liście ani w eksporcie jako
   zatwierdzona treść. Klucz zawiera guid notatki. */
const SZKIC_ZWLOKA = 1800;
const _szkicTimery = new Map();
function szkicKlucz(g){ return "draft:"+g; }
function szkicDane(card,n){
  const t=card && card.querySelector(".ntitle"), c=card && card.querySelector(".ncontent");
  if(!t||!c||!n) return null;
  return {g:n.g,t:t.textContent.trim(),h:c.innerHTML,ts:new Date().toISOString(),baseMo:n.mo||""};
}
function szkicAnuluj(g){
  const timer=_szkicTimery.get(g); if(timer) clearTimeout(timer);
  _szkicTimery.delete(g);
}
function szkicZapisz(card,n,cichy){
  const dane=szkicDane(card,n);
  if(!dane || !idb) return Promise.resolve(false);
  if(!cichy) ustawStanZapisu(card.querySelector(".ncontent"),"saving");
  return idbPut("meta",dane,szkicKlucz(n.g)).then(()=>{
    if(!cichy && card.isConnected && card.classList.contains("editing"))
      ustawStanZapisu(card.querySelector(".ncontent"),"draft");
    return true;
  }).catch(e=>{
    console.warn("Nie udało się zapisać szkicu",e);
    if(!cichy && card.isConnected) ustawStanZapisu(card.querySelector(".ncontent"),"error");
    return false;
  });
}
function szkicZaplanuj(pole){
  const card=pole && pole.closest ? pole.closest(".ncard.editing") : null;
  const n=card && notes.find(x=>x.g===card.dataset.g); if(!card||!n) return;
  ustawStanZapisu(pole,"dirty");
  szkicAnuluj(n.g);
  _szkicTimery.set(n.g,setTimeout(()=>{
    _szkicTimery.delete(n.g);
    if(card.isConnected && card.classList.contains("editing")) szkicZapisz(card,n,false);
  },SZKIC_ZWLOKA));
}
function szkicUsun(g){
  szkicAnuluj(g);
  if(!idb) return Promise.resolve(true);
  return idbDelKey("meta",szkicKlucz(g)).then(()=>true).catch(e=>{
    console.warn("Nie udało się usunąć starego szkicu",e); return false;
  });
}
async function szkicOdzyskaj(card,n){
  if(!idb||!card||!n) return false;
  let s; try{s=await idbGet("meta",szkicKlucz(n.g));}catch(e){return false;}
  if(!s||s.g!==n.g) return false;
  const zapisanyH=sanitize(s.h||"");
  const takiSam=(s.t||"").trim()===(n.t||"").trim() && zapisanyH===sanitize(n.h||esc(n.c||""));
  const czasSzkicu=Date.parse(s.ts||"")||0, czasNotatki=Date.parse(n.mo||"")||0;
  if(takiSam || (czasNotatki && czasSzkicu<=czasNotatki)){ szkicUsun(n.g); return false; }
  const tak=await askConfirm("Odzyskać niezapisany szkic?",
    "Znaleziono tekst zachowany automatycznie <b>"+esc(new Date(czasSzkicu||Date.now()).toLocaleString("pl-PL"))+"</b>. "+
    "Powstał po ostatnim pełnym zapisie tej notatki.<br><br>Przywrócić go do edytora?",
    {okLabel:"Odzyskaj szkic"});
  if(!card.isConnected||!card.classList.contains("editing")) return false;
  if(!tak){ await szkicUsun(n.g); ustawStanZapisu(card.querySelector(".ncontent"),"saved"); return false; }
  const titleEl=card.querySelector(".ntitle"), contEl=card.querySelector(".ncontent");
  titleEl.textContent=s.t||""; contEl.innerHTML=zapisanyH;
  if(typeof histStart==="function") histStart(contEl);
  ustawStanZapisu(contEl,"draft");
  toastOk("Odzyskano niezapisany szkic");
  return true;
}
function szkicFlushKarty(){
  document.querySelectorAll(".ncard.editing[data-g]").forEach(card=>{
    const n=notes.find(x=>x.g===card.dataset.g); if(n){ szkicAnuluj(n.g); szkicZapisz(card,n,true); }
  });
}
addEventListener("pagehide",szkicFlushKarty);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden") szkicFlushKarty();});
function commitLiveEdit(ce){
  if(!ce) return;
  const card = ce.closest && ce.closest(".ncard"); if(!card) return;
  const n = notes.find(x=>x.g===card.dataset.g); if(!n) return;
  try{
    /* Numery przypisów liczy 55-przypisy.js z kolejności odsyłaczy w treści —
       zawsze przed odczytaniem HTML, żeby do bazy nie trafiła stara numeracja. */
    if(typeof przPrzenumeruj==="function") przPrzenumeruj(ce);
    const clean = sanitize(ce.innerHTML);
    n.h = clean; n.c = htmlToPlain(clean);
    n.ed = true; n.mo = new Date().toISOString();
    ustawStanZapisu(ce,"saving");
    const seq=String((+(ce.dataset.saveSeq||0))+1); ce.dataset.saveSeq=seq;
    saveNote(n).then(ok=>{
      if(ce.dataset.saveSeq===seq) ustawStanZapisu(ce,ok?"saved":"error");
    });
    if(typeof bumpDirty==="function") bumpDirty();
  }catch(e){ ustawStanZapisu(ce,"error"); }
}
function saveTags(){ if(idb) idbBulk("tags", tags).catch(e=>reportSaveError(e,"etykiety"));
  if(typeof bumpTagsVer==="function") bumpTagsVer();   // chipy i lista wyboru na kartach muszą się odświeżyć
  if(typeof bumpDirty==="function") bumpDirty(); }

/* ——— zabezpieczenia przed błędnymi danymi ———
   Notatki potrafią przyjść z trzech źródeł: pamięci przeglądarki, wbudowanej paczki
   i kopii JSON wybranej przez użytkownika. Plik mógł zostać ręcznie zmieniony, obcięty
   albo pochodzić ze starszej wersji. Zamiast ufać, że wszystko ma właściwy kształt,
   każdą notatkę przepuszczamy przez sito — pola nadające się do naprawy prostujemy,
   rekordy bez identyfikatora odrzucamy, bo bez niego nie da się nimi zarządzać. */
/**
 * Czy zapis koloru jest bezpieczny do wstawienia w atrybut stylu.
 * Odrzuca cudzysłowy, nawiasy ostre i url(), którymi dałoby się wyjść
 * z atrybutu i dopisać własny kod.
 */
function kolorBezpieczny(v){
  if(typeof v!=="string") return false;
  const t=v.trim();
  if(t.length>32) return false;
  return /^#[0-9a-f]{3,8}$/i.test(t)
      || /^rgba?\(\s*[\d.\s,%]+\)$/i.test(t)
      || /^hsla?\(\s*[\d.\s,%deg]+\)$/i.test(t)
      || /^[a-z]{3,20}$/i.test(t);
}
/**
 * Sito dla treści notatki wczytanej z CUDZEGO pliku.
 *
 * Pole h to gotowy HTML wstawiany przez innerHTML. Własny edytor przepuszcza je
 * przez sanitize() przy każdym zapisie, ale plik kopii może pochodzić skądkolwiek —
 * wystarczyło podłożyć <img src=x onerror=…> albo <script>, żeby przy otwarciu
 * aplikacji wykonał się obcy kod. Dlatego wszystko z zewnątrz przechodzi przez
 * ten sam filtr co treść pisana ręcznie.
 */
function czystyHtmlZObcegoZrodla(html){
  if(typeof html!=="string" || !html) return "";
  if(typeof sanitize!=="function") return "";   // bez filtru wolimy stracić formatowanie niż wpuścić kod
  try{ return sanitize(html); }
  catch(e){ console.warn("Nie udało się oczyścić treści notatki", e); return ""; }
}

/**
 * @param {*} n
 * @param {boolean} [obce]  dane z cudzego pliku — treść przechodzi przez filtr HTML
 */
function sanitizeNote(n, obce){
  if(!n || typeof n!=="object") return null;
  const g = (typeof n.g==="string" && n.g) ? n.g : (n.g!=null ? String(n.g) : "");
  if(!g) return null;                       // notatka bez identyfikatora jest bezużyteczna
  n.g = g;
  n.t  = typeof n.t==="string" ? n.t : (n.t==null ? "" : String(n.t));
  n.c  = typeof n.c==="string" ? n.c : (n.c==null ? "" : String(n.c));
  n.h  = typeof n.h==="string" ? n.h : "";
  if(obce && n.h){
    const czysty = czystyHtmlZObcegoZrodla(n.h);
    if(czysty !== n.h) console.warn("Oczyszczono treść notatki z wczytanej kopii:", n.g);
    n.h = czysty;
  }
  /* Tło karteczki trafia do atrybutu style — sprawdzamy ZAWSZE, nie tylko przy
     obcych plikach. Zapis z cudzysłowem pozwoliłby wyjść z atrybutu i dopisać
     własny, a kopia potrafi krążyć między urządzeniami i wrócić do nas. */
  if(n.bg!=null && !kolorBezpieczny(n.bg)) delete n.bg;
  if(n.wys!=null){ const h=Number(n.wys); if(isFinite(h) && h>=0) n.wys=h; else delete n.wys; }
  if(obce){
    // te pola trafiają do atrybutów i nazw — muszą być zwykłym tekstem
    if(n.ff!=null && typeof n.ff!=="string") delete n.ff;
    if(n.lh!=null && !/^[\d.]{1,6}$/.test(String(n.lh))) delete n.lh;
    if(n.pm!=null && !/^[\d.]{1,6}(em|px|rem)?$/.test(String(n.pm))) delete n.pm;
  }
  n.tg = Array.isArray(n.tg) ? n.tg.map(Number).filter(x=>isFinite(x)) : [];
  n.atex = Array.isArray(n.atex) ? [...new Set(n.atex.map(x=>String(x||"")).filter(x=>/^[a-z0-9_-]{1,60}$/i.test(x)))].slice(0,60) : [];
  n.b  = liczbaLubZero(n.b);
  n.ch = liczbaLubZero(n.ch);
  n.v  = liczbaLubZero(n.v);
  n.par= liczbaLubZero(n.par);
  n.itn= liczbaLubZero(n.itn);
  n.doc= liczbaLubZero(n.doc);
  n.pin = !!n.pin; n.fav = !!n.fav; n.del = !!n.del;
  /* Organizacja w Centrum Studium jest częścią notatki, a nie ustawieniem
     urządzenia. Dzięki temu kolejka i skrzynka jadą w kopii oraz podczas
     uzgadniania. Wartością jest data dodania — pozwala zachować kolejność. */
  ["cenq","ceni"].forEach(p=>{
    if(n[p]===true) n[p]=n.mo || n.cr || new Date().toISOString();
    else if(typeof n[p]!=="string" || !n[p]) delete n[p];
  });
  /* Zakładki czytnika są częścią notatki, więc jadą w kopii i między
     urządzeniami. Ograniczamy liczbę i długości pól, żeby obcy plik nie mógł
     wstawić tu niekontrolowanej ilości danych. */
  if(Array.isArray(n.rb)){
    n.rb=n.rb.slice(-80).map((m,i)=>{
      if(!m || typeof m!=="object") return null;
      const pct=Math.max(0,Math.min(100,Number(m.pct)||0));
      return {id:String(m.id||("rb_import_"+i)).slice(0,80),pct,
        label:String(m.label||"Zakładka").slice(0,120),quote:String(m.quote||"").slice(0,180),
        ts:typeof m.ts==="string"?m.ts:""};
    }).filter(Boolean);
  }else delete n.rb;
  if(typeof n.ord!=="number" || !isFinite(n.ord)) delete n.ord;
  if(n.ptb!=null){ const p=Number(n.ptb); if(isFinite(p) && p>0) n.ptb=p; else delete n.ptb; }
  if(typeof n.mo!=="string") n.mo = typeof n.cr==="string" ? n.cr : new Date().toISOString();
  if(n.cr!=null && typeof n.cr!=="string") n.cr = String(n.cr);
  if(n.ks!=null && typeof n.ks!=="string") n.ks = String(n.ks);
  return n;
}
function liczbaLubZero(v){ const x=Number(v); return isFinite(x) ? x : 0; }
/* Odsiewa niepoprawne rekordy i mówi w konsoli, ile ich było — łatwiej zdiagnozować
   uszkodzony plik, niż zastanawiać się, czemu notatek jest mniej. */
function sanitizeNotes(list, zrodlo, obce){
  if(!Array.isArray(list)) { console.warn("Oczekiwano listy notatek, dostałem:", typeof list, "("+(zrodlo||"?")+")"); return []; }
  const out=[]; let odrzucone=0;
  for(const n of list){ const ok=sanitizeNote(n, obce); if(ok) out.push(ok); else odrzucone++; }
  if(odrzucone) console.warn("Pominięto "+odrzucone+" uszkodzonych notatek ("+(zrodlo||"?")+")");
  return out;
}
/**
 * Sito dla etykiet: odrzuca rekordy bez nazwy, bez identyfikatora oraz z powtórzonym
 * identyfikatorem (powtórki rozjeżdżają przypisania notatek).
 * @returns {Tag[]}
 */
function sanitizeTags(list, zrodlo, obce){
  if(!Array.isArray(list)) return [];
  const out=[]; const uzyte=new Set(); let odrzucone=0;
  for(const t of list){
    if(!t || typeof t!=="object"){ odrzucone++; continue; }
    const id=Number(t.id);
    let name=typeof t.name==="string" ? t.name.trim() : "";
    /* Importowane komentarze miały rok w nazwie stałej serii. Rok nie opisuje
       konkretnej notatki i po kilku wydaniach wygląda jak nieaktualna data.
       Normalizacja przy wczytaniu obejmuje listę, karty, czytnik i eksport. */
    name=name.replace(/^(Komentarze\s*[—–-]\s*Biblia do studium)\s+2020$/i,"$1");
    if(!isFinite(id) || !name){ odrzucone++; continue; }
    if(uzyte.has(id)){ odrzucone++; continue; }     // powtórzone identyfikatory rozjeżdżają przypisania
    uzyte.add(id);
    t.id=id; t.name=name;
    /* Kolor trafia do atrybutu style. Zapis z cudzysłowem pozwoliłby z niego wyjść
       i dopisać własny atrybut, więc przepuszczamy tylko proste, znane postacie. */
    if(t.color!=null && !kolorBezpieczny(t.color)) delete t.color;
    if(t.sec!=null && !isFinite(Number(t.sec))) delete t.sec;
    if(t.cproj!==true) delete t.cproj;
    out.push(t);
  }
  if(odrzucone) console.warn("Pominięto "+odrzucone+" uszkodzonych etykiet ("+(zrodlo||"?")+")");
  return out;
}
