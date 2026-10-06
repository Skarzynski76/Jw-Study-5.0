/* ==========================================================================
   JW Study — backup.js
   Kopia zapasowa: chmura, JSON, scalanie
   ========================================================================== */
"use strict";
/* ================= KOPIA DO CHMURY ================= */
/* Zawartość kopii bierze się WYŁĄCZNIE z daneKopii() — patrz komentarz przy tej
   funkcji. Do wydania 2.48 stało tu własne {tags, notes, sections}, więc kopia
   z chmury cicho gubiła zakładki publikacji, zakładki sekcji i wszystkie
   szablony: notatki po przeniesieniu były, a porządek, który ktoś sobie zrobił,
   znikał bez śladu i bez ostrzeżenia. Dwie drogi zapisu muszą zapisywać to samo. */
async function shareBackup(){
  const name = "moje-notatki-kopia-"+new Date().toISOString().substring(0,10)+".json";
  const blob = new Blob([JSON.stringify(daneKopii())],{type:"application/json"});
  // 1. iPad/iPhone i telefony: systemowy arkusz udostępniania (OneDrive, iCloud Drive, Dysk Google…)
  try{
    const file = new File([blob], name, {type:"application/json"});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({files:[file], title:"Kopia notatek JW Study"});
      clearDirty();
      toast("Kopia przekazana do wybranej aplikacji");
      return;
    }
  }catch(e){ if(e && e.name==="AbortError") return; }
  // 2. komputer (Chrome/Edge): okno zapisu — wskaż folder OneDrive / Dysk Google / iCloud
  if(window.showSaveFilePicker){
    try{
      const h = await showSaveFilePicker({suggestedName:name, types:[{description:"Kopia JSON", accept:{"application/json":[".json"]}}]});
      const w = await h.createWritable(); await w.write(blob); await w.close();
      clearDirty();
      toast("Zapisano — jeśli wybrałeś folder OneDrive/iCloud, kopia trafi do chmury automatycznie");
      return;
    }catch(e){ if(e && e.name==="AbortError") return; }
  }
  // 3. awaryjnie: zwykłe pobranie
  download(blob, name);
  showInfo("Kopia pobrana", "Aby mieć ją w chmurze, przenieś pobrany plik do folderu OneDrive, iCloud Drive lub Dysku Google na tym urządzeniu.");
}

/* ================= KOPIA JSON ================= */
/* =====================================================================
   KOPIA ZAPASOWA DO JEDNEGO, STALE NADPISYWANEGO PLIKU

   Codzienne kopie zostawiały na dysku stos plików „…kopia-2026-08-06.json",
   „…(1).json" i tak dalej. Przeglądarka z zasady nie może nadpisać pobranego
   pliku — może jednak dostać od użytkownika wskazanie KONKRETNEGO pliku
   i pisać do niego dalej. Służy do tego showSaveFilePicker.

   Wskazanie zapamiętujemy w bazie na urządzeniu, więc pytanie pada raz.
   Przy każdej kolejnej kopii plik jest po prostu nadpisywany — bez okien,
   bez nowych plików na dysku.

   Działa w przeglądarkach opartych na Chromium (Chrome, Edge, Brave, Arc)
   na komputerze. Safari i przeglądarki mobilne tego nie udostępniają —
   tam zostaje dotychczasowe pobieranie i to jest w porządku.
   ===================================================================== */
const KLUCZ_UCHWYT_KOPII = "kopiaPlik";

/* ===== LIMITY WCZYTYWANEJ KOPII =====
   Zapory przed plikiem, który nie jest kopią notatek, i przed spreparowanym
   plikiem, który miałby zapchać pamięć urządzenia. */
const MAX_KOPIA_JSON = 300 * 1024 * 1024;
const MAX_NOTATEK    = 200000;
const MAX_ETYKIET    = 5000;
/* Zakładki i szablony też potrzebują kresu. Nie ze względu na miejsce — jest ich
   z natury mało — tylko dlatego, że każdą dokładaną trzeba dopasować do tych,
   które już są. Bez limitu spreparowany plik ze stoma tysiącami zakładek
   zamieniał wczytanie kopii w zawieszenie karty. */
const MAX_ZAKLADEK   = 20000;
const MAX_SZABLONOW  = 2000;

/** Czy ta przeglądarka pozwala pisać do wskazanego pliku. */
function stalyPlikDostepny(){
  return typeof window !== "undefined" && typeof window.showSaveFilePicker === "function";
}
/** Zapamiętane wskazanie pliku albo null. */
async function uchwytKopii(){
  try{ return (await idbGet("meta", KLUCZ_UCHWYT_KOPII)) || null; }
  catch(e){ return null; }
}
/**
 * Sprawdza (a w razie potrzeby prosi o) prawo do zapisu we wskazanym pliku.
 * Po ponownym uruchomieniu przeglądarki prawo trzeba potwierdzić jednym kliknięciem.
 */
async function prawoDoPliku(uchwyt, pytaj){
  if(!uchwyt || !uchwyt.queryPermission) return false;
  const opis = {mode:"readwrite"};
  if((await uchwyt.queryPermission(opis)) === "granted") return true;
  if(!pytaj) return false;
  return (await uchwyt.requestPermission(opis)) === "granted";
}
/** Pyta o plik i zapamiętuje wskazanie. */
async function wskazPlikKopii(){
  if(!stalyPlikDostepny()){
    toast("Ta przeglądarka nie pozwala pisać do wskazanego pliku");
    return false;
  }
  try{
    const uchwyt = await window.showSaveFilePicker({
      suggestedName: "moje-notatki-kopia.json",
      types: [{ description: "Kopia notatek JW Study", accept: {"application/json": [".json"]} }]
    });
    await idbPut("meta", uchwyt, KLUCZ_UCHWYT_KOPII);
    toastOk("Kopie będą zapisywane do pliku: " + (uchwyt.name || "wybranego"));
    return true;
  }catch(e){
    if(e && e.name === "AbortError") return false;      // użytkownik zrezygnował
    console.warn("Nie udało się wskazać pliku kopii", e);
    toastErr("Nie udało się wskazać pliku");
    return false;
  }
}
/** Przestaje używać wskazanego pliku — wracamy do zwykłego pobierania. */
async function zapomnijPlikKopii(){
  try{ await idbDelKey("meta", KLUCZ_UCHWYT_KOPII); }catch(e){}
  toast("Kopie znów będą pobierane jako nowe pliki");
}
/** Nazwa zapamiętanego pliku albo pusty napis. */
async function nazwaPlikuKopii(){
  const u = await uchwytKopii();
  return u && u.name ? u.name : "";
}

