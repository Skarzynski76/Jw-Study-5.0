/* ==========================================================================
   JW Study — wzmianki.js
   `@` → ODSYŁACZ DO INNEJ NOTATKI ·  `#` → ETYKIETA

   CO BYŁO NIE TAK

   Notatki na jeden temat leżały osobno i nie było jak powiedzieć „to wynika
   z tamtej". Zostawały trzy obejścia, każde ze swoją wadą:

     • przepisanie kawałka tamtej notatki — od tej chwili są dwie wersje tego
       samego zdania i za miesiąc nie wiadomo, która jest poprawiona;
     • wspólna etykieta — mówi „te notatki są z jednego działu", a nie
       „TA notatka odsyła DO TEJ";
     • „powiązane notatki" (44-powiazane.js) — liczy podobieństwo słów, więc
       zgaduje. Bywa trafne, ale nie zapamiętuje decyzji autora.

   Etykietę też trzeba było nadawać osobno: wyjść z pisania, otworzyć wybór
   etykiet, zaznaczyć, wrócić. Przy pisaniu w biegu (na zebraniu, na iPadzie)
   to wystarczyło, żeby tego nie robić wcale.

   JAK JEST TERAZ

   W trakcie pisania:

     `@` + kilka liter  → lista notatek. Wybrana wchodzi jako ODSYŁACZ.
                          Kliknięcie w niego (poza edycją) otwiera tamtą notatkę
                          w czytniku, ze śladem powrotu — strzałka wstecz wraca
                          tam, skąd przyszedłeś.
     `#` + kilka liter  → lista etykiet. Wybrana zostaje NADANA notatce.
                          Wpisany tekst znika, bo etykieta nie jest treścią.

   TRZY DECYZJE, KTÓRE WARTO ZNAĆ

   1. ODSYŁACZ TRZYMA IDENTYFIKATOR, NIE TYTUŁ. W treści zapisane jest
      `<a class="note-ref" data-g="…">`, a widoczny napis bierze się przy
      każdym wyświetleniu z BIEŻĄCEGO tytułu tamtej notatki. Zmiana tytułu
      przenosi się więc sama na wszystkie odsyłacze. Gdyby napis był zapisany
      na stałe, po pierwszej zmianie tytułu odsyłacze kłamałyby.

   2. ODSYŁACZ DO NOTATKI, KTÓREJ JUŻ NIE MA, NIE JEST MARTWYM LINKIEM.
      Dostaje wyraźny wygląd i podpowiedź „notatka usunięta" — bo notatka może
      leżeć w koszu i wrócić. Ciche zniknięcie napisu byłoby gorsze: nie dałoby
      się nawet zauważyć, że coś tu było.

   3. `#` NIE KOLIDUJE Z NAGŁÓWKIEM. `# ` na początku wiersza od dawna robi
      nagłówek (13-editor.js, autoformat). Lista etykiet otwiera się od razu po
      `#`, ale zamyka się, gdy tylko pojawi się spacja — czyli dokładnie wtedy,
      gdy nagłówek wchodzi w życie. Obie rzeczy działają bez wyboru „albo-albo".
   ========================================================================== */
"use strict";

/* Ile pozycji na liście. Więcej nie pomaga: przy ośmiu tysiącach notatek
   i tak trafia się do celu przez dopisanie liter, a nie przez przewijanie. */
const WZM_ILE = 8;
/* Najdłuższe szukane słowo. Dłuższe znaczy, że `@` było przypadkiem (adres
   e-mail, „małpa" w treści) i lista ma zniknąć. */
const WZM_MAX_ZNAKOW = 40;

let wzmStan = null;   // {rodzaj:"@"|"#", ce, wezel, poczatek, szukane, lista, wybrany}

/** Popup listy. Tworzony raz, przy pierwszym użyciu. */
function wzmPop(){
  let p = $("wzmPop");
  if(!p){
    p = document.createElement("div");
    p.id = "wzmPop";
    p.setAttribute("role", "listbox");
    document.body.appendChild(p);
    /* pointerdown, nie click: kliknięcie zabrałoby ognisko polu edycji, a wraz
       z nim zaznaczenie, którego potrzebujemy do wstawienia w dobrym miejscu. */
    p.addEventListener("pointerdown", e=>{
      e.preventDefault();
      const it = e.target.closest && e.target.closest("[data-wzm]");
      if(!it) return;
      wzmWybierz(+it.dataset.wzm);
    });
  }
  return p;
}

