# AI Vision

Aplikacja webowa do analizy obrazów i generowania grafik z wykorzystaniem Azure Computer Vision i DALL-E 3.

## Funkcje

- **Analiza obrazów** - wykrywanie obiektów i generowanie opisów za pomocą Azure Computer Vision
- **Generowanie obrazów** - tworzenie grafik z DALL-E 3 na podstawie tagów z analizy
- **Historia** - zapisywanie i przeglądanie poprzednich analiz
- **Autoryzacja** - logowanie przez email/hasło lub Google

## Technologie

- Frontend: HTML, CSS, vanilla JavaScript (ES modules)
- Backend: Azure Functions (Python)
- Baza danych: Firebase Firestore
- Autoryzacja: Firebase Auth
- AI: Azure Computer Vision, Azure OpenAI (DALL-E 3)

## Jak uruchomić lokalnie

### Wymagania

- Node.js 18+
- Python 3.9+
- Konta: Azure, Firebase

### Instalacja

1. Sklonuj repozytorium
2. Skopiuj `firebase-config.template.js` → `firebase-config.js` i uzupełnij dane Firebase
3. Skopiuj `local.setting.template.json` → `local.settings.json` w folderze `api/` i uzupełnij klucze Azure
4. Zainstaluj zależności Python:
```bash
cd api
pip install -r requirements.txt
```

### Uruchomienie

Frontend:
```bash
npm install -g http-server
http-server
```

Backend (Azure Functions):
```bash
cd api
func start
```

## Deploy

Aplikacja jest skonfigurowana do automatycznego deploymentu na Azure Static Web Apps przez GitHub Actions.

## Licencja

MIT
