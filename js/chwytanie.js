/* ==========================================================================
   JW Study — chwytanie.js
   PRZENOSZENIE ETYKIET I ZAKŁADEK — GDZIEKOLWIEK

   Poprzedni mechanizm przestawiał pozycje tylko w obrębie jednej sekcji
   i nie dawał żadnego znaku, że w ogóle zadziałał. Zostawało menu ⋯ z ruchem
   „o jedno miejsce", co przy dłuższej liście jest udręką.

   Tutaj jest inaczej i widać to na ekranie:
     1. przytrzymujesz pozycję (albo od razu łapiesz uchwyt ⠿),
     2. pozycja „przykleja się" do palca — leci za nim jako etykietka,
     3. między wierszami pojawia się GRUBA LINIA pokazująca, gdzie stanie,
     4. puszczasz — pozycja ląduje dokładnie tam.

   Można przenosić przez granice sekcji: upuszczenie w obrębie innej sekcji
   przenosi tam etykietę albo zakładkę na stałe.
   ========================================================================== */
"use strict";

const CHWYT_PRZYTRZYMANIE = 320;   // ms przytrzymania, po których pozycja się „odkleja"
const CHWYT_PROG_RUCHU   = 8;      // px — poniżej tego traktujemy dotyk jak zwykłe kliknięcie

let _chwyt = null;   // {el, rodzaj, id, duszek, wskaznik, sekcjaCel, indeks}

/** Rozpoznaje, co użytkownik chwycił. */
function rodzajPozycji(el){
  if(!el) return null;
  if(el.classList.contains("ncard")) return {rodzaj:"notatka", id:el.dataset.g};
  if(el.classList.contains("stbItem")) return {rodzaj:"zakladka", id:+el.dataset.stb};
  if(el.classList.contains("ptbItem")) return {rodzaj:"zakladkaPub", id:+el.dataset.ptb};
  /* Pozycje panelu publikacji: kategorie, roczniki i same publikacje. Ich
     kolejność to lista kluczy, a nie liczby porządkowe przy obiektach. */
  if(el.dataset.pubref)
    return {rodzaj:"publikacja", id:el.dataset.ord||el.dataset.pubref};
  if(el.classList.contains("item") && el.dataset.k && !isNaN(+el.dataset.k))
    return {rodzaj:"etykieta", id:+el.dataset.k};
  return null;
}
/** Sekcja, w której obszarze znajduje się dany element listy. */
function sekcjaElementu(el){
  let w = el;
  while(w){
    if(w.classList && w.classList.contains("secHead")) return +w.dataset.sec;
    w = w.previousElementSibling;
  }
  return null;   // poza sekcjami — „Moje etykiety"
}

/** Etykietka lecąca za palcem. */
function zrobDuszka(el, x, y){
  const d = document.createElement("div");
  d.className = "chwytDuszek";
  d.textContent = (el.querySelector(".nm")||el).textContent.trim().slice(0, 30);
  document.body.appendChild(d);
  przesunDuszka(d, x, y);
  return d;
}
function przesunDuszka(d, x, y){
  d.style.left = x + "px";
  d.style.top  = y + "px";
}
/** Gruba linia pokazująca miejsce wstawienia. */
function zrobWskaznik(){
  const w = document.createElement("div");
  w.className = "chwytWskaznik";
  document.body.appendChild(w);
  return w;
}
function ustawWskaznik(w, cel, przed){
  const r = cel.getBoundingClientRect();
  w.style.left  = r.left + "px";
  w.style.width = r.width + "px";
  w.style.top   = (przed ? r.top - 2 : r.bottom - 2) + "px";
  w.style.display = "block";
}

