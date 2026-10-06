/* ==========================================================================
   JW Study — tablica.js
   NOTATKI JAK KARTECZKI NA TABLICY + WŁASNE TŁO KAŻDEJ NOTATKI

   Lista układa notatki jedna pod drugą, więc nawet po odchudzeniu pasków widać
   ich kilka. Tablica układa je obok siebie, w siatkę — na jednym ekranie mieści
   się kilkanaście, a przewijanie ciągnie się dalej tak samo.

   Każda karteczka może też mieć własne tło. Kolor dobierany dowolnie, a napis
   sam dobiera odcień do jasności tła, żeby zawsze dało się go przeczytać —
   inaczej ciemnogranatowa karteczka z czarnym tekstem byłaby ozdobą bez treści.
   ========================================================================== */
"use strict";

/* Ile kolumn na tablicy. „auto" dopasowuje do szerokości ekranu. */
const TABLICA_KOL = ["auto", 2, 3, 4, 5];
let tablicaKol = lsGet(KP+"Kolumny", "auto");
if(!TABLICA_KOL.includes(tablicaKol) && !TABLICA_KOL.includes(Number(tablicaKol)))
  tablicaKol = "auto";

/* Wielkość samej karteczki — osobno od tego, ile ich stoi w rzędzie.
   Liczba w rzędzie decyduje o SZEROKOŚCI, ta lista o WYSOKOŚCI i o tym, jak
   szeroka musi być karteczka przy dopasowaniu automatycznym. Razem dają
   sensowne pary: mała karteczka to kilka linijek, bardzo duża to prawie cała
   notatka na wierzchu. */
const TABLICA_ROZMIARY = {
  xs: {nazwa:"Bardzo małe", wys:130, min:150},
  s:  {nazwa:"Małe",        wys:180, min:170},
  m:  {nazwa:"Średnie",     wys:240, min:190},
  l:  {nazwa:"Duże",        wys:330, min:230},
  xl: {nazwa:"Bardzo duże", wys:440, min:280}
};
let tablicaRozmiar = lsGet(KP+"Rozmiar", "m");
if(!TABLICA_ROZMIARY[tablicaRozmiar]) tablicaRozmiar = "m";

function zastosujKolumnyTablicy(){
  const el = $("noteList"); if(!el) return;
  const n = Number(tablicaKol);
  /* Zero oznacza „dopasuj sam" — wtedy siatka sama liczy, ile kart się zmieści. */
  el.style.setProperty("--kolTablicy", isFinite(n) && n ? String(n) : "0");
  const r = TABLICA_ROZMIARY[tablicaRozmiar] || TABLICA_ROZMIARY.m;
  el.style.setProperty("--kartaWys", r.wys + "px");
  el.style.setProperty("--kartaMin", r.min + "px");
}
function ustawRozmiarTablicy(v){
  if(!TABLICA_ROZMIARY[v]) return;
  tablicaRozmiar = v;
  lsSet(KP+"Rozmiar", v);
  if($("rozmiarTablicy")){
  $("rozmiarTablicy").addEventListener("change", e=>{
    ustawRozmiarTablicy(e.target.value);
    const r = TABLICA_ROZMIARY[e.target.value];
    toastOk("Karteczki: " + (r ? r.nazwa.toLowerCase() : e.target.value));
  });
}
zastosujKolumnyTablicy();
}
function ustawKolumnyTablicy(v){
  tablicaKol = v;
  lsSet(KP+"Kolumny", String(v));
  if($("rozmiarTablicy")){
  $("rozmiarTablicy").addEventListener("change", e=>{
    ustawRozmiarTablicy(e.target.value);
    const r = TABLICA_ROZMIARY[e.target.value];
    toastOk("Karteczki: " + (r ? r.nazwa.toLowerCase() : e.target.value));
  });
}
zastosujKolumnyTablicy();
}

