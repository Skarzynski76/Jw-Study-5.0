/* ==========================================================================
   JW Study — centrum.js
   CENTRUM STUDIUM — CO MOŻNA ZROBIĆ DZISIAJ

   PO CO TO JEST

   Po uruchomieniu aplikacja pokazywała listę wszystkich notatek posortowaną po
   dacie zmiany. Przy kilkunastu tysiącach notatek taka lista nie odpowiada na
   żadne pytanie, które ma się w głowie po włączeniu: „na czym skończyłem",
   „co miałem dziś powtórzyć", „co jest jeszcze niedokończone". Odpowiedzi
   siedziały w danych od dawna — po prostu nikt ich nie zadawał.

   NIC NOWEGO NIE JEST TU ZLICZANE ANI ZAPISYWANE

   Wszystkie sekcje liczą się z pól, które już są w notatkach:

     n.la      data ostatniego otwarcia   → „Ostatnio studiowane", wersety, publikacje
     n.cr      data dodania               → „Ostatnio dodane"
     n.pwt.d   dzień powrotu do notatki   → „Na dziś"
     n.h       treść                      → „Niedokończone" (nieodhaczone zadania)
     ReadPos   zapamiętane przewinięcie   → „Kontynuuj ostatnie studium"
     Recent    ostatnie wyszukiwania      → „Ostatnie wyszukiwania"

   Dzięki temu Centrum działa od pierwszego uruchomienia na istniejących
   notatkach, a nie „od teraz zaczyna zbierać dane".

   KIEDY JEST WIDOCZNE

   Kolumna notatek pokazuje ALBO Centrum, ALBO listę. Centrum wychodzi na
   wierzch, gdy nic nie jest wybrane: bez etykiety, bez księgi, bez publikacji
   i bez szukania. Pierwsze kliknięcie czegokolwiek przełącza na listę, bo od
   tego momentu użytkownik wie, czego chce — a Centrum jest dla chwili, w której
   jeszcze nie wie.

   Jest też przełącznik ręczny: przycisk w pasku górnym (skrót H) i „Pokaż
   wszystkie notatki" w samym Centrum. Wybór ręczny jest zapamiętywany, więc kto
   woli zaczynać od listy, ustawia to raz. Całość da się wyłączyć w Ustawieniach.
   ========================================================================== */
"use strict";

/* Ile pozycji w sekcji. Sześć mieści się bez przewijania na telefonie i nadal
   jest wyborem, a nie wyrywkiem. */
const CENTR_ILE = 6;

/* Okno „ostatnio": trzy miesiące. Krócej — sekcje bywają puste po urlopie;
   dłużej — przestają mówić „ostatnio". */
const CENTR_DNI = 90;
const CENTR_KLUCZ = KP + "Centrum";        // "auto" albo "lista"
const CENTR_WLACZONE = KP + "CentrumWl";   // "1" albo "0"
const CENTR_UKLAD_KLUCZ = KP + "CentrumUklad306";
const CENTR_WIDOK_KLUCZ = KP + "CentrumWidok308";
const CENTR_WIDOKI = ["centrum","czytanie-chronologiczne","dzien","lista-dni","kalendarz","statystyki","drzewo","moje-plany","studium-osobiste","temat-szczegoly","projekty","kolejka","inbox","ostatnie","bezpieczenstwo"];
/* ═══ NOWE MODUŁY I BAZY DANYCH PLANÓW CZYTANIA BIBLII (v3.74) ═══ */

/* 1. Kanon biblijny (66 ksiąg, 1189 rozdziałów) */
const BIBLE_CANON_CHAPS = [
  { n: "Rodzaju", ch: 50 }, { n: "Wyjścia", ch: 40 }, { n: "Kapłańska", ch: 27 }, { n: "Liczb", ch: 36 }, { n: "Powtórzonego Prawa", ch: 34 },
  { n: "Jozuego", ch: 24 }, { n: "Sędziów", ch: 21 }, { n: "Rut", ch: 4 }, { n: "1 Samuela", ch: 31 }, { n: "2 Samuela", ch: 24 },
  { n: "1 Królów", ch: 22 }, { n: "2 Królów", ch: 25 }, { n: "1 Kronik", ch: 29 }, { n: "2 Kronik", ch: 36 }, { n: "Ezdrasza", ch: 10 },
  { n: "Nehemiasza", ch: 13 }, { n: "Estery", ch: 10 }, { n: "Hioba", ch: 42 }, { n: "Psalmy", ch: 150 }, { n: "Przysłów", ch: 31 },
  { n: "Kaznodziei", ch: 12 }, { n: "Pieśń nad Pieśniami", ch: 8 }, { n: "Izajasza", ch: 66 }, { n: "Jeremiasza", ch: 52 }, { n: "Lamentacje", ch: 5 },
  { n: "Ezechiela", ch: 48 }, { n: "Daniela", ch: 12 }, { n: "Ozeasza", ch: 14 }, { n: "Joela", ch: 3 }, { n: "Amosa", ch: 9 },
  { n: "Abdiasza", ch: 1 }, { n: "Jonasza", ch: 4 }, { n: "Micheasza", ch: 7 }, { n: "Nahuma", ch: 3 }, { n: "Habakuka", ch: 3 },
  { n: "Sofoniasza", ch: 3 }, { n: "Aggeusza", ch: 2 }, { n: "Zachariasza", ch: 14 }, { n: "Malachiasza", ch: 4 },
  { n: "Mateusza", ch: 28 }, { n: "Marka", ch: 16 }, { n: "Łukasza", ch: 24 }, { n: "Jana", ch: 21 }, { n: "Dzieje Apostolskie", ch: 28 },
  { n: "Rzymian", ch: 16 }, { n: "1 Koryntian", ch: 16 }, { n: "2 Koryntian", ch: 13 }, { n: "Galatów", ch: 6 }, { n: "Efezjan", ch: 6 },
  { n: "Filipian", ch: 4 }, { n: "Kolosan", ch: 4 }, { n: "1 Tesaloniczan", ch: 5 }, { n: "2 Tesaloniczan", ch: 3 }, { n: "1 Tymoteusza", ch: 6 },
  { n: "2 Tymoteusza", ch: 4 }, { n: "Tytusa", ch: 3 }, { n: "Filemona", ch: 1 }, { n: "Hebrajczyków", ch: 13 }, { n: "Jakuba", ch: 5 },
  { n: "1 Piotra", ch: 5 }, { n: "2 Piotra", ch: 3 }, { n: "1 Jana", ch: 5 }, { n: "2 Jana", ch: 1 }, { n: "3 Jana", ch: 1 },
  { n: "Judy", ch: 1 }, { n: "Objawienie", ch: 22 }
];

/* 2. Porządek chronologiczny (1189 rozdziałów w sekwencji historycznej) */
const BIBLE_CHRONO_BLOCKS = [
  ["Rodzaju", 1, 11], ["Hioba", 1, 42], ["Rodzaju", 12, 50],
  ["Wyjścia", 1, 40], ["Kapłańska", 1, 27], ["Liczb", 1, 36], ["Powtórzonego Prawa", 1, 34],
  ["Jozuego", 1, 24], ["Sędziów", 1, 21], ["Rut", 1, 4],
  ["1 Samuela", 1, 31], ["2 Samuela", 1, 24], ["1 Kronik", 1, 29],
  ["Psalmy", 1, 150], ["1 Królów", 1, 11], ["2 Kronik", 1, 9],
  ["Przysłów", 1, 31], ["Kaznodziei", 1, 12], ["Pieśń nad Pieśniami", 1, 8],
  ["1 Królów", 12, 22], ["2 Kronik", 10, 28],
  ["Abdiasza", 1, 1], ["Joela", 1, 3], ["Jonasza", 1, 4], ["Amosa", 1, 9], ["Ozeasza", 1, 14], ["Micheasza", 1, 7], ["Izajasza", 1, 39],
  ["2 Królów", 1, 20], ["2 Kronik", 29, 32], ["Izajasza", 40, 66],
  ["Nahuma", 1, 3], ["Sofoniasza", 1, 3], ["Habakuka", 1, 3],
  ["2 Królów", 21, 25], ["2 Kronik", 33, 36], ["Jeremiasza", 1, 52], ["Lamentacje", 1, 5],
  ["Ezechiela", 1, 48], ["Daniela", 1, 12],
  ["Ezdrasza", 1, 6], ["Aggeusza", 1, 2], ["Zachariasza", 1, 14], ["Estery", 1, 10], ["Ezdrasza", 7, 10], ["Nehemiasza", 1, 13], ["Malachiasza", 1, 4],
  ["Mateusza", 1, 28], ["Marka", 1, 16], ["Łukasza", 1, 24], ["Jana", 1, 21],
  ["Dzieje Apostolskie", 1, 14], ["Jakuba", 1, 5], ["Galatów", 1, 6],
  ["Dzieje Apostolskie", 15, 18], ["1 Tesaloniczan", 1, 5], ["2 Tesaloniczan", 1, 3],
  ["Dzieje Apostolskie", 19, 20], ["1 Koryntian", 1, 16], ["2 Koryntian", 1, 13], ["Rzymian", 1, 16],
  ["Dzieje Apostolskie", 21, 28], ["Efezjan", 1, 6], ["Filipian", 1, 4], ["Kolosan", 1, 4], ["Filemona", 1, 1], ["Hebrajczyków", 1, 13],
  ["1 Tymoteusza", 1, 6], ["Tytusa", 1, 3], ["1 Piotra", 1, 5], ["2 Piotra", 1, 3], ["2 Tymoteusza", 1, 4], ["Judy", 1, 1],
  ["1 Jana", 1, 5], ["2 Jana", 1, 1], ["3 Jana", 1, 1], ["Objawienie", 1, 22]
];

/* 3. Plany tematyczne statyczne */
const JWS_PLAN_JAN = [
  { d: 1, t: "Słowo stało się ciałem (Świadectwo Jana Chrzciciela)", f: [{ r: "Jana 1", t: "Słowo u Boga, Baranek Boży, pierwsi uczniowie" }] },
  { d: 2, t: "Cud w Kanie Galilejskiej i oczyszczenie świątyni", f: [{ r: "Jana 2", t: "Woda w wino w Kanie, gorliwość o dom Jehowy" }] },
  { d: 3, t: "Rozmowa z Nikodemem i miłość Boża", f: [{ r: "Jana 3", t: "Narodzenie z ducha, Jan 3:16 — miłość ku światu" }] },
  { d: 4, t: "Samarytanka przy studni Jakuba", f: [{ r: "Jana 4", t: "Woda życia i oddawanie czci w duchu i prawdzie" }] },
  { d: 5, t: "Uzdrwienie przy sadzawce Betesda", f: [{ r: "Jana 5", t: "Władza Syna od Ojca i nadzieja zmartwychwstania" }] },
  { d: 6, t: "Nakarmienie 5000 i Chleb życia", f: [{ r: "Jana 6", t: "Cudowne rozmnożenie chleba, Jezus chlebem z nieba" }] },
  { d: 7, t: "Święto Namiotów i nauczanie w świątyni", f: [{ r: "Jana 7", t: "Rzeki wody żywej i podział w tłumie" }] },
  { d: 8, t: "Światłość świata i wolność przez prawdę", f: [{ r: "Jana 8", t: "Prawda was wyzwoli, Abraham ujrzał mój dzień" }] },
  { d: 9, t: "Uzdrowienie niewidomego od urodzenia", f: [{ r: "Jana 9", t: "Sadzawka Syloe i odważne świadectwo uzdrowionego" }] },
  { d: 10, t: "Wspaniały Pasterz i owce", f: [{ r: "Jana 10", t: "Pasterz oddaje życie za owce, jedno stado i jeden pasterz" }] },
  { d: 11, t: "Wskrzeszenie Łazarza w Betanii", f: [{ r: "Jana 11", t: "Ja jestem zmartwychwstaniem i życiem" }] },
  { d: 12, t: "Namaszczenie w Betanii i wjazd do Jerozolimy", f: [{ r: "Jana 12", t: "Olejek Marii, triumfalny wjazd Króla" }] },
  { d: 13, t: "Umycie nóg apostołom i nowe przykazanie", f: [{ r: "Jana 13", t: "Wzór pokory i miłości wzajemnej" }] },
  { d: 14, t: "Droga, Prawda i Życie oraz Pocieszyciel", f: [{ r: "Jana 14", t: "Mieszkania w domu Ojca, dar ducha świętego" }] },
  { d: 15, t: "Prawdziwy krzew winny i latorośle", f: [{ r: "Jana 15", t: "Trwajcie w mojej miłości, przynoście obfity owoc" }] },
  { d: 16, t: "Działanie ducha świętego i zwycięstwo nad światem", f: [{ r: "Jana 16", t: "Odwagi! Ja zwyciężyłem świat" }] },
  { d: 17, t: "Arcykapłańska modlitwa Jezusa", f: [{ r: "Jana 17", t: "Poznawanie jedynego prawdziwego Boga, jedność uczniów" }] },
  { d: 18, t: "Ogród Getsemani, pojmanie i proces", f: [{ r: "Jana 18", t: "Przed Annaszem, Kajfaszem i Piłatem" }] },
  { d: 19, t: "Biczowanie, Golgota i śmierć Chrystusa", f: [{ r: "Jana 19", t: "Dokonało się! Ofiara odkupienia" }] },
  { d: 20, t: "Pusty grobowiec i ukazanie się uczniom", f: [{ r: "Jana 20", t: "Zmartwychwstanie, Maria Magdalena i Tomasz" }] },
  { d: 21, t: "Połów ryb nad Jeziorem Tyberiadzkim", f: [{ r: "Jana 21", t: "Paś moje owieczki, podążaj za mną" }] }
];

const JWS_PLAN_PRZYPOWIESCI = [
  { d: 1, t: "Siewca i cztery rodzaje gleby", f: [{ r: "Mateusza 13:1-23", t: "Siewca i cztery rodzaje gleby" }] },
  { d: 2, t: "Pszenica i chwasty", f: [{ r: "Mateusza 13:24-43", t: "Pszenica i chwasty" }] },
  { d: 3, t: "Ukryty skarb, drogocenna perła i sieć", f: [{ r: "Mateusza 13:44-52", t: "Ukryty skarb, drogocenna perła i sieć" }] },
  { d: 4, t: "Miłosierny Samarytanin", f: [{ r: "Łukasza 10:25-37", t: "Miłosierny Samarytanin" }] },
  { d: 5, t: "Nierozsądny bogacz", f: [{ r: "Łukasza 12:13-21", t: "Nierozsądny bogacz" }] },
  { d: 6, t: "Zagubiona owca i odnaleziona drachma", f: [{ r: "Łukasza 15:1-10", t: "Zagubiona owca i odnaleziona drachma" }] },
  { d: 7, t: "Syn marnotrawny i miłosierny ojciec", f: [{ r: "Łukasza 15:11-32", t: "Syn marnotrawny i miłosierny ojciec" }] },
  { d: 8, t: "Roztropny zarządca", f: [{ r: "Łukasza 16:1-13", t: "Roztropny zarządca" }] },
  { d: 9, t: "Wytrwała wdowa oraz faryzeusz i poborca podatków", f: [{ r: "Łukasza 18:1-14", t: "Wytrwała wdowa oraz faryzeusz i poborca podatków" }] },
  { d: 10, t: "Robotnicy w winnicy", f: [{ r: "Mateusza 20:1-16", t: "Robotnicy w winnicy" }] },
  { d: 11, t: "Dwóch synów i niegodziwi rolnicy", f: [{ r: "Mateusza 21:28-46", t: "Dwóch synów i niegodziwi rolnicy" }] },
  { d: 12, t: "Uczta weselna króla", f: [{ r: "Mateusza 22:1-14", t: "Uczta weselna króla" }] },
  { d: 13, t: "Dziesięć dziewic z lampami", f: [{ r: "Mateusza 25:1-13", t: "Dziesięć dziewic z lampami" }] },
  { d: 14, t: "Powierzone talenty oraz owce i kozy", f: [{ r: "Mateusza 25:14-46", t: "Powierzone talenty oraz owce i kozy" }] }
];

/* 4. Globalny stan czytania i filtrów */
let _centrAktywnyPlanId = lsGet(KP + "CentrumAktywnyPlan", "chrono");
let _centrWybranyDzien = parseInt(lsGet(KP + "CentrumCurDay", "1"), 10) || 1;
let _centrWybranyTematId = lsGet(KP + "CentrumCurTemat", "wiara-abrahama");
let _centrPlanTab = "wszystkie";
let _centrListaTab = "wszystkie";
let _centrListaSzukaj = "";
let _centrStatTab = "ogolny";
let _centrStudiumTab = "tematy";
const _cenNow = new Date();
let _centrKalRok = _cenNow.getFullYear();
let _centrKalMies = _cenNow.getMonth();

/* Czyszczenie starych danych testowych / mocków */
(function _centrAutoCleanMockData(){
  try {
    const rawChrono = lsGet(KP + "CentrumDniDone_chrono", null);
    if(rawChrono && !lsGet(KP + "CentrumMockCleaned_v2", null)){
      const arr = JSON.parse(rawChrono);
      if(Array.isArray(arr) && arr.length === 46 && arr[0] === 1 && arr[45] === 46){
        lsRem(KP + "CentrumDniDone_chrono");
      }
      lsSet(KP + "CentrumMockCleaned_v2", "1");
    }
    const rawNt = lsGet(KP + "CentrumDniDone_nt", null);
    if(rawNt && !lsGet(KP + "CentrumNtMockCleaned_v2", null)){
      const arrNt = JSON.parse(rawNt);
      if(Array.isArray(arrNt) && arrNt.length === 90){
        lsRem(KP + "CentrumDniDone_nt");
      }
      lsSet(KP + "CentrumNtMockCleaned_v2", "1");
    }
    const rawFragi = lsGet(KP + "CentrumFragiDone", null);
    if(rawFragi && (rawFragi.includes("chrono_47_0") || rawFragi.includes("47_0")) && !lsGet(KP + "CentrumFragiMockCleaned_v2", null)){
      lsRem(KP + "CentrumFragiDone");
      lsSet(KP + "CentrumFragiMockCleaned_v2", "1");
    }
  } catch(e){}
})();

/* 5. Generator planów z sekwencji rozdziałów */
function _centrPobierzKanoniczneRozdzialy(){
  const all = [];
  BIBLE_CANON_CHAPS.forEach(b => {
    for(let c = 1; c <= b.ch; c++) all.push({ book: b.n, ch: c });
  });
  return all;
}

function _centrPobierzChronoRozdzialy(){
  const all = [];
  BIBLE_CHRONO_BLOCKS.forEach(([b, s, e]) => {
    for(let c = s; c <= e; c++) all.push({ book: b, ch: c });
  });
  return all;
}

function _centrGenerujPlanZRozdzialow(chapters, totalDays, tytulPrefix){
  const totalCh = chapters.length;
  const days = [];
  for(let d = 1; d <= totalDays; d++){
    const startIdx = Math.round(((d - 1) * totalCh) / totalDays);
    const endIdx = Math.round((d * totalCh) / totalDays);
    let slice = chapters.slice(startIdx, endIdx);
    if(!slice.length){
      slice = [chapters[Math.min(startIdx, totalCh - 1)]];
    }
    const frags = [];
    let curBook = "", curStart = 0, curEnd = 0;
    slice.forEach(chObj => {
      if(chObj.book === curBook && chObj.ch === curEnd + 1){
        curEnd = chObj.ch;
      } else {
        if(curBook){
          frags.push({
            r: curBook + " " + (curStart === curEnd ? curStart : curStart + "-" + curEnd),
            t: curBook + (curStart === curEnd ? " rozdział " + curStart : " rozdziały " + curStart + "–" + curEnd)
          });
        }
        curBook = chObj.book;
        curStart = chObj.ch;
        curEnd = chObj.ch;
      }
    });
    if(curBook){
      frags.push({
        r: curBook + " " + (curStart === curEnd ? curStart : curStart + "-" + curEnd),
        t: curBook + (curStart === curEnd ? " rozdział " + curStart : " rozdziały " + curStart + "–" + curEnd)
      });
    }
    const tytul = frags.map(f => f.r).join(", ");
    days.push({ d: d, t: (tytulPrefix ? tytulPrefix + ": " : "") + tytul, f: frags });
  }
  return days;
}

function _centrGenerujPlanPoKolei(totalDays, tytulPrefix){
  return _centrGenerujPlanZRozdzialow(_centrPobierzKanoniczneRozdzialy(), totalDays, tytulPrefix);
}

function _centrGenerujPlanChronologiczny(totalDays, tytulPrefix){
  return _centrGenerujPlanZRozdzialow(_centrPobierzChronoRozdzialy(), totalDays, tytulPrefix);
}

function _centrGenerujPlanZbalansowany(totalDays, tytulPrefix){
  const canon = _centrPobierzKanoniczneRozdzialy();
  const ot = canon.slice(0, 929);
  const nt = canon.slice(929);
  const days = [];
  for(let d = 1; d <= totalDays; d++){
    const ot_s = Math.round(((d - 1) * ot.length) / totalDays);
    const ot_e = Math.round((d * ot.length) / totalDays);
    const nt_s = Math.round(((d - 1) * nt.length) / totalDays);
    const nt_e = Math.round((d * nt.length) / totalDays);
    const slice_ot = ot.slice(ot_s, ot_e).length ? ot.slice(ot_s, ot_e) : [ot[Math.min(ot_s, ot.length - 1)]];
    const slice_nt = nt.slice(nt_s, nt_e).length ? nt.slice(nt_s, nt_e) : [nt[Math.min(nt_s, nt.length - 1)]];
    const frags = [];
    [slice_ot, slice_nt].forEach(slice => {
      let curBook = "", curStart = 0, curEnd = 0;
      slice.forEach(chObj => {
        if(chObj.book === curBook && chObj.ch === curEnd + 1){
          curEnd = chObj.ch;
        } else {
          if(curBook){
            frags.push({
              r: curBook + " " + (curStart === curEnd ? curStart : curStart + "-" + curEnd),
              t: curBook + (curStart === curEnd ? " rozdział " + curStart : " rozdziały " + curStart + "–" + curEnd)
            });
          }
          curBook = chObj.book;
          curStart = chObj.ch;
          curEnd = chObj.ch;
        }
      });
      if(curBook){
        frags.push({
          r: curBook + " " + (curStart === curEnd ? curStart : curStart + "-" + curEnd),
          t: curBook + (curStart === curEnd ? " rozdział " + curStart : " rozdziały " + curStart + "–" + curEnd)
        });
      }
    });
    const tytul = frags.map(f => f.r).join(", ");
    days.push({ d: d, t: (tytulPrefix ? tytulPrefix + ": " : "") + tytul, f: frags });
  }
  return days;
}

function _centrGenerujPlanNT(totalDays, tytulPrefix){
  const canon = _centrPobierzKanoniczneRozdzialy();
  const nt = canon.slice(929);
  return _centrGenerujPlanZRozdzialow(nt, totalDays, tytulPrefix);
}

function _centrGenerujPlanMadrosciowe(totalDays, tytulPrefix){
  const canon = _centrPobierzKanoniczneRozdzialy();
  const ps = canon.filter(c => c.book === "Psalmy" || c.book === "Przysłów");
  return _centrGenerujPlanZRozdzialow(ps, totalDays, tytulPrefix);
}

/* 6. Pamięć podręczna i pobieranie danych planów */
let _centrCachePlanow = null;

function _centrPobierzWszystkiePlanyDane(){
  if(_centrCachePlanow) return _centrCachePlanow;
  _centrCachePlanow = {
    // === CHRONOLOGICZNE ===
    "chrono": {
      id: "chrono",
      name: "Czytanie chronologiczne (1 rok)",
      days: 365,
      cat: "chrono",
      catName: "Chronologiczny",
      duration: "1 rok",
      pace: "~3,25 partii/dzień",
      timeEst: "⏱ 15–20 min",
      plan: _centrGenerujPlanChronologiczny(365, "Chronologicznie"),
      desc: "Wydarzenia biblijne w porządku historycznym na 365 dni. Zobacz spójną oś czasu od stworzenia świata po czasy apostolskie."
    },
    "chrono-2lata": {
      id: "chrono-2lata",
      name: "Czytanie chronologiczne (2 lata)",
      days: 730,
      cat: "chrono",
      catName: "Chronologiczny",
      duration: "2 lata",
      pace: "~1,6 partii/dzień",
      timeEst: "⏱ 8–10 min",
      plan: _centrGenerujPlanChronologiczny(730, "Chronologicznie"),
      desc: "Wydarzenia w porządku historycznym w spokojnym tempie na 2 lata (730 dni). Hiob w czasach patriarchów, prorocy wpleceni w historię królów."
    },
    "chrono-3lata": {
      id: "chrono-3lata",
      name: "Czytanie chronologiczne (3 lata)",
      days: 1095,
      cat: "chrono",
      catName: "Chronologiczny",
      duration: "3 lata",
      pace: "~1 partia/dzień",
      timeEst: "⏱ 4–6 min",
      plan: _centrGenerujPlanChronologiczny(1095, "Chronologicznie"),
      desc: "Wydarzenia w porządku historycznym w bardzo spokojnym tempie na 3 lata (1095 dni). Dokładne studium epoka po epoce z czasem na notatki."
    },

    // === PO KOLEI (KANONICZNE) ===
    "pokolei-1rok": {
      id: "pokolei-1rok",
      name: "Cała Biblia po kolei (1 rok)",
      days: 365,
      cat: "pokolei",
      catName: "Księgi po kolei",
      duration: "1 rok",
      pace: "~3,25 rozdz./dzień",
      timeEst: "⏱ 15–20 min",
      plan: _centrGenerujPlanPoKolei(365, "Po kolei"),
      desc: "Od Księgi Rodzaju do Objawienia w 1 rok. Klasyczny układ 66 ksiąg biblijnych (3–4 rozdziały dziennie)."
    },
    "pokolei-2lata": {
      id: "pokolei-2lata",
      name: "Cała Biblia po kolei (2 lata)",
      days: 730,
      cat: "pokolei",
      catName: "Księgi po kolei",
      duration: "2 lata",
      pace: "~1,6 rozdz./dzień",
      timeEst: "⏱ 8–10 min",
      plan: _centrGenerujPlanPoKolei(730, "Po kolei"),
      desc: "Od Księgi Rodzaju do Objawienia w 2 lata (730 dni). Średnio 1–2 rozdziały dziennie – zrównoważony czas na refleksję."
    },
    "pokolei-3lata": {
      id: "pokolei-3lata",
      name: "Cała Biblia po kolei (3 lata)",
      days: 1095,
      cat: "pokolei",
      catName: "Księgi po kolei",
      duration: "3 lata",
      pace: "~1 rozdz./dzień",
      timeEst: "⏱ 4–6 min",
      plan: _centrGenerujPlanPoKolei(1095, "Po kolei"),
      desc: "Od Księgi Rodzaju do Objawienia w 3 lata (1095 dni). Dokładnie 1 rozdział dziennie – łatwy do utrzymania codzienny nawyk."
    },

    // === ZRÓWNOWAŻONE (PISMA HEBRAJSKIE I GRECKIE) ===
    "zbalansowany-1rok": {
      id: "zbalansowany-1rok",
      name: "Pisma Hebrajskie i Greckie (1 rok)",
      days: 365,
      cat: "zbalansowany",
      catName: "Pisma Hebr. + Greckie",
      duration: "1 rok",
      pace: "2-3 rozdz. Hebr. + 1 rozdz. Greckich",
      timeEst: "⏱ 15–20 min",
      plan: _centrGenerujPlanZbalansowany(365, "Pisma Hebr. + Greckie"),
      desc: "Codziennie fragment Pism Hebrajskich oraz Chrześcijańskich Pism Greckich. Idealna równowaga dla umysłu i serca."
    },
    "zbalansowany-2lata": {
      id: "zbalansowany-2lata",
      name: "Pisma Hebrajskie i Greckie (2 lata)",
      days: 730,
      cat: "zbalansowany",
      catName: "Pisma Hebr. + Greckie",
      duration: "2 lata",
      pace: "1-2 rozdz. Hebr. + fragment Greckich",
      timeEst: "⏱ 8–10 min",
      plan: _centrGenerujPlanZbalansowany(730, "Pisma Hebr. + Greckie"),
      desc: "Pisma Hebrajskie i Greckie równolegle w spokojnym 2-letnim tempie. Codzienny kontakt z życiem i naukami Chrystusa."
    },
    "zbalansowany-3lata": {
      id: "zbalansowany-3lata",
      name: "Pisma Hebrajskie i Greckie (3 lata)",
      days: 1095,
      cat: "zbalansowany",
      catName: "Pisma Hebr. + Greckie",
      duration: "3 lata",
      pace: "~1 rozdz. Hebr. + fragment Greckich",
      timeEst: "⏱ 4–6 min",
      plan: _centrGenerujPlanZbalansowany(1095, "Pisma Hebr. + Greckie"),
      desc: "Pisma Hebrajskie i Greckie równolegle w bardzo spokojnym 3-letnim tempie (1095 dni). Niezwykle przystępna codzienna lektura."
    },

    // === TEMATYCZNE I PISMA GRECKIE ===
    "nt": {
      id: "nt",
      name: "Pisma Greckie (90 dni)",
      days: 90,
      cat: "temat",
      catName: "Pisma Greckie",
      duration: "90 dni",
      pace: "~2,8 rozdz./dzień",
      timeEst: "⏱ 10–15 min",
      plan: _centrGenerujPlanNT(90, "Pisma Greckie"),
      desc: "Wszystkie 27 ksiąg Chrześcijańskich Pism Greckich w 3 miesiące (od Ewangelii Mateusza do Objawienia)."
    },
    "nt-1rok": {
      id: "nt-1rok",
      name: "Pisma Greckie (1 rok)",
      days: 365,
      cat: "temat",
      catName: "Pisma Greckie",
      duration: "1 rok",
      pace: "~0,7 rozdz./dzień",
      timeEst: "⏱ 3–5 min",
      plan: _centrGenerujPlanNT(365, "Pisma Greckie"),
      desc: "Wszystkie Chrześcijańskie Pisma Greckie rozłożone na pełny rok – krótkie, inspirujące fragmenty każdego dnia."
    },
    "jan": {
      id: "jan",
      name: "Ewangelia według Jana (21 dni)",
      days: 21,
      cat: "temat",
      catName: "Ewangelie",
      duration: "21 dni",
      pace: "1 rozdział / dzień",
      timeEst: "⏱ 5 min",
      plan: JWS_PLAN_JAN,
      desc: "Głębokie rozważanie życia, cudów i miłości Jezusa Chrystusa rozdział po rozdziale."
    },
    "przypowiesci": {
      id: "przypowiesci",
      name: "Przypowieści Jezusa (14 dni)",
      days: 14,
      cat: "temat",
      catName: "Tematyczny",
      duration: "14 dni",
      pace: "1 przypowieść / dzień",
      timeEst: "⏱ 5 min",
      plan: JWS_PLAN_PRZYPOWIESCI,
      desc: "Drogocenne lekcje moralne i duchowe ukryte w najsłynniejszych przypowieściach Chrystusa."
    },
    "madrosciowe-60dni": {
      id: "madrosciowe-60dni",
      name: "Psalmy i Księga Przysłów (60 dni)",
      days: 60,
      cat: "temat",
      catName: "Mądrościowe",
      duration: "60 dni",
      pace: "~3 rozdz./dzień",
      timeEst: "⏱ 10 min",
      plan: _centrGenerujPlanMadrosciowe(60, "Mądrościowe"),
      desc: "Codzienna porcja modlitw, uwielbienia i mądrości życiowej z Psalmów oraz Księgi Przysłów."
    }
  };
  return _centrCachePlanow;
}

