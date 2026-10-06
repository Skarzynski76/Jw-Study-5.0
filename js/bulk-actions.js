/* ==========================================================================
   JW Study — bulk-actions.js
   AKCJE ZBIORCZE, TRYB WYBORU I PRZENOSZENIE WIELU NOTATEK
   ========================================================================== */
"use strict";

const zaznaczoneNotatki = new Set();
let trybWyboru = false;

/** Odmiana liczebników dla słowa „notatka”. */
function formatujLiczbeNotatek(ile){
  if(ile === 1) return "1 notatka";
  const d = ile % 10, s = ile % 100;
  if(d >= 2 && d <= 4 && (s < 12 || s > 14)) return ile + " notatki";
  return ile + " notatek";
}

/** Pobiera listę identyfikatorów (g) notatek widocznych aktualnie na liście. */
function pobierzWidoczneGuidy(){
  const cards = document.querySelectorAll("#noteList .ncard[data-g]");
  return Array.from(cards).map(c => c.dataset.g).filter(Boolean);
}

/** Pobiera obiekty notatek dla aktualnie zaznaczonych identyfikatorów. */
function pobierzZaznaczoneObiekty(){
  const gMap = new Map(notes.map(n => [n.g, n]));
  return Array.from(zaznaczoneNotatki).map(g => gMap.get(g)).filter(n => n && !n.del);
}

/** Odświeża stan wizualny kart na liście (checkboxy i obramowanie). */
function odswiezZaznaczeniaKart(kontener){
  const el = kontener || $("noteList");
  if(!el) return;
  el.querySelectorAll(".ncard[data-g]").forEach(card => {
    const g = card.dataset.g;
    const isSel = zaznaczoneNotatki.has(g);
    card.classList.toggle("is-selected", isSel);
    const cb = card.querySelector(".nsel-cb");
    if(cb) cb.checked = isSel;
  });
}

/** Odświeża dolny pasek akcji zbiorczych oraz przycisk trybu wyboru. */
function odswiezPasekZbiorczy(){
  const pasek = $("pasekZbiorczy");
  const lbl = $("bulkCountTxt");
  const btnWybor = $("btnTrybWyboru");
  const btnSelAll = $("btnBulkSelectAll");
  const ile = zaznaczoneNotatki.size;

  if(btnWybor){
    btnWybor.classList.toggle("on", trybWyboru || ile > 0);
    const span = btnWybor.querySelector("span");
    if(span) span.textContent = ile > 0 ? ("Wybrano: " + ile) : "Zaznacz";
  }

  if(ile > 0 || trybWyboru){
    document.body.classList.add("tryb-wyboru");
    if(pasek) pasek.hidden = false;
  } else {
    document.body.classList.remove("tryb-wyboru");
    if(pasek) pasek.hidden = true;
  }

  if(lbl){
    lbl.textContent = "Zaznaczono: " + ile;
  }

  if(btnSelAll){
    const widoczne = pobierzWidoczneGuidy();
    const wszystkieZaznaczone = widoczne.length > 0 && widoczne.every(g => zaznaczoneNotatki.has(g));
    btnSelAll.textContent = wszystkieZaznaczone ? "Odznacz wszystkie" : "Zaznacz wszystkie";
  }
}

/** Resetuje zaznaczenie i wyłącza tryb wyboru. */
function anulujZaznaczenieZbiorcze(){
  zaznaczoneNotatki.clear();
  trybWyboru = false;
  odswiezZaznaczeniaKart();
  odswiezPasekZbiorczy();
}

