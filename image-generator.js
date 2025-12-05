// DALL-E 3 Image Generator - Generate from Tags

// Import utilities
import { showMessage } from './utils.js';

console.log('image-generator.js loaded');

// DOM Elements
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

// Generate image from tags handler
if (generateFromTagsBtn) {
    generateFromTagsBtn.addEventListener('click', async () => {
        if (!currentUser) {
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
        generateLoadingSpinner.classList.add('show');
        showGenerateMessage('🎨 Generowanie obrazu z DALL-E 3... To może potrwać do 30 sekund.', 'info');
        generatedImageResult.style.display = 'none';

        try {
            const token = await getUserToken();
            
            // Validate token before sending
            console.log('=== TOKEN DEBUG ===');
            console.log('Token length:', token ? token.length : 0);
            console.log('Token starts with eyJ:', token ? token.startsWith('eyJ') : false);
            
            if (!token) {
                showGenerateMessage('❌ Nie można pobrać tokenu autoryzacji!', 'error');
                generateFromTagsBtn.disabled = false;
                generateLoadingSpinner.classList.remove('show');
                return;
            }
            
            if (token.length < 500) {
                console.error('❌ Token too short:', token.length);
                showGenerateMessage('❌ Token autoryzacji jest nieprawidłowy. Zaloguj się ponownie.', 'error');
                generateFromTagsBtn.disabled = false;
                generateLoadingSpinner.classList.remove('show');
                return;
            }
            
            console.log('✅ Token validated, sending request...');
            console.log('Authorization header length:', `Bearer ${token}`.length);
            console.log('==================');

            // Send token ONLY in Authorization header (security best practice)
            const response = await fetch('/api/GenerateImage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    prompt: prompt,
                    size: sizeSelect.value,
                    quality: qualitySelect.value,
                    style: styleSelect.value
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Display generated image
                generatedImage.src = data.image_url;
                originalImagePreview.src = document.getElementById('imagePreview').src;
                
                generatedImage.onload = () => {
                    generatedImageResult.style.display = 'block';
                    generateLoadingSpinner.classList.remove('show');
                    showGenerateMessage('✅ Obraz wygenerowany pomyślnie!', 'success');
                    
                    // Scroll to result
                    setTimeout(() => {
                        generatedImageResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                };
                
                // Always hide revised prompt section (we use only tags, no modifications)
                revisedPromptSection.style.display = 'none';
                
                // Setup download button
                downloadGeneratedBtn.onclick = () => downloadGeneratedImage(data.image_url);
                
                // Setup generate again button
                generateAgainBtn.onclick = () => {
                    generatedImageResult.style.display = 'none';
                    showGenerateMessage('', '');
                    document.getElementById('generateFromTagsSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
                };
                
                // Save to Firestore
                try {
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
                        basedOnAnalysis: currentAnalysisData ? true : false,
                        originalFileName: currentAnalysisData ? currentAnalysisData.fileName : null,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('✅ Wygenerowany obraz zapisany do Firestore');
                } catch (dbError) {
                    console.error('❌ Błąd zapisu do Firestore:', dbError);
                }
                
            } else if (response.status === 401) {
                showGenerateMessage('❌ Błąd autoryzacji. Sprawdź czy Firebase secrets są w Azure Static Web App Configuration.', 'error');
                console.error('401 Unauthorized - sprawdź Application Settings w Azure Portal');
            } else {
                const errorText = await response.text();
                showGenerateMessage(`❌ Błąd: ${errorText}`, 'error');
                generateLoadingSpinner.classList.remove('show');
            }

        } catch (error) {
            console.error('Błąd generowania obrazu:', error);
            showGenerateMessage(`❌ Błąd sieci: ${error.message}`, 'error');
            generateLoadingSpinner.classList.remove('show');
        } finally {
            generateFromTagsBtn.disabled = false;
        }
    });
}

// Download generated image
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

// Show messages for generate section (XSS-safe)
function showGenerateMessage(message, type) {
    if (generateStatus) {
        if (!message) {
            generateStatus.innerHTML = '';
            return;
        }

        // Use utility function for safe message display
        showMessage(generateStatus, message, type);

        if (type !== 'info') {
            setTimeout(() => {
                // Check if message still exists before clearing
                if (generateStatus.firstChild) {
                    generateStatus.innerHTML = '';
                }
            }, 5000);
        }
    }
}

console.log('image-generator.js fully loaded');