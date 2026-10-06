/* ==========================================================================
   JW Study — reader.js
   Czytnik: spis treści, szukanie w notatce, panel Aa
   ========================================================================== */
"use strict";
/* ================= NOTATKA NA PEŁNYM EKRANIE ================= */
let fsGuid = null;
let fsNavList = [];
/* ——— ŚLAD, PO KTÓRYM DA SIĘ WRÓCIĆ ———

   Powiązane notatki otwierają się w TYM SAMYM czytniku: fsGuid zmienia wartość,
   a poprzednia notatka przestaje istnieć dla aplikacji. Kto wszedł z notatki A
   w powiązaną B, przeczytał ją i nacisnął ✕, wracał na listę — do A trzeba było
   dojść od nowa, a przy kilku tysiącach notatek to nie drobiazg. Zniechęca do
   korzystania z powiązań, czyli do jedynej rzeczy w tej aplikacji, która
   przypomina o tym, czego nikt nie szukał.

   Ślad trzyma odwiedzone notatki w kolejności wchodzenia. Rośnie tylko przy
   SKOKACH (powiązana notatka, odnośnik) — nie przy przeglądaniu strzałkami
   w przód i w tył, bo tam ruch jest liniowy i strzałka wstecz już istnieje.
   Zamknięcie czytnika ślad kasuje: wchodząc z listy na nowo, nie ma dokąd wracać. */
let fsSlad = [];
const FS_SLAD_MAX = 30;        // dłuższego nikt nie przejdzie palcem, a pamięć ma swój koszt
let fsListDirty = false;
/* Ustawienia dotyczą wyłącznie czytnika. „app” znaczy: odziedzicz wygląd
   aplikacji; pozostałe warianty nie zmieniają globalnego themeMode. */
const READER_THEME_KEY = KP+"ReaderTheme";
const READER_SWIPE_KEY = KP+"ReaderSwipe";
const READER_FOCUS_KEY = KP+"ReaderFocus";
const READER_WAKE_KEY = KP+"ReaderWake";
let readerTheme = lsGet(READER_THEME_KEY,"app");
if(!["app","light","sepia","dark"].includes(readerTheme)) readerTheme="app";
let readerSwipe = lsGet(READER_SWIPE_KEY,"0")==="1";
let readerFocus = lsGet(READER_FOCUS_KEY,"1")!=="0";
let readerWake = lsGet(READER_WAKE_KEY,"0")==="1";

function applyReaderTheme(){
  const modal=$("modalFs"); if(!modal) return;
  modal.dataset.readerTheme=readerTheme;
}
/**
 * Otwiera notatkę na pełnym ekranie (czytnik): typografia do czytania, spis treści
 * z nagłówków, szukanie w notatce, pasek postępu i zapamiętane miejsce czytania.
 * @param {Note} n
 */
