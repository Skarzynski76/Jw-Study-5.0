/* ==========================================================================
   JW Study — pubtabs.js
   Własne zakładki wewnątrz publikacji
   --------------------------------------------------------------------------
   Sortowanie „Kolejność w publikacji" układa notatki tak, jak leżą w książce.
   Bywa to za sztywne — te zakładki pozwalają poukładać notatki po swojemu:
   tworzysz zakładkę przy konkretnej publikacji i sam przypisujesz do niej notatki.
   Zakładka należy do CAŁEJ publikacji (symbol „ks"), a nie do pojedynczego wydania,
   więc notatki z różnych roczników mogą trafić do tej samej zakładki.
   Sortowanie zostaje bez zmian — to dodatkowy sposób porządkowania, nie zamiennik.
   ========================================================================== */
"use strict";

let pubTabs = [];          // [{id, ks, name, ord}]

function savePubTabs(){
  if(idb) idbPut("meta", pubTabs, "pubTabs").catch(e=>reportSaveError(e,"zakładki publikacji"));
}
async function loadPubTabs(){
  if(!idb) return;
  try{ pubTabs = (await idbGet("meta","pubTabs")) || []; }catch(e){ pubTabs = []; }
  if(!Array.isArray(pubTabs)) pubTabs = [];
  // sito: rekord bez nazwy albo bez publikacji jest bezużyteczny
  pubTabs = pubTabs.filter(t=>t && typeof t==="object" && t.ks && typeof t.name==="string" && t.name.trim());
  /* Zakładka ogólna może zawierać także całe pozycje z kolumny Publikacje.
     Starsze rekordy nie mają refs — dostają pustą listę bez migracji danych. */
  pubTabs.forEach(t=>{
    if(!Array.isArray(t.refs)) t.refs=[];
    t.refs=t.refs.filter(r=>r && typeof r.key==="string" && r.key && typeof r.label==="string");
  });
}
function nextPubTabId(){ return nastepnyNumer(pubTabs); }

/** Zakładki danej publikacji, w zapamiętanej kolejności. */
function pubTabsFor(ks){
  if(!ks) return [];
  return pubTabs.filter(t=>t.ks===ks).sort((a,b)=>(a.ord||0)-(b.ord||0) || String(a.name).localeCompare(String(b.name),"pl"));
}
/** Ile notatek leży w zakładce (bez kosza). */
function pubRefMatches(n, key){
  if(!n || n.del || n.b) return false;
  if(key.indexOf("tag:")===0) return (n.tg||[]).includes(+key.slice(4));
  if(key.indexOf("cat:")===0) return pubCatOf(n).id===key.slice(4);
  if(key.indexOf("year:")===0){
    const p=key.split(":");
    return pubCatOf(n).id===p[1] && (pubYearOf(n)||"—")===p.slice(2).join(":");
  }
  if(key.indexOf("pub:")===0) return pubKeyOf(n)===key.slice(4);
  return false;
}
function pubTabHasNote(n,id){
  if(n.ptb===id) return true;
  const t=pubTabs.find(x=>x.id===id);
  return !!(t && Array.isArray(t.refs) && t.refs.some(r=>pubRefMatches(n,r.key)));
}
function pubTabCount(id){ let c=0; for(const n of notes) if(!n.del && pubTabHasNote(n,id)) c++; return c; }

function addPubRefToTab(id, key, label){
  const t=pubTabs.find(x=>x.id===id && x.ks==="*"); if(!t || !key) return;
  if(!Array.isArray(t.refs)) t.refs=[];
  if(t.refs.some(r=>r.key===key)){ toast("Ta pozycja już jest w zakładce „"+t.name+"”"); return; }
  t.refs.push({key, label:label||key});
  savePubTabs(); renderAll();
  toastOk("Dodano „"+(label||key)+"” do zakładki „"+t.name+"”");
}
function removePubRefFromTab(id,key){
  const t=pubTabs.find(x=>x.id===id); if(!t || !Array.isArray(t.refs)) return;
  t.refs=t.refs.filter(r=>r.key!==key);
  savePubTabs(); renderAll(); toastOk("Usunięto pozycję z zakładki");
}

/* Podsumowanie publikacji policzone JEDNYM przebiegiem po notatkach:
   ile notatek ma każda zakładka i ile jest w niej różnych rozdziałów.
   Przy kilkunastu tysiącach notatek osobne przeliczanie każdej wartości
   oznaczało kilka pełnych przebiegów na każde przerysowanie panelu. */
