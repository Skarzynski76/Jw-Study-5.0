/* ==========================================================================
   JW Study — editor.js
   Edytor notatki: pasek narzędzi, wstawianie, tabele, szablony, historia wersji
   ========================================================================== */
"use strict";
/* ================= EDYCJA ================= */
/* ==========================================================================
   CZCIONKI NOTATKI

   Wyłącznie kroje wbudowane w iOS/iPadOS i macOS — nic się nie pobiera,
   więc lista działa też bez internetu i nie spowalnia otwarcia aplikacji.
   Zapis w każdej pozycji ma zapasowe kroje, żeby na innym systemie
   (np. Windows) notatka wyglądała sensownie zamiast rozjechać się do Times.
   ========================================================================== */
const FONT_GRUPY = [
  ["Do czytania (szeryfowe)", [
    ["Georgia, serif", "Georgia"],
    ["'Iowan Old Style','Palatino Linotype',Georgia, serif", "Iowan Old Style"],
    ["Charter,'Bitstream Charter',Georgia, serif", "Charter"],
    ["'Hoefler Text','Baskerville Old Face',Georgia, serif", "Hoefler Text"],
    ["Baskerville,'Baskerville Old Face',Georgia, serif", "Baskerville"],
    ["Palatino,'Palatino Linotype','Book Antiqua', serif", "Palatino"],
    ["Cochin,'Times New Roman', serif", "Cochin"],
    ["Garamond,'EB Garamond','Times New Roman', serif", "Garamond"],
    ["'Times New Roman', Times, serif", "Times New Roman"],
    ["ui-serif,'New York',Georgia, serif", "New York (systemowa)"]
  ]],
  ["Bezszeryfowe", [
    ["system-ui,-apple-system,'Segoe UI', sans-serif", "Systemowa"],
    ["'Avenir Next',Avenir,'Segoe UI', sans-serif", "Avenir Next"],
    ["Optima,'Segoe UI',Candara, sans-serif", "Optima"],
    ["'Gill Sans','Gill Sans MT',Calibri, sans-serif", "Gill Sans"],
    ["Futura,'Century Gothic','Trebuchet MS', sans-serif", "Futura"],
    ["'Helvetica Neue', Helvetica, Arial, sans-serif", "Helvetica"],
    ["Arial, Helvetica, sans-serif", "Arial"],
    ["Verdana, Geneva, sans-serif", "Verdana"],
    ["Tahoma, Geneva, sans-serif", "Tahoma"],
    ["'Trebuchet MS', sans-serif", "Trebuchet MS"]
  ]],
  ["Maszynowe i odręczne", [
    ["'American Typewriter','Courier New', serif", "American Typewriter"],
    ["Menlo,Consolas,'Courier New', monospace", "Menlo"],
    ["'Courier New', Courier, monospace", "Courier New"],
    ["'Bradley Hand','Segoe Script', cursive", "Bradley Hand"],
    ["'Chalkboard SE','Comic Sans MS', cursive", "Chalkboard"],
    ["'Marker Felt','Comic Sans MS', cursive", "Marker Felt"]
  ]]
];
/** Płaska lista wszystkich krojów — do wyszukania nazwy po zapisie CSS. */
const EDIT_FONTS = [["","Domyślna"]].concat(...FONT_GRUPY.map(g=>g[1]));

/* ==========================================================================
   DOSTĘPNOŚĆ KROJU NA TYM URZĄDZENIU

   Lista krojów jest z natury zależna od systemu: Iowan Old Style czy Optima
   są na Macu i iPadzie, ale nie na Windowsie ani Androidzie. Bez sprawdzenia
   użytkownik wybierał „Optimę", dostawał po cichu coś innego i nie wiedział,
   dlaczego notatka wygląda inaczej niż na drugim urządzeniu.

   Sprawdzamy szerokością tekstu: jeśli napis w danym kroju ma inną szerokość
   niż w kroju zapasowym, krój istnieje. Wynik zapamiętujemy — pomiar jest tani,
   ale robiony dla 26 krojów przy każdym otwarciu paska byłby marnotrawstwem.
   ========================================================================== */
const _dostepneKroje = new Map();
let _pomiarKrojow;          // undefined = jeszcze nie próbowaliśmy, null = się nie da

