# Procedura Wydania i Wdrożenia — JW-Study 5.0

Ten dokument opisuje procedurę przygotowania, testowania oraz publikacji wydań aplikacji **JW-Study 5.0** na platformie GitHub Pages.

---

## 1. Zakres Wydania 5.0

Wydanie **JW-Study 5.0** integruje kluczowe usprawnienia architektury PWA, interfejsu i obsługi multimediów:
- **Kompaktowy odtwarzacz audio MP3:** odtwarzacz w formie paska o grubości ~4 linii tekstu (~74 px) z regulacją prędkości i responsywnym układem.
- **Dedykowany odtwarzacz wideo:** optymalizacja odtwarzania plików wideo na iPadach i komputerach stacjonarnych.
- **Obsługa specyfiki iPadOS:**
  - Ochrona przed zacinaniem klawiatury po powrocie z innych aplikacji (np. JW Library) – dynamiczne przywracanie fokusowania (`re-attach responder`).
  - Odpowiedni margines górny (`env(safe-area-inset-top)`) zapobiegający nakładaniu się paska menu na wskaźniki systemowe zegara, baterii i sieci Apple.
- **Filtr Anty-Mojibake:** automatyczne czyszczenie błędnie zdekodowanych polskich znaków diakrytycznych przy wklejaniu ze schowka.
- **Gotowość Offline-First:** pełne buforowanie aplikacji przez Service Worker, brak zewnętrznych zależności CDN blokowanych przy braku sieci.
- **Audyt bezpieczeństwa:** usunięcie poświadczeń z konfiguracji `.git/config` i wdrożenie globalnego menedżera poświadczeń.

---

## 2. Krok po kroku: Publikacja na GitHub Pages

### Krok 1: Weryfikacja plików i numeru wersji
Przed wdrożeniem upewnij się, że:
1. Plik `WERSJA` zawiera numer `5.0`.
2. W `manifest.webmanifest` nazwa aplikacji to `JW-Study 5.0`.
3. W pliku `sw.js` identyfikator pamięci podręcznej odpowiada bieżącemu wydaniu (np. `jw-study-cache-v584`).
4. Kod JavaScript w `index.html` nie zawiera błędów składniowych.

### Krok 2: Wypchnięcie zmian do repozytorium GitHub
Wszystkie zmiany publikowane są bezpośrednio do gałęzi `main`:
```bash
git add -A
git commit -m "Wydanie 5.0: Uporządkowanie dokumentacji i struktury projektu"
git push origin main
```
> [!NOTE]
> GitHub Pages automatycznie buduje i publikuje nową wersję w ciągu około 1–2 minut po zakończeniu operacji `push`.

---

## 3. Aktualizacja po stronie użytkownika (iPad / Mac / PC)

1. **Uruchomienie aplikacji:** Otwórz aplikację pod adresem hostingu GitHub Pages przy aktywnym połączeniu internetowym.
2. **Powiadomienie o aktualizacji:** Service Worker w tle wykryje nowy plik `sw.js` i pobierze zaktualizowane zasoby do nowej pamięci podręcznej. Na ekranie pojawi się komunikat o dostępności nowej wersji.
3. **Akceptacja aktualizacji:** Kliknij przycisk „Zaktualizuj” lub zamknij i ponownie otwórz aplikację PWA.
4. **Weryfikacja wersji:**
   - W stopce bocznego menu lub w oknie informacyjnym upewnij się, że wyświetlana jest wersja **5.0**.

> [!CAUTION]
> **Nigdy nie usuwaj danych witryny ani pamięci podręcznej przeglądarki Safari w Ustawieniach iOS w celu wymuszenia aktualizacji!**
> W pamięci lokalnej (IndexedDB) przechowywane są Twoje notatki, etykiety i materiały. Usunięcie danych witryny skasuje niezapisane w plikach kopie notatek. Do zaktualizowania kodu wystarczy zwykłe odświeżenie strony lub kliknięcie komunikatu o nowej wersji.

---

## 4. Wykonywanie kopii zapasowych przed aktualizacją

Przed każdą większą aktualizacją zaleca się pobranie kopii bezpieczeństwa:
1. W aplikacji przejdź do: **Menu → Kopia zapasowa / Eksport**.
2. Wybierz **Pełny eksport (JSON)**.
3. Zapisz plik w bezpiecznej lokalizacji (np. w aplikacji Pliki na iPadzie lub na dysku iCloud / Google Drive).
