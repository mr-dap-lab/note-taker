/**
 * Client-Side AI Service
 * Communicates safely with our secure server-side routes to avoid exposing keys
 * or running Node.js targeted packages in the client runtime.
 */

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const transcribeAudio = async (audioBlob: Blob, language: string = 'English'): Promise<string> => {
  try {
    const base64Data = await blobToBase64(audioBlob);
    const mimeType = audioBlob.type || 'audio/webm';

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioBase64: base64Data,
        mimeType,
        language
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.transcription || "No transcription generated.";
  } catch (error) {
    console.error("Transcription failed:", error);
    return "Transcription failed. Please try again later.";
  }
};

/**
 * Edits an image using Gemini 2.5 Flash Image model proxy.
 */
export const editImage = async (imageBlob: Blob, prompt: string): Promise<string> => {
  const base64Data = await blobToBase64(imageBlob);
  const mimeType = imageBlob.type || 'image/png';

  const response = await fetch('/api/edit-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64: base64Data,
      mimeType,
      prompt
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to edit image on the server.");
  }

  const data = await response.json();
  return data.imageUrl;
};

/**
 * Generates a video using Veo 3.1 Fast Generate Preview model proxy.
 */
export const generateVideo = async (prompt: string, setStatus: (status: string) => void): Promise<string> => {
  setStatus('Queueing video generation on the server... This typically takes 60-90 seconds.');
  
  const response = await fetch('/api/generate-video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Server failed to generate the video.");
  }

  const data = await response.json();
  return data.videoUrl;
};

/**
 * Generates Key Insights summary from a transcription.
 */
export const generateKeyInsights = async (transcription: string, note?: string): Promise<string> => {
  if (!transcription || !transcription.trim()) {
    return "No transcript content available to extract insights.";
  }
  
  try {
    const response = await fetch('/api/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcription, note })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Server failed to generate Key Insights.");
    }

    const data = await response.json();
    return data.insights || "No insights could be extracted.";
  } catch (error) {
    console.error("Key Insights generation failed:", error);
    return "Failed to generate Key Insights. Please try again later.";
  }
};

/**
 * Generates a concise 3-bullet point executive summary from a transcription.
 */
export const generateSmartSummary = async (transcription: string): Promise<string> => {
  if (!transcription || !transcription.trim()) {
    return "No transcription available to generate an executive summary.";
  }

  try {
    const response = await fetch('/api/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcription })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Server failed to generate Smart Summary.");
    }

    const data = await response.json();
    return data.summary || "No summary was generated.";
  } catch (error) {
    console.error("Smart Summary generation failed:", error);
    return "Failed to generate Smart Summary. Please try again later.";
  }
};

/**
 * Extracts top 5 keywords/phrases from meeting transcription.
 */
export const extractKeywords = async (transcription: string): Promise<string[]> => {
  if (!transcription || !transcription.trim()) {
    return [];
  }

  try {
    const response = await fetch('/api/keywords', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcription })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Server failed to extract keywords.");
    }

    const data = await response.json();
    return data.keywords || [];
  } catch (error) {
    console.error("Keyword extraction failed:", error);
    return [];
  }
};
