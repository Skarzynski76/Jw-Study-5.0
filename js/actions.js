/* ==========================================================================
   JW Study — actions.js
   Akcje na notatkach i cofanie zmian
   ========================================================================== */
"use strict";
/* ================= AKCJE ================= */
/* licznik niezapisanych zmian: czytamy z pamięci podręcznej, zapis sklejamy */
function bumpDirty(){ lsSetSoon(KP+"Dirty", String((+(lsGet(KP+"Dirty",0)||0))+1), 500); updateBackupBadge();
  if(typeof bezpUniewaznijKontrole==="function") bezpUniewaznijKontrole();
  if(typeof sprawdzKopie==="function") sprawdzKopie();
  /* Każda zmiana odkłada zapis pliku uzgadniania — patrz 53-sync.js. Wpięte tutaj,
     w JEDNYM miejscu, przez które przechodzi każda zmiana danych; rozsypane po
     kilkunastu akcjach zawsze którąś by pominęło. */
  if(typeof syncPoZmianie==="function") syncPoZmianie(); }
function clearDirty(){ const teraz=new Date().toISOString(); lsSet(KP+"Dirty","0"); lsSet(KP+"LastBk", teraz.substring(0,10)); lsSet(KP+"LastBkIso",teraz); updateBackupBadge();
  if(typeof zapomnijOdlozenie==="function") zapomnijOdlozenie();
  if(typeof schowajPasekKopii==="function") schowajPasekKopii(); }
function backupDaysAgo(){ const lb=lsGet(KP+"LastBk", null); if(!lb) return null; const d=Math.floor((Date.now()-Date.parse(lb))/86400000); return isFinite(d)?d:null; }
function backupStale(){ const dirty=+(lsGet(KP+"Dirty",0)||0); const days=backupDaysAgo(); return dirty>0 && (days===null || days>=7 || dirty>=50); }
/* czytelny opis stanu kopii zapasowej w menu „Plik" */
function backupStatusHtml(){
  const lb = lsGet(KP+"LastBk", null);
  const dirty = +(lsGet(KP+"Dirty",0)||0);
  const days = backupDaysAgo();
  const plNotes = n => n===1 ? "zmiana" : (n%10>=2 && n%10<=4 && (n%100<12||n%100>14)) ? "zmiany" : "zmian";
  if(!lb){
    return `<div class="bk-box dd-tresc warn">
      <div class="bk-line"><b>Nie masz jeszcze kopii zapasowej</b></div>
      <div class="bk-desc">Notatki są tylko na tym urządzeniu. Kliknij „Zapisz kopię danych”, żeby je zabezpieczyć.</div></div>`;
  }
  let whenTxt;
  if(days===null) whenTxt = lb;
  else if(days===0) whenTxt = "dzisiaj";
  else if(days===1) whenTxt = "wczoraj";
  else if(days<7)   whenTxt = days+" dni temu";
  else if(days<31)  whenTxt = "ponad "+Math.floor(days/7)+" tyg. temu";
  else              whenTxt = "ponad "+Math.floor(days/30)+" mies. temu";
  let dateNice = lb;
  try{ const d=new Date(lb); if(!isNaN(d)) dateNice = d.toLocaleDateString("pl",{day:"numeric",month:"long",year:"numeric"}); }catch(e){}
  const stale = backupStale();
  const desc = dirty>0
    ? (dirty===1
        ? `Od tego czasu jest <b>1 zmiana</b>, której nie ma w kopii.`
        : `Od tego czasu jest <b>${dirty} ${plNotes(dirty)}</b>, których nie ma w kopii.`)
    : `Wszystkie zmiany są zapisane w kopii.`;
  /* Data w nawiasie schodzi do drugiego wiersza. W jednym wierszu z „4 dni
     temu" robiła z niego łamigłówkę: dwie różne miary tego samego faktu obok
     siebie, a przy dłuższej dacie wiersz i tak się łamał w przypadkowym
     miejscu. Na górze zostaje to, co czyta się od razu. */
  return `<div class="bk-box dd-tresc ${stale?"warn":(dirty>0?"":"ok")}">
    <div class="bk-line">Ostatnia kopia: <b>${whenTxt}</b></div>
    <div class="bk-date">${dateNice}</div>
    <div class="bk-desc">${desc}</div></div>`;
}
/**
 * Odświeża przycisk kopii zapasowej: licznik zmian i ostrzeżenie, gdy kopia jest stara.
 */
