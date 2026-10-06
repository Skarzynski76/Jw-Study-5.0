/* ==========================================================================
   JW Study — przypisy.js
   PRZYPISY W NOTATCE

   CO BYŁO NIE TAK

   Notatka ze studium ma dwie warstwy: myśl główną i to, co ją podpiera —
   skąd wzięta, kto tak twierdzi, jaki jest wyjątek, gdzie doczytać. Do tej
   pory obie leżały w jednym ciągu tekstu, więc trzeba było wybrać:

     • wpisać wyjaśnienie w nawiasie, w środku zdania — myśl główna rozpada się
       na kawałki i przy czytaniu na głos trzeba nawias przeskakiwać;
     • albo dopisać je na końcu notatki — ale wtedy nic nie mówi, DO CZEGO
       się odnosi, a po miesiącu i po dopisaniu trzech akapitów nie da się tego
       odgadnąć;
     • albo zrobić z tego osobną notatkę — czyli rozbić jedną myśl na dwie
       kartki, żeby zapisać jedno zdanie.

   JAK JEST TERAZ

   W miejscu, w którym stoi kursor, wchodzi mały odsyłacz ¹, a treść przypisu
   ląduje na dole notatki, w osobnym bloku pod linią. Kliknięcie odsyłacza
   przenosi do przypisu, kliknięcie numeru przypisu — z powrotem do miejsca
   w tekście. Przypisy wchodzą też do wyszukiwania, bo są zwykłym tekstem
   notatki.

   TRZY DECYZJE, KTÓRE WARTO ZNAĆ

   1. NUMERY LICZĄ SIĘ SAME, ZA KAŻDYM RAZEM. Nigdzie nie jest zapisane
      „to jest przypis numer 3". Kolejność bierze się z KOLEJNOŚCI ODSYŁACZY
      w treści, przy każdym zapisie i przy każdym wyświetleniu. Dzięki temu
      wstawienie przypisu w środku notatki przenumerowuje wszystkie następne,
      a usunięcie odsyłacza zamyka lukę — bez żadnej osobnej ewidencji, która
      i tak rozjechałaby się przy pierwszym wklejeniu tekstu.

   2. PRZYPIS BEZ ODSYŁACZA NIE JEST KASOWANY. Gdy skasujesz w tekście samo ¹,
      treść przypisu zostaje na dole, oznaczona jako „bez odsyłacza w tekście".
      Ciche usunięcie byłoby najgorsze z możliwych: kilka zdań przepadałoby
      przez naciśnięcie Backspace w niepozornym miejscu. Puste przypisy
      (bez ani jednego znaku) odpadają same, bo nie ma czego ratować.

   3. BLOK PRZYPISÓW JEST ZWYKŁĄ CZĘŚCIĄ TREŚCI. Nie osobnym polem w notatce.
      Dzięki temu jedzie w kopii zapasowej i w pliku uzgadniania, wchodzi do
      historii wersji i do porównywania wersji, daje się przeszukać i nie
      wymagał podniesienia wersji bazy. Kosztuje to tyle, że sito treści
      (`sanitize`) musi znać trzy nowe znaczniki — i tylko tyle.
   ========================================================================== */
"use strict";

/* Cyfry górne. Zwykła cyfra w <sup> też by wyglądała dobrze, ale te znaki
   przeżywają skopiowanie notatki do zwykłego tekstu — a właśnie tam odsyłacz
   przestaje być widoczny, jeśli jest tylko wyglądem. */
const PRZ_CYFRY = ["⁰","¹","²","³","⁴","⁵","⁶","⁷","⁸","⁹"];
function przCyfryGorne(n){
  return String(n).split("").map(c=>PRZ_CYFRY[+c] || c).join("");
}
/* Ile przypisów na notatkę. Setka to znacznie więcej, niż ma sens w notatce
   ze studium; granica jest tu po to, żeby wklejony obcy tekst nie zrobił
   z bloku przypisów drugiej notatki. */
