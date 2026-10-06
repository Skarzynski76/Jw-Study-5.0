/* ==========================================================================
   JW Study — wydobycie.js
   KARTECZKA WYDOBYWA SIĘ NA WIERZCH

   Na tablicy karteczka pokazuje początek notatki. Żeby przeczytać więcej, trzeba
   było otwierać ją na pełnym ekranie i wracać — a to gubi miejsce w siatce
   i rytm przeglądania.

   Dotknięcie karteczki wyjmuje ją na wierzch i powiększa mniej więcej do jednej
   trzeciej okna aplikacji. Drugie dotknięcie odkłada ją na miejsce, równo
   z pozostałymi.

   O ruchu: karta na czas powiększenia przechodzi w położenie bezwzględne, ale
   w siatce zostaje po niej PODKŁADKA o dokładnie tych samych wymiarach. Bez niej
   pozostałe karteczki przeskakiwałyby w górę i całość wyglądałaby na zepsutą.
   Animujemy krawędzie (góra, lewo, szerokość, wysokość), a nie skalę — dzięki
   temu tekst nie rozmazuje się i w powiększeniu widać go WIĘCEJ, a nie po prostu
   większy.
   ========================================================================== */
"use strict";

const WYD_CZAS = 260;           // ms — tyle trwa ruch w obie strony
let _wydobyta = null;           // {karta, podkladka, poprzedniPasek}

/* Proporcja arkusza A6 w pionie — ta sama, co każdego formatu z rodziny A:
   bok dłuższy jest √2 raza dłuższy od krótszego. */
const A6_STOSUNEK = 1.4142;
/* Kartka bierze jeszcze trzydzieści procent zapasu — w praniu okazała się
   odrobinę za mała, żeby wygodnie czytać. */
const A6_ZAPAS = 1.3;
/* Poszerzenie względem czystej proporcji A6 (v2.56).
   Sama kartka A6 jest wąska: przy wysokości 667 px wychodziło 472 px szerokości,
   czyli wiersz tekstu na 470 px. Notatki ze studium mają zwykle jeden akapit
   ciągły, a nie kolumnę wiersza poezji — piętnaście procent szerokości to około
   siedemdziesięciu pikseli, czyli osiem–dziewięć znaków więcej w wierszu.

   Poszerzamy TYLKO szerokość, wysokości nie ruszamy: kartka przestaje być
   dokładnym A6 (proporcja 1:1,41 → 1:1,23), ale to szerokości brakowało.
   Wszystkie ograniczenia poniżej działają jak wcześniej — na wąskim ekranie
   karteczka po prostu nie ma gdzie się poszerzyć i zostaje jak była. */
const WYD_POSZERZENIE = 1.15;

/**
 * Docelowy rozmiar wydobytej karteczki: kartka A6 postawiona pionowo.
 *
 * Jedna zasada jest ważniejsza od kształtu: karteczka MUSI być większa od tej,
 * którą było widać w rzędzie. Przy dwóch albo trzech w rzędzie karty są szerokie
 * i sama kartka A6 wychodziła od nich WĘŻSZA — kliknięcie wyglądało wtedy jak
 * pomniejszenie. Dlatego najpierw liczymy A6, a potem sprawdzamy, czy urosła.
 * Gdy nie — rośnie, nawet kosztem odejścia od proporcji, bo lepiej mieć nieco
 * inny kształt niż karteczkę mniejszą po powiększeniu.
 *
 * @param {HTMLElement} lista  pojemnik listy notatek
 * @param {DOMRect} maleRect   rozmiar karteczki sprzed wydobycia
 */
