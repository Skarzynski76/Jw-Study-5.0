/* ==========================================================================
   JW Study — oszczedny.js
   ZWARTY INTERFEJS NA MAŁYM EKRANIE

   Na telefonie górny pasek zawijał się na trzy rzędy, pod nim szedł pasek
   przełączania kolumn, a filtry łamały się na dwa wiersze. Zanim pokazała się
   pierwsza notatka, znikała blisko połowa ekranu. Na komputerze te same
   elementy mieszczą się w jednym rzędzie i nikomu nie przeszkadzają — więc
   nie chodzi o to, żeby coś usuwać, tylko żeby zachowywało się stosownie do
   miejsca, jakie ma.

   Trzy ustawienia:
     • auto   — zwarcie włącza się samo poniżej 700 px szerokości (domyślnie),
     • zawsze — także na dużym ekranie, gdy ktoś woli gęściej,
     • nigdy  — pełny pasek wszędzie.
   ========================================================================== */
"use strict";

const OSZ_TRYBY = ["auto", "zawsze", "nigdy"];
let oszczedny = lsGet(KP+"Oszczedny", "auto");
if(!OSZ_TRYBY.includes(oszczedny)) oszczedny = "auto";

/** Czy w tej chwili interfejs ma być zwarty. */
function zwartyInterfejs(){
  if(oszczedny === "zawsze") return true;
  if(oszczedny === "nigdy")  return false;
  const ob = (typeof widocznyObszar==="function") ? widocznyObszar()
           : {szer:innerWidth, wys:innerHeight};
  /* Decyduje szerokość ALBO niska wysokość — telefon położony poziomo ma dużo
     szerokości, a bardzo mało wysokości, i tam oszczędzanie liczy się jeszcze
     bardziej. */
  return ob.szer <= 700 || ob.wys <= 560;
}
function zastosujOszczedny(){
  document.documentElement.classList.toggle("zwarty", zwartyInterfejs());
}
function ustawOszczedny(v){
  if(!OSZ_TRYBY.includes(v)) return;
  oszczedny = v;
  lsSet(KP+"Oszczedny", v);
  zastosujOszczedny();
}
addEventListener("resize", zastosujOszczedny);
addEventListener("orientationchange", ()=>setTimeout(zastosujOszczedny, 250));
if(window.visualViewport) window.visualViewport.addEventListener("resize", zastosujOszczedny);
zastosujOszczedny();


/* ==========================================================================
   PASKI CHOWAJĄ SIĘ PRZY PRZEWIJANIU W DÓŁ

   Pasek przełączania kolumn i pasek z widokami oraz filtrami są potrzebne, gdy
   się wybiera, CO oglądać. Podczas czytania listy tylko zabierają miejsce.
   Przewijanie w dół znaczy „czytam dalej" i paski ustępują; ruch w górę znaczy
   „szukam ustawień" i wracają.

   O SPOSOBIE CHOWANIA — to on decydował o tym, że aplikacja skakała.
   Pierwsze podejście zwijało paski wysokością. Każda klatka takiej animacji
   zmienia układ strony, więc przeglądarka przeliczała od nowa całą listę
   notatek — kilkadziesiąt kart z cieniami i przycięciami tekstu. Na telefonie
   dawało to szarpany ruch.

   Teraz paski są warstwą NAD listą i chowają się samym przesunięciem
   (transform), którym karta graficzna zajmuje się bez udziału układu strony.
   Miejsce pod nie jest zarezerwowane na stałe odstępem u góry listy, więc przy
   chowaniu i pokazywaniu nic się nie przelicza i nic nie przeskakuje. Paski
   wsuwają się pod zielony pasek aplikacji, tak jak w programach systemowych.
   ========================================================================== */
const CHOW_PROG_DOL  = 26;   // px w dół, zanim paski ustąpią
const CHOW_STREFA_GORY = 60; // tuż pod górną krawędzią paski zostają
/* Powrót pasków ma być spokojniejszy niż ich zniknięcie.
   Przy dziesięciu pikselach wracały przy najlżejszym odbiciu palca w drugą
   stronę — a przewijanie w dół rzadko bywa idealnie jednokierunkowe. Czekamy
   więc, aż wróci się o mniej więcej półtora rzędu notatek: tyle, ile trzeba,
   żeby ruch dało się uznać za zamierzony. */
