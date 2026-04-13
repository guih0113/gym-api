# Vercel + Neon Deploy Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve TypeScript and Vercel configuration for reliable serverless deployment and add a practical Neon free-tier database deployment workflow.

**Architecture:** Keep Fastify as the single app entry (`src/app.ts`) with a dedicated Vercel handler (`api/index.ts`) and explicit runtime/database environment boundaries. Use Neon pooled URL for runtime queries and direct URL for migrations, documented in README and validated through env schema. Changes remain incremental and compatible with existing scripts/tests.

**Tech Stack:** TypeScript, Fastify, Prisma, Vercel Serverless Functions, Neon Postgres, Vitest

---

## File Structure and Responsibilities

- Modify: `tsconfig.json` - strengthen compiler safety and module resolution defaults for Node backend.
- Modify: `api/index.ts` - harden serverless handler lifecycle for repeated invocations.
- Modify: `vercel.json` - keep predictable API rewrite/function behavior for Vercel.
- Modify: `src/env/index.ts` - validate `DIRECT_URL` and remove env ambiguities.
- Modify: `src/server.ts` - remove sensitive DB URL logging.
- Modify: `prisma/schema.prisma` - define datasource URLs for runtime and direct migration flows.
- Modify: `prisma.config.ts` - align Prisma CLI config with new env strategy.
- Modify: `README.md` - add Neon free deploy section and Vercel deployment checklist.
- Create: `src/env/index.spec.ts` - env schema regression tests.

### Task 1: Lock in TypeScript baseline

**Files:**
- Modify: `tsconfig.json`
- Test: `npm run build`

- [ ] **Step 1: Write the failing expectation as a static check**

Use this command to confirm current config is too permissive/missing options:

```bash
npx tsc --showConfig
```

Expected: output does not include `noUncheckedIndexedAccess`, `types: ["node"]`, and explicit `moduleResolution`.

- [ ] **Step 2: Update `tsconfig.json` with minimal strict improvements**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "types": ["node"],
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src", "api", "prisma.config.ts", "vite.config.ts"]
}
```

- [ ] **Step 3: Run build validation**

Run: `npm run build`

Expected: build succeeds and produces `build/` output without TypeScript config errors.

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json
git commit -m "chore: improve tsconfig strictness and node resolution"
```

### Task 2: Harden Vercel serverless runtime path

**Files:**
- Modify: `api/index.ts`
- Modify: `vercel.json`
- Test: `npm run build`

- [ ] **Step 1: Write a failing expectation for handler stability**

Run this quick smoke check before changes:

```bash
npm run build
```

Expected: build may pass, but handler still lacks explicit readiness cache/defensive lifecycle.

- [ ] **Step 2: Update `api/index.ts` to cache `app.ready()` and avoid extension mismatch**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { app } from '../src/app'

let appReadyPromise: Promise<void> | null = null

async function ensureAppReady() {
  if (!appReadyPromise) {
    appReadyPromise = app.ready()
  }

  await appReadyPromise
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureAppReady()
  app.server.emit('request', req, res)
}
```

- [ ] **Step 3: Keep rewrite behavior explicit in `vercel.json` and add function guardrails**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "functions": {
    "api/index.ts": {
      "maxDuration": 10
    }
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "api/index.ts" }
  ]
}
```

- [ ] **Step 4: Re-run build validation**

Run: `npm run build`

Expected: success; `api/index.ts` remains valid and rewrite config stays intact.

- [ ] **Step 5: Commit**

```bash
git add api/index.ts vercel.json
git commit -m "chore: harden vercel serverless handler and function config"
```

### Task 3: Enforce Neon runtime and migration env strategy

**Files:**
- Modify: `src/env/index.ts`
- Modify: `src/server.ts`
- Modify: `prisma/schema.prisma`
- Modify: `prisma.config.ts`
- Create: `src/env/index.spec.ts`
- Test: `src/env/index.spec.ts`

- [ ] **Step 1: Write failing env tests first**

