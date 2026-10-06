/* ==========================================================================
   JW Study — shortcuts.js
   Skróty klawiszowe
   ========================================================================== */
"use strict";
/* ===== skróty klawiszowe (komputer) ===== */
document.addEventListener("keydown", e=>{
  const t=e.target, typing = t && (t.tagName==="INPUT"||t.tagName==="TEXTAREA"||t.isContentEditable);
  if(e.key==="Escape"){
    if(fsGuid){ closeFs(); return; }
    const ov=[...document.querySelectorAll(".overlay.show:not([data-lock-close=\"1\"])")]; if(ov.length){ ov.forEach(o=>o.classList.remove("show")); return; }
    const cm=$("colorMenu"); if(cm && cm.style.display==="block"){ cm.style.display="none"; return; }
    if($("dropdown").style.display==="block"){ $("dropdown").style.display="none"; return; }
    if(document.activeElement===$("search")){ $("search").blur(); }
    return;
  }
  if(fsGuid && !typing){
    /* Alt+← i Backspace cofają PO ŚLADZIE odwiedzonych notatek (powiązane),
       a nie po liście. Samo ← jest zajęte przez przeglądanie listy w tył i tak
       zostaje — to dwa różne ruchy: „poprzednia notatka na liście" i „ta, z której
       tu przyszedłem". Skróty są te same, co w przeglądarce. */
    if((e.altKey && e.key==="ArrowLeft") || e.key==="Backspace"){
      if(typeof fsSlad!=="undefined" && fsSlad.length){ e.preventDefault(); fsWroc(); return; }
    }
    if(e.key==="ArrowRight"||e.key==="PageDown"){ e.preventDefault(); fsGo(1); return; }
    if(e.key==="ArrowLeft"||e.key==="PageUp"){ e.preventDefault(); fsGo(-1); return; }
  }
  /* Poza edytorem te same skróty sterują historią całej aplikacji. W samym
     edytorze zostaje dokładniejsza historia pisania z histSkocz(). */
  if(!typing && (e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="z"){
    e.preventDefault();
    if(e.shiftKey) doRedo(); else doUndo();
    return;
  }
  if(typing) return;
  /* SZUKANIE ZNACZY CO INNEGO W CZYTNIKU NIŻ NA LIŚCIE.
     Na liście ⌘F i „/" prowadzą do pola u góry — a od 2.75 samo ustawienie w nim
     ogniska zdejmuje wszystkie zawężenia, więc szuka się po całości. W OTWARTEJ
     NOTATCE ta sama para znaczy „znajdź w tej notatce": czytnik ma własny pasek
     „Znajdź". Bez tego rozróżnienia ⌘F w czytniku przenosiło ognisko na pole
     schowane pod oknem — nie było widać nic poza tym, że nic się nie stało —
     a od 2.75 po cichu zdejmowałoby jeszcze filtry listy pod spodem. */
  const szukajWNotatce = ()=>{
    const przycisk = document.querySelector('#fsWrap [data-fsb="find"]');
    if(!przycisk) return false;
    const box = document.querySelector("#fsWrap .fsFind");
    if(box && box.style.display !== "none"){
      const inp = box.querySelector(".fsFindInp");
      if(inp){ inp.focus(); inp.select(); }
    } else przycisk.click();
    return true;
  };
  if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="f"){
    e.preventDefault();
    if(fsGuid && szukajWNotatce()) return;
    $("search").focus(); $("search").select(); return;
  }
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  /* 0 — powrót do wszystkich notatek; sąsiaduje z 1/2/3 od kolumn */
  if(e.key==="0" && typeof pokazWszystkieNotatki==="function"){
    e.preventDefault(); pokazWszystkieNotatki(); return;
  }
  /* 1 / 2 / 3 — szybkie chowanie kolumn bocznych na dużym ekranie */
  if(e.key>="1" && e.key<="3" && innerWidth>900 && typeof KOLUMNY_BOCZNE!=="undefined"){
    const wpis = KOLUMNY_BOCZNE[+e.key - 1];
    if(wpis){ e.preventDefault(); setCollapsed(wpis[0], !$(wpis[0]).classList.contains("collapsed")); return; }
  }

  /* Skróty działające na notatce: bierzemy tę otwartą w czytniku, a poza czytnikiem
     tę, nad którą stoi kursor — dzięki temu nie trzeba niczego wcześniej zaznaczać. */
  const currentNote = ()=>{
    if(fsGuid) return notes.find(n=>n.g===fsGuid) || null;
    const pod = document.querySelector("#noteList .ncard:hover");
    return pod ? (notes.find(n=>n.g===pod.dataset.g) || null) : null;
  };

  const k = e.key.toLowerCase();
  if(e.key==="/"){
    e.preventDefault();
    if(fsGuid && szukajWNotatce()) return;
    $("search").focus(); return;
  }
  if(e.key==="?"){ e.preventDefault(); openSettings(); return; }
  if(e.key===","){ e.preventDefault(); openSettings(); return; }
  /* H jak „home" — przełącza między Centrum studium i listą notatek. Litera
     wolna: N to nowa notatka, E edycja, F ulubione, P przypięcie. */
  if(k==="h" && typeof centrumWidoczne==="function"){
    e.preventDefault();
    if(centrumWidoczne()) centrumSchowaj(); else centrumPokaz();
    return;
  }
  /* M jak „mapa" — mapa tematów (56-mapa.js). Litera wolna: N nowa notatka,
     E edycja, F ulubione, P przypięcie, H Centrum. */
  if(k==="m" && typeof otworzMape==="function"){
    e.preventDefault();
    const okno = $("modalMapa");
    if(okno && okno.classList.contains("show")) zamknijMape(); else otworzMape();
    return;
  }
  if(k==="n"){ e.preventDefault(); $("btnNew").click(); return; }
  if(k==="f"){ const n=currentNote(); if(n){ e.preventDefault(); toggleFav(n); } return; }
  if(k==="p"){ const n=currentNote(); if(n){ e.preventDefault(); togglePin(n); } return; }
  if(k==="e"){
    const n=currentNote(); if(!n) return;
    const card = document.querySelector('#noteList .ncard[data-g="'+CSS.escape(n.g)+'"]');
    if(card){ e.preventDefault(); toggleEdit(card, n); }
    return;
  }
});
document.querySelectorAll(".overlay").forEach(o=>o.addEventListener("click",e=>{
  if(e.target===o && o.dataset.lockClose!=="1") o.classList.remove("show");
}));

updateBackupBadge();   // stan przycisku kopii zapasowej (moduł akcji jest już wczytany)
initViewBar();   // przełącznik układu działa niezależnie od wczytania danych
boot().catch(err=>{
  console.error(err);
  $("loadMsg").textContent="Błąd wczytywania: "+err.message+" — użyj nowoczesnej przeglądarki (Chrome, Edge, Safari 16.4+, Firefox).";
});
