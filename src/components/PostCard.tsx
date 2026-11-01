import React, { useState } from 'react';
import { Heart, MessageSquare, Send, Bookmark, MoreHorizontal, Check, Share2 } from 'lucide-react';
import { Post, Profile } from '../types/database';
import { dataService } from '../lib/dataService';
import { useAuth } from '../context/AuthContext';

interface PostCardProps {
  post: Post;
  onOpenComments: (post: Post) => void;
  onSelectUser?: (profile: Profile) => void;
  onPostUpdated?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onOpenComments,
  onSelectUser,
  onPostUpdated,
}) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState<boolean>(post.user_has_liked || false);
  const [likesCount, setLikesCount] = useState<number>(post.likes_count || 0);
  const [saved, setSaved] = useState<boolean>(post.saved || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const toggleLike = async () => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);

    const prevLiked = liked;
    const prevCount = likesCount;

    setLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      await dataService.toggleLike(post.id, user.id);
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      console.error('Failed to toggle like:', err);
      setLiked(prevLiked);
      setLikesCount(prevCount);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      if (!liked) {
        toggleLike();
      }
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 900);
    }
    setLastTap(now);
  };

  const handleToggleSave = async () => {
    const newSaved = await dataService.toggleSavePost(post.id);
    setSaved(newSaved);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by @${post.profiles?.username || 'user'} on NEXORA`,
          text: post.caption,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to copy link
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignored
    }
  };

  // Format relative timestamp
  const formatTimeAgo = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Get CSS filter class
  const getFilterClass = (filterName?: string) => {
    switch (filterName) {
      case 'noir':
        return 'grayscale contrast-125';
      case 'matrix':
        return 'contrast-125 brightness-95 hue-rotate-15';
      case 'film':
        return 'sepia-[0.25] contrast-105';
      case 'vivid':
        return 'contrast-110 saturate-125';
      default:
        return '';
    }
  };

  return (
    <article className="border-b border-neutral-900 pb-3 bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div
          onClick={() => post.profiles && onSelectUser?.(post.profiles)}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-800 p-[1.5px] bg-gradient-to-tr from-neutral-500 to-white flex-shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900">
              {post.profiles?.avatar_url ? (
                <img
                  src={post.profiles.avatar_url}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                />
              ) : (
                <div className="w-full h-full bg-neutral-700" />
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-sm text-neutral-100 group-hover:text-white transition">
                {post.profiles?.username || 'user'}
              </span>
              {post.profiles?.is_verified && (
                <span className="w-3.5 h-3.5 bg-neutral-200 text-black text-[9px] font-black rounded-full flex items-center justify-center">
                  ✓
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500">{formatTimeAgo(post.created_at)}</p>
          </div>
        </div>

        <button
          onClick={handleShare}
          className="p-1.5 text-neutral-400 hover:text-white transition"
          aria-label="Options"
        >
          {copiedLink ? (
            <span className="text-[10px] font-mono text-emerald-400 flex items-center">
              <Check className="w-3.5 h-3.5 mr-1" /> Copied
            </span>
          ) : (
            <MoreHorizontal className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Main Post Media (Square, double-tap support) */}
      <div
        onClick={handleDoubleTap}
        className="w-full bg-neutral-950 aspect-square overflow-hidden flex items-center justify-center relative cursor-pointer"
      >
        <img
          src={post.image_url}
          alt={post.caption || 'Post image'}
          className={`w-full h-full object-cover select-none transition-all duration-300 ${getFilterClass(
            post.filter
          )}`}
          loading="lazy"
        />

        {/* Double-tap Heart Burst Animation */}
        {showHeartBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart className="w-24 h-24 text-white fill-white drop-shadow-2xl animate-ping" />
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="px-4 pt-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleLike}
            className="transition active:scale-75"
            aria-label="Like post"
          >
            <Heart
              className={`w-6 h-6 transition-colors ${
                liked
                  ? 'fill-red-600 text-red-600'
                  : 'text-neutral-200 hover:text-white'
              }`}
            />
          </button>

          <button
            onClick={() => onOpenComments(post)}
            className="text-neutral-200 hover:text-white transition active:scale-75"
            aria-label="Open comments"
          >
            <MessageSquare className="w-6 h-6" />
          </button>

          <button
            onClick={handleShare}
            className="text-neutral-200 hover:text-white transition active:scale-75"
            aria-label="Share"
          >
            <Send className="w-5 h-5 -rotate-12" />
          </button>
        </div>

        <button
          onClick={handleToggleSave}
          className="text-neutral-200 hover:text-white transition active:scale-75"
          aria-label="Save post"
        >
          <Bookmark
            className={`w-6 h-6 transition-colors ${
              saved ? 'fill-white text-white' : 'text-neutral-300'
            }`}
          />
        </button>
      </div>

      {/* Likes Count */}
      <div className="px-4 mt-2">
        <p className="text-sm font-semibold text-neutral-200">
          {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
        </p>
      </div>

      {/* Caption with highlight tags */}
      {post.caption && (
        <div className="px-4 mt-1">
          <p className="text-sm text-neutral-200 leading-snug">
            <span
              onClick={() => post.profiles && onSelectUser?.(post.profiles)}
              className="font-semibold text-white mr-2 cursor-pointer hover:underline"
            >
              {post.profiles?.username || 'user'}
            </span>
            {post.caption.split(' ').map((word, i) => {
              if (word.startsWith('#')) {
                return (
                  <span key={i} className="text-neutral-400 font-medium mr-1 hover:text-white cursor-pointer">
                    {word}{' '}
                  </span>
                );
              }
              return word + ' ';
            })}
          </p>
        </div>
      )}

      {/* View Comments trigger */}
      <button
        onClick={() => onOpenComments(post)}
        className="px-4 mt-1.5 text-xs text-neutral-500 hover:text-neutral-400 block"
      >
        View all comments
      </button>
    </article>
  );
};
