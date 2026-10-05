# Sales and coupons on the dashboard — design

**Date:** 2026-10-05 · **Branch:** `feat/add-point-frontend` · **Status:** awaiting review

## 1. Scope

Approved 2026-10-05:

- **Piece 1:** a coupons admin page (list, details, redemption log, create/edit,
  delete with a manual "deactivate instead" when the server returns 409).
- **Piece 2:** sale fields in the space form and the plan form.
- **Deferred:** an admin booking-detail screen that renders `breakdown.lines`. That's a
  separate piece of work. The calendar quote card
  ([BookingCalendarPage.vue:411](../../../src/add-os/modules/booking/views/BookingCalendarPage.vue))
  already lists every non-`base` line by its server `label`, so it shows `sale` and
  the plan-discount line with no change. It never shows `coupon`: reception does not
  accept coupons.
- **Not this repo:** everything on the member side (browsing sales, `coupons/preview`,
  `coupon_code` at checkout) belongs to the Flutter app.

The dashboard calculates **no price**. It shows what the server sends as-is and leaves
every rule (sale below price, all-three-or-none, target fits purpose) to the server's 422.

## 2. Sources

- Endpoints and bodies: the API snapshot **pinned 2026-10-05**
  (`docs/api/ADD-OS.postman_collection.json`, folder `Admin (Dashboard) / Coupons`, plus
  `Create/Update Space` and `Create/Update Plan`). Re-pinned as step 0 of this work.
- Things the collection doesn't say, read from ADDCore on branch `feat/add-point-system`
  (merge of `feat/pricing-offers-coupons`):
  - Routes: `routes/api/v1/admin.php`. The three coupon reads are in the shared
    `admin|operations` group. `POST`/`PUT|PATCH`/`DELETE` are in the `role:admin` group.
  - Validation: `StoreCouponRequest`/`UpdateCouponRequest`. Update has the same rules as
    create, so `code`, `discount_type` and `discount_value` are always required.
    `ValidatesSaleWindow` covers the sale fields.
  - Response shapes: `CouponResource`, `CouponRedemptionResource`. `PlanResource` sends
    the `sale_*` fields only on `api/v1/admin/*`. `SpaceResource` always sends them.
  - Times: `InterpretsLocalTimes`. A bare `YYYY-MM-DD HH:mm` is read as district
    time. A value carrying `Z` or an offset is taken as-is.
- Corrections from the product owner (2026-10-05) are folded in below and marked **[PO]**.

## 3. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | Coupons page goes at `/plans/coupons` (nav key `plans.coupons`), after `wallet`. | Pricing already lives in that section (packages, wallet). A 14th top-level section has a cost (see `.claude/rules/shell-and-controls.md`). **Open to correction at review.** |
| D2 | New module `src/add-os/modules/pricing/` holds the coupon types, views and components, plus the sale helpers. | Mirrors the backend `App\Domain\Pricing`. Sales touch spaces *and* plans, so they belong to neither. |
| D3 | Write gate: `canManageCoupons()` in `config/permissions.ts`, role-based (`COUPON_MANAGEMENT_ROLE = "admin"`). | Backend enforcement is `role:admin` middleware, not `permission:`. Must stay in that file (`no-inline-role-checks`). Like the other gates, it only decides **whether a control is shown**; the 403 still comes from the server. |
| D4 | Sale fields take no gate of their own. | `spaces` and `plans` sit in the shared `admin|operations` group in ADDCore, so whoever can edit the form can set a sale. |
| D5 | Extract a `DateTimeInput.vue` component from `ResourceFormDrawer`'s datetime branch. Reuse it in the plan form and the coupon form. | There are three consumers. Copying the date+time pair would mean three copies of the "09:00 not midnight" rule and the offset serialization. |
| D6 | Every coupon write is a **full payload**. | **[PO]** The server requires `code`, `discount_type` and `discount_value` on every update. |
| D7 | Delete never deactivates automatically. | **[PO]** A 409 shows the server's `message` and a "Deactivate instead" button. The admin clicks it and confirms first. |
| D8 | Sale badge in the space and plan lists (sale price + window, running or scheduled). | Without it, a running sale is invisible until someone opens the form. It works out a **status** from two dates and calculates no price. **Optional: drop it at review if unwanted.** |

