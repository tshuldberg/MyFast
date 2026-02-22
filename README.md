# MyFast

**A timer shouldn't cost $70/yr.**

MyFast is a minimalist intermittent fasting timer for iOS, Android, and web. $4.99 once. No accounts. No subscriptions. No pseudo-science. Just a timer and your stats.

## Features

- **Fast timer** — Start/stop with a single tap. Background-persistent (computed from timestamp, not a foreground counter).
- **Preset protocols** — 16:8, 18:6, 20:4, OMAD, 36h, 48h, or custom.
- **Fasting history** — Chronological log of all fasts with duration, protocol, and target status.
- **Streak tracking** — Current streak, longest streak, total fasts.
- **Stats** — Average duration, adherence rate, weekly/monthly charts.
- **Home screen widget** — Glance at your fast status without opening the app.
- **Optional weight log** — Track weight alongside fasts. Off by default.
- **CSV export** — Your data, portable.
- **Zero network permissions** — No analytics, no accounts, no cloud. Everything stays on your device.

## Setup

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Install

```bash
git clone https://github.com/tshuldberg/MyFast.git
cd MyFast
pnpm install
```

### Development

```bash
# All apps
pnpm dev

# Mobile only (Expo)
pnpm dev:mobile

# Web only (Next.js)
pnpm dev:web
```

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

### Lint & Type Check

```bash
pnpm lint
pnpm typecheck
```

## Project Structure

```
MyFast/
├── apps/
│   ├── mobile/        # Expo (React Native) — iOS + Android
│   └── web/           # Next.js 15 — Web
├── packages/
│   ├── shared/        # Types, DB, timer logic, protocols, stats, export
│   └── ui/            # Design tokens, timer ring, charts, cards
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Tech Stack

- **Mobile:** Expo (React Native) with Expo Router
- **Web:** Next.js 15
- **Database:** SQLite (local only)
- **Monorepo:** Turborepo + pnpm
- **Language:** TypeScript

## Privacy

MyFast requests zero network permissions. There is no server. There is no account system. There is no analytics SDK. All data is stored locally in SQLite on your device. The app cannot phone home because it has no network access.

## License

FSL-1.1-Apache-2.0
