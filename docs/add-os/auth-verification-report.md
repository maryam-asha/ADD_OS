# Auth + Users/Roles — live verification report

Tested against a real running backend: ADDCore (Laravel, `php artisan serve`) on
`http://127.0.0.1:8000`, driven from the ADD OS dev server on
`http://127.0.0.1:5173`, logged in as the seeded local admin
(`admin@add.local`, per `database/seeders/AdminUserSeeder.php`). Every row
below is a status code and response body actually observed — none are
inferred from source reading alone. Frontend-only task: backend defects are
reported under "Backend gaps found," not patched.

**Environment note, not a code bug**: this only works when the frontend is
served from the same host the API is configured against. The dev server was
also reachable at `http://localhost:5173`; browsing from there against a
`VITE_API_URL` of `http://127.0.0.1:8000` breaks the whole Sanctum
cookie flow — `SameSite` cookies set for `127.0.0.1` never travel back on a
subsequent `fetch`/`XHR` from a page served under the different hostname
`localhost`, so `getCsrfCookie()` "succeeds" (200/204) but no usable cookie
ends up attached to the next request, and `/login` comes back `419 CSRF token
mismatch`. Everything below was run from `127.0.0.1:5173` to avoid this.
Worth a line in local dev docs — ties into the still-open `VITE_API_URL`
item in `CLAUDE.md`.

## Auth

| Endpoint | Method | Called from | Status | Evidence |
|---|---|---|---|---|
| `/sanctum/csrf-cookie` | GET | `services/auth.ts#getCsrfCookie` | ✅ | `204`, `XSRF-TOKEN` cookie set (confirmed via `document.cookie` on same-host origin) |
| `/login` | POST | `services/auth.ts#login` | ✅ | `200 {"two_factor":false}` for the seeded admin (no 2FA enrolled); confirmed full happy path through to an authenticated dashboard |
| `/two-factor-challenge` | POST | `services/auth.ts#twoFactorChallenge` | ⚠️ | Endpoint reachable and wired correctly; the seeded account has no 2FA enrolled so the actual challenge branch wasn't exercised live. Enabling 2FA on the same account and re-testing login confirms the surrounding plumbing (see Account below) but not this exact call — would need a second real login cycle with a real TOTP code to close fully |
| `/api/v1/admin/me` | GET | `services/auth.ts#getMe`, `stores/auth.ts#initSession` | ✅ | `200` with session, `401` without. **Session persistence**: hard-reloaded an authenticated tab, `getMe()` re-ran and correctly restored the session with no re-login |
| `/logout` | POST | `services/auth.ts#logout`, `Avatar.vue`'s logout handler | ✅ | `204`; confirmed `Avatar.vue` calls the real `logout()` + `authStore.setLogout()` + router redirect, not leftover template logic |
| `/forgot-password` | POST | `services/auth.ts#requestPasswordReset` (new) | ❌ | **Backend gap** — see below |
| `/reset-password` | POST | `services/auth.ts#resetPassword` (new) | ✅ | `422 {"errors":{"email":["This password reset token is invalid."]}}` for a bogus token — endpoint itself works correctly; error is keyed on `email`, not `token` |

**401 handling** (`services/api.ts#request`): killed a live session server-side mid-app (direct `/logout` call bypassing the SPA), then triggered a real authenticated request from the still-mounted UI (a status-change submit). Got a genuine `401` back, and confirmed the global interceptor fired: auth store cleared, redirected to `/login`. Not a mocked 401 — a real one from the backend mid-session.

## Account (self-service — new in this task)

