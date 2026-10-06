/* ==========================================================================
   JW Study — appearance.js
   Kolory kolumn i gotowe kompozycje
   ========================================================================== */
"use strict";
function hexA(hex,al){ const n=parseInt(shade(hex,0).slice(1),16); return `rgba(${n>>16},${(n>>8)&255},${n&255},${al})`; }
/* wyciszenie koloru — mieszanie w stronę szarości, żeby barwy nie były ostre/jaskrawe */
function desat(hex, mix){ const n=parseInt(shade(hex,0).slice(1),16); let r=n>>16,g=(n>>8)&255,b=n&255; const a=(r*0.3+g*0.59+b*0.11); r=Math.round(r+(a-r)*mix); g=Math.round(g+(a-g)*mix); b=Math.round(b+(a-b)*mix); return "#"+[r,g,b].map(x=>Math.max(0,Math.min(255,x)).toString(16).padStart(2,"0")).join(""); }
function loadColorCfg(){ try{ return JSON.parse(localStorage.getItem(KP+"Colors")||"{}"); }catch(e){ return {}; } }
/* ——— czytelność na kolorowym tle ———
   Sekcje i belki notatek dostawały biały tekst niezależnie od wybranego koloru.
   Przy jasnym, pastelowym tle biel po prostu znikała. Poniższe funkcje liczą jasność
   koloru i dobierają do niego tekst tak, żeby zawsze dało się go przeczytać. */
function _kanal(v){ v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }
/** Względna jasność koloru w skali 0–1 (wzór z wytycznych dostępności WCAG). */
function luminancja(hex){
  const n=parseInt(String(hex).replace("#","").slice(0,6),16);
  if(!isFinite(n)) return 1;
  return 0.2126*_kanal(n>>16) + 0.7152*_kanal((n>>8)&255) + 0.0722*_kanal(n&255);
}
/** Tekst na podanym tle: ciemny na jasnym, biały na ciemnym. */
function czytelnyTekst(hex){ return luminancja(hex) > 0.42 ? "#1c2b24" : "#ffffff"; }
/** Przygaszony wariant tekstu (liczniki, podpisy) — ta sama zasada, mniejszy kontrast. */
function czytelnyTekstSlaby(hex){ return luminancja(hex) > 0.42 ? "rgba(28,43,36,.62)" : "rgba(255,255,255,.75)"; }

/**
 * Kolor paska górnego dla kompozycji.
 *
 * Stałe przyciemnienie o 42% wystarczało dla większości pastelów, ale przy
 * jasnych (Piasek) napis wychodził poniżej progu czytelności WCAG 4.5:1.
 * Zamiast zgadywać jedną wartość, przyciemniamy stopniowo aż do progu.
 *
 * @param {string} baza  kolor kompozycji po wyciszeniu
 * @returns {string} odcień, na którym napis jest na pewno czytelny
 */
