/* ==========================================================================
   JW Study — kolumny-klawiatura.js
   TRZY KOLUMNY BOCZNE DO OBSŁUGI Z KLAWIATURY

   Sprawdzone na 102 notatkach: z osiemdziesięciu dwóch pozycji w kolumnach
   Biblia, Etykiety i Publikacje **ani jedna** nie dawała się wybrać
   z klawiatury. Wszystkie są zwykłymi elementami div z podpiętym kliknięciem,
   więc Tab je pomijał, a czytnik ekranu wymawiał je jako tekst bez znaczenia.
   Aplikacja działała wyłącznie dla myszy i palca.

   DLACZEGO NIE PO PROSTU tabindex="0" NA KAŻDEJ POZYCJI

   Bo w kolumnie Biblia jest ich sześćdziesiąt osiem. Przejście Tabem od
   wyszukiwarki do listy notatek wymagałoby wtedy siedemdziesięciu naciśnięć,
   a klawisz Tab przestałby służyć do czego służy — do przechodzenia MIĘDZY
   częściami strony.

   Robimy to tak, jak od dawna robią to listy w systemach: DO KOLUMNY WCHODZI
   SIĘ RAZ, a wewnątrz chodzi się strzałkami. Ognisko dostaje jedna pozycja
   (ta wybrana albo pierwsza), pozostałe mają tabindex="-1" i są osiągalne
   wyłącznie strzałkami. Nazywa się to wędrującym tabindeksem i jest tym samym,
   co robi lista plików w każdym systemie.

     Tab / Shift+Tab   wchodzi do kolumny i wychodzi z niej
     ↓ ↑               następna / poprzednia pozycja
     → ←               rozwija i zwija księgę (albo sekcję etykiet)
     Home / End        pierwsza / ostatnia pozycja
     Enter / Spacja    wybiera — dokładnie to, co kliknięcie
     Escape            wraca do wyszukiwarki

   Zdarzenia obsługujemy NA POJEMNIKU kolumny, nie na pozycjach. Listy są
   przerysowywane po każdej zmianie filtra, więc nasłuch podpięty do pozycji
   trzeba by podpinać od nowa za każdym razem — a jedno przeoczenie zostawiłoby
   kolumnę bez klawiatury, znowu po cichu.
   ========================================================================== */
"use strict";

const KOL_LISTY = ["bookList", "tagList", "pubList"];
/* Co w kolumnie jest „pozycją do wybrania". Nagłówki sekcji i chipy rozdziałów
   też — bo też się w nie klika, a klawiatura nie może być uboższa od myszy. */
const KOL_POZYCJA = ".item, .secHead, .chip-ch";

/** Pozycje danej listy w kolejności, w jakiej stoją na ekranie. */
function kolPozycje(lista){
  return [...lista.querySelectorAll(KOL_POZYCJA)].filter(el=>el.offsetParent !== null);
}

/**
 * Wędrujący tabindeks: dokładnie JEDNA pozycja w kolumnie jest osiągalna Tabem.
 *
 * Wybrana, a gdy nic nie jest wybrane — pierwsza. Wołane po każdym
 * przerysowaniu, bo przerysowanie tworzy nowe elementy i cała ta wiedza ginie.
 */
function kolOdswiezTabindeksy(lista){
  const poz = kolPozycje(lista);
  if(!poz.length) return;
  const wybrana = poz.find(el=>el.classList.contains("active")) || poz[0];
  poz.forEach(el=>{
    el.setAttribute("tabindex", el === wybrana ? "0" : "-1");
    /* Rola mówi czytnikowi ekranu, że to przycisk zawężający listę, a nie napis.
       aria-pressed mówi, czy zawężenie jest właśnie włączone — bez tego stan
       „wybrana" istniał wyłącznie jako kolor tła. */
    if(!el.hasAttribute("role")) el.setAttribute("role", "button");
    if(el.classList.contains("secHead")){
      el.setAttribute("aria-expanded", String(!el.classList.contains("closed")));
    } else {
      el.setAttribute("aria-pressed", String(el.classList.contains("active")));
    }
  });
}
/** Odświeża wszystkie trzy kolumny. Wołane z renderAll. */
function kolOdswiezKlawiature(){
  KOL_LISTY.forEach(id=>{ const el = document.getElementById(id); if(el) kolOdswiezTabindeksy(el); });
}

