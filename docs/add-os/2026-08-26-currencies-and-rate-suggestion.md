# Currencies management + exchange-rate suggestion review

**Built 2026-08-26.** Two additions to `src/add-os/modules/payments/`, plus one
correction to the page one of them extends.

Endpoint shapes here are read from **ADDCore source, not the pinned API snapshot** —
none of these routes exists in the collection. See
[`docs/api/UNPINNED-ENDPOINTS.md`](../api/UNPINNED-ENDPOINTS.md) for why that is a
different situation from a stale pin, and what to do when the collection catches up.

---

## The live bug found on the way in

**Every manual create from `ExchangeRatesPage` was failing with a 422 before this
change, and had been since 2026-08-20.** This was not part of the task; it was in the
way of it.

`exchange-rates.config.ts` offered `currency_code` as a single hardcoded, disabled
`"USD"` option, on the strength of a live probe that recorded "SYP/EUR/GBP/TRY/SAR all
rejected as 422 invalid — SYP is the fixed base currency". That was true when it was
measured. ADDCore's multi-currency migration then **inverted the base**:

- `2026_08_20_100000_create_currencies_table` seeds **USD with `is_base = true`**,
  guarded by `ExactlyOneBaseCurrencyTest`.
- `StoreExchangeRateRequest` validates
  `Rule::exists('currencies','code')->where(is_active = true, is_base = false)`.
- The base currency never gets a rate row at all — its rate to itself is definitionally
  1 (`ADDCore/docs/decisions/multi-currency-support.md`).

So `"USD"` went from *the only accepted value* to *the only rejected one*, and `"SYP"`
the reverse. Three further symptoms shared that single root cause, all corrected here:

| Symptom | Was | Now |
|---|---|---|
| `rate_to_base` column | `formatNumber(…, { fractionDigits: 4 })` — rounded a real SYP rate of `0.0000680272` to `"0.0001"` | `formatNumber(…)` — keeps the `decimal(20,10)` precision, strips trailing zeros, reads correctly at both magnitudes |
| Column + form labels | "Rate (SYP per 1 USD)" / "السعر (ليرة سورية لكل دولار)" — the reciprocal of what the field holds | "Rate (USD per 1 unit)" / "السعر (دولار لكل وحدة)" |
| Stat card | `stats.latestUsd`, filtering `currency_code === "USD"` — can never match again | `stats.latestFor`, one card per currency that has a rate |

`ExchangeRatesPage` also rendered `<n-alert>` and `<n-button>` without importing them.
This project registers no naive-ui components globally and its Vite `Components()`
plugin scans only `src/components/cards`, so both resolved to unknown elements. Fixed
in that file. **`PlansPage.vue` has the same two unresolved components and was left
alone** — out of scope here, recorded so it is not lost.

### The decision, and what it cost

The fix could have been one character-level edit: swap the hardcoded `"USD"` for
`"SYP"`. It was **deliberately not**, because Part A of this same change ships the page
that lets an admin add a fourth currency, at which point a second hardcoded literal
would be wrong again the same week.

`currency_code`'s options now come from `GET /admin/currencies`, filtered to active
non-base rows — the same predicate `StoreExchangeRateRequest` validates against.

What was given up, stated plainly:

- **`ExchangeRatesPage` now makes a second request.** Its failure is swallowed rather
  than surfaced as a page error: the rates table is still readable without it, and what
  an empty list costs is an empty currency dropdown, which is the honest state.
- **`ExchangeRate.currency_code` can no longer be a literal union.** The valid set is a
  database table an admin edits, so it is `string`, enforced at runtime through those
  options rather than at compile time. A union would need re-editing on every new
  currency — the thing the migration existed to stop.

Both reversals are recorded in place, not overwritten: `types/exchange-rate.ts` and
`exchange-rates.config.ts` each keep the original note verbatim under an
"ORIGINAL NOTE" heading with the reversal appended below it.

---

## Part A — `CurrenciesPage`

`GET/POST /admin/currencies`, `PATCH /admin/currencies/{code}`,
`PATCH /admin/currencies/{code}/status`.

**The primary key is a `code` string, not an autoincrement id.** That single fact
decides three structural choices:

- **`services/currencies.ts` is hand-written, not `createResourceApi()`.** Every route
  that factory builds is `${base}/${id}` with `id: number`, and its update verb is
  `PUT` where this resource wants `PATCH`. `services/companies.ts` is the existing
  precedent for a resource that deviates from the generic five verbs.
- **The page uses `n-data-table` directly, not `ResourceTable`.** That component's
  generic is `T extends { id: number }` and its `rowKey` returns `row.id`. `CompaniesPage`
  already renders the same `add-ledger-table` card without the wrapper. Nothing is lost:
  the wrapper's other job is the delete column, and this resource has no destroy route.
