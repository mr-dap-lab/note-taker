import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Initialize express app
const app = express();
const PORT = 3000;

// Enable JSON payloads up to 50MB for raw audio/image base64 transfers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper to lazy initialize the GoogleGenAI instance on-demand
const getAI = () => {
  const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY or API_KEY environment variable is missing on the server.");
  }
  return new GoogleGenAI({ apiKey: key });
};

// --- API Service Routes ---

// Transcribe audio
app.post("/api/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType, language = "English" } = req.body;
    if (!audioBase64) {
      res.status(400).json({ error: "Missing audioBase64 in request body." });
      return;
    }

    const ai = getAI();
    const type = mimeType || "audio/webm";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: type, data: audioBase64 } },
          { text: `Transcribe this board meeting audio. The primary language spoken is ${language}.` }
        ]
      },
      config: {
        systemInstruction: "You are an expert transcriber and minute-taker for board meetings. Your goal is to provide a highly accurate, speaker-diarized transcript.\n\nRules:\n1. Identify different speakers based on voice, tone, context, and pauses. \n2. Even if a speaker isn't named, label them as 'Speaker 1', 'Speaker 2', etc. consistently.\n3. Format the output as a script (e.g., 'Speaker Name: Content').\n4. Use natural formatting for speech patterns. Avoid filler words like 'um' or 'uh'.\n5. Focus solely on the dialogue and discussion points.",
      }
    });

    res.json({ transcription: response.text || "No transcription generated." });
  } catch (err: any) {
    console.error("Server /api/transcribe error:", err);
    res.status(500).json({ error: err.message || "Transcription failed internally." });
  }
});

// Generate Key Insights
app.post("/api/insights", async (req, res) => {
  try {
    const { transcription, note } = req.body;
    if (!transcription) {
      res.status(400).json({ error: "Missing transcription in request body." });
      return;
    }

    const ai = getAI();
    const prompt = `Based on the following board meeting transcription, generate a concise "Key Insights" summary card contents.
${note ? `Meeting context note: "${note}"\n` : ''}
Please capture:
1. **Decision Summary**: Primary choices made.
2. **Action Items**: Key deliverables assigned (with the responsible person, if mentioned).
3. **Crucial Takeaways**: High-level strategic or operational elements discussed.

Transcription:
${transcription}

Format guidelines:
- Present the information in an elegant, readable outline form using bold labels and clear bullets.
- Do not make up facts or people; rely strictly on the provided transcript.
- Keep the response highly concise, professional, and readable as a summary card.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional enterprise synthesizer. Generate concise, highly executive, bulleted summaries of business conversations, highlighting key conclusions and core actions."
      }
    });

    res.json({ insights: response.text || "No insights could be extracted." });
  } catch (err: any) {
    console.error("Server /api/insights error:", err);
    res.status(500).json({ error: err.message || "Failed to generate Key Insights." });
  }
});

// Generate Smart Summary (3 Bullet Points)
app.post("/api/summary", async (req, res) => {
  try {
    const { transcription } = req.body;
    if (!transcription) {
      res.status(400).json({ error: "Missing transcription in request body." });
      return;
    }

    const ai = getAI();
    const prompt = `Based on the following meeting transcription, generate a concise 3-bullet point executive summary of the meeting.
You must return EXACTLY three bullet points. Each bullet point should be a concise, powerful, professional sentence representing the main agreements, major outcomes, or key high-level discussion points.

Transcription:
${transcription}

Format requirements:
- EXACTLY three bullet points.
- Bullet points must start with a standard bullet sign like "• ".
- Professional, clear, and highly focused.
- Do not add any conversational intro or outro text (e.g., do not say "Here is your summary:") - return only the three bullet points themselves.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite chief-of-staff executive writer. Your job is to condense lengthy business discussion transcripts into precisely three powerful, comprehensive, and high-impact bulleted takeaways."
      }
    });

    res.json({ summary: response.text?.trim() || "No summary was generated." });
  } catch (err: any) {
    console.error("Server /api/summary error:", err);
    res.status(500).json({ error: err.message || "Failed to generate Smart Summary." });
  }
});

// Extract keywords
app.post("/api/keywords", async (req, res) => {
  try {
    const { transcription } = req.body;
    if (!transcription) {
      res.status(400).json({ error: "Missing transcription in request body." });
      return;
    }

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Based on the following meeting transcription, extract 5 relevant keywords or short phrases (1-3 words each) that represent the main topics discussed.\n\nTranscription:\n${transcription}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          },
          description: "A list of exactly 5 clean, professional keywords or short phrases representing the main topics of discussion."
        },
        systemInstruction: "You are an AI keyphrase extractor. Extract exactly 5 most essential keywords or brief concepts. Return only a JSON array of strings."
      }
    });

    const text = response.text || "[]";
    const keywords = JSON.parse(text.trim());
    res.json({ keywords: Array.isArray(keywords) ? keywords.slice(0, 5) : [] });
  } catch (err: any) {
    console.error("Server /api/keywords error:", err);
    res.status(500).json({ error: err.message || "Failed to extract keywords." });
  }
});

// Edit image
app.post("/api/edit-image", async (req, res) => {
  try {
    const { imageBase64, mimeType, prompt } = req.body;
    if (!imageBase64 || !prompt) {
      res.status(400).json({ error: "Missing imageBase64 or prompt in request body." });
      return;
    }

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType || "image/png",
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    let finalUrl = "";
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          finalUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!finalUrl) {
      throw new Error("No image was returned by Gemini.");
    }

    res.json({ imageUrl: finalUrl });
  } catch (err: any) {
    console.error("Server /api/edit-image error:", err);
    res.status(500).json({ error: err.message || "Failed to edit image." });
  }
});

// Generate Videos (Veo)
app.post("/api/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "Missing prompt in request body." });
      return;
    }

    const ai = getAI();
    let operation = await ai.models.generateVideos({
      model: "veo-3.1-fast-generate-preview",
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: "720p",
        aspectRatio: "16:9"
      }
    });

    // Handle full polling sequence on the server to prevent complex client-side code
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("Video operations succeeded but video URI is empty.");
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
    const finalVideoUrl = `${downloadLink}&key=${apiKey}`;

    res.json({ videoUrl: finalVideoUrl });
  } catch (err: any) {
    console.error("Server /api/generate-video error:", err);
    res.status(500).json({ error: err.message || "Video generation failed." });
  }
});

// --- Vite Serving Logic ---

const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    // Mounting Vite middleware in Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serving built assets in Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Meeting Note Taker] Running full-stack on http://0.0.0.0:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
