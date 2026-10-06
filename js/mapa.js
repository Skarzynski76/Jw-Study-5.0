/* ==========================================================================
   JW Study — mapa.js
   MAPA TEMATÓW — osobista encyklopedia notatek

   CO BYŁO NIE TAK

   Etykiet jest kilkadziesiąt i leżą w jednej kolumnie, jedna pod drugą. Ta
   kolumna świetnie nadaje się do JEDNEJ rzeczy: zawężenia listy notatek do
   wybranej etykiety. Nie nadaje się do drugiej, wcale nie rzadszej: zobaczenia,
   JAK TO WSZYSTKO SIĘ ZE SOBĄ TRZYMA.

     • przy czterdziestu paru pozycjach nie widać, które są o tym samym;
     • sekcje istniały (grupują etykiety), ale w wąskiej kolumnie wyglądały jak
       kolejny wiersz listy, a nie jak temat z podtematami;
     • nie było jak zapytać „co mam o WIERZE" — trzeba było klikać po kolei
       Ufność, Modlitwę, Próby i za każdym razem patrzeć na osobną listę;
     • licznik przy etykiecie mówił, ile jest notatek, ale nic nie mówił o tym,
       ile ich jest w całym temacie.

   JAK JEST TERAZ

   Osobny ekran: po lewej drzewo tematów, po prawej notatki wybranego miejsca.

       WIARA                    107
         ↳ Ufność                34
         ↳ Modlitwa              61
         ↳ Próby                 12

   Kliknięcie WIARY pokazuje notatki z WSZYSTKICH podtematów naraz — i to jest
   ta „encyklopedia": jedno miejsce, w którym widać cały temat. Kliknięcie
   podtematu zawęża do niego.

   TRZY DECYZJE, KTÓRE WARTO ZNAĆ

   1. MAPA NIE MA WŁASNYCH DANYCH. Temat główny to SEKCJA, podtemat to
      ETYKIETA — czyli dokładnie to, co już jest w aplikacji i co jedzie
      w kopii zapasowej oraz w pliku uzgadniania. Osobne drzewo tematów
      znaczyłoby DRUGĄ ewidencję tego samego: notatka musiałaby być przypisana
      dwa razy, a po miesiącu jedno z przypisań byłoby nieaktualne. Tu nie ma
      czego rozjechać, bo nie ma drugiego zapisu. Skutek uboczny jest
      przyjemny: mapa działa od pierwszego otwarcia, na etykietach, które już
      masz — nie trzeba niczego przepisywać.

   2. LICZNIK TEMATU TO NOTATKI, NIE SUMA PODTEMATÓW. Notatka z etykietami
      „Ufność" i „Modlitwa" liczy się w temacie WIARA RAZ. Suma podtematów
      (34 + 61 + 12) dawałaby liczbę większą od liczby notatek, jakich w ogóle
      jest — a to jedyna rzecz, której licznik nie może robić, bo wtedy nikt mu
      już nie wierzy.

   3. DRZEWO MA DWA POZIOMY, NIE DOWOLNIE WIELE. Głębsze drzewa wyglądają
      bogato na komputerze i rozpadają się na telefonie: siódmy poziom to
      wcięcie na pół szerokości ekranu i nazwa łamana w środku wyrazu. Dwa
      poziomy to też dokładnie tyle, ile ma ludzka pamięć do takich rzeczy:
      temat i jego części.
   ========================================================================== */
"use strict";

/* Ile notatek pokazujemy naraz w prawym panelu. Temat może mieć ich tysiące,
   a nikt nie przewija tysiąca pozycji — do tego jest szukanie. */
const MAPA_ILE = 60;
/* Zapamiętane miejsce w mapie: wraca się do tego samego tematu. */
const MAPA_KLUCZ = KP + "Mapa";
/* Ile trwa uniesienie karty po naciśnięciu. Tyle, co jedno mrugnięcie —
   dłużej i zamiast potwierdzenia robi się z tego czekanie. */
