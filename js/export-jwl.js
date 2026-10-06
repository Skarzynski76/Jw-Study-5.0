/* ==========================================================================
   JW Study — export-jwl.js
   Eksport do formatu JW Library
   ========================================================================== */
"use strict";
/* ================= EKSPORT .JWLIBRARY ================= */
async function startExport(){
  let has=false, bkDate=null, bkName="";
  if(idb){
    has=!!(await idbGet("files","lastBackup"));
    try{ bkDate = await idbGet("meta","lastBackupDate"); bkName = (await idbGet("meta","lastBackupName"))||""; }catch(e){}
  }
  if(!has){
    $("expInfo").innerHTML =
      `Aby wyeksportować do JW Library, najpierw zaimportuj swoją kopię z JW Library (<b>⚙️ Plik → Importuj backup</b>).<br><br>`+
      `Aplikacja zachowa ją jako podstawę i będzie nanosić na nią Twoje zmiany — dzięki temu nie stracisz podkreśleń, playlist ani innych danych.`;
    $("expGo").style.display="none";
    openModal("modalExport"); return;
  }
  const newCnt = notes.filter(n=>!n.del).length;
  let ageTxt="", stale=false;
  if(bkDate){
    const days=Math.floor((Date.now()-Date.parse(bkDate))/86400000);
    stale = days>=14;
    const d=new Date(bkDate);
    const nice=d.toLocaleDateString("pl",{day:"numeric",month:"long",year:"numeric"});
    ageTxt = days===0 ? `dzisiaj (${nice})` : days===1 ? `wczoraj (${nice})` : `${days} dni temu (${nice})`;
  }
  $("expInfo").innerHTML =
    `<div class="exp-steps">
       <div class="exp-step"><span class="exp-n">1</span><div>Powstanie <b>nowy plik .jwlibrary</b>: Twoja zaimportowana kopia + <b>${newCnt}</b> notatek z tej aplikacji.</div></div>
       <div class="exp-step"><span class="exp-n">2</span><div>Przenieś plik na urządzenie z JW Library.</div></div>
       <div class="exp-step"><span class="exp-n">3</span><div>W JW Library: <b>Ustawienia → Kopia zapasowa → Przywróć</b>.</div></div>
     </div>
     ${bkDate?`<div class="exp-base ${stale?"warn":""}">Podstawą jest kopia zaimportowana <b>${ageTxt}</b>${bkName?`<br><span class="exp-file">${esc(bkName)}</span>`:""}</div>`:""}
     <div class="exp-warn">
       <b>⚠️ Ważne:</b> przywrócenie w JW Library <b>zastępuje wszystko</b> na tamtym urządzeniu.
       Jeśli po ${bkDate?"tej dacie":"zaimportowaniu kopii"} dodałeś coś <b>w samym JW Library</b> (podkreślenia, notatki, zakładki) — to przepadnie.
       <br><br>Najbezpieczniej: zrób <b>świeżą kopię w JW Library</b>, zaimportuj ją tutaj, a dopiero potem eksportuj.
     </div>`;
  $("expGo").style.display="";
  openModal("modalExport");
}
$("expGo").onclick = async ()=>{
  closeModal("modalExport");
  toast("Tworzenie pliku .jwlibrary…");
  try{
    await getLibs();
    const buf=await idbGet("files","lastBackup");
    const zip=await JSZip.loadAsync(buf);
    const dbBytes=await zip.file("userData.db").async("uint8array");
    const db=new SQL.Database(dbBytes);
    const expStat = applyChangesToDb(db);
    const outDb=db.export(); db.close();
    zip.file("userData.db",outDb);
    const hashBuf=await crypto.subtle.digest("SHA-256",outDb);
    const hash=[...new Uint8Array(hashBuf)].map(b=>b.toString(16).padStart(2,"0")).join("");
    const mFile = zip.file("manifest.json");
  if(!mFile) throw new Error("Plik .jwlibrary jest niekompletny — brak manifest.json");
  let manifest;
  try{ manifest = JSON.parse(await mFile.async("string")); }
  catch(e){ throw new Error("Plik .jwlibrary ma uszkodzony manifest.json"); }
  if(!manifest || !manifest.userDataBackup) throw new Error("Plik .jwlibrary ma nieoczekiwaną budowę manifestu");
    const now=new Date();
    const iso=now.toISOString().substring(0,19)+"+00:00";
    const dateStr=now.toISOString().substring(0,10);
    manifest.name=`UserdataBackup_${dateStr}_MojeNotatki.jwlibrary`;
    manifest.creationDate=iso;
    manifest.userDataBackup.hash=hash;
    manifest.userDataBackup.lastModifiedDate=iso;
    manifest.userDataBackup.deviceName="MojeNotatki";
    zip.file("manifest.json",JSON.stringify(manifest));
    const zblob=await zip.generateAsync({type:"blob",compression:"DEFLATE"});
    const blob=new Blob([zblob],{type:"application/octet-stream"});
    // NAJPIERW podsumowanie (użytkownik je zamyka), DOPIERO POTEM wybór zapisu —
    // inaczej okno informacyjne zasłaniałoby listę „Zapisz / Udostępnij".
    await showInfo("Plik .jwlibrary gotowy",
      `W pliku znalazło się:<br><br>`+
      `• Notatek dopisanych: <b>${expStat.inserted}</b><br>`+
      `• Notatek zaktualizowanych: <b>${expStat.updated}</b><br>`+
      (expStat.deleted?`• Usuniętych: <b>${expStat.deleted}</b><br>`:"")+
      `<br>Po zamknięciu tego okna wybierz, gdzie zapisać plik.`);
    setTimeout(()=>chooseSaveOrShare(blob, manifest.name, "Kopia JW Library"), 60);
  }catch(err){ console.error(err); toast("Błąd eksportu: "+err.message); }
};
/**
 * Nanosi notatki i etykiety z aplikacji na bazę SQLite z pliku .jwlibrary.
 * Notatki nieznane bazie są wstawiane, istniejące aktualizowane, usunięte kasowane.
 * Daty przechodzą przez jwlDate — JW Library wymaga formatu RRRR-MM-DDTGG:MM:SS+00:00.
 * @param {*} db  baza otwarta przez sql.js
 * @returns {Object} pola: inserted, updated, deleted
 */
