import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isConfigured } from '../lib/supabase';
import { Profile } from '../types/database';
import { dataService } from '../lib/dataService';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isSupabaseConnected: boolean;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (value: boolean) => void;
  isEmailUnverified: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileDetails: (updates: Partial<Profile>) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  resendVerificationEmail: (email?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  isSupabaseConnected: false,
  isPasswordRecovery: false,
  setIsPasswordRecovery: () => {},
  isEmailUnverified: false,
  refreshProfile: async () => {},
  signOut: async () => {},
  updateProfileDetails: async () => {},
  updatePassword: async () => {},
  resendVerificationEmail: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // Check if current user email is awaiting confirmation
  const isEmailUnverified = Boolean(
    user && user.email && (!user.email_confirmed_at && !user.confirmed_at)
  );

  const syncUserProfile = async (currentUser: User) => {
    try {
      // 1. Attempt to fetch profile row from public.profiles
      let p = await dataService.getProfile(currentUser.id);

      // 2. If row does not exist yet (e.g., PostgreSQL trigger was delayed or absent), create it
      if (!p) {
        const metadata = currentUser.user_metadata || {};
        const generatedUsername =
          metadata.username ||
          (currentUser.email ? currentUser.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') : '') ||
          'user_' + currentUser.id.slice(0, 6);

        const newProfileData: Profile = {
          id: currentUser.id,
          username: generatedUsername.toLowerCase(),
          full_name: metadata.full_name || '',
          avatar_url:
            metadata.avatar_url ||
            `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(generatedUsername)}`,
          bio: metadata.bio || 'NEXORA Member.',
          created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('profiles')
          .upsert(newProfileData)
          .select()
          .maybeSingle();

        if (!error && data) {
          p = data as Profile;
        } else if (error) {
          console.warn('Upsert profile notice:', error.message);
          p = newProfileData;
        }
      }

      setProfile(p);
    } catch (err) {
      console.error('Error syncing user profile:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await syncUserProfile(user);
    }
  };

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    // Check if URL contains recovery token
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setIsPasswordRecovery(true);
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        syncUserProfile(session.user);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await syncUserProfile(session.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      setIsPasswordRecovery(false);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const updateProfileDetails = async (updates: Partial<Profile>) => {
    if (!user) return;
    const updated = await dataService.updateProfile(user.id, updates);
    setProfile(updated);
  };

  const updatePassword = async (password: string) => {
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  const resendVerificationEmail = async (overrideEmail?: string) => {
    const targetEmail = overrideEmail || user?.email;
    if (!targetEmail) {
      throw new Error('No email address available to resend verification.');
    }
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: targetEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isSupabaseConnected: isConfigured,
        isPasswordRecovery,
        setIsPasswordRecovery,
        isEmailUnverified,
        refreshProfile,
        signOut,
        updateProfileDetails,
        updatePassword,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
