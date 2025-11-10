// Authentication Logic

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

// Show error in modal
function showModalError(formElement, message) {
    const oldError = formElement.parentElement.querySelector('.modal-error');
    if (oldError) oldError.remove();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'modal-error';
    errorDiv.innerHTML = `
        <span class="error-icon">⚠️</span>
        <span class="error-text">${message}</span>
    `;
    
    formElement.parentElement.insertBefore(errorDiv, formElement);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Clear results and reset UI
function clearResults() {
    console.log('Clearing results...');
    
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) imagePreview.src = '';
    
    const captionText = document.getElementById('captionText');
    if (captionText) captionText.textContent = '';
    
    const tagsContainer = document.getElementById('tagsContainer');
    if (tagsContainer) tagsContainer.innerHTML = '';
    
    const resultsContainer = document.getElementById('resultsContainer');
    if (resultsContainer) resultsContainer.classList.remove('show');
    
    const imageInput = document.getElementById('imageInput');
    if (imageInput) imageInput.value = '';
    
    const selectedFile = document.getElementById('selectedFile');
    if (selectedFile) {
        selectedFile.textContent = '';
        selectedFile.classList.remove('show');
    }
    
    const statusDiv = document.getElementById('status');
    if (statusDiv) statusDiv.innerHTML = '';
    
    // Clear generation section
    const generateFromTagsSection = document.getElementById('generateFromTagsSection');
    if (generateFromTagsSection) generateFromTagsSection.style.display = 'none';
    
    const generatedImageResult = document.getElementById('generatedImageResult');
    if (generatedImageResult) generatedImageResult.style.display = 'none';
    
    const promptPreview = document.getElementById('promptPreview');
    if (promptPreview) promptPreview.value = '';
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
        
        clearResults();
    }
    
    console.log('=== updateUI complete ===');
}

// Show messages
function showMessage(message, type) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.innerHTML = `<div class="result-section ${type === 'error' ? 'error' : ''}">${message}</div>`;
        
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 5000);
    }
}

// Get user-friendly error messages
function getErrorMessage(errorCode) {
    const messages = {
        'auth/user-not-found': '❌ Nie znaleziono konta z tym adresem email',
        'auth/wrong-password': '❌ Nieprawidłowe hasło',
        'auth/invalid-email': '❌ Nieprawidłowy adres email',
        'auth/user-disabled': '❌ To konto zostało zablokowane',
        'auth/invalid-credential': '❌ Nieprawidłowy email lub hasło',
        'auth/email-already-in-use': '❌ Ten adres email jest już używany',
        'auth/weak-password': '❌ Hasło jest za słabe (minimum 6 znaków)',
        'auth/operation-not-allowed': '❌ Rejestracja jest obecnie niedostępna',
        'auth/popup-closed-by-user': '❌ Anulowano logowanie',
        'auth/cancelled-popup-request': '❌ Anulowano żądanie',
        'auth/popup-blocked': '❌ Popup został zablokowany przez przeglądarkę',
        'auth/account-exists-with-different-credential': '❌ Konto z tym emailem już istnieje',
        'auth/network-request-failed': '❌ Błąd połączenia z siecią',
        'auth/too-many-requests': '❌ Zbyt wiele prób. Spróbuj ponownie później',
        'auth/internal-error': '❌ Wystąpił błąd serwera. Spróbuj ponownie',
    };
    
    return messages[errorCode] || `❌ Wystąpił błąd: ${errorCode}`;
}

// Get current user's ID token
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

console.log('auth.js fully loaded');