import React, { useState, useEffect } from 'react';
import { AuthUser, AvailabilitySlot } from '../types';
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
  PixelTextarea,
  PixelInput
} from './PixelUI';
import { AlertCircle, Search, Filter, X } from 'lucide-react';

interface BookingViewProps {
  user: AuthUser | null;
  onOpenAuth: (tab: 'student-login' | 'counsellor-login') => void;
  onNavigateToStudentDash: () => void;
}

export const BookingView: React.FC<BookingViewProps> = ({ user, onOpenAuth, onNavigateToStudentDash }) => {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchSpec, setSearchSpec] = useState('');
  
  // Booking Modal State
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [reason, setReason] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSlots();
  }, [searchSpec]);

  const loadSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.availability.getPublicSlots({
        specialization: searchSpec.trim() || undefined
      });
      setSlots(data.slots || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load counsellor availability slots.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBooking = (slot: AvailabilitySlot) => {
    if (!user) {
      onOpenAuth('student-login');
      return;
    }
    if (user.role !== 'STUDENT') {
      alert('Only registered students can book counselling appointments. Please log into a student account.');
      return;
    }
    setSelectedSlot(slot);
    setReason('');
    setBookingError(null);
    setBookingSuccess(null);
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setBookingLoading(true);
    setBookingError(null);

    try {
      await api.appointments.book({
        availability_id: selectedSlot.availability_id,
        reason: reason.trim() || undefined
      });

      setBookingSuccess('Your counselling appointment has been successfully scheduled!');
      // Refresh available slots
      loadSlots();
      setTimeout(() => {
        setSelectedSlot(null);
        onNavigateToStudentDash();
      }, 1500);
    } catch (err: any) {
      // Handles atomic race condition from unique index constraint
      setBookingError(err.message || 'Unable to book slot. It may have already been reserved.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <PixelBadge variant="mint" size="sm" icon={<PixelCalendar size={10} className="text-[#1D5E40]" />}>
            COORDINATION
          </PixelBadge>
          <PixelBadge variant="lavender" size="sm" icon={<PixelShield size={10} className="text-[#543E82]" />}>
            VERIFIED PRACTITIONERS
          </PixelBadge>
          <PixelBadge variant="cream" size="sm">
            ATOMIC CONCURRENCY
          </PixelBadge>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#231E2C]">
          Available Counselling Sessions
        </h1>
        <p className="text-xs sm:text-sm text-[#534B62] max-w-3xl leading-relaxed">
          Select an available consultation time slot published by verified campus mental health professionals. All bookings are confidential and protected by atomic database locking.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <PixelCard
        variant="white"
        shadow="md"
        border="dark"
        className="mb-8 p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#7E7491] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by specialization (e.g. Anxiety, CBT)..."
            value={searchSpec}
            onChange={(e) => setSearchSpec(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF8F5] text-[#231E2C] border-2 border-[#2B2438] rounded-none focus:outline-none focus:border-[#7E65B7] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-[#534B62] w-full sm:w-auto justify-end">
          <span className="font-mono bg-[#FAF8F5] border border-[#2B2438] px-2.5 py-1 text-[11px] font-semibold">
            {slots.length} available {slots.length === 1 ? 'slot' : 'slots'}
          </span>
          {searchSpec && (
            <PixelButton
              variant="outline"
              size="sm"
              onClick={() => setSearchSpec('')}
              icon={<X className="w-3 h-3" />}
            >
              Clear Filter
            </PixelButton>
          )}
        </div>
      </PixelCard>

      {/* Slots List */}
      {loading ? (
        <PixelCard variant="cream" shadow="sm" border="dark" className="py-16 text-center text-[#534B62] text-xs">
          Loading counsellor availability...
        </PixelCard>
      ) : error ? (
        <div className="p-4 bg-[#FDE8E8] border-2 border-[#2B2438] text-xs text-[#9B1C1C] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : slots.length === 0 ? (
        <PixelCard variant="white" shadow="md" border="dark" className="py-16 text-center p-8 space-y-3">
          <div className="w-12 h-12 bg-[#FAF8F5] border-2 border-[#2B2438] mx-auto flex items-center justify-center text-[#7E7491]">
            <PixelCalendar size={24} />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-[#231E2C]">No Open Availability Slots Found</h2>
          <p className="text-xs text-[#534B62] max-w-md mx-auto leading-relaxed">
            There are currently no open availability slots matching your filter criteria. Counsellors regularly publish new appointment times—please check back soon.
          </p>
          {searchSpec && (
            <div className="pt-2">
              <PixelButton
                variant="outline"
                size="sm"
                onClick={() => setSearchSpec('')}
              >
                Reset Filter
              </PixelButton>
            </div>
          )}
        </PixelCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {slots.map((slot) => {
            const startDate = new Date(slot.slot_start);
            const endDate = new Date(slot.slot_end);
            return (
              <PixelCard
                key={slot.availability_id}
                variant="white"
                shadow="md"
                border="dark"
                accentBorderTop="mint"
                className="p-5 flex flex-col justify-between space-y-4 hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#231E2C] flex items-center gap-1.5">
                        <PixelUser size={14} className="text-[#297D56]" />
                        <span>{slot.counsellor_name}</span>
                      </h3>
                      {slot.specialization && (
                        <p className="text-[11px] text-[#297D56] font-semibold mt-1">
                          {slot.specialization}
                        </p>
                      )}
                    </div>
                    <PixelBadge variant="mint" size="sm" pixelFont>
                      OPEN
                    </PixelBadge>
                  </div>

                  <div className="pt-2 border-t-2 border-[#F4EFEA] space-y-2 text-xs text-[#534B62]">
                    <div className="flex items-center gap-2">
                      <PixelCalendar size={14} className="text-[#7E65B7]" />
                      <span className="font-semibold text-[#231E2C]">
                        {startDate.toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PixelClock size={14} className="text-[#7E65B7]" />
                      <span className="font-mono text-[11px] text-[#231E2C]">
                        {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' — '}
                        {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t-2 border-[#F4EFEA] flex items-center justify-between">
                  <span className="text-[10px] text-[#7E7491] font-mono">
                    SLOT #{slot.availability_id}
                  </span>
                  <PixelButton
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenBooking(slot)}
                  >
                    Book Session
                  </PixelButton>
                </div>
              </PixelCard>
            );
          })}
        </div>
      )}

      {/* Booking Confirmation Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 bg-[#231E2C]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <PixelCard
            variant="white"
            shadow="lg"
            border="dark"
            className="max-w-md w-full p-6 space-y-5"
          >
            {/* Modal Title Bar */}
            <div className="flex items-center justify-between border-b-2 border-[#2B2438] pb-3">
              <div className="flex items-center gap-2">
                <PixelCalendar size={16} className="text-[#297D56]" />
                <h2 className="text-sm sm:text-base font-bold text-[#231E2C]">
                  Confirm Counselling Appointment
                </h2>
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="w-6 h-6 border-2 border-[#2B2438] bg-[#FAF8F5] text-xs font-bold hover:bg-[#FDE8E8] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Slot Details Summary Box */}
            <div className="p-3.5 bg-[#FAF8F5] border-2 border-[#2B2438] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#534B62]">Counsellor:</span>
                <span className="font-bold text-[#231E2C]">{selectedSlot.counsellor_name}</span>
              </div>
              {selectedSlot.specialization && (
                <div className="flex items-center justify-between">
                  <span className="text-[#534B62]">Focus Area:</span>
                  <span className="text-[#297D56] font-semibold">{selectedSlot.specialization}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[#534B62]">Scheduled Slot:</span>
                <span className="font-mono text-[#231E2C] font-semibold">
                  {new Date(selectedSlot.slot_start).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#231E2C] mb-1">
                  Reason for Consultation / Topics (Optional, max 255 chars)
                </label>
                <PixelTextarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 255))}
                  placeholder="e.g. Exam anxiety, sleep disruptions, feeling overwhelmed with project workload..."
                  rows={3}
                />
                <span className="text-[10px] text-[#7E7491] font-mono float-right mt-1">
                  {reason.length}/255
                </span>
              </div>

              {bookingError && (
                <div className="p-3 bg-[#FDE8E8] border-2 border-[#2B2438] text-xs text-[#9B1C1C] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}

              {bookingSuccess && (
                <div className="p-3 bg-[#E0F4EA] border-2 border-[#2B2438] text-xs text-[#1D5E40] flex items-center gap-2">
                  <PixelCheck size={16} className="shrink-0" />
                  <span>{bookingSuccess}</span>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3 border-t-2 border-[#E8E0D5]">
                <PixelButton
                  variant="ghost"
                  size="md"
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  disabled={bookingLoading}
                >
                  Cancel
                </PixelButton>
                <PixelButton
                  variant="mintDark"
                  size="md"
                  type="submit"
                  disabled={bookingLoading}
                >
                  {bookingLoading ? 'Reserving Slot...' : 'Confirm Reservation'}
                </PixelButton>
              </div>
            </form>
          </PixelCard>
        </div>
      )}
    </div>
  );
};