## 4. Time handling **[PO]**

- **Reading:** `starts_at`, `ends_at` and `sale_*_at` arrive as ISO-8601 UTC with `Z`.
  They're displayed with `formatDateTime` (browser-local clock, `utils/format`), and fed
  to `DateTimeInput`, which parses them to a local `Date`.
- **Sending:** `DateTimeInput` writes `toOffsetIso(date)`, for example
  `2026-10-05T09:00:00+03:00`, so the offset is always explicit. That's the existing
  rule in `utils/format/dates.ts`. A value passed back unchanged from a `GET` keeps its
  `Z`, which is also explicit.
- **Never** a bare clock built from UTC parts. A helper test locks this in: every time
  field in a built payload either matches `/(Z|[+-]\d\d:\d\d)$/` or is `null`.
- An empty picker gives `""`. The payload builders turn `""` into `null`.

## 5. Piece 1 — coupons

### 5.1 Types (`modules/pricing/types/coupon.ts`)

```ts
type CouponDiscountType = "percentage" | "amount_off"
type PricingPurpose = "booking" | "coworking_session" | "plan_purchase" | "event_registration"

interface CouponTarget { id?: number; purpose: PricingPurpose; plan_id: number | null;
  space_id: number | null; space_type: SpaceType | null; event_id: number | null }

interface Coupon {                       // CouponResource
  id: number; code: string; name: Bilingual | null; description: Bilingual | null
  source: string | null; discount_type: CouponDiscountType; discount_value: number
  max_discount_points: number | null; min_amount_points: number | null
  combinable_with_offers: boolean; usage_limit: number | null; per_user_limit: number | null
  new_members_only: boolean; company_id: number | null
  starts_at: string | null; ends_at: string | null; is_active: boolean
  used?: number                          // list + detail
  targets?: CouponTarget[]               // list + detail + create response
  user_ids?: number[]                    // detail + create response ONLY [PO]
  created_by: number | null; created_at: string
}

interface CouponRedemption {             // CouponRedemptionResource
  id: number; user: { id: number; name: string; phone: string } | null; purpose: PricingPurpose
  booking_id: number | null; walkin_session_id: number | null
  event_attendee_id: number | null; payment_id: number | null
  discount_type: CouponDiscountType; discount_value: number; max_discount_points: number | null
  base_points: number; points_discounted: number; counts: boolean; created_at: string
}

type CouponPayload = Omit<Coupon, "id" | "source" | "used" | "created_by" | "created_at" | "targets" | "user_ids">
  & { targets: Omit<CouponTarget, "id">[]; user_ids: number[] }
```

`PRICING_PURPOSES` and `ITEM_KEYS_BY_PURPOSE` (`plan_purchase → [plan_id]`,
`booking|coworking_session → [space_id, space_type]`,
`event_registration → [event_id]`) are exported constants. The UI uses them to offer only
the item kinds that fit the purpose. The server stays the judge of what's valid.

### 5.2 Service (`services/coupons.ts`)

| Function | Call | Returns |
|---|---|---|
| `listCoupons(query)` | `GET admin/coupons` (`search`, `is_active`, `state`, `page`, `per_page`) | `Paginated<Coupon>` via `toPaginated` |
| `getCoupon(id)` | `GET admin/coupons/{id}` | `Coupon` (with `user_ids`) |
| `listCouponRedemptions(id, page)` | `GET admin/coupons/{id}/redemptions` | `Paginated<CouponRedemption>` |
| `createCoupon(payload)` | `POST admin/coupons` | `Coupon` (201) |
| `updateCoupon(id, payload)` | `PUT admin/coupons/{id}` | `{ message }` |
| `deleteCoupon(id)` | `DELETE admin/coupons/{id}` | `void` (204). A 409 is rethrown as `ApiError` with status 409 and the server `message` |

Pure helper `couponToPayload(coupon: Coupon): CouponPayload` turns a `GET {id}` response
into a full write body. It drops `id/source/used/created_by/created_at`, drops each
target's `id`, and keeps `starts_at`/`ends_at` exactly as received (with `Z`). It
**requires** `user_ids` to be present and throws if it isn't. That makes "toggle from a
list row" impossible to build by accident: list rows have no `user_ids`, and sending
`[]` would wipe the member restriction.