/** Dane do kopii — jedno miejsce, żeby zapis do pliku i pobranie były identyczne. */
function daneKopii(){
  return {
    tags,
    notes,
    sections: (Array.isArray(sections) ? sections : []),
    pubTabs: (Array.isArray(pubTabs) ? pubTabs : (typeof pubTabs!=="undefined" ? pubTabs : [])),
    secTabs: (Array.isArray(secTabs) ? secTabs : (typeof secTabs!=="undefined" ? secTabs : [])),
    szablony: (Array.isArray(szablony) ? szablony : (typeof szablony!=="undefined" ? szablony : [])),
    searchSaved: (typeof savedSearches==="function" ? savedSearches() : []),
    searchMode: (typeof searchMode!=="undefined" ? searchMode : "smart"),
    searchOpts: (typeof searchOpts!=="undefined" ? searchOpts : null),
    autoTopics: (typeof autoTematyEksport==="function" ? autoTematyEksport() : {custom:[]}),
    deletedTags: (Array.isArray(deletedTagNames) ? deletedTagNames : []),
    deletedGuids: (Array.isArray(deletedGuids) ? deletedGuids : []),
    centrumLayout: (typeof centrUklad==="function" ? centrUklad() : lsGet("jws_centrum_layout_306", null)),
    centrum: (typeof _centrEksportDanych==="function" ? _centrEksportDanych() : null)
  };
}

function bezpieczneWyszukiwania(data){
  const zapisane=(Array.isArray(data&&data.searchSaved)?data.searchSaved:[]).slice(0,30).map((x,i)=>{
    if(!x || typeof x!=="object" || typeof x.q!=="string") return null;
    const q=x.q.trim().slice(0,300); if(!q && !x.opts) return null;
    return {id:(typeof x.id==="string"?x.id:"s-import-"+i+"-"+Date.now()).slice(0,80),
      name:(typeof x.name==="string"?x.name:q||"Wyszukiwanie").trim().slice(0,80), q,
      mode:x.mode==="exact"?"exact":"smart", opts:bezpieczneOpcjeSzukania(x.opts), pin:!!x.pin};
  }).filter(Boolean);
  return zapisane;
}
function bezpieczneOpcjeSzukania(x){
  x=(x&&typeof x==="object")?x:{};
  return {
    scope:["current","all"].includes(x.scope)?x.scope:"current",
    group:["all","bible","publication","own"].includes(x.group)?x.group:"all",
    dateFrom:/^\d{4}-\d{2}-\d{2}$/.test(x.dateFrom||"")?x.dateFrom:"",
    dateTo:/^\d{4}-\d{2}-\d{2}$/.test(x.dateTo||"")?x.dateTo:"",
    highlight:["all","has","1","2","3","4","5","6","7"].includes(String(x.highlight))?String(x.highlight):"all",
    extra:["all","fav","pin","img","edited","week"].includes(x.extra)?x.extra:"all"
  };
}

/**
 * Zapisuje kopię danych.
 * Gdy wskazano stały plik i jest do niego prawo — nadpisuje go po cichu.
 * W przeciwnym razie pobiera nowy plik z datą w nazwie, jak dotąd.
 */
async function exportJson(){
  const tekst = JSON.stringify(daneKopii());
  const uchwyt = await uchwytKopii();
  if(uchwyt){
    try{
      if(await prawoDoPliku(uchwyt, true)){
        const zapis = await uchwyt.createWritable();
        await zapis.write(tekst);
        await zapis.close();
        clearDirty();
        toastOk("Nadpisano kopię: " + (uchwyt.name || "plik"));
        return;
      }
      toast("Brak prawa do zapisu w tym pliku — pobieram nowy");
    }catch(e){
      console.warn("Nie udało się nadpisać pliku kopii", e);
      toast("Nie udało się nadpisać pliku — pobieram nowy");
    }
  }
  const name = "moje-notatki-kopia-" + new Date().toISOString().substring(0,10) + ".json";
  saveFile(new Blob([tekst], {type:"application/json"}), name, "Kopia notatek (JSON)");
  clearDirty();
  toast("Zapisano kopię danych");
}