/* Konwersja HTML do czystego Markdown (do eksportu .md) */
function htmlToMarkdown(html){
  if(!html) return "";
  const tmp = (typeof parsujBezwladnie === "function") ? parsujBezwladnie(html) : document.createElement("div");
  if(typeof parsujBezwladnie !== "function") tmp.innerHTML = html;
  let out = "";
  function walk(node){
    node.childNodes.forEach(ch => {
      if(ch.nodeType === 3){
        out += ch.textContent;
      } else if(ch.nodeType === 1){
        const t = ch.tagName;
        if(t === "BR"){ out += "\n"; return; }
        if(t === "HR"){ out += "\n\n---\n\n"; return; }
        if(t === "IMG"){ out += `![${ch.alt || "grafika"}](${ch.src || ""})`; return; }
        if(t === "H1"){ out += "\n\n# "; walk(ch); out += "\n\n"; return; }
        if(t === "H2"){ out += "\n\n## "; walk(ch); out += "\n\n"; return; }
        if(t === "H3"){ out += "\n\n### "; walk(ch); out += "\n\n"; return; }
        if(t === "STRONG" || t === "B"){ out += "**"; walk(ch); out += "**"; return; }
        if(t === "EM" || t === "I"){ out += "*"; walk(ch); out += "*"; return; }
        if(t === "U"){ out += "_"; walk(ch); out += "_"; return; }
        if(t === "MARK"){ out += "=="; walk(ch); out += "=="; return; }
        if(t === "BLOCKQUOTE"){ out += "\n\n> "; walk(ch); out += "\n\n"; return; }
        if(t === "LI"){
          const isOl = ch.parentElement && ch.parentElement.tagName === "OL";
          const idx = isOl ? ([...ch.parentElement.children].indexOf(ch) + 1) + ". " : "- ";
          out += "\n" + idx;
          walk(ch);
          return;
        }
        if(t === "A"){
          out += "[";
          walk(ch);
          out += `](${ch.getAttribute("href") || ""})`;
          return;
        }
        walk(ch);
        if(["DIV", "P"].includes(t) && out && !out.endsWith("\n")) out += "\n\n";
      }
    });
  }
  walk(tmp);
  return out.trim().replace(/\n{3,}/g, "\n\n");
}

/* ==========================================================================
   OTWIERANIE MODALU PRZENOSZENIA ZBIORCZEGO
   ========================================================================== */
function otworzModalPrzeniesZbiorczo(){
  const wybrane = pobierzZaznaczoneObiekty();
  if(!wybrane.length){
    toast("Zaznacz najpierw notatki do przeniesienia");
    return;
  }
  const lbl = $("lblMoveCount");
  if(lbl) lbl.textContent = formatujLiczbeNotatek(wybrane.length);

  const container = $("secMoveList");
  if(!container) return;
  container.innerHTML = "";

  const secList = sections.slice().sort((a,b)=>(a.ord??0)-(b.ord??0));

  secList.forEach(s => {
    const card = document.createElement("div");
    card.className = "sec-move-card";

    const head = document.createElement("div");
    head.className = "sec-move-head";
    const dot = s.color ? `<span class="sec-move-color-dot" style="background:${s.color}"></span>` : "";
    head.innerHTML = `<div class="sec-move-title">${dot}<span>${esc(s.name)}</span></div>`;
    card.appendChild(head);

    const tabsBox = document.createElement("div");
    tabsBox.className = "sec-move-tabs";

    const sTabs = secTabsFor(s.id);
    if(sTabs.length){
      sTabs.forEach(z => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sec-tab-choice-btn";
        btn.innerHTML = `${ICO.tag || ""} <span>${esc(z.name)}</span> <span class="cnt">(${secTabCount(z.id)})</span>`;
        btn.onclick = () => wykonajPrzeniesienieZbiorcze(z.id, z.name);
        tabsBox.appendChild(btn);
      });
    }

    const newTabBtn = document.createElement("button");
    newTabBtn.type = "button";
    newTabBtn.className = "sec-tab-choice-btn sec-tab-new-btn";
    newTabBtn.innerHTML = `<span>+ Nowa zakładka</span>`;
    newTabBtn.onclick = async () => {
      await createSecTab(s.id);
      otworzModalPrzeniesZbiorczo();
    };
    tabsBox.appendChild(newTabBtn);

    card.appendChild(tabsBox);
    container.appendChild(card);
  });

  // Karta: Bez zakładki (zdejmij z zakładek)
  const removeCard = document.createElement("div");
  removeCard.className = "sec-move-card";
  removeCard.style.marginTop = "4px";
  removeCard.innerHTML = `
    <div class="sec-move-head">
      <div class="sec-move-title" style="font-size:13.5px;color:var(--text-muted)">
        <span>Pozostałe opcje</span>
      </div>
    </div>
    <div class="sec-move-tabs">
      <button type="button" class="sec-tab-choice-btn" id="btnMoveNoTab">
        <span>✕ Zdejmij z zakładki (bez przypisania)</span>
      </button>
    </div>
  `;
  const btnNoTab = removeCard.querySelector("#btnMoveNoTab");
  if(btnNoTab) btnNoTab.onclick = () => wykonajPrzeniesienieZbiorcze(null, "bez zakładki");
  container.appendChild(removeCard);

  openModal("modalPrzeniesZbiorczo");
}

