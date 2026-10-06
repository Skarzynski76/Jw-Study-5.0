/* ==========================================================================
   JW Study — Granular Data Sync (Export & Import with Interactive Diff)
   ========================================================================== */
window.GranularSync = (function() {
  "use strict";

  let _expTreeData = null;
  let _impData = null;
  let _impDiffItems = [];
  let _impGlobalStrategy = "nadpisz";
  let _impCurrentFilter = "all";

  // Escape HTML helper
  function _esc(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Strip HTML tags for clean diff previews
  function _stripHtml(html) {
    if (!html) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || "").trim();
  }

  // Format date helper
  function _formatDate(iso) {
    if (!iso) return "Brak daty";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (_) {
      return iso;
    }
  }

  // Check if book identifier is a Bible book (1..66)
  function _isBibleBook(b) {
    if (b === undefined || b === null || b === "" || b === 0 || b === "0") return false;
    const n = Number(b);
    if (!isNaN(n) && n >= 1 && n <= 66) return true;
    if (typeof BOOKS !== "undefined" && Array.isArray(BOOKS)) {
      const idx = BOOKS.indexOf(b);
      return idx >= 1 && idx <= 66;
    }
    return false;
  }

  function _getBibleBookIndex(b) {
    const n = Number(b);
    if (!isNaN(n) && n >= 1 && n <= 66) return n;
    if (typeof BOOKS !== "undefined" && Array.isArray(BOOKS)) {
      return BOOKS.indexOf(b);
    }
    return 0;
  }

  function _getBibleBookName(b) {
    const idx = _getBibleBookIndex(b);
    if (idx >= 1 && typeof BOOKS !== "undefined" && BOOKS[idx]) return BOOKS[idx];
    return String(b || "");
  }

  function _isPub(b) {
    if (!b || b === "0" || b === 0) return false;
    return !_isBibleBook(b);
  }

  function _getPubName(b) {
    if (!_isPub(b)) return "";
    if (typeof pubFullName === "function") {
      const fn = pubFullName(b);
      if (fn) return fn;
    }
    if (typeof PUB_NAMES !== "undefined" && PUB_NAMES[b]) return PUB_NAMES[b];
    return String(b);
  }

  function _getTagName(tagId) {
    if (typeof tags !== "undefined" && Array.isArray(tags)) {
      const t = tags.find(x => x.id === tagId);
      if (t) return t.name;
    }
    return "Etykieta #" + tagId;
  }

  function _getTagColor(tagId) {
    if (typeof tags !== "undefined" && Array.isArray(tags)) {
      const t = tags.find(x => x.id === tagId);
      if (t && t.color) return t.color;
    }
    return "#3b82f6";
  }

  /* ==========================================================================
     EXPORT LOGIC
     ========================================================================== */
  function openExport() {
    const searchInput = document.getElementById("granExpSearch");
    if (searchInput) searchInput.value = "";

    _buildExportTree();
    _updateExportStatus();

    if (typeof openModal === "function") {
      openModal("modalExportWybierz");
    } else {
      const m = document.getElementById("modalExportWybierz");
      if (m) m.classList.add("show");
    }
  }

  function _buildExportTree() {
    const container = document.getElementById("granExpTree");
    if (!container) return;

    const allNotes = (typeof notes !== "undefined" && Array.isArray(notes)) ? notes : [];
    const allTags = (typeof tags !== "undefined" && Array.isArray(tags)) ? tags : [];

    // Grouping
    const bibleMap = new Map(); // bookIdx -> notes[]
    const pubMap = new Map();   // pubCode -> notes[]
    const ownNotes = [];        // notes[]

    allNotes.forEach(n => {
      if (_isBibleBook(n.b)) {
        const bIdx = _getBibleBookIndex(n.b);
        if (!bibleMap.has(bIdx)) bibleMap.set(bIdx, []);
        bibleMap.get(bIdx).push(n);
      } else if (_isPub(n.b)) {
        const pCode = String(n.b);
        if (!pubMap.has(pCode)) pubMap.set(pCode, []);
        pubMap.get(pCode).push(n);
      } else {
        ownNotes.push(n);
      }
    });

    let html = `<div class="gran-tree">`;

    // 1. BIBLIA
    const bibleBooksWithNotes = Array.from(bibleMap.keys()).sort((a,b) => a - b);
    const bibleTotalNotes = bibleBooksWithNotes.reduce((acc, k) => acc + bibleMap.get(k).length, 0);

    html += `
      <div class="gran-group" data-cat="bible">
        <div class="gran-group-header">
          <label class="gran-check-label">
            <input type="checkbox" class="gran-check-cat" data-target="bible" checked>
            <span class="gran-group-title">📖 Pismo Święte (Biblia)</span>
          </label>
          <span class="gran-group-count">${bibleTotalNotes} notatek w ${bibleBooksWithNotes.length} księgach</span>
          <button type="button" class="gran-toggle-group" title="Zwiń / Rozwiń">▼</button>
        </div>
        <div class="gran-group-content">`;

    if (bibleBooksWithNotes.length === 0) {
      html += `<div class="gran-empty-msg">Brak notatek przypisanych do ksiąg biblijnych.</div>`;
    } else {
      bibleBooksWithNotes.forEach(bIdx => {
        const bName = _getBibleBookName(bIdx);
        const bNotes = bibleMap.get(bIdx);
        html += `
          <div class="gran-item" data-type="bible" data-book="${bIdx}">
            <label class="gran-check-label">
              <input type="checkbox" class="gran-exp-item-check" data-type="bible" data-book="${bIdx}" checked>
              <span class="gran-item-name">${_esc(bName)}</span>
            </label>
            <span class="gran-item-badge">${bNotes.length} not.</span>
          </div>`;
      });
    }
    html += `</div></div>`;

    // 2. PUBLIKACJE
    const pubKeys = Array.from(pubMap.keys()).sort((a,b) => _getPubName(a).localeCompare(_getPubName(b)));
    const pubTotalNotes = pubKeys.reduce((acc, k) => acc + pubMap.get(k).length, 0);

    html += `
      <div class="gran-group" data-cat="pub">
        <div class="gran-group-header">
          <label class="gran-check-label">
            <input type="checkbox" class="gran-check-cat" data-target="pub" checked>
            <span class="gran-group-title">📚 Publikacje Towarzystwa Strażnica</span>
          </label>
          <span class="gran-group-count">${pubTotalNotes} notatek w ${pubKeys.length} publikacjach</span>
          <button type="button" class="gran-toggle-group" title="Zwiń / Rozwiń">▼</button>
        </div>
        <div class="gran-group-content">`;

    if (pubKeys.length === 0) {
      html += `<div class="gran-empty-msg">Brak notatek przypisanych do publikacji.</div>`;
    } else {
      pubKeys.forEach(pCode => {
        const pName = _getPubName(pCode);
        const pNotes = pubMap.get(pCode);
        html += `
          <div class="gran-item" data-type="pub" data-pub="${_esc(pCode)}">
            <label class="gran-check-label">
              <input type="checkbox" class="gran-exp-item-check" data-type="pub" data-pub="${_esc(pCode)}" checked>
              <span class="gran-item-name">${_esc(pName)} <small style="color:var(--muted); opacity:0.8;">(${_esc(pCode)})</small></span>
            </label>
            <span class="gran-item-badge">${pNotes.length} not.</span>
          </div>`;
      });
    }
    html += `</div></div>`;

    // 3. WŁASNE NOTATKI / ARTYKUŁY
    html += `
      <div class="gran-group" data-cat="own">
        <div class="gran-group-header">
          <label class="gran-check-label">
            <input type="checkbox" class="gran-check-cat" data-target="own" checked>
            <span class="gran-group-title">📝 Notatki tematyczne i własne artykuły</span>
          </label>
          <span class="gran-group-count">${ownNotes.length} notatek</span>
          <button type="button" class="gran-toggle-group" title="Zwiń / Rozwiń">▼</button>
        </div>
        <div class="gran-group-content">`;

    if (ownNotes.length === 0) {
      html += `<div class="gran-empty-msg">Brak samodzielnych notatek tematycznych.</div>`;
    } else {
      ownNotes.forEach(n => {
        const title = (n.t || "").trim() || "Bez tytułu";
        const dateStr = _formatDate(n.mo || n.cr);
        html += `
          <div class="gran-item" data-type="own" data-guid="${_esc(n.g)}">
            <label class="gran-check-label">
              <input type="checkbox" class="gran-exp-item-check" data-type="own" data-guid="${_esc(n.g)}" checked>
              <span class="gran-item-name">${_esc(title)}</span>
            </label>
            <span class="gran-item-date">${_esc(dateStr)}</span>
          </div>`;
      });
    }
    html += `</div></div>`;

    // 4. ETYKIETY
    html += `
      <div class="gran-group" data-cat="tags">
        <div class="gran-group-header">
          <label class="gran-check-label">
            <input type="checkbox" class="gran-check-cat" data-target="tags" checked>
            <span class="gran-group-title">🏷️ Etykiety użytkownika</span>
          </label>
          <span class="gran-group-count">${allTags.length} etykiet</span>
          <button type="button" class="gran-toggle-group" title="Zwiń / Rozwiń">▼</button>
        </div>
        <div class="gran-group-content">`;

    if (allTags.length === 0) {
      html += `<div class="gran-empty-msg">Brak utworzonych etykiet.</div>`;
    } else {
      allTags.forEach(t => {
        const count = allNotes.filter(n => Array.isArray(n.tg) && n.tg.includes(t.id)).length;
        html += `
          <div class="gran-item" data-type="tag" data-tag="${t.id}">
            <label class="gran-check-label">
              <input type="checkbox" class="gran-exp-item-check" data-type="tag" data-tag="${t.id}" checked>
              <span class="gran-tag-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${_esc(t.color || "#3b82f6")};margin-right:6px;"></span>
              <span class="gran-item-name">${_esc(t.name)}</span>
            </label>
            <span class="gran-item-badge">${count} not.</span>
          </div>`;
      });
    }
    html += `</div></div></div>`;

    container.innerHTML = html;

    // Attach collapsible & checkbox sync listeners
    container.querySelectorAll(".gran-toggle-group").forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const grp = btn.closest(".gran-group");
        if (grp) grp.classList.toggle("collapsed");
      };
    });

    container.querySelectorAll(".gran-check-cat").forEach(chk => {
      chk.onchange = () => {
        const grp = chk.closest(".gran-group");
        if (grp) {
          grp.querySelectorAll(".gran-exp-item-check").forEach(c => { c.checked = chk.checked; });
        }
        _updateExportStatus();
      };
    });

    container.querySelectorAll(".gran-exp-item-check").forEach(chk => {
      chk.onchange = () => {
        const grp = chk.closest(".gran-group");
        if (grp) {
          const allChecks = Array.from(grp.querySelectorAll(".gran-exp-item-check"));
          const parentChk = grp.querySelector(".gran-check-cat");
          if (parentChk) {
            parentChk.checked = allChecks.some(c => c.checked);
          }
        }
        _updateExportStatus();
      };
    });
  }

  function _updateExportStatus() {
    const statusEl = document.getElementById("granExpStatus");
    if (!statusEl) return;

    const selectedNotes = _collectSelectedNotes();
    const selectedTags = _collectSelectedTags();

    statusEl.innerHTML = `Wybrano: <strong>${selectedNotes.length}</strong> notatek, <strong>${selectedTags.length}</strong> etykiet`;
  }

  function _collectSelectedNotes() {
    const allNotes = (typeof notes !== "undefined" && Array.isArray(notes)) ? notes : [];
    const container = document.getElementById("granExpTree");
    if (!container) return [];

    const checkedItems = Array.from(container.querySelectorAll(".gran-exp-item-check:checked"));
    const selectedGuids = new Set();

    const checkedBooks = new Set(checkedItems.filter(c => c.dataset.type === "bible").map(c => Number(c.dataset.book)));
    const checkedPubs = new Set(checkedItems.filter(c => c.dataset.type === "pub").map(c => c.dataset.pub));
    const checkedOwn = new Set(checkedItems.filter(c => c.dataset.type === "own").map(c => c.dataset.guid));
    const checkedTags = new Set(checkedItems.filter(c => c.dataset.type === "tag").map(c => Number(c.dataset.tag)));

    allNotes.forEach(n => {
      if (_isBibleBook(n.b)) {
        if (checkedBooks.has(_getBibleBookIndex(n.b))) selectedGuids.add(n.g);
      } else if (_isPub(n.b)) {
        if (checkedPubs.has(String(n.b))) selectedGuids.add(n.g);
      } else {
        if (checkedOwn.has(n.g)) selectedGuids.add(n.g);
      }

      // Notes tagged with any of selected tags
      if (Array.isArray(n.tg) && n.tg.some(t => checkedTags.has(t))) {
        selectedGuids.add(n.g);
      }
    });

    return allNotes.filter(n => selectedGuids.has(n.g));
  }

  function _collectSelectedTags() {
    const allTags = (typeof tags !== "undefined" && Array.isArray(tags)) ? tags : [];
    const container = document.getElementById("granExpTree");
    if (!container) return [];

    const checkedTagIds = new Set(
      Array.from(container.querySelectorAll('.gran-exp-item-check[data-type="tag"]:checked'))
        .map(c => Number(c.dataset.tag))
    );

    const optIncludeReferencedTags = document.getElementById("granExpOptTags") ? document.getElementById("granExpOptTags").checked : true;
    if (optIncludeReferencedTags) {
      const selectedNotes = _collectSelectedNotes();
      selectedNotes.forEach(n => {
        if (Array.isArray(n.tg)) {
          n.tg.forEach(tId => checkedTagIds.add(tId));
        }
      });
    }

    return allTags.filter(t => checkedTagIds.has(t.id));
  }

  function executeExport() {
    const exportNotes = _collectSelectedNotes();
    const exportTags = _collectSelectedTags();
    const allSections = (typeof sections !== "undefined" && Array.isArray(sections)) ? sections : [];
    const allPubTabs = (typeof pubTabs !== "undefined" && Array.isArray(pubTabs)) ? pubTabs : [];
    const allSecTabs = (typeof secTabs !== "undefined" && Array.isArray(secTabs)) ? secTabs : [];
    const allSzablony = (typeof szablony !== "undefined" && Array.isArray(szablony)) ? szablony : [];

    if (exportNotes.length === 0 && exportTags.length === 0) {
      if (typeof toast === "function") toast("Wybierz przynajmniej jedną notatkę lub etykietę do eksportu.");
      return;
    }

    // Include sections of exported tags
    const usedSecIds = new Set(exportTags.map(t => t.sec).filter(s => s !== undefined && s !== null));
    const exportSections = allSections.filter(s => usedSecIds.has(s.id));

    // Include tabs relevant to exported notes
    const usedPubTabs = new Set(exportNotes.map(n => n.ptb).filter(pt => pt !== undefined));
    const exportPubTabs = allPubTabs.filter(pt => usedPubTabs.has(pt.id));

    const usedSecTabs = new Set(exportNotes.map(n => n.stb).filter(st => st !== undefined));
    const exportSecTabs = allSecTabs.filter(st => usedSecTabs.has(st.id));

    // Handle images option
    const optIncludeImages = document.getElementById("granExpOptImages") ? document.getElementById("granExpOptImages").checked : true;
    let finalNotes = exportNotes;
    if (!optIncludeImages) {
      finalNotes = exportNotes.map(n => {
        const copy = Object.assign({}, n);
        if (copy.h && copy.h.includes("data:image/")) {
          copy.h = copy.h.replace(/src="data:image\/[^"]+"/g, 'src="" data-stripped-img="1" title="[Zdjęcie pominięte podczas eksportu]" alt="[Zdjęcie pominięte]"');
        }
        return copy;
      });
    }

    const exportPackage = {
      version: "5.0-package",
      type: "jw-study-granular-export",
      exportedAt: new Date().toISOString(),
      appVersion: "5.0",
      summary: {
        totalNotes: finalNotes.length,
        totalTags: exportTags.length,
        totalSections: exportSections.length,
        createdFormatted: new Date().toLocaleString("pl-PL")
      },
      notes: finalNotes,
      tags: exportTags,
      sections: exportSections,
      pubTabs: exportPubTabs,
      secTabs: exportSecTabs,
      szablony: allSzablony
    };

    const jsonStr = JSON.stringify(exportPackage, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const fileName = `jw-study-wybrane-${new Date().toISOString().slice(0,10)}.json`;

    if (typeof saveFile === "function") {
      saveFile(blob, fileName, "Pakiet danych JW-Study");
    } else if (typeof download === "function") {
      download(blob, fileName);
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 200);
    }

    if (typeof closeModal === "function") closeModal("modalExportWybierz");
    if (typeof toast === "function") toast(`Pomyślnie wyeksportowano ${finalNotes.length} notatek i ${exportTags.length} etykiet.`);
  }

  /* ==========================================================================
     IMPORT LOGIC & DIFF ENGINE
     ========================================================================== */
  function openImport() {
    const dropStep = document.getElementById("granImpDropStep");
    const previewStep = document.getElementById("granImpPreviewStep");
    const fileInput = document.getElementById("granImpFileInput");

    if (dropStep) dropStep.style.display = "block";
    if (previewStep) previewStep.style.display = "none";
    if (fileInput) fileInput.value = "";

    _impData = null;
    _impDiffItems = [];
    _impGlobalStrategy = "nadpisz";
    _impCurrentFilter = "all";

    if (typeof openModal === "function") {
      openModal("modalImportWybierz");
    } else {
      const m = document.getElementById("modalImportWybierz");
      if (m) m.classList.add("show");
    }
  }

  function handleImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        _processImportData(parsed);
      } catch (err) {
        alert("Nie udało się odczytać pliku JSON: " + err.message);
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  function _processImportData(data) {
    if (!data || typeof data !== "object") {
      alert("Plik nie zawiera poprawnych danych JSON.");
      return;
    }

    // Normalization for legacy / full backups
    let incomingNotes = [];
    if (Array.isArray(data.notes)) incomingNotes = data.notes;
    else if (Array.isArray(data)) incomingNotes = data;

    _impData = {
      notes: incomingNotes,
      tags: Array.isArray(data.tags) ? data.tags : [],
      sections: Array.isArray(data.sections) ? data.sections : [],
      pubTabs: Array.isArray(data.pubTabs) ? data.pubTabs : [],
      secTabs: Array.isArray(data.secTabs) ? data.secTabs : [],
      szablony: Array.isArray(data.szablony) ? data.szablony : []
    };

    const localNotes = (typeof notes !== "undefined" && Array.isArray(notes)) ? notes : [];
    const localByGuid = new Map(localNotes.map(n => [n.g, n]));

    _impDiffItems = [];

    _impData.notes.forEach(inc => {
      if (!inc || !inc.g) return;
      const mine = localByGuid.get(inc.g);

      if (!mine) {
        _impDiffItems.push({
          guid: inc.g,
          incNote: inc,
          mineNote: null,
          status: "nowy",
          selected: true,
          strategy: "default",
          diff: null
        });
      } else {
        // Compare fields
        const titleDiff = (mine.t || "").trim() !== (inc.t || "").trim();
        const contentDiff = (mine.h || "").trim() !== (inc.h || "").trim();
        const locDiff = (mine.b || "") !== (inc.b || "") || (mine.c || "") !== (inc.c || "") || (mine.v || "") !== (inc.v || "");
        const colDiff = (mine.col || 0) !== (inc.col || 0);

        const mineTg = (mine.tg || []).slice().sort().join(",");
        const incTg = (inc.tg || []).slice().sort().join(",");
        const tagDiff = mineTg !== incTg;

        const isIdentical = !titleDiff && !contentDiff && !locDiff && !colDiff && !tagDiff;

        const mineMo = mine.mo || mine.cr || "";
        const incMo = inc.mo || inc.cr || "";
        let newer = "same";
        if (incMo > mineMo) newer = "inc";
        else if (mineMo > incMo) newer = "mine";

        if (isIdentical) {
          _impDiffItems.push({
            guid: inc.g,
            incNote: inc,
            mineNote: mine,
            status: "identyczny",
            selected: false,
            strategy: "default",
            diff: null
          });
        } else {
          _impDiffItems.push({
            guid: inc.g,
            incNote: inc,
            mineNote: mine,
            status: "konflikt",
            selected: true,
            strategy: "default",
            diff: {
              title: { old: mine.t || "", new: inc.t || "", diff: titleDiff },
              content: { old: mine.h || "", new: inc.h || "", diff: contentDiff },
              loc: { old: `${mine.b || ""}:${mine.c || ""}:${mine.v || ""}`, new: `${inc.b || ""}:${inc.c || ""}:${inc.v || ""}`, diff: locDiff },
              tags: { old: mine.tg || [], new: inc.tg || [], diff: tagDiff },
              col: { old: mine.col || 0, new: inc.col || 0, diff: colDiff },
              dates: { old: mineMo, new: incMo, newer }
            }
          });
        }
      }
    });

    // Switch to preview step
    const dropStep = document.getElementById("granImpDropStep");
    const previewStep = document.getElementById("granImpPreviewStep");
    if (dropStep) dropStep.style.display = "none";
    if (previewStep) previewStep.style.display = "flex";

    _renderImportDiffTree();
    _updateImportStatus();
  }

  function _renderImportDiffTree() {
    const container = document.getElementById("granImpTree");
    if (!container) return;

    const filterQuery = (document.getElementById("granImpSearch") ? document.getElementById("granImpSearch").value : "").trim().toLowerCase();

    const filtered = _impDiffItems.filter(item => {
      if (_impCurrentFilter === "conflicts" && item.status !== "konflikt") return false;
      if (_impCurrentFilter === "new" && item.status !== "nowy") return false;

      if (filterQuery) {
        const title = (item.incNote.t || (item.mineNote && item.mineNote.t) || "").toLowerCase();
        const body = _stripHtml(item.incNote.h || "").toLowerCase();
        const bookName = _getBibleBookName(item.incNote.b).toLowerCase();
        if (!title.includes(filterQuery) && !body.includes(filterQuery) && !bookName.includes(filterQuery)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="gran-empty-msg" style="padding:40px 20px;text-align:center;">Brak elementów spełniających kryteria filtrowania.</div>`;
      return;
    }

    let html = `<div class="gran-tree" style="padding: 10px 0;">`;

    filtered.forEach((item) => {
      const inc = item.incNote;
      const mine = item.mineNote;
      const title = (inc.t || (mine && mine.t) || "Notatka bez tytułu").trim();

      let refText = "";
      if (_isBibleBook(inc.b)) {
        refText = `${_getBibleBookName(inc.b)} ${inc.c || 1}${inc.v ? ":" + inc.v : ""}`;
      } else if (_isPub(inc.b)) {
        refText = `${_getPubName(inc.b)} ${inc.c ? "ak. " + inc.c : ""}`;
      } else {
        refText = "Notatka tematyczna";
      }

      const statusBadge = item.status === "nowy"
        ? `<span class="gran-badge nowy">Nowy</span>`
        : (item.status === "konflikt" ? `<span class="gran-badge konflikt">Konflikt / Zmodyfikowany</span>` : `<span class="gran-badge identyczny">Identyczny</span>`);

      html += `
        <div class="gran-item-diff-card" data-guid="${_esc(item.guid)}" style="border:1px solid var(--border);border-radius:12px;margin-bottom:10px;background:var(--panel);padding:12px 14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            <label class="gran-check-label" style="display:flex;align-items:center;gap:8px;font-weight:650;font-size:14px;cursor:pointer;flex:1;min-width:200px;">
              <input type="checkbox" class="gran-imp-item-check" data-guid="${_esc(item.guid)}" ${item.selected ? "checked" : ""}>
              <span>${_esc(title)}</span>
              <small style="color:var(--muted);font-weight:normal;margin-left:4px;">(${_esc(refText)})</small>
            </label>
            <div style="display:flex;align-items:center;gap:8px;">
              ${statusBadge}
              ${item.status === "konflikt" ? `
                <select class="gran-item-strat-sel" data-guid="${_esc(item.guid)}" style="padding:4px 8px;border-radius:8px;border:1px solid var(--border);background:var(--panel2);font-size:12px;color:var(--text);">
                  <option value="default" ${item.strategy === "default" ? "selected" : ""}>Domyślnie z paska</option>
                  <option value="nadpisz" ${item.strategy === "nadpisz" ? "selected" : ""}>🔄 Nadpisz moją</option>
                  <option value="pomin" ${item.strategy === "pomin" ? "selected" : ""}>⏭️ Pomiń (zostaw moją)</option>
                  <option value="nowa_kopia" ${item.strategy === "nowa_kopia" ? "selected" : ""}>📑 Dodaj jako kopię</option>
                </select>
                <button type="button" class="btn gran-toggle-diff-btn" data-guid="${_esc(item.guid)}" style="padding:4px 10px;font-size:12px;">Pokaż różnice</button>
              ` : ""}
            </div>
          </div>`;

      // Diff box for conflicts
      if (item.status === "konflikt" && item.diff) {
        const d = item.diff;
        const oldBodyTxt = _stripHtml(d.content.old);
        const newBodyTxt = _stripHtml(d.content.new);

        html += `
          <div class="gran-diff-box" id="diff-${_esc(item.guid)}" style="display:none;margin-top:12px;padding-top:12px;border-top:1px dashed var(--border);">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12.5px;">
              <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:10px;">
                <div style="font-weight:750;color:#dc2626;margin-bottom:6px;display:flex;justify-content:space-between;">
                  <span>Lokalna wersja (w aplikacji)</span>
                  <small style="font-weight:normal;opacity:0.85;">${_esc(_formatDate(d.dates.old))}</small>
                </div>
                <div style="margin-bottom:4px;"><strong>Tytuł:</strong> ${_esc(d.title.old || "—")}</div>
                <div><strong>Treść:</strong> <div style="max-height:120px;overflow-y:auto;white-space:pre-wrap;color:var(--text);margin-top:2px;">${_esc(oldBodyTxt.slice(0, 400))}${oldBodyTxt.length > 400 ? "…" : ""}</div></div>
              </div>

              <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:8px;padding:10px;">
                <div style="font-weight:750;color:#059669;margin-bottom:6px;display:flex;justify-content:space-between;">
                  <span>Wersja z pliku (import)</span>
                  <small style="font-weight:normal;opacity:0.85;">${_esc(_formatDate(d.dates.new))}</small>
                </div>
                <div style="margin-bottom:4px;"><strong>Tytuł:</strong> ${_esc(d.title.new || "—")}</div>
                <div><strong>Treść:</strong> <div style="max-height:120px;overflow-y:auto;white-space:pre-wrap;color:var(--text);margin-top:2px;">${_esc(newBodyTxt.slice(0, 400))}${newBodyTxt.length > 400 ? "…" : ""}</div></div>
              </div>
            </div>
          </div>`;
      }

      html += `</div>`;
    });

    html += `</div>`;
    container.innerHTML = html;

    // Attach listeners
    container.querySelectorAll(".gran-imp-item-check").forEach(chk => {
      chk.onchange = () => {
        const guid = chk.dataset.guid;
        const item = _impDiffItems.find(x => x.guid === guid);
        if (item) item.selected = chk.checked;
        _updateImportStatus();
      };
    });

    container.querySelectorAll(".gran-item-strat-sel").forEach(sel => {
      sel.onchange = () => {
        const guid = sel.dataset.guid;
        const item = _impDiffItems.find(x => x.guid === guid);
        if (item) item.strategy = sel.value;
      };
    });

    container.querySelectorAll(".gran-toggle-diff-btn").forEach(btn => {
      btn.onclick = () => {
        const guid = btn.dataset.guid;
        const diffBox = document.getElementById("diff-" + guid);
        if (diffBox) {
          const isHidden = diffBox.style.display === "none";
          diffBox.style.display = isHidden ? "block" : "none";
          btn.textContent = isHidden ? "Ukryj różnice" : "Pokaż różnice";
        }
      };
    });
  }

  function _updateImportStatus() {
    const statusEl = document.getElementById("granImpStatus");
    if (!statusEl) return;

    const selectedCount = _impDiffItems.filter(x => x.selected).length;
    const totalCount = _impDiffItems.length;
    const conflictCount = _impDiffItems.filter(x => x.status === "konflikt").length;
    const newCount = _impDiffItems.filter(x => x.status === "nowy").length;

    statusEl.innerHTML = `Wybrano: <strong>${selectedCount}</strong> z ${totalCount} elementów (${newCount} nowych, ${conflictCount} konfliktów)`;
  }

  function executeImport() {
    if (!_impData) return;

    const selectedItems = _impDiffItems.filter(x => x.selected);
    if (selectedItems.length === 0) {
      if (typeof toast === "function") toast("Zaznacz przynajmniej jeden element do zaimportowania.");
      return;
    }

    const currentNotes = (typeof notes !== "undefined" && Array.isArray(notes)) ? notes : [];
    const currentTags = (typeof tags !== "undefined" && Array.isArray(tags)) ? tags : [];
    const currentSections = (typeof sections !== "undefined" && Array.isArray(sections)) ? sections : [];

    // 1. Merge sections
    const secMap = {};
    (_impData.sections || []).forEach(s => {
      let mine = currentSections.find(x => (x.name || "").trim().toLowerCase() === (s.name || "").trim().toLowerCase());
      if (!mine) {
        mine = {
          id: (typeof nextSecId === "function" ? nextSecId() : Date.now() + Math.floor(Math.random()*1000)),
          name: s.name,
          ord: s.ord ?? currentSections.length,
          open: true,
          color: s.color
        };
        currentSections.push(mine);
      }
      secMap[s.id] = mine.id;
    });

    // 2. Merge tags
    const tagMap = {};
    (_impData.tags || []).forEach(t => {
      let mine = currentTags.find(x => (x.name || "").trim().toLowerCase() === (t.name || "").trim().toLowerCase());
      if (!mine) {
        mine = {
          id: (typeof nastepnyNumer === "function" ? nastepnyNumer(currentTags) : Date.now() + Math.floor(Math.random()*1000)),
          name: t.name,
          color: t.color,
          nw: true
        };
        if (t.sec !== undefined && secMap[t.sec] !== undefined) mine.sec = secMap[t.sec];
        if (t.ord !== undefined) mine.ord = t.ord;
        currentTags.push(mine);
      }
      tagMap[t.id] = mine.id;
    });

    // 3. Process notes
    let addedCount = 0;
    let updatedCount = 0;
    let copiedCount = 0;
    let skippedCount = 0;

    const localByGuid = new Map(currentNotes.map(n => [n.g, n]));

    selectedItems.forEach(item => {
      const inc = Object.assign({}, item.incNote);

      // Remap tag IDs
      if (Array.isArray(inc.tg)) {
        inc.tg = inc.tg.map(tid => tagMap[tid] !== undefined ? tagMap[tid] : tid);
      }

      if (item.status === "nowy") {
        currentNotes.push(inc);
        localByGuid.set(inc.g, inc);
        addedCount++;
      } else if (item.status === "identyczny") {
        // Keep local
      } else if (item.status === "konflikt") {
        const strat = item.strategy === "default" ? _impGlobalStrategy : item.strategy;

        if (strat === "nadpisz") {
          const mine = localByGuid.get(item.guid);
          if (mine) {
            Object.assign(mine, inc);
            updatedCount++;
          }
        } else if (strat === "pomin") {
          skippedCount++;
        } else if (strat === "nowa_kopia") {
          const copy = Object.assign({}, inc);
          copy.g = "g-" + Date.now() + "-" + Math.random().toString(36).substr(2, 7);
          copy.t = (copy.t || "Notatka") + " (kopia z importu)";
          copy.mo = new Date().toISOString();
          currentNotes.push(copy);
          localByGuid.set(copy.g, copy);
          copiedCount++;
        }
      }
    });

    // Save to IDB
    if (typeof idbBulk === "function") {
      idbBulk("notes", currentNotes).catch(err => console.error("IDB notes save error:", err));
      if (typeof saveTags === "function") saveTags();
      if (typeof saveSections === "function") saveSections();
    }
    if (typeof bumpDirty === "function") bumpDirty();

    // Refresh views
    if (typeof renderAll === "function") renderAll();
    if (typeof odswiezCentrumBezpieczenstwa === "function") odswiezCentrumBezpieczenstwa();

    if (typeof closeModal === "function") closeModal("modalImportWybierz");

    const msg = `Zaimportowano: ${addedCount} nowych, ${updatedCount} zaktualizowanych, ${copiedCount} utworzonych kopii.`;
    if (typeof toast === "function") toast(msg);
    else alert(msg);
  }

  // Setup DOM listeners
  function init() {
    // Export toolbar
    const expSearch = document.getElementById("granExpSearch");
    if (expSearch) {
      expSearch.addEventListener("input", (e) => {
        const q = e.target.value.trim().toLowerCase();
        const tree = document.getElementById("granExpTree");
        if (!tree) return;
        tree.querySelectorAll(".gran-item").forEach(item => {
          const name = (item.querySelector(".gran-item-name") ? item.querySelector(".gran-item-name").textContent : "").toLowerCase();
          const match = !q || name.includes(q);
          item.style.display = match ? "flex" : "none";
        });
      });
    }

    const expSelectAll = document.getElementById("granExpSelectAll");
    if (expSelectAll) {
      expSelectAll.onclick = () => {
        const tree = document.getElementById("granExpTree");
        if (tree) tree.querySelectorAll("input[type=checkbox]").forEach(c => { c.checked = true; });
        _updateExportStatus();
      };
    }

    const expDeselectAll = document.getElementById("granExpDeselectAll");
    if (expDeselectAll) {
      expDeselectAll.onclick = () => {
        const tree = document.getElementById("granExpTree");
        if (tree) tree.querySelectorAll("input[type=checkbox]").forEach(c => { c.checked = false; });
        _updateExportStatus();
      };
    }

    const expSelectBible = document.getElementById("granExpSelectBible");
    if (expSelectBible) {
      expSelectBible.onclick = () => {
        const tree = document.getElementById("granExpTree");
        if (tree) {
          tree.querySelectorAll("input[type=checkbox]").forEach(c => { c.checked = false; });
          const bibleGrp = tree.querySelector('.gran-group[data-cat="bible"]');
          if (bibleGrp) bibleGrp.querySelectorAll("input[type=checkbox]").forEach(c => { c.checked = true; });
        }
        _updateExportStatus();
      };
    }

    const expSelectOwn = document.getElementById("granExpSelectOwn");
    if (expSelectOwn) {
      expSelectOwn.onclick = () => {
        const tree = document.getElementById("granExpTree");
        if (tree) {
          tree.querySelectorAll("input[type=checkbox]").forEach(c => { c.checked = false; });
          const ownGrp = tree.querySelector('.gran-group[data-cat="own"]');
          if (ownGrp) ownGrp.querySelectorAll("input[type=checkbox]").forEach(c => { c.checked = true; });
        }
        _updateExportStatus();
      };
    }

    const expSubmit = document.getElementById("granExpSubmit");
    if (expSubmit) expSubmit.onclick = executeExport;

    // Import Step 1: Drop & Pick File
    const dropZone = document.getElementById("granImpDropZone");
    const fileInput = document.getElementById("granImpFileInput");
    const pickBtn = document.getElementById("granImpPickFileBtn");

    if (pickBtn && fileInput) pickBtn.onclick = () => fileInput.click();
    if (fileInput) {
      fileInput.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) handleImportFile(file);
      };
    }

    if (dropZone) {
      dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add("dragover"); };
      dropZone.ondragleave = () => { dropZone.classList.remove("dragover"); };
      dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) handleImportFile(file);
      };
    }

    // Import Step 2: Toolbar & Filters
    const impBack = document.getElementById("granImpBackToFile");
    if (impBack) {
      impBack.onclick = () => {
        const dropStep = document.getElementById("granImpDropStep");
        const previewStep = document.getElementById("granImpPreviewStep");
        if (dropStep) dropStep.style.display = "block";
        if (previewStep) previewStep.style.display = "none";
      };
    }

    const impSearch = document.getElementById("granImpSearch");
    if (impSearch) {
      impSearch.addEventListener("input", () => {
        _renderImportDiffTree();
      });
    }

    const filterAll = document.getElementById("granImpFilterAll");
    const filterConf = document.getElementById("granImpFilterConflicts");
    const filterNew = document.getElementById("granImpFilterNew");

    if (filterAll) filterAll.onclick = () => { _impCurrentFilter = "all"; _renderImportDiffTree(); };
    if (filterConf) filterConf.onclick = () => { _impCurrentFilter = "conflicts"; _renderImportDiffTree(); };
    if (filterNew) filterNew.onclick = () => { _impCurrentFilter = "new"; _renderImportDiffTree(); };

    const impSelectAll = document.getElementById("granImpSelectAll");
    if (impSelectAll) {
      impSelectAll.onclick = () => {
        _impDiffItems.forEach(item => { item.selected = true; });
        _renderImportDiffTree();
        _updateImportStatus();
      };
    }

    const impDeselectAll = document.getElementById("granImpDeselectAll");
    if (impDeselectAll) {
      impDeselectAll.onclick = () => {
        _impDiffItems.forEach(item => { item.selected = false; });
        _renderImportDiffTree();
        _updateImportStatus();
      };
    }

    // Global strategy radios
    document.querySelectorAll("input[name=granImpStrategy]").forEach(radio => {
      radio.onchange = () => {
        if (radio.checked) {
          _impGlobalStrategy = radio.value;
        }
      };
    });

    const impSubmit = document.getElementById("granImpSubmit");
    if (impSubmit) impSubmit.onclick = executeImport;

    // Connect triggers in Menu and Centrum Bezpieczeństwa
    const bezpExp = document.getElementById("bezpExportCustom");
    if (bezpExp) {
      bezpExp.onclick = () => {
        if (typeof closeModal === "function") closeModal("modalBezpieczenstwo");
        openExport();
      };
    }

    const bezpImp = document.getElementById("bezpImportCustom");
    if (bezpImp) {
      bezpImp.onclick = () => {
        if (typeof closeModal === "function") closeModal("modalBezpieczenstwo");
        openImport();
      };
    }
  }

  // Self-init when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 100);
  }

  return {
    openExport,
    openImport,
    executeExport,
    executeImport,
    handleImportFile,
    init
  };
})();
