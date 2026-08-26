# API contract delta — pinned 2026-08-24 snapshot vs. `src/add-os/`

Compares `docs/api/ADD-OS.postman_collection.json` (pinned 2026-08-24, 205 leaf
endpoints — see `docs/api/README.md`) against what `src/add-os/` actually implements.
**Report only — nothing here has been fixed.**

## Live bug at the top: none found

Nothing below describes currently-broken behaviour in production — every finding is
either an unconfirmed assumption that turned out to still hold, or a real server-side
rule with no client-side counterpart (a 422/403 a user can hit, not a wrong result a
user is currently seeing). Flagging that absence explicitly rather than leaving it
implicit.

---

## a) Contradicted assumptions — none found

Every "confirmed live" / "per the collection" / "live-confirmed" claim locatable in
`src/add-os/` was checked against the pinned snapshot, side by side. None are
contradicted. Listed so the coverage is visible, not just asserted:

| Claim (file) | Collection says now | Verdict |
|---|---|---|
| `permissions.ts`: all 7 spatial DELETEs are "Admin-only (not operations)", with a named cascade set per resource | Every one of Delete Branch/Building/Floor/Zone/Space/Resource/Seat-Desk still reads exactly that, cascade wording included, verbatim | Holds |
| `permissions.ts`: Business Hours + Exception DELETE are "Admin-only (not operations)" | Both still read exactly that | Holds |
| `permissions.ts`: Users/Roles have no DELETE, so nothing to gate | Still true — Users has GET/POST/PUT/PATCH×2, no DELETE; Roles has GET only | Holds |
| `users.ts`: `PUT /users/{id}`, `PATCH /users/{id}/status`, `PATCH /users/{id}/role` all return `{"message": ...}`, never the resource | All three descriptions confirm message-only | Holds |
| `private-office-requests.ts`: `markAsQuoted` bakes in "requested→quoted" as the only transition this UI performs | Description: "status only accepts 'requested' or 'quoted' here — 422 for 'contracted'" | Holds |
| `business-hours.ts` / `business-hour-exceptions.ts`: overlap + strict-after constraint on `close_time`; exceptions' `is_closed` toggle requires times omitted/required accordingly | Both descriptions confirm verbatim, including the two-variant exception create (closed-entirely vs. shortened-hours) | Holds |
| `auth.ts`, `account.ts`, `usePasswordConfirmation.ts`, `ResetPasswordPage.vue`, `plans.config.ts`: 8 "live-confirmed against the real backend" claims (409 on double-login, 422 keyed on `email` not `token`, empty 2FA response bodies, `pricing_currency` rejecting non-USD/SYP, etc.) | These were never sourced from the collection — several comments say so directly ("not documented in the collection"). The collection's own prose for the same endpoints is silent on all of them (mostly "(no description)") | Not contradicted — nothing to contradict; different evidence category, noted so it isn't mistaken for unchecked |

---

## b) New constraints on endpoints already in use

The given example (business hours: `close_time` strictly after `open_time`, no overlap
per branch+weekday — implying multiple periods per day, which the type/screen don't
model) stands as given. Two more of the same shape — a real server-side rule with no
client-side guard, so the user only learns about it from a failed submit:

