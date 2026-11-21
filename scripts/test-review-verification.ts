/**
 * CampusCare Comprehensive End-to-End System Review & Verification Suite
 * Tests live HTTP API endpoints on http://localhost:3000
 */

import { signToken } from '../server/auth.ts';
import { memoryStore } from '../server/db.ts';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:3000';

interface TestRecord {
  category: string;
  testName: string;
  passed: boolean;
  message: string;
}

const testResults: TestRecord[] = [];

function assert(condition: boolean, category: string, testName: string, failureMessage: string) {
  if (condition) {
    testResults.push({ category, testName, passed: true, message: 'Passed' });
    console.log(`  [PASS] ${testName}`);
  } else {
    testResults.push({ category, testName, passed: false, message: failureMessage });
    console.error(`  [FAIL] ${testName}: ${failureMessage}`);
  }
}

async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runReviewTests() {
  console.log('\n================================================================');
  console.log('   CAMPUSCARE LIVE SYSTEM REVIEW & VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  // Check 0: Server & Database Health
  console.log('0. Checking Live Server & Database Health Status:');
  const healthRes = await request('/api/health');
  assert(healthRes.status === 200, 'Health', 'Server responded HTTP 200', `Status was ${healthRes.status}`);
  assert(healthRes.data?.status === 'UP', 'Health', 'API status is UP', 'Service not UP');
  assert(healthRes.data?.tables_verified?.length === 6, 'Health', '6 schema tables verified', 'Tables missing');

  // Test Group 1: Student Registration & Login
  console.log('\n1. Testing Student Registration and Login:');
  const timestamp = Date.now();
  const studentEmail = `student.test.${timestamp}@campuscare.edu`;
  const studentPassword = 'SecureStudentPassword2026!';

  // Register student
  const regRes = await request('/api/auth/student/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: 'Robin Williams',
      email: studentEmail,
      password: studentPassword
    })
  });
  assert(regRes.status === 201, 'Student Auth', 'Student registration returns HTTP 201', `Status was ${regRes.status}`);
  assert(!!regRes.data?.token, 'Student Auth', 'Registration returns JWT auth token', 'Missing token');
  assert(regRes.data?.user?.role === 'STUDENT', 'Student Auth', 'Registered user has role STUDENT', 'Role mismatch');
  assert(!regRes.data?.message?.toLowerCase().includes('pending'), 'Student Auth', 'Student registration does NOT show pending approval message', 'Unexpected approval notice');
  assert(!regRes.data?.message?.toLowerCase().includes('verification'), 'Student Auth', 'Student registration does NOT show verification notice', 'Unexpected verification notice');
  assert(regRes.data?.is_active === undefined, 'Student Auth', 'Student accounts do not have is_active approval lock', 'Unexpected is_active flag');

  const studentToken = regRes.data?.token;

  // Login with correct password
  const loginRes = await request('/api/auth/student/login', {
    method: 'POST',
    body: JSON.stringify({
      email: studentEmail,
      password: studentPassword
    })
  });
  assert(loginRes.status === 200, 'Student Auth', 'Student login returns HTTP 200', `Status was ${loginRes.status}`);
  assert(!!loginRes.data?.token, 'Student Auth', 'Student login returns JWT auth token', 'Missing login token');

  // Login with wrong password
  const wrongLoginRes = await request('/api/auth/student/login', {
    method: 'POST',
    body: JSON.stringify({
      email: studentEmail,
      password: 'WrongPassword123!'
    })
  });
  assert(wrongLoginRes.status === 401, 'Student Auth', 'Invalid password rejected with HTTP 401', `Status was ${wrongLoginRes.status}`);

  // Test Group 2: Counsellor Registration & Pending Approval Message
  console.log('\n2. Testing Counsellor Registration and Pending Approval Message:');
  const counsellorEmail = `counsellor.test.${timestamp}@campuscare.edu`;
  const counsellorPassword = 'SecureCounsellor2026!';

  const cRegRes = await request('/api/auth/counsellor/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: 'Dr. Evelyn Reed',
      email: counsellorEmail,
      password: counsellorPassword,
      specialization: 'Cognitive Behavioural Therapy & Anxiety'
    })
  });
  assert(cRegRes.status === 201, 'Counsellor Auth', 'Counsellor registration returns HTTP 201', `Status was ${cRegRes.status}`);
  assert(cRegRes.data?.is_active === 0, 'Counsellor Auth', 'Newly registered counsellor has is_active = 0', `is_active was ${cRegRes.data?.is_active}`);
  assert(cRegRes.data?.message?.includes('pending administrative verification'), 'Counsellor Auth', 'Registration returns pending approval message', 'Message missing');

  // Inactive Counsellor Login Rejection
  const cInactiveLogin = await request('/api/auth/counsellor/login', {
    method: 'POST',
    body: JSON.stringify({
      email: counsellorEmail,
      password: counsellorPassword
    })
  });
  assert(cInactiveLogin.status === 403, 'Counsellor Auth', 'Inactive counsellor blocked with HTTP 403 Forbidden', `Status was ${cInactiveLogin.status}`);
  assert(cInactiveLogin.data?.error?.includes('pending administrative approval'), 'Counsellor Auth', 'Login returns pending approval explanation', 'Missing explanation');

  // Pre-seeded Active Counsellor Login Check (s.bennett@campuscare.edu / Password123!)
  const cActiveLogin = await request('/api/auth/counsellor/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 's.bennett@campuscare.edu',
      password: 'Password123!'
    })
  });
  assert(cActiveLogin.status === 200, 'Counsellor Auth', 'Pre-seeded active counsellor logs in with HTTP 200', `Status was ${cActiveLogin.status}`);
  assert(!!cActiveLogin.data?.token, 'Counsellor Auth', 'Pre-seeded active counsellor receives valid JWT auth token', 'Missing token');
  assert(cActiveLogin.data?.user?.is_active === 1, 'Counsellor Auth', 'Pre-seeded counsellor has is_active = 1', 'is_active mismatch');

  // Pre-seeded Student Login Check (alex.rivera@student.campuscare.edu / Password123!)
  const sDemoLogin = await request('/api/auth/student/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'alex.rivera@student.campuscare.edu',
      password: 'Password123!'
    })
  });
  assert(sDemoLogin.status === 200, 'Student Auth', 'Pre-seeded demo student logs in with HTTP 200', `Status was ${sDemoLogin.status}`);
  assert(!!sDemoLogin.data?.token, 'Student Auth', 'Pre-seeded demo student receives valid JWT auth token', 'Missing token');

  // Pre-seeded Inactive Counsellor Login Check (e.rostova@campuscare.edu / Password123!)
  const cPendingLogin = await request('/api/auth/counsellor/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'e.rostova@campuscare.edu',
      password: 'Password123!'
    })
  });
  assert(cPendingLogin.status === 403, 'Counsellor Auth', 'Pre-seeded unapproved counsellor blocked with HTTP 403 Forbidden', `Status was ${cPendingLogin.status}`);
  assert(cPendingLogin.data?.error?.includes('pending administrative approval'), 'Counsellor Auth', 'Pre-seeded unapproved counsellor receives pending notice', 'Notice missing');

  // Active counsellor token for slot creation & validation endpoints
  const activeCounsellorToken = cActiveLogin.data?.token;

  // Test Group 3: Form Validation and Error Messages
  console.log('\n3. Testing Form Validation and Error Messages:');
  
  // Validation: Short Password (< 8 chars)
  const shortPwRes = await request('/api/auth/student/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: 'Test Name',
      email: `valid.${timestamp}@campuscare.edu`,
      password: 'short'
    })
  });
  assert(shortPwRes.status === 400, 'Validation', 'Short password (<8 chars) rejected with HTTP 400', `Status was ${shortPwRes.status}`);
  assert(shortPwRes.data?.error?.includes('8 characters'), 'Validation', 'Error mentions 8 characters requirement', 'Wrong error message');

  // Validation: Invalid Email format
  const badEmailRes = await request('/api/auth/student/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: 'Test Name',
      email: 'not-an-email',
      password: 'ValidPassword123!'
    })
  });
  assert(badEmailRes.status === 400, 'Validation', 'Invalid email format rejected with HTTP 400', `Status was ${badEmailRes.status}`);

  // Validation: Duplicate Email Registration
  const dupEmailRes = await request('/api/auth/student/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: 'Duplicate Test',
      email: studentEmail,
      password: 'AnotherPassword123!'
    })
  });
  assert(dupEmailRes.status === 409, 'Validation', 'Duplicate student email rejected with HTTP 409 Conflict', `Status was ${dupEmailRes.status}`);

  // Validation: Slot creation with end time <= start time
  const tomorrow = new Date(Date.now() + 86400000);
  const startStr = new Date(tomorrow.getTime() + 7200000).toISOString().slice(0, 19).replace('T', ' ');
  const endStr = new Date(tomorrow.getTime() + 3600000).toISOString().slice(0, 19).replace('T', ' '); // Reversed!

  const invalidSlotRes = await request('/api/availability', {
    method: 'POST',
    headers: { Authorization: `Bearer ${activeCounsellorToken}` },
    body: JSON.stringify({
      slot_start: startStr,
      slot_end: endStr
    })
  });
  assert(invalidSlotRes.status === 400, 'Validation', 'Invalid slot time (end <= start) rejected with HTTP 400', `Status was ${invalidSlotRes.status}`);

  // Test Group 4: Screening Submission & Scoring
  console.log('\n4. Testing Screening Submission:');
  const validScreeningResponses = {
    assessment: 'PHQ-9 & GAD-7 Combined',
    items: [
      { id: 'q1', response_value: 2 },
      { id: 'q2', response_value: 1 },
      { id: 'q3', response_value: 2 },
      { id: 'q4', response_value: 2 },
      { id: 'q5', response_value: 1 },
      { id: 'q6', response_value: 1 },
      { id: 'q7', response_value: 2 },
      { id: 'q8', response_value: 1 }
    ]
  };

  const screeningSubmitRes = await request('/api/screenings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      responses: validScreeningResponses,
      overall_score: 12.0,
      screening_summary: 'Moderate Stress & Anxiety - Campus Counselling Recommended'
    })
  });
  assert(screeningSubmitRes.status === 201, 'Screening', 'Screening submission returns HTTP 201', `Status was ${screeningSubmitRes.status}`);
  assert(Number(screeningSubmitRes.data?.screening?.overall_score) === 12.0, 'Screening', 'Distress score accurately stored', 'Score mismatch');
  assert(!!screeningSubmitRes.data?.disclaimer, 'Screening', 'Educational medical disclaimer included in response', 'Missing disclaimer');

  // Retrieve Student Screening History
  const screeningHistoryRes = await request('/api/screenings/history', {
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(screeningHistoryRes.status === 200, 'Screening', 'Student retrieves screening history with HTTP 200', `Status was ${screeningHistoryRes.status}`);
  assert(screeningHistoryRes.data?.screenings?.length >= 1, 'Screening', 'History contains submitted screening', 'History empty');

  // Test Group 5: Counsellor Availability and Appointment Booking
  console.log('\n5. Testing Counsellor Availability and Appointment Booking:');
  
  // Valid slot times with dynamic offset to prevent overlap conflicts with existing DB slots
  const offsetHours = (timestamp % 500) + 48;
  const validStart = new Date(Date.now() + 3600000 * offsetHours).toISOString().slice(0, 19).replace('T', ' ');
  const validEnd = new Date(Date.now() + 3600000 * (offsetHours + 1)).toISOString().slice(0, 19).replace('T', ' ');

  const createSlotRes = await request('/api/availability', {
    method: 'POST',
    headers: { Authorization: `Bearer ${activeCounsellorToken}` },
    body: JSON.stringify({
      slot_start: validStart,
      slot_end: validEnd
    })
  });
  assert(createSlotRes.status === 201, 'Booking', 'Counsellor creates availability slot with HTTP 201', `Status was ${createSlotRes.status}`);
  const slotId = createSlotRes.data?.slot?.availability_id;

  // Query available slots
  const publicSlotsRes = await request('/api/availability');
  assert(publicSlotsRes.status === 200, 'Booking', 'Available slots fetched with HTTP 200', `Status was ${publicSlotsRes.status}`);
  const slotInPublic = publicSlotsRes.data?.slots?.find((s: any) => s.availability_id === slotId);
  assert(!!slotInPublic, 'Booking', 'Created slot visible in available calendar', 'Slot missing from public list');

  // Student books appointment
  const bookRes = await request('/api/appointments/book', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      availability_id: slotId,
      reason: 'Exam stress and sleep pattern disruption'
    })
  });
  assert(bookRes.status === 201, 'Booking', 'Student books appointment with HTTP 201', `Status was ${bookRes.status}`);
  assert(bookRes.data?.appointment?.booking_status === 'BOOKED', 'Booking', 'Appointment marked as BOOKED', 'Booking status incorrect');
  const appointmentId = bookRes.data?.appointment?.appointment_id;

  // Concurrency Check: Attempt double-booking on same slot
  const secondStudentEmail = `second.student.${timestamp}@campuscare.edu`;
  const reg2 = await request('/api/auth/student/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: 'Second Student',
      email: secondStudentEmail,
      password: studentPassword
    })
  });
  const studentToken2 = reg2.data?.token;

  const doubleBookRes = await request('/api/appointments/book', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken2}` },
    body: JSON.stringify({
      availability_id: slotId,
      reason: 'Attempting conflicting booking'
    })
  });
  assert(doubleBookRes.status === 409 || doubleBookRes.status === 400, 'Booking', 'Double-booking rejected atomically (concurrency protected)', `Status was ${doubleBookRes.status}`);

  // Cancellation and slot restoration
  const cancelRes = await request(`/api/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(cancelRes.status === 200, 'Booking', 'Appointment cancelled successfully with HTTP 200', `Status was ${cancelRes.status}`);
  assert(cancelRes.data?.message?.includes('cancelled successfully'), 'Booking', 'Cancellation message confirmed', 'Missing cancel message');

  // Verify status in student appointment history
  const studentApptsRes = await request('/api/appointments/student', {
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const cancelledInList = studentApptsRes.data?.appointments?.find((a: any) => a.appointment_id === appointmentId);
  assert(cancelledInList?.booking_status === 'CANCELLED', 'Booking', 'Status updated to CANCELLED in appointments', `Status was ${cancelledInList?.booking_status}`);

  // Verify slot is restored
  const publicSlotsAfterCancel = await request('/api/availability');
  const restoredSlot = publicSlotsAfterCancel.data?.slots?.find((s: any) => s.availability_id === slotId);
  assert(!!restoredSlot, 'Booking', 'Slot restored to public availability after cancellation', 'Slot not restored');

  // Test Group 6: Password Recovery Lifecycle (Valid, Expired & Single-Use Enforcement)
  console.log('\n6. Testing Password Recovery:');
  const recEmail = studentEmail;
  const recReqRes = await request('/api/recovery/request', {
    method: 'POST',
    body: JSON.stringify({
      account_type: 'STUDENT',
      email: recEmail
    })
  });
  assert(recReqRes.status === 200, 'Password Recovery', 'Recovery code request returns HTTP 200', `Status was ${recReqRes.status}`);
  assert(recReqRes.data?.expires_in_minutes === 10, 'Password Recovery', 'Response specifies 10-minute expiry window', `Expiry was ${recReqRes.data?.expires_in_minutes}`);
  const devHint = recReqRes.data?.dev_code_hint;
  assert(!!devHint && devHint.length === 6, 'Password Recovery', '6-digit verification code generated in response', 'Code hint missing or invalid');

  // Verify code with wrong code
  const wrongCodeRes = await request('/api/recovery/verify', {
    method: 'POST',
    body: JSON.stringify({
      account_type: 'STUDENT',
      email: recEmail,
      code: '000000'
    })
  });
  assert(wrongCodeRes.status === 400, 'Password Recovery', 'Invalid code rejected with HTTP 400', `Status was ${wrongCodeRes.status}`);

  // Verify code with correct code (UTC comparison)
  const correctCodeRes = await request('/api/recovery/verify', {
    method: 'POST',
    body: JSON.stringify({
      account_type: 'STUDENT',
      email: recEmail,
      code: devHint
    })
  });
  assert(correctCodeRes.status === 200, 'Password Recovery', 'Valid code verified with HTTP 200', `Status was ${correctCodeRes.status}`);
  assert(!!correctCodeRes.data?.reset_token, 'Password Recovery', 'Single-use reset token issued', 'Missing reset token');
  const resetToken = correctCodeRes.data?.reset_token;

  // Single-use verification code test: Attempt to re-verify the same code
  const reuseCodeRes = await request('/api/recovery/verify', {
    method: 'POST',
    body: JSON.stringify({
      account_type: 'STUDENT',
      email: recEmail,
      code: devHint
    })
  });
  assert(reuseCodeRes.status === 400, 'Password Recovery', 'Re-verifying consumed code rejected with HTTP 400 (single-use code)', `Status was ${reuseCodeRes.status}`);

  // Test expired code rejection
  const expiredEmail = `expired.test.${timestamp}@campuscare.edu`;
  const expCodeHash = crypto.createHash('sha256').update('888888').digest('hex');
  const pastExpiresAt = new Date(Date.now() - 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  memoryStore.createStudent('Expired Tester', expiredEmail, 'SomeHash1234!');
  memoryStore.createRecoveryRequest('STUDENT', expiredEmail, expCodeHash, pastExpiresAt);

  const expiredVerifyRes = await request('/api/recovery/verify', {
    method: 'POST',
    body: JSON.stringify({
      account_type: 'STUDENT',
      email: expiredEmail,
      code: '888888'
    })
  });
  assert(expiredVerifyRes.status === 400, 'Password Recovery', 'Expired verification code rejected with HTTP 400', `Status was ${expiredVerifyRes.status}`);

  // Reset password
  const newPassword = 'NewSecretPassword2026!';
  const resetRes = await request('/api/recovery/reset', {
    method: 'POST',
    body: JSON.stringify({
      reset_token: resetToken,
      new_password: newPassword
    })
  });
  assert(resetRes.status === 200, 'Password Recovery', 'Password reset successfully with HTTP 200', `Status was ${resetRes.status}`);

  // Reuse same reset token (Single-use token test: Must be rejected!)
  const reuseTokenRes = await request('/api/recovery/reset', {
    method: 'POST',
    body: JSON.stringify({
      reset_token: resetToken,
      new_password: 'YetAnotherPassword!'
    })
  });
  assert(reuseTokenRes.status === 400, 'Password Recovery', 'Token reuse rejected (single-use token enforcement)', `Status was ${reuseTokenRes.status}`);

  // Authenticate with new password
  const newLoginRes = await request('/api/auth/student/login', {
    method: 'POST',
    body: JSON.stringify({
      email: recEmail,
      password: newPassword
    })
  });
  assert(newLoginRes.status === 200, 'Password Recovery', 'Login with newly reset password succeeds with HTTP 200', `Status was ${newLoginRes.status}`);

  // Summary Report
  console.log('\n================================================================');
  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  console.log(`TOTAL REVIEW TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log('================================================================\n');

  if (passed === total) {
    console.log('ALL EXECUTED TESTS COMPLETED.');
  } else {
    process.exit(1);
  }
}

runReviewTests().catch(err => {
  console.error('Fatal testing error:', err);
  process.exit(1);
});
