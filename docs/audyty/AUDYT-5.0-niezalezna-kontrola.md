# Niezależna kontrola techniczna JW-Study 5.0

**Data:** 19.10.2026
**Kontrolowany katalog:** `/Users/grzegorzskarzynski/Desktop/Aplikacja JW /JW-Study-3.56`
**Wersja wg `WERSJA` / `APP_VERSION`:** 5.0 (cache SW: `v536`)
**Zakres:** bezpieczeństwo, wydajność i waga wydania, PWA/offline, architektura i jakość kodu, spójność dokumentacji i wersji, repozytorium git, dostępność.
**Metoda:** analiza statyczna plików na dysku + niezależna weryfikacja składni natywnym JavaScriptCore (`osascript -l JavaScript`) + porównania SHA-256 + inspekcja historii git i stanu publikacji na GitHubie. Wszystkie liczby w raporcie zostały zmierzone ponownie; nie powtarzam twierdzeń z `AUDYT-5.0.md`, tylko je sprawdzam.

> Ten dokument niczego nie zmienia w aplikacji. Jest zapisem stanu i listą rekomendacji.

---

## A. Podsumowanie

| Obszar | Ocena | Uwaga |
|---|:--:|---|
| Sanityzacja treści i XSS | **dobra** | biała lista tagów, parsowanie bezwładne, `esc()` konsekwentnie używane |
| Polityka bezpieczeństwa (CSP) | **dobra** | brak `unsafe-eval`; jeden nadmiarowy zapis (supabase) |
| Bezpieczeństwo zależności | **średnia** | pdf.js 3.11.174 (EOL), ryzyko zmitygowane podwójnie |
| Sekrety i higiena repozytorium | **krytyczna** | token GitHub PAT jawnie w `.git/config`; `.git` 708 MB, brak `gc` |
| Odporność danych (zapis, import, kosz) | **dobra** | transakcje atomowe, obsługa braku pamięci, kosz 30 dni, historia wersji |
| Tryb offline / PWA | **dobra** | poprawna strategia cache, aktualizacja za zgodą użytkownika |
| Wydajność i waga wydania | **słaba** | `index.html` 14,45 MB (6,33 MB po gzipie); 11,33 MB to base64 |
| Architektura i modularność | **słaba** | 1262 funkcje w zasięgu globalnym, 59 bloków `<script>`, brak modułów i bundlera |
| Spójność wersji i dokumentacji | **słaba** | katalog 3.56, wersja 5.0, cache v536, changelog bez 3.58–4.9, stare instrukcje wdrożenia |
| Dokumentacja i testy | **słaba** | testy regresji na 3.56 nie przechodzą na 5.0; Node.js niedostępny na tej maszynie |
| Dostępność (a11y) | **dobra** | 17× `aria-modal`, 26× `role="dialog"`, `:focus-visible`, `prefers-reduced-motion`; jeden poważny błąd: blokada zoomu |

**Trzy rzeczy do zrobienia natychmiast:** (1) unieważnić token GitHub, (2) `git gc`, (3) usunąć z repo `index.monolith-backup.html`.

---

## B. Ustalenia krytyczne i wysokie

### B1. KRYTYCZNE — token GitHub zapisany jawnie w `.git/config`

Plik `.git/config` zawiera token osobisty (PAT) w adresie zdalnym:

```
[remote "origin"]
    url = https://github_pat_11BOZAXSA…<zredagowane>…@github.com/Skarzynski76/Jw-Study-5.0.git
```