function _centrPobierzPlanData(planId){
  planId = planId || _centrAktywnyPlanId || "chrono";
  const map = _centrPobierzWszystkiePlanyDane();
  return map[planId] || map["chrono"];
}

function _centrZnajdzBiezacyDzienPlanu(planId){
  const planInfo = _centrPobierzPlanData(planId);
  const doneSet = _centrPobierzUkonczoneDni(planInfo.id);
  for(let d = 1; d <= planInfo.days; d++){
    if(!doneSet.has(d)) return d;
  }
  return planInfo.days || 1;
}

/* 7. Odczyt i zapis postępu użytkownika */
function _centrPobierzUkonczoneDni(planId){
  planId = planId || _centrAktywnyPlanId || "chrono";
  const klucz = KP + "CentrumDniDone_" + planId;
  const raw = lsGet(klucz, null);
  if(raw) {
    try {
      const arr = JSON.parse(raw);
      if(Array.isArray(arr)) return new Set(arr);
    } catch(e) {}
  }
  return new Set();
}

function _centrZapiszUkonczoneDni(set, planId){
  planId = planId || _centrAktywnyPlanId || "chrono";
  lsSet(KP + "CentrumDniDone_" + planId, JSON.stringify(Array.from(set)));
}

function _centrPobierzUkonczoneFragi(){
  const raw = lsGet(KP + "CentrumFragiDone", null);
  if(raw) {
    try {
      const arr = JSON.parse(raw);
      if(Array.isArray(arr)) return new Set(arr);
    } catch(e) {}
  }
  return new Set();
}

function _centrZapiszUkonczoneFragi(set){
  lsSet(KP + "CentrumFragiDone", JSON.stringify(Array.from(set)));
}

function _centrResetujPostepPlanu(planId){
  planId = planId || _centrAktywnyPlanId || "chrono";
  lsRem(KP + "CentrumDniDone_" + planId);
  const rawFragi = lsGet(KP + "CentrumFragiDone", null);
  if(rawFragi){
    try {
      const arr = JSON.parse(rawFragi);
      if(Array.isArray(arr)){
        const filtered = arr.filter(k => !k.startsWith(planId + "_") && !k.startsWith(planId + ":"));
        lsSet(KP + "CentrumFragiDone", JSON.stringify(filtered));
      }
    } catch(e){}
  }
}

function _centrPobierzTematyStudium(){
  const raw = lsGet(KP + "CentrumTematy", null);
  if(raw) {
    try {
      const parsed = JSON.parse(raw);
      if(Array.isArray(parsed) && parsed.length) return parsed;
    } catch(e) {}
  }
  return [{"id": "wiara-abrahama", "name": "Wiara Abrahama", "color": "#a855f7", "desc": "Przykłady niezłomnego zaufania Jehowie w obliczu najtrudniejszych prób i wielkich obietnic.", "verses": [{"r": "Rodzaju 22:1-19", "t": "Ofiara z Izaaka na górze Moria"}, {"r": "Hebrajczyków 11:17-19", "t": "Wiara, że Bóg może wskrzesić nawet z martwych"}, {"r": "Jakuba 2:21-23", "t": "Wiara poparta uczynkami i miano przyjaciela Boga"}, {"r": "Rzymian 4:1-25", "t": "Usprawiedliwienie z wiary na wzór Abrahama"}, {"r": "Galatów 3:6-9", "t": "Błogosławieństwo wiernego Abrahama dla wszystkich narodów"}, {"r": "Rodzaju 15:1-6", "t": "Obietnica potomstwa licznego jak gwiazdy na niebie"}, {"r": "Rodzaju 12:1-4", "t": "Powołanie i wyruszenie w nieznane z Ur chaldejskiego"}, {"r": "Dzieje 7:2-8", "t": "Mowa Szczepana o powołaniu i drodze wiary Abrahama"}]}, {"id": "milosc-boza", "name": "Miłość Boża", "color": "#f97316", "desc": "Niezrównany wyraz lojalnej miłości i ojcowskiej troski Jehowy o każdego człowieka.", "verses": [{"r": "1 Jana 4:8-19", "t": "Bóg jest miłością i pierwszy nas umiłował"}, {"r": "Jana 3:16", "t": "Dar jednorodzonego Syna za życie świata"}, {"r": "Rzymian 8:38-39", "t": "Nic nie zdoła odłączyć nas od miłości Bożej"}, {"r": "1 Koryntian 13:1-13", "t": "Doskonała droga miłości i jej cechy"}, {"r": "Psalm 103:8-14", "t": "Miłosierny, łaskawy i pamiętający, że jesteśmy prochem"}, {"r": "Sofoniasza 3:17", "t": "Bóg raduje się swoim ludem w miłości"}, {"r": "Efezjan 2:4-5", "t": "Bogactwo miłosierdzia i wielka miłość"}, {"r": "Jeremiasza 31:3", "t": "Odwieczna i niezmienna miłość Jehowy"}, {"r": "Tytusa 3:4-5", "t": "Życzliwość i miłość Boga ku ludziom"}, {"r": "Powtórzonego Prawa 7:7-8", "t": "Wybranie ze względu na miłość i obietnicę"}, {"r": "Lamentacje 3:22-23", "t": "Lojalna miłość Jehowy nigdy nie ustała"}, {"r": "Rzymian 5:8", "t": "Dowód Bożej miłości przez ofiarę Chrystusa"}]}, {"id": "cierpliwosc", "name": "Cierpliwość", "color": "#10b981", "desc": "Cierpliwe czekanie na działanie Jehowy oraz wyrozumiałość i łagodność w kontaktach z ludźmi.", "verses": [{"r": "Jakuba 5:7-11", "t": "Cierpliwość rolnika i wytrwałość Hioba"}, {"r": "Galatów 5:22-23", "t": "Cierpliwość jako drogocenny owoc ducha świętego"}, {"r": "Przysłów 14:29", "t": "Kto nieskory do gniewu, ma obfitość roztropności"}, {"r": "Przysłów 15:18", "t": "Człowiek cierpliwy uśmierza spory"}, {"r": "Kolosan 3:12-13", "t": "Przyodziejcie się w cierpliwość i znoście jedni drugich"}, {"r": "Rzymian 12:12", "t": "W ucisku bądźcie cierpliwi, w modlitwie wytrwali"}, {"r": "1 Koryntian 13:4", "t": "Miłość jest cierpliwa i pełna dobroci"}, {"r": "Hebrajczyków 6:12", "t": "Dziedziczenie obietnic przez wiarę i cierpliwość"}, {"r": "Psalm 37:7", "t": "Milcz przed Jehową i cierpliwie na Niego czekaj"}]}, {"id": "krolestwo-boze", "name": "Królestwo Boże", "color": "#3b82f6", "desc": "Niebiański rząd pod władzą Chrystusa, który przyniesie sprawiedliwość, pokój i usunie wszelkie zło.", "verses": [{"r": "Mateusza 6:9-10", "t": "Modlitwa wzorcowa o przyjście Królestwa"}, {"r": "Mateusza 6:33", "t": "Szukajcie najpierw Królestwa i prawości Bożej"}, {"r": "Daniela 2:44", "t": "Królestwo, które zniszczy wszystkie inne rządy"}, {"r": "Daniela 7:13-14", "t": "Wieczna władza przekazana Synowi Człowieczemu"}, {"r": "Objawienie 11:15", "t": "Panowanie nad światem stało się panowaniem Boga"}, {"r": "Objawienie 21:3-4", "t": "Namiot Boga z ludźmi — koniec łez, śmierci i bólu"}, {"r": "Izajasza 9:6-7", "t": "Książę Pokoju i wieczny wzrost Jego władzy"}, {"r": "Izajasza 11:1-9", "t": "Sprawiedliwe rządy i harmonia na całej ziemi"}, {"r": "Psalm 72:1-19", "t": "Obfite błogosławieństwa panowania Króla"}, {"r": "Łukasza 1:32-33", "t": "Jego królowaniu nie będzie końca"}, {"r": "Mateusza 24:14", "t": "Głoszenie dobrej nowiny o Królestwie po całej ziemi"}, {"r": "1 Koryntian 15:24-28", "t": "Przekazanie Królestwa Bogu Ojcu, aby Bóg był wszystkim dla wszystkich"}, {"r": "Rzymian 14:17", "t": "Prawość, pokój i radość w duchu świętym"}, {"r": "Marka 1:14-15", "t": "Czas się wypełnił i przybliżyło się Królestwo Boże"}, {"r": "Mateusza 13:44-46", "t": "Przypowieść o ukrytym skarbie i drogocennej perle"}]}];
}

function _centrZapiszTematyStudium(arr){
  lsSet(KP + "CentrumTematy", JSON.stringify(arr));
}

function _centrPobierzNotatkiTematu(temat){
  if(!temat || typeof notes === "undefined" || !Array.isArray(notes)) return [];
  const tNorm = (typeof norm === "function") ? norm(temat.name) : (temat.name || "").toLowerCase().trim();
  if(!tNorm) return [];
  const tagMatching = (typeof tags !== "undefined" && Array.isArray(tags))
    ? tags.find(t=> (typeof norm === "function" ? norm(t.name) : (t.name || "").toLowerCase().trim()) === tNorm) : null;
  return notes.filter(n=>{
    if(n.del) return false;
    if(tagMatching && Array.isArray(n.tg) && n.tg.includes(tagMatching.id)) return true;
    if(n.t && norm(n.t).includes(tNorm)) return true;
    const txt = n.c || (n.h ? String(n.h).replace(/<[^>]*>/g," ") : "");
    if(txt && norm(txt).includes(tNorm)) return true;
    return false;
  });
}

function _centrPobierzPlany(){
  const allData = _centrPobierzWszystkiePlanyDane();
  const defKeys = Object.keys(allData);
  const raw = lsGet(KP + "CentrumPlany", null);
  let savedArr = [];
  if(raw) {
    try { savedArr = JSON.parse(raw); } catch(e) {}
  }
  const savedMap = new Map();
  if(Array.isArray(savedArr)) savedArr.forEach(p => savedMap.set(p.id, p));

  return defKeys.map(k => {
    const item = allData[k];
    const s = savedMap.get(item.id) || {};
    return {
      ...item,
      active: s.active !== undefined ? s.active : true,
      done: s.done !== undefined ? s.done : false
    };
  });
}

/* 7b. Pełny eksport i import danych Centrum Studium i Planów czytania do kopii JSON */
function _centrEksportDanych(){
  const dniMap = {};
  try {
    const pref = KP + "CentrumDniDone_";
    if(typeof localStorage !== "undefined"){
      for(let i = 0; i < localStorage.length; i++){
        const k = localStorage.key(i);
        if(k && k.startsWith(pref)){
          const planId = k.substring(pref.length);
          const raw = lsGet(k, null);
          if(raw){
            try {
              const arr = JSON.parse(raw);
              if(Array.isArray(arr) && arr.length) dniMap[planId] = arr;
            }catch(e){}
          }
        }
      }
    }
  } catch(e){}

  ["chrono", "nt", "temat", "canon", "chronoblocks"].forEach(pId => {
    if(!dniMap[pId]){
      const raw = lsGet(KP + "CentrumDniDone_" + pId, null);
      if(raw){
        try {
          const arr = JSON.parse(raw);
          if(Array.isArray(arr) && arr.length) dniMap[pId] = arr;
        }catch(e){}
      }
    }
  });

  let fragiArr = [];
  try {
    const rawFragi = lsGet(KP + "CentrumFragiDone", null);
    if(rawFragi) {
      const parsed = JSON.parse(rawFragi);
      if(Array.isArray(parsed)) fragiArr = parsed;
    }
  } catch(e){}

  let tematyArr = [];
  try {
    const rawTematy = lsGet(KP + "CentrumTematy", null);
    if(rawTematy){
      const parsed = JSON.parse(rawTematy);
      if(Array.isArray(parsed)) tematyArr = parsed;
    }
  } catch(e){}

  let planyArr = [];
  try {
    const rawPlany = lsGet(KP + "CentrumPlany", null);
    if(rawPlany){
      const parsed = JSON.parse(rawPlany);
      if(Array.isArray(parsed)) planyArr = parsed;
    }
  } catch(e){}

  return {
    dni: dniMap,
    fragi: fragiArr,
    tematy: tematyArr,
    plany: planyArr,
    aktywnyPlan: lsGet(KP + "CentrumAktywnyPlan", null),
    curDay: lsGet(KP + "CentrumCurDay", null),
    curTemat: lsGet(KP + "CentrumCurTemat", null),
    layout: (typeof centrUklad === "function" ? centrUklad() : lsGet("jws_centrum_layout_306", null))
  };
}

function _centrImportDanych(centrumData, tryb){
  if(!centrumData || typeof centrumData !== "object") return { dniMerged: 0, fragiMerged: 0, tematyMerged: 0 };
  const st = { dniMerged: 0, fragiMerged: 0, tematyMerged: 0 };
  const isReplace = (tryb === "replace");

  // 1. Ukończone dni w planach czytania
  if(centrumData.dni && typeof centrumData.dni === "object"){
    if(isReplace){
      try {
        const pref = KP + "CentrumDniDone_";
        const doUsuniecia = [];
        if(typeof localStorage !== "undefined"){
          for(let i = 0; i < localStorage.length; i++){
            const k = localStorage.key(i);
            if(k && k.startsWith(pref)) doUsuniecia.push(k);
          }
        }
        doUsuniecia.forEach(k => lsRem(k));
      } catch(e){}
    }

    Object.keys(centrumData.dni).forEach(planId => {
      const incArr = centrumData.dni[planId];
      if(!Array.isArray(incArr)) return;
      if(isReplace){
        lsSet(KP + "CentrumDniDone_" + planId, JSON.stringify(incArr));
        st.dniMerged += incArr.length;
      } else {
        const curSet = _centrPobierzUkonczoneDni(planId);
        const staryRozmiar = curSet.size;
        incArr.forEach(d => {
          const num = Number(d);
          if(!isNaN(num) && num > 0) curSet.add(num);
        });
        _centrZapiszUkonczoneDni(curSet, planId);
        st.dniMerged += (curSet.size - staryRozmiar);
      }
    });
  }

  // 2. Ukończone fragmenty
  if(Array.isArray(centrumData.fragi)){
    if(isReplace){
      lsSet(KP + "CentrumFragiDone", JSON.stringify(centrumData.fragi));
      st.fragiMerged = centrumData.fragi.length;
    } else {
      const curFragi = _centrPobierzUkonczoneFragi();
      const staryRozmiar = curFragi.size;
      centrumData.fragi.forEach(f => { if(f) curFragi.add(String(f)); });
      _centrZapiszUkonczoneFragi(curFragi);
      st.fragiMerged = (curFragi.size - staryRozmiar);
    }
  }

  // 3. Tematy studium
  if(Array.isArray(centrumData.tematy) && centrumData.tematy.length){
    if(isReplace){
      _centrZapiszTematyStudium(centrumData.tematy);
      st.tematyMerged = centrumData.tematy.length;
    } else {
      const curTematy = _centrPobierzTematyStudium();
      let dodano = 0;
      centrumData.tematy.forEach(incT => {
        if(!incT || !incT.name) return;
        const normName = (typeof norm === "function") ? norm(incT.name) : incT.name.toLowerCase();
        const istniejacy = curTematy.find(t => (incT.id && t.id === incT.id) || (((typeof norm === "function") ? norm(t.name) : t.name.toLowerCase()) === normName));
        if(!istniejacy){
          curTematy.push(incT);
          dodano++;
        }
      });
      if(dodano){
        _centrZapiszTematyStudium(curTematy);
        st.tematyMerged = dodano;
      }
    }
  }

  // 4. Plany czytania i konfiguracja
  if(Array.isArray(centrumData.plany) && centrumData.plany.length){
    if(isReplace || !lsGet(KP + "CentrumPlany", null)){
      lsSet(KP + "CentrumPlany", JSON.stringify(centrumData.plany));
    }
  }

  if(isReplace){
    if(centrumData.aktywnyPlan) lsSet(KP + "CentrumAktywnyPlan", centrumData.aktywnyPlan);
    if(centrumData.curDay) lsSet(KP + "CentrumCurDay", String(centrumData.curDay));
    if(centrumData.curTemat) lsSet(KP + "CentrumCurTemat", String(centrumData.curTemat));
  } else {
    if(!lsGet(KP + "CentrumAktywnyPlan", null) && centrumData.aktywnyPlan){
      lsSet(KP + "CentrumAktywnyPlan", centrumData.aktywnyPlan);
    }
  }

  if(centrumData.layout && (isReplace || tryb === "mergeLayout")){
    try {
      if(typeof centrZapiszUklad === "function") centrZapiszUklad(centrumData.layout);
      else lsSet("jws_centrum_layout_306", JSON.stringify(centrumData.layout));
    } catch(e){}
  }

  if(typeof centrumOdswiez === "function") {
    try { centrumOdswiez(); } catch(e){}
  }

  return st;
}

/* 8. Drzewo Wzrostu Duchowego / Czytania (Psalm 1:3) */
function _centrPobierzEtapDrzewa(doneCount, totalDni){
  doneCount = doneCount || 0;
  totalDni = totalDni || 365;
  if(doneCount >= totalDni && totalDni > 0) return { name: "Wspaniałe Drzewo Życia (100%)", short: "Drzewo Życia 🏆", desc: "Ukończyłeś cały plan czytania! Twoje drzewo obficie obrodziło w duchowe owoce." };
  if(doneCount >= 100) return { name: "Dojrzałe Drzewo Oliwne", short: "Dojrzałe Drzewo ⭐", desc: "Głęboko zakorzenione, silne drzewo wydające dojrzałe owoce regularnego czytania Słowa Bożego." };
  if(doneCount >= 30) return { name: "Rozłożyste Drzewko", short: "Rozłożyste Drzewo 🍇", desc: "Drzewo dynamicznie rozrasta się w koronę o gęstym listowiu i silnych gałęziach." };
  if(doneCount >= 14) return { name: "Młode Drzewo Oliwne", short: "Młode Drzewo 🍊", desc: "Wytrwałe pędy rozwijają się w młode drzewko z pierwszymi owocami." };
  if(doneCount >= 7) return { name: "Silny Młody Pęd", short: "Młody Pęd 🍎", desc: "Pierwszy tydzień regularnego czytania przyniósł pierwszy owoc i nowe listki." };
  if(doneCount >= 1) return { name: "Wschodzący Kiełek", short: "Kiełek 🌱", desc: "Zasiane ziarno wykiełkowało nad strumieniem żywej wody." };
  return { name: "Zasiane Ziarno", short: "Zasiane Ziarno 🌱", desc: "Rozpocznij czytanie planu, aby Twoje drzewo zaczęło wzrastać każdego dnia." };
}

function _centrGenerujDrzewoGrowthSvg(totalDni, doneCount, curSer, bestSer, animujNowy){
  totalDni = totalDni || 365;
  doneCount = doneCount || 0;
  curSer = curSer || 0;
  bestSer = bestSer || 0;
  const pct = totalDni > 0 ? (doneCount / totalDni) : 0;

  // Unikalne kotwice liści dla drzewa (naturalne rozłożenie na gałęziach i koronie)
  const leafAnchors = [
    // Szczyt i górna korona
    { x: 240, y: 88, a: -90, s: 0.95 },
    { x: 224, y: 100, a: -125, s: 0.9 },
    { x: 256, y: 100, a: -55, s: 0.9 },
    { x: 208, y: 115, a: -140, s: 0.95 },
    { x: 272, y: 115, a: -40, s: 0.95 },
    { x: 240, y: 120, a: -85, s: 1.0 },
    { x: 195, y: 132, a: -150, s: 0.9 },
    { x: 285, y: 132, a: -30, s: 0.9 },

    // Lewe konary
    { x: 175, y: 152, a: -155, s: 0.95 },
    { x: 155, y: 172, a: -160, s: 1.0 },
    { x: 135, y: 188, a: -165, s: 0.9 },
    { x: 120, y: 205, a: -170, s: 0.85 },
    { x: 145, y: 215, a: -140, s: 0.9 },
    { x: 168, y: 198, a: -130, s: 0.95 },
    { x: 188, y: 178, a: -120, s: 0.9 },
    { x: 210, y: 162, a: -110, s: 0.95 },

    // Prawe konary
    { x: 305, y: 152, a: -25, s: 0.95 },
    { x: 325, y: 172, a: -20, s: 1.0 },
    { x: 345, y: 188, a: -15, s: 0.9 },
    { x: 360, y: 205, a: -10, s: 0.85 },
    { x: 335, y: 215, a: -40, s: 0.9 },
    { x: 312, y: 198, a: -50, s: 0.95 },
    { x: 292, y: 178, a: -60, s: 0.9 },
    { x: 270, y: 162, a: -70, s: 0.95 },

    // Środek i wypełnienie korony
    { x: 228, y: 142, a: -105, s: 0.9 },
    { x: 252, y: 142, a: -75, s: 0.9 },
    { x: 215, y: 175, a: -115, s: 0.95 },
    { x: 265, y: 175, a: -65, s: 0.95 },
    { x: 240, y: 165, a: -90, s: 1.0 },
    { x: 185, y: 140, a: -135, s: 0.85 },
    { x: 295, y: 140, a: -45, s: 0.85 },
    { x: 240, y: 195, a: -90, s: 0.9 }
  ];

  // Owoce Ducha (Galatów 5:22)
  const fruitMilestones = [
    { day: 7, x: 220, y: 130, icon: "❤️", name: "Miłość", color: "#f43f5e" },
    { day: 14, x: 262, y: 135, icon: "🍊", name: "Radość", color: "#fb923c" },
    { day: 30, x: 165, y: 185, icon: "🕊️", name: "Pokój", color: "#38bdf8" },
    { day: 60, x: 315, y: 185, icon: "🫒", name: "Cierpliwość", color: "#a3e635" },
    { day: 90, x: 240, y: 95, icon: "🌾", name: "Życzliwość", color: "#facc15" },
    { day: 120, x: 195, y: 160, icon: "🍯", name: "Dobroć", color: "#f59e0b" },
    { day: 180, x: 285, y: 160, icon: "⭐", name: "Wiara", color: "#ec4899" },
    { day: 270, x: 140, y: 210, icon: "🌿", name: "Łagodność", color: "#34d399" },
    { day: totalDni, x: 240, y: 68, icon: "👑", name: "Drzewo Życia", color: "#fbbf24" }
  ];

  let treeGraphic = '';

  if (doneCount === 0) {
    // ETAP 0: Zasiane Ziarno w żyznej glebie z ciepłym blaskiem
    treeGraphic = '<g>'
      + '<!-- Promienie ciepła nad ziarnem -->'
      + '<circle cx="240" cy="265" r="28" fill="url(#cenSunGlowGrad)" opacity="0.4" />'
      + '<circle cx="240" cy="265" r="14" fill="url(#cenGoldGrad)" opacity="0.6" filter="url(#cenSubtleBlur)" />'
      + '<!-- Złote ziarno -->'
      + '<path d="M 235 267 C 235 261, 240 256, 240 256 C 240 256, 245 261, 245 267 C 245 271, 241 273, 238 273 C 235 273, 235 270, 235 267 Z" fill="url(#cenGoldGrad)" stroke="#b45309" stroke-width="1" />'
      + '<circle cx="238.5" cy="264" r="1.5" fill="#ffffff" opacity="0.9" />'
      + '<!-- Etykieta -->'
      + '<rect x="160" y="210" width="160" height="24" rx="12" fill="rgba(15, 23, 42, 0.75)" stroke="rgba(251, 191, 36, 0.3)" stroke-width="1"/>'
      + '<text x="240" y="226" fill="#fef08a" font-size="11px" font-weight="600" text-anchor="middle" letter-spacing="0.5">Zasiane Ziarno Nadziei 🌱</text>'
      + '</g>';
  } else if (doneCount < 7) {
    // ETAP 1: Wschodzący Kiełek
    const sproutH = Math.min(48, 22 + doneCount * 4.5);
    const topY = 268 - sproutH;
    treeGraphic = '<g>'
      + '<!-- Blask wzrostu -->'
      + '<circle cx="240" cy="' + topY + '" r="25" fill="url(#cenEmeraldGlowGrad)" opacity="0.35" />'
      + '<!-- Główna łodyżka kiełka -->'
      + '<path d="M 240 270 Q 237 ' + (270 - sproutH*0.5) + ', 240 ' + topY + '" stroke="url(#cenSproutGrad)" stroke-width="3.5" stroke-linecap="round" fill="none" />'
      + '<!-- Młode listki oliwne -->'
      + '<path d="M 240 ' + topY + ' C 226 ' + (topY - 10) + ', 218 ' + (topY + 4) + ', 240 ' + (topY + 6) + ' Z" fill="url(#cenLeafGradLight)" stroke="#059669" stroke-width="0.8" />'
      + '<path d="M 240 ' + topY + ' C 254 ' + (topY - 10) + ', 262 ' + (topY + 4) + ', 240 ' + (topY + 6) + ' Z" fill="url(#cenLeafGrad)" stroke="#047857" stroke-width="0.8" />'
      + (doneCount >= 3 ? ('<path d="M 240 ' + (topY + 12) + ' C 228 ' + (topY + 4) + ', 222 ' + (topY + 14) + ', 240 ' + (topY + 16) + ' Z" fill="url(#cenLeafGradLight)" stroke="#059669" stroke-width="0.8" />'
                         + '<path d="M 240 ' + (topY + 12) + ' C 252 ' + (topY + 4) + ', 258 ' + (topY + 14) + ', 240 ' + (topY + 16) + ' Z" fill="url(#cenLeafGrad)" stroke="#047857" stroke-width="0.8" />') : '')
      + '<!-- Kropla rosy na szczycie -->'
      + '<circle cx="240" cy="' + (topY - 1) + '" r="2.2" fill="#e0f2fe" opacity="0.95" filter="url(#cenSubtleBlur)" />'
      + '</g>';
  } else {
    // ETAP 2–5: Piękne, rozłożyste drzewo oliwne / biblijne
    const maturity = Math.min(1.0, doneCount / Math.min(180, totalDni));
    const trunkThickness = 12 + maturity * 14;
    const branchOpacityL1 = Math.min(1.0, (doneCount - 5) / 10);
    const branchOpacitySub = Math.min(1.0, Math.max(0, (doneCount - 20) / 20));

    // 1. Pnie i konary
    let branchesSvg = '<!-- Pień Główny Drzewa Oliwnego -->'
      + '<path d="M ' + (240 - trunkThickness*0.7) + ' 274 C ' + (238 - trunkThickness*0.4) + ' 220, 234 180, 240 135 C 246 180, ' + (242 + trunkThickness*0.4) + ' 220, ' + (240 + trunkThickness*0.7) + ' 274 Z" fill="url(#cenTrunkGrad)" />'
      + '<path d="M ' + (240 - trunkThickness*0.2) + ' 274 C ' + (238 - trunkThickness*0.1) + ' 210, 237 170, 240 135" stroke="#451a03" stroke-width="1.5" fill="none" opacity="0.4" />'
      + '<!-- Korzenie czerpiące ze strumienia -->'
      + '<path d="M ' + (240 - trunkThickness*0.6) + ' 270 Q 210 278, 175 284" stroke="#5c2c10" stroke-width="' + (3 + maturity*2) + '" stroke-linecap="round" fill="none" />'
      + '<path d="M ' + (240 + trunkThickness*0.6) + ' 270 Q 270 278, 305 283" stroke="#5c2c10" stroke-width="' + (3 + maturity*2) + '" stroke-linecap="round" fill="none" />'
      + '<path d="M 238 272 Q 240 286, 242 294" stroke="#451a03" stroke-width="2.5" stroke-linecap="round" fill="none" />';

    // Lewe i prawe konary
    if (doneCount >= 7) {
      branchesSvg += '<!-- Główne konary boczne -->'
        + '<path d="M 238 185 C 205 175, 170 185, 138 200" stroke="url(#cenTrunkGrad)" stroke-width="' + (4 + maturity*3) + '" stroke-linecap="round" fill="none" opacity="' + branchOpacityL1 + '" />'
        + '<path d="M 242 180 C 275 170, 310 180, 342 195" stroke="url(#cenTrunkGrad)" stroke-width="' + (4 + maturity*3) + '" stroke-linecap="round" fill="none" opacity="' + branchOpacityL1 + '" />';
    }
    if (doneCount >= 20) {
      branchesSvg += '<!-- Podkonary i gałązki -->'
        + '<path d="M 175 180 C 160 155, 135 145, 115 140" stroke="url(#cenTrunkGrad)" stroke-width="' + (2.5 + maturity*1.5) + '" stroke-linecap="round" fill="none" opacity="' + branchOpacitySub + '" />'
        + '<path d="M 305 175 C 320 150, 345 140, 365 135" stroke="url(#cenTrunkGrad)" stroke-width="' + (2.5 + maturity*1.5) + '" stroke-linecap="round" fill="none" opacity="' + branchOpacitySub + '" />'
        + '<path d="M 239 140 C 230 115, 215 100, 200 90" stroke="url(#cenTrunkGrad)" stroke-width="3" stroke-linecap="round" fill="none" opacity="' + branchOpacitySub + '" />'
        + '<path d="M 241 140 C 250 115, 265 100, 280 90" stroke="url(#cenTrunkGrad)" stroke-width="3" stroke-linecap="round" fill="none" opacity="' + branchOpacitySub + '" />';
    }

    // 2. Miękka, puszysta korona w tle (Organic Canopy Backdrop)
    const crownScale = Math.min(1.0, 0.4 + maturity * 0.6);
    let softCanopy = '<!-- Subtelna poświata i korona liści w tle -->'
      + '<ellipse cx="240" cy="140" rx="' + (110 * crownScale) + '" ry="' + (75 * crownScale) + '" fill="url(#cenCanopyGradDark)" opacity="0.45" filter="url(#cenCanopyBlur)" />'
      + '<ellipse cx="185" cy="165" rx="' + (75 * crownScale) + '" ry="' + (55 * crownScale) + '" fill="url(#cenCanopyGradMid)" opacity="0.4" filter="url(#cenCanopyBlur)" />'
      + '<ellipse cx="295" cy="160" rx="' + (75 * crownScale) + '" ry="' + (55 * crownScale) + '" fill="url(#cenCanopyGradMid)" opacity="0.4" filter="url(#cenCanopyBlur)" />'
      + '<ellipse cx="240" cy="120" rx="' + (80 * crownScale) + '" ry="' + (50 * crownScale) + '" fill="url(#cenCanopyGradLight)" opacity="0.35" filter="url(#cenCanopyBlur)" />';

    // 3. Dynamiczne pojedyncze liście oliwne
    const activeLeavesCount = Math.min(leafAnchors.length * 2, Math.max(4, Math.floor(doneCount * 1.6) + 2));
    let leavesSvg = '<!-- Eleganckie liście oliwne -->';
    
    for (let i = 0; i < activeLeavesCount; i++) {
      const anchor = leafAnchors[i % leafAnchors.length];
      const isSecondLayer = i >= leafAnchors.length;
      const jitterX = isSecondLayer ? (Math.sin(i * 13) * 14) : 0;
      const jitterY = isSecondLayer ? (Math.cos(i * 17) * 12) : 0;
      const posX = (anchor.x + jitterX).toFixed(1);
      const posY = (anchor.y + jitterY).toFixed(1);
      const rot = (anchor.a + (isSecondLayer ? ((i % 5) * 8 - 16) : 0)).toFixed(1);
      const leafScale = (anchor.s * (isSecondLayer ? 0.85 : 1.0)).toFixed(2);
      const grad = (i % 3 === 0) ? 'url(#cenLeafGradLight)' : ((i % 3 === 1) ? 'url(#cenLeafGrad)' : 'url(#cenLeafGradDeep)');
      const isRecent = animujNowy && (i >= activeLeavesCount - 2);

      leavesSvg += '<g transform="translate(' + posX + ',' + posY + ') rotate(' + rot + ') scale(' + leafScale + ')"' + (isRecent ? ' class="cenDrzewoLeafNew"' : '') + '>'
        + '<path d="M 0 0 C 14 -9, 24 -5, 30 0 C 24 5, 14 9, 0 0 Z" fill="' + grad + '" stroke="#064e3b" stroke-width="0.7" opacity="0.94"/>'
        + '<line x1="0" y1="0" x2="24" y2="0" stroke="#a7f3d0" stroke-width="0.6" opacity="0.75"/>'
        + '</g>';
    }

    // 4. Owoce Ducha (Subtelne ikony w lśniących medalionach)
    let fruitsSvg = '<!-- Owoce Ducha Świętego (Gal 5:22) -->';
    fruitMilestones.forEach(fm => {
      if (doneCount >= fm.day && (fm.day <= totalDni || fm.day <= 365)) {
        fruitsSvg += '<g transform="translate(' + fm.x + ',' + fm.y + ')" class="cenDrzewoFruitGlow">'
          + '<circle cx="0" cy="0" r="10" fill="' + fm.color + '" stroke="#fef08a" stroke-width="1.5" opacity="0.95" />'
          + '<circle cx="-3" cy="-3" r="3" fill="#ffffff" opacity="0.5" />'
          + '<text x="0" y="3.5" text-anchor="middle" font-size="9px">' + fm.icon + '</text>'
          + '</g>';
      }
    });

    treeGraphic = softCanopy + branchesSvg + leavesSvg + fruitsSvg;
  }

  // Opadły liść przy przerwaniu serii
  let fallenLeafSvg = '';
  if (curSer === 0 && doneCount > 0) {
    fallenLeafSvg = '<!-- Opadły liść przypominający o czytaniu -->'
      + '<g transform="translate(195, 276) rotate(25)">'
      + '<path d="M 0 0 C 10 -6, 18 -3, 22 0 C 18 3, 10 6, 0 0 Z" fill="#d97706" stroke="#78350f" stroke-width="0.8" opacity="0.85"/>'
      + '</g>'
      + '<g transform="translate(285, 278) rotate(-18)">'
      + '<path d="M 0 0 C 9 -5, 16 -3, 20 0 C 16 3, 9 5, 0 0 Z" fill="#b45309" stroke="#78350f" stroke-width="0.8" opacity="0.75"/>'
      + '</g>';
  }

  return '<svg viewBox="0 0 480 340" class="cenDrzewoSvg">'
    + '<defs>'
    + '<!-- Subtelne gradienty nieba, wody i liści -->'
    + '<linearGradient id="cenSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">'
    + '<stop offset="0%" stop-color="#09111e"/>'
    + '<stop offset="40%" stop-color="#0f2027"/>'
    + '<stop offset="80%" stop-color="#163832"/>'
    + '<stop offset="100%" stop-color="#1b4332"/>'
    + '</linearGradient>'
    + '<radialGradient id="cenSunGlowGrad" cx="50%" cy="50%" r="50%">'
    + '<stop offset="0%" stop-color="#fef08a" stop-opacity="0.55"/>'
    + '<stop offset="50%" stop-color="#f59e0b" stop-opacity="0.2"/>'
    + '<stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>'
    + '</radialGradient>'
    + '<radialGradient id="cenGoldGrad" cx="30%" cy="30%" r="70%">'
    + '<stop offset="0%" stop-color="#fef08a"/>'
    + '<stop offset="60%" stop-color="#f59e0b"/>'
    + '<stop offset="100%" stop-color="#b45309"/>'
    + '</radialGradient>'
    + '<linearGradient id="cenTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">'
    + '<stop offset="0%" stop-color="#3e1c08"/>'
    + '<stop offset="35%" stop-color="#6e3512"/>'
    + '<stop offset="70%" stop-color="#8a4419"/>'
    + '<stop offset="100%" stop-color="#451a03"/>'
    + '</linearGradient>'
    + '<linearGradient id="cenLeafGradLight" x1="0%" y1="0%" x2="100%" y2="100%">'
    + '<stop offset="0%" stop-color="#6ee7b7"/>'
    + '<stop offset="100%" stop-color="#10b981"/>'
    + '</linearGradient>'
    + '<linearGradient id="cenLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">'
    + '<stop offset="0%" stop-color="#34d399"/>'
    + '<stop offset="100%" stop-color="#059669"/>'
    + '</linearGradient>'
    + '<linearGradient id="cenLeafGradDeep" x1="0%" y1="0%" x2="100%" y2="100%">'
    + '<stop offset="0%" stop-color="#10b981"/>'
    + '<stop offset="100%" stop-color="#047857"/>'
    + '</linearGradient>'
    + '<linearGradient id="cenSproutGrad" x1="0%" y1="100%" x2="0%" y2="0%">'
    + '<stop offset="0%" stop-color="#047857"/>'
    + '<stop offset="100%" stop-color="#6ee7b7"/>'
    + '</linearGradient>'
    + '<radialGradient id="cenEmeraldGlowGrad" cx="50%" cy="50%" r="50%">'
    + '<stop offset="0%" stop-color="#6ee7b7" stop-opacity="0.6"/>'
    + '<stop offset="100%" stop-color="#059669" stop-opacity="0"/>'
    + '</radialGradient>'
    + '<radialGradient id="cenCanopyGradDark" cx="50%" cy="50%" r="50%">'
    + '<stop offset="0%" stop-color="#064e3b" stop-opacity="0.9"/>'
    + '<stop offset="100%" stop-color="#064e3b" stop-opacity="0"/>'
    + '</radialGradient>'
    + '<radialGradient id="cenCanopyGradMid" cx="50%" cy="50%" r="50%">'
    + '<stop offset="0%" stop-color="#047857" stop-opacity="0.85"/>'
    + '<stop offset="100%" stop-color="#047857" stop-opacity="0"/>'
    + '</radialGradient>'
    + '<radialGradient id="cenCanopyGradLight" cx="50%" cy="50%" r="50%">'
    + '<stop offset="0%" stop-color="#10b981" stop-opacity="0.75"/>'
    + '<stop offset="100%" stop-color="#10b981" stop-opacity="0"/>'
    + '</radialGradient>'
    + '<linearGradient id="cenWaterFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">'
    + '<stop offset="0%" stop-color="#0284c7" stop-opacity="0.7"/>'
    + '<stop offset="35%" stop-color="#38bdf8" stop-opacity="0.95"/>'
    + '<stop offset="70%" stop-color="#0ea5e9" stop-opacity="0.8"/>'
    + '<stop offset="100%" stop-color="#0369a1" stop-opacity="0.7"/>'
    + '</linearGradient>'
    + '<linearGradient id="cenWaterSurfaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">'
    + '<stop offset="0%" stop-color="#7dd3fc" stop-opacity="0.9"/>'
    + '<stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>'
    + '</linearGradient>'
    + '<linearGradient id="cenGroundHillGrad" x1="0%" y1="0%" x2="0%" y2="100%">'
    + '<stop offset="0%" stop-color="#065f46"/>'
    + '<stop offset="60%" stop-color="#044734"/>'
    + '<stop offset="100%" stop-color="#022c22"/>'
    + '</linearGradient>'
    + '<filter id="cenSubtleBlur">'
    + '<feGaussianBlur stdDeviation="1.5" />'
    + '</filter>'
    + '<filter id="cenCanopyBlur">'
    + '<feGaussianBlur stdDeviation="8" />'
    + '</filter>'
    + '</defs>'

    + '<!-- 1. Tło: Spokojne Niebo o poranku z delikatnymi promieniami -->'
    + '<rect width="480" height="270" fill="url(#cenSkyGrad)"/>'
    + '<!-- Poranne słońce / Blask Ducha Świętego -->'
    + '<circle cx="65" cy="55" r="45" fill="url(#cenSunGlowGrad)" />'
    + '<circle cx="65" cy="55" r="16" fill="#fef08a" opacity="0.85" filter="url(#cenSubtleBlur)" />'
    + '<circle cx="65" cy="55" r="7" fill="#ffffff" opacity="0.95" />'

    + '<!-- 2. Wzgórza w oddali (Galilea / Judea) -->'
    + '<path d="M 0 240 Q 90 205, 190 235 T 390 225 T 480 238 L 480 270 L 0 270 Z" fill="#0d2b26" opacity="0.65" />'
    + '<path d="M 0 252 Q 130 228, 260 250 T 480 245 L 480 270 L 0 270 Z" fill="#0b382f" opacity="0.85" />'

    + '<!-- 3. Żyzny pagórek nad wodami (Psalm 1:3) -->'
    + '<path d="M 40 272 Q 240 242, 440 272 L 480 282 L 0 282 Z" fill="url(#cenGroundHillGrad)" />'
    + '<!-- Kępki traw i polne kwiaty -->'
    + '<path d="M 120 262 Q 123 254, 126 263 M 124 262 Q 127 252, 130 263" stroke="#34d399" stroke-width="1.5" stroke-linecap="round" fill="none" />'
    + '<path d="M 350 263 Q 353 255, 356 264 M 354 263 Q 357 253, 360 264" stroke="#34d399" stroke-width="1.5" stroke-linecap="round" fill="none" />'
    + '<circle cx="145" cy="263" r="2" fill="#f43f5e" opacity="0.9" />'
    + '<circle cx="330" cy="264" r="2" fill="#facc15" opacity="0.9" />'
    + '<circle cx="290" cy="267" r="2" fill="#38bdf8" opacity="0.9" />'

    + '<!-- 4. Drzewo z łagodną animacją kołysania (cenDrzewoSway) -->'
    + '<g class="cenDrzewoSway">'
    + treeGraphic
    + '</g>'

    + fallenLeafSvg

    + '<!-- 5. Strumień żywej wody (Psalm 1:3) -->'
    + '<g transform="translate(0, 272)">'
    + '<!-- Baza koryta rzeki -->'
    + '<rect x="0" y="0" width="480" height="68" fill="#02496d" />'
    + '<!-- Płynąca woda z falami -->'
    + '<path d="M 0 10 Q 120 2, 240 10 T 480 8 L 480 68 L 0 68 Z" fill="url(#cenWaterFlowGrad)">'
    + '<animate attributeName="d" '
    + '  values="M 0 10 Q 120 2, 240 10 T 480 8 L 480 68 L 0 68 Z;'
    + '          M 0 8 Q 120 16, 240 8 T 480 10 L 480 68 L 0 68 Z;'
    + '          M 0 10 Q 120 2, 240 10 T 480 8 L 480 68 L 0 68 Z" '
    + '  dur="6s" repeatCount="indefinite" />'
    + '</path>'
    + '<path d="M 0 0 L 480 0 L 480 8 L 0 8 Z" fill="url(#cenWaterSurfaceGrad)" />'
    + '<!-- Błyski światła na wodzie -->'
    + '<ellipse cx="110" cy="18" rx="22" ry="2.5" fill="#ffffff" opacity="0.35" />'
    + '<ellipse cx="280" cy="26" rx="35" ry="3" fill="#e0f2fe" opacity="0.4" />'
    + '<ellipse cx="390" cy="16" rx="18" ry="2" fill="#ffffff" opacity="0.3" />'
    + '</g>'
    + '</svg>';
}

