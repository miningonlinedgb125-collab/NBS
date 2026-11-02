import React, { useState, useEffect } from 'react';
import { User, ProjectSettings } from '../../types';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Ban,
  ShieldCheck,
  Wallet,
  Coins,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface UserManagementProps {
  settings: ProjectSettings;
  onRefreshData: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  settings,
  onRefreshData,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [searchQuery]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBan = async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}/ban`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to toggle ban', err);
    }
  };

  const handleActivateWallet = async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}/activate-wallet`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to manually activate wallet', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by ID, @username, wallet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d1424] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <button
          onClick={fetchUsers}
          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh List ({users.length})
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-[#0d1424] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Wallet & Status</th>
                <th className="p-4">Balances</th>
                <th className="p-4">Mining & Tier</th>
                <th className="p-4">Referrals</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                  {/* User name & ID */}
                  <td className="p-4">
                    <div className="font-bold text-white">
                      {u.firstName} {u.lastName || ''}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">@{u.username}</div>
                    <div className="text-[10px] text-slate-500 font-mono">ID: {u.id}</div>
                  </td>

                  {/* Wallet address & status */}
                  <td className="p-4">
                    {u.walletAddress ? (
                      <div className="font-mono text-cyan-300 text-[11px] truncate max-w-[140px]">
                        {u.walletAddress.slice(0, 6)}...{u.walletAddress.slice(-4)}
                      </div>
                    ) : (
                      <div className="text-slate-500 text-[11px] italic">No wallet linked</div>
                    )}
                    <span
                      className={`inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded mt-1 ${
                        u.isWalletActivated
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {u.isWalletActivated ? 'Paid 0.05 TON' : 'Unactivated'}
                    </span>
                  </td>

                  {/* Balances */}
                  <td className="p-4 font-mono">
                    <div className="text-white font-bold">
                      {u.balances.availableJetton.toFixed(1)} {settings.tokenSymbol}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Earned: {u.balances.totalEarned.toFixed(1)}
                    </div>
                  </td>

                  {/* Mining State */}
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          u.miningState.isMining ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'
                        }`}
                      />
                      <span className="font-semibold text-slate-300">
                        {u.miningState.isMining ? 'Mining (24h)' : 'Idle'}
                      </span>
                    </div>
                    <div className="text-[10px] text-purple-400 mt-0.5 font-medium">
                      {u.subscription.name} ({u.subscription.multiplier}x)
                    </div>
                  </td>

                  {/* Referrals */}
                  <td className="p-4 text-slate-300">
                    <div>{u.totalReferrals} Friends</div>
                    <div className="text-[10px] text-slate-500 font-mono">Code: {u.referralCode}</div>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right space-x-2 whitespace-nowrap">
                    {!u.isWalletActivated && (
                      <button
                        onClick={() => handleActivateWallet(u)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900 text-[11px] font-semibold"
                        title="Manually verify wallet activation"
                      >
                        Verify 0.05 TON
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleBan(u)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                        u.isBanned
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                          : 'bg-rose-950 text-rose-300 border-rose-500/40 hover:bg-rose-900'
                      }`}
                    >
                      {u.isBanned ? 'Unban' : 'Ban'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
