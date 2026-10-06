/* ==========================================================================
   JW Study — publications.js
   Panel publikacji: kategorie, roczniki, wydania, własna kolejność
   ========================================================================== */
"use strict";
/* ===== PANEL PUBLIKACJI — podział na kategorie jak w JW Library ===== */
const PUB_CATS = [
  {id:"w",    name:"Strażnica",            test:ks=>/^wp?\d*$/.test(ks),        byYear:true},
  {id:"g",    name:"Przebudźcie się!",     test:ks=>/^gp?\d*$/.test(ks),        byYear:true},
  {id:"mwb",  name:"Życie i służba",       test:ks=>/^mwb/.test(ks),            byYear:true},
  {id:"km",   name:"Nasza Służba Królestwa",test:ks=>/^km\d*$/.test(ks),        byYear:true},
  {id:"yb",   name:"Roczniki",             test:ks=>/^(yb|yp)\d*$/.test(ks),    byYear:true},
  {id:"kong", name:"Wydawnictwa kongresowe",test:ks=>/^(ca|co)[-\d]/.test(ks),  byYear:true},
  {id:"kursy",name:"Szkolenia i kursy",    test:ks=>/^(pt|be|sg|kc|cf)\d*$/.test(ks)},
  {id:"ksiazki",name:"Książki",            test:ks=>/^(bt|bh|bhs|lff|jy|cl|lvs|od|it|si|rr|kr|ia|es|sjj|jd|gt|re|dp|ip|w0|bm|pe|hs)\d*$/.test(ks)},
  {id:"broszury",name:"Broszury",          test:ks=>/^(ll|ld|rj|hf|la|pc|bm|ay|gf|ph|jl|lc|lr|mb|fg|ol|pu|sp|th|wfg|yc)\d*$/.test(ks)},
  {id:"traktaty",name:"Traktaty i zaproszenia",test:ks=>/^(t-|inv|iv)/.test(ks)},
  {id:"serie",name:"Serie artykułów",      test:ks=>/^(lmd|ijwbq|jwb|nwtsty-)/.test(ks)},
  {id:"programy",name:"Programy",          test:ks=>/pgm/.test(ks),             byYear:true},
  {id:"szkice",name:"Szkice wykładów",     test:ks=>/^s-\d+/.test(ks)},
  {id:"skorowidze",name:"Skorowidze",      test:ks=>/^(dx|si-)/.test(ks)},
  {id:"wskazowki",name:"Wskazówki",        test:ks=>/^(S-|sn)\d*/.test(ks)}
];
function pubCatOf(n){
  const ks=String(n.ks||"").toLowerCase();
  if(!ks) return {id:"inne", name:"Inne", byYear:false};
  const c=PUB_CATS.find(c=>c.test(ks));
  return c || {id:"inne", name:"Inne", byYear:false};
}
/* rok publikacji: z numeru wydania (RRRRMMDD) albo z końcówki symbolu (w22 → 2022) */
function pubYearOf(n){
  const itn=String(n.itn||"");
  if(itn.length===8 && +itn.slice(0,4)) return itn.slice(0,4);
  const m=String(n.ks||"").match(/(\d{2})$/);
  if(m){ const y=+m[1]; return String(y>=60 ? 1900+y : 2000+y); }
  return "";
}
let pubView = {cat:null, year:null};     // gdzie jesteśmy w panelu publikacji

/* ——— WŁASNA KOLEJNOŚĆ POZYCJI W PANELU PUBLIKACJI ———
   Każdy poziom ma własny zapis kolejności (kategorie / roczniki / wydania).
   Pozycje przenosi się chwytem ⠿ — działa myszą i palcem na iPadzie. */
let pubOrder = {};
function loadPubOrder(){ try{ pubOrder = JSON.parse(localStorage.getItem("pubOrder")||"{}") || {}; }catch(e){ pubOrder = {}; } }
function savePubOrder(){ lsSet("pubOrder", JSON.stringify(pubOrder)); }
function pubOrderKey(){
  if(!pubView.cat) return "cats";
  if(!pubView.year) return "c:"+pubView.cat;
  return "y:"+pubView.cat+":"+pubView.year;
}
/* nakłada zapisaną kolejność; pozycje nowe (jeszcze nieprzestawiane) lądują na końcu, zachowując kolejność domyślną */
function applyPubOrder(keys){
  const ord = pubOrder[pubOrderKey()];
  if(!ord || !ord.length) return keys;
  const pos = {}; ord.forEach((k,i)=>{ pos[k]=i; });
  return keys.map((k,i)=>({k, a: (k in pos) ? pos[k] : 1e6, i}))
             .sort((x,y)=> x.a-y.a || x.i-y.i)
             .map(x=>x.k);
}
function setPubOrder(list){ pubOrder[pubOrderKey()] = list; savePubOrder(); }
function clearPubOrder(){ delete pubOrder[pubOrderKey()]; savePubOrder(); renderPubPanel(); toast("Przywrócono domyślną kolejność"); }
/* Przeciąganie pozycji panelu publikacji obsługuje 34-chwytanie.js — ten sam
   mechanizm, co przy etykietach, zakładkach i notatkach: element „przykleja
   się" do palca, gruba linia pokazuje miejsce, a nasłuch siedzi na dokumencie.

   Poprzednia obsługa trzymała nasłuchy na samym uchwycie i polegała na
   przechwyceniu wskaźnika. Gdy przechwycenie przepadało — a na tablecie
   zdarza się to przy przerysowaniu panelu — wiersz przestawał iść za palcem
   albo puszczenie nie dochodziło i nowa kolejność nie była zapisywana. */

/**
 * Rysuje panel Publikacje pod listą etykiet. Trzy poziomy nawigacji:
 * kategorie → roczniki (albo pojedyncze publikacje) → wydania.
 * Stan poziomu trzyma pubView, własną kolejność pozycji — pubOrder.
 */
/* ——— ŚCIEŻKA W PANELU PUBLIKACJI ———
   Panel ma trzy poziomy: kategorie → roczniki → wydania. Wcześniej powrót
   prowadził przycisk „‹ wstecz" w nagłówku. Mówił, że można się cofnąć, ale nie
   mówił SKĄD: po dwóch kliknięciach nie było wiadomo, czy patrzy się na roczniki
   Strażnicy, czy na wydania jednego rocznika. Ścieżka mówi jedno i drugie —
   i pozwala skoczyć wprost na wybrany poziom, a nie tylko o jeden w górę. */
