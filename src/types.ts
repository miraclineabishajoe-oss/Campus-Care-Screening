export interface AuthUser {
  id: number;
  email: string;
  role: 'STUDENT' | 'COUNSELLOR';
  name: string;
  specialization?: string | null;
  is_active?: number;
}

export interface StudentRecord {
  student_id: number;
  full_name: string;
  email: string;
  created_at: string;
  department?: string;
  academic_year?: string;
  section?: string;
}

export interface CounsellorRecord {
  counsellor_id: number;
  full_name: string;
  email: string;
  specialization: string | null;
  is_active: number;
  created_at: string;
}

export interface AvailabilitySlot {
  availability_id: number;
  counsellor_id: number;
  slot_start: string;
  slot_end: string;
  is_available: number;
  created_at?: string;
  counsellor_name?: string;
  counsellor_email?: string;
  specialization?: string | null;
  session_mode?: 'ONLINE' | 'OFFLINE';
  meeting_link?: string | null;
  location?: string | null;
  notes?: string | null;
  is_booked?: boolean;
  booking?: {
    appointment_id: number;
    booking_status: string;
    reason: string | null;
    student_name: string;
    student_email: string;
  } | null;
}

export interface Appointment {
  appointment_id: number;
  student_id: number;
  availability_id: number;
  booking_status: 'BOOKED' | 'CANCELLED' | 'COMPLETED';
  workflow_status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  session_mode: 'ONLINE' | 'OFFLINE';
  meeting_link?: string | null;
  location?: string | null;
  session_notes?: string | null;
  student_reason?: string | null;
  rejection_reason?: string | null;
  reason: string | null;
  booked_at: string;
  updated_at: string;
  active_availability_id: number | null;
  slot_start?: string;
  slot_end?: string;
  counsellor_name?: string;
  counsellor_email?: string;
  specialization?: string | null;
  student_name?: string;
  student_email?: string;
}

export interface AuthorizedStudent {
  student_id: number;
  full_name: string;
  email: string;
  created_at: string;
  total_sessions: number;
  latest_session_date: string;
  department?: string;
  academic_year?: string;
  section?: string;
}

export interface Screening {
  screening_id: number;
  student_id: number;
  responses?: any;
  overall_score: number | null;
  screening_summary: string | null;
  submitted_at: string;
}

export interface ScreeningAnalytics {
  total_screenings: number;
  unique_students_screened: number;
  average_score: number;
  distribution: {
    mild: { count: number; label: string; percent: number };
    moderate: { count: number; label: string; percent: number };
    severe: { count: number; label: string; percent: number };
  };
  timeline: Array<{
    period: string;
    count: number;
    avg_score: number;
  }>;
}

export interface DatabaseHealth {
  status: string;
  timestamp: string;
  service: string;
  database: {
    isLiveMySQL: boolean;
    message: string;
    configuredHost: string;
    configuredPort: string;
    databaseName: string;
  };
  tables_verified: string[];
}
