/* ==========================================================================
   JW Study — images.js
   Obrazy w notatce: rozmiar, oblewanie tekstem, wstawianie dotykiem
   ========================================================================== */
"use strict";
/* ===== pasek narzędzi obrazu (rozmiar / oblewanie tekstem — jak w Wordzie) ===== */
let selImg = null;
function imgFigure(img){return img&&img.closest?img.closest("figure.note-figure"):null;}
function imgLayoutTarget(img){return imgFigure(img)||img;}
function imgMoveNode(img){return imgFigure(img)||img;}
function imgUstawWyrownanie(img,klasa){
  const cel=imgLayoutTarget(img);["img-left","img-right","img-center","img-inline"].forEach(c=>cel.classList.remove(c));cel.classList.add(klasa);
  if(cel!==img)["img-left","img-right","img-center","img-inline"].forEach(c=>img.classList.remove(c));
}
function imgObroc(img,kier){
  const klasy=["","img-rot-90","img-rot-180","img-rot-270"];let i=klasy.findIndex(c=>c&&img.classList.contains(c));if(i<0)i=0;
  klasy.slice(1).forEach(c=>img.classList.remove(c));i=(i+(kier>0?1:3))%4;if(klasy[i])img.classList.add(klasy[i]);
  commitLiveEdit(img.closest(".ncontent"));showImgBar(img);
}
async function imgPodpis(img){
  const dotychczas=imgFigure(img)?.querySelector("figcaption")?.textContent||"";
  const txt=await askText({title:"Podpis ilustracji",value:dotychczas,placeholder:"Krótki opis ilustracji",okLabel:"Zapisz"});if(txt===null)return;
  let fig=imgFigure(img);
  if(!fig){
    fig=document.createElement("figure");fig.className="note-figure";
    const al=["img-left","img-right","img-center","img-inline"].find(c=>img.classList.contains(c))||"img-center";fig.classList.add(al);
    fig.style.width=img.style.width||"60%";img.parentNode.insertBefore(fig,img);fig.appendChild(img);
    ["img-left","img-right","img-center","img-inline"].forEach(c=>img.classList.remove(c));img.style.width="100%";
  }
  let cap=fig.querySelector("figcaption");if(!txt){if(cap)cap.remove();}else{if(!cap){cap=document.createElement("figcaption");fig.appendChild(cap);}cap.textContent=txt;img.alt=txt;}
  commitLiveEdit(img.closest(".ncontent"));showImgBar(img);toast(txt?"Dodano podpis":"Usunięto podpis");
}
function showImgBar(img){
  selImg = img;
  document.querySelectorAll(".ncontent img.imgsel").forEach(i=>{ if(i!==img) i.classList.remove("imgsel"); });
  img.classList.add("imgsel");
  const bar = $("imgBar"); bar.style.display = "flex";
  const r = img.getBoundingClientRect();
  const bw = bar.offsetWidth || 320, bh = bar.offsetHeight || 44;
  const _ob = (typeof widocznyObszar==="function") ? widocznyObszar()
            : {lewo:0, gora:0, prawo:innerWidth, dol:innerHeight, szer:innerWidth};
  bar.style.left = Math.max(_ob.lewo + 8, Math.min(r.left, _ob.prawo - bw - 8)) + "px";
  let top = r.top - bh - 8; if(top < 8) top = r.bottom + 8;
  bar.style.top = Math.max(_ob.gora + 8, Math.min(top, _ob.dol - bh - 8)) + "px";
  const si = document.getElementById("imgSize");
  if(si){
    const cel=imgLayoutTarget(img);let wv = parseInt(cel.style.width);
    if(!wv){ const pw = cel.parentElement ? cel.parentElement.getBoundingClientRect().width : 1; wv = Math.round(cel.getBoundingClientRect().width / (pw||1) * 100); }
    si.value = Math.max(10, Math.min(100, wv || 60));
  }
  positionHandles(img);
}
function positionHandles(img){
  const h = document.getElementById("imgHandles"); if(!h) return;
  const r = img.getBoundingClientRect();
  h.style.display = "block";
  h.style.left = r.left + "px"; h.style.top = r.top + "px";
  h.style.width = r.width + "px"; h.style.height = r.height + "px";
}
function hideImgBar(){
  const b = $("imgBar"); if(b) b.style.display = "none";
  const h = document.getElementById("imgHandles"); if(h) h.style.display = "none";
  document.querySelectorAll(".ncontent img.imgsel").forEach(i=>i.classList.remove("imgsel"));
  selImg = null;
}
document.querySelectorAll("#imgHandles .h").forEach(handle=>{
  handle.addEventListener("pointerdown", e=>{
    if(!selImg) return;
    e.preventDefault(); e.stopPropagation();
    const leftSide = handle.classList.contains("tl") || handle.classList.contains("bl");
    const startX = e.clientX;
    const cel=imgLayoutTarget(selImg);
    const parentW = (cel.parentElement ? cel.parentElement.getBoundingClientRect().width : cel.getBoundingClientRect().width) || 1;
    const startW = cel.getBoundingClientRect().width;
    try{ handle.setPointerCapture(e.pointerId); }catch(_){}
    const move = ev=>{
      let dx = ev.clientX - startX; if(leftSide) dx = -dx;
      let pct = Math.round((startW + dx) / parentW * 100);
      pct = Math.max(10, Math.min(100, pct));
      cel.classList.remove("img-s","img-m","img-l");
      cel.style.width = pct + "%";
      positionHandles(selImg);
      const si = document.getElementById("imgSize"); if(si) si.value = pct;
    };
    const up = ()=>{
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      commitLiveEdit(selImg && selImg.closest(".ncontent"));
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  });
});
$("imgBar").addEventListener("pointerdown", e=>{
  if(e.target.closest("#imgSize")) return;   // pozwól przeciągać suwak
  e.preventDefault();
  if(!selImg) return;
  if(e.target.closest("[data-imove]")){ startImgMove(); return; }
  const w = e.target.closest("[data-iw]"), del = e.target.closest("[data-idel]"),rot=e.target.closest("[data-irot]"),cap=e.target.closest("[data-icap]");
  if(w){imgUstawWyrownanie(selImg,w.dataset.iw);commitLiveEdit(selImg.closest(".ncontent"));}
  else if(rot){imgObroc(selImg,+rot.dataset.irot);return;}
  else if(cap){const im=selImg;imgPodpis(im);return;}
  else if(del){ const im = selImg; const ce = im.closest(".ncontent"),node=imgMoveNode(im); hideImgBar(); node.remove(); commitLiveEdit(ce); return; }
  showImgBar(selImg);
});
document.getElementById("imgSize").addEventListener("input", e=>{
  if(!selImg) return;
  const cel=imgLayoutTarget(selImg);cel.classList.remove("img-s","img-m","img-l");
  cel.style.width = e.target.value + "%";
});
document.getElementById("imgSize").addEventListener("change", e=>{
  if(selImg) commitLiveEdit(selImg.closest(".ncontent"));
});
let suppressImgClick = false;
document.addEventListener("click", e=>{
  if(movePending) return;   // w trybie przenoszenia obsługą zajmuje się placeImgAt
  if(suppressImgClick){ suppressImgClick = false; return; }
  const img = e.target && e.target.closest ? e.target.closest(".ncontent img") : null;
  if(img && img.closest('[contenteditable="true"]')){ e.preventDefault(); showImgBar(img); return; }
  const c = e.target && e.target.closest ? e.target : null;
  if(!c || (!c.closest("#imgBar") && !c.closest("#imgHandles"))) hideImgBar();
});

/* ===== przenoszenie zdjęcia: „dotknij, by umieścić” (niezawodne na dotyku) ===== */
let movePending = null;
function caretRangeFromPoint(x,y){
  if(document.caretRangeFromPoint) return document.caretRangeFromPoint(x,y);
  if(document.caretPositionFromPoint){ const p=document.caretPositionFromPoint(x,y); if(p){ const r=document.createRange(); r.setStart(p.offsetNode,p.offset); r.collapse(true); return r; } }
  return null;
}
function startImgMoveFor(img){
  if(!img) return;
  movePending = img;
  document.body.classList.add("img-placing");
  hideImgBar();
  toast("Dotknij dokładnego miejsca w tekście. Możesz też przytrzymać ilustrację i przeciągnąć ją.");
}
function startImgMove(){ startImgMoveFor(selImg); }
function cancelImgMove(){ movePending=null; document.body.classList.remove("img-placing"); }
/* Najpierw umieszczamy nieruchomy znacznik, dopiero potem przenosimy istniejący
   węzeł obrazu. Bez tego zakres wskazujący rodzica potrafi przesunąć swój offset
   w chwili wyjęcia zdjęcia i wstawić je o akapit za daleko. */
function przeniesObrazDoRange(img,range,ce){
  try{
    const node=imgMoveNode(img),zn=document.createComment("miejsce-ilustracji");range.insertNode(zn);
    zn.parentNode.insertBefore(node,zn);zn.remove();return true;
  }catch(_){try{ce.appendChild(img);return true;}catch(__){return false;}}
}
/* wstawienie zdjęcia (z pliku, wklejenia lub upuszczenia) — jedna wspólna funkcja */
function insertImageUrl(ce, url, range){
  if(!ce) return null;
  const img=document.createElement("img"); img.src=url; img.alt="Ilustracja";
  /* Bezpieczny układ startowy: ilustracja jest osobnym, środkowym blokiem.
     Oblewanie tekstem można włączyć jednym przyciskiem po zaznaczeniu obrazu. */
  img.classList.add("img-center"); img.style.width="60%";
  if(typeof histZapisz==="function")histZapisz(ce);
  try{
    let r=(range && ce.contains(range.startContainer))?range.cloneRange():null;
    if(!r){ const sel=getSelection(); if(sel && sel.rangeCount && ce.contains(sel.getRangeAt(0).startContainer)) r=sel.getRangeAt(0).cloneRange(); }
    if(r){ r.deleteContents(); r.collapse(false); r.insertNode(img); }
    else ce.appendChild(img);
    /* Gdy obraz kończy notatkę, końcowy BR daje pewne miejsce do dalszego pisania
       na iPadzie. Ustawiamy kursor zaraz za ilustracją. */
    if(!img.nextSibling)img.parentNode.insertBefore(document.createElement("br"),img.nextSibling);
    const sel=getSelection(),po=document.createRange();po.setStartAfter(img);po.collapse(true);
    if(sel){sel.removeAllRanges();sel.addRange(po);}
  }catch(_){ try{ ce.appendChild(img); }catch(__){} }
  if(typeof histZapisz==="function")histZapisz(ce);
  commitLiveEdit(ce); showImgBar(img); toast("Wstawiono ilustrację — przeciągnij ją albo użyj przycisku przenoszenia");
  return img;
}
// umieszczenie: kliknij/dotknij miejsca w tekście, a zdjęcie tam wskoczy
function placeImgAt(e){
  if(!movePending) return;
  if(suppressImgClick){ suppressImgClick=false; return; }   // pomiń klik-zwolnienie po long-press
  if(e.target.closest("#imgBar") || e.target.closest("#imgHandles")) return;
  const ce = e.target.closest(".ncontent");
  if(!ce || !ce.isContentEditable) return;   // klik poza treścią — nie anuluj, pozwól spróbować ponownie
  const img = movePending;
  // 1) najpewniejsze: pozycja kursora z punktu kliknięcia
  let range = caretRangeFromPoint(e.clientX, e.clientY);
  if(!range || !ce.contains(range.startContainer)){
    const sel = getSelection();
    if(sel && sel.rangeCount && ce.contains(sel.getRangeAt(0).startContainer)) range = sel.getRangeAt(0).cloneRange();
  }
  // 2) ostatecznie: koniec treści (żeby zawsze coś się stało)
  if(!range || !ce.contains(range.startContainer)){
    range = document.createRange(); range.selectNodeContents(ce); range.collapse(false);
  }
  cancelImgMove();
  range.collapse(true);
  przeniesObrazDoRange(img,range,ce);
  commitLiveEdit(ce);
  showImgBar(img);
  toast("Przeniesiono zdjęcie");
}
document.addEventListener("click", placeImgAt);
/* nie pozwól iOS uruchomić natywnego przeciągania obrazka w edytowanej notatce */
document.addEventListener("dragstart", e=>{ if(e.target && e.target.closest && e.target.closest('.ncontent[contenteditable="true"] img')) e.preventDefault(); });
/* WKLEJANIE obrazu (Ctrl/Cmd+V lub „Wklej") do edytowanej notatki */
document.addEventListener("paste", async e=>{
  const ce = e.target && e.target.closest && e.target.closest('.ncontent[contenteditable="true"]');
  if(!ce) return;
  const cd = e.clipboardData; if(!cd) return;
  // 1) obraz w schowku
  const items = cd.items;
  if(items){ for(const it of items){
    if(it.type && it.type.indexOf("image")===0){
      e.preventDefault();
      const f=it.getAsFile(), miejsce=captureRange();
      if(f){ try{ const url=await compressImage(f); if(!(await checkSpaceForImage(url.length))) return; insertImageUrl(ce, url, miejsce); }catch(err){ toast("Nie udało się wkleić obrazu"); } }
      return;
    }
  } }
  // 2) tekst — wklej jako CZYSTY tekst (bez obcej czcionki/kolorów), żeby pasował do notatki
  const txt = cd.getData("text/plain");
  if(txt!==""){
    e.preventDefault();
    if(typeof histZapisz==="function")histZapisz(ce);
    if(!wstawCzystyTekst(ce,txt)) document.execCommand("insertText", false, txt);
    if(typeof histZapisz==="function")histZapisz(ce);
    commitLiveEdit(ce);
  }
});
/* PRZECIĄGNIJ plik obrazu z pulpitu na edytowaną notatkę (komputer) */
document.addEventListener("dragover", e=>{
  const ce = e.target && e.target.closest && e.target.closest('.ncontent[contenteditable="true"]');
  if(ce && e.dataTransfer && Array.from(e.dataTransfer.types||[]).indexOf("Files")>=0) e.preventDefault();
});
document.addEventListener("drop", async e=>{
  const ce = e.target && e.target.closest && e.target.closest('.ncontent[contenteditable="true"]');
  if(!ce) return;
  const files = e.dataTransfer && e.dataTransfer.files;
  if(files && files.length && Array.from(files).some(f=>f.type && f.type.indexOf("image")===0)){
    e.preventDefault();
    let range = caretRangeFromPoint(e.clientX, e.clientY);
    if(!(range && ce.contains(range.startContainer))) range=null;
    for(const f of files){ if(f.type && f.type.indexOf("image")===0){ try{ const url=await compressImage(f); if(!(await checkSpaceForImage(url.length))) return; insertImageUrl(ce, url, range); range=null; }catch(_){} } }
  }
});
/* ===== BEZPOŚREDNIE PRZECIĄGANIE ZDJĘCIA =====
   Mysz/gładzik: chwyć i przesuń. Palec/rysik: krótkie przytrzymanie, potem
   przesuń bez odrywania. Klasa opływania (lewo/prawo/środek/w linii) nie jest
   zmieniana — przenosimy tylko pozycję obrazu w treści. */
const IMG_DRAG_HOLD=340, IMG_DRAG_PROG=6, IMG_DRAG_EDGE=72;
let imgDrag=null;
function imgDragRange(x,y,ce){
  let r=caretRangeFromPoint(x,y);
  if(!r || !ce.contains(r.startContainer)) return null;
  if(imgDrag){const node=imgMoveNode(imgDrag.img);if(r.startContainer===node||node.contains(r.startContainer))return null;}
  try{r=r.cloneRange();r.collapse(true);return r;}catch(_){return null;}
}
function imgDragCaret(r,x,y){
  const c=$("dropCaret"); if(!c)return;
  if(!r){c.style.display="none";return;}
  let rr=null;
  try{const rs=typeof r.getClientRects==="function"?[...r.getClientRects()]:[];rr=rs[0]||null;}catch(_){}
  const el=r.startContainer&&r.startContainer.nodeType===1?r.startContainer:r.startContainer&&r.startContainer.parentElement;
  if(!rr&&el&&el.getBoundingClientRect)rr=el.getBoundingClientRect();
  const ob=(typeof widocznyObszar==="function")?widocznyObszar():{lewo:0,gora:0,prawo:innerWidth,dol:innerHeight};
  const left=Math.max(ob.lewo+3,Math.min((rr&&isFinite(rr.left)?rr.left:x),ob.prawo-7));
  const top=Math.max(ob.gora+3,Math.min((rr&&isFinite(rr.top)?rr.top:y-12),ob.dol-29));
  c.style.left=left+"px";c.style.top=top+"px";c.style.height=Math.max(25,Math.min(44,(rr&&rr.height)||28))+"px";c.style.display="block";
}
function imgDragScrollHost(ce){
  return ce.closest(".fsmodal")||ce.closest(".list")||document.scrollingElement||document.documentElement;
}
function imgDragAt(x,y){
  const s=imgDrag;if(!s||!s.active)return;
  s.x=x;s.y=y;s.ghost.style.left=x+"px";s.ghost.style.top=y+"px";
  const r=imgDragRange(x,y,s.ce);if(r)s.range=r;
  imgDragCaret(r,x,y);
}
function imgDragKlatka(){
  const s=imgDrag;if(!s||!s.active)return;
  const ob=(typeof widocznyObszar==="function")?widocznyObszar():{gora:0,dol:innerHeight};
  let krok=0;
  if(s.y<ob.gora+IMG_DRAG_EDGE)krok=-Math.ceil((ob.gora+IMG_DRAG_EDGE-s.y)/7);
  else if(s.y>ob.dol-IMG_DRAG_EDGE)krok=Math.ceil((s.y-(ob.dol-IMG_DRAG_EDGE))/7);
  krok=Math.max(-16,Math.min(16,krok));
  if(krok){const h=s.scrollHost;if(h===document.scrollingElement||h===document.documentElement)scrollBy(0,krok);else if(h&&typeof h.scrollBy==="function")h.scrollBy(0,krok);else if(h)h.scrollTop+=krok;imgDragAt(s.x,s.y);}
  s.raf=requestAnimationFrame(imgDragKlatka);
}
function imgDragAktywuj(){
  const s=imgDrag;if(!s||s.active)return;
  clearTimeout(s.timer);s.active=true;suppressImgClick=true;
  if(typeof histZapisz==="function")histZapisz(s.ce);
  const n=notes.find(x=>x.g===(s.ce.closest(".ncard")||{}).dataset?.g);
  s.before=n&&typeof cloneNote==="function"?cloneNote(n):null;
  hideImgBar();document.body.classList.add("img-dragging");s.img.classList.add("img-drag-source");s.img.setAttribute("aria-grabbed","true");
  const ghost=s.img.cloneNode(true);ghost.className="img-drag-ghost";ghost.removeAttribute("style");document.body.appendChild(ghost);s.ghost=ghost;
  try{const sel=getSelection();if(sel&&sel.removeAllRanges)sel.removeAllRanges();}catch(_){}
  imgDragAt(s.x,s.y);s.raf=requestAnimationFrame(imgDragKlatka);
}
function imgDragSprzataj(pokaz){
  const s=imgDrag;if(!s)return;
  clearTimeout(s.timer);if(s.raf)cancelAnimationFrame(s.raf);
  if(s.ghost)s.ghost.remove();$("dropCaret").style.display="none";
  s.img.classList.remove("img-drag-source");s.img.removeAttribute("aria-grabbed");document.body.classList.remove("img-dragging");
  imgDrag=null;if(pokaz&&s.img.isConnected)showImgBar(s.img);
}
function imgDragUp(e,anuluj){
  const s=imgDrag;if(!s||e.pointerId!==s.pointerId)return;
  if(!s.active){imgDragSprzataj(true);return;}
  e.preventDefault();
  if(!anuluj&&s.range){
    przeniesObrazDoRange(s.img,s.range,s.ce);
    if(s.before&&typeof pushUndo==="function")pushUndo({type:"note",label:"przeniesienie ilustracji",before:s.before});
    if(typeof histZapisz==="function")histZapisz(s.ce);
    commitLiveEdit(s.ce);imgDragSprzataj(true);toast("Przeniesiono zdjęcie");
  }else{imgDragSprzataj(true);if(anuluj)toast("Przenoszenie anulowane");}
}
document.addEventListener("pointerdown",e=>{
  if(e.button!==undefined&&e.button!==0)return;
  const img=e.target.closest&&e.target.closest('.ncontent[contenteditable="true"] img');
  if(!img||e.target.closest("#imgHandles")||movePending)return;
  if(imgDrag)imgDragSprzataj(false);
  const ce=img.closest('.ncontent[contenteditable="true"]');
  imgDrag={img,ce,pointerId:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,
    active:false,range:null,ghost:null,timer:0,raf:0,scrollHost:imgDragScrollHost(ce),pointerType:e.pointerType||"mouse"};
  try{img.setPointerCapture(e.pointerId);}catch(_){}
  if(imgDrag.pointerType==="mouse"){}else imgDrag.timer=setTimeout(imgDragAktywuj,IMG_DRAG_HOLD);
  e.preventDefault();
},true);
document.addEventListener("pointermove",e=>{
  const s=imgDrag;if(!s||e.pointerId!==s.pointerId)return;
  s.x=e.clientX;s.y=e.clientY;
  const dyst=Math.hypot(e.clientX-s.startX,e.clientY-s.startY);
  if(!s.active&&s.pointerType==="mouse"&&dyst>=IMG_DRAG_PROG)imgDragAktywuj();
  if(s.active){e.preventDefault();imgDragAt(e.clientX,e.clientY);}
},{capture:true,passive:false});
document.addEventListener("pointerup",e=>imgDragUp(e,false),true);
document.addEventListener("pointercancel",e=>imgDragUp(e,true),true);
document.addEventListener("contextmenu",e=>{if(e.target.closest&&e.target.closest('.ncontent[contenteditable="true"] img'))e.preventDefault();},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&imgDrag){e.preventDefault();imgDragUp({pointerId:imgDrag.pointerId,preventDefault(){}},true);}});
addEventListener("blur",()=>{if(imgDrag)imgDragUp({pointerId:imgDrag.pointerId,preventDefault(){}},true);});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"&&imgDrag)imgDragUp({pointerId:imgDrag.pointerId,preventDefault(){}},true);});
/* zapisz treść, gdy pole edycji traci ostrość (np. dotknięcie pełnego ekranu) — chroni zdjęcia przed zniknięciem */
document.addEventListener("focusout", e=>{
  const ce = e.target && e.target.closest && e.target.closest('.ncontent[contenteditable="true"]');
  if(ce) commitLiveEdit(ce);
}, true);
addEventListener("scroll", ()=>{ if(selImg && $("imgBar").style.display==="flex") showImgBar(selImg); }, {capture:true, passive:true});
addEventListener("resize", ()=>{ if(selImg) hideImgBar(); });
addEventListener("orientationchange", ()=>{ if(selImg) hideImgBar(); });
function captureRange(){
  const s = getSelection();
  return s.rangeCount ? s.getRangeAt(0).cloneRange() : null;
}
async function compressImage(file){
  const dataUrl = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });
  const img = await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=dataUrl; });
  const max = 1000; let w=img.width, h=img.height;
  if(Math.max(w,h)>max){ const k=max/Math.max(w,h); w=Math.round(w*k); h=Math.round(h*k); }
  const cv = document.createElement("canvas"); cv.width=w; cv.height=h;
  cv.getContext("2d").drawImage(img,0,0,w,h);
  return cv.toDataURL("image/jpeg", 0.78);
}
/**
 * Włącza albo kończy edycję notatki w miejscu (contenteditable).
 * Przy włączaniu: rozwija podświetlenia, dokłada pasek narzędzi edytora.
 * Przy kończeniu: zapisuje wersję do historii, odkłada operację na stos cofania,
 * czyści HTML (sanitize) i zapisuje notatkę.
 * @param {HTMLElement} card  karta notatki
 * @param {Note} n
 */
