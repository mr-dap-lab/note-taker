import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Mail, ArrowRight, Loader2, ShieldCheck, X } from 'lucide-react';
import { GoogleAccountSelector } from './GoogleAccountSelector';

interface AuthScreenProps {
  onLogin: (user: User) => void;
  onCancel: () => void;
}

/**
 * Auth Screen Component
 * 
 * JUNIOR DEV NOTE:
 * This component mocks a "Passwordless" login flow (Email -> One Time Password).
 * In a real application, you would replace the simulated delays with actual API calls
 * to an identity provider like Auth0, Firebase Auth, or WorkOS.
 * 
 * Flow:
 * 1. User enters email -> System sends OTP (Mocked)
 * 2. User enters OTP -> System validates and returns token/user profile.
 */
export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onCancel }) => {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGoogleOpen, setIsGoogleOpen] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Simulate API network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    setStep('code');
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    // Simulate API network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate backend role assignment logic
    // For demo purposes: containing 'manager' makes you a manager
    const determinedRole = email.toLowerCase().includes('manager') 
        ? UserRole.MANAGER 
        : UserRole.BOARD_MEMBER;

    // Create the session object
    const user: User = {
        email,
        role: determinedRole,
        isAuthenticated: true
    };
    
    setLoading(false);
    onLogin(user);
  };

  return (
    <div className="fixed inset-0 z-50 min-h-screen bg-fs-dark/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden relative">
        
        {/* Close Button */}
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-full transition-colors z-10"
          title="Cancel login"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Branding Header */}
        <div className="bg-fs-darker p-8 text-center border-b border-slate-800">
             <div className="flex justify-center mb-4">
                 <div className="h-12 w-12 bg-gradient-to-br from-fs-primary to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-fs-primary/20 mb-2">
                   <span className="font-sans">H</span>
                 </div>
             </div>
             <div className="flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white tracking-tight">My Hurdles</span>
                <span className="text-sm text-slate-400 font-bold tracking-widest uppercase mt-1">Note Taker</span>
             </div>
             <p className="text-slate-500 text-xs mt-4">Secure recording companion for meetings</p>
        </div>

        <div className="p-8">
            {step === 'email' ? (
                <form onSubmit={handleSendCode} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-fs-primary focus:border-fs-primary text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                                placeholder="name@community.com"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="ml-2 w-4 h-4" /></>}
                    </button>
                    
                    <p className="text-xs text-center text-slate-400">
                        Powered by WorkOS Passwordless Auth
                    </p>

                    <div className="relative flex py-1 items-center text-slate-400 dark:text-slate-600">
                        <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                        <span className="flex-shrink mx-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">or</span>
                        <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsGoogleOpen(true)}
                        disabled={loading}
                        className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 active:scale-[0.98] hover:scale-[1.01] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-550 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                        </svg>
                        Continue with Google
                    </button>
                </form>
            ) : (
                <form onSubmit={handleVerifyCode} className="space-y-6">
                    <div className="text-center mb-6">
                        <div className="bg-green-50 dark:bg-green-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Check your email</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">We sent a verification code to <span className="font-medium text-slate-800 dark:text-slate-200">{email}</span></p>
                    </div>

                    <div>
                        <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Verification Code</label>
                        <input
                            id="code"
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="block w-full text-center tracking-[0.5em] text-2xl font-mono py-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-fs-primary focus:border-fs-primary bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                            placeholder="123456"
                            maxLength={6}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-fs-primary hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="mr-2 w-4 h-4" /> Verify & Login</>}
                    </button>
                    
                    <button 
                        type="button"
                        onClick={() => setStep('email')}
                        className="w-full text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                        Back to email
                    </button>
                </form>
            )}
        </div>
      </div>

      <GoogleAccountSelector
        isOpen={isGoogleOpen}
        onClose={() => setIsGoogleOpen(false)}
        onSelect={(user) => {
          setIsGoogleOpen(false);
          onLogin(user);
        }}
        userEmail="diego.avella@gmail.com"
      />
    </div>
  );
};