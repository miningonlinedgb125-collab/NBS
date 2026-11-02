import React, { useState } from 'react';
import { ProjectSettings } from '../../types';
import { Settings, Save, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface MiningSettingsProps {
  settings: ProjectSettings;
  onRefreshData: () => void;
}

export const MiningSettings: React.FC<MiningSettingsProps> = ({
  settings,
  onRefreshData,
}) => {
  const [formData, setFormData] = useState<Partial<ProjectSettings>>({
    baseMiningDailyReward: settings.baseMiningDailyReward,
    miningCycleHours: settings.miningCycleHours,
    minWithdrawalJetton: settings.minWithdrawalJetton,
    withdrawalFeeJetton: settings.withdrawalFeeJetton,
    referralSignupReward: settings.referralSignupReward,
    referralActivationReward: settings.referralActivationReward,
    isMiningEnabled: settings.isMiningEnabled,
    isWithdrawalEnabled: settings.isWithdrawalEnabled,
    telegramBotUsername: settings.telegramBotUsername,
    publicWebAppUrl: settings.publicWebAppUrl || '',
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to save settings', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Official Project Configuration Banner */}
      <div className="p-4 rounded-2xl bg-[#0a0f1d] border border-cyan-500/30 space-y-2">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4" />
          Official Mainnet Wallet Parameters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-400">Official Fee Wallet (Fixed):</span>
            <div className="font-mono text-cyan-300 bg-slate-900 p-2 rounded-lg mt-0.5 break-all select-all border border-slate-800">
              {settings.officialFeeWallet}
            </div>
          </div>
          <div>
            <span className="text-slate-400">Wallet Activation Fee:</span>
            <div className="font-mono text-amber-300 bg-slate-900 p-2 rounded-lg mt-0.5 border border-slate-800 font-bold">
              {settings.activationFeeTon} TON
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-[#0d1424] border border-slate-800 space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-cyan-400" />
          Mining & Reward Parameters
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Base Daily Mining Reward ({settings.tokenSymbol})</label>
            <input
              type="number"
              value={formData.baseMiningDailyReward}
              onChange={(e) => setFormData({ ...formData, baseMiningDailyReward: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Mining Cycle Duration (Hours)</label>
            <input
              type="number"
              value={formData.miningCycleHours}
              onChange={(e) => setFormData({ ...formData, miningCycleHours: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Referral Signup Reward ({settings.tokenSymbol})</label>
            <input
              type="number"
              value={formData.referralSignupReward}
              onChange={(e) => setFormData({ ...formData, referralSignupReward: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Referral 0.05 TON Activation Bonus ({settings.tokenSymbol})</label>
            <input
              type="number"
              value={formData.referralActivationReward}
              onChange={(e) => setFormData({ ...formData, referralActivationReward: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Minimum Withdrawal ({settings.tokenSymbol})</label>
            <input
              type="number"
              value={formData.minWithdrawalJetton}
              onChange={(e) => setFormData({ ...formData, minWithdrawalJetton: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Withdrawal Fee ({settings.tokenSymbol})</label>
            <input
              type="number"
              value={formData.withdrawalFeeJetton}
              onChange={(e) => setFormData({ ...formData, withdrawalFeeJetton: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs text-slate-400">Telegram Bot Username (without @)</label>
            <input
              type="text"
              value={formData.telegramBotUsername}
              onChange={(e) => setFormData({ ...formData, telegramBotUsername: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="col-span-full">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Public Telegram WebApp URL (Zero 403 / No Google Login Required)
            </label>
            <input
              type="url"
              value={formData.publicWebAppUrl || ''}
              onChange={(e) => setFormData({ ...formData, publicWebAppUrl: e.target.value })}
              placeholder="e.g. https://your-domain.com or https://*.trycloudflare.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Active tunnel URL: <code className="text-cyan-400 select-all">https://lucy-wild-correct-cloth.trycloudflare.com</code>. This URL is used directly by Telegram for the menu button and in-chat Mini App buttons without Google authentication barriers.
            </p>
          </div>
        </div>

        {/* Protocol Switches */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isMiningEnabled}
              onChange={(e) => setFormData({ ...formData, isMiningEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-900 border-slate-700"
            />
            <div>
              <div className="text-xs font-bold text-white">Enable Daily 24h Mining Engine</div>
              <div className="text-[11px] text-slate-400">Allows miners to start cycles and accumulate rewards</div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isWithdrawalEnabled}
              onChange={(e) => setFormData({ ...formData, isWithdrawalEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-900 border-slate-700"
            />
            <div>
              <div className="text-xs font-bold text-white">Enable Jetton Withdrawals</div>
              <div className="text-[11px] text-slate-400">Accept user withdrawal requests on TON Mainnet</div>
            </div>
          </label>
        </div>

        {/* Submit */}
        <div className="pt-2 flex items-center justify-between">
          <button
            type="submit"
            disabled={saving}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>

          {success && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Settings Saved!
            </span>
          )}
        </div>
      </div>
    </form>
  );
};
