import React, { useState, useEffect } from 'react';
import { User, ProjectSettings, WithdrawalRequest } from '../../types';
import { getTonviewerTxUrl } from '../../contracts/jetton-utils';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  X,
  ArrowUpRight,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  settings: ProjectSettings;
  onRefreshUser: () => void;
  onOpenWalletModal: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  user,
  settings,
  onRefreshUser,
  onOpenWalletModal,
}) => {
  const { t } = useLanguage();
  const [amountInput, setAmountInput] = useState('');
  const [addressInput, setAddressInput] = useState(user.walletAddress || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [history, setHistory] = useState<WithdrawalRequest[]>([]);

  useEffect(() => {
    if (isOpen) {
      setAddressInput(user.walletAddress || '');
      fetchHistory();
    }
  }, [isOpen, user.id]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/withdrawals/history?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.withdrawals || []);
      }
    } catch (err) {
      console.error('Failed to load withdrawal history', err);
    }
  };

  if (!isOpen) return null;

  const minWithdrawal = settings.minWithdrawalJetton || 50;
  const fee = settings.withdrawalFeeJetton || 2;
  const enteredAmount = Number(amountInput) || 0;
  const netReceived = Math.max(0, enteredAmount - fee);

  const handleMax = () => {
    setAmountInput(user.balances.availableJetton.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user.isWalletActivated || !user.walletAddress) {
      setError('You must connect and activate your wallet with 0.05 TON before requesting withdrawals.');
      return;
    }

    if (enteredAmount < minWithdrawal) {
      setError(`Minimum withdrawal is ${minWithdrawal} ${settings.tokenSymbol}.`);
      return;
    }

    if (enteredAmount > user.balances.availableJetton) {
      setError(`Insufficient available balance (${user.balances.availableJetton} ${settings.tokenSymbol} available).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/withdrawals/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: enteredAmount,
          destinationAddress: user.walletAddress,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Withdrawal request failed');
      }
      setSuccess(`Withdrawal request submitted! Your ${settings.tokenSymbol} tokens will be dispatched to your linked wallet.`);
      setAmountInput('');
      fetchHistory();
      onRefreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to submit withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0d1424] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/50 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-[#101932]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Withdraw {settings.tokenSymbol} (TON Mainnet)
              </h2>
              <p className="text-xs text-slate-400">
                Available: <span className="text-cyan-400 font-mono font-bold">{user.balances.availableJetton.toFixed(2)} {settings.tokenSymbol}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {!user.isWalletActivated || !user.walletAddress ? (
            <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Wallet Activation & Linking Required
              </div>
              <p className="text-xs text-slate-300">
                Withdrawals are paid directly to your pre-verified TON wallet. You must link your wallet and pay the 0.05 TON activation fee first.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWalletModal();
                }}
                className="mt-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold text-xs shadow-md"
              >
                Connect & Activate Wallet (0.05 TON) →
              </button>
            </div>
          ) : null}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="text-slate-400 font-medium">{t('amountLabel')}</label>
                <button
                  type="button"
                  onClick={handleMax}
                  className="text-cyan-400 hover:underline font-bold text-[11px]"
                >
                  {t('maxAvailable')}
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type="number"
                  dir="ltr"
                  step="0.01"
                  min={minWithdrawal}
                  max={user.balances.availableJetton}
                  placeholder={`Min: ${minWithdrawal}`}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-20 py-2.5 text-sm font-mono text-left text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1 bg-slate-800/90 px-2 py-0.5 rounded-md border border-cyan-500/30">
                  <span className="text-xs font-bold text-cyan-400 font-mono">
                    {settings.tokenSymbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Destination Address - Locked to linked & verified wallet */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="text-slate-400 font-medium">{t('destinationWalletLabel')}</label>
                {user.isWalletActivated && user.walletAddress ? (
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {t('verifiedBadge')}
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-400 font-semibold">{t('walletUnactivated')}</span>
                )}
              </div>
              <div className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-xl flex items-center justify-between gap-2">
                <div className="font-mono text-xs text-white truncate">
                  {user.walletAddress || 'No verified wallet found. Please activate your wallet first.'}
                </div>
                {user.isWalletActivated && user.walletAddress && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase shrink-0">
                    {t('autoLockedBadge')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {t('withdrawNote')}
              </p>
            </div>

            {/* Fee summary card */}
            <div className="p-3.5 bg-black/40 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>{t('requestedAmount')}</span>
                <span className="font-mono text-white">{enteredAmount.toFixed(2)} {settings.tokenSymbol}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{t('networkFee')}</span>
                <span className="font-mono text-amber-400">-{fee.toFixed(2)} {settings.tokenSymbol}</span>
              </div>
              <div className="flex justify-between font-bold text-white pt-1.5 border-t border-slate-800">
                <span>{t('netReceived')}</span>
                <span className="font-mono text-cyan-400">{netReceived.toFixed(2)} {settings.tokenSymbol}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !user.isWalletActivated || !user.walletAddress || enteredAmount <= 0}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  {t('confirmWithdrawBtn')}
                </>
              )}
            </button>
          </form>

          {/* Recent Withdrawal Requests */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Recent Withdrawal Requests
            </h4>

            {history.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">No withdrawals requested yet.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {history.map((req) => (
                  <div
                    key={req.id}
                    className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white font-mono">
                        {req.amount} {settings.tokenSymbol}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(req.requestedAt).toLocaleDateString()} to {req.walletAddress.slice(0, 6)}...
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <span
                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                          req.status === 'EXECUTED'
                            ? 'bg-emerald-950 text-emerald-400'
                            : req.status === 'PENDING'
                            ? 'bg-amber-950 text-amber-400'
                            : 'bg-rose-950 text-rose-400'
                        }`}
                      >
                        {req.status}
                      </span>
                      {req.blockchainTxHash && (
                        <a
                          href={getTonviewerTxUrl(req.blockchainTxHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
                        >
                          Tonviewer <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            TEP-74 Smart Contract Payouts
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
