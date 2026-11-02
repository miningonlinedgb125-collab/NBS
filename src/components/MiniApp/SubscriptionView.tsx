import React, { useState } from 'react';
import { User, ProjectSettings, SubscriptionTier } from '../../types';
import { DEFAULT_SUBSCRIPTION_TIERS } from '../../engines/subscriptions';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Zap,
  Check,
  Crown,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface SubscriptionViewProps {
  user: User;
  settings: ProjectSettings;
  onRefreshUser: () => void;
  onOpenWalletModal: () => void;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  user,
  settings,
  onRefreshUser,
  onOpenWalletModal,
}) => {
  const { t } = useLanguage();
  const [duration, setDuration] = useState<1 | 3 | 12>(1);
  const [purchasingTierId, setPurchasingTierId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async (tier: SubscriptionTier) => {
    if (!user.isWalletActivated) {
      onOpenWalletModal();
      return;
    }

    setPurchasingTierId(tier.id);
    setFeedback(null);
    setError(null);

    try {
      const res = await fetch('/api/subscriptions/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          tierId: tier.id,
          durationMonths: duration,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Subscription failed');
      }
      setFeedback(data.message || 'Subscription upgraded successfully!');
      onRefreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to complete subscription upgrade');
    } finally {
      setPurchasingTierId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
          <Crown className="w-3.5 h-3.5 text-purple-400" />
          {t('vipAcceleratorBadge')}
        </div>
        <h2 className="text-2xl font-black text-white">{t('upgradeMiningTitle')}</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          {t('upgradeMiningDesc')}
        </p>

        {/* Duration Switcher */}
        <div className="inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl mt-3 text-xs">
          <button
            onClick={() => setDuration(1)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              duration === 1 ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('oneMonth')}
          </button>
          <button
            onClick={() => setDuration(3)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all relative ${
              duration === 3 ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('threeMonths')}
            <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-amber-500/30 text-amber-300 font-bold">
              -10%
            </span>
          </button>
          <button
            onClick={() => setDuration(12)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all relative ${
              duration === 12 ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('oneYear')}
            <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-bold">
              -20%
            </span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold text-center">
          {feedback}
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-semibold text-center">
          {error}
        </div>
      )}

      {/* Subscription Tiers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DEFAULT_SUBSCRIPTION_TIERS.map((tier) => {
          const isCurrent = user.subscription.tierId === tier.id;
          const price =
            duration === 12
              ? tier.priceTonYearly
              : duration === 3
              ? tier.priceTonQuarterly
              : tier.priceTonMonthly;
          const isPurchasing = purchasingTierId === tier.id;

          return (
            <div
              key={tier.id}
              className={`p-5 rounded-3xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                isCurrent
                  ? 'bg-[#101b38] border-cyan-500/80 shadow-xl shadow-cyan-950/50 ring-1 ring-cyan-400/40'
                  : 'bg-[#0d1424] border-slate-800 hover:border-slate-700'
              }`}
            >
              {isCurrent && (
                <div className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {t('activeTierBadge')}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{tier.badge}</span>
                </div>

                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-3xl font-extrabold text-white font-mono">{price}</span>
                  <span className="text-xs text-cyan-400 font-bold">TON</span>
                  <span className="text-xs text-slate-400">
                    {duration === 1 ? t('perMonthSuffix') : `/${duration} mos`}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {tier.description}
                </p>

                {/* Features List */}
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>
                      <strong className="text-white">{tier.miningMultiplier}x</strong> Daily Mining Output
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>
                      <strong className="text-white">+{tier.referralBonusPercent}%</strong> Referral Bonus
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-2">
                <button
                  onClick={() => handlePurchase(tier)}
                  disabled={isPurchasing}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    isCurrent
                      ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30 hover:bg-slate-700'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white shadow-lg shadow-cyan-500/25'
                  }`}
                >
                  {isPurchasing ? (
                    '...'
                  ) : isCurrent ? (
                    t('currentPlan')
                  ) : (
                    `${t('selectTierBtn')} (${price} TON)`
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