### 5.3 List page (`modules/pricing/views/CouponsPage.vue`)

Uses the `PaymentTransactionsPage` pattern: server-paged `n-data-table` (`remote`),
`PAGE_SIZE = 20`, search debounced by 350 ms, newest request wins, filters reset to page 1.

- **Header:** title, description, refresh, and **New coupon** (only when `canManageCoupons()`).
- **Filters:** search on code · state (`running` / `scheduled` / `ended`) · active (yes/no → `1`/`0`).
- **Columns:**
  - code (`<bdi dir="ltr">`, monospace)
  - name (localized, `—` if empty)
  - discount: `20%`, or `50 points`; the cap is added as a sub-line
  - targets: "All purchases" when empty, otherwise one tag per purpose
  - usage: `used / usage_limit`, or `used / ∞`, through `formatNumber` (e.g. `3 / 10`)
  - validity: local start → end, `—` for an open end
  - active: a switch for admins, a read-only tag otherwise
  - actions: edit and delete, admins only
- **Active switch (admin):** `getCoupon(id)` → `couponToPayload` → flip `is_active` →
  `updateCoupon`. Then reload the row's page. The switch shows a loading state, and
  a failure reverts it and shows the server `message`.
- **Clicking a row** opens the detail drawer.

### 5.4 Detail drawer (`modules/pricing/components/CouponDetailDrawer.vue`)

Loads `getCoupon(id)` and shows:
- every term as a `dl` list
- the targets, resolved to names (plan/space/event from the lists loaded for the
  pickers; `space_type` through the existing `spaces.spaceType.*` i18n)
- the company name, the member names, and `created_at`

Below that, the **redemption log**: a paged table with member (name and LTR phone), purpose,
linked record (`#id` of whichever of the four is set), base points, points discounted,
date, and a state tag. **`counts: false` shows as "Refunded" (neutral tag); `true` shows
as "Used"** **[PO]**.

### 5.5 Form drawer (`modules/pricing/components/CouponFormDrawer.vue`)

A custom component, not `ResourceFormDrawer`, because a repeating `targets` list and
client-side member search don't fit the field descriptors. It's a Naive `n-drawer` with
`n-form`, `defineModel<boolean>("show")` (see the `update:show` icon-harvest trap), and
these sections:

1. **Basics:** `code` (uppercased as you type, `maxlength=40`, hint about allowed
   characters), `name` ar/en, `description` ar/en, `is_active` (default `true`).
2. **Discount:** `discount_type` radio; `discount_value` integer ≥ 1 (max 100 for a
   percentage); `max_discount_points`, shown for a percentage only, and sent as `null`
   when the type is `amount_off`.
3. **Conditions:** `min_amount_points` (empty → `null`; the hint says it is compared
   with the price after sales), `combinable_with_offers` (default `true`).
4. **Limits:**
   - `usage_limit`: number input plus an "Unlimited" checkbox. Defaults to unlimited
     (`null`).
   - `per_user_limit` **[PO]**: number input plus an "Unlimited" checkbox. It
     **defaults to `1`**, and ticking "Unlimited" sends `null`. The field is always
     sent, so "unlimited" is never confused with "left out" (where the server would
     fall back to 1).
5. **Eligibility:** `new_members_only`; `company_id` (`listCompanies()`, filterable,
   clearable); `user_ids` (multi-select over `listUsers({ role: "member" })`, filterable
   on name and phone; empty means everyone).
6. **Validity:** `starts_at` / `ends_at` through `DateTimeInput`, both clearable.
7. **Targets:** "Applies to all purchases except wallet top-ups" when empty. Each row
   has:
   - a purpose select;
   - an item-kind select limited to `ITEM_KEYS_BY_PURPOSE[purpose]`, plus "Any";
   - an item select: plans from `listPlans()`, spaces from `listSpaces()`, space types
     from `SPACE_TYPES`, events from `listEvents()`;
   - a remove button.

   Changing the purpose clears the item.

**Pickers** load once, the first time the drawer opens, and are reused by the detail drawer.

