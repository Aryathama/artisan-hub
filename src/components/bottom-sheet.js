/**
 * Reusable Bottom Sheet with Vault content list
 * Includes status tagging and repurpose functionality
 */
import { getAllContent, updateContentStatus, deleteContent } from '../db/vault.js';
import { showToast } from './toast.js';

let currentCallback = null;
let currentFilter = null;

const overlay = () => document.getElementById('bottom-sheet-overlay');
const body = () => document.getElementById('bottom-sheet-body');
const titleEl = () => document.getElementById('bottom-sheet-title');

const STATUS_CONFIG = {
    draft: { label: 'Draft', color: '#a78bfa', icon: '📝' },
    ready: { label: 'Siap Publish', color: '#34d399', icon: '✅' },
    published: { label: 'Sudah Publish', color: '#60a5fa', icon: '🚀' }
};

const STATUS_ORDER = ['draft', 'ready', 'published'];

export function initBottomSheet() {
    document.getElementById('bottom-sheet-close').addEventListener('click', closeBottomSheet);
    overlay().addEventListener('click', (e) => {
        if (e.target === overlay()) closeBottomSheet();
    });
}

/**
 * Open the bottom sheet with vault items
 * @param {string} titleText - header title
 * @param {Function} onSelect - callback(item) when an item is selected
 * @param {string} filterField - optional field from isi_data to extract
 * @param {string} typeFilter - optional type filter ('video' or 'post')
 */
export async function openVaultSheet(titleText, onSelect, filterField = null, typeFilter = null) {
    titleEl().textContent = titleText;
    currentCallback = onSelect;
    currentFilter = filterField;

    body().innerHTML = '<div style="text-align:center;padding:2rem;"><div class="loading-spinner" style="margin:0 auto;"></div><p class="loading-text" style="margin-top:1rem;">Memuat arsip...</p></div>';
    overlay().classList.add('visible');
    document.body.style.overflow = 'hidden';

    try {
        let items = await getAllContent();
        if (typeFilter) {
            items = items.filter(item => item.tipe === typeFilter);
        }
        renderItems(items, typeFilter);
    } catch (err) {
        body().innerHTML = '<div class="archive-empty"><div class="archive-empty-icon">⚠️</div><p>Gagal memuat arsip</p></div>';
    }
}

function renderItems(items, typeFilter = null) {
    if (!items.length) {
        const emptyMsg = typeFilter === 'video'
            ? 'Belum ada naskah video tersimpan'
            : 'Belum ada naskah tersimpan';
        const emptyHint = typeFilter === 'video'
            ? 'Buat naskah video/reels di Content Writer terlebih dahulu'
            : 'Buat naskah baru di Content Writer terlebih dahulu';
        body().innerHTML = `
      <div class="archive-empty">
        <div class="archive-empty-icon">📭</div>
        <p>${emptyMsg}</p>
        <p style="font-size:var(--font-xs);margin-top:var(--space-sm);">${emptyHint}</p>
      </div>
    `;
        return;
    }

    body().innerHTML = items.map(item => {
        const isVideo = item.tipe === 'video';
        const icon = isVideo ? '🎬' : '📝';
        const typeClass = isVideo ? 'type-video' : 'type-post';
        const date = new Date(item.tanggal).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const status = item.status || 'draft';
        const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

        const snippet = item.isi_data?.hook
            ? item.isi_data.hook.substring(0, 80) + (item.isi_data.hook.length > 80 ? '...' : '')
            : 'Tanpa preview';

        // Determine repurpose target (if post → video, if video → post)
        const repurposeLabel = isVideo ? 'Jadikan Carousel' : 'Jadikan Video';
        const repurposeMode = isVideo ? 'post' : 'video';

        return `
      <div class="archive-item" data-id="${item.id}">
        <div class="archive-item-icon ${typeClass}">${icon}</div>
        <div class="archive-item-info">
          <div class="archive-item-title-row">
            <span class="archive-item-title">${escapeHtml(item.judul_otomatis || 'Tanpa Judul')}</span>
            <button class="status-badge" data-id="${item.id}" data-status="${status}" title="Klik untuk ubah status" style="--badge-color:${statusCfg.color};">
              ${statusCfg.icon} ${statusCfg.label}
            </button>
          </div>
          <div class="archive-item-date">${date}</div>
          <div class="archive-item-snippet">${escapeHtml(snippet)}</div>
          <div class="archive-item-actions">
            <button class="archive-action-btn repurpose-btn" data-id="${item.id}" data-mode="${repurposeMode}" title="Daur ulang naskah ini">🔄 ${repurposeLabel}</button>
            <button class="archive-action-btn delete-btn" data-id="${item.id}" title="Hapus naskah">🗑️</button>
          </div>
        </div>
      </div>
    `;
    }).join('');

    // Attach click handlers for selecting items
    body().querySelectorAll('.archive-item').forEach(el => {
        el.addEventListener('click', (e) => {
            // Don't trigger select if clicking a button
            if (e.target.closest('.status-badge') || e.target.closest('.archive-action-btn')) return;

            const id = parseInt(el.dataset.id);
            const item = items.find(i => i.id === id);
            if (item && currentCallback) {
                currentCallback(item);
                closeBottomSheet();
            }
        });
    });

    // Status badge click → cycle through statuses
    body().querySelectorAll('.status-badge').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const currentStatus = btn.dataset.status;
            const currentIndex = STATUS_ORDER.indexOf(currentStatus);
            const nextStatus = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];

            try {
                await updateContentStatus(id, nextStatus);
                const nextCfg = STATUS_CONFIG[nextStatus];
                btn.dataset.status = nextStatus;
                btn.innerHTML = `${nextCfg.icon} ${nextCfg.label}`;
                btn.style.setProperty('--badge-color', nextCfg.color);
                showToast(`Status diubah → ${nextCfg.label}`, 'success');
            } catch (err) {
                showToast('Gagal mengubah status', 'error');
            }
        });
    });

    // Repurpose button click
    body().querySelectorAll('.repurpose-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const targetMode = btn.dataset.mode;
            const item = items.find(i => i.id === id);
            if (!item) return;

            const originalText = extractTextFromItem(item);
            const targetLabel = targetMode === 'video' ? 'naskah Video/Reels' : 'naskah Carousel/Postingan';
            const prompt = `Tolong daur ulang naskah ini menjadi ${targetLabel}. Naskah asli:\n\n${originalText}`;

            // Dispatch custom event to navigate and fill prompt
            window.dispatchEvent(new CustomEvent('repurpose-content', {
                detail: { prompt, mode: targetMode }
            }));

            closeBottomSheet();
        });
    });

    // Delete button click
    body().querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            if (!confirm('Hapus naskah ini dari arsip?')) return;

            try {
                await deleteContent(id);
                const el = btn.closest('.archive-item');
                if (el) {
                    el.style.transition = 'all 0.3s ease';
                    el.style.opacity = '0';
                    el.style.transform = 'translateX(20px)';
                    setTimeout(() => {
                        el.remove();
                        // Check if list is now empty
                        if (!body().querySelector('.archive-item')) {
                            renderItems([], null);
                        }
                    }, 300);
                }
                showToast('Naskah berhasil dihapus', 'info');
            } catch (err) {
                showToast('Gagal menghapus naskah', 'error');
            }
        });
    });
}

function extractTextFromItem(item) {
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

export function closeBottomSheet() {
    overlay().classList.remove('visible');
    document.body.style.overflow = '';
    currentCallback = null;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