function openFs(n){
  // jeśli notatka jest właśnie edytowana — zapisz treść (ze zdjęciami), zanim przerysujemy pełny ekran
  const ec = document.querySelector('.ncard.editing[data-g="'+n.g+'"] .ncontent');
  if(ec) commitLiveEdit(ec);
  /* Skok z otwartej notatki do innej zostawia ślad. Otwarcie z listy zaczyna
     od nowa — inaczej ✕ z pierwszej notatki cofałoby do czegoś, czego
     użytkownik w tej sesji czytania nie widział. */
  const juzOtwarty = !!fsGuid && $("modalFs").classList.contains("show");
  if(juzOtwarty && fsGuid !== n.g){
    saveReadPos();                       // wracając, ma wrócić w to samo miejsce tekstu
    fsSlad.push(fsGuid);
    if(fsSlad.length > FS_SLAD_MAX) fsSlad.shift();
  } else if(!juzOtwarty){
    fsSlad.length = 0;
  }
  fsGuid = n.g;
  $("modalFs").classList.remove("dok-schowany","pow-open");
  document.body.classList.add("fs-open");
  applyReaderTheme();
  renderFs(); openModal("modalFs");
  acquireWake(); updateFsNav();
  if(typeof updateFsFullBtn==="function") updateFsFullBtn();
  const fm=$("modalFs").querySelector(".fsmodal"); if(fm) fm.scrollTop=0;
  updateFsProgress();
}
function selectNote(guid){
  if(!guid) return;
  const n = (typeof notes !== "undefined" && Array.isArray(notes)) ? notes.find(x=>x.g===guid && !x.del) : null;
  if(!n){
    if(typeof toast === "function") toast("Tej notatki już nie ma");
    return;
  }
  if(typeof touchAccess === "function") touchAccess(n);
  if(typeof openFs === "function") openFs(n);
}
function renderFs(){
  const n = notes.find(x=>x.g===fsGuid);
  if(!n || n.del){ closeFs(); return; }
  const w = $("fsWrap");
  w.innerHTML = "";
  const card = noteCard(n);
  card.querySelector('[data-act="fs"]')?.remove(); // bez przycisku pełnego ekranu w pełnym ekranie
  // przycisk zamknięcia WEWNĄTRZ zielonej belki (pewne umiejscowienie w prawym rogu)
  const nh = card.querySelector(".nhead");
  if(nh){
    const x = document.createElement("button");
    x.className = "fsCloseInline"; x.type="button"; x.setAttribute("aria-label","Zamknij"); x.textContent = "✕"; x.title = "Zamknij";
    x.onclick = closeFs;
    nh.appendChild(x);
    /* Strzałka powrotu pokazuje się DOPIERO wtedy, gdy jest gdzie wracać.
       Wyjście zawsze widoczne, ale nieczynne, uczy go nie próbować. W podpowiedzi
       stoi tytuł notatki, do której prowadzi — żeby nie trzeba było naciskać,
       aby się dowiedzieć. */
    if(fsSlad.length){
      const skad = notes.find(y=>y.g===fsSlad[fsSlad.length-1]);
      const opis = "Wróć do: " + ((skad && (skad.t||"").trim()) ||
        (skad && typeof refLabel==="function" ? refLabel(skad) : "") || "poprzedniej notatki");
      const b = document.createElement("button");
      b.className = "fsBackInline"; b.type = "button";
      b.setAttribute("aria-label", opis); b.title = opis;
      b.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
      b.onclick = fsWroc;
      nh.insertBefore(b, nh.firstChild);
    }
  }
  // jeden przycisk „Aa" — ustawienia czytania (rozmiar, interlinia, szerokość, czcionka, tło)
  const br = card.querySelector(".btnrow");
  if(br){
    const aa = document.createElement("button");
    aa.className = "sbtn ico"; aa.type="button"; aa.dataset.readbtn="1";
    aa.title = "Ustawienia czytania: rozmiar, interlinia, szerokość, czcionka, tło";
    aa.innerHTML = '<span style="font-weight:800;font-size:15px;letter-spacing:.5px">Aa</span>';
    aa.addEventListener("pointerdown", e=>{ e.preventDefault(); openReadPop(aa); });
    br.appendChild(aa);
  }
  const moreBtn = card.querySelector('.more-btn, [data-act="more"]');
  if(moreBtn){
    const otworz = e=>{
      e.preventDefault();
      e.stopPropagation();
      otworzMenuNotatki(moreBtn, n, card);
    };
    moreBtn.addEventListener("pointerdown", otworz);
    moreBtn.addEventListener("click", otworz);
  }
  /* Powiązane notatki pod treścią — to miejsce na przypomnienie, którego nikt
     nie szukał, więc nie może zasłaniać tego, po co się notatkę otworzyło. */
  if(typeof htmlPowiazanych==="function"){
    const pow = htmlPowiazanych(n);
    if(pow){
      const box = document.createElement("div");
      box.innerHTML = pow;
      card.appendChild(box.firstElementChild);
    }
  }
  // pasek czytnika: licznik, postęp, spis, szukanie i zakładki wewnętrzne
  const cont = card.querySelector(".ncontent");
  if(cont){
    const bar = document.createElement("div"); bar.className="fsBar";
    const st = readStats(cont);
    bar.innerHTML = `<span class="fsStat">${st.words} słów · ok. ${st.mins} min czytania</span>
      <span class="fsPct" title="Postęp czytania">0%</span>
      <span class="fsBarSp"></span>
      <button class="fsBarBtn" data-fsb="toc" title="Spis treści (nagłówki)">${ICO.ul} Spis</button>
      <button class="fsBarBtn" data-fsb="find" title="Znajdź w notatce">${ICO.search} Znajdź</button>
      <button class="fsBarBtn" data-fsb="marks" title="Zakładki wewnątrz tej notatki">☆ Zakładki <span data-fmark-count>${readerMarks(n).length}</span></button>`;
    card.insertBefore(bar, cont);
    // panel wyszukiwania w notatce
    const fbox = document.createElement("div"); fbox.className="fsFind"; fbox.style.display="none";
    fbox.innerHTML = `<input type="search" class="fsFindInp" placeholder="Szukaj w tej notatce…" autocomplete="off">
      <span class="fsFindCnt">0/0</span>
      <button class="fsFindBtn" data-ff="prev" title="Poprzednie">↑</button>
      <button class="fsFindBtn" data-ff="next" title="Następne">↓</button>
      <button class="fsFindBtn" data-ff="close" title="Zamknij">✕</button>`;
    card.insertBefore(fbox, cont);
    // spis treści
    const toc = document.createElement("div"); toc.className="fsToc"; toc.style.display="none";
    card.insertBefore(toc, cont);
    // zakładki zapisują procent i krótki fragment, więc po zmianie układu nadal
    // można znaleźć właściwe miejsce po tekście, a dopiero potem po procencie.
    const marks = document.createElement("div"); marks.className="fsMarks"; marks.style.display="none";
    card.insertBefore(marks, cont);
    renderFsMarks(n, cont, marks);
    bar.addEventListener("click", e=>{
      const b=e.target.closest("[data-fsb]"); if(!b) return;
      if(b.dataset.fsb==="find"){
        toc.style.display="none"; marks.style.display="none";
        const on=fbox.style.display==="none"; fbox.style.display=on?"flex":"none";
        if(on) setTimeout(()=>fbox.querySelector(".fsFindInp").focus(),40); else clearFsFind(cont);
      }else if(b.dataset.fsb==="marks"){
        fbox.style.display="none"; clearFsFind(cont); toc.style.display="none";
        renderFsMarks(n,cont,marks); marks.style.display=marks.style.display==="none"?"block":"none";
      }else{
        fbox.style.display="none"; clearFsFind(cont); marks.style.display="none";
        buildToc(cont,toc); toc.style.display = toc.style.display==="none"?"block":"none";
      }
    });
    fbox.addEventListener("input", e=>{ if(e.target.classList.contains("fsFindInp")) runFsFind(cont, e.target.value, fbox); });
    fbox.addEventListener("click", e=>{
      const b=e.target.closest("[data-ff]"); if(!b) return;
      if(b.dataset.ff==="close"){ fbox.style.display="none"; clearFsFind(cont); return; }
      stepFsFind(cont, b.dataset.ff==="next"?1:-1, fbox);
    });
    fbox.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); stepFsFind(cont, e.shiftKey?-1:1, fbox); } else if(e.key==="Escape"){ fbox.style.display="none"; clearFsFind(cont); } });
    marks.addEventListener("click", e=>{
      const add=e.target.closest("[data-fm-add]");
      if(add){ addReaderMark(n,cont,marks); return; }
      const del=e.target.closest("[data-fm-del]");
      if(del){ deleteReaderMark(n,del.dataset.fmDel,cont,marks); return; }
      const go=e.target.closest("[data-fm-go]");
      if(go){ goReaderMark(n,go.dataset.fmGo,cont); marks.style.display="none"; }
    });
  }
  w.appendChild(card);
  $("modalFs")?.classList.toggle("pow-open",!!card.querySelector("details.powiazane[open]"));
  _progLast=-1;
  updateFsProgress(); updateFsNav();
  restoreReadPos(n.g);
  zmierzNhead();
}
/**
 * Podaje wysokość przyklejonej belki tytułu w zmiennej --nheadH.
 * Dzięki temu pasek narzędzi edycji przykleja się PONIŻEJ belki,
 * zamiast lądować na niej (obie miały wcześniej top:0).
 */
function zmierzNhead(){
  const belka = document.querySelector("#fsWrap .nhead");
  /* W trybie edycji belka nie jest już przyklejona — pasek narzędzi trzyma się
     samej krawędzi, więc żadnej rezerwy nie potrzebuje. */
  const wEdycji = !!document.querySelector("#fsWrap .ncard.editing");
  const wys = (belka && !wEdycji) ? Math.round(belka.getBoundingClientRect().height) : 0;
  document.documentElement.style.setProperty("--nheadH", wys + "px");
  pilnujNhead(belka);
}
/* Wysokość belki zmienia się sama: przy łamaniu tytułu, zmianie wielkości pisma
   albo szerokości okna. ResizeObserver łapie każdy taki przypadek — samo
   nasłuchiwanie na zmianę rozmiaru okna to za mało. */
let _obsNhead = null, _pilnowana = null;
function pilnujNhead(belka){
  if(!belka || belka === _pilnowana) return;
  if(typeof ResizeObserver === "undefined") return;
  if(!_obsNhead) _obsNhead = new ResizeObserver(()=>{ if(fsGuid) zmierzNhead(); });
  if(_pilnowana) _obsNhead.unobserve(_pilnowana);
  _obsNhead.observe(belka);
  _pilnowana = belka;
}
addEventListener("resize", ()=>{ if(fsGuid) zmierzNhead(); });

