const sessionStore = require('../session/sessionStore');
const userRepository = require('../repositories/userRepository');

/**
 * Middleware that authenticates a request using the signed session cookie.
 *
 * Verifies:
 * 1. The presence and valid signature of req.signedCookies.sid.
 * 2. The active existence and non-expiration of the session in sessionStore.
 * 3. The existence of the user in the database (guards against orphaned sessions).
 *
 * Rejects any missing, tampered, expired, or orphaned session with a generic 401 response.
 */
module.exports = async function requireSession(req, res, next) {
  try {
    const sessionId = req.signedCookies && req.signedCookies.sid;

    // Reject missing, unsigned, or tampered cookies (cookie-parser sets tampered cookies to false)
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // Resolve session from server-side store (automatically removes expired sessions)
    const session = sessionStore.get(sessionId);
    if (!session) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // Resolve user from repository (orphaned session check)
    const user = await userRepository.findById(session.userId);
    if (!user) {
      // Clean up orphaned session
      sessionStore.destroy(sessionId);
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // Attach verified identity and session ID to the request object
    req.user = user;
    req.sessionId = sessionId;

    return next();
  } catch (error) {
    // Forward unexpected errors to the centralized error handler without exposing internals
    return next(error);
  }
};
