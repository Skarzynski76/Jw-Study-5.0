/* ==========================================================================
   JW Study — files.js
   Menu Plik, biblioteki CDN, wybór pliku, import backupu
   ========================================================================== */
"use strict";
/* ================= MENU PLIK ================= */
$("btnMenu").onclick = e=>{
  const dd=$("dropdown");
  const lastBk = lsGet(KP+"LastBk", null);
  const dirty = +(lsGet(KP+"Dirty",0)||0);
  const trashN = trashList().length;
  const undoIle = (typeof undoStack !== "undefined" && undoStack) ? undoStack.length : 0;
  const redoIle = (typeof redoStack !== "undefined" && redoStack) ? redoStack.length : 0;
  const ic = {
    down:_svg('<path d="M12 4v11"/><path d="M8 11l4 4 4-4"/><path d="M4 19h16"/>'),
    up:_svg('<path d="M12 20V9"/><path d="M8 13l4-4 4 4"/><path d="M4 5h16"/>'),
    cloud:_svg('<path d="M7 18a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.4-1.3A3.8 3.8 0 0 1 18 18z"/><path d="M12 12v5"/><path d="M9.5 14.5L12 12l2.5 2.5"/>'),
    folder:_svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    sync:_svg('<path d="M20 11a8 8 0 0 0-14.3-4.1"/><path d="M4 13a8 8 0 0 0 14.3 4.1"/><path d="M4 4v4h4"/><path d="M20 20v-4h-4"/>'),
    info:_svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="7.8" r="1" fill="currentColor" stroke="none"/>'),
    help:_svg('<circle cx="12" cy="12" r="9"/><path d="M9.4 9.2a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.2-2.6 3.9"/><circle cx="12" cy="17.2" r="1" fill="currentColor" stroke="none"/>')
  };
  dd.innerHTML = `
    <div class="dd-lbl">JW Library</div>
    <div data-m="import">${ic.down}Importuj backup <b>.jwlibrary</b>…</div>
    <div data-m="export">${ic.up}Eksportuj do JW Library</div>
    <div class="dd-sep"></div>
    <div class="dd-lbl">Notatki z innych aplikacji</div>
    <div data-m="smart">${ic.down}<b>Inteligentny import</b> <span class="dd-hint">PDF, Word, zdjęcia</span></div>
    <div data-m="apple">${ic.down}Importuj z Notatek Apple <span class="dd-hint">ZIP + Markdown</span></div>
    <div class="dd-sep"></div>
    <div class="dd-lbl">Inne urządzenia</div>
    <div data-m="sync">${ic.sync}Uzgodnij z iPhonem, iPadem, Makiem…</div>
    <div class="dd-sep"></div>
    <div class="dd-lbl">Kopia zapasowa</div>
    <div data-m="security">${ic.info}<b>Centrum bezpieczeństwa danych</b></div>
    <div data-m="json">${ICO.save}Zapisz kopię danych <span class="dd-hint">JSON</span></div>
    <div data-m="custom-export">${ic.up}<b>Eksport wybranych danych…</b> <span class="dd-hint">wybór</span></div>
    <div data-m="cloud">${ic.cloud}Zapisz kopię w chmurze <span class="dd-hint">iCloud, Drive…</span></div>
    <div data-m="loadjson">${ic.folder}Wczytaj kopię danych…</div>
    <div data-m="custom-import">${ic.down}<b>Import pakietu danych…</b> <span class="dd-hint">diff</span></div>
    ${backupStatusHtml()}
    <div class="dd-sep"></div>
    <!-- COFNIJ TAKŻE TUTAJ (2.77). W pasku górnym ten przycisk znika na
         telefonie razem z regulacją pisma i zapisem kopii — tylko że kopia ma
         swoje miejsce niżej w tym menu, pismo w Ustawieniach, a cofanie nie
         miało NIGDZIE. Na iPhonie nie ma też ⌘Z. Jedyna zmiana, której nie dało
         się odwołać, była zarazem tą, którą najłatwiej zrobić przez pomyłkę. -->
    <div data-m="undo"${undoIle ? "" : ' class="dd-off"'}>${ICO.undo}Cofnij ostatnią zmianę${
      undoIle ? ` <span class="dd-badge">${undoIle}</span>` : ' <span class="dd-hint">nie ma czego cofać</span>'}</div>
    <div data-m="redo"${redoIle ? "" : ' class="dd-off"'}><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 7l5 5-5 5"/><path d="M20 12H9a5 5 0 0 0 0 10h3"/></svg>Ponów cofniętą zmianę${
      redoIle ? ` <span class="dd-badge">${redoIle}</span>` : ' <span class="dd-hint">nie ma czego ponawiać</span>'}</div>
    <div class="dd-sep"></div>
    <div data-m="trash">${ICO.trash}Kosz${trashN ? ` <span class="dd-badge">${trashN}</span>` : ""}</div>
    <div data-m="info">${ic.info}Gdzie zapisują się moje dane?</div>
    <div data-m="help">${ic.help}Jak to działa — samouczek</div>
    <div class="dd-sep"></div>
    <div class="dd-status ${offlineReady()?"ok":"warn"}"><span class="dd-dot"></span>${offlineReady() ? "Tryb offline gotowy" : "Tryb offline jeszcze niegotowy"}</div>
    <div class="dd-note" id="ddStorage">Sprawdzam zajętość pamięci…</div>`;
  dd.style.display="block";
  showStorageInfo();
  placeDropdown(dd, e.currentTarget);
  dd.onclick=ev=>{
    /* Pozycja zawiera SVG, <b> i opis. Na dotyku celem zdarzenia jest zwykle
       właśnie ten element wewnętrzny, dlatego odczytujemy data-m z całego
       najbliższego wiersza. */
    const pozycja=ev.target && ev.target.closest ? ev.target.closest("[data-m]") : null;
    if(!pozycja || !dd.contains(pozycja)) return;
    const m=pozycja.dataset.m;
    dd.style.display="none";
    if(m==="sync"){ if(typeof syncUzgodnijTeraz==="function") syncUzgodnijTeraz(); }
    else if(m==="security"){ if(typeof otworzCentrumBezpieczenstwa==="function") otworzCentrumBezpieczenstwa(); }
    else if(m==="import")openFilePicker("jwl");
    else if(m==="smart")otworzSmartImport();
    else if(m==="apple")openFilePicker("apple");
    else if(m==="export")startExport();
    else if(m==="json")exportJson();
    else if(m==="custom-export"){ if(window.GranularSync) window.GranularSync.openExport(); }
    else if(m==="cloud")shareBackup();
    else if(m==="loadjson")openFilePicker("json");
    else if(m==="custom-import"){ if(window.GranularSync) window.GranularSync.openImport(); }
    else if(m==="undo"){ if(typeof doUndo === "function" && undoIle) doUndo(); }
    else if(m==="redo"){ if(typeof doRedo === "function" && redoIle) doRedo(); }
    else if(m==="trash")openTrash();
    else if(m==="info")openModal("modalInfo");
    else if(m==="help")openModal("modalHelp");
  };
};
$("trashEmpty").onclick = emptyTrash;
/* Zamykanie przy dotknięciu obok — wspólne dla wszystkich okienek, w 45-zamykanie.js */

/* =====================================================================
   BIBLIOTEKI DO IMPORTU Z JW LIBRARY

   Plik .jwlibrary to archiwum ZIP z bazą SQLite w środku. Do jego otwarcia
   potrzebne są dwie biblioteki: JSZip i sql.js.

   Leżą OBOK APLIKACJI, w katalogu lib/, i są wgrywane razem z nią. Aplikacja
   nie sięga po nie do żadnego obcego serwera — nie potrafi tego zrobić, bo
   polityka bezpieczeństwa treści w kodzie strony dopuszcza wyłącznie adresy
   z tego samego miejsca.

   Wcześniej pobierały się z cdnjs. Działało to od pierwszej wersji, po cichu.
   Ryzyko było teoretyczne, ale realne: obcy kod wykonuje się z dostępem do
   wszystkich notatek, więc jego podmiana na serwerze albo po drodze
   oznaczałaby dostęp do nich. Zamiast pytać użytkownika za każdym razem,
   biblioteki są po prostu częścią aplikacji.
   ===================================================================== */
const BIBLIOTEKI = {
  jszip: {pliki: ["./lib/jszip.min.js", "./jszip.min.js"], nazwa: "JSZip"},
  sqljs: {pliki: ["./lib/sql-wasm.js", "./sql-wasm.js"],  nazwa: "sql.js"}
};

/** Wczytuje skrypt z katalogu obok aplikacji. */
function loadScript(src){
  return new Promise((res, rej)=>{
    const jest=document.querySelector(`script[src="${src}"][data-ok="1"]`);
    if(jest) return res();
    const s = document.createElement("script");
    s.src = src;
    const timer=setTimeout(()=>{s.remove();rej(new Error("Przekroczono czas wczytywania: "+src+". Sprawdź połączenie lub kompletność plików aplikacji."));},30000);
    s.onload = ()=>{ clearTimeout(timer);s.dataset.ok="1"; res(); };
    s.onerror = ()=>{ clearTimeout(timer);s.remove(); rej(new Error("Nie można wczytać: "+src+". Wgraj cały katalog lib/ z paczki aplikacji.")); };
    document.head.appendChild(s);
  });
}
let SQL = null;
async function getLibs(){
  let sqlPlik="";
  for(const klucz of ["jszip","sqljs"]){
    const opis = BIBLIOTEKI[klucz];
    let plik="";
    /* Próba wczytania działa także offline z pamięci service workera. Sam test
       HEAD nie działał bez sieci, choć biblioteka była już zapisana na urządzeniu. */
    for(const kandydat of opis.pliki){
      try{ await loadScript(kandydat); plik=kandydat; break; }catch(e){}
    }
    if(!plik)
      throw new Error("Brakuje biblioteki "+opis.nazwa+". Wgraj pliki jszip.min.js, sql-wasm.js i sql-wasm.wasm z paczki obok index.html. Bez nich nie da się otworzyć archiwum .jwlibrary.");
    if(klucz==="sqljs") sqlPlik=plik;
  }
  if(!SQL){
    const baza=sqlPlik.startsWith("./lib/") ? "./lib/" : "./";
    SQL = await initSqlJs({locateFile: f => baza + f});
  }
}
/** Notatki Apple są zwykłym ZIP-em — nie wymagają cięższej biblioteki SQLite. */
async function getZipLib(){
  if(typeof JSZip!=="undefined") return JSZip;
  if(document.getElementById("smartAsset-jszip.min.js"))return smartWbudowanySkrypt("jszip.min.js","JSZip");
  for(const kandydat of BIBLIOTEKI.jszip.pliki){
    try{ await loadScript(kandydat); if(typeof JSZip!=="undefined") return JSZip; }catch(e){}
  }
  throw new Error("Brakuje biblioteki JSZip. Wgraj cały katalog lib/ razem z index.html.");
}

/* ================= WYBÓR PLIKU (import / kopia JSON) ================= */
function openFilePicker(mode){
  $("mfTitle").textContent = mode==="jwl" ? "📥 Import backupu JW Library"
    : mode==="apple" ? "🍎 Import z Notatek Apple" : "📂 Wczytanie kopii danych";
  $("mfDesc").textContent = mode==="jwl"
    ? "Wybierz plik .jwlibrary (kopię zapasową z aplikacji JW Library). Aplikacja doda tylko nowe notatki — Twoje zmiany zostaną."
    : mode==="apple"
      ? "Wybierz plik ZIP utworzony w aplikacji Pliki z notatek wyeksportowanych jako Markdown. Zachowam tytuły, formatowanie, linki i ilustracje; przed zapisem zobaczysz podsumowanie."
      : "Wybierz zapisany wcześniej plik kopii (.json). W następnym kroku wybierzesz, czy dołączyć brakujące notatki (scalanie), czy zastąpić wszystko.\n\nPrzenosisz notatki z OneNote? Otwórz stronę onenote.html obok aplikacji. Na telefonie skopiuj tam kopię do schowka i użyj poniżej „Wklej treść”.";
  const inp = $("mfInput");
  inp.value = "";
  /* Bez ograniczenia rozszerzeń. Android i część systemów Windows nie zna
     rozszerzenia .jwlibrary i przy ustawionym „accept" po prostu ukrywa plik —
     użytkownik widzi pusty wybór i nie wie dlaczego. Zawartość i tak sprawdzamy
     po otwarciu: archiwum, obecność userData.db i nagłówek bazy SQLite. */
  inp.accept = "";
  inp.dataset.mode = mode;
  openModal("modalFile");
}
/* Droga awaryjna dla telefonu.
   W aplikacji uruchomionej z ikony na ekranie głównym wybór pliku bywa
   nieosiągalny, a przeniesienie z OneNote i tak kończy się tekstem, który
   łatwiej wkleić niż zapisać, odszukać i wskazać. Wklejenie trafia dokładnie
   w to samo sprawdzanie co plik — nie omija żadnego zabezpieczenia. */
