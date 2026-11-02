# TON Mining Protocol: Telegram Bot & TEP-74 Jetton Token Ecosystem

A production-ready cryptocurrency mining and rewards platform built natively for **TON Blockchain Mainnet**, paired with an interactive **Telegram Bot**, **Telegram Mini App (TMA)**, and **Admin Control Suite**.

---

## 🏛️ Project Core Specifications

| Parameter | Configuration |
| :--- | :--- |
| **Blockchain** | TON Blockchain (Mainnet Ready) |
| **Token Standard** | TEP-74 / TEP-89 Jetton Master & Wallet |
| **Metadata Standard** | TEP-64 On-Chain & Off-Chain Metadata |
| **Official Fee Wallet** | `UQCIi7mqL7DVgxiTMUYP0d6OsqIXKVxclUIgGoq17BTB_im-` |
| **Wallet Activation Fee** | **0.05 TON** (One-time sybil protection fee) |
| **Daily Mining Cycle** | 24 Hours with streak boosts and VIP tier multipliers |
| **Accounting Standard** | Immutable Double-Entry Ledger (No untracked balances) |

---

## 🚀 Key Modules & Architecture

### 1. Jetton Token Smart Contracts (`/src/contracts/`)
- `JettonMaster.fc`: Standard TEP-74 Jetton Master smart contract. Supports administrative minting (`op == 21`), burn notifications (`0x7bdd97de`), content updates (`op == 4`), and TEP-74 getter methods (`get_jetton_data`, `get_wallet_address`).
- `JettonWallet.fc`: Standard TEP-74 individual user wallet contract with balance isolation, internal transfers, and gas management.
- `jetton-utils.ts`: TEP-64 compliant metadata JSON generator, supply allocation calculator (40% Mining, 20% Tasks, 15% Referrals, 25% Treasury & DEX Liquidity), and Tonviewer/Tonscan verification links.

### 2. Telegram Bot Engine (`/src/engines/bot-handler.ts`)
Fully functional command handler and inline callback processor for:
- `⚡ Start Mining` (`/mine`): Starts 24h mining cycle or displays real-time progress, claim rewards upon completion.
- `💰 My Balance` (`/balance`): Displays available, locked, lifetime earnings, and on-chain status.
- `📋 Daily Tasks` (`/tasks`): Community bounties with reward claims.
- `👥 Invite Friends` (`/invite`): Generates deep links (`https://t.me/bot?start=ref_...`) with 2-tier commission stats.
- `💎 Connect Wallet` (`/wallet`): Step-by-step TON Connect guidance and 0.05 TON activation verification.
- `🏧 Withdraw` (`/withdraw`): Checks minimums (50 Jetton) and submits to queue.
- `💎 Subscription Plans` (`/plans`): Basic, Silver, Gold, VIP tiers.
- `📜 Transaction History` (`/history`): Direct accounting ledger entries.
- `🏆 Leaderboard` (`/leaderboard`): Top miners and referrers.
- `❓ Help & Support` (`/help`): Mining mechanics and tokenomics guide.

### 3. Telegram Mini App (TMA Frontend)
- **24-Hour Mining Engine**: Rotating cyber-ring visual core, real-time ticking countdown (`HH:MM:SS`), accumulator progress, and streak tracker (+2% per day up to 14 days).
- **TON Connect v2 Modal**: Seamless connection for Tonkeeper, Telegram Wallet (@wallet), MyTonWallet, and OpenMask.
- **Double-Entry Balance View**: Full transparent financial ledger showing every single CREDIT and DEBIT transaction.
- **Tasks & Bounties**: Telegram channel subscriptions, community groups, Twitter/X follows, and daily check-ins.
- **Referrals Fleet**: 1-click share to Telegram chats with deep link attribution.
- **VIP Subscriptions**: 1.5x to 5.0x multipliers with 1, 3, and 12-month billing periods.

### 4. Admin Control Hub
- **Executive Metrics**: Live stats for total users, verified wallets, 0.05 TON fees collected, active subscriptions, and pending withdrawals.
- **Miners Directory**: Search, view ledger entries, ban/unban, and manual verification overrides.
- **Withdrawal Processing Desk**: Approve on-chain transfers with transaction hashes or reject with automatic ledger refunds.
- **Mining Settings**: Configure daily rates, cycle hours, referral bonuses, and kill-switches.
- **Jetton Studio**: Code viewer, metadata compiler, and deployment payload exporter.

---

## 💎 Wallet Activation Flow (0.05 TON)

1. Miner clicks **Connect Wallet** in the Bot or Mini App.
2. Selects non-custodial wallet (Tonkeeper, Telegram Wallet, etc.).
3. System displays the official receiving address:
   ```text
   UQCIi7mqL7DVgxiTMUYP0d6OsqIXKVxclUIgGoq17BTB_im-
   ```
4. User receives unique transaction memo (e.g. `ACT_user_xyz_123`).
5. Miner signs 0.05 TON transfer via TON Connect.
6. The backend queries TON Mainnet API to verify the exact arrival of 0.05 TON.
7. Upon verification, the user is marked `isWalletActivated: true` and the referrer receives a +50 Jetton activation kickback.

---

## 🛠️ Mainnet Deployment Instructions

### 1. Compile Jetton Smart Contracts
Using TON Blueprint:
```bash
npm create ton@latest ton-jetton -- --type func-jetton
cd ton-jetton
# Copy contracts from /src/contracts/ into contracts/ directory
npx blueprint build
```

### 2. Deploy to TON Mainnet
```bash
npx blueprint run deployJettonMaster --mainnet
```

### 3. Verify on TON Explorer
Once deployed, verify your Jetton Master address on:
- [Tonviewer Mainnet](https://tonviewer.com)
- [Tonscan Mainnet](https://tonscan.org)

---

## 📋 Information Required Before Final On-Chain Deployment

Before broadcasting the master contract transaction to TON Mainnet, confirm:
1. **Token Name**: (Default: `TON Mining Token`)
2. **Token Symbol**: (Default: `TMINE`)
3. **Decimals**: (Standard: `9`)
4. **Total Supply**: (Default: `100,000,000`)
5. **Initial Mint Treasury Wallet**: Address that will hold the initial supply.
6. **Telegram Bot Token**: Token from `@BotFather` to bind live webhook.
