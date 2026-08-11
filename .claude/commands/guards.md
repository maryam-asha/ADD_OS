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
- `theme/__tests__/tokens.spec.ts` — WCAG ratios, ΔE separations, and "guideline p.15 strict
  rule stays disengaged" (Antique Copper in no semantic and no component token).

If one fails, state which invariant broke and what change caused it. **Do not weaken an
assertion to make it pass.** Report and stop.
