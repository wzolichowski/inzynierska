// History management for image analyses

console.log('history.js loaded');

const historyButton = document.getElementById('historyButton');
const historyModal = document.getElementById('historyModal');
const closeHistory = document.getElementById('closeHistory');
const historyList = document.getElementById('historyList');
const historyLoading = document.getElementById('historyLoading');
const historyEmpty = document.getElementById('historyEmpty');

// Show history modal
if (historyButton) {
    historyButton.addEventListener('click', () => {
        if (!currentUser) {
            document.getElementById('loginBtn').click();
            return;
        }
        historyModal.classList.add('show');
        loadHistory();
    });
}

// Close history modal
if (closeHistory) {
    closeHistory.addEventListener('click', () => {
        historyModal.classList.remove('show');
    });
}

// Close on outside click
window.addEventListener('click', (e) => {
    if (e.target === historyModal) {
        historyModal.classList.remove('show');
    }
});

// Close on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && historyModal.classList.contains('show')) {
        historyModal.classList.remove('show');
    }
});

// Load history from Firestore
async function loadHistory() {
    if (!currentUser) {
        console.log('No user logged in');
        return;
    }

    historyLoading.classList.add('show');
    historyList.innerHTML = '';
    historyEmpty.style.display = 'none';

    try {
        const snapshot = await db.collection('analyses')
            .where('userId', '==', currentUser.uid)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();

        historyLoading.classList.remove('show');

        if (snapshot.empty) {
            historyEmpty.style.display = 'block';
            return;
        }

        // Add "Delete All" button at the top
        const deleteAllContainer = document.createElement('div');
        deleteAllContainer.className = 'delete-all-container';
        deleteAllContainer.innerHTML = `
            <button class="btn-delete-all" id="deleteAllHistoryBtn">
                <span>🗑️</span>
                <span>Usuń całą historię</span>
            </button>
        `;
        historyList.appendChild(deleteAllContainer);

        // Add delete all handler
        document.getElementById('deleteAllHistoryBtn').addEventListener('click', deleteAllHistory);

        // Render history items
        snapshot.forEach((doc) => {
            const data = doc.data();
            const historyItem = createHistoryItem(doc.id, data);
            historyList.appendChild(historyItem);
        });

        console.log(`✅ Loaded ${snapshot.size} history items`);

    } catch (error) {
        console.error('Error loading history:', error);
        historyLoading.classList.remove('show');
        historyList.innerHTML = '<div class="history-error">❌ Błąd ładowania historii</div>';
    }
}

// Create history item element
function createHistoryItem(docId, data) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.dataset.docId = docId;

    const timestamp = data.timestamp ? data.timestamp.toDate() : new Date();
    const formattedDate = formatDate(timestamp);

    // Get first 5 tags
    const tags = data.tags ? data.tags.slice(0, 5) : [];
    const tagsHTML = tags.map(tag => `<span class="history-tag">${tag}</span>`).join('');
    const moreTags = data.tags && data.tags.length > 5 ? `<span class="history-tag">+${data.tags.length - 5}</span>` : '';

    item.innerHTML = `
        <div class="history-item-header">
            <div class="history-item-icon">📸</div>
            <div class="history-item-info">
                <div class="history-item-filename">${data.fileName || 'Unknown file'}</div>
                <div class="history-item-date">${formattedDate}</div>
            </div>
        </div>
        <div class="history-item-caption">${data.caption || 'No description'}</div>
        <div class="history-item-tags">${tagsHTML}${moreTags}</div>
        <div class="history-item-actions">
            <button class="btn-history-view" onclick="viewHistoryItem('${docId}')">
                <span>👁️</span> Zobacz
            </button>
            <button class="btn-history-delete" onclick="deleteHistoryItem('${docId}')">
                <span>🗑️</span>
            </button>
        </div>
    `;

    return item;
}

