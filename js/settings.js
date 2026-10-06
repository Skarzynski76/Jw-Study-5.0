/* ==========================================================================
   JW Study — settings.js
   Panel ustawień: czcionka, gęstość interfejsu, animMode, wygląd, skróty
   ========================================================================== */
"use strict";

/* Gęstość interfejsu skaluje odstępy w kartach i listach jedną zmienną CSS,
   więc nie trzeba dublować reguł dla każdego trybu. */
const DENSITIES = { zwarta:0.78, normalna:1, luzna:1.22 };
let density = "normalna";
let animMode = "on";          // on | ograniczone | off

/**
 * Przekłada wybraną gęstość na zmienną CSS --dens, którą skalowane są odstępy
 * w kartach i listach. Wartość 1 = układ domyślny.
 */
function applyDensity(){
  document.documentElement.dataset.density = density;
  document.documentElement.style.setProperty("--dens", DENSITIES[density] || 1);
}
function setDensity(v){ density = v; lsSet(KP+"Dens", v); applyDensity(); }

function applyAnim(){ document.documentElement.dataset.anim = animMode; }
/**
 * Ustawia tryb animacji (pełne / ograniczone / wyłączone) jako atrybut data-anim
 * na elemencie html; resztą zajmuje się arkusz stylów.
 * @param {"on"|"ograniczone"|"off"} v
 */
function setAnim(v){ animMode = v; lsSet(KP+"Anim", v); applyAnim(); }

/* wczytanie zapamiętanych ustawień */
density = lsGet(KP+"Dens", "normalna");
if(!DENSITIES[density]) density = "normalna";
animMode = lsGet(KP+"Anim", "on");
if(["on","ograniczone","off"].indexOf(animMode) < 0) animMode = "on";
applyDensity(); applyAnim();

/* ——— okno ustawień ——— */
function optionGroup(group, options, current){
  return `<div class="st-row" data-grp="${group}">` +
    options.map(([v,label])=>`<button class="st-opt${v===current?" on":""}" data-v="${v}">${esc(label)}</button>`).join("") +
    `</div>`;
}

/**
 * Buduje i otwiera okno ustawień. Każda zmiana zapisuje się od razu — nie ma
 * przycisku „Zastosuj", bo efekt widać natychmiast.
 */
/**
 * Kafelki gotowych kompozycji. Bieżąca jest odhaczona, więc widać, co jest włączone.
 * Kolory poszczególnych kolumn celowo NIE są tutaj — mieszkają pod ikoną palety
 * i nie powinny być w dwóch miejscach naraz.
 */
function kompozycjeHtml(){
  const teraz = typeof biezacaKompozycja==="function" ? biezacaKompozycja() : "";
  const lista = (typeof PASTELS !== "undefined" && Array.isArray(PASTELS)) ? PASTELS : (window.PASTELS || []);
  return lista.map(([nm,c])=>{
    const wybrana = teraz===c;
    const tlo = (typeof shade === "function" && typeof desat === "function") ? shade(desat(c,.18), -.42) : c;
    const txtKol = typeof czytelnyTekst === "function" ? czytelnyTekst(tlo) : "#ffffff";
    return `<button class="st-kafel${wybrana?" on":""}" data-komp="${c}" `+
           `style="background:${tlo};color:${txtKol}">${esc(nm)}`+
           (wybrana?'<span class="st-ptak">✓</span>':"")+`</button>`;
  }).join("") +
  `<button class="st-kafel st-kafel-domyslny${teraz?"":" on"}" data-komp="reset">Domyślna`+
  (teraz?"":'<span class="st-ptak">✓</span>')+`</button>`;
}

