/* ==========================================================================
   JW Study — theme.js
   Motyw dzień/noc i rozmiar czcionki
   ========================================================================== */
"use strict";
/* ================= MOTYW: DZIEŃ / NOC / SYSTEM ================= */
let themeMode = lsGet(KP+"Theme", "auto") || "auto";
const mqDark = matchMedia("(prefers-color-scheme: dark)");
function applyTheme(){
  const resolved = themeMode==="auto" ? (mqDark.matches ? "dark" : "light") : themeMode;
  document.documentElement.dataset.theme = resolved;
  const ic = {light:ICO.sun, sepia:ICO.droplet, dark:ICO.moon, auto:ICO.monitor};
  $("btnTheme").innerHTML = ic[themeMode]||ICO.monitor;
  const nm = {light:"dzień", sepia:"sepia", dark:"noc", auto:"jak w systemie"};
  $("btnTheme").title = "Motyw: " + (nm[themeMode]||"system") + " (kliknij, aby zmienić)";
}
function setTheme(mode){ themeMode=mode; lsSet(KP+"Theme", themeMode); applyTheme(); }
try{ mqDark.addEventListener("change", ()=>{ if(themeMode==="auto") applyTheme(); }); }catch(e){}
/* ——— MENU JASNOŚCI, ZAMIAST PRZEŁĄCZANIA W CIEMNO ———

   Przycisk w pasku przełączał po kolei: dzień → sepia → noc → jak w systemie.
   Cztery stany na jednym przycisku znaczą, że żeby wybrać noc, trzeba nacisnąć
   od jednego do trzech razy — i za każdym razem najpierw ZOBACZYĆ efekt, którego
   się nie chciało. Sama lista możliwości nigdzie nie była widoczna: kto nie
   wyklikał wszystkich czterech, nie wiedział, że sepia istnieje.

   Teraz przycisk otwiera listę czterech podpisanych możliwości z zaznaczoną
   bieżącą. Jedno dotknięcie wybiera wprost tę, o którą chodzi. Ikona przycisku
   nadal pokazuje stan, więc pasek nie stracił informacji. */
const MOTYWY = [
  ["light", "Dzień",         "sun"],
  ["sepia", "Sepia",         "droplet"],
  ["dark",  "Noc",           "moon"],
  ["auto",  "Jak w systemie","monitor"]
];
function otworzMenuMotywu(przycisk){
  const m = $("motywMenu"); if(!m) return;
  m.innerHTML = '<div class="cm-title">Jasność ekranu</div>' +
    MOTYWY.map(([v, nazwa, ik])=>
      '<button type="button" class="mm-opt' + (themeMode===v ? ' on' : '') + '" data-motyw="' + v + '">' +
        '<span class="mm-ik">' + (ICO[ik]||"") + '</span>' +
        '<span class="mm-nm">' + nazwa + '</span>' +
      '</button>').join("") +
    '<div class="cm-note">Jasność i kolor działają razem: kolor interfejsu ' +
    'ustawia paleta obok, gotowe kompozycje — Ustawienia.</div>';
  m.style.display = "block";
  /* Położenie liczone tak samo jak przy palecie: pod przyciskiem, ale nigdy
     poza widocznym obszarem — na telefonie z klawiaturą albo w oknie dzielonym
     „pod przyciskiem" może być już za krawędzią ekranu. */
  const r = przycisk.getBoundingClientRect();
  const w = m.offsetWidth || 260, h = m.offsetHeight || 240;
  const ob = (typeof widocznyObszar==="function") ? widocznyObszar()
           : {lewo:0, gora:0, prawo:innerWidth, dol:innerHeight};
  m.style.left = Math.max(ob.lewo+8, Math.min(r.right-w, ob.prawo-w-8)) + "px";
  m.style.top  = Math.max(ob.gora+8, Math.min(r.bottom+6, ob.dol-h-8)) + "px";
  const wybrany = m.querySelector(".mm-opt.on") || m.querySelector(".mm-opt");
  if(wybrany) wybrany.focus();
}
$("btnTheme").onclick = ()=>{
  const m = $("motywMenu");
  if(m && m.style.display === "block"){ m.style.display = "none"; return; }
  otworzMenuMotywu($("btnTheme"));
};
$("motywMenu").addEventListener("click", e=>{
  const b = e.target.closest(".mm-opt"); if(!b) return;
  setTheme(b.dataset.motyw);
  $("motywMenu").style.display = "none";
  const nm = {light:"dzień", sepia:"sepia", dark:"noc", auto:"jak w systemie"};
  toast("Jasność: " + nm[themeMode]);
});
/* Strzałkami po liście, Escape zamyka — okienko z czterema wyborami bez obsługi
   klawiatury byłoby jedynym takim w tej aplikacji. */
