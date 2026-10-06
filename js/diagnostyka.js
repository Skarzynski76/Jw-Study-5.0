/* ==========================================================================
   JW Study — diagnostyka.js
   BŁĘDY MAJĄ BYĆ WIDOCZNE, A NIE CICHE

   Na telefonie nie ma konsoli. Gdy coś się wysypało, aplikacja po prostu
   „nie działała" i nie było jak dojść dlaczego — ani użytkownikowi, ani
   przy zgłoszeniu. Każdy taki przypadek kończył się zgadywaniem.

   Ten moduł łapie błędy wykonania i odrzucone obietnice, pokazuje krótki pasek
   z treścią i pozwala skopiować szczegóły. Ostatnie dwadzieścia wpisów zostaje
   w pamięci urządzenia, więc widać też to, co wydarzyło się przed chwilą.
   ========================================================================== */
"use strict";

const DIAG_KLUCZ = "jwsBledy";
const DIAG_ILE   = 20;

/* ——— ŚLADY OSTATNICH DZIAŁAŃ ———
   „Script error." bez pliku i numeru wiersza to komunikat, który przeglądarka
   podaje, gdy nie chce zdradzić szczegółów. Sam w sobie nie mówi nic. Dlatego
   zapisujemy kilkanaście ostatnich kroków użytkownika — przy zgłoszeniu widać
   wtedy, CO robił tuż przed awarią, nawet gdy treść błędu przepadła. */
const DIAG_SLADY = 14;
const _slady = [];
function slad(co){
  const t = new Date().toISOString().substring(11, 19);
  _slady.push(t + " " + String(co).slice(0, 80));
  if(_slady.length > DIAG_SLADY) _slady.shift();
}

function diagWczytaj(){
  try{ return JSON.parse(localStorage.getItem(DIAG_KLUCZ) || "[]"); }catch(e){ return []; }
}
function diagZapisz(lista){
  try{ localStorage.setItem(DIAG_KLUCZ, JSON.stringify(lista.slice(-DIAG_ILE))); }catch(e){}
}
/** Dopisuje wpis i pokazuje pasek. */
function zapiszBlad(opis, gdzie){
  const wpis = {kiedy:new Date().toISOString(), opis:String(opis||"").slice(0,300),
                gdzie:String(gdzie||"").slice(0,200),
                slady:_slady.slice(-DIAG_SLADY),
                wersja:(document.querySelector(".ver")||{}).textContent||"",
                ekran:innerWidth+"×"+innerHeight,
                tryb:(navigator.standalone || matchMedia("(display-mode: standalone)").matches)
                     ? "z ekranu głównego" : "przeglądarka"};
  const lista = diagWczytaj(); lista.push(wpis); diagZapisz(lista);
  pokazPasekBledu(wpis);
}
/** Krótki pasek na dole — nie zasłania pracy, ale nie da się go przeoczyć. */
function pokazPasekBledu(wpis){
  let p = document.getElementById("pasekBledu");
  if(!p){
    p = document.createElement("div");
    p.id = "pasekBledu";
    document.body.appendChild(p);
  }
  p.innerHTML =
    '<span class="pbTxt"></span>'+
    '<button class="pbKop" type="button">Kopiuj</button>'+
    '<button class="pbZam" type="button" aria-label="Zamknij">✕</button>';
  p.querySelector(".pbTxt").textContent = "Coś poszło nie tak: " + wpis.opis;
  p.style.display = "flex";
  p.querySelector(".pbZam").onclick = ()=>{ p.style.display = "none"; };
  p.querySelector(".pbKop").onclick = ()=>{
    const tekst = diagRaport();
    if(navigator.clipboard) navigator.clipboard.writeText(tekst)
      .then(()=>toastOk("Skopiowano szczegóły — wklej je w zgłoszeniu"))
      .catch(()=>pokazRaport(tekst));
    else pokazRaport(tekst);
  };
}
/** Pełny raport do wklejenia. */
function diagRaport(){
  const l = diagWczytaj();
  /* Ślady bieżącej sesji dokładamy zawsze, także gdy żaden błąd się nie zapisał.
     Część rzeczy nie jest błędem — brak sieci, nieudana rejestracja obsługi
     offline — a i tak warto wiedzieć, co się działo, gdy użytkownik mówi
     „coś jest nie tak". */
  const kroki = _slady.length
    ? "\n\nBieżąca sesja — ostatnie kroki:\n" + _slady.map(x=>"    "+x).join("\n")
    : "";
  if(!l.length) return (kroki ? "Brak zapisanych błędów." + kroki : "Brak zapisanych błędów.");
  return l.map(w=>{
    const glowa = `${w.kiedy}  ${w.wersja}  ${w.tryb}  ${w.ekran}\n  ${w.opis}\n  ${w.gdzie}`;
    const kroki = (w.slady && w.slady.length)
      ? "\n  ostatnie kroki:\n" + w.slady.map(x=>"    "+x).join("\n") : "";
    return glowa + kroki;
  }).join("\n\n") + kroki;
}
function pokazRaport(tekst){
  showInfo("Szczegóły błędów",
    "<p>Skopiuj poniższy tekst i wklej go w zgłoszeniu:</p>"+
    "<pre style='white-space:pre-wrap;font-size:11px;max-height:40vh;overflow:auto'>"+
    esc(tekst)+"</pre>");
}
/** Czyści dziennik — po naprawie nie ma sensu straszyć starymi wpisami. */
function diagWyczysc(){
  try{ localStorage.removeItem(DIAG_KLUCZ); }catch(e){}
  _slady.length = 0;          // czyścimy też ślady — inaczej „wyczyść" czyści połowę
  const p = document.getElementById("pasekBledu"); if(p) p.style.display = "none";
  toastOk("Wyczyszczono dziennik błędów");
}

