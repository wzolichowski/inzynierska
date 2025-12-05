export function safeSetText(element, text) {
    if (element) {
        element.textContent = text || '';
    }
}

export function showMessage(container, message, type = 'error') {
    if (!container) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;

    container.innerHTML = '';
    container.appendChild(messageDiv);

    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

export function batchAppend(container, items, createElement) {
    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        const element = createElement(item);
        if (element) {
            fragment.appendChild(element);
        }
    });
    container.appendChild(fragment);
}

export function clearAllResults() {
    const resultsContainer = document.getElementById('resultsContainer');
    const generateFromTagsSection = document.getElementById('generateFromTagsSection');
    const generatedImageResult = document.getElementById('generatedImageResult');

    if (resultsContainer) {
        resultsContainer.classList.remove('show');
    }
    if (generateFromTagsSection) {
        generateFromTagsSection.style.display = 'none';
    }
    if (generatedImageResult) {
        generatedImageResult.style.display = 'none';
    }
}

export async function getFirebaseToken(user, forceRefresh = false) {
    if (!user) {
        throw new Error('User not authenticated');
    }

    try {
        const token = await user.getIdToken(forceRefresh);
        return token;
    } catch (error) {
        console.error('Error getting Firebase token:', error);
        throw new Error('Failed to get authentication token');
    }
}

export function getFirebaseErrorMessage(errorCode) {
    const errorMessages = {
        'auth/invalid-email': 'Nieprawidłowy adres email',
        'auth/user-disabled': 'To konto zostało zablokowane',
        'auth/user-not-found': 'Nie znaleziono konta z tym adresem email',
        'auth/wrong-password': 'Nieprawidłowe hasło',
        'auth/email-already-in-use': 'Ten adres email jest już używany',
        'auth/weak-password': 'Hasło jest za słabe (minimum 6 znaków)',
        'auth/operation-not-allowed': 'Rejestracja jest obecnie niedostępna',
        'auth/invalid-credential': 'Nieprawidłowy email lub hasło',
        'auth/account-exists-with-different-credential': 'Konto z tym emailem już istnieje',
        'auth/popup-closed-by-user': 'Anulowano logowanie',
        'auth/cancelled-popup-request': 'Anulowano żądanie',
        'auth/popup-blocked': 'Popup został zablokowany przez przeglądarkę',
        'auth/network-request-failed': 'Błąd połączenia z siecią',
        'auth/too-many-requests': 'Zbyt wiele prób. Spróbuj ponownie później',
        'auth/internal-error': 'Wystąpił błąd serwera. Spróbuj ponownie'
    };

    return errorMessages[errorCode] || 'Wystąpił błąd. Spróbuj ponownie.';
}

export function handleAPIError(error, context = '') {
    console.error(`API Error ${context}:`, error);

    if (error.response) {
        const status = error.response.status;
        if (status === 401) {
            return 'Błąd autoryzacji. Zaloguj się ponownie.';
        } else if (status === 403) {
            return 'Brak dostępu do zasobu.';
        } else if (status === 404) {
            return 'Nie znaleziono zasobu.';
        } else if (status === 500) {
            return 'Błąd serwera. Spróbuj ponownie później.';
        }
        return `Błąd: ${error.response.statusText}`;
    }

    if (error.request) {
        return 'Brak połączenia z serwerem.';
    }

    return error.message || 'Wystąpił nieoczekiwany błąd.';
}

export function formatRelativeDate(date) {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'teraz';
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffHours < 24) return `${diffHours} godz. temu`;
    if (diffDays < 7) return `${diffDays} dni temu`;

    return then.toLocaleDateString('pl-PL');
}

export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