function _centrWidokDrzewoWzrostu(planInfo, dniDone, curSer, bestSer){
  const totalDni = planInfo.days || 365;
  const doneCount = dniDone.size;
  const pctNum = totalDni > 0 ? (doneCount / totalDni) * 100 : 0;
  const pctStr = pctNum.toFixed(1).replace(".", ",");
  const etap = _centrPobierzEtapDrzewa(doneCount, totalDni);

  const spiritualFruits = [
    { day: 7, name: "Miłość", icon: "❤️", desc: "1. tydzień czytania (Gal 5:22) — fundament duchowego wzrostu" },
    { day: 14, name: "Radość", icon: "🍊", desc: "2 tygodnie w Słowie Bożym — serce napełnione wdzięcznością" },
    { day: 30, name: "Pokój", icon: "🕊️", desc: "1 miesiąc regularności — wewnętrzny spokój ze studium Biblii" },
    { day: 60, name: "Cierpliwość", icon: "🫒", desc: "2 miesiące wytrwałości — budowanie stałego nawyku" },
    { day: 90, name: "Życzliwość", icon: "🌾", desc: "1. kwartał planu — dobre serce i chęć dzielenia się wiarą" },
    { day: 120, name: "Dobroć", icon: "🍯", desc: "4 miesiące w Piśmie Świętym — prawe postępowanie na co dzień" },
    { day: 180, name: "Wiara", icon: "⭐", desc: "Pół roku regularnego czytania — niezłomne zaufanie do Jehowy" },
    { day: 270, name: "Łagodność", icon: "🌿", desc: "9 miesięcy studium — mądrość, wyrozumiałość i pokora" },
    { day: totalDni, name: "Drzewo Życia / Opanowanie", icon: "👑", desc: "Ukończony cały plan biblijny — wspaniały duchowy triumf!" }
  ];

  const unlockedFruitsCount = spiritualFruits.filter(f => doneCount >= f.day).length;
  const activeLeavesCount = doneCount > 0 ? Math.min(64, Math.max(2, Math.floor(doneCount * 1.5) + 1)) : 0;

  const nextFruit = spiritualFruits.find(f => doneCount < f.day);
  let nextStageText = "Osiągnięto wszystkie kamienie milowe planu!";
  if(nextFruit){
    const left = nextFruit.day - doneCount;
    nextStageText = "Kolejny owoc: <b>" + nextFruit.name + " " + nextFruit.icon + "</b> za <b>" + left + (left === 1 ? " dzień" : " dni") + "</b> czytania.";
  }

  const svgTree = _centrGenerujDrzewoGrowthSvg(totalDni, doneCount, curSer, bestSer, false);

  let fruitsHtml = '';
  spiritualFruits.forEach(f => {
    const isUnlocked = doneCount >= f.day;
    fruitsHtml += '<div class="cenFruitItem ' + (isUnlocked ? 'unlocked' : 'locked') + '">'
      + '<div class="cenFruitIko">' + f.icon + '</div>'
      + '<div class="cenFruitInfo">'
      + '<div class="cenFruitName">'
      + '<span>' + esc(f.name) + '</span>'
      + '<span class="cenFruitBadge ' + (isUnlocked ? 'unlocked' : 'locked') + '">' + (isUnlocked ? 'Zdobyto' : ('Dzień ' + f.day)) + '</span>'
      + '</div>'
      + '<div class="cenFruitDesc">' + esc(f.desc) + '</div>'
      + '</div>'
      + '</div>';
  });

  return '<div class="cenDrzewoCard">'
    + '<div class="cenDrzewoCytatBox">'
    + '„Będzie on jak drzewo zasadzone nad strumieniami wód, które wydaje owoc we właściwym czasie i którego liście nie więdną...” — <b>Psalm 1:3</b>'
    + '</div>'
    + '<div class="cenDrzewoHeaderRow">'
    + '<div>'
    + '<span class="cenHeroTag" style="margin-bottom:4px;">Etap rozwoju</span>'
    + '<div style="font-size:18px;font-weight:700;color:var(--cen-text);">' + esc(etap.name) + '</div>'
    + '<div style="font-size:13px;color:var(--cen-text-muted);margin-top:2px;">' + esc(etap.desc) + '</div>'
    + '</div>'
    + '<div class="cenDrzewoEtapBadge">' + etap.short + '</div>'
    + '</div>'

    + '<div class="cenDrzewoStage">'
    + svgTree
    + '</div>'

    + '<div style="background:var(--cen-row-bg, rgba(0,0,0,0.03));border:1px solid var(--cen-card-border);border-radius:14px;padding:12px 16px;margin-bottom:8px;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;margin-bottom:6px;">'
    + '<span style="color:var(--cen-text);font-weight:600;">' + nextStageText + '</span>'
    + '<span style="color:var(--cen-text-muted);font-weight:600;">' + doneCount + ' / ' + totalDni + ' dni (' + pctStr + '%)</span>'
    + '</div>'
    + '<div class="cenProgressBar"><div class="cenProgressFill" style="width:' + Math.min(100, Math.max(doneCount>0?3:0, pctNum)) + '%;background:#10b981;"></div></div>'
    + '</div>'

    + '<div class="cenDrzewoStatsBar">'
    + '<div class="cenDrzewoStatBox"><div class="cenDrzewoStatBoxLbl">Ukończone dni</div><div class="cenDrzewoStatBoxVal" style="color:#10b981;">' + doneCount + ' / ' + totalDni + '</div></div>'
    + '<div class="cenDrzewoStatBox"><div class="cenDrzewoStatBoxLbl">Zielone liście</div><div class="cenDrzewoStatBoxVal" style="color:#34d399;">' + activeLeavesCount + ' liści 🌿</div></div>'
    + '<div class="cenDrzewoStatBox"><div class="cenDrzewoStatBoxLbl">Owoce Ducha</div><div class="cenDrzewoStatBoxVal" style="color:#f59e0b;">' + unlockedFruitsCount + ' / ' + spiritualFruits.length + ' 🍎</div></div>'
    + '<div class="cenDrzewoStatBox"><div class="cenDrzewoStatBoxLbl">Obecna seria</div><div class="cenDrzewoStatBoxVal" style="color:#fb923c;">' + (curSer > 0 ? (curSer + ' dni 🔥') : 'Dziś') + '</div></div>'
    + '<div class="cenDrzewoStatBox"><div class="cenDrzewoStatBoxLbl">Najdłuższa seria</div><div class="cenDrzewoStatBoxVal" style="color:#6366f1;">' + (bestSer > 0 ? (bestSer + ' dni 🏆') : '—') + '</div></div>'
    + '</div>'
    + '</div>'

    + '<div style="margin-top:24px;">'
    + '<div class="cenSecHeadTyt" style="display:flex;align-items:center;justify-content:space-between;">'
    + '<span>🍎 Owoce Ducha & Kamienie Milowe</span>'
    + '<span style="font-size:12px;font-weight:500;color:var(--cen-text-muted);">Galatów 5:22-23</span>'
    + '</div>'
    + '<div class="cenFruitGrid">'
    + fruitsHtml
    + '</div>'
    + '</div>';
}

const CEN_MODERN_ICO = {
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><polyline points="20 6 9 17 4 12"/></svg>',
  sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>',
  jw: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>'
};

/* 1. GŁÓWNY WIDOK CENTRUM (DASHBOARD) */
function renderCentrumWidok(){
  const curPlan = _centrPobierzPlanData(_centrAktywnyPlanId);
  const dniDone = _centrPobierzUkonczoneDni(curPlan.id);
  const totalDni = curPlan.days;
  const doneCount = dniDone.size;
  const pctNum = totalDni > 0 ? (doneCount / totalDni) * 100 : 0;
  const pct = pctNum.toFixed(1).replace(".", ",");
  const curDzien = _centrZnajdzBiezacyDzienPlanu(curPlan.id);
  const planList = curPlan.plan || [];
  const planDzis = planList.find(x => x.d === curDzien) || planList[0] || { d: 1, t: "Czytanie biblijne", f: [] };

  const tematy = _centrPobierzTematyStudium();
  const tCount = tematy.length;
  const plany = _centrPobierzPlany();
  const aktywnePlany = plany.filter(p=>p.active).length;

  return '<div class="cenHeroGrid">'
    // Karta 1: Aktywny plan czytania
    + '<div class="cenHeroCard card-blue" data-cwidok="czytanie-chronologiczne">'
    + '<div class="cenHeroCardTop">'
    + '<div class="cenHeroIkoBox">' + CEN_MODERN_ICO.book + '</div>'
    + '<div class="cenHeroInfo">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">'
    + '<span class="cenHeroTag">' + esc(curPlan.catName || "Plan") + ' • ' + esc(curPlan.duration || (curPlan.days + ' dni')) + '</span>'
    + '<button type="button" class="cenHeroChangePlanBtn" data-cwidok="moje-plany" title="Zmień aktywny plan czytania">Zmień plan ▾</button>'
    + '</div>'
    + '<div class="cenHeroTyt">' + esc(curPlan.name) + '</div>'
    + '<div class="cenHeroOpis">' + esc(curPlan.desc) + '</div>'
    + '</div></div>'
    + '<div class="cenHeroBottom">'
    + '<div class="cenHeroMetaRow">'
    + '<span class="cenHeroMetaLabel">Postęp planu</span>'
    + '<span class="cenHeroMetaVal"><b>' + doneCount + ' / ' + totalDni + ' dni</b> <span style="color:var(--cen-text-muted);font-weight:400;margin-left:4px;">' + pct + '%</span></span>'
    + '</div>'
    + '<div class="cenProgressBar"><div class="cenProgressFill" style="width:' + Math.min(100, Math.max(doneCount>0?3:0, pctNum)) + '%;"></div></div>'
    + '</div></div>'

    // Karta 2: Studium osobiste
    + '<div class="cenHeroCard card-green" data-cwidok="studium-osobiste">'
    + '<div class="cenHeroCardTop">'
    + '<div class="cenHeroIkoBox">' + CEN_MODERN_ICO.note + '</div>'
    + '<div class="cenHeroInfo">'
    + '<div class="cenHeroTyt">Studium osobiste</div>'
    + '<div class="cenHeroOpis">Prowadź tematyczne badania biblijne, gromadź wersety i własne przemyślenia.</div>'
    + '</div></div>'
    + '<div class="cenHeroBottom">'
    + '<div class="cenHeroMetaRow">'
    + '<span class="cenHeroMetaLabel">Aktywne tematy</span>'
    + '<span class="cenHeroMetaVal val-green">' + tCount + ' tematów studium</span>'
    + '</div></div></div>'

    // Karta 3: Wybór i zarządzanie planami
    + '<div class="cenHeroCard card-purple" data-cwidok="moje-plany">'
    + '<div class="cenHeroCardTop">'
    + '<div class="cenHeroIkoBox">' + CEN_MODERN_ICO.clipboard + '</div>'
    + '<div class="cenHeroInfo">'
    + '<div class="cenHeroTyt">Plany czytania Biblii</div>'
    + '<div class="cenHeroOpis">Wybieraj plany na 1, 2 lub 3 lata (chronologicznie, po kolei księgami lub zbalansowane).</div>'
    + '</div></div>'
    + '<div class="cenHeroBottom">'
    + '<div class="cenHeroMetaRow">'
    + '<span class="cenHeroMetaLabel">Dostępne plany</span>'
    + '<span class="cenHeroMetaVal val-purple">' + plany.length + ' gotowych planów</span>'
    + '</div></div></div>'

    // Karta 4: Statystyki i cele
    + '<div class="cenHeroCard card-orange" data-cwidok="statystyki">'
    + '<div class="cenHeroCardTop">'
    + '<div class="cenHeroIkoBox">' + CEN_MODERN_ICO.target + '</div>'
    + '<div class="cenHeroInfo">'
    + '<div class="cenHeroTyt">Cele i Statystyki</div>'
    + '<div class="cenHeroOpis">Śledź tempo czytania, ukończone fragmenty, serie dni i stopień realizacji celów.</div>'
    + '</div></div>'
    + '<div class="cenHeroBottom">'
    + '<div class="cenHeroMetaRow">'
    + '<span class="cenHeroMetaLabel">Bieżący status</span>'
    + '<span class="cenHeroMetaVal val-orange">' + doneCount + ' dni ukończonych</span>'
    + '</div></div></div>'
    + '</div>'

    // BANNER: DZISIEJSZE ZADANIE
    + '<div class="cenZadanieCard">'
    + '<div class="cenZadanieLewo">'
    + '<div class="cenZadanieIko">' + CEN_MODERN_ICO.book + '</div>'
    + '<div>'
    + '<div class="cenZadanieTyt">' + esc(curPlan.name) + ' — Dzień ' + curDzien + '</div>'
    + '<div class="cenZadaniePodtyt">' + (planDzis.f ? planDzis.f.length : 0) + ' fragmenty • ' + esc(planDzis.t) + '</div>'
    + '</div></div>'
    + '<div style="display:flex;align-items:center;gap:8px;">'
    + '<button type="button" class="cenZadanieBtn" data-cwidok="dzien" data-cdzien="' + curDzien + '">Czytaj dzisiaj ' + CEN_MODERN_ICO.chevron + '</button>'
    + '</div></div>'

    // BANNER: CECHY I MOŻLIWOŚCI
    + '<div class="cenFeaturesBanner">'
    + '<div class="cenFeatureItem">'
    + '<div class="cenFeatureIko">' + CEN_MODERN_ICO.jw + '</div>'
    + '<div class="cenFeatureTxt"><b>Otwórz w JW Library</b><span>Szybkie otwieranie wersetów bezpośrednio w aplikacji</span></div>'
    + '</div>'
    + '<div class="cenFeatureItem">'
    + '<div class="cenFeatureIko">' + CEN_MODERN_ICO.note + '</div>'
    + '<div class="cenFeatureTxt"><b>Dodawaj notatki</b><span>Zapisuj ważne spostrzeżenia do wybranego fragmentu</span></div>'
    + '</div>'
    + '<div class="cenFeatureItem">'
    + '<div class="cenFeatureIko">' + CEN_MODERN_ICO.clipboard + '</div>'
    + '<div class="cenFeatureTxt"><b>Własne tempo</b><span>Wybieraj między 1, 2 a 3 latami czytania</span></div>'
    + '</div>'
    + '<div class="cenFeatureItem">'
    + '<div class="cenFeatureIko">' + CEN_MODERN_ICO.sync + '</div>'
    + '<div class="cenFeatureTxt"><b>Zapisywanie postępu</b><span>Twój stan czytania jest zawsze automatycznie zapisywany</span></div>'
    + '</div>'
    + '</div>';
}

/* 2. CZYTANIE AKTYWNEGO PLANU BIBLIJNEGO */
function centrWidokCzytanieChrono(){
  const planInfo = _centrPobierzPlanData(_centrAktywnyPlanId);
  const dniDone = _centrPobierzUkonczoneDni(planInfo.id);
  const totalDni = planInfo.days;
  const planList = planInfo.plan || [];
  const curDzien = Math.min(totalDni, _centrWybranyDzien || _centrZnajdzBiezacyDzienPlanu(planInfo.id));
  const planDzis = planList.find(x=>x.d===curDzien) || planList[0] || { d: 1, t: "Czytanie biblijne", f: [] };
  const doneCount = dniDone.size;
  const pctNum = totalDni > 0 ? (doneCount / totalDni) * 100 : 0;
  const pct = pctNum.toFixed(1).replace(".", ",");
  const nastDni = planList.filter(x=>x.d > curDzien && x.d <= curDzien + 3);

  return '<div class="cenSubHeader">'
    + '<div class="cenSubHeaderLewo">'
    + '<button type="button" class="cenSubWsteczBtn" data-cwidok="centrum">' + CEN_MODERN_ICO.chevronLeft + ' <span>Centrum</span></button>'
    + '<div class="cenSubTytulBox">'
    + '<div class="cenSubTytul">Plan czytania Biblii</div>'
    + '<div class="cenSubPodtytul">' + esc(planInfo.name) + ' • ' + esc(planInfo.duration || (planInfo.days + ' dni')) + '</div>'
    + '</div></div>'
    + '<div style="display:flex;align-items:center;gap:8px;">'
    + '<button type="button" class="cenHeroChangePlanBtn" data-cwidok="moje-plany" title="Przełącz plan czytania">Zmień plan (' + esc(planInfo.duration || (planInfo.days + ' dni')) + ') ▾</button>'
    + '<button type="button" class="cenNaglBtnIko" data-cakcja="ustawienia-planu" title="Wybór i ustawienia planów">' + CEN_MODERN_ICO.gear + '</button>'
    + '</div></div>'

    + '<div class="cenHeroCard card-blue" style="margin-bottom:20px;cursor:default;">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;flex-wrap:wrap;">'
    + '<div>'
    + '<span class="cenHeroTag">' + esc(planInfo.catName || "Plan") + ' • ' + esc(planInfo.duration || (planInfo.days + ' dni')) + '</span>'
    + '<div class="cenHeroTyt" style="font-size:18px;margin-top:2px;">' + esc(planInfo.name) + '</div>'
    + '<div class="cenHeroOpis" style="font-size:13px;">' + esc(planInfo.desc) + '</div>'
    + '</div>'
    + '<button type="button" class="cenMiniDrzewoBadge" data-cwidok="statystyki" data-cstat-tab="drzewo" title="Zobacz swoje Drzewo Wzrostu Duchowego">'
    + '🌱 Drzewo wzrostu (' + doneCount + ' dni)'
    + '</button>'
    + '</div>'

    + '<div class="cenHeroMetaRow" style="margin-top:10px;">'
    + '<span class="cenHeroMetaLabel">Postęp czytania</span>'
    + '<span class="cenHeroMetaVal"><b>' + doneCount + ' / ' + totalDni + ' dni</b> <span style="color:var(--cen-text-muted);font-weight:400;margin-left:4px;">(' + pct + '%)</span></span>'
    + '</div>'
    + '<div class="cenProgressBar"><div class="cenProgressFill" style="width:' + Math.min(100, Math.max(doneCount>0?3:0, pctNum)) + '%;"></div></div>'

    + '<div class="cenPlanStatsGrid">'
    + '<div class="cenPlanStatTile"><div class="cenPlanStatVal">' + doneCount + '</div><div class="cenPlanStatLbl">Ukończono dni</div></div>'
    + '<div class="cenPlanStatTile"><div class="cenPlanStatVal">' + (totalDni - doneCount) + '</div><div class="cenPlanStatLbl">Pozostało dni</div></div>'
    + '<div class="cenPlanStatTile"><div class="cenPlanStatVal">' + (planInfo.pace || "~1 rozdz./dzień") + '</div><div class="cenPlanStatLbl">Średnie tempo</div></div>'
    + '</div></div>'

    + '<div class="cenChronoAkcjeRow">'
    + '<button type="button" class="cenChronoAkcjaBtn" data-cwidok="kalendarz">' + CEN_MODERN_ICO.calendar + '<span>Kalendarz</span></button>'
    + '<button type="button" class="cenChronoAkcjaBtn" data-cwidok="lista-dni">' + CEN_MODERN_ICO.list + '<span>Lista dni</span></button>'
    + '<button type="button" class="cenChronoAkcjaBtn" data-cwidok="statystyki">' + CEN_MODERN_ICO.chart + '<span>Statystyki</span></button>'
    + '<button type="button" class="cenChronoAkcjaBtn" data-cwidok="statystyki" data-cstat-tab="drzewo">🌱 <span>Drzewo</span></button>'
    + '<button type="button" class="cenChronoAkcjaBtn" data-cwidok="moje-plany">' + CEN_MODERN_ICO.clipboard + '<span>Zmień plan</span></button>'
    + '</div>'

    + '<div style="margin-bottom:20px;">'
    + '<div class="cenSecHeadTyt">Czytanie na dziś</div>'
    + '<div class="cenZadanieCard" style="margin-bottom:0;">'
    + '<div class="cenZadanieLewo">'
    + '<div class="cenZadanieIko">' + CEN_MODERN_ICO.book + '</div>'
    + '<div>'
    + '<div class="cenZadanieTyt">Dzień ' + curDzien + '</div>'
    + '<div class="cenZadaniePodtyt">' + (planDzis.f ? planDzis.f.length : 0) + ' fragmenty • ' + esc(planDzis.t) + '</div>'
    + '</div></div>'
    + '<button type="button" class="cenZadanieBtn" data-cwidok="dzien" data-cdzien="' + curDzien + '">Otwórz dzień ' + CEN_MODERN_ICO.chevron + '</button>'
    + '</div></div>'

    + '<div>'
    + '<div class="cenSecHeadTyt">Następne dni</div>'
    + (!nastDni.length ? '<div class="cenPusto">Dotarłeś do końca planu lub to ostatni dzień! Gratulacje!</div>' : '')
    + nastDni.map(nd=>'<div class="cenRowItem" data-cwidok="dzien" data-cdzien="'+nd.d+'">'
      + '<div class="cenRowLewo">'
      + '<div><div class="cenRowTyt">Dzień '+nd.d+'</div><div class="cenRowPodtyt">'+nd.f.length+' fragmenty • '+esc(nd.t)+'</div></div>'
      + '</div>'
      + '<span class="cenPozStrz">'+CEN_MODERN_ICO.chevron+'</span>'
      + '</div>').join('')
    + '</div>';
}

