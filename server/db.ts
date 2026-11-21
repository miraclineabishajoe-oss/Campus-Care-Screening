import mysql from 'mysql2/promise';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export interface StudentRecord {
  student_id: number;
  full_name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface CounsellorRecord {
  counsellor_id: number;
  full_name: string;
  email: string;
  password_hash: string;
  specialization: string | null;
  is_active: number;
  created_at: string;
}

export interface CounsellorAvailabilityRecord {
  availability_id: number;
  counsellor_id: number;
  slot_start: string;
  slot_end: string;
  is_available: number;
  created_at: string;
}

export interface AppointmentRecord {
  appointment_id: number;
  student_id: number;
  availability_id: number;
  booking_status: 'BOOKED' | 'CANCELLED' | 'COMPLETED';
  reason: string | null;
  booked_at: string;
  updated_at: string;
  active_availability_id: number | null;
}

export interface ScreeningRecord {
  screening_id: number;
  student_id: number;
  responses: any;
  overall_score: number | null;
  screening_summary: string | null;
  submitted_at: string;
}

export interface PasswordRecoveryRecord {
  recovery_id: number;
  account_type: 'STUDENT' | 'COUNSELLOR';
  email: string;
  code_hash: string | null;
  code_expires_at: string | null;
  attempt_count: number;
  last_sent_at: string | null;
  verified_at: string | null;
  reset_token_hash: string | null;
  reset_token_expires_at: string | null;
  used_at: string | null;
  created_at: string;
}

let pool: mysql.Pool | null = null;
let isLiveMySQL = false;
let dbStatusMessage = 'Initializing database...';

// In-Memory Schema Storage (mirrors the exact 6 MySQL tables with identical constraints)
class InMemoryCampusCareStore {
  students: StudentRecord[] = [];
  counsellors: CounsellorRecord[] = [];
  counsellor_availability: CounsellorAvailabilityRecord[] = [];
  appointments: AppointmentRecord[] = [];
  screenings: ScreeningRecord[] = [];
  password_recovery: PasswordRecoveryRecord[] = [];

  private nextStudentId = 1;
  private nextCounsellorId = 1;
  private nextAvailabilityId = 1;
  private nextAppointmentId = 1;
  private nextScreeningId = 1;
  private nextRecoveryId = 1;

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    // Keep demo seed data separate from production data
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    // Seed initial active and inactive counsellors for evaluation & testing
    // Documented demo password for seeded accounts is: Password123!
    // Safely computed using the project's bcryptjs salt rounds 10 approach matching server/auth.ts
    const DEMO_PASSWORD = 'Password123!';
    const demoHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
    
    // Seed Dr. Sarah Bennett (Approved / Active)
    this.counsellors.push({
      counsellor_id: this.nextCounsellorId++,
      full_name: 'Dr. Sarah Bennett',
      email: 's.bennett@campuscare.edu',
      password_hash: demoHash,
      specialization: 'Cognitive Behavioural Therapy & Anxiety',
      is_active: 1,
      created_at: new Date(Date.now() - 86400000 * 30).toISOString().slice(0, 19).replace('T', ' ')
    });

    // Seed Marcus Vance (Approved / Active)
    this.counsellors.push({
      counsellor_id: this.nextCounsellorId++,
      full_name: 'Marcus Vance, LPC',
      email: 'm.vance@campuscare.edu',
      password_hash: demoHash,
      specialization: 'Academic Stress, Burnout & Mindfulness',
      is_active: 1,
      created_at: new Date(Date.now() - 86400000 * 20).toISOString().slice(0, 19).replace('T', ' ')
    });

    // Seed Dr. Elena Rostova (Inactive / Pending Approval) to verify `is_active = 0` constraint
    this.counsellors.push({
      counsellor_id: this.nextCounsellorId++,
      full_name: 'Dr. Elena Rostova',
      email: 'e.rostova@campuscare.edu',
      password_hash: demoHash,
      specialization: 'Trauma & Depression Care',
      is_active: 0,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 19).replace('T', ' ')
    });

    // Seed Demo Student Alex Rivera
    this.students.push({
      student_id: this.nextStudentId++,
      full_name: 'Alex Rivera',
      email: 'alex.rivera@student.campuscare.edu',
      password_hash: demoHash,
      created_at: new Date(Date.now() - 86400000 * 15).toISOString().slice(0, 19).replace('T', ' ')
    });

    // Seed demo availability slots for upcoming days
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000);
    const dayAfter = new Date(now.getTime() + 86400000 * 2);

    const slot1Start = new Date(tomorrow);
    slot1Start.setHours(10, 0, 0, 0);
    const slot1End = new Date(tomorrow);
    slot1End.setHours(11, 0, 0, 0);

    const slot2Start = new Date(tomorrow);
    slot2Start.setHours(14, 0, 0, 0);
    const slot2End = new Date(tomorrow);
    slot2End.setHours(15, 0, 0, 0);

    const slot3Start = new Date(dayAfter);
    slot3Start.setHours(11, 30, 0, 0);
    const slot3End = new Date(dayAfter);
    slot3End.setHours(12, 30, 0, 0);

    const slot4Start = new Date(dayAfter);
    slot4Start.setHours(15, 0, 0, 0);
    const slot4End = new Date(dayAfter);
    slot4End.setHours(16, 0, 0, 0);

    this.counsellor_availability.push(
      {
        availability_id: this.nextAvailabilityId++,
        counsellor_id: 1,
        slot_start: slot1Start.toISOString().slice(0, 19).replace('T', ' '),
        slot_end: slot1End.toISOString().slice(0, 19).replace('T', ' '),
        is_available: 1,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      },
      {
        availability_id: this.nextAvailabilityId++,
        counsellor_id: 1,
        slot_start: slot2Start.toISOString().slice(0, 19).replace('T', ' '),
        slot_end: slot2End.toISOString().slice(0, 19).replace('T', ' '),
        is_available: 1,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      },
      {
        availability_id: this.nextAvailabilityId++,
        counsellor_id: 2,
        slot_start: slot3Start.toISOString().slice(0, 19).replace('T', ' '),
        slot_end: slot3End.toISOString().slice(0, 19).replace('T', ' '),
        is_available: 1,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      },
      {
        availability_id: this.nextAvailabilityId++,
        counsellor_id: 2,
        slot_start: slot4Start.toISOString().slice(0, 19).replace('T', ' '),
        slot_end: slot4End.toISOString().slice(0, 19).replace('T', ' '),
        is_available: 1,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }
    );
  }

  // --- Students ---
  findStudentByEmail(email: string): StudentRecord | undefined {
    return this.students.find(s => s.email.toLowerCase() === email.toLowerCase());
  }

  findStudentById(student_id: number): StudentRecord | undefined {
    return this.students.find(s => s.student_id === student_id);
  }

  createStudent(full_name: string, email: string, password_hash: string): StudentRecord {
    if (this.findStudentByEmail(email)) {
      const err: any = new Error(`Duplicate entry '${email}' for key 'students.email'`);
      err.code = 'ER_DUP_ENTRY';
      throw err;
    }
    const student: StudentRecord = {
      student_id: this.nextStudentId++,
      full_name,
      email,
      password_hash,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    this.students.push(student);
    return student;
  }

  updateStudentPassword(student_id: number, password_hash: string): boolean {
    const s = this.findStudentById(student_id);
    if (!s) return false;
    s.password_hash = password_hash;
    return true;
  }

  // --- Counsellors ---
  findCounsellorByEmail(email: string): CounsellorRecord | undefined {
    return this.counsellors.find(c => c.email.toLowerCase() === email.toLowerCase());
  }

  findCounsellorById(counsellor_id: number): CounsellorRecord | undefined {
    return this.counsellors.find(c => c.counsellor_id === counsellor_id);
  }

  createCounsellor(full_name: string, email: string, password_hash: string, specialization: string | null): CounsellorRecord {
    if (this.findCounsellorByEmail(email)) {
      const err: any = new Error(`Duplicate entry '${email}' for key 'counsellors.email'`);
      err.code = 'ER_DUP_ENTRY';
      throw err;
    }
    // Mandatory: Newly registered counsellors must be set to is_active = 0
    const counsellor: CounsellorRecord = {
      counsellor_id: this.nextCounsellorId++,
      full_name,
      email,
      password_hash,
      specialization: specialization || null,
      is_active: 0,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    this.counsellors.push(counsellor);
    return counsellor;
  }

  updateCounsellorPassword(counsellor_id: number, password_hash: string): boolean {
    const c = this.findCounsellorById(counsellor_id);
    if (!c) return false;
    c.password_hash = password_hash;
    return true;
  }

  // --- Counsellor Availability ---
  getAvailableSlots(filter?: { counsellor_id?: number; specialization?: string }) {
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    return this.counsellor_availability
      .filter(slot => {
        if (slot.is_available !== 1) return false;
        if (slot.slot_start <= nowStr) return false;
        if (filter?.counsellor_id && slot.counsellor_id !== filter.counsellor_id) return false;
        
        const counsellor = this.findCounsellorById(slot.counsellor_id);
        if (!counsellor || counsellor.is_active !== 1) return false;
        if (filter?.specialization && counsellor.specialization?.toLowerCase() !== filter.specialization.toLowerCase()) {
          return false;
        }
        return true;
      })
      .map(slot => {
        const c = this.findCounsellorById(slot.counsellor_id)!;
        return {
          ...slot,
          counsellor_name: c.full_name,
          counsellor_email: c.email,
          specialization: c.specialization
        };
      })
      .sort((a, b) => a.slot_start.localeCompare(b.slot_start));
  }

  getCounsellorSlots(counsellor_id: number) {
    return this.counsellor_availability
      .filter(slot => slot.counsellor_id === counsellor_id)
      .map(slot => {
        const activeBooking = this.appointments.find(
          a => a.availability_id === slot.availability_id && a.booking_status === 'BOOKED'
        );
        return {
          ...slot,
          is_booked: !!activeBooking,
          booking: activeBooking || null
        };
      })
      .sort((a, b) => a.slot_start.localeCompare(b.slot_start));
  }

  createSlot(counsellor_id: number, slot_start: string, slot_end: string): CounsellorAvailabilityRecord {
    // Constraint: chk_slot_time (slot_end > slot_start)
    if (new Date(slot_end).getTime() <= new Date(slot_start).getTime()) {
      const err: any = new Error("Check constraint 'chk_slot_time' violated: slot_end must be after slot_start");
      err.code = 'ER_CHECK_CONSTRAINT_VIOLATED';
      throw err;
    }

    // Constraint: uq_counsellor_slot (counsellor_id, slot_start, slot_end)
    const exists = this.counsellor_availability.some(
      s => s.counsellor_id === counsellor_id && s.slot_start === slot_start && s.slot_end === slot_end
    );
    if (exists) {
      const err: any = new Error("Duplicate entry for key 'uq_counsellor_slot'");
      err.code = 'ER_DUP_ENTRY';
      throw err;
    }

    const slot: CounsellorAvailabilityRecord = {
      availability_id: this.nextAvailabilityId++,
      counsellor_id,
      slot_start,
      slot_end,
      is_available: 1,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    this.counsellor_availability.push(slot);
    return slot;
  }

  deleteSlot(availability_id: number, counsellor_id: number): boolean {
    // Cannot delete if active appointment exists
    const hasActiveAppointment = this.appointments.some(
      a => a.availability_id === availability_id && a.booking_status === 'BOOKED'
    );
    if (hasActiveAppointment) {
      const err: any = new Error("Cannot delete availability slot with an active appointment");
      err.code = 'ER_RESTRICT_FK';
      throw err;
    }

    const index = this.counsellor_availability.findIndex(
      s => s.availability_id === availability_id && s.counsellor_id === counsellor_id
    );
    if (index === -1) return false;
    this.counsellor_availability.splice(index, 1);
    return true;
  }

  // --- Appointments (with uq_one_active_booking_per_slot enforcement) ---
  bookAppointment(student_id: number, availability_id: number, reason: string | null): AppointmentRecord {
    const slot = this.counsellor_availability.find(s => s.availability_id === availability_id);
    if (!slot) {
      throw new Error("Availability slot not found");
    }
    if (slot.is_available !== 1) {
      throw new Error("This counselling slot is no longer available");
    }

    // Check unique constraint uq_one_active_booking_per_slot (active_availability_id)
    const existingActive = this.appointments.find(
      a => a.active_availability_id === availability_id
    );
    if (existingActive) {
      const err: any = new Error("Duplicate entry for key 'uq_one_active_booking_per_slot'");
      err.code = 'ER_DUP_ENTRY';
      throw err;
    }

    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const appointment: AppointmentRecord = {
      appointment_id: this.nextAppointmentId++,
      student_id,
      availability_id,
      booking_status: 'BOOKED',
      reason: reason ? reason.slice(0, 255) : null,
      booked_at: nowStr,
      updated_at: nowStr,
      active_availability_id: availability_id // Enforces unique active booking
    };

    // Mark slot unavailable
    slot.is_available = 0;
    this.appointments.push(appointment);
    return appointment;
  }

  cancelAppointment(appointment_id: number, requester: { student_id?: number; counsellor_id?: number }): AppointmentRecord {
    const appt = this.appointments.find(a => a.appointment_id === appointment_id);
    if (!appt) {
      throw new Error("Appointment not found");
    }

    // Verify ownership
    if (requester.student_id && appt.student_id !== requester.student_id) {
      throw new Error("Unauthorized to cancel this appointment");
    }

    const slot = this.counsellor_availability.find(s => s.availability_id === appt.availability_id);
    if (requester.counsellor_id && slot && slot.counsellor_id !== requester.counsellor_id) {
      throw new Error("Unauthorized to cancel this appointment");
    }

    if (appt.booking_status === 'CANCELLED') {
      throw new Error("Appointment is already cancelled");
    }

    appt.booking_status = 'CANCELLED';
    appt.active_availability_id = null; // Clear active constraint so slot can be freed
    appt.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (slot) {
      slot.is_available = 1; // Slot becomes available again
    }

    return appt;
  }

  completeAppointment(appointment_id: number, counsellor_id: number): AppointmentRecord {
    const appt = this.appointments.find(a => a.appointment_id === appointment_id);
    if (!appt) {
      throw new Error("Appointment not found");
    }

    const slot = this.counsellor_availability.find(s => s.availability_id === appt.availability_id);
    if (!slot || slot.counsellor_id !== counsellor_id) {
      throw new Error("Unauthorized: Only the assigned counsellor can complete this appointment");
    }

    appt.booking_status = 'COMPLETED';
    appt.active_availability_id = null;
    appt.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    return appt;
  }

  getStudentAppointments(student_id: number) {
    return this.appointments
      .filter(a => a.student_id === student_id)
      .map(a => {
        const slot = this.counsellor_availability.find(s => s.availability_id === a.availability_id);
        const counsellor = slot ? this.findCounsellorById(slot.counsellor_id) : null;
        return {
          ...a,
          slot_start: slot?.slot_start,
          slot_end: slot?.slot_end,
          counsellor_name: counsellor?.full_name || 'Assigned Counsellor',
          counsellor_email: counsellor?.email,
          specialization: counsellor?.specialization
        };
      })
      .sort((a, b) => (b.slot_start || '').localeCompare(a.slot_start || ''));
  }

  getCounsellorAppointments(counsellor_id: number) {
    return this.appointments
      .filter(a => {
        const slot = this.counsellor_availability.find(s => s.availability_id === a.availability_id);
        return slot?.counsellor_id === counsellor_id;
      })
      .map(a => {
        const slot = this.counsellor_availability.find(s => s.availability_id === a.availability_id);
        const student = this.findStudentById(a.student_id);
        return {
          ...a,
          slot_start: slot?.slot_start,
          slot_end: slot?.slot_end,
          student_name: student?.full_name || 'Student',
          student_email: student?.email
        };
      })
      .sort((a, b) => (a.slot_start || '').localeCompare(b.slot_start || ''));
  }

  // --- Screenings ---
  createScreening(student_id: number, responses: any, overall_score: number | null, screening_summary: string | null): ScreeningRecord {
    const student = this.findStudentById(student_id);
    if (!student) {
      throw new Error("Student not found");
    }

    const screening: ScreeningRecord = {
      screening_id: this.nextScreeningId++,
      student_id,
      responses,
      overall_score: overall_score !== null ? Number(overall_score.toFixed(2)) : null,
      screening_summary: screening_summary ? screening_summary.slice(0, 255) : null,
      submitted_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    this.screenings.push(screening);
    return screening;
  }

  getStudentScreenings(student_id: number) {
    return this.screenings
      .filter(s => s.student_id === student_id)
      .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  }

  // Check if counsellor has an active or completed appointment with student (to authorize screening summary access)
  hasCounsellorStudentAccess(counsellor_id: number, student_id: number): boolean {
    return this.appointments.some(a => {
      if (a.student_id !== student_id) return false;
      if (a.booking_status === 'CANCELLED') return false;
      const slot = this.counsellor_availability.find(s => s.availability_id === a.availability_id);
      return slot?.counsellor_id === counsellor_id;
    });
  }

  // --- Password Recovery (respecting password_recovery table) ---
  createRecoveryRequest(account_type: 'STUDENT' | 'COUNSELLOR', email: string, code_hash: string, code_expires_at: string): PasswordRecoveryRecord {
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const recovery: PasswordRecoveryRecord = {
      recovery_id: this.nextRecoveryId++,
      account_type,
      email: email.toLowerCase(),
      code_hash,
      code_expires_at,
      attempt_count: 0,
      last_sent_at: nowStr,
      verified_at: null,
      reset_token_hash: null,
      reset_token_expires_at: null,
      used_at: null,
      created_at: nowStr
    };
    this.password_recovery.push(recovery);
    return recovery;
  }

  getLatestActiveRecovery(account_type: 'STUDENT' | 'COUNSELLOR', email: string): PasswordRecoveryRecord | undefined {
    return this.password_recovery
      .filter(r => r.account_type === account_type && r.email.toLowerCase() === email.toLowerCase() && !r.used_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  }

  findRecoveryByResetTokenHash(reset_token_hash: string): PasswordRecoveryRecord | undefined {
    return this.password_recovery.find(r => r.reset_token_hash === reset_token_hash && !r.used_at);
  }
}

export const memoryStore = new InMemoryCampusCareStore();

// Initialize Live MySQL Pool if connection parameters are available
export async function initializeDatabase() {
  const host = process.env.MYSQL_HOST || 'localhost';
  const port = parseInt(process.env.MYSQL_PORT || '3306', 10);
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'campuscare';

  try {
    const tempPool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 3000
    });

    // Test connectivity
    const [rows] = await tempPool.query('SELECT 1 as test');
    pool = tempPool;
    isLiveMySQL = true;
    dbStatusMessage = `Connected to live MySQL 8.0 database "${database}" at ${host}:${port}`;
    console.log(`[CampusCare] ${dbStatusMessage}`);
  } catch (err: any) {
    isLiveMySQL = false;
    dbStatusMessage = `Live MySQL not connected (${err.message || 'connection failed'}). Running in Isolated Exact-Schema Engine.`;
    console.log(`[CampusCare] ${dbStatusMessage}`);
  }
}

export function getDatabaseStatus() {
  return {
    isLiveMySQL,
    message: dbStatusMessage,
    configuredHost: process.env.MYSQL_HOST || 'localhost',
    configuredPort: process.env.MYSQL_PORT || '3306',
    databaseName: process.env.MYSQL_DATABASE || 'campuscare'
  };
}

export function getMySQLPool(): mysql.Pool | null {
  return pool;
}

export function isUsingLiveMySQL(): boolean {
  return isLiveMySQL && pool !== null;
}

// Session Metadata Storage & Serialization (without breaking schema)
export interface SlotSessionMeta {
  session_mode: 'ONLINE' | 'OFFLINE';
  meeting_link?: string | null;
  location?: string | null;
  notes?: string | null;
}

export interface AppointmentSessionMeta {
  workflow_status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  session_mode: 'ONLINE' | 'OFFLINE';
  meeting_link?: string | null;
  location?: string | null;
  session_notes?: string | null;
  student_reason?: string | null;
  rejection_reason?: string | null;
}

export const slotMetaStore = new Map<number, SlotSessionMeta>();
export const appointmentMetaStore = new Map<number, AppointmentSessionMeta>();

export function serializeAppointmentReason(meta: AppointmentSessionMeta): string {
  const payload = {
    w: meta.workflow_status,
    m: meta.session_mode,
    l: (meta.session_mode === 'ONLINE' ? meta.meeting_link : meta.location) || '',
    r: (meta.student_reason || '').slice(0, 110),
    n: (meta.session_notes || '').slice(0, 50),
    rej: (meta.rejection_reason || '').slice(0, 50)
  };
  const jsonStr = JSON.stringify(payload);
  if (jsonStr.length <= 255) {
    return jsonStr;
  }
  return `[${meta.workflow_status}|${meta.session_mode}|${payload.l.slice(0, 60)}] ${payload.r.slice(0, 120)}`;
}

export function parseAppointmentReason(rawReason: string | null, bookingStatus: string): AppointmentSessionMeta {
  if (!rawReason) {
    return {
      workflow_status: bookingStatus === 'BOOKED' ? 'CONFIRMED' : (bookingStatus as any),
      session_mode: 'OFFLINE',
      location: 'Campus Health Center, Room 204',
      student_reason: 'Routine Consultation'
    };
  }

  // Attempt JSON parsing
  if (rawReason.startsWith('{') && rawReason.endsWith('}')) {
    try {
      const parsed = JSON.parse(rawReason);
      if (parsed.w && parsed.m) {
        return {
          workflow_status: parsed.w,
          session_mode: parsed.m,
          meeting_link: parsed.m === 'ONLINE' ? parsed.l : null,
          location: parsed.m === 'OFFLINE' ? parsed.l : null,
          student_reason: parsed.r || '',
          session_notes: parsed.n || null,
          rejection_reason: parsed.rej || null
        };
      }
    } catch {}
  }

  // Attempt tagged format [STATUS|MODE|LOC] REASON
  const tagMatch = rawReason.match(/^\[(PENDING|CONFIRMED|REJECTED|CANCELLED|COMPLETED)\|(ONLINE|OFFLINE)\|?(.*?)\]\s*(.*)$/);
  if (tagMatch) {
    const [, status, mode, loc, reasonText] = tagMatch;
    return {
      workflow_status: status as any,
      session_mode: mode as any,
      meeting_link: mode === 'ONLINE' ? loc : null,
      location: mode === 'OFFLINE' ? loc : null,
      student_reason: reasonText
    };
  }

  // Fallback to plain text reason
  return {
    workflow_status: bookingStatus === 'BOOKED' ? 'CONFIRMED' : (bookingStatus as any),
    session_mode: 'OFFLINE',
    location: 'Campus Counselling Centre, Room 204',
    student_reason: rawReason
  };
}
