/**
 * Content Vault — Browse all saved content with status management
 */
import { getAllContent, updateContentStatus, deleteContent, updateContent } from '../db/vault.js';
import { showToast } from '../components/toast.js';

const STATUS_CONFIG = {
    draft: { label: 'Draft', color: '#a78bfa', icon: '📝' },
    ready: { label: 'Siap Publish', color: '#34d399', icon: '✅' },
    published: { label: 'Sudah Publish', color: '#60a5fa', icon: '🚀' }
};

const STATUS_ORDER = ['draft', 'ready', 'published'];

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function renderContentVault(container) {
    let currentFilter = 'all';
    let allItems = [];
    let currentView = 'list'; // 'list' or 'detail'
    let selectedItem = null;

    function render() {
        if (currentView === 'list') {
            renderListMode();
        } else {
            renderDetailMode();
        }
    }

    // --- LIST MODE ---
    function renderListMode() {
        container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Content Vault</h1>
        <p class="page-subtitle">Arsip semua naskah — kelola status dan daur ulang konten</p>
      </div>

      <!-- Filter Bar -->
      <div class="vault-filter-bar" id="vault-filters">
        <button class="vault-filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">Semua</button>
        <button class="vault-filter-btn ${currentFilter === 'draft' ? 'active' : ''}" data-filter="draft">📝 Draft</button>
        <button class="vault-filter-btn ${currentFilter === 'ready' ? 'active' : ''}" data-filter="ready">✅ Siap Publish</button>
        <button class="vault-filter-btn ${currentFilter === 'published' ? 'active' : ''}" data-filter="published">🚀 Sudah Publish</button>
      </div>

      <!-- Content List -->
      <div id="vault-list" class="vault-list"><div style="text-align:center;padding:2rem;"><div class="loading-spinner" style="margin:0 auto;"></div></div></div>

      <!-- Empty State -->
      <div id="vault-empty" class="card" style="text-align:center;padding:var(--space-2xl);display:none;">
        <div style="font-size:2.5rem;margin-bottom:var(--space-md);opacity:0.5;">📦</div>
        <p style="color:var(--text-secondary);">Belum ada naskah tersimpan</p>
        <p style="color:var(--text-muted);font-size:var(--font-xs);margin-top:var(--space-xs);">Buat naskah baru di Content Writer</p>
      </div>
    `;

        // Filter handlers
        container.querySelectorAll('.vault-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentFilter = btn.dataset.filter;
                renderListMode(); // Re-render to update active class and list
            });
        });

        loadAndRenderList();
    }

    async function loadAndRenderList() {
        try {
            allItems = await getAllContent();
            const list = document.getElementById('vault-list');
            const empty = document.getElementById('vault-empty');

            let filtered = allItems;
            if (currentFilter !== 'all') {
                filtered = allItems.filter(item => (item.status || 'draft') === currentFilter);
            }

            if (!filtered.length) {
                list.style.display = 'none';
                empty.style.display = 'block';
                if (currentFilter !== 'all') {
                    empty.querySelector('p').textContent = `Tidak ada naskah dengan status "${STATUS_CONFIG[currentFilter]?.label}"`;
                }
                return;
            }

            list.style.display = 'flex';
            empty.style.display = 'none';

            list.innerHTML = filtered.map(item => {
                const isVideo = item.tipe === 'video';
                const icon = isVideo ? '🎬' : '📝';
                const typeLabel = isVideo ? 'Video/Reels' : 'Carousel/Post';
                const status = item.status || 'draft';
                const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
                const date = new Date(item.tanggal).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });

                const hook = item.isi_data?.hook || item.isi_data?.hook_vo || '';
                const snippet = hook.substring(0, 120) + (hook.length > 120 ? '...' : '');

                const repurposeLabel = isVideo ? 'Jadikan Carousel' : 'Jadikan Video';
                const repurposeMode = isVideo ? 'post' : 'video';

                return `
          <div class="vault-card" data-id="${item.id}">
            <div class="vault-card-header">
              <div class="vault-card-meta">
                <span class="vault-type-badge ${typeLabel.includes('Video') ? 'type-video' : 'type-post'}">${icon} ${typeLabel}</span>
                <span class="vault-card-date">${date}</span>
              </div>
              <button class="status-badge" data-id="${item.id}" data-status="${status}" title="Klik untuk ubah status" style="--badge-color:${statusCfg.color};">
                ${statusCfg.icon} ${statusCfg.label}
              </button>
            </div>
            <h3 class="vault-card-title">${escapeHtml(item.judul_otomatis || 'Tanpa Judul')}</h3>
            <p class="vault-card-snippet">${escapeHtml(snippet || 'Tanpa preview')}</p>
            <div class="vault-card-actions">
              <button class="archive-action-btn repurpose-btn" data-id="${item.id}" data-mode="${repurposeMode}">🔄 ${repurposeLabel}</button>
              <button class="archive-action-btn delete-btn" data-id="${item.id}">🗑️ Hapus</button>
            </div>
          </div>
        `;
            }).join('');

            // Attach handlers
            attachListHandlers(list);

        } catch (err) {
            console.error(err);
        }
    }

    function attachListHandlers(list) {
        // Card click -> Detail View
        list.querySelectorAll('.vault-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.status-badge') || e.target.closest('.archive-action-btn')) return;
                const id = parseInt(card.dataset.id);
                selectedItem = allItems.find(i => i.id === id);
                if (selectedItem) {
                    currentView = 'detail';
                    render();
                }
            });
        });

        // Status badge cycling
        list.querySelectorAll('.status-badge').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                const cur = btn.dataset.status;
                const next = STATUS_ORDER[(STATUS_ORDER.indexOf(cur) + 1) % STATUS_ORDER.length];
                try {
                    await updateContentStatus(id, next);
                    const item = allItems.find(i => i.id === id);
                    if (item) item.status = next;
                    loadAndRenderList(); // Refresh list to update UI state
                    showToast(`Status diubah`, 'success');
                } catch { showToast('Gagal mengubah status', 'error'); }
            });
        });

        // Repurpose
        list.querySelectorAll('.repurpose-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                const item = allItems.find(i => i.id === id);
                if (!item) return;
                const text = extractText(item);
                const mode = btn.dataset.mode;
                const label = mode === 'video' ? 'naskah Video/Reels' : 'naskah Carousel/Postingan';
                window.dispatchEvent(new CustomEvent('repurpose-content', {
                    detail: { prompt: `Tolong daur ulang naskah ini menjadi ${label}. Naskah asli:\n\n${text}`, mode }
                }));
            });
        });

        // Delete
        list.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                if (!confirm('Hapus naskah ini?')) return;
                try {
                    await deleteContent(id);
                    allItems = allItems.filter(i => i.id !== id);
                    loadAndRenderList();
                    showToast('Naskah dihapus', 'info');
                } catch { showToast('Gagal menghapus', 'error'); }
            });
        });
    }

    // --- DETAIL MODE ---
    function renderDetailMode() {
        if (!selectedItem) { currentView = 'list'; render(); return; }
        const item = selectedItem;
        const d = item.isi_data || {};

        container.innerHTML = `
      <div class="page-header">
        <button id="vault-back-btn" class="btn btn-ghost" style="margin-bottom:var(--space-sm);">← Kembali</button>
        <input id="detail-title" class="vault-edit-title" value="${escapeHtml(item.judul_otomatis || 'Tanpa Judul')}" placeholder="Judul Naskah">
      </div>

      <div id="detail-cards-container">
        <!-- Cards generated via JS -->
      </div>
      
      <div style="height: 80px;"></div> <!-- Spacer -->
      <div class="fab-container" style="position:fixed;bottom:2rem;right:2rem;z-index:99;">
         <button id="vault-save-btn" class="btn btn-primary btn-large" style="box-shadow:0 4px 12px rgba(0,0,0,0.3);">💾 Simpan Perubahan</button>
      </div>
    `;

        const cardsContainer = document.getElementById('detail-cards-container');
        let cardsHtml = '';

        if (item.tipe === 'video') {
            // Video Cards: Hook, Body, CTA, Caption
            cardsHtml += makeVideoCard('Hook', d.hook_screen, d.hook_vo, 'hook');
            cardsHtml += makeVideoCard('Body', d.body_screen, d.body_vo, 'body');
            cardsHtml += makeVideoCard('CTA', d.cta_screen, d.cta_vo, 'cta');
            cardsHtml += makeCard('Caption', d.caption, 'caption');
        } else {
            // Post Cards: Hook, Slides, CTA, Caption
            cardsHtml += makeCard('Hook', d.hook, 'hook');
            if (Array.isArray(d.slides)) {
                d.slides.forEach((slide, idx) => {
                    cardsHtml += makeCard(`Slide ${idx + 1}`, slide, `slide-${idx}`);
                });
            }
            cardsHtml += makeCard('CTA', d.cta, 'cta');
            cardsHtml += makeCard('Caption', d.caption, 'caption');
        }

        cardsContainer.innerHTML = cardsHtml;

        // Handlers
        document.getElementById('vault-back-btn').addEventListener('click', () => {
            currentView = 'list';
            render();
        });

        document.getElementById('vault-save-btn').addEventListener('click', async () => {
            await saveChanges();
        });

        attachCopyHandlers(cardsContainer);
    }

    async function saveChanges() {
        if (!selectedItem) return;
        const newTitle = document.getElementById('detail-title').value.trim();
        const d = JSON.parse(JSON.stringify(selectedItem.isi_data || {})); // Deep copy

        if (selectedItem.tipe === 'video') {
            d.hook_screen = getById('screen-hook');
            d.hook_vo = getById('vo-hook');
            d.body_screen = getById('screen-body');
            d.body_vo = getById('vo-body');
            d.cta_screen = getById('screen-cta');
            d.cta_vo = getById('vo-cta');
            d.caption = getById('content-caption');
        } else {
            d.hook = getById('content-hook');
            d.cta = getById('content-cta');
            d.caption = getById('content-caption');
            if (d.slides) {
                d.slides = d.slides.map((_, idx) => getById(`content-slide-${idx}`));
            }
        }

        try {
            await updateContent(selectedItem.id, {
                judul_otomatis: newTitle,
                isi_data: d
            });
            selectedItem.judul_otomatis = newTitle;
            selectedItem.isi_data = d;
            showToast('Perubahan berhasil disimpan', 'success');
        } catch (e) {
            showToast('Gagal menyimpan perubahan', 'error');
        }
    }

    function getById(id) {
        const el = document.getElementById(id);
        return el ? el.innerText.trim() : ''; // Use innerText to preserve newlines but strip HTML
    }

    // --- Helpers ---
    function makeCard(label, content, idSuffix) {
        return `
      <div class="card" style="margin-bottom:var(--space-md);">
        <div class="card-header">
          <span class="card-label">${label}</span>
          <button class="btn btn-ghost btn-sm btn-copy" data-target="content-${idSuffix}">📋 Copy</button>
        </div>
        <div class="card-content" contenteditable="true" id="content-${idSuffix}" style="white-space:pre-wrap;outline:none;">${escapeHtml(content || '')}</div>
      </div>
    `;
    }

    function makeVideoCard(label, screenText, voText, idSuffix) {
        return `
      <div class="card" style="margin-bottom:var(--space-md);">
        <div class="card-header">
          <span class="card-label">${label}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);">
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-sm);">
              <span style="font-size:var(--font-xs);color:var(--accent-lavender);font-weight:600;">🖥️ On-Screen Text</span>
              <button class="btn btn-ghost btn-sm btn-copy" data-target="screen-${idSuffix}">📋</button>
            </div>
            <div class="card-content" contenteditable="true" id="screen-${idSuffix}" style="background:var(--bg-primary);padding:var(--space-md);border-radius:var(--radius-md);min-height:80px;white-space:pre-wrap;outline:none;">${escapeHtml(screenText || '')}</div>
          </div>
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-sm);">
              <span style="font-size:var(--font-xs);color:var(--accent-warm);font-weight:600;">🎙️ VO Script</span>
              <button class="btn btn-ghost btn-sm btn-copy" data-target="vo-${idSuffix}">📋</button>
            </div>
            <div class="card-content" contenteditable="true" id="vo-${idSuffix}" style="background:var(--bg-primary);padding:var(--space-md);border-radius:var(--radius-md);min-height:80px;white-space:pre-wrap;outline:none;">${escapeHtml(voText || '')}</div>
          </div>
        </div>
      </div>
    `;
    }

    function attachCopyHandlers(container) {
        container.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', async () => {
                const targetId = btn.dataset.target;
                const target = document.getElementById(targetId);
                if (!target) return;
                try {
                    await navigator.clipboard.writeText(target.innerText);
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '✓';
                    setTimeout(() => btn.innerHTML = originalText, 2000);
                } catch { showToast('Gagal copy', 'error'); }
            });
        });
    }

    function extractText(item) {
        const d = item.isi_data;
        if (!d) return '';
        const parts = [];
        if (item.tipe === 'video') {
            if (d.hook_vo) parts.push('[Hook] ' + d.hook_vo);
            if (d.body_vo) parts.push('[Body] ' + d.body_vo);
            if (d.cta_vo) parts.push('[CTA] ' + d.cta_vo);
        } else {
            if (d.hook) parts.push('[Hook] ' + d.hook);
            if (d.slides?.length) d.slides.forEach((s, i) => parts.push(`[Slide ${i + 1}] ${s}`));
            if (d.cta) parts.push('[CTA] ' + d.cta);
        }
        return parts.join('\n');
    }

    // Initial render
    render();
}