const MAPA_KLIK_MS = 180;

let mapaWybor = null;      // {rodzaj:"temat"|"podtemat"|"poza"|"bez", id}
let mapaSzukane = "";
let mapaIle = MAPA_ILE;

/* ==========================================================================
   LICZENIE
   ========================================================================== */

/**
 * Liczniki dla całej mapy w JEDNYM przebiegu po notatkach.
 *
 * Przy ośmiu tysiącach notatek i czterdziestu etykietach osobne liczenie dla
 * każdego węzła znaczyłoby czterdzieści przebiegów. Tutaj jest jeden: dla
 * każdej notatki dopisujemy jedynkę jej etykietom i — po jednej — każdemu
 * tematowi, którego dotknęła (patrz decyzja 2 w nagłówku pliku).
 *
 * Zwraca: tag (id etykiety → ile), sek (id sekcji → ile), poza, bez, razem.
 * Bez zapisu typu w nawiasach klamrowych — podwójna klamra w pliku wywraca
 * budowanie strony na GitHub Pages (pilnuje tego testy/audyt.js).
 */
function mapaLiczniki(){
  const tag = {}, sek = {};
  let poza = 0, bez = 0, razem = 0;
  const sekEtykiety = new Map();
  tags.forEach(t=>sekEtykiety.set(t.id, t.sec));
  const tematyTej = new Set();
  for(const n of notes){
    if(n.del) continue;
    razem++;
    const tg = Array.isArray(n.tg) ? n.tg : [];
    if(!tg.length){ bez++; continue; }
    tematyTej.clear();
    let maSekcje = false;
    for(const id of tg){
      tag[id] = (tag[id] || 0) + 1;
      const s = sekEtykiety.get(id);
      if(s !== undefined){ tematyTej.add(s); maSekcje = true; }
    }
    tematyTej.forEach(s=>{ sek[s] = (sek[s] || 0) + 1; });
    if(!maSekcje) poza++;
  }
  return {tag, sek, poza, bez, razem};
}

/** Drzewo do wyświetlenia: sekcje w swojej kolejności, w środku ich etykiety. */
function mapaDrzewo(licz){
  const q = norm(mapaSzukane);
  const posortowane = sections.slice().sort((a,b)=>(a.ord ?? 0) - (b.ord ?? 0));
  const wynik = [];
  posortowane.forEach(s=>{
    const pod = tags.filter(t=>t.sec === s.id).sort(cmpTags);
    /* Szukanie: temat zostaje, gdy pasuje sam ALBO gdy pasuje którykolwiek
       z jego podtematów — inaczej wpisanie „modlit" ukrywałoby WIARĘ i nie
       byłoby widać, gdzie znaleziony podtemat należy. */
    const pasujeTemat = !q || norm(s.name).indexOf(q) >= 0;
    const pasujacePod = pod.filter(t=>!q || norm(t.name).indexOf(q) >= 0);
    if(!pasujeTemat && !pasujacePod.length) return;
    wynik.push({rodzaj:"temat", sek:s, ile:licz.sek[s.id] || 0,
                pod: pasujeTemat ? pod : pasujacePod});
  });
  const luzne = tags.filter(t=>t.sec === undefined).sort(cmpTags)
    .filter(t=>!q || norm(t.name).indexOf(q) >= 0);
  if(luzne.length) wynik.push({rodzaj:"poza", sek:null, ile:licz.poza, pod:luzne});
  return wynik;
}

/** Notatki wybranego miejsca w mapie. */
function mapaNotatkiWybranego(){
  if(!mapaWybor) return [];
  const w = mapaWybor;
  let pasuje;
  if(w.rodzaj === "podtemat")      pasuje = n=>n.tg && n.tg.indexOf(w.id) >= 0;
  else if(w.rodzaj === "temat"){
    const wTemacie = new Set(tags.filter(t=>t.sec === w.id).map(t=>t.id));
    pasuje = n=>(n.tg || []).some(id=>wTemacie.has(id));
  }
  else if(w.rodzaj === "poza"){
    const luzne = new Set(tags.filter(t=>t.sec === undefined).map(t=>t.id));
    pasuje = n=>(n.tg || []).some(id=>luzne.has(id));
  }
  else pasuje = n=>!n.tg || !n.tg.length;
  return notes.filter(n=>!n.del && pasuje(n))
    .sort((a,b)=>String(b.mo || "").localeCompare(String(a.mo || "")));
}

