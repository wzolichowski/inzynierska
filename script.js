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
// Usunięto zmienne langPL i langEN

// Usunięto Language state
// Usunięto funkcję translateText
// Usunięto funkcję updateResultsDisplay

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
            
            // ZMODYFIKOWANY BLOK: Bezpośrednie wyświetlanie wyników (bez tłumaczenia)
            
            // 1. Wyświetl podpis
            captionText.textContent = data.caption || 'No description';

            // 2. Wyświetl tagi
            tagsContainer.innerHTML = '';
            const tags = data.tags || [];
            tags.forEach((tag, index) => {
                const tagElement = document.createElement('div');
                tagElement.className = 'tag';
                tagElement.textContent = tag;
                tagElement.style.animationDelay = `${index * 0.05}s`;
                tagsContainer.appendChild(tagElement);
            });
            
            // KONIEC ZMODYFIKOWANEGO BLOKU

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