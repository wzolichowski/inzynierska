// =========================================
// script.js
// =========================================

// Get DOM elements
const imageInput = document.getElementById('imageInput');
const uploadButton = document.getElementById('uploadButton');
const uploadArea = document.getElementById('uploadArea');
const selectedFile = document.getElementById('selectedFile');
const resultsContainer = document.getElementById('resultsContainer');
const captionText = document.getElementById('captionText');
const tagsContainer = document.getElementById('tagsContainer');
const statusDiv = document.getElementById('status');
const loadingSpinner = document.getElementById('loadingSpinner');
const imagePreview = document.getElementById('imagePreview');

console.log('script.js loaded');

// File selection handler
if (imageInput) {
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedFile.textContent = `📎 ${file.name}`;
            selectedFile.classList.add('show');
            
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

// Click on upload area to open file dialog
if (uploadArea) {
    uploadArea.addEventListener('click', (e) => {
        // Prevent if clicking on the file input or selected file text
        if (e.target === imageInput || e.target.closest('.selected-file')) {
            return;
        }
        imageInput.click();
    });
}

// Drag & Drop handlers
if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
            imageInput.files = e.dataTransfer.files;
            selectedFile.textContent = `📎 ${file.name}`;
            selectedFile.classList.add('show');
            
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            alert('Proszę wybrać plik JPG lub PNG!');
        }
    });
}

// Image analysis handler
if (uploadButton) {
    uploadButton.addEventListener('click', async () => {
        if (!currentUser) {
            showMessage('❌ Musisz być zalogowany, aby analizować obrazy!', 'error');
            return;
        }

        const file = imageInput.files[0];
        if (!file) {
            alert("Proszę wybrać plik!");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        uploadButton.disabled = true;
        loadingSpinner.classList.add('show');
        statusDiv.textContent = '🔄 Analizowanie obrazu...';
        resultsContainer.classList.remove('show');

        try {
            const token = await getUserToken();
            
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/AnalyzeImage', {
                method: 'POST',
                body: formData,
                headers: headers
            });

            if (response.ok) {
                const data = await response.json();
                
                captionText.textContent = data.caption || 'No description';

                tagsContainer.innerHTML = '';
                const tags = data.tags || [];
                tags.forEach((tag, index) => {
                    const tagElement = document.createElement('div');
                    tagElement.className = 'tag';
                    tagElement.textContent = tag;
                    tagElement.style.animationDelay = `${index * 0.05}s`;
                    tagsContainer.appendChild(tagElement);
                });

                resultsContainer.classList.add('show');
                statusDiv.textContent = '✅ Analiza zakończona pomyślnie!';
                loadingSpinner.classList.remove('show');
                
                // Store data for image generation
                storeAnalysisData(data.caption || 'No description', data.tags || []);
                
                // SAVE TO FIRESTORE
                try {
                    await db.collection('analyses').add({
                        userId: currentUser.uid,
                        userEmail: currentUser.email,
                        fileName: file.name,
                        caption: data.caption || 'No description',
                        tags: data.tags || [],
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        imagePreview: imagePreview.src
                    });
                    console.log('✅ Analiza zapisana do Firestore');
                } catch (dbError) {
                    console.error('❌ Błąd zapisu do Firestore:', dbError);
                }
                
            } else if (response.status === 401) {
                showMessage('❌ Sesja wygasła. Proszę zalogować się ponownie.', 'error');
                await auth.signOut();
            } else {
                const errorText = await response.text();
                statusDiv.innerHTML = `<div class="result-section error">❌ Błąd: ${errorText}</div>`;
                loadingSpinner.classList.remove('show');
            }

        } catch (error) {
            console.error('Błąd wysyłania:', error);
            statusDiv.innerHTML = `<div class="result-section error">❌ Błąd sieci: ${error.message}</div>`;
            loadingSpinner.classList.remove('show');
        } finally {
            uploadButton.disabled = false;
        }
    });
}

// Hero upload zone handler
const heroUploadZone = document.getElementById('heroUploadZone');
const heroImageInput = document.getElementById('heroImageInput');

if (heroUploadZone && heroImageInput) {
    // Click to upload
    heroUploadZone.addEventListener('click', () => {
        if (!currentUser) {
            document.getElementById('loginBtn').click();
        } else {
            heroImageInput.click();
        }
    });

    // Drag and drop
    heroUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        heroUploadZone.style.borderColor = '#764ba2';
        heroUploadZone.style.background = 'linear-gradient(135deg, #e8ebff 0%, #dde0ff 100%)';
    });

    heroUploadZone.addEventListener('dragleave', () => {
        heroUploadZone.style.borderColor = '#667eea';
        heroUploadZone.style.background = 'linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%)';
    });

    heroUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        heroUploadZone.style.borderColor = '#667eea';
        heroUploadZone.style.background = 'linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%)';
        
        if (!currentUser) {
            document.getElementById('loginBtn').click();
            return;
        }
        
        const file = e.dataTransfer.files[0];
        if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
            heroImageInput.files = e.dataTransfer.files;
            document.getElementById('imageInput').files = e.dataTransfer.files;
            document.getElementById('uploadButton').click();
        }
    });

    // File selected
    heroImageInput.addEventListener('change', (e) => {
        if (!currentUser) {
            document.getElementById('loginBtn').click();
            return;
        }
        
        const file = e.target.files[0];
        if (file) {
            document.getElementById('imageInput').files = heroImageInput.files;
            document.getElementById('uploadButton').click();
        }
    });
}

