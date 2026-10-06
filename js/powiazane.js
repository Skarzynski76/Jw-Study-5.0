/* ==========================================================================
   JW Study — powiazane.js
   POWIĄZANE NOTATKI

   Przy ośmiu tysiącach notatek najtrudniej dowiedzieć się, że coś już się
   kiedyś zapisało. Wyszukiwanie odpowiada na pytanie zadane wprost; tutaj
   chodzi o coś odwrotnego — o przypomnienie, którego nikt nie szukał.

   Pod otwartą notatką pojawia się lista innych, które jej dotyczą. Powód jest
   zawsze wypisany, bo lista bez uzasadnienia to wróżenie: „ten sam werset",
   „ta sama lekcja", „wspólne słowa: pokora, akrobacje".

   Wszystko liczy się na urządzeniu. Nic nie jest nigdzie wysyłane.

   O SZYBKOŚCI. Porównywanie każdej notatki z każdą to przy ośmiu tysiącach
   sześćdziesiąt cztery miliony par — nie do przyjęcia. Dlatego rzadkie słowa
   mają swój skorowidz: słowo → notatki, w których wystąpiło. Buduje się raz
   i przeżywa aż do zmiany notatek. Wyrazy pospolite w ogóle do niego nie
   trafiają — nie niosą informacji, a to one kosztowałyby najwięcej.
   ========================================================================== */
"use strict";

const POW_ILE          = 8;    // ile powiązań pokazujemy
const POW_MIN_DLUGOSC  = 5;    // krótsze wyrazy zbyt często znaczą nic
const POW_MAX_NOTATEK  = 40;   // słowo z większej liczby notatek nie jest rzadkie
const POW_MAX_SLOW     = 400;  // ile słów bierzemy z jednej notatki
const POW_WAGA_RZADKIE = 8;    // wspólne rzadkie słowo jest silnym związkiem treści

let _skorowidz = null;         // Map(słowo → [guid, …])
let _skorowidzNieaktualny = true;

/** Zawiadomienie, że notatki się zmieniły — skorowidz trzeba złożyć od nowa. */
function unieaktualnijPowiazane(){ _skorowidzNieaktualny = true; }

const _slowaCache = new WeakMap();
/** Słowa notatki: znormalizowane, bez krótkich i bez powtórzeń (z pamięcią podręczną). */
function slowaNotatki(n){
  if(!n) return new Set();
  const sig = (n.mo||"") + ":" + (n.t||"") + ":" + ((n.h||n.c||"").length);
  const hit = _slowaCache.get(n);
  if(hit && hit.sig === sig) return hit.set;
  const tekst = (n.t||"") + " " + (n.c || (n.h ? String(n.h).replace(/<[^>]*>/g," ") : ""));
  const wynik = new Set();
  const czesci = norm(tekst).split(/[^a-z0-9]+/);
  for(let i=0; i<czesci.length && wynik.size<POW_MAX_SLOW; i++){
    const s = czesci[i];
    if(s.length >= POW_MIN_DLUGOSC) wynik.add(s);
  }
  _slowaCache.set(n, { sig, set: wynik });
  return wynik;
}

/** Skorowidz rzadkich słów. Liczony raz, do najbliższej zmiany notatek. */
function skorowidzSlow(){
  if(_skorowidz && !_skorowidzNieaktualny) return _skorowidz;
  const wszystkie = new Map();
  for(const n of notes){
    if(n.del) continue;
    for(const s of slowaNotatki(n)){
      let lista = wszystkie.get(s);
      if(!lista){ lista = []; wszystkie.set(s, lista); }
      /* Powyżej progu i tak odrzucimy — nie ma po co zbierać dalej. */
      if(lista.length <= POW_MAX_NOTATEK) lista.push(n.g);
    }
  }
  /* Zostawiamy tylko rzadkie. Słowo z pięciuset notatek nic nie mówi o żadnej
     z nich, a to właśnie takie słowa zajmowałyby najwięcej miejsca. */
  const rzadkie = new Map();
  wszystkie.forEach((lista, s)=>{ if(lista.length>1 && lista.length<=POW_MAX_NOTATEK) rzadkie.set(s, lista); });
  _skorowidz = rzadkie;
  _skorowidzNieaktualny = false;
  return _skorowidz;
}