function updateBackupBadge(){
  const b=document.getElementById("btnBackup"); if(!b) return;
  const dirty=+(lsGet(KP+"Dirty",0)||0);
  const lb=lsGet(KP+"LastBk", null); const days=backupDaysAgo();
  b.innerHTML = ICO.save + (dirty>0 ? `<span class="bk-count">${dirty}</span>` : "");
  b.classList.toggle("badge-warn", backupStale());
  b.title = (lb ? ("Ostatnia kopia: "+lb+(days!=null?" ("+days+" dni temu)":"")) : "Nie zrobiono jeszcze kopii")
    + (dirty>0 ? (" · zmian od kopii: "+dirty) : " · brak nowych zmian")
    + " — kliknij, aby otworzyć Centrum bezpieczeństwa danych";
}
/* PRZY ZAMYKANIU JUŻ NIE PYTAMY.

   Było tu okno przeglądarki „czy na pewno wyjść". Pojawiało się w chwili, gdy
   człowiek już wychodzi, a jedyne, co dawało się z nim zrobić, to zostać —
   kopii i tak nie można wtedy wykonać. Ostrzeżenie, na które nie da się
   zareagować, uczy tylko klikać „wyjdź" bez czytania.

   Przypomnienie przeniosło się tam, gdzie da się je wykonać: na pasek z
   przyciskiem robiącym kopię (js/47-przypomnienie.js). */
/* ================= COFNIJ ================= */
const undoStack = [];
const redoStack = [];
/* Kopie na potrzeby cofania. structuredClone jest szybszy i radzi sobie z datami,
   ale nie ma go w starszych przeglądarkach — wtedy wracamy do JSON. */
function deepCopy(obj){
  try{ return (typeof structuredClone==="function") ? structuredClone(obj) : JSON.parse(JSON.stringify(obj)); }
  catch(e){ try{ return JSON.parse(JSON.stringify(obj)); }catch(e2){ console.warn("Nie udało się skopiować danych do cofania", e2); return null; } }
}
function cloneNote(n){ return deepCopy(n); }
function cloneTags(){ return deepCopy(tags); }
/**
 * Odkłada operację na stos cofania (maksymalnie 30 pozycji).
 * @param {Object} u  pola: type, label, before
 */
function pushUndo(u){
  undoStack.push(u); if(undoStack.length>30) undoStack.shift();
  redoStack.length=0;
  updateUndoBtn();
}
function updateUndoBtn(){
  const u=$("btnUndo"), r=$("btnRedo");
  if(u){ u.disabled=!undoStack.length; u.style.opacity=undoStack.length?"1":".45"; }
  if(r){ r.disabled=!redoStack.length; r.style.opacity=redoStack.length?"1":".45"; }
}
function historiaPakiet(guidy){
  return {type:"tagBundle", tags:cloneTags(),
    notes:(guidy||[]).map(g=>notes.find(n=>n.g===g)).filter(Boolean).map(cloneNote),
    deletedTagNames:deepCopy(deletedTagNames)};
}
/** Stosuje zapis historii i zwraca operację odwrotną. */
function applyHistory(u){
  if(u.type==="note"){
    const teraz=notes.find(x=>x.g===u.before.g);
    const odw=teraz ? {type:"note", before:cloneNote(teraz), label:u.label} : null;
    const i = notes.findIndex(x=>x.g===u.before.g);
    if(i>=0) notes[i]=cloneNote(u.before); else notes.push(cloneNote(u.before));
    if(deletedGuids.includes(u.before.g)){ deletedGuids = deletedGuids.filter(x=>x!==u.before.g); saveDeletedGuids(); }
    saveNote(u.before);
    return odw;
  } else if(u.type==="newNote"){
    const i = notes.findIndex(x=>x.g===u.g);
    const n=i>=0?cloneNote(notes[i]):null;
    if(i>=0){ notes.splice(i,1); zapomnijNotatke(u.g); }
    return n ? {type:"restoreNewNote", note:n, label:u.label} : null;
  } else if(u.type==="restoreNewNote"){
    if(u.note){
      const i=notes.findIndex(x=>x.g===u.note.g);
      if(i>=0) notes[i]=cloneNote(u.note); else notes.push(cloneNote(u.note));
      if(deletedGuids.includes(u.note.g)){ deletedGuids = deletedGuids.filter(x=>x!==u.note.g); saveDeletedGuids(); }
      saveNote(u.note);
    }
    return {type:"newNote", g:u.note&&u.note.g, label:u.label};
  } else if(u.type==="tags"){
    const odw={type:"tags", tags:cloneTags(), label:u.label};
    tags = deepCopy(u.tags); saveTags(); return odw;
  } else if(u.type==="delTag"){
    const odw=historiaPakiet((u.notes||[]).map(n=>n.g)); odw.label=u.label;
    tags = deepCopy(u.tags); saveTags();
    u.notes.forEach(b=>{ const i=notes.findIndex(x=>x.g===b.g); if(i>=0){ notes[i]=cloneNote(b); saveNote(b); } });
    deletedTagNames = deletedTagNames.filter(nm=>nm!==u.name && (!u.orig || nm!==u.orig));
    saveDeletedTags();
    return odw;
  } else if(u.type==="tagBundle"){
    const odw=historiaPakiet((u.notes||[]).map(n=>n.g)); odw.label=u.label;
    tags=deepCopy(u.tags); saveTags();
    (u.notes||[]).forEach(b=>{ const i=notes.findIndex(x=>x.g===b.g); if(i>=0) notes[i]=cloneNote(b); else notes.push(cloneNote(b)); saveNote(b); });
    deletedTagNames=deepCopy(u.deletedTagNames||[]); saveDeletedTags();
    return odw;
  }
  return null;
}
function doUndo(){
  const u = undoStack.pop();
  if(!u){ updateUndoBtn(); toast("Nie ma czego cofnąć"); return; }
  const odw=applyHistory(u); if(odw){ redoStack.push(odw); if(redoStack.length>30) redoStack.shift(); }
  updateUndoBtn();
  renderAll(); toast("Cofnięto: "+(u.label||"ostatnią zmianę"));
}
function doRedo(){
  const u=redoStack.pop();
  if(!u){ updateUndoBtn(); toast("Nie ma czego ponowić"); return; }
  const odw=applyHistory(u); if(odw){ undoStack.push(odw); if(undoStack.length>30) undoStack.shift(); }
  updateUndoBtn();
  renderAll(); toast("Ponowiono: "+(u.label||"ostatnią zmianę"));
}
$("btnUndo").onclick = doUndo;
$("btnRedo").onclick = doRedo;
updateUndoBtn();

