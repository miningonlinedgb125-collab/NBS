import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMiningProgress, calculateTotalCycleReward, startMiningCycle } from './mining';
import { createLedgerEntry, recalculateBalancesFromLedger } from './accounting';
import { calculateReferralRewards } from './referrals';
import { calculateSupplyAllocations } from '../contracts/jetton-utils';
import { isValidTonAddress, OFFICIAL_FEE_WALLET, ACTIVATION_FEE_TON, addressesMatch } from './ton';
import { calculateSubscriptionExpiry } from './subscriptions';

test('Mining Engine: starts cycle and accurately tracks 24h progression', () => {
  const initial = {
    isMining: false,
    lastStartTime: 0,
    durationHours: 24,
    cycleEndTime: 0,
    streakDays: 0,
    totalMined: 0,
    accumulatedPending: 0,
  };

  const now = 1700000000000;
  const started = startMiningCycle(initial, 24, now);

  assert.equal(started.isMining, true);
  assert.equal(started.streakDays, 1);
  assert.equal(started.cycleEndTime, now + 24 * 3600 * 1000);

  // Half-way through (12h)
  const halfway = calculateMiningProgress(
    started,
    100, // base 100 Jetton
    { tierId: 'free', name: 'Free', multiplier: 1.0, expiresAt: 0 },
    now + 12 * 3600 * 1000
  );

  assert.equal(halfway.isFinished, false);
  assert.equal(halfway.progressPercent, 50);
  assert.equal(halfway.secondsRemaining, 12 * 3600);
  // Base 100 with streak 1 (+2% = 102), half is 51
  assert.equal(halfway.accumulatedAmount, 51);

  // Full 24h passed
  const finished = calculateMiningProgress(
    started,
    100,
    { tierId: 'free', name: 'Free', multiplier: 1.0, expiresAt: 0 },
    now + 24 * 3600 * 1000
  );

  assert.equal(finished.isFinished, true);
  assert.equal(finished.progressPercent, 100);
  assert.equal(finished.secondsRemaining, 0);
  assert.equal(finished.accumulatedAmount, 102);
});

test('Mining Engine: applies VIP tier multiplier (5x)', () => {
  const reward = calculateTotalCycleReward(
    100,
    5, // 5 streak days = +10%
    { tierId: 'premium', name: 'VIP', multiplier: 5.0, expiresAt: 9999999999 }
  );

  // 100 * 1.10 * 5.0 = 550
  assert.equal(reward, 550);
});

test('Accounting Engine: recalculates balance without phantom funds or untracked edits', () => {
  const uid = 'user_123';
  const e1 = createLedgerEntry({
    userId: uid,
    type: 'MINING_REWARD',
    amount: 100,
    currency: 'JETTON',
    direction: 'CREDIT',
    description: 'Day 1 Mining',
    status: 'COMPLETED',
  });

  const e2 = createLedgerEntry({
    userId: uid,
    type: 'TASK_REWARD',
    amount: 50,
    currency: 'JETTON',
    direction: 'CREDIT',
    description: 'Telegram Channel Join',
    status: 'COMPLETED',
  });

  const e3 = createLedgerEntry({
    userId: uid,
    type: 'WITHDRAWAL_REQUEST',
    amount: 70,
    currency: 'JETTON',
    direction: 'DEBIT',
    description: 'Pending withdrawal',
    status: 'PENDING',
  });

  const balances = recalculateBalancesFromLedger([e1, e2, e3]);
  assert.equal(balances.totalEarned, 150);
  assert.equal(balances.miningEarned, 100);
  assert.equal(balances.tasksEarned, 50);
  assert.equal(balances.lockedJetton, 70);
  assert.equal(balances.availableJetton, 80); // 150 - 70 locked
});

test('TON Engine: verifies official fee wallet address & activation fee rules', () => {
  assert.equal(OFFICIAL_FEE_WALLET, 'UQCIi7mqL7DVgxiTMUYP0d6OsqIXKVxclUIgGoq17BTB_im-');
  assert.equal(ACTIVATION_FEE_TON, 0.05);
  assert.equal(isValidTonAddress('UQCIi7mqL7DVgxiTMUYP0d6OsqIXKVxclUIgGoq17BTB_im-'), true);
  assert.equal(isValidTonAddress('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t'), true);
  assert.equal(isValidTonAddress('invalid-wallet-address'), false);

  assert.equal(addressesMatch('UQCIi7mqL7DVgxiTMUYP0d6OsqIXKVxclUIgGoq17BTB_im-', 'EQCIi7mqL7DVgxiTMUYP0d6OsqIXKVxclUIgGoq17BTB_im-'), true);
  assert.equal(addressesMatch('UQCIi7mqL7DVgxiTMUYP0d6OsqIXKVxclUIgGoq17BTB_im-', 'UQCIi7mqL7DVgxiTMUYP0d6OsqIXKVxclUIgGoq17BTB_im-'), true);
});

test('Referral Engine: calculates signup and activation kickbacks', () => {
  const signup = calculateReferralRewards('SIGNUP', { baseSignupReward: 0 });
  assert.equal(signup.referrerReward, 0);
  assert.equal(signup.refereeReward, 0);

  const activation = calculateReferralRewards('ACTIVATION', { baseActivationReward: 100, referrerMultiplier: 1.0 });
  // Exactly 100 for referrer upon friend's 0.05 TON wallet activation, 0 for referee
  assert.equal(activation.referrerReward, 100);
  assert.equal(activation.refereeReward, 0);
});

test('Tokenomics: divides Jetton supply according to tokenomics distribution (200M NBS)', () => {
  const allocations = calculateSupplyAllocations(200_000_000);
  assert.equal(allocations.totalSupply, 200_000_000);
  assert.equal(allocations.miningPool, 80_000_000);      // 40%
  assert.equal(allocations.tasksPool, 40_000_000);       // 20%
  assert.equal(allocations.referralPool, 30_000_000);    // 15%
  assert.equal(allocations.treasuryReserve, 50_000_000); // 25%
  assert.equal(
    allocations.miningPool + allocations.tasksPool + allocations.referralPool + allocations.treasuryReserve,
    200_000_000
  );
});

test('Subscription Engine: handles duration stacking properly', () => {
  const start = 1700000000000;
  const oneMonth = calculateSubscriptionExpiry(1, start, 0);
  const durationMs = 30 * 24 * 3600 * 1000;
  assert.equal(oneMonth, start + durationMs);

  // If user already active, extension stacks on top of expiry
  const extended = calculateSubscriptionExpiry(3, start + 10000, oneMonth);
  assert.equal(extended, oneMonth + 3 * durationMs);
});