$("motywMenu").addEventListener("keydown", e=>{
  const opcje = [...$("motywMenu").querySelectorAll(".mm-opt")];
  const i = opcje.indexOf(document.activeElement);
  if(e.key === "Escape"){ e.stopPropagation(); $("motywMenu").style.display="none"; $("btnTheme").focus(); return; }
  if(e.key === "ArrowDown" || e.key === "ArrowUp"){
    e.preventDefault();
    const j = i < 0 ? 0 : (i + (e.key==="ArrowDown" ? 1 : -1) + opcje.length) % opcje.length;
    opcje[j].focus();
  }
});
applyTheme();
/* ustawienia czytania: interlinia + czcionka */
const LHS=[1.45,1.72,2.05];
const RFONTS={sans:"inherit", serif:"Georgia, 'Times New Roman', 'Noto Serif', serif"};
let lineH=1, readFont="sans";
try{ lineH=Math.min(2,Math.max(0,+(localStorage.getItem(KP+"LineH")))); if(isNaN(lineH))lineH=1; }catch(e){ lineH=1; }
try{ readFont = (localStorage.getItem(KP+"ReadFont")==="serif")?"serif":"sans"; }catch(e){}
function applyReading(){ const r=document.documentElement.style; r.setProperty("--noteLh", LHS[lineH]); r.setProperty("--readFont", RFONTS[readFont]); }
applyReading();
/* rozmiar czcionki TYLKO w otwartej notatce (niezależny od reszty aplikacji) */
let fsNoteFs = 0; // 0 = domyślny (jak w kolumnie); >0 = własny rozmiar czytania
try{ const v=+(localStorage.getItem(KP+"FsFont")); if(v>=12 && v<=34) fsNoteFs=v; }catch(e){}
function applyFsFont(){ const r=document.documentElement.style; if(fsNoteFs) r.setProperty("--fsNoteFs", fsNoteFs+"px"); else r.removeProperty("--fsNoteFs"); }
applyFsFont();
/* Paleta w pasku górnym otwiera same kolory kolumn i belek notatek.
   Gotowe kompozycje na cały interfejs mieszkają w Ustawieniach. */
$("btnColors").onclick = e => openColorMenu({target:$("btnColors")});
$("colorMenu").addEventListener("click", e=>{
  const swEl=e.target.closest(".cm-sw"); const row=e.target.closest("[data-target]");
  if(!swEl||!row) return;
  const cfg=loadColorCfg();
  if(swEl.dataset.pc) cfg[row.dataset.target]=swEl.dataset.pc; else delete cfg[row.dataset.target];
  lsSet(KP+"Colors", JSON.stringify(cfg));
  applyColors();
  row.querySelectorAll(".cm-sw").forEach(s=>s.classList.remove("sel"));
  swEl.classList.add("sel");
});
/* Zamykanie przy dotknięciu obok — wspólne dla wszystkich okienek, w 45-zamykanie.js */
applyColors();

/* ================= ROZMIAR CZCIONKI ================= */
let noteFs = 14;
/* Osobny rozmiar list jest niezależny od treści notatki. Starsze ustawienie
   „Font” pozostaje rozmiarem treści, aby nikomu nie zmienić wyglądu po aktualizacji. */
let listFs = 13.5;
let uiScale = 1;
/* Zakres regulacji: od 6 px (bardzo dużo treści na ekranie) do 30 px (duży druk). */
const FS_MIN = 6, FS_MAX = 30, FS_BAZA = 14;
/**
 * Ustawia rozmiar pisma notatek i list. Interfejs ma własną skalę: duży tekst
 * do czytania nie może jednocześnie rozpychać przycisków, menu i nagłówków.
 */
