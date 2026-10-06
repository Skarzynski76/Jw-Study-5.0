/* ==========================================================================
   JW Study — core.js
   Stałe, stan aplikacji, skrót $
   ========================================================================== */
"use strict";
const APP_VERSION = "5.0";
const BOOKS = ["","Rodzaju","Wyjścia","Kapłańska","Liczb","Powtórzonego Prawa","Jozuego","Sędziów","Rut","1 Samuela","2 Samuela","1 Królów","2 Królów","1 Kronik","2 Kronik","Ezdrasza","Nehemiasza","Estery","Hioba","Psalmy","Przysłów","Kaznodziei","Pieśń nad Pieśniami","Izajasza","Jeremiasza","Lamentacje","Ezechiela","Daniela","Ozeasza","Joela","Amosa","Abdiasza","Jonasza","Micheasza","Nahuma","Habakuka","Sofoniasza","Aggeusza","Zachariasza","Malachiasza","Mateusza","Marka","Łukasza","Jana","Dzieje Apostolskie","Rzymian","1 Koryntian","2 Koryntian","Galatów","Efezjan","Filipian","Kolosan","1 Tesaloniczan","2 Tesaloniczan","1 Tymoteusza","2 Tymoteusza","Tytusa","Filemona","Hebrajczyków","Jakuba","1 Piotra","2 Piotra","1 Jana","2 Jana","3 Jana","Judy","Objawienie"];

const DBNAME = "jwStudyClean";   // nazwa pamięci tej kopii aplikacji
const KP = "jws";               // prefiks ustawień
let notes = [], tags = [], deletedGuids = [];
let filt = {tag:"all", book:"all", ch:null, pub:"all"};
let query = "", sortMode = "new";
/* Pierwsza porcja mieści kilka ekranów, ale nie tworzy od razu sześćdziesięciu
   rozbudowanych kart. Pozostałe dochodzą automatycznie przy przewijaniu. */
let visibleCount = 36;
let expandedBook = null;
let idb = null;

/* kolory pasków sekcji */
var SECCOLORS = ["#cfe3d6","#cfdcea","#dcd4ea","#f0dcc6","#eed6dd","#cfe4e2","#e6e2c6","#dcdfe4","#ecd4d4"];
/* pastele etykiet */
var TAGCOLORS = ["#e8c86a","#dcb08a","#e0a89a","#c9b6d8","#a9c4e4","#9fd0c7","#b6d9a8","#efb7c4","#c2c8d0"];
/* pastelowe kompozycje: jeden zgrany odcień na całą kompozycję kolumn i belek */
var PASTELS = [["Lawenda","#b9a9d6"],["Mięta","#9ed3c2"],["Brzoskwinia","#e8b894"],["Błękit","#a6c3e0"],["Róż","#e2adc0"],["Piasek","#dccfae"],["Szałwia","#b7c9a8"],["Grafit","#b9bec6"]];
window.SECCOLORS = SECCOLORS;
window.TAGCOLORS = TAGCOLORS;
window.PASTELS = PASTELS;

/**
 * Fabryka nowego obiektu notatki.
 * @param {Object} [opts] opcjonalne początkowe pola
 * @returns {Object} kompletny obiekt notatki
 */
function createNote(opts){
  opts = opts || {};
  const now = new Date().toISOString();
  return {
    g: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID().toUpperCase() : ("N" + Date.now() + "_" + Math.random().toString(36).slice(2, 7)),
    t: opts.t || "",
    c: opts.c || "",
    h: opts.h || (opts.c ? (typeof esc === "function" ? esc(opts.c).replace(/\r?\n/g,"<br>") : opts.c) : ""),
    b: Number(opts.b) || 0,
    ch: (opts.ch !== undefined && opts.ch !== null) ? Number(opts.ch) : null,
    v: (opts.v !== undefined && opts.v !== null) ? Number(opts.v) : null,
    pub: opts.pub || "",
    ks: opts.ks || "",
    doc: 0,
    itn: 0,
    col: 0,
    cr: now,
    mo: now,
    tg: Array.isArray(opts.tg) ? opts.tg : [],
    nw: true,
    tgd: true,
    ...(opts.stb ? { stb: opts.stb } : {})
  };
}
window.createNote = createNote;
/**
 * Skrót do document.getElementById — najczęściej używana operacja w całym kodzie.
 * @param {string} id  identyfikator elementu
 * @returns {HTMLElement|null}
 */
