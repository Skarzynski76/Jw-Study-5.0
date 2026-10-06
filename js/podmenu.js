/* ==========================================================================
   JW Study — podmenu.js
   TRZY GRUPY W MENU NOTATKI

   Menu notatki miało dziewiętnaście pozycji i jeden nagłówek — „Werset" —
   który stał nad ośmioma, z czego siedem nie miało z wersetem nic wspólnego:
   wysokość karty, tło, szablon, obie zakładki, przypomnienie. Nagłówek, który
   kłamie, jest gorszy od braku nagłówka: uczy ich nie czytać.

   Zamiast prostować nazwy nad dziewiętnastoma pozycjami — trzy grupy. Na
   wierzchu zostaje to, po co sięga się codziennie; rzadsze rzeczy są o jedno
   dotknięcie dalej, ale w miejscu, które da się nazwać jednym słowem.

   Menu mieści się dzięki temu na ekranie telefonu bez przewijania. Wcześniej
   „Usuń notatkę" bywało pod krawędzią — a to najgorsza z możliwych pozycji do
   szukania w pośpiechu.
   ========================================================================== */
"use strict";

/* Co jest w której grupie. Wpis: [klucz, nazwa, warunek widoczności].
   Warunek jest funkcją, bo część pozycji ma sens tylko dla notatek z miejscem
   w publikacji albo przy istniejących zakładkach. */
const GRUPY_NOTATKI = {
  grCentrum: {
    tytul: "Centrum Studium",
    poz: n=>[
      ["cenq", n.cenq ? "Usuń z kolejki czytania" : "Dodaj do kolejki czytania", true, n.cenq?"✓":""],
      ["ceni", n.ceni ? "Usuń z „Do opracowania”" : "Dodaj do „Do opracowania”", true, n.ceni?"✓":""],
      ["cenprojekt", "Dodaj do projektu…", true,
        tags.some(t=>t.cproj && n.tg.includes(t.id)) ? "✓" : ""]
    ]
  },
  grMiejsce: {
    tytul: "Gdzie leży",
    poz: n=>[
      ["verse",   (n.b?"Zmień":"Przypisz")+" werset…", true, n.b?"✓":""],
      ["miejsce", "Miejsce w publikacji…", true, n.pw?"✓":""],
      ["ptb",     "Zakładka ogólna lub publikacji…", true, n.ptb?"✓":""],
      ["stb",     "Zakładka w sekcji…", (typeof secTabs!=="undefined" && secTabs.length>0), n.stb?"✓":""]
    ]
  },
  grWyglad: {
    tytul: "Wygląd notatki",
    poz: n=>[
      ["wysokosc", "Wysokość notatki…", true, (n.wys!==undefined)?"✓":""],
      ["tlo",      "Tło notatki…", true, n.bg?"●":""]
    ]
  },
  /* „Wyślij na inne urządzenie" zostaje w menu głównym, nie tutaj. To była
     kiedyś usterka zgłoszona wprost — na telefonie polecenie bywało poza
     zasięgiem i trafiało się w sąsiednią pozycję. Schowanie go o poziom niżej
     cofałoby tamtą poprawkę. Tu zostaje sam zapis do pliku, sięgany rzadko. */
  grZapis: {
    tytul: "Zapisz jako plik",
    poz: ()=>[
      ["doc", "Word (.doc)", true, ""],
      ["pdf", "PDF / Drukuj", true, ""]
    ]
  }
};

/**
 * Otwiera podmenu grupy.
 * Buduje je w tym samym elemencie co menu główne — dzięki temu zamykanie,
 * umiejscawianie i obsługa dotyku działają tak samo, bez drugiego zestawu
 * reguł do utrzymania.
 */
function podmenuNotatki(klucz, n, kotwica){
  const grupa = GRUPY_NOTATKI[klucz]; if(!grupa || !n) return;
  const dd = $("dropdown");
  const pozycje = grupa.poz(n).filter(p=>p[2]);
  dd.innerHTML =
    `<div class="dd-lbl">${esc(grupa.tytul)}</div>` +
    pozycje.map(([x, nazwa, , znak])=>
      `<div data-x="${x}">${esc(nazwa)}${znak?` <span class="ddZnak"${x==="tlo"&&n.bg?` style="color:${esc(n.bg)}"`:""}>${znak}</span>`:""}</div>`
    ).join("") +
    `<div class="dd-sep"></div>` +
    /* Powrót, a nie samo zamknięcie: podmenu wybiera się zwykle po to, żeby
       coś ustawić, a potem sprawdzić coś jeszcze w menu głównym. */
    `<div data-x="wroc">‹ Wróć</div>`;
  dd.style.display = "block";
  if(typeof oznaczPozycjeMenu==="function") oznaczPozycjeMenu(dd);
  placeDropdown(dd, kotwica);

  dd.onclick = ev=>{
    const it = ev.target.closest("[data-x]"); if(!it) return;
    const x = it.dataset.x;
    if(x === "wroc"){
      dd.style.display = "none";
      /* Menu główne otwieramy tą samą drogą, którą otwiera je użytkownik —
         przez przycisk „⋯" na karcie. Budowanie go tutaj drugi raz znaczyłoby
         dwa opisy tego samego menu, które musiałyby zgadzać się na zawsze. */
      const przycisk = kotwica.querySelector && kotwica.querySelector('[data-act="more"]');
      if(przycisk) setTimeout(()=>przycisk.click(), 30);
      return;
    }
    dd.style.display = "none";
    wykonajZMenuNotatki(x, n, kotwica);
  };
}

/** Wykonuje pozycję z podmenu. Jedno miejsce dla wszystkich grup. */
function wykonajZMenuNotatki(x, n, kotwica){
  if(x==="cenq" || x==="ceni"){
    if(typeof centrumToggleNotatki==="function") centrumToggleNotatki(n, x);
    return;
  }
  if(x==="cenprojekt"){
    if(typeof centrumMenuProjektow==="function") setTimeout(()=>centrumMenuProjektow(n, kotwica),40);
    return;
  }
  if(x==="ptb"){ setTimeout(()=>pubTabMenu(n, kotwica), 40); return; }
  if(x==="stb"){ setTimeout(()=>menuZakladek(kotwica, n, "note"), 40); return; }
  if(x==="wysokosc" && typeof menuWysokosci==="function"){
    setTimeout(()=>menuWysokosci(n, kotwica), 40); return; }
  if(x==="tlo" && typeof menuTlaNotatki==="function"){
    setTimeout(()=>menuTlaNotatki(n, kotwica), 40); return; }
  if(x==="verse"){ assignVerse(n); return; }
  if(x==="miejsce" && typeof ustawMiejsceWPublikacji==="function"){ ustawMiejsceWPublikacji(n.g); return; }
  if(x==="wyslij" && typeof wyslijNotatke==="function"){ wyslijNotatke(n.g); return; }
  if(x==="doc"){ exportNoteWord(n); return; }
  if(x==="pdf"){ exportNotePdf(n); return; }
}
