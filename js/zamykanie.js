/* ==========================================================================
   JW Study — zamykanie.js
   JEDEN SPOSÓB ZAMYKANIA WYSKAKUJĄCYCH OKIENEK

   Było ich pięć, w pięciu plikach, i różniły się między sobą:

     menu główne (dropdown)      zamykało się przy „click"
     menu kolorów (colorMenu)    przy „click"
     ustawienia czytania         przy „pointerdown"
     okienko paska edycji        przy „pointerdown"
     menu kolumn                 przy „pointerdown"

   Różne zdarzenie to różny moment: jedne znikały pod palcem, inne dopiero po
   jego uniesieniu. Ale ważniejsze było to, co robiły WSZYSTKIE PIĘĆ:

   ŻADNE NIE POŁYKAŁO DOTKNIĘCIA. Dotknięcie obok otwartego menu zamykało je
   i JEDNOCZEŚNIE naciskało to, co znalazło się pod palcem. Chcąc tylko zamknąć
   menu, można było trafić w przycisk pod spodem — również taki, który usuwa.
   Na dotyku to szczególnie łatwe, bo menu bywa duże i zajmuje pół ekranu.

   Wszędzie indziej — w systemie, w innych aplikacjach — pierwsze dotknięcie
   obok otwartego menu tylko je zamyka. Dopiero drugie coś naciska. Tak jest
   teraz i tutaj.

   Okienka są WYMIENIONE W JEDNEJ TABLICY. Dopisanie kolejnego to jeden wiersz,
   a nie kolejny nasłuch na całą stronę z własnym pomysłem na zamykanie.
   ========================================================================== */
"use strict";

/* Dla każdego okienka: co ma się schować i czego NIE wolno uznać za „obok".
   Wyjątkiem jest zawsze przycisk otwierający — inaczej dotknięcie go przy
   otwartym okienku zamknęłoby je i natychmiast otworzyło z powrotem. */
const OKIENKA = [
  {id:"dropdown",  wyjatki:["#btnMenu", "#btnCols", "#navItemMenu", "#navItemCols", '[data-act="more"]', '[data-act="exp"]', ".more", ".secMore", ".more-btn"]},
  {id:"colorMenu", wyjatki:["#btnColors", "#btnSettings", "#navItemColors", "#navItemSettings"]},
  {id:"motywMenu", wyjatki:["#btnTheme", "#navItemTheme"]},
  {id:"readPop",   wyjatki:["[data-readbtn]"]},
  {id:"ebPop",     wyjatki:["[data-pop]"]}
];

/** Czy okienko jest teraz widoczne. */
function okienkoOtwarte(el){
  return !!(el && el.style.display === "block");
}
/** Czy dotknięcie padło w to okienko albo w coś, co do niego należy. */
function nalezyDoOkienka(cel, o){
  if(!cel || !cel.closest) return false;
  if(cel.closest("#" + o.id)) return true;
  return o.wyjatki.some(w=>cel.closest(w));
}

/* Połknięcie dotknięcia.

   Zamykamy przy „pointerdown", czyli zanim palec zostanie uniesiony — okienko
   znika od razu, bez wrażenia opóźnienia. Ale kliknięcie przychodzi PÓŹNIEJ
   i poleciałoby do elementu pod spodem, więc trzeba je przechwycić.

   Nasłuch jest jednorazowy i dodatkowo wygasa po 700 ms. Wcześniej w tym
   projekcie taka „bramka" była trzymana na zmiennej i przy zgubionym zdarzeniu
   potrafiła połknąć WSZYSTKIE kolejne kliknięcia — aplikacja wyglądała wtedy na
   zawieszoną. Nasłuch, który sam się zdejmuje, nie ma jak się zaciąć. */
function polknijNastepneKlikniecie(){
  let licznik = 0;
  const zdejmij = ()=>{
    clearTimeout(licznik);
    document.removeEventListener("click", polknij, true);
  };
  const polknij = e=>{
    zdejmij();
    e.preventDefault();
    e.stopPropagation();
  };
  document.addEventListener("click", polknij, true);
  licznik = setTimeout(zdejmij, 700);
}

/** Zamyka wszystkie otwarte okienka poza tymi, do których należy cel. */
function zamknijOkienkaObok(cel){
  let zamkniete = 0;
  for(const o of OKIENKA){
    const el = document.getElementById(o.id);
    if(!okienkoOtwarte(el)) continue;
    if(cel !== undefined && nalezyDoOkienka(cel, o)) continue;
    el.style.display = "none";
    zamkniete++;
  }
  return zamkniete;
}

document.addEventListener("pointerdown", e=>{
  /* Celem bywa sam dokument, który nie ma metody closest. Bez tego sprawdzenia
     nasłuch pilnujący całej strony wywracał się na zwykłym dotknięciu tła —
     a błąd z fazy przechwytywania trafia do okna bez treści, jako gołe
     „Script error.". */
  const cel = e.target && e.target.closest ? e.target : null;
  if(zamknijOkienkaObok(cel)) polknijNastepneKlikniecie();
}, true);

/* Klawisz Esc zamyka to samo. Dotąd obsługiwał tylko część okienek — a skoro
   tablica już istnieje, nie ma powodu, żeby którekolwiek po nim zostawało.

   Z jednym zastrzeżeniem: DUŻE OKNO JEST WYŻEJ NIŻ MENU. Gdy otwarte jest okno
   (ustawienia, pomoc, nowa notatka), Esc ma zamknąć JE — a nie menu, które
   zostało pod spodem i którego w tym momencie nie widać. Inaczej pierwsze
   naciśnięcie sprzątałoby coś niewidocznego i wyglądało na zignorowane. */
function jestOtwarteOkno(){
  return !!document.querySelector(".overlay.show");
}
document.addEventListener("keydown", e=>{
  if(e.key !== "Escape") return;
  if(jestOtwarteOkno()) return;
  if(zamknijOkienkaObok()) e.stopPropagation();
}, true);
