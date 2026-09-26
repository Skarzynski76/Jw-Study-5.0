"use strict";

/* Wyszukiwanie działa poza głównym wątkiem. Worker przechowuje wyłącznie
   uproszczony indeks tekstowy — nie ma dostępu do DOM, IndexedDB ani sieci. */
let rekordy = [];
let pozycje = new Map();
let oczekiwane = 0;
let gotowy = false;
let ostatnieZadanie = null;
let aktywneZlecenie = 0;

function norm(s){
  return String(s || "").toLowerCase().replace(/ł/g,"l")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}
function squash(s){ return norm(s).replace(/[^\p{L}\p{N}]+/gu,""); }
function tokeny(s){ return [...new Set(norm(s).match(/[a-z0-9]+/g) || [])]; }
function odleglosc(a,b,max){
  if(Math.abs(a.length-b.length)>max) return max+1;
  let prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const cur=[i]; let min=i;
    for(let j=1;j<=b.length;j++){
      cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
      if(cur[j]<min) min=cur[j];
    }
    if(min>max) return max+1;
    prev=cur;
  }
  return prev[b.length];
}
function przygotuj(r){
  const pola={
    title:norm(r.title), body:norm(r.body), tag:norm(r.tag), ref:norm(r.ref)
  };
  const tekst=norm(r.plain || [r.title,r.body,r.tag,r.ref].join(" "));
  return {g:r.g, tekst, squash:squash(tekst), tokeny:null, pola,
    pin:!!r.pin, fav:!!r.fav};
}
function maWariant(r, warianty, smart){
  for(const surowy of warianty || []){
    const v=norm(surowy); if(!v) continue;
    if(v.includes("*")){
      const p=v.replace(/\*/g,"");
      if(p && (r.tokeny || (r.tokeny=tokeny(r.tekst))).some(t=>t.startsWith(p))) return true;
      continue;
    }
    if(r.tekst.includes(v)) return true;
    if(!smart || v.includes(" ")) continue;
    const max=v.length>=9?2:(v.length>=5?1:0);
    if(!max) continue;
    const ts=r.tokeny || (r.tokeny=tokeny(r.tekst));
    if(ts.some(t=>t[0]===v[0] && Math.abs(t.length-v.length)<=max && odleglosc(t,v,max)<=max)) return true;
  }
  return false;
}
function pasuje(r,p){
  if(p.allowed && !p.allowed.has(r.g)) return false;
  if(p.fields && !p.fields.every(x=>(r.pola[x.f] || "").includes(norm(x.v)))) return false;
  const smart=p.mode!=="exact";
  if((p.neg || []).some(g=>maWariant(r,g,smart))) return false;
  const frazy=(p.phrases || []).every(x=>r.tekst.includes(norm(x)) || r.squash.includes(squash(x)));
  const grupy=(p.groups || []).every(g=>maWariant(r,g,smart));
  let ok=frazy && grupy;
  if(!ok && p.squash && p.squash.length>=3) ok=r.squash.includes(p.squash);
  return ok;
}
/* Punktacja jest liczona w workerze, bo dopiero on widzi WSZYSTKIE trafienia.
   Bez niej limit wyników oznaczał „pierwsze w bazie”, a nie „najlepsze”. */
