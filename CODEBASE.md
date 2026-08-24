# CODEBASE.md — waha-dashboard
> Auto-generated codebase memory for AI agents. Last updated: 2026-06-19.

## Purpose
Web-based management dashboard for WAHA (WhatsApp HTTP API). Provides a UI for session management, worker orchestration, message templates, auto-reply rules, scheduling, contacts, and analytics. Connects to WAHA Core via REST API.

## Tech Stack
- **Language**: TypeScript
- **Framework**: Nuxt.js 3 (Vue 3, Vue Router 4)
- **Build**: Vite (via Nuxt), static preset (SPA)
- **Styling**: Custom CSS (`assets/css/main.css`)
- **Fonts**: DM Sans, DM Mono (Google Fonts)

## Entry Points
- **App**: `app.vue` — root Vue component
- **Config**: `nuxt.config.ts` — Nuxt configuration (SSR disabled, static preset, base URL `/dashboard/`)

## Directory Structure
| Directory | Purpose |
|-----------|---------|
| `pages/` | Route pages: `index.vue`, `Sessions.vue`, `Settings.vue`, `Workers.vue`, `event-monitor.vue`, `plus/` |
| `components/` | Reusable Vue components (`WahaToasts.vue`) |
| `layouts/` | Page layouts (`default.vue`) |
| `composables/` | Vue composables: `useWahaApi.ts` (API client), `useToast.ts` |
| `assets/css/` | Global stylesheets |
| `public/` | Static assets (favicon) |
| `.github/workflows/` | CI/CD pipelines |
| `.nuxt/` | Nuxt build artifacts (generated) |
| `.output/` | Production build output (generated) |

## Key Files
| File | Purpose |
|------|---------|
| `nuxt.config.ts` | Nuxt config: SPA mode, `/dashboard/` base URL, static nitro preset |
| `app.vue` | Root component |
| `pages/Sessions.vue` | Session management UI (32KB, largest page) |
| `pages/Settings.vue` | Configuration settings UI |
| `pages/Workers.vue` | Multi-worker orchestration UI |
| `pages/event-monitor.vue` | Real-time event monitoring |
| `composables/useWahaApi.ts` | WAHA REST API client composable (3.9KB) |
| `composables/useToast.ts` | Toast notification composable |
| `layouts/default.vue` | Main layout with navigation (7.3KB) |
| `package.json` | Dependencies (Nuxt 3.13, Vue 3.5) |

## Architecture
```
Nuxt.js SPA (static preset)
    ├── pages/            File-based routing
    │   ├── index         Dashboard home
    │   ├── Sessions      Session CRUD + bulk operations
    │   ├── Workers       Multi-worker management (WAHA Plus)
    │   ├── Settings      Engine, lifecycle, API credentials config
    │   └── event-monitor Real-time message/session events
    ├── composables/
    │   ├── useWahaApi    HTTP client → WAHA REST API
    │   └── useToast      Notification system
    └── layouts/
        └── default       Nav sidebar + content area
```
- **SPA Mode**: SSR disabled; serves as static files under `/dashboard/`
- **API Connection**: Configured via `NUXT_PUBLIC_WAHA_API_URL` environment variable
- **Deployment**: Can be served standalone or mounted into WAHA Core's static file server

## Run Commands
```bash
# Install
yarn install    # or: npm install

# Development
yarn dev        # or: npm run dev

# Production build
yarn build      # or: npm run build

# Preview production
yarn preview    # or: npm run preview
```

## Environment Variables
| Variable | Purpose |
|----------|---------|
| `NUXT_PUBLIC_WAHA_API_URL` | WAHA API server URL (e.g., `https://your-waha-server.com`) |