- Dowód: `grep -rl github_pat .git` → tylko `.git/config`.
- **Dobra wiadomość (sprawdzone):** token **nie występuje** w historii commitów ani w archiwum `JW-Study-3.57-DO-WGRANIA.zip`, które leży w historii git. Wyciek jest więc ograniczony do tego jednego komputera, a nie do repozytorium.
- **Zła wiadomość:** token jest w postaci jawnej, ma prawa zapisu do repozytorium, a katalog jest kopiowany i pakowany do ZIP-ów (dokładnie tak powstał `…-DO-WGRANIA.zip`). Instrukcja `WGRYWAJ-TEN-KATALOG.txt` mówi „wgraj zawartość tego katalogu” — jeżeli kiedykolwiek przez zwykłe wgranie plików (nie przez `git push`) trafi na hosting katalog `.git`, plik `.git/config` będzie **publicznie do pobrania** pod adresem `…/.git/config`.

**Rekomendacja (kolejność ma znaczenie):**
1. GitHub → Settings → Developer settings → Personal access tokens → **odwołać ten token** i utworzyć nowy, jeśli jest potrzebny.
2. Przestawić zdalne repozytorium na SSH albo na menedżer poświadczeń systemu:
   `git remote set-url origin git@github.com:Skarzynski76/Jw-Study-5.0.git`
   (alternatywnie `git config --global credential.helper osxkeychain` i adres `https://github.com/...` bez tokenu).
3. Sprawdzić, czy do repozytorium nie trafił kiedyś katalog `.git` — po liście plików zdalnych go tam nie ma (potwierdzone przez API GitHuba).
4. Nigdy nie wgrywać „całej zawartości katalogu” narzędziem, które kopiuje też katalogi ukryte. Publikować wyłącznie przez `git push`.

### B2. WYSOKIE — waga i architektura wydania (14,45 MB w jednym pliku)

Zmierzone ponownie:

| Element | Rozmiar |
|---|---|
| `index.html` (katalog roboczy) | **14 452 523 B = 13,78 MB**; 59 094 linie |
| `index.html` po `gzip -9` | **6 327 274 B = 6,03 MB** (44% kompresji) |
| 8 bibliotek base64 w dokumencie | **11,33 MB base64 → 8,50 MB binarnie** (82% dokumentu) |
| własny kod aplikacji (HTML+CSS+JS) | ~2,4 MB |
| CSS | 0,67 MB, 4757 reguł, nawiasy zbalansowane (4757/4757) |

Największe bloki: `tesseract-core-lstm.wasm.js` 5,01 MB, `pol.traineddata.gz` (słownik OCR) 3,36 MB, `pdf.worker.min.js` 1,38 MB, `mammoth.browser.min.js` 0,81 MB.

Skutki praktyczne:
- **Pierwsze wejście na telefonie:** ~6,3 MB transferu (gzip) + instalacja service workera pobiera ponownie `index.html` i 14 plików rdzenia → łącznie ok. 12–14 MB.
- **Każda aktualizacja wersji** to ponowne pobranie całego 14-megabajtowego dokumentu, bo aplikacja to jeden plik.
- **Pamięć:** 11,33 MB łańcuchów base64 siedzi w DOM; dekodowanie (OCR/PDF) tworzy drugą kopię. Na starszym iPadzie to realne ryzyko ubicia karty przy imporcie skanu.
- **Repo git:** każde wydanie to nowy blob 14 MB (patrz B3).
- Koszt nie jest teoretyczny: `AUDYT-5.0.md` sam wskazuje ten kierunek jako „Etap II”, ale **nie ma śladu, żeby został wykonany** — 8 bloków base64 nadal jest w pliku.

**Rekomendacja:** usunąć z `index.html` wszystkie 8 bloków `smartAsset-*` i zostawić wczytywanie z `./lib/` (pliki **już tam są** i są bajtowo identyczne — patrz D2). Loader częściowo to potrafi (`smartWczytajSkrypt`, `getLibs`, fallback `lib/smart-import/`), ale trzeba go rozszerzyć o `smartPdfLib`, `smartWbudowanySkrypt`, `smartOcrZasoby`. CSP i `worker-src 'self' blob:` już na to pozwalają. Efekt szacunkowy: `index.html` ~3,2 MB → ~1,4 MB po gzipie, czyli **~4,5× lżej** i natychmiastowe malowanie pierwszej strony.