function pubStats(ks){
  const wZakladce = new Map();
  const rozdzialy = new Set();
  for(let i=0;i<notes.length;i++){
    const n = notes[i];
    if(n.del) continue;
    if(n.ptb) wZakladce.set(n.ptb, (wZakladce.get(n.ptb)||0) + 1);
    if(!n.b && n.ks===ks){
      const tytul = (n.pub||"").trim();
      if(tytul) rozdzialy.add(n.doc ? ("d"+n.doc) : ("t"+norm(tytul)));
    }
  }
  return { wZakladce, rozdzialow: rozdzialy.size };
}

/** Publikacja, w kontekście której jesteśmy — z wybranego filtru albo z kategorii. */
function pubCtxKs(){
  const b = String(filt.pub||"");
  if(b.indexOf("pub:")===0){
    const key=b.slice(4);
    if(key.indexOf("year:")!==0) return key.split("|")[0];
  }
  if(b.indexOf("ptb:")===0){
    const t = pubTabs.find(x=>String(x.id)===b.slice(4));
    if(t) return t.ks;
  }
  if(pubView.cat){
    // w kategorii rocznikowej wszystkie notatki mają zwykle ten sam symbol
    const licz={};
    for(const n of notes){
      if(n.del || n.b || !n.ks) continue;
      if(pubCatOf(n).id!==pubView.cat) continue;
      licz[n.ks]=(licz[n.ks]||0)+1;
    }
    const klucze=Object.keys(licz);
    if(klucze.length===1) return klucze[0];
    if(klucze.length>1) return klucze.sort((a,b)=>licz[b]-licz[a])[0];
  }
  return null;
}

/* ——— tworzenie, zmiana nazwy, usuwanie ——— */
async function createPubTab(ks){
  if(!ks){ toast("Najpierw wybierz publikację"); return null; }
  const ogolna = ks==="*";
  const nazwa = await askText({
    title:ogolna ? "Nowa zakładka ogólna" : "Nowa zakładka w publikacji",
    placeholder:ogolna ? "np. Wykłady — wtorek" : "np. Rozdziały o modlitwie",
    okLabel:"Utwórz",
    hint:ogolna
      ? "Możesz tu włożyć dowolną notatkę, etykietę, kategorię, rocznik albo całą publikację."
      : "Zakładka należy do publikacji „"+esc(pubFullName(ks)||ks)+"”. Notatki dodasz do niej z menu notatki."
  });
  if(!nazwa || !nazwa.trim()) return null;
  const nm = nazwa.trim();
  if(pubTabsFor(ks).some(t=>norm(t.name)===norm(nm))){ toast("Taka zakładka już jest"); return null; }
  const t = {id: nextPubTabId(), ks, name: nm, ord: pubTabsFor(ks).length};
  pubTabs.push(t);
  savePubTabs(); renderAll();
  toastOk("Utworzono zakładkę „"+nm+"”");
  return t;
}
async function renamePubTab(id){
  const t = pubTabs.find(x=>x.id===id); if(!t) return;
  const nazwa = await askText({title:"Zmień nazwę zakładki", value:t.name, okLabel:"Zapisz"});
  if(!nazwa || !nazwa.trim()) return;
  t.name = nazwa.trim(); savePubTabs(); renderAll(); toastOk("Zmieniono nazwę");
}
async function deletePubTab(id){
  const t = pubTabs.find(x=>x.id===id); if(!t) return;
  const ile = pubTabCount(id);
  const ok = await askConfirm("Usunąć zakładkę „"+t.name+"”?",
    ile ? ("Notatki zostaną — wypadną tylko z tej zakładki. Dotyczy to "+ile+" notatek.")
        : "Zakładka jest pusta.",
    {okLabel:"Usuń", danger:true});
  if(!ok) return;
  notes.forEach(n=>{ if(n.ptb===id){ delete n.ptb; if(idb) saveNote(n); } });
  pubTabs = pubTabs.filter(x=>x.id!==id);
  savePubTabs();
  if(String(filt.pub)==="ptb:"+id){ filt.pub="all"; persistFilt(); }
  renderAll(); toastOk("Usunięto zakładkę");
}
/** Przypisanie notatki do zakładki (albo wypisanie, gdy id jest puste). */
function setNotePubTab(n, id){
  if((id||null)===(n.ptb||null)) return;
  pushUndo({type:"note", label:"zmianę zakładki ogólnej lub publikacji", before:cloneNote(n)});
  if(id) n.ptb = id; else delete n.ptb;
  markDirty(n); renderAll();
  const t = pubTabs.find(x=>x.id===id);
  toastOk(t ? "Dodano do zakładki „"+t.name+"”" : "Usunięto z zakładki");
}

