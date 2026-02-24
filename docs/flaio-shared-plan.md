# Cross-Project Abstraction Plan: FLAIO Shared Infrastructure

## Context

Six projects under `~/Desktop/Local/` share significant duplicate code across deployment, Cloudflare integration, ASP.NET Core bootstrapping, auth infrastructure, and secrets management. The same Cloudflare API token is hardcoded in multiple bash scripts. Three C# projects follow an identical solution structure but share zero code. Auth is fragmented: Lector has Google OAuth + email/password + 2FA, video-poker-assistant has Flaio OIDC -> JWT, leprechaun has no auth. iOS and Android clients each have their own `FlaioAuth` implementations that should be shared libraries. This plan extracts everything into reusable components.

---

## Project Inventory

| Project | Stack | Role |
|---------|-------|------|
| **user-auth** | C# .NET 10, ASP.NET Core, OpenIddict, EF Core, PostgreSQL | Central auth server (auth.flaio.com) |
| **lector-2.0** | C# .NET 10, ASP.NET Core, EF Core, RabbitMQ, Redis | Content aggregator with 26 scrapers |
| **video-poker-assistant** | C# .NET 10, ASP.NET Core, EF Core, SQLite, JWT | Video poker engine + web + mobile |
| **leprechaun** | C# .NET 10, ASP.NET Core, xUnit | Blackjack engine/simulator/trainer |
| **beyonce-museum** | Python 3 (outlier) | TikTok video scraper |
| **flaio-new** | Next.js 16, React 19, TypeScript | Portfolio hub site |
| **flaio/drop5/hydrogen** | Shopify Hydrogen, React Router, Vite | E-commerce storefront |

---

## Recent Developments

### Per-App Permissions System (completed 2026-02-23)

The auth server now has a full database-driven permissions system replacing hardcoded feature lists. This is live on auth.flaio.com.

**What was built:**

- **3 new database tables:** `AppPermissions` (permission definitions per app), `TierPermissions` (which tiers grant which permissions), `UserPermissions` (per-user overrides: grant or deny)
- **PermissionsService:** Resolves effective permissions by merging tier grants + user overrides. Admins get all permissions automatically.
- **Claims integration:** Two new claims flow through the entire OIDC pipeline:
  - `flaio:permissions` — comma-separated permission keys (e.g. `"basic_strategy,jacks_or_better,training_mode"`)
  - `flaio:is_app_admin` — `"true"` or `"false"`
- **BillingController:** Features are now queried from the DB (`AppPermission` + `TierPermission` tables) instead of the old hardcoded `GetAppFeaturesForTier()` dictionary.
- **5 admin API endpoints:** Full CRUD for permissions matrix, per-app permission management, and per-user override management.
- **Admin UI:** New "Permissions" tab in the admin panel with a Linear-style permissions matrix — color-coded dots showing tier grants (green), overrides (blue), denials (red), admin grants (purple). Click-to-toggle cycling through grant/deny/remove.
- **flaio-auth registered as its own app** with admin-specific permissions: `admin_panel`, `manage_users`, `manage_subscriptions`, `manage_apps`, `manage_permissions`, `view_analytics`.
- **Seed data:** 30 permissions across 5 apps (video-poker: 10, lector: 8, leprechaun: 6, flaio-auth: 6). Daniel, John, and admin@flaio.app seeded with all permissions.

**Impact on client apps:** Client apps can now read `flaio:permissions` from the OIDC token or `/connect/userinfo` to gate features, instead of relying solely on tier string comparisons. The poker app already uses `flaio:app_access` for its auth gate.

---

## Identified Commonalities

### 1. Deploy Scripts (HIGH duplication - lector-2.0, flaio-new, video-poker-assistant)

All three have nearly identical auto-deploy bash scripts:
- **Git polling loop** checking for new commits every 10s
- **Build -> restart systemd service -> Cloudflare cache purge** pipeline
- Colored console logging with timestamps
- Graceful shutdown on SIGINT/SIGTERM
- Same hardcoded CF credentials everywhere

**Files with duplicate deploy logic:**
- `lector-2.0/scripts/auto-deploy.sh` (288 lines)
- `flaio-new/scripts/auto-deploy.sh`
- `lector-2.0/scripts/auto-deploy-worker.sh`

### 2. Cloudflare Cache Purge (HIGH duplication - 3+ scripts)

Identical curl calls to CF API with **hardcoded** credentials:
```
CF_API_TOKEN="4VHDFMzFeA9pfXBdZtxrH1XxFFlbV1q-KRhwc91D"
CF_ZONE_ID="363137458b855507cb0da74e40b2c24c"
```
Found in: `lector-2.0/scripts/auto-deploy.sh`, `flaio-new/scripts/auto-deploy.sh`