function touchAccess(n){ n.la = new Date().toISOString(); saveNote(n); }
/**
 * Oznacza notatkę jako zmienioną: ustawia znacznik edycji, odświeża datę modyfikacji,
 * zapisuje ją i podbija licznik zmian bez kopii zapasowej.
 * Każda zmiana treści powinna przechodzić przez tę funkcję.
 * @param {Note} n
 */
function markDirty(n){ n.ed=true; n.mo=new Date().toISOString(); saveNote(n); bumpDirty(); }
function copyNote(n){
  const txt = (n.t?n.t+"\n\n":"") + (n.c||"") + (refLabel(n)?"\n— "+refLabel(n):"");
  navigator.clipboard.writeText(txt).then(()=>toast("Skopiowano do schowka"))
    .catch(()=>{ const ta=document.createElement("textarea"); ta.value=txt; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); toast("Skopiowano"); });
}
function downloadMd(n){
  const ref = refLabel(n);
  const tgs = n.tg.map(t=>(tags.find(x=>x.id===t)||{}).name).filter(Boolean);
  let md = "";
  if(n.t) md += "# "+n.t+"\n\n";
  if(ref) md += "**"+ref+"**"+(n.ks?" · "+n.ks:"")+"\n\n";
  md += (n.c||"")+"\n";
  if(tgs.length) md += "\nZakładki: "+tgs.join(", ")+"\n";
  const link = finderUrl(n);
  if(link) md += "\n[Otwórz w JW Library]("+link+")\n";
  const name = (ref || n.t || "notatka").replace(/[^\p{L}\p{N} :,-]/gu,"").replace(/[ :]/g,"_").substring(0,60)+".md";
  download(new Blob([md],{type:"text/markdown"}), name);
  toast("Pobrano plik Markdown");
}
/**
 * Przenosi notatkę do kosza (nie kasuje trwale). Kosz przechowuje wpisy 30 dni.
 * @param {Note} n
 */
async function delNote(n){
  if(!(await askConfirm("Usunąć notatkę?", "Trafi do <b>Kosza</b> — możesz ją przywrócić przez 30 dni (⚙️ menu → Kosz).", {okLabel:"Usuń", danger:true}))) return;
  pushUndo({type:"note", label:"usunięcie notatki", before:cloneNote(n)});
  n.del=true; n.delAt=new Date().toISOString(); markDirty(n); renderAll(); toast("Notatka w koszu");
}
const TRASH_DAYS = 30;
/* Trwałe skasowanie notatki musi zabrać ze sobą JEJ HISTORIĘ WERSJI.
   Inaczej w bazie zostawałby dziennik zmian notatki, której już nie ma:
   niewidoczny, niedostępny i zajmujący miejsce na zawsze. Trzy miejsca kasują
   notatki trwale (pojedynczo, przy opróżnianiu kosza i po trzydziestu dniach),
   więc kasowanie jest tu w jednym pomocniku, a nie powtórzone trzy razy. */