/* ===== licznik słów i czasu czytania ===== */
function readStats(el){
  const txt=(el.textContent||"").trim();
  const words = txt ? (txt.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)||[]).length : 0;
  return {words, mins: Math.max(1, Math.round(words/200))};
}
/* ===== zakładki wewnątrz notatki ===== */
function readerMarks(n){
  if(!n) return [];
  if(!Array.isArray(n.rb)) n.rb=[];
  return n.rb;
}
function readerMarkPlace(cont){
  const fm=$("modalFs").querySelector(".fsmodal");
  if(!fm) return {pct:0,label:"Początek notatki",quote:""};
  const max=Math.max(0,fm.scrollHeight-fm.clientHeight);
  const pct=max ? Math.max(0,Math.min(100,Math.round(fm.scrollTop/max*100))) : 0;
  const y=Math.max(44,(document.querySelector("#fsWrap .nhead")?.getBoundingClientRect().bottom||0)+12);
  const bloki=[...cont.querySelectorAll("h2,h3,p,li,blockquote,div")]
    .filter(el=>el.textContent && el.textContent.trim() && !el.closest(".footnotes"));
  let cel=bloki[0]||cont;
  for(const el of bloki){ if(el.getBoundingClientRect().top<=y) cel=el; else break; }
  const quote=(cel.textContent||"").replace(/\s+/g," ").trim().slice(0,100);
  let head=cel.matches("h2,h3")?cel:null, p=cel.previousElementSibling;
  while(!head && p){ if(p.matches("h2,h3")){head=p;break;} p=p.previousElementSibling; }
  const label=(head?.textContent||quote||("Miejsce "+pct+"%" )).replace(/\s+/g," ").trim().slice(0,72);
  return {pct,label,quote};
}
function storeReaderMarks(n){
  n.rb=readerMarks(n).slice(-80);
  saveNote(n); if(typeof bumpDirty==="function") bumpDirty();
  fsListDirty=true;
}
function renderFsMarks(n,cont,box){
  const lista=readerMarks(n).slice().sort((a,b)=>(+a.pct||0)-(+b.pct||0));
  box.innerHTML=`<div class="fsMarksHead"><b>Zakładki w tej notatce</b><button type="button" class="fsMarksAdd" data-fm-add="1">＋ Dodaj tutaj</button></div>`+
    (lista.length ? lista.map(m=>`<div class="fsMark"><span class="fsMarkPct">${Math.round(+m.pct||0)}%</span>`+
      `<button type="button" class="fsMarkGo" data-fm-go="${esc(m.id)}"><b>${esc(m.label||"Zakładka")}</b><span>${esc(m.quote||"")}</span></button>`+
      `<button type="button" class="fsMarkDel" data-fm-del="${esc(m.id)}" title="Usuń zakładkę" aria-label="Usuń zakładkę">×</button></div>`).join("")
      : `<div class="fsTocEmpty">Nie ma jeszcze zakładek. Przewiń tekst i wybierz „Dodaj tutaj”.</div>`);
  const licznik=document.querySelector("#fsWrap [data-fmark-count]"); if(licznik) licznik.textContent=lista.length;
}
function addReaderMark(n,cont,box){
  const m=readerMarkPlace(cont);
  const blisko=readerMarks(n).find(x=>Math.abs((+x.pct||0)-m.pct)<2 && x.quote===m.quote);
  if(blisko){ toast("W tym miejscu jest już zakładka"); return; }
  readerMarks(n).push({id:"rb_"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),pct:m.pct,label:m.label,quote:m.quote,ts:new Date().toISOString()});
  storeReaderMarks(n); renderFsMarks(n,cont,box); toastOk("Dodano zakładkę w notatce");
}
function deleteReaderMark(n,id,cont,box){
  n.rb=readerMarks(n).filter(x=>x.id!==id); storeReaderMarks(n); renderFsMarks(n,cont,box); toast("Usunięto zakładkę");
}
function goReaderMark(n,id,cont){
  const m=readerMarks(n).find(x=>x.id===id); if(!m) return;
  const nq=norm(m.quote||"").slice(0,48);
  let cel=null;
  if(nq) cel=[...cont.querySelectorAll("h2,h3,p,li,blockquote,div")].find(el=>norm(el.textContent||"").includes(nq));
  if(cel){ cel.scrollIntoView({behavior:"smooth",block:"start"}); cel.classList.add("tocFlash"); setTimeout(()=>cel.classList.remove("tocFlash"),1200); }
  else{
    const fm=$("modalFs").querySelector(".fsmodal"), max=fm?fm.scrollHeight-fm.clientHeight:0;
    if(fm) fm.scrollTo({top:max*Math.max(0,Math.min(100,+m.pct||0))/100,behavior:"smooth"});
  }
}
/* ===== spis treści z nagłówków ===== */
function buildToc(cont, toc){
  const hs=[...cont.querySelectorAll("h2,h3")];
  if(!hs.length){ toc.innerHTML=`<div class="fsTocEmpty">Ta notatka nie ma nagłówków. Dodaj je w edycji: „Tytuł” lub „Nagłówek”.</div>`; return; }
  toc.innerHTML="";
  hs.forEach((h,i)=>{
    if(!h.id) h.id="h_"+i;
    const a=document.createElement("div");
    a.className="fsTocItem"+(h.tagName==="H3"?" sub":"");
    a.textContent=h.textContent||("Sekcja "+(i+1));
    a.onclick=()=>{ h.scrollIntoView({behavior:"smooth",block:"start"}); h.classList.add("tocFlash"); setTimeout(()=>h.classList.remove("tocFlash"),1200); };
    toc.appendChild(a);
  });
}
/* ===== znajdź w notatce ===== */
let fsFindHits=[], fsFindIdx=-1;
function clearFsFind(cont){
  cont.querySelectorAll("mark.fsHit").forEach(m=>{ const t=document.createTextNode(m.textContent); m.replaceWith(t); });
  cont.normalize(); fsFindHits=[]; fsFindIdx=-1;
}
function runFsFind(cont, q, box){
  clearFsFind(cont);
  const cnt=box.querySelector(".fsFindCnt");
  q=(q||"").trim();
  if(q.length<2){ cnt.textContent="0/0"; return; }
  const nq=norm(q);
  const walker=document.createTreeWalker(cont, NodeFilter.SHOW_TEXT, {
    acceptNode(nd){ if(!nd.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      let p=nd.parentNode; while(p&&p!==cont){ if(p.tagName==="SCRIPT"||p.tagName==="STYLE") return NodeFilter.FILTER_REJECT; p=p.parentNode; }
      return NodeFilter.FILTER_ACCEPT; }
  });
  const targets=[]; let t; while(t=walker.nextNode()) targets.push(t);
  targets.forEach(node=>{
    const text=node.nodeValue, nt=norm(text);
    let idx=nt.indexOf(nq), from=0; if(idx<0) return;
    const frag=document.createDocumentFragment(); let last=0;
    while(idx>=0){
      if(idx>last) frag.appendChild(document.createTextNode(text.slice(last,idx)));
      const m=document.createElement("mark"); m.className="fsHit"; m.textContent=text.slice(idx, idx+q.length);
      frag.appendChild(m); last=idx+q.length;
      idx=nt.indexOf(nq, last);
    }
    if(last<text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag,node);
  });
  fsFindHits=[...cont.querySelectorAll("mark.fsHit")];
  fsFindIdx = fsFindHits.length?0:-1;
  markCurrentHit(box);
}
function markCurrentHit(box){
  fsFindHits.forEach((m,i)=>m.classList.toggle("cur", i===fsFindIdx));
  const cnt=box.querySelector(".fsFindCnt");
  cnt.textContent = fsFindHits.length ? (fsFindIdx+1)+"/"+fsFindHits.length : "0/0";
  if(fsFindIdx>=0) fsFindHits[fsFindIdx].scrollIntoView({behavior:"smooth",block:"center"});
}
function stepFsFind(cont, dir, box){
  if(!fsFindHits.length) return;
  fsFindIdx=(fsFindIdx+dir+fsFindHits.length)%fsFindHits.length;
  markCurrentHit(box);
}
/* ===== zapamiętane miejsce czytania ===== */
const READPOS_KEY = KP+"ReadPos";
/* ILE PRZECZYTANE — osobny zapis, obok miejsca czytania.
   W ReadPos leży przewinięcie w pikselach i tak musi zostać: restoreReadPos()
   ustawia dokładnie tę liczbę i zmiana kształtu zapisu zepsułaby powrót
   w notatkach zapisanych wcześniej. Ułamek („ile z notatki za mną") wymaga
   jeszcze wysokości treści, której w pikselach nie widać — więc jedzie
   w drugim kluczu. Stara wersja aplikacji go nie zna i po prostu pomija. */
const READFRAC_KEY = KP+"ReadFrac";
function readPosAll(){ try{ return JSON.parse(localStorage.getItem(READPOS_KEY)||"{}"); }catch(e){ return {}; } }
function readFracAll(){ try{ return JSON.parse(localStorage.getItem(READFRAC_KEY)||"{}"); }catch(e){ return {}; } }
/**
 * Zapamiętuje miejsce czytania notatki. Zapis jest odroczony, bo przewijanie
 * potrafi wołać tę funkcję dziesiątki razy na sekundę.
 */
function saveReadPos(){
  if(!fsGuid) return;
  const fm=$("modalFs").querySelector(".fsmodal"); if(!fm) return;
  const max=fm.scrollHeight-fm.clientHeight;
  const all=readPosAll(), fr=readFracAll();
  if(max>200 && fm.scrollTop>60){
    all[fsGuid]=Math.round(fm.scrollTop);
    fr[fsGuid]=Math.max(1, Math.min(100, Math.round(fm.scrollTop / max * 100)));
  }else{
    delete all[fsGuid];
    /* Notatka przewinięta na sam dół nie ma już „miejsca, gdzie skończyłem",
       ale ma wynik: przeczytana w całości. Kasowanie ułamka razem z pozycją
       zabierałoby pasek postępu dokładnie tym notatkom, które są skończone. */
    if(max>200 && fm.scrollTop>=max-8) fr[fsGuid]=100;
    else delete fr[fsGuid];
  }
  const keys=Object.keys(all); if(keys.length>60) delete all[keys[0]];
  const kf=Object.keys(fr); if(kf.length>120) delete fr[kf[0]];
  lsSetSoon(READPOS_KEY, JSON.stringify(all), 400);   // przewijanie potrafi wołać to dziesiątki razy
  lsSetSoon(READFRAC_KEY, JSON.stringify(fr), 400);
}
function restoreReadPos(g){
  const pos=readPosAll()[g], frac=readFracAll()[g]; if(!pos && !frac) return;
  const fm=$("modalFs").querySelector(".fsmodal"); if(!fm) return;
  setTimeout(()=>{
    const max=fm.scrollHeight-fm.clientHeight;
    /* Po zmianie rozmiaru pisma, szerokości albo treści stary piksel może już
       nie istnieć. Wtedy wracamy po procencie, zamiast rezygnować z powrotu. */
    fm.scrollTop=(pos && pos<=max) ? pos : max*Math.max(0,Math.min(100,+frac||0))/100;
    updateFsProgress();
    toast("Wrócono do miejsca, gdzie skończyłeś");
  }, 80);
}
/**
 * Krok wstecz po śladzie. Gdy śladu nie ma — zamyka czytnik, czyli robi to,
 * czego użytkownik oczekuje od jedynego wyjścia.
 *
 * Notatka ze śladu mogła w międzyczasie wylądować w koszu. Wtedy cofamy się
 * dalej, zamiast pokazywać pustą stronę albo zamykać czytnik bez powodu.
 */
function fsWroc(){
  if(!fsSlad.length){ closeFs(); return; }
  saveReadPos();
  const g = fsSlad.pop();
  const n = notes.find(x=>x.g===g && !x.del);
  if(!n){ fsWroc(); return; }
  fsGuid = g; renderFs(); updateFsNav(); updateFsProgress();
}
/* ——— POWRÓT NA WŁAŚCIWE MIEJSCE LISTY ———

   Samo przewinięcie listy zamknięcie czytnika zachowuje — lista jest pod spodem
   i nikt jej nie przewija. Gubi się co innego: WIEDZA, KTÓRA TO BYŁA NOTATKA.
   Po przeczytaniu trzech powiązanych notatek ✕ oddaje ścianę kart, na której
   nic nie mówi „tu byłeś". Przy dwóch tysiącach notatek szukanie własnego
   miejsca zaczyna się od nowa.

   Dlatego po zamknięciu wskazujemy kartę, z której czytanie się zaczęło:
   przewijamy do niej, jeśli wypadła z widoku, i podświetlamy ją na chwilę.

   Która to karta:
     • ślad NIEPUSTY — czyli były skoki po powiązanych — wracamy do notatki,
       Z KTÓREJ wyszliśmy z listy, czyli do fsSlad[0]. Notatka, na której
       czytanie się skończyło, mogła w ogóle nie być na liście (inny filtr).
     • ślad PUSTY — wracamy do notatki otwartej w czytniku. Mogła się zmienić
       przez strzałki ‹ ›, ale wtedy nadal jest to ruch PO LIŚCIE, więc karta
       istnieje i to ona jest ostatnim miejscem użytkownika.

   Czego ta funkcja NIE robi: nie przewija, gdy karta i tak jest widoczna
   (przeskok pod palcem wygląda jak usterka), i nie robi nic, gdy karty nie ma
   na liście — bo zniknięcie z listy znaczy, że filtr się zmienił i wskazywanie
   pustego miejsca tylko by myliło. */
let _wskazTimer = 0;
function wskazNaLiscie(g){
  if(!g) return;
  const lista = $("noteList"); if(!lista) return;
  const karta = lista.querySelector('.ncard[data-g="'+g+'"]');
  if(!karta) return;
  const rl = lista.getBoundingClientRect(), rk = karta.getBoundingClientRect();
  const widoczna = rk.top >= rl.top && rk.bottom <= rl.bottom;
  if(!widoczna) karta.scrollIntoView({block:"center", behavior:"auto"});
  clearTimeout(_wskazTimer);
  document.querySelectorAll("#noteList .ncard.wrocilem").forEach(k=>k.classList.remove("wrocilem"));
  karta.classList.add("wrocilem");
  const zdejmijWskazanie = ()=>karta.classList.remove("wrocilem");
  /* animationend zdejmuje klasę od razu po błysku, a timer jest zabezpieczeniem
     dla iOS, wyłączonych animacji i kart podmienionych podczas renderowania. */
  karta.addEventListener("animationend", zdejmijWskazanie, {once:true});
  _wskazTimer = setTimeout(zdejmijWskazanie, 1200);
}
function closeFs(){
  /* Zamknięcie czytnika w trakcie edycji jest traktowane jak przerwana sesja:
     nie zatwierdzamy notatki, ale zachowujemy jej bieżący szkic awaryjny. */
  if(typeof szkicFlushKarty==="function") szkicFlushKarty();
  saveReadPos();
  /* Notatkę do wskazania trzeba wziąć PRZED skasowaniem śladu i fsGuid. */
  const wrocDo = fsSlad.length ? fsSlad[0] : fsGuid;
  fsSlad.length = 0; fsGuid = null;
  $("modalFs").classList.remove("dok-schowany","pow-open","is-fullscreen");
  $("modalFs")?.querySelector(".fsmodal")?.classList.remove("is-fullscreen");
  if(typeof updateFsFullBtn==="function") updateFsFullBtn(false);
  if(document.fullscreenElement || document.webkitFullscreenElement){
    try{
      if(document.exitFullscreen) document.exitFullscreen().catch(()=>{});
      else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
    }catch(e){}
  }
  document.body.classList.remove("fs-open", "ma-zaznaczenie");
  const zazn = getSelection(); if(zazn && typeof zazn.removeAllRanges==="function") zazn.removeAllRanges();
  closeModal("modalFs"); releaseWake(); updateFsNav();
  const p=$("readPop"); if(p) p.style.display="none";
  if(fsListDirty){ fsListDirty=false; renderNotes(); }
  /* Po przerysowaniu listy, nie przed — inaczej wskazywalibyśmy kartę, którą
     renderNotes() zaraz zastąpi nową. */
  wskazNaLiscie(wrocDo);
}
/* ===== CZYTNIK: nawigacja, panel Aa, pasek postępu, wake lock ===== */
function fsGo(dir){
  if(!fsGuid) return;
  saveReadPos();
  const i = fsNavList.indexOf(fsGuid); if(i<0) return;
  const j = i+dir; if(j<0 || j>=fsNavList.length) return;
  fsGuid = fsNavList[j]; renderFs();
  const fm=$("modalFs").querySelector(".fsmodal"); if(fm) fm.scrollTop=0;
  updateFsProgress();
}
function updateFsNav(){
  const prev=$("fsPrev"), next=$("fsNext"); if(!prev||!next) return;
  const on = !!fsGuid && $("modalFs").classList.contains("show") &&
             !document.querySelector("#fsWrap .ncard.editing");
  const i = on ? fsNavList.indexOf(fsGuid) : -1;
  prev.style.display = on ? "flex" : "none";
  next.style.display = on ? "flex" : "none";
  prev.disabled = !(i>0);
  next.disabled = !(i>=0 && i<fsNavList.length-1);
}
/* Pasek postępu rysujemy skalowaniem, nie zmianą szerokości. Zmiana width przy każdym
   piknięciu przewijania zmusza przeglądarkę do przeliczenia układu; transform robi to
   sama karta graficzna. Dodatkowo aktualizujemy najwyżej raz na klatkę. */
let _progRaf = 0, _progLast = -1;
function updateFsProgress(){
  if(_progRaf) return;
  _progRaf = requestAnimationFrame(()=>{
    _progRaf = 0;
    const fm=$("modalFs").querySelector(".fsmodal"), p=$("fsProg"); if(!fm||!p) return;
    const max = fm.scrollHeight - fm.clientHeight;
    const frac = max>4 ? Math.min(1, fm.scrollTop/max) : 1;
    const zaokr = Math.round(frac*200)/200;              // 0,5% dokładności w zupełności wystarczy
    if(zaokr === _progLast) return;                      // nic nie zmieniamy, gdy pasek stoi w miejscu
    _progLast = zaokr;
    p.style.transform = "scaleX("+zaokr+")";
    const procent=Math.round(zaokr*100);
    p.setAttribute("aria-valuenow",String(procent));
    const lbl=document.querySelector("#fsWrap .fsPct"); if(lbl) lbl.textContent=procent+"%";
  });
}
let wakeLock=null;
async function acquireWake(){
  if(!readerWake || document.visibilityState!=="visible" || !$("modalFs").classList.contains("show")) return;
  try{ if("wakeLock" in navigator && !wakeLock){ wakeLock = await navigator.wakeLock.request("screen"); } }catch(e){}
}
function releaseWake(){ try{ if(wakeLock){ wakeLock.release(); wakeLock=null; } }catch(e){} }
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="visible") acquireWake(); else releaseWake(); });
// panel typografii
function openReadPop(btn){
  const pop=$("readPop");
  const seg=(id,items)=>`<div class="rp-grp" data-grp="${id}">`+items.map(it=>`<button type="button" data-v="${it.v}" class="${it.on?"on":""}">${it.t}</button>`).join("")+`</div>`;
  pop.innerHTML =
    `<div class="rp-row"><span class="rp-lbl">Rozmiar</span>${seg("size",[{v:"-",t:"A−"},{v:"+",t:"A+"}])}</div>`+
    `<div class="rp-row"><span class="rp-lbl">Interlinia</span>${seg("line",[{v:0,t:"zwarta",on:lineH===0},{v:1,t:"komfort",on:lineH===1},{v:2,t:"luźna",on:lineH===2}])}</div>`+
    `<div class="rp-row"><span class="rp-lbl">Szerokość</span>${seg("width",[{v:0,t:"wąski",on:fsWidth===0},{v:1,t:"komfort",on:fsWidth===1},{v:2,t:"pełny",on:fsWidth===2}])}</div>`+
    `<div class="rp-row"><span class="rp-lbl">Czcionka</span>${seg("font",[{v:"sans",t:"Bezszeryf.",on:readFont==="sans"},{v:"serif",t:"Szeryfowa",on:readFont==="serif"}])}</div>`+
    `<div class="rp-row"><span class="rp-lbl">Tło czytnika</span>${seg("theme",[{v:"app",t:"Jak aplikacja",on:readerTheme==="app"},{v:"light",t:"Dzień",on:readerTheme==="light"},{v:"sepia",t:"Sepia",on:readerTheme==="sepia"},{v:"dark",t:"Noc",on:readerTheme==="dark"}])}</div>`+
    `<div class="rp-row"><span class="rp-lbl">Tryb skupienia</span>${seg("focus",[{v:"1",t:"Włącz",on:readerFocus},{v:"0",t:"Wyłącz",on:!readerFocus}])}</div>`+
    `<div class="rp-row"><span class="rp-lbl">Gest między notatkami</span>${seg("swipe",[{v:"1",t:"Włącz",on:readerSwipe},{v:"0",t:"Wyłącz",on:!readerSwipe}])}</div>`+
    `<div class="rp-row"><span class="rp-lbl">Nie wygaszaj ekranu</span>${seg("wake",[{v:"1",t:"Włącz",on:readerWake},{v:"0",t:"Wyłącz",on:!readerWake}])}</div>`;
  pop.style.display="block";
  const r=btn.getBoundingClientRect(), w=pop.offsetWidth||280, h=pop.offsetHeight||300;
  const _ob = (typeof widocznyObszar==="function") ? widocznyObszar()
            : {lewo:0, gora:0, prawo:innerWidth, dol:innerHeight, szer:innerWidth};
  pop.style.left = Math.max(_ob.lewo+8, Math.min(r.left, _ob.prawo-w-8))+"px";
  pop.style.top  = Math.max(_ob.gora+8, Math.min(r.top-h-10, _ob.dol-h-8))+"px";
}
$("readPop").addEventListener("pointerdown", e=>{
  const b=e.target.closest("button[data-v]"); if(!b) return;
  e.preventDefault();
  const grp=b.closest("[data-grp]").dataset.grp, v=b.dataset.v;
  if(grp==="size"){ if(!fsNoteFs) fsNoteFs=noteFs+3; if(v==="-") fsNoteFs=Math.max(12,fsNoteFs-1); else fsNoteFs=Math.min(34,fsNoteFs+1); lsSetSoon(KP+"FsFont",fsNoteFs); applyFsFont(); toast("Wielkość tekstu w notatce: "+fsNoteFs+" px"); return; }
  if(grp==="line"){ lineH=+v; lsSet(KP+"LineH",lineH); applyReading(); }
  else if(grp==="width"){ fsWidth=+v; lsSet(KP+"FsW2",fsWidth); applyFsWidth(); }   /* FsW2 — patrz 11-theme.js */
  else if(grp==="font"){ readFont=v; lsSet(KP+"ReadFont",readFont); applyReading(); }
  else if(grp==="theme"){ readerTheme=v; lsSet(READER_THEME_KEY,v); applyReaderTheme(); }
  else if(grp==="focus"){
    readerFocus=v==="1"; lsSet(READER_FOCUS_KEY,readerFocus?"1":"0");
    if(!readerFocus) $("modalFs").classList.remove("dok-schowany");
  }
  else if(grp==="swipe"){ readerSwipe=v==="1"; lsSet(READER_SWIPE_KEY,readerSwipe?"1":"0"); }
  else if(grp==="wake"){
    readerWake=v==="1"; lsSet(READER_WAKE_KEY,readerWake?"1":"0");
    if(readerWake) acquireWake(); else releaseWake();
  }
  const g=b.closest("[data-grp]"); g.querySelectorAll("button").forEach(x=>x.classList.remove("on")); b.classList.add("on");
});
/* Zamykanie przy dotknięciu obok — wspólne dla wszystkich okienek, w 45-zamykanie.js */
$("fsClose").onclick = closeFs;
$("modalFs").addEventListener("click", e=>{ if(e.target.id==="modalFs") closeFs(); });

