import React, { useState } from 'react';
import { User, ProjectSettings } from '../../types';
import { buildReferralLink } from '../../engines/referrals';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Users,
  Copy,
  Check,
  Share2,
  Gift,
  ShieldCheck,
  UserCheck,
  Sparkles,
  QrCode,
  Flame,
} from 'lucide-react';

interface ReferralViewProps {
  user: User;
  settings: ProjectSettings;
}

export const ReferralView: React.FC<ReferralViewProps> = ({ user, settings }) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const referralLink = buildReferralLink(settings.telegramBotUsername, user.referralCode);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(
    t('shareTelegramText')
  )}`;

  return (
    <div className="space-y-6 pb-20">
      {/* Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-purple-950/70 via-[#10132b] to-[#0a0f1d] border border-purple-500/30 p-6 shadow-2xl shadow-purple-950/40 overflow-hidden">
        <div className="flex items-center gap-2.5 text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Gift className="w-4 h-4" />
          {t('referralProgramBadge')}
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white">
          {t('inviteFriendsHeroTitle')}
        </h2>
        <p className="text-xs text-slate-300 mt-1 max-w-lg leading-relaxed">
          {t('inviteFriendsHeroDesc')}
        </p>

        {/* 100 NBS Activation Reward Highlight Card */}
        <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-black/60 to-purple-950/40 border border-purple-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                {t('walletActivatedRewardLabel')}
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                {t('highTierBonusDesc')}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-2xl font-black text-cyan-400 font-mono">
              +100 <span className="text-sm">{settings.tokenSymbol}</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-bold uppercase">
              TON Mainnet
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link & Share Box */}
      <div className="p-5 rounded-3xl bg-[#0d1424] border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300">{t('yourExclusiveLink')}</span>
          <button
            onClick={() => setShowQr(!showQr)}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <QrCode className="w-3.5 h-3.5" />
            {showQr ? t('hideQr') : t('showQr')}
          </button>
        </div>

        {/* QR Code Container */}
        {showQr && (
          <div className="p-4 bg-white rounded-2xl flex flex-col items-center justify-center max-w-[200px] mx-auto text-center space-y-2">
            <div className="w-36 h-36 border-4 border-slate-900 rounded-lg flex items-center justify-center text-slate-900 font-mono text-xs p-2 text-center break-all font-semibold bg-slate-100">
              [TON QR]
              <br />
              ref_{user.referralCode}
            </div>
            <p className="text-[10px] text-slate-700 font-bold">{t('scanToOpenTelegram')}</p>
          </div>
        )}

        <div className="flex items-center gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/80">
          <span className="flex-1 text-xs font-mono text-cyan-300 truncate select-all">
            {referralLink}
          </span>
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title={t('copyInviteLink')}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleCopy}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? t('copiedLink') : t('copyInviteLink')}
          </button>

          <a
            href={telegramShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
          >
            <Share2 className="w-4 h-4" />
            {t('shareOnTelegram')}
          </a>
        </div>
      </div>

      {/* Referral Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[#0d1424] border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">{t('friendsJoined')}</div>
          <div className="text-xl font-bold text-white font-mono mt-1">
            {user.totalReferrals}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Total invited</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0d1424] border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">{t('friendsActivated')}</div>
          <div className="text-xl font-bold text-cyan-400 font-mono mt-1">
            {user.activeReferrals}
          </div>
          <div className="text-[10px] text-cyan-500/80 mt-0.5">0.05 TON paid</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0d1424] border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Earned Rewards</div>
          <div className="text-xl font-bold text-purple-400 font-mono mt-1">
            {user.balances.referralEarned.toFixed(0)}
          </div>
          <div className="text-[10px] text-purple-500/80 mt-0.5">{settings.tokenSymbol}</div>
        </div>
      </div>
    </div>
  );
};
