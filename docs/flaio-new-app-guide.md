# Starting a New FLAIO App from Scratch

Step-by-step guide for creating a new app in the FLAIO ecosystem — from repo creation through production deployment.

---

## 1. Create the Repository

```bash
# Create the repo on GitHub
gh repo create danielgigs17/my-new-app --private --clone

cd my-new-app

# Initialize .NET solution
dotnet new sln -n MyNewApp
mkdir -p src tests

# Create projects
dotnet new classlib -o src/MyNewApp.Core
dotnet new web -o src/MyNewApp.Web
dotnet new xunit -o tests/MyNewApp.Tests

# Add projects to solution
dotnet sln add src/MyNewApp.Core
dotnet sln add src/MyNewApp.Web
dotnet sln add tests/MyNewApp.Tests

# Add project references
dotnet add src/MyNewApp.Web reference src/MyNewApp.Core
dotnet add tests/MyNewApp.Tests reference src/MyNewApp.Core

# Initial commit
git add -A
git commit -m "Initial .NET solution scaffold"
git push -u origin main
```

**Solution layout convention:**
```
MyNewApp/
├── MyNewApp.sln
├── src/
│   ├── MyNewApp.Core/       # Pure domain logic (zero external dependencies)
│   └── MyNewApp.Web/        # ASP.NET Core API + static frontend (wwwroot/)
└── tests/
    └── MyNewApp.Tests/      # xUnit tests
```

---

## 2. Register the App on user-auth

Two things need to be registered in `user-auth/src/Flaio.Data/Seeding/DbSeeder.cs`:

### 2a. OpenIddict Client Application

In `SeedOpenIddictApplicationsAsync()`, add:

```csharp
if (await manager.FindByClientIdAsync("my-new-app") is null)
{
    await manager.CreateAsync(new OpenIddictApplicationDescriptor
    {
        ClientId = "my-new-app",
        DisplayName = "My New App",
        ClientType = OpenIddictConstants.ClientTypes.Public,
        RedirectUris =
        {
            new Uri("https://myapp.flaio.com/auth/callback"),
            new Uri("http://localhost:5060/auth/callback"),
        },
        PostLogoutRedirectUris =
        {
            new Uri("https://myapp.flaio.com/"),
            new Uri("http://localhost:5060/"),
        },
        Permissions =
        {
            OpenIddictConstants.Permissions.Endpoints.Authorization,
            OpenIddictConstants.Permissions.Endpoints.Token,
            OpenIddictConstants.Permissions.Endpoints.EndSession,
            OpenIddictConstants.Permissions.GrantTypes.AuthorizationCode,
            OpenIddictConstants.Permissions.GrantTypes.RefreshToken,
            OpenIddictConstants.Permissions.ResponseTypes.Code,
            OpenIddictConstants.Permissions.Scopes.Email,
            OpenIddictConstants.Permissions.Scopes.Profile,
            OpenIddictConstants.Permissions.Scopes.Roles,
            OpenIddictConstants.Permissions.Prefixes.Scope + "offline_access",
            OpenIddictConstants.Permissions.Prefixes.Scope + "flaio:apps"
        },
        Requirements =
        {
            OpenIddictConstants.Requirements.Features.ProofKeyForCodeExchange
        }
    });
}
```

### 2b. FLAIO Application Record

In `SeedFlaioApplicationsAsync()`, add:

```csharp
if (!await context.FlaioApplications.AnyAsync(a => a.ClientId == "my-new-app"))
{
    context.FlaioApplications.Add(new FlaioApplication
    {
        ClientId = "my-new-app",
        DisplayName = "My New App",
        AvailableTiersJson = "[\"Free\",\"Supporter\",\"Patron\",\"Champion\"]",
        DefaultTier = "Free"
    });
}
```

### 2c. App Permissions (optional)

In `SeedAppPermissionsAsync()`, define what features each tier gets:

```csharp
("my-new-app", "basic_feature",    "Basic Feature",    null, "feature", 10, new[] { "Free", "Supporter", "Patron", "Champion" }),
("my-new-app", "premium_feature",  "Premium Feature",  null, "feature", 20, new[] { "Supporter", "Patron", "Champion" }),
("my-new-app", "pro_feature",      "Pro Feature",      null, "feature", 30, new[] { "Patron", "Champion" }),
```

After editing, commit, push, and let auto-deploy apply the changes on auth.flaio.com. The new app will appear in the admin panel.

---

## 3. Backend Auth Integration

### 3a. Install Dependencies

```bash
cd src/MyNewApp.Web
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Microsoft.EntityFrameworkCore.Sqlite
dotnet add package Microsoft.EntityFrameworkCore.Design
```