/** Przenosi ognisko na pozycję i czyni ją tą jedną osiągalną Tabem. */
function kolUstawOgnisko(lista, el){
  if(!el) return;
  kolPozycje(lista).forEach(x=>x.setAttribute("tabindex", x === el ? "0" : "-1"));
  el.focus();
  /* Przewijamy najkrótszą drogą — „nearest" nie skacze listą, gdy pozycja i tak
     jest widoczna. Skok przy każdej strzałce gubi orientację. */
  if(el.scrollIntoView) el.scrollIntoView({block:"nearest"});
}

KOL_LISTY.forEach(id=>{
  const lista = document.getElementById(id);
  if(!lista) return;

  /* Ognisko w kolumnie ma być widoczne także wtedy, gdy przyszło z klawiatury —
     przeglądarka rysuje obwódkę tylko przy :focus-visible, a przy przewijaniu
     strzałkami trzeba wiedzieć, gdzie się jest. Klasa robi to jawnie. */
  lista.addEventListener("focusin", e=>{
    const poz = e.target.closest && e.target.closest(KOL_POZYCJA);
    if(poz) poz.classList.add("kolOgnisko");
  });
  lista.addEventListener("focusout", e=>{
    const poz = e.target.closest && e.target.closest(KOL_POZYCJA);
    if(poz) poz.classList.remove("kolOgnisko");
  });

  lista.addEventListener("keydown", e=>{
    const teraz = e.target.closest && e.target.closest(KOL_POZYCJA);
    if(!teraz) return;
    const poz = kolPozycje(lista);
    const i = poz.indexOf(teraz);
    if(i < 0) return;

    switch(e.key){
      case "ArrowDown":
        e.preventDefault(); kolUstawOgnisko(lista, poz[Math.min(i + 1, poz.length - 1)]); return;
      case "ArrowUp":
        e.preventDefault(); kolUstawOgnisko(lista, poz[Math.max(i - 1, 0)]); return;
      case "Home":
        e.preventDefault(); kolUstawOgnisko(lista, poz[0]); return;
      case "End":
        e.preventDefault(); kolUstawOgnisko(lista, poz[poz.length - 1]); return;
      case "Enter":
      case " ":
        /* Spacja na elemencie, który nie jest przyciskiem, przewija stronę —
           dlatego zatrzymujemy ją, zanim to zrobi. */
        e.preventDefault(); teraz.click(); return;
      case "Escape":
        e.preventDefault();
        /* stopPropagation nie jest tu ozdobą.
           Skrót globalny (23-shortcuts.js) na Escape robi m.in. to:
               if(document.activeElement===$("search")) $("search").blur();
           czyli zdejmuje ognisko z wyszukiwarki. Bez zatrzymania zdarzenia
           nasze „wróć do wyszukiwarki" i tamto „wyjdź z wyszukiwarki"
           wykonywały się jedno po drugim i ognisko lądowało na pustym body —
           użytkownik tracił miejsce w liście i nie zyskiwał wyszukiwarki. */
        e.stopPropagation();
        { const s = document.getElementById("search"); if(s) s.focus(); }
        return;
      case "ArrowRight":
      case "ArrowLeft": {
        /* Strzałki w bok rozwijają to, co się rozwija: księgę z rozdziałami
           i sekcję etykiet. Tam, gdzie nie ma czego rozwinąć, nie robią nic —
           lepiej niż udawać, że coś się stało. */
        const rozwijalna = teraz.classList.contains("secHead")
          || (teraz.classList.contains("item") && teraz.querySelector(".arr"));
        if(!rozwijalna) return;
        const otwarta = teraz.classList.contains("secHead")
          ? !teraz.classList.contains("closed")
          : teraz.querySelector(".arr").textContent.indexOf("▾") >= 0;
        if((e.key === "ArrowRight") !== otwarta){ e.preventDefault(); teraz.click(); }
        return;
      }
    }
  });
});

/* Po każdym przerysowaniu kolumn wędrujący tabindeks trzeba nadać od nowa.
   Woła nas renderAll (09-notes.js) — tak jak woła pozostałe moduły dopisane
   później. Podmienianie renderAll z tego miejsca byłoby krótsze, ale wtedy
   kolejność wywołań zależałaby od kolejności wczytywania modułów, a ta jest
   w tym projekcie częścią kontraktu, nie przypadkiem. */
kolOdswiezKlawiature();