function rysujSciezkePub(){
  const el = $("pubSciezka"); if(!el) return;
  if(!pubView.cat){ setHtml(el, ""); return; }   // na pierwszym poziomie nie ma czego pokazywać
  const nazwaKat = (PUB_CATS.find(c=>c.id===pubView.cat) || {name:"Inne"}).name;
  const strz = '<span class="pubStrz">›</span>';
  let html = '<button type="button" data-poziom="kat">Publikacje</button>' + strz;
  if(pubView.year){
    html += '<button type="button" data-poziom="rok">' + esc(nazwaKat) + '</button>' + strz
          + '<span class="pubTeraz">' + esc(pubView.year === "—" ? "Bez rocznika" : pubView.year) + '</span>';
  } else {
    html += '<span class="pubTeraz">' + esc(nazwaKat) + '</span>';
  }
  if(!setHtml(el, html)) return;                 // ten sam napis → zdarzenia już podpięte
  el.querySelectorAll("button").forEach(b=>{
    b.onclick = ()=>{
      if(b.dataset.poziom === "kat") pubView = {cat:null, year:null};
      else pubView.year = null;
      renderPubPanel();
    };
  });
}
function renderPubPanel(){
  const el=$("pubList"); if(!el) return;
  const base = notes.filter(n=>!n.del && noteMatchesTag(n,filt.tag) && noteMatchesBook(n,filt.book) && noteMatchesCh(n) && noteMatchesQuery(n));
  const rst=$("pubReset");
  rysujSciezkePub();
  const grip = '<span class="pubDrag" title="Przeciągnij: zmień kolejność lub dodaj do Mojej zakładki">'+IC_GRIP+'</span>';
  /* Publikacja, w kontekście której jesteśmy. Liczona RAZ na przerysowanie panelu —
     wcześniej wołana w pętli po publikacjach, czyli przy każdym renderowaniu tyle razy,
     ile publikacji, a każde wywołanie przeglądało wszystkie notatki. */
  const ksKontekst = (typeof pubCtxKs==="function") ? pubCtxKs() : null;
  let html="";
  /* Zakładki ogólne zostają pod ręką na KAŻDYM poziomie. Dzięki temu można
     przeciągnąć do nich rocznik lub publikację bez cofania się do początku. */
  if(typeof pubTabRowsHtml==="function")
    html += `<div class="pubGlobal"><div class="pubGlobalNagl">Moje zakładki</div>${pubTabRowsHtml("*")}</div>`;
  if(!pubView.cat){
    // POZIOM 1: kategorie
    const cats={};
    base.forEach(n=>{ const c=pubCatOf(n); if(!cats[c.id]) cats[c.id]={name:c.name,byYear:c.byYear,cnt:0}; cats[c.id].cnt++; });
    const keys=applyPubOrder(Object.keys(cats).sort((a,b)=>cats[b].cnt-cats[a].cnt || cats[a].name.localeCompare(cats[b].name,"pl")));
    if(!keys.length && !html){ el.innerHTML='<div class="pubEmpty">Brak notatek z publikacji</div>'; if(rst) rst.style.display="none"; return; }
    keys.forEach(id=>{
      html+=`<div class="item pubCat pubMove" data-cat="${id}" data-ord="${id}" data-pubref="cat:${id}" data-pubreflabel="${esc(cats[id].name)}">${grip}<span class="nm">${esc(cats[id].name)}</span><span class="arr">›</span><span class="cnt">${cats[id].cnt}</span></div>`;
    });
  } else if(!pubView.year){
    // POZIOM 2: roczniki albo poszczególne publikacje
    const inCat = base.filter(n=>pubCatOf(n).id===pubView.cat);
    const cat = PUB_CATS.find(c=>c.id===pubView.cat) || {byYear:false, name:"Inne"};
    if(cat.byYear){
      const years={};
      inCat.forEach(n=>{ const y=pubYearOf(n)||"—"; years[y]=(years[y]||0)+1; });
      applyPubOrder(Object.keys(years).sort((a,b)=>b.localeCompare(a))).forEach(y=>{
        const yl=(y==="—"?"Bez rocznika":y)+" — "+cat.name;
        html+=`<div class="item pubYear pubMove" data-year="${esc(y)}" data-ord="${esc(y)}" data-pubref="year:${esc(pubView.cat)}:${esc(y)}" data-pubreflabel="${esc(yl)}">${grip}<span class="nm">${y==="—"?"Bez rocznika":y}</span><span class="cnt">${years[y]}</span></div>`;
      });
    } else {
      const items={};
      inCat.forEach(n=>{ const k=pubKeyOf(n); items[k]=(items[k]||0)+1; });
      applyPubOrder(Object.keys(items).sort((a,b)=>items[b]-items[a])).forEach(k=>{
        const wKs = String(k).split("|")[0];
        const act=String(filt.pub)==="pub:"+k || (String(filt.pub).indexOf("ptb:")===0 && ksKontekst===wKs);
        html+=`<div class="item pubPick pubMove${String(filt.pub)==="pub:"+k?" active":""}" data-key="${esc(k)}" data-ord="${esc(k)}" data-pubref="pub:${esc(k)}" data-pubreflabel="${esc(pubKeyLabel(k))}">${grip}<span class="nm">${esc(pubKeyLabel(k))}</span><span class="cnt">${items[k]}</span></div>`;
        // po wybraniu publikacji pokazujemy pod nią jej własne zakładki
        if(act && typeof pubTabRowsHtml==="function") html+=pubTabRowsHtml(String(k).split("|")[0]);
      });
    }
  } else {
    // POZIOM 3: wydania w wybranym roczniku
    const inYear = base.filter(n=>pubCatOf(n).id===pubView.cat && (pubYearOf(n)||"—")===pubView.year);
    const items={};
    inYear.forEach(n=>{ const k=pubKeyOf(n); items[k]=(items[k]||0)+1; });
    const keys=applyPubOrder(Object.keys(items).sort((a,b)=>{
      const ia=+(String(a).split("|")[1]||0), ib=+(String(b).split("|")[1]||0);
      return ia-ib;
    }));
    // cały rocznik jednym kliknięciem — zawsze na górze, nie przenosi się
    const yKey="year:"+pubView.cat+":"+pubView.year;
    html+=`<div class="item pubPick${String(filt.pub)==="pub:"+yKey?" active":""}" data-key="${esc(yKey)}" data-pubref="year:${esc(pubView.cat)}:${esc(pubView.year)}" data-pubreflabel="Cały rocznik ${esc(pubView.year)}"><span class="nm">Cały rocznik ${esc(pubView.year)}</span><span class="cnt">${inYear.length}</span></div>`;
    keys.forEach(k=>{
      const itn=String(k).split("|")[1];
      const lbl= itn ? issueLabel(itn) : pubKeyLabel(k);
      const act=String(filt.pub)==="pub:"+k;
      html+=`<div class="item pubPick pubMove${act?" active":""}" data-key="${esc(k)}" data-ord="${esc(k)}" data-pubref="pub:${esc(k)}" data-pubreflabel="${esc(lbl)}">${grip}<span class="nm">${esc(lbl)}</span><span class="cnt">${items[k]}</span></div>`;
      if(act && typeof pubTabRowsHtml==="function") html+=pubTabRowsHtml(String(k).split("|")[0]);
    });
  }
  const changedPub = setHtml(el, html);
  if(rst){ const d = pubOrder[pubOrderKey()] ? "" : "none"; if(rst.style.display!==d) rst.style.display=d; }
  if(!changedPub) return;      // ten sam HTML → zdarzenia są już podpięte
  if(typeof bindPubTabs==="function") bindPubTabs(el);
  el.querySelectorAll(".pubCat").forEach(it=>{ it.onclick=e=>{ if(e.target.classList.contains("pubDrag")) return; pubView={cat:it.dataset.cat, year:null}; renderPubPanel(); }; });
  el.querySelectorAll(".pubYear").forEach(it=>{ it.onclick=e=>{ if(e.target.classList.contains("pubDrag")) return; pubView.year=it.dataset.year; renderPubPanel(); }; });
  el.querySelectorAll(".pubPick").forEach(it=>{
    it.onclick=e=>{
      if(e.target.classList.contains("pubDrag")) return;
      wlaczZawezenieWynikow();
      const k="pub:"+it.dataset.key;
      filt.pub = (String(filt.pub)===k) ? "all" : k;
      persistFilt(); renderAll();
      if(innerWidth<=900) mobileShow("colNotes");
    };
  });
}
/* podpis nagłówka grupy na liście notatek */
function pubKeyLabel(key){
  const [ks,itn]=String(key).split("|");
  const name = ks==="—" ? "Bez oznaczenia" : pubFullName(ks);
  return itn ? name+" · "+issueLabel(itn) : name;
}
function noteMatchesCh(n){ return filt.ch==null || n.ch===filt.ch; }
/* Tekst przeszukiwany: tytuł + treść + ODNOŚNIK (nazwa lekcji/publikacji lub werset)
   — dzięki temu „Lekcja 1 (a)" albo „pt14" znajdzie wszystkie notatki z tym odnośnikiem. */