/* ——— menu wyboru zakładki przy notatce ——— */
function pubTabMenu(n, anchor){
  const ks = n.ks;
  const dd = $("dropdown");
  const ogolne = pubTabsFor("*");
  const lista = ks ? pubTabsFor(ks) : [];
  dd.innerHTML =
    `<div class="dd-lbl">Moje zakładki</div>`+
    (ogolne.length
      ? ogolne.map(t=>`<div data-pt="${t.id}">${n.ptb===t.id?"✓ ":""}${esc(t.name)}<span class="dd-hint">${pubTabCount(t.id)}</span></div>`).join("")
      : `<div class="dd-note">Nie masz jeszcze zakładek ogólnych.</div>`)+
    `<div data-pt="new-global">${ICO.plus||"＋"} Nowa zakładka ogólna…</div>`+
    (ks ? `<div class="dd-sep"></div><div class="dd-lbl">${esc(pubFullName(ks)||ks)}</div>` : ``) +
    (lista.length
      ? lista.map(t=>`<div data-pt="${t.id}">${n.ptb===t.id?"✓ ":""}${esc(t.name)}<span class="dd-hint">${pubTabCount(t.id)}</span></div>`).join("")
      : (ks ? `<div class="dd-note">Ta publikacja nie ma jeszcze zakładek.</div>` : ``)) +
    (ks ? `<div data-pt="new-pub">${ICO.plus||"＋"} Nowa zakładka tej publikacji…</div>` : ``) +
    (n.ptb ? `<div data-pt="none" class="dd-danger">Usuń z zakładki</div>` : ``);
  dd.style.display="block"; placeDropdown(dd, anchor);
  dd.onclick = async ev=>{
    const it = ev.target.closest("[data-pt]"); if(!it) return;
    dd.style.display="none";
    const v = it.dataset.pt;
    if(v==="new-global"){ const t = await createPubTab("*"); if(t) setNotePubTab(n, t.id); return; }
    if(v==="new-pub"){ const t = await createPubTab(ks); if(t) setNotePubTab(n, t.id); return; }
    if(v==="none"){ setNotePubTab(n, null); return; }
    setNotePubTab(n, +v);
  };
}

/* ——— zakładki w panelu Publikacje ———
   Panel zostaje taki, jaki był: kategorie → roczniki → wydania. Zakładki nie tworzą
   osobnej sekcji nad listą — pojawiają się wcięte POD wybraną publikacją, dokładnie
   tam, gdzie ich szukasz: otwierasz „Kurs Służby Pionierskiej" i pod spodem masz
   swoje zakładki plus wiersz do utworzenia nowej. Gdy nic nie jest wybrane,
   panel wygląda dokładnie jak wcześniej. */

