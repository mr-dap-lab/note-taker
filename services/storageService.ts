import { Recording, User, Folder } from '../types';

/**
 * Storage Service (LocalStorage)
 * 
 * JUNIOR DEV NOTE:
 * This service handles "Metadata" - small JSON objects describing the recordings (Title, Date, Notes).
 * Since these are small text data, LocalStorage is perfect (and faster/easier than IndexedDB).
 * 
 * IMPORTANT: We do NOT store the actual audio files here. We store a `blobId` here which references
 * the file inside IndexedDB (see dbService.ts).
 */

const RECORDINGS_KEY = 'app_recordings_meta';
const FOLDERS_KEY = 'app_folders_meta';
const USER_KEY = 'app_user_session';

/**
 * Retrieves the list of folders.
 */
export const getFoldersMeta = (): Folder[] => {
  try {
    const data = localStorage.getItem(FOLDERS_KEY);
    if (data) return JSON.parse(data);
    
    // Default pre-configured folders/categories
    const defaults: Folder[] = [
      { id: 'internal', name: 'Internal', color: 'indigo', createdAt: new Date().toISOString() },
      { id: 'client', name: 'Client', color: 'emerald', createdAt: new Date().toISOString() },
      { id: 'board', name: 'Board', color: 'amber', createdAt: new Date().toISOString() }
    ];
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(defaults));
    return defaults;
  } catch (e) {
    console.error("Failed to load folders", e);
    return [];
  }
};

/**
 * Saves the list of folders.
 */
export const saveFoldersMeta = (folders: Folder[]): void => {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
};

/**
 * Retrieves the list of recording metadata.
 */
export const getRecordingsMeta = (): Recording[] => {
  try {
    const data = localStorage.getItem(RECORDINGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load recordings", e);
    return [];
  }
};

/**
 * Saves the list of recording metadata.
 */
export const saveRecordingsMeta = (recordings: Recording[]): void => {
  localStorage.setItem(RECORDINGS_KEY, JSON.stringify(recordings));
};

/**
 * Retrieves the active user session if one exists.
 */
export const getUserSession = (): User | null => {
  try {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

/**
 * Persists the user session.
 */
export const saveUserSession = (user: User): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Clears the user session (Logout).
 */
export const clearUserSession = (): void => {
  localStorage.removeItem(USER_KEY);
};