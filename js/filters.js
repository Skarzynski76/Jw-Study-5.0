/* ==========================================================================
   JW Study — filters.js
   Filtrowanie notatek + zestaw ikon kreskowych
   ========================================================================== */
"use strict";
/* ================= FILTRY ================= */
function offlineReady(){
  if(location.protocol === "file:") return false;
  if(typeof navigator !== "undefined" && "serviceWorker" in navigator){
    if(navigator.serviceWorker.controller) return true;
    if(lsGet(KP+"OfflineOK", null) === "1") return true;
  }
  return false;
}
/* Ustawia rozwijane menu tak, żeby ZAWSZE mieściło się na ekranie:
   dobiera stronę (pod/nad przyciskiem), przycina wysokość i dodaje przewijanie. */
/**
 * Obszar, który użytkownik NAPRAWDĘ widzi.
 *
 * innerWidth/innerHeight nie zmieniają się, gdy wyskoczy klawiatura ekranowa —
 * okno zostaje tej samej wysokości, tylko dolna część jest zasłonięta. Menu
 * układane względem innerHeight lądowało więc pod klawiaturą albo pod dolną
 * krawędzią i wyglądało na zniknięte. Na tablecie dotkliwie, bo klawiatura
 * zabiera tam nawet połowę ekranu.
 *
 * visualViewport podaje wycinek faktycznie widoczny — i to jego pilnujemy.
 */
function widocznyObszar(){
  const vv = window.visualViewport;
  if(!vv) return {lewo:0, gora:0, prawo:innerWidth, dol:innerHeight,
                  szer:innerWidth, wys:innerHeight};
  return {
    lewo:  vv.offsetLeft,
    gora:  vv.offsetTop,
    prawo: vv.offsetLeft + vv.width,
    dol:   vv.offsetTop  + vv.height,
    szer:  vv.width,
    wys:   vv.height
  };
}

function placeDropdown(dd, anchor){
  const M = 10;
  dd.scrollTop = 0;
  if(!anchor){
    dd.style.top = "60px";
    dd.style.left = "60px";
    return;
  }
  const r = anchor.getBoundingClientRect();
  const ob = widocznyObszar();
  dd.style.maxHeight = "none";
  const h = dd.offsetHeight, w = dd.offsetWidth;
  const below = ob.dol - r.bottom - M*2;
  const above = r.top - ob.gora - M*2;
  let top, maxH;
  if(h <= below || below >= above){
    top = r.bottom + 6;
    maxH = Math.max(160, below);
  } else {
    maxH = Math.max(160, above);
    top = Math.max(ob.gora + M, r.top - 6 - Math.min(h, maxH));
  }
  const wysokosc = Math.min(maxH, ob.wys - M*2);
  dd.style.maxHeight = wysokosc + "px";
  dd.style.overflowY = "auto";
  dd.style.top  = Math.max(ob.gora + M,
                    Math.min(top, ob.dol - Math.min(h, wysokosc) - M)) + "px";
  let left = r.left;
  if(left + w > ob.prawo - M) left = ob.prawo - w - M;
  if(left < ob.lewo + M) left = ob.lewo + M;
  dd.style.left = left + "px";
}

