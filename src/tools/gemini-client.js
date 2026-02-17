/**
 * Gemini API Client — Image editing only
 * Uses gemini-2.5-flash-image for product photo enhancement
 * Text content generation is handled by groq-client.js
 */
import { GoogleGenAI } from '@google/genai';

let ai = null;

export function initGemini(apiKey) {
    if (!apiKey) { ai = null; return false; }
    try {
        ai = new GoogleGenAI({ apiKey });
        return true;
    } catch (e) {
        console.error('Gemini init error:', e);
        return false;
    }
}

export function isGeminiReady() {
    return ai !== null;
}

/**
 * Enhance a product photo using Gemini image editing
 * @param {File} imageFile - the uploaded image
 * @param {string} userPrompt - user's editing instructions
 * @returns {Object} { imageBase64, mimeType, text }
 */
export async function enhanceImage(imageFile, userPrompt) {
    if (!ai) throw new Error('Gemini API Key belum diatur. Buka Pengaturan untuk memasukkan API Key.');

    // Convert file to base64
    const base64 = await fileToBase64(imageFile);
    const mimeType = imageFile.type || 'image/jpeg';

    const systemInstruction = `Kamu adalah foto editor profesional untuk produk handmade artisan (sabun, balm, hampers, dll).

ATURAN:
1. JANGAN PERNAH mengubah, menghilangkan, atau mendistorsi objek/produk utama dalam foto.
2. Hanya edit background, pencahayaan, staging, dan elemen di sekitar produk.
3. Pertahankan tampilan asli produk senatural mungkin.
4. Buat hasilnya terlihat seperti foto produk profesional yang layak untuk Instagram/e-commerce.
5. Jika instruksi user tidak jelas, buat background bersih dan estetik yang cocok untuk produk handmade.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [
                {
                    text: systemInstruction + '\n\nInstruksi dari user: ' + userPrompt
                },
                {
                    inlineData: {
                        data: base64,
                        mimeType: mimeType
                    }
                }
            ]
        });

        const parts = response.candidates?.[0]?.content?.parts || [];

        let resultImage = null;
        let resultText = '';

        for (const part of parts) {
            if (part.inlineData) {
                resultImage = part.inlineData;
            }
            if (part.text) {
                resultText = part.text;
            }
        }

        if (!resultImage) {
            throw new Error('AI tidak menghasilkan gambar. Coba ubah instruksi Anda.');
        }

        return {
            imageBase64: resultImage.data,
            mimeType: resultImage.mimeType || 'image/png',
            text: resultText
        };
    } catch (e) {
        console.error('Gemini Image API Error:', e);
        if (e.message?.includes('API_KEY_INVALID') || e.message?.includes('API key')) {
            throw new Error('Gemini API Key tidak valid. Periksa key Anda di Pengaturan.');
        }
        if (e.message?.includes('RATE_LIMIT') || e.message?.includes('429') || e.message?.includes('Resource has been exhausted')) {
            throw new Error('Batas penggunaan Gemini API tercapai. Tunggu beberapa menit dan coba lagi.');
        }
        if (e.message?.includes('SAFETY')) {
            throw new Error('Permintaan ditolak oleh filter keamanan. Coba instruksi yang berbeda.');
        }
        throw new Error('Gagal mengedit foto: ' + e.message);
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
