# Command baseline verification — 2026-08-23

Run immediately after correcting `CLAUDE.md`'s Commands section against
`package.json` (the ⚠️ note there had never been checked: `pnpm test` and
`pnpm typecheck` do not exist). This is the first baseline run against the
corrected commands: `pnpm install`, `pnpm test:unit`, `pnpm type-check`,
`pnpm lint`. **Nothing found here was fixed** — this is a snapshot, not a
cleanup.

## Summary

| Check | Command | Result |
|---|---|---|
| Install | `pnpm install` | ✅ pass (1 warning) |
| Unit tests (isolated re-run) | `pnpm test:unit` | ✅ 56 files / 463 passed, 5 skipped, 0 failed |
| — of which, the 5 architecture guards + token invariants | `pnpm vitest run src/add-os/__tests__ src/add-os/theme/__tests__` | ✅ 6 files / 125 passed, 5 skipped, 0 failed |
| Type-check | `pnpm type-check` | ✅ pass, 0 errors |
| Lint (check-only, not `--fix`) | `pnpm exec eslint .` | ❌ 223 problems (218 errors, 5 warnings) — **all outside `src/add-os/**`** |

## Install

```
[WARN] Unsupported engine: wanted: {"node":">=24.15.0"} (current: {"node":"v24.11.0","pnpm":"11.13.1"})
Already up to date
Done in 2.5s using pnpm v11.13.1
```

Exit 0. The engine warning is pre-existing environment drift (local Node is one
minor version behind what `package.json` declares); not something this pass
changed or fixed.

## Unit tests

**First attempt** (`pnpm test:unit` run concurrently with `type-check` and
`lint` in this session, to save wall-clock time) exited 1 with 3 "Unhandled
Error" entries — all `[vitest-pool-runner]: Timeout waiting for worker to
respond` while starting forked workers for `CompanyDetailPanel.spec.ts`,
`ResourceTable.spec.ts`, and `AddCompanyMemberDialog.spec.ts` — yet its own
summary reported those same runs as part of "53 passed (53)" test files with
zero listed test failures. That combination (fatal exit code, no failing
test) points at worker-pool contention from running three heavy processes
side-by-side on this machine, not a code or test regression.

**Isolated re-run**, nothing else running:

```
Test Files  56 passed (56)
     Tests  463 passed | 5 skipped (468)
  Duration  178.23s (transform 5.94s, import 270.24s, tests 13.89s, environment 203.16s)
[exited with code 0]
```

Clean pass. Treat the first run's exit code as environmental noise from this
session's own parallel execution, not as a finding.

### The 5 architecture guards + token invariants, isolated

```
pnpm exec vitest run src/add-os/__tests__ src/add-os/theme/__tests__ --reporter=verbose
Test Files  6 passed (6)
     Tests  125 passed | 5 skipped (130)
```

| Spec file | Result | What it protects |
|---|---|---|
| `no-runtime-theming.spec.ts` | ✅ pass | `themeName` pinned to `Light`, absent from `persist.pick`, no write path into theme or palette, `colors.dark` mirrors `colors.light`. |
| `no-external-urls.spec.ts` | ✅ pass (4 skipped) | No host reachable from an isolated network; allowlist entries carry `removedBy` notes. The 4 skips are the "emitted artifacts" sub-suite, which needs `dist/` — see below. |
| `no-secrets.spec.ts` | ✅ pass | Committed env files declare secret-shaped keys empty; `.gitignore` covers `.env`/`.env.*`/`!.env.example`; `.env.sample` absent; allowlist entries justified. |
| `no-inline-role-checks.spec.ts` | ✅ pass | Only `config/permissions.ts` may call `isRoleGranted` or compare a role literal for a destroy decision; scans `src/add-os/modules/**`. |
| `no-direct-company-http.spec.ts` | ✅ pass (1 skipped) | Only `services/companies.ts`, `services/private-office-requests.ts`, `services/company-members.ts` may reference `/admin/companies` or `/admin/private-office-requests`. The 1 skip is its own "emitted artifacts" check, same reason as below. |
| `theme/__tests__/tokens.spec.ts` | ✅ pass | WCAG ratios, ΔE separations, and the guideline p.15 strict rule staying disengaged (Antique Copper in no semantic and no component token). |

All 5 skips are the same guard: `dist/ absent — emitted-artifact pass
SKIPPED. Run npm run build before npm run test:unit for full coverage.`
Both guards' own header comments document this as deliberate, two-pass
design: the source-scan pass (which ran and passed) always covers `src/`;
the emitted-artifact pass additionally requires `dist/` and is meant to run
in CI after `pnpm build`, not in a plain `pnpm test:unit`. Nobody ran `pnpm
build` first in this pass, so the 5 skips are the documented behavior
working as intended, not a gap this run uncovered. Noted only so the skip
isn't mistaken for something it isn't.

## Type-check

```
$ vue-tsc --build --force
[exited with code 0]
```

No errors, no warnings.

## Lint

Ran `pnpm exec eslint .` — **deliberately not** the `lint` script itself
(`eslint . --fix`), because the real script mutates files on every run (73 of
the 223 problems below are flagged "potentially fixable with `--fix`") and
this task's brief is explicit: nothing found gets fixed as part of
establishing the baseline.

```
✖ 223 problems (218 errors, 5 warnings)
  73 errors and 1 warning potentially fixable with the `--fix` option.
[exited with code 1]
```

**Zero of the 223 problems are inside `src/add-os/**`.** They split into two
groups, both outside the app source:

1. **`docs/superpowers/plans/*.md` and `docs/superpowers/specs/*.md`** (bulk
   of the count) — ESLint linting fenced code blocks embedded in these plan/
   spec documents as plain JS/TS. Most errors are `Parsing error: Unexpected
   token ':'` (TypeScript type annotations the parser isn't configured for
   in this context), plus real style hits (`perfectionist/sort-imports`,
   `vue/html-indent`, `vue/v-bind-style`, two ReDoS-shaped-regex warnings)
   inside the same snippets.
2. **8 untracked `tmp-*.cjs` files at the repo root** (`tmp-backend-check.cjs`,
   `tmp-extract-detail.cjs`, `tmp-extract-postman.cjs`, `tmp-find-php.cjs`,
   `tmp-php-reset-pass.cjs`, `tmp-php-users.cjs`, `tmp-verify-live.cjs`,
   `tmp-verify-rates2.cjs`) — scratch debug/verification scripts, not part of
   the app, tripping `no-console`, `unicorn/prefer-node-protocol`,
   `prefer-template`, and unused-var rules.

Neither group is application code under `src/add-os/**`, and this task's
scope excludes fixing anything found. Flagging as-is: `eslint.config.mjs` has
no `ignores` for `docs/**` or root-level `tmp-*` files, which is why a plain
`pnpm lint` run picks them up at all — worth a decision on whether that's
intentional scope or a config gap, but that decision is not made here.
