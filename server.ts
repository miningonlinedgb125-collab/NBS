import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { storage } from './src/services/storage';
import { calculateMiningProgress, startMiningCycle } from './src/engines/mining';
import { createLedgerEntry } from './src/engines/accounting';
import { handleBotIncomingMessage } from './src/engines/bot-handler';
import { isValidTonAddress, verifyTonActivationPayment, OFFICIAL_FEE_WALLET, ACTIVATION_FEE_TON, addressesMatch } from './src/engines/ton';
import { calculateReferralRewards } from './src/engines/referrals';
import { calculateSubscriptionExpiry, getTierById, DEFAULT_SUBSCRIPTION_TIERS } from './src/engines/subscriptions';
import { buildMetadataJson, calculateSupplyAllocations } from './src/contracts/jetton-utils';
import fs from 'fs';
import { spawn } from 'child_process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

export const PERMANENT_PRODUCTION_URL = 'https://applet-roan-phi.vercel.app';

export function getPublicAppUrl(): string {
  return PERMANENT_PRODUCTION_URL;
}

const APP_URL = getPublicAppUrl();

app.use(express.json());

// =========================================================================
// API ROUTES
// =========================================================================

// Health Check Endpoints
app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    service: 'NBS Cloud Mining Hub',
    network: 'TON Mainnet',
    url: getPublicAppUrl(),
  });
});

// 1. Settings
app.get('/api/settings', (_req: Request, res: Response) => {
  const settings = storage.getSettings();
  // Hide secret bot token from public settings
  const { telegramBotToken, ...publicSettings } = settings;
  res.json({ success: true, settings: publicSettings });
});

// Token Logo Image
app.get('/api/token-logo.jpg', (_req: Request, res: Response) => {
  const p = path.resolve(__dirname, 'public/nbs-logo.jpg');
  if (fs.existsSync(p)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.sendFile(p);
  } else {
    res.status(404).send('Logo not found');
  }
});

// TON Connect dynamic manifest
app.get('/tonconnect-manifest.json', (_req: Request, res: Response) => {
  const publicUrl = getPublicAppUrl();
  res.json({
    url: publicUrl,
    name: 'NBS Cloud Mining Protocol',
    iconUrl: `${publicUrl}/nbs-logo.jpg`,
    termsOfUseUrl: `${publicUrl}/terms`,
    privacyPolicyUrl: `${publicUrl}/privacy`,
  });
});

// Direct Download Token Logo
app.get('/api/download-logo', (_req: Request, res: Response) => {
  const p = path.resolve(__dirname, 'public/nbs-logo.jpg');
  if (fs.existsSync(p)) {
    res.setHeader('Content-Disposition', 'attachment; filename="NBS-Token-Official-Logo.jpg"');
    res.setHeader('Content-Type', 'image/jpeg');
    res.sendFile(p);
  } else {
    res.status(404).send('Logo not found');
  }
});

// Download Complete Project Source Zip (for GitHub upload and 24/7 Hosting)
app.get('/api/download-project', (_req: Request, res: Response) => {
  const p = path.resolve(__dirname, 'public/nbs-mining-project.zip');
  if (fs.existsSync(p)) {
    res.setHeader('Content-Disposition', 'attachment; filename="nbs-mining-project.zip"');
    res.setHeader('Content-Type', 'application/zip');
    res.sendFile(p);
  } else {
    res.status(404).json({ success: false, message: 'Archive not found' });
  }
});

