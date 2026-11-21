import { Router, Response } from 'express';
import { 
  getMySQLPool, 
  isUsingLiveMySQL, 
  memoryStore,
  slotMetaStore,
  SlotSessionMeta 
} from '../db.ts';
import { 
  requireAuth, 
  requireRole, 
  AuthenticatedRequest 
} from '../auth.ts';

export const availabilityRouter = Router();

// Public / Student Available Slots Listing
availabilityRouter.get('/', async (req, res: Response) => {
  try {
    const counsellorIdParam = req.query.counsellor_id ? parseInt(String(req.query.counsellor_id), 10) : undefined;
    const specParam = req.query.specialization ? String(req.query.specialization) : undefined;

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      let query = `
        SELECT ca.availability_id, ca.counsellor_id, ca.slot_start, ca.slot_end, ca.is_available,
               c.full_name AS counsellor_name, c.email AS counsellor_email, c.specialization
        FROM counsellor_availability ca
        JOIN counsellors c ON ca.counsellor_id = c.counsellor_id
        LEFT JOIN appointments a ON ca.availability_id = a.active_availability_id
        WHERE ca.is_available = 1 
          AND ca.slot_start > NOW()
          AND c.is_active = 1
          AND a.appointment_id IS NULL
      `;
      const params: any[] = [];

      if (counsellorIdParam && !isNaN(counsellorIdParam)) {
        query += ' AND ca.counsellor_id = ?';
        params.push(counsellorIdParam);
      }
      if (specParam) {
        query += ' AND LOWER(c.specialization) LIKE LOWER(?)';
        params.push(`%${specParam}%`);
      }

      query += ' ORDER BY ca.slot_start ASC';

      const [rows]: any = await pool.query(query, params);
      const slots = rows.map((r: any) => {
        const meta = slotMetaStore.get(r.availability_id) || {
          session_mode: 'OFFLINE',
          location: 'Campus Health Center, Room 204'
        };
        return {
          ...r,
          session_mode: meta.session_mode,
          location: meta.session_mode === 'OFFLINE' ? (meta.location || 'Campus Health Center, Room 204') : null,
          notes: meta.notes || null
        };
      });
      return res.json({ slots });
    } else {
      const slots = memoryStore.getAvailableSlots({
        counsellor_id: counsellorIdParam,
        specialization: specParam
      }).map(s => {
        const meta = slotMetaStore.get(s.availability_id) || {
          session_mode: 'OFFLINE',
          location: 'Campus Health Center, Room 204'
        };
        return {
          ...s,
          session_mode: meta.session_mode,
          location: meta.session_mode === 'OFFLINE' ? (meta.location || 'Campus Health Center, Room 204') : null,
          notes: meta.notes || null
        };
      });
      return res.json({ slots });
    }
  } catch (err: any) {
    console.error('[Availability Error] Failed to fetch slots:', err);
    return res.status(500).json({ error: 'Failed to retrieve available slots.' });
  }
});