function plainOf(n){
  return (n.t?n.t+" ":"") + (n.c||"") + " " +
         (refLabel(n)||"") + " " + (n.pub||"") + " " + (n.ks||"") + " " +
         (n.ks?pubFullName(n.ks)+" ":"") + (n.itn?issueLabel(n.itn)+" ":"") +
         (n.par?("akapit "+n.par):"");
}
/* ——— pamięć podręczna tekstu do wyszukiwania ———
   Przy każdym wciśniętym klawiszu przeszukujemy wszystkie notatki. Bez cache dla każdej
   z nich liczyliśmy od nowa plainOf() (a w środku refLabel, pubFullName, issueLabel)
   oraz norm() i squash(). Teraz liczymy to raz na notatkę i odświeżamy dopiero wtedy,
   gdy notatka faktycznie się zmieni. WeakMap = wpis znika razem z notatką, bez wycieków. */
const _searchCache = new WeakMap();
function noteSearchStamp(n){
  return (n.mo||"")+"|"+(n.t||"").length+"|"+(n.c||"").length+"|"+(n.h||"").length+"|"+
         (n.b||0)+"."+(n.ch||0)+"."+(n.v||0)+"|"+(n.ks||"")+"|"+(n.itn||0)+"|"+(n.par||0)+"|"+(n.pub||"");
}
/**
 * Zwraca gotowe teksty notatki do wyszukiwania: surowy, znormalizowany (bez ogonków)
 * i „ściśnięty" (bez znaków przestankowych). Liczone raz na notatkę i odświeżane
 * dopiero, gdy notatka się zmieni — inaczej każdy wciśnięty klawisz przeliczałby
 * wszystkie notatki od zera.
 * @param {Note} n
 * @returns {Object} pola: stamp, plain, norm, squashed
 */
function searchTextOf(n){
  const stamp = noteSearchStamp(n);
  let c = _searchCache.get(n);
  if(c && c.stamp === stamp) return c;
  const plain = plainOf(n);
  /* `tokens`, `tokenSet` i `roots` powstają dopiero wtedy, gdy naprawdę
     potrzebuje ich tryb inteligentny. Rozgrzewka zwykłego tekstu pozostaje
     dzięki temu lekka, a pierwsze szukanie odmiany nie rozkłada tej samej
     notatki na słowa po kilka razy. */
  c = { stamp, plain, norm: norm(plain), squashed: squash(plain),
        tokens:null, tokenSet:null, roots:null };
  _searchCache.set(n, c);
  return c;
}
/* ——— ROZGRZEWKA PAMIĘCI PODRĘCZNEJ ———
 *
 * Cache jest budowany leniwie, notatka po notatce — a to znaczy, że PIERWSZE
 * wciśnięcie klawisza po uruchomieniu płaci za wszystkie notatki naraz.
 * Zmierzone na 8050 notatkach: pierwszy klawisz 751 ms, każdy następny 30 ms.
 * Trzy czwarte sekundy zamrożonego okna w chwili, w której użytkownik właśnie
 * zaczął pisać — czyli w najgorszej możliwej chwili.
 *
 * Rozwiązanie nie polega na przyspieszeniu tej pracy, tylko na PRZESUNIĘCIU JEJ
 * W CZAS, w którym i tak nic się nie dzieje: zaraz po narysowaniu pierwszego
 * widoku, porcjami po 400 notatek, w przerwach między klatkami. Gdy przeglądarka
 * ma coś ważniejszego do zrobienia, `requestIdleCallback` po prostu nie woła
 * kolejnej porcji — rozgrzewka nigdy nie konkuruje z przewijaniem ani z pisaniem.
 *
 * Funkcję można wołać wielokrotnie i bez sprawdzania, czy już się wykonała:
 * przy ciepłym cache jeden `searchTextOf` to porównanie znacznika, czyli całość
 * kosztuje wtedy kilkanaście milisekund rozłożonych na porcje. Dlatego wołamy ją
 * także po wczytaniu kopii zapasowej i po uzgodnieniu z plikiem — czyli wszędzie
 * tam, gdzie do tablicy trafia naraz dużo notatek.
 */
let _rozgrzewkaTrwa = false;
function rozgrzejCacheSzukania(){
  if(_rozgrzewkaTrwa || typeof notes === "undefined") return;
  _rozgrzewkaTrwa = true;
  const jestBezczynnosc = (typeof requestIdleCallback === "function");
  /* Z prawdziwą bezczynnością o wielkości porcji decyduje TERMIN, nie licznik:
     przeglądarka daje do 50 ms na porcję i sama mówi, ile jeszcze zostało.
     Górna granica jest tylko zabezpieczeniem. Bez requestIdleCallback (Safari
     poniżej 17) nie ma terminu, więc porcja musi być mała z góry — 300 notatek
     to około 20 ms, czyli poniżej jednej klatki. */
  const KROK = jestBezczynnosc ? 2500 : 300;
  let i = 0;
  const kolejka = jestBezczynnosc
    ? (f)=>requestIdleCallback(f, {timeout:1200})
    : (f)=>setTimeout(()=>f(null), 60);
  const porcja = (termin)=>{
    let ile = 0;
    while(i < notes.length && ile < KROK
          && (!termin || ile === 0 || termin.timeRemaining() > 8)){
      const n = notes[i++];
      if(n && !n.del) searchTextOf(n);
      ile++;
    }
    if(i < notes.length) kolejka(porcja);
    else _rozgrzewkaTrwa = false;
  };
  kolejka(porcja);
}

/* Wyszukiwanie rozszerzone:
   słowo1 słowo2   → oba muszą wystąpić
   miłos*          → gwiazdka = dowolna końcówka/odmiana
   "cała fraza"    → dokładna fraza
   (kot|pies)      → jedno z kilku słów; działa też: kot|pies i OR   */