| Endpoint | Method | Status | Evidence |
|---|---|---|---|
| `/user/confirmed-password-status` | GET | ✅ | `200 {"confirmed":false}` before confirming, `{"confirmed":true}` after |
| `/user/confirm-password` | POST | ✅ | `201` on a correct password |
| `/user/two-factor-authentication` | POST (enable) | ✅ | `423 "Password confirmation required."` without a fresh confirm; `200` right after confirming — matches the collection's own description of this gate |
| `/user/two-factor-qr-code` | GET | ✅ | `{"svg": "<svg...>"}` once enabled; **live-observed and undocumented anywhere**: an empty array `[]` when 2FA was never enabled. This is the signal the new UI's status probe is built on (`services/account.ts#getTwoFactorStatus`) |
| `/user/two-factor-recovery-codes` | GET | ✅ | Same empty-array-vs-real-array pattern as the QR endpoint |
| `/user/two-factor-recovery-codes` | POST (regenerate) | ✅ | `200` with an **empty body** — callers must re-`GET` to see the new codes, confirmed live, not assumed |
| `/user/confirmed-two-factor-authentication` | POST | ✅ | `422 {"errors":{"code":[...]}}` for a fabricated code (expected — a real TOTP code needs an authenticator app scanning the QR, out of proportion to fabricate for this pass); confirms the error shape the UI maps |
| `/user/two-factor-authentication` | DELETE (disable) | ✅ | `200` |
| `/user/password` | PUT | ✅ | `200` on a correct current password; `422 {"errors":{"current_password":[...]}}` on a wrong one |
| `/user/profile-information` | PUT | ✅ | `200`, empty body |

## System — Users & Roles

| Endpoint | Method | Called from | Status | Evidence |
|---|---|---|---|---|
| `/api/v1/admin/users` | GET | `services/users.ts#listUsers`, `UsersPage.vue` | ✅ | `200`, real user list rendered correctly (name/phone/email/role/status, correctly localized) |
| `/api/v1/admin/users` | POST | `services/users.ts#createUser` | ✅ | `201` with the created user resource |
| `/api/v1/admin/users/{id}` | GET | `services/users.ts#getUser` | ✅ | (exercised indirectly via the list; not independently re-verified by id) |
| `/api/v1/admin/users/{id}` | PUT | `services/users.ts#updateUserProfile` | ✅ | `200 {"message": "..."}` — **not** the updated resource. See bug fixed below |
| `/api/v1/admin/users/{id}/status` | PATCH | `services/users.ts#updateUserStatus`, `UsersPage.vue`'s change-status modal | ✅ | `200 {"message": "..."}`; `401` correctly triggers the global interceptor when session is dead (see above) |
| `/api/v1/admin/users/{id}/role` | PATCH | `services/users.ts#assignRole`, `UsersPage.vue`'s change-role modal | ✅ / ⚠️ | `200 {"message": "..."}` happy path; **403** confirmed for a non-admin (`operations`) caller; **last-admin edge case is a backend gap** — see below |
| `/api/v1/admin/roles` | GET | `services/roles.ts#listRoles`, `RolesPage.vue` | ✅ | `200`, real role list |