/**
 * Notatki powiązane z podaną, od najmocniej związanych.
 * @returns {Array} lista wpisów: notatka, liczba punktów, powody powiązania
 */
function powiazaneNotatki(n, ile){
  if(!n) return [];
  ile = ile || POW_ILE;
  const punkty = new Map();     // guid → liczba
  const powody = new Map();     // guid → Set opisów
  const dodaj = (g, ile2, powod)=>{
    if(g === n.g) return;
    punkty.set(g, (punkty.get(g)||0) + ile2);
    if(!powody.has(g)) powody.set(g, new Set());
    powody.get(g).add(powod);
  };

  /* 1. Miejsce — najmocniejszy związek, bo mówi o tym samym fragmencie. */
  for(const inna of notes){
    if(inna.del || inna.g === n.g) continue;
    if(n.b && inna.b === n.b && inna.ch === n.ch){
      if(n.v && inna.v === n.v) dodaj(inna.g, 10, "ten sam werset");
      else dodaj(inna.g, 6, "ten sam rozdział");
    }
    if(n.ks && inna.ks === n.ks){
      const toSamoWydanie = (Number(inna.itn)||0) === (Number(n.itn)||0);
      const tenSamArtykul = n.doc && (Number(inna.doc)||0) === (Number(n.doc)||0);
      if(tenSamArtykul && toSamoWydanie) dodaj(inna.g, 3, "ten sam artykuł");
      else if(toSamoWydanie && n.itn) dodaj(inna.g, 4, "to samo wydanie");
      else dodaj(inna.g, 2, "ta sama publikacja");
    }
    if(n.tg && n.tg.length && inna.tg && inna.tg.length){
      const wspolne = inna.tg.filter(t=>n.tg.includes(t));
      if(wspolne.length){
        const nazwy = wspolne.map(t=>(tags.find(x=>x.id===t)||{}).name).filter(Boolean);
        dodaj(inna.g, 3 * wspolne.length, "wspólna etykieta: " + nazwy.join(", "));
      }
    }
  }

  /* 2. Rzadkie słowa — to one wyciągają notatkę sprzed dwóch lat. */
  const idx = skorowidzSlow();
  const moje = slowaNotatki(n);
  const trafienia = new Map();  // guid → [słowa]
  moje.forEach(s=>{
    const lista = idx.get(s);
    if(!lista) return;
    /* Zgodność treści jest mocniejsza od samego miejsca w publikacji.
       Każde wspólne rzadkie słowo ma dlatego stałą wagę 8. */
    const waga = POW_WAGA_RZADKIE;
    lista.forEach(g=>{
      if(g === n.g) return;
      punkty.set(g, (punkty.get(g)||0) + waga);
      if(!trafienia.has(g)) trafienia.set(g, []);
      const t = trafienia.get(g);
      if(t.length < 3) t.push(s);
    });
  });
  trafienia.forEach((slowa, g)=>{
    if(!powody.has(g)) powody.set(g, new Set());
    powody.get(g).add("wspólne słowa: " + slowa.join(", "));
  });

  const wynik = [];
  punkty.forEach((p, g)=>{
    const inna = notes.find(x=>x.g===g);
    if(inna && !inna.del) wynik.push({n:inna, punkty:p, powody:[...powody.get(g)]});
  });
  wynik.sort((a,b)=> b.punkty - a.punkty ||
                     (b.n.mo||"").localeCompare(a.n.mo||""));
  return wynik.slice(0, ile);
}

/* Czy blok ma być rozwinięty. Zapamiętane, bo to nawyk: kto z powiązań
   korzysta, chce je widzieć od razu; kto nie — nie chce ich w ogóle. */
function powiazaneOtwarte(){ return lsGet(KP+"PowOtw", "0") === "1"; }
function zapamietajPowiazane(otwarte){ lsSet(KP+"PowOtw", otwarte ? "1" : "0"); }

