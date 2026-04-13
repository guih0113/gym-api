# Design: TypeScript + Vercel + Neon Deploy Hardening

## Goal

Improve project configuration in three areas:

1. Make `tsconfig.json` safer and more maintainable for the current Node.js + TypeScript stack.
2. Validate and adjust Vercel deployment configuration for a Fastify API running as a Serverless Function.
3. Provide a free, practical, production-oriented database deployment path using Neon.

## Context Observed

- Runtime: Node.js, TypeScript, Fastify, Prisma, PostgreSQL.
- Vercel entrypoint already exists in `api/index.ts` and proxies requests to Fastify.
- Current `vercel.json` uses `@vercel/node` and rewrites all routes to `api/index.ts`.
- Current `tsconfig.json` is minimal and can be improved for module resolution consistency, stricter safety, and editor/tooling ergonomics.

## Chosen Approach

Use a Vercel-first Serverless architecture with Neon pooled connections for runtime and direct Neon connection for migrations/admin tasks.

Why this approach:

- Best match for the user requirement (Vercel + free DB path).
- Reduces Prisma connection issues common in serverless environments.
- Keeps local development simple while hardening production behavior.

## Design Part A: TypeScript Configuration Improvements

### Intended `tsconfig.json` adjustments

- Keep `target` modern (`ES2022`) and align module behavior with project runtime.
- Explicitly set `moduleResolution` for predictable import resolution.
- Keep path alias support (`@/*`) and ensure compatibility with existing tooling.
- Keep `strict: true`, add focused strictness improvements such as:
  - `noUncheckedIndexedAccess`
  - `noImplicitOverride` (if codebase shape supports it)
- Add practical compiler options for server/backend projects:
  - `resolveJsonModule`
  - `types: ["node"]`
  - `noEmit: true` (since build output is handled by `tsup`)
- Keep `skipLibCheck: true` for performance unless specific type package issues demand otherwise.

### Constraints

- Avoid options that conflict with current build/test tooling.
- Maintain compatibility with existing import style in the codebase.

## Design Part B: Vercel Serverless Deployment Hardening

### `vercel.json` expectations

- Keep `version: 2` and Node builder.
- Keep rewrite strategy that routes all API paths to `api/index.ts`.
- Validate runtime expectations for Node version compatibility with dependencies.
- Optionally set function-level config where useful (duration/region) without overfitting.

### Serverless entrypoint behavior (`api/index.ts`)

- Ensure `app.ready()` lifecycle is safe for repeated invocations.
- Preserve Fastify request handling via `app.server.emit('request', req, res)`.
- Keep local server startup (`src/server.ts`) separate from serverless handler.

### Operational checks

- Verify no serverless-incompatible assumptions (long-lived process state, binding ports in handler).
- Verify required env vars are configured in Vercel project settings.

## Design Part C: Neon Free Database Deployment (Step-by-step)

### Environment model

- `DATABASE_URL`: Neon pooled URL for application runtime in Vercel.
- `DIRECT_URL`: Neon direct URL for migrations and admin operations.

### Deployment workflow

1. Create Neon project (free), database, and dedicated app user/role.
2. Copy pooled and direct connection strings from Neon dashboard.
3. Configure Vercel environment variables (`Production` and optionally `Preview`).
4. Run Prisma migrations with direct connection (`prisma migrate deploy`) in controlled flow.
5. Deploy API to Vercel and validate connectivity through logs and API health routes.
6. Confirm DB schema and connection activity in Neon dashboard.

### Free-tier guardrails

- Separate production and development credentials.
- Avoid running heavy local workloads against production DB.
- Monitor Neon usage and set expectations for free limits.

## Data Flow

1. Client hits Vercel endpoint.
2. Vercel routes to `api/index.ts`.
3. Fastify handles route/controller logic.
4. Prisma queries Neon using pooled runtime connection.
5. Response returns through Vercel function.

Migration flow is separate and uses direct URL to apply schema changes safely.

## Error Handling and Risk Management

- Invalid env vars fail fast at startup via Zod env validation.
- DB connectivity errors surfaced in Vercel logs for diagnosis.
- Keep migration execution explicit to prevent accidental schema drift.
- Avoid logging secrets in production logs.

## Testing and Verification Plan

- Type-check pass after `tsconfig` changes.
- Existing test suites (`unit` and `e2e`) continue to pass locally.
- Vercel deployment smoke checks:
  - Root/API route response
  - Auth endpoint behavior
  - One DB-backed endpoint query succeeds
- Post-deploy migration verification against expected schema.

## Deliverables

1. Updated `tsconfig.json` with safer and clearer compiler options.
2. Reviewed/updated `vercel.json` and any required serverless entrypoint adjustments.
3. Written, practical Neon free deployment guide in project docs/README section.

## Out of Scope

- Re-architecting application layers or domain logic.
- Switching ORM, framework, or cloud provider.
- Paid database provider setup.
