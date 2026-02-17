/**
 * Main App — Router & Shell with Password Gate
 */
import './styles/main.css';
import { initDB } from './db/vault.js';
import { initGroq } from './tools/groq-client.js';
import { initGemini } from './tools/gemini-client.js';
import { renderContentWriter } from './tools/content-writer.js';
import { renderPhotoStudio } from './tools/photo-studio.js';
import { renderTeleprompter } from './tools/teleprompter.js';
import { renderIdeaBank } from './tools/idea-bank.js';
import { renderContentVault } from './tools/content-vault.js';
import { initBottomSheet } from './components/bottom-sheet.js';
import { showToast } from './components/toast.js';

// Password hash from environment variable (injected at build time by Vite)
const PASSWORD_HASH = import.meta.env.VITE_APP_PASSWORD_HASH || '';
const AUTH_KEY = 'artisan_hub_auth';

// ---- Password Gate ----
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function isAuthenticated() {
    return sessionStorage.getItem(AUTH_KEY) === 'true';
}

function showPasswordGate() {
    document.getElementById('app').style.display = 'none';

    const gate = document.createElement('div');
    gate.id = 'password-gate';
    gate.innerHTML = `
    <div class="gate-container">
      <div class="gate-card">
        <div class="gate-brand">✦</div>
        <h1 class="gate-title">Artisan Hub</h1>
        <p class="gate-subtitle">Masukkan password untuk melanjutkan</p>
        <div class="gate-form">
          <div class="gate-input-group">
            <input type="password" id="gate-password" placeholder="Password..." autocomplete="off" />
          </div>
          <button class="btn btn-primary btn-full btn-large" id="gate-submit">Masuk</button>
        </div>
        <p class="gate-error" id="gate-error" style="display:none;">Password salah. Coba lagi.</p>
      </div>
    </div>
  `;
    document.body.prepend(gate);

    const input = document.getElementById('gate-password');
    const submitBtn = document.getElementById('gate-submit');
    const errorMsg = document.getElementById('gate-error');

    async function tryLogin() {
        const password = input.value.trim();
        if (!password) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Memverifikasi...';

        const hash = await hashPassword(password);
        if (hash === PASSWORD_HASH) {
            sessionStorage.setItem(AUTH_KEY, 'true');
            gate.classList.add('gate-exit');
            setTimeout(() => {
                gate.remove();
                document.getElementById('app').style.display = '';
                initApp();
            }, 400);
        } else {
            errorMsg.style.display = 'block';
            input.value = '';
            input.focus();
            submitBtn.disabled = false;
            submitBtn.textContent = 'Masuk';
            gate.querySelector('.gate-card').classList.add('shake');
            setTimeout(() => gate.querySelector('.gate-card').classList.remove('shake'), 500);
        }
    }

    submitBtn.addEventListener('click', tryLogin);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') tryLogin();
    });

    input.focus();
}

// ---- App Init ----
async function initApp() {
    await initDB();
    initBottomSheet();
    loadSettings();
    setupNavigation();
    setupSettings();
    setupMobileNav();
    setupRepurpose();

    const hash = window.location.hash.slice(1) || 'writer';
    navigateTo(hash);
}

// ---- Entry Point ----
if (isAuthenticated()) {
    initApp();
} else if (PASSWORD_HASH) {
    showPasswordGate();
} else {
    initApp();
}

// ---- Navigation ----
const pages = {
    writer: renderContentWriter,
    studio: renderPhotoStudio,
    teleprompter: renderTeleprompter,
    ideas: renderIdeaBank,
    vault: renderContentVault
};

let currentPage = null;

function navigateTo(page) {
    if (!pages[page]) page = 'writer';
    currentPage = page;

    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });

    const main = document.getElementById('main-content');
    main.innerHTML = '';
    pages[page](main);

    closeMobileNav();

    if (window.location.hash.slice(1) !== page) {
        history.replaceState(null, '', '#' + page);
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(el.dataset.page);
        });
    });

    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1) || 'writer';
        navigateTo(hash);
    });
}

// ---- Mobile Nav ----
function setupMobileNav() {
    const toggle = document.getElementById('menu-toggle');
    const overlay = document.getElementById('sidebar-overlay');

    toggle.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
        overlay.classList.toggle('visible');
    });

    overlay.addEventListener('click', closeMobileNav);
}

function closeMobileNav() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('visible');
}

// ---- Settings ----
function setupSettings() {
    const modal = document.getElementById('settings-modal');
    const openBtn = document.getElementById('settings-btn');
    const closeBtn = document.getElementById('settings-close');
    const saveBtn = document.getElementById('save-settings');
    const groqInput = document.getElementById('groq-key');
    const geminiInput = document.getElementById('gemini-key');

    openBtn.addEventListener('click', () => {
        modal.classList.add('visible');
        groqInput.value = localStorage.getItem('groq_api_key') || '';
        geminiInput.value = localStorage.getItem('gemini_api_key') || '';
    });

    closeBtn.addEventListener('click', () => modal.classList.remove('visible'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('visible');
    });

    // Toggle visibility for both key fields
    document.querySelectorAll('.toggle-key-vis').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            if (input) input.type = input.type === 'password' ? 'text' : 'password';
        });
    });

    saveBtn.addEventListener('click', () => {
        const groqKey = groqInput.value.trim();
        const geminiKey = geminiInput.value.trim();
        let saved = false;

        // Save Groq key
        if (groqKey) {
            localStorage.setItem('groq_api_key', groqKey);
            initGroq(groqKey);
            saved = true;
        } else {
            localStorage.removeItem('groq_api_key');
            initGroq(null);
        }

        // Save Gemini key
        if (geminiKey) {
            localStorage.setItem('gemini_api_key', geminiKey);
            initGemini(geminiKey);
            saved = true;
        } else {
            localStorage.removeItem('gemini_api_key');
            initGemini(null);
        }

        if (saved) {
            showToast('Pengaturan berhasil disimpan!', 'success');
            modal.classList.remove('visible');
            if (currentPage) navigateTo(currentPage);
        } else {
            showToast('Semua API Key dihapus', 'info');
            modal.classList.remove('visible');
        }
    });
}

function loadSettings() {
    const groqKey = localStorage.getItem('groq_api_key');
    const geminiKey = localStorage.getItem('gemini_api_key');
    if (groqKey) initGroq(groqKey);
    if (geminiKey) initGemini(geminiKey);
}

// ---- Repurpose Handler ----
function setupRepurpose() {
    window.addEventListener('repurpose-content', (e) => {
        const { prompt, mode } = e.detail;

        // Navigate to Content Writer
        navigateTo('writer');

        // After a small delay (to allow DOM to render), fill the prompt and set mode
        setTimeout(() => {
            const textarea = document.getElementById('writer-prompt');
            if (textarea) {
                textarea.value = prompt;
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
                textarea.focus();
            }

            // Set the correct mode toggle
            const targetToggle = mode === 'video'
                ? document.getElementById('toggle-video')
                : document.getElementById('toggle-post');
            if (targetToggle) targetToggle.click();

            showToast('Naskah siap di-daur ulang! Klik generate untuk memulai.', 'success', 4000);
        }, 100);
    });
}