/* ===== WŁASNE TŁO NOTATKI =====
   Barwy karteczek — jasne, żeby tekst zostawał czytelny, ale wyraźnie różne
   od siebie, bo o to w tym chodzi: rozpoznać notatkę kątem oka. */
const TLA_KARTECZEK = [
  ["Żółta",       "#fdf3bf"],
  ["Brzoskwinia", "#ffe0c7"],
  ["Różowa",      "#ffd9e0"],
  ["Liliowa",     "#e6dcff"],
  ["Błękitna",    "#d3ecff"],
  ["Miętowa",     "#d2f2e3"],
  ["Limonkowa",   "#e6f5c4"],
  ["Piaskowa",    "#ece3d4"],
  ["Szara",       "#e6e8ea"]
];

/** Nakłada tło notatki na kartę. Wołane przy budowaniu karty. */
function zastosujTloNotatki(karta, n){
  if(!karta) return;
  const kol = (typeof kolorBezpieczny==="function" && kolorBezpieczny(n.bg)) ? n.bg : "";
  if(!kol){
    karta.style.removeProperty("--tloKarty");
    karta.style.removeProperty("--tekstKarty");
    karta.classList.remove("wlasneTlo");
    return;
  }
  karta.style.setProperty("--tloKarty", kol);
  /* Kolor napisu liczony z jasności tła — ten sam sposób co przy sekcjach. */
  if(typeof czytelnyTekst==="function")
    karta.style.setProperty("--tekstKarty", czytelnyTekst(kol));
  karta.classList.add("wlasneTlo");
}

/** Zapisuje tło notatki. `null` zdejmuje kolor. */
function ustawTloNotatki(n, kol){
  if(!n) return;
  if(!kol) delete n.bg;
  else if(typeof kolorBezpieczny==="function" && kolorBezpieczny(kol)) n.bg = kol;
  else { toast("Nie rozpoznano koloru"); return; }
  /* Kolor to wygląd, nie treść — data modyfikacji zostaje nietknięta, żeby
     pomalowanie karteczki nie przestawiało notatki w sortowaniu wg zmiany. */
  if(typeof idb!=="undefined" && idb)
    idbBulk("notes", [n]).catch(e=>reportSaveError(e,"kolor notatki"));
  if(typeof bumpDirty==="function") bumpDirty();
}

/** Odświeża kolor każdej widocznej kopii karty — listy i czytnika. */
function pokazTloNotatkiNaEkranie(n){
  document.querySelectorAll(".ncard").forEach(karta=>{
    if(karta.dataset.g===n.g) zastosujTloNotatki(karta, n);
  });
}

/* ——— PASEK KOLORÓW NA GÓRZE MENU NOTATKI (v2.69) ———
 *
 * Kolor tła leżał trzy poziomy w głąb: ⋯ → „Wygląd" → „Tło notatki…" → próbka.
 * Cztery dotknięcia na rzecz, którą robi się wzrokiem, przeglądając listę —
 * i, co gorsza, niewidoczną: nie dało się jej znaleźć inaczej niż przez
 * przypadek, bo nic w menu głównym nie mówiło, że kolory w ogóle są.
 *
 * Próbki idą więc na samą górę menu, jako pierwszy wiersz. Dwa dotknięcia
 * zamiast czterech, a paleta widoczna od razu po otwarciu menu.
 *
 * Pełne menu tła zostaje — kryje się pod ostatnim kwadracikiem z paletką.
 * Trzyma rzeczy rzadsze i takie, których nie da się pokazać jako próbki:
 * dowolny kolor z pipety systemowej. Skrót nie może zabierać możliwości,
 * ma tylko skracać drogę do tych, po które sięga się najczęściej.
 */
