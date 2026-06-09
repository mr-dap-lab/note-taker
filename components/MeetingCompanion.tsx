import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, MessageSquare, Users, Clock, 
  Shield, Sparkles, Loader2, CloudDownload, Calendar, 
  Check, AlertCircle
} from 'lucide-react';
import { User, ConnectedAccount } from '../types';

interface MeetingCompanionProps {
  user: User;
  onUpdateUser: (user: User) => void;
  onAddRecording: (title: string, duration: number, note: string, transcript: string) => void;
  onNavigateToHistory: () => void;
  triggerAutoSaveMinutes: (title: string, dateStr: string, durationSec: string, noteStr: string, transcriptionStr: string) => void;
}

interface Meeting {
  id: string;
  topic: string;
  startTime: string;
  duration: number; // minutes
  joinUrl: string;
  status: 'live' | 'upcoming';
}

interface CloudRecording {
  id: string;
  topic: string;
  date: string;
  duration: number; // minutes
  fileSize: string;
  imported: boolean;
}

export const MeetingCompanion: React.FC<MeetingCompanionProps> = ({ 
  user, 
  onUpdateUser, 
  onAddRecording, 
  onNavigateToHistory,
  triggerAutoSaveMinutes
}) => {
  const [isMeetingActive, setIsMeetingActive] = useState(false);
  const [activeMeetingTopic, setActiveMeetingTopic] = useState('');
  const [meetingNote, setMeetingNote] = useState('');
  const [liveTranscript, setLiveTranscript] = useState<string[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  // States for importing recordings
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importStep, setImportStep] = useState('');
  
  // Zoom & Teams connection statuses
  const zoomAccount = user.connectedAccounts?.find(a => a.provider === 'zoom' && a.connected);
  const zoomEmail = zoomAccount?.email || user.email;
  
  const teamsAccount = user.connectedAccounts?.find(a => a.provider === 'teams' && a.connected);
  const teamsEmail = teamsAccount?.email || user.email;

  // Active sync focus (Zoom or Teams)
  const [activePlatform, setActivePlatform] = useState<'zoom' | 'teams'>(() => {
    if (teamsAccount && !zoomAccount) return 'teams';
    return 'zoom';
  });

  // Keep in sync when external connected state changes
  useEffect(() => {
    if (teamsAccount && !zoomAccount) {
      setActivePlatform('teams');
    } else if (!teamsAccount && zoomAccount) {
      setActivePlatform('zoom');
    }
  }, [teamsAccount, zoomAccount]);

  // Mock Zoom Scheduled Meetings
  const [zoomMeetings] = useState<Meeting[]>([
    {
      id: 'z-101',
      topic: 'Monthly Board Alignment & Budget Approvals',
      startTime: 'Happening Now',
      duration: 60,
      joinUrl: 'https://zoom.us/j/101202303',
      status: 'live'
    },
    {
      id: 'z-102',
      topic: 'Landscaping Committee & Pool Repair RFP Match',
      startTime: 'Today, 3:00 PM',
      duration: 45,
      joinUrl: 'https://zoom.us/j/104305607',
      status: 'upcoming'
    },
    {
      id: 'z-103',
      topic: 'Weekly Manager-Board Catchup',
      startTime: 'Tomorrow, 10:00 AM',
      duration: 30,
      joinUrl: 'https://zoom.us/j/108902030',
      status: 'upcoming'
    }
  ]);

  // Mock Teams Scheduled Meetings
  const [teamsMeetings] = useState<Meeting[]>([
    {
      id: 't-101',
      topic: 'Q2 Financial Audit & Reserves Review',
      startTime: 'Happening Now',
      duration: 60,
      joinUrl: 'https://teams.microsoft.com/l/meetup-join/101',
      status: 'live'
    },
    {
      id: 't-102',
      topic: 'Safety Assessment & Pool Lifeguard RFP Evaluation',
      startTime: 'Today, 4:15 PM',
      duration: 45,
      joinUrl: 'https://teams.microsoft.com/l/meetup-join/102',
      status: 'upcoming'
    },
    {
      id: 't-103',
      topic: 'Building B Elevator Maintenance Proposal Sync',
      startTime: 'Tomorrow, 11:30 AM',
      duration: 30,
      joinUrl: 'https://teams.microsoft.com/l/meetup-join/103',
      status: 'upcoming'
    }
  ]);

  // Mock Zoom Cloud Recordings
  const [zoomRecordings, setZoomRecordings] = useState<CloudRecording[]>([
    {
      id: 'zrec-201',
      topic: 'Annual General Assembly Meeting',
      date: 'May 18, 2026',
      duration: 45,
      fileSize: '124 MB',
      imported: false
    },
    {
      id: 'zrec-202',
      topic: 'Emergency Plumbing RFP Decision',
      date: 'May 14, 2026',
      duration: 22,
      fileSize: '58 MB',
      imported: false
    },
    {
      id: 'zrec-203',
      topic: 'Vendor Agreement Review - Asphalt Re-paving',
      date: 'May 08, 2026',
      duration: 35,
      fileSize: '95 MB',
      imported: false
    }
  ]);

  // Mock Teams Cloud Recordings
  const [teamsRecordings, setTeamsRecordings] = useState<CloudRecording[]>([
    {
      id: 'trec-201',
      topic: 'Special Board Resolution on Pet Leash Policies',
      date: 'May 19, 2026',
      duration: 30,
      fileSize: '65 MB',
      imported: false
    },
    {
      id: 'trec-202',
      topic: 'Ad-hoc Parking Lot Resurfacing Vendor Interviews',
      date: 'May 15, 2026',
      duration: 50,
      fileSize: '110 MB',
      imported: false
    },
    {
      id: 'trec-203',
      topic: 'Annual Insurance Premium & Liability Policy Sync',
      date: 'May 10, 2026',
      duration: 40,
      fileSize: '88 MB',
      imported: false
    }
  ]);

  // Mock participants during active call
  const [participants] = useState<string[]>([
    'Diego Avella (Host)',
    'Sarah Green (Board Member)',
    'Mike Adams (Manager)'
  ]);

  // Simulate active live call transcript streaming
  useEffect(() => {
    if (isMeetingActive) {
      const zoomPhrases = [
        "Diego Avella: Thanks everyone for jumping on this Zoom call. Let's start the budget reviews.",
        "Sarah Green: I’ve updated the landscaping invoice. The overall quote remains at $15,000.",
        "Mike Adams: Perfect. The repair crew is on schedule to start pool repairs on Monday.",
        "Diego Avella: Excellent. Sarah, did you get the signed vendor proposals?",
        "Sarah Green: Yes, they are attached to the official folder and ready for formal board signatures.",
        "Mike Adams: We will also need to approve the draft minutes from last week's session.",
        "Diego Avella: Great, let's vote to approve those at the end of this sync.",
        "Sarah Green: I officially motion to approve the landscaping proposal.",
        "Mike Adams: I second that motion. Motion carries fully.",
        "Diego Avella: Beautiful, let's document these items so we can post the minutes onto the board portal tonight."
      ];

      const teamsPhrases = [
        "Diego Avella: Hello everyone, welcome to the MS Teams session for Q2 Financial Audit and reserves alignment.",
        "Sarah Green: The Microsoft Excel spreadsheet has been uploaded to our Teams Channel files tab.",
        "Mike Adams: I see the elevator repair proposal is also attached in our shared workspace for feedback.",
        "Diego Avella: Excellent. Let's make sure the minutes reflect we approved the audit and the elevator vendor.",
        "Sarah Green: I formally motion to accept the reserve proposal at $22,000.",
        "Mike Adams: I second that motion. Fully approved under Board Article 4!",
        "Diego Avella: Fantastic. Sarah, can you export these decisions to our Teams notebook?",
        "Sarah Green: Absolutely, doing it now from the companion sync widget.",
        "Mike Adams: High five everyone! Let's conclude this MS Teams sync.",
        "Diego Avella: Thanks all. Closing down the feed bot now."
      ];

      const mockPhrases = activePlatform === 'zoom' ? zoomPhrases : teamsPhrases;
      
      setLiveTranscript([]);
      let i = 0;
      const interval = setInterval(() => {
        if (i < mockPhrases.length) {
          setLiveTranscript(prev => [...prev, mockPhrases[i]]);
          i++;
        } else {
          clearInterval(interval);
        }
      }, 4500);
      
      return () => clearInterval(interval);
    }
  }, [isMeetingActive, activePlatform]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveTranscript]);

  // Handle Joining Meeting HUD
  const handleStartLiveCompanion = (topic: string) => {
    setActiveMeetingTopic(topic);
    setMeetingNote('');
    setIsMeetingActive(true);
  };

  // Handle Importing Cloud Recording
  const handleImportRecording = async (rec: CloudRecording) => {
    setImportingId(rec.id);
    
    try {
      const serverName = activePlatform === 'zoom' ? 'Zoom video structural cloud' : 'Microsoft Azure/Teams media platform';
      const fileSource = activePlatform === 'zoom' ? `Zoom Cloud (${zoomEmail})` : `Teams Media Archive (${teamsEmail})`;
      
      setImportStep(`Handshaking with ${serverName}...`);
      await new Promise(r => setTimeout(r, 900));
      setImportStep(`Downloading cloud audio file: "${rec.topic}" (${rec.fileSize})...`);
      await new Promise(r => setTimeout(r, 1200));
      setImportStep('Whisper Neural AI model running acoustic decoding...');
      await new Promise(r => setTimeout(r, 1050));
      setImportStep('Structuring speaker labels and meeting agenda sections...');
      await new Promise(r => setTimeout(r, 800));
      
      // Save to application history
      const mockTranscript = activePlatform === 'zoom' ? `[00:00:15] DIEGO: Right, let's proceed with transcribing the Zoom Cloud storage recording of "${rec.topic}".
[00:01:22] SARAH: Yes, we voted and aligned on all the active resolutions.
[00:05:40] MIKE: Budget lines are consolidated and signed off.
[00:10:15] DIEGO: Fantastic. Deciding to close the meeting.` : `[00:00:10] DIEGO: Welcome back to the Teams transcript indexing of "${rec.topic}".
[00:01:45] SARAH: Our pet leash policies and reserve funds are finalized in the channels.
[00:04:30] MIKE: Elevator maintenance SLA is agreed upon.
[00:09:50] DIEGO: Perfect, stopping Teams recording.`;

      const mockNote = `--- CLOUD IMPORT NOTES ---
Meeting Topic: ${rec.topic}
Originally Recorded: ${rec.date}
Synced from ${activePlatform === 'zoom' ? 'Zoom' : 'Teams'} Account: ${activePlatform === 'zoom' ? zoomEmail : teamsEmail}

Key Action Items:
- Approved resolutions are updated on record.
- Budget spreadsheet audit is completed.`;

      onAddRecording(
        `${activePlatform === 'zoom' ? 'Zoom' : 'Teams'}: ${rec.topic}`,
        rec.duration * 60,
        mockNote,
        mockTranscript
      );

      // Trigger standard autosave if preferring
      if (localStorage.getItem('pref_autosave_txt') === 'true') {
        triggerAutoSaveMinutes(
          `${activePlatform === 'zoom' ? 'Zoom' : 'Teams'}_${rec.topic}`, 
          new Date().toISOString(), 
          (rec.duration * 60).toString(), 
          mockNote, 
          mockTranscript
        );
      }

      if (activePlatform === 'zoom') {
        setZoomRecordings(prev => prev.map(p => p.id === rec.id ? { ...p, imported: true } : p));
      } else {
        setTeamsRecordings(prev => prev.map(p => p.id === rec.id ? { ...p, imported: true } : p));
      }
      alert(`"${rec.topic}" successfully imported, transcribed, and added to your Meeting Archives.`);
    } catch (err) {
      console.error(err);
    } finally {
      setImportingId(null);
    }
  };

  const handleSaveActiveSession = () => {
    const platformLabel = activePlatform === 'zoom' ? 'Zoom' : 'Teams';
    const defaultTitle = activeMeetingTopic || `${platformLabel} Live Sync Session`;
    const tag = activePlatform === 'zoom' ? '[Live Zoom]' : '[Live Teams]';
    const compiledTranscript = liveTranscript.length > 0 
      ? liveTranscript.map(line => `${tag} ${line}`).join('\n')
      : "No spoken dialogues transcribed.";
    
    const formattedNote = meetingNote || "No live guidelines/notes added during synchronization.";

    onAddRecording(
      defaultTitle,
      Math.max(60, liveTranscript.length * 30), // Simulate duration based on phrases
      formattedNote,
      compiledTranscript
    );

    // Trigger auto save file
    if (localStorage.getItem('pref_autosave_txt') === 'true') {
      triggerAutoSaveMinutes(
        defaultTitle,
        new Date().toISOString(),
        (liveTranscript.length * 30).toString(),
        formattedNote,
        compiledTranscript
      );
    }

    setIsMeetingActive(false);
    onNavigateToHistory();
  };

  const currentScheduled = activePlatform === 'zoom' ? zoomMeetings : teamsMeetings;
  const currentCloud = activePlatform === 'zoom' ? zoomRecordings : teamsRecordings;
  const primaryEmail = activePlatform === 'zoom' ? zoomEmail : teamsEmail;
  const platformNameLong = activePlatform === 'zoom' ? 'Zoom Secure Integration' : 'Microsoft Teams Integration';
  const themeAccentColor = activePlatform === 'zoom' ? 'blue' : 'indigo';

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {!isMeetingActive ? (
        /* Standby / Overview Dashboard when Connected */
        <div className="flex-1 overflow-y-auto p-6 md:p-10 w-full max-w-6xl mx-auto space-y-8">
          
          {/* Dual Tabs layout if both Zoom and Teams are connected */}
          {zoomAccount && teamsAccount && (
            <div className="flex justify-center sm:justify-start">
              <div className="flex bg-slate-200/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl w-full max-w-md shadow-xs">
                <button 
                  onClick={() => setActivePlatform('zoom')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${activePlatform === 'zoom' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  <Video className="w-4 h-4" /> Zoom Workspace
                </button>
                <button 
                  onClick={() => setActivePlatform('teams')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${activePlatform === 'teams' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  <MessageSquare className="w-4 h-4" /> MS Teams Workspace
                </button>
              </div>
            </div>
          )}

          {/* Top Account Header */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${activePlatform === 'zoom' ? 'bg-blue-500' : 'bg-indigo-600'}`}>
                {activePlatform === 'zoom' ? <Video className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-900 dark:text-white text-lg">{platformNameLong} Connected</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Connected profile: <span className={`font-bold ${activePlatform === 'zoom' ? 'text-blue-500' : 'text-indigo-500'}`}>{primaryEmail}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/50">
                Webhook Status: <strong className="text-emerald-500">Live</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Col: Scheduled Live Calls */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                    Scheduled {activePlatform === 'zoom' ? 'Zoom' : 'Teams'} Calls
                  </h4>
                </div>
              </div>

              <div className="space-y-4">
                {currentScheduled.map((meeting) => (
                  <div 
                    key={meeting.id} 
                    className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 ${meeting.status === 'live' ? (activePlatform === 'zoom' ? 'ring-2 ring-blue-500/30' : 'ring-2 ring-indigo-500/30') : ''}`}
                  >
                    {meeting.status === 'live' && (
                      <div className={`absolute top-0 left-0 text-white font-mono text-[9px] font-bold tracking-widest px-3 py-0.5 rounded-br-2xl uppercase ${activePlatform === 'zoom' ? 'bg-blue-500' : 'bg-indigo-600'}`}>
                        LIVE NOW
                      </div>
                    )}
                    
                    <div className="space-y-1.5 pt-2 sm:pt-0">
                      <h5 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{meeting.topic}</h5>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 dark:text-slate-400 text-xs">
                        <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                          <Clock className={`w-3.5 h-3.5 ${activePlatform === 'zoom' ? 'text-blue-500' : 'text-indigo-500'}`} /> {meeting.startTime}
                        </span>
                        <span className="font-medium">• {meeting.duration} minutes</span>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {meeting.status === 'live' ? (
                        <button 
                          onClick={() => handleStartLiveCompanion(meeting.topic)}
                          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-white font-bold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider active:scale-95 ${activePlatform === 'zoom' ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/10' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-650/10'}`}
                        >
                          <Sparkles className="w-4 h-4" /> Start Bot-Sync
                        </button>
                      ) : (
                        <button 
                          onClick={() => alert(`This meeting is scheduled for a later hour. Note Taker will automatically deploy the recording bot as soon as it starts on ${activePlatform === 'zoom' ? 'Zoom' : 'Teams'}!`)}
                          className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 font-bold text-[11px] rounded-lg transition-colors uppercase tracking-wider"
                        >
                          Standby
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col: Cloud recordings archive sync */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CloudDownload className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                    {activePlatform === 'zoom' ? 'Zoom Cloud Archives' : 'Teams Cloud Recordings'}
                  </h4>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Decrypted meetings listed below were found in your linked {activePlatform === 'zoom' ? 'Zoom' : 'Teams'} logs. Sync directly with Whisper transcription services.
                </p>

                <div className="space-y-3.5 divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {currentCloud.map((rec, i) => (
                    <div key={rec.id} className={`pt-3.5 ${i === 0 ? 'pt-0 border-t-0' : 'border-t'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h6 className="font-bold text-slate-800 dark:text-slate-200 text-xs leading-snug">{rec.topic}</h6>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                            <span>{rec.date}</span>
                            <span>•</span>
                            <span>{rec.duration}m</span>
                            <span>•</span>
                            <span>{rec.fileSize}</span>
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          {rec.imported ? (
                            <span className="flex items-center text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-lg">
                              <Check className="w-3 h-3 mr-1" /> Synced
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleImportRecording(rec)}
                              disabled={!!importingId}
                              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400 transition-colors flex items-center gap-1.5 border border-slate-200/50 dark:border-slate-800 disabled:opacity-50"
                            >
                              {importingId === rec.id ? (
                                <Loader2 className={`w-3 h-3 animate-spin ${activePlatform === 'zoom' ? 'text-blue-500' : 'text-indigo-500'}`} />
                              ) : (
                                <>
                                  <CloudDownload className="w-3 h-3" /> Sync
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Processing overlay wrapper when importing cloud record */}
          {importingId && (
            <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-2xl w-full max-w-sm text-center space-y-6">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 w-12 h-12 bg-indigo-500/20 rounded-full animate-ping" />
                  <Loader2 className={`w-10 h-10 animate-spin ${activePlatform === 'zoom' ? 'text-blue-500' : 'text-indigo-600'}`} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">Importing Recording</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono italic px-4 leading-normal">{importStep}</p>
                </div>
              </div>
            </div>
          )}

        </div>
      ) : (
        /* Active Live Companion HUD Page */
        <>
          {/* Left panel: Active Call Live Dictation Stream */}
          <div className="w-full md:w-5/12 border-r border-slate-200 dark:border-slate-800 flex flex-col h-1/2 md:h-full">
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-650 animate-pulse bg-red-605 bg-red-600 font-sans" />
                <div className="truncate pr-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                    {activePlatform === 'zoom' ? 'Zoom' : 'Teams'} Live Web-Sync Client
                  </span>
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs truncate max-w-[200px]">{activeMeetingTopic}</h4>
                </div>
              </div>

              <div className="text-[10px] font-mono text-slate-500 bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 px-2.5 py-1 rounded-xl flex items-center gap-1 select-none">
                <Clock className={`w-3.5 h-3.5 ${activePlatform === 'zoom' ? 'text-blue-500' : 'text-indigo-500'}`} /> 00:08:14
              </div>
            </div>

            {/* Active Members indicators */}
            <div className="p-3 bg-blue-50/20 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-850 px-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 flex items-center gap-1">
                  <Users className={`w-3.5 h-3.5 ${activePlatform === 'zoom' ? 'text-blue-500' : 'text-indigo-550'}`} /> 
                  Active {activePlatform === 'zoom' ? 'Zoom' : 'Teams'} Speakers ({participants.length})
                </span>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/15 px-1.5 py-0.5 rounded">Connected</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {participants.map((person, i) => (
                  <span key={i} className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-100 dark:border-slate-700/80 shadow-xs flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${i === 0 ? (activePlatform === 'zoom' ? 'bg-blue-500 animate-pulse' : 'bg-indigo-650 animate-pulse') : 'bg-slate-400'}`} />
                    {person}
                  </span>
                ))}
              </div>
            </div>

            {/* Dialogue stream logs */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 font-mono text-xs bg-slate-50/30 dark:bg-transparent">
              <div className="bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-2xl border border-dotted border-slate-200 dark:border-slate-800 text-[11px] font-sans text-slate-500 dark:text-slate-400 text-center leading-normal mb-2">
                🤖 <strong>AI BOT Connected to {activePlatform === 'zoom' ? 'Zoom' : 'Teams'} Audio Stream.</strong> Live spoke transcription is updated block-by-block using Whisper.
              </div>

              {liveTranscript.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center opacity-40 select-none">
                  <Loader2 className={`w-6 h-6 animate-spin mb-2 ${activePlatform === 'zoom' ? 'text-blue-500' : 'text-indigo-500'}`} />
                  <p className="text-slate-500 font-sans text-xs">Waiting for active voices to initialize dialogue...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {liveTranscript.map((line, idx) => {
                    const parts = line.split(':');
                    const speaker = parts[0] ? parts[0].trim() : "System";
                    const dialogue = parts[1] ? parts[1].trim() : "";

                    return (
                      <div key={idx} className="animate-in slide-in-from-left-2 fade-in duration-200">
                        <div className="text-[9px] text-slate-400 font-bold mb-0.5 flex items-center justify-between">
                          <span>[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}]</span>
                          <span className={`${activePlatform === 'zoom' ? 'text-blue-500' : 'text-indigo-400'} font-mono`}>
                            {activePlatform === 'zoom' ? 'Zoom Stream' : 'Teams Link'}
                          </span>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-850 rounded-2xl rounded-tl-none shadow-xs">
                          <strong className="text-slate-900 dark:text-white font-sans text-xs block mb-1">{speaker}</strong>
                          <p className="text-slate-700 dark:text-slate-300 font-sans text-xs leading-relaxed">{dialogue}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={transcriptEndRef} />
                </div>
              )}
            </div>

            {/* HUD Status Bar footer */}
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Audio Sync Buffer: OK (0ms delay)</span>
              </div>
              <button 
                onClick={() => {
                  if (window.confirm(`Disconnect bot and discard this active ${activePlatform === 'zoom' ? 'Zoom' : 'Teams'} session? This will not save live notes.`)) {
                    setIsMeetingActive(false);
                  }
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold tracking-wider rounded-lg transition-colors uppercase"
              >
                Discard
              </button>
            </div>
          </div>

          {/* Right panel: Annotative Live minutes writer */}
          <div className="flex-1 flex flex-col h-1/2 md:h-full bg-white dark:bg-slate-950">
            <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {activePlatform === 'zoom' ? <Video className="w-4 h-4 text-blue-500" /> : <MessageSquare className="w-4 h-4 text-indigo-500" />}
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  Live {activePlatform === 'zoom' ? 'Zoom' : 'Teams'} Minutes Editor
                </h4>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-slate-400" /> Encryption: Office365 Vault
                </span>
              </div>
            </div>

            <textarea 
              className="flex-1 p-6 md:p-8 text-sm md:text-base text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:outline-none bg-transparent resize-none leading-relaxed"
              placeholder={`Type decisions, designated resolutions, task assignments, and annotations as the ${activePlatform === 'zoom' ? 'Zoom' : 'Teams'} conversation develops...`}
              value={meetingNote}
              onChange={(e) => setMeetingNote(e.target.value)}
            />

            <div className="p-4 md:p-6 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10 flex items-center justify-between gap-4">
              <div className="text-[11px] text-slate-400 select-none">
                Saving live session draft...
              </div>
              
              <button 
                onClick={handleSaveActiveSession}
                className={`flex items-center gap-2 px-6 py-3 text-white rounded-xl text-xs font-bold font-sans shadow-lg hover:scale-[1.01] transition-transform active:scale-95 text-center ${activePlatform === 'zoom' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/15' : 'bg-indigo-650 hover:bg-indigo-750 shadow-indigo-600/15'}`}
              >
                <Check className="w-4 h-4" /> Save Minutes & Disconnect BOT
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
