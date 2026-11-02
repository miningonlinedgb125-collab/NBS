/**
 * Referral engine logic: code generation, deep-link builders, and commission distribution.
 */

export function generateReferralCode(userId: string): string {
  // Referral code is strictly the Telegram ID without random strings
  return userId;
}

export function buildReferralLink(botUsername: string, referralCodeOrUserId: string): string {
  const cleanUsername = botUsername.replace(/^@/, '');
  const cleanId = referralCodeOrUserId.replace(/^ref_/, '');
  return `https://t.me/${cleanUsername}?start=ref_${cleanId}`;
}

export interface ReferralRewardBreakdown {
  referrerReward: number;
  refereeReward: number;
  bonusType: 'SIGNUP' | 'ACTIVATION' | 'SUBSCRIPTION';
}

export function calculateReferralRewards(
  eventType: 'SIGNUP' | 'ACTIVATION' | 'SUBSCRIPTION',
  options: {
    baseSignupReward?: number;
    baseActivationReward?: number;
    referrerMultiplier?: number;
  } = {}
): ReferralRewardBreakdown {
  const multiplier = options.referrerMultiplier || 1.0;
  const baseSignup = 0; // Strictly 0 signup reward
  const baseActivation = options.baseActivationReward !== undefined ? options.baseActivationReward : 100; // 100 Jettons when friend activates wallet

  if (eventType === 'SIGNUP') {
    return {
      referrerReward: 0,
      refereeReward: 0,
      bonusType: 'SIGNUP',
    };
  }

  if (eventType === 'ACTIVATION') {
    return {
      referrerReward: Number((baseActivation * multiplier).toFixed(2)),
      refereeReward: 0, // No extra gifts, strictly 100 NBS for the inviter
      bonusType: 'ACTIVATION',
    };
  }

  return {
    referrerReward: 0,
    refereeReward: 0,
    bonusType: 'SUBSCRIPTION',
  };
}
