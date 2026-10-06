/* ==========================================================================
   JW Study — search.js
   Podpowiedzi wyszukiwania
   ========================================================================== */
"use strict";
/* ===== PODPOWIEDZI POD POLEM SZUKANIA (etykiety, pola, ostatnie wyszukiwania) ===== */
const SUG_KEY = KP+"Recent";
function recentSearches(){ try{ return JSON.parse(localStorage.getItem(SUG_KEY)||"[]"); }catch(e){ return []; } }
function pushRecent(q){
  q=(q||"").trim(); if(q.length<2) return;
  let r=recentSearches().filter(x=>x!==q); r.unshift(q); r=r.slice(0,8);
  lsSet(SUG_KEY, JSON.stringify(r));
}
let sugIdx=-1;
function hideSearchSug(){ const s=$("searchSug"); if(s){ s.style.display="none"; sugIdx=-1; } }
/* Publikacje i wersety do podpowiedzi liczymy raz. Wcześniej każda kolejna
   litera wykonywała dwa pełne przebiegi po wszystkich notatkach. */
let _sugCatalog={len:-1,pubs:[],refs:[]};
function searchSugCatalog(){
  if(_sugCatalog.len===notes.length) return _sugCatalog;
  const pub={}, refs={};
  notes.forEach(n=>{
    if(!n || n.del) return;
    if(!n.b && n.ks){ const pelna=pubFullName(n.ks)||n.ks; pub[pelna]=(pub[pelna]||0)+1; }
    if(n.b){ const ref=refLabel(n); refs[ref]=(refs[ref]||0)+1; }
  });
  _sugCatalog={len:notes.length,
    pubs:Object.keys(pub).map(label=>({label,count:pub[label],normalized:norm(label)})).sort((a,b)=>b.count-a.count),
    refs:Object.keys(refs).map(label=>({label,count:refs[label],normalized:norm(label)})).sort((a,b)=>b.count-a.count)};
  return _sugCatalog;
}
function showSearchSug(val){
  const box=$("searchSug"); if(!box) return;
  const v=(val||"").trim(); const last=(v.split(/\s+/).pop()||"");
  const nl=norm(last);
  const items=[];
  // 1) etykiety pasujące do ostatniego słowa
  if(nl.length>=1){
    tags.filter(t=>norm(t.name).includes(nl)).slice(0,5).forEach(t=>{
      items.push({type:"tag", label:t.name, color:t.color, hint:"etykieta",
        apply:()=> v.replace(/\S+$/,"") + 'etykieta:"'+t.name+'" '});
    });
  }
  // 1b) publikacje pasujące do ostatniego słowa — szukanie obejmuje też źródło notatki
  if(nl.length>=3){
    const katalog=searchSugCatalog();
    katalog.pubs.filter(x=>x.normalized.includes(nl)).slice(0,4).forEach(x=>{
      items.push({type:"pub", label:x.label, hint:x.count+" notatek",
        apply:()=> v.replace(/\S+$/,"") + x.label + " "});
    });
    katalog.refs.filter(x=>x.normalized.includes(nl)).slice(0,4).forEach(x=>
      items.push({type:"ref",label:x.label,hint:"werset",apply:()=>v.replace(/\S+$/,'')+'werset:"'+x.label+'" '}));
    const grupa=SZUK_POJECIA.find(g=>g.some(x=>x.includes(nl)||nl.includes(x)));
    if(grupa) grupa.filter(x=>!x.includes(nl)).slice(0,4).forEach(x=>items.push({type:"concept",label:x,hint:"powiązane pojęcie",apply:()=>v.replace(/\S+$/,'')+x+' '}));
  }
  // 2) pola (gdy użytkownik zaczyna pisać nazwę pola)
  if(nl.length>=1){
    [["tytuł:","szukaj w tytule"],["etykieta:","po etykiecie"],["werset:","po odnośniku"]]
      .filter(([f])=>norm(f).startsWith(nl))
      .forEach(([f,h])=>items.push({type:"field", label:f, hint:h, apply:()=> v.replace(/\S+$/,"")+f}));
  }
  // 3) ostatnie wyszukiwania (gdy pole puste lub krótkie)
  if(v.length<2){
    recentSearches().slice(0,6).forEach(q=>items.push({type:"recent", label:q, hint:"ostatnie", apply:()=>q}));
  }
  if(!items.length){ hideSearchSug(); return; }
  box.innerHTML="";
  let lastType=null;
  items.forEach((it,i)=>{
    if(it.type!==lastType){
      const l=document.createElement("div"); l.className="sug-lbl";
      l.textContent = it.type==="tag"?"Etykiety":it.type==="pub"?"Publikacje":it.type==="ref"?"Wersety":it.type==="concept"?"Powiązane pojęcia":it.type==="field"?"Zawężanie":"Ostatnie wyszukiwania";
      box.appendChild(l); lastType=it.type;
    }
    const d=document.createElement("div"); d.className="sug"; d.dataset.i=i;
    const ic = it.type==="tag" ? `<span class="sdot" style="background:${it.color||"var(--muted)"}"></span>`
             : it.type==="field"||it.type==="ref"||it.type==="concept" ? ICO.search : ICO.undo;
    d.innerHTML = ic + `<span>${esc(it.label)}</span><span class="shint">${esc(it.hint)}</span>`;
    d.onmousedown = ev=>{ ev.preventDefault(); applySug(it); };
    box.appendChild(d);
  });
  box.style.display="block"; sugIdx=-1;
  box._items=items;
}
function applySug(it){
  const inp=$("search");
  inp.value = it.apply();
  parseQuery(inp.value); renderAll();
  if(it.type==="recent") pushRecent(inp.value);
  hideSearchSug(); inp.focus();
}
$("search").addEventListener("focus", e=>showSearchSug(e.target.value));
$("search").addEventListener("blur", ()=>{ pushRecent($("search").value); setTimeout(hideSearchSug,120); });
$("search").addEventListener("keydown", e=>{
  const box=$("searchSug"); const open = box && box.style.display==="block";
  if(e.key==="Enter"){ pushRecent(e.target.value); if(open&&sugIdx>=0&&box._items){ e.preventDefault(); applySug(box._items[sugIdx]); } else hideSearchSug(); return; }
  if(!open) return;
  const rows=[...box.querySelectorAll(".sug")];
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){
    e.preventDefault();
    sugIdx = e.key==="ArrowDown" ? Math.min(rows.length-1, sugIdx+1) : Math.max(0, sugIdx-1);
    rows.forEach((r,i)=>r.classList.toggle("on", i===sugIdx));
    rows[sugIdx]?.scrollIntoView({block:"nearest"});
  } else if(e.key==="Escape"){ hideSearchSug(); }
});
$("sortSel").addEventListener("change",e=>{
  sortMode=e.target.value;
  lsSet(KP+"Sort", sortMode);
  renderNotes();
});
// przywróć ostatnio wybraną kolejność
(function(){
  try{
    const s=localStorage.getItem(KP+"Sort");
    if(s && [...$("sortSel").options].some(o=>o.value===s)){ sortMode=s; $("sortSel").value=s; }
  }catch(e){}
})();
