import React, { useState, useEffect } from 'react';
import { User, ProjectSettings } from '../../types';
import {
  Users,
  Wallet,
  Coins,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Settings,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface AdminDashboardProps {
  settings: ProjectSettings;
  onRefreshData: () => void;
  onSelectSubTab: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  settings,
  onRefreshData,
  onSelectSubTab,
}) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load admin stats', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/70 via-[#10142c] to-indigo-950/60 border border-purple-500/30 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-xl font-black text-white">Protocol Admin Control Hub</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Real-time management for TON Blockchain Mainnet Mining & Jetton Token Distribution
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/download-project"
            download="nbs-mining-project.zip"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-500/25 transition-all"
            title="Download full source code ZIP for GitHub and 24/7 hosting"
          >
            <span>📦 تحميل المشروع للرفع (ZIP)</span>
          </a>

          <button
            onClick={fetchStats}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-purple-500/50 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Metrics
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Users */}
        <div className="p-4 rounded-2xl bg-[#0d1424] border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Total Miners</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {stats?.totalUsers || 0}
          </div>
          <div className="text-[10px] text-slate-500">Registered Telegram accounts</div>
        </div>

        {/* Activated Wallets */}
        <div className="p-4 rounded-2xl bg-[#0d1424] border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Activated Wallets</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {stats?.activatedWallets || 0}
          </div>
          <div className="text-[10px] text-emerald-500/80">Paid {settings.activationFeeTon} TON fee</div>
        </div>

        {/* Activation Fees Collected */}
        <div className="p-4 rounded-2xl bg-[#0d1424] border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Activation Fees</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 font-mono">
            {(stats?.totalFeesTon || 0).toFixed(2)} <span className="text-xs text-amber-400">TON</span>
          </div>
          <div className="text-[10px] text-slate-500">To {settings.officialFeeWallet?.slice(0, 6)}...</div>
        </div>

        {/* Active VIP Subscriptions */}
        <div className="p-4 rounded-2xl bg-[#0d1424] border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Active VIP Subs</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300 font-mono">
            {stats?.activeSubscriptions || 0}
          </div>
          <div className="text-[10px] text-slate-500">Basic, Silver, Gold, VIP</div>
        </div>
      </div>

      {/* Secondary Row: Token Distribution & Pending Withdrawals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Token Distribution Metrics */}
        <div className="p-5 rounded-3xl bg-[#0d1424] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-cyan-400" />
              Jetton Supply Distribution
            </h3>
            <span className="text-xs font-mono font-bold text-cyan-400">
              Supply: {settings.totalSupply?.toLocaleString()} {settings.tokenSymbol}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Total Distributed so far:</span>
              <span className="font-bold text-white font-mono">
                {(stats?.totalJettonDistributed || 0).toFixed(2)} {settings.tokenSymbol}
              </span>
            </div>

            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    ((stats?.totalJettonDistributed || 0) / (settings.totalSupply || 1)) * 100
                  )}%`,
                }}
              />
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 text-center text-[10px]">
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-slate-400">Mining Pool</div>
                <div className="font-bold text-cyan-300 font-mono mt-0.5">40%</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-slate-400">Tasks Pool</div>
                <div className="font-bold text-blue-300 font-mono mt-0.5">20%</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-slate-400">Referrals</div>
                <div className="font-bold text-purple-300 font-mono mt-0.5">15%</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-slate-400">Treasury</div>
                <div className="font-bold text-amber-300 font-mono mt-0.5">25%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Withdrawals Desk Card */}
        <div className="p-5 rounded-3xl bg-[#0d1424] border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-amber-400" />
                Withdrawal Requests Queue
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30">
                {stats?.pendingWithdrawalsCount || 0} Pending
              </span>
            </div>

            <div className="mt-3 p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Pending Volume:</span>
                <span className="font-bold text-amber-300 font-mono">
                  {(stats?.pendingWithdrawalsAmount || 0).toFixed(2)} {settings.tokenSymbol}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Review and approve transfers to user TON non-custodial wallets on TON Mainnet.
              </p>
            </div>
          </div>

          <button
            onClick={() => onSelectSubTab('withdrawals')}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:brightness-110 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all"
          >
            Open Withdrawal Approval Desk →
          </button>
        </div>
      </div>

      {/* 24/7 Permanent Hosting Guide & GitHub Instructions */}
      <div className="p-6 rounded-3xl bg-[#0c1020] border border-cyan-500/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">
              🌐
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">دليل تشغيل السيرفر 24 ساعة دون انقطاع (Permanent 24/7 Hosting)</h3>
              <p className="text-[11px] text-slate-400">
                كيفية رفع المشروع على GitHub وتشغيله على استضافة سحابية دائمة ومستقرة 100%
              </p>
            </div>
          </div>
          <a
            href="/api/download-project"
            download="nbs-mining-project.zip"
            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-xs font-bold transition-colors"
          >
            تنزيل الكود الكامل 📦
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-black/40 border border-slate-800 space-y-1.5">
            <div className="font-bold text-cyan-400 flex items-center gap-1.5">
              <span>1. رفع الكود على GitHub</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              قم بإنشاء مستودع جديد على GitHub (New Repository) وارفع ملفات المشروع إليه (عبر فك الضغط عن ملف ZIP وسحبه أو باستخدام Git push).
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-slate-800 space-y-1.5">
            <div className="font-bold text-purple-400 flex items-center gap-1.5">
              <span>2. الربط باستضافة مجانية 24/7</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              سجل في <b>Render.com</b> أو <b>Railway.app</b> أو <b>Koyeb</b> واختر "New Web Service" واربط مستودع GitHub الخاص بك.
              ملف <code>render.yaml</code> و <code>Dockerfile</code> جاهزان بالكامل داخل المشروع!
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-slate-800 space-y-1.5">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span>3. وضع الرابط في إعدادات البوت</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              بمجرد اكتمال البناء على Render/Railway، ستحصل على رابط دائم لا يتغير أبداً (مثال: <code>https://nbs-app.onrender.com</code>).
              ضعه في إعدادات البوت ولن يفصل إطلاقاً!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
