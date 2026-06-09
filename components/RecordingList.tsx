import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Share2, FileText, Edit2, Check, Download, Loader2, Sparkles, Copy, ChevronDown, ChevronUp, Trash2, Search, X, Volume2, VolumeX, RotateCcw, RotateCw, Bookmark as BookmarkIcon, Folder, FolderPlus, Tag, Plus, Scissors, BookOpen, MoreVertical, FileDown } from 'lucide-react';
import { Recording, User, Bookmark, Folder as FolderType } from '../types';
import { jsPDF } from 'jspdf';
import { getAudioBlob, saveAudioBlob } from '../services/dbService';
import { HurdleGame } from './HurdleGame';
import { generateKeyInsights, generateSmartSummary } from '../services/aiService';

interface RecordingListProps {
  recordings: Recording[];
  currentUser: User | null;
  onUpdateRecording: (updated: Recording) => void;
  onUpdateMultipleRecordings?: (updatedList: Recording[]) => void;
  onDeleteRecording?: (id: string, blobId: string) => void;
  onDeleteMultipleRecordings?: (ids: string[]) => void;
  onShare: (recording: Recording) => void;
  folders: FolderType[];
  setFolders: React.Dispatch<React.SetStateAction<FolderType[]>>;
}

const getSpeakerColor = (name: string) => {
  const colors = [
    'text-blue-500',
    'text-emerald-500',
    'text-indigo-500',
    'text-slate-500',
    'text-amber-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const highlightText = (text: string, query: string) => {
  if (!query || !query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() 
      ? <mark key={i} className="bg-fs-primary/10 text-fs-primary rounded-sm px-0.5">{part}</mark> 
      : part
  );
};

const highlightTranscriptText = (text: string, query: string, isActiveMatchLine: boolean) => {
  if (!query || !query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() 
      ? <mark 
          key={i} 
          className={`rounded-sm px-0.5 font-semibold transition-all duration-200 ${
            isActiveMatchLine 
              ? "bg-amber-500 text-white shadow-xs ring-1 ring-amber-400" 
              : "bg-amber-100 text-amber-950 dark:bg-amber-950/75 dark:text-amber-200"
          }`}
        >
          {part}
        </mark> 
      : part
  );
};

const renderTranscriptContent = (text: string, localQuery: string, globalQuery: string, isActiveMatchLine: boolean) => {
  if (localQuery && localQuery.trim()) {
    return highlightTranscriptText(text, localQuery, isActiveMatchLine);
  }
  return highlightText(text, globalQuery);
};

const folderColorMap: Record<string, { bgClass: string; bgActive: string; textClass: string; borderClass: string; dotClass: string }> = {
  indigo: {
    bgClass: 'bg-indigo-50/70 border-indigo-200/50 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400',
    bgActive: 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 dark:text-slate-950 font-extrabold shadow-sm',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    borderClass: 'border-indigo-200 dark:border-indigo-900/60',
    dotClass: 'bg-indigo-500'
  },
  emerald: {
    bgClass: 'bg-emerald-50/70 border-emerald-200/50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400',
    bgActive: 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500 dark:text-slate-950 font-extrabold shadow-sm',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-emerald-200 dark:border-emerald-900/60',
    dotClass: 'bg-emerald-500'
  },
  amber: {
    bgClass: 'bg-amber-50/70 border-amber-200/50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-450',
    bgActive: 'bg-amber-500 text-white border-amber-500 dark:bg-amber-500 dark:border-amber-500 dark:text-slate-950 font-extrabold shadow-sm',
    textClass: 'text-amber-600 dark:text-amber-450',
    borderClass: 'border-amber-200 dark:border-amber-900/60',
    dotClass: 'bg-amber-500'
  },
  rose: {
    bgClass: 'bg-rose-50/70 border-rose-200/50 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-450',
    bgActive: 'bg-rose-600 text-white border-rose-600 dark:bg-rose-500 dark:border-rose-500 dark:text-slate-950 font-extrabold shadow-sm',
    textClass: 'text-rose-600 dark:text-rose-450',
    borderClass: 'border-rose-200 dark:border-rose-900/60',
    dotClass: 'bg-rose-500'
  },
  sky: {
    bgClass: 'bg-sky-50/70 border-sky-200/50 text-sky-700 dark:bg-sky-950/20 dark:border-sky-900/40 dark:text-sky-400',
    bgActive: 'bg-sky-600 text-white border-sky-600 dark:bg-sky-500 dark:border-sky-500 dark:text-slate-950 font-extrabold shadow-sm',
    textClass: 'text-sky-600 dark:text-sky-400',
    borderClass: 'border-sky-200 dark:border-sky-900/60',
    dotClass: 'bg-sky-500'
  },
  violet: {
    bgClass: 'bg-violet-50/70 border-violet-200/50 text-violet-700 dark:bg-violet-950/20 dark:border-violet-900/40 dark:text-violet-400',
    bgActive: 'bg-violet-600 text-white border-violet-600 dark:bg-violet-500 dark:border-violet-500 dark:text-slate-950 font-extrabold shadow-sm',
    textClass: 'text-violet-600 dark:text-violet-400',
    borderClass: 'border-violet-200 dark:border-violet-900/60',
    dotClass: 'bg-violet-500'
  }
};

const getFolderSelectStyle = (folderId: string, folders: FolderType[]) => {
  const f = folders.find(folder => folder.id === folderId);
  if (!f) return 'text-slate-400 border-slate-200 dark:border-slate-800';
  const colorKey = f.color || 'indigo';
  const mapping = folderColorMap[colorKey] || folderColorMap.indigo;
  return `${mapping.textClass} ${mapping.borderClass} ${mapping.bgClass}`;
};

const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };

  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  // write WAVE header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // file length - 8
  setUint32(0x45564157);                         // "WAVE"

  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                 // chunk length
  setUint16(1);                                  // sample format (raw PCM)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * numOfChan * 2);  // byte rate
  setUint16(numOfChan * 2);                      // block align
  setUint16(16);                                 // bits per sample

  setUint32(0x61746164);                         // "data" - chunk
  setUint32(length - pos - 4);                   // chunk length

  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    if (offset < buffer.length) {
      for (let i = 0; i < numOfChan; i++) {             // interleave channels
        let sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF; // scale to 16-bit signed int
        view.setInt16(pos, sample, true);          // write 16-bit sample
        pos += 2;
      }
      offset++;
    } else {
      break;
    }
  }

  return new Blob([bufferArr], { type: 'audio/wav' });
};

