/* ==========================================================================
   JW Study — powtorki.js
   POWRÓT DO WYBRANYCH NOTATEK

   Klasyczne powtórki — te z fiszek — polegają na tym, że po każdej kartce
   oceniasz się „umiem / nie umiem", a program sam dosypuje materiał. Przy
   kilkunastu tysiącach notatek to nie ma prawa zadziałać: samo przejrzenie
   zaległości zajęłoby lata, a notatka ze studium nie jest fiszką z pytaniem.

   Dlatego tutaj NIC NIE DZIEJE SIĘ SAMO. To Ty wskazujesz notatkę, do której
   chcesz wrócić, i mówisz kiedy. Zaległości nie mogą urosnąć, bo nie ma
   materiału, którego byś nie wybrał.

   Trzy odstępy, nie dziesięć. Wybór spośród trzech zajmuje chwilę; spośród
   dziesięciu zamienia proste „przypomnij mi” w zadanie do przemyślenia.

   Pole w notatce: n.pwt = {d:"RRRR-MM-DD", o:7|30|90}
     d — dzień, w którym notatka ma wrócić
     o — ostatnio wybrany odstęp, żeby „jeszcze raz" nie pytało od nowa
   ========================================================================== */
"use strict";

/* Nazwa z przedrostkiem, bo moduły dzielą JEDNĄ przestrzeń nazw: samo
   „ODSTEPY" jest już zajęte przez odstępy akapitów w edytorze, a powtórzony
   `const` nie jest ostrzeżeniem — to błąd składni, który wywala CAŁY plik
   i wszystko, co w nim jest. */
const ODSTEPY_POWTORKI = [
  {dni:7,  nazwa:"Za tydzień"},
  {dni:30, nazwa:"Za miesiąc"},
  {dni:90, nazwa:"Za kwartał"}
];

/** Dzisiejsza data jako RRRR-MM-DD (bez godziny — powtórka to sprawa dnia). */
function dzisRRMMDD(){
  const t = new Date();
  return t.getFullYear() + "-" + String(t.getMonth()+1).padStart(2,"0") + "-" +
         String(t.getDate()).padStart(2,"0");
}
function zaIleDni(dni){
  const t = new Date();
  t.setDate(t.getDate() + dni);
  return t.getFullYear() + "-" + String(t.getMonth()+1).padStart(2,"0") + "-" +
         String(t.getDate()).padStart(2,"0");
}
/** Czy notatka czeka na powrót DZIŚ albo wcześniej. */
function czekaNaPowrot(n){
  return !!(n && !n.del && n.pwt && n.pwt.d && n.pwt.d <= dzisRRMMDD());
}
/** Czy notatka ma umówiony powrót — dziś albo kiedyś. */
function maPowtorke(n){
  return !!(n && n.pwt && n.pwt.d);
}
/* Licznika „ile na dziś" nie ma tutaj świadomie: chipy nad listą liczą
   wszystkie swoje wartości w JEDNYM przebiegu po notatkach. Osobna funkcja
   znaczyłaby drugi przebieg po kilkunastu tysiącach notatek przy każdym
   przerysowaniu — po to samo. */

function ustawPowtorke(guid, dni){
  const n = notes.find(x=>x.g===guid); if(!n) return;
  n.pwt = {d: zaIleDni(dni), o: dni};
  /* Umówienie powrotu to nie zmiana treści — nie oznaczamy notatki jako
     zmienionej, bo trafiłaby do eksportu do JW Library, gdzie tego pojęcia
     nie ma, i podbiłaby licznik zmian bez kopii. */
  /* Magazyn notatek ma klucz W REKORDZIE (keyPath "g"), więc podanie klucza
     osobno kończy się błędem „the key parameter was provided" i powtórka NIE
     ZAPISUJE SIĘ — po odświeżeniu strony przepada. Wyszło to przy pierwszym
     uzgadnianiu między urządzeniami: powtórki nie miały jak nigdzie pojechać,
     bo nie było ich nawet w bazie na urządzeniu. */
  if(idb) idbPut("notes", n).catch(e=>reportSaveError(e,"powtórka"));
  renderNotes();
  const opis = (ODSTEPY_POWTORKI.find(o=>o.dni===dni)||{}).nazwa || ("za "+dni+" dni");
  toastOk("Wróci do Ciebie: " + opis.toLowerCase().replace("za ","za ") + " (" + n.pwt.d + ")");
}
function usunPowtorke(guid, cicho){
  const n = notes.find(x=>x.g===guid); if(!n || !n.pwt) return;
  delete n.pwt;
  if(idb) idbPut("notes", n).catch(e=>reportSaveError(e,"powtórka"));   // patrz uwaga wyżej
  renderNotes();
  if(!cicho) toastOk("Nie będę już o niej przypominać");
}