function punkty(r,p){
  let wynik=0;
  const title=r.pola.title, body=r.pola.body, tag=r.pola.tag, ref=r.pola.ref;
  for(const surowa of (p.phrases||[])){
    const x=norm(surowa);
    if(title===x) wynik+=900;
    else if(title.includes(x)) wynik+=650;
    else if(ref.includes(x)) wynik+=560;
    else if(tag.includes(x)) wynik+=430;
    else if(body.includes(x)) wynik+=260;
  }
  for(const grupa of (p.groups||[])){
    let najlepszy=0;
    for(const surowy of grupa||[]){
      const x=norm(surowy).replace(/\*/g,""); if(!x) continue;
      if(title===x) najlepszy=Math.max(najlepszy,800);
      else if(title.includes(x)) najlepszy=Math.max(najlepszy,520);
      if(ref.includes(x)) najlepszy=Math.max(najlepszy,470);
      if(tag.includes(x)) najlepszy=Math.max(najlepszy,360);
      if(body.includes(x)) najlepszy=Math.max(najlepszy,80);
    }
    wynik+=najlepszy||30; // dopasowanie rozmyte potwierdzone przez pasuje()
  }
  /* Kilka pojęć w jednym krótkim odcinku jest lepsze niż każde w innym końcu
     wielostronicowej notatki. */
  if((p.groups||[]).length>1){
    const pierwsze=(p.groups||[]).map(g=>{
      let at=-1;
      for(const v of g||[]){ const i=body.indexOf(norm(v).replace(/\*/g,"")); if(i>=0&&(at<0||i<at)) at=i; }
      return at;
    });
    if(pierwsze.every(x=>x>=0)){
      const rozrzut=Math.max(...pierwsze)-Math.min(...pierwsze);
      if(rozrzut<220) wynik+=220; else if(rozrzut<600) wynik+=90;
    }
  }
  /* To tylko rozstrzygnięcie remisu. Ulubiona notatka nie może wyprzedzić
     dokładnego tytułu jedynie dlatego, że ma gwiazdkę. */
  if(r.pin) wynik+=2; if(r.fav) wynik+=1;
  return wynik;
}
function szukaj(p){
  const zlecenie=++aktywneZlecenie;
  const limitWynikow=Math.max(1,+p.matchLimit || 250);
  p.allowed=Array.isArray(p.allowed)?new Set(p.allowed):null;
  p.squash=squash(p.squash || "");
  const trafienia=[]; let i=0; let ostatnio=0;
  const wyslijWyniki=(koniec)=>{
    /* Sortujemy kopię, aby dalsze porcje mogły spokojnie dopisywać do tablicy. */
    const top=trafienia.slice().sort((a,b)=>b.p-a.p||a.i-b.i).slice(0,limitWynikow);
    self.postMessage({type:"results",seq:p.seq,ids:top.map(x=>x.g),scanned:i,
      total:rekordy.length,totalMatches:trafienia.length,done:koniec,
      limited:!koniec || trafienia.length>limitWynikow});
  };
  const porcja=()=>{
    if(zlecenie!==aktywneZlecenie) return;
    const koniec=Math.min(rekordy.length,i+260);
    for(;i<koniec;i++) if(pasuje(rekordy[i],p)) trafienia.push({g:rekordy[i].g,p:punkty(rekordy[i],p),i});
    const done=i>=rekordy.length;
    /* Wyniki pośrednie najwyżej co ok. 780 rekordów. Interfejs pozostaje żywy,
       ale nie sortuje i nie rysuje listy kilkadziesiąt razy na sekundę. */
    if(done || i-ostatnio>=780){ ostatnio=i; wyslijWyniki(done); }
    if(!done) setTimeout(porcja,0);
  };
  porcja();
}

self.onmessage=e=>{
  const m=e.data || {};
  if(m.type==="reset"){
    aktywneZlecenie++;
    rekordy=[]; pozycje=new Map(); oczekiwane=+m.total || 0; gotowy=false; ostatnieZadanie=null;
  }else if(m.type==="add"){
    for(const r of (m.rows || [])) if(r && r.g){
      const nowy=przygotuj(r), poz=pozycje.get(r.g);
      if(poz===undefined){ pozycje.set(r.g,rekordy.length); rekordy.push(nowy); }
      else rekordy[poz]=nowy;
    }
  }else if(m.type==="upsert"){
    const r=m.row;
    if(r && r.g){
      const nowy=przygotuj(r), poz=pozycje.get(r.g);
      if(poz===undefined){ pozycje.set(r.g,rekordy.length); rekordy.push(nowy); }
      else rekordy[poz]=nowy;
    }
  }else if(m.type==="remove"){
    const poz=pozycje.get(m.g);
    if(poz!==undefined){
      const ostatni=rekordy.pop(); pozycje.delete(m.g);
      if(poz<rekordy.length){ rekordy[poz]=ostatni; pozycje.set(ostatni.g,poz); }
    }
  }else if(m.type==="done"){
    gotowy=true;
    self.postMessage({type:"ready",count:rekordy.length,expected:oczekiwane});
    if(ostatnieZadanie){ const p=ostatnieZadanie; ostatnieZadanie=null; szukaj(p); }
  }else if(m.type==="search"){
    if(!gotowy) ostatnieZadanie=m;
    else szukaj(m);
  }
};
