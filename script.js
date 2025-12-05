// =========================================
// script.js
// =========================================

// Import utilities
import { showMessage, clearAllResults } from './utils.js';

// Clear results on page load/refresh
window.addEventListener('load', () => {
    const resultsContainer = document.getElementById('resultsContainer');
    const generateFromTagsSection = document.getElementById('generateFromTagsSection');
    const generatedImageResult = document.getElementById('generatedImageResult');
    const featuresSection = document.getElementById('featuresSection');
    
    // Hide all result sections
    if (resultsContainer) {
        resultsContainer.classList.remove('show');
    }
    if (generateFromTagsSection) {
        generateFromTagsSection.style.display = 'none';
    }
    if (generatedImageResult) {
        generatedImageResult.style.display = 'none';
    }
    
    // Show features section on page load if user is logged in
    // (auth.js will handle showing it after login)
    if (featuresSection && currentUser) {
        featuresSection.style.display = 'grid';
    }
    
    console.log('✅ Results cleared on page load');
});

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

// Store current analysis data
let currentAnalysisData = null;

// File selection handler
if (imageInput) {
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedFile.textContent = `📁 ${file.name}`;
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
            selectedFile.textContent = `📁 ${file.name}`;
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
            showMessage(statusDiv, '❌ Musisz być zalogowany, aby analizować obrazy!', 'error');
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
        
        // Hide generation section
        const generateFromTagsSection = document.getElementById('generateFromTagsSection');
        if (generateFromTagsSection) {
            generateFromTagsSection.style.display = 'none';
        }
        
        // Hide features section during analysis
        const featuresSection = document.getElementById('featuresSection');
        if (featuresSection) {
            featuresSection.style.display = 'none';
        }

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
                
                // Store analysis data
                currentAnalysisData = {
                    caption: data.caption || 'No description',
                    tags: data.tags || [],
                    fileName: file.name,
                    imagePreview: imagePreview.src
                };
                
                captionText.textContent = currentAnalysisData.caption;

                tagsContainer.innerHTML = '';
                currentAnalysisData.tags.forEach((tag, index) => {
                    const tagElement = document.createElement('div');
                    tagElement.className = 'tag';
                    tagElement.textContent = tag;
                    tagElement.style.animationDelay = `${index * 0.05}s`;
                    tagsContainer.appendChild(tagElement);
                });

                resultsContainer.classList.add('show');
                statusDiv.textContent = '✅ Analiza zakończona pomyślnie!';
                loadingSpinner.classList.remove('show');
                
                // Show "Generate from tags" section
                showGenerateFromTagsSection();
                
                // SAVE TO FIRESTORE
                try {
                    await db.collection('analyses').add({
                        userId: currentUser.uid,
                        userEmail: currentUser.email,
                        fileName: file.name,
                        caption: currentAnalysisData.caption,
                        tags: currentAnalysisData.tags,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        imagePreview: imagePreview.src
                    });
                    console.log('✅ Analiza zapisana do Firestore');
                } catch (dbError) {
                    console.error('❌ Błąd zapisu do Firestore:', dbError);
                }
                
            } else if (response.status === 401) {
                showMessage(statusDiv, '❌ Błąd autoryzacji. Sprawdź czy Firebase secrets są w Azure Configuration.', 'error');
                console.error('401 Unauthorized - sprawdź Application Settings w Azure Portal');
                // Nie wylogowuj automatycznie - może to być problem z konfiguracją backendu
                loadingSpinner.classList.remove('show');
            } else {
                const errorText = await response.text();
                // XSS-safe: use showMessage utility
                showMessage(statusDiv, `Błąd: ${errorText}`, 'error');
                loadingSpinner.classList.remove('show');
            }

        } catch (error) {
            console.error('Błąd wysyłania:', error);
            // XSS-safe: use showMessage utility
            showMessage(statusDiv, `Błąd sieci: ${error.message}`, 'error');
            loadingSpinner.classList.remove('show');
        } finally {
            uploadButton.disabled = false;
        }
    });
}

// Show "Generate from tags" section
function showGenerateFromTagsSection() {
    const generateFromTagsSection = document.getElementById('generateFromTagsSection');
    const promptPreview = document.getElementById('promptPreview');
    
    if (!generateFromTagsSection || !currentAnalysisData) return;
    
    // Create prompt from tags and caption
    const prompt = createPromptFromAnalysis(currentAnalysisData);
    promptPreview.value = prompt;
    
    // Show section with animation
    generateFromTagsSection.style.display = 'block';
    setTimeout(() => {
        generateFromTagsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 300);
    
    console.log('✅ Generate from tags section shown');
}

// Create prompt from analysis data - ONLY TAGS, NO MODIFICATIONS
function createPromptFromAnalysis(data) {
    // Use ONLY tags, comma-separated
    // No extra text, no "photorealistic", no modifications
    const topTags = data.tags.slice(0, 10).join(', ');
    
    // Return ONLY the tags
    return topTags;
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

console.log('script.js fully loaded');

// =========================================
// 🏠 LOGO CLICK - Clear results (like F5)
// =========================================
const navLogo = document.querySelector('.nav-logo');
if (navLogo) {
    navLogo.addEventListener('click', () => {
        const resultsContainer = document.getElementById('resultsContainer');
        const generateFromTagsSection = document.getElementById('generateFromTagsSection');
        const generatedImageResult = document.getElementById('generatedImageResult');
        const featuresSection = document.getElementById('featuresSection');
        
        // Hide all result sections
        if (resultsContainer) {
            resultsContainer.classList.remove('show');
        }
        if (generateFromTagsSection) {
            generateFromTagsSection.style.display = 'none';
        }
        if (generatedImageResult) {
            generatedImageResult.style.display = 'none';
        }
        
        // Show features section again if user is logged in
        if (featuresSection && currentUser) {
            featuresSection.style.display = 'grid';
        }
        
        // Clear file input
        const imageInput = document.getElementById('imageInput');
        const heroImageInput = document.getElementById('heroImageInput');
        const selectedFile = document.getElementById('selectedFile');
        
        if (imageInput) imageInput.value = '';
        if (heroImageInput) heroImageInput.value = '';
        if (selectedFile) {
            selectedFile.textContent = '';
            selectedFile.classList.remove('show');
        }
        
        // Clear analysis data
        currentAnalysisData = null;
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        console.log('✅ Results cleared by logo click');
    });
}

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