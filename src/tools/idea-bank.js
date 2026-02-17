/**
 * Tool: Bank Ide (Sticky Notes)
 * Simple idea catcher with localStorage persistence
 */
import { showToast } from '../components/toast.js';

const STORAGE_KEY = 'artisan_idea_bank';

function getIdeas() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
}

function saveIdeas(ideas) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function renderIdeaBank(container) {
    container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Bank Ide</h1>
      <p class="page-subtitle">Tangkap ide mentah sebelum hilang — tulis, simpan, kembali nanti</p>
    </div>

    <!-- Input Area -->
    <div class="card idea-input-card" style="margin-bottom: var(--space-xl);">
      <textarea class="idea-textarea" id="idea-input" placeholder="Tulis ide kamu di sini... misal: 'Konten BTS proses wrapping hampers untuk Hari Ibu'" rows="3"></textarea>
      <div style="display:flex;justify-content:flex-end;margin-top:var(--space-sm);">
        <button class="btn btn-primary" id="idea-save-btn">📌 Simpan Ide</button>
      </div>
    </div>

    <!-- Ideas Grid -->
    <div id="ideas-grid" class="ideas-grid"></div>

    <!-- Empty State -->
    <div id="ideas-empty" class="card" style="text-align:center;padding:var(--space-2xl);display:none;">
      <div style="font-size:2.5rem;margin-bottom:var(--space-md);opacity:0.5;">💡</div>
      <p style="color:var(--text-secondary);">Belum ada ide tersimpan</p>
      <p style="color:var(--text-muted);font-size:var(--font-xs);margin-top:var(--space-xs);">Tulis sesuatu di atas dan klik Simpan Ide</p>
    </div>
  `;

    const textarea = document.getElementById('idea-input');
    const saveBtn = document.getElementById('idea-save-btn');

    // Auto-resize textarea
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    });

    // Save idea
    saveBtn.addEventListener('click', () => {
        const content = textarea.value.trim();
        if (!content) return showToast('Tulis ide dulu sebelum menyimpan', 'error');

        const ideas = getIdeas();
        ideas.unshift({
            id: Date.now(),
            date: new Date().toISOString(),
            content: content
        });
        saveIdeas(ideas);
        textarea.value = '';
        textarea.style.height = 'auto';
        renderGrid();
        showToast('Ide berhasil disimpan! 💡', 'success');
    });

    // Enter shortcut (Ctrl+Enter to save)
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            saveBtn.click();
        }
    });

    function renderGrid() {
        const ideas = getIdeas();
        const grid = document.getElementById('ideas-grid');
        const empty = document.getElementById('ideas-empty');

        if (!ideas.length) {
            grid.style.display = 'none';
            empty.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        empty.style.display = 'none';

        grid.innerHTML = ideas.map((idea, index) => {
            const date = new Date(idea.date).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            const colorIndex = index % 5;

            return `
          <div class="idea-card idea-color-${colorIndex}" data-id="${idea.id}">
            <div class="idea-card-content">${escapeHtml(idea.content)}</div>
            <div class="idea-card-footer">
              <span class="idea-card-date">${date}</span>
              <button class="idea-delete-btn" data-id="${idea.id}" title="Hapus ide">✕</button>
            </div>
          </div>
        `;
        }).join('');

        // Delete handlers
        grid.querySelectorAll('.idea-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                const ideas = getIdeas().filter(i => i.id !== id);
                saveIdeas(ideas);
                renderGrid();
                showToast('Ide dihapus', 'info');
            });
        });

        // Animate cards in
        grid.querySelectorAll('.idea-card').forEach((card, i) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(8px)';
            setTimeout(() => {
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, i * 50);
        });
    }

    // Initial render
    renderGrid();
}
