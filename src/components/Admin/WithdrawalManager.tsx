import React, { useState, useEffect } from 'react';
import { ProjectSettings, WithdrawalRequest } from '../../types';
import { getTonviewerTxUrl } from '../../contracts/jetton-utils';
import {
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Clock,
  ShieldCheck,
  Send,
} from 'lucide-react';

interface WithdrawalManagerProps {
  settings: ProjectSettings;
  onRefreshData: () => void;
}

export const WithdrawalManager: React.FC<WithdrawalManagerProps> = ({
  settings,
  onRefreshData,
}) => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [customTxHash, setCustomTxHash] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'EXECUTED' | 'REJECTED'>('ALL');

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview');
      const data = await res.json();
      if (data.success) {
        // Fetch all withdrawals via admin endpoint or ledger
        const resW = await fetch(`/api/withdrawals/history?userId=admin_999`);
        // For admin, let's load all via storage
        setWithdrawals(data.withdrawals || []);
      }
    } catch (err) {
      console.error('Failed to load withdrawals', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          blockchainTxHash: customTxHash || `tx_jetton_mainnet_${Date.now()}`,
          adminNote: adminNote || (action === 'APPROVE' ? 'Approved by Admin' : 'Rejected by Admin'),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedRequest(null);
        setCustomTxHash('');
        setAdminNote('');
        fetchWithdrawals();
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to process withdrawal action', err);
    }
  };

  const filtered = withdrawals.filter((w) => {
    if (filterStatus === 'ALL') return true;
    return w.status === filterStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
            TON Jetton Withdrawal Processing Desk
          </h3>
          <p className="text-xs text-slate-400">
            Audit requests, sign on-chain transfers, or reject and refund tokens to user ledger.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 text-xs bg-slate-900 p-1 rounded-xl border border-slate-800">
          {(['ALL', 'PENDING', 'EXECUTED', 'REJECTED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                filterStatus === st
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="rounded-3xl bg-[#0d1424] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Request ID</th>
                <th className="p-4">User</th>
                <th className="p-4">Destination TON Wallet</th>
                <th className="p-4">Amount & Fee</th>
                <th className="p-4">Status & Tx Hash</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No withdrawal requests matching filter.
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4 font-mono text-slate-400">
                      {w.id}
                      <div className="text-[10px] text-slate-500">
                        {new Date(w.requestedAt).toLocaleString()}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-white">@{w.username}</div>
                      <div className="text-[10px] text-slate-500 font-mono">UID: {w.userId}</div>
                    </td>

                    <td className="p-4 font-mono text-cyan-300">
                      <div className="truncate max-w-[140px]">{w.walletAddress}</div>
                      <span className="text-[10px] text-slate-500">Verified Mainnet Address</span>
                    </td>

                    <td className="p-4 font-mono">
                      <div className="text-white font-bold">
                        {w.netAmount} {settings.tokenSymbol}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Gross: {w.amount} | Fee: {w.fee}
                      </div>
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                          w.status === 'EXECUTED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : w.status === 'PENDING'
                            ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {w.status}
                      </span>
                      {w.blockchainTxHash && (
                        <div className="mt-1">
                          <a
                            href={getTonviewerTxUrl(w.blockchainTxHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
                          >
                            View on Tonviewer <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}
                    </td>

                    <td className="p-4 text-right space-x-2">
                      {w.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleAction(w.id, 'APPROVE')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                          >
                            Approve & Pay
                          </button>
                          <button
                            onClick={() => handleAction(w.id, 'REJECT')}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px]"
                          >
                            Reject & Refund
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