/* 3. EKRAN KONKRETNEGO DNIA */
function centrWidokDzien(dNr){
  const planInfo = _centrPobierzPlanData(_centrAktywnyPlanId);
  const planList = planInfo.plan || [];
  dNr = Math.min(planInfo.days, dNr || _centrWybranyDzien || 1);
  _centrWybranyDzien = dNr;
  const plan = planList.find(x=>x.d===dNr) || planList[0] || { d: 1, t: "Czytanie biblijne", f: [] };
  const fragiDone = _centrPobierzUkonczoneFragi();
  const dniDone = _centrPobierzUkonczoneDni(planInfo.id);
  const jestDzienUkonczony = dniDone.has(dNr);

  return '<div class="cenSubHeader">'
    + '<div class="cenSubHeaderLewo">'
    + '<button type="button" class="cenSubWsteczBtn" data-cwidok="czytanie-chronologiczne">' + CEN_MODERN_ICO.chevronLeft + ' <span>Plan czytania</span></button>'
    + '<div class="cenSubTytulBox">'
    + '<div class="cenSubTytul">Dzień ' + dNr + ' <span style="font-weight:400;opacity:0.75;font-size:0.9em;">(' + esc(planInfo.name) + ')</span></div>'
    + '<div class="cenSubPodtytul">' + (plan.f ? plan.f.length : 0) + ' fragmenty • ' + esc(plan.t) + '</div>'
    + '</div></div>'
    + '<div class="cenNaglAkcje">'
    + '<button type="button" class="cenNaglBtnIko" data-cakcja="notatka-dnia" title="Dodaj notatkę">' + CEN_MODERN_ICO.note + '</button>'
    + '</div></div>'

    + '<div style="margin-bottom:18px;">'
    + '<div class="cenSecHeadTyt" style="margin-bottom:4px;">Fragmenty do przeczytania</div>'
    + '<div style="font-size:13px;color:var(--cen-text-muted);">' + (plan.f ? plan.f.length : 0) + ' fragmenty • ' + esc(plan.t) + '</div>'
    + '</div>'

    + '<div class="cenFragiLista">'
    + (plan.f || []).map((frag, idx)=>{
        const key = planInfo.id + "_" + dNr + "_" + idx;
        const checked = fragiDone.has(key) || jestDzienUkonczony;
        return '<div class="cenFragCard' + (checked ? ' done' : '') + '">'
          + '<div class="cenFragLewo">'
          + '<div class="cenFragCheck' + (checked ? ' checked' : '') + '" data-cfrag-toggle="' + key + '">'
          + (checked ? CEN_MODERN_ICO.check : '')
          + '</div>'
          + '<div>'
          + '<div class="cenFragWerset">' + esc(frag.r) + '</div>'
          + '<div class="cenFragTemat">' + esc(frag.t) + '</div>'
          + '</div></div>'
          + '<div class="cenFragPrawo">'
          + '<button type="button" class="cenFragBtnJW" data-copen-jw="' + esc(frag.r) + '" title="Otwórz fragment">' + CEN_MODERN_ICO.jw + ' Otwórz w JW Library</button>'
          + '<button type="button" class="cenNaglBtnIko" data-cnotatka-werset="' + esc(frag.r) + '" title="Dodaj notatkę do wersetu">' + CEN_MODERN_ICO.note + '</button>'
          + '</div>'
          + '</div>';
      }).join('')
    + '</div>'

    + '<div class="cenDzienUkonczWrap">'
    + '<button type="button" class="cenDzienUkonczBtn' + (jestDzienUkonczony ? ' done' : '') + '" data-cdzien-ukoncz="' + dNr + '">'
    + CEN_MODERN_ICO.check + ' ' + (jestDzienUkonczony ? 'Dzień oznaczony jako ukończony (Kliknij, aby odznaczyć)' : 'Ukończyłem dzisiejsze czytanie')
    + '</button>'
    + '</div>';
}

/* 4. LISTA DNI */
function centrWidokListaDni(filtr, szukaj){
  filtr = filtr || _centrListaTab || "wszystkie";
  szukaj = (szukaj != null ? szukaj : _centrListaSzukaj || "").toLowerCase().trim();
  const planInfo = _centrPobierzPlanData(_centrAktywnyPlanId);
  const planList = planInfo.plan || [];
  const dniDone = _centrPobierzUkonczoneDni(planInfo.id);
  const curDzien = Math.min(planInfo.days, _centrWybranyDzien || _centrZnajdzBiezacyDzienPlanu(planInfo.id));

  let filtered = planList.filter(item=>{
    const isDone = dniDone.has(item.d);
    if(filtr === "ukonczone" && !isDone) return false;
    if(filtr === "nieukonczone" && isDone) return false;
    if(szukaj){
      const str = ("dzień " + item.d + " " + item.t + " " + (item.f||[]).map(x=>x.r+" "+x.t).join(" ")).toLowerCase();
      if(!str.includes(szukaj)) return false;
    }
    return true;
  });

  return '<div class="cenSubHeader">'
    + '<div class="cenSubHeaderLewo">'
    + '<button type="button" class="cenSubWsteczBtn" data-cwidok="czytanie-chronologiczne">' + CEN_MODERN_ICO.chevronLeft + ' <span>Plan czytania</span></button>'
    + '<div class="cenSubTytulBox">'
    + '<div class="cenSubTytul">Lista dni czytania</div>'
    + '<div class="cenSubPodtytul">' + esc(planInfo.name) + ' • ' + planList.length + ' dni</div>'
    + '</div></div>'
    + '<div style="position:relative;">'
    + '<input type="text" id="cenSzukajDniInp" class="cenSearchInp" placeholder="Szukaj dnia, wersetu..." value="' + esc(_centrListaSzukaj||'') + '">'
    + '</div>'
    + '</div>'

    + '<div class="cenTabsRow">'
    + '<button type="button" class="cenTabBtn' + (filtr==="wszystkie"?' active':'') + '" data-clista-tab="wszystkie">Wszystkie (' + planList.length + ')</button>'
    + '<button type="button" class="cenTabBtn' + (filtr==="ukonczone"?' active':'') + '" data-clista-tab="ukonczone">Ukończone (' + dniDone.size + ')</button>'
    + '<button type="button" class="cenTabBtn' + (filtr==="nieukonczone"?' active':'') + '" data-clista-tab="nieukonczone">Nieukończone (' + (planList.length - dniDone.size) + ')</button>'
    + '</div>'

    + '<div class="cenListaDniContainer">'
    + (!filtered.length ? '<div class="cenPusto">Brak dni spełniających wybrane kryteria.</div>' : '')
    + filtered.map(item=>{
        const isDone = dniDone.has(item.d);
        const isCur = item.d === curDzien;
        return '<div class="cenRowItem" style="' + (isCur ? 'border-color:#3b82f6;background:rgba(37,99,235,0.08);' : '') + '" data-cwidok="dzien" data-cdzien="' + item.d + '">'
          + '<div class="cenRowLewo">'
          + '<div>'
          + '<div class="cenRowTyt" style="' + (isCur ? 'color:#2563eb;font-weight:700;' : '') + '">Dzień ' + item.d + (isCur ? ' (Bieżący)' : '') + '</div>'
          + '<div class="cenRowPodtyt">' + (item.f ? item.f.length : 0) + ' fragmenty • ' + esc(item.t) + '</div>'
          + '</div></div>'
          + '<div style="display:flex;align-items:center;gap:10px;">'
          + (isDone ? '<span style="color:#10b981;display:flex;align-items:center;gap:4px;font-size:13px;font-weight:600;">' + CEN_MODERN_ICO.check + ' Ukończono</span>' : '<span class="cenPozStrz">' + CEN_MODERN_ICO.chevron + '</span>')
          + '</div>'
          + '</div>';
      }).join('')
    + '</div>';
}

/* 5. STATYSTYKI & CELE I POSTĘP */
function centrWidokStatystyki(tab){
  tab = tab || _centrStatTab || "ogolny";
  const planInfo = _centrPobierzPlanData(_centrAktywnyPlanId);
  const planList = planInfo.plan || [];
  const dniDone = _centrPobierzUkonczoneDni(planInfo.id);
  const totalDni = planInfo.days;
  const doneCount = dniDone.size;
  const pctNum = totalDni > 0 ? (doneCount / totalDni) * 100 : 0;
  const pctStr = pctNum.toFixed(1).replace(".", ",");
  const circumference = 2 * Math.PI * 80;
  const strokeOffset = circumference - (pctNum / 100) * circumference;

  const dniArr = Array.from(dniDone).sort((a,b) => a-b);
  let _bestSer = 0, _curCh = 0, _prevD = -99;
  for(const _dd of dniArr){
    _curCh = (_dd === _prevD + 1) ? _curCh + 1 : 1;
    if(_curCh > _bestSer) _bestSer = _curCh;
    _prevD = _dd;
  }
  let _curSer = 0;
  if(dniArr.length > 0){
    const _maxD = dniArr[dniArr.length - 1];
    for(let _dd2 = _maxD; _dd2 >= 1; _dd2--){
      if(dniDone.has(_dd2)) _curSer++; else break;
    }
  }
  const _totalFragy = planList.reduce((s, day) => s + (day.f ? day.f.length : 0), 0);
  const _fragiDone = _centrPobierzUkonczoneFragi().size;

  const _nagl = '<div class="cenSubHeader">'
    + '<div class="cenSubHeaderLewo">'
    + '<button type="button" class="cenSubWsteczBtn" data-cwidok="czytanie-chronologiczne">' + CEN_MODERN_ICO.chevronLeft + ' <span>Plan czytania</span></button>'
    + '<div class="cenSubTytulBox">'
    + '<div class="cenSubTytul">Statystyki i postęp</div>'
    + '<div class="cenSubPodtytul">' + esc(planInfo.name) + ' • ' + doneCount + ' z ' + totalDni + ' dni (' + pctStr + '%)</div>'
    + '</div></div>'
    + '</div>'
    + '<div class="cenTabsRow">'
    + '<button type="button" class="cenTabBtn' + (tab==="ogolny"?' active':'') + '" data-cstat-tab="ogolny">Ogólny</button>'
    + '<button type="button" class="cenTabBtn' + (tab==="drzewo"?' active':'') + '" data-cstat-tab="drzewo">🌳 Drzewo wzrostu</button>'
    + '<button type="button" class="cenTabBtn' + (tab==="ksiegi"?' active':'') + '" data-cstat-tab="ksiegi">Według sekcji</button>'
    + '<button type="button" class="cenTabBtn' + (tab==="serie"?' active':'') + '" data-cstat-tab="serie">Serie dni</button>'
    + '</div>';

  if(tab === "drzewo"){
    return _nagl + _centrWidokDrzewoWzrostu(planInfo, dniDone, _curSer, _bestSer);
  }

  if(tab === "ksiegi"){
    const _krok = Math.max(7, Math.floor(totalDni / 10));
    let _sHtml = '';
    for(let _s = 1; _s <= totalDni; _s += _krok){
      const _e = Math.min(_s + _krok - 1, totalDni);
      const _sd = dniArr.filter(_d => _d >= _s && _d <= _e).length;
      const _st = _e - _s + 1;
      const _sp = Math.round(_sd / _st * 100);
      _sHtml += '<div class="cenStatCard" style="flex-direction:column;align-items:stretch;gap:8px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;">'
        + '<span class="cenStatLabel">Dni ' + _s + '\u2013' + _e + '</span>'
        + '<span class="cenStatVal" style="font-size:14px;">' + _sd + ' / ' + _st + ' (' + _sp + '%)</span>'
        + '</div>'
        + '<div class="cenProgressBar"><div class="cenProgressFill" style="width:' + Math.max(2,_sp) + '%;background:' + (_sp===100?'#10b981':'#3b82f6') + ';"></div></div>'
        + '</div>';
    }
    return _nagl + '<div class="cenStatsGrid" style="grid-template-columns:1fr;">' + _sHtml + '</div>';
  }

  if(tab === "serie"){
    const _serArr = [];
    let _sCh = 0, _sChStart = -1;
    for(let _sd2 = 1; _sd2 <= totalDni; _sd2++){
      if(dniDone.has(_sd2)){ if(_sCh === 0) _sChStart = _sd2; _sCh++; }
      else { if(_sCh > 0) _serArr.push({ start: _sChStart, len: _sCh }); _sCh = 0; }
    }
    if(_sCh > 0) _serArr.push({ start: _sChStart, len: _sCh });
    _serArr.sort((a,b) => b.len - a.len);
    const _serHtml = _serArr.length ? _serArr.slice(0,10).map((_sr,i) => {
      const _med = i===0 ? '\U0001f3c6 ' : i===1 ? '\U0001f948 ' : i===2 ? '\U0001f949 ' : (i+1)+'. ';
      return '<div class="cenStatCard">'
        + '<span class="cenStatLabel">' + _med + 'Dni ' + _sr.start + '\u2013' + (_sr.start+_sr.len-1) + '</span>'
        + '<span class="cenStatVal" style="color:' + (i===0?'#10b981':'var(--cen-text-muted)') + ';">' + _sr.len + ' dni</span>'
        + '</div>';
    }).join('') : '<div class="cenPusto">Brak ukończonych serii. Zacznij czytać, aby zobaczyć swój postęp!</div>';
    return _nagl
      + '<div class="cenStatCard" style="margin-bottom:16px;flex-direction:column;align-items:stretch;gap:8px;">'
      + '<div style="display:flex;justify-content:space-between;"><span class="cenStatLabel">Obecna seria</span><span class="cenStatVal" style="color:#fb923c;">' + (_curSer > 0 ? _curSer + ' dni \U0001f525' : 'Zacznij dzi\u015b!') + '</span></div>'
      + '<div style="display:flex;justify-content:space-between;"><span class="cenStatLabel">Najd\u0142u\u017csza seria</span><span class="cenStatVal" style="color:#10b981;">' + (_bestSer > 0 ? _bestSer + ' dni \U0001f3c6' : '\u2014') + '</span></div>'
      + '</div>'
      + '<div class="cenSecHeadTyt">Wszystkie serie</div>'
      + '<div class="cenStatsGrid">' + _serHtml + '</div>';
  }

  return _nagl
    + '<div class="cenStatsShell">'
    + '<div class="cenRadialContainer">'
    + '<svg viewBox="0 0 200 200">'
    + '<circle class="cenRadialBg" cx="100" cy="100" r="80"></circle>'
    + '<circle class="cenRadialFill" cx="100" cy="100" r="80" style="stroke-dasharray:' + circumference + ';stroke-dashoffset:' + strokeOffset + ';"></circle>'
    + '</svg>'
    + '<div class="cenRadialCenter">'
    + '<span class="cenRadialPct">' + pctStr + '%</span>'
    + '<span class="cenRadialSub">' + doneCount + ' / ' + totalDni + ' dni<br>uko\u0144czone</span>'
    + '</div></div></div>'
    + '<div class="cenStatsGrid">'
    + '<div class="cenStatCard"><span class="cenStatLabel">Uko\u0144czone dni</span><span class="cenStatVal">' + doneCount + ' / ' + totalDni + '</span></div>'
    + '<div class="cenStatCard"><span class="cenStatLabel">Uko\u0144czone fragmenty</span><span class="cenStatVal">' + _fragiDone + ' / ' + _totalFragy + '</span></div>'
    + '<div class="cenStatCard"><span class="cenStatLabel">Obecna seria</span><span class="cenStatVal" style="color:var(--cen-text-muted);">' + (_curSer > 0 ? _curSer + ' dni \U0001f525' : 'Zacznij dzi\u015b!') + '</span></div>'
    + '<div class="cenStatCard"><span class="cenStatLabel">Najd\u0142u\u017csza seria</span><span class="cenStatVal" style="color:var(--cen-text-muted);">' + (_bestSer > 0 ? _bestSer + ' dni \U0001f3c6' : '\u2014') + '</span></div>'
    + '</div>';
}

/* 6. KALENDARZ */
function centrWidokKalendarz(rok, mies){
  rok = rok || _centrKalRok;
  mies = (mies !== undefined) ? mies : _centrKalMies;
  const nazwyMies = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"];
  const planInfo = _centrPobierzPlanData(_centrAktywnyPlanId);
  const firstDay = new Date(rok, mies, 1).getDay();
  const dniWPrzedziale = (firstDay === 0 ? 6 : firstDay - 1);
  const totalDays = new Date(rok, mies + 1, 0).getDate();

  let gridHtml = '';
  for(let i=0; i<dniWPrzedziale; i++){
    gridHtml += '<div class="cenKalDzienKomorka" style="opacity:0.2;"></div>';
  }
  const dniDoneKal = _centrPobierzUkonczoneDni(planInfo.id);
  const curDzienKal = Math.min(planInfo.days, _centrWybranyDzien || _centrZnajdzBiezacyDzienPlanu(planInfo.id));
  for(let d=1; d<=totalDays; d++){
    const planDay = Math.min(planInfo.days, d);
    const czyDone = dniDoneKal.has(planDay);
    const isCur = (planDay === curDzienKal);
    gridHtml += '<div class="cenKalDzienKomorka' + (isCur ? ' active' : '') + '" data-cwidok="dzien" data-cdzien="' + planDay + '">'
      + '<span class="cenKalDzienNr">' + d + '</span>'
      + '<span class="cenKalDzienKropka ' + (czyDone ? 'dot-done' : isCur ? 'dot-part' : 'dot-empty') + '"></span>'
      + '</div>';
  }

  return '<div class="cenSubHeader">'
    + '<div class="cenSubHeaderLewo">'
    + '<button type="button" class="cenSubWsteczBtn" data-cwidok="czytanie-chronologiczne">' + CEN_MODERN_ICO.chevronLeft + ' <span>Plan czytania</span></button>'
    + '<div class="cenSubTytulBox">'
    + '<div class="cenSubTytul">Kalendarz czytania</div>'
    + '<div class="cenSubPodtytul">' + esc(planInfo.name) + ' • ' + nazwyMies[mies] + ' ' + rok + '</div>'
    + '</div></div>'
    + '</div>'

    + '<div class="cenKalendarzMiesiac">'
    + '<button type="button" class="cenNaglBtnIko" data-ckal-naw="-1">' + CEN_MODERN_ICO.chevronLeft + '</button>'
    + '<div class="cenKalendarzMiesiacTyt">' + nazwyMies[mies] + ' ' + rok + '</div>'
    + '<button type="button" class="cenNaglBtnIko" data-ckal-naw="1">' + CEN_MODERN_ICO.chevron + '</button>'
    + '</div>'

    + '<div class="cenKalendarzGrid">'
    + '<div class="cenKalNaglowekDnia">Pn</div><div class="cenKalNaglowekDnia">Wt</div><div class="cenKalNaglowekDnia">Śr</div>'
    + '<div class="cenKalNaglowekDnia">Cz</div><div class="cenKalNaglowekDnia">Pt</div><div class="cenKalNaglowekDnia">Sb</div><div class="cenKalNaglowekDnia">Nd</div>'
    + gridHtml
    + '</div>'

    + '<div class="cenKalLegenda">'
    + '<div class="cenKalLegendaItem"><span class="cenKalDzienKropka dot-done" style="margin:0;"></span> <span>Ukończone</span></div>'
    + '<div class="cenKalLegendaItem"><span class="cenKalDzienKropka dot-part" style="margin:0;"></span> <span>Bieżący dzień</span></div>'
    + '<div class="cenKalLegendaItem"><span class="cenKalDzienKropka dot-empty" style="border:1px solid var(--cen-text-muted);margin:0;"></span> <span>Nieukończone</span></div>'
    + '</div>';
}

/* 7. WYBÓR I ZARZĄDZANIE PLANAMI CZYTANIA (SELEKTOR PLANÓW) */
function centrWidokMojePlany(tab){
  tab = tab || _centrPlanTab || "wszystkie";
  _centrPlanTab = tab;
  const plany = _centrPobierzPlany();

  let filtered = plany.filter(p => {
    if(tab === "chrono") return p.cat === "chrono";
    if(tab === "pokolei") return p.cat === "pokolei";
    if(tab === "zbalansowany") return p.cat === "zbalansowany";
    if(tab === "temat") return p.cat === "temat";
    return true;
  });

  return '<div class="cenSubHeader">'
    + '<div class="cenSubHeaderLewo">'
    + '<button type="button" class="cenSubWsteczBtn" data-cwidok="centrum">' + CEN_MODERN_ICO.chevronLeft + ' <span>Centrum</span></button>'
    + '<div class="cenSubTytulBox">'
    + '<div class="cenSubTytul">Plany czytania Biblii</div>'
    + '<div class="cenSubPodtytul">Wybierz lub skonfiguruj plan czytania</div>'
    + '</div></div>'
    + '<div class="cenNaglAkcje">'
    + '<button type="button" class="cenNaglBtnIko" data-cakcja="nowy-plan" title="Dodaj własny plan czytania">' + CEN_MODERN_ICO.plus + '</button>'
    + '</div></div>'

    + '<div class="cenTabsRow" style="overflow-x:auto;">'
    + '<button type="button" class="cenTabBtn' + (tab==="wszystkie"?' active':'') + '" data-cplan-tab="wszystkie">Wszystkie (' + plany.length + ')</button>'
    + '<button type="button" class="cenTabBtn' + (tab==="chrono"?' active':'') + '" data-cplan-tab="chrono">Chronologiczne (1, 2, 3 lata)</button>'
    + '<button type="button" class="cenTabBtn' + (tab==="pokolei"?' active':'') + '" data-cplan-tab="pokolei">Księgi po kolei (1, 2, 3 lata)</button>'
    + '<button type="button" class="cenTabBtn' + (tab==="zbalansowany"?' active':'') + '" data-cplan-tab="zbalansowany">Pisma Hebr. i Greckie (1, 2, 3 lata)</button>'
    + '<button type="button" class="cenTabBtn' + (tab==="temat"?' active':'') + '" data-cplan-tab="temat">Pisma Greckie i Tematyczne</button>'
    + '</div>'

    + '<div class="cenPlanGrid">'
    + filtered.map(p => {
        const doneSet = _centrPobierzUkonczoneDni(p.id);
        const doneCount = doneSet.size;
        const totalDni = p.days;
        const pctNum = totalDni > 0 ? (doneCount / totalDni) * 100 : 0;
        const pct = pctNum.toFixed(1).replace(".", ",");
        const isGlowny = (p.id === _centrAktywnyPlanId);
        const curDzien = _centrZnajdzBiezacyDzienPlanu(p.id);
        const isDone = doneCount >= totalDni && totalDni > 0;
        const catClass = 'card-' + (p.cat || 'chrono');
        const ico = p.cat === 'pokolei' ? CEN_MODERN_ICO.book : p.cat === 'zbalansowany' ? CEN_MODERN_ICO.clipboard : p.cat === 'temat' ? CEN_MODERN_ICO.target : CEN_MODERN_ICO.calendar;

        return '<div class="cenPlanCard ' + catClass + (isGlowny ? ' active' : '') + '">'
          + '<div>'
          + '<div class="cenPlanCardHeader">'
          + '<div class="cenPlanIkoBox">' + ico + '</div>'
          + '<div class="cenPlanHeaderInfo">'
          + '<div class="cenPlanBadgeRow">'
          + '<span class="cenPlanCatBadge">' + esc(p.catName || "Plan") + '</span>'
          + '<span class="cenPlanDurationBadge">' + esc(p.duration || (p.days + ' dni')) + '</span>'
          + (isGlowny ? '<span class="cenPlanActiveBadge">★ Twój aktywny plan</span>' : '')
          + '</div>'
          + '<div class="cenPlanTyt">' + esc(p.name) + '</div>'
          + '</div></div>'

          + '<div class="cenPlanPaceRow">'
          + '<span class="cenPlanPaceTag">⚡ ' + esc(p.pace || "~1 rozdz./dzień") + '</span>'
          + '<span class="cenPlanTimeTag">' + esc(p.timeEst || "⏱ 10 min") + '</span>'
          + '</div>'

          + '<div class="cenPlanDesc">' + esc(p.desc || "") + '</div>'
          + '</div>'

          + '<div class="cenPlanCardFooter">'
          + '<div class="cenPlanProgressWrap">'
          + '<div class="cenPlanProgressMeta">'
          + '<span>Postęp: <b>' + doneCount + ' z ' + totalDni + ' dni</b> (' + pct + '%)</span>'
          + '<span>' + (isDone ? '🎉 Ukończono 100%' : 'Bieżący: Dzień ' + curDzien) + '</span>'
          + '</div>'
          + '<div class="cenProgressBar"><div class="cenProgressFill" style="width:' + Math.min(100, Math.max(doneCount>0?3:0, pctNum)) + '%;"></div></div>'
          + '</div>'

          + '<div class="cenPlanActionsRow">'
          + (isGlowny
              ? '<button type="button" class="cenPlanBtnPrimary active" data-cplan-wybierz="' + p.id + '">Czytaj Dzień ' + curDzien + ' →</button>'
              : '<button type="button" class="cenPlanBtnPrimary" data-cplan-wybierz="' + p.id + '">Wybierz ten plan</button>')
          + '<button type="button" class="cenPlanBtnSec" data-cwidok="lista-dni" data-cplan-otworz="' + p.id + '" title="Spis wszystkich dni">Lista dni</button>'
          + (doneCount > 0 ? '<button type="button" class="cenPlanBtnSec" data-cplan-reset="' + p.id + '" title="Zresetuj postęp tego planu">Resetuj</button>' : '')
          + '</div>'
          + '</div>'
          + '</div>';
      }).join('')
    + '</div>';
}


/* 8. STUDIUM OSOBISTE */
function centrWidokStudiumOsobiste(tab){
  tab = tab || _centrStudiumTab || "tematy";
  const tematy = _centrPobierzTematyStudium();


    // Rozgałęzienie na zakładki studium osobistego
  let _soTresc = '';
  if(tab === "ostatnie"){
    const _tNorms = new Set(tematy.map(t2 => (typeof norm==="function"?norm(t2.name):t2.name.toLowerCase())));
    const _tTagIds = new Set();
    if(typeof tags !== "undefined" && Array.isArray(tags)){
      tags.filter(tg2 => _tNorms.has(typeof norm==="function"?norm(tg2.name):tg2.name.toLowerCase())).forEach(tg2 => _tTagIds.add(tg2.id));
    }
    const _ostatnie = (typeof notes !== "undefined" && Array.isArray(notes))
      ? notes.filter(_on => {
          if(_on.del) return false;
          if(Array.isArray(_on.tg) && _on.tg.some(_otid => _tTagIds.has(_otid))) return true;
          if(_on.t && tematy.some(_ot => (typeof norm==="function"?norm(_on.t):_on.t.toLowerCase()).includes(typeof norm==="function"?norm(_ot.name):_ot.name.toLowerCase()))) return true;
          return false;
        }).sort((a,b) => (b.mo||b.cr||0)-(a.mo||a.cr||0)).slice(0,15)
      : [];
    if(!_ostatnie.length){
      _soTresc = '<div class="cenPusto">Brak ostatnio edytowanych notatek powiązanych z Twoimi tematami. Dodaj notatki do tematów aby pojawiły się tutaj.</div>';
    } else {
      _soTresc = _ostatnie.map(_on2 => {
        const _snip2 = (_on2.c || (_on2.h ? String(_on2.h).replace(/<[^>]*>/g," ") : "")).trim().slice(0,100);
        return '<div class="cenRowItem" data-cnotatka-otworz="'+_on2.g+'">'
          + '<div class="cenRowLewo">'
          + '<div style="width:36px;height:36px;border-radius:10px;background:var(--cen-btn-bg);display:flex;align-items:center;justify-content:center;color:#2563eb;flex-shrink:0;">' + CEN_MODERN_ICO.note + '</div>'
          + '<div><div class="cenRowTyt">'+esc(_on2.t||"Bez tytułu")+'</div><div class="cenRowPodtyt">'+esc(_snip2)+(_snip2.length>=100?'…':'')+'</div></div>'
          + '</div><span class="cenPozStrz">' + CEN_MODERN_ICO.chevron + '</span></div>';
      }).join('');
    }
  } else {
    if(!tematy.length){
      _soTresc = '<div class="cenPusto">Nie masz jeszcze tematów studium. Naciśnij + aby dodać pierwszy temat.</div>';
    } else {
      _soTresc = tematy.map(t=>{
        const vCount = Array.isArray(t.verses) ? t.verses.length : (t.verses || 0);
        const myNotes = _centrPobierzNotatkiTematu(t);
        const nCount = myNotes.length || t.notes || 0;
        return '<div class="cenRowItem" data-cwidok="temat-szczegoly" data-ctemat-id="'+t.id+'">'
          + '<div class="cenRowLewo">'
          + '<span class="cenRowDot" style="background:'+t.color+';box-shadow:0 0 10px '+t.color+';"></span>'
          + '<div><div class="cenRowTyt">'+esc(t.name)+'</div><div class="cenRowPodtyt">'+vCount+' wersetów • '+nCount+' '+(nCount===1?'notatka':nCount<5?'notatki':'notatek')+'</div></div>'
          + '</div><span class="cenPozStrz">'+CEN_MODERN_ICO.chevron+'</span></div>';
      }).join('');
    }
  }
  return '<div class="cenSubHeader">'
    + '<div class="cenSubHeaderLewo">'
    + '<button type="button" class="cenSubWsteczBtn" data-cwidok="centrum">' + CEN_MODERN_ICO.chevronLeft + ' <span>Centrum</span></button>'
    + '<div class="cenSubTytulBox">'
    + '<div class="cenSubTytul">Studium osobiste</div>'
    + '<div class="cenSubPodtytul">' + tematy.length + ' tematów • Zbiory wersetów i notatek</div>'
    + '</div></div>'
    + '<div class="cenNaglAkcje">'
    + '<button type="button" class="cenNaglBtnIko" data-cakcja="nowy-temat" title="Dodaj nowy temat studium">' + CEN_MODERN_ICO.plus + '</button>'
    + '</div></div>'
    + '<div class="cenTabsRow">'
    + '<button type="button" class="cenTabBtn' + (tab==="tematy"?' active':'') + '" data-cstudium-tab="tematy">Moje tematy (' + tematy.length + ')</button>'
    + '<button type="button" class="cenTabBtn' + (tab==="ostatnie"?' active':'') + '" data-cstudium-tab="ostatnie">Ostatnie</button>'
    + '</div>'
    + '<div class="cenTematyLista">' + _soTresc + '</div>';
}

