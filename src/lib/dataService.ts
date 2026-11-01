import { Post, Profile, Comment, Message, Story } from '../types/database';
import { supabase, isConfigured } from './supabase';
import { INITIAL_POSTS, INITIAL_COMMENTS, INITIAL_STORIES } from './mockData';

export const dataService = {
  // PROFILES
  async getProfile(userId: string): Promise<Profile | null> {
    if (isConfigured) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!error && data) return data as Profile;
        if (error) console.error('Supabase getProfile error:', error);
      } catch (e) {
        console.warn('Supabase getProfile error:', e);
      }
    }
    return null;
  },

  async searchProfiles(query: string, excludeUserId?: string): Promise<Profile[]> {
    if (isConfigured) {
      try {
        let queryBuilder = supabase.from('profiles').select('*');
        const clean = query.trim();

        if (clean) {
          queryBuilder = queryBuilder.or(`username.ilike.%${clean}%,full_name.ilike.%${clean}%`);
        } else {
          queryBuilder = queryBuilder.order('created_at', { ascending: false });
        }

        if (excludeUserId) {
          queryBuilder = queryBuilder.neq('id', excludeUserId);
        }

        const { data, error } = await queryBuilder.limit(30);
        if (!error && data) return data as Profile[];
        if (error) console.error('Supabase searchProfiles error:', error);
      } catch (e) {
        console.warn('Supabase searchProfiles exception:', e);
      }
    }
    return [];
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    if (isConfigured) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Supabase updateProfile error:', error);
        throw error;
      }
      return data as Profile;
    }
    throw new Error('Supabase is not configured.');
  },

  // FEED POSTS
  async getPosts(currentUserId?: string): Promise<Post[]> {
    if (isConfigured) {
      try {
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*, profiles:user_id(*)')
          .order('created_at', { ascending: false });

        if (!postsError && postsData) {
          const postIds = postsData.map((p) => p.id);
          let likesData: { post_id: string; user_id: string }[] = [];

          if (postIds.length > 0) {
            const { data: likes } = await supabase
              .from('likes')
              .select('post_id, user_id')
              .in('post_id', postIds);
            likesData = likes || [];
          }

          const savedIds: string[] = JSON.parse(
            (typeof window !== 'undefined' && localStorage.getItem('nexora_saved_posts_v1')) || '[]'
          );

          return postsData.map((post) => {
            const postLikes = likesData.filter((l) => l.post_id === post.id);
            return {
              ...post,
              likes_count: postLikes.length,
              user_has_liked: currentUserId ? postLikes.some((l) => l.user_id === currentUserId) : false,
              saved: savedIds.includes(post.id),
            };
          });
        }
      } catch (e) {
        console.warn('Supabase getPosts error:', e);
      }
    }

    // Curated initial seed posts if database has no posts yet
    return INITIAL_POSTS.map((post) => ({
      ...post,
      user_has_liked: false,
      saved: false,
    }));
  },

  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; count: number }> {
    if (isConfigured) {
      const { data: existing } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId);
        return { liked: false, count: -1 };
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: userId });
        return { liked: true, count: 1 };
      }
    }
    return { liked: true, count: 1 };
  },

  async toggleSavePost(postId: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const savedIds: string[] = JSON.parse(localStorage.getItem('nexora_saved_posts_v1') || '[]');
    let isSaved = false;
    if (savedIds.includes(postId)) {
      const filtered = savedIds.filter((id) => id !== postId);
      localStorage.setItem('nexora_saved_posts_v1', JSON.stringify(filtered));
      isSaved = false;
    } else {
      savedIds.push(postId);
      localStorage.setItem('nexora_saved_posts_v1', JSON.stringify(savedIds));
      isSaved = true;
    }
    return isSaved;
  },

  async createPost(userId: string, imageUrl: string, caption: string, filter?: string): Promise<Post> {
    if (isConfigured) {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          image_url: imageUrl,
          caption: caption.trim(),
        })
        .select('*, profiles:user_id(*)')
        .single();

      if (error) {
        console.error('Supabase createPost error:', error);
        throw error;
      }
      return {
        ...data,
        filter: filter || 'normal',
        likes_count: 0,
        user_has_liked: false,
        saved: false,
      };
    }
    throw new Error('Supabase is not configured.');
  },

  // COMMENTS
  async getComments(postId: string): Promise<Comment[]> {
    if (isConfigured) {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*, profiles:user_id(username, avatar_url, full_name)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (!error && data) return data as Comment[];
        if (error) console.error('Supabase getComments error:', error);
      } catch (e) {
        console.warn('Supabase getComments error:', e);
      }
    }
    return INITIAL_COMMENTS.filter((c) => c.post_id === postId);
  },

  async addComment(postId: string, userId: string, content: string): Promise<Comment> {
    if (isConfigured) {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: userId,
          content: content.trim(),
        })
        .select('*, profiles:user_id(username, avatar_url, full_name)')
        .single();

      if (error) {
        console.error('Supabase addComment error:', error);
        throw error;
      }
      return data as Comment;
    }
    throw new Error('Supabase is not configured.');
  },

  // REAL DIRECT MESSAGING (PERSISTED IN SUPABASE WITH RLS)
  async getConversations(userId: string): Promise<Profile[]> {
    if (isConfigured) {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

        if (error) {
          console.error('Supabase getConversations error:', error);
          return [];
        }

        if (data && data.length > 0) {
          const partnerIds = Array.from(
            new Set(
              data
                .map((m) => (m.sender_id === userId ? m.receiver_id : m.sender_id))
                .filter((id) => id && id !== userId)
            )
          );

          if (partnerIds.length > 0) {
            const { data: profiles, error: pError } = await supabase
              .from('profiles')
              .select('*')
              .in('id', partnerIds);

            if (!pError && profiles) return profiles as Profile[];
          }
        }
        return [];
      } catch (e) {
        console.error('Supabase getConversations exception:', e);
        return [];
      }
    }
    return [];
  },

  async getMessages(userId: string, partnerId: string): Promise<Message[]> {
    if (isConfigured) {
      try {
        // Query messages where current user is either sender or receiver (matches RLS)
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Supabase getMessages error:', error);
          return [];
        }

        // Filter messages specifically for the conversation between userId and partnerId
        const filtered = (data || []).filter(
          (m) =>
            (m.sender_id === userId && m.receiver_id === partnerId) ||
            (m.sender_id === partnerId && m.receiver_id === userId)
        );

        return filtered as Message[];
      } catch (e) {
        console.error('Supabase getMessages exception:', e);
        return [];
      }
    }
    return [];
  },

  async sendMessage(senderId: string, receiverId: string, content: string): Promise<Message> {
    if (isConfigured) {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase sendMessage error:', error);
        throw error;
      }
      return data as Message;
    }
    throw new Error('Supabase is not configured.');
  },

  // STORIES
  getStories(): Story[] {
    return INITIAL_STORIES;
  },
};
