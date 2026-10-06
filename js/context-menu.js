/* ==========================================================================
   JW Study — context-menu.js
   Szybkie akcje: prawy przycisk myszy na komputerze, długie przytrzymanie na dotyku
   ========================================================================== */
"use strict";

/* Menu korzysta z tego samego rozwijanego panelu co reszta aplikacji (#dropdown),
   więc wygląd, pozycjonowanie i zamykanie działają dokładnie tak samo. */
function noteContextMenu(n, card, x, y){
  const dd = $("dropdown");
  const link = finderUrl(n);
  dd.innerHTML =
    `<div class="dd-lbl">${esc((n.t||refLabel(n)||"Notatka").substring(0,42))}</div>` +
    /* Kolory także tutaj: z menu podręcznego to JEDNO dotknięcie od notatki
       do koloru. Wcześniej menu podręczne nie miało tła w ogóle. */
    (typeof paskTlaNotatki==="function" ? paskTlaNotatki(n) + `<div class="dd-sep"></div>` : "") +
    `<div data-c="edit">${ICO.edit}Edytuj</div>` +
    `<div data-c="fs">${ICO.fs}Otwórz na pełnym ekranie</div>` +
    `<div class="dd-sep"></div>` +
    `<div data-c="fav">${ICO.star}${n.fav?"Usuń z ulubionych":"Dodaj do ulubionych"}</div>` +
    `<div data-c="pin">${ICO.pin}${n.pin?"Odepnij z góry":"Przypnij na górze"}</div>` +
    `<div data-c="tag">${ICO.tag}Etykiety…</div>` +
    `<div class="dd-sep"></div>` +
    `<div data-c="copy">${ICO.copy}Kopiuj treść</div>` +
    (link?`<div data-c="link">${ICO.link}Kopiuj odnośnik</div>`:``) +
    (link?`<div data-c="open">${ICO.ext}Otwórz w JW Library</div>`:``) +
    `<div data-c="wyslij">${ICO.send}Wyślij na inne urządzenie…</div>` +
    `<div class="dd-sep"></div>` +
    `<div data-c="del" class="dd-danger">${ICO.trash}Usuń notatkę</div>`;
  placeMenuAt(dd, x, y);
  dd.onclick = ev=>{
    if(typeof obsluzPaskTla==="function" && obsluzPaskTla(ev, n, card)) return;
    const it = ev.target.closest("[data-c]"); if(!it) return;
    dd.style.display = "none";
    const c = it.dataset.c;
    if(c==="edit") toggleEdit(card, n);
    else if(c==="fs") openFs(n);
    else if(c==="fav") toggleFav(n);
    else if(c==="pin") togglePin(n);
    else if(c==="tag"){ card.classList.add("showtags"); const b=card.querySelector('[data-act="tagpanel"]'); if(b) b.classList.add("tagon"); }
    else if(c==="copy") copyNote(n);
    else if(c==="link") navigator.clipboard.writeText(finderUrl(n)).then(()=>toastOk("Skopiowano odnośnik"));
    else if(c==="open") openUrlJWL(finderUrl(n));
    else if(c==="wyslij" && typeof wyslijNotatke==="function") wyslijNotatke(n.g);
    else if(c==="del") delNote(n);
  };
}

/* Ustawia menu przy kursorze/palcu i pilnuje, żeby nie wyszło poza ekran. */
function placeMenuAt(dd, x, y){
  dd.style.display = "block";
  dd.style.maxHeight = ""; dd.style.overflowY = "";
  const w = dd.offsetWidth || 260, h = dd.offsetHeight || 300;
  const _ob = (typeof widocznyObszar==="function") ? widocznyObszar()
            : {lewo:0, gora:0, prawo:innerWidth, dol:innerHeight};
  dd.style.left = Math.max(_ob.lewo + 8, Math.min(x, _ob.prawo - w - 8)) + "px";
  dd.style.top  = Math.max(_ob.gora + 8, Math.min(y, _ob.dol - h - 8)) + "px";
}

/* Wspólne wejście dla obu sposobów wywołania. Zwraca true, gdy menu faktycznie otwarto. */
/* Miejsca, w których menu podręczne NIE ma prawa się pojawić.
   Najważniejsze: treść notatki. Tam palcem zaznacza się tekst do podkreślenia,
   a przytrzymanie palca jest częścią tego gestu — nie osobnym poleceniem.
   Do tego czytnik pełnoekranowy, gdzie trwa czytanie i zaznaczanie, oraz sytuacja,
   gdy widoczny jest pasek kolorów albo cokolwiek jest już zaznaczone. */
function contextMenuBlocked(target){
  if(!target || !target.closest) return true;
  /* Na tablicy treść karteczki jest przycięta i nie służy do zaznaczania —
     a innego sposobu na menu tam nie ma, bo pasek ikon jest schowany, dopóki
     karteczka jest mała. Przytrzymanie palcem musi więc działać także na
     treści. W powiększonej karteczce i w pozostałych widokach zostaje po
     staremu: tam tekst się czyta i zaznacza. */
  const wMiniaturze = target.closest("#noteList.v-tablica .ncard:not(.wydobyta)");
  if(wMiniaturze) return false;
  if(target.closest(".ncontent")) return true;          // treść notatki — tam się zaznacza
  if(target.closest("#fsWrap, #modalFs")) return true;  // czytnik pełnoekranowy
  if(target.closest("#hlBar, .editbar, #imgBar, #readPop")) return true;  // paski narzędzi
  const hb = document.getElementById("hlBar");
  if(hb && hb.style.display && hb.style.display!=="none") return true;    // pasek kolorów na wierzchu
  const sel = getSelection();
  if(sel && !sel.isCollapsed && String(sel).trim()) return true;          // coś jest zaznaczone
  return false;
}

