import { Router, Response } from 'express';
import { 
  getMySQLPool, 
  isUsingLiveMySQL, 
  memoryStore,
  slotMetaStore,
  serializeAppointmentReason,
  parseAppointmentReason,
  AppointmentSessionMeta
} from '../db.ts';
import { 
  requireAuth, 
  requireRole, 
  AuthenticatedRequest 
} from '../auth.ts';

export const appointmentRouter = Router();

// Helper to format appointment record for responses with parsed metadata and privacy controls
function formatAppointmentResponse(rawAppt: any, isCounsellor: boolean) {
  const meta = parseAppointmentReason(rawAppt.reason, rawAppt.booking_status);
  
  // Meeting link privacy rule:
  // Visible to counsellor always; visible to student only when appointment is CONFIRMED
  const meetingLink = (isCounsellor || meta.workflow_status === 'CONFIRMED')
    ? (meta.session_mode === 'ONLINE' ? meta.meeting_link : null)
    : null;

  return {
    appointment_id: rawAppt.appointment_id,
    student_id: rawAppt.student_id,
    availability_id: rawAppt.availability_id,
    booking_status: rawAppt.booking_status,
    workflow_status: meta.workflow_status,
    session_mode: meta.session_mode,
    meeting_link: meetingLink,
    location: meta.session_mode === 'OFFLINE' ? meta.location : null,
    session_notes: meta.session_notes || null,
    student_reason: meta.student_reason || rawAppt.reason,
    rejection_reason: meta.rejection_reason || null,
    reason: rawAppt.reason,
    booked_at: rawAppt.booked_at,
    updated_at: rawAppt.updated_at,
    active_availability_id: rawAppt.active_availability_id,
    slot_start: rawAppt.slot_start,
    slot_end: rawAppt.slot_end,
    counsellor_name: rawAppt.counsellor_name,
    counsellor_email: rawAppt.counsellor_email,
    specialization: rawAppt.specialization,
    student_name: rawAppt.student_name,
    student_email: rawAppt.student_email
  };
}

// Book an appointment (Student Only)
// Employs strict atomic transaction locking & uq_one_active_booking_per_slot to prevent double-booking
appointmentRouter.post('/book', requireAuth, requireRole('STUDENT'), async (req: AuthenticatedRequest, res: Response) => {
  const student_id = req.user!.id;
  const { availability_id, reason } = req.body;

  if (!availability_id || isNaN(parseInt(String(availability_id), 10))) {
    return res.status(400).json({ error: 'Valid availability_id is required.' });
  }

  const cleanAvailId = parseInt(String(availability_id), 10);
  const cleanReason = reason ? String(reason).trim().slice(0, 150) : 'Confidential Student Wellness Consultation';

  // Get slot metadata
  const slotMeta = slotMetaStore.get(cleanAvailId) || {
    session_mode: 'OFFLINE',
    location: 'Campus Health Center, Room 204'
  };

  const initialMeta: AppointmentSessionMeta = {
    workflow_status: 'PENDING',
    session_mode: slotMeta.session_mode,
    meeting_link: slotMeta.meeting_link || null,
    location: slotMeta.location || 'Campus Health Center, Room 204',
    session_notes: slotMeta.notes || null,
    student_reason: cleanReason
  };
  const serializedReason = serializeAppointmentReason(initialMeta);

  if (isUsingLiveMySQL()) {
    const pool = getMySQLPool()!;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Lock the slot row with FOR UPDATE
      const [slotRows]: any = await connection.query(
        'SELECT * FROM counsellor_availability WHERE availability_id = ? FOR UPDATE',
        [cleanAvailId]
      );

      if (slotRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Selected counselling slot not found.' });
      }

      const slot = slotRows[0];
      if (slot.is_available !== 1) {
        await connection.rollback();
        return res.status(409).json({ error: 'This counselling slot has already been booked.' });
      }

      if (new Date(slot.slot_start).getTime() <= Date.now()) {
        await connection.rollback();
        return res.status(400).json({ error: 'Cannot book appointments for past slots.' });
      }

      // 2. Insert appointment with active_availability_id (guaranteed unique by uq_one_active_booking_per_slot)
      let appointmentId: number;
      try {
        const [insertRes]: any = await connection.query(
          `INSERT INTO appointments (student_id, availability_id, booking_status, reason, active_availability_id)
           VALUES (?, ?, 'BOOKED', ?, ?)`,
          [student_id, cleanAvailId, serializedReason, cleanAvailId]
        );
        appointmentId = insertRes.insertId;
      } catch (insertErr: any) {
        await connection.rollback();
        if (insertErr.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'Concurrent booking conflict: This slot was just reserved by another student.' });
        }
        throw insertErr;
      }

      // 3. Mark the availability slot as reserved (is_available = 0)
      await connection.query(
        'UPDATE counsellor_availability SET is_available = 0 WHERE availability_id = ?',
        [cleanAvailId]
      );

      await connection.commit();

      // Retrieve full joined booking for response
      const [apptDetails]: any = await connection.query(
        `SELECT a.*, ca.slot_start, ca.slot_end, c.full_name AS counsellor_name, c.email AS counsellor_email, c.specialization
         FROM appointments a
         JOIN counsellor_availability ca ON a.availability_id = ca.availability_id
         JOIN counsellors c ON ca.counsellor_id = c.counsellor_id
         WHERE a.appointment_id = ?`,
        [appointmentId]
      );

      return res.status(201).json({
        message: 'Booking request submitted successfully. Awaiting counsellor confirmation.',
        appointment: formatAppointmentResponse(apptDetails[0], false)
      });
    } catch (err: any) {
      await connection.rollback();
      console.error('[Appointment Error] Booking transaction failed:', err);
      return res.status(500).json({ error: 'Booking transaction failed. Please try again.' });
    } finally {
      connection.release();
    }
  } else {
    // In-memory atomic engine
    try {
      const appt = memoryStore.bookAppointment(student_id, cleanAvailId, serializedReason);
      const studentAppointments = memoryStore.getStudentAppointments(student_id);
      const details = studentAppointments.find(a => a.appointment_id === appt.appointment_id);

      return res.status(201).json({
        message: 'Booking request submitted successfully. Awaiting counsellor confirmation.',
        appointment: formatAppointmentResponse(details || appt, false)
      });
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Concurrent booking conflict: This slot was just reserved by another student.' });
      }
      return res.status(400).json({ error: err.message });
    }
  }
});

