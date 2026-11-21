/**
 * Comprehensive Automated Test Suite: Student vs Counsellor Registration Flows
 * Verifies:
 * 1. Successful student registration does NOT show counsellor approval message
 * 2. Student registration immediately issues JWT auth token and grants active access
 * 3. Counsellor registration explicitly enforces inactive status (is_active = 0) and returns pending approval message
 * 4. Inactive counsellor login attempts are strictly rejected with HTTP 403 Forbidden
 * 5. Inactive counsellor security remains completely intact without modifying database records
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, category: string, name: string, errorMsg?: string) {
  if (condition) {
    results.push({ name, category, passed: true });
    console.log(`  [PASS] [${category}] ${name}`);
  } else {
    results.push({ name, category, passed: false, error: errorMsg });
    console.error(`  [FAIL] [${category}] ${name}: ${errorMsg || 'Assertion failed'}`);
  }
}

async function request(endpoint: string, options: any = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, data, headers: res.headers };
  } catch (err: any) {
    return { status: 0, data: null, error: err.message };
  }
}

async function runTests() {
  console.log('================================================================');
  console.log(' CAMPUSCARE REGISTRATION ROLE-SPECIFIC VERIFICATION TEST SUITE');
  console.log(` Target Endpoint: ${BASE_URL}`);
  console.log('================================================================\n');

  // Step 0: Health Check
  console.log('--- STEP 0: System Health & Database Engine ---');
  const health = await request('/api/health');
  assert(health.status === 200, 'Health', 'API health check returns HTTP 200', `Status: ${health.status}`);
  assert(health.data?.status === 'UP', 'Health', 'API service status is UP', 'Service not UP');
  assert(health.data?.database?.isLiveMySQL === true, 'Database', 'Connected to live MySQL database engine', 'Not connected to live MySQL');

  const timestamp = Date.now();

  // Test 1: Student Registration Flow
  console.log('\n--- STEP 1: Student Registration Flow (Immediate Active Access) ---');
  const studentEmail = `student.role.test.${timestamp}@campuscare.edu`;
  const studentPassword = 'SecureStudentPass2026!';
  const studentName = 'Maya Lin';

  const studentReg = await request('/api/auth/student/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: studentName,
      email: studentEmail,
      password: studentPassword
    })
  });

  assert(studentReg.status === 201, 'Student Registration', 'Returns HTTP 201 Created', `Status was ${studentReg.status}`);
  assert(!!studentReg.data?.token, 'Student Registration', 'Immediately returns valid JWT auth token', 'Missing token');
  assert(studentReg.data?.user?.role === 'STUDENT', 'Student Registration', 'User object has role STUDENT', `Role was ${studentReg.data?.user?.role}`);
  assert(studentReg.data?.user?.email === studentEmail.toLowerCase(), 'Student Registration', 'User object email matches', 'Email mismatch');
  assert(studentReg.data?.message === 'Student account registered successfully.', 'Student Registration', 'Returns standard student success message', `Message was "${studentReg.data?.message}"`);

  // Role Separation Guard: Student must NEVER receive counsellor approval notices
  const regMsg = (studentReg.data?.message || '').toLowerCase();
  assert(!regMsg.includes('pending'), 'Role Separation', 'Student registration message does NOT contain "pending"', `Found: "${regMsg}"`);
  assert(!regMsg.includes('administrative'), 'Role Separation', 'Student registration message does NOT contain "administrative"', `Found: "${regMsg}"`);
  assert(!regMsg.includes('verification'), 'Role Separation', 'Student registration message does NOT contain "verification"', `Found: "${regMsg}"`);
  assert(!regMsg.includes('approval'), 'Role Separation', 'Student registration message does NOT contain "approval"', `Found: "${regMsg}"`);
  assert(studentReg.data?.is_active === undefined, 'Role Separation', 'Student registration does NOT have is_active lock', `is_active was ${studentReg.data?.is_active}`);

  // Immediate Profile Access via Token
  const studentMe = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${studentReg.data?.token}` }
  });
  assert(studentMe.status === 200, 'Student Profile', 'Newly registered student immediately accesses /api/auth/me', `Status was ${studentMe.status}`);
  assert(studentMe.data?.role === 'STUDENT', 'Student Profile', 'Profile role is STUDENT', `Role: ${studentMe.data?.role}`);

  // Subsequent Login
  const studentLogin = await request('/api/auth/student/login', {
    method: 'POST',
    body: JSON.stringify({
      email: studentEmail,
      password: studentPassword
    })
  });
  assert(studentLogin.status === 200, 'Student Login', 'Newly registered student logs in with HTTP 200', `Status was ${studentLogin.status}`);
  assert(!!studentLogin.data?.token, 'Student Login', 'Student login returns new JWT token', 'Missing token');

  // Test 2: Counsellor Registration Flow (Strict Inactive Flow with Approval Notice)
  console.log('\n--- STEP 2: Counsellor Registration Flow (Inactive Until Approval) ---');
  const counsellorEmail = `counsellor.role.test.${timestamp}@campuscare.edu`;
  const counsellorPassword = 'SecureCounsellorPass2026!';
  const counsellorName = 'Dr. Julian Thorne';
  const specialization = 'Stress Reduction & Mindfulness';

  const counsellorReg = await request('/api/auth/counsellor/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: counsellorName,
      email: counsellorEmail,
      password: counsellorPassword,
      specialization
    })
  });

  assert(counsellorReg.status === 201, 'Counsellor Registration', 'Returns HTTP 201 Created', `Status was ${counsellorReg.status}`);
  assert(counsellorReg.data?.is_active === 0, 'Counsellor Registration', 'Explicitly returns is_active = 0', `is_active was ${counsellorReg.data?.is_active}`);
  assert(counsellorReg.data?.token === undefined, 'Counsellor Registration', 'Does NOT return auth token (login disallowed)', 'Token was unexpectedly returned');
  assert(
    counsellorReg.data?.message?.includes('pending administrative verification'),
    'Counsellor Registration',
    'Returns required administrative verification notice',
    `Message was: "${counsellorReg.data?.message}"`
  );

  // Test 3: Newly Registered Inactive Counsellor Login Rejection
  console.log('\n--- STEP 3: Newly Registered Inactive Counsellor Security Check (Must Be 403 Forbidden) ---');
  const inactiveLogin = await request('/api/auth/counsellor/login', {
    method: 'POST',
    body: JSON.stringify({
      email: counsellorEmail,
      password: counsellorPassword
    })
  });

  assert(inactiveLogin.status === 403, 'Counsellor Security', 'Inactive counsellor blocked with HTTP 403 Forbidden', `Status was ${inactiveLogin.status}`);
  assert(inactiveLogin.data?.is_active === 0, 'Counsellor Security', '403 response includes is_active = 0', `is_active was ${inactiveLogin.data?.is_active}`);
  assert(
    inactiveLogin.data?.error?.includes('pending administrative approval'),
    'Counsellor Security',
    '403 response explains account is pending administrative approval',
    `Error was: "${inactiveLogin.data?.error}"`
  );

  // Test 4: Existing Inactive & Active Counsellor Security Check in Live Database
  console.log('\n--- STEP 4: Inactive and Active Counsellor Live Security Enforcement ---');
  const existingInactive = await request('/api/auth/counsellor/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'e.rostova@campuscare.edu',
      password: 'Password123!'
    })
  });
  assert(existingInactive.status === 403, 'Inactive Counsellor', 'Inactive counsellor e.rostova blocked with HTTP 403', `Status was ${existingInactive.status}`);
  assert(existingInactive.data?.is_active === 0, 'Inactive Counsellor', 'Inactive counsellor response confirms is_active = 0', `is_active: ${existingInactive.data?.is_active}`);
  assert(
    existingInactive.data?.error?.includes('pending administrative approval'),
    'Inactive Counsellor',
    'Confirms pending administrative approval message for inactive counsellor',
    `Message was: ${existingInactive.data?.error}`
  );

  const existingActive = await request('/api/auth/counsellor/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 's.bennett@campuscare.edu',
      password: 'Password123!'
    })
  });
  assert(existingActive.status === 200, 'Active Counsellor', 'Active counsellor s.bennett logs in with HTTP 200', `Status was ${existingActive.status}`);
  assert(existingActive.data?.user?.is_active === 1, 'Active Counsellor', 'Active counsellor has is_active = 1', `is_active was ${existingActive.data?.user?.is_active}`);
  assert(!!existingActive.data?.token, 'Active Counsellor', 'Active counsellor receives valid auth token', 'Missing token');

  // Test 5: Duplicate Registration Constraints
  console.log('\n--- STEP 5: Duplicate Email Constraints ---');
  const dupStudent = await request('/api/auth/student/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: 'Duplicate Student',
      email: studentEmail,
      password: 'Password123!'
    })
  });
  assert(dupStudent.status === 409, 'Duplicate Guard', 'Duplicate student registration rejected with HTTP 409', `Status was ${dupStudent.status}`);

  const dupCounsellor = await request('/api/auth/counsellor/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: 'Duplicate Counsellor',
      email: counsellorEmail,
      password: 'Password123!'
    })
  });
  assert(dupCounsellor.status === 409, 'Duplicate Guard', 'Duplicate counsellor registration rejected with HTTP 409', `Status was ${dupCounsellor.status}`);

  // Summary
  console.log('\n================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.log(` REGISTRATION ROLE VERIFICATION SUMMARY: ${passed}/${total} PASSED (${failed} failed)`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.error(`- [${r.category}] ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✓ ALL STUDENT AND COUNSELLOR REGISTRATION ROLE TESTS PASSED (100%).');
  }
}

runTests().catch(err => {
  console.error('[Fatal Test Failure]:', err);
  process.exit(1);
});
