// Authentication Logic

let currentUser = null;

// DOM Elements
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const closeLogin = document.getElementById('closeLogin');
const closeRegister = document.getElementById('closeRegister');
const switchToRegister = document.getElementById('switchToRegister');
const switchToLogin = document.getElementById('switchToLogin');
const logoutBtn = document.getElementById('logoutBtn');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginGoogle = document.getElementById('loginGoogle');
const registerGoogle = document.getElementById('registerGoogle');

const authButtons = document.getElementById('authButtons');
const userMenu = document.getElementById('userMenu');
const userGreeting = document.getElementById('userGreeting');
const loginRequired = document.getElementById('loginRequired');
const uploadSection = document.getElementById('uploadSection');

// Show/Hide Modals
loginBtn.onclick = () => {
    loginModal.classList.add('show');
    clearModalErrors();
};

registerBtn.onclick = () => {
    registerModal.classList.add('show');
    clearModalErrors();
};

closeLogin.onclick = () => {
    loginModal.classList.remove('show');
    clearModalErrors();
};

closeRegister.onclick = () => {
    registerModal.classList.remove('show');
    clearModalErrors();
};

switchToRegister.onclick = (e) => {
    e.preventDefault();
    loginModal.classList.remove('show');
    registerModal.classList.add('show');
    clearModalErrors();
};

switchToLogin.onclick = (e) => {
    e.preventDefault();
    registerModal.classList.remove('show');
    loginModal.classList.add('show');
    clearModalErrors();
};

// Close modal when clicking outside
window.onclick = (e) => {
    if (e.target === loginModal) {
        loginModal.classList.remove('show');
        clearModalErrors();
    }
    if (e.target === registerModal) {
        registerModal.classList.remove('show');
        clearModalErrors();
    }
};

// Clear modal errors
function clearModalErrors() {
    const errorDivs = document.querySelectorAll('.modal-error');
    errorDivs.forEach(div => div.remove());
}

// Show error in modal
function showModalError(formElement, message) {
    // Remove old error if exists
    const oldError = formElement.parentElement.querySelector('.modal-error');
    if (oldError) oldError.remove();
    
    // Create new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'modal-error';
    errorDiv.innerHTML = `
        <span class="error-icon">⚠️</span>
        <span class="error-text">${message}</span>
    `;
    
    // Insert before form
    formElement.parentElement.insertBefore(errorDiv, formElement);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Email/Password Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearModalErrors();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Client-side validation
    if (!email || !password) {
        showModalError(loginForm, 'Proszę wypełnić wszystkie pola');
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        loginModal.classList.remove('show');
        showMessage('✅ Zalogowano pomyślnie!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        const errorMessage = getErrorMessage(error.code);
        showModalError(loginForm, errorMessage);
    }
});

// Email/Password Registration
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearModalErrors();
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    // Client-side validation
    if (!email || !password || !passwordConfirm) {
        showModalError(registerForm, 'Proszę wypełnić wszystkie pola');
        return;
    }

    if (password !== passwordConfirm) {
        showModalError(registerForm, 'Hasła nie są identyczne');
        return;
    }

    if (password.length < 6) {
        showModalError(registerForm, 'Hasło musi mieć minimum 6 znaków');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showModalError(registerForm, 'Nieprawidłowy format adresu email');
        return;
    }

    try {
        await auth.createUserWithEmailAndPassword(email, password);
        registerModal.classList.remove('show');
        showMessage('✅ Konto utworzone pomyślnie!', 'success');
    } catch (error) {
        console.error('Registration error:', error);
        const errorMessage = getErrorMessage(error.code);
        showModalError(registerForm, errorMessage);
    }
});

// Google Sign-In (Login)
loginGoogle.addEventListener('click', async () => {
    clearModalErrors();
    
    try {
        await auth.signInWithPopup(googleProvider);
        loginModal.classList.remove('show');
        showMessage('✅ Zalogowano przez Google!', 'success');
    } catch (error) {
        console.error('Google login error:', error);
        
        if (error.code === 'auth/popup-closed-by-user') {
            // User closed popup - don't show error
            return;
        }
        
        const errorMessage = getErrorMessage(error.code);
        showModalError(loginForm, errorMessage);
    }
});

// Google Sign-In (Register)
registerGoogle.addEventListener('click', async () => {
    clearModalErrors();
    
    try {
        await auth.signInWithPopup(googleProvider);
        registerModal.classList.remove('show');
        showMessage('✅ Zarejestrowano przez Google!', 'success');
    } catch (error) {
        console.error('Google registration error:', error);
        
        if (error.code === 'auth/popup-closed-by-user') {
            // User closed popup - don't show error
            return;
        }
        
        const errorMessage = getErrorMessage(error.code);
        showModalError(registerForm, errorMessage);
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        showMessage('✅ Wylogowano pomyślnie!', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('❌ Błąd wylogowania', 'error');
    }
});

// Listen to Auth State Changes
auth.onAuthStateChanged((user) => {
    currentUser = user;
    updateUI();
});

// Update UI based on auth state
function updateUI() {
    if (currentUser) {
        // User is logged in
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        
        const displayName = currentUser.displayName || currentUser.email.split('@')[0];
        userGreeting.textContent = `Cześć, ${displayName}!`;
        
        loginRequired.style.display = 'none';
        uploadSection.style.display = 'block';
    } else {
        // User is logged out
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
        loginRequired.style.display = 'block';
        uploadSection.style.display = 'none';
    }
}

// Show messages (global notifications)
function showMessage(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.innerHTML = `<div class="result-section ${type === 'error' ? 'error' : ''}">${message}</div>`;
    
    setTimeout(() => {
        statusDiv.innerHTML = '';
    }, 5000);
}

// Get user-friendly error messages
function getErrorMessage(errorCode) {
    const messages = {
        // Login errors
        'auth/user-not-found': '❌ Nie znaleziono konta z tym adresem email',
        'auth/wrong-password': '❌ Nieprawidłowe hasło',
        'auth/invalid-email': '❌ Nieprawidłowy adres email',
        'auth/user-disabled': '❌ To konto zostało zablokowane',
        'auth/invalid-credential': '❌ Nieprawidłowy email lub hasło',
        
        // Registration errors
        'auth/email-already-in-use': '❌ Ten adres email jest już używany',
        'auth/weak-password': '❌ Hasło jest za słabe (minimum 6 znaków)',
        'auth/operation-not-allowed': '❌ Rejestracja jest obecnie niedostępna',
        
        // Google auth errors
        'auth/popup-closed-by-user': '❌ Anulowano logowanie',
        'auth/cancelled-popup-request': '❌ Anulowano żądanie',
        'auth/popup-blocked': '❌ Popup został zablokowany przez przeglądarkę',
        'auth/account-exists-with-different-credential': '❌ Konto z tym emailem już istnieje',
        
        // Network errors
        'auth/network-request-failed': '❌ Błąd połączenia z siecią',
        'auth/too-many-requests': '❌ Zbyt wiele prób. Spróbuj ponownie później',
        
        // Other errors
        'auth/internal-error': '❌ Wystąpił błąd serwera. Spróbuj ponownie',
    };
    
    return messages[errorCode] || `❌ Wystąpił błąd: ${errorCode}`;
}

// Get current user's ID token (for backend authentication)
async function getUserToken() {
    if (!currentUser) return null;
    
    try {
        const token = await currentUser.getIdToken();
        return token;
    } catch (error) {
        console.error('Error getting token:', error);
        return null;
    }
}