async function wykonajPrzeniesienieZbiorcze(tabId, tabName){
  const wybrane = pobierzZaznaczoneObiekty();
  if(!wybrane.length) return;

  wybrane.forEach(n => {
    if(tabId === null) delete n.stb;
    else n.stb = tabId;
    n.ed = true;
    n.mo = new Date().toISOString();
  });

  if(typeof idb !== "undefined" && idb){
    await idbBulkChunked("notes", wybrane).catch(e => reportSaveError(e, "przenoszenie zbiorcze"));
  }
  if(typeof bumpDirty === "function") bumpDirty();

  closeModal("modalPrzeniesZbiorczo");
  anulujZaznaczenieZbiorcze();
  renderAll();
  toastOk(`Przeniesiono ${formatujLiczbeNotatek(wybrane.length)} do zakładki „${tabName}”`);
}

/* ==========================================================================
   OTWIERANIE MODALU ETYKIET ZBIORCZYCH
   ========================================================================== */
function otworzModalEtykietyZbiorczo(){
  const wybrane = pobierzZaznaczoneObiekty();
  if(!wybrane.length){
    toast("Zaznacz najpierw notatki");
    return;
  }
  const lbl = $("lblTagCount");
  if(lbl) lbl.textContent = formatujLiczbeNotatek(wybrane.length);

  renderListaEtykietZbiorczo("");

  const filterInp = $("bulkTagFilter");
  if(filterInp){
    filterInp.value = "";
    filterInp.oninput = () => renderListaEtykietZbiorczo(filterInp.value);
  }

  openModal("modalEtykietyZbiorczo");
}