// Counsellor's own slots
availabilityRouter.get('/my-slots', requireAuth, requireRole('COUNSELLOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const counsellor_id = req.user!.id;

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      const query = `
        SELECT ca.availability_id, ca.counsellor_id, ca.slot_start, ca.slot_end, ca.is_available, ca.created_at,
               a.appointment_id, a.booking_status, a.reason, s.full_name AS student_name, s.email AS student_email
        FROM counsellor_availability ca
        LEFT JOIN appointments a ON ca.availability_id = a.availability_id AND a.booking_status = 'BOOKED'
        LEFT JOIN students s ON a.student_id = s.student_id
        WHERE ca.counsellor_id = ?
        ORDER BY ca.slot_start ASC
      `;
      const [rows]: any = await pool.query(query, [counsellor_id]);
      const slots = rows.map((r: any) => {
        const meta = slotMetaStore.get(r.availability_id) || {
          session_mode: 'OFFLINE',
          location: 'Campus Health Center, Room 204'
        };
        return {
          availability_id: r.availability_id,
          counsellor_id: r.counsellor_id,
          slot_start: r.slot_start,
          slot_end: r.slot_end,
          is_available: r.is_available,
          created_at: r.created_at,
          session_mode: meta.session_mode,
          meeting_link: meta.meeting_link || null,
          location: meta.location || null,
          notes: meta.notes || null,
          is_booked: !!r.appointment_id,
          booking: r.appointment_id ? {
            appointment_id: r.appointment_id,
            booking_status: r.booking_status,
            reason: r.reason,
            student_name: r.student_name,
            student_email: r.student_email
          } : null
        };
      });
      return res.json({ slots });
    } else {
      const slots = memoryStore.getCounsellorSlots(counsellor_id).map(s => {
        const meta = slotMetaStore.get(s.availability_id) || {
          session_mode: 'OFFLINE',
          location: 'Campus Health Center, Room 204'
        };
        return {
          ...s,
          session_mode: meta.session_mode,
          meeting_link: meta.meeting_link || null,
          location: meta.location || null,
          notes: meta.notes || null
        };
      });
      return res.json({ slots });
    }
  } catch (err: any) {
    console.error('[Availability Error] Failed to fetch counsellor slots:', err);
    return res.status(500).json({ error: 'Failed to retrieve your availability slots.' });
  }
});

// Counsellor Creates a New Availability Slot
availabilityRouter.post('/', requireAuth, requireRole('COUNSELLOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const counsellor_id = req.user!.id;
    const { slot_start, slot_end, session_mode, meeting_link, location, notes } = req.body;

    if (!slot_start || !slot_end) {
      return res.status(400).json({ error: 'slot_start and slot_end date-times are required.' });
    }

    const startDt = new Date(slot_start);
    const endDt = new Date(slot_end);

    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO-8601 or YYYY-MM-DD HH:MM:SS.' });
    }

    // Constraint: chk_slot_time (slot_end > slot_start)
    if (endDt.getTime() <= startDt.getTime()) {
      return res.status(400).json({ error: 'Slot end time must be after slot start time.' });
    }

    if (startDt.getTime() < Date.now() - 60000) {
      return res.status(400).json({ error: 'Cannot create availability slots in the past.' });
    }

    // Session Mode validation
    const mode = session_mode === 'ONLINE' ? 'ONLINE' : 'OFFLINE';
    let cleanMeetingLink: string | null = null;
    let cleanLocation: string | null = null;

    if (mode === 'ONLINE') {
      if (!meeting_link || typeof meeting_link !== 'string' || !/^https?:\/\//i.test(meeting_link.trim())) {
        return res.status(400).json({ error: 'A valid meeting URL starting with http:// or https:// is required for online sessions.' });
      }
      cleanMeetingLink = meeting_link.trim();
    } else {
      if (session_mode === 'OFFLINE' && (!location || typeof location !== 'string' || !location.trim())) {
        return res.status(400).json({ error: 'A physical room or campus location is required for offline sessions.' });
      }
      cleanLocation = (location && typeof location === 'string' && location.trim()) 
        ? location.trim().slice(0, 100) 
        : 'Campus Counselling Room 204';
    }

    const cleanNotes = notes ? String(notes).trim().slice(0, 200) : null;
    const formatMySQLDate = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
    const formattedStart = formatMySQLDate(startDt);
    const formattedEnd = formatMySQLDate(endDt);

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;

      // Prevent overlapping slots for the same counsellor
      const [overlap]: any = await pool.query(
        `SELECT availability_id FROM counsellor_availability 
         WHERE counsellor_id = ? 
           AND ((slot_start < ? AND slot_end > ?) OR (slot_start >= ? AND slot_start < ?))`,
        [counsellor_id, formattedEnd, formattedStart, formattedStart, formattedEnd]
      );
      if (overlap.length > 0) {
        return res.status(409).json({ error: 'You already have an availability slot overlapping with this time period.' });
      }

      try {
        const [result]: any = await pool.query(
          'INSERT INTO counsellor_availability (counsellor_id, slot_start, slot_end, is_available) VALUES (?, ?, ?, 1)',
          [counsellor_id, formattedStart, formattedEnd]
        );

        const slotId = result.insertId;
        slotMetaStore.set(slotId, {
          session_mode: mode,
          meeting_link: cleanMeetingLink,
          location: cleanLocation,
          notes: cleanNotes
        });

        return res.status(201).json({
          message: 'Availability slot published successfully.',
          slot: {
            availability_id: slotId,
            counsellor_id,
            slot_start: formattedStart,
            slot_end: formattedEnd,
            is_available: 1,
            session_mode: mode,
            meeting_link: cleanMeetingLink,
            location: cleanLocation,
            notes: cleanNotes
          }
        });
      } catch (dbErr: any) {
        if (dbErr.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'You have already published an identical availability slot for this time range.' });
        }
        if (dbErr.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
          return res.status(400).json({ error: 'Database check constraint violation: slot_end must be greater than slot_start.' });
        }
        throw dbErr;
      }
    } else {
      try {
        const slot = memoryStore.createSlot(counsellor_id, formattedStart, formattedEnd);
        slotMetaStore.set(slot.availability_id, {
          session_mode: mode,
          meeting_link: cleanMeetingLink,
          location: cleanLocation,
          notes: cleanNotes
        });

        return res.status(201).json({
          message: 'Availability slot published successfully.',
          slot: {
            ...slot,
            session_mode: mode,
            meeting_link: cleanMeetingLink,
            location: cleanLocation,
            notes: cleanNotes
          }
        });
      } catch (err: any) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'You have already published an identical availability slot for this time range.' });
        }
        if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
          return res.status(400).json({ error: err.message });
        }
        throw err;
      }
    }
  } catch (err: any) {
    console.error('[Availability Error] Failed to create slot:', err);
    return res.status(500).json({ error: 'Internal server error while publishing slot.' });
  }
});

