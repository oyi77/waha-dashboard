<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-06 | Updated: 2026-05-06 -->

# waha-dashboard

## Purpose
Nuxt 3 management dashboard for WAHA (WhatsApp HTTP API). Static SPA served at `/dashboard/` path with dark green terminal aesthetic. Provides session lifecycle management, real-time event monitoring, settings UI, and WAHA Plus advanced features (templates, auto-reply, scheduling, contacts, analytics, API keys, MCP integration).

## Key Files
| File | Description |
|------|-------------|
| `nuxt.config.ts` | Nuxt configuration — baseURL=/dashboard/, SSR disabled, static preset |
| `app.vue` | Root app component (NuxtLayout + NuxtPage) |
| `package.json` | Nuxt 3.13.2, Vue 3.5.11, npm scripts |
| `README.md` | Project documentation with features and quick start |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `pages/` | Vue file-based routing — 5 core + 9 Plus routes (see below) |
| `pages/plus/` | WAHA Plus feature pages (see below) |
| `components/` | Vue components (WahaToasts notification system) |
| `composables/` | Nuxt composables — useWahaApi (API client) and useToast (notifications) |
| `layouts/` | App shell with sidebar navigation and responsive hamburger menu |
| `assets/css/` | Global styles (551 lines) — CSS design system with dark theme |
| `public/` | Static assets (favicon.svg) |

## For AI Agents

### Working In This Directory
- Nuxt 3 static SPA — SSR is disabled, output is pre-rendered
- Deployed at `/dashboard/` baseURL path
- All API calls go to WAHA REST API via `useWahaApi` composable
- Auth: 401 errors redirect to `/dashboard/login.html` (handled by WAHA, not this dashboard)
- Toast notifications via `useToast` composable + `WahaToasts.vue`
- No database — purely a frontend connecting to WAHA backend
- CSS design system: custom properties with `#22c55e` green accent on `#0a0f0a` dark background
- Typography: DM Sans (body), DM Mono (monospace)

### Testing Requirements
- No test suite currently configured
- Manual testing via `npm run dev` against a running WAHA instance

### Common Patterns
- File-based routing: `pages/*.vue` → routes
- Composable-based state: `useWahaApi` for API, `useToast` for notifications
- Sidebar navigation organized into sections: Overview, Sessions, Messaging, Advanced, Settings
- Core vs Plus feature separation via route prefix (`/plus/`)

## Pages Route Structure

### Core Routes (WAHA Core)
| Route | File | Purpose |
|-------|------|---------|
| `/` | `pages/index.vue` | Dashboard overview (session stats) |
| `/event-monitor` | `pages/event-monitor.vue` | Real-time event monitoring |
| `/Sessions` | `pages/Sessions.vue` | Session lifecycle (start/stop/restart, bulk ops) |
| `/Workers` | `pages/Workers.vue` | Multi-worker orchestration |
| `/Settings` | `pages/Settings.vue` | Configuration settings |

### Plus Routes (WAHA Plus)
| Route | File | Purpose |
|-------|------|---------|
| `/plus/` | `pages/plus/index.vue` | Plus Hub overview |
| `/plus/templates` | `pages/plus/templates.vue` | Message template CRUD |
| `/plus/autoreply` | `pages/plus/autoreply.vue` | Auto-reply rules |
| `/plus/schedule` | `pages/plus/schedule.vue` | Scheduled messages |
| `/plus/contacts` | `pages/plus/contacts.vue` | Contact management |
| `/plus/analytics` | `pages/plus/analytics.vue` | Message & session analytics |
| `/plus/sessions` | `pages/plus/sessions.vue` | Plus session management |
| `/plus/engines` | `pages/plus/engines.vue` | Engine configuration |
| `/plus/apikeys` | `pages/plus/apikeys.vue` | API key management |
| `/plus/mcp` | `pages/plus/mcp.vue` | MCP integration |
| `/plus/skills` | `pages/plus/skills.vue` | Skills management |

## Dependencies

### Internal
- `waha/` — All API calls target the WAHA REST API backend

### External
- Nuxt 3 (v3.13.2)
- Vue 3 (v3.5.11)
- Vue Router 4 (v4.4.5)
- No additional UI frameworks — pure CSS design system

<!-- MANUAL: Custom project notes can be added below -->