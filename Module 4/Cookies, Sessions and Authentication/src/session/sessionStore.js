/**
 * Session Store Module
 *
 * ARCHITECTURAL & SECURITY NOTE:
 * This in-memory Map store is suitable strictly for learning and local single-process
 * execution. Because the store resides in the application's heap memory:
 * 1. Sessions will be lost whenever the process restarts.
 * 2. In multi-instance or horizontally scaled production deployments, sessions
 *    cannot be shared across processes or servers.
 *
 * Production applications must use a shared, distributed, persistent or high-availability
 * store with built-in TTL expiration, such as Redis (e.g., connect-redis) or Memcached.
 *
 * SECURITY CONTRACT:
 * - Stores ONLY opaque session IDs mapping to { userId, expiresAt }.
 * - Never stores passwords, password hashes, or full user records.
 * - Actively removes expired sessions upon lookup.
 */

const crypto = require('crypto');

// In-memory store: sessionId (string) -> { userId: number, expiresAt: Date }
const sessions = new Map();

/**
 * Creates a new session with an unpredictable, cryptographically secure identifier.
 *
 * @param {number} userId - The identifier of the authenticated user.
 * @param {number} [ttlMs] - Time to live in milliseconds (defaults to SESSION_TTL_MS or 1 hour).
 * @returns {string} The opaque session ID.
 */
function create(userId, ttlMs) {
  const ttl = Number(ttlMs || process.env.SESSION_TTL_MS || 3600000);
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttl);

  sessions.set(sessionId, {
    userId,
    expiresAt,
  });

  return sessionId;
}

/**
 * Retrieves a session by ID. Removes expired sessions during reads.
 *
 * @param {string} sessionId - The opaque session identifier.
 * @returns {{ userId: number, expiresAt: Date } | null} The session record, or null if missing/expired.
 */
function get(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return null;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  // Check expiration (lazy eviction on read)
  if (Date.now() > session.expiresAt.getTime()) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

/**
 * Destroys a session by removing it from the store.
 *
 * @param {string} sessionId - The opaque session identifier.
 * @returns {boolean} True if a session was deleted, false otherwise.
 */
function destroy(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  return sessions.delete(sessionId);
}

/**
 * Clears all sessions (used for test teardown).
 */
function clear() {
  sessions.clear();
}

/**
 * Returns current count of active sessions.
 */
function size() {
  return sessions.size;
}

module.exports = {
  create,
  get,
  destroy,
  clear,
  size,
};
