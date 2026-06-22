# Okes — Money Command Center
### Master Product Spec & Build Brief

> **Okes** is a sci-fi / Afro-futurist, gamified personal-finance app for Ghana & Africa.
> You are the **captain of your ship**: track money with a trusted crew (friends) and an AI co-pilot named **NOVA**.
>
> **Product architecture (decided):** Okes and a sibling **Projects/Learning** app (name TBD) live in **one monorepo**
> and share a design system, account/auth, backend, crew, and gamification. **Okes (budget) ships first.**
> The project/tutorial/learning pillars below move to the sibling app but reuse the same shared packages.
>
> ```
> monorepo/
>   packages/ui     <- shared design tokens + components (see DESIGN_SYSTEM.md)
>   packages/core   <- auth, API client, crew, gamification, shared types
>   packages/db     <- Postgres schema + migrations (shared by api)
>   apps/budget     <- Okes (flagship, ship first)
>   apps/api        <- backend API (Node/TS) → Postgres
>   apps/projects   <- Projects + Learning tracker (name TBD)
> ```
>
> Naming: **Okes** = the app/brand. **NOVA** = the in-app AI companion character.

---

## 0. One-line pitch
**"Your money, in orbit."** Okes auto-tracks your mobile money & bank transactions, coaches you
toward savings goals with its AI companion NOVA, and turns budgeting into a fun, gamified mission
you can run solo or with trusted friends.

---

## 1. Locked decisions (from brainstorm)
| Area | Decision |
|---|---|
| Stack | **React Native + Expo** (expo-router, NativeWind/Tailwind), TypeScript |
| Architecture | **Monorepo** (pnpm + Turborepo); shared `packages/ui` + `packages/core`; `apps/budget` (Okes, ships first) + `apps/projects` (sibling, later) |
| Naming | App/brand = **Okes**; AI companion character = **NOVA** |
| Backend | **Self-hosted Postgres** (own Docker container locally) + custom **Node/TS API**; **deployed on Railway** (API service + Railway Postgres). No Supabase. Own JWT auth. |
| AI | **Claude API** (claude-opus-4-8 for deep coaching, claude-haiku-4-5 for quick parses/nudges) |
| Auto-capture | **Hybrid**: Android SMS parsing (primary) + fintech aggregator (Mono) + manual fallback |
| Platforms | **iOS + Android both** (note: auto SMS = Android only; iOS uses aggregator/manual) |
| First build | **Money core first** (accounts, income, transactions, caps, savings + AI coach) |
| Visual theme | **Holographic glassmorphism** — space-navy base, frosted glass, cyan/violet glow, data-viz |
| Friends | **Tiered per-friend roles**: Watcher / Accountability / Guardian |
| Coaching | **AI coach + rules engine**, grounded in real user data |
| Gamification | **All**: XP/levels/ranks + AI companion + streaks/missions + friend leagues/co-op |
| Region | **Ghana / Africa first** — GHS default, MoMo-native, multi-currency aware |

---

## 2. Core feature pillars

### Pillar A — Money (MVP focus)
- **Multiple income streams**: salary, freelance, business, side hustles; recurring + one-off.
- **Linked wallets**: MTN MoMo, Telecel Cash, AirtelTigo Money, bank accounts. One unified balance + per-wallet view.
- **Auto transaction capture**
  - *Android*: read & parse provider SMS (transaction alerts) into structured transactions.
  - *iOS / banks*: aggregator API (Mono) where supported; manual + receipt-photo scan otherwise.
  - Smart categorization (rules + AI), merchant detection, duplicate/transfer dedupe.
- **Spending caps**: per-category, per-wallet, and total. Proximity alerts (e.g. 70% / 90% / 100%).
- **Savings goals**: "GHS 5,000 for a laptop by December." Track progress, auto-suggest weekly set-aside, round-ups, lock/vault option.
- **AI money coach** (Claude): conversational, grounded in real data. "How do I afford X?", "Where is my money leaking?", scenario planning, payday plans. Plus rule-based nudges.
- **Analytics & deep thinking**: cashflow, category trends, income vs spend, forecast/runway, "what-if" projections, anomaly detection.

> ⤵ **Pillars B & C below now belong to the sibling Projects/Learning app** (shared monorepo, account & design system), not to Okes (budget). Kept here for reference and because crew + gamification are shared.

### Pillar B — Missions (Projects)
- Track **projects / things you're working on**, with milestones & progress %.
- Attach **resources**: YouTube tutorials, articles, courses — track watch/read progress.
- **Reminders** per project/resource; streaks for consistency.
- Optional link of a project to a **savings goal** (e.g. project needs equipment).

### Pillar C — Growth (Learning)
- **Language learning** (and any skill) tracker with daily reminders + streaks.
- Spaced reminders, weekly goals, progress XP.

### Pillar D — Crew (Social)
- Add **trusted friends**; assign per-friend role:
  - **Watcher** — sees your budget/goals, gets alerts, can encourage.
  - **Accountability** — must acknowledge your overspends; you get extra friction.
  - **Guardian** — approval required for spends/withdrawals above a set cap.
- **Co-op**: shared projects, **shared savings goals** (pool toward a common item), mutual budget visibility (opt-in).
- **Friend leagues**: savings leaderboards, co-op missions.

