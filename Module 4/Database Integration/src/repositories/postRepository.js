const prisma = require('../db/prisma');

async function findAll() {
  return prisma.post.findMany();
}

async function findById(id) {
  const parsedId = Number(id);
  if (isNaN(parsedId)) return null;
  return prisma.post.findUnique({
    where: { id: parsedId },
  });
}

async function create(fields) {
  try {
    return await prisma.post.create({
      data: {
        title: fields.title,
        body: fields.body || '',
        authorId: Number(fields.authorId),
      },
    });
  } catch (error) {
    if (error.code === 'P2003') {
      const err = new Error('Foreign key constraint failed');
      err.statusCode = 400;
      throw err;
    }
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
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.body !== undefined) data.body = patch.body;
  if (patch.authorId !== undefined) data.authorId = Number(patch.authorId);

  try {
    return await prisma.post.update({
      where: { id: parsedId },
      data,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return null;
    }
    if (error.code === 'P2003') {
      const err = new Error('Foreign key constraint failed');
      err.statusCode = 400;
      throw err;
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
    await prisma.post.delete({
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
