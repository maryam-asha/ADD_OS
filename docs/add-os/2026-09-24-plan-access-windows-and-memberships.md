# Plan access windows, private plans, and membership activation — 2026-09-24

Dashboard side of the ADD Core feature recorded in
`ADDCore/docs/decisions/plan-access-windows.md`. Two commercial needs on
`Plan`, plus the screen that makes the second one usable:

1. **Evening packages** — a plan whose hours are only usable inside a daily
   window, e.g. 20:00–00:00.
2. **Private plans** — packages negotiated for one company's staff, hidden
   from every catalogue and assigned by operations instead of bought.

## What changed

| Area | Change |
|---|---|
| `modules/plans/types/plan.ts` | `access_window_start` / `access_window_end` (`H:i` or null) and `is_public` on both `Plan` and `PlanPayload` |
| `modules/plans/config/plans.config.ts` | Access-window and visibility columns; the three new fields in `emptyPlanPayload()` |
| `modules/plans/components/PlanFormDrawer.vue` | A "Plan hours" card (toggle + two `NTimePicker`s + wrap notice) and a "Listed in catalogues" switch |
| `modules/plans/views/PlansPage.vue` | The new fields carried into `openEdit()` |
| `modules/members/types/membership.ts` | New — `Membership`, `MembershipActivationPayload` |
| `services/memberships.ts` | New — `activateMembership()` against `POST /api/v1/admin/memberships` |
| `modules/members/views/MembershipsPage.vue` | New — the activation screen, replacing the ComingSoon placeholder |
| `config/permissions.ts` | `canActivateMemberships()` (role `admin`) |
| `navigation/routes.ts` | `members.memberships` now resolves to a real page |
| `lang/{en,ar}` | `packages.*` additions and a new `memberships.*` block |

## Decisions worth keeping

**The window is two wall-clock strings, never an instant.** They are copied
between API and picker untouched: no parsing, no formatting, no timezone
conversion. A locale-aware time formatter would be the wrong tool for a value
that is not a point in time.

**An end at or before the start is legal.** The window wraps past midnight —
20:00–00:00 is exactly the case the feature exists for. So the form shows an
explanatory notice rather than a validation error, and `accessWindowWraps`
compares minutes rather than strings, because lexical `"00:00" <= "20:00"` is
what makes the naive version wrong.

**The window toggle writes both bounds or neither.** The backend pairs them
with `required_with` each way, so a lingering single value would be a 422 whose
cause is invisible in the UI. Turning the toggle on seeds 20:00–00:00.

**`toPickerTimeValue()` is a crash guard, not a validator.** `NTimePicker`
parses `formatted-value` through date-fns and only special-cases `null`; any
other unparseable string — including `""` — throws synchronously during setup.
Same shape check `ResourceFormDrawer` already carries, for the same reason. The
backend's `date_format:H:i` remains the real validator.

**Activation is gated on `admin`, not `admin|operations`.** The backend route
sits in `admin.php`'s narrower `role:admin` group: granting a paid subscription
for free is money-adjacent. The page says so up front instead of letting an
operations account fill the form and collect a 403. Role-gated rather than
permission-gated because no `memberships.*` permission exists —
`PermissionSyncService` only derives permissions for `AdminResourceController`
subclasses plus a short manual list, and the membership controller is neither.

**The plan picker includes private plans and excludes inactive ones.** A
private plan is precisely what this screen assigns; an inactive one is a 422.
One-time packages are excluded too — `Membership::booted()` throws on one, so
offering it would be a control whose only outcome is an error.

**No list/update/delete in `services/memberships.ts`.** The backend exposes
only `store`, so a `createResourceApi` factory would manufacture three
endpoints that 404.

## Verification

| Check | Result |
|---|---|
| `vitest run` (full) | ✅ 96 files / 910 passed, 0 failed |
| Architecture guards + token invariants | ✅ 8 files / 153 passed |
| `vue-tsc --build --force` | ✅ 9 errors, all pre-existing and all in untouched files (`operations/`, `spaces.spec.ts`, `resources.spec.ts`, `BookingCalendarPage.spec.ts`); 0 in anything changed here |
| `eslint` on new files | ✅ clean |

### Two suite failures fixed that were not caused by this work

- **`icons.spec.ts`** — `carbon:view-off`, used by the new visibility column,
  was not in the offline bundle. Regenerated with `node scripts/build-icons.js`
  (offline, from local packages).
- **`navigation.spec.ts`** — `nav.pages.resourceTypes` had no title key in
  either locale. It belongs to an unrelated in-progress "resource types"
  feature already in the working tree, which added the nav entry and page
  without the key. Only the key was added here; the rest of that work was left
  alone.

### Known deviation, not introduced here

`PlanFormDrawer.vue` carries hardcoded hex values (`#557e46`, `#f0f7ee`, …)
against CLAUDE.md Invariant 2. The new fields follow the file's existing style
on the owner's instruction, so the block is visually consistent with its
neighbours. Its five lint hits (`vue/dot-notation` on `errors['…']`,
`vue/v-bind-style` on `:rail-style`) are the same ones every pre-existing
equivalent line in the file produces. Migrating the file to tokens remains
open, as one change rather than a side effect of this one.

---

## Follow-up, same day: `overage_rate_points` removed

The plan form's "Overage rate (points per hour)" input is gone, along with the
field on `Plan`/`PlanPayload`, its `emptyPlanPayload()` default, its
`openEdit()` mapping, its spec fixtures, and the `packages.form.overageRatePoints`
keys in both locales.

The backend column was dropped in the same change
(`ADDCore/docs/decisions/phase-3-membership-plan-wallet-mechanics.md`, reversal
section). It had never priced anything: every charge is computed from
`spaces.hourly_rate_points`, and plan-hour overrun is now answered by the
access-window rules above — the overflow is billed at the space's ordinary
rate, the same one a visitor with no plan pays.

Keeping the input would have left a shipped control with no capability behind
it, which CLAUDE.md Invariant 4 forbids; that is also why its i18n keys went
with it rather than being left orphaned. The pricing row is now a two-column
grid (Included hours, Duration) instead of three.

Re-verified after the removal: `vitest run` 96 files / 910 passed; `vue-tsc`
still 9 pre-existing errors, none in touched files; eslint clean on every
changed file except `PlanFormDrawer.vue`, whose count dropped 60 → 58 (the
removed field took two `vue/dot-notation` hits with it).
