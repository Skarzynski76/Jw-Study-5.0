/* ==========================================================================
   JW Study — export-doc.js
   Eksport notatek do Word i PDF
   ========================================================================== */
"use strict";
/* ================= EKSPORT NOTATKI (WORD / PDF) ================= */
/* ——— wspólny arkusz stylów eksportu ———
   Wcześniej ten sam zestaw reguł był wpisany osobno w eksporcie pojedynczej notatki
   i w eksporcie całej etykiety. Teraz jest jeden komplet plus krótkie różnice. */
const EXPORT_CSS_BASE = `
body{font-family:Arial,Helvetica,sans-serif;line-height:1.6;margin:24px auto;padding:0 18px;color:#222}
.meta{color:#777;font-size:12px}
mark{padding:0 2px;border-radius:3px}
mark.hl1{background:#ffe97d}mark.hl2{background:#b7e4a7}mark.hl3{background:#a8d5f2}mark.hl4{background:#d9b8f0}
mark.hl5{background:#f5b0b0}mark.hl6{background:#ffcf8f}mark.hl7{background:#9fe3d5}
blockquote{margin:6px 0 6px 22px;padding-left:10px;border-left:3px solid #ccc}
h3{font-size:15px;margin:10px 0 3px}
ul,ol{margin:4px 0 4px 24px}
.content{white-space:pre-wrap}
.content::after{content:"";display:block;clear:both}
@media print{.note{page-break-inside:avoid}}`;
/* pojedyncza notatka — węższa kolumna, większy tytuł */
const EXPORT_CSS_ONE = EXPORT_CSS_BASE + `
body{max-width:720px}
h1{font-size:22px;color:#1e5b46;border-bottom:2px solid #2e7a5f;padding-bottom:6px;margin:0 0 6px}
.meta{margin-bottom:16px}
img{max-width:100%}
h2{font-size:18px;color:#5b4636;margin:12px 0 4px}`;
/* cała etykieta — nagłówek zbioru, notatki oddzielone linią, oblewanie zdjęć */
const EXPORT_CSS_MANY = EXPORT_CSS_BASE + `
body{max-width:760px}
.doc-title{font-size:24px;color:#1e5b46;margin:0 0 3px;font-weight:bold}
.doc-sub{color:#777;font-size:12px;margin-bottom:22px}
.note{margin:0 0 24px;padding:0 0 18px;border-bottom:1px solid #e2ddd2}
.note:last-child{border-bottom:none}
h1{font-size:19px;color:#1e5b46;border-bottom:2px solid #2e7a5f;padding-bottom:5px;margin:0 0 6px}
.meta{margin-bottom:12px}
img{max-width:100%;height:auto;float:right;margin:4px 0 8px 16px}
img.img-left{float:left;margin:4px 16px 8px 0}
img.img-center{float:none;display:block;margin:10px auto}
img.img-inline{float:none;display:inline;margin:0 4px}
h2{font-size:17px;color:#5b4636;margin:12px 0 4px}`;

/* szkielet dokumentu HTML używany przez oba eksporty */
function exportDocHtml(title, css, body){
  return `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>${css}
</style></head><body>
${body}
</body></html>`;
}
/* wiersz metadanych: werset · symbol publikacji · data */
function exportMetaLine(n){
  return `${esc(refLabel(n)||"")}${n.ks?" · "+esc(n.ks):""}${n.mo?" · "+(n.mo||"").substring(0,10):""}`;
}
/* treść jednej notatki — HTML z edytora, a gdy go brak, tekst z ucieczką znaków */
function exportNoteBody(n){ return n.h || esc(n.c||""); }

function noteExportHtml(n){
  const ref = refLabel(n);
  return exportDocHtml(n.t||ref||"Notatka", EXPORT_CSS_ONE,
`<h1>${esc(n.t||"")}</h1>
<div class="meta">${exportMetaLine(n)}</div>
<div class="content">${exportNoteBody(n)}</div>`);
}
function exportFileName(n){
  return ((refLabel(n)||n.t||"notatka").replace(/[^\p{L}\p{N} ,-]/gu,"").trim().substring(0,50)||"notatka");
}
/** Czy aplikacja działa jako ikona z ekranu głównego (tryb samodzielny). */
function trybSamodzielny(){
  return !!navigator.standalone ||
         (matchMedia && matchMedia("(display-mode: standalone)").matches);
}