// Counsellor Accepts a Booking Request (Counsellor Only)
appointmentRouter.post('/:id/accept', requireAuth, requireRole('COUNSELLOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const counsellor_id = req.user!.id;
    const appointment_id = parseInt(req.params.id, 10);

    if (isNaN(appointment_id)) {
      return res.status(400).json({ error: 'Invalid appointment ID.' });
    }

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const [rows]: any = await connection.query(
          `SELECT a.*, ca.counsellor_id, ca.slot_start, ca.slot_end, c.full_name AS counsellor_name, s.full_name AS student_name, s.email AS student_email
           FROM appointments a
           JOIN counsellor_availability ca ON a.availability_id = ca.availability_id
           JOIN counsellors c ON ca.counsellor_id = c.counsellor_id
           JOIN students s ON a.student_id = s.student_id
           WHERE a.appointment_id = ? FOR UPDATE`,
          [appointment_id]
        );

        if (rows.length === 0) {
          await connection.rollback();
          return res.status(404).json({ error: 'Appointment not found.' });
        }

        const appt = rows[0];
        if (appt.counsellor_id !== counsellor_id) {
          await connection.rollback();
          return res.status(403).json({ error: 'Unauthorized: You can only review requests for your own slots.' });
        }

        const meta = parseAppointmentReason(appt.reason, appt.booking_status);
        meta.workflow_status = 'CONFIRMED';
        const updatedReason = serializeAppointmentReason(meta);

        await connection.query(
          'UPDATE appointments SET reason = ?, updated_at = NOW() WHERE appointment_id = ?',
          [updatedReason, appointment_id]
        );

        await connection.commit();

        appt.reason = updatedReason;
        return res.json({
          message: 'Appointment request confirmed successfully.',
          appointment: formatAppointmentResponse(appt, true)
        });
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } else {
      const appt = memoryStore.appointments.find(a => a.appointment_id === appointment_id);
      if (!appt) return res.status(404).json({ error: 'Appointment not found.' });
      
      const meta = parseAppointmentReason(appt.reason, appt.booking_status);
      meta.workflow_status = 'CONFIRMED';
      appt.reason = serializeAppointmentReason(meta);

      return res.json({
        message: 'Appointment request confirmed successfully.',
        appointment: formatAppointmentResponse(appt, true)
      });
    }
  } catch (err: any) {
    console.error('[Appointment Error] Failed to accept appointment:', err);
    return res.status(500).json({ error: 'Failed to accept appointment.' });
  }
});

