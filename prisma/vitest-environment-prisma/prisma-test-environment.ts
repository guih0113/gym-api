import 'dotenv/config'
import { execSync } from 'node:child_process'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const defaultLocalTestDatabaseUrl = 'postgresql://docker:docker@localhost:5432/apisolid?schema=public'

const baseDatabaseUrl =
  process.env.TEST_DIRECT_URL ??
  process.env.TEST_DATABASE_URL ??
  (process.env.NODE_ENV === 'test'
    ? defaultLocalTestDatabaseUrl
    : process.env.DIRECT_URL ?? process.env.DATABASE_URL)

if (!baseDatabaseUrl) {
  throw new Error('Please provide DIRECT_URL or DATABASE_URL environment variable.')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: baseDatabaseUrl }),
})

const globalForE2E = globalThis as typeof globalThis & {
  __e2eMigrationsApplied?: boolean
}

function generateDatabaseURL(schema: string) {
  // schema public é o schema primário

  if (!baseDatabaseUrl) {
    throw new Error('Please provide DIRECT_URL or DATABASE_URL environment variable.')
  }

  const url = new URL(baseDatabaseUrl)

  url.searchParams.set('schema', schema)

  return url.toString()
}

export default {
  name: 'prisma',
  transformMode: 'ssr',
  // método setup é executado antes de cada teste
  async setup() {
    const publicDatabaseUrl = generateDatabaseURL('public')

    process.env.DATABASE_URL = publicDatabaseUrl
    process.env.DIRECT_URL = publicDatabaseUrl

    if (!globalForE2E.__e2eMigrationsApplied) {
      execSync('npx prisma migrate deploy', { stdio: 'ignore' })
      globalForE2E.__e2eMigrationsApplied = true
    }

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "check_ins", "gyms", "users" RESTART IDENTITY CASCADE',
    )

    return {
      // método teardown executa após o encerramento dos testes
      async teardown() {
        await prisma.$disconnect()
      }
    }
  },
}
