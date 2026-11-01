import React, { useEffect, useState } from 'react';
import {
  Settings,
  LogOut,
  KeyRound,
  Grid,
  Bookmark,
  Heart,
  Edit3,
  Database,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Post } from '../types/database';
import { dataService } from '../lib/dataService';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface ProfilePageProps {
  onOpenConfig: () => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
];

export const ProfilePage: React.FC<ProfilePageProps> = ({ onOpenConfig }) => {
  const { user, profile, signOut, updateProfileDetails, updatePassword } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'liked'>('posts');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Form states
  const [newPassword, setNewPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState(profile?.full_name || '');
  const [editBio, setEditBio] = useState(profile?.bio || '');
  const [editAvatar, setEditAvatar] = useState(profile?.avatar_url || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchProfileData = async () => {
    if (!user) return;
    setLoading(true);
    const allPosts = await dataService.getPosts(user.id);
    const userPosts = allPosts.filter((p) => p.user_id === user.id);
    const userSaved = allPosts.filter((p) => p.saved);
    const userLiked = allPosts.filter((p) => p.user_has_liked);

    setPosts(userPosts);
    setSavedPosts(userSaved);
    setLikedPosts(userLiked);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  // Sync edit modal fields when profile updates
  useEffect(() => {
    if (profile) {
      setEditFullName(profile.full_name || '');
      setEditBio(profile.bio || '');
      setEditAvatar(profile.avatar_url || '');
    }
  }, [profile]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setStatusMessage('Password must be at least 6 characters.');
      return;
    }
    try {
      await updatePassword(newPassword);
      setStatusMessage('Password updated successfully.');
      setNewPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setStatusMessage(null);
      }, 1400);
    } catch (err: any) {
      setStatusMessage(err.message || 'Error updating password.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfileDetails({
        full_name: editFullName,
        bio: editBio,
        avatar_url: editAvatar,
      });
      setShowEditModal(false);
      fetchProfileData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const currentGridPosts =
    activeTab === 'posts' ? posts : activeTab === 'saved' ? savedPosts : likedPosts;

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-24">
      {/* Profile Header Details */}
      <div className="flex items-start space-x-5">
        <div className="relative group">
          <div className="w-20 h-20 rounded-full bg-neutral-900 overflow-hidden border-2 border-neutral-800 p-0.5 flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full bg-neutral-800 rounded-full" />
            )}
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="absolute bottom-0 right-0 p-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full border border-neutral-700 shadow-md"
            title="Edit profile photo"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-white truncate">@{profile?.username || 'user'}</h2>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="p-1.5 text-neutral-400 hover:text-white transition"
                title="Change Password"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenConfig}
                className="p-1.5 text-neutral-400 hover:text-white transition"
                title="Database Settings"
              >
                <Database className="w-4 h-4" />
              </button>
              <button
                onClick={signOut}
                className="p-1.5 text-neutral-400 hover:text-red-400 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-sm font-medium text-neutral-200 mt-0.5 truncate">
            {profile?.full_name || 'Nexora Member'}
          </p>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed whitespace-pre-line">
            {profile?.bio || 'Minimalist dark social feed.'}
          </p>
        </div>
      </div>

      {/* Edit Profile Action button */}
      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => setShowEditModal(true)}
          className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-semibold rounded-xl transition"
        >
          Edit Profile
        </button>
        <button
          onClick={onOpenConfig}
          className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs rounded-xl flex items-center space-x-1 transition"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Config</span>
        </button>
      </div>

      {/* Stats Counter */}
      <div className="flex justify-around border-y border-neutral-900 py-3 mt-5 text-center">
        <div>
          <span className="block font-bold text-sm text-white">{posts.length}</span>
          <span className="text-[11px] text-neutral-500 font-mono">Posts</span>
        </div>
        <div>
          <span className="block font-bold text-sm text-white">
            {profile?.followers_count || 1240}
          </span>
          <span className="text-[11px] text-neutral-500 font-mono">Followers</span>
        </div>
        <div>
          <span className="block font-bold text-sm text-white">
            {profile?.following_count || 320}
          </span>
          <span className="text-[11px] text-neutral-500 font-mono">Following</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-900">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-3 flex items-center justify-center space-x-1.5 border-b-2 transition ${
            activeTab === 'posts' ? 'border-white text-white' : 'border-transparent text-neutral-500'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span className="text-xs font-mono">POSTS</span>
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`flex-1 py-3 flex items-center justify-center space-x-1.5 border-b-2 transition ${
            activeTab === 'saved' ? 'border-white text-white' : 'border-transparent text-neutral-500'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span className="text-xs font-mono">SAVED ({savedPosts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('liked')}
          className={`flex-1 py-3 flex items-center justify-center space-x-1.5 border-b-2 transition ${
            activeTab === 'liked' ? 'border-white text-white' : 'border-transparent text-neutral-500'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span className="text-xs font-mono">LIKED</span>
        </button>
      </div>

      {/* Posts Grid */}
      {loading ? (
        <LoadingSpinner text="LOADING ARCHIVE..." />
      ) : currentGridPosts.length === 0 ? (
        <div className="text-center py-16 px-4 space-y-1">
          <p className="text-sm text-neutral-400">
            {activeTab === 'posts'
              ? 'No posts yet'
              : activeTab === 'saved'
              ? 'No saved posts'
              : 'No liked posts yet'}
          </p>
          <p className="text-xs text-neutral-600">
            {activeTab === 'posts'
              ? 'Share your first photo in the Create tab.'
              : 'Tap the bookmark or heart icon on feed posts.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 mt-1">
          {currentGridPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="aspect-square bg-neutral-950 overflow-hidden cursor-pointer relative group border border-neutral-900"
            >
              <img src={post.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-3 text-white text-xs font-bold">
                <span className="flex items-center space-x-1">
                  <Heart className="w-3.5 h-3.5 fill-white" />
                  <span>{post.likes_count || 0}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: View Post from Grid */}
      {selectedPost && (
        <div
          onClick={() => setSelectedPost(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl"
          >
            <div className="relative aspect-square bg-neutral-900">
              <img src={selectedPost.image_url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/60 rounded-full text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-sm text-neutral-200">{selectedPost.caption || 'No caption'}</p>
              <div className="flex items-center justify-between pt-2 border-t border-neutral-900 text-xs text-neutral-500">
                <span>{selectedPost.likes_count || 0} likes</span>
                <span>{new Date(selectedPost.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Profile */}
      {showEditModal && (
        <div
          onClick={() => setShowEditModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 max-w-sm w-full space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
              <h3 className="font-bold text-sm text-white">Edit Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                  FULL NAME
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                  BIO DESCRIPTION
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                  CHOOSE AVATAR PRESET
                </label>
                <div className="flex space-x-2">
                  {AVATAR_PRESETS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setEditAvatar(url)}
                      className={`w-9 h-9 rounded-full overflow-hidden border-2 transition ${
                        editAvatar === url ? 'border-white scale-110' : 'border-transparent opacity-60'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex-1 py-2.5 bg-white text-black font-semibold text-xs rounded-xl hover:bg-neutral-200"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Password */}
      {showPasswordModal && (
        <div
          onClick={() => setShowPasswordModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 max-w-sm w-full space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
              <h3 className="font-bold text-sm text-white">Update Account Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Set a new secure password for your Nexora profile.
            </p>

            {statusMessage && (
              <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-200">
                {statusMessage}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <input
                type="password"
                placeholder="New Password (min. 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-neutral-500"
              />
              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2.5 bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-white text-black font-semibold text-xs rounded-xl hover:bg-neutral-200"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