/* 9. SZCZEGÓŁY TEMATU STUDIUM OSOBISTEGO */
function centrWidokTematSzczegoly(tematId){
  tematId = tematId || _centrWybranyTematId || "wiara-abrahama";
  const tematy = _centrPobierzTematyStudium();
  const t = tematy.find(x=>x.id===tematId) || tematy[0];
  const verses = Array.isArray(t.verses) ? t.verses : [];
  const myNotes = _centrPobierzNotatkiTematu(t);

  return '<div class="cenSubHeader">'
    + '<div class="cenSubHeaderLewo">'
    + '<button type="button" class="cenSubWsteczBtn" data-cwidok="studium-osobiste">' + CEN_MODERN_ICO.chevronLeft + ' <span>Studium</span></button>'
    + '<div class="cenSubTytulBox">'
    + '<div class="cenSubTytul">' + esc(t.name) + '</div>'
    + '<div class="cenSubPodtytul">' + verses.length + ' wersetów • ' + myNotes.length + ' ' + (myNotes.length===1?'notatka':myNotes.length<5?'notatki':'notatek') + '</div>'
    + '</div></div>'
    + '<div class="cenNaglAkcje">'
    + '<button type="button" class="cenFragBtnJW" data-ctemat-nowanota="'+t.id+'" title="Napisz nową notatkę do tego tematu">' + CEN_MODERN_ICO.note + ' Nowa notatka</button>'
    + '<button type="button" class="cenNaglBtnIko" data-ctemat-dodajwers="'+t.id+'" title="Dodaj werset do tematu">' + CEN_MODERN_ICO.plus + '</button>'
    + '<button type="button" class="cenNaglBtnIko" data-ctemat-edytuj="'+t.id+'" title="Edytuj temat">' + CEN_MODERN_ICO.gear + '</button>'
    + '</div></div>'

    + '<div class="cenHeroCard" style="border-color:color-mix(in srgb, '+t.color+' 35%, rgba(255,255,255,0.1));margin-bottom:24px;cursor:default;">'
    + '<div class="cenHeroCardTop">'
    + '<div class="cenHeroIkoBox" style="background:linear-gradient(135deg, '+t.color+', color-mix(in srgb, '+t.color+' 60%, #000));box-shadow:0 6px 18px color-mix(in srgb, '+t.color+' 40%, transparent);">' + CEN_MODERN_ICO.note + '</div>'
    + '<div class="cenHeroInfo">'
    + '<div class="cenHeroTyt" style="font-size:18px;">' + esc(t.name) + '</div>'
    + '<div class="cenHeroOpis" style="font-size:13.5px;">' + esc(t.desc || "Zbiór wersetów, komentarzy i notatek do głębszego studium.") + '</div>'
    + '</div></div>'
    + '<div class="cenHeroBottom">'
    + '<div class="cenHeroMetaRow">'
    + '<span class="cenHeroMetaLabel">Zawartość tematu</span>'
    + '<span class="cenHeroMetaVal"><b>' + verses.length + ' wersetów</b> • <b>' + myNotes.length + ' ' + (myNotes.length===1?'notatka':myNotes.length<5?'notatki':'notatek') + '</b></span>'
    + '</div></div></div>'

    + '<div style="margin-bottom:26px;">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'
    + '<div class="cenSecHeadTyt">Kluczowe wersety biblijne (' + verses.length + ')</div>'
    + '<button type="button" class="btn" data-ctemat-dodajwers="'+t.id+'" style="font-size:12px;padding:4px 10px;">+ Dodaj werset</button>'
    + '</div>'
    + '<div class="cenFragiLista">'
    + (!verses.length ? '<div class="cenPusto">Brak przypisanych wersetów. Kliknij „+ Dodaj werset”, aby dodać pierwszy fragment.</div>' : '')
    + verses.map((v, vIdx)=>{
        return '<div class="cenFragCard">'
          + '<div class="cenFragLewo">'
          + '<div style="width:32px;height:32px;border-radius:10px;background:var(--cen-btn-bg);display:flex;align-items:center;justify-content:center;color:'+t.color+';flex-shrink:0;">'
          + CEN_MODERN_ICO.book
          + '</div>'
          + '<div>'
          + '<div class="cenFragWerset">' + esc(v.r) + '</div>'
          + '<div class="cenFragTemat">' + esc(v.t || "") + '</div>'
          + '</div></div>'
          + '<div class="cenFragPrawo">'
          + '<button type="button" class="cenFragBtnJW" data-copen-jw="' + esc(v.r) + '" title="Otwórz fragment">' + CEN_MODERN_ICO.jw + ' Otwórz w JW Library</button>'
          + '<button type="button" class="cenNaglBtnIko" data-cnotatka-werset="' + esc(v.r) + '" title="Napisz notatkę do tego wersetu">' + CEN_MODERN_ICO.note + '</button>'
          + '<button type="button" class="cenNaglBtnIko" data-ctemat-usunwers="'+t.id+'" data-cv-idx="'+vIdx+'" title="Usuń werset z tematu" style="color:#f87171;">✕</button>'
          + '</div></div>';
      }).join('')
    + '</div></div>'

    + '<div style="margin-bottom:26px;">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'
    + '<div class="cenSecHeadTyt">Twoje notatki w tym temacie (' + myNotes.length + ')</div>'
    + '<button type="button" class="btn" data-ctemat-nowanota="'+t.id+'" style="font-size:12px;padding:4px 10px;">+ Nowa notatka</button>'
    + '</div>'
    + '<div class="cenNotatkiLista">'
    + (!myNotes.length ? '<div class="cenPusto" style="cursor:pointer;" data-ctemat-nowanota="'+t.id+'">Nie masz jeszcze własnych notatek w tym temacie.<br><b style="color:#60a5fa;display:inline-block;margin-top:6px;">+ Kliknij tutaj, aby napisać pierwszą notatkę</b></div>' : '')
    + myNotes.map(n=>{
        const snippet = (n.c || (n.h ? String(n.h).replace(/<[^>]*>/g," ") : "")).slice(0, 110);
        return '<div class="cenRowItem" data-cnotatka-otworz="'+n.g+'">'
          + '<div class="cenRowLewo">'
          + '<div style="width:36px;height:36px;border-radius:10px;background:var(--cen-btn-bg);display:flex;align-items:center;justify-content:center;color:#2563eb;flex-shrink:0;">'
          + CEN_MODERN_ICO.note
          + '</div>'
          + '<div>'
          + '<div class="cenRowTyt">' + esc(n.t || "Bez tytułu") + '</div>'
          + '<div class="cenRowPodtyt">' + esc(snippet) + '…</div>'
          + '</div></div>'
          + '<span class="cenPozStrz">' + CEN_MODERN_ICO.chevron + '</span>'
          + '</div>';
      }).join('')
    + '</div></div>';
}

const CENTR_BLOKI = [
  {id:"biblioteka", nazwa:"Biblioteka i czytelnia"},
  {id:"organizator", nazwa:"Projekty i kolejki"},
  {id:"szybkie", nazwa:"Szybkie akcje"},
  {id:"ostatnie", nazwa:"Ostatnia praca"},
  {id:"odkrywaj", nazwa:"Zadania i wyszukiwania"},
  {id:"statystyki", nazwa:"Podsumowanie"}
];

let centrTryb = lsGet(CENTR_KLUCZ, "auto") === "lista" ? "lista" : "auto";
let centrWlaczone = lsGet(CENTR_WLACZONE, "1") !== "0";
let centrDostosujOtwarte = false;
let centrWidok = CENTR_WIDOKI.includes(lsGet(CENTR_WIDOK_KLUCZ,"centrum"))
  ? lsGet(CENTR_WIDOK_KLUCZ,"centrum") : "centrum";
let centrMenuOtwarte = false;

function centrUklad(){
  let zapis={};
  try{ zapis=JSON.parse(lsGet(CENTR_UKLAD_KLUCZ,"{}"))||{}; }catch(_){ zapis={}; }
  const ids=CENTR_BLOKI.map(x=>x.id), z=Array.isArray(zapis.order)?zapis.order:[];
  const order=[...z.filter((x,i)=>ids.includes(x)&&z.indexOf(x)===i),...ids.filter(x=>!z.includes(x))];
  const hidden={}; ids.forEach(id=>{ hidden[id]=!!(zapis.hidden&&zapis.hidden[id]); });
  return {order,hidden};
}
function centrZapiszUklad(stan){ lsSet(CENTR_UKLAD_KLUCZ,JSON.stringify(stan)); }
function centrPanelUkladu(stan){
  if(!centrDostosujOtwarte) return "";
  const nazwa=Object.fromEntries(CENTR_BLOKI.map(x=>[x.id,x.nazwa]));
  return '<section class="cenUklad" aria-label="Dostosuj Centrum Studium">'
    + '<div class="cenSekcjaHeader"><div><b>Dostosuj Centrum</b><span>Ukryj sekcję albo zmień jej miejsce. Notatki nie są usuwane.</span></div>'
    + '<button type="button" class="cenUkladReset" data-cuklad="reset">Przywróć układ</button></header>'
    + '<div class="cenUkladLista">' + stan.order.map((id,i)=>
      '<div class="cenUkladWiersz"><label><input type="checkbox" data-cuklad="widocznosc" data-cblok="'+id+'"'
      + (stan.hidden[id]?'':' checked') + '><span>'+esc(nazwa[id])+'</span></label>'
      + '<span class="cenUkladRuch"><button type="button" data-cuklad="gora" data-cblok="'+id+'" aria-label="Przesuń wyżej"'
      + (i===0?' disabled':'') + '>↑</button><button type="button" data-cuklad="dol" data-cblok="'+id+'" aria-label="Przesuń niżej"'
      + (i===stan.order.length-1?' disabled':'') + '>↓</button></span></div>').join('')
    + '</div></section>';
}

/* ——— CZY POKAZYWAĆ ——— */

/** Czy cokolwiek jest wybrane. Gdy tak — Centrum ustępuje liście. */
function centrCosWybrane(){
  const q = (typeof query === "string" ? query : "").trim();
  return !!q
    || (filt && String(filt.tag) !== "all")
    || (filt && String(filt.book) !== "all")
    || (filt && String(filt.pub||"all") !== "all")
    || (filt && filt.ch != null)
    || (typeof sortMode !== "undefined" && sortMode === "recent");
}
function centrumWidoczne(){
  if (!centrWlaczone) return false;
  if (centrTryb === "centrum") return true;
  if (centrTryb === "lista") return false;
  return !centrCosWybrane();
}

/* ——— ZBIERANIE DANYCH ———
   Każda funkcja oddaje gotową listę pozycji. Notatki w koszu wypadają wszędzie. */

/* ——— PAMIĘĆ NA CZAS JEDNEGO RYSOWANIA ———
   Sekcje sięgają po te same dwie rzeczy: listę żywych notatek i listę
   posortowaną po dacie. Przy ośmiu tysiącach notatek każde takie sięgnięcie
   to przebiegnięcie i posortowanie całej tablicy — a w jednym rysowaniu
   panelu zdarza się ich kilka. Pamięć żyje WYŁĄCZNIE w trakcie rysowania
   (`rysujCentrum` zakłada ją na wejściu i zdejmuje na wyjściu), więc nie ma
   jak się zestarzeć: poza rysowaniem każde wywołanie liczy od nowa. */
let _cenPamiec = null;
function centrZywe(){
  if(_cenPamiec && _cenPamiec.zywe) return _cenPamiec.zywe;
  const lista = notes.filter(n=>!n.del);
  if(_cenPamiec) _cenPamiec.zywe = lista;
  return lista;
}
function centrPoDacie(pole){
  if(_cenPamiec && _cenPamiec[pole]) return _cenPamiec[pole];
  /* `filter` oddaje NOWĄ tablicę, więc sortowanie nie rusza tej zapamiętanej. */
  const lista = centrZywe()
    .filter(n=>n[pole])
    .sort((a, b)=>String(b[pole]).localeCompare(String(a[pole])));
  if(_cenPamiec) _cenPamiec[pole] = lista;
  return lista;
}
/**
 * Odmiana liczebnika: 1 notatka, 2 notatki, 5 notatek.
 *
 * Ta sama reguła siedzi w mapie tematów (mapaOdmiana), ale Centrum ma własną
 * kopię z powodu KOLEJNOŚCI WCZYTYWANIA: mapa jedzie w module 56, Centrum
 * w 52, a rysowanie Centrum rusza z `setTimeout(…, 0)` zaraz po module 52.
 * Przeglądarka może wykonać taki licznik pomiędzy dwoma znacznikami <script>,
 * więc funkcja z 56 bywa jeszcze nieznana — i naprawdę bywała: pierwsze
 * rysowanie panelu leciało wtedy na „mapaOdmiana is not defined".
 */
function centrOdmiana(n, jeden, dwa, wiele){
  const x = Math.abs(n) % 100, y = Math.abs(n) % 10;
  if(x === 1) return jeden;
  if(y >= 2 && y <= 4 && !(x >= 12 && x <= 14)) return dwa;
  return wiele;
}
/** Ile dni temu — do podpisów w rodzaju „3 dni temu". */
function centrKiedy(iso){
  if(!iso) return "";
  const d = new Date(iso); if(isNaN(d)) return "";
  const doba = (x)=>new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ile = Math.round((doba(new Date()) - doba(d)) / 86400000);
  if(ile <= 0) return "dziś";
  if(ile === 1) return "wczoraj";
  if(ile < 7) return ile + " dni temu";
  if(ile < 30) return Math.round(ile / 7) + " tyg. temu";
  if(ile < 365) return Math.round(ile / 30) + " mies. temu";
  return d.getFullYear() + " r.";
}

/** NA DZIŚ: notatki, dla których nadszedł dzień powrotu (albo już minął). */
function centrNaDzis(){
  const dzis = (typeof dzisRRMMDD === "function") ? dzisRRMMDD()
             : new Date().toISOString().slice(0, 10);
  return centrZywe()
    .filter(n=>n.pwt && n.pwt.d && String(n.pwt.d) <= dzis)
    .sort((a, b)=>String(a.pwt.d).localeCompare(String(b.pwt.d)));
}

/**
 * KONTYNUUJ: notatka, w której zostało zapamiętane miejsce czytania, najpóźniej
 * otwarta. Zapamiętane przewinięcie jest tu mocniejszym sygnałem niż samo
 * otwarcie: znaczy, że notatka była CZYTANA, a nie tylko zerknięta.
 * Gdy żadna nie ma zapisanego miejsca — bierzemy po prostu ostatnio otwartą.
 */
function centrKontynuuj(){
  const pozycje = (typeof readPosAll === "function") ? readPosAll() : {};
  const zPozycja = centrPoDacie("la").filter(n=>pozycje[n.g]);
  if(zPozycja.length) return {n:zPozycja[0], wMiejscu:true};
  const ost = centrPoDacie("la")[0];
  return ost ? {n:ost, wMiejscu:false} : null;
}

function centrOstatnioStudiowane(pomin){
  return centrPoDacie("la").filter(n=>n.g !== pomin).slice(0, CENTR_ILE);
}
function centrOstatnioDodane(){
  return centrPoDacie("cr").slice(0, CENTR_ILE);
}

/**
 * NIEDOKOŃCZONE: notatki z listą zadań, w której coś jest jeszcze nieodhaczone.
 *
 * To jedyny sygnał, który postawił sam użytkownik — wpisując zadanie. Krótka
 * treść albo puste sekcje szablonu też wyglądają na „niedokończone", ale bywają
 * po prostu krótką notatką; zgadywanie zamieniłoby tę sekcję w listę
 * przypadkowych notatek.
 *
 * Sito na wejściu jest tekstowe (`indexOf`), bo przy kilkunastu tysiącach
 * notatek nie ma po co rozkładać każdej z nich na drzewo. Rozkładamy tylko te,
 * które w ogóle mają listę zadań — a takich jest zwykle kilkadziesiąt.
 */
function centrNiedokonczone(){
  const kandydaci = centrZywe().filter(n=>n.h && n.h.indexOf("tasklist") >= 0);
  const wynik = [];
  for(const n of kandydaci){
    let zostalo = 0, razem = 0;
    try{
      const doc = (typeof parsujBezwladnie === "function")
        ? parsujBezwladnie(n.h) : null;
      if(!doc) continue;
      doc.querySelectorAll("ul.tasklist li").forEach(li=>{
        razem++;
        if(!li.classList.contains("done")) zostalo++;
      });
    }catch(e){ continue; }
    if(zostalo) wynik.push({n, zostalo, razem});
  }
  /* Najpierw te, przy których zostało najmniej — są najbliżej domknięcia. */
  wynik.sort((a, b)=>a.zostalo - b.zostalo
    || String(b.n.la || b.n.mo || "").localeCompare(String(a.n.la || a.n.mo || "")));
  return wynik.slice(0, CENTR_ILE);
}

/** OSTATNIO UŻYWANE WERSETY: różne odnośniki z ostatnio otwieranych notatek. */
function centrWersety(){
  /* Ile notatek przy rozdziale — JEDNYM przebiegiem do mapy. Wcześniej każdy
     z sześciu wierszy przeglądał całą tablicę osobno, czyli przy ośmiu
     tysiącach notatek sekcja robiła sześć przebiegów po czterdzieści osiem
     tysięcy sprawdzeń, żeby podać sześć liczb. */
  const licznik = new Map();
  for(const n of notes){
    if(n.del || !n.b || !n.ch) continue;
    const k = n.b + ":" + n.ch;
    licznik.set(k, (licznik.get(k) || 0) + 1);
  }
  const widziane = new Set();
  const wynik = [];
  for(const n of centrPoDacie("la")){
    if(!n.b || !n.ch) continue;
    const klucz = n.b + ":" + n.ch;
    if(widziane.has(klucz)) continue;
    widziane.add(klucz);
    wynik.push({b:n.b, ch:n.ch, etykieta:BOOKS[n.b] + " " + n.ch,
                ile:licznik.get(klucz) || 0, kiedy:n.la});
    if(wynik.length >= CENTR_ILE) break;
  }
  return wynik;
}

/**
 * ULUBIONE PUBLIKACJE: te, przy których naprawdę siedzisz — licząc notatki
 * otwierane w ostatnich trzech miesiącach, a nie wszystkie od początku.
 * Bez tego okna czasowego lista byłaby zawsze ta sama: publikacja z największą
 * liczbą notatek nie zmienia się przez lata, więc nie mówi nic o dzisiaj.
 */
function centrPublikacje(){
  const prog = Date.now() - CENTR_DNI * 86400000;
  const licznik = {};
  centrZywe().forEach(n=>{
    if(n.b || !n.ks) return;                       // wersety mają swoją sekcję
    const kiedy = Date.parse(n.la || n.mo || "");
    if(!isFinite(kiedy) || kiedy < prog) return;
    /* KLUCZ MUSI BYĆ TEN SAM, KTÓRYM FILTRUJE LISTA.
       Do 2.70 Centrum sklejało go po swojemu: `ks + "|" + (itn || 0)`. Dla
       czasopisma z numerem wydania wychodziło to samo co z `pubKeyOf`, więc
       usterki nie było widać — ale dla KSIĄŻKI, która numeru wydania nie ma,
       Centrum robiło „it|0", a lista szuka „it". Kafelek pokazywał wtedy
       poprawną liczbę (bo liczył sam), a po kliknięciu lista była pusta,
       bo filtrowała po kluczu, którego żadna notatka nie ma.
       Dotyczyło to wszystkich książek i broszur — czyli akurat tych publikacji,
       przy których notatek jest najwięcej. */
    const k = pubKeyOf(n);
    if(!licznik[k]) licznik[k] = {klucz:k, ile:0, kiedy:0};
    licznik[k].ile++;
    if(kiedy > licznik[k].kiedy) licznik[k].kiedy = kiedy;
  });
  return Object.values(licznik)
    .sort((a, b)=>b.ile - a.ile || b.kiedy - a.kiedy)
    .slice(0, CENTR_ILE)
    .map(x=>({
      klucz:x.klucz, ile:x.ile,
      etykieta:(typeof pubKeyLabel === "function") ? pubKeyLabel(x.klucz) : x.klucz
    }));
}

function centrSzukania(){
  return (typeof recentSearches === "function" ? recentSearches() : []).slice(0, CENTR_ILE);
}

/** Krótki, bezpieczny fragment treści do karty Czytelni. */
function centrFragment(n, limit){
  if(!n) return "";
  let tekst = n.c || "";
  if(!tekst && n.h){
    try{ tekst = typeof htmlToPlain === "function" ? htmlToPlain(n.h) : String(n.h).replace(/<[^>]*>/g, " "); }
    catch(_){ tekst = String(n.h).replace(/<[^>]*>/g, " "); }
  }
  tekst = String(tekst).replace(/\s+/g, " ").trim();
  limit = limit || 240;
  return tekst.slice(0, limit) + (tekst.length > limit ? "…" : "");
}

/** Jedna myśl na cały dzień — nie zmienia się przy każdym przerysowaniu. */
function centrLosowaMysl(pomin){
  let kandydaci = centrZywe().filter(n=>n.g !== pomin && (n.fav || n.pin));
  if(!kandydaci.length) kandydaci = centrPoDacie("la").filter(n=>n.g !== pomin);
  if(!kandydaci.length) kandydaci = centrPoDacie("cr").filter(n=>n.g !== pomin);
  if(!kandydaci.length) return null;
  const d = new Date();
  const numer = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return kandydaci[Math.abs(numer) % kandydaci.length];
}

/* ══════════════ ORGANIZATOR CENTRUM (v3.06) ══════════════ */
function centrKolejka(pole){
  return centrZywe().filter(n=>n[pole])
    .sort((a,b)=>String(b[pole]).localeCompare(String(a[pole])));
}
function centrProjekty(){
  return tags.filter(t=>t.cproj).map(t=>({
    tag:t,
    ile:centrZywe().reduce((s,n)=>s+(n.tg&&n.tg.includes(t.id)?1:0),0)
  })).sort((a,b)=>(b.ile-a.ile)||a.tag.name.localeCompare(b.tag.name,"pl"));
}
function centrPowodPowrotu(n){
  const p=[];
  if(n.fav) p.push("ulubiona"); else if(n.pin) p.push("przypięta");
  const k=centrKiedy(n.la||n.mo||n.cr); if(k) p.push(k);
  return p.join(" · ") || "warto odświeżyć";
}
/** Kilka wartościowych notatek, do których dawno nie zaglądano. Jedna pętla,
    żadnego wyszukiwania semantycznego — panel ma otwierać się natychmiast. */
function centrWartoWrocic(){
  const teraz=Date.now(), dzien=Math.floor(teraz/86400000);
  return centrZywe().filter(n=>{
    const t=Date.parse(n.la||n.mo||n.cr||"");
    return isFinite(t) && teraz-t>30*86400000 && (n.fav||n.pin||(n.rb&&n.rb.length));
  }).map(n=>{
    const dni=Math.floor((teraz-Date.parse(n.la||n.mo||n.cr))/86400000);
    let h=0; for(const c of String(n.g)) h=(h*31+c.charCodeAt(0))>>>0;
    return {n, wynik:dni+(n.fav?90:0)+(n.pin?45:0)+(n.rb&&n.rb.length?25:0)+((h+dzien)%17)};
  }).sort((a,b)=>b.wynik-a.wynik).slice(0,3).map(x=>x.n);
}
function centrumToggleNotatki(n,pole){
  if(!n || (pole!=="cenq"&&pole!=="ceni")) return;
  pushUndo({type:"note",label:pole==="cenq"?"zmianę kolejki czytania":"zmianę skrzynki do opracowania",before:cloneNote(n)});
  if(n[pole]) delete n[pole]; else n[pole]=new Date().toISOString();
  /* To ustawienie organizacyjne, nie zmiana treści. Nie podbijamy `mo`, bo
     synchronizacja potrafi scalić je osobno i nie zgłosi fałszywego sporu. */
  saveNote(n); bumpDirty(); renderAll();
  toast(n[pole] ? (pole==="cenq"?"Dodano do kolejki czytania":"Dodano do „Do opracowania”")
                : (pole==="cenq"?"Usunięto z kolejki":"Usunięto ze skrzynki"), n[pole]?"ok":null);
}
async function centrumNowyProjekt(n){
  const name=await askText({title:"Nowy projekt w Centrum",placeholder:"np. Wykład we wtorek",okLabel:"Utwórz",
    hint:"Projekt jest zwykłą etykietą, więc przechodzi do kopii i można przypisać go wielu notatkom."});
  if(!name) return null;
  const t=createTag(name); if(!t) return null;
  t.cproj=true; if(!t.color) t.color=["#4d8875","#b78845","#70799d","#8d6f91"][t.id%4];
  saveTags();
  if(n && !n.tg.includes(t.id)){
    pushUndo({type:"note",label:"dodanie notatki do projektu",before:cloneNote(n)});
    n.tg.push(t.id); n.tgd=true; markDirty(n);
  }
  renderAll(); toast("Utworzono projekt „"+t.name+"”","ok"); return t;
}
function centrumMenuProjektow(n,kotwica){
  const dd=$("dropdown"), projekty=centrProjekty();
  dd.innerHTML='<div class="dd-lbl">Projekty tej notatki</div>'
    + projekty.map(x=>'<div data-cenproj="'+x.tag.id+'">'+ICO.tag+esc(x.tag.name)
      +(n.tg.includes(x.tag.id)?' <span class="ddZnak">✓</span>':'')+'</div>').join('')
    + (!projekty.length?'<div class="dd-info">Nie masz jeszcze projektu.</div>':'')
    + '<div class="dd-sep"></div><div data-cenproj="new">'+ICO.plus+'Nowy projekt…</div>';
  dd.style.display="block";
  const a=kotwica&&kotwica.querySelector?kotwica.querySelector('[data-act="more"]'):null;
  placeDropdown(dd,a||kotwica||document.body);
  dd.onclick=ev=>{
    const it=ev.target.closest('[data-cenproj]'); if(!it) return;
    dd.style.display="none";
    if(it.dataset.cenproj==="new"){ centrumNowyProjekt(n); return; }
    const id=+it.dataset.cenproj, t=tags.find(x=>x.id===id&&x.cproj); if(!t) return;
    pushUndo({type:"note",label:"zmianę projektu notatki",before:cloneNote(n)});
    if(n.tg.includes(id)) n.tg=n.tg.filter(x=>x!==id); else n.tg.push(id);
    n.tgd=true; markDirty(n); renderAll();
    toast(n.tg.includes(id)?"Dodano do projektu „"+t.name+"”":"Usunięto z projektu „"+t.name+"”");
  };
}
function centrMiniLista(lista,pole){
  if(!lista.length) return '<span class="cenOrgPusto">Dodasz tu notatkę przez <b>Więcej → Centrum Studium</b>.</span>';
  return lista.slice(0,3).map(n=>'<button type="button" class="cenOrgPoz" data-cnota="'+esc(n.g)+'">'
    +'<span>'+esc(centrTytulNotatki(n))+'</span><small>'+esc(centrKiedy(n[pole]||n.mo||n.cr))+'</small></button>').join('');
}
function centrBezpieczenstwoMini(){
  const iso=lsGet(KP+"LastBkIso",null)||lsGet(KP+"LastBk",null), dirty=+(lsGet(KP+"Dirty",0)||0);
  const opis=iso ? "Ostatnia kopia "+centrKiedy(iso) : "Nie zapisano jeszcze kopii";
  return '<button type="button" class="cenBezMini" data-cakcja="bezpieczenstwo">'+ICO.save
    +'<span><b>Bezpieczeństwo danych</b><small>'+esc(opis)+(dirty?' · '+dirty+' zmian od kopii':' · wszystko zabezpieczone')
    +'</small></span>'+CEN_IKO.strz+'</button>';
}
function centrOrganizator(){
  const projekty=centrProjekty(), kolejka=centrKolejka("cenq"), inbox=centrKolejka("ceni"), powroty=centrWartoWrocic();
  const projektHtml=projekty.length ? projekty.slice(0,5).map(x=>
    '<button type="button" class="cenProjekt" data-cprojekt="'+x.tag.id+'" style="--proj:'+(x.tag.color||'var(--accent)')+'">'
    +'<i></i><span>'+esc(x.tag.name)+'</span><small>'+x.ile+'</small></button>').join('')
    : '<span class="cenOrgPusto">Projekt łączy notatki z różnych wersetów i publikacji.</span>';
  const powrotHtml=powroty.length ? powroty.map(n=>'<button type="button" class="cenOrgPoz" data-cnota="'+esc(n.g)+'">'
    +'<span>'+esc(centrTytulNotatki(n))+'</span><small>'+esc(centrPowodPowrotu(n))+'</small></button>').join('')
    : '<span class="cenOrgPusto">Gdy ulubiona notatka odleży miesiąc, pojawi się tutaj.</span>';
  return '<section class="cenOrgan"><div class="cenSekcjaHeader"><div><span class="cenSekNad">Przestrzeń robocza</span><h2>Twój warsztat</h2></div>'
    +'<button type="button" class="cenLink" data-cakcja="nowy-projekt">＋ Nowy projekt</button></div>'
    +'<div class="cenOrganGrid">'
    +'<article class="cenOrganProjekty"><h3>'+ICO.tag+'<span>Moje projekty</span><b>'+projekty.length+'</b></h3><div class="cenProjektLista">'+projektHtml+'</div></article>'
    +'<article class="cenOrganKolejka"><h3>'+ICO.bookOpen+'<span>Do przeczytania</span><b>'+kolejka.length+'</b></h3><div class="cenOrgLista">'+centrMiniLista(kolejka,"cenq")+'</div>'
    +(kolejka.length>3?'<button class="cenOrgWiecej" data-cszyb="kolejka">Pokaż całą kolejkę</button>':'')+'</article>'
    +'<article class="cenOrganKolejka"><h3>'+ICO.notePen+'<span>Do opracowania</span><b>'+inbox.length+'</b></h3><div class="cenOrgLista">'+centrMiniLista(inbox,"ceni")+'</div>'
    +(inbox.length>3?'<button class="cenOrgWiecej" data-cszyb="inbox">Pokaż wszystkie</button>':'')+'</article>'
    +'<article class="cenOrganPowrot"><h3>'+ICO.clock+'<span>Warto wrócić</span></h3><div class="cenProjektLista cenPowrotLista">'+powrotHtml+'</div></article>'
    +'</div>'+centrBezpieczenstwoMini()+'</section>';
}