function akcentCzytelny(baza){
  let kolor = shade(baza, -.42);
  for(let i=0; i<12; i++){
    const t = czytelnyTekst(kolor);
    const a = luminancja(t), b = luminancja(kolor);
    const [jasny, ciemny] = a>b ? [a,b] : [b,a];
    if((jasny+0.05)/(ciemny+0.05) >= 4.5) return kolor;
    kolor = shade(kolor, -.08);
  }
  return kolor;
}
function buildColorCSS(){
  const cfg = loadColorCfg(); let css="";
  // spokojne, MATOWE i WYCISZONE tło w wybranym odcieniu (bez ostrych barw; kafelki zostają jasne)
  ["colBooks","colTags","colPubs"].forEach(id=>{
    const raw=cfg[id]; if(!raw) return; const c=desat(raw,.42);
    css+=`#${id}{background:${hexA(shade(c,.6),.45)}!important;border-color:${hexA(shade(c,-.05),.3)}!important}`;
    css+=`#${id} h2,#${id} .divider,#${id} .cnt{color:${shade(desat(raw,.55),-.28)}!important}`;
    css+=`#${id} .item{border-color:${hexA(shade(c,-.05),.28)}}`;
    css+=`#${id} .item:hover{border-color:${shade(c,-.12)}}`;
  });
  if(cfg.colNotes){ const c=desat(cfg.colNotes,.42); css+=`#colNotes{background:${hexA(shade(c,.74),.45)}!important}`; }
  if(cfg.nhead){
    /* Płaski, wyciszony kolor zamiast gradientu; tytuł dostaje kolor dobrany do jasności tła
       i pion wyrównany do środka paska — wcześniej „wisiał" przy górnej krawędzi. */
    const c = desat(cfg.nhead, .34);
    const tlo = shade(c, .22);
    const tekst = czytelnyTekst(tlo);
    css += `.nhead{background:${tlo}!important;border-bottom:1px solid ${hexA(shade(c,-.35),.35)}!important;`+
           `display:flex;align-items:center;min-height:38px;padding-top:6px!important;padding-bottom:6px!important}`;
    css += `.ntitle{color:${tekst}!important}`;
    css += `.nhead .drag{color:${czytelnyTekstSlaby(tlo)}!important}`;
    css += `.pinmark .mic,.favmark .mic{color:${tekst}!important;opacity:.9}`;
  }
  /* ——— kompozycja na cały interfejs ———
     --accent rządzi paskiem górnym, przyciskiem „Nowa notatka" i podświetleniem
     wybranej pozycji. Bierzemy ciemniejszy odcień tej samej rodziny kolorów:
     dzięki temu pasek pasuje do kolumn, a biały napis na nim pozostaje czytelny.
     Kolor napisu i tak liczymy, na wypadek jasnej kompozycji. */
  if(cfg.ui){
    const baza    = desat(cfg.ui, .18);
    const akcent  = akcentCzytelny(baza);
    const akcent2 = shade(baza, -.22);
    const tekst   = czytelnyTekst(akcent);
    const slaby   = czytelnyTekstSlaby(akcent);
    css += `:root{--accent:${akcent}!important;--accent2:${akcent2}!important}`;
    css += `header{background:${akcent}!important;background:linear-gradient(135deg, ${shade(akcent,-.15)} 0%, ${akcent} 55%, ${shade(akcent,.12)} 100%)!important;box-shadow:0 4px 18px -2px ${hexA(akcent,.35)}!important}`;
    css += `.brand-name{color:${tekst}!important}`;
    css += `.brand-name .ver,.brand-sub{color:${slaby}!important}`;
    css += `header .btn{color:${tekst}!important;border-color:${hexA(tekst,.25)}!important;background:${hexA(tekst,.12)}!important}`;
    css += `header .btn:hover{background:${hexA(tekst,.22)}!important}`;
    css += `header .btn.primary{background:${tekst}!important;color:${akcent}!important}`;
    css += `header .fontctl button{color:${tekst}!important}`;
    css += `#mobileTabs button.on{background:${akcent}!important;border-color:${akcent}!important;color:${tekst}!important}`;
    css += `.sidebar-new-btn{background:${akcent}!important;box-shadow:0 2px 8px ${hexA(akcent,.3)}!important}`;
    css += `.sidebar-nav-item.active{color:${akcent}!important;background:${hexA(akcent,.14)}!important}`;
  }
  return css;
}
function applyColors(){
  let s=document.getElementById("colorOverrides");
  if(!s){ s=document.createElement("style"); s.id="colorOverrides"; document.head.appendChild(s); }
  s.textContent = buildColorCSS();
}
/**
 * Menu kolorów spod ikony palety w pasku górnym: kolory poszczególnych kolumn
 * i belki notatek. Gotowe kompozycje na cały interfejs mieszkają w Ustawieniach,
 * żeby te same rzeczy nie były w dwóch miejscach.
 * @param {Object} e  obiekt z polem target — element, przy którym ma się pojawić menu
 */