const $ = id => document.getElementById(id);

/**
 * Kolejny wolny numer w liście rekordów — zawsze o jeden większy od największego.
 *
 * Wygląda na pracę dla Math.max(0, ...lista.map(…)) i tak było napisane
 * w sześciu miejscach. Rozsypywanie tablicy na argumenty ma jednak twardy
 * kres: przy około stu tysiącach elementów przeglądarka przerywa wywołanie
 * przepełnieniem stosu. Notatki i etykiety mają limity przy wczytywaniu kopii,
 * ale zakładki i szablony nie miały — spreparowany plik wywracał wtedy import.
 * Pętla nie ma kresu i kosztuje tyle samo.
 *
 * @param {Array} lista
 * @param {string} [pole="id"]
 * @returns {number}
 */
function nastepnyNumer(lista, pole){
  const p = pole || "id";
  let max = 0;
  for(const x of (lista||[])){ const v = Number(x && x[p]); if(isFinite(v) && v > max) max = v; }
  return max + 1;
}

/* ——— zapis do localStorage bez zbędnych operacji ———
   Przeglądarka zapisuje localStorage synchronicznie na dysk, więc każdy zapis blokuje wątek.
   lsSet pomija zapis, gdy wartość się nie zmieniła; lsSetSoon dodatkowo skleja serie zmian
   (np. przeciąganie suwaka albo szybkie klikanie filtrów) w jeden zapis. */
const _lsLast = new Map();
/**
 * Zapisuje ustawienie w localStorage, ale tylko gdy wartość faktycznie się zmieniła.
 * Przeglądarka zapisuje localStorage synchronicznie na dysk, więc każdy zbędny zapis
 * blokuje wątek interfejsu.
 * @param {string} key   pełny klucz (zwykle KP + nazwa)
 * @param {*} val        wartość; zawsze zapisywana jako tekst
 * @returns {boolean}    true = zapis wykonany, false = pominięty albo niemożliwy
 */
function lsSet(key, val){
  const v = String(val);
  if(_lsLast.get(key) === v) return false;      // nic się nie zmieniło — nie ruszamy dysku
  try{ localStorage.setItem(key, v); _lsLast.set(key, v); return true; }
  catch(e){ return false; }
}
/* Odczyt idzie zawsze do prawdziwego localStorage. Wcześniej lsGet oddawał wartość
   z pamięci podręcznej zapisów, więc zmiana dokonana poza lsSet (inna karta przeglądarki,
   ręczna edycja w narzędziach deweloperskich) była niewidoczna aż do przeładowania strony.
   Odczyt jest tani — kosztowny jest zapis i to jego pilnujemy. */
function lsGet(key, def){
  let v = null;
  try{ v = localStorage.getItem(key); }catch(e){ return def; }
  if(v !== null) _lsLast.set(key, v);       // odświeżamy wiedzę o tym, co naprawdę leży w pamięci
  return v === null ? def : v;
}
/* Gdy zapisu dokona inna karta tej samej aplikacji, nasza wiedza o stanie jest nieaktualna. */
addEventListener("storage", e=>{
  if(e.key === null) _lsLast.clear();
  else _lsLast.delete(e.key);
});
const _lsTimers = new Map();
const _lsPending = new Map();
/**
 * Zapis odroczony — kolejne wywołania dla tego samego klucza sklejają się w jeden zapis.
 * Używane tam, gdzie wartość zmienia się seriami: filtry, rozmiar czcionki, pozycja czytania.
 * Kolejka jest opróżniana przy chowaniu karty (lsFlush), więc nic nie ginie.
 * @param {string} key
 * @param {*} val
 * @param {number} [delay=250]  opóźnienie w milisekundach
 */
