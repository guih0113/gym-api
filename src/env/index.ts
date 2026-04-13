import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['dev', 'test', 'production']).default('dev'),
  JWT_SECRET: z.string(),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  PRISMA_ACCELERATE_URL: z.string().optional(),
  PORT: z.coerce.number().default(3333),
})

const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
  console.error('❌ Invalid environment variables. See details below:')
  for (const issue of _env.error.issues) {
    console.error(`- Variable '${issue.path.join('.')}': ${issue.message}`)
  }

  console.error('\n[DEBUG] Available environment variable keys:', Object.keys(process.env).join(', '))

  throw new Error('Invalid environment variables. Halting application start.')
}

export const env = _env.data
