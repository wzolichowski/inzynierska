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
};

registerBtn.onclick = () => {
    registerModal.classList.add('show');
};

closeLogin.onclick = () => {
    loginModal.classList.remove('show');
};

closeRegister.onclick = () => {
    registerModal.classList.remove('show');
};

switchToRegister.onclick = (e) => {
    e.preventDefault();
    loginModal.classList.remove('show');
    registerModal.classList.add('show');
};

switchToLogin.onclick = (e) => {
    e.preventDefault();
    registerModal.classList.remove('show');
    loginModal.classList.add('show');
};

// Close modal when clicking outside
window.onclick = (e) => {
    if (e.target === loginModal) {
        loginModal.classList.remove('show');
    }
    if (e.target === registerModal) {
        registerModal.classList.remove('show');
    }
};

// Email/Password Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        loginModal.classList.remove('show');
        showMessage('✅ Zalogowano pomyślnie!', 'success');
    } catch (error) {
        showMessage('❌ Błąd logowania: ' + getErrorMessage(error.code), 'error');
    }
});

// Email/Password Registration
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    if (password !== passwordConfirm) {
        showMessage('❌ Hasła nie są identyczne!', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('❌ Hasło musi mieć minimum 6 znaków!', 'error');
        return;
    }

    try {
        await auth.createUserWithEmailAndPassword(email, password);
        registerModal.classList.remove('show');
        showMessage('✅ Konto utworzone pomyślnie!', 'success');
    } catch (error) {
        showMessage('❌ Błąd rejestracji: ' + getErrorMessage(error.code), 'error');
    }
});

// Google Sign-In (Login)
loginGoogle.addEventListener('click', async () => {
    try {
        await auth.signInWithPopup(googleProvider);
        loginModal.classList.remove('show');
        showMessage('✅ Zalogowano przez Google!', 'success');
    } catch (error) {
        showMessage('❌ Błąd logowania Google: ' + getErrorMessage(error.code), 'error');
    }
});

// Google Sign-In (Register)
registerGoogle.addEventListener('click', async () => {
    try {
        await auth.signInWithPopup(googleProvider);
        registerModal.classList.remove('show');
        showMessage('✅ Zarejestrowano przez Google!', 'success');
    } catch (error) {
        showMessage('❌ Błąd rejestracji Google: ' + getErrorMessage(error.code), 'error');
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        showMessage('✅ Wylogowano pomyślnie!', 'success');
    } catch (error) {
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

// Show messages
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
        'auth/email-already-in-use': 'Ten email jest już używany',
        'auth/invalid-email': 'Nieprawidłowy adres email',
        'auth/operation-not-allowed': 'Operacja niedozwolona',
        'auth/weak-password': 'Hasło jest za słabe',
        'auth/user-disabled': 'To konto zostało wyłączone',
        'auth/user-not-found': 'Nie znaleziono użytkownika',
        'auth/wrong-password': 'Nieprawidłowe hasło',
        'auth/popup-closed-by-user': 'Okno logowania zostało zamknięte',
        'auth/cancelled-popup-request': 'Anulowano żądanie',
        'auth/network-request-failed': 'Błąd połączenia z siecią'
    };
    
    return messages[errorCode] || 'Nieznany błąd';
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