function renderListaEtykietZbiorczo(filtr){
  const container = $("bulkTagsList");
  if(!container) return;
  container.innerHTML = "";

  const wybrane = pobierzZaznaczoneObiekty();
  const total = wybrane.length;
  const f = (filtr || "").trim().toLowerCase();

  const sortedTags = tags.slice().sort((a,b)=>(a.name||"").localeCompare(b.name||"","pl"));
  const filtered = f ? sortedTags.filter(t => (t.name||"").toLowerCase().includes(f)) : sortedTags;

  if(!filtered.length){
    container.innerHTML = `<div style="text-align:center;padding:24px 10px;color:var(--text-muted);font-size:13px">Brak pasujących etykiet</div>`;
    return;
  }

  filtered.forEach(t => {
    const ileMa = wybrane.filter(n => n.tg && n.tg.includes(t.id)).length;
    const row = document.createElement("div");
    row.className = "bulk-tag-item";

    let badge = "";
    if(ileMa === total){
      badge = `<span class="bulk-tag-badge all">We wszystkich (${ileMa})</span>`;
    } else if(ileMa > 0){
      badge = `<span class="bulk-tag-badge part">W części (${ileMa}/${total})</span>`;
    } else {
      badge = `<span class="bulk-tag-badge">Brak (0/${total})</span>`;
    }

    const dot = t.color ? `<span style="width:10px;height:10px;border-radius:50%;background:${t.color};display:inline-block;flex-shrink:0"></span>` : "";

    row.innerHTML = `
      <div class="bulk-tag-info">
        ${dot}
        <span style="font-weight:600;font-size:13.5px;color:var(--text)">${esc(t.name)}</span>
        ${badge}
      </div>
      <div class="bulk-tag-btns">
        ${ileMa < total ? `<button type="button" class="sbtn mini btn-add-tag" data-tid="${t.id}">+ Dodaj</button>` : ""}
        ${ileMa > 0 ? `<button type="button" class="sbtn mini btn-danger btn-del-tag" data-tid="${t.id}">− Usuń</button>` : ""}
      </div>
    `;

    const btnAdd = row.querySelector(".btn-add-tag");
    if(btnAdd){
      btnAdd.onclick = async () => {
        wybrane.forEach(n => {
          if(!n.tg) n.tg = [];
          if(!n.tg.includes(t.id)){
            n.tg.push(t.id);
            n.ed = true;
            n.mo = new Date().toISOString();
          }
        });
        if(typeof idb !== "undefined" && idb) await idbBulkChunked("notes", wybrane);
        if(typeof bumpDirty === "function") bumpDirty();
        renderAll();
        renderListaEtykietZbiorczo($("bulkTagFilter") ? $("bulkTagFilter").value : "");
        toastOk(`Dodano etykietę „${t.name}” do ${formatujLiczbeNotatek(wybrane.length)}`);
      };
    }

    const btnDel = row.querySelector(".btn-del-tag");
    if(btnDel){
      btnDel.onclick = async () => {
        wybrane.forEach(n => {
          if(n.tg && n.tg.includes(t.id)){
            n.tg = n.tg.filter(id => id !== t.id);
            n.ed = true;
            n.mo = new Date().toISOString();
          }
        });
        if(typeof idb !== "undefined" && idb) await idbBulkChunked("notes", wybrane);
        if(typeof bumpDirty === "function") bumpDirty();
        renderAll();
        renderListaEtykietZbiorczo($("bulkTagFilter") ? $("bulkTagFilter").value : "");
        toastOk(`Usunięto etykietę „${t.name}” z wybranych notatek`);
      };
    }

    container.appendChild(row);
  });
}

/* ==========================================================================
   PALETA KOLORÓW DLA ZAZNACZONYCH NOTATEK
   ========================================================================== */
function otworzKoloryZbiorczo(kotwica){
  const wybrane = pobierzZaznaczoneObiekty();
  if(!wybrane.length){
    toast("Zaznacz najpierw notatki");
    return;
  }
  const dd = $("dropdown");
  dd.innerHTML =
    `<div class="dd-lbl">Kolor dla ${formatujLiczbeNotatek(wybrane.length)}</div>`+
    `<div class="tlaSiatka">`+
      TLA_KARTECZEK.map(([nazwa,hex])=>
        `<button type="button" class="tloSw" `+
        `data-bulk-tlo="${hex}" title="${esc(nazwa)}" aria-label="${esc(nazwa)}" `+
        `style="background:${hex}"></button>`).join("")+
    `</div>`+
    `<div class="dd-sep"></div>`+
    `<label class="tloWlasny">${ICO.paint||""}Dowolny kolor…`+
      `<input type="color" data-bulk-tlowlasny value="#fdf3bf">`+
    `</label>`+
    `<div data-bulk-tlo="">Bez koloru (domyślny)</div>`;
  dd.style.display = "block";
  if(typeof oznaczPozycjeMenu === "function") oznaczPozycjeMenu(dd);
  placeDropdown(dd, kotwica || $("btnBulkColor"));

  const zastosuj = async (kol)=>{
    wybrane.forEach(n => {
      ustawTloNotatki(n, kol || null);
    });
    if(typeof idb !== "undefined" && idb){
      await idbBulkChunked("notes", wybrane).catch(e => reportSaveError(e, "kolor zbiorczy"));
    }
    renderNotes();
    toastOk(kol ? `Zmieniono kolor dla ${formatujLiczbeNotatek(wybrane.length)}` : `Zdjęto kolor z ${formatujLiczbeNotatek(wybrane.length)}`);
  };

  dd.onclick = e => {
    const sw = e.target.closest("[data-bulk-tlo]");
    if(!sw) return;
    dd.style.display = "none";
    zastosuj(sw.dataset.bulkTlo);
  };

  const pole = dd.querySelector("[data-bulk-tlowlasny]");
  if(pole){
    pole.onchange = e => {
      dd.style.display = "none";
      zastosuj(e.target.value);
    };
  }
}