/**
 * Zapisuje plik i MÓWI, gdy się nie udało.
 *
 * Na iPhonie i iPadzie uruchomionych z ekranu głównego przeglądarka NIE POBIERA
 * plików: kliknięcie w <a download> nie robi zupełnie nic i nie zgłasza błędu.
 * Wcześniej kończyliśmy właśnie na tym — użytkownik dotykał „Zapisz", nic się
 * nie działo i wyglądało to na zepsutą aplikację. Dlatego:
 *   1. na telefonie próbujemy okna udostępniania (AirDrop, Pliki, Mail),
 *   2. gdy go nie ma albo zawiedzie, w trybie samodzielnym NIE udajemy sukcesu,
 *      tylko tłumaczymy, co zrobić.
 *
 * @returns {Promise<boolean>} czy plik faktycznie wyszedł z aplikacji
 */
async function saveFile(blob, filename, title){
  // iPadOS w Safari udaje „Maca” — isIOS() wykrywa to poprawnie (maxTouchPoints)
  const isMobile = (typeof isIOS==="function" && isIOS()) || /Android/i.test(navigator.userAgent);
  let powodShare = "";
  if(isMobile){
    try{
      if(navigator.canShare && typeof File!=="undefined"){
        const file = new File([blob], filename, {type: blob.type});
        if(navigator.canShare({files:[file]})){
          await navigator.share({files:[file], title: title || filename});
          return true;
        }
        powodShare = "system nie przyjmuje tego rodzaju pliku";
      } else powodShare = "urządzenie nie ma okna udostępniania";
    }catch(err){
      if(err && err.name==="AbortError") return false;      // użytkownik zrezygnował
      powodShare = (err && err.message) || String(err);
    }
  }
  if(isMobile && trybSamodzielny()){
    /* Ostatnia deska ratunku byłaby pobraniem pliku, a to tutaj nie zadziała.
       Lepiej powiedzieć to wprost, niż zostawić martwy przycisk. */
    if(typeof showInfo==="function") showInfo("Nie udało się zapisać pliku",
      "Aplikacja uruchomiona z ikony na ekranie głównym <b>nie może pobierać plików</b> — "+
      "tak działa system, nie da się tego obejść od środka."+
      (powodShare ? "<br><br>Okno udostępniania nie zadziałało: <i>"+esc(powodShare)+"</i>." : "")+
      "<br><br><b>Co zrobić:</b> otwórz aplikację w Safari pod jej adresem "+
      "(zamiast z ikony) i powtórz zapis. Stamtąd plik zapisze się normalnie w „Plikach”.");
    return false;
  }
  download(blob, filename);   // komputer: zwykłe pobranie → dwuklik otwiera w Wordzie
  return true;
}
function canShareFiles(blob, filename){
  try{ return !!(navigator.canShare && typeof File!=="undefined" && navigator.canShare({files:[new File([blob],filename,{type:blob.type})]})); }
  catch(e){ return false; }
}
// wybór: zapis na dysku albo udostępnienie (Mail, SMS, AirDrop) — działa na Macu i iPadzie/iPhonie
function chooseSaveOrShare(blob, filename, title){
  const shareIcon=_svg('<path d="M12 3v13M8 7l4-4 4 4"/><path d="M5 12v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/>');
  const dd=$("dropdown");
  dd.innerHTML = `<div class="dd-lbl">${esc(filename)}</div>`+
    `<div data-sv="disk">${ICO.file}Zapisz na dysku</div>`+
    (canShareFiles(blob,filename)?`<div data-sv="share">${shareIcon}Udostępnij (Mail, SMS, AirDrop)</div>`:``);
  dd.style.display="block";
  dd.style.maxHeight="none"; dd.style.overflowY="visible";
  const w=dd.offsetWidth||270, h=dd.offsetHeight||140;
  const _ob = (typeof widocznyObszar==="function") ? widocznyObszar()
            : {lewo:0, gora:0, prawo:innerWidth, dol:innerHeight, szer:innerWidth};
  dd.style.left=Math.max(_ob.lewo+10, _ob.lewo+(_ob.szer-w)/2)+"px";
  dd.style.top=Math.max(_ob.gora+10, Math.min(_ob.gora+110, _ob.dol-h-20))+"px";
  dd.onclick=async ev=>{
    const a=ev.target.closest("[data-sv]"); if(!a) return;
    dd.style.display="none";
    if(a.dataset.sv==="disk"){ download(blob, filename); toast("Zapisano na dysku"); }
    else{
      try{ await navigator.share({files:[new File([blob],filename,{type:blob.type})], title:title||filename}); }
      catch(e){ if(!(e&&e.name==="AbortError")){ download(blob, filename); } }
    }
  };
}
function exportNoteWord(n){
  const blob = new Blob(["\ufeff"+noteExportHtml(n)], {type:"application/msword"});
  saveFile(blob, exportFileName(n)+".doc", "Notatka (Word)");
  toast("Przygotowano dokument Word");
}
function exportNotePdf(n){
  const ifr = document.createElement("iframe");
  ifr.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0";
  document.body.appendChild(ifr);
  ifr.srcdoc = noteExportHtml(n);
  ifr.onload = ()=>{
    setTimeout(()=>{
      try{ ifr.contentWindow.focus(); ifr.contentWindow.print(); }
      catch(e){ toast("Nie udało się otworzyć okna drukowania."); }
      setTimeout(()=>ifr.remove(), 3000);
    }, 300);
  };
  toast("W oknie drukowania wybierz „Zapisz jako PDF”");
}

