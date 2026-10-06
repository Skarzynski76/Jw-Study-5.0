/* ==========================================================================
   JW Study — sync.js
   UZGADNIANIE DANYCH MIĘDZY URZĄDZENIAMI (iPhone ↔ iPad ↔ Mac)

   CO BYŁO NIE TAK

   Dane mieszkają w bazie przeglądarki na urządzeniu. Przeniesienie ich na
   drugie urządzenie znaczyło: zapisz kopię JSON, przenieś plik, wczytaj kopię.
   Wczytanie dołączało notatki po dacie zmiany („nowsza wygrywa") i na tym
   koniec. To wystarcza, żeby PRZENIEŚĆ notatki raz. Nie wystarcza, żeby
   PRACOWAĆ na trzech urządzeniach:

     • Usunięcia nie wracały. Etykieta skasowana na iPadzie wracała z każdą
       kopią z Maca, bo „dołącz" umie tylko dokładać.
     • Kolejność, kolory i przypisania do sekcji przenosiły się tylko wtedy,
       gdy świadomie wybrało się „Dołącz + układ" — i wtedy hurtem, cudzym
       układem na wierzchu.
     • Notatka zmieniona w DWÓCH miejscach naraz przepadała po cichu: starsza
       wersja odpadała, nikt o niej nie słyszał.
     • Historia wersji i powtórki nie jechały wcale.

   JAK JEST TERAZ

   Jeden PLIK UZGADNIANIA w chmurze (iCloud Drive, OneDrive, Dysk Google —
   aplikacji jest to obojętne; to zwykły plik w folderze, który system sam
   podaje dalej). Każde urządzenie ten plik czyta, scala z tym, co ma
   u siebie, i zapisuje wynik.

   TRZY DECYZJE, KTÓRE WARTO ZNAĆ

   1. SCALANIE JEST TRÓJSTRONNE. Po każdym udanym uzgodnieniu zapisujemy
      PODPISY wszystkiego, co wtedy było — to jest „podstawa". Przy kolejnym
      uzgodnieniu porównujemy trzy stany: podstawę, siebie i plik. Dzięki temu
      wiadomo nie tylko ŻE się różnią, ale KTO się zmienił:

        zmiana tylko w pliku      → bierzemy z pliku, bez pytania
        zmiana tylko u nas        → zostawiamy swoje, bez pytania
        zmiana w obu miejscach    → PYTAMY (okno z dwiema treściami)
        zniknęło w pliku, u nas bez zmian → kasujemy też u nas
        zniknęło w pliku, u nas zmienione → PYTAMY

      Bez podstawy (czyli przy zwykłym „dołącz") KAŻDA różnica wyglądałaby na
      spór i przy ośmiu tysiącach notatek trzeba by odpowiedzieć na tysiące
      pytań. Z podstawą pytań jest tyle, ile naprawdę spornych notatek —
      w praktyce zero albo kilka.

   2. REKORDY MAJĄ STAŁE UID. Numery etykiet, sekcji i zakładek są LOKALNE:
      etykieta „Betel" ma na iPadzie numer 3, a na Macu 11. Numer nie nadaje
      się więc do rozpoznawania rekordu między urządzeniami. Każdy rekord
      dostaje własne, niezmienne `uid`, a w pliku wszystkie odsyłacze
      (notatka → etykiety, etykieta → sekcja, zakładka → sekcja) idą po uid.
      Przy PIERWSZYM spotkaniu dwóch urządzeń rekordy o tej samej nazwie
      zostają skojarzone i przyjmują wspólne uid — inaczej powstałyby dwie
      etykiety „Betel".

   3. NOTATKI NIGDY NIE GINĄ PRZEZ SAM BRAK W PLIKU. Etykieta czy zakładka,
      której w pliku nie ma, a była w podstawie, została skasowana na drugim
      urządzeniu — kasujemy ją też u siebie. Przy NOTATKACH tego nie robimy:
      usunięcie notatki i tak zostawia po sobie ślad (`del` + `delAt`, kosz na
      30 dni), więc jedzie normalną drogą, jak każda inna zmiana. Notatka,
      której w pliku nie ma, jest po prostu dopisywana do pliku.

   GDZIE DZIAŁA SAMO, A GDZIE TRZEBA KLIKNĄĆ

   Zapis i odczyt pliku BEZ PYTANIA wymaga File System Access API — jest
   w przeglądarkach opartych na Chromium na komputerze (Chrome, Edge, Brave,
   Arc). Tam plik wskazuje się raz, a potem uzgadnianie chodzi samo: przy
   uruchomieniu, po zmianach i co pół minuty zaglądając, czy plik się zmienił.

   Safari — także na Macu — i wszystkie przeglądarki na iPhonie i iPadzie tego
   nie mają i mieć nie będą: strona nie może tam sięgnąć do iCloud Drive.
   Zostają dwa przyciski: „Wyślij zmiany" (przez systemowe okno udostępniania
   do iCloud Drive) i „Wczytaj zmiany" (wskazanie pliku). Ta sama droga, to
   samo scalanie — różni się tylko tym, kto naciska.
   ========================================================================== */
"use strict";

/* ——— STAŁE ——— */
const SYNC_FORMAT  = "jwstudy-sync";
const SYNC_WERSJA  = 1;
/* Klucze w magazynie „meta" bazy urządzenia. */
const SYNC_K_PLIK  = "syncPlik";        // uchwyt pliku uzgadniania (File System Access)
const SYNC_K_BAZA  = "syncBaza";        // podpisy z ostatniego udanego uzgodnienia
/* Klucze w pamięci ustawień. */
const SYNC_K_AUTO  = KP + "SyncAuto";   // "1" / "0" — czy chodzić samo
const SYNC_K_NAZWA = KP + "SyncNazwa";  // nazwa tego urządzenia w opisach
const SYNC_K_KIEDY = KP + "SyncKiedy";  // kiedy ostatnio się udało

/* Ile czekać po ostatniej zmianie, zanim zapiszemy plik. Pisanie po każdym
   naciśnięciu klawisza znaczyłoby kilkadziesiąt zapisów pliku na minutę. */
const SYNC_ZWLOKA_MS = 15000;
/* Najmniejszy odstęp między dwoma zapisami pliku. Plik z ośmioma tysiącami
   notatek waży kilkanaście megabajtów, a ze zdjęciami znacznie więcej — i za
   każdym razem idzie w całości na dysk, a potem do chmury. Dłuższe pisanie
   z przerwami dawałoby bez tego zapis co piętnaście sekund. */
const SYNC_MIN_ODSTEP_ZAPISU = 90000;
/* Jak często zaglądać, czy plik zmienił się na drugim urządzeniu. iCloud Drive
   podmienia plik na dysku sam; my tylko patrzymy na jego datę. */
const SYNC_ODPYT_MS = 30000;
/* Historia wersji potrafi przerosnąć same notatki: pięćdziesiąt wersji razy
   osiem tysięcy notatek to setki megabajtów. Do pliku idzie tyle, ile ma sens
   przenosić — reszta zostaje lokalnym dziennikiem pracy. */
const SYNC_HIST_NA_NOTATKE = 20;
const SYNC_HIST_BUDZET = 8 * 1024 * 1024;   // znaków treści wersji łącznie
/* Zapory na wczytywany plik — te same, co przy kopii zapasowej. */
const SYNC_MAX_PLIK = 400 * 1024 * 1024;

/* ——— STAN ——— */
let syncPracuje  = false;    // trwa uzgadnianie — drugie nie wchodzi
let syncZnanyMs  = 0;        // data pliku, którą już przetworzyliśmy
let syncZwloka   = null;     // timer zapisu po zmianach
let syncOdpyt    = null;     // timer zaglądania do pliku
let syncOpisStanu = "";      // krótki opis do Ustawień
let syncOstatniZapis = 0;    // kiedy ostatnio zapisaliśmy plik (do odstępu wyżej)

/* ==========================================================================
   1. TOŻSAMOŚĆ: URZĄDZENIE I REKORDY
   ========================================================================== */

