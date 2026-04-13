# API Solid (GymPass style)

API de exemplo construída durante o curso — uma aplicação de gerenciamento de academias, usuários e check-ins.

## Resumo rápido

- **Stack:** Node.js + TypeScript, Fastify, Prisma (Postgres), Zod, JWT
- **Docs OpenAPI/Swagger:** disponível em `/docs` (gerado a partir de [src/docs/openapi.yaml](src/docs/openapi.yaml))

## Recursos principais

- Cadastro e autenticação de usuários (roles: `ADMIN`, `MEMBER`).
- Endpoints protegidos por JWT e refresh token via cookie.
- CRUD básico de academias, busca e busca por proximidade.
- Check-ins com regras de negócio (distância máxima, limite diário, validação por administrador).

## Arquitetura & organização

- Código principal: [src/app.ts](src/app.ts) e [src/server.ts](src/server.ts)
- Casos de uso (lógica de negócio): [src/use-cases](src/use-cases)
- Controladores HTTP / rotas: [src/http/controllers](src/http/controllers)
- Repositórios (abstrações): [src/repositories](src/repositories)
- Implementação Prisma: [src/repositories/prisma](src/repositories/prisma)
- Cliente Prisma gerado: [generated/prisma](generated/prisma)
- Schema Prisma e migrations: [prisma/schema.prisma](prisma/schema.prisma) e [prisma/migrations](prisma/migrations)

Tecnologias

- Node.js + TypeScript
- Fastify (HTTP server)
- Prisma (PostgreSQL)
- Zod (validação)
- JWT (autenticação)
- Vitest (testes)

Instalação (rápido)

1. Pré-requisitos: Node.js (>=18), npm, PostgreSQL rodando.
2. Copie as variáveis de ambiente (ex.: um `.env` com `DATABASE_URL`, `JWT_SECRET`).
3. Instale dependências:

```bash
npm ci
```

1. Gere o client do Prisma (se necessário):

```bash
npx prisma generate
```

Variáveis de ambiente (principais)

- `NODE_ENV` — `dev` | `test` | `production` (default: `dev`) — definido em [src/env/index.ts](src/env/index.ts)
- `JWT_SECRET` — segredo para assinar JWTs
- `PORT` — porta HTTP (default `3333`)
- `DATABASE_URL` — string de conexão PostgreSQL

Banco de dados & Prisma

- O schema está em [prisma/schema.prisma](prisma/schema.prisma).
- Migrations estão em [prisma/migrations](prisma/migrations).
- Em produção o Dockerfile executa `npx prisma migrate deploy` antes de iniciar (veja [Dockerfile](Dockerfile)).
- Com DB local para desenvolvimento:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Scripts úteis (veja `package.json`)

- `npm run start:dev` — executa em modo desenvolvimento com `tsx watch src/server.ts`
- `npm run build` — compila para `build/` com `tsup`
- `npm start` — executa `node build/server.js` (produção)
- `npm test` — executa testes unitários com `vitest`
- `npm run test:e2e` — executa testes de integração/endpoint

Docker

- Há um `Dockerfile` para build multi-stage e um `docker-compose.yml` com serviço PostgreSQL de exemplo.
- Exemplo de uso (montagem simples):

```bash
docker compose up -d
# depois, no container da API (ou localmente):
npx prisma migrate deploy
npm start
```

## Deploy na Vercel (API Serverless)

1. No painel da Vercel, clique em **Add New > Project** e importe este repositório.
2. Confirme que o deploy está usando o `vercel.json` com a função `api/index.ts` (entrypoint serverless).
3. Configure as variáveis de ambiente do projeto:
   - `NODE_ENV=production`
   - `JWT_SECRET=<seu-segredo-forte>`
   - `DATABASE_URL=<string pooled do Neon>` (runtime da API)
   - `DIRECT_URL=<string direct do Neon>` (migrations)
4. Execute o deploy (Production) pela Vercel.
5. Após o deploy, valide:
   - documentação em `/docs`
   - autenticação (`POST /sessions`)
   - leitura de perfil (`GET /me`)
   - rotas principais de academias e check-ins

## Deploy do banco (Neon - plano gratuito)

1. Crie uma conta em [Neon](https://neon.tech) e inicie um novo projeto.
2. Crie o banco e um usuário de aplicação (evite usar o usuário admin no app).
3. Copie as duas strings de conexão:
   - pooled (para `DATABASE_URL`)
   - direct (para `DIRECT_URL`)
4. Com as variáveis de produção configuradas, execute as migrations em um ambiente controlado (CI/CD ou sua máquina local com o `.env` de produção):

```bash
npx prisma migrate deploy
```

5. Valide o status das migrations:

```bash
npx prisma migrate status
```

6. Valide no dashboard da Neon se as tabelas e migrations (incluindo `_prisma_migrations`) foram aplicadas corretamente.

Boas práticas

- Não registre URLs de conexão em logs.
- Separe credenciais de desenvolvimento e produção.
- Monitore os limites do plano gratuito (compute, armazenamento e conexões).

API — Endpoints principais

Autenticação

- `POST /users` — Registrar usuário
  - Body: `{ name, email, password, role? }` — `role` opcional (`ADMIN`|`MEMBER`)
  - Retorna: `201` (vazio) ou `409` se email duplicado.
- `POST /sessions` — Autenticar
  - Body: `{ email, password }`
  - Retorna: `{ token }` e seta cookie `refreshToken` (httpOnly).
- `PATCH /token/refresh` — Renova token usando cookie `refreshToken`
  - Retorna novo `{ token }` e atualiza cookie.

Usuários

- `GET /me` — Retorna perfil do usuário autenticado (requere JWT)

Academias (Gyms)

- `GET /gyms/search?q=...&page=1` — Busca por nome (autenticado)
- `GET /gyms/nearby?latitude=...&longitude=...` — Busca por proximidade (autenticado)
- `POST /gyms` — Criar academia (apenas `ADMIN`)

Check-ins

- `POST /gyms/:gymId/check-ins` — Criar check-in (autenticado)
  - Body: `{ latitude, longitude }` — valida distância máxima (100m = 0.1km)
- `GET /check-ins/history?page=1` — Histórico do usuário (autenticado)
- `GET /check-ins/metrics` — Quantidade total de check-ins do usuário (autenticado)
- `PATCH /check-ins/:checkInId/validate` — Validar check-in (apenas `ADMIN`)

Observações sobre segurança e tokens

- A aplicação emite um `token` JWT (via resposta) e um `refreshToken` armazenado em cookie httpOnly.
- Plugins Fastify usados: `@fastify/jwt` e `@fastify/cookie` (configurados em [src/app.ts](src/app.ts)).

Testes

- Testes unitários com `vitest` estão em `src/use-cases`.
- Testes de integração/HTTP estão em `src/http/controllers`.
- Comandos relevantes:

```bash
npm test            # run unit tests
npm run test:e2e    # run e2e tests
npm run test:watch  # watch mode
```

Links úteis

- Código da aplicação: [src](src)
- Entrypoints: [src/app.ts](src/app.ts) / [src/server.ts](src/server.ts)
- Prisma schema: [prisma/schema.prisma](prisma/schema.prisma)
- OpenAPI: [docs/openapi.yaml](docs/openapi.yaml) — UI em `/docs`
