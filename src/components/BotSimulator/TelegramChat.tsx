import React, { useState, useEffect, useRef } from 'react';
import { User, ProjectSettings } from '../../types';
import {
  Send,
  Bot,
  User as UserIcon,
  Sparkles,
  Smartphone,
  ExternalLink,
  RotateCcw,
  CheckCheck,
  Pickaxe,
} from 'lucide-react';

interface TelegramChatProps {
  user: User;
  settings: ProjectSettings;
  onOpenMiniApp: () => void;
  onRefreshUser: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
  inlineButtons?: { text: string; callback_data?: string; url?: string; web_app?: { url: string } }[][];
  keyboard?: { text: string; web_app?: { url: string } }[][];
}

export const TelegramChat: React.FC<TelegramChatProps> = ({
  user,
  settings,
  onOpenMiniApp,
  onRefreshUser,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeKeyboard, setActiveKeyboard] = useState<{ text: string; web_app?: { url: string } }[][] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Send initial /start if conversation empty
    if (messages.length === 0) {
      sendMessage('/start');
    }
  }, [user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/bot/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          username: user.username,
          firstName: user.firstName,
          text,
        }),
      });

      const data = await res.json();
      if (data.success && data.response) {
        const botMsg: ChatMessage = {
          id: `b_${Date.now()}`,
          sender: 'bot',
          text: data.response.text,
          timestamp: Date.now(),
          inlineButtons: data.response.replyMarkup?.inline_keyboard,
          keyboard: data.response.replyMarkup?.keyboard,
        };

        setMessages((prev) => [...prev, botMsg]);

        if (data.response.replyMarkup?.keyboard) {
          setActiveKeyboard(data.response.replyMarkup.keyboard);
        }

        onRefreshUser();
      }
    } catch (err) {
      console.error('Failed to communicate with bot', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInlineClick = (btn: { text: string; callback_data?: string; url?: string; web_app?: { url: string } }) => {
    if (btn.web_app) {
      onOpenMiniApp();
    } else if (btn.url) {
      window.open(btn.url, '_blank');
    } else if (btn.callback_data) {
      // Map callback to command
      const cmdMap: Record<string, string> = {
        cmd_mine: '⚡ Start Mining',
        cmd_balance: '💰 My Balance',
        cmd_tasks: '📋 Daily Tasks',
        cmd_wallet: '💎 Connect Wallet',
        cmd_withdraw: '🏧 Withdraw',
      };
      const mapped = cmdMap[btn.callback_data] || btn.callback_data;
      sendMessage(mapped);
    } else {
      sendMessage(btn.text);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    sendMessage('/start');
  };

  const QUICK_COMMANDS = [
    { label: '/start', text: '/start' },
    { label: '⚡ Mine', text: '⚡ Start Mining' },
    { label: '💰 Balance', text: '💰 My Balance' },
    { label: '📋 Tasks', text: '📋 Daily Tasks' },
    { label: '👥 Invite', text: '👥 Invite Friends' },
    { label: '💎 Wallet', text: '💎 Connect Wallet' },
    { label: '💎 Plans', text: '💎 Subscription Plans' },
    { label: '🏧 Withdraw', text: '🏧 Withdraw' },
    { label: '📜 History', text: '📜 Transaction History' },
    { label: '🏆 Rank', text: '🏆 Leaderboard' },
    { label: '❓ Help', text: '❓ Help & Support' },
  ];

  return (
    <div className="max-w-2xl mx-auto h-[85vh] flex flex-col bg-[#0f172a] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Bot Chat Header */}
      <div className="bg-[#1e293b] p-3.5 border-b border-slate-700/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#1e293b]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">
                @{settings.telegramBotUsername || 'TonMiningOfficialBot'}
              </h3>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-semibold uppercase">
                bot
              </span>
            </div>
            <p className="text-[11px] text-slate-400">TON Mainnet Cloud Mining Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenMiniApp}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Launch Mini App
          </button>
          <button
            onClick={handleResetChat}
            title="Reset Chat"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-[#0f172a] to-[#0a0f1d]">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-wrap shadow-md ${
                  isUser
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-br-none'
                    : 'bg-[#1e293b] text-slate-200 border border-slate-700/60 rounded-bl-none'
                }`}
              >
                {msg.text}

                <div
                  className={`text-[9px] mt-1.5 flex items-center justify-end gap-1 ${
                    isUser ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isUser && <CheckCheck className="w-3 h-3 text-cyan-200" />}
                </div>
              </div>

              {/* Inline Keyboard Attached to Bot Message */}
              {msg.inlineButtons && msg.inlineButtons.length > 0 && (
                <div className="mt-2 space-y-1.5 max-w-[85%] w-full">
                  {msg.inlineButtons.map((row, rIdx) => (
                    <div key={rIdx} className="grid grid-flow-col auto-cols-fr gap-1.5">
                      {row.map((btn, bIdx) => (
                        <button
                          key={bIdx}
                          onClick={() => handleInlineClick(btn)}
                          className="py-2 px-3 rounded-xl bg-slate-800/95 hover:bg-cyan-950/70 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 text-center truncate"
                        >
                          {btn.web_app ? (
                            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                          ) : btn.url ? (
                            <ExternalLink className="w-3.5 h-3.5" />
                          ) : null}
                          <span className="truncate">{btn.text}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Command Toolbar */}
      <div className="px-3 py-1.5 bg-[#182235] border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <span className="text-slate-400 text-[10px] font-bold uppercase shrink-0">Quick:</span>
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd.text}
            onClick={() => sendMessage(cmd.text)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium shrink-0 border border-slate-700 transition-colors"
          >
            {cmd.label}
          </button>
        ))}
      </div>

      {/* Reply Keyboard (Bottom Native Telegram Buttons) */}
      {activeKeyboard && (
        <div className="p-2.5 bg-[#1e293b] border-t border-slate-700/80 space-y-1.5">
          {activeKeyboard.map((row, rIdx) => (
            <div key={rIdx} className="grid grid-flow-col auto-cols-fr gap-1.5">
              {row.map((btn, bIdx) => (
                <button
                  key={bIdx}
                  onClick={() => {
                    if (btn.web_app) {
                      onOpenMiniApp();
                    } else {
                      sendMessage(btn.text);
                    }
                  }}
                  className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-1 truncate shadow-sm"
                >
                  {btn.web_app && <Smartphone className="w-3 h-3 text-cyan-400" />}
                  <span className="truncate">{btn.text}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Chat Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(inputText);
        }}
        className="p-3 bg-[#111827] border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          placeholder="Type a command (/start, /mine, /balance...)"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 disabled:opacity-50 text-white shadow-md shadow-cyan-500/20 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
