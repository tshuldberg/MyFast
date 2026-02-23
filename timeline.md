# MyFast — Timeline

## 2026-02-22 — Project Initialization

### What
- Scaffolded Turborepo monorepo with pnpm
- Created `apps/mobile/` (Expo with Expo Router, 4 tab screens)
- Created `apps/web/` (Next.js 15 with App Router, 4 pages)
- Created `packages/shared/` (types, timer state machine, protocol presets)
- Created `packages/ui/` (design tokens from design doc)
- Wrote CLAUDE.md (Tier 2), README.md, timeline.md
- Configured TypeScript, ESLint, Prettier, .gitignore
- Initial commit and push to origin/main

### Files Created
- Root: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc`, `.gitignore`
- `packages/shared/`: types, timer state machine (`computeTimerState`, `formatDuration`), protocol presets (6 protocols)
- `packages/ui/`: design tokens (colors, spacing, typography, border radius)
- `apps/mobile/`: Expo app with 4 tab screens (Timer, History, Stats, Settings)
- `apps/web/`: Next.js app with 4 pages
- Docs: `CLAUDE.md`, `README.md`, `timeline.md`

## 2026-02-22 — Agent Team Build (core logic + UI + tests)

### What
Spawned 3-agent team (core-dev, ui-dev, tester) to build the full MVP in parallel. All 18 tasks completed.

### core-dev (packages/shared)
- SQLite schema: 7 tables (fasts, weight_entries, protocols, streak_cache, active_fast, settings, schema_version) + indexes + migration system
- Protocol seeding: 6 presets (16:8, 18:6, 20:4, OMAD, 36h, 48h)
- Fast CRUD: startFast, endFast, getActiveFast, listFasts, deleteFast (active_fast singleton enforced)
- Streak computation: consecutive target-hit days, longest streak, total fasts, cache refresh
- Stats aggregation: averageDuration, adherenceRate, weeklyRollup, monthlyRollup, durationTrend (7-day MA)
- CSV export: fasts + weight entries with proper escaping

### ui-dev (packages/ui + apps)
- ThemeProvider: dark/light context with useTheme() hook, fully typed Theme interface
- Timer ring: animated circular progress (react-native-svg + reanimated on mobile, CSS/SVG on web)
- Timer screen: idle/fasting/target-reached states, real-time 1s tick, single-tap start/stop
- History screen: SectionList with monthly grouping, FastCard, swipe-to-delete, empty state
- Stats screen: 4 stat cards, WeeklyChart (SVG bars), empty state
- Settings screen: protocol selector, notification toggles, weight toggle, unit picker, export, erase data, about
- Onboarding: 4-step flow (welcome, protocol picker, widget instructions, done)
- Notifications: expo-notifications scheduling/cancellation for fast complete + eating window closing

### tester (111 tests)
- Timer state machine: 30 tests (idle, fasting, target reached, DST, midnight crossing, 48h+)
- Fast CRUD: 35 tests (start, end, delete, list, pagination, singleton constraint)
- Streak computation: 14 tests (consecutive days, breaks, timezone, midnight-spanning)
- Stats aggregation: 29 tests (averages, adherence, weekly/monthly rollups, moving average)
- Integration: 3 tests (full lifecycle, multi-day streak, failed fast impact)

### Build Status
- `pnpm build`: all 4 packages pass
- `pnpm test`: 111 tests passing (373ms)
- Pushed to origin/main

## 2026-02-22 — Phase 2: SQLite Wiring, Accessibility, Metadata

### What
Wired all UI screens to real SQLite storage, added accessibility support, and created app store metadata. App now persists fasts across app kills.

### wiring-dev (database integration)
- expo-sqlite adapter implementing Database interface (runSync/getFirstSync/getAllSync/withTransactionSync → run/get/all/transaction)
- DatabaseProvider context + useDatabase() hook, wired into root layout
- Timer screen: restores active fast from DB on mount, startFast/endFast via DB, refreshes streak cache, shows real streak count
- History screen: listFasts with pagination (30 per page), pull-to-refresh, long-press delete with confirmation dialog
- Stats screen: real data from getStreaks, averageDuration, weeklyRollup
- Settings screen: loads/persists all settings to DB, CSV export via Share.share(), erase-all-data with re-seed
- Onboarding: saves protocol selection + completion flag to settings table, root layout NavigationGuard redirects based on status

### polish-dev (accessibility + metadata)
- Full VoiceOver/TalkBack support: progressbar role on timer ring, timer role on display, state change announcements, summary roles on stat cards and charts, radio roles on selectors
- LICENSE: FSL-1.1-Apache-2.0
- PRIVACY.md: zero-data collection privacy policy
- APPSTORE.md: full App Store listing with description, keywords, screenshot guide

### Build Status
- `pnpm build`: all 4 packages pass
- `pnpm test`: 111 tests passing (306ms)
- Pushed to origin/main

## 2026-02-22 — Phase 3: iOS Widget, Theme Toggle, Charts, Web SQLite

### What
Spawned 2-agent team (widget-dev, finisher) to build the iOS widget extension, add light theme support, new chart components, and wire the web app to persistent SQLite via sql.js. All 5 tasks completed.

### widget-dev (iOS widget)
- SwiftUI WidgetKit extension: 5 files in `widgets/ios/` (FastState model, Widget bundle, Widget definition with TimelineProvider, EntryView with ring + elapsed + protocol + streak, App Group entitlements)
- Small widget: circular ring + elapsed time + protocol + progress percentage
- Medium widget: ring + elapsed + target + end time + streak count
- Auto-updating elapsed time via `Text(startDate, style: .timer)`
- Expo config plugin (`plugins/widget-plugin.js`): adds widget target to Xcode project, configures App Group entitlement
- Widget bridge (`lib/widget-bridge.ts`): writes fast state JSON to App Group UserDefaults, triggers WidgetKit timeline reload
- Timer screen updated to call updateWidgetState/clearWidgetState on start/end

### finisher (theme, charts, web DB)
- Light theme toggle: root layout reads 'theme' setting from DB, passes to ThemeProvider, StatusBar adapts; Settings screen has Dark/Light toggle
- Default protocol from settings: Timer screen reads 'defaultProtocol' from DB on focus instead of hardcoding
- MonthlyHeatmap component: calendar grid with day cells colored by fasting status (hit/miss/none), month navigation
- DurationTrend component: SVG line chart with 7-day moving average dashed line
- Stats screen wired with heatmap + trend chart below WeeklyChart
- Web sql.js integration: DatabaseProvider with sql.js adapter, localStorage persistence (base64-encoded), webpack Node.js polyfill fallbacks
- Web Timer page: fully wired to DB (getActiveFast, startFast, endFast, refreshStreakCache, reads default protocol from settings)
- Web History page: wired to DB (listFasts with 200 limit)
- Web Stats page: wired to DB (getStreaks, averageDuration)
- Web Settings page: wired to DB (loadSettings, persistSetting, exportFastsCSV/exportWeightCSV as download, erase-all-data with re-seed)

### Files Created
- `apps/mobile/widgets/ios/`: FastState.swift, MyFastWidgetBundle.swift, MyFastWidget.swift, MyFastWidgetEntryView.swift, MyFastWidget.entitlements
- `apps/mobile/plugins/widget-plugin.js`: Expo config plugin for WidgetKit
- `apps/mobile/lib/widget-bridge.ts`: App Group UserDefaults bridge
- `apps/mobile/components/stats/MonthlyHeatmap.tsx`: Calendar heatmap chart
- `apps/mobile/components/stats/DurationTrend.tsx`: Line chart with moving average
- `apps/web/lib/database.tsx`: sql.js adapter + DatabaseProvider + useDatabase hook
- `apps/web/app/providers.tsx`: Client-side provider wrapper

### Files Modified
- `apps/mobile/app.json`: widget plugin registration
- `apps/mobile/app/_layout.tsx`: theme setting from DB, dynamic ThemeProvider mode
- `apps/mobile/app/(tabs)/index.tsx`: widget bridge calls, protocol from settings
- `apps/mobile/app/(tabs)/settings.tsx`: dark/light theme toggle
- `apps/mobile/app/(tabs)/stats.tsx`: heatmap + trend chart integration
- `apps/web/next.config.ts`: webpack fallbacks for sql.js
- `apps/web/app/layout.tsx`: Providers wrapper
- `apps/web/app/page.tsx`: wired to sql.js DB
- `apps/web/app/history/page.tsx`: wired to sql.js DB
- `apps/web/app/stats/page.tsx`: wired to sql.js DB
- `apps/web/app/settings/page.tsx`: wired to sql.js DB with CSV export + erase
- `.gitignore`: exception for widgets/ios/ source files

### Build Status
- `pnpm build`: all 4 packages pass
- `pnpm test`: 111 tests passing
- Pushed to origin/main
