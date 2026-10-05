/* Test-only preload for the local Playwright server; no production DB access. */
if (process.env.DATABASE_URL !== 'mysql://test:test@127.0.0.1:1/test') throw Error('UI adapter requires the isolated test database URL');
global.prisma = { admin: { findUnique: async ({ where }) => where.id === 1 ? { id: 1, usuario: 'Admin UI' } : null } };