// Counsellor Rejects a Booking Request (Counsellor Only)
appointmentRouter.post('/:id/reject', requireAuth, requireRole('COUNSELLOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const counsellor_id = req.user!.id;
    const appointment_id = parseInt(req.params.id, 10);
    const { rejection_reason } = req.body;

    if (isNaN(appointment_id)) {
      return res.status(400).json({ error: 'Invalid appointment ID.' });
    }

    const cleanRejection = rejection_reason ? String(rejection_reason).trim().slice(0, 100) : 'Slot unavailable';

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const [rows]: any = await connection.query(
          `SELECT a.*, ca.counsellor_id 
           FROM appointments a
           JOIN counsellor_availability ca ON a.availability_id = ca.availability_id
           WHERE a.appointment_id = ? FOR UPDATE`,
          [appointment_id]
        );

        if (rows.length === 0) {
          await connection.rollback();
          return res.status(404).json({ error: 'Appointment not found.' });
        }

        const appt = rows[0];
        if (appt.counsellor_id !== counsellor_id) {
          await connection.rollback();
          return res.status(403).json({ error: 'Unauthorized: You can only reject requests for your own slots.' });
        }

        const meta = parseAppointmentReason(appt.reason, appt.booking_status);
        meta.workflow_status = 'REJECTED';
        meta.rejection_reason = cleanRejection;
        const updatedReason = serializeAppointmentReason(meta);

        // Clear active_availability_id to release unique constraint lock and set booking_status to CANCELLED
        await connection.query(
          `UPDATE appointments 
           SET booking_status = 'CANCELLED', active_availability_id = NULL, reason = ?, updated_at = NOW() 
           WHERE appointment_id = ?`,
          [updatedReason, appointment_id]
        );

        // Reopen the availability slot so it can be booked by others
        await connection.query(
          'UPDATE counsellor_availability SET is_available = 1 WHERE availability_id = ?',
          [appt.availability_id]
        );

        await connection.commit();

        appt.reason = updatedReason;
        appt.booking_status = 'CANCELLED';
        return res.json({
          message: 'Appointment request rejected. The availability slot has been reopened.',
          appointment: formatAppointmentResponse(appt, true)
        });
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } else {
      const appt = memoryStore.appointments.find(a => a.appointment_id === appointment_id);
      if (!appt) return res.status(404).json({ error: 'Appointment not found.' });

      const meta = parseAppointmentReason(appt.reason, appt.booking_status);
      meta.workflow_status = 'REJECTED';
      meta.rejection_reason = cleanRejection;
      appt.reason = serializeAppointmentReason(meta);
      appt.booking_status = 'CANCELLED';
      appt.active_availability_id = null;

      const slot = memoryStore.counsellor_availability.find(s => s.availability_id === appt.availability_id);
      if (slot) slot.is_available = 1;

      return res.json({
        message: 'Appointment request rejected. The availability slot has been reopened.',
        appointment: formatAppointmentResponse(appt, true)
      });
    }
  } catch (err: any) {
    console.error('[Appointment Error] Failed to reject appointment:', err);
    return res.status(500).json({ error: 'Failed to reject appointment.' });
  }
});

// View Student's Appointments (Student Only)
appointmentRouter.get('/student', requireAuth, requireRole('STUDENT'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const student_id = req.user!.id;

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      const query = `
        SELECT a.appointment_id, a.student_id, a.availability_id, a.booking_status, a.reason,
               a.booked_at, a.updated_at, a.active_availability_id,
               ca.slot_start, ca.slot_end,
               c.full_name AS counsellor_name, c.email AS counsellor_email, c.specialization
        FROM appointments a
        JOIN counsellor_availability ca ON a.availability_id = ca.availability_id
        JOIN counsellors c ON ca.counsellor_id = c.counsellor_id
        WHERE a.student_id = ?
        ORDER BY ca.slot_start DESC
      `;
      const [rows]: any = await pool.query(query, [student_id]);
      const formatted = rows.map((r: any) => formatAppointmentResponse(r, false));
      return res.json({ appointments: formatted });
    } else {
      const appointments = memoryStore.getStudentAppointments(student_id);
      const formatted = appointments.map((r: any) => formatAppointmentResponse(r, false));
      return res.json({ appointments: formatted });
    }
  } catch (err: any) {
    console.error('[Appointment Error] Failed to get student appointments:', err);
    return res.status(500).json({ error: 'Failed to retrieve appointments.' });
  }
});

