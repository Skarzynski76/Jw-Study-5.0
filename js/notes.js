/* ==========================================================================
   JW Study — notes.js
   Lista notatek, karta notatki, źródło publikacji
   ========================================================================== */
"use strict";
/* ================= KOLUMNA 3: NOTATKI ================= */
const crOf = n => n.cr || n.mo || "";     // data utworzenia (starsze zapisy mogą jej nie mieć)
const moOf = n => n.mo || n.cr || "";     // data ostatniej zmiany
/* Zestaw porównywarek powstaje raz przy starcie. Wcześniej cały obiekt z ośmioma
   funkcjami budował się od nowa przy każdym sortowaniu listy. */
const SORTERS = {
    relevance:(a,b)=>(searchScores.get(b.g)||0)-(searchScores.get(a.g)||0)||moOf(b).localeCompare(moOf(a)),
    new:(a,b)=>moOf(b).localeCompare(moOf(a)),                    // ostatnia zmiana — najnowsze
    old:(a,b)=>moOf(a).localeCompare(moOf(b)),                    // ostatnia zmiana — najstarsze
    createdNew:(a,b)=>crOf(b).localeCompare(crOf(a)),             // utworzone — najnowsze
    createdOld:(a,b)=>crOf(a).localeCompare(crOf(b)),             // utworzone — najstarsze
    edited:(a,b)=>((b.ed?1:0)-(a.ed?1:0)) || moOf(b).localeCompare(moOf(a)),  // edytowane najpierw
    bible:(a,b)=>(a.b||99)-(b.b||99)||(a.ch||0)-(b.ch||0)||(a.v||0)-(b.v||0)||crOf(a).localeCompare(crOf(b)),   // jak wyżej: stała kolejność mimo edycji
    /* KOLEJNOŚĆ W PUBLIKACJI — ta sama, którą widać w JW Library.
       Decydują cztery liczby, w tej kolejności:
         1. symbol publikacji (KeySymbol),
         2. numer wydania (IssueTagNumber) — rosnąco, więc starsze numery wyżej,
         3. numer dokumentu (DocumentId) — czyli miejsce artykułu w wydaniu,
         4. numer akapitu (BlockIdentifier).

       Tytuł artykułu NIE jest kryterium. Wcześniej był — i to on psuł całość:
       porównywany przed numerem dokumentu, ustawiał artykuły w jednym wydaniu
       ALFABETYCZNIE. „Bądź odważny" trafiało przed „Zachowuj czujność" bez
       względu na to, co było wcześniej w Strażnicy. Tytuł to etykieta, nie
       pozycja. Został wyłącznie jako rozstrzygnięcie remisu, gdy numeru
       dokumentu brak w obu notatkach. */
    pub:(a,b)=>{
      const pa=a.b?1:0, pb=b.b?1:0;                       // biblijne na koniec
      if(pa!==pb) return pa-pb;
      if(!a.b && !b.b){
        const ks=(a.ks||"").localeCompare(b.ks||"","pl");  if(ks) return ks;
        const it=(a.itn||0)-(b.itn||0);                    if(it) return it;
        /* Notatki bez numeru dokumentu (pisane ręcznie w aplikacji, nie
           przeniesione z JW Library) idą na koniec swojej publikacji, a nie na
           początek — zero nie znaczy „pierwszy", tylko „nie wiadomo gdzie". */
        const da=a.doc||Infinity, db2=b.doc||Infinity;
        if(da!==db2) return da-db2;
        const pr=(a.par||0)-(b.par||0);                    if(pr) return pr;
        const tt=(a.pub||"").localeCompare(b.pub||"","pl");if(tt) return tt;
        /* Ostatnie kryterium: data UTWORZENIA, nie modyfikacji.
           Wcześniej wystarczyło coś w notatce podkreślić, żeby dostała świeżą datę zmiany
           i zjechała na koniec grupy. Miejsce notatki w publikacji nie zależy od tego,
           kiedy ostatnio ją poprawiałeś. */
        return crOf(a).localeCompare(crOf(b));
      }
      return (a.b||99)-(b.b||99)||(a.ch||0)-(b.ch||0)||(a.v||0)-(b.v||0);
    },
    alpha:(a,b)=>(a.t||a.c||"").localeCompare(b.t||b.c||"","pl"),
    /* Własna kolejność: notatki bez przypisanego miejsca lądują na końcu,
       zachowując między sobą kolejność wg ostatniej zmiany. */
    custom:(a,b)=>{
      const oa = (typeof a.ord==="number") ? a.ord : Infinity;
      const ob = (typeof b.ord==="number") ? b.ord : Infinity;
      if(oa!==ob) return oa-ob;
      return moOf(b).localeCompare(moOf(a));
    },
    recent:(a,b)=>(b.la||"").localeCompare(a.la||"") || moOf(b).localeCompare(moOf(a))
  };
/**
 * Sortuje listę zgodnie z bieżącym trybem (SORTERS) — przypięte zawsze na górze.
 * Tryby: new, old, createdNew, createdOld, edited, bible, pub, alpha, recent, custom.
 * @param {Note[]} arr  sortowane w miejscu
 * @returns {Note[]}
 */
function sortNotes(arr){
  const by = SORTERS[sortMode] || SORTERS.new;
  return arr.sort((a,b)=> ((b.pin?1:0)-(a.pin?1:0)) || by(a,b));   // przypięte zawsze na górze
}
/**
 * Przypina lub odpina notatkę. Przypięte trafiają na górę każdej listy,
 * niezależnie od wybranego sortowania.
 * @param {Note} n
 */
function togglePin(n){
  n.pin = !n.pin;
  markDirty(n); renderAll();
  toast(n.pin ? "Przypięto notatkę na górze" : "Odpięto notatkę", n.pin?"ok":null);
}
/* Ulubione — niezależne od przypięcia. Przypięcie zmienia kolejność listy,
   ulubione tylko oznacza notatkę i pozwala ją odfiltrować jednym kliknięciem. */
