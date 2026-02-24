# FLAIO Architecture

## Overview

FLAIO is a suite of self-hosted web applications built primarily with .NET and ASP.NET Core, unified by a central OAuth 2.0 / OpenID Connect auth server. All apps are deployed on Proxmox LXC containers on a home server, exposed to the internet via Cloudflare Tunnels, and auto-deployed from GitHub on every push.

---

## Infrastructure

### Proxmox Host

All production services run on a Proxmox VE hypervisor with ZFS storage (`rpool`). Each app gets its own unprivileged LXC container running Ubuntu 24.04 LTS. Containers share the host's 32 CPU cores and get 64 GB ZFS zvol disk each.

### LXC Containers

| Container | CTID | IP | RAM | Disk | Role |
|-----------|------|-----|-----|------|------|
| **user-auth** | 113 | 192.168.12.130 | 6 GB | 64 GB (ZFS) | Auth server |
| **videopoker-prod** | 115 | 192.168.11.217 | 32 GB | 64 GB (ZFS) | Video poker |
| **flaio-prod** | 116 | 192.168.12.69 | 6 GB | 64 GB (ZFS) | Hub site |
| **lector-tier1** | 102 | 192.168.11.125 | 6 GB | 64 GB (ZFS) | Lector API + Tier 1 scrapers |

Lector also uses a full VM for browser-based scraping:

| VM | IP | RAM | Cores | Role |
|----|-----|-----|-------|------|
| **lector-tier3** | 192.168.12.141 | 16 GB | 4 dedicated | Playwright browser scrapers |

### Networking

```
Internet
  └── Cloudflare (DNS + CDN)
        ├── auth.flaio.com    ──cloudflared──→  user-auth:5001
        ├── poker.flaio.com   ──cloudflared──→  videopoker-prod:5050
        ├── poker.clystr.com  ──cloudflared──→  videopoker-prod:5050
        └── lector.flaio.com  ──cloudflared──→  lector-tier1:5135
```

Each container runs a `cloudflared` tunnel service that connects to Cloudflare's edge network. No ports are opened on the router — all ingress is through the tunnels.

### Deployment

Every app follows the same auto-deploy pattern:

1. A `*-auto-deploy` systemd service runs a bash script that polls GitHub every 10 seconds
2. On new commits: `git pull` -> `dotnet build -c Release` -> restart the app service
3. Cloudflare cache purge on successful deploy
4. Production config files (e.g. `appsettings.Production.json`) are backed up before pull and restored after

---

## Applications

### user-auth (auth.flaio.com)

The central authentication and authorization server for the entire FLAIO ecosystem.

**Stack:** .NET 9, ASP.NET Core, OpenIddict, EF Core, PostgreSQL

**What it does:**
- OAuth 2.0 Authorization Code flow with PKCE for all client apps
- User registration/login (email + password, Google, Apple)
- Per-app subscription tiers (Free, Supporter, Patron, Champion)
- Per-app permissions system with tier-based grants and per-user overrides
- Admin panel for managing users, apps, subscriptions, and permissions
- Shopify integration for subscription billing (artist-patron model)

**Solution structure:**
```
user-auth/
├── src/
│   ├── Flaio.Core/          # Domain models (FlaioUser, FlaioApplication, AppSubscription,
│   │                        #   AppPermission, TierPermission, UserPermission)
│   ├── Flaio.Data/          # EF Core DbContext, migrations, seed data
│   └── Flaio.Server/        # ASP.NET Core host
│       ├── Controllers/     #   OIDC endpoints (authorize, token, userinfo)
│       ├── Api/             #   REST API (account, admin, billing)
│       ├── Services/        #   ClaimsService, PermissionsService, ShopifyService
│       └── wwwroot/         #   Login/register UI, admin panel (vanilla HTML/CSS/JS)
└── tests/
    └── Flaio.Tests/         # xUnit integration tests
```

**Database:** PostgreSQL (`flaio` database)

**Key tables:** AspNetUsers, FlaioApplications, AppSubscriptions, AppPermissions, TierPermissions, UserPermissions