/* ===== eksport CAŁEJ ZAKŁADKI (wszystkie notatki) do Word / PDF ===== */
function tagNotesSorted(t){
  return notes.filter(n=>!n.del && n.tg.includes(t.id))
    .sort((a,b)=>(a.b||99)-(b.b||99)||(a.ch||0)-(b.ch||0)||(a.v||0)-(b.v||0)||(a.mo||"").localeCompare(b.mo||""));
}
/* jedna notatka jako sekcja w dokumencie zbiorczym */
function exportNoteSection(n){
  const ref = refLabel(n);
  return `<section class="note"><h1>${esc(n.t||ref||"Notatka")}</h1>
      <div class="meta">${exportMetaLine(n)}</div>
      <div class="content">${exportNoteBody(n)}</div></section>`;
}
function notesExportHtml(list, heading, customSub){
  const countLabel = (typeof formatujLiczbeNotatek==="function") ? formatujLiczbeNotatek(list.length) : (list.length===1 ? "1 notatka" : list.length+" notatek");
  const sub = customSub || `Zakładka · ${countLabel} · ${new Date().toLocaleDateString("pl")}`;
  return exportDocHtml(heading, EXPORT_CSS_MANY,
`<div class="doc-title">${esc(heading)}</div>
<div class="doc-sub">${esc(sub)}</div>
${list.map(exportNoteSection).join("")}`);
}
function safeName(s){ return (s||"zakladka").replace(/[^\p{L}\p{N} ,-]/gu,"").trim().substring(0,50)||"zakladka"; }
function exportTagWord(t){
  const list = tagNotesSorted(t);
  if(!list.length){ toast("Ta zakładka nie ma notatek"); return; }
  const blob = new Blob(["﻿"+notesExportHtml(list, t.name)], {type:"application/msword"});
  saveFile(blob, safeName(t.name)+".doc", "Zakładka „"+t.name+"” (Word)");
  toast("Przygotowano Word — "+list.length+" notatek");
}
function exportTagPdf(t){
  const list = tagNotesSorted(t);
  if(!list.length){ toast("Ta zakładka nie ma notatek"); return; }
  const ifr = document.createElement("iframe");
  ifr.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0";
  document.body.appendChild(ifr);
  ifr.srcdoc = notesExportHtml(list, t.name);
  ifr.onload = ()=>{
    setTimeout(()=>{
      try{ ifr.contentWindow.focus(); ifr.contentWindow.print(); }
      catch(e){ toast("Nie udało się otworzyć okna drukowania."); }
      setTimeout(()=>ifr.remove(), 4000);
    }, 350);
  };
  toast("W oknie drukowania wybierz „Zapisz jako PDF” — "+list.length+" notatek");
}