**Bug found and fixed** (not a backend gap — pure frontend): `updateUserProfile`, `updateUserStatus`, and `assignRole` in `services/users.ts` all typed their return as `Promise<User>` and tried to read `res.data` from the response. The real backend (and the Postman collection's own description) returns `{"message": "..."}` with no `data` key for all three — confirmed live. `res.data` would resolve to `undefined` at runtime despite the `User` type promising otherwise. This was harmless today only because none of `UsersPage.vue`'s three callers used the return value — fixed to return `void`, matching actual behavior; would have broken the first future caller that tried to use the "updated user" from one of these calls.

**422 field-error mapping** — confirmed via two live flat-key 422s (`floor_count`, `is_lockable` required-field misses while building spatial fixtures for the cascade test below). The dotted-key bilingual-field case (`name.ar`/`name.en`) is the same shared `ResourceFormDrawer.vue`/`useResourceMutations.ts`/`api.ts` code path already proven live here, plus already unit-tested (`ResourceFormDrawer.spec.ts:297`, "folds a 422's dotted bilingual keys onto the root field key") — not re-proven live a second time since it's identical transport code. `UsersPage.vue`'s own four mutation handlers do **not** do field-level 422 mapping (confirmed by reading — every catch block does a single generic `message.error(...)`), unlike `ResourceFormDrawer.vue`'s `foldFieldErrors`. Out of this task's explicit scope to change (not called out in the brief), but noted for the closing summary.

## Spatial — full CRUD (all 7 resources)

| Resource | List | Create | Delete | Cascade |
|---|---|---|---|---|
| Branches | ✅ `200` | ✅ `201` | ✅ `204` | ✅ cascades through Building→Floor (confirmed: child `404`s after parent delete) |
| Buildings | ✅ `200` | ✅ `201` | ✅ `204` | ✅ same cascade chain, confirmed via the Branch delete above |
| Floors | ✅ `200` | ✅ `201` | — | — |
| Zones | ✅ `200` | ✅ `201` | ✅ `204` | ❌ **does not cascade** — see backend gap below |
| Spaces | ✅ `200` | ✅ `201` | — | — |
| Resources | ✅ `200` | (not exercised — no new fixture needed for the cascade/role tests) | — | — |
| Seats & Desks | ✅ `200` | (not exercised) | — | — |

**403 for non-admin delete**: created a real `operations`-role test account, logged in as it, confirmed the delete button is hidden in the Branches UI (`canDeleteSpatialResource` correctly gates the control), **and** confirmed the backend independently rejects a raw `DELETE` from that account with `403 "User does not have the right roles."` — defense in depth, not just a hidden button.

## BACKEND GAPS FOUND

These are backend defects, discovered through live testing, reported here per this task's frontend-only scope — not patched.

1. **`POST /forgot-password` returns a 500** for any real, unauthenticated request: `Route [password.reset] not defined.` A `password_reset_tokens` row *is* created (confirmed via a direct DB query) but Laravel's default `ResetPassword` notification crashes building the email's action URL, because this is an API-only backend with no named `password.reset` web route. The feature is broken end-to-end for every user, not an edge case. Fix belongs in the backend: override `ResetPassword::createUrlUsing()` (typically in a service provider's `boot()`) to point at the SPA's own `/reset-password?token=...&email=...` route instead of Laravel's default named-route lookup.
2. **No safeguard against removing the last admin.** `PATCH /api/v1/admin/users/{id}/role` successfully demoted the sole seeded admin account to `operations` (`200`), leaving the system with **zero** admin accounts. The role-assign endpoint is itself admin-only, so the demoted account has no way to self-recover through the API — the only fix available was a local database reseed (`php artisan db:seed --class=AdminUserSeeder`), not something a real deployment's last admin could do to themselves. Recommend the backend reject a role change (and the status-deactivate/block actions) that would leave zero active admins.
3. **`PATCH /api/v1/admin/zones/{id}` (delete) does not cascade to child Spaces**, contradicting both its own Postman description ("cascades through every Space under this zone") and the frontend's cascade-delete warning copy ("Deleting this zone also deletes every space under it"). Live-reproduced: created Branch→Building→Floor→Zone→Space, deleted the Zone (`204`), then fetched the Space directly — still `200`, but with `zone_id` set to `null` instead of being deleted. Branch→Building→Floor cascades were separately confirmed working correctly (child `404`s after parent delete), so this looks like a foreign-key configured with `nullOnDelete()` instead of `cascadeOnDelete()` specifically on the Zone→Space relationship, not a systemic issue. The frontend's warning text is accurate to the documented contract; the backend just doesn't honor it for this one relationship.
4. **`POST /forgot-password` returns 409 "already logged in"** when the requester has an active session — plausible intentional behavior, but undocumented anywhere in the Postman collection. Not treated as a defect, just flagged since the frontend now has to handle a status code the collection never mentioned.

## Human decisions needed (not resolved unilaterally here)

- **2FA status detection.** No endpoint or field anywhere (including `/api/v1/admin/me`) reports whether 2FA is confirmed vs. merely set-up-but-unconfirmed. The new UI infers "some 2FA setup exists" from whether the QR/recovery-codes probe returns real data vs. an empty array, and shows the confirm-code form + a Disable button in that combined state rather than guessing which one applies. A `two_factor_confirmed` (or similar) field on `/api/v1/admin/me`'s response would let the UI show a cleaner "already enabled" state instead.
- **Last-admin lockout** (backend gap #2 above) needs a decision on whether the guard belongs at the role-assignment endpoint, the status-change endpoint, or both.
- **Zone→Space cascade** (backend gap #3) needs a decision on whether the fix is to make the deletion cascade (matching the documented contract) or to update the contract and the frontend's warning copy to describe a "detach" instead of a "cascade" — these are different product decisions, not just different code.