// 2. Auth / Get Profile
app.post('/api/user/auth', (req: Request, res: Response) => {
  const { userId, username, firstName, lastName, referralCode } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID is required' });
  }

  let user = storage.getUser(userId);
  if (!user) {
    const settings = storage.getSettings();
    let referrerId: string | undefined = undefined;

    if (referralCode) {
      const cleanRef = referralCode.replace(/^ref_/, '');
      let referrer = storage.getUser(cleanRef);
      if (!referrer) {
        referrer = storage.getUserByReferralCode(cleanRef);
      }
      if (referrer && referrer.id !== userId) {
        referrerId = referrer.id;
      }
    }

    user = {
      id: userId,
      username: username || `user_${userId.slice(0, 6)}`,
      firstName: firstName || 'Miner',
      lastName: lastName || '',
      isWalletActivated: false,
      createdAt: Date.now(),
      referralCode: userId,
      referredBy: referrerId,
      totalReferrals: 0,
      activeReferrals: 0,
      miningState: {
        isMining: false,
        lastStartTime: 0,
        durationHours: settings.miningCycleHours || 24,
        cycleEndTime: 0,
        streakDays: 0,
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
      role: userId === 'admin_999' ? 'admin' : 'user',
    };

    if (referrerId) {
      const referrer = storage.getUser(referrerId);
      if (referrer) {
        referrer.totalReferrals += 1;
        storage.saveUser(referrer);
      }
    }

    storage.saveUser(user);
  }

  // Calculate live progress
  const settings = storage.getSettings();
  const miningProgress = calculateMiningProgress(
    user.miningState,
    settings.baseMiningDailyReward,
    user.subscription
  );

  res.json({ success: true, user, miningProgress });
});