**Custom OIDC claims issued:**
- `flaio:app_tier` — user's subscription tier for the requesting app
- `flaio:app_id` — the app's client ID
- `flaio:permissions` — comma-separated permission keys
- `flaio:is_app_admin` — whether the user is an admin for this app
- `flaio:app_access` — whether the user has access to the app
- `flaio:subscription_expires` — expiration date if applicable

**Registered apps:** video-poker, lector, leprechaun, flaio-auth

**Systemd services:**
- `flaio-api` — the ASP.NET Core server on port 5001
- `flaio-auto-deploy` — git poller + build + restart
- `cloudflared-flaio` — tunnel to auth.flaio.com

---

### video-poker-assistant (poker.flaio.com)

A video poker training tool with analytical solver, strategy tables, and multi-platform clients.

**Stack:** .NET 9, ASP.NET Core, SQLite, JWT, SwiftUI (iOS), Kotlin Compose (Android)

**What it does:**
- Exact EV computation for all 2,598,960 dealt hands x 32 hold patterns
- 47 precomputed strategy tables across 20+ game/paytable variants
- Web UI with horizontal pay table, click-to-hold cards, EV advisor
- Multi-hand play (1/3/5/10/25/50/100 hands)
- Bulk simulation up to 10M rounds with SSE streaming
- Feature gating based on FLAIO subscription tier
- Session persistence, achievements, tier credits

**Supported games:** Jacks or Better, Double Double Bonus, Triple Double Bonus, Deuces Wild, Bonus Deuces Wild — each with multiple paytable variants. Special mechanics: Split Card (IGT), Super Times Pay, Dream Card.

**Solution structure:**
```
video-poker-assistant/
├── src/
│   ├── VideoPokerAssistant.Engine/      # Pure domain: Card, Deck, HandEvaluator,
│   │                                    #   AnalyticalSolver, StrategyTable, PayTable
│   ├── VideoPokerAssistant.Web/         # ASP.NET Core API + static frontend
│   │   ├── Endpoints/                   #   /api/game, /api/session, /api/auth, /api/config
│   │   ├── Helpers/                     #   JWT generation (HMAC-SHA256)
│   │   ├── Data/                        #   SQLite context, UserAccount model
│   │   └── wwwroot/                     #   Vanilla HTML/CSS/JS game UI
│   ├── VideoPokerAssistant.Cli/         # CLI: play, strategy gen/print/sim/diff, ev-manifest
│   ├── VideoPokerAssistant.iOS/         # SwiftUI native app
│   └── VideoPokerAssistant.Android/     # Kotlin Compose native app
└── tests/
    └── VideoPokerAssistant.Engine.Tests/
```

**Database:** SQLite (`videopoker.db`)

**Auth:** Exchanges a FLAIO access token for a local JWT via `POST /api/auth/flaio` (calls `auth.flaio.com/connect/userinfo` to validate).

**Systemd services:**
- `videopoker-api` — ASP.NET Core on port 5050
- `videopoker-auto-deploy` — git poller
- `cloudflared-videopoker` — tunnel to poker.flaio.com

---

### leprechaun

A Free Bet Blackjack engine, Monte Carlo simulator, and counting strategy analyzer.

**Stack:** .NET 10, ASP.NET Core, xUnit (335+ tests), SwiftUI (iOS), Kotlin (Android)

**What it does:**
- Full Free Bet Blackjack implementation with all rules (free splits on pairs, free doubles on hard 9-11)
- Monte Carlo simulation engine for high-precision EV convergence
- Pot of Gold (PoG) side bet analysis with Effect of Removal computation
- Counting system development (BC=0.94, trigger TC~9.8)
- 36-factor analysis: deck count x shuffle point x player count impact on PoG EV
- Browser-based playable table (vanilla HTML/JS + REST API)

**Key findings:** Main game EV: -1.11%, PoG EV: -5.37%. PoG is theoretically countable but the high trigger true count limits practical advantage.