1. **`POST /admin/companies/{id}/members` (Add Company Member) — 422 if `user_id` is
   already a member of this company.** `AddCompanyMemberDialog.vue`'s user picker does
   not filter out users who are already members of the target company (not verified
   further — that file is mid-edit by the other task running in this session; not
   opened beyond what's needed to confirm the constraint exists server-side).
2. **`POST /admin/users` (Create User) and `PATCH /admin/users/{id}/role` (Assign
   Role) are both admin-only** ("admin-only route (role:admin, not role:admin|operations
   — an operations account gets 403 here)" / "admin-only route"). `UsersPage.vue` has no
   `isRoleGranted` check anywhere — the Create User button and the Assign Role action
   are shown unconditionally to any viewer who can reach the Users page at all
   (`role:admin|operations`), unlike every spatial DELETE and both Business-Hours
   DELETEs, which the codebase already gates client-side via `permissions.ts` sourced
   from this same collection. An operations-role user sees both actions and gets an
   ungated 403 on either. (`PATCH /admin/users/{id}/status`, by contrast, is not
   described as admin-only and needs no such gate.)

Checked and found **already correctly handled** (not gaps, listed so the "not
re-derived" instruction doesn't read as "not checked"): `CompaniesPage.vue` pre-filters
`private_office_request_id` to `status === "quoted"` and sources `branch_id` from a real
branch list, matching Create Company's two 422 conditions; `SpacesPage.vue` /
`ResourcesPage.vue` correctly split structural `PUT` from status `PATCH` and use the
right enum (`active | maintenance | retired`); the Users status-change modal already
has the optional `reason` field the collection describes.

## c) Endpoints we implement that changed — none found

Every base path + verb set this codebase calls (`branches`, `buildings`, `floors`,
`zones`, `spaces`, `resources`, `seats-desks`, `business-hours`,
`business-hour-exceptions`, `plans`, `exchange-rates`, `companies`, `companies/{id}/members`,
`private-office-requests`, `users`, `roles`) matches the pinned snapshot exactly — same
verbs, same paths, same permission wording, same response-shape notes (message-only vs.
resource-returning). Nothing changed under our feet.

## d) Endpoints with no screen yet, grouped by nav section

| Nav section (status) | Endpoints with no screen | Count |
|---|---|---|
| *(no section names this at all)* — **Reception Operations**: check-in/out, walk-ins, payment settlement, wallet top-ups, booking approvals, arrival requests | Richest validation surface in the whole collection (business-hours gating, capacity limits, cancellation windows, approval workflow, exactly-one-of-user/company on top-ups) and entirely unbuilt | 28 |
| `access` (coming-soon) — Devices, Device Capabilities | Device types (lock/gateway/camera/gate/printer/display/occupancy_sensor/attendance_terminal), capability types (generate_passcode/revoke_passcode/list_status/stream) | 10 |
| `cms` / `community` (coming-soon) — **Content**: Founders, Partners, Contact Links, Announcements, Community Members | Contact Link `type` and Announcement `type` are open strings by design (no fixed list to encode) | 25 |
| `settings` (coming-soon) | List/Update Settings — value shape depends on the setting key's type | 2 |
| *(unmapped in `sections.ts`)* — Privacy Policy | Get/Update | 2 |
| *(unmapped in `sections.ts`)* — Error Logs | List (the one endpoint confirmed "Paginated (25 per page)"), Get, Delete | 3 |
| `bookings` (coming-soon) | **No list-all-bookings endpoint exists anywhere in the collection at all** — every booking endpoint is either action-specific on a known `booking_id` (check-in/out, cancel, settle, approve/reject, extend) or the member-app create. Building this page means asking the backend for a listing endpoint first, not just building UI. | 0 endpoints exist to build against |
| `members` (active) — page `memberships` | **No admin endpoint exists** — the only `membership`-shaped endpoint anywhere is member-facing (`POST /member/memberships`, create) | 0 endpoints exist to build against |
| `members` (active) — page `individuals` | No dedicated endpoint, but doesn't need one: `GET /admin/users?role=member` already does this | 0 — reuses an existing, already-implemented endpoint |
| `payments` (active) — pages `transactions`, `paymentMethods` | **No endpoint of either shape exists anywhere in the collection** — `payment_method` only appears as a field on the settle-payment payload (`cash\|sham\|mtn\|syriatel`), not as its own resource | 0 endpoints exist to build against |
| `dashboard` (coming-soon) | No single endpoint — would aggregate others | — |

The three "active" rows above (`memberships`, `individuals`, `transactions`,
`paymentMethods`) are worth a second look before scoping any of them: two have zero
backend surface to build against at all, and one silently reuses a different resource's
endpoint. None of that is visible from `sections.ts` alone.

---

## Task 3 — two things this snapshot settles

**1. Server-side parent filtering is real, documented, and already wired at the
service layer — just never called with an argument.** Confirmed per level:
`buildings?branch_id`, `floors?building_id`, `zones?floor_id`,
`spaces?building_id`/`?zone_id` (independently or combined), `resources`/`seats-desks`
`?space_id`, `business-hours?branch_id`. Checked the service layer, not just the
collection: `listBuildings(branchId?)`, `listFloors(buildingId?)`, `listZones(floorId?)`,
`listSpaces({building_id?, zone_id?})`, `listResources(spaceId?)`,
`listSeatsDesks(spaceId?)` already accept the filter and forward it. Checked every
spatial page's actual call site (`BuildingsPage.vue`, `FloorsPage.vue`,
`ZonesPage.vue`, `SpacesPage.vue`, `ResourcesPage.vue`, `SeatsDesksPage.vue`): every one
calls its list function with **zero arguments** today. So this doesn't unblock
hierarchical navigation by itself — the plumbing already exists; only the UI (a parent
selector wired to the child list) doesn't yet.

**2. Pagination is correctly deprioritized — with one correction to the premise.**
Across all 205 pinned endpoints: zero occurrences of `meta`, `per_page`, or `last_page`
as JSON keys, and zero saved example responses for any endpoint. But exactly **three**
endpoints are described as paginated in prose, not two — `GET /admin/error-logs` (25/page),
`GET /member-directory` (20/page, public), and `GET /admin/reception/arrival-requests`
("status = pending only..."). The third is an admin-dashboard endpoint, not a
member/public one — but it has no screen yet either (see the Reception Operations row
above), so "the dashboard uses neither" still holds in practice today. Recorded in
`pagination.ts`'s module doc (appended, not overwritten) with the 2026-08-24 citation.

---

## Wider sweep (2026-08-24, later same day) — corrections to (a) and (b)

The original section (a) sweep — `grep -rlniE "confirmed live|Live-confirmed|per the
collection|confirmed from the collection|collection says|collection describes"
src/add-os` — was too narrow twice over: it never ran against `docs/`, and even inside
`src/add-os/` it missed `pagination.ts`/`resource-factory.ts`'s "is not confirmed"
phrasing because that exact string isn't one of the six grepped. Re-run wider:

```
grep -rlniE "confirmed live|live-confirmed|per the collection|collection says|
collection describes|not confirmed|unconfirmed|\bassumed\b|verified against|
TODO\(backend\)|confirmed from the collection" src/add-os docs
```

34 files matched (up from 17, and now including `docs/`). Four are false positives —
`docs/brand/PHASE-0-AUDIT.md` ("verified against DataTable," about a font's `tnum`
feature) and `src/add-os/theme/tokens.ts` ("not assumed," about colour provenance) match
on generic language, not backend claims; `docs/superpowers/specs/2026-08-04-add-loader-integration-design.md`
and `.../2026-08-16-resource-list-visual-refresh-design.md` match on "assumed"/"unconfirmed"
about a UI stack brief and a token tier, respectively. Excluded from what follows.

**This is not a zero.** Two genuine findings, both surfaced only by widening into `docs/`:

### Finding 1 — a live bug: Zone delete doesn't cascade, contradicting its own documented contract

`docs/add-os/auth-verification-report.md` (already in the repo, pre-dating this session)
recorded, under "Backend gaps found": `DELETE /api/v1/admin/zones/{id}` does **not**
cascade to child Spaces — live-reproduced (Branch→Building→Floor→Zone→Space created,
Zone deleted `204`, the Space still fetches `200` with `zone_id` set to `null` instead of
being deleted). This **contradicts the Postman collection's own prose** ("cascades
through every Space under this zone" — still exactly what the 2026-08-24 pinned snapshot
says, unchanged) **and** the frontend's cascade-delete warning copy, which tells the user
deleting a zone "also deletes every space under it." It doesn't. Branch→Building→Floor
cascades were separately confirmed working.

