/* ==========================================================================
   JW Study — szablony.js
   SZABLONY NOTATEK

   W notatkach z zebrań powtarza się ten sam szkielet: data, nazwisko mówcy,
   „Komentarze", „Omówienie". Wpisywanie go od nowa przy każdej notatce to
   kilkanaście sekund i kilka pomyłek tygodniowo — a przy notowaniu na bieżąco
   liczy się każda z nich.

   Szablon powstaje z TWOJEJ notatki: bierzesz tę najlepiej ułożoną i robisz
   z niej wzorzec (menu ⋯ → „Zapisz jako szablon"). Nie ma tu gotowców
   wymyślonych przeze mnie, bo układ notatki to sprawa osobista.

   W treści szablonu działają trzy wstawki, zamieniane przy tworzeniu notatki:
     {data}     — dzisiejsza data (2026-08-15)
     {godzina}  — bieżąca godzina (16:07)
     {kursor}   — miejsce, w którym ma stanąć kursor
   ========================================================================== */
"use strict";

let szablony = [];            // [{id, nazwa, tytul, tresc, ord}]

/* ===== ZAPIS ===== */
function saveSzablony(){
  if(idb) idbPut("meta", szablony, "szablony").catch(e=>reportSaveError(e,"szablony"));
}
async function loadSzablony(){
  if(!idb) return;
  try{ const z = await idbGet("meta","szablony"); if(Array.isArray(z)) szablony = z; }catch(e){}
}
function szablonyPoKolei(){
  return szablony.filter(s=>s&&s.typ!=="fragment").slice().sort((a,b)=>(a.ord??0)-(b.ord??0));
}

/* ===== WSTAWKI =====
   Świadomie skromny zestaw. Każda kolejna wstawka to kolejna rzecz do
   zapamiętania, a te trzy pokrywają to, co w notatce z zebrania faktycznie
   zmienia się co tydzień. */
function wypelnijWstawki(tekst){
  if(!tekst) return "";
  const teraz = new Date();
  const data = teraz.getFullYear() + "-" +
               String(teraz.getMonth()+1).padStart(2,"0") + "-" +
               String(teraz.getDate()).padStart(2,"0");
  const godzina = String(teraz.getHours()).padStart(2,"0") + ":" +
                  String(teraz.getMinutes()).padStart(2,"0");
  return String(tekst)
    .replace(/\{data\}/gi, data)
    .replace(/\{godzina\}/gi, godzina);
}
/** Zwraca tekst bez znacznika kursora oraz jego położenie. */
function rozdzielKursor(tekst){
  const i = String(tekst||"").search(/\{kursor\}/i);
  if(i < 0) return {tekst:String(tekst||""), pozycja:null};
  return {tekst:String(tekst).replace(/\{kursor\}/i, ""), pozycja:i};
}

/* ===== TWORZENIE SZABLONU Z NOTATKI ===== */
async function zapiszJakoSzablon(guid){
  const n = notes.find(x=>x.g===guid && !x.del);
  if(!n) return;
  const proponowana = (n.t||"").trim().slice(0,40) || "Mój szablon";
  const nazwa = await askText({
    title:"Zapisz jako szablon",
    value: proponowana,
    placeholder:"np. Komentarz z zebrania",
    okLabel:"Zapisz szablon",
    hint:"Powstanie wzorzec z tytułu i treści tej notatki. Wstaw {data}, {godzina} albo {kursor} tam, gdzie mają działać."});
  if(nazwa===null || !nazwa.trim()) return;
  const tresc = (typeof htmlToPlain==="function" && n.h) ? htmlToPlain(n.h) : (n.c||"");
  const s = {
    id: Date.now(),
    typ: "template",
    nazwa: nazwa.trim().slice(0,60),
    tytul: (n.t||"").slice(0,200),
    tresc: String(tresc).slice(0,20000),
    ord: szablony.length * 10
  };
  szablony.push(s);
  saveSzablony();
  toastOk("Szablon „"+s.nazwa+"” zapisany — znajdziesz go w oknie nowej notatki");
}

