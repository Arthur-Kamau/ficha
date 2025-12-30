
import React, { useState } from 'react';
import { Shield, Lock, ChevronRight, Fingerprint } from 'lucide-react';

interface LockScreenProps {
  onUnlock: (password: string) => void;
  isError: boolean;
  isLoading?: boolean;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, isError, isLoading = false }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      onUnlock(password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <Shield className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">FICHA</h1>
          <p className="text-slate-400 text-center font-medium">Application Security Gateway</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">System Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter OS Admin Password"
                className={`w-full bg-slate-800/50 border ${isError ? 'border-red-500/50' : 'border-slate-700'} rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono`}
                autoFocus
              />
            </div>
            {isError && <p className="text-red-400 text-xs mt-1 ml-1">Invalid administrator credentials</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
          >
            {isLoading ? 'Authenticating...' : 'Unlock Shield'}
            {!isLoading && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-between text-slate-500 text-sm border-t border-slate-800 pt-6">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4" />
            <span>Biometric Ready</span>
          </div>
          <span className="text-xs">Ubuntu 22.04.4 LTS</span>
        </div>
      </div>
    </div>
  );
};

export default LockScreen;