/* zajętość pamięci urządzenia (dane aplikacji: notatki + zdjęcia) */
async function showStorageInfo(){
  const el=document.getElementById("ddStorage"); if(!el) return;
  const imgCount = notes.reduce((s,n)=> s + ((n.h||"").match(/<img/gi)||[]).length, 0);
  try{
    if(navigator.storage && navigator.storage.estimate){
      const {usage=0, quota=0} = await navigator.storage.estimate();
      /* Do gigabajtów przechodzimy powyżej tysiąca megabajtów. Bez tego limit
         urządzenia pokazywał się jako „~78643.2 MB" — liczba, której nikt nie
         przeczyta jednym spojrzeniem, a chodzi tu tylko o rząd wielkości. */
      const mb = u => u>=1073741824 ? (u/1073741824).toFixed(u>=10737418240?0:1)+" GB"
                    : u>=1048576    ? (u/1048576).toFixed(1)+" MB"
                    :                 Math.round(u/1024)+" KB";
      const pct = quota ? Math.min(100, Math.round(usage/quota*100)) : 0;
      let txt = `Zajęte: ${mb(usage)}` + (quota ? ` z ~${mb(quota)} (${pct}%)` : "");
      if(imgCount) txt += ` · zdjęć: ${imgCount}`;
      if(pct>=85) txt += " — ⚠️ mało miejsca, zrób kopię i usuń zbędne zdjęcia";
      el.textContent = txt;
    } else {
      el.textContent = "Notatek: "+notes.filter(n=>!n.del).length + (imgCount?" · zdjęć: "+imgCount:"");
    }
  }catch(e){ el.textContent = "Notatek: "+notes.filter(n=>!n.del).length; }
}
/* ================= AUTOMATYCZNE TEMATY =================
   To są filtry wirtualne: niczego nie dopisują do n.tg, więc ręczne etykiety,
   sekcje i zakładki użytkownika pozostają dokładnie tam, gdzie je umieścił.
   Jedna notatka może należeć do kilku tematów jednocześnie. */
const AUTO_TEMATY = [
  {id:"modlitwa",       name:"Modlitwa",                 color:"#a8c7fa", slowa:["modlitw","prosba do jehowy","blagan","dziekczyni"]},
  {id:"wiara",          name:"Wiara i zaufanie",         color:"#b8d8ba", slowa:["wiar","wierzyc","zaufan","ufnosc","polegan na jehowie"]},
  {id:"nadzieja",       name:"Nadzieja i przyszłość",    color:"#f3d48f", slowa:["nadziej","przyszlosc","zmartwychwst","wskrzesz","zycie wieczne","nowy swiat","raj"]},
  {id:"milosc",         name:"Miłość i życzliwość",      color:"#f2b8c6", slowa:["milosc","kochac","serdeczn","zyczliw","wspolczuc"]},
  {id:"przebaczenie",   name:"Przebaczenie i pokój",     color:"#d5c2ee", slowa:["przebacz","wybacz","pojednan","zgoda","pokoj z innymi","konflikt","klotni"]},
  {id:"rodzina",        name:"Rodzina i małżeństwo",     color:"#f1c6a8", slowa:["rodzin","malzen","wspolmalzon","zona","maz","rodzic","dziec","wychowan"]},
  {id:"zbor",           name:"Zbór i bracia",            color:"#aed9d1", slowa:["zbor","bracia","siostry","wspolwyznaw","starsz zboru","nadzorc"]},
  {id:"sluzba",         name:"Służba i głoszenie",       color:"#b9cfec", slowa:["sluzb","gloszen","kaznodziej","ewangeliz","studium biblijne","rozmow z ludzmi"]},
  {id:"trudnosci",      name:"Próby i pocieszenie",      color:"#d8c4b6", slowa:["trudnos","cierp","chorob","smut","zalob","przesladow","pocieszen","niepokoj","lek","stres"]},
  {id:"decyzje",        name:"Mądrość i decyzje",        color:"#e3d49d", slowa:["madrosc","decyzj","sumieni","wybor","kierownictw","dobra rada","roztropn"]},
  {id:"cechy",          name:"Cechy chrześcijańskie",    color:"#c7dca8", slowa:["pokor","cierpliw","wytrwal","lagodn","samokontrol","opanowan","uczciw","lojaln"]},
  {id:"ochrona",        name:"Pokusy i ochrona duchowa", color:"#c9c5dd", slowa:["pokus","szatan","demon","materializm","uzalezn","niemoraln","grzech","ochrona duchow"]},
  {id:"radosc",         name:"Radość i wdzięczność",     color:"#f4dfa3", slowa:["rados","wdzieczn","szczesc","zadowolen","pozytywn"]}
];
let autoTematyWlasne = [];
const AUTO_KOLORY = ["#a8c7fa","#b8d8ba","#f3d48f","#f2b8c6","#d5c2ee","#f1c6a8","#aed9d1","#c7dca8"];
const _autoTematCache = new Map();
function normAutoTemat(s){
  return String(s||"").toLowerCase().replace(/ł/g,"l").normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
}
function tekstAutoTemat(n){
  const reczny=(n.tg||[]).map(id=>(tags.find(t=>t.id===id)||{}).name||"").join(" ");
  const tresc=n.c || String(n.h||"").replace(/<[^>]*>/g," ");
  return normAutoTemat((n.t||"")+" "+tresc+" "+reczny);
}
function wszystkieAutoTematy(){ return AUTO_TEMATY.concat(autoTematyWlasne); }
/* Reguły są normalizowane tylko po zmianie ustawień. Poprzednio każde słowo
   każdej reguły było upraszczane ponownie dla każdej notatki. */