/**
 * Nowa górna część Centrum: kolekcje są regałem, a Czytelnia miejscem pracy.
 * Korzysta z istniejących zakładek ogólnych (`ks === "*"`), więc wszystko,
 * co użytkownik przeniósł w kolumnie Publikacje, natychmiast widać także tu.
 */
function centrBiblioteka(kont, dzis){
  /* Centrum pokazuje oba rodzaje kolekcji. Wcześniej widziało wyłącznie
     zakładki ogólne z kolumny Publikacje, więc zakładki przypisane do sekcji
     były zapisane i przenoszone w kopii, ale znikały z samego Centrum. */
  const ogolne = (typeof pubTabsFor === "function" ? pubTabsFor("*") : [])
    .map(z=>({rodzaj:"pub", z, sekcja:""}));
  const sekcyjne = (typeof secTabs !== "undefined" ? secTabs : []).slice()
    .sort((a,b)=>{
      const sa=sections.find(s=>s.id===a.sec), sb=sections.find(s=>s.id===b.sec);
      return ((sa&&sa.ord)||0)-((sb&&sb.ord)||0) || (a.ord||0)-(b.ord||0);
    }).map(z=>({rodzaj:"sek", z, sekcja:(sections.find(s=>s.id===z.sec)||{}).name||"Sekcja"}));
  const kolekcje = [...ogolne,...sekcyjne].slice(0, 8);
  const kolory = ["#4d8875", "#b78845", "#70799d", "#8d6f91", "#5e8392", "#9b705b"];
  const kafle = kolekcje.map((w, i)=>{
    const t=w.z, sek=w.rodzaj==="sek";
    const ile = sek ? (typeof secTabCount==="function"?secTabCount(t.id):0)
                    : (typeof pubTabCount === "function" ? pubTabCount(t.id) : 0);
    const kolor=(t.color&&typeof kolorBezpieczny==="function"&&kolorBezpieczny(t.color))?t.color:kolory[i % kolory.length];
    const atrybut=sek?' data-czakladka-sekcji="'+esc(t.id)+'"':' data-ckolekcja="'+esc(t.id)+'"';
    const opis=(sek?w.sekcja+' · ':'')+ile+' '+centrOdmiana(ile,"notatka","notatki","notatek");
    return '<button type="button" class="cenKol" style="--kol:' + kolor + '"'+atrybut+'>'
      + '<span class="cenKolPas"></span><span class="cenKolIk">' + (sek?CEN_IKO.wers:CEN_IKO.pub) + '</span>'
      + '<span class="cenKolTxt"><b>' + esc(t.name) + '</b><small>' + esc(opis) + '</small></span>'
      + '<span class="cenKolStrz">' + CEN_IKO.strz + '</span></button>';
  }).join("");

  const n = kont ? kont.n : (centrPoDacie("la")[0] || centrPoDacie("cr")[0] || null);
  const mysl = centrLosowaMysl(n && n.g);
  const zapisane = (typeof savedSearches === "function" ? savedSearches() : [])
    .slice().sort((a,b)=>(b.pin?1:0)-(a.pin?1:0)).slice(0, 3);
  const szukania = zapisane.length ? zapisane.map(x=>({q:x.q || x.name || "", name:x.name || x.q || ""}))
                                   : centrSzukania().slice(0, 3).map(q=>({q,name:q}));

  const czytelnia = n
    ? '<div class="cenCzytGl" data-cnota="' + esc(n.g) + '">'
      + '<span class="cenCzytEty">' + CEN_IKO.czyt + '<span>Czytelnia</span></span>'
      + '<h2>' + esc(centrTytulNotatki(n)) + '</h2>'
      + '<p>' + esc(centrFragment(n, 300) || "Otwórz notatkę i wróć do miejsca, w którym skończyłeś.") + '</p>'
      + '<button type="button" class="cenCzytBtn" data-cnota="' + esc(n.g) + '">'
      + (kont ? "Kontynuuj ostatnie studium" : "Otwórz notatkę") + '<span>' + CEN_IKO.strz + '</span></button></div>'
    : '<div class="cenCzytPusto"><b>Czytelnia czeka na pierwszą notatkę.</b><span>Dodaj notatkę, a pojawi się tu miejsce do spokojnego powrotu.</span></div>';

  const dzisHtml = dzis.length
    ? dzis.slice(0, 3).map(x=>'<button type="button" data-cnota="' + esc(x.g) + '"><span>'
        + esc(centrTytulNotatki(x)) + '</span><small>' + esc(x.pwt && x.pwt.d || "na dziś") + '</small></button>').join("")
    : '<span class="cenMiniPusto">Nic nie zalega. Nowy powrót ustawisz w menu notatki.</span>';
  const myslHtml = mysl
    ? '<button type="button" class="cenMysl" data-cnota="' + esc(mysl.g) + '"><q>'
      + esc(centrFragment(mysl, 150) || centrTytulNotatki(mysl)) + '</q><small>'
      + esc(centrTytulNotatki(mysl)) + '</small></button>'
    : '<span class="cenMiniPusto">Oznacz notatki jako ulubione, a Centrum będzie do nich wracać.</span>';
  const szukHtml = szukania.length
    ? szukania.map(x=>'<button type="button" data-cszuk="' + esc(x.q) + '">' + CEN_IKO.szuk + '<span>' + esc(x.name) + '</span></button>').join("")
    : '<span class="cenMiniPusto">Zapisane wyszukiwania pojawią się tutaj.</span>';

  return '<div class="cenBiblioteka">'
    + '<section class="cenKolekcje"><div class="cenSekcjaHeader"><div><span class="cenSekNad">Twoja biblioteka</span><h2>Moje kolekcje</h2></div>'
    + '<button type="button" class="cenLink" data-cakcja="nowa-kolekcja">＋ Nowa kolekcja</button></div>'
    + '<div class="cenKolGrid">' + kafle
    + '<button type="button" class="cenKol cenKolNowa" data-cakcja="nowa-kolekcja"><span class="cenKolPlus">＋</span>'
    + '<span class="cenKolTxt"><b>Utwórz kolekcję</b><small>Dowolne notatki i publikacje</small></span></button></div>'
    + (!kolekcje.length ? '<p class="cenKolPomoc">Kolekcje pomagają zebrać w jednym miejscu np. wykłady, ulubione tematy albo materiały na zebranie.</p>' : '')
    + '</section>'
    + '<section class="cenCzytelnia">' + czytelnia
    + '<div class="cenCzytMini"><article><h3>' + CEN_IKO.dzis + '<span>Na dziś</span><b>' + dzis.length + '</b></h3><div class="cenDzisLista">' + dzisHtml + '</div></article>'
    + '<article><h3>' + CEN_IKO.zarow + '<span>Losowa myśl</span></h3>' + myslHtml + '</article></div>'
    + '<div class="cenZapisane"><h3>Zapisane wyszukiwania</h3><div>' + szukHtml + '</div></div>'
    + '</section></div>';
}

/* ——— RYSOWANIE ——— */

function centrTytulNotatki(n){
  const t = (n.t || "").trim();
  if(t) return t;
  const c = (n.c || "").replace(/\s+/g, " ").trim();
  return c ? c.slice(0, 60) + (c.length > 60 ? "…" : "") : "(bez tytułu)";
}
/**
 * DRUGA LINIA W WIERSZU: skąd ta notatka jest.
 *
 * Sam tytuł nie wystarcza do rozpoznania. „Pokora Dawida" i „Pokora
 * w codziennym życiu" różnią się dopiero tym, że jedna wisi przy 1 Samuela 24,
 * a druga przy Strażnicy. Bierzemy najwyżej dwie rzeczy — etykietę (z jej
 * kolorem, tym samym co w kolumnie po lewej) i werset ALBO publikację. Więcej
 * zamienia wiersz z powrotem w papkę, przed którą uciekamy.
 */
function centrSkadNotatka(n){
  /* Każdy kawałek w osobnym spanie: druga linia ma zostać JEDNĄ linią.
     Gdy części były gołym tekstem, „Ciekawostki · 1 Samuela 24:6" zawijało się
     na dwa wiersze i wiersz notatki rósł z 52 do 72 px — czyli oszczędność
     miejsca, po którą tu przyszliśmy, znikała. */
  const czesci = [];
  const t = (n.tg && n.tg.length) ? tags.find(x=>x.id === n.tg[0]) : null;
  /* Tekst zawsze w osobnym <span class="cenCzT">. Goły tekst wewnątrz elementu
     flex staje się „anonimowym elementem" — a do takiego przeglądarka nie
     stosuje text-overflow, więc nazwa ucinała się w pół litery, bez wielokropka
     („Poranne Wiell"). Własny span dostaje wielokropek jak należy. */
  const kawalek = (tresc, kropka) => '<span class="cenCz">'
    + (kropka ? '<span class="cenKropka" style="background:' + esc(kropka) + '"></span>' : '')
    + '<span class="cenCzT">' + esc(tresc) + '</span></span>';
  if(t) czesci.push(kawalek(t.name, t.color || "var(--accent2)"));
  if(n.b && typeof BOOKS !== "undefined" && BOOKS[n.b])
    czesci.push(kawalek(BOOKS[n.b] + (n.ch ? " " + n.ch + (n.v ? ":" + n.v : "") : ""), ""));
  else if(n.pub) czesci.push(kawalek(String(n.pub), ""));
  if(!czesci.length) return "";
  return '<span class="cenMeta">' + czesci.join('<span class="cenSep">·</span>') + '</span>';
}
/** Wiersz z notatką — wszędzie ten sam, więc wszędzie klika się tak samo. */
function centrWierszNotatki(n, opis, pilne){
  return '<button type="button" class="cenPoz cenPozN" data-cnota="' + esc(n.g) + '">'
    + '<span class="cenNazwa">' + esc(centrTytulNotatki(n)) + '</span>'
    + '<span class="cenOpis' + (pilne ? " cenZal" : "") + '">' + esc(opis || "") + '</span>'
    + centrSkadNotatka(n)
    + '</button>';
}
/**
 * Karta sekcji.
 *
 * Kolejność w nagłówku jest ustalona i sprawdzana przez zestaw „centrum":
 * PIERWSZY span to zawsze tytuł. Plakietka z liczbą i dopisek idą po nim.
 */
function centrSekcja(id, tytul, ikona, wiersze, opcje){
  if(!wiersze.length) return "";
  const o = opcje || {};
  return '<section class="cenKarta" data-sek="' + id + '">'
    /* Ikona zostaje GOŁA, bez opakowania w span. Pierwszy span w nagłówku musi
       być tytułem — po tym rozpoznaje sekcje zestaw „centrum", a opakowanie
       ikony przesunęłoby tytuł na drugie miejsce i wszystkie nazwy sekcji
       zniknęłyby z pomiarów. Kafelek pod ikoną robi arkusz stylów. */
    + '<h3>' + ikona + '<span>' + esc(tytul) + '</span>'
    + (o.plakietka ? '<span class="cenPlak">' + esc(String(o.plakietka)) + '</span>' : '')
    + (o.dopisek ? '<span class="cenLicz">' + esc(o.dopisek) + '</span>' : '')
    + '</h3>'
    + '<div class="cenLista' + (o.klasa ? " " + o.klasa : "") + '">' + wiersze.join("") + '</div>'
    /* Stopka karty. Sekcja pokazuje sześć pozycji — bez tego wyjścia sześć
       wyglądało jak WSZYSTKO, co jest, a nie jak początek listy. */
    + (o.wszystkie
        ? '<button type="button" class="cenWiecej" data-cwszystkie="' + esc(o.wszystkie) + '">'
          + '<span>Zobacz wszystkie</span><span class="cenWiecejStrz">' + CEN_IKO.strz + '</span></button>'
        : '')
    + '</section>';
}

/* ——— IKONY ———
   Do 2.64 Centrum miało własne rysunki, bo „jest jedynym miejscem, gdzie
   występują". Przestało to być prawdą, gdy te same rzeczy — księga, gwiazdka,
   etykieta — zaczęły się pojawiać i tu, i na kartach notatek, i w oknach.
   Dwa rysunki tej samej rzeczy to nie jest wybór stylu, tylko usterka, więc
   od 2.65 Centrum bierze ikony ze wspólnego zbioru ICO (moduł 09).

   Zbiór jest w module 09, a Centrum w 52 — czyli wcześniej, więc w chwili
   rysowania na pewno już istnieje. Wolno tu na niego patrzeć, ale NIE wolno
   liczyć na moduły o wyższym numerze (patrz centrOdmiana wyżej). */
const CEN_IKO = {
  dzis:   ICO.calendar,
  czyt:   ICO.bookOpen,
  nowe:   ICO.plus,
  zadan:  ICO.check,
  wers:   ICO.bookmark,
  pub:    ICO.book,
  szuk:   ICO.search,
  nota:   ICO.doc,
  /* Zegar, nie „odśwież": obok stoi budzik, a plakietka mówi o TERMINIE,
     nie o odświeżaniu. Pierścień strzałek poszedł do uzgadniania. */
  powt:   ICO.clock,
  gwiazd: ICO.star,
  etyk:   ICO.tag,
  wykr:   ICO.bars,
  zarow:  ICO.bulb,
  strz:   ICO.chevron
};

/* ——— ILUSTRACJE ———
   Rysowane w kodzie, nie wczytywane z sieci: aplikacja ma działać bez połączenia,
   a dwa obrazki w PNG kosztowałyby więcej niż cały ten plik. Kolory biorą się
   z `currentColor` i z półprzezroczystej bieli, więc te same kształty pasują do
   motywu jasnego, ciemnego i sepii bez trzech osobnych wersji. */
const CEN_ILU = {
  /* BRYLA, NIE KONTUR.
     Ksztalt buduje roznica walorow, a nie kreska — tak jak na rysunku
     wzorcowym. Gradienty sa zbudowane z `currentColor` przy roznym kryciu,
     wiec ilustracja nadal przyjmuje kolor karty i sama dopasowuje sie do
     motywu ciemnego i sepii. Stale barwy sa wpisane tylko tam, gdzie material
     jest materialem: papier jest bialy, a wstazka zlota, niezaleznie od motywu.
     Wstazka ma wciecie w ksztalcie V i drugi odcinek opadajacy poza krawedz
     ksiazki — to najbardziej rozpoznawalny detal calej ilustracji. */
  ksiega: '<svg class="cenIlu" viewBox="0 0 200 150" fill="none" aria-hidden="true"><defs><linearGradient id="cenKsO" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".92"/><stop offset="1" stop-color="currentColor" stop-opacity=".58"/></linearGradient><linearGradient id="cenKsL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset=".72" stop-color="#f5f7f5"/><stop offset="1" stop-color="#dde3de"/></linearGradient><linearGradient id="cenKsP" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff"/><stop offset=".72" stop-color="#f5f7f5"/><stop offset="1" stop-color="#dde3de"/></linearGradient><linearGradient id="cenKsW" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8bd63"/><stop offset="1" stop-color="#c48f2c"/></linearGradient><radialGradient id="cenKsC" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="currentColor" stop-opacity=".26"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs><ellipse cx="100" cy="129" rx="80" ry="13" fill="url(#cenKsC)"/><path d="M100 50C82 38 58 34 37 36a6 6 0 0 0-5.5 6v64a6 6 0 0 0 6.5 6c19-1.6 43 2 62 13 19-11 43-14.6 62-13a6 6 0 0 0 6.5-6V42a6 6 0 0 0-5.5-6c-21-2-45 2-63 14z" fill="url(#cenKsO)"/><path d="M97 53C80 42 58 39 40 40.6a3.4 3.4 0 0 0-3.2 3.4v58a3.4 3.4 0 0 0 3.7 3.4C58 103.8 80 107 97 117z" fill="#cfd6d0"/><path d="M103 53c17-11 39-14 57-12.4a3.4 3.4 0 0 1 3.2 3.4v58a3.4 3.4 0 0 1-3.7 3.4C142 103.8 120 107 103 117z" fill="#cfd6d0"/><path d="M97 50C80 39 58 36 40 37.6a3.4 3.4 0 0 0-3.2 3.4v58a3.4 3.4 0 0 0 3.7 3.4C58 100.8 80 104 97 114z" fill="url(#cenKsL)"/><path d="M103 50c17-11 39-14 57-12.4a3.4 3.4 0 0 1 3.2 3.4v58a3.4 3.4 0 0 1-3.7 3.4C142 100.8 120 104 103 114z" fill="url(#cenKsP)"/><path d="M100 55c-2 20-2 40 0 60" stroke="#b6bfb8" stroke-opacity=".45" stroke-width="4" stroke-linecap="round"/><g stroke="#c3cbc5" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"><path d="M52 60h34M52 70h34M52 80h34M52 90h27"/><path d="M114 60h24M114 70h24M114 80h24M114 90h19"/></g><path d="M143 40h11v52l-5.5-7-5.5 7z" fill="url(#cenKsW)"/></svg>',
  budzik: '<svg class="cenIlu" viewBox="0 0 150 150" fill="none" aria-hidden="true"><defs><linearGradient id="cenBuK" x1=".2" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".78"/><stop offset="1" stop-color="currentColor" stop-opacity=".45"/></linearGradient><linearGradient id="cenBuD" x1=".3" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".62"/><stop offset="1" stop-color="currentColor" stop-opacity=".38"/></linearGradient><radialGradient id="cenBuT" cx=".4" cy=".34" r=".72"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#f1ece0"/></radialGradient><radialGradient id="cenBuC" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="currentColor" stop-opacity=".28"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs><ellipse cx="68" cy="133" rx="52" ry="9" fill="url(#cenBuC)"/><path d="M50 118 42 134M100 118l8 16" stroke="currentColor" stroke-opacity=".5" stroke-width="9" stroke-linecap="round"/><ellipse cx="30" cy="27" rx="15" ry="13" transform="rotate(-22 30 27)" fill="url(#cenBuD)"/><ellipse cx="120" cy="27" rx="15" ry="13" transform="rotate(22 120 27)" fill="url(#cenBuD)"/><ellipse cx="26" cy="22" rx="6" ry="4" transform="rotate(-22 26 22)" fill="#fff" fill-opacity=".35"/><ellipse cx="116" cy="22" rx="6" ry="4" transform="rotate(22 116 22)" fill="#fff" fill-opacity=".35"/><rect x="70" y="14" width="10" height="9" rx="4" fill="url(#cenBuD)"/><circle cx="75" cy="76" r="47" fill="url(#cenBuK)"/><circle cx="75" cy="76" r="39" fill="url(#cenBuT)"/><circle cx="75" cy="76" r="39" stroke="currentColor" stroke-opacity=".18" stroke-width="1.5"/><g stroke="currentColor" stroke-opacity=".55" stroke-width="2.6" stroke-linecap="round">M75.0 46.5L75.0 40.5M91.0 48.3L92.8 45.3M102.7 60.0L105.7 58.2M104.5 76.0L110.5 76.0M102.7 92.0L105.7 93.8M91.0 103.7L92.8 106.7M75.0 105.5L75.0 111.5M59.0 103.7L57.3 106.7M47.3 92.0L44.3 93.8M45.5 76.0L39.5 76.0M47.3 60.0L44.3 58.2M59.0 48.3L57.2 45.3</g><path d="M75 76V50" stroke="currentColor" stroke-opacity=".85" stroke-width="4.6" stroke-linecap="round"/><path d="M75 76l15 10" stroke="currentColor" stroke-opacity=".85" stroke-width="4.6" stroke-linecap="round"/><circle cx="75" cy="76" r="4.2" fill="currentColor" fill-opacity=".85"/></svg>'
};

/* ════════════════════════════════════════════════════════════════════════
   DWIE DUŻE KARTY U GÓRY

   Panel odpowiada na dwa pytania, które zadaje się po włączeniu aplikacji:
   „na czym skończyłem" i „co mam dziś powtórzyć". Do wydania 2.63 obie
   odpowiedzi leżały w tym samym szeregu co „ostatnie wyszukiwania" — czyli
   rzecz, po którą się przyszło, miała ten sam głos co rzecz, która wpadła po
   drodze. Teraz mają własne miejsce, własny kolor i własny przycisk.
   ════════════════════════════════════════════════════════════════════════ */

/** „Wczoraj o 18:42" — przy ostatnim studium liczy się też pora dnia. */
function centrKiedyGodz(iso){
  const kiedy = centrKiedy(iso);
  if(!kiedy) return "";
  const d = new Date(iso);
  if(isNaN(d) || (kiedy !== "dziś" && kiedy !== "wczoraj")) return kiedy;
  const dwie = (x)=>String(x).padStart(2, "0");
  return kiedy + " o " + dwie(d.getHours()) + ":" + dwie(d.getMinutes());
}

/**
 * OTOCZENIE OSTATNIEJ NOTATKI — czym właściwie było to studium.
 *
 * Sama nazwa notatki nie mówi, do czego się wraca. Etykieta, przy której
 * wisi, ma zwykle jeszcze kilkanaście innych notatek i kilka wersetów — i to
 * dopiero jest „studium", a nie pojedyncza kartka.
 */
function centrKontekstStudium(n){
  const t = (n.tg && n.tg.length) ? tags.find(x=>x.id === n.tg[0]) : null;
  let ile = 0;
  const wers = new Set();
  if(t) for(const x of notes){
    if(x.del || !x.tg || x.tg.indexOf(t.id) < 0) continue;
    ile++;
    if(x.b && x.ch) wers.add(x.b + ":" + x.ch + ":" + (x.v || 0));
  }
  let pubNazwa = "", pubWyd = "";
  if(n.ks && typeof pubFullName === "function"){
    pubNazwa = pubFullName(n.ks);
    if(n.itn && typeof issueLabel === "function") pubWyd = issueLabel(n.itn);
  }else if(n.pub){ pubNazwa = String(n.pub); }
  else if(n.b && typeof BOOKS !== "undefined" && BOOKS[n.b]){
    pubNazwa = BOOKS[n.b]; pubWyd = n.ch ? String(n.ch) : "";
  }
  return {tag:t, ile, wersetow:wers.size, pubNazwa, pubWyd};
}

function centrHeroKafel(iko, glowne, pod, male){
  return '<span class="cenHeroKafel">' + iko
    + '<span class="cenHeroKafelTxt">'
    + '<b' + (male ? ' class="male"' : '') + '>' + esc(glowne) + '</b>'
    + '<i>' + esc(pod || "") + '</i></span></span>';
}

/** LEWA KARTA: wróć tam, gdzie skończyłeś. */
function centrHeroStudium(kont){
  if(!kont) return "";
  const n = kont.n;
  const k = centrKontekstStudium(n);
  const kafle = [];
  if(k.ile) kafle.push(centrHeroKafel(CEN_IKO.nota, String(k.ile),
    centrOdmiana(k.ile, "notatka", "notatki", "notatek")));
  if(k.wersetow) kafle.push(centrHeroKafel(CEN_IKO.wers, String(k.wersetow),
    centrOdmiana(k.wersetow, "werset", "wersety", "wersetów")));
  if(k.pubNazwa) kafle.push(centrHeroKafel(CEN_IKO.pub, k.pubNazwa, k.pubWyd, true));

  return '<section class="cenHero cenHeroStud">'
    + '<div class="cenHeroTresc">'
    + '<span class="cenChip">' + CEN_IKO.dzis + '<span>Dzisiejsze studium</span></span>'
    + '<h2 class="cenHeroTyt">Kontynuuj ostatnie studium</h2>'
    + '<p class="cenHeroPod">' + esc(k.tag ? k.tag.name : centrTytulNotatki(n)) + '</p>'
    + '<p class="cenHeroMal">Ostatnio studiowane: ' + esc(centrKiedyGodz(n.la) || "niedawno")
    + (kont.wMiejscu ? " · wrócisz tam, gdzie skończyłeś" : "") + '</p>'
    + (kafle.length ? '<div class="cenHeroKafle">' + kafle.join("") + '</div>' : '')
    + '<button type="button" class="cenHeroBtn" data-cnota="' + esc(n.g) + '">'
    + '<span>Otwórz studium</span><span class="cenHeroStrz">' + CEN_IKO.strz + '</span></button>'
    + '</div>'
    + '<div class="cenHeroObraz">' + CEN_ILU.ksiega + '</div>'
    + '</section>';
}

/** PRAWA KARTA: powtórki na dziś. */
function centrHeroPowtorki(dzis){
  const dzien = (typeof dzisRRMMDD === "function") ? dzisRRMMDD()
              : new Date().toISOString().slice(0, 10);
  const ileDni = (d)=>Math.round((Date.parse(dzien) - Date.parse(d)) / 86400000);
  let srodek, dol;

  if(dzis.length){
    srodek = '<div class="cenHeroLicz"><b>' + dzis.length + '</b><span>'
      + esc(centrOdmiana(dzis.length, "notatka", "notatki", "notatek")) + '</span></div>';
    dol = '<div class="cenPowtLista">'
      + dzis.slice(0, 3).map(n=>{
          const ile = ileDni(String(n.pwt.d));
          const kiedy = (isFinite(ile) && ile > 0)
            ? ile + " " + centrOdmiana(ile, "dzień", "dni", "dni") + " temu" : "na dziś";
          return '<button type="button" class="cenPowtPoz" data-cnota="' + esc(n.g) + '">'
            + '<span class="cenPowtNazwa">' + esc(centrTytulNotatki(n)) + '</span>'
            + '<span class="cenPowtKiedy' + (ile > 0 ? " zal" : "") + '">' + esc(kiedy) + '</span>'
            + '</button>';
        }).join("")
      + '</div>'
      + '<button type="button" class="cenHeroBtn cenHeroBtnP" data-cakcja="powtorki">'
      + '<span>Rozpocznij powtórki</span><span class="cenHeroStrz">' + CEN_IKO.strz + '</span></button>';
  }else{
    /* Zero powtórek to dobra wiadomość, więc nie pokazujemy wielkiego zera —
       zero wygląda jak zaległość, a jest jej brakiem. */
    const przyszle = centrZywe().filter(n=>n.pwt && n.pwt.d && String(n.pwt.d) > dzien)
      .sort((a, b)=>String(a.pwt.d).localeCompare(String(b.pwt.d)));
    const za = przyszle.length ? -ileDni(String(przyszle[0].pwt.d)) : 0;
    srodek = '<div class="cenHeroLicz cenHeroLiczOk"><b>✓</b><span>nic na dziś</span></div>';
    dol = '<p class="cenHeroMal">' + (przyszle.length
      ? "Najbliższa powtórka za " + za + " " + esc(centrOdmiana(za, "dzień", "dni", "dni"))
        + ": " + esc(centrTytulNotatki(przyszle[0]))
      : "Powtórkę ustawia się w notatce: ⋯ → Powróć do tego za…") + '</p>';
  }

  /* Karta powtórek dzieli się na dwa piętra: kolorowy pas z liczbą i budzikiem,
     pod nim spokojna lista. Gdy budzik leżał na całej karcie, wchodził na
     pierwszy wiersz listy i zasłaniał „6 dni temu" — czyli akurat to, po co
     ta lista jest. Pas zamyka rysunek w miejscu, gdzie nie ma tekstu. */
  return '<section class="cenHero cenHeroPowt">'
    + '<div class="cenHeroTresc">'
    + '<div class="cenHeroPas">'
    + '<span class="cenChip">' + CEN_IKO.powt + '<span>Do powtórki dziś</span></span>'
    + srodek
    + '<div class="cenHeroObraz">' + CEN_ILU.budzik + '</div>'
    + '</div>'
    + '<div class="cenHeroDol">' + dol + '</div>'
    + '</div>'
    + '</section>';
}

/* ════════════════════════════════════════════════════════════════════════
   TWOJE STUDIUM — CZTERY LICZBY I WYKRES

   Liczby liczą się z notatek przy każdym rysowaniu, jednym przebiegiem.
   Nic nie jest zapisywane „od teraz": ktoś, kto wgrał osiem tysięcy notatek
   z JW Library, ma pełną statystykę od pierwszego uruchomienia.
   ════════════════════════════════════════════════════════════════════════ */

const CENTR_ZAKRES_KLUCZ = KP + "CentrumZakres";
const CENTR_ZAKRESY = [7, 30, 90];

/**
 * Cztery liczby razem z przyrostem z ostatniego tygodnia — wszystko jednym
 * przebiegiem po notatkach, bo przy ośmiu tysiącach cztery osobne przebiegi
 * to cztery razy ta sama praca.
 *
 * „+3 w tym tygodniu" przy wersetach znaczy: tyle wersetów pojawiło się
 * w notatkach z tego tygodnia, a NIE występowało w żadnej starszej. Inaczej
 * przyrost pokazywałby powroty do wersetów, które są w bazie od lat.
 */
function centrStatystyki(){
  const tydzien = Date.now() - 7 * 86400000;
  const wersStare = new Set(), wersNowe = new Set();
  const tagStare = new Set(), tagNowe = new Set();
  let notatek = 0, notatekNowych = 0, ulubione = 0, ulubioneNowe = 0;
  for(const n of notes){
    if(n.del) continue;
    notatek++;
    const cr = Date.parse(n.cr || "");
    const swieza = isFinite(cr) && cr >= tydzien;
    if(swieza) notatekNowych++;
    if(n.fav){ ulubione++; if(swieza) ulubioneNowe++; }
    if(n.b && n.ch) (swieza ? wersNowe : wersStare).add(n.b + ":" + n.ch + ":" + (n.v || 0));
    if(n.tg) for(const id of n.tg) (swieza ? tagNowe : tagStare).add(id);
  }
  let wersDelta = 0;
  wersNowe.forEach(w=>{ if(!wersStare.has(w)) wersDelta++; });
  let tagDelta = 0;
  tagNowe.forEach(id=>{ if(!tagStare.has(id)) tagDelta++; });
  return {
    notatek, notatekNowych,
    wersetow:wersStare.size + wersDelta, wersDelta,
    tematow:tags.length, tagDelta,
    ulubione, ulubioneNowe
  };
}

/**
 * AKTYWNOŚĆ DZIEŃ PO DNIU: ile notatek danego dnia doszło albo było zmienionych.
 *
 * Same „dodane" pokazywałyby dzień spędzony na poprawianiu starych notatek
 * jako dzień pusty — a to najczęstszy rodzaj studium po pierwszym roku.
 * Notatka dodana i zmieniona tego samego dnia liczy się raz.
 */
function centrAktywnosc(dni){
  const kubelki = new Array(dni).fill(0);
  const t = new Date();
  const baza = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  const gdzie = (iso)=>{
    const ms = Date.parse(iso || "");
    if(!isFinite(ms)) return -1;
    const d = new Date(ms);
    const doba = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const wstecz = Math.round((baza - doba) / 86400000);
    return (wstecz >= 0 && wstecz < dni) ? (dni - 1 - wstecz) : -1;
  };
  for(const n of notes){
    if(n.del) continue;
    const a = gdzie(n.cr);
    if(a >= 0) kubelki[a]++;
    const b = gdzie(n.mo);
    if(b >= 0 && b !== a) kubelki[b]++;
  }
  return kubelki;
}

function centrDataKrotka(przesun){
  const t = new Date();
  const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - przesun);
  return d.getDate() + "." + String(d.getMonth() + 1).padStart(2, "0");
}

