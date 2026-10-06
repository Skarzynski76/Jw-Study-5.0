/* ==========================================================================
   JW Study — sekcje-zakladki.js
   ZAKŁADKI WEWNĄTRZ SEKCJI

   Sekcja grupowała dotąd wyłącznie etykiety. Zakładka to poziom niżej:
   nazwane miejsce wewnątrz sekcji, do którego wrzuca się notatki ALBO etykiety,
   według uznania. Przykład: sekcja „Kongres 2026", a w niej zakładki
   „Wykłady", „Punkty do przemyślenia", „Materiały".

   Model danych:
     secTabs  = [{id, sec, name, ord}]     — przechowywane w meta pod "secTabs"
     note.stb = id zakładki                — notatka wrzucona wprost
     tag.stb  = id zakładki                — etykieta przypisana do zakładki

   Zakładka pokazuje notatki wrzucone wprost ORAZ wszystkie notatki noszące
   którąkolwiek z jej etykiet — dzięki temu da się jej używać na oba sposoby
   naraz, bez wybierania jednego podejścia na starcie.
   ========================================================================== */
"use strict";

let secTabs = [];

/* Ikona zakładki. Wcześniej rysowana samymi krawędziami elementu (ramka bez dolnej
   krawędzi) — wyglądała jak niedokończony kwadrat. Teraz zwykły, zamknięty kształt. */
const IC_ZAKLADKA = svgIc('<path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z"/>');

function saveSecTabs(){
  if(idb) idbPut("meta", secTabs, "secTabs").catch(e=>reportSaveError(e,"zakładki sekcji"));
}
async function loadSecTabs(){
  try{
    const dane = await idbGet("meta","secTabs");
    secTabs = Array.isArray(dane) ? dane.filter(z=>z && typeof z==="object" && z.id && typeof z.name==="string") : [];
  }catch(e){ secTabs = []; }
}
function nextSecTabId(){ return secTabs.reduce((m,z)=>Math.max(m,z.id||0),0)+1; }

/** Zakładki danej sekcji, w kolejności ustawionej przez użytkownika. */
/** Kolor zakładki, wyłącznie w bezpiecznym zapisie. */
function kolorZakladki(z){
  return (z && typeof kolorBezpieczny==="function" && kolorBezpieczny(z.color)) ? z.color : "";
}
function secTabsFor(secId){
  return secTabs.filter(z=>z.sec===secId).sort((a,b)=>(a.ord??0)-(b.ord??0));
}
/** Ile notatek trafia do zakładki — wrzuconych wprost i przez etykiety. */
/* ==========================================================================
   LICZNIKI ZAKŁADEK — JEDEN PRZEBIEG ZAMIAST JEDNEGO NA ZAKŁADKĘ

   secTabCount przelatywał CAŁĄ listę notatek osobno dla każdej zakładki, a przy
   każdej notatce jeszcze raz po jej etykietach. Przy trzech tysiącach notatek
   i dwudziestu zakładkach dawało to grubo ponad sto tysięcy porównań przy KAŻDYM
   przerysowaniu kolumny — a przerysowanie zdarza się po każdej zmianie filtra,
   każdej edycji i każdym przeniesieniu. Na telefonie było to odczuwalne.

   Teraz liczymy wszystkie zakładki naraz, jednym przebiegiem, i trzymamy wynik
   do końca bieżącego przerysowania. */
let _licznikiZakladek = null;

/** Unieważnia policzone liczniki — wołane na starcie każdego przerysowania. */
function resetLicznikowZakladek(){ _licznikiZakladek = null; }

/** Mapa: id zakładki → ile notatek do niej należy. Liczona raz. */
function licznikiZakladek(){
  if(_licznikiZakladek) return _licznikiZakladek;
  const wynik = new Map();
  /* Etykieta → zakładka, żeby przy notatce nie przeszukiwać listy etykiet. */
  const zakladkaEtykiety = new Map();
  for(const t of tags) if(t.stb) zakladkaEtykiety.set(t.id, t.stb);
  for(const z of secTabs) wynik.set(z.id, 0);
  for(const n of notes){
    if(n.del) continue;
    /* Notatka liczy się do zakładki raz, nawet gdy trafia do niej i wprost,
       i przez kilka swoich etykiet. */
    const trafione = new Set();
    if(n.stb!=null) trafione.add(n.stb);
    if(n.tg) for(const idE of n.tg){
      const z = zakladkaEtykiety.get(idE);
      if(z!=null) trafione.add(z);
    }
    trafione.forEach(z=>{ if(wynik.has(z)) wynik.set(z, wynik.get(z)+1); });
  }
  _licznikiZakladek = wynik;
  return wynik;
}
function secTabCount(id){
  const m = licznikiZakladek();
  return m.has(id) ? m.get(id) : 0;
}
/** Czy notatka należy do zakładki — wprost albo przez którąś ze swoich etykiet. */
function notatkaWZakladce(n, id){
  if(n.stb===id) return true;
  if(!n.tg || !n.tg.length) return false;
  return tags.some(t=>t.stb===id && n.tg.includes(t.id));
}