function toggleFav(n){
  n.fav = !n.fav;
  markDirty(n); renderAll();
  toast(n.fav ? "Dodano do ulubionych" : "Usunięto z ulubionych", n.fav?"ok":null);
}
function toggleReading(card){
  const on = card.classList.toggle("reading");
  const ex = document.getElementById("readExit");
  if(ex){
    if(on){ ex.style.display="block"; ex.onclick=()=>{ card.classList.remove("reading"); ex.style.display="none"; }; }
    else ex.style.display="none";
  }
}
/* ===== ŹRÓDŁO NOTATKI: publikacja, wydanie, akapit ===== */
const PUB_NAMES = {
  w:"Strażnica", wp:"Strażnica (do rozpowszechniania)", g:"Przebudźcie się!",
  km:"Nasza Służba Królestwa", mwb:"Nasze życie i służba", "mwb-pl":"Nasze życie i służba",
  bt:"Dawajmy świadectwo o Królestwie Bożym", bh:"Czego naprawdę uczy Biblia?",
  bhs:"Czego naprawdę uczy Biblia? (skrócone)", lff:"Już zawsze ciesz się życiem!",
  jy:"Jezus — droga", cl:"Zbliż się do Jehowy", lvs:"Trwajcie w miłości Bożej",
  od:"Zorganizowani do spełniania woli Jehowy", it:"Wnikliwe poznawanie Pism",
  si:"Całe Pismo jest natchnione", pt:"Kurs Służby Pionierskiej", pt14:"Kurs Służby Pionierskiej",
  nwt:"Pismo Święte w Przekładzie Nowego Świata", nwtsty:"Pismo Święte w Przekładzie Nowego Świata — Biblia do studium (2020/2025)",
  yb:"Rocznik Świadków Jehowy", es:"Codzienne badanie Pism", sjj:"Śpiewajmy Jehowie",
  rr:"Królestwo Boże panuje!", ia:"Naśladujmy ich wiarę", kr:"Królestwo Boże panuje!"
};
function pubFullName(ks){
  if(!ks) return "";
  const k=String(ks).toLowerCase();
  if(PUB_NAMES[k]) return PUB_NAMES[k];
  const base=k.replace(/[\d-]+$/,"");           // np. „w22" → „w", „lff-pl" → „lff"
  return PUB_NAMES[base] ? PUB_NAMES[base]+" ("+ks+")" : ks;
}
const MONTHS_PL   =["","styczeń","luty","marzec","kwiecień","maj","czerwiec","lipiec","sierpień","wrzesień","październik","listopad","grudzień"];
const MONTHS_PL_D =["","stycznia","lutego","marca","kwietnia","maja","czerwca","lipca","sierpnia","września","października","listopada","grudnia"];
function issueLabel(itn){
  const s=String(itn||"");
  if(s.length!==8) return s;
  const y=s.slice(0,4), m=+s.slice(4,6), d=+s.slice(6,8);
  if(!+y) return s;
  if(!m) return y;
  return d>1 ? (d+" "+(MONTHS_PL_D[m]||"")+" "+y) : ((MONTHS_PL[m]||"")+" "+y);
}
function refLabel(n){
  if(n.b){ let s=BOOKS[n.b]; if(n.ch)s+=" "+n.ch+(n.v?":"+n.v:""); return s; }
  return n.pub||"";
}
let bibleKs = "";
try{ bibleKs = localStorage.getItem(KP+"BibleKs") || ""; }catch(e){}
/**
 * Buduje odnośnik do jw.org/finder, który na urządzeniu z JW Library otwiera
 * dane miejsce wprost w aplikacji (domyślnie: Biblia do studium 2020/2025 - nwtsty).
 * @param {Note|Object} n
 * @returns {string|null} null, gdy notatka nie ma przypisanego wersetu ani publikacji
 */
function finderUrl(n){
  if(n.b){
    const b = Number(n.b);
    const ch = Number(n.ch) || 1;
    const v = Number(n.v) || 0;
    const ch2 = Number(n.ch2) || 0;
    const kod = (c, vNum) => String(b).padStart(2,"0") + String(c||ch).padStart(3,"0") + String(vNum||0).padStart(3,"0");
    let bible = "";
    if(ch2 && ch2 > ch){
      bible = kod(ch, 0) + "-" + kod(ch2, 0);
    } else {
      const wersety = Array.isArray(n.verses) && n.verses.length
        ? [...new Set(n.verses.map(Number).filter(x=>x>0))].sort((a,b)=>a-b)
        : (n.v2 && n.v2 > v ? Array.from({length:n.v2 - v + 1}, (_,i)=>v + i) : [v]);
      bible = kod(ch, wersety[0]);
      if(wersety.length > 1){
        const ciagly = wersety.every((x,i)=>i===0 || x === wersety[i-1] + 1);
        bible = ciagly ? kod(ch, wersety[0]) + "-" + kod(ch, wersety[wersety.length - 1]) : wersety.map(x=>kod(ch, x)).join(",");
      }
    }
    const pubSym = (typeof bibleKs === "string" && bibleKs.trim() && bibleKs !== "bi12" && bibleKs !== "nwt") ? bibleKs : "nwtsty";
    return "https://www.jw.org/finder?srcid=jwlshare&wtlocale=P&prefer=lang&bible=" + bible + "&pub=" + pubSym;
  }
  if(n.doc) return "https://www.jw.org/finder?srcid=jwlshare&wtlocale=P&prefer=lang&docid=" + n.doc;
  if(n.ks){
    let u = "https://www.jw.org/finder?srcid=jwlshare&wtlocale=P&prefer=lang&pub=" + encodeURIComponent(n.ks);
    if(n.itn) u += "&issue=" + n.itn;
    return u;
  }
  return null;
}
function isIOS(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
}
/* Nakłada podświetlenie WPROST na istniejący element, bez przepisywania go
   przez HTML. Dzięki temu podświetlenie da się zdjąć i nałożyć na karcie, która
   już stoi na ekranie — zamiast budować ją od nowa. */
