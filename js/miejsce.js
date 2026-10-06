/* ==========================================================================
   JW Study — miejsce.js
   MIEJSCE NOTATKI W PUBLIKACJI — USTAWIONE RĘCZNIE I NIENARUSZALNE

   Notatka przysłana z innego urządzenia albo napisana od zera nie ma numerów
   z JW Library, więc w sortowaniu „Kolejność w publikacji" lądowała na końcu
   swojej publikacji i nie dało się z tym nic zrobić.

   Tutaj wskazujesz jej miejsce sam: publikację, artykuł i akapit. Wybór jest
   ZNACZONY (pole `pw`) i od tej chwili nietykalny — kolejne wczytanie kopii
   z JW Library go nie ruszy. Bez tego znacznika import, który od v2.01
   odświeża położenie każdej notatki, skasowałby Twój wybór przy najbliższej
   okazji i wszystko wróciłoby do punktu wyjścia.
   ========================================================================== */
"use strict";

/** Publikacje obecne w notatkach: klucz „ks|itn" → czytelna nazwa. */
function dostepnePublikacje(){
  const mapa = new Map();
  notes.forEach(n=>{
    if(n.del || n.b) return;                 // biblijne mają własne przypisanie wersetu
    if(!n.ks) return;
    const k = pubKeyOf(n);
    if(!mapa.has(k)) mapa.set(k, pubKeyLabel(k));
  });
  return [...mapa.entries()].sort((a,b)=>a[1].localeCompare(b[1],"pl"));
}
/** Artykuły znane w danej publikacji: numer dokumentu → tytuł. */
function artykulyPublikacji(klucz){
  const mapa = new Map();
  notes.forEach(n=>{
    if(n.del || n.b || !n.doc) return;
    if(pubKeyOf(n)!==klucz) return;
    if(!mapa.has(n.doc)) mapa.set(n.doc, (n.pub||"").trim() || ("Dokument "+n.doc));
  });
  return [...mapa.entries()].sort((a,b)=>a[0]-b[0]);
}

/** Krótki opis bieżącego miejsca notatki — do pokazania w oknie. */
function opisMiejsca(n){
  if(n.b) return "werset — " + (typeof refText==="function" ? refText({b:n.b,ch:n.ch,v:n.v}) : "");
  if(!n.ks) return "brak — notatka ogólna";
  const art = (n.pub||"").trim();
  return pubKeyLabel(pubKeyOf(n)) + (art ? " · "+art : "") + (n.par ? " · akapit "+n.par : "");
}

/**
 * Ustawia miejsce notatki w publikacji. Trzy kroki, każdy z możliwością wyjścia.
 * @param {string} guid
 */
async function ustawMiejsceWPublikacji(guid){
  const n = notes.find(x=>x.g===guid && !x.del);
  if(!n) return;

  const publikacje = dostepnePublikacje();
  if(!publikacje.length){
    showInfo("Nie ma jeszcze publikacji",
      "Miejsce można wskazać dopiero wtedy, gdy w aplikacji jest choć jedna notatka "+
      "z publikacji — z niej bierzemy listę wydań i artykułów.<br><br>"+
      "Wczytaj kopię z JW Library, a lista się pojawi.");
    return;
  }

  /* 1. Publikacja i wydanie. */
  const wybPub = await askChoice("Miejsce notatki — publikacja",
    `<p class="ch-lead">Teraz: <b>${esc(opisMiejsca(n))}</b></p>`+
    `<p>W której publikacji ma stać ta notatka?</p>`,
    publikacje.map(([k,nazwa])=>({label:nazwa, value:k}))
      .concat([{label:"Usuń przypisanie", value:"—usun—"}, {label:"Anuluj", value:""}]));
  if(!wybPub) return;

  pushUndo({type:"note", label:"miejsce w publikacji", before:cloneNote(n)});

  if(wybPub==="—usun—"){
    n.ks=""; n.pub=""; n.itn=0; n.doc=0; n.par=0; n.pw=false;
    n.ed=true; markDirty(n); renderAll();
    toastOk("Usunięto przypisanie do publikacji");
    return;
  }

  const [ks, itn] = wybPub.split("|");

  /* 2. Artykuł. Lista bierze się z notatek, które już tam są — dzięki temu
        wskazujesz realny artykuł, a nie wymyślony numer dokumentu. */
  const artykuly = artykulyPublikacji(wybPub);
  let doc = 0, tytul = "";
  if(artykuly.length){
    const wybArt = await askChoice("Miejsce notatki — artykuł",
      `<p class="ch-lead">${esc(pubKeyLabel(wybPub))}</p><p>Przy którym artykule?</p>`,
      artykuly.map(([d,t])=>({label:t, value:String(d)}))
        .concat([{label:"Na końcu publikacji", value:"0"}, {label:"Anuluj", value:""}]));
    if(!wybArt) return;
    doc = +wybArt || 0;
    const znaleziony = artykuly.find(([d])=>d===doc);
    tytul = znaleziony ? znaleziony[1] : "";
  }

  /* 3. Akapit. */
  const wpis = await askText({
    title:"Miejsce notatki — akapit",
    value: n.par ? String(n.par) : "",
    placeholder:"np. 12  (puste = początek artykułu)",
    okLabel:"Zapisz miejsce",
    hint:"Numer akapitu ustawia kolejność wewnątrz artykułu."});
  if(wpis===null) return;
  const par = Math.max(0, parseInt(wpis, 10) || 0);

  n.ks = ks==="—" ? "" : ks;
  n.itn = +itn || 0;
  n.doc = doc;
  n.par = par;
  if(tytul) n.pub = tytul;
  n.b = 0; n.ch = null; n.v = null;      // publikacja albo werset, nie oba naraz
  n.pw = true;                            // od teraz import tego nie rusza
  n.ed = true;
  markDirty(n); renderAll();
  toastOk("Miejsce zapisane: " + opisMiejsca(n));
}