/* ==========================================================================
   SCALANIE WYBRANYCH NOTATEK
   ========================================================================== */
async function scalZaznaczoneNotatki(){
  const wybrane = pobierzZaznaczoneObiekty();
  if(wybrane.length < 2){
    toast("Wybierz co najmniej 2 notatki do połączenia", "err");
    return;
  }
  const ok = await askConfirm(`Połączyć ${wybrane.length} notatek w jedną?`,
    `<p>Treści wybranych notatek zostaną połączone w nową notatkę z zachowaniem wszystkich etykiet.</p>`+
    `<p style="font-size:12.5px;color:var(--text-muted);margin-top:8px">Oryginalne notatki (${wybrane.length}) zostaną przeniesione do kosza.</p>`,
    { okLabel: "Połącz notatki" });
  if(!ok) return;

  const combinedParts = wybrane.map((n, idx) => {
    const title = n.t ? `<h3 style="margin:12px 0 4px;font-size:16px">${esc(n.t)}</h3>` : "";
    const meta = `<div style="font-size:11.5px;color:#777;margin-bottom:8px">${exportMetaLine(n)}</div>`;
    const body = n.h || esc(n.c || "");
    return `<div class="merged-section">${title}${meta}${body}</div>`;
  });
  const combinedHtml = combinedParts.join('<hr style="border:0;border-top:1px dashed var(--border);margin:18px 0;">');

  const nowa = {
    g: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID().toUpperCase() : ("G" + Date.now()),
    t: wybrane.find(n => n.t)?.t || ("Połączone notatki (" + wybrane.length + ")"),
    c: htmlToPlain(combinedHtml),
    h: combinedHtml,
    cr: new Date().toISOString(),
    mo: new Date().toISOString(),
    tg: Array.from(new Set(wybrane.flatMap(n => n.tg || []))),
    b: wybrane.find(n => n.b)?.b || 0,
    ch: wybrane.find(n => n.b)?.ch || null,
    v: wybrane.find(n => n.b)?.v || null,
    doc: wybrane.find(n => n.doc)?.doc || 0,
    ks: wybrane.find(n => n.ks)?.ks || "",
    pub: wybrane.find(n => n.pub)?.pub || "",
    itn: wybrane.find(n => n.itn)?.itn || 0,
    stb: wybrane.find(n => n.stb)?.stb || undefined,
    bg: wybrane.find(n => n.bg)?.bg || undefined,
    ed: true
  };

  notes.unshift(nowa);
  wybrane.forEach(n => {
    n.del = true;
    n.delAt = new Date().toISOString();
    markDirty(n);
  });

  if(typeof idb !== "undefined" && idb){
    await idbBulkChunked("notes", [nowa, ...wybrane]);
  }
  if(typeof bumpDirty === "function") bumpDirty();

  anulujZaznaczenieZbiorcze();
  renderAll();
  toastOk(`Połączono ${wybrane.length} notatek w nową notatkę`);
}

/* ==========================================================================
   EKSPORT ZBIORCZY
   ========================================================================== */