/* ===== EKSPORT WYNIKÓW WYSZUKIWANIA (Word / PDF) ===== */
const EXPORT_CSS_SEARCH = EXPORT_CSS_BASE + `
body{max-width:780px}
.doc-header{border-bottom:2px solid #2e7a5f;padding-bottom:12px;margin-bottom:24px}
.doc-title{font-size:24px;color:#1e5b46;margin:0 0 4px;font-weight:bold}
.doc-sub{color:#666;font-size:12.5px;line-height:1.6;margin-bottom:18px}
.doc-query-badge{display:inline-block;background:#e8f4f0;color:#1e5b46;font-weight:bold;padding:2px 8px;border-radius:4px;margin-right:6px}
.note{margin:0 0 26px;padding:0 0 20px;border-bottom:1px solid #e2ddd2}
.note:last-child{border-bottom:none}
h1{font-size:19px;color:#1e5b46;border-bottom:2px solid #2e7a5f;padding-bottom:5px;margin:0 0 6px}
.meta{margin-bottom:10px;font-size:12px;color:#666}
.search-match-box{background:#f8faf9;border-left:3px solid #2e7a5f;border-radius:0 6px 6px 0;padding:7px 12px;margin:8px 0 12px;font-size:12.5px;color:#333;line-height:1.45}
.search-match-head{margin-bottom:3px}
.search-match-reason{display:inline-block;background:#2e7a5f;color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:3px;text-transform:uppercase;letter-spacing:0.5px;margin-right:6px}
.search-match-hits{display:inline-block;font-size:11px;color:#777}
.search-match-snippets{color:#444;font-style:italic}
.qhl{background:#ffe58a;color:#111;padding:0 2px;border-radius:2px;font-weight:600}
img{max-width:100%;height:auto;float:right;margin:4px 0 8px 16px;border-radius:4px}
img.img-left{float:left;margin:4px 16px 8px 0}
img.img-center{float:none;display:block;margin:10px auto}
img.img-inline{float:none;display:inline;margin:0 4px}
h2{font-size:17px;color:#5b4636;margin:12px 0 4px}
@media print{
  body{max-width:100%;padding:0;margin:0}
  .note{page-break-inside:avoid}
}`;

let _expSearchResultsCache = [];

function podswietlSlowaSzukaniaBezpiecznie(htmlStr, qStr){
  if(!htmlStr || !qStr) return htmlStr || "";
  try{
    const czysteSlowa = qStr.replace(/[^\p{L}\p{N}\s]/gu, " ")
      .trim().split(/\s+/)
      .filter(w=>w.length >= 2);
    if(!czysteSlowa.length) return htmlStr;

    const tmp = new DOMParser().parseFromString("<body>" + htmlStr, "text/html").body;
    if(!tmp) return htmlStr;

    const wzorce = czysteSlowa.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const rx = new RegExp("(" + wzorce.join("|") + ")", "gi");

    const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let cur;
    while(cur = walker.nextNode()){
      if(cur.parentElement && !["SCRIPT","STYLE","MARK"].includes(cur.parentElement.tagName)){
        textNodes.push(cur);
      }
    }

    for(const tn of textNodes){
      const val = tn.nodeValue;
      if(val && rx.test(val)){
        rx.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        val.replace(rx, (match, p1, offset)=>{
          if(offset > lastIdx) frag.appendChild(document.createTextNode(val.slice(lastIdx, offset)));
          const m = document.createElement("mark");
          m.className = "qhl";
          m.textContent = match;
          frag.appendChild(m);
          lastIdx = offset + match.length;
          return match;
        });
        if(lastIdx < val.length) frag.appendChild(document.createTextNode(val.slice(lastIdx)));
        if(tn.parentNode) tn.parentNode.replaceChild(frag, tn);
      }
    }
    return tmp.innerHTML;
  }catch(err){
    console.warn("Błąd bezpiecznego podświetlania:", err);
    return htmlStr;
  }
}

