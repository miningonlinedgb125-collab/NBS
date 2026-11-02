import { SubscriptionTier, UserSubscription } from '../types';

export const DEFAULT_SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'basic',
    name: 'Basic Miner',
    badge: '🥉 Basic',
    priceTonMonthly: 0.5,
    priceTonQuarterly: 1.35, // 10% discount
    priceTonYearly: 4.8,     // 20% discount
    miningMultiplier: 1.5,
    referralBonusPercent: 10,
    exclusiveTasks: false,
    instantWithdrawal: false,
    description: 'Boost daily mining output by +50% and earn +10% on referral activity.',
    color: 'from-amber-600 to-amber-800',
  },
  {
    id: 'silver',
    name: 'Silver Miner',
    badge: '🥈 Silver',
    priceTonMonthly: 1.2,
    priceTonQuarterly: 3.2,
    priceTonYearly: 11.5,
    miningMultiplier: 2.0,
    referralBonusPercent: 20,
    exclusiveTasks: true,
    instantWithdrawal: false,
    description: 'Double (2.0x) daily mining yield, unlock Silver Tasks and higher referral cut.',
    color: 'from-slate-400 to-slate-600',
  },
  {
    id: 'gold',
    name: 'Gold Miner',
    badge: '🥇 Gold',
    priceTonMonthly: 2.5,
    priceTonQuarterly: 6.75,
    priceTonYearly: 24.0,
    miningMultiplier: 3.0,
    referralBonusPercent: 35,
    exclusiveTasks: true,
    instantWithdrawal: true,
    description: 'Triple (3.0x) mining rate, priority withdrawal processing, and premium tasks.',
    color: 'from-amber-400 to-yellow-600',
  },
  {
    id: 'premium',
    name: 'TON Tycoon VIP',
    badge: '💎 VIP',
    priceTonMonthly: 5.0,
    priceTonQuarterly: 13.5,
    priceTonYearly: 48.0,
    miningMultiplier: 5.0,
    referralBonusPercent: 50,
    exclusiveTasks: true,
    instantWithdrawal: true,
    description: 'Maximum 5.0x mining multiplier, 50% referral share, and instant zero-wait withdrawals.',
    color: 'from-purple-500 to-indigo-600',
  },
];

export function getTierById(tierId: string): SubscriptionTier | undefined {
  return DEFAULT_SUBSCRIPTION_TIERS.find((t) => t.id === tierId);
}

export function calculateSubscriptionExpiry(
  durationMonths: 1 | 3 | 12,
  currentTimeMs: number = Date.now(),
  currentExpiryMs: number = 0
): number {
  const durationMs = durationMonths * 30 * 24 * 3600 * 1000;
  // If user already has active subscription, extend it
  const baseTime = currentExpiryMs > currentTimeMs ? currentExpiryMs : currentTimeMs;
  return baseTime + durationMs;
}

export function isSubscriptionActive(sub: UserSubscription, currentTimeMs: number = Date.now()): boolean {
  if (sub.tierId === 'free') return true;
  return sub.expiresAt > currentTimeMs;
}
