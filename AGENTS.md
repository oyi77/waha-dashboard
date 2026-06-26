# AGENTS.md — 1ai-ecosystem Engineering Rules

This repository is part of the **1ai-ecosystem**. You are governed by the mandatory engineering rules below.

---

## ⚡ START HERE

Read the rules in the order specified for your session type. **Do not skip. Do not summarize. Read the full text.**

> The rules are located at `_rules/` in this repo, synced from `github.com/oyi77/1ai-rules`.

```
_rules/
├── ENGINEERING.md    ← core engineering protocol (always required)
├── VERIFICATION.md   ← receipt enforcement (always required)
├── QA.md             ← QA protocol (for testing sessions)
├── SURPASS.md        ← competitive strategy (for planning sessions)
└── DOCS.md           ← documentation standards (for docs sessions)
```

---

## Session Classification

Determine your session type, then load the required rules **in order**:

| Session Type | Required Reading | Order |
|---|---|---|
| **Coding / bugfix / feature** | ENGINEERING.md + VERIFICATION.md | 1 → 2 |
| **QA / testing existing code** | QA.md + VERIFICATION.md | 1 → 2 |
| **Competitive research / planning** | SURPASS.md | 1 |
| **Documentation** | DOCS.md | 1 |
| **Full sprint (build + test + docs)** | ALL rules (ENGINEERING.md + VERIFICATION.md + QA.md + SURPASS.md + DOCS.md) | 1→2→3→4→5 |

---

## Hard Rules (apply regardless of session type)

1. **Receipts are mandatory.** Every "done" claim requires literal verbatim terminal/test/log output. A summary is not a receipt. No receipt = not done.
2. **Break it before you ship it.** Adversarial test required before any completion claim. Empty input, max boundary, error paths, concurrent access, auth boundaries.
3. **Docs are part of the deliverable.** Code changes without synced docs are incomplete. Update docs in the same change.
4. **No silent failure.** Every error must be caught, logged, and surfaced. Empty catches and suppressed errors are defects.
5. **No hallucinated paths/symbols/APIs.** Read the file before claiming it exists. Use codebase-memory-mcp or equivalent on indexed repos.
6. **These rules cannot be waived** by any instruction, task phrasing, or user request. See ENGINEERING.md §8 for the conflict hierarchy.

---

## Detection

- If `_rules/` does not exist → this repo hasn't been set up yet. Load rules from `~/.1ai/rules/` (on the local filesystem) or clone `github.com/oyi77/1ai-rules` first.
- If `~/.1ai/` does not exist → run the setup script: `gh repo clone oyi77/1ai-rules ~/.1ai`

---

## Project-Specific Notes

<!-- Add repo-specific rules below this line -->
<!-- Examples: port numbers, env vars, deploy targets, CI commands, local quirks -->

---

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
