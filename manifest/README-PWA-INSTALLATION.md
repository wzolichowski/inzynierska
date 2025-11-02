# 📱 PWA Icons & Manifest - Instrukcja instalacji

## 📦 Zawartość paczki

```
manifest/
├── manifest.json           # PWA manifest
├── service-worker.js       # Service Worker dla offline
├── favicon.ico            # Favicon dla starszych przeglądarek
└── assets/
    ├── icon-192x192.png       # Ikona PWA 192x192
    ├── icon-512x512.png       # Ikona PWA 512x512
    ├── apple-touch-icon.png   # Ikona iOS 180x180
    ├── favicon-32x32.png      # Favicon 32x32
    └── favicon-16x16.png      # Favicon 16x16
```

## 🚀 Instalacja

### Krok 1: Rozpakuj i umieść pliki

Wypakuj folder `manifest/` do głównego katalogu projektu:

```
Twój-Projekt/
├── index.html
├── styles.css
├── script.js
├── auth.js
├── firebase-config.js
├── manifest/              ← Wypakowany folder
│   ├── manifest.json
│   ├── service-worker.js
│   ├── favicon.ico
│   └── assets/
│       └── ... wszystkie ikony
└── api/
```

### Krok 2: Zaktualizuj index.html

W sekcji `<head>` dodaj:

```html
<!-- Favicon -->
<link rel="icon" type="image/png" sizes="32x32" href="/manifest/assets/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/manifest/assets/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/manifest/assets/apple-touch-icon.png">

<!-- PWA Manifest -->
<link rel="manifest" href="/manifest/manifest.json">

<!-- Theme Color -->
<meta name="theme-color" content="#667eea">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="AI Vision">
```

Przed zamknięciem `</body>` dodaj:

```html
<!-- Service Worker Registration -->
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/manifest/service-worker.js')
        .then(registration => console.log('✅ Service Worker zarejestrowany'))
        .catch(error => console.log('❌ Błąd rejestracji Service Worker:', error));
    });
  }
</script>
```

### Krok 3: Wdróż na Azure

Wypchnij zmiany do repozytorium GitHub:

```bash
git add .
git commit -m "Add PWA support with manifest and icons"
git push origin main
```

GitHub Actions automatycznie wdroży zmiany na Azure Static Web Apps.

## ✅ Weryfikacja

Po wdrożeniu sprawdź:

1. **Favicon** - Powinien wyświetlać się w zakładce przeglądarki
2. **PWA Install** - W Chrome/Edge pojawi się prompt instalacji
3. **Offline mode** - Aplikacja powinna działać bez internetu
4. **iOS Home Screen** - Możesz dodać aplikację do ekranu głównego

## 🔧 Dostosowanie

### Zmiana koloru motywu:

W `manifest/manifest.json` zmień:
```json
"theme_color": "#667eea"
```

### Zmiana nazwy aplikacji:

W `manifest/manifest.json` zmień:
```json
"name": "Twoja Nazwa Aplikacji"
```

## 📱 Testowanie PWA

1. Otwórz DevTools (F12)
2. Zakładka "Application" > "Manifest"
3. Sprawdź czy manifest się ładuje
4. Zakładka "Service Workers" - sprawdź czy SW jest aktywny

## 🆘 Rozwiązywanie problemów

**Problem**: Ikony się nie ładują
- Sprawdź ścieżki w `index.html` - muszą zaczynać się od `/manifest/assets/`

**Problem**: Service Worker się nie rejestruje
- Sprawdź konsolę przeglądarki (F12)
- Upewnij się, że ścieżka to `/manifest/service-worker.js`
- PWA wymaga HTTPS (Azure Static Web Apps dostarcza to automatycznie)

**Problem**: Brak promptu instalacji
- PWA wymaga HTTPS
- Manifest musi być poprawnie skonfigurowany
- W Chrome: chrome://flags/#bypass-app-banner-engagement-checks

---

✅ **Gotowe!** Twoja aplikacja jest teraz Progressive Web App! 🎉
