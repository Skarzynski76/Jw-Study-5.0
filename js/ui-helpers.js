/* ==========================================================================
   JW Study — ui-helpers.js
   Funkcje pomocnicze interfejsu i szerokość kolumn
   ========================================================================== */
"use strict";
/* ================= POMOCNICZE ================= */
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
/* Komunikat na dole ekranu. Typ „ok" dostaje ptaszka z krótką animacją powodzenia,
   typ „err" — znak ostrzeżenia i dłuższy czas wyświetlania, bo błąd trzeba zdążyć przeczytać. */
function toast(msg, typ){
  const t=$("toast");
  t.className = "show" + (typ ? " t-"+typ : "");
  const ikona = typ==="ok" ? '<span class="t-ic ok"></span>' : typ==="err" ? '<span class="t-ic err"></span>' : "";
  t.innerHTML = ikona + '<span class="t-txt"></span>';
  t.querySelector(".t-txt").textContent = msg;
  clearTimeout(t._h);
  t._h = setTimeout(()=>t.classList.remove("show"), typ==="err" ? 5200 : 2600);
}
function toastOk(msg){ toast(msg, "ok"); }
function toastErr(msg){ toast(msg, "err"); }
/* krótkie mrugnięcie karty po zapisie — potwierdzenie, że zmiana faktycznie weszła */
function flashOk(el){
  if(!el || document.documentElement.dataset.anim==="off") return;
  el.classList.remove("flash-ok");
  void el.offsetWidth;                 // wymuszenie restartu animacji
  el.classList.add("flash-ok");
  setTimeout(()=>el.classList.remove("flash-ok"), 700);
}
/* =====================================================================
   OKNA DIALOGOWE A DOSTĘPNOŚĆ

   Okno bez roli „dialog" jest dla czytnika ekranu zwykłym kawałkiem strony:
   nie zapowiada się, nie odcina tła, a kursor czytnika wędruje po treści,
   która jest właśnie zasłonięta. Klawiszem Tab dawało się wyjść poza okno
   i klikać w niewidoczne przyciski pod spodem.

   Poniższe funkcje nadają rolę, przenoszą ognisko do okna, zatrzymują
   klawisz Tab w jego obrębie i oddają ognisko tam, skąd okno otwarto.
   ===================================================================== */
let _skadOkno = null;