### 3. Systemd Service Files (MEDIUM duplication - lector-2.0, flaio-new)

15 systemd files in lector-2.0 alone, plus flaio-new services. All share:
- Same `User=administrator`, same security hardening block
- Same `DOTNET_ROOT` / `PATH` environment setup
- Same restart/logging configuration
- Only differ in: `Description`, `WorkingDirectory`, `ExecStart`, and app-specific env vars

### 4. C# Solution Structure (MEDIUM duplication - 3 projects)

All three .NET projects follow identical architecture:
```
{Name}.Core/     -> Pure domain logic (zero deps)
{Name}.Web/      -> ASP.NET Core API + static frontend
{Name}.Cli|Sim/  -> Console app
{Name}.Tests/    -> xUnit tests
```

Shared ASP.NET Core patterns:
- CORS configuration (dev: localhost permissive, prod: allowlist)
- Static file serving from wwwroot
- Minimal API endpoint mapping (MapGet/MapPost)
- Similar `Program.cs` bootstrapping

### 5. Secrets Management (CRITICAL security issue)

- CF API token copy-pasted across repos as plaintext
- No centralized secrets store
- `.env` files used inconsistently
- Systemd service files contain inline secrets

### 6. Auth Infrastructure (HIGH duplication + fragmentation)

**Current state — 3 different auth systems:**

| Project | Auth Method | Server-Side | Token Type |
|---------|------------|-------------|------------|
| **lector-2.0** | Google OAuth + email/password + 2FA | `AuthController.cs`, `GoogleAuthService.cs`, `PasswordService.cs` | API key + session token (base64, 30-day) |
| **video-poker-assistant** | Flaio OIDC exchange | `AuthEndpoints.cs`, `AuthHelpers.cs` | JWT (HMAC-SHA256, 30-day) |
| **leprechaun** | None | — | — |

**Flaio OIDC is already the target auth system.** Video-poker-assistant exchanges a Flaio access token for a local JWT via `POST /api/auth/flaio` -> calls `https://auth.flaio.com/connect/userinfo`. Lector's iOS/Android clients already have full `FlaioAuth` PKCE implementations. The goal: make Flaio OIDC the universal auth across all projects.

**Key server-side code (video-poker-assistant pattern — the one to standardize on):**
- `video-poker-assistant/src/VideoPokerAssistant.Web/Endpoints/AuthEndpoints.cs` — exchanges Flaio access token for local JWT
- `video-poker-assistant/src/VideoPokerAssistant.Web/Helpers/AuthHelpers.cs` — JWT generation (HMAC-SHA256)
- `video-poker-assistant/src/VideoPokerAssistant.Web/Data/UserAccount.cs` — user model with `FlaioSubjectId`, `Email`, `DisplayName`, `FlaioTier`

**Key mobile code (already exists, needs extraction to shared libs):**
- `lector-2.0/clients/ios/` — `FlaioAuth.swift` (PKCE + ASWebAuthenticationSession + Keychain)
- `lector-2.0/clients/android/` — `FlaioAuth.kt` (PKCE + Chrome Custom Tabs + StateFlow)
- Both connect to `auth.flaio.com`, both use scopes `openid email profile roles offline_access flaio:apps`
- Both store tokens in platform secure storage (Keychain / EncryptedSharedPreferences)

**New: Permission-aware auth.** With the permissions system in place, client apps can now receive `flaio:permissions` and `flaio:is_app_admin` claims directly from the OIDC token. This means the shared auth library should expose these claims so client apps can gate features without additional API calls.

### 7. Frontend Patterns (LOW duplication - flaio-new, hydrogen)

- Both use Tailwind CSS
- Cloudinary image optimization exists in hydrogen (`app/lib/cloudinary.ts`)
- FLAIO brand components already modular in flaio-new (`src/components/brand/`)
- Different frameworks (Next.js vs Hydrogen) limit deep sharing

---

## Abstraction Plan

Everything lives in a **single monorepo**: `~/Desktop/Local/flaio-shared/`

### Repository Structure

