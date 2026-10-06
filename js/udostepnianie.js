/* ==========================================================================
   JW Study — udostepnianie.js
   WYSŁANIE POJEDYNCZEJ ETYKIETY ALBO ZAKŁADKI NA INNE URZĄDZENIE

   Kopia zapasowa przenosi wszystko. Czasem trzeba przenieść jedną rzecz:
   etykietę „Kongres 2026" razem z jej sześćdziesięcioma notatkami, bez
   ruszania reszty.

   Powstający plik ma DOKŁADNIE TEN SAM kształt co pełna kopia — jest po prostu
   jej wycinkiem. Dzięki temu po drugiej stronie nie trzeba niczego nowego:
   wczytujesz go zwykłym „Dołącz + układ", a notatki trafiają na swoje miejsce
   razem z etykietą, sekcją i zakładką.

   Na iPadzie i iPhonie zapis otwiera okno udostępniania, więc plik da się
   wysłać przez AirDrop wprost na drugie urządzenie.
   ========================================================================== */
"use strict";

/** Niezależna kopia danych — bez odniesień do tego, co siedzi w aplikacji. */
function kopiaGleboka(co){
  if(typeof structuredClone === "function"){
    try{ return structuredClone(co); }catch(e){}
  }
  return co.map(x=>Object.assign({}, x));
}

/** Bezpieczna nazwa pliku z nazwy etykiety albo zakładki. */
function nazwaPliku(rodzaj, nazwa){
  const czysta = String(nazwa||"").trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40) || "wycinek";
  return "jw-" + rodzaj + "-" + czysta + ".json";
}

/**
 * Buduje wycinek danych do wysłania.
 * @param {Note[]} notatki  notatki, które mają pojechać
 * @param {number[]} idEtykiet  etykiety do dołączenia
 * @param {number[]} idZakladek  zakładki sekcji do dołączenia
 */
function zbudujWycinek(notatki, idEtykiet, idZakladek){
  const etykiety = tags.filter(t=>idEtykiet.includes(t.id));
  const zakladki = (typeof secTabs!=="undefined")
    ? secTabs.filter(z=>idZakladek.includes(z.id)) : [];

  /* Sekcje, do których należą wysyłane etykiety i zakładki — bez nich
     po drugiej stronie wszystko wylądowałoby luzem. */
  const idSekcji = new Set();
  etykiety.forEach(t=>{ if(t.sec!=null) idSekcji.add(t.sec); });
  zakladki.forEach(z=>{ if(z.sec!=null) idSekcji.add(z.sec); });
  const sekcje = sections.filter(s=>idSekcji.has(s.id));

  /* Zakładki publikacji, do których przypisano wysyłane notatki — inaczej
     przypisanie zostałoby odrzucone jako wskazujące na nieznaną zakładkę. */
  const idPub = new Set();
  notatki.forEach(n=>{ if(n.ptb) idPub.add(n.ptb); });
  const zakladkiPub = (typeof pubTabs!=="undefined")
    ? pubTabs.filter(z=>idPub.has(z.id)) : [];

  /* Kopiujemy, żeby wysyłany plik nie trzymał odniesień do danych aplikacji —
     inaczej późniejsza zmiana notatki zmieniłaby też to, co „już wysłane". */
  return {
    tags: kopiaGleboka(etykiety),
    notes: kopiaGleboka(notatki),
    sections: kopiaGleboka(sekcje),
    pubTabs: kopiaGleboka(zakladkiPub),
    secTabs: kopiaGleboka(zakladki)
  };
}

/** Ile miejsca zajmą zdjęcia — warto wiedzieć przed wysłaniem przez AirDrop. */
function opisWycinka(dane){
  const tekst = JSON.stringify(dane);
  const zdjec = dane.notes.reduce((s,n)=>s+((n.h||"").match(/<img/gi)||[]).length, 0);
  const mb = tekst.length >= 1048576
    ? (tekst.length/1048576).toFixed(1)+" MB"
    : Math.round(tekst.length/1024)+" kB";
  return {tekst, zdjec, rozmiar: mb};
}

