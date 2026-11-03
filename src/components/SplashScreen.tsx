import React, { useEffect, useState } from 'react';
import { Pickaxe, ShieldCheck, Zap, Activity } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
  isReady?: boolean; // When backend data is loaded, accelerates progress to 100%
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, isReady = false }) => {
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initializing NBS Quantum Rig...');

  useEffect(() => {
    const startTime = Date.now();
    const duration = 2200; // 2.2 seconds total smooth experience

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      let targetProgress = Math.min(100, Math.floor((elapsed / duration) * 100));

      if (isReady && targetProgress > 60) {
        // Accelerate to 100% if ready
        targetProgress = Math.min(100, targetProgress + 15);
      }

      setProgress((prev) => {
        const next = Math.max(prev, targetProgress);
        return next;
      });

      // Update status messages dynamically
      if (targetProgress < 25) {
        setStatusMessage('Initializing NBS Mining Rig...');
      } else if (targetProgress < 50) {
        setStatusMessage('Connecting to TON Blockchain Protocol...');
      } else if (targetProgress < 75) {
        setStatusMessage('Synchronizing Jetton NBS Smart Contract...');
      } else if (targetProgress < 95) {
        setStatusMessage('Loading Cloud Telemetry & Rig Balances...');
      } else {
        setStatusMessage('Ready! Opening NBS Mining Hub...');
      }

      if (targetProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          onFinish?.();
        }, 350);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [isReady, onFinish]);

  return (
    <div className="fixed inset-0 z-50 bg-[#040813] text-white flex flex-col items-center justify-between p-6 select-none overflow-hidden font-sans">
      {/* Ambient Cyber Neon Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-cyan-500/15 rounded-full blur-[110px] pointer-events-none" />

      {/* Top subtle TON mainnet badge */}
      <div className="pt-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-emerald-500/30 backdrop-blur-md shadow-lg shadow-emerald-950/40">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
            TON Mainnet • NBS Protocol
          </span>
        </div>
      </div>

      {/* Middle: Official Logo Image & App Name */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto space-y-5">
        {/* Glowing Official Token Logo Container */}
        <div className="relative group">
          {/* Animated Neon Rings */}
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-60 blur-md animate-pulse" />
          <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-emerald-400 to-green-500 opacity-80" />

          {/* Logo Image */}
          <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-emerald-300/80 shadow-2xl bg-black flex items-center justify-center">
            <img
              src="/nbs-logo.jpg"
              alt="NBS Token Logo"
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              onError={(e) => {
                // Fallback icon if logo fails to render
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {/* Fallback pickaxe badge */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-600 to-cyan-700 -z-10">
              <Pickaxe className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Small floating status emblem */}
          <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-slate-900 border-2 border-emerald-400 flex items-center justify-center shadow-lg">
            <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400 animate-bounce" />
          </div>
        </div>

        {/* App Title & Subtitle */}
        <div className="space-y-1.5">
          <h1 className="text-4xl md:text-5xl font-black tracking-wider bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-transparent drop-shadow-md">
            NBS
          </h1>
          <p className="text-xs md:text-sm font-semibold tracking-wide text-slate-300">
            Decentralized TON Cloud Mining Protocol
          </p>
        </div>
      </div>

      {/* Bottom: Professional Green Progress Bar with Dynamic Counter */}
      <div className="w-full max-w-sm relative z-10 space-y-3 pb-8">
        {/* Counter and Status Header */}
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            <span className="truncate max-w-[220px]">{statusMessage}</span>
          </div>
          <span className="font-mono font-black text-emerald-400 text-sm tracking-wider">
            {progress}%
          </span>
        </div>

        {/* The Green Progress Bar Track */}
        <div className="relative w-full h-3 rounded-full bg-slate-900/90 border border-emerald-500/30 p-0.5 overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] backdrop-blur-sm">
          {/* Active Emerald Green Glowing Fill */}
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-green-400 to-teal-300 transition-all duration-75 ease-out shadow-[0_0_15px_rgba(16,185,129,0.85)] relative"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer sweep animation over the green bar */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[pulse_1s_infinite]" />
          </div>
        </div>

        {/* Sub-footer copyright / security note */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 pt-2 font-medium">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>Verified TON Smart Contract • Non-Custodial Protocol</span>
        </div>
      </div>
    </div>
  );
};