```
~/Desktop/Local/flaio-shared/
├── Flaio.Shared.sln
│
├── ops/                                    # DEPLOY & OPS TOOLING
│   ├── bin/
│   │   ├── auto-deploy.sh                 # Parameterized auto-deploy
│   │   ├── cf-purge.sh                    # Cloudflare cache purge
│   │   └── deploy-manual.sh              # rsync+SSH deploy template
│   ├── systemd/
│   │   ├── templates/
│   │   │   ├── dotnet-service.template
│   │   │   └── node-service.template
│   │   └── generate-service.sh
│   └── install.sh                         # Symlinks bin/ into PATH
│
├── secrets/
│   ├── .gitignore                         # Ignores *.env
│   ├── secrets.env.example                # Template with all keys (no values)
│   └── README.md                          # Setup instructions for each server
│
├── src/                                   # .NET NUGET PACKAGES
│   ├── Flaio.Auth/                        # OIDC auth (JWT, token exchange)
│   │   └── ...
│   ├── Flaio.Auth.EntityFramework/        # Optional EF Core adapter
│   │   └── ...
│   └── Flaio.Web/                         # CORS, health checks, version endpoint, CF purge
│       └── ...
│
├── tests/
│   ├── Flaio.Auth.Tests/
│   └── Flaio.Web.Tests/
│
├── nuget.config                           # Local package source
└── README.md
```

### Phase 1: Scaffold Repo + Secrets (do first — security fix)

**What:** Create the repo, establish secrets management, remove all hardcoded tokens.

**Steps:**
1. Create `flaio-shared/` repo with the structure above
2. Create `secrets/secrets.env.example`:
   ```env
   CF_API_TOKEN=
   CF_ZONE_ID=
   FLAIO_AUTH_URL=https://auth.flaio.com
   FLAIO_JWT_KEY=
   LECTOR_DB_CONN=
   POKER_JWT_SECRET=
   ```
3. On each server, copy to `~/.config/flaio/secrets.env`, fill values, `chmod 600`
4. All deploy scripts source `~/.config/flaio/secrets.env` instead of hardcoding
5. Systemd services use `EnvironmentFile=~/.config/flaio/secrets.env`
6. Remove hardcoded CF tokens from all git repos
7. Add `secrets.env` patterns to all project `.gitignore` files

### Phase 2: `ops/` — Shared Deploy Toolkit

**What:** Parameterized deploy scripts and systemd templates inside the monorepo.

**Key changes:**
- `auto-deploy.sh` takes `SERVICE_NAME`, `REPO_PATH`, `BUILD_CMD`, `BRANCH` as env vars
- `cf-purge.sh` reads from `~/.config/flaio/secrets.env`
- Systemd templates use `envsubst` to generate project-specific `.service` files
- Each consuming project gets a thin wrapper: `scripts/deploy.sh` that sets config + sources `flaio-shared/ops/bin/auto-deploy.sh`

**Migration:** lector-2.0, flaio-new, video-poker-assistant each replace their `scripts/auto-deploy.sh`.

### Phase 3: `Flaio.Auth` — Shared .NET Auth Library

**What:** A NuGet package that gives any FLAIO .NET project Flaio OIDC authentication in ~5 lines of `Program.cs`.

**Based on:** The existing video-poker-assistant pattern (`AuthEndpoints.cs` + `AuthHelpers.cs`) which is already the cleanest implementation — exchange Flaio access token -> local JWT.

**Structure:**
```
flaio-shared/
├── src/
│   ├── Flaio.Auth/
│   │   ├── Flaio.Auth.csproj                # Targets net8.0;net9.0;net10.0
│   │   ├── FlaioAuthExtensions.cs           # builder.Services.AddFlaioAuth(config)
│   │   │                                     #   -> Adds JWT bearer auth
│   │   │                                     #   -> Registers HttpClient("FlaioAuth") pointed at auth.flaio.com
│   │   │                                     #   -> Registers IFlaioUserService
│   │   ├── FlaioAuthEndpoints.cs            # app.MapFlaioAuth()
│   │   │                                     #   -> POST /api/auth/flaio (token exchange)
│   │   │                                     #   -> GET  /api/auth/me (current user)
│   │   │                                     #   -> POST /api/auth/logout
│   │   ├── FlaioAuthOptions.cs              # AuthServerUrl, ClientId, JwtKey, JwtIssuer, TokenExpiry
│   │   ├── FlaioUserClaims.cs               # Sub, Email, Name, Tier, Roles, Permissions, IsAppAdmin
│   │   ├── IFlaioUserService.cs             # GetOrCreateUser(claims) — projects implement for their own User entity
│   │   ├── JwtTokenService.cs               # Generate/validate JWT (extracted from AuthHelpers.cs)
│   │   └── FlaioAuthMiddleware.cs           # Optional: auto-refresh, role-based gates
│   │
│   └── Flaio.Auth.EntityFramework/          # Optional EF Core adapter
│       ├── FlaioUser.cs                      # Base user entity (FlaioSubjectId, Email, DisplayName, Tier)
│       └── FlaioUserService.cs              # Default IFlaioUserService using EF Core
```

