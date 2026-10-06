/* ==========================================================================
   JW Study — porzadki.js
   UPORZĄDKOWANIE ODSTĘPÓW W NOTATKACH

   Treść notatki jest wyświetlana z zachowaniem spacji (white-space:pre-wrap),
   żeby ręcznie wpisane wcięcia i puste wiersze wyglądały tak, jak je napisałeś.
   Ma to jednak drugą stronę: treść przeniesiona z innego programu niesie ze sobą
   wcięcia i podziały wierszy z SAMEGO PLIKU źródłowego — i one także są widoczne,
   choć nikt ich nie pisał. Stąd wrażenie tekstu porozrzucanego po całej karcie.

   Ten moduł czyści to w notatkach JUŻ WCZYTANYCH, bez powtarzania importu.
   ========================================================================== */
"use strict";

/**
 * Porządkuje odstępy w treści jednej notatki.
 * @param {string} html
 * @returns {string} treść bez odstępów z pliku źródłowego
 */
function oczyscOdstepy(html){
  if(typeof html!=="string" || !html.trim()) return html;
  /* Bezwładnie — patrz parsujBezwladnie w 01-core. Porządki bywają robione
     na notatkach świeżo przeniesionych z OneNote, czyli na treści z zewnątrz. */
  const korzen = parsujBezwladnie(html);

  /* 1. Odstępy między znacznikami — wcięcia i podziały wierszy z pliku źródłowego.
        To one odpowiadają za większość pustych miejsc. */
  (function odstepy(el){
    [...el.childNodes].forEach(w=>{
      if(w.nodeType===3){
        if(!w.textContent.replace(/[\s ]/g,"")) w.remove();
        else w.textContent = w.textContent.replace(/[\s ]+/g," ");
      }else if(w.nodeType===1) odstepy(w);
    });
  })(korzen);

  /* 2. Puste akapity. */
  const pusty = el => !(el.querySelector && el.querySelector("img,hr,table")) &&
                      !(el.textContent||"").replace(/[\s ]/g,"");
  korzen.querySelectorAll("div,p").forEach(el=>{ if(pusty(el)) el.remove(); });

  /* 3. Kontener, który zawiera wyłącznie inny blok, nic nie wnosi. */
  let zmiana = true, obieg = 0;
  while(zmiana && obieg++ < 12){
    zmiana = false;
    korzen.querySelectorAll("div").forEach(el=>{
      const dzieci = [...el.childNodes].filter(w=>w.nodeType!==3 || w.textContent.trim());
      if(dzieci.length===1 && dzieci[0].nodeType===1 &&
         /^(DIV|UL|OL|TABLE|BLOCKQUOTE|H2|H3)$/.test(dzieci[0].tagName)){
        el.replaceWith(dzieci[0]); zmiana = true;
      }
    });
  }

  /* 4. Więcej niż jedna przerwa z rzędu to ślad po układzie, nie po treści. */
  korzen.querySelectorAll("br").forEach(br=>{
    let n = br.nextSibling;
    while(n && ((n.nodeType===3 && !n.textContent.trim()) || (n.nodeType===1 && n.tagName==="BR"))){
      const dalej = n.nextSibling; n.remove(); n = dalej;
    }
  });
  /* 4b. Przerwa POMIĘDZY blokami jest zbędna: każdy blok i tak zaczyna nowy wiersz.
         Zostawiona daje pustą linię — dokładnie to, co widać jako rozstrzelony tekst. */
  const blok = w => w && w.nodeType===1 && /^(DIV|P|UL|OL|TABLE|BLOCKQUOTE|H2|H3|HR)$/.test(w.tagName);
  korzen.querySelectorAll("br").forEach(br=>{
    if(blok(br.previousElementSibling) || blok(br.nextElementSibling)) br.remove();
  });
  while(korzen.firstChild && korzen.firstChild.nodeType===1 && korzen.firstChild.tagName==="BR") korzen.firstChild.remove();
  while(korzen.lastChild && korzen.lastChild.nodeType===1 && korzen.lastChild.tagName==="BR") korzen.lastChild.remove();

  /* 5. Sztywne szerokości tabel — nie mieszczą się w kolumnie notatek. */
  korzen.querySelectorAll("table,td,th").forEach(el=>{
    el.removeAttribute("width"); el.removeAttribute("height"); el.removeAttribute("style");
  });

  return korzen.innerHTML.trim();
}

/** Ile notatek zyskałoby na uporządkowaniu — bez ruszania czegokolwiek. */
function policzDoUporzadkowania(){
  let ile = 0, zaoszczedzone = 0;
  notes.forEach(n=>{
    if(n.del || !n.h) return;
    const po = oczyscOdstepy(n.h);
    if(po !== n.h){ ile++; zaoszczedzone += (n.h.length - po.length); }
  });
  return {ile, zaoszczedzone};
}

/**
 * Porządkuje odstępy we wszystkich notatkach.
 * Pyta przed wykonaniem, bo zmiana dotyczy treści i jest nieodwracalna
 * bez kopii zapasowej.
 */
async function uporzadkujOdstepyNotatek(){
  const {ile, zaoszczedzone} = policzDoUporzadkowania();
  if(!ile){
    showInfo("Nie ma czego porządkować",
      "Żadna notatka nie zawiera zbędnych odstępów. Jeśli mimo to widzisz duże przerwy, "+
      "mogą pochodzić z tekstu wpisanego ręcznie — te zostają nietknięte.");
    return;
  }
  const kb = Math.max(1, Math.round(zaoszczedzone/1024));
  const ok = await askConfirm("Uporządkować odstępy?",
    `Zbędne odstępy znaleziono w <b>${ile}</b> notatkach.<br><br>`+
    `Zostaną usunięte: wcięcia i podziały wierszy pochodzące z pliku źródłowego, `+
    `puste akapity oraz zbitki przerw. <b>Tekst, listy, tabele, wyróżnienia i zdjęcia `+
    `zostają nietknięte.</b><br><br>`+
    `Ubędzie około ${kb} kB. Zmiany nie da się cofnąć — jeśli nie masz świeżej kopii `+
    `zapasowej, zrób ją najpierw.`,
    {okLabel:"Uporządkuj "+ile+" notatek"});
  if(!ok) return;

  let zmienione = 0;
  const doZapisu = [];
  notes.forEach(n=>{
    if(n.del || !n.h) return;
    const po = oczyscOdstepy(n.h);
    if(po === n.h) return;
    n.h = po;
    n.c = (typeof htmlToPlain==="function") ? htmlToPlain(po) : n.c;
    n.mo = new Date().toISOString();
    doZapisu.push(n); zmienione++;
  });
  try{
    if(idb && doZapisu.length) await idbBulkChunked("notes", doZapisu);
  }catch(e){ reportSaveError(e, "uporządkowane notatki"); }
  renderAll();
  showInfo("Uporządkowano", `Poprawiono <b>${zmienione}</b> notatek.<br><br>`+
    `Jeśli któraś nadal wygląda na rozstrzeloną, jej przerwy pochodzą z tekstu `+
    `wpisanego ręcznie — takich nie ruszamy.`);
}