function podswietlWElemencie(korzen){
  if(!korzen || !query) return;
  const rx = qHl || new RegExp("("+query.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","gi");
  (function walk(node){
    [...node.childNodes].forEach(ch=>{
      if(ch.nodeType===3 && rx.test(ch.textContent)){
        rx.lastIndex = 0;
        const frag = document.createDocumentFragment();
        ch.textContent.split(rx).forEach((part,i)=>{
          if(i%2){ const s=document.createElement("span"); s.className="qhl"; s.textContent=part; frag.appendChild(s); }
          else if(part) frag.appendChild(document.createTextNode(part));
        });
        node.replaceChild(frag, ch);
      } else if(ch.nodeType===1 && !ch.classList.contains("qhl")) walk(ch);
    });
  })(korzen);
}
/** Zdejmuje podświetlenie, zostawiając sam tekst. */
function zdejmijPodswietlenie(korzen){
  if(!korzen) return;
  korzen.querySelectorAll(".qhl").forEach(s=>{
    const rodzic = s.parentNode;
    s.replaceWith(...s.childNodes);
    if(rodzic) rodzic.normalize();     // scalamy rozcięte kawałki tekstu z powrotem
  });
}
function hilite(html){
  if(!query) return html;
  /* Bezwładnie — treść notatki jest wprawdzie już przesiana, ale ta funkcja
     idzie po KAŻDEJ widocznej karcie przy każdym wyszukiwaniu i nie ma powodu,
     żeby jedno przeoczenie w sicie stawało się od razu wykonanym kodem. */
  const tmp = parsujBezwladnie(html);
  podswietlWElemencie(tmp);
  return tmp.innerHTML;
}
function contentHtml(n){ return hilite(n.h ? n.h : esc(n.c||"")); }
function emptyStateEl(){
  const q=(query||"").trim();
  const wrap=document.createElement("div"); wrap.className="emptyState";
  let icon=ICO.notes, title="Brak notatek", sub="Dodaj pierwszą notatkę albo zaimportuj backup z JW Library.", btn=true, podobne=false;
  if(q&&searchInProgress){ icon=ICO.search; title="Przeszukuję całą bazę…"; sub="Możesz nadal przewijać i korzystać z aplikacji. Wyniki pojawią się tutaj w trakcie pracy indeksu."; btn=false; }
  else if(q){ icon=ICO.search; title="Brak dokładnych wyników"; sub="Nic nie pasuje do „"+esc(q)+"”. Tryb inteligentny może uwzględnić odmiany, podobne pojęcia i literówki."; btn=false; podobne=true; }
  else if(sortMode==="recent"){ title="Brak ostatnio otwieranych"; sub="Otwórz notatkę, a pojawi się tutaj."; btn=false; }
  else if(filt.tag==="none"){ title="Wszystkie notatki mają etykiety"; sub="Notatki bez etykiety pojawią się tutaj."; btn=false; }
  else if(filt.tag && filt.tag!=="all"){ title="Pusta etykieta"; sub="Dodaj notatkę albo przeciągnij tu istniejącą."; }
  wrap.innerHTML = `<div class="es-ic">${icon}</div><div class="es-title">${title}</div><div class="es-sub">${sub}</div>`+
    (btn?`<button class="btn primary es-btn">${ICO.plus} Nowa notatka</button>`:podobne?`<button class="btn primary es-similar">Pokaż podobne</button>`:"");
  const b=wrap.querySelector(".es-btn"); if(b) b.onclick=()=>$("btnNew").click();
  const s=wrap.querySelector(".es-similar"); if(s) s.onclick=()=>{
    searchMode="smart";searchOpts.scope="all";searchOpts.group="all";searchOpts.dateFrom="";searchOpts.dateTo="";searchOpts.highlight="all";searchOpts.extra="all";
    /* Gdy kilka słów było wymaganych naraz, „podobne” rozluźnia warunek do
       dowolnego z nich. Przy jednym słowie nadal pomaga tryb inteligentny. */
    const luz=qAdvTerms.flat().filter(Boolean); const nowe=luz.length>1?luz.join(" OR "):query;
    $("search").value=nowe; lsSet(KP+"SearchMode",searchMode);parseQuery(nowe);renderAll();
  };
  return wrap;
}
/* ——— odświeżanie listy notatek ———
   Wcześniej każde odświeżenie czyściło całą listę (innerHTML="") i budowało wszystkie karty
   od nowa — nawet gdy zmieniła się jedna notatka. Teraz dla każdej notatki liczymy krótki
   „odcisk" tego, co widać na karcie. Jeśli odcisk się nie zmienił, karta jest przestawiana,
   a nie budowana od zera. Przy zmianie jednej notatki powstaje jedna nowa karta zamiast stu. */
const _cardCache = new Map();       // guid → { node, sig }
let _tagsVer = 0;                   // rośnie przy zmianie etykiet (wpływa na chipy i listę wyboru)
function bumpTagsVer(){
  _tagsVer++;
  if(typeof workerOznaczIndeksDoOdbudowy==="function") workerOznaczIndeksDoOdbudowy();
  if(typeof bezpUniewaznijKontrole==="function") bezpUniewaznijKontrole();
}

/* wszystko, co widać na karcie — gdy to samo, karta może zostać bez zmian */
/* Odcisk uwzględnia zapytanie wyłącznie wtedy, gdy wyszukiwanie jest aktywne.
   Jest to konieczne, bo karta pokazuje teraz także powód trafienia i fragment
   tekstu. Samo kolorowanie pozostaje nakładane na istniejące karty przez
   odswiezPodswietlenie, bez zbędnego przebudowywania całej listy.

   KARTA ZALEŻY OD SPOSOBU SORTOWANIA TYLKO W JEDNYM: pokazuje datę utworzenia
   albo datę zmiany. Przez długi czas w odcisku karty siedział cały sortMode,
   więc PRZEŁĄCZENIE SORTOWANIA PRZEBUDOWYWAŁO WSZYSTKIE WIDOCZNE KARTY — sześć
   dziesiątek — mimo że zmieniała się wyłącznie ich kolejność. Pytamy więc
   o to, co karta faktycznie pokazuje. */
function sortujePoUtworzeniu(){
  return (sortMode==="createdNew" || sortMode==="createdOld") ? 1 : 0;
}
function noteCardSig(n){
  return [n.g, n.mo, n.t, (n.h||n.c||"").length, n.pin?1:0, n.fav?1:0, n.ord||0, n.ptb||0, n.tg.join(","), n.b, n.ch, n.v,
          n.ks, n.itn, n.par, n.ff, n.lh, n.pm, n.la, n.stb, n.cr, n.wys, n.bg,
          (n.pwt ? n.pwt.d+"/"+n.pwt.o : ""),
          (n.atex||[]).join(","), (typeof filt.tag==="string"&&filt.tag.indexOf("auto:")===0?filt.tag:""),
          sortujePoUtworzeniu(), _tagsVer, query?query+":"+(searchScores.get(n.g)||0):""].join("\u0001");
}
/**
 * Zwraca kartę notatki: gotową z pamięci podręcznej albo nowo zbudowaną.
 * Sprawdza również tożsamość obiektu — po imporcie notatka o tym samym identyfikatorze
 * bywa już innym obiektem, a przyciski na starej karcie wskazywałyby na poprzedni egzemplarz.
 * @param {Note} n
 * @returns {HTMLElement}
 */
function noteCardFor(n){
  const sig = noteCardSig(n);
  const hit = _cardCache.get(n.g);
  // Sprawdzamy też tożsamość obiektu: po imporcie albo scaleniu kopii notatka o tym samym
  // identyfikatorze jest już innym obiektem, a przyciski na starej karcie wskazywałyby na
  // poprzedni egzemplarz. Wtedy karta musi powstać od nowa.
  if(hit && hit.sig === sig && hit.note === n) return hit.node;
  const node = noteCard(n);
  _cardCache.set(n.g, { node, sig, note: n });
  return node;
}
/* pozbywamy się kart, których już nie ma na liście — inaczej pamięć rosłaby bez końca */
function pruneCardCache(keep){
  if(_cardCache.size <= keep.size) return;
  _cardCache.forEach((v,k)=>{ if(!keep.has(k)) _cardCache.delete(k); });
}
/* wstawia węzły w zadanej kolejności, ruszając tylko te, które faktycznie stoją nie tam */
function syncChildren(parent, wanted){
  let i = 0;
  let cur = parent.firstChild;
  while(i < wanted.length){
    const want = wanted[i];
    if(cur === want){ cur = cur.nextSibling; i++; continue; }
    parent.insertBefore(want, cur);
    i++;
  }
  while(cur){ const nx = cur.nextSibling; parent.removeChild(cur); cur = nx; }
}

let _moreObserver = null;           // jeden obserwator zamiast nowego przy każdym odświeżeniu

/**
 * Rysuje listę notatek. Zamiast czyścić listę i budować wszystko od nowa, dla każdej
 * notatki liczy „odcisk" tego, co widać na karcie (noteCardSig). Karta o niezmienionym
 * odcisku jest tylko przestawiana, a nie budowana ponownie.
 * Obsługuje też nagłówki grup (sortowanie wg publikacji i biblijne) oraz doładowywanie
 * kolejnych porcji przy przewijaniu.
 */
function renderNotes(){
  /* Wydobyta karteczka zostałaby po przerysowaniu bez swojej karty, a podkładka
     — pustym miejscem w siatce. Odkładamy ją bez animacji, zanim cokolwiek
     zbudujemy od nowa. */
  if(typeof schowajKarteczke==="function") schowajKarteczke(true);
  /* Nowa lista zaczyna się od góry, więc paski nie mają powodu zostawać schowane. */
  if(typeof odslonPaski==="function") odslonPaski();
  let arr, _base = null;
  if(sortMode==="recent"){
    arr = notes.filter(n=>!n.del && n.la).sort((a,b)=>b.la.localeCompare(a.la)).slice(0,5);
  } else {
    _base = baseNotes();                 // jeden przebieg dla listy i dla liczników
    arr = sortNotes(filteredNotes(_base));
  }
  let countsTxt = sortMode==="recent" ? (arr.length ? "Ostatnio otwierane ("+arr.length+")" : "Nie otwierałeś jeszcze żadnej notatki") : arr.length + (arr.length===1?" notatka":(arr.length%10>=2&&arr.length%10<=4&&(arr.length%100<12||arr.length%100>14))?" notatki":" notatek");
  renderQuickFilters(_base);
  if(typeof odswiezPrzyciskWszystkie==="function") odswiezPrzyciskWszystkie();
  setText($("counts"), countsTxt);
  if(typeof renderSearchStatus==="function") renderSearchStatus(arr);
  let _alive=0; for(let i=0;i<notes.length;i++) if(!notes[i].del) _alive++;
  setText($("hCount"), _alive + " notatek · " + tags.length + " etykiet");
  const el = $("noteList");

  if(_moreObserver){ _moreObserver.disconnect(); _moreObserver = null; }   // stary obserwator do kosza


  if(arr.length===0){
    _cardCache.clear();
    el.replaceChildren(emptyStateEl());
    fsNavList=[];
    return;
  }
  /* Belki z nazwą grupy zniknęły (v2.16).
     Przy sortowaniu wg publikacji wstawiały się nad listą nagłówki z nazwą
     wydania. W układzie kafelkowym przykrywały karteczki, a w liście
     powtarzały to, co i tak widać w kolumnie po lewej: gdzie się właśnie
     jest. Dwa źródła tej samej informacji, z których jedno zabierało miejsce. */
  const wanted = [];
  const keep = new Set();
  arr.slice(0,visibleCount).forEach(n=>{
    keep.add(n.g);
    wanted.push(noteCardFor(n));
  });
  const wiecejKart=arr.length > visibleCount;
  const wiecejWIndeksie=!!query && searchWasLimited && !searchInProgress && !wiecejKart;
  if(wiecejKart || wiecejWIndeksie){
    const more = document.createElement("div");
    more.style.cssText = "text-align:center;padding:14px";
    more.innerHTML = wiecejKart
      ? `<button class="btn">Pokaż więcej (${arr.length-visibleCount})</button>`
      : `<button class="btn">Wczytaj dalsze wyniki</button>`;
    const dalej=()=>{
      if(wiecejKart){ visibleCount+=60; renderNotes(); }
      else if(typeof doladujWynikiSzukania==="function") doladujWynikiSzukania();
    };
    more.querySelector("button").onclick = dalej;
    wanted.push(more);
    _moreObserver = new IntersectionObserver(es=>{
      if(es[0].isIntersecting){ _moreObserver.disconnect(); _moreObserver=null; dalej(); }
    });
    _moreObserver.observe(more);
  }
  syncChildren(el, wanted);
  if(typeof odswiezZaznaczeniaKart==="function") odswiezZaznaczeniaKart(el);
  odswiezPodswietlenie(el);
  /* Napisy odsyłaczy do notatek odświeżamy dla CAŁEJ listy, nie tylko dla kart
     zbudowanych od nowa. Karta siedzi w pamięci podręcznej, dopóki nie zmieni
     się jej własny podpis — a zmiana TYTUŁU innej notatki tego podpisu nie
     rusza. Bez tego przebiegu odsyłacz pokazywałby stary tytuł aż do
     przypadkowej zmiany w tej notatce. */
  if(typeof odswiezOdnosnikiNotatek==="function") odswiezOdnosnikiNotatek(el);
  pruneCardCache(keep);
  fsNavList = arr.map(n=>n.g);
}

/* ══════════════════════════════════════════════════════════════════════════
   MIEJSCE POD OSTATNIM RZĘDEM — DLACZEGO GO TU NIE MA (v2.74)

   W 2.70 lista dostawała u dołu odstęp liczony z wysokości widoku, tak żeby
   ostatni rząd dał się podciągnąć pod górną krawędź okna. Zamysł był z czytnika
   tekstu: każda notatka, także ostatnia, ma móc stanąć tam, gdzie się czyta.

   W praktyce wyszło z tego pół ekranu pustki: na iPadzie 482–620 px zależnie
   od widoku. Przewinięcie na dół listy kończyło się białym polem większym niż
   sama notatka, a lista wydawała się dwa razy dłuższa, niż jest. Ostatni rząd
   PODCIĄGAŁ SIĘ, ale nikt tego nie potrzebował — w tej aplikacji notatkę czyta
   się w A-6 albo na pełnym ekranie, nie w ostatnim wierszu listy.

   Odstęp wrócił więc do stałych 40 px (`css/11-polish.css`). Nie ma tu żadnej
   funkcji do liczenia ani nasłuchu `resize` — i to jest cała treść tej uwagi:
   żeby za pół roku nikt (łącznie ze mną) nie dodał tego drugi raz.
   ══════════════════════════════════════════════════════════════════════════ */

/* ==========================================================================
   PODŚWIETLENIE TRAFIEŃ NA GOTOWYCH KARTACH

   Karty przychodzą tu z pamięci podręcznej — te same węzły co przed chwilą.
   Zdejmujemy z nich stare podświetlenie i nakładamy nowe. Kilkadziesiąt
   zamian tekstu zamiast zbudowania kilkudziesięciu kart od zera.

   Karta w trakcie edycji zostaje nietknięta: podświetlenie wstawia znaczniki
   w treść, a te w polu edycji trafiłyby do zapisu.
   ========================================================================== */
function odswiezPodswietlenie(lista){
  if(!lista) return;
  lista.querySelectorAll(".ncard").forEach(karta=>{
    if(karta.classList.contains("editing")) return;
    [karta.querySelector(".ntitle"), karta.querySelector(".ncontent")].forEach(cz=>{
      if(!cz || cz.isContentEditable) return;
      zdejmijPodswietlenie(cz);
      podswietlWElemencie(cz);
    });
  });
}
/* normalizacja: ma\u0142e litery + usuni\u0119cie ogonk\u00f3w (\u0142/\u0141 nie rozk\u0142ada si\u0119 przez NFD, wi\u0119c osobno) */
function norm(s){ return (s||"").toLowerCase().replace(/\u0142/g,"l").normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
const _svg = p => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO = {
  star:_svg('<path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.75L12 16.9l-5.2 2.7 1-5.75-4.2-4.1 5.8-.85z"/>'),
  ext:_svg('<path d="M14 4h6v6"/><path d="M20 4l-8.5 8.5"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>'),
  fs:_svg('<path d="M4 9V5a1 1 0 0 1 1-1h4"/><path d="M15 4h4a1 1 0 0 1 1 1v4"/><path d="M20 15v4a1 1 0 0 1-1 1h-4"/><path d="M9 20H5a1 1 0 0 1-1-1v-4"/>'),
  copy:_svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  link:_svg('<path d="M9.5 14.5l5-5"/><path d="M11 6.5l1-1a4 4 0 0 1 5.7 5.7l-1 1"/><path d="M13 17.5l-1 1a4 4 0 0 1-5.7-5.7l1-1"/>'),
  file:_svg('<path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h5"/>'),
  mic:_svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>'),
  edit:_svg('<path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3z"/><path d="M14 7l3 3"/>'),
  save:_svg('<path d="M5 3h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h7"/><path d="M8 21v-6h8v6"/>'),
  trash:_svg('<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>'),
  image:_svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 15l-5-5L5 20"/>'),
  pin:_svg('<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z"/><path d="M12 14v7"/>'),
  /* strzałka w górę nad podstawką — ten sam znak, którym systemy oznaczają
     „udostępnij", więc nie trzeba go tłumaczyć */
  send:_svg('<path d="M12 16V4"/><path d="M8 8l4-4 4 4"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>'),
  paint:_svg('<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.8 0-1.3 1-2.2 2.2-2.2H18a3 3 0 0 0 3-3A8 8 0 0 0 12 3z"/><circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none"/><circle cx="16.3" cy="11" r="1" fill="currentColor" stroke="none"/>'),
  tag:_svg('<path d="M3 12l9-9 8 8-9 9-8-8z"/><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none"/>'),
  book:_svg('<path d="M4 5a2 2 0 0 1 2-2h5v16H6a2 2 0 0 0-2 2z"/><path d="M20 5a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2z"/>'),
  width:_svg('<path d="M4 12h16"/><path d="M7 8l-4 4 4 4"/><path d="M17 8l4 4-4 4"/><path d="M8 4v16M16 4v16" stroke-opacity=".45"/>'),
  undo:_svg('<path d="M9 7L4 12l5 5"/><path d="M4 12h11a5 5 0 0 1 0 10h-3"/>'),
  redo:_svg('<path d="M15 7l5 5-5 5"/><path d="M20 12H9a5 5 0 0 0 0 10h3"/>'),
  plus:_svg('<path d="M12 5v14M5 12h14"/>'),
  link:_svg('<path d="M9 15l6-6"/><path d="M11 6l1-1a4 4 0 0 1 6 6l-2 2"/><path d="M13 18l-1 1a4 4 0 0 1-6-6l2-2"/>'),
  ul:_svg('<circle cx="4" cy="7" r="1.4" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="4" cy="17" r="1.4" fill="currentColor" stroke="none"/><path d="M9 7h11M9 12h11M9 17h11"/>'),
  ol:_svg('<path d="M11 7h9M11 12h9M11 17h9"/><text x="2.5" y="8.6" font-size="6.5" fill="currentColor" stroke="none">1</text><text x="2.5" y="13.6" font-size="6.5" fill="currentColor" stroke="none">2</text><text x="2.5" y="18.6" font-size="6.5" fill="currentColor" stroke="none">3</text>'),
  outdent:_svg('<path d="M21 6H3M21 18H3M21 10h-9M21 14h-9"/><path d="M7 9l-3 3l3 3z" fill="currentColor" stroke="none"/>'),
  indent:_svg('<path d="M3 6h18M3 18h18M3 10h9M3 14h9"/><path d="M17 9l3 3l-3 3z" fill="currentColor" stroke="none"/>'),
  alignLeft:_svg('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>'),
  alignCenter:_svg('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>'),
  alignJustify:_svg('<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>'),
  palette:_svg('<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.8 0-1.3 1-2.2 2.2-2.2H18a3 3 0 0 0 3-3A8 8 0 0 0 12 3z"/><circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none"/><circle cx="16.3" cy="11" r="1" fill="currentColor" stroke="none"/>'),
  sun:_svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>'),
  moon:_svg('<path d="M20 14A8 8 0 0 1 10 4a7 7 0 1 0 10 10z"/>'),
  monitor:_svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
  droplet:_svg('<path d="M12 3s6 5.5 6 10a6 6 0 0 1-12 0c0-4.5 6-10 6-10z"/>'),
  gear:_svg('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.6v2.4M12 19v2.4M21.4 12H19M5 12H2.6M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7M18.6 18.6l-1.7-1.7M7.1 7.1L5.4 5.4"/>'),
  search:_svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  notes:_svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
  dots:_svg('<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>'),
  doc:_svg('<path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h4"/>'),
  printer:_svg('<path d="M6 9V4h12v5"/><path d="M6 17H4a1 1 0 0 1-1-1v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a1 1 0 0 1-1 1h-2"/><rect x="7" y="13" width="10" height="7" rx="1"/>'),
  bookmark:_svg('<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"/>'),

  /* ——— ZESTAW Z 2.65 ———
     Do wydania 2.64 ikony powstawały tam, gdzie były akurat potrzebne: część
     w tym zbiorze, część wprost w index.html, część w module Centrum. Te same
     rzeczy miały przez to różne rysunki — księga w kolumnie Publikacje wyglądała
     inaczej niż księga w Centrum. Wszystko nowe idzie już TYLKO tutaj, w jednej
     siatce 24×24 i z tą samą grubością kreski. */
  bookOpen:_svg('<path d="M12 7.2C10.2 5.6 7.7 4.9 5 5.1a1 1 0 0 0-1 1v11a1 1 0 0 0 1.1 1c2.5-.2 4.9.5 6.9 2 2-1.5 4.4-2.2 6.9-2a1 1 0 0 0 1.1-1v-11a1 1 0 0 0-1-1c-2.7-.2-5.2.5-7 2.1z"/><path d="M12 7.2V20"/>'),
  books:_svg('<rect x="4.6" y="5" width="15" height="4.2" rx="1.3"/><rect x="3.4" y="10.4" width="17.2" height="4.2" rx="1.3"/><rect x="5.4" y="15.8" width="13.4" height="4.2" rx="1.3"/>'),
  clock:_svg('<circle cx="12" cy="12" r="8.2"/><path d="M12 7.4V12l3.1 2"/>'),
  chevron:_svg('<path d="M9.5 5.5L16 12l-6.5 6.5"/>'),
  bars:_svg('<path d="M6 20V13.5M12 20V7M18 20v-9.5"/>'),
  trend:_svg('<path d="M3.8 19.8h16.4"/><path d="M6.4 15.6 10.9 11l3 2.6 5.7-6.1"/><path d="M15.9 7.5h3.7v3.7"/>'),
  /* Serce BEZ gałązki — o to prosił autor aplikacji wprost. */
  heart:_svg('<path d="M12 20s-7.2-4.4-7.2-9.3A4.2 4.2 0 0 1 12 8.1a4.2 4.2 0 0 1 7.2 2.6c0 4.9-7.2 9.3-7.2 9.3z"/>'),
  target:_svg('<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>'),
  /* Chmurka ze strzałkami w środku była przy 21 px plamą: na strzałki zostawały
     cztery piksele wysokości. Pierścień z dwóch strzałek zajmuje całą kratkę
     i czyta się nawet w miniaturze — a że plik uzgadniania leży w iCloud Drive
     albo w Dysku Google, chmurka i tak nie mówiła nic ponad „gdzieś w sieci". */
  cloudSync:_svg('<path d="M20.3 12.6a8.3 8.3 0 0 1-14 5.6"/><path d="M3.7 11.4a8.3 8.3 0 0 1 14-5.6"/><path d="M17.9 2.2v3.9h-3.9"/><path d="M6.1 21.8v-3.9H10"/>'),
  notePen:_svg('<path d="M19 12.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6.5"/><path d="M8.5 8.5h4M8.5 12.5h3"/><path d="M15.6 9.4 21 4a1.7 1.7 0 0 0-2.4-2.4l-5.4 5.4-.5 2.9z"/>'),
  calendar:_svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>'),
  check:_svg('<rect x="3.5" y="3.5" width="17" height="17" rx="3.4"/><path d="M8 12.4l2.7 2.7L16.2 9.6"/>'),
  bulb:_svg('<path d="M9.5 18.2h5M10 21h4"/><path d="M12 3a6 6 0 0 1 3.5 10.9c-.6.4-.9 1-.9 1.7v.4H9.4v-.4c0-.7-.3-1.3-.9-1.7A6 6 0 0 1 12 3z"/>')
};
/* ——— karta notatki ———
   Budowa karty jest rozbita na cztery kawałki, żeby dało się je czytać osobno:
   nagłówek (uchwyt + tytuł), metadane (werset, publikacja, data), etykiety i pasek narzędzi. */

/* nagłówek: uchwyt do przeciągania na etykietę + tytuł ze znacznikiem przypięcia */
function noteCardHead(n){
  const pin = n.pin ? `<span class="pinmark" title="Przypięta">${IC_PIN}</span> ` : "";
  const fav = n.fav ? `<span class="favmark" title="Ulubiona">${IC_STAR}</span> ` : "";
  const sel = (typeof zaznaczoneNotatki !== "undefined" && zaznaczoneNotatki.has(n.g)) ? " checked" : "";
  return `<div class="nhead">
       <label class="nsel" title="Zaznacz notatkę" onclick="event.stopPropagation()"><input type="checkbox" class="nsel-cb" data-g="${n.g}"${sel}><span class="nsel-box"></span></label>
       <span class="drag" draggable="true" title="Przeciągnij na zakładkę">${IC_GRIP}</span>
       <div class="ntitle">${pin}${fav}${hilite(esc(n.t||""))}</div>
     </div>`;
}

/* odnośnik do wersetu: gotowy link do JW Library, sam opis albo zachęta do przypisania */
function noteCardRef(n, ref, link){
  if(link){
    return `<a class="refbtn" href="${link}" target="_blank" rel="noopener noreferrer" data-act="openref" title="Otwórz w JW Library">${IC_BOOK} ${esc(ref||"Otwórz w JW Library")} ${IC_EXT}</a>`+
           `<button class="refbtn edref" data-act="assignref" title="Zmień przypisany werset">${IC_PENCIL}</button>`;
  }
  if(ref) return `<span class="pill ref">${IC_BOOK} ${esc(ref)}</span>`;
  return `<button class="refbtn assign" data-act="assignref" title="Przypisz werset — utworzy link do JW Library">${IC_PIN} Przypisz werset</button>`;
}

/* pasek metadanych: odnośnik, symbol publikacji, wydanie, akapit, data modyfikacji */
/**
 * Data na karcie.
 *
 * Karta pokazywała zawsze datę ostatniej zmiany. Po włączeniu sortowania
 * „według utworzenia" daty wyglądały więc na nieuporządkowane i sortowanie
 * sprawiało wrażenie zepsutego. Teraz pokazujemy tę datę, według której
 * aktualnie sortujemy, a w podpowiedzi obie.
 */
function noteCardDate(n){
  const poUtworzeniu = sortMode==="createdNew" || sortMode==="createdOld";
  const cr = (n.cr||"").substring(0,10), mo = (n.mo||"").substring(0,10);
  const widoczna = poUtworzeniu ? (cr||mo) : (mo||cr);
  const podpowiedz = "Utworzono: "+(cr||"—")+" · Ostatnia zmiana: "+(mo||"—");
  return `<span class="pill date${poUtworzeniu?" dateCr":""}" title="${esc(podpowiedz)}">`+
         `${IC_CLOCK} ${widoczna}${poUtworzeniu?'<span class="dateTag">utw.</span>':""}</span>`;
}
function noteCardMeta(n){
  const ref = refLabel(n), link = finderUrl(n);
  return `<div class="nmeta2">
       ${noteCardRef(n, ref, link)}
       ${n.ks?`<span class="pill ks" title="${esc(pubFullName(n.ks))}">${esc(n.ks)}</span>`:""}
       ${n.itn?`<span class="pill issue" title="Wydanie">${esc(issueLabel(n.itn))}</span>`:""}
       ${n.par?`<span class="pill par" title="Akapit w publikacji">¶ ${n.par}</span>`:""}
       ${noteCardDate(n)}
     </div>`;
}

/* chipy etykiet — kolorowe, każdy z krzyżykiem do odpięcia */
function noteCardChips(n){
  const chip = tid => {
    const t = tags.find(x=>x.id===tid);
    if(!t) return "";
    const study = /^Komentarze\s*[—–-]\s*Biblia do studium$/i.test(t.name);
    const kol = (typeof kolorBezpieczny==="function" && kolorBezpieczny(t.color)) ? t.color : "";
    const style = !study && kol ? ` style="background:linear-gradient(180deg,${shade(kol,.15)},${shade(kol,-.18)});color:#fff"` : "";
    return `<span class="chip${study?" chip-study":""}"${style}>${esc(t.name)}<span class="x" data-untag="${tid}" title="Usuń z zakładki">×</span></span>`;
  };
  return `<div class="chips">${n.tg.map(chip).join("")}</div>`;
}

/* ——— LISTA WYBORU ETYKIET NA KARCIE — WYPEŁNIANA DOPIERO PRZED UŻYCIEM ———

   Każda karta ma listę wyboru ze WSZYSTKIMI etykietami. Przy sześćdziesięciu
   widocznych kartach i stu dwudziestu etykietach to 7 200 pozycji <option>
   w drzewie strony — POŁOWA WSZYSTKICH ELEMENTÓW — i nikt ich nie ogląda,
   dopóki nie rozwinie listy. Liczba rośnie iloczynem: karty × etykiety, więc
   sama się nie zatrzyma.

   Karta dostaje więc listę pustą, a pozycje wchodzą do niej przy pierwszym
   dotknięciu albo przed odczytem wybranej wartości. Znacznik data-puste mówi,
   że lista czeka; po wypełnieniu znika, żeby nie robić tego dwa razy. */
function wypelnijListeEtykiet(sel){
  if(sel && sel.dataset.puste){
    delete sel.dataset.puste;
    sel.innerHTML = tags.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join("");
  }
  return sel;
}
/** Lista wyboru etykiet w tej karcie, na pewno już wypełniona. */
function listaEtykietKarty(karta){
  return wypelnijListeEtykiet(karta.querySelector('[data-role="tagsel"]'));
}

/* dolny pasek: ikony działań + wiersz zarządzania etykietami */
function noteCardTools(n){
  return `<div class="ntools">
       <div class="btnrow">
         <button class="sbtn ico" data-act="edit" title="Edytuj notatkę">${ICO.edit}</button>
         <button class="sbtn ico" data-act="fs" title="Otwórz na pełnym ekranie">${ICO.fs}</button>
         <button class="sbtn ico ${n.pin?"pinon":""}" data-act="pin" title="${n.pin?"Odepnij":"Przypnij na górze"}">${ICO.pin}</button>
         <button class="sbtn ico ${n.fav?"favon":""}" data-act="fav" title="${n.fav?"Usuń z ulubionych":"Dodaj do ulubionych"}">${ICO.star}</button>
         <button class="sbtn ico" data-act="tagpanel" title="Etykiety (dodaj / przenieś)">${ICO.tag}</button>
         <button class="sbtn ico more-btn" data-act="more" title="Więcej działań">${ICO.dots}</button>
       </div>
       <div class="tagrow">
         <select data-role="tagsel" data-puste="1" title="Wybierz zakładkę"></select>
         <button class="sbtn mini" data-act="tagtoggle" title="Dodaj do wybranej zakładki lub usuń z niej">± Dodaj/usuń</button>
         <button class="sbtn mini" data-act="tagmove" title="Notatka zostanie tylko w wybranej zakładce">→ Przenieś</button>
         <input type="text" data-role="newtag" placeholder="Nowa etykieta">
         <button class="sbtn mini" data-act="tagcreate" title="Utwórz zakładkę i dodaj notatkę">＋ Utwórz</button>
       </div>
     </div>`;
}

function otworzMenuNotatki(btn, n, card){
  const dd = $("dropdown");
  if(!dd) return;
  if(dd.style.display === "block" && dd._lastAnchor === btn){
    dd.style.display = "none";
    dd._lastAnchor = null;
    return;
  }
  dd._lastAnchor = btn;
  const link = finderUrl(n);
  dd.innerHTML =
    (typeof paskTlaNotatki==="function" ? paskTlaNotatki(n) + `<div class="dd-sep"></div>` : "") +
    `<div data-x="fav">${ICO.star}${n.fav?"Usuń z ulubionych":"Dodaj do ulubionych"}</div>
     <div data-x="pin">${ICO.pin}${n.pin?"Odepnij z góry":"Przypnij na górze"}</div>
     <div class="dd-sep"></div>
     <div data-x="read">${ICO.book}Tryb czytania</div>
     <div data-x="copy">${ICO.copy}Kopiuj treść</div>
     <div data-x="wyslij">${ICO.send}Wyślij na inne urządzenie…</div>
     ${link?`<div data-x="link">${ICO.link}Kopiuj odnośnik</div>`:""}
     ${link?`<div data-x="open">${ICO.ext}Otwórz w JW Library</div>`:""}
     <div class="dd-sep"></div>
     <div data-x="powtorka">${IC_CLOCK}Przypomnij mi o niej…${(typeof maPowtorke==="function" && maPowtorke(n))?' <span class="ddZnak">✓</span>':""}</div>
     <div data-x="szablon">${ICO.doc}Zapisz jako szablon…</div>
     <div class="dd-sep"></div>
     <div data-x="grCentrum">${ICO.books}Centrum Studium${(n.cenq||n.ceni)?' <span class="ddZnak">✓</span>':""}<span class="ddStrz">›</span></div>
     <div data-x="grMiejsce">${ICO.bookmark}Gdzie leży<span class="ddStrz">›</span></div>
     <div data-x="grWyglad">${ICO.paint}Wygląd${(n.wys!==undefined||n.bg)?' <span class="ddZnak">✓</span>':""}<span class="ddStrz">›</span></div>
     <div data-x="grZapis">${ICO.doc}Zapisz jako plik<span class="ddStrz">›</span></div>
     <div class="dd-sep"></div>
     <div data-x="del" class="dd-danger">${ICO.trash}Usuń notatkę</div>`;
  if(typeof oznaczPozycjeMenu==="function") oznaczPozycjeMenu(dd);
  dd.style.display = "block";
  placeDropdown(dd, btn);
  dd.onclick = ev=>{
    const kotwica = card || (btn && btn.closest ? btn.closest(".ncard") : null) || document.body;
    if(typeof obsluzPaskTla==="function" && obsluzPaskTla(ev, n, kotwica)) return;
    const it=ev.target.closest("[data-x]"); if(!it) return;
    const x=it.dataset.x; dd.style.display="none";
    if(x==="grCentrum" || x==="grMiejsce" || x==="grWyglad" || x==="grZapis"){
      setTimeout(()=>podmenuNotatki(x, n, kotwica), 40); return; }
    if(x==="ptb"){ setTimeout(()=>pubTabMenu(n, kotwica), 40); return; }
    if(x==="stb"){ setTimeout(()=>menuZakladek(kotwica, n, "note"), 40); return; }
    if(x==="powtorka" && typeof menuPowtorki==="function"){
      setTimeout(()=>menuPowtorki(n, kotwica), 40); return; }
    if(x==="wysokosc" && typeof menuWysokosci==="function"){
      setTimeout(()=>menuWysokosci(n, kotwica), 40); return; }
    if(x==="szablon" && typeof zapiszJakoSzablon==="function"){ zapiszJakoSzablon(n.g); return; }
    if(x==="tlo" && typeof menuTlaNotatki==="function"){
      setTimeout(()=>menuTlaNotatki(n, kotwica), 40); return; }
    if(x==="fav") toggleFav(n);
    else if(x==="pin") togglePin(n);
    else if(x==="doc") exportNoteWord(n);
    else if(x==="pdf") exportNotePdf(n);
    else if(x==="wyslij" && typeof wyslijNotatke==="function") wyslijNotatke(n.g);
    else if(x==="verse") assignVerse(n);
    else if(x==="miejsce" && typeof ustawMiejsceWPublikacji==="function") ustawMiejsceWPublikacji(n.g);
    else if(x==="copy") copyNote(n);
    else if(x==="link") navigator.clipboard.writeText(finderUrl(n)).then(()=>toast("Skopiowano odnośnik"));
    else if(x==="read") toggleReading(kotwica);
    else if(x==="open") openUrlJWL(finderUrl(n));
    else if(x==="del") delNote(n);
  };
}

/**
 * Buduje kartę notatki wraz z obsługą zdarzeń. Zawartość składana jest z czterech
 * części: noteCardHead (uchwyt i tytuł), noteCardMeta (werset, publikacja, data),
 * noteCardChips (etykiety) i noteCardTools (pasek narzędzi).
 * @param {Note} n
 * @returns {HTMLElement} gotowy element .ncard
 */
function noteCard(n){
  const d = document.createElement("div");
  d.className = "ncard" + (n.pin?" pinned":"");
  d.dataset.g = n.g;
  // kolor paska z lewej = kolor pierwszej etykiety notatki (jeśli ma kolor)
  const firstColorTag = n.tg.map(id=>tags.find(t=>t.id===id)).find(t=>t&&t.color);
  if(firstColorTag) d.style.setProperty("--cardAccent", firstColorTag.color);
  if(n.ff) d.style.setProperty("--noteFont", n.ff);   // własna czcionka notatki
  if(n.lh) d.style.setProperty("--nLh", n.lh);        // własna interlinia notatki
  if(n.pm) d.style.setProperty("--nPm", n.pm);        // własny odstęp akapitów
  const link = finderUrl(n);        // gotowy adres do JW Library — używany też przez menu „Więcej"
  const sd=query?searchDetails.get(n.g):null;
  const fragmenty=sd?(sd.snippets&&sd.snippets.length?sd.snippets:[sd.snippet||""]):[];
  const ileTraf=sd&&sd.occurrences?`${sd.occurrences} ${sd.occurrences===1?"trafienie":"trafień"}`:"";
  const match=sd?`<div class="searchMatch"><span class="searchReason">${esc(sd.reason||"dopasowanie")}</span>`+
    `<span class="searchSnippets">${fragmenty.filter(Boolean).map(s=>`<span class="searchSnippet">${hilite(esc(s))}</span>`).join("")}</span>`+
    (ileTraf?`<span class="searchHits">${ileTraf}</span>`:"")+`</div>`:"";
  d.innerHTML = noteCardHead(n) + noteCardMeta(n) + noteCardChips(n) + autoTematKarta(n) + match +
                (typeof htmlPaskaPowtorki==="function" ? htmlPaskaPowtorki(n) : "") +
                `<div class="ncontent">${contentHtml(n)}</div>` +
                `<div class="wysUchwyt" title="Przeciągnij, aby zmienić wysokość notatki (dwuklik = jak w widoku)"></div>` +
                noteCardTools(n);
  autolinkRefs(d.querySelector(".ncontent"));
  /* Odsyłacze do notatek dostają napis z BIEŻĄCEGO tytułu, a przypisy numery
     z kolejności odsyłaczy — jedno i drugie liczone przy wyświetleniu, nie
     zapisane w treści. Wyjaśnienia w 54-wzmianki.js i 55-przypisy.js. */
  if(typeof odswiezOdnosnikiNotatek==="function") odswiezOdnosnikiNotatek(d.querySelector(".ncontent"));
  if(typeof przPrzenumeruj==="function") przPrzenumeruj(d.querySelector(".ncontent"));
  if(typeof uzupelnijZwijanieNaglowkow==="function") uzupelnijZwijanieNaglowkow(d.querySelector(".ncontent"));
  if(typeof zastosujWysokosc==="function") zastosujWysokosc(d, n);
  if(typeof zastosujTloNotatki==="function") zastosujTloNotatki(d, n);
  if(typeof przygotujPrzewijanie==="function") przygotujPrzewijanie(d);
  /* Lista etykiet wypełnia się przy pierwszym sięgnięciu po nią — dotknięciem,
     ogniskiem z klawiatury albo strzałką. Wszystkie trzy drogi prowadzą do tej
     samej funkcji, więc żadna nie zastaje listy pustej. */
  const obudzListe = e=>{ if(e.target.closest && e.target.closest('[data-role="tagsel"]')) wypelnijListeEtykiet(e.target.closest('[data-role="tagsel"]')); };
  d.addEventListener("pointerdown", obudzListe, true);
  d.addEventListener("focusin", obudzListe, true);
  d.addEventListener("keydown", obudzListe, true);
  d.addEventListener("click", e=>{
    if(e.target.closest(".ntitle") && !e.target.isContentEditable){
      const selT = (typeof getSelection === "function") ? getSelection() : null;
      if(selT && !selT.isCollapsed && String(selT).trim()) return;
      touchAccess(n); if(!fsGuid) openFs(n); return;
    }
    if(e.target.closest(".ncontent") && !e.target.isContentEditable) touchAccess(n);
    /* Dotknięcie zwykle trafia w <svg>, <path> albo napis wewnątrz przycisku.
       Odczyt data-act bezpośrednio z e.target działał tylko na pustym fragmencie
       przycisku — dlatego „Zapisz” na iPadzie wymagało kilku prób. */
    const actionEl = e.target.closest && e.target.closest("[data-act]");
    const act = actionEl ? actionEl.dataset.act : "";
    if(["fs","edit","copy","link","openref"].includes(act) || (actionEl && actionEl.matches("a.sbtn"))) touchAccess(n);
    if(!act) return;
    if(act==="fs"){ openFs(n); return; }
    if(act==="autoexclude"){ const t=aktywnyAutoTemat(); if(t) autoTematWyklucz(n,t.id); return; }
    if(act==="more" || act==="exp"){
      otworzMenuNotatki(actionEl || e.target, n, d);
      return;
    }
    if(act==="copy") copyNote(n);
    else if(act==="link"){ navigator.clipboard.writeText(finderUrl(n)).then(()=>toast("Skopiowano odnośnik")); }
    else if(act==="md") downloadMd(n);
    else if(act==="pin") togglePin(n);
    else if(act==="fav") toggleFav(n);
    // openref to teraz prawdziwy odnośnik (<a>) — otwiera się natywnie, iOS przekieruje do JW Library
    else if(act==="assignref") assignVerse(n);
    else if(act==="tagpanel"){ d.classList.toggle("showtags"); if(actionEl) actionEl.classList.toggle("tagon", d.classList.contains("showtags")); }
    else if(act==="read") toggleReading(d);
    else if(act==="edit") toggleEdit(d, n);
    else if(act==="del") delNote(n);
    else if(act==="tagtoggle"){
      const tid = +listaEtykietKarty(d).value;
      if(n.tg.includes(tid)) untag(n, tid); else addTag(n, tid);
    }
    else if(act==="tagmove"){
      const tid = +listaEtykietKarty(d).value;
      pushUndo({type:"note", label:"przeniesienie do zakładki", before:cloneNote(n)});
      n.tg = [tid]; n.tgd = true; markDirty(n); renderAll();
      toast("Notatka jest teraz tylko w „"+(tags.find(t=>t.id===tid)||{}).name+"”");
    }
    else if(act==="tagcreate"){
      const inp = d.querySelector('[data-role="newtag"]');
      const t = createTag(inp.value);
      if(t){ addTag(n, t.id); inp.value=""; }
      else toast("Wpisz nazwę zakładki");
    }
  });
  const handle = d.querySelector(".drag");
  handle.addEventListener("dragstart", e=>{
    e.dataTransfer.setData("text/plain", n.g);
    e.dataTransfer.effectAllowed = "move";
  });
  return d;
}
/**
 * Pełne odświeżenie interfejsu: etykiety, księgi, lista notatek i — gdy otwarty — czytnik.
 * Wywoływane po każdej zmianie danych. Poszczególne funkcje same pilnują,
 * żeby nie ruszać DOM bez potrzeby.
 */
function renderAll(){
  resetQueryCache();        // wyniki wyszukiwania liczymy raz na przerysowanie, nie cztery razy
  if(typeof resetLicznikowZakladek==="function") resetLicznikowZakladek();
  visibleCount=query?50:36;
  renderTags(); renderBooks(); renderNotes();
  if(typeof updateUnifiedTabsBadges === "function") updateUnifiedTabsBadges();
  /* Centrum studium albo lista — nigdy oba i nigdy żadne. Decyzja zapada TU,
     po każdej zmianie filtrów, bo tylko wtedy jest pewne, że stan filtrów
     i widok kolumny się nie rozjadą. */
  if(typeof centrumOdswiez === "function") centrumOdswiez();
  if(fsGuid) renderFs();
  /* Nazwy dla czytnika ekranu nadajemy od razu po przerysowaniu. Obserwator
     zmian też je nada, ale dopiero po oddaniu sterowania — a wtedy przez chwilę
     istnieją przyciski bez nazwy.

     Przeglądamy TYLKO kolumny, które właśnie odrysowaliśmy. Wcześniej szło się
     po całym dokumencie przy każdym przerysowaniu — kilka tysięcy elementów,
     z których zmieniła się garstka. To był najdroższy pojedynczy krok całego
     odświeżania. */
  if(typeof nazwijPrzyciskiIkonowe==="function"){
    ["tagList","bookList","noteList","pubList"].forEach(id=>{
      const el = document.getElementById(id);
      if(el) nazwijPrzyciskiIkonowe(el);
    });
  }
  /* Wędrujący tabindeks w kolumnach bocznych nadajemy od nowa: przerysowanie
     zbudowało nowe pozycje, a wraz ze starymi przepadła cała wiedza o tym,
     która z nich jest osiągalna Tabem. Patrz 50-kolumny-klawiatura.js. */
  if(typeof kolOdswiezKlawiature==="function") kolOdswiezKlawiature();
}
