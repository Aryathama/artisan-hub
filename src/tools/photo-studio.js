/**
 * Tool 2: Magic Photo Studio
 * Mode A — Filter Enhancement (client-side Canvas)
 * Mode B — AI Scene Enhancement (Gemini, experimental)
 */
import { enhanceImage, isGeminiReady } from './gemini-client.js';
import { showToast } from '../components/toast.js';

export function renderPhotoStudio(container) {
    let currentMode = 'filter';
    let originalFile = null;
    let originalUrl = null;

    // Filter state
    let filters = { brightness: 100, contrast: 100, saturation: 100, warmth: 0, sharpness: 0 };

    // AI state
    let aiResultUrl = null;

    container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Magic Photo Studio</h1>
      <p class="page-subtitle">Percantik foto produk Anda — agar layak posting walaupun tanpa alat fotografi profesional</p>
    </div>

    <!-- Mode Toggle -->
    <div class="toggle-group" style="max-width: 480px; margin-bottom: var(--space-xl);">
      <button class="toggle-option active" data-mode="filter" id="toggle-filter">🎨 Filter & Koreksi</button>
      <button class="toggle-option" data-mode="ai" id="toggle-ai">✨ AI Scene Edit <span style="font-size:0.65rem;opacity:0.7;margin-left:4px;">BETA</span></button>
    </div>

    <!-- Upload Area (shared) -->
    <div id="studio-upload-section">
      <div class="upload-area" id="studio-upload">
        <input type="file" id="studio-file" accept="image/*" style="display:none;" />
        <div class="upload-icon">📸</div>
        <p class="upload-text">Klik atau seret foto produk ke sini</p>
        <p class="upload-hint">Gunakan foto asli produk Anda — hasil terbaik dengan pencahayaan cukup</p>
      </div>
    </div>

    <!-- ========== MODE A: FILTER ========== -->
    <div id="studio-filter-mode" style="display:none;">
      <div class="card" style="margin-bottom: var(--space-lg);">
        <div style="position:relative; border-radius:var(--radius-md); overflow:hidden; background:var(--bg-primary); text-align:center;">
          <canvas id="filter-canvas" style="max-width:100%; max-height:450px;"></canvas>
        </div>
      </div>

      <!-- Filter Sliders -->
      <div class="card" style="margin-bottom: var(--space-lg);">
        <div class="card-header">
          <span class="card-label">Pengaturan Filter</span>
          <button class="btn btn-ghost" id="filter-reset">🔄 Reset</button>
        </div>
        <div class="filter-sliders">
          <div class="filter-row">
            <label>☀️ Kecerahan</label>
            <input type="range" min="30" max="200" value="100" id="slider-brightness" class="filter-slider" />
            <span class="filter-value" id="val-brightness">100%</span>
          </div>
          <div class="filter-row">
            <label>🔲 Kontras</label>
            <input type="range" min="30" max="200" value="100" id="slider-contrast" class="filter-slider" />
            <span class="filter-value" id="val-contrast">100%</span>
          </div>
          <div class="filter-row">
            <label>🎨 Saturasi</label>
            <input type="range" min="0" max="200" value="100" id="slider-saturation" class="filter-slider" />
            <span class="filter-value" id="val-saturation">100%</span>
          </div>
          <div class="filter-row">
            <label>🌡️ Kehangatan</label>
            <input type="range" min="-50" max="50" value="0" id="slider-warmth" class="filter-slider" />
            <span class="filter-value" id="val-warmth">0</span>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:var(--space-md);justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-primary btn-large" id="filter-download">⬇️ Download Hasil</button>
        <button class="btn btn-secondary btn-large" id="filter-new-photo">📸 Ganti Foto</button>
      </div>
    </div>

    <!-- ========== MODE B: AI SCENE EDIT ========== -->
    <div id="studio-ai-mode" style="display:none;">
      <!-- Disclaimer -->
      <div class="card" style="margin-bottom:var(--space-lg); border-left: 3px solid var(--accent-warm);">
        <p style="font-size:var(--font-sm); color:var(--text-secondary); line-height:1.7;">
          ⚠️ <strong>Fitur Eksperimental</strong> — AI akan mengedit background & lingkungan foto, namun <strong>produk utama tetap dipertahankan</strong>. 
          Hasil bisa bervariasi. Tulis instruksi yang spesifik dan jelas untuk hasil terbaik.
        </p>
      </div>

      <!-- Image Preview -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <div style="border-radius:var(--radius-md); overflow:hidden; background:var(--bg-primary); text-align:center;">
          <img id="ai-original-preview" style="max-width:100%; max-height:350px; object-fit:contain;" alt="Original" />
        </div>
      </div>

      <!-- Prompt Form -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <div class="card-header">
          <span class="card-label">Instruksi Editing</span>
        </div>
        <textarea class="textarea-styled" id="ai-prompt" rows="4" placeholder="Jelaskan perubahan yang Anda inginkan, contoh:&#10;• Ganti background jadi meja kayu estetik dengan pencahayaan hangat&#10;• Buat latar belakang minimalis putih bersih, tambahkan bayangan lembut&#10;• Ubah setting jadi flat-lay di atas kain linen krem dengan daun kering"></textarea>
        <div style="margin-top:var(--space-md); display:flex; gap:var(--space-md); flex-wrap:wrap;">
          <button class="btn btn-primary btn-large" id="ai-enhance-btn" style="flex:1; min-width:200px;">✨ Enhance dengan AI</button>
          <button class="btn btn-secondary btn-large" id="ai-new-photo">📸 Ganti Foto</button>
        </div>
        ${!isGeminiReady() ? '<p style="color:var(--accent-warm);font-size:var(--font-xs);margin-top:var(--space-sm);">⚠️ API Key belum diatur. Buka Pengaturan terlebih dahulu.</p>' : ''}
      </div>

      <!-- AI Loading -->
      <div id="ai-loading" style="display:none;">
        <div class="card" style="text-align:center; padding:var(--space-2xl);">
          <div class="loading-spinner" style="margin:0 auto;width:48px;height:48px;border-width:4px;"></div>
          <p style="margin-top:var(--space-md);color:var(--text-secondary);font-weight:500;">AI sedang mengedit foto Anda...</p>
          <p style="color:var(--text-muted);font-size:var(--font-xs);margin-top:var(--space-xs);">Biasanya memakan waktu 15-30 detik</p>
        </div>
      </div>

      <!-- AI Result -->
      <div id="ai-result" style="display:none;">
        <div class="section-divider">Hasil AI Enhancement</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-md); margin-bottom:var(--space-lg);">
          <div class="card" style="padding:var(--space-sm); text-align:center;">
            <p style="font-size:var(--font-xs);color:var(--text-muted);margin-bottom:var(--space-sm);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Before</p>
            <div style="border-radius:var(--radius-sm);overflow:hidden;background:var(--bg-primary);">
              <img id="ai-before-img" style="width:100%;object-fit:contain;max-height:300px;" alt="Before" />
            </div>
          </div>
          <div class="card" style="padding:var(--space-sm); text-align:center; border-color:var(--accent-gold);">
            <p style="font-size:var(--font-xs);color:var(--accent-gold);margin-bottom:var(--space-sm);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">After ✨</p>
            <div style="border-radius:var(--radius-sm);overflow:hidden;background:var(--bg-primary);">
              <img id="ai-after-img" style="width:100%;object-fit:contain;max-height:300px;" alt="After" />
            </div>
          </div>
        </div>
        <div id="ai-text-response" style="display:none;" class="card" style="margin-bottom:var(--space-lg);">
          <p style="font-size:var(--font-sm);color:var(--text-secondary);line-height:1.7;" id="ai-response-text"></p>
        </div>
        <div style="display:flex;gap:var(--space-md);justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary btn-large" id="ai-download">⬇️ Download Hasil</button>
          <button class="btn btn-secondary btn-large" id="ai-retry">🔄 Coba Lagi</button>
        </div>
      </div>
    </div>
  `;

    // ====== Mode Toggle ======
    const toggleBtns = container.querySelectorAll('.toggle-option');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            updateModeVisibility();
        });
    });

    function updateModeVisibility() {
        const filterMode = document.getElementById('studio-filter-mode');
        const aiMode = document.getElementById('studio-ai-mode');
        const uploadSection = document.getElementById('studio-upload-section');

        if (!originalFile) {
            filterMode.style.display = 'none';
            aiMode.style.display = 'none';
            uploadSection.style.display = 'block';
            return;
        }

        uploadSection.style.display = 'none';
        if (currentMode === 'filter') {
            filterMode.style.display = 'block';
            aiMode.style.display = 'none';
            drawFilteredImage();
        } else {
            filterMode.style.display = 'none';
            aiMode.style.display = 'block';
        }
    }

    // ====== Upload ======
    const uploadArea = document.getElementById('studio-upload');
    const fileInput = document.getElementById('studio-file');

    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handleFile(file);
        else showToast('File harus berupa gambar', 'error');
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFile(e.target.files[0]);
    });

    function handleFile(file) {
        originalFile = file;
        if (originalUrl) URL.revokeObjectURL(originalUrl);
        originalUrl = URL.createObjectURL(file);

        // Set AI preview
        document.getElementById('ai-original-preview').src = originalUrl;

        // Reset states
        resetFilters();
        document.getElementById('ai-result').style.display = 'none';
        document.getElementById('ai-loading').style.display = 'none';

        updateModeVisibility();

        // Load image for canvas
        loadImageToCanvas();
    }

    // ====== Change Photo buttons ======
    document.getElementById('filter-new-photo').addEventListener('click', resetAll);
    document.getElementById('ai-new-photo').addEventListener('click', resetAll);

    function resetAll() {
        if (originalUrl) URL.revokeObjectURL(originalUrl);
        if (aiResultUrl) URL.revokeObjectURL(aiResultUrl);
        originalFile = null;
        originalUrl = null;
        aiResultUrl = null;
        fileInput.value = '';
        resetFilters();
        document.getElementById('ai-result').style.display = 'none';
        document.getElementById('ai-loading').style.display = 'none';
        updateModeVisibility();
    }

    // ====== FILTER MODE ======
    const sourceImage = new Image();
    let canvasCtx = null;

    function loadImageToCanvas() {
        sourceImage.onload = () => drawFilteredImage();
        sourceImage.src = originalUrl;
    }

    function drawFilteredImage() {
        const canvas = document.getElementById('filter-canvas');
        if (!canvas || !sourceImage.naturalWidth) return;

        // Size canvas to image (max 800px wide)
        const scale = Math.min(1, 800 / sourceImage.naturalWidth);
        canvas.width = sourceImage.naturalWidth * scale;
        canvas.height = sourceImage.naturalHeight * scale;

        canvasCtx = canvas.getContext('2d');

        // Build CSS filter string
        let filterStr = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;

        // Warmth: apply via hue-rotate + sepia trick
        if (filters.warmth > 0) {
            filterStr += ` sepia(${filters.warmth * 0.6}%)`;
        } else if (filters.warmth < 0) {
            filterStr += ` hue-rotate(${filters.warmth * 1.2}deg)`;
        }

        canvasCtx.filter = filterStr;
        canvasCtx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
        canvasCtx.filter = 'none';
    }

    // Slider handlers
    const sliderIds = ['brightness', 'contrast', 'saturation', 'warmth'];
    sliderIds.forEach(id => {
        const slider = document.getElementById(`slider-${id}`);
        const valDisplay = document.getElementById(`val-${id}`);
        if (!slider) return;

        slider.addEventListener('input', () => {
            const val = parseInt(slider.value);
            filters[id] = val;
            valDisplay.textContent = id === 'warmth' ? val : val + '%';
            drawFilteredImage();
        });
    });

    // Reset filters
    document.getElementById('filter-reset').addEventListener('click', () => {
        resetFilters();
        drawFilteredImage();
        showToast('Filter direset ke default', 'info');
    });

    function resetFilters() {
        filters = { brightness: 100, contrast: 100, saturation: 100, warmth: 0, sharpness: 0 };
        sliderIds.forEach(id => {
            const slider = document.getElementById(`slider-${id}`);
            const valDisplay = document.getElementById(`val-${id}`);
            if (!slider) return;
            slider.value = filters[id];
            valDisplay.textContent = id === 'warmth' ? filters[id] : filters[id] + '%';
        });
    }

    // Download filtered
    document.getElementById('filter-download').addEventListener('click', () => {
        const canvas = document.getElementById('filter-canvas');
        if (!canvas) return;
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `artisan-enhanced-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Foto berhasil diunduh!', 'success');
        }, 'image/png');
    });

    // ====== AI MODE ======
    document.getElementById('ai-enhance-btn').addEventListener('click', handleAIEnhance);

    async function handleAIEnhance() {
        const prompt = document.getElementById('ai-prompt').value.trim();
        if (!prompt) return showToast('Tulis instruksi editing terlebih dahulu', 'error');
        if (!isGeminiReady()) return showToast('API Key belum diatur. Buka Pengaturan.', 'error');
        if (!originalFile) return showToast('Upload foto terlebih dahulu', 'error');

        // Show loading
        document.getElementById('ai-loading').style.display = 'block';
        document.getElementById('ai-result').style.display = 'none';
        document.getElementById('ai-enhance-btn').disabled = true;

        try {
            const result = await enhanceImage(originalFile, prompt);

            // Create image URL from base64
            const byteChars = atob(result.imageBase64);
            const byteArr = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) {
                byteArr[i] = byteChars.charCodeAt(i);
            }
            const blob = new Blob([byteArr], { type: result.mimeType });
            if (aiResultUrl) URL.revokeObjectURL(aiResultUrl);
            aiResultUrl = URL.createObjectURL(blob);

            // Display result
            document.getElementById('ai-before-img').src = originalUrl;
            document.getElementById('ai-after-img').src = aiResultUrl;

            // Show text response if any
            const textContainer = document.getElementById('ai-text-response');
            if (result.text) {
                document.getElementById('ai-response-text').textContent = result.text;
                textContainer.style.display = 'block';
            } else {
                textContainer.style.display = 'none';
            }

            document.getElementById('ai-result').style.display = 'block';
            document.getElementById('ai-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
            showToast('Foto berhasil di-enhance!', 'success');
        } catch (err) {
            showToast(err.message, 'error', 5000);
        } finally {
            document.getElementById('ai-loading').style.display = 'none';
            document.getElementById('ai-enhance-btn').disabled = false;
        }
    }

    // AI Download
    document.getElementById('ai-download').addEventListener('click', () => {
        if (!aiResultUrl) return;
        const a = document.createElement('a');
        a.href = aiResultUrl;
        a.download = `artisan-ai-enhanced-${Date.now()}.png`;
        a.click();
        showToast('Foto berhasil diunduh!', 'success');
    });

    // AI Retry
    document.getElementById('ai-retry').addEventListener('click', () => {
        document.getElementById('ai-result').style.display = 'none';
        document.getElementById('ai-prompt').focus();
    });
}
