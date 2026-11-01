import React from 'react';
import { Home, Search, PlusSquare, MessageCircle, User as UserIcon } from 'lucide-react';

export type NavTab = 'feed' | 'search' | 'create' | 'messages' | 'profile';

interface BottomNavProps {
  currentTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  avatarUrl?: string;
  hasUnreadMessages?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  avatarUrl,
  hasUnreadMessages,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-neutral-900 px-6 h-14 flex items-center justify-between safe-area-bottom">
      <button
        onClick={() => onChangeTab('feed')}
        className={`p-2 transition active:scale-75 ${
          currentTab === 'feed' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
        }`}
        aria-label="Home Feed"
      >
        <Home className={`w-6 h-6 ${currentTab === 'feed' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
      </button>

      <button
        onClick={() => onChangeTab('search')}
        className={`p-2 transition active:scale-75 ${
          currentTab === 'search' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
        }`}
        aria-label="Search"
      >
        <Search className={`w-6 h-6 ${currentTab === 'search' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
      </button>

      <button
        onClick={() => onChangeTab('create')}
        className={`p-2 transition active:scale-75 ${
          currentTab === 'create' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
        }`}
        aria-label="Create Post"
      >
        <PlusSquare
          className={`w-6 h-6 ${currentTab === 'create' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`}
        />
      </button>

      <button
        onClick={() => onChangeTab('messages')}
        className={`relative p-2 transition active:scale-75 ${
          currentTab === 'messages' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
        }`}
        aria-label="Messages"
      >
        <MessageCircle
          className={`w-6 h-6 ${currentTab === 'messages' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`}
        />
        {hasUnreadMessages && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full ring-2 ring-black" />
        )}
      </button>

      <button
        onClick={() => onChangeTab('profile')}
        className="p-1 transition active:scale-75"
        aria-label="Your Profile"
      >
        <div
          className={`w-7 h-7 rounded-full overflow-hidden border-2 transition ${
            currentTab === 'profile'
              ? 'border-white ring-1 ring-neutral-400'
              : 'border-transparent opacity-80 hover:opacity-100'
          }`}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-neutral-400">
              <UserIcon className="w-4 h-4" />
            </div>
          )}
        </div>
      </button>
    </nav>
  );
};
