# JW-Study 5.0

> Zaawansowana, w pełni autonomiczna aplikacja Progressive Web App (PWA) przeznaczona do osobistego studium Pisma Świętego, przygotowywania zebrań i przemówień, tworzenia uporządkowanych notatek oraz wygodnego zarządzania materiałami multimedialnymi.

[![Wersja](https://img.shields.io/badge/wersja-5.0-blue.svg)](file:///Users/grzegorzskarzynski/Desktop/Aplikacja%20JW%20/JW-Study-5.0/WERSJA)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline--First-success.svg)](file:///Users/grzegorzskarzynski/Desktop/Aplikacja%20JW%20/JW-Study-5.0/sw.js)
[![Platformy](https://img.shields.io/badge/platformy-iPadOS%20%7C%20macOS%20%7C%20iOS%20%7C%20Windows%20%7C%20Android-informational.svg)](file:///Users/grzegorzskarzynski/Desktop/Aplikacja%20JW%20/JW-Study-5.0/manifest.webmanifest)
[![Prywatność](https://img.shields.io/badge/dane-100%25%20lokalne%20(IndexedDB)-green.svg)](file:///Users/grzegorzskarzynski/Desktop/Aplikacja%20JW%20/JW-Study-5.0/index.html)

---

## Spis treści
- [Główne możliwości](#główne-możliwości)
- [Optymalizacje dla iPadOS i środowiska Apple](#optymalizacje-dla-ipados-i-środowiska-apple)
- [Architektura techniczna](#architektura-techniczna)
- [Prywatność i bezpieczeństwo](#prywatność-i-bezpieczeństwo)
- [Struktura projektu](#struktura-projektu)
- [Instalacja i uruchomienie](#instalacja-i-uruchomienie)
- [Dokumentacja i historia wydań](#dokumentacja-i-historia-wydań)

---

## Główne możliwości

### 1. Inteligentny edytor notatek
- **Zaawansowane formatowanie:** nagłówki, listy numerowane i punktowane, listy zadań (checkboxy), cytaty biblijne, tabele, wyróżnienia kolorystyczne i malarz formatów.
- **Inteligentna wielka litera:** automatyczne podnoszenie pierwszej litery po kropce, pytajniku, wykrzykniku i znaku nowej linii, z uwzględnieniem filtrów popularnych polskich skrótów teokratycznych i językowych (np., tzn., itd., m.in., wg, rozdz., wers., ks., itp.).
- **Automatyczne czyszczenie tekstu (Anty-Mojibake):** inteligentne wykrywanie i naprawa zniekształconych znaków diakrytycznych oraz encji UTF-8/Windows-1250 podczas wklejania treści ze schowka (np. z asystentów AI lub aplikacji zewnętrznych).
- **Spis nagłówków i biblioteka fragmentów:** szybka nawigacja po strukturze długich artykułów, zwijanie sekcji oraz biblioteka szablonów wielokrotnego użytku.

### 2. Zintegrowane odtwarzacze multimedialne
- **Ultrakompaktowy pasek audio MP3:**
  - Nowoczesny, wąski profil o wysokości około 4 linii tekstu (~74 px), oszczędzający przestrzeń roboczą ekranu.
  - Płynny pasek postępu, wskaźnik czasu, skok wstecz/wprzód, pauza/odtwarzanie oraz zmiana tempa odtwarzania (1x, 1.25x, 1.5x itd.).
  - Pełna responsywność na tabletach (iPad) i smartfonach.
- **Odtwarzacz wideo:**
  - Dedykowany moduł odtwarzania nagrań wideo z obsługą pełnoekranową i poprawnym kadrowaniem wewnątrz notatek.

### 3. Narzędzia do studium i organizacja
- **Centrum Studium:** zintegrowane plany czytania Biblii, w tym chronologiczny plan „Życie Jezusa na Ziemi”.
- **Organizacja notatek:** etykiety hierarchiczne, foldery tematyczne, przypinanie najważniejszych notatek, kosz i archiwum.
- **Błyskawiczne wyszukiwanie:** indeksowanie pełnotekstowe realizowane w osobnym wątku (`search-worker.js`), umożliwiające natychmiastowe filtrowanie tysięcy notatek bez blokowania interfejsu.

### 4. Inteligentny import i eksport
- **Import z JW Library:** bezpośrednie wczytywanie kopii zapasowych `.jwlibrary` (notatki, zakreślenia, zakładki).
- **Import dokumentów i zdjęć:** wsparcie dla plików PDF, DOCX oraz obrazów z lokalnym rozpoznawaniem tekstu OCR (Tesseract / WebAssembly – przetwarzanie odbywa się w całości na Twoim urządzeniu, bez wysyłania plików do sieci).
- **Bezpieczne kopie zapasowe:** pełny lub selektywny eksport notatek i etykiet do formatu JSON.

---

## Optymalizacje dla iPadOS i środowiska Apple

JW-Study 5.0 zawiera dedykowane usprawnienia dla użytkowników iPadów i komputerów Mac:
1. **Prawidłowe pozycjonowanie pod paskiem stanu (Safe Area Insets):**
   - Górny nagłówek i boczny pasek narzędzi uwzględniają zmienne środowiskowe `env(safe-area-inset-top)` oraz otrzymały dodatkowy bezpieczny odstęp (~22 px), dzięki czemu elementy interfejsu nie nakładają się na wskaźniki systemowe zegara, baterii i sieci w iPadOS.
2. **Ochrona przed blokowaniem klawiatury:**
   - Rozwiązano problem specyficzny dla silnika WebKit w iPadOS, gdzie po przełączeniu się do innej aplikacji (np. JW Library lub Safari) i powrocie do edycji notatki klawiatura ekranowa/zewnętrzna przestawała reagować.
   - Aplikacja automatycznie odświeża stan elementu aktywnego (`re-attach responder`), gwarantując natychmiastową gotowość do pisania bez konieczności ponownego zapisywania i otwierania notatki.
3. **Wsparcie dla gestów dotykowych i klawiatur zewnętrznych (Magic Keyboard / Smart Keyboard):**
   - Intuicyjne skróty klawiszowe, responsywne menu kontekstowe i płynne przewijanie z akceleracją sprzętową.

---

## Architektura techniczna

```
                    ┌────────────────────────────────────────┐
                    │          Interfejs Użytkownika         │
                    │   (HTML5, CSS3, ES2024, Responsive)    │
                    └───────────────────┬────────────────────┘
                                        │
                    ┌───────────────────┴────────────────────┐
                    │             Service Worker             │
                    │        (Offline-First Cache v584)       │
                    └─────────┬────────────────────┬─────────┘
                              │                    │
              ┌───────────────┴──────┐      ┌──────┴───────────────┐
              │      IndexedDB       │      │   Web Workers & WASM │
              │ (Notatki, Szablony,  │      │ (Wyszukiwanie w tle, │
              │  Załączniki, Media)  │      │  OCR Tesseract, SQL) │
              └──────────────────────┘      └──────────────────────┘
```

- **Offline-First:** Cała aplikacja działa bez aktywnego połączenia z internetem dzięki rejestracji Service Workera buforującego niezbędne skrypty, szablony i style.
- **Brak zewnętrznych zależności CDN:** Wszystkie kluczowe biblioteki (PDF.js, Tesseract WASM, Mammoth, JSZip) są wbudowane lokalnie w aplikację.
- **Lokalna baza IndexedDB:** Zapewnia natychmiastowy odczyt i zapis nawet przy dziesiątkach tysięcy notatek.

---

## Prywatność i bezpieczeństwo

- **100% Prywatności:** Twoje notatki, przemyślenia i nagrania nigdy nie opuszczają Twojego urządzenia. Aplikacja nie posiada serwera zbierającego dane, nie używa zewnętrznych skryptów śledzących ani analitycznych.
- **Bezpieczne repozytorium:** Konfiguracja repozytorium i mechanizm wdrożenia nie przechowują tokenów ani haseł w plikach konfiguracyjnych – autoryzacja odbywa się za pośrednictwem bezpiecznego menedżera poświadczeń systemu.

---

## Struktura projektu

```
JW-Study-5.0/
├── index.html               # Główny interfejs aplikacji i logika modułów
├── sw.js                    # Service Worker (zarządzanie pamięcią offline)
├── search-worker.js         # Wielowątkowy worker wyszukiwarki pełnotekstowej
├── manifest.webmanifest     # Konfiguracja PWA dla urządzeń mobilnych i desktop
├── jesus-plan-data.js       # Dane planu studium życia Jezusa
├── WERSJA                   # Aktualny identyfikator wydania (5.0)
├── lib/                     # Biblioteki narzędziowe (OCR, SQLite, parsery)
├── docs/                    # Dokumentacja techniczna i instrukcje
│   ├── WYDANIE.md           # Procedura wdrażania wydań na hosting
│   ├── audyty/              # Raporty audytów bezpieczeństwa i jakości kodu
│   └── archiwalne/          # Archiwalne notatki wydań i wersje historyczne
└── testy/                   # Skrypty testowe i weryfikacja regresji
```

---

## Instalacja i uruchomienie

### Bezpośrednio w przeglądarce
Wystarczy otworzyć adres wdrożonej aplikacji w dowolnej nowoczesnej przeglądarce (Safari, Chrome, Edge, Firefox).

### Na iPadzie i iPhonie (PWA na ekranie początkowym)
1. Otwórz stronę aplikacji w przeglądarce **Safari**.
2. Kliknij ikonę **Udostępnij** (kwadrat ze strzałką w górę).
3. Wybierz opcję **„Do ekranu początkowego”** (Add to Home Screen).
4. Kliknij **Dodaj** – aplikacja uruchamia się w dedykowanym oknie bez pasków przeglądarki, z pełnym wsparciem offline.

### Na komputerze Mac
1. W Safari wybierz menu **Plik → Dodaj do Docka...**
2. W Chrome/Edge kliknij ikonę instalacji w pasku adresu (po prawej stronie).

---

## Dokumentacja i historia wydań

- Pełna historia zmian znajduje się w pliku [CHANGELOG.md](file:///Users/grzegorzskarzynski/Desktop/Aplikacja%20JW%20/JW-Study-5.0/CHANGELOG.md).
- Instrukcje wdrażania wydań opisano w [docs/WYDANIE.md](file:///Users/grzegorzskarzynski/Desktop/Aplikacja%20JW%20/JW-Study-5.0/docs/WYDANIE.md).
- Raporty z przeprowadzonych audytów znajdują się w katalogu [docs/audyty/](file:///Users/grzegorzskarzynski/Desktop/Aplikacja%20JW%20/JW-Study-5.0/docs/audyty/).
