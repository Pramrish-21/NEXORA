import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isConfigured } from '../lib/supabase';
import { Profile } from '../types/database';
import { dataService } from '../lib/dataService';
import { getAuthRedirectUrl } from '../lib/authHelpers';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isSupabaseConnected: boolean;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (value: boolean) => void;
  isEmailUnverified: boolean;
  authNotice: string | null;
  setAuthNotice: (notice: string | null) => void;
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
  authNotice: null,
  setAuthNotice: () => {},
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
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Check if current user email is awaiting confirmation
  const isEmailUnverified = Boolean(
    user && user.email && (!user.email_confirmed_at && !user.confirmed_at)
  );

  const syncUserProfile = async (currentUser: User) => {
    try {
      // 1. Attempt to fetch profile row from public.profiles
      let p = await dataService.getProfile(currentUser.id);

      // 2. If row does not exist yet (e.g., PostgreSQL trigger was delayed or absent), persist it
      if (!p) {
        try {
          p = await dataService.ensureProfile(currentUser);
        } catch (ensureErr) {
          console.warn('ensureProfile attempt error:', ensureErr);
          // Fallback to local representation if offline/network failure
          const metadata = currentUser.user_metadata || {};
          const generatedUsername =
            metadata.username ||
            (currentUser.email ? currentUser.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') : '') ||
            'user_' + currentUser.id.slice(0, 6);

          p = {
            id: currentUser.id,
            username: generatedUsername.toLowerCase(),
            full_name: metadata.full_name || '',
            avatar_url:
              metadata.avatar_url ||
              `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(generatedUsername)}`,
            bio: metadata.bio || 'NEXORA Member.',
            created_at: new Date().toISOString(),
          };
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

    // Inspect URL parameters for recovery state or error tokens
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';

      // Check for error parameters (e.g. otp_expired, link already used)
      if (hash.includes('error=') || search.includes('error=')) {
        const rawString = hash.includes('error=') ? hash.replace(/^#/, '') : search.replace(/^\?/, '');
        const params = new URLSearchParams(rawString);
        const errorDesc = params.get('error_description') || params.get('error') || 'The authentication link is invalid or has expired.';
        setAuthNotice(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));

        // Clean up URL
        window.history.replaceState(null, '', window.location.pathname);
      }

      // Check for recovery type in hash or query
      if (hash.includes('type=recovery') || search.includes('type=recovery')) {
        setIsPasswordRecovery(true);
      }

      // Handle PKCE code exchange if present in search params
      if (search.includes('code=')) {
        const urlParams = new URLSearchParams(search);
        const code = urlParams.get('code');
        if (code) {
          supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
            if (!error && data.session) {
              setSession(data.session);
              setUser(data.session.user);
              syncUserProfile(data.session.user);

              // If recovery flow or user redirected from reset link
              if (hash.includes('type=recovery') || search.includes('type=recovery')) {
                setIsPasswordRecovery(true);
              }
            } else if (error) {
              setAuthNotice(error.message);
            }
          });
        }
      }
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
    const redirectUrl = getAuthRedirectUrl();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: targetEmail,
      options: {
        emailRedirectTo: redirectUrl,
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
        authNotice,
        setAuthNotice,
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
