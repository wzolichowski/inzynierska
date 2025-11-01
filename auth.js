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
    resetPasswordVisibility('login');
};

closeRegister.onclick = () => {
    registerModal.classList.remove('show');
    clearModalErrors();
    resetPasswordVisibility('register');
};

switchToRegister.onclick = (e) => {
    e.preventDefault();
    loginModal.classList.remove('show');
    registerModal.classList.add('show');
    clearModalErrors();
    resetPasswordVisibility('login');
};

switchToLogin.onclick = (e) => {
    e.preventDefault();
    registerModal.classList.remove('show');
    loginModal.classList.add('show');
    clearModalErrors();
    resetPasswordVisibility('register');
};

// Close modal when clicking outside
window.onclick = (e) => {
    if (e.target === loginModal) {
        loginModal.classList.remove('show');
        clearModalErrors();
        resetPasswordVisibility('login');
    }
    if (e.target === registerModal) {
        registerModal.classList.remove('show');
        clearModalErrors();
        resetPasswordVisibility('register');
    }
};

// Clear modal errors
function clearModalErrors() {
    const errorDivs = document.querySelectorAll('.modal-error');
    errorDivs.forEach(div => div.remove());
}

// Reset password visibility
function resetPasswordVisibility(modal) {
    if (modal === 'login') {
        const loginPassword = document.getElementById('loginPassword');
        const toggleLoginPassword = document.getElementById('toggleLoginPassword');
        if (loginPassword) loginPassword.type = 'password';
        if (toggleLoginPassword) toggleLoginPassword.classList.remove('visible');
    } else if (modal === 'register') {
        const registerPassword = document.getElementById('registerPassword');
        const registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
        const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');
        const toggleRegisterPasswordConfirm = document.getElementById('toggleRegisterPasswordConfirm');
        
        if (registerPassword) registerPassword.type = 'password';
        if (registerPasswordConfirm) registerPasswordConfirm.type = 'password';
        if (toggleRegisterPassword) toggleRegisterPassword.classList.remove('visible');
        if (toggleRegisterPasswordConfirm) toggleRegisterPasswordConfirm.classList.remove('visible');
    }
}

// Show error in modal
function showModalErro