/** Wiersze zakładek doklejane pod wskazaną pozycją publikacji. */
function pubTabRowsHtml(ks){
  if(!ks) return "";
  const lista = pubTabsFor(ks);
  const stat = pubStats(ks);            // jeden przebieg po notatkach na cały blok
  let h = lista.length
    ? `<div class="strefaPoczatku" data-upusc-start="zakladkaPub" data-cel="${lista[0].id}">⇧ Upuść na początku zakładek</div>`
    : "";
  lista.forEach(t=>{
    const act = String(filt.pub)==="ptb:"+t.id;
    h += `<div class="item ptbItem${act?" active":""}" data-ptb="${t.id}" data-ord="${t.id}">`+
         `<span class="dragOrd" title="Przeciągnij, aby zmienić kolejność">${IC_GRIP}</span>`+
         `<span class="nm">${esc(t.name)}</span>`+
         `<span class="more" data-ptmore="${t.id}" title="Opcje zakładki">${IC_DOTS}</span>`+
         `<span class="cnt">${t.ks==="*" ? pubTabCount(t.id) : (stat.wZakladce.get(t.id)||0)}</span></div>`;
    /* Pozycje wrzucone w całości są widoczne pod zakładką. To nie są kopie
       danych — tylko odsyłacze, więc usunięcie ich nie usuwa żadnej notatki. */
    if(t.ks==="*" && Array.isArray(t.refs)) t.refs.forEach(r=>{
      h += `<div class="item ptbRef" data-ptref="${esc(r.key)}" data-ptowner="${t.id}" title="Otwórz zawartość zakładki">`+
           `<span class="ptbMark">↳</span><span class="nm">${esc(r.label)}</span>`+
           `<button type="button" class="ptbRefDel" data-ptrefdel="${esc(r.key)}" data-ptowner="${t.id}" title="Wyjmij z zakładki" aria-label="Wyjmij ${esc(r.label)} z zakładki">×</button></div>`;
    });
  });
  h += `<div class="item ptbNew" data-ptadd="${esc(ks)}"><span class="ptbMark">＋</span>`+
       `<span class="nm">${ks==="*" ? "Nowa zakładka ogólna" : "Nowa zakładka"}</span></div>`;
  // skrót do rozpisania publikacji na rozdziały — pokazujemy tylko, gdy jest z czego
  if(stat.rozdzialow > 1){
    h += `<div class="item ptbAuto" data-ptauto="${esc(ks)}"><span class="ptbMark">⇥</span>`+
         `<span class="nm">Rozpisz na rozdziały</span></div>`;
  }
  return h;
}
/** Podpięcie zdarzeń — wołane po każdym przerysowaniu panelu. */
function bindPubTabs(el){
  /* Przenoszenie zakładek obsługuje 34-chwytanie.js (nasłuch na dokumencie). */
  el.querySelectorAll("[data-ptadd]").forEach(b=>{
    b.onclick = e=>{ e.stopPropagation(); createPubTab(b.dataset.ptadd); };
  });
  el.querySelectorAll("[data-ptauto]").forEach(b=>{
    b.onclick = e=>{ e.stopPropagation(); autoPubTabs(b.dataset.ptauto); };
  });
  el.querySelectorAll(".ptbItem").forEach(it=>{
    it.onclick = e=>{
      const wiecej = e.target.closest("[data-ptmore]");
      if(wiecej){ e.stopPropagation(); pubTabOptions(+wiecej.dataset.ptmore, wiecej); return; }
      wlaczZawezenieWynikow();
      const k = "ptb:"+it.dataset.ptb;
      filt.pub = (String(filt.pub)===k) ? "all" : k;
      persistFilt(); renderAll();
      if(innerWidth<=900) mobileShow("colNotes");
    };
  });
  el.querySelectorAll(".ptbRef").forEach(it=>{
    it.onclick=e=>{
      const del=e.target.closest("[data-ptrefdel]");
      if(del){ e.stopPropagation(); removePubRefFromTab(+del.dataset.ptowner,del.dataset.ptrefdel); return; }
      wlaczZawezenieWynikow();
      const k="ptb:"+it.dataset.ptowner;
      filt.pub=(String(filt.pub)===k)?"all":k;
      persistFilt(); renderAll();
      if(innerWidth<=900) mobileShow("colNotes");
    };
  });
}
function pubTabOptions(id, anchor){
  const t = pubTabs.find(x=>x.id===id); if(!t) return;
  const dd = $("dropdown");
  dd.innerHTML = `<div class="dd-lbl">${esc(t.name)}</div>`+
    `<div data-pto="rename">Zmień nazwę…</div>`+
    `<div data-pto="up">Wyżej</div>`+
    `<div data-pto="down">Niżej</div>`+
    `<div class="dd-sep"></div>`+
    `<div data-pto="wyslij">Wyślij na inne urządzenie…</div>`+
    `<div class="dd-sep"></div>`+
    `<div data-pto="del" class="dd-danger">Usuń zakładkę</div>`;
  dd.style.display="block"; placeDropdown(dd, anchor);
  dd.onclick = ev=>{
    const it = ev.target.closest("[data-pto]"); if(!it) return;
    dd.style.display="none";
    const v = it.dataset.pto;
    if(v==="wyslij"){ wyslijZakladkePub(id); return; }
    if(v==="rename"){ renamePubTab(id); return; }
    if(v==="del"){ deletePubTab(id); return; }
    const lista = pubTabsFor(t.ks);
    const i = lista.indexOf(t);
    const j = v==="up" ? i-1 : i+1;
    if(j<0 || j>=lista.length) return;
    lista.splice(i,1); lista.splice(j,0,t);
    lista.forEach((x,k)=>{ x.ord=k; });
    savePubTabs(); renderAll();
  };
}