- **`useCurrencyMutations` rather than `useResourceMutations`.** The shared composable's
  `update`/`remove` are typed `(id: number, …)`, there is no destroy route to fill
  `remove` with, and `updateStatus` is a fourth verb its create/update/remove triplet
  has no slot for. Filling `remove` with a rejecting stub was the alternative — and
  `ExchangeRatesPage`'s own comment on having had to do exactly that ("never invoked,
  only present to satisfy useResourceMutations' shared shape") is the argument against
  repeating it. Mirrors `useCompanyMutations`, which exists for the same reason.

### No delete, ever

There is no destroy route. Plans, spaces, bookings and users all carry a real FK to
`currencies.code` with `restrictOnDelete()`. **Deactivating via the status endpoint is
the removal path**, so no delete control is rendered — per the invariant that a shipped
control may not be a no-op, a delete button here would be one that can only fail.

### The base currency's status control

`CurrencyController::updateStatus()` answers a hard 422
(`api.currency.base_currency_status_locked`) for `is_base`, because
`CurrencyConversionService` and `CurrencyResolver` both assume one always-active base
row exists.

The base row therefore renders **a "Base" / "أساسية" badge where every other row renders
a switch** — not a switch rendered `disabled`. A greyed-out control only poses the
question "why can't I click this?", which is the same objection `ResourceTable` already
documents for its own delete button; the badge answers it. And `toggleStatus` refuses a
base row independently of what was rendered, so the rule holds even if something reaches
past the control. Neither half is load-bearing alone, and both are tested.

### Form fields

| Field | Create | Edit | Rule mirrored from |
|---|---|---|---|
| `code` | yes | **no** | `size:3\|regex:/^[A-Z]{3}$/\|unique` |
| `name` (`{ar,en}`) | yes | yes | `TranslatableField::rules('name')` |
| `symbol` | yes | yes | `nullable\|string\|max:10` |
| `decimal_places` | yes | yes | `required\|integer\|min:0\|max:6` |
| `order` | yes | yes | `nullable\|integer\|min:0` |
| `is_active` | **never** | **never** | separate endpoint |
| `is_base` | **never** | **never** | not settable through any endpoint |

`code` is withheld on edit because `UpdateCurrencyRequest` has no `code` rule at all — a
changed value would be **dropped in silence rather than rejected**, the worse of the two
failures. Leaving the field out means the drawer's `buildPayload()` cannot put it on the
wire either.

The `code` rule is mirrored case-sensitively rather than loosened to accept `usd` and
upper-casing on submit, so the rule an operator is held to is exactly the rule the server
holds them to. Uniqueness stays the server's: a duplicate lands back on the field as a
422 through `ResourceFormDrawer`'s existing handler.

---

## Part B — suggestion banner on `ExchangeRatesPage`

`GET /admin/exchange-rates/suggestion` (always 200, `id: null` when nothing is pending)
and `POST /admin/exchange-rates/suggestion/{id}/dismiss`.

A dismissible card above the table — not a page. Background in
`ADDCore/docs/decisions/exchange-rate-external-suggestion.md`.

### The direction problem

The feature exists around one hazard, and the backend says so in its own comment:
`rate_to_base` is **USD per 1 SYP**, `rate_usd_to_syp` is **SYP per 1 USD**. They are
reciprocals — `14700` versus `0.000068027`, four orders of magnitude apart.

- `rate_usd_to_syp` is the **headline**, because it is the number an admin recognises
  from outside this system. It is display-only and never submitted.
- `suggested_rate_to_base` is **copied verbatim** into the form and is what gets
  submitted. The client never computes it. `suggestionExchangeRatePayload` has a test
  asserting it copies rather than derives, using a fixture whose two fields are
  deliberately not reciprocals.
- Both are shown at once, the second as small print, so an admin can see at a glance
  that the inversion happened.

The server's own 10x plausibility band around `suggested_rate_to_base` (which fires only
when `suggestion_id` is present) is **not** mirrored client-side. It exists to catch a
client that forgot to invert; this page pre-fills and never computes, so the only way to
reach it is an admin deliberately typing a value 10x off the quote in front of them —
and the server is the right place to argue with that. `rate_to_base > 0` **is** mirrored.

### Carrying `suggestion_id`

Without it the backend cannot tell an accept from an unrelated manual rate: the
suggestion stays `pending`, the row is stamped `source = manual`, and the banner never
clears.