$("mfWklej").onclick = async ()=>{
  if($("mfInput").dataset.mode!=="json"){
    const apple=$("mfInput").dataset.mode==="apple";
    showInfo(apple ? "Eksportu z Notatek Apple nie da się wkleić" : "Kopii z JW Library nie da się wkleić",
      apple
        ? "Eksport zawiera wiele plików Markdown i osobne ilustracje. Wskaż cały plik <b>ZIP</b> przyciskiem <b>„Wybierz plik…\"</b>."
        : "Plik <b>.jwlibrary</b> to spakowane archiwum z bazą danych, a nie tekst — trzeba go wskazać przyciskiem <b>„Wybierz plik…\"</b>.<br><br>Wklejanie działa dla kopii <b>.json</b> aplikacji JW Study, w tym dla pliku z przeniesienia notatek z OneNote.");
    return;
  }
  let wklejone = "";
  try{ if(navigator.clipboard && navigator.clipboard.readText) wklejone = await navigator.clipboard.readText(); }
  catch(e){}
  const tekst = await askText({
    title:"Wklej treść kopii",
    value: wklejone,
    placeholder:'{"notes":[…],"tags":[…]}',
    okLabel:"Wczytaj",
    hint:"Wklej całą zawartość pliku .json — sprawdzanie jest takie samo jak przy wyborze pliku."});
  if(tekst===null || !tekst.trim()) return;
  closeModal("modalFile");
  wczytajKopieZTekstu(tekst);
};
$("mfInput").addEventListener("change", e=>{
  closeModal("modalFile");
  if(!e.target.files.length) return;
  if(e.target.dataset.mode==="jwl") handleImportFile(e);
  else if(e.target.dataset.mode==="apple") handleAppleNotesFile(e);
  else handleJsonFile(e);
});

/* ================= IMPORT BACKUPU ================= */
/* ===== LIMITY WCZYTYWANYCH PLIKÓW =====
   Archiwum ZIP potrafi rozpakować się do rozmiaru tysiące razy większego niż sam
   plik („bomba zip"). Baza SQLite wczytywana jest w całości do pamięci, więc
   dla przeglądarki na telefonie kończyłoby się to zawieszeniem karty.
   Dlatego sprawdzamy rozmiar PRZED rozpakowaniem i po nim. */
const MAX_ARCHIWUM   = 300 * 1024 * 1024;   // komputer: sam plik .jwlibrary
const MAX_BAZA       = 400 * 1024 * 1024;   // komputer: userData.db po rozpakowaniu
const MAX_MOBILE_ARCHIWUM = 80 * 1024 * 1024;
const MAX_MOBILE_BAZA     = 120 * 1024 * 1024;
const MAX_WPISOW_ZIP = 5000;                // rozsądna kopia ma ich kilkanaście

function importNaUrzadzeniuMobilnym(){
  const dotyk = typeof navigator!=="undefined" && (navigator.maxTouchPoints||0)>1;
  return dotyk && Math.min(screen.width||innerWidth, screen.height||innerHeight) < 1100;
}
function limityImportu(){
  return importNaUrzadzeniuMobilnym()
    ? {archiwum:MAX_MOBILE_ARCHIWUM,baza:MAX_MOBILE_BAZA,mobilne:true}
    : {archiwum:MAX_ARCHIWUM,baza:MAX_BAZA,mobilne:false};
}

class ImportAnulowany extends Error{
  constructor(){ super("Import został anulowany — niczego nie zapisano."); this.name="ImportAnulowany"; }
}
let _stanImportu=null;
let _anulujImportDodatkowo=null;
function pokazPostepImportu(tytul){
  _stanImportu={anulowany:false,zapisRozpoczety:false};
  const m=$("modalImportu"); m.dataset.cancelled="0";
  $("importTitle").textContent=tytul||"Import z JW Library";
  $("importCancel").disabled=false;
  $("importCancel").textContent="Anuluj";
  $("importCancel").onclick=()=>{
    if(!_stanImportu || _stanImportu.zapisRozpoczety) return;
    _stanImportu.anulowany=true; m.dataset.cancelled="1";
    if(typeof _anulujImportDodatkowo==="function")try{_anulujImportDodatkowo();}catch(_){ }
    $("importStage").textContent="Kończę bez zapisywania…";
    $("importCancel").textContent="Anulowanie…";
  };
  ustawPostepImportu(0,"Przygotowanie importu…");
  openModal("modalImportu");
}
function ustawPostepImportu(procent, etap){
  const p=Math.max(0,Math.min(100,Math.round(procent||0)));
  $("importProgress").value=p; $("importPercent").textContent=p+"%";
  if(etap) $("importStage").textContent=etap;
}
function sprawdzAnulowanieImportu(){
  if(_stanImportu && _stanImportu.anulowany) throw new ImportAnulowany();
}
function rozpocznijZapisImportu(){
  sprawdzAnulowanieImportu();
  if(_stanImportu) _stanImportu.zapisRozpoczety=true;
  $("importCancel").disabled=true;
  $("importCancel").textContent="Zapisywanie…";
}
function schowajPostepImportu(){
  $("importCancel").onclick=null; closeModal("modalImportu"); _stanImportu=null; _anulujImportDodatkowo=null;
}
function oddechImportu(){ return new Promise(res=>setTimeout(res,0)); }

async function sprawdzMiejsceDlaImportu(archiwum, baza){
  if(!(navigator.storage && navigator.storage.estimate)) return true;
  try{
    const {usage=0,quota=0}=await navigator.storage.estimate();
    if(!quota) return true;
    const wolne=quota-usage;
    /* W pamięci urządzenia zostaje archiwum bazowe oraz tekst notatek wyjęty
       z SQLite. Zapas chroni przed sytuacją, gdy import zajmie ostatnie bajty
       i zablokuje zapis pierwszej późniejszej notatki. */
    const potrzeba=archiwum + Math.min(baza,200*1024*1024)*.75 + 20*1024*1024;
    if(wolne < potrzeba)
      throw new Error("Za mało wolnego miejsca na bezpieczny import. Potrzeba około "+
        ludzkiRozmiar(potrzeba)+", a dostępne jest "+ludzkiRozmiar(Math.max(0,wolne))+". "+
        "Zrób kopię danych, usuń zbędne zdjęcia lub wykonaj import na urządzeniu z większą ilością miejsca.");
  }catch(e){
    if(/Za mało wolnego miejsca/.test(e&&e.message||"")) throw e;
  }
  return true;
}

/** Czytelny rozmiar do komunikatów. */
function ludzkiRozmiar(b){
  return b >= 1048576 ? (b/1048576).toFixed(1)+" MB" : Math.round(b/1024)+" KB";
}

/* ================= IMPORT Z NOTATEK APPLE =================
   Eksport z iPada/Maca składa się z plików Markdown i katalogów Attachments.
   Import odbywa się lokalnie; nic nie jest wysyłane do sieci. */
const MAX_APPLE_MD=10*1024*1024;
const MAX_APPLE_OBRAZ=15*1024*1024;
const MAX_APPLE_RAZEM=100*1024*1024;
const MAX_APPLE_MOBILE_RAZEM=40*1024*1024;
const MAX_APPLE_NOTATEK=5000;

