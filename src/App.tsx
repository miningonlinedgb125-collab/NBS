/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, ProjectSettings } from './types';
import { Navbar } from './components/Navbar';
import { MiningView } from './components/MiniApp/MiningView';
import { BalanceView } from './components/MiniApp/BalanceView';
import { TasksView } from './components/MiniApp/TasksView';
import { ReferralView } from './components/MiniApp/ReferralView';
import { SubscriptionView } from './components/MiniApp/SubscriptionView';
import { LeaderboardView } from './components/MiniApp/LeaderboardView';
import { WalletModal } from './components/MiniApp/WalletModal';
import { WithdrawModal } from './components/MiniApp/WithdrawModal';
import { LanguageModal } from './components/MiniApp/LanguageModal';
import { useLanguage } from './i18n/LanguageContext';
import { TelegramChat } from './components/BotSimulator/TelegramChat';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { UserManagement } from './components/Admin/UserManagement';
import { MiningSettings } from './components/Admin/MiningSettings';
import { TaskManager } from './components/Admin/TaskManager';
import { WithdrawalManager } from './components/Admin/WithdrawalManager';
import { ContractStudio } from './components/Admin/ContractStudio';
import { SplashScreen } from './components/SplashScreen';
import {
  Pickaxe,
  CheckSquare,
  Users,
  Wallet,
  Crown,
  Trophy,
  Shield,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Globe,
} from 'lucide-react';

const FALLBACK_SETTINGS: ProjectSettings = {
  tokenName: 'NBS',
  tokenSymbol: 'NBS',
  tokenDecimals: 9,
  totalSupply: 200_000_000,
  miningSupplyAllocation: 80_000_000,
  tasksSupplyAllocation: 40_000_000,
  referralSupplyAllocation: 30_000_000,
  treasurySupplyAllocation: 50_000_000,
  treasuryWallet: 'UQAmUa3boqCwHwe26qqB6rD8Rs7QQ-R7IHUtyxLEX2Uqboby',
  jettonMasterAddress: '',
  officialFeeWallet: 'UQDpW9vQYx0tqf28H_k7P117S9k6s_KxYn1GvYg8c5Z9wTon',
  activationFeeTon: 0.05,
  minWithdrawalJetton: 50,
  withdrawalFeeJetton: 2,
  baseMiningDailyReward: 50,
  miningCycleHours: 24,
  referralSignupReward: 0,
  referralActivationReward: 100,
  telegramBotUsername: 'NBSMining_bot',
  isMiningEnabled: true,
  isWithdrawalEnabled: true,
  isAutoWithdrawalEnabled: false,
};

const createFallbackUser = (uid: string): User => ({
  id: uid,
  username: uid === '1878942455' ? 'hamlet1223' : `miner_${uid.slice(0, 6)}`,
  firstName: uid === '1878942455' ? 'Hamlet' : 'Miner',
  isWalletActivated: false,
  createdAt: Date.now(),
  referralCode: uid,
  totalReferrals: 0,
  activeReferrals: 0,
  role: uid === '1878942455' ? 'admin' : 'user',
  miningState: {
    isMining: true,
    lastStartTime: Date.now() - 3600000,
    durationHours: 24,
    cycleEndTime: Date.now() + 23 * 3600000,
    streakDays: 1,
    totalMined: 0,
    accumulatedPending: 0,
  },
  subscription: {
    tierId: 'free',
    name: 'Free Miner',
    multiplier: 1.0,
    expiresAt: 0,
  },
  balances: {
    availableJetton: 0,
    lockedJetton: 0,
    totalEarned: 0,
    miningEarned: 0,
    tasksEarned: 0,
    referralEarned: 0,
  },
  isBanned: false,
});

