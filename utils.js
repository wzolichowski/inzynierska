/**
 * Utility Functions - Shared across the application
 * Centralizes common functionality to reduce code duplication
 */

// =========================================
// DOM Utilities
// =========================================

/**
 * Safely set text content (prevents XSS)
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text to set
 */
export function safeSetText(element, text) {
    if (element) {
        element.textContent = text || '';
    }
}

/**
 * Safely create and append error message
 * @param {HTMLElement} container - Container element
 * @param {string} message - Error message
 * @param {string} type - Message type ('error', 'success', 'info')
 */
export function showMessage(container, message, type = 'error') {
    if (!container) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `result-section ${type}`;

    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    messageDiv.textContent = `${icon} ${message}`;

    container.innerHTML = '';
    container.appendChild(messageDiv);
}

/**
 * Batch DOM updates using DocumentFragment (better performance)
 * @param {HTMLElement} container - Container element
 * @param {Array} items - Array of items to append
 * @param {Function} createElement - Function to create element from item
 */
export function batchAppend(container, items, createElement) {
    if (!container || !items || !Array.isArray(items)) return;

    const fragment = document.createDocumentFragment();
    items.forEach((item, index) => {
        const element = createElement(item, index);
        if (element) fragment.appendChild(element);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

/**
 * Cache DOM element references
 * @param {Object} selectors - Object mapping names to selectors
 * @returns {Object} Object with cached DOM references
 */
export function cacheDOMElements(selectors) {
    const cached = {};
    for (const [key, selector] of Object.entries(selectors)) {
        cached[key] = document.getElementById(selector) || document.querySelector(selector);
    }
    return cached;
}

// =========================================
// Modal Management
// =========================================

/**
 * Setup modal close handlers (click and Escape key)
 * @param {HTMLElement} modal - Modal element
 * @param {HTMLElement} closeButton - Close button element
 * @param {Function} onClose - Optional callback on close
 */
export function setupModalClose(modal, closeButton, onClose = null) {
    if (!modal) return;

    // Close button handler
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            modal.classList.remove('show');
            if (onClose) onClose();
        });
    }

    // Escape key handler
    const escapeHandler = (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            modal.classList.remove('show');
            if (onClose) onClose();
        }
    };

    document.addEventListener('keydown', escapeHandler);

    // Return cleanup function
    return () => {
        document.removeEventListener('keydown', escapeHandler);
    };
}

/**
 * Clear all results and reset UI state
 * Centralized function to avoid duplication across files
 */
export function clearAllResults() {
    console.log('Clearing all results...');

    // Image preview
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) imagePreview.src = '';

    // Caption
    const captionText = document.getElementById('captionText');
    if (captionText) captionText.textContent = '';

    // Tags
    const tagsContainer = document.getElementById('tagsContainer');
    if (tagsContainer) tagsContainer.innerHTML = '';

    // Results container
    const resultsContainer = document.getElementById('resultsContainer');
    if (resultsContainer) resultsContainer.classList.remove('show');

    // File input
    const imageInput = document.getElementById('imageInput');
    if (imageInput) imageInput.value = '';

    // Selected file indicator
    const selectedFile = document.getElementById('selectedFile');
    if (selectedFile) {
        selectedFile.textContent = '';
        selectedFile.classList.remove('show');
    }

    // Status messages
    const statusDiv = document.getElementById('status');
    if (statusDiv) statusDiv.innerHTML = '';

    // Generation sections
    const generateFromTagsSection = document.getElementById('generateFromTagsSection');
    if (generateFromTagsSection) generateFromTagsSection.style.display = 'none';

    const generatedImageResult = document.getElementById('generatedImageResult');
    if (generatedImageResult) generatedImageResult.style.display = 'none';

    // Prompt preview
    const promptPreview = document.getElementById('promptPreview');
    if (promptPreview) promptPreview.value = '';

    console.log('✅ All results cleared');
}

// =========================================
// Firebase Token Management
// =========================================

/**
 * Get Firebase ID token for authenticated user
 * @param {Object} user - Firebase user object
 * @param {boolean} forceRefresh - Force token refresh
 * @returns {Promise<string|null>} ID token or null
 */
