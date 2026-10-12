const express = require('express');
const bcrypt = require('bcryptjs');
const sessionStore = require('../session/sessionStore');
const userRepository = require('../repositories/userRepository');
const { COOKIE_NAME, getSessionCookieOptions, getClearCookieOptions } = require('../session/cookieConfig');
const requireSession = require('../middleware/requireSession');

const router = express.Router();

/**
 * POST /auth/login
 *
 * Authenticates user credentials, creates a server-side session,
 * sets a signed HTTP-only cookie with the session ID, and returns safe user fields.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    // Validate and normalize input
    if (
      !email ||
      !password ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password.trim()
    ) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Query user via repository abstraction
    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      // Generic 401 prevents user enumeration attacks
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        },
      });
    }

    // Verify credentials asynchronously with bcrypt
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      // Identical generic 401 prevents timing/credential leakage
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        },
      });
    }

    // Create server-side session with opaque ID
    const sessionId = sessionStore.create(user.id);

    // Send sid using Set-Cookie with centralized options
    res.cookie(COOKIE_NAME, sessionId, getSessionCookieOptions());

    // Return 200 with safe user fields only
    return res.status(200).json({
      user: userRepository.toSafeUser(user),
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /auth/me
 *
 * Protected endpoint returning the identity of the currently authenticated session.
 */
router.get('/me', requireSession, async (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

/**
 * POST /auth/logout
 *
 * Destroys server-side session and clears the signed cookie using matching options.
 * Idempotent: repeated calls safely return 204.
 */
router.post('/logout', (req, res, next) => {
  try {
    const sessionId = req.signedCookies && req.signedCookies[COOKIE_NAME];

    if (sessionId && typeof sessionId === 'string') {
      sessionStore.destroy(sessionId);
    }

    // Clear cookie using centralized clear options matching original attributes
    res.clearCookie(COOKIE_NAME, getClearCookieOptions());

    // Idempotent 204 response
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
