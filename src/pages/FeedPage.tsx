import React, { useEffect, useState } from 'react';
import { PostCard } from '../components/PostCard';
import { CommentSheet } from '../components/CommentSheet';
import { StoryBar } from '../components/StoryBar';
import { StoryViewer } from '../components/StoryViewer';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { dataService } from '../lib/dataService';
import { Post, Profile, Story } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, PlusSquare } from 'lucide-react';

interface FeedPageProps {
  onSelectUserToChat?: (profile: Profile) => void;
  onNavigateCreate?: () => void;
}

export const FeedPage: React.FC<FeedPageProps> = ({
  onSelectUserToChat,
  onNavigateCreate,
}) => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);

  const fetchFeed = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const postsData = await dataService.getPosts(user?.id);
      setPosts(postsData);
      const storiesData = dataService.getStories();
      setStories(storiesData);
    } catch (err) {
      console.error('Error fetching feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFeed(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingSpinner text="FETCHING FEED..." />
      </div>
    );
  }

  return (
    <div className="pb-20 max-w-lg mx-auto">
      {/* Instagram-style Story Bar */}
      <StoryBar
        stories={stories}
        currentUser={profile}
        onSelectStory={(index) => setActiveStoryIndex(index)}
        onAddStory={() => onNavigateCreate?.()}
      />

      {/* Feed refresher subtle bar */}
      <div className="px-4 py-2 flex items-center justify-between text-[11px] text-neutral-500 border-b border-neutral-900/60">
        <span>LATEST CURATED MOMENTS</span>
        <button
          onClick={handleRefresh}
          className="flex items-center space-x-1 hover:text-white transition active:scale-95"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Feed Posts */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800">
            <PlusSquare className="w-8 h-8 text-neutral-500" />
          </div>
          <div>
            <p className="text-neutral-300 font-semibold text-base">No posts in your feed yet</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs">
              Be the first to share an aesthetic moment, architecture, or cyberpunk frame on NEXORA.
            </p>
          </div>
          <button
            onClick={onNavigateCreate}
            className="px-5 py-2.5 bg-white text-black text-xs font-semibold rounded-xl hover:bg-neutral-200 transition"
          >
            Create New Post
          </button>
        </div>
      ) : (
        <div className="divide-y divide-neutral-900">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onOpenComments={(p) => setSelectedPost(p)}
              onSelectUser={(u) => onSelectUserToChat?.(u)}
              onPostUpdated={() => fetchFeed(false)}
            />
          ))}
        </div>
      )}

      {/* Comment Slide-up Sheet */}
      <CommentSheet
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onCommentAdded={() => fetchFeed(false)}
      />

      {/* Story Full Screen Viewer */}
      {activeStoryIndex !== null && (
        <StoryViewer
          stories={stories}
          initialIndex={activeStoryIndex}
          onClose={() => setActiveStoryIndex(null)}
        />
      )}
    </div>
  );
};