let qComp=null, qHl=null, qFields=null;
/* zapytanie w postaci znormalizowanej — liczone raz przy zmianie tekstu, nie przy każdej notatce */
let _qNorm="", _qSquash="";
/* pola do zawężania: tytuł:… etykieta:… werset:… (działa też bez ogonków i po angielsku) */
const QFIELD_MAP = {
  tytul:"title", tytuł:"title", title:"title", t:"title",
  etykieta:"tag", etykiety:"tag", tag:"tag", e:"tag",
  werset:"ref", wersety:"ref", ref:"ref", ksiega:"ref", księga:"ref", w:"ref",
  tresc:"body", treść:"body", body:"body"
};

/* Warstwa inteligentna nie wysyła treści poza urządzenie. Opiera się na
   lekkim rdzeniu polskich wyrazów, słowniku pojęć i tolerancji literówek. */
let searchMode=lsGet(KP+"SearchMode","exact")==="smart"?"smart":"exact";
let searchOpts={scope:"current",group:"all",dateFrom:"",dateTo:"",highlight:"all",extra:"all"};
try{ Object.assign(searchOpts,JSON.parse(lsGet(KP+"SearchOpts","{}"))); }catch(_){}
let qAdvTerms=[],qAdvNeg=[],qAdvPhrases=[],qSpecial={};
var searchScores=new Map(), searchDetails=new Map(), searchDuplicateSet=null;
/* Worker sprawdza cały indeks. Limit 1200 dotyczy wyłącznie awaryjnej ścieżki
   bez Workera (np. stare otwarcie przez file://), aby nie zamrozić iPada. */
