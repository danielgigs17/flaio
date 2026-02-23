# FLAIO Migration Plan

> Consolidating all FLAIO services under `flaio.com` with proper subdomain routing.

## Current State

| Service | Current URL | Hosting | Stack |
|---------|------------|---------|-------|
| FLAIO Hub (this site) | localhost (not deployed) | — | Next.js 16, Vercel/WHB |
| FLAIO Atelier | `flaio.com/` | Shopify Hydrogen | Hydrogen + Oxygen |
| Video Poker | `poker.clystr.com` | Self-hosted (Cloudflare DNS) | Static SPA |
| Lector | `lector.clystr.com` | Self-hosted (Cloudflare DNS) | Web app |
| Freebet Blackjack | Not yet deployed | — | TBD |
| FLAIO Auth | Not yet deployed | — | OAuth service |

## Target State

| Service | Target URL | Hosting |
|---------|-----------|---------|
| FLAIO Hub | `flaio.com` | WebHostingBuzz |
| FLAIO Atelier | `atelier.flaio.com` | Shopify Hydrogen (Oxygen) |
| Video Poker | `poker.flaio.com` | Self-hosted (existing server) |
| Lector | `lector.flaio.com` | Self-hosted (existing server) |
| Freebet Blackjack | `blackjack.flaio.com` | WebHostingBuzz or self-hosted |
| FLAIO Auth | `auth.flaio.com` | WebHostingBuzz or self-hosted |

---

## Phase 1: DNS & Infrastructure Setup

### Manual Steps

