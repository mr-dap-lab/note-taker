import React, { useState } from 'react';
import { Mail, Users, FileCheck, Check, ArrowRight, X, Sparkles, Loader2 } from 'lucide-react';
import { Recording } from '../types';

interface WorkflowSelectorProps {
  recording: Recording;
  onClose: () => void;
}

type WorkflowType = 'email' | 'board' | 'arc' | null;

export const WorkflowSelector: React.FC<WorkflowSelectorProps> = ({ recording, onClose }) => {
  const [selected, setSelected] = useState<WorkflowType>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const handleSelect = async (type: WorkflowType) => {
    setSelected(type);
    setIsProcessing(true);
    
    // Simulate API workflow trigger
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    setIsProcessing(false);
    setIsFinished(true);
  };

  const workflows = [
    {
      id: 'email',
      title: 'Email me a summary',
      description: 'Receive a high-level overview of key decisions directly in your inbox.',
      icon: Mail,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      id: 'board',
      title: 'Distribute Board Report',
      description: 'Generate a detailed PDF report and share it with all verified board members.',
      icon: Users,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      id: 'arc',
      title: 'Generate ARC Letters',
      description: 'Draft approval or rejection letters for architectural requests discussed.',
      icon: FileCheck,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    }
  ];

  if (isFinished) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 text-center shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-fs-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-fs-primary" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Workflow Initiated!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">
            The requested task has been added to our automation queue. You'll receive a notification once it's finalized.
          </p>
          <button 
            onClick={onClose}
            className="w-full py-4 bg-fs-dark dark:bg-slate-700 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg"
          >
            CONTINUE TO ARCHIVE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-8 duration-500">
        
        {/* Header */}
        <div className="p-8 pb-4 text-center">
            <div className="flex justify-center mb-4">
                <div className="bg-fs-primary/10 p-3 rounded-2xl">
                    <Sparkles className="w-6 h-6 text-fs-primary" />
                </div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Recording Saved! What's next?</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Choose an automated workflow for <span className="font-bold text-slate-700 dark:text-slate-200">{recording.title}</span>.</p>
        </div>

        {/* Workflow Grid */}
        <div className="p-8 pt-0 space-y-3">
          {workflows.map((wf) => (
            <button
              key={wf.id}
              disabled={isProcessing}
              onClick={() => handleSelect(wf.id as WorkflowType)}
              className={`w-full group flex items-start gap-4 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-left transition-all ${
                isProcessing && selected === wf.id 
                  ? 'bg-fs-primary/5 border-fs-primary' 
                  : 'bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:border-slate-200 dark:hover:border-slate-700'
              }`}
            >
              <div className={`p-3 rounded-xl ${wf.bgColor} ${wf.color} flex-shrink-0 transition-transform group-hover:scale-110`}>
                {isProcessing && selected === wf.id ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <wf.icon className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">{wf.title}</h3>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-fs-primary transition-colors" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {wf.description}
                </p>
              </div>
            </button>
          ))}

          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="w-full mt-4 py-3 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-[0.2em] transition-colors"
          >
            Skip for now
          </button>
        </div>

        {/* Footer Hint */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-fs-primary" />
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Powered by Gemini Board Intelligence</span>
        </div>
      </div>
    </div>
  );
};