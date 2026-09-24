const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const ALGORITHM = 'HS256';

/**
 * Sign a JWT with the test secret.
 * @param {object} claims - Custom claims to include (e.g. { sub: 'user-7' })
 * @param {string} [expiresIn='1h'] - Expiry string (e.g. '1h', '15m')
 * @returns {string} Signed JWT
 */
function signToken(claims, expiresIn = '1h') {
  return jwt.sign(claims, SECRET, { algorithm: ALGORITHM, expiresIn });
}

/**
 * Sign an immediately expired token for testing.
 */
function signExpiredToken(claims) {
  return jwt.sign(claims, SECRET, { algorithm: ALGORITHM, expiresIn: '0s' });
}

module.exports = { signToken, signExpiredToken };