/* ===== PEŁNY EKRAN CZYTNIKA (modalFs) ===== */
const FS_ICON_EXPAND = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
const FS_ICON_COMPRESS = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';

function isFsActive(){
  return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || $("modalFs")?.classList.contains("is-fullscreen") || document.body.classList.contains("fs-fullscreen"));
}

function updateFsFullBtn(forcedState){
  const btn = $("fsFull");
  if(!btn) return;
  const active = (typeof forcedState === "boolean") ? forcedState : isFsActive();
  if(active){
    btn.classList.add("active");
    btn.setAttribute("title", "Opuść pełny ekran");
    btn.setAttribute("aria-label", "Opuść pełny ekran");
    btn.innerHTML = FS_ICON_COMPRESS;
  } else {
    btn.classList.remove("active");
    btn.setAttribute("title", "Pełny ekran");
    btn.setAttribute("aria-label", "Pełny ekran");
    btn.innerHTML = FS_ICON_EXPAND;
  }
}

function toggleFsFullscreen(){
  const modal = $("modalFs");
  if(!modal) return;
  const isFull = isFsActive();
  if(isFull){
    exitFsFullscreen();
  } else {
    enterFsFullscreen();
  }
}

function enterFsFullscreen(){
  const modal = $("modalFs");
  if(modal){
    modal.classList.add("is-fullscreen");
    modal.querySelector(".fsmodal")?.classList.add("is-fullscreen");
  }
  document.body.classList.add("fs-fullscreen");

  const docEl = document.documentElement;
  const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
  if(req){
    try{
      const p = req.call(docEl);
      if(p && p.catch) p.catch(()=>{});
    }catch(e){}
  }
  updateFsFullBtn(true);
}