This sits alongside, not on top of, section (a)'s "Holds" verdict for `permissions.ts`'s
`CASCADING_SPATIAL_RESOURCES` claim — that verdict was about whether the **code's claim
matches the collection's prose** (it does, still). This finding is about whether the
**collection's prose matches what the backend actually does** (it doesn't, for this one
relationship). Both can be true at once, and the second one is a live, user-facing bug:
right now, a staff member deleting a Zone with Spaces under it sees an accurate-looking
warning and gets an inaccurate result. Flagging per this batch's instruction, not fixing.

### Finding 2 — section (b) understated the Users/Roles gap; the real scope is the whole resource, not two actions

`docs/superpowers/specs/2026-08-11-users-roles-management-design.md` §1 records, from
reading ADDCore's actual route file: "the entire Users resource and the Roles listing
sit behind `role:admin`, not `admin|operations` — including plain 'List Users'." That was
written 2026-08-11. Re-checked directly against the live route file today
(`ADDCore/routes/api/v1/admin.php`, 2026-08-24) rather than trusting either the design
doc's age or the Postman collection's silence:

```php
// Narrower than the group above: managing accounts and roles is admin-only,
// operations can't create or promote other accounts.
Route::middleware('role:admin')->group(function () {
    Route::apiResource('users', UserController::class)->except('destroy');
    Route::patch('users/{user}/status', [UserController::class, 'updateStatus']);
    Route::patch('users/{user}/role', [UserController::class, 'assignRole']);
    Route::get('roles', [RoleController::class, 'index']);
    ...
    Route::patch('settings/{key}', [SettingController::class, 'update']);
});
```

