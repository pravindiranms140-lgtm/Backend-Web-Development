const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');

const BCRYPT_COST = Number(process.env.BCRYPT_COST) || 12;
const DUMMY_HASH = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lew.8uE5o4jO1kR.6';

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function normalizeName(name) {
  return name.trim();
}

async function register({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(name);

  const existingUser = await userRepository.findByEmail(normalizedEmail);
  if (existingUser) {
    const error = new Error('Email is already registered');
    error.statusCode = 409;
    error.code = 'EMAIL_ALREADY_EXISTS';
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  try {
    const user = await userRepository.create({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
    });
    return user;
  } catch (err) {
    if (err && err.code === 'P2002') {
      const conflictError = new Error('Email is already registered');
      conflictError.statusCode = 409;
      conflictError.code = 'EMAIL_ALREADY_EXISTS';
      throw conflictError;
    }
    throw err;
  }
}

async function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email);

  const user = await userRepository.findByEmail(normalizedEmail);
  if (!user) {
    // Perform dummy compare to mitigate timing side-channels
    await bcrypt.compare(password, DUMMY_HASH).catch(() => {});
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  return user;
}

module.exports = {
  normalizeEmail,
  normalizeName,
  register,
  login,
};