- [ ] **Log into your domain registrar** for `flaio.com` and confirm you have full DNS control
- [ ] **Decide DNS management**: If flaio.com DNS is currently managed by Shopify, you'll need to move it to Cloudflare or your registrar to manage subdomains. If it's already on Cloudflare or your registrar, you're good.
- [ ] **Set up WebHostingBuzz hosting**:
  - Log into WHB control panel
  - Create a new hosting account/site for `flaio.com`
  - Note the server IP address and any nameservers provided
  - Set up SSL certificate (Let's Encrypt or WHB-provided)
- [ ] **Verify your self-hosted servers** (the ones currently running poker.clystr.com and lector.clystr.com) are accessible and stable

### Automated / Scriptable

- [ ] Add DNS A record: `flaio.com` → WebHostingBuzz server IP
- [ ] Add DNS A record: `www.flaio.com` → WebHostingBuzz server IP (or CNAME to flaio.com)
- [ ] Add DNS CNAME: `atelier.flaio.com` → Shopify Hydrogen endpoint
- [ ] Add DNS A record: `poker.flaio.com` → your self-hosted server IP (same as poker.clystr.com)
- [ ] Add DNS A record: `lector.flaio.com` → your self-hosted server IP (same as lector.clystr.com)
- [ ] Add DNS A/CNAME: `auth.flaio.com` → wherever auth service will run
- [ ] Add DNS A/CNAME: `blackjack.flaio.com` → wherever blackjack will run

---

## Phase 2: Move Shopify Hydrogen Store (`flaio.com` → `atelier.flaio.com`)

### Manual Steps

- [ ] **In Shopify Admin** (`flaio.myshopify.com/admin`):
  - Go to Settings → Domains
  - Add `atelier.flaio.com` as a new custom domain
  - Verify the domain (Shopify will provide a CNAME or A record to set)
  - Once verified, set `atelier.flaio.com` as the primary domain
  - Remove `flaio.com` as the primary domain (Shopify will stop handling root domain traffic)
- [ ] **In your Hydrogen storefront** (if using Oxygen):
  - Update the storefront URL/config to use `atelier.flaio.com`
  - Redeploy the Hydrogen app if needed
- [ ] **Update any hardcoded references** in the Hydrogen store that point to `flaio.com` (update to `atelier.flaio.com`)
- [ ] **Set up 301 redirects** from `flaio.com/atelier/*` paths to `atelier.flaio.com/*` (can be done on WHB or via Next.js rewrites)

### Automated / Scriptable

```bash
# In the FLAIO Hub Next.js app, add redirect rules in next.config.ts:
# This ensures old URLs redirect properly
```

```typescript
// next.config.ts - add redirects
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/atelier/:path*',
        destination: 'https://atelier.flaio.com/:path*',
        permanent: true,
      },
    ]
  },
}
```

### Risks & Rollback

- Shopify may take up to 48 hours to fully propagate the domain change
- Keep `flaio.com` configured in Shopify as a secondary domain temporarily until DNS propagates
- If something breaks, re-add `flaio.com` as primary in Shopify Admin

---

## Phase 3: Deploy FLAIO Hub to `flaio.com` on WebHostingBuzz

### Manual Steps

- [ ] **Determine WHB Node.js support**: Check if your WebHostingBuzz plan supports Node.js apps (for Next.js SSR). If not, you'll need to:
  - Option A: Export as static site (`next build && next export`) — works if you don't need SSR
  - Option B: Use a VPS/dedicated plan on WHB that supports Node.js
  - Option C: Deploy to Vercel/Netlify instead and point `flaio.com` there via DNS
- [ ] **If WHB supports Node.js**:
  - Upload the built Next.js app via SFTP or Git deploy
  - Configure Node.js version (18+ required for Next.js 16)
  - Set up PM2 or similar process manager
  - Configure reverse proxy (Apache/Nginx) to forward to the Node.js port
- [ ] **If using static export**:
  - Run `npm run build` locally
  - Upload the `out/` directory to WHB via SFTP
  - Configure `.htaccess` for SPA routing (if Apache)
- [ ] **Set up SSL** on WHB for `flaio.com`

### Automated / Scriptable

```bash
# Build the Next.js app
npm run build

# If static export is needed, add to package.json:
# "scripts": { "export": "next build" }
# Then configure next.config.ts with output: 'export'

# Deploy via SFTP (example with rsync over SSH)
rsync -avz --delete ./out/ user@whb-server:/path/to/public_html/
```

---

## Phase 4: Migrate Poker & Lector to `flaio.com` Subdomains

### Manual Steps

- [ ] **On your self-hosted servers**, update the web server config (Nginx/Apache/Caddy) to accept the new subdomain:
  - Add `poker.flaio.com` as a server_name/virtual host alongside `poker.clystr.com`
  - Add `lector.flaio.com` as a server_name/virtual host alongside `lector.clystr.com`
- [ ] **Set up SSL certificates** for the new subdomains:
  - If using Cloudflare proxy: Cloudflare provides SSL automatically
  - If using direct DNS (not proxied): Use Let's Encrypt / certbot for `poker.flaio.com` and `lector.flaio.com`
- [ ] **Update any hardcoded URLs** in the poker and lector apps that reference `clystr.com`
- [ ] **Keep old `clystr.com` domains active** during transition with 301 redirects to the new `flaio.com` subdomains

### Automated / Scriptable

```nginx
# Nginx config addition for poker (add to existing server block or create new)
server {
    listen 443 ssl;
    server_name poker.flaio.com poker.clystr.com;

    # SSL cert paths (update these)
    ssl_certificate /etc/letsencrypt/live/poker.flaio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/poker.flaio.com/privkey.pem;

    # Redirect old domain to new
    if ($host = poker.clystr.com) {
        return 301 https://poker.flaio.com$request_uri;
    }

    # ... existing location blocks ...
}

# Repeat for lector.flaio.com / lector.clystr.com
```

```bash
# Generate SSL certs with certbot
sudo certbot certonly --nginx -d poker.flaio.com -d lector.flaio.com

# Or if using Cloudflare DNS validation:
sudo certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d poker.flaio.com -d lector.flaio.com
```

### Cloudflare DNS Migration

If you want to keep using Cloudflare for the flaio.com subdomains pointing to your self-hosted servers:

- [ ] **Add `flaio.com` to Cloudflare** (if not already there)
- [ ] Add A records for `poker.flaio.com` and `lector.flaio.com` pointing to your server IP
- [ ] Enable Cloudflare proxy (orange cloud) for DDoS protection and SSL
- [ ] Update Cloudflare page rules / redirect rules for the old `clystr.com` domains

---

## Phase 5: Deploy FLAIO Auth (`auth.flaio.com`)

### Manual Steps

- [ ] **Choose hosting for the OAuth service**:
  - Option A: Run on your self-hosted servers (same as poker/lector)
  - Option B: Deploy to WHB if it supports the runtime
  - Option C: Deploy to a cloud provider (Railway, Fly.io, etc.)
- [ ] **Set up the OAuth service** with providers you want to support (Google, GitHub, etc.)
- [ ] **Configure OAuth redirect URLs** for all FLAIO apps:
  - `https://flaio.com/auth/callback`
  - `https://poker.flaio.com/auth/callback`
  - `https://lector.flaio.com/auth/callback`
  - `https://atelier.flaio.com/auth/callback`
  - `https://blackjack.flaio.com/auth/callback`
- [ ] **Register OAuth apps** with each provider (Google Cloud Console, GitHub Developer Settings, etc.)
- [ ] **Set up shared session/token storage** (Redis, PostgreSQL, or JWT-based)
- [ ] **Update all FLAIO apps** to use `auth.flaio.com` for authentication

### Automated / Scriptable

```bash
# DNS record
# A/CNAME auth.flaio.com → server IP or service URL

# SSL certificate
sudo certbot certonly --nginx -d auth.flaio.com

# Environment variables needed for the auth service:
# OAUTH_GOOGLE_CLIENT_ID=xxx
# OAUTH_GOOGLE_CLIENT_SECRET=xxx
# OAUTH_GITHUB_CLIENT_ID=xxx
# OAUTH_GITHUB_CLIENT_SECRET=xxx
# SESSION_SECRET=xxx
# DATABASE_URL=xxx
# ALLOWED_ORIGINS=https://flaio.com,https://poker.flaio.com,https://lector.flaio.com,https://atelier.flaio.com
```

---

## Phase 6: Deploy Freebet Blackjack (`blackjack.flaio.com`)

### Manual Steps

- [ ] **Build the Freebet Blackjack app** (leprechaun theme)
- [ ] **Choose hosting**: WHB static hosting, self-hosted, or a platform like Vercel
- [ ] **Deploy and configure DNS** for `blackjack.flaio.com`
- [ ] **Integrate with FLAIO Auth** for user accounts and session persistence

### Automated / Scriptable

```bash
# DNS record
# A/CNAME blackjack.flaio.com → hosting IP

# SSL certificate (if self-hosted)
sudo certbot certonly --nginx -d blackjack.flaio.com
```

---

## Phase 7: Update All Internal References

### Automated / Scriptable

These changes can be made in code:

```bash
# In the FLAIO Hub (this repo), update projects.ts links:
# poker.clystr.com → poker.flaio.com
# lector.clystr.com → lector.flaio.com
# flaio.com/atelier → atelier.flaio.com
```

Already done in `src/data/projects.ts` — all links point to the new `flaio.com` subdomains.

### Manual Steps

- [ ] Update any external links (social media bios, app store listings, etc.)
- [ ] Update Google Search Console for new URLs
- [ ] Submit updated sitemaps
- [ ] Update any OAuth redirect URLs registered with third-party providers
- [ ] Update any API keys that are domain-restricted

---

## Migration Order (Recommended)

Execute in this order to minimize downtime:

1. **DNS setup** (Phase 1) — add all records, low risk
2. **Deploy FLAIO Hub** (Phase 3) — get the new site live at `flaio.com`
3. **Migrate Shopify** (Phase 2) — move store to `atelier.flaio.com`
4. **Migrate Poker & Lector** (Phase 4) — point subdomains to existing servers
5. **Deploy Auth** (Phase 5) — new service, no migration needed
6. **Deploy Blackjack** (Phase 6) — new app, no migration needed
7. **Update references** (Phase 7) — cleanup pass

---

## Summary: Manual vs. Automated

### Must Be Done Manually

| Task | Reason |
|------|--------|
| Log into domain registrar and configure DNS | Requires account authentication |
| Configure WHB hosting account | Requires WHB control panel access |
| Update Shopify domain settings | Requires Shopify admin access |
| Register OAuth apps with providers | Requires provider console access |
| Update web server configs on self-hosted servers | Requires SSH access to servers |
| Set up SSL certificates on self-hosted servers | Requires server access |
| Update external links (social, app stores) | Requires platform-specific access |
| Verify Cloudflare settings for flaio.com | Requires Cloudflare dashboard access |
| Test all services after migration | Requires manual QA |

### Can Be Automated / Scripted

| Task | Method |
|------|--------|
| Build and deploy FLAIO Hub | `npm run build` + rsync/SFTP script |
| DNS record creation (if using Cloudflare API) | Cloudflare API / Terraform |
| SSL certificate generation | certbot CLI |
| Nginx config updates | Config templates + ansible/scripts |
| 301 redirects from old domains | Nginx config or Next.js redirects |
| Update internal app references | Already done in codebase |
| CI/CD pipeline setup | GitHub Actions workflow |

---

## Monitoring & Rollback

After each phase:

- [ ] Verify the service is accessible at the new URL
- [ ] Check SSL certificate is valid (use `curl -vI https://subdomain.flaio.com`)
- [ ] Verify old URLs redirect properly (301, not 404)
- [ ] Monitor error rates for 24-48 hours before proceeding to next phase
- [ ] Keep old DNS records / configs for at least 2 weeks as rollback option
