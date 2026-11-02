import { MiningState, UserSubscription } from '../types';

export interface MiningCalculationResult {
  isFinished: boolean;
  progressPercent: number; // 0 to 100
  secondsRemaining: number;
  accumulatedAmount: number;
  expectedTotalReward: number;
}

/**
 * Calculates current mining cycle progress and rewards
 */
export function calculateMiningProgress(
  state: MiningState,
  baseReward: number,
  subscription: UserSubscription,
  currentTimeMs: number = Date.now()
): MiningCalculationResult {
  if (!state.isMining || !state.lastStartTime) {
    return {
      isFinished: false,
      progressPercent: 0,
      secondsRemaining: 0,
      accumulatedAmount: 0,
      expectedTotalReward: calculateTotalCycleReward(baseReward, state.streakDays, subscription),
    };
  }

  const durationMs = state.durationHours * 3600 * 1000;
  const elapsedMs = Math.max(0, currentTimeMs - state.lastStartTime);
  const remainingMs = Math.max(0, state.cycleEndTime - currentTimeMs);
  const totalReward = calculateTotalCycleReward(baseReward, state.streakDays, subscription);

  if (elapsedMs >= durationMs) {
    return {
      isFinished: true,
      progressPercent: 100,
      secondsRemaining: 0,
      accumulatedAmount: totalReward,
      expectedTotalReward: totalReward,
    };
  }

  const progressPercent = Math.min(100, (elapsedMs / durationMs) * 100);
  const accumulatedAmount = Number(((elapsedMs / durationMs) * totalReward).toFixed(4));

  return {
    isFinished: false,
    progressPercent: Number(progressPercent.toFixed(2)),
    secondsRemaining: Math.ceil(remainingMs / 1000),
    accumulatedAmount,
    expectedTotalReward: totalReward,
  };
}

/**
 * Calculate expected 24h total reward with streak bonus & tier multiplier
 */
export function calculateTotalCycleReward(
  baseReward: number,
  streakDays: number,
  subscription: UserSubscription
): number {
  // Streak multiplier: +2% per day up to 14 days (max 28% streak boost)
  const streakMultiplier = 1 + Math.min(14, Math.max(0, streakDays)) * 0.02;
  // Subscription multiplier: 1.0 (free) up to 5.0 (premium)
  const subMultiplier = Math.max(1, subscription.multiplier || 1.0);

  const finalReward = baseReward * streakMultiplier * subMultiplier;
  return Number(finalReward.toFixed(4));
}

/**
 * Starts a new 24-hour mining cycle
 */
export function startMiningCycle(
  currentState: MiningState,
  durationHours: number = 24,
  currentTimeMs: number = Date.now()
): MiningState {
  // Check if previous cycle ended within last 48 hours to preserve streak
  let newStreak = currentState.streakDays;
  if (currentState.lastStartTime > 0) {
    const timeSinceLastEnd = currentTimeMs - (currentState.cycleEndTime || currentState.lastStartTime);
    if (timeSinceLastEnd > 48 * 3600 * 1000) {
      newStreak = 1; // streak broken
    } else {
      newStreak = currentState.streakDays + 1;
    }
  } else {
    newStreak = 1;
  }

  const durationMs = durationHours * 3600 * 1000;
  return {
    ...currentState,
    isMining: true,
    lastStartTime: currentTimeMs,
    durationHours,
    cycleEndTime: currentTimeMs + durationMs,
    streakDays: newStreak,
    accumulatedPending: 0,
  };
}
