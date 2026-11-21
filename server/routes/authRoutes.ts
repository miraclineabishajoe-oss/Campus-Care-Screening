import { Router, Response } from 'express';
import { 
  getMySQLPool, 
  isUsingLiveMySQL, 
  memoryStore, 
  StudentRecord, 
  CounsellorRecord 
} from '../db.ts';
import { 
  hashPassword, 
  verifyPassword, 
  signToken, 
  requireAuth, 
  AuthenticatedRequest 
} from '../auth.ts';

export const authRouter = Router();

// Student Registration
authRouter.post('/student/register', async (req, res: Response) => {
  try {
    const { full_name, email, password } = req.body;

    // Validation
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0) {
      return res.status(400).json({ error: 'Full name is required (up to 100 characters).' });
    }
    if (full_name.length > 100) {
      return res.status(400).json({ error: 'Full name cannot exceed 100 characters.' });
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (email.length > 255) {
      return res.status(400).json({ error: 'Email cannot exceed 255 characters.' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const trimmedName = full_name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const password_hash = await hashPassword(password);

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      // Check existing email in students table
      const [existing]: any = await pool.query('SELECT student_id FROM students WHERE email = ?', [cleanEmail]);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'This email is already registered as a student.' });
      }

      const [result]: any = await pool.query(
        'INSERT INTO students (full_name, email, password_hash) VALUES (?, ?, ?)',
        [trimmedName, cleanEmail, password_hash]
      );

      const studentId = result.insertId;
      const user = {
        id: studentId,
        email: cleanEmail,
        name: trimmedName,
        role: 'STUDENT' as const
      };
      const token = signToken(user);
      return res.status(201).json({
        message: 'Student account registered successfully.',
        token,
        user
      });
    } else {
      const existing = memoryStore.findStudentByEmail(cleanEmail);
      if (existing) {
        return res.status(409).json({ error: 'This email is already registered as a student.' });
      }

      const student = memoryStore.createStudent(trimmedName, cleanEmail, password_hash);
      const user = {
        id: student.student_id,
        email: student.email,
        name: student.full_name,
        role: 'STUDENT' as const
      };
      const token = signToken(user);
      return res.status(201).json({
        message: 'Student account registered successfully.',
        token,
        user
      });
    }
  } catch (err: any) {
    console.error('[Auth Error] Student registration failed:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Student Login
authRouter.post('/student/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    let student: StudentRecord | null = null;
    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      const [rows]: any = await pool.query('SELECT * FROM students WHERE email = ?', [cleanEmail]);
      if (rows.length > 0) {
        student = rows[0];
      }
    }
    if (!student) {
      student = memoryStore.findStudentByEmail(cleanEmail) || null;
    }

    if (!student) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordValid = await verifyPassword(password, student.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = {
      id: student.student_id,
      email: student.email,
      name: student.full_name,
      role: 'STUDENT' as const
    };
    const token = signToken(user);

    return res.json({
      message: 'Login successful.',
      token,
      user
    });
  } catch (err: any) {
    console.error('[Auth Error] Student login failed:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Counsellor Registration (Mandatory: is_active = 0)
authRouter.post('/counsellor/register', async (req, res: Response) => {
  try {
    const { full_name, email, password, specialization } = req.body;

    if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0) {
      return res.status(400).json({ error: 'Full name is required (up to 100 characters).' });
    }
    if (full_name.length > 100) {
      return res.status(400).json({ error: 'Full name cannot exceed 100 characters.' });
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (email.length > 255) {
      return res.status(400).json({ error: 'Email cannot exceed 255 characters.' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const cleanSpec = specialization ? String(specialization).trim().slice(0, 100) : null;
    const trimmedName = full_name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const password_hash = await hashPassword(password);

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      const [existing]: any = await pool.query('SELECT counsellor_id FROM counsellors WHERE email = ?', [cleanEmail]);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'This email is already registered as a counsellor.' });
      }

      // Explicitly set is_active = 0 for newly registered counsellors
      await pool.query(
        'INSERT INTO counsellors (full_name, email, password_hash, specialization, is_active) VALUES (?, ?, ?, ?, 0)',
        [trimmedName, cleanEmail, password_hash, cleanSpec]
      );

      return res.status(201).json({
        message: 'Registration submitted successfully. Your account is pending administrative verification before you can log in.',
        is_active: 0
      });
    } else {
      const existing = memoryStore.findCounsellorByEmail(cleanEmail);
      if (existing) {
        return res.status(409).json({ error: 'This email is already registered as a counsellor.' });
      }

      const counsellor = memoryStore.createCounsellor(trimmedName, cleanEmail, password_hash, cleanSpec);
      return res.status(201).json({
        message: 'Registration submitted successfully. Your account is pending administrative verification before you can log in.',
        is_active: counsellor.is_active
      });
    }
  } catch (err: any) {
    console.error('[Auth Error] Counsellor registration failed:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Counsellor Login (Mandatory: Reject if is_active === 0)
authRouter.post('/counsellor/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    let counsellor: CounsellorRecord | null = null;
    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      const [rows]: any = await pool.query('SELECT * FROM counsellors WHERE email = ?', [cleanEmail]);
      if (rows.length > 0) {
        counsellor = rows[0];
      }
    }
    if (!counsellor) {
      counsellor = memoryStore.findCounsellorByEmail(cleanEmail) || null;
    }

    if (!counsellor) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordValid = await verifyPassword(password, counsellor.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check is_active flag
    if (counsellor.is_active !== 1) {
      return res.status(403).json({
        error: 'Your counsellor account is currently pending administrative approval. You will receive access once campus health administration verifies your credentials.',
        is_active: 0
      });
    }

    const user = {
      id: counsellor.counsellor_id,
      email: counsellor.email,
      name: counsellor.full_name,
      role: 'COUNSELLOR' as const,
      is_active: 1
    };
    const token = signToken(user);

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        ...user,
        specialization: counsellor.specialization
      }
    });
  } catch (err: any) {
    console.error('[Auth Error] Counsellor login failed:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Profile / Current User endpoint
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role === 'STUDENT') {
      let student: StudentRecord | null = null;
      if (isUsingLiveMySQL()) {
        const pool = getMySQLPool()!;
        const [rows]: any = await pool.query('SELECT student_id, full_name, email, created_at FROM students WHERE student_id = ?', [user.id]);
        if (rows.length > 0) student = rows[0];
      }
      if (!student) {
        student = memoryStore.findStudentById(user.id) || null;
      }
      if (!student) return res.status(404).json({ error: 'Student record not found.' });

      return res.json({
        id: student.student_id,
        full_name: student.full_name,
        email: student.email,
        role: 'STUDENT',
        created_at: student.created_at
      });
    } else {
      let counsellor: CounsellorRecord | null = null;
      if (isUsingLiveMySQL()) {
        const pool = getMySQLPool()!;
        const [rows]: any = await pool.query('SELECT counsellor_id, full_name, email, specialization, is_active, created_at FROM counsellors WHERE counsellor_id = ?', [user.id]);
        if (rows.length > 0) counsellor = rows[0];
      }
      if (!counsellor) {
        counsellor = memoryStore.findCounsellorById(user.id) || null;
      }
      if (!counsellor) return res.status(404).json({ error: 'Counsellor record not found.' });

      return res.json({
        id: counsellor.counsellor_id,
        full_name: counsellor.full_name,
        email: counsellor.email,
        specialization: counsellor.specialization,
        is_active: counsellor.is_active,
        role: 'COUNSELLOR',
        created_at: counsellor.created_at
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});