### B3. WYSOKIE — repozytorium git: 708 MB, nigdy nie spakowane, 104 kopie monolitu w historii

```
git count-objects -vH → count: 564, size: 707.72 MiB, in-pack: 0, packs: 0
```

- **Zero paczek** (`in-pack: 0`) oznacza, że `git gc` nigdy nie zostało uruchomione — 564 obiekty leżą luzem.
- W historii jest **104 wersje `index.html`** (każda ~14 MB) oraz jeden blob 18 003 148 B (`JW-Study-3.57-DO-WGRANIA.zip`).
- `index.monolith-backup.html` (13,86 MB) jest **śledzony** i przez to **publicznie dostępny** w repozytorium i na stronie.
- Wpis w `.gitignore` `index-*.html` **nie obejmuje** nazwy `index.monolith-backup.html` (nie ma tam dywizu po `index`), dlatego plik wpadł do commitów.

**Rekomendacja:**
1. Natychmiast, bez ryzyka: `git gc --aggressive --prune=now` (typowo redukuje 60–80%).
2. Usunąć `index.monolith-backup.html` z repozytorium i z historii (`git filter-repo`/BFG) oraz dodać `index.monolith-backup.html` do `.gitignore`. To operacja przepisująca historię — wymaga zgody i `push --force`.
3. Rozważyć Git LFS albo trzymanie kopii wersji poza repozytorium (jedno źródło: git; archiwum ZIP poza repo).

### B4. WYSOKIE — testy regresji nie odpowiadają wersji 5.0 i nie przechodzą

- `testy/regresja.js` ma nagłówek „3.56”, `testy/WYNIK.txt` mówi „50/50, 23.09.2026”, a `AUDYT-5.0.md` powołuje się na „34/34 obszarów PASS”.
- Pierwszy test (`Składnia wszystkich skryptów i zgodność wersji`) wymaga **dokładnie 67 bloków `<script>`** (`assert.equal(count,67)`). W obecnym `index.html` to wyrażenie znajduje **59** bloków → **test FAIL** już na pierwszym kroku.
- Katalog `testy/` jest w `.gitignore`, więc **nie istnieje żadna kopia testów w repozytorium**. Cała warstwa kontroli jakości żyje tylko na tym dysku.
- Na tej maszynie **nie ma Node.js** (`node` nieobecny), więc `testy/uruchom.sh` i `regresja.js` nie uruchomią się bez instalacji Node 20+.

**Rekomendacja:** odsprzęgnąć asercję od liczby bloków (`assert(count >= 59)` albo liczyć bloki realnym analizatorem), dodać `testy/` do repozytorium (i przenieść źródło GitHub Pages do podkatalogu, żeby testy nie były publiczne), uruchamiać `regresja.js` przed każdym wydaniem i dopisywać wynik do `WYNIK.txt` z datą i numerem wersji.

---

## C. Ustalenia średnie

### C1. Martwy kod i martwy precache: Supabase

- `sw.js` (linia 20) wpisuje `./lib/supabase.js` (218 KB) do `CORE`, czyli pobiera go **na każdej instalacji service workera**.
- Aplikacja **nigdy** go nie ładuje: w `index.html` słowo „supabase” występuje **wyłącznie w nagłówku CSP**. Synchronizacja w wersji 5.0 jest **plikowa** (`syncUzgodnijTeraz`, `syncWyslij`, `syncWczytaj`, plik wskazywany przez użytkownika), a nie chmurowa.
- Pozostałości: `supabase_schema.sql` (publicznie dostępny, opisuje nieistniejącą funkcję), `lib/supabase.js`, oraz zapis w CSP:
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co`.
- Zapis w CSP jest **nadmiarowy i szkodliwy dla zasady minimalnych uprawnień**: zezwala dokumentowi na połączenia do dowolnego projektu `*.supabase.co`, mimo że nic ich nie potrzebuje.

**Rekomendacja:** usunąć `./lib/supabase.js` z `CORE`, usunąć plik i `supabase_schema.sql`, **usunąć fragment supabase z `connect-src`** (zostawić `connect-src 'self'`), podnieść wersję cache. Zysk: 218 KB mniej na każdej instalacji i węższa polityka.

### C2. Duplikacja: te same biblioteki dwa razy na dysku i w repo

Porównanie SHA-256 treści base64 z `index.html` z plikami w `lib/smart-import/`:

```
IDENTYCZNE  pdf.min.js, pdf.worker.min.js, mammoth.browser.min.js,
            tesseract.min.js, tesseract.worker.min.js