/** Wspólne zakończenie: pytanie, zapis, potwierdzenie. */
async function wyslijWycinek(dane, rodzaj, nazwa){
  if(!dane.notes.length){
    showInfo("Nie ma czego wysłać", "Pod tą pozycją nie ma jeszcze żadnej notatki.");
    return;
  }
  const {tekst, zdjec, rozmiar} = opisWycinka(dane);
  const ok = await askConfirm("Wysłać „"+nazwa+"”?",
    `Do pliku trafi:<br>`+
    `• Notatek: <b>${dane.notes.length}</b>`+
    (zdjec ? ` (w tym zdjęć: ${zdjec})` : "")+`<br>`+
    (dane.tags.length ? `• Etykiet: <b>${dane.tags.length}</b><br>` : "")+
    (dane.secTabs.length ? `• Zakładek: <b>${dane.secTabs.length}</b><br>` : "")+
    (dane.sections.length ? `• Sekcji: <b>${dane.sections.length}</b><br>` : "")+
    `• Rozmiar: <b>${rozmiar}</b><br><br>`+
    `Na drugim urządzeniu otwórz kopię zapasową, wskaż ten plik i wybierz `+
    `<b>„Dołącz + układ"</b>. Nic tam nie zostanie skasowane — dojdą tylko `+
    `te notatki.`,
    {okLabel:"Zapisz plik"});
  if(!ok) return;

  const plik = nazwaPliku(rodzaj, nazwa);
  /* saveFile mówi teraz, czy plik NAPRAWDĘ wyszedł z aplikacji. Wcześniej
     zawsze zwracał prawdę, więc na iPhonie z ekranu głównego pokazywaliśmy
     „Zapisano", choć nie powstawało nic. */
  const wyszlo = await saveFile(new Blob([tekst], {type:"application/json"}), plik, "JW Study — "+nazwa);
  if(wyszlo) toastOk("Zapisano: "+plik);
}

/** Wysyła etykietę razem ze wszystkimi jej notatkami. */
async function wyslijEtykiete(idEtykiety){
  const t = tags.find(x=>x.id===idEtykiety);
  if(!t) return;
  const notatki = notes.filter(n=>!n.del && n.tg.includes(t.id));
  await wyslijWycinek(zbudujWycinek(notatki, [t.id], []), "etykieta", t.name);
}

/**
 * Wysyła zakładkę sekcji: notatki wrzucone do niej wprost ORAZ te, które
 * należą do niej przez swoje etykiety — tak samo, jak pokazuje ją aplikacja.
 */
async function wyslijZakladke(idZakladki){
  const z = secTabs.find(x=>x.id===idZakladki);
  if(!z) return;
  const etykietyZakladki = tags.filter(t=>t.stb===z.id).map(t=>t.id);
  const notatki = notes.filter(n=>!n.del && notatkaWZakladce(n, z.id));
  await wyslijWycinek(zbudujWycinek(notatki, etykietyZakladki, [z.id]), "zakladka", z.name);
}

/**
 * Wysyła JEDNĄ notatkę.
 *
 * Zabiera ze sobą swoje etykiety, a przez nie sekcje i zakładki — inaczej po
 * drugiej stronie notatka wylądowałaby luzem w ogólnym zbiorze, a przypisania
 * zostałyby odrzucone jako wskazujące na nieznane etykiety.
 */
async function wyslijNotatke(guid){
  const n = notes.find(x=>x.g===guid && !x.del);
  if(!n) return;
  const idEtykiet = (n.tg||[]).filter(id=>tags.some(t=>t.id===id));
  /* Zakładka sekcji notatki oraz zakładki jej etykiet — komplet, żeby układ
     po drugiej stronie odtworzył się tak, jak wygląda tutaj. */
  const idZakladek = new Set();
  if(n.stb) idZakladek.add(n.stb);
  tags.forEach(t=>{ if(idEtykiet.includes(t.id) && t.stb) idZakladek.add(t.stb); });
  const nazwa = (n.t||"").trim() || (typeof refLabel==="function" ? refLabel(n) : "") || "Notatka";
  await wyslijWycinek(zbudujWycinek([n], idEtykiet, [...idZakladek]), "notatka", nazwa);
}

/** Wysyła zakładkę publikacji razem z jej notatkami. */
async function wyslijZakladkePub(idZakladki){
  const z = (typeof pubTabs!=="undefined") ? pubTabs.find(x=>x.id===idZakladki) : null;
  if(!z) return;
  const notatki = notes.filter(n=>!n.del &&
    (typeof pubTabHasNote==="function" ? pubTabHasNote(n,z.id) : n.ptb===z.id));
  await wyslijWycinek(zbudujWycinek(notatki, [], []), "zakladka", z.name);
}
