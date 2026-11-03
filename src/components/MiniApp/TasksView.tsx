import React, { useState, useEffect } from 'react';
import { User, ProjectSettings, Task, UserTaskProgress } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  CheckCircle2,
  Send,
  Users,
  Twitter,
  UserPlus,
  CalendarCheck,
  ExternalLink,
  Sparkles,
  Clock,
  Check,
} from 'lucide-react';

interface TasksViewProps {
  user: User;
  settings: ProjectSettings;
  onRefreshUser: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  user,
  settings,
  onRefreshUser,
}) => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [progress, setProgress] = useState<UserTaskProgress[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; text: string; error?: boolean } | null>(null);

  const [openedTasks, setOpenedTasks] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('nbs_opened_tasks') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    fetchTasks();
  }, [user.id]);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
        setProgress(data.progress || []);
      }
    } catch (err) {
      console.error('Failed to load tasks', err);
    }
  };

  const handleOpenTask = (task: Task) => {
    if (task.actionUrl) {
      window.open(task.actionUrl, '_blank');
      const next = { ...openedTasks, [task.id]: true };
      setOpenedTasks(next);
      try {
        localStorage.setItem('nbs_opened_tasks', JSON.stringify(next));
      } catch {}
      setFeedback({
        id: task.id,
        text: '🔗 تم فتح الرابط! يرجى الانضمام والاشتراك أولاً، ثم العودة والضغط على "تحقق واستلام المكافأة".',
      });
    }
  };

  const handleCompleteTask = async (task: Task) => {
    if (task.actionUrl && !openedTasks[task.id]) {
      setFeedback({
        id: task.id,
        text: '⚠️ يجب الضغط على رابط المهمة والاشتراك الفعلي أولاً قبل التحقق واستلام المكافأة!',
        error: true,
      });
      handleOpenTask(task);
      return;
    }

    setClaimingTaskId(task.id);
    setFeedback(null);
    try {
      const res = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, taskId: task.id, visited: true }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'فشل التحقق من إكمال المهمة');
      }
      setFeedback({ id: task.id, text: data.message || t('claimedBadge') });
      fetchTasks();
      onRefreshUser();
    } catch (err: any) {
      setFeedback({ id: task.id, text: err.message || 'تعذر التحقق من الاشتراك', error: true });
    } finally {
      setClaimingTaskId(null);
    }
  };

  const getTaskIcon = (iconName: string) => {
    switch (iconName) {
      case 'Send':
        return <Send className="w-5 h-5 text-cyan-400" />;
      case 'Users':
        return <Users className="w-5 h-5 text-blue-400" />;
      case 'Twitter':
        return <Twitter className="w-5 h-5 text-sky-400" />;
      case 'UserPlus':
        return <UserPlus className="w-5 h-5 text-purple-400" />;
      case 'CalendarCheck':
        return <CalendarCheck className="w-5 h-5 text-amber-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'telegram':
        return t('categoryTelegram');
      case 'daily':
        return t('categoryDaily');
      case 'referral':
        return t('categoryReferral');
      case 'special':
        return t('categorySpecial');
      default:
        return t('categoryAll');
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeCategory === 'all') return true;
    return t.category === activeCategory;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-950/60 via-[#0d1424] to-cyan-950/60 border border-blue-500/20 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          {t('tasksHeaderTitle')}
        </h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          {t('tasksHeaderDesc')}
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {['all', 'telegram', 'daily', 'referral', 'special'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {getCategoryLabel(cat)}
          </button>
        ))}
      </div>

      {/* Task Cards Grid */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {t('noTasks')}
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = progress.some(
              (p) => p.taskId === task.id && p.status === 'COMPLETED'
            );
            const isClaiming = claimingTaskId === task.id;
            const taskFeedback = feedback?.id === task.id ? feedback : null;

            return (
              <div
                key={task.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isCompleted
                    ? 'bg-[#0a0f1d]/60 border-slate-800/60 opacity-80'
                    : 'bg-[#0d1424] border-slate-800 hover:border-cyan-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      {getTaskIcon(task.iconName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white">{task.title}</h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                          +{task.reward} {settings.tokenSymbol}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {task.description}
                      </p>
                    </div>
                  </div>

                  {/* Action or Claim Button */}
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('claimedBadge')}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        {task.actionUrl && !openedTasks[task.id] ? (
                          <button
                            onClick={() => handleOpenTask(task)}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white font-bold text-xs shadow-md shadow-cyan-500/25 transition-all flex items-center gap-1.5 animate-pulse"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{task.category === 'telegram' ? 'انضمام للقناة' : 'فتح الرابط'}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCompleteTask(task)}
                            disabled={isClaiming}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-500/25 transition-all flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isClaiming ? 'جارِ التحقق...' : 'تحقق واستلام'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {taskFeedback && (
                  <div
                    className={`mt-2 p-2 rounded-lg text-[11px] ${
                      taskFeedback.error
                        ? 'bg-rose-950/50 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {taskFeedback.text}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