function applyChangesToDb(db){
  const one=sql=>{const r=db.exec(sql);return r.length?r[0].values[0][0]:null;};
  let maxNoteId=one("SELECT MAX(NoteId) FROM Note")||0;
  let maxTagId=one("SELECT MAX(TagId) FROM Tag")||0;
  let maxTagMapId=one("SELECT MAX(TagMapId) FROM TagMap")||0;
  const nowIso=new Date().toISOString().substring(0,19)+"+00:00";
  const gid={};
  let insertedCount=0, updatedCount=0, deletedCount=0;
  /* JW Library wymaga pełnego znacznika czasu „RRRR-MM-DDTGG:MM:SS+00:00".
     Nasze notatki bywają zapisane jako sama data albo z milisekundami/Z —
     bez ujednolicenia JWL potrafi pominąć taki wpis. */
  const jwlDate = v => {
    if(!v) return nowIso;
    const d = new Date(v);
    if(!isNaN(d)) return d.toISOString().substring(0,19)+"+00:00";
    const s = String(v);
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s+"T00:00:00+00:00";
    return nowIso;
  };
  const r1=db.exec("SELECT NoteId, Guid FROM Note");
  if(r1.length) r1[0].values.forEach(([id,g])=>gid[g]=id);
  const tname={};
  const r2=db.exec("SELECT TagId, Name FROM Tag WHERE Type=1");
  if(r2.length) r2[0].values.forEach(([id,nm])=>tname[(nm||"").trim()]=id);
  const tpos={};
  const r3=db.exec("SELECT TagId, MAX(Position) FROM TagMap GROUP BY TagId");
  if(r3.length) r3[0].values.forEach(([id,p])=>tpos[id]=p);
  const nextPos=tid=>{tpos[tid]=(tpos[tid]===undefined?-1:tpos[tid])+1;return tpos[tid];};
  // powiązanie notatki z wersetem Biblii (Location), żeby JW Library przypięło ją do wersetu
  let maxLocId = one("SELECT MAX(LocationId) FROM Location")||0;
  const locCache={};
  function bibleLocation(book,chapter){
    const kk=book+"_"+chapter;
    if(locCache[kk]!==undefined) return locCache[kk];
    let meps=0, key="nwtsty";
    try{
      const mr=db.exec("SELECT MepsLanguage, KeySymbol FROM Location WHERE KeySymbol IN ('nwtsty','nwt') AND BookNumber IS NOT NULL LIMIT 1");
      if(mr.length){ meps=mr[0].values[0][0]; key=mr[0].values[0][1]||"nwtsty"; }
    }catch(e){}
    try{
      const ex=db.exec(`SELECT LocationId FROM Location WHERE KeySymbol='${key}' AND BookNumber=${book} AND ChapterNumber=${chapter} AND DocumentId IS NULL AND (IssueTagNumber=0 OR IssueTagNumber IS NULL) LIMIT 1`);
      if(ex.length){ locCache[kk]=ex[0].values[0][0]; return locCache[kk]; }
    }catch(e){}
    maxLocId++;
    db.run("INSERT INTO Location (LocationId, BookNumber, ChapterNumber, KeySymbol, MepsLanguage, Type, IssueTagNumber) VALUES (?,?,?,?,?,0,0)",[maxLocId,book,chapter,key,meps]);
    locCache[kk]=maxLocId; return maxLocId;
  }
  /**
   * Miejsce notatki z PUBLIKACJI (nie z Biblii).
   *
   * Wcześniej takie notatki szły do JW Library z pustym LocationId — a notatka
   * bez miejsca nie ma się gdzie pokazać: nie wisi przy żadnym akapicie i nie
   * widać jej w publikacji. Wychodziło to dopiero po przywróceniu kopii na
   * urządzeniu, czyli wtedy, gdy nic już nie dało się poprawić.
   *
   * Miejsce w publikacji opisują: symbol (np. „w"), numer wydania i numer
   * dokumentu. Szukamy istniejącego wiersza po tej trójce, a gdy go nie ma —
   * dopisujemy nowy, w tej samej postaci, w jakiej robi to JW Library.
   */
  function pubLocation(n){
    const key = (n.ks||"").trim();
    if(!key) return null;
    const itn = Number(n.itn)||0;
    const doc = Number(n.doc)||0;
    const kk = "p_"+key+"_"+itn+"_"+doc;
    if(locCache[kk]!==undefined) return locCache[kk];
    let meps = 0;
    try{
      const mr=db.exec("SELECT MepsLanguage FROM Location WHERE MepsLanguage IS NOT NULL LIMIT 1");
      if(mr.length) meps = mr[0].values[0][0];
    }catch(e){}
    try{
      const st = db.prepare(
        "SELECT LocationId FROM Location WHERE KeySymbol=? AND IFNULL(IssueTagNumber,0)=? "+
        "AND IFNULL(DocumentId,0)=? AND BookNumber IS NULL LIMIT 1");
      st.bind([key, itn, doc]);
      if(st.step()){ const id = st.get()[0]; st.free(); locCache[kk]=id; return id; }
      st.free();
    }catch(e){}
    maxLocId++;
    db.run("INSERT INTO Location (LocationId, KeySymbol, IssueTagNumber, DocumentId, MepsLanguage, Type) "+
           "VALUES (?,?,?,?,?,0)", [maxLocId, key, itn, doc||null, meps]);
    locCache[kk]=maxLocId; return maxLocId;
  }
  // zakładki usunięte w aplikacji — usuń też z eksportowanej bazy
  deletedTagNames.forEach(nm=>{
    const did = tname[nm];
    if(did!==undefined){
      db.run("DELETE FROM TagMap WHERE TagId=?",[did]);
      db.run("DELETE FROM Tag WHERE TagId=?",[did]);
      delete tname[nm];
    }
  });
  const appTagToDb={};
  tags.forEach(t=>{
    // szukaj w bazie po nazwie oryginalnej (przed zmianą) lub bieżącej
    let dbid = tname[t.name]!==undefined ? tname[t.name]
             : (t.orig && tname[t.orig]!==undefined) ? tname[t.orig]
             : undefined;
    if(dbid===undefined){
      maxTagId++;
      db.run("INSERT INTO Tag (TagId, Type, Name) VALUES (?,1,?)",[maxTagId,t.name]);
      tname[t.name]=maxTagId; dbid=maxTagId;
    } else if(t.orig && tname[t.name]===undefined){
      // zmiana nazwy istniejącego tagu
      try{ db.run("UPDATE Tag SET Name=? WHERE TagId=?",[t.name,dbid]); tname[t.name]=dbid; }catch(e){}
    }
    appTagToDb[t.id]=dbid;
  });
  notes.forEach(n=>{
    const dbId=gid[n.g];
    if(n.del){
      if(dbId!==undefined){
        db.run("DELETE FROM TagMap WHERE NoteId=?",[dbId]);
        db.run("DELETE FROM Note WHERE NoteId=?",[dbId]);
        deletedCount++;
      }
      return;
    }
    // WSTAW KAŻDĄ notatkę, której nie ma w bazie docelowej — nie tylko oznaczoną jako „nowa".
    // Wcześniej notatki wczytane z kopii JSON z innego urządzenia albo z danych wbudowanych
    // nie miały flagi „nw" i były po cichu POMIJANE (w JW Library pojawiały się same etykiety).
    if(dbId===undefined){
      maxNoteId++;
      let locId=null, blockType=0, blockId=null;
      try{
        if(n.b && n.ch){
          locId = bibleLocation(n.b, n.ch);
          if(locId!=null){
            if(n.v){ blockType=2; blockId=n.v; }   // przypięcie do konkretnego wersetu
            else { blockType=1; blockId=n.ch; }    // do rozdziału, gdy brak wersetu
          }
        } else if(n.ks){
          /* Notatka z publikacji: miejsce opisuje symbol, wydanie i dokument,
             a akapit wskazuje BlockIdentifier. */
          locId = pubLocation(n);
          if(locId!=null && n.par){ blockType=1; blockId=Number(n.par)||null; }
        }
      }catch(e){ locId=null; blockType=0; blockId=null; }
      db.run("INSERT INTO Note (Guid, Title, Content, LastModified, Created, BlockType, BlockIdentifier, LocationId, NoteId) VALUES (?,?,?,?,?,?,?,?,?)",
        [n.g, n.t||null, (n.c||n.t||" "), jwlDate(n.mo), jwlDate(n.cr), blockType, blockId, locId, maxNoteId]);
      insertedCount++;
      (n.tg||[]).forEach(tid=>{
        const dt=appTagToDb[tid]; if(dt===undefined)return;
        maxTagMapId++;
        db.run("INSERT INTO TagMap (TagMapId, NoteId, TagId, Position) VALUES (?,?,?,?)",[maxTagMapId,maxNoteId,dt,nextPos(dt)]);
      });
      return;
    }
    if(dbId===undefined) return;
    if(n.ed){
      db.run("UPDATE Note SET Title=?, Content=?, LastModified=? WHERE NoteId=?",[n.t||null, n.c||null, jwlDate(n.mo), dbId]);
      updatedCount++;
    }
    if(n.tgd){
      db.run("DELETE FROM TagMap WHERE NoteId=?",[dbId]);
      (n.tg||[]).forEach(tid=>{
        const dt=appTagToDb[tid]; if(dt===undefined)return;
        maxTagMapId++;
        db.run("INSERT INTO TagMap (TagMapId, NoteId, TagId, Position) VALUES (?,?,?,?)",[maxTagMapId,dbId,dt,nextPos(dt)]);
      });
    }
  });
  try{ db.run("UPDATE LastModified SET LastModified=?",[nowIso]); }catch(e){}
  return {inserted:insertedCount, updated:updatedCount, deleted:deletedCount};
}
/* ===== EKSPORT POJEDYNCZEJ NOTATKI DO .JWLIBRARY (z przypięciem do wersetu) ===== */
/* Była tu jeszcze funkcja pomocnicza budująca plik .jwlibrary z JEDNEJ
   notatki. Jej jedynym użytkownikiem był eksport pojedynczej notatki, więc
   odeszła razem z nim. Pełny eksport buduje plik własną drogą — na kopii
   użytkownika, bez kasowania czegokolwiek. */
