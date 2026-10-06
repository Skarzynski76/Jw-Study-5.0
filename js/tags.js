/* ==========================================================================
   JW Study — tags.js
   Układ listy, kolumna Etykiety, sekcje etykiet
   ========================================================================== */
"use strict";
/* ===== UKŁAD LISTY NOTATEK =====
   Trzy widoki, bo dwa okazały się skokiem z jednej skrajności w drugą:
     • lista  — cała treść każdej notatki,
     • średni — pierwsze kilka linijek (nowość, v2.09),
     • zwarty — sam tytuł i początek treści.
   Przy pełnej treści na iPadzie mieściły się trzy notatki, a widok zwarty
   ucinał je tak mocno, że trzeba było otwierać każdą. Widok średni pokazuje
   dość, żeby rozpoznać notatkę, i mieści ich na ekranie kilkanaście. */
let noteView = "list";
const savedView = lsGet(KP+"View", null);
if(["list","medium","compact","tablica"].includes(savedView)) noteView = savedView;
function applyNoteView(){
  const el=$("noteList"); if(!el) return;
  el.classList.remove("v-list","v-medium","v-compact","v-tablica");
  el.classList.add("v-"+noteView);
  if(typeof zastosujKolumnyTablicy==="function") zastosujKolumnyTablicy();
  if(typeof odswiezWyborKolumn==="function") odswiezWyborKolumn();
  document.querySelectorAll("#viewBar .vb").forEach(b=>{
    const wlaczony = b.dataset.view===noteView;
    b.classList.toggle("on", wlaczony);
    b.setAttribute("aria-pressed", String(wlaczony));   // czytnik ekranu mówi, który widok jest włączony
  });
}
function setNoteView(v){
  noteView=v;
  lsSet(KP+"View", v);
  applyNoteView(); renderNotes();
}
function initViewBar(){
  const ic={
    list:_svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    medium:_svg('<path d="M4 5h16M4 9h16M4 15h16M4 19h16"/>'),
    compact:_svg('<path d="M4 5h16M4 9h16M4 13h16M4 17h16M4 21h16"/>'),
    tablica:_svg('<rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/>')
  };
  document.querySelectorAll("#viewBar .vb").forEach(b=>{
    b.innerHTML = ic[b.dataset.view]||"";
    /* Ikona sama w sobie nic nie mówi czytnikowi ekranu — nazwę bierzemy z podpowiedzi.
       aria-pressed pokazuje, który widok jest właśnie włączony. */
    if(b.title && !b.getAttribute("aria-label")) b.setAttribute("aria-label", b.title);
    b.setAttribute("aria-pressed", String(b.classList.contains("on")));
    b.onclick = ()=>setNoteView(b.dataset.view);
  });
  applyNoteView();
}
/* szybkie filtry nad listą notatek */
let quickFilter = "all";
/**
 * Szybki filtr nad listą notatek: wszystkie / przypięte / ulubione / bez etykiety /
 * ze zdjęciem / z ostatniego tygodnia.
 * @param {Note} n
 * @returns {boolean}
 */
function matchesQuick(n){
  if(quickFilter==="all") return true;
  if(quickFilter==="pin") return !!n.pin;
  if(quickFilter==="fav") return !!n.fav;
  if(quickFilter==="untagged") return !n.tg || n.tg.length===0;
  if(quickFilter==="img") return /<img/i.test(n.h||"");
  if(quickFilter==="powtorka") return (typeof czekaNaPowrot==="function") && czekaNaPowrot(n);
  if(quickFilter==="cenq") return !!n.cenq;
  if(quickFilter==="ceni") return !!n.ceni;
  if(quickFilter==="week"){
    const t=Date.parse(n.mo||n.cr||"");
    return isFinite(t) && (Date.now()-t) < 7*86400000;
  }
  return true;
}
/* ——— jeden przebieg zamiast sześciu ———
   „Baza" to notatki po filtrach kolumn i wyszukiwarki, jeszcze bez szybkiego filtru.
   Liczą jej potrzebują zarówno lista, jak i liczniki nad listą, więc obliczamy ją raz
   i podajemy dalej zamiast przeglądać wszystkie notatki kilka razy z rzędu. */
