
import React, { useState } from 'react';
import { Video, Sparkles, Loader2, Play, Download, AlertCircle, Key } from 'lucide-react';
import { generateVideo } from '../services/aiService';

export const VideoStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    // Check for API key selection as per Veo instructions
    // Corrected: hasSelectedApiKey is an asynchronous operation and must be awaited.
    if (!(await (window as any).aistudio?.hasSelectedApiKey())) {
      setError("Please select a paid API key from the 'Key' button first.");
      return;
    }

    if (!prompt.trim()) return;
    setIsProcessing(true);
    setError(null);
    setVideoUrl(null);
    
    try {
      const url = await generateVideo(prompt, setStatus);
      setVideoUrl(url);
    } catch (err: any) {
      // Follow-up on specific API errors as per GenAI SDK guidelines
      if (err.message?.includes("Requested entity was not found")) {
        setError("API Key issue. Please re-select your key.");
        await (window as any).aistudio?.openSelectKey();
      } else {
        setError("Generation failed. Check your prompt and connection.");
      }
    } finally {
      setIsProcessing(false);
      setStatus('');
    }
  };

  const handleOpenKeySelector = async () => {
    try {
      await (window as any).aistudio?.openSelectKey();
      setError(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 md:p-12 max-w-5xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
          <Video className="w-6 h-6 text-fs-primary" /> Video Studio
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Generate community highlight videos using AI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Video Prompt</label>
              <button 
                onClick={handleOpenKeySelector}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-fs-primary hover:underline"
              >
                <Key className="w-3 h-3" /> Select API Key
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., 'A drone shot over a quiet suburban neighborhood with trees and parks'..."
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-fs-primary outline-none h-32 dark:text-white"
            />
            <p className="text-[10px] text-slate-400 mt-2">Paid API key with billing enabled required. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline">Docs</a></p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isProcessing || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-fs-primary text-white py-4 rounded-2xl font-bold shadow-lg disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isProcessing ? 'Generating...' : 'Create Video'}
          </button>

          {status && <p className="text-center text-xs font-medium text-fs-primary animate-pulse">{status}</p>}
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs flex gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
        </div>

        <div className="bg-black rounded-2xl h-80 lg:h-auto min-h-[400px] flex items-center justify-center relative overflow-hidden shadow-2xl">
          {videoUrl ? (
            <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
          ) : (
            <div className="text-center opacity-30">
               <Play className="w-20 h-20 text-white mx-auto mb-4" />
               <p className="text-white text-sm">Preview Window</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
