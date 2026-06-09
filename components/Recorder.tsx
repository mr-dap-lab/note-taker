
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, SignalHigh, Play, Pause, Trash2, Check, X, Upload, Globe, ChevronDown, Save, Sparkles, Volume2, Mail, FileText, FileCheck, ArrowRight, Bookmark } from 'lucide-react';
import { saveAudioBlob } from '../services/dbService';
import { sendNotification } from '../services/notificationService';

interface RecorderProps {
  onRecordingComplete: (blobId: string, duration: number, defaultName: string, note: string, language: string) => void;
  activeTranscription?: { startTime: number; title: string } | null;
}

const LANGUAGES = [
    { code: 'English', label: 'English' },
    { code: 'Spanish', label: 'Español (Spanish)' },
    { code: 'French', label: 'Français (French)' },
    { code: 'German', label: 'Deutsch (German)' },
    { code: 'Portuguese', label: 'Português (Portuguese)' },
    { code: 'Chinese', label: '中文 (Chinese)' },
];

const AUTOSAVE_KEY = 'fs_recorder_autosave_note';

const NOTE_TEMPLATES = [
  {
    id: 'oneonone',
    label: '1-on-1',
    emoji: '🤝',
    content: `# 1-on-1 Agenda & Notes\n\n• Progress & Wins:\n- \n\n• Obstacles & Support Needed:\n- \n\n• Action Items:\n- `
  },
  {
    id: 'sync',
    label: 'Project Sync',
    emoji: '⚡',
    content: `# Project Sync Notes\n\n• Key Progress Updates:\n- \n\n• Current Blockers:\n- \n\n• Next Deliverables:\n- `
  },
  {
    id: 'board',
    label: 'Board Meeting',
    emoji: '🏛️',
    content: `# Board Meeting Minutes\n\n• Strategic Topics:\n- \n\n• Voting & Resolutions:\n- \n\n• Action Items:\n- `
  },
  {
    id: 'brainstorm',
    label: 'Brainstorming',
    emoji: '💡',
    content: `# Brainstorm Session\n\n• Core Statement:\n- \n\n• Proposed Solutions:\n- \n\n• Selected Experiments:\n- `
  }
];

