# Users & Roles management — design

**Date:** 2026-08-11 · **Status:** design approved, not yet implemented
**Source:** `ADDCore/postman/ADD-OS.postman_collection.json` → `Admin (Dashboard)/Users`
and `Admin (Dashboard)/Roles`. Cross-checked against the actual Laravel source in
`ADDCore` (routes, controllers, form requests, resources) rather than the Postman
prose alone — see §1.

This is the first real screen built in ADD OS. Every page today renders the shared
`ComingSoon` placeholder (`add-os/navigation/routes.ts`); this design swaps two of
them — `system/users` and `system/roles` — for working screens backed by the real
API.

---

## 1. Backend contract, verified against ADDCore source

Postman's per-request descriptions call out `role:admin` for Create User and
Assign Role specifically ("admin-only route"). Reading the actual route file shows
that framing understates it:

```php
// routes/api/v1/admin.php:60-68
Route::middleware('role:admin')->group(function () {
    Route::apiResource('users', UserController::class)->except('destroy');
    Route::patch('users/{user}/status', [UserController::class, 'updateStatus']);
    Route::patch('users/{user}/role', [UserController::class, 'assignRole']);
    Route::get('roles', [RoleController::class, 'index']);
    Route::delete('error-logs/{errorLog}', [ErrorLogController::class, 'destroy']);
});
```

**The entire Users resource and the Roles listing sit behind `role:admin`**, not
`admin|operations` — including plain "List Users". An operations account gets 403
on every endpoint in this design, not only the two Postman calls out.

### Response envelope

`UserController::index/store/show/update/updateStatus/assignRole` all return a bare
`UserResource` or `UserResource::collection()` — Laravel's default wrapping, so
every response is `{ data: T }` (single) or `{ data: T[] }` (collection). Confirmed
independently by the Postman capture scripts on sibling endpoints
(`pm.response.json().data.id`).

`index()` calls `->get()`, not `->paginate()` — **the full array, every time. No
pagination metadata exists to consume.**

### `UserResource` fields (`app/Http/Resources/UserResource.php`)

```php
['id', 'name', 'phone', 'email', 'preferred_language', 'preferred_currency', 'status', 'roles']
```

