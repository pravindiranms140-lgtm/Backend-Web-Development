# Database Integration Assignment Starter

Replace the in-memory repository implementation with PostgreSQL through Prisma. The starter already uses an asynchronous repository contract so services and controllers can remain stable during the swap.

## Run

```bash
npm install
npm start
```

## Prisma preparation

Copy `.env.example` to `.env` with a local PostgreSQL URL. The schema is intentionally incomplete for the assignment.

```bash
npm run prisma:format
npm run prisma:validate
npm run prisma:generate
npm run db:migrate
npm run db:seed
```

Read the platform question before editing. Do not add platform-only `question.md`, answer files, tests, or specs to this repository. Never commit `.env` or real credentials.
