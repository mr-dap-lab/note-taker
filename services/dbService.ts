/**
 * IndexedDB Service
 * 
 * JUNIOR DEV NOTE:
 * Why IndexedDB and not localStorage?
 * - localStorage is synchronous and limited to ~5MB of strings.
 * - IndexedDB is asynchronous, supports large binary files (Blobs), and has much higher limits.
 * - Audio files are heavy (MBs), so they MUST go here.
 */

const DB_NAME = 'notes_db';
const STORE_NAME = 'audio_blobs';
const DB_VERSION = 1;

/**
 * Opens a connection to the browser's IndexedDB.
 * Handles schema upgrades (creating object stores) if the version changes.
 */
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // This event runs if the database doesn't exist or version number is increased
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

/**
 * Saves an audio Blob to the database.
 * @param id - Unique identifier for the blob (referenced in Recording metadata).
 * @param blob - The audio file data.
 */
export const saveAudioBlob = async (id: string, blob: Blob): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(blob, id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Retrieves an audio Blob by its ID.
 */
export const getAudioBlob = async (id: string): Promise<Blob | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Deletes an audio Blob.
 * Should be called when a recording is deleted from the UI to clean up storage.
 */
export const deleteAudioBlob = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};