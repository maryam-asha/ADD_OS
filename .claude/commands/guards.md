---
description: Run the ADD OS architecture guards and report what each one covers
---

Run the architecture guards and the token invariants:

```
pnpm vitest run src/add-os/__tests__ src/add-os/theme/__tests__
```

Then report, per spec file, pass/fail and what it protects:

- `no-runtime-theming.spec.ts` — 21 assertions. `themeName` pinned to `Light`, absent from
  `persist.pick`, no write path into theme or palette, `colors.dark` mirroring `colors.light`.
  Since 2026-08-30 also asserts `boxed` left `persist.pick` (the LayoutSettings panel was its
  only writer), that `LayoutSettings.vue` stays deleted, and that no colour picker returns to
  any surface that can reach a user — `src/views/**` is excluded there because the unrouted
  Pinx demo `views/Components/ColorPicker.vue` is a picker by subject and can never ship.
- `no-vendor-auth-imports.spec.ts` — nothing outside `src/views/Auth` and `src/components/auth`
  may import from them, and the router points `Login`, `ForgotPassword` and `ResetPassword` at
  `add-os/modules/auth`. Re-linking the vendor login would restore, in one line, a runtime
  panel repaint the theming guard cannot see, untranslated English form strings, and a
  "Remember me" control with no `remember` field in the API collection. Carries a negative
  control so the detector cannot pass by failing to match. Also asserts that
  `/forgot-password` and `/reset-password` carry **no** `checkAuth` — it redirects to "/"
  whenever the store says signed in, which made both unreachable and stranded emailed reset
  tokens — while `/login` keeps it.
- `boot-401-navigation.spec.ts` — boots the app the way `main.ts` does (router installed,
  THEN `initSession()` awaited, THEN mount) at `/forgot-password` with every request 401ing,
  and asserts the caller is still there with the page rendered. `api.ts` answered a 401 with
  an unconditional `router.push("/login")`, which raced the first navigation: neither
  completed, the router stayed at START_LOCATION and `<RouterView>` rendered nothing — a
  blank page, address bar unchanged, no Vue error. Uses `createApp`, not test-utils `mount()`,
  because mount installs plugins in a different order and the bug does not reproduce.
- `no-external-urls.spec.ts` — no host reachable from an isolated network; allowlist entries
  carry `removedBy` notes. `sourceOnly` entries are exempt from the dist-staleness check —
  they could never be in a build — and a second assertion fails if one ever appears there.
- `no-secrets.spec.ts` — committed env files declare secret-shaped keys empty; `.gitignore`
  asserts `.env`, `.env.*`, `!.env.example` as patterns; `.env.sample` absent; allowlist
  entries justified.
- `no-inline-role-checks.spec.ts` — only `config/permissions.ts` may call `isRoleGranted`
  or compare a role against a literal for a destroy decision; scans `src/add-os/modules/**`
  so a reimplemented inline check fails loudly instead of quietly drifting from the
  collection-sourced role map.
- `no-direct-company-http.spec.ts` — only `services/companies.ts`,
  `services/private-office-requests.ts`, and `services/company-members.ts` may reference
  the `/admin/companies` or `/admin/private-office-requests` HTTP paths; every other file
  under `src/add-os` must go through them.
- `theme/__tests__/tokens.spec.ts` — WCAG ratios, ΔE separations, and "guideline p.15 strict
  rule stays disengaged" (Antique Copper in no semantic and no component token).

If one fails, state which invariant broke and what change caused it. **Do not weaken an
assertion to make it pass.** Report and stop.