function pobierzAktualneWynikiSzukania(){
  const gMap = new Map(notes.map(n=>[n.g, n]));

  // 1. Najbardziej wiarygodne: lista notatek aktualnie wyświetlanych na ekranie (fsNavList)
  if(typeof fsNavList !== "undefined" && Array.isArray(fsNavList) && fsNavList.length > 0){
    const list = fsNavList.map(g=>gMap.get(g)).filter(n=>n && !n.del);
    if(list.length > 0) return list;
  }

  // 2. Karty w DOM (#noteList .ncard)
  const cards = document.querySelectorAll("#noteList .ncard");
  if(cards.length > 0){
    const domList = [...cards].map(c=>gMap.get(c.dataset.g)).filter(n=>n && !n.del);
    if(domList.length > 0) return domList;
  }

  // 3. Ostatnio otwierane
  if(sortMode==="recent"){
    return notes.filter(n=>!n.del && n.la).sort((a,b)=>b.la.localeCompare(a.la)).slice(0,5);
  }

  // 4. Pełne przeliczenie bez limitów ucinających bazę
  const qStr = ($("search") ? $("search").value : (typeof query!=="undefined"?query:"")).trim();
  if(qStr && (!query || query !== qStr)){
    if(typeof parseQuery === "function") parseQuery(qStr);
  }

  const qAktywne = !!query || (typeof aktywneOpcjeSzukania==="function" && aktywneOpcjeSzukania());
  const globalne = qAktywne && (typeof searchOpts!=="undefined" ? searchOpts.scope==="all" : true);

  let arr = notes.filter(n=>{
    if(!n || n.del) return false;
    if(!globalne && typeof noteMatchesTag==="function" && !(noteMatchesTag(n,filt.tag) && noteMatchesBook(n,filt.book) && noteMatchesCh(n) && noteMatchesPub(n,filt.pub))) return false;
    if(qAktywne && typeof noteMatchesQuery==="function" && !noteMatchesQuery(n)) return false;
    return true;
  });

  if(typeof filteredNotes === "function"){
    arr = arr.filter(matchesQuick);
  }
  if(typeof sortNotes === "function"){
    arr = sortNotes(arr);
  }
  return arr.length > 0 ? arr : notes.filter(n=>!n.del);
}

function searchExportMetaLine(n){
  const base = exportMetaLine(n);
  const tagNames = (n.tg||[]).map(tid=>{ const t=tags.find(x=>x.id===tid); return t?t.name:null; }).filter(Boolean);
  return base + (tagNames.length ? ` · 🏷️ ${esc(tagNames.join(", "))}` : "");
}

function searchExportNoteSection(n, optHl, optSnippet){
  const ref = refLabel(n);
  const tytul = n.t || ref || "Notatka bez tytułu";
  const curQ = ($("search") ? $("search").value : (typeof query!=="undefined"?query:"")).trim();

  let matchBox = "";
  if(optSnippet && typeof searchDetails !== "undefined"){
    const sd = curQ ? searchDetails.get(n.g) : null;
    if(sd){
      const fragmenty = (sd.snippets && sd.snippets.length) ? sd.snippets : (sd.snippet ? [sd.snippet] : []);
      const ileTraf = sd.occurrences ? `${sd.occurrences} ${sd.occurrences===1?"trafienie":"trafień"}` : "";
      const snipTxt = fragmenty.filter(Boolean).map(s=>`„…${esc(s)}…”`).join(" · ");
      if(sd.reason || ileTraf || snipTxt){
        matchBox = `<div class="search-match-box">` +
          `<div class="search-match-head">` +
            (sd.reason ? `<span class="search-match-reason">${esc(sd.reason)}</span>` : "") +
            (ileTraf ? `<span class="search-match-hits">${esc(ileTraf)}</span>` : "") +
          `</div>` +
          (snipTxt ? `<div class="search-match-snippets">${snipTxt}</div>` : "") +
        `</div>`;
      }
    }
  }

  let body = exportNoteBody(n);
  if(optHl && curQ){
    body = podswietlSlowaSzukaniaBezpiecznie(body, curQ);
  }

  return `<section class="note">` +
    `<h1>${esc(tytul)}</h1>` +
    `<div class="meta">${searchExportMetaLine(n)}</div>` +
    matchBox +
    `<div class="content">${body}</div>` +
  `</section>`;
}