let _autoRegulyCache={sig:"",lista:[]};
function autoTematyReguly(){
  if(_autoRegulyCache.sig)return _autoRegulyCache;
  const tematy=wszystkieAutoTematy();
  const sig=tematy.map(t=>t.id+":"+t.name+":"+t.slowa.join(",")).join(";");
  _autoRegulyCache={sig,lista:tematy.map(t=>({t,slowa:[...new Set(t.slowa.map(normAutoTemat).filter(Boolean))]}))};
  return _autoRegulyCache;
}
function autoPole(s){
  const tekst=normAutoTemat(s);
  return {tekst,slowa:tekst?tekst.split(" "):[]};
}
function autoIleTrafien(pole,regula){
  if(!pole.tekst||!regula)return 0;
  if(regula.includes(" ")) return (" "+pole.tekst+" ").includes(" "+regula+" ")?1:0;
  let ile=0;
  pole.slowa.forEach(w=>{
    /* Rdzeń od czterech znaków może dopasować odmianę słowa. Krótsze hasła,
       np. „mąż” i „lęk”, muszą być całym słowem i nie wpadają w inne wyrazy. */
    if(w===regula || (regula.length>=4&&w.startsWith(regula))) ile++;
  });
  return ile;
}
function autoTematPewny(pola,slowa){
  /* Tytuł i ręczna etykieta są świadomym, mocnym sygnałem. */
  if(slowa.some(s=>autoIleTrafien(pola.tytul,s)>0 || autoIleTrafien(pola.etykiety,s)>0))return true;
  /* Pełny zwrot w treści jest bardziej jednoznaczny niż pojedyncze słowo. */
  if(slowa.some(s=>s.includes(" ")&&autoIleTrafien(pola.tresc,s)>0))return true;
  let rozne=0;
  for(const s of slowa){
    const ile=autoIleTrafien(pola.tresc,s);
    if(ile>=2)return true;              // to samo pojęcie wraca w notatce
    if(ile===1&&++rozne>=2)return true; // dwa różne sygnały tego samego tematu
  }
  return false;
}
function autoTematySanity(raw){
  const src=raw&&typeof raw==="object"&&Array.isArray(raw.custom)?raw.custom:[];
  const seen=new Set();
  return {custom:src.slice(0,40).reduce((out,t,i)=>{
    if(!t||typeof t!=="object") return out;
    const name=String(t.name||"").replace(/[<>]/g,"").trim().slice(0,60);
    const slowa=(Array.isArray(t.slowa)?t.slowa:String(t.slowa||"").split(","))
      .map(x=>String(x||"").replace(/[<>]/g,"").trim().slice(0,60)).filter(Boolean).slice(0,24);
    if(!name||!slowa.length) return out;
    let id=/^u_[a-z0-9_-]{1,50}$/i.test(String(t.id||""))?String(t.id):"u_import_"+i;
    while(seen.has(id)) id+="_"+i; seen.add(id);
    const color=/^#[0-9a-f]{6}$/i.test(String(t.color||""))?String(t.color):AUTO_KOLORY[i%AUTO_KOLORY.length];
    out.push({id,name,slowa,color}); return out;
  },[])};
}
function autoTematyEksport(){ return {custom:autoTematyWlasne.map(t=>({...t,slowa:t.slowa.slice()}))}; }
function autoTematyUstaw(raw,zapisz){
  autoTematyWlasne=autoTematySanity(raw).custom; _autoTematCache.clear(); _autoRegulyCache={sig:"",lista:[]};
  try{ lsSet(KP+"AutoTopics",JSON.stringify(autoTematyEksport())); }catch(_){}
  if(zapisz!==false&&idb) idbPut("meta",autoTematyEksport(),"autoTopics").catch(e=>reportSaveError(e,"tematy automatyczne"));
}
async function autoTematyWczytaj(){
  let raw=null;
  if(idb){ try{ raw=await idbGet("meta","autoTopics"); }catch(_){} }
  if(!raw){ try{ raw=JSON.parse(lsGet(KP+"AutoTopics","null")); }catch(_){} }
  autoTematyUstaw(raw||{custom:[]},false);
}
function autoTematyScal(raw){
  const incoming=autoTematySanity(raw).custom, byId=new Set(autoTematyWlasne.map(t=>t.id)), mapa={};
  incoming.forEach(t=>{
    const same=autoTematyWlasne.find(x=>normAutoTemat(x.name)===normAutoTemat(t.name));
    if(same){ same.slowa=[...new Set(same.slowa.concat(t.slowa))].slice(0,24); mapa[t.id]=same.id; return; }
    let id=t.id; while(byId.has(id)) id+="_kopia"; byId.add(id); autoTematyWlasne.push({...t,id}); mapa[t.id]=id;
  });
  autoTematyUstaw({custom:autoTematyWlasne});
  return mapa;
}
function autoTematyNotatki(n){
  const tg=(n.tg||[]).join(","), c=String(n.c||""), h=String(n.h||"");
  const reguly=autoTematyReguly();
  const sig=String(n.mo||"")+"|"+String(n.t||"")+"|"+c.length+"|"+h.length+"|"+tg+
    "|"+(n.tg||[]).map(id=>(tags.find(t=>t.id===id)||{}).name||"").join(",")+"|"+(n.atex||[]).join(",")+
    "|"+reguly.sig;
  const old=_autoTematCache.get(n.g);
  if(old && old.sig===sig) return old.ids;
  const etykiety=(n.tg||[]).map(id=>(tags.find(t=>t.id===id)||{}).name||"").join(" ");
  const pola={tytul:autoPole(n.t||""),tresc:autoPole(n.c||String(n.h||"").replace(/<[^>]*>/g," ")),etykiety:autoPole(etykiety)};
  const ids=[], wykluczone=new Set(Array.isArray(n.atex)?n.atex:[]);
  reguly.lista.forEach(({t,slowa})=>{
    if(!wykluczone.has(t.id)&&autoTematPewny(pola,slowa)) ids.push(t.id);
  });
  _autoTematCache.set(n.g,{sig,ids});
  return ids;
}
function autoTematPasuje(n,id){ return autoTematyNotatki(n).includes(id); }
function autoTematyZlicz(base){
  const counts=Object.create(null); let notatki=0;
  base.forEach(n=>{ const ids=autoTematyNotatki(n); if(ids.length) notatki++; ids.forEach(id=>counts[id]=(counts[id]||0)+1); });
  return {notatki, lista:wszystkieAutoTematy().map(t=>({...t,count:counts[t.id]||0}))};
}
function autoTematyOtwarte(){ return lsGet(KP+"AutoTematyOpen","0")==="1"; }
function aktywnyAutoTemat(){
  const id=typeof filt.tag==="string"&&filt.tag.indexOf("auto:")===0?filt.tag.slice(5):"";
  return id?wszystkieAutoTematy().find(t=>t.id===id)||null:null;
}
function autoTematWyklucz(n,id){
  if(!n||!id)return;
  pushUndo({type:"note",label:"wykluczenie z tematu automatycznego",before:cloneNote(n)});
  n.atex=[...new Set((Array.isArray(n.atex)?n.atex:[]).concat(id))];
  _autoTematCache.delete(n.g); markDirty(n); renderAll(); toast("Notatka nie będzie już pokazywana w tym temacie");
}
function autoTematKarta(n){
  const t=aktywnyAutoTemat(); if(!t)return "";
  return `<div class="autoMatch" style="--autoKolor:${t.color}"><span class="autoMatchIco">✦</span><span>Rozpoznany temat: <b>${esc(t.name)}</b></span><button type="button" data-act="autoexclude" title="Ta notatka nie pasuje do tego tematu">Nie pasuje</button></div>`;
}
function autoWykluczenIle(){ return notes.reduce((s,n)=>s+(Array.isArray(n.atex)?n.atex.length:0),0); }
function renderAutoTematyModal(){
  const el=$("autoTematyLista"); if(!el)return;
  const wlasne=autoTematyWlasne.map(t=>`<div class="autoRule" data-auto-id="${esc(t.id)}"><span class="autoRuleDot" style="background:${t.color}"></span><div><b>${esc(t.name)}</b><small>${esc(t.slowa.join(", "))}</small></div><button type="button" data-auto-edit="${esc(t.id)}" title="Edytuj">Edytuj</button><button type="button" data-auto-del="${esc(t.id)}" title="Usuń">×</button></div>`).join("");
  el.innerHTML=wlasne||`<div class="autoRulesEmpty">Nie masz jeszcze własnych reguł.</div>`;
  const ile=autoWykluczenIle(), reset=$("autoResetEx");
  if(reset){reset.disabled=!ile;reset.textContent=ile?`Przywróć wykluczenia (${ile})`:"Brak wykluczeń";}
}
async function autoTematEdytuj(id){
  const old=id?autoTematyWlasne.find(t=>t.id===id):null;
  const name=await askText({title:old?"Nazwa własnego tematu":"Nowy temat automatyczny",value:old?old.name:"",placeholder:"np. Gościnność",okLabel:old?"Dalej":"Dalej",hint:"Ta nazwa pojawi się w kolumnie Tematy automatyczne."});
  if(!name||!name.trim())return;
  const words=await askText({title:"Słowa rozpoznające temat",value:old?old.slowa.join(", "):"",placeholder:"np. gościnność, zapraszanie, otwarty dom",okLabel:"Zapisz",hint:"Wpisz słowa lub zwroty oddzielone przecinkami. W treści wymagane są dwa sygnały; tytuł, ręczna etykieta lub cały zwrot wystarczą samodzielnie."});
  const slowa=String(words||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,24); if(!slowa.length){toast("Wpisz przynajmniej jedno słowo");return;}
  if(old){old.name=name.trim().slice(0,60);old.slowa=slowa;}
  else autoTematyWlasne.push({id:"u_"+Date.now().toString(36),name:name.trim().slice(0,60),slowa,color:AUTO_KOLORY[autoTematyWlasne.length%AUTO_KOLORY.length]});
  autoTematyUstaw({custom:autoTematyWlasne}); bumpDirty(); renderAutoTematyModal(); renderAll();
}
async function autoTematUsun(id){
  const t=autoTematyWlasne.find(x=>x.id===id); if(!t)return;
  if(!(await askConfirm("Usunąć własny temat?",`Reguła „${esc(t.name)}” zostanie usunięta. Ręczne etykiety notatek pozostaną bez zmian.`,{okLabel:"Usuń",danger:true})))return;
  autoTematyWlasne=autoTematyWlasne.filter(x=>x.id!==id);
  notes.forEach(n=>{if(Array.isArray(n.atex)&&n.atex.includes(id)){n.atex=n.atex.filter(x=>x!==id);saveNote(n);}});
  autoTematyUstaw({custom:autoTematyWlasne}); bumpDirty(); renderAutoTematyModal(); renderAll();
}
function autoTematyPrzywroc(){
  let ile=0; notes.forEach(n=>{if(Array.isArray(n.atex)&&n.atex.length){ile+=n.atex.length;delete n.atex;saveNote(n);}});
  if(!ile)return; _autoTematCache.clear(); bumpDirty(); renderAutoTematyModal(); renderAll(); toast("Przywrócono automatyczne dopasowania");
}
function otworzAutoTematy(){ renderAutoTematyModal(); openModal("modalAutoTematy"); }