function exitFsFullscreen(){
  const modal = $("modalFs");
  if(modal){
    modal.classList.remove("is-fullscreen");
    modal.querySelector(".fsmodal")?.classList.remove("is-fullscreen");
  }
  document.body.classList.remove("fs-fullscreen");

  if(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement){
    try{
      const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
      if(exit){
        const p = exit.call(document);
        if(p && p.catch) p.catch(()=>{});
      }
    }catch(e){}
  }
  updateFsFullBtn(false);
}

const btnFsFull = $("fsFull");
if(btnFsFull){
  btnFsFull.onclick = (e)=>{
    e.preventDefault();
    e.stopPropagation();
    toggleFsFullscreen();
  };
}

["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"].forEach(evt => {
  document.addEventListener(evt, () => {
    const isNative = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    const modal = $("modalFs");
    if(!isNative){
      if(modal){
        modal.classList.remove("is-fullscreen");
        modal.querySelector(".fsmodal")?.classList.remove("is-fullscreen");
      }
      document.body.classList.remove("fs-fullscreen");
    } else {
      if(modal){
        modal.classList.add("is-fullscreen");
        modal.querySelector(".fsmodal")?.classList.add("is-fullscreen");
      }
      document.body.classList.add("fs-fullscreen");
    }
    updateFsFullBtn();
  });
});