### 3b. User Model

```csharp
// src/MyNewApp.Web/Data/UserAccount.cs
public class UserAccount
{
    public int Id { get; set; }
    public string? FlaioSubjectId { get; set; }
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string? FlaioTier { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
}
```

### 3c. DbContext

```csharp
// src/MyNewApp.Web/Data/AppDbContext.cs
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<UserAccount> Users => Set<UserAccount>();
}
```

### 3d. Auth Helpers

```csharp
// src/MyNewApp.Web/Helpers/AuthHelpers.cs
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

public static class AuthHelpers
{
    public static string JwtKey { get; set; } = null!;
    public static string JwtIssuer { get; set; } = null!;

    public static string GenerateJwtToken(UserAccount user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.DisplayName ?? user.Email ?? ""),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: JwtIssuer,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public static int? GetUserId(ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return value != null ? int.Parse(value) : null;
    }
}
```

### 3e. Auth Endpoints

```csharp
// src/MyNewApp.Web/Endpoints/AuthEndpoints.cs
public static class AuthEndpoints
{
    public record FlaioAuthRequest(string AccessToken);
    public record AuthResponse(string Token, string Username);

    public static void Map(WebApplication app)
    {
        app.MapPost("/api/auth/flaio", async (
            FlaioAuthRequest request,
            IHttpClientFactory httpClientFactory,
            AppDbContext db) =>
        {
            // Validate the Flaio access token against userinfo
            var client = httpClientFactory.CreateClient("FlaioAuth");
            using var httpRequest = new HttpRequestMessage(HttpMethod.Get, "/connect/userinfo");
            httpRequest.Headers.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", request.AccessToken);

            var response = await client.SendAsync(httpRequest);
            if (!response.IsSuccessStatusCode)
                return Results.Unauthorized();

            var json = await response.Content.ReadAsStringAsync();
            var claims = System.Text.Json.JsonDocument.Parse(json).RootElement;

            var sub = claims.TryGetProperty("sub", out var s) ? s.GetString() : null;
            var email = claims.TryGetProperty("email", out var e) ? e.GetString() : null;
            var name = claims.TryGetProperty("name", out var n) ? n.GetString() : null;
            var tier = claims.TryGetProperty("flaio:app_tier", out var t) ? t.GetString() : null;

            if (sub == null) return Results.Unauthorized();

            // Find or create local user
            var user = await db.Users.FirstOrDefaultAsync(u => u.FlaioSubjectId == sub);
            if (user == null)
            {
                user = new UserAccount
                {
                    FlaioSubjectId = sub,
                    Email = email,
                    DisplayName = name,
                    FlaioTier = tier,
                };
                db.Users.Add(user);
            }
            else
            {
                user.Email = email;
                user.DisplayName = name;
                user.FlaioTier = tier;
                user.LastLoginAt = DateTime.UtcNow;
            }
            await db.SaveChangesAsync();

            var token = AuthHelpers.GenerateJwtToken(user);
            return Results.Ok(new AuthResponse(token, user.DisplayName ?? sub));
        });

        app.MapGet("/api/auth/me", async (ClaimsPrincipal principal, AppDbContext db) =>
        {
            var userId = AuthHelpers.GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var user = await db.Users.FindAsync(userId);
            return user == null ? Results.NotFound() : Results.Ok(new
            {
                user.Id, user.Email, user.DisplayName, user.FlaioTier
            });
        }).RequireAuthorization();
    }
}
```

### 3f. Program.cs

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Port — pick a unique port for your app
builder.WebHost.UseUrls("http://0.0.0.0:5060");

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=myapp.db"));

// JWT auth
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? "MyNewApp_DevKey_ChangeInProduction_MinLength32Chars!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "MyNewApp";
var keyBytes = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = false,
            ValidateLifetime = false,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes)
        };
    });
builder.Services.AddAuthorization();

// Flaio auth HTTP client
builder.Services.AddHttpClient("FlaioAuth", client =>
{
    client.BaseAddress = new Uri("https://auth.flaio.com");
});

AuthHelpers.JwtKey = jwtKey;
AuthHelpers.JwtIssuer = jwtIssuer;

var app = builder.Build();

// Auto-create database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

AuthEndpoints.Map(app);

// SPA fallback
app.MapFallbackToFile("index.html");

app.Run();
```

---

## 4. Frontend Auth (JavaScript)

Create `wwwroot/js/auth.js`:

```javascript
const AUTH_URL = 'https://auth.flaio.com';
const CLIENT_ID = 'my-new-app';   // Must match the ClientId registered in step 2
const SCOPES = 'openid email profile flaio:apps offline_access';
const REDIRECT_URI = window.location.origin + '/auth/callback';

