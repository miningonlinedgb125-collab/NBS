import React, { useState, useEffect } from 'react';
import { User, ProjectSettings } from '../../types';
import { calculateMiningProgress } from '../../engines/mining';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Pickaxe,
  Flame,
  Zap,
  Clock,
  Sparkles,
  Award,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';

interface MiningViewProps {
  user: User;
  settings: ProjectSettings;
  onRefreshUser: () => void;
  onOpenWalletModal: () => void;
  onNavigateTab: (tab: string) => void;
}

export const MiningView: React.FC<MiningViewProps> = ({
  user,
  settings,
  onRefreshUser,
  onOpenWalletModal,
  onNavigateTab,
}) => {
  const { t } = useLanguage();
  const [now, setNow] = useState(Date.now());
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Tick every second for smooth timer and accumulator
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const progress = calculateMiningProgress(
    user.miningState,
    settings.baseMiningDailyReward,
    user.subscription,
    now
  );

  const formatCountdown = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '00:00:00';
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartMining = async () => {
    setIsActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/mining/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to start mining');
      }
      setActionSuccess('24-Hour Mining Cycle Started!');
      onRefreshUser();
    } catch (err: any) {
      setActionError(err.message || 'Error starting mining');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleClaimMining = async () => {
    setIsActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/mining/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to claim reward');
      }
      const amount = data.reward ?? data.claimedAmount ?? 0;
      setActionSuccess(`+${amount} ${settings.tokenSymbol} ${t('claimedBadge') || 'تم استلام المكافأة بنجاح!'}`);
      onRefreshUser();
    } catch (err: any) {
      setActionError(err.message || 'Error claiming reward');
    } finally {
      setIsActionLoading(false);
    }
  };

  const streakBoostPercent = user.miningState.streakDays * 2;
  const isMiningActive = user.miningState.isMining && !progress.isFinished;
  const canClaim = user.miningState.isMining && progress.isFinished;

  return (
    <div className="space-y-6 pb-20">
      {/* Wallet Activation Alert Banner */}
      {!user.isWalletActivated && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/40 border border-amber-500/40 flex items-center justify-between gap-3 shadow-lg shadow-amber-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-200">
                {t('walletActivationAlertTitle')}
              </p>
              <p className="text-[11px] text-slate-400">
                {t('walletActivationAlertDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={onOpenWalletModal}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 hover:brightness-110 text-black font-bold text-xs shrink-0 flex items-center gap-1 shadow-md shadow-amber-500/20"
          >
            {t('activateNowBtn')}
            <ArrowRight className="w-3 h-3 rtl:rotate-180" />
          </button>
        </div>
      )}

      {/* Hero Core Mining Rig Card */}
      <div className="relative rounded-3xl bg-gradient-to-b from-[#111a33] to-[#0a0f1e] border border-cyan-500/30 p-6 shadow-2xl shadow-cyan-950/60 overflow-hidden text-center">
        {/* Ambient background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-48 h-24 bg-blue-600/15 blur-2xl pointer-events-none" />

        {/* Top badges */}
        <div className="flex items-center justify-between mb-4 text-xs">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            {isMiningActive ? t('miningInProgress') : canClaim ? t('readyToClaim') : t('rigStandby')}
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-[11px]">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              {t('streakLabel')} {user.miningState.streakDays}{t('streakDay')} (+{streakBoostPercent}%)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold text-[11px]">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              {user.subscription.multiplier}x {user.subscription.name}
            </span>
          </div>
        </div>

        {/* Pulsing Visual Mining Ring Core */}
        <div className="relative my-6 flex items-center justify-center">
          <div
            className={`w-52 h-52 rounded-full border border-cyan-500/20 flex items-center justify-center transition-all ${
              isMiningActive ? 'animate-spin' : ''
            }`}
            style={{ animationDuration: '24s' }}
          >
            <div className="w-44 h-44 rounded-full border border-dashed border-cyan-400/30" />
          </div>

          {/* Central Mining Sphere with NBS Token Emblem */}
          <div className="absolute flex flex-col items-center justify-center w-36 h-36 rounded-full overflow-hidden shadow-2xl shadow-cyan-500/40 p-2 text-white border-2 border-cyan-400/60 group">
            <img
              src="/nbs-logo.jpg"
              alt="NBS Token Emblem"
              className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${
                isMiningActive ? 'scale-105 brightness-110' : 'brightness-90'
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-cyan-950/40" />

            <div className="relative z-10 flex flex-col items-center">
              <Pickaxe
                className={`w-7 h-7 text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] ${
                  isMiningActive ? 'animate-bounce' : ''
                }`}
              />
              <div className="mt-1 font-mono font-bold text-xs text-white drop-shadow-md">
                {isMiningActive
                  ? formatCountdown(progress.secondsRemaining)
                  : canClaim
                  ? t('cycleDone')
                  : '24:00:00'}
              </div>
              <div className="text-[10px] text-cyan-300 uppercase tracking-widest font-extrabold drop-shadow">
                {isMiningActive ? `${progress.progressPercent.toFixed(0)}%` : t('hoursRemaining')}
              </div>
            </div>
          </div>
        </div>

        {/* Live Reward Accumulator */}
        <div className="space-y-1 my-4">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">
            {isMiningActive ? t('accumulatedRewardRealtime') : t('expectedCycleReward')}
          </div>
          <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-blue-300 flex items-center justify-center gap-1.5 font-mono">
            <span>
              {isMiningActive
                ? progress.accumulatedAmount.toFixed(2)
                : progress.expectedTotalReward.toFixed(2)}
            </span>
            <span className="text-lg text-cyan-400">{settings.tokenSymbol}</span>
          </div>
          <p className="text-xs text-slate-400">
            {t('targetPerDay')} ~{progress.expectedTotalReward} {settings.tokenSymbol} (Base {settings.baseMiningDailyReward} × {user.subscription.multiplier}x + {streakBoostPercent}%)
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-900/90 rounded-full h-2.5 p-0.5 border border-slate-800 mb-6 overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500 shadow-sm shadow-cyan-400"
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>

        {/* Action Button: Start / Claim / In-Progress */}
        <div className="space-y-2">
          {canClaim ? (
            <button
              onClick={handleClaimMining}
              disabled={isActionLoading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 active:scale-[0.99] text-white font-extrabold text-base shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all animate-pulse"
            >
              <Sparkles className="w-5 h-5" />
              {isActionLoading ? '...' : `${t('claimMiningBtn')} (+${progress.expectedTotalReward} ${settings.tokenSymbol})`}
            </button>
          ) : isMiningActive ? (
            <button
              disabled
              className="w-full py-3.5 px-6 rounded-2xl bg-slate-800/80 border border-cyan-500/30 text-cyan-300 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <Clock className="w-4 h-4 animate-spin" />
              {t('miningInProgress')} ({formatCountdown(progress.secondsRemaining)})
            </button>
          ) : (
            <button
              onClick={handleStartMining}
              disabled={isActionLoading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 active:scale-[0.99] text-white font-extrabold text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <Pickaxe className="w-5 h-5" />
              {isActionLoading ? '...' : t('startMiningBtn')}
            </button>
          )}

          {actionSuccess && (
            <p className="text-xs text-emerald-400 font-medium">{actionSuccess}</p>
          )}
          {actionError && <p className="text-xs text-rose-400 font-medium">{actionError}</p>}
        </div>
      </div>

      {/* Grid of Miner Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#0d1424] border border-slate-800/80 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            {t('baseRateLabel')}
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {settings.baseMiningDailyReward} <span className="text-xs text-cyan-400">{settings.tokenSymbol}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{t('every24h')}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0d1424] border border-slate-800/80 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            {t('streakBonus')}
          </div>
          <div className="text-lg font-bold text-amber-300 mt-1">
            +{streakBoostPercent}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{t('streakLabel')} {user.miningState.streakDays}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0d1424] border border-slate-800/80 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            {t('tierMultiplier')}
          </div>
          <div className="text-lg font-bold text-purple-300 mt-1">
            {user.subscription.multiplier}x
          </div>
          <button
            onClick={() => onNavigateTab('plans')}
            className="text-[10px] text-purple-400 hover:underline mt-0.5 text-left rtl:text-right font-medium"
          >
            {t('upgradeTierBtn')}
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0d1424] border border-slate-800/80 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            {t('lifetimeMinedLabel')}
          </div>
          <div className="text-lg font-bold text-emerald-300 mt-1">
            {user.balances.miningEarned.toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{t('totalClaimed')}</div>
        </div>
      </div>

      {/* Quick Access Action Bar */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigateTab('tasks')}
          className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-[#121b36] border border-slate-800 hover:border-cyan-500/40 text-left rtl:text-right transition-all group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-white group-hover:text-cyan-300">
              {t('completeTasksCardTitle')}
            </span>
            <span className="text-xs text-cyan-400 rtl:rotate-180">→</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {t('completeTasksCardDesc')}
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('referrals')}
          className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-[#121b36] border border-slate-800 hover:border-blue-500/40 text-left rtl:text-right transition-all group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-white group-hover:text-blue-300">
              {t('inviteFriendsCardTitle')}
            </span>
            <span className="text-xs text-blue-400 rtl:rotate-180">→</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {t('inviteFriendsCardDesc')}
          </p>
        </button>
      </div>
    </div>
  );
};
