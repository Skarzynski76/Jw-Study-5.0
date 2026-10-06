/* ==========================================================================
   JW Study — przenoszenie.js
   PRZECIĄGANIE NOTATEK NA ETYKIETY I ZAKŁADKI

   Karta notatki miała uchwyt do przeciągania, ale oparty na mechanizmie
   przeglądarki, który NIE DZIAŁA DOTYKIEM. Na iPadzie i telefonie nie dało się
   przeciągnąć nic — zostawało menu ⋯ i przenoszenie „o jeden krok".

   Notatkę łapiesz za uchwyt ⠿ w jej belce i upuszczasz tam, gdzie ma trafić:
     • na etykietę        → notatka dostaje tę etykietę
     • na zakładkę sekcji → notatka trafia do tej zakładki
     • na zakładkę publikacji → notatka trafia do tamtej zakładki
   ========================================================================== */
"use strict";

let _celPrzenoszenia = null;  // podświetlony cel

/** Cele, na które wolno upuścić notatkę, wraz z opisem działania. */
function celDlaNotatki(el){
  if(!el || !el.closest) return null;
  const zakSek = el.closest("#tagList .stbItem[data-stb]");
  if(zakSek) return {el:zakSek, rodzaj:"stb", id:+zakSek.dataset.stb,
                     nazwa:(zakSek.querySelector(".nm")||{}).textContent||""};
  const zakPub = el.closest("#pubList .ptbItem[data-ptb]");
  if(zakPub) return {el:zakPub, rodzaj:"ptb", id:+zakPub.dataset.ptb,
                     nazwa:(zakPub.querySelector(".nm")||{}).textContent||""};
  const etykieta = el.closest("#tagList .item[data-k]");
  if(etykieta){
    const k = etykieta.dataset.k;
    if(k==="all" || k==="none") return null;          // to nie są miejsca do wrzucania
    return {el:etykieta, rodzaj:"tag", id:+k,
            nazwa:(etykieta.querySelector(".nm")||{}).textContent||""};
  }
  return null;
}
/** Zakładka ogólna jest celem dla etykiety, kategorii, rocznika albo publikacji. */
function celDlaPublikacji(el){
  if(!el || !el.closest) return null;
  const wiersz=el.closest("#pubList .ptbItem[data-ptb]");
  if(!wiersz) return null;
  const tab=pubTabs.find(x=>x.id===+wiersz.dataset.ptb && x.ks==="*");
  if(!tab) return null;
  return {el:wiersz, rodzaj:"ptbPub", id:tab.id, nazwa:tab.name};
}
function podswietlCel(cel){
  if(_celPrzenoszenia && _celPrzenoszenia.el!==((cel||{}).el))
    _celPrzenoszenia.el.classList.remove("dropTarget");
  if(cel) cel.el.classList.add("dropTarget");
  _celPrzenoszenia = cel;
}
function zakonczPodswietlenie(){
  if(_celPrzenoszenia) _celPrzenoszenia.el.classList.remove("dropTarget");
  _celPrzenoszenia = null;
}

/** Wykonuje upuszczenie notatki na wskazanym celu. */
function upusc(n, cel){
  if(!n || !cel) return;
  if(cel.rodzaj==="stb" && typeof setNoteSecTab==="function"){ setNoteSecTab(n, cel.id); return; }
  if(cel.rodzaj==="ptb" && typeof setNotePubTab==="function"){ setNotePubTab(n, cel.id); return; }
  if(cel.rodzaj==="tag"){
    if(n.tg.includes(cel.id)){ toast("Notatka już ma etykietę „"+cel.nazwa.trim()+"”"); return; }
    n.tg.push(cel.id); n.tgd = true;
    markDirty(n); renderAll();
    toastOk("Dodano etykietę „"+cel.nazwa.trim()+"”");
  }
}

/* Sam gest — chwycenie karty i prowadzenie jej palcem — obsługuje
   34-chwytanie.js. Tutaj zostaje to, CO wolno zrobić z upuszczoną notatką:
   rozpoznanie celu (celDlaNotatki), podświetlenie go i samo przypisanie.
   Jeden gest, jedno miejsce obsługi — inaczej dwa nasłuchy biją się o palec. */

/* ===== PRZENIESIENIE ZAKŁADKI DO INNEJ SEKCJI =====
   Przeciąganie porządkuje zakładki w obrębie jednej sekcji. Przeniesienie do
   INNEJ sekcji przez przeciąganie byłoby niepewne (sekcja bywa zwinięta albo
   poza ekranem), więc jest osobną pozycją w menu — działa zawsze i wszędzie. */
async function przeniesZakladkeDoSekcji(id){
  const z = secTabs.find(x=>x.id===id); if(!z) return;
  const inne = sections.filter(s=>s.id!==z.sec).sort((a,b)=>(a.ord??0)-(b.ord??0));
  if(!inne.length){ toast("Nie ma innej sekcji, do której można przenieść"); return; }
  const wybor = await askChoice("Przenieś zakładkę „"+z.name+"”",
    "<p class=\"ch-lead\">Do której sekcji?</p>",
    inne.map(s=>({label:s.name, value:String(s.id)})).concat([{label:"Anuluj", value:""}]));
  if(!wybor) return;
  z.sec = +wybor;
  z.ord = secTabsFor(z.sec).length;      // na koniec listy w nowej sekcji
  /* Etykiety przypisane do tej zakładki idą razem z nią — inaczej zostałyby
     w starej sekcji, wskazując zakładkę, której tam już nie ma. */
  tags.forEach(t=>{ if(t.stb===id) t.sec = z.sec; });
  saveSecTabs(); saveTags(); renderAll();
  const s = sections.find(x=>x.id===z.sec);
  toastOk("Zakładka „"+z.name+"” w sekcji „"+(s?s.name:"")+"”");
}