// --- PKCE Helpers ---

function generateRandomString(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

async function generateCodeChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// --- Auth Flow ---

async function startLogin() {
    const state = generateRandomString(32);
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_code_verifier', codeVerifier);
    sessionStorage.setItem('oauth_return_url', window.location.pathname);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: SCOPES,
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });

    window.location.href = `${AUTH_URL}/connect/authorize?${params}`;
}

async function handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const savedState = sessionStorage.getItem('oauth_state');
    const codeVerifier = sessionStorage.getItem('oauth_code_verifier');

    if (!code || state !== savedState) {
        console.error('Invalid OAuth callback');
        window.location.href = '/';
        return;
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(`${AUTH_URL}/connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            code: code,
            redirect_uri: REDIRECT_URI,
            code_verifier: codeVerifier,
        }),
    });

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) {
        console.error('Token exchange failed');
        window.location.href = '/';
        return;
    }

    localStorage.setItem('flaio_access_token', tokens.access_token);
    localStorage.setItem('flaio_refresh_token', tokens.refresh_token);

    // Exchange Flaio token for local app JWT
    const authResponse = await fetch('/api/auth/flaio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: tokens.access_token }),
    });

    const authData = await authResponse.json();
    localStorage.setItem('app_token', authData.token);
    localStorage.setItem('app_user', JSON.stringify(authData));

    // Clean up and redirect
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('oauth_code_verifier');

    const returnUrl = sessionStorage.getItem('oauth_return_url') || '/';
    sessionStorage.removeItem('oauth_return_url');
    window.location.href = returnUrl;
}

function logout() {
    const idToken = localStorage.getItem('flaio_id_token');
    localStorage.removeItem('flaio_access_token');
    localStorage.removeItem('flaio_refresh_token');
    localStorage.removeItem('flaio_id_token');
    localStorage.removeItem('app_token');
    localStorage.removeItem('app_user');

    const params = new URLSearchParams({
        post_logout_redirect_uri: window.location.origin + '/',
    });
    if (idToken) params.set('id_token_hint', idToken);

    window.location.href = `${AUTH_URL}/connect/logout?${params}`;
}

function isLoggedIn() {
    return !!localStorage.getItem('app_token');
}

function getToken() {
    return localStorage.getItem('app_token');
}

// Auto-handle callback if on /auth/callback
if (window.location.pathname === '/auth/callback') {
    handleCallback();
}
```

Use it from your HTML:

```html
<script src="/js/auth.js"></script>
<button onclick="startLogin()">Sign in with FLAIO</button>
<button onclick="logout()">Sign out</button>
```

Make authenticated API calls:

```javascript
fetch('/api/some-endpoint', {
    headers: { 'Authorization': 'Bearer ' + getToken() }
});
```

---

## 5. Create the LXC Container

On the Proxmox host:

```bash
# Create an Ubuntu 24.04 LXC container
pct create <CTID> local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst \
    --hostname my-new-app \
    --memory 6144 \
    --cores 4 \
    --rootfs rpool/data:64 \
    --net0 name=eth0,bridge=vmbr0,ip=dhcp \
    --unprivileged 1 \
    --features nesting=1 \
    --start 1

# Enter the container
pct enter <CTID>

# Install .NET SDK
apt update && apt install -y wget git
wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh
chmod +x dotnet-install.sh
./dotnet-install.sh --channel 9.0
echo 'export DOTNET_ROOT=$HOME/.dotnet' >> ~/.bashrc
echo 'export PATH=$PATH:$DOTNET_ROOT:$DOTNET_ROOT/tools' >> ~/.bashrc
source ~/.bashrc

# Clone the repo
mkdir -p /root/myapp
git clone https://github.com/danielgigs17/my-new-app.git /root/myapp
```

---

## 6. Systemd Service Files

Create three service files in your repo at `scripts/systemd/`:

### App Service: `myapp-api.service`

```ini
[Unit]
Description=My New App API Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/myapp/src/MyNewApp.Web
ExecStart=/usr/bin/dotnet run --configuration Release --urls "http://0.0.0.0:5060"
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=myapp-api
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false
StandardOutput=journal
StandardError=journal
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### Auto-Deploy Service: `myapp-auto-deploy.service`

```ini
[Unit]
Description=My New App Auto-Deploy Watcher
After=network.target myapp-api.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/myapp
ExecStart=/root/myapp/scripts/auto-deploy.sh
Restart=always
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### Cloudflare Tunnel Service: `cloudflared-myapp.service`

```ini
[Unit]
Description=Cloudflare Tunnel for My New App
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/cloudflared tunnel --config /root/.cloudflared/config.yml run myapp-tunnel
Restart=always
RestartSec=5
KillSignal=SIGTERM
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cloudflared-myapp

[Install]
WantedBy=multi-user.target
```

---

## 7. Auto-Deploy Script

Create `scripts/auto-deploy.sh`:

```bash
#!/bin/bash
set -euo pipefail

REPO_PATH="/root/myapp"
BRANCH="main"
POLL_INTERVAL=10
SERVICE_NAME="myapp-api"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')]${NC} $1"; }
err() { echo -e "${RED}[$(date '+%H:%M:%S')]${NC} $1"; }

cd "$REPO_PATH"

log "Watching $BRANCH for changes (every ${POLL_INTERVAL}s)..."

while true; do
    sleep "$POLL_INTERVAL"

    git fetch origin "$BRANCH" --quiet 2>/dev/null || continue

    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse "origin/$BRANCH")

    if [ "$LOCAL" = "$REMOTE" ]; then
        continue
    fi

    COMMIT_MSG=$(git log --format='%h %s' "$LOCAL..$REMOTE" | head -1)
    log "New commit: ${COMMIT_MSG}"

    # Pull changes
    git reset --hard "origin/$BRANCH" --quiet
    git clean -fd --quiet
    log "Pulled: $COMMIT_MSG"

    # Build
    if dotnet build src/MyNewApp.Web -c Release -q --nologo 2>&1 | tail -3; then
        # Restart service
        systemctl restart "$SERVICE_NAME"
        log "Deployed in $(echo "scale=0; $SECONDS" | bc)s"
    else
        err "Build failed — skipping deploy"
    fi
done
```

```bash
chmod +x scripts/auto-deploy.sh
```

---

## 8. Cloudflare Tunnel Setup

### 8a. Install cloudflared

```bash
# On the LXC container
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
    -o cloudflared.deb
dpkg -i cloudflared.deb
```

### 8b. Authenticate and Create Tunnel

```bash
cloudflared tunnel login
# This opens a browser — authorize with your Cloudflare account

cloudflared tunnel create myapp-tunnel
# Note the tunnel ID printed (e.g. abc123-def456-...)
```

### 8c. Configure the Tunnel

Create `/root/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL-ID>
credentials-file: /root/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: myapp.flaio.com
    service: http://localhost:5060
  - service: http_status:404
```

### 8d. Create DNS Record

```bash
cloudflared tunnel route dns myapp-tunnel myapp.flaio.com
```

### 8e. Install and Start Services

```bash
# Copy service files to systemd
cp scripts/systemd/*.service /etc/systemd/system/
systemctl daemon-reload

# Enable and start everything
systemctl enable --now myapp-api
systemctl enable --now myapp-auto-deploy
systemctl enable --now cloudflared-myapp

# Verify
systemctl status myapp-api
systemctl status cloudflared-myapp
curl -s http://localhost:5060/  # Should return your app
```

---

## 9. Verify Everything Works

```bash
# 1. Check the app is running
curl http://localhost:5060/

# 2. Check auth server knows about your app
curl https://auth.flaio.com/.well-known/openid-configuration

# 3. Test the full auth flow in a browser
#    - Visit https://myapp.flaio.com
#    - Click "Sign in with FLAIO"
#    - Should redirect to auth.flaio.com, then back with a token

# 4. Check auto-deploy is watching
journalctl -u myapp-auto-deploy -f

# 5. Push a change and watch it deploy
git commit --allow-empty -m "Test auto-deploy"
git push
# Watch the journal — should see "New commit" and "Deployed" within ~15s

# 6. Check the tunnel
journalctl -u cloudflared-myapp --no-pager -n 20
```

---

## Quick Reference

| Thing | Value |
|-------|-------|
| Auth server | `https://auth.flaio.com` |
| OIDC discovery | `https://auth.flaio.com/.well-known/openid-configuration` |
| Authorize endpoint | `https://auth.flaio.com/connect/authorize` |
| Token endpoint | `https://auth.flaio.com/connect/token` |
| Userinfo endpoint | `https://auth.flaio.com/connect/userinfo` |
| Required scopes | `openid email profile flaio:apps offline_access` |
| PKCE | Required (`code_challenge_method=S256`) |
| Grant type | `authorization_code` + `refresh_token` |
| Admin panel | `https://auth.flaio.com/admin.html` |