/** Pozycje, obok których wolno upuścić — tego samego rodzaju co chwycona. */
function pozycjeDoUpuszczenia(rodzaj){
  const sel = rodzaj==="publikacja"   ? "#pubList .item.pubMove"
            : rodzaj==="notatka"     ? "#noteList .ncard"
            : rodzaj==="zakladkaPub" ? "#pubList .ptbItem"
            : rodzaj==="zakladka"    ? "#tagList .stbItem"
            : "#tagList .item[data-k]:not(.stbItem)";
  return [...document.querySelectorAll(sel)]
    .filter(x=>!x.classList.contains("chwytany"))
    .filter(x=>{
      if(rodzaj!=="etykieta") return true;
      return x.dataset.k && !isNaN(+x.dataset.k);   // „Wszystkie" i „Bez etykiety" to nie miejsca
    });
}

function zakonczChwyt(zapisz){
  if(!_chwyt) return;
  const {el, duszek, wskaznik, cel, przed, rodzaj, id, celObcy} = _chwyt;
  if(_chwyt.klatka) cancelAnimationFrame(_chwyt.klatka);
  if(duszek) duszek.remove();
  if(wskaznik) wskaznik.remove();
  el.classList.remove("chwytany");
  document.body.classList.remove("wTrakcieChwytu");
  document.querySelectorAll(".strefaPoczatku.gotowa").forEach(x=>x.classList.remove("gotowa"));
  /* Po ZAKOŃCZONYM przeniesieniu przeglądarka wyśle jeszcze kliknięcie — nie
     chcemy, żeby przy okazji zmieniło filtr. Połykamy tylko je i tylko przez
     chwilę. Po przerwanym geście nie blokujemy nic. */
  if(zapisz) _polkniecieDo = Date.now() + 400;
  const dane = _chwyt;
  _chwyt = null;
  if(typeof zakonczPodswietlenie==="function") zakonczPodswietlenie();
  if(!zapisz) return;
  /* Notatka upuszczona na etykietę albo zakładkę — przypisanie, nie kolejność. */
  if(celObcy && rodzaj==="notatka" && typeof upusc==="function"){
    upusc(notes.find(x=>x.g===id), celObcy); return;
  }
  if(celObcy && rodzaj==="publikacja" && typeof addPubRefToTab==="function"){
    const ref=el.dataset.pubref, label=el.dataset.pubreflabel ||
      ((el.querySelector(".nm")||{}).textContent||"").trim();
    addPubRefToTab(celObcy.id,ref,label); return;
  }
  if(celObcy && rodzaj==="etykieta" && typeof addPubRefToTab==="function"){
    const tag=tags.find(x=>x.id===id); if(!tag) return;
    addPubRefToTab(celObcy.id,"tag:"+tag.id,tag.name); return;
  }
  if(!cel) return;
  upuscPozycje(rodzaj, id, cel, przed, dane.sekcjaCel);
}

/**
 * Zapisuje nowe położenie.
 * @param {string} rodzaj   etykieta | zakladka | zakladkaPub
 * @param {number} id
 * @param {HTMLElement} cel element, obok którego upuszczono
 * @param {boolean} przed   przed nim czy za nim
 * @param {?number} sekcjaCel  sekcja, w której obszarze upuszczono
 */
