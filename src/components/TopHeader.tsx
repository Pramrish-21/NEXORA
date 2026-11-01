import React from 'react';
import { Send, Database, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TopHeaderProps {
  onDirectClick: () => void;
  onOpenConfig: () => void;
  unreadCount?: number;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onDirectClick,
  onOpenConfig,
  unreadCount = 0,
}) => {
  const { profile, isSupabaseConnected } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-neutral-900 px-4 h-14 flex items-center justify-between">
      {/* Brand & Connection Indicator */}
      <div className="flex items-center space-x-2">
        <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
          NEXORA
        </span>
        <Sparkles className="w-3.5 h-3.5 text-neutral-500 animate-pulse" />

        <button
          onClick={onOpenConfig}
          className="ml-2 hidden sm:flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400 hover:text-white hover:border-neutral-700 transition"
          title="Supabase Database Status"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isSupabaseConnected ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span>{isSupabaseConnected ? 'Supabase Connected' : 'Config Required'}</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Active user badge */}
        {profile && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-neutral-950 border border-neutral-800 rounded-full text-xs text-neutral-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-[11px] truncate max-w-[100px]">
              @{profile.username}
            </span>
          </div>
        )}

        {/* Database Config Modal Button */}
        <button
          onClick={onOpenConfig}
          aria-label="Cloud & Database status"
          className="p-2 text-neutral-400 hover:text-white active:scale-95 transition"
          title="Database Setup & Status"
        >
          <Database className="w-4.5 h-4.5" />
        </button>

        {/* Direct Messages Icon with unread badge */}
        <button
          onClick={onDirectClick}
          aria-label="Direct Messages"
          className="relative p-2 text-neutral-200 hover:text-white active:scale-90 transition"
        >
          <Send className="w-5 h-5 -rotate-12" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-white text-black text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-black">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