// nawigacja poprzednia/następna
$("fsPrev").onclick = ()=>fsGo(-1);
$("fsNext").onclick = ()=>fsGo(1);
// pasek postępu czytania i immersyjny tryb e-czytnika (autoukrywanie kontrolek podczas czytania)
(function(){
  const fm=$("modalFs").querySelector(".fsmodal"); if(!fm) return;
  let raf=0, posT=null, lastScrollTop=0;
  fm.addEventListener("scroll", ()=>{
    if(!raf) raf=requestAnimationFrame(()=>{ raf=0; updateFsProgress(); });
    clearTimeout(posT); posT=setTimeout(saveReadPos, 400);   // zapamiętaj miejsce czytania
    const modal=$("modalFs");
    const st = fm.scrollTop;
    if(readerFocus && !document.querySelector("#fsWrap .ncard.editing") && !String(getSelection()).trim()){
      if(st > lastScrollTop + 8 && st > 40){
        modal.classList.add("dok-schowany");
      } else if(st < lastScrollTop - 12 || st <= 20){
        modal.classList.remove("dok-schowany");
      }
    }
    lastScrollTop = Math.max(0, st);
  }, {passive:true});

  // Ruch myszką w pobliże góry lub dołu ekranu natychmiast odkrywa przyciski
  fm.addEventListener("mousemove", e=>{
    if(e.clientY < 70 || e.clientY > innerHeight - 70){
      $("modalFs")?.classList.remove("dok-schowany");
    }
  }, {passive:true});
})();
/* Kliknięcie w czytniku przełącza / przywraca elementy sterujące */
$("modalFs").querySelector(".fsmodal")?.addEventListener("click", e=>{
  const modal=$("modalFs");
  if(String(getSelection()).trim()) return;
  if(e.target.closest("a,button,input,select,textarea,[contenteditable='true'],.powPanel,#readPop,.fsFind,.fsToc,.fsMarks")) return;
  if(modal.classList.contains("dok-schowany")){
    modal.classList.remove("dok-schowany");
  }
});
// przesunięcie palcem — opcjonalne i wyłączone domyślnie. Nie przechwytuje
// systemowego zaznaczania: nie blokujemy touchmove, a gest musi być krótki,
// wyraźnie poziomy i zacząć się poza krawędzią systemowego „wstecz”.
(function(){
  const fm=$("modalFs").querySelector(".fsmodal"); if(!fm) return;
  let sx=0, sy=0, st=0, act=false, selAtStart="";
  fm.addEventListener("touchstart", e=>{
    if(!readerSwipe || e.touches.length!==1){ act=false; return; }
    const t=e.target;
    if(t.closest("img, a, button, input, textarea, select, [contenteditable='true'], .ncard.editing, #readPop, .fsFind, .fsToc, .fsMarks")){ act=false; return; }
    selAtStart = String(window.getSelection ? getSelection() : "");
    sx=e.touches[0].clientX; sy=e.touches[0].clientY; st=Date.now();
    act=sx>24 && sx<innerWidth-24;
  }, {passive:true});
  fm.addEventListener("touchend", e=>{
    if(!act) return; act=false;
    // jeśli w trakcie gestu powstało/istnieje zaznaczenie tekstu — to nie jest swipe
    const selNow = String(window.getSelection ? getSelection() : "");
    if(selNow.trim() || selNow!==selAtStart) return;
    const t=e.changedTouches[0], dx=t.clientX-sx, dy=t.clientY-sy;
    if(Date.now()-st<700 && Math.abs(dx)>110 && Math.abs(dy)<48 && Math.abs(dx)>Math.abs(dy)*2.4){ fsGo(dx<0 ? 1 : -1); }
  }, {passive:true});
})();