function baseNotes(){
  const globalne=(query||aktywneOpcjeSzukania())&&searchOpts.scope==="all";
  const aktywne=!!query||aktywneOpcjeSzukania();
  if(!aktywne) return notes.filter(n=>!n.del && noteMatchesTag(n,filt.tag) && noteMatchesBook(n,filt.book) && noteMatchesCh(n) && noteMatchesPub(n,filt.pub));
  const zWorkera=typeof workerWynikiBiezace==="function"?workerWynikiBiezace():null;
  if(zWorkera){
    const wynik=[];
    for(const n of zWorkera.notes){
      if(!n || n.del) continue;
      if(!globalne && !(noteMatchesTag(n,filt.tag) && noteMatchesBook(n,filt.book) && noteMatchesCh(n) && noteMatchesPub(n,filt.pub))) continue;
      /* Worker daje szeroką listę kandydatów. Pełne reguły, punktacja i filtry
         specjalne są sprawdzane już tylko na tej małej partii. */
      if(noteMatchesQuery(n)) wynik.push(n);
    }
    searchScannedCount=zWorkera.scanned; searchWasLimited=zWorkera.limited;
    searchTotalMatches=zWorkera.totalMatches||wynik.length;
    searchInProgress=!zWorkera.done;
    return wynik;
  }
  /* Jedna szeroka fraza potrafi pasować do tysięcy notatek. Nie przeglądamy
     i nie sortujemy ich wszystkich w jednej klatce: jedna partia sprawdza
     najwyżej 1200 rekordów i zatrzymuje się po 250 trafieniach. */
  const wynik=[]; let i=0;
  for(;i<notes.length && i<searchScanLimit && wynik.length<searchMatchLimit;i++){
    const n=notes[i];
    if(!n || n.del) continue;
    if(!globalne && !(noteMatchesTag(n,filt.tag) && noteMatchesBook(n,filt.book) && noteMatchesCh(n) && noteMatchesPub(n,filt.pub))) continue;
    if(noteMatchesQuery(n)) wynik.push(n);
  }
  searchScannedCount=i;
  searchWasLimited=i<notes.length;
  searchTotalMatches=wynik.length;
  searchInProgress=false;
  return wynik;
}
/**
 * Notatki widoczne na liście: baza plus szybki filtr (przypięte, ulubione, bez etykiety…).
 * @param {Note[]} [base]  gotowa baza; gdy pominięta, liczona na miejscu
 * @returns {Note[]}
 */
function filteredNotes(base){
  return (base || baseNotes()).filter(matchesQuick);
}
const _QF_WEEK = 7*86400000;
function renderQuickFilters(base){
  const box=$("quickFilters"); if(!box) return;
  base = base || baseNotes();
  // pojedyncza pętla liczy wszystkie liczniki naraz (wcześniej: cztery osobne przebiegi)
  const now = Date.now();
  const cnt={ all: base.length, pin:0, fav:0, untagged:0, img:0, week:0, powtorka:0, cenq:0, ceni:0 };
  for(let i=0;i<base.length;i++){
    const n=base[i];
    if(n.pin) cnt.pin++;
    if(n.fav) cnt.fav++;
    if(!n.tg || !n.tg.length) cnt.untagged++;
    if(n.h && n.h.indexOf("<img")>=0) cnt.img++;
    const t=Date.parse(n.mo||n.cr||"");
    if(isFinite(t) && (now-t)<_QF_WEEK) cnt.week++;
    if(typeof czekaNaPowrot==="function" && czekaNaPowrot(n)) cnt.powtorka++;
    if(n.cenq) cnt.cenq++;
    if(n.ceni) cnt.ceni++;
  }
  box.querySelectorAll(".qf[data-qf]").forEach(b=>{
    const k=b.dataset.qf, c=cnt[k]||0;
    b.classList.toggle("on", quickFilter===k);
    b.classList.toggle("empty", k!=="all" && !c);
    /* „Na dziś" chowamy zupełnie, gdy nic nie czeka. Pozostałe filtry opisują
       zbiory, które istnieją zawsze; ten opisuje umówione spotkania — a pusty
       chip „Na dziś 0" uczyłby omijać go wzrokiem także wtedy, gdy coś w nim
       będzie. */
    if(k==="powtorka" || k==="cenq" || k==="ceni") b.hidden = !c && quickFilter!==k;
    const label = b.dataset.lbl || b.textContent.replace(/\s*\d+$/,"").trim();
    setHtml(b, esc(label) + (k!=="all" && c ? ` <span class="qf-n">${c}</span>` : ""));
    b.onclick = ()=>{ quickFilter = (quickFilter===k && k!=="all") ? "all" : k; renderNotes(); };
  });
}