function noteMatchesTag(n,t){
  if(t==="all") return true;
  if(t==="none") return n.tg.length===0;
  if(typeof t==="string" && t.indexOf("auto:")===0) return autoTematPasuje(n,t.slice(5));
  /* „stb:<id>" — zakładka wewnątrz sekcji: notatki wrzucone wprost
     oraz te noszące którąkolwiek z etykiet przypisanych do tej zakładki. */
  if(typeof t==="string" && t.indexOf("stb:")===0)
    return typeof notatkaWZakladce==="function" && notatkaWZakladce(n, +t.slice(4));
  /* „sec:<id>" — CAŁY TEMAT z mapy tematów (56-mapa.js): notatki noszące
     którąkolwiek etykietę należącą do tej sekcji. Bez tego z mapy dałoby się
     pokazać na liście tylko jeden podtemat, a nie temat jako całość. */
  if(typeof t==="string" && t.indexOf("sec:")===0){
    const sek = +t.slice(4);
    return n.tg.some(id=>{
      const tg = tags.find(x=>x.id===id);
      return tg && tg.sec === sek;
    });
  }
  return n.tg.includes(t);
}
/* Filtry Biblii i publikacji są niezależne. Dzięki temu ciąg
   słowo → księga → rozdział → etykieta → publikacja jest przecięciem (AND),
   a późniejszy wybór nie usuwa wcześniejszego. */