function rozmiarWydobycia(lista, maleRect){
  const ob = (typeof widocznyObszar==="function") ? widocznyObszar()
           : {szer:innerWidth, wys:innerHeight};
  const r = lista.getBoundingClientRect();
  /* Karta zaczyna się POD paskiem, więc miejsca w pionie jest tyle, ile zostaje
     po odjęciu rezerwy — a nie tyle, ile ma cała lista. Liczenie od pełnej
     wysokości sprawiało, że karta wystawała dołem: pasek ikon lądował na samej
     krawędzi albo poza nią i nie dało się go dotknąć. Do tego zostawiamy
     oddech u dołu, żeby karteczka nie kleiła się do krawędzi. */
  const rezerwa = parseFloat(getComputedStyle(lista).paddingTop) || 0;
  const oddech  = 20;
  const maxSzer = Math.min(r.width - 16, ob.szer - 24);
  const maxWys  = Math.min(ob.wys - 40, r.height - rezerwa - oddech * 2);

  /* WYSOKOŚĆ BIERZE SIĘ Z OKNA, NIE Z MINIATURY.
     Do 2.66 karta musiała być o 12 % większa od tej, która stała w rzędzie —
     przez to jej rozmiar szedł za ustawieniem wielkości miniatur: przy „bardzo
     dużych" okno do czytania rosło razem z nimi, a przy „bardzo małych" było
     ciasne. A to ma być JEDNO okno do czytania, zawsze tak samo duże, bo tekst
     w nim czyta się tak samo niezależnie od tego, jak wygląda siatka obok. */
  let wys = Math.min(560 * A6_ZAPAS, Math.max(300 * A6_ZAPAS, ob.wys * 0.70 * A6_ZAPAS));
  wys = Math.min(wys, maxWys);
  let szer = Math.min(wys / A6_STOSUNEK * WYD_POSZERZENIE, maxSzer);

  /* Jedyne, co bierzemy z miniatury: karta NIE MOŻE BYĆ OD NIEJ MNIEJSZA.
     Przy trzech szerokich kolumnach sama kartka A6 wychodzi węższa od miniatury
     i kliknięcie wyglądałoby jak pomniejszenie. */
  if(maleRect){
    szer = Math.max(szer, Math.min(maleRect.width,  maxSzer));
    wys  = Math.max(wys,  Math.min(maleRect.height, maxWys));
    /* Gdy szerokość podniosła się od miniatury, wysokość idzie za nią — inaczej
       kartka robi się przysadzista i przestaje wyglądać jak kartka. */
    wys  = Math.min(maxWys, Math.max(wys, szer * 1.15));
  }
  return {szer:Math.round(szer), wys:Math.round(wys)};
}

/* ==========================================================================
   OPRAWA KARTECZKI PODNIESIONEJ DO A6

   Karteczka w siatce i karteczka podniesiona do A6 to dwie różne rzeczy, choć
   ten sam element. W siatce liczy się gęstość: tytuł, początek treści, nic
   więcej. Po podniesieniu robi się z niej OKNO DO CZYTANIA — i wtedy brakowało
   jej wszystkiego, co okno mieć powinno: paska z tytułem, wyraźnego wyjścia
   i podpisanych przycisków. Uchwyt do przeciągania świecił w prawym górnym
   rogu na miejscu, gdzie ręka szuka krzyżyka, a pasek na dole był rzędem
   sześciu nierozpoznawalnych ikon.

   Oprawa powstaje DOPIERO przy podnoszeniu i znika przy odkładaniu. Gdyby
   siedziała w każdej karcie na zapas, sześćdziesiąt kart w siatce nosiłoby
   sześćdziesiąt niewidocznych pasków — dokładnie ten rodzaj rozrostu, który
   pilnuje testy/przegladarka/drzewo.js.

   Przyciski na dole i ⋮ w pasku mają te same „data-act", co pasek zwykłej
   karty, więc obsługuje je nasłuch z 09-notes.js — bez ani jednej nowej
   ścieżki w kodzie działań. Nowe są tylko dwa wyjścia (← i ✕), bo odkładanie
   karteczki należy do tego modułu.
   ========================================================================== */
const WYD_MIESIACE = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];
/** Data w postaci „19 sie 2017" — krócej i czytelniej niż zapis rokiem naprzód. */
function wydDataKrotka(iso){
  const s = String(iso||"");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(!m) return s.substring(0,10);
  return Number(m[3]) + " " + (WYD_MIESIACE[Number(m[2]) - 1] || "") + " " + m[1];
}
/** Skąd notatka pochodzi: lekcja albo artykuł, a gdy tego nie ma — nazwa publikacji. */
function wydZrodloNotatki(n){
  if(n.pub && String(n.pub).trim()) return String(n.pub).trim();
  if(n.ks && typeof pubFullName === "function") return pubFullName(n.ks);
  return "";
}
function wydIko(nazwa, ikona, opis, dodatkowe){
  return `<button class="wydIko" ${nazwa} title="${esc(opis)}" aria-label="${esc(opis)}"`
       + `${dodatkowe||""}>${ikona}</button>`;
}
/**
 * Zakłada oprawę: pasek u góry, wiersz pochodzenia i podpisaną stopkę.
 * @param {HTMLElement} karta
 */