// Counsellor Deletes Unbooked Slot
availabilityRouter.delete('/:id', requireAuth, requireRole('COUNSELLOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const counsellor_id = req.user!.id;
    const availability_id = parseInt(req.params.id, 10);

    if (isNaN(availability_id)) {
      return res.status(400).json({ error: 'Invalid availability ID.' });
    }

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      // Check if slot has active booking
      const [activeAppts]: any = await pool.query(
        'SELECT appointment_id FROM appointments WHERE availability_id = ? AND booking_status = "BOOKED"',
        [availability_id]
      );
      if (activeAppts.length > 0) {
        return res.status(400).json({ error: 'Cannot remove a slot that is currently booked by a student. Please cancel the appointment first.' });
      }

      // Check if any historical appointments reference this slot
      const [histAppts]: any = await pool.query(
        'SELECT appointment_id FROM appointments WHERE availability_id = ?',
        [availability_id]
      );

      if (histAppts.length > 0) {
        // Preserve historical appointment foreign key integrity by closing slot availability
        const [resUpd]: any = await pool.query(
          'UPDATE counsellor_availability SET is_available = 0 WHERE availability_id = ? AND counsellor_id = ?',
          [availability_id, counsellor_id]
        );
        if (resUpd.affectedRows === 0) {
          return res.status(404).json({ error: 'Slot not found or unauthorized to delete.' });
        }
        return res.json({ message: 'Availability slot removed successfully.' });
      }

      const [resDel]: any = await pool.query(
        'DELETE FROM counsellor_availability WHERE availability_id = ? AND counsellor_id = ?',
        [availability_id, counsellor_id]
      );
      if (resDel.affectedRows === 0) {
        return res.status(404).json({ error: 'Slot not found or unauthorized to delete.' });
      }

      return res.json({ message: 'Availability slot removed successfully.' });
    } else {
      try {
        const success = memoryStore.deleteSlot(availability_id, counsellor_id);
        if (!success) {
          return res.status(404).json({ error: 'Slot not found or unauthorized to delete.' });
        }
        return res.json({ message: 'Availability slot removed successfully.' });
      } catch (err: any) {
        return res.status(400).json({ error: err.message });
      }
    }
  } catch (err: any) {
    console.error('[Availability Error] Failed to delete slot:', err);
    return res.status(500).json({ error: 'Internal server error while removing slot.' });
  }
});