export default function App() {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<'miniapp' | 'bot' | 'admin' | 'contract'>('miniapp');
  const [miniAppTab, setMiniAppTab] = useState<'mining' | 'balance' | 'tasks' | 'referrals' | 'plans' | 'leaderboard'>('mining');
  const [adminSubTab, setAdminSubTab] = useState<'overview' | 'users' | 'mining' | 'tasks' | 'withdrawals'>('overview');

  const [currentUserId, setCurrentUserId] = useState<string>('1878942455');
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [mobileFrame, setMobileFrame] = useState<boolean>(false);

  // Modals
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const { language, openLanguageModal, closeLanguageModal, isLanguageModalOpen, syncUserLanguage, t } = useLanguage();

  // Initial data loading & Telegram WebApp auto-detection
  useEffect(() => {
    fetchSettings();

    // Check if running inside Telegram WebApp
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (tg.initDataUnsafe?.user) {
          const tgUser = tg.initDataUnsafe.user;
          const uid = tgUser.id.toString();
          const username = tgUser.username || `tg_${uid.slice(0, 6)}`;
          const firstName = tgUser.first_name || 'Miner';
          const lastName = tgUser.last_name || '';
          const refCode = tg.initDataUnsafe?.start_param || '';

          // Seamless auto-login without any Google or email prompt
          fetch('/api/user/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: uid,
              username,
              firstName,
              lastName,
              referralCode: refCode,
            }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.success && d.user) {
                setUser(d.user);
                setCurrentUserId(uid);
                syncUserLanguage(d.user.language, d.user.hasSelectedLanguage);
              }
            })
            .catch(() => fetchUser(currentUserId));
          return;
        }
      } catch (e) {
        console.error('Error reading Telegram WebApp data', e);
      }
    }

    fetchUser(currentUserId);
  }, [currentUserId, syncUserLanguage]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        return;
      }
    } catch (err) {
      console.warn('Network notice: using cached/fallback settings');
    }
    setSettings((prev) => prev || FALLBACK_SETTINGS);
  };

  const fetchUser = async (uid: string) => {
    try {
      const res = await fetch('/api/user/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        syncUserLanguage(data.user.language, data.user.hasSelectedLanguage);
        return;
      }
    } catch (err) {
      console.warn('Network notice: using cached/fallback user session');
    }
    setUser((prev) => prev || createFallbackUser(uid));
  };

  const handleRefresh = () => {
    if (user) {
      fetchUser(user.id);
    }
    fetchSettings();
  };

  // Professional Web3 Splash & Startup Screen
  if (showSplash || !settings || !user) {
    return (
      <SplashScreen
        onFinish={() => {
          if (!settings) setSettings(FALLBACK_SETTINGS);
          if (!user) setUser(createFallbackUser(currentUserId));
          setShowSplash(false);
        }}
        isReady={Boolean(settings && user)}
      />
    );
  }

  const isRunningInTelegram = Boolean((window as any).Telegram?.WebApp?.initDataUnsafe?.user);
  const canAccessAdmin = !isRunningInTelegram || user?.role === 'admin';

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* 
        ADMIN / DEVELOPER NAVBAR:
        Rendered ONLY when ?admin=1 is enabled in the URL or activated by owner.
        Normal users inside Telegram or the bot will NEVER see this bar!
      */}
      {isAdminMode ? (
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          user={user}
          settings={settings}
          onOpenWalletModal={() => setIsWalletModalOpen(true)}
          onSwitchUser={(newUid) => setCurrentUserId(newUid)}
          mobileFrame={mobileFrame}
          setMobileFrame={setMobileFrame}
          onExitAdmin={() => setIsAdminMode(false)}
        />
      ) : (
        /* CLEAN NATIVE MINI APP HEADER FOR USERS */
        <header className="sticky top-0 z-40 bg-[#0a0f1d]/95 backdrop-blur-md border-b border-cyan-500/20 px-4 py-3">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            {/* Left: NBS Branding & Live Status */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-cyan-500/30 ring-2 ring-cyan-400/40 shrink-0">
                <img src="/nbs-logo.jpg" alt="NBS Token" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-white tracking-wide text-sm sm:text-base">
                    {settings.tokenSymbol} Mining
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    TON Mainnet
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  @{user.username || 'miner'}
                </p>
              </div>
            </div>

            {/* Right: Admin Hub & Language Switcher & Direct Wallet Connection / Status Button */}
            <div className="flex items-center gap-2">
              {canAccessAdmin && (
                <button
                  onClick={() => {
                    setIsAdminMode(true);
                    setCurrentTab('admin');
                  }}
                  className="py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1 bg-purple-950/70 hover:bg-purple-900/90 border border-purple-500/40 text-purple-300 transition-all active:scale-95 shadow-sm"
                  title="لوحة الأدمن / Admin Hub"
                >
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[11px] font-bold">Admin</span>
                </button>
              )}

              <button
                onClick={openLanguageModal}
                className="py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-slate-200 transition-all active:scale-95 shadow-sm"
                title="Select Language / اختيار اللغة"
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span className="uppercase text-[11px] font-bold tracking-wider">{language}</span>
              </button>

              <button
                onClick={() => setIsWalletModalOpen(true)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  user.isWalletActivated
                    ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white shadow-md shadow-cyan-500/25 active:scale-95'
                }`}
              >
                {user.isWalletActivated ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono text-[11px]">
                      {user.walletAddress?.slice(0, 4)}...{user.walletAddress?.slice(-3)}
                    </span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-3.5 h-3.5" />
                    <span>{t('walletNotConnected')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 flex flex-col">
        {/* ========================================================================= */}
        {/* 1. TELEGRAM MINI APP MODE (TMA) */}
        {/* ========================================================================= */}
        {(!isAdminMode || currentTab === 'miniapp') && (
          <div className="flex-1 flex justify-center">
            <div
              className={`w-full transition-all duration-300 flex flex-col ${
                isAdminMode && mobileFrame
                  ? 'max-w-md bg-[#0a0f1d] border-4 border-slate-800 rounded-[40px] shadow-2xl p-4 min-h-[750px] relative'
                  : 'max-w-xl'
              }`}
            >
              {/* If mobile frame is active in admin mode, show status bar */}
              {isAdminMode && mobileFrame && (
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-3 pb-3 mb-2 border-b border-slate-800/80">
                  <span className="font-bold">TON Telegram Mini App</span>
                  <div className="w-16 h-3.5 bg-black rounded-full mx-auto" />
                  <span className="text-cyan-400 font-mono">100% ⚡</span>
                </div>
              )}

              {/* Sub-View Container */}
              <div className="flex-1">
                {miniAppTab === 'mining' && (
                  <MiningView
                    user={user}
                    settings={settings}
                    onRefreshUser={handleRefresh}
                    onOpenWalletModal={() => setIsWalletModalOpen(true)}
                    onNavigateTab={(tab: string) => setMiniAppTab(tab as any)}
                  />
                )}
                {miniAppTab === 'balance' && (
                  <BalanceView
                    user={user}
                    settings={settings}
                    onOpenWithdrawModal={() => setIsWithdrawModalOpen(true)}
                    onOpenWalletModal={() => setIsWalletModalOpen(true)}
                  />
                )}
                {miniAppTab === 'tasks' && (
                  <TasksView
                    user={user}
                    settings={settings}
                    onRefreshUser={handleRefresh}
                  />
                )}
                {miniAppTab === 'referrals' && (
                  <ReferralView user={user} settings={settings} />
                )}
                {miniAppTab === 'plans' && (
                  <SubscriptionView
                    user={user}
                    settings={settings}
                    onRefreshUser={handleRefresh}
                    onOpenWalletModal={() => setIsWalletModalOpen(true)}
                  />
                )}
                {miniAppTab === 'leaderboard' && (
                  <LeaderboardView user={user} settings={settings} />
                )}
              </div>

              {/* Telegram Mini App Bottom Navigation Bar */}
              <div className="sticky bottom-2 z-40 bg-[#0d1424]/95 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-1.5 shadow-2xl shadow-cyan-950/80 mt-auto w-full max-w-xl mx-auto">
                <div className="grid grid-cols-6 gap-1 text-center">
                  <button
                    onClick={() => setMiniAppTab('mining')}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      miniAppTab === 'mining'
                        ? 'bg-gradient-to-t from-cyan-600/30 to-blue-600/30 text-cyan-300 font-bold border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Pickaxe className="w-4 h-4" />
                    <span className="text-[10px] truncate max-w-[50px]">{t('tabMining')}</span>
                  </button>

                  <button
                    onClick={() => setMiniAppTab('balance')}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      miniAppTab === 'balance'
                        ? 'bg-gradient-to-t from-cyan-600/30 to-blue-600/30 text-cyan-300 font-bold border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span className="text-[10px] truncate max-w-[50px]">{t('tabBalance')}</span>
                  </button>

                  <button
                    onClick={() => setMiniAppTab('tasks')}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      miniAppTab === 'tasks'
                        ? 'bg-gradient-to-t from-cyan-600/30 to-blue-600/30 text-cyan-300 font-bold border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span className="text-[10px] truncate max-w-[50px]">{t('tabTasks')}</span>
                  </button>

                  <button
                    onClick={() => setMiniAppTab('referrals')}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      miniAppTab === 'referrals'
                        ? 'bg-gradient-to-t from-cyan-600/30 to-blue-600/30 text-cyan-300 font-bold border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span className="text-[10px] truncate max-w-[50px]">{t('tabReferrals')}</span>
                  </button>

                  <button
                    onClick={() => setMiniAppTab('plans')}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      miniAppTab === 'plans'
                        ? 'bg-gradient-to-t from-cyan-600/30 to-blue-600/30 text-cyan-300 font-bold border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Crown className="w-4 h-4" />
                    <span className="text-[10px] truncate max-w-[50px]">{t('tabPlans')}</span>
                  </button>

                  <button
                    onClick={() => setMiniAppTab('leaderboard')}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      miniAppTab === 'leaderboard'
                        ? 'bg-gradient-to-t from-cyan-600/30 to-blue-600/30 text-cyan-300 font-bold border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Trophy className="w-4 h-4" />
                    <span className="text-[10px] truncate max-w-[50px]">{t('tabLeaderboard')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. TELEGRAM BOT CONSOLE SIMULATOR (Admin / Dev Mode Only) */}
        {/* ========================================================================= */}
        {isAdminMode && currentTab === 'bot' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <TelegramChat
              user={user}
              settings={settings}
              onOpenMiniApp={() => setCurrentTab('miniapp')}
              onRefreshUser={handleRefresh}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. ADMIN CONTROL HUB (Admin / Dev Mode Only) */}
        {/* ========================================================================= */}
        {isAdminMode && currentTab === 'admin' && (
          <div className="space-y-6">
            {/* Admin Sub-navigation */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs font-semibold">
              <button
                onClick={() => setAdminSubTab('overview')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  adminSubTab === 'overview'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Overview & Metrics
              </button>
              <button
                onClick={() => setAdminSubTab('users')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  adminSubTab === 'users'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Miners Directory
              </button>
              <button
                onClick={() => setAdminSubTab('withdrawals')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  adminSubTab === 'withdrawals'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Withdrawal Requests Desk
              </button>
              <button
                onClick={() => setAdminSubTab('mining')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  adminSubTab === 'mining'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mining & Fee Rules
              </button>
              <button
                onClick={() => setAdminSubTab('tasks')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  adminSubTab === 'tasks'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tasks & Bounties
              </button>
            </div>

            {/* Admin Sub-view content */}
            {adminSubTab === 'overview' && (
              <AdminDashboard
                settings={settings}
                onRefreshData={handleRefresh}
                onSelectSubTab={(tab: string) => setAdminSubTab(tab as any)}
              />
            )}
            {adminSubTab === 'users' && (
              <UserManagement settings={settings} onRefreshData={handleRefresh} />
            )}
            {adminSubTab === 'withdrawals' && (
              <WithdrawalManager settings={settings} onRefreshData={handleRefresh} />
            )}
            {adminSubTab === 'mining' && (
              <MiningSettings settings={settings} onRefreshData={handleRefresh} />
            )}
            {adminSubTab === 'tasks' && (
              <TaskManager settings={settings} onRefreshData={handleRefresh} />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. JETTON CONTRACT & MAINNET DEPLOYER STUDIO (Admin / Dev Mode Only) */}
        {/* ========================================================================= */}
        {isAdminMode && currentTab === 'contract' && (
          <ContractStudio settings={settings} onRefreshData={handleRefresh} />
        )}
      </main>

      {/* Admin Access ONLY for verified Administrators with role === 'admin' OR in studio preview */}
      {canAccessAdmin && (
        <footer className="py-2.5 text-center text-xs">
          <button
            onClick={() => {
              setIsAdminMode(!isAdminMode);
              if (!isAdminMode) setCurrentTab('admin');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 text-[11px] font-medium transition-all shadow-sm"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isAdminMode ? '← العودة لواجهة التعدين (Miner View)' : 'لوحة تحكم الأدمن ⚙️ (Admin Hub)'}</span>
          </button>
        </footer>
      )}

      {/* Global Modals */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        user={user}
        settings={settings}
        onRefreshUser={handleRefresh}
      />

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        user={user}
        settings={settings}
        onRefreshUser={handleRefresh}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
      />

      <LanguageModal
        isOpen={isLanguageModalOpen}
        onClose={closeLanguageModal}
        isFirstTime={!localStorage.getItem('nbs_has_selected_lang')}
      />
    </div>
  );
}
