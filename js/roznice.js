/* ==========================================================================
   JW Study — roznice.js
   ROZSTRZYGANIE RÓŻNIC PO WCZYTANIU KOPII Z JW LIBRARY

   Droga powrotna z JW Library istniała od dawna, ale rozstrzygała po cichu
   i w obie strony gubiła pracę:

   • notatkę zmienioną TUTAJ import pomijał w całości — wersja z JW Library
     znikała bez słowa, doliczona do „pominięto";
   • notatkę zmienioną TYLKO w JW Library nadpisywał i przy okazji kasował
     formatowanie oraz zdjęcia. JW Library trzyma notatki jako czysty tekst,
     więc nie miał ich skąd odtworzyć — i nikt się o tym nie dowiadywał.

   Obie decyzje bywają słuszne. Żadnej nie da się podjąć za kogoś, bo tylko
   autor wie, która wersja jest tą właściwą. Pokazujemy więc oba teksty obok
   siebie i pytamy — ale TYLKO o notatki, które naprawdę się rozjechały.
   Nowe i niezmienione wchodzą bez pytania, jak dotąd.
   ========================================================================== */
"use strict";

let _roznice = [];          // lista do rozstrzygnięcia
let _wybory  = {};          // guid → "moja" | "biblioteka"

/** Krótki podgląd tekstu — tyle, żeby rozpoznać notatkę, nie żeby ją czytać. */
function skrotTekstu(t, ile){
  const czysty = String(t||"").replace(/\s+/g," ").trim();
  if(!czysty) return "<i>(pusta)</i>";
  return esc(czysty.length > ile ? czysty.slice(0, ile) + "…" : czysty);
}
function dataPolska(iso){
  if(!iso) return "—";
  const d = new Date(iso);
  if(isNaN(d)) return "—";
  return d.toLocaleDateString("pl", {day:"numeric", month:"long", year:"numeric"}) +
         " " + d.toTimeString().slice(0,5);
}

/** Buduje wiersz jednej różnicy. */
function wierszRoznicy(r){
  const wybor = _wybory[r.g] || "moja";
  /* Ostrzeżenie pokazujemy tylko tam, gdzie jest co stracić — przy notatce bez
     formatowania byłoby szumem, a szum uczy klikać bez czytania. */
  const strata = r.zeZdjeciem ? "formatowanie i zdjęcia"
               : r.zFormatowaniem ? "formatowanie" : "";
  return `<div class="roz" data-roz="${esc(r.g)}">
    <div class="roz-tyt">${skrotTekstu(r.moja.t || r.biblioteka.t, 70)}</div>
    <div class="roz-powod">${esc(r.powod)}</div>
    <div class="roz-pary">
      <label class="roz-opcja${wybor==="moja"?" wybrana":""}">
        <input type="radio" name="roz-${esc(r.g)}" value="moja"${wybor==="moja"?" checked":""}>
        <span class="roz-skad">Ta z aplikacji</span>
        <span class="roz-data">${esc(dataPolska(r.moja.mo))}</span>
        <span class="roz-tresc">${skrotTekstu(r.moja.c, 260)}</span>
        ${strata?`<span class="roz-uwaga">zachowuje ${esc(strata)}</span>`:""}
      </label>
      <label class="roz-opcja${wybor==="biblioteka"?" wybrana":""}">
        <input type="radio" name="roz-${esc(r.g)}" value="biblioteka"${wybor==="biblioteka"?" checked":""}>
        <span class="roz-skad">Ta z JW Library</span>
        <span class="roz-data">${esc(dataPolska(r.biblioteka.mo))}</span>
        <span class="roz-tresc">${skrotTekstu(r.biblioteka.c, 260)}</span>
        ${strata?`<span class="roz-uwaga ostrz">usunie ${esc(strata)}</span>`:""}
      </label>
    </div>
  </div>`;
}

