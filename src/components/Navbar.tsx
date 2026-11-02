import React from 'react';
import { User, ProjectSettings } from '../types';
import { Pickaxe, Bot, Shield, FileCode2, Wallet, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react';

interface NavbarProps {
  currentTab: 'miniapp' | 'bot' | 'admin' | 'contract';
  setCurrentTab: (tab: 'miniapp' | 'bot' | 'admin' | 'contract') => void;
  user: User | null;
  settings: ProjectSettings;
  onOpenWalletModal: () => void;
  onSwitchUser: (userId: string) => void;
  mobileFrame: boolean;
  setMobileFrame: (val: boolean) => void;
  onExitAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  settings,
  onOpenWalletModal,
  onSwitchUser,
  mobileFrame,
  setMobileFrame,
  onExitAdmin,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#0a0f1d]/90 backdrop-blur-md border-b border-cyan-500/20 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Network */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-400/40 shrink-0">
            <img src="/nbs-logo.jpg" alt="NBS Token" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-wide text-base sm:text-lg">
                {settings.tokenSymbol || 'TON'} Mining Protocol
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                TON Mainnet
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Telegram Bot & TEP-74 Jetton Ecosystem
            </p>
          </div>
        </div>

        {/* Mode Navigation Tabs */}
        <nav className="flex items-center p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-xs sm:text-sm font-medium">
          <button
            onClick={() => setCurrentTab('miniapp')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'miniapp'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Mini App</span>
          </button>

          <button
            onClick={() => setCurrentTab('bot')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'bot'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Bot Simulator</span>
          </button>

          <button
            onClick={() => setCurrentTab('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'admin'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin Hub</span>
          </button>

          <button
            onClick={() => setCurrentTab('contract')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'contract'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md shadow-amber-500/25 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>Jetton Studio</span>
          </button>
        </nav>

        {/* Right side: User Switcher & Wallet Status */}
        <div className="flex items-center gap-2">
          {currentTab === 'miniapp' && (
            <button
              onClick={() => setMobileFrame(!mobileFrame)}
              title="Toggle mobile device frame"
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                mobileFrame
                  ? 'bg-cyan-950 text-cyan-400 border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden md:inline">{mobileFrame ? 'Phone View' : 'Full View'}</span>
            </button>
          )}

          {/* Quick User Persona Switcher */}
          <select
            value={user?.id || 'user_demo'}
            onChange={(e) => onSwitchUser(e.target.value)}
            className="bg-slate-900 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="user_demo">👤 Demo Miner (Alex)</option>
            <option value="1878942455">👑 Owner Admin (Hamlet - 1878942455)</option>
            <option value="6653362852">👤 Miner (Rh.gm)</option>
            <option value="admin_999">🛡️ Chief Admin (Admin)</option>
          </select>

          {onExitAdmin && (
            <button
              onClick={onExitAdmin}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 transition-colors"
              title="Return to user Mini App"
            >
              خروج من الأدمن ✕
            </button>
          )}

          {/* Wallet Status / Connect Button */}
          <button
            onClick={onOpenWalletModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              user?.isWalletActivated
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                : user?.walletAddress
                ? 'bg-amber-950/70 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:brightness-110 shadow-md shadow-blue-500/20'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            {user?.isWalletActivated ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {user.walletAddress?.slice(0, 4)}...{user.walletAddress?.slice(-3)}
              </span>
            ) : user?.walletAddress ? (
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Pay 0.05 TON
              </span>
            ) : (
              <span>Connect TON</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
