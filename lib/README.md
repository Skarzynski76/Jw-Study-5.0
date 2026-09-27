# Biblioteki do importu z JW Library

Te trzy pliki są **częścią aplikacji** i wgrywa się je razem z nią. Aplikacja
nie pobiera niczego z obcych serwerów — nie potrafi tego zrobić, bo polityka
bezpieczeństwa treści dopuszcza wyłącznie adresy z tego samego miejsca.

| Plik | Rozmiar | Do czego |
|---|---:|---|
| `jszip.min.js` | 95 kB | rozpakowuje archiwum `.jwlibrary` |
| `sql-wasm.js` | 45 kB | czyta bazę SQLite z jego wnętrza |
| `sql-wasm.wasm` | 644 kB | silnik bazy danych |

Potrzebne **wyłącznie przy imporcie z JW Library**. Notatki, kopie zapasowe
i przenoszenie z OneNote działają bez nich.

## Inteligentny import dokumentów

Katalog `smart-import/` zawiera PDF.js do dokumentów PDF, Mammoth do plików
DOCX oraz Tesseract z polskim modelem OCR do zdjęć i skanów. Ten katalog też
jest częścią aplikacji: wgrywaj go w całości na GitHub. Rozpoznawane dokumenty
nie są wysyłane do zewnętrznych usług.

## Skąd pochodzą

Z oficjalnego rejestru npm, czyli wprost od autorów bibliotek:

- **JSZip 3.10.1** — <https://www.npmjs.com/package/jszip>
- **sql.js 1.14.1** — <https://www.npmjs.com/package/sql.js>

Obie mają otwarty kod.

## Sumy kontrolne

Możesz sprawdzić, że pliki są dokładnie te, które tu opisano:

```bash
cd lib
for f in jszip.min.js sql-wasm.js sql-wasm.wasm; do
  printf "%-16s sha384-%s\n" "$f" "$(openssl dgst -sha384 -binary $f | openssl base64 -A)"
done
```

Powinno wypisać:

```
jszip.min.js     sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG
sql-wasm.js      sha384-4BFYB3flXPr2Z7nY58MEovqPlVDyWWBDlHTclbOjtPii317X+bu9vsbPUCkb//6+
sql-wasm.wasm    sha384-o013lO7BlkJf7tacsevpQiMi8GRMaF1YW/VO/Ep3M+KW19KyiKnflwvFf00bvRwQ
```

## Dlaczego nie z sieci

Do wersji 1.93 biblioteki pobierały się z cdnjs — od pierwszej wersji aplikacji,
po cichu. Ryzyko było niewielkie, ale realne: taki kod wykonuje się
**z dostępem do wszystkich notatek**, więc jego podmiana na serwerze albo po
drodze oznaczałaby dostęp do nich. W czerwcu 2024 zdarzyło się to naprawdę
innemu serwisowi tego typu (polyfill.io, ponad 110 000 stron).

Prościej i pewniej jest mieć te pliki u siebie.

## Aktualizacja

Nie jest potrzebna do działania. Gdybyś chciał nowsze wersje:

```bash
npm install jszip sql.js
cp node_modules/jszip/dist/jszip.min.js lib/
cp node_modules/sql.js/dist/sql-wasm.js lib/
cp node_modules/sql.js/dist/sql-wasm.wasm lib/
```