function rysujRoznice(){
  const box = $("rozLista"); if(!box) return;
  setHtml(box, _roznice.map(wierszRoznicy).join(""));
  const ile = _roznice.filter(r=>(_wybory[r.g]||"moja")==="biblioteka").length;
  setText($("rozPodsum"), ile
    ? "Zastąpisz notatek: " + ile + " z " + _roznice.length
    : "Nic nie zostanie zastąpione — wszystkie zostają takie, jak tutaj.");
}

/** Pokazuje okno różnic. Zwraca liczbę notatek faktycznie zastąpionych. */
function pokazRoznice(lista){
  _roznice = Array.isArray(lista) ? lista : [];
  _wybory = {};
  /* DOMYŚLNIE ZOSTAJE TO, CO TUTAJ. Wybór domyślny musi być tym, który niczego
     nie niszczy — zamknięcie okna bez czytania ma zostawić notatki w spokoju,
     a nie skasować formatowanie kilkudziesięciu z nich. */
  _roznice.forEach(r=>{ _wybory[r.g] = "moja"; });
  if(!_roznice.length) return Promise.resolve(0);

  return new Promise(zakoncz=>{
    setText($("rozIle"), String(_roznice.length));
    rysujRoznice();
    openModal("modalRoznice");

    const posprzataj = ()=>{
      $("rozLista").onchange = null;
      $("rozWszystkieMoje").onclick = null;
      $("rozWszystkieBiblioteka").onclick = null;
      $("rozZastosuj").onclick = null;
      $("rozAnuluj").onclick = null;
    };

    $("rozLista").onchange = e=>{
      const pole = e.target.closest && e.target.closest('input[type="radio"]');
      const wiersz = pole && pole.closest("[data-roz]");
      if(!pole || !wiersz) return;
      _wybory[wiersz.dataset.roz] = pole.value;
      rysujRoznice();
    };
    $("rozWszystkieMoje").onclick = ()=>{
      _roznice.forEach(r=>{ _wybory[r.g]="moja"; }); rysujRoznice(); };
    $("rozWszystkieBiblioteka").onclick = ()=>{
      _roznice.forEach(r=>{ _wybory[r.g]="biblioteka"; }); rysujRoznice(); };
    $("rozAnuluj").onclick = ()=>{
      posprzataj(); closeModal("modalRoznice"); zakoncz(0); };
    $("rozZastosuj").onclick = async ()=>{
      const przycisk = $("rozZastosuj");
      przycisk.disabled = true;
      try{
        const ile = await zastosujWybory();
        posprzataj(); closeModal("modalRoznice"); zakoncz(ile);
      }catch(e){
        przycisk.disabled = false;
        reportSaveError(e, "różnice z JW Library");
      }
    };
  });
}

/** Wprowadza wybory w życie. Zwraca liczbę zastąpionych notatek. */
async function zastosujWybory(){
  const operacje = [];
  _roznice.forEach(r=>{
    if((_wybory[r.g]||"moja") !== "biblioteka") return;
    const n = notes.find(x=>x.g===r.g);
    if(!n) return;
    const nowa = Object.assign({}, n, {
      t: r.biblioteka.t,
      c: r.biblioteka.c,
      h: null,                  // JW Library nie ma formatowania — nie ma czego wstawić
      mo: r.biblioteka.mo || n.mo,
      ed: false                 // od tej chwili zgadza się z biblioteką
    });
    operacje.push({stara:n, nowa});
  });
  if(operacje.length){
    /* Najpierw zapisujemy wszystkie wybrane wersje, a dopiero po potwierdzeniu
       transakcji zmieniamy obiekty widoczne w aplikacji. Błąd miejsca lub
       przerwanie zapisu nie może zostawić ekranu w stanie innym niż baza. */
    if(idb) await idbBulkChunked("notes", operacje.map(x=>x.nowa));
    operacje.forEach(({stara, nowa})=>{
      if(typeof saveVersion==="function") saveVersion(stara);
      if(typeof pushUndo==="function" && typeof cloneNote==="function")
        pushUndo({type:"note", label:"zastąpienie notatki wersją z JW Library", before:cloneNote(stara)});
      Object.assign(stara, nowa);
    });
    renderAll();
  }
  return operacje.length;
}