const SEARCH_RESULT_STEP=250, SEARCH_SCAN_STEP=1200;
let searchMatchLimit=SEARCH_RESULT_STEP, searchScanLimit=SEARCH_SCAN_STEP;
let searchWasLimited=false, searchScannedCount=0, searchTotalMatches=0, searchInProgress=false;
function resetSearchWindow(){
  searchMatchLimit=SEARCH_RESULT_STEP; searchScanLimit=SEARCH_SCAN_STEP;
  searchWasLimited=false; searchScannedCount=0; searchTotalMatches=0; searchInProgress=false;
  if(typeof anulujWorkerSzukania==="function") anulujWorkerSzukania();
}
function normSzukStart(s){ return (s||"").toLowerCase().replace(/ł/g,"l").normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
const SZUK_STOP=new Set("notatka notatki notatek pokaz znajdz znajdź szukaj szukam chce chcę potrzebuje potrzebuję cos coś o na w we z ze do dla od i oraz albo czy co ktore które dotyczace dotyczące temat temacie".split(" ").map(normSzukStart));
const SZUK_POJECIA=[
  ["modlitwa","prosba","prośba","blaganie","błaganie","dziekczynienie","dziękczynienie"],
  ["pokora","pokorny","pokornie","skromnosc","skromność","unizenie","uniżenie"],
  ["milosc","miłość","kochac","kochać","serdecznosc","serdeczność"],
  ["przebaczenie","przebaczac","przebaczać","wybaczenie","wybaczac","wybaczać"],
  ["wiara","wierzyc","wierzyć"],
  ["zaufanie","ufnosc","ufność","zaufac","zaufać","zaufany","zaufani"],
  ["nadzieja","oczekiwanie","przyszlosc","przyszłość"],

  ["sluzba","służba","gloszenie","głoszenie","ewangelizacja"],
  ["zmartwychwstanie","wskrzeszenie","powstanie z martwych"],
  ["jehowa","bog","bóg","ojciec"],
  ["jezus","chrystus","mesjasz","syn bozy","syn boży"],
  ["stres","stresem","stresie","niepokoj","niepokój","zmartwienie","martwic","martwić","napiecie","napięcie","presja","spokoj","spokój","opanowanie","zdenerwowanie","zdenerwowac","zdenerwować"],
  ["lek","lęk","strach","obawa","boje","boję","odwaga","odwazny","odważny"],
  ["cierpliwosc","cierpliwość","wytrwalosc","wytrwałość","wytrwac","wytrwać","znosic","znosić"],
  ["radosc","radość","szczescie","szczęście","zadowolenie","wdziecznosc","wdzięczność"],
  ["smutek","cierpienie","choroba","zaloba","żałoba","pocieszenie","pocieszac","pocieszać"],
  ["konflikt","klotnia","kłótnia","spor","spór","zgoda","pojednanie","pokoj","pokój"],
  ["malzenstwo","małżeństwo","maz","mąż","zona","żona","wspolmalzonek","współmałżonek"],
  ["rodzina","dziecko","dzieci","rodzice","wychowanie","wychowywac","wychowywać"],
  ["decyzja","wybor","wybór","sumienie","madrosc","mądrość","rada","kierownictwo"],
  ["samotnosc","samotność","osamotnienie","przyjazn","przyjaźń","przyjaciel"],
  ["praca","pracowac","pracować","zatrudnienie","pieniadze","pieniądze","dlug","dług"],
  ["nawyk","uzaleznienie","uzależnienie","pokusa","samokontrola","panowanie nad soba","panowanie nad sobą"]
].map(g=>g.map(normSzukStart));
/* Te słowa pomagają rozumieć całe pytanie, ale same nie opisują jego tematu.
   Usuwamy je wyłącznie z warstwy znaczeniowej; tryb dokładny nadal korzysta
   z literalnych warunków z parseQuery(). */
"jak jaki jaka jakie gdzie kiedy dlaczego czemu kto ktos ktoś prosze proszę pomoz pomóż znajde znajdę znalezc znaleźć moge mogę mozna można powinien powinienem powinnam zrobic zrobić radzic radzić sobie zachowac zachować gdy jesli jeśli wtedy mnie mi moje moja moj mojego swój swoj swoim się sie tym tego tej ten ta".split(" ").forEach(x=>SZUK_STOP.add(normSzukStart(x)));
const SZUK_KSIEGI={mt:"mateusza",mk:"marka",lk:"lukasza",jn:"jana",dz:"dzieje apostolskie",rz:"rzymian","1kor":"1 koryntian","2kor":"2 koryntian",gal:"galatow",ef:"efezjan",flp:"filipian",kol:"kolosan","1tes":"1 tesaloniczan","2tes":"2 tesaloniczan","1tm":"1 tymoteusza","2tm":"2 tymoteusza",tyt:"tytusa",flm:"filemona",hbr:"hebrajczykow",jak:"jakuba","1pt":"1 piotra","2pt":"2 piotra","1jn":"1 jana","2jn":"2 jana","3jn":"3 jana",jud:"judy",obj:"objawienie",rdz:"rodzaju",wj:"wyjscia",kpl:"kaplanska",pwt:"powtorzonego prawa",jz:"jozuego",sedz:"sedziow",ps:"psalmy",prz:"przyslow",iz:"izajasza",jer:"jeremiasza",ez:"ezechiela",dn:"daniela"};
function rdzenPl(s){
  s=norm(s).replace(/[^a-z0-9]/g,"");
  if(s.length<5) return s;
  const kon=["owaniami","eniami","owanie","owania","owego","owemu","ami","ach","owie","owego","owych","owej","osc","osci","anie","enie","owy","owa","owe","ego","emu","ym","im","ych","ich","nie","nia","ciu","ie","ze","ac","ać","ic","ić","y","a","e","u","i"];
  for(const k of kon) if(s.length-k.length>=4 && s.endsWith(norm(k))) return s.slice(0,-norm(k).length);
  return s;
}
function odleglosc1(a,b,max){
  a=norm(a); b=norm(b); if(Math.abs(a.length-b.length)>max) return max+1;
  let prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const cur=[i]; let min=i;
    for(let j=1;j<=b.length;j++){ cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1)); min=Math.min(min,cur[j]); }
    if(min>max) return max+1; prev=cur;
  }
  return prev[b.length];
}
const _wariantyPojecCache = new Map();
function wariantyPojecia(s){
  const n=norm(s), r=rdzenPl(n); const out=new Set([n,r]);
  const hit=_wariantyPojecCache.get(n); if(hit) return hit;
  if(SZUK_KSIEGI[n]) out.add(SZUK_KSIEGI[n]);
  SZUK_POJECIA.forEach(g=>{ if(g.some(x=>rdzenPl(x)===r||x===n)) g.forEach(x=>{out.add(x);out.add(rdzenPl(x));}); });
  const wynik=[...out].filter(Boolean);
  _wariantyPojecCache.set(n,wynik);
  return wynik;
}
function parseAdvancedQuery(raw){
  qAdvTerms=[]; qAdvNeg=[]; qAdvPhrases=[]; qSpecial={};
  /* Mt5:3, Mt 5,3 i Mt 5.3 sprowadzamy do jednego zapisu przed podziałem
     na warunki. Dzięki temu skrót księgi i adres działają także bez spacji. */
  const nraw=norm(raw).replace(/\b([1-3]?[a-z]{1,6})\s*(\d{1,3})\s*[:,.]\s*(\d{1,3})\b/g,"$1 $2:$3");
  qAdvPhrases=[...nraw.matchAll(/"([^"]+)"/g)].map(m=>m[1]);
  if(/@ulubione/.test(nraw)) qSpecial.fav=true;
  if(/@przypiete|@przypięte/.test(nraw)) qSpecial.pin=true;
  if(/@duplikaty/.test(nraw)) qSpecial.duplicates=true;
  const hash=nraw.match(/(?:^|\s)#([\p{L}\p{N}_-]+)/u); if(hash) qSpecial.tag=hash[1].replace(/-/g," ");
  if(/(?:^|\s)biblia:(?:\s|$)/.test(nraw)) qSpecial.group="bible";
  if(/(?:^|\s)publikacja:(?:\s|$)/.test(nraw)) qSpecial.group="publication";
  const kolor=nraw.match(/kolor:(zolty|żółty|zielony|niebieski|fioletowy|czerwony|pomaranczowy|pomarańczowy|turkusowy)/);
  if(kolor) qSpecial.highlight=({zolty:1,"żółty":1,zielony:2,niebieski:3,fioletowy:4,czerwony:5,pomaranczowy:6,"pomarańczowy":6,turkusowy:7})[kolor[1]];
  let clean=nraw.replace(/"[^"]+"/g," ").replace(/(?:tytul|tytuł|title|t|etykieta|etykiety|tag|e|werset|wersety|ref|ksiega|księga|w|tresc|treść|body):(?:"[^"]+"|\S+)/g," ")
    .replace(/@\S+|#\S+|(?:biblia|publikacja):|kolor:\S+/g," ");
  /* Nawias może teraz zawierać także wielowyrazowe alternatywy, np.
     (władca świata|bóg tego systemu). To podstawa reguł znaczeniowych. */
  const tok=[]; let tm; const tr=/\(([^)]+)\)|(\S+)/g;
  while((tm=tr.exec(clean))) tok.push({text:tm[1]!==undefined?tm[1]:tm[2],grouped:tm[1]!==undefined});
  let neg=false, orPending=false;
  for(const item of tok){
    let t=item.text;
    if(t==="not"){neg=true;continue;} if(t==="and") continue; if(t==="or"){orPending=true;continue;}
    if(t[0]==="-"){neg=true;t=t.slice(1);} t=t.replace(/^\(|\)$/g,"");
    if(!t||SZUK_STOP.has(t)) {neg=false;orPending=false;continue;}
    const parts=t.split("|").map(x=>x.trim()).filter(Boolean);
    const cel=neg?qAdvNeg:qAdvTerms;
    if(orPending && cel.length) cel[cel.length-1].push(...parts);
    else cel.push(parts);
    neg=false; orPending=false;
  }
}
function tokenySzukania(c){
  if(c.tokens) return c.tokens;
  /* Unikalne słowa wystarczą do odpowiedzi „czy występuje”. W długich
     komentarzach te same wyrazy wracają dziesiątki razy — liczenie odległości
     dla każdej kopii było główną przyczyną kilkusekundowych zacięć. */
  c.tokens=[...new Set(c.norm.match(/[a-z0-9]+/g)||[])];
  c.tokenSet=new Set(c.tokens);
  c.roots=new Set(c.tokens.map(rdzenPl));
  return c.tokens;
}
function smartTermMatch(c,alts){
  const toks=tokenySzukania(c); const vars=[...new Set(alts.flatMap(wariantyPojecia))];
  for(const v of vars){
    if(v.includes("*")){ const p=v.replace(/\*/g,""); if(p && toks.some(t=>t.startsWith(p))) return true; continue; }
    if((c.tokenSet && c.tokenSet.has(v)) || (v.length>2 && c.norm.includes(v))) return true;
    const rv=rdzenPl(v);
    if(c.roots && c.roots.has(rv)) return true;
    const max=v.length>=9?2:(v.length>=5?1:0);
    if(max && toks.some(t=>Math.abs(t.length-v.length)<=max && t[0]===v[0] && odleglosc1(t,v,max)<=max)) return true;
  }
  return false;
}
function kategoriaNotatki(n){ return n.b?"bible":((n.ks||n.doc||n.pub)?"publication":"own"); }
function aktywneOpcjeSzukania(){
  return searchOpts.group!=="all"||!!searchOpts.dateFrom||!!searchOpts.dateTo||searchOpts.highlight!=="all"||searchOpts.extra!=="all";
}
function przechodziOpcjeSzukania(n){
  const grp=qSpecial.group||searchOpts.group;
  if(grp!=="all" && kategoriaNotatki(n)!==grp) return false;
  const data=(n.mo||n.cr||"").slice(0,10);
  if(searchOpts.dateFrom && data<searchOpts.dateFrom) return false;
  if(searchOpts.dateTo && data>searchOpts.dateTo) return false;
  const hi=String(qSpecial.highlight||searchOpts.highlight);
  if(hi==="has" && !/<mark\b/i.test(n.h||"")) return false;
  if(/^[1-7]$/.test(hi) && !(new RegExp("class=[\"'][^\"']*hl"+hi)).test(n.h||"")) return false;
  if((qSpecial.fav||searchOpts.extra==="fav")&&!n.fav) return false;
  if((qSpecial.pin||searchOpts.extra==="pin")&&!n.pin) return false;
  if(searchOpts.extra==="img"&&!/<img\b/i.test(n.h||"")) return false;
  if(searchOpts.extra==="edited"&&!n.ed) return false;
  if(searchOpts.extra==="week"){
    const czas=Date.parse(n.mo||n.cr||"");
    if(!Number.isFinite(czas) || Date.now()-czas>7*86400000) return false;
  }
  if(qSpecial.tag){ const nazwy=(n.tg||[]).map(id=>(tags.find(t=>t.id===id)||{}).name||"").join(" "); if(!norm(nazwy).includes(qSpecial.tag)) return false; }
  if(qSpecial.duplicates){
    if(!searchDuplicateSet){
      const seen=new Map(), dup=new Set();
      notes.forEach(x=>{ if(x.del)return; const k=squash((x.t||"")+" "+(x.c||"")).slice(0,800); if(k.length<35)return; if(seen.has(k)){dup.add(x.g);dup.add(seen.get(k));}else seen.set(k,x.g); });
      searchDuplicateSet=dup;
    }
    if(!searchDuplicateSet.has(n.g)) return false;
  }
  return true;
}
/* Najlepsze miejsca trafienia w treści. Nie bierzemy już pierwszego słowa z
   notatki: grupujemy wszystkie znalezione warianty i wybieramy dwa krótkie
   okna, w których spotyka się najwięcej szukanych pojęć. */
