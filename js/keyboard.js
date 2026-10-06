/* ==========================================================================
   JW Study — keyboard.js
   Klawiatura ekranowa: robienie jej miejsca i pilnowanie, żeby kursor był widoczny
   --------------------------------------------------------------------------
   Na iPadzie i iPhonie klawiatura wysuwa się NAD stroną — przeglądarka nie zmniejsza
   przez to okna, więc dolna część treści zostaje pod klawiaturą. Przy pisaniu dłuższej
   notatki kolejne wiersze wpadały pod nią i nie było widać, co się pisze.

   Moduł robi dwie rzeczy:
   1. mierzy wysokość klawiatury i zapisuje ją w zmiennej CSS --kb, żeby okna
      i czytnik mogły zostawić na nią miejsce,
   2. po każdym wierszu (i po każdym wciśnięciu Enter) sprawdza, gdzie stoi kursor,
      i przewija treść tak, żeby był widoczny nad klawiaturą.
   ========================================================================== */
"use strict";

/* Odstęp, jaki zostawiamy pod kursorem — tyle, żeby widać było pisany wiersz
   i kawałek następnego. */
const KB_ZAPAS = 96;

/* ——— pomiar klawiatury ——— */
/* visualViewport pokazuje, ile z okna faktycznie widać. Różnica między nim
   a wysokością okna to miejsce zajęte przez klawiaturę. */
function kbWysokosc(){
  const vv = window.visualViewport;
  if(!vv) return 0;
  const zajete = window.innerHeight - vv.height - vv.offsetTop;
  return zajete > 80 ? Math.round(zajete) : 0;    // poniżej 80 px to nie klawiatura, tylko pasek przeglądarki
}
let _kbOstatnia = -1;
function kbOdswiez(){
  const h = kbWysokosc();
  if(h === _kbOstatnia) return;
  _kbOstatnia = h;
  document.documentElement.style.setProperty("--kb", h + "px");
  document.documentElement.classList.toggle("kb-open", h > 0);
  if(h > 0){
    const hb=document.getElementById("hlBar");
    if(hb) hb.style.display="none";
    document.body.classList.remove("ma-zaznaczenie");
  }
  if(h > 0) kbPokazKursor();
}
if(window.visualViewport){
  window.visualViewport.addEventListener("resize", kbOdswiez);
  window.visualViewport.addEventListener("scroll", kbOdswiez);
}
addEventListener("orientationchange", ()=>setTimeout(kbOdswiez, 250));

/* ——— gdzie stoi kursor ——— */
/* Mierzymy prostokąt zaznaczenia bez modyfikowania DOM i bez wywoływania normalize(). */
function kursorProstokat(){
  const sel = getSelection();
  if(!sel || !sel.rangeCount) return null;
  const zakres = sel.getRangeAt(0);
  const rects = zakres.getClientRects();
  if(rects && rects.length > 0) return rects[0];
  let r = zakres.getBoundingClientRect();
  if(r && (r.top || r.bottom || r.height)) return r;
  const node = sel.anchorNode;
  if(node){
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if(el) return el.getBoundingClientRect();
  }
  return null;
}

/* Element, wewnątrz którego faktycznie przewijamy: czytnik, okno albo cała lista. */
function kbPojemnik(el){
  if(!el) return null;
  const spec = el.closest ? el.closest("#modalFs .fsmodal, .fsmodal, .modal, #colReader, #czytnik, #noteList, .nlist") : null;
  if(spec && spec.scrollHeight > spec.clientHeight) return spec;
  let p = el;
  while(p && p !== document.body && p !== document.documentElement){
    const st = getComputedStyle(p);
    if(/(auto|scroll)/.test(st.overflowY) && p.scrollHeight > p.clientHeight + 4) return p;
    p = p.parentElement;
  }
  return null;
}

/** Przewija tak, żeby kursor stanął nad klawiaturą. Nic nie robi, gdy już jest widoczny lub gdy brak klawiatury ekranowej. */
function kbPokazKursor(){
  const h = kbWysokosc();
  if(h <= 0) return;                             // brak klawiatury ekranowej — przeglądarka zarządza kursorem naturalnie
  const akt = document.activeElement;
  if(!akt) return;
  const wPolu = akt.tagName === "TEXTAREA" || akt.tagName === "INPUT";
  const wTresci = akt.isContentEditable;
  if(!wPolu && !wTresci) return;

  const vv = window.visualViewport;
  const dolnaGranica = (vv ? vv.height + vv.offsetTop : innerHeight) - 24;
  const r = wTresci ? kursorProstokat() : akt.getBoundingClientRect();
  if(!r) return;

  const nadmiar = r.bottom - dolnaGranica;
  if(nadmiar <= 0) return;                       // kursor widoczny — nie ruszamy widoku

  const poj = kbPojemnik(akt);
  if(poj) poj.scrollTop += nadmiar + 8;
  else if(!akt.closest("#modalFs, .modal, .fsmodal")){
    scrollBy({top: nadmiar + 8, behavior: "auto"});
  }
}

/* ——— kiedy sprawdzać ——— */
let _kbRaf = 0;
function kbWkrotce(){
  if(_kbRaf || kbWysokosc() <= 0) return;
  _kbRaf = requestAnimationFrame(()=>{ _kbRaf = 0; kbPokazKursor(); });
}
document.addEventListener("keydown", e=>{
  if(e.key === "Enter" && kbWysokosc() > 0) setTimeout(kbPokazKursor, 0);
}, true);
document.addEventListener("input", e=>{
  const t = e.target;
  if(t && (t.isContentEditable || t.tagName === "TEXTAREA") && kbWysokosc() > 0) kbWkrotce();
}, true);
document.addEventListener("focusin", e=>{
  const t = e.target;
  if(t && (t.isContentEditable || t.tagName === "TEXTAREA" || t.tagName === "INPUT") && kbWysokosc() > 0){
    setTimeout(kbPokazKursor, 320);              // po wysunięciu się klawiatury
  }
});
kbOdswiez();