function applyFs(){
  const r = document.documentElement.style;
  r.setProperty("--noteFs", noteFs+"px");
  r.setProperty("--colFs", listFs+"px");
  /* Centrum jest miejscem czytania, więc A−/A+ nie może omijać jego kart.
     Skala wynika z tego samego rozmiaru co treść notatek, z bezpiecznym limitem. */
  r.setProperty("--cenScale", Math.min(1.65,Math.max(.75,noteFs/FS_BAZA)).toFixed(3));
  const ui = uiScale;
  r.setProperty("--ui", ui);
  r.setProperty("--uiFs", (13 * ui).toFixed(2)+"px");
  /* Nazwa musi być inna niż data-fs używane przez przyciski A−/A+ w panelu ustawień —
     inaczej wyszukiwanie najbliższego przodka z tym atrybutem dochodzi aż do <html>
     i każde kliknięcie w panelu jest brane za zmianę czcionki. */
  document.documentElement.dataset.fsband = noteFs <= 9 ? "male" : (noteFs >= 22 ? "duze" : "srednie");
}
try{ noteFs = Math.min(FS_MAX, Math.max(FS_MIN, +(lsGet(KP+"Font", FS_BAZA)||FS_BAZA) )); }catch(e){}
try{ listFs = Math.min(FS_MAX, Math.max(FS_MIN, +(lsGet(KP+"ListFont", noteFs-0.5)||noteFs-0.5) )); }catch(e){}
try{ uiScale = Math.min(1.25,Math.max(.85,+(lsGet(KP+"UiScale","1")||1))); }catch(e){}
applyFs();
/* szerokość czytania (marginesy) w otwartej notatce: wąski / komfort / pełny */
const FSW = ["620px","760px","100%"];
/* Odczyt przez lsGet z wartością domyślną, a NIE przez localStorage.getItem.
   Przy pustej pamięci getItem oddaje null, +null to 0, a 0 nie jest NaN — więc
   zabezpieczenie „if(isNaN)" nigdy się nie odpalało i każdy nowy użytkownik
   dostawał „wąski" (620 px). Sprawdzamy też kształt zapisu, żeby śmieć
   w pamięci nie przechodził jako numer wyboru.

   DOMYŚLNIE „PEŁNY" (v2.74). Do 2.73 domyślny był „komfort" — 760 px tekstu
   wyśrodkowane w oknie. Na iPadzie w PIONIE (820 px) wygląda to jak pełny
   ekran i o to chodziło. Ale w POZIOMIE (1180 px) zostawia po 210 px pustki
   z każdej strony, i to samo dotyczy pisania: notatka otwarta „na cały ekran"
   zajmowała dwie trzecie ekranu. Tryb pełnoekranowy ma być pełnoekranowy.

   Klucz ma NOWY NUMER (`FsW2`). Stary zapis pochodzi sprzed tej decyzji —
   gdyby czytać dalej `FsW`, zapisane kiedyś „komfort" trzymałoby stary wygląd
   mimo zmiany domyślnej, czyli zmiana nie zadziałałaby u nikogo, kto choć raz
   dotknął tego ustawienia. Wybór dokonany od 2.74 zapisuje się normalnie
   i zostaje. */
let fsWidth = 2;
try{
  const zapisFsW = String(lsGet(KP+"FsW2", "2")).trim();
  fsWidth = /^[012]$/.test(zapisFsW) ? +zapisFsW : 2;
}catch(e){ fsWidth = 2; }
function applyFsWidth(){ document.documentElement.style.setProperty("--fsMax", FSW[fsWidth]||"100%"); }
applyFsWidth();
function ustawRozmiarTresci(roznica){
  noteFs = Math.min(FS_MAX, Math.max(FS_MIN, noteFs + roznica));
  lsSetSoon(KP+"Font", noteFs); applyFs();
}
function ustawRozmiarList(roznica){
  listFs = Math.min(FS_MAX, Math.max(FS_MIN, listFs + roznica));
  lsSetSoon(KP+"ListFont", listFs); applyFs();
}
function ustawSkaleInterfejsu(roznica){
  uiScale=Math.min(1.25,Math.max(.85,Math.round((uiScale+roznica)*20)/20));
  lsSetSoon(KP+"UiScale",uiScale); applyFs();
}
$("fMinus").onclick = ()=>{ ustawRozmiarTresci(-1); toast("Treść notatek: "+noteFs+" px"); };
$("fPlus").onclick = ()=>{ ustawRozmiarTresci(1); toast("Treść notatek: "+noteFs+" px"); };

/* Tryb skupienia nie zmienia układu na stałe: jednym wyborem ukrywa boczne
   kolumny, a drugim przywraca dokładnie ich wcześniejszy stan i szerokości. */
let focusMode = String(lsGet(KP+"FocusMode", "0")) === "1";
function applyFocusMode(){ document.body.classList.toggle("focus-mode", focusMode); }
function setFocusMode(on){
  focusMode = !!on;
  lsSet(KP+"FocusMode", focusMode ? "1" : "0");
  applyFocusMode();
}
applyFocusMode();
$("btnBackup").onclick = ()=>{ exportJson(); };   // sama zdecyduje: nadpisać wskazany plik czy pobrać nowy
/* filtry zmieniają się przy każdym kliknięciu kolumny — zapis sklejamy w jeden */
function persistFilt(){ lsSetSoon(KP+"Filt", JSON.stringify(filt), 300); }
