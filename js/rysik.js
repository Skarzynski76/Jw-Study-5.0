/* ==========================================================================
   JW Study — rysik.js
   ZAZNACZANIE RYSIKIEM OD PIERWSZEGO RUCHU

   Zgłoszenie: „rysik nie od razu reaguje, gdy podczas czytania chcę coś
   zaznaczyć". Sprawdziłem — to nie jest opóźnienie w kodzie aplikacji.
   Na iPadzie rysik domyślnie PRZEWIJA tak samo jak palec; żeby zaznaczyć,
   trzeba najpierw przytrzymać albo dwukrotnie stuknąć w słowo. Stąd wrażenie,
   że urządzenie nie reaguje.

   Przy czytaniu notatki przewijanie rysikiem jest mało przydatne — od tego
   jest palec, który zawsze ma go pod ręką. Zaznaczanie odwrotnie: rysik jest
   do tego najlepszym narzędziem, bo trafia dokładnie między litery.

   Dlatego w treści notatki (i tylko tam) ruch rysikiem od razu zaznacza tekst.
   Palec działa jak dotąd: przewija.

   Rozpoznanie po `touchType === "stylus"` — Safari podaje to wprost dla Apple
   Pencil. Gdy tej informacji nie ma, sięgamy po `pointerType === "pen"`.
   ========================================================================== */
"use strict";

const RYS_PROG = 5;        // px — poniżej tego to zwykłe stuknięcie, nie zaznaczanie
let _rysik = null;

/** Treść notatki, w której wolno zaznaczać rysikiem (nie w trybie edycji). */
function trescDoZaznaczania(cel){
  if(!cel || !cel.closest) return null;
  const t = cel.closest(".ncontent");
  if(!t) return null;
  /* W trybie edycji rządzi Scribble — pisanie rysikiem po tekście. Wchodzenie
     mu w drogę odebrałoby funkcję, której nie da się zastąpić.
     Sprawdzamy i wyliczoną własność, i sam atrybut: pierwsza bywa niedostępna
     poza przeglądarką, a drugi jest tym, co faktycznie ustawia edytor. */
  if(t.isContentEditable) return null;
  if(t.closest('[contenteditable="true"]')) return null;
  return t;
}
/** Czy to dotknięcie pochodzi z rysika. */
function toRysik(dotyk, zdarzenie){
  if(dotyk && dotyk.touchType) return dotyk.touchType === "stylus";
  if(zdarzenie && zdarzenie.pointerType) return zdarzenie.pointerType === "pen";
  return false;
}
/** Ustawia zaznaczenie od punktu początkowego do wskazanego. */
function zaznaczDo(x, y){
  if(!_rysik || !_rysik.start) return;
  const koniec = caretRangeFromPoint(x, y);
  if(!koniec) return;
  /* Nie wychodzimy poza tę jedną notatkę — inaczej ruch w bok zaznaczyłby
     pół listy. */
  if(!_rysik.tresc.contains(koniec.startContainer)) return;
  const sel = getSelection();
  if(!sel) return;
  try{
    sel.setBaseAndExtent(_rysik.start.startContainer, _rysik.start.startOffset,
                         koniec.startContainer, koniec.startOffset);
  }catch(e){}
}

document.addEventListener("touchstart", e=>{
  if(!e.touches || e.touches.length !== 1) return;
  const d = e.touches[0];
  if(!toRysik(d, e)) return;
  const tresc = trescDoZaznaczania(e.target);
  if(!tresc) return;
  _rysik = {tresc, x:d.clientX, y:d.clientY, start:null, aktywne:false};
}, {passive:false});

document.addEventListener("touchmove", e=>{
  if(!_rysik || !e.touches || e.touches.length !== 1) return;
  const d = e.touches[0];
  if(!_rysik.aktywne){
    if(Math.abs(d.clientX - _rysik.x) < RYS_PROG &&
       Math.abs(d.clientY - _rysik.y) < RYS_PROG) return;
    const start = caretRangeFromPoint(_rysik.x, _rysik.y);
    if(!start || !_rysik.tresc.contains(start.startContainer)){ _rysik = null; return; }
    _rysik.start = start;
    _rysik.aktywne = true;
    document.documentElement.classList.add("rysikZaznacza");
  }
  /* Dopiero teraz odbieramy przewijanie — i tylko rysikowi. Zrobienie tego
     wcześniej blokowałoby też zwykłe stuknięcie. */
  e.preventDefault();
  zaznaczDo(d.clientX, d.clientY);
}, {passive:false});

function koniecRysika(){
  if(!_rysik) return;
  const bylo = _rysik.aktywne;
  _rysik = null;
  document.documentElement.classList.remove("rysikZaznacza");
  /* Jak w JW Library: zostają uchwyty zaznaczenia, a obok od razu pojawia
     się pełna paleta. Kolor nakłada się dopiero po świadomym wyborze. */
  if(bylo && typeof showHlBar === "function") setTimeout(showHlBar, 10);
}
document.addEventListener("touchend", koniecRysika);
document.addEventListener("touchcancel", koniecRysika);
