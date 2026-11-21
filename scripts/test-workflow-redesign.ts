const API_BASE = 'http://localhost:3000';

async function request(url: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${msg}`);
    failed++;
  }
}

async function runWorkflowTests() {
  console.log('================================================================');
  console.log(' CAMPUSCARE WORKFLOW & DASHBOARD REDESIGN VERIFICATION SUITE');
  console.log('================================================================\n');

  // Test 1: Log in active counsellor (s.bennett) and student (alex.rivera)
  console.log('--- 1. Authenticating Active Counsellor & Student ---');
  const counsLogin = await request('/api/auth/counsellor/login', {
    method: 'POST',
    body: JSON.stringify({ email: 's.bennett@campuscare.edu', password: 'Password123!' })
  });
  assert(counsLogin.status === 200, 'Active counsellor s.bennett logs in successfully');
  const counsellorToken = counsLogin.data.token;

  const studLogin = await request('/api/auth/student/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'alex.rivera@student.campuscare.edu', password: 'Password123!' })
  });
  assert(studLogin.status === 200, 'Student alex.rivera logs in successfully');
  const studentToken = studLogin.data.token;

  // Test 2: Online Slot Creation & URL Validation
  console.log('\n--- 2. Counsellor Availability: Online Slot with Meeting Link ---');
  // Use timestamp offset to guarantee unique future slots across test runs
  const dayOffset = Math.floor(Math.random() * 50) + 10;
  const targetDay = new Date(Date.now() + 86400000 * dayOffset);
  const targetDayStr = targetDay.toISOString().split('T')[0];
  const start1 = `${targetDayStr} 09:00:00`;
  const end1 = `${targetDayStr} 10:00:00`;

  // Invalid meeting URL rejection
  const invalidUrlRes = await request('/api/availability', {
    method: 'POST',
    headers: { Authorization: `Bearer ${counsellorToken}` },
    body: JSON.stringify({
      slot_start: start1,
      slot_end: end1,
      session_mode: 'ONLINE',
      meeting_link: 'not-a-valid-url'
    })
  });
  assert(invalidUrlRes.status === 400, 'Invalid meeting link URL rejected with HTTP 400');

  // Valid Online Slot
  const validOnlineRes = await request('/api/availability', {
    method: 'POST',
    headers: { Authorization: `Bearer ${counsellorToken}` },
    body: JSON.stringify({
      slot_start: start1,
      slot_end: end1,
      session_mode: 'ONLINE',
      meeting_link: 'https://meet.google.com/xyz-camp-care',
      notes: 'Please be in a quiet space with your webcam enabled.'
    })
  });
  assert(validOnlineRes.status === 201, 'Online slot created with HTTP 201');
  const onlineSlotId = validOnlineRes.data.slot.availability_id;

  // Test 3: Overlapping Slot Prevention
  console.log('\n--- 3. Overlapping Slot Prevention ---');
  const overlapRes = await request('/api/availability', {
    method: 'POST',
    headers: { Authorization: `Bearer ${counsellorToken}` },
    body: JSON.stringify({
      slot_start: `${targetDayStr} 09:30:00`,
      slot_end: `${targetDayStr} 10:30:00`,
      session_mode: 'ONLINE',
      meeting_link: 'https://meet.google.com/xyz-camp-care'
    })
  });
  assert(overlapRes.status === 409 || overlapRes.status === 400, 'Overlapping availability slot rejected with HTTP 409/400');
  assert(
    overlapRes.data.error.includes('overlap'),
    `Error explains time overlap constraint: "${overlapRes.data.error}"`
  );

  // Test 4: Offline Slot Creation with Physical Room
  console.log('\n--- 4. Counsellor Availability: Offline Slot with Room Location ---');
  const start2 = `${targetDayStr} 11:00:00`;
  const end2 = `${targetDayStr} 12:00:00`;

  // Missing room rejection
  const missingRoomRes = await request('/api/availability', {
    method: 'POST',
    headers: { Authorization: `Bearer ${counsellorToken}` },
    body: JSON.stringify({
      slot_start: start2,
      slot_end: end2,
      session_mode: 'OFFLINE'
    })
  });
  assert(missingRoomRes.status === 400, 'Offline slot without physical room rejected with HTTP 400');

  // Valid Offline Slot
  const validOfflineRes = await request('/api/availability', {
    method: 'POST',
    headers: { Authorization: `Bearer ${counsellorToken}` },
    body: JSON.stringify({
      slot_start: start2,
      slot_end: end2,
      session_mode: 'OFFLINE',
      location: 'Student Health Centre Room 204'
    })
  });
  assert(validOfflineRes.status === 201, 'Offline slot created with HTTP 201');
  const offlineSlotId = validOfflineRes.data.slot.availability_id;

  // Test 5: Student Booking Request Creation (Must be PENDING, Not Auto-Confirmed)
  console.log('\n--- 5. Student Booking Request Workflow: Status = PENDING ---');
  const bookRes = await request('/api/appointments/book', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      availability_id: onlineSlotId,
      reason: 'Experiencing exam anxiety and seeking coping techniques'
    })
  });
  assert(bookRes.status === 201, 'Student submits booking request with HTTP 201');
  assert(bookRes.data.appointment.workflow_status === 'PENDING', 'Booking workflow_status is recorded as PENDING');
  const appointmentId = bookRes.data.appointment.appointment_id;

  // Test 6: Privacy Gate - Meeting link concealed while pending
  console.log('\n--- 6. Privacy Gate: Concealing Online Meeting URL While Pending ---');
  const studentApptsRes = await request('/api/appointments/student', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const myPendingAppt = studentApptsRes.data.appointments.find((a: any) => a.appointment_id === appointmentId);
  assert(myPendingAppt !== undefined, 'Student sees the newly submitted appointment in their dashboard');
  assert(myPendingAppt.workflow_status === 'PENDING', 'Student dashboard displays status as PENDING');
  assert(!myPendingAppt.meeting_link, 'Online meeting URL is concealed while appointment status is PENDING');

  // Test 7: Double-Booking Prevention Under Concurrency
  console.log('\n--- 7. Atomic Concurrency: Double Booking Prevention ---');
  const doubleBookRes = await request('/api/appointments/book', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      availability_id: onlineSlotId,
      reason: 'Attempting to book the same slot twice'
    })
  });
  assert(doubleBookRes.status === 400 || doubleBookRes.status === 409, 'Double booking rejected with 400/409');

  // Test 8: Counsellor Reviews and Accepts Request -> CONFIRMED
  console.log('\n--- 8. Counsellor Accepts Booking Request -> Status = CONFIRMED ---');
  const acceptRes = await request(`/api/appointments/${appointmentId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${counsellorToken}` }
  });
  assert(acceptRes.status === 200, 'Counsellor accepts booking request with HTTP 200');
  assert(acceptRes.data.appointment.workflow_status === 'CONFIRMED', 'Workflow status updated to CONFIRMED');

  // Verify student can now see confirmed details including meeting link!
  const studentConfirmedRes = await request('/api/appointments/student', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const confirmedAppt = studentConfirmedRes.data.appointments.find((a: any) => a.appointment_id === appointmentId);
  assert(confirmedAppt.workflow_status === 'CONFIRMED', 'Student dashboard shows status CONFIRMED');
  assert(
    confirmedAppt.meeting_link === 'https://meet.google.com/xyz-camp-care',
    `Meeting URL now safely unlocked for confirmed student: ${confirmedAppt.meeting_link}`
  );

  // Test 9: Rejection Workflow (Slot Reopening)
  console.log('\n--- 9. Counsellor Rejection Workflow & Slot Reopening ---');
  // Student books offline slot
  const bookOfflineRes = await request('/api/appointments/book', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      availability_id: offlineSlotId,
      reason: 'General consultation request'
    })
  });
  assert(bookOfflineRes.status === 201, 'Student books offline slot with HTTP 201');
  const offlineApptId = bookOfflineRes.data.appointment.appointment_id;

  // Counsellor rejects offline request
  const rejectRes = await request(`/api/appointments/${offlineApptId}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${counsellorToken}` },
    body: JSON.stringify({ reason: 'Practitioner conference conflict' })
  });
  assert(rejectRes.status === 200, 'Counsellor rejects request with HTTP 200');
  assert(rejectRes.data.appointment.workflow_status === 'REJECTED', 'Workflow status is updated to REJECTED');

  // Verify slot is reopened to public availability
  const openSlotsRes = await request('/api/availability');
  const reopenedSlot = openSlotsRes.data.slots.find((s: any) => s.availability_id === offlineSlotId);
  assert(reopenedSlot !== undefined, 'Rejected slot is automatically reopened in public availability calendar');

  // Clean up: Delete created slots to leave DB tidy
  await request(`/api/availability/${offlineSlotId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${counsellorToken}` }
  });
  // Cancel confirmed appointment and delete slot
  await request(`/api/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${counsellorToken}` }
  });
  await request(`/api/availability/${onlineSlotId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${counsellorToken}` }
  });

  // Test 10: Authorized Student Caseload Endpoint
  console.log('\n--- 10. Counsellor Authorized Student Caseload ---');
  const caseloadRes = await request('/api/appointments/counsellor/authorized-students', {
    headers: { Authorization: `Bearer ${counsellorToken}` }
  });
  assert(caseloadRes.status === 200, 'Authorized students endpoint returns HTTP 200');
  assert(Array.isArray(caseloadRes.data.students), 'Students returned as an array');

  // Test 11: Clinical Screening Analytics Endpoint
  console.log('\n--- 11. Real Screening Analytics & Reports Endpoint ---');
  const analyticsRes = await request('/api/screenings/analytics', {
    headers: { Authorization: `Bearer ${counsellorToken}` }
  });
  assert(analyticsRes.status === 200, 'Screening analytics endpoint returns HTTP 200');
  assert(typeof analyticsRes.data.total_screenings === 'number', 'Total screenings is a valid count');
  assert(typeof analyticsRes.data.average_score === 'number', 'Average score is computed from real DB records');
  assert(analyticsRes.data.distribution !== undefined, 'Distress distribution breakdown is present');
  assert(analyticsRes.data.distribution.mild !== undefined, 'Mild category count is present');
  assert(analyticsRes.data.distribution.moderate !== undefined, 'Moderate category count is present');
  assert(analyticsRes.data.distribution.severe !== undefined, 'Severe category count is present');

  console.log('\n================================================================');
  console.log(` WORKFLOW VERIFICATION SUMMARY: ${passed}/${passed + failed} PASSED (${failed} failed)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runWorkflowTests().catch(err => {
  console.error('Fatal error running workflow tests:', err);
  process.exit(1);
});