/**
 * Podpis licznika przy nagłówku sekcji.
 *
 * Liczył wyłącznie etykiety. Sekcja złożona z samych zakładek — a taka powstaje
 * po przeniesieniu notatek z OneNote — pokazywała „0", mimo że miała w środku
 * kilkadziesiąt notatek. Teraz liczymy to, co w niej faktycznie jest.
 *
 * @param {Object} s  sekcja
 * @param {number} ileEtykiet
 * @param {number} sumaZEtykiet  notatki widoczne przez etykiety tej sekcji
 */
/**
 * To samo co licznikSekcji, ale pełnymi słowami — dla podpowiedzi pod kursorem
 * i dla czytnika ekranu. Skróty („zakł.", „etyk.", „not.") mieszczą się w wąskiej
 * kolumnie, ale czytnik ekranu wymawia je jako sylaby.
 */
function opisSekcji(s, ileEtykiet, sumaZEtykiet){
  const zakladki = (typeof secTabsFor==="function") ? secTabsFor(s.id) : [];
  const zZakladek = (typeof secTabCount==="function")
    ? zakladki.reduce((a,z)=>a+secTabCount(z.id), 0) : 0;
  const razem = Math.max(sumaZEtykiet, zZakladek);
  const slowo = (n, jedna, kilka, wiele)=>
    n===1 ? jedna : (n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? kilka : wiele);
  const czesci = [];
  if(zakladki.length) czesci.push(zakladki.length+" "+slowo(zakladki.length,"zakładka","zakładki","zakładek"));
  if(ileEtykiet)      czesci.push(ileEtykiet+" "+slowo(ileEtykiet,"etykieta","etykiety","etykiet"));
  czesci.push(razem+" "+slowo(razem,"notatka","notatki","notatek"));
  return czesci.join(" · ");
}
function licznikSekcji(s, sumaZEtykiet){
  const zakladki = (typeof secTabsFor==="function") ? secTabsFor(s.id) : [];
  const zZakladek = (typeof secTabCount==="function")
    ? zakladki.reduce((a,z)=>a+secTabCount(z.id), 0) : 0;
  /* JEDNA LICZBA: notatki. Dokładnie to, co pokazują liczniki w kolumnach Biblia
     i Publikacje — więc liczba w tym samym miejscu znaczy w całej aplikacji to
     samo i nie trzeba się zastanawiać.

     Było tu „3 etyk. · 3": dwie takie same liczby obok siebie, z których druga
     znaczyła coś zupełnie innego niż pierwsza. Rozpisanie ich pełnymi słowami
     („3 etyk. · 3 not.") usunęło zagadkę, ale zabrało 97 z 198 pikseli nagłówka —
     na nazwę sekcji zostawało dwadzieścia i łamała się w środku wyrazu:
     „Zebr / ania". Pełny rozkład jest w podpowiedzi i tam nie zajmuje miejsca
     nikomu. */
  return String(Math.max(sumaZEtykiet, zZakladek) || 0);
}

