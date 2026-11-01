import React, { useState } from 'react';
import { Mail, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const UnverifiedEmailBanner: React.FC = () => {
  const { user, isEmailUnverified, resendVerificationEmail } = useAuth();
  const [resending, setResending] = useState(false);
  const [sentNotice, setSentNotice] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  if (!isEmailUnverified || !user) return null;

  const handleResend = async () => {
    setResending(true);
    setErrorNotice(null);
    try {
      await resendVerificationEmail();
      setSentNotice(true);
      setTimeout(() => setSentNotice(false), 4000);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to resend confirmation email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="bg-amber-950/70 border-b border-amber-900/80 px-4 py-2.5 text-xs text-amber-200">
      <div className="max-w-lg mx-auto flex items-center justify-between space-x-2">
        <div className="flex items-center space-x-2 min-w-0">
          <Mail className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="truncate">
            Please confirm your email address <strong>({user.email})</strong>.
          </span>
        </div>

        <button
          onClick={handleResend}
          disabled={resending || sentNotice}
          className="px-2.5 py-1 bg-amber-900/80 hover:bg-amber-800 border border-amber-700/80 rounded-lg text-[11px] text-amber-100 font-medium whitespace-nowrap transition disabled:opacity-50 flex items-center space-x-1"
        >
          {sentNotice ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Email Sent!</span>
            </>
          ) : (
            <span>{resending ? 'Sending...' : 'Resend Email'}</span>
          )}
        </button>
      </div>

      {errorNotice && (
        <div className="max-w-lg mx-auto mt-1 text-[11px] text-red-300 flex items-center space-x-1">
          <AlertCircle className="w-3 h-3 text-red-400" />
          <span>{errorNotice}</span>
        </div>
      )}
    </div>
  );
};