**Shell — changed 2026-10-05 after review:** the form opens in a card dialog (`n-modal preset="card"`, the shell `ResourceFormDrawer` gives every other create/edit form), not the side drawer first designed. Asked for by the product owner for consistency across pages. What was given up: the drawer's full-height room for the rule rows; the dialog compensates with a wider `max-width: 40rem` and a scrolling body. The details view (§5.4) stays a drawer.

**Submitting** always sends the full `CouponPayload`, including `targets` and `user_ids`.
In edit mode the form is seeded from `getCoupon(id)`, so `user_ids` are the real ones.
Create returns the coupon; update returns `{ message }`, which is shown as a success toast.
Either way the list reloads.

**422 handling:** `errors` from `ApiError.data.errors` map to field feedback by key,
including `name.ar` and `name.en`. Keys `targets.N` and `targets.N.*` show under row N
**[PO]**. Keys `user_ids.N` collapse onto the `user_ids` field. Any key with no field
falls back to an `n-alert` at the top, so no error is dropped silently.

### 5.6 Delete **[PO]**

1. Confirm dialog → `deleteCoupon(id)`.
2. **204:** success toast, reload.
3. **409:** a second dialog shows the server `message` as-is, with a **Deactivate
   instead** button. Clicking it runs another confirm, then
   `getCoupon` → `couponToPayload` → `is_active: false` → `updateCoupon` → reload.
   Nothing is deactivated without both clicks.

## 6. Piece 2 — sale fields

### 6.1 Shared helpers (`modules/pricing/utils/sale.ts`)

- `type SaleState = "running" | "scheduled" | "ended" | "none"`, and
  `saleState(startsAt, endsAt, now = new Date())`. Used by the list badge only (D8).
- `normalizeSale(payload, priceKey)` turns `""` / `undefined` into `null` on the three
  keys. **It never drops the keys.** All three empty sends all three `null`, which ends
  a running sale and does nothing when there's no sale **[PO]**. A partial fill is sent
  as it is, and the server's `required_with` 422 lands on the missing field.

### 6.2 Space

- `Space` and `SpacePayload` gain `sale_hourly_rate_points: number | null` and
  `sale_starts_at` / `sale_ends_at: string | null`.
- `buildSpaceFields` adds three descriptors after `hourly_rate_points`: number
  (`integer`, `min: 0`) and two `datetime` fields. All three have
  `disabledWhen: model => model.hourly_rate_points === null` and a hint saying a space
  with no hourly rate takes no sale **[PO]**.
- A switch-style "End sale" control would be a fourth field. Instead, the hint tells
  the admin to clear the three fields. *(If you'd rather have a button, it needs a new
  `action` field type in `ResourceFormDrawer`. That's a bigger change, so say so at
  review.)*
- `SpacesPage.openEdit` seeds the three values from the row. `submit` runs
  `normalizeSale(payload, "hourly_rate_points")`.
- Server errors on `sale_hourly_rate_points`, `sale_starts_at` and `sale_ends_at` show
  through `ResourceFormDrawer`'s existing per-key `fieldErrors` **[PO]**.
- Badge (D8): in `buildSpaceColumns`' hourly-rate cell, a running or scheduled sale adds
  a tag reading "Sale 80 points · until 12 Oct 09:00" (or "from …").

### 6.3 Plan

- `Plan` and `PlanPayload` gain `sale_price_points`, `sale_starts_at`, `sale_ends_at`
  (nullable). `PlansPage` loads through `admin/plans`, where the fields are present
  **[PO]**.
- `PlanFormDrawer`, "Pricing" card, adds a **Sale** sub-block below the price row:
  - `n-input-number` for `sale_price_points`: clearable, integer, `min 0`, `null` when
    empty. `PlanStepper` has no empty state, so it isn't used here.
  - two `DateTimeInput`s.
  - an **End sale** text button that sets all three to `null`. It shows only while one
    of them is set.
  - errors from `errors['sale_price_points']`, `errors['sale_starts_at']` and
    `errors['sale_ends_at']` show under their inputs **[PO]**.
- `handleSubmit` runs `normalizeSale(payload, "price_points")`. `emptyPlanPayload()`
  starts all three as `null`.
- **Styling:** the drawer today uses hard-coded hex values in arbitrary Tailwind
  classes. The new block uses theme tokens and Naive components only, and adds no new
  hex. The existing hex is noted as pre-existing debt and left alone (out of scope).
