# Authentication Fundamentals

Authentication endpoints implemented using Express.js and Prisma ORM with SQLite, featuring secure asynchronous bcrypt password hashing, timing-attack-safe generic credential verification, layered repository architecture, and strict response serialization.

## Setup

```bash
npm install
cp .env.example .env
npm run db:push
npm start
```

### Running Tests

```bash
npm test
```

## Endpoints

### 1. POST /auth/register
Registers a new user account with secure password hashing.

- **Request Body**:
  ```json
  {
    "name": "Sam",
    "email": "sam@example.com",
    "password": "correct horse battery staple"
  }
  ```
- **Validation**: Ensures `name`, `email`, and `password` are non-empty strings.
- **Normalization**: Trims and converts email to lowercase before database query and persistence.
- **Security**: Asynchronously hashes password using bcrypt with configurable salt cost factor (`BCRYPT_COST`). Never stores or logs plaintext passwords or hashes.
- **Responses**:
  - `201 Created` - Returns safe user fields (`id`, `name`, `email` only):
    ```json
    {
      "id": 1,
      "name": "Sam",
      "email": "sam@example.com"
    }
    ```
  - `400 Bad Request` - Malformed, missing, or non-string input.
  - `409 Conflict` - Normalized email already exists.

### 2. POST /auth/login
Authenticates user credentials without leaking email existence or password validity.

- **Request Body**:
  ```json
  {
    "email": "sam@example.com",
    "password": "correct horse battery staple"
  }
  ```
- **Validation**: Ensures `email` and `password` are non-empty strings.
- **Verification**: Queries user by normalized email and uses asynchronous `bcrypt.compare` against stored hash.
- **Responses**:
  - `200 OK` - Returns safe user fields (`id`, `name`, `email`):
    ```json
    {
      "id": 1,
      "name": "Sam",
      "email": "sam@example.com"
    }
    ```
  - `400 Bad Request` - Malformed or missing input.
  - `401 Unauthorized` - Generic failure body for both unknown email and incorrect password:
    ```json
    {
      "error": {
        "code": "INVALID_CREDENTIALS",
        "message": "Invalid email or password"
      }
    }
    ```

## Architectural Design & Security Controls

1. **Repository Pattern Isolation**: Direct Prisma client operations are completely isolated behind `src/repositories/userRepository.js`. Services and controllers never invoke Prisma queries directly.
2. **Service Layer Decoupling**: Business logic, input normalization, hashing, and credential verification reside in `src/services/authService.js`. Route handlers in `src/routes/authRoutes.js` only handle HTTP routing and delegation.
3. **Allowlist User Serialization**: `src/utils/serializer.js` uses an explicit safe-field allowlist (`['id', 'name', 'email']`) to ensure `passwordHash` or sensitive fields are never leaked.
4. **Controlled Error Handling**: Unhandled exceptions return generic 500 JSON without exposing Prisma or internal stack traces.
5. **Secret Protection**: `.env` and SQLite database files (`prisma/dev.db`) are untracked and protected by `.gitignore`.
