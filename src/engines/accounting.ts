import { LedgerEntry, TransactionType, UserBalances } from '../types';

/**
 * Double-entry accounting helper to recalculate balances strictly from ledger records.
 * Prevents phantom balances or untracked changes.
 */
export function recalculateBalancesFromLedger(entries: LedgerEntry[]): UserBalances {
  let availableJetton = 0;
  let lockedJetton = 0;
  let totalEarned = 0;
  let miningEarned = 0;
  let tasksEarned = 0;
  let referralEarned = 0;

  for (const entry of entries) {
    if (entry.currency !== 'JETTON') continue;

    if (entry.direction === 'CREDIT' && entry.status === 'COMPLETED') {
      availableJetton += entry.amount;
      if (
        entry.type === 'MINING_REWARD' ||
        entry.type === 'TASK_REWARD' ||
        entry.type === 'REFERRAL_SIGNUP' ||
        entry.type === 'REFERRAL_ACTIVATION'
      ) {
        totalEarned += entry.amount;
      }

      if (entry.type === 'MINING_REWARD') {
        miningEarned += entry.amount;
      } else if (entry.type === 'TASK_REWARD') {
        tasksEarned += entry.amount;
      } else if (entry.type === 'REFERRAL_SIGNUP' || entry.type === 'REFERRAL_ACTIVATION') {
        referralEarned += entry.amount;
      }
    } else if (entry.direction === 'DEBIT') {
      if (entry.type === 'WITHDRAWAL_REQUEST') {
        // Pending withdrawal locks funds
        if (entry.status === 'PENDING') {
          availableJetton -= entry.amount;
          lockedJetton += entry.amount;
        } else if (entry.status === 'COMPLETED') {
          // Settled on blockchain
          lockedJetton = Math.max(0, lockedJetton - entry.amount);
        } else if (entry.status === 'REJECTED') {
          // Refund locked funds back to available
          lockedJetton = Math.max(0, lockedJetton - entry.amount);
          availableJetton += entry.amount;
        }
      } else if (entry.status === 'COMPLETED') {
        availableJetton -= entry.amount;
      }
    }
  }

  return {
    availableJetton: Number(Math.max(0, availableJetton).toFixed(4)),
    lockedJetton: Number(Math.max(0, lockedJetton).toFixed(4)),
    totalEarned: Number(totalEarned.toFixed(4)),
    miningEarned: Number(miningEarned.toFixed(4)),
    tasksEarned: Number(tasksEarned.toFixed(4)),
    referralEarned: Number(referralEarned.toFixed(4)),
  };
}

export function createLedgerEntry(params: {
  userId: string;
  type: TransactionType;
  amount: number;
  currency: 'JETTON' | 'TON';
  direction: 'CREDIT' | 'DEBIT';
  description: string;
  referenceId?: string;
  status?: 'COMPLETED' | 'PENDING' | 'REJECTED';
}): LedgerEntry {
  return {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    userId: params.userId,
    type: params.type,
    amount: Number(params.amount.toFixed(4)),
    currency: params.currency,
    direction: params.direction,
    description: params.description,
    timestamp: Date.now(),
    referenceId: params.referenceId,
    status: params.status || 'COMPLETED',
  };
}