function ubierzKarteczke(karta){
  if(karta.classList.contains("wydUbrana")) return;
  const n = notes.find(x=>x.g === karta.dataset.g);
  if(!n) return;
  const glowa = karta.querySelector(".nhead");
  if(!glowa) return;

  /* ——— pasek u góry: wyjście, tytuł, menu, zamknięcie ——— */
  glowa.insertAdjacentHTML("afterbegin",
    wydIko('data-wyd="wroc"', _svg('<path d="M15 5l-7 7 7 7"/>'), "Wróć na tablicę"));
  /* W pasku kropki stoją w pionie, w stopce w poziomie — tak jak w systemie:
     pionowe znaczą „menu tego okna", poziome „więcej w tym rzędzie". */
  const kropkiPion = _svg('<circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none"/>'
    + '<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/>'
    + '<circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none"/>');
  glowa.insertAdjacentHTML("beforeend",
    wydIko('data-act="more"', kropkiPion, "Więcej działań")
    + wydIko('data-wyd="zamknij"', _svg('<path d="M6 6l12 12M18 6L6 18"/>'), "Zamknij karteczkę"));

  /* ——— wiersz pochodzenia: publikacja, werset, data ———
     Buduje się osobno, a nie przez przestawianie plakietek z listy: tam ten
     wiersz jest zbiorem drobiazgów obok siebie, a tutaj ma dwa poziomy —
     najpierw skąd notatka jest, potem gdzie dokładnie i kiedy powstała. */
  const zrodlo = wydZrodloNotatki(n);
  const ref    = (typeof refLabel === "function") ? refLabel(n) : "";
  const link   = (typeof finderUrl === "function") ? finderUrl(n) : null;
  const data   = wydDataKrotka(n.mo || n.cr);
  const kalendarz = _svg('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M8 3v3M16 3v3M3.5 10h17"/>');
  const wersetHtml = ref
    ? (link
        ? `<a class="wydRef" href="${link}" target="_blank" rel="noopener noreferrer" data-act="openref" title="Otwórz w JW Library">${esc(ref)}</a>`
        : `<span class="wydRef bezLinku">${esc(ref)}</span>`)
    : `<button class="wydRef bezLinku" data-act="assignref" title="Przypisz werset — utworzy odnośnik do JW Library">Przypisz werset</button>`;
  glowa.insertAdjacentHTML("afterend",
    `<div class="wydMeta">`
    + (zrodlo ? `<div class="wydZrodlo" title="${esc(zrodlo)}">${ICO.book}<span>${esc(zrodlo)}</span></div>` : "")
    + `<div class="wydWiersz">${wersetHtml}`
    + `<span class="wydData">${kalendarz}${esc(data)}</span></div>`
    + `</div>`);

  /* ——— stopka: te same działania co na pasku karty, ale z podpisami ———
     Pięć zamiast sześciu: wybór zakładki zostaje na pasku listy, bo w oknie do
     czytania jest po nic — a szósta pozycja odbierała pozostałym miejsce na
     podpis. */
  const dol = [
    {act:"edit", ikona:ICO.edit,  napis:"Edytuj",      opis:"Edytuj notatkę"},
    {act:"fs",   ikona:ICO.fs,    napis:"Pełny ekran", opis:"Otwórz na pełnym ekranie"},
    {act:"pin",  ikona:ICO.pin,   napis:n.pin ? "Odepnij" : "Przypnij",
     opis:n.pin ? "Odepnij z góry" : "Przypnij na górze", wl:n.pin},
    {act:"fav",  ikona:ICO.star,  napis:"Ulubione",
     opis:n.fav ? "Usuń z ulubionych" : "Dodaj do ulubionych", wl:n.fav},
    {act:"more", ikona:ICO.dots,  napis:"Więcej",      opis:"Więcej działań"}
  ];
  karta.insertAdjacentHTML("beforeend",
    `<div class="wydStopka">`
    + dol.map(x=>`<button class="wydDzialanie${x.wl ? " wl" : ""}" data-act="${x.act}" `
        + `title="${esc(x.opis)}">${x.ikona}<span>${esc(x.napis)}</span></button>`).join("")
    + `</div>`);

  karta.classList.add("wydUbrana");
}
/** Zdejmuje oprawę — karta wraca do postaci, w jakiej stoi w siatce. */
function rozbierzKarteczke(karta){
  if(!karta) return;
  karta.classList.remove("wydUbrana");
  karta.querySelectorAll(".wydIko, .wydMeta, .wydStopka").forEach(el=>el.remove());
}