function appleNfc(s){
  s=String(s||"");
  return typeof s.normalize==="function" ? s.normalize("NFC") : s;
}
function appleEsc(s){
  return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function appleKatalog(path){
  const p=appleNfc(path).replace(/\\/g,"/").split("/"); p.pop(); return p.join("/");
}
function applePolaczSciezke(katalog, wzgledna){
  let rel=String(wzgledna||"").trim().replace(/^<|>$/g,"");
  try{ rel=decodeURIComponent(rel); }catch(_){}
  const wynik=[];
  for(const cz of (appleNfc(katalog+"/"+rel).replace(/\\/g,"/").split("/"))){
    if(!cz||cz===".") continue;
    if(cz===".."){ wynik.pop(); continue; }
    wynik.push(cz);
  }
  return wynik.join("/");
}
function appleMime(path){
  const ext=(String(path).match(/\.([a-z0-9]+)$/i)||[])[1];
  return ({png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",webp:"image/webp"})[(ext||"").toLowerCase()]||"";
}
function appleInline(tekst, obrazy){
  const schowek=[];
  let s=String(tekst||"");
  const token=html=>{const i=schowek.push(html)-1;return "\u0001APPLE"+i+"\u0002";};
  s=s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,(_,alt,src)=>{
    const i=obrazy.push({src:String(src||"").trim(),alt:String(alt||"")})-1;
    return token("@@APPLEIMG"+i+"@@");
  });
  s=s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,label,href)=>{
    const h=String(href||"").trim();
    if(!/^(https?:\/\/|mailto:|jwlibrary:)/i.test(h)) return String(label||"");
    return token('<a href="'+appleEsc(h)+'">'+appleEsc(label)+'</a>');
  });
  s=appleEsc(s)
    .replace(/\*\*([^*\n]+)\*\*/g,"<b>$1</b>")
    .replace(/__([^_\n]+)__/g,"<b>$1</b>")
    .replace(/~~([^~\n]+)~~/g,"<s>$1</s>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g,"$1<i>$2</i>")
    .replace(/(^|[^_])_([^_\n]+)_/g,"$1<i>$2</i>");
  return s.replace(/\u0001APPLE(\d+)\u0002/g,(_,i)=>schowek[+i]||"");
}
function appleMarkdownHtml(markdown){
  const obrazy=[];
  const linie=String(markdown||"").replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n").split("\n");
  let tytul="", html=[], lista="";
  const zamknijListe=()=>{if(lista){html.push("</"+lista+">");lista="";}};
  for(let i=0;i<linie.length;i++){
    const raw=linie[i], trim=raw.trim();
    let m;
    if(!tytul && (m=trim.match(/^#\s+(.+)$/))){tytul=m[1].replace(/[*_~`]/g,"").trim();continue;}
    if(!trim){zamknijListe();if(html.length && html[html.length-1]!=="<div><br></div>")html.push("<div><br></div>");continue;}
    if((m=trim.match(/^(#{1,3})\s+(.+)$/))){zamknijListe();const poziom=m[1].length<=2?"h2":"h3";html.push("<"+poziom+">"+appleInline(m[2],obrazy)+"</"+poziom+">");continue;}
    if((m=trim.match(/^>\s?(.*)$/))){zamknijListe();html.push("<blockquote>"+appleInline(m[1],obrazy)+"</blockquote>");continue;}
    if((m=trim.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/))){
      if(lista!=="ul"){zamknijListe();lista="ul";html.push('<ul class="tasklist">');}
      html.push('<li'+(m[1].toLowerCase()==="x"?' class="done"':"")+">"+appleInline(m[2],obrazy)+"</li>");continue;
    }
    if((m=trim.match(/^[-*+]\s+(.*)$/))){if(lista!=="ul"){zamknijListe();lista="ul";html.push("<ul>");}html.push("<li>"+appleInline(m[1],obrazy)+"</li>");continue;}
    if((m=trim.match(/^\d+[.)]\s+(.*)$/))){if(lista!=="ol"){zamknijListe();lista="ol";html.push("<ol>");}html.push("<li>"+appleInline(m[1],obrazy)+"</li>");continue;}
    zamknijListe(); html.push("<div>"+appleInline(raw.replace(/\s{2}$/,""),obrazy)+"</div>");
  }
  zamknijListe();
  while(html[0]==="<div><br></div>")html.shift();
  while(html[html.length-1]==="<div><br></div>")html.pop();
  return {tytul:tytul||"Notatka bez tytułu",html:html.join(""),obrazy};
}
function appleTaSamaNotatka(a,b){
  return tekstDoPorownania(a&&a.t)===tekstDoPorownania(b&&b.t) &&
    tekstDoPorownania((a&&a.c)||(a&&a.h?htmlToPlain(a.h):""))===
    tekstDoPorownania((b&&b.c)||(b&&b.h?htmlToPlain(b.h):""));
}

async function handleAppleNotesFile(e){
  const file=e.target.files[0]; e.target.value="";
  if(!file) return;
  const limitRazem=importNaUrzadzeniuMobilnym()?MAX_APPLE_MOBILE_RAZEM:MAX_APPLE_RAZEM;
  if(!/\.zip$/i.test(file.name||"")){showInfo("Nie wczytano notatek","Wskaż plik <b>ZIP</b> utworzony w aplikacji Pliki.");return;}
  if(!file.size||file.size>limityImportu().archiwum){showInfo("Nie wczytano notatek","Archiwum jest puste albo zbyt duże dla tego urządzenia.");return;}
  pokazPostepImportu("Import z Notatek Apple");
  try{
    ustawPostepImportu(5,"Wczytuję obsługę ZIP…"); await getZipLib(); sprawdzAnulowanieImportu();
    ustawPostepImportu(12,"Odczytuję archiwum…");
    let zip; try{zip=await JSZip.loadAsync(await file.arrayBuffer());}
    catch(_){throw new Error("Pliku nie da się otworzyć jako ZIP. Utwórz archiwum ponownie w aplikacji Pliki.");}
    const wszystkie=Object.keys(zip.files);
    if(wszystkie.length>MAX_WPISOW_ZIP)throw new Error("Archiwum zawiera zbyt wiele plików ("+wszystkie.length+").");
    const mapa=new Map();
    for(const p of wszystkie)if(!zip.files[p].dir && !/(^|\/)__MACOSX\//.test(p))mapa.set(appleNfc(p),p);
    const md=[...mapa.keys()].filter(p=>/\.md$/i.test(p));
    if(!md.length)throw new Error("W archiwum nie znaleziono plików Markdown (.md).");
    if(md.length>MAX_APPLE_NOTATEK)throw new Error("Archiwum zawiera więcej niż "+MAX_APPLE_NOTATEK+" notatek.");
    const pierwszy=md[0].split("/")[0].trim();
    const nazwaTagu=pierwszy||"Notatki Apple";
    ustawPostepImportu(18,"Znaleziono "+md.length+" notatek…");
    /* Nie wolno zostawić okna postępu nad pytaniem. Oba są pełnoekranowymi
       warstwami o tym samym priorytecie; na iPadzie późniejsze w DOM okno
       postępu zasłaniało przycisk „Importuj”, więc program wyglądał jak
       zawieszony dokładnie przy 18%. Na czas decyzji postęp znika. */
    schowajPostepImportu();
    const zgoda=await askConfirm("Zaimportować notatki z Apple?",
      "Znaleziono <b>"+md.length+"</b> plików Markdown. Trafią do etykiety <b>"+appleEsc(nazwaTagu)+"</b>.<br><br>"+
      "Identyczne notatki zostaną pominięte, a istniejące nie będą nadpisane. Ilustracje zostaną osadzone w treści.<br><br>"+
      "Przed dużym importem warto użyć <b>Plik → Zapisz kopię danych</b>.",{okLabel:"Importuj"});
    if(!zgoda)return;
    pokazPostepImportu("Import z Notatek Apple");
    ustawPostepImportu(18,"Rozpoczynam import "+md.length+" notatek…");
    sprawdzAnulowanieImportu();
    const tagiNowe=tags.map(t=>Object.assign({},t));
    let tag=tagiNowe.find(t=>appleNfc(t.name).toLocaleLowerCase("pl")===appleNfc(nazwaTagu).toLocaleLowerCase("pl"));
    if(!tag){tag={id:nastepnyNumer(tagiNowe),name:nazwaTagu,nw:true};tagiNowe.push(tag);}
    const nowe=[], znane=notes.slice(); let pominiete=0,brakObrazow=0,obrazy=0,razem=0;
    for(let i=0;i<md.length;i++){
      sprawdzAnulowanieImportu();
      const sciezka=md[i], wpis=zip.files[mapa.get(sciezka)];
      const rozmiar=wpis&&wpis._data&&wpis._data.uncompressedSize;
      if(rozmiar&&rozmiar>MAX_APPLE_MD)throw new Error("Notatka „"+sciezka+"” jest większa niż "+ludzkiRozmiar(MAX_APPLE_MD)+".");
      const parsed=appleMarkdownHtml(await wpis.async("string"));
      const kat=appleKatalog(sciezka); let html=parsed.html;
      for(let j=0;j<parsed.obrazy.length;j++){
        const ref=parsed.obrazy[j], cel=applePolaczSciezke(kat,ref.src), real=mapa.get(cel), mime=appleMime(cel);
        let zamiana="<div>[Brak ilustracji: "+appleEsc(ref.alt||ref.src)+"]</div>";
        if(real&&mime){
          const ob=zip.files[real], wielkosc=(ob._data&&ob._data.uncompressedSize)||0;
          if(wielkosc>MAX_APPLE_OBRAZ)throw new Error("Ilustracja „"+ref.src+"” jest większa niż "+ludzkiRozmiar(MAX_APPLE_OBRAZ)+".");
          razem+=wielkosc;if(razem>limitRazem)throw new Error("Ilustracje po rozpakowaniu przekraczają bezpieczny limit "+ludzkiRozmiar(limitRazem)+" dla tego urządzenia.");
          const b64=await ob.async("base64");
          zamiana='<img src="data:'+mime+';base64,'+b64+'" class="img-center" style="width:60%">';obrazy++;
        }else brakObrazow++;
        html=html.split("@@APPLEIMG"+j+"@@").join(zamiana);
      }
      const clean=sanitize(html), now=new Date().toISOString();
      const n={g:crypto.randomUUID().toUpperCase(),t:parsed.tytul,h:clean,c:htmlToPlain(clean),
        b:0,ch:0,v:0,pub:"",ks:"",doc:0,itn:0,col:0,cr:now,mo:now,tg:[tag.id],nw:true,tgd:true,appleSrc:sciezka};
      if(znane.some(x=>appleTaSamaNotatka(x,n))){pominiete++;continue;}
      if(znane.some(x=>appleNfc(x.appleSrc||"")===sciezka))n.t+=" (ponowny import z Apple)";
      nowe.push(n);znane.push(n);
      ustawPostepImportu(22+Math.round((i+1)/md.length*58),"Przygotowuję notatki "+(i+1)+" z "+md.length+"…");
      if(i%8===0)await oddechImportu();
    }
    if(!nowe.length){schowajPostepImportu();showInfo("Nie dodano duplikatów","Wszystkie notatki z tego archiwum są już w JW Study.");return;}
    await sprawdzMiejsceDlaImportu(file.size,razem);
    rozpocznijZapisImportu();ustawPostepImportu(84,"Zapisuję cały import bezpiecznie…");
    await idbZapiszImportZewnetrzny(nowe,tagiNowe,notes.length+nowe.length,tagiNowe.length);
    notes.push(...nowe);tags=tagiNowe;bumpTagsVer();bumpDirty();
    if(typeof workerOznaczIndeksDoOdbudowy==="function")workerOznaczIndeksDoOdbudowy();
    ustawPostepImportu(100,"Gotowe");renderAll();await oddechImportu();schowajPostepImportu();
    showInfo("Zaimportowano notatki Apple","Dodano <b>"+nowe.length+"</b> notatek i <b>"+obrazy+"</b> ilustracji do etykiety <b>"+appleEsc(tag.name)+"</b>."+
      (pominiete?"<br>Pominięto identyczne: "+pominiete+".":"")+(brakObrazow?"<br>Nie znaleziono ilustracji: "+brakObrazow+".":""));
  }catch(err){
    if(_stanImportu)schowajPostepImportu();
    if(!(err instanceof ImportAnulowany))showInfo("Nie zaimportowano notatek",appleEsc(err&&err.message||"Nieznany błąd")+"<br><br><b>Dotychczasowe dane pozostały bez zmian.</b>");
  }
}

/* ================= INTELIGENTNY IMPORT DOKUMENTÓW =================
   PDF z warstwą tekstową czytamy bez OCR. Skanowane strony i obrazy trafiają
   do Tesseract uruchomionego w Web Workerze. DOCX konwertuje Mammoth. Wszystkie
   biblioteki są lokalne, a zapis całej partii jest atomowy. */
const SMART_MAX_PLIK_MOBILE=45*1024*1024;
const SMART_MAX_PLIK_DESKTOP=120*1024*1024;
const SMART_MAX_PLIKOW=40;
const SMART_MAX_STRON_MOBILE=120;
const SMART_MAX_STRON_DESKTOP=400;
let smartPliki=[];
const smartTypy=new WeakMap();
let smartWybor=0;
let smartWyniki=[];
let smartOcrWorker=null;
let smartPracuje=false;
let smartAbortController=null;
/* terminate() Tesseracta nie odrzuca oczekującego recognize(). Nasza obietnica
   musi zakończyć się także po anulowaniu, inaczej kolejne importy są blokowane. */
function smartCzekaj(praca, limit=120000){
  const signal=smartAbortController&&smartAbortController.signal;
  return new Promise((res,rej)=>{
    let timer;
    const zakoncz=(fn,x)=>{clearTimeout(timer);if(signal)signal.removeEventListener("abort",anuluj);fn(x);};
    const anuluj=()=>zakoncz(rej,new ImportAnulowany());
    Promise.resolve(praca).then(x=>zakoncz(res,x),e=>zakoncz(rej,e));
    if(signal&&signal.aborted){anuluj();return;}
    if(signal)signal.addEventListener("abort",anuluj,{once:true});
    timer=setTimeout(()=>zakoncz(rej,new Error("Odczyt trwał zbyt długo. Spróbuj mniejszego dokumentu lub wyłącz OCR.")),limit);
  });
}
function smartMaTresc(html){return !!htmlToPlain(html).trim()||/<img\b/i.test(html);}
function smartTaSamaNotatka(a,b){
  return !a.del&&tekstDoPorownania(a.t)===tekstDoPorownania(b.t)&&
    sanitize(a.h||esc(a.c||""))===sanitize(b.h||esc(b.c||""));
}

function smartNazwaBezRozszerzenia(nazwa){
  return String(nazwa||"Dokument").replace(/\.(pdf|docx|png|jpe?g|webp)$/i,"").trim()||"Dokument";
}
function smartTyp(file){
  if(smartTypy.has(file))return smartTypy.get(file);
  const n=String(file&&file.name||"").toLowerCase(), t=String(file&&file.type||"").toLowerCase();
  if(t==="application/pdf"||/\.pdf$/.test(n))return "pdf";
  if(t==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"||/\.docx$/.test(n))return "docx";
  if(/^image\/(png|jpeg|webp)$/.test(t)||/\.(png|jpe?g|webp)$/.test(n))return "image";
  return "";
}
async function smartSprawdzTyp(file){
  // Systemy mobilne i pobrane załączniki często podają pusty lub błędny MIME.
  // Rozpoznajemy zawartość; nigdy nie zmieniamy nazwy pliku użytkownika.
  const b=new Uint8Array(await file.slice(0,1024).arrayBuffer());
  const starts=(a)=>a.every((v,i)=>b[i]===v);
  const text=String.fromCharCode(...b);
  let typ="";
  if(text.includes("%PDF-"))typ="pdf";
  else if(starts([0x50,0x4b,3,4])){
    await getZipLib();
    const zip=await JSZip.loadAsync(await file.arrayBuffer());
    if(zip.file("word/document.xml"))typ="docx";
  }else if(starts([137,80,78,71,13,10,26,10])||starts([255,216,255])||
    (text.startsWith("RIFF")&&text.slice(8,12)==="WEBP"))typ="image";
  else if(starts([0xd0,0xcf,0x11,0xe0]))throw new Error("Starszy format Word .doc: zapisz dokument w Wordzie jako .docx i wybierz go ponownie.");
  if(!typ)throw new Error("Nie rozpoznano zawartości pliku. Obsługiwane są PDF, DOCX, PNG, JPEG i WEBP. Sama zmiana rozszerzenia nie konwertuje dokumentu.");
  smartTypy.set(file,typ);return typ;
}
function smartFormatujLinieTekstu(str){
  let s=appleEsc(str);
  s=s.replace(/\*\*([^*\n]+?)\*\*/g,"<b>$1</b>");
  s=s.replace(/__([^_]+?)__/g,"<b>$1</b>");
  s=s.replace(/(^|[^\w*])\*([^*\n]+?)\*(?!\*)/g,"$1<i>$2</i>");
  s=s.replace(/(^|[^\w_])_([^_]+?)_(?!_)/g,"$1<i>$2</i>");
  s=s.replace(/~~([^~\n]+?)~~/g,"<s>$1</s>");
  s=s.replace(/==([^=\n]+?)==/g,'<mark class="hl1">$1</mark>');
  return s;
}
function smartHtmlZTekstu(tekst){
  if(!tekst)return "";
  // Usuwanie myślników dzielących wyrazy na końcach linii w OCR / skanach (de-hyphenation)
  const oczyszczony=String(tekst).replace(/([\p{L}\d])-[\t ]*\r?\n[\t ]*([\p{L}\d])/gu,"$1$2");
  const linie=oczyszczony.replace(/\r\n?/g,"\n").split("\n");
  const out=[];
  let akapit=[];
  let biezacaLista=null;
  let biezacyCytat=[];

  const flushAkapit=()=>{
    if(!akapit.length)return;
    let html="";
    for(let i=0;i<akapit.length;i++){
      const raw=akapit[i],fmt=smartFormatujLinieTekstu(raw.trim());
      if(i>0){
        if(akapit[i-1].endsWith("  "))html+="<br>"+fmt;
        else html+=" "+fmt;
      }else html+=fmt;
    }
    out.push("<div>"+html+"</div>");
    akapit=[];
  };
  const flushLista=()=>{
    if(!biezacaLista)return;
    if(biezacaLista.typ==="task"){
      out.push('<ul class="tasklist">'+biezacaLista.items.map(it=>'<li class="'+(it.done?'done':'')+'">'+smartFormatujLinieTekstu(it.text)+'</li>').join("")+'</ul>');
    }else if(biezacaLista.typ==="ol"){
      out.push('<ol>'+biezacaLista.items.map(it=>'<li>'+smartFormatujLinieTekstu(it.text)+'</li>').join("")+'</ol>');
    }else{
      out.push('<ul>'+biezacaLista.items.map(it=>'<li>'+smartFormatujLinieTekstu(it.text)+'</li>').join("")+'</ul>');
    }
    biezacaLista=null;
  };
  const flushCytat=()=>{
    if(!biezacyCytat.length)return;
    out.push('<blockquote>'+biezacyCytat.map(smartFormatujLinieTekstu).join("<br>")+'</blockquote>');
    biezacyCytat=[];
  };
  const flushWszystko=()=>{flushAkapit();flushLista();flushCytat();};

  for(let i=0;i<linie.length;i++){
    const raw=linie[i],trim=raw.trim();
    if(!trim){
      flushWszystko();
      if(out.length&&out[out.length-1]!=="<div><br></div>")out.push("<div><br></div>");
      continue;
    }

    // Cytaty markdown: > treść
    const cytatMatch=trim.match(/^>\s*(.*)$/);
    if(cytatMatch){
      flushAkapit();flushLista();
      biezacyCytat.push(cytatMatch[1]);
      continue;
    }else{flushCytat();}

    // Zadania: [ ] lub [x]
    const taskMatch=trim.match(/^\[([ xX])\]\s*(.+)$/);
    if(taskMatch){
      flushAkapit();
      if(!biezacaLista||biezacaLista.typ!=="task"){flushLista();biezacaLista={typ:"task",items:[]};}
      biezacaLista.items.push({done:taskMatch[1].toLowerCase()==="x",text:taskMatch[2]});
      continue;
    }

    // Nagłówki markdown (#, ##, ###)
    const mdHMatch=trim.match(/^(#{1,3})\s+(.+)$/);
    if(mdHMatch){
      flushWszystko();
      const tag=mdHMatch[1].length<=2?"h2":"h3";
      out.push("<"+tag+">"+smartFormatujLinieTekstu(mdHMatch[2])+"</"+tag+">");
      continue;
    }

    // Listy nienumerowane (•, ●, ○, ▪, ▫, *, –, —, -)
    const ulMatch=trim.match(/^([•●○▪▫*–—]|-)\s+(.+)$/);
    if(ulMatch){
      flushAkapit();
      if(!biezacaLista||biezacaLista.typ!=="ul"){flushLista();biezacaLista={typ:"ul",items:[]};}
      biezacaLista.items.push({text:ulMatch[2]});
      continue;
    }

    // Listy numerowane (1., 1), a., a))
    const olMatch=trim.match(/^(\d+|[a-zA-Z])[.)]\s+(.+)$/);
    if(olMatch){
      flushAkapit();
      if(!biezacaLista||biezacaLista.typ!=="ol"){flushLista();biezacaLista={typ:"ol",items:[]};}
      biezacaLista.items.push({text:olMatch[2]});
      continue;
    }

    // Nagłówki heurystyczne (wielkie litery, słowa kluczowe, numeracje rzymskie, etykiety z dwukropkiem)
    const isAllCaps=/^[\p{Lu}\d\s.,:;–—\-()„”"']{4,70}$/u.test(trim)&&(trim.match(/[\p{Lu}]/gu)||[]).length>=4&&!trim.endsWith(".");
    const isKeyword=/^(?:Rozdzia[łl]|Cz[ęe][śs][ćc]|Temat:|Lekcja \d+|Pytanie \d+|Wst[ęe]p|Zako[ńn]czenie|Podsumowanie|Wnioski:?|Kluczowe punkty:?)\b/i.test(trim)&&trim.length<=80;
    const isRoman=/^[IVXLCDM]+\.\s+[\p{Lu}]/u.test(trim)&&trim.length<=80&&!trim.endsWith(".");
    const isColon=/^[\p{L}\d\s–—\-()„”"']{3,60}:$/u.test(trim)&&!/^(https?|mailto):$/i.test(trim);

    if(isAllCaps||isKeyword||isRoman||isColon){
      flushWszystko();
      const tag=(isAllCaps||/^(?:Rozdzia[łl]|Cz[ęe][śs][ćc]|Temat:)/i.test(trim))?"h2":"h3";
      out.push("<"+tag+">"+smartFormatujLinieTekstu(trim)+"</"+tag+">");
      continue;
    }

    // Kontynuacja elementu listy (wcięcie spacjami)
    if(biezacaLista&&/^\s{2,}/.test(raw)){
      const last=biezacaLista.items[biezacaLista.items.length-1];
      if(last){last.text+=" "+trim;continue;}
    }

    flushLista();
    akapit.push(raw);
  }
  flushWszystko();
  while(out.length&&out[out.length-1]==="<div><br></div>")out.pop();
  return out.join("");
}
function smartPodzielNaglowki(html, tytulBazowy){
  const box=parsujBezwladnie(html), dzieci=[...box.childNodes];
  const naglowek=n=>n.nodeType===1&&/^H[1-6]$/.test(n.tagName);
  const maNaglowki=dzieci.some(naglowek);
  if(!maNaglowki)return [{title:tytulBazowy,html}];
  const wynik=[];let nazwa=tytulBazowy,buf=[];
  const dodaj=()=>{const h=buf.map(n=>n.outerHTML||appleEsc(n.textContent||"")).join("");if(smartMaTresc(h))wynik.push({title:nazwa,html:h});buf=[];};
  for(const n of dzieci){
    if(naglowek(n)){
      if(buf.length)dodaj(); nazwa=(n.textContent||"").trim()||tytulBazowy;buf.push(n);
    }else buf.push(n);
  }
  if(buf.length)dodaj();
  return wynik.length?wynik:[{title:tytulBazowy,html}];
}
// Biblioteki Smart Import ładowane dynamicznie z lib/smart-import/
const smartAssetUrls=new Map();
function smartAssetBytes(nazwa){
  const el=document.getElementById("smartAsset-"+nazwa);
  if(el){
    const raw=atob(el.textContent.trim()),bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    return bytes;
  }
  return null;
}
function smartAssetUrl(nazwa){
  if(smartAssetUrls.has(nazwa)) return smartAssetUrls.get(nazwa);
  const bytes = smartAssetBytes(nazwa);
  if(bytes){
    smartAssetUrls.set(nazwa, URL.createObjectURL(new Blob([bytes],{type:"application/javascript"})));
    return smartAssetUrls.get(nazwa);
  }
  return "./lib/smart-import/" + nazwa;
}
function smartWbudowanySkrypt(nazwa,globalName){
  if(window[globalName])return window[globalName];
  const bytes = smartAssetBytes(nazwa);
  if(bytes){
    const script=document.createElement("script");
    script.textContent=new TextDecoder().decode(bytes);
    document.head.appendChild(script);script.remove();
  }
  if(!window[globalName])throw new Error("Nie udało się uruchomić wbudowanej biblioteki "+globalName+".");
  return window[globalName];
}
async function smartWczytajSkrypt(sciezka,globalName){
  if(window[globalName]) return window[globalName];
  const baseName = sciezka.split("/").pop();
  if(document.getElementById("smartAsset-" + baseName)){
    return smartWbudowanySkrypt(baseName, globalName);
  }
  const url = sciezka.startsWith("./") ? sciezka : ("./lib/smart-import/" + baseName);
  await loadScript(url);
  if(!window[globalName]) throw new Error("Nie udało się uruchomić biblioteki " + globalName + ".");
  return window[globalName];
}
async function smartPdfLib(){
  const lib=await smartWczytajSkrypt("./lib/smart-import/pdf.min.js","pdfjsLib");
  lib.GlobalWorkerOptions.workerSrc = smartAssetUrl("pdf.worker.min.js");
  return lib;
}
async function smartOcrZasoby(){
  const key="ocr-combined-worker";
  if(document.getElementById("smartAsset-pol.traineddata.gz")){
    if(!smartAssetUrls.has(key)){
      smartAssetUrls.set(key,URL.createObjectURL(new Blob([
        smartAssetBytes("tesseract-core-lstm.wasm.js"),";\n",
        smartAssetBytes("tesseract.worker.min.js")
      ],{type:"application/javascript"})));
    }
    return {workerPath:smartAssetUrls.get(key),langs:[{code:"pol",data:smartAssetBytes("pol.traineddata.gz")}]};
  }
  // Dynamiczne ładowanie z lib/smart-import/
  let polBytes = null;
  try {
    const res = await fetch("./lib/smart-import/lang/pol.traineddata.gz");
    if(res && res.ok) polBytes = new Uint8Array(await res.arrayBuffer());
  } catch(e){}
  return {
    workerPath: "./lib/smart-import/tesseract.worker.min.js",
    corePath: "./lib/smart-import/tesseract-core-lstm.wasm.js",
    langs: polBytes ? [{code:"pol", data:polBytes}] : "pol"
  };
}
async function smartMammoth(){return smartWczytajSkrypt("./lib/smart-import/mammoth.browser.min.js","mammoth");}
async function smartWorkerOcr(){
  if(smartOcrWorker)return smartOcrWorker;
  await smartWczytajSkrypt("./lib/smart-import/tesseract.min.js","Tesseract");
  ustawPostepImportu(8,"Uruchamiam polskie rozpoznawanie tekstu…");
  const zasoby=await smartOcrZasoby();
  const signal=smartAbortController&&smartAbortController.signal;
  let porzucony=false;
  const workerOpts = {
    workerPath:zasoby.workerPath,
    workerBlobURL:false,
    cacheMethod:"none",
    errorHandler:()=>{},
    logger:m=>{
      if(!m||typeof m.progress!=="number"||!_stanImportu||(signal&&signal.aborted))return;
      const p=10+Math.round(m.progress*55);
      ustawPostepImportu(p,"OCR: "+String(m.status||"rozpoznawanie tekstu").replace(/_/g," ")+"…");
    }
  };
  if(zasoby.corePath) workerOpts.corePath = zasoby.corePath;
  const tworzenie=Tesseract.createWorker(zasoby.langs,1,workerOpts);
  tworzenie.then(w=>{if(porzucony||(signal&&signal.aborted))Promise.resolve(w.terminate()).catch(()=>{});},()=>{});
  try{smartOcrWorker=await smartCzekaj(tworzenie);}
  catch(e){porzucony=true;throw e;}
  return smartOcrWorker;
}
async function smartZakonczOcr(){
  if(!smartOcrWorker)return;
  const w=smartOcrWorker;smartOcrWorker=null;
  try{await w.terminate();}catch(_){ }
}
async function smartObraz(blob){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(blob),img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);res(img);};
    img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("Nie można odczytać obrazu."));};
    img.src=url;
  });
}
function smartCanvas(img,maxBok){
  const sk=Math.min(1,(maxBok||2200)/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));
  const c=document.createElement("canvas");c.width=Math.max(1,Math.round((img.naturalWidth||img.width)*sk));c.height=Math.max(1,Math.round((img.naturalHeight||img.height)*sk));
  const ctx=c.getContext("2d",{alpha:false});ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);return c;
}
async function smartRozpoznajObraz(zrodlo){
  sprawdzAnulowanieImportu();const w=await smartWorkerOcr();sprawdzAnulowanieImportu();
  try{
    const r=await smartCzekaj(w.recognize(zrodlo));sprawdzAnulowanieImportu();return String(r&&r.data&&r.data.text||"").trim();
  }catch(e){await smartZakonczOcr();throw e;}
}
function smartStrukturaPdf(items, styles){
  if(!items||!items.length)return "";
  const rozmary=[];
  for(const it of items){
    const s=String(it.str||"").trim();
    if(!s)continue;
    const tr=it.transform||[];
    const fs=Math.round((it.height||(tr.length?Math.hypot(tr[0],tr[1]):10))*10)/10;
    if(fs>0)rozmary.push(fs);
  }
  if(!rozmary.length)return "";
  rozmary.sort((a,b)=>a-b);
  const bazowyFs=rozmary[Math.floor(rozmary.length/2)]||10;

  const wiersze=[];
  let biezacyWiersz=null;
  for(const it of items){
    const str=String(it.str||"");
    if(!str&&!it.hasEOL)continue;
    const tr=it.transform||[];
    const x=Number.isFinite(tr[4])?tr[4]:0;
    const y=Number.isFinite(tr[5])?tr[5]:0;
    const fs=Math.round((it.height||(tr.length?Math.hypot(tr[0],tr[1]):10))*10)/10;
    const st=(styles&&it.fontName&&styles[it.fontName])||{};
    const fn=(st.fontFamily||it.fontName||"").toLowerCase();
    const isBold=/bold|black|heavy|semibold|w[7-9]/i.test(fn);
    const isItalic=/italic|oblique/i.test(fn);

    if(!biezacyWiersz){
      biezacyWiersz={y,fs,items:[{str,x,width:it.width||0,fs,isBold,isItalic}]};
    }else{
      const tolerancja=Math.max(2.5,Math.min(biezacyWiersz.fs,fs)*0.45);
      if(Math.abs(y-biezacyWiersz.y)<=tolerancja){
        biezacyWiersz.items.push({str,x,width:it.width||0,fs,isBold,isItalic});
        biezacyWiersz.y=(biezacyWiersz.y+y)/2;
        biezacyWiersz.fs=Math.max(biezacyWiersz.fs,fs);
      }else{
        wiersze.push(biezacyWiersz);
        biezacyWiersz={y,fs,items:[{str,x,width:it.width||0,fs,isBold,isItalic}]};
      }
    }
    if(it.hasEOL&&biezacyWiersz){
      wiersze.push(biezacyWiersz);
      biezacyWiersz=null;
    }
  }
  if(biezacyWiersz)wiersze.push(biezacyWiersz);
  if(!wiersze.length)return "";

  const linie=[];
  for(const w of wiersze){
    w.items.sort((a,b)=>a.x-b.x);
    let htmlWiersza="",tekstWiersza="",prevKoniec=null,boldCount=0,totalChars=0;
    for(const it of w.items){
      const s=it.str;
      if(!s)continue;
      if(prevKoniec!==null&&(it.x-prevKoniec)>Math.max(1,it.fs*0.18)&&!/\s$/.test(tekstWiersza)&&!/^\s/.test(s)){
        htmlWiersza+=" ";tekstWiersza+=" ";
      }
      let fragment=appleEsc(s);
      if(it.isBold)fragment="<b>"+fragment+"</b>";
      if(it.isItalic)fragment="<i>"+fragment+"</i>";
      htmlWiersza+=fragment;
      tekstWiersza+=s;
      const len=s.trim().length;
      if(it.isBold)boldCount+=len;
      totalChars+=len;
      prevKoniec=it.x+(it.width||0);
    }
    const czystyTekst=tekstWiersza.trim();
    if(!czystyTekst)continue;
    linie.push({
      y:w.y,
      fs:w.fs,
      html:htmlWiersza.trim(),
      tekst:czystyTekst,
      isMostlyBold:totalChars>0&&(boldCount/totalChars>=0.75)
    });
  }
  if(!linie.length)return "";

  // PDF współrzędne Y: góra strony ma większe Y niż dół
  linie.sort((a,b)=>b.y-a.y);

  // De-hyphenation w liniach PDF
  for(let i=0;i<linie.length-1;i++){
    if(linie[i].tekst.endsWith("-")&&!linie[i].tekst.endsWith(" -")){
      const nast=linie[i+1];
      if(nast&&/^\p{L}/u.test(nast.tekst)){
        linie[i].html=linie[i].html.replace(/-<\/b>$/i,"</b>").replace(/-<\/i>$/i,"</i>").replace(/-$/,"");
        linie[i].tekst=linie[i].tekst.slice(0,-1);
        linie[i].zlepNastepna=true;
      }
    }
  }

  const bloki=[];
  let buforAkapitu=[];
  let biezacaLista=null;
  const flushAkapit=()=>{
    if(buforAkapitu.length){bloki.push("<div>"+buforAkapitu.join(" ")+"</div>");buforAkapitu=[];}
  };
  const flushLista=()=>{
    if(biezacaLista){
      const tag=biezacaLista.typ==="ol"?"ol":"ul";
      bloki.push("<"+tag+">"+biezacaLista.items.map(t=>"<li>"+t+"</li>").join("")+"</"+tag+">");
      biezacaLista=null;
    }
  };
  const flushWszystko=()=>{flushAkapit();flushLista();};

  for(let i=0;i<linie.length;i++){
    const cur=linie[i],prev=i>0?linie[i-1]:null;
    const deltaY=prev?(prev.y-cur.y):0,trim=cur.tekst;

    const jestH2=cur.fs>=bazowyFs*1.32;
    const jestH3=(cur.fs>=bazowyFs*1.14)||(cur.isMostlyBold&&cur.fs>=bazowyFs*1.04&&trim.length<80&&!trim.endsWith("."));

    if(jestH2||jestH3){
      flushWszystko();
      const tag=jestH2?"h2":"h3";
      bloki.push("<"+tag+">"+cur.html.replace(/<\/?b>/gi,"")+"</"+tag+">");
      continue;
    }

    const ulMatch=trim.match(/^([•●○▪▫*–—]|-)\s*(.+)$/);
    if(ulMatch){
      flushAkapit();
      if(!biezacaLista||biezacaLista.typ!=="ul"){flushLista();biezacaLista={typ:"ul",items:[]};}
      biezacaLista.items.push(cur.html.replace(/^([•●○▪▫*–—]|-)\s*/,""));
      continue;
    }

    const olMatch=trim.match(/^(\d+|[a-zA-Z])[.)]\s*(.+)$/);
    if(olMatch){
      flushAkapit();
      if(!biezacaLista||biezacaLista.typ!=="ol"){flushLista();biezacaLista={typ:"ol",items:[]};}
      biezacaLista.items.push(cur.html.replace(/^(\d+|[a-zA-Z])[.)]\s*/,""));
      continue;
    }

    if(prev&&deltaY>Math.max(prev.fs,cur.fs)*1.7&&!prev.zlepNastepna){
      flushWszystko();
    }

    if(biezacaLista&&prev&&deltaY<=Math.max(prev.fs,cur.fs)*1.5&&(prev.zlepNastepna||/^\s/.test(cur.tekst)||/^[a-zżźćńółęąś]/.test(trim))){
      const lastIdx=biezacaLista.items.length-1;
      if(lastIdx>=0){
        biezacaLista.items[lastIdx]+=(prev.zlepNastepna?"":" ")+cur.html;
        continue;
      }
    }

    flushLista();
    if(prev&&prev.zlepNastepna){
      if(buforAkapitu.length)buforAkapitu[buforAkapitu.length-1]+=cur.html;
      else buforAkapitu.push(cur.html);
    }else{
      buforAkapitu.push(cur.html);
    }
  }
  flushWszystko();
  return bloki.join("");
}
function smartTekstPdf(items){
  const linie=[];let linia="",poprzedni=null;
  const flush=()=>{if(linia.trim())linie.push(linia.replace(/\s+/g," ").trim());linia="";poprzedni=null;};
  for(const it of (items||[])){
    const s=String(it.str||""),tr=it.transform||[],y=tr[5],x=tr[4];
    if(s){
      if(poprzedni&&Number.isFinite(y)&&Number.isFinite(poprzedni.y)&&
         Math.abs(y-poprzedni.y)>Math.max(3,(it.height||8)*.55))flush();
      if(linia&&!/\s$/.test(linia)&&!/^\s/.test(s)){
        const luka=poprzedni&&Number.isFinite(x)&&Number.isFinite(poprzedni.koniec)?x-poprzedni.koniec:null;
        if(luka===null||luka>Math.max(1,(it.height||8)*.12)||luka<-2)linia+=" ";
      }
      linia+=s;poprzedni={y,koniec:Number.isFinite(x)&&Number.isFinite(it.width)?x+it.width:null};
    }
    if(it.hasEOL)flush(); // PDF.js może oznaczyć koniec wiersza pustym elementem.
  }
  flush();return linie.join("\n");
}
async function smartCzytajSkanPdf(page,ocr,zachowaj){
  const v1=page.getViewport({scale:1}),scale=Math.min(2,2200/Math.max(v1.width,v1.height));
  const vp=page.getViewport({scale}),c=document.createElement("canvas");
  c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);
  let render;
  try{
    render=page.render({canvasContext:c.getContext("2d",{alpha:false}),viewport:vp});
    await smartCzekaj(render.promise);
    const obraz=zachowaj?'<img src="'+c.toDataURL("image/jpeg",.84)+'" class="img-center" style="width:100%">':"";
    let tekst="",warning="";
    if(ocr){
      try{tekst=await smartRozpoznajObraz(c);}
      catch(e){
        if(e instanceof ImportAnulowany)throw e;
        await smartZakonczOcr();
        if(!obraz)throw e;
        warning="OCR nie zadziałał; zachowano obraz strony. "+(e.message||"");
      }
      if(!tekst&&!warning)warning="Nie rozpoznano tekstu na tej stronie.";
    }else warning="OCR wyłączony — zachowano wyłącznie obraz strony.";
    if(!tekst&&!obraz)throw new Error("Strona nie ma tekstu. Włącz OCR lub zachowanie obrazów skanów.");
    return {tekst,html:obraz+(obraz&&tekst?"<div><br></div>":"")+smartHtmlZTekstu(tekst),warning};
  }finally{
    if(render)try{render.cancel();}catch(_){}
    c.width=1;c.height=1;
  }
}
async function smartCzytajPdf(file, dziel, ocr, bazaPostepu=0, zachowaj=true,wymusOcr=false){
  const pdfjs=await smartPdfLib(),buf=await smartCzekaj(file.arrayBuffer());
  sprawdzAnulowanieImportu();
  const task=pdfjs.getDocument({data:new Uint8Array(buf),isEvalSupported:false});
  const strony=[];
  try{
    const doc=await smartCzekaj(task.promise);
    const limit=importNaUrzadzeniuMobilnym()?SMART_MAX_STRON_MOBILE:SMART_MAX_STRON_DESKTOP;
    if(doc.numPages>limit)throw new Error("PDF ma "+doc.numPages+" stron; bezpieczny limit dla tego urządzenia to "+limit+".");
    for(let i=1;i<=doc.numPages;i++){
      sprawdzAnulowanieImportu();ustawPostepImportu(Math.min(90,bazaPostepu+Math.round(i/doc.numPages*58)),"PDF „"+file.name+"”: strona "+i+" z "+doc.numPages+"…");
      const page=await smartCzekaj(doc.getPage(i));
      try{
        const content=await smartCzekaj(page.getTextContent()),tekst=smartTekstPdf(content.items);
        let html="";
        if(tekst.trim()&&!(ocr&&wymusOcr)){
          try{html=smartStrukturaPdf(content.items,content.styles);}catch(_){}
          if(!html)html=smartHtmlZTekstu(tekst);
        }
        // Krótki, ale prawidłowy tekst nie jest skanem i nie wymaga OCR.
        const wynik=tekst.trim()&&!(ocr&&wymusOcr)?{tekst,html,warning:""}:await smartCzytajSkanPdf(page,ocr,zachowaj);
        strony.push({nr:i,...wynik});
      }finally{try{page.cleanup();}catch(_){}}
      if(i%2===0)await oddechImportu();
    }
  }catch(e){
    if(e&&e.name==="PasswordException")throw new Error("PDF jest chroniony hasłem. Otwórz go w czytniku PDF i zapisz kopię bez hasła, a następnie zaimportuj ją ponownie.");
    throw e;
  }finally{try{await task.destroy();}catch(_){}}
  const baza=smartNazwaBezRozszerzenia(file.name);
  if(dziel==="parts")return strony.map(s=>({title:baza+" — strona "+s.nr,html:s.html,source:file.name,page:s.nr,kind:"pdf",warning:s.warning}));
  const html=strony.map(s=>(strony.length>1?"<h2>Strona "+s.nr+"</h2>":"")+s.html).join("");
  return [{title:baza,html,source:file.name,kind:"pdf",warning:strony.filter(s=>s.warning).map(s=>"s. "+s.nr+": "+s.warning).join(" ")}];
}
async function smartCzytajDocx(file,dziel,ocrObrazy=false){
  const buf=await smartCzekaj(file.arrayBuffer());sprawdzAnulowanieImportu();
  /* DOCX też jest archiwum ZIP. Sprawdzamy je przed Mammoth, aby mały plik
     skompresowany nie rozwinął się do setek megabajtów w pamięci iPada. */
  await getZipLib();
  let zip;try{zip=await smartCzekaj(JSZip.loadAsync(buf));}catch(e){if(e instanceof ImportAnulowany)throw e;throw new Error("Plik DOCX jest uszkodzony albo nie jest dokumentem Word.");}
  const wpisy=Object.values(zip.files);if(wpisy.length>MAX_WPISOW_ZIP)throw new Error("Dokument Word zawiera zbyt wiele składników.");
  if(!zip.file("word/document.xml"))throw new Error("W pliku nie znaleziono treści dokumentu Word.");
  const limit=importNaUrzadzeniuMobilnym()?80*1024*1024:250*1024*1024;
  const rozpakowane=wpisy.reduce((s,x)=>s+(x&&x._data&&x._data.uncompressedSize||0),0);
  if(rozpakowane>limit)throw new Error("Dokument po rozpakowaniu przekracza bezpieczny limit "+ludzkiRozmiar(limit)+".");
  const mm=await smartMammoth();
  sprawdzAnulowanieImportu();
  const tekstyObrazow=[],bledyOcr=[];let kolejkaOcr=Promise.resolve();
  const styleMap=[
    "p[style-name='Heading 1'] => h2:fresh",
    "p[style-name='Heading 2'] => h2:fresh",
    "p[style-name='Heading 3'] => h3:fresh",
    "p[style-name='Heading 4'] => h3:fresh",
    "p[style-name='Nagłówek 1'] => h2:fresh",
    "p[style-name='Nagłówek 2'] => h2:fresh",
    "p[style-name='Nagłówek 3'] => h3:fresh",
    "p[style-name='Nagłówek 4'] => h3:fresh",
    "p[style-name='Title'] => h2:fresh",
    "p[style-name='Tytuł'] => h2:fresh",
    "p[style-name='Subtitle'] => h3:fresh",
    "p[style-name='Podtytuł'] => h3:fresh",
    "p[style-name='Quote'] => blockquote:fresh",
    "p[style-name='Cytat'] => blockquote:fresh",
    "p[style-name='Intense Quote'] => blockquote:fresh",
    "p[style-name='List Bullet'] => ul > li:fresh",
    "p[style-name='Punktory'] => ul > li:fresh",
    "p[style-name='List Number'] => ol > li:fresh",
    "p[style-name='Numerowanie'] => ol > li:fresh",
    "r[style-name='Strong'] => strong",
    "r[style-name='Emphasis'] => em"
  ];
  const wynik=await smartCzekaj(mm.convertToHtml({arrayBuffer:buf},{
    styleMap,
    convertImage:mm.images.imgElement(async image=>{
      const src="data:"+image.contentType+";base64,"+await image.read("base64");
      if(ocrObrazy){
        try{const zadanie=kolejkaOcr.then(()=>smartRozpoznajObraz(src));kolejkaOcr=zadanie.catch(()=>{});const tekst=await zadanie;if(tekst)tekstyObrazow.push(tekst);}
        catch(e){if(e instanceof ImportAnulowany)throw e;bledyOcr.push(e.message||"Błąd OCR ilustracji");}
      }
      return {src};
    })
  }),ocrObrazy?1200000:120000);
  sprawdzAnulowanieImportu();
  let raw=String(wynik.value||"");
  if(tekstyObrazow.length)raw+="<h2>Tekst rozpoznany z ilustracji</h2>"+tekstyObrazow.map(smartHtmlZTekstu).join("");
  raw=raw.replace(/\u00AD/g,""); // usuń soft-hyphen
  // Ulepsz tabele: jeśli pierwszy wiersz zawiera pogrubione komórki, przekształć na nagłówki tabeli (th)
  raw=raw.replace(/<table(?:\s[^>]*)?>([\s\S]*?)<\/table>/gi,m=>{
    return m.replace(/<tr(?:\s[^>]*)?>([\s\S]*?)<\/tr>/i,(tr,inner)=>{
      if(!inner.includes("<th")&&/<strong>|<b>/i.test(inner)){
        const converted=inner.replace(/<td(?:\s[^>]*)?>([\s\S]*?)<\/td>/gi,(_,cell)=>"<th>"+cell.replace(/<\/?(?:strong|b)>/gi,"").trim()+"</th>");
        return "<tr>"+converted+"</tr>";
      }
      return tr;
    });
  });
  // Usuń nadmierne puste akapity
  raw=raw.replace(/(?:<p>\s*(?:<br\s*\/?>)?\s*<\/p>\s*){3,}/gi,"<p><br></p>");
  const dom=parsujBezwladnie(raw),h1=dom.querySelector("h1, h2, h3"),nazwa=(h1&&h1.textContent.trim())||smartNazwaBezRozszerzenia(file.name);
  raw=raw.replace(/<h([1-6])(?:\s[^>]*)?>/gi,(_,n)=>+n<=2?"<h2>":"<h3>")
    .replace(/<\/h([1-6])>/gi,(_,n)=>+n<=2?"</h2>":"</h3>");
  const clean=sanitize(raw);
  if(!smartMaTresc(clean))throw new Error("Dokument Word nie zawiera tekstu ani obsługiwanych ilustracji.");
  const czesci=dziel==="parts"?smartPodzielNaglowki(clean,nazwa):[{title:nazwa,html:clean}];
  return czesci.map((x,i)=>({title:x.title||nazwa,html:x.html||"<div>[Pusty dokument]</div>",source:file.name,part:i+1,kind:"docx",warning:[(wynik.messages||[]).length?"Część złożonego formatowania mogła zostać uproszczona.":"",...bledyOcr].filter(Boolean).join(" ")}));
}
async function smartCzytajObraz(file,zachowaj,ocr){
  const img=await smartCzekaj(smartObraz(file)),canvas=smartCanvas(img,2200);let tekst="",warning="";
  try{
    if(ocr)try{tekst=await smartRozpoznajObraz(canvas);}catch(e){
      if(e instanceof ImportAnulowany||!zachowaj)throw e;
      await smartZakonczOcr();warning="OCR nie zadziałał; zachowano obraz. "+(e.message||"");
    }
    const foto=zachowaj?'<img src="'+canvas.toDataURL("image/jpeg",.84)+'" class="img-center" style="width:75%">':"";
    if(!foto&&!tekst)throw new Error("Nie rozpoznano treści. Włącz OCR lub zachowanie obrazu.");
    const html=foto+(foto&&tekst?"<div><br></div>":"")+smartHtmlZTekstu(tekst);
    return [{title:smartNazwaBezRozszerzenia(file.name),html,source:file.name,kind:"image",warning:warning||(ocr&&!tekst?"Nie udało się rozpoznać tekstu.":(!ocr?"OCR był wyłączony.":""))}];
  }finally{canvas.width=1;canvas.height=1;}
}
function smartRenderPliki(){
  const box=$("smartFiles");box.innerHTML=smartPliki.map(f=>'<div class="smart-file"><span aria-hidden="true">'+(smartTyp(f)==="pdf"?"📄":smartTyp(f)==="docx"?"📝":"🖼️")+'</span><b>'+appleEsc(f.name)+'</b><small>'+ludzkiRozmiar(f.size)+'</small></div>').join("");
  $("smartAnalyze").disabled=!smartPliki.length;
}
function smartPokazZaimportowane(tag){
  query="";$("search").value="";
  filt.tag=tag.id;filt.book="all";filt.ch=null;filt.pub="all";
  if(typeof quickFilter!=="undefined")quickFilter="all";
  if(typeof persistFilt==="function")persistFilt();
  renderAll();
  if(innerWidth<=900&&typeof mobileShow==="function")mobileShow("colNotes");
}
function smartRenderPodglad(){
  $("smartSummary").innerHTML="Powstanie <b>"+smartWyniki.length+"</b> notatek. Odznacz te, których nie chcesz dodawać, i popraw tytuły oraz rozpoznaną treść w razie potrzeby.";
  $("smartPreviewList").innerHTML=smartWyniki.map((x,i)=>'<div class="smart-preview-row"><input type="checkbox" aria-label="Dodaj notatkę '+(i+1)+'" data-smart-check="'+i+'" checked><div><input type="text" aria-label="Tytuł notatki '+(i+1)+'" maxlength="180" data-smart-title="'+i+'" value="'+appleEsc(x.title)+'"><small>'+appleEsc(x.source+(x.page?" · strona "+x.page:""))+'</small>'+(x.warning?'<small class="smart-warn">⚠ '+appleEsc(x.warning)+'</small>':"")+'<details class="smart-content"><summary>Pokaż i popraw treść notatki</summary><div contenteditable="true" role="textbox" aria-multiline="true" aria-label="Treść notatki '+(i+1)+'" data-smart-body="'+i+'">'+sanitize(x.html)+'</div></details></div></div>').join("");
  $("smartSetup").hidden=true;$("smartPreview").hidden=false;openModal("modalSmartImport");
}
function otworzSmartImport(){
  if(smartPracuje){toast("Poczekaj na zakończenie lub anulowanie bieżącego importu.");return;}
  smartWybor++;smartPliki=[];smartWyniki=[];$("smartInput").value="";$("smartFiles").innerHTML="";$("smartAnalyze").disabled=true;
  $("smartSetup").hidden=false;$("smartPreview").hidden=true;openModal("modalSmartImport");
}
async function smartWybierzPliki(pliki){
  if(smartPracuje)return;
  const wybor=++smartWybor,lista=[...pliki];
  smartPliki=[];smartWyniki=[];smartRenderPliki();
  if(!lista.length)return;
  try{
    if(lista.length>SMART_MAX_PLIKOW)throw new Error("Jednorazowo wybierz najwyżej "+SMART_MAX_PLIKOW+" plików.");
    const limit=importNaUrzadzeniuMobilnym()?SMART_MAX_PLIK_MOBILE:SMART_MAX_PLIK_DESKTOP;
    for(const f of lista){
      if(!f.size||f.size>limit)throw new Error(f.name+": plik pusty lub większy niż "+ludzkiRozmiar(limit)+".");
      try{await smartSprawdzTyp(f);}catch(err){throw new Error(f.name+": "+err.message);}
      if(wybor!==smartWybor)return;
    }
    smartPliki=lista;smartRenderPliki();
  }catch(err){if(wybor!==smartWybor)return;showInfo("Nie odczytano pliku",appleEsc(err.message));}
}
for(const id of ["smartInput","smartPhotoInput"])$(id).addEventListener("change",e=>{
  const pliki=[...(e.target.files||[])];e.target.value="";
  if(pliki.length)smartWybierzPliki(pliki);
});
$("smartPhotoChoose").onclick=()=>{if(!smartPracuje)$("smartPhotoInput").click();};
$("smartPasteImage").onclick=async()=>{
  if(smartPracuje)return;
  if(!navigator.clipboard||!navigator.clipboard.read){showInfo("Wybierz zapisany zrzut","Ta przeglądarka nie udostępnia obrazów ze schowka. Użyj przycisku <b>Zdjęcie / zrzut ekranu</b>.");return;}
  try{
    const items=await navigator.clipboard.read(),pliki=[];
    for(const item of items){
      const typ=item.types.find(t=>/^image\/(png|jpeg|webp)$/.test(t));
      if(typ){const blob=await item.getType(typ);pliki.push(new File([blob],"Zrzut ekranu "+(pliki.length+1)+"."+(typ==="image/jpeg"?"jpg":typ.split("/")[1]),{type:typ}));}
    }
    if(!pliki.length)throw new Error("W schowku nie ma obrazu PNG, JPEG ani WEBP.");
    await smartWybierzPliki(pliki);
  }catch(err){showInfo("Nie wklejono zrzutu",appleEsc(err.name==="NotAllowedError"?"Brak dostępu do schowka. Wybierz zapisany zrzut przyciskiem Zdjęcie / zrzut ekranu.":err.message));}
};
$("smartAnalyze").onclick=async()=>{
  if(!smartPliki.length||smartPracuje)return;smartPracuje=true;$("smartAnalyze").disabled=true;
  const dziel=$("smartSplit").value,ocr=$("smartOcr").checked,zachowaj=$("smartImages").checked,wymusOcr=$("smartOcrAll").checked;
  closeModal("modalSmartImport");pokazPostepImportu("Inteligentny import");smartWyniki=[];const bledy=[];
  smartAbortController=new AbortController();
  _anulujImportDodatkowo=()=>{smartAbortController.abort();smartZakonczOcr();};
  try{
    for(let i=0;i<smartPliki.length;i++){
      const f=smartPliki[i],typ=smartTyp(f),baza=12+Math.round(i/smartPliki.length*70);sprawdzAnulowanieImportu();
      ustawPostepImportu(baza,"Odczytuję „"+f.name+"” ("+(i+1)+" z "+smartPliki.length+")…");
      try{
        const x=typ==="pdf"?await smartCzytajPdf(f,dziel,ocr,baza,zachowaj,wymusOcr):typ==="docx"?await smartCzytajDocx(f,dziel,ocr&&wymusOcr):await smartCzytajObraz(f,zachowaj,ocr);
        sprawdzAnulowanieImportu();
        smartWyniki.push(...x);
      }catch(err){if(err instanceof ImportAnulowany)throw err;bledy.push(f.name+": "+(err&&err.message||"błąd odczytu"));}
      await oddechImportu();
    }
    await smartZakonczOcr();sprawdzAnulowanieImportu();
    if(!smartWyniki.length)throw new Error(bledy.join(" ")||"Nie znaleziono treści do zaimportowania.");
    if(bledy.length)smartWyniki[0].warning=(smartWyniki[0].warning?smartWyniki[0].warning+" ":"")+"Pominięte pliki: "+bledy.join("; ");
    ustawPostepImportu(100,"Podgląd jest gotowy");await oddechImportu();schowajPostepImportu();smartRenderPodglad();
  }catch(err){const anulowany=err instanceof ImportAnulowany||(_stanImportu&&_stanImportu.anulowany);await smartZakonczOcr();if(_stanImportu)schowajPostepImportu();if(!anulowany)await showInfo("Nie odczytano dokumentów",appleEsc(err&&err.message||"Nieznany błąd")+"<br><br><b>Żadna notatka nie została zapisana.</b>");openModal("modalSmartImport");}
  finally{smartAbortController=null;smartPracuje=false;$("smartAnalyze").disabled=!smartPliki.length;}
};
$("smartBack").onclick=()=>{$("smartPreview").hidden=true;$("smartSetup").hidden=false;};
$("smartSave").onclick=async()=>{
  if(smartPracuje)return;
  const wybrane=[];
  $("smartPreviewList").querySelectorAll("[data-smart-check]").forEach(ch=>{if(!ch.checked)return;const i=+ch.dataset.smartCheck,x=Object.assign({},smartWyniki[i]);const inp=$("smartPreviewList").querySelector('[data-smart-title="'+i+'"]');x.title=(inp&&inp.value.trim())||x.title;const body=$("smartPreviewList").querySelector('[data-smart-body="'+i+'"]');if(body)x.html=sanitize(body.innerHTML);wybrane.push(x);});
  if(!wybrane.length){toast("Zaznacz co najmniej jedną notatkę");return;}
  smartPracuje=true;$("smartSave").disabled=true;closeModal("modalSmartImport");pokazPostepImportu("Zapisywanie dokumentów");
  let zapisano=false;
  try{
    if(!idb){pokazBrakPamieci();throw bladBrakuPamieci();}
    const tagiNowe=tags.map(t=>Object.assign({},t)),nazwaTagu=$("smartTag").value.trim()||"Importowane dokumenty";
    let tag=tagiNowe.find(t=>norm(t.name)===norm(nazwaTagu));if(!tag){tag={id:nastepnyNumer(tagiNowe),name:nazwaTagu,nw:true};tagiNowe.push(tag);}
    const nowe=[],znane=notes.slice();let duplikaty=0,suma=0;
    for(let i=0;i<wybrane.length;i++){
      sprawdzAnulowanieImportu();const x=wybrane[i],clean=sanitize(x.html),now=new Date().toISOString();
      if(!smartMaTresc(clean))throw new Error("Notatka „"+(x.title||"Dokument")+"” jest pusta. Uzupełnij jej treść lub odznacz ją w podglądzie.");
      const n={g:crypto.randomUUID().toUpperCase(),t:String(x.title||"Dokument").slice(0,180),h:clean,c:htmlToPlain(clean),b:0,ch:0,v:0,pub:"",ks:"",doc:0,itn:0,col:0,cr:now,mo:now,tg:[tag.id],nw:true,tgd:true,importSrc:x.source,importKind:x.kind};
      if(x.page)n.importPage=x.page;if(x.part)n.importPart=x.part;
      if(znane.some(a=>smartTaSamaNotatka(a,n))){duplikaty++;continue;}nowe.push(n);znane.push(n);suma+=clean.length*2;
    }
    if(!nowe.length){schowajPostepImportu();showInfo("Nie dodano duplikatów","Wybrane dokumenty są już zapisane w JW Study.");return;}
    await sprawdzMiejsceDlaImportu(smartPliki.reduce((a,f)=>a+f.size,0),suma);rozpocznijZapisImportu();ustawPostepImportu(70,"Zapisuję "+nowe.length+" notatek w jednej transakcji…");
    await idbZapiszImportZewnetrzny(nowe,tagiNowe,notes.length+nowe.length,tagiNowe.length);
    zapisano=true;
    notes.push(...nowe);tags=tagiNowe;bumpTagsVer();bumpDirty();if(typeof workerOznaczIndeksDoOdbudowy==="function")workerOznaczIndeksDoOdbudowy();
    ustawPostepImportu(100,"Gotowe");renderAll();await oddechImportu();schowajPostepImportu();
    smartPokazZaimportowane(tag);
    showInfo("Dokumenty zaimportowane","Dodano <b>"+nowe.length+"</b> notatek do etykiety <b>"+appleEsc(tag.name)+"</b>."+(duplikaty?"<br>Pominięto duplikaty: "+duplikaty+".":"")+"<br><br>Rozpoznane odsyłacze biblijne staną się aktywne podczas wyświetlania notatki.");
  }catch(err){
    if(_stanImportu)schowajPostepImportu();
    if(zapisano){await showInfo("Dokumenty zapisane","Zapis do bazy zakończył się poprawnie, ale nie udało się odświeżyć widoku. Otwórz aplikację ponownie, aby zobaczyć notatki.");}
    else{
      if(!(err instanceof ImportAnulowany))await showInfo("Nie zapisano dokumentów",appleEsc(err&&err.message||"Nieznany błąd")+"<br><br><b>Dotychczasowe dane pozostały bez zmian.</b> Podgląd pozostaje dostępny po zamknięciu tego komunikatu.");
      openModal("modalSmartImport");
    }
  }
  finally{smartPracuje=false;$("smartSave").disabled=false;}
};