function searchExportHtml(list, isWord = false){
  const q = ($("search") ? $("search").value : (typeof query!=="undefined"?query:"")).trim();
  const optHl = $("expOptHl") ? $("expOptHl").checked : true;
  const optSnippet = $("expOptSnippet") ? $("expOptSnippet").checked : true;
  const countLabel = list.length===1 ? "notatka" : (list.length%10>=2 && list.length%10<=4 && (list.length%100<12 || list.length%100>14)) ? "notatki" : "notatek";

  const docTitle = q ? `Wyniki wyszukiwania: „${q}”` : "Eksport wyników wyszukiwania";
  const zakres = (typeof opisFiltrowWynikow==="function") ? opisFiltrowWynikow() : "";
  const trybTxt = (typeof searchMode!=="undefined" && searchMode==="smart" ? "Tryb inteligentny" : "Tryb dokładny") + (zakres ? " · " + zakres : "");
  const dataTxt = new Date().toLocaleDateString("pl", {year:"numeric", month:"long", day:"numeric"});

  const headerHtml = `<div class="doc-header">` +
    `<div class="doc-title">${esc(docTitle)}</div>` +
    `<div class="doc-sub">` +
      (q ? `<span class="doc-query-badge">🔍 ${esc(q)}</span> ` : "") +
      `<span>${esc(trybTxt)}</span> · ` +
      `<span>${list.length} ${countLabel}</span> · ` +
      `<span>${dataTxt}</span>` +
    `</div>` +
  `</div>`;

  const notesHtml = list.map(n=>searchExportNoteSection(n, optHl, optSnippet)).join("\n");
  
  if(isWord){
    return `<!DOCTYPE html><html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40' lang="pl">` +
      `<head><meta charset="utf-8"><title>${esc(docTitle)}</title>` +
      `<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->` +
      `<style>${EXPORT_CSS_SEARCH}</style></head>` +
      `<body>${headerHtml}${notesHtml}</body></html>`;
  }

  return exportDocHtml(docTitle, EXPORT_CSS_SEARCH, headerHtml + notesHtml);
}

function ustawZakresEksportu(scope){
  const cards = {
    all: $("expScopeCardAll"),
    top: $("expScopeCardTop"),
    custom: $("expScopeCardCustom")
  };
  const radios = {
    all: $("expRadioAll"),
    top: $("expRadioTop"),
    custom: $("expRadioCustom")
  };
  Object.keys(cards).forEach(k=>{
    if(cards[k]) cards[k].classList.toggle("active", k===scope);
    if(radios[k]) radios[k].checked = (k===scope);
  });
  const customBox = $("expCustomBox");
  if(customBox) customBox.style.display = (scope==="custom" ? "block" : "none");
}

function odswiezLicznikWlasnegoWyboru(){
  const allChks = document.querySelectorAll(".expNoteChk");
  const checked = document.querySelectorAll(".expNoteChk:checked");
  const el = $("expCustomCount");
  if(el) el.textContent = `Zaznaczono: ${checked.length} z ${allChks.length}`;
  const descCustom = $("expDescCustom");
  if(descCustom) descCustom.textContent = `Wybrano ${checked.length} z ${allChks.length}`;
}

