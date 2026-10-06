/* ==========================================================================
   JW Study — newnote.js
   Okno tworzenia nowej notatki
   ========================================================================== */
"use strict";
/* ================= NOWA NOTATKA ================= */
function buildStatic(){
  $("nnBook").innerHTML = '<option value="0">— brak (notatka ogólna) —</option>' +
    BOOKS.map((b,i)=>i?`<option value="${i}">${b}</option>`:"").join("");
}
/* lista etykiet w oknie nowej notatki — zachowuje zaznaczenia przy przerysowaniu */
function renderNnTags(keepChecked){
  const checked = keepChecked || [...$("nnTags").querySelectorAll("input:checked")].map(i=>+i.value);
  $("nnTags").innerHTML = tags.map(t=>{
    const chk = checked.includes(t.id) ? "checked" : "";
    const kol = (typeof kolorBezpieczny==="function" && kolorBezpieczny(t.color)) ? t.color : "";
    const dot = kol ? `<span class="nnDot" style="background:${kol}"></span>` : "";
    return `<label><input type="checkbox" value="${t.id}" ${chk}> ${dot}${esc(t.name)}</label>`;
  }).join("");
}
/**
 * Lista zakładek w oknie nowej notatki, pogrupowana po sekcjach.
 *
 * Bez tego notatka utworzona „w sekcji" lądowała poza nią i trzeba jej było
 * szukać wśród wszystkich. Gdy w kolumnie etykiet masz właśnie otwartą zakładkę,
 * jest ona podpowiadana od razu — bo najczęściej właśnie tam ma trafić.
 */
function renderNnZakladki(){
  const sel = $("nnZakladka"), karta = $("nnZakladkaKarta");
  if(!sel) return;
  const sekcje = (typeof sections!=="undefined" ? sections : []).slice()
    .sort((a,b)=>(a.ord??0)-(b.ord??0));

  /* Sekcja BEZ zakładek też musi być na liście.
     Wcześniej pomijaliśmy takie sekcje, a gdy żadna nie miała zakładek — całe
     pole znikało. Kto dopiero co utworzył sekcję, nie miał więc jak wrzucić do
     niej nowej notatki i trafiała ona do ogólnego zbioru. Dla takiej sekcji
     dajemy pozycję „nowa zakładka": nazwę podaje użytkownik przy zapisie,
     więc nic nie powstaje po cichu. */
  const grupy = sekcje.map(s=>{
    const lista = (typeof secTabsFor==="function") ? secTabsFor(s.id) : [];
    return `<optgroup label="${esc(s.name)}">`+
      lista.map(z=>`<option value="${z.id}">${esc(z.name)}</option>`).join("")+
      `<option value="nowa:${s.id}">＋ nowa zakładka w tej sekcji…</option>`+
      `</optgroup>`;
  }).join("");

  if(!sekcje.length){
    /* Naprawdę nie ma czego wybierać dopiero wtedy, gdy nie ma ŻADNEJ sekcji. */
    if(karta) karta.style.display = "none";
    sel.innerHTML = '<option value="">— brak sekcji —</option>';
    return;
  }
  if(karta) karta.style.display = "";
  sel.innerHTML = '<option value="">— brak (notatka poza sekcjami) —</option>' + grupy;
  /* Podpowiedź: gdy lista jest właśnie zawężona do zakładki, to w niej pracujesz. */
  const teraz = String(filt.tag||"");
  if(teraz.indexOf("stb:")===0) sel.value = teraz.slice(4);
}

/**
 * Zamienia wybór z listy na numer zakładki.
 * Dla „nowa zakładka" pyta o nazwę i tworzy ją — dopiero przy zapisie notatki,
 * żeby porzucone okno nie zostawiało po sobie pustych zakładek.
 * @returns {Promise<number|null|false>} numer zakładki, null (brak) albo false (rezygnacja)
 */