/** Przygotowuje narzędzie pomiaru RAZ. Gdy środowisko go nie ma, więcej nie próbujemy. */
function przygotujPomiarKrojow(){
  if(_pomiarKrojow !== undefined) return _pomiarKrojow;
  try{
    const p = document.createElement("canvas").getContext("2d");
    _pomiarKrojow = (p && typeof p.measureText==="function") ? p : null;
  }catch(e){ _pomiarKrojow = null; }
  return _pomiarKrojow;
}
function czcionkaDostepna(zapisCss){
  if(!zapisCss) return true;                       // „Domyślna" jest zawsze
  if(_dostepneKroje.has(zapisCss)) return _dostepneKroje.get(zapisCss);
  const p = przygotujPomiarKrojow();
  if(!p){ _dostepneKroje.set(zapisCss, true); return true; }   // nie umiemy zmierzyć — nie strasz użytkownika
  const nazwa = zapisCss.split(",")[0].replace(/['"]/g,"").trim();
  let wynik = true;
  try{
    const probka = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    wynik = ["monospace","serif","sans-serif"].some(zapas=>{
      p.font = '72px ' + zapas;
      const bez = p.measureText(probka).width;
      p.font = '72px "' + nazwa + '", ' + zapas;
      return Math.abs(p.measureText(probka).width - bez) > 0.5;
    });
  }catch(e){ wynik = true; }
  _dostepneKroje.set(zapisCss, wynik);
  return wynik;
}
/* Ikony kreskowe menu edytora — emoji wyglądały obco na tle reszty ikon,
   miały różną szerokość i rozjeżdżały wyrównanie pozycji. */
const IE_CYTAT  = svgIc('<path d="M9.5 6.5C7 7.6 5.5 9.8 5.5 12.4h2.9v5H4v-5c0-3.9 1.9-6.9 5.5-8.2z"/><path d="M19 6.5c-2.5 1.1-4 3.3-4 5.9h2.9v5H13.5v-5c0-3.9 1.9-6.9 5.5-8.2z"/>');
const IE_ZADANIA= svgIc('<path d="M4 6.8l1.8 1.8L9 5.2"/><path d="M4 17.2L5.8 19 9 15.6"/><path d="M12.5 7h7.5"/><path d="M12.5 17.4h7.5"/>');
const IE_TABELA = svgIc('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.6h17M3.5 14.6h17M9.5 4.5v15"/>');
const IE_LINIA  = svgIc('<path d="M3.5 12h17"/><path d="M6.5 7h11M6.5 17h11" opacity=".35"/>');
const IE_SZABLON= svgIc('<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/>');
const IE_WIELKOSC=svgIc('<path d="M3 18l4.2-11L11.4 18"/><path d="M4.4 14.4h5.6"/><path d="M14 18l3.1-8 3.1 8"/><path d="M15 15.6h4.2"/>');
const IE_DATA   = svgIc('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.8h17M8.5 3.2v3.4M15.5 3.2v3.4"/><path d="M8 14h2.4"/>');
const IE_LICZ   = svgIc('<path d="M4 6.5h16M4 11h16M4 15.5h10"/><path d="M15.6 19.4h4.8"/>');
const IE_MIOTLA = svgIc('<path d="M13.6 3.6l6.8 6.8"/><path d="M15.4 8.4L8.2 15.6a3 3 0 0 0-.8 1.5L6.6 21l3.9-.8a3 3 0 0 0 1.5-.8l7.2-7.2z"/><path d="M9.2 12.6l2.2 2.2"/>');
const IE_GORNY  = svgIc('<path d="M3.5 7l7 10M10.5 7l-7 10"/><path d="M15.4 8.6c0-1.2 1-2.1 2.2-2.1s2.2.9 2.2 2.1c0 1.9-4.4 2.4-4.4 4.6h4.4"/>');
const IE_DOLNY  = svgIc('<path d="M3.5 6l7 10M10.5 6l-7 10"/><path d="M15.4 15.4c0-1.2 1-2.1 2.2-2.1s2.2.9 2.2 2.1c0 1.9-4.4 2.4-4.4 4.6h4.4"/>');
/* Style akapitu. Świadomie NIE jest to lista <select>: wybranie w niej tej samej
   pozycji co obecna nie wywołuje żadnego zdarzenia, więc na iPadzie wyglądało to
   tak, jakby opcja przestała działać. Zwykłe menu reaguje na każde dotknięcie. */
const BLOK_STYLE = [
  ["DIV","Treść"], ["H1","Tytuł główny"], ["H2","Tytuł"], ["H3","Nagłówek"], ["BLOCKQUOTE","Cytat"]
];
/* Interlinia — odstęp między wierszami wewnątrz akapitu. */
const INTERLINIE = [["1.35","Ciasna"], ["1.6","Zwykła"], ["1.85","Luźna"], ["2.15","Bardzo luźna"]];
/* Odstęp przed akapitem i po nim. */
const ODSTEPY = [["0","Brak"], [".35em","Mały"], [".7em","Średni"], ["1.1em","Duży"]];
const IE_STRZ    = svgIc('<path d="M7.5 10.2L12 14.6l4.5-4.4"/>');
const IE_PTASZEK = svgIc('<path d="M5 12.6l4.4 4.4L19 7.4"/>', 2.1);
const IE_INTER   = svgIc('<path d="M9.5 6h11M9.5 12h11M9.5 18h11"/><path d="M4.5 4.2v15.6"/><path d="M2.6 6.4l1.9-2.2 1.9 2.2"/><path d="M2.6 17.6l1.9 2.2 1.9-2.2"/>');
const IE_PUSTO   = '<span class="ic mic" aria-hidden="true"></span>';
const IE_ODSTEP  = svgIc('<path d="M4 4.5h16M4 19.5h16"/><path d="M8 9.5h8M8 14.5h8"/>');

/* Kolory czcionki — stonowane, czytelne na białym i w trybie nocnym. */
const TEXT_COLORS = [
  ["#1c1c1e","Czarny"], ["#b23b2e","Czerwony"], ["#1e5b46","Zielony"],
  ["#2b5f9e","Niebieski"], ["#7a4fa3","Fioletowy"], ["#a15c1b","Pomarańczowy"], ["#6d7178","Szary"]
];

let optAutoWielkieLitery = (()=>{
  try{ return localStorage.getItem("jw_autocap") !== "0"; }
  catch(e){ return true; }
})();

const POL_SKROTY_RE = /(?:^|\s|\()(?:np|tzn|itd|itp|m\.in|tzw|r|w|str|godz|art|ust|par|pkt|poz|tab|rys|kol|wg|jw|por|zob|ok|doc|prof|hab|dr|inż|mgr|ul|al|pl|os|woj|pow|gm|tel|fax|tys|mln|mld|vs|ks|św|bp|abp|kard|ojc|nr|rozdz|wers)\.$/i;

function czyKoniecZdania(tekst){
  if(!tekst) return false;
  if(/[\r\n][\s]*$/.test(tekst)) return true;
  const m = tekst.match(/([.!?…])([)"'”»\]\s]*)$/);
  if(!m) return false;
  const punc = m[1];
  const post = m[2];
  if(!/\s/.test(post) && post.length === 0) return false;
  if(punc === "!" || punc === "?" || punc === "…") return true;
  if(punc === "."){
    const przedKropka = tekst.slice(0, m.index + 1);
    if(POL_SKROTY_RE.test(przedKropka)) return false;
    if(/(?:^|\s)(?:[a-ząćęłńóśźż]\.){2,}$/i.test(przedKropka)) return false;
    return true;
  }
  return false;
}

function czyWymagaWielkiejLitery(node, pos, ce){
  if(!node || node.nodeType !== 3 || !ce) return false;
  const curTxt = node.nodeValue || "";
  const przed = curTxt.slice(0, pos - 1);

  if(/\S/.test(przed)){
    return czyKoniecZdania(przed);
  }

  let blokStart = false;
  let zebranyTekst = przed;
  let curr = node;

  function poprzedniWezel(n){
    if(n.previousSibling){
      let p = n.previousSibling;
      while(p.lastChild) p = p.lastChild;
      return p;
    }
    return n.parentNode;
  }

  while(curr && curr !== ce){
    const prev = poprzedniWezel(curr);
    if(!prev || prev === ce){
      blokStart = true;
      break;
    }
    if(prev.nodeType === 1){
      const tag = prev.tagName ? prev.tagName.toUpperCase() : "";
      if(tag === "BR" || tag === "DIV" || tag === "P" || tag === "LI" || tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4" || tag === "H5" || tag === "H6" || tag === "BLOCKQUOTE" || tag === "TR" || tag === "HR"){
        blokStart = true;
        break;
      }
    } else if(prev.nodeType === 3){
      const val = prev.nodeValue || "";
      zebranyTekst = val + zebranyTekst;
      if(/\S/.test(val)){
        break;
      }
    }
    curr = prev;
  }

  if(blokStart || !/\S/.test(zebranyTekst)){
    return true;
  }

  return czyKoniecZdania(zebranyTekst);
}


function buildEditbar(n){
  const bar = document.createElement("div");
  bar.className = "editbar";
  const wybrana = (n && n.ff) || "";
  /* Krój nieobecny w systemie zostaje na liście — notatka mogła powstać na innym
     urządzeniu i wybór trzeba uszanować — ale jest oznaczony, żeby było wiadomo,
     że tutaj zobaczysz zastępczy. */
  const opcja = ([v,nm])=>{
    const jest = czcionkaDostepna(v);
    return `<option value="${esc(v)}" style="font-family:${v||"inherit"}"${wybrana===v?" selected":""}`+
           `${jest?"":' data-brak="1"'}>${esc(nm)}${jest?"":" (zastępcza)"}</option>`;
  };
  const fontOpts = opcja(["","Domyślna"]) +
    FONT_GRUPY.map(([grupa,kroje])=>`<optgroup label="${esc(grupa)}">${kroje.map(opcja).join("")}</optgroup>`).join("");
  bar.innerHTML = `
    <button data-cmd="undo" title="Cofnij">${ICO.undo}</button>
    <button data-cmd="redo" title="Ponów">${ICO.redo}</button>
    <span class="eb-sep"></span>
    <button class="eb-block" data-pop="blok" title="Styl akapitu, interlinia i odstępy"><span class="eb-blockLbl">Treść</span>${IE_STRZ}</button>
    <select class="eb-font eb-mobile-extra" title="Czcionka tekstu notatki">${fontOpts}</select>
    <span class="eb-sep"></span>
    <button data-cmd="bold" data-st="bold" title="Pogrubienie"><b>B</b></button>
    <button data-cmd="italic" data-st="italic" title="Kursywa"><i>I</i></button>
    <button data-cmd="underline" data-st="underline" title="Podkreślenie"><u>U</u></button>
    <button class="eb-mobile-extra" data-cmd="strikeThrough" data-st="strikeThrough" title="Przekreślenie"><s>S</s></button>
    <button class="eb-painter" data-painter="1" title="Malarz formatów — kopiuj, potem nałóż">🖌</button>
    <span class="eb-sep"></span>
    <button class="eb-mobile-extra" data-cmd="insertUnorderedList" data-st="insertUnorderedList" title="Lista punktowana">${ICO.ul}</button>
    <button class="eb-mobile-extra" data-cmd="insertOrderedList" data-st="insertOrderedList" title="Lista numerowana">${ICO.ol}</button>
    <span class="eb-sep"></span>
    <button class="eb-color" data-pop="color" title="Kolor / podświetlenie">${svgIc('<circle cx="12" cy="12" r="8.6"/><circle cx="9" cy="9.6" r="1" fill="currentColor" stroke="none"/><circle cx="14.6" cy="9.6" r="1" fill="currentColor" stroke="none"/><circle cx="9.6" cy="14.8" r="1" fill="currentColor" stroke="none"/>')}</button>
    <button class="eb-ins eb-mobile-extra" data-pop="ins" title="Wstaw: odnośnik do wersetu, cytat, listę zadań, link, linię">${ICO.plus}</button>
    <label class="eb-img eb-mobile-extra" title="Wstaw zdjęcie / ilustrację">${ICO.image}<input type="file" accept="image/*" multiple style="display:none"></label>
    <button data-outline="1" title="Spis nagłówków i zwijanie sekcji">☷</button>
    <button class="eb-more" data-pop="more" title="Więcej: wcięcia, wyrównanie, indeks, wyczyść">${IC_DOTS}</button>`;
  bar.addEventListener("pointerdown", ev=>{
    if(ev.target.closest("select, label.eb-img")){ edSavedRange = captureRange(); return; }
    const pop = ev.target.closest("[data-pop]");
    if(pop){ ev.preventDefault(); edSavedRange = captureRange(); openEbPop(pop.dataset.pop, pop, bar); return; }
    const malarz=ev.target.closest("[data-painter]");
    if(malarz){ev.preventDefault();edSavedRange=captureRange();malarzFormatKlik(bar);return;}
    const outline=ev.target.closest("[data-outline]");
    if(outline){ev.preventDefault();const ce=bar.parentElement.querySelector(".ncontent");otworzSpisNotatki(ce);return;}
    ev.preventDefault();                          // nie gub zaznaczenia
    const b = ev.target.closest("[data-cmd]");
    if(b) wykonajWTresci(b.dataset.cmd, bar);
  });
  bar.querySelector(".eb-font").addEventListener("change", ev=>{
    const card = bar.parentElement; const nn = card && notes.find(x=>x.g===card.dataset.g);
    if(!nn) return;
    nn.ff = ev.target.value || "";
    if(nn.ff) card.style.setProperty("--noteFont", nn.ff); else card.style.removeProperty("--noteFont");
    markDirty(nn);
    toast("Czcionka notatki: " + (EDIT_FONTS.find(f=>f[0]===nn.ff)||["","Domyślna"])[1]);
  });
  bar.querySelector(".eb-img input").addEventListener("change", async ev=>{
    const pliki = [...ev.target.files]; ev.target.value="";
    if(!pliki.length) return;
    const ceIns = bar.parentElement.querySelector(".ncontent");
    let wstawione = 0, zakres = edSavedRange;
    for(const f of pliki){
      try{
        const url = await compressImage(f);
        if(!(await checkSpaceForImage(url.length))) break;
        const obraz = insertImageUrl(ceIns, url, zakres);
        if(obraz){
          zakres=document.createRange(); zakres.setStartAfter(obraz); zakres.collapse(true);
          wstawione++;
        }
      }catch(err){ console.warn("Nie udało się wczytać zdjęcia", f && f.name, err); }
    }
    if(!wstawione) toast("Nie udało się wczytać zdjęcia");
    else if(pliki.length > 1) toastOk("Wstawiono zdjęć: " + wstawione);
    if(wstawione) histZapisz(ceIns);
  });
  return bar;
}
/* aktywny stan przycisków (B, I, U, S, listy) wg miejsca kursora */

/* =====================================================================
   SKRÓTY PISANIA

   Znane z edytorów tekstu: zaczynasz wiersz od „- ", „1. ", „# " albo „> "
   i akapit sam zmienia się w listę, nagłówek lub cytat. Bez sięgania do menu,
   co przy pisaniu na iPadzie oszczędza sporo stukania.

   Zamiana zachodzi wyłącznie na POCZĄTKU wiersza i tylko po spacji, więc
   zwykły myślnik w środku zdania albo data „1. maja" pozostają nietknięte.
   ===================================================================== */
const SKROTY_PISANIA = [
  { wzor:/^[-*•]$/,    cmd:"insertUnorderedList" },
  { wzor:/^\d{1,2}[.)]$/, cmd:"insertOrderedList" },
  { wzor:/^#$/,        blok:"h1" },
  { wzor:/^##$/,       blok:"h2" },
  { wzor:/^###$/,      blok:"h3" },
  { wzor:/^>$/,        blok:"blockquote" },
  /* Lista zadań. Do wydania 2.60 rozpoznawał ją tylko autoformat na zdarzeniu
     „input", które przy pisaniu z klawiatury nigdy nie dochodziło — spację
     przechwytuje skrotPisania i zatrzymuje. Czyli `[] ` działało wyłącznie przy
     dyktowaniu i pisaniu rysikiem. */
  { wzor:/^\[ ?\]$/,   cmd:"insertTaskList" }
];
/**
 * Reaguje na spację wpisaną na początku wiersza.
 * @param {KeyboardEvent} e
 * @param {HTMLElement} ce  pole edycji notatki
 * @returns {boolean} czy skrót został użyty
 */
function skrotPisania(e, ce){
  if(e.key !== " " || e.metaKey || e.ctrlKey || e.altKey) return false;
  const sel = getSelection();
  if(!sel || !sel.rangeCount || !sel.isCollapsed) return false;
  const r = sel.getRangeAt(0);
  if(!ce.contains(r.startContainer)) return false;
  const wezel = r.startContainer;
  if(wezel.nodeType !== 3) return false;
  const przed = wezel.textContent.slice(0, r.startOffset);
  // interesuje nas tylko sam początek wiersza
  if(przed !== wezel.textContent.slice(0, r.startOffset).trimStart()) return false;
  const pasuje = SKROTY_PISANIA.find(x=>x.wzor.test(przed));
  if(!pasuje) return false;
  if(!poczatekWiersza(wezel, r.startOffset - przed.length, ce)) return false;
  e.preventDefault();
  // zdejmij wpisany znacznik, zanim zamienimy akapit
  const zakres = document.createRange();
  zakres.setStart(wezel, r.startOffset - przed.length);
  zakres.setEnd(wezel, r.startOffset);
  zakres.deleteContents();
  /* ZAMIANA BLOKU BEZ execCommand — patrz obszerne wyjaśnienie przy zamienBlok
     niżej w tym pliku. W skrócie: po skasowaniu wpisanego znacznika akapit jest
     PUSTY, a execCommand w pustym bloku brał blok POPRZEDNI. Nagłówkiem stawał
     się akapit wyżej, a wpisywany tekst dopisywał się na jego końcu. Dotyczyło
     to wszystkich pięciu skrótów. */
  const blok = blockOf(zakres.startContainer, ce);
  let nowy = null;
  if(pasuje.blok) nowy = zamienBlok(blok, pasuje.blok, ce);
  else if(pasuje.cmd === "insertUnorderedList") nowy = zamienNaListe(blok, "ul", "", ce);
  else if(pasuje.cmd === "insertOrderedList")   nowy = zamienNaListe(blok, "ol", "", ce);
  else if(pasuje.cmd === "insertTaskList")      nowy = zamienNaListe(blok, "ul", "tasklist", ce);
  if(nowy){
    if(typeof uzupelnijZwijanieNaglowkow === "function") uzupelnijZwijanieNaglowkow(ce);
    kursorNaPoczatkuBloku(nowy, ce);
  }
  else if(pasuje.cmd) document.execCommand(pasuje.cmd, false, null);   // droga awaryjna
  if(typeof commitLiveEdit === "function") commitLiveEdit(ce);
  histZapisz(ce);
  const pasek = ce.parentElement && ce.parentElement.querySelector(".editbar");
  if(pasek && typeof updateEditbarState === "function") updateEditbarState(pasek);
  return true;
}
/** Czy podana pozycja to faktycznie początek wiersza (nic przed nią oprócz białych znaków). */
function poczatekWiersza(wezel, offset, ce){
  if(offset > 0) return false;
  let el = wezel;
  while(el && el !== ce){
    if(el.previousSibling){
      const tekst = el.previousSibling.textContent || "";
      if(tekst.trim() !== "") return false;
      if(el.previousSibling.nodeName === "BR") return true;
    }
    el = el.parentNode;
    if(el && /^(DIV|P|LI|H1|H2|H3|BLOCKQUOTE)$/.test(el.nodeName)) return true;
  }
  return true;
}

/* Zwykły Enter oznacza następny wiersz, a nie nowy akapit z odstępem.
   Listy i tabele zachowują natywne zachowanie, bo Enter tworzy tam nowy punkt
   albo przechodzi wewnątrz komórki. */
function moznaWstawicPojedynczyWiersz(ce){
  const sel=getSelection(); if(!sel||!sel.rangeCount)return false;
  const r=sel.getRangeAt(0); if(!ce.contains(r.startContainer))return false;
  const el=r.startContainer.nodeType===1?r.startContainer:r.startContainer.parentElement;
  return !(el&&el.closest("li,table"));
}
/* Wyprowadza punkt podziału poza znaczniki stylu. Bez tego Safari zostawiało
   kursor wewnątrz <b>, <i>, <u>, <mark> lub kolorowego <span> i pierwszy tekst
   w następnym wierszu dziedziczył wygląd poprzedniego. Prawa część istniejącej
   treści zachowuje swój format, lecz nowy wiersz powstaje między znacznikami. */
function wyprowadzEnterPozaStyl(marker,ce){
  const blok=/^(DIV|P|LI|H1|H2|H3|H4|H5|H6|BLOCKQUOTE|TD|TH|FIGCAPTION)$/;
  while(marker.parentNode&&marker.parentNode!==ce&&!blok.test(marker.parentNode.nodeName)){
    const styl=marker.parentNode,rodzic=styl.parentNode,kopia=styl.cloneNode(false);
    while(marker.nextSibling)kopia.appendChild(marker.nextSibling);
    const maPrawa=kopia.hasChildNodes();
    if(maPrawa)rodzic.insertBefore(kopia,styl.nextSibling);
    rodzic.insertBefore(marker,maPrawa?kopia:styl.nextSibling);
    if(!styl.hasChildNodes())styl.remove();
  }
  return marker;
}
function wstawPojedynczyWiersz(ce){
  const sel=getSelection(); if(!sel||!sel.rangeCount)return false;
  const r=sel.getRangeAt(0); if(!ce.contains(r.startContainer))return false;
  if(typeof histZapisz==="function")histZapisz(ce);
  r.deleteContents();
  const marker=document.createComment("enter-bez-stylu");r.insertNode(marker);
  wyprowadzEnterPozaStyl(marker,ce);

  /* Obsługa wyjścia z cytatu (BLOCKQUOTE), wyróżnień (callout) oraz nagłówków (H2, H3):
     nowy wiersz po Enter nie dziedziczy formatu bloku, lecz powstaje jako zwykły tekst. */
  if(marker.parentNode && marker.parentNode !== ce){
    const specBlok = marker.parentNode.closest("blockquote, .callout, h1, h2, h3, h4, h5, h6");
    if(specBlok && ce.contains(specBlok)){
      const rodzicBloku = specBlok.parentNode;
      let nast = marker.nextSibling;
      let maPrawa = false;
      while(nast){
        if((nast.nodeType === 3 && nast.nodeValue.trim()) || (nast.nodeType === 1 && nast.nodeName !== "BR")){
          maPrawa = true; break;
        }
        nast = nast.nextSibling;
      }
      if(!maPrawa){
        /* Kursor na końcu cytatu/nagłówka/bloku — wyprowadź za ten blok */
        rodzicBloku.insertBefore(marker, specBlok.nextSibling);
        if(!specBlok.textContent.trim() && !specBlok.querySelector("img")) specBlok.remove();
      } else {
        /* Podział bloku w środku — prawa część w kopii, nowy wiersz pomiędzy */
        const kopia = specBlok.cloneNode(false);
        while(marker.nextSibling) kopia.appendChild(marker.nextSibling);
        rodzicBloku.insertBefore(kopia, specBlok.nextSibling);
        rodzicBloku.insertBefore(marker, kopia);
      }
    }
  }

  const br=document.createElement("br");marker.replaceWith(br);
  /* Safari potrzebuje końcowego BR jako miejsca na kursor, gdy Enter naciśnięto
     na samym końcu. Kursor stoi przed tym znacznikiem, więc nie powstaje pusty akapit. */
  if(!br.nextSibling)br.parentNode.insertBefore(document.createElement("br"),br.nextSibling);
  const po=document.createRange(); po.setStartAfter(br); po.collapse(true);
  sel.removeAllRanges(); sel.addRange(po);

  /* Reset stanów formatowania w przeglądarce, aby nowy wiersz pisał się zwykłym tekstem */
  try{
    if(document.queryCommandState("bold")) document.execCommand("bold", false, null);
    if(document.queryCommandState("italic")) document.execCommand("italic", false, null);
    if(document.queryCommandState("underline")) document.execCommand("underline", false, null);
    if(document.queryCommandState("strikeThrough")) document.execCommand("strikeThrough", false, null);
  }catch(_){}

  if(typeof histZapisz==="function")histZapisz(ce);
  if(typeof commitLiveEdit==="function")commitLiveEdit(ce);
  if(typeof szkicZaplanuj==="function")szkicZaplanuj(ce);
  return true;
}
function obsluzEnterBezOdstepu(e,ce){
  const enterKlawiatury=e.type==="keydown"&&e.key==="Enter"&&!e.shiftKey&&!e.metaKey&&!e.ctrlKey&&!e.altKey;
  const enterSystemu=e.type==="beforeinput"&&e.inputType==="insertParagraph";
  if((!enterKlawiatury&&!enterSystemu)||e.isComposing||!moznaWstawicPojedynczyWiersz(ce))return false;
  e.preventDefault(); return wstawPojedynczyWiersz(ce);
}
/* Wklejony tekst pozostaje prosty, ale zachowuje wiersze jako BR zamiast
   tworzonych przez Safari bloków DIV o różnej wysokości. */
function wstawCzystyTekst(ce,tekst){
  const sel=getSelection(); if(!sel||!sel.rangeCount)return false;
  const r=sel.getRangeAt(0); if(!ce.contains(r.startContainer))return false;
  r.deleteContents(); const frag=document.createDocumentFragment();
  String(tekst).replace(/\r\n?/g,"\n").split("\n").forEach((wiersz,i)=>{
    if(i)frag.appendChild(document.createElement("br"));
    if(wiersz)frag.appendChild(document.createTextNode(wiersz));
  });
  const zn=document.createComment("koniec-wklejenia");frag.appendChild(zn);r.insertNode(frag);
  const po=document.createRange();po.setStartBefore(zn);po.collapse(true);zn.remove();
  sel.removeAllRanges();sel.addRange(po);return true;
}

/* =====================================================================
   WŁASNA HISTORIA COFANIA W EDYTORZE

   Nie używamy już execCommand("undo") / ("redo"). Gdy pole edycji nie ma
   czego cofać — a tak jest zaraz po otwarciu notatki — przeglądarka przejmuje
   polecenie i cofa ostatnią akcję na poziomie strony. Na Macu kończyło się to
   powrotem do poprzednio otwartej karty.

   Własny stos jest zamknięty w obrębie jednej notatki, przewidywalny
   i nie ma żadnego przejścia do przeglądarki.
   ===================================================================== */
const HIST_MAX = 60;        // ile kroków pamiętamy
const HIST_ZWLOKA = 350;    // ms bezczynności, po których zapisujemy migawkę
const histMapa = new WeakMap();   // pole edycji → {stos, poz, timer}

/** Włącza historię dla pola edycji notatki. Wywoływane przy wejściu w tryb edycji. */
function histStart(ce){
  if(!ce) return;
  const juz = histMapa.has(ce);
  histMapa.set(ce, {stos:[histMigawka(ce)], poz:0, timer:0});
  if(juz) return;                       // zdarzenia już podpięte, nie dublujemy
  ce.addEventListener("input", ()=>{
    const h = histMapa.get(ce); if(!h) return;
    clearTimeout(h.timer);
    h.timer = setTimeout(()=>histZapisz(ce), HIST_ZWLOKA);
  });
  /* Cmd/Ctrl+Z w treści też idzie do naszego stosu — inaczej przeglądarka
     robiłaby swoje cofanie równolegle do naszego. */
  ce.addEventListener("keydown", e=>{
    /* Najpierw skróty z klawiszem polecenia (⌘/Ctrl), potem skróty pisania
       (spacja po „## ", „- " i tak dalej) — te drugie działają BEZ modyfikatora,
       więc kolejność jest tu bez znaczenia, ale czyta się ją w tej. */
    if(skrotFormatowania(e, ce)) return;
    if(obsluzEnterBezOdstepu(e,ce)) return;
    skrotPisania(e, ce);
  });
  ce.addEventListener("beforeinput",e=>{ obsluzEnterBezOdstepu(e,ce); });
  const karta = ce.closest(".ncard") || ce;
  karta.addEventListener("keydown", e=>{
    if((e.metaKey||e.ctrlKey) && e.key && e.key.toLowerCase()==="z"){
      e.preventDefault();
      if(e.shiftKey) histSkocz(ce, +1); else histSkocz(ce, -1);
    }
  });
}
/** Stan pola edycji: treść + pozycja kursora liczona w znakach tekstu. */
function histMigawka(ce){ return { html: ce.innerHTML, kursor: kursorOffset(ce) }; }

/** Dopisuje migawkę, jeśli treść faktycznie się zmieniła. */
function histZapisz(ce){
  const h = histMapa.get(ce); if(!h) return;
  const m = histMigawka(ce);
  if(h.stos[h.poz] && h.stos[h.poz].html === m.html) return;
  h.stos.length = h.poz + 1;            // nowa zmiana kasuje gałąź „ponów"
  h.stos.push(m);
  h.poz = h.stos.length - 1;
  if(h.stos.length > HIST_MAX){ h.stos.shift(); h.poz--; }
  histOdswiezStrzalki(ce);
}
/**
 * Przesuwa się po historii.
 * @param {HTMLElement} ce  pole edycji
 * @param {number} kier  -1 cofnij, +1 ponów
 * @returns {boolean} czy udało się wykonać krok
 */
function histSkocz(ce, kier){
  const h = histMapa.get(ce); if(!h) return false;
  clearTimeout(h.timer);
  if(kier < 0) histZapisz(ce);          // najpierw utrwal to, co użytkownik właśnie napisał
  const cel = h.poz + kier;
  if(cel < 0 || cel >= h.stos.length){
    toast(kier < 0 ? "Nie ma czego cofnąć" : "Nie ma czego ponowić");
    return false;
  }
  h.poz = cel;
  const m = h.stos[cel];
  ce.innerHTML = m.html;
  ustawKursorOffset(ce, m.kursor);
  commitLiveEdit(ce);
  histOdswiezStrzalki(ce);
  return true;
}
/** Wygasza strzałkę, gdy nie ma czego cofać ani ponawiać. */
function histOdswiezStrzalki(ce){
  const bar = ce.parentElement && ce.parentElement.querySelector(".editbar");
  if(!bar) return;
  const h = histMapa.get(ce);
  const wstecz = bar.querySelector('[data-cmd="undo"]');
  const naprzod = bar.querySelector('[data-cmd="redo"]');
  if(wstecz)  wstecz.disabled  = !h || h.poz <= 0;
  if(naprzod) naprzod.disabled = !h || h.poz >= h.stos.length - 1;
}
/** Pozycja kursora liczona w znakach od początku pola (odporna na zmianę znaczników). */
function kursorOffset(ce){
  const sel = getSelection();
  if(!sel || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0);
  if(!ce.contains(r.startContainer)) return null;
  try{
    const przed = r.cloneRange();
    przed.selectNodeContents(ce);
    przed.setEnd(r.startContainer, r.startOffset);
    return przed.toString().length;
  }catch(e){ return null; }
}
/** Odtwarza kursor po podmianie treści. */
function ustawKursorOffset(ce, poz){
  try{ ce.focus(); }catch(e){}
  if(poz == null) return;
  let wezel = null, przesun = 0, licznik = 0;
  const chodzik = document.createTreeWalker(ce, NodeFilter.SHOW_TEXT, null);
  let n;
  while((n = chodzik.nextNode())){
    const dl = n.textContent.length;
    if(licznik + dl >= poz){ wezel = n; przesun = poz - licznik; break; }
    licznik += dl;
  }
  try{
    const r = document.createRange();
    if(wezel) r.setStart(wezel, Math.min(przesun, wezel.textContent.length));
    else { r.selectNodeContents(ce); r.collapse(false); }
    r.collapse(true);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  }catch(e){}
}

/* ══════════════════════════════════════════════════════════════════════════
   SKRÓTY KLAWISZOWE W TREŚCI NOTATKI

   Pogrubienie, kursywa i podkreślenie działały wcześniej „same" — bo obsługuje
   je przeglądarka w każdym polu edytowalnym. Działały jednak OBOK aplikacji:
   szły wprost do dokumentu, więc omijały nasz stos cofania, nie zapisywały
   notatki i nie odświeżały stanu przycisków na pasku. Tekst robił się pogrubiony,
   ale „Cofnij" o tym nie wiedziało.

   Wszystkie skróty idą teraz tą samą drogą co przyciski paska —
   przez `wykonajWTresci`, czyli z historią, zapisem i odświeżeniem paska.

   KAŻDE URZĄDZENIE

   • Mac i iPad z klawiaturą: ⌘. Windows, Linux, Android: Ctrl. Rozpoznajemy
     jedno i drugie (`metaKey || ctrlKey`), więc nie ma dwóch list skrótów.
   • Cyfry bierzemy z `e.code`, nie z `e.key`. Na polskiej klawiaturze Shift+7
     daje „&", na niemieckiej „/" — a `Digit7` jest wszędzie tą samą klawiszą.
   • Litery z `e.key`, bo tu chodzi o literę, którą użytkownik widzi na klawiszu.
   • Bez klawiatury (telefon, tablet dotykowy) nic się nie zmienia: te same
     polecenia siedzą na pasku edycji i w menu „Wstaw".
   ══════════════════════════════════════════════════════════════════════════ */

/** Pasek edycji tej samej notatki co podane pole treści. */
function paskEdycjiDla(ce){
  return (ce && ce.parentElement) ? ce.parentElement.querySelector(".editbar") : null;
}

/* Opis do listy skrótów w Ustawieniach trzymamy RAZEM z obsługą — inaczej
   dopisanie skrótu i zapomnienie o liście jest kwestią czasu. */
const SKROTY_EDYCJI = [
  {kl:"b",                     cmd:"bold",               nazwa:"pogrubienie"},
  {kl:"i",                     cmd:"italic",             nazwa:"kursywa"},
  {kl:"u",                     cmd:"underline",          nazwa:"podkreślenie"},
  {kl:"x", shift:true,         cmd:"strikeThrough",      nazwa:"przekreślenie"},
  {kod:"Digit8", shift:true,   cmd:"insertUnorderedList", nazwa:"lista punktowana"},
  {kod:"Digit7", shift:true,   cmd:"insertOrderedList",   nazwa:"lista numerowana"},
  {kod:"Digit9", shift:true,   akcja:"zadania",           nazwa:"lista zadań"},
  {kl:"k",                     akcja:"link",              nazwa:"wstaw link"},
  {kod:"Backslash",            cmd:"removeFormat",        nazwa:"wyczyść formatowanie"},
  /* Style akapitu dokładnie te, które aplikacja ma na pasku (BLOK_STYLE):
     Tytuł, Nagłówek, Cytat, Treść. Skrót na `h1` byłby skrótem do stylu,
     którego nigdzie indziej nie da się wybrać ani zobaczyć. */
  {kod:"Digit1", alt:true,     blok:"h2",                 nazwa:"styl: Tytuł"},
  {kod:"Digit2", alt:true,     blok:"h3",                 nazwa:"styl: Nagłówek"},
  {kod:"Digit3", alt:true,     blok:"blockquote",         nazwa:"styl: Cytat"},
  {kod:"Digit0", alt:true,     blok:"div",                nazwa:"styl: Treść"}
];

/** Blok (akapit, nagłówek, cytat), w którym stoi kursor — jako ELEMENT. */
function blokKursora(ce){
  const sel = getSelection();
  if(!sel || !sel.rangeCount) return null;
  let el = sel.getRangeAt(0).startContainer;
  if(el.nodeType === 3) el = el.parentElement;
  while(el && el !== ce && el.parentElement !== ce) el = el.parentElement;
  return (el && el !== ce) ? el : null;
}

/**
 * Obsługa skrótu formatowania. Oddaje `true`, gdy skrót został rozpoznany —
 * wtedy wołający nie robi już nic więcej.
 * @param {KeyboardEvent} e
 * @param {HTMLElement} ce  pole treści notatki
 */
function skrotFormatowania(e, ce){
  if(!ce || !ce.isContentEditable) return false;
  if(!(e.metaKey || e.ctrlKey)) return false;
  const litera = (e.key || "").toLowerCase();
  const wpis = SKROTY_EDYCJI.find(x=>
    (x.kod ? e.code === x.kod : litera === x.kl)
    && !!x.shift === !!e.shiftKey
    && !!x.alt === !!e.altKey);
  if(!wpis) return false;
  e.preventDefault();
  const bar = paskEdycjiDla(ce);

  if(wpis.cmd){ wykonajWTresci(wpis.cmd, bar); return true; }

  if(wpis.blok){
    /* Nagłówki idą przez zamienBlok, nie przez execCommand("formatBlock") —
       powód opisany przy samej funkcji: w PUSTYM bloku formatBlock bierze blok
       poprzedni i nagłówkiem staje się nie ten akapit, w którym stoi kursor. */
    const blok = (typeof blokKursora === "function") ? blokKursora(ce) : null;
    if(blok && typeof zamienBlok === "function") zamienBlok(blok, wpis.blok, ce);
    else document.execCommand("formatBlock", false, "<" + wpis.blok + ">");
    commitLiveEdit(ce);
    if(typeof histZapisz === "function") histZapisz(ce);
    if(bar) updateEditbarState(bar);
    return true;
  }

  if(wpis.akcja === "zadania"){ insertTaskList(ce); return true; }
  if(wpis.akcja === "link"){
    /* Okienko linku czyta zapamiętane zaznaczenie, nie bieżące — bo w chwili
       pisania w polu okienka zaznaczenie w notatce już nie istnieje. */
    edSavedRange = captureRange();
    insertUrlLink(ce);
    return true;
  }
  return false;
}

/**
 * Wykonuje polecenie edycji ZAWSZE wewnątrz treści notatki.
 *
 * Bez tego „Cofnij" bywało katastrofą: gdy kursor nie stał w polu edycji,
 * przeglądarka wykonywała execCommand na całym dokumencie i cofała ostatnią
 * zmianę gdziekolwiek — na Macu wyglądało to jak cofnięcie całej strony.
 * Teraz najpierw wracamy kursorem do treści, a jeśli się nie uda,
 * polecenie w ogóle nie idzie do przeglądarki.
 *
 * @param {string} cmd  nazwa polecenia execCommand
 * @param {HTMLElement} bar  pasek edycji notatki
 */
function wykonajWTresci(cmd, bar){
  const ce = bar && bar.parentElement && bar.parentElement.querySelector(".ncontent");
  if(!ce || !ce.isContentEditable) return;
  /* Cofanie i ponawianie obsługuje własny stos — do przeglądarki nie idzie nic. */
  if(cmd === "undo" || cmd === "redo"){
    histSkocz(ce, cmd === "undo" ? -1 : +1);
    updateEditbarState(bar);
    return;
  }
  if(!kursorW(ce)){ ce.focus(); restoreSel(ce); }
  if(!kursorW(ce)){                       // pole nigdy nie było aktywne — nie ryzykujemy
    ustawKursorNaKoncu(ce);
    if(!kursorW(ce)) return;
  }
  try{ document.execCommand(cmd, false, null); }
  catch(e){ console.warn("Nie udało się wykonać polecenia", cmd, e); return; }
  updateEditbarState(bar);
  commitLiveEdit(ce);
  histZapisz(ce);            // zmiana z paska też jest krokiem do cofnięcia
}
/** Czy zaznaczenie (kursor) znajduje się wewnątrz podanego pola edycji. */
function kursorW(ce){
  const sel = getSelection();
  if(!sel || !sel.rangeCount) return false;
  const w = sel.getRangeAt(0).commonAncestorContainer;
  return !!w && (ce === w || ce.contains(w));
}
/** Awaryjnie stawia kursor na końcu treści, żeby polecenie miało gdzie zadziałać. */
function ustawKursorNaKoncu(ce){
  try{
    ce.focus();
    const r = document.createRange(); r.selectNodeContents(ce); r.collapse(false);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  }catch(e){}
}

function updateEditbarState(bar){
  if(!bar) return;
  bar.querySelectorAll("[data-st]").forEach(b=>{
    let on=false; try{ on=document.queryCommandState(b.dataset.st); }catch(e){}
    b.classList.toggle("active", !!on);
  });
  /* Przycisk stylu pokazuje styl miejsca, w którym stoi kursor. */
  const etykieta = bar.querySelector(".eb-blockLbl");
  if(etykieta){
    const teraz = biezacyBlok();
    const nazwa = (BLOK_STYLE.find(x=>x[0]===teraz) || BLOK_STYLE[0])[1];
    if(etykieta.textContent !== nazwa) etykieta.textContent = nazwa;
  }
}
/** Nazwa bloku, w którym stoi kursor: DIV, H2, H3 albo BLOCKQUOTE. */
function biezacyBlok(){
  const sel = getSelection();
  if(!sel || !sel.rangeCount) return null;
  let el = sel.getRangeAt(0).startContainer;
  if(el.nodeType === 3) el = el.parentElement;
  while(el && !el.classList?.contains("ncontent")){
    const tag = el.tagName;
    if(tag === "H2" || tag === "H3" || tag === "BLOCKQUOTE") return tag;
    if(tag === "DIV" || tag === "P" || tag === "LI") return "DIV";
    el = el.parentElement;
  }
  return "DIV";
}
document.addEventListener("selectionchange", ()=>{ const eb=document.querySelector(".ncard.editing .editbar"); if(eb) updateEditbarState(eb); });
/* rozwijane menu paska: kolory albo „Więcej" (wcięcia, wyrównanie, cytat, wyczyść) */
function openEbPop(kind, btn, bar){
  const pop=$("ebPop"); const ce=bar.parentElement.querySelector(".ncontent");
  if(kind==="color"){
    pop.innerHTML =
      `<div class="dd-lbl">Podświetlenie tekstu</div>`+
      `<div class="ebpal">`+
      [1,2,3,4,5,6,7].map(i=>`<span class="pal" data-hl="${i}" style="background:var(--hl${i})" title="Podświetl"></span>`).join("")+
      `<span class="pal pal-none" data-hl="0" title="Usuń podświetlenie">✕</span></div>`+
      `<div class="dd-sep"></div>`+
      `<div class="dd-lbl">Kolor czcionki</div>`+
      `<div class="ebpal">`+
      TEXT_COLORS.map(([v,nm])=>`<span class="pal palTxt" data-fg="${v}" style="color:${v}" title="${esc(nm)}">A</span>`).join("")+
      `<span class="pal pal-none" data-fg="reset" title="Kolor domyślny">✕</span></div>`;
  } else if(kind==="blok"){
    const teraz = biezacyBlok();
    const notatka = notaDlaPola(ce);
    const lhTeraz = (notatka && notatka.lh) || "";
    const pmTeraz = (notatka && notatka.pm) || "";
    const poz = (atr, lista, wybrany)=>lista.map(([v,nm])=>
      `<div data-${atr}="${v}">${v===wybrany?IE_PTASZEK:IE_PUSTO}${esc(nm)}</div>`).join("");
    pop.innerHTML =
      `<div class="dd-lbl">Styl akapitu</div>`+ poz("blok", BLOK_STYLE, teraz)+
      `<div class="dd-sep"></div><div class="dd-lbl">${IE_INTER}Interlinia</div>`+ poz("lh", INTERLINIE, lhTeraz)+
      `<div class="dd-sep"></div><div class="dd-lbl">${IE_ODSTEP}Odstęp przed i po akapicie</div>`+ poz("pm", ODSTEPY, pmTeraz);
  } else if(kind==="ins"){
    pop.innerHTML =
      `<div data-ins="verse">${ICO.book}Odnośnik do wersetu (JW Library)</div>
       <div data-ins="url">${ICO.link}Link (adres internetowy)</div>
       <div class="dd-sep"></div>
       <div data-ins="przypis">${IE_GORNY}Przypis¹</div>
       <div class="dd-sep"></div>
       <div data-ins="quote">${IE_CYTAT}Blok cytatu wersetu</div>
       <div class="dd-lbl">Wyróżniony blok</div>
       <div data-ins="callout:important">❗ Ważne</div>
       <div data-ins="callout:conclusion">✓ Wniosek</div>
       <div data-ins="callout:question">? Pytanie</div>
       <div data-ins="callout:example">→ Przykład</div>
       <div class="dd-sep"></div>
       <div data-ins="task">${IE_ZADANIA}Lista zadań</div>
       <div data-ins="table">${IE_TABELA}Tabela</div>
       <div data-ins="fragments">▣ Moje fragmenty i szablony…</div>
       <div data-ins="fragment-save">＋ Zapisz zaznaczenie jako fragment…</div>
       <div data-ins="hr">${IE_LINIA}Linia pozioma</div>
       <div class="dd-sep"></div>
       <div data-ins="tpl">${IE_SZABLON}Szablon notatki…</div>`;
  } else {
    pop.innerHTML =
      `<div class="ebMobileMenu" data-mobile-act="font">Aa Czcionka notatki…</div>
       <div class="ebMobileMenu" data-cmd="strikeThrough">${svgIc('<path d="M4 12h16"/><path d="M8 8c0-2 2-3 4-3s4 1 4 3"/><path d="M8 16c1 3 7 3 8-1"/>')}Przekreślenie</div>
       <div class="ebMobileMenu" data-cmd="insertUnorderedList">${ICO.ul}Lista punktowana</div>
       <div class="ebMobileMenu" data-cmd="insertOrderedList">${ICO.ol}Lista numerowana</div>
       <div class="ebMobileMenu" data-mobile-act="insert">${ICO.plus}Wstaw element…</div>
       <div class="ebMobileMenu" data-mobile-act="image">${ICO.image}Wstaw zdjęcie…</div>
       <div class="ebMobileMenu dd-sep"></div>
       <div data-cmd="outdent">${ICO.outdent}Zmniejsz wcięcie</div>
       <div data-cmd="indent">${ICO.indent}Zwiększ wcięcie</div>
       <div class="dd-sep"></div>
       <div data-cmd="justifyLeft">${ICO.alignLeft}Do lewej</div>
       <div data-cmd="justifyCenter">${ICO.alignCenter}Wyśrodkuj</div>
       <div data-cmd="justifyFull">${ICO.alignJustify}Wyjustuj</div>
       <div class="dd-sep"></div>
       <div data-cmd="superscript">${IE_GORNY}Indeks górny</div>
       <div data-cmd="subscript">${IE_DOLNY}Indeks dolny</div>
       <div class="dd-sep"></div>
       <div data-narz="wielkosc">${IE_WIELKOSC}Zmień wielkość liter</div>
       <div data-narz="toggle-autocap">${optAutoWielkieLitery?IE_PTASZEK:IE_PUSTO}Wielka litera po kropce i nowej linii</div>
       <div data-narz="data">${IE_DATA}Wstaw dzisiejszą datę</div>
       <div data-narz="licz">${IE_LICZ}Policz słowa i znaki</div>
       <div data-narz="cleanup">✨ Uporządkuj polski tekst</div>
       <div data-narz="empty-lines">↕ Usuń nadmiar pustych wierszy</div>
       <div class="dd-sep"></div>
       <div data-narz="akapit-up">↑ Przenieś akapit wyżej</div>
       <div data-narz="akapit-down">↓ Przenieś akapit niżej</div>
       <div data-narz="akapit-copy">⧉ Powiel akapit lub wiersz</div>
       <div data-narz="akapit-delete">⌫ Usuń akapit lub wiersz</div>
       <div class="dd-sep"></div>
       <div data-narz="link-edit">${ICO.link}Zmień link pod kursorem…</div>
       <div data-narz="link-remove">⌫ Usuń link, pozostaw tekst</div>
       <div class="dd-sep"></div>
       <div class="dd-lbl">Tabela — ustaw kursor w komórce</div>
       <div data-narz="table-row">＋ Dodaj wiersz poniżej</div>
       <div data-narz="table-col">＋ Dodaj kolumnę z prawej</div>
       <div data-narz="table-del-row">− Usuń bieżący wiersz</div>
       <div data-narz="table-del-col">− Usuń bieżącą kolumnę</div>
       <div data-narz="table-delete">⌫ Usuń całą tabelę</div>
       <div class="dd-sep"></div>
       <div data-ins="replace">${ICO.search}Znajdź i zamień…</div>
       <div data-ins="history">${ICO.undo}Historia wersji…</div>
       <div class="dd-sep"></div>
       <div data-clear="1">${IE_MIOTLA}Wyczyść formatowanie</div>`;
  }
  pop.dataset.ce = ""; pop._ce = ce;
  if(typeof oznaczPozycjeMenu==="function") oznaczPozycjeMenu(pop);
  pop.style.display="block";
  /* Menu bywa długie (np. „Więcej"), a na iPadzie w podzielonym oknie brakuje miejsca.
     placeDropdown dobiera stronę, przycina wysokość i włącza przewijanie. */
  if(typeof placeDropdown==="function"){ placeDropdown(pop, btn); return; }
  /* Droga awaryjna, gdy placeDropdown jeszcze nie istnieje — też licząca
     z obszaru widocznego, nie z wysokości okna zasłoniętego klawiaturą. */
  const r=btn.getBoundingClientRect(); const w=pop.offsetWidth||230, h=pop.offsetHeight||120;
  const ob = (typeof widocznyObszar==="function") ? widocznyObszar()
           : {lewo:0, gora:0, prawo:innerWidth, dol:innerHeight};
  pop.style.left=Math.max(ob.lewo+8, Math.min(r.left, ob.prawo-w-8))+"px";
  pop.style.top=Math.max(ob.gora+8, Math.min(r.bottom+6, ob.dol-h-8))+"px";
}
$("ebPop").addEventListener("pointerdown", ev=>{
  ev.preventDefault();
  const pop=$("ebPop"); const ce=pop._ce;
  const mobile=ev.target.closest("[data-mobile-act]");
  if(mobile){
    const bar=ce && ce.parentElement && ce.parentElement.querySelector(".editbar");
    const act=mobile.dataset.mobileAct;
    pop.style.display="none";
    if(!bar) return;
    if(act==="insert"){
      const b=bar.querySelector(".eb-ins");
      openEbPop("ins",b||bar.querySelector(".eb-more"),bar);
    } else if(act==="image") bar.querySelector(".eb-img input")?.click();
    else if(act==="font"){
      const s=bar.querySelector(".eb-font");
      if(s){
        try{ if(s.showPicker) s.showPicker(); else { s.style.display="inline-block"; s.focus(); s.click(); } }
        catch(_){ s.style.display="inline-block"; s.focus(); }
      }
    }
    return;
  }
  const sw=ev.target.closest("[data-hl]");
  if(sw){
    const range = edSavedRange;   // zapamiętane zaznaczenie z chwili otwarcia palety
    if(range && !range.collapsed && ce && ce.contains(range.commonAncestorContainer)){
      if(sw.dataset.hl==="0") unwrapMarks(range,ce); else applyMark(range,+sw.dataset.hl);
      commitLiveEdit(ce);
    } else toast("Najpierw zaznacz tekst, potem 🎨 Kolor");
    pop.style.display="none"; return;
  }
  const bl=ev.target.closest("[data-blok]");
  if(bl){
    pop.style.display="none";
    restoreSel(ce);
    /* Zwykły klik, nie zdarzenie „zmiana" listy — dlatego wybranie tej samej
       pozycji przy kolejnym akapicie działa tak samo jak za pierwszym razem. */
    document.execCommand("formatBlock", false, "<"+String(bl.dataset.blok).toLowerCase()+">");
    if(ce){ commitLiveEdit(ce); histZapisz(ce); }
    const pasek = ce && ce.parentElement && ce.parentElement.querySelector(".editbar");
    updateEditbarState(pasek);
    return;
  }
  const lh=ev.target.closest("[data-lh]");
  const pm=ev.target.closest("[data-pm]");
  if(lh || pm){
    pop.style.display="none";
    ustawOdstepy(ce, lh ? lh.dataset.lh : null, pm ? pm.dataset.pm : null);
    return;
  }
  const fg=ev.target.closest("[data-fg]");
  if(fg){
    const range = edSavedRange;
    if(range && !range.collapsed && ce && ce.contains(range.commonAncestorContainer)){
      restoreSel(ce);
      if(fg.dataset.fg==="reset") document.execCommand("removeFormat", false, null);
      else { try{ document.execCommand("styleWithCSS", false, true); }catch(e){}
           document.execCommand("foreColor", false, fg.dataset.fg); }
      commitLiveEdit(ce);
    } else toast("Najpierw zaznacz tekst, potem wybierz kolor");
    pop.style.display="none"; return;
  }
  const ins=ev.target.closest("[data-ins]");
  if(ins){
    const k=ins.dataset.ins;
    pop.style.display="none";
    if(k==="verse"){ insertVerseRef(ce); return; }   // własne okienko + commit w środku
    if(k==="przypis"){ if(typeof przWstaw==="function") przWstaw(ce); return; }
    if(k==="url"){ insertUrlLink(ce); return; }
    if(k==="tpl"){ insertTemplate(ce); return; }
    if(k==="replace"){ openReplace(ce); return; }
    if(k==="history"){ openHistory(ce); return; }
    if(k==="fragments"){ openFragmenty(ce); return; }
    if(k==="fragment-save"){ zapiszFragmentZaznaczenia(ce); return; }
    if(k.indexOf("callout:")===0){insertCallout(ce,k.slice(8));return;}
    restoreSel(ce);
    if(k==="quote") document.execCommand("formatBlock",false,"<blockquote>");
    else if(k==="task") insertTaskList(ce);
    else if(k==="table") insertTable(ce);
    else if(k==="hr") document.execCommand("insertHorizontalRule");
    if(ce) commitLiveEdit(ce);
    return;
  }
  const nz=ev.target.closest("[data-narz]");
  if(nz){
    pop.style.display="none";
    narzedzieEdytora(nz.dataset.narz, ce);
    return;
  }
  const cmd=ev.target.closest("[data-cmd]");
  if(cmd){
    const c=cmd.dataset.cmd;
    pop.style.display="none";
    const bar=ce && ce.parentElement && ce.parentElement.querySelector(".editbar");
    if(c.indexOf("formatBlock:")===0){
      restoreSel(ce);
      document.execCommand("formatBlock",false,"<"+c.split(":")[1]+">");
      if(ce) commitLiveEdit(ce);
    } else wykonajWTresci(c, bar);
    return;
  }
  if(ev.target.closest("[data-clear]")){
    document.execCommand("removeFormat");
    const sel=getSelection(); if(sel.rangeCount && ce) unwrapMarks(sel.getRangeAt(0), ce);
    if(ce) commitLiveEdit(ce);
    pop.style.display="none"; return;
  }
});
/* Zamykanie przy dotknięciu obok — wspólne dla wszystkich okienek, w 45-zamykanie.js */
let edSavedRange = null;

/** Notatka, do której należy podane pole edycji. */
function notaDlaPola(ce){
  const karta = ce && ce.closest && ce.closest(".ncard");
  if(!karta) return null;
  return notes.find(x=>x.g===karta.dataset.g) || null;
}
/**
 * Zapisuje interlinię i odstęp akapitów wybrane dla tej notatki.
 * Ustawienie jest własnością notatki, więc przenosi się razem z kopią zapasową
 * i wygląda tak samo na karcie oraz w czytniku.
 * @param {HTMLElement} ce  pole edycji
 * @param {?string} lh  interlinia (np. "1.85") albo null gdy bez zmian
 * @param {?string} pm  odstęp akapitu (np. ".7em") albo null gdy bez zmian
 */
function ustawOdstepy(ce, lh, pm){
  const n = notaDlaPola(ce);
  const karta = ce && ce.closest && ce.closest(".ncard");
  if(!n || !karta) return;
  if(lh !== null){
    n.lh = lh;
    karta.style.setProperty("--nLh", lh);
  }
  if(pm !== null){
    n.pm = pm;
    karta.style.setProperty("--nPm", pm);
  }
  markDirty(n);
  const nazwa = lh !== null
    ? "Interlinia: " + ((INTERLINIE.find(x=>x[0]===lh)||["",""])[1] || lh)
    : "Odstęp akapitów: " + ((ODSTEPY.find(x=>x[0]===pm)||["",""])[1] || pm);
  toast(nazwa);
}

/**
 * Drobne narzędzia edytora wywoływane z menu „Więcej".
 * @param {string} co  wielkosc | data | licz
 * @param {HTMLElement} ce  pole edycji notatki
 */
function narzedzieEdytora(co, ce){
  if(!ce) return;
  if(co==="toggle-autocap"){
    optAutoWielkieLitery = !optAutoWielkieLitery;
    try{ localStorage.setItem("jw_autocap", optAutoWielkieLitery ? "1" : "0"); }catch(e){}
    toast(optAutoWielkieLitery ? "Włączono automatyczną wielką literę" : "Wyłączono automatyczną wielką literę");
    return;
  }
  if(co==="akapit-up"||co==="akapit-down"){
    przesunAkapit(ce,co==="akapit-up"?-1:1); return;
  }
  if(co==="akapit-copy"||co==="akapit-delete"){
    operacjaAkapitu(ce,co==="akapit-copy"?"copy":"delete"); return;
  }
  if(co==="link-edit"||co==="link-remove"){
    edytujIstniejacyLink(ce,co==="link-remove"); return;
  }
  if(co.indexOf("table-")===0){edytujTabele(ce,co);return;}
  if(co==="cleanup"||co==="empty-lines"){
    porzadkujPolskiTekst(ce,co==="empty-lines");return;
  }
  if(co==="licz"){
    const txt=(ce.innerText||"").trim();
    const slowa=txt ? txt.split(/\s+/).length : 0;
    const znaki=txt.length;
    const bezSpacji=txt.replace(/\s/g,"").length;
    toast(`Słowa: ${slowa} · Znaki: ${znaki} (bez spacji ${bezSpacji})`);
    return;
  }
  if(co==="data"){
    restoreSel(ce);
    const d=new Date().toLocaleDateString("pl-PL",{day:"numeric",month:"long",year:"numeric"});
    document.execCommand("insertText", false, d);
    commitLiveEdit(ce);
    return;
  }
  if(co==="wielkosc"){
    const r=edSavedRange;
    if(!r || r.collapsed || !ce.contains(r.commonAncestorContainer)){ toast("Najpierw zaznacz tekst"); return; }
    restoreSel(ce);
    const t=String(getSelection().toString());
    /* Trzy stany po kolei: WIELKIE → małe → Jak W Zdaniu. */
    let nowy;
    if(t===t.toUpperCase()) nowy=t.toLowerCase();
    else if(t===t.toLowerCase()) nowy=t.replace(/(^|\s)(\p{L})/gu,(m,a,b)=>a+b.toUpperCase());
    else nowy=t.toUpperCase();
    document.execCommand("insertText", false, nowy);
    commitLiveEdit(ce);
  }
}
function porzadkujPolskiTekst(ce,tylkoWiersze){
  if(!ce)return;if(typeof histZapisz==="function")histZapisz(ce);let zmiany=0;
  if(!tylkoWiersze){
    const walker=document.createTreeWalker(ce,NodeFilter.SHOW_TEXT),nodes=[];let n;while(n=walker.nextNode())nodes.push(n);
    nodes.forEach(node=>{
      const st=node.nodeValue;
      let nowy=st.replace(/"([^"\n]+)"/g,"„$1”").replace(/[ \t]{2,}/g," ").replace(/[ \t]+([,.;:!?])/g,"$1").replace(/([,;:!?])(?=[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż])/g,"$1 ");
      if(optAutoWielkieLitery){
        nowy=nowy.replace(/([.!?…]\s+)([\p{Ll}])/gu,(m,punc,litera,offset,fullStr)=>{
          const przed=fullStr.slice(0,offset+1);
          if(POL_SKROTY_RE.test(przed)||/(?:^|\s)(?:[a-ząćęłńóśźż]\.){2,}$/i.test(przed))return m;
          return punc+litera.toUpperCase();
        });
        nowy=nowy.replace(/(^|[\n\r])(\s*)([\p{Ll}])/gu,(m,nl,sp,litera)=>nl+sp+litera.toUpperCase());
        nowy=nowy.replace(/^(\s*)([\p{Ll}])/u,(m,sp,litera)=>{
          if(czyWymagaWielkiejLitery(node,sp.length+1,ce)) return sp+litera.toUpperCase();
          return m;
        });
      }
      if(nowy!==st){node.nodeValue=nowy;zmiany++;}
    });
  }
  /* Zachowujemy najwyżej jeden pusty wiersz, czyli dwa kolejne BR. */
  Array.from(ce.querySelectorAll("br")).forEach(br=>{let p=br.previousSibling,ile=0;while(p&&p.nodeName==="BR"){ile++;p=p.previousSibling;}if(ile>=2){br.remove();zmiany++;}});
  commitLiveEdit(ce);if(typeof histZapisz==="function")histZapisz(ce);toast(zmiany?"Uporządkowano tekst":"Tekst nie wymagał zmian");
}

/* Dyskretna autokorekta podczas pisania: polskie cudzysłowy, podwójna spacja
   i spacja przed znakiem interpunkcyjnym. Nie przebudowuje całej notatki. */
function polskaAutokorektaNaWejsciu(e){
  const ce=e.target&&e.target.closest&&e.target.closest('.ncontent[contenteditable="true"]');if(!ce||e.inputType!=="insertText"||!e.data)return;
  const sel=getSelection();if(!sel||!sel.rangeCount||sel.anchorNode?.nodeType!==3)return;const node=sel.anchorNode;let pos=sel.anchorOffset,txt=node.nodeValue,nowy=txt;
  if(e.data==='"'&&pos>0){const przed=txt[pos-2]||"";nowy=txt.slice(0,pos-1)+(!przed||/[\s([{—–-]/.test(przed)?"„":"”")+txt.slice(pos);}
  else if(e.data===" "&&pos>1&&txt[pos-2]===" "){nowy=txt.slice(0,pos-1)+txt.slice(pos);pos--;}
  else if(/^[,.;:!?]$/.test(e.data)&&pos>1&&/[ \t]/.test(txt[pos-2])){nowy=txt.slice(0,pos-2)+e.data+txt.slice(pos);pos--;}
  else if(optAutoWielkieLitery && /^\p{Ll}$/u.test(e.data) && pos > 0 && czyWymagaWielkiejLitery(node, pos, ce)){
    const up = e.data.toUpperCase();
    nowy = txt.slice(0, pos - 1) + up + txt.slice(pos);
  }
  if(nowy!==txt){node.nodeValue=nowy;const r=document.createRange();r.setStart(node,Math.max(0,pos));r.collapse(true);sel.removeAllRanges();sel.addRange(r);}
}
document.addEventListener("input",polskaAutokorektaNaWejsciu,true);
/* ===== WYRÓŻNIONE BLOKI, MALARZ FORMATÓW I RUCH AKAPITÓW ===== */
const CALLOUT_NAZWY={important:"Ważne",conclusion:"Wniosek",question:"Pytanie",example:"Przykład"};
function insertCallout(ce,typ){
  if(!ce||!CALLOUT_NAZWY[typ])return;
  const r=edSavedRange&&ce.contains(edSavedRange.commonAncestorContainer)?edSavedRange.cloneRange():null;
  if(typeof histZapisz==="function")histZapisz(ce);
  const box=document.createElement("div");box.className="callout callout-"+typ;
  const nag=document.createElement("b");nag.textContent=CALLOUT_NAZWY[typ];box.appendChild(nag);box.appendChild(document.createElement("br"));
  if(r&&!r.collapsed)box.appendChild(r.extractContents());else box.appendChild(document.createElement("br"));
  const cel=r||(()=>{const x=document.createRange();x.selectNodeContents(ce);x.collapse(false);return x;})();
  cel.insertNode(box);
  const po=document.createRange();po.selectNodeContents(box);po.collapse(false);
  const sel=getSelection();sel.removeAllRanges();sel.addRange(po);
  commitLiveEdit(ce);if(typeof histZapisz==="function")histZapisz(ce);toast("Wstawiono blok „"+CALLOUT_NAZWY[typ]+"”");
}
let malarzFormat=null;
function malarzZrodlo(range){
  let el=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement;
  const mark=el&&el.closest&&el.closest("mark");
  let hl="";if(mark){const m=(mark.className||"").match(/hl[1-7]/);hl=m?m[0]:"";}
  let color="";try{color=document.queryCommandValue("foreColor")||"";}catch(_){}
  return {bold:document.queryCommandState("bold"),italic:document.queryCommandState("italic"),underline:document.queryCommandState("underline"),strike:document.queryCommandState("strikeThrough"),color,hl,block:biezacyBlok()};
}
function malarzFormatKlik(bar){
  const ce=bar&&bar.parentElement&&bar.parentElement.querySelector(".ncontent"),btn=bar&&bar.querySelector("[data-painter]");
  const r=edSavedRange;if(!ce||!r||!ce.contains(r.commonAncestorContainer)){toast("Najpierw zaznacz tekst");return;}
  if(!malarzFormat){malarzFormat=malarzZrodlo(r);if(btn)btn.classList.add("active");toast("Skopiowano format. Zaznacz tekst docelowy i ponownie dotknij pędzla.");return;}
  if(r.collapsed){toast("Zaznacz tekst, na który nałożyć format");return;}
  if(typeof histZapisz==="function")histZapisz(ce);restoreSel(ce);
  [["bold",malarzFormat.bold],["italic",malarzFormat.italic],["underline",malarzFormat.underline],["strikeThrough",malarzFormat.strike]].forEach(([cmd,on])=>{let jest=false;try{jest=document.queryCommandState(cmd);}catch(_){}if(!!jest!==!!on)document.execCommand(cmd,false,null);});
  if(malarzFormat.color){try{document.execCommand("styleWithCSS",false,true);document.execCommand("foreColor",false,malarzFormat.color);}catch(_){}}
  if(malarzFormat.block&&malarzFormat.block!=="DIV")document.execCommand("formatBlock",false,"<"+malarzFormat.block.toLowerCase()+">");
  /* Polecenia przeglądarki potrafią przebudować węzły i unieważnić dawny Range.
     Pobieramy więc aktualne zaznaczenie dopiero po nałożeniu stylów tekstu. */
  const sel=getSelection();
  if(sel&&sel.rangeCount){
    const rr=sel.getRangeAt(0);
    if(!rr.collapsed&&ce.contains(rr.commonAncestorContainer)){
      unwrapMarks(rr,ce);
      if(malarzFormat.hl){
        const po=getSelection();
        if(po&&po.rangeCount&&!po.getRangeAt(0).collapsed)applyMark(po.getRangeAt(0),+malarzFormat.hl.slice(2));
      }
    }
  }
  malarzFormat=null;if(btn)btn.classList.remove("active");commitLiveEdit(ce);if(typeof histZapisz==="function")histZapisz(ce);toast("Nałożono format");
}
function przesunAkapit(ce,kier){
  const sel=getSelection();if(!sel||!sel.rangeCount){toast("Ustaw kursor w akapicie");return;}
  const start=sel.getRangeAt(0).startContainer;
  let el=start.nodeType===3?start.parentNode:start;
  while(el&&el!==ce&&el.parentNode!==ce)el=el.parentNode;
  /* Nowe wiersze są rozdzielane znacznikiem BR, żeby Enter nie tworzył dużych
     odstępów. Taki wiersz również można przesuwać, mimo że nie ma własnego DIV. */
  if(el===ce||!el){
    const dzieci=Array.from(ce.childNodes), grupy=[];let grupa=[];
    dzieci.forEach(n=>{grupa.push(n);if(n.nodeName==="BR"){grupy.push(grupa);grupa=[];}});if(grupa.length)grupy.push(grupa);
    let top=start;while(top&&top.parentNode!==ce)top=top.parentNode;
    if(top===ce){const off=sel.getRangeAt(0).startOffset;top=dzieci[Math.min(off,dzieci.length-1)]||dzieci[off-1];}
    const i=grupy.findIndex(g=>g.includes(top)),j=i+kier;
    if(i<0||j<0||j>=grupy.length){toast(kier<0?"Wiersz jest już pierwszy":"Wiersz jest już ostatni");return;}
    if(typeof histZapisz==="function")histZapisz(ce);
    const porzadek=grupy.slice();[porzadek[i],porzadek[j]]=[porzadek[j],porzadek[i]];
    const frag=document.createDocumentFragment();porzadek.flat().forEach(n=>frag.appendChild(n));ce.appendChild(frag);
    ce.focus();commitLiveEdit(ce);if(typeof histZapisz==="function")histZapisz(ce);toast(kier<0?"Przeniesiono wiersz wyżej":"Przeniesiono wiersz niżej");return;
  }
  if(el.nodeType!==1){toast("Nie udało się wskazać akapitu");return;}
  let cel=kier<0?el.previousElementSibling:el.nextElementSibling;
  if(!cel){toast(kier<0?"Akapit jest już pierwszy":"Akapit jest już ostatni");return;}
  if(typeof histZapisz==="function")histZapisz(ce);
  if(kier<0)ce.insertBefore(el,cel);else ce.insertBefore(cel,el);
  ce.focus();commitLiveEdit(ce);if(typeof histZapisz==="function")histZapisz(ce);toast(kier<0?"Przeniesiono akapit wyżej":"Przeniesiono akapit niżej");
}

/* ===== PASEK KONTEKSTOWY ZAZNACZENIA (3.52) ===== */
let ctxRange=null,ctxCe=null,ctxTimer=0;
function schowajPasekZaznaczenia(){const b=$("selEditBar");if(b)b.style.display="none";}
function pokazPasekZaznaczenia(){
  clearTimeout(ctxTimer);ctxTimer=setTimeout(()=>{
    const sel=getSelection(),bar=$("selEditBar");if(!sel||!sel.rangeCount||sel.isCollapsed){schowajPasekZaznaczenia();return;}
    const r=sel.getRangeAt(0),ce=(r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement)?.closest?.('.ncontent[contenteditable="true"]');
    if(!ce||!ce.contains(r.commonAncestorContainer)){schowajPasekZaznaczenia();return;}
    ctxRange=r.cloneRange();ctxCe=ce;edSavedRange=ctxRange.cloneRange();bar.style.display="flex";
    const rects=r.getClientRects(),rr=rects.length?rects[rects.length-1]:r.getBoundingClientRect(),ob=typeof widocznyObszar==="function"?widocznyObszar():{lewo:0,gora:0,prawo:innerWidth,dol:innerHeight};
    const bw=bar.offsetWidth||390,bh=bar.offsetHeight||46;
    bar.style.left=Math.max(ob.lewo+8,Math.min(rr.left+(rr.width-bw)/2,ob.prawo-bw-8))+"px";
    const nad=rr.top-bh-8,pod=rr.bottom+8;bar.style.top=(nad>=ob.gora+8?nad:Math.min(pod,ob.dol-bh-8))+"px";
  },90);
}
document.addEventListener("selectionchange",pokazPasekZaznaczenia);
$("selEditBar").addEventListener("pointerdown",ev=>{
  const b=ev.target.closest("[data-ctx]");if(!b||!ctxCe||!ctxRange)return;ev.preventDefault();ev.stopPropagation();
  edSavedRange=ctxRange.cloneRange();const bar=ctxCe.closest(".ncard")?.querySelector(".editbar"),co=b.dataset.ctx;
  if(co==="color"){schowajPasekZaznaczenia();if(bar)openEbPop("color",b,bar);return;}
  if(co==="link"){schowajPasekZaznaczenia();insertUrlLink(ctxCe);return;}
  if(co==="callout"){schowajPasekZaznaczenia();insertCallout(ctxCe,"important");return;}
  if(co==="painter"){if(bar)malarzFormatKlik(bar);schowajPasekZaznaczenia();return;}
  const sel=getSelection();ctxCe.focus();sel.removeAllRanges();sel.addRange(ctxRange);
  if(typeof histZapisz==="function")histZapisz(ctxCe);
  if(co==="quote")document.execCommand("formatBlock",false,"<blockquote>");else document.execCommand(co,false,null);
  commitLiveEdit(ctxCe);if(typeof histZapisz==="function")histZapisz(ctxCe);schowajPasekZaznaczenia();
});
document.addEventListener("pointerdown",e=>{if(!e.target.closest("#selEditBar,#ebPop"))schowajPasekZaznaczenia();},true);

/* ===== SPIS NAGŁÓWKÓW I ZWIJANIE SEKCJI (3.53 + 3.56 Pkt 4) ===== */
let outlineCe=null,outlineTimer=0;
function zamknijSpisNotatki(reset){
  $("noteOutline").style.display="none";
  if(reset&&outlineCe){Array.from(outlineCe.children).forEach(n=>{n.hidden=false;n.classList?.remove("outline-collapsed");});}
  if(reset)outlineCe=null;
}
function naglowkiNotatki(){return outlineCe?Array.from(outlineCe.querySelectorAll(":scope > h1,:scope > h2,:scope > h3")):[];}
function rysujSpisNotatki(){
  const list=$("outlineList"),heads=naglowkiNotatki();if(!heads.length){list.innerHTML='<div class="outlineEmpty">Dodaj nagłówki stylem „Nagłówek 1” lub „Nagłówek 2”, aby powstał spis.</div>';return;}
  list.innerHTML=heads.map((h,i)=>`<div class="outlineItem lv${+(h.tagName.slice(1))}${h.classList.contains("outline-collapsed")?" folded":""}" data-oi="${i}"><button class="outlineJump" data-ojump="${i}">${esc(h.textContent.trim()||"Bez tytułu")}</button><button class="outlineFold" data-ofold="${i}" title="Zwiń lub rozwiń sekcję">${h.classList.contains("outline-collapsed")?"＋":"−"}</button></div>`).join("");
}
function otworzSpisNotatki(ce){outlineCe=ce;rysujSpisNotatki();$("noteOutline").style.display="block";}
function wezlySekcji(h){const poziom=+(h.tagName.slice(1)),out=[];let n=h.nextElementSibling;while(n){if(/^H[1-3]$/.test(n.tagName)&&+(n.tagName.slice(1))<=poziom)break;out.push(n);n=n.nextElementSibling;}return out;}
function przelaczSekcje(h){
  const zamknij=!h.classList.contains("outline-collapsed");
  h.classList.toggle("outline-collapsed",zamknij);
  const btn = h.querySelector(".secFoldBtn");
  if(btn){
    btn.textContent = zamknij ? "▸" : "▾";
    btn.title = zamknij ? "Rozwiń sekcję" : "Zwiń sekcję";
    btn.setAttribute("aria-expanded", !zamknij);
  }
  wezlySekcji(h).forEach(n=>n.hidden=zamknij);
  rysujSpisNotatki();
}

/** Dołącza interaktywny przycisk zwijania do nagłówków w karcie notatki */
function uzupelnijZwijanieNaglowkow(container){
  if(!container) return;
  container.querySelectorAll(":scope > h1, :scope > h2, :scope > h3").forEach(h=>{
    if(!h.querySelector(".secFoldBtn")){
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "secFoldBtn";
      btn.contentEditable = "false";
      btn.textContent = h.classList.contains("outline-collapsed") ? "▸" : "▾";
      btn.title = h.classList.contains("outline-collapsed") ? "Rozwiń sekcję" : "Zwiń sekcję";
      btn.setAttribute("aria-label", "Zwiń lub rozwiń sekcję");
      btn.setAttribute("aria-expanded", !h.classList.contains("outline-collapsed"));
      h.insertBefore(btn, h.firstChild);
    }
  });
}

/* Kliknięcie w małą strzałkę zwijania bezpośrednio przy nagłówku w treści */
document.addEventListener("click", e=>{
  const btn = e.target && e.target.closest ? e.target.closest(".secFoldBtn") : null;
  if(!btn) return;
  e.preventDefault(); e.stopPropagation();
  const h = btn.closest("h1, h2, h3");
  if(h) przelaczSekcje(h);
}, true);

$("noteOutline").addEventListener("pointerdown",e=>{const close=e.target.closest("[data-outline-close]"),jump=e.target.closest("[data-ojump]"),fold=e.target.closest("[data-ofold]");if(!close&&!jump&&!fold)return;e.preventDefault();if(close){zamknijSpisNotatki(false);return;}const heads=naglowkiNotatki(),i=+(jump?jump.dataset.ojump:fold.dataset.ofold),h=heads[i];if(!h)return;if(fold)przelaczSekcje(h);else{if(h.hidden){h.hidden=false;}h.scrollIntoView({block:"center",behavior:"smooth"});const r=document.createRange();r.selectNodeContents(h);r.collapse(true);const s=getSelection();s.removeAllRanges();s.addRange(r);}});
document.addEventListener("input",e=>{
  const ce = e.target.closest && e.target.closest(".ncontent");
  if(ce) uzupelnijZwijanieNaglowkow(ce);
  if(outlineCe&&ce===outlineCe){clearTimeout(outlineTimer);outlineTimer=setTimeout(rysujSpisNotatki,180);}
});

/* ===== BIBLIOTEKA FRAGMENTÓW I SZABLONÓW (3.53) ===== */
let fragmentCe=null,fragmentRange=null;
function fragmentyWlasne(){return (typeof szablony!=="undefined"?szablony:[]).filter(s=>s&&s.typ==="fragment").slice().sort((a,b)=>(a.ord||0)-(b.ord||0));}
function zwykleSzablonyEdytora(){return (typeof szablony!=="undefined"?szablony:[]).filter(s=>s&&s.typ!=="fragment").slice().sort((a,b)=>(a.ord||0)-(b.ord||0));}
function rysujFragmenty(){
  const w=fragmentyWlasne(),s=zwykleSzablonyEdytora();let html="";
  html+='<div class="fragmentGroup">Krótkie fragmenty</div>'+(w.length?w.map(x=>`<div class="fragmentItem"><button class="fragmentInsert" data-fin="f:${x.id}">${esc(x.nazwa)}<small>${esc(String(x.tresc||"").slice(0,90))}</small></button><button class="fragmentDelete" data-fdel="${x.id}" title="Usuń">✕</button></div>`).join(""):'<div class="outlineEmpty">Zaznacz tekst i zapisz pierwszy fragment.</div>');
  html+='<div class="fragmentGroup">Moje szablony notatek</div>'+(s.length?s.map(x=>`<div class="fragmentItem"><button class="fragmentInsert" data-fin="s:${x.id}">${esc(x.nazwa)}<small>${esc(String(x.tresc||"").slice(0,90))}</small></button></div>`).join(""):'<div class="outlineEmpty">Brak własnych szablonów.</div>');
  html+='<div class="fragmentGroup">Szablony wbudowane</div>'+NOTE_TEMPLATES.map((x,i)=>`<div class="fragmentItem"><button class="fragmentInsert" data-fin="b:${i}">${esc(x.n)}<small>Wstaw układ do bieżącej notatki</small></button></div>`).join("");$("fragmentList").innerHTML=html;
}
function openFragmenty(ce){fragmentCe=ce;fragmentRange=edSavedRange&&ce.contains(edSavedRange.commonAncestorContainer)?edSavedRange.cloneRange():null;rysujFragmenty();$("fragmentPanel").classList.add("show");}
function closeFragmenty(){$("fragmentPanel").classList.remove("show");fragmentCe=null;fragmentRange=null;}
async function zapiszFragmentZaznaczenia(ce){
  const r=(fragmentRange&&ce===fragmentCe?fragmentRange:edSavedRange);if(!r||r.collapsed||!ce.contains(r.commonAncestorContainer)){toast("Najpierw zaznacz tekst do zapisania");return;}
  const tekst=r.toString().trim();if(!tekst)return;const nazwa=await askText({title:"Nazwa fragmentu",value:tekst.slice(0,38),placeholder:"np. Zakończenie komentarza",okLabel:"Zapisz"});if(nazwa===null||!nazwa.trim())return;
  szablony.push({id:Date.now(),typ:"fragment",nazwa:nazwa.trim().slice(0,60),tytul:"",tresc:tekst.slice(0,20000),ord:szablony.length*10});saveSzablony();toastOk("Zapisano fragment „"+nazwa.trim()+"”");if($("fragmentPanel").classList.contains("show"))rysujFragmenty();
}
function wstawFragmentDoNotatki(kind,id){
  if(!fragmentCe)return;let html="",tekst="";if(kind==="b"){const x=NOTE_TEMPLATES[id];if(x)html=x.h;}else{const x=szablony.find(s=>s.id===id);if(x)tekst=wypelnijWstawki(x.tresc||"");}
  fragmentCe.focus();const sel=getSelection();if(fragmentRange&&fragmentCe.contains(fragmentRange.commonAncestorContainer)){sel.removeAllRanges();sel.addRange(fragmentRange);}
  if(typeof histZapisz==="function")histZapisz(fragmentCe);if(html)document.execCommand("insertHTML",false,html);else if(!(typeof wstawCzystyTekst==="function"&&wstawCzystyTekst(fragmentCe,tekst)))document.execCommand("insertText",false,tekst);commitLiveEdit(fragmentCe);toast("Wstawiono fragment lub szablon");closeFragmenty();
}
$("fragmentPanel").addEventListener("pointerdown",e=>{const close=e.target.closest("[data-fragment-close]"),save=e.target.closest("[data-fragment-save]"),ins=e.target.closest("[data-fin]"),del=e.target.closest("[data-fdel]");if(!close&&!save&&!ins&&!del)return;e.preventDefault();if(close){closeFragmenty();return;}if(save){zapiszFragmentZaznaczenia(fragmentCe);return;}if(del){const id=+del.dataset.fdel,i=szablony.findIndex(s=>s.id===id&&s.typ==="fragment");if(i>=0){szablony.splice(i,1);saveSzablony();rysujFragmenty();toast("Usunięto fragment");}return;}const [k,v]=ins.dataset.fin.split(":");wstawFragmentDoNotatki(k,+v);});

/* Powielenie/usunięcie działa także dla nowych, zwartych wierszy BR. */
function operacjaAkapitu(ce,co){
  const r=edSavedRange&&ce.contains(edSavedRange.commonAncestorContainer)?edSavedRange:null;
  if(!r){toast("Ustaw kursor w akapicie lub wierszu");return;}
  let top=r.startContainer;if(top.nodeType===3)top=top.parentNode;
  const osobny=top&&top.closest?top.closest("li,blockquote,h1,h2,h3,h4,h5,h6"):null;
  if(osobny&&ce.contains(osobny))top=osobny;
  else
  while(top&&top!==ce&&top.parentNode!==ce)top=top.parentNode;
  if(typeof histZapisz==="function")histZapisz(ce);
  if(top&&top!==ce&&top.nodeType===1&&/^(DIV|P|LI|H[1-6]|BLOCKQUOTE|UL|OL)$/.test(top.tagName||"")){
    if(co==="copy")top.parentNode.insertBefore(top.cloneNode(true),top.nextSibling);
    else {const rodzic=top.parentNode;top.remove();if(rodzic!==ce&&/^(UL|OL)$/.test(rodzic.tagName||"")&&!rodzic.children.length)rodzic.remove();}
  }else{
    const dzieci=Array.from(ce.childNodes),grupy=[];let g=[];
    dzieci.forEach(n=>{g.push(n);if(n.nodeName==="BR"){grupy.push(g);g=[];}});if(g.length)grupy.push(g);
    if(top===ce){const off=r.startOffset;top=dzieci[Math.min(off,dzieci.length-1)]||dzieci[off-1];}
    const i=grupy.findIndex(x=>x.includes(top));if(i<0){toast("Nie udało się wskazać wiersza");return;}
    if(co==="copy"){
      const ref=grupy[i][grupy[i].length-1].nextSibling;
      grupy[i].map(n=>n.cloneNode(true)).forEach(n=>ce.insertBefore(n,ref));
    }else grupy[i].forEach(n=>n.remove());
  }
  if(!ce.childNodes.length)ce.appendChild(document.createElement("br"));
  ce.focus();commitLiveEdit(ce);if(typeof histZapisz==="function")histZapisz(ce);
  toast(co==="copy"?"Powielono akapit lub wiersz":"Usunięto akapit lub wiersz");
}

function linkPrzyZakresie(ce){
  const r=edSavedRange;if(!r||!ce.contains(r.commonAncestorContainer))return null;
  let el=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;
  el=el&&el.closest?el.closest("a"):null;return el&&ce.contains(el)?el:null;
}
async function edytujIstniejacyLink(ce,usun){
  const a=linkPrzyZakresie(ce);if(!a){toast("Ustaw kursor wewnątrz linku");return;}
  if(a.classList.contains("note-ref")){toast("Odsyłacz do notatki utwórz ponownie skrótem @");return;}
  if(usun){
    if(typeof histZapisz==="function")histZapisz(ce);const frag=document.createDocumentFragment();while(a.firstChild)frag.appendChild(a.firstChild);a.replaceWith(frag);commitLiveEdit(ce);if(typeof histZapisz==="function")histZapisz(ce);toast("Usunięto link; tekst pozostał");return;
  }
  const url=await askText({title:"Zmień adres linku",value:a.getAttribute("href")||"https://",placeholder:"https://…",okLabel:"Dalej"});if(url===null||!url.trim())return;
  const txt=await askText({title:"Zmień tekst linku",value:a.textContent||url,placeholder:"Tekst widoczny w notatce",okLabel:"Zapisz"});if(txt===null)return;
  let href=url.trim();if(!/^(https?:\/\/|mailto:|jwlibrary:)/i.test(href))href="https://"+href.replace(/^\/+/,"");
  if(typeof histZapisz==="function")histZapisz(ce);a.setAttribute("href",href);a.textContent=txt||href;
  if(a.classList.contains("jwl-ref"))a.setAttribute("data-url",href);commitLiveEdit(ce);if(typeof histZapisz==="function")histZapisz(ce);toast("Zmieniono link");
}

function komorkaPrzyZakresie(ce){
  const r=edSavedRange;if(!r||!ce.contains(r.commonAncestorContainer))return null;
  let el=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;
  el=el&&el.closest?el.closest("td,th"):null;return el&&ce.contains(el)?el:null;
}
function edytujTabele(ce,co){
  const cell=komorkaPrzyZakresie(ce);if(!cell){toast("Ustaw kursor w komórce tabeli");return;}
  const row=cell.closest("tr"),table=cell.closest("table");if(!row||!table)return;
  if(typeof histZapisz==="function")histZapisz(ce);
  const idx=Array.from(row.children).indexOf(cell);
  if(co==="table-row"){
    const nr=document.createElement("tr");Array.from(row.children).forEach(()=>{const td=document.createElement("td");td.innerHTML="&nbsp;";nr.appendChild(td);});row.parentNode.insertBefore(nr,row.nextSibling);
  }else if(co==="table-col"){
    Array.from(table.rows).forEach((tr,ri)=>{const wzor=tr.cells[Math.min(idx,tr.cells.length-1)],tag=ri===0&&wzor&&wzor.tagName==="TH"?"th":"td",n=document.createElement(tag);n.innerHTML=tag==="th"?"Nagłówek":"&nbsp;";tr.insertBefore(n,tr.cells[idx+1]||null);});
  }else if(co==="table-del-row"){
    if(table.rows.length<=1)table.remove();else row.remove();
  }else if(co==="table-del-col"){
    if(row.cells.length<=1)table.remove();else Array.from(table.rows).forEach(tr=>{if(tr.cells[idx])tr.cells[idx].remove();});
  }else if(co==="table-delete")table.remove();
  if(!ce.childNodes.length)ce.appendChild(document.createElement("br"));
  ce.focus();commitLiveEdit(ce);if(typeof histZapisz==="function")histZapisz(ce);toast("Zmieniono tabelę");
}
let tableCell=null;
function schowajTableBar(){tableCell=null;$("tableBar").style.display="none";}
function pokazTableBar(cell){
  if(!cell||!cell.closest('.ncontent[contenteditable="true"]')){schowajTableBar();return;}tableCell=cell;const bar=$("tableBar");bar.style.display="flex";
  const r=cell.getBoundingClientRect(),ob=typeof widocznyObszar==="function"?widocznyObszar():{lewo:0,gora:0,prawo:innerWidth,dol:innerHeight},bw=bar.offsetWidth||520,bh=bar.offsetHeight||44;
  bar.style.left=Math.max(ob.lewo+8,Math.min(r.left,ob.prawo-bw-8))+"px";bar.style.top=(r.top-bh-7>=ob.gora+8?r.top-bh-7:Math.min(r.bottom+7,ob.dol-bh-8))+"px";
}
function zakresWKomorce(cell){const r=document.createRange();r.selectNodeContents(cell);r.collapse(true);edSavedRange=r;}
function tableBarAction(co){
  const cell=tableCell,ce=cell?.closest(".ncontent"),table=cell?.closest("table");if(!cell||!ce||!table)return;if(typeof histZapisz==="function")histZapisz(ce);zakresWKomorce(cell);
  if(co==="row")edytujTabele(ce,"table-row");else if(co==="col")edytujTabele(ce,"table-col");
  else if(["left","center","right"].includes(co)){cell.style.textAlign=co;commitLiveEdit(ce);}
  else if(co==="head"){
    const klasy=["","table-head-1","table-head-2","table-head-3","table-head-4"],i=klasy.findIndex(k=>k&&table.classList.contains(k));klasy.slice(1).forEach(k=>table.classList.remove(k));const next=klasy[i<0?1:(i+1)%klasy.length];if(next)table.classList.add(next);commitLiveEdit(ce);
  }else if(co==="merge"){
    const right=cell.nextElementSibling;if(!right){toast("Brak komórki z prawej");return;}const br=document.createElement("br");if(cell.textContent.trim()&&right.textContent.trim())cell.appendChild(br);while(right.firstChild)cell.appendChild(right.firstChild);cell.colSpan=(cell.colSpan||1)+(right.colSpan||1);right.remove();commitLiveEdit(ce);
  }else if(co==="split"){
    const ile=Math.max(1,cell.colSpan||1);if(ile<=1){toast("Ta komórka nie jest połączona");return;}cell.colSpan=1;for(let i=1;i<ile;i++){const n=document.createElement(cell.tagName.toLowerCase());n.innerHTML="&nbsp;";cell.parentNode.insertBefore(n,cell.nextSibling);}commitLiveEdit(ce);
  }
  if(typeof histZapisz==="function")histZapisz(ce);pokazTableBar(cell.isConnected?cell:null);
}
$("tableBar").addEventListener("pointerdown",e=>{const b=e.target.closest("[data-tact]");if(!b)return;e.preventDefault();e.stopPropagation();tableBarAction(b.dataset.tact);});
document.addEventListener("pointerup",e=>{const cell=e.target.closest?.('.ncontent[contenteditable="true"] td,.ncontent[contenteditable="true"] th');if(cell)setTimeout(()=>pokazTableBar(cell),20);else if(!e.target.closest?.("#tableBar"))schowajTableBar();});

/* ===== WSTAWIANIE: odnośnik do wersetu, link, lista zadań ===== */
function restoreSel(ce){
  if(!ce) return; ce.focus();
  const sel=getSelection();
  if(edSavedRange && ce.contains(edSavedRange.commonAncestorContainer)){ sel.removeAllRanges(); sel.addRange(edSavedRange); }
}
function insertNodeAtRange(node, ce, range){
  if(range && ce.contains(range.commonAncestorContainer)){
    const r=range.cloneRange(); r.collapse(false); r.insertNode(node);
    node.parentNode.insertBefore(document.createTextNode(" "), node.nextSibling);
  } else { ce.appendChild(node); ce.appendChild(document.createTextNode(" ")); }
}
function dismissPopupsAndSidebar(){
  const dd=$("dropdown"); if(dd) dd.style.display="none";
  const cm=$("colorMenu"); if(cm) cm.style.display="none";
  const mm=$("motywMenu"); if(mm) mm.style.display="none";
  if(typeof toggleMobileSidebar==="function"){
    toggleMobileSidebar(false);
  } else {
    document.body.classList.remove("mobile-sidebar-open");
    const ac=document.getElementById("appContainer");
    if(ac) ac.classList.remove("mobile-sidebar-open");
    const bd=document.getElementById("sidebarBackdrop");
    if(bd) bd.setAttribute("aria-hidden","true");
  }
}

/* własne okienko tekstowe — działa też w aplikacji na iOS (gdzie prompt() bywa zablokowany) */
function askText(o){
  o=o||{};
  dismissPopupsAndSidebar();
  return new Promise(res=>{
    const m=$("askModal");
    const t=m.querySelector(".askTitle"), inp=m.querySelector(".askInput"), hint=m.querySelector(".askHint");
    const ok=m.querySelector(".askOk"), cancel=m.querySelector(".askCancel");
    t.textContent=o.title||"Wpisz"; inp.value=o.value||""; inp.placeholder=o.placeholder||"";
    ok.textContent=o.okLabel||"Wstaw";
    hint.textContent=o.hint||""; hint.style.display=o.hint?"block":"none";
    m.classList.add("show");
    try{ inp.focus(); inp.select(); }catch(e){}
    setTimeout(()=>{ try{ inp.focus(); inp.select(); }catch(e){} }, 60);
    function done(val){
      m.classList.remove("show");
      ok.onclick=null; cancel.onclick=null; inp.onkeydown=null; m.onclick=null;
      res(val);
    }
    ok.onclick=()=>done(inp.value.trim());
    cancel.onclick=()=>done(null);
    m.onclick=e=>{ if(e.target===m) done(null); };
    inp.onkeydown=e=>{ e.stopPropagation(); if(e.key==="Enter"){ e.preventDefault(); done(inp.value.trim()); } else if(e.key==="Escape"){ e.preventDefault(); done(null); } };
  });
}
function showInfo(title, html){
  dismissPopupsAndSidebar();
  return new Promise(res=>{
    const m=$("msgModal"); m.querySelector(".askTitle").textContent=title; m.querySelector(".msgBody").innerHTML=html;
    const ok=m.querySelector(".msgOk"), cancel=m.querySelector(".msgCancel");
    cancel.style.display="none"; ok.textContent="OK"; ok.classList.remove("danger");
    m.classList.add("show");
    const done=()=>{ m.classList.remove("show"); ok.onclick=null; m.onclick=null; res(); };
    ok.onclick=done;
    m.onclick=e=>{ if(e.target===m) done(); };
  });
}
/* okno z kilkoma odpowiedziami (np. Scal / Zastąp / Anuluj) */
function askChoice(title, html, buttons){
  dismissPopupsAndSidebar();
  return new Promise(res=>{
    const m=$("msgModal");
    m.querySelector(".askTitle").textContent=title;
    m.querySelector(".msgBody").innerHTML=html;
    const row=m.querySelector(".askBtns");
    const oldOk=row.querySelector(".msgOk"), oldCancel=row.querySelector(".msgCancel");
    oldOk.style.display="none"; oldCancel.style.display="none";
    row.querySelectorAll(".msgExtra").forEach(b=>b.remove());
    function cleanup(){
      m.classList.remove("show");
      m.onclick=null;
      row.querySelectorAll(".msgExtra").forEach(b=>b.remove());
      oldOk.style.display=""; oldCancel.style.display="";
    }
    buttons.forEach(b=>{
      const el=document.createElement("button");
      el.className="msgExtra "+(b.style==="danger"?"msgOk danger":b.style==="primary"?"msgOk":"msgCancel");
      el.textContent=b.label;
      el.onclick=()=>{ cleanup(); res(b.value); };
      row.appendChild(el);
    });
    m.onclick=e=>{ if(e.target===m){ cleanup(); res(null); } };
    m.classList.add("show");
  });
}
/* własne okno potwierdzenia — działa w aplikacji na iOS (gdzie confirm() jest zablokowany) */
function askConfirm(title, html, opts){
  opts=opts||{};
  dismissPopupsAndSidebar();
  return new Promise(res=>{
    const m=$("msgModal"); m.querySelector(".askTitle").textContent=title; m.querySelector(".msgBody").innerHTML=html;
    const ok=m.querySelector(".msgOk"), cancel=m.querySelector(".msgCancel");
    cancel.style.display=""; cancel.textContent=opts.cancelLabel||"Anuluj";
    ok.textContent=opts.okLabel||"OK"; ok.classList.toggle("danger", !!opts.danger);
    m.classList.add("show");
    const done=v=>{ m.classList.remove("show"); ok.onclick=null; cancel.onclick=null; m.onclick=null; ok.classList.remove("danger"); res(v); };
    ok.onclick=()=>done(true); cancel.onclick=()=>done(false);
    m.onclick=e=>{ if(e.target===m) done(false); };
  });
}
function matchBookPart(bookPart){
  const np = norm(bookPart); if(!np) return 0;
  let best = -1, bestScore = -1;
  for(let i=1; i<BOOKS.length; i++){
    const nb = norm(BOOKS[i]); let sc = -1;
    if(nb === np) sc = 100;
    else if(nb.startsWith(np)) sc = np.length;      // wpisany prefiks (np. „Jan" → „Jana")
    else if(np.startsWith(nb)) sc = nb.length;
    if(sc > bestScore){ bestScore = sc; best = i; }
  }
  if(best < 0 || bestScore < 2) return 0;
  return best;
}
function parseRef(s){
  s = (s || "").trim(); if(!s) return null;
  // 1. Werset lub zakres/lista wersetów: np. "Jan 3:16", "Łukasza 18:1-14", "Rzymian 8:28,38,39"
  const mVerse = s.match(/\s+(\d+)\s*[:.,]\s*(\d+)((?:\s*[-–,;]\s*\d+)*)\s*$/);
  if(mVerse){
    const bookPart = s.slice(0, mVerse.index).trim();
    const ch = +mVerse[1];
    const v = +mVerse[2];
    let verses = [v];
    const ogon = mVerse[3] || "";
    let mm;
    const rx = /\s*([-–,;])\s*(\d+)/g;
    while((mm = rx.exec(ogon))){
      const sep = mm[1], koniec = +mm[2];
      if((sep === "-" || sep === "–") && koniec >= verses[verses.length-1]){
        for(let x = verses[verses.length-1]+1; x <= koniec; x++) verses.push(x);
      } else if(koniec > 0){
        verses.push(koniec);
      }
    }
    verses = [...new Set(verses)].sort((a,b)=>a-b);
    const v2 = verses.length > 1 ? verses[verses.length-1] : 0;
    const b = matchBookPart(bookPart);
    if(!b) return null;
    return { b, ch, ch2: 0, v, v2, verses };
  }
  // 2. Zakres rozdziałów: np. "Mateusza 1-4", "Rodzaju 1–3", "Objawienie 21-22"
  const mChRange = s.match(/\s+(\d+)\s*[-–]\s*(\d+)\s*$/);
  if(mChRange){
    const bookPart = s.slice(0, mChRange.index).trim();
    const ch = +mChRange[1], ch2 = +mChRange[2];
    const b = matchBookPart(bookPart);
    if(!b) return null;
    return { b, ch, ch2, v: 0, v2: 0, verses: [] };
  }
  // 3. Pojedynczy rozdział: np. "Mateusza 1", "Psalm 23"
  const mSingleCh = s.match(/\s+(\d+)\s*$/);
  if(mSingleCh){
    const bookPart = s.slice(0, mSingleCh.index).trim();
    const ch = +mSingleCh[1];
    const b = matchBookPart(bookPart);
    if(!b) return null;
    return { b, ch, ch2: 0, v: 0, v2: 0, verses: [] };
  }
  // 4. Sama księga: np. "Mateusza"
  const b = matchBookPart(s);
  if(b) return { b, ch: 1, ch2: 0, v: 0, v2: 0, verses: [] };
  return null;
}
function refText(r){
  let s = BOOKS[r.b];
  if(r.ch){
    s += " " + r.ch;
    if(r.ch2 && r.ch2 > r.ch){
      s += "-" + r.ch2;
    } else if(r.v){
      s += ":" + r.v;
      const vv = Array.isArray(r.verses) ? r.verses : [];
      if(vv.length > 1){
        const ciagly = vv.every((x,i)=>i===0 || x === vv[i-1] + 1);
        s += ciagly ? "-" + vv[vv.length-1] : "," + vv.slice(1).join(",");
      } else if(r.v2){
        s += "-" + r.v2;
      }
    }
  }
  return s;
}
/* ===== automatyczne wykrywanie odniesień do wersetów w tekście notatki ===== */
const REF_RX = (function(){
  const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const names = BOOKS.slice(1).slice().sort((a,b)=>b.length-a.length).map(esc);
  try{ return new RegExp("(?<![\\p{L}\\p{N}])("+names.join("|")+")\\s+(\\d+)\\s*[:.,]\\s*(\\d+)(?:\\s*[-–,;]\\s*\\d+)*","gu"); }
  catch(e){ return new RegExp("("+names.join("|")+")\\s+(\\d+)\\s*[:.,]\\s*(\\d+)(?:\\s*[-–,;]\\s*\\d+)*","g"); }
})();
function autolinkRefs(container){
  if(!container) return;
  let walker;
  try{ walker=document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(n){
      if(!n.nodeValue || !/\d/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
      let p=n.parentNode;
      while(p && p!==container){ const tg=p.tagName; if(tg==="A"||tg==="MARK"||(p.classList&&p.classList.contains("qhl"))) return NodeFilter.FILTER_REJECT; p=p.parentNode; }
      return NodeFilter.FILTER_ACCEPT;
    }
  }); }catch(e){ return; }
  const targets=[]; let t; while(t=walker.nextNode()) targets.push(t);
  targets.forEach(node=>{
    const text=node.nodeValue; REF_RX.lastIndex=0;
    if(!REF_RX.test(text)) return; REF_RX.lastIndex=0;
    const frag=document.createDocumentFragment(); let last=0, m;
    while((m=REF_RX.exec(text))){
      const start=m.index, end=start+m[0].length;
      if(start>last) frag.appendChild(document.createTextNode(text.slice(last,start)));
      const ref=parseRef(m[0]); const url=ref?finderUrl(ref):null;
      if(url){ const a=document.createElement("a"); a.className="jwl-ref auto"; a.href=url; a.target="_blank"; a.rel="noopener noreferrer"; a.setAttribute("data-url",url); a.textContent=m[0]; frag.appendChild(a); }
      else frag.appendChild(document.createTextNode(m[0]));
      last=end;
    }
    if(last<text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  });
}
async function insertVerseRef(ce){
  const savedR = edSavedRange ? edSavedRange.cloneRange() : null;
  const txt = await askText({title:"Odnośnik do wersetu", placeholder:"np. Jan 3:16  albo  Mateusza 5:3-5", hint:"Rozpoznaje skróty: Ps, 1 Kor, oraz formy 12,2"});
  if(txt===null || txt==="") return;
  const ref=parseRef(txt);
  if(!ref){ toast("Nie rozpoznano — wpisz np. Jan 3:16"); return; }
  const url=finderUrl(ref);
  if(!url){ toast("Brak linku do tego miejsca"); return; }
  const a=document.createElement("a");
  a.className="jwl-ref"; a.href=url; a.target="_blank"; a.rel="noopener noreferrer"; a.setAttribute("data-url",url); a.textContent=refText(ref);
  insertNodeAtRange(a, ce, savedR);
  commitLiveEdit(ce);
  toast("Wstawiono odnośnik");
}
async function insertUrlLink(ce){
  const savedR = edSavedRange ? edSavedRange.cloneRange() : null;
  const hasText = savedR && !savedR.collapsed && ce.contains(savedR.commonAncestorContainer);
  let url = await askText({title:"Link (adres internetowy)", placeholder:"https://…", value:"https://"});
  if(url===null || url==="") return; url=url.trim();
  if(!/^(https?:\/\/|mailto:)/i.test(url)) url="https://"+url.replace(/^\/+/,"");
  if(hasText){
    const sel=getSelection(); ce.focus(); sel.removeAllRanges(); sel.addRange(savedR);
    document.execCommand("createLink", false, url);
  } else {
    const label = (await askText({title:"Tekst linku", placeholder:"Opis linku", value:url})) || url;
    const a=document.createElement("a"); a.href=url; a.target="_blank"; a.rel="noopener noreferrer"; a.textContent=label;
    insertNodeAtRange(a, ce, savedR);
  }
  commitLiveEdit(ce);
  toast("Wstawiono link");
}
function insertTaskList(ce){
  restoreSel(ce);
  document.execCommand("insertHTML", false, '<ul class="tasklist"><li>Zadanie…</li></ul>');
}
/* ===== TABELA ===== */
function insertTable(ce){
  tableInsertCe=ce;tableInsertRange=edSavedRange&&ce.contains(edSavedRange.commonAncestorContainer)?edSavedRange.cloneRange():null;
  $("tableSizePanel").classList.add("show");podswietlRozmiarTabeli(0,0);
}
let tableInsertCe=null,tableInsertRange=null;
function podswietlRozmiarTabeli(rows,cols){$("tableSizeLabel").textContent=rows&&cols?rows+" × "+cols:"Wybierz rozmiar";$("tableSizeGrid").querySelectorAll("button").forEach(b=>b.classList.toggle("on",+b.dataset.r<=rows&&+b.dataset.c<=cols));}
function wstawTabeleRozmiar(rows,cols){
  const ce=tableInsertCe;if(!ce)return;ce.focus();if(tableInsertRange&&ce.contains(tableInsertRange.commonAncestorContainer)){const s=getSelection();s.removeAllRanges();s.addRange(tableInsertRange);}
  let html='<table class="ntab"><tbody>';
  for(let r=0;r<rows;r++){
    html+="<tr>";
    for(let c=0;c<cols;c++) html += r===0 ? "<th>Nagłówek "+(c+1)+"</th>" : "<td>&nbsp;</td>";
    html+="</tr>";
  }
  html+="</tbody></table><div><br></div>";
  if(typeof histZapisz==="function")histZapisz(ce);
  document.execCommand("insertHTML", false, html);
  commitLiveEdit(ce);if(typeof histZapisz==="function")histZapisz(ce);$("tableSizePanel").classList.remove("show");tableInsertCe=null;tableInsertRange=null;toast("Wstawiono tabelę "+rows+" × "+cols);
}
(()=>{const g=$("tableSizeGrid");for(let r=1;r<=5;r++)for(let c=1;c<=6;c++){const b=document.createElement("button");b.type="button";b.dataset.r=r;b.dataset.c=c;b.setAttribute("aria-label",r+" wierszy, "+c+" kolumn");g.appendChild(b);}})();
$("tableSizeGrid").addEventListener("pointerover",e=>{const b=e.target.closest("button");if(b)podswietlRozmiarTabeli(+b.dataset.r,+b.dataset.c);});
$("tableSizeGrid").addEventListener("pointerdown",e=>{const b=e.target.closest("button");if(!b)return;e.preventDefault();wstawTabeleRozmiar(+b.dataset.r,+b.dataset.c);});
$("tableSizePanel").addEventListener("pointerdown",e=>{if(e.target.closest("[data-table-size-close]")){e.preventDefault();$("tableSizePanel").classList.remove("show");tableInsertCe=null;tableInsertRange=null;}});
/* ===== SZABLONY NOTATKI ===== */
const NOTE_TEMPLATES = [
  {n:"Studium wersetu", h:'<h2>Werset</h2><div><br></div><h3>Myśl główna</h3><div><br></div><h3>Zastosowanie w życiu</h3><div><br></div>'},
  {n:"Notatka z zebrania", h:'<h2>Temat</h2><div><br></div><h3>Najważniejsze punkty</h3><ul><li>&nbsp;</li><li>&nbsp;</li></ul><h3>Wersety</h3><div><br></div><h3>Co zastosuję</h3><ul class="tasklist"><li>&nbsp;</li></ul>'},
  {n:"Przygotowanie do służby", h:'<h2>Prezentacja</h2><div><br></div><h3>Werset</h3><div><br></div><h3>Pytanie na zachętę</h3><div><br></div><h3>Publikacja do zaproponowania</h3><div><br></div>'},
  {n:"Pytanie i odpowiedź", h:'<h2>Pytanie</h2><div><br></div><h3>Odpowiedź</h3><div><br></div><h3>Wersety potwierdzające</h3><ul><li>&nbsp;</li></ul>'},
  {n:"Plan czytania Biblii", h:'<h2>Rozdziały</h2><div><br></div><h3>Co zwróciło uwagę</h3><div><br></div><h3>Pytania do zbadania</h3><ul class="tasklist"><li>&nbsp;</li></ul>'}
];
async function insertTemplate(ce){
  const dd=$("dropdown");
  dd.innerHTML = `<div class="dd-lbl">Wstaw szablon</div>` +
    NOTE_TEMPLATES.map((t,i)=>`<div data-tpl="${i}">${IE_SZABLON}${esc(t.n)}</div>`).join("");
  dd.style.display="block";
  const bar=ce.parentElement.querySelector(".editbar");
  placeDropdown(dd, bar||ce);
  dd.onclick=ev=>{
    const t=ev.target.closest("[data-tpl]"); if(!t) return;
    dd.style.display="none";
    ce.focus();
    const tpl=NOTE_TEMPLATES[+t.dataset.tpl];
    if(edSavedRange && ce.contains(edSavedRange.commonAncestorContainer)){
      const s=getSelection(); s.removeAllRanges(); s.addRange(edSavedRange);
    }
    document.execCommand("insertHTML", false, tpl.h);
    commitLiveEdit(ce);
    toast("Wstawiono szablon: "+tpl.n);
  };
}
/* ===== ZNAJDŹ I ZAMIEŃ (w edytowanej notatce) ===== */
let replaceState=null;
function replaceHighlightsOK(){return typeof CSS!=="undefined"&&CSS.highlights&&typeof Highlight!=="undefined";}
function replaceClearHighlights(){try{if(replaceHighlightsOK()){CSS.highlights.delete("jw-find-all");CSS.highlights.delete("jw-find-current");}}catch(_){}}
function replaceBuild(){
  const st=replaceState;if(!st)return;replaceClearHighlights();st.ranges=[];st.index=-1;
  const find=$("replaceFind").value,czule=$("replaceCase").checked;if(!find){replaceShow();return;}
  const needle=czule?find:find.toLocaleLowerCase("pl-PL"),walker=document.createTreeWalker(st.ce,NodeFilter.SHOW_TEXT),nodes=[];let n;
  while(n=walker.nextNode())if(n.nodeValue)nodes.push(n);
  nodes.forEach(node=>{const src=czule?node.nodeValue:node.nodeValue.toLocaleLowerCase("pl-PL");let from=0,i;while((i=src.indexOf(needle,from))>=0){const r=document.createRange();r.setStart(node,i);r.setEnd(node,i+find.length);st.ranges.push(r);from=i+Math.max(1,find.length);}});
  if(st.ranges.length)st.index=0;replaceShow();
}
function replaceShow(zaznaczAwaryjnie){
  const st=replaceState,n=st?st.ranges.length:0,i=st?st.index:-1;$("replaceStatus").textContent=n?(i+1)+" z "+n:"0 wyników";
  if(!st||!n)return;
  try{if(replaceHighlightsOK()){CSS.highlights.set("jw-find-all",new Highlight(...st.ranges));CSS.highlights.set("jw-find-current",new Highlight(st.ranges[i]));}}catch(_){}
  const r=st.ranges[i],sel=getSelection();if(!replaceHighlightsOK()&&zaznaczAwaryjnie){sel.removeAllRanges();sel.addRange(r);}
  try{r.startContainer.parentElement?.scrollIntoView({block:"center",behavior:"smooth"});}catch(_){}
}
function replaceMove(kier){const st=replaceState;if(!st||!st.ranges.length)return;st.index=(st.index+kier+st.ranges.length)%st.ranges.length;replaceShow(true);}
function replaceOne(){
  const st=replaceState;if(!st||st.index<0||!st.ranges.length)return;const r=st.ranges[st.index],txt=$("replaceWith").value;
  if(typeof histZapisz==="function")histZapisz(st.ce);r.deleteContents();r.insertNode(document.createTextNode(txt));commitLiveEdit(st.ce);replaceBuild();
}
function replaceAll(){
  const st=replaceState;if(!st||!st.ranges.length)return;const txt=$("replaceWith").value,ile=st.ranges.length;
  if(typeof histZapisz==="function")histZapisz(st.ce);st.ranges.slice().reverse().forEach(r=>{r.deleteContents();r.insertNode(document.createTextNode(txt));});commitLiveEdit(st.ce);if(typeof histZapisz==="function")histZapisz(st.ce);replaceBuild();toast("Zamieniono: "+ile+(ile===1?" miejsce":" miejsc"));
}
function closeReplace(){replaceClearHighlights();$("replacePanel").classList.remove("show");replaceState=null;}
function openReplace(ce){
  replaceState={ce,ranges:[],index:-1};const sel=getSelection(),wybrane=sel&&sel.rangeCount&&!sel.isCollapsed?sel.toString():"";
  $("replaceFind").value=wybrane;$("replaceWith").value="";$("replaceCase").checked=false;$("replacePanel").classList.add("show");replaceBuild();setTimeout(()=>{$("replaceFind").focus();if(!wybrane)$("replaceFind").select();},40);
}
$("replaceFind").addEventListener("input",replaceBuild);$("replaceCase").addEventListener("change",replaceBuild);
$("replacePanel").addEventListener("pointerdown",e=>{const b=e.target.closest("[data-rp]");if(!b)return;e.preventDefault();const a=b.dataset.rp;if(a==="prev")replaceMove(-1);else if(a==="next")replaceMove(1);else if(a==="one")replaceOne();else if(a==="all")replaceAll();else closeReplace();});
$("replacePanel").addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();closeReplace();}});
/* ===== HISTORIA WERSJI =====
   Cała historia wersji — zapis, ścieranie starszych, okno z listą dat
   i porównywanie — mieszka teraz w 51-historia.js. Tu została tylko ta
   wzmianka, żeby nie szukać jej w edytorze: pozycja „Historia wersji…"
   w menu ⋯ woła openHistory() z tamtego modułu. */
function blockOf(node, ce){
  let el = node && node.nodeType===3 ? node.parentNode : node;
  while(el && el!==ce && el.parentNode){
    if(el.parentNode===ce || /^(DIV|P|LI|H1|H2|H3|H4|BLOCKQUOTE)$/.test(el.tagName||"")) return el;
    el=el.parentNode;
  }
  return ce;
}
/**
 * SKRÓTY PISANIA: `# `, `## `, `- `, `1. `, `> `, `[] ` na początku akapitu.
 *
 * CO BYŁO NIE TAK (do wydania 2.60)
 *
 * Zamiana bloku szła przez document.execCommand("formatBlock"). Działa to
 * tylko wtedy, gdy w bloku JEST tekst. Najczęstszy przypadek jest odwrotny:
 * naciskasz Enter, powstaje PUSTY akapit, wpisujesz `# ` — i po skasowaniu
 * dwóch znaków blok znów jest pusty. Kursor w pustym elemencie nie wskazuje
 * przeglądarce jednoznacznie, co formatować, więc Chromium brał blok
 * POPRZEDNI. Efekt: nagłówkiem stawał się akapit wyżej, a wpisywany tekst
 * dopisywał się na jego końcu:
 *
 *     <div>pierwszy akapit</div> + Enter + „# Nagłówek"
 *        → <h2>pierwszy akapitNagłówek</h2><div></div>
 *
 * Tak samo psuły się wszystkie sześć skrótów, także listy. Nie było tego
 * widać w testach, bo sprawdzały funkcję autoformat na bloku Z TEKSTEM.
 *
 * JAK JEST TERAZ
 *
 * Zamianę robimy sami: nowy element, przeniesione dzieci, podmiana w miejscu.
 * Żadnego zgadywania, który blok miał być celem — mamy go w ręku. execCommand
 * zostaje tylko tam, gdzie nie ma nic do zgadnięcia.
 */
function zamienBlok(block, tag, ce){
  if(!block || block === ce || !block.parentNode) return null;
  const nowy = document.createElement(tag);
  while(block.firstChild) nowy.appendChild(block.firstChild);
  block.parentNode.replaceChild(nowy, block);
  return nowy;
}
/** Zamienia blok na listę jednoelementową; zawartość bloku wchodzi do <li>. */
function zamienNaListe(block, tag, klasa, ce){
  if(!block || block === ce || !block.parentNode) return null;
  const lista = document.createElement(tag);
  if(klasa) lista.className = klasa;
  const li = document.createElement("li");
  while(block.firstChild) li.appendChild(block.firstChild);
  lista.appendChild(li);
  block.parentNode.replaceChild(lista, block);
  return lista;
}
/**
 * KURSOR NA POCZĄTKU ŚWIEŻO UTWORZONEGO BLOKU.
 *
 * Nowy blok jest zwykle PUSTY (znacznik `# ` właśnie zniknął), a w pustym
 * elemencie przeglądarka nie umie utrzymać kursora: zaznaczenie ustawione na
 * „element, pozycja 0" przepadało i pisany dalej tekst lądował w akapicie
 * WYŻEJ. Widać to było przy `## ` i `[] `, a przy `# ` czasem tak, czasem nie —
 * czyli najgorszy możliwy rodzaj usterki.
 *
 * Dlatego pusty blok dostaje najpierw <br> — dokładnie to, co przeglądarka
 * sama wstawia do pustego akapitu w polu edycji. Kursor ma się wtedy o co
 * zaczepić, a pisany tekst wchodzi PRZED znacznik i wypycha go poza widok.
 */
function kursorNaPoczatkuBloku(el, ce){
  if(!el) return;
  const cel = el.querySelector("li") || el;
  /* PUSTE WĘZŁY TEKSTOWE MUSZĄ ZNIKNĄĆ. Zostają po skasowaniu wpisanego
     znacznika i wyglądają na dobre miejsce dla kursora, ale przeglądarka
     porzuca je przy pierwszej normalizacji zaznaczenia — i wtedy kursor
     przeskakuje do akapitu wyżej. To była przyczyna tego, że `# ` działało,
     a `## ` i `[] ` nie: różniły się tylko tym, czy po kasowaniu został pusty
     węzeł, czy nie. */
  [...cel.childNodes].forEach(w=>{ if(w.nodeType === 3 && !w.nodeValue) w.remove(); });
  if(!cel.firstChild) cel.appendChild(document.createElement("br"));
  try{
    if(ce && typeof ce.focus === "function") ce.focus();
    const r = document.createRange();
    if(cel.firstChild.nodeType === 3) r.setStart(cel.firstChild, 0);
    else r.setStart(cel, 0);
    r.collapse(true);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }catch(e){}
}
function autoformat(ce){
  const sel=getSelection(); if(!sel.rangeCount) return;
  const r=sel.getRangeAt(0); if(!r.collapsed) return;
  const block=blockOf(r.startContainer, ce); if(!block || block===ce) return;
  let txt;
  try{ const pre=document.createRange(); pre.setStart(block,0); pre.setEnd(r.startContainer, r.startOffset); txt=pre.toString(); }catch(e){ return; }
  const m=txt.match(/^(#{1,2}|[-*]|>|1\.|\[ ?\])\s$/);
  if(!m) return;
  const trig=m[1];
  /* Wpisany znacznik znika — od tej chwili blok wygląda jak przed pisaniem. */
  try{ const del=document.createRange(); del.setStart(block,0); del.setEnd(r.startContainer, r.startOffset); del.deleteContents(); }
  catch(e){ return; }
  let nowy=null;
  if(trig==="#")            nowy = zamienBlok(block, "h2", ce);
  else if(trig==="##")      nowy = zamienBlok(block, "h3", ce);
  else if(trig===">")       nowy = zamienBlok(block, "blockquote", ce);
  else if(trig==="-"||trig==="*") nowy = zamienNaListe(block, "ul", "", ce);
  else if(trig==="1.")      nowy = zamienNaListe(block, "ol", "", ce);
  else if(trig[0]==="[")    nowy = zamienNaListe(block, "ul", "tasklist", ce);
  if(!nowy) return;
  kursorNaPoczatkuBloku(nowy, ce);
  commitLiveEdit(ce);
  const bar = ce.parentElement && ce.parentElement.querySelector(".editbar");
  if(bar && typeof updateEditbarState==="function") updateEditbarState(bar);
}
document.addEventListener("input", e=>{ const ce=e.target && e.target.closest && e.target.closest('.ncontent[contenteditable="true"]'); if(ce) autoformat(ce); });
// odhaczanie list zadań (odnośniki do wersetów są zwykłymi <a target="_blank"> — otwierają się natywnie, iOS przekieruje do JW Library)
document.addEventListener("click", e=>{
  const li=e.target && e.target.closest ? e.target.closest(".ncontent ul.tasklist li") : null;
  if(li){ const r=li.getBoundingClientRect(); if(e.clientX-r.left<=30){ li.classList.toggle("done"); const ce=li.closest(".ncontent"); if(ce) commitLiveEdit(ce); e.preventDefault(); return; } }
});