**Solution structure:**
```
leprechaun/
├── src/
│   ├── Leprechaun.Core/       # Zero-dependency: Card, Rank, Suit, Shoe, Hand,
│   │                          #   BasicStrategy, HandResolver, FreeBetRules
│   ├── Leprechaun.Web/        # ASP.NET Core REST API + vanilla HTML/CSS/JS table
│   ├── Leprechaun.Sim/        # CLI: Monte Carlo sim, PoG analysis, EOR analysis
│   ├── Leprechaun.iOS/        # SwiftUI native app
│   └── Leprechaun.Android/    # Kotlin native app
└── tests/
    └── Leprechaun.Tests/      # xUnit (Tier 1-3b, 335+ tests)
```

**Database:** In-memory during sessions

**Auth:** None currently. Planned to add FLAIO OIDC for session persistence and training progress.

**Status:** Development / local use. Not yet deployed to production.

---

### lector-2.0 (lector.flaio.com)

A content aggregator with 26 platform scrapers across 3 tiers, multi-platform clients, and a monitoring dashboard.

**Stack:** .NET 8, ASP.NET Core, PostgreSQL, Redis, RabbitMQ, MassTransit, Playwright, React 19 (web PWA), SwiftUI (iOS), Kotlin Compose (Android)

**What it does:**
- Aggregates content from 26 platforms via RSS, APIs, and browser automation
- Three scraper tiers: Tier 1 (simple HTTP/RSS), Tier 2 (authenticated APIs), Tier 3 (Playwright browser automation for Twitter, Instagram, TikTok, Facebook)
- Full-text search, categories, tags, content filtering, muting
- PWA with offline support (service worker + IndexedDB), push notifications
- OPML import/export, incognito mode, multiple reading layouts (list, card, magazine, newspaper, split-pane)
- Encrypted cookie storage (AES-256-GCM) for authenticated scrapers
- Monitoring dashboard with Prometheus metrics and Serilog/Loki logging

**Solution structure:**
```
lector-2.0/
├── Lector.Api/                # REST API server (port 5135, ~27 controllers)
├── Lector.Core/               # Shared models, DbContext, services
├── Lector.Worker/             # Background job processor (26 scrapers)
├── Lector.Vault/              # Encrypted cookie storage (AES-256-GCM)
├── Lector.Coordinator/        # Optional centralized job scheduler
├── Lector.Extension/          # Chrome extension for cookie capture
├── Lector.Tests/              # xUnit unit tests
├── Lector.Tests.E2E/          # Playwright E2E tests
├── clients/
│   ├── web/                   # React 19 PWA (Vite, ~30 lazy-loaded pages)
│   ├── ios/                   # SwiftUI + SwiftData + FlaioAuth.swift
│   └── android/               # Kotlin Compose + FlaioAuth.kt
├── dashboard/                 # Ops monitoring UI (React 19 + Express)
├── scripts/                   # Deploy scripts, systemd service files
├── k8s/                       # Kubernetes manifests (unused, for future migration)
└── docker-compose.yml         # Local dev stack (PostgreSQL, Redis, RabbitMQ)
```

**Database:** PostgreSQL (`lector` database), Redis (caching, key prefix `lector:`), Minio (S3 blob storage)

**Auth:** Currently native Google OAuth + email/password + 2FA. Mobile clients (iOS/Android) already have full FLAIO OIDC PKCE implementations ready for migration.

**Multi-container deployment:** Lector spans multiple containers/VMs due to its scraper tiers:

| Host | Role | Services |
|------|------|----------|
| lector-tier1 (192.168.11.125) | API + Tier 1/2 scrapers | lector-api, lector-importer-tier1, lector-importer-tier2, postgresql, redis, rabbitmq |
| lector-tier3 (192.168.12.141) | Browser scrapers | lector-importer-tier3 (Playwright, 16 GB RAM, 4 dedicated cores) |

**Systemd services:**
- `lector-api` — ASP.NET Core on port 5135
- `lector-importer-tier1/2/3` — worker processes per tier (Tier 1: 512 MB memory limit)
- `lector-auto-deploy` — git poller
- `lector-dashboard` — monitoring UI
- `lector-heartbeat` — health monitor
- `cloudflared-lector` — tunnel to lector.flaio.com

---

### flaio-new

The portfolio and project hub site.

**Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion

**What it does:**
- Responsive portfolio/hub with dark mode
- Project showcase panels for all FLAIO apps
- Brand animations (gradient blobs, noise overlay, monogram)
- Custom wheel navigation and auto-advancing hero