/** Sam rysunek — osobno, bo przełącznik 7/30/90 odświeża tylko jego. */
function centrWykresRys(dni){
  const dane = centrAktywnosc(dni);
  const max = Math.max(1, ...dane);
  const W = 320, H = 96, mX = 6, mY = 10;
  const x = (i)=>mX + (dane.length === 1 ? (W - 2 * mX) / 2 : i * (W - 2 * mX) / (dane.length - 1));
  const y = (v)=>mY + (H - 2 * mY) * (1 - v / max);
  const punkty = dane.map((v, i)=>x(i).toFixed(1) + "," + y(v).toFixed(1));
  const obszar = "M" + x(0).toFixed(1) + "," + (H - mY).toFixed(1)
    + "L" + punkty.join("L") + "L" + x(dane.length - 1).toFixed(1) + "," + (H - mY).toFixed(1) + "Z";
  /* Kropki tylko przy krótkich zakresach: dziewięćdziesiąt kółek na 320 px
     zlewa się w pasek i zamiast pokazywać dni, zamazuje linię. */
  const kropki = dni <= 30
    ? dane.map((v, i)=>'<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1)
        + '" r="2.6"><title>' + centrDataKrotka(dane.length - 1 - i) + ": " + v + " "
        + centrOdmiana(v, "notatka", "notatki", "notatek") + '</title></circle>').join("")
    : "";
  const suma = dane.reduce((a, b)=>a + b, 0);
  return '<svg class="cenWykresRys" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"'
    + ' role="img" aria-label="Aktywność z ostatnich ' + dni + ' dni: razem ' + suma
    + ' notatek, najwięcej ' + max + ' jednego dnia">'
    + '<path class="cenWykresPole" d="' + obszar + '"/>'
    + '<polyline class="cenWykresLinia" points="' + punkty.join(" ") + '"/>'
    + '<g class="cenWykresKropki">' + kropki + '</g>'
    + '</svg>'
    + '<div class="cenWykresOsie"><span>' + esc(centrDataKrotka(dni - 1)) + '</span>'
    + '<span class="cenWykresMax">najwięcej ' + max + ' dziennie · razem ' + suma + '</span>'
    + '<span>dziś</span></div>';
}

function centrWykres(){
  let dni = parseInt(lsGet(CENTR_ZAKRES_KLUCZ, "30"), 10);
  if(CENTR_ZAKRESY.indexOf(dni) < 0) dni = 30;
  return '<div class="cenWykres" id="cenWykres">'
    + '<div class="cenWykresGl"><b>Twoja aktywność</b></div>'
    + '<div class="cenWykresPlot">' + centrWykresRys(dni) + '</div>'
    + '<div class="cenZakres">' + CENTR_ZAKRESY.map(d=>
        '<button type="button" class="cenZakresB' + (d === dni ? " on" : "") + '" data-czakres="'
        + d + '">' + d + ' dni</button>').join("") + '</div>'
    + '</div>';
}

function centrStatKafel(id, iko, ile, tyt, delta){
  return '<button type="button" class="cenKafel" data-cstat="' + id + '">'
    + '<span class="cenKafelIko">' + iko + '</span>'
    + '<span class="cenKafelIle">' + ile + '</span>'
    + '<span class="cenKafelTyt">' + esc(tyt) + '</span>'
    + '<span class="cenKafelOpis">' + (delta > 0 ? "+" + delta + " w tym tygodniu" : "bez zmian") + '</span>'
    + '</button>';
}

/* ════════════════════════════════════════════════════════════════════════
   PASEK SZYBKICH DZIAŁAŃ

   Sześć rzeczy, które robi się najczęściej, a do których dotąd trzeba było
   wiedzieć, gdzie iść: nowa notatka siedzi w pasku górnym, ulubione pod
   szybkim filtrem w kolumnie etykiet, uzgadnianie w Ustawieniach, postępy
   na samym dole panelu. Każdy kafelek prowadzi TAM, GDZIE TA RZECZ SIĘ DZIEJE
   — żaden nie jest ozdobą ani drugą drogą do tego samego okna.
   ════════════════════════════════════════════════════════════════════════ */
/* `napis` to pełna nazwa — idzie do podpowiedzi i do czytnika ekranu.
   `krotki` to napis widoczny na pasku: w rzędzie plakietek liczy się jedno
   słowo, bo sześć pełnych nazw robi z paska drugą listę do przeczytania. */
const CENTR_SZYBKIE = [
  {id:"notatka",  iko:"notePen",   napis:"Szybka notatka",   krotki:"Notatka"},
  {id:"biblia",   iko:"books",     napis:"Studium biblijne", krotki:"Studium"},
  {id:"kolejka",  iko:"bookOpen",  napis:"Kolejka czytania", krotki:"Kolejka"},
  {id:"inbox",    iko:"notes",     napis:"Do opracowania",   krotki:"Opracuj"},
  {id:"powtorki", iko:"target",    napis:"Powtórki",         krotki:"Powtórki"},
  {id:"sync",     iko:"cloudSync", napis:"Synchronizacja",   krotki:"Synchronizacja"},
  {id:"ulubione", iko:"heart",     napis:"Ulubione",         krotki:"Ulubione"},
  {id:"postepy",  iko:"trend",     napis:"Postępy",          krotki:"Postępy"}
];
function centrSzybkie(){
  return '<div class="cenSzybkie">'
    + '<div class="cenSzybEt">Szybkie akcje</div>'
    + '<div class="cenSzybRzad">' + CENTR_SZYBKIE.map(k=>
      '<button type="button" class="cenSzyb" data-cszyb="' + k.id + '"'
      + ' title="' + esc(k.napis) + '" aria-label="' + esc(k.napis) + '">'
      + '<span class="cenSzybIko">' + ICO[k.iko] + '</span>'
      + '<span class="cenSzybTxt">' + esc(k.krotki) + '</span>'
      + '</button>').join("") + '</div></div>';
}

/**
 * Dokąd prowadzi kafelek. Wydzielone z obsługi kliknięć, bo to jest cała
 * treść tej funkcji — reszta to tylko znalezienie, w co kliknięto.
 */
function centrSzybkieDzialanie(co){
  const naListe = ()=>{
    centrumSchowaj();
    if(innerWidth <= 900 && typeof mobileShow === "function") mobileShow("colNotes");
  };
  if(co === "notatka"){ const b = $("btnNew"); if(b) b.click(); return; }
  if(co === "biblia"){
    if(typeof quickFilter !== "undefined") quickFilter = "all";
    if(typeof sortMode !== "undefined"){
      sortMode = "bible";
      const sel = $("sortSel");
      if(sel && [...sel.options].some(o=>o.value === "bible")){ sel.value = "bible"; lsSet(KP + "Sort", "bible"); }
    }
    centrumSchowaj();
    /* Na telefonie kolumny są jedna na raz, więc „studium biblijne" musi
       pokazać KSIĘGI, a nie listę notatek posortowaną biblijnie — inaczej
       kafelek wyglądałby, jakby nic nie zrobił. */
    if(innerWidth <= 900 && typeof mobileShow === "function") mobileShow("colBooks");
    return;
  }
  if(co === "powtorki"){
    if(typeof quickFilter !== "undefined") quickFilter = "powtorka";
    naListe(); return;
  }
  if(co === "kolejka" || co === "inbox"){
    if(typeof quickFilter !== "undefined") quickFilter = co==="kolejka" ? "cenq" : "ceni";
    naListe(); return;
  }
  if(co === "bezpieczenstwo"){
    if(typeof otworzCentrumBezpieczenstwa==="function") otworzCentrumBezpieczenstwa();
    return;
  }
  if(co === "ulubione"){
    if(typeof quickFilter !== "undefined") quickFilter = "fav";
    naListe(); return;
  }
  if(co === "sync"){
    /* Gdy plik uzgadniania jest wskazany — uzgadniamy od razu. Gdy nie ma go
       jeszcze wcale, sam komunikat „wskaż plik w Ustawieniach" byłby ślepym
       zaułkiem, więc otwieramy te Ustawienia. */
    if(typeof syncUchwyt === "function" && typeof syncTeraz === "function"){
      syncUchwyt().then(u=>{
        if(u) syncTeraz("ręcznie");
        else if(typeof openSettings === "function") openSettings();
      }).catch(()=>{ if(typeof openSettings === "function") openSettings(); });
    }else if(typeof openSettings === "function") openSettings();
    return;
  }
  if(co === "postepy"){
    const cel = $("centrum") && $("centrum").querySelector('.cenKarta[data-sek="statystyki"]');
    if(cel){
      cel.scrollIntoView({block:"nearest", behavior:"smooth"});
      cel.classList.remove("cenMrug");
      void cel.offsetWidth;
      cel.classList.add("cenMrug");
      setTimeout(()=>cel.classList.remove("cenMrug"), 1400);
    }
  }
}

function centrTwojeStudium(){
  const s = centrStatystyki();
  /* Ta sama klasa co karty sekcji — nagłówek, ramka, pasek koloru u góry
     i zachowanie na telefonie mają być te same, więc nie ma po co pisać ich
     drugi raz. `cenStat` dokłada tylko własny środek. */
  return '<section class="cenKarta cenStat" data-sek="statystyki">'
    + '<h3>' + CEN_IKO.wykr + '<span>Twoje studium</span></h3>'
    + '<div class="cenStatTresc">'
    + '<div class="cenStatKafle">'
    + centrStatKafel("notatki", CEN_IKO.nota, s.notatek,
        centrOdmiana(s.notatek, "notatka", "notatki", "notatek"), s.notatekNowych)
    /* Otwarta ksiega, nie zakladka: zakladka zostaje sekcji „Ostatnio uzywane
       wersety", zeby dwie rozne rzeczy nie mialy tego samego rysunku. */
    + centrStatKafel("wersety", CEN_IKO.czyt, s.wersetow,
        centrOdmiana(s.wersetow, "werset", "wersety", "wersetów"), s.wersDelta)
    + centrStatKafel("tematy", CEN_IKO.etyk, s.tematow,
        centrOdmiana(s.tematow, "temat", "tematy", "tematów"), s.tagDelta)
    + centrStatKafel("ulubione", CEN_IKO.gwiazd, s.ulubione,
        centrOdmiana(s.ulubione, "ulubiona", "ulubione", "ulubionych"), s.ulubioneNowe)
    + '</div>'
    + centrWykres()
    + '</div></section>';
}

/**
 * PASEK NA DOLE.
 *
 * Świadomie NIE cytuje tu Pisma. Aplikacja nie ma w sobie tekstu biblijnego —
 * ma tylko nazwy ksiąg — więc każdy „werset" w tym miejscu byłby wpisany
 * z pamięci, a wpisany z pamięci werset w narzędziu do studium to ostatnia
 * rzecz, jakiej ktokolwiek tu potrzebuje. Zamiast tego krótkie zdanie
 * o samym studiowaniu, zmieniane co dzień.
 */
const CENTR_ZDANIA = [
  "Krótkie i regularne studium zostawia więcej niż długie i rzadkie.",
  "Notatka zapisana dziś jest warta więcej niż doskonała notatka za tydzień.",
  "Powtórka po kilku dniach utrwala więcej niż ponowne czytanie tego samego.",
  "Własnymi słowami zapamiętuje się lepiej niż cudzymi.",
  "Jedno dobrze zrozumiane zagadnienie znaczy więcej niż dziesięć przejrzanych.",
  "Warto zapisać pytanie, nawet gdy odpowiedź przyjdzie później.",
  "Studium bez notatek ulatuje szybciej, niż się wydaje."
];
function centrStopka(){
  const t = new Date();
  const dzien = Math.floor((t - new Date(t.getFullYear(), 0, 0)) / 86400000);
  return '<div class="cenStopka">'
    + '<span class="cenStopkaL">' + CEN_IKO.zarow
    + '<span>' + esc(CENTR_ZDANIA[dzien % CENTR_ZDANIA.length]) + '</span></span>'
    + '<span class="cenStopkaP">' + ICO.heart + '<span>Miłego studium!</span></span>'
    + '</div>';
}

/* ——— WIERSZE O WŁASNYM KSZTAŁCIE ———
   Trzy sekcje pokazują co innego niż samą nazwę, więc mają własne wiersze.
   Wszystkie zostają przy klasie `.cenPoz`: po niej liczy się pozycje w karcie
   (sekcja pokazuje najwyżej sześć, i to jest sprawdzane). */

/** OSTATNIO STUDIOWANE — z paskiem „ile z notatki za mną". */
function centrWierszStudiowane(n, ulamek){
  const skad = [];
  if(n.ks && typeof pubFullName === "function") skad.push(pubFullName(n.ks));
  else if(n.b && typeof BOOKS !== "undefined" && BOOKS[n.b])
    skad.push(BOOKS[n.b] + (n.ch ? " " + n.ch : ""));
  skad.push(centrKiedy(n.la));
  return '<button type="button" class="cenPoz cenPozS" data-cnota="' + esc(n.g) + '">'
    + '<span class="cenPozIko">' + CEN_IKO.nota + '</span>'
    + '<span class="cenNazwa">' + esc(centrTytulNotatki(n)) + '</span>'
    + '<span class="cenOpis">' + esc(skad.filter(Boolean).join(" · ")) + '</span>'
    + '<span class="cenPozStrz">' + CEN_IKO.strz + '</span>'
    + (ulamek
        ? '<span class="cenPasek"><i style="width:' + ulamek + '%"></i></span>'
          + '<span class="cenPasekP">' + ulamek + '%</span>'
        : '')
    + '</button>';
}

/** OSTATNIO DODANE — data z przodu, bo tu pytanie brzmi KIEDY, nie SKĄD. */
function centrWierszDodane(n){
  const d = new Date(n.cr);
  /* Rok tylko wtedy, gdy inny niż bieżący. W karcie szerokiej na 259 px pełna
     data zabierała 80 px i tytuł zostawał w postaci „Chwast i pszenic…" —
     a rok „2026" przy notatce sprzed dwóch dni i tak niczego nie wnosi. */
  const teraz = new Date().getFullYear();
  const data = isNaN(d) ? "" : String(d.getDate()).padStart(2, "0") + "."
    + String(d.getMonth() + 1).padStart(2, "0")
    + (d.getFullYear() === teraz ? "" : "." + String(d.getFullYear()).slice(2));
  return '<button type="button" class="cenPoz cenPozD" data-cnota="' + esc(n.g) + '">'
    + '<span class="cenData">' + esc(data) + '</span>'
    + '<span class="cenNazwa">' + esc(centrTytulNotatki(n)) + '</span>'
    + '<span class="cenOpis">' + esc(centrKiedy(n.cr)) + '</span>'
    + '</button>';
}

/* Kolor okładki bierze się z symbolu publikacji, więc ta sama publikacja ma
   zawsze ten sam kolor — inaczej okładki zmieniałyby barwę przy każdym
   przerysowaniu i przestałyby cokolwiek znaczyć. */
const CEN_OKLADKI = ["#2e7d32", "#1565c0", "#8e24aa", "#c62828", "#00796b", "#ef6c00", "#4527a0", "#5d4037"];
function centrPubKolor(klucz){
  let h = 0;
  const s = String(klucz);
  for(let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return CEN_OKLADKI[h % CEN_OKLADKI.length];
}

/** ULUBIONE PUBLIKACJE — okładki, bo publikację rozpoznaje się po wyglądzie. */
function centrKafelPublikacji(pu){
  const [ks, itn] = String(pu.klucz).split("|");
  const nazwa = (ks === "—" || !ks) ? "Bez oznaczenia"
    : (typeof pubFullName === "function" ? pubFullName(ks) : ks);
  const wyd = (itn && typeof issueLabel === "function") ? issueLabel(itn) : "";
  /* Okładka złożona z czterech warstw, bo tak wygląda książka postawiona na
     półce i obrócona lekko do widza: przednia okładka, ciemniejszy GRZBIET po
     prawej, jasny BLOK KARTEK u góry i biała ETYKIETA z symbolem publikacji.
     Jednowarstwowy prostokąt z gradientem czytał się jak kolorowa płytka. */
  return '<button type="button" class="cenPoz cenPozP" data-cpub="' + esc(pu.klucz) + '">'
    + '<span class="cenOkladka" style="--ok:' + centrPubKolor(pu.klucz) + '">'
    + '<span class="cenOkladkaGora"></span>'
    + '<span class="cenOkladkaGrz"></span>'
    + '<span class="cenOkladkaEt">' + esc((ks || "?").slice(0, 4)) + '</span></span>'
    + '<span class="cenNazwa">' + esc(nazwa) + (wyd ? '<i>' + esc(wyd) + '</i>' : '') + '</span>'
    + '<span class="cenOpis">' + pu.ile + " " + esc(centrOdmiana(pu.ile, "notatka", "notatki", "notatek")) + '</span>'
    + '</button>';
}

function rysujCentrum(){
  const el = $("centrum"); if(!el) return;
  _cenPamiec = {};                 // pamięć na czas tego jednego rysowania
  try{
    /* Stary renderer zostaje awaryjną drogą dla niepełnych, ręcznie sklejonych
       kopii pliku. W pełnym wydaniu zawsze działa kompozycja 3.06. */
    if(typeof rysujCentrumWnetrze306==="function") rysujCentrumWnetrze306(el);
    else rysujCentrumWnetrze(el);
  }
  finally{ _cenPamiec = null; }    // i ani chwili dłużej
}
function rysujCentrumWnetrze(el){
  const kont = centrKontynuuj();
  const dzis = centrNaDzis();
  const niedok = centrNiedokonczone();
  const ulamki = (typeof readFracAll === "function") ? readFracAll() : {};

  let html = '<div class="cenNagl">'
    + '<div class="cenTyt"><b>Centrum studium</b>'
    + '<span>' + esc(centrPowitanie()) + '</span></div>'
    + '<button type="button" class="btn" data-cakcja="lista">Pokaż wszystkie notatki</button>'
    + '</div>';

  /* ——— KOLEKCJE + CZYTELNIA: główny punkt wejścia do własnego studium. ——— */
  if(typeof pubTabsFor === "function") html += centrBiblioteka(kont, dzis);
  else{
    /* Awaryjny układ dla niepełnej, ręcznie sklejonej kopii index.html. */
    const hero = centrHeroStudium(kont) + centrHeroPowtorki(dzis);
    if(hero) html += '<div class="cenGora">' + hero + '</div>';
  }

  /* ——— SZEŚĆ SKRÓTÓW ——— */
  html += centrSzybkie();

  /* ——— CZTERY KARTY: skąd wracać do notatek ——— */
  html += '<div class="cenSiatka">';

  html += centrSekcja("studiowane", "Ostatnio studiowane", CEN_IKO.czyt,
    centrOstatnioStudiowane(kont ? kont.n.g : null)
      .map(n=>centrWierszStudiowane(n, ulamki[n.g] || 0)),
    {wszystkie:"studiowane"});

  html += centrSekcja("dodane", "Ostatnio dodane", CEN_IKO.nowe,
    centrOstatnioDodane().map(centrWierszDodane),
    {wszystkie:"dodane"});

  html += centrSekcja("wersety", "Ostatnio używane wersety", CEN_IKO.wers,
    centrWersety().map(w=>
      '<button type="button" class="cenPoz" data-cwers="' + w.b + ":" + w.ch + '">'
      + '<span class="cenNazwa">' + esc(w.etykieta) + '</span>'
      + '<span class="cenOpis">' + w.ile + " " + esc(centrOdmiana(w.ile, "notatka", "notatki", "notatek")) + '</span>'
      + '<span class="cenPozStrz">' + CEN_IKO.strz + '</span>'
      + '</button>'),
    {wszystkie:"wersety"});



  html += '</div>';

  /* ——— NIŻSZY RZĄD: rzeczy, po które się nie przychodzi, ale które szkoda
     zgubić. Mniejsze karty, bo mniejszy ciężar. ——— */
  const maly = centrSekcja("niedok", "Niedokończone", CEN_IKO.zadan,
      niedok.map(x=>centrWierszNotatki(x.n,
        "zostało " + x.zostalo + " z " + x.razem + (x.razem === 1 ? " zadania" : " zadań"))),
      {plakietka:niedok.length, wszystkie:"niedok"})
    + centrSekcja("szukania", "Ostatnie wyszukiwania", CEN_IKO.szuk,
      centrSzukania().map(q=>
        '<button type="button" class="cenPoz" data-cszuk="' + esc(q) + '">'
        + '<span class="cenNazwa">' + esc(q) + '</span>'
        + '<span class="cenOpis">szukaj znowu</span>'
        + '<span class="cenPozStrz">' + CEN_IKO.strz + '</span>'
        + '</button>'));
  if(maly) html += '<div class="cenSiatkaM">' + maly + '</div>';

  /* ——— TWOJE STUDIUM: cztery liczby i wykres ———
     Przy pustej bazie podsumowanie odpada: cztery zera i płaska linia to nie
     jest powitanie, tylko wypomnienie. Wraca z pierwszą notatką. */
  if(notes.some(n=>!n.del)) html += centrTwojeStudium();

  /* Puste Centrum musi tłumaczyć, a nie tylko być puste. */
  if(!kont && !dzis.length && !niedok.length && !centrOstatnioDodane().length){
    html += '<div class="cenPusto">'
      + '<b>Jeszcze nie ma z czego zbudować podsumowania.</b>'
      + 'Centrum pokazuje to, co już zrobiłeś: ostatnio otwierane notatki, '
      + 'zaplanowane powtórki, niedokończone listy zadań, używane wersety. '
      + 'Dodaj pierwszą notatkę albo wczytaj kopię z JW Library — wypełni się samo.'
      + '</div>';
  }

  html += centrStopka();
  setHtml(el, html);
}

/* ══════════════ BOCZNA NAWIGACJA CENTRUM (v3.08) ══════════════ */
function centrBoczna(){
  const zywe=centrZywe();
  const lic={
    projekty:tags.filter(t=>t.cproj).length,
    kolejka:zywe.filter(n=>n.cenq).length,
    inbox:zywe.filter(n=>n.ceni).length
  };
  const pozycje=[
    ["centrum","Centrum",ICO.bars,0],
    ["projekty","Projekty",ICO.tag,lic.projekty],
    ["kolejka","Do przeczytania",ICO.bookOpen,lic.kolejka],
    ["inbox","Do opracowania",ICO.notePen,lic.inbox],
    ["ostatnie","Ostatnie",ICO.clock,0],
    ["bezpieczenstwo","Bezpieczeństwo",ICO.save,0]
  ];
  const nazwa=(pozycje.find(x=>x[0]===centrWidok)||pozycje[0])[1];
  const nav=pozycje.map(x=>'<button type="button" class="cenBoczPoz'+(centrWidok===x[0]?' on':'')+'" data-cwidok="'+x[0]+'"'
    +(centrWidok===x[0]?' aria-current="page"':'')+'>'+x[2]+'<span>'+esc(x[1])+'</span>'
    +(x[3]?'<small>'+x[3]+'</small>':'')+'</button>').join('');
  return '<button type="button" class="cenMenuMobilne" data-cakcja="menu-centrum" aria-expanded="'+centrMenuOtwarte+'">'
    +'<span>'+ICO.bars+esc(nazwa)+'</span>'+CEN_IKO.strz+'</button>'
    +'<aside class="cenBoczna'+(centrMenuOtwarte?' otwarte':'')+'"><span class="cenBoczTyt">Studium</span>'
    +'<nav class="cenBoczNav" aria-label="Widoki Centrum Studium">'+nav+'</nav></aside>';
}

function centrNaglowekWidoku(){
  const opisy={
    centrum:["Centrum studium",centrPowitanie()],
    projekty:["Projekty","Łącz notatki z różnych wersetów i publikacji"],
    kolejka:["Do przeczytania","Materiały odłożone do spokojnego przeczytania"],
    inbox:["Do opracowania","Pomysły i szkice czekające na rozwinięcie"],
    ostatnie:["Ostatnia praca","Wróć do niedawno używanych materiałów"],
    bezpieczenstwo:["Bezpieczeństwo danych","Kopia, pamięć i kontrola bazy"]
  };
  const o=opisy[centrWidok]||opisy.centrum;
  if(centrWidok === "centrum"){
    const akcje='<button type="button" class="btn" data-cakcja="dostosuj" aria-expanded="'+centrDostosujOtwarte+'">'
      +ICO.gear+' Dostosuj</button><button type="button" class="btn" data-cakcja="lista">Pokaż wszystkie notatki</button>';
    return '<div class="cenNagl"><div class="cenTyt"><b>'+esc(o[0])+'</b><span>'+esc(o[1])+'</span></div>'
      +'<div class="cenNaglAkcje">'+akcje+'</div></div>';
  }
  const akcje='<button type="button" class="btn" data-cakcja="lista">Wszystkie notatki</button>';
  return '<div class="cenSubHeader">'
    +'<div class="cenSubHeaderLewo">'
    +'<button type="button" class="cenSubWsteczBtn" data-cwidok="centrum">' + CEN_MODERN_ICO.chevronLeft + ' <span>Centrum</span></button>'
    +'<div class="cenSubTytulBox">'
    +'<div class="cenSubTytul">'+esc(o[0])+'</div>'
    +'<div class="cenSubPodtytul">'+esc(o[1])+'</div>'
    +'</div></div>'
    +'<div class="cenNaglAkcje">'+akcje+'</div>'
    +'</div>';
}

function centrOstatnieSekcje(kont){
  const ulamki=(typeof readFracAll==="function")?readFracAll():{};
  let h='<div class="cenSiatka cenSiatkaTrio">';
  h+=centrSekcja("studiowane","Ostatnio studiowane",CEN_IKO.czyt,
    centrOstatnioStudiowane(kont?kont.n.g:null).map(n=>centrWierszStudiowane(n,ulamki[n.g]||0)),{wszystkie:"studiowane"});
  h+=centrSekcja("dodane","Ostatnio dodane",CEN_IKO.nowe,
    centrOstatnioDodane().map(centrWierszDodane),{wszystkie:"dodane"});
  h+=centrSekcja("wersety","Ostatnio używane wersety",CEN_IKO.wers,
    centrWersety().map(w=>
      '<button type="button" class="cenPoz" data-cwers="'+w.b+':'+w.ch+'"><span class="cenPozIko">'+CEN_IKO.wers+'</span><span class="cenNazwa">'+esc(w.etykieta)+'</span>'
      +'<span class="cenOpis">'+w.ile+' '+esc(centrOdmiana(w.ile,"notatka","notatki","notatek"))+'</span><span class="cenPozStrz">'+CEN_IKO.strz+'</span></button>'),
    {wszystkie:"wersety"});
  return h+'</div>';
}

function centrPodstronaProjektow(){
  const projekty=centrProjekty();
  const lista=projekty.length ? projekty.map(x=>
    '<button type="button" class="cenProjekt" data-cprojekt="'+x.tag.id+'" style="--proj:'+(x.tag.color||'var(--accent)')+'">'
    +'<i></i><span>'+esc(x.tag.name)+'</span><small>'+x.ile+'</small></button>').join('')
    : '<div class="cenPodPusto">Nie masz jeszcze projektu. Projekt może łączyć dowolne notatki z różnych miejsc.</div>';
  return '<section class="cenPodstrona"><div class="cenPodAkcje"><span>'+projekty.length+' '
    +esc(centrOdmiana(projekty.length,"projekt","projekty","projektów"))+'</span>'
    +'<button type="button" class="cenLink" data-cakcja="nowy-projekt">＋ Nowy projekt</button></div>'
    +'<div class="cenProjektLista cenProjektListaPelna">'+lista+'</div></section>';
}

function centrPodstronaKolejki(pole){
  const lista=centrKolejka(pole), jestKolejka=pole==="cenq";
  const wiersze=lista.slice(0,80).map(n=>centrWierszNotatki(n,centrKiedy(n[pole]||n.mo||n.cr))).join('');
  const pusto='<div class="cenPodPusto">Dodasz tu notatkę przez <b>Więcej → Centrum Studium</b>.</div>';
  return '<section class="cenPodstrona"><div class="cenPodAkcje"><span>'+lista.length+' '
    +esc(centrOdmiana(lista.length,"notatka","notatki","notatek"))+'</span></div>'
    +'<div class="cenPodLista">'+(wiersze||pusto)+'</div>'
    +(lista.length>80?'<div class="cenPodStop"><button type="button" class="btn" data-cszyb="'+(jestKolejka?'kolejka':'inbox')+'">Pokaż pełną listę</button></div>':'')
    +'</section>';
}

function centrPodstronaBezpieczenstwa(){
  return '<section class="cenPodstrona"><div class="cenPodPusto">Tutaj szybko sprawdzisz, czy notatki są zabezpieczone. '
    +'Pełna kontrola nie zmienia danych.</div><div class="cenBezPelne">'+centrBezpieczenstwoMini()+'</div></section>';
}

/** Kompozycja 3.06 rozwinięta o boczną nawigację w 3.08. Każdy duży blok powstaje dopiero wtedy, gdy jest widoczny,
    więc ukrycie statystyk lub sekcji z zadaniami oszczędza również obliczenia. */
function centrWidokPulpitGlowny(){ return renderCentrumWidok(); }

function rysujCentrumWnetrze306(el){
  let tresc = '';
  if(centrWidok === "centrum") tresc = renderCentrumWidok();
  else if(centrWidok === "czytanie-chronologiczne") tresc = centrWidokCzytanieChrono();
  else if(centrWidok === "dzien") tresc = centrWidokDzien(_centrWybranyDzien || _centrZnajdzBiezacyDzienPlanu(_centrAktywnyPlanId) || 1);
  else if(centrWidok === "lista-dni") tresc = centrWidokListaDni(_centrListaTab, _centrListaSzukaj);
  else if(centrWidok === "statystyki") tresc = centrWidokStatystyki(_centrStatTab);
  else if(centrWidok === "kalendarz") tresc = centrWidokKalendarz(_centrKalRok, _centrKalMies);
  else if(centrWidok === "moje-plany") tresc = centrWidokMojePlany();
  else if(centrWidok === "studium-osobiste") tresc = centrWidokStudiumOsobiste(_centrStudiumTab);
  else if(centrWidok === "temat-szczegoly") tresc = centrWidokTematSzczegoly(_centrWybranyTematId);
  else if(centrWidok === "projekty") tresc = centrNaglowekWidoku() + centrPodstronaProjektow();
  else if(centrWidok === "kolejka") tresc = centrNaglowekWidoku() + centrPodstronaKolejki("cenq");
  else if(centrWidok === "inbox") tresc = centrNaglowekWidoku() + centrPodstronaKolejki("ceni");
  else if(centrWidok === "ostatnie") tresc = centrNaglowekWidoku() + centrOstatnieSekcje(centrKontynuuj());
  else if(centrWidok === "bezpieczenstwo") tresc = centrNaglowekWidoku() + centrPodstronaBezpieczenstwa();
  else tresc = renderCentrumWidok();

  const html = '<div class="cenCentrumShell">' + centrBoczna() + '<div class="cenCentrumMain">'
    + tresc + '</div></div>';
  setHtml(el, html);
}

/** Nagłówek mówi, jaki dziś dzień — Centrum ma być „na dziś", nie „ogólnie". */
function centrPowitanie(){
  const dni = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
  const mies = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca",
                "sierpnia", "września", "października", "listopada", "grudnia"];
  const d = new Date();
  return dni[d.getDay()] + ", " + d.getDate() + " " + mies[d.getMonth()];
}

/**
 * Przełącza widok kolumny notatek. Wołane z renderAll() po każdej zmianie
 * filtrów — dzięki temu Centrum i lista nie mogą być widoczne naraz ani obie
 * schowane, niezależnie od tego, co użytkownik nacisnął.
 */