function openModal(id){
  const okno = $(id); if(!okno) return;
  przygotujOknoDlaCzytnika(okno);
  _skadOkno = document.activeElement;
  okno.classList.add("show");
  okno.setAttribute("aria-hidden","false");
  const cel = okno.querySelector("input:not([type=hidden]), textarea, select, button, [tabindex]");
  if(cel){ try{ cel.focus(); }catch(e){} }
}
function closeModal(id){
  const okno = $(id); if(!okno) return;
  okno.classList.remove("show");
  okno.setAttribute("aria-hidden","true");
  // ognisko wraca tam, skąd okno otwarto — inaczej ląduje na początku strony
  if(_skadOkno && document.contains(_skadOkno)){ try{ _skadOkno.focus(); }catch(e){} }
  _skadOkno = null;
}
/** Rola, powiązanie z nagłówkiem i odcięcie tła — nadawane raz, przy pierwszym otwarciu. */
function przygotujOknoDlaCzytnika(okno){
  const pudlo = okno.querySelector(".modal") || okno;
  if(pudlo.getAttribute("role")==="dialog") return;
  pudlo.setAttribute("role","dialog");
  pudlo.setAttribute("aria-modal","true");
  const naglowek = pudlo.querySelector("h2, h3");
  if(naglowek){
    if(!naglowek.id) naglowek.id = okno.id + "-tytul";
    pudlo.setAttribute("aria-labelledby", naglowek.id);
  }
}
/* Tab nie może wyprowadzić poza otwarte okno. */
document.addEventListener("keydown", e=>{
  if(e.key!=="Tab") return;
  const okno = document.querySelector(".overlay.show");
  if(!okno) return;
  const pudlo = okno.querySelector(".modal") || okno;
  const doOgniska = [...pudlo.querySelectorAll('a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(el=>el.offsetParent!==null || el.getClientRects().length || true);
  if(!doOgniska.length) return;
  const pierwszy = doOgniska[0], ostatni = doOgniska[doOgniska.length-1];
  if(e.shiftKey && document.activeElement===pierwszy){ e.preventDefault(); ostatni.focus(); }
  else if(!e.shiftKey && document.activeElement===ostatni){ e.preventDefault(); pierwszy.focus(); }
});
/**
 * Przyciski z samą ikoną mają podpowiedź w atrybucie title, ale czytniki ekranu
 * traktują ją niepewnie — część pomija ją zupełnie. Kopiujemy ją do aria-label,
 * które jest do tego przeznaczone. Robimy to dla przycisków istniejących
 * i dla dokładanych później (menu, paski narzędzi, karty notatek).
 */
function nazwijPrzyciskiIkonowe(korzen){
  /* Odsiew robi przeglądarka, nie my — i robi go RAZ na element.
     Wcześniej selektor zwracał wszystkie przyciski z podpowiedzią, a pętla przy
     każdym z nich sięgała po textContent, żeby sprawdzić, czy ma widoczny napis.
     Przyciski Z napisem nigdy nie dostają aria-label, więc wracały do tej pętli
     przy KAŻDYM przerysowaniu — sześćset elementów, sześćset odczytów tekstu,
     po kilkanaście razy na minutę. To był najdroższy krok odświeżania.

     Teraz element rozpatrzony dostaje znacznik i wypada z selektora na dobre:
     albo ma aria-label, albo ma data-opisany. Zbiór drenuje się do pustego. */
  const sel = "button[title], label[title], [role=button][title]";
  const nieopisane = ":not([aria-label]):not([data-opisany])";
  (korzen||document).querySelectorAll(
      sel.split(", ").map(x=>x+nieopisane).join(", ")
    ).forEach(b=>{
    if(b.textContent.trim()){ b.setAttribute("data-opisany","txt"); return; }  // ma widoczny napis
    b.setAttribute("aria-label", b.getAttribute("title"));
  });
}
let _nazwijTimer = null;
function zaplanujNazwaniePrzyciskow(){
  if(_nazwijTimer) return;
  _nazwijTimer = setTimeout(()=>{
    _nazwijTimer = null;
    nazwijPrzyciskiIkonowe();
  }, 100);
}
if(typeof MutationObserver!=="undefined"){
  new MutationObserver(zmiany=>{
    let wykryto = false;
    for(let i=0; i<zmiany.length; i++){
      const z = zmiany[i];
      for(let j=0; j<z.addedNodes.length; j++){
        const n = z.addedNodes[j];
        if(n.nodeType===1){
          if(n.matches && (n.matches("button[title], label[title], [role=button][title]") || n.querySelector("button[title], label[title], [role=button][title]"))){
            wykryto = true; break;
          }
        }
      }
      if(wykryto) break;
    }
    if(wykryto) zaplanujNazwaniePrzyciskow();
  }).observe(document.documentElement, {childList:true, subtree:true});
}
nazwijPrzyciskiIkonowe();
/**
 * Rozwijane menu buduje kilka miejsc w kodzie i każde robi to własnym HTML-em.
 * Zamiast dopisywać role w każdym z nich, nadajemy je tutaj — po każdej zmianie
 * zawartości. Rola „menu" bez pozycji „menuitem" jest dla czytnika ekranu gorsza
 * niż jej brak: zapowiada listę, po której nie da się przejść.
 */
function oznaczPozycjeMenu(menu){
  if(!menu) return;
  [...menu.children].forEach(el=>{
    if(el.classList.contains("dd-sep")){ el.setAttribute("role","separator"); return; }
    if(el.classList.contains("dd-lbl") || el.classList.contains("cm-title")){
      el.setAttribute("role","presentation"); return;
    }
    if(el.tagName==="DIV" || el.tagName==="BUTTON"){
      if(!el.getAttribute("role")) el.setAttribute("role","menuitem");
      if(!el.hasAttribute("tabindex")) el.setAttribute("tabindex","-1");
    }
  });
}
if(typeof MutationObserver!=="undefined"){
  ["dropdown","ebPop"].forEach(id=>{
    const m=document.getElementById(id);
    if(!m) return;
    new MutationObserver(()=>oznaczPozycjeMenu(m)).observe(m, {childList:true});
  });
}

/* Role okien nadajemy od razu, nie dopiero przy pierwszym otwarciu — czytnik ekranu
   ma wtedy poprawny obraz strony niezależnie od tego, czego użytkownik dotknął. */
document.querySelectorAll(".overlay").forEach(o=>{
  przygotujOknoDlaCzytnika(o);
  if(!o.classList.contains("show")) o.setAttribute("aria-hidden","true");
});
/* Przyciski zamykające okna działają przez wspólny nasłuch, a nie przez atrybut
   onclick w kodzie strony. Atrybuty z kodem są pierwszym, co blokuje polityka
   bezpieczeństwa treści (CSP) — bez nich da się ją zacieśnić. */
document.addEventListener("click", e=>{
  const b = e.target && e.target.closest ? e.target.closest("[data-zamknij]") : null;
  if(b) closeModal(b.dataset.zamknij);
});
function download(blob,name){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
}
function mobileShow(id){
  if (id === "menu") {
    if (typeof toggleMobileSidebar === "function") {
      toggleMobileSidebar(true);
    }
    return;
  }
  if (id === "centrum") {
    if (typeof centrumWidoczne === "function" && centrumWidoczne()) {
      if (typeof centrumSchowaj === "function") centrumSchowaj();
    } else {
      if (typeof centrumPokaz === "function") centrumPokaz();
    }
    return;
  }

  const cols = ["colBooks", "colTags", "colPubs", "colNotes"];
  cols.forEach(c => {
    const el = $(c);
    if(el) el.classList.toggle("mshow", c === id);
  });

  document.querySelectorAll("#mobileTabs button").forEach(b=>{
    if (b.dataset.p !== "menu" && b.dataset.p !== "centrum") {
      b.classList.toggle("on", b.dataset.p === id);
    }
  });
}
document.querySelectorAll("#mobileTabs button").forEach(b => {
  b.onclick = () => {
    const p = b.dataset.p;
    if (p !== "centrum" && p !== "menu") {
      if (document.body.classList.contains("centrum-open") && typeof centrumSchowaj === "function") {
        centrumSchowaj();
      }
    }
    mobileShow(p);
  };
});

/* ===== KOLUMNY BOCZNE (Biblia / Etykiety / Publikacje) ===== */
const KOLUMNY_BOCZNE = [
  ["colBooks", "Biblia"],
  ["colTags",  "Etykiety"],
  ["colPubs",  "Publikacje"]
];

function opiszStrzalkeKolumny(id){
  const col = $(id); if(!col) return;
  const b = col.querySelector(".colToggle"); if(!b) return;
  const item = KOLUMNY_BOCZNE.find(k=>k[0]===id);
  const nazwa = item ? item[1] : id;
  const zwinieta = col.classList.contains("collapsed");
  const opis = (zwinieta ? "Pokaż kolumnę " : "Zwiń kolumnę ") + nazwa;
  b.title = opis;
  b.setAttribute("aria-label", opis);
  b.setAttribute("aria-expanded", zwinieta ? "false" : "true");
}

function setCollapsed(id, on){
  const col = $(id); if(!col) return;
  col.classList.toggle("collapsed", on);
  opiszStrzalkeKolumny(id);
  try{
    lsSet(KP+"Cols", JSON.stringify({
      t: $("colTags") ? $("colTags").classList.contains("collapsed") : false,
      b: $("colBooks") ? $("colBooks").classList.contains("collapsed") : false,
      p: $("colPubs") ? $("colPubs").classList.contains("collapsed") : false
    }));
  }catch(e){}
  odswiezMenuKolumn();
  odswiezUkryteKolumny();
  if(typeof updateSidebarActiveStates === "function") updateSidebarActiveStates();
  
  if(!on){
    if(id === "colPubs" && typeof renderPubPanel === "function") renderPubPanel();
    if(id === "colBooks" && typeof renderBooks === "function") renderBooks();
    if(id === "colTags" && typeof renderTags === "function") renderTags();
  }
}

function odswiezUkryteKolumny(){
  const pas = $("ukryteKolumny"); if(!pas) return;
  const ukryte = KOLUMNY_BOCZNE.filter(([id])=>{
    const c = $(id); return c && c.classList.contains("collapsed");
  });
  if(!ukryte.length){ pas.hidden = true; setHtml(pas, ""); return; }
  pas.hidden = false;
  setHtml(pas,
    '<span class="ukLbl">Ukryte:</span>' +
    ukryte.map(([id,nm])=>
      `<button class="ukChip" data-pokaz="${id}" title="Pokaż kolumnę ${esc(nm)}">`+
      `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" `+
      `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`+
      `<path d="M9 6l6 6-6 6"/></svg>${esc(nm)}</button>`).join("") +
    (ukryte.length>1 ? '<button class="ukChip ukAll" data-pokaz="*">Pokaż wszystkie</button>' : ""));
}

document.addEventListener("click", e=>{
  const b = e.target.closest && e.target.closest("#ukryteKolumny [data-pokaz]");
  if(!b) return;
  e.preventDefault(); e.stopPropagation();
  if(b.dataset.pokaz==="*") KOLUMNY_BOCZNE.forEach(([id])=>setCollapsed(id, false));
  else setCollapsed(b.dataset.pokaz, false);
});

function odswiezMenuKolumn(){
  const dd = document.getElementById("dropdown");
  if(!dd || dd.style.display !== "block" || dd.dataset.rodzaj !== "kolumny") return;
  dd.querySelectorAll("[data-kol]").forEach(w=>{
    const widoczna = !$(w.dataset.kol).classList.contains("collapsed");
    w.classList.toggle("on", widoczna);
    const znak = w.querySelector(".kolZnak");
    if(znak) znak.style.visibility = widoczna ? "visible" : "hidden";
  });
}

function otworzMenuKolumn(anchor){
  const dd = $("dropdown");
  dd.dataset.rodzaj = "kolumny";
  dd.innerHTML = `<div class="dd-lbl">Widoczne kolumny</div>` +
    KOLUMNY_BOCZNE.map(([id,nm],i)=>{
      const colEl = $(id);
      const widoczna = colEl && !colEl.classList.contains("collapsed");
      return `<div data-kol="${id}"${widoczna?' class="on"':''}>`+
             `<span class="kolZnak" style="visibility:${widoczna?"visible":"hidden"}">✓</span>`+
             `${esc(nm)}<kbd class="ddKbd">${i+1}</kbd></div>`;
    }).join("") +
    `<div class="dd-sep"></div><div data-kol-all="1">Pokaż wszystkie kolumny</div>` +
    `<div data-kol-none="1">Zwiń kolumny boczne</div>`;
  dd.style.display = "block";
  oznaczPozycjeMenu(dd);
  placeDropdown(dd, anchor);
  dd.onclick = e=>{
    if(e.target.closest("[data-kol-all]")){
      KOLUMNY_BOCZNE.forEach(([id])=>setCollapsed(id, false));
      dd.style.display = "none";
      return;
    }
    if(e.target.closest("[data-kol-none]")){
      KOLUMNY_BOCZNE.forEach(([id])=>setCollapsed(id, true));
      dd.style.display = "none";
      return;
    }
    const w = e.target.closest("[data-kol]");
    if(!w) return;
    const colId = w.dataset.kol;
    const isColCollapsed = $(colId) && $(colId).classList.contains("collapsed");
    setCollapsed(colId, !isColCollapsed);
  };
}

document.querySelectorAll(".colToggle").forEach(btn=>{
  btn.addEventListener("click", e=>{
    e.stopPropagation();
    const id = btn.dataset.c;
    const col = $(id);
    if(col) setCollapsed(id, !col.classList.contains("collapsed"));
  });
});

try{
  const cs = JSON.parse(localStorage.getItem(KP+"Cols")||"{}");
  if(cs.t && $("colTags")) $("colTags").classList.add("collapsed");
  if(cs.b && $("colBooks")) $("colBooks").classList.add("collapsed");
  if(cs.p && $("colPubs")) $("colPubs").classList.add("collapsed");
}catch(e){}

odswiezUkryteKolumny();
KOLUMNY_BOCZNE.forEach(([id])=>opiszStrzalkeKolumny(id));

/* ===== GĘSTOŚĆ I REGULACJA SZEROKOŚCI KOLUMN ===== */
const KOL_PROG_SREDNIA = 215;
const KOL_PROG_WASKA   = 175;

function kolumnyDopasujGestosc(){
  KOLUMNY_BOCZNE.forEach(([id])=>{
    const kol = $(id); if(!kol) return;
    if(kol.classList.contains("collapsed")){ kol.removeAttribute("data-gestosc"); return; }
    const w = kol.getBoundingClientRect().width;
    if(!w) return;
    const g = w >= KOL_PROG_SREDNIA ? "szeroka" : (w >= KOL_PROG_WASKA ? "srednia" : "waska");
    if(kol.dataset.gestosc !== g) kol.dataset.gestosc = g;
  });
}

if(typeof ResizeObserver !== "undefined"){
  const obs = new ResizeObserver(()=>kolumnyDopasujGestosc());
  KOLUMNY_BOCZNE.forEach(([id])=>{ const k = $(id); if(k) obs.observe(k); });
}else{
  addEventListener("resize", kolumnyDopasujGestosc);
}

function applyColWidths(){
  try{
    const w = JSON.parse(localStorage.getItem(KP+"Widths")||"{}");
    const min = 150, max = Math.min(560, Math.max(160, innerWidth - 340));
    ["colBooks","colTags","colPubs"].forEach(id=>{
      const c = $(id); if(!c) return;
      c.style.minWidth = "0";
      if(w[id]) c.style.width = Math.max(min, Math.min(max, w[id])) + "px";
    });
    kolumnyDopasujGestosc();
  }catch(e){}
}

function saveColWidths(){
  const szer = {};
  ["colBooks","colTags","colPubs"].forEach(id=>{
    const c = $(id); if(!c) return;
    szer[id] = parseInt(c.style.width) || c.offsetWidth;
  });
  lsSet(KP+"Widths", JSON.stringify(szer));
}

applyColWidths();

/* przycisk „Kolumny" w pasku górnym */
if($("btnCols")) $("btnCols").onclick = e=>{
  e.stopPropagation();
  const dd=$("dropdown");
  if(dd.style.display==="block" && dd.dataset.rodzaj==="kolumny"){ dd.style.display="none"; return; }
  dd.dataset.rodzaj="kolumny";
  otworzMenuKolumn($("btnCols"));
};

/* Przeciąganie uchwytu (resizer) */
document.querySelectorAll(".colResizer").forEach(rz=>{
  rz.addEventListener("pointerdown", e=>{
    if(innerWidth<=900) return;
    const col = $(rz.dataset.c);
    if(!col || col.classList.contains("collapsed")) return;
    e.preventDefault();
    rz.classList.add("dragging");
    document.body.style.userSelect="none"; document.body.style.cursor="col-resize";
    try{ rz.setPointerCapture(e.pointerId); }catch(_){}
    const startX = e.clientX, startW = col.offsetWidth;
    const min = 150, max = Math.min(560, innerWidth - 340);
    const move = ev=>{
      let w = startW + (ev.clientX - startX);
      w = Math.max(min, Math.min(max, w));
      col.style.minWidth="0"; col.style.width = w + "px";
    };
    const up = ()=>{
      rz.classList.remove("dragging");
      document.body.style.userSelect=""; document.body.style.cursor="";
      rz.removeEventListener("pointermove", move);
      rz.removeEventListener("pointerup", up);
      rz.removeEventListener("pointercancel", up);
      saveColWidths();
    };
    rz.addEventListener("pointermove", move);
    rz.addEventListener("pointerup", up);
    rz.addEventListener("pointercancel", up);
  });
  rz.addEventListener("dblclick", ()=>{
    const col = $(rz.dataset.c);
    if(col){
      col.style.width=""; col.style.minWidth="";
      saveColWidths();
    }
  });
});

let searchTimer=null;
const SEARCH_MIN=3, SEARCH_DELAY=320;
function zapytanieGotowe(raw){
  const s=(raw||"").trim();
  if(!s) return false;
  /* Sam znak @, # albo jedna litera nie może uruchamiać przebiegu po bazie. */
  if(/^[@#-]/.test(s)) return norm(s).replace(/[^a-z0-9]/g,"").length>=2;
  if(/^[1-3]?[\p{L}]{1,6}\s*\d/u.test(s)) return true;
  return norm(s).replace(/[^a-z0-9]/g,"").length>=SEARCH_MIN;
}
function komunikatKrotkiegoSzukania(raw){
  const box=$("searchStatus"); if(!box)return;
  const s=(raw||"").trim();
  if(!s){box.hidden=true;box.innerHTML="";return;}
  box.hidden=false;
  box.innerHTML='<span class="ssInfo">Wpisz co najmniej 3 znaki — pojedyncza litera nie przeszukuje całej bazy.</span>';
}
function uruchomWyszukiwanie(raw){
  const poprzednie=query;
  const bylo=!!query;
  parseQuery(raw);
  /* Każde nowe zapytanie zaczyna od zwartej, ale użytecznej porcji. Poprzednio
     visibleCount mógł zostać na kilkuset po długim przewijaniu i pierwsza
     litera następnego wyszukiwania od razu budowała setki kart. */
  if(query!==poprzednie) visibleCount=query?50:36;
  if(query && !bylo){ window._sortPrzedSzukaniem=sortMode; sortMode="relevance"; $("sortSel").value="relevance"; }
  else if(!query && bylo && sortMode==="relevance"){
    sortMode=window._sortPrzedSzukaniem||"new"; $("sortSel").value=sortMode;
  }
  if(typeof centrumOdswiez === "function") centrumOdswiez();
  if(!(typeof uruchomWorkerSzukania==="function" && uruchomWorkerSzukania())) renderNotes();
  showSearchSug(raw);
}
/* PISANIE W WYSZUKIWARCE ODŚWIEŻA TYLKO KOLUMNĘ NOTATEK.
   Było tu renderAll, czyli przerysowanie wszystkich trzech kolumn po każdej
   przerwie w pisaniu. Kolumny etykiet i publikacji nie zależą jednak od tego,
   co wpisano — ich liczniki są liczone z całości, nie z wyników — więc dwie
   trzecie tej pracy szło w próżnię przy każdej literze. */
/* ...ale JEDNA rzecz spoza kolumny notatek musi się przełączyć: CENTRUM ALBO
   LISTA. Centrum pokazuje się wtedy, gdy nic nie jest wybrane — a wpisane słowo
   jest właśnie takim wyborem. Ten przełącznik siedzi w `renderAll`, więc na
   szybkiej ścieżce trzeba go zawołać osobno. Bez tego pisanie przy otwartym
   Centrum nie robiło NIC WIDOCZNEGO: lista pod spodem miała już wyniki, tylko
   że zasłonięte. Gdy Centrum jest schowane — czyli praktycznie zawsze
   w trakcie szukania — to dwa przypisania i koniec. */
$("search").addEventListener("input",e=>{
  clearTimeout(searchTimer);
  const raw=e.target.value;
  if(!zapytanieGotowe(raw)){
    const bylo=!!query;
    if(bylo){ parseQuery(""); if(sortMode==="relevance"){sortMode=window._sortPrzedSzukaniem||"new";$("sortSel").value=sortMode;} renderNotes(); }
    if(typeof centrumOdswiez === "function") centrumOdswiez();
    komunikatKrotkiegoSzukania(raw);
    if((raw||"").trim().length<2) showSearchSug(raw); else hideSearchSug();
    return;
  }
  const box=$("searchStatus"); if(box){box.hidden=false;box.innerHTML='<span class="ssInfo">Szukam po zakończeniu pisania…</span>';}
  searchTimer=setTimeout(()=>uruchomWyszukiwanie(raw),SEARCH_DELAY);
});
$("search").addEventListener("keydown",e=>{
  if(e.key!=="Enter" || !zapytanieGotowe(e.target.value)) return;
  const podpowiedzi=$("searchSug");
  if(podpowiedzi && podpowiedzi.style.display==="block" && typeof sugIdx!=="undefined" && sugIdx>=0) return;
  clearTimeout(searchTimer); uruchomWyszukiwanie(e.target.value);
});
