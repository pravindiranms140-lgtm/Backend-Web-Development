const COOKIE_NAME = 'sid';

/**
 * Returns centralized cookie options for establishing a session cookie.
 * Centralizing options ensures that login and logout cannot drift.
 */
function getSessionCookieOptions() {
  const isSecure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
  const maxAge = Number(process.env.SESSION_TTL_MS || 3600000);

  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    maxAge,
    signed: true,
    path: '/',
  };
}

/**
 * Returns centralized cookie options for clearing a session cookie.
 * Matches all critical attributes (path, httpOnly, sameSite, secure, signed)
 * used when setting the cookie, as required by the cookie specification.
 */
function getClearCookieOptions() {
  const isSecure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    signed: true,
    path: '/',
  };
}

module.exports = {
  COOKIE_NAME,
  getSessionCookieOptions,
  getClearCookieOptions,
};