/** Nazwa wybranego miejsca — do nagłówka prawego panelu. */
function mapaNazwaWyboru(){
  if(!mapaWybor) return "";
  if(mapaWybor.rodzaj === "temat")
    return ((sections.find(s=>s.id === mapaWybor.id) || {}).name) || "Temat";
  if(mapaWybor.rodzaj === "podtemat")
    return ((tags.find(t=>t.id === mapaWybor.id) || {}).name) || "Podtemat";
  if(mapaWybor.rodzaj === "poza") return "Poza tematami";
  return "Notatki bez etykiety";
}

/* ==========================================================================
   RYSOWANIE
   ========================================================================== */

/**
 * Polska odmiana po liczbie: 1 temat · 2 tematy · 5 tematów.
 * Bez tego podsumowanie mówiło „3 tematów", co przy każdym otwarciu mapy kłuje
 * w oczy. Trzy formy wystarczą na wszystkie słowa, których tu używamy.
 */
function mapaOdmiana(n, jeden, dwa, wiele){
  const x = Math.abs(n) % 100, y = Math.abs(n) % 10;
  if(x === 1) return jeden;
  if(y >= 2 && y <= 4 && !(x >= 12 && x <= 14)) return dwa;
  return wiele;
}
function mapaNotatek(n){ return n + " " + mapaOdmiana(n, "notatka", "notatki", "notatek"); }
function mapaTematow(n){ return n + " " + mapaOdmiana(n, "temat", "tematy", "tematów"); }
function mapaPodtematow(n){ return n + " " + mapaOdmiana(n, "podtemat", "podtematy", "podtematów"); }

function mapaWybrany(rodzaj, id){
  return !!mapaWybor && mapaWybor.rodzaj === rodzaj &&
         (id === undefined || mapaWybor.id === id);
}

function rysujMape(){
  const okno = $("modalMapa"); if(!okno) return;
  const licz = mapaLiczniki();
  const drzewo = mapaDrzewo(licz);

  /* ——— lewa strona: drzewo ——— */
  let html = "";
  if(!sections.length && !tags.length){
    html = `<div class="mapaPusto">Nie masz jeszcze ani jednej etykiety.
      Mapa buduje się z <b>sekcji</b> (temat główny) i <b>etykiet</b> (podtematy),
      więc zacznij od nadania notatkom etykiet.</div>`;
  } else if(!drzewo.length){
    html = `<div class="mapaPusto">Nic nie pasuje do „${esc(mapaSzukane)}”.</div>`;
  } else {
    html = drzewo.map(w=>{
      const idT = w.rodzaj === "temat" ? w.sek.id : "poza";
      const wybT = w.rodzaj === "temat" ? mapaWybrany("temat", w.sek.id) : mapaWybrany("poza");
      const nazwa = w.rodzaj === "temat" ? w.sek.name : "Poza tematami";
      const kolor = w.rodzaj === "temat" && w.sek.color ? w.sek.color : "";
      return `<div class="mapaGrupa">
        <div class="mapaTemat${wybT ? " wybrany" : ""}" data-temat="${esc(String(idT))}"
             role="treeitem" tabindex="0">
          ${kolor ? `<span class="mapaPasek" style="background:${esc(kolor)}"></span>` : ""}
          <span class="mapaNazwa">${esc(nazwa)}</span>
          <span class="mapaIle">${w.ile}</span>
          ${w.rodzaj === "temat"
            ? `<button class="mapaMenu" type="button" data-menuTemat="${w.sek.id}"
                       title="Działania na temacie" aria-label="Działania na temacie">${IC_DOTS}</button>`
            : ""}
        </div>
        ${w.pod.map(t=>`
          <div class="mapaPod${mapaWybrany("podtemat", t.id) ? " wybrany" : ""}"
               data-pod="${t.id}" role="treeitem" tabindex="0">
            <span class="mapaStrzalka">↳</span>
            <span class="mapaKropka" style="background:${esc(t.color || "var(--accent2)")}"></span>
            <span class="mapaNazwa">${esc(t.name)}</span>
            <span class="mapaIle">${licz.tag[t.id] || 0}</span>
            <button class="mapaMenu" type="button" data-menuPod="${t.id}"
                    title="Działania na podtemacie" aria-label="Działania na podtemacie">${IC_DOTS}</button>
          </div>`).join("")}
      </div>`;
    }).join("");
  }
  if(licz.bez){
    html += `<div class="mapaGrupa">
      <div class="mapaTemat mapaBez${mapaWybrany("bez") ? " wybrany" : ""}" data-temat="bez"
           role="treeitem" tabindex="0">
        <span class="mapaNazwa">Notatki bez etykiety</span>
        <span class="mapaIle">${licz.bez}</span>
      </div></div>`;
  }
  setHtml($("mapaDrzewo"), html);
  setText($("mapaPodsum"), mapaNotatek(licz.razem) + " · " + mapaTematow(sections.length) +
    " · " + mapaPodtematow(tags.length));

  /* ——— prawa strona: notatki wybranego miejsca ——— */
  rysujMapePrawa(licz);
}

