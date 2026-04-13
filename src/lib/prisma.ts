import { env } from '@/env'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

if (!env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to initialize PrismaClient.')
}

function resolveAdapterConnectionString(databaseUrl: string) {
  const url = new URL(databaseUrl)
  return url.toString()
}

function resolveAdapterSchema(databaseUrl: string) {
  const schema = new URL(databaseUrl).searchParams.get('schema')
  return schema ?? undefined
}

const adapter = new PrismaPg({
  connectionString: resolveAdapterConnectionString(env.DATABASE_URL),
}, {
  schema: resolveAdapterSchema(env.DATABASE_URL),
})

const clientConfig: ConstructorParameters<typeof PrismaClient>[0] = {
  log: env.NODE_ENV === 'dev' ? ['query'] : [],
  adapter,
}

export const prisma = new PrismaClient(clientConfig)