function fragmentyTrafienia(n){
  const tekst=(n.c||n.t||"").replace(/\s+/g," ").trim();
  if(!tekst) return {snippets:[],occurrences:0,proximity:0};
  const nt=norm(tekst), grupy=[];
  qAdvPhrases.forEach(p=>grupy.push([norm(p)]));
  qAdvTerms.forEach(g=>{
    const warianty=searchMode==="smart" ? g.flatMap(wariantyPojecia) : g;
    grupy.push([...new Set(warianty.map(x=>norm(x).replace(/\*/g,"")).filter(x=>x.length>1))]);
  });
  const traf=[];
  grupy.forEach((g,gi)=>g.forEach(s=>{
    let od=0,ile=0,at;
    while(s && ile<18 && (at=nt.indexOf(s,od))>=0){ traf.push({at,len:s.length,g:gi}); od=at+Math.max(1,s.length); ile++; }
  }));
  if(!traf.length){
    const s=tekst.slice(0,190); return {snippets:[s+(tekst.length>s.length?"…":"")],occurrences:0,proximity:0};
  }
  traf.sort((a,b)=>a.at-b.at);
  const kand=traf.map(h=>{
    const a=Math.max(0,h.at-72), b=Math.min(tekst.length,a+230);
    const w=traf.filter(x=>x.at>=a&&x.at<=b), rozne=new Set(w.map(x=>x.g)).size;
    return {a,b,p:rozne*120+w.length*7};
  }).sort((a,b)=>b.p-a.p||a.a-b.a);
  const wybrane=[];
  for(const k of kand){
    if(wybrane.some(x=>Math.abs(x.a-k.a)<120)) continue;
    let a=k.a,b=k.b;
    if(a>0){ const sp=tekst.indexOf(" ",a); if(sp>=0&&sp<a+24)a=sp+1; }
    if(b<tekst.length){ const sp=tekst.lastIndexOf(" ",b); if(sp>b-24)b=sp; }
    wybrane.push({a,b,p:k.p}); if(wybrane.length===2) break;
  }
  wybrane.sort((a,b)=>b.p-a.p);
  return {
    snippets:wybrane.map(x=>(x.a?"…":"")+tekst.slice(x.a,x.b)+(x.b<tekst.length?"…":"")),
    occurrences:traf.length,
    proximity:Math.max(0,...wybrane.map(x=>x.p))
  };
}
function ocenTrafnosc(n){
  if(!query) return {score:0,reason:"",snippet:"",snippets:[],occurrences:0};
  const title=norm(n.t||""), body=norm(n.c||""), ref=norm(refLabel(n)||""), tag=norm((n.tg||[]).map(id=>(tags.find(t=>t.id===id)||{}).name||"").join(" "));
  let score=0,reason="treść",wagaPowodu=0;
  const powod=(nazwa,waga)=>{ if(waga>wagaPowodu){reason=nazwa;wagaPowodu=waga;} };
  qAdvPhrases.forEach(p=>{
    const x=norm(p);
    if(title===x){score+=900;powod("dokładny tytuł",9);}
    else if(title.includes(x)){score+=650;powod("fraza w tytule",8);}
    else if(ref.includes(x)){score+=560;powod("werset",7);}
    else if(tag.includes(x)){score+=430;powod("etykieta",6);}
    else if(body.includes(x)){score+=260;powod("dokładna fraza",5);}
  });
  qAdvTerms.forEach(g=>{
    let best=0,bestReason="treść",bestW=1;
    const warianty=searchMode==="smart"?[...new Set(g.flatMap(wariantyPojecia))]:g;
    warianty.forEach(t=>{
      const x=norm(t).replace(/\*/g,""); if(!x)return;
      if(title===x&&best<800){best=800;bestReason="dokładny tytuł";bestW=9;}
      else if(title.includes(x)&&best<520){best=520;bestReason="tytuł";bestW=8;}
      if(ref.includes(x)&&best<470){best=470;bestReason="werset";bestW=7;}
      if(tag.includes(x)&&best<360){best=360;bestReason="etykieta";bestW=6;}
      if(body.includes(x)&&best<80){best=80;bestReason="treść";bestW=2;}
    });
    score+=best||30; powod(bestReason,bestW);
  });
  const fr=fragmentyTrafienia(n);
  if(qAdvTerms.length+qAdvPhrases.length>1 && fr.proximity>=240){score+=220;powod("pojęcia razem",4);}
  /* Ulubienie i przypięcie rozstrzygają tylko remis. */
  if(n.pin) score+=2; if(n.fav) score+=1;
  return {score,reason,snippet:fr.snippets[0]||"",snippets:fr.snippets,occurrences:fr.occurrences};
}
/**
 * Rozkłada wpisane zapytanie na gotowe do użycia wyrażenia regularne.
 * Obsługiwana składnia:
 *   słowo1 słowo2   — oba muszą wystąpić
 *   miłos*          — gwiazdka zastępuje końcówkę
 *   "cała fraza"    — dokładna fraza
 *   (kot|pies)      — którekolwiek ze słów
 *   tytuł: etykieta: werset:  — zawężenie do pola
 * Wynik trafia do zmiennych modułu: qComp (warunki), qHl (podświetlanie),
 * qFields (zawężenia) oraz _qNorm/_qSquash (zapytanie policzone raz, nie per notatka).
 * @param {string} q
 */
