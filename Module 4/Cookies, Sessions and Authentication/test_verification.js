const http = require('http');
const assert = require('assert');
const app = require('./src/app');
const sessionStore = require('./src/session/sessionStore');
const { getSessionCookieOptions } = require('./src/session/cookieConfig');

let server;
let baseUrl;

function request(method, path, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers },
    };

    let payload = null;
    if (body) {
      payload = JSON.stringify(body);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          if (data) json = JSON.parse(data);
        } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json,
          rawBody: data,
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Session Auth Verification ---');
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`Test server running at ${baseUrl}`);
      resolve();
    });
  });

  try {
    // Test 1: POST /auth/login with valid credentials
    console.log('\n[Test 1] POST /auth/login with valid credentials');
    const loginRes = await request('POST', '/auth/login', {
      body: { email: 'sam@example.com', password: 'SessionDemo!48' },
    });
    assert.strictEqual(loginRes.status, 200, 'Expected 200 status on valid login');
    assert(loginRes.body.user, 'Expected user object in response');
    assert.strictEqual(loginRes.body.user.email, 'sam@example.com', 'User email should match');
    assert.strictEqual(loginRes.body.user.passwordHash, undefined, 'passwordHash must NEVER be returned');
    assert.strictEqual(loginRes.body.user.password, undefined, 'password must NEVER be returned');

    const setCookieHeader = loginRes.headers['set-cookie'];
    assert(setCookieHeader && setCookieHeader.length > 0, 'Expected Set-Cookie header');
    const cookieStr = setCookieHeader[0];
    console.log('Received Set-Cookie:', cookieStr);
    assert(cookieStr.startsWith('sid=s%3A'), 'Cookie should be named sid and be signed (s: prefix)');
    assert(/HttpOnly/i.test(cookieStr), 'Cookie must have HttpOnly flag');
    assert(/SameSite=Lax/i.test(cookieStr), 'Cookie must have SameSite=Lax flag');
    assert(/Path=\//i.test(cookieStr), 'Cookie must have Path=/ flag');
    assert(/Max-Age=/i.test(cookieStr), 'Cookie must have Max-Age');

    // Extract cookie value for subsequent requests
    const rawCookie = cookieStr.split(';')[0];
    console.log('✓ Test 1 passed: Valid login creates signed cookie & safe user payload');

    // Test 2: POST /auth/login with wrong password
    console.log('\n[Test 2] POST /auth/login with wrong password');
    const wrongPassRes = await request('POST', '/auth/login', {
      body: { email: 'sam@example.com', password: 'WrongPassword!99' },
    });
    assert.strictEqual(wrongPassRes.status, 401, 'Expected 401 on wrong password');
    assert.strictEqual(wrongPassRes.body.error.code, 'UNAUTHORIZED');
    assert.strictEqual(wrongPassRes.headers['set-cookie'], undefined, 'No Set-Cookie on failure');
    console.log('✓ Test 2 passed: Generic 401 returned for wrong password');

    // Test 3: POST /auth/login with unknown email
    console.log('\n[Test 3] POST /auth/login with unknown email');
    const unknownEmailRes = await request('POST', '/auth/login', {
      body: { email: 'nonexistent@example.com', password: 'SessionDemo!48' },
    });
    assert.strictEqual(unknownEmailRes.status, 401, 'Expected 401 on unknown email');
    assert.strictEqual(unknownEmailRes.body.error.code, 'UNAUTHORIZED');
    assert.strictEqual(unknownEmailRes.body.error.message, wrongPassRes.body.error.message, 'Failure message must be identical for user enumeration defense');
    console.log('✓ Test 3 passed: Identical generic 401 returned for unknown email');

    // Test 4: POST /auth/login with empty/missing credentials
    console.log('\n[Test 4] POST /auth/login with missing fields');
    const missingRes = await request('POST', '/auth/login', {
      body: { email: '', password: '' },
    });
    assert.strictEqual(missingRes.status, 401, 'Expected 401 on missing fields');
    console.log('✓ Test 4 passed: Missing credentials rejected with generic 401');

    // Test 5: GET /auth/me with valid session cookie
    console.log('\n[Test 5] GET /auth/me with valid session cookie');
    const meRes = await request('GET', '/auth/me', {
      headers: { Cookie: rawCookie },
    });
    assert.strictEqual(meRes.status, 200, 'Expected 200 on /auth/me with valid cookie');
    assert(meRes.body.user, 'Expected user object');
    assert.strictEqual(meRes.body.user.email, 'sam@example.com');
    assert.strictEqual(meRes.body.user.name, 'Sam');
    assert.strictEqual(meRes.body.user.passwordHash, undefined, 'passwordHash must NEVER be returned');
    console.log('✓ Test 5 passed: Identity resolved from signed session cookie');

    // Test 6: GET /auth/me without cookie
    console.log('\n[Test 6] GET /auth/me without cookie');
    const noCookieRes = await request('GET', '/auth/me');
    assert.strictEqual(noCookieRes.status, 401, 'Expected 401 without cookie');
    assert.strictEqual(noCookieRes.body.error.code, 'UNAUTHORIZED');
    console.log('✓ Test 6 passed: Missing cookie rejected with 401');

    // Test 7: GET /auth/me with tampered cookie
    console.log('\n[Test 7] GET /auth/me with tampered signature');
    const tamperedCookie = rawCookie + 'tampered';
    const tamperedRes = await request('GET', '/auth/me', {
      headers: { Cookie: tamperedCookie },
    });
    assert.strictEqual(tamperedRes.status, 401, 'Expected 401 with tampered cookie');
    console.log('✓ Test 7 passed: Tampered cookie signature rejected with 401');

    // Test 8: GET /auth/me with unsigned cookie
    console.log('\n[Test 8] GET /auth/me with unsigned cookie');
    const unsignedRes = await request('GET', '/auth/me', {
      headers: { Cookie: 'sid=opaque-session-id-without-signature' },
    });
    assert.strictEqual(unsignedRes.status, 401, 'Expected 401 with unsigned cookie');
    console.log('✓ Test 8 passed: Unsigned cookie rejected with 401');

    // Test 9: GET /auth/me with expired session in store
    console.log('\n[Test 9] Expired session eviction');
    const expiredSessionId = sessionStore.create(1, -1000); // Already expired
    // Cookie-parser signs: s:<val>.<sig>
    // Testing sessionStore directly:
    assert.strictEqual(sessionStore.get(expiredSessionId), null, 'Expired session should return null and be evicted');
    console.log('✓ Test 9 passed: Expired sessions are evicted on read');

    // Test 10: POST /auth/logout with valid cookie
    console.log('\n[Test 10] POST /auth/logout');
    const logoutRes = await request('POST', '/auth/logout', {
      headers: { Cookie: rawCookie },
    });
    assert.strictEqual(logoutRes.status, 204, 'Expected 204 on logout');
    const clearCookieHeader = logoutRes.headers['set-cookie'];
    assert(clearCookieHeader && clearCookieHeader.length > 0, 'Expected clearing Set-Cookie');
    const clearStr = clearCookieHeader[0];
    console.log('Logout Set-Cookie:', clearStr);
    assert(/Expires=Thu, 01 Jan 1970/i.test(clearStr) || /Max-Age=0/i.test(clearStr), 'Cookie must be cleared');
    assert(/HttpOnly/i.test(clearStr), 'Cleared cookie must retain HttpOnly');
    assert(/SameSite=Lax/i.test(clearStr), 'Cleared cookie must retain SameSite=Lax');
    console.log('✓ Test 10 passed: Logout destroys session and clears cookie');

    // Test 11: GET /auth/me after logout
    console.log('\n[Test 11] GET /auth/me after logout');
    const afterLogoutRes = await request('GET', '/auth/me', {
      headers: { Cookie: rawCookie },
    });
    assert.strictEqual(afterLogoutRes.status, 401, 'Old cookie must be unusable after logout');
    console.log('✓ Test 11 passed: Session successfully destroyed on server');

    // Test 12: POST /auth/logout idempotency
    console.log('\n[Test 12] POST /auth/logout idempotency');
    const repeatedLogoutRes = await request('POST', '/auth/logout');
    assert.strictEqual(repeatedLogoutRes.status, 204, 'Repeated logout must still return 204');
    console.log('✓ Test 12 passed: Repeated logout is idempotent');

    // Test 13: Secure cookie option in production
    console.log('\n[Test 13] Production Secure cookie flag test');
    process.env.COOKIE_SECURE = 'true';
    const prodCookieOpts = getSessionCookieOptions();
    assert.strictEqual(prodCookieOpts.secure, true, 'secure must be true when COOKIE_SECURE is true');
    process.env.COOKIE_SECURE = 'false';
    const devCookieOpts = getSessionCookieOptions();
    assert.strictEqual(devCookieOpts.secure, false, 'secure must be false for local testing');
    console.log('✓ Test 13 passed: Secure flag responds accurately to configuration');

    console.log('\n🎉 ALL 13 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
