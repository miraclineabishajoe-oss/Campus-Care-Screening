import { Router, Response } from 'express';
import { 
  getMySQLPool, 
  isUsingLiveMySQL, 
  memoryStore 
} from '../db.ts';
import { 
  requireAuth, 
  requireRole, 
  AuthenticatedRequest 
} from '../auth.ts';

export const screeningRouter = Router();

// Submit Wellness Screening (Student Only)
screeningRouter.post('/', requireAuth, requireRole('STUDENT'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const student_id = req.user!.id;
    const { responses, overall_score, screening_summary } = req.body;

    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({ error: 'Valid responses JSON object is required.' });
    }

    let parsedScore: number | null = null;
    if (overall_score !== undefined && overall_score !== null) {
      parsedScore = Number(overall_score);
      if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 999.99) {
        return res.status(400).json({ error: 'overall_score must be a valid non-negative number fitting decimal(5,2).' });
      }
    }

    let cleanSummary: string | null = null;
    if (screening_summary !== undefined && screening_summary !== null) {
      cleanSummary = String(screening_summary).trim().slice(0, 255);
    }

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      const responsesJson = JSON.stringify(responses);
      const [result]: any = await pool.query(
        'INSERT INTO screenings (student_id, responses, overall_score, screening_summary) VALUES (?, ?, ?, ?)',
        [student_id, responsesJson, parsedScore, cleanSummary]
      );

      const screening_id = result.insertId;
      const [saved]: any = await pool.query('SELECT * FROM screenings WHERE screening_id = ?', [screening_id]);

      return res.status(201).json({
        message: 'Wellness screening saved successfully.',
        screening: saved[0],
        disclaimer: 'This screening is informational and does not replace a clinical psychiatric or medical evaluation.'
      });
    } else {
      const screening = memoryStore.createScreening(student_id, responses, parsedScore, cleanSummary);
      return res.status(201).json({
        message: 'Wellness screening saved successfully.',
        screening,
        disclaimer: 'This screening is informational and does not replace a clinical psychiatric or medical evaluation.'
      });
    }
  } catch (err: any) {
    console.error('[Screening Error] Failed to submit screening:', err);
    return res.status(500).json({ error: 'Internal server error while saving screening.' });
  }
});

// Get Student's Screening History (Student Only)
screeningRouter.get('/history', requireAuth, requireRole('STUDENT'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const student_id = req.user!.id;

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      const [rows]: any = await pool.query(
        'SELECT screening_id, student_id, responses, overall_score, screening_summary, submitted_at FROM screenings WHERE student_id = ? ORDER BY submitted_at DESC',
        [student_id]
      );
      return res.json({ screenings: rows });
    } else {
      const rows = memoryStore.getStudentScreenings(student_id);
      return res.json({ screenings: rows });
    }
  } catch (err: any) {
    console.error('[Screening Error] Failed to retrieve history:', err);
    return res.status(500).json({ error: 'Failed to retrieve screening history.' });
  }
});

// Counsellor Access to Student's Screening Summary
// Allowed ONLY if the student has an appointment booked with this counsellor
screeningRouter.get('/counsellor/:studentId', requireAuth, requireRole('COUNSELLOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const counsellor_id = req.user!.id;
    const student_id = parseInt(req.params.studentId, 10);

    if (isNaN(student_id)) {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      // Verify counsellor has an active or completed appointment with this student
      const [authRows]: any = await pool.query(
        `SELECT 1 FROM appointments a 
         JOIN counsellor_availability ca ON a.availability_id = ca.availability_id 
         WHERE a.student_id = ? AND ca.counsellor_id = ? AND a.booking_status != 'CANCELLED' LIMIT 1`,
        [student_id, counsellor_id]
      );

      if (authRows.length === 0) {
        return res.status(403).json({ 
          error: 'Access denied: You can only view screening summaries for students with whom you share a counselling appointment.' 
        });
      }

      // Return screening summaries without raw responses to maintain student privacy
      const [rows]: any = await pool.query(
        'SELECT screening_id, student_id, overall_score, screening_summary, submitted_at FROM screenings WHERE student_id = ? ORDER BY submitted_at DESC',
        [student_id]
      );
      return res.json({ screenings: rows });
    } else {
      const hasAccess = memoryStore.hasCounsellorStudentAccess(counsellor_id, student_id);
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied: You can only view screening summaries for students with whom you share a counselling appointment.' 
        });
      }

      const rows = memoryStore.getStudentScreenings(student_id).map(s => ({
        screening_id: s.screening_id,
        student_id: s.student_id,
        overall_score: s.overall_score,
        screening_summary: s.screening_summary,
        submitted_at: s.submitted_at
      }));
      return res.json({ screenings: rows });
    }
  } catch (err: any) {
    console.error('[Screening Error] Counsellor access error:', err);
    return res.status(500).json({ error: 'Failed to retrieve screening data.' });
  }
});