function upuscPozycje(rodzaj, id, cel, przed, sekcjaCel){
  const info = rodzajPozycji(cel);
  if(!info) return;

  if(rodzaj==="etykieta"){
    const t = tags.find(x=>x.id===id); if(!t) return;
    const sasiad = tags.find(x=>x.id===info.id);
    if(sekcjaCel !== undefined) t.sec = (sekcjaCel===null ? undefined : sekcjaCel);
    przenumeruj(tags.filter(x=>(x.sec??null)===(t.sec??null)), t, sasiad, przed);
    sortTags(); saveTags(); renderAll();
    toastOk("Przeniesiono etykietę „"+t.name+"”");
    return;
  }
  if(rodzaj==="zakladka"){
    const z = secTabs.find(x=>x.id===id); if(!z) return;
    const sasiad = secTabs.find(x=>x.id===info.id);
    if(sekcjaCel!=null) z.sec = sekcjaCel;
    else if(sasiad) z.sec = sasiad.sec;
    przenumeruj(secTabs.filter(x=>x.sec===z.sec), z, sasiad, przed);
    /* Etykiety przypisane do zakładki idą razem z nią. */
    tags.forEach(t=>{ if(t.stb===z.id) t.sec = z.sec; });
    saveSecTabs(); saveTags(); renderAll();
    toastOk("Przeniesiono zakładkę „"+z.name+"”");
    return;
  }
  if(rodzaj==="notatka"){
    const n = notes.find(x=>x.g===id); if(!n) return;
    const sasiad = notes.find(x=>x.g===info.id);
    przeniesNotatke(n, sasiad, przed);
    return;
  }
  if(rodzaj==="publikacja"){
    /* Kolejność panelu publikacji zapisuje się jako lista kluczy w tej samej
       postaci, w jakiej panel ją odczytuje. Bierzemy ją z ekranu — DOM jest tu
       jedynym miejscem, w którym widać bieżący układ poziomu. */
    const klucze = [...document.querySelectorAll("#pubList .item.pubMove")]
                     .map(x=>x.dataset.ord).filter(k=>k!==undefined);
    const skad = klucze.indexOf(id);
    if(skad < 0) return;
    klucze.splice(skad, 1);
    let dokad = klucze.indexOf(info.id);
    if(dokad < 0) dokad = klucze.length; else if(!przed) dokad++;
    klucze.splice(dokad, 0, id);
    if(typeof setPubOrder==="function") setPubOrder(klucze);
    if(typeof renderPubPanel==="function") renderPubPanel();
    const rst = document.getElementById("pubReset"); if(rst) rst.style.display = "";
    toastOk("Zapisano kolejność publikacji");
    return;
  }
  if(rodzaj==="zakladkaPub"){
    const z = pubTabs.find(x=>x.id===id); if(!z) return;
    const sasiad = pubTabs.find(x=>x.id===info.id);
    if(!sasiad || sasiad.ks!==z.ks) return;       // między publikacjami nie przenosimy
    przenumeruj(pubTabs.filter(x=>x.ks===z.ks), z, sasiad, przed);
    savePubTabs(); renderAll();
    toastOk("Przeniesiono zakładkę „"+z.name+"”");
  }
}
/** Wstawia element obok sąsiada i numeruje całą grupę od nowa. */
function przenumeruj(grupa, element, sasiad, przed){
  const lista = grupa.slice().sort((a,b)=>(a.ord??0)-(b.ord??0)).filter(x=>x!==element);
  let i = sasiad ? lista.indexOf(sasiad) : lista.length;
  if(i<0) i = lista.length; else if(!przed) i++;
  lista.splice(i, 0, element);
  lista.forEach((x,k)=>{ x.ord = k*10; });
}



/* ==========================================================================
   PRZEWIJANIE PODCZAS PRZENOSZENIA

   Przeniesienie notatki o dwadzieścia wierszy było niewykonalne: cel leżał poza
   ekranem, a lista nie przewijała się, bo palec trzymał element, nie listę.
   Zostawało puszczenie w połowie drogi, przewinięcie i chwytanie od nowa.

   Teraz przy zbliżeniu do górnej albo dolnej krawędzi lista jedzie sama — tym
   szybciej, im bliżej krawędzi. Po każdym przesunięciu przeliczamy miejsce
   wstawienia, żeby linia szła za treścią, która właśnie wjechała na ekran.
   ========================================================================== */
const CHWYT_STREFA   = 64;    // px od krawędzi, w których zaczyna się przewijanie
const CHWYT_MAX_KROK = 18;    // px na klatkę tuż przy krawędzi

/**
 * Lista, którą wolno przewijać podczas chwytu.
 *
 * Etykiety i zakładki mają zawsze wskazany własny kontener. Zwracamy go nawet
 * wtedy, gdy jest akurat na początku/końcu albo ma za mało pozycji do
 * przewijania — dzięki temu nie przechodzimy potem do `main` czy całej strony.
 * To pozwala przeciągnąć pozycję na samą górę bez „odjechania” kolumny.
 */