function lsSetSoon(key, val, delay){
  _lsPending.set(key, val);
  clearTimeout(_lsTimers.get(key));
  _lsTimers.set(key, setTimeout(()=>{ _lsTimers.delete(key); _lsPending.delete(key); lsSet(key, val); }, delay||250));
}
/* dopisuje wszystko, co czeka w kolejce — wołane przy chowaniu/zamykaniu karty,
   żeby odroczenie zapisu nigdy nie oznaczało utraty ustawienia */
function lsFlush(){
  _lsTimers.forEach(t=>clearTimeout(t));
  _lsTimers.clear();
  _lsPending.forEach((v,k)=>lsSet(k,v));
  _lsPending.clear();
}
addEventListener("pagehide", lsFlush);
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="hidden") lsFlush(); });

/* ——— ROZKŁADANIE CUDZEGO HTML-a NA DRZEWO ———

   Żeby przejrzeć obcy HTML, trzeba go najpierw rozłożyć. Naturalny odruch to
   `document.createElement("div").innerHTML = html` — element wisi poza stroną,
   więc wygląda niegroźnie. NIE JEST NIEGROŹNY.

   Przeglądarka nie czeka z pracą na wstawienie elementu do strony: już przy
   samym przypisaniu innerHTML zaczyna pobierać zasoby i uruchamia procedury
   zdarzeń. Sprawdzone w Chromium — kod z tych trzech zapisów wykonał się, choć
   element nigdy nie trafił do dokumentu:

       obrazek z nieistniejącym adresem i procedurą onerror
       znacznik source w video, też z procedurą onerror
       details z atrybutem open i procedurą ontoggle

   (Zapisane słowami z rozmysłem. Wpisane wprost, z cudzysłowem, wyglądają jak
   atrybut z kodem w treści strony — a wersja jednoplikowa wkleja ten komentarz
   do index.html i kontrola „atrybuty z kodem" słusznie by się o nie potknęła.)

   Sito sanitize() jest zbudowane na białej liście i jego WYNIK był czysty —
   ale obcy kod wykonywał się w drodze, zanim sito zdążyło cokolwiek przepisać.
   Treść notatki z cudzej kopii JSON idzie właśnie przez sanitize(), więc
   wystarczyło wczytać kopię „od znajomego". Polityka bezpieczeństwa treści tu
   nie pomaga: script-src ma 'unsafe-inline' (potrzebne wersji jednoplikowej),
   a to obejmuje procedury w atrybutach.

   DOMParser buduje dokument BEZWŁADNY: bez okna, bez pobierania zasobów, bez
   procedur zdarzeń. Węzły są normalnie widoczne dla sita, żaden się nie budzi.

   Każde miejsce, w którym rozkładamy HTML z zewnątrz, ma używać tej funkcji.
   Pilnuje tego testy/audyt.js.

   @param {string} html
   @returns {HTMLElement} ciało bezwładnego dokumentu z gotowym drzewem */
function parsujBezwladnie(html){
  return new DOMParser().parseFromString("<body>" + (html==null ? "" : html), "text/html").body;
}

/* ——— drobne pomocniki oszczędzające pracę przeglądarki ———
   Ustawienie tej samej wartości i tak unieważnia układ strony, więc najpierw sprawdzamy,
   czy cokolwiek się zmieniło. */
function setText(el, txt){ if(el && el.textContent !== txt) el.textContent = txt; }
/**
 * Podmienia zawartość HTML tylko przy faktycznej zmianie.
 * @returns {boolean} true = podmieniono (czyli trzeba na nowo podpiąć zdarzenia)
 */
function setHtml(el, html){ if(el && el.innerHTML !== html){ el.innerHTML = html; return true; } return false; }
