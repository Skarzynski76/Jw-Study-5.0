/* ==========================================================================
   JW Study — highlight.js
   Kolorowanie zaznaczonego tekstu
   ========================================================================== */
"use strict";
/* ================= KOLOROWANIE ZAZNACZEŃ ================= */
const hlBar = $("hlBar");
const touchUI = ()=> matchMedia("(hover: none)").matches || isIOS();
function zapamietajKolor(i){
  let stare=[]; try{ stare=JSON.parse(lsGet(KP+"HlRecent","[]")); }catch(_){}
  const a=[+i,...(Array.isArray(stare)?stare:[]).map(Number).filter(x=>x!==+i)].slice(0,7);
  lsSet(KP+"HlRecent",JSON.stringify(a));
}
function renderHlBar(){
  const wybrany=+(lsGet(KP+"HlColor","1")||1);
  hlBar.innerHTML = [1,2,3,4,5,6,7].map(i=>`<div class="sw${i===wybrany?" sel":""}" style="background:var(--hl${i})" data-hl="${i}" title="Podświetl"></div>`).join("") +
    `<button class="tb" data-hl="0" title="Usuń kolor">⌫</button>
     <span class="sep"></span>
     <button class="tb fmt" data-fmt="b" title="Pogrubienie"><b>B</b></button>
     <button class="tb fmt" data-fmt="i" title="Kursywa"><i>I</i></button>
     <button class="tb fmt" data-fmt="u" title="Podkreślenie"><u>U</u></button>
     <button class="tb" data-search-selection title="Szukaj na podstawie zaznaczenia" aria-label="Szukaj na podstawie zaznaczenia">⌕</button>`;
}
renderHlBar();
function showHlBar(){
  const sel=getSelection();
  if(sel.isCollapsed||!sel.rangeCount){
    hlBar.style.display="none";
    document.body.classList.remove("ma-zaznaczenie");
    return;
  }
  const range=sel.getRangeAt(0);
  const cac=range.commonAncestorContainer;
  const el=cac.nodeType===1?cac:cac.parentElement;
  const cont=el?el.closest(".ncard .ncontent"):null;
  if(!cont){ hlBar.style.display="none"; document.body.classList.remove("ma-zaznaczenie"); return; }
  // podczas edycji (także pisania Apple Pencil) nie wyskakuj z paskiem kolorów —
  // formatowanie jest wtedy w pasku edycji, a Scribble musi mieć spokój
  if(cont.isContentEditable){ hlBar.style.display="none"; document.body.classList.remove("ma-zaznaczenie"); return; }
  /* Safari potrafi zwrócić pusty prostokąt dla zaznaczenia przez kilka wierszy.
     Bierzemy wtedy rzeczywisty, widoczny fragment zakresu, nie punkt 0×0. */
  const prostokaty = range.getClientRects ? [...range.getClientRects()].filter(x=>x.width||x.height) : [];
  const pierwszy = prostokaty.length ? prostokaty[0] : range.getBoundingClientRect();
  const ostatni = prostokaty.length ? prostokaty[prostokaty.length-1] : pierwszy;
  const granice = prostokaty.length ? prostokaty.reduce((a,x)=>({
    left:Math.min(a.left,x.left), right:Math.max(a.right,x.right),
    top:Math.min(a.top,x.top), bottom:Math.max(a.bottom,x.bottom)
  }),{left:pierwszy.left,right:pierwszy.right,top:pierwszy.top,bottom:pierwszy.bottom})
  : {left:pierwszy.left,right:pierwszy.right,top:pierwszy.top,bottom:pierwszy.bottom};
  hlBar.style.display="flex";
  document.body.classList.add("ma-zaznaczenie");
  const w = Math.min(hlBar.offsetWidth || 380, innerWidth-16);
  const h = hlBar.offsetHeight || 52;
  /* Granice bierzemy z obszaru FAKTYCZNIE widocznego, nie z wysokości okna.
     Przy otwartej klawiaturze okno zostaje tej samej wysokości, tylko dolna
     część jest zasłonięta — pasek liczony ze starych granic lądował pod nią. */
  const ob = (typeof widocznyObszar==="function") ? widocznyObszar()
           : {lewo:0, gora:0, prawo:innerWidth, dol:innerHeight};
  const wLewo = (x)=>Math.max(ob.lewo+8, Math.min(x, ob.prawo-w-8));
  hlBar.style.bottom="auto";
  hlBar.classList.remove("pod-zazn","nad-zazn","obok-zazn");
  if(touchUI()){
    /* Systemowy callout jest w czytniku wyłączony. Paleta trzyma się jednej,
       przewidywalnej zasady: nad tekstem, a tylko przy górnej krawędzi pod nim. */
    const dok=document.querySelector("#fsWrap .ncard:not(.editing) .ntools");
    const dokRect=dok ? dok.getBoundingClientRect() : null;
    const dokTop=dokRect && dokRect.height>0 ? dokRect.top : ob.dol;
    const bezpiecznyDol=Math.min(ob.dol,dokTop)-8;
    const odstep=16;
    const pod=granice.bottom+odstep;
    const nad=granice.top-h-odstep;
    let y=(nad>=ob.gora+8) ? nad : pod;
    if(y+h>bezpiecznyDol) y=Math.max(ob.gora+8,granice.top-h-odstep);
    y=Math.max(ob.gora+8,Math.min(y,bezpiecznyDol-h));
    const cx=(granice.left+granice.right)/2;
    const lewo=wLewo(cx-w/2);
    hlBar.style.left=lewo+"px";
    hlBar.style.top=y+"px";
    hlBar.classList.add(y>=granice.bottom?"pod-zazn":"nad-zazn");
  } else {
    const lewo=wLewo(pierwszy.left+pierwszy.width/2-w/2);
    hlBar.style.left=lewo+"px";
    hlBar.style.setProperty("--hlWsk", Math.max(14,Math.min(w-14,pierwszy.left+pierwszy.width/2-lewo))+"px");
    hlBar.style.top = Math.max(ob.gora + 8,
                        Math.min(pierwszy.top - h - 8, ob.dol - h - 8)) + "px";
    hlBar.classList.add("nad-zazn");
  }
}
document.addEventListener("mouseup", e=>{
  if(e.target && e.target.closest && e.target.closest("#hlBar")) return;
  setTimeout(showHlBar,10);
});
// iPad/iPhone: pasek kolorów pojawia się szybko po zaznaczeniu palcem lub rysikiem
let selTimer=null;
document.addEventListener("selectionchange", ()=>{
  clearTimeout(selTimer);
  selTimer=setTimeout(showHlBar, touchUI()?90:30);
});
// po puszczeniu palca/rysika pokaż pasek od razu (bez wyczuwalnego opóźnienia)
document.addEventListener("touchend", ()=>{ setTimeout(showHlBar, 70); }, {passive:true});
document.addEventListener("pointerup", e=>{ if(e.pointerType==="pen"||e.pointerType==="touch") setTimeout(showHlBar, 70); }, {passive:true});
/* iOS potrafi pokazać menu systemowe niezależnie od media query, zwłaszcza
   z gładzikiem. Blokujemy zdarzenie wyłącznie w nieedytowanym czytniku. */