### Pillar E — Gamification (everywhere)
- **XP, levels, sci-fi ranks**: Cadet → Ensign → Lieutenant → Commander → Captain → Admiral.
- **AI companion / droid**: a sci-fi sidekick ("NOVA") with personality — celebrates wins, warns on overspend, delivers coaching with charm.
- **Streaks & missions**: daily/weekly missions (no-spend day, log all income, study 10 min), streak counters, rewards.
- **Friend leagues & co-op**: leaderboards, shared challenges, badges/achievements.

---

## 3. Suggested extra features (Claude's additions)
- **Payday autopilot**: on income detected, auto-split into goals/bills/spend (50/30/20-style, configurable).
- **Bill & subscription radar**: detect recurring debits, warn before due, flag price hikes / unused subs.
- **Susu / Ajo digital**: traditional African rotating savings groups, digitized & tracked with crew.
- **Runway meter**: "At current burn, your money lasts N days" — front and center.
- **Offline-first**: queue actions offline (data is patchy); sync on reconnect.
- **Privacy vault**: SMS parsing happens on-device; only structured (non-PII) data syncs — important for trust.
- **FX awareness**: handle USD/EUR inflows (remittances, freelance) with live-ish rates.
- **Receipt OCR**: snap a receipt, auto-create itemized transaction.
- **Voice/NL logging**: "I spent 50 cedis on fuel" → transaction.
- **Inflation-aware goals**: adjust target amounts for Ghana inflation over long horizons.
- **Emergency fund coach** and **debt payoff planner** (snowball/avalanche).
- **Widgets & quick-add**: home-screen widget for balance + quick log.

---

## 4. Information architecture (screens)
1. **Onboarding / Auth** — sign up, link wallets, set first goal, pick companion.
2. **Command Center (Home/Dashboard)** — total balance, runway meter, today's missions, alerts, companion greeting, quick add.
3. **Wallets** — list of linked wallets + balances; wallet detail w/ transactions.
4. **Transactions** — unified feed, filters, search, edit/categorize, "needs review" inbox.
5. **Caps & Budgets** — set/track caps, proximity rings, alerts config.
6. **Goals (Savings)** — goal cards, progress, contribution plan, AI plan, vault.
7. **AI Coach** — chat with NOVA, grounded insights, scenario tools.
8. **Analytics** — cashflow, trends, forecasts, anomalies.
9. **Missions (Projects)** — project list/detail, resources, milestones, reminders.
10. **Growth (Learning)** — skills/languages, streaks, reminders.
11. **Crew (Friends)** — friend list, roles, requests, shared goals, approvals inbox.
12. **Leagues** — leaderboards, co-op missions, badges.
13. **Profile / Rank** — level, XP, ranks, achievements, companion customization.
14. **Settings** — wallets, notifications, privacy, currency, security (PIN/biometrics).

---

## 5. Visual design system (Holographic glassmorphism)
- **Base**: deep space-navy / near-black (#0A0E1A → #0E1430 gradient).
- **Surfaces**: frosted glass cards (blur + 8–14% white, thin 1px hairline border, soft inner glow).
- **Accents**: electric cyan (#3BE8FF), violet (#8B5CFF), with success-mint & warning-amber.
- **Afro-futurist touch**: subtle geometric/kente-inspired motifs as background texture (low opacity).
- **Typography**: a geometric/techy display for headings (e.g. Space Grotesk / Orbitron-lite), clean sans for body (Inter).
- **Data-viz first**: glowing rings, sparklines, radial gauges, starfield/grid backdrops.
- **Motion**: smooth springy transitions, glow pulses on alerts, companion micro-animations, haptics.
- **Both light & dark**: dark is hero; provide a bright "daylight nebula" light mode too.

---

## 6. Data model (high level)
`users`, `companions`, `wallets`, `accounts_links` (provider creds/tokens),
`transactions` (raw + normalized + category + confidence + source),
`categories`, `income_streams`, `caps`, `goals`, `goal_contributions`,
`projects`, `project_resources`, `milestones`, `reminders`,
`skills`/`learning_sessions`,
`friends` (+ role enum), `shared_goals`, `approvals`,
`xp_events`, `achievements`, `leagues`, `league_members`,
`notifications`.

---

## 7. Phased roadmap
- **Phase 0 — UI**: design all key screens in Pencil (this step), establish design system.
- **Phase 1 — Money core**: auth, wallets (manual + SMS parse on Android), transactions, caps, goals, basic analytics, companion + XP shell.
- **Phase 2 — AI coach**: Claude-grounded coaching + rules nudges, scenario planning.
- **Phase 3 — Missions & Growth**: projects, resources, reminders, learning streaks.
- **Phase 4 — Crew & Leagues**: friends, roles, shared goals, approvals, leaderboards.
- **Phase 5 — Aggregator + polish**: Mono integration, receipt OCR, widgets, offline sync, store launch.

---

## 8. Key risks / notes
- **iOS cannot read SMS** → auto-capture on iOS depends on Mono coverage or stays manual. Design manual entry to feel first-class.
- **Aggregator coverage/cost** in Ghana varies — validate Mono bank/MoMo support early.
- **Trust & privacy** are make-or-break for a finance app: on-device SMS parsing, encryption, clear consent, biometric lock.
- **Guardian approvals** must never lock a user out of their own money in an emergency — include override + audit trail.

---

*Generated as the brainstorm source-of-truth. Update freely as decisions evolve.*