`roles` is an array (Spatie's `getRoleNames()`), even though `assignRole()` calls
`syncRoles([$role])` — one role at a time by business rule, plural by shape. The
frontend type takes `roles[0]` as *the* role and never assumes a fixed array
length of exactly 1 at the type level.

`status_reason` / `status_changed_at` / `status_changed_by` are recorded server-side
(per the Postman description) but **never returned** by `UserResource`. A reason
can be written on status change; it cannot be displayed back anywhere in this
design.

### Validation to mirror client-side (source of truth stays server-side)

| Request | Rules |
|---|---|
| `StoreUserRequest` | `name` required·string·≤255 · `phone` required·unique·`SyrianPhoneNumber` (`^09\d{8}$`) · `email` required·valid·unique · `password` required·confirmed·`Password::defaults()` (no custom policy configured → min 8, nothing else) · `role` required·in:`operations,admin` |
| `UpdateUserRequest` | `name`, `phone` (unique ignoring self), `email` (unique ignoring self) — profile fields only, no password/role/status |
| `UpdateUserStatusRequest` | `status` required·in:`active,deactivated,blocked` · `reason` nullable·string·≤500 |
| `AssignRoleRequest` | `role` required·in:`member,operations,admin` |

`List Users` accepts `?role=` (Spatie's `role()` scope, one of
`member`/`operations`/`admin`).

---

## 2. Scope

**In scope:** `system/users` and `system/roles` pages — full working UI plus the
service layer, matching `NAV_SECTIONS`'s existing `system` section
(`add-os/navigation/sections.ts:70-78`). Both pages are already `status: "active"`
and titled ("Users", "Roles & permissions") — nothing changes in `sections.ts`.

**Out of scope:** `Content` (Founders/Partners/Community) — belongs to the
`coming-soon` `cms` section, a separate module. Section/route-level role gating
(admin-only visibility for `system`) — see §11, deferred on request.

---

## 3. Decision — service layer stays flat, module owns the screens

```
src/add-os/services/
├── api.ts                existing — gains patch<T>()
├── auth.ts                existing, untouched
├── users.ts               🆕
└── roles.ts                🆕
src/add-os/modules/system/
├── types/
│   └── user.ts             🆕  User, UserRole, UserStatus
└── views/
    ├── UsersPage.vue        🆕
    └── RolesPage.vue        🆕
```

`modules/README.md`'s proposed per-module shape (`components/composables/stores/
types/views/lang/routes.ts`) is explicitly "a suggestion, settled at the first
module" — this is the first module, and it settles two things differently:

- **Services stay flat in `add-os/services/`**, not nested per-module. They are
  thin wrappers over `api.ts` (same shape as the existing `auth.ts`), and both
  pages in this module — plus any future module that needs to resolve a user's
  role — would otherwise import across module boundaries anyway.
- **No `routes.ts` file, no Pinia store.** `routes.ts` is generated wholesale from
  `sections.ts` today (`navigation/routes.ts`); these two pages just replace the
  `ComingSoon` component for their existing route entries — one line each. A store
  is not justified: the two pages are never mounted simultaneously (one route at a
  time), so there is no cross-component state to share, only a per-page list that
  each page fetches on mount.

### `routes.ts` change

```ts
// system.users  → component: UsersPage
// system.roles  → component: RolesPage
```

Every other of the 26 remaining pages keeps `ComingSoon`, unchanged — the doc
comment in `routes.ts` already describes this exact swap ("Switching one over
means replacing `component` for that page; nothing else moves").

### `api.ts` change

Add `patch<T>()`, mirroring the existing `get`/`post`/`put`/`del` signatures
exactly (same `request<T>("PATCH", ...)` call). Needed for Update Status and
Assign Role; nothing else in `api.ts` changes.

---

## 4. Types

```ts
// modules/system/types/user.ts
export type UserRole = "member" | "operations" | "admin"
export type UserStatus = "active" | "deactivated" | "blocked"

export interface User {
	id: number
	name: string
	phone: string
	email: string
	preferred_language: string
	preferred_currency: string
	status: UserStatus
	roles: UserRole[]
}
```

Distinct from `types/auth.d.ts`'s `Role` (`"all" | "admin" | "operations" |
"moderator"`) — that type is route-guard metadata for `RouteMetaAuth`, an
unrelated enum from the backend's actual `User.role` domain. No shared type
between them; conflating "frontend route roles" with "backend user roles" is
exactly the kind of drift this design avoids by reading the source first.

---

## 5. Services

```ts
// services/users.ts
listUsers(filter?: { role?: UserRole }): Promise<User[]>          // unwraps { data }
createUser(payload: {...}): Promise<User>
getUser(id: number): Promise<User>
updateUserProfile(id: number, payload: {...}): Promise<User>
updateUserStatus(id: number, payload: { status: UserStatus; reason?: string }): Promise<User>
assignRole(id: number, role: UserRole): Promise<User>

// services/roles.ts
listRoles(): Promise<UserRole[]>                                   // unwraps { data }
```

Each function unwraps the `{ data }` envelope internally (§1) so callers work with
plain `User`/`User[]`/`UserRole[]` — the envelope is a wire-format detail, not
something every call site should know about. Errors propagate as `ApiError`
(already defined in `api.ts`), read by the UI via `.data?.message` /
`.data?.errors`.

---

## 6. Users page

**Layout:** toolbar (search input + role filter) above an `n-data-table`. Both
filters are **client-side** — the full list is already in memory (§1, no
pagination exists to page through), so filtering server-side would be a second
round trip for data already on the client.

**Columns:** Name · Phone · Email · Role · Status · Actions.

**Role / Status rendering** — per `tokens-and-color.md`'s "state colour is never
the sole channel": tag + distinct Carbon icon + text label, never a bare colour
dot.

| Status | Icon | Semantic |
|---|---|---|
| `active` | `carbon:checkmark-filled` | success |
| `deactivated` | `carbon:warning-alt-filled` | warning |
| `blocked` | `carbon:error-filled` | danger |

**Create User** — `n-drawer` form: name, phone (masked `09XXXXXXXX`, mirroring
`SyrianPhoneNumber`), email, password, password confirmation, role
(`operations`/`admin` only — `member` is never offered here, matching
`StoreUserRequest`). Client-side validation mirrors §1's rules; the server
response is still the final word (422 messages surfaced as-is).

**Edit User** (row action) — same drawer shape, profile fields only (name, phone,
email) — no password, no role, no status, matching `UpdateUserRequest` exactly.

**Change status** (row action) — small modal: status select (`active` /
`deactivated` / `blocked`) + optional reason (≤500). Copy warns that switching to
`deactivated`/`blocked` revokes every session the user holds immediately (per the
Postman description of `User::deactivate()`/`block()`) — this is a one-way action
from the user's point of view, not a toggle they can silently flip back from
outside this dialog.

**Change role** (row action) — small modal: role select sourced from the live
`listRoles()` result (`member`/`operations`/`admin`, matching `AssignRoleRequest`).

No per-row role checks are needed inside the page: the whole page is already
reachable only by whoever the router let through, and §11 records that this design
does not yet gate that at the section level.

---

## 7. Roles page

Read-only. `listRoles()` renders as a simple tag list — there is nothing to
create/edit/delete (`RoleController::index()`'s own comment: "no granular
permissions yet"). No table, no actions, no pagination.

---

## 8. i18n

New keys under `users` / `roles` namespaces in both `add-os/lang/ar/ar.json` and
`add-os/lang/en/en.json` — every column header, action label, status/role display
name, form field label, validation message, and confirmation-dialog copy. No
literal strings in either `.vue` file. `nav.pages.users` / `nav.pages.roles`
already exist and are untouched.

---

## 9. Icons

New literals, picked up automatically by `npm run icons` (it scans source for
`prefix:name` strings — no manual registry to update):

`carbon:checkmark-filled` · `carbon:warning-alt-filled` · `carbon:error-filled` ·
plus standard action icons (add/edit/filter/search) reused from whatever the
existing bundle already carries where possible, new literals only where it
doesn't.

---

## 10. Test plan

- **Vitest, `services/users.ts` / `services/roles.ts`**: request shaping (method,
  path, query/body), envelope unwrapping, `ApiError` propagation on non-2xx.
- **Vitest, client-side validation helpers**: phone pattern, password length,
  required-field checks — mirroring §1's server rules so a future backend rule
  change is caught by a failing assertion, not silently drifting.
- **`pnpm test`** (the full guard suite) must stay green: no hardcoded colours/px
  in the new `.vue` files, no literal user-facing strings outside `t()`, icons
  registered before use, RTL untouched for the two new routes.
- **Manual**: `ar`/`en` × RTL/LTR on both pages (per `i18n-rtl.md`'s four-state
  matrix) — `n-data-table`, `n-drawer`, `n-modal`, `n-select` are all RTL-registered
  in `rtlProvider.ts` already, but Pinx's RTL support is beta per the vendor and
  this is the first production use of `n-data-table`, so it gets a real look, not
  an assumption.

---

## 11. Items this design does not settle

| Item | Owner | Why it is not blocking |
|---|---|---|
| Section-level `admin`-only gating for `system` (sidebar + route guard) — surfaced during design; the backend refuses the *entire* surface to `operations`, not just Create/Assign-Role as the Postman prose implies | Product/Maryam | Explicitly deferred on request. Today an operations account still sees "System" in the sidebar and hits a translated 403 from the API rather than being blocked at the UI. `NavSection` has no `roles` field yet; `routes.ts` hardcodes `meta.roles: "all"` for every section; `items.tsx` renders the sidebar with no role filter. The guard mechanism itself (`authStore.isRoleGranted`, read by `utils/auth.ts`) already exists and is unused for this — wiring it up later is additive, not a rewrite. |
| `status_reason` not being round-tripped by `UserResource` | Backend | Out of this design's control; noted so nobody spends time looking for a "reason" column in the table that the API cannot supply. |
| Client-side-only filtering if the user list grows large enough that shipping the whole array becomes a real cost | Product | `index()` has no pagination today; revisit if/when the backend adds it. |
