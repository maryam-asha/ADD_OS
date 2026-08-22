# Plans, Exchange Rates, Business Hours — design

**Status:** approved 2026-08-20. **Verification:** `docs/add-os/plans-exchange-hours-verification-report.md`
(read first — every contract detail below is sourced from that live pass, not inferred).

## Goal

Connect three admin-dashboard modules to the already-existing ADDCore endpoints, using the
project's generic CRUD architecture (`ResourceTable` / `ResourceFormDrawer` /
`ResourceStatCards` / `useResourceList` / `useResourceMutations` / `createResourceApi`) —
the same architecture Branches, Companies, and the rest of `spatial`/`members` already use.

## Scope

1. **Plans** — full CRUD, bilingual name, subscription flag, pricing.
2. **Exchange Rates** — list + create only (no edit/delete exist on the backend), with a
   client-computed "latest per currency" highlight.
3. **Business Hours** — weekly schedule CRUD, scoped to a branch, **plus** the
   `business-hour-exceptions` sub-resource found during verification (not in the original
   brief, but the same feature area) — one page, two tabs.

Out of scope, deliberately: the `plans.wallet` nav page (a different, unbuilt feature), any
backend change, and the `firebase` dependency / `ResourceFormDrawer` drawer→modal change
already sitting uncommitted in the working tree (unrelated, flagged separately, left
untouched).

## Navigation

| Module | Section | Page key | Route | Status |
|---|---|---|---|---|
| Plans | `plans` (existing, currently `coming-soon`) | `packages` (existing key) | `/plans/packages` | flips to `active` |
| Exchange Rates | `payments` (existing, currently `coming-soon`) | `exchangeRates` (existing key) | `/payments/exchange-rates` | flips to `active` |
| Business Hours | `spatial` (existing, already `active`) | `businessHours` (**new** key) | `/spatial/business-hours` | added to existing active section |

`plans` and `payments` each have a second page (`wallet`, `transactions`/`paymentMethods`)
that stays on `ComingSoon` — matches the existing per-page override in `routes.ts`
(`members` is `active` today with only `companies` wired; the rest still fall through).

## Data contracts (verbatim from the live pass)

```ts
// Plan — GET/POST/PUT all confirmed to accept/return this shape.
// pricing_currency accepts "USD" and "SYP" (tried EUR → 422 invalid).
interface Plan {
  id: number
  name: { ar: string; en: string }
  is_subscription: boolean
  price: string              // decimal string, e.g. "150.00"
  pricing_currency: "USD" | "SYP"
  duration_days: number
  included_hours: string     // decimal string
  overage_rate: string       // decimal string
  is_active: boolean
  order: number
  created_at: string
  // present ONLY when the request's `currency` header differs from pricing_currency:
  converted_amount?: string
  converted_currency?: "USD" | "SYP"
}
```

No `PATCH .../status` exists (confirmed 404) — the edit form's `is_active` switch, saved via
the normal `PUT`, is the only way to toggle status.

```ts
// ExchangeRate — currency_code is USD-only (confirmed: SYP/EUR/GBP/TRY/SAR all rejected).
// List + Create only — GET/PUT/DELETE on a single id all 404.
interface ExchangeRate {
  id: number
  currency_code: "USD"
  rate_to_base: string        // decimal string; SYP per 1 USD
  effective_from: string      // ISO datetime
  set_by: number
  created_at: string
}
```

Since `currency_code` has exactly one valid value and there is no currency-listing
endpoint anywhere in the collection, the create form shows it as a **disabled, pre-filled
"USD" field** with a code comment citing this finding — not a free-text/select input that
implies more values exist, and not a silently-invented client-side constant either (the
comment makes the "why" traceable back to this pass if the backend ever adds a second
currency).

"Latest per currency" (needed for the list UI, since the backend has no `/latest`):

