import React, { useState } from 'react';
import { AuthUser } from '../types';
import { PixelHeart, PixelSparkle, PixelButton, PixelBadge, PixelShield } from './PixelUI';
import { LogOut, User, Menu, X, Calendar, Activity, Users, Clock, BarChart3, HeartHandshake } from 'lucide-react';

interface NavbarProps {
  user: AuthUser | null;
  activeView: 'landing' | 'screening' | 'student-dash' | 'counsellor-dash';
  activeSubTab?: string;
  onNavigate: (view: 'landing' | 'screening' | 'student-dash' | 'counsellor-dash', subTab?: string) => void;
  onOpenAuth: (initialTab?: 'student-login' | 'counsellor-login') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeView,
  activeSubTab = 'overview',
  onNavigate,
  onOpenAuth,
  onLogout
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view: 'landing' | 'screening' | 'student-dash' | 'counsellor-dash', subTab?: string) => {
    onNavigate(view, subTab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-xs border-b-2 border-[#2B2438]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Logo / Branding */}
          <button 
            onClick={() => {
              if (user) {
                handleNavClick(user.role === 'STUDENT' ? 'student-dash' : 'counsellor-dash', 'overview');
              } else {
                handleNavClick('landing');
              }
            }}
            className="text-lg sm:text-xl font-bold tracking-tight text-[#231E2C] whitespace-nowrap shrink-0 flex items-center gap-2 group text-left"
          >
            <div className="w-8 h-8 bg-[#EFEAF8] border-2 border-[#2B2438] shadow-[2px_2px_0px_#2B2438] flex items-center justify-center text-[#7E65B7] group-hover:bg-[#DDD4F0] transition-colors">
              <PixelHeart size={16} />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold flex items-center gap-1.5 leading-none">
                CampusCare
                <PixelSparkle size={12} className="text-[#389E6E]" />
              </span>
              <span className="text-[10px] font-mono text-[#7E7491] tracking-wider uppercase mt-0.5">
                Student Wellness
              </span>
            </div>
          </button>



          {/* Authenticated Navigation for Student */}
          {user && user.role === 'STUDENT' && (
            <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-[#534B62]">
              <button
                onClick={() => handleNavClick('student-dash', 'overview')}
                className={`px-3 py-1.5 border-2 transition-all flex items-center gap-1.5 ${
                  activeView === 'student-dash' && activeSubTab === 'overview'
                    ? 'border-[#2B2438] bg-[#E0F4EA] text-[#0F3523] shadow-[2px_2px_0px_#2B2438]'
                    : 'border-transparent hover:border-[#D6CCE8] hover:bg-[#F4EFEA] text-[#534B62]'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => handleNavClick('student-dash', 'history')}
                className={`px-3 py-1.5 border-2 transition-all flex items-center gap-1.5 ${
                  activeView === 'student-dash' && activeSubTab === 'history'
                    ? 'border-[#2B2438] bg-[#EFEAF8] text-[#2C1F48] shadow-[2px_2px_0px_#2B2438]'
                    : 'border-transparent hover:border-[#D6CCE8] hover:bg-[#F4EFEA] text-[#534B62]'
                }`}
              >
                <PixelHeart size={14} />
                <span>Wellness History</span>
              </button>

              <button
                onClick={() => handleNavClick('student-dash', 'appointments')}
                className={`px-3 py-1.5 border-2 transition-all flex items-center gap-1.5 ${
                  activeView === 'student-dash' && activeSubTab === 'appointments'
                    ? 'border-[#2B2438] bg-[#E0F4EA] text-[#0F3523] shadow-[2px_2px_0px_#2B2438]'
                    : 'border-transparent hover:border-[#D6CCE8] hover:bg-[#F4EFEA] text-[#534B62]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Appointments</span>
              </button>

              <button
                onClick={() => handleNavClick('student-dash', 'profile')}
                className={`px-3 py-1.5 border-2 transition-all flex items-center gap-1.5 ${
                  activeView === 'student-dash' && activeSubTab === 'profile'
                    ? 'border-[#2B2438] bg-[#DDD4F0] text-[#2C1F48] shadow-[2px_2px_0px_#2B2438]'
                    : 'border-transparent hover:border-[#D6CCE8] hover:bg-[#F4EFEA] text-[#534B62]'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile</span>
              </button>
            </nav>
          )}

          {/* Authenticated Navigation for Counsellor */}
          {user && user.role === 'COUNSELLOR' && (
            <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-[#534B62]">
              <button
                onClick={() => handleNavClick('counsellor-dash', 'overview')}
                className={`px-3 py-1.5 border-2 transition-all flex items-center gap-1.5 ${
                  activeView === 'counsellor-dash' && activeSubTab === 'overview'
                    ? 'border-[#2B2438] bg-[#EFEAF8] text-[#2C1F48] shadow-[2px_2px_0px_#2B2438]'
                    : 'border-transparent hover:border-[#D6CCE8] hover:bg-[#F4EFEA] text-[#534B62]'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => handleNavClick('counsellor-dash', 'students')}
                className={`px-3 py-1.5 border-2 transition-all flex items-center gap-1.5 ${
                  activeView === 'counsellor-dash' && activeSubTab === 'students'
                    ? 'border-[#2B2438] bg-[#E0F4EA] text-[#0F3523] shadow-[2px_2px_0px_#2B2438]'
                    : 'border-transparent hover:border-[#D6CCE8] hover:bg-[#F4EFEA] text-[#534B62]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Students</span>
              </button>

              <button
                onClick={() => handleNavClick('counsellor-dash', 'availability')}
                className={`px-3 py-1.5 border-2 transition-all flex items-center gap-1.5 ${
                  activeView === 'counsellor-dash' && activeSubTab === 'availability'
                    ? 'border-[#2B2438] bg-[#EFEAF8] text-[#2C1F48] shadow-[2px_2px_0px_#2B2438]'
                    : 'border-transparent hover:border-[#D6CCE8] hover:bg-[#F4EFEA] text-[#534B62]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Availability</span>
              </button>

              <button
                onClick={() => handleNavClick('counsellor-dash', 'requests')}
                className={`px-3 py-1.5 border-2 transition-all flex items-center gap-1.5 ${
                  activeView === 'counsellor-dash' && activeSubTab === 'requests'
                    ? 'border-[#2B2438] bg-[#DDD4F0] text-[#2C1F48] shadow-[2px_2px_0px_#2B2438]'
                    : 'border-transparent hover:border-[#D6CCE8] hover:bg-[#F4EFEA] text-[#534B62]'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Booking Requests</span>
              </button>

              <button
                onClick={() => handleNavClick('counsellor-dash', 'reports')}
                className={`px-3 py-1.5 border-2 transition-all flex items-center gap-1.5 ${
                  activeView === 'counsellor-dash' && activeSubTab === 'reports'
                    ? 'border-[#2B2438] bg-[#E0F4EA] text-[#0F3523] shadow-[2px_2px_0px_#2B2438]'
                    : 'border-transparent hover:border-[#D6CCE8] hover:bg-[#F4EFEA] text-[#534B62]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Reports</span>
              </button>
            </nav>
          )}

          {/* User profile & Logout */}
          {user && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-[#231E2C] leading-tight truncate max-w-[140px]">
                  {user.name}
                </span>
                <span className="text-[10px] font-mono text-[#543E82]">
                  {user.role === 'STUDENT' ? 'Student' : 'Counsellor'}
                </span>
              </div>

              <PixelButton
                variant="outline"
                size="sm"
                onClick={onLogout}
                icon={<LogOut className="w-3.5 h-3.5" />}
              >
                <span className="hidden sm:inline">Sign Out</span>
              </PixelButton>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 border-2 border-[#2B2438] bg-white text-[#231E2C] hover:bg-[#F4EFEA]"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && user && (
        <div className="md:hidden border-t-2 border-[#2B2438] bg-[#FAF8F5] p-4 space-y-2">
          {user.role === 'STUDENT' ? (
            <>
              <button
                onClick={() => handleNavClick('student-dash', 'overview')}
                className="w-full text-left px-3 py-2 text-xs font-bold border-2 border-[#2B2438] bg-white"
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavClick('student-dash', 'history')}
                className="w-full text-left px-3 py-2 text-xs font-bold border-2 border-[#2B2438] bg-white"
              >
                Wellness History
              </button>
              <button
                onClick={() => handleNavClick('student-dash', 'appointments')}
                className="w-full text-left px-3 py-2 text-xs font-bold border-2 border-[#2B2438] bg-white"
              >
                Appointments
              </button>
              <button
                onClick={() => handleNavClick('student-dash', 'profile')}
                className="w-full text-left px-3 py-2 text-xs font-bold border-2 border-[#2B2438] bg-white"
              >
                Profile
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleNavClick('counsellor-dash', 'overview')}
                className="w-full text-left px-3 py-2 text-xs font-bold border-2 border-[#2B2438] bg-white"
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavClick('counsellor-dash', 'students')}
                className="w-full text-left px-3 py-2 text-xs font-bold border-2 border-[#2B2438] bg-white"
              >
                Students
              </button>
              <button
                onClick={() => handleNavClick('counsellor-dash', 'availability')}
                className="w-full text-left px-3 py-2 text-xs font-bold border-2 border-[#2B2438] bg-white"
              >
                Availability
              </button>
              <button
                onClick={() => handleNavClick('counsellor-dash', 'requests')}
                className="w-full text-left px-3 py-2 text-xs font-bold border-2 border-[#2B2438] bg-white"
              >
                Booking Requests
              </button>
              <button
                onClick={() => handleNavClick('counsellor-dash', 'reports')}
                className="w-full text-left px-3 py-2 text-xs font-bold border-2 border-[#2B2438] bg-white"
              >
                Reports
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
};