IDENTYCZNE  lib/jszip.min.js  ==  blob jszip.min.js w index.html
```

Czyli: 8,50 MB tych samych bajtów leży raz w dokumencie, raz w `lib/` (6,5 MB na dysku + w repo). Na razie kopie są zgodne, ale to dwa źródła prawdy — a rozjazd jest kwestią czasu i będzie bardzo trudny do wykrycia. Test `Wbudowane biblioteki są poza komentarzami HTML i zgodne z plikami` z `regresja.js` próbuje tego pilnować, ale (patrz B4) i tak nie przechodzi.

**Rekomendacja:** jedno źródło — pliki w `lib/`; w `index.html` nie zostawiać kopii. Jeśli inline musi zostać jako awaryjny tryb (bo kiedyś CDN/lib zwracał 404), to niech to będzie jeden jawnie opisany mechanizm, a nie 8 bloków.

### C3. Struktura skryptu: 1262 funkcje globalne, powielone definicje

- 59 wykonywalnych bloków `<script>`; wszystkie dzielą **jeden globalny zasięg** (brak ESM, brak bundlera).
- 447 deklaracji na poziomie 0, 56 przypisań `window.X =`.
- **Funkcje zadeklarowane wielokrotnie:** `walk` ×5, `norm` ×3, `resetQueryCache` ×3, `handleImportFile` ×2. W JavaScript ostatnia definicja wygrywa — czyli wcześniejsze są martwe, a zmiana „tej właściwej” wymaga wiedzy, która to. (Uwaga: to samo psuje testy — `testy/regresja.js` w funkcji `fn()` bierze **pierwszą** definicję z pliku.)
- **`var` zadeklarowane dwukrotnie na poziomie 0:** `searchScores`, `searchMatchLimit`, `qComp`, `_qNorm`, `qAdvTerms`, `_qCache`, `_searchCounts` (np. linie 22603 i 26326; 26671 i 30111). Działa (bo to `var`), ale stan wyszukiwania ma dwa miejsca inicjalizacji.

**Rekomendacja:** przejść na moduły ES + bundler (Vite/esbuild) albo przynajmniej owinąć bloki w IIFE i zostawić jeden jawny obiekt-namespace. Zacząć od usunięcia zdublowanych definicji — to tanie i usuwa pułapki.

### C4. Biblioteka pdf.js w wersji 3.11.174 (EOL, 2023)

- `pdf.min.js` i `pdf.worker.min.js` to pdf.js **3.11.174**.
- CVE-2024-4367 (wykonanie kodu przez spreparowany PDF, dotyczy wersji < 4.2.67) **jest w tej aplikacji zneutralizowane dwiema niezależnymi warstwami:** (1) CSP nie zawiera `'unsafe-eval'`, więc `eval()` jest zablokowany; (2) kod wprost ustawia `isEvalSupported:false` w `getDocument` (linia 35808). To dobrze zaprojektowana obrona w głąb.
- Mimo to wersja jest przestarzała i nie dostaje już poprawek. Pozostałe biblioteki: `JSZip 3.10.1` (aktualna), Tesseract.js/`pol.traineddata` — wersji nie da się odczytać z minifikatu; do uzupełnienia na podstawie `lib/smart-import/LICENSE-*.txt`.

**Rekomendacja:** zaplanować aktualizację pdf.js do 4.x/5.x i przy okazji sprawdzić `LICENSE-PDFJS.txt`. Uwaga: przy obecnej architekturze aktualizacja oznacza ponowne wbudowanie biblioteki w monolit — kolejny argument za B2.

### C5. Publikacja: repozytorium = strona, więc wszystko jest publiczne

Repozytorium `Skarzynski76/Jw-Study-5.0` **jest publiczne**, a jego katalog główny **jest źródłem GitHub Pages**. Publicznie do pobrania są (potwierdzone przez API GitHuba):

`index.monolith-backup.html` (13,86 MB — pełna, nieaktualna kopia aplikacji), `CHANGELOG.md` (146 KB), `AUDYT-5.0.md`, `AUDYT-3.57.md`, `AUDYT-3.56.md`, `AKTUALIZACJA-3.56/3.57/3.63.txt`, `WGRYWAJ-TEN-KATALOG.txt` (przestarzałe instrukcje dla 3.57), `supabase_schema.sql`, `.gemini/rules/autonomia.md`, `podglad_grafiki.html`, `README.md`, `WERSJA`.

Nic z tego nie jest tajne, ale:
- `.gemini/rules/autonomia.md` zawiera regułę „**automatyczny commit i push**” — publiczne instruowanie agenta AI, gdy ma dostęp do repozytorium, to proszenie się o kłopoty (w połączeniu z tokenem z B1).
- `AUDYT-5.0.md` publicznie opisuje słabości i plan optymalizacji.
- Stare `AKTUALIZACJA-*.txt` mogą trafić w ręce użytkownika i doprowadzić do wgrania złej wersji.

**Rekomendacja:** przenieść źródło Pages do podkatalogu (np. `/docs`) i trzymać dokumentację oraz pliki robocze poza publikowanym katalogiem; minimum — usunąć `index.monolith-backup.html` i archiwalia.

### C6. Niespójność wersji i dokumentacji

| Miejsce | Wartość |
|---|---|
| nazwa katalogu | `JW-Study-3.56` |
| `WERSJA`, `APP_VERSION`, `manifest`, `README` | `5.0` |
| cache service workera | `v536` |
| `CHANGELOG.md` | po `3.57` skacze do `5.0` (brak 3.58–4.9, choć `git log` ma w tym okresie kilkadziesiąt commitów) |
| `docs/WYDANIE.md` | opisuje wersję **3.36** |
| `AKTUALIZACJA-3.63.txt` | „natychmiastowa aktywacja i przejęcie kontroli (`skipWaiting`)”, podczas gdy `sw.js` wprost komentuje, że `skipWaiting` **usunięto** |
| `testy/README.md`, `WYNIK.txt` | 3.56 / 50 testów |

Sprzeczne dokumenty wdrożeniowe to realne ryzyko operacyjne: łatwo wgrać plik z niewłaściwą „instrukcją obsługi”.

**Rekomendacja:** jedno źródło prawdy (`WERSJA`) i skrypt wydania, który podnosi `APP_VERSION`, wpis w `CHANGELOG`, wersję `CACHE` w `sw.js` i usuwa/archiwizuje stare `AKTUALIZACJA-*`/`AUDYT-*`.

---

## D. Ustalenia drobne (porządki i obrona w głąb)

1. **`delAt` nie jest walidowane w `sanitizeNote`**, a trafia do `innerHTML`:
   `row.innerHTML = …"usunięto ${(n.delAt||"").substring(0,10)}"` (linia 30647). Pole pochodzi z notatki wczytanej z **cudzej** kopii JSON, nie ma go na liście walidowanych pól, a trafia też do podpisu synchronizacji (55118). Obcięcie do 10 znaków praktycznie uniemożliwia domknięcie tagu (na tym polega obecna ochrona), ale to jedyne pole z importu bez walidacji. **Zalecenie:** `if(n.delAt!=null && !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z?$/.test(String(n.delAt))) delete n.delAt;`
2. **`<script>` w komentarzu** (linia 25019: „…albo `<script>`, żeby przy otwarciu…”) powoduje, że znaczników `<script>` jest 69, a `</script>` 68. Nieszkodliwe dla przeglądarki (wewnątrz komentarza), ale psuje naiwne parsery i narzędzia (między innymi mój pierwszy skrypt analityczny i potencjalnie testy). **Zalecenie:** zapisać jako `< script>` lub w inny sposób przerwać literał — gdyby kiedyś ktoś napisał `</script>` w komentarzu lub w łańcuchu, dokument pęknie i część kodu przestanie się wykonywać.
3. **Dostępność — blokada powiększania:** `viewport` zawiera `maximum-scale=1.0, user-scalable=no` (linia 22). To uniemożliwia powiększenie treści (WCAG 1.4.4) i jest najpoważniejszym problemem a11y w aplikacji. Warto usunąć obie dyrektywy — aplikacja jest zbudowana responsywnie, więc nie potrzebuje blokady.
4. **191 przycisków bez `type="button"`.** Aplikacja nie używa formularzy, więc skutek jest dziś zerowy, ale to tanie i standardowe uporządkowanie.
5. **Ikona maskowalna to kopia zwykłej:** `icon-maskable-512.png` i `icon-512.png` mają identyczny SHA-256 (`d4021a68…`) → ikona nie ma bezpiecznego marginesu i na Androidzie może być przycinana. Zalecenie: przygotować ikonę z ~20% marginesu.
6. **`document.write` (2×, okno wydruku) i `window.open("")`:** okno potomne zachowuje `window.opener` i jest tego samego pochodzenia. Treść przechodzi przez sanityzację, więc ryzyko jest niskie, ale wystarczy `printWin.opener = null;` po otwarciu.
7. **Zewnętrzne odnośniki:** jedyne zewnętrzne adresy w kodzie to `https://www.jw.org/finder?...` (celowo, otwieranie w JW Library). Brak CDN-ów, brak analityki, brak telemetrii — to bardzo dobre.
8. **`var` i `let` wciąż obecne** (38 × `var`), `"use strict"` w 57 miejscach. Kosmetyka, ale przy przejściu na moduły uporządkuje się samo.
9. **`JW-Study-3.63/` (25 MB) i `index.monolith-backup.html` (13,8 MB)** leżą w katalogu roboczym (całość: 770 MB, z czego `.git` 708 MB). Katalog 3.63 jest ignorowany przez gita (dobrze), ale backup nie.