document.addEventListener("contextmenu", e=>{
  const cont=e.target && e.target.closest ? e.target.closest("#modalFs #fsWrap .ncard:not(.editing) .ncontent") : null;
  if(cont) e.preventDefault();
}, true);
// kliknięcie w pokolorowany fragment (poza edycją) → zaznacz go i pokaż paletę do zmiany koloru
document.addEventListener("click", e=>{
  const m = e.target && e.target.closest ? e.target.closest(".ncard .ncontent mark") : null;
  if(!m || m.closest('[contenteditable="true"]')) return;
  const range=document.createRange(); range.selectNodeContents(m);
  const sel=getSelection(); sel.removeAllRanges(); sel.addRange(range);
  setTimeout(showHlBar, 0);
});
function saveContentEl(contEl, n){
  pushUndo({type:"note", label:"zmianę w treści notatki", before:cloneNote(n)});
  contEl.querySelectorAll(".qhl").forEach(s=>{ s.replaceWith(...s.childNodes); });
  if(typeof przPrzenumeruj==="function") przPrzenumeruj(contEl);
  const clean=sanitize(contEl.innerHTML);
  contEl.innerHTML=hilite(clean);
  autolinkRefs(contEl);
  if(typeof odswiezOdnosnikiNotatek==="function") odswiezOdnosnikiNotatek(contEl);
  if(typeof przPrzenumeruj==="function") przPrzenumeruj(contEl);
  n.h=clean; n.c=htmlToPlain(clean);
  markDirty(n);
  /* Kolor został już naniesiony bezpośrednio w bieżącym DOM. Przerysowanie listy
     zmieniało kolejność wg daty modyfikacji i przesuwało kartę spod palca.
     Zostawiamy więc kartę dokładnie na miejscu i aktualizujemy jej wpis w cache. */
  const card=contEl.closest && contEl.closest(".ncard");
  if(fsGuid){ fsListDirty=true; }
  else if(card){
    const data=card.querySelector(".pill.date");
    if(data){
      const tmp=document.createElement("div"); tmp.innerHTML=noteCardDate(n);
      if(tmp.firstElementChild) data.replaceWith(tmp.firstElementChild);
    }
    const hit=_cardCache.get(n.g);
    if(hit && hit.node===card){ hit.sig=noteCardSig(n); hit.note=n; }
  }
}
hlBar.addEventListener("pointerdown", e=>{
  e.preventDefault();
  const t = e.target.closest("[data-hl],[data-fmt]");
  if(!t) return;
  const sel=getSelection();
  if(!sel.rangeCount||sel.isCollapsed) return;
  const range=sel.getRangeAt(0);
  const base=range.commonAncestorContainer;
  const el=base.nodeType===1?base:base.parentElement;
  const contEl=el?el.closest(".ncard .ncontent"):null;
  if(!contEl) return;
  const card=contEl.closest(".ncard");
  const n=notes.find(x=>x.g===card.dataset.g);
  const hl=t.dataset.hl, fmt=t.dataset.fmt;
  if(fmt){ wrapTag(range, fmt); }
  else if(hl==="0") unwrapMarks(range,contEl);
  else { applyMark(range,+hl); lsSet(KP+"HlColor",String(hl)); zapamietajKolor(+hl); }
  if(sel.rangeCount) sel.removeAllRanges();
  hlBar.style.display="none";
  document.body.classList.remove("ma-zaznaczenie");
  renderHlBar();
  saveContentEl(contEl, n);
}, true);
function przesuniecieTekstu(cont,node,offset){
  const r=document.createRange(); r.selectNodeContents(cont); r.setEnd(node,offset);
  return r.toString().length;
}
function nalozKolorNaPrzedzial(cont,pocz,kon,color){
  if(kon<=pocz) return;
  const walker=document.createTreeWalker(cont,NodeFilter.SHOW_TEXT);
  const trafione=[]; let node,pozycja=0;
  while(node=walker.nextNode()){
    const nast=pozycja+node.nodeValue.length;
    const a=Math.max(0,pocz-pozycja), b=Math.min(node.nodeValue.length,kon-pozycja);
    if(b>a) trafione.push({node,a,b});
    pozycja=nast; if(pozycja>=kon) break;
  }
  /* Od końca, aby splitText nie przesuwał granic wcześniejszych fragmentów. */
  for(let i=trafione.length-1;i>=0;i--){
    const x=trafione[i]; let tekst=x.node;
    if(x.b<tekst.nodeValue.length) tekst.splitText(x.b);
    if(x.a>0) tekst=tekst.splitText(x.a);
    const mark=document.createElement("mark"); mark.className="hl"+color;
    tekst.parentNode.insertBefore(mark,tekst); mark.appendChild(tekst);
  }
}
function przebudujKolory(range,cont,color){
  /* Zapisujemy kolory jako przedziały znaków, zdejmujemy WSZYSTKIE znaczniki,
     a potem budujemy je od nowa. Dzięki temu zaznaczenie zaczynające się
     wewnątrz starego <mark> nie może utworzyć drugiego <mark> w jego środku. */
  const dl=(cont.textContent||"").length, kolory=new Uint8Array(dl);
  [...cont.querySelectorAll("mark")].forEach(m=>{
    const k=+(((m.className||"").match(/hl([1-7])/)||[])[1]||0); if(!k) return;
    const r=document.createRange(); r.selectNodeContents(m);
    const a=przesuniecieTekstu(cont,r.startContainer,r.startOffset);
    const b=przesuniecieTekstu(cont,r.endContainer,r.endOffset);
    kolory.fill(k,Math.max(0,a),Math.min(dl,b));
  });
  const pocz=przesuniecieTekstu(cont,range.startContainer,range.startOffset);
  const kon=przesuniecieTekstu(cont,range.endContainer,range.endOffset);
  kolory.fill(color||0,Math.max(0,pocz),Math.min(dl,kon));
  [...cont.querySelectorAll("mark")].reverse().forEach(m=>m.replaceWith(...m.childNodes));
  cont.normalize();
  const przedzialy=[]; let i=0;
  while(i<dl){
    const k=kolory[i], a=i; while(i<dl&&kolory[i]===k)i++;
    if(k) przedzialy.push({a,b:i,k});
  }
  for(let j=przedzialy.length-1;j>=0;j--){
    const x=przedzialy[j]; nalozKolorNaPrzedzial(cont,x.a,x.b,x.k);
  }
  cont.querySelectorAll("mark:empty").forEach(m=>m.remove());
}
function applyMark(range,color){
  const cont=(range.commonAncestorContainer.nodeType===1
    ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement).closest(".ncontent");
  if(cont) przebudujKolory(range,cont,color);
}
function wrapTag(range,tag){
  const el=document.createElement(tag);
  try{ range.surroundContents(el); }
  catch(err){ const frag=range.extractContents(); el.appendChild(frag); range.insertNode(el); }
}
function unwrapMarks(range,contEl){
  przebudujKolory(range,contEl,0);
}