function centrumOdswiez(){
  const c = $("centrum"), l = $("noteList");
  if(!c || !l) return;
  const pokaz = centrumWidoczne();
  if(pokaz) rysujCentrum();
  c.hidden = !pokaz;
  l.style.display = pokaz ? "none" : "";
  const pasek=$("pasekListy"); if(pasek) pasek.hidden=pokaz;
  document.body.classList.toggle("centrum-open", pokaz);
  /* Pasek widoku, filtry i licznik dotyczą LISTY — przy Centrum nie mają czego
     opisywać i tylko dublowałyby jego nagłówek. */
  ["viewBar", "quickFilters", "counts"].forEach(id=>{
    const e = $(id); if(e) e.style.display = pokaz ? "none" : "";
  });
  const btn = $("btnCentrum");
  if(btn){
    btn.classList.toggle("on", pokaz);
    btn.setAttribute("aria-pressed", pokaz ? "true" : "false");
  }
}

function centrumPokaz(){
  centrWlaczone = true;
  lsSet(CENTR_WLACZONE, "1");
  centrTryb = "centrum";
  lsSet(CENTR_KLUCZ, "centrum");
  centrWidok = "centrum";
  lsSet(CENTR_WIDOK_KLUCZ, "centrum");
  
  if(typeof filt !== "undefined" && filt){
    filt.tag = "all"; filt.book = "all"; filt.ch = null; filt.pub = "all";
  }
  if(typeof query !== "undefined") query = "";
  if(typeof expandedBook !== "undefined") expandedBook = null;
  if(typeof sortMode !== "undefined" && sortMode === "recent") sortMode = "mod";
  const inp = $("search");
  if(inp && inp.value){ inp.value = ""; }
  if(typeof parseQuery === "function") parseQuery("");
  if(typeof persistFilt === "function") persistFilt();

  if(typeof setCollapsed === "function"){
    setCollapsed("colBooks", true);
    setCollapsed("colTags", true);
    setCollapsed("colPubs", true);
  }
  if(typeof mobileShow === "function"){
    mobileShow("colNotes");
  }
  
  const c = $("centrum"), l = $("noteList");
  if(c){
    c.hidden = false;
    rysujCentrum();
    c.scrollTop = 0;
  }
  if(l){
    l.style.display = "none";
  }
  const pasek = $("pasekListy"); if(pasek) pasek.hidden = true;
  document.body.classList.add("centrum-open");
  ["viewBar", "quickFilters", "counts"].forEach(id=>{
    const e = $(id); if(e) e.style.display = "none";
  });
  const btn = $("btnCentrum");
  if(btn){
    btn.classList.add("on");
    btn.setAttribute("aria-pressed", "true");
  }
  if(typeof updateSidebarActiveStates === "function") updateSidebarActiveStates();
}
function centrumSchowaj(){
  centrTryb = "lista";
  lsSet(CENTR_KLUCZ, "lista");
  const c = $("centrum"), l = $("noteList");
  if(c){
    c.hidden = true;
  }
  if(l){
    l.style.display = "";
  }
  const pasek = $("pasekListy"); if(pasek) pasek.hidden = false;
  document.body.classList.remove("centrum-open");
  ["viewBar", "quickFilters", "counts"].forEach(id=>{
    const e = $(id); if(e) e.style.display = "";
  });
  const btn = $("btnCentrum");
  if(btn){
    btn.classList.remove("on");
    btn.setAttribute("aria-pressed", "false");
  }
  renderAll();
  if(typeof updateSidebarActiveStates === "function") updateSidebarActiveStates();
}
/** Włączenie i wyłączenie całości — z Ustawień. */
function centrumUstawWlaczone(on){
  centrWlaczone = !!on;
  lsSet(CENTR_WLACZONE, on ? "1" : "0");
  const btn = $("btnCentrum"); if(btn) btn.hidden = !on;
  centrumOdswiez();
}


/* ——— KLIKNIĘCIA ——— */
if($("centrum")){
  
  // Obsługa wyszukiwania na liście dni
  $("centrum").addEventListener("input", ev=>{
    if(ev.target && ev.target.id === "cenSzukajDniInp"){
      _centrListaSzukaj = ev.target.value;
      const kontener = $("centrum").querySelector(".cenListaDniContainer");
      if(kontener){
        const _activePI = _centrPobierzPlanData(_centrAktywnyPlanId);
        const _activePlanList = _activePI.plan || [];
        const dniDone = _centrPobierzUkonczoneDni(_centrAktywnyPlanId);
        const curDzien = _centrWybranyDzien || 47;
        const q = (_centrListaSzukaj || "").toLowerCase().trim();
        const filtr = _centrListaTab || "wszystkie";
        let filtered = _activePlanList.filter(item=>{
          const isDone = dniDone.has(item.d);
          if(filtr === "ukonczone" && !isDone) return false;
          if(filtr === "nieukonczone" && isDone) return false;
          if(q){
            const str = ("dzień " + item.d + " " + item.t + " " + (item.f||[]).map(x=>x.r+" "+x.t).join(" ")).toLowerCase();
            if(!str.includes(q)) return false;
          }
          return true;
        });
        kontener.innerHTML = (!filtered.length ? '<div class="cenPusto">Brak dni spełniających wybrane kryteria.</div>' : '')
          + filtered.map(item=>{
              const isDone = dniDone.has(item.d);
              const isCur = item.d === curDzien;
              return '<div class="cenRowItem" style="' + (isCur ? 'border-color:#3b82f6;background:rgba(37,99,235,0.1);' : '') + '" data-cwidok="dzien" data-cdzien="' + item.d + '">'
                + '<div class="cenRowLewo">'
                + '<div>'
                + '<div class="cenRowTyt" style="' + (isCur ? 'color:#60a5fa;' : '') + '">Dzień ' + item.d + (isCur ? ' (Bieżący)' : '') + '</div>'
                + '<div class="cenRowPodtyt">' + item.f.length + ' fragmenty • ' + esc(item.t) + '</div>'
                + '</div></div>'
                + '<div style="display:flex;align-items:center;gap:10px;">'
                + (isDone ? '<span style="color:#10b981;display:flex;align-items:center;gap:4px;font-size:13px;font-weight:600;">' + CEN_MODERN_ICO.check + '</span>' : '<span class="cenPozStrz">' + CEN_MODERN_ICO.chevron + '</span>')
                + '</div>'
                + '</div>';
            }).join('');
      }
    }
  });

  $("centrum").addEventListener("click", async ev=>{
    // 1. Zmiana widoku
    const widokBtn = ev.target.closest("[data-cwidok]");
    if(widokBtn){
      const v = widokBtn.dataset.cwidok;
      const dNr = widokBtn.dataset.cdzien;
      if(dNr) {
        _centrWybranyDzien = parseInt(dNr, 10);
        lsSet(KP + "CentrumCurDay", String(_centrWybranyDzien));
      }
      const planOtw = widokBtn.dataset.cplanOtworz;
      if(planOtw){
        _centrAktywnyPlanId = planOtw;
        lsSet(KP + "CentrumAktywnyPlan", planOtw);
        _centrWybranyDzien = _centrZnajdzBiezacyDzienPlanu(planOtw);
        lsSet(KP + "CentrumCurDay", String(_centrWybranyDzien));
      }
      if(v === "temat-szczegoly"){
        const _tid = widokBtn.dataset.ctematId;
        if(_tid){ _centrWybranyTematId = _tid; lsSet(KP + "CentrumCurTemat", _tid); }
      }
      if(CENTR_WIDOKI.includes(v)){
        centrWidok = v;
        lsSet(CENTR_WIDOK_KLUCZ, v);
        rysujCentrum();
        const c = $("centrum"); if(c) c.scrollTop = 0;
        return;
      }
    }

    // 2. Przełączanie checkboxa fragmentu
    const fragBtn = ev.target.closest("[data-cfrag-toggle]");
    if(fragBtn){
      const key = fragBtn.dataset.cfragToggle;
      const fragi = _centrPobierzUkonczoneFragi();
      if(fragi.has(key)) fragi.delete(key);
      else fragi.add(key);
      _centrZapiszUkonczoneFragi(fragi);
      rysujCentrum();
      return;
    }

    // 3. Ukończenie / odznaczenie dnia
    const dzienUkonczBtn = ev.target.closest("[data-cdzien-ukoncz]");
    if(dzienUkonczBtn){
      const d = parseInt(dzienUkonczBtn.dataset.cdzienUkoncz, 10) || _centrWybranyDzien || 1;
      const dni = _centrPobierzUkonczoneDni(_centrAktywnyPlanId);
      const _planUk = _centrPobierzPlanData(_centrAktywnyPlanId);
      const planDay = (_planUk.plan || []).find(x => x.d === d);
      
      if(dni.has(d)){
        dni.delete(d);
        _centrZapiszUkonczoneDni(dni, _centrAktywnyPlanId);
        if(planDay){
          const fragi = _centrPobierzUkonczoneFragi();
          planDay.f.forEach((_, idx) => fragi.delete(_centrAktywnyPlanId + "_" + d + "_" + idx));
          _centrZapiszUkonczoneFragi(fragi);
        }
        toast("Cofnięto oznaczenie Dnia " + d, "info");
      } else {
        dni.add(d);
        _centrZapiszUkonczoneDni(dni, _centrAktywnyPlanId);
        if(planDay){
          const fragi = _centrPobierzUkonczoneFragi();
          planDay.f.forEach((_, idx) => fragi.add(_centrAktywnyPlanId + "_" + d + "_" + idx));
          _centrZapiszUkonczoneFragi(fragi);
        }
        toast("🎉 Wspaniale! Ukończono czytanie na Dzień " + d + "!", "ok");
        if(d < _planUk.days){
          _centrWybranyDzien = d + 1;
          lsSet(KP + "CentrumCurDay", String(_centrWybranyDzien));
        }
      }
      rysujCentrum();
      return;
    }

    // 4. Otwórz w JW Library (Biblia do studium 2020/2025 - nwtsty)
    const jwBtn = ev.target.closest("[data-copen-jw]");
    if(jwBtn){
      const ref = jwBtn.dataset.copenJw;
      toast("Otwieranie " + ref + "…");
      const parsed = parseRef ? parseRef(ref) : null;
      let url = (parsed && typeof finderUrl === "function") ? finderUrl(parsed) : null;
      if(!url && parsed && parsed.b){
        const bPad = String(parsed.b).padStart(2, "0");
        const chPad = String(parsed.ch || 1).padStart(3, "0");
        const vPad = String(parsed.v || 0).padStart(3, "0");
        url = "https://www.jw.org/finder?srcid=jwlshare&wtlocale=P&prefer=lang&bible=" + bPad + chPad + vPad + "&pub=nwtsty";
      }
      if(url){
        if(typeof openUrlJWL === "function"){
          openUrlJWL(url);
        } else {
          window.open(url, "_blank");
        }
      }
      return;
    }

    // 5. Dodaj notatkę do wersetu
    const notWersBtn = ev.target.closest("[data-cnotatka-werset]");
    if(notWersBtn){
      const ref = notWersBtn.dataset.cnotatkaWerset;
      const parsed = parseRef ? parseRef(ref) : null;
      const newN = createNote ? createNote() : null;
      if(newN && parsed){
        newN.b = parsed.b;
        newN.ch = parsed.ch;
        newN.v = parsed.v;
        newN.t = "Rozważania: " + ref;
        saveNote(newN);
        toast("Utworzono notatkę dla " + ref, "ok");
        if(typeof selectNote === "function") selectNote(newN.g);
      }
      return;
    }

    // 6. Tabs w Liście Dni
    const lTabBtn = ev.target.closest("[data-clista-tab]");
    if(lTabBtn){
      _centrListaTab = lTabBtn.dataset.clistaTab;
      rysujCentrum();
      return;
    }

    // 7. Tabs w Statystykach
    const sTabBtn = ev.target.closest("[data-cstat-tab]");
    if(sTabBtn){
      _centrStatTab = sTabBtn.dataset.cstatTab;
      rysujCentrum();
      return;
    }

    // 8. Tabs w Studium Osobistym
    const soTabBtn = ev.target.closest("[data-cstudium-tab]");
    if(soTabBtn){
      _centrStudiumTab = soTabBtn.dataset.cstudiumTab;
      rysujCentrum();
      return;
    }

    // 9. Nawigacja kalendarza
    const kalNawBtn = ev.target.closest("[data-ckal-naw]");
    if(kalNawBtn){
      const delta = parseInt(kalNawBtn.dataset.ckalNaw, 10);
      _centrKalMies += delta;
      if(_centrKalMies < 0){ _centrKalMies = 11; _centrKalRok--; }
      else if(_centrKalMies > 11){ _centrKalMies = 0; _centrKalRok++; }
      rysujCentrum();
      return;
    }

    // Obsługa wyboru tematu
    const tematCard = ev.target.closest("[data-ctemat-id]");
    if(tematCard && !ev.target.closest("[data-ctemat-usunwers]")){
      _centrWybranyTematId = tematCard.dataset.ctematId;
      lsSet(KP + "CentrumCurTemat", _centrWybranyTematId);
      centrWidok = "temat-szczegoly";
      lsSet(CENTR_WIDOK_KLUCZ, centrWidok);
      rysujCentrum();
      const c = $("centrum"); if(c) c.scrollTop = 0;
      return;
    }

    // Nowa notatka w temacie
    const tematNowaNotaBtn = ev.target.closest("[data-ctemat-nowanota]");
    if(tematNowaNotaBtn){
      const tid = tematNowaNotaBtn.dataset.ctematNowanota;
      const tematy = _centrPobierzTematyStudium();
      const t = tematy.find(x=>x.id===tid);
      if(t && typeof createNote === "function"){
        const n = createNote();
        if(n){
          n.t = t.name + ": Rozważania osobiste";
          if(typeof createTag === "function"){
            const tagObj = createTag(t.name);
            if(tagObj) n.tg = [tagObj.id];
          }
          saveNote(n);
          toast("Utworzono notatkę w temacie „" + t.name + "”", "ok");
          if(typeof selectNote === "function") selectNote(n.g);
        }
      }
      return;
    }

    // Dodaj werset do tematu
    const tematDodajWersBtn = ev.target.closest("[data-ctemat-dodajwers]");
    if(tematDodajWersBtn){
      const tid = tematDodajWersBtn.dataset.ctematDodajwers;
      const wersetStr = await askText({title:"Dodaj werset do tematu", placeholder:"np. Rzymian 8:28", okLabel:"Dodaj"});
      if(wersetStr && wersetStr.trim()){
        const opis = await askText({title:"Krótki opis / myśl przewodnia (opcjonalnie)", placeholder:"np. Bóg współdziała dla dobra miłujących Go", okLabel:"Zapisz"}) || "";
        const tematy = _centrPobierzTematyStudium();
        const t = tematy.find(x=>x.id===tid);
        if(t){
          if(!Array.isArray(t.verses)) t.verses = [];
          t.verses.push({ r: wersetStr.trim(), t: opis.trim() });
          _centrZapiszTematyStudium(tematy);
          toast("Dodano werset " + wersetStr + " do tematu „" + t.name + "”", "ok");
          rysujCentrum();
        }
      }
      return;
    }

    // Usuń werset z tematu
    const tematUsunWersBtn = ev.target.closest("[data-ctemat-usunwers]");
    if(tematUsunWersBtn){
      const tid = tematUsunWersBtn.dataset.ctematUsunwers;
      const vIdx = parseInt(tematUsunWersBtn.dataset.cvIdx, 10);
      const tematy = _centrPobierzTematyStudium();
      const t = tematy.find(x=>x.id===tid);
      if(t && Array.isArray(t.verses) && t.verses[vIdx]){
        const rNazwa = t.verses[vIdx].r;
        t.verses.splice(vIdx, 1);
        _centrZapiszTematyStudium(tematy);
        toast("Usunięto werset " + rNazwa, "ok");
        rysujCentrum();
      }
      return;
    }

    // Edytuj temat
    const tematEdytujBtn = ev.target.closest("[data-ctemat-edytuj]");
    if(tematEdytujBtn){
      const tid = tematEdytujBtn.dataset.ctematEdytuj;
      const tematy = _centrPobierzTematyStudium();
      const t = tematy.find(x=>x.id===tid);
      if(t){
        const nowaNazwa = await askText({title:"Edytuj nazwę tematu", placeholder:"Nazwa tematu", okLabel:"Dalej", initialValue:t.name}) || t.name;
        const nowyOpis = await askText({title:"Edytuj opis tematu", placeholder:"Opis tematu", okLabel:"Zapisz", initialValue:t.desc||""}) || t.desc;
        t.name = nowaNazwa.trim() || t.name;
        t.desc = nowyOpis.trim() || t.desc;
        _centrZapiszTematyStudium(tematy);
        toast("Zaktualizowano temat", "ok");
        rysujCentrum();
      }
      return;
    }

    // Otwórz notatkę w edytorze
    const notaOtworzBtn = ev.target.closest("[data-cnotatka-otworz]");
    if(notaOtworzBtn){
      const guid = notaOtworzBtn.dataset.cnotatkaOtworz;
      if(typeof selectNote === "function") selectNote(guid);
      return;
    }


    // 10. Nowy temat studium
    const nowyTematBtn = ev.target.closest("[data-cakcja=nowy-temat]");
    if(nowyTematBtn){
      const nazwa = await askText({title:"Nowy temat studium osobistego", placeholder:"np. Przymierza Boże", okLabel:"Utwórz"});
      if(nazwa){
        const tematy = _centrPobierzTematyStudium();
        const kolory = ["#a855f7", "#f97316", "#10b981", "#3b82f6", "#ec4899", "#eab308"];
        const id = norm ? norm(nazwa).replace(/[^a-z0-9]+/g, "-") : "temat-" + Date.now();
        tematy.push({ id, name: nazwa, color: kolory[tematy.length % kolory.length], desc: "", verses: [], notes: 0 });
        lsSet(KP + "CentrumTematy", JSON.stringify(tematy));
        toast("Dodano temat „" + nazwa + "”", "ok");
        rysujCentrum();
      }
      return;
    }

    // Tabs w Wyborze Planów
    const planTabBtn = ev.target.closest("[data-cplan-tab]");
    if(planTabBtn){
      _centrPlanTab = planTabBtn.dataset.cplanTab;
      rysujCentrum();
      return;
    }

    // Resetowanie postępu planu
    const planResetBtn = ev.target.closest("[data-cplan-reset]");
    if(planResetBtn){
      const pid = planResetBtn.dataset.cplanReset;
      const pInfo = _centrPobierzPlanData(pid);
      const zgoda = typeof askConfirm === "function"
        ? await askConfirm(
            "Zresetować postęp planu?",
            "Czy na pewno chcesz zresetować postęp dla planu „<b>" + esc(pInfo.name) + "</b>”? Wszystkie oznaczone dni i fragmenty w tym planie zostaną wyczyszczone.",
            { okLabel: "Zresetuj postęp", danger: true }
          )
        : confirm("Czy na pewno chcesz zresetować postęp dla planu „" + pInfo.name + "”?");
      if(zgoda){
        _centrResetujPostepPlanu(pid);
        if(_centrAktywnyPlanId === pid){
          _centrWybranyDzien = 1;
          lsSet(KP + "CentrumCurDay", "1");
        }
        toast("Zresetowano postęp planu „" + pInfo.name + "”", "ok");
        rysujCentrum();
      }
      return;
    }

    // Wybór i otwarcie planu
    const planWybierzBtn = ev.target.closest("[data-cplan-wybierz]");
    if(planWybierzBtn){
      const pid = planWybierzBtn.dataset.cplanWybierz;
      _centrAktywnyPlanId = pid;
      lsSet(KP + "CentrumAktywnyPlan", pid);
      _centrWybranyDzien = _centrZnajdzBiezacyDzienPlanu(pid);
      lsSet(KP + "CentrumCurDay", String(_centrWybranyDzien));
      centrWidok = "czytanie-chronologiczne";
      lsSet(CENTR_WIDOK_KLUCZ, centrWidok);
      rysujCentrum();
      const c = $("centrum"); if(c) c.scrollTop = 0;
      return;
    }

    const planOtworzRow = ev.target.closest("[data-cplan-otworz]");
    if(planOtworzRow && !ev.target.closest("button")){
      const pid = planOtworzRow.dataset.cplanOtworz;
      _centrAktywnyPlanId = pid;
      lsSet(KP + "CentrumAktywnyPlan", pid);
      _centrWybranyDzien = _centrZnajdzBiezacyDzienPlanu(pid);
      lsSet(KP + "CentrumCurDay", String(_centrWybranyDzien));
      centrWidok = "czytanie-chronologiczne";
      lsSet(CENTR_WIDOK_KLUCZ, centrWidok);
      rysujCentrum();
      const c = $("centrum"); if(c) c.scrollTop = 0;
      return;
    }

    // Wznowienie planu
    const planRestartBtn = ev.target.closest("[data-cplan-restart]");
    if(planRestartBtn){
      const pid = planRestartBtn.dataset.cplanRestart;
      const plany = _centrPobierzPlany();
      const p = plany.find(x=>x.id===pid);
      if(p){
        p.active = true;
        lsSet(KP + "CentrumPlany", JSON.stringify(plany));
        _centrAktywnyPlanId = pid;
        lsSet(KP + "CentrumAktywnyPlan", pid);
        toast("Wznowiono plan „" + p.name + "”", "ok");
        rysujCentrum();
      }
      return;
    }

    // 11. Nowy plan czytania
    const nowyPlanBtn = ev.target.closest("[data-cakcja=nowy-plan]");
    if(nowyPlanBtn){
      const nazwa = await askText({title:"Nowy plan czytania", placeholder:"np. Listy apostoła Pawła", okLabel:"Utwórz plan"});
      if(nazwa){
        const plany = _centrPobierzPlany();
        plany.push({ id: "plan-" + Date.now(), name: nazwa, days: 30, active: true });
        lsSet(KP + "CentrumPlany", JSON.stringify(plany));
        toast("Utworzono plan „" + nazwa + "”", "ok");
        rysujCentrum();
      }
      return;
    }

    const akcja = ev.target.closest("[data-cakcja]");
    if(akcja){
      if(akcja.dataset.cakcja === "lista") centrumSchowaj();
      if(akcja.dataset.cakcja === "menu-centrum"){
        centrMenuOtwarte=!centrMenuOtwarte; rysujCentrum();
      }
      if(akcja.dataset.cakcja === "dostosuj"){
        centrDostosujOtwarte=!centrDostosujOtwarte; rysujCentrum();
      }
      if(akcja.dataset.cakcja === "nowy-projekt") centrumNowyProjekt();
      if(akcja.dataset.cakcja === "bezpieczenstwo" && typeof otworzCentrumBezpieczenstwa==="function")
        otworzCentrumBezpieczenstwa();
      if(akcja.dataset.cakcja === "nowa-kolekcja"){
        if(typeof createPubTab === "function") createPubTab("*");
      }
      /* „Rozpocznij powtórki" otwiera notatkę najdłużej zaległą. Panel zostaje
         pod spodem, więc po zamknięciu widać kolejną — to wystarcza za tryb
         powtarzania i nie wprowadza drugiego sposobu chodzenia po notatkach. */
      if(akcja.dataset.cakcja === "powtorki"){
        const pierwsza = centrNaDzis()[0];
        if(pierwsza){
          if(typeof touchAccess === "function") touchAccess(pierwsza);
          openFs(pierwsza);
        }
      }
      // Nowa notatka z pulpitu Centrum
      if(akcja.dataset.cakcja === "nowa-notatka"){
        const _n = typeof createNote === "function" ? createNote() : null;
        if(_n){ saveNote(_n); if(typeof selectNote === "function") selectNote(_n.g); centrumSchowaj(); }
      }
      // Notatka do konkretnego dnia czytania
      if(akcja.dataset.cakcja === "notatka-dnia"){
        const _n2 = typeof createNote === "function" ? createNote() : null;
        if(_n2){
          const _pi = _centrPobierzPlanData(_centrAktywnyPlanId);
          _n2.t = _pi.name + " — Dzień " + (_centrWybranyDzien || 1) + ": Rozważania";
          saveNote(_n2); if(typeof selectNote === "function") selectNote(_n2.g); centrumSchowaj();
        }
      }
      // Ustawienia planu — przejście do widoku Moje plany
      if(akcja.dataset.cakcja === "ustawienia-planu"){
        centrWidok = "moje-plany";
        lsSet(CENTR_WIDOK_KLUCZ, "moje-plany");
        rysujCentrum();
        const _cu = $("centrum"); if(_cu) _cu.scrollTop = 0;
      }
      return;
    }

    const projekt=ev.target.closest("[data-cprojekt]");
    if(projekt){
      const id=+projekt.dataset.cprojekt, t=tags.find(x=>x.id===id&&x.cproj);
      if(!t){ toast("Tego projektu już nie ma"); rysujCentrum(); return; }
      filt.tag=id; filt.book="all"; filt.ch=null; filt.pub="all";
      if(typeof quickFilter!=="undefined") quickFilter="all";
      if(typeof persistFilt==="function") persistFilt();
      renderAll(); if(innerWidth<=900&&typeof mobileShow==="function") mobileShow("colNotes"); return;
    }

    const kolekcja = ev.target.closest("[data-ckolekcja]");
    if(kolekcja){
      const id = +kolekcja.dataset.ckolekcja;
      const istnieje = typeof pubTabsFor === "function" && pubTabsFor("*").some(t=>t.id===id);
      if(!istnieje){ toast("Tej kolekcji już nie ma"); rysujCentrum(); return; }
      filt.tag = "all"; filt.book = "all"; filt.ch = null; filt.pub = "ptb:" + id;
      if(typeof quickFilter !== "undefined") quickFilter = "all";
      if(typeof persistFilt === "function") persistFilt();
      renderAll();
      if(innerWidth <= 900 && typeof mobileShow === "function") mobileShow("colNotes");
      return;
    }

    const zakladkaSekcji = ev.target.closest("[data-czakladka-sekcji]");
    if(zakladkaSekcji){
      const id=+zakladkaSekcji.dataset.czakladkaSekcji;
      const istnieje=typeof secTabs!=="undefined" && secTabs.some(z=>z.id===id);
      if(!istnieje){ toast("Tej zakładki już nie ma"); rysujCentrum(); return; }
      filt.tag="stb:"+id; filt.book="all"; filt.ch=null; filt.pub="all";
      if(typeof quickFilter!=="undefined") quickFilter="all";
      if(typeof persistFilt==="function") persistFilt();
      renderAll();
      if(innerWidth<=900&&typeof mobileShow==="function") mobileShow("colNotes");
      return;
    }

    /* Przełącznik zakresu wykresu przerysowuje SAM wykres. Całe Centrum
       znaczyłoby przy ośmiu tysiącach notatek ponowne policzenie wszystkich
       sekcji po to, żeby zmienić jedną linię. */
    const szyb = ev.target.closest("[data-cszyb]");
    if(szyb){ centrSzybkieDzialanie(szyb.dataset.cszyb); return; }

    const zakres = ev.target.closest("[data-czakres]");
    if(zakres){
      const dni = parseInt(zakres.dataset.czakres, 10);
      lsSet(CENTR_ZAKRES_KLUCZ, String(dni));
      const box = $("cenWykres");
      if(box){
        const plot = box.querySelector(".cenWykresPlot");
        if(plot) setHtml(plot, centrWykresRys(dni));
        box.querySelectorAll("[data-czakres]").forEach(b=>
          b.classList.toggle("on", b.dataset.czakres === String(dni)));
      }
      return;
    }

    /* „Zobacz wszystkie" i kafelki statystyk prowadzą na listę ustawioną tak,
       żeby zaczynała się od tego, co widać w karcie — inaczej wyjście z sekcji
       wyrzucałoby w przypadkowe miejsce. */
    const wszystkie = ev.target.closest("[data-cwszystkie]");
    const stat = ev.target.closest("[data-cstat]");
    if(wszystkie || stat){
      const co = wszystkie ? wszystkie.dataset.cwszystkie : stat.dataset.cstat;
      const ustawSort = (m)=>{
        if(typeof sortMode === "undefined") return;
        sortMode = m;
        const sel = $("sortSel");
        if(sel && [...sel.options].some(o=>o.value === m)){ sel.value = m; lsSet(KP + "Sort", m); }
      };
      if(typeof quickFilter !== "undefined") quickFilter = "all";
      if(co === "studiowane"){ ustawSort("recent"); centrTryb = "auto"; renderAll(); return; }
      if(co === "dodane" || co === "notatki") ustawSort("createdNew");
      else if(co === "wersety") ustawSort("bible");
      else if(co === "publikacje") ustawSort("pub");
      else if(co === "ulubione" && typeof quickFilter !== "undefined") quickFilter = "fav";
      else if(co === "tematy" && typeof otworzMape === "function"){ otworzMape(); return; }
      centrumSchowaj();
      if(innerWidth <= 900 && typeof mobileShow === "function") mobileShow("colNotes");
      return;
    }

    const nota = ev.target.closest("[data-cnota]");
    if(nota){
      const n = notes.find(x=>x.g === nota.dataset.cnota && !x.del);
      if(!n){ toast("Tej notatki już nie ma"); rysujCentrum(); return; }
      if(typeof touchAccess === "function") touchAccess(n);
      openFs(n);
      return;
    }
    const wers = ev.target.closest("[data-cwers]");
    if(wers){
      const [b, ch] = wers.dataset.cwers.split(":").map(Number);
      filt.tag = "all"; filt.book = b; filt.ch = ch; filt.pub = "all";
      if(typeof expandedBook !== "undefined") expandedBook = b;
      centrTryb = "auto";            // wybór filtra sam odsłoni listę
      if(typeof persistFilt === "function") persistFilt();
      renderAll();
      if(innerWidth <= 900 && typeof mobileShow === "function") mobileShow("colNotes");
      return;
    }
    const pub = ev.target.closest("[data-cpub]");
    if(pub){
      filt.tag = "all"; filt.book = "all"; filt.ch = null; filt.pub = "pub:" + pub.dataset.cpub;
      if(typeof persistFilt === "function") persistFilt();
      renderAll();
      if(innerWidth <= 900 && typeof mobileShow === "function") mobileShow("colNotes");
      return;
    }
    const szuk = ev.target.closest("[data-cszuk]");
    if(szuk){
      const inp = $("search");
      if(inp){ inp.value = szuk.dataset.cszuk; parseQuery(inp.value); }
      renderAll();
      if(innerWidth <= 900 && typeof mobileShow === "function") mobileShow("colNotes");
      return;
    }
  });
}

/* Przycisk w pasku górnym. */
if($("btnCentrum")){
  $("btnCentrum").hidden = !centrWlaczone;
  $("btnCentrum").onclick = ()=>{
    if(centrumWidoczne()) centrumSchowaj();
    else centrumPokaz();
  };
}

/* „Kontynuuj" ma wracać w to samo miejsce tekstu. Czytnik robi to sam przy
   otwieraniu (restoreReadPos w renderFs), więc tu nie ma nic do dopisania —
   wystarczyło nie zepsuć drogi: openFs, nie własne rysowanie. */

/* Pierwsze rysowanie po wczytaniu notatek. Boot woła renderAll(), a w nim
   siedzi centrumOdswiez() — ta linia jest dla sytuacji, w której Centrum
   dopisano do gotowej strony (np. w teście). */
setTimeout(centrumOdswiez, 0);
