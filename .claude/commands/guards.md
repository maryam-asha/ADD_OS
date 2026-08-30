---
description: Run the ADD OS architecture guards and report what each one covers
---

Run the architecture guards and the token invariants:

```
pnpm vitest run src/add-os/__tests__ src/add-os/theme/__tests__
```

Then report, per spec file, pass/fail and what it protects:

- `no-runtime-theming.spec.ts` — 18 assertions. `themeName` pinned to `Light`, absent from
  `persist.pick`, no write path into theme or palette, `colors.dark` mirroring `colors.light`.
- `no-external-urls.spec.ts` — no host reachable from an isolated network; allowlist entries
  carry `removedBy` notes.
- `no-secrets.spec.ts` — committed env files declare secret-shaped keys empty; `.gitignore`
  asserts `.env`, `.env.*`, `!.env.example` as patterns; `.env.sample` absent; allowlist
  entries justified.
- `no-inline-role-checks.spec.ts` — guards two gating mechanisms that coexist during the
  in-progress role -> permission migration: only `config/permissions.ts` may call
  `isRoleGranted` or compare a role against a literal for a destroy decision, and likewise
  only `config/permissions.ts` may call `hasPermission` or compare a `permission`/
  `permissions` variable against a permission-string literal; scans `src/add-os/modules/**`
  so a reimplemented inline check (role- or permission-based) fails loudly instead of
  quietly drifting from the single source of truth.
- `no-direct-company-http.spec.ts` — only `services/companies.ts`,
  `services/private-office-requests.ts`, and `services/company-members.ts` may reference
  the `/admin/companies` or `/admin/private-office-requests` HTTP paths; every other file
  under `src/add-os` must go through them.
- `theme/__tests__/tokens.spec.ts` — WCAG ratios, ΔE separations, and "guideline p.15 strict
  rule stays disengaged" (Antique Copper in no semantic and no component token).

If one fails, state which invariant broke and what change caused it. **Do not weaken an
assertion to make it pass.** Report and stop.
