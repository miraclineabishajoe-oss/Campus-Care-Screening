import React, { useState, useEffect } from 'react';
import { AuthUser, Appointment, Screening, AvailabilitySlot } from '../types';
import { api } from '../api/client';
import { 
  PixelButton, 
  PixelCard, 
  PixelBadge, 
  PixelHeart, 
  PixelCalendar, 
  PixelClock, 
  PixelShield, 
  PixelCheck, 
  PixelUser,
  PixelSparkle
} from './PixelUI';
import { 
  Activity, 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  ExternalLink, 
  AlertCircle, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  PlusCircle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';

interface StudentDashboardProps {
  user: AuthUser;
  activeSubTab?: string;
  activeTab?: string;
  onNavigateToScreening: () => void;
  onNavigateToTab?: (tab: string) => void;
  onSubTabChange?: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  activeSubTab,
  activeTab = 'overview',
  onNavigateToScreening,
  onNavigateToTab,
  onSubTabChange
}) => {
  const [tab, setTab] = useState<'overview' | 'history' | 'appointments' | 'profile'>(
    ((activeSubTab || activeTab) as any) || 'overview'
  );

  useEffect(() => {
    const desired = activeSubTab || activeTab;
    if (desired && ['overview', 'history', 'appointments', 'profile'].includes(desired)) {
      setTab(desired as any);
    }
  }, [activeSubTab, activeTab]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Booking Modal State inside Dashboard
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [bookingReason, setBookingReason] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Appointment Filter Tab
  const [apptFilter, setApptFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'COMPLETED'>('ALL');

  useEffect(() => {
    if (activeTab && ['overview', 'history', 'appointments', 'profile'].includes(activeTab)) {
      setTab(activeTab as any);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [apptRes, scrRes, slotsRes] = await Promise.all([
        api.appointments.getStudentAppointments(),
        api.screenings.getHistory(),
        api.availability.getPublicSlots()
      ]);
      setAppointments(apptRes.appointments || []);
      setScreenings(scrRes.screenings || []);
      setAvailableSlots(slotsRes.slots || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load your student records.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: number) => {
    if (!window.confirm('Cancel this counselling appointment? The slot will be freed for other students.')) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await api.appointments.cancel(appointmentId);
      setSuccess('Appointment cancelled successfully.');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel appointment.');
    }
  };

  const handleBookSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setBookingSubmitting(true);
    setBookingError(null);
    try {
      await api.appointments.book({
        availability_id: selectedSlot.availability_id,
        reason: bookingReason.trim() || undefined
      });
      setSuccess('Booking request submitted! Awaiting counsellor confirmation.');
      setShowBookingModal(false);
      setSelectedSlot(null);
      setBookingReason('');
      loadData();
    } catch (err: any) {
      setBookingError(err.message || 'Unable to submit booking request. Slot may be reserved.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Computations
  const completedScreeningsCount = screenings.length;
  const pendingRequests = appointments.filter(a => a.workflow_status === 'PENDING');
  const confirmedAppointments = appointments.filter(a => a.workflow_status === 'CONFIRMED' || (a.booking_status === 'BOOKED' && !a.workflow_status));
  const completedSessions = appointments.filter(a => a.workflow_status === 'COMPLETED' || a.booking_status === 'COMPLETED');
  const upcomingCount = pendingRequests.length + confirmedAppointments.length;

  const latestScreening = screenings[0];
  const latestScreeningDate = latestScreening 
    ? new Date(latestScreening.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'No screenings yet';

  // Filtered Appointments
  const filteredAppointments = appointments.filter(a => {
    if (apptFilter === 'ALL') return true;
    if (apptFilter === 'PENDING') return a.workflow_status === 'PENDING';
    if (apptFilter === 'CONFIRMED') return a.workflow_status === 'CONFIRMED' || (a.booking_status === 'BOOKED' && !a.workflow_status);
    if (apptFilter === 'REJECTED') return a.workflow_status === 'REJECTED';
    if (apptFilter === 'COMPLETED') return a.workflow_status === 'COMPLETED' || a.booking_status === 'COMPLETED';
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      
      {/* Top Banner with Navigation Tabs */}
      <PixelCard
        variant="white"
        shadow="md"
        border="dark"
        accentBorderTop="mint"
        className="p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#E8E0D5] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PixelBadge variant="mint" size="sm" icon={<PixelHeart size={10} className="text-[#1D5E40]" />}>
                STUDENT DASHBOARD
              </PixelBadge>
              <span className="text-[11px] font-mono text-[#7E7491]">
                STUDENT ID #{user.id}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#231E2C]">
              {user.name}
            </h1>
            <p className="text-xs text-[#534B62]">
              {user.email} · Confidential Health Records Protected
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PixelButton
              variant="mintDark"
              size="sm"
              onClick={onNavigateToScreening}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Take Wellness Screening
            </PixelButton>
            <PixelButton
              variant="primary"
              size="sm"
              onClick={() => {
                setShowBookingModal(true);
                setBookingError(null);
              }}
              icon={<Calendar className="w-3.5 h-3.5" />}
            >
              Book Counselling Slot
            </PixelButton>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex border-b-2 border-[#2B2438] mt-4 -mb-6 -mx-6 px-6 bg-[#FAF8F5]">
          <button
            onClick={() => setTab('overview')}
            className={`py-2.5 px-4 text-xs font-bold transition-all border-b-4 flex items-center gap-1.5 ${
              tab === 'overview'
                ? 'border-b-[#297D56] bg-white text-[#0F3523]'
                : 'border-b-transparent text-[#7E7491] hover:text-[#231E2C]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setTab('history')}
            className={`py-2.5 px-4 text-xs font-bold transition-all border-b-4 flex items-center gap-1.5 ${
              tab === 'history'
                ? 'border-b-[#7E65B7] bg-white text-[#2C1F48]'
                : 'border-b-transparent text-[#7E7491] hover:text-[#231E2C]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Mood & Wellness History ({screenings.length})</span>
          </button>
          <button
            onClick={() => setTab('appointments')}
            className={`py-2.5 px-4 text-xs font-bold transition-all border-b-4 flex items-center gap-1.5 ${
              tab === 'appointments'
                ? 'border-b-[#297D56] bg-white text-[#0F3523]'
                : 'border-b-transparent text-[#7E7491] hover:text-[#231E2C]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Appointments & Slots ({appointments.length})</span>
          </button>
          <button
            onClick={() => setTab('profile')}
            className={`py-2.5 px-4 text-xs font-bold transition-all border-b-4 flex items-center gap-1.5 ${
              tab === 'profile'
                ? 'border-b-[#7E65B7] bg-white text-[#2C1F48]'
                : 'border-b-transparent text-[#7E7491] hover:text-[#231E2C]'
            }`}
          >
            <PixelUser size={14} />
            <span>Profile</span>
          </button>
        </div>
      </PixelCard>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-[#FDE8E8] border-2 border-[#2B2438] text-xs text-[#9B1C1C] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-[#E0F4EA] border-2 border-[#2B2438] text-xs text-[#1D5E40] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PixelCheck size={16} className="shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="font-bold text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Section A: Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <PixelCard variant="white" shadow="sm" border="dark" className="p-4 space-y-1">
              <span className="text-[11px] font-bold text-[#7E7491] uppercase tracking-wider block">
                Total Screenings
              </span>
              <div className="text-2xl font-black text-[#231E2C]">
                {completedScreeningsCount}
              </div>
              <span className="text-[11px] text-[#534B62]">
                Completed assessments
              </span>
            </PixelCard>

            <PixelCard variant="white" shadow="sm" border="dark" className="p-4 space-y-1">
              <span className="text-[11px] font-bold text-[#7E7491] uppercase tracking-wider block">
                Upcoming Sessions
              </span>
              <div className="text-2xl font-black text-[#297D56]">
                {upcomingCount}
              </div>
              <span className="text-[11px] text-[#534B62]">
                {pendingRequests.length} pending, {confirmedAppointments.length} confirmed
              </span>
            </PixelCard>

            <PixelCard variant="white" shadow="sm" border="dark" className="p-4 space-y-1">
              <span className="text-[11px] font-bold text-[#7E7491] uppercase tracking-wider block">
                Past Sessions
              </span>
              <div className="text-2xl font-black text-[#7E65B7]">
                {completedSessions.length}
              </div>
              <span className="text-[11px] text-[#534B62]">
                Concluded consultations
              </span>
            </PixelCard>

            <PixelCard variant="white" shadow="sm" border="dark" className="p-4 space-y-1">
              <span className="text-[11px] font-bold text-[#7E7491] uppercase tracking-wider block">
                Latest Screening Date
              </span>
              <div className="text-sm font-black text-[#231E2C] truncate pt-1">
                {latestScreeningDate}
              </div>
              <span className="text-[11px] text-[#534B62]">
                {latestScreening ? `Score: ${latestScreening.overall_score}` : 'None recorded'}
              </span>
            </PixelCard>
          </div>

          {/* Quick Highlight of Next Confirmed/Pending Session */}
          {(confirmedAppointments.length > 0 || pendingRequests.length > 0) && (
            <PixelCard variant="cream" shadow="sm" border="dark" className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <PixelBadge 
                      variant={confirmedAppointments.length > 0 ? 'mint' : 'lavender'} 
                      size="sm"
                    >
                      {confirmedAppointments.length > 0 ? 'NEXT CONFIRMED SESSION' : 'PENDING COUNSELLOR REVIEW'}
                    </PixelBadge>
                  </div>
                  <h3 className="text-base font-bold text-[#231E2C]">
                    {(confirmedAppointments[0] || pendingRequests[0]).counsellor_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#534B62]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#297D56]" />
                      {(confirmedAppointments[0] || pendingRequests[0]).slot_start?.slice(0, 10)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#7E65B7]" />
                      {(confirmedAppointments[0] || pendingRequests[0]).slot_start?.slice(11, 16)} - {(confirmedAppointments[0] || pendingRequests[0]).slot_end?.slice(11, 16)}
                    </span>
                    {(confirmedAppointments[0] || pendingRequests[0]).session_mode === 'ONLINE' ? (
                      <span className="flex items-center gap-1 text-[#2C1F48] font-bold bg-[#EFEAF8] px-2 py-0.5 border border-[#2B2438]">
                        <Video className="w-3 h-3 text-[#7E65B7]" /> Online Video
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#0F3523] font-bold bg-[#E0F4EA] px-2 py-0.5 border border-[#2B2438]">
                        <MapPin className="w-3 h-3 text-[#297D56]" /> In-Person Room
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(confirmedAppointments[0] || pendingRequests[0]).meeting_link && (
                    <a
                      href={(confirmedAppointments[0] || pendingRequests[0]).meeting_link!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#7E65B7] text-white border-2 border-[#2B2438] shadow-[2px_2px_0px_#2B2438] hover:bg-[#684FA0]"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Join Meeting Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <PixelButton
                    variant="outline"
                    size="sm"
                    onClick={() => setTab('appointments')}
                  >
                    View All Appointments
                  </PixelButton>
                </div>
              </div>
            </PixelCard>
          )}

          {/* Screening Quick CTA & Recent History Teaser */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7">
              <PixelCard variant="white" shadow="sm" border="dark" className="p-5 space-y-4 h-full">
                <div className="flex items-center justify-between border-b-2 border-[#E8E0D5] pb-3">
                  <h3 className="text-sm font-bold text-[#231E2C] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#297D56]" />
                    Recent Wellness Assessments
                  </h3>
                  <button
                    onClick={() => setTab('history')}
                    className="text-xs font-bold text-[#7E65B7] hover:underline flex items-center gap-1"
                  >
                    Full History <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {screenings.length === 0 ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-10 h-10 mx-auto bg-[#FAF8F5] border-2 border-[#2B2438] flex items-center justify-center text-[#7E65B7]">
                      <PixelHeart size={16} />
                    </div>
                    <p className="text-xs text-[#534B62] max-w-sm mx-auto">
                      You have not completed any self-screenings yet. Begin tracking your mental wellbeing by taking your first assessment.
                    </p>
                    <PixelButton variant="primary" size="sm" onClick={onNavigateToScreening}>
                      Start First Screening
                    </PixelButton>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {screenings.slice(0, 3).map(s => (
                      <div key={s.screening_id} className="p-3 bg-[#FAF8F5] border-2 border-[#2B2438] flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-[#231E2C] block">
                            {s.screening_summary || 'Wellness Evaluation'}
                          </span>
                          <span className="text-[11px] font-mono text-[#7E7491]">
                            Submitted: {new Date(s.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-[#297D56] bg-white px-2 py-0.5 border border-[#2B2438]">
                            Score: {s.overall_score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </PixelCard>
            </div>

            <div className="md:col-span-5">
              <PixelCard variant="cream" shadow="sm" border="dark" className="p-5 space-y-4 h-full flex flex-col justify-between">
                <div className="space-y-2">
                  <PixelBadge variant="lavender" size="sm">
                    SELF-CARE GUIDANCE
                  </PixelBadge>
                  <h3 className="text-sm font-bold text-[#231E2C]">
                    Confidential Support & Scheduling
                  </h3>
                  <p className="text-xs text-[#534B62] leading-relaxed">
                    CampusCare is designed to assist you with stress management, academic pacing, and direct access to licensed university counsellors.
                  </p>
                </div>

                <div className="space-y-2 pt-4 border-t-2 border-[#E8E0D5]">
                  <PixelButton
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={() => {
                      setShowBookingModal(true);
                      setBookingError(null);
                    }}
                  >
                    Browse Available Slots ({availableSlots.length})
                  </PixelButton>
                  <PixelButton
                    variant="outline"
                    size="md"
                    fullWidth
                    onClick={onNavigateToScreening}
                  >
                    Take New Screening
                  </PixelButton>
                </div>
              </PixelCard>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOOD & WELLNESS HISTORY (with charts) */}
      {tab === 'history' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#231E2C]">Chronological Wellness & Screening History</h2>
              <p className="text-xs text-[#534B62]">
                Review all your past self-evaluations and track your score progression over time.
              </p>
            </div>
            <PixelButton variant="primary" size="sm" onClick={onNavigateToScreening}>
              Start New Screening
            </PixelButton>
          </div>

          {screenings.length === 0 ? (
            <PixelCard variant="white" shadow="sm" border="dark" className="p-12 text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-[#EFEAF8] border-2 border-[#2B2438] flex items-center justify-center text-[#7E65B7] shadow-[2px_2px_0px_#2B2438]">
                <PixelHeart size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#231E2C]">No Screening History Available</h3>
                <p className="text-xs text-[#534B62] max-w-md mx-auto leading-relaxed">
                  You have not submitted any mental wellness screenings yet. Your historical scores, trends, and clinical summaries will appear here once you take an assessment.
                </p>
              </div>
              <PixelButton variant="mintDark" size="md" onClick={onNavigateToScreening}>
                Take Your First Screening
              </PixelButton>
            </PixelCard>
          ) : (
            <>
              {/* Trend Chart (Line Chart over actual historical data) */}
              {screenings.length >= 2 ? (
                <PixelCard variant="white" shadow="sm" border="dark" className="p-6 space-y-4">
                  <div className="flex items-center justify-between border-b-2 border-[#E8E0D5] pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#231E2C] flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-[#297D56]" />
                        Wellness Score Trajectory Over Time
                      </h3>
                      <span className="text-[11px] text-[#7E7491]">
                        Plotting {screenings.length} completed assessments (Lower scores indicate lower distress)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <span className="flex items-center gap-1 text-[#297D56]">
                        <span className="w-2.5 h-2.5 bg-[#297D56] inline-block" /> 0-9 Mild
                      </span>
                      <span className="flex items-center gap-1 text-[#B45309]">
                        <span className="w-2.5 h-2.5 bg-[#B45309] inline-block" /> 10-14 Moderate
                      </span>
                      <span className="flex items-center gap-1 text-[#9B1C1C]">
                        <span className="w-2.5 h-2.5 bg-[#9B1C1C] inline-block" /> 15+ Severe
                      </span>
                    </div>
                  </div>

                  {/* SVG Responsive Line Chart */}
                  <div className="pt-2">
                    <div className="w-full h-48 bg-[#FAF8F5] border-2 border-[#2B2438] p-4 relative flex flex-col justify-between">
                      {/* Grid lines */}
                      <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none opacity-20">
                        <div className="border-b border-[#2B2438] w-full" />
                        <div className="border-b border-[#2B2438] w-full" />
                        <div className="border-b border-[#2B2438] w-full" />
                      </div>

                      {/* SVG Line Plot */}
                      <svg className="w-full h-full overflow-visible" viewBox={`0 0 500 120`} preserveAspectRatio="none">
                        {/* Area Fill */}
                        <polygon
                          points={`0,120 ${[...screenings].reverse().map((s, idx) => {
                            const x = (idx / (screenings.length - 1)) * 500;
                            const score = Math.min(Math.max(Number(s.overall_score) || 0, 0), 24);
                            const y = 120 - (score / 24) * 110;
                            return `${x},${y}`;
                          }).join(' ')} 500,120`}
                          fill="rgba(126, 101, 183, 0.15)"
                        />
                        {/* Line */}
                        <polyline
                          fill="none"
                          stroke="#7E65B7"
                          strokeWidth="3"
                          points={[...screenings].reverse().map((s, idx) => {
                            const x = (idx / (screenings.length - 1)) * 500;
                            const score = Math.min(Math.max(Number(s.overall_score) || 0, 0), 24);
                            const y = 120 - (score / 24) * 110;
                            return `${x},${y}`;
                          }).join(' ')}
                        />
                        {/* Data Points */}
                        {[...screenings].reverse().map((s, idx) => {
                          const x = (idx / (screenings.length - 1)) * 500;
                          const score = Math.min(Math.max(Number(s.overall_score) || 0, 0), 24);
                          const y = 120 - (score / 24) * 110;
                          return (
                            <circle
                              key={s.screening_id}
                              cx={x}
                              cy={y}
                              r="5"
                              fill="#297D56"
                              stroke="#2B2438"
                              strokeWidth="2"
                            />
                          );
                        })}
                      </svg>

                      {/* X-Axis Labels */}
                      <div className="flex justify-between text-[10px] font-mono text-[#7E7491] pt-2 border-t border-[#2B2438]">
                        <span>Earliest ({new Date([...screenings].reverse()[0].submitted_at).toLocaleDateString()})</span>
                        <span>Latest ({new Date(screenings[0].submitted_at).toLocaleDateString()})</span>
                      </div>
                    </div>
                  </div>
                </PixelCard>
              ) : (
                <div className="p-4 bg-[#FAF8F5] border-2 border-[#2B2438] text-xs text-[#534B62] flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#7E65B7] shrink-0" />
                  <span>
                    Historical trend chart activates when at least two screening records are saved. You currently have 1 recorded evaluation.
                  </span>
                </div>
              )}

              {/* Detailed Table of Screenings */}
              <PixelCard variant="white" shadow="sm" border="dark" className="overflow-hidden">
                <div className="p-4 bg-[#FAF8F5] border-b-2 border-[#2B2438] font-bold text-xs text-[#231E2C] flex items-center justify-between">
                  <span>Completed Screening Records</span>
                  <span className="font-mono text-[11px] text-[#7E7491]">{screenings.length} Submissions</span>
                </div>
                <div className="divide-y-2 divide-[#E8E0D5]">
                  {screenings.map((s, index) => (
                    <div key={s.screening_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8F5] transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#231E2C]">
                            Assessment #{screenings.length - index}
                          </span>
                          <span className="text-[11px] font-mono text-[#7E7491]">
                            {new Date(s.submitted_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-[#534B62]">
                          {s.screening_summary || 'Standard Self-Screening Assessment'}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-xs font-mono text-[#7E7491] block">Overall Score</span>
                          <span className="text-base font-black text-[#297D56]">
                            {s.overall_score !== null ? s.overall_score : 'N/A'}
                          </span>
                        </div>
                        <PixelBadge variant={Number(s.overall_score) < 10 ? 'mint' : (Number(s.overall_score) < 15 ? 'lavender' : 'amber')} size="sm">
                          {Number(s.overall_score) < 10 ? 'Mild' : (Number(s.overall_score) < 15 ? 'Moderate' : 'Priority')}
                        </PixelBadge>
                      </div>
                    </div>
                  ))}
                </div>
              </PixelCard>
            </>
          )}
        </div>
      )}

      {/* TAB 3: APPOINTMENTS & SLOTS */}
      {tab === 'appointments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#231E2C]">Counselling Appointments & Requests</h2>
              <p className="text-xs text-[#534B62]">
                Track pending booking requests, confirmed consultation details, and past meetings.
              </p>
            </div>
            <PixelButton
              variant="primary"
              size="sm"
              onClick={() => {
                setShowBookingModal(true);
                setBookingError(null);
              }}
              icon={<PlusCircle className="w-3.5 h-3.5" />}
            >
              Request New Session
            </PixelButton>
          </div>

          {/* Filter Sub-Tabs */}
          <div className="flex flex-wrap gap-2 border-b-2 border-[#2B2438] pb-3">
            {(['ALL', 'PENDING', 'CONFIRMED', 'REJECTED', 'COMPLETED'] as const).map(filterKey => (
              <button
                key={filterKey}
                onClick={() => setApptFilter(filterKey)}
                className={`px-3 py-1 text-xs font-bold border-2 transition-all ${
                  apptFilter === filterKey
                    ? 'border-[#2B2438] bg-[#297D56] text-white shadow-[2px_2px_0px_#2B2438]'
                    : 'border-[#2B2438] bg-white text-[#534B62] hover:bg-[#FAF8F5]'
                }`}
              >
                {filterKey === 'ALL' ? 'All Bookings' : filterKey}
              </button>
            ))}
          </div>

          {filteredAppointments.length === 0 ? (
            <PixelCard variant="white" shadow="sm" border="dark" className="p-12 text-center space-y-3">
              <Calendar className="w-10 h-10 mx-auto text-[#7E65B7]" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#231E2C]">No Appointments Found</h3>
                <p className="text-xs text-[#534B62] max-w-sm mx-auto">
                  {apptFilter === 'ALL'
                    ? 'You have not booked any counselling sessions yet. Browse available practitioner slots to request an appointment.'
                    : `No sessions currently matching status "${apptFilter}".`}
                </p>
              </div>
              <PixelButton
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowBookingModal(true);
                  setBookingError(null);
                }}
              >
                Browse Open Availability Slots
              </PixelButton>
            </PixelCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAppointments.map(appt => {
                const isPending = appt.workflow_status === 'PENDING';
                const isConfirmed = appt.workflow_status === 'CONFIRMED' || (appt.booking_status === 'BOOKED' && !appt.workflow_status);
                const isRejected = appt.workflow_status === 'REJECTED';
                const isCompleted = appt.workflow_status === 'COMPLETED' || appt.booking_status === 'COMPLETED';
                const isCancelled = appt.workflow_status === 'CANCELLED' || appt.booking_status === 'CANCELLED';

                return (
                  <PixelCard
                    key={appt.appointment_id}
                    variant="white"
                    shadow="sm"
                    border="dark"
                    className="p-5 space-y-3 relative flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        {isPending && (
                          <PixelBadge variant="lavender" size="sm">
                            PENDING REVIEW
                          </PixelBadge>
                        )}
                        {isConfirmed && (
                          <PixelBadge variant="mint" size="sm" icon={<CheckCircle2 className="w-3 h-3 text-[#1D5E40]" />}>
                            CONFIRMED
                          </PixelBadge>
                        )}
                        {isRejected && (
                          <PixelBadge variant="amber" size="sm" icon={<XCircle className="w-3 h-3 text-[#92400E]" />}>
                            DECLINED
                          </PixelBadge>
                        )}
                        {isCompleted && (
                          <PixelBadge variant="cream" size="sm">
                            COMPLETED
                          </PixelBadge>
                        )}
                        {isCancelled && (
                          <PixelBadge variant="cream" size="sm">
                            CANCELLED
                          </PixelBadge>
                        )}

                        <span className="text-[10px] font-mono text-[#7E7491]">
                          #{appt.appointment_id}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#231E2C]">
                        {appt.counsellor_name || 'Assigned Counsellor'}
                      </h3>
                      {appt.specialization && (
                        <p className="text-xs text-[#7E65B7] font-semibold">
                          {appt.specialization}
                        </p>
                      )}

                      <div className="p-3 bg-[#FAF8F5] border border-[#2B2438] text-xs space-y-1.5">
                        <div className="flex items-center gap-2 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-[#297D56]" />
                          <span>{appt.slot_start?.slice(0, 10)}</span>
                          <span className="text-[#7E7491]">·</span>
                          <Clock className="w-3.5 h-3.5 text-[#7E65B7]" />
                          <span>{appt.slot_start?.slice(11, 16)} - {appt.slot_end?.slice(11, 16)}</span>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-[#E8E0D5]">
                          {appt.session_mode === 'ONLINE' ? (
                            <span className="flex items-center gap-1 font-bold text-[#2C1F48]">
                              <Video className="w-3.5 h-3.5 text-[#7E65B7]" /> Mode: Online Video
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 font-bold text-[#0F3523]">
                              <MapPin className="w-3.5 h-3.5 text-[#297D56]" /> Mode: In-Person (Room)
                            </span>
                          )}
                        </div>

                        {/* Location or Meeting Link */}
                        {isConfirmed && appt.session_mode === 'ONLINE' && appt.meeting_link && (
                          <div className="pt-2">
                            <a
                              href={appt.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#7E65B7] text-white border-2 border-[#2B2438] hover:bg-[#684FA0] w-full justify-center"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Join Online Meeting</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {isConfirmed && appt.session_mode === 'OFFLINE' && (
                          <p className="text-xs font-bold text-[#297D56] pt-1">
                            Location: {appt.location || 'Campus Health Center, Room 204'}
                          </p>
                        )}

                        {isPending && (
                          <p className="text-[11px] text-[#B45309] font-medium pt-1">
                            Meeting details will unlock once the counsellor accepts this booking.
                          </p>
                        )}

                        {isRejected && appt.rejection_reason && (
                          <p className="text-[11px] text-[#9B1C1C] font-medium pt-1">
                            Reason: {appt.rejection_reason}
                          </p>
                        )}
                      </div>

                      {appt.student_reason && (
                        <p className="text-xs text-[#534B62] italic">
                          "Reason: {appt.student_reason}"
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {(isPending || isConfirmed) && (
                      <div className="pt-3 border-t-2 border-[#E8E0D5] flex justify-end">
                        <button
                          onClick={() => handleCancelAppointment(appt.appointment_id)}
                          className="text-xs font-bold text-[#9B1C1C] hover:underline"
                        >
                          Cancel Appointment
                        </button>
                      </div>
                    )}
                  </PixelCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PROFILE */}
      {tab === 'profile' && (
        <div className="space-y-6">
          <PixelCard variant="white" shadow="sm" border="dark" className="p-6 space-y-4 max-w-2xl">
            <h2 className="text-lg font-bold text-[#231E2C] border-b-2 border-[#E8E0D5] pb-3">
              Student Profile & Wellness Records
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#FAF8F5]">
                <span className="font-bold text-[#7E7491]">Student Record ID:</span>
                <span className="font-mono text-[#231E2C]">#{user.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#FAF8F5]">
                <span className="font-bold text-[#7E7491]">Full Legal Name:</span>
                <span className="font-bold text-[#231E2C]">{user.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#FAF8F5]">
                <span className="font-bold text-[#7E7491]">Registered University Email:</span>
                <span className="font-mono text-[#231E2C]">{user.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#FAF8F5]">
                <span className="font-bold text-[#7E7491]">Access Role:</span>
                <PixelBadge variant="mint" size="sm">STUDENT</PixelBadge>
              </div>
            </div>

            <div className="pt-4 border-t-2 border-[#E8E0D5] space-y-2">
              <h4 className="text-xs font-bold text-[#231E2C]">Confidentiality & Privacy Policy</h4>
              <p className="text-xs text-[#534B62] leading-relaxed">
                CampusCare operates under strict university privacy guidelines. Screening answers and appointment requests are exclusively accessible to you and licensed campus health professionals assigned to your care.
              </p>
            </div>
          </PixelCard>
        </div>
      )}

      {/* MODAL: BROWSE SLOTS & BOOK APPOINTMENT */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-[#231E2C]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <PixelCard
            variant="white"
            shadow="lg"
            border="dark"
            className="max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b-2 border-[#2B2438] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#231E2C]">Request Counselling Appointment</h3>
                <p className="text-xs text-[#534B62]">Select an open slot published by verified campus counsellors</p>
              </div>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setSelectedSlot(null);
                }}
                className="w-6 h-6 border-2 border-[#2B2438] font-bold text-xs flex items-center justify-center hover:bg-[#FDE8E8]"
              >
                ✕
              </button>
            </div>

            {bookingError && (
              <div className="p-3 bg-[#FDE8E8] border-2 border-[#2B2438] text-xs text-[#9B1C1C]">
                {bookingError}
              </div>
            )}

            {!selectedSlot ? (
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#7E7491] uppercase block">
                  Available Sessions ({availableSlots.length})
                </span>

                {availableSlots.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <Clock className="w-8 h-8 mx-auto text-[#7E7491]" />
                    <p className="text-xs text-[#534B62]">
                      No open counselling slots are currently published. Please check back soon or contact campus health services.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {availableSlots.map(slot => (
                      <div
                        key={slot.availability_id}
                        className="p-3 bg-[#FAF8F5] border-2 border-[#2B2438] hover:border-[#297D56] transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-[#231E2C] block">
                            {slot.counsellor_name}
                          </span>
                          <span className="text-[11px] text-[#7E65B7] font-semibold block">
                            {slot.specialization}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-[#534B62]">
                            <span>{slot.slot_start.slice(0, 10)}</span>
                            <span>{slot.slot_start.slice(11, 16)} - {slot.slot_end.slice(11, 16)}</span>
                            <span className="font-bold text-[#297D56]">
                              [{slot.session_mode || 'OFFLINE'}]
                            </span>
                          </div>
                        </div>

                        <PixelButton
                          variant="primary"
                          size="sm"
                          onClick={() => setSelectedSlot(slot)}
                        >
                          Select Slot
                        </PixelButton>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleBookSlot} className="space-y-4">
                <div className="p-3 bg-[#E0F4EA] border-2 border-[#2B2438] text-xs space-y-1">
                  <span className="font-bold text-[#0F3523] block">Selected Slot Confirmation:</span>
                  <p className="text-[#231E2C]">
                    <strong>{selectedSlot.counsellor_name}</strong> ({selectedSlot.specialization})
                  </p>
                  <p className="font-mono text-[11px] text-[#534B62]">
                    {selectedSlot.slot_start.slice(0, 10)} at {selectedSlot.slot_start.slice(11, 16)} - {selectedSlot.slot_end.slice(11, 16)} ({selectedSlot.session_mode || 'In-Person'})
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#231E2C] mb-1">
                    Reason for Appointment / Topic (Confidential)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={150}
                    value={bookingReason}
                    onChange={(e) => setBookingReason(e.target.value)}
                    placeholder="e.g. Exam stress, sleep pattern disruption, or general counselling..."
                    className="w-full p-2.5 text-xs bg-[#FAF8F5] text-[#231E2C] border-2 border-[#2B2438] rounded-none focus:outline-none focus:bg-white"
                  />
                  <span className="text-[10px] text-[#7E7491]">Max 150 characters</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-[#E8E0D5]">
                  <PixelButton
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setSelectedSlot(null)}
                  >
                    Change Slot
                  </PixelButton>
                  <PixelButton
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={bookingSubmitting}
                  >
                    {bookingSubmitting ? 'Submitting Request...' : 'Confirm Booking Request'}
                  </PixelButton>
                </div>
              </form>
            )}
          </PixelCard>
        </div>
      )}

    </div>
  );
};
