import React, { useState, useEffect } from 'react';
import { User, Recording, UserRole, Folder } from './types';
import { getRecordingsMeta, saveRecordingsMeta, getUserSession, saveUserSession, clearUserSession, getFoldersMeta, saveFoldersMeta } from './services/storageService';
import { AuthScreen } from './components/AuthScreen';
import { Recorder } from './components/Recorder';
import { RecordingList } from './components/RecordingList';
import { Integrations } from './components/Integrations';
import { MeetingCompanion } from './components/MeetingCompanion';
import { WorkflowSelector } from './components/WorkflowSelector';
import { UserOptionsPopover } from './components/UserOptionsPopover';
import { HistoryInsights } from './components/HistoryInsights';
import { DateRangePicker } from './components/DateRangePicker';
import { 
  LogOut, Mic, History, LogIn, 
  Moon, Sun, Link as LinkIcon, 
  Video, Settings, ChevronRight,
  Trash2, BarChart2, Search, X
} from 'lucide-react';
import { transcribeAudio, extractKeywords } from './services/aiService';
import { getAudioBlob, deleteAudioBlob } from './services/dbService';
import { sendNotification, getNotificationPermission } from './services/notificationService';
import { logGuestActivity } from './services/loggingService';
import { getCalendarSuggestedTitle } from './services/calendarService';
import { initAuth } from './services/googleAuthService';
import { uploadRecordingToDrive } from './services/googleDriveService';

