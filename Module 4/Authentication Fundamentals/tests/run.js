require('dotenv').config();
const assert = require('assert');
const app = require('../src/app');
const prisma = require('../src/db/prisma');
const bcrypt = require('bcryptjs');

let server;
const port = 3001;
const baseUrl = `http://127.0.0.1:${port}`;

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const body = await response.json().catch(() => null);
  return {
    status: response.status,
    headers: response.headers,
    body,
  };
}

async function runTests() {
  console.log('Starting Authentication Fundamentals test suite...');

  // Clean test database table
  await prisma.user.deleteMany({});

  // Test 1: Successful Registration
  console.log('\n[Test 1] POST /auth/register with valid credentials');
  const regRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Sam',
      email: '  SAM@example.com  ',
      password: 'correct horse battery staple',
    }),
  });

  assert.strictEqual(regRes.status, 201, 'Should return 201 Created');
  assert.strictEqual(typeof regRes.body.id, 'number', 'Should return numeric id');
  assert.strictEqual(regRes.body.name, 'Sam', 'Should return user name');
  assert.strictEqual(regRes.body.email, 'sam@example.com', 'Should return normalized lowercase email');
  assert.strictEqual(regRes.body.password, undefined, 'Must NEVER return plaintext password');
  assert.strictEqual(regRes.body.passwordHash, undefined, 'Must NEVER return passwordHash');

  // Verify database record has valid bcrypt hash and no plaintext
  const dbUser = await prisma.user.findUnique({
    where: { email: 'sam@example.com' },
  });
  assert.ok(dbUser, 'User must exist in database');
  assert.strictEqual(dbUser.email, 'sam@example.com', 'Normalized email stored in DB');
  assert.ok(dbUser.passwordHash.startsWith('$2a$') || dbUser.passwordHash.startsWith('$2b$'), 'Must store valid bcrypt hash');
  assert.notStrictEqual(dbUser.passwordHash, 'correct horse battery staple', 'Never store plaintext');
  const isValidHash = await bcrypt.compare('correct horse battery staple', dbUser.passwordHash);
  assert.strictEqual(isValidHash, true, 'Stored hash must verify against original password');
  console.log('✓ Registration passed: 201 returned with safe fields only, bcrypt hash stored and verified');

  // Test 2: Duplicate Registration (409)
  console.log('\n[Test 2] POST /auth/register with existing normalized email');
  const dupRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Sam Duplicate',
      email: 'sam@example.com',
      password: 'different-password',
    }),
  });
  assert.strictEqual(dupRes.status, 409, 'Duplicate email should return 409');
  assert.ok(dupRes.body.error, 'Response should contain error object');
  console.log('✓ Duplicate registration returned 409 Conflict');

  // Test 3: Validation Failures on Registration (400)
  console.log('\n[Test 3] POST /auth/register with malformed or missing fields');
  const missingName = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: 'other@example.com', password: 'secret' }),
  });
  assert.strictEqual(missingName.status, 400, 'Missing name must return 400');

  const emptyEmail = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Bob', email: '   ', password: 'secret' }),
  });
  assert.strictEqual(emptyEmail.status, 400, 'Empty email must return 400');

  const emptyPassword = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Bob', email: 'bob@example.com', password: '' }),
  });
  assert.strictEqual(emptyPassword.status, 400, 'Empty password must return 400');
  console.log('✓ Registration validation correctly returned 400');

  // Test 4: Successful Login (200)
  console.log('\n[Test 4] POST /auth/login with valid credentials');
  const loginSuccess = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'SAM@EXAMPLE.COM',
      password: 'correct horse battery staple',
    }),
  });
  assert.strictEqual(loginSuccess.status, 200, 'Valid credentials should return 200');
  assert.strictEqual(typeof loginSuccess.body.id, 'number', 'Returns user id');
  assert.strictEqual(loginSuccess.body.name, 'Sam', 'Returns user name');
  assert.strictEqual(loginSuccess.body.email, 'sam@example.com', 'Returns normalized email');
  assert.strictEqual(loginSuccess.body.password, undefined, 'Must NEVER return password');
  assert.strictEqual(loginSuccess.body.passwordHash, undefined, 'Must NEVER return passwordHash');
  console.log('✓ Successful login passed: 200 returned with safe user fields');

  // Test 5: Login with Wrong Password (401)
  console.log('\n[Test 5] POST /auth/login with wrong password');
  const wrongPassRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'sam@example.com',
      password: 'wrong-password-here',
    }),
  });
  assert.strictEqual(wrongPassRes.status, 401, 'Wrong password must return 401');
  assert.deepStrictEqual(wrongPassRes.body, {
    error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
  }, 'Body must match exact generic credential error');
  console.log('✓ Login wrong password returned exact 401 generic error');

  // Test 6: Login with Unknown Email (401)
  console.log('\n[Test 6] POST /auth/login with unknown email');
  const unknownEmailRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'nonexistent@example.com',
      password: 'correct horse battery staple',
    }),
  });
  assert.strictEqual(unknownEmailRes.status, 401, 'Unknown email must return 401');
  assert.deepStrictEqual(unknownEmailRes.body, {
    error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
  }, 'Body must match exact generic credential error');
  assert.deepStrictEqual(wrongPassRes.body, unknownEmailRes.body, 'Both failure bodies must be identical');
  console.log('✓ Login unknown email returned identical 401 generic error');

  // Test 7: Validation Failures on Login (400)
  console.log('\n[Test 7] POST /auth/login with invalid input');
  const missingLoginPass = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'sam@example.com' }),
  });
  assert.strictEqual(missingLoginPass.status, 400, 'Missing password on login must return 400');
  console.log('✓ Login validation correctly returned 400');

  console.log('\n=========================================');
  console.log('ALL 7 TEST SUITE SCENARIOS PASSED SUCCESSFULLY!');
  console.log('=========================================');
}

server = app.listen(port, async () => {
  try {
    await runTests();
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\nTest assertion failed:', err);
    server.close();
    await prisma.$disconnect();
    process.exit(1);
  }
});