/* ===== TWORZENIE I ZARZĄDZANIE ===== */
async function createSecTab(secId){
  const s = sections.find(x=>x.id===secId); if(!s) return;
  const nazwa = await askText({title:"Nowa zakładka w sekcji „"+s.name+"”",
    placeholder:"np. Wykłady", okLabel:"Utwórz",
    hint:"Do zakładki wrzucisz notatki albo etykiety — jak wolisz."});
  if(!nazwa || !nazwa.trim()) return;
  const nm = nazwa.trim();
  if(secTabsFor(secId).some(z=>z.name===nm)){ toast("Taka zakładka już tu jest"); return; }
  secTabs.push({id:nextSecTabId(), sec:secId, name:nm, ord:secTabsFor(secId).length});
  saveSecTabs(); renderTags();
  toastOk("Utworzono zakładkę „"+nm+"”");
}
async function renameSecTab(id){
  const z = secTabs.find(x=>x.id===id); if(!z) return;
  const nazwa = await askText({title:"Zmień nazwę zakładki", value:z.name, okLabel:"Zapisz"});
  if(!nazwa || !nazwa.trim()) return;
  z.name = nazwa.trim(); saveSecTabs(); renderTags();
}
async function deleteSecTab(id){
  const z = secTabs.find(x=>x.id===id); if(!z) return;
  const ile = secTabCount(id);
  const etyk = tags.filter(t=>t.stb===id).length;
  if(!(await askConfirm("Usunąć zakładkę?",
      "Zakładka „"+esc(z.name)+"”."+
      (ile||etyk ? "<br><br><b>Notatki i etykiety NIE zostaną usunięte</b> — wrócą do sekcji." : ""),
      {okLabel:"Usuń zakładkę", danger:true}))) return;
  notes.forEach(n=>{ if(n.stb===id){ delete n.stb; markDirty(n); } });
  tags.forEach(t=>{ if(t.stb===id) delete t.stb; });
  secTabs = secTabs.filter(x=>x.id!==id);
  saveSecTabs(); saveTags();
  if(String(filt.tag)==="stb:"+id) filt.tag="all";
  renderAll();
  toast("Usunięto zakładkę");
}
/** Wrzuca notatkę do zakładki albo ją stamtąd zdejmuje (id === null). */
function setNoteSecTab(n, id){
  if(id===null || id===undefined) delete n.stb; else n.stb = id;
  markDirty(n); renderAll();
  const z = secTabs.find(x=>x.id===id);
  toast(z ? "Notatka w zakładce „"+z.name+"”" : "Notatka zdjęta z zakładki");
}
/** Przypisuje etykietę do zakładki albo zdejmuje. */
function setTagSecTab(t, id){
  if(id===null || id===undefined) delete t.stb;
  else { t.stb = id; const z=secTabs.find(x=>x.id===id); if(z) t.sec = z.sec; }
  saveTags(); renderAll();
}

