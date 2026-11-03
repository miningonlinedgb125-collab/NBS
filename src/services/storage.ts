import fs from 'fs';
import path from 'path';
import {
  User,
  LedgerEntry,
  Task,
  UserTaskProgress,
  WithdrawalRequest,
  ProjectSettings,
} from '../types';
import { OFFICIAL_FEE_WALLET, ACTIVATION_FEE_TON } from '../engines/ton';
import { DEFAULT_SUBSCRIPTION_TIERS } from '../engines/subscriptions';
import { recalculateBalancesFromLedger } from '../engines/accounting';

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BUNDLED_FILE = path.resolve(process.cwd(), 'data/database.json');
const DATA_DIR = IS_SERVERLESS ? '/tmp/nbs_data' : path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'database.json');

export interface DatabaseSchema {
  settings: ProjectSettings;
  users: Record<string, User>;
  ledger: LedgerEntry[];
  tasks: Task[];
  taskProgress: UserTaskProgress[];
  withdrawals: WithdrawalRequest[];
}

const DEFAULT_SETTINGS: ProjectSettings = {
  tokenName: 'NBS',
  tokenSymbol: 'NBS',
  tokenDecimals: 9,
  totalSupply: 200_000_000,
  miningSupplyAllocation: 80_000_000,
  tasksSupplyAllocation: 40_000_000,
  referralSupplyAllocation: 30_000_000,
  treasurySupplyAllocation: 50_000_000,
  treasuryWallet: 'UQAmUa3boqCwHwe26qqB6rD8Rs7QQ-R7IHUtyxLEX2Uqboby',
  jettonMasterAddress: '', // To be filled upon deployment or set by admin
  officialFeeWallet: OFFICIAL_FEE_WALLET,
  activationFeeTon: ACTIVATION_FEE_TON,
  minWithdrawalJetton: 50,
  withdrawalFeeJetton: 2,
  baseMiningDailyReward: 50, // 50 NBS per 24h cycle
  miningCycleHours: 24,
  referralSignupReward: 0,
  referralActivationReward: 100,
  telegramBotUsername: 'NBSMining_bot',
  telegramBotToken: '9180620527:AAFR_DNWRbzns3p4b8z9wyw0_-VH6T9c3lM',
  isMiningEnabled: true,
  isWithdrawalEnabled: true,
  isAutoWithdrawalEnabled: false,
};

const INITIAL_TASKS: Task[] = [
  {
    id: 'task_tg_channel',
    title: 'Join Official Telegram Channel',
    description: 'Subscribe to our official announcements channel for project news and updates.',
    category: 'telegram',
    reward: 25,
    iconName: 'Send',
    actionUrl: 'https://t.me/tonmining_announcements',
    channelId: '@tonmining_announcements',
    isActive: true,
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'task_tg_group',
    title: 'Join Community Telegram Group',
    description: 'Chat with other miners and share your mining strategies with the global community.',
    category: 'telegram',
    reward: 25,
    iconName: 'Users',
    actionUrl: 'https://t.me/tapsidra',
    channelId: '@tapsidra',
    isActive: true,
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'task_x_follow',
    title: 'Follow on X (Twitter)',
    description: 'Follow our official X handle and retweet the pinned mainnet launch announcement.',
    category: 'special',
    reward: 35,
    iconName: 'Twitter',
    actionUrl: 'https://x.com/ton_mining_real',
    requiresProof: false,
    isActive: true,
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'task_invite_3',
    title: 'Invite 3 Friends to Mine',
    description: 'Share your referral link with at least 3 friends and help them register.',
    category: 'referral',
    reward: 50,
    iconName: 'UserPlus',
    targetCount: 3,
    isActive: true,
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'task_daily_checkin',
    title: 'Daily Protocol Check-in',
    description: 'Check in every day to claim an instant bonus towards your mining speed.',
    category: 'daily',
    reward: 10,
    iconName: 'CalendarCheck',
    isActive: true,
    createdAt: Date.now() - 86400000,
  },
];

class StorageService {
  private db: DatabaseSchema;