/* Awarie sieci nie są usterkami aplikacji.
   Przy braku połączenia przeglądarka zgłasza do okna „Script … load failed"
   — najczęściej przy próbie odświeżenia obsługi offline. Czerwony pasek
   z takim komunikatem straszy użytkownika czymś, na co nikt nie ma wpływu
   i co samo mija po powrocie sieci. Zapisujemy to w śladach, żeby przy
   zgłoszeniu było widać, ale nie robimy z tego alarmu. */
function toAwariaSieci(tresc, gdzie){
  const t = String(tresc||"") + " " + String(gdzie||"");
  if(/service worker|serviceworker|newestWorker|updateViaCache|null\/nonexistent/i.test(t)) return true;
  if(!/load failed|Failed to fetch|NetworkError|ERR_INTERNET|network error/i.test(t)) return false;
  /* Wyjątek: gdy sieć DZIAŁA, a zasób i tak się nie wczytał, to już jest
     wiadomość warta pokazania — brakuje pliku albo serwer go nie oddaje. */
  return navigator.onLine === false || /sw\.js|serviceworker/i.test(t);
}

window.addEventListener("error", e=>{
  /* Błędy wczytywania obrazków i innych zasobów nie mają message — te pomijamy,
     bo nie mówią nic o działaniu aplikacji. */
  if(!e || !e.message) return;
  if(toAwariaSieci(e.message, e.filename)){
    slad("brak sieci: " + String(e.message).slice(0,60));
    return;
  }
  /* Gołe „Script error.” bez pliku, linii i obiektu Error nie pochodzi z
     mierzalnego miejsca naszej aplikacji. Tak przeglądarka zgłasza najczęściej
     błąd skryptu wstrzykniętego przez rozszerzenie albo własny komponent,
     którego źródło celowo ukrywa. Zapisywanie tego jako awarii JW Study dawało
     czerwony alarm bez jednego szczegółu potrzebnego do naprawy. Prawdziwy błąd
     naszego jednoplikowego index.html ma co najmniej numer linii lub obiekt
     Error i nadal przechodzi do dziennika. */
  if(/^Script error\.?$/i.test(String(e.message).trim())
     && !e.filename && !e.lineno && !e.colno && !e.error){
    slad("pominięto anonimowy błąd zewnętrznego skryptu");
    return;
  }
  /* Przy „Script error." przeglądarka ukrywa szczegóły, ale sam obiekt błędu
     bywa dostępny — wtedy stos mówi więcej niż komunikat. */
  const stos = (e.error && e.error.stack) ? String(e.error.stack).slice(0,300) : "";
  zapiszBlad(e.message + (e.error && e.error.message && e.error.message!==e.message
                          ? " — " + e.error.message : ""),
             (e.filename||"") + (e.lineno?(":"+e.lineno):"") + (stos ? "\n  " + stos : ""));
});

/* Ślady zbieramy z rzeczy, które użytkownik faktycznie robi. Bez treści notatek
   — w dzienniku błędów nie ma prawa znaleźć się to, co napisał. */
document.addEventListener("click", e=>{
  const c = e.target && e.target.closest ? e.target.closest("[data-act],[data-x],[id],button") : null;
  if(!c) return;
  slad("dotknięcie: " + (c.dataset && (c.dataset.act || c.dataset.x) || c.id || c.className || c.tagName));
}, true);
window.addEventListener("unhandledrejection", e=>{
  const p = e && e.reason;
  const tresc = (p && (p.message || p)) || "odrzucona obietnica";
  if(toAwariaSieci(tresc, p && p.stack)){
    slad("brak sieci: " + String(tresc).slice(0,60));
    return;
  }
  zapiszBlad(tresc, (p && p.stack) || "");
});


/* Zdarzenia aplikacji warte zapamiętania — widok, sortowanie, wielkość okna. */
(function(){
  const lista = document.getElementById("noteList");
  if(lista && typeof MutationObserver!=="undefined"){
    new MutationObserver(()=>slad("widok listy: " + lista.className))
      .observe(lista, {attributes:true, attributeFilter:["class"]});
  }
  let _sladResizeT = null;
  addEventListener("resize", ()=>{
    clearTimeout(_sladResizeT);
    _sladResizeT = setTimeout(()=>slad("rozmiar okna: " + innerWidth + "×" + innerHeight), 300);
  });
  addEventListener("orientationchange", ()=>slad("obrót ekranu"));
})();
