/**
 * Tool 1: AI Content Writer
 */
import { generateContent, isGroqReady } from './groq-client.js';
import { saveContent } from '../db/vault.js';
import { showToast } from '../components/toast.js';

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function renderContentWriter(container) {
    let currentMode = 'post';
    let currentResult = null;

    container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">AI Content Writer</h1>
      <p class="page-subtitle">Pabrik naskah konten untuk media sosial brand artisan Anda</p>
    </div>

    <!-- Mode Toggle -->
    <div class="toggle-group" style="max-width: 400px; margin-bottom: var(--space-xl);">
      <button class="toggle-option active" data-mode="post" id="toggle-post">📝 Postingan / Carousel</button>
      <button class="toggle-option" data-mode="video" id="toggle-video">🎬 Video / Reels</button>
    </div>

    <!-- Input Area -->
    <div class="card" style="margin-bottom: var(--space-xl);">
      <div class="chat-input-wrapper">
        <textarea class="chat-input" id="writer-prompt" placeholder="Ceritakan apa yang ingin Anda buat, misal: 'Konten tentang sabun oatmeal & madu untuk kulit sensitif' atau 'Reels proses pembuatan lip balm vanilla'..." rows="2"></textarea>
        <button class="chat-send-btn" id="writer-generate" title="Generate">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
        </button>
      </div>
      ${!isGroqReady() ? '<p style="color:var(--accent-warm);font-size:var(--font-xs);margin-top:var(--space-sm);">⚠️ Groq API Key belum diatur. Buka Pengaturan terlebih dahulu.</p>' : ''}
    </div>

    <!-- Results -->
    <div id="writer-results" style="display:none;">
      <div class="section-divider">Hasil Generate</div>
      <div class="cards-stack" id="writer-cards"></div>
      <div style="margin-top: var(--space-xl); text-align: center;">
        <button class="btn btn-primary btn-large" id="writer-save" style="min-width: 280px;">💾 Simpan ke Arsip Vault</button>
      </div>
    </div>

    <!-- Loading State -->
    <div id="writer-loading" style="display:none; text-align:center; padding:var(--space-2xl);">
      <div class="loading-spinner" style="margin:0 auto;width:40px;height:40px;border-width:4px;"></div>
      <p style="margin-top:var(--space-md);color:var(--text-muted);">Sedang meracik naskah...</p>
      <p style="color:var(--text-muted);font-size:var(--font-xs);">Biasanya memakan waktu 5-15 detik</p>
    </div>
  `;

    // Mode toggle
    const toggleBtns = container.querySelectorAll('.toggle-option');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
        });
    });

    // Auto-resize textarea
    const textarea = document.getElementById('writer-prompt');
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    });

    // Generate button
    const generateBtn = document.getElementById('writer-generate');
    generateBtn.addEventListener('click', () => handleGenerate());

    // Enter to send (Shift+Enter for newline)
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGenerate();
        }
    });

    async function handleGenerate() {
        const prompt = textarea.value.trim();
        if (!prompt) return showToast('Masukkan deskripsi konten terlebih dahulu', 'error');
        if (!isGroqReady()) return showToast('Groq API Key belum diatur. Buka Pengaturan.', 'error');

        // Show loading
        document.getElementById('writer-results').style.display = 'none';
        document.getElementById('writer-loading').style.display = 'block';
        generateBtn.disabled = true;

        try {
            const result = await generateContent(prompt, currentMode);

            // Check if rejected
            if (result.rejected) {
                showToast(result.message || 'Topik di luar cakupan bisnis handmade.', 'error', 5000);
                document.getElementById('writer-loading').style.display = 'none';
                generateBtn.disabled = false;
                return;
            }

            currentResult = result;
            renderResults(result, currentMode);
        } catch (err) {
            showToast(err.message, 'error', 5000);
        } finally {
            document.getElementById('writer-loading').style.display = 'none';
            generateBtn.disabled = false;
        }
    }

    function renderResults(data, mode) {
        const cardsContainer = document.getElementById('writer-cards');
        const resultsSection = document.getElementById('writer-results');

        if (mode === 'post') {
            cardsContainer.innerHTML = `
        ${makeCard('Hook', data.hook, 'hook')}
        ${(data.slides || []).map((s, i) => makeCard(`Slide ${i + 1}`, s, `slide-${i}`)).join('')}
        ${makeCard('Call to Action', data.cta, 'cta')}
        ${makeCard('Caption', data.caption, 'caption')}
      `;
        } else {
            cardsContainer.innerHTML = `
        ${makeVideoCard('Hook', data.hook_screen, data.hook_vo, 'hook')}
        ${makeVideoCard('Body', data.body_screen, data.body_vo, 'body')}
        ${makeVideoCard('Call to Action', data.cta_screen, data.cta_vo, 'cta')}
        ${makeCard('Caption', data.caption, 'caption')}
      `;
        }

        resultsSection.style.display = 'block';

        // Animate cards in
        cardsContainer.querySelectorAll('.card').forEach((card, i) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(12px)';
            setTimeout(() => {
                card.style.transition = 'all 0.4s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, i * 100);
        });

        attachCopyHandlers(cardsContainer);

        // Save button
        document.getElementById('writer-save').onclick = async () => {
            try {
                const isiData = mode === 'post'
                    ? { hook: data.hook, slides: data.slides, cta: data.cta, caption: data.caption }
                    : { hook: `${data.hook_screen}\n---\n${data.hook_vo}`, body: `${data.body_screen}\n---\n${data.body_vo}`, cta: `${data.cta_screen}\n---\n${data.cta_vo}`, caption: data.caption, hook_screen: data.hook_screen, hook_vo: data.hook_vo, body_screen: data.body_screen, body_vo: data.body_vo, cta_screen: data.cta_screen, cta_vo: data.cta_vo };

                await saveContent({
                    tipe: mode === 'post' ? 'post' : 'video',
                    judul_otomatis: data.judul || textarea.value.substring(0, 60),
                    isi_data: isiData
                });
                showToast('Naskah berhasil disimpan ke Arsip Vault! 🗄️', 'success');
            } catch (err) {
                showToast('Gagal menyimpan: ' + err.message, 'error');
            }
        };

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function makeCard(label, content, id) {
        return `
      <div class="card" id="card-${id}">
        <div class="card-header">
          <span class="card-label">${label}</span>
          <button class="btn-copy" data-copy-target="content-${id}">📋 Copy</button>
        </div>
        <div class="card-content" contenteditable="true" id="content-${id}">${escapeHtml(content || '')}</div>
      </div>
    `;
    }

    function makeVideoCard(label, screenText, voText, id) {
        return `
      <div class="card" id="card-${id}">
        <div class="card-header">
          <span class="card-label">${label}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);">
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-sm);">
              <span style="font-size:var(--font-xs);color:var(--accent-lavender);font-weight:600;">🖥️ On-Screen Text</span>
              <button class="btn-copy" data-copy-target="screen-${id}">📋</button>
            </div>
            <div class="card-content" contenteditable="true" id="screen-${id}" style="background:var(--bg-primary);padding:var(--space-md);border-radius:var(--radius-md);min-height:80px;">${escapeHtml(screenText || '')}</div>
          </div>
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-sm);">
              <span style="font-size:var(--font-xs);color:var(--accent-warm);font-weight:600;">🎙️ VO Script</span>
              <button class="btn-copy" data-copy-target="vo-${id}">📋</button>
            </div>
            <div class="card-content" contenteditable="true" id="vo-${id}" style="background:var(--bg-primary);padding:var(--space-md);border-radius:var(--radius-md);min-height:80px;">${escapeHtml(voText || '')}</div>
          </div>
        </div>
      </div>
    `;
    }

    function attachCopyHandlers(container) {
        container.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', async () => {
                const targetId = btn.dataset.copyTarget;
                const target = document.getElementById(targetId);
                if (!target) return;

                try {
                    await navigator.clipboard.writeText(target.textContent);
                    btn.textContent = '✓ Copied';
                    btn.classList.add('copied');
                    setTimeout(() => {
                        btn.textContent = '📋 Copy';
                        btn.classList.remove('copied');
                    }, 2000);
                } catch {
                    showToast('Gagal menyalin teks', 'error');
                }
            });
        });
    }
}
