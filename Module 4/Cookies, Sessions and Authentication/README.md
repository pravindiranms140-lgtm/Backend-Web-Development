# LU48 — Session-Based Authentication (Express & Prisma)

A secure, robust session-based authentication implementation for Express and Prisma. Successful authentication creates an opaque server-side session and issues a cryptographically signed, HTTP-only cookie. Protected endpoints authenticate the caller via this server-managed session, and logout securely destroys the session in both the server store and the client cookie.

---

## Architecture Overview

```
                      Client / Browser
                             │
     1. POST /auth/login (email, password)
                             ▼
                    authRoutes.js
                             │
               userRepository.findByEmail()
                             │
                bcrypt.compare(password, hash)
                             │
               sessionStore.create(userId, ttl) ──► Server Session Store (Map)
                             │                      [opaque SID -> { userId, expiresAt }]
   Set-Cookie: sid=s:<sig>; HttpOnly; SameSite=Lax; Path=/
   Response: 200 { user: { id, name, email, createdAt } }
                             │
     2. GET /auth/me (Cookie: sid=s:<sig>)
                             ▼
                   requireSession.js
                             │
               req.signedCookies.sid verified
                             │
               sessionStore.get(sessionId)
                             │
               userRepository.findById(userId)
                             │
   Response: 200 { user: { id, name, email, createdAt } }
                             │
     3. POST /auth/logout (Cookie: sid=s:<sig>)
                             ▼
                   authRoutes.js
                             │
               sessionStore.destroy(sessionId)
                             │
   Set-Cookie: sid=; Expires=Thu, 01 Jan 1970 ... (cleared)
   Response: 204 No Content
```

### Layered Separation of Concerns
- **Centralized Cookie Config (`src/session/cookieConfig.js`)**: Single source of truth for cookie options, preventing drift between setting and clearing cookies.
- **Session Store (`src/session/sessionStore.js`)**: Encapsulates session creation, expiration (TTL), retrieval, and deletion.
- **Data Access Layer (`src/repositories/userRepository.js`)**: Encapsulates all Prisma database interactions away from route handlers and middleware.
- **Authentication Middleware (`src/middleware/requireSession.js`)**: Validates cookie signatures, server session validity, and resolves safe user identity.

---

## Session Contract & Cookie Flags

| Property | Value | Security Rationale |
|---|---|---|
| **Cookie Name** | `sid` | Standard session cookie identifier. |
| **Value** | 64-char hex string | Opaque, cryptographically unpredictable (`crypto.randomBytes(32)`). Never contains email, IDs, or credentials. |
| **Signature** | Signed (`COOKIE_SECRET`) | Express `cookie-parser` signs the cookie with HMAC-SHA256 (`s:...`). Tampered cookies evaluate to `false` and are rejected. |
| **`httpOnly`** | `true` | Prevents client-side scripts (`document.cookie`) from accessing the session token, mitigating XSS token theft. |
| **`sameSite`** | `'lax'` | Balances CSRF protection on cross-site state-changing requests while permitting smooth top-level navigation. |
| **`secure`** | Configurable via `COOKIE_SECURE` (`true` in production) | Ensures the cookie is only transmitted over encrypted HTTPS connections. Set to `false` for local HTTP development. |
| **`maxAge`** | Configurable via `SESSION_TTL_MS` (default 3600000 ms / 1 hr) | Enforces automatic session expiration on both client and server sides. |
| **`path`** | `'/'` | Ensures the cookie is sent for all API paths. Identically applied during `res.clearCookie`. |

---

## Setup & Running

### 1. Prerequisites
- Node.js (v18+)
- npm

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `COOKIE_SECRET` contains at least 32 random characters:
```env
DATABASE_URL="file:./dev.db"
COOKIE_SECRET="super-secure-cookie-secret-key-32-characters-minimum-for-testing"
COOKIE_SECURE="false"
SESSION_TTL_MS="3600000"
PORT="3000"
```

### 3. Install & Database Migration / Seed
```bash
npm install
npm run setup
```
The seed command provisions the default demo user:
- **Email**: `sam@example.com`
- **Password**: `SessionDemo!48`

