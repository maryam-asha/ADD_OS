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
- `timesheet-week-matches-core.spec.ts` — `TIMESHEET_WEEK_STARTS_ON` and
  `TIMESHEET_INCREMENT_HOURS` (`modules/hr/types/timesheets.ts`) equal ADD Core's
  `hr.timesheets.week_starts_on` / `increment_hours`, read from the ADDCore checkout beside
  this repo (app `config/hr.php` first, then the package's). No endpoint exposes them; when
  the copy said Monday and ADD Core Sunday, every timesheet week was refused and every mocked
  spec stayed green (live HR run, 2026-10-21). The comparison is **skipped** where the ADDCore
  checkout is absent; the parser's own checks (other blocks' keys, comments) always run.
- `one-dashboard-door.spec.ts` — `mayUseDashboard` (`src/stores/auth.ts`) is the only rule for
  who may use the dashboard at all; no other file under `src/` judges an account with
  `roles.every(`, and sign-in, session restore and the route guard each call it. Sign-in's
  own copy lacked the employee record and turned away every member who is also an employee.
  Carries a negative control.
- `menu-matches-guard.spec.ts` — for ten kinds of account (admin, operations with and without
  branch permissions, an HR role, a reports-only role, a custom invoices role, an empty custom
  role, an employee with no role, a member who is an employee, a provider): every page the
  sidebar offers passes `authGuard`, "/" (`homePath`) lands on a page it passes (so a refusal
  cannot loop), and `Navbar/items.tsx` lists exactly the sections `navigation/access.ts`
  allows — the modules inside a group entry (HR's, since 2026-10-22) counted as sections —
  less the `accountMenu` ones (My HR), which the avatar menu lists instead; every section the
  account sees is in one or the other. Before, a custom role and an employee with no role were offered every admin page,
  each a 403, and "/" sent them to `/spatial/branches`.
- `theme/__tests__/tokens.spec.ts` — WCAG ratios, ΔE separations, and "guideline p.15 strict
  rule stays disengaged" (Antique Copper in no semantic and no component token).

If one fails, state which invariant broke and what change caused it. **Do not weaken an
assertion to make it pass.** Report and stop.
