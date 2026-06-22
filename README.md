# Okes — monorepo

Sci-fi / Afro-futurist, gamified personal-finance app for Ghana & Africa.
Built with Expo (React Native) + TypeScript in a pnpm + Turborepo monorepo,
backed by a custom Node/TS API over self-hosted Postgres (deployed on Railway).

> Brand = **Okes**. AI companion character = **NOVA**.
> Full product brief: `./design/PRODUCT_SPEC.md` · design tokens: `./design/DESIGN_SYSTEM.md` · UI designs: `./design/nova.pen`.

## Structure

```
okes/
  design/                 — product spec, design tokens doc, Pencil UI source (nova.pen)
  packages/
    ui/      @okes/ui   — design tokens (colors, spacing, radius, fonts), theme-aware
    core/    @okes/core — domain model (Money, Wallet, Transaction, Goal, Cap, Crew, gamification)
    db/      @okes/db   — Postgres schema + migrations (planned)
  apps/
    budget/  @okes/budget — the Okes finance app (flagship). Expo Router.
    api/     @okes/api    — backend API (Node/TS) → Postgres (planned)
    # projects/ — sibling Projects/Learning app (added later)
```

The `ui` / `core` packages are pure TypeScript so they can be reused by every app.

## Backend (no Supabase)

Stack: **Fastify + Drizzle ORM + own JWT auth (argon2)** over **Postgres**.

```bash
pnpm docker:up                 # start Postgres (host port 55432) + Adminer (http://localhost:8081)
cp apps/api/.env.example apps/api/.env   # then set a JWT_SECRET
pnpm db:generate               # generate SQL migration from packages/db/src/schema.ts
pnpm db:migrate                # apply migrations to the DB
pnpm api:dev                   # run the API at http://localhost:8080 (watch mode)
pnpm docker:down               # stop containers
```

- **Why port 55432?** Host 5432/5433 were already taken by native Postgres; the container publishes on **55432**.
- **API routes:**
  - Auth/profile: `POST /auth/register|login|refresh`, `GET /auth/me`, `GET|PATCH /profile`, `GET /health`
  - Money: `GET|POST /wallets`, `GET|PATCH|DELETE /wallets/:id`; `GET|POST /categories` (+`:id`);
    `GET|POST /transactions` (filters: walletId/direction/needsReview), `GET /transactions/review`, `PATCH|DELETE /transactions/:id`;
    `GET|POST /caps` (+`:id`, live `spentMinor`/`status`); `GET|POST /goals` (+`:id`), `POST /goals/:id/contribute`;
    `GET|POST /income-streams` (+`:id`)
  - Social: `GET|POST /crew` (+`:id`); `GET|POST /approvals`, `PATCH /approvals/:id`
  - Dashboard: `GET /summary`
  - All non-auth routes require `Authorization: Bearer <accessToken>` and are scoped to the user.
- **Deploy:** Railway via `apps/api/Dockerfile` (build context = repo root, uses `turbo prune`) + `apps/api/railway.json`; provision a Railway Postgres and set `DATABASE_URL` + `JWT_SECRET`.

## Prerequisites

- Node 20+ and pnpm (`npm i -g pnpm`)
- **Docker Desktop** (for the local Postgres container)
- For devices: the **Expo Go** app, or an Android emulator / iOS simulator

## Setup

```bash
pnpm install
```

## Run the budget app

```bash
pnpm start                 # from repo root → starts Metro for @okes/budget
# then press: a (Android), i (iOS, macOS only), w (web)
# or scan the QR code with Expo Go

# direct:
pnpm --filter @okes/budget android
pnpm --filter @okes/budget ios
pnpm --filter @okes/budget web
```

## Checks

```bash
pnpm typecheck             # turbo runs tsc across all packages
```

## Status

- ✅ Monorepo + shared `@okes/ui` / `@okes/core`
- ✅ `apps/budget` builds, typechecks, and renders the themed **Command Center** (home)
- ✅ Backend: `apps/api` (Fastify) + `packages/db` (Drizzle) — full route set verified end-to-end
- ✅ App ↔ API: typed client in `@okes/core`, token auth (secure-store) + route guard +
  login/register, **expo-router tabs**, and all main screens render **live data** via React Query.
- ✅ Write actions: add wallet, add transaction, create goal + contribute, invite crew,
  approve/decline guardian requests, confirm review items — all verified end-to-end.
- ✅ Fonts: **Space Grotesk** display (system font for body, preserves weight hierarchy).
- ⏳ Next: `expo-blur`/`expo-glass-effect` for true frosted glass, NOVA coach (Claude API),
  push notifications, Railway deploy. (Optional: full Inter body via per-weight families.)

## Run the full stack (dev)

```bash
pnpm docker:up                 # Postgres on :55432
pnpm db:migrate                # apply migrations
pnpm db:seed                   # demo account with full sample data
pnpm api:dev                   # API on :8080
pnpm start                     # Expo app (press w / a / i)
```

**Demo login:** `demo@okes.app` / `okes1234` — pre-seeded to mirror the designs
(GHS 12,480.50 across 4 wallets, caps, goals, crew, a pending guardian approval).

In **Git Bash**, set the API URL for a physical device like this (not `$env:`):
```bash
EXPO_PUBLIC_API_URL="http://<your-LAN-ip>:8080" pnpm start
```

## Notes / follow-ups baked into the code

- Fonts are System for now (`packages/ui/src/tokens.ts` → `fonts`); swap to Space Grotesk / Inter via `expo-font`.
- Glass is a translucent fill + hairline; upgrade `GlassCard` to `expo-blur` / `expo-glass-effect`.
- Screens use sample data; replace with calls to the Okes API (`@okes/core` has the types).
- `.npmrc` sets `node-linker=hoisted` — required for React Native / Metro under pnpm.
