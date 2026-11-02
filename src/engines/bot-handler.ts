import { storage } from '../services/storage';
import { calculateMiningProgress, startMiningCycle } from './mining';
import { createLedgerEntry } from './accounting';
import { buildReferralLink, calculateReferralRewards, generateReferralCode } from './referrals';
import { DEFAULT_SUBSCRIPTION_TIERS } from './subscriptions';
import { OFFICIAL_FEE_WALLET, ACTIVATION_FEE_TON, isValidTonAddress, verifyTonActivationPayment, addressesMatch } from './ton';
import { User } from '../types';

export interface BotResponse {
  text: string;
  sendLogo?: boolean;
  parseMode?: 'Markdown' | 'HTML';
  replyMarkup?: {
    inline_keyboard?: { text: string; callback_data?: string; url?: string; web_app?: { url: string } }[][];
    remove_keyboard?: boolean;
  };
}

export async function handleBotIncomingMessage(params: {
  userId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  text: string;
  appUrl: string;
}): Promise<BotResponse> {
  const { userId, username = 'Miner', firstName = 'Friend', text } = params;
  const settings = storage.getSettings();

  // Find or auto-register user
  let user = storage.getUser(userId);

  if (!user) {
    const refCode = generateReferralCode(userId);

    // Check if started with referral parameter e.g. /start ref_1878942455 or /start 1878942455
    let referrerId: string | undefined = undefined;
    const matchRef = text.match(/\/start\s+(?:ref_)?([a-zA-Z0-9_]+)/i);
    if (matchRef && matchRef[1]) {
      const targetCode = matchRef[1];
      let referrer = storage.getUser(targetCode);
      if (!referrer) {
        referrer = storage.getUserByReferralCode(targetCode);
      }
      if (referrer && referrer.id !== userId) {
        referrerId = referrer.id;
      }
    }

    user = {
      id: userId,
      username,
      firstName,
      isWalletActivated: false,
      createdAt: Date.now(),
      referralCode: refCode,
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
      role: 'user',
    };

    // If referred, register referral connection without any signup tokens (0 signup bonus)
    // The ONLY reward is 100 NBS awarded to referrer when referee activates their wallet with 0.05 TON
    if (referrerId) {
      const referrer = storage.getUser(referrerId);
      if (referrer) {
        referrer.totalReferrals += 1;
        storage.saveUser(referrer);
      }
    }

    storage.saveUser(user);
  }

  const cleanCmd = text.trim();
  const lowerCmd = cleanCmd.toLowerCase();

  const rawUrl = params.appUrl || '';
  const webAppUrl = rawUrl.includes('ais-dev-')
    ? rawUrl.replace('ais-dev-', 'ais-pre-').replace(/\/$/, '')
    : rawUrl.startsWith('https://')
    ? rawUrl.replace(/\/$/, '')
    : 'https://ais-pre-qgnc2gkwvy42boe6h3hhmo-557047217099.europe-west3.run.app';

  // Standard Open Mini App Button - strictly clean text as requested by user
  const openAppButton = { text: '🚀 Open NBS Mining App', web_app: { url: webAppUrl } };

  // If user pasted a TON address directly into chat
  if (isValidTonAddress(cleanCmd) || cleanCmd.startsWith('/setwallet ')) {
    const rawAddr = cleanCmd.startsWith('/setwallet ') ? cleanCmd.replace('/setwallet ', '').trim() : cleanCmd;
    if (isValidTonAddress(rawAddr)) {
      user.walletAddress = rawAddr;
      if (!user.activatedWallets) user.activatedWallets = [];

      const wasAlreadyActivated = user.activatedWallets.some((w) => addressesMatch(w, rawAddr));
      if (wasAlreadyActivated) {
        user.isWalletActivated = true;
        storage.saveUser(user);

        return {
          text: `✅ *تم إعادة ربط محفظتك المفعلة مسبقاً!*

📍 *العنوان المعتمد:* \`${rawAddr}\`
الحساب مفعل ومؤكد على شبكة TON Mainnet دون الحاجة لدفع أي رسوم إضافية.
يمكنك الآن استلام السحب والتمتع بمكافآت التعدين.`,
          parseMode: 'Markdown',
          replyMarkup: {
            inline_keyboard: [
              [openAppButton],
              [{ text: '🏧 طلب سحب الرصيد', callback_data: 'cmd_withdraw' }]
            ]
          }
        };
      }

      // New address: requires Stage 2 payment
      user.isWalletActivated = false;
      storage.saveUser(user);

      const tonkeeperLink = `https://app.tonkeeper.com/transfer/${OFFICIAL_FEE_WALLET}?amount=50000000`;

      return {
        text: `✅ *المرحلة الأولى تمت: تم ربط عنوان محفظتك بنجاح!*

📍 *العنوان المرتبط:* \`${rawAddr}\`

⚡ *المرحلة الثانية: تفعيل المحفظة (0.05 TON)*
اضغط على الزر أدناه لفتح المحفظة ودفع رسوم التفعيل لمرة واحدة ليتم تفعيل حسابك وفتح إمكانية السحب فوراً:`,
        parseMode: 'Markdown',
        replyMarkup: {
          inline_keyboard: [
            [{ text: '💎 دفع 0.05 TON عبر Tonkeeper', url: tonkeeperLink }],
            [openAppButton],
            [{ text: '🔄 تحديث حالة التفعيل', callback_data: 'cmd_verify_wallet' }]
          ]
        }
      };
    }
  }

  // 0. Dedicated Mini App launch command (/app, /miniapp, /open, or 'افتح التطبيق')
  if (
    lowerCmd === '/app' ||
    lowerCmd === '/miniapp' ||
    lowerCmd === '/open' ||
    lowerCmd.includes('open app') ||
    lowerCmd.includes('افتح التطبيق') ||
    lowerCmd.includes('فتح التطبيق') ||
    lowerCmd === 'cmd_open_app'
  ) {
    return {
      text: `🚀 *Launch ${settings.tokenName} Mini App inside Telegram!*

Enter the full interactive web application directly without leaving Telegram.
Zero Google login or external browser needed!

✨ *Features inside the App:*
⚡ Interactive live mining engine & animations
💎 TON Connect official wallet linking (Tonkeeper / @wallet)
🏆 Real-time Global Leaderboard
📋 Interactive task center & bounty claiming
💳 VIP subscription tiers & multipliers
🏧 Instant Jetton withdrawals to your TON address

*Tap the button below to enter:*`,
      parseMode: 'Markdown',
      replyMarkup: {
        inline_keyboard: [
          [openAppButton],
          [
            { text: '📜 Transaction History', callback_data: 'cmd_history' },
            { text: '❓ Help & Support', callback_data: 'cmd_help' }
          ]
        ]
      }
    };
  }

  // 1. /start command — clean layout with inline button directly under the message bubble
  if (lowerCmd.startsWith('/start') || lowerCmd === 'start') {
    const welcomeText = `👋 *Welcome to ${settings.tokenName} (${settings.tokenSymbol}) Cloud Mining Hub!*

Mining is live on *TON Blockchain Mainnet*!
Tap the button directly below this message to launch the full visual Mini App:

👤 *Miner:* ${user.firstName} (@${user.username})
🆔 *ID:* \`${user.id}\`
⚡ *Status:* ${user.isWalletActivated ? '🟢 Active & Verified' : '🟡 Unactivated (0.05 TON fee)'}
💎 *Balance:* *${user.balances.availableJetton.toFixed(2)} ${settings.tokenSymbol}*
🚀 *Mining Level:* ${user.subscription.name} (${user.subscription.multiplier}x)

${!user.isWalletActivated ? `⚠️ *Wallet Activation:*
Connect your TON wallet and pay the one-time *${ACTIVATION_FEE_TON} TON* fee to activate withdrawals.` : '✅ Your wallet is fully activated! You have full mining & withdrawal access.'}`;

    return {
      text: welcomeText,
      parseMode: 'Markdown',
      replyMarkup: {
        inline_keyboard: [
          [openAppButton],
          [
            { text: '📜 Transaction History', callback_data: 'cmd_history' },
            { text: '❓ Help & Support', callback_data: 'cmd_help' }
          ]
        ]
      }
    };
  }

  // 2. Start Mining (/mine)
  if (lowerCmd.includes('mining') || lowerCmd.includes('/mine') || cleanCmd === 'cmd_mine') {
    if (!settings.isMiningEnabled) {
      return {
        text: '⏸️ *Mining is temporarily paused by protocol administration.* Please check back soon.',
        parseMode: 'Markdown',
        replyMarkup: {
          inline_keyboard: [[openAppButton]]
        }
      };
    }

    const progress = calculateMiningProgress(
      user.miningState,
      settings.baseMiningDailyReward,
      user.subscription
    );

    if (!user.miningState.isMining) {
      // Start new cycle
      user.miningState = startMiningCycle(user.miningState, settings.miningCycleHours);
      storage.saveUser(user);

      const totalReward = progress.expectedTotalReward;
      return {
        text: `⚡ *24-Hour Mining Cycle Started!*

Your mining rig is now active on TON Mainnet!
⏳ *Duration:* ${settings.miningCycleHours} Hours
🎁 *Estimated Reward:* *${totalReward} ${settings.tokenSymbol}*
🔥 *Current Streak:* ${user.miningState.streakDays} Day(s) (+${(user.miningState.streakDays * 2)}% boost)
🚀 *Tier Multiplier:* ${user.subscription.multiplier}x (${user.subscription.name})

The timer runs in the background. Return in 24 hours to claim!`,
        parseMode: 'Markdown',
        replyMarkup: {
          inline_keyboard: [
            [openAppButton],
            [
              { text: '💰 Check Balance', callback_data: 'cmd_balance' },
              { text: '👥 Invite Friends', callback_data: 'cmd_invite' }
            ]
          ]
        }
      };
    }

    if (progress.isFinished) {
      // Claim reward
      const claimedAmount = progress.expectedTotalReward;
      user.miningState.isMining = false;
      user.miningState.totalMined += claimedAmount;
      user.miningState.lastClaimTime = Date.now();

      storage.addLedgerEntry(
        createLedgerEntry({
          userId: user.id,
          type: 'MINING_REWARD',
          amount: claimedAmount,
          currency: 'JETTON',
          direction: 'CREDIT',
          description: `24h Mining Reward (Day ${user.miningState.streakDays} Streak)`,
        })
      );
      storage.saveUser(user);

      return {
        text: `🎉 *Mining Reward Claimed!*

You claimed *+${claimedAmount} ${settings.tokenSymbol}*!
💰 *New Available Balance:* *${user.balances.availableJetton} ${settings.tokenSymbol}*
🔥 *Streak maintained:* Day ${user.miningState.streakDays}

You can now start a new 24h cycle immediately!`,
        parseMode: 'Markdown',
        replyMarkup: {
          inline_keyboard: [
            [openAppButton],
            [
              { text: '⚡ Start Next Cycle', callback_data: 'cmd_mine' },
              { text: '💰 View Balance', callback_data: 'cmd_balance' }
            ]
          ]
        }
      };
    }

    // Still mining
    const hours = Math.floor(progress.secondsRemaining / 3600);
    const mins = Math.floor((progress.secondsRemaining % 3600) / 60);

    return {
      text: `⚡ *Mining In Progress...*

📈 *Progress:* ${progress.progressPercent.toFixed(1)}%
⏳ *Time Remaining:* ${hours}h ${mins}m
⛏️ *Accumulated So Far:* ~${progress.accumulatedAmount} ${settings.tokenSymbol}
🎯 *Total Expected Reward:* ${progress.expectedTotalReward} ${settings.tokenSymbol}
🔥 *Streak:* ${user.miningState.streakDays} Days

Check back when the countdown finishes to claim your ${settings.tokenSymbol}!`,
      parseMode: 'Markdown',
      replyMarkup: {
        inline_keyboard: [
          [openAppButton],
          [
            { text: '🔄 Refresh Status', callback_data: 'cmd_mine' },
            { text: '💰 Check Balance', callback_data: 'cmd_balance' }
          ]
        ]
      }
    };
  }

  // 3. My Balance (/balance)
  if (lowerCmd.includes('balance') || lowerCmd.includes('/balance') || cleanCmd === 'cmd_balance') {
    const b = user.balances;
    const balanceText = `💰 *Your ${settings.tokenName} Account Ledger*

🪙 *Available for Withdrawal:* *${b.availableJetton.toFixed(2)} ${settings.tokenSymbol}*
🔒 *Locked in Pending Withdrawals:* *${b.lockedJetton.toFixed(2)} ${settings.tokenSymbol}*
🏆 *Lifetime Total Earned:* *${b.totalEarned.toFixed(2)} ${settings.tokenSymbol}*

📊 *Earnings Breakdown:*
├ ⛏️ Mining: \`${b.miningEarned.toFixed(2)} ${settings.tokenSymbol}\`
├ 📋 Tasks: \`${b.tasksEarned.toFixed(2)} ${settings.tokenSymbol}\`
└ 👥 Referrals: \`${b.referralEarned.toFixed(2)} ${settings.tokenSymbol}\`

💎 *Wallet Status:*
├ Address: \`${user.walletAddress ? user.walletAddress.slice(0, 8) + '...' + user.walletAddress.slice(-6) : 'Not Connected'}\`
└ Activation: ${user.isWalletActivated ? '✅ Paid (0.05 TON)' : '❌ Unactivated (0.05 TON)'}`;

    return {
      text: balanceText,
      parseMode: 'Markdown',
      replyMarkup: {
        inline_keyboard: [
          [openAppButton],
          [
            { text: '🏧 Request Withdrawal', callback_data: 'cmd_withdraw' },
            { text: '📜 Transaction History', callback_data: 'cmd_history' }
          ]
        ]
      }
    };
  }

  // 4. Daily Tasks (/tasks)
  if (lowerCmd.includes('tasks') || lowerCmd.includes('/tasks') || cleanCmd === 'cmd_tasks') {
    const tasks = storage.getTasks().filter((t) => t.isActive);
    const progressList = storage.getUserTaskProgress(user.id);

    let taskText = `📋 *Available Tasks & Protocol Bounties*\n\nComplete community tasks to earn bonus ${settings.tokenSymbol} directly to your balance!\n\n`;

    tasks.forEach((t, i) => {
      const isDone = progressList.some((p) => p.taskId === t.id && p.status === 'COMPLETED');
      taskText += `${i + 1}. *${t.title}* ${isDone ? '✅ [Claimed]' : '⏳ [Open]'}\n`;
      taskText += `   🎁 Reward: *+${t.reward} ${settings.tokenSymbol}*\n`;
      taskText += `   ℹ️ ${t.description}\n\n`;
    });

    taskText += `To complete tasks interactively, open the Mini App:`;

    return {
      text: taskText,
      parseMode: 'Markdown',
      replyMarkup: {
        inline_keyboard: [
          [openAppButton],
          [{ text: '💰 Check Balance', callback_data: 'cmd_balance' }]
        ]
      }
    };
  }

  // 5. Invite Friends (/invite)
  if (lowerCmd.includes('invite') || lowerCmd.includes('friends') || lowerCmd.includes('/invite') || cleanCmd === 'cmd_invite') {
    const refLink = buildReferralLink(settings.telegramBotUsername, user.referralCode);
    const inviteText = `👥 *Invite Friends & Build Your Fleet*

Share your unique referral link to earn recurring ${settings.tokenSymbol} kickbacks!

🔗 *Your Referral Link:*
\`${refLink}\`

🎁 *Commission Structure:*
├ 👤 *Friend Registers:* *+${settings.referralSignupReward} ${settings.tokenSymbol}* for both of you!
├ 💎 *Friend Activates Wallet:* *+${settings.referralActivationReward} ${settings.tokenSymbol}* bonus to you!
└ 🚀 *Tier Bonus:* VIP subscribers get up to +50% extra commission!

📊 *Your Referral Stats:*
├ Total Friends Joined: *${user.totalReferrals}*
└ Activated Miners: *${user.activeReferrals}*`;

    return {
      text: inviteText,
      parseMode: 'Markdown',
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: '📤 Share Referral Link on Telegram',
              url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(
                `Join me to mine real NBS cryptocurrency on TON Blockchain! 🚀 Use my invite link to get a starter bonus:`
              )}`
            }
          ],
          [openAppButton]
        ]
      }
    };
  }

  // 6. Connect Wallet (/wallet)
  if (lowerCmd.includes('wallet') || lowerCmd.includes('/wallet') || cleanCmd === 'cmd_wallet') {
    const isAct = user.isWalletActivated;
    const tonkeeperLink = `https://app.tonkeeper.com/transfer/${OFFICIAL_FEE_WALLET}?amount=50000000`;

    const walletText = `💎 *TON Wallet & Activation Desk*

${isAct ? `✅ *Your TON Wallet is Active & Verified on Mainnet!*
📍 *Linked Address:* \`${user.walletAddress || 'Registered'}\`
Status: Fully eligible for mining multipliers and ${settings.tokenSymbol} withdrawals.
All withdrawals will automatically be dispatched to this address.` : user.walletAddress ? `⚠️ *المرحلة الثانية: تفعيل المحفظة (0.05 TON)*
📍 *المحفظة المرتبطة:* \`${user.walletAddress}\`

لتفعيل السحب ومضاعفات التعدين، يرجى تأكيد دفع رسوم التفعيل لمرة واحدة (0.05 TON) عبر محفظتك.` : `⚠️ *المرحلة الأولى: ربط المحفظة*
لم تقم بربط محفظة TON بعد.
افتح تطبيق التعدين للربط بنقرة واحدة عبر TON Connect (Tonkeeper / @wallet) أو أرسل عنوانك هنا مباشرة.`}`;

    return {
      text: walletText,
      parseMode: 'Markdown',
      replyMarkup: {
        inline_keyboard: isAct ? [
          [openAppButton],
          [{ text: '🏧 طلب سحب الرصيد', callback_data: 'cmd_withdraw' }]
        ] : user.walletAddress ? [
          [{ text: '💎 دفع 0.05 TON عبر Tonkeeper', url: tonkeeperLink }],
          [{ text: '🔄 تحديث حالة التفعيل', callback_data: 'cmd_verify_wallet' }],
          [openAppButton]
        ] : [
          [openAppButton]
        ]
      }
    };
  }

  // Verify wallet callback
  if (cleanCmd === 'cmd_verify_wallet') {
    if (!user.walletAddress) {
      return {
        text: `⚠️ *لم يتم ربط محفظة بعد:*
يرجى فتح التطبيق للربط عبر TON Connect أولاً.`,
        parseMode: 'Markdown',
        replyMarkup: {
          inline_keyboard: [[openAppButton]]
        }
      };
    }

    if (!user.activatedWallets) user.activatedWallets = [];

    // Check if previously activated
    if (user.activatedWallets.some((w) => addressesMatch(w, user.walletAddress!))) {
      user.isWalletActivated = true;
      storage.saveUser(user);
      return {
        text: `✅ *المحفظة مفعلة مسبقاً!*
📍 *العنوان:* \`${user.walletAddress}\`
تم تأكيد التفعيل دون رسوم إضافية.`,
        parseMode: 'Markdown',
        replyMarkup: {
          inline_keyboard: [
            [openAppButton],
            [{ text: '🏧 طلب سحب', callback_data: 'cmd_withdraw' }]
          ]
        }
      };
    }

    const check = await verifyTonActivationPayment(
      user.walletAddress,
      ACTIVATION_FEE_TON,
      OFFICIAL_FEE_WALLET
    );

    if (check.verified) {
      user.isWalletActivated = true;
      user.activationTxHash = check.txHash || `tx_act_${Date.now()}`;
      if (!user.activatedWallets.some((w) => addressesMatch(w, user.walletAddress!))) {
        user.activatedWallets.push(user.walletAddress);
      }
      storage.addLedgerEntry(
        createLedgerEntry({
          userId: user.id,
          type: 'WALLET_ACTIVATION_FEE',
          amount: ACTIVATION_FEE_TON,
          currency: 'TON',
          direction: 'DEBIT',
          description: `0.05 TON Activation fee paid`,
          referenceId: user.activationTxHash,
        })
      );
      storage.saveUser(user);

      return {
        text: `🎉 *تم تأكيد الدفع وتفعيل المحفظة بنجاح!*

📍 *المحفظة المرتبطة:* \`${user.walletAddress}\`
Tx Hash: \`${user.activationTxHash}\`

تم فتح إمكانية سحب عملة ${settings.tokenSymbol} والتمتع بكامل مكافآت التعدين!`,
        parseMode: 'Markdown',
        replyMarkup: {
          inline_keyboard: [
            [openAppButton],
            [{ text: '🏧 طلب السحب الآن', callback_data: 'cmd_withdraw' }]
          ]
        }
      };
    }

    return {
      text: `⏳ *لم يتم تأكيد المعاملة بعد على شبكة TON*

المحفظة المرتبطة المفحوصة:
\`${user.walletAddress}\`

تأكد من تأكيد إرسال *0.05 TON* من محفظتك، ثم اضغط على زر التحديث مجدداً.`,
      parseMode: 'Markdown',
      replyMarkup: {
        inline_keyboard: [
          [{ text: '💎 دفع 0.05 TON عبر Tonkeeper', url: `https://app.tonkeeper.com/transfer/${OFFICIAL_FEE_WALLET}?amount=50000000` }],
          [{ text: '🔄 إعادة فحص الحالة', callback_data: 'cmd_verify_wallet' }],
          [openAppButton]
        ]
      }
    };
  }

  // 7. Withdraw (/withdraw)
  if (lowerCmd.includes('withdraw') || lowerCmd.includes('/withdraw') || cleanCmd === 'cmd_withdraw') {
    const minW = settings.minWithdrawalJetton || 50;
    const feeW = settings.withdrawalFeeJetton || 2;
    const avail = user.balances.availableJetton;

    if (!user.isWalletActivated) {
      return {
        text: `⚠️ *Account Unactivated:*
You must activate your wallet with *0.05 TON* before requesting withdrawals.
Open the app or tap below to activate.`,
        parseMode: 'Markdown',
        replyMarkup: {
          inline_keyboard: [
            [openAppButton],
            [{ text: '💎 Wallet Desk', callback_data: 'cmd_wallet' }]
          ]
        }
      };
    }

    if (avail < minW) {
      return {
        text: `⚠️ *Insufficient Balance:*
Available: *${avail.toFixed(2)} ${settings.tokenSymbol}*
Minimum required: *${minW} ${settings.tokenSymbol}*

Keep mining daily or complete tasks to reach ${minW} ${settings.tokenSymbol}!`,
        parseMode: 'Markdown',
        replyMarkup: {
          inline_keyboard: [
            [openAppButton],
            [{ text: '⚡ Mine More NBS', callback_data: 'cmd_mine' }]
          ]
        }
      };
    }

    if (!user.walletAddress) {
      return {
        text: `⚠️ *No Wallet Linked:*
Please open the app to connect your TON wallet (Tonkeeper / @wallet)!`,
        parseMode: 'Markdown',
        replyMarkup: {
          inline_keyboard: [[openAppButton]]
        }
      };
    }

    // Auto-create withdrawal request to linked wallet
    const netAmount = Math.max(0, avail - feeW);
    const withdrawalId = `w_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    storage.addLedgerEntry(
      createLedgerEntry({
        userId: user.id,
        type: 'WITHDRAWAL_REQUEST',
        amount: avail,
        currency: 'JETTON',
        direction: 'DEBIT',
        description: `Withdrawal request to ${user.walletAddress.slice(0, 8)}... (${netAmount} NBS net, ${feeW} fee)`,
        referenceId: withdrawalId,
        status: 'PENDING',
      })
    );

    storage.addWithdrawal({
      id: withdrawalId,
      userId: user.id,
      username: user.username,
      walletAddress: user.walletAddress,
      amount: avail,
      fee: feeW,
      netAmount,
      status: 'PENDING',
      requestedAt: Date.now(),
    });

    return {
      text: `✅ *Withdrawal Request Submitted!*

💎 *Amount:* ${avail.toFixed(2)} ${settings.tokenSymbol}
⚙️ *Network Fee:* ${feeW} ${settings.tokenSymbol}
💰 *Net You Receive:* *${netAmount.toFixed(2)} ${settings.tokenSymbol}*
📍 *Destination:* \`${user.walletAddress}\`
🆔 *Request ID:* \`${withdrawalId}\`

Your request has been queued for blockchain transfer on TON Mainnet.`,
      parseMode: 'Markdown',
      replyMarkup: {
        inline_keyboard: [
          [openAppButton],
          [{ text: '📜 Transaction History', callback_data: 'cmd_history' }]
        ]
      }
    };
  }

  // 8. Subscription Plans (/plans)
  if (lowerCmd.includes('subscription') || lowerCmd.includes('plans') || lowerCmd.includes('/plans') || cleanCmd === 'cmd_plans') {
    let plansText = `💎 *Miner Subscription Upgrades*\n\nBoost your daily mining yields and earn higher referral cuts!\n\n`;

    DEFAULT_SUBSCRIPTION_TIERS.forEach((tier) => {
      plansText += `*${tier.badge}*\n`;
      plansText += `├ ⚡ Mining Multiplier: *${tier.miningMultiplier}x*\n`;
      plansText += `├ 👥 Referral Bonus: *+${tier.referralBonusPercent}%*\n`;
      plansText += `└ 💳 Monthly Price: *${tier.priceTonMonthly} TON*\n\n`;
    });

    plansText += `*Current Plan:* ${user.subscription.name} (${user.subscription.multiplier}x)`;

    return {
      text: plansText,
      parseMode: 'Markdown',
      replyMarkup: {
        inline_keyboard: [[openAppButton]]
      }
    };
  }

  // 9. Transaction History (/history)
  if (lowerCmd.includes('history') || lowerCmd.includes('/history') || cleanCmd === 'cmd_history') {
    const entries = storage.getUserLedger(user.id).slice(0, 6);
    let histText = `📜 *Your Recent Transactions (سجل المعاملات)*\n\n`;

    if (entries.length === 0) {
      histText += `No transactions recorded yet. Start mining or complete tasks to create your first entry!`;
    } else {
      entries.forEach((e) => {
        const sign = e.direction === 'CREDIT' ? '+' : '-';
        const dateStr = new Date(e.timestamp).toLocaleDateString();
        histText += `• *${sign}${e.amount} ${e.currency}* [${e.type}]\n  _${e.description}_ (${dateStr})\n\n`;
      });
    }

    return {
      text: histText,
      parseMode: 'Markdown',
      replyMarkup: {
        inline_keyboard: [
          [openAppButton],
          [{ text: '❓ Help & Support', callback_data: 'cmd_help' }]
        ]
      }
    };
  }

  // 10. Help & Support (/help)
  if (lowerCmd.includes('help') || lowerCmd.includes('/help') || lowerCmd.includes('support') || cleanCmd === 'cmd_help') {
    const helpText = `❓ *${settings.tokenName} Support & Documentation*

*How does daily mining work?*
Open the Mining App and tap "Start Mining" to initiate a 24-hour cycle. Once the 24 hours finish, tap "Claim" to credit your balance.

*What is the 0.05 TON fee for?*
The one-time 0.05 TON activation fee verifies your TON wallet ownership on TON Mainnet and activates withdrawal privileges.

*How do I connect my wallet?*
Open the Mining App and tap "Connect Wallet". You can link Tonkeeper, Telegram @wallet, Tonhub, or MyTonWallet with 1 click!

*Need Assistance?*
Contact our support staff or ask in our community chat.`;

    return {
      text: helpText,
      parseMode: 'Markdown',
      replyMarkup: {
        inline_keyboard: [
          [openAppButton],
          [
            { text: '📜 Transaction History', callback_data: 'cmd_history' },
            { text: '👥 Community Chat', url: 'https://t.me/tapsidra' }
          ]
        ]
      }
    };
  }

  // 11. Token Logo (/logo, /token, /image)
  if (
    lowerCmd.includes('logo') ||
    lowerCmd.includes('/logo') ||
    lowerCmd.includes('/token') ||
    lowerCmd.includes('/image') ||
    cleanCmd === 'cmd_logo'
  ) {
    return {
      sendLogo: true,
      text: `💎 *Official ${settings.tokenName} (${settings.tokenSymbol}) Token Logo*
⚡ *Network:* TON Blockchain (Mainnet)
📐 *Resolution:* 1024 × 1024 (Ultra HD 3D Medallion)
💎 *Compliance:* TEP-74 Jetton Standard

📥 *طريقة الحفظ على هاتفك:*
اضغط على الصورة في تيليجرام مطولاً، ثم اختر *"حفظ في المعرض"* أو *"Save to Photos"*.`,
      parseMode: 'Markdown',
      replyMarkup: {
        inline_keyboard: [[openAppButton]]
      }
    };
  }

  // Default fallback
  return {
    text: `👋 Hello ${user.firstName}!
Use the button below to launch the NBS Mining App, or check commands menu (/start, /history, /help):`,
    parseMode: 'Markdown',
    replyMarkup: {
      inline_keyboard: [
        [openAppButton],
        [
          { text: '📜 Transaction History', callback_data: 'cmd_history' },
          { text: '❓ Help & Support', callback_data: 'cmd_help' }
        ]
      ]
    }
  };
}
