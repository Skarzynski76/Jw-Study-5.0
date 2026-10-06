/* ==========================================================================
   JW Study — przypomnienie.js
   PRZYPOMNIENIE O KOPII, KTÓRE DA SIĘ OD RAZU WYKONAĆ

   Dotąd przypomnienie było w dwóch miejscach i żadne nie prowadziło do celu:

   • przy starcie — znikający dymek „Warto zrobić kopię danych, kliknij 💾 na
     górze". Znikał po kilku sekundach, a jego treścią była INSTRUKCJA SZUKANIA
     przycisku. Jeśli akurat patrzyłeś na notatkę, przepadał bez śladu;
   • przy zamykaniu — okno przeglądarki „czy na pewno wyjść". Pojawia się
     w chwili, gdy człowiek już wychodzi, i jedyne, co da się z nim zrobić, to
     zostać. Zrobić kopii wtedy nie można.

   Teraz jest jedno miejsce: pasek, który zostaje do czasu, aż coś z nim
   zrobisz, i ma na sobie PRZYCISK ROBIĄCY KOPIĘ. Zero szukania.

   ODKŁADANIE MIERZYMY ZMIANAMI, NIE ZEGAREM. „Później" znaczy: wróć, gdy
   uzbiera się kolejna porcja pracy. Przypomnienie po czasie wraca tak samo
   natrętne niezależnie od tego, czy coś się zmieniło — a to uczy je zamykać
   odruchowo, bez czytania.
   ========================================================================== */
"use strict";

const PROG_ZMIAN   = 20;    // tyle zmian od ostatniej kopii wywołuje przypomnienie
const PROG_DNI     = 14;    // albo tyle dni, choćby zmian było mało
const KLUCZ_ODLOZ  = "KopiaOdlozonaPrzy";   // ile zmian było, gdy odłożyłeś

let _pasekKopii = null;

/** Ile zmian od ostatniej kopii. */
function zmianOdKopii(){
  return +(lsGet(KP+"Dirty", 0) || 0);
}
/** Przy ilu zmianach ostatnio odłożyłeś przypomnienie. */
function odlozonePrzy(){
  return +(lsGet(KP+KLUCZ_ODLOZ, 0) || 0);
}
/**
 * Czy pokazać przypomnienie.
 * Po odłożeniu wraca dopiero, gdy przybędzie KOLEJNA pełna porcja zmian —
 * dzięki temu narasta razem z tym, co jest do stracenia, zamiast po zegarze.
 */
function czasNaPrzypomnienie(){
  const zmian = zmianOdKopii();
  if(zmian <= 0) return false;
  const dni = (typeof backupDaysAgo==="function") ? backupDaysAgo() : null;
  const powod = (zmian >= PROG_ZMIAN) || (dni === null) || (dni >= PROG_DNI);
  if(!powod) return false;
  return zmian >= odlozonePrzy() + PROG_ZMIAN || odlozonePrzy() === 0;
}

function opisZmian(ile){
  const forma = ile===1 ? "zmiana"
              : (ile%10>=2 && ile%10<=4 && (ile%100<12 || ile%100>14)) ? "zmiany" : "zmian";
  return ile + " " + forma;
}

/** Buduje pasek raz; kolejne wywołania tylko go pokazują. */
function pasekKopii(){
  if(_pasekKopii) return _pasekKopii;
  const p = document.createElement("div");
  p.id = "pasekKopii";
  p.setAttribute("role", "status");
  p.innerHTML =
    '<span class="pk-ic" aria-hidden="true">💾</span>' +
    '<span class="pk-txt"></span>' +
    '<button class="btn primary pk-teraz" type="button">Zrób kopię</button>' +
    '<button class="btn pk-pozniej" type="button">Później</button>';
  document.body.appendChild(p);

  p.querySelector(".pk-teraz").addEventListener("click", async ()=>{
    schowajPasekKopii();
    /* Kopia idzie tą samą drogą co z przycisku na pasku górnym — jedna droga,
       jedno zachowanie. Na iPadzie otworzy się okno udostępniania systemu. */
    if(typeof exportJson === "function") await exportJson();
  });
  p.querySelector(".pk-pozniej").addEventListener("click", ()=>{
    lsSet(KP+KLUCZ_ODLOZ, String(zmianOdKopii()));
    schowajPasekKopii();
  });
  _pasekKopii = p;
  return p;
}

function pokazPasekKopii(){
  if(!czasNaPrzypomnienie()) return false;
  const p = pasekKopii();
  const dni = (typeof backupDaysAgo==="function") ? backupDaysAgo() : null;
  const ile = zmianOdKopii();
  /* Mówimy, ILE jest do stracenia i OD KIEDY — sama zachęta „warto zrobić
     kopię" nie daje podstawy do decyzji. */
  const kiedy = dni === null ? "Nie masz jeszcze żadnej kopii."
              : dni === 0    ? "Ostatnia kopia jest z dzisiaj."
              : dni === 1    ? "Ostatnia kopia jest z wczoraj."
              :                "Ostatnia kopia sprzed " + dni + " dni.";
  setText(p.querySelector(".pk-txt"), kiedy + " Od tego czasu: " + opisZmian(ile) + ".");
  p.classList.add("widoczny");
  return true;
}
function schowajPasekKopii(){
  if(_pasekKopii) _pasekKopii.classList.remove("widoczny");
}

/* Po udanej kopii licznik odłożenia traci sens — następnym razem przypomnienie
   ma zacząć liczyć od zera, a nie od starego progu. */
function zapomnijOdlozenie(){
  lsSet(KP+KLUCZ_ODLOZ, "0");
}

/* Sprawdzamy przy każdej zmianie licznika, ale pasek pokazujemy najwyżej raz
   na uruchomienie — przypomnienie wracające co chwilę przestaje być
   przypomnieniem, a staje się przeszkodą. */
let _juzPokazano = false;
function sprawdzKopie(){
  if(_juzPokazano) return;
  if(pokazPasekKopii()) _juzPokazano = true;
}
