# Company Pipeline — verification report

Covers `docs/superpowers/plans/2026-08-18-company-pipeline.md`, Task 18 (full
verification pass). Tasks 1–17 were already implemented and committed on
`worktree-company-pipeline` before this pass; this report closes out the plan.

## What was verified

| Check | Command | Result |
|---|---|---|
| Full unit/integration suite | `npx vitest run` | ✅ 49 files, 425 passed, 5 skipped, 0 failed — includes all 5 architecture guards and the bilingual (`ar`/`en`) invariant |
| Typecheck | `npx vue-tsc --build --force` | ✅ clean, no errors anywhere in the repo |
| Lint | `npx eslint --fix src/add-os` | ✅ clean; autofix produced no diff |
| Scope | `git diff main --stat` | ✅ every changed path is under `src/add-os/**` (plus the plan doc under `docs/`) — no vendor `src/**`, no `_pinx-vendor/**` |
| Real-browser boot smoke test | Vite dev server + headless Chromium (Playwright) | ✅ app boots with zero console/page errors; `/members/companies` and `/address/private-office-requests` both correctly redirect an unauthenticated session to `/login` rather than crashing — confirms the new lazy-loaded routes resolve correctly outside Vitest's mocked environment |

One additional fix was found and committed during this pass, outside the
plan's original task list: `PrivateOfficeRequestsPage.vue`'s `openQuote()`
didn't reset the quote form's validation state, so a prior failed "mark as
quoted" submission could leave a stale validation error visible when the
modal was reopened for a different row. Fixed to mirror `openCreate()`'s
existing reset-on-open pattern (commit `52feda7`).

## What was NOT verified — and why

**Live CRUD walkthrough against a running ADDCore backend was not performed
in this session.** This repeats the plan's own Step 5 (create request → quote
→ create company → quick-add member → toggle door access/admin → remove
member) but requires a locally running backend, which requires writing
ADDCore's `.env`. This session's permission settings hard-block both reading
and writing any `.env` file (confirmed: both a `Read`/`Write` attempt and a
`Bash` command that merely referenced `.env` in its argument list were
denied) — almost certainly the same guardrail behind this repo's own
invariant *"Never commit a `.env` file, and never quote a credential fragment
anywhere."* This isn't a judgment call to route around.

Note for whoever runs this manually: ADDCore's backend routes and migrations
for all three resources already exist
(`routes/api/v1/admin.php:103-118`, migrations dated `2026_08_08_1000{00-03}`
and `2026_08_08_110001`), so the live walkthrough is mechanically identical
to the one already completed for Auth/Users/Roles in
`docs/add-os/auth-verification-report.md` — same `php artisan serve` +
seeded-admin setup, same `127.0.0.1` (not `localhost`) requirement to avoid
the Sanctum `SameSite` cookie issue documented there.

This mirrors the Users/Roles feature, which also merged with live-backend QA
noted as outstanding rather than blocking the merge.

## Postman-collection fidelity (carried over from the plan, unchanged)

- **What was extracted literally vs. any difference found:** none — the
  brief's own contract table matched `ADD-OS.postman_collection.json` exactly,
  including both "silent" deletes (Private Office Request, Company Member)
  turning out to exist in the collection.
- **What the collection was silent on, and was not guessed:** the exact JSON
  shape of every response — the collection ships zero response examples for
  any of the nine endpoints. Specifically flagged: `CompanyMember` carries no
  confirmed `name`/`phone` (the members table renders `user_id` directly, per
  `types/company-member.ts`'s doc comment), and `Company` carries no confirmed
  member count.
- **What was deferred:** none of the nine endpoints were skipped. Pagination
  UI is out of scope per the brief (list calls use the existing flat-array
  `.list()` convention, not `listPage()`). No role-gating was added — none
  was specified for this pipeline, unlike the seven spatial tables' delete
  gate.

## Scope confirmation

`git diff main --stat` (37 files changed, all under `src/add-os/**` or
`docs/`): 3 new service files + specs, 3 new type files, 1 new architecture
guard, 2 new pages + config + specs, 2 new components + specs, 2 new
composables + specs, i18n additions to both `ar.json`/`en.json`, and the
`routes.ts`/`sections.ts` registration the plan explicitly permits outside
`add-os/modules/**` proper (both still inside `src/add-os/**`).