function openContextMenu(target, x, y){
  if(contextMenuBlocked(target)) return false;
  const card = target.closest && target.closest(".ncard");
  if(card && card.dataset.g){
    const n = notes.find(v=>v.g===card.dataset.g);
    if(n){ noteContextMenu(n, card, x, y); return true; }
  }
  const tagEl = target.closest && target.closest("#tagList .item[data-k]");
  if(tagEl){
    const id = +tagEl.dataset.k;
    const t = tags.find(v=>v.id===id);
    if(t){ tagMenu({target: tagEl, clientX:x, clientY:y}, t); return true; }
  }
  return false;
}

/* Komputer: prawy przycisk myszy. W polach tekstowych zostawiamy menu przeglądarki. */
document.addEventListener("contextmenu", e=>{
  const t = e.target;
  if(t && (t.isContentEditable || t.tagName==="INPUT" || t.tagName==="TEXTAREA")) return;
  if(openContextMenu(t, e.clientX, e.clientY)) e.preventDefault();
});

/* Dotyk: przytrzymanie ok. pół sekundy bez przesuwania palca.
   Przesunięcie o więcej niż 10 px oznacza przewijanie — wtedy menu się nie pojawia. */
let _lpTimer = 0, _lpX = 0, _lpY = 0, _lpCel = null;
document.addEventListener("pointerdown", e=>{
  if(e.pointerType === "mouse") return;
  const t = e.target;
  if(t && (t.isContentEditable || t.tagName==="INPUT" || t.tagName==="TEXTAREA")) return;
  if(t.closest && t.closest(".drag, .pubDrag")) return;     // uchwyty mają własną obsługę
  if(contextMenuBlocked(t)) return;                          // treść notatki, czytnik, zaznaczanie
  _lpCel = t; _lpX = e.clientX; _lpY = e.clientY;
  clearTimeout(_lpTimer);
  _lpTimer = setTimeout(()=>{
    _lpTimer = 0;
    if(_lpCel && openContextMenu(_lpCel, _lpX, _lpY)){
      if(navigator.vibrate) try{ navigator.vibrate(12); }catch(_){}
    }
  }, 520);
}, true);
function _lpStop(){ clearTimeout(_lpTimer); _lpTimer = 0; _lpCel = null; }
document.addEventListener("pointerup", _lpStop, true);
document.addEventListener("pointercancel", _lpStop, true);
document.addEventListener("pointermove", e=>{
  if(!_lpTimer) return;
  if(Math.abs(e.clientX-_lpX) > 10 || Math.abs(e.clientY-_lpY) > 10) _lpStop();
}, true);
/* Gdy system zaczyna zaznaczać tekst, przerywamy odliczanie — inaczej w połowie
   zaznaczania wyskakiwałoby menu i przykrywało pasek kolorów. */
document.addEventListener("selectionchange", ()=>{
  const sel = getSelection();
  if(sel && !sel.isCollapsed) _lpStop();
}, true);


/* ==========================================================================
   TRAFIENIE W POZYCJĘ, KTÓRĄ NAPRAWDĘ DOTKNIĘTO

   Na telefonie zdarzało się, że po dotknięciu „Wyślij na inne urządzenie…"
   otwierało się „Miejsce w publikacji…". Menu jest długie i przewijane, więc
   między dotknięciem a puszczeniem palca lista potrafi drgnąć — przez odruchowe
   przewinięcie albo przez to, że przeglądarka dosuwa menu do krawędzi. Wtedy
   `click` trafia w wiersz, który dopiero co wjechał pod palec.

   Pilnujemy więc, żeby zadziałała ta pozycja, na której palec WYLĄDOWAŁ.
   Jeśli przy puszczeniu jest pod nim inna — nie robimy nic. Lepiej, żeby
   dotknięcie przepadło, niż żeby wykonało cudze polecenie.
   ========================================================================== */
let _ddNacisniete = null;
document.addEventListener("pointerdown", e=>{
  const dd = document.getElementById("dropdown");
  if(!dd || !e.target.closest || !e.target.closest("#dropdown")){ _ddNacisniete = null; return; }
  _ddNacisniete = e.target.closest("[data-x],[data-c],[data-kol],[data-zm],[data-pokaz]") || null;
}, true);
document.addEventListener("click", e=>{
  if(!e.target.closest || !e.target.closest("#dropdown")) return;
  const teraz = e.target.closest("[data-x],[data-c],[data-kol],[data-zm],[data-pokaz]");
  /* Brak zapamiętanego nacisku = kliknięcie bez dotyku (mysz programowa,
     klawiatura, testy) — tam nie ma czego pilnować. */
  /* Porównujemy nie tylko tożsamość węzła, ale i jego polecenie: menu bywa
     przerysowywane między dotknięciem a puszczeniem palca, a wtedy ten sam
     wiersz jest już innym węzłem. Blokowanie go byłoby zwykłą uciążliwością. */
  const opis = el => el ? JSON.stringify([el.dataset.x, el.dataset.c, el.dataset.kol,
                                          el.dataset.zm, el.dataset.pokaz]) : "";
  if(!_ddNacisniete || !teraz || _ddNacisniete === teraz
     || opis(_ddNacisniete) === opis(teraz)){ _ddNacisniete = null; return; }
  e.preventDefault(); e.stopPropagation();
  _ddNacisniete = null;
  if(typeof toast==="function") toast("Lista drgnęła — dotknij jeszcze raz");
}, true);
