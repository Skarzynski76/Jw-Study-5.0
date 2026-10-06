/* ==========================================================================
   JW Study — historia.js
   HISTORIA WERSJI NOTATKI I PORÓWNYWANIE WERSJI

   CO BYŁO NIE TAK

   Historia istniała od dawna, ale mieszkała w pamięci ustawień
   (localStorage) i trzymała dziesięć wersji na notatkę:

     • Pamięć ustawień ma około PIĘCIU MEGABAJTÓW na całą aplikację i jest
       dzielona ze wszystkim innym: filtrami, szerokościami kolumn, wyborem
       motywu, ostatnim widokiem. Historia dwustu notatek zajmowała ją całą,
       a wtedy przestawały zapisywać się USTAWIENIA — objaw wyglądał jak
       „aplikacja zapomina, gdzie byłem", a przyczyna leżała w historii.
       Kod miał na to obejście: przy braku miejsca kasował najstarsze wpisy
       w pętli. Czyli historia sama się okradała, w milczeniu.
     • Dziesięć wersji to jedno dłuższe posiedzenie. Notatka pisana przez rok
       nie miała jak zachować śladu sprzed miesiąca.
     • Nie było jak POKAZAĆ, co się między wersjami zmieniło. Przywrócenie
       wersji było skokiem w ciemno: albo pamiętasz, co tam było, albo
       przywracasz i patrzysz.

   JAK JEST TERAZ

   Wersje leżą w bazie notatek (IndexedDB, magazyn „wersje"), która liczy się
   w setkach megabajtów, a nie w pojedynczych. Na notatkę pięćdziesiąt wersji,
   z rozsądnym ścieraniem starszych. Do tego okno z listą dat, przywracaniem
   i PORÓWNANIEM: dwie wersje do wyboru i podświetlone różnice słowo w słowo.

   TRZY DECYZJE, KTÓRE WARTO ZNAĆ

   1. Wersje NIE WCHODZĄ do kopii zapasowej. Kopia ma przenosić notatki na
      inne urządzenie i ma się dać wysłać — historia zwiększyłaby ją
      kilkukrotnie, a przenoszenie cudzej historii edycji niczemu nie służy.
      Notatki są w kopii kompletne; historia jest lokalnym dziennikiem pracy.
   2. Wersje NIE ZAWIERAJĄ ZDJĘĆ. Zdjęcie w treści to zwykle setki kilobajtów
      wklejone wprost w tekst; pięćdziesiąt wersji notatki ze zdjęciem to
      dziesiątki megabajtów na jedną notatkę. W miejscu zdjęcia zostaje
      wyraźny znacznik, a przy przywracaniu — ostrzeżenie.
   3. Porównanie liczy się na CZYSTYM TEKŚCIE, nie na znacznikach HTML.
      Różnica w rodzaju „pogrubiono jedno słowo" się w nim nie pokaże, ale
      za to nie pokażą się też różnice, których nikt nie widzi w notatce.
      Alternatywa — porównywanie znaczników — dawała listę zmian typu
      „<div> → <p>", zupełnie nieczytelną.
   ========================================================================== */
"use strict";

/* Ile wersji na notatkę. Pięćdziesiąt przy ścieraniu opisanym niżej sięga
   kilku miesięcy wstecz, a waży tyle co kilka zdjęć. */
const WERSJE_MAX = 50;
/* Nie częściej niż raz na tyle minut. Jedno posiedzenie przy notatce to
   zwykle kilka wejść w edycję po kolei — bez tego progu zjadałoby połowę
   historii, a wszystkie wpisy różniłyby się jednym zdaniem. */
const WERSJE_ODSTEP_MIN = 5;
/* Największa wersja, jaką warto trzymać. Notatka na 300 KB czystego tekstu
   to około pięćdziesięciu stron — takiej nie pisze się w tym oknie. */
const WERSJA_MAX_ZNAKOW = 300000;
/* Klucz starej historii w pamięci ustawień — do przeniesienia i skasowania. */
const WERSJE_STARY_KLUCZ = KP + "Versions";