async function handleImportFile(e){
  const file=e.target.files[0]; e.target.value="";
  if(!file) return;
  const limity=limityImportu();
  try{
    if(file.size > limity.archiwum)
      throw new Error("Plik ma "+ludzkiRozmiar(file.size)+", a dopuszczalne jest do "+
                      ludzkiRozmiar(limity.archiwum)+". "+
                      (limity.mobilne
                        ? "Na iPhonie i iPadzie większa kopia może zamknąć aplikację z braku pamięci. Otwórz ją na komputerze."
                        : "To nie wygląda na bezpieczną kopię z JW Library."));
    if(file.size === 0) throw new Error("Plik jest pusty.");
  }catch(err){ showInfo("Nie wczytano kopii", esc(err.message)); return; }

  pokazPostepImportu("Import z JW Library");
  let db = null;
  let zapisano=false;
  try{
    ustawPostepImportu(4,"Wczytuję bezpieczne biblioteki…");
    await getLibs();
    sprawdzAnulowanieImportu();
    ustawPostepImportu(12,"Odczytuję archiwum…");
    const buf=await file.arrayBuffer();
    sprawdzAnulowanieImportu();

    let zip;
    try{ zip = await JSZip.loadAsync(buf); }
    catch(err){ throw new Error("Pliku nie da się otworzyć jako archiwum — jest uszkodzony albo to nie jest kopia z JW Library."); }
    sprawdzAnulowanieImportu();
    ustawPostepImportu(25,"Sprawdzam zawartość kopii…");

    const wpisy = Object.keys(zip.files);
    if(wpisy.length > MAX_WPISOW_ZIP)
      throw new Error("Archiwum zawiera "+wpisy.length+" plików. Kopia z JW Library ma ich kilkanaście — to nie jest ten rodzaj pliku.");

    const dbFile=zip.file("userData.db");
    if(!dbFile) throw new Error("W archiwum nie ma pliku userData.db — to nie jest kopia z JW Library.");

    /* Rozmiar po rozpakowaniu znamy z nagłówka archiwum — sprawdzamy go, ZANIM
       zaczniemy rozpakowywać, więc bomba zip nie zdąży zająć pamięci. */
    const zapowiadany = dbFile._data && dbFile._data.uncompressedSize;
    if(zapowiadany && zapowiadany > limity.baza)
      throw new Error("Baza w archiwum ma "+ludzkiRozmiar(zapowiadany)+" po rozpakowaniu, "+
                      "a dopuszczalne jest do "+ludzkiRozmiar(limity.baza)+
                      (limity.mobilne ? " na tym urządzeniu mobilnym." : "."));

    let dbBytes;
    try{
      dbBytes = await dbFile.async("uint8array", meta=>{
        ustawPostepImportu(28+(meta.percent||0)*.27,"Rozpakowuję bazę JW Library…");
        sprawdzAnulowanieImportu();
      });
    }
    catch(err){
      if(err && err.name==="ImportAnulowany") throw err;
      throw new Error("Nie udało się rozpakować bazy z archiwum — plik jest uszkodzony.");
    }

    sprawdzAnulowanieImportu();
    if(dbBytes.length > limity.baza)
      throw new Error("Rozpakowana baza ma "+ludzkiRozmiar(dbBytes.length)+", a dopuszczalne jest do "+ludzkiRozmiar(limity.baza)+".");
    if(dbBytes.length < 100) throw new Error("Baza w archiwum jest pusta lub uszkodzona.");
    /* Każdy plik SQLite zaczyna się od tego napisu. Sprawdzenie kosztuje nic,
       a oszczędza wywrotki wewnątrz sql.js na przypadkowym pliku. */
    const naglowek = String.fromCharCode.apply(null, dbBytes.subarray(0,15));
    if(naglowek !== "SQLite format 3")
      throw new Error("Plik userData.db nie jest bazą SQLite — archiwum jest uszkodzone.");

    try{ db = new SQL.Database(dbBytes); }
    catch(err){ throw new Error("Bazy z archiwum nie da się otworzyć — jest uszkodzona."); }

    ustawPostepImportu(58,"Porównuję notatki i etykiety…");
    await oddechImportu();
    const noweNotes=notes.map(n=>Object.assign({},n,{tg:Array.isArray(n.tg)?n.tg.slice():n.tg}));
    const noweTags=tags.map(t=>Object.assign({},t));
    let res;
    try{ res = importFromDb(db,{notes:noweNotes,tags:noweTags}); }
    catch(err){ throw new Error("Baza otworzyła się, ale nie ma w niej spodziewanych tabel notatek. "+
                                "To może być kopia z innej wersji JW Library."); }
    sprawdzAnulowanieImportu();
    ustawPostepImportu(70,"Sprawdzam wolne miejsce…");
    await sprawdzMiejsceDlaImportu(buf.byteLength,dbBytes.length);
    sprawdzAnulowanieImportu();

    const dataKopii=new Date().toISOString();
    rozpocznijZapisImportu();
    ustawPostepImportu(78,"Zapisuję wszystko jako jedną bezpieczną operację…");
    await idbZapiszImport(res.changed,noweTags,buf,file.name,dataKopii,noweNotes.length,
      czesc=>ustawPostepImportu(78+czesc*12,"Zapisuję dane porcjami…"));
    zapisano=true;
    ustawPostepImportu(91,"Kontroluję zapis w pamięci urządzenia…");
    const kontrola=await sprawdzImport(noweNotes.length,noweTags.length,file.name,dataKopii);
    if(!kontrola.zgadza)
      throw new Error("Import został zapisany, ale kontrolny odczyt nie potwierdził kompletu danych. Zamknij i otwórz aplikację przed dalszą pracą.");

    notes=noweNotes; tags=noweTags;
    if(res.bibleKs){ bibleKs=res.bibleKs; try{localStorage.setItem(KP+"BibleKs",bibleKs);}catch(e){} }
    if(typeof bumpTagsVer==="function") bumpTagsVer();
    ustawPostepImportu(100,"Import zapisany i sprawdzony");
    renderAll();
    schowajPostepImportu();
    /* Do tablicy trafiło naraz dużo notatek — pamięć podręczna szukania
       buduje się od nowa w bezczynności, a nie przy pierwszym klawiszu. */
    setTimeout(()=>{
      if(!(typeof uruchomIndeksWorkerSzukania==="function" && uruchomIndeksWorkerSzukania()) && typeof rozgrzejCacheSzukania==="function") rozgrzejCacheSzukania();
    },300);
    /* NAJPIERW RÓŻNICE, POTEM PODSUMOWANIE.
       Odwrotna kolejność kazałaby zamknąć okno z liczbami, żeby dopiero zobaczyć,
       że coś czeka na decyzję — a podsumowanie bez rozstrzygniętych różnic i tak
       podawałoby liczby nieostateczne. */
    let zastapione = 0;
    if(res.roznice && res.roznice.length && typeof pokazRoznice==="function"){
      zastapione = await pokazRoznice(res.roznice);
    }
    showInfo("Import zakończony", `Kopia z JW Library została <b>dołączona, zapisana i sprawdzona</b> (bez kasowania Twoich danych).<br><br>`+
      `• Nowych notatek: <b>${res.added}</b><br>`+
      `• Zaktualizowanych: <b>${res.updated + zastapione}</b><br>`+
      (res.roznice && res.roznice.length
        ? `• Rozjechanych, pokazanych do wyboru: <b>${res.roznice.length}</b>`+
          (zastapione ? ` — zastąpiono <b>${zastapione}</b>` : ` — zostawiono wszystkie swoje`) + `<br>`
        : "")+
      `• Pominięto (bez zmian): ${res.skipped}`+
      (res.wlasne ? `<br>• Nietknięte miejsca ustawione ręcznie: <b>${res.wlasne}</b>` : "")+
      (res.polozenia ? `<br><br>Poprawiono położenie w publikacji u <b>${res.polozenia}</b> notatek — `+
                       `to naprawia sortowanie „Kolejność w publikacji”.` : ""));
  }catch(err){
    console.warn("Import z JW Library nie powiódł się", err);
    schowajPostepImportu();
    const anulowany=err && err.name==="ImportAnulowany";
    showInfo(anulowany ? "Import anulowany" : "Nie wczytano kopii",
      esc(err && err.message ? err.message : String(err))+
      (zapisano
        ? "<br><br><b>Nie pokazuję fałszywego komunikatu sukcesu.</b> Zapis atomowy się zakończył, ale jego kontrola nie dała pewnego wyniku. Zamknij i ponownie otwórz aplikację."
        : "<br><br><b>Twoje notatki pozostały nietknięte</b> — import zmienia dane dopiero po pomyślnym odczytaniu i zapisaniu całej kopii."));
  }finally{
    if(db){ try{ db.close(); }catch(e){} }   // pamięć bazy zwalniamy także po błędzie
  }
}
/* ==========================================================================
   CZY TO NAPRAWDĘ RÓŻNICA

   Porównujemy sam TEKST, nie zapis. Notatka wyeksportowana stąd i wczytana
   z powrotem ma inne odstępy i łamania wierszy — JW Library przechowuje ją
   jako czysty tekst — więc porównanie znak po znaku pokazywałoby różnicę przy
   każdym wczytaniu tej samej notatki. Pytanie o coś, co się nie zmieniło, jest
   gorsze niż brak pytania: uczy klikać „dalej" bez patrzenia.
   ========================================================================== */
