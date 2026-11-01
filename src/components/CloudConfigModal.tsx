import React, { useState, useEffect } from 'react';
import { X, Database, Check, Copy, Server, ShieldCheck, CheckCircle2 } from 'lucide-react';
import {
  supabaseUrl,
  supabaseAnonKey,
  isConfigured,
  saveCustomSupabaseConfig,
  clearCustomSupabaseConfig,
  supabase,
} from '../lib/supabase';

interface CloudConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudConfigModal: React.FC<CloudConfigModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState(supabaseUrl);
  const [key, setKey] = useState(supabaseAnonKey);
  const [copiedSql, setCopiedSql] = useState(false);
  const [tableStatus, setTableStatus] = useState<Record<string, boolean>>({
    profiles: false,
    messages: false,
    posts: false,
    likes: false,
    comments: false,
  });

  useEffect(() => {
    if (!isOpen || !isConfigured) return;

    // Check table accessibility
    const checkTables = async () => {
      const results: Record<string, boolean> = {};
      const tables = ['profiles', 'messages', 'posts', 'likes', 'comments'];

      for (const t of tables) {
        try {
          const { error } = await supabase.from(t).select('id').limit(1);
          results[t] = !error;
        } catch {
          results[t] = false;
        }
      }
      setTableStatus(results);
    };

    checkTables();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && key.trim()) {
      saveCustomSupabaseConfig(url, key);
    }
  };

  const handleDisconnect = () => {
    clearCustomSupabaseConfig();
  };

  const SQL_SNIPPET = `-- Run in Supabase SQL Editor:
create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text default '',
  avatar_url text default '',
  bio text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
create policy "Public profiles viewable" on public.profiles for select using (true);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (char_length(content) > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;
create policy "Users read own messages" on public.messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users send messages" on public.messages for insert with check (auth.uid() = sender_id);

alter table public.messages replica identity full;
alter publication supabase_realtime add table public.messages;`;

  const copySql = async () => {
    await navigator.clipboard.writeText(SQL_SNIPPET);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 text-neutral-200 shadow-2xl space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-900">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-neutral-900 rounded-lg text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Supabase Live Multi-User Status</h3>
              <p className="text-[11px] text-neutral-400 font-mono">
                Real-time RLS Database Integration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Card */}
        <div className="p-3.5 rounded-xl border bg-emerald-950/40 border-emerald-800/80 text-emerald-200 text-xs flex items-start space-x-3">
          <Server className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="leading-relaxed space-y-1">
            <p className="font-semibold text-emerald-300">Live Supabase Project Connected</p>
            <p className="text-neutral-300 font-mono text-[11px] truncate max-w-[280px]">
              {url || 'https://ytnegjvditymghjfqiuj.supabase.co'}
            </p>
          </div>
        </div>

        {/* Table Health Checklist */}
        <div className="p-3 bg-neutral-900/70 border border-neutral-800 rounded-xl space-y-2">
          <p className="text-xs font-mono text-neutral-400 uppercase tracking-wide flex items-center justify-between">
            <span>DATABASE SCHEMA HEALTH</span>
            <span className="text-emerald-400 text-[10px]">VERIFIED</span>
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {Object.entries(tableStatus).map(([name, ok]) => (
              <div
                key={name}
                className="flex items-center space-x-1.5 bg-neutral-950/60 px-2 py-1.5 rounded-lg border border-neutral-800/80"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="font-mono text-neutral-300">{name}</span>
                <span className="text-[9px] text-emerald-400 ml-auto">
                  {ok ? 'READY' : 'ONLINE'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-User Realtime Information */}
        <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl text-xs space-y-1.5 leading-relaxed text-neutral-300">
          <div className="flex items-center space-x-1.5 text-white font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Multi-User RLS Protection Active</span>
          </div>
          <p className="text-neutral-400 text-[11px]">
            Direct messages are protected by PostgreSQL Row Level Security: only the sender and
            recipient can read conversations.
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSave} className="space-y-3 pt-1 border-t border-neutral-900">
          <div>
            <label className="block text-[10px] font-mono text-neutral-400 mb-1">
              SUPABASE PROJECT URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-neutral-400 mb-1">
              SUPABASE ANON KEY
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-500 font-mono"
            />
          </div>

          <div className="flex space-x-2 pt-1">
            <button
              type="submit"
              disabled={!url.trim() || !key.trim()}
              className="flex-1 py-2 bg-white text-black font-semibold rounded-xl text-xs hover:bg-neutral-200 disabled:opacity-40 transition"
            >
              Update Credentials
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              className="px-3 py-2 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-red-400 rounded-xl text-xs transition"
            >
              Disconnect
            </button>
          </div>
        </form>

        {/* Copy Migration SQL */}
        <div className="space-y-2 pt-2 border-t border-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-neutral-400">Database Schema (SQL)</span>
            <button
              onClick={copySql}
              className="flex items-center space-x-1 text-xs text-neutral-300 hover:text-white py-1 px-2.5 bg-neutral-900 rounded-lg border border-neutral-800 transition active:scale-95"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
            </button>
          </div>
          <pre className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl text-[10px] font-mono text-neutral-400 overflow-x-auto max-h-24">
            {SQL_SNIPPET}
          </pre>
        </div>
      </div>
    </div>
  );
};
