/* Wyszukiwanie 3.17: jawne reguły lokalne, filtry, tematy i zaznaczenia. */
let searchMeaning=[];
const SZUK_TEMATY=[
  {
    label:"wpływ Szatana na świat",
    when:[["diabel","diabeł","szatan","niegodziwiec","przeciwnik"],["rzadzi","rządzi","wladza","władza","swiat","świat","system"]],
    groups:[
      ["diabeł","szatan","przeciwnik","niegodziwiec","kusiciel","władca świata","bóg tego systemu","bogiem tego systemu"],
      ["rządzi","panuje","ma władzę","sprawuje władzę","władca świata","bóg tego systemu","bogiem tego systemu","kontroluje","wpływa","zwodzi","zaślepia"],
      ["świat","światem","system rzeczy","obecny system","narody","ludzkość","społeczeństwo"]
    ]
  },
  {
    label:"Królestwo Boże i jego panowanie",
    when:[["krolestwo","królestwo"],["rzad","rząd","rzadzi","rządzi","panowanie","ziemia"]],
    groups:[
      ["Królestwo Boże","Królestwo niebiańskie","królestwo","rząd Boży"],
      ["rządzi","panuje","panowanie","król","władza"],
      ["ziemia","ludzkość","narody","świat"]
    ]
  },
  {
    label:"dlaczego Bóg dopuszcza cierpienie",
    when:[["bog","bóg","jehowa"],["cierpienie","cierpi","zlo","zło","dopuszcza","pozwala"]],
    groups:[
      ["Bóg","Jehowa"],
      ["cierpienie","zło","nieszczęście","choroba","ból"],
      ["dopuszcza","pozwala","przyczyna","kwestia sporna","wolna wola"]
    ]
  },
  {
    label:"stan umarłych",
    when:[["umarli","umarly","umarły","smierc","śmierć"],["wiedza","czuja","czują","dzieje","stan"]],
    groups:[
      ["umarli","umarły","śmierć","grób"],
      ["nie są świadomi","nie wiedzą","nie czuje","sen śmierci","stan umarłych"]
    ]
  },
  {
    label:"zmartwychwstanie i przyszła nadzieja",
    when:[["zmartwychwstanie","wskrzeszenie","ożyją","powroca","powrócą"],["umarli","bliscy","nadzieja","przyszlosc","przyszłość"]],
    groups:[
      ["zmartwychwstanie","wskrzeszenie","powstaną","ożyją"],
      ["umarli","zmarli","grób"],
      ["nadzieja","przyszłość","życie wieczne","raj"]
    ]
  },
  {
    label:"chrześcijańska neutralność",
    when:[["neutralnosc","neutralność","polityka","wybory","wojna"],["chrzescijanin","chrześcijanin","uczestniczyc","uczestniczyć","glosowac","głosować","walczyc","walczyć"]],
    groups:[
      ["neutralność","nie należy do świata","chrześcijanin"],
      ["polityka","wybory","wojna","konflikt","narody"],
      ["nie walczy","nie głosuje","nie uczestniczy","sumienie"]
    ]
  },
  {
    label:"radzenie sobie z lękiem i stresem",
    when:[["stres","stresem","lek","lęk","niepokoj","niepokój","martwie","martwię"],["radzic","radzić","spokoj","spokój","pokonac","pokonać","pomoc"]],
    groups:[
      ["stres","lęk","niepokój","zmartwienie","presja"],
      ["spokój","opanowanie","modlitwa","zaufanie","pokój Boży"]
    ]
  }
];
function zawieraTemat(tekst,haslo){
  const n=" "+normSzukStart(tekst).replace(/[^a-z0-9]+/g," ").trim()+" ";
  const h=normSzukStart(haslo).replace(/[^a-z0-9]+/g," ").trim();
  return !!h&&n.includes(" "+h+" ");
}
function rozpoznajTematZdania(tekst){
  return SZUK_TEMATY.find(t=>t.when.every(grupa=>grupa.some(h=>zawieraTemat(tekst,h))))||null;
}
function interpretujOpis(raw){
  let q=raw; const opts={},info=[];
  if(/["@#:]|\bOR\b|\bNOT\b/.test(q)) return {q,opts,info};
  q=q.replace(/\bpo (\d{4})(?: roku)?/i,(_,y)=>{opts.dateFrom=(+y+1)+"-01-01";info.push("po roku "+y);return " ";});
  q=q.replace(/\bod (\d{4})(?: roku)?/i,(_,y)=>{opts.dateFrom=y+"-01-01";info.push("od roku "+y);return " ";});
  q=q.replace(/\bdo (\d{4})(?: roku)?/i,(_,y)=>{opts.dateTo=y+"-12-31";info.push("do roku "+y);return " ";});
  q=q.replace(/(?:podkreślone|podkreslone|zaznaczone) na (żółto|zolto|zielono|niebiesko|fioletowo|czerwono|pomarańczowo|turkusowo)/i,(_,c)=>{
    opts.highlight=String(({zolto:1,zielono:2,niebiesko:3,fioletowo:4,czerwono:5,pomaranczowo:6,turkusowo:7})[norm(c)]);info.push("kolor: "+c);return " ";
  });
  q=q.replace(/(?:wersety|komentarze) (?:o|na temat) /i,()=>{opts.group="bible";info.push("Biblia");return " ";});
  for(let i=1;i<BOOKS.length;i++){
    const b=BOOKS[i]; if(!b)continue;
    const rx=new RegExp("\\bz\\s+"+b.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","i");
    if(rx.test(q)){q=q.replace(rx,' werset:"'+b+'" ');info.push("księga: "+b);break;}
  }
  q=q.replace(/Strażnica|Straznica/gi,()=>{info.push("Strażnica");return ' werset:"Strażnica" ';});
  q=q.replace(/\b(?:własne|wlasne) notatki\b/i,()=>{opts.group="own";info.push("własne notatki");return " ";});
  q=q.replace(/\b(?:z|ze) zdjęci(?:em|ami)\b/i,()=>{opts.extra="img";info.push("ze zdjęciem");return " ";});
  q=q.replace(/\b(?:ulubione|ulubionych)\b/i,()=>{opts.extra="fav";info.push("ulubione");return " ";});
  q=q.replace(/\b(?:przypięte|przypiete|przypiętych|przypietych)\b/i,()=>{opts.extra="pin";info.push("przypięte");return " ";});
  q=q.replace(/\b(?:z|w) ostatni(?:m)? tygodniu\b/i,()=>{opts.extra="week";info.push("ostatni tydzień");return " ";});
  q=q.replace(/^(?:znajdź|znajdz|pokaż|pokaz|szukam)\s+/i,"").replace(/notatki (?:o|na temat) /i,"").replace(/^\s*o\s+/i,"").trim();
  /* W pytaniu pozostają słowa niosące temat. Dzięki temu „jak radzić sobie
     ze stresem” szuka stresu, a nie wymaga wystąpienia słów „radzić sobie”. */
  if(!/["@#:]|\b(?:OR|NOT)\b/i.test(q)){
    const pola=[];
    q=q.replace(/(?:tytul|tytuł|etykieta|tag|werset|ref|tresc|treść):(?:"[^"]+"|\S+)/gi,m=>{pola.push(m);return " ";});
    const slowa=q.split(/\s+/).map(x=>x.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,"")).filter(Boolean);
    const wazne=slowa.filter(x=>!SZUK_STOP.has(normSzukStart(x)));
    if(wazne.length && wazne.length<slowa.length){q=wazne.join(" ");info.push("pominięto słowa pytające");}
    if(pola.length)q=(q+" "+pola.join(" ")).trim();
  }
  const temat=rozpoznajTematZdania(raw);
  if(temat){
    const pola=q.match(/(?:tytul|tytuł|etykieta|tag|werset|ref|tresc|treść):(?:"[^"]+"|\S+)/gi)||[];
    q=temat.groups.map(g=>"("+g.join("|")+")").join(" ")+(pola.length?" "+pola.join(" "):"");
    info.push("temat: "+temat.label);
  }
  return {q:q.replace(/\s+/g," "),opts,info};
}
const opisoweUruchom=uruchomWyszukiwanie;
uruchomWyszukiwanie=function(raw){
  const widoczny=String(raw||"");
  if(widoczny.trim()!==query) searchFacet={};
  const p=searchMode==="smart"?interpretujOpis(widoczny):{q:widoczny,opts:{},info:[]};
  searchMeaning=p.info.slice();
  if(p.info.length){
    Object.assign(searchOpts,p.opts);lsSet(KP+"SearchOpts",JSON.stringify(searchOpts));
    resetSearchWindow();
    toast("Rozpoznano: "+p.info.join(" · "));
  }
  opisoweUruchom(p.q);
  /* Zapytanie techniczne może być uproszczone, lecz wpis użytkownika pozostaje
     dokładnie taki, jak go wpisał. Żadnego cichego poprawiania ani zamiany. */
  $("search").value=widoczny;
};
/* Zawężanie działa na metadanych i nie zmienia notatek. */
let searchFacet={};
const bazoweOpcje=przechodziOpcjeSzukania;
const bazoweParseAdvanced=parseAdvancedQuery;
parseAdvancedQuery=function(raw){bazoweParseAdvanced(raw);if(raw==="@artykul")qSpecial.article=true;};
przechodziOpcjeSzukania=function(n){
  if(!bazoweOpcje(n))return false;
  if(searchFacet.tag && !(n.tg||[]).includes(+searchFacet.tag))return false;
  if(searchFacet.book && String(n.b)!==searchFacet.book)return false;
  if(searchFacet.chapter && String(n.ch)!==searchFacet.chapter)return false;
  if(searchFacet.pub && (n.ks||n.pub||"")!==searchFacet.pub)return false;
  if(searchFacet.doc && String(n.doc)!==searchFacet.doc)return false;
  if(searchFacet.group && kategoriaNotatki(n)!==searchFacet.group)return false;
  if(searchFacet.year && !(n.mo||n.cr||"").startsWith(searchFacet.year))return false;
  if(searchFacet.image==="yes" && !/<img\b/i.test(n.h||""))return false;
  if(searchFacet.highlight==="has" && !/<mark\b/i.test(n.h||""))return false;
  if(/^[1-7]$/.test(searchFacet.highlight||"") && !(new RegExp("class=[\"'][^\"']*hl"+searchFacet.highlight)).test(n.h||""))return false;
  return true;
};
const statusBazowy=renderSearchStatus;
document.addEventListener("click",e=>{if(e.target&&e.target.closest&&e.target.closest("[data-ssclear],#btnWszystkie,#sClearFilters"))searchFacet={};},true);
renderSearchStatus=function(arr){
  statusBazowy(arr);if(!query)return;
  const box=$("searchStatus"),panel=document.createElement("details");panel.className="searchFacets";
  if(searchMeaning.length){
    const meaning=document.createElement("span");meaning.className="ssInfo searchMeaning";
    meaning.textContent="Rozumiem jako: "+searchMeaning.join(" · ");box.appendChild(meaning);
  }
  const sum=document.createElement("summary");sum.textContent="Zawęź wyniki — liczniki dla wczytanej partii";panel.appendChild(sum);
  const add=(name,key,entries)=>{
    const label=document.createElement("label"),sel=document.createElement("select");
    label.textContent=name+" ";sel.className="ssNav";
    const all=new Option("Wszystkie","");sel.add(all);
    entries.sort((a,b)=>b[1]-a[1]).forEach(([v,count,title])=>sel.add(new Option((title||v)+" ("+count+")",v)));
    if(searchFacet[key]&&!entries.some(x=>String(x[0])===searchFacet[key]))sel.add(new Option(searchFacet[key],searchFacet[key]));
    sel.value=searchFacet[key]||"";
    sel.onchange=()=>{searchFacet[key]=sel.value;resetSearchWindow();uruchomWorkerSzukania();renderAll();};
    label.appendChild(sel);panel.appendChild(label);
  };
  const counts=(fn)=>{const m=new Map();arr.forEach(n=>fn(n).filter(Boolean).forEach(v=>m.set(String(v),(m.get(String(v))||0)+1)));return [...m];};
  add("Etykieta","tag",counts(n=>n.tg||[]).map(([v,c])=>[v,c,(tags.find(t=>t.id===+v)||{}).name||v]));
  add("Księga","book",counts(n=>[n.b]).map(([v,c])=>[v,c,BOOKS[+v]||v]));
  if(searchFacet.book)add("Rozdział","chapter",counts(n=>[n.ch]));
  add("Publikacja","pub",counts(n=>[n.ks||n.pub]));
  add("Rok zmiany","year",counts(n=>[(n.mo||n.cr||"").slice(0,4)]));
  add("Rodzaj","group",counts(n=>[kategoriaNotatki(n)]).map(([v,c])=>[v,c,({bible:"Biblia",publication:"Publikacje",own:"Własne"})[v]||v]));
  const hi=counts(n=>{const a=[];for(let i=1;i<=7;i++)if((new RegExp("class=[\"'][^\"']*hl"+i)).test(n.h||""))a.push(i);return a;});
  if(hi.length){const total=arr.filter(n=>(/<mark\b/i).test(n.h||"")).length;add("Podświetlenie","highlight",[["has",total,"Dowolne"],...hi.map(([v,c])=>[v,c,"Kolor "+v])]);}
  add("Zdjęcia","image",[["yes",arr.filter(n=>(/<img\b/i).test(n.h||"")).length,"Ze zdjęciem"]].filter(x=>x[1]));
  const more=document.createElement("button");more.className="ssNav";more.textContent="Daty, kolor, zdjęcia i rodzaj…";more.onclick=()=>$("btnSearchTools").click();panel.appendChild(more);
  const clear=document.createElement("button");clear.className="ssNav";clear.textContent="Usuń zawężenia";clear.onclick=()=>{searchFacet={};resetSearchWindow();uruchomWorkerSzukania();renderAll();};panel.appendChild(clear);
  box.appendChild(panel);
};
/* Sugestie po pauzie korzystają ze słownika pojęć i nazw etykiet. Nigdy nie
   poprawiają zapytania bez dotknięcia propozycji. */
let slownikKorekt={notes:-1,tags:-1,words:[]};
function pobierzSlownikKorekt(){
  if(slownikKorekt.notes===notes.length&&slownikKorekt.tags===tags.length)return slownikKorekt.words;
  const dict=new Set(SZUK_POJECIA.flat());
  tags.forEach(t=>(norm(t.name).match(/[a-z]{4,}/g)||[]).forEach(s=>dict.add(s)));
  notes.slice(0,12000).forEach(n=>(norm(n.t||"").match(/[a-z]{4,}/g)||[]).forEach(s=>dict.add(s)));
  slownikKorekt={notes:notes.length,tags:tags.length,words:[...dict]};
  return slownikKorekt.words;
}
function propozycjeKorekty(raw){
  const word=norm(raw.trim());if(word.length<4||/\s|[:"@#]/.test(word))return [];
  const dict=pobierzSlownikKorekt();
  if(dict.includes(word))return [];
  return dict.map(s=>({s,d:odleglosc1(word,s,word.length>=9?2:1)}))
    .filter(x=>x.d>0&&x.d<=(word.length>=9?2:1)).sort((a,b)=>a.d-b.d).slice(0,3).map(x=>x.s);
}
const stareSug=showSearchSug;
showSearchSug=function(raw){
  stareSug(raw);const suggestions=propozycjeKorekty(raw);if(!suggestions.length)return;
  const box=$("searchSug");suggestions.forEach(s=>{
    const btn=document.createElement("button");btn.type="button";btn.className="ssNav";btn.textContent="Czy chodziło o: "+s+"?";
    btn.onpointerdown=e=>{e.preventDefault();$("search").value=s;uruchomWyszukiwanie(s);hideSearchSug();};box.appendChild(btn);
  });box.style.display="block";
};
hlBar.addEventListener("pointerdown",e=>{
  if(!e.target.closest("[data-search-selection]"))return;
  e.preventDefault();e.stopPropagation();
  const sel=getSelection();if(!sel||sel.isCollapsed)return;
  const text=sel.toString().trim().slice(0,600);if(!text)return;
  const base=sel.anchorNode,el=base&& (base.nodeType===1?base:base.parentElement);
  const card=el&&el.closest(".ncard"),n=card&&notes.find(x=>x.g===card.dataset.g);
  const dd=$("dropdown");dd.onclick=null;dd.replaceChildren();
  const action=(label,run)=>{const b=document.createElement("button");b.className="searchSelAct";b.textContent=label;b.onclick=()=>{dd.style.display="none";run();};dd.appendChild(b);};
  const search=(q,opts)=>{if(fsGuid)closeFs();searchFacet={};searchOpts={scope:"all",group:"all",dateFrom:"",dateTo:"",highlight:"all",extra:"all"};Object.assign(searchOpts,opts||{});$("search").value=q;uruchomWyszukiwanie(q);};
  action("Znajdź ten cytat",()=>search('"'+text.replace(/"/g,"")+'"'));
  action("Znajdź podobne notatki",()=>{const words=[...new Set((norm(text).match(/[a-z]{4,}/g)||[]).filter(s=>!SZUK_STOP.has(s)))].slice(0,6);if(words.length)search(words.join(" OR "));});
  action("Znajdź powiązane wersety",()=>{
    const refs=text.match(/(?:[1-3]\s*)?[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]+\s+\d{1,3}:\d{1,3}(?:[-–]\d{1,3})?/g);
    if(refs&&refs.length)search(refs.map(x=>'"'+x+'"').join(" OR "),{group:"bible"});
    else{const words=[...new Set((norm(text).match(/[a-z]{5,}/g)||[]).filter(s=>!SZUK_STOP.has(s)))].slice(0,6);if(words.length)search(words.join(" OR "),{group:"bible"});}
  });
  if(n&&n.doc)action("Inne notatki z tego artykułu",()=>{search('@artykul');searchFacet={doc:String(n.doc),pub:n.ks||n.pub||""};resetSearchWindow();renderAll();});
  hlBar.style.display="none";dd.style.display="block";dd.style.zIndex="10050";dd.style.left="12px";dd.style.top="auto";dd.style.bottom="max(16px,env(safe-area-inset-bottom))";
});
const helpMore=document.createElement("p");
helpMore.textContent='Przykłady: „notatki o pokorze po 2024 roku”, „wersety o pokorze z Mateusza”, „podkreślone na żółto o zaufaniu”, „Diabeł rządzi światem”. Tryb inteligentny rozpoznaje cały temat i pokazuje nad wynikami „Rozumiem jako”. To reguły lokalne, nie AI. Daty dotyczą zmiany notatki. Zawężaj etykiety i publikacje pod wynikami. Korekty zatwierdzasz dotknięciem. Zaznacz tekst i wybierz ⌕, aby szukać cytatu, podobnych notatek lub adresów wersetów.';
document.querySelector(".searchHelp").appendChild(helpMore);

/* JW Study — Powiązania Paska Bocznego (Modern App Rail) & Mobile Drawer */
(function initSidebarEvents(){
  const appContainer = document.getElementById("appContainer");
  const btnSidebarCollapse = document.getElementById("btnSidebarCollapse");
  const sidebarFloatTrigger = document.getElementById("sidebarFloatTrigger");
  const btnMobileMenu = document.getElementById("btnMobileMenu");
  const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");
  const sidebarBackdrop = document.getElementById("sidebarBackdrop");
  const sidebarEl = document.getElementById("modernSidebar");

  const btnNewNote = document.getElementById("sidebarBtnNew");
  const navNotes = document.getElementById("navItemNotes");
  const navCentrum = document.getElementById("navItemCentrum");
  const navMapa = document.getElementById("navItemMapa");
  const navTags = document.getElementById("navItemTags");
  const navBooks = document.getElementById("navItemBooks");
  const navPubs = document.getElementById("navItemPubs");
  const navCols = document.getElementById("navItemCols");
  const navMenu = document.getElementById("navItemMenu");
  const navSync = document.getElementById("navItemSync");
  const navTheme = document.getElementById("navItemTheme");
  const navColors = document.getElementById("navItemColors");
  const navSettings = document.getElementById("navItemSettings");

  function toggleMobileSidebar(open) {
    const isCurrentlyOpen = document.body.classList.contains("mobile-sidebar-open");
    const shouldOpen = open !== undefined ? Boolean(open) : !isCurrentlyOpen;
    document.body.classList.toggle("mobile-sidebar-open", shouldOpen);
    if (appContainer) appContainer.classList.toggle("mobile-sidebar-open", shouldOpen);
    const bd = document.getElementById("sidebarBackdrop");
    if (bd) bd.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
  }
  window.toggleMobileSidebar = toggleMobileSidebar;

  function updateSidebarActiveStates() {
    const isCentrumOpen = document.body.classList.contains("centrum-open");
    const navCentrum = document.getElementById("navItemCentrum");
    if (navCentrum) navCentrum.classList.toggle("active", isCentrumOpen);

    const tabCentrum = document.getElementById("tabMobileCentrum");
    if (tabCentrum) tabCentrum.classList.toggle("on", isCentrumOpen);

    const tagsCol = document.getElementById("colTags");
    const navTags = document.getElementById("navItemTags");
    if (navTags && tagsCol) navTags.classList.toggle("active", !tagsCol.classList.contains("collapsed") && !isCentrumOpen);

    const booksCol = document.getElementById("colBooks");
    const navBooks = document.getElementById("navItemBooks");
    if (navBooks && booksCol) navBooks.classList.toggle("active", !booksCol.classList.contains("collapsed") && !isCentrumOpen);

    const pubsCol = document.getElementById("colPubs");
    const navPubs = document.getElementById("navItemPubs");
    if (navPubs && pubsCol) navPubs.classList.toggle("active", !pubsCol.classList.contains("collapsed") && !isCentrumOpen);

    const navNotes = document.getElementById("navItemNotes");
    if (navNotes) {
      navNotes.classList.toggle("active", !isCentrumOpen);
    }
  }
  window.updateSidebarActiveStates = updateSidebarActiveStates;

  function setNavActive(el) {
    document.querySelectorAll(".sidebar-nav-item").forEach(b => b.classList.remove("active"));
    if (el) el.classList.add("active");
  }
  window.setSidebarNavActive = setNavActive;

  function closeCentrumIfOpen() {
    if (document.body.classList.contains("centrum-open")) {
      if (typeof centrumSchowaj === "function") {
        centrumSchowaj();
      } else {
        const btnC = document.getElementById("btnCentrum");
        if (btnC) btnC.click();
      }
    }
  }

  function toggleSidebar(forceCollapsed) {
    if (!appContainer) return;
    const isCollapsed = forceCollapsed !== undefined ? forceCollapsed : !appContainer.classList.contains("sidebar-collapsed");
    appContainer.classList.toggle("sidebar-collapsed", isCollapsed);
    try {
      localStorage.setItem("jws_sidebar_collapsed", isCollapsed ? "1" : "0");
    } catch(e) {}
  }
  window.toggleSidebar = toggleSidebar;

  const sidebarBrand = document.getElementById("sidebarBrand") || document.querySelector(".sidebar-brand");
  if (sidebarBrand) {
    sidebarBrand.addEventListener("click", (e) => {
      if (e.target && e.target.closest("#sidebarCloseBtn")) return;
      if (window.innerWidth > 768) {
        toggleSidebar();
      }
    });
  }
  if (btnSidebarCollapse) btnSidebarCollapse.addEventListener("click", () => toggleSidebar(true));
  if (sidebarFloatTrigger) sidebarFloatTrigger.addEventListener("click", () => toggleSidebar(false));

  if (btnMobileMenu) {
    btnMobileMenu.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMobileSidebar();
    });
  }

  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMobileSidebar(false);
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener("click", () => {
      toggleMobileSidebar(false);
    });
  }

  // Zamykanie drawera na telefonie po kliknięciu dowolnej pozycji w pasku bocznym
  if (sidebarEl) {
    sidebarEl.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest ? e.target.closest(".sidebar-nav-item, .sidebar-new-btn") : null;
      if (btn) {
        if (window.innerWidth <= 768 || document.body.classList.contains("mobile-sidebar-open")) {
          toggleMobileSidebar(false);
        }
      }
    });
  }

  // Klawisze skrótu
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("mobile-sidebar-open")) {
      e.preventDefault();
      toggleMobileSidebar(false);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B") && !e.shiftKey && !e.altKey) {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
      e.preventDefault();
      toggleSidebar();
    }
  });

  // Wczytaj stan paska bocznego na desktopie
  try {
    if (localStorage.getItem("jws_sidebar_collapsed") === "1") {
      if (appContainer) appContainer.classList.add("sidebar-collapsed");
    }
  } catch(e) {}

  if (btnNewNote) {
    btnNewNote.addEventListener("click", () => {
      const btnN = document.getElementById("btnNew");
      if (btnN) btnN.click();
    });
  }

  if (navNotes) {
    navNotes.addEventListener("click", () => {
      closeCentrumIfOpen();
      if (typeof mobileShow === "function" && window.innerWidth <= 900) {
        mobileShow("colNotes");
      }
      const noteList = document.getElementById("noteList");
      if (noteList) noteList.scrollTo({ top: 0, behavior: "smooth" });
      updateSidebarActiveStates();
    });
  }

  if (navCentrum) {
    navCentrum.addEventListener("click", (e) => {
      if (e) e.preventDefault();
      if (typeof centrumPokaz === "function") {
        centrumPokaz();
      }
    });
  }

  if (navMapa) {
    navMapa.addEventListener("click", () => {
      closeCentrumIfOpen();
      const btnM = document.getElementById("btnMapa");
      if (btnM) btnM.click();
      else if (typeof otworzMape === "function") otworzMape();
      updateSidebarActiveStates();
    });
  }

  if (navTags) {
    navTags.addEventListener("click", () => {
      const isCentrum = document.body.classList.contains("centrum-open");
      closeCentrumIfOpen();
      const colEl = document.getElementById("colTags");
      const isCollapsed = colEl ? colEl.classList.contains("collapsed") : false;
      const targetState = isCentrum ? false : !isCollapsed;
      if (typeof setCollapsed === "function") {
        setCollapsed("colTags", targetState);
      }
      if (typeof mobileShow === "function" && window.innerWidth <= 900 && !targetState) {
        mobileShow("colTags");
      }
      updateSidebarActiveStates();
    });
  }

  if (navBooks) {
    navBooks.addEventListener("click", () => {
      const isCentrum = document.body.classList.contains("centrum-open");
      closeCentrumIfOpen();
      const colEl = document.getElementById("colBooks");
      const isCollapsed = colEl ? colEl.classList.contains("collapsed") : false;
      const targetState = isCentrum ? false : !isCollapsed;
      if (typeof setCollapsed === "function") {
        setCollapsed("colBooks", targetState);
      }
      if (typeof mobileShow === "function" && window.innerWidth <= 900 && !targetState) {
        mobileShow("colBooks");
      }
      updateSidebarActiveStates();
    });
  }

  if (navPubs) {
    navPubs.addEventListener("click", () => {
      const isCentrum = document.body.classList.contains("centrum-open");
      closeCentrumIfOpen();
      const colEl = document.getElementById("colPubs");
      const isCollapsed = colEl ? colEl.classList.contains("collapsed") : false;
      const targetState = isCentrum ? false : !isCollapsed;
      if (typeof setCollapsed === "function") {
        setCollapsed("colPubs", targetState);
      }
      if (typeof mobileShow === "function" && window.innerWidth <= 900 && !targetState) {
        mobileShow("colPubs");
      }
      updateSidebarActiveStates();
    });
  }

  if (navCols) {
    navCols.addEventListener("click", (e) => {
      e.stopPropagation();
      const dd = document.getElementById("dropdown");
      if (dd && dd.style.display === "block" && dd.dataset.rodzaj === "kolumny") {
        dd.style.display = "none";
        return;
      }
      if (typeof otworzMenuKolumn === "function") {
        otworzMenuKolumn(navCols);
      } else {
        const btnC = document.getElementById("btnCols");
        if (btnC) btnC.click();
      }
    });
  }

  if (navMenu) {
    navMenu.addEventListener("click", (e) => {
      e.stopPropagation();
      const dd = document.getElementById("dropdown");
      if (dd && dd.style.display === "block" && dd.dataset.mode === "file") {
        dd.style.display = "none";
        return;
      }
      const btnM = document.getElementById("btnMenu");
      if (btnM && typeof btnM.onclick === "function") {
        btnM.onclick({ currentTarget: navMenu });
        if (dd) dd.dataset.mode = "file";
      }
    });
  }

  if (navSync) {
    navSync.addEventListener("click", () => {
      const btnB = document.getElementById("btnBackup");
      if (btnB) btnB.click();
      else if (typeof syncUzgodnijTeraz === "function") syncUzgodnijTeraz();
    });
  }

  if (navTheme) {
    navTheme.addEventListener("click", (e) => {
      e.stopPropagation();
      const m = document.getElementById("motywMenu");
      if (m && m.style.display === "block") {
        m.style.display = "none";
        return;
      }
      if (typeof otworzMenuMotywu === "function") {
        otworzMenuMotywu(navTheme);
      } else {
        const btnT = document.getElementById("btnTheme");
        if (btnT) btnT.click();
      }
    });
  }

  if (navColors) {
    navColors.addEventListener("click", (e) => {
      e.stopPropagation();
      const cm = document.getElementById("colorMenu");
      if (cm && cm.style.display === "block") {
        cm.style.display = "none";
        return;
      }
      if (typeof openColorMenu === "function") {
        openColorMenu({ target: navColors });
      } else {
        const btnC = document.getElementById("btnColors");
        if (btnC) btnC.click();
      }
    });
  }

  if (navSettings) {
    navSettings.addEventListener("click", () => {
      const btnS = document.getElementById("btnSettings");
      if (btnS) btnS.click();
      else if (typeof openSettings === "function") openSettings();
    });
  }

  updateSidebarActiveStates();
})();
