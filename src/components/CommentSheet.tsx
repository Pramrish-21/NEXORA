import React, { useEffect, useState, useRef } from 'react';
import { X, Send, Smile } from 'lucide-react';
import { Post, Comment } from '../types/database';
import { dataService } from '../lib/dataService';
import { useAuth } from '../context/AuthContext';

interface CommentSheetProps {
  post: Post | null;
  onClose: () => void;
  onCommentAdded?: () => void;
}

const QUICK_EMOJIS = ['🖤', '🔥', '✨', '⚡', '📸', '💯'];

export const CommentSheet: React.FC<CommentSheetProps> = ({
  post,
  onClose,
  onCommentAdded,
}) => {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!post) return;
    setLoading(true);
    dataService.getComments(post.id).then((data) => {
      setComments(data);
      setLoading(false);
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
  }, [post]);

  if (!post) return null;

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || submitting) return;

    setSubmitting(true);
    const content = newComment.trim();
    setNewComment('');

    try {
      const added = await dataService.addComment(post.id, user.id, content);
      setComments((prev) => [...prev, added]);
      onCommentAdded?.();
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setNewComment((prev) => prev + emoji);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-950 border-t border-neutral-800 rounded-t-3xl max-h-[82vh] h-full flex flex-col overflow-hidden max-w-lg mx-auto w-full shadow-2xl"
      >
        {/* Drag handle */}
        <div className="w-12 h-1 bg-neutral-800 rounded-full mx-auto mt-2.5 mb-1" />

        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sm text-white">Comments</span>
            <span className="text-xs text-neutral-500 font-mono">({comments.length})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-neutral-400 font-medium">No comments yet.</p>
              <p className="text-xs text-neutral-600 mt-1">Start the conversation below.</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start space-x-3 text-sm group">
                <div className="w-8 h-8 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-800">
                  {c.profiles?.avatar_url ? (
                    <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-neutral-700" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline space-x-2">
                    <span className="font-semibold text-white text-xs">
                      @{c.profiles?.username || 'user'}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      {new Date(c.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-neutral-300 text-sm mt-0.5 break-words leading-relaxed">
                    {c.content}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Quick Emoji Bar */}
        <div className="px-4 py-2 border-t border-neutral-900/60 flex items-center space-x-3 bg-neutral-950/80">
          <Smile className="w-4 h-4 text-neutral-500 flex-shrink-0" />
          <div className="flex space-x-3 overflow-x-auto no-scrollbar">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleAddEmoji(emoji)}
                className="text-base hover:scale-125 transition active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Form input */}
        <form
          onSubmit={handleSendComment}
          className="p-3 border-t border-neutral-900 flex items-center space-x-2 bg-neutral-950 safe-area-bottom"
        >
          <div className="w-7 h-7 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-neutral-700" />
            )}
          </div>
          <input
            type="text"
            placeholder={`Add a comment as @${profile?.username || 'user'}...`}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 bg-neutral-900 border border-neutral-800 text-white text-sm rounded-full px-4 py-2.5 outline-none focus:border-neutral-600 transition"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="p-2 text-white bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 rounded-full transition active:scale-90"
            aria-label="Post comment"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