// View Counsellor's Assigned Appointments (Counsellor Only)
appointmentRouter.get('/counsellor', requireAuth, requireRole('COUNSELLOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const counsellor_id = req.user!.id;

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      const query = `
        SELECT a.appointment_id, a.student_id, a.availability_id, a.booking_status, a.reason,
               a.booked_at, a.updated_at, a.active_availability_id,
               ca.slot_start, ca.slot_end,
               s.full_name AS student_name, s.email AS student_email
        FROM appointments a
        JOIN counsellor_availability ca ON a.availability_id = ca.availability_id
        JOIN students s ON a.student_id = s.student_id
        WHERE ca.counsellor_id = ?
        ORDER BY ca.slot_start ASC
      `;
      const [rows]: any = await pool.query(query, [counsellor_id]);
      const formatted = rows.map((r: any) => formatAppointmentResponse(r, true));
      return res.json({ appointments: formatted });
    } else {
      const appointments = memoryStore.getCounsellorAppointments(counsellor_id);
      const formatted = appointments.map((r: any) => formatAppointmentResponse(r, true));
      return res.json({ appointments: formatted });
    }
  } catch (err: any) {
    console.error('[Appointment Error] Failed to get counsellor appointments:', err);
    return res.status(500).json({ error: 'Failed to retrieve assigned appointments.' });
  }
});

// Counsellor's Authorized Students List
appointmentRouter.get('/counsellor/authorized-students', requireAuth, requireRole('COUNSELLOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const counsellor_id = req.user!.id;

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      const query = `
        SELECT s.student_id, s.full_name, s.email, s.created_at,
               COUNT(a.appointment_id) AS total_sessions,
               MAX(ca.slot_start) AS latest_session_date
        FROM students s
        JOIN appointments a ON s.student_id = a.student_id
        JOIN counsellor_availability ca ON a.availability_id = ca.availability_id
        WHERE ca.counsellor_id = ? AND a.booking_status != 'CANCELLED'
        GROUP BY s.student_id, s.full_name, s.email, s.created_at
        ORDER BY latest_session_date DESC
      `;
      const [students]: any = await pool.query(query, [counsellor_id]);
      return res.json({ students });
    } else {
      const appts = memoryStore.appointments.filter(a => {
        const slot = memoryStore.counsellor_availability.find(s => s.availability_id === a.availability_id);
        return slot?.counsellor_id === counsellor_id && a.booking_status !== 'CANCELLED';
      });

      const studentMap = new Map<number, any>();
      for (const a of appts) {
        const student = memoryStore.findStudentById(a.student_id);
        if (student) {
          const existing = studentMap.get(student.student_id);
          const slot = memoryStore.counsellor_availability.find(s => s.availability_id === a.availability_id);
          if (existing) {
            existing.total_sessions += 1;
            if (slot && slot.slot_start > existing.latest_session_date) {
              existing.latest_session_date = slot.slot_start;
            }
          } else {
            studentMap.set(student.student_id, {
              student_id: student.student_id,
              full_name: student.full_name,
              email: student.email,
              created_at: student.created_at,
              total_sessions: 1,
              latest_session_date: slot?.slot_start || student.created_at
            });
          }
        }
      }
      return res.json({ students: Array.from(studentMap.values()) });
    }
  } catch (err: any) {
    console.error('[Appointment Error] Failed to fetch authorized students:', err);
    return res.status(500).json({ error: 'Failed to retrieve authorized student list.' });
  }
});