const AVAILABLE_TAGS = [
  { name: 'Important', color: 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-100 dark:border-red-900/30' },
  { name: 'Follow-up', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/30' },
  { name: 'Budget', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30' },
  { name: 'Action Item', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border-purple-100 dark:border-purple-900/30' },
  { name: 'Decision', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' }
];

export const RecordingList: React.FC<RecordingListProps> = ({ 
  recordings, 
  onUpdateRecording,
  onUpdateMultipleRecordings,
  onDeleteRecording,
  onDeleteMultipleRecordings,
  onShare,
  folders = [],
  setFolders = () => {},
  currentUser
}) => {
  const [selectedRecIds, setSelectedRecIds] = useState<Set<string>>(new Set());
  const [bulkShareUrl, setBulkShareUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingTranscriptId, setEditingTranscriptId] = useState<string | null>(null);
  const [editTranscriptText, setEditTranscriptText] = useState<string>('');

  const exportRecordingToPDF = (rec: Recording) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageHeight = 297;
      const pageWidth = 210;
      const margin = 20;
      let y = 20;

      const checkPageCount = (heightNeeded: number) => {
        if (y + heightNeeded > pageHeight - margin) {
          doc.addPage();
          y = margin;
          drawHeaderFooter();
        }
      };

      const drawHeaderFooter = () => {
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`My Hurdles Meeting Report - ${rec.title}`, margin, pageHeight - 10);
        doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin - 15, pageHeight - 10);
      };

      const addMultilineText = (text: string, fontSize: number, style: string, color: [number, number, number], spacing = 6, indent = 0) => {
        doc.setFont("Helvetica", style);
        doc.setFontSize(fontSize);
        doc.setTextColor(color[0], color[1], color[2]);
        const maxLineWidth = pageWidth - (margin * 2) - indent;
        const lines = doc.splitTextToSize(text, maxLineWidth);
        
        lines.forEach((line: string) => {
          checkPageCount(spacing);
          doc.text(line, margin + indent, y);
          y += spacing;
        });
      };

      const addSectionHeader = (title: string) => {
        y += 4;
        checkPageCount(12);
        doc.setFillColor(240, 245, 245);
        doc.rect(margin, y - 5, pageWidth - (margin * 2), 7, "F");
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(16, 185, 129); // emerald/primary theme color
        doc.text(title.toUpperCase(), margin + 2, y);
        y += 8;
      };

      drawHeaderFooter();
      
      // Title
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // slate-900
      const titleLines = doc.splitTextToSize(rec.title || "Untitled Meeting", pageWidth - (margin * 2));
      titleLines.forEach((line: string) => {
         checkPageCount(10);
         doc.text(line, margin, y);
         y += 8;
      });

      // Metadata card
      y += 2;
      checkPageCount(25);
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.rect(margin, y - 4, pageWidth - (margin * 2), 22, "FD");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("DATE:", margin + 4, y + 1);
      doc.text("DURATION:", margin + 4, y + 7);
      doc.text("FOLDER:", margin + 4, y + 13);

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(51, 65, 85); // slate-700
      doc.text(new Date(rec.timestamp).toLocaleString(), margin + 30, y + 1);
      doc.text(formatTime(rec.duration), margin + 30, y + 7);
      
      const folderName = folders.find(f => f.id === rec.folderId)?.name || 'Uncategorized';
      doc.text(folderName, margin + 30, y + 13);
      y += 24;

      // Keywords
      if (rec.keywords && rec.keywords.length > 0) {
        checkPageCount(10);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("Keywords: " + rec.keywords.join(", "), margin, y);
        y += 8;
      }

      // Smart Summary / Executive Summary Section
      if (rec.smartSummary) {
        addSectionHeader("Executive Summary");
        addMultilineText(rec.smartSummary, 9.5, "normal", [15, 23, 42], 5);
        y += 3;
      } else if (rec.note) {
        addSectionHeader("Notes");
        addMultilineText(rec.note, 9.5, "normal", [15, 23, 42], 5);
        y += 3;
      }

      // Key Insights Section
      if (rec.keyInsights) {
        addSectionHeader("Key Insights");
        const insightsLines = rec.keyInsights.split('\n');
        insightsLines.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          const bullet = trimmed.startsWith('-') || trimmed.startsWith('*') ? trimmed : `• ${trimmed}`;
          addMultilineText(bullet, 9.5, "normal", [15, 23, 42], 5, 2);
          y += 1;
        });
        y += 3;
      }

      // Transcript Section
      if (rec.transcription) {
        addSectionHeader("Diarized Transcript");
        const transcriptLines = rec.transcription.split('\n');
        transcriptLines.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          
          const speakerMatch = trimmed.match(/^(\**[a-zA-Z\s0-9]+(?:\s?\[?\d{2}:\d{2}\]?)*\**):/);
          if (speakerMatch) {
             const speakerName = speakerMatch[1].replace(/[\*\_\[\]]/g, '').trim();
             const content = trimmed.substring(speakerMatch[0].length).trim();
             
             checkPageCount(6);
             doc.setFont("Helvetica", "bold");
             doc.setFontSize(8.5);
             doc.setTextColor(6, 95, 70); // deep emerald tone
             doc.text(speakerName.toUpperCase() + ":", margin, y);
             y += 4;
             
             addMultilineText(content, 9, "normal", [51, 65, 85], 4.5, 3);
             y += 1.5;
          } else {
             addMultilineText(trimmed, 9, "normal", [100, 116, 139], 4.5);
             y += 1.5;
          }
        });
      }

      const safeTitle = (rec.title || "meeting_report").replace(/[^a-z0-9]/gi, "_").toLowerCase();
      doc.save(`meeting_details_${safeTitle}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Could not generate PDF: " + (err instanceof Error ? err.message : String(err)));
    }
  };
  const [audioUpdated, setAudioUpdated] = useState(0);
  const audioEl = audioElRef.current;
  const setAudioEl = (audio: HTMLAudioElement | null) => {
    audioElRef.current = audio;
    setAudioUpdated(prev => prev + 1);
  };
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [generatingInsightsId, setGeneratingInsightsId] = useState<string | null>(null);
  const [generatingSummaryId, setGeneratingSummaryId] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeBookmarkTimes, setActiveBookmarkTimes] = useState<Record<string, number>>({});
  const [bookmarkComments, setBookmarkComments] = useState<Record<string, string>>({});
  const [transcriptQueries, setTranscriptQueries] = useState<Record<string, string>>({});
  const [activeMatchIndices, setActiveMatchIndices] = useState<Record<string, number>>({});
  const [readerModeRecording, setReaderModeRecording] = useState<Recording | null>(null);
  const [readerFontSize, setReaderFontSize] = useState<number>(15); // in pixels

  const [isDeepSearchOpen, setIsDeepSearchOpen] = useState<boolean>(false);
  const [deepSearchQuery, setDeepSearchQuery] = useState<string>('');
  const [trimmingId, setTrimmingId] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [isTrimming, setIsTrimming] = useState<boolean>(false);

  // Folder & Category tracking states
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('indigo');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'longest'>('newest');

  const handleAddBookmark = (rec: Recording) => {
    const comment = bookmarkComments[rec.id]?.trim();
    if (!comment) return;
    
    const time = activeBookmarkTimes[rec.id] ?? (playingId === rec.id && audioEl ? audioEl.currentTime : 0);
    
    const newBookmark: Bookmark = {
      id: 'bm_' + Math.random().toString(36).substring(2, 11),
      time: parseFloat(time.toFixed(2)),
      comment,
      createdAt: new Date().toISOString()
    };
    
    const updatedBookmarks = [...(rec.bookmarks || []), newBookmark].sort((a, b) => a.time - b.time);
    
    onUpdateRecording({
      ...rec,
      bookmarks: updatedBookmarks
    });
    
    setBookmarkComments(prev => ({ ...prev, [rec.id]: '' }));
    setActiveBookmarkTimes(prev => {
      const next = { ...prev };
      delete next[rec.id];
      return next;
    });
  };

  const handleDeleteBookmark = (rec: Recording, bookmarkId: string) => {
    const updatedBookmarks = (rec.bookmarks || []).filter(b => b.id !== bookmarkId);
    onUpdateRecording({
      ...rec,
      bookmarks: updatedBookmarks
    });
  };

  const getWaveformPeaks = (recordingId: string): number[] => {
    const peaks: number[] = [];
    let seed = 0;
    for (let i = 0; i < recordingId.length; i++) {
      seed += recordingId.charCodeAt(i);
    }
    for (let i = 0; i < 40; i++) {
      const pseudoRandom = Math.sin(seed + i * 19.3) * 0.5 + 0.5;
      peaks.push(15 + Math.floor(pseudoRandom * 70));
    }
    return peaks;
  };

  const getLineTimestamp = (lines: string[], index: number, totalDuration: number) => {
    const line = lines[index];
    const match = line.match(/(?:\[)?(\d{1,2}):(\d{2})(?:\])?/);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const time = minutes * 60 + seconds;
      return { time, label: `${minutes}:${String(seconds).padStart(2, '0')}` };
    }
    
    const validLines = lines.filter(l => l.trim().length > 0);
    const lineRank = validLines.indexOf(line);
    const count = validLines.length || 1;
    const fraction = count > 1 ? lineRank / (count - 1) : 0;
    const estimatedTime = fraction * totalDuration;
    
    const m = Math.floor(estimatedTime / 60);
    const s = Math.floor(estimatedTime % 60);
    const label = `${m}:${String(s).padStart(2, '0')}`;
    
    return { time: estimatedTime, label };
  };

  const getActiveLineIndex = (lines: string[], currentTime: number, totalDuration: number): number => {
    let closestIndex = -1;
    let minDiff = Infinity;
    
    lines.forEach((line, idx) => {
      if (!line.trim()) return;
      const info = getLineTimestamp(lines, idx, totalDuration);
      const diff = currentTime - info.time;
      if (diff >= 0 && diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });
    
    return closestIndex;
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioEl) {
      audioEl.playbackRate = speed;
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioEl) {
      audioEl.muted = nextMuted;
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioEl) {
      const newTime = Math.max(0, Math.min(audioEl.duration, audioEl.currentTime + seconds));
      audioEl.currentTime = newTime;
      setPlaybackProgress((newTime / audioEl.duration) * 100);
    }
  };

  const handleGenerateInsights = async (rec: Recording) => {
    if (!rec.transcription) return;
    setGeneratingInsightsId(rec.id);
    onUpdateRecording({ ...rec, isInsightsGenerating: true });
    try {
      const insights = await generateKeyInsights(rec.transcription, rec.note);
      onUpdateRecording({ 
        ...rec, 
        keyInsights: insights, 
        isInsightsGenerating: false 
      });
    } catch (error) {
      console.error(error);
      onUpdateRecording({ ...rec, isInsightsGenerating: false });
    } finally {
      setGeneratingInsightsId(null);
    }
  };

  const handleGenerateSmartSummary = async (rec: Recording) => {
    if (!rec.transcription) return;
    setGeneratingSummaryId(rec.id);
    onUpdateRecording({ ...rec, isSmartSummaryGenerating: true });
    try {
      const summary = await generateSmartSummary(rec.transcription);
      onUpdateRecording({ 
        ...rec, 
        smartSummary: summary, 
        isSmartSummaryGenerating: false 
      });
    } catch (error) {
      console.error(error);
      onUpdateRecording({ ...rec, isSmartSummaryGenerating: false });
    } finally {
      setGeneratingSummaryId(null);
    }
  };

  const handleToggleTrimmingPanel = (rec: Recording) => {
    if (trimmingId === rec.id) {
      setTrimmingId(null);
    } else {
      setTrimmingId(rec.id);
      setTrimStart(0);
      setTrimEnd(Math.floor(rec.duration));
    }
  };

  const executeTrim = async (rec: Recording, overwrite: boolean) => {
    if (trimStart >= trimEnd) {
      alert("Start time must be less than end time.");
      return;
    }
    setIsTrimming(true);
    try {
      const sourceBlob = await getAudioBlob(rec.blobId);
      if (!sourceBlob) {
        throw new Error("Could not load original audio blob.");
      }

      const arrayBuffer = await sourceBlob.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const sampleRate = decodedBuffer.sampleRate;
      const numChannels = decodedBuffer.numberOfChannels;
      const startSample = Math.floor(trimStart * sampleRate);
      const endSample = Math.floor(trimEnd * sampleRate);
      const outputLength = Math.max(1, endSample - startSample);

      const trimmedBuffer = audioCtx.createBuffer(numChannels, outputLength, sampleRate);
      for (let c = 0; c < numChannels; c++) {
        const srcData = decodedBuffer.getChannelData(c);
        const destData = trimmedBuffer.getChannelData(c);
        for (let j = 0; j < outputLength; j++) {
          destData[j] = srcData[startSample + j];
        }
      }

      const WAV_BLOB = audioBufferToWav(trimmedBuffer);
      const newDuration = parseFloat((outputLength / sampleRate).toFixed(2));

      if (overwrite) {
        await saveAudioBlob(rec.blobId, WAV_BLOB);
        
        const adjustedBookmarks = (rec.bookmarks || [])
          .filter(b => b.time >= trimStart && b.time <= trimEnd)
          .map(b => ({
            ...b,
            time: parseFloat((b.time - trimStart).toFixed(2))
          }));

        onUpdateRecording({
          ...rec,
          duration: newDuration,
          bookmarks: adjustedBookmarks
        });

        if (playingId === rec.id) {
          if (audioEl) audioEl.pause();
          setPlayingId(null);
          setAudioEl(null);
        }
        
        alert("Original recording successfully trimmed and updated.");
      }
      setTrimmingId(null);
    } catch (err: any) {
      console.error(err);
      alert("Error trimming audio clip: " + err.message);
    } finally {
      setIsTrimming(false);
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;

    if (folders.some(f => f.name.toLowerCase() === name.toLowerCase())) {
      alert("A folder named '" + name + "' already exists.");
      return;
    }

    const newFolder: FolderType = {
      id: 'folder_' + Math.random().toString(36).substring(2, 11),
      name,
      color: newFolderColor,
      createdAt: new Date().toISOString()
    };

    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleAssignFolder = (recordingId: string, folderId: string | undefined) => {
    const rec = recordings.find(r => r.id === recordingId);
    if (rec) {
      onUpdateRecording({
        ...rec,
        folderId: folderId || undefined
      });
    }
  };

  const handleDeleteFolder = (folderId: string) => {
    if (['internal', 'client', 'board'].includes(folderId)) {
      alert("Default system folders cannot be deleted.");
      return;
    }
    
    // Clear associations
    recordings.forEach(rec => {
      if (rec.folderId === folderId) {
        onUpdateRecording({ ...rec, folderId: undefined });
      }
    });

    setFolders(prev => prev.filter(f => f.id !== folderId));
    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
    }
  };

  useEffect(() => {
    let interval: number;
    if (audioEl && playingId) {
      interval = window.setInterval(() => {
        setPlaybackProgress((audioEl.currentTime / audioEl.duration) * 100);
      }, 200);
    }
    return () => clearInterval(interval);
  }, [audioEl, playingId, audioUpdated]);

  const handlePlay = async (recording: Recording) => {
    if (playingId === recording.id && audioEl) {
      if (audioEl.paused) {
        audioEl.play();
      } else {
        audioEl.pause();
        setPlayingId(null);
      }
      return;
    }
    if (audioEl) audioEl.pause();
    try {
      const blob = await getAudioBlob(recording.blobId);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setPlayingId(null);
        setPlaybackProgress(0);
      };
      audio.playbackRate = playbackSpeed;
      audio.muted = isMuted;
      audio.play();
      setAudioEl(audio);
      setPlayingId(recording.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (playingId === id && audioEl) {
      const seekTime = (parseFloat(e.target.value) / 100) * audioEl.duration;
      audioEl.currentTime = seekTime;
      setPlaybackProgress(parseFloat(e.target.value));
      setActiveBookmarkTimes(prev => ({ ...prev, [id]: parseFloat(seekTime.toFixed(2)) }));
    }
  };

  const handleDirectSeek = async (percent: number, recording: Recording) => {
    const targetTime = (percent / 100) * recording.duration;
    setActiveBookmarkTimes(prev => ({ ...prev, [recording.id]: parseFloat(targetTime.toFixed(2)) }));

    if (playingId !== recording.id) {
      if (audioEl) audioEl.pause();
      try {
        const blob = await getAudioBlob(recording.blobId);
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => {
          setPlayingId(null);
          setPlaybackProgress(0);
        };
        audio.playbackRate = playbackSpeed;
        audio.muted = isMuted;
        
        audio.addEventListener('loadedmetadata', () => {
          const seekTime = (percent / 100) * audio.duration;
          audio.currentTime = seekTime;
          setPlaybackProgress(percent);
        });
        
        audio.play();
        setAudioEl(audio);
        setPlayingId(recording.id);
        
        const instantSeekTime = (percent / 100) * recording.duration;
        audio.currentTime = instantSeekTime;
        setPlaybackProgress(percent);
      } catch (e) {
        console.error(e);
      }
    } else if (audioEl) {
      const seekTime = (percent / 100) * audioEl.duration;
      audioEl.currentTime = seekTime;
      setPlaybackProgress(percent);
    }
  };

  const handleJumpToTime = async (recording: Recording, timeInSeconds: number) => {
    if (playingId === recording.id && audioEl) {
      audioEl.currentTime = timeInSeconds;
      setPlaybackProgress((timeInSeconds / audioEl.duration) * 100);
      if (audioEl.paused) {
        audioEl.play();
      }
    } else {
      if (audioEl) audioEl.pause();
      try {
        const blob = await getAudioBlob(recording.blobId);
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => {
          setPlayingId(null);
          setPlaybackProgress(0);
        };
        audio.playbackRate = playbackSpeed;
        audio.muted = isMuted;
        
        audio.addEventListener('loadedmetadata', () => {
          audio.currentTime = timeInSeconds;
          setPlaybackProgress((timeInSeconds / audio.duration) * 100);
        });
        
        audio.play();
        setAudioEl(audio);
        setPlayingId(recording.id);
        
        audio.currentTime = timeInSeconds;
        setPlaybackProgress((timeInSeconds / recording.duration) * 100);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDownload = async (recording: Recording) => {
    try {
      const blob = await getAudioBlob(recording.blobId);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(recording.title || 'recording').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  const handleCopyTranscript = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
  };

  const handleSaveEdit = (recording: Recording) => {
    if (editTitle.trim() && editTitle !== recording.title) {
      onUpdateRecording({ ...recording, title: editTitle.trim() });
    }
    setEditingId(null);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const filteredRecordings = recordings.filter(rec => {
      if (selectedFolderId !== null) {
        if (selectedFolderId === 'uncategorized') {
          if (rec.folderId) return false;
        } else {
          if (rec.folderId !== selectedFolderId) return false;
        }
      }
      
      const q = searchQuery.toLowerCase();
      return rec.title.toLowerCase().includes(q) || 
             (rec.note && rec.note.toLowerCase().includes(q)) || 
             (rec.transcription && rec.transcription.toLowerCase().includes(q));
  });

  const sortedAndFilteredRecordings = [...filteredRecordings].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
    } else if (sortBy === 'oldest') {
      return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
    } else if (sortBy === 'longest') {
      return b.duration - a.duration;
    }
    return 0;
  });

  const toggleSelectRecording = (id: string) => {
    setSelectedRecIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedRecIds(new Set(sortedAndFilteredRecordings.map(r => r.id)));
    } else {
      setSelectedRecIds(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (selectedRecIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete these ${selectedRecIds.size} recordings?`)) {
      return;
    }

    const ids = Array.from(selectedRecIds);
    if (onDeleteMultipleRecordings) {
      onDeleteMultipleRecordings(ids);
    } else {
      ids.forEach(id => {
        const rec = recordings.find(r => r.id === id);
        if (rec && onDeleteRecording) {
          onDeleteRecording(rec.id, rec.blobId);
        }
      });
    }

    setSelectedRecIds(new Set());
  };

  const handleBulkMoveToFolder = (folderId: string | undefined) => {
    if (selectedRecIds.size === 0) return;

    const updatedList = recordings
      .filter(rec => selectedRecIds.has(rec.id))
      .map(rec => ({
        ...rec,
        folderId: folderId || undefined
      }));

    if (onUpdateMultipleRecordings) {
      onUpdateMultipleRecordings(updatedList);
    } else {
      updatedList.forEach(rec => {
        onUpdateRecording(rec);
      });
    }

    setSelectedRecIds(new Set());
  };

  const handleBulkShare = () => {
    if (selectedRecIds.size === 0) return;
    const selectedRecs = recordings.filter(r => selectedRecIds.has(r.id));
    
    // Minimal recording representation
    const minimalRecordings = selectedRecs.map(r => ({
      title: r.title,
      note: r.note,
      timestamp: r.timestamp,
      duration: r.duration,
      transcription: r.transcription,
      smartSummary: r.smartSummary,
      keyInsights: r.keyInsights,
      keywords: r.keywords
    }));
    
    try {
      const json = JSON.stringify(minimalRecordings);
      const b64 = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      }));
      const shareUrl = `${window.location.origin}${window.location.pathname}?shared=${b64}`;
      setBulkShareUrl(shareUrl);
      setIsCopied(false);
    } catch (e) {
      console.error("Failed to generate bulk share URL", e);
      alert("Failed to generate shareable link due to size limits. Try selecting fewer recordings.");
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ["Title", "Duration (sec)", "Duration (formatted)", "Date", "Folder"].join(","),
      ...sortedAndFilteredRecordings.map(rec => {
        const folderName = folders.find(f => f.id === rec.folderId)?.name || 'Uncategorized';
        const formattedDate = rec.timestamp ? new Date(rec.timestamp).toLocaleString() : '';
        const titleCleaned = `"${(rec.title || '').replace(/"/g, '""')}"`;
        const durationFmt = formatTime(rec.duration);
        return [titleCleaned, rec.duration, durationFmt, formattedDate, `"${folderName.replace(/"/g, '""')}"`].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `meeting_recordings_report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const noRecordingsAtAll = recordings.length === 0;

  return (
    <div className="space-y-5">
      {bulkShareUrl && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setBulkShareUrl(null);
                setIsCopied(false);
              }}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="p-3 bg-emerald-500/10 text-emerald-550 dark:text-emerald-400 rounded-2xl">
                <Share2 className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Bulk Shareable Link Generated!</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Your selected {selectedRecIds.size} recordings received a unified, read-only dashboard link.
                </p>
              </div>
            </div>

            <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850/60 mb-5">
              Anyone with this link can view titles, dates, diarized transcripts, and AI-generated smart summaries/insights without needing local account access.
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Unified Portfolio URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={bulkShareUrl}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[10.5px] font-mono text-slate-600 dark:text-slate-450 focus:outline-none select-all"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(bulkShareUrl);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 3000);
                  }}
                  className={`px-4 bg-fs-primary text-white text-[10.5px] font-black rounded-xl hover:scale-[1.01] active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isCopied ? 'bg-emerald-600 hover:bg-emerald-650' : ''
                  }`}
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setBulkShareUrl(null);
                  setIsCopied(false);
                }}
                className="px-5 py-2 hover:bg-slate-100 dark:hover:bg-slate-805 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Categories Filter Panel */}
      <div className="bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h3 className="text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
              Meeting Archives By Folder ({folders.length})
            </h3>
          </div>
          
          <button
            onClick={() => setIsCreatingFolder(!isCreatingFolder)}
            className="text-[10px] bg-fs-primary text-white font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 hover:scale-[1.01] transition-transform active:scale-95 cursor-pointer"
          >
            <FolderPlus className="w-3 h-3" />
            Create Folder
          </button>
        </div>

        {/* Inline Folder Creation Form */}
        {isCreatingFolder && (
          <form onSubmit={handleCreateFolder} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5 rounded-xl space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Folder Name</label>
              <input
                type="text"
                placeholder="e.g. Investor Pitch, Operations, Design"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                maxLength={25}
                required
                className="block w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-fs-primary text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Accent Color</label>
              <div className="flex gap-2.5 items-center">
                {Object.keys(folderColorMap).map((col) => {
                  const details = folderColorMap[col];
                  const isSelected = newFolderColor === col;
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewFolderColor(col)}
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${details.dotClass} ${isSelected ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-950 scale-110' : 'hover:scale-105'}`}
                      title={col}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreatingFolder(false)}
                className="px-2.5 py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 text-[10px] font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-fs-primary text-white font-bold rounded-lg text-[10px] inline-flex items-center gap-1 cursor-pointer hover:bg-fs-primary/95"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {/* Categories/Folders Pill Row */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setSelectedFolderId(null)}
            className={`px-3 py-1.5 rounded-xl text-[10px] border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedFolderId === null
                ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 font-medium dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            <span>📁 All Clips</span>
            <span className={`px-1.5 py-0.2 ml-0.5 rounded-full text-[9px] ${selectedFolderId === null ? 'bg-white/20 text-white dark:bg-slate-900/10 dark:text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              {recordings.length}
            </span>
          </button>

          {folders.map((f) => {
            const style = folderColorMap[f.color || 'indigo'] || folderColorMap.indigo;
            const count = recordings.filter(r => r.folderId === f.id).length;
            const isSelected = selectedFolderId === f.id;
            const isSystemFolder = ['internal', 'client', 'board'].includes(f.id);

            return (
              <span key={f.id} className="inline-flex items-center">
                <button
                  onClick={() => setSelectedFolderId(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? style.bgActive
                      : `bg-white dark:bg-slate-900 dark:border-slate-800 hover:scale-[1.01] ${style.bgClass}`
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dotClass}`} />
                  <span>{f.name}</span>
                  <span className={`px-1.5 py-0.2 ml-0.5 rounded-full text-[9px] ${isSelected ? 'bg-black/10 dark:bg-white/10' : 'bg-black/5 dark:bg-white/5'}`}>
                    {count}
                  </span>
                </button>

                {!isSystemFolder && (
                  <button
                    onClick={() => handleDeleteFolder(f.id)}
                    className="ml-1 p-1 hover:text-red-500 text-slate-300 dark:text-slate-600 transition-colors cursor-pointer"
                    title={`Delete Folder "${f.name}"`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            );
          })}

          <button
            onClick={() => setSelectedFolderId('uncategorized')}
            className={`px-3 py-1.5 rounded-xl text-[10px] border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedFolderId === 'uncategorized'
                ? 'bg-slate-600 text-white border-slate-600 dark:bg-slate-450 dark:border-slate-450 dark:text-slate-950 font-extrabold shadow-sm'
                : 'bg-white border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Uncategorized</span>
            <span className={`px-1.5 py-0.2 ml-0.5 rounded-full text-[9px] ${selectedFolderId === 'uncategorized' ? 'bg-black/10 dark:bg-white/10' : 'bg-black/5 dark:bg-white/5'}`}>
              {recordings.filter(r => !r.folderId).length}
            </span>
          </button>
        </div>
      </div>

      {noRecordingsAtAll ? (
        <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-5 h-5 text-slate-300" />
          </div>
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Archive is empty</h3>
          <p className="text-[10px] text-slate-500 mt-1 mb-6">Your recordings will appear here. Build folders to stay organized!</p>
          <HurdleGame />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 max-w-2xl mx-auto">
            <div className="relative w-full max-w-md flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input 
                  type="text"
                  placeholder="Search by title, notes, or transcript content..."
                  className="block w-full pl-10 pr-10 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-fs-primary/20 focus:border-fs-primary text-xs transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-3xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')} 
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsDeepSearchOpen(true)}
                className="px-3 md:px-3.5 h-[34px] bg-fs-primary/10 hover:bg-fs-primary/20 text-fs-primary hover:text-fs-primary/95 font-extrabold text-[10px] rounded-xl flex items-center gap-1 transition-all shadow-3xs shrink-0 cursor-pointer"
                title="Global transcript deep index explorer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Deep Search
              </button>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800/80 p-0.5 px-2 rounded-xl h-9">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-[11px] font-extrabold py-0.5 px-1 border-0 bg-transparent text-slate-700 dark:text-slate-350 focus:outline-none cursor-pointer"
                >
                  <option value="newest" className="bg-white dark:bg-slate-950 font-semibold text-slate-800 dark:text-slate-200">Date (Newest)</option>
                  <option value="oldest" className="bg-white dark:bg-slate-950 font-semibold text-slate-800 dark:text-slate-200">Date (Oldest)</option>
                  <option value="longest" className="bg-white dark:bg-slate-950 font-semibold text-slate-800 dark:text-slate-200">Duration (Longest)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 h-9 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100/65 dark:border-emerald-900/30 font-extrabold text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs shrink-0 select-none animate-in fade-in duration-200"
                title="Export filtered recordings to a CSV report"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>
          
          {searchQuery && (
            <div className="max-w-2xl mx-auto -mt-2 text-right">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                Found {filteredRecordings.length} {filteredRecordings.length === 1 ? 'recording' : 'recordings'} matching "{searchQuery}"
              </span>
            </div>
          )}

          {/* Master / Bulk Select & Action Bar */}
          {selectedRecIds.size > 0 && (
            <div className="max-w-2xl mx-auto bg-emerald-50/70 dark:bg-emerald-950/15 border border-emerald-100/60 dark:border-emerald-900/30 rounded-2xl p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox"
                  checked={selectedRecIds.size === sortedAndFilteredRecordings.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-900 cursor-pointer"
                  id="bulk-select-all"
                />
                <label htmlFor="bulk-select-all" className="text-xs font-black text-emerald-800 dark:text-emerald-400 select-none cursor-pointer">
                  {selectedRecIds.size} of {sortedAndFilteredRecordings.length} selected
                </label>
                <button 
                  onClick={() => setSelectedRecIds(new Set())}
                  className="text-[11px] font-extrabold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 underline uppercase select-none cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>

              <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                {/* Move to Folder */}
                <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-1.5 px-2.5 rounded-xl shadow-3xs">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Move selected to:</span>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') return;
                      handleBulkMoveToFolder(val === 'uncategorized' ? undefined : val);
                      e.target.value = ''; // Reset select
                    }}
                    className="text-[11px] font-extrabold border-0 bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>Choose Folder...</option>
                    <option value="uncategorized">📁 Uncategorized</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>📁 {f.name}</option>
                    ))}
                  </select>
                </div>

                {/* Bulk Share Button */}
                <button
                  type="button"
                  onClick={handleBulkShare}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-650 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/45 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 font-extrabold text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs shrink-0 select-none font-sans"
                  title="Bulk share selected recordings via unified link"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share Selected
                </button>

                {/* Bulk Delete Button */}
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-650 dark:bg-red-950/25 dark:hover:bg-red-950/45 dark:text-red-400 border border-red-100 dark:border-red-900/40 font-extrabold text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs shrink-0 select-none font-sans"
                  title="Bulk delete selected meeting files"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Selected
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {filteredRecordings.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800/80">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white">No matches found</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 mb-4 leading-normal">
                  No archives matched "{searchQuery}" under the current folder filter.
                </p>
                <button 
                  onClick={() => { setSearchQuery(''); setSelectedFolderId(null); }}
                  className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  Reset Filtering / Clear
                </button>
              </div>
            ) : (
              sortedAndFilteredRecordings.map((rec) => {
            const isExpanded = expandedIds.has(rec.id);
            const isPlaying = playingId === rec.id;

            return (
            <div key={rec.id} className={`bg-white dark:bg-slate-900 border ${selectedRecIds.has(rec.id) ? 'border-emerald-300 dark:border-emerald-900 shadow-3xs bg-emerald-50/5 dark:bg-emerald-950/5' : 'border-slate-100 dark:border-slate-800'} rounded-lg overflow-hidden transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/30`}>
                <div className="p-2 md:p-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center flex-shrink-0">
                          <input 
                            type="checkbox"
                            checked={selectedRecIds.has(rec.id)}
                            onChange={() => toggleSelectRecording(rec.id)}
                            className="w-4 h-4 rounded border-slate-200 dark:border-slate-800 text-fs-primary focus:ring-fs-primary/30 bg-white dark:bg-slate-900 cursor-pointer"
                          />
                        </div>

                        <button 
                            onClick={() => handlePlay(rec)} 
                            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${isPlaying ? 'bg-fs-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-fs-primary'}`}
                        >
                            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
                        </button>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                {editingId === rec.id ? (
                                    <input 
                                        type="text" 
                                        value={editTitle} 
                                        onChange={(e) => setEditTitle(e.target.value)} 
                                        className="text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-fs-primary text-slate-900 dark:text-white w-full max-w-[180px]"
                                        onBlur={() => handleSaveEdit(rec)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(rec)}
                                        autoFocus 
                                    />
                                ) : (
                                    <h3 
                                        className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate cursor-pointer hover:text-fs-primary transition-colors"
                                        onClick={() => {
                                            setEditingId(rec.id);
                                            setEditTitle(rec.title);
                                        }}
                                    >
                                        {highlightText(rec.title, searchQuery)}
                                    </h3>
                                )}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                                        {new Date(rec.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {formatTime(rec.duration)}
                                    </span>
                                    
                                    <select
                                        value={rec.folderId || ""}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => handleAssignFolder(rec.id, e.target.value || undefined)}
                                        className={`text-[8.5px] font-extrabold py-0.5 px-2 rounded-lg border bg-transparent cursor-pointer transition-colors max-w-[110px] truncate focus:outline-none focus:ring-1 focus:ring-fs-primary/30 ${
                                            rec.folderId 
                                                ? getFolderSelectStyle(rec.folderId, folders)
                                                : 'text-slate-400 border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        <option value="" className="text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950 font-bold">Uncategorized</option>
                                        {folders.map(f => (
                                            <option key={f.id} value={f.id} className="text-slate-750 dark:text-slate-300 bg-white dark:bg-slate-950 font-bold">
                                                📁 {f.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                             {((rec.tags && rec.tags.length > 0) || (rec.keywords && rec.keywords.length > 0)) && (
                                 <div className="flex flex-wrap gap-1 mt-1.5 animate-in fade-in duration-300">
                                     {rec.tags && rec.tags.map((tg) => {
                                         const tagObj = AVAILABLE_TAGS.find(o => o.name === tg) || { color: 'bg-slate-100 text-slate-600 border-slate-200' };
                                         return (
                                             <span 
                                                 key={tg} 
                                                 className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md border flex items-center gap-1.5 relative select-none ${tagObj.color}`}
                                             >
                                                 <span className={`w-1 h-1 rounded-full ${
                                                     tg === 'Important' ? 'bg-red-500' :
                                                     tg === 'Follow-up' ? 'bg-amber-500' :
                                                     tg === 'Budget' ? 'bg-blue-500' :
                                                     tg === 'Action Item' ? 'bg-purple-500' :
                                                     'bg-emerald-500'
                                                 }`} />
                                                 {tg}
                                             </span>
                                         );
                                     })}
                                    {rec.keywords.map((kw, idx) => (
                                        <span 
                                            key={idx} 
                                            className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-755 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-400 dark:hover:text-slate-300 transition-colors border border-slate-200/40 dark:border-slate-750/70 flex items-center gap-1"
                                        >
                                            <Tag className="w-2 h-2 text-slate-400 dark:text-slate-500" />
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-0.5 relative">
                             <button onClick={() => onShare(rec)} disabled={rec.status === 'shared'} className={`p-1.5 rounded transition-colors ${rec.status === 'shared' ? 'text-emerald-500' : 'text-slate-300 hover:text-fs-primary'}`} title="Share to Cloud">
                                <Share2 className="w-3.5 h-3.5" />
                             </button>
                             <button onClick={() => toggleExpand(rec.id)} className={`p-1.5 rounded transition-all ${isExpanded ? 'text-fs-primary rotate-180' : 'text-slate-300 hover:text-slate-500'}`} title="Expand details">
                                <ChevronDown className="w-3.5 h-3.5" />
                             </button>
                             <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(activeMenuId === rec.id ? null : rec.id);
                                }} 
                                className={`p-1.5 rounded transition-colors ${activeMenuId === rec.id ? 'bg-slate-105 dark:bg-slate-800 text-fs-primary' : 'text-slate-300 hover:text-slate-500'}`}
                                title="Recording Options"
                             >
                                <MoreVertical className="w-3.5 h-3.5" />
                             </button>

                             {activeMenuId === rec.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
                                  <div className="absolute right-0 top-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 min-w-[175px] z-50 animate-in fade-in slide-in-from-top-1.5 duration-150">
                                    <div className="px-2 py-1 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                                      <p className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Recording Console</p>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(null);
                                        exportRecordingToPDF(rec);
                                      }}
                                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[10px] font-bold text-slate-705 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                                    >
                                      <FileDown className="w-3.5 h-3.5 text-emerald-500" />
                                      <span>Export as PDF Report</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(null);
                                        handleDownload(rec);
                                      }}
                                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[10px] font-bold text-slate-750 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                                    >
                                      <Download className="w-3.5 h-3.5 text-blue-500" />
                                      <span>Download Audio (WebM)</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(null);
                                        handleCopyTranscript(rec.transcription || '', rec.id);
                                      }}
                                      disabled={!rec.transcription}
                                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[10px] font-bold text-slate-750 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                                    >
                                      <Copy className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>Copy Transcript</span>
                                    </button>
                                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(null);
                                        onDeleteRecording?.(rec.id, rec.blobId);
                                      }}
                                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[10px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                      <span>Delete Recording</span>
                                    </button>
                                  </div>
                                </>
                             )}

                             <button onClick={() => onDeleteRecording?.(rec.id, rec.blobId)} className="p-1.5 text-slate-200 hover:text-red-400 rounded transition-colors" title="Delete Recording">
                                <Trash2 className="w-3.5 h-3.5" />
                             </button>
                        </div>
                    </div>

                    {isPlaying && !isExpanded && (
                        <div className="mt-2.5 ml-0 sm:ml-7 bg-slate-50/80 dark:bg-slate-850/65 border border-slate-150 dark:border-slate-800/80 rounded-xl p-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-3xs animate-in fade-in slide-in-from-top-1.5 duration-200">
                             {/* Mini Play/Pause Skip back/forward */}
                             <div className="flex items-center gap-2 shrink-0">
                                  <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handlePlay(rec); }}
                                      className="w-6 h-6 rounded-full bg-fs-primary hover:bg-emerald-600 text-white flex items-center justify-center transition-all shadow-3xs"
                                      title="Pause playback"
                                  >
                                      <Pause className="w-2.5 h-2.5 fill-current" />
                                  </button>
                                  <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleSkip(-10); }}
                                      className="p-1 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors"
                                      title="Rewind 10 seconds"
                                  >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleSkip(10); }}
                                      className="p-1 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors"
                                      title="Forward 10 seconds"
                                  >
                                      <RotateCw className="w-3.5 h-3.5" />
                                  </button>
                             </div>

                             {/* Mid slider with duration */}
                             <div className="flex-1 w-full flex items-center gap-2.5">
                                 <span className="text-[8px] font-mono font-black text-slate-500 w-7 text-right">
                                     {formatTime(audioEl?.currentTime || 0)}
                                 </span>
                                 <input 
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={playbackProgress}
                                    onChange={(e) => handleSeek(e, rec.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 h-1 bg-slate-250 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-fs-primary focus:outline-none"
                                />
                                <span className="text-[8px] font-mono font-black text-slate-400 w-7">
                                    {formatTime(rec.duration)}
                                </span>
                             </div>

                             {/* Volume & Speed cyclic */}
                             <div className="flex items-center gap-3 shrink-0">
                                 <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleToggleMute(); }}
                                    className="p-1 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors"
                                    title={isMuted ? "Unmute" : "Mute"}
                                 >
                                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                                 </button>
                                 <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const speeds = [1.0, 1.5, 2.0];
                                      const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
                                      handleSpeedChange(speeds[nextIdx]);
                                    }}
                                    className="px-1.5 py-0.5 text-[8px] font-black uppercase rounded bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 transition-colors border border-slate-300/10 cursor-pointer"
                                    title="Cycle playback speed"
                                 >
                                    {playbackSpeed === 1.0 ? "1x" : playbackSpeed === 2.0 ? "2x" : "1.5x"}
                                 </button>
                             </div>
                        </div>
                    )}

                    {isExpanded && (
                        <div className="mt-2 ml-10 pt-2 border-t border-slate-50 dark:border-slate-800/50 space-y-3 animate-in slide-in-from-top-1 duration-200">
                            {/* Color-Coded Tagging System */}
                            <div className="flex flex-wrap items-center gap-1.5 p-3 bg-slate-50/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 rounded-xl">
                              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2 flex items-center gap-1">
                                <Tag className="w-3 h-3 text-fs-primary" /> Categorization Labels:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {AVAILABLE_TAGS.map((tagObj) => {
                                  const isAttached = (rec.tags || []).includes(tagObj.name);
                                  return (
                                    <button
                                      key={tagObj.name}
                                      type="button"
                                      onClick={() => {
                                        const currentTags = rec.tags || [];
                                        let newTags: string[];
                                        if (isAttached) {
                                          newTags = currentTags.filter(t => t !== tagObj.name);
                                        } else {
                                          newTags = [...currentTags, tagObj.name];
                                        }
                                        onUpdateRecording({ ...rec, tags: newTags });
                                      }}
                                      className={`px-2.5 py-1 text-[9px] font-bold rounded-full border transition-all cursor-pointer flex items-center gap-1 select-none ${
                                        isAttached 
                                          ? `${tagObj.color} scale-[1.03] ring-1 ring-fs-primary/10 shadow-xs` 
                                          : 'bg-white dark:bg-slate-950 text-slate-400 border-slate-150 dark:border-slate-850 hover:text-slate-600 dark:hover:text-slate-300'
                                      }`}
                                      title={isAttached ? `Click to remove label "${tagObj.name}"` : `Click to attach label "${tagObj.name}"`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${
                                        tagObj.name === 'Important' ? 'bg-red-500' :
                                        tagObj.name === 'Follow-up' ? 'bg-amber-500' :
                                        tagObj.name === 'Budget' ? 'bg-blue-500' :
                                        tagObj.name === 'Action Item' ? 'bg-purple-500' :
                                        'bg-emerald-500'
                                      }`} />
                                      {tagObj.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            {/* Premium Interactive Audio Player Deck */}
                            <div className="bg-slate-50/55 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800/50 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                  Live Deck Player
                                </span>
                                <div className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                                  {isPlaying ? `${formatTime(audioEl?.currentTime || 0)} / ${formatTime(rec.duration)}` : `0:00 / ${formatTime(rec.duration)}`}
                                </div>
                              </div>
                              
                              {/* Custom Interactive Waveform Seekbar */}
                              <div className="relative h-10 w-full flex items-end justify-between gap-[2px] pt-1 px-1 cursor-pointer select-none group"
                                   onClick={(e) => {
                                     const rect = e.currentTarget.getBoundingClientRect();
                                     const clickX = e.clientX - rect.left;
                                     const pct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
                                     handleDirectSeek(pct, rec);
                                   }}
                              >
                                {rec.bookmarks && rec.bookmarks.map((b) => {
                                  const pct = (b.time / rec.duration) * 100;
                                  return (
                                    <div
                                      key={b.id}
                                      className="absolute top-0 bottom-0 w-[2px] bg-amber-500 z-10 hover:bg-amber-600 hover:scale-x-150 transition-all group/bookmark-pin"
                                      style={{ left: `${pct}%` }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleJumpToTime(rec, b.time);
                                      }}
                                    >
                                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-500 border border-white dark:border-slate-900 shadow-xs" />
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/bookmark-pin:block bg-slate-910 text-white dark:bg-white dark:text-slate-900 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-30">
                                        [{formatTime(b.time)}] {b.comment}
                                      </div>
                                    </div>
                                  );
                                })}

                                {getWaveformPeaks(rec.id).map((height, peakIdx) => {
                                  const peakPct = (peakIdx / 40) * 100;
                                  const isActivePeak = isPlaying && playbackProgress >= peakPct;
                                  
                                  return (
                                    <div 
                                      key={peakIdx}
                                      className={`flex-1 rounded-t transition-all duration-150 ${
                                        isActivePeak 
                                          ? 'bg-fs-primary self-end group-hover:opacity-90' 
                                          : 'bg-slate-200 dark:bg-slate-800/80 self-end group-hover:bg-slate-300 dark:group-hover:bg-slate-755'
                                      }`}
                                      style={{ height: `${height}%` }}
                                    />
                                  );
                                })}
                                
                                <div className="absolute top-0 bottom-0 w-[1px] bg-fs-primary opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none" 
                                     style={{ left: `${playbackProgress}%` }}
                                />
                              </div>
                              
                              {/* Audio Deck Controls Row */}
                              <div className="flex items-center justify-between pt-1 border-t border-slate-100/50 dark:border-slate-800/40">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handlePlay(rec)}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                      isPlaying 
                                        ? 'bg-fs-primary text-white shadow-sm' 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-fs-primary'
                                    }`}
                                  >
                                    {isPlaying ? <Pause className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current ml-0.5" />}
                                  </button>
                                  
                                  <button
                                    onClick={() => isPlaying && handleSkip(-10)}
                                    disabled={!isPlaying}
                                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 dark:hover:text-slate-200 transition-colors"
                                    title="Rewind 10 seconds"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                  
                                  <button
                                    onClick={() => isPlaying && handleSkip(10)}
                                    disabled={!isPlaying}
                                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 dark:hover:text-slate-200 transition-colors"
                                    title="Forward 10 seconds"
                                  >
                                    <RotateCw className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/20">
                                    {[0.5, 1.0, 1.5, 2.0].map((speedValue) => (
                                      <button
                                        key={speedValue}
                                        type="button"
                                        onClick={() => handleSpeedChange(speedValue)}
                                        className={`px-1.5 py-0.5 text-[8px] font-black rounded transition-all cursor-pointer ${
                                          playbackSpeed === speedValue
                                            ? 'bg-fs-primary text-white shadow-3xs'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                        }`}
                                      >
                                        {speedValue === 1.0 ? "1x" : speedValue === 2.0 ? "2x" : `${speedValue}x`}
                                      </button>
                                    ))}
                                  </div>
                                  
                                  <button
                                    onClick={handleToggleMute}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                    title={isMuted ? "Unmute" : "Mute"}
                                  >
                                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleTrimmingPanel(rec)}
                                    className={`p-1 flex items-center justify-center transition-all rounded cursor-pointer ${
                                      trimmingId === rec.id 
                                        ? 'text-rose-500 bg-rose-100/50 dark:bg-rose-950/20' 
                                        : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                    title="Trim Audio Clip"
                                  >
                                    <Scissors className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Audio Trimmer Subpanel */}
                            {trimmingId === rec.id && (
                              <div className="bg-slate-50/55 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-100 dark:border-slate-850 space-y-3 animate-in slide-in-from-top-1 duration-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-[8.5px] font-black text-rose-550 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Scissors className="w-3.5 h-3.5" /> Quick Clip Trimming Engine
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-bold">
                                    Duration: {formatTime(rec.duration)}
                                  </span>
                                </div>

                                <p className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-normal">
                                  Drag or input times to select start and end points for removal. Your trimmed audio will update IndexedDB securely.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {/* Start Trim Bracket */}
                                  <div className="space-y-1.5 bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[8.5px] font-black text-slate-400 uppercase">Trim Start</span>
                                      <span className="text-[9.5px] font-mono font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-850">
                                        {formatTime(trimStart)}
                                      </span>
                                    </div>
                                    <input 
                                      type="range"
                                      min="0"
                                      max={rec.duration}
                                      step="1"
                                      value={trimStart}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setTrimStart(Math.min(val, trimEnd - 1));
                                      }}
                                      className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-rose-500 focus:outline-none"
                                    />
                                    <div className="flex items-center gap-1 justify-end">
                                      <button 
                                        type="button" 
                                        onClick={() => setTrimStart(prev => Math.max(0, prev - 1))}
                                        className="px-1 py-0.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-805 rounded text-[9px] font-bold border border-slate-150 text-slate-500 cursor-pointer"
                                      >
                                        -1s
                                      </button>
                                      <button 
                                        type="button" 
                                        onClick={() => setTrimStart(prev => Math.min(trimEnd - 1, prev + 1))}
                                        className="px-1 py-0.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-805 rounded text-[9px] font-bold border border-slate-150 text-slate-500 cursor-pointer"
                                      >
                                        +1s
                                      </button>
                                    </div>
                                  </div>

                                  {/* End Trim Bracket */}
                                  <div className="space-y-1.5 bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[8.5px] font-black text-slate-400 uppercase">Trim End</span>
                                      <span className="text-[9.5px] font-mono font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-850">
                                        {formatTime(trimEnd)}
                                      </span>
                                    </div>
                                    <input 
                                      type="range"
                                      min="0"
                                      max={rec.duration}
                                      step="1"
                                      value={trimEnd}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setTrimEnd(Math.max(val, trimStart + 1));
                                      }}
                                      className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-rose-500 focus:outline-none"
                                    />
                                    <div className="flex items-center gap-1 justify-end">
                                      <button 
                                        type="button" 
                                        onClick={() => setTrimEnd(prev => Math.max(trimStart + 1, prev - 1))}
                                        className="px-1 py-0.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-805 rounded text-[9px] font-bold border border-slate-150 text-slate-500 cursor-pointer"
                                      >
                                        -1s
                                      </button>
                                      <button 
                                        type="button" 
                                        onClick={() => setTrimEnd(prev => Math.min(rec.duration, prev + 1))}
                                        className="px-1 py-0.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-805 rounded text-[9px] font-bold border border-slate-150 text-slate-500 cursor-pointer"
                                      >
                                        +1s
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Preview trimmed result information */}
                                <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/30 dark:border-rose-900/30 p-2 rounded-lg flex items-center justify-between">
                                  <span className="text-[9px] font-bold text-rose-700 dark:text-rose-450 uppercase">
                                    Resulting Sliced Clip:
                                  </span>
                                  <span className="text-[10px] font-mono font-black text-rose-750 dark:text-rose-400">
                                    {formatTime(trimEnd - trimStart)} (Removes {formatTime(rec.duration - (trimEnd - trimStart))} of silence/noise)
                                  </span>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                                  <button
                                    type="button"
                                    onClick={() => setTrimmingId(null)}
                                    className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-[9px] font-bold text-slate-500 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => executeTrim(rec, true)}
                                    disabled={isTrimming}
                                    className="px-4 py-1.5 bg-rose-650 hover:bg-rose-700 text-white rounded-lg text-[9px] font-black inline-flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                                  >
                                    {isTrimming ? (
                                      <>
                                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                        Processing Trim...
                                      </>
                                    ) : (
                                      <>
                                        <Scissors className="w-2.5 h-2.5" />
                                        Trim & Update Clip
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Bookmark & Timestamped Marker Entry Form */}
                            <form 
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleAddBookmark(rec);
                              }}
                              className="bg-slate-50/55 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/50 flex items-center justify-between gap-3 shadow-3xs"
                            >
                              <div className="flex items-center gap-2 flex-grow min-w-0">
                                <span className="flex items-center gap-1 shrink-0 bg-amber-500/10 text-amber-650 dark:text-amber-400 px-2 py-1 rounded-lg text-[9px] font-mono font-bold">
                                  <BookmarkIcon className="w-3 h-3 fill-current" />
                                  {formatTime(activeBookmarkTimes[rec.id] ?? (isPlaying ? (audioEl?.currentTime || 0) : 0))}
                                </span>
                                
                                <input 
                                  type="text"
                                  placeholder="Type a comment or note to place at this timestamp..."
                                  className="w-full bg-transparent border-none text-[10px] text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-0 p-0"
                                  value={bookmarkComments[rec.id] ?? ''}
                                  onChange={(e) => {
                                    setBookmarkComments(prev => ({ ...prev, [rec.id]: e.target.value }));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddBookmark(rec);
                                    }
                                  }}
                                />
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentT = isPlaying ? (audioEl?.currentTime || 0) : 0;
                                    setActiveBookmarkTimes(prev => ({ ...prev, [rec.id]: parseFloat(currentT.toFixed(2)) }));
                                  }}
                                  className="px-2 py-1 text-[8px] font-bold text-slate-400 dark:text-slate-400 hover:text-fs-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all uppercase"
                                  title="Sync with current live playhead time"
                                >
                                  Current Time
                                </button>
                                
                                <button
                                  type="submit"
                                  disabled={!(bookmarkComments[rec.id]?.trim())}
                                  className="px-3 py-1 bg-amber-500 hover:bg-amber-650 disabled:opacity-40 disabled:hover:bg-amber-500 text-white font-black rounded-lg text-[9px] hover:scale-[1.01] active:scale-95 transition-all uppercase"
                                >
                                  Add Marker
                                </button>
                              </div>
                            </form>

                             {/* AI Insights & Executive Summary Panel */}
                             {rec.transcription ? (
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                 {/* Key Insights Summary Card */}
                                 <div className="bg-gradient-to-tr from-amber-500/[0.04] to-amber-500/[0.01] dark:from-amber-400/[0.04] dark:to-slate-900/40 border border-amber-500/10 dark:border-amber-400/10 rounded-xl p-3 shadow-2xs flex flex-col justify-between">
                                   <div>
                                     <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-amber-500/[0.08] dark:border-amber-400/[0.08]">
                                       <div className="flex items-center gap-1.5">
                                         <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                         <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-tight">Key Insights & Outcomes</span>
                                       </div>
                                       
                                       {rec.keyInsights && (
                                         <button 
                                           onClick={() => handleGenerateInsights(rec)}
                                           disabled={generatingInsightsId === rec.id || rec.isInsightsGenerating}
                                           className="text-[8px] font-bold text-amber-600 dark:text-amber-450 hover:text-fs-primary uppercase flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                           title="Regenerate Insights"
                                         >
                                           {generatingInsightsId === rec.id || rec.isInsightsGenerating ? (
                                             <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-500" />
                                           ) : (
                                             "Regenerate"
                                           )}
                                         </button>
                                       )}
                                     </div>

                                     {rec.keyInsights ? (
                                       <div className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-400 space-y-1.5">
                                         {rec.keyInsights.split('\n').map((line, idx) => {
                                           const trimmed = line.trim();
                                           if (!trimmed) return null;
                                           
                                           // Render bold headers cleanly
                                           const cleaned = trimmed.replace(/\*\*/g, '');
                                           if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
                                             const cleanLine = cleaned.replace(/^[\*\-\s]+/, '');
                                             return (
                                               <div key={idx} className="flex gap-1.5 pl-1">
                                                 <span className="text-amber-500 font-black flex-shrink-0">•</span>
                                                 <span>{cleanLine}</span>
                                               </div>
                                             );
                                           }
                                           
                                           const isHeader = cleaned.endsWith(':') || cleaned.toLowerCase().includes('decision') || cleaned.toLowerCase().includes('action items') || cleaned.toLowerCase().includes('takeaways');
                                           return (
                                             <p key={idx} className={isHeader ? "font-bold text-slate-800 dark:text-slate-200 mt-2 text-[10px] uppercase tracking-wider" : "pl-1.5"}>
                                               {cleaned}
                                             </p>
                                           );
                                         })}
                                       </div>
                                     ) : (
                                       <div className="flex flex-col items-center justify-center py-6 text-center h-full min-h-[100px]">
                                         <p className="text-[9px] text-slate-500 dark:text-slate-400 mb-3 max-w-[240px]">
                                           Extract strategic deliverables, meeting outcomes, and actions automatically with Gemini AI.
                                         </p>
                                         <button
                                           onClick={() => handleGenerateInsights(rec)}
                                           disabled={generatingInsightsId === rec.id || rec.isInsightsGenerating}
                                           className="px-3 py-1.5 bg-amber-500 hover:bg-amber-655 text-white rounded-lg text-[9px] font-bold inline-flex items-center gap-1 shadow-xs hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                                         >
                                           {generatingInsightsId === rec.id || rec.isInsightsGenerating ? (
                                             <>
                                               <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                               Analysing Meeting...
                                             </>
                                           ) : (
                                             <>
                                               <Sparkles className="w-2.5 h-2.5" />
                                               Generate Key Insights
                                             </>
                                           )}
                                         </button>
                                       </div>
                                     )}
                                   </div>
                                 </div>

                                 {/* Smart Summary 3-Bullet Point Card */}
                                 <div className="bg-gradient-to-tr from-indigo-500/[0.04] to-indigo-500/[0.01] dark:from-indigo-400/[0.04] dark:to-slate-900/40 border border-indigo-500/10 dark:border-indigo-400/10 rounded-xl p-3 shadow-2xs flex flex-col justify-between">
                                   <div>
                                     <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-indigo-500/[0.08] dark:border-indigo-400/[0.08]">
                                       <div className="flex items-center gap-1.5">
                                         <FileText className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                                         <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-tight">Smart Summary (3-Bullet Executive)</span>
                                       </div>
                                       
                                       {rec.smartSummary && (
                                         <button 
                                           onClick={() => handleGenerateSmartSummary(rec)}
                                           disabled={generatingSummaryId === rec.id || rec.isSmartSummaryGenerating}
                                           className="text-[8px] font-bold text-indigo-600 dark:text-indigo-450 hover:text-indigo-500 uppercase flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                           title="Regenerate Smart Summary"
                                         >
                                           {generatingSummaryId === rec.id || rec.isSmartSummaryGenerating ? (
                                             <Loader2 className="w-2.5 h-2.5 animate-spin text-indigo-500" />
                                           ) : (
                                             "Regenerate"
                                           )}
                                         </button>
                                       )}
                                     </div>

                                     {rec.smartSummary ? (
                                       <div className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-400 space-y-2">
                                         {rec.smartSummary.split('\n').map((line, idx) => {
                                           const trimmed = line.trim();
                                           if (!trimmed) return null;
                                           const cleaned = trimmed.replace(/\*\*/g, '').replace(/^[\*\-\•\s]+/, '');
                                           return (
                                             <div key={idx} className="flex gap-2 pl-1 items-start">
                                               <span className="text-indigo-500 font-extrabold flex-shrink-0 mt-0.5">•</span>
                                               <span className="font-medium text-slate-700 dark:text-slate-300">{cleaned}</span>
                                             </div>
                                           );
                                         })}
                                       </div>
                                     ) : (
                                       <div className="flex flex-col items-center justify-center py-6 text-center h-full min-h-[100px]">
                                         <p className="text-[9px] text-slate-500 dark:text-slate-400 mb-3 max-w-[240px]">
                                           Condense the full meeting conversation into a precise three-bullet executive summary using Gemini AI.
                                         </p>
                                         <button
                                           onClick={() => handleGenerateSmartSummary(rec)}
                                           disabled={generatingSummaryId === rec.id || rec.isSmartSummaryGenerating}
                                           className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-650 text-white rounded-lg text-[9px] font-bold inline-flex items-center gap-1 shadow-xs hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                                         >
                                           {generatingSummaryId === rec.id || rec.isSmartSummaryGenerating ? (
                                             <>
                                               <Loader2 className="w-2.5 h-2.5 animate-spin animate-spin-slow" />
                                               Designing Summary...
                                             </>
                                           ) : (
                                             <>
                                               <FileText className="w-2.5 h-2.5" />
                                               Smart Summary
                                             </>
                                           )}
                                         </button>
                                       </div>
                                     )}
                                   </div>
                                 </div>
                               </div>
                             ) : (
                               <div className="bg-slate-50 dark:bg-slate-900/20 rounded-lg p-3 text-center border border-dashed border-slate-200 dark:border-slate-800/80 mb-3">
                                 <p className="text-[9px] text-slate-400 italic">
                                   Insights and Executive Summaries can be extracted once AI transcription is complete.
                                 </p>
                               </div>
                             )}

                            {rec.note && (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed italic border-l border-slate-200 pl-2">
                                    {highlightText(rec.note, searchQuery)}
                                </div>
                            )}

                            {/* Interactive Bookmarks Timeline and Diarized Transcript Side-by-Side Panel */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                              
                              {/* Bookmarks Timeline Column */}
                              <div className="lg:col-span-4 space-y-2 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800/50 pb-3 lg:pb-0 lg:pr-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <BookmarkIcon className="w-3 h-3 text-amber-500 fill-current" /> Bookmarks
                                  </span>
                                  <span className="text-[8px] font-black px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded-full font-mono">
                                    {(rec.bookmarks || []).length}
                                  </span>
                                </div>
                                
                                <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                                  {(!rec.bookmarks || rec.bookmarks.length === 0) ? (
                                    <div className="text-center py-6 px-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg border border-dashed border-slate-200/60 dark:border-slate-800/60">
                                      <p className="text-[9px] text-slate-500 font-medium">No bookmarks yet</p>
                                      <p className="text-[8px] text-slate-400 mt-1 leading-normal">
                                        Click the waveform or timeline during playback to select a time, type a comment above, and hit "Add Marker".
                                      </p>
                                    </div>
                                  ) : (
                                    rec.bookmarks.map((bm) => {
                                      const isCurrentlyNear = isPlaying && Math.abs((audioEl?.currentTime || 0) - bm.time) < 1.5;
                                      return (
                                        <div 
                                          key={bm.id}
                                          className={`p-2 rounded-lg border text-left transition-all relative group flex flex-col gap-1 ${
                                            isCurrentlyNear 
                                              ? 'bg-amber-500/10 border-amber-500/30 dark:border-amber-500/20' 
                                              : 'bg-slate-50/40 dark:bg-slate-900/20 border-slate-100 dark:border-slate-850 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => handleJumpToTime(rec, bm.time)}
                                              className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-655 hover:bg-fs-primary hover:text-white text-[8px] font-mono font-bold transition-all flex items-center gap-0.5 shrink-0"
                                              title="Jump playback to bookmark position"
                                            >
                                              <Play className="w-1.5 h-1.5 fill-current" />
                                              {formatTime(bm.time)}
                                            </button>
                                            
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteBookmark(rec, bm.id)}
                                              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity p-0.5"
                                              title="Delete bookmark"
                                            >
                                              <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed break-words">
                                            {bm.comment}
                                          </p>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              {/* Diarized Transcription Column */}
                              <div className="lg:col-span-8 space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-100 dark:border-slate-850">
                                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
                                        <Sparkles className="w-3.5 h-3.5 text-fs-primary shrink-0" /> Diarized Transcript
                                    </span>
                                    
                                    {/* Local transcription active search field inside player deck */}
                                    {!rec.isTranscribing && rec.transcription && editingTranscriptId !== rec.id && (
                                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 px-2 rounded-lg w-full sm:max-w-[200px] shadow-3xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                                           onClick={(e) => e.stopPropagation()}
                                      >
                                        <Search className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                        <input
                                          type="text"
                                          placeholder="Find term..."
                                          value={transcriptQueries[rec.id] || ""}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setTranscriptQueries(prev => ({ ...prev, [rec.id]: val }));
                                            setActiveMatchIndices(prev => ({ ...prev, [rec.id]: 0 }));
                                          }}
                                          className="w-full bg-transparent border-0 text-[10px] text-slate-800 dark:text-slate-200 focus:outline-none p-0 placeholder-slate-400 dark:placeholder-slate-500"
                                        />
                                        {transcriptQueries[rec.id] && (
                                          <div className="flex items-center gap-0.5 shrink-0">
                                            <span className="text-[8px] font-mono text-slate-400 font-bold shrink-0 mr-0.5 whitespace-nowrap">
                                              {(() => {
                                                const query = transcriptQueries[rec.id]?.toLowerCase() || "";
                                                const tLines = rec.transcription?.split('\n') || [];
                                                const tMatches = tLines.map((line, lIdx) => line.toLowerCase().includes(query) ? lIdx : -1).filter(lIdx => lIdx !== -1);
                                                const count = tMatches.length;
                                                if (count === 0) return "0/0";
                                                const currentIdx = activeMatchIndices[rec.id] !== undefined ? activeMatchIndices[rec.id] : 0;
                                                return `${currentIdx + 1}/${count}`;
                                              })()}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const query = transcriptQueries[rec.id]?.toLowerCase() || "";
                                                const tLines = rec.transcription?.split('\n') || [];
                                                const tMatches = tLines.map((line, lIdx) => line.toLowerCase().includes(query) ? lIdx : -1).filter(lIdx => lIdx !== -1);
                                                if (tMatches.length === 0) return;
                                                
                                                const currentIdx = activeMatchIndices[rec.id] !== undefined ? activeMatchIndices[rec.id] : 0;
                                                const newIdx = (currentIdx - 1 + tMatches.length) % tMatches.length;
                                                setActiveMatchIndices(prev => ({ ...prev, [rec.id]: newIdx }));
                                                
                                                const targetLineIdx = tMatches[newIdx];
                                                const el = document.getElementById(`line-${rec.id}-${targetLineIdx}`);
                                                if (el) {
                                                  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                                }
                                                const lineInfo = getLineTimestamp(tLines, targetLineIdx, rec.duration);
                                                handleJumpToTime(rec, lineInfo.time);
                                              }}
                                              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 rounded transition-colors"
                                              title="Previous occurrence"
                                            >
                                              <ChevronUp className="w-2.5 h-2.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const query = transcriptQueries[rec.id]?.toLowerCase() || "";
                                                const tLines = rec.transcription?.split('\n') || [];
                                                const tMatches = tLines.map((line, lIdx) => line.toLowerCase().includes(query) ? lIdx : -1).filter(lIdx => lIdx !== -1);
                                                if (tMatches.length === 0) return;
                                                
                                                const currentIdx = activeMatchIndices[rec.id] !== undefined ? activeMatchIndices[rec.id] : 0;
                                                const newIdx = (currentIdx + 1) % tMatches.length;
                                                setActiveMatchIndices(prev => ({ ...prev, [rec.id]: newIdx }));
                                                
                                                const targetLineIdx = tMatches[newIdx];
                                                const el = document.getElementById(`line-${rec.id}-${targetLineIdx}`);
                                                if (el) {
                                                  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                                }
                                                const lineInfo = getLineTimestamp(tLines, targetLineIdx, rec.duration);
                                                handleJumpToTime(rec, lineInfo.time);
                                              }}
                                              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 rounded transition-colors"
                                              title="Next occurrence"
                                            >
                                              <ChevronDown className="w-2.5 h-2.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setTranscriptQueries(prev => ({ ...prev, [rec.id]: "" }));
                                                setActiveMatchIndices(prev => ({ ...prev, [rec.id]: 0 }));
                                              }}
                                              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 hover:text-red-500 rounded transition-colors"
                                              title="Clear find"
                                            >
                                              <X className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                                        <button 
                                            onClick={() => setReaderModeRecording(rec)} 
                                            className="text-[8px] font-bold text-emerald-605 sm:text-emerald-600 hover:underline uppercase flex items-center gap-1"
                                            title="Opens a full-screen, clean distraction-free reader layout for comfortable text studying."
                                        >
                                            <BookOpen className="w-2.5 h-2.5" /> Reader Mode
                                        </button>
                                        <button onClick={() => handleDownload(rec)} className="text-[8px] font-bold text-slate-400 hover:text-slate-600 uppercase flex items-center gap-1">
                                            <Download className="w-2.5 h-2.5" /> WebM
                                        </button>
                                        <button 
                                            onClick={() => handleCopyTranscript(rec.transcription || '', rec.id)} 
                                            className="text-[8px] font-bold text-fs-primary hover:underline uppercase flex items-center gap-1"
                                            title="Copies the full diarized transcript to your clipboard for use in other documents."
                                        >
                                            {copiedId === rec.id ? <><Check className="w-2.5 h-2.5" /> Copied</> : <><Copy className="w-2.5 h-2.5" /> Copy Transcript</>}
                                        </button>
                                    </div>
                                </div>
                                
                                 {rec.isTranscribing ? (
                                      <div className="flex items-center gap-1.5 py-1 text-slate-305 animate-pulse">
                                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                          <span className="text-[9px] font-medium animate-pulse">Processing...</span>
                                      </div>
                                 ) : (
                                      <div className="max-h-48 overflow-y-auto pr-1 text-[10px] leading-relaxed text-slate-600 dark:text-slate-400 space-y-1.5 scrollbar-thin">
                                          {(() => {
                                              const lines = rec.transcription?.split('\n') || [];
                                              const activeLineIdx = isPlaying ? getActiveLineIndex(lines, audioEl?.currentTime || 0, rec.duration) : -1;
                                              const localQuery = transcriptQueries[rec.id] || "";
                                              
                                              const localMatches = localQuery && localQuery.trim()
                                                  ? lines.map((line, lIdx) => line.toLowerCase().includes(localQuery.toLowerCase()) ? lIdx : -1).filter(lIdx => lIdx !== -1)
                                                  : [];
                                              const localActiveMatchIdx = activeMatchIndices[rec.id] !== undefined ? activeMatchIndices[rec.id] : 0;
                                              const activeLocalMatchLineIdx = localMatches[localActiveMatchIdx] !== undefined ? localMatches[localActiveMatchIdx] : -1;
                                              
                                              return lines.map((line, idx) => {
                                                  const trimmed = line.trim();
                                                  if (!trimmed) return null;
                                                  
                                                  const lineInfo = getLineTimestamp(lines, idx, rec.duration);
                                                  const isActiveLine = isPlaying && activeLineIdx === idx;
                                                  const isActiveLocalMatchLine = activeLocalMatchLineIdx === idx;
                                                  
                                                  const speakerMatch = trimmed.match(/^(\**[a-zA-Z\s0-9]+(?:\s?\[?\d{2}:\d{2}\]?)*\**):/);
                                                  
                                                  if (speakerMatch) {
                                                      const speakerName = speakerMatch[1].replace(/[\*\_\[\]]/g, '').trim();
                                                      const content = trimmed.substring(speakerMatch[0].length).trim();
                                                      return (
                                                          <div 
                                                              key={idx} 
                                                              id={`line-${rec.id}-${idx}`}
                                                              className={`flex items-start gap-2 p-1 rounded transition-all duration-150 ${
                                                                  isActiveLine 
                                                                      ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-l-2 border-emerald-500 pl-1.5 font-semibold text-slate-900 dark:text-white' 
                                                                      : isActiveLocalMatchLine
                                                                          ? 'bg-amber-100/50 dark:bg-amber-950/20 border-l-2 border-amber-500 pl-1.5 font-medium'
                                                                          : 'hover:bg-slate-55 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                                                              }`}
                                                          >
                                                              <button
                                                                  onClick={() => handleJumpToTime(rec, lineInfo.time)}
                                                                  className="px-1 py-0.5 rounded bg-slate-100/85 dark:bg-slate-800 text-[7px] font-mono font-bold text-slate-500 hover:bg-fs-primary hover:text-white transition-all flex items-center gap-0.5 shrink-0 mt-0.5 shadow-2xs"
                                                                  title="Jump play position here"
                                                              >
                                                                  <Play className="w-1.5 h-1.5 fill-current" />
                                                                  {lineInfo.label}
                                                              </button>
                                                              <span className={`font-bold min-w-[50px] uppercase text-[8px] pt-0.5 ${getSpeakerColor(speakerName)}`}>
                                                                  {speakerName}
                                                              </span>
                                                              <span className="flex-1 text-[10px]">
                                                                  {renderTranscriptContent(content, localQuery, searchQuery, isActiveLocalMatchLine)}
                                                              </span>
                                                          </div>
                                                      );
                                                  }
                                                  return (
                                                      <div 
                                                          key={idx} 
                                                          id={`line-${rec.id}-${idx}`}
                                                          className={`flex items-start gap-2 p-1 rounded transition-all duration-150 ${
                                                              isActiveLine 
                                                                  ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-l-2 border-emerald-500 pl-1.5 font-semibold text-slate-900 dark:text-white' 
                                                                  : isActiveLocalMatchLine
                                                                      ? 'bg-amber-100/50 dark:bg-amber-950/20 border-l-2 border-amber-500 pl-1.5 font-medium'
                                                                      : 'hover:bg-slate-55 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                                                          }`}
                                                      >
                                                          <button
                                                              onClick={() => handleJumpToTime(rec, lineInfo.time)}
                                                              className="px-1 py-0.5 rounded bg-slate-100/85 dark:bg-slate-800 text-[7px] font-mono font-bold text-slate-500 hover:bg-fs-primary hover:text-white transition-all flex items-center gap-0.5 shrink-0 mt-0.5 shadow-2xs"
                                                              title="Jump play position here"
                                                          >
                                                              <Play className="w-1.5 h-1.5 fill-current" />
                                                              {lineInfo.label}
                                                          </button>
                                                          <p className="text-slate-400 italic flex-1 text-[10px]">{renderTranscriptContent(trimmed, localQuery, searchQuery, isActiveLocalMatchLine)}</p>
                                                      </div>
                                                  );
                                              });
                                          })()}
                                      </div>
                                 )}
                              </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            );
        })
      )}
          </div>
        </div>
      )}

      {/* Global Deep Search Overlay Modal */}
      {isDeepSearchOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-fs-primary/10 text-fs-primary rounded-2xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Deep Transcript Keywords Search</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Explore across all recorded audio files</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsDeepSearchOpen(false);
                  setDeepSearchQuery('');
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input Port */}
            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-150/50 dark:border-slate-800/50 shrink-0">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type a term to locate timestamps across all voice archives..."
                  value={deepSearchQuery}
                  onChange={(e) => setDeepSearchQuery(e.target.value)}
                  className="block w-full pl-11 pr-10 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-fs-primary/25 text-xs text-slate-900 dark:text-white placeholder-slate-400"
                  autoFocus
                />
                {deepSearchQuery && (
                  <button 
                    type="button"
                    onClick={() => setDeepSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Match Listings */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!deepSearchQuery.trim() ? (
                <div className="text-center py-16 text-slate-400 max-w-sm mx-auto space-y-2">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800/40 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-600 dark:text-slate-350">Enter deep search phrase</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                    Instantly index each sentence, speaker dialogue, and bookmark comment recorded in your meeting history.
                  </p>
                </div>
              ) : (() => {
                const query = deepSearchQuery.toLowerCase();
                const allMatches: any[] = [];

                recordings.forEach((rec) => {
                  const tLines = rec.transcription?.split('\n') || [];
                  tLines.forEach((line, lineIdx) => {
                    const trimmed = line.trim();
                    if (!trimmed) return;
                    
                    if (trimmed.toLowerCase().includes(query)) {
                      const lineInfo = getLineTimestamp(tLines, lineIdx, rec.duration);
                      
                      let speakerName = "System";
                      let content = trimmed;
                      const speakerMatch = trimmed.match(/^(\**[a-zA-Z\s0-9]+(?:\s?\[?\d{2}:\d{2}\]?)*\**):/);
                      if (speakerMatch) {
                        speakerName = speakerMatch[1].replace(/[\*\_\[\]]/g, '').trim();
                        content = trimmed.substring(speakerMatch[0].length).trim();
                      }

                      allMatches.push({
                        recording: rec,
                        lineIndex: lineIdx,
                        time: lineInfo.time,
                        timeLabel: lineInfo.label,
                        speaker: speakerName,
                        content: content
                      });
                    }
                  });
                });

                if (allMatches.length === 0) {
                  return (
                    <div className="text-center py-16 text-slate-400 max-w-sm mx-auto space-y-2">
                      <div className="w-12 h-12 bg-red-50/50 dark:bg-red-950/20 rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <Folder className="w-6 h-6" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-600 dark:text-slate-350">No transcript matches found</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                        No dialogue lines matching "{deepSearchQuery}" are found. Make sure spelling is correct or try another general term.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pb-1">
                      Found {allMatches.length} occurrences across history
                    </p>
                    {allMatches.map((m, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          setExpandedIds(prev => {
                            const next = new Set(prev);
                            next.add(m.recording.id);
                            return next;
                          });
                          handleJumpToTime(m.recording, m.time);
                          setIsDeepSearchOpen(false);
                          setDeepSearchQuery('');
                        }}
                        className="p-3 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-fs-primary/[0.04] dark:hover:bg-fs-primary/[0.08] border border-slate-100 dark:border-slate-850 rounded-xl flex items-start justify-between gap-3 cursor-pointer group transition-all"
                      >
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9.5px] font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-fs-primary transition-colors truncate max-w-[170px]">
                              📁 {m.recording.title}
                            </span>
                            <span className="text-[8px] text-slate-400 font-medium">
                              • {new Date(m.recording.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          
                          <div className="flex items-start gap-1 text-[10px] bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-150 dark:border-slate-850">
                            <span className={`font-black uppercase text-[8px] shrink-0 pt-0.5 min-w-[50px] ${getSpeakerColor(m.speaker)}`}>
                              {m.speaker}
                            </span>
                            <p className="text-slate-600 dark:text-slate-350 leading-relaxed font-normal">
                              {highlightText(m.content, deepSearchQuery)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-2 py-1 rounded bg-fs-primary text-white text-[8px] font-mono font-black flex items-center gap-0.5 shrink-0 shadow-2xs group-hover:scale-105 transition-all mt-1 cursor-pointer"
                        >
                          <Play className="w-1.5 h-1.5 fill-current" />
                          {m.timeLabel}
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {readerModeRecording && (
        <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden animate-in fade-in duration-250">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm shrink-0">
            <div className="min-w-0 max-w-xl">
              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-0.5">📚 READER MODE</span>
              <h1 className="text-sm font-bold text-slate-800 dark:text-white truncate">{readerModeRecording.title}</h1>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              {/* Font Sizers */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-850 p-1.5 rounded-lg border border-slate-200/50 dark:border-slate-800">
                <button 
                  onClick={() => setReaderFontSize(prev => Math.max(12, prev - 1))} 
                  className="px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded transition-all cursor-pointer select-none"
                  title="Make text smaller"
                >
                  A-
                </button>
                <span className="text-[10px] font-mono font-black text-slate-400 dark:text-slate-500 px-1">
                  {readerFontSize}px
                </span>
                <button 
                  onClick={() => setReaderFontSize(prev => Math.min(24, prev + 1))} 
                  className="px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded transition-all cursor-pointer select-none"
                  title="Make text larger"
                >
                  A+
                </button>
              </div>

              {/* Close button */}
              <button
                onClick={() => setReaderModeRecording(null)}
                className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-805 rounded-xl transition-all text-slate-500 dark:text-slate-400 cursor-pointer"
                title="Exit Reader Mode"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reading space */}
          <div className="flex-1 overflow-y-auto px-6 py-12 md:py-16">
            <div className="max-w-3xl mx-auto w-full bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl shadow-xl p-8 md:p-12 animate-in slide-in-from-bottom-6 duration-300">
              {/* Title & Metadata Header */}
              <div className="border-b border-slate-100 dark:border-slate-800/60 pb-6 mb-8 text-center">
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug mb-3">
                  {readerModeRecording.title}
                </h2>
                <div className="flex items-center justify-center gap-1.5 flex-wrap text-xs text-slate-400 font-medium">
                  <span>📅 {new Date(readerModeRecording.timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  <span>•</span>
                  <span>⏱️ {Math.round(readerModeRecording.duration)}s Duration</span>
                  {readerModeRecording.language && (
                    <>
                      <span>•</span>
                      <span className="capitalize">🌐 {readerModeRecording.language}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Distraction-Free Diarized Text Body */}
              <div className="space-y-6" style={{ fontSize: `${readerFontSize}px` }}>
                {(() => {
                  const lines = readerModeRecording.transcription?.split('\n') || [];
                  const populatedLines = lines.map(l => l.trim()).filter(Boolean);

                  if (populatedLines.length === 0) {
                    return (
                      <p className="text-slate-400 dark:text-slate-500 italic text-center py-12">
                        No transcription content available for this recording.
                      </p>
                    );
                  }

                  return populatedLines.map((line, idx) => {
                    const speakerMatch = line.match(/^(\**[a-zA-Z\s0-9]+(?:\s?\[?\d{2}:\d{2}\]?)*\**):/);
                    
                    if (speakerMatch) {
                      const speakerName = speakerMatch[1].replace(/[\*\_\[\]]/g, '').trim();
                      const content = line.substring(speakerMatch[0].length).trim();
                      return (
                        <div key={idx} className="space-y-1.5 border-l-2 border-slate-150 dark:border-slate-800 pl-4">
                          <span className={`font-black uppercase text-[10px] tracking-wider block ${getSpeakerColor(speakerName)}`}>
                            {speakerName}
                          </span>
                          <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                            {content}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <p key={idx} className="text-slate-800 dark:text-slate-200 leading-relaxed pl-4 italic border-l-2 border-slate-150 dark:border-slate-800">
                        {line}
                      </p>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
