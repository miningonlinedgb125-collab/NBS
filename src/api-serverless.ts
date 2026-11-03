import express, { Request, Response } from 'express';
import { storage } from './services/storage';
import { calculateMiningProgress, startMiningCycle } from './engines/mining';
import { createLedgerEntry } from './engines/accounting';
import { handleBotIncomingMessage } from './engines/bot-handler';
import { isValidTonAddress, verifyTonActivationPayment, OFFICIAL_FEE_WALLET, ACTIVATION_FEE_TON, addressesMatch } from './engines/ton';
import { calculateReferralRewards } from './engines/referrals';
import { calculateSubscriptionExpiry, getTierById } from './engines/subscriptions';
import { buildMetadataJson, calculateSupplyAllocations } from './contracts/jetton-utils';

const app = express();
app.use(express.json());

// Enable CORS for all requests
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (_req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

const PERMANENT_PRODUCTION_URL = 'https://applet-roan-phi.vercel.app';

// Health Check Endpoints
app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    service: 'NBS Cloud Mining Hub',
    network: 'TON Mainnet',
    url: PERMANENT_PRODUCTION_URL,
    provider: 'Vercel Serverless',
  });
});

// 1. Settings - GET & POST (Connected to Admin Dashboard)
app.get(['/api/settings', '/settings', '/api/admin/settings', '/admin/settings'], (_req: Request, res: Response) => {
  try {
    const settings = storage.getSettings();
    const { telegramBotToken, ...publicSettings } = settings;
    res.json({ success: true, settings: publicSettings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/settings', '/settings', '/api/admin/settings', '/admin/settings'], (req: Request, res: Response) => {
  try {
    const updated = storage.updateSettings(req.body);
    const { telegramBotToken, ...publicSettings } = updated;
    res.json({ success: true, settings: publicSettings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. User Authentication & Profile
app.post(['/api/user/auth', '/user/auth'], (req: Request, res: Response) => {
  try {
    const { userId, username, firstName, lastName, referralCode, language } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    let user = storage.getUser(userId);
    const settings = storage.getSettings();

    if (!user) {
      // Create fresh user
      const referrerId = referralCode ? storage.getUserByReferralCode(referralCode)?.id : undefined;
      const isAdmin = userId === '1878942455';

      user = {
        id: userId,
        username: username || (isAdmin ? 'hamlet1223' : `user_${userId.slice(0, 6)}`),
        firstName: firstName || (isAdmin ? 'Hamlet' : 'Miner'),
        lastName: lastName || '',
        role: isAdmin ? 'admin' : 'user',
        isWalletActivated: false,
        isBanned: false,
        createdAt: Date.now(),
        referralCode: userId,
        referredBy: referrerId,
        totalReferrals: 0,
        activeReferrals: 0,
        language: language || (isAdmin ? 'ar' : 'en'),
        hasSelectedLanguage: Boolean(language),
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
      };

      if (referrerId) {
        const referrer = storage.getUser(referrerId);
        if (referrer) {
          referrer.totalReferrals += 1;
          storage.saveUser(referrer);
        }
      }
    } else {
      if (userId === '1878942455' && user.role !== 'admin') {
        user.role = 'admin';
      }
      if (username) user.username = username;
      if (firstName) user.firstName = firstName;
      if (language && !user.hasSelectedLanguage) {
        user.language = language;
        user.hasSelectedLanguage = true;
      }
    }

    storage.saveUser(user);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get(['/api/user/:id', '/user/:id'], (req: Request, res: Response) => {
  try {
    const user = storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get(['/api/users', '/users'], (_req: Request, res: Response) => {
  try {
    const users = storage.getAllUsers();
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin User Operations
app.post(['/api/user/:id/role', '/user/:id/role'], (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const user = storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    user.role = role === 'admin' ? 'admin' : 'user';
    storage.saveUser(user);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/user/:id/ban', '/user/:id/ban'], (req: Request, res: Response) => {
  try {
    const { isBanned } = req.body;
    const user = storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    user.isBanned = Boolean(isBanned);
    storage.saveUser(user);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/user/:id/balance', '/user/:id/balance'], (req: Request, res: Response) => {
  try {
    const { availableJetton, lockedJetton } = req.body;
    const user = storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (typeof availableJetton === 'number') user.balances.availableJetton = availableJetton;
    if (typeof lockedJetton === 'number') user.balances.lockedJetton = lockedJetton;
    storage.saveUser(user);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Mining Endpoints
app.post(['/api/mining/start', '/mining/start'], (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const user = storage.getUser(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const settings = storage.getSettings();

    user.miningState = startMiningCycle(user.miningState, settings.miningCycleHours || 24);
    storage.saveUser(user);
    res.json({ success: true, miningState: user.miningState, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/mining/claim', '/mining/claim'], (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const user = storage.getUser(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const settings = storage.getSettings();

    const progress = calculateMiningProgress(
      user.miningState,
      settings.baseMiningDailyReward || 50,
      user.subscription
    );

    if (!progress.isFinished) {
      return res.status(400).json({ success: false, error: 'Mining cycle is still in progress' });
    }

    const reward = progress.accumulatedAmount;
    user.balances.availableJetton += reward;
    user.balances.miningEarned += reward;
    user.balances.totalEarned += reward;
    user.miningState.totalMined += reward;
    user.miningState.isMining = false;
    user.miningState.streakDays += 1;

    // Record in double-entry ledger
    createLedgerEntry({
      userId: user.id,
      amount: reward,
      direction: 'CREDIT',
      type: 'MINING_REWARD',
      currency: 'JETTON',
      description: `24h Mining Reward (Day ${user.miningState.streakDays})`,
      status: 'COMPLETED',
    });

    storage.saveUser(user);
    res.json({ success: true, reward, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Tasks Endpoints
app.get(['/api/tasks', '/tasks'], (_req: Request, res: Response) => {
  try {
    const tasks = storage.getTasks();
    res.json({ success: true, tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/tasks/complete', '/tasks/complete', '/api/tasks/:id/complete', '/tasks/:id/complete'], async (req: Request, res: Response) => {
  try {
    const userId = req.body.userId;
    const taskId = req.body.taskId || req.params.id;
    const user = storage.getUser(userId);
    const task = storage.getTask(taskId);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!task || !task.isActive) return res.status(404).json({ success: false, message: 'Task not found or inactive' });

    const progressList = storage.getUserTaskProgress(userId);
    const alreadyDone = progressList.some((p) => p.taskId === taskId && p.status === 'COMPLETED');
    if (alreadyDone) {
      return res.status(400).json({ success: false, message: 'المهمة مكتملة ومستلمة مسبقاً.' });
    }

    // Referral verification
    if (task.category === 'referral' && task.targetCount) {
      const qualified = Math.max(user.activeReferrals || 0, user.totalReferrals || 0);
      if (qualified < task.targetCount) {
        return res.status(400).json({
          success: false,
          message: `المهمة تتطلب دعوة ${task.targetCount} أصدقاء (لديك حالياً ${qualified}).`,
        });
      }
    }

    // Telegram Channel / Group Real Membership Check
    if (task.category === 'telegram' && task.channelId) {
      const settings = storage.getSettings();
      const token = settings.telegramBotToken || '9180620527:AAFR_DNWRbzns3p4b8z9wyw0_-VH6T9c3lM';
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
                message: '❌ لم يتم العثور على اشتراكك في القناة! يرجى الانضمام أولاً عبر الرابط قبل استلام المكافأة.',
              });
            }
          }
        } catch {}
      }
    }

    // Record progress
    storage.setTaskProgress({
      taskId,
      userId,
      status: 'COMPLETED',
      completedAt: Date.now(),
    });

    user.balances.availableJetton += task.reward;
    user.balances.tasksEarned += task.reward;
    user.balances.totalEarned += task.reward;

    createLedgerEntry({
      userId: user.id,
      amount: task.reward,
      direction: 'CREDIT',
      type: 'TASK_REWARD',
      currency: 'JETTON',
      description: `Task Reward: ${task.title}`,
      status: 'COMPLETED',
    });

    storage.saveUser(user);
    res.json({
      success: true,
      reward: task.reward,
      message: `تهانينا! تم التحقق من اشتراكك بنجاح وإضافة +${task.reward} NBS لرصيدك.`,
      user,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post(['/api/tasks', '/tasks'], (req: Request, res: Response) => {
  try {
    const task = storage.saveTask(req.body);
    res.json({ success: true, task });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete(['/api/tasks/:id', '/tasks/:id'], (req: Request, res: Response) => {
  try {
    storage.deleteTask(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Withdrawal Endpoints
app.post(['/api/withdraw', '/withdraw'], (req: Request, res: Response) => {
  try {
    const { userId, amount, destinationAddress } = req.body;
    const user = storage.getUser(userId);
    const settings = storage.getSettings();

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (!user.isWalletActivated || !user.walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet activation required first (0.05 TON)' });
    }
    if (amount < (settings.minWithdrawalJetton || 50)) {
      return res.status(400).json({ success: false, error: `Minimum withdrawal is ${settings.minWithdrawalJetton || 50} NBS` });
    }
    if (user.balances.availableJetton < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    user.balances.availableJetton -= amount;
    user.balances.lockedJetton += amount;

    const fee = settings.withdrawalFeeJetton || 2;
    const request = storage.addWithdrawal({
      id: `w_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      username: user.username || user.firstName,
      walletAddress: destinationAddress || user.walletAddress,
      amount,
      fee,
      netAmount: Math.max(0, amount - fee),
      status: 'PENDING',
      requestedAt: Date.now(),
    });

    createLedgerEntry({
      userId: user.id,
      amount,
      direction: 'DEBIT',
      type: 'WITHDRAWAL_REQUEST',
      currency: 'JETTON',
      description: `Withdrawal Request to ${user.walletAddress?.slice(0, 8)}...`,
      status: 'PENDING',
    });

    storage.saveUser(user);
    res.json({ success: true, withdrawal: request, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get(['/api/withdrawals', '/withdrawals'], (_req: Request, res: Response) => {
  try {
    const withdrawals = storage.getWithdrawals();
    res.json({ success: true, withdrawals });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/withdrawals/:id/approve', '/withdrawals/:id/approve'], (req: Request, res: Response) => {
  try {
    const { txHash } = req.body;
    const item = storage.getWithdrawals().find((w: any) => w.id === req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Withdrawal not found' });

    const updated = storage.updateWithdrawal(item.id, {
      status: 'APPROVED',
      blockchainTxHash: txHash || `tx_ton_${Date.now()}`,
      processedAt: Date.now(),
    });

    const user = storage.getUser(item.userId);
    if (user) {
      user.balances.lockedJetton = Math.max(0, user.balances.lockedJetton - item.amount);
      storage.saveUser(user);
    }

    res.json({ success: true, withdrawal: updated || item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/withdrawals/:id/reject', '/withdrawals/:id/reject'], (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const item = storage.getWithdrawals().find((w: any) => w.id === req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Withdrawal not found' });

    const updated = storage.updateWithdrawal(item.id, {
      status: 'REJECTED',
      processedAt: Date.now(),
    });

    const user = storage.getUser(item.userId);
    if (user) {
      user.balances.lockedJetton = Math.max(0, user.balances.lockedJetton - item.amount);
      user.balances.availableJetton += item.amount;
      storage.saveUser(user);
    }

    res.json({ success: true, withdrawal: updated || item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Double-Entry Ledger History
app.get(['/api/ledger', '/ledger'], (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const ledger = userId ? storage.getUserLedger(userId) : storage.getAllLedgerEntries();
    res.json({ success: true, ledger });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Dashboard Routes
app.get(['/api/admin/overview', '/admin/overview'], (_req: Request, res: Response) => {
  try {
    const users = storage.getAllUsers();
    const settings = storage.getSettings();
    const withdrawals = storage.getWithdrawals();
    const tasks = storage.getTasks();

    const totalUsers = users.length;
    const activeMiners = users.filter((u) => u.miningState.isMining).length;
    const totalMined = users.reduce((sum, u) => sum + (u.balances.miningEarned || 0), 0);
    const pendingWithdrawals = withdrawals.filter((w) => w.status === 'PENDING').length;

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeMiners,
        totalMined,
        pendingWithdrawals,
        totalSupply: settings.totalSupply,
        circulatingSupply: totalMined,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get(['/api/admin/tasks', '/admin/tasks'], (_req: Request, res: Response) => {
  try {
    const tasks = storage.getTasks();
    res.json({ success: true, tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/admin/tasks', '/admin/tasks'], (req: Request, res: Response) => {
  try {
    const task = req.body;
    if (!task.id) {
      task.id = `task_${Date.now()}`;
      task.createdAt = Date.now();
    }
    if (task.reward !== undefined) task.reward = Number(task.reward) || 20;
    if (task.isActive === undefined) task.isActive = true;
    const saved = storage.saveTask(task);
    res.json({ success: true, task: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put(['/api/admin/tasks/:id', '/admin/tasks/:id'], (req: Request, res: Response) => {
  try {
    const existing = storage.getTask(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Task not found' });
    const updated = storage.saveTask({ ...existing, ...req.body });
    res.json({ success: true, task: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete(['/api/admin/tasks/:id', '/admin/tasks/:id'], (req: Request, res: Response) => {
  try {
    storage.deleteTask(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get(['/api/admin/users', '/admin/users'], (_req: Request, res: Response) => {
  try {
    const users = storage.getAllUsers();
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/admin/users/:id/ban', '/admin/users/:id/ban'], (req: Request, res: Response) => {
  try {
    const { isBanned } = req.body;
    const user = storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    user.isBanned = Boolean(isBanned);
    storage.saveUser(user);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/admin/users/:id/activate-wallet', '/admin/users/:id/activate-wallet'], (req: Request, res: Response) => {
  try {
    const user = storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    user.isWalletActivated = true;
    user.activationTxHash = `tx_admin_override_${Date.now()}`;
    storage.saveUser(user);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/admin/withdrawals/:id/action', '/admin/withdrawals/:id/action'], (req: Request, res: Response) => {
  try {
    const { action, txHash, reason } = req.body;
    const item = storage.getWithdrawals().find((w: any) => w.id === req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Withdrawal not found' });

    if (action === 'approve') {
      const updated = storage.updateWithdrawal(item.id, {
        status: 'APPROVED',
        blockchainTxHash: txHash || `tx_ton_${Date.now()}`,
        processedAt: Date.now(),
      });
      const user = storage.getUser(item.userId);
      if (user) {
        user.balances.lockedJetton = Math.max(0, user.balances.lockedJetton - item.amount);
        storage.saveUser(user);
      }
      return res.json({ success: true, withdrawal: updated || item });
    } else if (action === 'reject') {
      const updated = storage.updateWithdrawal(item.id, {
        status: 'REJECTED',
        processedAt: Date.now(),
        adminNote: reason,
      });
      const user = storage.getUser(item.userId);
      if (user) {
        user.balances.lockedJetton = Math.max(0, user.balances.lockedJetton - item.amount);
        user.balances.availableJetton += item.amount;
        storage.saveUser(user);
      }
      return res.json({ success: true, withdrawal: updated || item });
    }

    res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Telegram Bot Webhook (Executes on Vercel 24/7 without dev server!)
app.post(['/api/telegram-webhook', '/telegram-webhook'], async (req: Request, res: Response) => {
  try {
    const settings = storage.getSettings();
    const token = settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '9180620527:AAFR_DNWRbzns3p4b8z9wyw0_-VH6T9c3lM';
    const update = req.body;

    if (!update) {
      return res.status(200).json({ ok: true });
    }

    // Process Message
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat?.id;
      const text = msg.text || '';
      const userId = msg.from?.id ? String(msg.from.id) : String(chatId);
      const username = msg.from?.username;
      const firstName = msg.from?.first_name || 'Miner';

      if (chatId) {
        const botResp = await handleBotIncomingMessage({
          userId,
          username,
          firstName,
          text,
          appUrl: PERMANENT_PRODUCTION_URL,
        });

        // Send response via Telegram Bot API
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: botResp.text,
            parse_mode: botResp.parseMode || 'Markdown',
            reply_markup: botResp.replyMarkup,
          }),
        });
      }
    }

    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
});

export default app;
