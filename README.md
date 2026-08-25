# WAHA Dashboard

Web-based management dashboard for [WAHA Core](https://github.com/oyi77/waha-core) and [WAHA Plus](https://github.com/oyi77/waha-core) — a WhatsApp HTTP API.

## Features

- **Sessions** — Start, stop, restart, and manage WhatsApp sessions with bulk operations
- **Realtime status** — WebSocket (`/ws`) session-status stream overlays live state; polling backs off 3s → 15s while connected
- **Alert banner** — FAILED / SCAN_QR_CODE sessions surface app-wide, dismiss-per-alert-set
- **Account Status modal** — per-session reachout timelock state and new-chat message capping (quota bar)
- **Channels explorer** — list followed channels, discover by view/text/country/category, follow/mute/unfollow, message preview with view counts and reactions
- **Workers** — Multi-worker orchestration for WAHA Plus
- **Templates / Auto-Reply / Scheduling / Contacts** — messaging automation management
- **Analytics** — Message and session analytics
- **Server resources** — disk-space health indicators from `GET /health`
- **Themes** — dark (default) and light, persisted
- **i18n** — full Indonesian/English coverage of all chrome, switchable in the topbar
- **PWA** — installable as a standalone app

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build

# Unit tests
npm test
```

The dashboard connects to WAHA via the REST API using same-origin requests — it is served by WAHA itself under `/dashboard` (the production image builds this repo at the ref pinned in waha-core's `waha.config.json`).

## Performance Decisions

- **Vendor chunk splitting** — `vite.build.rollupOptions.output.manualChunks` pins `vue`/`vue-router` into a stable `vendor` chunk so app-code deploys don't invalidate the framework cache for returning browsers.
- **Google Fonts kept remote** (DM Sans / DM Mono) with `preconnect` + `display=swap`; self-hosting was considered and deferred — the dashboard is behind auth, traffic is tiny (3 operators), and remote fonts keep the repo lean.
- **PWA is manifest-only by design** — no service worker. A SW caching an auth-gated SPA risks serving stale sessions after credential rotation; installability comes from the manifest alone.

## Architecture Notes

- **Nuxt 3, static preset** (`ssr: false`) — prerendered SPA served by WAHA's ServeStaticModule under `/dashboard`
- `composables/useWahaApi.ts` — shared fetch layer; resolves the API key from `/api/dashboard/config`
- `composables/useWahaRealtime.ts` — singleton WebSocket with capped-backoff reconnect
- `composables/useLocale.ts` — pure `translate()` core + lazy Nuxt state (unit-tested)
- Dashboard auth is the WAHA cookie flow: `/dashboard/login.html` → `POST /api/dashboard/login` → `waha-auth` HMAC cookie

## Testing & CI

```bash
npm test        # vitest unit tests (useLocale dictionary parity, interpolation)
```

`.github/workflows/ci.yml` runs tests + static build + route-presence checks on every push/PR.

## Related

- **WAHA Core** — [oyi77/waha-core](https://github.com/oyi77/waha-core) — Backend REST API
- **Documentation** — [waha.devlike.pro](https://waha.devlike.pro/)