function paskTlaNotatki(n){
  const teraz = (n.bg || "").toLowerCase();
  const sw = (hex, nazwa, klasa, tresc)=>
    '<button type="button" class="tloSw' + (klasa ? " " + klasa : "")
    + (teraz === String(hex).toLowerCase() ? " sel" : "") + '"'
    + ' data-tlo="' + hex + '" title="' + esc(nazwa) + '" aria-label="' + esc(nazwa) + '"'
    + (hex ? ' style="background:' + hex + '"' : "") + '>' + (tresc || "") + '</button>';
  return '<div class="ddTla" role="group" aria-label="Tło notatki">'
    + TLA_KARTECZEK.map(([nazwa, hex])=>sw(hex, nazwa)).join("")
    + sw("", "Bez koloru", "tloZdejmij")
    /* Ten jeden nie jest próbką, tylko wejściem do pełnego menu — stąd własny
       znacznik, żeby obsługa kliknięć nie wzięła go za kolor pusty. */
    + '<button type="button" class="tloSw tloWiecej" data-tlowiecej="1"'
    + ' title="Dowolny kolor…" aria-label="Dowolny kolor…">' + (ICO.paint || "") + '</button>'
    + '</div>';
}

/**
 * Obsługa kliknięcia w pasek kolorów. Oddaje `true`, gdy kliknięcie było jej —
 * dzięki temu menu, w którym pasek siedzi, może po prostu zapytać na wejściu
 * i nie wiedzieć nic o kolorach.
 */
function obsluzPaskTla(ev, n, kotwica){
  const dd = $("dropdown");
  if(ev.target.closest("[data-tlowiecej]")){
    dd.style.display = "none";
    setTimeout(()=>menuTlaNotatki(n, kotwica || document.body), 40);
    return true;
  }
  const sw = ev.target.closest(".ddTla [data-tlo]");
  if(!sw) return false;
  dd.style.display = "none";
  ustawTloNotatki(n, sw.dataset.tlo || null);
  renderNotes();
  pokazTloNotatkiNaEkranie(n);
  toastOk(sw.dataset.tlo ? "Zmieniono tło notatki" : "Zdjęto kolor notatki");
  return true;
}

/** Menu kolorów karteczki: paleta + dowolny kolor + zdjęcie koloru. */
function menuTlaNotatki(n, kotwica){
  const dd = $("dropdown");
  const teraz = (n.bg||"").toLowerCase();
  dd.innerHTML =
    `<div class="dd-lbl">Tło notatki</div>`+
    `<div class="tlaSiatka">`+
      TLA_KARTECZEK.map(([nazwa,hex])=>
        `<button type="button" class="tloSw${teraz===hex.toLowerCase()?" sel":""}" `+
        `data-tlo="${hex}" title="${esc(nazwa)}" aria-label="${esc(nazwa)}" `+
        `style="background:${hex}"></button>`).join("")+
    `</div>`+
    `<div class="dd-sep"></div>`+
    `<label class="tloWlasny">${ICO.paint||""}Dowolny kolor…`+
      `<input type="color" data-tlowlasny value="${esc(n.bg||"#fdf3bf")}">`+
    `</label>`+
    `<div data-tlo="">Bez koloru${!n.bg?' <span class="ddZnak">✓</span>':""}</div>`;
  dd.style.display = "block";
  if(typeof oznaczPozycjeMenu==="function") oznaczPozycjeMenu(dd);
  placeDropdown(dd, kotwica);

  const zastosuj = (kol)=>{
    ustawTloNotatki(n, kol||null);
    renderNotes();
    pokazTloNotatkiNaEkranie(n);
    toastOk(kol ? "Zmieniono tło notatki" : "Zdjęto kolor notatki");
  };
  dd.onclick = e=>{
    const sw = e.target.closest("[data-tlo]");
    if(!sw) return;
    dd.style.display = "none";
    zastosuj(sw.dataset.tlo);
  };
  const pole = dd.querySelector("[data-tlowlasny]");
  if(pole){
    /* Podgląd na żywo przy przesuwaniu, zapis dopiero po wybraniu — inaczej
       każdy ruch suwaka byłby osobnym zapisem do bazy. */
    pole.oninput = ()=>{
      document.querySelectorAll(".ncard").forEach(karta=>{
        if(karta.dataset.g!==n.g) return;
        karta.style.setProperty("--tloKarty", pole.value);
        if(typeof czytelnyTekst==="function")
          karta.style.setProperty("--tekstKarty", czytelnyTekst(pole.value));
        karta.classList.add("wlasneTlo");
      });
    };
    pole.onchange = ()=>{ dd.style.display="none"; zastosuj(pole.value); };
  }
}


