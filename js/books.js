/* ==========================================================================
   JW Study — books.js
   Kolumna Biblia (księgi i rozdziały)
   ========================================================================== */
"use strict";
/* ================= KOLUMNA 2: KSIĘGI + ROZDZIAŁY ================= */
function renderBooks(){
  const base = notes.filter(n=>!n.del && noteMatchesTag(n,filt.tag) && noteMatchesPub(n,filt.pub) && noteMatchesQuery(n));
  const counts = {}; let pubs=0;
  base.forEach(n=>{ if(n.b)counts[n.b]=(counts[n.b]||0)+1; else pubs++; });
  const el = $("bookList");
  let html = bookItem("all","Wszystkie",base.length,false);
  html += '<div class="divider">Pisma Hebrajskie</div>';
  for(let i=1;i<=39;i++) html += bookBlock(i, counts[i]||0, base);
  html += '<div class="divider">Pisma Greckie</div>';
  for(let i=40;i<=66;i++) html += bookBlock(i, counts[i]||0, base);
  html += '<div class="divider">Pozostałe</div>';
  html += bookItem(0,"Publikacje / inne",pubs,false);
  if(!setHtml(el, html)) return;   // lista ksiąg zmienia się rzadko — zwykle nie ma czego przepisywać
  el.querySelectorAll(".item").forEach(it=>{
    it.onclick = ()=>{
      const raw = it.dataset.k;
      const k = raw==="all" ? "all" : (raw.indexOf("pub:")===0 ? raw : +raw);
      wlaczZawezenieWynikow();
      if(typeof k==="number" && k>0){
        expandedBook = (expandedBook===k && filt.book===k) ? null : k;
      } else expandedBook = null;
      filt.book = k;
      filt.ch = null;
      persistFilt(); renderAll();
      // na telefonie: księga zostaje (żeby wybrać rozdział), reszta przełącza na notatki
      if(innerWidth<=900 && !(typeof k==="number" && k>0)) mobileShow("colNotes");
    };
  });
  el.querySelectorAll(".chip-ch").forEach(ch=>{
    ch.onclick = e=>{
      e.stopPropagation();
      const c = +ch.dataset.ch;
      wlaczZawezenieWynikow();
      filt.ch = (filt.ch===c)? null : c;
      persistFilt(); renderAll();
      if(innerWidth<=900 && filt.ch!=null) mobileShow("colNotes");
    };
  });
}
function bookItem(key,name,cnt,expandable,expanded,isPub){
  const active = String(filt.book)===String(key) && filt.ch==null;
  const arr = expandable? `<span class="arr">${expanded?"▾":"▸"}</span>` : "";
  return `<div class="item ${active?"active":""} ${cnt?"":"zero"}${isPub?" pubItem":""}" data-k="${key}" title="${esc(name)}">${arr}<span class="nm">${esc(name)}</span><span class="cnt">${cnt}</span></div>`;
}
function bookBlock(i, cnt, base){
  const expanded = expandedBook===i;
  let html = bookItem(i, BOOKS[i], cnt, cnt>0, expanded);
  if(expanded && cnt>0){
    const chs = {};
    base.forEach(n=>{ if(n.b===i && n.ch) chs[n.ch]=(chs[n.ch]||0)+1; });
    const keys = Object.keys(chs).map(Number).sort((a,b)=>a-b);
    if(keys.length){
      html += '<div class="chwrap">' + keys.map(c=>
        `<span class="chip-ch ${filt.ch===c?"active":""}" data-ch="${c}" title="${chs[c]} notatek">${c}</span>`).join("") + '</div>';
    }
  }
  return html;
}