/* ══════════════════════════════════════════════════════════════════════════
   SIATKA KART TEMATÓW

   Prawa strona mapy była pusta, dopóki nie wybrało się czegoś po lewej —
   zamiast czegokolwiek stało tam zdanie „Wybierz temat po lewej". Strona
   otwierała się więc pusta i najpierw trzeba było ją obsłużyć, żeby coś
   pokazała. A tematy MOŻNA pokazać od razu: jest ich kilka, każdy ma nazwę,
   kolor, liczbę notatek i swoje podtematy.

   Karta pokazuje też UDZIAŁ tematu w całości — cienki pasek pod liczbą.
   Bez niego „75" i „14" to dwie liczby; z nim widać, że jeden temat to
   połowa wszystkiego, a drugi margines.
   ══════════════════════════════════════════════════════════════════════════ */
function mapaKartyTematow(licz){
  const drzewo = mapaDrzewo(licz);
  const razem = Math.max(1, licz.razem);
  if(!drzewo.length && !licz.bez){
    return `<div class="mapaPusto mapaZacheta">
      <b>Nie masz jeszcze ani jednej etykiety.</b><br><br>
      Mapa buduje się z <b>sekcji</b> (temat główny) i <b>etykiet</b> (podtematy),
      więc zacznij od nadania notatkom etykiet.</div>`;
  }
  /* Kolejność kart = kolejność tematów w drzewie. Pierwsza karta pojawia się
     bez zwłoki, każda następna o 45 ms później — stąd `--i`. */
  const karty = drzewo.map((w, i)=>{
    const temat = w.rodzaj === "temat";
    const nazwa = temat ? w.sek.name : "Poza tematami";
    const kolor = (temat && w.sek.color) ? w.sek.color : "var(--muted)";
    const udzial = Math.round(w.ile / razem * 100);
    const chipy = w.pod.slice(0, 6).map(t=>
      `<span class="mapaKartaChip"><span class="mapaKropka" style="background:${
        esc(t.color || "var(--accent2)")}"></span>${esc(t.name)}<i>${licz.tag[t.id] || 0}</i></span>`).join("");
    return `<button type="button" class="mapaKarta" style="--kolT:${esc(kolor)};--i:${i}"
             data-karta="${esc(temat ? String(w.sek.id) : "poza")}">
      <span class="mapaKartaGora"></span>
      <span class="mapaKartaTyt">${esc(nazwa)}</span>
      <span class="mapaKartaIle"><b>${w.ile}</b>${esc(mapaOdmiana(w.ile, "notatka", "notatki", "notatek"))}</span>
      <span class="mapaKartaPasek"><i style="width:${Math.max(2, udzial)}%"></i></span>
      <span class="mapaKartaUdzial">${udzial}% wszystkich notatek</span>
      ${chipy ? `<span class="mapaKartaChipy">${chipy}${
        w.pod.length > 6 ? `<span class="mapaKartaChip mapaKartaWiecej">+${w.pod.length - 6}</span>` : ""
      }</span>` : `<span class="mapaKartaBrak">bez podtematów</span>`}
    </button>`;
  }).join("");
  const bez = licz.bez
    ? `<button type="button" class="mapaKarta mapaKartaBez" style="--kolT:var(--muted);--i:${drzewo.length}"
         data-karta="bez">
        <span class="mapaKartaGora"></span>
        <span class="mapaKartaTyt">Notatki bez etykiety</span>
        <span class="mapaKartaIle"><b>${licz.bez}</b>${esc(mapaOdmiana(licz.bez, "notatka", "notatki", "notatek"))}</span>
        <span class="mapaKartaUdzial">nie należą do żadnego tematu</span>
      </button>`
    : "";
  return `<div class="mapaWstep">
      <h3>Twoje tematy</h3>
      <p>Temat główny pokazuje notatki ze <b>wszystkich swoich podtematów</b> naraz —
         po to, żeby dało się zobaczyć cały temat w jednym miejscu.
         Podtemat zawęża do siebie.</p>
    </div>
    <div class="mapaKarty">${karty}${bez}</div>`;
}

