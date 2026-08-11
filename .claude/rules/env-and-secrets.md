---
paths:
  - ".env*"
  - ".gitignore"
  - "src/add-os/config/**"
  - "src/main.ts"
---

# Env and secrets

- **`.gitignore` must contain `.env`, `.env.*`, and `!.env.example`** — asserted as
  patterns by `no-secrets.spec.ts`, because trusting a bare `.env` line is exactly what let
  a key through. A bare `.env` does not match `.env.production`; that gap, not the key, was
  the original defect.
- Committed env files declare secret-shaped keys with **empty** values. `.env.example` is
  the sole committed template. **`.env.sample` must never reappear** — two files claiming
  one job is how one goes stale, and the guard asserts its absence.
- **`VITE_API_URL` has no default, ever.** Production build unset → `assertEnv()` throws; a
  misconfigured deployment must not start. Development unset → loud warning, app continues.
  `apiUrl()` throws at the call site either way, so the first request written cannot inherit
  a default. An unset base that silently resolves to someone else's host is an exfiltration
  path, not a typo. Tighten to an unconditional throw once the API layer lands.
- **No external hosts.** `no-external-urls.spec.ts` guards this; allowlist entries carry
  `removedBy` notes so they can't be forgotten. The network is isolated.
- **Never quote a credential fragment**, not even partially, not even while removing it.
- `no-secrets.spec.ts` skips generated files and *only* generated files:
  `icons.generated.json` holds SVG path geometry, credential-shaped by construction. A
  credential cannot originate in a generated file, and its source is scanned.
- The allowlist starts empty and every entry requires a justification.

Background: `docs/SECRETS-RESOLUTION.md`. The MapTiler keys found here arrived **with the
Pinx template** — the vendor's credentials, not ADD's, so they were deleted rather than
rotated. ADD has no account to revoke them from.