---

## E. Weryfikacja twierdzeń z `AUDYT-5.0.md`

| Twierdzenie z AUDYT-5.0 | Wynik niezależnej kontroli |
|---|---|
| „Wszystkie 59 bloków skryptów zwalidowane natywnym JSC” | **POTWIERDZONE** — 59 bloków, wszystkie przechodzą `new Function(src)` w JavaScriptCore; `sw.js` i `search-worker.js` również |
| „Prawidłowy JSON manifest, komplet 5 ikon” | **POTWIERDZONE** (uwaga: maskowalna ikona to kopia zwykłej) |
| „14 bloków `<style>`, 100% zbalansowane nawiasy” | **POTWIERDZONE** — 14 bloków, 4757/4757 |
| „508 identyfikatorów HTML bez duplikatu” | **POTWIERDZONE** — 594 identyfikatory, zero duplikatów |
| „15/15 plików rdzenia `CORE` obecnych na dysku” | **POTWIERDZONE** — wszystkie 15 istnieją |
| „Pamięć podręczna `v535`” | **NIEAKTUALNE** — `sw.js` ma `v536` (raport opisuje stan sprzed commitu `a4bd1af`) |
| „Rygorystyczny `sanitize()`, parsowanie bezwładne” | **POTWIERDZONE** — biała lista tagów, `parsujBezwładnie`, biała lista kolorów, `data:image` bez SVG |
| „Anomalia 1: brak `#cenFloatTimerPct`/`#cenFloatTimerProgressFill`” | **NAPRAWIONE** — oba znaczniki są w HTML |
| „Anomalia 2: `getElementById("q")` zamiast `#search`” | **NIE POTWIERDZONA w obecnym kodzie** — `getElementById("q")` nie występuje ani razu, `id="q"` również nie istnieje |
| „Anomalia 3: ~500 linii martwego kodu mapy myśli” | **CZĘŚCIOWO** — pozostały 4 odwołania do `modalMapa` (nie ~500 linii, ale kod nadal jest) |
| „Etap II: wyprowadzenie OCR/PDF do `lib/`” | **NIEWYKONANE** — 8 bloków base64 nadal w `index.html` |
| Brak wzmianki o tokenie, `.git` 708 MB, martwym `supabase.js`, nieaktualnych testach | **PRZEOCZONE** — to nowe ustalenia tego raportu |