// =========================================
// 🎨 REVERSE ENGINEERING - Generate Image
// =========================================
const generateImageBtn = document.getElementById('generateImageBtn');
const generateLoadingSpinner = document.getElementById('generateLoadingSpinner');
const generateStatus = document.getElementById('generateStatus');
const generatedImageSection = document.getElementById('generatedImageSection');
const generatedImagePreview = document.getElementById('generatedImagePreview');
const generatedPrompt = document.getElementById('generatedPrompt');
const downloadGeneratedBtn = document.getElementById('downloadGeneratedBtn');

let currentCaption = '';
let currentTags = [];
let generatedImageUrl = '';

// Store caption and tags when analysis completes
function storeAnalysisData(caption, tags) {
    currentCaption = caption;
    currentTags = tags;
}

if (generateImageBtn) {
    generateImageBtn.addEventListener('click', async () => {
        if (!currentUser) {
            showMessage('❌ Musisz być zalogowany, aby generować obrazy!', 'error');
            return;
        }

        if (!currentCaption && currentTags.length === 0) {
            showMessage('❌ Najpierw przeanalizuj obraz!', 'error');
            return;
        }

        generateImageBtn.disabled = true;
        generateLoadingSpinner.classList.add('show');
        generateStatus.innerHTML = '<div class="info-message">🎨 Generowanie obrazu za pomocą DALL-E 3...<br><small>To może potrwać 10-30 sekund</small></div>';
        generatedImageSection.style.display = 'none';

        try {
            const token = await getUserToken();
            
            if (!token) {
                showMessage('❌ Błąd autoryzacji. Zaloguj się ponownie.', 'error');
                return;
            }

            const response = await fetch('/api/GenerateImage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    caption: currentCaption,
                    tags: currentTags
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                generatedImageUrl = data.image_url;
                generatedImagePreview.src = data.image_url;
                generatedPrompt.textContent = data.revised_prompt || data.original_prompt;
                
                generatedImageSection.style.display = 'block';
                generateStatus.innerHTML = '<div class="success-message">✅ Obraz wygenerowany pomyślnie!</div>';
                
                // Scroll to generated image
                setTimeout(() => {
                    generatedImageSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
                
            } else if (response.status === 401) {
                showMessage('❌ Sesja wygasła. Proszę zalogować się ponownie.', 'error');
                await auth.signOut();
            } else if (response.status === 429) {
                const errorText = await response.text();
                generateStatus.innerHTML = `<div class="error-message">⏳ ${errorText}</div>`;
            } else {
                const errorText = await response.text();
                generateStatus.innerHTML = `<div class="error-message">❌ Błąd: ${errorText}</div>`;
            }

        } catch (error) {
            console.error('Błąd generowania:', error);
            generateStatus.innerHTML = `<div class="error-message">❌ Błąd sieci: ${error.message}</div>`;
        } finally {
            generateImageBtn.disabled = false;
            generateLoadingSpinner.classList.remove('show');
            
            // Hide status after 5 seconds
            setTimeout(() => {
                const statusMsg = generateStatus.querySelector('.success-message, .info-message');
                if (statusMsg) {
                    generateStatus.innerHTML = '';
                }
            }, 5000);
        }
    });
}

// Download generated image
if (downloadGeneratedBtn) {
    downloadGeneratedBtn.addEventListener('click', async () => {
        if (!generatedImageUrl) {
            alert('Brak obrazu do pobrania');
            return;
        }

        try {
            // Fetch the image
            const response = await fetch(generatedImageUrl);
            const blob = await response.blob();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai-generated-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showMessage('✅ Obraz został pobrany!', 'success');
        } catch (error) {
            console.error('Błąd pobierania:', error);
            alert('Błąd pobierania obrazu. Spróbuj otworzyć w nowej karcie.');
        }
    });
}

console.log('script.js fully loaded');

// =========================================
// 🔐 ESC zamykanie modali (login / rejestracja)
// =========================================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');

    if (loginModal && loginModal.classList.contains('show')) {
      loginModal.classList.remove('show');
    }
    if (registerModal && registerModal.classList.contains('show')) {
      registerModal.classList.remove('show');
    }
  }
});