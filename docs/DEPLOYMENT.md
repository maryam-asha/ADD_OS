# Deploying the ADD OS dashboard

Decided 2026-10-13. Read alongside `docs/SECRETS-RESOLUTION.md` (env posture) and
`src/add-os/__tests__/no-external-urls.spec.ts` (what may appear in the build).

## Topology

| Host | What | Exposure |
|---|---|---|
| `os.add-sy.com` | ADDCore (Laravel) API | Public — the member app calls it from outside |
| `core.add-sy.com` | This dashboard (static `dist/`) | Public — provider accounts log in from their own companies |

`/api/v1/admin/*` on `os.add-sy.com` is the one path held to office/VPN IPs.

### Why not fully isolated

This project was designed as VPN-only, because the dashboard drives smart-door
access, wallets and memberships. That stopped being possible for the whole
system: the member app needs the API from the internet, and providers need the
dashboard from theirs.

**What was given up:** network isolation for the API host and the dashboard.
**What replaces it for staff operations:** nginx admits only office/VPN IPs to
`/api/v1/admin/*`. A staff account logged in from outside sees the dashboard
shell, but every admin call is refused at the proxy before it reaches Laravel —
the backend's own role checks stay the boundary behind that.

`/login`, `/logout`, `/sanctum/csrf-cookie`, `/api/v1/auth/*` and
`/api/v1/provider/*` stay public, because providers use them.

### Why `core` and not `admin.os`

The first choice was `admin.os.add-sy.com`, so the session cookie could be scoped
to `.os.add-sy.com`. A sub-subdomain was not available, so the dashboard sits
beside the API instead. The cost: the session cookie must be scoped to
`.add-sy.com`, so it is sent to every `*.add-sy.com` host (including the public
site). Mitigated by a distinct cookie name and `HttpOnly` — see below.

## Auth: why the domains matter

The dashboard uses Sanctum SPA cookie auth: it calls `/sanctum/csrf-cookie`, reads
`XSRF-TOKEN` from `document.cookie`, and echoes it as `X-XSRF-TOKEN`
(`src/add-os/services/api.ts`). The dashboard can only read that cookie when it is
scoped to a domain both hosts share. Two unrelated domains would 419 every write.

## Backend (`os.add-sy.com`)

`.env`:

```
APP_URL=https://os.add-sy.com
SESSION_DOMAIN=.add-sy.com
SANCTUM_STATEFUL_DOMAINS=core.add-sy.com
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
SESSION_HTTP_ONLY=true
SESSION_COOKIE=addos_session
```

- `SESSION_COOKIE` is renamed so another Laravel app on `*.add-sy.com` cannot
  collide with `laravel_session`. If any other app sets `XSRF-TOKEN` on
  `.add-sy.com`, writes here will fail with intermittent 419s — keep other apps'
  `SESSION_DOMAIN` host-only.

`config/cors.php`:

```php
'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout'],
'allowed_origins' => ['https://core.add-sy.com'],
'supports_credentials' => true,
```

Then `php artisan config:clear && php artisan config:cache`.

nginx — restrict the admin API only:

```nginx
location /api/v1/admin/ {
    allow <office IP>;
    allow <VPN range>;
    deny all;
    # …same proxy/fastcgi block as the rest of the API
}
```

## Dashboard (`core.add-sy.com`)

`VITE_API_URL` is **baked in at build time**, not read at runtime. Pass it on the
build machine (never commit an env file — invariant 6):

```
pnpm install --frozen-lockfile
pnpm test:unit
VITE_API_URL=https://os.add-sy.com pnpm build
pnpm exec vitest run src/add-os/__tests__/no-external-urls.spec.ts   # dist pass
```

Upload `dist/`. nginx:

```nginx
server {
    server_name core.add-sy.com;
    root /var/www/addos/dist;
    location / { try_files $uri $uri/ /index.html; }
}
```

The `/storage` proxy in `vite.config.ts` is dev-only; in production images load
from `os.add-sy.com` directly through `VITE_API_URL`.

## Verifying a deployment

1. Open `https://core.add-sy.com/login`. DevTools → Application → Cookies: after
   the page loads, `XSRF-TOKEN` must show domain `.add-sy.com`. If it shows
   `os.add-sy.com` with no leading dot, the config cache is stale.
2. Log in and perform one write (any POST). A 419 means the cookie domain or
   `SANCTUM_STATEFUL_DOMAINS` is wrong.
3. From outside the office/VPN, an admin screen's requests must return 403 from
   nginx; a provider account must work normally.
4. A CORS error on `/login` with an old session: clear cookies first — a stale
   session makes `/login` redirect, which surfaces as CORS. Backend fix pending.
