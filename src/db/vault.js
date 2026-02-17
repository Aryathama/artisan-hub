/**
 * Content Vault — IndexedDB wrapper for storing generated content
 */
import { openDB } from 'idb';

const DB_NAME = 'artisan-content-hub';
const DB_VERSION = 1;
const STORE_NAME = 'content';

let dbInstance = null;

export async function initDB() {
    if (dbInstance) return dbInstance;
    dbInstance = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('tanggal', 'tanggal');
                store.createIndex('tipe', 'tipe');
            }
        }
    });
    return dbInstance;
}

/**
 * Save content to vault
 * @param {Object} item - { tipe, judul_otomatis, isi_data }
 * @returns {number} id of saved item
 */
export async function saveContent(item) {
    const db = await initDB();
    const record = {
        tipe: item.tipe,
        judul_otomatis: item.judul_otomatis,
        tanggal: new Date().toISOString(),
        status: item.status || 'draft',
        isi_data: item.isi_data
    };
    const id = await db.add(STORE_NAME, record);
    return id;
}

/**
 * Get all content, newest first
 */
export async function getAllContent() {
    const db = await initDB();
    const items = await db.getAll(STORE_NAME);
    return items.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
}

/**
 * Get a single content item by ID
 */
export async function getContentById(id) {
    const db = await initDB();
    return db.get(STORE_NAME, id);
}

/**
 * Delete a content item
 */
export async function deleteContent(id) {
    const db = await initDB();
    return db.delete(STORE_NAME, id);
}

/**
 * Get total count of items
 */
export async function getContentCount() {
    const db = await initDB();
    return db.count(STORE_NAME);
}

/**
 * Update status of a content item
 * @param {number} id
 * @param {string} status - 'draft' | 'ready' | 'published'
 */
export async function updateContentStatus(id, status) {
    const db = await initDB();
    const item = await db.get(STORE_NAME, id);
    if (!item) throw new Error('Item not found');
    item.status = status;
    await db.put(STORE_NAME, item);
    return item;
}

/**
 * Update content data (isi_data)
 * @param {number} id
 * @param {Object} updates - { judul_otomatis, isi_data }
 */
export async function updateContent(id, updates) {
    const db = await initDB();
    const item = await db.get(STORE_NAME, id);
    if (!item) throw new Error('Item not found');

    if (updates.judul_otomatis) item.judul_otomatis = updates.judul_otomatis;
    if (updates.isi_data) item.isi_data = updates.isi_data;

    await db.put(STORE_NAME, item);
    return item;
}
