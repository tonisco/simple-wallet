# Microservice Wallet System

A two-service gRPC microservice architecture built with **NestJS**, **Prisma**, and **Turborepo**.

```
┌──────────────────────────────────────────────────────────────────┐
│                        Client (grpcurl / Postman)                │
└─────────────────────┬──────────────────────┬─────────────────────┘
                      │ gRPC :50051           │ gRPC :50052
          ┌───────────▼──────────┐ ┌──────────▼──────────────┐
          │    User Service      │ │     Wallet Service       │
          │  CreateUser          │ │  CreateWallet            │
          │  GetUserById         │ │  GetWallet               │
          └─────────┬────────────┘ │  CreditWallet            │
                    │              │  DebitWallet             │
                    │ gRPC         └──────────┬───────────────┘
                    │ GetUserById             │ CreateWallet
                    └──────────────────────── ┘
                              │
                    ┌─────────▼─────────┐
                    │   PostgreSQL DB    │
                    │  (shared schema)   │
                    └───────────────────┘
```

## Prerequisites

| Tool       | Version | Install                                 |
| ---------- | ------- | --------------------------------------- |
| Node.js    | 20+     | https://nodejs.org                      |
| pnpm       | 8+      | `npm install -g pnpm`                   |
| PostgreSQL | 14+     | https://www.postgresql.org/download/    |
| grpcurl    | latest  | https://github.com/fullstorydev/grpcurl |

---

## Installation

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd microservice-assessment/backend-assessment

# 2. Install all workspace dependencies
pnpm install
```

---

## Environment Setup

Create `.env` files for each service. Copy the examples below:

**`apps/user-service/.env`**

```env
DATABASE_URL="file:../../packages/prisma/prisma/dev.db"
LOG_LEVEL="info"
```

**`apps/wallet-service/.env`**

```env
DATABASE_URL="file:../../packages/prisma/prisma/dev.db"
LOG_LEVEL="info"
```

> **Note:** Both services share the same sqlite database. Adjust `DATABASE_URL` to match your local Postgres credentials.

`.env` files are committed so it can be run easily but would not be in real production apps

---

## Database Setup

```bash
# Run migrations (creates User and Wallet tables)
pnpm --filter @repo/prisma exec prisma migrate dev --name init

# Generate the Prisma client
pnpm --filter @repo/prisma exec prisma generate
```

> **Note:** You do not need to do this because pnpm dev does this

---

## Running the Services

```bash
# Start both services in development mode (with watch)
pnpm dev
```

Or run each service individually:

```bash
# Terminal 1 — User Service (port 50051)
pnpm --filter @app/user-service run start:dev

# Terminal 2 — Wallet Service (port 50052)
pnpm --filter @app/wallet-service run start:dev
```

Both services will print structured JSON logs via `nestjs-pino`. You should see:

```
{"level":"info","pid":...,"msg":"Microservice is listening..."}
```

---

## Architecture

### Monorepo Structure

```
backend-assessment/
├── apps/
│   ├── user-service/          # gRPC service on port 50051
│   │   └── src/user/
│   │       ├── user.controller.ts   ← @GrpcMethod handlers
│   │       ├── user.service.ts      ← business logic
│   │       └── user.repository.ts  ← Prisma queries
│   │
│   └── wallet-service/        # gRPC service on port 50052
│       └── src/wallet/
│           ├── wallet.controller.ts
│           ├── wallet.service.ts
│           └── wallet.repository.ts
│
└── packages/
    ├── types/                 # Shared: DomainError enum, ErrorMapper, gRPC constants
    ├── proto/                 # Source-of-truth .proto files
    └── prisma/                # Shared PrismaService + schema
```

### Inter-Service Communication

- **`CreateUser`** → after persisting the user, User Service calls `WalletService.CreateWallet` via gRPC. Wallet creation is fire-and-forget (user is still created even if wallet service is temporarily unavailable — see logs for errors).
- **`CreateWallet`** → Wallet Service calls `UserService.GetUserById` first to verify the user exists. Returns `NOT_FOUND` if the user does not exist.

### Error Handling

All errors are mapped through `ErrorMapper` from `@repo/types`:

| Domain Error            | gRPC Status         | Code |
| ----------------------- | ------------------- | ---- |
| `USER_NOT_FOUND`        | NOT_FOUND           | 5    |
| `USER_ALREADY_EXISTS`   | ALREADY_EXISTS      | 6    |
| `WALLET_NOT_FOUND`      | NOT_FOUND           | 5    |
| `WALLET_ALREADY_EXISTS` | ALREADY_EXISTS      | 6    |
| `INSUFFICIENT_BALANCE`  | FAILED_PRECONDITION | 9    |
| `INVALID_AMOUNT`        | INVALID_ARGUMENT    | 3    |

### Wallet Balance

`balance` is stored as `Decimal(12,2)` in PostgreSQL to avoid floating-point precision errors. The `DebitWallet` operation runs inside a Prisma `$transaction` to guarantee atomicity.

---

## API Reference

Both services expose pure gRPC endpoints (no HTTP). Use [`grpcurl`](https://github.com/fullstorydev/grpcurl) or Postman (v10+ with gRPC support) to call them.

### User Service — `localhost:50051`

#### `CreateUser`

```bash
grpcurl -plaintext \
  -d '{"email":"alice@example.com","name":"Alice"}' \
  localhost:50051 user.UserService/CreateUser
```

#### `GetUserById`

```bash
grpcurl -plaintext \
  -d '{"id":"<uuid>"}' \
  localhost:50051 user.UserService/GetUserById
```

### Wallet Service — `localhost:50052`

#### `GetWallet`

```bash
grpcurl -plaintext \
  -d '{"userId":"<uuid>"}' \
  localhost:50052 wallet.WalletService/GetWallet
```

#### `CreditWallet`

```bash
grpcurl -plaintext \
  -d '{"userId":"<uuid>","amount":100.00}' \
  localhost:50052 wallet.WalletService/CreditWallet
```

#### `DebitWallet`

```bash
grpcurl -plaintext \
  -d '{"userId":"<uuid>","amount":50.00}' \
  localhost:50052 wallet.WalletService/DebitWallet
```

### Docs

API examples live in `docs/api-examples/`:

| File | Purpose |
| ---- | ------- |
| `docs/api-examples/curl-examples.sh` | Shell script covering all happy paths and error cases |
| `docs/api-examples/collection.json` | Postman collection (File → Import) |

For the full test suite covering all happy paths and error cases, run:

```bash
bash docs/api-examples/curl-examples.sh
```

Or import `docs/api-examples/collection.json` into Postman (File → Import).

---

## Building for Production

```bash
# Build all packages and apps
pnpm turbo run build
```

TypeScript output is emitted to each app's `dist/` directory.

---

## Known Limitations

1. **No distributed transactions** — If the Wallet Service is unavailable when a user is created, the user record is persisted but no wallet is created. The error is logged. A retry mechanism or event-driven approach (e.g. an outbox pattern) would be needed for production.
2. **Plain-text gRPC** — Services use `-plaintext` (no TLS). Add TLS certificates before deploying to production.
3. **Single database** — Both services share one PostgreSQL instance. For full service isolation, each service would own its own database.
