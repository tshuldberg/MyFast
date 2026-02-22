# MyFast — CLAUDE.md

## Overview

MyFast is a privacy-first intermittent fasting timer app. $4.99 one-time purchase, no accounts, no analytics, no network permissions. Start/stop a fasting timer, preset protocols (16:8, 18:6, 20:4, OMAD, 36h, 48h), fasting history log, streak tracking, daily/weekly stats, optional weight log, and a home screen widget. All data stored locally in SQLite.

## Stack

- **Mobile:** Expo (React Native) with Expo Router — iOS + Android
- **Web:** Next.js 15
- **Shared logic:** TypeScript monorepo package (`packages/shared`)
- **UI components:** Shared component library (`packages/ui`)
- **Database:** SQLite via `expo-sqlite` (mobile) / `better-sqlite3` (web)
- **Notifications:** `expo-notifications` (local only)
- **Monorepo:** Turborepo + pnpm
- **Language:** TypeScript everywhere
- **Testing:** Vitest
- **License:** FSL-1.1-Apache-2.0

## Key Commands

```bash
pnpm install             # Install all dependencies
pnpm build               # Build all packages and apps
pnpm dev                 # Dev mode for all apps
pnpm dev:mobile          # Expo dev server only
pnpm dev:web             # Next.js dev server only
pnpm typecheck           # TypeScript type checking
pnpm lint                # ESLint across all packages
pnpm test                # Run all tests (Vitest)
```

## Architecture

```
MyFast/
├── apps/
│   ├── mobile/          # Expo (React Native) — iOS + Android
│   │   ├── app/         # Expo Router file-based routing
│   │   │   ├── (tabs)/  # Bottom tab navigation (Timer, History, Stats, Settings)
│   │   │   └── _layout.tsx
│   │   ├── components/  # Screen-specific components
│   │   └── widgets/     # Native widgets (iOS SwiftUI, Android Glance)
│   └── web/             # Next.js 15
│       └── app/         # App Router pages
├── packages/
│   ├── shared/          # Types, DB, timer state machine, protocols, stats, export
│   │   └── src/
│   │       ├── types/   # TypeScript interfaces
│   │       ├── db/      # SQLite schema, migrations, queries
│   │       ├── timer/   # Timer state machine (computed from startedAt, NOT foreground counter)
│   │       ├── protocols/ # Preset protocol definitions
│   │       ├── stats/   # Streak, averages, adherence
│   │       └── export/  # CSV export
│   └── ui/              # Shared component library
│       └── src/
│           ├── theme/   # Design tokens (dark theme)
│           ├── timer/   # Timer ring component
│           ├── charts/  # Stats charts
│           └── cards/   # Stat cards, fast cards
├── turbo.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### Key Technical Decisions

- **Timer is timestamp-based:** Computed from `startedAt`, NOT a foreground counter. App can be killed and timer stays accurate.
- **Zero network permissions:** No analytics, no crash reporting, no push server. Local notifications only.
- **Widget reads shared state:** iOS App Group UserDefaults / Android SharedPreferences — written by React Native app.
- **SQLite-only storage:** All data local. No accounts, no cloud sync.

## Git Workflow

- **Branch naming:** Conventional — `feature/`, `fix/`, `refactor/`, `docs/`
- **Commit format:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`)
- **Main branch:** `main`
- **Squash merge** to main

## Testing

- **Framework:** Vitest
- **Unit tests:** Timer state machine, streak computation, stats aggregation, fast CRUD
- **Integration tests:** Full fast lifecycle (start → timer → target → end → history → streak)
- **Test file convention:** `*.test.ts` / `*.test.tsx` colocated with source or in `__tests__/`

## Code Style

- **Formatter:** Prettier (2-space indent, single quotes, trailing commas)
- **Linter:** ESLint with TypeScript plugin
- **Font:** Inter everywhere. Timer display: 56px bold.
- **Colors:** Dark theme — teal (#14B8A6) fasting, coral (#E8725C) eating, green (#22C55E) target reached

## Parallel Agent Work — File Ownership Zones

| Zone | Owner | Files |
|------|-------|-------|
| Shared logic | core-dev | `packages/shared/**` |
| UI + Apps | ui-dev | `packages/ui/**`, `apps/mobile/**`, `apps/web/**` |
| Tests | tester | `**/*.test.ts`, `**/*.test.tsx`, `**/*.spec.ts` |
| Configs & docs | lead | `CLAUDE.md`, `timeline.md`, `turbo.json`, root configs |

## Important Notes

- All 6 preset protocols are defined as seed data — see `packages/shared/src/protocols/presets.ts`
- The `active_fast` table is a singleton (at most one active fast at a time)
- Streak = consecutive days where at least one fast hit its target duration
- CSV export includes both fasts and weight entries
- Design doc: `/Users/trey/Desktop/Apps/docs/plans/2026-02-22-myfast-design.md`
