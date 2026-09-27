# Ogólny audyt JW Study 3.56

Data: 23.09.2026

## Wynik

Wersja 3.56 przeszła **50 z 50 testów automatycznych**.

| Obszar | Wynik | Zakres kontroli |
|---|---:|---|
| Uruchomienie i składnia | PASS | składnia skryptów, zgodność `index.html`, `sw.js` i `WERSJA` |
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

## Kontrola strukturalna

- 212 identyfikatorów HTML, bez duplikatów.
- Brak zewnętrznych skryptów oraz zewnętrznych odwołań wykonywalnych w `src` i `href`.
- Manifest PWA jest poprawnym JSON-em, działa jako `standalone` i zawiera pięć ikon.
- Service worker wskazuje 18 ścieżek; wszystkie istnieją w paczce.
- Nie znaleziono pustych plików.
- `index.html`, `sw.js`, `WERSJA`, wyszukiwarka i lokalne biblioteki importu mają niepuste, zweryfikowane sumy SHA-256.

## Poprawka Enter

Edytor umieszcza podział wiersza poza aktywnymi znacznikami formatującymi. Prawa część istniejącego tekstu jest przenoszona do kopii tego samego znacznika, dlatego nie traci stylu. Punkt wpisywania nowej linii pozostaje pomiędzy znacznikami i zaczyna się zwykłym stylem.

## Granice audytu

Testy automatyczne obejmują logikę i rzeczywiste pliki testowe. Systemową klawiaturę, gesty, wygląd szkła iPadOS oraz zachowanie aplikacji po fizycznym odłączeniu sieci należy potwierdzić na iPadzie po publikacji.