function rysujMapePrawa(licz){
  const box = $("mapaTresc"); if(!box) return;
  if(!mapaWybor){ setHtml(box, mapaKartyTematow(licz)); return; }
  const lista = mapaNotatkiWybranego();
  const nazwa = mapaNazwaWyboru();
  /* Przy temacie pokazujemy jego podtematy jako plakietki — stąd wchodzi się
     głębiej bez wracania wzrokiem do drzewa. */
  let plakietki = "";
  if(mapaWybor.rodzaj === "temat"){
    const pod = tags.filter(t=>t.sec === mapaWybor.id).sort(cmpTags);
    if(pod.length) plakietki = `<div class="mapaChipy">` + pod.map(t=>
      `<button class="mapaChip" type="button" data-chip="${t.id}">
         <span class="mapaKropka" style="background:${esc(t.color || "var(--accent2)")}"></span>
         ${esc(t.name)} <span class="mapaIle">${(licz.tag[t.id] || 0)}</span></button>`).join("") + `</div>`;
  }
  const widoczne = lista.slice(0, mapaIle);
  const wiersze = widoczne.map(n=>{
    const gdzie = n.b && BOOKS[n.b]
      ? BOOKS[n.b] + (n.ch ? " " + n.ch + (n.v ? ":" + n.v : "") : "")
      : (n.pub ? String(n.pub) : "");
    const skrot = String(n.c || "").replace(/\s+/g, " ").trim().slice(0, 150);
    return `<button class="mapaWiersz" type="button" data-notatka="${esc(n.g)}">
      <span class="mapaTyt">${esc(n.t || "Bez tytułu")}</span>
      ${gdzie ? `<span class="mapaGdzie">${esc(gdzie)}</span>` : ""}
      ${skrot ? `<span class="mapaSkrot">${esc(skrot)}</span>` : ""}
    </button>`;
  }).join("");
  setHtml(box, `
    <div class="mapaNagl">
      <button class="mapaDoKart" type="button" id="mapaDoKart">‹ Wszystkie tematy</button>
      <h3>${esc(nazwa)}</h3>
      <div class="mapaNaglIle">${esc(mapaNotatek(lista.length))}${
        mapaWybor.rodzaj === "temat"
          ? " · " + esc(mapaPodtematow(tags.filter(t=>t.sec === mapaWybor.id).length))
          : ""}</div>
      <button class="btn" type="button" id="mapaNaListe">Pokaż na liście notatek</button>
    </div>
    ${plakietki}
    ${lista.length ? `<div class="mapaLista">${wiersze}</div>` : `<div class="mapaPusto">
       W tym miejscu nie ma jeszcze żadnej notatki.</div>`}
    ${lista.length > mapaIle
      ? `<div class="mapaWiecej"><button class="btn" type="button" id="mapaWiecej">Pokaż więcej (${lista.length - mapaIle})</button></div>`
      : ""}`);
}