/**
 * Budowa listy pod notatką w czytniku.
 *
 * Blok jest ZWINIĘTY. Rozwinięty zajmował nawet jedną trzecią strony pod każdą
 * notatką, a powiązania są potrzebne od czasu do czasu — nie zawsze. Liczba
 * w nagłówku wystarczy, żeby wiedzieć, czy warto zaglądać; reszta wysuwa się
 * po dotknięciu.
 *
 * Używamy <details>, a nie własnego przełącznika: przeglądarka sama obsługuje
 * klawiaturę i czytnik ekranu, a stan „otwarte/zamknięte" jest w niej prawdziwy,
 * a nie udawany klasą.
 */
function htmlPowiazanych(n){
  const lista = powiazaneNotatki(n);
  if(!lista.length) return "";
  const wiersz = ({n:inna, powody})=>{
    const tytul = (inna.t||"").trim() ||
                  (typeof refLabel==="function" ? refLabel(inna) : "") || "Bez tytułu";
    const skad = (typeof refLabel==="function" ? refLabel(inna) : "") ||
                 (inna.ks ? (typeof pubFullName==="function" ? pubFullName(inna.ks) : inna.ks) : "");
    return `<button type="button" class="powPoz" data-pow="${esc(inna.g)}">
        <span class="powTyt">${esc(tytul)}</span>
        ${skad ? `<span class="powSkad">${esc(skad)}</span>` : ""}
        <span class="powCzemu">${esc(powody.slice(0,2).join(" · "))}</span>
      </button>`;
  };
  return `<details class="powiazane"${powiazaneOtwarte()?" open":""}>
      <summary class="powNagl">
        <span class="powStrzalka" aria-hidden="true">›</span>
        Powiązane notatki <span class="powIle">${lista.length}</span>
      </summary>
      <button type="button" class="powPodklad" data-pow-close aria-label="Zamknij powiązane notatki"></button>
      <section class="powPanel" role="dialog" aria-label="Powiązane notatki">
        <header class="powPanelHead"><b>Powiązane notatki</b><span class="powIle">${lista.length}</span>
          <button type="button" data-pow-close aria-label="Zamknij">✕</button>
        </header>
        <div class="powLista">${lista.map(wiersz).join("")}</div>
      </section>
    </details>`;
}

/* Zapamiętujemy wybór — ale dopiero ten świadomy, czyli zmianę stanu przez
   użytkownika, a nie ustawienie początkowe przy rysowaniu. */
document.addEventListener("toggle", e=>{
  const el = e.target;
  if(el && el.classList && el.classList.contains("powiazane")){
    zapamietajPowiazane(el.open);
    $("modalFs")?.classList.toggle("pow-open",el.open);
  }
}, true);

/* Otwarcie powiązanej notatki — w tym samym czytniku, bez zamykania okna. */
document.addEventListener("click", e=>{
  const zamknij=e.target && e.target.closest ? e.target.closest("[data-pow-close]") : null;
  if(zamknij){
    e.preventDefault(); e.stopPropagation();
    const d=zamknij.closest("details.powiazane"); if(d) d.open=false;
    return;
  }
  const b = e.target && e.target.closest ? e.target.closest("[data-pow]") : null;
  if(!b) return;
  e.preventDefault(); e.stopPropagation();
  const inna = notes.find(x=>x.g===b.dataset.pow);
  if(inna && typeof openFs==="function"){
    /* Lista należy do notatki źródłowej. Gdy po wyborze zostawała otwarta,
       renderFs() budował ją od nowa już dla wybranej notatki. Użytkownik
       widział wtedy pod panelem B, ale w panelu powiązania B, potem C itd. —
       wyglądało to jak niekończące się przechodzenie bez drogi do źródła.

       Wybór jest więc zakończeniem pracy z panelem: zamykamy go i jego
       zapamiętany stan PRZED zmianą fsGuid. openFs() zachowuje notatkę
       źródłową w fsSlad, dzięki czemu strzałka w nagłówku wraca dokładnie
       do niej i do zapamiętanego miejsca czytania. */
    const d=b.closest("details.powiazane");
    if(d) d.open=false;
    zapamietajPowiazane(false);
    $("modalFs")?.classList.remove("pow-open");
    openFs(inna);
  }
});