const encodeSharedRecordings = (recs: Recording[]) => {
  const minimalRecordings = recs.map(r => ({
    title: r.title,
    note: r.note,
    timestamp: r.timestamp,
    duration: r.duration,
    transcription: r.transcription,
    smartSummary: r.smartSummary,
    keyInsights: r.keyInsights,
    keywords: r.keywords
  }));
  const json = JSON.stringify(minimalRecordings);
  const b64 = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (match, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
  return b64;
};

const decodeSharedRecordings = (b64: string): Recording[] => {
  try {
    const json = decodeURIComponent(Array.prototype.map.call(atob(b64.trim()), (c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const arr = JSON.parse(json);
    return arr.map((x: any, index: number) => ({
      ...x,
      id: `shared_${index}_${Date.now()}`,
      blobId: '',
      status: 'shared',
      isTranscribing: false
    }));
  } catch (e) {
    console.error("Failed to decode shared recordings", e);
    return [];
  }
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'record' | 'history' | 'integrations' | 'companion'>('record');
  const [showAuth, setShowAuth] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('fs_theme') === 'dark');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('pref_sidebar_collapsed') === 'true');
  const [activeTranscription, setActiveTranscription] = useState<{ startTime: number; title: string } | null>(null);
  const [lastCompletedRecording, setLastCompletedRecording] = useState<Recording | null>(null);
  const [showWorkflowSelector, setShowWorkflowSelector] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [recordingToDelete, setRecordingToDelete] = useState<Recording | null>(null);
  const [historyTab, setHistoryTab] = useState<'list' | 'insights'>('list');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterPreset, setFilterPreset] = useState<string>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [sharedMeetings, setSharedMeetings] = useState<Recording[] | null>(null);

  const filteredRecordingsByDate = recordings.filter(rec => {
    if (!rec.timestamp) return true;
    const recDate = new Date(rec.timestamp);
    const recDateOnly = new Date(recDate.getFullYear(), recDate.getMonth(), recDate.getDate());

    if (filterStartDate) {
      const start = new Date(filterStartDate);
      const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      if (recDateOnly < startDateOnly) return false;
    }

    if (filterEndDate) {
      const end = new Date(filterEndDate);
      const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      if (recDateOnly > endDateOnly) return false;
    }

    return true;
  });

  const filteredAndSearchedRecordings = filteredRecordingsByDate.filter(rec => {
    if (!historySearchQuery.trim()) return true;
    const q = historySearchQuery.toLowerCase();
    const titleMatch = rec.title?.toLowerCase().includes(q) || false;
    const noteMatch = rec.note?.toLowerCase().includes(q) || false;
    return titleMatch || noteMatch;
  });

  useEffect(() => {
    const session = getUserSession();
    if (session) setUser(session);
    setRecordings(getRecordingsMeta());
    setFolders(getFoldersMeta());
    setIsLoading(false);

    const unsubscribe = initAuth(
      (fbUser, token) => {
        const currentSession = getUserSession();
        if (currentSession) {
          const accounts = currentSession.connectedAccounts || [];
          const hasGoogleDrive = accounts.some(a => a.provider === 'google_drive' && a.connected);
          if (!hasGoogleDrive) {
            const updated: User = {
              ...currentSession,
              connectedAccounts: [
                ...accounts.filter(a => a.provider !== 'google_drive'),
                { provider: 'google_drive' as any, connected: true, email: fbUser.email || currentSession.email }
              ]
            };
            setUser(updated);
            saveUserSession(updated);
          }
        }
      },
      () => {
        // Auth failure / logout, clean if necessary
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Parse shared playlist if provided
    const checkShared = () => {
      const hash = window.location.hash;
      const urlParams = new URLSearchParams(window.location.search);
      let sharedParam = urlParams.get('shared');
      
      if (!sharedParam && hash && hash.startsWith('#shared=')) {
        sharedParam = hash.replace('#shared=', '');
      }

      if (sharedParam) {
        const decoded = decodeSharedRecordings(sharedParam);
        if (decoded && decoded.length > 0) {
          setSharedMeetings(decoded);
          setCurrentView('history');
        }
      }
    };

    checkShared();
    window.addEventListener('hashchange', checkShared);
    return () => window.removeEventListener('hashchange', checkShared);
  }, []);

  useEffect(() => {
    if (!isLoading) saveRecordingsMeta(recordings);
  }, [recordings, isLoading]);

  useEffect(() => {
    if (!isLoading) saveFoldersMeta(folders);
  }, [folders, isLoading]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('fs_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('fs_theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    saveUserSession(newUser);
    setShowAuth(false);
  };

  const handleLogout = () => {
    setUser(null);
    clearUserSession();
    if (['integrations', 'companion'].includes(currentView)) setCurrentView('record');
  };

  const toggleSidebar = () => {
    const newVal = !isSidebarCollapsed;
    setIsSidebarCollapsed(newVal);
    localStorage.setItem('pref_sidebar_collapsed', String(newVal));
  };

  const handleUpdateRecording = (updated: Recording) => {
    setRecordings(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const handleUpdateMultipleRecordings = (updatedList: Recording[]) => {
    const updatedMap = new Map(updatedList.map(r => [r.id, r]));
    setRecordings(prev => prev.map(r => updatedMap.has(r.id) ? updatedMap.get(r.id)! : r));
  };

  const handleDeleteRecording = (id: string, blobId: string) => {
    const rec = recordings.find(r => r.id === id);
    if (rec) {
      setRecordingToDelete(rec);
    }
  };

  const handleDeleteMultipleRecordings = async (ids: string[]) => {
    const toDelete = recordings.filter(r => ids.includes(r.id));
    for (const rec of toDelete) {
      try {
        await deleteAudioBlob(rec.blobId);
      } catch (err) {
        console.error("Failed to delete audio blob for", rec.title, err);
      }
    }
    setRecordings(prev => prev.filter(r => !ids.includes(r.id)));
  };

  const triggerAutoSaveMinutes = (title: string, dateStr: string, durationSec: string, noteStr: string, transcriptionStr: string) => {
    try {
      const formattedDate = new Date(dateStr).toLocaleString();
      const durationMin = Math.floor(Number(durationSec) / 60);
      const durationSecRem = Math.floor(Number(durationSec) % 60);
      const durationStr = `${durationMin}:${String(durationSecRem).padStart(2, '0')}`;
      
      const fileContent = `===========================================
Note taker - MEETING MINUTES
===========================================
Title: ${title}
Recorded At: ${formattedDate}
Duration: ${durationStr}

-------------------------------------------
Meeting Notes & Action Points:
-------------------------------------------
${noteStr || "No notes added."}

-------------------------------------------
Full AI Transcription:
-------------------------------------------
${transcriptionStr}

===========================================
Generated automatically by Note taker
===========================================`;

      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const sanitizedTitle = (title || 'meeting_minutes').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = `${sanitizedTitle}_minutes.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Auto save minutes failed:", err);
    }
  };

  const handleRecordingComplete = async (blobId: string, duration: number, defaultName: string, note: string, language: string) => {
    let finalTitle = defaultName;
    if (localStorage.getItem('pref_auto_associate_calendar') === 'true') {
      const suggestedTitle = getCalendarSuggestedTitle(user);
      if (suggestedTitle) {
        finalTitle = suggestedTitle;
        // Broadcast a nice browser notification that we matched a calendar item
        sendNotification("Calendar Title Matched", `Automatically associated recording with scheduled meeting: "${suggestedTitle}"`);
      }
    }

    const newRec: Recording = { 
      id: crypto.randomUUID(), 
      title: finalTitle, 
      timestamp: new Date().toISOString(), 
      duration, 
      note, 
      blobId, 
      status: 'ready', 
      isTranscribing: true, 
      language 
    };
    
    if (!user) logGuestActivity('RECORDING_COMPLETED', { recordingId: newRec.id, duration });
    
    setRecordings(prev => [newRec, ...prev]);
    setLastCompletedRecording(newRec);
    setShowWorkflowSelector(true);
    
    // Set active transcription state for the Recorder component to display
    setActiveTranscription({ startTime: Date.now(), title: finalTitle });
    
    try {
      const blob = await getAudioBlob(blobId);
      if (blob) {
        const transcription = await transcribeAudio(blob, language);
        let keywords: string[] = [];
        try {
          keywords = await extractKeywords(transcription);
        } catch (keywordError) {
          console.error("Failed to extract keywords:", keywordError);
        }
        setRecordings(prev => prev.map(rec => rec.id === newRec.id ? { ...rec, transcription, keywords, isTranscribing: false } : rec));
        sendNotification("Transcription Ready", `Processing complete for "${finalTitle}"`);

        // Check and trigger auto save minutes
        if (localStorage.getItem('pref_autosave_txt') === 'true') {
          triggerAutoSaveMinutes(finalTitle, newRec.timestamp, duration.toString(), note, transcription);
        }

        // Check and trigger auto upload to Google Drive
        if (localStorage.getItem('pref_auto_upload_drive') === 'true') {
          const updatedRecForUpload = { ...newRec, transcription, keywords, isTranscribing: false };
          uploadRecordingToDrive(updatedRecForUpload, note, transcription)
            .then((result) => {
              if (result.error) {
                console.error("Auto-upload to Google Drive failed:", result.error);
                sendNotification("Google Drive Upload Failed", result.error);
              } else {
                console.log("Auto-upload to Google Drive succeeded:", result);
                sendNotification("Google Drive Auto-Synced", `Successfully uploaded "${finalTitle}" files to Google Drive!`);
              }
            })
            .catch((err) => {
              console.error("Auto-upload error:", err);
            });
        }
      }
    } catch (error) {
      setRecordings(prev => prev.map(rec => rec.id === newRec.id ? { ...rec, isTranscribing: false } : rec));
    } finally {
      // Clear the active transcription state once finished
      setActiveTranscription(null);
    }
  };

  const isAnyAccountConnected = user?.connectedAccounts?.some(a => a.connected);

  if (isLoading) return null;

  const NavItem = ({ view, icon: Icon, label, badge }: { view: typeof currentView, icon: any, label: string, badge?: number }) => (
    <button 
      onClick={() => setCurrentView(view)} 
      className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl transition-all duration-200 group relative ${
        currentView === view 
          ? 'bg-fs-primary/10 text-fs-primary border border-fs-primary/20' 
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
      }`}
      title={isSidebarCollapsed ? label : undefined}
    >
      <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
        <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${currentView === view ? 'text-fs-primary' : ''}`} />
        {!isSidebarCollapsed && <span className="text-sm font-semibold tracking-tight">{label}</span>}
      </div>
      {!isSidebarCollapsed && (
        badge !== undefined && badge > 0 ? (
          <span className="text-[10px] bg-fs-primary text-white px-1.5 py-0.5 rounded-full font-bold">{badge}</span>
        ) : (
          <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${currentView === view ? 'opacity-100 text-fs-primary/50' : ''}`} />
        )
      )}
    </button>
  );

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row overflow-hidden relative font-sans">
      {showAuth && <AuthScreen onLogin={handleLogin} onCancel={() => setShowAuth(false)} />}
      
      {showWorkflowSelector && lastCompletedRecording && (
        <WorkflowSelector 
          recording={lastCompletedRecording} 
          onClose={() => {
            setShowWorkflowSelector(false);
            setCurrentView('history');
          }} 
        />
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex ${isSidebarCollapsed ? 'md:w-20' : 'md:w-72'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 flex-col z-30 transition-all duration-300 relative`}>
        {/* Toggle Collapse Button on the right border */}
        <button
          onClick={toggleSidebar}
          className="absolute top-6 -right-3 h-6 w-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 cursor-pointer shadow-md select-none z-50 transition-all"
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-305 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
        </button>

        <div className={`p-6 ${isSidebarCollapsed ? 'px-4' : 'px-6'}`}>
          <div className="flex items-center gap-3 mb-10">
            <div className="h-10 w-10 bg-gradient-to-br from-fs-primary to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-fs-primary/20 shrink-0">
              H
            </div>
            {!isSidebarCollapsed && (
              <div className="animate-in fade-in duration-200">
                <h1 className="text-lg font-black text-slate-900 dark:text-white leading-none tracking-tight">My Hurdles</h1>
                <p className="text-[10px] text-fs-primary font-bold uppercase tracking-[0.2em] mt-1">Note taker</p>
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            <section>
              {!isSidebarCollapsed && (
                <p className="px-3 mb-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-in fade-in duration-200">Core</p>
              )}
              <div className="space-y-1">
                <NavItem view="record" icon={Mic} label={isSidebarCollapsed ? "" : "New Recording"} />
                <NavItem view="history" icon={History} label={isSidebarCollapsed ? "" : "History"} badge={isSidebarCollapsed ? undefined : recordings.length} />
              </div>
            </section>

            {user && (
              <section>
                {!isSidebarCollapsed && (
                  <p className="px-3 mb-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-in fade-in duration-200">Connect</p>
                )}
                <div className="space-y-1">
                  <NavItem view="integrations" icon={LinkIcon} label={isSidebarCollapsed ? "" : "Integrations"} />
                  {isAnyAccountConnected && (
                    <NavItem view="companion" icon={Video} label={isSidebarCollapsed ? "" : "Meeting HUD"} />
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className={`bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between border border-slate-200 dark:border-slate-700 ${isSidebarCollapsed ? 'p-2.5 justify-center' : 'p-3'}`}>
             <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`flex items-center justify-center ${isSidebarCollapsed ? 'w-full h-8 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-lg' : 'gap-2'}`}
                title="Toggle Dark/Light theme"
             >
               {isDarkMode ? <Moon className="w-4 h-4 text-slate-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
               {!isSidebarCollapsed && <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{isDarkMode ? 'Dark' : 'Light'}</span>}
             </button>
             {!isSidebarCollapsed && (
               <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-fs-primary' : 'bg-slate-300'}`}
               >
                  <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${isDarkMode ? 'translate-x-5' : ''}`} />
               </button>
             )}
          </div>

          <div className="flex items-center justify-between p-2">
            {user ? (
              <div className="relative w-full">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={`flex items-center justify-between w-full rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 text-left cursor-pointer group ${isSidebarCollapsed ? 'p-1 justify-center' : 'p-2'}`}
                  title="User Options"
                  id="user-profile-button"
                >
                  <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} min-w-0`}>
                    <div className="w-9 h-9 bg-fs-primary text-white font-bold rounded-full flex items-center justify-center text-sm shadow-md border border-slate-200 dark:border-slate-700 uppercase shrink-0">
                      {user.email[0]}
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="flex flex-col min-w-0 animate-in fade-in duration-200">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.email.split('@')[0]}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter truncate">{user.role.replace('_', ' ')}</span>
                      </div>
                    )}
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                      <Settings className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>

                <UserOptionsPopover 
                  user={user}
                  isOpen={isUserMenuOpen}
                  onClose={() => setIsUserMenuOpen(false)}
                  onLogout={handleLogout}
                  onUpdateUser={setUser}
                  placement={isSidebarCollapsed ? "right" : "top"}
                />
              </div>
            ) : (
              <button 
                onClick={() => setShowAuth(true)} 
                className={`w-full py-2.5 bg-slate-900 dark:bg-fs-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-900/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center ${isSidebarCollapsed ? 'p-2.5' : 'gap-2 px-3'}`}
                title="Sign In"
              >
                {isSidebarCollapsed ? (
                  <LogIn className="w-5 h-5" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Top Navigation */}
      <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between z-40">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-fs-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">H</div>
          <span className="font-bold text-slate-900 dark:text-white tracking-tight">My Hurdles</span>
        </div>
        <div className="flex items-center gap-3 relative">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-500 dark:text-slate-400">
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} 
                className="w-8 h-8 rounded-full bg-fs-primary text-white font-bold flex items-center justify-center border border-slate-200 dark:border-slate-700 uppercase focus:outline-none text-xs shadow-sm"
                id="user-profile-mobile-button"
              >
                {user.email[0]}
              </button>
              <UserOptionsPopover 
                user={user}
                isOpen={isUserMenuOpen}
                onClose={() => setIsUserMenuOpen(false)}
                onLogout={handleLogout}
                onUpdateUser={setUser}
                placement="bottom"
              />
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} className="text-fs-primary font-bold text-sm">Login</button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white dark:bg-slate-950">
        <div className="flex-1 overflow-y-auto">
          {currentView === 'record' && (
            <div className="py-4 md:py-6 px-4 flex flex-col items-center justify-center w-full">
               <div className="w-full max-w-xl">
                 <div className="text-center mb-4">
                   <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Record</h2>
                 </div>
                 <Recorder onRecordingComplete={handleRecordingComplete} activeTranscription={activeTranscription} />
               </div>
            </div>
          )}
          
          {currentView === 'history' && (
            <div className="p-6 md:p-12 max-w-5xl mx-auto w-full border-0">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Meeting Archives</h2>
                <p className="text-slate-500 dark:text-slate-400 text-base mt-2 max-w-lg mx-auto leading-relaxed">Access and manage all historical board minutes and category insights.</p>
              </div>

              {/* Date Range Picker filters both listings and charts */}
              <DateRangePicker 
                startDate={filterStartDate}
                endDate={filterEndDate}
                preset={filterPreset}
                onStartDateChange={setFilterStartDate}
                onEndDateChange={setFilterEndDate}
                onPresetChange={setFilterPreset}
                totalCount={recordings.length}
                filteredCount={sharedMeetings ? sharedMeetings.length : filteredAndSearchedRecordings.length}
              />

              {/* Shared playlist notice banner */}
              {sharedMeetings && (
                <div className="max-w-2xl mx-auto bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/35 p-3.5 px-4 rounded-2xl mb-6 shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                      <Search className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Viewing Shared Meeting Archives</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        You are viewing {sharedMeetings.length} shared meeting recap{sharedMeetings.length > 1 ? 's' : ''} in read-only mode.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      // Clear url parameters and hash
                      window.location.hash = '';
                      const url = new URL(window.location.href);
                      url.searchParams.delete('shared');
                      window.history.pushState({}, '', url.toString());
                      setSharedMeetings(null);
                    }}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    View My Local Records
                  </button>
                </div>
              )}

              {/* Search Bar for filtering recordings dynamically by title or note content */}
              {!sharedMeetings && (
                <div className="max-w-2xl mx-auto mb-6">
                  <div className="relative w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search recordings by title or note content..."
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-fs-primary/20 focus:border-fs-primary text-xs transition-colors text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-3xs font-medium"
                    />
                    {historySearchQuery && (
                      <button
                        onClick={() => setHistorySearchQuery('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-tab selection bar */}
              <div className="flex justify-center mb-8" id="history-sub-tabs">
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl gap-0.5 border border-slate-205/40 dark:border-slate-800/60 shadow-3xs">
                  <button
                    onClick={() => setHistoryTab('list')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 outline-none ${
                      historyTab === 'list'
                        ? 'bg-white dark:bg-slate-800 text-fs-primary shadow-xs'
                        : 'text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-250'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    Recording Archives
                  </button>
                  <button
                    onClick={() => setHistoryTab('insights')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 outline-none ${
                      historyTab === 'insights'
                        ? 'bg-white dark:bg-slate-800 text-fs-primary shadow-xs'
                        : 'text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-250'
                    }`}
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    Category Insights
                  </button>
                </div>
              </div>

              {historyTab === 'list' ? (
                <RecordingList 
                  recordings={sharedMeetings || filteredAndSearchedRecordings} 
                  currentUser={user} 
                  onUpdateRecording={handleUpdateRecording} 
                  onUpdateMultipleRecordings={handleUpdateMultipleRecordings}
                  onDeleteRecording={handleDeleteRecording}
                  onDeleteMultipleRecordings={handleDeleteMultipleRecordings}
                  onShare={() => {}} 
                  folders={folders}
                  setFolders={setFolders}
                />
              ) : (
                <HistoryInsights 
                  recordings={sharedMeetings || filteredAndSearchedRecordings} 
                  folders={folders} 
                />
              )}
            </div>
          )}

          {currentView === 'integrations' && user && <Integrations user={user} onUpdateUser={setUser} />}
          {currentView === 'companion' && user && (
            <MeetingCompanion 
              user={user} 
              onUpdateUser={setUser} 
              onAddRecording={(title, duration, note, transcript) => {
                const newRec: Recording = { 
                  id: crypto.randomUUID(), 
                  title, 
                  timestamp: new Date().toISOString(), 
                  duration, 
                  note, 
                  blobId: 'mock_zoom_' + crypto.randomUUID(), 
                  status: 'ready', 
                  isTranscribing: false, 
                  transcription: transcript,
                  language: 'en-US'
                };
                setRecordings(prev => [newRec, ...prev]);
              }}
              onNavigateToHistory={() => setCurrentView('history')}
              triggerAutoSaveMinutes={triggerAutoSaveMinutes}
            />
          )}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-3 px-2 z-40">
           <button onClick={() => setCurrentView('record')} className={`flex flex-col items-center gap-1 ${currentView === 'record' ? 'text-fs-primary' : 'text-slate-400'}`}>
              <Mic className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">Record</span>
           </button>
           <button onClick={() => setCurrentView('history')} className={`flex flex-col items-center gap-1 ${currentView === 'history' ? 'text-fs-primary' : 'text-slate-400'}`}>
              <History className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">History</span>
           </button>
           {user && (
             <button onClick={() => setCurrentView('integrations')} className={`flex flex-col items-center gap-1 ${currentView === 'integrations' ? 'text-fs-primary' : 'text-slate-400'}`}>
                <Settings className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase">Settings</span>
             </button>
           )}
        </nav>
      </main>

      {/* Delete Confirmation Modal */}
      {recordingToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-950/30 rounded-2xl text-red-650 dark:text-red-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Delete Recording?</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Permanent Deletion</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-sans">
                Are you sure you want to permanently delete <span className="font-bold text-slate-900 dark:text-white">"{recordingToDelete.title}"</span>? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setRecordingToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-400 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={async () => {
                    try {
                      await deleteAudioBlob(recordingToDelete.blobId);
                      setRecordings(prev => prev.filter(r => r.id !== recordingToDelete.id));
                    } catch (error) {
                      console.error("Failed to delete recording:", error);
                    } finally {
                      setRecordingToDelete(null);
                    }
                  }}
                  className="px-5 py-2 bg-red-600 hover:bg-red-750 text-white rounded-xl text-[11px] font-bold transition-all shadow-md shadow-red-500/10"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;