```ts
export function latestRatesByCurrency(rates: ExchangeRate[]): ExchangeRate[] {
  const latest = new Map<string, ExchangeRate>()
  for (const rate of rates) {
    const current = latest.get(rate.currency_code)
    if (!current) { latest.set(rate.currency_code, rate); continue }
    const isNewer = new Date(rate.effective_from) > new Date(current.effective_from)
    const isTiedButLater = new Date(rate.effective_from).getTime() === new Date(current.effective_from).getTime() && rate.id > current.id
    if (isNewer || isTiedButLater) latest.set(rate.currency_code, rate)
  }
  return [...latest.values()]
}
```

Tie-break-by-highest-`id` is inferred from the one tied-`effective_from` case observed in
the verification pass (the backend's own server-side conversion picked the higher-id row),
not from reading backend code — commented as such at the call site.

```ts
// BusinessHour — no created_at. day_of_week is validated server-side against sunday..saturday.
interface BusinessHour {
  id: number
  branch_id: number
  day_of_week: "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday"
  open_time: string   // "HH:mm"
  close_time: string  // "HH:mm"
}

// BusinessHourException — is_closed:true requires open_time/close_time omitted;
// is_closed:false requires both present, close_time strictly after open_time.
interface BusinessHourException {
  id: number
  branch_id: number
  date: string          // "YYYY-MM-DD"
  is_closed: boolean
  open_time: string | null
  close_time: string | null
  reason: string | null
}
```

Both `PUT`s return `{message}` only, like every other resource in this codebase — the
generic `update()` return type already models this.

## Permissions

Per the collection's DELETE descriptions (verified live, matching the `403`-on-role-deny
pattern already in `permissions.ts`):

- Business Hours delete: "Admin-only (not operations)."
- Business Hour Exception delete: "Admin-only (not operations)."
- Plans delete: **no description at all** in the collection — same as Users/Roles, which
  get no entry in `permissions.ts` today. Plans delete gets no gate, by that existing
  convention.
- Exchange Rates: nothing to gate (no delete endpoint exists).

New export in `config/permissions.ts`, sibling to `SPATIAL_RESOURCE_DELETE_ROLE` (not
folded into it — Business Hours isn't a spatial resource, it just lives in that nav
section):

```ts
export const BUSINESS_HOURS_DELETE_ROLE: Role = "admin"
export function canDeleteBusinessHours(): boolean {
  return useAuthStore().isRoleGranted(BUSINESS_HOURS_DELETE_ROLE)
}
```

One function covers both the weekly-schedule row delete and the exception row delete — both
endpoints carry the identical rule, so two identically-shaped wrapper functions would be
pure duplication.

## File layout

Services are always flat under `src/add-os/services/` in this codebase — never nested
under `modules/` (confirmed: every existing service, including `companies.ts` whose types
live in `modules/members/types/`, sits directly in `services/`). Only `types/`, `config/`,
and `views/` are nested per-module.

```
src/add-os/services/
  plans.ts                       (createResourceApi — full CRUD)
  exchange-rates.ts              (list + create only — NOT createResourceApi, its 5-verb
                                   shape doesn't fit a 2-verb resource)
  business-hours.ts              (createResourceApi)
  business-hour-exceptions.ts    (createResourceApi)

src/add-os/modules/plans/
  types/plan.ts
  config/plans.config.ts        (columns, field descriptors, empty-payload factory)
  views/PlansPage.vue

src/add-os/modules/payments/
  types/exchange-rate.ts
  config/exchange-rates.config.ts  (columns, field descriptors, latestRatesByCurrency)
  views/ExchangeRatesPage.vue

src/add-os/modules/spatial/     (existing module — Business Hours joins it)
  types/business-hour.ts
  types/business-hour-exception.ts
  config/business-hours.config.ts       (weekly-schedule columns/fields)
  config/business-hour-exceptions.config.ts
  views/BusinessHoursPage.vue        (two n-tabs: Weekly Schedule, Exceptions; branch picker
                                       reuses the existing branches.ts service)
```

`modules/payments/` is new (no existing module for it yet); `plans` likewise. Both mirror
the shape `modules/members/` already established (types/config/views, no `components/`
subfolder needed since neither module needs a shared cross-page component).

## UI notes

