import { Router, Response } from 'express';
import crypto from 'crypto';
import { 
  getMySQLPool, 
  isUsingLiveMySQL, 
  memoryStore 
} from '../db.ts';
import { hashPassword } from '../auth.ts';

export const recoveryRouter = Router();

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Safely parses any date representation (string, Date, or timestamp) as UTC,
 * explicitly avoiding local-timezone interpretation when timezone offsets are absent.
 */
export function parseUtcDate(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  const str = String(dateInput).trim();
  if (!str) return null;

  // If already contains 'Z' or timezone offset '+/-HH:mm'
  if (str.endsWith('Z') || /[+-]\d{2}(:\d{2})?$/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  // Timezone-less string like "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DDTHH:mm:ss"
  // Interpret strictly as UTC by replacing space with 'T' and appending 'Z'
  const isoUtc = str.replace(' ', 'T') + 'Z';
  const d = new Date(isoUtc);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a Date object into a standard UTC datetime string "YYYY-MM-DD HH:mm:ss"
 */
export function formatUtcDateTime(date: Date = new Date()): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// Request Recovery Code
recoveryRouter.post('/request', async (req, res: Response) => {
  try {
    const { account_type, email } = req.body;

    if (!account_type || !['STUDENT', 'COUNSELLOR'].includes(account_type)) {
      return res.status(400).json({ error: 'Valid account_type (STUDENT or COUNSELLOR) is required.' });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanAccountType = account_type as 'STUDENT' | 'COUNSELLOR';

    // Uniform response message to prevent account enumeration (10-minute expiry window)
    const uniformResponse = {
      message: 'If an account is associated with this email address, a 6-digit verification code has been dispatched. Please check your inbox.',
      expires_in_minutes: 10
    };

    // Check if account exists
    let accountExists = false;
    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      const table = cleanAccountType === 'STUDENT' ? 'students' : 'counsellors';
      const [rows]: any = await pool.query(`SELECT 1 FROM ${table} WHERE email = ? LIMIT 1`, [cleanEmail]);
      accountExists = rows.length > 0;
    } else {
      accountExists = cleanAccountType === 'STUDENT' 
        ? !!memoryStore.findStudentByEmail(cleanEmail)
        : !!memoryStore.findCounsellorByEmail(cleanEmail);
    }

    if (!accountExists) {
      // Return uniform response without inserting record to prevent table pollution
      return res.json(uniformResponse);
    }

    // Generate 6-digit numeric code
    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const code_hash = sha256(rawCode);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // Strict 10-minute expiry
    const formattedExpiresAt = formatUtcDateTime(expiresAt);
    const formattedNow = formatUtcDateTime(now);

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      await pool.query(
        `INSERT INTO password_recovery 
         (account_type, email, code_hash, code_expires_at, attempt_count, last_sent_at) 
         VALUES (?, ?, ?, ?, 0, ?)`,
        [cleanAccountType, cleanEmail, code_hash, formattedExpiresAt, formattedNow]
      );
    } else {
      memoryStore.createRecoveryRequest(cleanAccountType, cleanEmail, code_hash, formattedExpiresAt);
    }

    // Return response with dev simulation code hint if in development mode
    const isDev = process.env.NODE_ENV !== 'production';
    return res.json({
      ...uniformResponse,
      ...(isDev ? { dev_code_hint: rawCode } : {})
    });
  } catch (err: any) {
    console.error('[Recovery Error] Failed to generate recovery code:', err);
    return res.status(500).json({ error: 'Internal server error while processing recovery request.' });
  }
});

// Verify 6-digit Code
recoveryRouter.post('/verify', async (req, res: Response) => {
  try {
    const { account_type, email, code } = req.body;

    if (!account_type || !['STUDENT', 'COUNSELLOR'].includes(account_type)) {
      return res.status(400).json({ error: 'Valid account_type (STUDENT or COUNSELLOR) is required.' });
    }
    if (!email || !code || String(code).trim().length !== 6) {
      return res.status(400).json({ error: 'Email and valid 6-digit code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanAccountType = account_type as 'STUDENT' | 'COUNSELLOR';
    const submittedCodeHash = sha256(String(code).trim());

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      const [rows]: any = await pool.query(
        `SELECT * FROM password_recovery 
         WHERE account_type = ? AND email = ? AND used_at IS NULL AND verified_at IS NULL AND code_expires_at > UTC_TIMESTAMP()
         ORDER BY created_at DESC LIMIT 1`,
        [cleanAccountType, cleanEmail]
      );

      if (rows.length === 0) {
        return res.status(400).json({ error: 'No active verification code found or code has expired. Please request a new code.' });
      }

      const recovery = rows[0];

      if (recovery.attempt_count >= 5) {
        return res.status(429).json({ error: 'Maximum verification attempts exceeded. Please request a new recovery code.' });
      }

      if (recovery.code_hash !== submittedCodeHash) {
        await pool.query(
          'UPDATE password_recovery SET attempt_count = attempt_count + 1 WHERE recovery_id = ?',
          [recovery.recovery_id]
        );
        const remaining = 4 - recovery.attempt_count;
        return res.status(400).json({ 
          error: `Invalid recovery code. ${remaining > 0 ? remaining + ' attempts remaining.' : 'Code locked.'}` 
        });
      }

      // Generate single-use random 64-char reset token
      const rawResetToken = crypto.randomBytes(32).toString('hex');
      const reset_token_hash = sha256(rawResetToken);
      const tokenExpiresAt = formatUtcDateTime(new Date(Date.now() + 30 * 60 * 1000));

      await pool.query(
        `UPDATE password_recovery 
         SET verified_at = UTC_TIMESTAMP(), reset_token_hash = ?, reset_token_expires_at = ? 
         WHERE recovery_id = ?`,
        [reset_token_hash, tokenExpiresAt, recovery.recovery_id]
      );

      return res.json({
        message: 'Recovery code verified successfully.',
        reset_token: rawResetToken
      });
    } else {
      const recovery = memoryStore.getLatestActiveRecovery(cleanAccountType, cleanEmail);
      if (!recovery) {
        return res.status(400).json({ error: 'No active verification code found or code has expired. Please request a new code.' });
      }

      // Single-use verification code enforcement:
      // Once verified to issue a reset token, it cannot be reused
      if (recovery.verified_at) {
        return res.status(400).json({ error: 'This verification code has already been used. Please request a new code.' });
      }

      // Expiry comparison safely grounded in UTC
      const expiryDate = parseUtcDate(recovery.code_expires_at);
      if (!expiryDate || expiryDate.getTime() <= Date.now()) {
        return res.status(400).json({ error: 'No active verification code found or code has expired. Please request a new code.' });
      }

      // Attempt limit enforcement (maximum 5 attempts)
      if (recovery.attempt_count >= 5) {
        return res.status(429).json({ error: 'Maximum verification attempts exceeded. Please request a new recovery code.' });
      }

      if (recovery.code_hash !== submittedCodeHash) {
        recovery.attempt_count += 1;
        const remaining = 5 - recovery.attempt_count;
        return res.status(400).json({ 
          error: `Invalid recovery code. ${remaining > 0 ? remaining + ' attempts remaining.' : 'Code locked.'}` 
        });
      }

      // Valid code: issue single-use reset token and mark verified
      const rawResetToken = crypto.randomBytes(32).toString('hex');
      recovery.verified_at = formatUtcDateTime(new Date());
      recovery.reset_token_hash = sha256(rawResetToken);
      recovery.reset_token_expires_at = formatUtcDateTime(new Date(Date.now() + 30 * 60 * 1000));

      return res.json({
        message: 'Recovery code verified successfully.',
        reset_token: rawResetToken
      });
    }
  } catch (err: any) {
    console.error('[Recovery Error] Failed to verify code:', err);
    return res.status(500).json({ error: 'Internal server error while verifying recovery code.' });
  }
});

// Reset Password
recoveryRouter.post('/reset', async (req, res: Response) => {
  try {
    const { reset_token, new_password } = req.body;

    if (!reset_token || typeof reset_token !== 'string') {
      return res.status(400).json({ error: 'Reset token is required.' });
    }
    if (!new_password || typeof new_password !== 'string' || new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const tokenHash = sha256(reset_token.trim());
    const new_password_hash = await hashPassword(new_password);

    if (isUsingLiveMySQL()) {
      const pool = getMySQLPool()!;
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const [rows]: any = await connection.query(
          `SELECT * FROM password_recovery 
           WHERE reset_token_hash = ? AND used_at IS NULL AND reset_token_expires_at > UTC_TIMESTAMP() 
           FOR UPDATE`,
          [tokenHash]
        );

        if (rows.length === 0) {
          await connection.rollback();
          return res.status(400).json({ error: 'Invalid or expired password reset token. Please restart recovery.' });
        }

        const recovery = rows[0];
        const table = recovery.account_type === 'STUDENT' ? 'students' : 'counsellors';

        // Update password hash
        await connection.query(
          `UPDATE ${table} SET password_hash = ? WHERE email = ?`,
          [new_password_hash, recovery.email]
        );

        // Invalidate reset token immediately (single-use token enforcement)
        await connection.query(
          'UPDATE password_recovery SET used_at = UTC_TIMESTAMP() WHERE recovery_id = ?',
          [recovery.recovery_id]
        );

        await connection.commit();
        return res.json({
          message: 'Password reset successfully! You can now log in with your new password.'
        });
      } catch (dbErr) {
        await connection.rollback();
        throw dbErr;
      } finally {
        connection.release();
      }
    } else {
      const recovery = memoryStore.findRecoveryByResetTokenHash(tokenHash);
      if (!recovery) {
        return res.status(400).json({ error: 'Invalid or expired password reset token. Please restart recovery.' });
      }

      // Single-use reset token check
      if (recovery.used_at) {
        return res.status(400).json({ error: 'This reset token has already been used. Please restart recovery.' });
      }

      // UTC expiry comparison
      const tokenExpiry = parseUtcDate(recovery.reset_token_expires_at);
      if (!tokenExpiry || tokenExpiry.getTime() <= Date.now()) {
        return res.status(400).json({ error: 'Invalid or expired password reset token. Please restart recovery.' });
      }

      if (recovery.account_type === 'STUDENT') {
        const student = memoryStore.findStudentByEmail(recovery.email);
        if (student) memoryStore.updateStudentPassword(student.student_id, new_password_hash);
      } else {
        const counsellor = memoryStore.findCounsellorByEmail(recovery.email);
        if (counsellor) memoryStore.updateCounsellorPassword(counsellor.counsellor_id, new_password_hash);
      }

      recovery.used_at = formatUtcDateTime(new Date());

      return res.json({
        message: 'Password reset successfully! You can now log in with your new password.'
      });
    }
  } catch (err: any) {
    console.error('[Recovery Error] Failed to reset password:', err);
    return res.status(500).json({ error: 'Internal server error while resetting password.' });
  }
});
