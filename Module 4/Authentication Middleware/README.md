# LU 51 — Authentication Middleware

## What you are building

You will implement `requireAuth` — an Express middleware function that guards protected routes using JWT Bearer token authentication.

When a request comes in, `requireAuth` should:
1. Read the `Authorization` header and extract the Bearer token
2. Return `401` immediately if the token is missing or the scheme is not Bearer
3. Verify the token using `jwt.verify` with the test secret
4. Attach the verified payload to `req.user`
5. Call `next()` so the route handler runs
6. Return `401` in the catch block if verification fails for any reason

Every failure — missing header, wrong scheme, expired token, tampered token, malformed string — must return the **same generic 401 response body**. No variation.

---

## What is already provided

You do **not** need to set up routing, signing, or tests. Everything except the middleware is ready.

| File | What it does | Edit? |
|---|---|---|
| `src/app.js` | Express app with public and protected routes wired up | ❌ No |
| `src/middleware/requireAuth.js` | **Your task** — currently calls `next()` unconditionally | ✅ Yes |
| `src/utils/jwt.js` | Signs test tokens using the test secret | ❌ No |
| `tests/run.js` | Automated test suite — runs 4 scenarios against your middleware | ❌ No |
| `.env.example` | Contains the test `JWT_SECRET` to use | ❌ No |

> **No database. No bcrypt.** This assignment is JWT verification only.

---

## Routes in the app

| Route | Protected? | What it does |
|---|---|---|
| `POST /auth/login` | ❌ Public | Signs and returns a test JWT |
| `GET /profile` | ✅ Protected | Returns `req.user.sub` — only works if requireAuth passes |
| `GET /posts/my` | ✅ Protected | Returns `req.user.sub` — only works if requireAuth passes |
| `POST /posts` | ✅ Protected | Returns `req.user.sub` — only works if requireAuth passes |

---

## Setup

**Step 1 — Copy the `.env.example` to `.env`:**

```bash
cp .env.example .env
```

The `.env.example` already has the correct test secret. Do not change it — the test suite uses the same secret to sign tokens.

**Step 2 — Install dependencies:**

```bash
npm install
```

**Step 3 — Start the server:**

```bash
npm start
```

Server runs on `http://localhost:3000`.

---

## Your task — implement `requireAuth`

Open `src/middleware/requireAuth.js`. It currently looks like this:

```js
// TODO: Implement requireAuth middleware.
module.exports = function requireAuth(req, res, next) {
  next(); // ← stub — remove this and implement properly
};
```

Replace it with a proper implementation. Here is the contract your middleware must fulfill:

### Step 1 — Read the Authorization header

```js
const authHeader = req.headers.authorization ?? '';
```

Use `?? ''` so you never work with `undefined`.

### Step 2 — Extract the Bearer token using a strict regex

```js
const match = /^Bearer ([^\s]+)$/i.exec(authHeader);
const token = match ? match[1] : null;
```

The regex requires the `Bearer` prefix. If the header is absent, uses `Basic`, or has no token after `Bearer`, the result is `null`.

### Step 3 — Return 401 if token is null

```js
if (!token) {
  return res.status(401).json({
    error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
  });
}
```

Always use `return` before `res.status(...)` — otherwise Express continues running the function.

### Step 4 — Verify the token in a try block

```js
try {
  const payload = jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'],
  });
  req.user = payload;   // attach verified identity
  next();               // pass to route handler
} catch (_error) {
  return res.status(401).json({
    error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
  });
}
```

- `jwt.verify` takes the token, the secret from env, and an explicit algorithm option
- Set `req.user = payload` **inside the try block**, after verify returns — never before
- The catch block must return the **same 401 body** as the null check above

---

## Required 401 response format

Every failure must return exactly this — same status, same body, every time:

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required"
  }
}
```

---

## Test manually with curl

**First, get a test token:**

```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"sub":"user-7"}'
```

Response: `{ "token": "eyJhbGci..." }` — copy the token value.

**Use the token on a protected route (should return 200):**

```bash
curl -s -H "Authorization: Bearer <PASTE_TOKEN_HERE>" \
  http://localhost:3000/profile
```

Expected: `{ "userId": "user-7", "message": "Profile data" }`

**No token (should return 401):**

```bash
curl -s http://localhost:3000/profile
```

Expected: `{ "error": { "code": "AUTH_REQUIRED", "message": "Authentication required" } }`

**Wrong scheme (should return 401):**

```bash
curl -s -H "Authorization: Basic dXNlcjpwYXNz" http://localhost:3000/profile
```

Expected: same 401 body

**Bad/tampered token (should return 401):**

```bash
curl -s -H "Authorization: Bearer not.a.real.jwt" http://localhost:3000/profile
```

Expected: same 401 body

---

## Run the automated tests

```bash
npm test
```

The test suite checks four things:

| Test | What it verifies |
|---|---|
| Test 1 | Missing `Authorization` header → `401 AUTH_REQUIRED` |
| Test 2 | Invalid / tampered token → `401 AUTH_REQUIRED` |
| Test 3 | Valid token → `req.user` is set with the verified payload |
| Test 4 | Protected route with valid token → `200` from route handler |

When your implementation is correct, all tests pass:

```
Results: 13 passed, 0 failed
All tests passed! ✓
```

---

## Security rules — do not break these

| Rule | Why |
|---|---|
| Use `jwt.verify`, not `jwt.decode` | `jwt.decode` does no signature check — any string passes |
| Set `req.user` only inside the try block after verify | Setting it before means failed tokens still attach identity |
| Same 401 body for every failure | Distinguishing errors gives attackers free information |
| Read `JWT_SECRET` from `process.env` | Never hardcode secrets in source code |

---

## Submission

1. Fork or copy this starter into your own repository
2. Implement `requireAuth` in `src/middleware/requireAuth.js`
3. Run `npm test` and confirm all tests pass
4. Commit your changes on a feature branch
5. Push the branch and open a pull request
6. Submit the pull request link on the platform
