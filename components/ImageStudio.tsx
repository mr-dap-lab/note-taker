import React, { useState, useRef } from 'react';
import { Upload, Wand2, Image as ImageIcon, Download, Loader2, X, AlertCircle } from 'lucide-react';
import { editImage } from '../services/aiService';

export const ImageStudio: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setGeneratedImage(null);
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage || !prompt.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await editImage(selectedImage, prompt);
      setGeneratedImage(result);
    } catch (err) {
      setError('Failed to process image. Ensure your API key is valid.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 md:p-12 max-w-5xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
          <Wand2 className="w-6 h-6 text-purple-600" /> Image Studio
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Edit community photos with AI commands.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="relative border-2 border-dashed rounded-2xl h-80 flex flex-col items-center justify-center border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
            {previewUrl ? (
              <img src={previewUrl} alt="Original" className="w-full h-full object-contain p-2 rounded-2xl" />
            ) : (
              <div onClick={() => fileInputRef.current?.click()} className="text-center cursor-pointer p-6">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Upload Photo</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., 'Add a retro filter', 'Make it look like a sketch'..."
            className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none h-24 dark:text-white"
          />
          <button
            onClick={handleGenerate}
            disabled={!selectedImage || isProcessing}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl font-bold disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {isProcessing ? 'Processing...' : 'Apply AI Edit'}
          </button>
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs flex gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
        </div>
        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl h-80 lg:h-auto min-h-[400px] flex items-center justify-center relative overflow-hidden">
          {generatedImage ? (
            <img src={generatedImage} alt="Result" className="max-w-full max-h-full object-contain shadow-lg" />
          ) : (
            <ImageIcon className="w-20 h-20 text-slate-300 dark:text-slate-700" />
          )}
        </div>
      </div>
    </div>
  );
};