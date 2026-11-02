import React, { useState, useEffect } from 'react';
import { Task, ProjectSettings } from '../../types';
import { Plus, Trash2, Edit3, Check, X, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface TaskManagerProps {
  settings: ProjectSettings;
  onRefreshData: () => void;
}

export const TaskManager: React.FC<TaskManagerProps> = ({ settings, onRefreshData }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    category: 'telegram',
    reward: 25,
    iconName: 'Send',
    actionUrl: '',
    channelId: '',
    targetCount: 1,
    isActive: true,
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Failed to load tasks', err);
    }
  };

  const handleOpenCreate = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      category: 'telegram',
      reward: 25,
      iconName: 'Send',
      actionUrl: '',
      channelId: '',
      targetCount: 1,
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({ ...task });
    setShowModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(editingTask);
      const url = isEdit ? `/api/admin/tasks/${editingTask!.id}` : '/api/admin/tasks';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchTasks();
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to save task', err);
    }
  };

  const handleToggleActive = async (task: Task) => {
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !task.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTasks();
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to toggle task', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchTasks();
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Protocol Bounties & Tasks Manager
          </h3>
          <p className="text-xs text-slate-400">
            Define community tasks, on-chain/Telegram verification criteria, and rewards.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" />
          Add New Task
        </button>
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tasks.map((t) => (
          <div
            key={t.id}
            className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
              t.isActive
                ? 'bg-[#0d1424] border-slate-800'
                : 'bg-[#0a0e1a]/60 border-slate-900 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  {t.title}
                  {!t.isActive && (
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 font-bold">
                      Paused
                    </span>
                  )}
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  +{t.reward} {settings.tokenSymbol}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{t.description}</p>
              
              <div className="mt-2 space-y-1">
                {t.channelId && (
                  <div className="text-[10px] text-cyan-400 font-mono">
                    Telegram Check: {t.channelId}
                  </div>
                )}
                {t.targetCount && (
                  <div className="text-[10px] text-purple-400 font-mono">
                    Target Referrals: {t.targetCount}
                  </div>
                )}
                {t.actionUrl && (
                  <div className="text-[10px] text-slate-500 font-mono truncate">
                    Link: {t.actionUrl}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="capitalize px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-semibold">
                  {t.category}
                </span>
                <button
                  onClick={() => handleToggleActive(t)}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    t.isActive
                      ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {t.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEdit(t)}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                  title="Edit task"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteTask(t.id)}
                  className="p-1.5 rounded hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0d1424] border border-cyan-500/30 rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white">
                {editingTask ? 'Edit Task' : 'Create New Protocol Task'}
              </h4>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Task Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Join Official Announcements Channel"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Description</label>
                <textarea
                  required
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explain requirements to miners..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as any })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="telegram">Telegram</option>
                    <option value="daily">Daily</option>
                    <option value="special">Special</option>
                    <option value="referral">Referral</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Reward ({settings.tokenSymbol})</label>
                  <input
                    type="number"
                    required
                    value={formData.reward}
                    onChange={(e) => setFormData({ ...formData, reward: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {formData.category === 'telegram' && (
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Telegram Channel ID / Handle (for getChatMember check)</label>
                  <input
                    type="text"
                    value={formData.channelId || ''}
                    onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                    placeholder="@tonmining_announcements or -100..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              )}

              {formData.category === 'referral' && (
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Required Referrals Count</label>
                  <input
                    type="number"
                    value={formData.targetCount || 1}
                    onChange={(e) => setFormData({ ...formData, targetCount: Number(e.target.value) })}
                    placeholder="3"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Action URL (Link)</label>
                <input
                  type="url"
                  value={formData.actionUrl || ''}
                  onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                  placeholder="https://t.me/..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="taskActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-700"
                />
                <label htmlFor="taskActive" className="text-slate-300 font-medium">
                  Active (Miners can view and complete)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:brightness-110 shadow-md shadow-cyan-500/25 transition-all"
                >
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