/* ——— PODSTAWA: CZYTANIE I ZAPIS ——— */

/** Lista wersji notatki, od najnowszej. Zawsze tablica. */
async function wersjeNotatki(g){
  if(!idb || !g) return [];
  try{
    const rec = await idbGet("wersje", g);
    return (rec && Array.isArray(rec.lista)) ? rec.lista : [];
  }catch(e){ return []; }
}

/** Zdjęcia wychodzą z wersji — patrz decyzja 2 w nagłówku pliku. */
function wersjaBezZdjec(html){
  return String(html || "").replace(/<img[^>]*>/gi,
    '<span class="verImgNote">[zdjęcie — nie jest zapisywane w historii]</span>');
}

/**
 * ŚCIERANIE STARSZYCH WERSJI.
 *
 * Zwykłe „trzymaj ostatnie pięćdziesiąt" ma wadę: intensywny tydzień pracy
 * wypycha z historii cały poprzedni rok. A po roku nie szuka się wersji
 * z dokładnością do minuty — szuka się „jak to wyglądało w maju".
 *
 * Dlatego gęstość maleje z wiekiem:
 *   • ostatnie 7 dni — wszystkie wersje,
 *   • od 7 dni do 2 miesięcy — po jednej na dzień (najnowsza z danego dnia),
 *   • starsze — po jednej na miesiąc.
 * Na końcu i tak obowiązuje górna granica liczby wpisów.
 *
 * @param {Array} lista wersje od najnowszej
 * @param {number} terazMs czas odniesienia (podawany, żeby dało się to sprawdzić testem)
 */
function wersjeProzchudz(lista, terazMs){
  const teraz = terazMs || Date.now();
  const DZIEN = 86400000;
  const widziane = new Set();
  const wynik = [];
  for(const v of lista){
    const ms = Date.parse(v.t);
    const wiek = teraz - (isNaN(ms) ? teraz : ms);
    let kubelek;
    if(wiek <= 7 * DZIEN)        kubelek = "s" + wynik.length;      // każda osobno
    else if(wiek <= 60 * DZIEN)  kubelek = String(v.t).slice(0, 10); // rrrr-mm-dd
    else                         kubelek = String(v.t).slice(0, 7);  // rrrr-mm
    if(widziane.has(kubelek)) continue;
    widziane.add(kubelek);
    wynik.push(v);
    if(wynik.length >= WERSJE_MAX) break;
  }
  return wynik;
}

/**
 * Dopisuje BIEŻĄCĄ (jeszcze niezmienioną) treść notatki do historii.
 * Wołane PRZED nadpisaniem n.h nową treścią — dzięki temu w historii ląduje
 * to, co było, a nie to, co właśnie powstało.
 *
 * Nazwa „saveVersion" zostaje, bo wołają ją trzy inne moduły.
 */
function saveVersion(n){
  if(!n || !n.h || !idb) return;
  const light = wersjaBezZdjec(n.h);
  if(light.length > WERSJA_MAX_ZNAKOW) return;
  (async ()=>{
    try{
      const lista = await wersjeNotatki(n.g);
      /* Bez zmian — nie ma czego zapisywać. */
      if(lista.length && lista[0].h === light) return;
      /* Próg czasowy. Pomijamy NOWY wpis, a nie zastępujemy najstarszego:
         w historii ma zostać stan sprzed posiedzenia, bo do niego się wraca.
         Zastępowanie skasowałoby właśnie tę wersję, która jest potrzebna. */
      if(lista.length){
        const wiek = Date.now() - Date.parse(lista[0].t);
        if(isFinite(wiek) && wiek < WERSJE_ODSTEP_MIN * 60000) return;
      }
      const nowa = {t:new Date().toISOString(), h:light, ttl:n.t || "",
                    img:/<img/i.test(n.h)};
      const pelna = wersjeProzchudz([nowa, ...lista]);
      await idbPut("wersje", {g:n.g, lista:pelna});
    }catch(e){ /* historia nie może przeszkodzić w zapisaniu notatki */ }
  })();
}

