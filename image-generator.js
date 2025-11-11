// DALL-E 3 Image Generator - Generate from Tags

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
                
                // Show revised prompt
                if (data.revised_prompt && data.revised_prompt !== prompt) {
                    revisedPromptText.textContent = data.revised_prompt;
                    revisedPromptSection.style.display = 'block';
                } else {
                    revisedPromptSection.style.display = 'none';
                }
                
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
                // Nie wylogowuj automatycznie - może to być problem z konfiguracją backendu
                // await auth.signOut();
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

// Show messages for generate section
function showGenerateMessage(message, type) {
    if (generateStatus) {
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
}

console.log('image-generator.js fully loaded');