---

## F. Co jest zrobione dobrze (żeby tego nie zepsuć)

Warto to zapisać, bo jakość tych elementów jest wyraźnie powyżej średniej dla aplikacji jednoplikowej:

- **Sanityzacja:** `sanitize()` to biała lista realizowana przez przechodzenie po drzewie w dokumencie bezwładnym, a nie `innerHTML` (co zapobiega wykonaniu ładunku jeszcze przed filtrowaniem). Osobno sprawdzany kolor tła, osobna walidacja pól trafiających do atrybutów, `data:image` ograniczone do formatów rastrowych (jawnie wykluczone `svg+xml`).
- **Konsekwencja w wyświetlaniu:** przeszedłem 169 miejsc `innerHTML`; dane użytkownika są opakowywane w `esc()`/`appleEsc()`/`hilite()` — nie znalazłem niezakodowanego wstrzyknięcia o realnym ryzyku (jedyny kandydat: `delAt`, punkt D1).
- **CSP:** `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'none'`, `frame-src 'none'`, brak `'unsafe-eval'`. `'unsafe-inline'` jest nieuniknione w architekturze jednoplikowej — i uczciwie opisane w komentarzu.
- **Brak kodu dynamicznego:** `eval` 0, `new Function` 0, `setTimeout("string")` 0.
- **Biblioteki lokalnie, bez CDN** (świadoma decyzja opisana w kodzie) — brak zależności od cudzych serwerów, brak telemetrii.
- **Warstwa danych:** IndexedDB (5 magazynów), transakcje z oczekiwaniem na `oncomplete`, atomowy import zewnętrzny, ochrona przed `onblocked` z limitem czasu, komunikat o braku trwałego zapisu, kosz z 30-dniowym terminem, historia wersji notatek, odzyskiwanie szkicu.
- **Service worker:** poprawna wersja cache, „network first” dla dokumentów z natychmiastowym fallbackiem offline, `Promise.allSettled` przy prekaszowaniu (jeden brakujący plik nie psuje instalacji), sprzątanie starych cache przy aktywacji, **aktualizacja dopiero po zgodzie użytkownika** (bez `skipWaiting` w `install`).
- **Wydajność runtime:** OCR i wyszukiwanie pełnotekstowe w Web Workerach, wyszukiwanie porcjowane (interfejs pozostaje responsywny), indeks aktualizowany przyrostowo, `MediaSession` dla stopera.
- **Dostępność:** 17× `aria-modal`, 26× `role="dialog"`, 8× `aria-live`, 24 reguły `:focus-visible`, obsługa `prefers-reduced-motion` (11 miejsc), `lang="pl"`, obsługa `Escape`, przenoszenie fokusu (70 wywołań `.focus()`).