/* ================= KOLUMNA 1: ZAKŁADKI ================= */
function renderTags(){
  const base = notes.filter(n=>!n.del && noteMatchesBook(n,filt.book) && noteMatchesCh(n) && noteMatchesPub(n,filt.pub) && noteMatchesQuery(n));
  const counts = {}; let untagged=0;
  base.forEach(n=>{ if(!n.tg.length)untagged++; n.tg.forEach(t=>counts[t]=(counts[t]||0)+1); });
  const el = $("tagList");
  /* „Bez etykiety" pokazujemy tylko wtedy, gdy takie notatki istnieją — albo gdy
     ten filtr jest właśnie włączony, bo inaczej nie dałoby się go wyłączyć.
     Pozycja z zerem uczy omijać wzrokiem miejsce, w którym czasem coś jest. */
  let html = tagItem("all","Wszystkie",base.length);
  if(untagged || String(filt.tag)==="none") html += tagItem("none","Bez etykiety",untagged);
  // ——— TEMATY AUTOMATYCZNE ———
  // Wirtualne filtry nie dotykają n.tg. Licznik „not.” liczy unikalne notatki,
  // bo jedna notatka może trafnie pasować do kilku tematów.
  const auto=autoTematyZlicz(base), autoOpen=autoTematyOtwarte();
  html += `<div class="secHead autoHead${autoOpen?"":" closed"}" data-auto-sec="1"
    title="Temat wymaga kilku zgodnych wskazówek albo mocnego trafienia w tytule, etykiecie lub całym zwrocie. Ręczne przypisania pozostają bez zmian.">
    <span class="secArr">${autoOpen?"▾":"▸"}</span>
    <span class="secName">Tematy automatyczne</span>
    <span class="autoBadge">AUTO</span><span class="secCnt">${auto.notatki} not.</span>
    <button class="autoManage" type="button" title="Własne tematy i wykluczenia" aria-label="Ustawienia tematów automatycznych">✦</button></div>`;
  if(autoOpen){
    const widoczne=auto.lista.filter(t=>t.count || String(filt.tag)==="auto:"+t.id);
    if(widoczne.length) widoczne.forEach(t=>{
      html += tagItem("auto:"+t.id,t.name,t.count,false,t.color,true).replace('class="item ','class="item autoTopic ');
    });
    else html += `<div class="secEmpty autoEmpty">Tematy pojawią się, gdy notatka będzie miała kilka zgodnych wskazówek.</div>`;
  }
  // ——— SEKCJE (grupy etykiet) ———
  const secs = sections.slice().sort((a,b)=>(a.ord??0)-(b.ord??0));
  secs.forEach(s=>{
    const inside = tags.filter(t=>t.sec===s.id);
    const sum = inside.reduce((a,t)=>a+(counts[t.id]||0),0);
    // kolor napisu dobierany do tła sekcji — inaczej jasny pastel + biel = nic nie widać
    /* Pasek bierze wybrany kolor w całości — z pastelowej palety wygląda spokojnie,
       a kolor napisu liczy czytelnyTekst(), więc pozostaje czytelny przy każdym odcieniu. */
    const kol = (typeof kolorBezpieczny==="function" && kolorBezpieczny(s.color)) ? s.color : "";
    const sc = kol
      ? ` style="--secBg:${kol};--secLine:${shade(kol,-.28)};`+
        `--secFg:${czytelnyTekst(kol)};--secFg2:${czytelnyTekstSlaby(kol)}"`
      : "";
    const isOpen = s.open === true;
    html += `<div class="secHead${isOpen?"":" closed"}" data-sec="${s.id}"${sc}>
      <span class="secArr">${isOpen?"▾":"▸"}</span>
      <span class="secName">${esc(s.name)}</span>
      <span class="secCnt" title="${esc(opisSekcji(s, inside.length, sum))}">${licznikSekcji(s, sum)}</span>
      <span class="secMore" title="Opcje sekcji">${IC_DOTS}</span></div>`;
    if(isOpen){
      // zakładki sekcji nad etykietami — to one porządkują jej zawartość
      if(typeof secTabRowsHtml==="function") html += secTabRowsHtml(s.id);
      const wZakladkach = typeof secTabsFor==="function"
        ? new Set(secTabsFor(s.id).map(z=>z.id)) : new Set();
      const luzne = inside.filter(t=>!(t.stb && wZakladkach.has(t.stb)));
      const przypisane = inside.filter(t=>t.stb && wZakladkach.has(t.stb));
      if(!inside.length && !(typeof secTabsFor==="function" && secTabsFor(s.id).length))
        html += `<div class="secEmpty">Pusta — dodaj zakładkę przez ⋯ przy nazwie sekcji albo przenieś tu etykiety</div>`;
      // etykiety przypisane do zakładek rysujemy pod swoją zakładką, wcięte
      przypisane.forEach(t=>{
        html += tagItem(t.id,t.name,counts[t.id]||0,true,t.color,true,s.id).replace('class="item ','class="item wZakladce ');
      });
      luzne.forEach(t=>{ html += tagItem(t.id,t.name,counts[t.id]||0,true,t.color,true,s.id); });
    }
  });
  // ——— ETYKIETY POZA SEKCJAMI ———
  const loose = tags.filter(t=>!t.sec || !sections.some(s=>s.id===t.sec));
  html += '<div class="divider">Moje etykiety</div>';
  loose.forEach(t=>{ html += tagItem(t.id,t.name,counts[t.id]||0,true,t.color,false,undefined); });
  // gdy nic się nie zmieniło, nie ruszamy DOM — inaczej gubimy m.in. stan przewijania
  const changed = setHtml(el, html);
  renderPubPanel();
  if(!changed) return;        // ten sam HTML → te same węzły i te same podpięte zdarzenia
  /* Przenoszenie etykiet i zakładek obsługuje 34-chwytanie.js — nasłuchuje na
     dokumencie, więc nie trzeba niczego podpinać po przerysowaniu listy. */
  // obsługa nagłówków sekcji
  const autoHead=el.querySelector(".autoHead");
  if(autoHead) autoHead.onclick=e=>{
    if(e.target.closest(".autoManage")){ otworzAutoTematy(); return; }
    lsSet(KP+"AutoTematyOpen",autoTematyOtwarte()?"0":"1");
    renderTags();
  };
  el.querySelectorAll(".secHead:not(.autoHead)").forEach(h=>{
    const sid=+h.dataset.sec;
    h.onclick = e=>{
      if(e.target.classList.contains("secMore")){ const s=sections.find(x=>x.id===sid); if(s) sectionMenu(e,s); return; }
      toggleSection(sid);
    };
    // upuszczenie etykiety na sekcję (przeciąganie na komputerze)
    h.ondragover = e=>{ if(dragTagId!=null){ e.preventDefault(); h.classList.add("dropTarget"); } };
    h.ondragleave = ()=> h.classList.remove("dropTarget");
    h.ondrop = e=>{ e.preventDefault(); h.classList.remove("dropTarget"); if(dragTagId!=null){ setTagSection(dragTagId, sid); dragTagId=null; } };
  });
  // zakładki sekcji: filtrowanie, menu, przeciąganie kolejności
  el.querySelectorAll(".stbItem").forEach(it=>{
    const id = +it.dataset.stb;
    it.onclick = e=>{
      if(e.target.closest(".more")){
        const z = secTabs.find(x=>x.id===id);
        if(z) secTabMenu(e, z);
        return;
      }
      if(e.target.closest(".dragOrd")) return;
      wlaczZawezenieWynikow();
      filt.tag = String(filt.tag)==="stb:"+id ? "all" : "stb:"+id;
      persistFilt(); renderAll();
      if(innerWidth<=900) mobileShow("colNotes");
    };
    /* Upuszczenie etykiety na zakładkę przypisuje ją do niej — tak samo jak
       upuszczenie etykiety na nagłówek sekcji przenosi ją do sekcji. */
    it.ondragover = e=>{ if(dragTagId!=null){ e.preventDefault(); it.classList.add("dropTarget"); } };
    it.ondragleave = ()=> it.classList.remove("dropTarget");
    it.ondrop = e=>{
      e.preventDefault(); it.classList.remove("dropTarget");
      if(dragTagId!=null){
        const t = tags.find(x=>x.id===dragTagId);
        if(t) setTagSecTab(t, id);
        dragTagId = null;
      }
    };
  });
  el.querySelectorAll(".item").forEach(it=>{
    if(it.classList.contains("stbItem")) return;   // zakładki mają własną obsługę
    it.onclick = e=>{
      if(e.target.classList.contains("more")){
        const t = tags.find(x=>x.id===+it.dataset.k);
        if(t) tagMenu(e, t);
        return;
      }
      const key=it.dataset.k;
      const tagId = key==="all"?"all":key==="none"?"none":key.indexOf("auto:")===0?key:+key;
      if(typeof centrumSchowaj==="function") centrumSchowaj();
      if(tagId!=="all" && tagId!=="none"){
        const maWogole = notes.some(n=>!n.del && noteMatchesTag(n, tagId));
        const maWBiezacym = notes.some(n=>!n.del && noteMatchesTag(n, tagId) && noteMatchesBook(n, filt.book) && noteMatchesCh(n) && noteMatchesPub(n, filt.pub) && (!query || noteMatchesQuery(n)));
        if(maWogole && !maWBiezacym){
          filt.book="all"; filt.ch=null; filt.pub="all";
          if(typeof expandedBook!=="undefined") expandedBook=null;
          if(query){ query=""; if($("search")) $("search").value=""; }
          if(typeof quickFilter!=="undefined") quickFilter="all";
        }
      }
      wlaczZawezenieWynikow();
      filt.tag = tagId;
      persistFilt(); renderAll();
      if(typeof mobileShow==="function") mobileShow("colNotes");
    };
    if(it.dataset.droppable){
      // przeciąganie etykiety do sekcji
      it.draggable = true;
      it.ondragstart = e=>{ dragTagId = +it.dataset.k; e.dataTransfer.effectAllowed="move"; };
      it.ondragend = ()=>{ dragTagId = null; };
      it.ondragover = e=>{ e.preventDefault(); it.classList.add("dropTarget"); };
      it.ondragleave = ()=> it.classList.remove("dropTarget");
      it.ondrop = e=>{ e.preventDefault(); it.classList.remove("dropTarget"); if(dragTagId==null) dropOnTag(e, +it.dataset.k); };
    }
  });
}
$("autoAddRule").onclick=()=>autoTematEdytuj();
$("autoResetEx").onclick=autoTematyPrzywroc;
$("autoTematyLista").onclick=e=>{
  const edit=e.target.closest("[data-auto-edit]"), del=e.target.closest("[data-auto-del]");
  if(edit) autoTematEdytuj(edit.dataset.autoEdit);
  else if(del) autoTematUsun(del.dataset.autoDel);
};
let dragTagId = null;
/* ================= SEKCJE ETYKIET =================
   Sekcja grupuje etykiety (np. „Kongresy" → Kongres 2019, 2020…).
   Etykieta należy do sekcji przez pole t.sec (id sekcji). */
