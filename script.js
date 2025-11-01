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
const langPL = document.getElementById('langPL');
const langEN = document.getElementById('langEN');

// Language state
let currentLanguage = 'pl';
let originalCaption = '';
let originalTags = [];

// Translation function
async function translateText(text, targetLang) {
    try {
        const token = await getUserToken();
        
        const response = await fetch('/api/TranslateText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({
                text: text,
                targetLanguage: targetLang
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.translation;
        } else {
            console.error('Translation failed');
            return text;
        }
    } catch (error) {
        console.error('Translation error:', error);
        return text;
    }
}

// Update results display with translation
async function updateResultsDisplay(lang) {
    if (!originalCaption && !originalTags.length) return;

    loadingSpinner.classList.add('show');
    statusDiv.textContent = lang === 'pl' ? '🔄 Tłumaczenie na polski...' : '🔄 Translating to English...';

    try {
        // Translate caption
        const translatedCaption = await translateText(originalCaption, lang);
        captionText.textContent = translatedCaption;

        // Translate tags
        tagsContainer.innerHTML = '';
        for (let i = 0; i < originalTags.length; i++) {
            const translatedTag = await translateText(originalTags[i], lang);
            const tagElement = document.createElement('div');
            tagElement.className = 'tag';
            tagElement.textContent = translatedTag;
            tagElement.style.animationDelay = `${i * 0.05}s`;
            tagsContainer.appendChild(tagElement);
        }

        statusDiv.textContent = '✅ Analiza zakończona pomyślnie!';
    } catch (error) {
        console.error('Display update error:', error);
        statusDiv.textContent = '⚠️ Błąd tłumaczenia';
    } finally {
        loadingSpinner.classList.remove('show');
    }
}

// File selection handler
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedFile.textContent = `📁 ${file.name}`;
        selectedFile.classList.add('show');
        
        // Preview the image
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Click on upload area to open file dialog
uploadArea.addEventListener('click', () => {
    imageInput.click();
});

// Drag & Drop handlers
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
        selectedFile.textContent = `📁 ${file.name}`;
        selectedFile.classList.add('show');
        
        // Preview the image
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        alert('Proszę wybrać plik JPG lub PNG!');
    }
});

// Image analysis handler
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
        // Get user token for authenticated requests
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
            
            // Store original English results
            originalCaption = data.caption || 'No description';
            originalTags = data.tags || [];

            // Display in current language
            if (currentLanguage === 'pl') {
                // Translate to Polish
                const translatedCaption = await translateText(originalCaption, 'pl');
                captionText.textContent = translatedCaption;

                // Translate tags
                tagsContainer.innerHTML = '';
                for (let i = 0; i < originalTags.length; i++) {
                    const translatedTag = await translateText(originalTags[i], 'pl');
                    const tagElement = document.createElement('div');
                    tagElement.className = 'tag';
                    tagElement.textContent = translatedTag;
                    tagElement.style.animationDelay = `${i * 0.05}s`;
                    tagsContainer.appendChild(tagElement);
                }
            } else {
                // Display in English
                captionText.textContent = originalCaption;

                tagsContainer.innerHTML = '';
                originalTags.forEach((tag, index) => {
                    const tagElement = document.createElement('div');
                    tagElement.className = 'tag';
                    tagElement.textContent = tag;
                    tagElement.style.animationDelay = `${index * 0.05}s`;
                    tagsContainer.appendChild(tagElement);
                });
            }

            resultsContainer.classList.add('show');
            statusDiv.textContent = '✅ Analiza zakończona pomyślnie!';
            loadingSpinner.classList.remove('show');
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