/** Kasuje historię notatki — wołane przy trwałym usunięciu notatki. */
async function wersjeUsun(g){
  if(!idb || !g) return;
  try{ await idbDelKey("wersje", g); }catch(e){}
}

/** Ile miejsca zajmuje historia. Do pokazania w Ustawieniach. */
async function wersjeMiejsce(){
  if(!idb) return {notatek:0, wersji:0, znakow:0};
  try{
    const all = await idbAll("wersje");
    let wersji = 0, znakow = 0;
    all.forEach(r=>{
      (r.lista || []).forEach(v=>{ wersji++; znakow += (v.h || "").length; });
    });
    return {notatek:all.length, wersji, znakow};
  }catch(e){ return {notatek:0, wersji:0, znakow:0}; }
}

/** Czyści całą historię — na wypadek, gdyby ktoś chciał odzyskać miejsce. */
async function wersjeWyczysc(){
  if(!idb) return;
  const all = await idbAll("wersje").catch(()=>[]);
  for(const r of all) await idbDelKey("wersje", r.g).catch(()=>{});
}

/**
 * PRZENIESIENIE STAREJ HISTORII Z PAMIĘCI USTAWIEŃ.
 *
 * Robione raz, przy pierwszym uruchomieniu nowej wersji. Po przeniesieniu
 * stary klucz jest kasowany — i to jest połowa korzyści: zwalnia się do
 * kilku megabajtów pamięci ustawień, którą historia zajmowała.
 *
 * Kolejność jest ostrożna: najpierw zapis do bazy, potem kasowanie starego.
 * Odwrotnie — przy błędzie zapisu historia przepadłaby bez śladu.
 */
async function wersjePrzenies(){
  if(!idb) return 0;
  let stare;
  try{ stare = JSON.parse(localStorage.getItem(WERSJE_STARY_KLUCZ) || "null"); }
  catch(e){ stare = null; }
  if(!stare || typeof stare !== "object") return 0;
  let ile = 0;
  for(const g of Object.keys(stare)){
    const listaStara = Array.isArray(stare[g]) ? stare[g] : [];
    if(!listaStara.length) continue;
    try{
      const juz = await wersjeNotatki(g);
      /* Scalamy po czasie, żeby powtórne uruchomienie migracji nie zdublowało
         wpisów, a ewentualne nowe wersje nie zostały nadpisane starymi. */
      const razem = [...juz, ...listaStara]
        .filter(v=>v && v.t && v.h)
        .sort((a, b)=>String(b.t).localeCompare(String(a.t)));
      const bezPowtorek = [];
      const czasy = new Set();
      for(const v of razem){ if(czasy.has(v.t)) continue; czasy.add(v.t); bezPowtorek.push(v); }
      await idbPut("wersje", {g, lista:wersjeProzchudz(bezPowtorek)});
      ile += listaStara.length;
    }catch(e){ return ile; }      // nie kasujemy starego, gdy zapis nie wyszedł
  }
  try{ localStorage.removeItem(WERSJE_STARY_KLUCZ); }catch(e){}
  return ile;
}

/* ——— RÓŻNICE SŁOWO W SŁOWO ——— */

/** Tekst na słowa, z zachowaniem podziału na akapity jako osobnych „słów". */
function naSlowa(tekst){
  return String(tekst || "")
    .replace(/\r/g, "")
    .split(/(\n+|\s+)/)
    .filter(s=>s !== "" && !/^[ \t]+$/.test(s))
    .map(s=>/^\n+$/.test(s) ? "\n" : s);
}

/* Ile najwyżej kroków edycji szukamy. Koszt szukania rośnie z kwadratem tej
   liczby, więc jest to zawór bezpieczeństwa, nie ustawienie jakości: przy 3000
   przepisana od zera notatka na 2500 słów liczyła się 1,2 SEKUNDY, czyli okno
   otwierało się z wyraźnym zawahaniem. Przy 1200 to ułamek tego, a zwykła
   poprawka w notatce ma kilkanaście kroków i mieści się w kilku milisekundach. */
const ROZNICE_GRANICA = 1200;

