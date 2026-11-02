/**
 * TON Blockchain integration utilities for activation, address parsing, and transaction verification.
 */

export const OFFICIAL_FEE_WALLET = "UQCIi7mqL7DVgxiTMUYP0d6OsqIXKVxclUIgGoq17BTB_im-";
export const ACTIVATION_FEE_TON = 0.05;

/**
 * Validates whether a string is a syntactically valid TON address
 * (Standard User-friendly base64url starting with EQ or UQ, or raw 0:...)
 */
export function isValidTonAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();

  // Standard user-friendly address (48 characters base64/base64url)
  const friendlyRegex = /^(EQ|UQ|kQ|0Q)[A-Za-z0-9_-]{46}$/;
  if (friendlyRegex.test(trimmed)) return true;

  // Raw hex format 0:hex or -1:hex (64 hex characters)
  const rawRegex = /^(-1|0):[a-fA-F0-9]{64}$/;
  if (rawRegex.test(trimmed)) return true;

  return false;
}

/**
 * Matches two TON addresses flexibly across EQ/UQ formats and casing
 */
export function addressesMatch(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const cleanA = a.trim();
  const cleanB = b.trim();
  if (cleanA.toLowerCase() === cleanB.toLowerCase()) return true;

  // In TON user-friendly addresses (48 characters),
  // chars 0-1 are flags ('EQ' bounceable, 'UQ' non-bounceable),
  // chars 2-44 are the workchain + hash core.
  if (cleanA.length >= 40 && cleanB.length >= 40) {
    const coreA = cleanA.slice(2, 44);
    const coreB = cleanB.slice(2, 44);
    if (coreA === coreB) return true;
  }

  return false;
}

/**
 * Converts nanoton to TON
 */
export function fromNano(nano: string | number | bigint): number {
  const n = typeof nano === 'string' ? BigInt(nano) : BigInt(Math.floor(Number(nano)));
  return Number(n) / 1e9;
}

/**
 * Converts TON to nanoton
 */
export function toNano(ton: number): string {
  const nano = Math.floor(ton * 1e9);
  return nano.toString();
}

/**
 * Builds the standard TON Connect v2 transaction object for wallet activation (no memo required)
 */
export function buildActivationTransaction(params?: {
  userId?: string;
  amountTon?: number;
  recipientAddress?: string;
}) {
  const amount = params?.amountTon || ACTIVATION_FEE_TON;
  const destination = params?.recipientAddress || OFFICIAL_FEE_WALLET;
  const validUntil = Math.floor(Date.now() / 1000) + 600; // 10 minutes

  return {
    validUntil,
    messages: [
      {
        address: destination,
        amount: toNano(amount),
      },
    ],
  };
}

/**
 * Verification result
 */
export interface VerificationResult {
  verified: boolean;
  txHash?: string;
  sender?: string;
  amount?: number;
  timestamp?: number;
  errorMessage?: string;
}

/**
 * Verifies on-chain transaction from the linked sender wallet against TON API / Toncenter
 * No memo required - checks incoming payments from expectedSenderWallet to targetRecipient
 */
export async function verifyTonActivationPayment(
  expectedSenderWallet: string,
  minAmountTon: number = ACTIVATION_FEE_TON,
  targetRecipient: string = OFFICIAL_FEE_WALLET
): Promise<VerificationResult> {
  const cleanSender = expectedSenderWallet.trim();
  if (!cleanSender) {
    return {
      verified: false,
      errorMessage: 'يرجى ربط عنوان محفظتك أولاً للتحقق من وصول رسوم التفعيل.',
    };
  }

  // Method 1: Query Toncenter API (Mainnet)
  try {
    const url = `https://toncenter.com/api/v2/getTransactions?address=${encodeURIComponent(
      targetRecipient
    )}&limit=35&archival=false`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const tx of data.result) {
          const inMsg = tx.in_msg;
          if (!inMsg) continue;

          const receivedAmountTon = fromNano(inMsg.value || '0');
          if (receivedAmountTon < minAmountTon - 0.005) continue;

          const senderAddr = inMsg.source || '';
          if (addressesMatch(senderAddr, cleanSender)) {
            return {
              verified: true,
              txHash: tx.transaction_id?.hash || `tx_${tx.utime}`,
              sender: senderAddr,
              amount: receivedAmountTon,
              timestamp: tx.utime ? tx.utime * 1000 : Date.now(),
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Toncenter query notice:', err);
  }

  // Method 2: Query TonAPI v2 (Mainnet) as fallback
  try {
    const tonApiUrl = `https://tonapi.io/v2/blockchain/accounts/${encodeURIComponent(
      targetRecipient
    )}/transactions?limit=35`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(tonApiUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const txs = data.transactions || [];
      for (const tx of txs) {
        const inMsg = tx.in_msg;
        if (!inMsg) continue;

        const rawValue = inMsg.value || 0;
        const receivedAmountTon = typeof rawValue === 'number' ? rawValue / 1e9 : fromNano(String(rawValue));
        if (receivedAmountTon < minAmountTon - 0.005) continue;

        const senderAddr = inMsg.source?.address || inMsg.source || '';
        if (addressesMatch(senderAddr, cleanSender)) {
          return {
            verified: true,
            txHash: tx.hash || `tx_${tx.utime}`,
            sender: senderAddr,
            amount: receivedAmountTon,
            timestamp: tx.utime ? tx.utime * 1000 : Date.now(),
          };
        }
      }
    }
  } catch (err) {
    console.warn('TonAPI query notice:', err);
  }

  return {
    verified: false,
    errorMessage: `لم يتم العثور على معاملة بقيمة 0.05 TON مرسلة من المحفظة المرتبطة (${cleanSender.slice(0, 6)}...${cleanSender.slice(-4)}) حتى الآن. يرجى إتمام التحويل من محفظتك.`,
  };
}