---

## G. Plan działania

### Natychmiast (dziś, < 30 minut, bez zmian w kodzie aplikacji)
1. **Odwołać token GitHub** i przestawić `origin` na SSH/`osxkeychain` (B1).
2. `git gc --aggressive --prune=now` (B3).
3. Usunąć `index.monolith-backup.html` z repo i z historii; dopisać go do `.gitignore` (B3).

### Etap I — szybkie, pewne (1 dzień)
4. Usunąć supabase z `CORE` w `sw.js`, plik `lib/supabase.js`, `supabase_schema.sql` i fragment `connect-src` w CSP; podnieść wersję cache (C1).
5. Usunąć `maximum-scale`/`user-scalable=no` z `viewport` i dodać `type="button"` tam, gdzie brakuje (D3, D4).
6. Zwalidować `delAt` w `sanitizeNote` (D1) i rozbić literał `<script>` w komentarzu (D2).
7. Naprawić/odsprzęgnąć asercję liczby bloków w `testy/regresja.js` i faktycznie uruchomić testy (B4).
8. Uporządkować wersje: jeden skrypt wydania podnoszący `APP_VERSION`, `CHANGELOG`, `CACHE` w `sw.js`; zarchiwizować stare `AKTUALIZACJA-*` i `AUDYT-*` (C6).