- Badge (D8): same as for spaces, in `plans.config.ts`' price cell.

## 7. `DateTimeInput.vue` (D5)

`src/add-os/components/form/DateTimeInput.vue`. `defineModel<string | null>()` plus a
`clearable` prop. It's lifted out of `ResourceFormDrawer` without changing behaviour:
- two pickers
- an untouched time defaults to 09:00
- a time picked before a date means today
- it writes `toOffsetIso`
- clearing the date writes `null`

`ResourceFormDrawer` then renders `<DateTimeInput>` in its `datetime` branch. It maps
`null` back to `""` on write, so its stored value is exactly what it was before (the
announcement and event configs read `""` today). The
existing `ResourceFormDrawer.spec.ts` datetime tests must pass **unchanged**. If one
needs editing, that's a behaviour change, and it's flagged instead of hidden.

## 8. Nav, i18n, icons

- `sections.ts`: `{ key: "coupons", path: "coupons" }` in `plans`.
- `routes.ts`: `"plans.coupons" → CouponsPage.vue`.
- i18n in **both** `ar.json` and `en.json`:
  - `nav.pages.coupons`
  - `coupons.*` (page, filters, columns, form, detail, delete, redemption states)
  - `sale.*` (field labels, hints, badge, end-sale)
  - `pricing.purpose.*`

  Every Arabic value contains Arabic script, so nothing like a bare `%` or `JSON`.
- Icons are Carbon names (`carbon:ticket`, `carbon:tag`, `carbon:percentage`), then
  `pnpm icons`.

## 9. Testing

TDD per unit; Vitest with `@vue/test-utils`, API mocked at the service module.

| Spec | Proves |
|---|---|
| `services/__tests__/coupons.spec.ts` | each call's method, path and query; `toPaginated`; a 409 surfaces as `ApiError` 409 with `message` |
| `modules/pricing/utils/__tests__/coupon-payload.spec.ts` | `couponToPayload` strips the read-only keys and target ids, keeps `Z` times, throws without `user_ids` |
| `modules/pricing/utils/__tests__/sale.spec.ts` | `saleState` boundaries; `normalizeSale` keeps keys, `"" → null`, all-empty → three `null` |
| `components/form/__tests__/DateTimeInput.spec.ts` | 09:00 default, time-before-date = today, output matches the offset pattern, clear → `null` |
| `ResourceFormDrawer.spec.ts` (existing) | unchanged, still green |
| `modules/pricing/views/__tests__/CouponsPage.spec.ts` | `3 / 10` and `3 / ∞`; operations sees no new/edit/delete/switch; the switch does GET-then-PUT with the full body; delete 409 → message plus "deactivate instead", which PUTs only after confirming |
| `modules/pricing/components/__tests__/CouponFormDrawer.spec.ts` | `per_user_limit` defaults to `1`, "Unlimited" → `null`; `max_discount_points` → `null` for `amount_off`; `targets.1` error shows under row 2; an unknown error key reaches the top alert; the payload always has `targets` and `user_ids` |
| `CouponDetailDrawer` (same file or own) | `counts: false` renders "Refunded" |
| `spaces.config.spec.ts` (extend) | sale fields disabled without an hourly rate |
| Plan drawer (new small spec) | End sale nulls all three; `sale_price_points` 422 shows under the input |

**Gate before "done":** `pnpm test:unit` (all guards), `pnpm type-check`,
`pnpm lint:check`, `pnpm icons` with no diff, and `pnpm build`. Run them one after
another, never in parallel (forks-pool timeouts).

## 10. Docs touched in the same change

- `docs/api/README.md`: the re-pin (done in step 0).
- This spec.
- `CLAUDE.md` "Open" table: no change. Nothing here settles or opens an owner item.

## 11. Out of scope / not done

- Admin booking-detail screen (deferred, §1).
- Member-side flows (Flutter).
- Any client-side price, discount or "is it cheaper" logic.
- Restyling `PlanFormDrawer`'s existing hex.
- Leave the uncommitted `members/` edits (WalletTopUpDialog, ProfileTable,
  MemberProfilePage) untouched and out of every commit.
