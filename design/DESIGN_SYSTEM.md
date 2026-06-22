# Okes — Design System Tokens
Source of truth for translating the Pencil design (`nova.pen`) into the Expo app.
Lives in the shared **`packages/ui`** of the monorepo (used by both `apps/budget` and `apps/projects`).
App/brand = **Okes**; AI companion character = **NOVA**.
All colors are theme-aware (dark = hero, light = "daylight" mode).

## Colors (dark / light)
| Token | Dark | Light | Use |
|---|---|---|---|
| bg-deep | #181A21 | #ECE6DC | base background |
| bg-grad-top | #272B37 | #F5F1E9 | screen gradient top |
| bg-grad-bottom | #111319 | #E0DACE | screen gradient bottom |
| surface-glass | #c4ccdb14 | #ffffff8c | glass card fill |
| surface-glass-strong | #cad2e224 | #ffffffc4 | raised glass / tab bar |
| surface-raised | #21252F | #FBF8F2 | solid raised surface |
| hairline | #c2cce524 | #3a352c24 | 1px card borders |
| hairline-bright | #58bab84d | #2c9b984d | accent borders/glow edge |
| track-bg | #ffffff1a | #1c1a1417 | progress track |
| text-primary | #e7eaf0 | #20222a | headings/values |
| text-secondary | #9da4b3 | #5b6070 | body |
| text-muted | #6a7080 | #8c909c | captions |
| on-accent | #121319 | #1b1812 | text/icon on solid accent |

## Accents (Afro-futurist, desaturated)
| Token | Dark | Light | Meaning |
|---|---|---|---|
| accent-cyan (teal) | #58bab8 | #268b89 | primary / actions |
| accent-violet | #9788c9 | #6a57ac | secondary / XP |
| accent-mint (green) | #6cba92 | #388f66 | success / income / goals |
| accent-amber (gold) | #d6ae66 | #b3823a | warnings / streaks / leagues |
| accent-pink (clay) | #d4836e | #bb5d48 | danger / overspend / guardian |

Each accent has a low-opacity `tint-*` (card fills) and the violet/teal have `glow-*` (shadows).

## Type
- Display/headings: **Space Grotesk** (600/700)
- Body/UI: **Inter** (400/500/600/700)
- Title size app-wide: 24 display 600. Section headers: 17 display 600.

## Shape & effects
- radius-card: 24, radius-pill: 100, screen padding: 20
- Glass card recipe: `surface-glass` fill + `hairline` 1px stroke + `background_blur` ~16 + soft outer shadow (`glow-teal` for hero/AI emphasis, #00000066 neutral elsewhere)
- Screen bg: vertical linear gradient (bg-grad-top → bg-deep → bg-grad-bottom) + 1–2 radial aurora glows (glow-violet / glow-teal)
- Afro-futurist motif: concentric Adinkra-style diamond outlines (`accent-amber`, ~0.2–0.4 opacity) + kente triangle accents

## Components / patterns established
- **Status bar** (62px), **liquid-glass capsule tab bar** (Home·Wallets·Coach·Crew·Profile)
- Glass cards, stat cards, list rows (icon circle + label/sub + trailing value)
- Progress: linear track+fill, radial proximity ring (ellipse innerRadius + sweepAngle)
- Pills/chips, role badges, AI chat bubbles, companion orb (concentric rings + smart_toy)
- "Auto" tag for auto-captured transactions

## Screens designed (in nova.pen) — these ARE the Okes (budget) app — COMPLETE ✅
Onboarding 1–4 (welcome → link wallets → meet/customize NOVA → first goal),
Command Center (dark + light), AI Coach (NOVA), Transactions, Goals, Wallets, Crew,
Caps Detail (with proximity-alert thresholds + crew notify), Profile/Rank.

## Sibling app (Projects/Learning, name TBD) — designed later, reuses these tokens
Missions/Projects, Growth/Learning.