Create `src/env/index.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['dev', 'test', 'production']).default('dev'),
  JWT_SECRET: z.string(),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  PORT: z.coerce.number().default(3333),
})

describe('env schema', () => {
  it('accepts runtime DATABASE_URL', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'production',
      JWT_SECRET: 'secret',
      DATABASE_URL: 'postgresql://runtime',
    })

    expect(result.success).toBe(true)
  })

  it('accepts DIRECT_URL for migration context', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'production',
      JWT_SECRET: 'secret',
      DIRECT_URL: 'postgresql://direct',
    })

    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify current mismatch**

Run: `npx vitest run src/env/index.spec.ts`

Expected: FAIL because production schema currently does not include `DIRECT_URL` and test/module setup is not aligned yet.

- [ ] **Step 3: Update `src/env/index.ts` and remove sensitive log in `src/server.ts`**

`src/env/index.ts` target shape:

```ts
import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['dev', 'test', 'production']).default('dev'),
  JWT_SECRET: z.string(),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  PORT: z.coerce.number().default(3333),
})

const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
  console.error('Invalid environment variables.', _env.error.format())
  throw new Error('Invalid environment variables.')
}

export const env = _env.data
```

`src/server.ts` target:

```ts
import { app } from './app'
import { env } from './env'

app
  .listen({
    host: '0.0.0.0',
    port: env.PORT,
  })
  .then(() => {
    console.log('HTTP Server Running!')
  })
```

- [ ] **Step 4: Update Prisma datasource for pooled runtime + direct migrations**

`prisma/schema.prisma` datasource block:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

`prisma.config.ts` target:

```ts
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
})
```

- [ ] **Step 5: Run focused tests and build**

Run: `npx vitest run src/env/index.spec.ts && npm run build`

Expected: PASS for env tests and successful build.

- [ ] **Step 6: Commit**

```bash
git add src/env/index.ts src/env/index.spec.ts src/server.ts prisma/schema.prisma prisma.config.ts
git commit -m "chore: align prisma and env config for neon pooled and direct urls"
```

### Task 4: Document Vercel and Neon free deployment path

**Files:**
- Modify: `README.md`
- Test: manual docs validation

- [ ] **Step 1: Add Vercel deployment section with required envs**

Add to `README.md`:

```md
## Deploy na Vercel (API Serverless)

1. Importe o repositório na Vercel.
2. Confirme que `vercel.json` usa `api/index.ts` como função.
3. Configure variáveis em Project Settings > Environment Variables:
   - `NODE_ENV=production`
   - `JWT_SECRET=<seu-segredo>`
   - `DATABASE_URL=<Neon pooled URL>`
   - `DIRECT_URL=<Neon direct URL>`
4. Faça o deploy e valide `/docs` e endpoints principais.
```

- [ ] **Step 2: Add Neon free database step-by-step**

Add to `README.md`:

```md
## Deploy do banco (Neon - plano gratuito)

1. Crie conta em Neon e um novo projeto.
2. Crie um banco e um usuário dedicado da aplicação.
3. Copie duas strings de conexão:
   - Pooled (para `DATABASE_URL` na Vercel)
   - Direct (para `DIRECT_URL`, usada em migrations)
4. Aplique migrations:
   - `npx prisma migrate deploy`
5. Valide dados e conexões no dashboard do Neon.

Boas práticas:
- Não exponha URLs em logs.
- Use credenciais separadas para desenvolvimento e produção.
- Monitore limites do plano gratuito.
```

- [ ] **Step 3: Verify documentation clarity**

Run: open `README.md` and ensure sections are in Portuguese, sequential, and copy-paste ready.

Expected: no ambiguous steps, all required env vars listed exactly once.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add vercel and neon free deployment guide"
```

### Task 5: Final verification before handoff

**Files:**
- Modify: none
- Test: full project verification

- [ ] **Step 1: Run targeted tests**

Run: `npm test`

Expected: unit tests pass.

- [ ] **Step 2: Run e2e tests**

Run: `npm run test:e2e`

Expected: e2e tests pass in current environment.

- [ ] **Step 3: Run final build check**

Run: `npm run build`

Expected: build succeeds with updated config and no runtime entrypoint errors.

- [ ] **Step 4: Verify git status is clean**

Run: `git status`

Expected: working tree clean and commits created for each task.

- [ ] **Step 5: Optional squash policy decision**

```bash
git log --oneline -n 10
```

Expected: clear commit history; only squash if team convention requires it.

## Self-Review Against Spec

- Spec coverage: all three requested outcomes are mapped (tsconfig improvement, Vercel config validation/hardening, Neon free DB deployment steps).
- Placeholder scan: no `TODO`/`TBD` or undefined references remain.
- Type consistency: `DATABASE_URL` and `DIRECT_URL` names are consistent across env, Prisma, and README tasks.