function tekstDoPorownania(x){
  return String(x||"").replace(/\s+/g," ").trim();
}
function toSamaTresc(moja, zBiblioteki){
  const a = tekstDoPorownania(moja.c || (moja.h ? htmlToPlain(moja.h) : ""));
  const b = tekstDoPorownania(zBiblioteki.c);
  return a === b && tekstDoPorownania(moja.t) === tekstDoPorownania(zBiblioteki.t);
}
/** Czy notatka ma coś, czego JW Library nie przechowuje i czego nie odzyska. */
function maFormatowanie(n){
  return !!(n.h && /<(b|i|u|s|mark|img|ul|ol|li|h2|h3|blockquote|font|span)[ >]/i.test(n.h));
}
function opiszRoznice(moja, zBiblioteki, powod){
  return {
    g: moja.g,
    powod,
    zeZdjeciem: !!(moja.h && /<img/i.test(moja.h)),
    zFormatowaniem: maFormatowanie(moja),
    moja:       {t: moja.t||"", c: moja.c || (moja.h?htmlToPlain(moja.h):""), mo: moja.mo||""},
    biblioteka: {t: zBiblioteki.t||"", c: zBiblioteki.c||"", mo: zBiblioteki.mo||""}
  };
}
function importFromDb(db, opcje){
  opcje=opcje||{};
  const docNotes=opcje.notes||notes, docTags=opcje.tags||tags;
  const tagRows=db.exec("SELECT TagId, Name FROM Tag WHERE Type=1");
  const tagIdMap={};
  if(tagRows.length){
    tagRows[0].values.forEach(([tid,name])=>{
      name=(name||"").trim();
      if(deletedTagNames.includes(name)){ return; }
      let t=docTags.find(x=>x.name===name || x.orig===name);
      if(!t){ t={id:Math.max(0,...docTags.map(x=>x.id),tid)+1,name,nw:true}; docTags.push(t); }
      tagIdMap[tid]=t.id;
    });
    docTags.sort(cmpTags);
  }
  const ntags={};
  const tmRows=db.exec("SELECT NoteId, TagId FROM TagMap WHERE NoteId IS NOT NULL");
  if(tmRows.length) tmRows[0].values.forEach(([nid,tid])=>{ if(tagIdMap[tid]!==undefined)(ntags[nid]=ntags[nid]||[]).push(tagIdMap[tid]); });
  const q=`SELECT n.NoteId, n.Guid, n.Title, n.Content, n.Created, n.LastModified, n.BlockType, n.BlockIdentifier,
    l.BookNumber, l.ChapterNumber, l.Title, l.KeySymbol, l.DocumentId, l.IssueTagNumber, u.ColorIndex
    FROM Note n LEFT JOIN Location l ON n.LocationId=l.LocationId LEFT JOIN UserMark u ON n.UserMarkId=u.UserMarkId`;
  const rows=db.exec(q);
  let added=0,updated=0,skipped=0,polozenia=0,wlasne=0;
  const roznice=[];
  const byG={}; docNotes.forEach(n=>byG[n.g]=n);
  const changed=[];
  if(rows.length) rows[0].values.forEach(r=>{
    const [nid,g,title,content,created,mo,btype,bid,book,ch,locTitle,keySym,docId,itn,col]=r;
    const inc={ g, t:(title||"").trim(), c:content||"",
      b:book||0, ch:ch||null, v:(book&&btype===2)?bid:null,
      pub:!book?(locTitle||keySym||""):"", ks:keySym||"", doc:docId||0, itn:itn||0,
      // numer akapitu w publikacji — potrzebny do sortowania „po kolejności w publikacji"
      par:(!book && bid) ? bid : 0,
      col:col||0, cr:created, mo:mo, tg:(ntags[nid]||[]).sort() };
    const ex=byG[g];
    if(!ex){
      if(deletedGuids.includes(g)){ skipped++; }
      else { docNotes.push(inc); changed.push(inc); added++; }
    }
    else if(ex.del){ skipped++; }
    else {
      /* POŁOŻENIE ODŚWIEŻAMY ZAWSZE.
         To nie jest treść użytkownika, tylko fakt z JW Library: w której
         publikacji, w którym wydaniu, artykule i akapicie leży notatka.
         Wcześniej notatka raz zmieniona w aplikacji (ex.ed) była pomijana
         w całości — razem z położeniem. Kto poprawił u siebie choćby literówkę,
         zostawał ze starymi albo pustymi numerami i sortowanie „jak
         w publikacji" ustawiało mu takie notatki byle gdzie. Nadpisanie tych
         pól nie może niczego zgubić, bo użytkownik ich nie tworzy. */
      const polozenie = ["b","ch","v","pub","ks","doc","itn","par"];
      let ruszone = false;
      /* Jedyny wyjątek: miejsce wskazane ręcznie (pw) albo werset przypisany
         przez użytkownika. To JEST jego decyzja, nie fakt z biblioteki, więc
         import jej nie unieważnia — inaczej przypisanie znikałoby przy
         najbliższym wczytaniu kopii i wracalibyśmy do punktu wyjścia. */
      if(!ex.pw) polozenie.forEach(k=>{ if(ex[k]!==inc[k]){ ex[k]=inc[k]; ruszone=true; } });

      if(ex.pw) wlasne++;
      if(ruszone) polozenia++;

      /* ═══ ROZSTRZYGANIE RÓŻNIC ═══

         Dawniej działo się to po cichu i w dwie strony gubiło pracę:

         • notatkę zmienioną TUTAJ import pomijał w całości — wersja z JW
           Library znikała bez słowa, wliczona do „pominięto";
         • notatkę zmienioną TYLKO w JW Library nadpisywał i przy okazji
           kasował `h`, czyli CAŁE FORMATOWANIE I ZDJĘCIA. JW Library trzyma
           notatki jako czysty tekst, więc nie miał ich skąd odtworzyć.

         Obie decyzje bywają słuszne — ale nie da się ich podjąć za kogoś.
         Zbieramy je więc i pokazujemy: oba teksty obok siebie, wybór przy
         każdej notatce. Reszta wchodzi bez pytania, jak dotąd. */
      const tenSamTekst = toSamaTresc(ex, inc);
      const straceFormatowanie = maFormatowanie(ex);

      if(tenSamTekst){
        /* Treść się zgadza — nie ma o czym rozstrzygać. Zapisujemy tylko
           odświeżone położenie, jeśli się zmieniło. */
        if(ruszone) changed.push(ex);
        skipped++;
      } else if(ex.ed || ex.tgd){
        roznice.push(opiszRoznice(ex, inc, "zmienione w obu miejscach"));
        if(ruszone) changed.push(ex);
      } else if((inc.mo||"") > (ex.mo||"")){
        if(straceFormatowanie){
          roznice.push(opiszRoznice(ex, inc, "wersja z JW Library jest nowsza, ale bez formatowania"));
          if(ruszone) changed.push(ex);
        } else {
          const keepCol=ex.col; Object.assign(ex,inc); ex.h=null; if(!inc.col)ex.col=keepCol;
          changed.push(ex); updated++;
        }
      } else { if(ruszone) changed.push(ex); skipped++; }
    }
  });
  // wykryj symbol Biblii używany na tym urządzeniu (nwt / nwtsty / inne), do budowania linków do wersetów
  let wykrytyBibleKs="";
  try{
    const bk=db.exec("SELECT KeySymbol, COUNT(*) c FROM Location WHERE BookNumber IS NOT NULL AND KeySymbol IS NOT NULL GROUP BY KeySymbol ORDER BY c DESC LIMIT 1");
    if(bk.length && bk[0].values[0][0]) wykrytyBibleKs=bk[0].values[0][0];
  }catch(e){}
  return {added,updated,skipped,polozenia,wlasne,roznice,changed,bibleKs:wykrytyBibleKs};
}
/* ===== podkreślenia: kolory, etykieta, link ===== */
function openUrlJWL(url){
  if(!url) return;
  // Uniwersalny link jw.org: na iPhone/iPad system sam przekieruje do aplikacji JW Library,
  // na komputerze otworzy kartę przeglądarki. Otwieramy przez prawdziwy odnośnik (działa z gestem dotyku).
  const a=document.createElement("a");
  a.href=url; a.target="_blank"; a.rel="noopener noreferrer";
  document.body.appendChild(a); a.click(); a.remove();
}