/* ================= CENTRUM BEZPIECZEŃSTWA DANYCH ================= */
let _bezpKontrolaCache=null;
function bezpUniewaznijKontrole(){ _bezpKontrolaCache=null; }
function bezpBajty(n){
  n=Number(n)||0;
  if(n>=1073741824) return (n/1073741824).toFixed(n>=10737418240?1:2)+" GB";
  if(n>=1048576) return (n/1048576).toFixed(n>=104857600?0:1)+" MB";
  if(n>=1024) return (n/1024).toFixed(1)+" KB";
  return n+" B";
}
function bezpStan(id,typ,tekst){
  const el=$(id); if(!el)return;
  el.className="bezp-stan"+(typ?" "+typ:""); el.textContent=tekst;
}
function bezpWynik(typ,html){
  const el=$("bezpFileResult"); if(!el)return;
  el.className="bezp-result show "+typ; el.innerHTML=html;
}
function bezpLadnaData(iso){
  if(!iso)return "";
  try{return new Date(iso).toLocaleString("pl-PL",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"});}catch(_){return iso;}
}
function bezpOddajKlatke(){ return new Promise(r=>setTimeout(r,0)); }
async function bezpPoliczZdjecia(lista){
  let ile=0;
  for(let i=0;i<lista.length;i++){
    ile+=((lista[i]&&lista[i].h||"").match(/<img\b/gi)||[]).length;
    if(i&&i%500===0) await bezpOddajKlatke();
  }
  return ile;
}
async function bezpPokazPamiec(){
  const det=$("bezpStorageDetail"), meter=$("bezpStorageMeter"), pasek=meter&&meter.querySelector("span");
  try{
    if(!(navigator.storage&&navigator.storage.estimate)) throw new Error("brak estimate");
    const e=await navigator.storage.estimate(), usage=+e.usage||0, quota=+e.quota||0;
    const wolne=Math.max(0,quota-usage), pct=quota?Math.min(100,Math.round(usage/quota*100)):0;
    det.innerHTML=`Zajęte: <strong>${bezpBajty(usage)}</strong>${quota?` · Wolne: <strong>${bezpBajty(wolne)}</strong> · Limit: ${bezpBajty(quota)}`:""}`;
    if(pasek)pasek.style.width=pct+"%";
    if(meter)meter.className="bezp-meter"+(pct>=90?" err":pct>=75?" warn":"");
    bezpStan("bezpStorageState",pct>=90?"err":pct>=75?"warn":"ok",quota?pct+"% zajęte":"Odczytano");
  }catch(e){
    det.textContent="Ta przeglądarka nie udostępnia dokładnych danych o zajętym i wolnym miejscu.";
    if(meter)meter.style.display="none";
    bezpStan("bezpStorageState","warn","Brak danych");
  }
}
async function odswiezCentrumBezpieczenstwa(){
  const zywe=notes.filter(n=>!n.del).length, kosz=notes.length-zywe;
  $("bezpNotes").textContent=zywe.toLocaleString("pl-PL");
  $("bezpNotesSub").textContent=kosz?kosz+" w koszu":"kosz jest pusty";
  $("bezpTags").textContent=tags.length.toLocaleString("pl-PL");
  $("bezpImages").textContent="…";
  bezpPoliczZdjecia(notes).then(n=>{if($("modalBezpieczenstwo").classList.contains("show")) $("bezpImages").textContent=n.toLocaleString("pl-PL");});
  const iso=lsGet(KP+"LastBkIso",null)||lsGet(KP+"LastBk",null), dni=backupDaysAgo(), dirty=+(lsGet(KP+"Dirty",0)||0);
  $("bezpBackup").textContent=!iso?"Brak":dni===0?"Dzisiaj":dni===1?"Wczoraj":dni+" dni temu";
  $("bezpBackupSub").textContent=!iso?"zrób pierwszą kopię":(bezpLadnaData(iso)+(dirty?" · "+dirty+" zmian poza kopią":" · aktualna"));
  bezpPokazPamiec();
}
function bezpPokazKontrole(w){
  if(!w)return;
  bezpStan("bezpDbState",w.typ,w.tytul);
  $("bezpDbDetail").innerHTML=w.html;
}
async function sprawdzBazeDanych(wymus){
  if(_bezpKontrolaCache&&!wymus){bezpPokazKontrole(_bezpKontrolaCache);return _bezpKontrolaCache;}
  const btn=$("bezpCheckDb"); if(btn)btn.disabled=true;
  bezpStan("bezpDbState","","Sprawdzam…");
  $("bezpDbDetail").textContent="Odczytuję rekordy i sprawdzam ich powiązania.";
  try{
    if(!idb) throw new Error("Trwała pamięć IndexedDB nie jest dostępna");
    const [dbNotes,dbTags,ileWersji]=await Promise.all([
      idbAll("notes"),idbAll("tags"),idb.objectStoreNames.contains("wersje")?idbCount("wersje"):Promise.resolve(0)
    ]);
    const tagIds=new Set(), guidy=new Set(); let bledneTagi=0,bledneNotatki=0,brakTagu=0,duplikaty=0;
    for(const t of dbTags){
      if(!t||!Number.isFinite(+t.id)||typeof t.name!=="string") bledneTagi++;
      else tagIds.add(+t.id);
    }
    for(let i=0;i<dbNotes.length;i++){
      const n=dbNotes[i];
      if(!n||typeof n.g!=="string"||!n.g||!Array.isArray(n.tg)){bledneNotatki++;continue;}
      if(guidy.has(n.g))duplikaty++; else guidy.add(n.g);
      for(const id of n.tg) if(!tagIds.has(+id)) brakTagu++;
      if(i&&i%500===0)await bezpOddajKlatke();
    }
    const rozneN=dbNotes.length!==notes.length, rozneT=dbTags.length!==tags.length;
    const problem=bledneTagi+bledneNotatki+brakTagu+duplikaty;
    const typ=problem?"err":(rozneN||rozneT)?"warn":"ok";
    const tytul=problem?"Wymaga uwagi":(rozneN||rozneT)?"Dane w trakcie zapisu":"Baza poprawna";
    let html=`W pamięci trwałej: <strong>${dbNotes.length.toLocaleString("pl-PL")} notatek</strong>, <strong>${dbTags.length.toLocaleString("pl-PL")} etykiet</strong> i ${ileWersji.toLocaleString("pl-PL")} historii wersji.`;
    if(problem)html+=`<br>Nieprawidłowe rekordy: ${bledneNotatki+bledneTagi}; brakujące powiązania etykiet: ${brakTagu}; duplikaty identyfikatorów: ${duplikaty}. Zrób kopię przed dalszymi zmianami.`;
    else if(rozneN||rozneT)html+=`<br>Liczba na ekranie chwilowo różni się od zapisu. Odczekaj kilka sekund i sprawdź ponownie.`;
    else html+=`<br>Odczyt kontrolny i wszystkie powiązania zakończyły się prawidłowo.`;
    _bezpKontrolaCache={typ,tytul,html}; bezpPokazKontrole(_bezpKontrolaCache); return _bezpKontrolaCache;
  }catch(e){
    _bezpKontrolaCache={typ:"err",tytul:"Nie można sprawdzić",html:`Nie udało się odczytać trwałej pamięci: <strong>${esc(e&&e.message||"nieznany błąd")}</strong>. Zrób kopię danych, jeśli aplikacja nadal je wyświetla.`};
    bezpPokazKontrole(_bezpKontrolaCache); return _bezpKontrolaCache;
  }finally{if(btn)btn.disabled=false;}
}
async function bezpSprawdzPlikKopii(file){
  const btn=$("bezpCheckBackup"); if(btn)btn.disabled=true;
  bezpWynik("warn","Sprawdzam plik — nic nie zostanie wczytane ani nadpisane…");
  try{
    if(!file)throw new Error("Nie wybrano pliku");
    if(!file.size)throw new Error("Plik jest pusty");
    if(file.size>MAX_KOPIA_JSON)throw new Error("Plik jest większy niż dopuszczalny limit "+bezpBajty(MAX_KOPIA_JSON));
    let data; try{data=JSON.parse(await file.text());}catch(_){throw new Error("To nie jest poprawny plik JSON");}
    if(!data||typeof data!=="object"||!Array.isArray(data.notes)||!Array.isArray(data.tags))throw new Error("Plik nie ma struktury kopii JW Study");
    if(data.notes.length>MAX_NOTATEK||data.tags.length>MAX_ETYKIET)throw new Error("Plik przekracza bezpieczny limit liczby rekordów");
    const tagIds=new Set(),guidy=new Set();let bledne=0,brakTagu=0,duplikaty=0,zdjecia=0,kosz=0;
    for(const t of data.tags){if(!t||!Number.isFinite(+t.id)||typeof t.name!=="string")bledne++;else tagIds.add(+t.id);}
    for(let i=0;i<data.notes.length;i++){
      const n=data.notes[i];
      if(!n||typeof n.g!=="string"||!n.g||!Array.isArray(n.tg)){bledne++;continue;}
      if(guidy.has(n.g))duplikaty++;else guidy.add(n.g);
      for(const id of n.tg)if(!tagIds.has(+id))brakTagu++;
      zdjecia+=((n.h||"").match(/<img\b/gi)||[]).length;if(n.del)kosz++;
      if(i&&i%500===0)await bezpOddajKlatke();
    }
    if(bledne||duplikaty)throw new Error("Plik zawiera nieprawidłowe rekordy ("+(bledne+duplikaty)+")");
    const typ=brakTagu?"warn":"ok";
    bezpWynik(typ,`<strong>${esc(file.name)}</strong> jest czytelną kopią.<br>${data.notes.length.toLocaleString("pl-PL")} notatek (${kosz} w koszu), ${data.tags.length.toLocaleString("pl-PL")} etykiet i ${zdjecia.toLocaleString("pl-PL")} zdjęć.${brakTagu?`<br>Uwaga: ${brakTagu} przypisań wskazuje nieistniejącą etykietę.`:""}<br><b>Plik został tylko sprawdzony — nie wczytano go.</b>`);
  }catch(e){bezpWynik("err",`Nie można uznać pliku za poprawną kopię: <strong>${esc(e&&e.message||"nieznany błąd")}</strong>.`);}
  finally{if(btn)btn.disabled=false;const inp=$("bezpBackupInput");if(inp)inp.value="";}
}
function otworzCentrumBezpieczenstwa(){
  openModal("modalBezpieczenstwo");
  const r=$("bezpFileResult"); if(r)r.className="bezp-result";
  odswiezCentrumBezpieczenstwa(); sprawdzBazeDanych(false);
}
$("btnBackup").onclick=otworzCentrumBezpieczenstwa;
$("bezpCheckDb").onclick=()=>sprawdzBazeDanych(true);
$("bezpMakeBackup").onclick=async()=>{await exportJson();setTimeout(()=>{odswiezCentrumBezpieczenstwa();bezpWynik("ok","Kopia została przygotowana. Zachowaj plik poza tym urządzeniem — najlepiej także w iCloud, OneDrive lub Dysku Google.");},120);};
$("bezpCheckBackup").onclick=()=>$("bezpBackupInput").click();
$("bezpBackupInput").onchange=e=>bezpSprawdzPlikKopii(e.target.files&&e.target.files[0]);
/* ===== SCALANIE KOPII (dołącz brakujące, zachowaj to, co masz) =====
   Etykiety i sekcje z innego urządzenia mogą mieć INNE numery, więc dopasowujemy je
   po nazwie i przenumerowujemy w wczytywanych notatkach. */
/* takeLayout=true → przenosi też UKŁAD: przypisanie etykiet do sekcji, kolory i kolejność.
   Dzięki temu porządek zrobiony na jednym urządzeniu pojawia się na pozostałych. */
/**
 * @param {Object} data  wczytana kopia
 * @param {boolean} takeLayout  przenieś też układ etykiet
 * @param {boolean} [nadpisuj]  nadpisz notatki o tym samym identyfikatorze
 *   NIEZALEŻNIE od dat. Potrzebne, gdy powtarzasz przenoszenie z innego programu:
 *   data zmiany pochodzi wtedy ze źródła i się nie zmienia, więc bez tego
 *   poprawiona treść nigdy by nie weszła.
 */
function mergeBackup(data, takeLayout, nadpisuj){
  const st = {notesAdded:0, notesUpdated:0, notesKept:0, tagsAdded:0, secAdded:0, tabsAdded:0, zakSekAdded:0, organized:0};

  // 1) Sekcje — dopasuj po nazwie
  const secMap = {};
  (Array.isArray(data.sections)?data.sections:[]).forEach(s=>{
    let mine = sections.find(x=>norm(x.name)===norm(s.name));
    if(!mine){
      mine = {id:nextSecId(), name:s.name, ord:(s.ord??sections.length), open:true, color:s.color};
      sections.push(mine);
      st.secAdded++;
    } else if(takeLayout){
      if(s.color) mine.color = s.color;
      if(s.ord !== undefined) mine.ord = s.ord;
    }
    secMap[s.id] = mine.id;
  });

  // 2) Etykiety — dopasuj po nazwie, przenieś też projekty Centrum (cproj)
  const tagMap = {};
  (data.tags||[]).forEach(t=>{
    let mine = tags.find(x=>norm(x.name)===norm(t.name));
    if(!mine){
      if(!nadpisuj && deletedTagNames.includes(t.name)){ return; }
      if(nadpisuj && deletedTagNames.includes(t.name)){
        deletedTagNames = deletedTagNames.filter(x=>x!==t.name);
        saveDeletedTags();
      }
      mine = {id: nastepnyNumer(tags), name:t.name, color:t.color, nw:true};
      if(t.cproj) mine.cproj = true;
      if(t.sec !== undefined && secMap[t.sec] !== undefined) mine.sec = secMap[t.sec];
      if(t.ord !== undefined) mine.ord = t.ord;
      tags.push(mine);
      st.tagsAdded++;
    } else {
      if(t.cproj) mine.cproj = true;
      if(takeLayout){
        const wantSec = (t.sec !== undefined && secMap[t.sec] !== undefined) ? secMap[t.sec] : undefined;
        if(wantSec !== undefined && mine.sec !== wantSec){ mine.sec = wantSec; st.organized++; }
        else if(wantSec === undefined && mine.sec !== undefined && data.sections){ delete mine.sec; st.organized++; }
        if(t.color && t.color !== mine.color) mine.color = t.color;
        if(t.ord !== undefined) mine.ord = t.ord;
      }
    }
    tagMap[t.id] = mine.id;
  });

  // 3) Zakładki publikacji — dopasuj po parze (publikacja, nazwa)
  const tabMap = {};
  if(typeof pubTabs !== "undefined"){
    (Array.isArray(data.pubTabs)?data.pubTabs:[]).forEach(t=>{
      if(!t || !t.ks || !t.name) return;
      let mine = pubTabs.find(x=>x.ks===t.ks && norm(x.name)===norm(t.name));
      if(!mine){
        mine = {id: nastepnyNumer(pubTabs), ks:t.ks, name:t.name,
                ord:(t.ord!==undefined?t.ord:pubTabs.filter(x=>x.ks===t.ks).length)};
        pubTabs.push(mine);
        st.tabsAdded = (st.tabsAdded||0)+1;
      } else if(takeLayout && t.ord !== undefined){
        mine.ord = t.ord;
      }
      tabMap[t.id] = mine.id;
    });
    if(st.tabsAdded && typeof savePubTabs === "function") savePubTabs();
  }

  // 3b) Zakładki sekcji
  const zakMap = {};
  if(typeof secTabs !== "undefined"){
    (Array.isArray(data.secTabs)?data.secTabs:[]).forEach(z=>{
      if(!z || !z.name) return;
      const docelowaSekcja = (z.sec!==undefined && secMap[z.sec]!==undefined) ? secMap[z.sec] : z.sec;
      let mine = secTabs.find(x=>x.sec===docelowaSekcja && norm(x.name)===norm(z.name));
      if(!mine){
        mine = {id: nastepnyNumer(secTabs), sec: docelowaSekcja, name: z.name,
                ord: (z.ord!==undefined ? z.ord : secTabs.filter(x=>x.sec===docelowaSekcja).length)};
        if(z.color) mine.color = z.color;
        secTabs.push(mine);
        st.zakSekAdded = (st.zakSekAdded||0)+1;
      } else if(takeLayout){
        if(z.ord !== undefined) mine.ord = z.ord;
        if(z.color) mine.color = z.color;
      }
      zakMap[z.id] = mine.id;
    });
    if(st.zakSekAdded && typeof saveSecTabs === "function") saveSecTabs();
  }

  // 3c) Etykiety przypisane do zakładek sekcji
  (Array.isArray(data.tags)?data.tags:[]).forEach(t=>{
    if(t.stb===undefined || tagMap[t.id]===undefined) return;
    const moja = tags.find(x=>x.id===tagMap[t.id]);
    if(moja && zakMap[t.stb]!==undefined) moja.stb = zakMap[t.stb];
  });

  // 3d) Szablony
  if(typeof szablony !== "undefined" && Array.isArray(data.szablony)){
    let doszlo = 0;
    data.szablony.forEach(z=>{
      if(!z || typeof z!=="object") return;
      const nazwa = typeof z.nazwa==="string" ? z.nazwa.trim() : "";
      if(!nazwa) return;
      if(szablony.some(x=>norm(x.nazwa)===norm(nazwa))) return;
      szablony.push({
        id: nastepnyNumer(szablony),
        typ: z.typ==="fragment"?"fragment":"template",
        nazwa: nazwa.slice(0,60),
        tytul: typeof z.tytul==="string" ? z.tytul.slice(0,200) : "",
        tresc: typeof z.tresc==="string" ? z.tresc.slice(0,20000) : "",
        ord: szablony.length * 10
      });
      doszlo++;
    });
    if(doszlo){ saveSzablony(); st.szablonyAdded = doszlo; }
  }

  // 3e) Układ Centrum
  if(takeLayout && data.centrumLayout){
    try{
      if(typeof centrZapiszUklad === "function") centrZapiszUklad(data.centrumLayout);
      else lsSet("jws_centrum_layout_306", JSON.stringify(data.centrumLayout));
    }catch(_){}
  }

  // 4) Notatki — identyfikator, data zmiany oraz zachowanie Centrum (cenq, ceni, pwt, rb)
  const byG = {};
  notes.forEach(n=>byG[n.g]=n);
  const changed = [];

  (Array.isArray(data.notes)?data.notes:[]).forEach(inc=>{
    const mapped = {...inc, tg:(inc.tg||[]).map(id=>tagMap[id]).filter(v=>v!==undefined)};
    if(mapped.ptb !== undefined){
      if(tabMap[mapped.ptb] !== undefined) mapped.ptb = tabMap[mapped.ptb];
      else delete mapped.ptb;
    }
    if(mapped.stb !== undefined){
      if(zakMap[mapped.stb] !== undefined) mapped.stb = zakMap[mapped.stb];
      else delete mapped.stb;
    }
    const mine = byG[inc.g];
    if(!mine){
      notes.push(mapped);
      changed.push(mapped);
      st.notesAdded++;
      return;
    }
    const a = (mapped.mo || "");
    const b = (mine.mo || "");
    if(nadpisuj || a > b){
      Object.assign(mine, mapped);
      changed.push(mine);
      st.notesUpdated++;
    } else {
      // WAŻNE: Przeniesienie statusów Centrum Studium, zakładek i powtórek nawet gdy data notatki jest taka sama!
      let zaktualizowano = false;
      if(mapped.cenq && mine.cenq !== mapped.cenq){ mine.cenq = mapped.cenq; zaktualizowano = true; }
      if(mapped.ceni && mine.ceni !== mapped.ceni){ mine.ceni = mapped.ceni; zaktualizowano = true; }
      if(mapped.pwt && JSON.stringify(mine.pwt) !== JSON.stringify(mapped.pwt)){ mine.pwt = mapped.pwt; zaktualizowano = true; }
      if(mapped.rb && Array.isArray(mapped.rb) && (!mine.rb || !mine.rb.length)){ mine.rb = mapped.rb; zaktualizowano = true; }
      if(mapped.ptb !== undefined && mine.ptb !== mapped.ptb){ mine.ptb = mapped.ptb; zaktualizowano = true; }
      if(mapped.stb !== undefined && mine.stb !== mapped.stb){ mine.stb = mapped.stb; zaktualizowano = true; }
      if(zaktualizowano){
        changed.push(mine);
        st.notesUpdated++;
      } else {
        st.notesKept++;
      }
    }
  });

  return {st, changed};
}
/**
 * Obsługa wybranego pliku kopii JSON: sprawdzenie formatu, przepuszczenie przez sito
 * i pytanie o sposób wczytania (dołącz, dołącz z układem, zastąp wszystko).
 * @param {Event} e  zdarzenie zmiany pola wyboru pliku
 */
async function handleJsonFile(e){
  const f=e.target.files[0]; e.target.value="";
  if(!f) return;
  let tekstPliku;
  try{
    if(f.size > MAX_KOPIA_JSON)
      throw new Error("Plik ma "+ludzkiRozmiar(f.size)+", a dopuszczalne jest do "+
                      ludzkiRozmiar(MAX_KOPIA_JSON)+" — to nie wygląda na kopię notatek");
    if(f.size === 0) throw new Error("Plik jest pusty");
    tekstPliku = await f.text();
  }catch(err){ toastErr("Nie wczytano kopii: "+err.message); return; }
  return wczytajKopieZTekstu(tekstPliku);
}

/**
 * Wczytanie kopii z gotowego tekstu.
 *
 * Wydzielone z obsługi pliku, bo na telefonie plik bywa nieosiągalny: aplikacja
 * uruchomiona z ikony na ekranie głównym nie zawsze dogaduje się z wyborem
 * pliku, a przeniesienie z OneNote kończy się tekstem, który łatwiej wkleić niż
 * zapisać i odszukać. Ta sama droga, to samo sprawdzanie — inne tylko wejście.
 */
async function wczytajKopieZTekstu(tekstPliku){
  let data;
  try{
    if(!idb && typeof otworzBaze === "function"){
      try { await otworzBaze(); } catch(_) {}
    }
    if(!idb){ pokazBrakPamieci(); throw bladBrakuPamieci(); }
    const f = {size: (tekstPliku||"").length};
    if(f.size > MAX_KOPIA_JSON)
      throw new Error("Dane mają "+ludzkiRozmiar(f.size)+", a dopuszczalne jest do "+
                      ludzkiRozmiar(MAX_KOPIA_JSON)+" — to nie wygląda na kopię notatek");
    const tekst = (tekstPliku||"").trim();
    if(!tekst) throw new Error("Nie ma czego wczytać — plik jest pusty");
    try{ data = JSON.parse(tekst); }
    catch(e){ throw new Error("To nie jest poprawny plik formatu JSON (błąd składni)"); }
    if(!data || typeof data!=="object") throw new Error("Plik nie zawiera obiektu lub listy notatek");

    // Elastyczna normalizacja formatów (obsługa tablicy [], {notes:[]}, {notatki:[]}, {items:[]}, {data:[]}, itp.)
    if(Array.isArray(data)){
      data = { notes: data, tags: [] };
    } else {
      if(!Array.isArray(data.notes)){
        if(Array.isArray(data.notatki)) data.notes = data.notatki;
        else if(Array.isArray(data.items)) data.notes = data.items;
        else if(Array.isArray(data.data)) data.notes = data.data;
        else if(Array.isArray(data.cards)) data.notes = data.cards;
        else if(Array.isArray(data.records)) data.notes = data.records;
        else data.notes = [];
      }
      if(!Array.isArray(data.tags)){
        if(Array.isArray(data.etykiety)) data.tags = data.etykiety;
        else if(Array.isArray(data.categories)) data.tags = data.categories;
        else data.tags = [];
      }
    }

    // Normalizacja pól notatek
    let noteIdx = 1;
    data.notes = (data.notes || []).map(n => {
      if(!n || typeof n !== "object") return null;
      const c = Object.assign({}, n);
      if(c.title !== undefined && !c.t) c.t = c.title;
      if(c.tytul !== undefined && !c.t) c.t = c.tytul;
      if(c.name !== undefined && !c.t) c.t = c.name;
      if(c.subject !== undefined && !c.t) c.t = c.subject;

      if(c.content !== undefined && !c.c) c.c = c.content;
      if(c.tresc !== undefined && !c.c) c.c = c.tresc;
      if(c.body !== undefined && !c.c) c.c = c.body;
      if(c.text !== undefined && !c.c) c.c = c.text;

      if(c.html !== undefined && !c.h) c.h = c.html;

      if(!c.g){
        c.g = c.id || c.guid || c.uuid || c.key || ("note_" + Date.now() + "_" + (noteIdx++) + "_" + Math.random().toString(36).slice(2, 6));
      }
      return c;
    }).filter(Boolean);

    // Normalizacja pól etykiet
    let tagIdx = 1;
    data.tags = (data.tags || []).map(t => {
      if(!t || typeof t !== "object") return null;
      const copy = Object.assign({}, t);
      if(copy.name === undefined && copy.nazwa !== undefined) copy.name = copy.nazwa;
      if(copy.name === undefined && copy.title !== undefined) copy.name = copy.title;
      if(copy.id === undefined) copy.id = tagIdx++;
      return copy;
    }).filter(Boolean);

    // Sito na wejściu: uszkodzone rekordy odpadają, zanim trafią do aplikacji
    data.notes = sanitizeNotes(data.notes, "wczytana kopia", true);
    data.tags  = sanitizeTags(data.tags, "wczytana kopia", true);

    if(Array.isArray(data.sections)) data.sections = data.sections.filter(sek=>{
      if(!sek || typeof sek!=="object") return false;
      if(typeof sek.name!=="string" || !sek.name.trim()) return false;
      if(sek.color!=null && !kolorBezpieczny(sek.color)) delete sek.color;
      return true;
    });
    if(Array.isArray(data.pubTabs)) data.pubTabs = data.pubTabs.filter(z=>
      z && typeof z==="object" && typeof z.name==="string" && z.name.trim());
    if(Array.isArray(data.secTabs)) data.secTabs = data.secTabs.filter(z=>{
      if(!z || typeof z!=="object" || typeof z.name!=="string" || !z.name.trim()) return false;
      if(!isFinite(Number(z.id))) return false;
      if(z.color!=null && !kolorBezpieczny(z.color)) delete z.color;
      return true;
    });
    data.searchSaved = bezpieczneWyszukiwania(data);
    data.searchOpts = bezpieczneOpcjeSzukania(data.searchOpts);
    data.searchMode = data.searchMode==="exact" ? "exact" : "smart";
    data.autoTopics = autoTematySanity(data.autoTopics);

    if(Array.isArray(data.szablony)) data.szablony = data.szablony.reduce((lista, z)=>{
      if(!z || typeof z!=="object") return lista;
      const nazwa = typeof z.nazwa==="string" ? z.nazwa.trim() : "";
      if(!nazwa) return lista;
      lista.push({
        id: isFinite(Number(z.id)) ? Number(z.id) : lista.length+1,
        typ: z.typ==="fragment"?"fragment":"template",
        nazwa: nazwa.slice(0,60),
        tytul: typeof z.tytul==="string" ? z.tytul.slice(0,200) : "",
        tresc: typeof z.tresc==="string" ? z.tresc.replace(/<[^>]*>/g,"").slice(0,20000) : "",
        ord: isFinite(Number(z.ord)) ? Number(z.ord) : lista.length*10
      });
      return lista;
    }, []);

    if(data.notes.length > MAX_NOTATEK)
      throw new Error("Plik zawiera "+data.notes.length+" notatek, a dopuszczalne jest do "+MAX_NOTATEK);
    if(data.tags.length > MAX_ETYKIET)
      throw new Error("Plik zawiera "+data.tags.length+" etykiet, a dopuszczalne jest do "+MAX_ETYKIET);
    const ileZakladek = (data.pubTabs||[]).length + (data.secTabs||[]).length;
    if(ileZakladek > MAX_ZAKLADEK)
      throw new Error("Plik zawiera "+ileZakladek+" zakładek, a dopuszczalne jest do "+MAX_ZAKLADEK);
    if((data.szablony||[]).length > MAX_SZABLONOW)
      throw new Error("Plik zawiera "+data.szablony.length+" szablonów, a dopuszczalne jest do "+MAX_SZABLONOW);
    if(!data.notes.length && !data.tags.length)
      throw new Error("Plik nie zawiera ani jednej czytelnej notatki lub etykiety");
  }catch(err){
    console.error("Błąd wczytywania kopii:", err);
    if(typeof toastErr === "function") toastErr("Nie wczytano kopii: "+err.message);
    else alert("Nie wczytano kopii: "+err.message);
    return;
  }

  const incoming=(data.notes||[]).filter(n=>!n.del).length;
  const mineCount=notes.filter(n=>!n.del).length;
  const hasLayout = (Array.isArray(data.sections) && data.sections.length)
    || (Array.isArray(data.secTabs) && data.secTabs.length)
    || (data.tags||[]).some(t=>t.sec!==undefined||t.stb!==undefined||t.color);
  const choice = await askChoice("Wczytanie kopii danych",
    `<p class="ch-lead">W pliku: <b>${incoming}</b> notatek · na tym urządzeniu: <b>${mineCount}</b></p>`+
    `<dl class="ch-opts">`+
    `<dt>Dołącz + układ</dt><dd>Dokłada notatki i przenosi cały porządek: sekcje, przypisania, kolory oraz zakładki sekcji i publikacji. Wybierz, żeby na wszystkich urządzeniach było tak samo.</dd>`+
    `<dt>Dołącz (same notatki)</dt><dd>Dokłada tylko treść. Układ etykiet na tym urządzeniu zostaje bez zmian.</dd>`+
    `<dt>Dołącz + nadpisz istniejące</dt><dd>Jak wyżej, ale notatki, które już masz, dostają treść z pliku — nawet gdy daty są takie same. Wybierz, gdy <b>powtarzasz przenoszenie z innego programu</b> i chcesz poprawioną wersję.</dd>`+
    `<dt class="ch-danger">Zastąp wszystko</dt><dd>Usuwa obecne dane i wstawia zawartość pliku. <b>Tego nie da się cofnąć.</b></dd>`+
    `</dl>`,
    /* Kolejność od tego, co wybiera się najczęściej, po działanie nieodwracalne.
       Przyciski układają się w pionie, więc kolejność w tablicy = kolejność na ekranie. */
    [{label:"Dołącz + układ", value:"mergeLayout", style:"primary"},
     {label:"Dołącz + nadpisz istniejące", value:"mergeNadpisz"},
     {label:"Dołącz (same notatki)", value:"merge"},
     {label:"Zastąp wszystko", value:"replace", style:"danger"},
     {label:"Anuluj", value:"cancel"}]);
  if(choice==="cancel" || !choice) return;

  try{
    if(choice==="merge" || choice==="mergeLayout" || choice==="mergeNadpisz"){
      if(choice!=="merge"){
        const mapaAuto=autoTematyScal(data.autoTopics);
        (data.notes||[]).forEach(n=>{if(Array.isArray(n.atex))n.atex=n.atex.map(id=>mapaAuto[id]||id);});
      }
      const {st, changed} = mergeBackup(data, choice!=="merge", choice==="mergeNadpisz");
      sortTags();
      if(idb){
        await idbBulkChunked("tags", tags);
        if(changed.length) await idbBulkChunked("notes", changed);
        saveSections();
        if(typeof savePubTabs==="function") savePubTabs();   // zakładki publikacji z kopii
      }
      let stCentrum = null;
      if((data.centrum || data.centrumLayout) && typeof _centrImportDanych === "function"){
        try {
          const cPayload = data.centrum || (data.centrumLayout ? { layout: data.centrumLayout } : null);
          stCentrum = _centrImportDanych(cPayload, choice);
        } catch(eCentr){ console.warn("Błąd importu centrum:", eCentr); }
      }
      const kontrolaM = idb ? await sprawdzZapis(notes.length, tags.length) : null;
      renderAll();
      /* Do tablicy trafiło naraz dużo notatek — pamięć podręczna szukania
         buduje się od nowa w bezczynności, a nie przy pierwszym klawiszu. */
      setTimeout(()=>{
        if(!(typeof uruchomIndeksWorkerSzukania==="function" && uruchomIndeksWorkerSzukania()) && typeof rozgrzejCacheSzukania==="function") rozgrzejCacheSzukania();
      },300);
      showInfo("Kopia dołączona",
        (kontrolaM
          ? (kontrolaM.zgadza
              ? `<p class="ch-lead">Zapisano i sprawdzono: <b>${kontrolaM.notatki}</b> notatek · <b>${kontrolaM.etykiety}</b> etykiet</p>`
              : `<p class="ch-lead" style="color:#c0392b">Uwaga: w bazie jest <b>${kontrolaM.notatki}</b> notatek zamiast <b>${notes.length}</b>. Sprawdź miejsce na urządzeniu.</p>`)
          : "")+
        `• Nowych notatek: <b>${st.notesAdded}</b><br>`+
        `• Zaktualizowanych (nowsza wersja z pliku): <b>${st.notesUpdated}</b><br>`+
        `• Zachowanych bez zmian (Twoja wersja nowsza lub taka sama): <b>${st.notesKept}</b><br>`+
        (st.notesKept && !st.notesUpdated
          ? `<br><b>Nic się nie zmieniło?</b> Notatki z pliku miały tę samą datę co Twoje, `+
            `więc zostały pominięte. Jeśli chcesz wersję z pliku, wczytaj go ponownie `+
            `i wybierz <b>„Dołącz + nadpisz istniejące"</b>.<br>`
          : "")+
        `• Nowych etykiet: <b>${st.tagsAdded}</b>${st.secAdded?` · sekcji: <b>${st.secAdded}</b>`:""}`+
        (st.tabsAdded?`<br>• Nowych zakładek w publikacjach: <b>${st.tabsAdded}</b>`:"")+
        (st.zakSekAdded?`<br>• Nowych zakładek w sekcjach: <b>${st.zakSekAdded}</b>`:"")+
        (stCentrum && stCentrum.dniMerged ? `<br>• Dni w planach czytania: <b>+${stCentrum.dniMerged}</b>` : "")+
        (stCentrum && stCentrum.tematyMerged ? `<br>• Tematów studium: <b>+${stCentrum.tematyMerged}</b>` : "")+
        (choice==="mergeLayout" ? `<br>• Etykiet uporządkowanych wg układu z pliku: <b>${st.organized}</b>` : ""));
      return;
    }
    /* ===== ZASTĄP WSZYSTKO =====
       Kolejność jest tu istotna. Najpierw przygotowujemy komplet nowych danych,
       potem zapisujemy je do bazy JEDNĄ transakcją, a dopiero po jej udanym
       zakończeniu podmieniamy to, co widać na ekranie.

       Wcześniej było odwrotnie: pamięć podmieniana od razu, baza czyszczona
       osobno, zapis osobno. Gdy zapis padł, na urządzeniu zostawała pusta baza,
       a na ekranie dane, które po odświeżeniu znikały. Teraz nieudany zapis
       nie rusza ani bazy, ani ekranu. */
    const noweNotes = data.notes;
    const noweTags  = data.tags;
    const noweSekcje = (Array.isArray(data.sections)?data.sections:[])
      .filter(x=>x&&typeof x==="object"&&isFinite(Number(x.id))&&typeof x.name==="string");
    const noweZakladki = (Array.isArray(data.pubTabs)?data.pubTabs:[])
      .filter(x=>x&&typeof x==="object"&&x.ks&&typeof x.name==="string"&&x.name.trim());
    const noweZakladkiSekcji = (Array.isArray(data.secTabs)?data.secTabs:[])
      .filter(x=>x&&typeof x==="object"&&typeof x.name==="string"&&x.name.trim());
    /* Szablony też są zawartością kopii. Wcześniej ta droga ich nie ruszała:
       po „Zastąp wszystko" wszystko było z pliku, a szablony zostawały stare —
       czyli z urządzenia, którego reszty danych już nie ma. */
    const noweSzablony = Array.isArray(data.szablony) ? data.szablony : [];
    const noweAutoTematy = autoTematySanity(data.autoTopics);

    let kontrola = null;
    if(idb){
      await idbZastapWszystko(noweNotes, noweTags, noweSekcje, noweZakladki,
                              noweZakladkiSekcji, noweSzablony, noweAutoTematy);
      kontrola = await sprawdzZapis(noweNotes.length, noweTags.length);
      if(kontrola && !kontrola.zgadza){
        showInfo("Zapis niepełny",
          `Do bazy trafiło <b>${kontrola.notatki}</b> notatek i <b>${kontrola.etykiety}</b> etykiet, `+
          `a plik zawierał <b>${noweNotes.length}</b> i <b>${noweTags.length}</b>.<br><br>`+
          `Dane na ekranie <b>nie zostały podmienione</b>. Najczęstsza przyczyna to brak miejsca `+
          `na urządzeniu — zwolnij je i spróbuj ponownie.`);
        return;
      }
    }
    // dopiero teraz, po potwierdzonym zapisie, podmieniamy to, co widać
    /* Zapis do bazy zrobiła już transakcja wyżej — tutaj tylko zrównujemy z nią
       pamięć aplikacji. Żadnego save…() z osobna: to właśnie osobny zapis
       zakładek sekcji wyłamywał je z „wszystko albo nic". */
    notes = noweNotes; tags = noweTags; sections = noweSekcje;
    if(typeof pubTabs!=="undefined")  pubTabs  = noweZakladki;
    if(typeof secTabs!=="undefined")  secTabs  = noweZakladkiSekcji;
    if(typeof szablony!=="undefined"){ szablony = noweSzablony;
      if(typeof rysujSzablony==="function") rysujSzablony(); }
    autoTematyUstaw(noweAutoTematy,false);
    if(typeof storeSavedSearches==="function"){
      storeSavedSearches(Array.isArray(data.searchSaved)?data.searchSaved:[]);
      searchMode=data.searchMode==="exact"?"exact":"smart";
      searchOpts=bezpieczneOpcjeSzukania(data.searchOpts);
      lsSet(KP+"SearchMode",searchMode); lsSet(KP+"SearchOpts",JSON.stringify(searchOpts));
    }
    if((data.centrum || data.centrumLayout) && typeof _centrImportDanych === "function"){
      try {
        const cPayload = data.centrum || (data.centrumLayout ? { layout: data.centrumLayout } : null);
        _centrImportDanych(cPayload, "replace");
      } catch(eCentr){ console.warn("Błąd importu centrum:", eCentr); }
    }
    renderAll();
    /* Do tablicy trafiło naraz dużo notatek — pamięć podręczna szukania
       buduje się od nowa w bezczynności, a nie przy pierwszym klawiszu. */
    setTimeout(()=>{
      if(!(typeof uruchomIndeksWorkerSzukania==="function" && uruchomIndeksWorkerSzukania()) && typeof rozgrzejCacheSzukania==="function") rozgrzejCacheSzukania();
    },300);
    showInfo("Zastąpiono dane",
      `Zapisano i sprawdzono w bazie urządzenia:<br>`+
      `• Notatek: <b>${kontrola ? kontrola.notatki : noweNotes.length}</b><br>`+
      `• Etykiet: <b>${kontrola ? kontrola.etykiety : noweTags.length}</b>`+
      (noweSekcje.length ? `<br>• Sekcji: <b>${noweSekcje.length}</b>` : "")+
      (noweZakladki.length ? `<br>• Zakładek w publikacjach: <b>${noweZakladki.length}</b>` : "")+
      (noweZakladkiSekcji.length ? `<br>• Zakładek w sekcjach: <b>${noweZakladkiSekcji.length}</b>` : "")+
      (noweSzablony.length ? `<br>• Szablonów: <b>${noweSzablony.length}</b>` : "")+
      (data.centrum ? `<br>• Dane Centrum Studium i Planów: <b>przywrócone</b>` : "")+
      (kontrola ? "" : "<br><br><i>Baza urządzenia niedostępna — dane działają do zamknięcia karty.</i>"));
  }catch(err){
    console.warn("Wczytywanie kopii nie powiodło się", err);
    showInfo("Nie udało się wczytać kopii",
      `${esc(err && err.message ? err.message : String(err))}<br><br>`+
      `<b>Dotychczasowe dane pozostały nietknięte</b> — zapis odbywa się w całości albo wcale.`);
  }
}