/**
 * NAJKRÓTSZA ŚCIEŻKA EDYCJI (algorytm Myersa) na dowolnych tablicach.
 *
 * Zwraca listę kroków [typ, element] albo null, gdy różnic jest więcej niż
 * granica — wtedy woła się mnie po raz drugi, na akapitach zamiast słów.
 *
 * Brakujące przekątne trzeba czytać jako MINUS NIESKOŃCZONOŚĆ, nie jako zero.
 * Pierwsza wersja tej funkcji używała `map.get(k) || 0` i przy dwóch zupełnie
 * różnych tekstach cofanie po ścieżce wychodziło na złą przekątną: „Zupełnie
 * inny tekst tutaj" kontra „Nic wspólnego z poprzednim" dawało w wyniku słowo
 * „Zupełnie" trzy razy, a „tutaj" oznaczone jako wspólne z „poprzednim".
 */
function myersKroki(a, b, granica){
  const N = a.length, M = b.length;
  const MAX = Math.min(N + M, granica);
  const v = new Map([[1, 0]]);
  const g = (map, k)=>map.has(k) ? map.get(k) : -Infinity;
  const slady = [];
  let koniec = -1;
  for(let d = 0; d <= MAX && koniec < 0; d++){
    slady.push(new Map(v));            // stan PRZED krokiem d — potrzebny przy cofaniu
    for(let k = -d; k <= d; k += 2){
      const wDol = (k === -d) || (k !== d && g(v, k - 1) < g(v, k + 1));
      let x = wDol ? g(v, k + 1) : g(v, k - 1) + 1;
      if(!isFinite(x)) x = 0;
      let y = x - k;
      while(x < N && y < M && a[x] === b[y]){ x++; y++; }
      v.set(k, x);
      if(x >= N && y >= M){ koniec = d; break; }
    }
  }
  if(koniec < 0) return null;
  /* Cofanie po zapisanych stanach: dla danego d najpierw zdejmujemy wspólny
     odcinek (przekątną), potem jeden krok edycji — odwrotnie niż szło szukanie. */
  const kroki = [];
  let x = N, y = M;
  for(let d = koniec; d > 0; d--){
    const vp = slady[d];
    const k = x - y;
    const wDol = (k === -d) || (k !== d && g(vp, k - 1) < g(vp, k + 1));
    const kPrev = wDol ? k + 1 : k - 1;
    let xPrev = g(vp, kPrev);
    if(!isFinite(xPrev)) xPrev = 0;
    const yPrev = xPrev - kPrev;
    while(x > xPrev && y > yPrev){ kroki.push(["=", a[x - 1]]); x--; y--; }
    if(wDol) kroki.push(["+", b[yPrev]]);
    else     kroki.push(["-", a[xPrev]]);
    x = xPrev; y = yPrev;
  }
  while(x > 0 && y > 0){ kroki.push(["=", a[x - 1]]); x--; y--; }
  while(x > 0) kroki.push(["-", a[--x]]);
  while(y > 0) kroki.push(["+", b[--y]]);
  kroki.reverse();
  return kroki;
}

/**
 * RÓŻNICA SŁOWO W SŁOWO między dwiema tablicami słów.
 * Zwraca listę odcinków: {typ:"=", "-" albo "+", slowa:[...]}.
 *
 * Dlaczego Myers, a nie proste „porównaj wiersz do wiersza": wstawienie jednego
 * zdania na początku notatki przesuwa wszystko poniżej i porównanie
 * pozycja-do-pozycji pokazałoby CAŁĄ notatkę jako zmienioną. Myers znajduje
 * najdłuższy wspólny podciąg, więc pokazuje to jedno zdanie.
 *
 * Gdy notatka została przepisana od zera, dokładne szukanie po słowach jest
 * i kosztowne, i bezużyteczne — każde słowo inne. Wtedy schodzimy na poziom
 * AKAPITÓW: widać, które akapity wymieniono, a to jest cała informacja, jaka
 * w takiej sytuacji istnieje. Dopiero gdy i to nie wyjdzie, mówimy wprost:
 * cała stara treść usunięta, cała nowa dodana.
 */
