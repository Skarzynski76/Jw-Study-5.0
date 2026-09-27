# Wydanie 3.36

JW Study 3.36 — naprawa importu PDF, Word i OCR

PRZYCZYNA BŁĘDU ZE ZRZUTU
Wskazany plik https://skarzynski76.github.io/JW-Study-3.1/lib/smart-import/pdf.worker.min.js zwracał HTTP 404 podczas sprawdzania 17.09.2026. PDF.js nie mógł uruchomić ani zwykłego, ani awaryjnego workera.

CO ZMIENIONO
Biblioteki PDF.js (wraz z workerem), Mammoth, JSZip, Tesseract, silnik WebAssembly i polski model OCR są teraz wbudowane w index.html. Import PDF, DOCX i obrazów nie pobiera ich z katalogu lib ani z zewnętrznych serwerów. Rozpoznawanie pozostaje lokalne.
Dodano przyciski „Zdjęcie / zrzut ekranu” i „Wklej zrzut ze schowka”. Wklejanie zależy od obsługi schowka i zgody przeglądarki; wybór zapisanego obrazu działa bez dostępu do schowka.
Zachowano edycję treści przed zapisem, wykrywanie typu po zawartości i dokładny OCR wszystkich stron PDF oraz ilustracji DOCX.
Zmieniono numer wersji na 3.36 oraz pamięć podręczną aplikacji.
Pliki zachowują prawidłowe rozszerzenia. Paczka ma .zip, strona index.html, skrypty .js. Nie dopisano do nich .json. Istniejące kopie danych w formacie JSON nadal pozostają kopiami JSON.

JAK WGRYWAĆ
1. Zapisz kopię swoich notatek z działającej aplikacji.
2. Rozpakuj JW-Study-3.36.zip.
3. W dotychczasowym repozytorium i katalogu publikowanym przez GitHub Pages podmień zawartość na pliki z katalogu JW-Study-3.36. Nie twórz dodatkowego katalogu 3.36 wewnątrz obecnej strony. Szczególnie ważne: podmień index.html i sw.js. Wgraj także pozostałe pliki; inne funkcje aplikacji, np. import JW Library, nadal korzystają z lib.
4. Poczekaj na zakończenie publikacji GitHub Pages. Otwórz dotychczasowy adres strony z internetem, opcjonalnie z końcówką ?v=3.36. Jeśli pojawi się propozycja aktualizacji, zaakceptuj ją. Zamknij i otwórz aplikację ponownie.
5. Przy logo wewnątrz strony musi być v3.36. Nazwa starej ikony na ekranie głównym iPada może się nie zmienić — nie jest potwierdzeniem wersji kodu.
Nie usuwaj danych witryny Safari ani aplikacji z danymi: tam mogą być przechowywane Twoje notatki. Ta paczka nie została automatycznie opublikowana na Twoim hostingu.

JAK IMPORTOWAĆ
Plik → Inteligentny import → wybierz dokument lub „Zdjęcie / zrzut ekranu” → Rozpoznaj i pokaż podgląd → sprawdź i popraw treść → Dodaj wybrane notatki.
Jeśli PDF ma tylko fragment tekstu, zaznacz „Dokładny OCR”. Ta opcja rozpoznaje również tekst ilustracji w DOCX.
Obsługiwane: PDF, DOCX, PNG, JPG/JPEG, WEBP. Stary binarny Word .doc trzeba zapisać jako DOCX w Wordzie. HEIC wymaga konwersji do JPEG lub PNG.

TESTY
26/26 testów regresji.
Test przeglądarkowy z serwerem celowo zwracającym 404 dla katalogu lib i zewnętrznego JSZip: PDF tekstowy, DOCX, OCR obrazu, skanowany PDF, OCR ilustracji DOCX, poprawka treści i zapis pięciu notatek — PASS.
Osobno wybór obrazu nowym przyciskiem przez okno plików, OCR i zapis nowej notatki przez interfejs — PASS.
Testy wykonano w przeglądarce Codex oraz w Safari na Macu. W Safari potwierdzono pięć rodzajów importu, edycję i zapis, zachowanie pięciu notatek po odświeżeniu oraz brak duplikatów po ponownym imporcie. Nie potwierdzono działania na fizycznym iPadzie; nie testowano schowka systemowego iPada.
Kontrola strony online 17.09.2026: pod adresem https://skarzynski76.github.io/JW-Study-3.1/ nadal widniała wersja v3.24, bez wbudowanej biblioteki PDF. Wersję 3.36 trzeba wdrożyć na ten hosting.

Zrzut zgłoszonego błędu dostarczono osobno jako zrzut-bledu-3.36.png. Nie należy go publikować na hostingu razem z aplikacją.