let sections = [];
function saveSections(){ if(idb) idbPut("meta", sections, "sections").catch(e=>reportSaveError(e,"sekcje")); }
function nextSecId(){ return nastepnyNumer(sections); }
async function createSection(){
  const name = await askText({title:"Nowa sekcja", placeholder:"np. Kongresy", okLabel:"Utwórz",
    hint:"Sekcja grupuje etykiety — potem przeniesiesz je przez menu ⋯ przy etykiecie."});
  if(!name || !name.trim()) return;
  const nm=name.trim();
  if(sections.some(s=>s.name===nm)){ toast("Sekcja o tej nazwie już istnieje"); return; }
  sections.push({id:nextSecId(), name:nm, ord:sections.length, open:true});
  saveSections(); renderTags();
  toast("Utworzono sekcję „"+nm+"”");
}
function toggleSection(id){
  const s=sections.find(x=>x.id===id); if(!s) return;
  s.open = !s.open; saveSections(); renderTags();
}
async function renameSection(id){
  const s=sections.find(x=>x.id===id); if(!s) return;
  const name = await askText({title:"Zmień nazwę sekcji", value:s.name, okLabel:"Zapisz"});
  if(!name || !name.trim()) return;
  s.name=name.trim(); saveSections(); renderTags(); toast("Zmieniono nazwę sekcji");
}
async function deleteSection(id){
  const s=sections.find(x=>x.id===id); if(!s) return;
  const inside = tags.filter(t=>t.sec===id).length;
  if(!(await askConfirm("Usunąć sekcję?", "Sekcja „"+esc(s.name)+"”."+(inside?"<br><br>Etykiety ("+inside+") NIE zostaną usunięte — wrócą do listy „Moje etykiety”.":""), {okLabel:"Usuń sekcję", danger:true}))) return;
  tags.forEach(t=>{ if(t.sec===id) delete t.sec; });
  sections = sections.filter(x=>x.id!==id);
  saveSections(); saveTags(); renderTags(); toast("Usunięto sekcję");
}
function moveSection(id, dir){
  sections.forEach((s,i)=>{ if(s.ord===undefined) s.ord=i; });
  sections.sort((a,b)=>a.ord-b.ord);
  const i=sections.findIndex(s=>s.id===id); if(i<0) return;
  const j=i+dir; if(j<0||j>=sections.length) return;
  const t=sections[i].ord; sections[i].ord=sections[j].ord; sections[j].ord=t;
  sections.sort((a,b)=>a.ord-b.ord);
  saveSections(); renderTags();
}
function setTagSection(tagId, secId){
  const t=tags.find(x=>x.id===tagId); if(!t) return;
  if(secId===null) delete t.sec; else t.sec=secId;
  saveTags(); renderTags();
  toast(secId===null ? "Etykieta poza sekcjami" : ("Przeniesiono do sekcji „"+(sections.find(s=>s.id===secId)||{}).name+"”"));
}
function sectionMenu(e, s){
  const dd=$("dropdown");
  const upI=_svg('<path d="M12 19V5M6 11l6-6 6 6"/>'), downI=_svg('<path d="M12 5v14M6 13l6 6 6-6"/>');
  const inside=tags.filter(t=>t.sec===s.id).length;
  const spal = c => {
    const sel = (c||"") === (s.color||"");
    return `<span class="pal ${c?"":"pal-none"} ${sel?"sel":""}" data-sc="${c||""}" style="${c?`background:${c}`:""}" title="${c||"Domyślny (zielony)"}">${c?"":"✕"}</span>`;
  };
  dd.innerHTML =
    `<div class="dd-lbl">Sekcja „${esc(s.name)}”${inside?" · "+inside+" etykiet":""}</div>
     <div data-sm="ren">${ICO.edit}Zmień nazwę</div>
     <div data-sm="tab">${ICO.plus}Nowa zakładka w tej sekcji</div>
     <div class="dd-lbl">Kolor paska sekcji</div>
     <div class="palrow">${spal("")}${SECCOLORS.map(c=>spal(c)).join("")}</div>
     <div class="dd-sep"></div>
     <div data-sm="up">${upI}Przesuń w górę</div>
     <div data-sm="down">${downI}Przesuń w dół</div>
     <div class="dd-sep"></div>
     <div data-sm="eksport">${ICO.copy}Eksportuj / Wyślij sekcję…</div>
     <div class="dd-sep"></div>
     <div data-sm="del" class="dd-danger">${ICO.trash}Usuń sekcję</div>`;
  dd.style.display="block";
  placeDropdown(dd, e.target);
  dd.onclick=ev=>{
    if(ev.target.dataset.sc!==undefined){
      s.color = ev.target.dataset.sc || undefined;
      saveSections(); dd.style.display="none"; renderTags(); return;
    }
    const m=ev.target.closest("[data-sm]"); if(!m) return;
    dd.style.display="none";
    const a=m.dataset.sm;
    if(a==="ren") renameSection(s.id);
    else if(a==="tab") createSecTab(s.id);
    else if(a==="up") moveSection(s.id,-1);
    else if(a==="down") moveSection(s.id,1);
    else if(a==="eksport") eksportujSekcje(s.id);
    else if(a==="del") deleteSection(s.id);
  };
}
/* kolory pasków sekcji — nasycone, dobrze widoczne z białym tekstem */
/* Kolory pasków sekcji. Wcześniej były to nasycone, ciemne barwy, które na tle jasnych
   kafelków biły po oczach. Teraz to pastele — pasek może więc brać kolor w całości,
   a mimo to nie przytłacza kolumny. Napis na pasku i tak dobiera czytelnyTekst(). */
