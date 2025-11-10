// =======================================================
// DALL-E 3 Image Generator Frontend
// Wersja z debugowaniem i obsługą RS256 Firebase idToken
// =======================================================

// Jeśli używasz modular Firebase SDK:
import { getAuth } from "firebase/auth";

console.log('✅ image-generator.js loaded');

// ==================== Pomocnicze funkcje ====================

// Base64URL decode + parse JSON
function b64UrlDecodeJson(str) {
  try {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const decoded = atob(str);
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

// Uniwersalna funkcja do wyświetlania statusów w UI
function showGenerateMessage(message, type) {
  const generateStatus = document.getElementById('generateStatus');
  if (!generateStatus) {
    console.warn('⚠️ generateStatus element not found');
    return;
  }

  if (!message) {
    generateStatus.innerHTML = '';
    return;
  }

  let className = 'generate-message';
  if (type === 'error') className += ' error';
  if (type === 'success') className += ' success';
  if (type === 'info') className += ' info';

  generateStatus.innerHTML = `<div class="${className}">${message}</div>`;

  if (type !== 'info') {
    setTimeout(() => {
      if (generateStatus.innerHTML.includes(message)) {
        generateStatus.innerHTML = '';
      }
    }, 5000);
  }
}

// ==================== Token Handling ====================

async function fetchFreshIdTokenOrFail() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Brak zalogowanego użytkownika. Zaloguj się najpierw.");
    }

    const idToken = await user.getIdToken(true);
    console.log("🔑 DEBUG FRONT token snippet:", idToken ? idToken.slice(0, 60) : "NO_TOKEN");

    if (!idToken) {
      throw new Error("Nie udało się pobrać tokena użytkownika.");
    }

    // Sprawdź algorytm w nagłówku JWT
    const parts = idToken.split('.');
    if (parts.length < 2) {
      throw new Error("Token ma błędny format.");
    }

    const header = b64UrlDecodeJson(parts[0]);
    console.log("📄 DEBUG FRONT token header:", header);

    if (header && header.alg && header.alg.toUpperCase().startsWith('HS')) {
      throw new Error("Otrzymano niewłaściwy token (HS256). Użyj Firebase idToken (RS256).");
    }

    return idToken;

  } catch (err) {
    console.error("❌ Token fetch error:", err);
    showGenerateMessage(`❌ Błąd tokena: ${err.message}`, 'error');
    return null;
  }
}

// ==================== Główny kod po załadowaniu strony ====================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOMContentLoaded — inicjalizuję image-generator.js");

  const btnSelectors = [
    "#generateFromTagsBtn",
    ".generate-from-tags-btn",
    "[data-action='generate-from-tags']"
  ];

  let generateBtn = null;
  for (const sel of btnSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      generateBtn = el;
      break;
    }
  }

  if (!generateBtn) {
    console.error("❌ Nie znaleziono przycisku generowania (generateFromTagsBtn).");
    showGenerateMessage("❌ Błąd: nie znaleziono przycisku generowania w DOM.", 'error');
    return;
  }

  console.log("✅ Znaleziono przycisk generowania:", generateBtn);

  generateBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log("🖱️ Kliknięto przycisk generowania");

    const promptEl = document.getElementById('promptPreview');
    const prompt = promptEl ? promptEl.value.trim() : "";

    if (!prompt) {
      showGenerateMessage('❌ Prompt jest pusty!', 'error');
      return;
    }

    if (prompt.length < 10) {
      showGenerateMessage('❌ Prompt jest za krótki. Minimum 10 znaków.', 'error');
      return;
    }

    generateBtn.disabled = true;
    const spinner = document.getElementById('generateLoadingSpinner');
    spinner?.classList.add('show');
    showGenerateMessage('🎨 Generowanie obrazu... (może potrwać do 30s)', 'info');

    try {
      // Pobierz token
      const token = await fetchFreshIdTokenOrFail();
      if (!token) {
        generateBtn.disabled = false;
        spinner?.classList.remove('show');
        return;
      }

      console.log("📤 Wysyłam request do backendu...");

      const res = await fetch('/api/GenerateImage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt,
          size: document.getElementById('sizeSelect')?.value || '1024x1024',
          quality: document.getElementById('qualitySelect')?.value || 'standard',
          style: document.getElementById('styleSelect')?.value || 'vivid'
        })
      });

      console.log("📥 Odpowiedź serwera:", res.status);

      if (!res.ok) {
        const text = await res.text();
        console.error("❌ Backend error:", res.status, text);

        if (res.status === 401 && text.includes('INVALID_TOKEN_TYPE')) {
          showGenerateMessage('❌ Nieprawidłowy typ tokena (HS256). Zaloguj się ponownie.', 'error');
        } else if (res.status === 401) {
          showGenerateMessage('❌ Błąd autoryzacji. Sprawdź ustawienia Firebase w Azure.', 'error');
        } else {
          showGenerateMessage(`❌ Błąd serwera: ${res.status}`, 'error');
        }
        return;
      }

      const data = await res.json();
      console.log("✅ Odpowiedź z backendu:", data);

      if (data && data.image_url) {
        const generatedImage = document.getElementById('generatedImage');
        generatedImage.src = data.image_url;
        generatedImage.onload = () => {
          spinner?.classList.remove('show');
          showGenerateMessage('✅ Obraz wygenerowany pomyślnie!', 'success');
          document.getElementById('generatedImageResult')?.style?.setProperty('display', 'block');
        };

        // Revised prompt
        if (data.revised_prompt && data.revised_prompt !== prompt) {
          const revisedPromptSection = document.getElementById('revisedPromptSection');
          const revisedPromptText = document.getElementById('revisedPromptText');
          if (revisedPromptText && revisedPromptSection) {
            revisedPromptText.textContent = data.revised_prompt;
            revisedPromptSection.style.display = 'block';
          }
        }

      } else {
        showGenerateMessage('❌ Serwer nie zwrócił adresu obrazu.', 'error');
      }

    } catch (err) {
      console.error("💥 Błąd podczas generowania:", err);
      showGenerateMessage(`❌ Błąd: ${err.message}`, 'error');
    } finally {
      generateBtn.disabled = false;
      spinner?.classList.remove('show');
    }
  });
});

// ==================== Pobieranie obrazu ====================

async function downloadGeneratedImage(imageUrl) {
  try {
    showGenerateMessage('⬇️ Pobieranie obrazu...', 'info');
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dall-e-generated-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    showGenerateMessage('✅ Obraz pobrany!', 'success');
  } catch (error) {
    console.error('❌ Błąd pobierania obrazu:', error);
    showGenerateMessage('❌ Błąd pobierania obrazu', 'error');
  }
}

console.log('🟢 image-generator.js w pełni załadowany');
