import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { 
  Bell, BellOff, Volume2, Shield, LogOut, CheckCircle2, 
  Sparkles, FileText, Smartphone, Laptop, Check, Info, Lock, Calendar, HardDrive
} from 'lucide-react';
import { requestNotificationPermission, sendNotification, getNotificationPermission } from '../services/notificationService';

interface UserOptionsPopoverProps {
  user: User;
  onClose: () => void;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  isOpen: boolean;
  placement?: 'top' | 'bottom';
}

export const UserOptionsPopover: React.FC<UserOptionsPopoverProps> = ({
  user,
  onClose,
  onLogout,
  onUpdateUser,
  isOpen,
  placement = 'top',
}) => {
  const [notificationStatus, setNotificationStatus] = useState<string>('default');
  const [testSuccess, setTestSuccess] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);

  // Preference states stored in localStorage for seamless responsiveness
  const [audioFeedback, setAudioFeedback] = useState(() => 
    localStorage.getItem('pref_audio_feedback') !== 'false'
  );
  const [autoSaveTxt, setAutoSaveTxt] = useState(() => 
    localStorage.getItem('pref_autosave_txt') === 'true'
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => 
    localStorage.getItem('pref_notifications_enabled') !== 'false'
  );
  const [autoAssociateCalendar, setAutoAssociateCalendar] = useState(() => 
    localStorage.getItem('pref_auto_associate_calendar') === 'true'
  );
  const [autoUploadDrive, setAutoUploadDrive] = useState(() => 
    localStorage.getItem('pref_auto_upload_drive') === 'true'
  );

  const popoverRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check permission status on load
    const currentPermission = getNotificationPermission();
    setNotificationStatus(currentPermission);

    // Close when clicking outside of the popover content boundaries
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        popoverRef.current && 
        !popoverRef.current.contains(target) &&
        !target.closest('#user-profile-button') &&
        !target.closest('#user-profile-mobile-button') &&
        !target.closest('#user-options-popover')
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNotificationToggle = async () => {
    const newVal = !notificationsEnabled;
    setNotificationsEnabled(newVal);
    localStorage.setItem('pref_notifications_enabled', String(newVal));

    if (newVal) {
      // If turning ON, check browser permission
      const currentPermission = getNotificationPermission();
      if (currentPermission !== 'granted') {
        const granted = await requestNotificationPermission();
        const updatedPermission = getNotificationPermission();
        setNotificationStatus(updatedPermission);
        if (granted) {
          sendNotification(
            "Notifications Enabled!", 
            "Successfully connected push notifications in your Note Taker app."
          );
        } else if (updatedPermission === 'denied') {
          alert("Push notifications are currently blocked by browser preferences. To allow alerts, click the lock icon in the URL bar.");
        }
      } else {
        // Already granted, fire a nice notification to confirm
        sendNotification(
          "Notifications Enabled",
          "Note Taker will alert you here when meeting files are processed."
        );
      }
    }
  };

  const handleSendTestNotification = () => {
    const isPushActive = notificationsEnabled && notificationStatus === 'granted';
    if (!isPushActive) {
      alert("Please enable push notifications first to receive mock test alerts!");
      return;
    }
    
    setTestSuccess(true);
    sendNotification(
      "Instant Test Active", 
      "Success! Note Taker has access to push notifications. You are ready to close our tab safely during recordings."
    );
    setTimeout(() => setTestSuccess(false), 2500);
  };

  const toggleAudioFeedback = () => {
    const newVal = !audioFeedback;
    setAudioFeedback(newVal);
    localStorage.setItem('pref_audio_feedback', String(newVal));
    if (newVal) {
      // Simulate real short audio tone feedback
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }
  };

  const toggleAutoSaveTxt = () => {
    const newVal = !autoSaveTxt;
    setAutoSaveTxt(newVal);
    localStorage.setItem('pref_autosave_txt', String(newVal));
  };

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

  const handleLinkGoogle = async () => {
    if (isLinking || linkSuccess) return;
    setIsLinking(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLinking(false);
    setLinkSuccess(true);
    
    const updatedUser: User = {
      ...user,
      connectedAccounts: [
        ...(user.connectedAccounts || []),
        { provider: 'google', connected: true, email: user.email }
      ]
    };
    onUpdateUser(updatedUser);
  };

  const isGoogleLinked = user.connectedAccounts?.some(acc => acc.provider === 'google' && acc.connected);

  const isPushActive = notificationsEnabled && notificationStatus === 'granted';

  const placementClasses = placement === 'top'
    ? 'bottom-full left-0 mb-3 slide-in-from-bottom-3'
    : 'top-full right-0 mt-3 slide-in-from-top-3';

  return (
    <div ref={popoverRef} className={`absolute ${placementClasses} w-[310px] md:w-[320px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 select-none animate-in fade-in duration-200`} id="user-options-popover">
      
      {/* Popover Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-fs-primary to-emerald-600 rounded-full text-white font-bold flex items-center justify-center shadow-md shadow-fs-primary/15 uppercase text-sm">
            {user.email[0]}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate" id="popover-user-name">
              {user.email.split('@')[0]}
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate">
              {user.email}
            </p>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {user.role === UserRole.MANAGER ? 'Manager' : 'Board'}
          </span>
        </div>
      </div>

      {/* Options Body */}
      <div className="p-4 space-y-4 max-h-[380px] overflow-y-auto custom-scrollbar">
        
        {/* Push Notification Setting */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Push Notifications</span>
            </div>
            
            {/* Real custom styled toggle switch */}
            <button
              onClick={handleNotificationToggle}
              className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                notificationsEnabled ? 'bg-fs-primary' : 'bg-slate-200 dark:bg-slate-800'
              }`}
              aria-label="Toggle notifications"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] pl-6">
            <span className="text-slate-400 dark:text-slate-500">
              {!notificationsEnabled ? 'Status: Muted in App' :
               notificationStatus === 'granted' ? 'Status: Ready & Allowed' :
               notificationStatus === 'denied' ? 'Status: Blocked by Browser' :
               'Status: Tap to configure'}
            </span>
            {isPushActive && (
              <button
                onClick={handleSendTestNotification}
                disabled={testSuccess}
                className="text-[10px] font-bold text-blue-500 hover:text-blue-600 hover:underline cursor-pointer disabled:opacity-50"
              >
                {testSuccess ? 'Sent!' : 'Test alert'}
              </button>
            )}
          </div>
        </div>

        {/* Audio feedback on click */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tone Feedback</span>
            </div>
            
            <button
              onClick={toggleAudioFeedback}
              className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                audioFeedback ? 'bg-fs-primary' : 'bg-slate-200 dark:bg-slate-800'
              }`}
              aria-label="Toggle audio tones"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  audioFeedback ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 pl-6 leading-normal">
            Play quick audio cues when starting/stopping recorders.
          </p>
        </div>

        {/* Auto Export TXT settings */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Auto Save Minutes</span>
            </div>
            
            <button
              onClick={toggleAutoSaveTxt}
              className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoSaveTxt ? 'bg-fs-primary' : 'bg-slate-200 dark:bg-slate-800'
              }`}
              aria-label="Toggle auto txt download"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoSaveTxt ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 pl-6 leading-normal">
            Automatically local-save raw minutes into files post transcription.
          </p>
        </div>

        {/* Calendar Auto-Association Setting */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Calendar Auto-Title</span>
            </div>
            
            <button
              onClick={toggleAutoAssociateCalendar}
              className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoAssociateCalendar ? 'bg-fs-primary' : 'bg-slate-200 dark:bg-slate-800'
               }`}
              aria-label="Toggle calendar auto title association"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoAssociateCalendar ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 pl-6 leading-normal">
            Automatically name new recordings using scheduled meeting titles when a calendar integration is connected.
          </p>
        </div>

        {/* Google Drive Auto-Upload Setting */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Auto Drive Sync</span>
            </div>
            
            <button
              onClick={toggleAutoUploadDrive}
              className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoUploadDrive ? 'bg-fs-primary' : 'bg-slate-200 dark:bg-slate-800'
               }`}
              aria-label="Toggle auto sync with Google Drive"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoUploadDrive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 pl-6 leading-normal">
            Auto-upload notes and audio to "My Hurdles Notes" on completed recording.
          </p>
        </div>

        {/* Identity & Federated Login Status */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Federated Login</span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-500 font-bold">
              <Shield className="w-3.5 h-3.5" /> Secure
            </div>
          </div>

          {isGoogleLinked ? (
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold truncate max-w-[170px]">
                  Google connected
                </span>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          ) : (
            <button
              onClick={handleLinkGoogle}
              disabled={isLinking}
              className="w-full flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                  {isLinking ? 'Linking...' : 'Link Google Account'}
                </span>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            </button>
          )}

          {linkSuccess && (
            <div className="text-[10px] text-emerald-500 text-center animate-bounce mt-1">
              Google Connected successfully!
            </div>
          )}
        </div>
      </div>

      {/* Popover Footer */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between rounded-b-2xl">
        <div className="flex gap-1.5 text-[10px] text-slate-400 font-bold font-mono">
          <Laptop className="w-3.5 h-3.5" /> Local Agent
        </div>
        
        <button
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-450 border border-slate-200/50 dark:border-slate-800 hover:border-rose-100 dark:hover:border-rose-900/40 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>

    </div>
  );
};