/** Czy w karteczce da się teraz cokolwiek chwycić poza samą treścią. */
function pomijaneWydobycie(cel){
  return !!(cel.closest("button, a, select, input, textarea, .ntools, .drag, .dragOrd, .wysUchwyt, .wydStopka, .wydMeta"));
}

function schowajKarteczke(natychmiast){
  if(!_wydobyta) return;
  const {karta, podkladka} = _wydobyta;
  _wydobyta = null;
  const lista = $("noteList");
  const r = podkladka.getBoundingClientRect();
  const rl = karta.offsetParent ? karta.offsetParent.getBoundingClientRect() : {top:0,left:0};
  rozbierzKarteczke(karta);       // oprawa znika od razu — ma nie jechać razem z kartą
  const wroc = ()=>{
    karta.classList.remove("wydobyta", "wRuchuWydobycia");
    karta.style.position = karta.style.top = karta.style.left =
      karta.style.width = karta.style.height = karta.style.zIndex = "";
    if(podkladka.parentNode) podkladka.parentNode.removeChild(podkladka);
    if(typeof oznaczPrzewijanie==="function"){
      const t = karta.querySelector(".ncontent"); if(t) oznaczPrzewijanie(t);
    }
  };
  if(natychmiast){ wroc(); return; }

  /* RUCH W OBIE STRONY. Klasa z przejściem jest zdejmowana po podniesieniu, więc
     przy odkładaniu karta nie miała czego animować: skakała na miejsce od razu,
     a program i tak czekał 260 ms przed sprzątaniem. Był czas ruchu, nie było
     ruchu — i to właśnie widać było jako przeskok. Klasa wraca na czas powrotu,
     a docelowe położenie ustawiamy w następnej klatce, żeby przeglądarka miała
     od czego zacząć przejście. */
  podkladka.classList.add("wydPodkladkaZnika");
  karta.classList.add("wRuchuWydobycia");
  /* Przewinięcie listy MUSI wejść do rachunku tak samo jak przy podnoszeniu —
     karta jest ustawiana względem pola wypełnienia listy, a `getBoundingClientRect`
     podkładki jest względem okna. Bez tego karta na przewiniętej liście wracała
     w inne miejsce niż to, z którego wyszła. */
  const przew = lista ? lista.scrollTop : 0;
  requestAnimationFrame(()=>{
    karta.style.top    = (r.top  - rl.top + przew) + "px";
    karta.style.left   = (r.left - rl.left) + "px";
    karta.style.width  = r.width  + "px";
    karta.style.height = r.height + "px";
  });
  setTimeout(wroc, WYD_CZAS);
}

