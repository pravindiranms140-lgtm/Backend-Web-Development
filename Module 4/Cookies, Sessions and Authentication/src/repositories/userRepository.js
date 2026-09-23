const prisma = require('../db/prisma');

/**
 * Returns a user by their email address.
 * Used during authentication credential checks.
 *
 * @param {string} email
 * @returns {Promise<import('@prisma/client').User | null>}
 */
async function findByEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
}

/**
 * Returns safe identity fields for a user by their ID.
 * Explicitly excludes passwordHash from being fetched.
 *
 * @param {number} id
 * @returns {Promise<{ id: number, name: string, email: string, createdAt: Date } | null>}
 */
async function findById(id) {
  const numericId = Number(id);
  if (isNaN(numericId)) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: numericId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
}

/**
 * Strips sensitive fields (such as passwordHash) from a user object.
 *
 * @param {object} user
 * @returns {{ id: number, name: string, email: string, createdAt: Date }}
 */
function toSafeUser(user) {
  if (!user) return null;
  const { id, name, email, createdAt } = user;
  return { id, name, email, createdAt };
}

module.exports = {
  findByEmail,
  findById,
  toSafeUser,
};