export async function getFirebaseToken(user, forceRefresh = false) {
    if (!user) {
        console.error('No user provided for token retrieval');
        return null;
    }

    try {
        const token = await user.getIdToken(forceRefresh);
        return token;
    } catch (error) {
        console.error('Error getting Firebase token:', error);
        throw new Error('Failed to retrieve authentication token');
    }
}

// =========================================
// Error Handling
// =========================================

/**
 * Map Firebase error codes to user-friendly messages
 * @param {string} errorCode - Firebase error code
 * @returns {string} User-friendly error message
 */
export function getFirebaseErrorMessage(errorCode) {
    const errorMessages = {
        'auth/invalid-email': 'Nieprawidłowy adres email.',
        'auth/user-disabled': 'To konto zostało zablokowane.',
        'auth/user-not-found': 'Nie znaleziono użytkownika z tym adresem email.',
        'auth/wrong-password': 'Nieprawidłowe hasło.',
        'auth/email-already-in-use': 'Ten adres email jest już używany.',
        'auth/weak-password': 'Hasło jest zbyt słabe. Użyj co najmniej 6 znaków.',
        'auth/operation-not-allowed': 'Ta operacja nie jest dozwolona.',
        'auth/popup-closed-by-user': 'Okno logowania zostało zamknięte.',
        'auth/cancelled-popup-request': 'Żądanie zostało anulowane.',
        'auth/network-request-failed': 'Błąd sieci. Sprawdź połączenie internetowe.',
        'auth/too-many-requests': 'Zbyt wiele prób. Spróbuj ponownie później.',
        'auth/invalid-credential': 'Nieprawidłowe dane uwierzytelniające.',
    };

    return errorMessages[errorCode] || 'Wystąpił nieznany błąd. Spróbuj ponownie.';
}

/**
 * Handle API errors with proper logging and user feedback
 * @param {Error} error - Error object
 * @param {string} context - Context of the error
 * @returns {string} User-friendly error message
 */
export function handleAPIError(error, context = 'API call') {
    console.error(`Error in ${context}:`, error);

    if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
        return 'Błąd sieci. Sprawdź połączenie internetowe.';
    }

    if (error.message.includes('401') || error.message.includes('unauthorized')) {
        return 'Błąd autoryzacji. Zaloguj się ponownie.';
    }

    if (error.message.includes('403') || error.message.includes('forbidden')) {
        return 'Brak uprawnień do wykonania tej operacji.';
    }

    if (error.message.includes('404')) {
        return 'Nie znaleziono zasobu.';
    }

    if (error.message.includes('429')) {
        return 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.';
    }

    if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
        return 'Błąd serwera. Spróbuj ponownie później.';
    }

    return error.message || 'Wystąpił nieoczekiwany błąd.';
}

// =========================================
// Validation
// =========================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
    // More comprehensive email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {Array<string>} allowedTypes - Allowed MIME types
 * @returns {boolean} True if valid
 */
export function isValidFileType(file, allowedTypes) {
    return file && allowedTypes.includes(file.type);
}

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSizeBytes - Maximum size in bytes
 * @returns {boolean} True if valid
 */
export function isValidFileSize(file, maxSizeBytes) {
    return file && file.size <= maxSizeBytes;
}

// =========================================
// Date Formatting
// =========================================

/**
 * Format date as relative time (e.g., "2 hours ago") or absolute
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatRelativeDate(date) {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'przed chwilą';
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffHours < 24) return `${diffHours} godz. temu`;
    if (diffDays < 7) return `${diffDays} dni temu`;

    // Absolute date for older items
    return then.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// =========================================
// Debounce / Throttle
// =========================================

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// =========================================
// Console Logger (can be disabled in production)
// =========================================

/**
 * Configurable console logger
 * Set window.DEBUG = false in production to disable
 */
export const logger = {
    log: (...args) => {
        if (window.DEBUG !== false) {
            console.log(...args);
        }
    },
    error: (...args) => {
        if (window.DEBUG !== false) {
            console.error(...args);
        }
    },
    warn: (...args) => {
        if (window.DEBUG !== false) {
            console.warn(...args);
        }
    },
    info: (...args) => {
        if (window.DEBUG !== false) {
            console.info(...args);
        }
    }
};