/* ══════════════ ZAKŁADKI Z ROZDZIAŁÓW — AUTOMATYCZNIE ══════════════
   Notatka zaimportowana z JW Library niesie ze sobą tytuł miejsca, z którego pochodzi
   (pole „pub" — np. „Lekcja 7", „Rozdział 12") oraz identyfikator dokumentu („doc").
   Skoro aplikacja to widzi, nie ma powodu, żeby użytkownik klikał każdą notatkę osobno:
   poniższe funkcje potrafią rozpisać publikację na zakładki wprost z tych danych. */

/** Grupuje notatki publikacji po rozdziale/lekcji. Klucz to identyfikator dokumentu,
 *  a gdy go brak — sam tytuł miejsca. */
function pubChapterGroups(ks){
  const grupy = new Map();
  for(const n of notes){
    if(n.del || n.b || n.ks !== ks) continue;
    const tytul = (n.pub || "").trim();
    if(!tytul) continue;                       // bez nazwy rozdziału nie ma czego nazwać
    const klucz = n.doc ? ("d"+n.doc) : ("t"+norm(tytul));
    if(!grupy.has(klucz)) grupy.set(klucz, {nazwa: tytul, notatki: []});
    grupy.get(klucz).notatki.push(n);
  }
  // kolejność jak w publikacji: wg identyfikatora dokumentu, potem alfabetycznie
  return [...grupy.values()].sort((a,b)=>{
    const da=a.notatki[0].doc||0, db=b.notatki[0].doc||0;
    return da-db || a.nazwa.localeCompare(b.nazwa,"pl",{numeric:true});
  });
}

/** Rozpisuje publikację na zakładki: jedna zakładka na rozdział, notatki przypisane. */
async function autoPubTabs(ks){
  if(!ks){ toast("Najpierw wybierz publikację"); return; }
  const grupy = pubChapterGroups(ks);
  if(!grupy.length){
    showInfo("Nie ma z czego utworzyć zakładek",
      "Notatki z tej publikacji nie mają zapisanego rozdziału ani artykułu. "+
      "Taka informacja trafia do notatki przy imporcie kopii z JW Library.");
    return;
  }
  const istniejace = pubTabsFor(ks);
  const nowe   = grupy.filter(g=>!istniejace.some(t=>norm(t.name)===norm(g.nazwa)));
  const wolne  = grupy.reduce((a,g)=>a+g.notatki.filter(n=>!n.ptb).length, 0);
  const podglad = grupy.slice(0,6).map(g=>"• "+esc(g.nazwa)+" — "+g.notatki.length+
                   (g.notatki.length===1?" notatka":" notatek")).join("<br>");
  const ok = await askConfirm("Rozpisać publikację na zakładki?",
    "Znalazłem <b>"+grupy.length+"</b> "+(grupy.length===1?"rozdział":"rozdziałów")+
    " w publikacji „"+esc(pubFullName(ks)||ks)+"”:<br><br>"+podglad+
    (grupy.length>6 ? "<br>… i jeszcze "+(grupy.length-6) : "")+
    "<br><br>Powstanie <b>"+nowe.length+"</b> nowych zakładek, a do zakładek trafi <b>"+wolne+"</b> notatek.<br><br>"+
    "<b>Notatki już przypisane ręcznie zostaną nietknięte.</b>",
    {okLabel:"Rozpisz"});
  if(!ok) return;

  let utworzone=0, przypisane=0, zmienioneNotatki=[];
  let ord = istniejace.length;
  grupy.forEach(g=>{
    let tab = pubTabsFor(ks).find(t=>norm(t.name)===norm(g.nazwa));
    if(!tab){ tab = {id: nextPubTabId(), ks, name: g.nazwa, ord: ord++}; pubTabs.push(tab); utworzone++; }
    g.notatki.forEach(n=>{
      if(n.ptb) return;                        // ręczne przypisanie ma pierwszeństwo
      n.ptb = tab.id; przypisane++; zmienioneNotatki.push(n);
    });
  });
  savePubTabs();
  if(idb && zmienioneNotatki.length) idbBulkChunked("notes", zmienioneNotatki).catch(e=>reportSaveError(e,"przypisanie do zakładek"));
  bumpDirty(); renderAll();
  toastOk("Utworzono "+utworzone+" zakładek, przypisano "+przypisane+" notatek");
}