**`ResourceFormDrawer` needed no change to carry it.** It submits
`buildPayload(fields, model)`, which copies declared field keys only — so a hidden key
parked in the model would be dropped, and adding a hidden field type to that shared
component would have been the workaround the task said to stop and ask about instead.
It does not need one: the drawer hands its payload to the page's own `submit`, which
already owned a transform (`effective_from` → an instant). The id lives in a page-level
ref and is merged there. Same seam, not a new one.

The ref is cleared by `openCreate()`, set by `acceptSuggestion()`, and cleared again
only **after** the create resolves — so a 422 leaves the drawer open on a submission
that is still an accept.

### Two states, and one that renders nothing

- **`id === null` → nothing at all.** Not an empty state, not a "no suggestions" card.
  The scheduled fetch runs once daily and most quotes are resolved the same morning, so
  a placeholder would be permanent furniture above a table that does not need it.
- **`source_stale: true` → a distinct "no fresh rate data" state**, replacing the
  suggestion entirely. It **withholds Accept and keeps Dismiss**: accepting would write
  the stale figure into the live rate table under `source = external_accepted`, which is
  the outcome the flag exists to prevent, while the row is still pending and clearing it
  does not depend on the figure being fresh.
- `source_stale` is computed across *all* suggestions, so it can be `true` while `id` is
  `null`. `id === null` wins — the stale state's whole purpose is not presenting a stale
  figure as current, and with no pending row there is no figure.

### `deviation_percent`

Signed, so a drop and a rise are distinguishable, and rendered as a warning-toned chip
past **5%**. That threshold is **display-only and has no backend counterpart** — the only
threshold in `StoreExchangeRateRequest` is the 10x band, which answers a different
question (is this value broken, not is this move worth a second look). It gates nothing
and blocks nothing. Exported as `DEVIATION_WARNING_THRESHOLD_PERCENT`, one line to change
if operations want a different number.

`null` (no current rate to compare against) renders **no chip**, rather than "0%" —
which would claim a comparison that never happened.

---

## Navigation

One new page, `payments.currencies` → `/payments/currencies`, placed after
`exchangeRates` in the same section: the rates form's currency options are rows of this
resource, so the pair reads in the order they depend on each other.

## Tests

| File | Covers |
|---|---|
| `views/__tests__/CurrenciesPage.spec.ts` | create/edit round-trip; `code` offered on create and withheld on edit; the three-uppercase-letters rule; base row renders a badge and non-base rows a switch; `toggleStatus` refuses a base row when driven directly; no delete column |
| `views/__tests__/ExchangeRatesPage.spec.ts` | banner hidden when `id` is `null` and when the request fails; stale state renders distinctly and withholds Accept; Accept pre-fills `suggested_rate_to_base` (asserted *not* to be `rate_usd_to_syp`), pins SYP, pre-fills today; `suggestion_id` present on accept and absent on manual create; Dismiss calls the endpoint and clears; deviation sign/tone/null; currency options exclude base and inactive |
| `config/__tests__/exchange-rates.config.spec.ts` | `selectableRateCurrencies`, `emptyExchangeRatePayload`, `suggestionExchangeRatePayload` (copies rather than derives), `todayEffectiveFrom` UTC boundary, `hasPendingSuggestion` |
| `services/__tests__/currencies.spec.ts` | code-in-path routing, PATCH verbs, `""` → `null` symbol conversion |
| `services/__tests__/exchange-rates.spec.ts` | suggestion GET has no `{data}` envelope; dismiss POSTs with no body; `suggestion_id` on/off the wire. **Its fixtures were rewritten** from `currency_code: "USD"` / `rate_to_base: 14800` to `"SYP"` / `0.0000680272` — the old shape would have kept the suite green over a contract that no longer exists |

## Open

- **The canonical Postman collection has no record of any of these seven routes.** Not a
  stale pin — `api:collection:check` reports MATCH. Backend-side task; tracked in
  [`docs/api/UNPINNED-ENDPOINTS.md`](../api/UNPINNED-ENDPOINTS.md).
- **`docs/superpowers/specs/2026-08-20-plans-exchange-rates-business-hours-design.md`
  still documents the pre-migration contract** (`currency_code: "USD"`,
  `rate_to_base` as "SYP per 1 USD"). Left as-is: it is a dated design record of what
  was approved that day, and this file is the correction. Read them together.
- **`PlansPage.vue`** renders `<n-alert>` / `<n-button>` without importing them, and its
  `pricing_currency` field hardcodes `["USD","SYP"]` where the backend now validates
  against the `currencies` table. Same class of problem as the one fixed here, different
  page, not in this change's scope.
*(Nothing outstanding on the guards — see the two sections below for how the three
build-only failures were closed.)*