function przewijalny(el, rodzaj){
  const listaWlasna = (rodzaj==="etykieta" || rodzaj==="zakladka") ? el.closest("#tagList")
                    : (rodzaj==="publikacja" || rodzaj==="zakladkaPub") ? el.closest("#pubList")
                    : null;
  if(listaWlasna) return listaWlasna;

  /* Dla notatek zostaje dotychczasowa, ogólna droga: ich lista może być
     pojedynczym panelem na telefonie albo osobną kolumną na większym ekranie. */
  let w = el;
  while(w && w !== document.body){
    if(w.scrollHeight > w.clientHeight + 4){
      const st = getComputedStyle(w).overflowY;
      if(st==="auto" || st==="scroll") return w;
    }
    w = w.parentElement;
  }
  return null;
}
/** Ile przewinąć w tej klatce: 0 poza strefą, do ±CHWYT_MAX_KROK przy krawędzi. */
function silaPrzewijania(y, gora, dol){
  if(y < gora + CHWYT_STREFA)
    return -Math.ceil(CHWYT_MAX_KROK * (1 - Math.max(0, y - gora) / CHWYT_STREFA));
  if(y > dol - CHWYT_STREFA)
    return  Math.ceil(CHWYT_MAX_KROK * (1 - Math.max(0, dol - y) / CHWYT_STREFA));
  return 0;
}
/** Jedna klatka przewijania; zwraca true, gdy coś się przesunęło. */
function krokPrzewijania(y){
  const box = _chwyt && _chwyt.przewijak;
  if(!box){
    /* Nic przewijalnego nad elementem — na wąskim ekranie przewija się sama
       strona, więc ruszamy oknem. */
    const krok = silaPrzewijania(y, 0, innerHeight);
    if(!krok) return false;
    const przed = (document.scrollingElement||document.documentElement).scrollTop;
    scrollBy(0, krok);
    return (document.scrollingElement||document.documentElement).scrollTop !== przed;
  }
  const r = box.getBoundingClientRect();
  const krok = silaPrzewijania(y, r.top, r.bottom);
  if(!krok) return false;
  const przed = box.scrollTop;
  box.scrollTop = przed + krok;
  return box.scrollTop !== przed;
}

/* ==========================================================================
   NOTATKI — WŁASNA KOLEJNOŚĆ, KTÓRA SIĘ NIE GUBI

   Poprzednio numery porządkowe nadawało się po tym, co widać na ekranie:
       cards.forEach((el,i)=>{ n.ord = i*10; })
   Lista notatek pokazuje jednak tylko pierwszą porcję („Pokaż więcej") i tylko
   te, które przechodzą przez bieżący filtr. Numerowanie widoku nadawało więc
   numery 0,10,20… garstce notatek, a cała reszta zostawała ze starymi — te same
   liczby lądowały u kilku notatek naraz. Po zmianie sortowania i powrocie do
   „Własnej kolejności" układ był w rozsypce i trzeba go było robić od nowa.

   Teraz przestawienie działa na PEŁNEJ liście notatek, nie na widoku:
   wyjmujemy przenoszoną, wstawiamy obok sąsiada i numerujemy wszystko od nowa.
   Dzięki temu kolejność jest jedna, globalna i przeżywa każdą zmianę sortowania.
   ========================================================================== */

