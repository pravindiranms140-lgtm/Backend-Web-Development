const { PrismaClient } = require('@prisma/client');
const postSeed = require('../src/data/postSeed');

const prisma = new PrismaClient();

async function main() {
  // Upsert initial demo user (id: 1) so post author foreign keys succeed
  await prisma.user.upsert({
    where: { id: 1 },
    update: { name: 'Alice' },
    create: { id: 1, name: 'Alice', email: 'alice@example.com' },
  });

  // Upsert initial posts from postSeed.js
  for (const post of postSeed) {
    await prisma.post.upsert({
      where: { id: post.id },
      update: {
        title: post.title,
        body: post.body,
        authorId: post.authorId,
      },
      create: {
        id: post.id,
        title: post.title,
        body: post.body,
        authorId: post.authorId,
      },
    });
  }

  // Ensure postgres sequence for post id is updated past maximum seeded id
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Post"', 'id'), coalesce(max(id), 0) + 1, false) FROM "Post";`
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce(max(id), 0) + 1, false) FROM "User";`
  );

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
