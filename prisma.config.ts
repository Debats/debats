import { defineConfig } from 'prisma/config'

/**
 * Prisma is the write side's database access, with transactions. Migrations
 * stay with Supabase (supabase/migrations): Prisma only introspects the schema
 * (`npm run prisma:pull`) and generates the client (`npm run prisma:generate`).
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Optional so that `prisma generate` runs without a database (build servers)
    url: process.env.DATABASE_URL ?? '',
  },
  // Supabase owns auth.users; contributors reference it without Prisma managing it
  experimental: { externalTables: true },
  tables: { external: ['auth.users'] },
})