function toggleEdit(card,n){
  /* Zapis już trwa: drugie szybkie dotknięcie nie może ponownie otworzyć
     edytora ani uruchomić drugiego zapisu tej samej notatki. */
  if(card && card.dataset.saving==="1") return;
  /* NA TABLICY NIE EDYTUJEMY W MINIATURZE.
     Karteczka reaguje na dotknięcia (podnosi się, odkłada, przewija treść),
     więc pisanie w niej to walka gestów: próba przesunięcia kursora zwijała
     kartę i tekst uciekał. Miejsce do pisania musi być spokojne, a takim jest
     pełny ekran — więc tam przenosimy edycję, zamiast jej odbierać. */
  const naTablicy = card.closest && card.closest("#noteList.v-tablica");
  if(naTablicy && !card.classList.contains("editing")){
    if(typeof schowajKarteczke==="function") schowajKarteczke(true);
    if(typeof openFs==="function"){
      openFs(n);
      /* Czytnik buduje kartę od nowa, więc edycję włączamy dopiero na niej. */
      setTimeout(()=>{
        const wCzytniku = document.querySelector("#fsWrap .ncard");
        if(wCzytniku && !wCzytniku.classList.contains("editing")) toggleEdit(wCzytniku, n);
      }, 60);
      return;
    }
  }
  const editing = card.classList.contains("editing");
  const titleEl = card.querySelector(".ntitle");
  const contEl = card.querySelector(".ncontent");
  const btn = card.querySelector('[data-act="edit"]');
  if(!editing){
    card.classList.add("editing");
    contEl.querySelectorAll(".qhl").forEach(s=>{ s.replaceWith(...s.childNodes); });
    contEl.querySelectorAll("a.jwl-ref.auto").forEach(a=>{ a.replaceWith(document.createTextNode(a.textContent)); });
    titleEl.querySelectorAll(".qhl").forEach(s=>{ s.replaceWith(...s.childNodes); });
    /* Ustawiamy i własność, i atrybut. W przeglądarce jedno pociąga drugie, ale
     opieramy się na atrybucie w kilku miejscach — rysik po nim rozpoznaje, że
     ma nie przechwytywać zaznaczania — więc zapisujemy go wprost, zamiast
     ufać, że tak się stanie. */
  titleEl.contentEditable="true"; contEl.contentEditable="true";
  titleEl.setAttribute("contenteditable","true");
  contEl.setAttribute("contenteditable","true");
  /* Systemowy słownik iPadOS/macOS działa najlepiej, gdy pole jawnie podaje
     język oraz zezwala na korektę i wielkie litery na początku zdań. */
  [titleEl,contEl].forEach(el=>{el.setAttribute("lang","pl");el.setAttribute("spellcheck","true");el.setAttribute("autocorrect","on");el.setAttribute("autocapitalize","sentences");});
    try{ document.execCommand("styleWithCSS", false, false); }catch(e){}
    card.insertBefore(buildEditbar(n), contEl);
    btn.innerHTML=ICO.save+'<span class="sbtnTxt">Zapisz</span>';
    btn.classList.add("saveon"); btn.title="Zapisz zmiany";
    const stan=document.createElement("span");
    stan.className="editSaveState"; stan.dataset.state="saved";
    stan.setAttribute("role","status"); stan.setAttribute("aria-live","polite");
    stan.textContent="Zapisano";
    card.querySelector(".btnrow")?.insertBefore(stan,btn);
    contEl.style.display="block";
    contEl.focus();
    if(typeof histStart==="function") histStart(contEl);   // własna historia cofania
    /* Odczyt jest asynchroniczny i nie blokuje otwarcia edytora. Jeśli poprzednia
       sesja urwała się przed „Zapisz”, użytkownik sam decyduje o przywróceniu. */
    if(typeof szkicOdzyskaj==="function") szkicOdzyskaj(card,n);
    // w pełnym ekranie belka tytułu przestaje być przyklejona — trzeba przeliczyć rezerwę
    if(typeof zmierzNhead==="function") zmierzNhead();
    if(typeof updateFsNav==="function") updateFsNav();
  } else {
    if(outlineCe===contEl)zamknijSpisNotatki(true);
    schowajTableBar();
    szkicAnuluj(n.g);
    /* Najpierw utrwalamy dokładny stan DOM jako szkic ratunkowy. Czytnik może
       pokazać się od razu, ale do czasu zakończenia właściwego zapisu istnieje
       druga kopia tekstu. */
    const szkicPrzedZapisem=szkicZapisz(card,n,true);
    card.dataset.saving="1";
    btn.disabled=true;
    btn.innerHTML=ICO.save+'<span class="sbtnTxt">Zapisywanie…</span>';
    btn.classList.add("saveon"); btn.title="Trwa zapisywanie zmian";
    card.classList.remove("editing");
    hideImgBar();
    card.querySelector(".editbar")?.remove();
    if(typeof zmierzNhead==="function") zmierzNhead();   // belka wraca na swoje miejsce
    if(typeof updateFsNav==="function") updateFsNav();
    titleEl.contentEditable="false"; contEl.contentEditable="false";
  titleEl.setAttribute("contenteditable","false");
  contEl.setAttribute("contenteditable","false");
    saveVersion(n);   // zapisz poprzednią treść do historii wersji
    pushUndo({type:"note", label:"edycję notatki", before:cloneNote(n)});
    n.t = titleEl.textContent.trim();
    /* Numery przypisów liczą się z kolejności odsyłaczy — musi to się stać
       PRZED odczytaniem treści, inaczej do bazy trafiłyby stare numery. */
    if(typeof przPrzenumeruj==="function") przPrzenumeruj(contEl);
    const clean = sanitize(contEl.innerHTML);
    n.h = clean; n.c = htmlToPlain(clean);
    n.ed=true; n.mo=new Date().toISOString();
    ustawStanZapisu(contEl,"saving"); bumpDirty();
    Promise.resolve(szkicPrzedZapisem).then(()=>saveNote(n)).then(ok=>{
      if(ok){
        szkicUsun(n.g);
        delete card.dataset.saving;
        btn.disabled=false;
        btn.innerHTML=ICO.edit; btn.classList.remove("saveon"); btn.title="Edytuj notatkę";
        ustawStanZapisu(contEl,"saved"); renderAll(); toastOk("Zapisano zmiany");
        // krótkie mrugnięcie zapisanej karty — widać od razu, której notatki dotyczyła zmiana
        flashOk(document.querySelector('#noteList .ncard[data-g="'+CSS.escape(n.g)+'"]'));
      }else{
        /* Nie zamykamy edytora po nieudanym zapisie. Tekst nadal jest w DOM,
           a czerwony stan mówi wprost, że trzeba spróbować ponownie lub zrobić kopię. */
        delete card.dataset.saving;
        btn.disabled=false;
        card.classList.add("editing");
        titleEl.contentEditable="true"; contEl.contentEditable="true";
        titleEl.setAttribute("contenteditable","true"); contEl.setAttribute("contenteditable","true");
        if(!card.querySelector(".editbar")) card.insertBefore(buildEditbar(n),contEl);
        btn.innerHTML=ICO.save+'<span class="sbtnTxt">Zapisz</span>';
        btn.classList.add("saveon"); btn.title="Ponów zapis";
        ustawStanZapisu(contEl,"error"); contEl.focus();
        if(typeof updateFsNav==="function") updateFsNav();
      }
    });
  }
}
document.addEventListener("input", e=>{
  const pole=e.target && e.target.closest ? e.target.closest(".ncard.editing [contenteditable='true']") : null;
  if(pole) szkicZaplanuj(pole);
}, true);
/**
 * Czyści HTML wklejony lub wpisany w edytorze: zostawia dozwolone znaczniki i atrybuty,
 * usuwa skrypty, zdarzenia inline i style, które mogłyby rozjechać wygląd.
 * @param {string} html
 * @returns {string}
 */
