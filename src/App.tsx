/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthUser, DatabaseHealth } from './types';
import { api, clearStoredToken, getStoredToken } from './api/client';
import { Navbar } from './components/Navbar';
import { LandingView } from './components/LandingView';
import { ScreeningView } from './components/ScreeningView';
import { StudentDashboard } from './components/StudentDashboard';
import { CounsellorDashboard } from './components/CounsellorDashboard';
import { AuthModal } from './components/AuthModal';
import { PasswordRecoveryModal } from './components/PasswordRecoveryModal';
import { PixelButton, PixelCard, PixelHeart, PixelShield } from './components/PixelUI';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [activeView, setActiveView] = useState<'landing' | 'screening' | 'student-dash' | 'counsellor-dash'>('landing');
  
  const [activeSubTab, setActiveSubTab] = useState<string>('overview');
  
  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'student-login' | 'student-register' | 'counsellor-login' | 'counsellor-register'>('student-login');
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [health, setHealth] = useState<DatabaseHealth | null>(null);

  useEffect(() => {
    // Check session on load
    if (getStoredToken()) {
      api.auth.getMe()
        .then(user => {
          setCurrentUser(user);
          if (user.role === 'STUDENT') {
            setActiveView('student-dash');
          } else {
            setActiveView('counsellor-dash');
          }
        })
        .catch(() => {
          clearStoredToken();
          setCurrentUser(null);
        });
    }

    // Check database health
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const data = await api.health.check();
      setHealth(data);
    } catch (err) {
      console.error('Failed to query health API:', err);
    }
  };

  const handleOpenAuth = (tab: 'student-login' | 'student-register' | 'counsellor-login' | 'counsellor-register' = 'student-login') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const handleLogout = () => {
    api.auth.logout();
    setCurrentUser(null);
    setActiveView('landing');
    setActiveSubTab('overview');
  };

  const handleAuthSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setActiveSubTab('overview');
    if (user.role === 'STUDENT') {
      setActiveView('student-dash');
    } else {
      setActiveView('counsellor-dash');
    }
  };

  const handleNavigate = (view: 'landing' | 'screening' | 'student-dash' | 'counsellor-dash', subTab?: string) => {
    setActiveView(view);
    if (subTab) {
      setActiveSubTab(subTab);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col font-sans text-[#231E2C] antialiased selection:bg-[#DDD4F0] selection:text-[#2C1F48]">
      {/* Top Navigation */}
      <Navbar
        user={currentUser}
        activeView={activeView}
        activeSubTab={activeSubTab}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeView === 'landing' && (
          <LandingView
            user={currentUser}
            onNavigate={(view) => handleNavigate(view)}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {activeView === 'screening' && (
          <ScreeningView
            user={currentUser}
            onOpenAuth={handleOpenAuth}
            onNavigateToBooking={() => handleNavigate('student-dash', 'appointments')}
          />
        )}

        {activeView === 'student-dash' && (
          currentUser && currentUser.role === 'STUDENT' ? (
            <StudentDashboard
              user={currentUser}
              activeSubTab={activeSubTab}
              onSubTabChange={(tab) => setActiveSubTab(tab)}
              onNavigateToScreening={() => setActiveView('screening')}
            />
          ) : (
            <div className="max-w-md mx-auto py-24 px-4 text-center">
              <PixelCard variant="white" shadow="md" className="p-8 text-center space-y-4">
                <div className="w-12 h-12 mx-auto bg-[#EFEAF8] border-2 border-[#2B2438] flex items-center justify-center text-[#7E65B7] shadow-[2px_2px_0px_#2B2438]">
                  <PixelHeart size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#231E2C]">Student Portal Access</h3>
                  <p className="text-xs text-[#534B62] mt-1.5 leading-relaxed">
                    Please sign into your registered student account to view scheduled appointments, past screening assessments, and personal wellness records.
                  </p>
                </div>
                <div className="pt-2">
                  <PixelButton
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={() => handleOpenAuth('student-login')}
                  >
                    Sign In as Student
                  </PixelButton>
                </div>
              </PixelCard>
            </div>
          )
        )}

        {activeView === 'counsellor-dash' && (
          currentUser && currentUser.role === 'COUNSELLOR' ? (
            <CounsellorDashboard
              user={currentUser}
              activeSubTab={activeSubTab}
              onSubTabChange={(tab) => setActiveSubTab(tab)}
            />
          ) : (
            <div className="max-w-md mx-auto py-24 px-4 text-center">
              <PixelCard variant="white" shadow="md" className="p-8 text-center space-y-4">
                <div className="w-12 h-12 mx-auto bg-[#E0F4EA] border-2 border-[#2B2438] flex items-center justify-center text-[#297D56] shadow-[2px_2px_0px_#2B2438]">
                  <PixelShield size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#231E2C]">Counsellor Console Access</h3>
                  <p className="text-xs text-[#534B62] mt-1.5 leading-relaxed">
                    Please sign into your verified counsellor account to manage student appointments, publish availability slots, and review screening context.
                  </p>
                </div>
                <div className="pt-2">
                  <PixelButton
                    variant="secondary"
                    size="md"
                    fullWidth
                    onClick={() => handleOpenAuth('counsellor-login')}
                  >
                    Sign In as Counsellor
                  </PixelButton>
                </div>
              </PixelCard>
            </div>
          )
        )}
      </main>

      {/* Reassuring, Clean Pixel Footer */}
      <footer className="bg-[#FAF8F5] border-t-2 border-[#2B2438] py-8 text-xs text-[#534B62]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <PixelHeart size={16} className="text-[#7E65B7]" />
            <span className="font-bold text-[#231E2C] tracking-tight">CampusCare</span>
            <span className="text-[#8E84A3]">·</span>
            <span className="text-xs text-[#534B62]">Student Wellness & Counselling Coordination</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-[#7E7491]">
            <span>24/7 Campus Crisis: 1-800-273-TALK</span>
            <span>·</span>
            <span>Emergency: Campus Security Ext. 5555</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#1D5E40]">
            <PixelShield size={12} className="text-[#389E6E]" />
            <span>Encrypted & Strictly Confidential</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        initialTab={authModalTab}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onOpenRecovery={() => setRecoveryModalOpen(true)}
      />

      <PasswordRecoveryModal
        isOpen={recoveryModalOpen}
        onClose={() => setRecoveryModalOpen(false)}
        onSuccessLogin={() => handleOpenAuth('student-login')}
      />
    </div>
  );
}
