/**
 * Groq API Client — For text content generation (Content Writer)
 * Uses Llama 3.3 70B via Groq's fast inference API
 * API is OpenAI-compatible, no SDK needed
 */

let groqKey = null;

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `Kamu adalah seorang konsultan konten kreatif untuk brand artisan handmade personal care (sabun natural, balm, lip balm, hampers, dll). Tugasmu adalah menulis naskah konten media sosial (Instagram & TikTok) yang elegan, hangat, menenangkan, dan profesional.

ATURAN WAJIB:
1. Gunakan Bahasa Indonesia yang indah, natural, dan mengalir — bukan bahasa marketing alay atau kaku.
2. DILARANG menggunakan kata-kata hard-selling murahan seperti: "BELI SEKARANG!", "DISKON GILA!", "BURUAN!", "MURAH BANGET!", "BEST SELLER!!", atau yang sejenis.
3. DILARANG menggunakan emoji secara berlebihan. Maksimal 2-3 emoji per section, dan hanya jika benar-benar menambah nuansa.
4. Nada harus seperti percakapan hangat seorang pengrajin yang bangga dengan karyanya — bukan sales yang memaksa.
5. Setiap konten harus punya jiwa: ceritakan proses, bahan, filosofi, perasaan saat memakai produk.
6. Gunakan kalimat yang mengundang curiosity, bukan clickbait murahan.
7. CTA harus halus dan natural, seolah mengajak teman, bukan memaksa beli.

BATASAN TOPIK:
- Hanya buat konten yang berkaitan dengan bisnis kriya/handmade/personal care/beauty/hampers/self-care.
- Jika user meminta konten di luar topik ini, TOLAK dengan sopan dan minta user kembali ke topik bisnis handmade.
- Ketika menolak, balas HANYA dengan JSON: {"rejected": true, "message": "pesan penolakan sopan"}

FORMAT OUTPUT:
Balas HANYA dalam format JSON yang valid tanpa markdown code block. Tidak ada teks lain di luar JSON.`;

const POST_PROMPT = `Buatkan naskah POSTINGAN/CAROUSEL Instagram.

Balas dalam format JSON:
{
  "judul": "judul singkat berdasarkan topik",
  "hook": "kalimat pembuka yang menarik perhatian di slide pertama",
  "slides": ["isi slide 2", "isi slide 3", "dst sesuai kebutuhan materi"],
  "cta": "call to action halus dan natural",
  "caption": "caption lengkap untuk Instagram/TikTok dengan hashtag relevan"
}`;

const VIDEO_PROMPT = `Buatkan naskah VIDEO/REELS.

Balas dalam format JSON:
{
  "judul": "judul singkat berdasarkan topik",
  "hook_screen": "teks on-screen pendek untuk hook (maks 8 kata)",
  "hook_vo": "voice over script untuk hook (natural, seperti ngobrol)",
  "body_screen": "teks on-screen utama (key points pendek untuk ditampilkan di layar)",
  "body_vo": "voice over script body (satu flow natural, bukan poin-poin, seperti sedang bercerita ke teman)",
  "cta_screen": "teks on-screen CTA pendek",
  "cta_vo": "voice over CTA (halus, mengajak bukan memaksa)",
  "caption": "caption lengkap untuk Instagram/TikTok dengan hashtag relevan"
}`;

export function initGroq(apiKey) {
    if (!apiKey) { groqKey = null; return false; }
    groqKey = apiKey;
    return true;
}

export function isGroqReady() {
    return groqKey !== null;
}

/**
 * Generate content using Groq (Llama 3.3)
 * @param {string} userPrompt - the user's content request
 * @param {string} mode - 'post' or 'video'
 * @returns {Object} parsed JSON response
 */
export async function generateContent(userPrompt, mode = 'post') {
    if (!groqKey) throw new Error('Groq API Key belum diatur. Buka Pengaturan untuk memasukkan API Key.');

    const modePrompt = mode === 'post' ? POST_PROMPT : VIDEO_PROMPT;

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqKey}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: `${SYSTEM_PROMPT}\n\n${modePrompt}` },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2048,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errMsg = errorData?.error?.message || `HTTP ${response.status}`;

            if (response.status === 401) {
                throw new Error('Groq API Key tidak valid. Periksa key Anda di Pengaturan.');
            }
            if (response.status === 429) {
                throw new Error('Batas penggunaan Groq API tercapai. Tunggu sebentar dan coba lagi.');
            }
            throw new Error(`Groq API error: ${errMsg}`);
        }

        const data = await response.json();
        let text = data.choices?.[0]?.message?.content?.trim();

        if (!text) throw new Error('AI tidak memberikan respons. Coba lagi.');

        // Strip markdown code fences if present
        if (text.startsWith('```')) {
            text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
        }

        const parsed = JSON.parse(text);
        return parsed;
    } catch (e) {
        if (e instanceof SyntaxError) {
            throw new Error('AI menghasilkan format yang tidak valid. Silakan coba lagi.');
        }
        // Re-throw our custom errors
        if (e.message.includes('API Key') || e.message.includes('Groq API') || e.message.includes('Batas penggunaan')) {
            throw e;
        }
        throw new Error(`Gagal generate konten: ${e.message}`);
    }
}
