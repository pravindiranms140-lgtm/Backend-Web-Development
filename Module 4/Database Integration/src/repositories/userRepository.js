const prisma = require('../db/prisma');

async function findAll() {
  return prisma.user.findMany();
}

async function findById(id) {
  const parsedId = Number(id);
  if (isNaN(parsedId)) return null;
  return prisma.user.findUnique({
    where: { id: parsedId },
  });
}

async function create(fields) {
  try {
    return await prisma.user.create({
      data: {
        name: fields.name,
        ...(fields.email ? { email: fields.email } : {}),
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const err = new Error('Unique constraint failed');
      err.statusCode = 409;
      throw err;
    }
    throw error;
  }
}

async function update(id, patch) {
  const parsedId = Number(id);
  if (isNaN(parsedId)) return null;

  const data = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.email !== undefined) data.email = patch.email;

  try {
    return await prisma.user.update({
      where: { id: parsedId },
      data,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return null;
    }
    if (error.code === 'P2002') {
      const err = new Error('Unique constraint failed');
      err.statusCode = 409;
      throw err;
    }
    throw error;
  }
}

async function remove(id) {
  const parsedId = Number(id);
  if (isNaN(parsedId)) return false;

  try {
    await prisma.user.delete({
      where: { id: parsedId },
    });
    return true;
  } catch (error) {
    if (error.code === 'P2025') {
      return false;
    }
    throw error;
  }
}

module.exports = { findAll, findById, create, update, remove };