function pobierzNotatkiDoEksportu(){
  if(!_expSearchResultsCache || !_expSearchResultsCache.length){
    _expSearchResultsCache = pobierzAktualneWynikiSzukania();
  }
  const isTop = $("expRadioTop") && $("expRadioTop").checked;
  const isCustom = $("expRadioCustom") && $("expRadioCustom").checked;

  if(isTop){
    const limit = parseInt($("expTopCount") ? $("expTopCount").value : "10", 10) || 10;
    return _expSearchResultsCache.slice(0, limit);
  }
  if(isCustom){
    const checkedGuids = new Set([...document.querySelectorAll(".expNoteChk:checked")].map(cb=>cb.dataset.guid));
    const chosen = _expSearchResultsCache.filter(n=>checkedGuids.has(n.g));
    return chosen.length ? chosen : _expSearchResultsCache;
  }
  return _expSearchResultsCache;
}

function otworzEksportWynikow(){
  const results = pobierzAktualneWynikiSzukania();
  if(!results || !results.length){
    toast("Brak wyników do wyeksportowania");
    return;
  }
  _expSearchResultsCache = results;

  const q = ($("search") ? $("search").value : (typeof query!=="undefined"?query:"")).trim();
  const qDisp = $("expQueryDisp");
  if(qDisp) qDisp.textContent = q ? `„${q}”` : (typeof aktywneOpcjeSzukania==="function" && aktywneOpcjeSzukania() ? "Aktywne filtry wyszukiwania" : "Wszystkie notatki");

  const scopeDisp = $("expScopeDisp");
  if(scopeDisp){
    const zakres = (typeof opisFiltrowWynikow==="function") ? opisFiltrowWynikow() : "";
    scopeDisp.textContent = (typeof searchMode!=="undefined" && searchMode==="smart" ? "Tryb inteligentny" : "Tryb dokładny") + (zakres ? " · " + zakres : " · Cała baza");
  }

  const badge = $("expCountBadge");
  if(badge){
    badge.textContent = `${results.length} ${results.length===1 ? "notatka" : (results.length%10>=2 && results.length%10<=4 && (results.length%100<12 || results.length%100>14)) ? "notatki" : "notatek"}`;
  }

  const descAll = $("expDescAll");
  if(descAll) descAll.textContent = `Wszystkie znalezione notatki (${results.length})`;

  ustawZakresEksportu("all");

  const listEl = $("expSearchCustomList");
  if(listEl){
    listEl.innerHTML = results.map(n=>{
      const sd = (typeof query!=="undefined" && query && typeof searchDetails!=="undefined") ? searchDetails.get(n.g) : null;
      let snip = "";
      if(sd && sd.snippets && sd.snippets.length) snip = sd.snippets[0];
      else if(sd && sd.snippet) snip = sd.snippet;
      else snip = (n.c || "").substring(0, 100).replace(/\s+/g, " ");

      const tytul = n.t || refLabel(n) || "Notatka bez tytułu";
      return `<label class="expCustomItem">` +
        `<input type="checkbox" class="expNoteChk" data-guid="${esc(n.g)}" checked>` +
        `<span class="expCustomItemTitle">${esc(tytul)}</span>` +
        `<span class="expCustomItemSnippet">${esc(snip)}</span>` +
      `</label>`;
    }).join("");
    odswiezLicznikWlasnegoWyboru();
  }

  openModal("modalExportSearch");
}

async function exportSearchWord(){
  const list = pobierzNotatkiDoEksportu();
  if(!list.length){
    toast("Wybierz przynajmniej jedną notatkę do eksportu");
    return;
  }
  const q = ($("search") ? $("search").value : (typeof query!=="undefined"?query:"")).trim();
  const safeQ = safeName(q) || "wyniki";
  const html = searchExportHtml(list, true);
  const blob = new Blob(["\ufeff" + html], {type: "application/msword"});
  await saveFile(blob, `Wyniki-${safeQ}-${new Date().toISOString().substring(0,10)}.doc`, "Wyniki wyszukiwania (Word)");
  toast(`Przygotowano dokument Word — ${list.length} notatek`);
  closeModal("modalExportSearch");
}

