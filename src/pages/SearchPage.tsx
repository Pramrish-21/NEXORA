import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Globe, User as UserIcon, ExternalLink, MessageCircle, X } from 'lucide-react';
import { Profile, WebSearchResult } from '../types/database';
import { dataService } from '../lib/dataService';
import { fetchLiveWebSearch } from '../lib/searchApi';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface SearchPageProps {
  onSelectUser: (profile: Profile) => void;
}

const SUGGESTED_QUERIES = [
  'Brutalist Architecture',
  'Cyberpunk Cityscape',
  'Analog Photography',
  'Dark Ambient Music',
  'Tokyo Night Aesthetics',
  'Minimalist Design',
];

import { useAuth } from '../context/AuthContext';

export const SearchPage: React.FC<SearchPageProps> = ({ onSelectUser }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'web'>('users');
  const [query, setQuery] = useState('');
  const [userResults, setUserResults] = useState<Profile[]>([]);
  const [webResults, setWebResults] = useState<WebSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial profiles list when tab is 'users' and query is empty
  useEffect(() => {
    if (activeTab === 'users' && !query.trim()) {
      dataService.searchProfiles('', user?.id).then(setUserResults);
    }
  }, [activeTab, query, user?.id]);

  const handleSearch = async (overrideQuery?: string) => {
    const targetQuery = (overrideQuery ?? query).trim();
    if (!targetQuery) {
      if (activeTab === 'users') {
        const all = await dataService.searchProfiles('', user?.id);
        setUserResults(all);
      } else {
        setWebResults([]);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'users') {
        const users = await dataService.searchProfiles(targetQuery, user?.id);
        setUserResults(users);
      } else {
        const liveResults = await fetchLiveWebSearch(targetQuery);
        setWebResults(liveResults);
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePillClick = (pill: string) => {
    setQuery(pill);
    handleSearch(pill);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-3 pb-24">
      {/* Search Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="relative flex items-center"
      >
        <SearchIcon className="w-4 h-4 absolute left-3.5 text-neutral-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={activeTab === 'users' ? 'Search members or keywords...' : 'Search live web encyclopedia...'}
          className="w-full bg-neutral-900 border border-neutral-800 text-sm text-white rounded-2xl pl-10 pr-22 py-3 focus:outline-none focus:border-neutral-600 transition font-sans"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              handleSearch('');
            }}
            className="absolute right-18 text-neutral-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="submit"
          className="absolute right-2 px-3.5 py-1.5 bg-white text-black text-xs font-semibold rounded-xl hover:bg-neutral-200 transition active:scale-95"
        >
          Search
        </button>
      </form>

      {/* Suggested Query Tags */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-2 mt-2">
        <span className="text-[10px] text-neutral-500 font-mono flex-shrink-0">TRENDING:</span>
        {SUGGESTED_QUERIES.map((tag) => (
          <button
            key={tag}
            onClick={() => handlePillClick(tag)}
            className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-full text-[11px] text-neutral-400 hover:text-white whitespace-nowrap transition active:scale-95"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-900 mt-2">
        <button
          onClick={() => {
            setActiveTab('users');
            setError(null);
          }}
          className={`flex-1 pb-3 text-xs font-semibold flex items-center justify-center space-x-2 border-b-2 transition ${
            activeTab === 'users'
              ? 'border-white text-white'
              : 'border-transparent text-neutral-500 hover:text-neutral-400'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>NEXORA Members</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('web');
            setError(null);
            if (!webResults.length && query) {
              handleSearch();
            }
          }}
          className={`flex-1 pb-3 text-xs font-semibold flex items-center justify-center space-x-2 border-b-2 transition ${
            activeTab === 'web'
              ? 'border-white text-white'
              : 'border-transparent text-neutral-500 hover:text-neutral-400'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Live Web Search</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-4 p-3 bg-red-950/70 border border-red-900/80 rounded-xl text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <LoadingSpinner text="SEARCHING..." />}

      {/* USERS TAB */}
      {!loading && activeTab === 'users' && (
        <div className="mt-4 space-y-2">
          {userResults.length === 0 && (
            <p className="text-center text-xs text-neutral-500 py-10">
              No members matching &quot;{query}&quot; found.
            </p>
          )}

          {userResults.map((u) => (
            <div
              key={u.id}
              onClick={() => onSelectUser(u)}
              className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950/60 border border-neutral-900 hover:border-neutral-800 transition cursor-pointer group"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-800">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-neutral-700" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <p className="text-sm font-semibold text-white group-hover:text-neutral-200 truncate">
                      @{u.username}
                    </p>
                    {u.is_verified && (
                      <span className="w-3.5 h-3.5 bg-neutral-200 text-black text-[9px] font-black rounded-full flex items-center justify-center">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 truncate">{u.full_name || u.bio}</p>
                  <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                    {u.followers_count || 120} followers
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectUser(u);
                }}
                className="px-3 py-1.5 bg-neutral-900 group-hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs text-neutral-300 hover:text-white flex items-center space-x-1.5 transition active:scale-95 flex-shrink-0 ml-2"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Message</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* LIVE WEB TAB */}
      {!loading && activeTab === 'web' && (
        <div className="mt-4 space-y-3">
          {!query && webResults.length === 0 && (
            <div className="text-center py-12 px-4 space-y-2">
              <Globe className="w-10 h-10 text-neutral-600 mx-auto" />
              <p className="text-sm text-neutral-300 font-medium">Live Encyclopedic Web Exploration</p>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                Type any subject, city, theory, or art movement above to stream verified live data directly from the web.
              </p>
            </div>
          )}

          {query && webResults.length === 0 && (
            <p className="text-center text-xs text-neutral-500 py-10">No live web results found for &quot;{query}&quot;.</p>
          )}

          {webResults.map((res, index) => (
            <a
              key={index}
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-2xl bg-neutral-950/80 border border-neutral-900 hover:border-neutral-700 transition group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-neutral-500 truncate max-w-[85%]">
                  {res.url.replace('https://', '')}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white transition flex-shrink-0" />
              </div>
              <h3 className="text-sm font-semibold text-white mt-1 group-hover:text-neutral-200 transition">
                {res.title}
              </h3>
              <p className="text-xs text-neutral-400 mt-1 line-clamp-3 leading-relaxed">
                {res.snippet}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
