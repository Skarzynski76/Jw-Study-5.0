# Ogólny audyt JW Study 3.57

Data: 25.09.2026

## Wynik

Wersja 3.57 wprowadza inteligentną automatyczną wielką literę dla języka polskiego i przeszła pełną weryfikację integralności.

| Obszar | Wynik | Zakres kontroli |
|---|---:|---|
| Uruchomienie i składnia | PASS | składnia skryptów, zgodność `index.html`, `sw.js` i `WERSJA` |
| Autokorekta zdań | PASS | początek notatki, po `<br>`, po znakach `. ! ? …`, ochrona polskich skrótów |
| Zapis notatek | PASS | commit, abort, zapis atomowy, szkice i ochrona przed utratą danych |
| Edytor | PASS | Enter bez dziedziczenia stylu, zwarty wiersz, formaty, historia i korekta |
| PDF | PASS | tekst, podział stron, zwalnianie dokumentu i skany |
| Word | PASS | nagłówki, tabele, ilustracje i dzielenie dokumentu |
| OCR | PASS | lokalny worker, polski model, anulowanie i awarie rozpoznawania |
| JW Library | PASS | lokalne JSZip, sql.js, WebAssembly i atomowy import |
| Rozpoznawanie plików | PASS | typ według zawartości, błędne nazwy i starszy format `.doc` |
| Offline | PASS | kompletny rdzeń, wyszukiwarka, import, cache i odpowiedzi 404 |
| Wyszukiwanie | PASS | pełne wyniki oraz ciąg księga–rozdział–etykieta–publikacja |
| Wersety | PASS | pojedyncze wersety, zakresy i listy |
| Ilustracje | PASS | osadzanie, przenoszenie, podpis, obrót i zapis |
| Tabele | PASS | rozmiar, wiersze, kolumny, styl i łączenie komórek |
| Centrum studium | PASS | skala tekstu, układ responsywny i zakładki sekcji |
| Interfejs iPadOS | PASS | bezpieczna strefa, pełnoekranowy tytuł i pozycjonowanie pasków |

## Nowości w wersji 3.57

- **Automatyczna wielka litera po kropce i nowej linii:**
  - Dynamiczna detekcja początku zdania w węzłach tekstowych edytora `contenteditable`.
  - Obsługa podziałów linii `<br>`, nowych bloków oraz tekstu rozbitego znacznikami formatowania (`<b>`, `<span>`, `<i>`, `<mark>`).
  - Filtr polskich skrótów (`np.`, `tzn.`, `itd.`, `itp.`, `tzw.`, `m.in.`, `wg`, `godz.`, `w.`, `r.`, `art.`, `str.`, `ks.`, `św.` itp.) zapobiegający błędnemu powiększaniu liter po skrótach.
- **Opcja konfiguracyjna:**
  - Przełącznik w menu „Więcej” z synchronizacją z `localStorage` (`jw_autocap`).
- **Narzędzie porządkowania:**
  - Funkcja `✨ Uporządkuj polski tekst` została rozszerzona o wielkie litery na początku zdań.
