/**
 * Jetton token utilities, metadata builder, supply allocation calculators,
 * and explorer verification links for TON Mainnet.
 */

export interface JettonMetadata {
  name: string;
  symbol: string;
  decimals: string; // usually "9"
  description: string;
  image: string;
  image_data?: string;
}

export interface JettonSupplyAllocation {
  totalSupply: number;
  miningPool: number;      // 40%
  tasksPool: number;       // 20%
  referralPool: number;    // 15%
  treasuryReserve: number; // 25%
}

export function calculateSupplyAllocations(
  totalSupply: number,
  ratios = { mining: 0.4, tasks: 0.2, referrals: 0.15, treasury: 0.25 }
): JettonSupplyAllocation {
  return {
    totalSupply,
    miningPool: Math.floor(totalSupply * ratios.mining),
    tasksPool: Math.floor(totalSupply * ratios.tasks),
    referralPool: Math.floor(totalSupply * ratios.referrals),
    treasuryReserve: Math.floor(totalSupply * ratios.treasury),
  };
}

export function buildMetadataJson(metadata: JettonMetadata): string {
  return JSON.stringify(
    {
      name: metadata.name,
      symbol: metadata.symbol,
      decimals: metadata.decimals || '9',
      description: metadata.description,
      image: metadata.image,
    },
    null,
    2
  );
}

export function getTonviewerUrl(address: string, network: 'mainnet' | 'testnet' = 'mainnet'): string {
  const base = network === 'mainnet' ? 'https://tonviewer.com/' : 'https://testnet.tonviewer.com/';
  return `${base}${encodeURIComponent(address)}`;
}

export function getTonscanUrl(address: string, network: 'mainnet' | 'testnet' = 'mainnet'): string {
  const base = network === 'mainnet' ? 'https://tonscan.org/address/' : 'https://testnet.tonscan.org/address/';
  return `${base}${encodeURIComponent(address)}`;
}

export function getTonviewerTxUrl(txHash: string, network: 'mainnet' | 'testnet' = 'mainnet'): string {
  const base = network === 'mainnet' ? 'https://tonviewer.com/transaction/' : 'https://testnet.tonviewer.com/transaction/';
  return `${base}${encodeURIComponent(txHash)}`;
}