**New: Permission-aware claims.** `FlaioUserClaims` now includes `Permissions` (parsed from `flaio:permissions` comma-separated claim) and `IsAppAdmin` (from `flaio:is_app_admin` claim). Client apps can use these to gate features:
```csharp
if (user.Claims.Permissions.Contains("training_mode")) { /* show training UI */ }
if (user.Claims.IsAppAdmin) { /* show admin panel */ }
```

**Usage in a project's Program.cs:**
```csharp
builder.Services.AddFlaioAuth(builder.Configuration.GetSection("FlaioAuth"));
// ...
app.MapFlaioAuth();    // Maps /api/auth/flaio, /api/auth/me, /api/auth/logout
app.UseAuthentication();
app.UseAuthorization();
```

**appsettings.json:**
```json
{
  "FlaioAuth": {
    "AuthServerUrl": "https://auth.flaio.com",
    "JwtKey": "from-secrets-env",
    "JwtIssuer": "flaio",
    "TokenExpiryDays": 30
  }
}
```

**Migration per project:**
- **video-poker-assistant:** Delete `AuthEndpoints.cs`, `AuthHelpers.cs`, replace with `AddFlaioAuth()` + `MapFlaioAuth()`. Keep `UserAccount.cs` but implement `IFlaioUserService` for it.
- **lector-2.0:** Add Flaio OIDC alongside existing Google OAuth + email/password. Lector keeps its existing auth as a fallback (self-hosted users may not have Flaio accounts). Add `MapFlaioAuth()` endpoints in addition to existing `AuthController`.
- **leprechaun:** Add `AddFlaioAuth()` + `MapFlaioAuth()` to gain auth for the first time. Training progress and session history can now persist per user.

### Phase 4: Shared Mobile Auth Libraries

**What:** Extract the existing `FlaioAuth` implementations from Lector's iOS/Android clients into standalone libraries that all FLAIO mobile apps can use.

#### 4a: `FlaioAuth` Swift Package (iOS)

**Source:** `lector-2.0/clients/ios/` — `FlaioAuth.swift` already implements full PKCE OIDC.

**Extract to:** `~/Desktop/Local/flaio-auth-ios/` (Swift Package)
```
flaio-auth-ios/
├── Package.swift
├── Sources/
│   └── FlaioAuth/
│       ├── FlaioAuth.swift              # PKCE flow (ASWebAuthenticationSession)
│       ├── FlaioAuthConfig.swift        # authServerUrl, clientId, redirectScheme, scopes
│       ├── FlaioUserClaims.swift        # sub, name, email, tier, roles, permissions, isAppAdmin
│       ├── FlaioTokenStore.swift        # Keychain wrapper (access/refresh/id tokens)
│       └── FlaioAuthPresentationContext.swift
└── Tests/
```

**Consumed by:**
- `lector-2.0/clients/ios/` — replace inline FlaioAuth with package dependency
- `video-poker-assistant/src/VideoPokerAssistant.iOS/` — add FlaioAuth for SSO
- Any future iOS FLAIO apps (blackjack trainer, etc.)

**Config per app:**
```swift
FlaioAuth(config: .init(
    clientId: "lector",           // or "poker", "blackjack"
    redirectScheme: "com.flaio.lector",
    scopes: "openid email profile roles offline_access flaio:apps"
))
```

#### 4b: `FlaioAuth` Android Library (Kotlin)

**Source:** `lector-2.0/clients/android/` — `FlaioAuth.kt` already implements PKCE + Chrome Custom Tabs.

**Extract to:** `~/Desktop/Local/flaio-auth-android/` (Android library module / Maven local)
```
flaio-auth-android/
├── build.gradle.kts
├── src/main/kotlin/com/flaio/auth/
│   ├── FlaioAuth.kt                    # PKCE flow (Chrome Custom Tabs)
│   ├── FlaioAuthConfig.kt              # authServerUrl, clientId, redirectScheme, scopes
│   ├── FlaioAuthState.kt               # StateFlow-based auth state
│   ├── FlaioUserClaims.kt              # sub, name, email, tier, permissions, isAppAdmin
│   └── FlaioTokenStore.kt              # EncryptedSharedPreferences wrapper
└── src/test/
```

**Consumed by:** Same pattern as iOS — lector Android, poker Android, future apps.

### Phase 5: `Flaio.Web` — Shared ASP.NET Core Bootstrapping

**What:** NuGet package for the common web infrastructure patterns.