/** Nowe, niepowtarzalne uid. */
function syncNowyUid(){
  try{
    if(typeof crypto!=="undefined" && crypto.randomUUID) return crypto.randomUUID();
  }catch(e){}
  return "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

/** Nazwa tego urządzenia — pokazywana w oknie różnic, żeby wiedzieć, co z czym. */
function syncNazwaUrzadzenia(){
  const zapisana = lsGet(SYNC_K_NAZWA, "");
  if(zapisana) return String(zapisana);
  const ua = navigator.userAgent || "";
  if(/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "iPad";
  if(/iPhone/.test(ua)) return "iPhone";
  if(/Macintosh|Mac OS X/.test(ua)) return "Mac";
  if(/Android/.test(ua)) return "Android";
  if(/Windows/.test(ua)) return "Windows";
  return "To urządzenie";
}
function syncUstawNazweUrzadzenia(nazwa){
  const n = String(nazwa || "").trim().slice(0, 40);
  if(!n) return false;
  lsSet(SYNC_K_NAZWA, n);
  return true;
}

/**
 * OPIS KAŻDEJ LISTY, KTÓRĄ UZGADNIAMY.
 *
 * Pięć list — sekcje, etykiety, zakładki publikacji, zakładki sekcji, szablony
 * — różni się nazwami pól i niczym więcej. Bez tej tabeli byłoby pięć prawie
 * identycznych kawałków kodu, a poprawka w jednym z nich zawsze omijałaby
 * cztery pozostałe.
 *
 * • `lista`   — tablica w pamięci aplikacji
 * • `zapis`   — jak zapisać ją na urządzeniu
 * • `klucz`   — po czym rozpoznać TEN SAM rekord przy pierwszym spotkaniu
 * • `wyjscie` — rekord w postaci przenośnej (odsyłacze po uid)
 * • `wejscie` — z postaci przenośnej z powrotem na rekord lokalny
 * • `podpis`  — z czego składa się „stan" rekordu (bez pól czysto lokalnych)
 * • `opis`    — jak nazwać rekord w oknie różnic
 */
function syncListy(){
  const uidNaId = {};            // rodzaj → {uid: lokalne id}, wypełniane w trakcie scalania
  const daj = (rodzaj, uid)=> (uidNaId[rodzaj] && uidNaId[rodzaj][uid]);
  const opisy = [
    {
      rodzaj:"sections", nazwa:"sekcja", nazwaMn:"sekcje",
      lista: ()=> (typeof sections!=="undefined" ? sections : []),
      zapis: ()=> { if(typeof saveSections==="function") saveSections(); },
      klucz: s=> "n:" + norm(s.name),
      kluczP: p=> "n:" + norm(p.name),
      wyjscie: s=> ({uid:s.uid, name:s.name, color:s.color, ord:s.ord}),
      wejscie: (p, id)=> ({id, uid:p.uid, name:p.name, color:p.color, ord:p.ord, open:true}),
      /* `open` (rozwinięta czy zwinięta) jest stanem ekranu, nie danymi —
         gdyby wchodził do podpisu, dwa urządzenia spierałyby się bez końca
         o to, czy sekcja jest właśnie rozłożona. */
      podpis: p=> [p.name||"", p.color||"", p.ord??""].join(""),
      opis: p=> "Sekcja „" + (p.name||"") + "”"
    },
    {
      rodzaj:"tags", nazwa:"etykieta", nazwaMn:"etykiety",
      lista: ()=> tags,
      zapis: ()=> { if(typeof sortTags==="function") sortTags(); if(typeof saveTags==="function") saveTags(); },
      klucz: t=> "n:" + norm(t.name),
      kluczP: p=> "n:" + norm(p.name),
      wyjscie: t=> ({uid:t.uid, name:t.name, color:t.color, ord:t.ord, orig:t.orig,
                     cproj:t.cproj===true ? true : undefined,
                     secUid: syncUidPo("sections", t.sec), stbUid: syncUidPo("secTabs", t.stb)}),
      wejscie: (p, id)=> {
        const t = {id, uid:p.uid, name:p.name};
        if(p.color) t.color = p.color;
        if(p.ord !== undefined) t.ord = p.ord;
        if(p.orig) t.orig = p.orig;
        if(p.cproj === true) t.cproj = true;
        const sek = daj("sections", p.secUid); if(sek !== undefined) t.sec = sek;
        const zak = daj("secTabs",  p.stbUid); if(zak !== undefined) t.stb = zak;
        return t;
      },
      podpis: p=> [p.name||"", p.color||"", p.ord??"", p.secUid||"", p.stbUid||"", p.cproj?1:0].join(""),
      opis: p=> "Etykieta „" + (p.name||"") + "”"
    },
    {
      rodzaj:"pubTabs", nazwa:"zakładka publikacji", nazwaMn:"zakładki publikacji",
      lista: ()=> (typeof pubTabs!=="undefined" ? pubTabs : []),
      zapis: ()=> { if(typeof savePubTabs==="function") savePubTabs(); },
      klucz: z=> "k:" + (z.ks||"") + ":" + norm(z.name),
      kluczP: p=> "k:" + (p.ks||"") + ":" + norm(p.name),
      wyjscie: z=> ({uid:z.uid, ks:z.ks, name:z.name, ord:z.ord}),
      wejscie: (p, id)=> ({id, uid:p.uid, ks:p.ks, name:p.name, ord:p.ord}),
      podpis: p=> [p.ks||"", p.name||"", p.ord??""].join(""),
      opis: p=> "Zakładka „" + (p.name||"") + "” w publikacji " + (p.ks||"")
    },
    {
      rodzaj:"secTabs", nazwa:"zakładka sekcji", nazwaMn:"zakładki sekcji",
      lista: ()=> (typeof secTabs!=="undefined" ? secTabs : []),
      zapis: ()=> { if(typeof saveSecTabs==="function") saveSecTabs(); },
      klucz: z=> "s:" + syncUidPo("sections", z.sec) + ":" + norm(z.name),
      kluczP: p=> "s:" + (p.secUid||"") + ":" + norm(p.name),
      wyjscie: z=> ({uid:z.uid, name:z.name, ord:z.ord, color:z.color,
                     secUid: syncUidPo("sections", z.sec)}),
      wejscie: (p, id)=> {
        const z = {id, uid:p.uid, name:p.name, ord:p.ord};
        if(p.color) z.color = p.color;
        const sek = daj("sections", p.secUid); if(sek !== undefined) z.sec = sek;
        return z;
      },
      podpis: p=> [p.name||"", p.ord??"", p.color||"", p.secUid||""].join(""),
      opis: p=> "Zakładka sekcji „" + (p.name||"") + "”"
    },
    {
      rodzaj:"szablony", nazwa:"szablon", nazwaMn:"szablony",
      lista: ()=> (typeof szablony!=="undefined" ? szablony : []),
      zapis: ()=> { if(typeof saveSzablony==="function") saveSzablony();
                    if(typeof rysujSzablony==="function") rysujSzablony(); },
      klucz: z=> "n:" + norm(z.nazwa),
      kluczP: p=> "n:" + norm(p.nazwa),
      wyjscie: z=> ({uid:z.uid, nazwa:z.nazwa, tytul:z.tytul, tresc:z.tresc, ord:z.ord}),
      wejscie: (p, id)=> ({id, uid:p.uid, nazwa:p.nazwa, tytul:p.tytul||"",
                           tresc:p.tresc||"", ord:p.ord}),
      podpis: p=> [p.nazwa||"", p.tytul||"", p.tresc||"", p.ord??""].join(""),
      opis: p=> "Szablon „" + (p.nazwa||"") + "”"
    }
  ];
  opisy.forEach(o=>{ uidNaId[o.rodzaj] = {}; o._mapa = uidNaId[o.rodzaj]; });
  return opisy;
}

/** Uid rekordu o podanym lokalnym numerze — albo pusty napis. */
function syncUidPo(rodzaj, id){
  if(id === undefined || id === null) return "";
  const lista = rodzaj === "sections" ? (typeof sections!=="undefined" ? sections : [])
              : rodzaj === "secTabs"  ? (typeof secTabs !=="undefined" ? secTabs  : [])
              : [];
  const r = lista.find(x=>x && x.id === id);
  return (r && r.uid) ? r.uid : "";
}

/**
 * Nadaje brakujące uid i zapisuje listy, które się zmieniły.
 * Wołane raz, na początku każdego uzgadniania — dane starsze niż ta wersja
 * aplikacji uid oczywiście nie mają.
 */
function syncNadajUidy(){
  let razem = 0;
  syncListy().forEach(o=>{
    let ile = 0;
    o.lista().forEach(r=>{ if(r && typeof r==="object" && !r.uid){ r.uid = syncNowyUid(); ile++; } });
    if(ile){ o.zapis(); razem += ile; }
  });
  return razem;
}

/* ==========================================================================
   2. PLIK UZGADNIANIA: POSTAĆ PRZENOŚNA
   ========================================================================== */

/** Historia wersji do pliku — z górnym pułapem, patrz stałe na początku. */
async function syncHistoriaDoPliku(){
  if(!idb) return [];
  let wszystkie;
  try{ wszystkie = await idbAll("wersje"); }catch(e){ return []; }
  /* Najświeższe historie mają pierwszeństwo w budżecie — po nie sięga się
     najczęściej. Bez tego przypadkowa kolejność bazy decydowałaby, czyja
     historia pojedzie, a czyja nie. */
  const posortowane = wszystkie
    .map(r=>({g:r.g, lista:(Array.isArray(r.lista)?r.lista:[]).slice(0, SYNC_HIST_NA_NOTATKE)}))
    .filter(r=>r.g && r.lista.length)
    .sort((a,b)=> String(b.lista[0].t||"").localeCompare(String(a.lista[0].t||"")));
  const wynik = [];
  let znakow = 0, pominietych = 0;
  for(const r of posortowane){
    const waga = r.lista.reduce((s,v)=> s + (v.h||"").length, 0);
    if(znakow + waga > SYNC_HIST_BUDZET){ pominietych++; continue; }
    znakow += waga;
    wynik.push(r);
  }
  if(pominietych) console.info("Uzgadnianie: historia " + pominietych +
    " notatek nie weszła do pliku (przekroczony budżet " + ludzkiRozmiar(SYNC_HIST_BUDZET) + ")");
  return wynik;
}

/**
 * Cała zawartość tego urządzenia w postaci przenośnej.
 * Notatki tracą lokalne numery etykiet i zakładek, a dostają odsyłacze po uid.
 */
async function syncEksport(){
  syncNadajUidy();
  const opisy = syncListy();
  const dane = {
    format: SYNC_FORMAT,
    wersja: SYNC_WERSJA,
    zapisane: new Date().toISOString(),
    urzadzenie: syncNazwaUrzadzenia(),
    kolejnosc: syncKolejnoscDoPliku(),
    historia: await syncHistoriaDoPliku(),
    notes: notes.map(syncNotatkaDoPliku)
  };
  opisy.forEach(o=>{ dane[o.rodzaj] = o.lista().map(o.wyjscie); });
  return dane;
}

/** Notatka w postaci przenośnej: bez lokalnych numerów, z uid. */
function syncNotatkaDoPliku(n){
  const p = {};
  for(const k in n){
    if(k === "tg" || k === "ptb" || k === "stb" || k === "nw") continue;
    p[k] = n[k];
  }
  p.tgU = (n.tg || []).map(id=>{ const t = tags.find(x=>x.id===id); return t && t.uid; })
                      .filter(Boolean);
  const ptb = (typeof pubTabs!=="undefined" && n.ptb!==undefined)
    ? pubTabs.find(x=>x.id===n.ptb) : null;
  if(ptb && ptb.uid) p.ptbU = ptb.uid;
  const stb = (typeof secTabs!=="undefined" && n.stb!==undefined)
    ? secTabs.find(x=>x.id===n.stb) : null;
  if(stb && stb.uid) p.stbU = stb.uid;
  return p;
}

/** Własna kolejność w panelu Publikacje — jedna całość, bez rozbierania na części. */
function syncKolejnoscDoPliku(){
  if(typeof pubOrder === "undefined") return null;
  return {pubOrder: pubOrder};
}

/* ==========================================================================
   3. PODPISY I PODSTAWA

   PODSTAWA MA DWIE POŁOWY, I TO JEST TU NAJWAŻNIEJSZE.

   Naturalnym odruchem jest zapisać po uzgodnieniu jeden stan: „na tym się
   zgodziliśmy". Wystarczy jednak jedna sytuacja, żeby to zawiodło, i to
   sytuacja codzienna na iPhonie, gdzie „Wczytaj zmiany" i „Wyślij zmiany" to
   dwa osobne naciśnięcia:

     • w pliku leży stan X, u nas też X — podstawa: X;
     • poprawiamy notatkę u siebie: mamy Y, w pliku nadal X;
     • wczytujemy plik. Zmiana jest tylko u nas, więc słusznie zostaje Y.
       Podstawa zapisuje się jako Y — i tu jest błąd;
     • wysłania zmian nie robimy (albo się nie udaje);
     • wczytujemy TEN SAM plik jeszcze raz. Teraz u nas Y = podstawa, a w pliku
       X ≠ podstawa, czyli „zmiana tylko w pliku" — i nasza poprawka zostaje
       zastąpiona starym X. Po cichu, bez pytania.

   Dlatego podstawa pamięta OSOBNO dwie rzeczy:

     baza.moje  — jaki był NASZ stan przy ostatnim uzgodnieniu
     baza.plik  — co wtedy STAŁO W PLIKU

   Zmianę u siebie rozpoznajemy po różnicy z baza.moje, zmianę w pliku — po
   różnicy z baza.plik. W przykładzie wyżej przy drugim czytaniu wychodzi:
   u nas bez zmian (Y = Y), w pliku bez zmian (X = X) — więc nie dzieje się
   nic, a nasza poprawka czeka na wysłanie. Tak samo działa to przy wersji
   ODRZUCONEJ w oknie sporów: raz odrzucona nie wraca, bo od tego czasu nikt
   jej w pliku nie ruszył.

   Po udanym ZAPISIE pliku obie połowy zrównują się ze sobą — plik ma wtedy
   dokładnie to, co my.
   ========================================================================== */

/**
 * PODPIS TREŚCI NOTATKI.
 *
 * Data zmiany wystarcza: każda zmiana treści przechodzi przez markDirty, który
 * ją podbija. Do tego stan usunięcia, bo skasowanie notatki zostawia ślad
 * (`del`), a nie dziurę.
 */
function syncPodpisTresci(n){
  return [n.mo || "", n.del ? 1 : 0, n.delAt || ""].join("");
}
/**
 * PODPIS DROBIAZGÓW: powtórka, przypięcie, ulubione oraz organizacja Centrum.
 *
 * Te trzy zapisują się BEZ podbijania daty zmiany — i słusznie, bo umówienie
 * powrotu do notatki nie jest zmianą jej treści. Gdyby jednak wchodziły do
 * podpisu treści, ustawienie powtórki na iPadzie wyglądałoby jak spór
 * o treść. Idą więc osobno i scalają się same, bez pytania (patrz
 * syncScalDrobiazgi).
 */
function syncPodpisDrobiazgow(n){
  return [n.pwt ? (n.pwt.d + "/" + n.pwt.o) : "", n.pin ? 1 : 0, n.fav ? 1 : 0,
          n.cenq||"", n.ceni||""].join("");
}

/** Podpisy CAŁEGO stanu tego urządzenia. */
function syncStanTeraz(){
  const s = {notes:{}, listy:{}, kolejnosc:JSON.stringify(syncKolejnoscDoPliku())};
  notes.forEach(n=>{ s.notes[n.g] = [syncPodpisTresci(n), syncPodpisDrobiazgow(n)]; });
  syncListy().forEach(o=>{
    const m = {};
    o.lista().forEach(r=>{ if(r && r.uid) m[r.uid] = o.podpis(o.wyjscie(r)); });
    s.listy[o.rodzaj] = m;
  });
  return s;
}
/** Podpisy stanu, jaki stał w przeczytanym pliku. */
function syncStanZPliku(dane, opisy){
  const s = {notes:{}, listy:{}, kolejnosc:JSON.stringify(
    dane.kolejnosc === undefined ? null : dane.kolejnosc)};
  (dane.notes || []).forEach(n=>{
    if(n && n.g) s.notes[n.g] = [syncPodpisTresci(n), syncPodpisDrobiazgow(n)];
  });
  opisy.forEach(o=>{
    const m = {};
    (dane[o.rodzaj] || []).forEach(r=>{ if(r && r.uid) m[r.uid] = o.podpis(r); });
    s.listy[o.rodzaj] = m;
  });
  return s;
}

/**
 * Podstawa z ostatniego udanego uzgodnienia albo null.
 * Zapis w starszej postaci (jedna połowa) traktujemy jak brak podstawy —
 * lepiej raz zapytać o rozbieżności niż wnioskować z niepełnych danych.
 */
async function syncPodstawa(){
  if(!idb) return null;
  try{
    const b = await idbGet("meta", SYNC_K_BAZA);
    return (b && b.moje && b.plik && b.moje.notes && b.plik.notes) ? b : null;
  }catch(e){ return null; }
}
/**
 * Zapisuje podstawę.
 * @param {Object} [stanPliku]  podpisy stanu z przeczytanego pliku; gdy go nie
 *   ma (bo plik był pusty albo właśnie go nadpisaliśmy naszą treścią),
 *   obie połowy są takie same.
 */
async function syncZapiszPodstawe(stanPliku){
  if(!idb) return;
  const moje = syncStanTeraz();
  const b = {kiedy:new Date().toISOString(), moje, plik: stanPliku || moje};
  try{ await idbPut("meta", b, SYNC_K_BAZA); }
  catch(e){ console.warn("Nie zapisano podstawy uzgadniania", e); }
}
/** Po udanym zapisie pliku obie połowy podstawy są tym samym. */
async function syncPodstawaPoZapisie(){ await syncZapiszPodstawe(null); }
/** Zapomina podstawę — następne uzgodnienie będzie pierwszym. */
async function syncZapomnijPodstawe(){
  if(!idb) return;
  try{ await idbDelKey("meta", SYNC_K_BAZA); }catch(e){}
}

/* ==========================================================================
   4. SCALANIE
   ========================================================================== */

/**
 * CZY REKORD ZMIENIŁ SIĘ U NAS OD OSTATNIEGO UZGODNIENIA.
 *
 * Dwa powody, a nie jeden:
 *
 *  1. nasz obecny podpis różni się od tego, co podstawa pamięta jako nasz —
 *     to oczywisty przypadek;
 *  2. obie POŁOWY podstawy się różnią. To znaczy, że przy ostatnim uzgodnieniu
 *     rozjechaliśmy się z plikiem i rozjazd trwa: albo obroniliśmy swoją wersję
 *     w oknie sporów, albo zmieniliśmy coś u siebie i jeszcze tego nie
 *     wysłaliśmy. Dopóki plik nie dostanie naszej wersji, jesteśmy „zmienieni".
 *
 * Bez drugiego powodu wychodziło tak: obroniona wersja przeżywała powtórne
 * wczytanie TEGO SAMEGO pliku, ale gdy na drugim urządzeniu dopisano do tej
 * notatki cokolwiek nowego, uzgadnianie brało to za „zmianę tylko w pliku"
 * i nadpisywało obronioną pracę bez pytania.
 */
function syncZmienioneUNas(wPodstawieMoje, wPodstawiePlik, teraz){
  if(wPodstawieMoje === undefined) return true;
  if(wPodstawieMoje !== teraz) return true;
  return wPodstawieMoje !== wPodstawiePlik;
}

/**
 * KOJARZENIE PO NAZWIE PRZY PIERWSZYM SPOTKANIU.
 *
 * Dwa urządzenia, które nigdy się nie uzgadniały, mają swoje własne uid dla
 * etykiety „Betel". Bez tego kroku po pierwszym uzgodnieniu byłyby dwie.
 * Rekord lokalny PRZYJMUJE uid z pliku — plik odsyła się do swoich uid
 * w notatkach, więc przepisanie ich wszystkich byłoby robotą na darmo.
 *
 * @returns {number} ile rekordów skojarzono
 */
function syncSkojarzPoNazwie(o, zdalne, podstawa){
  const lokalne = o.lista();
  const uidLokalne = new Set(lokalne.map(r=>r && r.uid).filter(Boolean));
  const bezPary = (zdalne||[]).filter(z=> z && z.uid && !uidLokalne.has(z.uid));
  if(!bezPary.length) return 0;
  /* Kandydat lokalny musi być równie osamotniony: rekord, który już ma parę
     w pliku, nie może zostać skojarzony po raz drugi. */
  const uidZdalne = new Set((zdalne||[]).map(z=>z && z.uid).filter(Boolean));
  const wolne = new Map();
  lokalne.forEach(r=>{
    if(!r || uidZdalne.has(r.uid)) return;
    const k = o.klucz(r);
    if(k && !wolne.has(k)) wolne.set(k, r);
  });
  let ile = 0;
  bezPary.forEach(z=>{
    /* Rekord z pliku jest w postaci PRZENOŚNEJ (odsyłacze po uid), więc jego
       klucz liczy kluczP, a nie klucz — ten drugi czyta lokalne numery. */
    const kandydat = wolne.get(o.kluczP(z));
    if(!kandydat) return;
    wolne.delete(o.kluczP(z));
    /* Podstawa jest kluczowana po uid — przy zmianie uid trzeba przenieść też
       jej wpisy, inaczej rekord wyglądałby na nowy po obu stronach. */
    if(podstawa) ["moje","plik"].forEach(pol=>{
      const m = podstawa[pol] && podstawa[pol].listy && podstawa[pol].listy[o.rodzaj];
      if(m && m[kandydat.uid] !== undefined){ m[z.uid] = m[kandydat.uid]; delete m[kandydat.uid]; }
    });
    kandydat.uid = z.uid;
    ile++;
  });
  if(ile) o.zapis();
  return ile;
}

/**
 * TRÓJSTRONNE SCALANIE JEDNEJ LISTY.
 *
 * Nie zmienia jeszcze niczego w aplikacji — zwraca decyzje. Wprowadza je
 * w życie syncZastosuj, po ewentualnym rozstrzygnięciu sporów.
 *
 * doPliku zlicza to, o czym plik jeszcze nie wie. Zero na wszystkich listach
 * i notatkach znaczy, że pliku nie ma po co przepisywać — przy ośmiu tysiącach
 * notatek to kilkanaście megabajtów zapisu i kolejna wysyłka do chmury.
 */
function syncScalListe(o, zdalne, bazaMoje, bazaPlik){
  const wynik = {rodzaj:o.rodzaj, nowe:[], podmiany:[], usunLokalnie:[], konflikty:[], doPliku:0};
  const bl = bazaMoje || null, bz = bazaPlik || null;
  const zdalneMapa = new Map();
  (zdalne||[]).forEach(z=>{ if(z && z.uid) zdalneMapa.set(z.uid, z); });
  const lokalneMapa = new Map();
  o.lista().forEach(r=>{ if(r && r.uid) lokalneMapa.set(r.uid, r); });

  zdalneMapa.forEach((zd, uid)=>{
    const lo = lokalneMapa.get(uid);
    const pz = o.podpis(zd);
    const wPodstawieZ = bz ? bz[uid] : undefined;
    const zmienioneTam = !bz || wPodstawieZ === undefined || wPodstawieZ !== pz;
    if(!lo){
      /* Rekordu u nas nie ma. Jeśli podstawa go nie znała, jest po prostu nowy
         w pliku. Jeśli znała — skasowaliśmy go po ostatnim uzgodnieniu. */
      const bylUNas = bl && bl[uid] !== undefined;
      if(!bylUNas){ wynik.nowe.push(zd); return; }
      if(!zmienioneTam){ wynik.doPliku++; return; }   // ma zniknąć także w pliku
      wynik.konflikty.push({rodzaj:o.rodzaj, uid, typ:"usuniete-tu",
        opis:o.opis(zd), zdalny:zd, lokalny:null, domyslnie:"moje"});
      return;
    }
    const pl = o.podpis(o.wyjscie(lo));
    const zmienioneTu = syncZmienioneUNas(bl ? bl[uid] : undefined,
                                          bz ? bz[uid] : undefined, pl);
    if(pl === pz) return;                                       // zgodne
    if(zmienioneTam && !zmienioneTu){ wynik.podmiany.push([lo, zd]); return; }
    if(zmienioneTu && !zmienioneTam){ wynik.doPliku++; return; }
    if(!zmienioneTu && !zmienioneTam){ wynik.doPliku++; return; }
    if(!bl || !bz){
      /* Pierwsze uzgodnienie — nie ma z czym porównać. Układ z pliku nie jest
         ani lepszy, ani gorszy od naszego, więc zostawiamy swój i mówimy
         o tym w podsumowaniu. Notatki mają tu inną regułę (nowsza data). */
      wynik.doPliku++; return;
    }
    wynik.konflikty.push({rodzaj:o.rodzaj, uid, typ:"oba",
      opis:o.opis(zd), zdalny:zd, lokalny:o.wyjscie(lo), domyslnie:"moje"});
  });

  lokalneMapa.forEach((lo, uid)=>{
    if(zdalneMapa.has(uid)) return;
    const bylWPliku = bz && bz[uid] !== undefined;
    if(!bylWPliku){ wynik.doPliku++; return; }        // nowy u nas → pojedzie do pliku
    const pl = o.podpis(o.wyjscie(lo));
    const zmienioneTu = syncZmienioneUNas(bl ? bl[uid] : undefined,
                                          bz ? bz[uid] : undefined, pl);
    if(!zmienioneTu){ wynik.usunLokalnie.push(lo); return; }   // skasowane w pliku
    wynik.konflikty.push({rodzaj:o.rodzaj, uid, typ:"usuniete-tam",
      opis:o.opis(o.wyjscie(lo)), zdalny:null, lokalny:o.wyjscie(lo), domyslnie:"moje"});
  });
  return wynik;
}

/**
 * SCALANIE DROBIAZGÓW NOTATKI (powtórka, przypięcie, ulubione).
 *
 * Nigdy nie pyta. Gdy obie strony zmieniły to samo pole, wybieramy wariant,
 * który niczego nie gubi: wcześniejszy termin powrotu (lepiej dostać
 * przypomnienie za wcześnie niż wcale) i „tak" dla przypięcia i ulubionych.
 */
function syncScalDrobiazgi(n, zd, byloU, byloW){
  let zmiana = false;
  const pl = syncPodpisDrobiazgow(n);
  const pz = syncPodpisDrobiazgow(zd);
  if(pl === pz) return false;
  const zmienioneTu  = byloU === undefined || byloU !== pl;
  const zmienioneTam = byloW === undefined || byloW !== pz;
  if(!zmienioneTam) return false;                      // w pliku bez zmian — nasze zostaje
  if(!zmienioneTu){                                    // zmiana tylko w pliku
    if(zd.pwt && zd.pwt.d) n.pwt = {d:zd.pwt.d, o:zd.pwt.o}; else delete n.pwt;
    n.pin = !!zd.pin;
    n.fav = !!zd.fav;
    if(zd.cenq) n.cenq = zd.cenq; else delete n.cenq;
    if(zd.ceni) n.ceni = zd.ceni; else delete n.ceni;
    return true;
  }
  /* Oba naraz albo brak podstawy — rozstrzygamy bez pytania, na korzyść tego,
     co więcej zachowuje. */
  const dataMoja = n.pwt && n.pwt.d, dataTam = zd.pwt && zd.pwt.d;
  if(dataTam && (!dataMoja || dataTam < dataMoja)){ n.pwt = {d:zd.pwt.d, o:zd.pwt.o}; zmiana = true; }
  if(zd.pin && !n.pin){ n.pin = true; zmiana = true; }
  if(zd.fav && !n.fav){ n.fav = true; zmiana = true; }
  /* Przy równoczesnej zmianie zachowujemy wpis zamiast go zgubić. Jeśli oba
     urządzenia dodały notatkę, wcześniejsza data utrzymuje stabilną kolejność. */
  ["cenq","ceni"].forEach(p=>{
    if(zd[p] && (!n[p] || String(zd[p]) < String(n[p]))){ n[p]=zd[p]; zmiana=true; }
  });
  return zmiana;
}

/**
 * TRÓJSTRONNE SCALANIE NOTATEK.
 *
 * @param {Array} zdalne  notatki z pliku, w postaci przenośnej
 * @param {Object|null} bazaMoje  {guid: [podpisTresci, podpisDrobiazgow]} — nasz stan
 * @param {Object|null} bazaPlik  to samo dla stanu, jaki stał w pliku
 */
function syncScalNotatki(zdalne, bazaMoje, bazaPlik){
  const wynik = {nowe:[], podmiany:[], konflikty:[], drobiazgi:[], pierwsze:0, doPliku:0};
  const moje = new Map();
  notes.forEach(n=>moje.set(n.g, n));
  /* Notatka, której plik w ogóle nie zna, musi do niego pojechać. */
  const wPliku = new Set((zdalne||[]).map(z=>z && z.g).filter(Boolean));
  notes.forEach(n=>{ if(!wPliku.has(n.g)) wynik.doPliku++; });

  (zdalne||[]).forEach(zd=>{
    if(!zd || !zd.g) return;
    const n = moje.get(zd.g);
    if(!n){ wynik.nowe.push(zd); return; }
    const bu = bazaMoje ? bazaMoje[zd.g] : undefined;
    const bw = bazaPlik ? bazaPlik[zd.g] : undefined;
    if(syncScalDrobiazgi(n, zd, Array.isArray(bu) ? bu[1] : undefined,
                                Array.isArray(bw) ? bw[1] : undefined))
      wynik.drobiazgi.push(n);
    else if(syncPodpisDrobiazgow(n) !== syncPodpisDrobiazgow(zd)) wynik.doPliku++;
    /* Data ostatniego otwarcia nie jest sporna — bierzemy późniejszą. */
    if(zd.la && (!n.la || String(zd.la) > String(n.la))) n.la = zd.la;

    const pl = syncPodpisTresci(n), pz = syncPodpisTresci(zd);
    if(pl === pz) return;
    const wU = Array.isArray(bu) ? bu[0] : undefined;
    const wW = Array.isArray(bw) ? bw[0] : undefined;
    if(wU === undefined && wW === undefined){
      /* Brak podstawy dla tej notatki: albo pierwsze uzgodnienie, albo notatka
         powstała po nim po obu stronach. Nie ma jak stwierdzić, kto się
         zmienił, więc stosujemy regułę znaną z wczytywania kopii — wygrywa
         nowsza data zmiany. Sporne pytania zostawiamy na sytuacje, w których
         naprawdę wiadomo, że doszło do rozjazdu. */
      if(String(zd.mo||"") > String(n.mo||"")){ wynik.podmiany.push([n, zd]); wynik.pierwsze++; }
      else wynik.doPliku++;
      return;
    }
    const zmienioneTu  = syncZmienioneUNas(wU, wW, pl);
    const zmienioneTam = wW === undefined || wW !== pz;
    if(zmienioneTam && !zmienioneTu){ wynik.podmiany.push([n, zd]); return; }
    if(!zmienioneTam){ wynik.doPliku++; return; }     // w pliku bez zmian — nasze zostaje
    wynik.konflikty.push({rodzaj:"notes", uid:zd.g, typ:"oba",
      opis: (n.t || zd.t || "Notatka bez tytułu"),
      lokalny:n, zdalny:zd, domyslnie:"moje"});
  });
  return wynik;
}

/** Kolejność w panelu Publikacje — całość, jedna decyzja. */
function syncScalKolejnosc(zdalna, bazaMoje, bazaPlik){
  const moja = JSON.stringify(syncKolejnoscDoPliku());
  const tam  = JSON.stringify(zdalna === undefined ? null : zdalna);
  if(moja === tam) return null;
  if(bazaMoje === undefined || bazaPlik === undefined) return {typ:"doPliku"};
  const zmienioneTu  = syncZmienioneUNas(bazaMoje, bazaPlik, moja);
  const zmienioneTam = bazaPlik !== tam;
  if(zmienioneTam && !zmienioneTu) return {typ:"bierz", zdalna};
  if(!zmienioneTam) return {typ:"doPliku"};
  return {typ:"konflikt", zdalna};
}

/**
 * Historia wersji — dziennik, nie stan. Scala się przez zsumowanie po czasie.
 *
 * Jeden odczyt CAŁEGO magazynu i jeden zapis porcjami, a nie odczyt na każdą
 * notatkę. Przy ośmiu tysiącach notatek historię ma około ośmiuset — osiemset
 * osobnych transakcji zajmowało pół sekundy i było najdroższą częścią całego
 * uzgadniania, także wtedy, gdy nie dochodził ani jeden nowy wpis.
 */
async function syncScalHistorie(zdalna){
  if(!idb || !Array.isArray(zdalna) || !zdalna.length) return 0;
  let moje;
  try{ moje = await idbAll("wersje"); }catch(e){ return 0; }
  const mapa = new Map();
  moje.forEach(r=>{ if(r && r.g) mapa.set(r.g, Array.isArray(r.lista) ? r.lista : []); });
  const doZapisu = [];
  let dolozonych = 0;
  for(const r of zdalna){
    if(!r || !r.g || !Array.isArray(r.lista) || !r.lista.length) continue;
    const lista = mapa.get(r.g) || [];
    const czasy = new Set(lista.map(v=>v.t));
    const nowe = r.lista.filter(v=> v && v.t && typeof v.h === "string" && !czasy.has(v.t));
    if(!nowe.length) continue;
    const razem = [...lista, ...nowe].sort((a,b)=> String(b.t).localeCompare(String(a.t)));
    doZapisu.push({g:r.g, lista: wersjeProzchudz(razem)});
    dolozonych += nowe.length;
  }
  if(doZapisu.length){
    try{ await idbBulkChunked("wersje", doZapisu); }
    catch(e){ console.warn("Nie zapisano scalonej historii wersji", e); return 0; }
  }
  return dolozonych;
}

/* ==========================================================================
   5. WPROWADZANIE DECYZJI W ŻYCIE
   ========================================================================== */

/**
 * Zamienia decyzje na zmiany w pamięci aplikacji i w bazie urządzenia.
 *
 * Kolejność jest istotna: sekcje → zakładki sekcji → etykiety. Etykieta może
 * wskazywać jednocześnie sekcję i zakładkę, więc obie mapy muszą już istnieć.
 * Wszystkie listy powstają przed notatkami, które odsyłają do nich dalej.
 */
async function syncZastosuj(plan){
  const st = {notatekNowych:0, notatekZmienionych:0, etykietNowych:0,
              etykietZmienionych:0, etykietUsunietych:0, innych:0,
              drobiazgow:0, wersji:0, kolejnosc:false};
  const zmienioneNotatki = new Set();

  /* ——— listy ——— */
  const kolejnoscList=[...plan.opisy].sort((a,b)=>{
    const pri={sections:0,secTabs:1,tags:2,pubTabs:3,szablony:4};
    return (pri[a.rodzaj]??9)-(pri[b.rodzaj]??9);
  });
  for(const o of kolejnoscList){
    const w = plan.listy[o.rodzaj];
    if(!w) continue;
    const lista = o.lista();
    let ruszone = false;
    /* Mapa uid→id musi znać rekordy, które JUŻ są, zanim dojdą nowe. */
    lista.forEach(r=>{ if(r && r.uid) o._mapa[r.uid] = r.id; });

    w.usunLokalnie.forEach(r=>{
      const i = lista.indexOf(r);
      if(i >= 0){ lista.splice(i, 1); ruszone = true;
        if(o.rodzaj === "tags"){
          st.etykietUsunietych++;
          if(idb) idbDelKey("tags", r.id).catch(()=>{});
          notes.forEach(n=>{ if(n.tg && n.tg.includes(r.id)){
            n.tg = n.tg.filter(x=>x!==r.id); zmienioneNotatki.add(n); } });
        } else st.innych++;
        delete o._mapa[r.uid];
      }
    });
    w.podmiany.forEach(([lo, zd])=>{
      const nowy = o.wejscie(zd, lo.id);
      /* `open` i `nw` to stan ekranu tego urządzenia — zostają. */
      if(lo.open !== undefined) nowy.open = lo.open;
      Object.keys(lo).forEach(k=>{ if(!(k in nowy)) delete lo[k]; });
      Object.assign(lo, nowy);
      o._mapa[lo.uid] = lo.id;
      ruszone = true;
      if(o.rodzaj === "tags") st.etykietZmienionych++; else st.innych++;
    });
    w.nowe.forEach(zd=>{
      const id = nastepnyNumer(lista);
      const rek = o.wejscie(zd, id);
      lista.push(rek);
      o._mapa[rek.uid] = id;
      ruszone = true;
      if(o.rodzaj === "tags") st.etykietNowych++; else st.innych++;
    });
    if(ruszone) o.zapis();
  }

  /* ——— notatki ——— */
  const mapaTag = plan.opisy.find(o=>o.rodzaj==="tags")._mapa;
  const mapaPub = plan.opisy.find(o=>o.rodzaj==="pubTabs")._mapa;
  const mapaSek = plan.opisy.find(o=>o.rodzaj==="secTabs")._mapa;
  const doLokalnej = (zd)=>{
    const n = {};
    for(const k in zd){ if(k==="tgU"||k==="ptbU"||k==="stbU") continue; n[k] = zd[k]; }
    n.tg = (zd.tgU || []).map(u=>mapaTag[u]).filter(v=>v!==undefined);
    if(zd.ptbU !== undefined && mapaPub[zd.ptbU] !== undefined) n.ptb = mapaPub[zd.ptbU];
    if(zd.stbU !== undefined && mapaSek[zd.stbU] !== undefined) n.stb = mapaSek[zd.stbU];
    return sanitizeNote(n, true);
  };
  plan.notatki.nowe.forEach(zd=>{
    const n = doLokalnej(zd);
    if(!n) return;
    notes.push(n); zmienioneNotatki.add(n); st.notatekNowych++;
  });
  plan.notatki.podmiany.forEach(([n, zd])=>{
    const nowa = doLokalnej(zd);
    if(!nowa) return;
    /* Drobiazgi mają już swój, uzgodniony stan — podmiana treści go nie zdejmuje. */
    const pwt = n.pwt, pin = n.pin, fav = n.fav, la = n.la,
          cenq = n.cenq, ceni = n.ceni;
    Object.keys(n).forEach(k=>{ if(!(k in nowa)) delete n[k]; });
    Object.assign(n, nowa);
    if(pwt) n.pwt = pwt; else delete n.pwt;
    n.pin = pin; n.fav = fav;
    if(cenq) n.cenq = cenq; else delete n.cenq;
    if(ceni) n.ceni = ceni; else delete n.ceni;
    if(la && (!n.la || String(la) > String(n.la))) n.la = la;
    zmienioneNotatki.add(n); st.notatekZmienionych++;
  });
  plan.notatki.drobiazgi.forEach(n=>{ zmienioneNotatki.add(n); st.drobiazgow++; });

  /* ——— rozstrzygnięte spory ——— */
  (plan.rozstrzygniete || []).forEach(k=>{
    if(k.rodzaj !== "notes") return;
    if(k.wybor === "zdalna"){
      const n = notes.find(x=>x.g===k.uid);
      if(!n) return;
      /* To jedyne miejsce, w którym uzgadnianie NADPISUJE pracę użytkownika —
         więc wersja sprzed nadpisania idzie do historii. */
      if(typeof saveVersion === "function") saveVersion(n);
      const nowa = doLokalnej(k.zdalny);
      if(!nowa) return;
      Object.keys(n).forEach(x=>{ if(!(x in nowa)) delete n[x]; });
      Object.assign(n, nowa);
      zmienioneNotatki.add(n); st.notatekZmienionych++;
    } else if(k.wybor === "obie"){
      const n = notes.find(x=>x.g===k.uid);
      const nowa = doLokalnej(k.zdalny);
      if(!nowa) return;
      /* Kopia dostaje NOWY identyfikator — inaczej za chwilę znów byłyby dwie
         notatki o tym samym guid i spór wróciłby przy następnym uzgodnieniu. */
      nowa.g = syncNowyUid().toUpperCase();   // tak samo jak przy nowej notatce
      nowa.t = (nowa.t || "") + " (z " + (plan.skad || "drugiego urządzenia") + ")";
      nowa.cr = nowa.cr || new Date().toISOString();
      notes.push(nowa); zmienioneNotatki.add(nowa); st.notatekNowych++;
      if(n) zmienioneNotatki.add(n);
    }
    /* "moja" — nic nie robimy; nasza wersja pojedzie do pliku przy zapisie. */
  });
  (plan.rozstrzygniete || []).forEach(k=>{
    if(k.rodzaj === "notes" || k.wybor !== "zdalna") return;
    const o = plan.opisy.find(x=>x.rodzaj===k.rodzaj);
    if(!o) return;
    const lista = o.lista();
    const lo = lista.find(r=>r && r.uid===k.uid);
    if(k.typ === "usuniete-tam"){
      const i = lista.indexOf(lo);
      if(i >= 0){ lista.splice(i,1); o.zapis();
        if(o.rodzaj==="tags" && idb) idbDelKey("tags", lo.id).catch(()=>{}); }
      return;
    }
    if(!k.zdalny) return;
    if(lo){
      const nowy = o.wejscie(k.zdalny, lo.id);
      if(lo.open !== undefined) nowy.open = lo.open;
      Object.keys(lo).forEach(x=>{ if(!(x in nowy)) delete lo[x]; });
      Object.assign(lo, nowy);
    } else {
      const id = nastepnyNumer(lista);
      lista.push(o.wejscie(k.zdalny, id));
    }
    o.zapis();
    st.innych++;
  });

  /* ——— kolejność ——— */
  if(plan.kolejnosc && plan.kolejnosc.typ === "bierz" && typeof pubOrder !== "undefined"){
    const z = plan.kolejnosc.zdalna;
    if(z && typeof z.pubOrder === "object" && z.pubOrder){
      pubOrder = z.pubOrder;
      if(typeof savePubOrder === "function") savePubOrder();
      st.kolejnosc = true;
    }
  }

  /* ——— zapis notatek ——— */
  if(idb && zmienioneNotatki.size)
    await idbBulkChunked("notes", [...zmienioneNotatki]).catch(e=>reportSaveError(e,"uzgadnianie"));

  /* ——— historia ——— */
  st.wersji = await syncScalHistorie(plan.historia);
  return st;
}

/* ==========================================================================
   6. JEDNO UZGODNIENIE OD POCZĄTKU DO KOŃCA
   ========================================================================== */

/** Sito na wczytany plik uzgadniania. Rzuca wyjątkiem z czytelnym powodem. */
function syncSprawdzPlik(dane){
  if(!dane || typeof dane !== "object")
    throw new Error("To nie jest plik uzgadniania JW Study");
  if(dane.format !== SYNC_FORMAT){
    if(Array.isArray(dane.notes) && Array.isArray(dane.tags))
      throw new Error("To jest zwykła kopia zapasowa, nie plik uzgadniania — wczytaj ją przez Plik → Wczytaj kopię danych");
    throw new Error("To nie jest plik uzgadniania JW Study");
  }
  if(Number(dane.wersja) > SYNC_WERSJA)
    throw new Error("Plik pochodzi z nowszej wersji aplikacji (" + dane.wersja +
                    "). Zaktualizuj aplikację na tym urządzeniu.");
  if(!Array.isArray(dane.notes)) throw new Error("W pliku brakuje listy notatek");
  if(dane.notes.length > MAX_NOTATEK)
    throw new Error("Plik zawiera " + dane.notes.length + " notatek, a dopuszczalne jest do " + MAX_NOTATEK);
  /* Treść notatek z pliku przechodzi przez ten sam filtr, co treść z kopii —
     plik krąży po chmurze i mógł zostać po drodze zmieniony. */
  dane.notes = dane.notes.filter(n=>{
    if(!n || typeof n!=="object" || !n.g) return false;
    if(typeof n.h === "string" && n.h) n.h = czystyHtmlZObcegoZrodla(n.h);
    if(n.bg != null && !kolorBezpieczny(n.bg)) delete n.bg;
    if(!Array.isArray(n.tgU)) n.tgU = [];
    return true;
  });
  ["sections","tags","pubTabs","secTabs","szablony"].forEach(k=>{
    if(!Array.isArray(dane[k])){ dane[k] = []; return; }
    dane[k] = dane[k].filter(r=>{
      if(!r || typeof r!=="object" || !r.uid) return false;
      if(r.color != null && !kolorBezpieczny(r.color)) delete r.color;
      return true;
    });
  });
  if((dane.tags||[]).length > MAX_ETYKIET)
    throw new Error("Plik zawiera " + dane.tags.length + " etykiet, a dopuszczalne jest do " + MAX_ETYKIET);
  if(!Array.isArray(dane.historia)) dane.historia = [];
  return dane;
}

/**
 * SCALENIE WCZYTANEGO PLIKU Z TYM, CO JEST NA URZĄDZENIU.
 *
 * @param {Object} dane      zawartość pliku uzgadniania
 * @param {boolean} [bezPytania]  nie pokazuj okna sporów (przy uzgadnianiu w tle,
 *                                gdy użytkownik właśnie coś pisze)
 * @returns {Promise<{st:Object, konflikty:number, odlozone:boolean}>}
 */
async function syncScalDane(dane, bezPytania){
  dane = syncSprawdzPlik(dane);
  syncNadajUidy();
  const opisy = syncListy();
  const podstawa = await syncPodstawa();
  const bMoje = podstawa ? podstawa.moje : null;
  const bPlik = podstawa ? podstawa.plik : null;

  /* Pierwsze spotkanie: skojarz rekordy po nazwie, żeby nie powstały bliźniaki.
     Robimy to PRZED odczytaniem podpisów pliku, bo kojarzenie zmienia uid. */
  opisy.forEach(o=> syncSkojarzPoNazwie(o, dane[o.rodzaj], podstawa));

  const plan = {opisy, listy:{}, notatki:null, kolejnosc:null,
                historia:dane.historia, skad:(dane.urzadzenie || "drugiego urządzenia"),
                rozstrzygniete:[]};
  let konflikty = [];
  opisy.forEach(o=>{
    const w = syncScalListe(o, dane[o.rodzaj],
                            bMoje ? bMoje.listy[o.rodzaj] : null,
                            bPlik ? bPlik.listy[o.rodzaj] : null);
    plan.listy[o.rodzaj] = w;
    konflikty = konflikty.concat(w.konflikty);
  });
  plan.notatki = syncScalNotatki(dane.notes,
                                 bMoje ? bMoje.notes : null,
                                 bPlik ? bPlik.notes : null);
  konflikty = konflikty.concat(plan.notatki.konflikty);
  const k = syncScalKolejnosc(dane.kolejnosc,
                              bMoje ? bMoje.kolejnosc : undefined,
                              bPlik ? bPlik.kolejnosc : undefined);
  if(k && k.typ === "konflikt"){
    konflikty.push({rodzaj:"kolejnosc", uid:"kolejnosc", typ:"oba",
      opis:"Kolejność pozycji w panelu Publikacje", zdalny:k.zdalna, lokalny:null,
      domyslnie:"moje"});
  } else plan.kolejnosc = k;

  if(konflikty.length){
    if(bezPytania) return {st:null, konflikty:konflikty.length, odlozone:true};
    const wybory = await pokazSpory(konflikty, dane.urzadzenie || "drugie urządzenie");
    if(wybory === null) return {st:null, konflikty:konflikty.length, odlozone:true};
    plan.rozstrzygniete = wybory;
    /* Kolejność rozstrzygana w oknie, nie w planie. */
    const kk = wybory.find(x=>x.rodzaj==="kolejnosc");
    if(kk && kk.wybor === "zdalna") plan.kolejnosc = {typ:"bierz", zdalna:kk.zdalny};
  }

  const st = await syncZastosuj(plan);
  st.pierwsze = plan.notatki.pierwsze;
  st.sporow = konflikty.length;
  /* Czy plik trzeba przepisać. Nasza wersja obroniona w sporze też musi tam
     trafić — inaczej drugie urządzenie zapytałoby o to samo jeszcze raz. */
  st.doPliku = plan.notatki.doPliku
    + opisy.reduce((s2, o)=> s2 + ((plan.listy[o.rodzaj] || {}).doPliku || 0), 0)
    + (plan.rozstrzygniete || []).filter(x=>x.wybor !== "zdalna").length
    + ((k && (k.typ === "konflikt" || k.typ === "doPliku")) ? 1 : 0);
  /* Cokolwiek weszło do naszych danych? Tylko wtedy warto przerysowywać ekran —
     przy ośmiu tysiącach notatek pełne przerysowanie to grubo ponad sto
     milisekund, a uzgadnianie zagląda do pliku samo, w tle. */
  const cosWeszlo = st.notatekNowych + st.notatekZmienionych + st.drobiazgow
    + st.etykietNowych + st.etykietZmienionych + st.etykietUsunietych
    + st.innych + st.wersji + (st.kolejnosc ? 1 : 0);
  if(cosWeszlo){
    if(typeof sortTags === "function") sortTags();
    if(typeof renderAll === "function") renderAll();
    /* Do tablicy trafiło naraz dużo notatek — pamięć podręczna szukania
       buduje się od nowa w bezczynności, a nie przy pierwszym klawiszu. */
    setTimeout(()=>{
      if(!(typeof uruchomIndeksWorkerSzukania==="function" && uruchomIndeksWorkerSzukania()) && typeof rozgrzejCacheSzukania==="function") rozgrzejCacheSzukania();
    },300);
    if(typeof centrumOdswiez === "function") centrumOdswiez();
  }
  /* W podstawie zapisujemy OSOBNO nasz stan i stan pliku — po co, mówi
     komentarz na początku rozdziału 3. */
  await syncZapiszPodstawe(syncStanZPliku(dane, opisy));
  return {st, konflikty:konflikty.length, odlozone:false};
}

/* ==========================================================================
   7. PLIK: AUTOMATYCZNIE (Chromium) I RĘCZNIE (Safari, iPhone, iPad)
   ========================================================================== */

/** Czy ta przeglądarka umie sama pisać do wskazanego pliku. */
function syncPlikAutomatyczny(){
  return typeof window !== "undefined" && typeof window.showSaveFilePicker === "function";
}
/** Zapamiętane wskazanie pliku uzgadniania albo null. */
async function syncUchwyt(){
  if(!idb) return null;
  try{ return (await idbGet("meta", SYNC_K_PLIK)) || null; }catch(e){ return null; }
}
/** Pyta o plik uzgadniania i zapamiętuje wskazanie. */
async function syncWskazPlik(){
  if(!syncPlikAutomatyczny()){
    toast("Ta przeglądarka nie pozwala pisać do wskazanego pliku");
    return false;
  }
  try{
    const uchwyt = await window.showSaveFilePicker({
      suggestedName: "jw-study-uzgadnianie.json",
      types: [{description:"Plik uzgadniania JW Study", accept:{"application/json":[".json"]}}]
    });
    await idbPut("meta", uchwyt, SYNC_K_PLIK);
    lsSet(SYNC_K_AUTO, "1");
    toastOk("Plik uzgadniania: " + (uchwyt.name || "wybrany"));
    syncUruchomOdpytywanie();
    return true;
  }catch(e){
    if(e && e.name === "AbortError") return false;
    console.warn("Nie udało się wskazać pliku uzgadniania", e);
    toastErr("Nie udało się wskazać pliku");
    return false;
  }
}
/** Przestaje używać pliku — zostają przyciski ręczne. */
async function syncZapomnijPlik(){
  if(idb){ try{ await idbDelKey("meta", SYNC_K_PLIK); }catch(e){} }
  lsSet(SYNC_K_AUTO, "0");
  syncZatrzymajOdpytywanie();
  toast("Uzgadnianie automatyczne wyłączone");
}
/** Nazwa wskazanego pliku albo pusty napis. */
async function syncNazwaPliku(){
  const u = await syncUchwyt();
  return u && u.name ? u.name : "";
}

/**
 * UZGODNIENIE PRZEZ WSKAZANY PLIK — czytaj, scal, zapisz.
 * @param {string} powod  do dziennika: "start", "zmiany", "odpytanie", "ręcznie"
 */
async function syncTeraz(powod){
  if(syncPracuje) return null;
  const uchwyt = await syncUchwyt();
  if(!uchwyt){
    if(powod === "ręcznie") toast("Najpierw wskaż plik uzgadniania w Ustawieniach");
    return null;
  }
  /* Bez pytania o prawo do pliku przy uzgadnianiu w tle: pytanie musi wyjść
     z naciśnięcia przycisku, inaczej przeglądarka i tak je odrzuci. */
  const wolno = await prawoDoPliku(uchwyt, powod === "ręcznie");
  if(!wolno){
    syncOpisStanu = "Plik wskazany, ale brak prawa zapisu — kliknij „Uzgodnij teraz”.";
    return null;
  }
  syncPracuje = true;
  try{
    let plik = null;
    try{ plik = await uchwyt.getFile(); }catch(e){ plik = null; }
    /* Plik się nie zmienił od naszego ostatniego przejścia i nie czeka żadna
       nasza zmiana — nie ma czego uzgadniać. Bez tego każde wejście w kartę
       przeliczało osiem tysięcy notatek po nic. */
    if(plik && plik.size && syncZnanyMs && (plik.lastModified || 0) <= syncZnanyMs
       && !syncZwloka && powod !== "ręcznie"){
      return null;
    }
    let wynik = null;
    if(plik && plik.size){
      if(plik.size > SYNC_MAX_PLIK) throw new Error("Plik ma " + ludzkiRozmiar(plik.size) +
        ", a dopuszczalne jest do " + ludzkiRozmiar(SYNC_MAX_PLIK));
      const tekst = await plik.text();
      let dane;
      try{ dane = JSON.parse(tekst); }
      catch(e){ throw new Error("Plik uzgadniania jest uszkodzony (błąd formatu JSON)"); }
      /* W tle nie przerywamy pisania oknem sporów — odkładamy je do chwili,
         gdy uzgadnianie ruszy z przycisku. */
      wynik = await syncScalDane(dane, powod !== "ręcznie" && syncKtosPisze());
      syncZnanyMs = plik.lastModified || 0;
      if(wynik.odlozone){
        syncOpisStanu = "Do rozstrzygnięcia: " + wynik.konflikty +
          (wynik.konflikty === 1 ? " rozbieżność" : " rozbieżności") + " — kliknij „Uzgodnij teraz”.";
        if(powod !== "start") toast("Uzgadnianie czeka na Twoją decyzję — otwórz Ustawienia → Synchronizacja");
        return wynik;
      }
    }
    /* ZAPIS TYLKO WTEDY, GDY PLIK CZEGOŚ NIE WIE.
       Plik z ośmioma tysiącami notatek waży kilkanaście megabajtów. Zapis „na
       wszelki wypadek" przy każdym powrocie do karty i przy każdym zajrzeniu
       do pliku znaczyłby kilkanaście megabajtów przepisywanych bez powodu,
       a w folderze chmury — kolejną wysyłkę tego samego. */
    if(plik && plik.size && wynik && wynik.st && !wynik.st.doPliku){
      lsSet(SYNC_K_KIEDY, new Date().toISOString());
      syncOpisStanu = "";
      if(typeof pokazStanSync === "function") pokazStanSync();
      return wynik;
    }
    const tekstDoZapisu = JSON.stringify(await syncEksport());
    const zapis = await uchwyt.createWritable();
    await zapis.write(tekstDoZapisu);
    await zapis.close();
    try{ syncZnanyMs = (await uchwyt.getFile()).lastModified || Date.now(); }
    catch(e){ syncZnanyMs = Date.now(); }
    syncOstatniZapis = Date.now();
    lsSet(SYNC_K_KIEDY, new Date().toISOString());
    /* Plik ma teraz dokładnie to, co my — obie połowy podstawy się zrównują. */
    await syncPodstawaPoZapisie();
    syncOpisStanu = "";
    if(typeof pokazStanSync === "function") pokazStanSync();
    return wynik;
  }catch(e){
    console.warn("Uzgadnianie nie powiodło się (" + powod + ")", e);
    syncOpisStanu = "Ostatnia próba nie wyszła: " + (e && e.message ? e.message : String(e));
    if(powod === "ręcznie") toastErr("Nie udało się uzgodnić: " + (e && e.message ? e.message : e));
    return null;
  }finally{
    syncPracuje = false;
  }
}

/** Czy użytkownik właśnie pisze — wtedy nie wchodzimy mu w drogę. */
function syncKtosPisze(){
  try{
    if(document.querySelector(".ncard.editing")) return true;
    const a = document.activeElement;
    if(a && (a.isContentEditable || a.tagName === "TEXTAREA" || a.tagName === "INPUT")) return true;
  }catch(e){}
  return false;
}

/* ——— DROGA RĘCZNA: DWA PRZYCISKI ——— */

/** „Wyślij zmiany" — plik uzgadniania przez systemowe okno udostępniania. */
async function syncWyslij(){
  try{
    const tekst = JSON.stringify(await syncEksport());
    const nazwa = "jw-study-uzgadnianie.json";
    const blob = new Blob([tekst], {type:"application/json"});
    const wyszlo = await saveFile(blob, nazwa, "Plik uzgadniania JW Study");
    if(wyszlo === false) return;
    lsSet(SYNC_K_KIEDY, new Date().toISOString());
    await syncPodstawaPoZapisie();      // plik dostał nasz stan
    if(typeof pokazStanSync === "function") pokazStanSync();
    toastOk("Zapisz go w iCloud Drive — na drugim urządzeniu wybierz „Wczytaj zmiany”");
  }catch(e){
    console.warn("Nie udało się wysłać zmian", e);
    toastErr("Nie udało się przygotować pliku: " + (e && e.message ? e.message : e));
  }
}

/** „Wczytaj zmiany" — plik uzgadniania wskazany ręcznie. */
async function syncWczytajZPliku(plik){
  if(!plik) return;
  try{
    if(plik.size > SYNC_MAX_PLIK)
      throw new Error("Plik ma " + ludzkiRozmiar(plik.size) + ", a dopuszczalne jest do " +
                      ludzkiRozmiar(SYNC_MAX_PLIK));
    if(!plik.size) throw new Error("Plik jest pusty");
    const tekst = await plik.text();
    let dane;
    try{ dane = JSON.parse(tekst); }
    catch(e){ throw new Error("Plik uzgadniania jest uszkodzony (błąd formatu JSON)"); }
    const wynik = await syncScalDane(dane, false);
    if(wynik.odlozone){ toast("Uzgadnianie przerwane — nic nie zmieniono"); return; }
    lsSet(SYNC_K_KIEDY, new Date().toISOString());
    if(typeof pokazStanSync === "function") pokazStanSync();
    pokazPodsumowanieSync(wynik.st, dane.urzadzenie || "drugiego urządzenia", true);
  }catch(e){
    console.warn("Nie udało się wczytać zmian", e);
    showInfo("Nie udało się uzgodnić",
      esc(e && e.message ? e.message : String(e)) +
      "<br><br><b>Dotychczasowe dane pozostały nietknięte.</b>");
  }
}

/** Podsumowanie po uzgodnieniu — krótkie, ale konkretne. */
function pokazPodsumowanieSync(st, skad, oknem){
  if(!st) return;
  const w = [];
  if(st.notatekNowych)      w.push("nowych notatek: <b>" + st.notatekNowych + "</b>");
  if(st.notatekZmienionych) w.push("zaktualizowanych notatek: <b>" + st.notatekZmienionych + "</b>");
  if(st.drobiazgow)         w.push("powtórek i oznaczeń: <b>" + st.drobiazgow + "</b>");
  if(st.etykietNowych)      w.push("nowych etykiet: <b>" + st.etykietNowych + "</b>");
  if(st.etykietZmienionych) w.push("zmienionych etykiet: <b>" + st.etykietZmienionych + "</b>");
  if(st.etykietUsunietych)  w.push("usuniętych etykiet: <b>" + st.etykietUsunietych + "</b>");
  if(st.innych)             w.push("sekcji, zakładek i szablonów: <b>" + st.innych + "</b>");
  if(st.wersji)             w.push("wpisów historii: <b>" + st.wersji + "</b>");
  if(st.kolejnosc)          w.push("przeniesiona kolejność publikacji");
  if(!w.length){
    if(oknem) toastOk("Wszystko już było zgodne");
    return;
  }
  const ogon = st.pierwsze
    ? "<br><br><i>Pierwsze uzgodnienie z " + esc(skad) + ": nie było z czym porównywać, " +
      "więc w " + st.pierwsze + " notatkach wygrała nowsza data zmiany. " +
      "Od następnego razu rozbieżności będą pokazywane do wyboru.</i>"
    : "";
  if(oknem) showInfo("Uzgodniono z " + esc(skad), "• " + w.join("<br>• ") + ogon);
  else toastOk("Uzgodniono: " + w.length + (w.length===1 ? " zmiana" : " zmiany"));
}

/* ==========================================================================
   8. AUTOMATYKA
   ========================================================================== */

/* Czy uzgadnianie ma chodzić samo. Włącza się wraz ze wskazaniem pliku
   (syncWskazPlik), wyłącza wraz z jego zapomnieniem (syncZapomnijPlik) —
   osobny wyłącznik byłby trzecim stanem, którego nikt nie umie wytłumaczyć. */
function syncAutoWlaczone(){ return String(lsGet(SYNC_K_AUTO, "0")) === "1"; }

/** Po zmianie w danych — zapis pliku po chwili spokoju, ale nie za często. */
function syncPoZmianie(){
  if(!syncAutoWlaczone() || !syncPlikAutomatyczny()) return;
  if(syncZwloka) clearTimeout(syncZwloka);
  const odOstatniego = Date.now() - syncOstatniZapis;
  const czekaj = Math.max(SYNC_ZWLOKA_MS, SYNC_MIN_ODSTEP_ZAPISU - odOstatniego);
  syncZwloka = setTimeout(()=>{ syncZwloka = null; syncTeraz("zmiany"); }, czekaj);
}

/** Zaglądanie do pliku: zmienił się na drugim urządzeniu? */
function syncUruchomOdpytywanie(){
  if(syncOdpyt || !syncAutoWlaczone() || !syncPlikAutomatyczny()) return;
  syncOdpyt = setInterval(async ()=>{
    if(syncPracuje || document.hidden) return;
    const u = await syncUchwyt(); if(!u) return;
    if(!(await prawoDoPliku(u, false))) return;
    let plik; try{ plik = await u.getFile(); }catch(e){ return; }
    if(!plik || !plik.lastModified) return;
    if(plik.lastModified <= syncZnanyMs) return;      // to nasz własny zapis
    syncTeraz("odpytanie");
  }, SYNC_ODPYT_MS);
}
function syncZatrzymajOdpytywanie(){
  if(syncOdpyt){ clearInterval(syncOdpyt); syncOdpyt = null; }
}

/**
 * Wpięcie w cykl życia aplikacji. Wołane raz, z 03-boot.js.
 * Uruchomienie → uzgodnij; powrót do karty → uzgodnij; wyjście → dopisz zmiany.
 */
function syncStart(){
  if(!syncPlikAutomatyczny() || !syncAutoWlaczone()) return;
  syncUruchomOdpytywanie();
  setTimeout(()=>syncTeraz("start"), 1200);
  document.addEventListener("visibilitychange", ()=>{
    if(!document.hidden) syncTeraz("powrót");
  });
  /* Przy zamykaniu karty zapis pliku i tak się nie zmieści — ale zwłoka
     czekająca w kolejce zmieści się, jeśli ją teraz popchniemy. */
  window.addEventListener("pagehide", ()=>{
    if(syncZwloka){ clearTimeout(syncZwloka); syncZwloka = null; syncTeraz("wyjście"); }
  });
}

/* ==========================================================================
   9. OKNO SPORÓW
   ========================================================================== */

let _spory = [], _sporyWybory = {}, _sporySkad = "";

/** Krótki podgląd treści rekordu — tyle, żeby rozpoznać, nie żeby czytać. */
function sporTresc(rodzaj, rek){
  if(!rek) return "<i>(usunięte)</i>";
  if(rodzaj === "notes") return skrotTekstu(rek.c || htmlToPlain(rek.h || ""), 260);
  if(rodzaj === "kolejnosc") return "<i>(inna kolejność pozycji)</i>";
  const czesci = [];
  if(rek.name || rek.nazwa) czesci.push("nazwa: " + (rek.name || rek.nazwa));
  if(rek.color) czesci.push("kolor: " + rek.color);
  if(rek.ord !== undefined && rek.ord !== null) czesci.push("miejsce: " + rek.ord);
  if(rek.tytul) czesci.push("tytuł: " + rek.tytul);
  return esc(czesci.join(" · ")) || "<i>(bez zmian widocznych na liście)</i>";
}

function wierszSporu(s, i){
  const wybor = _sporyWybory[i] || "moje";
  const powod = s.typ === "usuniete-tam"
      ? "Usunięte na drugim urządzeniu, u Ciebie zmienione"
    : s.typ === "usuniete-tu"
      ? "Usunięte tutaj, na drugim urządzeniu zmienione"
      : "Zmienione w dwóch miejscach naraz";
  const trzecia = s.rodzaj === "notes" && s.lokalny && s.zdalny;
  /* Napisy na przyciskach mówią, CO SIĘ STANIE, a nie skąd pochodzi rekord.
     Przy usunięciu „Ta z iPada" nic nie znaczy — nie ma żadnej wersji z iPada,
     bo tam tej rzeczy już nie ma. */
  const mojeNapis = s.typ === "usuniete-tu" ? "Zostaw usunięte tutaj"
                  : s.typ === "usuniete-tam" ? "Zachowaj u siebie"
                  : "Ta z tego urządzenia";
  const zdalnyNapis = s.typ === "usuniete-tu" ? ("Przywróć — na " + _sporySkad + " jeszcze jest")
                    : s.typ === "usuniete-tam" ? ("Usuń też tutaj — na " + _sporySkad + " już nie ma")
                    : ("Ta z " + _sporySkad);
  return `<div class="roz spor" data-spor="${i}">
    <div class="roz-tyt">${skrotTekstu(s.opis, 80)}</div>
    <div class="roz-powod">${esc(powod)}</div>
    <div class="roz-pary">
      <label class="roz-opcja${wybor==="moje"?" wybrana":""}">
        <input type="radio" name="spor-${i}" value="moje"${wybor==="moje"?" checked":""}>
        <span class="roz-skad">${esc(mojeNapis)}</span>
        <span class="roz-data">${esc(s.lokalny && s.lokalny.mo ? dataPolska(s.lokalny.mo) : "")}</span>
        <span class="roz-tresc">${sporTresc(s.rodzaj, s.lokalny)}</span>
      </label>
      <label class="roz-opcja${wybor==="zdalna"?" wybrana":""}">
        <input type="radio" name="spor-${i}" value="zdalna"${wybor==="zdalna"?" checked":""}>
        <span class="roz-skad">${esc(zdalnyNapis)}</span>
        <span class="roz-data">${esc(s.zdalny && s.zdalny.mo ? dataPolska(s.zdalny.mo) : "")}</span>
        <span class="roz-tresc">${sporTresc(s.rodzaj, s.zdalny)}</span>
      </label>
      ${trzecia ? `<label class="roz-opcja roz-obie${wybor==="obie"?" wybrana":""}">
        <input type="radio" name="spor-${i}" value="obie"${wybor==="obie"?" checked":""}>
        <span class="roz-skad">Zachowaj obie</span>
        <span class="roz-tresc">Twoja zostaje bez zmian, druga dojdzie jako nowa notatka.</span>
      </label>` : ""}
    </div>
  </div>`;
}

function rysujSpory(){
  const box = $("syncLista"); if(!box) return;
  setHtml(box, _spory.map(wierszSporu).join(""));
  const ile = _spory.filter((s,i)=>(_sporyWybory[i]||"moje") !== "moje").length;
  setText($("syncPodsum"), ile
    ? "Zmienisz u siebie: " + ile + " z " + _spory.length
    : "Nic się u Ciebie nie zmieni — wszystko zostaje tak, jak tutaj.");
}

/**
 * Pokazuje spory i czeka na decyzje.
 * @returns {Promise<Array|null>} lista rozstrzygnięć albo null, gdy przerwano
 */
function pokazSpory(lista, skad){
  _spory = Array.isArray(lista) ? lista : [];
  _sporySkad = skad || "drugiego urządzenia";
  _sporyWybory = {};
  /* Domyślnie ZOSTAJE TO, CO TUTAJ. Zamknięcie okna bez czytania nie może
     niczego nadpisać — ta zasada obowiązuje też przy imporcie z JW Library. */
  _spory.forEach((s,i)=>{ _sporyWybory[i] = "moje"; });
  if(!_spory.length) return Promise.resolve([]);

  return new Promise(zakoncz=>{
    setText($("syncIle"), String(_spory.length));
    setText($("syncSkad"), _sporySkad);
    rysujSpory();
    openModal("modalSync");
    const posprzataj = ()=>{
      $("syncLista").onchange = null;
      $("syncWszystkieMoje").onclick = null;
      $("syncWszystkieZdalne").onclick = null;
      $("syncZastosuj").onclick = null;
      $("syncAnuluj").onclick = null;
    };
    $("syncLista").onchange = e=>{
      const pole = e.target.closest && e.target.closest('input[type="radio"]');
      const wiersz = pole && pole.closest("[data-spor]");
      if(!pole || !wiersz) return;
      _sporyWybory[+wiersz.dataset.spor] = pole.value;
      rysujSpory();
    };
    $("syncWszystkieMoje").onclick = ()=>{
      _spory.forEach((s,i)=>{ _sporyWybory[i] = "moje"; }); rysujSpory(); };
    $("syncWszystkieZdalne").onclick = ()=>{
      _spory.forEach((s,i)=>{ _sporyWybory[i] = "zdalna"; }); rysujSpory(); };
    $("syncAnuluj").onclick = ()=>{
      posprzataj(); closeModal("modalSync"); zakoncz(null); };
    $("syncZastosuj").onclick = ()=>{
      const wybory = _spory.map((s,i)=> Object.assign({}, s, {wybor:_sporyWybory[i] || "moje"}));
      posprzataj(); closeModal("modalSync"); zakoncz(wybory); };
  });
}

/* ==========================================================================
   10. WEJŚCIA Z INTERFEJSU
   ========================================================================== */

/** „Uzgodnij teraz" — jedna droga dla obu trybów. */
async function syncUzgodnijTeraz(){
  if(syncPlikAutomatyczny() && (await syncUchwyt())){
    toast("Uzgadniam…");
    const w = await syncTeraz("ręcznie");
    if(w && !w.odlozone) pokazPodsumowanieSync(w.st, "pliku uzgadniania", true);
    else if(!w) toastOk("Plik uzgadniania zapisany — nie było czego dołożyć");
    if(typeof pokazStanSync === "function") pokazStanSync();
    return;
  }
  /* Bez wskazanego pliku zostaje droga ręczna — pytamy, w którą stronę. */
  const wybor = await askChoice("Uzgodnienie z innym urządzeniem",
    `<p class="ch-lead">Ta przeglądarka nie może sama sięgnąć do iCloud Drive, `+
    `więc plik uzgadniania przechodzi przez Twoje ręce — raz w jedną stronę, raz w drugą.</p>`+
    `<dl class="ch-opts">`+
    `<dt>Wczytaj zmiany</dt><dd>Wskaż plik uzgadniania z iCloud Drive. Zmiany z drugiego urządzenia dojdą tutaj.</dd>`+
    `<dt>Wyślij zmiany</dt><dd>Zapisz plik do iCloud Drive, żeby drugie urządzenie mogło go wczytać.</dd>`+
    `</dl>`,
    [{label:"Wczytaj zmiany", value:"wczytaj", style:"primary"},
     {label:"Wyślij zmiany", value:"wyslij"},
     {label:"Anuluj", value:"cancel"}]);
  if(wybor === "wczytaj"){ const p = $("syncPlikInput"); if(p) p.click(); }
  else if(wybor === "wyslij") syncWyslij();
}

/* Wskazanie pliku uzgadniania w trybie ręcznym. Pole czyścimy PRZED scalaniem,
   żeby wskazanie tego samego pliku po raz drugi znów wywołało zdarzenie. */
if($("syncPlikInput")) $("syncPlikInput").onchange = e=>{
  const plik = e.target.files && e.target.files[0];
  e.target.value = "";
  syncWczytajZPliku(plik);
};

/** Opis stanu uzgadniania — do Ustawień. */
async function syncStanOpis(){
  const kiedy = lsGet(SYNC_K_KIEDY, "");
  const nazwa = await syncNazwaPliku();
  const czesci = [];
  if(nazwa) czesci.push("Plik: " + nazwa);
  else if(syncPlikAutomatyczny()) czesci.push("Plik uzgadniania nie jest wskazany.");
  else czesci.push("Ta przeglądarka nie może sama pisać do pliku — zostają przyciski ręczne.");
  if(kiedy){
    const d = new Date(kiedy);
    czesci.push("Ostatnio uzgodnione: " + (isNaN(d) ? kiedy : dataPolska(kiedy)));
  } else czesci.push("Jeszcze nie uzgadniano.");
  if(syncOpisStanu) czesci.push(syncOpisStanu);
  return czesci.join(" · ");
}
