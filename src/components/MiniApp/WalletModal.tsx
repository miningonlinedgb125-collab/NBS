import React, { useState, useEffect } from 'react';
import { useTonConnectUI, useTonWallet, useTonAddress } from '@tonconnect/ui-react';
import { User, ProjectSettings } from '../../types';
import { OFFICIAL_FEE_WALLET, ACTIVATION_FEE_TON } from '../../engines/ton';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  X,
  Wallet,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Info,
  LogOut,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  settings: ProjectSettings;
  onRefreshUser: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  user,
  settings,
  onRefreshUser,
}) => {
  const { t } = useLanguage();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const connectedAddress = useTonAddress(); // friendly address (UQ... or EQ...)
  
  const [isPaying, setIsPaying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Sync connected TonConnect address with backend user profile automatically
  useEffect(() => {
    if (connectedAddress && connectedAddress !== user.walletAddress) {
      handleAutoSyncAddress(connectedAddress);
    }
  }, [connectedAddress]);

  const handleAutoSyncAddress = async (address: string) => {
    try {
      const res = await fetch(`/api/user/${user.id}/wallet/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.isAlreadyPaid) {
          setStatusMessage({
            type: 'success',
            text: t('statusAutoLinkedFree'),
          });
        }
        onRefreshUser();
      }
    } catch (err) {
      console.warn('Auto-sync address error:', err);
    }
  };

  if (!isOpen) return null;

  const activeWalletAddress = connectedAddress || user.walletAddress || '';
  const isConnected = Boolean(activeWalletAddress);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // 1. Connect using official TON Connect modal (Tonkeeper, Telegram Wallet, Tonhub, etc.)
  const handleOpenTonConnect = () => {
    setStatusMessage(null);
    try {
      tonConnectUI.openModal();
    } catch (err) {
      console.error('Failed to open TON Connect modal:', err);
    }
  };

  // 2. Disconnect Wallet
  const handleDisconnect = async () => {
    setStatusMessage(null);
    try {
      if (tonConnectUI.connected) {
        await tonConnectUI.disconnect();
      }
      await fetch(`/api/user/${user.id}/wallet/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      setStatusMessage({ type: 'info', text: t('statusWalletDisconnected') });
      onRefreshUser();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Disconnect failed' });
    }
  };

  // 3. Pay 0.05 TON Activation fee with connected wallet
  const handlePayActivation = async () => {
    if (!activeWalletAddress) {
      setStatusMessage({ type: 'error', text: t('statusPleaseLinkFirst') });
      return;
    }

    setIsPaying(true);
    setStatusMessage({
      type: 'info',
      text: t('statusConnecting'),
    });

    try {
      if (tonConnectUI.connected) {
        const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
          messages: [
            {
              address: OFFICIAL_FEE_WALLET,
              amount: '50000000', // 0.05 TON in nanoton
            },
          ],
        };

        const result = await tonConnectUI.sendTransaction(transaction);
        await triggerVerification(result?.boc);
      } else {
        const deepLink = `https://app.tonkeeper.com/transfer/${OFFICIAL_FEE_WALLET}?amount=50000000`;
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.openLink) {
          tg.openLink(deepLink);
        } else {
          window.location.href = deepLink;
        }
        startBackgroundPolling();
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || t('statusTxCancelled'),
      });
    } finally {
      setIsPaying(false);
    }
  };

  const triggerVerification = async (txBoc?: string) => {
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/user/${user.id}/wallet/verify-activation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: activeWalletAddress,
          txHash: txBoc ? `boc_${Date.now()}` : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: t('statusPaidSuccess'),
        });
        onRefreshUser();
      } else {
        startBackgroundPolling();
      }
    } catch (err: any) {
      startBackgroundPolling();
    } finally {
      setIsVerifying(false);
    }
  };

  const startBackgroundPolling = () => {
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      if (count > 12) {
        clearInterval(interval);
        return;
      }
      try {
        const res = await fetch(`/api/user/${user.id}/wallet/verify-activation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: activeWalletAddress }),
        });
        const data = await res.json();
        if (data.success) {
          clearInterval(interval);
          setStatusMessage({
            type: 'success',
            text: t('statusPaidSuccess'),
          });
          onRefreshUser();
        }
      } catch {}
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0d1424] border border-cyan-500/30 rounded-3xl shadow-2xl shadow-cyan-950/60 overflow-hidden max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-[#101932]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {t('walletModalTitle')}
              </h2>
              <p className="text-xs text-slate-400">
                {user.isWalletActivated ? t('walletVerifiedSubtitle') : t('walletUnverifiedSubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-sm">
          {/* Status Message Banner */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs leading-relaxed flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/70 border border-rose-500/50 text-rose-200'
                  : 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-200'
              }`}
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* CASE 1: WALLET IS CONNECTED AND ACTIVATED */}
          {isConnected && user.isWalletActivated ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-white text-sm">{t('activeVerifiedTitle')}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">
                    {t('verifiedBadge')}
                  </span>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 mb-1">{t('linkedWalletAddress')}</div>
                  <div className="p-3 bg-black/60 rounded-xl font-mono text-xs text-emerald-300 break-all border border-emerald-500/30 flex items-center justify-between">
                    <span className="select-all">{activeWalletAddress}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeWalletAddress, 'address')}
                      className="p-1 hover:bg-emerald-900/40 rounded text-emerald-400 ml-2 shrink-0"
                    >
                      {copiedField === 'address' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-500/20 text-xs text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('activationStatus')}</span>
                    <span className="text-emerald-400 font-bold">{t('confirmedOnMainnet')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('feePaid')}</span>
                    <span className="text-cyan-400 font-bold">{ACTIVATION_FEE_TON} TON</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('officialReceivingWallet')}</span>
                    <span className="font-mono text-slate-300 text-[11px] truncate max-w-[210px]">{OFFICIAL_FEE_WALLET}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleOpenTonConnect}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Wallet className="w-4 h-4 text-cyan-400" />
                  {t('switchWalletBtn')}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="py-2.5 px-4 rounded-xl bg-slate-900 border border-rose-900/50 hover:border-rose-500/50 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  {t('disconnectBtn')}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {t('reconnectFreeNote')}
              </p>
            </div>
          ) : null}

          {/* CASE 2: WALLET IS CONNECTED BUT NOT YET ACTIVATED */}
          {isConnected && !user.isWalletActivated ? (
            <div className="space-y-4">
              {/* Connected Address Card */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    {t('walletConnectedStatus')}
                  </span>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-rose-400 hover:underline text-[11px]"
                  >
                    {t('disconnectBtn')}
                  </button>
                </div>
                <div className="p-3 bg-black/60 rounded-xl font-mono text-xs text-cyan-300 break-all border border-slate-800">
                  {activeWalletAddress}
                </div>
              </div>

              {/* Pay Activation Fee Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/50 via-blue-950/30 to-slate-900 border border-cyan-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    {t('payActivationTitle')}
                  </span>
                  <span className="text-xs font-bold text-cyan-300 font-mono">0.05 TON</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('payActivationDesc')}
                </p>
              </div>

              {/* Primary Action Button: Pay with connected wallet */}
              <button
                type="button"
                onClick={handlePayActivation}
                disabled={isPaying || isVerifying}
                className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:brightness-110 active:scale-[0.99] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/30 transition-all border border-cyan-400/40 disabled:opacity-50"
              >
                {isPaying ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {t('statusSendingPayment')}
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5" />
                    {t('payNowBtn')}
                  </>
                )}
              </button>

              {/* Manual refresh status */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => triggerVerification()}
                  disabled={isVerifying}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-cyan-400' : ''}`} />
                  {isVerifying ? t('statusVerifying') : t('refreshStatusBtn')}
                </button>
              </div>
            </div>
          ) : null}

          {/* CASE 3: NO WALLET CONNECTED YET - OFFICIAL TON CONNECT BUTTONS */}
          {!isConnected && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-1.5 text-center">
                <div className="text-sm font-bold text-white">{t('chooseWalletTitle')}</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('chooseWalletDesc')}
                </p>
              </div>

              {/* Main TonConnect Modal Trigger Button */}
              <button
                type="button"
                onClick={handleOpenTonConnect}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:brightness-110 active:scale-[0.99] text-white font-extrabold text-sm flex items-center justify-between shadow-xl shadow-cyan-500/30 transition-all border border-cyan-400/40 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shrink-0">
                    💎
                  </div>
                  <div className="text-left rtl:text-right">
                    <div className="text-sm font-extrabold flex items-center gap-2">
                      {t('connectTonkeeperBtn')}
                    </div>
                    <div className="text-xs text-white/80 font-normal">
                      {t('connectTonkeeperSub')}
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-white/90 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>

              {/* Supported Wallets Pills */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-2">
                <div className="text-xs text-slate-400 font-medium">{t('supportedWallets')}</div>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300">
                  <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 font-semibold flex items-center gap-1.5">
                    💎 Tonkeeper
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 font-semibold flex items-center gap-1.5">
                    ✈️ Telegram @wallet
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 font-semibold flex items-center gap-1.5">
                    ⚡ Tonhub
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 font-semibold flex items-center gap-1.5">
                    🛡️ MyTonWallet
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            {t('tonConnectOfficial')}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