**Structure:**
```
flaio-shared/
├── src/
│   └── Flaio.Web/
│       ├── Flaio.Web.csproj
│       ├── CorsExtensions.cs            # AddFlaioCors(config) — dev/prod CORS
│       ├── StaticFileExtensions.cs      # UseStaticFilesWithCaching()
│       ├── HealthCheckExtensions.cs     # /health, /ready endpoints
│       ├── VersionEndpoint.cs           # GET /api/version (git hash, build time)
│       ├── CloudflareCachePurger.cs     # ICloudflareCachePurger for programmatic purge
│       ├── CloudflareOptions.cs         # Options pattern for CF creds
│       └── RequestLoggingMiddleware.cs  # Structured request/response logging
```

**Migration:** All 3 .NET projects gain standardized CORS, health checks, version endpoint.

### Phase 6 (Optional): Frontend Shared Packages

**Deferred.** Lower priority due to framework differences (Next.js vs Hydrogen, React 18 vs 19).

**Candidates:**
- `@flaio/brand` — 10 brand components from `flaio-new/src/components/brand/`
- `@flaio/cloudinary` — image optimization from `hydrogen/app/lib/cloudinary.ts`
- Shared Tailwind design token preset

---

## Distribution Strategy

**All .NET packages** (`Flaio.Auth`, `Flaio.Web`) live in a single solution:
```
~/Desktop/Local/flaio-shared/
├── Flaio.Shared.sln
├── src/
│   ├── Flaio.Auth/
│   ├── Flaio.Auth.EntityFramework/
│   └── Flaio.Web/
├── tests/
│   ├── Flaio.Auth.Tests/
│   └── Flaio.Web.Tests/
└── nuget.config
```

**Local NuGet feed:** `dotnet pack` -> output to `~/Desktop/Local/flaio-packages/`. Each consuming project adds a `nuget.config`:
```xml
<packageSources>
  <add key="flaio-local" value="../flaio-packages" />
  <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
</packageSources>
```

**Mobile packages:** Swift Package via local path or git URL. Android via `includeBuild` or `mavenLocal()`.

---

## Implementation Order

| # | Phase | Effort | Impact | Dependency |
|---|-------|--------|--------|------------|
| 1 | Secrets consolidation | Small | Critical (security) | None |
| 2 | ops/ deploy toolkit | Medium | High (3+ projects) | Phase 1 |
| 3 | Flaio.Auth NuGet | Medium | High (unifies auth across all apps) | Phase 1 (needs JWT secret in secrets.env) |
| 4 | Mobile auth libraries | Medium | High (iOS + Android for all apps) | Phase 3 (same OIDC config) |
| 5 | Flaio.Web NuGet | Small | Medium (3 projects) | None |
| 6 | Frontend packages | Large | Low | None |

**Recommended order:** 1 -> 2 -> 3 -> 4 -> 5. Phase 6 deferred.

---

## Verification

- **Phase 1:** `grep -rn "4VHDFMz" ~/Desktop/Local/` returns zero matches
- **Phase 2:** Run auto-deploy for each project, verify identical behavior to current scripts
- **Phase 3:** `dotnet test` on Flaio.Auth.Tests. Hit `POST /api/auth/flaio` on each project with a valid Flaio token. Verify JWT returned with `flaio:permissions` and `flaio:is_app_admin` claims. `/api/auth/me` works.
- **Phase 4:** Build iOS/Android apps, test Flaio SSO login flow end-to-end on device/simulator. Verify permissions claims propagate to mobile.
- **Phase 5:** Verify `/health`, `/api/version` respond on all 3 .NET projects.

---

## What NOT to Abstract

- **beyonce-museum**: Python project, no overlap. Leave as-is.
- **Game-specific evaluation**: Poker `HandEvaluator`/`AnalyticalSolver`, blackjack `BasicStrategy`/`HandResolver` — these stay in their respective Core libraries.
- **Card domain models**: Each card game (video-poker, leprechaun) has its own Card/Rank/Suit types optimized for its specific use case. Not worth unifying — different rank numeric mappings, different deck semantics (standard 52 vs multi-deck shoe).
- **Database schemas**: Each project has its own data model. Flaio.Auth provides a base `FlaioUser` entity but projects extend it with their own fields.
- **Lector's existing auth**: Keep Google OAuth + email/password + 2FA in Lector. Flaio OIDC is added as an *additional* auth method, not a replacement (self-hosted users need local auth).
- **Permissions management**: Stays in `user-auth` (auth.flaio.com). Client apps consume permissions via OIDC claims — they don't need their own permissions tables.