function usunSzablon(id){
  const i = szablony.findIndex(s=>s.id===id);
  if(i<0) return;
  const nazwa = szablony[i].nazwa;
  szablony.splice(i,1);
  saveSzablony();
  rysujSzablony();
  toastOk("Usunięto szablon „"+nazwa+"”");
}
async function zmienNazweSzablonu(id){
  const s = szablony.find(x=>x.id===id); if(!s) return;
  const nazwa = await askText({title:"Nazwa szablonu", value:s.nazwa, okLabel:"Zmień"});
  if(nazwa===null || !nazwa.trim()) return;
  s.nazwa = nazwa.trim().slice(0,60);
  saveSzablony(); rysujSzablony();
}

/* ===== UŻYCIE W OKNIE NOWEJ NOTATKI ===== */
/** Wstawia szablon do pól okna. Nie kasuje tego, co użytkownik już wpisał. */
function zastosujSzablon(id){
  const s = szablony.find(x=>x.id===id); if(!s) return;
  const poleT = $("nnTitle"), poleC = $("nnContent");
  if(poleT && !poleT.value.trim()) poleT.value = wypelnijWstawki(s.tytul);
  if(poleC){
    const {tekst, pozycja} = rozdzielKursor(wypelnijWstawki(s.tresc));
    /* Doklejamy, gdy coś już jest — inaczej wybór szablonu po rozpoczęciu
       pisania kasowałby zapisane zdania. */
    const bylo = poleC.value;
    poleC.value = bylo.trim() ? (bylo.replace(/\s*$/,"") + "\n\n" + tekst) : tekst;
    poleC.focus();
    const gdzie = bylo.trim()
      ? poleC.value.length
      : (pozycja!=null ? pozycja : tekst.length);
    try{ poleC.setSelectionRange(gdzie, gdzie); }catch(e){}
  }
  const pas = $("nnSzablony");
  if(pas) pas.querySelectorAll("[data-szab]").forEach(b=>
    b.classList.toggle("wybrany", +b.dataset.szab===id));
}

/** Rysuje pasek szablonów w oknie nowej notatki. */
function rysujSzablony(){
  const pas = $("nnSzablony"); if(!pas) return;
  const lista = szablonyPoKolei();
  const karta = pas.closest(".nn-card");
  if(!lista.length){
    /* Bez szablonów pokazujemy, skąd się biorą — pusty pasek niczego nie uczy. */
    setHtml(pas, '<span class="nnSzabPusto">Nie masz jeszcze szablonów. '+
      'Otwórz notatkę o dobrym układzie, wybierz <b>⋯ → Zapisz jako szablon</b> '+
      'i będzie tutaj.</span>');
    if(karta) karta.classList.add("pusty");
    return;
  }
  if(karta) karta.classList.remove("pusty");
  setHtml(pas, lista.map(s=>
    '<span class="nnSzab">'+
      '<button type="button" class="nnSzabB" data-szab="'+s.id+'" title="Wstaw szablon">'+
        esc(s.nazwa)+'</button>'+
      '<button type="button" class="nnSzabX" data-szabmenu="'+s.id+'" '+
        'title="Zmień nazwę albo usuń" aria-label="Opcje szablonu">⋯</button>'+
    '</span>').join(""));
}

document.addEventListener("click", e=>{
  const cel = e.target && e.target.closest ? e.target : null;
  if(!cel) return;
  const uzyj = cel.closest("[data-szab]");
  if(uzyj){ e.preventDefault(); zastosujSzablon(+uzyj.dataset.szab); return; }
  const menu = cel.closest("[data-szabmenu]");
  if(menu){
    e.preventDefault(); e.stopPropagation();
    const id = +menu.dataset.szabmenu;
    const dd = $("dropdown");
    dd.innerHTML = '<div class="dd-lbl">Szablon</div>'+
      '<div data-szo="nazwa">Zmień nazwę…</div>'+
      '<div class="dd-sep"></div>'+
      '<div data-szo="usun" class="dd-danger">Usuń szablon</div>';
    dd.style.display = "block";
    if(typeof oznaczPozycjeMenu==="function") oznaczPozycjeMenu(dd);
    placeDropdown(dd, menu);
    dd.onclick = ev=>{
      const it = ev.target.closest("[data-szo]"); if(!it) return;
      dd.style.display = "none";
      if(it.dataset.szo==="nazwa") zmienNazweSzablonu(id);
      else usunSzablon(id);
    };
  }
});
