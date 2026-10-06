/* ==========================================================================
   JW Study — wysokosc.js
   WŁASNA WYSOKOŚĆ KAŻDEJ NOTATKI

   Widok listy pokazywał każdą kartę w całości, widok zwarty przycinał wszystkie
   do trzech linijek. Jedno i drugie dotyczyło CAŁEJ listy naraz, a notatki są
   różne: jedna ma dwa zdania i zajmuje pół ekranu na darmo, druga ma dwie
   strony i chce się ją mieć w całości pod ręką.

   Tutaj każda karta ma swoją wysokość. Ustawiasz ją dwoma sposobami:
     • chwytasz dolną krawędź karty i przeciągasz — tak jak okno,
     • albo wybierasz gotowy rozmiar z menu ⋯ przy notatce.

   Wysokość zapisuje się przy notatce (pole `wys`), więc przeżywa zamknięcie
   aplikacji i jedzie razem z kopią zapasową na inne urządzenie.
   ========================================================================== */
"use strict";

const WYS_MIN = 60;      // niżej karta przestaje cokolwiek pokazywać
const WYS_MAX = 4000;    // wyżej nie ma sensu — to już cała notatka

/** Gotowe rozmiary z menu. 0 = bez ograniczenia (cała treść). */
const WYS_GOTOWE = [
  ["Bardzo mała",  80],
  ["Mała",        140],
  ["Średnia",     260],
  ["Duża",        420],
  ["Cała notatka",  0]
];

/** Nakłada zapisaną wysokość na kartę. Wołane przy budowaniu karty. */
function zastosujWysokosc(karta, n){
  if(!karta) return;
  const tresc = karta.querySelector(".ncontent");
  if(!tresc) return;
  const w = Number(n.wys);
  if(isFinite(w) && w > 0){
    tresc.style.maxHeight = w + "px";
    tresc.style.overflowY = "auto";
    karta.classList.add("wlasnaWys");
  }else if(n.wys === 0){
    /* Zero znaczy „cała treść" — świadomy wybór, nie brak ustawienia.
       Musi przebić także widok zwarty, który przycina wszystko do trzech linijek. */
    tresc.style.maxHeight = "none";
    tresc.style.overflowY = "visible";
    karta.classList.add("wlasnaWys", "pelnaWys");
  }else{
    tresc.style.maxHeight = "";
    tresc.style.overflowY = "";
    karta.classList.remove("wlasnaWys", "pelnaWys");
  }
}

/** Zapisuje wysokość notatki. `null` przywraca ustawienie domyślne widoku. */
function ustawWysokosc(n, px){
  if(!n) return;
  if(px === null || px === undefined) delete n.wys;
  else n.wys = px === 0 ? 0 : Math.round(Math.min(WYS_MAX, Math.max(WYS_MIN, px)));
  /* Zmieniło się miejsce na ekranie, a nie treść — data modyfikacji zostaje.
     Inaczej samo zmniejszenie karty przestawiałoby notatkę w sortowaniu
     „ostatnio zmienione", co byłoby niespodzianką. */
  if(typeof idb!=="undefined" && idb)
    idbBulk("notes", [n]).catch(e=>reportSaveError(e,"wysokość notatki"));
  if(typeof bumpDirty==="function") bumpDirty();
}

/** Menu z gotowymi rozmiarami — dla tych, którzy nie chcą przeciągać. */
function menuWysokosci(n, kotwica){
  const dd = $("dropdown");
  const teraz = (n.wys===0) ? 0 : (isFinite(Number(n.wys)) ? Number(n.wys) : null);
  dd.innerHTML = `<div class="dd-lbl">Wysokość notatki</div>` +
    WYS_GOTOWE.map(([nazwa,px])=>
      `<div data-wys="${px}">${nazwa}${teraz===px?' <span class="ddZnak">✓</span>':""}</div>`).join("") +
    `<div class="dd-sep"></div>` +
    `<div data-wys="auto">Jak w widoku${teraz===null?' <span class="ddZnak">✓</span>':""}</div>`;
  dd.style.display = "block";
  if(typeof oznaczPozycjeMenu==="function") oznaczPozycjeMenu(dd);
  placeDropdown(dd, kotwica);
  dd.onclick = e=>{
    const it = e.target.closest("[data-wys]"); if(!it) return;
    dd.style.display = "none";
    const v = it.dataset.wys;
    ustawWysokosc(n, v==="auto" ? null : Number(v));
    renderNotes();
    toastOk(v==="auto" ? "Wysokość jak w widoku" : "Zmieniono wysokość notatki");
  };
}

/* ===== PRZECIĄGANIE DOLNEJ KRAWĘDZI =====
   Wskaźnik, nie mechanizm przeglądarki — palec, rysik i mysz działają tak samo. */
let _zmianaWys = null;
document.addEventListener("pointerdown", e=>{
  const uchwyt = e.target.closest && e.target.closest("#noteList .ncard .wysUchwyt");
  if(!uchwyt) return;
  const karta = uchwyt.closest(".ncard");
  const n = karta && notes.find(x=>x.g===karta.dataset.g);
  const tresc = karta && karta.querySelector(".ncontent");
  if(!n || !tresc) return;
  e.preventDefault(); e.stopPropagation();
  try{ uchwyt.setPointerCapture(e.pointerId); }catch(_){}
  _zmianaWys = {n, karta, tresc, startY:e.clientY, startH:tresc.getBoundingClientRect().height};
  karta.classList.add("zmienianaWys");

  const ruch = ev=>{
    if(!_zmianaWys) return;
    ev.preventDefault();
    const nowa = Math.min(WYS_MAX, Math.max(WYS_MIN,
                  _zmianaWys.startH + (ev.clientY - _zmianaWys.startY)));
    _zmianaWys.tresc.style.maxHeight = nowa + "px";
    _zmianaWys.tresc.style.overflowY = "auto";
    _zmianaWys.biezaca = nowa;
  };
  const koniec = ()=>{
    uchwyt.removeEventListener("pointermove", ruch);
    uchwyt.removeEventListener("pointerup", koniec);
    uchwyt.removeEventListener("pointercancel", przerwij);
    if(!_zmianaWys) return;
    const {n:nota, karta:k, biezaca} = _zmianaWys;
    k.classList.remove("zmienianaWys");
    _zmianaWys = null;
    if(biezaca!==undefined){
      ustawWysokosc(nota, biezaca);
      k.classList.add("wlasnaWys");
      toastOk("Wysokość: " + Math.round(biezaca) + " px");
    }
  };
  const przerwij = ()=>{
    uchwyt.removeEventListener("pointermove", ruch);
    uchwyt.removeEventListener("pointerup", koniec);
    uchwyt.removeEventListener("pointercancel", przerwij);
    if(_zmianaWys){ _zmianaWys.karta.classList.remove("zmienianaWys"); _zmianaWys = null; }
  };
  uchwyt.addEventListener("pointermove", ruch);
  uchwyt.addEventListener("pointerup", koniec);
  uchwyt.addEventListener("pointercancel", przerwij);
}, true);

/* Dwukrotne dotknięcie uchwytu przywraca ustawienie widoku — szybkie cofnięcie
   nieudanej próby bez wchodzenia w menu. */
document.addEventListener("dblclick", e=>{
  const uchwyt = e.target.closest && e.target.closest("#noteList .ncard .wysUchwyt");
  if(!uchwyt) return;
  const karta = uchwyt.closest(".ncard");
  const n = karta && notes.find(x=>x.g===karta.dataset.g);
  if(!n) return;
  ustawWysokosc(n, null);
  renderNotes();
  toastOk("Przywrócono wysokość z widoku");
});