/** Wszystkie żywe notatki w bieżącej własnej kolejności. */
function notatkiWKolejnosci(){
  return notes.filter(n=>!n.del)
              .sort((a,b)=>{
                 const oa = typeof a.ord==="number" ? a.ord : Infinity;
                 const ob = typeof b.ord==="number" ? b.ord : Infinity;
                 if(oa!==ob) return oa-ob;
                 return (b.mo||b.cr||"").localeCompare(a.mo||a.cr||"");
              });
}
/** Pierwsze wejście we własną kolejność: każda notatka dostaje numer. */
function ustalKolejnoscNotatek(){
  const lista = notatkiWKolejnosci();
  const brakuje = lista.some(n=>typeof n.ord!=="number");
  if(!brakuje) return [];
  lista.forEach((n,i)=>{ n.ord = i*10; });
  return lista;
}
/** Przenosi notatkę obok sąsiada i przenumerowuje CAŁĄ listę. */
function przeniesNotatke(n, sasiad, przed){
  if(sortMode!=="custom"){
    /* Przeciągnięcie w innym sortowaniu byłoby bez skutku — lista i tak
       ułoży się według daty. Przełączamy więc i mówimy o tym wprost. */
    sortMode = "custom";
    const sel = $("sortSel"); if(sel) sel.value = "custom";
    if(typeof lsSet==="function") lsSet(KP+"Sort", "custom");
    ustalKolejnoscNotatek();
    toast("Włączono „Własną kolejność” — teraz układ zostaje taki, jak go ustawisz");
  } else ustalKolejnoscNotatek();

  const lista = notatkiWKolejnosci().filter(x=>x!==n);
  let i = sasiad ? lista.indexOf(sasiad) : lista.length;
  if(i<0) i = lista.length; else if(!przed) i++;
  lista.splice(i, 0, n);

  const zmienione = [];
  lista.forEach((x,k)=>{ if(x.ord !== k*10){ x.ord = k*10; zmienione.push(x); } });
  if(zmienione.length){
    /* Daty modyfikacji nie ruszamy — zmieniło się miejsce, nie treść. */
    if(idb) idbBulkChunked("notes", zmienione).catch(e=>reportSaveError(e,"kolejność notatek"));
    bumpDirty();
  }
  renderAll();
  toastOk("Zapisano kolejność notatek");
}

/* ===== OBSŁUGA WSKAŹNIKA — palec, rysik i mysz tak samo =====
   Jeden gest robi dwie rzeczy, zależnie od tego, gdzie puścisz:
     • nad listą notatek  → zmiana kolejności (linia pokazuje miejsce),
     • nad etykietą lub zakładką → notatka dostaje tę etykietę / zakładkę.  */
