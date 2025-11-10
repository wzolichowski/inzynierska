// History Management

console.log('history.js loaded'); 

// DOM Elements
const historyBtn = document.getElementById('historyBtn');
const historyModal = document.getElementById('historyModal');
const closeHistory = document.getElementById('closeHistory');
const historyContainer = document.getElementById('historyContainer');
const historyList = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');
const historyLoading = document.getElementById('historyLoading');

// Show History Modal
if (historyBtn) {
    historyBtn.addEventListener('click', async () => {
        historyModal.classList.add('show');
        await loadHistory();
    });
}

// Close History Modal
if (closeHistory) {
    closeHistory.addEventListener('click', () => {
        historyModal.classList.remove('show');
    });
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === historyModal) {
        historyModal.classList.remove('show');
    }
});

// Load user's analysis history
async function loadHistory() {
    if (!currentUser) {
        console.error('No user logged in');
        return;
    }

    historyLoading.style.display = 'block';
    historyList.innerHTML = '';
    historyEmpty.style.display = 'none';

    try {
        const snapshot = await db.collection('analyses')
            .where('userId', '==', currentUser.uid)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        historyLoading.style.display = 'none';

        if (snapshot.empty) {
            historyEmpty.style.display = 'block';
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const historyItem = createHistoryItem(doc.id, data);
            historyList.appendChild(historyItem);
        });

    } catch (error) {
        console.error('Error loading history:', error);
        historyLoading.style.display = 'none';
        historyList.innerHTML = '<p style="color: #ff4444; text-align: center;">❌ Błąd ładowania historii</p>';
    }
}

// Create history item element
function createHistoryItem(docId, data) {
    const item = document.createElement('div');
    item.className = 'history-item';
    
    const timestamp = data.timestamp ? data.timestamp.toDate() : new Date();
    const dateStr = timestamp.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    item.innerHTML = `
        <div class="history-item-image">
            <img src="${data.imagePreview || '/placeholder.png'}" alt="Analyzed image">
        </div>
        <div class="history-item-content">
            <div class="history-item-header">
                <span class="history-item-filename">📁 ${data.fileName}</span>
                <span class="history-item-date">${dateStr}</span>
            </div>
            <div class="history-item-caption">${data.caption || 'No description'}</div>
            <div class="history-item-tags">
                ${data.tags.slice(0, 5).map(tag => `<span class="history-tag">${tag}</span>`).join('')}
                ${data.tags.length > 5 ? `<span class="history-tag-more">+${data.tags.length - 5}</span>` : ''}
            </div>
        </div>
        <div class="history-item-actions">
            <button class="btn-history-view" onclick="viewHistoryItem('${docId}')">👁️ Zobacz</button>
            <button class="btn-history-delete" onclick="deleteHistoryItem('${docId}')">🗑️</button>
        </div>
    `;

    return item;
}

// View history item (load it to main view)
async function viewHistoryItem(docId) {
    try {
        const doc = await db.collection('analyses').doc(docId).get();
        
        if (!doc.exists) {
            alert('Nie znaleziono analizy');
            return;
        }

        const data = doc.data();
        
        // Load to main view
        const imagePreview = document.getElementById('imagePreview');
        const captionText = document.getElementById('captionText');
        const tagsContainer = document.getElementById('tagsContainer');
        const resultsContainer = document.getElementById('resultsContainer');
        
        if (imagePreview) imagePreview.src = data.imagePreview;
        if (captionText) captionText.textContent = data.caption || 'No description';
        
        if (tagsContainer) {
            tagsContainer.innerHTML = '';
            data.tags.forEach((tag, index) => {
                const tagElement = document.createElement('div');
                tagElement.className = 'tag';
                tagElement.textContent = tag;
                tagElement.style.animationDelay = `${index * 0.05}s`;
                tagsContainer.appendChild(tagElement);
            });
        }
        
        if (resultsContainer) {
            resultsContainer.classList.add('show');
        }
        
        // Close modal
        historyModal.classList.remove('show');
        
        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
    } catch (error) {
        console.error('Error viewing history item:', error);
        alert('Błąd wczytywania analizy');
    }
}

// Delete history item
async function deleteHistoryItem(docId) {
    if (!confirm('Czy na pewno chcesz usunąć tę analizę?')) {
        return;
    }

    try {
        await db.collection('analyses').doc(docId).delete();
        console.log('✅ Historia usunięta:', docId);
        
        // Reload history
        await loadHistory();
        
    } catch (error) {
        console.error('Error deleting history item:', error);
        alert('Błąd usuwania analizy');
    }
}

// Load last analysis on login
async function loadLastAnalysis() {
    if (!currentUser) return;

    try {
        const snapshot = await db.collection('analyses')
            .where('userId', '==', currentUser.uid)
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            
            const imagePreview = document.getElementById('imagePreview');
            const captionText = document.getElementById('captionText');
            const tagsContainer = document.getElementById('tagsContainer');
            const resultsContainer = document.getElementById('resultsContainer');
            
            if (imagePreview) imagePreview.src = data.imagePreview;
            if (captionText) captionText.textContent = data.caption || 'No description';
            
            if (tagsContainer) {
                tagsContainer.innerHTML = '';
                data.tags.forEach((tag, index) => {
                    const tagElement = document.createElement('div');
                    tagElement.className = 'tag';
                    tagElement.textContent = tag;
                    tagsContainer.appendChild(tagElement);
                });
            }
            
            if (resultsContainer) {
                resultsContainer.classList.add('show');
            }
            
            console.log('✅ Załadowano ostatnią analizę');
        }
    } catch (error) {
        console.error('Error loading last analysis:', error);
    }
}

console.log('history.js fully loaded');