### 4. Start the Application
Development server (auto-reloading):
```bash
npm run dev
```
Or production start:
```bash
npm run start
```

---

## Endpoints Specification

### 1. `POST /auth/login`
Authenticates user credentials, generates an opaque session, and sets a signed session cookie.

- **Request Body**:
  ```json
  {
    "email": "sam@example.com",
    "password": "SessionDemo!48"
  }
  ```
- **Responses**:
  - `200 OK`: Credentials valid. Sets signed `sid` cookie.
    ```json
    {
      "user": {
        "id": 1,
        "name": "Sam",
        "email": "sam@example.com",
        "createdAt": "2026-09-23T07:30:00.000Z"
      }
    }
    ```
  - `401 Unauthorized`: Invalid email, wrong password, or missing fields.
    ```json
    {
      "error": {
        "code": "UNAUTHORIZED",
        "message": "Invalid email or password"
      }
    }
    ```

### 2. `GET /auth/me`
Protected route that returns the authenticated user's profile.

- **Headers**: Cookie containing valid signed `sid`.
- **Responses**:
  - `200 OK`: Valid session.
    ```json
    {
      "user": {
        "id": 1,
        "name": "Sam",
        "email": "sam@example.com",
        "createdAt": "2026-09-23T07:30:00.000Z"
      }
    }
    ```
  - `401 Unauthorized`: Missing, unsigned, tampered, expired, or orphaned session.
    ```json
    {
      "error": {
        "code": "UNAUTHORIZED",
        "message": "Authentication required"
      }
    }
    ```

### 3. `POST /auth/logout`
Destroys the server-side session and clears the client cookie.

- **Headers**: Cookie containing `sid` (optional).
- **Behavior**: Idempotent. Clears `sid` cookie and destroys server session.
- **Responses**:
  - `204 No Content`

---

## Local Verification Guide (cURL)

Use cURL with a persistent cookie jar file (`cookies.txt`):

```bash
# 1. Login with valid credentials
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"sam@example.com\",\"password\":\"SessionDemo!48\"}" \
  -c cookies.txt

# Expected:
# HTTP/1.1 200 OK
# Set-Cookie: sid=s%3A...; Max-Age=3600; Path=/; HttpOnly; SameSite=Lax
# Safe user fields returned in JSON

# 2. Access protected endpoint with cookie
curl -i -X GET http://localhost:3000/auth/me \
  -b cookies.txt

# Expected:
# HTTP/1.1 200 OK
# {"user":{"id":1,"name":"Sam","email":"sam@example.com",...}}

# 3. Access protected endpoint without cookie
curl -i -X GET http://localhost:3000/auth/me

# Expected:
# HTTP/1.1 401 Unauthorized

# 4. Access protected endpoint with tampered cookie
curl -i -X GET http://localhost:3000/auth/me \
  -H "Cookie: sid=s%3Aforgedsessionid.fake_signature"

# Expected:
# HTTP/1.1 401 Unauthorized

# 5. Logout
curl -i -X POST http://localhost:3000/auth/logout \
  -b cookies.txt \
  -c cookies.txt

# Expected:
# HTTP/1.1 204 No Content
# Set-Cookie: sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax

# 6. Verify session is destroyed
curl -i -X GET http://localhost:3000/auth/me \
  -b cookies.txt

# Expected:
# HTTP/1.1 401 Unauthorized

# 7. Verify logout idempotency
curl -i -X POST http://localhost:3000/auth/logout

# Expected:
# HTTP/1.1 204 No Content
```

---

## Production Readiness: In-Memory vs. Distributed Session Store

> [!WARNING]
> **In-Memory Store Limitation**: The included `sessionStore.js` uses an in-memory `Map` suitable **only for local development and learning**.
>
> In production environments:
> 1. Multi-instance / clustered applications cannot share process memory. A request routed to Server B would not recognize a session created on Server A.
> 2. Application restarts or container deployments instantly drop all active user sessions.
>
> **Production Recommendation**: Replace the in-memory `Map` with a distributed key-value store such as **Redis** (e.g., using `ioredis` or `connect-redis`) with native TTL keys (`SETEX key ttl value`).
