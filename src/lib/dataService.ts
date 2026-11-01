import { Post, Profile, Comment, Message, Story } from '../types/database';
import { supabase, isConfigured } from './supabase';
import { INITIAL_POSTS, INITIAL_COMMENTS, INITIAL_STORIES } from './mockData';

export function isValidUUID(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim());
}

export const dataService = {
  // PROFILES
  async getProfile(userId: string): Promise<Profile | null> {
    if (!isValidUUID(userId)) return null;
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

  async ensureProfile(currentUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, any>;
  }): Promise<Profile> {
    if (!isConfigured) {
      throw new Error('Supabase is not configured.');
    }
    if (!isValidUUID(currentUser.id)) {
      throw new Error('Invalid user ID: Must be a valid UUID');
    }

    // 1. Check if profile already exists in public.profiles
    const existing = await dataService.getProfile(currentUser.id);
    if (existing) return existing;

    // 2. Derive sanitized username
    const metadata = currentUser.user_metadata || {};
    let username =
      metadata.username ||
      (currentUser.email ? currentUser.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') : '') ||
      'user_' + currentUser.id.slice(0, 6);
    username = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (username.length < 3) {
      username = `user_${currentUser.id.replace(/-/g, '').slice(0, 6)}`;
    }

    const newProfile: Profile = {
      id: currentUser.id,
      username,
      full_name: metadata.full_name || '',
      avatar_url:
        metadata.avatar_url ||
        `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(username)}`,
      bio: metadata.bio || 'NEXORA Member.',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(newProfile, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Failed to create/ensure profile in database:', error);
      throw error;
    }

    return data as Profile;
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
    if (!isValidUUID(userId)) return [];
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
                .filter((id) => id && id !== userId && isValidUUID(id))
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
    if (!isValidUUID(userId) || !isValidUUID(partnerId)) return [];
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
    if (!isConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const cleanContent = content.trim();
    if (!cleanContent) {
      throw new Error('Message content cannot be empty.');
    }

    // 1. Sender ID validation
    if (!isValidUUID(senderId)) {
      throw new Error(`Invalid sender UUID (${senderId}). Sender must be an authenticated user.`);
    }

    // 2. Receiver ID validation
    if (!isValidUUID(receiverId)) {
      throw new Error(
        `Recipient "${receiverId}" is not a valid user UUID. Direct messages can only be sent to registered NEXORA members.`
      );
    }

    // 3. Verify sender profile exists in public.profiles to prevent messages_sender_id_fkey violation
    const senderProfile = await dataService.getProfile(senderId);
    if (!senderProfile) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user && authData.user.id === senderId) {
          await dataService.ensureProfile(authData.user);
        }
      } catch (e) {
        console.warn('Could not auto-provision sender profile:', e);
      }
    }

    // 4. Verify receiver profile exists in public.profiles to prevent messages_receiver_id_fkey violation
    const receiverProfile = await dataService.getProfile(receiverId);
    if (!receiverProfile) {
      throw new Error(
        `Recipient profile was not found in the database. The recipient must have a registered profile in public.profiles.`
      );
    }

    // 5. Insert message with sender_id and receiver_id
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: cleanContent,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase sendMessage error:', error);
      if (error.code === '23503') {
        if (error.message?.includes('messages_sender_id_fkey') || error.details?.includes('sender_id')) {
          throw new Error('Sender profile missing from database. Please run the SQL migration or re-login.');
        }
        if (error.message?.includes('messages_receiver_id_fkey') || error.details?.includes('receiver_id')) {
          throw new Error('Recipient profile missing from database. Direct messaging requires registered members.');
        }
        throw new Error(`Foreign key constraint error on messages: ${error.message}`);
      }
      throw error;
    }

    return data as Message;
  },

  // STORIES
  getStories(): Story[] {
    return INITIAL_STORIES;
  },
};