// View history item
window.viewHistoryItem = async function(docId) {
    try {
        const doc = await db.collection('analyses').doc(docId).get();
        if (!doc.exists) {
            alert('Nie znaleziono analizy');
            return;
        }

        const data = doc.data();
        
        // Close history modal
        historyModal.classList.remove('show');
        
        // Display the analysis
        if (data.imagePreview) {
            document.getElementById('imagePreview').src = data.imagePreview;
        }
        
        document.getElementById('captionText').textContent = data.caption || 'No description';
        
        const tagsContainer = document.getElementById('tagsContainer');
        tagsContainer.innerHTML = '';
        if (data.tags) {
            data.tags.forEach((tag, index) => {
                const tagElement = document.createElement('div');
                tagElement.className = 'tag';
                tagElement.textContent = tag;
                tagElement.style.animationDelay = `${index * 0.05}s`;
                tagsContainer.appendChild(tagElement);
            });
        }
        
        document.getElementById('resultsContainer').classList.add('show');
        
        // Store analysis data for generation
        currentAnalysisData = {
            caption: data.caption || 'No description',
            tags: data.tags || [],
            fileName: data.fileName,
            imagePreview: data.imagePreview
        };
        
        // Show generate section
        showGenerateFromTagsSection();
        
        // Scroll to results
        setTimeout(() => {
            document.getElementById('resultsContainer').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
        
    } catch (error) {
        console.error('Error viewing history item:', error);
        alert('Błąd wczytywania analizy');
    }
}

// Delete single history item
window.deleteHistoryItem = async function(docId) {
    if (!confirm('Czy na pewno chcesz usunąć tę analizę?')) {
        return;
    }

    try {
        await db.collection('analyses').doc(docId).delete();
        
        // Remove from UI
        const item = document.querySelector(`[data-doc-id="${docId}"]`);
        if (item) {
            item.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                item.remove();
                
                // Check if empty
                const remainingItems = document.querySelectorAll('.history-item');
                if (remainingItems.length === 0) {
                    historyEmpty.style.display = 'block';
                }
            }, 300);
        }
        
        console.log(`✅ Deleted history item: ${docId}`);
        
    } catch (error) {
        console.error('Error deleting history item:', error);
        alert('Błąd usuwania analizy');
    }
}

// Delete all history
async function deleteAllHistory() {
    const confirmMessage = 'Czy na pewno chcesz usunąć CAŁĄ historię?\n\nTa operacja jest nieodwracalna!';
    
    if (!confirm(confirmMessage)) {
        return;
    }

    // Double confirmation for safety
    if (!confirm('Czy jesteś absolutnie pewien? Wszystkie analizy zostaną usunięte!')) {
        return;
    }

    try {
        historyLoading.classList.add('show');
        
        // Get all user's analyses
        const snapshot = await db.collection('analyses')
            .where('userId', '==', currentUser.uid)
            .get();

        if (snapshot.empty) {
            historyLoading.classList.remove('show');
            alert('Brak historii do usunięcia');
            return;
        }

        const totalDocs = snapshot.size;

        // Delete all documents individually (not batch - to avoid permissions issues)
        // Firestore security rules check permissions per document, not for batch operations
        const deletePromises = [];
        snapshot.forEach((doc) => {
            deletePromises.push(doc.ref.delete());
        });

        // Wait for all deletes to complete
        await Promise.all(deletePromises);

        // Clear UI
        historyList.innerHTML = '';
        historyEmpty.style.display = 'block';
        historyLoading.classList.remove('show');

        console.log(`✅ Deleted ${totalDocs} history items`);
        alert(`Usunięto ${totalDocs} analiz z historii`);

    } catch (error) {
        console.error('Error deleting all history:', error);
        historyLoading.classList.remove('show');
        
        // More detailed error message
        if (error.code === 'permission-denied') {
            alert('Błąd uprawnień: Sprawdź Firestore Security Rules');
        } else {
            alert('Błąd podczas usuwania historii: ' + error.message);
        }
    }
}

// Format date
function formatDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Przed chwilą';
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffHours < 24) return `${diffHours} godz. temu`;
    if (diffDays < 7) return `${diffDays} dni temu`;

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
}

console.log('history.js fully loaded');