function roznicaSlow(staraTab, nowaTab){
  const a = staraTab, b = nowaTab;
  /* Wspólny początek i koniec odcinamy od razu — to najtańsza część roboty
     i przy zwykłej poprawce zostaje po niej kilka słów do porównania. */
  let p = 0;
  while(p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0;
  while(s < a.length - p && s < b.length - p
        && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  const aSrodek = a.slice(p, a.length - s);
  const bSrodek = b.slice(p, b.length - s);

  const wynik = [];
  const dopisz = (typ, slowa)=>{
    if(!slowa.length) return;
    const ost = wynik[wynik.length - 1];
    if(ost && ost.typ === typ) ost.slowa.push(...slowa);
    else wynik.push({typ, slowa:[...slowa]});
  };
  dopisz("=", a.slice(0, p));

  if(!aSrodek.length || !bSrodek.length){
    dopisz("-", aSrodek);
    dopisz("+", bSrodek);
  }else{
    const kroki = myersKroki(aSrodek, bSrodek, ROZNICE_GRANICA);
    if(kroki){
      kroki.forEach(([typ, slowo])=>dopisz(typ, [slowo]));
    }else{
      const naAkapity = (tab)=>{
        const ak = [[]];
        tab.forEach(w=>{ if(w === "\n") ak.push([]); else ak[ak.length - 1].push(w); });
        return ak.map(x=>x.join(" ")).filter(x=>x !== "");
      };
      const aA = naAkapity(aSrodek), bA = naAkapity(bSrodek);
      const krokiA = (aA.length && bA.length) ? myersKroki(aA, bA, ROZNICE_GRANICA) : null;
      if(krokiA){
        krokiA.forEach(([typ, akapit], i)=>{
          if(i) dopisz(typ, ["\n"]);
          dopisz(typ, akapit.split(" "));
        });
      }else{
        dopisz("-", aSrodek);
        dopisz("+", bSrodek);
      }
    }
  }
  dopisz("=", a.slice(a.length - s));
  return wynik;
}

/**
 * Odcinki różnic na HTML do pokazania.
 *
 * Odstęp między odcinkami wychodzi NA ZEWNĄTRZ znaczników. Gdy siedział
 * w środku, zdanie „…wrócił z pola. Sługa nie kłócił…" pokazywało się jako
 * „…z pola.Sługa nie kłócił…": spacja przed wstawionym fragmentem należała do
 * poprzedniego odcinka, a ten kończył się na kropce. Teraz spacja jest
 * doklejana pomiędzy, więc widać ją niezależnie od tego, gdzie wypadła granica.
 */
function roznicaHtml(odcinki){
  const znacznik = {"=":"span", "-":"del", "+":"ins"};
  const czesci = [];
  odcinki.forEach(o=>{
    const t = znacznik[o.typ] || "span";
    /* Akapit („\n") wychodzi z odcinka osobno, żeby przełamanie wiersza nie
       trafiło w środek podświetlenia — inaczej zielone tło ciągnęłoby się przez
       pustą przestrzeń do końca wiersza. */
    let biezacy = [];
    const wypchnij = ()=>{
      if(!biezacy.length) return;
      const tekst = biezacy.join(" ");
      czesci.push(o.typ === "=" ? esc(tekst) : "<" + t + ">" + esc(tekst) + "</" + t + ">");
      biezacy = [];
    };
    o.slowa.forEach(w=>{
      if(w === "\n"){ wypchnij(); czesci.push("<br>"); }
      else biezacy.push(w);
    });
    wypchnij();
  });
  /* Spacje wstawiamy tylko pomiędzy sąsiadującymi kawałkami tekstu — nie po
     przełamaniu wiersza i nie przed nim. */
  let html = "";
  czesci.forEach((c, i)=>{
    const poprzedni = czesci[i - 1];
    if(i > 0 && poprzedni !== "<br>" && c !== "<br>") html += " ";
    html += c;
  });
  return html.trim() ? html : "<i>(bez treści)</i>";
}

/* Polska odmiana po liczbie: 1 słowo, 2–4 słowa, 5+ słów, ale 12 słów i 22 słowa.
   Bez tego okno pisało „+1 słów", co wygląda jak niedokończona robota. */
function odmianaSlow(n){
  const x = Math.abs(n) % 100, y = Math.abs(n) % 10;
  if(x === 1) return "słowo";
  if(y >= 2 && y <= 4 && !(x >= 12 && x <= 14)) return "słowa";
  return "słów";
}

/** Ile słów doszło, ile zniknęło — podsumowanie nad porównaniem. */
function roznicaPodsumowanie(odcinki){
  let dodane = 0, usuniete = 0, wspolne = 0;
  odcinki.forEach(o=>{
    const ile = o.slowa.filter(s=>s !== "\n").length;
    if(o.typ === "+") dodane += ile;
    else if(o.typ === "-") usuniete += ile;
    else wspolne += ile;
  });
  return {dodane, usuniete, wspolne};
}

/* ——— OKNO HISTORII ——— */

let _histNota = null;      // notatka, której historię pokazujemy
let _histWybor = {a:null, b:null};   // wybrane wersje w karcie „Porównaj”
let _histLista = [];       // jej wersje, od najnowszej
let _histKarta = "lista";  // "lista" albo "porownanie"

function histCzas(iso){
  const d = new Date(iso);
  if(isNaN(d)) return String(iso || "");
  const dwie = (x)=>String(x).padStart(2, "0");
  return dwie(d.getDate()) + "." + dwie(d.getMonth() + 1) + "." + d.getFullYear()
       + " " + dwie(d.getHours()) + ":" + dwie(d.getMinutes());
}
function histSlowa(html){
  return (String(html || "").replace(/<[^>]*>/g, " ").match(/\S+/g) || []).length;
}
/* Wersje z tej samej doby dostają podpis „dziś" / „wczoraj" — data w postaci
   19.08.2026 jest precyzyjna, ale przy szukaniu wczorajszej wersji trzeba ją
   najpierw przeliczyć w głowie. */
function histDzien(iso){
  const d = new Date(iso); if(isNaN(d)) return "";
  const doba = (x)=>new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const roznica = Math.round((doba(new Date()) - doba(d)) / 86400000);
  if(roznica === 0) return "dziś";
  if(roznica === 1) return "wczoraj";
  if(roznica < 7) return roznica + " dni temu";
  return "";
}

/** Treść notatki „teraz" — zawsze pierwsza pozycja do porównania. */
function histTeraz(){
  return {t:null, h:(_histNota && _histNota.h) || "", ttl:(_histNota && _histNota.t) || "",
          teraz:true};
}
function histWszystkieDoWyboru(){
  return [histTeraz(), ..._histLista];
}
function histPodpis(v, i){
  if(v.teraz) return "Teraz (bieżąca treść)";
  const dzien = histDzien(v.t);
  return histCzas(v.t) + (dzien ? " · " + dzien : "");
}

async function openHistory(ce){
  /* Wołane z paska edycji (ce = pole treści), ale ma działać i bez niego. */
  let n = null;
  if(ce){
    const karta = ce.closest(".ncard");
    if(karta) n = notes.find(x=>x.g === karta.dataset.g);
  }
  if(!n && typeof fsGuid !== "undefined" && fsGuid) n = notes.find(x=>x.g === fsGuid);
  if(!n){ toast("Nie wiadomo, której notatki dotyczy historia"); return; }
  _histNota = n;
  _histLista = await wersjeNotatki(n.g);
  _histKarta = "lista";
  rysujHistorie();
  openModal("modalHist");
}

function rysujHistorie(){
  const naglowek = $("modalHist").querySelector(".nn-head h3");
  if(naglowek) naglowek.textContent = "Historia wersji";
  const zak = $("histZakladki");
  if(zak){
    zak.innerHTML =
      '<button type="button" class="st-zak' + (_histKarta === "lista" ? " on" : "") + '" '
      + 'role="tab" data-hk="lista">Wersje (' + _histLista.length + ')</button>'
      + '<button type="button" class="st-zak' + (_histKarta === "porownanie" ? " on" : "") + '" '
      + 'role="tab" data-hk="porownanie">Porównaj</button>';
  }
  const lista = $("histLista"), por = $("histPorownanie");
  lista.style.display = _histKarta === "lista" ? "block" : "none";
  por.style.display   = _histKarta === "porownanie" ? "block" : "none";
  if(_histKarta === "lista") rysujListeWersji();
  else rysujPorownanie();
}

function rysujListeWersji(){
  const el = $("histLista");
  if(!_histLista.length){
    setHtml(el,
      '<div class="histPusto">Nie ma jeszcze zapisanych wcześniejszych wersji tej notatki.'
      + '<br><br>Wersja odkłada się przy zakończeniu edycji — nie częściej niż raz na '
      + WERSJE_ODSTEP_MIN + ' minut, żeby jedno posiedzenie nie zajęło całej historii.</div>');
    return;
  }
  const teraz = histTeraz();
  let html = '<div class="histWiersz histTeraz">'
    + '<div class="histKiedy"><b>Teraz</b><span>' + histSlowa(teraz.h) + ' słów</span></div>'
    + '<div class="histAkcje"><span class="histInfo">bieżąca treść notatki</span></div></div>';
  html += _histLista.map((v, i)=>{
    const dzien = histDzien(v.t);
    return '<div class="histWiersz" data-wers="' + i + '">'
      + '<div class="histKiedy"><b>' + esc(histCzas(v.t)) + '</b>'
      + '<span>' + histSlowa(v.h) + ' słów' + (dzien ? ' · ' + dzien : '')
      + (v.img ? ' · <span class="histZdj">było zdjęcie</span>' : '') + '</span></div>'
      + '<div class="histAkcje">'
      + '<button type="button" class="btn" data-hpor="' + i + '">Porównaj</button>'
      + '<button type="button" class="btn" data-hprzyw="' + i + '">Przywróć</button>'
      + '</div></div>';
  }).join("");
  setHtml(el, html);
}

function rysujPorownanie(){
  const el = $("histPorownanie");
  const wszystkie = histWszystkieDoWyboru();
  if(wszystkie.length < 2){
    setHtml(el, '<div class="histPusto">Do porównania potrzebne są dwie wersje. '
      + 'Na razie jest tylko bieżąca treść notatki.</div>');
    return;
  }
  /* Domyślnie: najnowsza zapisana wersja obok bieżącej treści — to porównanie,
     po które sięga się najczęściej („co zmieniłem ostatnio?"). */
  if(_histWybor.a == null || _histWybor.a >= wszystkie.length) _histWybor.a = 1;
  if(_histWybor.b == null || _histWybor.b >= wszystkie.length) _histWybor.b = 0;
  const opcje = (wybrany)=>wszystkie.map((v, i)=>
    '<option value="' + i + '"' + (i === wybrany ? " selected" : "") + '>'
    + esc(histPodpis(v, i)) + '</option>').join("");
  const a = wszystkie[_histWybor.a], b = wszystkie[_histWybor.b];
  const odcinki = roznicaSlow(naSlowa(htmlToPlain(a.h)), naSlowa(htmlToPlain(b.h)));
  const p = roznicaPodsumowanie(odcinki);
  setHtml(el,
    '<div class="histWybor">'
    + '<label>Starsza<select id="histA">' + opcje(_histWybor.a) + '</select></label>'
    + '<label>Nowsza<select id="histB">' + opcje(_histWybor.b) + '</select></label>'
    + '</div>'
    + '<div class="histBilans">'
    /* Pokazujemy tylko to, co się naprawdę zdarzyło. „−0 słów" obok „+12 słów"
       to zdanie o niczym, a przy każdym porównaniu jedna z tych liczb bywa zerem. */
    + (p.dodane   ? '<span class="histPlus">+' + p.dodane + ' ' + odmianaSlow(p.dodane) + '</span>' : '')
    + (p.usuniete ? '<span class="histMinus">−' + p.usuniete + ' ' + odmianaSlow(p.usuniete) + '</span>' : '')
    + (p.dodane === 0 && p.usuniete === 0
        ? '<span class="histInfo">te wersje mają tę samą treść</span>' : '')
    + '</div>'
    + '<div class="histDiff">' + roznicaHtml(odcinki) + '</div>'
    + '<div class="histLegenda"><ins>tak wygląda tekst dodany</ins> · '
    + '<del>tak wygląda usunięty</del> · porównanie dotyczy samego tekstu, '
    + 'nie pogrubień i kolorów</div>');
  const sa = $("histA"), sb = $("histB");
  if(sa) sa.onchange = ()=>{ _histWybor.a = +sa.value; rysujPorownanie(); };
  if(sb) sb.onchange = ()=>{ _histWybor.b = +sb.value; rysujPorownanie(); };
}

/* ——— OBSŁUGA OKNA ——— */
if($("modalHist")){
  $("modalHist").addEventListener("click", async ev=>{
    const zak = ev.target.closest("[data-hk]");
    if(zak){ _histKarta = zak.dataset.hk; rysujHistorie(); return; }

    const por = ev.target.closest("[data-hpor]");
    if(por){
      /* „Porównaj" przy wersji ustawia ją jako starszą, a bieżącą treść jako
         nowszą — czyli odpowiada na pytanie „co się od tego czasu zmieniło". */
      _histWybor.a = +por.dataset.hpor + 1;   // +1, bo na liście wyboru pierwsza jest bieżąca
      _histWybor.b = 0;
      _histKarta = "porownanie";
      rysujHistorie();
      return;
    }
    const przyw = ev.target.closest("[data-hprzyw]");
    if(przyw){
      const v = _histLista[+przyw.dataset.hprzyw];
      const n = _histNota;
      if(!v || !n) return;
      const ostrzZdj = v.img
        ? "<br><br>⚠️ Ta wersja zawierała <b>zdjęcia</b> — historia ich nie przechowuje "
          + "(zajmowałyby zbyt dużo miejsca), więc po przywróceniu trzeba je wstawić ponownie."
        : "";
      const zgoda = await askConfirm("Przywrócić tę wersję?",
        "Obecna treść notatki zostanie zastąpiona wersją z " + histCzas(v.t)
        + ".<br><br>Bieżącą treść zapiszemy w historii, więc będzie można wrócić." + ostrzZdj,
        {okLabel:"Przywróć", danger:!!v.img});
      if(!zgoda) return;
      /* Zapis bieżącej treści MUSI pójść przed podmianą i musi się dokończyć —
         inaczej próg czasowy mógłby go pominąć i droga powrotna by nie istniała. */
      await wersjeZapiszTeraz(n);
      pushUndo({type:"note", label:"przywrócenie wersji", before:cloneNote(n)});
      n.h = v.h; n.c = htmlToPlain(v.h); markDirty(n); renderAll();
      _histLista = await wersjeNotatki(n.g);
      rysujHistorie();
      toast("Przywrócono wersję z " + histCzas(v.t));
      return;
    }
  });
}

/**
 * Zapis wersji z pominięciem progu czasowego i z czekaniem na koniec.
 * Używany tam, gdzie treść zaraz zniknie (przywracanie), więc „za wcześnie"
 * nie jest powodem do pominięcia.
 */
async function wersjeZapiszTeraz(n){
  if(!n || !n.h || !idb) return;
  const light = wersjaBezZdjec(n.h);
  if(light.length > WERSJA_MAX_ZNAKOW) return;
  try{
    const lista = await wersjeNotatki(n.g);
    if(lista.length && lista[0].h === light) return;
    const nowa = {t:new Date().toISOString(), h:light, ttl:n.t || "", img:/<img/i.test(n.h)};
    await idbPut("wersje", {g:n.g, lista:wersjeProzchudz([nowa, ...lista])});
  }catch(e){}
}

/* Migracja startuje po wczytaniu bazy — nie blokuje pierwszego rysowania. */
if(typeof window !== "undefined"){
  setTimeout(()=>{ if(idb) wersjePrzenies(); }, 4000);
}
