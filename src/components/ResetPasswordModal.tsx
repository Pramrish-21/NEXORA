import React, { useState } from 'react';
import { KeyRound, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ResetPasswordModal: React.FC = () => {
  const { isPasswordRecovery, setIsPasswordRecovery, updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isPasswordRecovery) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(newPassword);
      setSuccess(true);
      // Clean up hash from URL
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }
      setTimeout(() => {
        setIsPasswordRecovery(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-neutral-900 rounded-xl text-white">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Choose New Password</h3>
              <p className="text-[11px] text-neutral-400">Verified via Supabase Recovery Link</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsPasswordRecovery(false);
              if (typeof window !== 'undefined') {
                window.history.replaceState(null, '', window.location.pathname);
              }
            }}
            className="p-1.5 text-neutral-500 hover:text-white rounded-lg transition"
            title="Close"
          >
            <span className="text-base font-bold leading-none">&times;</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-200 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-200 text-center space-y-2">
            <Check className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="font-semibold text-sm">Password Updated Successfully!</p>
            <p className="text-emerald-300">You are now securely logged into your NEXORA account.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                New Password (min. 6 chars)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 font-mono pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-white text-black font-semibold rounded-xl text-xs hover:bg-neutral-200 transition disabled:opacity-40"
            >
              {submitting ? 'Updating Password...' : 'Save New Password & Enter'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