/* ===== MENU ===== */
/** Lista zakładek do wyboru — dla notatki albo dla etykiety. */
function menuZakladek(el, obiekt, rodzaj){
  const dd = $("dropdown");
  const teraz = obiekt.stb;
  const grupy = sections.slice().sort((a,b)=>(a.ord??0)-(b.ord??0))
    .map(s=>{
      const lista = secTabsFor(s.id);
      if(!lista.length) return "";
      return `<div class="dd-lbl">${esc(s.name)}</div>` +
        lista.map(z=>`<div data-stb="${z.id}">${teraz===z.id?"✓ ":""}${esc(z.name)}`+
                     `<span class="dd-hint">${secTabCount(z.id)}</span></div>`).join("");
    }).join("");
  dd.innerHTML = grupy
    ? `<div class="dd-lbl">Wrzuć do zakładki</div>`+grupy+
      `<div class="dd-sep"></div><div data-stb="none">Zdejmij z zakładki</div>`
    : `<div class="dd-lbl">Brak zakładek</div>`+
      `<div class="dd-hint" style="padding:6px 12px">Utwórz zakładkę w sekcji: menu ⋯ przy nazwie sekcji.</div>`;
  dd.style.display="block";
  if(typeof oznaczPozycjeMenu==="function") oznaczPozycjeMenu(dd);
  placeDropdown(dd, el);
  dd.onclick = ev=>{
    const w = ev.target.closest("[data-stb]"); if(!w) return;
    dd.style.display="none";
    const id = w.dataset.stb==="none" ? null : +w.dataset.stb;
    if(rodzaj==="tag") setTagSecTab(obiekt, id); else setNoteSecTab(obiekt, id);
  };
}
/** Menu samej zakładki: nazwa, kolejność, usunięcie. */
function secTabMenu(e, z){
  const dd = $("dropdown");
  const gora=_svg('<path d="M12 19V5M6 11l6-6 6 6"/>'), dol=_svg('<path d="M12 5v14M6 13l6 6 6-6"/>');
  const pal = c => {
    const wybrany = (c||"") === (kolorZakladki(z)||"");
    return `<span class="pal ${c?"":"pal-none"} ${wybrany?"sel":""}" data-zc="${c||""}" `+
           `style="${c?`background:${c}`:""}" title="${c||"Bez koloru"}">${c?"":"✕"}</span>`;
  };
  dd.innerHTML =
    `<div class="dd-lbl">Zakładka „${esc(z.name)}” · ${secTabCount(z.id)} notatek</div>
     <div data-zm="ren">${ICO.edit}Zmień nazwę</div>
     <div class="dd-lbl">Kolor zakładki</div>
     <div class="palrow">${pal("")}${TAGCOLORS.map(c=>pal(c)).join("")}</div>
     <div class="dd-sep"></div>
     <div data-zm="up">${gora}Przesuń w górę</div>
     <div data-zm="down">${dol}Przesuń w dół</div>
     <div data-zm="sek">${ICO.file}Przenieś do innej sekcji…</div>
     <div class="dd-sep"></div>
     <div data-zm="wyslij">${ICO.copy}Wyślij na inne urządzenie…</div>
     <div class="dd-sep"></div>
     <div data-zm="del" class="dd-danger">${ICO.trash}Usuń zakładkę</div>`;
  dd.style.display="block";
  if(typeof oznaczPozycjeMenu==="function") oznaczPozycjeMenu(dd);
  placeDropdown(dd, e.target);
  dd.onclick = ev=>{
    if(ev.target.dataset.zc!==undefined){
      z.color = ev.target.dataset.zc || undefined;
      saveSecTabs(); dd.style.display="none"; renderTags(); return;
    }
    const m = ev.target.closest("[data-zm]"); if(!m) return;
    dd.style.display="none";
    const a = m.dataset.zm;
    if(a==="wyslij") wyslijZakladke(z.id);
    else if(a==="ren") renameSecTab(z.id);
    else if(a==="sek") przeniesZakladkeDoSekcji(z.id);
    else if(a==="del") deleteSecTab(z.id);
    else przesunSecTab(z.id, a==="up" ? -1 : 1);
  };
}
function przesunSecTab(id, kier){
  const z = secTabs.find(x=>x.id===id); if(!z) return;
  const lista = secTabsFor(z.sec);
  const i = lista.findIndex(x=>x.id===id);
  const j = i + kier;
  if(j<0 || j>=lista.length) return;
  const tmp = lista[i].ord ?? i; lista[i].ord = lista[j].ord ?? j; lista[j].ord = tmp;
  saveSecTabs(); renderTags();
}
/** Wiersze zakładek pod nagłówkiem sekcji. */
function secTabRowsHtml(secId){
  const lista = secTabsFor(secId);
  if(!lista.length) return "";
  const strefa = `<div class="strefaPoczatku" data-upusc-start="zakladka" data-cel="${lista[0].id}" data-sek="${secId}">⇧ Upuść na początku zakładek</div>`;
  return strefa + lista.map(z=>{
    const akt = String(filt.tag)==="stb:"+z.id;
    const ile = secTabCount(z.id);
    const kol = kolorZakladki(z);
    /* Kolor niesie ikona i lewa krawędź wiersza — tło zostaje jasne, żeby napis
       był czytelny przy każdym odcieniu z palety. */
    const styl = kol ? ` style="--stbKol:${kol}"` : "";
    return `<div class="item stbItem${akt?" active":""}${ile?"":" zero"}${kol?" zKolorem":""}" `+
           `data-stb="${z.id}" data-ord="${z.id}"${styl}>`+
           `<span class="dragOrd" title="Przeciągnij, aby zmienić kolejność">${IC_GRIP}</span>`+
           `<span class="stbIc" aria-hidden="true">${IC_ZAKLADKA}</span>`+
           `<span class="nm">${esc(z.name)}</span>`+
           `<span class="more" title="Opcje zakładki">${IC_DOTS}</span>`+
           `<span class="cnt">${ile}</span></div>`;
  }).join("");
}