- **Plans table**: price column renders `formatCurrency(price, {currency: pricing_currency})`;
  when `converted_amount`/`converted_currency` are present on a row (i.e. the active
  `currency` header differs from that plan's own), a secondary muted line shows the
  converted figure — this is the only place the brief's "currency header projection"
  checkpoint is actually visible, since the base `price`/`pricing_currency` never change.
- **Exchange Rates page**: list-only table (no edit/delete row actions — neither exists),
  a "New rate" button opening `ResourceFormDrawer` in create-only mode, and a small stat-card
  row built from `latestRatesByCurrency()` showing the current USD→SYP rate.
- **Business Hours page**: a branch `n-select` (via `listBranches()`) above two `n-tabs`;
  each tab is its own `ResourceTable` + `ResourceFormDrawer` pair, both queried with
  `?branch_id=`.

## Testing

Following the Company Pipeline precedent (the most recently established test pyramid in
this codebase, `modules/members/`): a service spec per new service file (mirroring
`branches.spec.ts`), a config spec wherever there's actual logic to test
(`latestRatesByCurrency`, matching `companies.config.spec.ts`'s `quotedRequestOptions`
precedent), `permissions.spec.ts` additions for `BUSINESS_HOURS_DELETE_ROLE`, and
source-string wiring assertions per page (matching `CompaniesPage.spec.ts`'s style — this
codebase does not mount full pages with Vue Test Utils). The ar/en parity test
(`lang/__tests__/messages.spec.ts`) needs no changes — it walks both bundles generically and
will start covering the new keys automatically.

## Addendum (during implementation planning, 2026-08-20)

Writing the implementation plan surfaced one thing this design didn't anticipate: Exchange
Rates has no per-row edit action at all (no such endpoint exists), but ResourceTable's
`onEdit` prop is currently required, which would force either a no-op edit button (this
codebase's "no shipped control may be a no-op" rule forbids that) or a bespoke table just
for this one page. Resolved by making `onEdit` optional on `ResourceTable` (hiding the
whole actions column when absent, mirroring how `onDelete` already works) - a small,
isolated change to a shared component, confirmed clean of the unrelated stray
`ResourceFormDrawer.vue` diff already flagged elsewhere in this doc. See the implementation
plan's Task 1. Nothing above is superseded - this is an addition the original design didn't
need to consider until the task breakdown reached Exchange Rates' actual row-action shape.

## Addendum (post-implementation verification, 2026-08-22)

Task 11's final verification pass reviewed all 10 implementation tasks' commits against this
design and found two implementation-time deviations from the plan's literal sample code,
both already logged in `.superpowers/sdd/2026-08-20-plans-exchange-rates-business-hours/progress.md`
and reproduced here so the design record carries them too. Nothing above is superseded —
both are corrections to sample code, not to a design decision.

1. **Task 8 — `timeRule` early-return guard.** The plan's Step-3 sample `timeRule` validator,
   transcribed literally, had no early return for the `required=false` + empty/null case and
   would have failed the plan's own listed test for that case. The implementer added an
   early-return guard (`if (!required && (value === "" || value === null)) return true`)
   before the pattern check — see `src/add-os/modules/spatial/config/business-hours.config.ts`.
   Ruling recorded in `progress.md`: the fix is correct and necessary; the plan's sample code
   had a latent bug; no further action needed.

2. **Task 10 — import reordering via `eslint --fix`.** `BusinessHoursPage.vue`'s brief code
   block, transcribed verbatim, failed this repo's pre-existing `perfectionist/sort-imports`/
   `sort-named-imports` rules (confirmed clean on `SeatsDesksPage.vue`/`BranchesPage.vue`, so
   not a rule introduced by this task). The implementer ran `eslint --fix` on the affected
   files, which reordered import statements and one named-import group only — no logic or
   string literals changed. Full detail in
   `.superpowers/sdd/2026-08-20-plans-exchange-rates-business-hours/task-10-report.md`
   ("Deviation from brief: import ordering").

No other deviations from this design surfaced during the Task 11 review of the full commit
range (`8f88f97..a0dca3f`) against the sections above.
