/**
 * IndexedDB-based file storage for web platform.
 * Stores book file ArrayBuffers so they persist across page navigations and reloads.
 * On native platforms, Capacitor Filesystem handles this instead.
 */

const DB_NAME = 'ebook_file_storage';
const DB_VERSION = 1;
const STORE_NAME = 'files';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Store a file's ArrayBuffer in IndexedDB keyed by bookId.
 */
export async function storeFile(bookId: string, data: ArrayBuffer): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(data, bookId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Store text content as a file in IndexedDB keyed by bookId.
 */
export async function storeTextFile(bookId: string, text: string): Promise<void> {
  const encoder = new TextEncoder();
  return storeFile(bookId, encoder.encode(text).buffer as ArrayBuffer);
}

/**
 * Retrieve a file's ArrayBuffer from IndexedDB by bookId.
 * Returns null if not found.
 */
export async function getFile(bookId: string): Promise<ArrayBuffer | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(bookId);
    request.onsuccess = () => {
      db.close();
      resolve(request.result ?? null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Delete a file from IndexedDB by bookId.
 */
export async function deleteFile(bookId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(bookId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export const webFileStorage = { storeFile, storeTextFile, getFile, deleteFile };
