import React, { useState, useEffect } from 'react';
import { ProjectSettings } from '../../types';
import {
  FileCode2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Download,
  Terminal,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { getTonviewerUrl, getTonscanUrl } from '../../contracts/jetton-utils';

interface ContractStudioProps {
  settings: ProjectSettings;
  onRefreshData: () => void;
}

export const ContractStudio: React.FC<ContractStudioProps> = ({
  settings,
  onRefreshData,
}) => {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'metadata' | 'master_fc' | 'wallet_fc' | 'deploy'>('overview');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchContractDetails();
  }, []);

  const fetchContractDetails = async () => {
    try {
      const res = await fetch('/api/admin/jetton-contract');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load contract details', err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/70 via-[#19150d] to-yellow-950/40 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h2 className="text-xl font-black text-white">
              TON Jetton Smart Contract & Mainnet Studio
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Official TEP-74 standard compliant Jetton token contracts, metadata generator, and deployment instructions for TON Blockchain Mainnet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {settings.jettonMasterAddress ? (
            <a
              href={getTonviewerUrl(settings.jettonMasterAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
            >
              Verify on Tonviewer <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold">
              Deployment Ready (Awaiting Launch)
            </span>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Tokenomics & Allocations
        </button>

        <button
          onClick={() => setActiveTab('metadata')}
          className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
            activeTab === 'metadata'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          TEP-64 Metadata JSON
        </button>

        <button
          onClick={() => setActiveTab('master_fc')}
          className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
            activeTab === 'master_fc'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          JettonMaster.fc (FunC)
        </button>

        <button
          onClick={() => setActiveTab('wallet_fc')}
          className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
            activeTab === 'wallet_fc'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          JettonWallet.fc (FunC)
        </button>

        <button
          onClick={() => setActiveTab('deploy')}
          className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
            activeTab === 'deploy'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Mainnet Deployment Guide
        </button>
      </div>

      {/* TAB 1: Overview & Allocations */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-[#0d1424] border border-slate-800">
              <div className="text-[11px] text-slate-400">Token Name & Symbol</div>
              <div className="text-base font-bold text-white mt-1">
                {settings.tokenName} ({settings.tokenSymbol})
              </div>
              <div className="text-[10px] text-cyan-400 mt-0.5">Decimals: 9</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d1424] border border-slate-800">
              <div className="text-[11px] text-slate-400">Total Supply</div>
              <div className="text-base font-bold text-white font-mono mt-1">
                {settings.totalSupply?.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Fixed Max Supply</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d1424] border border-slate-800">
              <div className="text-[11px] text-slate-400">Official Fee Wallet</div>
              <div className="text-xs font-bold text-cyan-300 font-mono mt-1 truncate">
                {settings.officialFeeWallet?.slice(0, 8)}...{settings.officialFeeWallet?.slice(-6)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Receives 0.05 TON fees</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d1424] border border-slate-800">
              <div className="text-[11px] text-slate-400">Treasury Issuer Wallet</div>
              <div className="text-xs font-bold text-amber-300 font-mono mt-1 truncate" title={settings.treasuryWallet}>
                {settings.treasuryWallet ? `${settings.treasuryWallet.slice(0, 8)}...${settings.treasuryWallet.slice(-6)}` : 'Not Set'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Initial Supply & Reserve Custody</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d1424] border border-slate-800">
              <div className="text-[11px] text-slate-400">Compliance Standard</div>
              <div className="text-base font-bold text-emerald-400 mt-1">
                TEP-74 / TEP-89
              </div>
              <div className="text-[10px] text-emerald-500/80 mt-0.5">DeFi & DEX Compatible</div>
            </div>
          </div>

          {/* Official Token Logo & Branding Asset Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-[#0d1424] to-blue-950/40 border border-cyan-500/30 flex flex-col md:flex-row items-center gap-6 shadow-xl">
            <div className="relative group shrink-0">
              <img
                src="/api/token-logo.jpg"
                alt="NBS Token Official Logo"
                className="w-32 h-32 md:w-36 md:h-36 rounded-2xl shadow-2xl border-2 border-cyan-400/50 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-cyan-500 text-black font-extrabold text-[10px] shadow">
                1024 × 1024 HD
              </div>
            </div>

            <div className="space-y-2 flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h3 className="text-lg font-black text-white">
                  Official {settings.tokenName} ({settings.tokenSymbol}) Token Logo
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  TEP-64 Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                High-definition 3D metallic medallion featuring luxury diamond facets, cyan TON crystal circuitry, and official TON Blockchain insignia. Ready for Tonkeeper, Tonviewer, DEX listings, and Telegram channel branding.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <a
                  href="/api/download-logo"
                  download="NBS-Token-Official-Logo.jpg"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  تحميل صورة التوكن (Download HD Image)
                </a>
                <a
                  href="/api/token-logo.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  فتح بالحجم الكامل (Open Full Size)
                </a>
              </div>
            </div>
          </div>

          {/* Allocation Breakdown */}
          <div className="p-6 rounded-3xl bg-[#0d1424] border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">Token Supply Allocation Schedule</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/30">
                <div className="text-xs text-cyan-300 font-semibold">1. Daily Mining Rig Pool</div>
                <div className="text-xl font-black text-white font-mono mt-1">40%</div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">
                  {((settings.totalSupply || 100000000) * 0.4).toLocaleString()} {settings.tokenSymbol}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  Reserved for 24h mining cycles and active streaks.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-blue-500/30">
                <div className="text-xs text-blue-300 font-semibold">2. Tasks & Bounties Pool</div>
                <div className="text-xl font-black text-white font-mono mt-1">20%</div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">
                  {((settings.totalSupply || 100000000) * 0.2).toLocaleString()} {settings.tokenSymbol}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  Distributed upon completing community tasks and social milestones.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/30">
                <div className="text-xs text-purple-300 font-semibold">3. Referral Incentives</div>
                <div className="text-xl font-black text-white font-mono mt-1">15%</div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">
                  {((settings.totalSupply || 100000000) * 0.15).toLocaleString()} {settings.tokenSymbol}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  Rewarded for friend invites and 0.05 TON wallet activations.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/30">
                <div className="text-xs text-amber-300 font-semibold">4. Treasury & Liquidity</div>
                <div className="text-xl font-black text-white font-mono mt-1">25%</div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">
                  {((settings.totalSupply || 100000000) * 0.25).toLocaleString()} {settings.tokenSymbol}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  DEX liquidity provisioning on DeDust / STON.fi and protocol reserves.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Metadata JSON */}
      {activeTab === 'metadata' && (
        <div className="p-6 rounded-3xl bg-[#0d1424] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">TEP-64 Off-chain Token Metadata JSON</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Host this file on IPFS or your domain, and pass the URL into the Jetton Master contract init data.
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(data?.metadataJson || '', 'meta')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-500 text-xs text-slate-300 hover:text-white flex items-center gap-1.5"
            >
              {copied === 'meta' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied === 'meta' ? 'Copied' : 'Copy JSON'}
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/60 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto select-all">
            {data?.metadataJson || '// Loading metadata...'}
          </pre>
        </div>
      )}

      {/* TAB 3: Master.fc */}
      {activeTab === 'master_fc' && (
        <div className="p-6 rounded-3xl bg-[#0d1424] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">JettonMaster.fc (FunC Smart Contract)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Implements standard minting (Op 21), burning notifications, and TEP-74 getters.
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(data?.masterFunC || '', 'master')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-500 text-xs text-slate-300 hover:text-white flex items-center gap-1.5"
            >
              {copied === 'master' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied === 'master' ? 'Copied' : 'Copy FunC Code'}
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/60 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[500px] select-all">
            {data?.masterFunC || '// Loading FunC code...'}
          </pre>
        </div>
      )}

      {/* TAB 4: Wallet.fc */}
      {activeTab === 'wallet_fc' && (
        <div className="p-6 rounded-3xl bg-[#0d1424] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">JettonWallet.fc (FunC Smart Contract)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Standard TEP-74 User Jetton Wallet for transfers and balance tracking.
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(data?.walletFunC || '', 'wallet')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-500 text-xs text-slate-300 hover:text-white flex items-center gap-1.5"
            >
              {copied === 'wallet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied === 'wallet' ? 'Copied' : 'Copy FunC Code'}
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/60 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[500px] select-all">
            {data?.walletFunC || '// Loading FunC code...'}
          </pre>
        </div>
      )}

      {/* TAB 5: Deployment Guide & Live On-Chain Broadcast */}
      {activeTab === 'deploy' && (
        <div className="space-y-5 text-xs">
          {/* Important Explanation Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/80 via-[#1e1507] to-amber-950/60 border border-amber-500/40 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <Info className="w-5 h-5 text-amber-400 shrink-0" />
              <span>لماذا لا تظهر العملة بعد في محفظة الخزينة؟ (Why isn't the token in your wallet yet?)</span>
            </div>
            <div className="text-slate-300 space-y-2 leading-relaxed">
              <p>
                تم بناء جميع ملفات العقد الذكي (<code className="text-amber-300 font-mono">JettonMaster.fc</code> و <code className="text-amber-300 font-mono">JettonWallet.fc</code>) وميتاداتا العملة وشعارها واقتصادها بالكامل.
              </p>
              <p>
                لكي تظهر العملة <strong>بشكل فعلي وحقيقي داخل تطبيق Tonkeeper ومستكشف TON Explorer</strong>، يجب تنفيذ خطوة أخيرة وهي <strong>بث معاملة نشر العقد (On-Chain Deployment)</strong> على شبكة TON Mainnet.
              </p>
              <p className="text-amber-200/90 font-semibold">
                ⚠️ هذه الخطوة تتطلب دفع رسوم غاز الشبكة (حوالي 0.15 - 0.2 TON) من محفظتك للتوقيع على إنشاء العقد وإصدار الـ 200,000,000 NBS إلى محفظة الخزينة الخاصة بك:
                <br />
                <span className="font-mono text-cyan-300 bg-black/40 px-2 py-1 rounded inline-block mt-1">
                  {settings.treasuryWallet}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Option 1: Official TON Minter */}
          <div className="p-6 rounded-3xl bg-[#0d1424] border border-cyan-500/30 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                  الطريقة الأسهل والأسرع (موصى بها)
                </span>
                <h4 className="text-sm font-bold text-white mt-2">
                  1-Click Deploy via Official TON Foundation Minter
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  أداة النشر الرسمية المعتمدة من مؤسسة TON لنشر عقود Jetton القياسية وربطها بمحفظة Tonkeeper.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/50 border border-slate-800 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between text-slate-300">
                <span>Token Name:</span>
                <span className="font-bold text-white">NBS</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Token Symbol:</span>
                <span className="font-bold text-white">NBS</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Decimals:</span>
                <span className="font-bold text-white">9</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Total Supply to Mint:</span>
                <span className="font-bold text-cyan-400">200,000,000</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Recipient (Treasury):</span>
                <span className="font-bold text-amber-300 truncate max-w-[200px]">{settings.treasuryWallet}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Image Logo URL:</span>
                <span className="font-bold text-slate-400 truncate max-w-[200px]">{window.location.origin}/nbs-logo.jpg</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="https://minter.ton.org"
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/30 transition-all"
              >
                <span>فتح أداة النشر الرسمية (minter.ton.org)</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={() => copyToClipboard(`${window.location.origin}/nbs-logo.jpg`, 'logo_url')}
                className="py-3 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
              >
                {copied === 'logo_url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied === 'logo_url' ? 'تم نسخ رابط الشعار' : 'نسخ رابط صورة الشعار'}
              </button>
            </div>
          </div>

          {/* Form to Bind Deployed Contract Address */}
          <div className="p-6 rounded-3xl bg-[#0d1424] border border-slate-800 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ربط عنوان العقد بعد النشر (Link Deployed Master Address)
            </h4>
            <p className="text-xs text-slate-400">
              بمجرد تأكيد المعاملة في Tonkeeper، انسخ عنوان العقد الناتج (يبدأ بـ EQ أو kQ) وضعه هنا لربط البوت والواجهة بمستكشف البلوكشين تلقائياً:
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="text"
                placeholder="EQ... (Jetton Master Address)"
                defaultValue={settings.jettonMasterAddress}
                id="contract-address-input"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={async () => {
                  const input = document.getElementById('contract-address-input') as HTMLInputElement;
                  if (input && input.value) {
                    await fetch('/api/admin/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ jettonMasterAddress: input.value.trim() }),
                    });
                    onRefreshData();
                    alert('تم حفظ وربط عنوان العقد بنجاح!');
                  }
                }}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0"
              >
                حفظ وربط العقد
              </button>
            </div>
          </div>

          {/* Option 2: Blueprint CLI Guide */}
          <div className="p-6 rounded-3xl bg-[#0d1424] border border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              الطريقة البرمجية المتقدمة: TON Blueprint CLI
            </h4>
            <p className="text-slate-400">
              إذا كنت تفضل النشر عبر سطر الأوامر (Command Line) باستخدام كود FunC الموجود في التبويبات السابقة:
            </p>
            <div className="space-y-2">
              <div className="bg-black/60 p-3 rounded-xl font-mono text-cyan-300">
                npm create ton@latest nbs-jetton -- --type func-jetton
              </div>
              <div className="bg-black/60 p-3 rounded-xl font-mono text-cyan-300">
                npx blueprint build && npx blueprint run deployJettonMaster --mainnet
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