const PRZ_MAX = 100;
/* Najdłuższy przypis. Dłuższy tekst to już akapit, nie przypis. */
const PRZ_MAX_ZNAKOW = 2000;

/** Blok przypisów notatki — istniejący albo świeżo utworzony na końcu treści. */
function przBlok(ce, utworz){
  let blok = ce.querySelector(":scope > .fnlist") || ce.querySelector(".fnlist");
  if(blok || !utworz) return blok;
  blok = document.createElement("div");
  blok.className = "fnlist";
  ce.appendChild(blok);
  return blok;
}

/**
 * PRZENUMEROWANIE. Jedyne miejsce, w którym ustala się, który przypis ma jaki
 * numer — patrz decyzja 1 w nagłówku pliku.
 *
 * @param {HTMLElement} ce  treść notatki (w edycji albo wyświetlana)
 * @returns {number} ile przypisów ma odsyłacz w tekście
 */
function przPrzenumeruj(ce){
  if(!ce) return 0;
  const blok = przBlok(ce, false);
  const wpisy = blok ? [...blok.querySelectorAll(".fn")] : [];
  /* Odsyłacze bierzemy w kolejności, w jakiej stoją w treści — ale bez tych,
     które siedzą wewnątrz samego bloku przypisów (przypis o przypisie to już
     nie przypis). */
  const odsylacze = [...ce.querySelectorAll("sup.fnref")].filter(s=>!s.closest(".fnlist"));
  const poId = new Map();
  wpisy.forEach(w=>{ const k = w.getAttribute("data-fn"); if(k && !poId.has(k)) poId.set(k, w); });

  const uzyte = new Set();
  let nr = 0;
  const nowaKolejnosc = [];
  odsylacze.forEach(s=>{
    if(nr >= PRZ_MAX){ return; }
    const k = s.getAttribute("data-fn") || "";
    let wpis = poId.get(k);
    if(!wpis || uzyte.has(wpis)){
      /* Odsyłacz bez swojego przypisu — najczęściej po skopiowaniu fragmentu
         notatki. Dostaje pusty przypis, żeby nie wisiał w powietrzu. */
      wpis = document.createElement("div");
      wpis.className = "fn";
      wpis.textContent = "";
    }
    uzyte.add(wpis);
    nr++;
    const id = "f" + nr;
    s.setAttribute("data-fn", id);
    s.textContent = przCyfryGorne(nr);
    wpis.setAttribute("data-fn", id);
    wpis.removeAttribute("data-sierota");
    nowaKolejnosc.push(wpis);
  });
  /* Przypisy, których odsyłacz zniknął — patrz decyzja 2. Puste odpadają. */
  const sieroty = wpisy.filter(w=>!uzyte.has(w) && w.textContent.trim());
  sieroty.forEach((w, i)=>{
    w.setAttribute("data-fn", "s" + (i + 1));
    w.setAttribute("data-sierota", "1");
    nowaKolejnosc.push(w);
  });
  if(!nowaKolejnosc.length){
    if(blok) blok.remove();
    return 0;
  }
  const cel = blok || przBlok(ce, true);
  nowaKolejnosc.forEach(w=>cel.appendChild(w));      // appendChild przenosi, nie kopiuje
  return nr;
}

