import {
    showMessage as showMessageUtil,
    clearAllResults,
    getFirebaseErrorMessage,
    isValidEmail
} from './utils.js';

let currentUser = null;

console.log('auth.js loaded');

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

// Forgot Password handler
const forgotPassword = document.getElementById('forgotPassword');
if (forgotPassword) {
    forgotPassword.onclick = async (e) => {
        e.preventDefault();
        clearModalErrors();
        
        const email = document.getElementById('loginEmail').value;
        
        if (!email) {
            showModalError(loginForm, 'Wprowadź adres email, aby zresetować hasło');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showModalError(loginForm, 'Wprowadź prawidłowy adres email');
            return;
        }
        
        try {
            await auth.sendPasswordResetEmail(email);
            showModalError(loginForm, '✅ Link do resetowania hasła został wysłany na adres: ' + email + ' (sprawdź też SPAM!)');
            
            // Success styling
            const errorDiv = loginForm.parentElement.querySelector('.modal-error');
            if (errorDiv) {
                errorDiv.style.background = '#e8f5e9';
                errorDiv.style.borderColor = '#81c784';
                errorDiv.style.color = '#2e7d32';
            }
            
            setTimeout(() => {
                const errorDiv = loginForm.parentElement.querySelector('.modal-error');
                if (errorDiv) errorDiv.remove();
            }, 8000);
            
        } catch (error) {
            console.error('Password reset error:', error);
            let errorMessage = '❌ Nie można wysłać linku resetującego hasło';
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = '❌ Nie znaleziono użytkownika z tym adresem email';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = '❌ Nieprawidłowy adres email';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = '❌ Zbyt wiele prób. Spróbuj ponownie później';
            }
            
            showModalError(loginForm, errorMessage);
        }
    };
}

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

// Clear modal errors AND form fields
function clearModalErrors() {
    const errorDivs = document.querySelectorAll('.modal-error');
    errorDivs.forEach(div => div.remove());
    
    // Clear all form fields
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const registerEmail = document.getElementById('registerEmail');
    const registerPassword = document.getElementById('registerPassword');
    const registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
    
    if (loginEmail) loginEmail.value = '';
    if (loginPassword) loginPassword.value = '';
    if (registerEmail) registerEmail.value = '';
    if (registerPassword) registerPassword.value = '';
    if (registerPasswordConfirm) registerPasswordConfirm.value = '';
}

function showModalError(formElement, message) {
    const oldError = formElement.parentElement.querySelector('.modal-error');
    if (oldError) oldError.remove();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'modal-error';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'error-icon';
    iconSpan.textContent = '⚠️';

    const textSpan = document.createElement('span');
    textSpan.className = 'error-text';
    textSpan.textContent = message;

    errorDiv.appendChild(iconSpan);
    errorDiv.appendChild(textSpan);

    formElement.parentElement.insertBefore(errorDiv, formElement);

    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function clearResults() {
    console.log('Clearing results...');

    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) imagePreview.src = '';

    const imageInput = document.getElementById('imageInput');
    if (imageInput) imageInput.value = '';

    const selectedFile = document.getElementById('selectedFile');
    if (selectedFile) {
        selectedFile.textContent = '';
        selectedFile.classList.remove('show');
    }

    const captionText = document.getElementById('captionText');
    if (captionText) captionText.textContent = '';

    const tagsContainer = document.getElementById('tagsContainer');
    if (tagsContainer) tagsContainer.innerHTML = '';

    const statusDiv = document.getElementById('status');
    if (statusDiv) statusDiv.innerHTML = '';

    const promptPreview = document.getElementById('promptPreview');
    if (promptPreview) promptPreview.value = '';

    clearAllResults();
}

// Email/Password Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearModalErrors();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showModalError(loginForm, 'Proszę wypełnić wszystkie pola');
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        loginModal.classList.remove('show');
        clearModalErrors();
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showModalError(registerForm, 'Nieprawidłowy format adresu email');
        return;
    }

    try {
        await auth.createUserWithEmailAndPassword(email, password);
        registerModal.classList.remove('show');
        clearModalErrors();
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
        clearModalErrors();
        showMessage('✅ Zalogowano przez Google!', 'success');
    } catch (error) {
        console.error('Google login error:', error);
        
        if (error.code === 'auth/popup-closed-by-user') {
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
        clearModalErrors();
        showMessage('✅ Zarejestrowano przez Google!', 'success');
    } catch (error) {
        console.error('Google registration error:', error);
        
        if (error.code === 'auth/popup-closed-by-user') {
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
    console.log('Auth state changed:', user);
    currentUser = user;
    updateUI();
});

// Update UI based on auth state
function updateUI() {
    const heroSection = document.getElementById('heroSection');
    const uploadSection = document.getElementById('uploadSection');
    
    console.log('=== updateUI called ===');
    console.log('currentUser:', currentUser);
    
    if (currentUser) {
        // User is logged in
        console.log('User is logged in');
        
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        
        const displayName = currentUser.displayName || currentUser.email.split('@')[0];
        userGreeting.textContent = `Cześć, ${displayName}!`;
        
        // Hide hero, show upload
        if (heroSection) {
            heroSection.style.setProperty('display', 'none', 'important');
            console.log('✅ Hero hidden');
        }
        
        if (uploadSection) {
            uploadSection.style.setProperty('display', 'block', 'important');
            console.log('✅ Upload shown');
        }
        
        // Show features section after login
        const featuresSection = document.getElementById('featuresSection');
        if (featuresSection) {
            featuresSection.style.display = 'grid';
            console.log('✅ Features section shown');
        }
        
        // Clear and load last analysis
        clearResults();
        setTimeout(() => {
            if (typeof loadLastAnalysis === 'function') {
                loadLastAnalysis();
            }
        }, 500);
        
    } else {
        // User is logged out
        console.log('User is logged out');
        
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
        
        // Show hero, hide upload
        if (heroSection) {
            heroSection.style.setProperty('display', 'block', 'important');
            console.log('✅ Hero shown');
        }
        
        if (uploadSection) {
            uploadSection.style.setProperty('display', 'none', 'important');
            console.log('✅ Upload hidden');
        }
        
        // Hide features section when logged out
        const featuresSection = document.getElementById('featuresSection');
        if (featuresSection) {
            featuresSection.style.display = 'none';
            console.log('✅ Features section hidden');
        }
        
        clearResults();
    }
    
    console.log('=== updateUI complete ===');
}

function showMessage(message, type) {
    const statusDiv = document.getElementById('status');
    showMessageUtil(statusDiv, message, type);
}

function getErrorMessage(errorCode) {
    return '❌ ' + getFirebaseErrorMessage(errorCode);
}

// Get current user's ID token
// Get Firebase ID token for API authentication
async function getUserToken() {
    if (!currentUser) {
        console.warn('⚠️ getUserToken: No current user');
        return null;
    }
    
    try {
        // Force token refresh to ensure it's not expired
        const token = await currentUser.getIdToken(true);  // true = force refresh
        console.log('✅ Got ID token, length:', token.length);
        console.log('✅ Token starts with eyJ:', token.startsWith('eyJ'));
        
        // Validate token length
        if (token.length < 500) {
            console.error('❌ Token too short! Length:', token.length);
            console.error('❌ This is NOT a valid Firebase ID token!');
            return null;
        }
        
        return token;
    } catch (error) {
        console.error('❌ Error getting ID token:', error);
        return null;
    }
}

console.log('auth.js fully loaded');