/** Menu wyboru odstępu — z jednego miejsca, i przy ustawianiu, i przy powrocie. */
function menuPowtorki(n, kotwica){
  const dd = $("dropdown");
  dd.innerHTML =
    '<div class="dd-lbl">Przypomnij o tej notatce</div>' +
    ODSTEPY_POWTORKI.map(o=>`<div data-pwt="${o.dni}">${(typeof IC_CLOCK!=="undefined"?IC_CLOCK:"")}${esc(o.nazwa)}` +
      `${(n.pwt && n.pwt.o===o.dni)?' <span class="ddZnak">✓</span>':""}</div>`).join("") +
    (maPowtorke(n)
      ? '<div class="dd-sep"></div><div data-pwt="0" class="dd-danger">Nie przypominaj</div>'
      : "");
  dd.style.display = "block";
  if(typeof oznaczPozycjeMenu==="function") oznaczPozycjeMenu(dd);
  placeDropdown(dd, kotwica);
  dd.onclick = ev=>{
    const it = ev.target.closest("[data-pwt]"); if(!it) return;
    dd.style.display = "none";
    const dni = +it.dataset.pwt;
    if(dni > 0) ustawPowtorke(n.g, dni); else usunPowtorke(n.g);
  };
}

/* ===== PASEK W NOTATCE, KTÓRA WŁAŚNIE WRÓCIŁA =====
   Notatka czekająca na dziś dostaje jeden wiersz nad treścią. Bez niego
   powrót byłby niemy: notatka pojawiłaby się na liście, a Ty nie miałbyś jak
   powiedzieć „przeczytane, przypomnij za miesiąc" bez wchodzenia w menu. */
function htmlPaskaPowtorki(n){
  if(!czekaNaPowrot(n)) return "";
  const spozn = n.pwt.d < dzisRRMMDD();
  return `<div class="pwtPasek" data-pwtg="${esc(n.g)}">` +
    `<span class="pwtTxt">${spozn ? "Miała wrócić " + esc(n.pwt.d) : "Wraca dzisiaj"}</span>` +
    `<button type="button" class="pwtBtn" data-pwtakcja="jeszcze">Jeszcze raz</button>` +
    `<button type="button" class="pwtBtn" data-pwtakcja="koniec">Gotowe</button>` +
  `</div>`;
}

document.addEventListener("click", e=>{
  const cel = e.target && e.target.closest ? e.target : null;
  if(!cel) return;
  const przycisk = cel.closest("[data-pwtakcja]");
  if(!przycisk) return;
  const pasek = przycisk.closest("[data-pwtg]"); if(!pasek) return;
  e.preventDefault(); e.stopPropagation();
  const n = notes.find(x=>x.g===pasek.dataset.pwtg); if(!n) return;
  if(przycisk.dataset.pwtakcja === "koniec"){ usunPowtorke(n.g); return; }
  /* „Jeszcze raz" powtarza ostatnio wybrany odstęp — najczęstszy przypadek
     załatwia jednym dotknięciem, zamiast pytać o to samo co miesiąc. */
  ustawPowtorke(n.g, (n.pwt && n.pwt.o) || 30);
});