/** Wstawia przypis w miejscu kursora. */
async function przWstaw(ce){
  if(!ce) return;
  /* Lista podpowiedzi `@`/`#` mogła zostać otwarta ostatnim naciśnięciem —
     jej obsługa klawiatury przechwytuje Enter, a Enter jest teraz potrzebny
     w okienku treści przypisu. */
  if(typeof wzmZamknij === "function") wzmZamknij();
  const zapamietane = (typeof edSavedRange !== "undefined" && edSavedRange)
    ? edSavedRange.cloneRange() : null;
  const ile = [...ce.querySelectorAll("sup.fnref")].filter(s=>!s.closest(".fnlist")).length;
  if(ile >= PRZ_MAX){ toast("Więcej niż " + PRZ_MAX + " przypisów w jednej notatce to już nie przypisy"); return; }
  const tekst = await askText({title:"Przypis",
    placeholder:"np. Wnikliwe poznawanie Pism, t. 2, s. 415",
    hint:"Odsyłacz wejdzie w miejscu kursora, treść na dole notatki.",
    okLabel:"Wstaw przypis"});
  if(tekst === null) return;
  const czysty = String(tekst).trim().slice(0, PRZ_MAX_ZNAKOW);
  if(!czysty){ toast("Puste przypisy nie mają czego pokazać"); return; }

  const s = document.createElement("sup");
  s.className = "fnref";
  s.setAttribute("data-fn", "nowy");
  s.textContent = "¹";
  /* Wstawiamy PRZED blokiem przypisów, choćby kursor stał gdzieś w nim — inaczej
     odsyłacz wylądowałby wewnątrz listy przypisów, gdzie nie ma sensu. */
  const wBloku = zapamietane && zapamietane.commonAncestorContainer
    && zapamietane.commonAncestorContainer.parentElement
    && zapamietane.commonAncestorContainer.parentElement.closest(".fnlist");
  if(zapamietane && !wBloku && ce.contains(zapamietane.commonAncestorContainer)){
    const r = zapamietane.cloneRange(); r.collapse(false); r.insertNode(s);
  } else {
    const blok = przBlok(ce, false);
    if(blok) ce.insertBefore(s, blok); else ce.appendChild(s);
  }
  const wpis = document.createElement("div");
  wpis.className = "fn";
  wpis.setAttribute("data-fn", "nowy");
  wpis.textContent = czysty;
  przBlok(ce, true).appendChild(wpis);

  const nr = przPrzenumeruj(ce);
  commitLiveEdit(ce);
  if(typeof histZapisz === "function") histZapisz(ce);
  toastOk("Wstawiono przypis " + przCyfryGorne(nr ? nr : 1));
}

/* ==========================================================================
   CHODZENIE MIĘDZY ODSYŁACZEM I PRZYPISEM
   ========================================================================== */

/** Podświetla element na moment, żeby oko go znalazło po przewinięciu. */
function przMrugnij(el){
  if(!el) return;
  el.classList.remove("fn-mrug");
  void el.offsetWidth;                 // wymuszenie przerysowania — bez tego druga animacja nie startuje
  el.classList.add("fn-mrug");
  setTimeout(()=>el.classList.remove("fn-mrug"), 1400);
}

document.addEventListener("click", e=>{
  const cel = e.target && e.target.closest ? e.target : null;
  if(!cel) return;
  const ods = cel.closest("sup.fnref");
  const wpis = cel.closest(".fnlist .fn");
  if(!ods && !wpis) return;
  const tresc = (ods || wpis).closest(".ncontent");
  if(!tresc) return;
  if(tresc.isContentEditable) return;          // w edycji przypis jest zwykłym tekstem do poprawiania
  e.preventDefault();
  if(ods){
    const id = ods.getAttribute("data-fn");
    const doc = tresc.querySelector('.fnlist .fn[data-fn="' + CSS.escape(id || "") + '"]');
    if(!doc){ toast("Ten przypis nie ma treści"); return; }
    doc.scrollIntoView({block:"nearest", behavior:"smooth"});
    przMrugnij(doc);
    return;
  }
  /* Klik w przypis wraca do miejsca w tekście. */
  const id = wpis.getAttribute("data-fn");
  const back = tresc.querySelector('sup.fnref[data-fn="' + CSS.escape(id || "") + '"]');
  if(!back){ toast("Ten przypis nie ma już odsyłacza w tekście"); return; }
  back.scrollIntoView({block:"center", behavior:"smooth"});
  przMrugnij(back);
});
