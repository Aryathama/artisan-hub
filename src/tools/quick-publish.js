/**
 * Tool 4: Quick Publish — Final check & share to social media
 */
import { openVaultSheet } from '../components/bottom-sheet.js';
import { showToast } from '../components/toast.js';

export function renderQuickPublish(container) {
    let mediaFile = null;
    let mediaUrl = null;
    let selectedCaption = '';

    container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Quick Publish</h1>
      <p class="page-subtitle">Pemeriksaan final dan distribusi konten ke media sosial</p>
    </div>

    <div style="display:grid;gap:var(--space-xl);">
      <!-- Step 1: Upload media -->
      <div class="card">
        <div class="card-header">
          <span class="card-label">Langkah 1 — Upload Media</span>
        </div>
        <div id="publish-upload-area">
          <div class="upload-area" id="publish-upload">
            <input type="file" id="publish-file" accept="image/*,video/*" style="display:none;" />
            <div class="upload-icon">🖼️</div>
            <p class="upload-text">Upload foto atau video hasil akhir Anda</p>
            <p class="upload-hint">Hasil dari Canva, CapCut, atau editing lainnya</p>
          </div>
        </div>
        <div id="publish-media-preview" style="display:none;">
          <div class="media-preview-wrapper" id="publish-preview-wrapper">
            <!-- Media will be inserted here -->
          </div>
          <div style="text-align:center;margin-top:var(--space-md);">
            <button class="btn btn-ghost" id="publish-remove-media">🔄 Ganti Media</button>
          </div>
        </div>
      </div>

      <!-- Step 2: Select caption -->
      <div class="card">
        <div class="card-header">
          <span class="card-label">Langkah 2 — Caption</span>
          <button class="btn btn-secondary" id="publish-pick-caption">📂 Ambil Caption dari Arsip</button>
        </div>
        <textarea class="textarea-styled" id="publish-caption" placeholder="Tulis atau pilih caption dari arsip..." rows="6"></textarea>
      </div>

      <!-- Step 3: Share -->
      <div class="card" style="text-align:center;">
        <div class="card-header" style="justify-content:center;">
          <span class="card-label">Langkah 3 — Distribusi</span>
        </div>
        <p style="color:var(--text-muted);font-size:var(--font-sm);margin-bottom:var(--space-lg);">Caption akan disalin ke clipboard, lalu aplikasi sosmed akan dibuka</p>
        <div style="display:flex;gap:var(--space-md);justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary btn-large" id="publish-share">🚀 Share ke Instagram / TikTok</button>
          <button class="btn btn-secondary btn-large" id="publish-copy-only">📋 Copy Caption Saja</button>
        </div>
      </div>
    </div>
  `;

    // Upload handlers
    const uploadArea = document.getElementById('publish-upload');
    const fileInput = document.getElementById('publish-file');

    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
            handleMedia(file);
        } else {
            showToast('File harus berupa gambar atau video', 'error');
        }
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleMedia(e.target.files[0]);
    });

    function handleMedia(file) {
        mediaFile = file;
        if (mediaUrl) URL.revokeObjectURL(mediaUrl);
        mediaUrl = URL.createObjectURL(file);

        const wrapper = document.getElementById('publish-preview-wrapper');
        if (file.type.startsWith('video/')) {
            wrapper.innerHTML = `<video src="${mediaUrl}" controls muted playsinline style="max-width:100%;max-height:400px;"></video>`;
        } else {
            wrapper.innerHTML = `<img src="${mediaUrl}" alt="Preview" style="max-width:100%;max-height:400px;object-fit:contain;" />`;
        }

        document.getElementById('publish-upload-area').style.display = 'none';
        document.getElementById('publish-media-preview').style.display = 'block';
    }

    // Remove media
    document.getElementById('publish-remove-media').addEventListener('click', () => {
        if (mediaUrl) URL.revokeObjectURL(mediaUrl);
        mediaFile = null;
        mediaUrl = null;
        fileInput.value = '';
        document.getElementById('publish-upload-area').style.display = 'block';
        document.getElementById('publish-media-preview').style.display = 'none';
    });

    // Pick caption from vault
    document.getElementById('publish-pick-caption').addEventListener('click', () => {
        openVaultSheet('📂 Ambil Caption dari Arsip', (item) => {
            const caption = item.isi_data?.caption || '';
            document.getElementById('publish-caption').value = caption;
            showToast('Caption dimuat dari arsip', 'success');
        });
    });

    // Copy caption only
    document.getElementById('publish-copy-only').addEventListener('click', async () => {
        const caption = document.getElementById('publish-caption').value.trim();
        if (!caption) return showToast('Caption kosong!', 'error');
        try {
            await navigator.clipboard.writeText(caption);
            showToast('Caption berhasil disalin ke clipboard! 📋', 'success');
        } catch {
            showToast('Gagal menyalin', 'error');
        }
    });

    // Share button
    document.getElementById('publish-share').addEventListener('click', async () => {
        const caption = document.getElementById('publish-caption').value.trim();
        if (!caption) return showToast('Caption kosong!', 'error');

        // Try Web Share API
        if (navigator.share) {
            try {
                const shareData = { text: caption };

                // If we have a media file and the browser supports file sharing
                if (mediaFile && navigator.canShare) {
                    const fileShareData = { ...shareData, files: [mediaFile] };
                    if (navigator.canShare(fileShareData)) {
                        shareData.files = [mediaFile];
                    }
                }

                await navigator.share(shareData);
                showToast('Konten berhasil dibagikan!', 'success');
            } catch (err) {
                if (err.name === 'AbortError') return; // User cancelled
                // Fallback to clipboard
                await fallbackCopy(caption);
            }
        } else {
            // No Web Share API — fallback
            await fallbackCopy(caption);
        }
    });

    async function fallbackCopy(caption) {
        try {
            await navigator.clipboard.writeText(caption);
            showToast('Caption disalin ke clipboard! Buka aplikasi sosmed Anda untuk paste.', 'info', 5000);
        } catch {
            // Last resort — select the textarea
            const textarea = document.getElementById('publish-caption');
            textarea.select();
            document.execCommand('copy');
            showToast('Caption disalin. Buka Instagram/TikTok dan paste.', 'info', 5000);
        }
    }
}
