/**
 * Tool 3: Studio Teleprompter
 */
import { openVaultSheet } from '../components/bottom-sheet.js';
import { showToast } from '../components/toast.js';

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function renderTeleprompter(container) {
    let selectedItem = null;
    let scrollInterval = null;
    let scrollSpeed = 2;
    let isPaused = false;

    container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Studio Teleprompter</h1>
      <p class="page-subtitle">Asisten dubbing — baca naskah di layar penuh saat merekam voice over</p>
    </div>

    <!-- Select Script -->
    <div id="prompter-select" class="card" style="text-align:center;padding:var(--space-2xl);">
      <div style="font-size:2.5rem;margin-bottom:var(--space-md);opacity:0.6;">🎙️</div>
      <p style="color:var(--text-secondary);margin-bottom:var(--space-lg);">Pilih naskah dari arsip untuk ditampilkan di teleprompter</p>
      <button class="btn btn-primary btn-large" id="prompter-pick-btn">📂 Pilih Naskah dari Arsip</button>
    </div>

    <!-- Preview -->
    <div id="prompter-preview" style="display:none;">
      <div class="card" style="margin-bottom:var(--space-lg);">
        <div class="card-header">
          <span class="card-label" id="prompter-preview-title">Naskah</span>
          <button class="btn btn-ghost" id="prompter-change-btn">Ganti Naskah</button>
        </div>
        <div class="card-content" id="prompter-preview-text" style="max-height:400px;overflow-y:auto;white-space:pre-wrap;line-height:1.8;"></div>
      </div>
      <div style="text-align:center;">
        <button class="btn btn-primary btn-large" id="prompter-start-btn">🎬 Mulai Prompter</button>
      </div>
    </div>

    <!-- Fullscreen Prompter -->
    <div class="prompter-fullscreen" id="prompter-fullscreen">
      <div class="prompter-text-area" id="prompter-scroll-area">
        <div class="prompter-text" id="prompter-live-text"></div>
      </div>
      <div class="prompter-controls">
        <button class="prompter-btn" id="prompter-exit" title="Keluar">✕</button>
        <button class="prompter-btn" id="prompter-slower" title="Lebih lambat">−</button>
        <span class="speed-display" id="speed-display">2.0x</span>
        <button class="prompter-btn" id="prompter-faster" title="Lebih cepat">+</button>
        <button class="prompter-btn" id="prompter-pause" title="Pause/Resume">⏸</button>
      </div>
    </div>
  `;

    // Pick script
    document.getElementById('prompter-pick-btn').addEventListener('click', () => {
        openVaultSheet('🎬 Pilih Naskah Video', handleScriptSelected, null, 'video');
    });

    document.getElementById('prompter-change-btn').addEventListener('click', () => {
        openVaultSheet('🎬 Pilih Naskah Video', handleScriptSelected, null, 'video');
    });

    function handleScriptSelected(item) {
        selectedItem = item;
        const fullText = buildFullText(item);

        document.getElementById('prompter-select').style.display = 'none';
        document.getElementById('prompter-preview').style.display = 'block';
        document.getElementById('prompter-preview-title').textContent = item.judul_otomatis || 'Naskah';
        document.getElementById('prompter-preview-text').textContent = fullText;

        showToast('Naskah dipilih: ' + (item.judul_otomatis || 'Tanpa judul'), 'success');
    }

    // Start prompter
    document.getElementById('prompter-start-btn').addEventListener('click', () => {
        if (!selectedItem) return;
        enterFullscreen();
    });

    function handleFullscreenKeys(e) {
        if (e.key === 'Escape') exitFullscreen();
        if (e.key === ' ') {
            e.preventDefault();
            isPaused = !isPaused;
            const pauseBtn = document.getElementById('prompter-pause');
            if (pauseBtn) pauseBtn.textContent = isPaused ? '▶' : '⏸';
        }
    }

    function enterFullscreen() {
        const fullText = buildFullText(selectedItem);
        const fullscreenEl = document.getElementById('prompter-fullscreen');
        const liveText = document.getElementById('prompter-live-text');

        liveText.textContent = fullText;
        fullscreenEl.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Try native fullscreen
        if (fullscreenEl.requestFullscreen) {
            fullscreenEl.requestFullscreen().catch(() => { });
        }

        isPaused = false;
        scrollSpeed = 2;
        updateSpeedDisplay();
        startScrolling();

        // Add keyboard controls only while in fullscreen
        document.addEventListener('keydown', handleFullscreenKeys);
    }

    function startScrolling() {
        stopScrolling();
        const scrollArea = document.getElementById('prompter-scroll-area');
        scrollInterval = setInterval(() => {
            if (!isPaused) {
                scrollArea.scrollTop += scrollSpeed * 0.5;
            }
        }, 16); // ~60fps
    }

    function stopScrolling() {
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
    }

    // Controls
    document.getElementById('prompter-exit').addEventListener('click', () => {
        exitFullscreen();
    });

    document.getElementById('prompter-pause').addEventListener('click', () => {
        isPaused = !isPaused;
        document.getElementById('prompter-pause').textContent = isPaused ? '▶' : '⏸';
    });

    document.getElementById('prompter-slower').addEventListener('click', () => {
        scrollSpeed = Math.max(0.5, scrollSpeed - 0.5);
        updateSpeedDisplay();
    });

    document.getElementById('prompter-faster').addEventListener('click', () => {
        scrollSpeed = Math.min(8, scrollSpeed + 0.5);
        updateSpeedDisplay();
    });

    function updateSpeedDisplay() {
        document.getElementById('speed-display').textContent = scrollSpeed.toFixed(1) + 'x';
    }

    function exitFullscreen() {
        stopScrolling();
        const fullscreenEl = document.getElementById('prompter-fullscreen');
        fullscreenEl.classList.remove('active');
        document.body.style.overflow = '';
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }
        // Remove keyboard controls when exiting fullscreen
        document.removeEventListener('keydown', handleFullscreenKeys);
    }

    function buildFullText(item) {
        if (!item?.isi_data) return '';
        const d = item.isi_data;
        const parts = [];

        if (item.tipe === 'video') {
            // For video, use VO script for teleprompter
            if (d.hook_vo) parts.push('[ HOOK ]\n' + d.hook_vo);
            else if (d.hook) parts.push('[ HOOK ]\n' + d.hook);

            if (d.body_vo) parts.push('\n[ BODY ]\n' + d.body_vo);
            else if (d.body) parts.push('\n[ BODY ]\n' + d.body);

            if (d.cta_vo) parts.push('\n[ CTA ]\n' + d.cta_vo);
            else if (d.cta) parts.push('\n[ CTA ]\n' + d.cta);
        } else {
            // For post, combine all slides
            if (d.hook) parts.push('[ HOOK ]\n' + d.hook);
            if (d.slides && d.slides.length) {
                d.slides.forEach((s, i) => parts.push(`\n[ SLIDE ${i + 1} ]\n${s}`));
            }
            if (d.cta) parts.push('\n[ CTA ]\n' + d.cta);
        }

        return parts.join('\n\n');
    }
}