/* ——— USTAWIENIA W TRZECH KARTACH, NIE W JEDNYM ZWOJU ———

   Okno miało dwanaście działów jeden pod drugim. Zmierzona wysokość treści:
   1908 px na komputerze i 2091 px na telefonie, przy oknie wysokim odpowiednio
   na 792 i 563 px. Czyli od dwóch i pół do prawie czterech ekranów przewijania
   w linii prostej, bez żadnego drogowskazu — a przycisk „Gotowe" leżał na samym
   DOLE tej trasy, więc zamknięcie okna wymagało przewinięcia go do końca albo
   trafienia w tło.

   Trzy karty dzielą to na porcje, których nie trzeba przewijać w nieskończoność,
   i — co ważniejsze — mówią, CO W OGÓLE JEST w ustawieniach. Podział idzie za
   pytaniem użytkownika, nie za kolejnością dopisywania działów:

     Wygląd          — jak to wygląda i ile się mieści na ekranie
     Notatki i dane  — co się dzieje z treścią: porządki, kopia, import
     Pomoc           — skróty, dziennik błędów, wersja

   Dwa działy zmieniły miejsce. „Oszczędzanie miejsca u góry" i „Dziennik
   błędów" siedziały wewnątrz działu „Skróty klawiszowe" — nie z zamysłu, tylko
   dlatego, że ktoś dopisał je na końcu istniejącego bloku. Ustawienie paska nie
   ma nic wspólnego ze skrótami; dziennik błędów tym bardziej.

   Nagłówek z kartami i stopka z „Gotowe" są przyklejone (patrz arkusz stylów),
   więc wyjście z okna jest widoczne zawsze, na każdej wysokości przewinięcia. */
const ST_KARTY = [
  ["wyglad",  "Wygląd"],
  ["dane",    "Notatki i dane"],
  ["pomoc",   "Pomoc"]
];
let stKarta = lsGet(KP+"Karta", "wyglad");
if(!ST_KARTY.some(k=>k[0]===stKarta)) stKarta = "wyglad";

