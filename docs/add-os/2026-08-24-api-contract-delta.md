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