function wydobadzKarteczke(karta){
  const lista = $("noteList");
  if(!lista || !lista.classList.contains("v-tablica")) return;
  /* Karta jest już otwarta/wydobyta — absolutnie jej nie zwijamy! */
  if(_wydobyta && _wydobyta.karta === karta) return;
  if(_wydobyta) schowajKarteczke(true);

  const r  = karta.getBoundingClientRect();
  const rl = lista.getBoundingClientRect();

  /* Podkładka trzyma miejsce w siatce — bez niej reszta karteczek przeskoczyłaby. */
  const podkladka = document.createElement("div");
  podkladka.className = "wydPodkladka";
  podkladka.style.height = r.height + "px";
  karta.parentNode.insertBefore(podkladka, karta);

  /* Punkt wyjścia: dokładnie tam, gdzie karta stoi teraz — żeby ruch zaczynał się
     bez przeskoku. Położenie liczymy względem listy, bo to ona jest odniesieniem. */
  karta.style.position = "absolute";
  karta.style.top    = (r.top  - rl.top  + lista.scrollTop)  + "px";
  karta.style.left   = (r.left - rl.left + lista.scrollLeft) + "px";
  karta.style.width  = r.width  + "px";
  karta.style.height = r.height + "px";
  karta.classList.add("wydobyta", "wRuchuWydobycia");

  const {szer, wys} = rozmiarWydobycia(lista, r);
  /* Środek powiększonej karty zostaje tam, gdzie był środek małej — o ile
     mieści się w widoku. Dzięki temu wzrok nie ucieka w inne miejsce ekranu. */
  let top  = r.top  - rl.top + lista.scrollTop + (r.height - wys)/2;
  let left = r.left - rl.left + lista.scrollLeft + (r.width  - szer)/2;
  /* Górna granica MUSI uwzględniać rezerwę na pasek nad listą.
     Karta jest ustawiana względem pola wypełnienia listy, więc „samą górą"
     jest miejsce POD paskiem, a nie pod nim widoczne. Bez tego powiększenie
     karteczki z pierwszego rzędu wsuwało jej początek pod pasek i pierwsze
     zdania znikały. */
  const rezerwa = parseFloat(getComputedStyle(lista).paddingTop) || 0;
  const oddech  = 20;
  const gora = lista.scrollTop + rezerwa + oddech;
  const dol  = lista.scrollTop + rl.height - wys - oddech;
  top  = Math.max(gora, Math.min(top, Math.max(gora, dol)));
  left = Math.max(8, Math.min(left, rl.width - szer - 8));

  requestAnimationFrame(()=>{
    karta.style.top    = top  + "px";
    karta.style.left   = left + "px";
    karta.style.width  = szer + "px";
    karta.style.height = wys  + "px";
  });
  /* Oprawę zakładamy od razu, nie po ruchu: pasek i stopka mają rosnąć razem
     z kartą, a nie doskakiwać do niej po ćwierć sekundy. */
  ubierzKarteczke(karta);

  setTimeout(()=>{
    karta.classList.remove("wRuchuWydobycia");
    if(typeof oznaczPrzewijanie==="function"){
      const t = karta.querySelector(".ncontent"); if(t) oznaczPrzewijanie(t);
    }
  }, WYD_CZAS);

  _wydobyta = {karta, podkladka};
}

let _wydDownTarget = null;
let _wydDownPos = { x: 0, y: 0 };
document.addEventListener("mousedown", e=>{
  _wydDownTarget = e.target;
  _wydDownPos = { x: e.clientX, y: e.clientY };
}, true);

document.addEventListener("click", e=>{
  const lista = $("noteList");
  if(!lista) return;
  const naTablicy = lista.classList.contains("v-tablica");
  const karta = e.target.closest && e.target.closest("#noteList .ncard");

  /* Podnoszenie karteczki dotyczy tylko tablicy — w pozostałych widokach
     notatka i tak jest widoczna w całości albo przycięta wprost. */
  if(!naTablicy) return;

  const zazn = (typeof getSelection === "function") ? getSelection() : null;
  const maZaznaczenie = !!(zazn && !zazn.isCollapsed && String(zazn).trim());
  const przesuniecie = Math.hypot(e.clientX - _wydDownPos.x, e.clientY - _wydDownPos.y);
  const bylDrag = przesuniecie > 5;
  const startWWydobytej = !!(_wydobyta && _wydobyta.karta && _wydDownTarget && _wydobyta.karta.contains(_wydDownTarget));
  const startWTresci = !!(_wydDownTarget && _wydDownTarget.closest && _wydDownTarget.closest(".ncontent, .searchMatch, .ntitle"));

  if(!karta){
    /* Zaznaczanie tekstu: jeśli użytkownik przeciągał kursor myszą i zwolnił go
       poza krawędzią karty (lub ma aktywne zaznaczenie tekstu), to jest gest
       kopiowania/zaznaczania, a NIE kliknięcie w tło! W takiej sytuacji
       absolutnie NIE wolno zamykać okna notatki. */
    if(maZaznaczenie || (bylDrag && (startWWydobytej || startWTresci))) return;

    /* Dotknięcie obok odkłada wydobytą karteczkę — tak jak odłożenie kartki
       na biurko, gdy sięga się po następną. */
    if(_wydobyta && !(e.target.closest && e.target.closest("#dropdown, #hlBar, #modalFs, #replacePanel")))
      schowajKarteczke();
    return;
  }

  /* Jeśli ta karta jest już otwarta/wydobyta — kliknięcie w jej treść lub tytuł
     służy do czytania, zaznaczania, kopiowania lub stawiania kursora.
     NIGDY nie wolno jej zamykać po kliknięciu wewnątrz niej! */
  if(_wydobyta && _wydobyta.karta === karta) return;

  if(pomijaneWydobycie(e.target)) return;

  /* Zaznaczanie tekstu na małej karcie nie może powodować podnoszenia
     ani zamykania karty w trakcie lub po zakończeniu gestu myszy. */
  if(maZaznaczenie || bylDrag) return;

  e.preventDefault(); e.stopPropagation();
  wydobadzKarteczke(karta);
}, true);