const CHOW_RZEDY_POWROTU = 1.5;
const CHOW_POWROT_MIN = 90, CHOW_POWROT_MAX = 700;

/** Ile trzeba wrócić w górę, żeby paski uznały to za świadomy ruch. */
function progPowrotu(){
  const karta = document.querySelector("#noteList .ncard");
  const wys = karta ? karta.getBoundingClientRect().height : 0;
  if(!wys) return 240;                    // rozsądny zapas, gdy nie ma czego zmierzyć
  return Math.min(CHOW_POWROT_MAX, Math.max(CHOW_POWROT_MIN, wys * CHOW_RZEDY_POWROTU));
}

let _ostatniScroll = 0, _nazbierane = 0;

/** Mierzy paski i zapisuje ich wysokość, żeby CSS mógł zarezerwować miejsce. */
function zmierzPaski(){
  const r = document.documentElement.style;
  const tabs = $("mobileTabs"), pasek = $("pasekListy");
  /* offsetHeight jest zerowe dla elementu ukrytego (np. pasek kolumn na dużym
     ekranie) — wtedy rezerwacja też ma być zerowa. */
  const wTabs  = tabs  && tabs.offsetParent  ? tabs.offsetHeight  : 0;
  const wPasek = pasek && pasek.offsetParent ? pasek.offsetHeight : 0;
  r.setProperty("--wysTabs",  wTabs  + "px");
  r.setProperty("--wysPaska", wPasek + "px");
}
if(typeof ResizeObserver!=="undefined"){
  const obs = new ResizeObserver(()=>zmierzPaski());
  ["mobileTabs","pasekListy"].forEach(id=>{ const el = $(id); if(el) obs.observe(el); });
}
addEventListener("resize", zmierzPaski);
zmierzPaski();

function pokazPaski(pokaz){
  document.documentElement.classList.toggle("paskiSchowane", !pokaz);
}
function obsluzPrzewijanieListy(el){
  const y = el.scrollTop;
  const roznica = y - _ostatniScroll;
  _ostatniScroll = y;

  /* Przy samej górze zawsze widoczne — tam się wybiera, a nie czyta. */
  if(y <= CHOW_STREFA_GORY){ _nazbierane = 0; pokazPaski(true); return; }
  /* Lista krótsza od okna nie ma czego chować. */
  if(el.scrollHeight - el.clientHeight < 120){ pokazPaski(true); return; }

  /* Zbieramy ruch w jedną stronę, żeby drgnięcie palca niczego nie przełączało. */
  if((roznica > 0) !== (_nazbierane > 0)) _nazbierane = 0;
  _nazbierane += roznica;

  if(_nazbierane > CHOW_PROG_DOL){ pokazPaski(false); _nazbierane = 0; }
  else if(_nazbierane < -progPowrotu()){ pokazPaski(true); _nazbierane = 0; }
}
/* Zdarzenie przewijania nie bąbelkuje — słuchamy w fazie przechwytywania
   i reagujemy TYLKO na listę notatek. Przewijanie treści wewnątrz karteczki
   ma zostawić paski w spokoju. */
let _listaScrollRaf = 0;
document.addEventListener("scroll", e=>{
  const lista = $("noteList");
  if(!lista || e.target !== lista) return;
  if(!_listaScrollRaf){
    _listaScrollRaf = requestAnimationFrame(()=>{
      _listaScrollRaf = 0;
      obsluzPrzewijanieListy(lista);
    });
  }
}, {capture:true, passive:true});

/* Przy zmianie widoku albo filtra paski wracają — inaczej zostałyby schowane
   bez powodu i bez sposobu na ich przywrócenie. */
function odslonPaski(){
  _nazbierane = 0;
  /* Punkt odniesienia bierzemy z listy, a nie z zera. Wyzerowanie sprawiało,
     że pierwsze kolejne zdarzenie wyglądało jak gwałtowne przewinięcie w dół
     o całą bieżącą pozycję — i paski chowały się natychmiast po tym, jak je
     przywróciliśmy. */
  const lista = $("noteList");
  _ostatniScroll = lista ? lista.scrollTop : 0;
  pokazPaski(true);
  zmierzPaski();
}