document.addEventListener("pointerdown", ev=>{
  const el = ev.target.closest &&
             ev.target.closest("#tagList .item, #pubList .item, #noteList .ncard");
  if(!el) return;
  const info = rodzajPozycji(el);
  if(!info) return;
  if(ev.target.closest(".more") || ev.target.closest(".menu")) return;   // menu ⋯ ma swoje zadanie

  const notatka = info.rodzaj==="notatka";
  const uchwytSel = notatka ? ".drag"
                  : (info.rodzaj==="publikacja" ? ".pubDrag" : ".dragOrd");
  const zUchwytu = !!(ev.target.closest && ev.target.closest(uchwytSel));
  /* Kartę notatki wolno chwycić TYLKO za uchwyt — inaczej każde przytrzymanie
     przy czytaniu albo zaznaczaniu tekstu zabierałoby notatkę w podróż. */
  if(notatka && !zUchwytu) return;

  const startX = ev.clientX, startY = ev.clientY;
  let odklejone = false, licznik = 0;

  const odklej = ()=>{
    if(odklejone) return;
    odklejone = true;
    el.classList.add("chwytany");
    document.body.classList.add("wTrakcieChwytu");
    _chwyt = {el, rodzaj:info.rodzaj, id:info.id,
              duszek: zrobDuszka(el, startX, startY), wskaznik: zrobWskaznik(),
              cel:null, przed:false, sekcjaCel:undefined, celObcy:null,
              przewijak: przewijalny(el, info.rodzaj), x:startX, y:startY, klatka:0,
              ostatniRuch: Date.now()};
    petlaPrzewijania();
    if(navigator.vibrate) try{ navigator.vibrate(12); }catch(e){}
  };
  /* Przeliczenie miejsca wstawienia — wołane i przy ruchu palca, i po każdym
     przesunięciu listy, bo wtedy pod nieruchomym palcem jest już inna treść. */
  const przelicz = (x, y)=>{
    if(!_chwyt) return;
    przesunDuszka(_chwyt.duszek, x, y);
    document.querySelectorAll(".strefaPoczatku.gotowa").forEach(z=>z.classList.remove("gotowa"));

    /* Notatka nad etykietą albo publikacja nad zakładką ogólną: przypisanie,
       a nie zmiana kolejności na bieżącym poziomie. */
    if((notatka && typeof celDlaNotatki==="function") ||
       ((info.rodzaj==="publikacja"||info.rodzaj==="etykieta") && typeof celDlaPublikacji==="function")){
      const pod = document.elementFromPoint(x, y);
      const obcy = notatka ? celDlaNotatki(pod) : celDlaPublikacji(pod);
      if(typeof podswietlCel==="function") podswietlCel(obcy);
      _chwyt.celObcy = obcy;
      if(obcy){ _chwyt.cel = null; _chwyt.wskaznik.style.display = "none"; return; }
    }

    /* Szeroka strefa nad pierwszą zakładką. To nie jest nowy rekord, tylko
       wygodny cel upuszczenia: wskazuje istniejącą pierwszą pozycję i zawsze
       zapisuje przenoszony element PRZED nią. */
    const pod = document.elementFromPoint(x, y);
    const strefa = pod && pod.closest ? pod.closest(".strefaPoczatku[data-upusc-start]") : null;
    if(strefa && strefa.dataset.upuscStart === info.rodzaj){
      const ident = strefa.dataset.cel;
      const sel = info.rodzaj === "zakladka" ? `.stbItem[data-stb="${ident}"]`
                : `.ptbItem[data-ptb="${ident}"]`;
      const pierwszy = document.querySelector(sel);
      if(pierwszy){
        strefa.classList.add("gotowa");
        _chwyt.cel = pierwszy; _chwyt.przed = true;
        _chwyt.sekcjaCel = strefa.dataset.sek === undefined ? undefined : +strefa.dataset.sek;
        _chwyt.wskaznik.style.display = "none";
        return;
      }
    }

    /* Szukamy najbliższej pozycji tego samego rodzaju — także w innych sekcjach. */
    let najbl = null, najmniej = Infinity, przed = false;
    pozycjeDoUpuszczenia(info.rodzaj).forEach(x2=>{
      const r = x2.getBoundingClientRect();
      const srodek = r.top + r.height/2;
      const d = Math.abs(y - srodek);
      if(d < najmniej){ najmniej = d; najbl = x2; przed = y < srodek; }
    });
    if(najbl){
      _chwyt.cel = najbl; _chwyt.przed = przed;
      _chwyt.sekcjaCel = (info.rodzaj==="etykieta" || info.rodzaj==="zakladka")
                         ? sekcjaElementu(najbl) : undefined;
      ustawWskaznik(_chwyt.wskaznik, najbl, przed);
    }else{
      _chwyt.cel = null;
      _chwyt.wskaznik.style.display = "none";
    }
  };
  /* Pętla chodzi przez cały czas trzymania: gdy palec stoi przy krawędzi,
     lista jedzie sama, choć nie przychodzi żadne pointermove. */
  const petlaPrzewijania = ()=>{
    if(!_chwyt) return;
    if(krokPrzewijania(_chwyt.y)) przelicz(_chwyt.x, _chwyt.y);
    _chwyt.klatka = requestAnimationFrame(petlaPrzewijania);
  };

  /* Z uchwytu chwytamy od razu; z samego wiersza dopiero po przytrzymaniu,
     żeby zwykłe kliknięcie filtrujące działało jak dotąd. */
  if(zUchwytu){
    /* Przejęcie wskaźnika zatrzymuje natywny gest przewijania po tym, gdy
       palec wyjedzie poza sam mały uchwyt. */
    try{ el.setPointerCapture(ev.pointerId); }catch(e){}
    ev.preventDefault(); odklej();
  }
  else licznik = setTimeout(odklej, CHWYT_PRZYTRZYMANIE);


  const ruch = e=>{
    if(!odklejone){
      if(Math.abs(e.clientX-startX) > CHWYT_PROG_RUCHU ||
         Math.abs(e.clientY-startY) > CHWYT_PROG_RUCHU) clearTimeout(licznik);
      return;
    }
    e.preventDefault();
    _chwyt.x = e.clientX; _chwyt.y = e.clientY; _chwyt.ostatniRuch = Date.now();
    przelicz(e.clientX, e.clientY);
  };
  const koniec = e=>{
    clearTimeout(licznik);
    document.removeEventListener("pointermove", ruch, true);
    document.removeEventListener("pointerup", koniec, true);
    document.removeEventListener("pointercancel", przerwij, true);
    if(odklejone){ e.preventDefault(); e.stopPropagation(); zakonczChwyt(true); }
  };
  const przerwij = ()=>{
    clearTimeout(licznik);
    document.removeEventListener("pointermove", ruch, true);
    document.removeEventListener("pointerup", koniec, true);
    document.removeEventListener("pointercancel", przerwij, true);
    zakonczChwyt(false);
  };
  document.addEventListener("pointermove", ruch, true);
  document.addEventListener("pointerup", koniec, true);
  document.addEventListener("pointercancel", przerwij, true);
}, true);