function zapomnijNotatke(g){
  if(!g) return;
  if(!deletedGuids.includes(g)){ deletedGuids.push(g); saveDeletedGuids(); }
  if(idb) idbDelKey("notes", g).catch(()=>{});
  if(typeof workerUsunNotatke==="function") workerUsunNotatke(g);
  if(typeof wersjeUsun === "function") wersjeUsun(g);
}
function trashList(){ return notes.filter(n=>n.del); }
function daysLeft(n){ if(!n.delAt) return TRASH_DAYS; const passed=(Date.now()-new Date(n.delAt).getTime())/86400000; return Math.max(0, Math.ceil(TRASH_DAYS-passed)); }
function purgeOldTrash(){
  const now=Date.now(); let removed=0; const keep=[];
  notes.forEach(n=>{
    if(n.del){
      if(!n.delAt){ n.delAt=new Date().toISOString(); saveNote(n); }   // stare usunięcia — daj im pełne 30 dni od teraz
      const passed=(now-new Date(n.delAt).getTime())/86400000;
      if(passed>=TRASH_DAYS){ zapomnijNotatke(n.g); removed++; return; }
    }
    keep.push(n);
  });
  if(removed){ notes=keep; bumpDirty(); }
}
function restoreNote(n){
  n.del=false; delete n.delAt;
  if(deletedGuids.includes(n.g)){ deletedGuids = deletedGuids.filter(x=>x!==n.g); saveDeletedGuids(); }
  markDirty(n); renderAll(); renderTrash(); toast("Notatka przywrócona");
}
function purgeNote(n){
  const i=notes.indexOf(n);
  if(i>=0){ notes.splice(i,1); zapomnijNotatke(n.g); }
  bumpDirty(); renderTrash(); toast("Usunięto na stałe");
}
async function emptyTrash(){
  const list=trashList(); if(!list.length){ toast("Kosz jest pusty"); return; }
  if(!(await askConfirm("Opróżnić kosz?", "Wszystkie notatki z kosza ("+list.length+") zostaną usunięte <b>na stałe</b>. Tej operacji nie można cofnąć.", {okLabel:"Usuń na stałe", danger:true}))) return;
  list.forEach(n=>{ const i=notes.indexOf(n); if(i>=0) notes.splice(i,1); zapomnijNotatke(n.g); });
  bumpDirty(); renderTrash(); renderAll(); toast("Kosz opróżniony");
}
function renderTrash(){
  const el=$("trashList"); if(!el) return;
  const list=trashList().sort((a,b)=>(b.delAt||"").localeCompare(a.delAt||""));
  if(!list.length){ el.innerHTML=`<div class="trash-empty">Kosz jest pusty</div>`; return; }
  el.innerHTML="";
  list.forEach(n=>{
    const row=document.createElement("div"); row.className="trash-row";
    const title=(n.t||"").trim() || (n.c||"").trim().slice(0,60) || "(bez tytułu)";
    row.innerHTML=`<div class="trash-main"><div class="trash-title">${esc(title)}</div><div class="trash-meta">usunięto ${ (n.delAt||"").substring(0,10) } · zostało ${daysLeft(n)} dni</div></div>
      <button class="tb restore" type="button">Przywróć</button>
      <button class="tb del" type="button">Usuń trwale</button>`;
    row.querySelector(".restore").onclick=()=>restoreNote(n);
    row.querySelector(".del").onclick=async ()=>{ if(await askConfirm("Usunąć na stałe?", "Notatki „"+esc(title)+"” nie da się odzyskać.", {okLabel:"Usuń", danger:true})) purgeNote(n); };
    el.appendChild(row);
  });
}
function openTrash(){ renderTrash(); openModal("modalTrash"); }
function untag(n,tid){ pushUndo({type:"note", label:"zmianę zakładek notatki", before:cloneNote(n)}); n.tg=n.tg.filter(t=>t!==tid); n.tgd=true; markDirty(n); renderAll(); }
function addTag(n,tid){
  if(!n.tg.includes(tid)){ pushUndo({type:"note", label:"dodanie do zakładki", before:cloneNote(n)}); n.tg.push(tid); n.tgd=true; markDirty(n); renderAll(); toast("Dodano do zakładki „"+(tags.find(t=>t.id===tid)||{}).name+"”"); }
  else toast("Notatka już jest w tej zakładce");
}
function dropOnTag(e,tid){
  const g = e.dataTransfer.getData("text/plain");
  const n = notes.find(x=>x.g===g); if(!n) return;
  pushUndo({type:"note", label:"przeniesienie notatki", before:cloneNote(n)});
  if(typeof filt.tag==="number" && n.tg.includes(filt.tag) && filt.tag!==tid){
    n.tg = n.tg.filter(t=>t!==filt.tag);
    if(!n.tg.includes(tid)) n.tg.push(tid);
    n.tgd=true; markDirty(n); renderAll();
    toast("Przeniesiono do „"+(tags.find(t=>t.id===tid)||{}).name+"”");
  } else addTag(n,tid);
}