function parseQuery(q){
  const nextQuery=q.trim();
  if(nextQuery!==query){ resetSearchWindow(); if(typeof _searchCounts!=="undefined") _searchCounts={all:0,bible:0,publication:0,own:0}; }
  query = nextQuery;
  resetQueryCache();          // inne zapytanie → stare wyniki są nieaktualne
  qComp = null; qHl = null; qFields = null;
  _qNorm = norm(query); _qSquash = squash(query);
  parseAdvancedQuery(query);
  if(!query) return;
  try{
    const groups=[]; const fields=[]; let orFlag=false;
    const re=/(\S+?):"([^"]+)"|(\S+?):(\S+)|"([^"]+)"|\(([^)]+)\)|(\S+)/g; let m;
    while((m=re.exec(query))){
      // 1) pole:wartość  (np. tytuł:pokora, etykieta:"studium osobiste")
      const fname = m[1]!==undefined ? m[1] : (m[3]!==undefined ? m[3] : null);
      if(fname!==null){
        const key = QFIELD_MAP[norm(fname)];
        const val = m[2]!==undefined ? m[2] : m[4];
        if(key && val){ fields.push({f:key, v:norm(val)}); continue; }
      }
      let alts=null;
      if(m[5]!==undefined) alts=[m[5]];
      else if(m[6]!==undefined) alts=m[6].split("|").map(s=>s.trim()).filter(Boolean);
      else{
        const w=m[7];
        if(w===undefined) continue;
        if(w[0]==="-" || /^not$/i.test(w) || w[0]==="@" || w[0]==="#" || /^(biblia|publikacja|kolor):/i.test(w)) continue;
        if(w==="|" || /^or$/i.test(w)){ orFlag=true; continue; }
        if(w.includes("|")) alts=w.split("|").map(s=>s.trim()).filter(Boolean);
        else alts=[w];
      }
      if(!alts || !alts.length) continue;
      if(orFlag && groups.length){ groups[groups.length-1].push(...alts); orFlag=false; }
      else groups.push(alts);
    }
    qFields = fields.length ? fields : null;
    if(!groups.length) return;
    // wzorce budujemy na tekście BEZ ogonków → „milosc" znajdzie „miłość"
    // SAME LICZBY dopasowujemy jako osobne słowa, żeby „Lekcja 1" nie trafiało w „pt14"
    const mk = s => {
      const base = norm(s).replace(/[.+?^${}()|[\]\\]/g,"\\$&").replace(/\*/g,"[\\p{L}\\p{N}]*");
      return /^\d+$/.test(norm(s)) ? "(?<![\\p{L}\\p{N}])"+base+"(?![\\p{L}\\p{N}])" : base;
    };
    qComp = groups.map(g=>new RegExp(g.map(mk).join("|"),"iu"));
    // podświetlanie działa na oryginalnym tekście — najpierw rozszerzamy litery o warianty z ogonkami,
    // DOPIERO POTEM wstawiamy wieloznacznik (inaczej zepsulibyśmy \p{L} w środku wzorca)
    const G={a:"[aąAĄ]",c:"[cćCĆ]",e:"[eęEĘ]",l:"[lłLŁ]",n:"[nńNŃ]",o:"[oóOÓ]",s:"[sśSŚ]",z:"[zźżZŹŻ]"};
    const mkHl = s => s.replace(/[.+?^${}()|[\]\\]/g,"\\$&")
      .replace(/[aącćeęlłnńoósśzźżAĄCĆEĘLŁNŃOÓSŚZŹŻ]/g, ch=>G[norm(ch)] || ch)
      .replace(/\*/g,"[\\p{L}\\p{N}]*");
    qHl = new RegExp("("+groups.flat().map(mkHl).join("|")+")","giu");
  }catch(e){ qComp=null; qHl=null; qFields=null; }
}
function noteFieldText(n, f){
  if(f==="title") return n.t||"";
  if(f==="body")  return n.c||"";
  if(f==="tag")   return n.tg.map(id=>{ const t=tags.find(x=>x.id===id); return t?t.name:""; }).join(" ");
  if(f==="ref")   return (refLabel(n)||"") + " " + (n.ks||"") + " " + (n.pub||"");
  return "";
}
/* „ściśnięty" tekst: same litery i cyfry, bez spacji i znaków —
   dzięki temu „Lekcja 1A" znajdzie „Lekcja 1 (a)", a „Jan3:16" → „Jan 3:16". */
function squash(s){ return norm(s).replace(/[^\p{L}\p{N}]+/gu,""); }
/**
 * Czy notatka pasuje do bieżącego zapytania. Korzysta z searchTextOf, więc nie liczy
 * niczego od nowa dla notatek, które się nie zmieniły.
 * @param {Note} n
 * @returns {boolean}
 */
/* Wynik wyszukiwania dla jednej notatki bywa liczony kilka razy w jednym
   przerysowaniu: raz dla listy etykiet, raz dla ksiąg, raz dla listy notatek
   i raz dla panelu publikacji. Przy kilkunastu tysiącach notatek to cztery
   pełne przebiegi zamiast jednego. Podręczna mapa żyje tylko do najbliższego
   renderAll(), które ją czyści — patrz resetQueryCache(). */
var _qCache = null;
/** Czyści podręczne wyniki wyszukiwania. Wywoływane na starcie renderAll(). */
function resetQueryCache(){
  _qCache = null;
  if(searchScores) searchScores.clear();
  if(searchDetails) searchDetails.clear();
  searchDuplicateSet=null;
}
function noteMatchesQuery(n){
  if(!query && !aktywneOpcjeSzukania()) return true;
  if(!n || !n.g) return dopasujZapytanie(n);
  if(!_qCache) _qCache = new Map();
  const zapamietane = _qCache.get(n.g);
  if(zapamietane !== undefined) return zapamietane;
  const wynik = dopasujZapytanie(n);
  _qCache.set(n.g, wynik);
  return wynik;
}
/** Właściwe dopasowanie notatki do zapytania. */
function dopasujZapytanie(n){
  if(!przechodziOpcjeSzukania(n)) return false;
  if(!query) return true;
  if(qFields && !qFields.every(({f,v})=>norm(noteFieldText(n,f)).includes(v))) return false;
  const c = searchTextOf(n);                 // gotowe, znormalizowane teksty notatki
  if(qAdvNeg.some(g=>searchMode==="smart"?smartTermMatch(c,g):g.some(t=>c.norm.includes(norm(t))))) return false;
  let ok;
  if(searchMode==="smart"){
    const frazyOk=qAdvPhrases.every(p=>c.norm.includes(p)||c.squashed.includes(squash(p)));
    const slowaOk=qAdvTerms.every(g=>smartTermMatch(c,g));
    ok=frazyOk&&slowaOk;
    if(!qAdvPhrases.length&&!qAdvTerms.length) ok=!!(qFields||Object.keys(qSpecial).length);
    if(!ok && _qSquash.length>=3) ok=c.squashed.includes(_qSquash);
  }else{
    ok=!qComp ? (qFields||Object.keys(qSpecial).length ? true : c.norm.includes(_qNorm))
              : qComp.every(rx=>rx.test(c.norm));
    if(!ok) ok=_qSquash.length>=3 && c.squashed.includes(_qSquash);
  }
  if(ok && n && n.g){ const d=ocenTrafnosc(n); searchScores.set(n.g,d.score); searchDetails.set(n.g,d); }
  return !!ok;
}

/* ——— WYSZUKIWANIE W OSOBNYM WĄTKU ———
   Worker skanuje uproszczony indeks i zwraca wyłącznie identyfikatory
   kandydatów. Główny wątek sprawdza potem najwyżej małą partię wyniku przez
   dopasujZapytanie(), więc zachowujemy całą inteligentną składnię bez
   blokowania dotyku i przewijania. */