/** Przełącza widoczną kartę ustawień i zapamiętuje wybór na następne otwarcie. */
function pokazKarteUstawien(id){
  if(!ST_KARTY.some(k=>k[0]===id)) id = "wyglad";
  stKarta = id;
  lsSet(KP+"Karta", id);
  document.querySelectorAll("#setBody .st-karta").forEach(k=>
    k.classList.toggle("on", k.dataset.karta === id));
  document.querySelectorAll("#modalSettings .st-zak").forEach(b=>{
    const on = b.dataset.karta === id;
    b.classList.toggle("on", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
    b.tabIndex = on ? 0 : -1;      // wzorzec zakładek: Tab wchodzi w rząd raz
  });
  /* Przewinięcie na górę przy zmianie karty. Bez tego druga karta otwiera się
     w połowie, bo okno pamięta przewinięcie z pierwszej. */
  const okno = $("modalSettings").querySelector(".modal");
  if(okno) okno.scrollTop = 0;
}

/** Rząd zakładek. Rysowany w nagłówku okna, żeby przyklejał się razem z nim. */
function rysujZakladkiUstawien(){
  const head = $("modalSettings").querySelector(".nn-head");
  if(!head) return;
  let rzad = head.querySelector(".st-zakladki");
  if(!rzad){
    rzad = document.createElement("div");
    rzad.className = "st-zakladki";
    rzad.setAttribute("role", "tablist");
    head.appendChild(rzad);
    rzad.addEventListener("click", e=>{
      const b = e.target.closest(".st-zak"); if(!b) return;
      pokazKarteUstawien(b.dataset.karta);
    });
    /* Strzałki w prawo i w lewo po zakładkach — tak działają zakładki wszędzie,
       a bez tego z klawiatury trzeba było przechodzić przez całą zawartość karty,
       żeby dojść do następnej. */
    rzad.addEventListener("keydown", e=>{
      if(e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const i = ST_KARTY.findIndex(k=>k[0]===stKarta);
      const j = (i + (e.key==="ArrowRight" ? 1 : -1) + ST_KARTY.length) % ST_KARTY.length;
      pokazKarteUstawien(ST_KARTY[j][0]);
      const cel = rzad.querySelector('.st-zak[data-karta="'+ST_KARTY[j][0]+'"]');
      if(cel) cel.focus();
    });
  }
  rzad.innerHTML = ST_KARTY.map(([id, nazwa])=>
    '<button type="button" class="st-zak" role="tab" data-karta="'+id+'">'+esc(nazwa)+'</button>').join("");
}

/** Podsumowanie miejsca zajmowanego przez historię wersji. */
async function pokazMiejsceWersji(){
  const el = $("stWersje"); if(!el) return;
  if(typeof wersjeMiejsce !== "function"){ el.textContent = "—"; return; }
  const m = await wersjeMiejsce();
  if(!m.wersji){ el.textContent = "Brak zapisanych wersji"; return; }
  /* Znaki, nie bajty: treść jest tekstem, a liczba znaków jest tu uczciwsza niż
     przeliczanie na kilobajty przy nieznanym kodowaniu. Przybliżenie w nawiasie
     wystarcza do odpowiedzi „czy to dużo". */
  const kb = m.znakow / 1024;
  const ile = kb < 1 ? "mniej niż 1 kB"
            : kb < 1024 ? Math.round(kb) + " kB"
            : (kb / 1024).toFixed(1) + " MB";
  el.textContent = m.wersji + (m.wersji === 1 ? " wersja" : " wersji")
    + " w " + m.notatek + (m.notatek === 1 ? " notatce" : " notatkach")
    + " · około " + ile;
}

/* ——— LISTA SKRÓTÓW EDYCJI ———
   Budowana z tej samej tablicy, którą obsługuje edytor (SKROTY_EDYCJI
   w 13-editor.js). Dwa osobne spisy — jeden do działania, drugi do pokazania —
   rozjeżdżają się przy pierwszym dopisanym skrócie.

   Znak klawisza polecenia zależy od urządzenia: na Macu i iPadzie ⌘, wszędzie
   indziej Ctrl. Obsługa rozpoznaje jedno i drugie, ale POKAZAĆ trzeba to, co
   użytkownik ma naprawdę na klawiaturze — inaczej lista uczy nieswojego. */
function znakPolecenia(){
  const p = (navigator.userAgentData && navigator.userAgentData.platform)
         || navigator.platform || navigator.userAgent || "";
  return /Mac|iPhone|iPad|iPod/i.test(p) ? {mod:"\u2318", alt:"\u2325"} : {mod:"Ctrl", alt:"Alt"};
}
function skrotyEdycjiHtml(){
  if(typeof SKROTY_EDYCJI === "undefined") return "";
  const z = znakPolecenia();
  const nazwaKlawisza = (x)=>{
    if(!x.kod) return (x.kl || "").toUpperCase();
    if(x.kod === "Backslash") return "\\";
    return x.kod.replace("Digit", "");
  };
  return SKROTY_EDYCJI.map(x=>{
    const klawisze = [z.mod]
      .concat(x.shift ? ["Shift"] : [])
      .concat(x.alt ? [z.alt] : [])
      .concat([nazwaKlawisza(x)]);
    return "<div>" + klawisze.map(k=>"<kbd>" + esc(k) + "</kbd>").join("+")
      + "<span>" + esc(x.nazwa) + "</span></div>";
  }).join("");
}

function openSettings(){
  const box = $("setBody");
  box.innerHTML =
    `<div class="st-karta" data-karta="wyglad">
     <div class="st-sec">
       <div class="st-lbl">Wielkość tekstu w notatkach</div>
       <div class="st-fs" data-font="note">
         <button class="st-opt" data-fs="-">A−</button>
         <span class="st-val" id="stFsVal">${noteFs} px</span>
         <button class="st-opt" data-fs="+">A+</button>
       </div>
       <div class="st-hint">Rozmiar treści wewnątrz notatek. Przyciski A− / A+ na górze zmieniają właśnie ten rozmiar.</div>
     </div>
     <div class="st-sec">
       <div class="st-lbl">Wielkość tekstu na listach</div>
       <div class="st-fs" data-font="list">
         <button class="st-opt" data-fs="-">A−</button>
         <span class="st-val" id="stListFsVal">${listFs} px</span>
         <button class="st-opt" data-fs="+">A+</button>
       </div>
       <div class="st-hint">Dotyczy list notatek oraz kolumn Biblia, Etykiety i Publikacje. Oba rozmiary można ustawić niezależnie.</div>
     </div>
     <div class="st-sec">
       <div class="st-lbl">Skala przycisków i menu</div>
       <div class="st-fs" data-font="ui">
         <button class="st-opt" data-fs="-">−</button>
         <span class="st-val" id="stUiVal">${Math.round(uiScale*100)}%</span>
         <button class="st-opt" data-fs="+">＋</button>
       </div>
       <div class="st-hint">Zmienia tylko interfejs. Rozmiar tekstu notatek pozostaje bez zmian.</div>
     </div>
     <div class="st-sec">
       <div class="st-lbl">Gęstość interfejsu</div>
       ${optionGroup("dens", [["zwarta","Zwarta"],["normalna","Normalna"],["luzna","Luźna"]], density)}
       <div class="st-hint">Zwarta mieści więcej notatek na ekranie, luźna daje więcej powietrza.</div>
     </div>
     <div class="st-sec">
       <div class="st-lbl">Jasność ekranu</div>
       ${optionGroup("theme", [["light","Dzień"],["sepia","Sepia"],["dark","Noc"],["auto","Jak w systemie"]], themeMode)}
       <div class="st-hint">To samo, co ikona ekranu w pasku górnym. Jasność i kolor działają razem: jasność tutaj, kolor w kompozycji poniżej.</div>
     </div>
     <div class="st-sec">
       <div class="st-lbl">Gotowa kompozycja</div>
       <div class="st-komp">${kompozycjeHtml()}</div>
       <div class="st-hint">Jeden kolor na <b>cały interfejs</b>: pasek górny, kolumny, belki notatek i podświetlenia. Kolory poszczególnych kolumn osobno ustawisz pod ikoną palety w pasku górnym.</div>
     </div>
     <div class="st-sec">
       <div class="st-lbl">Centrum studium na starcie</div>
       ${optionGroup("centrum", [["1","Pokazuj"],["0","Nie pokazuj"]],
                     (typeof centrWlaczone!=="undefined" && centrWlaczone) ? "1" : "0")}
       <div class="st-hint">Po uruchomieniu kolumna notatek pokazuje podsumowanie. U góry dwie
         duże karty: <b>na czym skończyłeś</b> i <b>co masz dziś powtórzyć</b>. Niżej cztery karty
         z powrotami do notatek — ostatnio studiowane, ostatnio dodane, używane wersety i ulubione
         publikacje. Na dole <b>Twoje studium</b>: cztery liczby i wykres aktywności. Pierwsze
         kliknięcie etykiety, księgi albo szukanie przełącza na zwykłą listę. Do Centrum wracasz
         przyciskiem <b>domku</b> w pasku górnym albo klawiszem <b>H</b>. Nic nie jest tu
         dodatkowo zliczane — wszystko liczy się z danych, które notatki już mają.</div>
     </div>
     <div class="st-sec">
       <div class="st-lbl">Tryb skupienia na iPadzie</div>
       ${optionGroup("focus", [["0","Pełny układ"],["1","Tylko Centrum i notatki"]], focusMode ? "1" : "0")}
       <div class="st-hint">Ukrywa na chwilę kolumny Biblia, Etykiety i Publikacje. Centrum studium oraz lista notatek zajmują całą szerokość. Po powrocie boczne kolumny zachowują swoje ustawienia.</div>
     </div>
     <div class="st-sec">
       <div class="st-lbl">Układ listy notatek</div>
       ${optionGroup("view", [["list","Pełne karty"],["compact","Zwarta lista"]], noteView)}
     </div>
     <div class="st-sec">
       <div class="st-lbl">Oszczędzanie miejsca u góry</div>
       <div class="st-row">
         <select id="stOszczedny" aria-label="Zwarty interfejs">
           <option value="auto">Automatycznie (na małym ekranie)</option>
           <option value="zawsze">Zawsze</option>
           <option value="nigdy">Nigdy</option>
         </select>
       </div>
       <div class="st-hint">Zwarty pasek górny, filtry w jednym przewijanym rzędzie
         i mniejsze przyciski. Na telefonie odzyskuje to blisko jedną trzecią ekranu
         dla samych notatek. Nic nie znika — wszystko działa tak samo, tylko ciaśniej.</div>
     </div>
     <div class="st-sec">
       <div class="st-lbl">Animacje</div>
       ${optionGroup("anim", [["on","Pełne"],["ograniczone","Ograniczone"],["off","Wyłączone"]], animMode)}
       <div class="st-hint">Ograniczone zostawiają samo wygaszanie okien. Wyłączone przydają się na starszych urządzeniach.</div>
     </div>
     </div>

     <div class="st-karta" data-karta="dane">
     <div class="st-sec">
       <div class="st-lbl">Porządki w notatkach</div>
       <button class="st-opt st-wide" data-act="odstepy">Uporządkuj odstępy w treści</button>
       <div class="st-hint">Treść notatki jest wyświetlana z zachowaniem spacji, żeby Twoje własne wcięcia wyglądały tak, jak je wpisałeś. Notatki przeniesione z innego programu niosą jednak wcięcia i podziały wierszy z <b>pliku źródłowego</b> — one też są widoczne, choć nikt ich nie pisał. To narzędzie je usuwa; tekst, listy, tabele i zdjęcia zostają nietknięte.</div>
     </div>
     <div class="st-sec">
       <div class="st-lbl">Synchronizacja między urządzeniami</div>
       <div class="st-ver" id="stSync">sprawdzam…</div>
       <div class="st-row">
         <button class="btn primary" data-act="syncTeraz" type="button">Uzgodnij teraz</button>
         <button class="btn" data-act="syncNazwa" type="button">Nazwa tego urządzenia…</button>
       </div>
       <button class="st-opt st-wide" id="stSyncWskaz" data-act="syncWskaz">Wskaż plik uzgadniania (raz)</button>
       <button class="st-opt st-wide" id="stSyncOff" data-act="syncOff" style="display:none">Przestań uzgadniać automatycznie</button>
       <button class="st-opt st-wide" id="stSyncOdNowa" data-act="syncZapomnij" style="display:none">Zacznij uzgadnianie od nowa</button>
       <div class="st-row" id="stSyncRecznie" style="display:none">
         <button class="btn" data-act="syncWyslij" type="button">Wyślij zmiany</button>
         <button class="btn" data-act="syncWczytaj" type="button">Wczytaj zmiany</button>
       </div>
       <div class="st-hint">Jeden <b>plik uzgadniania</b> w iCloud Drive. Każde urządzenie go czyta,
         scala z tym, co ma u siebie, i zapisuje wynik. Jadą notatki, etykiety, kolory, sekcje,
         zakładki, szablony, kolejność publikacji, powtórki i historia wersji.
         Krok po kroku: <b>⚙️ Plik → Jak to działa</b>.</div>
     </div>
     <div class="st-sec">
       <div class="st-lbl">Kopia zapasowa</div>
       <div class="st-ver" id="stPlikKopii"></div>
       <button class="st-opt st-wide" data-act="plikKopii">Wskaż stały plik kopii</button>
       <button class="st-opt st-wide" id="stPlikKopiiOff" data-act="plikKopiiOff" style="display:none">Przestań używać tego pliku</button>
       <div class="st-hint">Zamiast pobierać co dzień nowy plik, aplikacja może <b>nadpisywać jeden wskazany</b> — na dysku nie przybywa kopii. Wskazujesz go raz. Wymaga przeglądarki Chrome, Edge, Brave lub Arc na komputerze; w Safari pozostaje zwykłe pobieranie.</div>
     </div>
     <div class="st-sec">
       <div class="st-lbl">Historia wersji notatek</div>
       <div class="st-ver" id="stWersje">liczę…</div>
       <button class="st-opt st-wide" data-act="wersjeCzysc">Wyczyść całą historię wersji</button>
       <div class="st-hint">Przy każdym zakończeniu edycji (nie częściej niż raz na pięć minut)
         odkłada się poprzednia treść notatki. Historię otwierasz w edytorze: <b>⋯ → Historia
         wersji…</b> — z listy dat da się wrócić do dawnej treści albo porównać dwie wersje.
         Do <b>50 wersji</b> na notatkę; starsze ścierają się same (z ostatniego tygodnia
         wszystkie, dalej po jednej na dzień, jeszcze dalej po jednej na miesiąc).
         Historia <b>nie wchodzi do kopii zapasowej</b> i <b>nie przechowuje zdjęć</b> — kopia
         ma być przenośna, a jedno zdjęcie waży więcej niż setka wersji tekstu.</div>
     </div>
     <div class="st-sec">
       <div class="st-lbl">Import z JW Library</div>
       <div class="st-ver" id="stLib"></div>
       <div class="st-hint">Odczytanie pliku <b>.jwlibrary</b> wymaga plików <code>jszip.min.js</code>, <code>sql-wasm.js</code> i <code>sql-wasm.wasm</code>. Aplikacja znajdzie je w katalogu <code>lib/</code> albo obok <code>index.html</code>. Nie pobiera bibliotek z obcych serwerów.</div>
     </div>
     </div>

     <div class="st-karta" data-karta="pomoc">
     <div class="st-sec">
       <div class="st-lbl">Skróty klawiszowe</div>
       <div class="st-keys">
         <div><kbd>/</kbd> lub <kbd>Ctrl</kbd>+<kbd>F</kbd><span>szukaj</span></div>
         <div><kbd>N</kbd><span>nowa notatka</span></div>
         <div><kbd>E</kbd><span>edytuj zaznaczoną / otwartą</span></div>
         <div><kbd>F</kbd><span>ulubione</span></div>
         <div><kbd>P</kbd><span>przypnij na górze</span></div>
         <div><kbd>0</kbd><span>wszystkie notatki — zdejmuje szukanie i filtry</span></div>
         <div><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd><span>chowanie kolumn: Biblia / Etykiety / Publikacje</span></div>
         <div><kbd>H</kbd><span>Centrum studium / lista notatek</span></div>
         <div><kbd>M</kbd><span>Mapa tematów</span></div>
         <div><kbd>,</kbd><span>ustawienia</span></div>
         <div><kbd>?</kbd><span>ta lista</span></div>
         <div><kbd>←</kbd> <kbd>→</kbd><span>poprzednia / następna notatka w czytniku</span></div>
         <div><kbd>Alt</kbd>+<kbd>←</kbd> lub <kbd>Backspace</kbd><span>w czytniku: wróć do notatki, z której przyszedłeś</span></div>
         <div><kbd>Esc</kbd><span>zamknij okno lub czytnik</span></div>
       </div>
       <div class="st-lbl" style="margin-top:14px">W trakcie pisania notatki</div>
       <div class="st-keys">${skrotyEdycjiHtml()}</div>
       <div class="st-hint">Skróty działają, gdy nie piszesz w polu tekstowym. Prawy przycisk myszy (albo przytrzymanie palcem) otwiera szybkie akcje.</div>
     </div>
     <div class="st-sec">
       <div class="st-lbl">Dziennik błędów</div>
       <div class="st-row">
         <button class="btn" id="stBledy" type="button">Pokaż ostatnie błędy</button>
         <button class="btn" id="stBledyCzysc" type="button">Wyczyść</button>
       </div>
       <div class="st-hint">Na telefonie nie ma konsoli, więc aplikacja zapisuje tu ostatnie
         dwadzieścia błędów. Przy zgłaszaniu usterki skopiuj je stąd — bez nich zostaje zgadywanie.</div>
     </div>
     <div class="st-sec">
       <div class="st-lbl">Wersja aplikacji</div>
       <div class="st-ver" id="stWersja"></div>
       <button class="st-opt st-wide" data-act="odswiez">Pobierz najnowszą wersję</button>
       <div class="st-hint">Kasuje zapisaną kopię plików aplikacji i wczytuje ją od nowa z serwera. Przydatne, gdy po wgraniu nowej wersji na GitHub wciąż widzisz starą. <b>Notatki zostają nietknięte</b> — są w osobnej bazie na urządzeniu.</div>
     </div>
     </div>`;
  rysujZakladkiUstawien();
  pokazKarteUstawien(stKarta);
  pokazPlikKopii();
  pokazStanSync();
  pokazStanBibliotek();
  const wyborOsz = $("stOszczedny");
  if(wyborOsz){
    wyborOsz.value = (typeof oszczedny!=="undefined") ? oszczedny : "auto";
    wyborOsz.onchange = e=>{
      if(typeof ustawOszczedny==="function") ustawOszczedny(e.target.value);
      toastOk(e.target.value==="auto" ? "Zwarty pasek dobierany do ekranu"
            : e.target.value==="zawsze" ? "Zwarty pasek zawsze" : "Pełny pasek zawsze");
    };
  }
  /* Miejsce zajmowane przez historię liczymy po otwarciu okna, nie przy starcie
     aplikacji: to przejście po całym magazynie wersji i nie ma powodu robić go
     komuś, kto do ustawień nie zagląda. */
  pokazMiejsceWersji();
  const pole = $("stWersja");
  if(pole){
    let statusOffline = " · bez kopii offline (wczytaj przez HTTPS / GitHub)";
    if(location.protocol === "file:"){
      statusOffline = " · plik lokalny z dysku (offline wymaga HTTPS / GitHub Pages)";
    } else if(offlineReady()){
      statusOffline = " · zapisana do pracy offline";
    }
    pole.textContent = "Wersja v" + APP_VERSION + statusOffline;
    if(location.protocol.indexOf("http") === 0 && "serviceWorker" in navigator){
      navigator.serviceWorker.getRegistration().then(r => {
        if(r && (r.active || r.installing || r.waiting)){
          lsSet(KP+"OfflineOK","1");
          pole.textContent = "Wersja v" + APP_VERSION + " · zapisana do pracy offline";
        }
      }).catch(()=>{});
    }
  }
  openModal("modalSettings");

  box.onclick = e=>{
    if(e.target.closest("#stBledy")){
      pokazRaport(diagRaport());
      return;
    }
    if(e.target.closest("#stBledyCzysc")){ diagWyczysc(); return; }
    const fs = e.target.closest(".st-fs [data-fs]");   // tylko przyciski A− / A+, nie dowolny przodek
    if(fs){
      const roznica = fs.dataset.fs === "+" ? 1 : -1;
      if(fs.closest('[data-font="ui"]')){
        ustawSkaleInterfejsu(roznica*.05);
        $("stUiVal").textContent = Math.round(uiScale*100) + "%";
      }else if(fs.closest('[data-font="list"]')){
        ustawRozmiarList(roznica);
        $("stListFsVal").textContent = listFs + " px";
      }else{
        ustawRozmiarTresci(roznica);
        $("stFsVal").textContent = noteFs + " px";
      }
      return;
    }
    const komp = e.target.closest("[data-komp]");
    if(komp){
      applyPreset(komp.dataset.komp);
      const siatka = box.querySelector(".st-komp");
      if(siatka) siatka.innerHTML = kompozycjeHtml();   // odhacz nowo wybraną
      return;
    }
    const act = e.target.closest("[data-act]");
    if(act && act.dataset.act==="odstepy"){
      closeModal("modalSettings");
      setTimeout(()=>uporzadkujOdstepyNotatek(), 80);
      return;
    }
    if(act && act.dataset.act==="syncTeraz"){ syncUzgodnijTeraz().then(pokazStanSync); return; }
    if(act && act.dataset.act==="syncWskaz"){
      syncWskazPlik().then(ok=>{ if(ok) syncUzgodnijTeraz().then(pokazStanSync); else pokazStanSync(); });
      return;
    }
    if(act && act.dataset.act==="syncOff"){
      /* Wyłączenie samo z siebie NIE kasuje podstawy: gdy ktoś wróci do
         uzgadniania, ma się ono zacząć od miejsca, w którym stanęło, a nie od
         „pierwszego spotkania" z pytaniem o każdą rozbieżność. */
      syncZapomnijPlik().then(pokazStanSync);
      return;
    }
    if(act && act.dataset.act==="syncWyslij"){ syncWyslij().then(pokazStanSync); return; }
    if(act && act.dataset.act==="syncWczytaj"){
      const p = $("syncPlikInput"); if(p) p.click();
      return;
    }
    if(act && act.dataset.act==="syncNazwa"){
      askText({title:"Nazwa tego urządzenia", value:syncNazwaUrzadzenia(),
               placeholder:"np. iPad Grzegorza", okLabel:"Zapisz"}).then(n=>{
        if(n && syncUstawNazweUrzadzenia(n)){ toastOk("Zapisano nazwę urządzenia"); pokazStanSync(); }
      });
      return;
    }
    if(act && act.dataset.act==="syncZapomnij"){
      askConfirm("Zacząć uzgadnianie od nowa?",
        "Aplikacja zapomni, na czym się ostatnio zgodziła z drugim urządzeniem. "
        + "<b>Notatki zostają nietknięte</b> — ale przy najbliższym uzgodnieniu "
        + "nie będzie wiadomo, kto się zmienił, więc w spornych notatkach wygra "
        + "nowsza data zmiany, bez pytania. Przydaje się tylko wtedy, gdy "
        + "uzgadnianie zaczęło pokazywać rozbieżności, których nie ma.",
        {okLabel:"Zacznij od nowa", danger:true}).then(async ok=>{
          if(!ok) return;
          await syncZapomnijPodstawe();
          pokazStanSync();
          toast("Podstawa uzgadniania wyczyszczona");
        });
      return;
    }
    if(act && act.dataset.act==="plikKopii"){
      wskazPlikKopii().then(ok=>{ if(ok) pokazPlikKopii(); });
      return;
    }
    if(act && act.dataset.act==="plikKopiiOff"){
      zapomnijPlikKopii().then(pokazPlikKopii);
      return;
    }
    if(act && act.dataset.act==="wersjeCzysc"){
      askConfirm("Wyczyścić historię wersji?",
        "Wszystkie zapisane wcześniejsze wersje notatek zostaną usunięte. "
        + "<b>Same notatki zostają nietknięte</b> — kasujemy tylko dziennik zmian, "
        + "czyli możliwość powrotu do dawnej treści.",
        {okLabel:"Wyczyść", danger:true}).then(async ok=>{
          if(!ok) return;
          await wersjeWyczysc();
          pokazMiejsceWersji();
          toastOk("Historia wersji wyczyszczona");
        });
      return;
    }
    if(act && act.dataset.act==="odswiez"){
      askConfirm("Pobrać najnowszą wersję?",
        "Zapisana kopia plików aplikacji zostanie skasowana i pobrana od nowa z serwera.<br><br>Notatki, etykiety i zakładki <b>zostają nietknięte</b>.",
        {okLabel:"Pobierz i odśwież"}).then(ok=>{ if(ok) wymusAktualizacje(); });
      return;
    }
    const opt = e.target.closest(".st-opt[data-v]");
    if(!opt) return;
    if(opt.closest('[data-grp="centrum"]')){
      centrumUstawWlaczone(opt.dataset.v === "1");
      opt.parentElement.querySelectorAll(".st-opt").forEach(b=>b.classList.remove("on"));
      opt.classList.add("on");
      toastOk(opt.dataset.v === "1" ? "Centrum studium będzie się pokazywać"
                                    : "Centrum studium wyłączone");
      return;
    }
    const grp = opt.closest("[data-grp]").dataset.grp, v = opt.dataset.v;
    if(grp==="dens") setDensity(v);
    else if(grp==="anim") setAnim(v);
    else if(grp==="theme") setTheme(v);
    else if(grp==="view") setNoteView(v);
    else if(grp==="focus") setFocusMode(v === "1");
    opt.parentElement.querySelectorAll(".st-opt").forEach(b=>b.classList.toggle("on", b===opt));
    toastOk("Zapisano ustawienie");
  };
}
/** Pokazuje w ustawieniach, do jakiego pliku trafiają kopie. */
async function pokazPlikKopii(){
  const opis = document.getElementById("stPlikKopii");
  const wyl = document.getElementById("stPlikKopiiOff");
  if(!opis) return;
  if(!stalyPlikDostepny()){
    opis.textContent = "Ta przeglądarka pozwala tylko pobierać nowe pliki.";
    const btn = document.querySelector('#setBody [data-act="plikKopii"]');
    if(btn) btn.style.display = "none";
    if(wyl) wyl.style.display = "none";
    return;
  }
  const nazwa = await nazwaPlikuKopii();
  opis.textContent = nazwa ? "Nadpisywany plik: " + nazwa : "Każda kopia to nowy plik z datą w nazwie.";
  if(wyl) wyl.style.display = nazwa ? "" : "none";
}
/**
 * Stan uzgadniania w Ustawieniach.
 *
 * Pokazuje się TYLKO to, co na tym urządzeniu ma sens: w Chromium na komputerze
 * wskazanie pliku i wyłącznik, w Safari i na telefonie dwa przyciski ręczne.
 * Przycisk, który w danej przeglądarce nic nie zrobi, jest gorszy od jego braku.
 */
async function pokazStanSync(){
  const opis = $("stSync");
  if(!opis || typeof syncStanOpis !== "function") return;
  opis.textContent = await syncStanOpis();
  const auto = typeof syncPlikAutomatyczny === "function" && syncPlikAutomatyczny();
  const nazwa = auto && typeof syncNazwaPliku === "function" ? await syncNazwaPliku() : "";
  const wskaz   = document.querySelector('#setBody [data-act="syncWskaz"]');
  const off     = $("stSyncOff");
  const odNowa  = $("stSyncOdNowa");
  const recznie = $("stSyncRecznie");
  if(wskaz)   wskaz.style.display   = auto ? "" : "none";
  if(off)     off.style.display     = (auto && nazwa) ? "" : "none";
  if(recznie) recznie.style.display = (auto && nazwa) ? "none" : "";
  /* „Zacznij od nowa" dotyczy podstawy, nie pliku — ma sens dopiero wtedy, gdy
     coś już kiedyś uzgodniono. */
  if(odNowa) odNowa.style.display = lsGet(KP+"SyncKiedy", "") ? "" : "none";
}

/** Skąd aplikacja bierze biblioteki do importu — widoczne w Ustawieniach. */
async function pokazStanBibliotek(){
  const opis = document.getElementById("stLib");
  if(!opis) return;
  let lokalne = false;
  try{ lokalne = await plikObok("./lib/jszip.min.js"); }catch(e){}
  opis.textContent = lokalne
    ? "Biblioteki obok aplikacji — import działa bez internetu."
    : "Brak katalogu lib/ — import z JW Library nie zadziała. Wgraj go razem z aplikacją.";
}
$("btnSettings").onclick = openSettings;