/* iPadOS/Safari potrafi rozpocząć własne przewijanie strony mimo
   `touch-action:none` na małym uchwycie — wystarczy, że palec wyjedzie poza
   jego obszar. Gdy trwa chwyt elementu listy, zatrzymujemy wyłącznie ten
   natywny ruch; automatyczne przewijanie właściwej listy nadal wykonuje
   `krokPrzewijania`, więc można dojechać do jej pierwszej pozycji. */
document.addEventListener("touchmove", ev=>{
  if(!_chwyt) return;
  if(["etykieta", "zakladka", "publikacja", "zakladkaPub"].includes(_chwyt.rodzaj))
    ev.preventDefault();
}, {capture:true, passive:false});

/* ==========================================================================
   BLOKADA KLIKNIĘĆ MUSI BYĆ CHWILOWA

   Poprzednio po każdym kliknięciu sprawdzaliśmy klasę `wTrakcieChwytu` na
   <body> i póki tam była, POŁYKALIŚMY KAŻDE kliknięcie w całej aplikacji.
   Wystarczyło, żeby raz nie doszło `pointerup` — a na telefonie zdarza się to
   często: przerysowanie listy zabiera element spod palca, gest przejmuje system,
   przeglądarka odbiera zdarzenie karcie — i klasa zostawała na zawsze. Aplikacja
   wyglądała wtedy na żywą, ale nie reagowała na nic: ani ustawienia, ani wybór
   pliku z kopią, ani żaden przycisk.

   Teraz blokujemy DOKŁADNIE JEDNO kliknięcie, i to tylko przez chwilę po
   zakończonym przenoszeniu. Nawet gdyby coś poszło nie tak, po 400 ms wszystko
   działa normalnie. Do tego kilka niezależnych dróg sprzątania, żeby stan
   „trzymam element" nie mógł się zablokować. */
let _polkniecieDo = 0;
document.addEventListener("click", e=>{
  if(Date.now() > _polkniecieDo) return;
  _polkniecieDo = 0;                       // jedno kliknięcie, nie strumień
  e.preventDefault(); e.stopPropagation();
}, true);

/** Awaryjne sprzątanie: cokolwiek się stanie, nie zostawiamy zablokowanej strony. */
function posprzatajChwyt(){
  if(_chwyt) zakonczChwyt(false);
  _polkniecieDo = 0;                       // kasujemy PO zakończeniu gestu
  document.body.classList.remove("wTrakcieChwytu");
  document.querySelectorAll(".chwytDuszek, .chwytWskaznik").forEach(x=>x.remove());
  document.querySelectorAll(".chwytany").forEach(x=>x.classList.remove("chwytany"));
}
window.addEventListener("blur", posprzatajChwyt);
window.addEventListener("pointercancel", posprzatajChwyt);
document.addEventListener("visibilitychange", ()=>{ if(document.hidden) posprzatajChwyt(); });
/* Ostatnia linia obrony: gdy przez 5 s nie przyszło nic od wskaźnika, a my wciąż
   „trzymamy" element, znaczy że puszczenie przepadło. Odpuszczamy. */
setInterval(()=>{
  if(_chwyt && Date.now() - (_chwyt.ostatniRuch || 0) > 5000) posprzatajChwyt();
}, 2000);
