import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('env', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('accepts runtime DATABASE_URL and DIRECT_URL when provided', async () => {
    vi.stubEnv('JWT_SECRET', 'test-secret')
    vi.stubEnv('DATABASE_URL', 'postgresql://runtime-user:runtime-pass@localhost:5432/runtime-db')
    vi.stubEnv('DIRECT_URL', 'postgresql://direct-user:direct-pass@localhost:5432/direct-db')

    const { env } = await import('./index')

    expect(env.DATABASE_URL).toBe('postgresql://runtime-user:runtime-pass@localhost:5432/runtime-db')
    expect(env.DIRECT_URL).toBe('postgresql://direct-user:direct-pass@localhost:5432/direct-db')
  })
})