/** Znaczniki usuwane wraz z zawartością — ich treść nie jest tekstem notatki. */
const WYTNIJ_Z_ZAWARTOSCIA = ["SCRIPT","STYLE","NOSCRIPT","TEMPLATE","IFRAME","OBJECT","EMBED","APPLET","META","LINK","BASE","FORM"];
/** Przepuszczamy tylko proste zapisy koloru, bez url() i wyrażeń. */
function bezpiecznyKolor(v){
  return /^#[0-9a-f]{3,8}$/i.test(v) || /^rgba?\([\d\s.,%]+\)$/i.test(v) || /^[a-z]{3,20}$/i.test(v);
}
function sanitize(html){
  /* Rozkładamy w dokumencie bezwładnym, nie przez innerHTML — inaczej ładunek
     w rodzaju <img onerror=…> wykonałby się w chwili parsowania, czyli zanim
     ta biała lista w ogóle ruszy. Wyjaśnienie przy parsujBezwladnie w 01-core. */
  const tmp=parsujBezwladnie(html);
  const out=document.createElement("div");
  (function walk(src,dst){
    src.childNodes.forEach(node=>{
      if(node.nodeType===3){ dst.appendChild(document.createTextNode(node.textContent)); }
      else if(node.nodeType===1){
        const tag=node.tagName;
        if(tag==="BR"){ dst.appendChild(document.createElement("br")); }
        else if(tag==="MARK"){
          const m=document.createElement("mark");
          const cls=(node.className||"").match(/hl[1-7]/);
          if(cls){ m.className=cls[0]; }
          else if(node.style && node.style.background){ m.style.background=node.style.background; }
          else if(node.style && node.style.backgroundColor){ m.style.background=node.style.backgroundColor; }
          else { m.className="hl1"; }
          walk(node,m); dst.appendChild(m);
        }
        else if(tag==="B"||tag==="STRONG"){ const b=document.createElement("b"); walk(node,b); dst.appendChild(b); }
        else if(tag==="I"||tag==="EM"){ const i=document.createElement("i"); walk(node,i); dst.appendChild(i); }
        else if(tag==="U"){ const u=document.createElement("u"); walk(node,u); dst.appendChild(u); }
        else if(tag==="S"||tag==="STRIKE"||tag==="DEL"){ const s=document.createElement("s"); walk(node,s); dst.appendChild(s); }
        else if(tag==="TABLE"){ const tb=document.createElement("table"); tb.className="ntab";const hc=(node.className||"").match(/table-head-[1-4]/);if(hc)tb.classList.add(hc[0]);walk(node,tb); dst.appendChild(tb); }
        else if(tag==="TBODY"||tag==="THEAD"||tag==="TR"||tag==="TD"||tag==="TH"){
          const e3=document.createElement(tag.toLowerCase());
          if(tag==="TD"||tag==="TH"){
            const cs=Math.max(1,Math.min(10,parseInt(node.getAttribute("colspan")||"1",10)||1));if(cs>1)e3.setAttribute("colspan",String(cs));
            const rs=Math.max(1,Math.min(10,parseInt(node.getAttribute("rowspan")||"1",10)||1));if(rs>1)e3.setAttribute("rowspan",String(rs));
            const ta=node.style&&node.style.textAlign;if(/^(left|center|right)$/.test(ta||""))e3.style.textAlign=ta;
          }
          walk(node,e3); dst.appendChild(e3);
        }
        else if(tag==="SUP"||tag==="SUB"){
          const e2=document.createElement(tag.toLowerCase());
          /* Odsyłacz przypisu. Numer w treści jest tylko wyglądem — liczy go
             przPrzenumeruj z kolejności odsyłaczy (55-przypisy.js) — ale sama
             para (klasa, data-fn) musi przejść przez sito, bo to ona łączy
             odsyłacz z treścią przypisu na dole notatki. */
          if(tag==="SUP" && /(^|\s)fnref(\s|$)/.test(node.className||"")){
            e2.className="fnref";
            const id=String(node.getAttribute("data-fn")||"").slice(0,20);
            if(/^[a-z0-9]+$/i.test(id)) e2.setAttribute("data-fn", id);
          }
          walk(node,e2); dst.appendChild(e2);
        }
        else if(tag==="HR"){ dst.appendChild(document.createElement("hr")); }
        else if(tag==="A"){
          /* Odsyłacz do innej notatki. Nie ma adresu — ma identyfikator notatki
             na tym urządzeniu. Napis dopisuje przy wyświetlaniu
             odswiezOdnosnikiNotatek (54-wzmianki.js), z bieżącego tytułu. */
          if(/(^|\s)note-ref(\s|$)/.test(node.className||"")){
            const g=String(node.getAttribute("data-g")||"").slice(0,80);
            if(/^[A-Za-z0-9_.:-]+$/.test(g)){
              const a=document.createElement("a");
              a.className="note-ref"; a.setAttribute("data-g", g);
              walk(node,a);
              if(!a.textContent.trim()) a.textContent="notatka";
              dst.appendChild(a);
              return;
            }
            walk(node,dst); return;
          }
          const href=node.getAttribute("href")||"";
          if(/^(https?:\/\/|mailto:|jwlibrary:)/i.test(href)){
            const a=document.createElement("a"); a.setAttribute("href",href);
            const jwl=(node.className||"").indexOf("jwl-ref")>=0;
            if(jwl){ a.className="jwl-ref"; a.setAttribute("data-url", node.getAttribute("data-url")||href); a.setAttribute("target","_blank"); a.setAttribute("rel","noopener noreferrer"); }
            else { a.setAttribute("target","_blank"); a.setAttribute("rel","noopener noreferrer"); }
            walk(node,a); if(!a.textContent) a.textContent=href; dst.appendChild(a);
          } else { walk(node,dst); }
        }
        else if(tag==="H2"||tag==="H3"){ const h=document.createElement(tag.toLowerCase()); walk(node,h); dst.appendChild(h); }
        else if(tag==="BLOCKQUOTE"){ const q=document.createElement("blockquote"); walk(node,q); dst.appendChild(q); }
        else if(tag==="FIGURE" && /(^|\s)note-figure(\s|$)/.test(node.className||"")){
          const f=document.createElement("figure");f.className="note-figure";
          const al=(node.className||"").match(/img-(left|right|center|inline)/);if(al)f.classList.add(al[0]);
          const fw=node.style&&node.style.width;if(fw&&/^\d{1,3}(\.\d+)?%$/.test(fw))f.style.width=fw;
          walk(node,f);dst.appendChild(f);
        }
        else if(tag==="FIGCAPTION"){
          const fc=document.createElement("figcaption");walk(node,fc);dst.appendChild(fc);
        }
        else if(tag==="IMG"){
          const src=(node.getAttribute("src")||"").trim();
          /* TYLKO ZDJĘCIA RASTROWE I ADRESY SIECIOWE.
             Wcześniej wystarczyło, że adres zaczyna się od „data:image" — a to
             obejmuje też „data:image/svg+xml", czyli dokument, który potrafi
             mieć w środku własne procedury zdarzeń. W samym znaczniku <img>
             przeglądarka ich nie uruchamia, więc dziury tu nie było; ale ten
             sam adres wystawiony gdzie indziej (tło w arkuszu, otwarcie
             w nowej karcie) przestaje być tylko obrazkiem. Nie ma czego
             bronić: zdjęcia wstawiane w aplikacji powstają z płótna jako
             data:image/jpeg, a niczego innego kod nigdy nie tworzy.
             Sprawdzane w testy/przegladarka/sito.js. */
          if(/^data:image\/(png|jpe?g|gif|webp|avif|bmp|x-png)[;,]/i.test(src) || /^https?:\/\//i.test(src)){
            const im=document.createElement("img"); im.src=src;
            im.alt=String(node.getAttribute("alt")||"Ilustracja").slice(0,160);
            let keep=(node.className||"").split(/\s+/).filter(c=>/^img-(s|m|l|left|right|center|inline|rot-(90|180|270))$/.test(c));
            // W podpisanej figurze układ należy do FIGURE; poza nią zachowujemy zgodność starych notatek.
            const wFigurze=node.parentElement&&/(^|\s)note-figure(\s|$)/.test(node.parentElement.className||"");
            if(!wFigurze&&!keep.some(c=>/^img-(left|right|center|inline)$/.test(c))) keep.push("img-right");
            im.className=keep.join(" ");
            let w=node.style && node.style.width;
            if(wFigurze)w="100%";
            else if(!(w && /^\d{1,3}(\.\d+)?%$/.test(w)) && !keep.some(c=>/^img-(s|m|l)$/.test(c))) w="45%";
            if(w && /^\d{1,3}(\.\d+)?%$/.test(w)) im.style.width=w;
            dst.appendChild(im);
          }
        }
        else if(tag==="UL"||tag==="OL"){ const l=document.createElement(tag.toLowerCase()); if(tag==="UL" && /(^|\s)tasklist(\s|$)/.test(node.className||"")) l.className="tasklist"; walk(node,l); dst.appendChild(l); }
        else if(tag==="LI"){ const li=document.createElement("li"); if(/(^|\s)done(\s|$)/.test(node.className||"")) li.className="done"; walk(node,li); dst.appendChild(li); }
        else if(tag==="DIV"||tag==="P"){
          const d2=document.createElement("div");
          /* Blok przypisów i pojedynczy przypis. Trzymamy je w treści notatki,
             a nie w osobnym polu — patrz decyzja 3 w 55-przypisy.js. */
          const kl=node.className||"";
          if(/(^|\s)fnlist(\s|$)/.test(kl)) d2.className="fnlist";
          else if(/(^|\s)callout(\s|$)/.test(kl)){
            const rodz=(kl.match(/callout-(important|conclusion|question|example)/)||[])[1]||"important";
            d2.className="callout callout-"+rodz;
          }
          else if(/(^|\s)fn(\s|$)/.test(kl)){
            d2.className="fn";
            const id=String(node.getAttribute("data-fn")||"").slice(0,20);
            if(/^[a-z0-9]+$/i.test(id)) d2.setAttribute("data-fn", id);
            if(node.getAttribute("data-sierota")) d2.setAttribute("data-sierota","1");
          }
          const ta=(node.style&&node.style.textAlign)||node.getAttribute&&node.getAttribute("align");
          if(ta) d2.style.textAlign=ta;
          walk(node,d2);
          dst.appendChild(d2);
        }
        else if(tag==="SPAN"||tag==="FONT"){
          /* Z edytora zostaje wyłącznie kolor czcionki; reszta atrybutów odpada. */
          const kol=(node.style&&node.style.color)||(tag==="FONT"&&node.getAttribute("color"))||"";
          if(kol && bezpiecznyKolor(kol)){
            const sp=document.createElement("span");
            sp.style.color=kol; walk(node,sp); dst.appendChild(sp);
          } else walk(node,dst);
        }
        /* Znaczniki, których zawartość ma zniknąć RAZEM z nimi. Dla nieznanych
           znaczników przepisujemy dzieci (żeby nie gubić tekstu), ale treść skryptu,
           arkusza stylów czy ramki nie jest tekstem notatki i nie ma czego ratować. */
        else if(WYTNIJ_Z_ZAWARTOSCIA.indexOf(tag)>=0){ /* nic — całość odpada */ }
        else walk(node,dst);
      }
    });
  })(tmp,out);
  return out.innerHTML;
}
function htmlToPlain(html){
  /* Też bezwładnie: ta funkcja bywa wołana na treści JESZCZE nieoczyszczonej
     (podgląd różnic przy imporcie, porównywanie z kopią z JW Library). */
  const tmp=parsujBezwladnie(html);
  let out="";
  (function walk(nd){
    nd.childNodes.forEach(ch=>{
      if(ch.nodeType===3){ out+=ch.textContent; }
      else if(ch.nodeType===1){
        const t=ch.tagName;
        if(t==="BR"){ out+="\n"; return; }
        if(t==="HR"){ out+="\n———\n"; return; }
        if(t==="IMG"){ out+="[ilustracja]"; return; }
        if(t==="LI") out+= (ch.parentElement&&ch.parentElement.tagName==="OL")
          ? ([...ch.parentElement.children].indexOf(ch)+1)+". " : "• ";
        walk(ch);
        if(["DIV","P","LI","H2","H3","BLOCKQUOTE"].includes(t) && out && !out.endsWith("\n")) out+="\n";
      }
    });
  })(tmp);
  return out.replace(/\n+$/,"");
}
