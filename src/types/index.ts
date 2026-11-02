export interface User {
  id: string; // telegram user id
  username: string;
  firstName: string;
  lastName?: string;
  walletAddress?: string;
  isWalletActivated: boolean;
  activatedWallets?: string[];
  activationTxHash?: string;
  activationMemo?: string;
  language?: string;
  hasSelectedLanguage?: boolean;
  referrerRewarded?: boolean;
  createdAt: number;
  referralCode: string;
  referredBy?: string; // referrer id
  totalReferrals: number;
  activeReferrals: number;
  miningState: MiningState;
  subscription: UserSubscription;
  balances: UserBalances;
  isBanned: boolean;
  role: 'user' | 'admin';
}

export interface MiningState {
  isMining: boolean;
  lastStartTime: number; // timestamp ms
  durationHours: number; // standard 24h
  cycleEndTime: number;  // timestamp ms
  streakDays: number;
  lastClaimTime?: number;
  totalMined: number;
  accumulatedPending: number;
}

export interface UserSubscription {
  tierId: 'free' | 'basic' | 'silver' | 'gold' | 'premium';
  name: string;
  multiplier: number; // e.g. 1.0, 1.5, 2.0, 3.0, 5.0
  expiresAt: number; // 0 for lifetime/free, timestamp ms
  purchasedAt?: number;
  txHash?: string;
}

export interface UserBalances {
  availableJetton: number; // internal ledger balance ready for withdrawal
  lockedJetton: number;    // in pending withdrawal or staking
  totalEarned: number;     // lifetime accumulated
  miningEarned: number;
  tasksEarned: number;
  referralEarned: number;
  onChainJettonBalance?: number; // fetched from tonviewer/tonapi if contract exists
}

export type TransactionType =
  | 'MINING_REWARD'
  | 'TASK_REWARD'
  | 'REFERRAL_SIGNUP'
  | 'REFERRAL_ACTIVATION'
  | 'WALLET_ACTIVATION_FEE'
  | 'SUBSCRIPTION_PAYMENT'
  | 'WITHDRAWAL_REQUEST'
  | 'WITHDRAWAL_REFUND'
  | 'WITHDRAWAL_COMPLETED'
  | 'ADMIN_ADJUSTMENT';

export interface LedgerEntry {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number; // Jetton tokens or TON for fee
  currency: 'JETTON' | 'TON';
  direction: 'CREDIT' | 'DEBIT';
  description: string;
  timestamp: number;
  referenceId?: string; // task id, tx hash, etc.
  status: 'COMPLETED' | 'PENDING' | 'REJECTED';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: 'telegram' | 'daily' | 'referral' | 'special';
  reward: number; // Jetton
  iconName: string;
  actionUrl?: string;
  channelId?: string; // for Telegram verification
  targetCount?: number; // e.g. 3 referrals
  requiresProof?: boolean;
  isActive: boolean;
  createdAt: number;
}

export interface UserTaskProgress {
  taskId: string;
  userId: string;
  status: 'NOT_STARTED' | 'PENDING_VERIFICATION' | 'COMPLETED';
  completedAt?: number;
  proofData?: string;
}

export interface SubscriptionTier {
  id: 'basic' | 'silver' | 'gold' | 'premium';
  name: string;
  badge: string;
  priceTonMonthly: number;
  priceTonQuarterly: number;
  priceTonYearly: number;
  miningMultiplier: number;
  referralBonusPercent: number;
  exclusiveTasks: boolean;
  instantWithdrawal: boolean;
  description: string;
  color: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  username: string;
  walletAddress: string;
  amount: number; // Jetton
  fee: number;    // Jetton fee
  netAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  requestedAt: number;
  processedAt?: number;
  adminNote?: string;
  blockchainTxHash?: string;
}

export interface ProjectSettings {
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  totalSupply: number;
  miningSupplyAllocation: number;
  tasksSupplyAllocation: number;
  referralSupplyAllocation: number;
  treasurySupplyAllocation: number;
  treasuryWallet: string;
  jettonMasterAddress: string;
  officialFeeWallet: string; // "UQCIi7mqL7DVgxiTMUYP0d6OsqIXKVxclUIgGoq17BTB_im-"
  activationFeeTon: number;  // 0.05 TON
  minWithdrawalJetton: number;
  withdrawalFeeJetton: number;
  baseMiningDailyReward: number; // Default daily Jetton base
  miningCycleHours: number; // 24
  referralSignupReward: number; // Jetton when friend registers
  referralActivationReward: number; // Jetton when friend pays 0.05 TON fee
  telegramBotUsername: string;
  telegramBotToken?: string;
  publicWebAppUrl?: string;
  isMiningEnabled: boolean;
  isWithdrawalEnabled: boolean;
  isAutoWithdrawalEnabled: boolean;
}

export interface ActivationPaymentRequest {
  id: string;
  userId: string;
  walletAddress: string;
  amountTon: number;
  receiverAddress: string;
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED';
  createdAt: number;
  confirmedAt?: number;
  txHash?: string;
}