/* PRZEWIJANIE NIE ODKŁADA KARTECZKI.

   Wcześniej przewinięcie listy oznaczało „szukam czegoś dalej" i karteczka
   sama wracała do rzędu. W praktyce wyszło inaczej: gdy tekst w karteczce
   sięgał końca albo mieścił się w całości, palec przewijał listę pod spodem —
   i karteczka znikała w chwili, gdy użytkownik chciał tylko doczytać zdanie.
   Nie dało się na tym polegać, a od narzędzia do czytania trzeba wymagać
   przewidywalności.

   Teraz karteczkę odkłada wyłącznie świadome działanie: dotknięcie jej samej,
   dotknięcie obok albo klawisz Escape. Przewijanie należy do czytania.

   (Paski nad listą chowają się przy przewijaniu nadal — to co innego: one nie
   trzymają treści, tylko zabierają miejsce.) */

/* Przerysowanie listy buduje karty od nowa — wydobyta karta przestałaby wtedy
   istnieć, a podkładka zostałaby pustym miejscem. */
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && _wydobyta) schowajKarteczke(); });

/* Dwa wyjścia z paska: strzałka i krzyżyk. Robią to samo — odkładają karteczkę
   na miejsce. Ta sama rzecz pod dwiema ikonami nie jest niedopatrzeniem: ręka
   szuka strzałki, gdy myśli „wracam", i krzyżyka, gdy myśli „zamykam". Reszta
   przycisków paska i stopki ma zwykłe „data-act" i obsługuje je 09-notes.js. */
document.addEventListener("click", e=>{
  const cel = e.target && e.target.closest ? e.target.closest("[data-wyd]") : null;
  if(!cel) return;
  e.preventDefault(); e.stopPropagation();
  schowajKarteczke();
});

/* ==========================================================================
   DLACZEGO NIE MA TU DWÓCH DOTKNIĘĆ

   Przez trzy wydania działał gest: dwa dotknięcia otwierały notatkę na pełnym
   ekranie. Usunięty, i to z dwóch powodów.

   Pierwszy: gestów na karteczce zrobiło się za dużo. Dotknięcie podnosi,
   dotknięcie obok odkłada, przeciągnięcie przenosi, przewinięcie czyta —
   a drugie dotknięcie miało znaczyć jeszcze coś innego, w zależności od
   odstępu czasu. Za każdym razem trzeba było zgadywać, co się właśnie stanie.

   Drugi, poważniejszy: DWA DOTKNIĘCIA TO ZAZNACZENIE SŁOWA. Przechwytując je,
   odbieraliśmy tę możliwość — a w czytniku i w edycji zaznaczanie jest
   ważniejsze od skrótu do pełnego ekranu. Objawiało się to tak, że przy
   próbie zaznaczenia słowa nie działo się nic.

   Pełny ekran otwiera się przyciskiem ⛶ na pasku karteczki, dotknięciem
   tytułu w widoku listy albo z menu pod przytrzymaniem palca. Trzy drogi
   wystarczą.
   ========================================================================== */
