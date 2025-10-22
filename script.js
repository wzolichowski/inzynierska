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

// File selection handler
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedFile.textContent = `📁 ${file.name}`;
        selectedFile.classList.add('show');
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
    } else {
        alert('Proszę wybrać plik JPG lub PNG!');
    }
});

// Image analysis handler
uploadButton.addEventListener('click', async () => {
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
        const response = await fetch('/api/AnalyzeImage', {
            method: 'POST',
            body: formData 
        });

        if (response.ok) {
            const data = await response.json();
            
            // Display caption
            captionText.textContent = data.caption || 'Brak opisu';

            // Display tags
            tagsContainer.innerHTML = '';
            if (data.tags && data.tags.length > 0) {
                data.tags.forEach((tag, index) => {
                    const tagElement = document.createElement('div');
                    tagElement.className = 'tag';
                    tagElement.textContent = tag;
                    tagElement.style.animationDelay = `${index * 0.05}s`;
                    tagsContainer.appendChild(tagElement);
                });
            } else {
                tagsContainer.innerHTML = '<p style="color: #999;">Nie wykryto żadnych tagów</p>';
            }

            resultsContainer.classList.add('show');
            statusDiv.textContent = '✅ Analiza zakończona pomyślnie!';
            loadingSpinner.classList.remove('show');
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