const SECCOLORS = ["#cfe3d6","#cfdcea","#dcd4ea","#f0dcc6","#eed6dd","#cfe4e2","#e6e2c6","#dcdfe4","#ecd4d4"];
/* Pastele: na tyle nasycone, żeby dało się je od siebie odróżnić, i na tyle jasne,
   żeby ciemny tekst czytało się na nich bez wysiłku. Kolor napisu i tak liczy
   czytelnyTekst(), więc dobór barwy nie decyduje już o czytelności. */
const TAGCOLORS = ["#e8c86a","#dcb08a","#e0a89a","#c9b6d8","#a9c4e4","#9fd0c7","#b6d9a8","#efb7c4","#c2c8d0"];
/* pastelowe kompozycje: jeden zgrany odcień na całą kompozycję kolumn i belek */
const PASTELS = [["Lawenda","#b9a9d6"],["Mięta","#9ed3c2"],["Brzoskwinia","#e8b894"],["Błękit","#a6c3e0"],["Róż","#e2adc0"],["Piasek","#dccfae"],["Szałwia","#b7c9a8"],["Grafit","#b9bec6"]];
/**
 * Gotowa kompozycja — jeden kolor na CAŁY interfejs.
 *
 * Pasek górny był dotąd na stałe butelkowo-zielony, bo brał kolor ze zmiennej
 * --accent ustawianej w arkuszu stylów. Kompozycja podmienia teraz także ją,
 * więc pasek, przyciski i podświetlenie wybranej pozycji idą za wybranym kolorem.
 *
 * Kolumna Publikacje doszła później niż ta funkcja i nie była kolorowana —
 * teraz jest.
 *
 * @param {string} c  kolor kompozycji albo "reset"
 */
function applyPreset(c){
  let cfg;
  if(c==="reset") cfg={};
  else cfg={colBooks:c, colTags:c, colPubs:c, colNotes:c, nhead:c, ui:c};
  try{ localStorage.setItem(KP+"Colors", JSON.stringify(cfg)); }catch(e){}
  applyColors();
}
/** Kolor bieżącej kompozycji albo pusty napis. */
function biezacaKompozycja(){
  try{ return (JSON.parse(localStorage.getItem(KP+"Colors")||"{}").ui) || ""; }
  catch(e){ return ""; }
}
function shade(hex,f){
  const n=parseInt(hex.slice(1),16); let r=n>>16,g=(n>>8)&255,b=n&255;
  const t=f<0?0:255, p=Math.abs(f);
  r=Math.round(r+(t-r)*p); g=Math.round(g+(t-g)*p); b=Math.round(b+(t-b)*p);
  return "#"+((r<<16|g<<8|b).toString(16).padStart(6,"0"));
}