function wzmZamknij(){
  const p = $("wzmPop");
  if(p) p.style.display = "none";
  wzmStan = null;
}

/**
 * Co użytkownik właśnie napisał: szuka `@` albo `#` przed kursorem, w tym samym
 * węźle tekstowym. Zwraca null, gdy nie ma czego podpowiadać.
 */
function wzmSzukanePrzedKursorem(ce){
  const sel = getSelection();
  if(!sel || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0);
  if(!r.collapsed) return null;
  const wezel = r.startContainer;
  if(wezel.nodeType !== 3) return null;                 // tylko w zwykłym tekście
  if(!ce.contains(wezel)) return null;
  /* W środku istniejącego odsyłacza nie podpowiadamy — tam `@` jest treścią. */
  let rodzic = wezel.parentNode;
  while(rodzic && rodzic !== ce){
    if(rodzic.tagName === "A") return null;
    rodzic = rodzic.parentNode;
  }
  const przed = wezel.nodeValue.slice(0, r.startOffset);
  const m = przed.match(/([@#])([^\s@#]*)$/);
  if(!m) return null;
  if(m[2].length > WZM_MAX_ZNAKOW) return null;
  /* Znak musi zaczynać słowo. Bez tego `e@mail` i `nr#5` otwierałyby listę. */
  const zaraz = przed.charAt(przed.length - m[0].length - 1);
  if(zaraz && !/[\s(\[„”"' ]/.test(zaraz)) return null;
  return {rodzaj:m[1], szukane:m[2], wezel, poczatek:r.startOffset - m[0].length,
          koniec:r.startOffset};
}

/** Notatki dopasowane do szukanego tekstu. Puste szukane → ostatnio zmienione. */
function wzmNotatki(szukane, pomin){
  const q = norm(szukane);
  const zywe = notes.filter(n=>!n.del && n.g !== pomin);
  if(!q){
    return zywe.slice()
      .sort((a,b)=>String(b.mo||"").localeCompare(String(a.mo||"")))
      .slice(0, WZM_ILE)
      .map(n=>({n, gdzie:"tytuł"}));
  }
  const wTytule = [], wTresci = [];
  for(const n of zywe){
    if(norm(n.t || "").indexOf(q) >= 0){ wTytule.push({n, gdzie:"tytuł"}); if(wTytule.length >= WZM_ILE) break; }
  }
  if(wTytule.length < WZM_ILE){
    /* Dopiero gdy tytuły nie wystarczą, zaglądamy w treść. Odwrotna kolejność
       zasypywałaby listę notatkami, w których słowo pada raz, w środku. */
    for(const n of zywe){
      if(wTytule.some(x=>x.n.g === n.g)) continue;
      if(norm(n.c || "").indexOf(q) >= 0){ wTresci.push({n, gdzie:"treść"}); }
      if(wTytule.length + wTresci.length >= WZM_ILE) break;
    }
  }
  return wTytule.concat(wTresci).slice(0, WZM_ILE);
}

/** Etykiety dopasowane do szukanego tekstu. */
function wzmEtykiety(szukane, notatka){
  const q = norm(szukane);
  const juz = new Set((notatka && notatka.tg) || []);
  const dopasowane = tags.filter(t=>!q || norm(t.name).indexOf(q) >= 0);
  /* Etykiety, których notatka jeszcze nie ma, idą pierwsze — po to się tu
     przyszło. Te nadane zostają widoczne, żeby dało się je zdjąć. */
  dopasowane.sort((a,b)=> (juz.has(a.id) ? 1 : 0) - (juz.has(b.id) ? 1 : 0));
  return dopasowane.slice(0, WZM_ILE).map(t=>({t, nadana:juz.has(t.id)}));
}

/** Rysuje listę i ustawia ją przy kursorze. */
function wzmRysuj(){
  const st = wzmStan; if(!st) return;
  const p = wzmPop();
  let html = "";
  if(st.rodzaj === "@"){
    html = `<div class="dd-lbl">Odsyłacz do notatki${st.szukane ? ": " + esc(st.szukane) : ""}</div>`;
    if(!st.lista.length) html += `<div class="wzm-brak">Nie znalazłem takiej notatki</div>`;
    else html += st.lista.map((x, i)=>
      `<div data-wzm="${i}" class="wzm-poz${i === st.wybrany ? " wybrana" : ""}" role="option">
         <span class="wzm-tyt">${esc((x.n.t || "Bez tytułu").slice(0, 70))}</span>
         <span class="wzm-opis">${x.gdzie === "treść" ? "w treści · " : ""}${esc(wzmOpisNotatki(x.n))}</span>
       </div>`).join("");
  } else {
    html = `<div class="dd-lbl">Etykieta${st.szukane ? ": " + esc(st.szukane) : ""}</div>`;
    html += st.lista.map((x, i)=>
      `<div data-wzm="${i}" class="wzm-poz${i === st.wybrany ? " wybrana" : ""}" role="option">
         <span class="wzm-kropka" style="background:${esc(x.t.color || "var(--accent2)")}"></span>
         <span class="wzm-tyt">${esc(x.t.name)}</span>
         ${x.nadana ? '<span class="wzm-opis">już nadana — wybierz, żeby zdjąć</span>' : ""}
       </div>`).join("");
    if(st.nowa) html += `<div data-wzm="${st.lista.length}" class="wzm-poz wzm-nowa${
      st.wybrany === st.lista.length ? " wybrana" : ""}" role="option">
        <span class="wzm-tyt">Utwórz etykietę „${esc(st.nowa)}”</span></div>`;
    if(!st.lista.length && !st.nowa) html += `<div class="wzm-brak">Wpisz nazwę nowej etykiety</div>`;
  }
  p.innerHTML = html;
  p.style.display = "block";
  wzmUstawPrzyKursorze(p);
}

/** Krótki opis notatki na liście: werset albo publikacja albo data. */
function wzmOpisNotatki(n){
  if(n.b && BOOKS[n.b]) return BOOKS[n.b] + (n.ch ? " " + n.ch + (n.v ? ":" + n.v : "") : "");
  if(n.pub) return String(n.pub);
  const d = n.mo ? new Date(n.mo) : null;
  return (d && !isNaN(d)) ? d.toLocaleDateString("pl", {day:"numeric", month:"short", year:"numeric"}) : "";
}

/** Umieszcza listę pod kursorem, w granicach widocznego obszaru. */
function wzmUstawPrzyKursorze(p){
  const sel = getSelection();
  if(!sel || !sel.rangeCount){ p.style.display = "none"; return; }
  let r;
  try{ r = sel.getRangeAt(0).getBoundingClientRect(); }catch(e){ r = null; }
  /* Kursor bez szerokości bywa prostokątem 0×0 w miejscu (0,0) — wtedy bierzemy
     prostokąt wiersza, w którym stoi, żeby lista nie wylądowała w kącie ekranu. */
  if(!r || (!r.width && !r.height && !r.top)){
    const w = sel.anchorNode;
    const el = w && (w.nodeType === 1 ? w : w.parentElement);
    r = el ? el.getBoundingClientRect() : {left:20, top:80, bottom:100, height:20};
  }
  const ob = (typeof widocznyObszar === "function") ? widocznyObszar()
           : {lewo:0, gora:0, prawo:innerWidth, dol:innerHeight, wys:innerHeight};
  const M = 8;
  p.style.maxHeight = "none";
  const w = p.offsetWidth || 260, h = p.offsetHeight || 160;
  const pod = ob.dol - r.bottom - M * 2;
  const nad = r.top - ob.gora - M * 2;
  let top, maxH;
  if(h <= pod || pod >= nad){ top = r.bottom + 6; maxH = Math.max(120, pod); }
  else { maxH = Math.max(120, nad); top = r.top - 6 - Math.min(h, maxH); }
  p.style.maxHeight = Math.min(maxH, ob.wys - M * 2) + "px";
  p.style.overflowY = "auto";
  p.style.top = Math.max(ob.gora + M, Math.min(top, ob.dol - Math.min(h, maxH) - M)) + "px";
  p.style.left = Math.max(ob.lewo + M, Math.min(r.left, ob.prawo - w - M)) + "px";
}

/** Odświeża listę po każdym naciśnięciu klawisza w treści notatki. */
function wzmSprawdz(ce){
  const co = wzmSzukanePrzedKursorem(ce);
  if(!co){ wzmZamknij(); return; }
  const n = (typeof notaDlaPola === "function") ? notaDlaPola(ce) : null;
  const stary = wzmStan;
  wzmStan = {rodzaj:co.rodzaj, ce, wezel:co.wezel, poczatek:co.poczatek, koniec:co.koniec,
             szukane:co.szukane, notatka:n, lista:[], wybrany:0, nowa:""};
  if(co.rodzaj === "@") wzmStan.lista = wzmNotatki(co.szukane, n && n.g);
  else {
    wzmStan.lista = wzmEtykiety(co.szukane, n);
    const dokladna = co.szukane && tags.some(t=>norm(t.name) === norm(co.szukane));
    if(co.szukane && !dokladna) wzmStan.nowa = co.szukane;
  }
  /* Zachowaj podświetlenie, jeśli lista się nie zmieniła — inaczej strzałka
     w dół po dopisaniu litery skakałaby zawsze na pierwszą pozycję. */
  if(stary && stary.rodzaj === wzmStan.rodzaj && stary.szukane === wzmStan.szukane)
    wzmStan.wybrany = Math.min(stary.wybrany, wzmIlePozycji() - 1);
  if(wzmIlePozycji() < 1 && wzmStan.rodzaj === "@"){ wzmRysuj(); return; }  // pokaż „nie znalazłem"
  wzmRysuj();
}
function wzmIlePozycji(){
  if(!wzmStan) return 0;
  return wzmStan.lista.length + (wzmStan.nowa ? 1 : 0);
}

/** Usuwa wpisane `@szukane` / `#szukane` z treści. */
function wzmUsunWpisane(){
  const st = wzmStan; if(!st) return null;
  const w = st.wezel;
  if(!w || w.nodeType !== 3 || !st.ce.contains(w)) return null;
  const r = document.createRange();
  try{
    r.setStart(w, st.poczatek);
    r.setEnd(w, Math.min(st.koniec, w.nodeValue.length));
  }catch(e){ return null; }
  r.deleteContents();
  const sel = getSelection();
  sel.removeAllRanges(); sel.addRange(r);
  return r;
}

/** Wprowadza wybór w życie. */
function wzmWybierz(i){
  const st = wzmStan; if(!st) return;
  const ce = st.ce;
  if(st.rodzaj === "@"){
    const wpis = st.lista[i]; if(!wpis){ wzmZamknij(); return; }
    const r = wzmUsunWpisane();
    const a = document.createElement("a");
    a.className = "note-ref";
    a.setAttribute("data-g", wpis.n.g);
    a.textContent = wpis.n.t || "Bez tytułu";
    if(r){ r.insertNode(a); a.parentNode.insertBefore(document.createTextNode(" "), a.nextSibling);
           const po = document.createRange(); po.setStartAfter(a.nextSibling); po.collapse(true);
           const sel = getSelection(); sel.removeAllRanges(); sel.addRange(po); }
    else { ce.appendChild(a); ce.appendChild(document.createTextNode(" ")); }
    wzmZamknij();
    commitLiveEdit(ce);
    toastOk("Odsyłacz do: " + (wpis.n.t || "Bez tytułu"));
    return;
  }
  /* `#` — etykieta. Tekst znika, bo etykieta nie jest treścią notatki. */
  const n = st.notatka;
  let t = null, zdjeta = false;
  if(i < st.lista.length){
    t = st.lista[i].t;
    zdjeta = st.lista[i].nadana;
  } else if(st.nowa){
    t = (typeof createTag === "function") ? createTag(st.nowa) : null;
    if(!t){ wzmZamknij(); return; }
  }
  wzmUsunWpisane();
  wzmZamknij();
  if(!n || !t){ commitLiveEdit(ce); return; }
  n.tg = Array.isArray(n.tg) ? n.tg : [];
  if(zdjeta) n.tg = n.tg.filter(x=>x !== t.id);
  else if(n.tg.indexOf(t.id) < 0) n.tg.push(t.id);
  commitLiveEdit(ce);               // zapisuje treść (już bez `#…`) i podbija datę
  saveNote(n);
  if(typeof bumpTagsVer === "function") bumpTagsVer();   // chipy i lista wyboru na kartach
  if(typeof renderTags === "function") renderTags();      // licznik przy etykiecie w kolumnie
  toastOk(zdjeta ? "Zdjęto etykietę „" + t.name + "”" : "Nadano etykietę „" + t.name + "”");
}

/* ——— WPIĘCIE W PISANIE ——— */
document.addEventListener("input", e=>{
  const ce = e.target && e.target.closest && e.target.closest('.ncontent[contenteditable="true"]');
  if(ce) wzmSprawdz(ce);
});
/* Klawiatura obsługiwana w fazie przechwytywania: strzałki i Enter muszą trafić
   do listy, a nie do treści notatki. */
document.addEventListener("keydown", e=>{
  if(!wzmStan) return;
  const ile = wzmIlePozycji();
  if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); wzmZamknij(); return; }
  if(e.key === "ArrowDown" && ile){ e.preventDefault(); e.stopPropagation();
    wzmStan.wybrany = (wzmStan.wybrany + 1) % ile; wzmRysuj(); return; }
  if(e.key === "ArrowUp" && ile){ e.preventDefault(); e.stopPropagation();
    wzmStan.wybrany = (wzmStan.wybrany - 1 + ile) % ile; wzmRysuj(); return; }
  if((e.key === "Enter" || e.key === "Tab") && ile){ e.preventDefault(); e.stopPropagation();
    wzmWybierz(wzmStan.wybrany); return; }
}, true);
/* Kliknięcie gdzie indziej albo wyjście z edycji zamyka listę. */
document.addEventListener("pointerdown", e=>{
  if(!wzmStan) return;
  if(e.target && e.target.closest && e.target.closest("#wzmPop")) return;
  wzmZamknij();
});
document.addEventListener("scroll", ()=>{ if(wzmStan) wzmZamknij(); }, {capture:true, passive:true});

/* ==========================================================================
   ODSYŁACZE W WYŚWIETLANEJ TREŚCI
   ========================================================================== */

/**
 * Uzupełnia odsyłacze do notatek przy każdym wyświetleniu: napis bierze się
 * z BIEŻĄCEGO tytułu, a odsyłacz do notatki, której nie ma, dostaje wyraźny
 * wygląd zamiast zniknąć. Wołane z renderNotes i z czytnika.
 */
function odswiezOdnosnikiNotatek(container){
  if(!container) return;
  container.querySelectorAll("a.note-ref[data-g]").forEach(a=>{
    const g = a.getAttribute("data-g");
    const n = notes.find(x=>x.g === g);
    if(!n){
      a.classList.add("brak");
      a.title = "Notatka usunięta albo z innego urządzenia — odsyłacz zostaje, bo notatka może wrócić";
      if(!a.textContent.trim()) a.textContent = "notatka usunięta";
      return;
    }
    a.classList.remove("brak");
    if(n.del){ a.classList.add("wkoszu"); a.title = "Notatka jest w koszu"; }
    else { a.classList.remove("wkoszu"); a.title = "Otwórz notatkę: " + (n.t || "Bez tytułu"); }
    const tytul = n.t || "Bez tytułu";
    if(a.textContent !== tytul) a.textContent = tytul;
  });
}

/* Kliknięcie w odsyłacz otwiera tamtą notatkę w czytniku. openFs sam odkłada
   ślad powrotu, więc strzałka wstecz wraca tam, skąd przyszliśmy. */
document.addEventListener("click", e=>{
  const a = e.target && e.target.closest ? e.target.closest("a.note-ref") : null;
  if(!a) return;
  if(a.closest('[contenteditable="true"]')) return;      // w edycji odsyłacz jest tekstem
  e.preventDefault();
  const g = a.getAttribute("data-g");
  const n = notes.find(x=>x.g === g);
  if(!n){ toast("Tej notatki już nie ma"); return; }
  if(n.del){ toast("Ta notatka jest w koszu — przywróć ją, żeby otworzyć"); return; }
  if(typeof openFs === "function") openFs(n);
});
