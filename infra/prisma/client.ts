import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../prisma/generated/client'

/**
 * The write side's database client: a direct Postgres connection with
 * transactions, through the pg driver (no Rust engine). One instance per
 * process; Next.js reloads modules in development, hence the global cache.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set: the write side cannot reach the database')
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

/** What a unit of work hands to its participants: the client bound to one transaction */
export type PrismaTransaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]