function noteMatchesBook(n,b){
  if(b==="all") return true;
  if(b===0) return !n.b;
  return n.b===b;
}
function noteMatchesPub(n,p){
  if(!p || p==="all") return true;
  if(typeof p==="string" && p.indexOf("ptb:")===0)
    return typeof pubTabHasNote==="function" && pubTabHasNote(n,+p.slice(4));
  if(typeof p==="string" && p.indexOf("pub:")===0){
    const key=p.slice(4);
    if(key.indexOf("year:")===0){
      const cz=key.split(":");
      return pubCatOf(n).id===cz[1] && (pubYearOf(n)||"—")===cz[2];
    }
    return pubKeyOf(n)===key;
  }
  return true;
}
/* Wyszukiwanie uruchomione jako „cała baza” wcześniej ignorowało późniejsze
   dotknięcie księgi, rozdziału lub etykiety. Liczniki w kolumnach się zmieniały,
   lecz lista notatek pozostawała taka sama. Świadomy wybór w kolumnie oznacza,
   że od tej chwili użytkownik chce zawężać właśnie bieżące wyniki. */
function wlaczZawezenieWynikow(){
  if((query || (typeof aktywneOpcjeSzukania==="function"&&aktywneOpcjeSzukania())) && searchOpts.scope==="all"){
    searchOpts.scope="current";
    lsSet(KP+"SearchOpts",JSON.stringify(searchOpts));
  }
}
/* ===== zestaw ikon kreskowych (sama grafika — bez wpływu na działanie) ===== */
const svgIc = (d, sw) => `<svg class="ic mic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw||1.7}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC_GRIP   = svgIc('<circle cx="9" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.1" fill="currentColor" stroke="none"/>');
const IC_PIN    = svgIc('<path d="M9.5 3h5l-.6 5.4 3.1 3.1H7l3.1-3.1z"/><path d="M12 11.5V21"/>');
const IC_BOOK   = svgIc('<path d="M4 5.6A2.6 2.6 0 0 1 6.6 3H19.4v14.4H6.6A2.6 2.6 0 0 0 4 20z"/><path d="M4 20a2.6 2.6 0 0 1 2.6-2.6H19.4V21H6.6A2.6 2.6 0 0 1 4 20z"/>');
const IC_PENCIL = svgIc('<path d="M4.5 19.5h3.6L19 8.6a1.9 1.9 0 0 0-2.7-2.7L5.2 17z"/><path d="M14.8 7.4l2.7 2.7"/>');
const IC_CLOCK  = svgIc('<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3 1.8"/>');
const IC_EXT    = svgIc('<path d="M14 4.5h5.5V10"/><path d="M19.5 4.5L11 13"/><path d="M18 14v4.6a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 18.6V7.4A1.4 1.4 0 0 1 5.4 6H10"/>');
const IC_STAR   = svgIc('<path d="M12 4.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/>');
const IC_DOTS   = svgIc('<circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor" stroke="none"/>');
/* klucz publikacji: symbol + numer wydania (żeby roczniki Strażnicy nie zlewały się w jedno) */
function pubKeyOf(n){ return (n.ks||"—") + (n.itn?("|"+n.itn):""); }