function exportSearchPdf(){
  const list = pobierzNotatkiDoEksportu();
  if(!list.length){
    toast("Wybierz przynajmniej jedną notatkę do wydruku");
    return;
  }
  const html = searchExportHtml(list, false);
  closeModal("modalExportSearch");

  // Strategia 1: Otwarcie w nowym oknie (najbardziej niezawodne na macOS / Safari / Chrome)
  let printWin = null;
  try{
    printWin = window.open("", "_blank");
  }catch(_){}

  if(printWin && printWin.document){
    try{
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
      toast(`W oknie drukowania wybierz „Zapisz jako PDF” — ${list.length} notatek`);
      setTimeout(()=>{
        try{
          printWin.focus();
          printWin.print();
        }catch(e){
          console.warn("printWin.print error:", e);
        }
      }, 350);
      return;
    }catch(err){
      console.warn("Błąd zapisu do okna drukowania:", err);
    }
  }

  // Strategia 2: Bezpieczny fallback do iframe z bezpośrednim document.write (same-origin, bez srcdoc)
  try{
    let ifr = document.getElementById("searchPdfPrintIfr");
    if(ifr) ifr.remove();
    ifr = document.createElement("iframe");
    ifr.id = "searchPdfPrintIfr";
    ifr.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1024px;height:768px;border:none;opacity:0.01;pointer-events:none;z-index:-1";
    document.body.appendChild(ifr);

    const doc = ifr.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    toast(`W oknie drukowania wybierz „Zapisz jako PDF” — ${list.length} notatek`);
    setTimeout(()=>{
      try{
        ifr.contentWindow.focus();
        ifr.contentWindow.print();
      }catch(e){
        toast("Nie udało się otworzyć okna drukowania. Użyj eksportu Word.");
      }
      setTimeout(()=>ifr && ifr.remove(), 12000);
    }, 400);
  }catch(err){
    toast("Błąd drukowania: " + (err.message || err));
  }
}

function setupExportSearchUI(){
  const btnExpWord = $("btnDoExportWord");
  if(btnExpWord) btnExpWord.onclick = exportSearchWord;

  const btnExpPdf = $("btnDoExportPdf");
  if(btnExpPdf) btnExpPdf.onclick = exportSearchPdf;

  const cardAll = $("expScopeCardAll");
  const cardTop = $("expScopeCardTop");
  const cardCustom = $("expScopeCardCustom");

  if(cardAll) cardAll.onclick = ()=>ustawZakresEksportu("all");
  if(cardTop) cardTop.onclick = ()=>ustawZakresEksportu("top");
  if(cardCustom) cardCustom.onclick = ()=>ustawZakresEksportu("custom");

  const rAll = $("expRadioAll");
  const rTop = $("expRadioTop");
  const rCustom = $("expRadioCustom");

  if(rAll) rAll.onchange = ()=>ustawZakresEksportu("all");
  if(rTop) rTop.onchange = ()=>ustawZakresEksportu("top");
  if(rCustom) rCustom.onchange = ()=>ustawZakresEksportu("custom");

  const topSel = $("expTopCount");
  if(topSel){
    topSel.onclick = e=>e.stopPropagation();
    topSel.onchange = ()=>{
      ustawZakresEksportu("top");
    };
  }

  const btnSelAll = $("expSelAll");
  if(btnSelAll){
    btnSelAll.onclick = ()=>{
      document.querySelectorAll(".expNoteChk").forEach(cb=>cb.checked=true);
      odswiezLicznikWlasnegoWyboru();
    };
  }

  const btnSelNone = $("expSelNone");
  if(btnSelNone){
    btnSelNone.onclick = ()=>{
      document.querySelectorAll(".expNoteChk").forEach(cb=>cb.checked=false);
      odswiezLicznikWlasnegoWyboru();
    };
  }

  const customList = $("expSearchCustomList");
  if(customList){
    customList.onchange = e=>{
      if(e.target && e.target.classList.contains("expNoteChk")){
        odswiezLicznikWlasnegoWyboru();
      }
    };
  }

  const sExp = $("sExportResults");
  if(sExp){
    sExp.onclick = ()=>{
      closeModal("modalSearch");
      otworzEksportWynikow();
    };
  }
}
setupExportSearchUI();