/* ==========================================================================
   DZIAŁANIA
   ========================================================================== */

function mapaUstawWybor(rodzaj, id){
  mapaWybor = {rodzaj, id};
  mapaIle = MAPA_ILE;
  lsSet(MAPA_KLUCZ, JSON.stringify(mapaWybor));
  rysujMape();
  const p = $("mapaTresc"); if(p) p.scrollTop = 0;
}

/** Powrót ze środka tematu do siatki kart.
    Mapa pamięta ostatni temat między otwarciami, więc bez tej drogi powrotnej
    siatka kart pokazałaby się raz w życiu — przy pierwszym otwarciu — i nigdy
    więcej. Zapominamy też zapamiętany wybór, żeby następne wejście na mapę
    zaczynało się od widoku całości. */
function mapaWrocDoKart(){
  mapaWybor = null;
  mapaIle = MAPA_ILE;
  lsSet(MAPA_KLUCZ, "null");   /* „null", nie "" — otwieranie robi tu JSON.parse */
  rysujMape();
  const p = $("mapaTresc"); if(p) p.scrollTop = 0;
}

/** Menu działań na temacie głównym. */
function mapaMenuTematu(secId, kotwica){
  const s = sections.find(x=>x.id === secId); if(!s) return;
  const dd = $("dropdown");
  dd.innerHTML =
    `<div class="dd-lbl">${esc(s.name)}</div>` +
    `<div data-m="nowyPod">${ICO.tag}Nowy podtemat w tym temacie…</div>` +
    `<div data-m="zmien">${ICO.edit}Zmień nazwę tematu…</div>` +
    `<div class="dd-sep"></div>` +
    `<div data-m="gora">${IE_GORNY}Przenieś wyżej</div>` +
    `<div data-m="dol">${IE_DOLNY}Przenieś niżej</div>` +
    `<div class="dd-sep"></div>` +
    `<div data-m="usun" class="dd-danger">${ICO.trash}Usuń temat (podtematy zostają)</div>`;
  dd.style.display = "block";
  if(typeof oznaczPozycjeMenu === "function") oznaczPozycjeMenu(dd);
  placeDropdown(dd, kotwica);
  dd.onclick = async ev=>{
    const it = ev.target.closest("[data-m]"); if(!it) return;
    dd.style.display = "none";
    const m = it.dataset.m;
    if(m === "nowyPod"){
      const nazwa = await askText({title:"Nowy podtemat w „" + s.name + "”",
        placeholder:"np. Ufność", okLabel:"Utwórz"});
      if(!nazwa || !nazwa.trim()) return;
      const t = createTag(nazwa.trim());
      if(t){ setTagSection(t.id, s.id); rysujMape(); }
      return;
    }
    if(m === "zmien"){ await renameSection(s.id); rysujMape(); return; }
    if(m === "gora"){ moveSection(s.id, -1); rysujMape(); return; }
    if(m === "dol"){ moveSection(s.id, +1); rysujMape(); return; }
    if(m === "usun"){
      await deleteSection(s.id);
      if(!sections.some(x=>x.id === s.id) && mapaWybrany("temat", s.id)) mapaWybor = null;
      rysujMape();
    }
  };
}

