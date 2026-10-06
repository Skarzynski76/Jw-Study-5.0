/* ==========================================================================
   JW Study — wszystkie.js
   POWRÓT DO WSZYSTKICH NOTATEK — JEDNYM PRZYCISKIEM

   Po wyszukaniu czegoś albo wejściu w etykietę powrót do pełnej listy wymagał
   wędrówki: wyczyść pole szukania, wróć do kolumny etykiet, znajdź „Wszystkie",
   kliknij. Cztery ruchy po całym ekranie, żeby wrócić do punktu wyjścia.

   Teraz jest jeden przycisk w górnym pasku. Pokazuje się TYLKO wtedy, gdy coś
   faktycznie zawęża listę — przy pełnej liście nie zabiera miejsca ani uwagi.
   Podaje też, ile notatek wróci, żeby było widać, co się zaraz stanie.
   ========================================================================== */
"use strict";

/** Co dokładnie zawęża w tej chwili listę. Pusta lista = widać wszystko. */
function czynneZawezenia(){
  const co = [];
  if(query) co.push("szukanie");
  if(filt.tag && filt.tag!=="all") co.push("etykieta");
  if(filt.book && filt.book!=="all") co.push("księga");
  if(filt.pub && filt.pub!=="all") co.push("publikacja");
  if(filt.ch) co.push("rozdział");
  if(typeof quickFilter!=="undefined" && quickFilter!=="all") co.push("szybki filtr");
  return co;
}
/** Czyści wszystkie zawężenia naraz i wraca do pełnej listy. */
function pokazWszystkieNotatki(){
  if(!czynneZawezenia().length) return;
  query = "";
  const pole = $("search");
  if(pole) pole.value = "";
  const sug = $("searchSug");
  if(sug){ sug.style.display = "none"; setHtml(sug, ""); }
  filt.tag = "all"; filt.book = "all"; filt.ch = null; filt.pub = "all";
  if(typeof quickFilter!=="undefined") quickFilter = "all";
  renderAll();
  const ile = notes.filter(n=>!n.del).length;
  toastOk("Wszystkie notatki (" + ile + ")");
}
/** Pokazuje przycisk tylko wtedy, gdy jest z czego wracać. */
function odswiezPrzyciskWszystkie(){
  const b = $("btnWszystkie"); if(!b) return;
  const zaw = czynneZawezenia();
  b.hidden = !zaw.length;
  if(!zaw.length) return;
  const ile = notes.filter(n=>!n.del).length;
  /* LICZBY NIE POWTARZAMY NA JEDNYM PASKU.
     Przycisk pokazywał ją w bąbelku, a podpis pod nazwą aplikacji — „16617
     notatek" — podaje dokładnie tę samą wartość, kilka centymetrów obok. Dwa
     razy to samo, a przy sześciu cyfrach bąbelek zabierał tyle miejsca, że
     pasek łamał się na dwa rzędy dla jednego przycisku. Liczba została tam,
     gdzie jest zawsze widoczna, i w podpowiedzi tego przycisku. */
  /* W tytule wypisujemy, co zostanie zdjęte — inaczej przycisk kasujący kilka
     rzeczy naraz bywa niespodzianką. */
  b.title = "Wróć do wszystkich notatek (" + ile + ") — zdejmie: " + zaw.join(", ") + "   [0]";
}
document.addEventListener("click", e=>{
  if(e.target.closest && e.target.closest("#btnWszystkie")){
    e.preventDefault(); pokazWszystkieNotatki();
  }
});

/* ==========================================================================
   SZUKANIE ZAWSZE PO CAŁOŚCI (v2.75)

   DLACZEGO

   Pole szukania działało W BIEŻĄCYM WIDOKU. Kto stał na etykiecie „Betel",
   w księdze Psalmów albo na szybkim filtrze „Ulubione", szukał wyłącznie tam —
   a to jest dokładnie ta sytuacja, w której najczęściej się szuka: nie znalazłem
   tego, czego szukam, tam gdzie patrzyłem. Żeby poszukać naprawdę wszędzie,
   trzeba było najpierw zauważyć przycisk „Wróć do wszystkich notatek", nacisnąć
   go, i dopiero potem zacząć pisać. Trzy ruchy zamiast jednego, a bez nich pole
   oddawało „nic nie znaleziono" przy notatce, która leżała obok.

   Do tego drugie: przy otwartym Centrum studium pisanie w polu NIC NIE ROBIŁO
   NA EKRANIE. Lista pod spodem uaktualniała się prawidłowo, ale Centrum ją
   zasłaniało, bo szybka ścieżka szukania woła `renderNotes`, a przełącznik
   „Centrum albo lista" siedzi w `renderAll`. Wyglądało to jak zepsute
   wyszukiwanie.

   JAK

   Samo USTAWIENIE OGNISKA w polu szukania zdejmuje wszystkie zawężenia
   i wychodzi z Centrum. Nie po wpisaniu pierwszej litery, tylko od razu przy
   kliknięciu — bo wtedy widać, co się stało, zanim się zacznie pisać.
   Działa tak samo dla ⌘F, „/" i kliknięcia myszą: `focus` dostajemy w każdym
   z tych przypadków.

   Zdejmujemy też sortowanie „ostatnio otwierane": ono pokazuje pięć notatek
   i NIE PRZEPUSZCZA przez siebie szukanego słowa, więc szukanie w tym trybie
   nie mogłoby zadziałać.
   ========================================================================== */
function szukajWszedzie(){
  let zdjete = false;      // czy naprawdę coś zawężało listę
  if(filt.tag && String(filt.tag) !== "all"){ filt.tag = "all"; zdjete = true; }
  if(filt.book && String(filt.book) !== "all"){ filt.book = "all"; zdjete = true; }
  if(filt.pub && String(filt.pub) !== "all"){ filt.pub = "all"; zdjete = true; }
  if(filt.ch != null){ filt.ch = null; zdjete = true; }
  if(typeof expandedBook !== "undefined" && expandedBook){ expandedBook = null; }
  if(typeof quickFilter !== "undefined" && quickFilter !== "all"){ quickFilter = "all"; zdjete = true; }
  if(typeof sortMode !== "undefined" && sortMode === "recent"){
    sortMode = "mod";
    const sel = $("sortSel");
    if(sel && [...sel.options].some(o=>o.value === "mod")){ sel.value = "mod"; lsSet(KP + "Sort", "mod"); }
    zdjete = true;
  }
  /* Mapa tematów jest osobną stroną na całe okno — z ⌘F można ją wywołać
     także stamtąd. Skoro szukamy po wszystkim, wracamy do listy notatek. */
  if(typeof zamknijMape === "function"){
    const m = $("modalMapa");
    if(m && m.classList.contains("show")) zamknijMape();
  }
  const bylCentrum = (typeof centrumWidoczne === "function") && centrumWidoczne();
  if(bylCentrum && typeof centrumSchowaj === "function") centrumSchowaj();

  if(!zdjete && !bylCentrum) return false;
  if(typeof persistFilt === "function") persistFilt();
  renderAll();
  /* Na telefonie kolumny są jedna na raz — bez tego pisałoby się w polu,
     patrząc na kolumnę ksiąg. */
  if(innerWidth <= 900 && typeof mobileShow === "function") mobileShow("colNotes");
  /* Napis tylko wtedy, gdy coś naprawdę zniknęło z widoku. Samo wyjście
     z Centrum nie jest niespodzianką i nie potrzebuje tłumaczenia. */
  if(zdjete && typeof toast === "function") toast("Szukam we wszystkich notatkach");
  return true;
}
if($("search")) $("search").addEventListener("focus", szukajWszedzie);
