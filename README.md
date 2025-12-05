# 🖼️ Image Analysis & Generation PWA

Aplikacja webowa do analizy obrazów z wykorzystaniem **Azure Computer Vision** oraz generowania nowych obrazów za pomocą **Azure OpenAI (DALL-E 3)**.

## 📋 Spis treści

- [Funkcjonalności](#-funkcjonalności)
- [Architektura](#-architektura)
- [Technologie](#-technologie)
- [Wymagania](#-wymagania)
- [Instalacja lokalna](#-instalacja-lokalna)
- [Konfiguracja](#-konfiguracja)
- [Struktura projektu](#-struktura-projektu)
- [API Endpoints](#-api-endpoints)
- [Bezpieczeństwo](#-bezpieczeństwo)
- [Deployment](#-deployment)
- [Rozwój](#-rozwój)

---

## ✨ Funkcjonalności

### Analiza Obrazów
- 📤 **Upload obrazów** (JPG, PNG) poprzez przeciągnięcie lub wybór pliku
- 🔍 **Analiza zawartości** obrazu za pomocą Azure Computer Vision
- 🏷️ **Automatyczne tagowanie** - rozpoznawanie obiektów, scen i konceptów
- 📝 **Generowanie opisów** - automatyczne tworzenie tekstowych opisów obrazów
- 💾 **Historia analiz** - zapisywanie i przeglądanie wcześniejszych analiz w Firestore

### Generowanie Obrazów (DALL-E 3)
- 🎨 **Generowanie obrazów** na podstawie tagów z analizy
- ✏️ **Edycja promptów** przed generowaniem
- ⚙️ **Konfiguracja parametrów**:
  - Rozmiar (1024x1024, 1792x1024, 1024x1792)
  - Jakość (standard, HD)
  - Styl (vivid, natural)
- ⬇️ **Pobieranie wygenerowanych obrazów**
- 💾 **Historia generacji** zapisywana w Firestore

### Autentykacja & Bezpieczeństwo
- 🔐 **Firebase Authentication** (email/hasło + Google OAuth)
- 🛡️ **Token-based authentication** dla API
- 👤 **Zarządzanie sesją użytkownika**
- 🔒 **Firestore Security Rules** dla danych użytkownika

### Progressive Web App (PWA)
- 📱 **Instalowalne** na urządzeniach mobilnych i desktopowych
- ⚡ **Szybkie ładowanie** dzięki Service Worker
- 🌐 **Działanie offline** (caching statycznych zasobów)
- 📲 **Web App Manifest** z ikoną i konfiguracją

---

## 🏗️ Architektura

```
┌─────────────────┐
│   Frontend PWA  │
│   (HTML/CSS/JS) │
└────────┬────────┘
         │ HTTPS
         ↓
┌─────────────────────────┐
│  Azure Static Web Apps  │
│  (Hosting + Routing)    │
└────────┬────────────────┘
         │
    ┌────┴────┐
    │         │
    ↓         ↓
┌─────────┐ ┌──────────────┐
│ Firebase│ │ Azure Fns    │
│  Auth   │ │ (Python 3.9) │
│Firestore│ └──────┬───────┘
└─────────┘        │
                   ↓
           ┌───────────────┐
           │ Azure Services│
           ├───────────────┤
           │ Computer      │
           │ Vision        │
           ├───────────────┤
           │ Azure OpenAI  │
           │ (DALL-E 3)    │
           └───────────────┘
```

### Przepływ danych

1. **Użytkownik loguje się** → Firebase Auth zwraca ID token
2. **Upload obrazu** → Frontend wysyła plik + token do `/api/AnalyzeImage`
3. **Azure Function** weryfikuje token i analizuje obraz (Computer Vision)
4. **Wyniki** są zapisywane w Firestore i wyświetlane użytkownikowi
5. **Generowanie obrazu** → Frontend wysyła prompt + token do `/api/GenerateImage`
6. **DALL-E 3** generuje obraz, URL zwracany do frontendu

---

## 🛠️ Technologie

### Frontend
- **HTML5** + **CSS3** (Flexbox, Grid, Animations)
- **Vanilla JavaScript** (ES6+: async/await, modules)
- **Firebase SDK 10.7.1** (Authentication + Firestore)
- **Service Worker** (PWA caching)

### Backend
- **Python 3.9**
- **Azure Functions** (serverless)
- **Azure Computer Vision API** (image analysis)
- **Azure OpenAI** (DALL-E 3 image generation)
- **Firebase REST API** (token verification)

### Infrastructure
- **Azure Static Web Apps** (hosting + CI/CD)
- **Azure Functions** (serverless backend)
- **Firebase** (authentication + database)
- **GitHub Actions** (automated deployment)

---

## 📦 Wymagania

### Dla developera (lokalnie)
- **Node.js** 18+ (opcjonalnie, dla live server)
- **Python 3.9+**
- **Azure Functions Core Tools** v4
- **Azure CLI**
- **Firebase CLI** (opcjonalnie)
- **Git**

### Konta i klucze API
- **Azure Subscription** (z dostępem do Computer Vision + Azure OpenAI)
- **Firebase Project** (z włączonym Auth + Firestore)
- **GitHub Account** (dla CI/CD)

---

## 🚀 Instalacja lokalna

### 1. Klonowanie repozytorium

```bash
git clone <repository-url>
cd inzynierska
```

### 2. Konfiguracja Firebase

Utwórz plik `firebase-config.js` (na podstawie template):

```bash
cp firebase-config.template.js firebase-config.js
```

Edytuj `firebase-config.js` i dodaj swoje dane Firebase:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 3. Konfiguracja Azure Functions (lokalnie)

Utwórz plik `api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "python",
    "AI_VISION_KEY": "your-computer-vision-key",
    "AI_VISION_ENDPOINT": "https://your-resource.cognitiveservices.azure.com/",
    "AZURE_OPENAI_KEY": "your-azure-openai-key",
    "AZURE_OPENAI_ENDPOINT": "https://your-resource.openai.azure.com/",
    "AZURE_OPENAI_DALLE_DEPLOYMENT": "dall-e-3",
    "AZURE_OPENAI_API_VERSION": "2024-02-01",
    "FIREBASE_API_KEY": "your-firebase-api-key",
    "FIREBASE_PROJECT_ID": "your-project-id"
  }
}
```

### 4. Instalacja zależności Python

```bash
cd api
python -m venv venv
source venv/bin/activate  # Linux/Mac
# lub
venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

### 5. Uruchomienie lokalnie

**Frontend** (z dowolnym HTTP serverem):
```bash
# Opcja 1: Python
python -m http.server 8080

# Opcja 2: Node.js
npx http-server -p 8080

# Opcja 3: Live Server (VS Code extension)
# Kliknij prawym na index.html → "Open with Live Server"
```

**Backend** (Azure Functions):
```bash
cd api
func start
```

Aplikacja będzie dostępna pod:
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:7071`

---

## ⚙️ Konfiguracja

### Zmienne środowiskowe (Azure Static Web Apps)

W Azure Portal → Static Web App → Configuration:

```
AI_VISION_KEY=<your-key>
AI_VISION_ENDPOINT=<your-endpoint>
AZURE_OPENAI_KEY=<your-key>
AZURE_OPENAI_ENDPOINT=<your-endpoint>
AZURE_OPENAI_DALLE_DEPLOYMENT=dall-e-3
AZURE_OPENAI_API_VERSION=2024-02-01
FIREBASE_API_KEY=<your-key>
FIREBASE_PROJECT_ID=<your-project-id>
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Analyses collection
    match /analyses/{analysisId} {
      allow read, write: if request.auth != null &&
                           request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }

    // Generated images collection
    match /generated_images/{imageId} {
      allow read, write: if request.auth != null &&
                           request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
  }
}
```

---

## 📁 Struktura projektu

```
inzynierska/
├── index.html              # Główna strona PWA
├── script.js               # Logika analizy obrazów
├── auth.js                 # Autoryzacja Firebase
├── history.js              # Historia analiz
├── image-generator.js      # Generowanie obrazów DALL-E
├── utils.js                # Wspólne funkcje
├── tooltip-mobile.js       # Obsługa tooltipów mobilnych
├── styles.css              # Style główne
├── dalle-styles.css        # Style dla DALL-E
├── firebase-config.template.js  # Szablon konfiguracji Firebase
├── firebase-config.js      # Konfiguracja (gitignored)
│
├── manifest/               # PWA manifest i Service Worker
│   ├── manifest.json
│   ├── service-worker.js
│   └── assets/
│       └── favicon.svg
│
├── api/                    # Azure Functions (Python)
│   ├── requirements.txt
│   ├── host.json
│   ├── shared/             # Wspólne moduły
│   │   ├── __init__.py
│   │   └── auth.py         # Weryfikacja Firebase token
│   ├── AnalyzeImage/
│   │   ├── __init__.py
│   │   └── function.json
│   ├── GenerateImage/
│   │   ├── __init__.py
│   │   └── function.json
│   └── TestConfig/
│       ├── __init__.py
│       └── function.json
│
└── .github/
    └── workflows/
        └── azure-static-web-apps.yml  # CI/CD pipeline
```

---

## 🔌 API Endpoints

### `POST /api/AnalyzeImage`

Analizuje obraz za pomocą Azure Computer Vision.

**Headers:**
```
Authorization: Bearer <firebase-id-token>
Content-Type: multipart/form-data
```

**Body:**
```
file: <image-file> (JPG/PNG, max 4MB)
```

**Response (200 OK):**
```json
{
  "filename": "example.jpg",
  "content_type": "image/jpeg",
  "caption": "a person holding a dog",
  "tags": ["dog", "person", "outdoor", "animal"],
  "tags_count": 4,
  "user_email": "user@example.com"
}
```

---

### `POST /api/GenerateImage`

Generuje obraz za pomocą DALL-E 3.

**Headers:**
```
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

**Body:**
```json
{
  "prompt": "a cute dog playing in a park",
  "size": "1024x1024",
  "quality": "standard",
  "style": "vivid"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "image_url": "https://...",
  "prompt": "a cute dog playing in a park",
  "revised_prompt": "...",
  "size": "1024x1024",
  "quality": "standard",
  "style": "vivid",
  "user_email": "user@example.com"
}
```

---

### `GET /api/TestConfig`

Testuje konfigurację zmiennych środowiskowych.

**Response (200 OK):**
```json
{
  "AI_VISION_KEY": true,
  "AI_VISION_ENDPOINT": true,
  "AZURE_OPENAI_KEY": true,
  "AZURE_OPENAI_ENDPOINT": true,
  "FIREBASE_API_KEY": true,
  "FIREBASE_PROJECT_ID": true
}
```

---

## 🔒 Bezpieczeństwo

### ✅ Zaimplementowane zabezpieczenia

1. **XSS Prevention**
   - Wszystkie `innerHTML` zamienione na `textContent` lub `createElement()`
   - Używanie `utils.js` dla bezpiecznego wyświetlania wiadomości

2. **Authentication**
   - Token-based auth (Firebase ID tokens)
   - Wspólny moduł `shared/auth.py` dla weryfikacji
   - Token tylko w `Authorization` header (usunięto z body)

3. **Input Validation**
   - Walidacja typów plików (MIME types)
   - Limity rozmiaru plików (4MB)
   - Walidacja długości promptów (max 1000 znaków)

4. **Firestore Security**
   - Rules ograniczające dostęp do własnych danych użytkownika
   - Timestamps kontrolowane przez serwer

5. **Error Handling**
   - Szczegółowe logowanie w Azure Functions
   - Brak wrażliwych danych w błędach zwracanych do klienta

### ⚠️ Rekomendacje dodatkowe

- Dodaj **rate limiting** do API endpoints
- Implementuj **CSRF protection**
- Rozważ **Content Security Policy (CSP)**
- Użyj **Azure Key Vault** dla sekretów
- Włącz **Application Insights** dla monitoringu

---

## 🚢 Deployment

### Azure Static Web Apps (automatyczny)

1. **Fork/Clone** repozytorium
2. **Utwórz Azure Static Web App** w Azure Portal
3. Połącz z **GitHub repository**
4. Skonfiguruj **workflow** (automatycznie utworzony)
5. Dodaj **zmienne środowiskowe** w Configuration
6. **Push** do brancha main → auto-deploy

### Workflow GitHub Actions

Plik `.github/workflows/azure-static-web-apps.yml` automatycznie:
- Buduje frontend
- Deployuje do Azure Static Web Apps
- Wdraża Azure Functions

---

## 🧪 Rozwój

### TODO Lista
- [ ] Kafelki po logowaniu (feature tiles)
- [ ] Lazy loading obrazów w historii
- [ ] Testy jednostkowe (pytest dla backend, Jest dla frontend)
- [ ] Rate limiting dla API
- [ ] WebP format dla obrazów
- [ ] Dark mode
- [ ] Eksport historii do CSV/JSON
- [ ] Integracja z innymi modelami AI

### Kontrybucje

Pull requesty są mile widziane! Przed utworzeniem PR:
1. Sprawdź czy issue już istnieje
2. Utwórz feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit zmian (`git commit -m 'Add AmazingFeature'`)
4. Push do brancha (`git push origin feature/AmazingFeature`)
5. Otwórz Pull Request

---

## 📄 Licencja

Projekt edukacyjny - praca inżynierska.

---

## 🙏 Podziękowania

- **Azure Computer Vision** - analiza obrazów
- **Azure OpenAI (DALL-E 3)** - generowanie obrazów
- **Firebase** - autentykacja i baza danych
- **Azure Static Web Apps** - hosting i deployment

---

## 📞 Kontakt

W razie pytań lub problemów, otwórz issue na GitHub.
