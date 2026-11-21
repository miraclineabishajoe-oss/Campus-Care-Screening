import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { 
  PixelButton, 
  PixelCard, 
  PixelBadge, 
  PixelShield, 
  PixelCheck, 
  PixelInput,
  PixelSparkle,
  PixelArrowRight
} from './PixelUI';
import { Mail, KeyRound, Lock, AlertCircle, X } from 'lucide-react';

interface PasswordRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin: () => void;
}

export const PasswordRecoveryModal: React.FC<PasswordRecoveryModalProps> = ({
  isOpen,
  onClose,
  onSuccessLogin
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [accountType, setAccountType] = useState<'STUDENT' | 'COUNSELLOR'>('STUDENT');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (devCodeHint) {
      setCode(devCodeHint);
    }
  }, [devCodeHint]);

  if (!isOpen) return null;

  // Step 1: Request Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.recovery.request({ account_type: accountType, email });
      setMessage(res.message);
      if (res.dev_code_hint) {
        setDevCodeHint(res.dev_code_hint);
      }
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to request recovery code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.recovery.verify({ account_type: accountType, email, code });
      setResetToken(res.reset_token);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to verify recovery code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!resetToken) {
      setError('Missing reset token. Please restart recovery process.');
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      await api.recovery.reset({ reset_token: resetToken, new_password: newPassword });
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#231E2C]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <PixelCard
        variant="white"
        shadow="lg"
        border="dark"
        className="max-w-md w-full p-6 space-y-5 relative"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-6 h-6 border-2 border-[#2B2438] bg-[#FAF8F5] text-xs font-bold hover:bg-[#FDE8E8] flex items-center justify-center"
        >
          ✕
        </button>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <PixelBadge variant="lavender" size="sm" icon={<PixelShield size={10} className="text-[#543E82]" />}>
              SECURITY
            </PixelBadge>
            <span className="text-[11px] font-mono text-[#7E7491]">
              STEP {step} OF 3
            </span>
          </div>
          <h2 className="text-base font-bold text-[#231E2C]">
            Account Password Recovery
          </h2>
        </div>

        {/* Stepped Progress Bar */}
        <div className="flex gap-1.5 h-2">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`flex-1 border border-[#2B2438] transition-colors ${
                s <= (step === 4 ? 3 : step) ? 'bg-[#5ABF8F]' : 'bg-[#FAF8F5]'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="p-3 bg-[#FDE8E8] border-2 border-[#2B2438] text-xs text-[#9B1C1C] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Request Email */}
        {step === 1 && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <p className="text-xs text-[#534B62] leading-relaxed">
              Enter your registered email address to receive a secure 6-digit verification code.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#231E2C] mb-1">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType('STUDENT')}
                  className={`py-2 text-xs font-bold border-2 transition-all ${
                    accountType === 'STUDENT'
                      ? 'border-[#2B2438] bg-[#E0F4EA] text-[#0F3523] shadow-[2px_2px_0px_#2B2438]'
                      : 'border-[#D6CCE8] bg-[#FAF8F5] text-[#534B62]'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('COUNSELLOR')}
                  className={`py-2 text-xs font-bold border-2 transition-all ${
                    accountType === 'COUNSELLOR'
                      ? 'border-[#2B2438] bg-[#EFEAF8] text-[#2C1F48] shadow-[2px_2px_0px_#2B2438]'
                      : 'border-[#D6CCE8] bg-[#FAF8F5] text-[#534B62]'
                  }`}
                >
                  Counsellor
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#231E2C] mb-1">
                Email Address
              </label>
              <PixelInput
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@campuscare.edu"
              />
            </div>

            <div className="pt-2">
              <PixelButton
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={loading}
              >
                {loading ? 'Dispatching Code...' : 'Send Verification Code'}
              </PixelButton>
            </div>
          </form>
        )}

        {/* Step 2: Verify Code */}
        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <p className="text-xs text-[#534B62] leading-relaxed">
              {message || 'A 6-digit verification code was sent if the account exists.'}
            </p>

            {devCodeHint && (
              <div className="p-3 bg-[#FAF8F5] border-2 border-[#2B2438] text-xs space-y-1">
                <span className="font-mono text-[10px] uppercase font-bold text-[#7E7491] block">
                  LOCAL SIMULATION CODE:
                </span>
                <p className="font-pixel text-base font-bold text-[#297D56] tracking-widest">
                  {devCodeHint}
                </p>
                <span className="text-[10px] text-[#7E7491]">
                  (Simulated delivery for instant evaluation testing)
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#231E2C] mb-1">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center font-pixel text-xl tracking-widest py-2 bg-white text-[#231E2C] border-2 border-[#2B2438] shadow-[2px_2px_0px_#DDD4F0] focus:outline-none focus:border-[#7E65B7]"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <PixelButton
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setStep(1)}
              >
                Back
              </PixelButton>
              <PixelButton
                type="submit"
                variant="mintDark"
                size="md"
                disabled={loading || code.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </PixelButton>
            </div>
          </form>
        )}

        {/* Step 3: Enter New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-xs text-[#534B62] leading-relaxed">
              Identity verified. Please define a new secure password (minimum 8 characters).
            </p>

            <div>
              <label className="block text-xs font-bold text-[#231E2C] mb-1">
                New Password
              </label>
              <PixelInput
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#231E2C] mb-1">
                Confirm New Password
              </label>
              <PixelInput
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <PixelButton
                type="submit"
                variant="mintDark"
                size="lg"
                fullWidth
                disabled={loading}
              >
                {loading ? 'Updating Password...' : 'Save New Password'}
              </PixelButton>
            </div>
          </form>
        )}

        {/* Step 4: Success Confirmation */}
        {step === 4 && (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 bg-[#E0F4EA] border-2 border-[#2B2438] text-[#297D56] mx-auto flex items-center justify-center shadow-[2px_2px_0px_#2B2438]">
              <PixelCheck size={24} />
            </div>
            <h3 className="text-base font-bold text-[#231E2C]">
              Password Reset Complete
            </h3>
            <p className="text-xs text-[#534B62] max-w-xs mx-auto leading-relaxed">
              Your account password has been updated securely. You can now authenticate with your new credentials.
            </p>
            <div className="pt-2">
              <PixelButton
                variant="primary"
                size="md"
                onClick={() => {
                  onClose();
                  onSuccessLogin();
                }}
                icon={<PixelArrowRight size={14} />}
                iconPosition="right"
              >
                Proceed to Sign In
              </PixelButton>
            </div>
          </div>
        )}
      </PixelCard>
    </div>
  );
};
