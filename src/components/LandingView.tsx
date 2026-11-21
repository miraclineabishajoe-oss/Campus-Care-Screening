import React from 'react';
import { AuthUser } from '../types';
import { 
  PixelButton, 
  PixelCard, 
  PixelBadge, 
  PixelHeart, 
  PixelSparkle, 
  PixelShield, 
  PixelCheck, 
  PixelUser
} from './PixelUI';
import { ShieldCheck, HeartHandshake, Lock, ArrowRight, UserCheck, CalendarCheck2 } from 'lucide-react';

interface LandingViewProps {
  user: AuthUser | null;
  onNavigate: (view: 'landing' | 'screening' | 'student-dash' | 'counsellor-dash') => void;
  onOpenAuth: (tab: 'student-login' | 'counsellor-login') => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ user, onNavigate, onOpenAuth }) => {
  return (
    <div className="bg-[#FAF8F5] text-[#231E2C]">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b-2 border-[#2B2438] bg-[#FAF8F5] pixel-pattern-grid py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2">
            <PixelBadge variant="lavender" size="sm" icon={<PixelHeart size={10} className="text-[#7E65B7]" />}>
              CAMPUS STUDENT WELLNESS & CARE COORDINATION
            </PixelBadge>
          </div>

          {/* Heading */}
          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#231E2C] leading-tight">
              A calm, confidential space for university student mental health
            </h1>
            <p className="text-sm sm:text-base text-[#534B62] leading-relaxed max-w-2xl mx-auto">
              CampusCare connects students with private wellness self-evaluations, transparent appointment booking, and verified campus mental health practitioners. Please sign into your account to access your personal dashboard.
            </p>
          </div>

          {/* Exactly Two Primary Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <PixelButton
              variant="primary"
              size="lg"
              className="w-full sm:w-64"
              onClick={() => onOpenAuth('student-login')}
              icon={<PixelHeart size={14} />}
              iconPosition="left"
            >
              Student Sign In
            </PixelButton>

            <PixelButton
              variant="secondary"
              size="lg"
              className="w-full sm:w-64"
              onClick={() => onOpenAuth('counsellor-login')}
              icon={<PixelShield size={14} />}
              iconPosition="left"
            >
              Counsellor Sign In
            </PixelButton>
          </div>

          {/* Peaceful Wellness Illustration / Core Assurances */}
          <div className="pt-8 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <PixelCard
                variant="white"
                shadow="sm"
                border="dark"
                className="p-5 space-y-3"
              >
                <div className="w-10 h-10 bg-[#E0F4EA] border-2 border-[#2B2438] flex items-center justify-center text-[#297D56] shadow-[2px_2px_0px_#2B2438]">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#231E2C]">Strict Confidentiality</h3>
                  <p className="text-xs text-[#534B62] mt-1 leading-relaxed">
                    Personal screening scores and counselling notes remain private and protected under student wellness privacy protocols.
                  </p>
                </div>
              </PixelCard>

              <PixelCard
                variant="white"
                shadow="sm"
                border="dark"
                className="p-5 space-y-3"
              >
                <div className="w-10 h-10 bg-[#EFEAF8] border-2 border-[#2B2438] flex items-center justify-center text-[#7E65B7] shadow-[2px_2px_0px_#2B2438]">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#231E2C]">Verified Practitioners</h3>
                  <p className="text-xs text-[#534B62] mt-1 leading-relaxed">
                    Connect directly with certified university counsellors approved by health administration for dedicated 1-on-1 care.
                  </p>
                </div>
              </PixelCard>

              <PixelCard
                variant="white"
                shadow="sm"
                border="dark"
                className="p-5 space-y-3"
              >
                <div className="w-10 h-10 bg-[#FAF4E5] border-2 border-[#2B2438] flex items-center justify-center text-[#92400E] shadow-[2px_2px_0px_#2B2438]">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#231E2C]">Coordinated Appointments</h3>
                  <p className="text-xs text-[#534B62] mt-1 leading-relaxed">
                    Request online or in-person sessions, track booking approvals, and review past consultations in your student dashboard.
                  </p>
                </div>
              </PixelCard>
            </div>
          </div>

        </div>
      </section>

      {/* Reassurance Footer Banner */}
      <section className="bg-[#FAF8F5] py-12">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#534B62]">
            <ShieldCheck className="w-4 h-4 text-[#389E6E]" />
            <span>Authorized Campus Health System · Secure Session Coordination</span>
          </div>
          <p className="text-xs text-[#7E7491]">
            If you are experiencing an urgent medical or psychological emergency, please contact campus emergency services or dial 988 immediately.
          </p>
        </div>
      </section>
    </div>
  );
};
