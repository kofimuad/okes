# Deploying Okes

Config is already in place:
- API container: `apps/api/Dockerfile` (+ `apps/api/railway.json`)
- App builds: `apps/budget/eas.json`, with `app.json` set to **Okes** / `com.okes.app`

The steps below need your Railway + Expo accounts.

---

## 1. Backend → Railway

1. Put the repo on GitHub (from the monorepo root `okes/`):
   ```bash
   cd ~/Documents/okes
   git init && git add -A && git commit -m "Okes"
   gh repo create okes --private --source=. --push   # or push to a repo you made
   ```
2. In Railway: **New Project → Deploy from GitHub repo** → pick `okes`.
3. Add **Postgres**: New → Database → PostgreSQL. Open it → copy the connection URL.
4. On the **API service → Variables**, set:
   - `JWT_SECRET` → a strong value (`openssl rand -hex 32`)
   - `DATABASE_URL` → reference the Railway Postgres URL
   - (Railway injects `PORT` automatically — the API already reads it.)
   The service builds from `apps/api/Dockerfile` (set in `railway.json`); build context = repo root.
5. Run migrations against the Railway DB once (from your machine):
   ```bash
   DATABASE_URL="<railway-postgres-url>" pnpm db:migrate
   DATABASE_URL="<railway-postgres-url>" pnpm db:seed     # optional demo data
   ```
6. Copy the public API URL (e.g. `https://okes-api.up.railway.app`) and verify `…/health` returns `{"ok":true}`.

---

## 2. App → EAS build (installable on a real phone)

A dev build is required for native features (SMS auto-capture comes next) — Expo Go can't do those.

```bash
npm i -g eas-cli           # once
eas login
cd ~/Documents/okes/apps/budget
eas init                   # creates the EAS project, writes projectId into app.json
```

Put the Railway URL into `eas.json` (replace `REPLACE-WITH-RAILWAY-URL` in the `preview` + `production` profiles).

**Development build** (debuggable, connects to your Metro / chosen API):
```bash
eas build --profile development --platform android
```
Install the APK, then `pnpm start` to run JS from Metro. Point at an API with
`EXPO_PUBLIC_API_URL="https://…railway.app" pnpm start`.

**Internal test build** (standalone APK, bundles the Railway URL from eas.json):
```bash
eas build --profile preview --platform android
```

iOS needs an Apple Developer account: `eas build --profile development --platform ios`.

---

## Notes
- The API runs via `tsx` in the container (fine for now; can compile later).
- `pnpm-workspace.yaml` `allowBuilds` lets argon2/esbuild compile during the Docker install.
- Don't commit real secrets — `apps/api/.env` is gitignored; set prod values in Railway.