/* ===== PANEL, HISTORIA I INTELIGENTNE ZAKŁADKI WYSZUKIWANIA ===== */
const SEARCH_SAVED_KEY=KP+"SearchSaved";
function savedSearches(){ try{ const x=JSON.parse(lsGet(SEARCH_SAVED_KEY,"[]")); return Array.isArray(x)?x:[]; }catch(_){return [];} }
function storeSavedSearches(a){ lsSet(SEARCH_SAVED_KEY,JSON.stringify(a.slice(0,30))); }
function zastosujStanSzukania(x){
  const inp=$("search"); inp.value=x.q||"";
  searchMode=x.mode==="exact"?"exact":"smart";
  searchOpts=Object.assign({scope:"current",group:"all",dateFrom:"",dateTo:"",highlight:"all",extra:"all"},x.opts||{});
  lsSet(KP+"SearchMode",searchMode); lsSet(KP+"SearchOpts",JSON.stringify(searchOpts));
  parseQuery(inp.value); sortMode=query?"relevance":sortMode; if(query) $("sortSel").value="relevance";
  if(typeof uruchomWorkerSzukania==="function") uruchomWorkerSzukania();
  renderAll();
}
function renderSavedSearches(){
  const box=$("sSavedList"); if(!box)return;
  const zapisane=savedSearches(); const hist=recentSearches().filter(q=>!zapisane.some(x=>x.q===q)).slice(0,6);
  const one=(x,historia)=>`<span class="sSavedItem"><button type="button" data-sload="${esc(x.id||x.q)}" title="Uruchom">${x.pin?"★ ":historia?"🕘 ":""}${esc(x.name||x.q)}</button>`+
    `<button type="button" class="sPin${x.pin?" on":""}" data-spin="${esc(x.id||x.q)}" title="${historia?"Przypnij i zapisz":"Przypnij"}">★</button>`+
    (!historia?`<button type="button" class="sDel" data-sdel="${esc(x.id)}" title="Usuń">×</button>`:"")+`</span>`;
  box.innerHTML=zapisane.sort((a,b)=>(b.pin?1:0)-(a.pin?1:0)).map(x=>one(x,false)).join("")+hist.map(q=>one({q,name:q},true)).join("")||'<span class="muted">Jeszcze nic nie zapisano.</span>';
}
function wypelnijPanelSzukania(){
  document.querySelectorAll("[data-smode]").forEach(b=>b.classList.toggle("on",b.dataset.smode===searchMode));
  $("sScope").value=searchOpts.scope; $("sGroup").value=searchOpts.group;
  $("sDateFrom").value=searchOpts.dateFrom; $("sDateTo").value=searchOpts.dateTo;
  $("sHighlight").value=String(searchOpts.highlight); $("sExtra").value=searchOpts.extra;
  renderSavedSearches();
}
function zapiszOpcjeZPanelu(){
  searchOpts={scope:$("sScope").value,group:$("sGroup").value,dateFrom:$("sDateFrom").value,dateTo:$("sDateTo").value,highlight:$("sHighlight").value,extra:$("sExtra").value};
  lsSet(KP+"SearchOpts",JSON.stringify(searchOpts)); resetSearchWindow(); resetQueryCache(); renderAll();
}
$("btnSearchTools").onclick=()=>{ hideSearchSug(); wypelnijPanelSzukania(); openModal("modalSearch"); };
document.querySelectorAll("[data-smode]").forEach(b=>b.onclick=()=>{
  searchMode=b.dataset.smode; lsSet(KP+"SearchMode",searchMode); resetSearchWindow(); parseQuery($("search").value); wypelnijPanelSzukania(); renderAll();
});
["sScope","sGroup","sDateFrom","sDateTo","sHighlight","sExtra"].forEach(id=>$(id).addEventListener("change",zapiszOpcjeZPanelu));
$("sClearQuery").onclick=()=>{
  $("search").value=""; parseQuery("");
  if(sortMode==="relevance"){
    sortMode=window._sortPrzedSzukaniem||"new";
    $("sortSel").value=sortMode;
  }
  renderAll();
};
$("sClearFilters").onclick=()=>{ searchOpts={scope:"current",group:"all",dateFrom:"",dateTo:"",highlight:"all",extra:"all"}; lsSet(KP+"SearchOpts",JSON.stringify(searchOpts)); resetSearchWindow(); resetQueryCache(); wypelnijPanelSzukania(); renderAll(); };
$("sSave").onclick=async()=>{
  const q=$("search").value.trim(); if(!q&&!aktywneOpcjeSzukania()){toast("Najpierw wpisz zapytanie albo wybierz filtr");return;}
  const name=await askText({title:"Nazwa inteligentnej zakładki",value:q||"Moje wyszukiwanie",okLabel:"Zapisz"}); if(!name)return;
  const a=savedSearches(); a.unshift({id:"s"+Date.now(),name:name.trim(),q,mode:searchMode,opts:Object.assign({},searchOpts),pin:false}); storeSavedSearches(a); renderSavedSearches(); toastOk("Zapisano inteligentną zakładkę");
};
$("sSavedList").onclick=e=>{
  const load=e.target.closest("[data-sload]"),pin=e.target.closest("[data-spin]"),del=e.target.closest("[data-sdel]"); let a=savedSearches();
  if(del){storeSavedSearches(a.filter(x=>x.id!==del.dataset.sdel));renderSavedSearches();return;}
  if(pin){ const x=a.find(y=>y.id===pin.dataset.spin); if(x)x.pin=!x.pin; else{const q=pin.dataset.spin;a.unshift({id:"s"+Date.now(),name:q,q,mode:searchMode,opts:Object.assign({},searchOpts),pin:true});} storeSavedSearches(a);renderSavedSearches();return; }
  if(load){ const x=a.find(y=>y.id===load.dataset.sload)||{q:load.dataset.sload,mode:searchMode,opts:searchOpts}; zastosujStanSzukania(x); closeModal("modalSearch"); }
};
$("sDuplicates").onclick=()=>{ $("search").value="@duplikaty"; zastosujStanSzukania({q:"@duplikaty",mode:"smart",opts:Object.assign({},searchOpts,{scope:"all"})}); closeModal("modalSearch"); };
$("sSimilar").onclick=()=>{
  const n=notes.filter(x=>!x.del).sort((a,b)=>(b.la||"").localeCompare(a.la||""))[0]; if(!n){toast("Najpierw otwórz notatkę");return;}
  const slowa=(norm((n.t||"")+" "+(n.c||"")).match(/[a-z]{5,}/g)||[]).filter(x=>!SZUK_STOP.has(x));
  const q=[...new Set(slowa)].slice(0,4).join(" "); zastosujStanSzukania({q,mode:"smart",opts:Object.assign({},searchOpts,{scope:"all"})}); closeModal("modalSearch");
};
let searchFocusIndex=-1;
function searchPrzejdz(dir){
  const cards=[...document.querySelectorAll("#noteList .ncard")]; if(!cards.length)return;
  searchFocusIndex=(searchFocusIndex+dir+cards.length)%cards.length; cards.forEach((c,i)=>c.classList.toggle("searchFocus",i===searchFocusIndex)); cards[searchFocusIndex].scrollIntoView({behavior:"smooth",block:"center"});
}
function doladujWynikiSzukania(){
  if(!query || searchInProgress) return;
  searchMatchLimit+=SEARCH_RESULT_STEP;
  searchScanLimit+=SEARCH_SCAN_STEP; // ścieżka zgodności bez Workera
  resetQueryCache();
  if(!(typeof uruchomWorkerSzukania==="function" && uruchomWorkerSzukania())) renderNotes();
}
function opisFiltrowWynikow(){
  const a=[];
  if(typeof filt.book==="number"){
    if(filt.book>0)a.push(BOOKS[filt.book]||("księga "+filt.book));
    else if(filt.book===0)a.push("publikacje i własne");
  }
  if(filt.ch!=null)a.push("rozdział "+filt.ch);
  if(typeof filt.tag==="number"){
    const t=tags.find(x=>x.id===filt.tag); a.push(t?t.name:"wybrana etykieta");
  }else if(filt.tag==="none")a.push("bez etykiety");
  else if(typeof filt.tag==="string"&&filt.tag.indexOf("auto:")===0){
    const t=wszystkieAutoTematy().find(x=>x.id===filt.tag.slice(5)); a.push(t?t.name:"temat automatyczny");
  }else if(typeof filt.tag==="string"&&filt.tag!=="all")a.push("wybrana zakładka");
  if(typeof filt.pub==="string"&&filt.pub!=="all"){
    if(filt.pub.indexOf("ptb:")===0){
      const z=typeof pubTabs!=="undefined"&&pubTabs.find(x=>String(x.id)===filt.pub.slice(4));
      a.push(z?z.name:"zakładka publikacji");
    }else{
      const k=filt.pub.slice(4);
      a.push(k.indexOf("year:")===0 ? "rocznik "+k.split(":")[2] : pubKeyLabel(k));
    }
  }
  return a.join(" · ");
}
let _searchCounts = {all:0, bible:0, publication:0, own:0};
function renderSearchStatus(arr){
  const box=$("searchStatus"); const active=!!query||aktywneOpcjeSzukania(); box.hidden=!active; if(!active){box.innerHTML="";return;}
  if(searchOpts.group==="all" || !_searchCounts || !_searchCounts.all){
    _searchCounts={all:arr.length,bible:0,publication:0,own:0};
    arr.forEach(n=>_searchCounts[kategoriaNotatki(n)]++);
  }
  const cnt=_searchCounts;
  const zakres=opisFiltrowWynikow();
  const calosc=searchInProgress?` · sprawdzono ${searchScannedCount} z ${notes.length}`
    :(searchTotalMatches>arr.length?` · znaleziono ${searchTotalMatches}, pokazano najlepsze ${arr.length}`:" · przeszukano całą bazę");
  box.innerHTML=`<span class="ssInfo">${searchMode==="smart"?"Inteligentnie":"Dokładnie"} · ${arr.length}${searchWasLimited?"+":""} wyników${calosc}</span>`+
    (zakres?`<button class="ssChip on ssZakres" data-ssfiltersclear="1" title="Usuń zawężenie">Wyniki w: ${esc(zakres)} ×</button>`:"")+
    [["all","Wszystkie"],["bible","Biblia"],["publication","Publikacje"],["own","Własne"]].map(([k,l])=>`<button class="ssChip${searchOpts.group===k?" on":""}" data-ssgroup="${k}">${l} ${cnt[k]||0}</button>`).join("")+
    (searchWasLimited&&!searchInProgress?`<button class="ssNav" data-ssmore="1">Wczytaj dalsze</button>`:"")+
    `<button class="ssNav" data-ssnav="-1" title="Poprzedni wynik">↑</button><button class="ssNav" data-ssnav="1" title="Następny wynik">↓</button><button class="ssNav" data-ssexport="1" title="Eksportuj wyniki (Word / PDF)">📄 Eksportuj…</button><button class="ssNav" data-sshelp="1">Instrukcja</button><button class="ssNav" data-ssclear="1">Wyczyść</button>`;
  box.onclick=e=>{
    if(e.target.closest("[data-ssfiltersclear]")){
      filt.tag="all";filt.book="all";filt.ch=null;filt.pub="all";persistFilt();resetSearchWindow();resetQueryCache();renderAll();return;
    }
    const g=e.target.closest("[data-ssgroup]"); if(g){
      const targetGroup = g.dataset.ssgroup;
      searchOpts.group = (searchOpts.group === targetGroup && targetGroup !== "all") ? "all" : targetGroup;
      lsSet(KP+"SearchOpts",JSON.stringify(searchOpts));
      resetSearchWindow();
      resetQueryCache();
      if(typeof uruchomWorkerSzukania==="function" && query) uruchomWorkerSzukania();
      renderAll();
      return;
    }
    if(e.target.closest("[data-ssmore]")){
      doladujWynikiSzukania();
      return;
    }
    if(e.target.closest("[data-ssexport]")){ if(typeof otworzEksportWynikow==="function") otworzEksportWynikow(); return; }
    const n=e.target.closest("[data-ssnav]"); if(n){searchPrzejdz(+n.dataset.ssnav);return;}
    if(e.target.closest("[data-sshelp]")){$("btnSearchTools").click();return;}
    if(e.target.closest("[data-ssclear]")){
      _searchCounts={all:0,bible:0,publication:0,own:0};
      $("search").value="";parseQuery("");searchOpts={scope:"current",group:"all",dateFrom:"",dateTo:"",highlight:"all",extra:"all"};lsSet(KP+"SearchOpts",JSON.stringify(searchOpts));
      if(sortMode==="relevance"){sortMode=window._sortPrzedSzukaniem||"new";$("sortSel").value=sortMode;}
      renderAll();
    }
  };
}
