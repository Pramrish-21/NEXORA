import React, { useEffect, useState, useRef } from 'react';
import { Send, ArrowLeft, Search, CheckCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Message, Profile } from '../types/database';
import { dataService, isValidUUID } from '../lib/dataService';
import { supabase, isConfigured } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface MessagesPageProps {
  initialReceiver?: Profile | null;
  onClearInitialReceiver?: () => void;
  onNavigateToSearch?: () => void;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({
  initialReceiver,
  onClearInitialReceiver,
  onNavigateToSearch,
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Profile[]>([]);
  const [activePartner, setActivePartner] = useState<Profile | null>(initialReceiver || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputContent, setInputContent] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('connecting');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const isRealPartner = Boolean(activePartner && isValidUUID(activePartner.id));

  // If initialReceiver is passed in props, open that conversation
  useEffect(() => {
    if (initialReceiver) {
      setActivePartner(initialReceiver);
    }
  }, [initialReceiver]);

  // Load conversations list
  const loadConversations = async () => {
    if (!user || !isValidUUID(user.id)) return;
    try {
      const convos = await dataService.getConversations(user.id);
      setConversations(convos);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user]);

  // Global inbox listener to update conversation list when new messages arrive
  useEffect(() => {
    if (!user || !isConfigured || !isValidUUID(user.id)) return;

    const inboxChannel = supabase
      .channel(`inbox_notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inboxChannel);
    };
  }, [user]);

  // Load message history and subscribe to Realtime for active conversation
  useEffect(() => {
    if (!user || !activePartner) return;

    if (!isValidUUID(user.id) || !isValidUUID(activePartner.id)) {
      setMessages([]);
      setLoadingHistory(false);
      setSendError(null);
      return;
    }

    setLoadingHistory(true);
    setSendError(null);

    let isMounted = true;
    const fetchHistory = async () => {
      const history = await dataService.getMessages(user.id, activePartner.id);
      if (isMounted) {
        setMessages(history);
        setLoadingHistory(false);
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    };

    fetchHistory();

    // Deterministic channel name based on both user UUIDs
    const channelId = `chat_${[user.id, activePartner.id].sort().join('_')}`;

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Verify message belongs to this 1-on-1 dialogue
          const isRelevant =
            (newMsg.sender_id === activePartner.id && newMsg.receiver_id === user.id) ||
            (newMsg.sender_id === user.id && newMsg.receiver_id === activePartner.id);

          if (isRelevant) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          }
        }
      )
      .subscribe((status) => {
        setRealtimeStatus(status);
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, activePartner]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText ?? inputContent).trim();
    if (!textToSend || !user || !activePartner) return;

    if (!isValidUUID(activePartner.id)) {
      setSendError(
        `Cannot send message to simulated preview profile @${activePartner.username}. Please select a registered member.`
      );
      return;
    }

    setInputContent('');
    setSendError(null);

    try {
      const sentMsg = await dataService.sendMessage(user.id, activePartner.id, textToSend);

      // Optimistically append if not already added by realtime
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });

      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      loadConversations();
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setSendError(err.message || 'Failed to send message. Please check permissions.');
    }
  };

  const handleBackToList = () => {
    setActivePartner(null);
    onClearInitialReceiver?.();
    loadConversations();
  };

  // ACTIVE CHAT VIEW
  if (activePartner) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-black max-w-lg mx-auto">
        {/* Chat Room Top Bar */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-neutral-900 bg-black/95 backdrop-blur-md">
          <div className="flex items-center space-x-3 min-w-0">
            <button
              onClick={handleBackToList}
              className="p-1 -ml-1 text-neutral-400 hover:text-white transition flex-shrink-0"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="relative w-9 h-9 rounded-full bg-neutral-800 overflow-hidden border border-neutral-800 flex-shrink-0">
              {activePartner.avatar_url ? (
                <img src={activePartner.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-neutral-700" />
              )}
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-black ${
                  realtimeStatus === 'SUBSCRIBED' ? 'bg-emerald-500' : 'bg-cyan-500'
                }`}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-sm text-white truncate">
                  @{activePartner.username}
                </span>
                {activePartner.is_verified && (
                  <span className="w-3.5 h-3.5 bg-neutral-200 text-black text-[9px] font-black rounded-full flex items-center justify-center flex-shrink-0">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-[10px] text-neutral-400 truncate font-mono">
                {activePartner.full_name || 'Supabase Realtime'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 text-[10px] font-mono text-neutral-500">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                realtimeStatus === 'SUBSCRIBED' ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'
              }`}
            />
            <span className="hidden sm:inline">
              {realtimeStatus === 'SUBSCRIBED' ? 'LIVE SYNC' : 'SYNCING'}
            </span>
          </div>
        </div>

        {/* Send Error Notice */}
        {sendError && (
          <div className="p-2.5 bg-red-950/80 border-b border-red-800 text-xs text-red-200 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="truncate flex-1">{sendError}</p>
          </div>
        )}

        {/* Curated Preview Notice */}
        {activePartner && !isRealPartner && (
          <div className="p-3 bg-neutral-900 border-b border-neutral-800 text-xs text-neutral-300 flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0 pr-2">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="truncate">
                @{activePartner.username} is a preview profile. Real-time direct messaging connects registered NEXORA accounts.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToSearch}
              className="px-2.5 py-1 bg-white text-black text-[11px] font-semibold rounded-lg hover:bg-neutral-200 transition flex-shrink-0"
            >
              Find Members
            </button>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loadingHistory ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="sm" text="LOADING MESSAGE HISTORY..." />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 px-6 space-y-2.5">
              <div className="w-12 h-12 rounded-full bg-neutral-900 mx-auto flex items-center justify-center border border-neutral-800">
                <Sparkles className="w-5 h-5 text-neutral-400" />
              </div>
              <p className="text-sm font-semibold text-neutral-200">
                Direct Chat with @{activePartner.username}
              </p>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
                Messages sent here are stored in Supabase with Row Level Security. Only you and
                @{activePartner.username} can read this thread.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition ${
                      isMe
                        ? 'bg-neutral-800 text-white rounded-br-sm border border-neutral-700/60'
                        : 'bg-neutral-950 text-neutral-200 border border-neutral-800 rounded-bl-sm'
                    }`}
                  >
                    <p className="break-words">{m.content}</p>
                    <div className="flex items-center justify-end space-x-1 mt-1 text-[9px] text-neutral-500 font-mono">
                      <span>
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isMe && <CheckCheck className="w-3 h-3 text-neutral-400" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Message Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 border-t border-neutral-900 flex items-center space-x-2 bg-black pb-18"
        >
          <input
            type="text"
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder={`Message @${activePartner.username}...`}
            className="flex-1 bg-neutral-900 border border-neutral-800 text-sm text-white rounded-full px-4 py-2.5 outline-none focus:border-neutral-600 transition"
          />
          <button
            type="submit"
            disabled={!inputContent.trim()}
            className="p-2.5 bg-white text-black rounded-full hover:bg-neutral-200 disabled:opacity-30 transition active:scale-90"
            aria-label="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    );
  }

  // CONVERSATIONS LIST VIEW
  const filteredConversations = conversations.filter(
    (c) =>
      c.username.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.full_name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-3 pb-24">
      {/* Title & Start Chat */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide">Direct Messages</h2>
          <p className="text-[11px] text-neutral-500 font-mono">
            Real-time RLS secured one-to-one messaging
          </p>
        </div>
        <button
          onClick={onNavigateToSearch}
          className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs text-neutral-200 transition font-medium"
        >
          New Chat
        </button>
      </div>

      {/* Filter search bar */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
        <input
          type="text"
          placeholder="Filter active conversations..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 font-sans"
        />
      </div>

      {filteredConversations.length === 0 ? (
        <div className="text-center py-16 px-4 space-y-3">
          <p className="text-sm text-neutral-300 font-medium">No active direct messages yet</p>
          <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
            Search for any registered NEXORA user by username to start a live conversation.
          </p>
          <button
            onClick={onNavigateToSearch}
            className="px-4 py-2 bg-white text-black text-xs font-semibold rounded-xl hover:bg-neutral-200 transition"
          >
            Find Registered Members
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((p) => (
            <div
              key={p.id}
              onClick={() => setActivePartner(p)}
              className="flex items-center space-x-3.5 p-3 rounded-2xl bg-neutral-950 border border-neutral-900 hover:border-neutral-800 cursor-pointer transition group"
            >
              <div className="relative w-12 h-12 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-800">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-neutral-700" />
                )}
                <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-black" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-white group-hover:text-neutral-200 truncate">
                    @{p.username}
                  </p>
                  <span className="text-[10px] text-neutral-500 font-mono">Chat</span>
                </div>
                <p className="text-xs text-neutral-400 truncate mt-0.5">
                  {p.full_name || p.bio || 'Tap to open conversation'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