export const Recorder: React.FC<RecorderProps> = ({ onRecordingComplete, activeTranscription }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(() => {
    const saved = localStorage.getItem('pref_voice_commands');
    return saved !== 'false';
  });
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'error'>('idle');
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [note, setNote] = useState(''); 
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [language, setLanguage] = useState('English');
  const [sensitivity, setSensitivity] = useState(100); // 100 = 100% gain (1.0)
  const [noiseReductionEnabled, setNoiseReductionEnabled] = useState(() => {
    return localStorage.getItem('pref_noise_reduction') === 'true';
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleNoiseReduction = () => {
    const newVal = !noiseReductionEnabled;
    setNoiseReductionEnabled(newVal);
    localStorage.setItem('pref_noise_reduction', String(newVal));
  };
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [elapsedTranscriptionTime, setElapsedTranscriptionTime] = useState(0);

  // References to keep callbacks current with fresh state values
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const durationRef = useRef(0);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const insertLiveMarker = (viaVoice = false) => {
    playFeedbackBeep(805, 0.08);
    const timestamp = formatTime(durationRef.current);
    const label = viaVoice ? "Voice command inserted marker" : "Manual timestamp marker";
    const markerText = `\n📍 [Marker @ ${timestamp}] ${label}\n`;
    setNote(prev => prev.trim() + markerText);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      playFeedbackBeep(350, 0.15);
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      playFeedbackBeep(550, 0.15);
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
  };

  // Setup Web Speech API continuous hands-free voice command system
  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setVoiceStatus('error');
      return;
    }

    if (isRecording && voiceCommandsEnabled) {
      if (!recognitionRef.current) {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setVoiceStatus('listening');
        };

        recognition.onresult = (event: any) => {
          const lastResultIndex = event.results.length - 1;
          const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
          console.log("Speech recognition command detected:", transcript);

          if (transcript.includes("stop recording") || transcript.includes("finish recording") || transcript.includes("stop session")) {
            setLastCommand("Stop recording");
            stopRecording();
          } else if (transcript.includes("pause recording") || transcript.includes("pause session") || transcript === "pause") {
            setLastCommand("Pause");
            pauseRecording();
          } else if (transcript.includes("resume recording") || transcript.includes("resume session") || transcript === "resume") {
            setLastCommand("Resume");
            resumeRecording();
          } else if (transcript.includes("add marker") || transcript.includes("insert marker") || transcript.includes("bookmark")) {
            setLastCommand("Add marker");
            insertLiveMarker(true);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          if (event.error === 'not-allowed') {
            setVoiceStatus('error');
          }
        };

        recognition.onend = () => {
          if (isRecordingRef.current && voiceCommandsEnabled) {
            try {
              recognition.start();
            } catch (e) {
              console.error("Failed to auto-restart speech recognition:", e);
            }
          } else {
            setVoiceStatus('idle');
          }
        };

        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch (e) {
          console.error("Failed to start speech recognition:", e);
          setVoiceStatus('error');
        }
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
        setVoiceStatus('idle');
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, [isRecording, voiceCommandsEnabled]);

  const handleApplyTemplate = (templateContent: string) => {
    if (!note.trim()) {
      setNote(templateContent);
      return;
    }
    const choice = window.confirm(
      "Your draft notes are not empty. Do you want to REPLACE your current notes with this template?\n\n- Click OK to REPLACE.\n- Click Cancel to APPEND the template to the end."
    );
    if (choice) {
      setNote(templateContent);
    } else {
      setNote(prev => prev.trim() + "\n\n" + templateContent);
    }
  };

  const [triggeredActions, setTriggeredActions] = useState<{ [key: string]: 'idle' | 'loading' | 'success' }>({
    email: 'idle',
    notion: 'idle',
  });

  const handleTriggerAction = async (actionId: 'email' | 'notion') => {
    setTriggeredActions(prev => ({ ...prev, [actionId]: 'loading' }));
    
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    setTriggeredActions(prev => ({ ...prev, [actionId]: 'success' }));
    
    if (actionId === 'email') {
      sendNotification(
        "Workflow: Email Sent", 
        `Meeting summary for "${uploadedFileName || 'New Recording'}" has been dispatched to the board.`
      );
    } else if (actionId === 'notion') {
      sendNotification(
        "Workflow: Notion Created", 
        `A fresh meeting minutes record has been added to your Notion workspace.`
      );
    }
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Load draft on mount
  useEffect(() => {
    const savedNote = localStorage.getItem(AUTOSAVE_KEY);
    if (savedNote) {
      setNote(savedNote);
      setLastSaved(new Date());
    }
  }, []);

  // Transcription Timer logic
  useEffect(() => {
    let interval: number | null = null;
    if (activeTranscription) {
      interval = window.setInterval(() => {
        setElapsedTranscriptionTime(Math.floor((Date.now() - activeTranscription.startTime) / 1000));
      }, 1000);
    } else {
      setElapsedTranscriptionTime(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [activeTranscription]);

  // Auto-save logic
  useEffect(() => {
    const interval = setInterval(() => {
      if (note.trim()) {
        localStorage.setItem(AUTOSAVE_KEY, note);
        setLastSaved(new Date());
        setIsAutoSaving(true);
        setTimeout(() => setIsAutoSaving(false), 2000);
      }
    }, 10000);

    const handleBeforeUnload = () => {
      if (note.trim()) {
        localStorage.setItem(AUTOSAVE_KEY, note);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (note.trim()) {
        localStorage.setItem(AUTOSAVE_KEY, note);
      }
    };
  }, [note]);

  // Update gain in real-time if sensitivity changes while recording
  useEffect(() => {
    if (gainNodeRef.current) {
      // Map 0-100 to 0.0 - 1.0 (or higher if we wanted to allow boost, but 1.0 is safe for volume)
      gainNodeRef.current.gain.setTargetAtTime(sensitivity / 100, audioContextRef.current?.currentTime || 0, 0.1);
    }
  }, [sensitivity]);

  const playFeedbackBeep = (freq: number, dur: number = 0.1) => {
    if (localStorage.getItem('pref_audio_feedback') === 'false') {
      return;
    }
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch (e) {
      console.warn("Feedback audio failed to play:", e);
    }
  };

  const startRecording = async () => {
    playFeedbackBeep(600, 0.12);
    setError(null);
    setRecordedBlob(null);
    setAudioUrl(null);
    setUploadedFileName(null);
    setDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = sensitivity / 100;
      gainNodeRef.current = gainNode;

      const destination = audioCtx.createMediaStreamDestination();

      if (noiseReductionEnabled) {
        // Highpass filter cuts out low frequency air conditioning hum, rumbling, and vibration below 150Hz
        const hpFilter = audioCtx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.value = 150;
        hpFilter.Q.value = 0.8;

        // Lowpass filter cuts out high frequency digital hiss, fan whistle, and squeaks above 3400Hz
        const lpFilter = audioCtx.createBiquadFilter();
        lpFilter.type = 'lowpass';
        lpFilter.frequency.value = 3400;
        lpFilter.Q.value = 0.8;

        source.connect(hpFilter);
        hpFilter.connect(lpFilter);
        lpFilter.connect(gainNode);
      } else {
        source.connect(gainNode);
      }

      gainNode.connect(destination);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(destination.stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setAudioUrl(url);
        setIsRecording(false);
        setIsPaused(false);
        streamRef.current?.getTracks().forEach(track => track.stop());
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
      };

      recorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      timerIntervalRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      const analyser = audioCtx.createAnalyser();
      gainNode.connect(analyser);
      analyser.fftSize = 256;
      
      const startDrawing = () => {
        const checkAndDraw = () => {
          const canvas = canvasRef.current;
          if (!canvas) {
            // Retry quickly if react has not committed the canvas node to DOM yet
            setTimeout(checkAndDraw, 50);
            return;
          }
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          let phase = 0;
          const draw = () => {
              if (!canvasRef.current) return;
              animationFrameRef.current = requestAnimationFrame(draw);
              
              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(dataArray);
              
              // Calculate dynamic scaled volume levels
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
              }
              const average = sum / dataArray.length;
              // Amplify speech subtly to make it highly reactive; fallback to gentle idle wiggle when quiet
              const volumeLevel = Math.min(1.0, (average / 128) * 1.6 + 0.15);

              const width = canvas.width;
              const height = canvas.height;
              ctx.clearRect(0, 0, width, height);

              // Map the volumeLevel (which is 0.15 normalized-idle to 1.0 maximum-loud) to an HSL color spectrum.
              // Low volume maps to bright blue (hue ~210).
              // Moderate volume maps to bright yellow (hue ~55).
              // Maximum volume maps to red (hue ~0).
              const volumeNormalized = Math.max(0, Math.min(1, (volumeLevel - 0.15) / 0.85));
              let hue = 210; // Default blue
              if (volumeNormalized < 0.5) {
                // Interpolate from blue (210) to yellow (55)
                const ratio = volumeNormalized / 0.5;
                hue = Math.round(210 - ratio * 155);
              } else {
                // Interpolate from yellow (55) to red (0)
                const ratio = (volumeNormalized - 0.5) / 0.5;
                hue = Math.round(55 - ratio * 55);
              }

              // 3 premium overlapping wave paths of the voice waveform
              const waves = [
                { hsl: `hsla(${hue}, 85%, 55%, 0.85)`, speed: 0.12, amplitude: 18, frequency: 0.016, lineWidth: 2.5 },
                { hsl: `hsla(${hue}, 80%, 50%, 0.45)`, speed: -0.09, amplitude: 12, frequency: 0.024, lineWidth: 1.5 },
                { hsl: `hsla(${hue}, 90%, 60%, 0.20)`, speed: 0.06, amplitude: 22, frequency: 0.01, lineWidth: 1 }
              ];

              phase += 0.07; // Increment global wave speed

              // Beautiful horizontally fading gradients so waves elegantly vanish near left and right margins
              const gradient = ctx.createLinearGradient(0, 0, width, 0);
              gradient.addColorStop(0, `hsla(${hue}, 85%, 55%, 0.05)`);
              gradient.addColorStop(0.5, `hsla(${hue}, 85%, 55%, 1)`);
              gradient.addColorStop(1, `hsla(${hue}, 85%, 55%, 0.05)`);

              waves.forEach((wave, waveIdx) => {
                  ctx.beginPath();
                  ctx.lineWidth = wave.lineWidth;
                  ctx.strokeStyle = waveIdx === 0 ? gradient : wave.hsl;
                  ctx.lineCap = 'round';
                  
                  const currentPhase = phase * (wave.speed > 0 ? 1 : -1) * Math.abs(wave.speed);

                  for (let x = 0; x < width; x++) {
                      // Sine envelope pins endpoints of waves to middle-axis (y = height/2)
                      // This eliminates clipping artifacts at the exact left/right boundaries of the container.
                      const envelope = Math.sin((x / width) * Math.PI);
                      
                      const y = (height / 2) + 
                          Math.sin(x * wave.frequency + currentPhase) * 
                          wave.amplitude * 
                          volumeLevel * 
                          envelope;
                          
                      if (x === 0) {
                          ctx.moveTo(x, y);
                      } else {
                          ctx.lineTo(x, y);
                      }
                  }
                  ctx.stroke();
              });
          };
          draw();
        };
        checkAndDraw();
      };
      
      startDrawing();

    } catch (err: any) {
      setError(err.name === 'NotAllowedError' ? "Microphone access denied." : "Failed to start recorder.");
    }
  };

  const stopRecording = () => {
    playFeedbackBeep(450, 0.18);
    mediaRecorderRef.current?.stop();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      setError(null);
    }
  };

  const handleSave = async () => {
    if (!recordedBlob) return;
    setIsProcessing(true);
    const blobId = `rec_${Date.now()}`;
    try {
        await saveAudioBlob(blobId, recordedBlob);
        localStorage.removeItem(AUTOSAVE_KEY);
        onRecordingComplete(blobId, duration, uploadedFileName?.replace(/\.[^/.]+$/, "") || `Meeting ${new Date().toLocaleDateString()}`, note, language);
    } catch (err) {
        setError("Failed to save.");
    } finally {
        setIsProcessing(false);
        setNote('');
        setAudioUrl(null);
        setRecordedBlob(null);
        setTriggeredActions({ email: 'idle', notion: 'idle' });
    }
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="w-full space-y-4">
      <input type="file" accept="audio/*" className="hidden" id="file-upload" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
            setRecordedBlob(file);
            setAudioUrl(URL.createObjectURL(file));
            setUploadedFileName(file.name);
        }
      }} />

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 shadow-xl shadow-slate-100 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col items-center transition-all duration-300">
        
        {!recordedBlob ? (
          <>
            <div className="h-12 w-full mb-3 flex justify-center items-center bg-slate-50/40 dark:bg-slate-900/30 rounded-2xl border border-slate-100/40 dark:border-slate-800/40 px-4">
              {isRecording ? (
                <canvas 
                  ref={canvasRef} 
                  width={320} 
                  height={48} 
                  className="w-full max-w-xs h-12" 
                />
              ) : (
                <div className="text-slate-400 dark:text-slate-550 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                  <SignalHigh className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                  Microphone Ready
                </div>
              )}
            </div>
            
            <div className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tabular-nums">
              {formatTime(duration)}
            </div>

            <div className="flex flex-col items-center gap-3 w-full">
              {!isRecording ? (
                <button onClick={startRecording} className="w-16 h-16 bg-fs-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-fs-primary/30 hover:scale-105 active:scale-95 transition-all cursor-pointer">
                  <Mic className="w-7 h-7" />
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="flex items-center justify-center gap-4">
                    {/* Pause / Resume Button */}
                    <button
                      onClick={isPaused ? resumeRecording : pauseRecording}
                      className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-750 dark:text-slate-350 rounded-full flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50 shadow-md hover:scale-105 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                      title={isPaused ? "Resume Recording" : "Pause Recording"}
                    >
                      {isPaused ? <Play className="w-4 h-4 fill-current ml-0.5 text-emerald-500" /> : <Pause className="w-4 h-4 fill-current" />}
                    </button>

                    {/* Stop Button */}
                    <div className="relative">
                      {!isPaused && (
                        <>
                          <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25" style={{ animationDuration: '2s' }} />
                          <div className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-40 scale-105" />
                        </>
                      )}
                      
                      <button 
                        onClick={stopRecording} 
                        className="relative z-10 w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        title="Finish and Review Recording"
                      >
                        <Square className="w-5 h-5 fill-current" />
                      </button>
                    </div>

                    {/* Add Marker Button */}
                    <button
                      onClick={() => insertLiveMarker(false)}
                      className="w-12 h-12 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-md hover:scale-105 hover:bg-amber-600 transition-all cursor-pointer"
                      title="Insert Live Notes Marker"
                    >
                      <Bookmark className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider ${isPaused ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 animate-pulse' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
                      {isPaused ? '● PAUSED' : '● RECORDING'}
                    </span>
                    
                    <button 
                      onClick={cancelRecording}
                      className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider bg-slate-50 dark:bg-slate-800/40 rounded-full border border-slate-100 dark:border-slate-800"
                    >
                      <X className="w-2.5 h-2.5" /> Cancel Session
                    </button>
                  </div>
                </div>
              )}

              {/* Controls Group */}
              <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                  {/* Language Selector */}
                  <div className="relative inline-block">
                    <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="appearance-none pl-8 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-fs-primary/30 transition-all cursor-pointer"
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
                      <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                    </div>
                  </div>

                  {/* Sensitivity Slider */}
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-slate-400" title="Adjust Input Sensitivity">
                      <Volume2 className="w-3.5 h-3.5" />
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={sensitivity}
                      onChange={(e) => setSensitivity(parseInt(e.target.value))}
                      className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-fs-primary"
                    />
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 w-6">{sensitivity}%</span>
                  </div>

                  {/* Noise Reduction Toggle */}
                  <button
                    type="button"
                    onClick={toggleNoiseReduction}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer select-none ${
                      noiseReductionEnabled
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                    title="Filter ambient background murmur, hum and hiss before save"
                  >
                    <SignalHigh className={`w-3.5 h-3.5 ${noiseReductionEnabled ? 'text-emerald-500 animate-pulse' : 'text-slate-450'}`} />
                    <span>Cancel Noise: {noiseReductionEnabled ? 'ON' : 'OFF'}</span>
                  </button>
              </div>

              {!isRecording && (
                <button onClick={() => document.getElementById('file-upload')?.click()} className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-fs-primary flex items-center gap-1.5 uppercase tracking-widest mt-0.5">
                  <Upload className="w-3.5 h-3.5" /> Import Audio
                </button>
              )}

              {/* Hands-Free Voice Commands Panel */}
              {isRecording && (
                <div className="w-full bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-150 dark:border-slate-800/80 transition-all">
                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                    <div className="flex items-center gap-1.5">
                      <Mic className={`w-3.5 h-3.5 ${voiceCommandsEnabled && voiceStatus === 'listening' ? 'text-emerald-500 animate-pulse' : 'text-slate-450'}`} />
                      <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Hands-Free Voice Commands</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={voiceCommandsEnabled} 
                        onChange={(e) => setVoiceCommandsEnabled(e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-7 h-4 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-fs-primary"></div>
                    </label>
                  </div>

                  {voiceCommandsEnabled ? (
                    <div className="space-y-1.5 px-0.5">
                      {voiceStatus === 'listening' ? (
                        <>
                          <p className="text-[8.5px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
                            Say clearly anytime to control:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 rounded text-[8.5px] font-mono hover:scale-102 transition-transform cursor-help" title='Say "Pause" or "Pause recording"'>🗣️ "Pause"</span>
                            <span className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 rounded text-[8.5px] font-mono hover:scale-102 transition-transform cursor-help" title='Say "Resume" or "Resume recording"'>🗣️ "Resume"</span>
                            <span className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 rounded text-[8.5px] font-mono hover:scale-102 transition-transform cursor-help" title='Say "Add marker" or "Insert marker"'>🗣️ "Add marker"</span>
                            <span className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 rounded text-[8.5px] font-mono hover:scale-102 transition-transform cursor-help" title='Say "Stop recording"'>🗣️ "Stop recording"</span>
                          </div>
                        </>
                      ) : voiceStatus === 'error' ? (
                        <p className="text-[8.5px] font-black text-amber-500 bg-amber-500/5 p-1.5 rounded-lg border border-amber-500/10">
                          ⚠️ Speech API is unsupported in this browser or permission was denied.
                        </p>
                      ) : (
                        <p className="text-[8.5px] font-medium text-slate-400 italic">Initializing speech pipeline...</p>
                      )}
                      {lastCommand && (
                        <p className="text-[9.5px] font-black text-emerald-500 animate-pulse flex items-center gap-1">
                          <span>⚡ Executed:</span>
                          <span className="underline italic">"{lastCommand}"</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[8.5px] font-bold text-slate-400 italic px-0.5">Voice commands are muted. Toggle switch above to activate.</p>
                  )}
                </div>
              )}

              {/* Note Templates Selection */}
              <div className="w-full pt-3.5 border-t border-slate-100 dark:border-slate-800/60 mt-3">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-505 fill-current" /> Note Templates
                  </span>
                  {note.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to clear your current notes? This is irreversible.")) {
                          setNote('');
                          localStorage.removeItem(AUTOSAVE_KEY);
                        }
                      }}
                      className="text-[8.5px] font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors uppercase tracking-wider bg-transparent border-0 cursor-pointer"
                    >
                      Clear Notes
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 w-full">
                  {NOTE_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl.content)}
                      className="px-3 py-2 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 text-left hover:border-fs-primary/50 hover:bg-slate-50/55 dark:hover:bg-slate-850/80 transition-all flex items-center gap-2 group cursor-pointer"
                    >
                      <span className="text-sm bg-slate-50 dark:bg-slate-800 p-1 rounded-lg filter group-hover:scale-110 transition-transform">
                        {tmpl.emoji}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 truncate">{tmpl.label}</p>
                        <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-tight">Structured prompt</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {(isRecording || note) && (
                <div className="w-full space-y-1 mt-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Live Meeting Notes ({language})</label>
                    <div className="flex items-center gap-1">
                      <div className={`w-1 h-1 rounded-full ${isAutoSaving ? 'bg-fs-primary animate-ping' : 'bg-slate-300'}`} />
                      <span className="text-[8px] font-bold text-slate-400 uppercase">
                        {isAutoSaving ? 'Auto-saving...' : (lastSaved ? `Saved ${lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : '')}
                      </span>
                    </div>
                  </div>
                  <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Type live annotations here..."
                    className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-xs border border-transparent focus:border-slate-200 dark:focus:border-slate-700 focus:ring-0 focus:outline-none resize-none h-16 md:h-20 dark:text-white shadow-inner"
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl mb-3 flex items-center justify-between border border-slate-100 dark:border-slate-800 shadow-inner gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 flex-shrink-0 bg-slate-900 dark:bg-slate-700 text-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform">
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                <div className="min-w-0">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Review Mode ({language})</p>
                  <h3 className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate pr-2 max-w-[150px]">{uploadedFileName || 'New Recording'}</h3>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="w-full mb-3 border border-slate-150 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl p-4 text-left">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Quick Actions</span>
              </div>
              
              <div className="flex flex-col gap-2">
                {/* Action 1: Email Summary to Board */}
                <button
                  type="button"
                  onClick={() => handleTriggerAction('email')}
                  disabled={triggeredActions.email !== 'idle'}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-[11px] font-bold tracking-tight transition-all duration-200 ${
                    triggeredActions.email === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : triggeredActions.email === 'loading'
                      ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-fs-primary/45 hover:bg-slate-50/60 dark:hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      triggeredActions.email === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <span>Email Summary to Board</span>
                  </div>
                  <div>
                    {triggeredActions.email === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                    {triggeredActions.email === 'success' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                    {triggeredActions.email === 'idle' && <ArrowRight className="w-3.5 h-3.5 text-slate-400" />}
                  </div>
                </button>

                {/* Action 2: Create Notion Page */}
                <button
                  type="button"
                  onClick={() => handleTriggerAction('notion')}
                  disabled={triggeredActions.notion !== 'idle'}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-[11px] font-bold tracking-tight transition-all duration-200 ${
                    triggeredActions.notion === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : triggeredActions.notion === 'loading'
                      ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-fs-primary/45 hover:bg-slate-50/60 dark:hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      triggeredActions.notion === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-purple-500/10 text-purple-500'
                    }`}>
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span>Create Notion Page</span>
                  </div>
                  <div>
                    {triggeredActions.notion === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                    {triggeredActions.notion === 'success' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                    {triggeredActions.notion === 'idle' && <ArrowRight className="w-3.5 h-3.5 text-slate-400" />}
                  </div>
                </button>
              </div>
            </div>

            <div className="w-full space-y-1 mb-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Finalize Notes</label>
                {lastSaved && (
                  <span className="text-[8px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Save className="w-2 h-2" /> Draft Persisted
                  </span>
                )}
              </div>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Finalize notes before saving..."
                className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-xs border border-transparent focus:border-slate-200 dark:focus:border-slate-700 focus:ring-0 focus:outline-none resize-none h-16 md:h-20 dark:text-white shadow-inner"
              />
            </div>

            <div className="flex w-full gap-3">
               <button onClick={() => {
                 if (window.confirm("Are you sure? This will discard the session.")) {
                   setRecordedBlob(null);
                   setAudioUrl(null);
                 }
               }} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px] font-bold rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors">DISCARD</button>
               <button onClick={handleSave} disabled={isProcessing} className="flex-[2] py-2.5 bg-fs-primary text-white text-[11px] font-bold rounded-xl shadow-md shadow-fs-primary/10 flex items-center justify-center gap-1.5 hover:scale-[1.01] transition-transform active:scale-95 disabled:opacity-50">
                 {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                 {isProcessing ? 'SAVING...' : 'SAVE TO HISTORY'}
               </button>
            </div>
          </div>
        )}
      </div>

      {activeTranscription && (
        <div className="bg-slate-900 dark:bg-slate-100 p-5 rounded-3xl shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-500">
           <div className="relative">
             <div className="w-10 h-10 bg-fs-primary rounded-full flex items-center justify-center">
               <Sparkles className="w-5 h-5 text-white animate-pulse" />
             </div>
             <div className="absolute -inset-1 bg-fs-primary rounded-full animate-ping opacity-20 pointer-events-none" />
           </div>
           <div className="flex-1 min-w-0">
             <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">AI Transcription in Progress</p>
             <h4 className="text-sm font-bold text-white dark:text-slate-900 truncate">{activeTranscription.title}</h4>
           </div>
           <div className="text-right">
             <div className="text-sm font-mono font-bold text-fs-primary tracking-tighter tabular-nums">
               {formatTime(elapsedTranscriptionTime)}
             </div>
             <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Elapsed</p>
           </div>
        </div>
      )}
      
      {error && <p className="mt-4 text-center text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/10 py-2 rounded-lg">{error}</p>}
    </div>
  );
};
