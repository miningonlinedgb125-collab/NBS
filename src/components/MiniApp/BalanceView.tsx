import React, { useState, useEffect } from 'react';
import { User, ProjectSettings, LedgerEntry } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Wallet,
  Clock,
  History,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Filter,
} from 'lucide-react';

interface BalanceViewProps {
  user: User;
  settings: ProjectSettings;
  onOpenWithdrawModal: () => void;
  onOpenWalletModal: () => void;
}

export const BalanceView: React.FC<BalanceViewProps> = ({
  user,
  settings,
  onOpenWithdrawModal,
  onOpenWalletModal,
}) => {
  const { t } = useLanguage();
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchLedger();
  }, [user.id]);

  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ledger?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setLedger(data.ledger || []);
      }
    } catch (err) {
      console.error('Failed to load ledger', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLedger = ledger.filter((entry) => {
    if (filterType === 'ALL') return true;
    return entry.direction === filterType;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Primary Balance Header Card */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#101935] via-[#0d1424] to-[#0a0f1d] border border-cyan-500/30 p-6 shadow-2xl shadow-cyan-950/40 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>{t('availableBalance')}</span>
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            TON Mainnet
          </span>
        </div>

        {/* Main Available Amount */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
            {user.balances.availableJetton.toFixed(2)}
          </span>
          <span className="text-xl font-bold text-cyan-400">{settings.tokenSymbol}</span>
        </div>

        {/* Secondary Info: Locked + Lifetime */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/80">
          <div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-400" />
              {t('lockedBalance')}
            </div>
            <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">
              {user.balances.lockedJetton.toFixed(2)} {settings.tokenSymbol}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Coins className="w-3 h-3 text-cyan-400" />
              {t('lifetimeEarned')}
            </div>
            <div className="text-sm font-bold text-white font-mono mt-0.5">
              {user.balances.totalEarned.toFixed(2)} {settings.tokenSymbol}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onOpenWithdrawModal}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            {t('withdrawNbsBtn')}
          </button>

          <button
            onClick={onOpenWalletModal}
            className="py-3 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Wallet className="w-4 h-4 text-cyan-400" />
            {user.isWalletActivated ? t('walletVerified') : t('connectWalletBtn')}
          </button>
        </div>
      </div>

      {/* 3 Categories Breakdown Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#0d1424] border border-slate-800 text-center">
          <div className="text-xs text-slate-400">{t('breakdownMining')}</div>
          <div className="text-base font-bold text-white font-mono mt-1">
            {user.balances.miningEarned.toFixed(1)}
          </div>
          <div className="text-[10px] text-cyan-400 mt-0.5">24h cycles</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0d1424] border border-slate-800 text-center">
          <div className="text-xs text-slate-400">{t('breakdownTasks')}</div>
          <div className="text-base font-bold text-white font-mono mt-1">
            {user.balances.tasksEarned.toFixed(1)}
          </div>
          <div className="text-[10px] text-blue-400 mt-0.5">Bounties</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0d1424] border border-slate-800 text-center">
          <div className="text-xs text-slate-400">{t('breakdownReferrals')}</div>
          <div className="text-base font-bold text-white font-mono mt-1">
            {user.balances.referralEarned.toFixed(1)}
          </div>
          <div className="text-[10px] text-purple-400 mt-0.5">Invited friends</div>
        </div>
      </div>

      {/* Double-Entry Ledger History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Financial Audit Ledger</h3>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 text-[11px] bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2 py-0.5 rounded ${
                filterType === 'ALL' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('CREDIT')}
              className={`px-2 py-0.5 rounded ${
                filterType === 'CREDIT' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400'
              }`}
            >
              Credits (+)
            </button>
            <button
              onClick={() => setFilterType('DEBIT')}
              className={`px-2 py-0.5 rounded ${
                filterType === 'DEBIT' ? 'bg-rose-600 text-white font-semibold' : 'text-slate-400'
              }`}
            >
              Debits (-)
            </button>
          </div>
        </div>

        {/* Ledger Entries List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-slate-500">Loading ledger records...</div>
          ) : filteredLedger.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#0d1424] border border-slate-800/80 text-center space-y-2">
              <Clock className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-medium">No financial transactions recorded yet.</p>
              <p className="text-[11px] text-slate-500">
                Start a 24-hour mining cycle or complete community tasks to receive your first reward.
              </p>
            </div>
          ) : (
            filteredLedger.map((entry) => {
              const isCredit = entry.direction === 'CREDIT';
              return (
                <div
                  key={entry.id}
                  className="p-3.5 rounded-2xl bg-[#0d1424] border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isCredit
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white line-clamp-1">
                        {entry.description}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{new Date(entry.timestamp).toLocaleString()}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                        <span className="font-mono text-slate-500">{entry.type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-bold font-mono ${
                        isCredit ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isCredit ? '+' : '-'}
                      {entry.amount} {entry.currency}
                    </div>
                    <span
                      className={`inline-block text-[9px] uppercase px-1.5 py-0.5 rounded mt-0.5 font-semibold ${
                        entry.status === 'COMPLETED'
                          ? 'bg-emerald-950/60 text-emerald-400'
                          : entry.status === 'PENDING'
                          ? 'bg-amber-950/60 text-amber-400'
                          : 'bg-rose-950/60 text-rose-400'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
