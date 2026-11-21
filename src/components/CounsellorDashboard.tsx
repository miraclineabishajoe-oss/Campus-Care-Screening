import React, { useState, useEffect } from 'react';
import { AuthUser, AvailabilitySlot, Appointment, Screening, AuthorizedStudent, ScreeningAnalytics } from '../types';
import { api } from '../api/client';
import { 
  PixelButton, 
  PixelCard, 
  PixelBadge, 
  PixelCalendar, 
  PixelClock, 
  PixelUser, 
  PixelShield, 
  PixelCheck, 
  PixelSparkle,
  PixelHeart
} from './PixelUI';
import { 
  AlertCircle, 
  Trash2, 
  Plus, 
  FileText, 
  CheckCheck, 
  Ban, 
  X, 
  Video, 
  MapPin, 
  RotateCcw, 
  Filter, 
  BarChart3, 
  Users, 
  Calendar, 
  Activity, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  Info
} from 'lucide-react';

interface CounsellorDashboardProps {
  user: AuthUser;
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
}

export const CounsellorDashboard: React.FC<CounsellorDashboardProps> = ({ 
  user, 
  activeSubTab = 'overview',
  onSubTabChange
}) => {
  const [currentTab, setCurrentTab] = useState<'overview' | 'students' | 'availability' | 'requests' | 'reports'>('overview');
  
  // Data States
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [authorizedStudents, setAuthorizedStudents] = useState<AuthorizedStudent[]>([]);
  const [analytics, setAnalytics] = useState<ScreeningAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New Slot Form State
  const [slotDate, setSlotDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [sessionMode, setSessionMode] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [meetingLink, setMeetingLink] = useState('');
  const [location, setLocation] = useState('Wellness Counselling Room 204');
  const [notes, setNotes] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filtering States for Students and Analytics
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Request tab sub-filter
  const [requestFilter, setRequestFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'COMPLETED'>('PENDING');

  // Action Loading states
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Screening Summary Modal State (Authorized clinical view)
  const [activeScreeningStudent, setActiveScreeningStudent] = useState<{ id: number; name: string } | null>(null);
  const [studentScreenings, setStudentScreenings] = useState<Screening[]>([]);
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [screeningError, setScreeningError] = useState<string | null>(null);

  // Sync with prop
  useEffect(() => {
    if (activeSubTab && ['overview', 'students', 'availability', 'requests', 'reports'].includes(activeSubTab)) {
      setCurrentTab(activeSubTab as any);
    }
  }, [activeSubTab]);

  const handleTabSwitch = (tab: 'overview' | 'students' | 'availability' | 'requests' | 'reports') => {
    setCurrentTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  useEffect(() => {
    loadAllData();
    // Default tomorrow date for slot creation
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSlotDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [slotsRes, apptRes, studRes, anaRes] = await Promise.allSettled([
        api.availability.getMySlots(),
        api.appointments.getCounsellorAppointments(),
        api.appointments.getAuthorizedStudents(),
        api.screenings.getAnalytics()
      ]);

      if (slotsRes.status === 'fulfilled') {
        setSlots(slotsRes.value.slots || []);
      }
      if (apptRes.status === 'fulfilled') {
        setAppointments(apptRes.value.appointments || []);
      }
      if (studRes.status === 'fulfilled') {
        setAuthorizedStudents(studRes.value.students || []);
      }
      if (anaRes.status === 'fulfilled') {
        setAnalytics(anaRes.value);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load counsellor dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilterDepartment('ALL');
    setFilterYear('ALL');
    setFilterSection('ALL');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // -------------------------------------------------------------
  // SLOT CREATION WITH ONLINE/OFFLINE VALIDATION
  // -------------------------------------------------------------
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setError(null);
    setSuccess(null);

    if (!slotDate || !startTime || !endTime) {
      setFormError('Please select a date, start time, and end time.');
      return;
    }

    const startDateTime = new Date(`${slotDate}T${startTime}:00`);
    const endDateTime = new Date(`${slotDate}T${endTime}:00`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      setFormError('Invalid date or time selected.');
      return;
    }

    if (endDateTime.getTime() <= startDateTime.getTime()) {
      setFormError('Slot end time must be after slot start time.');
      return;
    }

    if (startDateTime.getTime() < Date.now()) {
      setFormError('Cannot create appointment slots in the past.');
      return;
    }

    if (sessionMode === 'ONLINE') {
      if (!meetingLink || !meetingLink.trim()) {
        setFormError('Please provide a meeting URL for online sessions.');
        return;
      }
      if (!meetingLink.trim().startsWith('http://') && !meetingLink.trim().startsWith('https://')) {
        setFormError('Meeting URL must start with http:// or https://');
        return;
      }
    } else {
      if (!location || !location.trim()) {
        setFormError('Please provide a physical room/location for offline sessions.');
        return;
      }
    }

    // Client-side overlap validation
    const hasOverlap = slots.some(s => {
      const existingStart = new Date(s.slot_start).getTime();
      const existingEnd = new Date(s.slot_end).getTime();
      return startDateTime.getTime() < existingEnd && endDateTime.getTime() > existingStart;
    });

    if (hasOverlap) {
      setFormError('This time range overlaps with one of your existing published slots.');
      return;
    }

    setPublishing(true);
    try {
      const formatMySQL = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
      await api.availability.createSlot({
        slot_start: formatMySQL(startDateTime),
        slot_end: formatMySQL(endDateTime),
        session_mode: sessionMode,
        meeting_link: sessionMode === 'ONLINE' ? meetingLink.trim() : undefined,
        location: sessionMode === 'OFFLINE' ? location.trim() : undefined,
        notes: notes.trim() || undefined
      });

      setSuccess(`New ${sessionMode.toLowerCase()} availability slot created successfully.`);
      if (sessionMode === 'ONLINE') setMeetingLink('');
      setNotes('');
      loadAllData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to publish slot.');
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!window.confirm('Are you sure you want to remove this availability slot?')) return;

    setError(null);
    setSuccess(null);
    try {
      await api.availability.deleteSlot(slotId);
      setSuccess('Availability slot removed.');
      loadAllData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove slot.');
    }
  };

  // -------------------------------------------------------------
  // WORKFLOW: ACCEPT / REJECT / COMPLETE / CANCEL
  // -------------------------------------------------------------
  const handleAcceptRequest = async (apptId: number) => {
    setActionLoadingId(apptId);
    setError(null);
    setSuccess(null);
    try {
      await api.appointments.accept(apptId);
      setSuccess(`Appointment #${apptId} confirmed. Session details are now visible to the student.`);
      await loadAllData();
    } catch (err: any) {
      setError(err.message || 'Failed to accept booking request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (apptId: number) => {
    const reason = window.prompt('Optional reason for rejecting this booking request (e.g., schedule conflict, please choose another slot):');
    if (reason === null) return; // User cancelled prompt

    setActionLoadingId(apptId);
    setError(null);
    setSuccess(null);
    try {
      await api.appointments.reject(apptId, reason || 'Schedule conflict');
      setSuccess(`Booking request #${apptId} has been rejected. The calendar slot is now open for other students.`);
      await loadAllData();
    } catch (err: any) {
      setError(err.message || 'Failed to reject booking request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCompleteAppointment = async (apptId: number) => {
    setActionLoadingId(apptId);
    setError(null);
    setSuccess(null);
    try {
      await api.appointments.complete(apptId);
      setSuccess(`Appointment #${apptId} marked as completed.`);
      await loadAllData();
    } catch (err: any) {
      setError(err.message || 'Failed to complete appointment.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelAppointment = async (apptId: number) => {
    if (!window.confirm('Cancel this confirmed appointment? The calendar slot will be reopened.')) return;

    setActionLoadingId(apptId);
    setError(null);
    setSuccess(null);
    try {
      await api.appointments.cancel(apptId);
      setSuccess(`Appointment #${apptId} cancelled and slot reopened.`);
      await loadAllData();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel appointment.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Clinical screening viewer
  const handleViewScreeningSummary = async (studentId: number, studentName: string) => {
    setActiveScreeningStudent({ id: studentId, name: studentName });
    setScreeningLoading(true);
    setScreeningError(null);

    try {
      const data = await api.screenings.getCounsellorView(studentId);
      setStudentScreenings(data.screenings || []);
    } catch (err: any) {
      setScreeningError(err.message || 'Unable to access screening summary.');
    } finally {
      setScreeningLoading(false);
    }
  };

  // -------------------------------------------------------------
  // COMPUTED METRICS
  // -------------------------------------------------------------
  const pendingRequests = appointments.filter(a => a.workflow_status === 'PENDING');
  const confirmedAppointments = appointments.filter(a => a.workflow_status === 'CONFIRMED' || (a.booking_status === 'BOOKED' && !a.workflow_status));
  const completedAppointments = appointments.filter(a => a.workflow_status === 'COMPLETED' || a.booking_status === 'COMPLETED');
  const rejectedAppointments = appointments.filter(a => a.workflow_status === 'REJECTED');
  
  const now = new Date();
  const upcomingSessions = confirmedAppointments.filter(a => {
    if (!a.slot_start) return false;
    return new Date(a.slot_start) >= now;
  });

  // Filtered requests list
  const filteredAppointments = appointments.filter(a => {
    const status = a.workflow_status || (a.booking_status === 'BOOKED' ? 'CONFIRMED' : a.booking_status);
    if (requestFilter !== 'ALL' && status !== requestFilter) {
      return false;
    }
    return true;
  });

  // Filtered students
  const filteredStudents = authorizedStudents.filter(s => {
    if (filterDepartment !== 'ALL' && s.department && s.department !== filterDepartment) return false;
    if (filterYear !== 'ALL' && s.academic_year && s.academic_year !== filterYear) return false;
    if (filterSection !== 'ALL' && s.section && s.section !== filterSection) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Counsellor Profile Header */}
      <PixelCard
        variant="white"
        shadow="md"
        border="dark"
        accentBorderTop="lavender"
        className="mb-6 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <PixelBadge variant="lavender" size="sm" icon={<PixelShield size={10} className="text-[#543E82]" />}>
              PRACTITIONER PORTAL
            </PixelBadge>
            <span className="text-[11px] font-mono text-[#7E7491]">
              LICENSED COUNSELLOR #{user.id}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#231E2C]">
            {user.name}
          </h1>
          <p className="text-xs text-[#534B62] font-mono">
            {user.email} {user.specialization && `· Specialization: ${user.specialization}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user.is_active === 1 ? (
            <PixelBadge variant="mint" size="md" icon={<PixelCheck size={12} className="text-[#1D5E40]" />}>
              Active Clinical Practising Privileges
            </PixelBadge>
          ) : (
            <PixelBadge variant="amber" size="md">
              Pending Admin Verification
            </PixelBadge>
          )}
        </div>
      </PixelCard>

      {/* Notifications */}
      {error && (
        <div className="mb-6 p-4 bg-[#FDE8E8] border-2 border-[#2B2438] text-xs text-[#9B1C1C] flex items-center gap-2 shadow-[2px_2px_0px_#2B2438]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-[#E0F4EA] border-2 border-[#2B2438] text-xs text-[#1D5E40] flex items-center gap-2 shadow-[2px_2px_0px_#2B2438]">
          <PixelCheck size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Primary Tab Navigation */}
      <div className="flex items-center gap-2 border-b-2 border-[#2B2438] pb-3 mb-6 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => handleTabSwitch('overview')}
          className={`px-3 py-2 border-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'overview'
              ? 'border-[#2B2438] bg-[#EFEAF8] text-[#2C1F48] shadow-[2px_2px_0px_#2B2438]'
              : 'border-transparent hover:border-[#D6CCE8] text-[#534B62]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Dashboard Overview</span>
        </button>

        <button
          onClick={() => handleTabSwitch('requests')}
          className={`px-3 py-2 border-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'requests'
              ? 'border-[#2B2438] bg-[#DDD4F0] text-[#2C1F48] shadow-[2px_2px_0px_#2B2438]'
              : 'border-transparent hover:border-[#D6CCE8] text-[#534B62]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Booking Requests</span>
          {pendingRequests.length > 0 && (
            <span className="w-4 h-4 bg-[#9B1C1C] text-white rounded-full text-[10px] flex items-center justify-center font-mono">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabSwitch('availability')}
          className={`px-3 py-2 border-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'availability'
              ? 'border-[#2B2438] bg-[#E0F4EA] text-[#0F3523] shadow-[2px_2px_0px_#2B2438]'
              : 'border-transparent hover:border-[#D6CCE8] text-[#534B62]'
          }`}
        >
          <PixelClock size={14} />
          <span>Availability Slots</span>
        </button>

        <button
          onClick={() => handleTabSwitch('students')}
          className={`px-3 py-2 border-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'students'
              ? 'border-[#2B2438] bg-[#EFEAF8] text-[#2C1F48] shadow-[2px_2px_0px_#2B2438]'
              : 'border-transparent hover:border-[#D6CCE8] text-[#534B62]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Authorized Students</span>
        </button>

        <button
          onClick={() => handleTabSwitch('reports')}
          className={`px-3 py-2 border-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'reports'
              ? 'border-[#2B2438] bg-[#E0F4EA] text-[#0F3523] shadow-[2px_2px_0px_#2B2438]'
              : 'border-transparent hover:border-[#D6CCE8] text-[#534B62]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analytics & Reports</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {currentTab === 'overview' && (
        <div className="space-y-6">
          {/* Section 3.A Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <PixelCard variant="lavender" shadow="sm" border="dark" className="p-4 space-y-1">
              <span className="text-[10px] font-mono text-[#543E82] uppercase tracking-wider block">
                Upcoming Sessions
              </span>
              <div className="text-2xl font-black text-[#231E2C] font-mono">
                {upcomingSessions.length}
              </div>
              <p className="text-[10px] text-[#534B62]">Scheduled sessions</p>
            </PixelCard>

            <PixelCard variant="cream" shadow="sm" border="dark" className="p-4 space-y-1">
              <span className="text-[10px] font-mono text-[#7E7491] uppercase tracking-wider block">
                Pending Requests
              </span>
              <div className="text-2xl font-black text-[#231E2C] font-mono">
                {pendingRequests.length}
              </div>
              <p className="text-[10px] text-[#534B62]">Awaiting your decision</p>
            </PixelCard>

            <PixelCard variant="mint" shadow="sm" border="dark" className="p-4 space-y-1">
              <span className="text-[10px] font-mono text-[#1D5E40] uppercase tracking-wider block">
                Confirmed Total
              </span>
              <div className="text-2xl font-black text-[#231E2C] font-mono">
                {confirmedAppointments.length}
              </div>
              <p className="text-[10px] text-[#534B62]">Active bookings</p>
            </PixelCard>

            <PixelCard variant="white" shadow="sm" border="dark" className="p-4 space-y-1">
              <span className="text-[10px] font-mono text-[#7E7491] uppercase tracking-wider block">
                Completed
              </span>
              <div className="text-2xl font-black text-[#231E2C] font-mono">
                {completedAppointments.length}
              </div>
              <p className="text-[10px] text-[#534B62]">Past consultations</p>
            </PixelCard>

            <PixelCard variant="lavender" shadow="sm" border="dark" className="p-4 space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-mono text-[#543E82] uppercase tracking-wider block">
                Authorized Students
              </span>
              <div className="text-2xl font-black text-[#231E2C] font-mono">
                {authorizedStudents.length}
              </div>
              <p className="text-[10px] text-[#534B62]">Assigned student caseload</p>
            </PixelCard>
          </div>

          {/* Quick Actions & Recent Needs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#231E2C] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-[#7E65B7]" />
                  <span>Pending Booking Requests Requiring Action</span>
                </h3>
                <button
                  onClick={() => handleTabSwitch('requests')}
                  className="text-xs font-mono text-[#7E65B7] hover:underline"
                >
                  View All ({pendingRequests.length})
                </button>
              </div>

              {pendingRequests.length === 0 ? (
                <PixelCard variant="cream" shadow="sm" border="soft" className="p-6 text-center text-xs text-[#534B62] space-y-2">
                  <PixelCheck size={18} className="mx-auto text-[#1D5E40]" />
                  <p className="font-bold text-[#231E2C]">All student booking requests are up to date!</p>
                  <p>When students select one of your open slots, their request will appear here for your approval.</p>
                </PixelCard>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.slice(0, 3).map(req => (
                    <PixelCard key={req.appointment_id} variant="white" shadow="sm" border="dark" className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-xs text-[#231E2C]">{req.student_name}</div>
                          <div className="text-[11px] font-mono text-[#7E7491]">
                            {req.slot_start ? new Date(req.slot_start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
                            {' · '}
                            {req.slot_start ? new Date(req.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <PixelButton
                            variant="primary"
                            size="sm"
                            disabled={actionLoadingId === req.appointment_id}
                            onClick={() => handleAcceptRequest(req.appointment_id)}
                          >
                            Accept
                          </PixelButton>
                          <PixelButton
                            variant="danger"
                            size="sm"
                            disabled={actionLoadingId === req.appointment_id}
                            onClick={() => handleRejectRequest(req.appointment_id)}
                          >
                            Reject
                          </PixelButton>
                        </div>
                      </div>
                      {req.reason && (
                        <p className="text-[11px] text-[#534B62] bg-[#FAF8F5] p-2 border border-[#2B2438]">
                          "{req.reason}"
                        </p>
                      )}
                    </PixelCard>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-4">
              <h3 className="text-sm font-bold text-[#231E2C] flex items-center gap-1.5">
                <PixelCalendar size={16} className="text-[#389E6E]" />
                <span>Next Upcoming Consultations</span>
              </h3>

              {upcomingSessions.length === 0 ? (
                <PixelCard variant="white" shadow="sm" border="soft" className="p-6 text-center text-xs text-[#534B62]">
                  No upcoming confirmed appointments. Open new availability slots in the calendar to allow bookings.
                </PixelCard>
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.slice(0, 3).map(s => (
                    <PixelCard key={s.appointment_id} variant="white" shadow="sm" border="dark" accentBorderTop="mint" className="p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#231E2C]">{s.student_name}</span>
                        <PixelBadge variant={s.session_mode === 'ONLINE' ? 'lavender' : 'mint'} size="sm">
                          {s.session_mode || 'OFFLINE'}
                        </PixelBadge>
                      </div>
                      <div className="text-[11px] font-mono text-[#534B62]">
                        {s.slot_start ? new Date(s.slot_start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                      {s.session_mode === 'ONLINE' && s.meeting_link && (
                        <a
                          href={s.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-[#543E82] font-mono hover:underline"
                        >
                          <Video className="w-3 h-3" />
                          <span>Launch Video Consultation Room</span>
                        </a>
                      )}
                      {s.session_mode === 'OFFLINE' && s.location && (
                        <div className="text-[11px] text-[#1D5E40] flex items-center gap-1 font-mono">
                          <MapPin className="w-3 h-3" />
                          <span>{s.location}</span>
                        </div>
                      )}
                    </PixelCard>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BOOKING REQUESTS WORKFLOW (ACCEPT / REJECT) */}
      {/* ========================================================================= */}
      {currentTab === 'requests' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#231E2C]">Student Booking Requests & Workflow</h2>
              <p className="text-xs text-[#534B62]">
                Review student appointment requests. Acceptance locks and confirms the session; rejection reopens the slot to other students.
              </p>
            </div>

            {/* Sub Filter */}
            <div className="flex items-center gap-1 text-xs">
              {(['ALL', 'PENDING', 'CONFIRMED', 'REJECTED', 'COMPLETED'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setRequestFilter(tab)}
                  className={`px-2.5 py-1 text-[11px] font-bold border-2 transition-all ${
                    requestFilter === tab
                      ? 'border-[#2B2438] bg-[#2B2438] text-white shadow-[1px_1px_0px_#2B2438]'
                      : 'border-[#2B2438] bg-white text-[#534B62] hover:bg-[#FAF8F5]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {filteredAppointments.length === 0 ? (
            <PixelCard variant="cream" shadow="sm" border="dark" className="p-12 text-center space-y-2">
              <Calendar className="w-8 h-8 mx-auto text-[#7E7491]" />
              <p className="text-sm font-bold text-[#231E2C]">No requests match the '{requestFilter}' filter</p>
              <p className="text-xs text-[#534B62]">
                Student booking submissions will automatically appear here for your review and authorization.
              </p>
            </PixelCard>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map(appt => {
                const status = appt.workflow_status || (appt.booking_status === 'BOOKED' ? 'CONFIRMED' : appt.booking_status);
                const isPending = status === 'PENDING';
                const isConfirmed = status === 'CONFIRMED';
                const isCompleted = status === 'COMPLETED';

                return (
                  <PixelCard
                    key={appt.appointment_id}
                    variant="white"
                    shadow="sm"
                    border="dark"
                    accentBorderTop={isConfirmed ? 'mint' : 'lavender'}
                    className="p-5 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-[#7E7491]">Request #{appt.appointment_id}</span>
                          <PixelBadge
                            variant={isPending ? 'amber' : isConfirmed ? 'mint' : status === 'REJECTED' ? 'red' : 'lavender'}
                            size="sm"
                            pixelFont
                          >
                            {status}
                          </PixelBadge>
                          <PixelBadge variant={appt.session_mode === 'ONLINE' ? 'lavender' : 'cream'} size="sm">
                            {appt.session_mode || 'OFFLINE'}
                          </PixelBadge>
                        </div>
                        <h3 className="text-sm font-bold text-[#231E2C] mt-1 flex items-center gap-1.5">
                          <PixelUser size={14} className="text-[#7E65B7]" />
                          <span>{appt.student_name}</span>
                          <span className="text-xs font-mono text-[#7E7491]">({appt.student_email})</span>
                        </h3>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <>
                            <PixelButton
                              variant="primary"
                              size="sm"
                              disabled={actionLoadingId === appt.appointment_id}
                              onClick={() => handleAcceptRequest(appt.appointment_id)}
                              icon={<CheckCheck className="w-3.5 h-3.5" />}
                            >
                              Accept & Confirm
                            </PixelButton>
                            <PixelButton
                              variant="danger"
                              size="sm"
                              disabled={actionLoadingId === appt.appointment_id}
                              onClick={() => handleRejectRequest(appt.appointment_id)}
                              icon={<XCircle className="w-3.5 h-3.5" />}
                            >
                              Reject Request
                            </PixelButton>
                          </>
                        )}

                        {isConfirmed && (
                          <>
                            <PixelButton
                              variant="primary"
                              size="sm"
                              disabled={actionLoadingId === appt.appointment_id}
                              onClick={() => handleCompleteAppointment(appt.appointment_id)}
                              icon={<CheckCheck className="w-3.5 h-3.5" />}
                            >
                              Mark Completed
                            </PixelButton>
                            <PixelButton
                              variant="outline"
                              size="sm"
                              disabled={actionLoadingId === appt.appointment_id}
                              onClick={() => handleCancelAppointment(appt.appointment_id)}
                            >
                              Cancel Session
                            </PixelButton>
                          </>
                        )}

                        <PixelButton
                          variant="secondary"
                          size="sm"
                          onClick={() => handleViewScreeningSummary(appt.student_id, appt.student_name || 'Student')}
                          icon={<FileText className="w-3.5 h-3.5" />}
                        >
                          Screening Data
                        </PixelButton>
                      </div>
                    </div>

                    {/* Time & Session details */}
                    <div className="pt-2 border-t-2 border-[#F4EFEA] grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#534B62]">
                      <div className="flex items-center gap-2">
                        <PixelCalendar size={14} className="text-[#7E65B7]" />
                        <span>
                          {appt.slot_start ? new Date(appt.slot_start).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          }) : '--'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PixelClock size={14} className="text-[#7E65B7]" />
                        <span className="font-mono">
                          {appt.slot_start ? new Date(appt.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          {' — '}
                          {appt.slot_end ? new Date(appt.slot_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div>
                        {appt.session_mode === 'ONLINE' ? (
                          <div className="flex items-center gap-1.5 text-[#543E82] font-mono">
                            <Video className="w-3.5 h-3.5" />
                            <span>{appt.meeting_link ? 'Secure Link Generated' : 'Online Session'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[#1D5E40] font-mono">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{appt.location || 'On-Campus Room'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {appt.reason && (
                      <div className="p-2.5 bg-[#FAF8F5] border border-[#2B2438] text-xs text-[#231E2C]">
                        <span className="font-bold text-[10px] uppercase font-mono text-[#7E7491] block mb-0.5">
                          Student Consultation Request Note:
                        </span>
                        {appt.reason}
                      </div>
                    )}
                  </PixelCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AVAILABILITY & SLOT CREATION */}
      {/* ========================================================================= */}
      {currentTab === 'availability' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Slot Creation Form */}
          <div className="lg:col-span-5 space-y-6">
            <PixelCard
              variant="white"
              shadow="md"
              border="dark"
              className="p-6 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#7E65B7]" />
                <h2 className="text-sm sm:text-base font-bold text-[#231E2C]">
                  Create Availability Slot
                </h2>
              </div>
              <p className="text-xs text-[#534B62] leading-relaxed">
                Publish a student booking slot with validated session mode (Online with conferencing URL or Offline with physical room). Overlapping time ranges are rejected automatically.
              </p>

              <form onSubmit={handleCreateSlot} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-xs font-bold text-[#231E2C] mb-1">
                    Slot Date
                  </label>
                  <input
                    type="date"
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                    className="w-full text-xs p-2 bg-[#FAF8F5] text-[#231E2C] border-2 border-[#2B2438] rounded-none focus:outline-none focus:border-[#7E65B7] focus:bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#231E2C] mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full text-xs p-2 bg-[#FAF8F5] text-[#231E2C] border-2 border-[#2B2438] rounded-none focus:outline-none focus:border-[#7E65B7] focus:bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#231E2C] mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full text-xs p-2 bg-[#FAF8F5] text-[#231E2C] border-2 border-[#2B2438] rounded-none focus:outline-none focus:border-[#7E65B7] focus:bg-white"
                      required
                    />
                  </div>
                </div>

                {/* Session Mode Selector */}
                <div>
                  <label className="block text-xs font-bold text-[#231E2C] mb-1.5">
                    Consultation Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSessionMode('ONLINE')}
                      className={`p-2 border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        sessionMode === 'ONLINE'
                          ? 'border-[#2B2438] bg-[#DDD4F0] text-[#2C1F48] shadow-[2px_2px_0px_#2B2438]'
                          : 'border-[#2B2438] bg-white text-[#534B62]'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Online Video</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSessionMode('OFFLINE')}
                      className={`p-2 border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        sessionMode === 'OFFLINE'
                          ? 'border-[#2B2438] bg-[#E0F4EA] text-[#0F3523] shadow-[2px_2px_0px_#2B2438]'
                          : 'border-[#2B2438] bg-white text-[#534B62]'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Offline (Room)</span>
                    </button>
                  </div>
                </div>

                {/* Conditional Fields based on Mode */}
                {sessionMode === 'ONLINE' ? (
                  <div>
                    <label className="block text-xs font-bold text-[#231E2C] mb-1">
                      Meeting Link / Video Conferencing URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://meet.google.com/abc-defg-hij"
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      className="w-full text-xs p-2 bg-[#FAF8F5] text-[#231E2C] border-2 border-[#2B2438] rounded-none focus:outline-none focus:border-[#7E65B7] focus:bg-white"
                      required
                    />
                    <p className="text-[10px] text-[#7E7491] mt-1 font-mono">
                      * Privacy Gate: Link is concealed until you confirm the student's booking request.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-[#231E2C] mb-1">
                      Room / Campus Location
                    </label>
                    <input
                      type="text"
                      placeholder="Wellness Centre Room 204"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full text-xs p-2 bg-[#FAF8F5] text-[#231E2C] border-2 border-[#2B2438] rounded-none focus:outline-none focus:border-[#7E65B7] focus:bg-white"
                      required
                    />
                    <p className="text-[10px] text-[#7E7491] mt-1 font-mono">
                      * Visible to student once booking request is accepted.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#231E2C] mb-1">
                    Optional Notes or Preparation Instructions
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Please bring any academic schedules"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs p-2 bg-[#FAF8F5] text-[#231E2C] border-2 border-[#2B2438] rounded-none focus:outline-none focus:border-[#7E65B7] focus:bg-white"
                  />
                </div>

                {formError && (
                  <div className="p-2.5 bg-[#FDE8E8] border-2 border-[#2B2438] text-xs text-[#9B1C1C]">
                    {formError}
                  </div>
                )}

                <PixelButton
                  type="submit"
                  variant="lavenderDark"
                  size="md"
                  fullWidth
                  disabled={publishing}
                >
                  {publishing ? 'Publishing Slot...' : 'Publish Slot to Calendar'}
                </PixelButton>
              </form>
            </PixelCard>
          </div>

          {/* Right: Existing Published Slots */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7E7491] font-mono">
                Your Published Slots ({slots.length})
              </h3>
            </div>

            {slots.length === 0 ? (
              <PixelCard variant="cream" shadow="sm" border="dark" className="p-8 text-center text-xs text-[#534B62]">
                No slots published yet. Add a calendar slot using the form on the left.
              </PixelCard>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {slots.map(s => {
                  const start = new Date(s.slot_start);
                  const end = new Date(s.slot_end);
                  return (
                    <PixelCard
                      key={s.availability_id}
                      variant="white"
                      shadow="sm"
                      border="dark"
                      className="p-3.5 flex items-center justify-between text-xs gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#231E2C]">
                            {start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <PixelBadge variant={s.session_mode === 'ONLINE' ? 'lavender' : 'mint'} size="sm">
                            {s.session_mode || 'OFFLINE'}
                          </PixelBadge>
                        </div>
                        <div className="text-[#534B62] font-mono text-[11px]">
                          {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {s.location && ` · Room: ${s.location}`}
                        </div>
                        {s.notes && (
                          <div className="text-[10px] text-[#7E7491] font-mono italic">
                            Notes: {s.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {s.is_booked ? (
                          <PixelBadge variant="amber" size="sm" pixelFont>
                            BOOKED
                          </PixelBadge>
                        ) : (
                          <>
                            <PixelBadge variant="mint" size="sm" pixelFont>
                              OPEN
                            </PixelBadge>
                            <button
                              onClick={() => handleDeleteSlot(s.availability_id)}
                              className="text-[#7E7491] hover:text-[#9B1C1C] transition-colors p-1"
                              title="Delete unbooked slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </PixelCard>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AUTHORIZED STUDENTS & FILTERS */}
      {/* ========================================================================= */}
      {currentTab === 'students' && (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-base font-bold text-[#231E2C]">Authorized Student Caseload & Records</h2>
            <p className="text-xs text-[#534B62]">
              Strictly limited to students who have consultation appointments with you. Mental health screening context is protected by role-based clinical privacy.
            </p>
          </div>

          {/* Section 3.C Filters */}
          <PixelCard variant="white" shadow="sm" border="dark" className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[#231E2C]">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#7E65B7]" />
                <span>Caseload Filters</span>
              </div>
              <PixelButton
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                icon={<RotateCcw className="w-3 h-3" />}
              >
                Reset Filters
              </PixelButton>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#534B62] mb-1 font-mono">
                  Department
                </label>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full text-xs p-1.5 bg-[#FAF8F5] border-2 border-[#2B2438] rounded-none focus:outline-none"
                >
                  <option value="ALL">All Departments</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Comm">Electronics & Comm</option>
                  <option value="Mechanical Eng">Mechanical Eng</option>
                  <option value="Management Studies">Management Studies</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#534B62] mb-1 font-mono">
                  Academic Year
                </label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full text-xs p-1.5 bg-[#FAF8F5] border-2 border-[#2B2438] rounded-none focus:outline-none"
                >
                  <option value="ALL">All Years</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#534B62] mb-1 font-mono">
                  Section
                </label>
                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  className="w-full text-xs p-1.5 bg-[#FAF8F5] border-2 border-[#2B2438] rounded-none focus:outline-none"
                >
                  <option value="ALL">All Sections</option>
                  <option value="Section A">Section A</option>
                  <option value="Section B">Section B</option>
                  <option value="Section C">Section C</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#534B62] mb-1 font-mono">
                  From Date
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full text-xs p-1.5 bg-[#FAF8F5] border-2 border-[#2B2438] rounded-none focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#534B62] mb-1 font-mono">
                  To Date
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full text-xs p-1.5 bg-[#FAF8F5] border-2 border-[#2B2438] rounded-none focus:outline-none"
                />
              </div>
            </div>

            {/* Transparent Schema Notice */}
            <div className="flex items-start gap-2 p-2.5 bg-[#FAF8F5] border border-[#2B2438] text-[11px] text-[#534B62]">
              <Info className="w-3.5 h-3.5 shrink-0 text-[#7E65B7] mt-0.5" />
              <span>
                <strong>Database Schema Transparency:</strong> The live MySQL <code>students</code> table currently stores <code>student_id, full_name, email, created_at</code>. Department, Year, and Section filters are active and ready; to populate these values in live records, administrators can apply the recommended safe schema update.
              </span>
            </div>
          </PixelCard>

          {/* Student List */}
          {filteredStudents.length === 0 ? (
            <PixelCard variant="cream" shadow="sm" border="dark" className="p-8 text-center text-xs text-[#534B62]">
              No authorized students found matching your criteria.
            </PixelCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStudents.map(student => (
                <PixelCard
                  key={student.student_id}
                  variant="white"
                  shadow="sm"
                  border="dark"
                  accentBorderTop="mint"
                  className="p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-[#7E7491] font-mono">
                        <span>STUDENT ID #{student.student_id}</span>
                        <span>·</span>
                        <span>{student.total_sessions} Session(s)</span>
                      </div>
                      <h3 className="text-sm font-bold text-[#231E2C] mt-0.5">
                        {student.full_name}
                      </h3>
                      <p className="text-xs text-[#534B62] font-mono">{student.email}</p>
                    </div>

                    <PixelButton
                      variant="secondary"
                      size="sm"
                      onClick={() => handleViewScreeningSummary(student.student_id, student.full_name)}
                      icon={<FileText className="w-3.5 h-3.5" />}
                    >
                      Screening Summary
                    </PixelButton>
                  </div>

                  <div className="pt-2 border-t border-[#F4EFEA] flex items-center justify-between text-[11px] text-[#7E7491] font-mono">
                    <span>Enrolled: {new Date(student.created_at).toLocaleDateString()}</span>
                    <span>Caseload: Verified</span>
                  </div>
                </PixelCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ANALYTICS & REPORTS */}
      {/* ========================================================================= */}
      {currentTab === 'reports' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#231E2C]">Clinical Analytics & Screening Reports</h2>
            <p className="text-xs text-[#534B62]">
              Real database aggregations across completed student wellness screenings. All metrics are calculated from authentic records in the live MySQL system.
            </p>
          </div>

          {analytics ? (
            <div className="space-y-6">
              {/* Aggregate Completion Statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <PixelCard variant="lavender" shadow="sm" border="dark" className="p-4 space-y-1">
                  <span className="text-[10px] font-mono text-[#543E82] uppercase tracking-wider block">
                    Total Screenings
                  </span>
                  <div className="text-2xl font-black text-[#231E2C] font-mono">
                    {analytics.total_screenings}
                  </div>
                  <p className="text-[10px] text-[#534B62]">Completed assessments</p>
                </PixelCard>

                <PixelCard variant="mint" shadow="sm" border="dark" className="p-4 space-y-1">
                  <span className="text-[10px] font-mono text-[#1D5E40] uppercase tracking-wider block">
                    Unique Students
                  </span>
                  <div className="text-2xl font-black text-[#231E2C] font-mono">
                    {analytics.unique_students_screened}
                  </div>
                  <p className="text-[10px] text-[#534B62]">Individual participants</p>
                </PixelCard>

                <PixelCard variant="cream" shadow="sm" border="dark" className="p-4 space-y-1">
                  <span className="text-[10px] font-mono text-[#7E7491] uppercase tracking-wider block">
                    Average Distress Score
                  </span>
                  <div className="text-2xl font-black text-[#231E2C] font-mono">
                    {analytics.average_score.toFixed(1)} / 30.0
                  </div>
                  <p className="text-[10px] text-[#534B62]">Mean across all screenings</p>
                </PixelCard>

                <PixelCard variant="white" shadow="sm" border="dark" className="p-4 space-y-1">
                  <span className="text-[10px] font-mono text-[#7E7491] uppercase tracking-wider block">
                    Follow-Up Recommended
                  </span>
                  <div className="text-2xl font-black text-[#9B1C1C] font-mono">
                    {analytics.distribution.severe.count}
                  </div>
                  <p className="text-[10px] text-[#534B62]">Priority consultations</p>
                </PixelCard>
              </div>

              {/* Charts & Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Distress / Mood Distribution */}
                <PixelCard variant="white" shadow="md" border="dark" className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#231E2C] flex items-center gap-1.5">
                      <PixelHeart size={14} className="text-[#7E65B7]" />
                      <span>Distress Category Distribution</span>
                    </h3>
                    <span className="text-[11px] font-mono text-[#7E7491]">
                      Sample Size: {analytics.total_screenings}
                    </span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {/* Mild */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#1D5E40]">Mild Range (0 - 9 pts)</span>
                        <span className="font-mono">{analytics.distribution.mild.count} screenings</span>
                      </div>
                      <div className="h-4 bg-[#FAF8F5] border border-[#2B2438] overflow-hidden">
                        <div
                          className="h-full bg-[#E0F4EA] border-r border-[#2B2438]"
                          style={{
                            width: `${analytics.total_screenings > 0 ? (analytics.distribution.mild.count / analytics.total_screenings) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* Moderate */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#8A5300]">Moderate Range (10 - 19 pts)</span>
                        <span className="font-mono">{analytics.distribution.moderate.count} screenings</span>
                      </div>
                      <div className="h-4 bg-[#FAF8F5] border border-[#2B2438] overflow-hidden">
                        <div
                          className="h-full bg-[#FCE8D5] border-r border-[#2B2438]"
                          style={{
                            width: `${analytics.total_screenings > 0 ? (analytics.distribution.moderate.count / analytics.total_screenings) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* Severe */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#9B1C1C]">Elevated Range (20 - 30 pts)</span>
                        <span className="font-mono">{analytics.distribution.severe.count} screenings</span>
                      </div>
                      <div className="h-4 bg-[#FAF8F5] border border-[#2B2438] overflow-hidden">
                        <div
                          className="h-full bg-[#FDE8E8] border-r border-[#2B2438]"
                          style={{
                            width: `${analytics.total_screenings > 0 ? (analytics.distribution.severe.count / analytics.total_screenings) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </PixelCard>

                {/* Appointment Status Breakdown */}
                <PixelCard variant="white" shadow="md" border="dark" className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#231E2C] flex items-center gap-1.5">
                      <PixelCalendar size={14} className="text-[#389E6E]" />
                      <span>Appointment Status Breakdown</span>
                    </h3>
                    <span className="text-[11px] font-mono text-[#7E7491]">
                      Total: {appointments.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-2 text-xs">
                    <div className="flex items-center justify-between p-2 bg-[#FAF8F5] border border-[#2B2438]">
                      <span className="font-bold text-[#231E2C]">Pending Review Requests</span>
                      <PixelBadge variant="amber" size="sm" pixelFont>{pendingRequests.length}</PixelBadge>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-[#FAF8F5] border border-[#2B2438]">
                      <span className="font-bold text-[#231E2C]">Confirmed & Active Appointments</span>
                      <PixelBadge variant="mint" size="sm" pixelFont>{confirmedAppointments.length}</PixelBadge>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-[#FAF8F5] border border-[#2B2438]">
                      <span className="font-bold text-[#231E2C]">Completed Consultations</span>
                      <PixelBadge variant="lavender" size="sm" pixelFont>{completedAppointments.length}</PixelBadge>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-[#FAF8F5] border border-[#2B2438]">
                      <span className="font-bold text-[#231E2C]">Rejected Booking Requests</span>
                      <PixelBadge variant="red" size="sm" pixelFont>{rejectedAppointments.length}</PixelBadge>
                    </div>
                  </div>
                </PixelCard>
              </div>

              {/* Aggregate Screening Volume Timeline */}
              {analytics.timeline && analytics.timeline.length > 0 && (
                <PixelCard variant="white" shadow="md" border="dark" className="p-5 space-y-3">
                  <h3 className="text-sm font-bold text-[#231E2C] flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-[#7E65B7]" />
                    <span>Monthly Screening Volume & Average Distress Trends</span>
                  </h3>
                  <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {analytics.timeline.map((point, idx) => (
                      <div key={idx} className="p-2.5 bg-[#FAF8F5] border border-[#2B2438] text-center space-y-1">
                        <div className="text-[10px] font-mono text-[#7E7491]">{point.period}</div>
                        <div className="text-lg font-black text-[#231E2C] font-mono">{point.count}</div>
                        <div className="text-[10px] font-mono text-[#7E65B7]">Avg: {point.avg_score.toFixed(1)}</div>
                      </div>
                    ))}
                  </div>
                </PixelCard>
              )}
            </div>
          ) : (
            <PixelCard variant="cream" shadow="sm" border="dark" className="p-8 text-center text-xs text-[#534B62]">
              Loading analytics and reports from live database...
            </PixelCard>
          )}
        </div>
      )}

      {/* Authorized Student Screening Summary Modal */}
      {activeScreeningStudent && (
        <div className="fixed inset-0 z-50 bg-[#231E2C]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <PixelCard
            variant="white"
            shadow="lg"
            border="dark"
            className="max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b-2 border-[#2B2438] pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#231E2C]">
                  Clinical Context: {activeScreeningStudent.name}
                </h3>
                <span className="text-[10px] font-mono text-[#7E65B7] uppercase">
                  Authorized Practitioner View
                </span>
              </div>
              <button
                onClick={() => setActiveScreeningStudent(null)}
                className="w-6 h-6 border-2 border-[#2B2438] bg-[#FAF8F5] text-xs font-bold hover:bg-[#FDE8E8] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {screeningLoading ? (
              <div className="py-8 text-center text-xs text-[#534B62]">
                Retrieving student screening records...
              </div>
            ) : screeningError ? (
              <div className="p-3 bg-[#FDE8E8] border-2 border-[#2B2438] text-xs text-[#9B1C1C]">
                {screeningError}
              </div>
            ) : studentScreenings.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#534B62]">
                This student has not submitted any screening assessments yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {studentScreenings.map(s => (
                  <PixelCard
                    key={s.screening_id}
                    variant="cream"
                    shadow="none"
                    border="soft"
                    className="p-3 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between text-[#7E7491]">
                      <span className="font-mono">{new Date(s.submitted_at).toLocaleDateString()}</span>
                      <span className="font-mono font-bold text-[#231E2C]">
                        Distress Score: {s.overall_score !== null ? Number(s.overall_score).toFixed(1) : '--'}
                      </span>
                    </div>
                    <div className="font-bold text-[#231E2C]">
                      {s.screening_summary || 'Standard Self-Screening'}
                    </div>
                  </PixelCard>
                ))}
              </div>
            )}

            <div className="pt-2 border-t-2 border-[#E8E0D5] text-right">
              <PixelButton
                variant="outline"
                size="sm"
                onClick={() => setActiveScreeningStudent(null)}
              >
                Close Summary
              </PixelButton>
            </div>
          </PixelCard>
        </div>
      )}
    </div>
  );
};