async function ustalZakladkeNowejNotatki(wybor){
  if(!wybor) return null;
  if(String(wybor).indexOf("nowa:") !== 0) return +wybor || null;
  const idSekcji = +String(wybor).slice(5);
  const sek = (typeof sections!=="undefined" ? sections : []).find(x=>x.id===idSekcji);
  const nazwa = await askText({
    title: "Nowa zakładka" + (sek ? " w sekcji „"+sek.name+"”" : ""),
    placeholder: "np. Kongres 2026",
    okLabel: "Utwórz i zapisz notatkę",
    hint: "Notatka trafi do tej zakładki."});
  if(nazwa===null || !nazwa.trim()) return false;
  if(typeof secTabs==="undefined") return null;
  const z = {
    id: Math.max(0, ...secTabs.map(x=>+x.id||0)) + 1,
    sec: idSekcji,
    name: nazwa.trim().slice(0,60),
    ord: secTabsFor(idSekcji).length * 10
  };
  secTabs.push(z);
  if(typeof saveSecTabs==="function") saveSecTabs();
  return z.id;
}

$("btnNew").onclick = ()=>{
  $("nnTitle").value=""; $("nnContent").value=""; $("nnBook").value="0"; $("nnCh").value=""; $("nnV").value="";
  $("nnNewTagName").value="";
  renderNnTags(typeof filt.tag==="number" ? [filt.tag] : []);
  renderNnZakladki();
  if(typeof rysujSzablony==="function") rysujSzablony();
  if(typeof filt.book==="number"&&filt.book>0) $("nnBook").value=String(filt.book);
  openModal("modalNew");
};
/* utworzenie etykiety wprost w oknie nowej notatki */
function nnCreateTag(){
  const inp=$("nnNewTagName");
  const name=(inp.value||"").trim();
  if(!name){ toast("Wpisz nazwę etykiety"); inp.focus(); return; }
  const existing = tags.find(t=>norm(t.name)===norm(name));
  const t = existing || createTag(name);
  if(!t) return;
  const checked=[...$("nnTags").querySelectorAll("input:checked")].map(i=>+i.value);
  if(!checked.includes(t.id)) checked.push(t.id);
  renderNnTags(checked);
  inp.value=""; inp.focus();
  renderTags();
  toast(existing ? ("Etykieta „"+t.name+"” już istnieje — zaznaczono") : ("Utworzono etykietę „"+t.name+"”"));
}
$("nnAddTag").onclick = nnCreateTag;
$("nnNewTagName").addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); nnCreateTag(); } });
async function zapiszNowaNotatke(otworzEdytor){
  const c=$("nnContent").value.trim(), t=$("nnTitle").value.trim();
  if(!c&&!t){ toast("Wpisz tytuł lub treść"); return; }
  const wybor = $("nnZakladka") ? $("nnZakladka").value : "";
  const idZakladki = await ustalZakladkeNowejNotatki(wybor);
  if(idZakladki===false) return;
  const now=new Date().toISOString();
  /* Wiersze z prostego okna od razu zapisujemy jako BR. Po przejściu do pełnego
     edytora Enter zachowuje dokładnie ten sam, zwarty sposób pisania. */
  const h=c ? esc(c).replace(/\r?\n/g,"<br>") : null;
  const n={ g:crypto.randomUUID().toUpperCase(), t, c, h,
    b:+$("nnBook").value||0, ch:+$("nnCh").value||null, v:+$("nnV").value||null,
    pub:"", ks:"", doc:0, itn:0, col:0, cr:now, mo:now,
    tg:[...$("nnTags").querySelectorAll("input:checked")].map(i=>+i.value),
    nw:true, tgd:true };
  if(idZakladki) n.stb = idZakladki;
  notes.unshift(n); await saveNote(n);
  pushUndo({type:"newNote", g:n.g, label:"dodanie notatki"});
  closeModal("modalNew"); renderAll();
  if(otworzEdytor){
    openFs(n);
    setTimeout(()=>{
      const karta=document.querySelector('#fsWrap .ncard[data-g="'+CSS.escape(n.g)+'"]');
      if(karta&&!karta.classList.contains("editing"))toggleEdit(karta,n);
    },60);
  }else{
    const nazwaZak = n.stb && typeof secTabs!=="undefined"
      ? (secTabs.find(z=>z.id===n.stb)||{}).name : "";
    toast(nazwaZak ? "Notatka dodana do zakładki „"+nazwaZak+"”" : "Notatka dodana");
  }
}
$("nnSave").onclick=()=>zapiszNowaNotatke(false);
$("nnSaveEdit").onclick=()=>zapiszNowaNotatke(true);