  constructor() {
    this.ensureDataDirectory();
    this.db = this.loadDatabase();
    this.seedDefaultDataIfEmpty();
  }

  private ensureDataDirectory() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch {}
  }

  private loadDatabase(): DatabaseSchema {
    try {
      let sourceFile = DATA_FILE;
      if (!fs.existsSync(sourceFile) && fs.existsSync(BUNDLED_FILE)) {
        sourceFile = BUNDLED_FILE;
      }
      if (fs.existsSync(sourceFile)) {
        const raw = fs.readFileSync(sourceFile, 'utf-8');
        const parsed = JSON.parse(raw);
        const settings = { ...DEFAULT_SETTINGS, ...parsed.settings, referralSignupReward: 0, referralActivationReward: 100 };
        return {
          settings,
          users: parsed.users || {},
          ledger: parsed.ledger || [],
          tasks: parsed.tasks || INITIAL_TASKS,
          taskProgress: parsed.taskProgress || [],
          withdrawals: parsed.withdrawals || [],
        };
      }
    } catch (err) {
      console.warn('Failed to parse database.json, initializing fresh store:', err);
    }

    return {
      settings: DEFAULT_SETTINGS,
      users: {},
      ledger: [],
      tasks: INITIAL_TASKS,
      taskProgress: [],
      withdrawals: [],
    };
  }

  private saveDatabase() {
    try {
      this.ensureDataDirectory();
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (err) {
      // In serverless environments, in-memory is maintained gracefully
    }
  }

  private seedDefaultDataIfEmpty() {
    // Ensure admin user exists for immediate exploration
    if (!this.db.users['admin_999']) {
      this.db.users['admin_999'] = {
        id: 'admin_999',
        username: 'TON_Mining_Admin',
        firstName: 'Chief',
        lastName: 'Admin',
        walletAddress: OFFICIAL_FEE_WALLET,
        isWalletActivated: true,
        activationTxHash: 'tx_admin_verified_mainnet',
        createdAt: Date.now() - 7 * 86400000,
        referralCode: 'ADMIN_PROMO',
        totalReferrals: 12,
        activeReferrals: 8,
        miningState: {
          isMining: true,
          lastStartTime: Date.now() - 14 * 3600 * 1000, // 14h in
          durationHours: 24,
          cycleEndTime: Date.now() + 10 * 3600 * 1000,  // 10h remaining
          streakDays: 4,
          totalMined: 320,
          accumulatedPending: 0,
        },
        subscription: {
          tierId: 'premium',
          name: 'TON Tycoon VIP',
          multiplier: 5.0,
          expiresAt: Date.now() + 60 * 86400000,
        },
        balances: {
          availableJetton: 850,
          lockedJetton: 50,
          totalEarned: 1200,
          miningEarned: 600,
          tasksEarned: 200,
          referralEarned: 400,
        },
        isBanned: false,
        role: 'admin',
      };
    }

    // Default demo miner for immediate interactive testing in WebApp
    if (!this.db.users['user_demo']) {
      this.db.users['user_demo'] = {
        id: 'user_demo',
        username: 'CryptoPioneer',
        firstName: 'Alex',
        lastName: 'Miner',
        walletAddress: '',
        isWalletActivated: false,
        createdAt: Date.now() - 2 * 86400000,
        referralCode: 'ALEX_89X',
        totalReferrals: 2,
        activeReferrals: 1,
        miningState: {
          isMining: false,
          lastStartTime: 0,
          durationHours: 24,
          cycleEndTime: 0,
          streakDays: 2,
          totalMined: 45,
          accumulatedPending: 0,
        },
        subscription: {
          tierId: 'free',
          name: 'Free Miner',
          multiplier: 1.0,
          expiresAt: 0,
        },
        balances: {
          availableJetton: 45,
          lockedJetton: 0,
          totalEarned: 45,
          miningEarned: 25,
          tasksEarned: 10,
          referralEarned: 10,
        },
        isBanned: false,
        role: 'user',
      };
    }

    // Migrate all users so referralCode is strictly their Telegram User ID
    Object.values(this.db.users).forEach((u) => {
      if (u.id) {
        u.referralCode = u.id;
      }
      if (u.id === '1878942455') {
        u.role = 'admin';
      } else if (u.id === '6653362852') {
        u.role = 'user';
      }
    });

    this.saveDatabase();
  }

  // --- Settings ---
  public getSettings(): ProjectSettings {
    return { ...this.db.settings };
  }

  public updateSettings(partial: Partial<ProjectSettings>): ProjectSettings {
    this.db.settings = { ...this.db.settings, ...partial };
    this.saveDatabase();
    return this.getSettings();
  }

  // --- Users ---
  public getUser(userId: string): User | undefined {
    return this.db.users[userId];
  }

  public getUserByReferralCode(code: string): User | undefined {
    const clean = code.trim().replace(/^ref_/, '').toUpperCase();
    return Object.values(this.db.users).find(
      (u) => (u.referralCode && u.referralCode.toUpperCase() === clean) || u.id.toUpperCase() === clean
    );
  }

  public getAllUsers(): User[] {
    return Object.values(this.db.users);
  }

  public saveUser(user: User): User {
    // Recalculate balances strictly from user's ledger entries to prevent discrepancy
    const userEntries = this.db.ledger.filter((e) => e.userId === user.id);
    if (userEntries.length > 0) {
      const computed = recalculateBalancesFromLedger(userEntries);
      user.balances = computed;
    }
    this.db.users[user.id] = user;
    this.saveDatabase();
    return user;
  }

  // --- Ledger ---
  public addLedgerEntry(entry: LedgerEntry): LedgerEntry {
    this.db.ledger.unshift(entry);
    // Auto-update user balance cache
    const user = this.db.users[entry.userId];
    if (user) {
      const userEntries = this.db.ledger.filter((e) => e.userId === user.id);
      user.balances = recalculateBalancesFromLedger(userEntries);
      this.db.users[user.id] = user;
    }
    this.saveDatabase();
    return entry;
  }

  public getUserLedger(userId: string): LedgerEntry[] {
    return this.db.ledger.filter((e) => e.userId === userId);
  }

  public getAllLedgerEntries(): LedgerEntry[] {
    return this.db.ledger;
  }

  // --- Tasks ---
  public getTasks(): Task[] {
    return this.db.tasks;
  }

  public getTask(taskId: string): Task | undefined {
    return this.db.tasks.find((t) => t.id === taskId);
  }

  public saveTask(task: Task): Task {
    const idx = this.db.tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      this.db.tasks[idx] = task;
    } else {
      this.db.tasks.push(task);
    }
    this.saveDatabase();
    return task;
  }

  public deleteTask(taskId: string): boolean {
    const initLen = this.db.tasks.length;
    this.db.tasks = this.db.tasks.filter((t) => t.id !== taskId);
    if (this.db.tasks.length !== initLen) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  public getUserTaskProgress(userId: string): UserTaskProgress[] {
    return this.db.taskProgress.filter((p) => p.userId === userId);
  }

  public setTaskProgress(progress: UserTaskProgress) {
    const idx = this.db.taskProgress.findIndex(
      (p) => p.userId === progress.userId && p.taskId === progress.taskId
    );
    if (idx >= 0) {
      this.db.taskProgress[idx] = progress;
    } else {
      this.db.taskProgress.push(progress);
    }
    this.saveDatabase();
  }

  // --- Withdrawals ---
  public addWithdrawal(withdrawal: WithdrawalRequest): WithdrawalRequest {
    this.db.withdrawals.unshift(withdrawal);
    this.saveDatabase();
    return withdrawal;
  }

  public getWithdrawals(): WithdrawalRequest[] {
    return this.db.withdrawals;
  }

  public getUserWithdrawals(userId: string): WithdrawalRequest[] {
    return this.db.withdrawals.filter((w) => w.userId === userId);
  }

  public updateWithdrawal(id: string, update: Partial<WithdrawalRequest>): WithdrawalRequest | undefined {
    const item = this.db.withdrawals.find((w) => w.id === id);
    if (!item) return undefined;
    Object.assign(item, update);
    this.saveDatabase();
    return item;
  }
}

export const storage = new StorageService();