### Etap II — największy zysk (2–3 dni)
9. **Wyprowadzić 8 bibliotek z `index.html` do `./lib/`** i ładować je leniwie, dopiero gdy użytkownik użyje PDF/DOCX/OCR/JW Library (B2, C2). Cel: `index.html` poniżej 3,5 MB, poniżej 1,5 MB po gzipie. To także odchudzi każde przyszłe wydanie w gicie.
10. Zmierzyć efekt: rozmiar pliku, czas pierwszego malowania na iPadzie, pamięć przy imporcie skanu — i zapisać liczby w `AUDYT-5.1.md`.

### Etap III — architektura (świadoma decyzja, nie na siłę)
11. Rozbić monolityczny `index.html` na moduły ES + bundler; usunąć zdublowane definicje (`walk`, `norm`, `resetQueryCache`, `handleImportFile`) i zdublowane `var` stanu wyszukiwania (C3).
12. Zaktualizować pdf.js i pozostałe biblioteki do wspieranych wersji, z zapisem wersji w `lib/README.md` (C4).
13. Przenieść źródło GitHub Pages do podkatalogu, żeby testy i dokumentacja nie były publikowane (C5).

---

## H. Metryki kontrolne (stan na 19.10.2026)

```
index.html            14 452 523 B (13,78 MB), 59 094 linie, 6 327 274 B po gzip -9
  bloki <script>      59 wykonywalnych + 8 base64 + 1 "text/plain" (APPDATA 125 B)
  base64 w dokumencie 11,33 MB (8 bloków, 82% pliku)
  CSS                 14 bloków, 0,67 MB, 4757/4757 nawiasów
  funkcje            1271 deklaracji, 1262 unikalne
  innerHTML=         169   insertAdjacentHTML 4   document.write 2   eval 0
  identyfikatory     594, zero duplikatów
  localStorage       7 kluczy (stan UI), notatki w IndexedDB
sw.js                CACHE = 'jwstudy-' + scope + '-v536', CORE = 15 plików (wszystkie obecne)
testy                50/50 wg WYNIK.txt z 23.09.2026, wersja 3.56 — NIE przechodzą na 5.0
git                  .git 707,72 MiB, 564 obiekty luźne, in-pack 0, 119 commitów
                     104 wersje index.html w historii, największy blob 18 003 148 B (ZIP)
katalog roboczy      770 MB (w tym .git 708 MB, JW-Study-3.63 25 MB)
repo zdalne          publiczne, katalog główny = źródło GitHub Pages
```

**Odtworzenie pomiarów:** analiza statyczna skryptami Pythona, walidacja składni `osascript -l JavaScript` (`new Function(src)`), sumy SHA-256 (`shasum -a 256`), `git count-objects -vH`, `git rev-list --objects --all`, API GitHuba (`/repos/Skarzynski76/Jw-Study-5.0/contents/`). Komendy i skrypty pomocnicze nie zostały zapisane w katalogu aplikacji.
