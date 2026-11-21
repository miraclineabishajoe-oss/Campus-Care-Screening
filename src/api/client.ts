import { 
  AuthUser, 
  AvailabilitySlot, 
  Appointment, 
  Screening, 
  DatabaseHealth 
} from '../types';

const TOKEN_KEY = 'campuscare_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err: any = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

export const api = {
  // Authentication
  auth: {
    studentRegister: (data: { full_name: string; email: string; password: string }) =>
      request<{ message: string; token: string; user: AuthUser }>('/api/auth/student/register', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    studentLogin: (data: { email: string; password: string }) =>
      request<{ message: string; token: string; user: AuthUser }>('/api/auth/student/login', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    counsellorRegister: (data: { full_name: string; email: string; password: string; specialization?: string }) =>
      request<{ message: string; is_active: number }>('/api/auth/counsellor/register', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    counsellorLogin: (data: { email: string; password: string }) =>
      request<{ message: string; token: string; user: AuthUser }>('/api/auth/counsellor/login', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getMe: () =>
      request<AuthUser>('/api/auth/me'),

    logout: () => {
      clearStoredToken();
    }
  },

  // Screenings
  screenings: {
    submit: (data: { responses: any; overall_score: number; screening_summary: string }) =>
      request<{ message: string; screening: Screening; disclaimer: string }>('/api/screenings', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getHistory: () =>
      request<{ screenings: Screening[] }>('/api/screenings/history'),

    getCounsellorView: (studentId: number) =>
      request<{ screenings: Screening[] }>(`/api/screenings/counsellor/${studentId}`),

    getAnalytics: () =>
      request<{
        total_screenings: number;
        unique_students_screened: number;
        average_score: number;
        distribution: {
          mild: { count: number; label: string; percent: number };
          moderate: { count: number; label: string; percent: number };
          severe: { count: number; label: string; percent: number };
        };
        timeline: Array<{ period: string; count: number; avg_score: number }>;
      }>('/api/screenings/analytics')
  },

  // Availability
  availability: {
    getPublicSlots: (params?: { counsellor_id?: number; specialization?: string }) => {
      const query = new URLSearchParams();
      if (params?.counsellor_id) query.set('counsellor_id', String(params.counsellor_id));
      if (params?.specialization) query.set('specialization', params.specialization);
      const url = `/api/availability${query.toString() ? '?' + query.toString() : ''}`;
      return request<{ slots: AvailabilitySlot[] }>(url);
    },

    getMySlots: () =>
      request<{ slots: AvailabilitySlot[] }>('/api/availability/my-slots'),

    createSlot: (data: { 
      slot_start: string; 
      slot_end: string; 
      session_mode?: 'ONLINE' | 'OFFLINE'; 
      meeting_link?: string | null; 
      location?: string | null; 
      notes?: string | null;
    }) =>
      request<{ message: string; slot: AvailabilitySlot }>('/api/availability', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    deleteSlot: (availabilityId: number) =>
      request<{ message: string }>(`/api/availability/${availabilityId}`, {
        method: 'DELETE'
      })
  },

  // Appointments
  appointments: {
    book: (data: { availability_id: number; reason?: string }) =>
      request<{ message: string; appointment: Appointment }>('/api/appointments/book', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    accept: (appointmentId: number) =>
      request<{ message: string; appointment: Appointment }>(`/api/appointments/${appointmentId}/accept`, {
        method: 'POST'
      }),

    reject: (appointmentId: number, rejection_reason?: string) =>
      request<{ message: string; appointment: Appointment }>(`/api/appointments/${appointmentId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejection_reason })
      }),

    getStudentAppointments: () =>
      request<{ appointments: Appointment[] }>('/api/appointments/student'),

    getCounsellorAppointments: () =>
      request<{ appointments: Appointment[] }>('/api/appointments/counsellor'),

    getAuthorizedStudents: () =>
      request<{ students: any[] }>('/api/appointments/counsellor/authorized-students'),

    cancel: (appointmentId: number) =>
      request<{ message: string }>(`/api/appointments/${appointmentId}/cancel`, {
        method: 'POST'
      }),

    complete: (appointmentId: number) =>
      request<{ message: string }>(`/api/appointments/${appointmentId}/complete`, {
        method: 'POST'
      })
  },

  // Password Recovery
  recovery: {
    request: (data: { account_type: 'STUDENT' | 'COUNSELLOR'; email: string }) =>
      request<{ message: string; expires_in_minutes: number; dev_code_hint?: string }>('/api/recovery/request', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    verify: (data: { account_type: 'STUDENT' | 'COUNSELLOR'; email: string; code: string }) =>
      request<{ message: string; reset_token: string }>('/api/recovery/verify', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    reset: (data: { reset_token: string; new_password: string }) =>
      request<{ message: string }>('/api/recovery/reset', {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  // System Health
  health: {
    check: () =>
      request<DatabaseHealth>('/api/health')
  }
};