**Structure:**
```
flaio-new/
├── src/
│   ├── app/                # Next.js app directory (pages, layout)
│   ├── components/
│   │   ├── brand/          # GradientBlobs, FlaioMonogram, NoiseOverlay
│   │   └── ...             # ProjectPanel, Footer, ThemeToggle
│   ├── data/               # Static data (project listings)
│   └── hooks/              # useAutoAdvance, useWheelNavigation, useDesignTheme
└── public/                 # Static assets
```

**Status:** Scaffold / in progress. Not yet deployed to production.

---

### beyonce-museum

A TikTok video scraper and archival tool. Outlier project — Python, not part of the FLAIO auth ecosystem.

**Stack:** Python 3, SQLite

**What it does:** Scrapes, categorizes, and archives Beyonce-related TikTok content. CLI-driven with multiple scraper strategies (enhanced, hybrid, profile-based).

**Status:** Development / local use only.

---

## Auth Flow

All FLAIO apps authenticate through the central `user-auth` server using standard OAuth 2.0 / OIDC:

```
Client App (browser/mobile)
  │
  │  1. Redirect to auth.flaio.com/connect/authorize
  │     (Authorization Code + PKCE)
  │
  ▼
auth.flaio.com
  │  2. User logs in (email/password, Google, or Apple)
  │  3. Consent screen (if first time)
  │  4. Redirect back with authorization code
  │
  ▼
Client App
  │  5. Exchange code for tokens at /connect/token
  │  6. Receives: access_token, refresh_token, id_token
  │
  │  For web apps with their own backend:
  │  7. POST /api/auth/flaio with the access_token
  │  8. Backend calls auth.flaio.com/connect/userinfo
  │  9. Backend issues its own local JWT
  │
  ▼
Authenticated requests use local JWT (or FLAIO access token directly)
```

**Token claims include:** user identity (sub, email, name), app-specific tier, permissions list, and admin status. Client apps use `flaio:permissions` to gate features without additional API calls.

**Mobile clients** (iOS and Android) use platform-native PKCE implementations:
- **iOS:** `ASWebAuthenticationSession` + Keychain storage (`FlaioAuth.swift`)
- **Android:** Chrome Custom Tabs + `EncryptedSharedPreferences` (`FlaioAuth.kt`)

---

## Permissions System

The auth server maintains a database-driven permissions matrix that replaces hardcoded feature lists.

**Three-layer resolution:**

1. **Tier permissions** — each subscription tier grants a set of permissions (e.g. Supporter tier for video-poker grants `training_mode`, `jacks_or_better`, etc.)
2. **User overrides** — individual users can be explicitly granted or denied specific permissions regardless of tier
3. **Admin override** — users with admin role automatically receive all permissions for all apps

**30 permissions across 5 apps:**
- video-poker: 10 (game variants, features like training mode, autoplay, detailed stats)
- lector: 8 (feed limits, themes, fulltext search, no ads, early access)
- leprechaun: 6 (card counting, advanced strategy, statistics, no ads)
- flaio-auth: 6 (admin panel, manage users/subscriptions/apps/permissions, view analytics)

**Admin UI:** The auth server's admin panel has a permissions matrix tab showing all users x all permissions, with color-coded dots indicating the source (tier grant, explicit override, denial, admin). Click a cell to cycle through grant/deny/remove.

---

## Shared Patterns

All .NET apps follow the same conventions:

**Solution layout:**
```
{Name}.Core/     # Pure domain logic (zero external dependencies)
{Name}.Web/      # ASP.NET Core API + static HTML/CSS/JS frontend
{Name}.Cli|Sim/  # Console app (optional)
{Name}.Tests/    # xUnit tests
```

**Frontend:** Vanilla HTML/CSS/JS served from `wwwroot/`. No frontend framework on the server-rendered apps — React is only used for Lector's PWA client and the flaio-new hub site.

**Deployment:** GitHub -> auto-deploy systemd service (git poll every 10s) -> `dotnet build -c Release` -> restart app service -> Cloudflare cache purge.

**Tunneling:** Every production container runs `cloudflared` to expose the app through Cloudflare's network. No open ports on the home network.
