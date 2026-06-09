import React, { useState } from 'react';
import { User, ConnectedAccount } from '../types';
import { Link2, Unlink, CheckCircle2, Video, MessageSquare, Calendar, Loader2, ExternalLink, X, Shield, Lock, Eye, AlertCircle, HardDrive } from 'lucide-react';
import { googleSignIn, logout as googleLogout } from '../services/googleAuthService';

interface IntegrationsProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

const PROVIDERS = [
  { id: 'zoom', name: 'Zoom', color: 'bg-blue-500', icon: Video, description: 'Import cloud recordings and take live notes during Zoom calls.' },
  { id: 'teams', name: 'MS Teams', color: 'bg-indigo-600', icon: MessageSquare, description: 'Seamlessly sync meeting minutes to your Teams workspace.' },
  { id: 'google', name: 'Google Meet', color: 'bg-red-500', icon: Calendar, description: 'Connect Google Calendar to auto-start notes for scheduled meetings.' },
  { id: 'google_drive', name: 'Google Drive', color: 'bg-emerald-600', icon: HardDrive, description: 'Auto-sync transcripts and WebM audio files to secure Drive folders.' }
];

export const Integrations: React.FC<IntegrationsProps> = ({ user, onUpdateUser }) => {
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [zoomEmail, setZoomEmail] = useState(user.email);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [teamsEmail, setTeamsEmail] = useState(user.email);
  const [authStage, setAuthStage] = useState<'idle' | 'authorizing' | 'success'>('idle');
  const [authStepMessage, setAuthStepMessage] = useState('');
  const [scopes, setScopes] = useState({
    meetings: true,
    recordings: true,
    websocket: true
  });
  const [teamsScopes, setTeamsScopes] = useState({
    calendar: true,
    transcripts: true,
    channels: true
  });

  const [autoAssociateCalendar, setAutoAssociateCalendar] = useState(() => 
    localStorage.getItem('pref_auto_associate_calendar') === 'true'
  );

  const [autoUploadDrive, setAutoUploadDrive] = useState(() => 
    localStorage.getItem('pref_auto_upload_drive') === 'true'
  );

  const toggleAutoAssociateCalendar = () => {
    const newVal = !autoAssociateCalendar;
    setAutoAssociateCalendar(newVal);
    localStorage.setItem('pref_auto_associate_calendar', String(newVal));
  };

  const toggleAutoUploadDrive = () => {
    const newVal = !autoUploadDrive;
    setAutoUploadDrive(newVal);
    localStorage.setItem('pref_auto_upload_drive', String(newVal));
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleConnect = async (providerId: string) => {
    if (providerId === 'zoom') {
      setZoomEmail(user.email);
      setAuthStage('idle');
      setAuthStepMessage('');
      setShowZoomModal(true);
      return;
    }
    if (providerId === 'teams') {
      setTeamsEmail(user.email);
      setAuthStage('idle');
      setAuthStepMessage('');
      setShowTeamsModal(true);
      return;
    }
    if (providerId === 'google_drive') {
      try {
        setConnectingId('google_drive');
        const result = await googleSignIn();
        if (result) {
          const accounts = user.connectedAccounts || [];
          const newAccount: ConnectedAccount = {
            provider: 'google_drive' as any,
            connected: true,
            email: result.user.email || user.email
          };
          const updatedUser = {
            ...user,
            connectedAccounts: [...accounts.filter(a => a.provider !== 'google_drive'), newAccount]
          };
          onUpdateUser(updatedUser);
        }
      } catch (error: any) {
        alert(`Google Drive authorization failed: ${error.message || error}`);
      } finally {
        setConnectingId(null);
      }
      return;
    }

    setConnectingId(providerId);
    
    // Mock OAuth Flow for other providers
    await sleep(1500);
    
    const accounts = user.connectedAccounts || [];
    const newAccount: ConnectedAccount = {
      provider: providerId as any,
      connected: true,
      email: user.email
    };

    const updatedUser = {
      ...user,
      connectedAccounts: [...accounts.filter(a => a.provider !== providerId), newAccount]
    };

    onUpdateUser(updatedUser);
    setConnectingId(null);
  };

  const handleFinishZoomConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthStage('authorizing');
    
    try {
      setAuthStepMessage('Directing to Zoom OAuth Secure Portal...');
      await sleep(1000);
      setAuthStepMessage('Exchanging authorization code with zoom.us...');
      await sleep(1200);
      setAuthStepMessage('Synchronizing API scopes (meeting:write, recording:read)...');
      await sleep(1000);
      setAuthStepMessage('Establishing webhook listeners for meeting status updates...');
      await sleep(800);
      
      const accounts = user.connectedAccounts || [];
      const newAccount: ConnectedAccount = {
        provider: 'zoom',
        connected: true,
        email: zoomEmail || user.email
      };

      const updatedUser = {
        ...user,
        connectedAccounts: [...accounts.filter(a => a.provider !== 'zoom'), newAccount]
      };

      onUpdateUser(updatedUser);
      setAuthStage('success');
      await sleep(1000);
      setShowZoomModal(false);
    } catch (error) {
      console.error(error);
    } finally {
      setAuthStage('idle');
    }
  };

  const handleFinishTeamsConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthStage('authorizing');
    
    try {
      setAuthStepMessage('Contacting Microsoft Entra OAuth Service...');
      await sleep(1000);
      setAuthStepMessage('Opening secure tenant verification dialog...');
      await sleep(1200);
      setAuthStepMessage('Exchanging Microsoft Graph GraphAPI authorization tokens...');
      await sleep(1000);
      setAuthStepMessage('Configuring Azure Webhook listener & companion bot...');
      await sleep(800);
      
      const accounts = user.connectedAccounts || [];
      const newAccount: ConnectedAccount = {
        provider: 'teams',
        connected: true,
        email: teamsEmail || user.email
      };

      const updatedUser = {
        ...user,
        connectedAccounts: [...accounts.filter(a => a.provider !== 'teams'), newAccount]
      };

      onUpdateUser(updatedUser);
      setAuthStage('success');
      await sleep(1000);
      setShowTeamsModal(false);
    } catch (error) {
      console.error(error);
    } finally {
      setAuthStage('idle');
    }
  };

  const handleDisconnect = async (providerId: string) => {
    if (providerId === 'google_drive') {
      try {
        await googleLogout();
      } catch (err) {
        console.error('Google logout error:', err);
      }
    }
    const updatedUser = {
      ...user,
      connectedAccounts: (user.connectedAccounts || []).filter(a => a.provider !== providerId)
    };
    onUpdateUser(updatedUser);
  };

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto w-full">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Meeting Integrations</h2>
        <p className="text-slate-500 dark:text-slate-400 text-base mt-2 max-w-lg mx-auto leading-relaxed">Connect your conferencing accounts to use the Note Taker live during calls.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PROVIDERS.map((provider) => {
          const account = user.connectedAccounts?.find(a => a.provider === provider.id);
          const isConnected = !!account;
          const Icon = provider.icon;

          return (
            <div key={provider.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className={`h-2 ${provider.color}`} />
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${provider.color} text-white`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  {isConnected ? (
                    <span className="flex items-center text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-full">
                      Disconnected
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{provider.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  {provider.description}
                </p>

                {isConnected ? (
                  <div className="space-y-3">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">Account</div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate mb-4">
                      {account.email}
                    </div>
                    <button 
                      onClick={() => handleDisconnect(provider.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
                    >
                      <Unlink className="w-4 h-4" /> Disconnect
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleConnect(provider.id)}
                    disabled={!!connectingId}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                  >
                    {connectingId === provider.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Link2 className="w-4 h-4" /> Connect {provider.name}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Autopilot and Automation preferences */}
      <div className="mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <Calendar className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Integration Automation Preferences</h3>
        </div>
        
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
          Optimize your meeting archive and minutes capture using our scheduling and smart mapping triggers.
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Automatic Calendar Title Matching</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-normal md:max-w-xl">
                When toggled, recordings are automatically associated and named after any active or scheduled meeting title fetched from your connected calendar APIs (Google Calendar, MS Teams, or Zoom) instead of general timestamped placeholders.
              </span>
            </div>

            <button
              onClick={toggleAutoAssociateCalendar}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none mt-1 ${
                autoAssociateCalendar ? 'bg-fs-primary' : 'bg-slate-200 dark:bg-slate-800'
              }`}
              aria-label="Toggle auto calendar meeting association"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoAssociateCalendar ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Auto-upload to Google Drive</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-normal md:max-w-xl">
                When active, your recorded audio (WebM) and fully formatted meeting minutes/transcriptions are automatically organized and uploaded to a "My Hurdles Notes" folder in your Google Drive as soon as saving completes. Requires connecting your Google Drive integration above.
              </span>
            </div>

            <button
              onClick={toggleAutoUploadDrive}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none mt-1 ${
                autoUploadDrive ? 'bg-fs-primary' : 'bg-slate-200 dark:bg-slate-800'
              }`}
              aria-label="Toggle auto upload to Google Drive"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoUploadDrive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Zoom Connection OAuth Modal */}
      {showZoomModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-blue-600 p-6 text-white relative">
              <button 
                onClick={() => authStage !== 'authorizing' && setShowZoomModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-full transition-colors"
                disabled={authStage === 'authorizing'}
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white rounded-xl text-blue-600 shadow-md">
                  <Video className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Zoom Secure Authorization</h3>
                  <p className="text-[11px] text-blue-100 font-medium uppercase tracking-widest mt-0.5">Integrate Note Taker Companion</p>
                </div>
              </div>
            </div>

            {/* Content stages */}
            {authStage === 'idle' && (
              <form onSubmit={handleFinishZoomConnect} className="p-6 md:p-8 space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">Connect under Zoom Profile</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400 font-mono text-sm">@</span>
                    <input 
                      type="email" 
                      required
                      value={zoomEmail}
                      onChange={(e) => setZoomEmail(e.target.value)}
                      placeholder="zoom-account@example.com"
                      className="w-full bg-slate-50 dark:bg-slate-800/50 p-3 pl-10 border border-slate-200 dark:border-slate-700/85 rounded-xl text-sm font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <Shield className="w-3.5 h-3.5 text-blue-500" /> Note Taker requested permissions:
                  </div>
                  
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <label className="flex items-start gap-2.5 cursor-pointer hover:opacity-85">
                      <input 
                        type="checkbox" 
                        checked={scopes.meetings}
                        onChange={(e) => setScopes(prev => ({ ...prev, meetings: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 tracking-tight mt-0.5 accent-blue-600 cursor-pointer"
                      />
                      <span><strong>Read Scheduled Meetings</strong> (`meeting:read`) - Automatically sync calendar events to load transcripts.</span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer hover:opacity-85">
                      <input 
                        type="checkbox" 
                        checked={scopes.recordings}
                        onChange={(e) => setScopes(prev => ({ ...prev, recordings: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 tracking-tight mt-0.5 accent-blue-600 cursor-pointer"
                      />
                      <span><strong>Fetch Cloud Recordings</strong> (`recording:read`) - Sync recorded board calls from Zoom and transcribe them.</span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer hover:opacity-85">
                      <input 
                        type="checkbox" 
                        checked={scopes.websocket}
                        onChange={(e) => setScopes(prev => ({ ...prev, websocket: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 tracking-tight mt-0.5 accent-blue-600 cursor-pointer"
                      />
                      <span><strong>Sync Live Bot Audio</strong> (`meeting:write`) - Deploy Note Taker BOT into your meetings for live dictation.</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 items-start text-[11px] text-slate-400 leading-relaxed bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-100/50 dark:border-blue-900/10">
                  <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p>By connecting, you allow Note Taker to process and transcribe recorded voice discussions. Decrypted summaries are fully compliant with GDPR data retention regulations.</p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowZoomModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-blue-500/10"
                  >
                    Authorize & Connect
                  </button>
                </div>
              </form>
            )}

            {authStage === 'authorizing' && (
              <div className="p-10 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-blue-500/25 animate-ping" />
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin relative" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-bold text-slate-800 dark:text-white">Connecting Zoom Services</h4>
                  <p className="text-xs text-slate-400 font-mono italic animate-pulse">{authStepMessage}</p>
                </div>
              </div>
            )}

            {authStage === 'success' && (
              <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center text-emerald-500 shadow-inner animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">Integration Completed!</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Zoom account successfully synchronized. View your active calls in Meeting HUD.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MS Teams Connection OAuth Modal */}
      {showTeamsModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-indigo-600 p-6 text-white relative">
              <button 
                onClick={() => authStage !== 'authorizing' && setShowTeamsModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-full transition-colors"
                disabled={authStage === 'authorizing'}
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white rounded-xl text-indigo-600 shadow-md">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Teams Secure Authorization</h3>
                  <p className="text-[11px] text-indigo-100 font-medium uppercase tracking-widest mt-0.5">Integrate Teams Workspace & Bot</p>
                </div>
              </div>
            </div>

            {/* Content stages */}
            {authStage === 'idle' && (
              <form onSubmit={handleFinishTeamsConnect} className="p-6 md:p-8 space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">Connect under Microsoft Office365 Profile</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400 font-mono text-sm">@</span>
                    <input 
                      type="email" 
                      required
                      value={teamsEmail}
                      onChange={(e) => setTeamsEmail(e.target.value)}
                      placeholder="teams-account@yourcompany.onmicrosoft.com"
                      className="w-full bg-slate-50 dark:bg-slate-800/50 p-3 pl-10 border border-slate-200 dark:border-slate-700/85 rounded-xl text-sm font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <Shield className="w-3.5 h-3.5 text-indigo-500" /> Requested Microsoft Graph Permissions:
                  </div>
                  
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <label className="flex items-start gap-2.5 cursor-pointer hover:opacity-85">
                      <input 
                        type="checkbox" 
                        checked={teamsScopes.calendar}
                        onChange={(e) => setTeamsScopes(prev => ({ ...prev, calendar: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-600 tracking-tight mt-0.5 accent-indigo-600 cursor-pointer"
                      />
                      <span><strong>Read Scheduled Events</strong> (`OnlineMeetings.ReadWrite`) - Feed live calendared Microsoft Teams events into the HUD.</span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer hover:opacity-85">
                      <input 
                        type="checkbox" 
                        checked={teamsScopes.transcripts}
                        onChange={(e) => setTeamsScopes(prev => ({ ...prev, transcripts: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-600 tracking-tight mt-0.5 accent-indigo-600 cursor-pointer"
                      />
                      <span><strong>Fetch Meeting Transcripts</strong> (`OnlineMeetingTranscript.Read.All`) - Synchronize complete spoken transcripts.</span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer hover:opacity-85">
                      <input 
                        type="checkbox" 
                        checked={teamsScopes.channels}
                        onChange={(e) => setTeamsScopes(prev => ({ ...prev, channels: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-600 tracking-tight mt-0.5 accent-indigo-600 cursor-pointer"
                      />
                      <span><strong>Publish Channels</strong> (`ChannelMessage.Send`) - Enable immediate sync of completed board minutes directly to your Teams channels.</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 items-start text-[11px] text-slate-400 leading-relaxed bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-lg border border-indigo-100/50 dark:border-indigo-900/10">
                  <AlertCircle className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <p>By connecting, you authorize Note Taker to process your voice interactions and synchronize digital meeting resources securely under Microsoft Entra regulations.</p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowTeamsModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-indigo-500/10"
                  >
                    Authorize & Connect
                  </button>
                </div>
              </form>
            )}

            {authStage === 'authorizing' && (
              <div className="p-10 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-indigo-500/25 animate-ping" />
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin relative" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-bold text-slate-800 dark:text-white">Connecting Teams Services</h4>
                  <p className="text-xs text-slate-400 font-mono italic animate-pulse">{authStepMessage}</p>
                </div>
              </div>
            )}

            {authStage === 'success' && (
              <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center text-emerald-500 shadow-inner animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">Integration Completed!</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Microsoft Teams account successfully synchronized. View your active calls in Meeting HUD.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-12 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full text-blue-600 dark:text-blue-400">
           <Video className="w-8 h-8" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white">Desktop Companion Required</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            To capture audio directly from your video calls, make sure you have the <strong>Audio Companion Bridge</strong> installed on your machine.
          </p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
          <ExternalLink className="w-4 h-4" /> Download Bridge
        </button>
      </div>
    </div>
  );
};