// Cancel Appointment (Student or Assigned Counsellor)
appointmentRouter.post('/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const appointment_id = parseInt(req.params.id, 10);

    if (isNaN(appointment_id)) {
      return res.status(400).json({ error: 'Invalid appointment ID.' });
    }

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const [rows]: any = await connection.query(
          `SELECT a.*, ca.counsellor_id 
           FROM appointments a
           JOIN counsellor_availability ca ON a.availability_id = ca.availability_id
           WHERE a.appointment_id = ? FOR UPDATE`,
          [appointment_id]
        );

        if (rows.length === 0) {
          await connection.rollback();
          return res.status(404).json({ error: 'Appointment not found.' });
        }

        const appt = rows[0];

        // Authorization check: must be the student or the assigned counsellor
        if (user.role === 'STUDENT' && appt.student_id !== user.id) {
          await connection.rollback();
          return res.status(403).json({ error: 'Unauthorized to cancel this appointment.' });
        }
        if (user.role === 'COUNSELLOR' && appt.counsellor_id !== user.id) {
          await connection.rollback();
          return res.status(403).json({ error: 'Unauthorized to cancel this appointment.' });
        }

        if (appt.booking_status === 'CANCELLED') {
          await connection.rollback();
          return res.status(400).json({ error: 'Appointment is already cancelled.' });
        }

        const meta = parseAppointmentReason(appt.reason, appt.booking_status);
        meta.workflow_status = 'CANCELLED';
        const updatedReason = serializeAppointmentReason(meta);

        // Set status to CANCELLED and clear active_availability_id to release unique constraint
        await connection.query(
          `UPDATE appointments 
           SET booking_status = 'CANCELLED', active_availability_id = NULL, reason = ?, updated_at = NOW() 
           WHERE appointment_id = ?`,
          [updatedReason, appointment_id]
        );

        // Make the availability slot open again
        await connection.query(
          'UPDATE counsellor_availability SET is_available = 1 WHERE availability_id = ?',
          [appt.availability_id]
        );

        await connection.commit();
        return res.json({ message: 'Appointment cancelled successfully. The slot has been released.' });
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } else {
      try {
        memoryStore.cancelAppointment(appointment_id, {
          student_id: user.role === 'STUDENT' ? user.id : undefined,
          counsellor_id: user.role === 'COUNSELLOR' ? user.id : undefined
        });
        return res.json({ message: 'Appointment cancelled successfully. The slot has been released.' });
      } catch (err: any) {
        return res.status(400).json({ error: err.message });
      }
    }
  } catch (err: any) {
    console.error('[Appointment Error] Failed to cancel appointment:', err);
    return res.status(500).json({ error: 'Failed to cancel appointment.' });
  }
});

// Complete Appointment (Assigned Counsellor Only)
appointmentRouter.post('/:id/complete', requireAuth, requireRole('COUNSELLOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const counsellor_id = req.user!.id;
    const appointment_id = parseInt(req.params.id, 10);

    if (isNaN(appointment_id)) {
      return res.status(400).json({ error: 'Invalid appointment ID.' });
    }

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const [rows]: any = await connection.query(
          `SELECT a.*, ca.counsellor_id 
           FROM appointments a
           JOIN counsellor_availability ca ON a.availability_id = ca.availability_id
           WHERE a.appointment_id = ? FOR UPDATE`,
          [appointment_id]
        );

        if (rows.length === 0) {
          await connection.rollback();
          return res.status(404).json({ error: 'Appointment not found.' });
        }

        const appt = rows[0];
        if (appt.counsellor_id !== counsellor_id) {
          await connection.rollback();
          return res.status(403).json({ error: 'Unauthorized: Only the assigned counsellor can complete this appointment.' });
        }

        const meta = parseAppointmentReason(appt.reason, appt.booking_status);
        meta.workflow_status = 'COMPLETED';
        const updatedReason = serializeAppointmentReason(meta);

        await connection.query(
          `UPDATE appointments 
           SET booking_status = 'COMPLETED', active_availability_id = NULL, reason = ?, updated_at = NOW() 
           WHERE appointment_id = ?`,
          [updatedReason, appointment_id]
        );

        await connection.commit();
        return res.json({ message: 'Appointment marked as completed.' });
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } else {
      try {
        memoryStore.completeAppointment(appointment_id, counsellor_id);
        return res.json({ message: 'Appointment marked as completed.' });
      } catch (err: any) {
        return res.status(400).json({ error: err.message });
      }
    }
  } catch (err: any) {
    console.error('[Appointment Error] Failed to complete appointment:', err);
    return res.status(500).json({ error: 'Failed to complete appointment.' });
  }
});