async function eksportujZaznaczoneNotatki(){
  const wybrane = pobierzZaznaczoneObiekty();
  if(!wybrane.length){
    toast("Zaznacz najpierw notatki do eksportu");
    return;
  }
  const wybor = await askChoice(`Eksportuj ${formatujLiczbeNotatek(wybrane.length)}`,
    `<p class="ch-lead">Wybierz format eksportu:</p>`,
    [
      { label: "📄 Dokument Word (.doc)", value: "word", style: "primary" },
      { label: "📝 Plik Markdown (.md)", value: "md" },
      { label: "📄 Czysty tekst (.txt)", value: "txt" },
      { label: "📦 Kopia JSON (.json)", value: "json" },
      { label: "Anuluj", value: "" }
    ]);
  if(!wybor) return;

  if(wybor === "word"){
    const blob = new Blob(["\ufeff" + notesExportHtml(wybrane, `Zaznaczone notatki (${wybrane.length})`)], { type: "application/msword" });
    await saveFile(blob, "zaznaczone-notatki.doc", "Zaznaczone notatki (Word)");
    toastOk("Przygotowano dokument Word");
  } else if(wybor === "md"){
    let md = `# Zaznaczone notatki (${wybrane.length})\n\n`;
    wybrane.forEach((n, i) => {
      const tytul = n.t || (`Notatka ${i + 1}`);
      const meta = exportMetaLine(n);
      const contentMd = htmlToMarkdown(n.h || n.c || "");
      md += `## ${tytul}\n*${meta}*\n\n${contentMd}\n\n---\n\n`;
    });
    const blob = new Blob(["\ufeff" + md], { type: "text/markdown;charset=utf-8" });
    await saveFile(blob, "zaznaczone-notatki.md", "Zaznaczone notatki (Markdown)");
    toastOk("Zapisano plik Markdown");
  } else if(wybor === "txt"){
    let txt = `ZAZNACZONE NOTATKI (${wybrane.length})\n${"=".repeat(40)}\n\n`;
    wybrane.forEach((n, i) => {
      const tytul = n.t || (`Notatka ${i + 1}`);
      const meta = exportMetaLine(n);
      const contentTxt = n.c || (n.h ? htmlToPlain(n.h) : "");
      txt += `[${i + 1}] ${tytul}\n${meta}\n${"-".repeat(40)}\n${contentTxt}\n\n${"=".repeat(40)}\n\n`;
    });
    const blob = new Blob(["\ufeff" + txt], { type: "text/plain;charset=utf-8" });
    await saveFile(blob, "zaznaczone-notatki.txt", "Zaznaczone notatki (Tekst)");
    toastOk("Zapisano plik tekstowy");
  } else if(wybor === "json"){
    const data = JSON.stringify({ version: "JW-Study", exportDate: new Date().toISOString(), count: wybrane.length, notes: wybrane }, null, 2);
    const blob = new Blob([data], { type: "application/json;charset=utf-8" });
    await saveFile(blob, "zaznaczone-notatki.json", "Zaznaczone notatki (JSON)");
    toastOk("Zapisano kopię JSON");
  }
}

/* ==========================================================================
   USUWANIE ZBIORCZE DO KOSZA
   ========================================================================== */
async function usunZaznaczoneDoKosza(){
  const wybrane = pobierzZaznaczoneObiekty();
  if(!wybrane.length){
    toast("Zaznacz najpierw notatki");
    return;
  }
  const ok = await askConfirm(`Usunąć ${formatujLiczbeNotatek(wybrane.length)} do kosza?`,
    `<p>Usunięte notatki będą przechowywane w koszu przez 30 dni.</p>`,
    { okLabel: "Usuń do kosza", danger: true });
  if(!ok) return;

  wybrane.forEach(n => {
    n.del = true;
    n.delAt = new Date().toISOString();
    markDirty(n);
  });

  if(typeof idb !== "undefined" && idb){
    await idbBulkChunked("notes", wybrane).catch(e => reportSaveError(e, "usuwanie zbiorcze"));
  }
  if(typeof bumpDirty === "function") bumpDirty();

  anulujZaznaczenieZbiorcze();
  renderAll();
  toastOk(`Przeniesiono ${formatujLiczbeNotatek(wybrane.length)} do kosza`);
}