/** Menu działań na podtemacie (etykiecie). */
function mapaMenuPodtematu(tagId, kotwica){
  const t = tags.find(x=>x.id === tagId); if(!t) return;
  const dd = $("dropdown");
  const inne = sections.slice().sort((a,b)=>(a.ord ?? 0) - (b.ord ?? 0))
    .filter(s=>s.id !== t.sec);
  dd.innerHTML =
    `<div class="dd-lbl">${esc(t.name)}</div>` +
    `<div data-m="zmien">${ICO.edit}Zmień nazwę podtematu…</div>` +
    `<div data-m="naListe">${ICO.search}Pokaż na liście notatek</div>` +
    (inne.length || t.sec !== undefined ? `<div class="dd-sep"></div><div class="dd-lbl">Przenieś do tematu</div>` : "") +
    inne.map(s=>`<div data-sec="${s.id}">${ICO.bookmark}${esc(s.name)}</div>`).join("") +
    (t.sec !== undefined ? `<div data-sec="brak">${IE_PUSTO}Poza tematami</div>` : "") +
    `<div class="dd-sep"></div><div data-m="nowyTemat">${ICO.plus}Nowy temat i przenieś tutaj…</div>`;
  dd.style.display = "block";
  if(typeof oznaczPozycjeMenu === "function") oznaczPozycjeMenu(dd);
  placeDropdown(dd, kotwica);
  dd.onclick = async ev=>{
    const sec = ev.target.closest("[data-sec]");
    if(sec){
      dd.style.display = "none";
      setTagSection(t.id, sec.dataset.sec === "brak" ? null : +sec.dataset.sec);
      rysujMape();
      return;
    }
    const it = ev.target.closest("[data-m]"); if(!it) return;
    dd.style.display = "none";
    if(it.dataset.m === "zmien"){ await renameTag(t.id); rysujMape(); return; }
    if(it.dataset.m === "naListe"){ mapaNaListe("podtemat", t.id); return; }
    if(it.dataset.m === "nowyTemat"){
      const nazwa = await askText({title:"Nowy temat główny",
        placeholder:"np. WIARA", okLabel:"Utwórz i przenieś"});
      if(!nazwa || !nazwa.trim()) return;
      const nm = nazwa.trim();
      if(sections.some(x=>norm(x.name) === norm(nm))){ toast("Taki temat już jest"); return; }
      const nowa = {id:nextSecId(), name:nm, ord:sections.length, open:true};
      sections.push(nowa); saveSections();
      setTagSection(t.id, nowa.id);
      rysujMape();
    }
  };
}

/**
 * Przejście z mapy na zwykłą listę notatek z nałożonym filtrem.
 * Temat główny korzysta z filtru „sec:<id>", dodanego w 04-filters.js — dzięki
 * temu cały temat da się pokazać na liście, a nie tylko jeden podtemat.
 */
function mapaNaListe(rodzaj, id){
  if(rodzaj === "temat")          filt.tag = "sec:" + id;
  else if(rodzaj === "podtemat")  filt.tag = id;
  else if(rodzaj === "bez")       filt.tag = "none";
  else                            filt.tag = "all";
  filt.book = "all"; filt.ch = null; filt.pub = "all";
  if(typeof expandedBook !== "undefined") expandedBook = null;
  if(typeof persistFilt === "function") persistFilt();
  if(typeof centrumSchowaj === "function") centrumSchowaj();
  zamknijMape();
  renderAll();
}

/* ==========================================================================
   OTWIERANIE I ZAMYKANIE
   ========================================================================== */

function otworzMape(){
  mapaIle = MAPA_ILE;
  mapaSzukane = "";
  const pole = $("mapaSzukaj"); if(pole) pole.value = "";
  /* Wracamy tam, gdzie się skończyło — mapa służy do wracania do tematu. */
  if(!mapaWybor){
    try{
      const z = JSON.parse(lsGet(MAPA_KLUCZ, "null"));
      if(z && z.rodzaj) mapaWybor = z;
    }catch(e){ mapaWybor = null; }
  }
  /* Zapamiętany temat mógł zostać w międzyczasie usunięty. */
  if(mapaWybor){
    const zyje = mapaWybor.rodzaj === "temat"    ? sections.some(s=>s.id === mapaWybor.id)
               : mapaWybor.rodzaj === "podtemat" ? tags.some(t=>t.id === mapaWybor.id)
               : true;
    if(!zyje) mapaWybor = null;
  }
  rysujMape();
  openModal("modalMapa");
}
function zamknijMape(){ closeModal("modalMapa"); }

