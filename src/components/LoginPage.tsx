import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Github, ShieldCheck } from 'lucide-react';
import { signInWithGoogle } from '../firebase';

interface LoginPageProps {
  onLogin: (email: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const user = await signInWithGoogle();
      if (user && user.email) {
        onLogin(user.email);
      } else {
        setError('Failed to get user email from Google.');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      // Give a helpful user-facing error message
      setError(err.message || 'Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Branding */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 mb-4"
          >
            <div className="bg-white text-slate-950 px-3 py-1 rounded-lg italic font-serif font-bold text-xl shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              LM
            </div>
            <h1 className="text-3xl font-bold tracking-tighter text-white">
              MODERNIZER
            </h1>
          </motion.div>
          <p className="text-slate-400 text-sm font-medium tracking-wide uppercase flex items-center justify-center gap-2">
            <Sparkles size={14} className="text-indigo-400" />
            Your Legacy Modernization Companion
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
          
          <div className="space-y-6">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="relative w-full h-14 bg-white text-slate-950 rounded-2xl font-semibold text-sm transition-all hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed group/btn overflow-hidden flex items-center justify-center gap-3"
            >
              {!isLoading && (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              <span className="relative z-10 flex items-center gap-2">
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-950 rounded-full animate-spin" />
                    <span>Connecting via Google...</span>
                  </>
                ) : (
                  <span>Sign in with Google</span>
                )}
              </span>
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Alternative Initializations</p>
            <button 
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-slate-950/50 border border-white/5 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-slate-900 transition-all group/gh"
            >
              <Github size={18} className="group-hover/gh:text-indigo-400 transition-colors" />
              SYNC WITH GITHUB
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-10 flex items-center justify-center gap-6 opacity-40">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white">Encrypted</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-white/20" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white">v2.4.0 Stable</span>
        </div>
      </motion.div>
    </div>
  );
}