/* ==========================================================================
   PRZEWIJANIE TREŚCI W MAŁEJ KARTECZCE

   Karteczka pokazuje osiem–dziesięć linijek, a notatka bywa dłuższa. Zamiast
   otwierać ją na pełnym ekranie tylko po to, żeby zerknąć na koniec, treść
   przewija się na miejscu.

   Sam `overflow:auto` nie wystarczy: przy stałej poświacie u dołu nie widać
   różnicy między „jest jeszcze tekst" a „to już koniec", a po przewinięciu
   w dół znika ślad, że coś zostało wyżej. Dlatego poświatę zapalamy z TEJ
   strony, z której faktycznie jest jeszcze treść.
   ========================================================================== */
function oznaczPrzewijanie(el){
  if(!el) return;
  const zapas = el.scrollHeight - el.clientHeight;
  const jest  = zapas > 4;                       // 4 px marginesu na zaokrąglenia
  el.classList.toggle("przewGora", jest && el.scrollTop > 2);
  el.classList.toggle("przewDol",  jest && el.scrollTop < zapas - 2);
}
/** Zakłada oznaczenia na treść nowo zbudowanej karty. */
function przygotujPrzewijanie(karta){
  const t = karta && karta.querySelector(".ncontent");
  if(!t) return;
  /* Rozmiary są znane dopiero po ułożeniu strony, więc liczymy w następnej
     klatce — inaczej scrollHeight równa się clientHeight i nic się nie zapala. */
  if(typeof requestAnimationFrame==="function") requestAnimationFrame(()=>oznaczPrzewijanie(t));
  else oznaczPrzewijanie(t);
}
/* Zdarzenie przewijania nie bąbelkuje, więc nasłuchujemy w fazie przechwytywania
   — jeden nasłuch zamiast jednego na każdą kartę. */
document.addEventListener("scroll", e=>{
  const t = e.target;
  if(t && t.classList && t.classList.contains("ncontent")){
    if(!t._przewRaf){
      t._przewRaf = requestAnimationFrame(()=>{
        t._przewRaf = 0;
        oznaczPrzewijanie(t);
      });
    }
  }
}, {capture:true, passive:true});

/* Wybór liczby kolumn pokazuje się tylko na tablicy — w pozostałych widokach
   byłby ozdobą bez działania. */
function odswiezWyborKolumn(){
  const naTablicy = $("noteList") && $("noteList").classList.contains("v-tablica");
  const sel = $("kolTablicy");
  if(sel){
    sel.hidden = !naTablicy;
    if(naTablicy && sel.value !== String(tablicaKol)) sel.value = String(tablicaKol);
  }
  const roz = $("rozmiarTablicy");
  if(roz){
    roz.hidden = !naTablicy;
    if(naTablicy && roz.value !== tablicaRozmiar) roz.value = tablicaRozmiar;
  }
}
if($("kolTablicy")){
  $("kolTablicy").addEventListener("change", e=>{
    ustawKolumnyTablicy(e.target.value);
    toastOk(e.target.value==="auto" ? "Liczba karteczek dopasowana do ekranu"
                                    : e.target.value+" karteczki w rzędzie");
  });
}
if($("rozmiarTablicy")){
  $("rozmiarTablicy").addEventListener("change", e=>{
    ustawRozmiarTablicy(e.target.value);
    const r = TABLICA_ROZMIARY[e.target.value];
    toastOk("Karteczki: " + (r ? r.nazwa.toLowerCase() : e.target.value));
  });
}
zastosujKolumnyTablicy();