let _swSzuk=null, _swGotowy=false, _swBuduje=false, _swOczekuje=false;
let _swSeq=0, _swQuery="", _swIds=[], _swScanned=0, _swLimited=false, _swTotalMatches=0, _swDone=false, _swTotal=0;
let _swRenderTimer=0, _swMapa=null, _swMapaRef=null, _swMapaLen=-1;
let _swOdbudowaTimer=0, _swAktualizacje=new Map();

function rekordDlaWorkerSzukania(n, mapaTagow){
  const tag=(n.tg||[]).map(id=>mapaTagow.get(id)||"").filter(Boolean).join(" ");
  return {g:n.g,plain:plainOf(n)+" "+tag,title:n.t||"",body:n.c||"",tag,ref:refLabel(n)||"",pin:!!n.pin,fav:!!n.fav};
}
function uruchomIndeksWorkerSzukania(){
  if(typeof Worker!=="function" || !location || location.protocol==="file:") return false;
  try{
    if(_swSzuk) _swSzuk.terminate();
    _swSzuk=new Worker("./search-worker.js");
  }catch(e){ _swSzuk=null; return false; }
  _swGotowy=false; _swBuduje=true; _swOczekuje=false; _swSeq++;
  _swQuery=""; _swIds=[]; _swTotalMatches=0; _swDone=false; _swTotal=0;
  _swSzuk.onerror=e=>{
    console.warn("Wątek wyszukiwania niedostępny — używam trybu zgodności",e);
    try{_swSzuk.terminate();}catch(_){} _swSzuk=null; _swGotowy=false; _swBuduje=false;
  };
  _swSzuk.onmessage=e=>{
    const m=e.data||{};
    if(m.type==="ready"){
      _swGotowy=true; _swBuduje=false;
      if(_swOczekuje){ _swOczekuje=false; uruchomWorkerSzukania(); }
      return;
    }
    if(m.type!=="results" || m.seq!==_swSeq || _swQuery!==query) return;
    _swIds=Array.isArray(m.ids)?m.ids:[]; _swScanned=+m.scanned||0; _swLimited=!!m.limited;
    _swTotalMatches=Math.max(_swIds.length,+m.totalMatches||0);
    _swDone=!!m.done; _swTotal=+m.total||0;
    /* Kilka małych partii może dojść w jednej klatce. Rysujemy najwyżej raz
       na 90 ms, żeby stopniowe wyniki same nie stały się źródłem zacięć. */
    clearTimeout(_swRenderTimer);
    _swRenderTimer=setTimeout(()=>{ resetQueryCache(); renderNotes(); },90);
  };
  const zywe=notes.filter(n=>n && !n.del);
  _swSzuk.postMessage({type:"reset",total:zywe.length});
  const tagMapa=new Map(tags.map(t=>[t.id,t.name||""])); let i=0;
  const wyslij=()=>{
    if(!_swSzuk) return;
    const koniec=Math.min(zywe.length,i+180), rows=[];
    for(;i<koniec;i++) rows.push(rekordDlaWorkerSzukania(zywe[i],tagMapa));
    if(rows.length) _swSzuk.postMessage({type:"add",rows});
    if(i<zywe.length) setTimeout(wyslij,0);
    else _swSzuk.postMessage({type:"done"});
  };
  setTimeout(wyslij,0);
  return true;
}
function workerPlanSzukania(){
  const rozwin=g=>searchMode==="smart"?[...new Set(g.flatMap(wariantyPojecia))]:g.slice();
  let allowed=null;
  if(searchOpts.scope!=="all") allowed=notes.filter(n=>n&&!n.del&&noteMatchesTag(n,filt.tag)&&noteMatchesBook(n,filt.book)&&noteMatchesCh(n)&&noteMatchesPub(n,filt.pub)).map(n=>n.g);
  const allowedSet=allowed?new Set(allowed):null;
  allowed=notes.filter(n=>n&&!n.del&&przechodziOpcjeSzukania(n)&&(!allowedSet||allowedSet.has(n.g))).map(n=>n.g);
  return {type:"search",seq:_swSeq,mode:searchMode,
    groups:qAdvTerms.map(rozwin),neg:qAdvNeg.map(rozwin),phrases:qAdvPhrases.slice(),
    fields:qFields?qFields.map(x=>({f:x.f,v:x.v})):[],squash:_qSquash,allowed,
    matchLimit:searchMatchLimit,scanLimit:searchScanLimit};
}
function uruchomWorkerSzukania(){
  /* Zapytania złożone wyłącznie z filtrów (@ulubione, @duplikaty itp.) są
     szybkim filtrem metadanych i zostają na głównym wątku. */
  if(!_swSzuk || !query || (!qAdvTerms.length&&!qAdvPhrases.length&&!qFields)) return false;
  _swQuery=query; _swIds=[]; _swScanned=0; _swLimited=true; _swTotalMatches=0; _swDone=false; _swTotal=0;
  if(!_swGotowy){
    _swOczekuje=true;
    const box=$("searchStatus"); if(box){box.hidden=false;box.innerHTML='<span class="ssInfo">Przygotowuję szybki indeks wyszukiwania…</span>';}
    return true;
  }
  _swSeq++;
  const plan=workerPlanSzukania(); plan.seq=_swSeq;
  _swSzuk.postMessage(plan);
  const box=$("searchStatus"); if(box){box.hidden=false;box.innerHTML='<span class="ssInfo">Szukam w tle — możesz nadal przewijać i dotykać ekranu…</span>';}
  return true;
}
function anulujWorkerSzukania(){
  _swSeq++; _swQuery=""; _swIds=[]; _swScanned=0; _swLimited=false; _swTotalMatches=0; _swDone=false; _swTotal=0; _swOczekuje=false;
  clearTimeout(_swRenderTimer);
}
function workerWynikiBiezace(){
  if(!_swQuery || _swQuery!==query) return null;
  if(_swMapaRef!==notes || _swMapaLen!==notes.length){
    _swMapa=new Map(notes.map(n=>[n.g,n])); _swMapaRef=notes; _swMapaLen=notes.length;
  }
  return {notes:_swIds.map(g=>_swMapa.get(g)).filter(Boolean),scanned:_swScanned,limited:_swLimited,
    totalMatches:_swTotalMatches,done:_swDone,total:_swTotal};
}
function workerAktualizujNotatke(n){
  if(!_swSzuk || !_swGotowy || !n || !n.g) return;
  clearTimeout(_swAktualizacje.get(n.g));
  _swAktualizacje.set(n.g,setTimeout(()=>{
    _swAktualizacje.delete(n.g);
    if(!_swSzuk) return;
    if(n.del) _swSzuk.postMessage({type:"remove",g:n.g});
    else _swSzuk.postMessage({type:"upsert",row:rekordDlaWorkerSzukania(n,new Map(tags.map(t=>[t.id,t.name||""])))});
    if(query && _swQuery===query) uruchomWorkerSzukania();
  },220));
}
function workerUsunNotatke(g){ if(_swSzuk&&g) _swSzuk.postMessage({type:"remove",g}); }
function workerOznaczIndeksDoOdbudowy(){
  clearTimeout(_swOdbudowaTimer);
  _swOdbudowaTimer=setTimeout(()=>{ if(_swSzuk) uruchomIndeksWorkerSzukania(); },450);
}