function openColorMenu(e, tryb){
  tryb = tryb || "kolumny";
  const cm=$("colorMenu"); const cfg=loadColorCfg();
  const sw=(target,c)=>{
    const sel = c===null ? !cfg[target] : cfg[target]===c;
    return `<span class="cm-sw ${c===null?"cm-none":""} ${sel?"sel":""}" data-pc="${c||""}" style="${c===null?"":`background:${desat(c,.4)}`}" title="${c||"Domyślny"}">${c===null?"✕":""}</span>`;
  };
  const sec=(target,label)=>`<div class="cm-sec"><div class="cm-lbl">${label}</div><div class="cm-row" data-target="${target}">`+
    sw(target,null)+TAGCOLORS.map(c=>sw(target,c)).join("")+`</div></div>`;
  const kolumny = sec("colBooks","Kolumna „Biblia”")+
                  sec("colTags","Kolumna „Etykiety”")+
                  sec("colPubs","Kolumna „Publikacje”")+
                  sec("colNotes","Tło kolumny „Notatki”")+
                  sec("nhead","Belka każdej notatki");
  cm.dataset.tryb = tryb;
  cm.innerHTML = `<div class="cm-title">Kolory kolumn i notatek</div>`+kolumny+
    `<div class="cm-note">Gotowe kompozycje na cały interfejs — łącznie z paskiem górnym — `+
    `są w Ustawieniach (koło zębate).</div>`;
  cm.style.display="block";
  const r=e.target.getBoundingClientRect();
  const w=cm.offsetWidth||300, h=cm.offsetHeight||380;
  const _ob = (typeof widocznyObszar==="function") ? widocznyObszar()
            : {lewo:0, gora:0, prawo:innerWidth, dol:innerHeight, szer:innerWidth};
  cm.style.left=Math.max(_ob.lewo+8, Math.min(r.right-w, _ob.prawo-w-8))+"px";
  cm.style.top=Math.max(_ob.gora+8, Math.min(r.bottom+6, _ob.dol-h-8))+"px";
}
function tagItem(key,name,cnt,user,color,inSection,secId){
  const active = String(filt.tag)===String(key);
  /* Druga linia obrony: kolor sprawdzamy także przy rysowaniu, bo w bazie mogą
     leżeć dane zapisane przez starszą wersję, sprzed kontroli przy wczytywaniu. */
  const bezpieczny = (typeof kolorBezpieczny==="function" && kolorBezpieczny(color)) ? color : "";
  const dot = bezpieczny ? `<span class="tgdot" style="background:${bezpieczny}"></span>`
            : (key==="all" ? `<span class="tgdot all"></span>` : `<span class="tgdot none"></span>`);
  /* Uchwyt tylko przy etykietach użytkownika — „Wszystkie" i „Bez etykiety" stoją
     na stałych miejscach. Przenoszeniem zajmuje się 34-chwytanie.js. */
  const uchwyt = user ? '<span class="dragOrd" title="Przeciągnij: zmień kolejność lub dodaj do Mojej zakładki">'+IC_GRIP+'</span>' : "";
  const atryb = user ? ` data-droppable="1" data-ord="${key}"` : "";
  return `<div class="item ${active?"active":""} ${cnt?"":"zero"}${inSection?" inSec":""}" data-k="${key}"${atryb}>
    ${uchwyt}${dot}<span class="nm" title="${esc(name)}">${esc(name)}</span>${user?'<span class="more" title="Opcje etykiety">'+IC_DOTS+'</span>':""}<span class="cnt">${cnt}</span></div>`;
}
function cmpTags(a,b){
  const ao=a.ord!==undefined, bo=b.ord!==undefined;
  if(ao&&bo) return a.ord-b.ord;
  if(ao) return -1;
  if(bo) return 1;
  return a.name.localeCompare(b.name,"pl");
}
function sortTags(){ tags.sort(cmpTags); }
function ensureOrd(){ sortTags(); tags.forEach((t,i)=>{ if(t.ord===undefined) t.ord=i; }); }
function moveTag(id,dir){
  pushUndo({type:"tags", label:"zmianę kolejności zakładek", tags:cloneTags()});
  ensureOrd();
  const i = tags.findIndex(t=>t.id===id);
  if(i<0) return;
  if(dir==="top"){
    const min = Math.min(...tags.map(t=>t.ord));
    tags.find(t=>t.id===id).ord = min-1;
  } else {
    const j = i+dir;
    if(j<0||j>=tags.length) return;
    const tmp = tags[i].ord; tags[i].ord = tags[j].ord; tags[j].ord = tmp;
  }
  sortTags(); saveTags(); renderAll();
}
function tagMenu(e, t){
  const dd = $("dropdown");
  const upI=_svg('<path d="M12 19V5M6 11l6-6 6 6"/>');
  const downI=_svg('<path d="M12 5v14M6 13l6 6 6-6"/>');
  const topI=_svg('<path d="M5 5h14M12 20V9M7 14l5-5 5 5"/>');
  const printI=_svg('<path d="M6 9V4h12v5"/><path d="M6 17H4a1 1 0 0 1-1-1v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a1 1 0 0 1-1 1h-2"/><rect x="7" y="13" width="10" height="7" rx="1"/>');
  const cnt=notes.filter(n=>!n.del && n.tg.includes(t.id)).length;
  const pal=(c)=>{ const s=(c||"")===(t.color||""); return `<span class="pal ${c?"":"pal-none"} ${s?"sel":""}" data-pc="${c||""}" style="${c?`background:${c}`:''}" title="${c||"Bez koloru"}">${c?"":"✕"}</span>`; };
  dd.innerHTML =
    `<div data-tm="ren">${ICO.edit}Zmień nazwę</div>
     <div class="dd-lbl">Kolor zakładki</div>
     <div class="palrow">${pal("")}${TAGCOLORS.map(c=>pal(c)).join("")}</div>
     <div class="dd-sep"></div>
     <div class="dd-lbl">Sekcja</div>
     ${sections.length
        ? sections.slice().sort((a,b)=>(a.ord??0)-(b.ord??0)).map(s=>
            `<div data-sec2="${s.id}">${t.sec===s.id?"✓ ":"📁 "}${esc(s.name)}</div>`).join("")
          + (t.sec!==undefined ? `<div data-sec2="none">✕ Wyjmij z sekcji</div>` : "")
        : `<div class="dd-note" style="padding:4px 12px 8px">Brak sekcji — utwórz przyciskiem „＋ Nowa sekcja”</div>`}
     ${(typeof secTabsFor==="function" && t.sec!==undefined && secTabsFor(t.sec).length)
        ? `<div class="dd-lbl">Zakładka w sekcji</div>`+
          secTabsFor(t.sec).map(z=>`<div data-stb2="${z.id}">${t.stb===z.id?"✓ ":""}${esc(z.name)}</div>`).join("")+
          (t.stb!==undefined ? `<div data-stb2="none">✕ Wyjmij z zakładki</div>` : "")
        : ""}
     <div class="dd-sep"></div>
     <div data-tm="up">${upI}Przesuń w górę</div>
     <div data-tm="down">${downI}Przesuń w dół</div>
     <div data-tm="top">${topI}Na samą górę</div>
     <div class="dd-sep"></div>
     <div class="dd-lbl">Eksport całej zakładki${cnt?" ("+cnt+" notatek)":""}</div>
     <div data-tm="wyslij">${ICO.copy}Wyślij na inne urządzenie…</div>
     <div data-tm="expw">${ICO.file}Zapisz do Word</div>
     <div data-tm="expp">${printI}Zapisz / drukuj do PDF</div>
     <div class="dd-sep"></div>
     <div data-tm="del" class="dd-danger">${ICO.trash}Usuń zakładkę</div>`;
  dd.style.display = "block";
  placeDropdown(dd, e.target);
  dd.onclick = ev=>{
    if(ev.target.dataset.pc!==undefined){
      pushUndo({type:"tags", label:"zmianę koloru zakładki", tags:cloneTags()});
      t.color = ev.target.dataset.pc || undefined;
      saveTags(); dd.style.display="none"; renderAll(); return;
    }
    const z2 = ev.target.closest("[data-stb2]");
    if(z2){ dd.style.display="none"; setTagSecTab(t, z2.dataset.stb2==="none" ? null : +z2.dataset.stb2); return; }
    const s2 = ev.target.closest("[data-sec2]");
    if(s2){ dd.style.display="none"; setTagSection(t.id, s2.dataset.sec2==="none" ? null : +s2.dataset.sec2); return; }
    const pozycja = ev.target && ev.target.closest ? ev.target.closest("[data-tm]") : null;
    if(!pozycja || !dd.contains(pozycja)) return;
    const m = pozycja.dataset.tm;
    dd.style.display = "none";
    if(m==="wyslij") wyslijEtykiete(t.id);
    else if(m==="ren") renameTag(t.id);
    else if(m==="up") moveTag(t.id,-1);
    else if(m==="down") moveTag(t.id,1);
    else if(m==="top") moveTag(t.id,"top");
    else if(m==="expw") exportTagWord(t);
    else if(m==="expp") exportTagPdf(t);
    else if(m==="del") deleteTag(t);
  };
}
function createTag(name){
  name = (name||"").trim();
  if(!name) return null;
  const ex = tags.find(t=>t.name===name);
  if(ex) return ex;
  pushUndo({type:"tags", label:"utworzenie zakładki", tags:cloneTags()});
  deletedTagNames = deletedTagNames.filter(nm=>nm!==name); saveDeletedTags();
  const t = {id: Math.max(0,...tags.map(x=>x.id))+1, name, nw:true};
  if(tags.some(x=>x.ord!==undefined)) t.ord = Math.max(...tags.map(x=>x.ord||0))+1;
  tags.push(t);
  sortTags();
  saveTags();
  return t;
}
$("pubReset").onclick = ()=> clearPubOrder();
/* ——— DODAWANIE Z NAGŁÓWKA KOLUMNY ———
   Dwa przyciski, „Nowa etykieta" i „Nowa sekcja", stały nad listą na stałe
   i zabierały jej ponad czterdzieści pikseli wysokości — na czynności robione
   raz na jakiś czas. Teraz jest tam plus, a pod nim jedno i drugie.

   Same przyciski zostają w stronie (ukryte) i to one nadal trzymają działania:
   menu tylko je naciska. Przepisanie ich treści tutaj znaczyłoby dwa miejsca
   z tą samą logiką, a jedno z nich zawsze zostaje w tyle. */
