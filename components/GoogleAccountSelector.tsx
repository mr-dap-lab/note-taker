import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { X, User as UserIcon, LogIn, ArrowLeft } from 'lucide-react';

interface GoogleAccountSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (user: User) => void;
  userEmail: string; // From metadata user email
}

export const GoogleAccountSelector: React.FC<GoogleAccountSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  userEmail,
}) => {
  const [view, setView] = useState<'select' | 'custom'>('select');
  const [customEmail, setCustomEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState('');

  if (!isOpen) return null;

  // Set default mock accounts
  const defaultAccounts = [
    {
      name: 'Diego Avella',
      email: userEmail || 'diego.avella@gmail.com',
      avatarColor: 'bg-blue-500',
      initials: 'DA',
      role: UserRole.BOARD_MEMBER,
    },
    {
      name: 'Board Member Support',
      email: 'board-member@community.com',
      avatarColor: 'bg-emerald-500',
      initials: 'BM',
      role: UserRole.BOARD_MEMBER,
    },
    {
      name: 'Manager Test Agent',
      email: 'manager-test@community.com',
      avatarColor: 'bg-indigo-600',
      initials: 'MT',
      role: UserRole.MANAGER,
    }
  ];

  const handleAccountSelect = async (email: string, role: UserRole) => {
    setIsLoading(true);
    setSelectedEmail(email);
    // Simulate real Google redirect-like authorization lag
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsLoading(false);

    const user: User = {
      email,
      role,
      isAuthenticated: true,
      connectedAccounts: [
        { provider: 'google', connected: true, email }
      ]
    };
    onSelect(user);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) return;

    if (!customEmail.includes('@') || !customEmail.includes('.')) {
      setError('Please enter a valid Google Account email.');
      return;
    }

    setError('');
    setIsLoading(true);
    setSelectedEmail(customEmail);
    // Simulate auth network lag
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);

    const determinedRole = customEmail.toLowerCase().includes('manager')
      ? UserRole.MANAGER
      : UserRole.BOARD_MEMBER;

    const user: User = {
      email: customEmail,
      role: determinedRole,
      isAuthenticated: true,
      connectedAccounts: [
        { provider: 'google', connected: true, email: customEmail }
      ]
    };
    onSelect(user);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
        
        {/* Animated Google Progress Bar if Loading */}
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-blue-500 animate-infinite-loading rounded-full"></div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-full transition-colors"
          title="Back"
          disabled={isLoading}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Google Branding Header */}
        <div className="p-8 pb-4 text-center">
          <div className="flex justify-center mb-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white font-sans">
            {isLoading ? 'Signing in with Google...' : 'Choose an account'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            to continue to <span className="font-semibold text-slate-700 dark:text-slate-200">Note Taker</span>
          </p>
        </div>

        {/* Loading overlay view helper */}
        {isLoading ? (
          <div className="px-8 py-12 flex flex-col items-center justify-center space-y-4">
            <div className="h-10 w-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 animate-pulse font-mono">{selectedEmail}</p>
          </div>
        ) : view === 'select' ? (
          /* Selection View */
          <div className="px-8 pb-8 space-y-4">
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {defaultAccounts.map((account) => (
                <button
                  key={account.email}
                  onClick={() => handleAccountSelect(account.email, account.role)}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${account.avatarColor} text-white font-bold flex items-center justify-center text-xs shadow-sm`}>
                      {account.initials}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                        {account.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {account.email}
                      </p>
                    </div>
                  </div>
                  <LogIn className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            <button
              onClick={() => { setView('custom'); setError(''); }}
              className="w-full flex items-center gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 hover:border-slate-400 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                <UserIcon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Use another account
              </span>
            </button>

            {/* Google Terms Note */}
            <div className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-6">
              To continue, Google will share your name, email address, language preference, and profile picture with Note Taker. Before using this app, you can review its{' '}
              <a href="#" className="text-blue-500 hover:underline">privacy policy</a> and{' '}
              <a href="#" className="text-blue-500 hover:underline">terms of service</a>.
            </div>
          </div>
        ) : (
          /* Custom Email Input View */
          <div className="px-8 pb-8">
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => setView('select')}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mb-4"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to choices
                </button>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Google Account Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {error && (
                <div className="text-xs text-rose-500 leading-relaxed mt-1">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setView('select')}
                  className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                  Next
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
