// image-generator.js (pełny plik)
// Zakładam, że masz zainicjalizowane Firebase w swoim projekcie i używasz modular SDK.
// Jeśli używasz namespaced SDK (window.firebase), poniżej są komentarze jak to dostosować.

import { getAuth } from "firebase/auth";

console.log('image-generator.js loaded');

// Helper: decode base64url header (returns parsed JSON or null)
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

// Fetch fresh idToken and verify header alg client-side
async function fetchFreshIdTokenOrFail() {
  try {
    // get user (modular)
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Brak zalogowanego użytkownika. Zaloguj się najpierw.");
    }

    // force refresh idToken
    const idToken = await user.getIdToken(true);
    console.log("DEBUG FRONT token snippet:", idToken ? idToken.slice(0,60) : "NO_TOKEN");

    if (!idToken || typeof idToken !== 'string') {
      throw new Error("Nie udało się pobrać tokena.");
    }

    const parts = idToken.split('.');
    if (parts.length < 2) {
      throw new Error("Token ma błędny format.");
    }

    const header = b64UrlDecodeJson(parts[0]);
    console.log("DEBUG FRONT token header:", header);

    if (header && header.alg && header.alg.toUpperCase().startsWith('HS')) {
      throw new Error("Otrzymano niewłaściwy token (HS256). Upewnij się, że wysyłasz Firebase idToken (getIdToken).");
    }

    return idToken;
  } catch (err) {
    console.error("Token fetch error:", err);
    // show message to user (function showGenerateMessage should be defined in your file)
    if (typeof showGenerateMessage === 'function') {
      showGenerateMessage(`❌ Błąd tokena: ${err.message}`, 'error');
    } else {
      alert(`Błąd tokena: ${err.message}`);
    }
    return null;
  }
}

// --- DOM elements used in generate flow (adjust IDs to your markup)
const generateFromTagsBtn = document.getElementById('generateFromTagsBtn');
const promptPreview = document.getElementById('promptPreview');
const sizeSelect = document.getElementById('sizeSelect');
const qualitySelect = document.getElementById('qualitySelect');
const styleSelect = document.getElementById('styleSelect');

const generatedImageResult = document.getElementById('generatedImageResult');
const generatedImage = document.getElementById('generatedImage');
const originalImagePreview = document.getElementById('originalImagePreview');
const downloadGeneratedBtn = document.getElementById('downloadGeneratedBtn');
const generateAgainBtn = document.getElementById('generateAgainBtn');
const revisedPromptSection = document.getElementById('revisedPromptSection');
const revisedPromptText = document.getElementById('revisedPromptText');
const generateLoadingSpinner = document.getElementById('generateLoadingSpinner');
const generateStatus = document.getElementById('generateStatus');

async function getUserToken() {
  // kept for compatibility; prefer fetchFreshIdTokenOrFail()
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
}

function showGenerateMessage(message, type) {
  if (!generateStatus) return;
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

// Handler for generate button
if (generateFromTagsBtn) {
  generateFromTagsBtn.addEventListener('click', async () => {
    if (!window.currentUser) {
      showGenerateMessage('❌ Musisz być zalogowany, aby generować obrazy!', 'error');
      return;
    }

    const prompt = promptPreview.value.trim();
    if (!prompt) {
      showGenerateMessage('❌ Prompt jest pusty!', 'error');
      return;
    }
    if (prompt.length < 10) {
      showGenerateMessage('❌ Prompt jest za krótki. Minimum 10 znaków.', 'error');
      return;
    }

    generateFromTagsBtn.disabled = true;
    generateLoadingSpinner?.classList.add('show');
    showGenerateMessage('🎨 Generowanie obrazu z DALL-E 3... To może potrwać do 30 sekund.', 'info');
    generatedImageResult.style.display = 'none';

    try {
      const token = await fetchFreshIdTokenOrFail();
      if (!token) {
        generateFromTagsBtn.disabled = false;
        generateLoadingSpinner?.classList.remove('show');
        return;
      }

      const response = await fetch('/api/GenerateImage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: prompt,
          size: sizeSelect?.value || '1024x1024',
          quality: qualitySelect?.value || 'standard',
          style: styleSelect?.value || 'vivid'
        })
      });

      if (response.ok) {
        const data = await response.json();

        // show image
        if (data && data.image_url) {
          generatedImage.src = data.image_url;
          originalImagePreview.src = document.getElementById('imagePreview')?.src || '';
          generatedImage.onload = () => {
            generatedImageResult.style.display = 'block';
            generateLoadingSpinner?.classList.remove('show');
            showGenerateMessage('✅ Obraz wygenerowany pomyślnie!', 'success');
            setTimeout(() => {
              generatedImageResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
          };

          if (data.revised_prompt && data.revised_prompt !== prompt) {
            revisedPromptText.textContent = data.revised_prompt;
            revisedPromptSection.style.display = 'block';
          } else {
            revisedPromptSection.style.display = 'none';
          }

          downloadGeneratedBtn.onclick = () => downloadGeneratedImage(data.image_url);
          generateAgainBtn.onclick = () => {
            generatedImageResult.style.display = 'none';
            showGenerateMessage('', '');
            document.getElementById('generateFromTagsSection')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          };

          // Optionally save to Firestore (if db available)
          try {
            if (window.db && window.currentUser) {
              await db.collection('generated_images').add({
                userId: currentUser.uid,
                userEmail: currentUser.email,
                prompt: prompt,
                revisedPrompt: data.revised_prompt,
                imageUrl: data.image_url,
                originalImageUrl: originalImagePreview.src,
                size: data.size,
                quality: data.quality,
                style: data.style,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
              });
              console.log('✅ Wygenerowany obraz zapisany do Firestore');
            }
          } catch (dbError) {
            console.error('❌ Błąd zapisu do Firestore:', dbError);
          }
        } else {
          showGenerateMessage('❌ Serwer nie zwrócił obrazu.', 'error');
          generateLoadingSpinner?.classList.remove('show');
        }

      } else if (response.status === 401) {
        const text = await response.text();
        console.error('401 from backend:', text);
        if (text && text.includes('INVALID_TOKEN_TYPE')) {
          showGenerateMessage('❌ Błąd autoryzacji: Niepoprawny typ tokena (HS256). Zaloguj się poprawnie.', 'error');
        } else {
          showGenerateMessage('❌ Błąd autoryzacji. Sprawdź ustawienia Firebase w Azure.', 'error');
        }
        generateLoadingSpinner?.classList.remove('show');

      } else {
        const errorText = await response.text();
        showGenerateMessage(`❌ Błąd: ${errorText}`, 'error');
        generateLoadingSpinner?.classList.remove('show');
      }

    } catch (error) {
      console.error('Błąd generowania obrazu:', error);
      showGenerateMessage(`❌ Błąd sieci: ${error.message}`, 'error');
      generateLoadingSpinner?.classList.remove('show');
    } finally {
      generateFromTagsBtn.disabled = false;
    }
  });
}

// Download util
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
    console.error('Błąd pobierania obrazu:', error);
    showGenerateMessage('❌ Błąd pobierania obrazu', 'error');
  }
}

console.log('image-generator.js fully loaded');
