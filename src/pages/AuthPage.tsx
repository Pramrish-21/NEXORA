import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getAuthRedirectUrl } from '../lib/authHelpers';
import {
  Sparkles,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Mail,
  KeyRound,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

interface AuthPageProps {
  onSuccess?: () => void;
}

type AuthMode = 'login' | 'signup' | 'forgot_password' | 'email_sent';

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const { authNotice, setAuthNotice } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setAuthNotice(null);
    setLoading(true);

    const redirectUrl = getAuthRedirectUrl();

    try {
      if (mode === 'signup') {
        const cleanUsername = username.toLowerCase().trim().replace(/[^a-zA-Z0-9_]/g, '');
        if (cleanUsername.length < 3) {
          throw new Error('Username must be at least 3 characters (letters, numbers, underscores).');
        }

        const avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
          cleanUsername
        )}`;

        const { data: signUpData, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              username: cleanUsername,
              full_name: fullName.trim(),
              avatar_url: avatarUrl,
            },
          },
        });

        if (error) {
          if (error.message.toLowerCase().includes('already registered')) {
            throw new Error(
              'An account with this email address already exists. Please log in or reset your password.'
            );
          }
          throw error;
        }

        // If email confirmation is enabled on Supabase project and no session is created
        if (!signUpData.session) {
          setMode('email_sent');
          setInfoMessage(
            `A verification email has been dispatched to ${email.trim()}. Please click the confirmation link in your email to activate your account.`
          );
          return;
        }

        // If session was returned immediately (email confirmed or auto-confirm)
        onSuccess?.();
      } else if (mode === 'login') {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            throw new Error(
              'Your email address has not been confirmed yet. Please check your inbox or click "Resend verification email" below.'
            );
          }
          if (error.message.toLowerCase().includes('invalid login credentials')) {
            throw new Error('Invalid email or password. Please verify your credentials and try again.');
          }
          throw error;
        }

        if (signInData.session) {
          onSuccess?.();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email address to receive password reset instructions.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    setAuthNotice(null);

    try {
      const redirectUrl = getAuthRedirectUrl();

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setInfoMessage(
        `A password recovery link has been sent to ${email.trim()}. Please check your email inbox and click the reset link.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send password recovery email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendSignupEmail = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your email address above to resend the verification email.');
      return;
    }

    setResendingEmail(true);
    setErrorMessage(null);
    try {
      const redirectUrl = getAuthRedirectUrl();

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) throw error;
      setInfoMessage(`A fresh verification email has been sent to ${email.trim()}!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to resend verification email.');
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center px-6 py-12 max-w-sm mx-auto select-none">
      {/* Brand Header */}
      <div className="text-center mb-7">
        <div className="inline-flex items-center space-x-2 mb-2">
          <h1 className="text-3xl font-black tracking-widest bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
            NEXORA
          </h1>
          <Sparkles className="w-4 h-4 text-neutral-400" />
        </div>
        <p className="text-xs text-neutral-400 uppercase tracking-widest font-mono">
          Dark. Minimalist. Real Authentication.
        </p>
      </div>

      {/* Global Auth / URL notice (e.g. Expired Link) */}
      {authNotice && (
        <div className="mb-4 p-3.5 bg-amber-950/80 border border-amber-800/80 rounded-2xl text-xs text-amber-200 leading-relaxed flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-300">Notice</p>
            <p className="mt-0.5 text-amber-200">{authNotice}</p>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="mb-4 p-3.5 bg-red-950/80 border border-red-800/80 rounded-2xl text-xs text-red-200 leading-relaxed flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-300">Authentication Error</p>
            <p className="mt-0.5 text-red-200">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Info Notice */}
      {infoMessage && (
        <div className="mb-4 p-3.5 bg-emerald-950/80 border border-emerald-800/80 rounded-2xl text-xs text-emerald-200 leading-relaxed flex items-start space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <p className="flex-1">{infoMessage}</p>
        </div>
      )}

      {/* VIEW: EMAIL VERIFICATION SENT */}
      {mode === 'email_sent' && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-700 mx-auto flex items-center justify-center text-white">
            <Mail className="w-6 h-6 text-cyan-400" />
          </div>

          <div>
            <h2 className="text-base font-bold text-white">Verification Email Sent</h2>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              We sent a real verification link to:
              <br />
              <strong className="text-white font-mono">{email}</strong>
            </p>
          </div>

          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Please check your inbox (and spam folder) and click the link to verify your account, then
            return here to log in.
          </p>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleResendSignupEmail}
              disabled={resendingEmail}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs text-neutral-200 flex items-center justify-center space-x-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resendingEmail ? 'animate-spin' : ''}`} />
              <span>{resendingEmail ? 'Sending...' : 'Resend Verification Email'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className="w-full py-2.5 bg-white text-black font-semibold rounded-xl text-xs hover:bg-neutral-200 transition"
            >
              Back to Log In
            </button>
          </div>
        </div>
      )}

      {/* VIEW: FORGOT PASSWORD */}
      {mode === 'forgot_password' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className="p-1 -ml-1 text-neutral-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-white flex items-center space-x-1.5">
              <KeyRound className="w-4 h-4 text-neutral-400" />
              <span>Reset Your Password</span>
            </h2>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            Enter your registered email address and Supabase Auth will dispatch a secure password
            recovery link directly to your inbox.
          </p>

          <form onSubmit={handleForgotPassword} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                Account Email Address
              </label>
              <input
                type="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-black font-semibold rounded-xl text-sm hover:bg-neutral-200 active:scale-98 transition disabled:opacity-50 shadow-lg"
            >
              {loading ? 'Sending Recovery Link...' : 'Send Password Recovery Email'}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className="text-xs text-neutral-400 hover:text-white transition"
            >
              Remembered your password? Log In
            </button>
          </div>
        </div>
      )}

      {/* VIEW: LOGIN & SIGNUP */}
      {(mode === 'login' || mode === 'signup') && (
        <>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                    Unique Username
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. jordan, alex_noir"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                    className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                    Display Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jordan Reed"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">
                  Password (min. 6 chars)
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setErrorMessage(null);
                      setInfoMessage(null);
                    }}
                    className="text-[10px] text-neutral-400 hover:text-white transition"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-black font-semibold rounded-xl text-sm hover:bg-neutral-200 active:scale-98 transition disabled:opacity-50 shadow-lg mt-2"
            >
              {loading
                ? 'Connecting to Supabase...'
                : mode === 'signup'
                ? 'Register with Email'
                : 'Log In'}
            </button>
          </form>

          {/* Toggle Login / Signup */}
          <div className="mt-6 flex flex-col space-y-3 text-center text-xs text-neutral-400">
            <button
              onClick={() => {
                setMode(mode === 'signup' ? 'login' : 'signup');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className="hover:text-white transition font-medium"
            >
              {mode === 'signup'
                ? 'Already have an account? Log In'
                : "Don't have an account? Create one"}
            </button>

            {mode === 'login' && (
              <button
                type="button"
                onClick={handleResendSignupEmail}
                className="text-neutral-500 hover:text-neutral-400 text-[11px] transition"
              >
                Need verification email resent?
              </button>
            )}
          </div>
        </>
      )}

      {/* Security badge footer */}
      <div className="mt-10 pt-4 border-t border-neutral-900 flex items-center justify-center space-x-2 text-[11px] text-neutral-600 font-mono">
        <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
        <span>Supabase Auth &amp; Password Hashing Enabled</span>
      </div>
    </div>
  );
};