### Fixed here: `no-direct-company-http`'s build pass never read the build

A third build-only failure was found the same way and **has been repaired**, because it
was not a judgement call — the pass was inert.

`walk()` hardcoded `TEXT_EXT = /\.(?:ts|tsx|vue)$/i`, and the dist pass called
`walk(dist)` then filtered that result for `.js`/`.mjs`. Two disjoint sets: `distFiles`
was always `[]`, `text` always `""`, so `expect("".includes("/admin/companies")).toBe(true)`
**failed on every build that has ever existed** — a guaranteed red, not a vacuous green.
The markers were in the bundle throughout; nothing opened a `.js` file to look.

A guard that cries wolf on every build is worse than no guard: it teaches the next person
to skip or disable it. The repair, with no assertion weakened:

- `walk(dir, pattern, out)` now takes the extension pattern as a parameter — `TEXT_EXT`
  for the source scan, a new `BUNDLE_EXT` for the dist scan.
- `expect(distFiles.length).toBeGreaterThan(0)` runs **before** the contents are read, so
  "found nothing to read" can never again be indistinguishable from "the markers are
  gone".

Verified against a real build rather than by reasoning: 59 bundles scanned,
`/admin/companies` located in `assets/companies-*.js` and `assets/CompaniesPage-*.js`,
`/admin/private-office-requests` in `assets/private-office-requests-*.js`, and a negative
control marker matching 0 files.

### Also fixed here: `no-external-urls`'s two build-only failures — **owner decision**

Reported first, ruled on by the file's owner, then implemented. Both were closed by
**narrowing** the guard, not by exempting a failure: neither host retains the blanket
permission it had, and one of them never had a legitimate claim to it.

A new `SCOPED` list sits beside `ALLOWED`. `ALLOWED` permits a host everywhere both
passes look; `SCOPED` permits one host in one named set of files and nowhere else, and
may narrow further on the matched URL's **path**, not just its hostname. Both lists are
self-pruning — an entry that stops matching anything now fails its own test.

**`api.test` — removed from `ALLOWED`.** As a blanket entry it could never satisfy the
dist self-pruning check ("carries no allowlist entry that is no longer needed"), because
a Vitest mock hostname is not in the Vite graph and therefore cannot appear in any build,
fresh or stale. Deleting it outright would have broken the **source** pass, though: it
occurs in 25 spec files that the source scan reads. So it moved to `SCOPED`, restricted
to `src/add-os/**/__tests__/*.spec.ts`. Strictly tighter than before — `api.test` in a
shipped module, or in a non-spec helper inside a `__tests__` folder, is now a failure
where it previously passed.

**`github.com` — a scoped exemption, not a disabled check.** date-fns throws a RangeError
whose message links to its own docs, and naive-ui's pickers bundle date-fns, so the
literal rides into `dist/assets/InputNumber-*.js`. It is a substring of a thrown message;
nothing dereferences it. Two independent narrowings, either of which alone would still
catch a real reference:

- `appliesTo` — emitted bundle chunks only (`dist/assets/*.js`). `github.com` written in
  our own source is still a failure. This exempts a dependency's string, not a habit.
- `urlPattern` — the date-fns repository only. Any other `github.com` URL fails even
  inside the right chunk, so the exemption cannot widen when some future dependency
  starts embedding its own links.

**Negative controls are permanent tests, not a one-off check.** Twelve assertions drive
the exemption seam directly and assert the *outside* of each scope: `github.com` rejected
in `src/add-os/**`, `src/main.ts` and `index.html`; rejected in `dist/index.html`, in a
`.css`, and in a nested chunk; rejected for the naive-ui, mime and look-alike
`date-fns-attacker` URLs. Plus an end-to-end control that writes a real temp file
containing both hosts, scans it, and asserts both are reported — proving the scan emits a
finding rather than merely that the predicate declined.

The guard caught its own test data on the first run, which is the demonstration itself:
the fixture URLs are assembled from separate scheme constants (`` `https:${"//"}` ``) so
no contiguous scheme-plus-host literal exists in the file — the convention the guard's own
header already prescribed for naming a forbidden host in prose. No exemption was carved
out for the guard's own fixtures.

### Suite state, before and after

| | before this change | after |
|---|---|---|
| no build present | 69/69 files · 677 passed · **5 skipped** | 69/69 files · 688 passed · 6 skipped |
| **after `pnpm build:only`** | **2 files failed · 3 assertions** | **69/69 files · 694 passed · 0 skipped · 0 failed** |

The post-build suite is fully green for the first time. `dist/` was removed after
verification — it is gitignored, and the work started without one.