/* ==========================================================================
   INICJALIZACJA ZDARZEŃ AKCJI ZBIORCZYCH
   ========================================================================== */
function initAkcjeZbiorcze(){
  // Nasłuch checkboxów kart
  document.addEventListener("change", e => {
    const cb = e.target.closest(".nsel-cb");
    if(!cb) return;
    const g = cb.dataset.g || (cb.closest(".ncard") && cb.closest(".ncard").dataset.g);
    if(!g) return;
    if(cb.checked){
      zaznaczoneNotatki.add(g);
    } else {
      zaznaczoneNotatki.delete(g);
    }
    const card = cb.closest(".ncard");
    if(card) card.classList.toggle("is-selected", cb.checked);
    odswiezPasekZbiorczy();
  });

  // Przycisk "Zaznacz" w szybkich filtrach
  const btnTrybWyboru = $("btnTrybWyboru");
  if(btnTrybWyboru){
    btnTrybWyboru.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      if(trybWyboru && zaznaczoneNotatki.size === 0){
        trybWyboru = false;
      } else if(trybWyboru && zaznaczoneNotatki.size > 0){
        anulujZaznaczenieZbiorcze();
        return;
      } else {
        trybWyboru = true;
      }
      odswiezPasekZbiorczy();
    };
  }

  // Zaznacz / Odznacz wszystkie widoczne
  const btnSelAll = $("btnBulkSelectAll");
  if(btnSelAll){
    btnSelAll.onclick = () => {
      const widoczne = pobierzWidoczneGuidy();
      if(!widoczne.length){
        toast("Brak widocznych notatek do zaznaczenia");
        return;
      }
      const wszystkieZaznaczone = widoczne.every(g => zaznaczoneNotatki.has(g));
      if(wszystkieZaznaczone){
        widoczne.forEach(g => zaznaczoneNotatki.delete(g));
      } else {
        widoczne.forEach(g => zaznaczoneNotatki.add(g));
      }
      odswiezZaznaczeniaKart();
      odswiezPasekZbiorczy();
    };
  }

  // Przenieś…
  const btnMove = $("btnBulkMove");
  if(btnMove) btnMove.onclick = otworzModalPrzeniesZbiorczo;

  // Etykiety…
  const btnTag = $("btnBulkTag");
  if(btnTag) btnTag.onclick = otworzModalEtykietyZbiorczo;

  // Przypnij
  const btnPin = $("btnBulkPin");
  if(btnPin) btnPin.onclick = async () => {
    const wybrane = pobierzZaznaczoneObiekty();
    if(!wybrane.length){ toast("Zaznacz najpierw notatki"); return; }
    const allPinned = wybrane.every(n => n.pin);
    const nowyStan = !allPinned;
    wybrane.forEach(n => {
      n.pin = nowyStan;
      n.ed = true;
      n.mo = new Date().toISOString();
    });
    if(typeof idb !== "undefined" && idb) await idbBulkChunked("notes", wybrane);
    if(typeof bumpDirty === "function") bumpDirty();
    renderAll();
    odswiezZaznaczeniaKart();
    toastOk(nowyStan ? `Przypięto ${formatujLiczbeNotatek(wybrane.length)} na górze` : `Odpięto ${formatujLiczbeNotatek(wybrane.length)}`);
  };

  // Ulubione
  const btnFav = $("btnBulkFav");
  if(btnFav) btnFav.onclick = async () => {
    const wybrane = pobierzZaznaczoneObiekty();
    if(!wybrane.length){ toast("Zaznacz najpierw notatki"); return; }
    const allFav = wybrane.every(n => n.fav);
    const nowyStan = !allFav;
    wybrane.forEach(n => {
      n.fav = nowyStan;
      n.ed = true;
      n.mo = new Date().toISOString();
    });
    if(typeof idb !== "undefined" && idb) await idbBulkChunked("notes", wybrane);
    if(typeof bumpDirty === "function") bumpDirty();
    renderAll();
    odswiezZaznaczeniaKart();
    toastOk(nowyStan ? `Dodano ${formatujLiczbeNotatek(wybrane.length)} do ulubionych` : `Usunięto ${formatujLiczbeNotatek(wybrane.length)} z ulubionych`);
  };

  // Kolor…
  const btnColor = $("btnBulkColor");
  if(btnColor) btnColor.onclick = e => {
    e.stopPropagation();
    otworzKoloryZbiorczo(btnColor);
  };

  // Scal
  const btnMerge = $("btnBulkMerge");
  if(btnMerge) btnMerge.onclick = scalZaznaczoneNotatki;

  // Eksportuj…
  const btnExport = $("btnBulkExport");
  if(btnExport) btnExport.onclick = eksportujZaznaczoneNotatki;

  // Usuń
  const btnTrash = $("btnBulkTrash");
  if(btnTrash) btnTrash.onclick = usunZaznaczoneDoKosza;

  // Anuluj (X)
  const btnCancel = $("btnBulkCancel");
  if(btnCancel) btnCancel.onclick = anulujZaznaczenieZbiorcze;

  // Nowa zakładka w modalu przenoszenia
  const btnMoveNewTag = $("btnMoveNewTag");
  if(btnMoveNewTag){
    btnMoveNewTag.onclick = async () => {
      const secList = sections.slice().sort((a,b)=>(a.ord??0)-(b.ord??0));
      if(!secList.length){ toast("Brak dostępnych sekcji"); return; }
      let secId = secList[0].id;
      if(secList.length > 1){
        const wybor = await askChoice("Nowa zakładka", "<p class=\"ch-lead\">W której sekcji utworzyć zakładkę?</p>",
          secList.map(s => ({ label: s.name, value: String(s.id) })).concat([{ label: "Anuluj", value: "" }]));
        if(!wybor) return;
        secId = +wybor;
      }
      await createSecTab(secId);
      otworzModalPrzeniesZbiorczo();
    };
  }

  // Nowa etykieta w modalu etykiet
  const btnBulkNewTag = $("btnBulkNewTag");
  if(btnBulkNewTag){
    btnBulkNewTag.onclick = async () => {
      const nazwa = await askText({ title: "Nowa etykieta", placeholder: "np. Wykłady", okLabel: "Utwórz i przypisz" });
      if(!nazwa || !nazwa.trim()) return;
      const t = createTag(nazwa.trim());
      if(t){
        const wybrane = pobierzZaznaczoneObiekty();
        wybrane.forEach(n => {
          if(!n.tg) n.tg = [];
          if(!n.tg.includes(t.id)){
            n.tg.push(t.id);
            n.ed = true;
            n.mo = new Date().toISOString();
          }
        });
        if(typeof idb !== "undefined" && idb) await idbBulkChunked("notes", wybrane);
        if(typeof bumpDirty === "function") bumpDirty();
        renderAll();
        renderListaEtykietZbiorczo($("bulkTagFilter") ? $("bulkTagFilter").value : "");
        toastOk(`Utworzono i przypisano etykietę „${t.name}”`);
      }
    };
  }

  // Obsługa klawisza Escape do anulowania trybu wyboru / odznaczenia
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      const modalPrzenies = $("modalPrzeniesZbiorczo");
      const modalEtykiety = $("modalEtykietyZbiorczo");
      if (modalPrzenies && modalPrzenies.classList.contains("show")) {
        closeModal("modalPrzeniesZbiorczo");
        return;
      }
      if (modalEtykiety && modalEtykiety.classList.contains("show")) {
        closeModal("modalEtykietyZbiorczo");
        return;
      }
      if (trybWyboru || zaznaczoneNotatki.size > 0) {
        anulujZaznaczenieZbiorcze();
      }
    }
  });
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", initAkcjeZbiorcze);
} else {
  initAkcjeZbiorcze();
}