/* ——— wpięcie w interfejs ——— */
if($("btnMapa")) $("btnMapa").onclick = otworzMape;

if($("modalMapa")){
  $("mapaDrzewo").onclick = e=>{
    const menuT = e.target.closest("[data-menuTemat]");
    if(menuT){ e.stopPropagation(); mapaMenuTematu(+menuT.dataset.menutemat, menuT); return; }
    const menuP = e.target.closest("[data-menuPod]");
    if(menuP){ e.stopPropagation(); mapaMenuPodtematu(+menuP.dataset.menupod, menuP); return; }
    const pod = e.target.closest("[data-pod]");
    if(pod){ mapaUstawWybor("podtemat", +pod.dataset.pod); return; }
    const temat = e.target.closest("[data-temat]");
    if(temat){
      const v = temat.dataset.temat;
      if(v === "poza") mapaUstawWybor("poza", null);
      else if(v === "bez") mapaUstawWybor("bez", null);
      else mapaUstawWybor("temat", +v);
    }
  };
  /* Klawiatura: Enter i spacja wybierają węzeł, na którym stoi ognisko. */
  $("mapaDrzewo").onkeydown = e=>{
    if(e.key !== "Enter" && e.key !== " ") return;
    const w = e.target.closest("[data-pod],[data-temat]");
    if(!w) return;
    e.preventDefault();
    w.click();
  };
  $("mapaTresc").onclick = e=>{
    /* KARTA TEMATU. Zanim widok się zmieni, karta na moment unosi się i dostaje
       mocniejszy cień — ruch trwa tyle, co jedno mrugnięcie, i mówi „to
       nacisnąłeś". Bez tego przejście wygląda, jakby strona podmieniła się sama
       z siebie. Zmiana widoku czeka na koniec ruchu, nie odwrotnie. */
    const karta = e.target.closest("[data-karta]");
    if(karta){
      const co = karta.dataset.karta;
      karta.classList.add("klik");
      const idz = ()=>{
        if(co === "poza") mapaUstawWybor("poza", null);
        else if(co === "bez") mapaUstawWybor("bez", null);
        else mapaUstawWybor("temat", +co);
      };
      if(matchMedia("(prefers-reduced-motion: reduce)").matches) idz();
      else setTimeout(idz, MAPA_KLIK_MS);
      return;
    }
    if(e.target.closest("#mapaDoKart")){ mapaWrocDoKart(); return; }
    const chip = e.target.closest("[data-chip]");
    if(chip){ mapaUstawWybor("podtemat", +chip.dataset.chip); return; }
    const wiersz = e.target.closest("[data-notatka]");
    if(wiersz){
      const n = notes.find(x=>x.g === wiersz.dataset.notatka);
      /* Czytnik otwiera się NA mapie, nie zamiast niej: po zamknięciu notatki
         wracasz do tego samego tematu, a nie do listy wszystkich notatek. */
      if(n && typeof openFs === "function") openFs(n);
      return;
    }
    if(e.target.closest("#mapaWiecej")){ mapaIle += MAPA_ILE; rysujMape(); return; }
    if(e.target.closest("#mapaNaListe") && mapaWybor){
      mapaNaListe(mapaWybor.rodzaj, mapaWybor.id);
    }
  };
  $("mapaSzukaj").oninput = e=>{ mapaSzukane = e.target.value || ""; rysujMape(); };
  $("mapaNowyTemat").onclick = async ()=>{
    await createSection();
    rysujMape();
  };
}
