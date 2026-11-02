import React, { useState, useEffect } from 'react';
import { User, ProjectSettings } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { Trophy, Users, Award, Flame, Sparkles } from 'lucide-react';

interface LeaderboardViewProps {
  user: User;
  settings: ProjectSettings;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ user, settings }) => {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'miners' | 'referrers'>('miners');
  const [topMiners, setTopMiners] = useState<User[]>([]);
  const [topReferrers, setTopReferrers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (data.success) {
        setTopMiners(data.topMiners || []);
        setTopReferrers(data.topReferrers || []);
      }
    } catch (err) {
      console.error('Failed to load leaderboard', err);
    } finally {
      setLoading(false);
    }
  };

  const getMedal = (idx: number) => {
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return `#${idx + 1}`;
  };

  const currentList = tab === 'miners' ? topMiners : topReferrers;

  return (
    <div className="space-y-6 pb-20">
      {/* Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          {t('hallOfFameBadge')}
        </div>
        <h2 className="text-2xl font-black text-white">{t('leaderboardTitle')}</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          {t('leaderboardDesc')}
        </p>

        {/* Tab Switcher */}
        <div className="inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl mt-3 text-xs">
          <button
            onClick={() => setTab('miners')}
            className={`px-4 py-1.5 rounded-lg font-semibold transition-all ${
              tab === 'miners' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('topMinersTab')}
          </button>
          <button
            onClick={() => setTab('referrers')}
            className={`px-4 py-1.5 rounded-lg font-semibold transition-all ${
              tab === 'referrers' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('topReferrersTab')}
          </button>
        </div>
      </div>

      {/* Leaderboard Table / Cards */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">{t('loadingRankings')}</div>
        ) : currentList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">{t('noRankings')}</div>
        ) : (
          currentList.map((item, idx) => {
            const isMe = item.id === user.id;
            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  isMe
                    ? 'bg-[#121c38] border-cyan-500/70 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/30'
                    : 'bg-[#0d1424] border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 text-center font-bold text-base">{getMedal(idx)}</div>
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-cyan-300 uppercase">
                    {item.firstName.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {item.firstName} {item.lastName || ''}
                      </span>
                      {isMe && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold uppercase">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>@{item.username}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <span>{item.subscription.name}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {tab === 'miners' ? (
                    <div>
                      <div className="text-xs font-bold text-cyan-300 font-mono">
                        {item.balances.totalEarned.toFixed(1)} {settings.tokenSymbol}
                      </div>
                      <div className="text-[10px] text-slate-500">Mined</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-bold text-purple-300 font-mono">
                        {item.totalReferrals} Invited
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.activeReferrals} Active
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
