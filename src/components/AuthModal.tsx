import React, { useState, useEffect } from 'react';
import { AuthUser } from '../types';
import { api, setStoredToken } from '../api/client';
import { 
  PixelButton, 
  PixelCard, 
  PixelBadge, 
  PixelHeart, 
  PixelShield, 
  PixelInput,
  PixelSparkle
} from './PixelUI';
import { AlertCircle, Lock, Mail, User, ShieldAlert, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'student-login' | 'student-register' | 'counsellor-login' | 'counsellor-register';
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  onOpenRecovery: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'student-login',
  onClose,
  onSuccess,
  onOpenRecovery
}) => {
  const [tab, setTab] = useState<'student-login' | 'student-register' | 'counsellor-login' | 'counsellor-register'>(initialTab);
  
  // Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [specialization, setSpecialization] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);

  // Synchronize active tab and reset notices/fields whenever modal opens or initialTab updates
  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setError(null);
      setPendingNotice(null);
      setFullName('');
      setEmail('');
      setPassword('');
      setSpecialization('');
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const isStudent = tab.startsWith('student');
  const isLogin = tab.endsWith('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPendingNotice(null);
    setLoading(true);

    try {
      if (tab === 'student-login') {
        const res = await api.auth.studentLogin({ email, password });
        setStoredToken(res.token);
        onSuccess(res.user);
        onClose();
      } else if (tab === 'student-register') {
        setPendingNotice(null);
        const res = await api.auth.studentRegister({ full_name: fullName, email, password });
        setStoredToken(res.token);
        onSuccess(res.user);
        onClose();
      } else if (tab === 'counsellor-login') {
        const res = await api.auth.counsellorLogin({ email, password });
        setStoredToken(res.token);
        onSuccess(res.user);
        onClose();
      } else if (tab === 'counsellor-register') {
        const res = await api.auth.counsellorRegister({
          full_name: fullName,
          email,
          password,
          specialization: specialization || undefined
        });
        // Registration places is_active = 0 for counsellors only
        setPendingNotice(res.message);
      }
    } catch (err: any) {
      // Administrative approval notice strictly applies to inactive counsellors
      if (!isStudent && err.status === 403 && err.data?.is_active === 0) {
        setPendingNotice(err.data.error || 'Your counsellor account is pending administrative approval.');
      } else {
        setError(err.message || 'Authentication failed. Please verify credentials.');
      }
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

        {/* Portal Role Selector */}
        <div className="flex border-b-2 border-[#2B2438] mb-4">
          <button
            type="button"
            onClick={() => {
              setTab('student-login');
              setError(null);
              setPendingNotice(null);
            }}
            className={`flex-1 py-2 text-xs font-bold transition-all border-b-4 ${
              isStudent 
                ? 'border-b-[#297D56] bg-[#E0F4EA] text-[#0F3523]' 
                : 'border-b-transparent text-[#7E7491] hover:text-[#231E2C]'
            }`}
          >
            Student Access
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('counsellor-login');
              setError(null);
              setPendingNotice(null);
            }}
            className={`flex-1 py-2 text-xs font-bold transition-all border-b-4 ${
              !isStudent 
                ? 'border-b-[#7E65B7] bg-[#EFEAF8] text-[#2C1F48]' 
                : 'border-b-transparent text-[#7E7491] hover:text-[#231E2C]'
            }`}
          >
            Counsellor Access
          </button>
        </div>

        {/* Action Toggle (Login vs Register) */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#231E2C]">
            {isStudent
              ? isLogin ? 'Student Sign In' : 'Create Student Account'
              : isLogin ? 'Counsellor Sign In' : 'Register as Counsellor'}
          </h2>
          <button
            type="button"
            onClick={() => {
              setTab(isStudent
                ? (isLogin ? 'student-register' : 'student-login')
                : (isLogin ? 'counsellor-register' : 'counsellor-login')
              );
              setError(null);
              setPendingNotice(null);
            }}
            className="text-xs font-bold text-[#7E65B7] hover:underline"
          >
            {isLogin ? 'Need an account?' : 'Already registered?'}
          </button>
        </div>

        {/* Notice for Counsellor Approval Requirement */}
        {!isStudent && !isLogin && (
          <div className="p-3 bg-[#FEF3C7] border-2 border-[#2B2438] text-xs text-[#92400E] flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Counsellor credentials require administrative validation. Newly registered accounts are stored as inactive (<code className="font-mono text-[10px] bg-white px-1">is_active = 0</code>) until approved.
            </p>
          </div>
        )}

        {/* Administrative approval notice strictly for counsellors */}
        {!isStudent && pendingNotice && (
          <div className="p-4 bg-[#FEF3C7] border-2 border-[#2B2438] text-xs text-[#92400E] space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#B45309]" />
              <span>Administrative Approval Required</span>
            </div>
            <p className="leading-relaxed">{pendingNotice}</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-[#FDE8E8] border-2 border-[#2B2438] text-xs text-[#9B1C1C] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-[#231E2C] mb-1">
                Full Name
              </label>
              <PixelInput
                type="text"
                required
                maxLength={100}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Rivera"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#231E2C] mb-1">
              Email Address
            </label>
            <PixelInput
              type="email"
              required
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isStudent ? 'alex.rivera@student.campuscare.edu' : 's.bennett@campuscare.edu'}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[#231E2C]">
                Password
              </label>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRecovery();
                  }}
                  className="text-[11px] font-semibold text-[#7E65B7] hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <PixelInput
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {!isStudent && !isLogin && (
            <div>
              <label className="block text-xs font-bold text-[#231E2C] mb-1">
                Clinical Focus / Specialization (Optional)
              </label>
              <PixelInput
                type="text"
                maxLength={100}
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Cognitive Behavioural Therapy & Anxiety"
              />
            </div>
          )}

          <div className="pt-2">
            <PixelButton
              type="submit"
              variant={isStudent ? 'primary' : 'secondary'}
              size="lg"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Authenticating...' : (
                isLogin ? 'Sign In' : (isStudent ? 'Register Student Account' : 'Submit Counsellor Registration')
              )}
            </PixelButton>
          </div>
        </form>

        {/* Quick Demo Credentials Assistant */}
        <div className="pt-4 border-t-2 border-[#E8E0D5] text-xs space-y-2">
          <span className="font-mono text-[10px] text-[#7E7491] uppercase block font-bold">
            PRE-SEEDED DEMO CREDENTIALS (PASSWORD: Password123!)
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setTab('student-login');
                setError(null);
                setPendingNotice(null);
                setEmail('alex.rivera@student.campuscare.edu');
                setPassword('Password123!');
              }}
              className="text-[11px] font-semibold bg-[#FAF8F5] border border-[#2B2438] px-2 py-0.5 hover:bg-[#E0F4EA] transition-colors"
            >
              Demo Student
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('counsellor-login');
                setError(null);
                setPendingNotice(null);
                setEmail('s.bennett@campuscare.edu');
                setPassword('Password123!');
              }}
              className="text-[11px] font-semibold bg-[#FAF8F5] border border-[#2B2438] px-2 py-0.5 hover:bg-[#EFEAF8] transition-colors"
            >
              Active Counsellor
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('counsellor-login');
                setError(null);
                setPendingNotice(null);
                setEmail('e.rostova@campuscare.edu');
                setPassword('Password123!');
              }}
              className="text-[11px] font-semibold bg-[#FAF8F5] border border-[#2B2438] px-2 py-0.5 hover:bg-[#FEF3C7] transition-colors"
            >
              Inactive Counsellor
            </button>
          </div>
        </div>
      </PixelCard>
    </div>
  );
};
