# Changelog

## 0.4.0 - 2026-11-03
- Today home page: overdue, focus, due today and unsorted tasks from every board, with a progress bar for the day.
- Quick capture: "gym tomorrow 7am #health !" sets the due date and time, the board and focus. Keeps up with fast typing.
- Tick to complete: the task fades into a collapsed done group. Overdue tasks get "move to today".
- Star any task into focus.
- New layout: sidebar on desktop, tab bar on phone. Boards show lists as rows of tasks, added inline (no pop-ups).
- Database migration 0002 (done, due time, priority, unsorted tasks). End-to-end test in tests/e2e.

## 0.3.1 - 2026-11-03
- daylight is the only theme: removed the theme switch.
- Sign-in tagline replaced by a time-aware greeting and today's date.

## 0.3.0 - 2026-11-03
- New default theme "daylight" (warm white). hearth (dark) stays as a switch in the header; choice is remembered.
- Redesigned sign-in: glowing lantern panel, tagline, show/hide password, loading and error states, mobile layout.
- Lowercase UI text throughout.

## 0.2.0 - 2026-11-03
- Brand applied: hearth theme tokens, Sora and Source Sans 3 (bundled), lockup, icons and favicon (C2PA metadata stripped from the SVGs).
- Installable PWA: manifest, service worker, offline shell, iPhone home-screen icon.
- Brand guide saved in docs/BRAND.md.

## 0.1.2 - 2026-11-03
- Name written as lowercase "lantern" everywhere.

## 0.1.1 - 2026-11-03
- Repo made public; GitHub Pages deploy workflow and /lantern/ base path added.

## 0.1.0 - 2026-11-03
- First release: private repo, Vite React TypeScript app, email/password login, boards, lists and cards (add only), core Supabase schema (migration 0001) with owner-only RLS, dark amber theme.
