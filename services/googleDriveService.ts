import { getAccessToken } from './googleAuthService';
import { getAudioBlob } from './dbService';
import { Recording } from '../types';

/**
 * Service to interact with Google Drive v3 REST API.
 */

/**
 * Searches for a folder with a specific name in Google Drive.
 * If it doesn't exist, creates it.
 * Returns the folder's Google Drive ID.
 */
export const getOrCreateFolder = async (token: string, folderName: string): Promise<string> => {
  const query = encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  
  try {
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!searchRes.ok) {
      throw new Error(`Folder search failed: ${await searchRes.text()}`);
    }

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Not found, create the folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });

    if (!createRes.ok) {
      throw new Error(`Folder creation failed: ${await createRes.text()}`);
    }

    const createData = await createRes.json();
    return createData.id;
  } catch (error) {
    console.error(`getOrCreateFolder error for '${folderName}':`, error);
    throw error;
  }
};

/**
 * Uploads file content to Google Drive (Split metadata and media upload for maximum reliability).
 */
export const uploadFileToDrive = async (
  token: string,
  name: string,
  mimeType: string,
  content: string | Blob,
  parentId?: string
): Promise<string> => {
  try {
    // Phase 1: Create metadata-only draft
    const metadata: any = {
      name,
      mimeType
    };
    if (parentId) {
      metadata.parents = [parentId];
    }

    const metaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (!metaRes.ok) {
      throw new Error(`File metadata creation failed: ${await metaRes.text()}`);
    }

    const metaData = await metaRes.json();
    const fileId = metaData.id;

    // Phase 2: Upload raw media binary/text content
    const mediaRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': mimeType
      },
      body: content
    });

    if (!mediaRes.ok) {
      throw new Error(`File media upload failed: ${await mediaRes.text()}`);
    }

    return fileId;
  } catch (error) {
    console.error(`uploadFileToDrive error for '${name}':`, error);
    throw error;
  }
};

/**
 * Triggers the automatic upload of a session's minutes/notes and raw audio to Google Drive.
 */
export const uploadRecordingToDrive = async (
  recording: Recording,
  noteContent: string,
  transcriptionContent: string
): Promise<{ textFileId?: string; audioFileId?: string; error?: string }> => {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { error: 'Not authenticated with Google. Please reconnect your account.' };
    }

    // Get or create the unified root folder "My Hurdles Notes"
    const folderId = await getOrCreateFolder(token, 'My Hurdles Notes');

    const result: { textFileId?: string; audioFileId?: string } = {};

    // 1. Upload transcription text minutes file
    const formattedDate = new Date(recording.timestamp).toLocaleString();
    const durationMin = Math.floor(recording.duration / 60);
    const durationSec = Math.floor(recording.duration % 60);
    const durationStr = `${durationMin}:${String(durationSec).padStart(2, '0')}`;

    const textContent = `===========================================
My Hurdles - MEETING MINUTES & TRANSCRIPTION
===========================================
Title: ${recording.title}
Recorded At: ${formattedDate}
Duration: ${durationStr}

-------------------------------------------
Meeting Notes / Context Note:
-------------------------------------------
${noteContent || recording.note || "No notes added."}

-------------------------------------------
Diarized Transcription:
-------------------------------------------
${transcriptionContent || recording.transcription || "No transcription generated."}

===========================================
Uploaded automatically to Google Drive
===========================================`;

    const sanitizedTitle = (recording.title || 'recording_minutes').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const txtFileName = `${sanitizedTitle}_minutes.txt`;

    const textFileId = await uploadFileToDrive(token, txtFileName, 'text/plain', textContent, folderId);
    result.textFileId = textFileId;

    // 2. Upload raw audio file (WebM)
    const audioBlob = await getAudioBlob(recording.blobId);
    if (audioBlob) {
      const audioFileName = `${sanitizedTitle}_audio.webm`;
      const audioFileId = await uploadFileToDrive(token, audioFileName, 'audio/webm', audioBlob, folderId);
      result.audioFileId = audioFileId;
    }

    return result;
  } catch (err: any) {
    console.error('Google Drive Auto-Upload Service failed:', err);
    return { error: err.message || 'Auto-upload to Google Drive failed internally.' };
  }
};