if($("btnTagPlus")) $("btnTagPlus").onclick = e=>{
  e.stopPropagation();
  const dd = $("dropdown");
  if(dd.style.display==="block" && dd.dataset.rodzaj==="tagPlus"){ dd.style.display="none"; return; }
  dd.dataset.rodzaj = "tagPlus";
  dd.innerHTML =
    '<div data-plus="tag">' + ICO.tag + 'Nowa etykieta</div>' +
    '<div data-plus="sec">' + ICO.bookmark + 'Nowa sekcja</div>';
  dd.style.display = "block";
  if(typeof oznaczPozycjeMenu==="function") oznaczPozycjeMenu(dd);
  placeDropdown(dd, $("btnTagPlus"));
  dd.onclick = ev=>{
    const it = ev.target.closest("[data-plus]"); if(!it) return;
    dd.style.display = "none";
    $(it.dataset.plus==="tag" ? "btnNewTag" : "btnNewSec").click();
  };
};

loadPubOrder();
$("btnNewSec").onclick = createSection;
$("btnNewTag").onclick = async ()=>{
  const name = await askText({title:"Nowa etykieta", placeholder:"Nazwa etykiety", okLabel:"Utwórz"});
  if(name && name.trim()){
    const t = createTag(name);
    renderTags(); toast("Utworzono zakładkę „"+t.name+"”");
  }
};
let deletedTagNames = [];
function saveDeletedTags(){ if(idb) idbPut("meta", deletedTagNames, "deletedTags").catch(()=>{}); }
async function deleteTag(t){
  const cnt = notes.filter(n=>!n.del && n.tg.includes(t.id)).length;
  if(!(await askConfirm("Usunąć zakładkę?", "Zakładka „"+esc(t.name)+"”."+(cnt?"<br><br>Notatki ("+cnt+") NIE zostaną usunięte — stracą tylko tę zakładkę.":""), {okLabel:"Usuń", danger:true}))) return;
  pushUndo({type:"delTag", label:"usunięcie zakładki „"+t.name+"”", name:t.name, orig:t.orig, tags:cloneTags(), notes:notes.filter(n=>n.tg.includes(t.id)).map(cloneNote)});
  if(t.name && !deletedTagNames.includes(t.name)) deletedTagNames.push(t.name);
  if(t.orig && !deletedTagNames.includes(t.orig)) deletedTagNames.push(t.orig);
  saveDeletedTags();
  tags = tags.filter(x=>x.id!==t.id);
  const affected = [];
  notes.forEach(n=>{ if(n.tg.includes(t.id)){ n.tg=n.tg.filter(x=>x!==t.id); n.tgd=true; affected.push(n); } });
  if(idb){ idbDelKey("tags", t.id).catch(()=>{}); if(affected.length) idbBulkChunked("notes", affected).catch(e=>reportSaveError(e,"notatki")); }
  bumpDirty();
  if(filt.tag===t.id){ filt.tag="all"; persistFilt(); }
  renderAll(); toast("Usunięto zakładkę „"+t.name+"”");
}
async function renameTag(id){
  const t = tags.find(x=>x.id===id); if(!t) return;
  const name = await askText({title:"Zmień nazwę zakładki", value:t.name, okLabel:"Zapisz"});
  if(!name || !name.trim() || name.trim()===t.name) return;
  if(tags.find(x=>x.name===name.trim())){ toast("Zakładka o tej nazwie już istnieje."); return; }
  pushUndo({type:"tags", label:"zmianę nazwy zakładki", tags:cloneTags()});
  if(!t.orig) t.orig = t.name;   // zapamiętaj oryginalną nazwę do eksportu
  t.name = name.trim();
  deletedTagNames = deletedTagNames.filter(nm=>nm!==t.name);
  saveDeletedTags();
  sortTags();
  saveTags(); renderAll(); toast("Zmieniono nazwę zakładki");
}