// Update User Preferred Language (persists across sessions)
app.post('/api/user/:id/language', (req: Request, res: Response) => {
  const { language } = req.body;
  const user = storage.getUser(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.language = language;
  user.hasSelectedLanguage = true;
  storage.saveUser(user);
  res.json({ success: true, user });
});

app.get('/api/user/:id', (req: Request, res: Response) => {
  const user = storage.getUser(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const settings = storage.getSettings();
  const miningProgress = calculateMiningProgress(
    user.miningState,
    settings.baseMiningDailyReward,
    user.subscription
  );

  res.json({ success: true, user, miningProgress });
});

// 3. Connect Wallet
// 3. Connect/Update Wallet (Stage 1: Link Address)
app.post('/api/user/:id/wallet/connect', (req: Request, res: Response) => {
  const { walletAddress } = req.body;
  const user = storage.getUser(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (!isValidTonAddress(walletAddress)) {
    return res.status(400).json({ success: false, message: 'صيغة عنوان محفظة TON غير صالحة. يجب أن يبدأ بـ UQ أو EQ.' });
  }

  const cleanAddr = walletAddress.trim();
  user.walletAddress = cleanAddr;
  if (!user.activatedWallets) user.activatedWallets = [];

  // Check if this wallet was already activated in the past (no fee needed)
  const alreadyActivated = user.activatedWallets.some((w) => addressesMatch(w, cleanAddr));

  if (alreadyActivated) {
    user.isWalletActivated = true;
    storage.saveUser(user);
    return res.json({
      success: true,
      user,
      message: 'تم إعادة ربط محفظتك المعتمدة مسبقاً بنجاح! تم تفعيل الحساب دون الحاجة لدفع رسوم مجدداً.',
      isAlreadyPaid: true,
    });
  }

  // New wallet: Requires Stage 2 payment
  user.isWalletActivated = false;
  storage.saveUser(user);

  res.json({
    success: true,
    user,
    message: 'تم ربط المحفظة بنجاح. يرجى الانتقال للمرحلة الثانية لدفع رسوم التفعيل (0.05 TON).',
    isAlreadyPaid: false,
    activationDetails: {
      amountTon: ACTIVATION_FEE_TON,
    },
  });
});

// 3.1 Disconnect Wallet
app.post('/api/user/:id/wallet/disconnect', (req: Request, res: Response) => {
  const user = storage.getUser(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // Remember if the current wallet was active so re-linking won't recharge fee
  if (user.isWalletActivated && user.walletAddress) {
    if (!user.activatedWallets) user.activatedWallets = [];
    if (!user.activatedWallets.some((w) => addressesMatch(w, user.walletAddress!))) {
      user.activatedWallets.push(user.walletAddress);
    }
  }

  user.walletAddress = '';
  user.isWalletActivated = false;
  storage.saveUser(user);

  res.json({
    success: true,
    message: 'تم فصل المحفظة بنجاح.',
    user,
  });
});

// 4. Verify Wallet Activation (Stage 2: 0.05 TON Payment)
app.post('/api/user/:id/wallet/verify-activation', async (req: Request, res: Response) => {
  const user = storage.getUser(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const { txHash, walletAddress } = req.body;
  const settings = storage.getSettings();

  if (walletAddress && typeof walletAddress === 'string' && walletAddress.trim()) {
    user.walletAddress = walletAddress.trim();
  }

  if (!user.walletAddress) {
    return res.status(400).json({ success: false, message: 'يرجى ربط عنوان المحفظة أولاً (المرحلة 1).' });
  }

  if (!user.activatedWallets) user.activatedWallets = [];

  // If already paid in history for this address, activate immediately
  if (user.activatedWallets.some((w) => addressesMatch(w, user.walletAddress!))) {
    user.isWalletActivated = true;
    storage.saveUser(user);
    return res.json({ success: true, message: 'المحفظة مفعلة مسبقاً بنجاح.', user });
  }

  // Strict on-chain check on TON Blockchain Mainnet (matching sender wallet directly without memo)
  const check = await verifyTonActivationPayment(
    user.walletAddress,
    ACTIVATION_FEE_TON,
    OFFICIAL_FEE_WALLET
  );

  if (!check.verified) {
    return res.status(400).json({
      success: false,
      message: check.errorMessage || 'لم يتم العثور على معاملة بقيمة 0.05 TON من محفظتك حتى الآن.',
    });
  }

  const finalTxHash = check.txHash || txHash || `tx_act_${Date.now()}`;
  user.isWalletActivated = true;
  user.activationTxHash = finalTxHash;

  // Add to activatedWallets list so changing back to it is always free
  if (!user.activatedWallets.some((w) => addressesMatch(w, user.walletAddress!))) {
    user.activatedWallets.push(user.walletAddress);
  }

  // Log activation fee payment in ledger
  storage.addLedgerEntry(
    createLedgerEntry({
      userId: user.id,
      type: 'WALLET_ACTIVATION_FEE',
      amount: ACTIVATION_FEE_TON,
      currency: 'TON',
      direction: 'DEBIT',
      description: `0.05 TON Account Activation fee paid`,
      referenceId: finalTxHash,
      status: 'COMPLETED',
    })
  );

  // Reward referrer strictly 100 NBS upon friend's first wallet activation (idempotent)
  if (user.referredBy && !user.referrerRewarded) {
    const referrer = storage.getUser(user.referredBy);
    if (referrer) {
      referrer.activeReferrals += 1;
      const rewards = calculateReferralRewards('ACTIVATION', {
        baseActivationReward: 100,
      });

      storage.addLedgerEntry(
        createLedgerEntry({
          userId: referrer.id,
          type: 'REFERRAL_ACTIVATION',
          amount: rewards.referrerReward || 100,
          currency: 'JETTON',
          direction: 'CREDIT',
          description: `Referral activation reward (+100 NBS) for friend @${user.username}`,
        })
      );
      storage.saveUser(referrer);
      user.referrerRewarded = true;
    }
  }

  storage.saveUser(user);
  return res.json({
    success: true,
    message: 'تم تفعيل المحفظة بنجاح على شبكة TON Mainnet!',
    user,
    officialReceivingWallet: OFFICIAL_FEE_WALLET,
  });
});

// 5. Mining: Start Cycle
app.post('/api/mining/start', (req: Request, res: Response) => {
  const { userId } = req.body;
  const user = storage.getUser(userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const settings = storage.getSettings();
  if (!settings.isMiningEnabled) {
    return res.status(400).json({ success: false, message: 'Mining is temporarily paused.' });
  }

  if (user.miningState.isMining) {
    const progress = calculateMiningProgress(
      user.miningState,
      settings.baseMiningDailyReward,
      user.subscription
    );
    if (!progress.isFinished) {
      return res.status(400).json({
        success: false,
        message: 'A 24-hour mining cycle is already active.',
        progress,
      });
    }
  }

  user.miningState = startMiningCycle(user.miningState, settings.miningCycleHours);
  storage.saveUser(user);

  const progress = calculateMiningProgress(
    user.miningState,
    settings.baseMiningDailyReward,
    user.subscription
  );

  res.json({ success: true, message: 'Mining cycle started!', user, progress });
});

// 6. Mining: Claim Reward
app.post('/api/mining/claim', (req: Request, res: Response) => {
  const { userId } = req.body;
  const user = storage.getUser(userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const settings = storage.getSettings();
  const progress = calculateMiningProgress(
    user.miningState,
    settings.baseMiningDailyReward,
    user.subscription
  );

  if (!progress.isFinished) {
    return res.status(400).json({
      success: false,
      message: `Mining cycle is not yet finished (${Math.ceil(progress.secondsRemaining / 60)} minutes left).`,
      progress,
    });
  }

  const claimAmount = progress.expectedTotalReward;
  user.miningState.isMining = false;
  user.miningState.totalMined += claimAmount;
  user.miningState.lastClaimTime = Date.now();

  storage.addLedgerEntry(
    createLedgerEntry({
      userId: user.id,
      type: 'MINING_REWARD',
      amount: claimAmount,
      currency: 'JETTON',
      direction: 'CREDIT',
      description: `Daily Mining Reward (Cycle #${user.miningState.streakDays})`,
    })
  );

  storage.saveUser(user);

  res.json({
    success: true,
    message: `Successfully claimed ${claimAmount} ${settings.tokenSymbol}!`,
    claimedAmount: claimAmount,
    user,
  });
});

// 7. Tasks
app.get('/api/tasks', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const tasks = storage.getTasks().filter((t) => t.isActive);
  const progress = userId ? storage.getUserTaskProgress(userId) : [];

  res.json({ success: true, tasks, progress });
});

app.post('/api/tasks/complete', async (req: Request, res: Response) => {
  const { userId, taskId } = req.body;
  const user = storage.getUser(userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const task = storage.getTask(taskId);
  if (!task || !task.isActive) {
    return res.status(404).json({ success: false, message: 'Task not found or inactive' });
  }

  const progressList = storage.getUserTaskProgress(userId);
  const alreadyDone = progressList.some((p) => p.taskId === taskId && p.status === 'COMPLETED');
  if (alreadyDone) {
    return res.status(400).json({ success: false, message: 'المهمة مكتملة ومستلمة مسبقاً.' });
  }

  // 1. Referral Task Verification
  if (task.category === 'referral' && task.targetCount) {
    const qualifiedCount = Math.max(user.activeReferrals || 0, user.totalReferrals || 0);
    if (qualifiedCount < task.targetCount) {
      return res.status(400).json({
        success: false,
        message: `المهمة تتطلب دعوة ${task.targetCount} أصدقاء (لديك حالياً ${qualifiedCount}).`,
      });
    }
  }

  // 2. Telegram Channel / Group Verification
  if (task.category === 'telegram' && task.channelId) {
    const settings = storage.getSettings();
    const token = settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    if (token && /^\d+$/.test(userId)) {
      try {
        const tgRes = await fetch(
          `https://api.telegram.org/bot${token}/getChatMember?chat_id=${encodeURIComponent(
            task.channelId
          )}&user_id=${userId}`
        );
        const tgData = await tgRes.json();
        if (tgData.ok && tgData.result) {
          const memberStatus = tgData.result.status;
          if (['left', 'kicked'].includes(memberStatus)) {
            return res.status(400).json({
              success: false,
              message: 'يرجى الانضمام إلى القناة أولاً عبر الرابط قبل المطالبة بالمكافأة.',
            });
          }
        }
      } catch {}
    }
  }

  // Record completion
  storage.setTaskProgress({
    taskId,
    userId,
    status: 'COMPLETED',
    completedAt: Date.now(),
  });

  // Credit reward in ledger
  storage.addLedgerEntry(
    createLedgerEntry({
      userId: user.id,
      type: 'TASK_REWARD',
      amount: task.reward,
      currency: 'JETTON',
      direction: 'CREDIT',
      description: `Task Reward: ${task.title}`,
      referenceId: task.id,
    })
  );

  res.json({
    success: true,
    message: `تهانينا! تم التحقق من إكمال المهمة وإضافة +${task.reward} NBS لرصيدك.`,
    user: storage.getUser(userId),
  });
});

// 8. Subscriptions
app.get('/api/subscriptions/tiers', (_req: Request, res: Response) => {
  res.json({ success: true, tiers: DEFAULT_SUBSCRIPTION_TIERS });
});

app.post('/api/subscriptions/purchase', (req: Request, res: Response) => {
  const { userId, tierId, durationMonths, txHash } = req.body;
  const user = storage.getUser(userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const tier = getTierById(tierId);
  if (!tier) return res.status(400).json({ success: false, message: 'Invalid subscription tier' });

  const months = (durationMonths === 12 ? 12 : durationMonths === 3 ? 3 : 1) as 1 | 3 | 12;
  const price = months === 12 ? tier.priceTonYearly : months === 3 ? tier.priceTonQuarterly : tier.priceTonMonthly;

  const currentExpiry = user.subscription?.expiresAt || 0;
  const newExpiry = calculateSubscriptionExpiry(months, Date.now(), currentExpiry);

  user.subscription = {
    tierId: tier.id,
    name: tier.name,
    multiplier: tier.miningMultiplier,
    expiresAt: newExpiry,
    purchasedAt: Date.now(),
    txHash: txHash || `tx_sub_${Date.now()}`,
  };

  // Add ledger entry for record
  storage.addLedgerEntry(
    createLedgerEntry({
      userId: user.id,
      type: 'SUBSCRIPTION_PAYMENT',
      amount: price,
      currency: 'TON',
      direction: 'DEBIT',
      description: `Purchased ${tier.name} (${months} month(s))`,
      referenceId: user.subscription.txHash,
    })
  );

  storage.saveUser(user);

  res.json({
    success: true,
    message: `Upgraded to ${tier.name}! Mining multiplier is now ${tier.miningMultiplier}x.`,
    user,
  });
});

// 9. Withdrawals
app.post('/api/withdrawals/request', (req: Request, res: Response) => {
  const { userId, amount, destinationAddress } = req.body;
  const user = storage.getUser(userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const settings = storage.getSettings();
  if (!settings.isWithdrawalEnabled) {
    return res.status(400).json({ success: false, message: 'Withdrawals are temporarily paused.' });
  }

  if (!user.isWalletActivated) {
    return res.status(400).json({
      success: false,
      message: 'Account not activated. You must activate your wallet with 0.05 TON before withdrawing.',
    });
  }

  const withdrawAmount = Number(amount);
  if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid withdrawal amount.' });
  }

  if (withdrawAmount < settings.minWithdrawalJetton) {
    return res.status(400).json({
      success: false,
      message: `Minimum withdrawal is ${settings.minWithdrawalJetton} ${settings.tokenSymbol}.`,
    });
  }

  if (withdrawAmount > user.balances.availableJetton) {
    return res.status(400).json({
      success: false,
      message: `Insufficient available balance (${user.balances.availableJetton} ${settings.tokenSymbol} available).`,
    });
  }

  const targetWallet = destinationAddress || user.walletAddress;
  if (!targetWallet || !isValidTonAddress(targetWallet)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid destination TON address.',
    });
  }

  const fee = settings.withdrawalFeeJetton || 2;
  const netAmount = Math.max(0, withdrawAmount - fee);

  const withdrawalId = `w_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Log pending withdrawal in ledger (locks funds)
  storage.addLedgerEntry(
    createLedgerEntry({
      userId: user.id,
      type: 'WITHDRAWAL_REQUEST',
      amount: withdrawAmount,
      currency: 'JETTON',
      direction: 'DEBIT',
      description: `Withdrawal request to ${targetWallet.slice(0, 8)}... (${netAmount} Jetton net, ${fee} fee)`,
      referenceId: withdrawalId,
      status: 'PENDING',
    })
  );

  const request = storage.addWithdrawal({
    id: withdrawalId,
    userId: user.id,
    username: user.username,
    walletAddress: targetWallet,
    amount: withdrawAmount,
    fee,
    netAmount,
    status: 'PENDING',
    requestedAt: Date.now(),
  });

  res.json({
    success: true,
    message: 'Withdrawal request submitted! It will be processed to TON Mainnet.',
    withdrawal: request,
    user: storage.getUser(userId),
  });
});

app.get('/api/withdrawals/history', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });
  const withdrawals = storage.getUserWithdrawals(userId);
  res.json({ success: true, withdrawals });
});

// 10. Ledger History
app.get('/api/ledger', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });
  const entries = storage.getUserLedger(userId);
  res.json({ success: true, ledger: entries });
});

// 11. Leaderboard
app.get('/api/leaderboard', (_req: Request, res: Response) => {
  const users = storage.getAllUsers().filter((u) => !u.isBanned);
  const topMiners = [...users]
    .sort((a, b) => b.balances.totalEarned - a.balances.totalEarned)
    .slice(0, 10);
  const topReferrers = [...users]
    .sort((a, b) => b.totalReferrals - a.totalReferrals)
    .slice(0, 10);

  res.json({ success: true, topMiners, topReferrers });
});

// 12. Bot Simulation / Webhook
app.post('/api/bot/message', async (req: Request, res: Response) => {
  const { userId, username, firstName, text } = req.body;
  if (!userId || !text) {
    return res.status(400).json({ success: false, message: 'Missing userId or text' });
  }

  const response = await handleBotIncomingMessage({
    userId,
    username: username || 'Miner',
    firstName: firstName || 'User',
    text,
    appUrl: APP_URL,
  });

  res.json({ success: true, response });
});

// Real Telegram Webhook Receiver
app.post('/api/bot/webhook', async (req: Request, res: Response) => {
  const update = req.body;
  try {
    if (update.message) {
      const msg = update.message;
      const userId = msg.from.id.toString();
      const username = msg.from.username || msg.from.first_name || 'user';
      const text = msg.text || '';

      await handleBotIncomingMessage({
        userId,
        username,
        firstName: msg.from.first_name,
        lastName: msg.from.last_name,
        text,
        appUrl: APP_URL,
      });
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }
  res.status(200).send('OK');
});

// =========================================================================
// ADMIN CONTROLS
// =========================================================================

app.get('/api/admin/overview', (_req: Request, res: Response) => {
  const users = storage.getAllUsers();
  const settings = storage.getSettings();
  const withdrawals = storage.getWithdrawals();
  const ledger = storage.getAllLedgerEntries();

  const activatedUsers = users.filter((u) => u.isWalletActivated);
  const totalFeesTon = activatedUsers.length * settings.activationFeeTon;
  const activeSubs = users.filter((u) => u.subscription.tierId !== 'free' && u.subscription.expiresAt > Date.now());
  const totalJettonEarned = users.reduce((acc, u) => acc + u.balances.totalEarned, 0);
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'PENDING');

  res.json({
    success: true,
    stats: {
      totalUsers: users.length,
      activatedWallets: activatedUsers.length,
      totalFeesTon,
      activeSubscriptions: activeSubs.length,
      totalJettonDistributed: totalJettonEarned,
      pendingWithdrawalsCount: pendingWithdrawals.length,
      pendingWithdrawalsAmount: pendingWithdrawals.reduce((acc, w) => acc + w.amount, 0),
    },
    settings,
  });
});

app.get('/api/admin/users', (req: Request, res: Response) => {
  const q = ((req.query.q as string) || '').toLowerCase();
  let users = storage.getAllUsers();
  if (q) {
    users = users.filter(
      (u) =>
        u.id.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.firstName.toLowerCase().includes(q) ||
        (u.walletAddress && u.walletAddress.toLowerCase().includes(q))
    );
  }
  res.json({ success: true, users });
});

app.post('/api/admin/users/:id/ban', (req: Request, res: Response) => {
  const user = storage.getUser(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.isBanned = !user.isBanned;
  storage.saveUser(user);
  res.json({ success: true, user });
});

app.post('/api/admin/users/:id/activate-wallet', (req: Request, res: Response) => {
  const user = storage.getUser(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.isWalletActivated = true;
  user.activationTxHash = `tx_admin_override_${Date.now()}`;
  storage.saveUser(user);
  res.json({ success: true, user });
});

app.post('/api/admin/settings', async (req: Request, res: Response) => {
  const updated = storage.updateSettings(req.body);
  const token = updated.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  if (token) {
    const url = getPublicAppUrl();
    await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: '⚡ Open NBS App',
          web_app: { url },
        },
      }),
    }).catch(() => {});
  }
  res.json({ success: true, settings: updated });
});

app.get('/api/admin/tasks', (_req: Request, res: Response) => {
  const tasks = storage.getTasks();
  const progress = storage.getUserTaskProgress(''); // all or count
  res.json({ success: true, tasks });
});

app.post('/api/admin/tasks', (req: Request, res: Response) => {
  const task = req.body;
  if (!task.id) {
    task.id = `task_${Date.now()}`;
    task.createdAt = Date.now();
  }
  if (task.reward !== undefined) task.reward = Number(task.reward) || 20;
  if (task.isActive === undefined) task.isActive = true;
  storage.saveTask(task);
  res.json({ success: true, task });
});

app.put('/api/admin/tasks/:id', (req: Request, res: Response) => {
  const existing = storage.getTask(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: 'Task not found' });
  const updated = { ...existing, ...req.body, id: existing.id };
  if (updated.reward !== undefined) updated.reward = Number(updated.reward) || 20;
  storage.saveTask(updated);
  res.json({ success: true, task: updated });
});

app.delete('/api/admin/tasks/:id', (req: Request, res: Response) => {
  const success = storage.deleteTask(req.params.id);
  res.json({ success });
});

app.post('/api/admin/withdrawals/:id/action', (req: Request, res: Response) => {
  const { action, blockchainTxHash, adminNote } = req.body;
  const withdrawal = storage.getWithdrawals().find((w) => w.id === req.params.id);
  if (!withdrawal) return res.status(404).json({ success: false, message: 'Withdrawal not found' });

  if (action === 'APPROVE') {
    withdrawal.status = 'EXECUTED';
    withdrawal.processedAt = Date.now();
    withdrawal.blockchainTxHash = blockchainTxHash || `tx_jetton_transfer_${Date.now()}`;
    withdrawal.adminNote = adminNote || 'Approved and sent via TON Mainnet Jetton Master';

    // Update corresponding ledger entry to COMPLETED
    const ledger = storage.getAllLedgerEntries().find((e) => e.referenceId === withdrawal.id);
    if (ledger) {
      ledger.status = 'COMPLETED';
    }
  } else if (action === 'REJECT') {
    withdrawal.status = 'REJECTED';
    withdrawal.processedAt = Date.now();
    withdrawal.adminNote = adminNote || 'Rejected by admin';

    // Refund locked balance to user
    const ledger = storage.getAllLedgerEntries().find((e) => e.referenceId === withdrawal.id);
    if (ledger) {
      ledger.status = 'REJECTED';
    }

    // Add explicit refund transaction
    storage.addLedgerEntry(
      createLedgerEntry({
        userId: withdrawal.userId,
        type: 'WITHDRAWAL_REFUND',
        amount: withdrawal.amount,
        currency: 'JETTON',
        direction: 'CREDIT',
        description: `Refund for rejected withdrawal (${withdrawal.id}): ${adminNote || ''}`,
      })
    );
  }

  storage.updateWithdrawal(withdrawal.id, withdrawal);
  res.json({ success: true, withdrawal });
});

// Smart contract code and metadata inspection
app.get('/api/admin/jetton-contract', (_req: Request, res: Response) => {
  const settings = storage.getSettings();
  const masterCodePath = path.resolve(__dirname, 'src/contracts/JettonMaster.fc');
  const walletCodePath = path.resolve(__dirname, 'src/contracts/JettonWallet.fc');

  const masterFunC = fs.existsSync(masterCodePath) ? fs.readFileSync(masterCodePath, 'utf-8') : '';
  const walletFunC = fs.existsSync(walletCodePath) ? fs.readFileSync(walletCodePath, 'utf-8') : '';

  const metadata = {
    name: settings.tokenName,
    symbol: settings.tokenSymbol,
    decimals: settings.tokenDecimals.toString(),
    description: `Official utility Jetton for the ${settings.tokenName} Mining Protocol on TON Blockchain.`,
    image: `${APP_URL}/api/token-logo.jpg`,
  };

  const metadataJson = buildMetadataJson(metadata);
  const allocations = calculateSupplyAllocations(settings.totalSupply);

  res.json({
    success: true,
    masterFunC,
    walletFunC,
    metadata,
    metadataJson,
    allocations,
    settings,
  });
});

// =========================================================================
// VITE OR STATIC FRONTEND MOUNTING
// =========================================================================

// Telegram Bot Live Messaging Helper
async function sendTelegramMessage(token: string, chatId: number | string, response: any) {
  try {
    if (response.sendLogo) {
      const logoPath = path.resolve(__dirname, 'public/nbs-logo.jpg');
      if (fs.existsSync(logoPath)) {
        const fileBuffer = fs.readFileSync(logoPath);
        const form = new FormData();
        form.append('chat_id', chatId.toString());
        form.append('caption', response.text || '💎 NBS Token Official Logo');
        form.append('parse_mode', response.parseMode || 'Markdown');
        form.append('photo', new Blob([fileBuffer], { type: 'image/jpeg' }), 'NBS-Token-Logo.jpg');
        if (response.replyMarkup) {
          form.append('reply_markup', JSON.stringify(response.replyMarkup));
        }

        await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          body: form,
        });
        return;
      }
    }

    const payload: any = {
      chat_id: chatId,
      text: response.text,
      parse_mode: response.parseMode || 'Markdown',
    };
    if (response.replyMarkup) {
      payload.reply_markup = response.replyMarkup;
    }
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
  }
}

async function initTelegramBot() {
  const settings = storage.getSettings();
  const token = settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  try {
    // 1. Register Bot Commands with Telegram API
    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Start NBS Mining & Open App' },
          { command: 'history', description: 'Transaction History' },
          { command: 'help', description: 'Help & Support' },
        ],
      }),
    });

    // 2. Set Native Web App Menu Button in Telegram Chat (Opens Mini App directly beside chat input!)
    const publicAppUrl = getPublicAppUrl();
    const menuResp = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: '⚡ Open NBS App',
          web_app: {
            url: publicAppUrl,
          },
        },
      }),
    });
    const menuData = await menuResp.json();
    console.log('🤖 Telegram WebApp Menu Button configured:', menuData);

    // 3. Clear any conflicting webhook so polling can receive updates directly
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    console.log(`🤖 Telegram Bot initialized: @${settings.telegramBotUsername}`);

    // 4. Start background polling loop for real Telegram chat interactions
    let offset = 0;
    const pollUpdates = async () => {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=15`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.result)) {
            for (const update of data.result) {
              offset = update.update_id + 1;
              if (update.message) {
                const msg = update.message;
                const userId = msg.from.id.toString();
                const username = msg.from.username || msg.from.first_name || 'user';
                const text = msg.text || '';

                const botResp = await handleBotIncomingMessage({
                  userId,
                  username,
                  firstName: msg.from.first_name,
                  lastName: msg.from.last_name,
                  text,
                  appUrl: getPublicAppUrl(),
                });

                await sendTelegramMessage(token, msg.chat.id, botResp);
              } else if (update.callback_query) {
                const cq = update.callback_query;
                const userId = cq.from.id.toString();
                const username = cq.from.username || cq.from.first_name || 'user';
                const text = cq.data || '';

                // Acknowledge the callback query immediately to dismiss loading state
                fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ callback_query_id: cq.id }),
                }).catch(() => {});

                if (cq.message && cq.message.chat) {
                  const botResp = await handleBotIncomingMessage({
                    userId,
                    username,
                    firstName: cq.from.first_name,
                    lastName: cq.from.last_name,
                    text,
                    appUrl: getPublicAppUrl(),
                  });

                  await sendTelegramMessage(token, cq.message.chat.id, botResp);
                }
              }
            }
          }
        }
      } catch (err) {
        // Silently continue polling on network hiccups
      }
      setTimeout(pollUpdates, 2000);
    };

    pollUpdates();
  } catch (err) {
    console.error('Error during Telegram bot init:', err);
  }
}

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 TON Mining Bot & Jetton Server running on port ${PORT}`);
    initTelegramBot();
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