Still true, today. This is **more** than the Postman collection's prose ever says: the
collection only calls "admin-only" out explicitly for Create User and Assign Role (which
is what section (b) reported); it says nothing about List Users, Get User, Update User
Profile, or **Update User Status** being restricted at all. But the actual route file
gates the *entire* `users` resource (index/show/store/update, all four, plus
`updateStatus` and `assignRole`) and separately `GET /roles` behind `role:admin` —
`admin|operations` is not enough for any of it. `PATCH /admin/settings/{key}` is in the
same group, for whatever that's worth once Settings has a screen.

**This corrects section (b)'s claim that `PATCH /admin/users/{id}/status` "is not
described as admin-only and needs no such gate."** It is admin-only; the collection just
doesn't say so. And `RolesPage.vue` has exactly the same shape of gap as `UsersPage.vue`
— checked just now, it calls `listRoles()` unconditionally with no `isRoleGranted` check
anywhere, so it fails the same way. Corrected finding written up on its own in
`docs/add-os/2026-08-24-usersrolespage-permission-gap.md`, per this batch's Task 4.

**A related, smaller finding surfaced by the same route file:** `/api/v1/admin/currencies`
(GET/POST/GET/PATCH/PATCH-status — a real, implemented resource, per
`routes/api/v1/admin.php` lines 112–116) **does not appear anywhere in the Postman
collection** — zero matches for `"currencies"` as a path in the 2026-08-24 pinned
snapshot (299 hits for the unrelated `currency` header key, zero for the resource). Not
investigated further — noted because it means the collection is missing at least one
whole resource, not just under-annotating permissions on ones it does list.

**Everything else the wider sweep surfaced** either re-confirms a claim already in the
table above (e.g. `services/__tests__/users.spec.ts`'s comment about a prior version
assuming a `{data: User}` envelope — same message-only claim as `users.ts`, already
"Holds"), or restates a still-open, honestly-labeled unconfirmed assumption rather than a
false one (`docs/superpowers/plans/2026-08-18-company-pipeline.md`: Company Member's
response shape "is not confirmed... no example exists" — still true today, zero example
responses anywhere in the pinned snapshot, so this is accurately labeled uncertainty, not
a contradiction).