/* ==========================================================================
   BYŁ TU EKSPORT POJEDYNCZEJ NOTATKI DO .JWLIBRARY — I DOBRZE, ŻE GO NIE MA

   Wyglądał niewinnie: „zapisz tę jedną notatkę do JW Library". W środku robił
   coś zupełnie innego:

       DELETE FROM TagMap, BlockRange, UserMark, Bookmark, InputField, Note

   czyli czyścił kopię ze WSZYSTKIEGO, co użytkownik kiedykolwiek napisał
   i podkreślił, a potem wstawiał tę jedną notatkę. JW Library nie dokleja
   przywracanych kopii — ZASTĘPUJE nimi całą zawartość urządzenia. Przywrócenie
   takiego pliku zostawiłoby więc na telefonie dokładnie jedną notatkę i zero
   podkreśleń.

   Duży eksport ostrzega o tym wprost, wielkim akapitem. Ten nie mówił nic.

   Nie da się tego naprawić ostrzeżeniem, bo sama czynność nie ma sensu: JW
   Library nie potrafi przyjąć pojedynczej notatki. Do przenoszenia jednej
   notatki między urządzeniami służy „Wyślij na inne urządzenie", a do JW
   Library idzie pełny plik z menu „Plik → Eksportuj do JW Library".
   ========================================================================== */
async function assignVerse(n){
  const cur = n.b ? refText({b:n.b,ch:n.ch,v:n.v}) : "";
  const txt = await askText({title:"Przypisz werset do notatki", value:cur, placeholder:"np. Jan 3:16  (puste = usuń)", okLabel:"Przypisz", hint:"Notatka pojawi się w JW Library przy tym wersecie."});
  if(txt===null) return;
  pushUndo({type:"note", label:"przypisanie wersetu", before:cloneNote(n)});
  /* Przypisanie wersetu to decyzja użytkownika, a nie fakt z JW Library —
     znacznik pw chroni je przed nadpisaniem przy kolejnym imporcie. */
  if(txt===""){ n.b=0; n.ch=null; n.v=null; n.pw=false; }
  else { const ref=parseRef(txt); if(!ref){ toast("Nie rozpoznano — np. Jan 3:16"); return; } n.b=ref.b; n.ch=ref.ch||1; n.v=ref.v||null; n.doc=0; n.ks=""; n.pub=""; n.itn=0; n.pw=true; }
  n.ed=true; markDirty(n); renderAll();
  toast(n.b ? ("Przypisano: "+refText({b:n.b,ch:n.ch,v:n.v})) : "Usunięto przypisanie wersetu");
}