// Counsellor Aggregate Wellness Analytics & Reports
screeningRouter.get('/analytics', requireAuth, requireRole('COUNSELLOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      const [screenings]: any = await pool.query(
        'SELECT screening_id, student_id, overall_score, screening_summary, submitted_at FROM screenings ORDER BY submitted_at ASC'
      );

      const total = screenings.length;
      let sumScore = 0;
      let mildCount = 0;
      let moderateCount = 0;
      let severeCount = 0;
      const studentIds = new Set<number>();
      const timelineMap: Record<string, { count: number; totalScore: number }> = {};

      for (const s of screenings) {
        studentIds.add(s.student_id);
        const score = Number(s.overall_score) || 0;
        sumScore += score;

        if (score < 10) mildCount++;
        else if (score < 15) moderateCount++;
        else severeCount++;

        const dateStr = s.submitted_at instanceof Date 
          ? s.submitted_at.toISOString().slice(0, 10) 
          : String(s.submitted_at).slice(0, 10);
        const monthKey = dateStr.slice(0, 7); // YYYY-MM
        if (!timelineMap[monthKey]) {
          timelineMap[monthKey] = { count: 0, totalScore: 0 };
        }
        timelineMap[monthKey].count += 1;
        timelineMap[monthKey].totalScore += score;
      }

      const timeline = Object.keys(timelineMap).sort().map(month => ({
        period: month,
        count: timelineMap[month].count,
        avg_score: Number((timelineMap[month].totalScore / timelineMap[month].count).toFixed(1))
      }));

      return res.json({
        total_screenings: total,
        unique_students_screened: studentIds.size,
        average_score: total > 0 ? Number((sumScore / total).toFixed(1)) : 0,
        distribution: {
          mild: { count: mildCount, label: 'Mild Stress (0-9)', percent: total > 0 ? Math.round((mildCount / total) * 100) : 0 },
          moderate: { count: moderateCount, label: 'Moderate Distress (10-14)', percent: total > 0 ? Math.round((moderateCount / total) * 100) : 0 },
          severe: { count: severeCount, label: 'Elevated / Severe (15+)', percent: total > 0 ? Math.round((severeCount / total) * 100) : 0 }
        },
        timeline
      });
    } else {
      const screenings = memoryStore.screenings;
      const total = screenings.length;
      let sumScore = 0;
      let mildCount = 0;
      let moderateCount = 0;
      let severeCount = 0;
      const studentIds = new Set<number>();
      const timelineMap: Record<string, { count: number; totalScore: number }> = {};

      for (const s of screenings) {
        studentIds.add(s.student_id);
        const score = Number(s.overall_score) || 0;
        sumScore += score;

        if (score < 10) mildCount++;
        else if (score < 15) moderateCount++;
        else severeCount++;

        const monthKey = s.submitted_at.slice(0, 7);
        if (!timelineMap[monthKey]) {
          timelineMap[monthKey] = { count: 0, totalScore: 0 };
        }
        timelineMap[monthKey].count += 1;
        timelineMap[monthKey].totalScore += score;
      }

      const timeline = Object.keys(timelineMap).sort().map(month => ({
        period: month,
        count: timelineMap[month].count,
        avg_score: Number((timelineMap[month].totalScore / timelineMap[month].count).toFixed(1))
      }));

      return res.json({
        total_screenings: total,
        unique_students_screened: studentIds.size,
        average_score: total > 0 ? Number((sumScore / total).toFixed(1)) : 0,
        distribution: {
          mild: { count: mildCount, label: 'Mild Stress (0-9)', percent: total > 0 ? Math.round((mildCount / total) * 100) : 0 },
          moderate: { count: moderateCount, label: 'Moderate Distress (10-14)', percent: total > 0 ? Math.round((moderateCount / total) * 100) : 0 },
          severe: { count: severeCount, label: 'Elevated / Severe (15+)', percent: total > 0 ? Math.round((severeCount / total) * 100) : 0 }
        },
        timeline
      });
    }
  } catch (err: any) {
    console.error('[Screening Error] Analytics calculation error:', err);
    return res.status(500).json({ error: 'Failed to generate analytics.' });
  }
});
