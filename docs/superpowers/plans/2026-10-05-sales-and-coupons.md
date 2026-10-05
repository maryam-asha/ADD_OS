# Sales and Coupons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins a coupons page (list, details, redemption log, create/edit,
delete with a manual "deactivate instead"), and add sale fields to the space and plan
forms.

**Architecture:** A new `src/add-os/modules/pricing/` module holds coupon types, pure
helpers (payload building, form↔payload mapping, error grouping, sale normalisation)
and the three coupon views. Components stay thin over those helpers, and the helpers
carry the logic that's tested. A small `DateTimeInput.vue` is lifted out of
`ResourceFormDrawer` so all three forms send times the same way (`toOffsetIso`).

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Naive UI, Tailwind v4, vue-i18n (ar/en), Vitest + @vue/test-utils.

**Spec:** `docs/superpowers/specs/2026-10-05-sales-and-coupons-design.md` (read it first; this plan argues from it).

## Global Constraints

- Every user-visible string goes through vue-i18n, in **both** `ar.json` and `en.json`. Every Arabic value contains Arabic script (`messages.spec.ts`).
- No hex, no `rgb()`, no raw px for spacing/radius/font-size in new code under `src/add-os/`.
- Numbers render through `src/add-os/utils/format/` (`formatNumber`, `formatDateTime`).
- Role checks live only in `src/add-os/config/permissions.ts` (`no-inline-role-checks.spec.ts`, which also scans spec files, so don't name `isRoleGranted` in a spec under `modules/`).
- `v-model` components use `defineModel(...)`, never an `"update:*"` string emit (it breaks `pnpm icons`).
- Icons are `carbon:*` only; re-run `pnpm icons` after adding a name.
- Times **sent** are `toOffsetIso(...)` output or a server value passed back unchanged (ends in `Z`). Never a bare UTC clock.
- **No price calculation anywhere.** Show the server's `message` / labels as-is.
- Coupon writes are always the **full** payload (`code`, `discount_type`, `discount_value` required on update).
- Never stage `src/add-os/modules/members/**`. Those are the user's uncommitted edits. Stage files by explicit path, never `git add -A` or `git add .`.
- Never run `pnpm lint` (it writes). Verification uses `pnpm lint:check`. Run test/type-check/lint one at a time, never in parallel.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Toggling or deactivating a coupon restricted to specific members.** Expected: `user_ids` survive. Pinned in Task 2 (`setCouponActive` sends the detail's `user_ids`) and Task 1 (`couponToPayload` throws without them).
2. **Clearing a space's hourly rate while it has a sale.** Expected: the sale ends (three `null`) rather than a confusing 422. Pinned in Task 5 (`spaceSubmitPayload`).
3. **Browser not in the district timezone (staff on VPN abroad).** Expected: the clock sent carries the browser's own offset, and a `Z` value displays as the local clock. Pinned in Task 4.
4. **An empty coupon list or redemption log arriving as `"data": {}`.** Expected: an empty table, not a crash. Pinned in Task 2 (`toPaginated`).
5. **Filling only the sale price and leaving the dates empty.** Expected: the payload carries the price plus two `null`s (not dropped keys), so the server's `required_with` error lands next to the date fields. Pinned in Task 1 (`normalizeSale`).

---

## File map

| File | Responsibility |
|---|---|
| `src/add-os/modules/pricing/types/coupon.ts` | Coupon/redemption/payload types, purpose constants |
| `src/add-os/modules/pricing/utils/coupon-payload.ts` | `couponToPayload` (GET → full write body) |
| `src/add-os/modules/pricing/utils/coupon-form.ts` | form model ↔ payload, error grouping |
| `src/add-os/modules/pricing/utils/sale.ts` | `normalizeSale`, `saleState`, `renderSaleBadge` |
| `src/add-os/services/coupons.ts` | the six endpoints + `setCouponActive` |
| `src/add-os/config/permissions.ts` | `COUPON_MANAGEMENT_ROLE`, `canManageCoupons()` |
| `src/add-os/components/form/DateTimeInput.vue` | date+time pair → offset ISO |
| `src/add-os/components/resource/ResourceFormDrawer.vue` | uses `DateTimeInput` |
| `src/add-os/modules/spatial/{types/space.ts,config/spaces.config.ts,views/SpacesPage.vue}` | space sale fields + badge |
| `src/add-os/modules/plans/{types/plan.ts,config/plans.config.ts,views/PlansPage.vue,components/PlanFormDrawer.vue}` | plan sale block + badge |
| `src/add-os/modules/pricing/components/CouponFormDrawer.vue` | create/edit form |
| `src/add-os/modules/pricing/components/CouponDetailDrawer.vue` | details + redemption log |
| `src/add-os/modules/pricing/views/CouponsPage.vue` | list, filters, toggle, delete/409 |
| `src/add-os/navigation/{sections.ts,routes.ts}` | `plans.coupons` page |
| `src/add-os/lang/{ar/ar.json,en/en.json}` | `coupons.*`, `sale.*`, `pricing.*`, `nav.pages.coupons` |

---

### Task 1: Pricing types and pure helpers

**Files:**
- Create: `src/add-os/modules/pricing/types/coupon.ts`
- Create: `src/add-os/modules/pricing/utils/coupon-payload.ts`
- Create: `src/add-os/modules/pricing/utils/sale.ts`
- Test: `src/add-os/modules/pricing/utils/__tests__/coupon-payload.spec.ts`
- Test: `src/add-os/modules/pricing/utils/__tests__/sale.spec.ts`

**Interfaces:**
- Produces: the types `Coupon`, `CouponTarget`, `CouponTargetPayload`, `CouponPayload`, `CouponRedemption`, `CouponDiscountType`, `PricingPurpose`, `CouponState`, `TargetItemKey`; the constants `PRICING_PURPOSES`, `COUPON_STATES`, `ITEM_KEYS_BY_PURPOSE`; `couponToPayload(coupon: Coupon): CouponPayload`; `normalizeSale<T extends Record<string, unknown>>(payload: T, saleKey: SaleKey): T`; `saleState(startsAt: string | null, endsAt: string | null, now?: Date): SaleState`; `type SaleKey = "sale_hourly_rate_points" | "sale_price_points"`.

- [ ] **Step 1: Write the types**

`src/add-os/modules/pricing/types/coupon.ts`:

```ts
import type { Bilingual } from "@/add-os/components/resource/field-types"
import type { SpaceType } from "@/add-os/modules/spatial/types/space"

/**
 * A discount code as the dashboard reads and writes it — ADDCore
 * `CouponResource` / `StoreCouponRequest`, collection pinned 2026-10-05
 * (`Admin (Dashboard) / Coupons`).
 */
export type CouponDiscountType = "percentage" | "amount_off"
export const PRICING_PURPOSES = ["booking", "coworking_session", "plan_purchase", "event_registration"] as const
export type PricingPurpose = (typeof PRICING_PURPOSES)[number]
export const COUPON_STATES = ["running", "scheduled", "ended"] as const
export type CouponState = (typeof COUPON_STATES)[number]

export type TargetItemKey = "plan_id" | "space_id" | "space_type" | "event_id"

/**
 * Which item a target may name for its purpose — mirrors the backend's
 * `CouponTarget::itemsFor`. Used only to narrow what the form offers; the
 * server's 422 on `targets.N` stays the judge.
 */
export const ITEM_KEYS_BY_PURPOSE: Record<PricingPurpose, TargetItemKey[]> = {
	plan_purchase: ["plan_id"],
	booking: ["space_id", "space_type"],
	coworking_session: ["space_id", "space_type"],
	event_registration: ["event_id"]
}

export interface CouponTargetPayload {
	purpose: PricingPurpose
	plan_id: number | null
	space_id: number | null
	space_type: SpaceType | null
	event_id: number | null
}

export interface CouponTarget extends CouponTargetPayload {
	id: number
}

export interface Coupon {
	id: number
	code: string
	name: Bilingual | null
	description: Bilingual | null
	source: string | null
	discount_type: CouponDiscountType
	discount_value: number
	max_discount_points: number | null
	min_amount_points: number | null
	combinable_with_offers: boolean
	usage_limit: number | null
	per_user_limit: number | null
	new_members_only: boolean
	company_id: number | null
	/** ISO-8601 UTC (`…Z`); display with `formatDateTime`. */
	starts_at: string | null
	ends_at: string | null
	is_active: boolean
	/** Uses that still count against the limits. List and detail. */
	used?: number
	/** List, detail and create response. */
	targets?: CouponTarget[]
	/** Detail and create response ONLY — never on a list row. */
	user_ids?: number[]
	created_by: number | null
	created_at: string
}

export interface CouponPayload {
	code: string
	name: Bilingual | null
	description: Bilingual | null
	discount_type: CouponDiscountType
	discount_value: number
	max_discount_points: number | null
	min_amount_points: number | null
	combinable_with_offers: boolean
	usage_limit: number | null
	per_user_limit: number | null
	new_members_only: boolean
	company_id: number | null
	starts_at: string | null
	ends_at: string | null
	is_active: boolean
	targets: CouponTargetPayload[]
	user_ids: number[]
}

export interface CouponRedemption {
	id: number
	user: { id: number, name: string, phone: string } | null
	purpose: PricingPurpose
	booking_id: number | null
	walkin_session_id: number | null
	event_attendee_id: number | null
	payment_id: number | null
	discount_type: CouponDiscountType
	discount_value: number
	max_discount_points: number | null
	base_points: number
	points_discounted: number
	/** `false`: the record was cancelled, rejected or failed — the use was given back. */
	counts: boolean
	created_at: string
}
```

- [ ] **Step 2: Write the failing tests**

`src/add-os/modules/pricing/utils/__tests__/coupon-payload.spec.ts`:

```ts
import type { Coupon } from "@/add-os/modules/pricing/types/coupon"
import { describe, expect, it } from "vitest"
import { couponToPayload } from "../coupon-payload"

const detail: Coupon = {
	id: 7,
	code: "WELCOME20",
	name: { ar: "عرض الترحيب", en: "Welcome offer" },
	description: null,
	source: "admin",
	discount_type: "percentage",
	discount_value: 20,
	max_discount_points: 200,
	min_amount_points: null,
	combinable_with_offers: true,
	usage_limit: 10,
	per_user_limit: 1,
	new_members_only: false,
	company_id: null,
	starts_at: "2026-10-05T06:00:00.000000Z",
	ends_at: null,
	is_active: true,
	used: 3,
	targets: [{ id: 91, purpose: "booking", plan_id: null, space_id: null, space_type: "room", event_id: null }],
	user_ids: [4, 9],
	created_by: 1,
	created_at: "2026-10-05T05:00:00.000000Z"
}

describe("couponToPayload", () => {
	it("keeps every writable field and drops the read-only ones", () => {
		const payload = couponToPayload(detail)
		expect(payload).toEqual({
			code: "WELCOME20",
			name: { ar: "عرض الترحيب", en: "Welcome offer" },
			description: null,
			discount_type: "percentage",
			discount_value: 20,
			max_discount_points: 200,
			min_amount_points: null,
			combinable_with_offers: true,
			usage_limit: 10,
			per_user_limit: 1,
			new_members_only: false,
			company_id: null,
			starts_at: "2026-10-05T06:00:00.000000Z",
			ends_at: null,
			is_active: true,
			targets: [{ purpose: "booking", plan_id: null, space_id: null, space_type: "room", event_id: null }],
			user_ids: [4, 9]
		})
	})

	it("passes times back unchanged, so they keep their Z", () => {
		expect(couponToPayload(detail).starts_at).toMatch(/Z$/)
	})

	it("refuses a list row, which carries no user_ids", () => {
		const { user_ids: _omit, ...row } = detail
		expect(() => couponToPayload(row)).toThrow(/user_ids/)
	})
})
```

`src/add-os/modules/pricing/utils/__tests__/sale.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { normalizeSale, saleState } from "../sale"

describe("normalizeSale", () => {
	it("turns empty values into null and keeps all three keys", () => {
		const out = normalizeSale({ price_points: 120, sale_price_points: undefined, sale_starts_at: "", sale_ends_at: "" }, "sale_price_points")
		expect(out).toEqual({ price_points: 120, sale_price_points: null, sale_starts_at: null, sale_ends_at: null })
	})

	it("sends a partial fill as it is, so the server can name the missing field", () => {
		const out = normalizeSale({ sale_hourly_rate_points: 80, sale_starts_at: "", sale_ends_at: null }, "sale_hourly_rate_points")
		expect(out).toEqual({ sale_hourly_rate_points: 80, sale_starts_at: null, sale_ends_at: null })
		expect(Object.keys(out)).toEqual(["sale_hourly_rate_points", "sale_starts_at", "sale_ends_at"])
	})

	it("leaves set values alone", () => {
		const out = normalizeSale({ sale_price_points: 100, sale_starts_at: "2026-10-05T10:00:00+03:00", sale_ends_at: "2026-10-07T10:00:00+03:00" }, "sale_price_points")
		expect(out.sale_starts_at).toBe("2026-10-05T10:00:00+03:00")
	})
})

describe("saleState", () => {
	const now = new Date("2026-10-06T00:00:00Z")
	it("is none without a window", () => expect(saleState(null, null, now)).toBe("none"))
	it("is scheduled before the start", () => expect(saleState("2026-10-07T00:00:00Z", "2026-10-08T00:00:00Z", now)).toBe("scheduled"))
	it("is running inside the window, start inclusive", () => expect(saleState("2026-10-06T00:00:00Z", "2026-10-08T00:00:00Z", now)).toBe("running"))
	it("is ended at the end, end exclusive", () => expect(saleState("2026-10-01T00:00:00Z", "2026-10-06T00:00:00Z", now)).toBe("ended"))
})
```

- [ ] **Step 3: Run them to verify they fail**

Run: `pnpm vitest run src/add-os/modules/pricing/utils`
Expected: FAIL, "Failed to resolve import ../coupon-payload" / "../sale".

- [ ] **Step 4: Implement**

`src/add-os/modules/pricing/utils/coupon-payload.ts`:

```ts
import type { Coupon, CouponPayload } from "@/add-os/modules/pricing/types/coupon"

/**
 * A coupon as read from `GET admin/coupons/{id}`, turned into the full body
 * `PUT` requires — the server validates `code`, `discount_type` and
 * `discount_value` on every update, so nothing is ever sent partially.
 *
 * Throws without `user_ids`: only the detail endpoint carries them, and a
 * body built from a list row would send `[]` and silently lift the coupon's
 * member restriction. Times go back exactly as read — they end in `Z`, which
 * the server takes at its word.
 */
export function couponToPayload(coupon: Coupon): CouponPayload {
	if (!Array.isArray(coupon.user_ids)) {
		throw new TypeError("couponToPayload needs the coupon detail: user_ids is missing")
	}
	return {
		code: coupon.code,
		name: coupon.name,
		description: coupon.description,
		discount_type: coupon.discount_type,
		discount_value: coupon.discount_value,
		max_discount_points: coupon.max_discount_points,
		min_amount_points: coupon.min_amount_points,
		combinable_with_offers: coupon.combinable_with_offers,
		usage_limit: coupon.usage_limit,
		per_user_limit: coupon.per_user_limit,
		new_members_only: coupon.new_members_only,
		company_id: coupon.company_id,
		starts_at: coupon.starts_at,
		ends_at: coupon.ends_at,
		is_active: coupon.is_active,
		targets: (coupon.targets ?? []).map(({ purpose, plan_id, space_id, space_type, event_id }) => ({ purpose, plan_id, space_id, space_type, event_id })),
		user_ids: [...coupon.user_ids]
	}
}
```

`src/add-os/modules/pricing/utils/sale.ts`:

```ts
export type SaleKey = "sale_hourly_rate_points" | "sale_price_points"
export type SaleState = "running" | "scheduled" | "ended" | "none"

const TIME_KEYS = ["sale_starts_at", "sale_ends_at"] as const

function emptyToNull(value: unknown): unknown {
	return value === "" || value === undefined ? null : value
}

/**
 * The three sale fields, ready to send: an empty input becomes `null` and
 * no key is ever dropped. All three `null` ends a running sale (a no-op
 * when there is none); a partial fill goes as it is so the server's
 * `required_with` error lands on the field that is missing.
 */
export function normalizeSale<T extends Record<string, unknown>>(payload: T, saleKey: SaleKey): T {
	const out: Record<string, unknown> = { ...payload }
	out[saleKey] = emptyToNull(out[saleKey])
	for (const key of TIME_KEYS) out[key] = emptyToNull(out[key])
	return out as T
}

/** Where a sale's window stands — a status from two dates, never a price. */
export function saleState(startsAt: string | null, endsAt: string | null, now: Date = new Date()): SaleState {
	if (!startsAt || !endsAt) return "none"
	const time = now.getTime()
	if (time < Date.parse(startsAt)) return "scheduled"
	if (time < Date.parse(endsAt)) return "running"
	return "ended"
}
```

- [ ] **Step 5: Run them to verify they pass**

Run: `pnpm vitest run src/add-os/modules/pricing/utils`
Expected: PASS (10 tests).

- [ ] **Step 6: Commit**

```bash
git add src/add-os/modules/pricing/types/coupon.ts src/add-os/modules/pricing/utils/coupon-payload.ts src/add-os/modules/pricing/utils/sale.ts src/add-os/modules/pricing/utils/__tests__/coupon-payload.spec.ts src/add-os/modules/pricing/utils/__tests__/sale.spec.ts
git commit -m "feat(pricing): coupon types and sale helpers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Coupons service

**Files:**
- Create: `src/add-os/services/coupons.ts`
- Test: `src/add-os/services/__tests__/coupons.spec.ts`

**Interfaces:**
- Consumes: `Coupon`, `CouponPayload`, `CouponRedemption`, `couponToPayload` (Task 1); `get/post/put/del`, `ApiError` from `./api`; `toPaginated`, `Paginated`, `RawPaginatedResponse` from `./pagination`.
- Produces:
  - `listCoupons(query?: Record<string, unknown>): Promise<Paginated<Coupon>>`
  - `getCoupon(id: number): Promise<Coupon>`
  - `listCouponRedemptions(id: number, query?: Record<string, unknown>): Promise<Paginated<CouponRedemption>>`
  - `createCoupon(payload: CouponPayload): Promise<Coupon>`
  - `updateCoupon(id: number, payload: CouponPayload): Promise<{ message: string }>`
  - `deleteCoupon(id: number): Promise<void>`
  - `setCouponActive(id: number, active: boolean): Promise<{ message: string }>`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "../api"
import { createCoupon, deleteCoupon, getCoupon, listCouponRedemptions, listCoupons, setCouponActive, updateCoupon } from "../coupons"

vi.mock("@/add-os/config/env", () => ({ apiUrl: () => "http://api.test" }))

function jsonResponse(body: unknown, status = 200) {
	return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

const detail = {
	id: 7, code: "VIP", name: null, description: null, source: "admin", discount_type: "amount_off", discount_value: 50,
	max_discount_points: null, min_amount_points: null, combinable_with_offers: false, usage_limit: null, per_user_limit: 1,
	new_members_only: false, company_id: 3, starts_at: "2026-10-05T06:00:00.000000Z", ends_at: null, is_active: true, used: 2,
	targets: [], user_ids: [4, 9], created_by: 1, created_at: "2026-10-05T05:00:00.000000Z"
}

describe("coupons service", () => {
	beforeEach(() => vi.stubGlobal("fetch", vi.fn()))

	it("lists a page with its filters and keeps the meta", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [detail], meta: { current_page: 2, last_page: 3, per_page: 20, total: 41 } }))
		const page = await listCoupons({ search: "VI", state: "running", is_active: 1, page: 2, per_page: 20 })
		const url = String(vi.mocked(fetch).mock.calls[0][0])
		expect(url).toContain("http://api.test/api/v1/admin/coupons?")
		for (const part of ["search=VI", "state=running", "is_active=1", "page=2", "per_page=20"]) expect(url).toContain(part)
		expect(page.meta.total).toBe(41)
	})

	it("reads an empty list sent as {} as no rows", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: {} }))
		expect((await listCoupons()).data).toEqual([])
	})

	it("gets one coupon", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: detail }))
		expect(await getCoupon(7)).toEqual(detail)
		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/coupons/7", expect.objectContaining({ method: "GET" }))
	})

	it("pages the redemption log", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }))
		await listCouponRedemptions(7, { page: 1, per_page: 10 })
		expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("/api/v1/admin/coupons/7/redemptions?")
	})

	it("creates and updates with the full body", async () => {
		const { id: _i, source: _s, used: _u, created_by: _c, created_at: _a, ...payload } = detail
		vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ data: detail }, 201))
		await createCoupon(payload as never)
		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/coupons", expect.objectContaining({ method: "POST", body: JSON.stringify(payload) }))
		vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "Saved." }))
		expect(await updateCoupon(7, payload as never)).toEqual({ message: "Saved." })
		expect(fetch).toHaveBeenLastCalledWith("http://api.test/api/v1/admin/coupons/7", expect.objectContaining({ method: "PUT" }))
	})

	it("surfaces a 409 on delete with the server message", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "This code has been used." }, 409))
		const caught = await deleteCoupon(7).catch(error => error)
		expect(caught).toBeInstanceOf(ApiError)
		expect(caught.status).toBe(409)
		expect(caught.data.message).toBe("This code has been used.")
	})

	it("deletes with 204", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse(null, 204))
		await expect(deleteCoupon(7)).resolves.toBeUndefined()
	})

	it("sets active by re-reading the detail and sending all of it back", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ data: detail })).mockResolvedValueOnce(jsonResponse({ message: "Saved." }))
		await setCouponActive(7, false)
		const [url, init] = vi.mocked(fetch).mock.calls[1]
		expect(url).toBe("http://api.test/api/v1/admin/coupons/7")
		const body = JSON.parse(String((init as RequestInit).body))
		expect(body).toMatchObject({ code: "VIP", discount_type: "amount_off", discount_value: 50, is_active: false, user_ids: [4, 9], company_id: 3, starts_at: "2026-10-05T06:00:00.000000Z" })
		expect(body).not.toHaveProperty("used")
	})
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/add-os/services/__tests__/coupons.spec.ts`
Expected: FAIL, "Failed to resolve import ../coupons".

- [ ] **Step 3: Implement**

```ts
import type { Coupon, CouponPayload, CouponRedemption } from "@/add-os/modules/pricing/types/coupon"
import type { Paginated, RawPaginatedResponse } from "./pagination"
import { couponToPayload } from "@/add-os/modules/pricing/utils/coupon-payload"
import { del, get, post, put } from "./api"
import { toPaginated } from "./pagination"

/**
 * Discount coupons — collection pinned 2026-10-05, `Admin (Dashboard) /
 * Coupons`. Reads are open to admin and operations; writes are admin-only
 * on the server (`role:admin`), gated in the UI by `canManageCoupons()`.
 */
const BASE = "/api/v1/admin/coupons"

export async function listCoupons(query?: Record<string, unknown>): Promise<Paginated<Coupon>> {
	return toPaginated(await get<RawPaginatedResponse<Coupon>>(BASE, query))
}

/** The only read that carries `user_ids`. */
export async function getCoupon(id: number): Promise<Coupon> {
	return (await get<{ data: Coupon }>(`${BASE}/${id}`)).data
}

export async function listCouponRedemptions(id: number, query?: Record<string, unknown>): Promise<Paginated<CouponRedemption>> {
	return toPaginated(await get<RawPaginatedResponse<CouponRedemption>>(`${BASE}/${id}/redemptions`, query))
}

export async function createCoupon(payload: CouponPayload): Promise<Coupon> {
	return (await post<{ data: Coupon }>(BASE, payload)).data
}

/** Full body only — the server requires code, discount_type and discount_value on every update. */
export async function updateCoupon(id: number, payload: CouponPayload): Promise<{ message: string }> {
	return put<{ message: string }>(`${BASE}/${id}`, payload)
}

/** 204, or an `ApiError` 409 once the code has been used — the caller offers deactivation. */
export async function deleteCoupon(id: number): Promise<void> {
	await del<unknown>(`${BASE}/${id}`)
}

/**
 * Switches a coupon on or off without touching anything else: re-reads the
 * detail (so `user_ids` are the real ones) and sends all of it back.
 */
export async function setCouponActive(id: number, active: boolean): Promise<{ message: string }> {
	const payload = couponToPayload(await getCoupon(id))
	return updateCoupon(id, { ...payload, is_active: active })
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run src/add-os/services/__tests__/coupons.spec.ts`
Expected: PASS (8 tests). If the 204 test fails because `del` tries to parse an empty body, read `api.ts` `request()` and report it. Don't patch around it in this file.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/services/coupons.ts src/add-os/services/__tests__/coupons.spec.ts
git commit -m "feat(pricing): coupons service" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Coupon write gate

**Files:**
- Modify: `src/add-os/config/permissions.ts` (append after `canActivateMemberships`)
- Test: `src/add-os/config/__tests__/permissions.spec.ts` (append a `describe`)

**Interfaces:**
- Produces: `COUPON_MANAGEMENT_ROLE: Role`, `canManageCoupons(): boolean`.

- [ ] **Step 1: Write the failing test** (append; extend the dynamic import line to also pull `canManageCoupons, COUPON_MANAGEMENT_ROLE`)

```ts
describe("canManageCoupons", () => {
	it("is admin-only, per the role:admin group around the coupon writes", () => {
		expect(COUPON_MANAGEMENT_ROLE).toBe("admin")
	})
	it("grants admin", () => {
		state.role = "admin"
		expect(canManageCoupons()).toBe(true)
	})
	it("denies operations, who may still read", () => {
		state.role = "operations"
		expect(canManageCoupons()).toBe(false)
	})
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/add-os/config/__tests__/permissions.spec.ts`
Expected: FAIL, `canManageCoupons is not a function`.

- [ ] **Step 3: Implement** (append to `permissions.ts`)

```ts
/**
 * Creating, changing and deleting a discount coupon
 * (`POST`/`PUT|PATCH`/`DELETE /api/v1/admin/coupons`).
 *
 * Role-gated: ADDCore puts those three routes in `admin.php`'s `role:admin`
 * group ("a code is money off"), while the list, detail and redemption log
 * stay in the shared `admin|operations` block — so operations reads the page
 * and sees no write control. Like every gate here, this only decides what is
 * shown; the server's 403 is the boundary.
 */
export const COUPON_MANAGEMENT_ROLE: Role = "admin"

export function canManageCoupons(): boolean {
	return useAuthStore().isRoleGranted(COUPON_MANAGEMENT_ROLE)
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run src/add-os/config/__tests__/permissions.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/config/permissions.ts src/add-os/config/__tests__/permissions.spec.ts
git commit -m "feat(pricing): admin-only gate for coupon writes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `DateTimeInput` lifted out of `ResourceFormDrawer`

**Files:**
- Create: `src/add-os/components/form/DateTimeInput.vue`
- Modify: `src/add-os/components/resource/ResourceFormDrawer.vue` (template datetime branch near line 126; remove `datetimeAsDate`, `datetimeDatePart`, `datetimeTimePart`, `writeDatetime`, `setDatetimeDatePart`, `setDatetimeTimePart` once they're unused. Check with grep first, since `datetimeAsDate` may have other callers)
- Test: `src/add-os/components/form/__tests__/DateTimeInput.spec.ts`
- Unchanged and must stay green: `src/add-os/components/resource/__tests__/ResourceFormDrawer.spec.ts`

**Interfaces:**
- Produces: `<DateTimeInput v-model="value" />`, where `value: string | null`. It emits `toOffsetIso(...)` strings, or `null` when the date is cleared. It accepts any `Date.parse`-able string on input, including `…Z` and `YYYY-MM-DD HH:mm`.

- [ ] **Step 1: Write the failing test**

```ts
import { mount } from "@vue/test-utils"
import { NDatePicker, NTimePicker } from "naive-ui"
import { describe, expect, it } from "vitest"
import DateTimeInput from "../DateTimeInput.vue"

const OFFSET_ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:00[+-]\d\d:\d\d$/

function mountWith(modelValue: string | null) {
	const updates: (string | null)[] = []
	const wrapper = mount(DateTimeInput, { props: { "modelValue": modelValue, "onUpdate:modelValue": (v: string | null) => updates.push(v) } })
	return { wrapper, updates }
}

describe("dateTimeInput", () => {
	it("defaults an untouched time to 09:00, not midnight", async () => {
		const { wrapper, updates } = mountWith(null)
		wrapper.findComponent(NDatePicker).vm.$emit("update:formatted-value", "2026-10-12")
		expect(updates[0]).toMatch(OFFSET_ISO)
		expect(new Date(updates[0] as string).getHours()).toBe(9)
		expect(new Date(updates[0] as string).getDate()).toBe(12)
	})

	it("takes a time before a date as today", () => {
		const { wrapper, updates } = mountWith(null)
		wrapper.findComponent(NTimePicker).vm.$emit("update:formatted-value", "14:30")
		const out = new Date(updates[0] as string)
		expect(out.toDateString()).toBe(new Date().toDateString())
		expect([out.getHours(), out.getMinutes()]).toEqual([14, 30])
	})

	it("reads a UTC value as the browser's local clock and writes it back with an explicit offset", () => {
		const { wrapper, updates } = mountWith("2026-10-12T06:00:00.000000Z")
		const local = new Date("2026-10-12T06:00:00Z")
		expect(wrapper.findComponent(NTimePicker).props("formattedValue")).toBe(`${String(local.getHours()).padStart(2, "0")}:00`)
		wrapper.findComponent(NTimePicker).vm.$emit("update:formatted-value", "10:00")
		expect(updates[0]).toMatch(OFFSET_ISO)
		expect(updates[0]).not.toMatch(/Z$/)
	})

	it("clears to null", () => {
		const { wrapper, updates } = mountWith("2026-10-12T09:00:00+03:00")
		wrapper.findComponent(NDatePicker).vm.$emit("update:formatted-value", null)
		expect(updates).toEqual([null])
	})
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/add-os/components/form`
Expected: FAIL, "Failed to resolve import ../DateTimeInput.vue".

- [ ] **Step 3: Implement the component**

```vue
<!-- src/add-os/components/form/DateTimeInput.vue -->
<!--
	One instant as two controls, date then time. The combined Naive panel
	hides the clock inside the calendar popup, so picking a day and closing it
	saved midnight nobody chose. The value is written with an explicit offset
	(`toOffsetIso`) so the server never has to guess whose clock it is.
-->
<template>
	<div class="flex w-full gap-2">
		<n-date-picker
			:formatted-value="datePart"
			type="date"
			format="yyyy-MM-dd"
			value-format="yyyy-MM-dd"
			clearable
			class="flex-1"
			@update:formatted-value="setDate"
		/>
		<n-time-picker
			:formatted-value="timePart"
			format="hh:mm a"
			use-12-hours
			value-format="HH:mm"
			class="w-36"
			@update:formatted-value="setTime"
		/>
	</div>
</template>

<script setup lang="ts">
import { NDatePicker, NTimePicker } from "naive-ui"
import { computed } from "vue"
import { toOffsetIso } from "@/add-os/utils/format"

const model = defineModel<string | null>({ default: null })

function asDate(value: unknown): Date | null {
	if (typeof value !== "string" || !value.trim()) return null
	const str = value.trim()
	const ts = Date.parse(str.includes("T") ? str : str.replace(" ", "T"))
	return Number.isNaN(ts) ? null : new Date(ts)
}

const pad = (n: number) => String(n).padStart(2, "0")
const current = computed(() => asDate(model.value))
const datePart = computed(() => (current.value ? `${current.value.getFullYear()}-${pad(current.value.getMonth() + 1)}-${pad(current.value.getDate())}` : null))
const timePart = computed(() => (current.value ? `${pad(current.value.getHours())}:${pad(current.value.getMinutes())}` : null))

function setDate(value: string | null): void {
	if (!value) {
		model.value = null
		return
	}
	const [year, month, day] = value.split("-").map(Number)
	// Keep the time already chosen; 09:00 rather than midnight otherwise.
	model.value = toOffsetIso(new Date(year, month - 1, day, current.value?.getHours() ?? 9, current.value?.getMinutes() ?? 0, 0))
}

function setTime(value: string | null): void {
	if (!value) return
	const [hours, minutes] = value.split(":").map(Number)
	// A time cannot invent a day, so an untouched date means today.
	const base = current.value ?? new Date()
	model.value = toOffsetIso(new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes, 0))
}
</script>
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run src/add-os/components/form`
Expected: PASS (4 tests).

- [ ] **Step 5: Swap the drawer's datetime branch to the component**

In `ResourceFormDrawer.vue` replace the `<div v-else-if="field.type === 'datetime'" …>…</div>` block with:

```vue
<DateTimeInput
	v-else-if="field.type === 'datetime'"
	:model-value="(model as Record<string, unknown>)[field.key] as string | null"
	@update:model-value="value => writeField(field.key, value ?? '')"
/>
```

`?? ''` keeps the drawer's stored empty value exactly as before. Add
`import DateTimeInput from "@/add-os/components/form/DateTimeInput.vue"`. Then run
`grep -n "datetimeAsDate\|datetimeDatePart\|datetimeTimePart\|writeDatetime\|setDatetimeDatePart\|setDatetimeTimePart" src/add-os/components/resource/ResourceFormDrawer.vue`
and delete each function with no remaining caller. Remove `toOffsetIso` and
`NTimePicker` from the imports only if nothing else uses them.

- [ ] **Step 6: Run the drawer's existing tests, unchanged**

Run: `pnpm vitest run src/add-os/components`
Expected: PASS. **If a `ResourceFormDrawer.spec.ts` datetime test fails, do not edit it.** Its picker lookup may need `findComponent(DateTimeInput)`. Report it as a behaviour question instead (spec §7).

- [ ] **Step 7: Commit**

```bash
git add src/add-os/components/form/DateTimeInput.vue src/add-os/components/form/__tests__/DateTimeInput.spec.ts src/add-os/components/resource/ResourceFormDrawer.vue
git commit -m "refactor(forms): lift the date-time pair into DateTimeInput" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Sale fields on spaces

**Files:**
- Modify: `src/add-os/modules/spatial/types/space.ts` (`Space` and `SpacePayload` interfaces)
- Modify: `src/add-os/modules/spatial/config/spaces.config.ts` (fields after `hourly_rate_points`; hourly-rate column; the empty-payload builder, if it lives here, so grep `emptySpacePayload` first)
- Modify: `src/add-os/modules/pricing/utils/sale.ts` (add `renderSaleBadge`, `spaceSubmitPayload`)
- Modify: `src/add-os/modules/spatial/views/SpacesPage.vue` (`openEdit`, `submit`)
- Modify: `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json`
- Test: `src/add-os/modules/spatial/config/__tests__/spaces.config.spec.ts` (extend), `src/add-os/modules/pricing/utils/__tests__/sale.spec.ts` (extend)

**Interfaces:**
- Consumes: `normalizeSale`, `saleState` (Task 1); `DateTimeInput` via the drawer's `datetime` type (Task 4).
- Produces:
  - `spaceSubmitPayload(payload: Record<string, unknown>): Record<string, unknown>`
  - `renderSaleBadge(t: ComposerTranslation, salePoints: number | null, startsAt: string | null, endsAt: string | null): VNode | null`. Task 6 reuses it.

- [ ] **Step 1: Add the i18n keys** (top-level `sale` object, both files)

en:
```json
"sale": {
	"hourlyRate": "Sale rate (points / hour)",
	"price": "Sale price (points)",
	"startsAt": "Sale starts",
	"endsAt": "Sale ends",
	"section": "Sale",
	"hint": "All three together. Clear all three to end the sale.",
	"needsRate": "A space without an hourly rate cannot have a sale.",
	"end": "End sale",
	"badgeRunning": "Sale {points} points · until {date}",
	"badgeScheduled": "Sale {points} points · from {date}"
}
```
ar:
```json
"sale": {
	"hourlyRate": "سعر العرض (نقاط / ساعة)",
	"price": "سعر العرض (نقاط)",
	"startsAt": "بداية العرض",
	"endsAt": "نهاية العرض",
	"section": "العرض",
	"hint": "الحقول الثلاثة معاً. امسحها كلها لإنهاء العرض.",
	"needsRate": "المساحة بلا سعر ساعة لا تقبل عرضاً.",
	"end": "إنهاء العرض",
	"badgeRunning": "عرض {points} نقطة · حتى {date}",
	"badgeScheduled": "عرض {points} نقطة · من {date}"
}
```

- [ ] **Step 2: Write the failing tests**

Append to `sale.spec.ts`:

```ts
import { spaceSubmitPayload } from "../sale"

describe("spaceSubmitPayload", () => {
	it("ends a sale when the hourly rate is cleared, instead of sending a sale the server must refuse", () => {
		const out = spaceSubmitPayload({ hourly_rate_points: null, sale_hourly_rate_points: 80, sale_starts_at: "2026-10-05T09:00:00+03:00", sale_ends_at: "2026-10-12T09:00:00+03:00" })
		expect(out).toMatchObject({ sale_hourly_rate_points: null, sale_starts_at: null, sale_ends_at: null })
	})
	it("otherwise only normalises", () => {
		const out = spaceSubmitPayload({ hourly_rate_points: 100, sale_hourly_rate_points: 80, sale_starts_at: "", sale_ends_at: "" })
		expect(out).toMatchObject({ sale_hourly_rate_points: 80, sale_starts_at: null, sale_ends_at: null })
	})
})
```

Append to `spaces.config.spec.ts` (match the file's existing `buildSpaceFields(...)` call
and the `t` stub it already uses):

```ts
it("offers the three sale fields, disabled while there is no hourly rate", () => {
	const fields = buildSpaceFields(t, [], "en")
	const sale = fields.filter(f => ["sale_hourly_rate_points", "sale_starts_at", "sale_ends_at"].includes(f.key))
	expect(sale.map(f => f.type)).toEqual(["number", "datetime", "datetime"])
	for (const field of sale) {
		expect(field.disabledWhen?.({ hourly_rate_points: null } as never)).toBe(true)
		expect(field.disabledWhen?.({ hourly_rate_points: 100 } as never)).toBe(false)
	}
})
```

- [ ] **Step 3: Run them to verify they fail**

Run: `pnpm vitest run src/add-os/modules/pricing src/add-os/modules/spatial/config`
Expected: FAIL (`spaceSubmitPayload` not exported; sale fields missing).

- [ ] **Step 4: Implement**

`space.ts`: add to **both** `Space` and `SpacePayload`:

```ts
	/** Sale on the hourly rate — all three set, or all three null. ISO UTC when read; offset ISO when sent. */
	sale_hourly_rate_points: number | null
	sale_starts_at: string | null
	sale_ends_at: string | null
```

Initialise them to `null` in the empty space payload (grep `emptySpacePayload`).

`sale.ts`: append:

```ts
import type { VNode } from "vue"
import type { ComposerTranslation } from "vue-i18n"
import { NTag } from "naive-ui"
import { h } from "vue"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"

/**
 * A space's sale needs an hourly rate to be below. Clearing the rate ends
 * the sale rather than sending one the server must refuse.
 */
export function spaceSubmitPayload(payload: Record<string, unknown>): Record<string, unknown> {
	const out = normalizeSale(payload, "sale_hourly_rate_points")
	if (out.hourly_rate_points === null || out.hourly_rate_points === undefined || out.hourly_rate_points === "") {
		out.sale_hourly_rate_points = null
		out.sale_starts_at = null
		out.sale_ends_at = null
	}
	return out
}

/** A running or scheduled sale under a list's price cell; nothing otherwise. */
export function renderSaleBadge(t: ComposerTranslation, salePoints: number | null, startsAt: string | null, endsAt: string | null): VNode | null {
	const state = saleState(startsAt, endsAt)
	if (salePoints === null || (state !== "running" && state !== "scheduled")) return null
	const label = state === "running"
		? t("sale.badgeRunning", { points: formatNumber(salePoints), date: formatDateTime(endsAt as string) })
		: t("sale.badgeScheduled", { points: formatNumber(salePoints), date: formatDateTime(startsAt as string) })
	return h(NTag, { size: "small", round: true, bordered: false, type: state === "running" ? "success" : "info", class: "mt-1" }, { default: () => label })
}
```

`spaces.config.ts`: right after the `hourly_rate_points` descriptor:

```ts
		// A sale on the hourly rate (collection pinned 2026-10-05, Create/Update
		// Space). All three or none; the server refuses a sale on a space with
		// no rate, so the inputs wait for one.
		{
			key: "sale_hourly_rate_points",
			labelKey: "sale.hourlyRate",
			type: "number",
			step: 1,
			min: 0,
			integer: true,
			disabledWhen: model => model.hourly_rate_points === null,
			hint: model => (model.hourly_rate_points === null ? t("sale.needsRate") : t("sale.hint"))
		},
		{ key: "sale_starts_at", labelKey: "sale.startsAt", type: "datetime", disabledWhen: model => model.hourly_rate_points === null },
		{ key: "sale_ends_at", labelKey: "sale.endsAt", type: "datetime", disabledWhen: model => model.hourly_rate_points === null },
```

Before relying on `disabledWhen` for `datetime` and `number`, check that
`ResourceFormDrawer` actually applies it to those branches:
`grep -n "disabledWhen" src/add-os/components/resource/ResourceFormDrawer.vue`. If the
`datetime` branch ignores it, add `:disabled` to `DateTimeInput` (a `disabled?: boolean`
prop passed to both pickers) and bind it there. Mention this in the commit message.

In `buildSpaceColumns`' hourly-rate `render`, add the badge as the last child of the `h("div", [...])`:

```ts
							renderSaleBadge(t, row.sale_hourly_rate_points, row.sale_starts_at, row.sale_ends_at)
```

`SpacesPage.vue`:
- `openEdit`: add `sale_hourly_rate_points: row.sale_hourly_rate_points ?? null, sale_starts_at: row.sale_starts_at ?? null, sale_ends_at: row.sale_ends_at ?? null,`.
- `submit`: first line becomes `payload = spaceSubmitPayload(payload)`. Change the parameter to `let`-style by assigning to a new const, then use it for the rest of the function.

- [ ] **Step 5: Run them to verify they pass**

Run: `pnpm vitest run src/add-os/modules/pricing src/add-os/modules/spatial`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/add-os/modules/spatial/types/space.ts src/add-os/modules/spatial/config/spaces.config.ts src/add-os/modules/spatial/config/__tests__/spaces.config.spec.ts src/add-os/modules/spatial/views/SpacesPage.vue src/add-os/modules/pricing/utils/sale.ts src/add-os/modules/pricing/utils/__tests__/sale.spec.ts src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(spaces): a sale on the hourly rate" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(If Step 4 had to add `disabled` to `DateTimeInput`, also stage that file.)

---

### Task 6: Sale block on plans

**Files:**
- Modify: `src/add-os/modules/plans/types/plan.ts` (`Plan`, `PlanPayload`)
- Modify: `src/add-os/modules/plans/config/plans.config.ts` (`emptyPlanPayload`, price column)
- Modify: `src/add-os/modules/plans/views/PlansPage.vue` (`openEdit`)
- Modify: `src/add-os/modules/plans/components/PlanFormDrawer.vue` (Pricing card, below the "Row 2: Duration" grid; `handleSubmit`)
- Test: `src/add-os/modules/plans/components/__tests__/PlanFormDrawer.sale.spec.ts`

**Interfaces:**
- Consumes: `normalizeSale`, `renderSaleBadge` (Tasks 1, 5); `DateTimeInput` (Task 4); i18n `sale.*` (Task 5).

- [ ] **Step 1: Write the failing test**

```ts
import { flushPromises, mount } from "@vue/test-utils"
import { NInputNumber } from "naive-ui"
import { describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import { emptyPlanPayload } from "@/add-os/modules/plans/config/plans.config"
import { ApiError } from "@/add-os/services/api"
import PlanFormDrawer from "../PlanFormDrawer.vue"

vi.mock("@/add-os/services/plan-modules", () => ({ listPlanModules: vi.fn().mockResolvedValue([]) }))
vi.mock("@/add-os/services/resource-types", () => ({ listResourceTypes: vi.fn().mockResolvedValue([]) }))
vi.mock("@/add-os/services/spaces", () => ({ listSpaces: vi.fn().mockResolvedValue([]) }))

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

function mountDrawer(model: Record<string, unknown>, onSubmit = vi.fn().mockResolvedValue(undefined)) {
	return mount(PlanFormDrawer, {
		props: { "show": true, "model": model, "title": "Edit", "submitting": false, onSubmit, "onUpdate:model": () => {} },
		global: { plugins: [i18n], stubs: { teleport: true } },
		attachTo: document.body
	})
}

describe("planFormDrawer sale block", () => {
	it("ends a sale by nulling all three", async () => {
		const model = { ...emptyPlanPayload(), name: { ar: "باقة", en: "Plan" }, price_points: 120, sale_price_points: 100, sale_starts_at: "2026-10-05T10:00:00+03:00", sale_ends_at: "2026-10-07T10:00:00+03:00" }
		const wrapper = mountDrawer(model)
		await flushPromises()
		await wrapper.get("[data-test='plan-sale-end']").trigger("click")
		expect([model.sale_price_points, model.sale_starts_at, model.sale_ends_at]).toEqual([null, null, null])
	})

	it("shows the server's sale_price_points error under the sale input", async () => {
		const error = new ApiError(422, JSON.stringify({ message: "x", errors: { sale_price_points: ["The sale price must be below the price."] } }))
		const model = { ...emptyPlanPayload(), name: { ar: "باقة", en: "Plan" }, price_points: 120, sale_price_points: 130, sale_starts_at: "2026-10-05T10:00:00+03:00", sale_ends_at: "2026-10-07T10:00:00+03:00" }
		const wrapper = mountDrawer(model, vi.fn().mockRejectedValue(error))
		await flushPromises()
		await (wrapper.vm as unknown as { handleSubmit: () => Promise<void> }).handleSubmit()
		await flushPromises()
		expect(wrapper.get("[data-test='plan-sale-error']").text()).toContain("The sale price must be below the price.")
	})

	it("sends the three keys as null when the sale is empty", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		const model = { ...emptyPlanPayload(), name: { ar: "باقة", en: "Plan" }, price_points: 120 }
		const wrapper = mountDrawer(model, onSubmit)
		await flushPromises()
		await (wrapper.vm as unknown as { handleSubmit: () => Promise<void> }).handleSubmit()
		expect(onSubmit.mock.calls[0][0]).toMatchObject({ sale_price_points: null, sale_starts_at: null, sale_ends_at: null })
		expect(wrapper.findComponent(NInputNumber).exists()).toBe(true)
	})
})
```

(`handleSubmit` is reached through `defineExpose({ handleSubmit })`, which Step 3 adds.
If the drawer already exposes something, extend that.)

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/add-os/modules/plans/components`
Expected: FAIL (no `plan-sale-end`; `emptyPlanPayload` lacks the keys).

- [ ] **Step 3: Implement**

`plan.ts`: add to `Plan` and to `PlanPayload`:

```ts
	/** Sale on the price — sent and returned only on `admin/*`. All three or none. */
	sale_price_points: number | null
	sale_starts_at: string | null
	sale_ends_at: string | null
```

`plans.config.ts`, `emptyPlanPayload()`: add `sale_price_points: null, sale_starts_at: null, sale_ends_at: null,`. In the price column render, append `renderSaleBadge(t, row.sale_price_points ?? null, row.sale_starts_at ?? null, row.sale_ends_at ?? null)` to the cell's children.

`PlansPage.vue` `openEdit`: add `sale_price_points: row.sale_price_points ?? null, sale_starts_at: row.sale_starts_at ?? null, sale_ends_at: row.sale_ends_at ?? null,`.

`PlanFormDrawer.vue`, inside the Pricing card, after the Duration grid:

```vue
						<!-- Sale: all three or none; the server judges price vs. sale. -->
						<div class="flex flex-col gap-2 border-t border-neutral-100 pt-3">
							<div class="flex items-center justify-between">
								<span class="text-xs font-semibold text-neutral-600">{{ t('sale.section') }}</span>
								<n-button v-if="hasSale" text size="tiny" type="error" data-test="plan-sale-end" @click="endSale">
									{{ t('sale.end') }}
								</n-button>
							</div>
							<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
								<div class="flex flex-col gap-1">
									<span class="text-xs text-neutral-500">{{ t('sale.price') }}</span>
									<n-input-number v-model:value="model.sale_price_points" :min="0" :precision="0" clearable size="small" />
								</div>
								<div class="flex flex-col gap-1 md:col-span-2">
									<span class="text-xs text-neutral-500">{{ t('sale.startsAt') }}</span>
									<DateTimeInput v-model="model.sale_starts_at" />
									<span class="text-xs text-neutral-500">{{ t('sale.endsAt') }}</span>
									<DateTimeInput v-model="model.sale_ends_at" />
								</div>
							</div>
							<span class="text-xs text-neutral-400">{{ t('sale.hint') }}</span>
							<span v-for="key in saleErrorKeys" :key="key" class="text-xs text-red-500" data-test="plan-sale-error">{{ errors[key][0] }}</span>
						</div>
```

Script additions:

```ts
import DateTimeInput from "@/add-os/components/form/DateTimeInput.vue"
import { normalizeSale } from "@/add-os/modules/pricing/utils/sale"
// add NButton, NInputNumber to the existing naive-ui import if missing

const hasSale = computed(() => model.value.sale_price_points != null || !!model.value.sale_starts_at || !!model.value.sale_ends_at)
const saleErrorKeys = computed(() => ["sale_price_points", "sale_starts_at", "sale_ends_at"].filter(key => errors.value[key]?.length))

function endSale(): void {
	model.value.sale_price_points = null
	model.value.sale_starts_at = null
	model.value.sale_ends_at = null
}

defineExpose({ handleSubmit })
```

In `handleSubmit`, wrap the built payload:
`const payload: PlanPayload = normalizeSale({ ...model.value, /* existing mapping unchanged */ }, "sale_price_points")`.

`text-red-500`/`text-neutral-*` match the drawer's existing utility classes. They're
Tailwind palette names, not hex. Add no new `[#…]` values.

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run src/add-os/modules/plans`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/add-os/modules/plans/types/plan.ts src/add-os/modules/plans/config/plans.config.ts src/add-os/modules/plans/views/PlansPage.vue src/add-os/modules/plans/components/PlanFormDrawer.vue src/add-os/modules/plans/components/__tests__/PlanFormDrawer.sale.spec.ts
git commit -m "feat(plans): a sale on the price" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Coupon form (model, mapping, drawer)

**Files:**
- Create: `src/add-os/modules/pricing/utils/coupon-form.ts`
- Create: `src/add-os/modules/pricing/components/CouponFormDrawer.vue`
- Create: `src/add-os/modules/pricing/composables/usePricingPickers.ts`
- Modify: `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json` (`coupons.form.*`, `pricing.*`)
- Test: `src/add-os/modules/pricing/utils/__tests__/coupon-form.spec.ts`
- Test: `src/add-os/modules/pricing/components/__tests__/CouponFormDrawer.spec.ts`

**Interfaces:**
- Consumes: Task 1 types, `couponToPayload`; Task 2 `createCoupon`, `updateCoupon`, `getCoupon`; `DateTimeInput`; `listUsers`, `listCompanies`, `listPlans`, `listSpaces`, `listEvents`, `SPACE_TYPES`, `pickLocalized`, `currentLocale`.
- Produces:
  - `interface CouponForm extends Omit<CouponPayload, "targets"> { usage_unlimited: boolean; per_user_unlimited: boolean; targets: TargetRow[] }`
  - `interface TargetRow { purpose: PricingPurpose | null; itemKey: TargetItemKey | null; itemValue: number | string | null }`
  - `emptyCouponForm(): CouponForm`
  - `couponToForm(coupon: Coupon): CouponForm`
  - `formToPayload(form: CouponForm): CouponPayload`
  - `groupErrors(errors: Record<string, string[]>, known: string[]): { fields: Record<string, string[]>, targets: Record<number, string[]>, other: string[] }`
  - `discountLabel(t: ComposerTranslation, coupon: Pick<Coupon, "discount_type" | "discount_value">): string` (used by Tasks 8 and 9; keys `coupons.detail.discountPercent|discountPoints` are added in Task 8 Step 1, so its test lives in Task 8)
  - `usePricingPickers(): { load(): Promise<void>, users, companies, plans, spaces, events: Ref<SelectOption[]>, spaceTypes: SelectOption[], nameOf(key: TargetItemKey | "company_id" | "user", id: number | string): string }`
  - `<CouponFormDrawer v-model:show :coupon-id="number | null" @saved="() => void" />`

- [ ] **Step 1: i18n.** Add `pricing.purpose.{booking,coworking_session,plan_purchase,event_registration}`, `pricing.item.{any,plan_id,space_id,space_type,event_id}` and `coupons.form.*` in both files.

en:
```json
"pricing": {
	"purpose": { "booking": "Booking", "coworking_session": "Coworking session", "plan_purchase": "Package purchase", "event_registration": "Event registration" },
	"item": { "any": "Any", "plan_id": "Package", "space_id": "Space", "space_type": "Space type", "event_id": "Event" }
},
"coupons": {
	"form": {
		"createTitle": "New coupon", "editTitle": "Edit coupon {code}",
		"basics": "Basics", "code": "Code", "codeHint": "Letters, numbers, - and _ only. Saved in capitals.",
		"name": "Name", "description": "Description", "isActive": "Active",
		"discount": "Discount", "discountType": "Type", "percentage": "Percentage", "amountOff": "Points off",
		"discountValue": "Value", "maxDiscount": "Cap (points)",
		"conditions": "Conditions", "minAmount": "Minimum price (points)", "minAmountHint": "Compared with the price after any sale.",
		"combinable": "Combines with sales",
		"limits": "Limits", "usageLimit": "Total uses", "perUserLimit": "Uses per member", "unlimited": "Unlimited",
		"eligibility": "Who can use it", "newMembersOnly": "New members only", "company": "Company members only",
		"users": "Specific members", "usersHint": "Leave empty for everyone.",
		"validity": "Validity", "startsAt": "Starts", "endsAt": "Ends",
		"targets": "Applies to", "targetsEmpty": "All purchases except wallet top-ups.", "addTarget": "Add a rule",
		"purpose": "Purchase", "itemKind": "Limited to", "item": "Item",
		"save": "Save", "cancel": "Cancel", "saved": "Coupon saved.", "loadError": "Could not load the coupon."
	}
}
```
ar:
```json
"pricing": {
	"purpose": { "booking": "حجز", "coworking_session": "جلسة عمل مشترك", "plan_purchase": "شراء باقة", "event_registration": "تسجيل في فعالية" },
	"item": { "any": "أي عنصر", "plan_id": "باقة", "space_id": "مساحة", "space_type": "نوع المساحة", "event_id": "فعالية" }
},
"coupons": {
	"form": {
		"createTitle": "كوبون جديد", "editTitle": "تعديل الكوبون {code}",
		"basics": "الأساسيات", "code": "الكود", "codeHint": "أحرف وأرقام و- و_ فقط، ويُحفظ بأحرف كبيرة.",
		"name": "الاسم", "description": "الوصف", "isActive": "مفعّل",
		"discount": "الخصم", "discountType": "النوع", "percentage": "نسبة مئوية", "amountOff": "نقاط مخصومة",
		"discountValue": "القيمة", "maxDiscount": "سقف الخصم (نقاط)",
		"conditions": "الشروط", "minAmount": "الحد الأدنى للسعر (نقاط)", "minAmountHint": "يُقارن بالسعر بعد العروض.",
		"combinable": "يُجمع مع العروض",
		"limits": "الحدود", "usageLimit": "عدد الاستخدامات الكلي", "perUserLimit": "الاستخدامات لكل عضو", "unlimited": "بلا حد",
		"eligibility": "من يحق له استخدامه", "newMembersOnly": "للأعضاء الجدد فقط", "company": "لأعضاء شركة معينة",
		"users": "أعضاء محددون", "usersHint": "اتركه فارغاً ليكون للجميع.",
		"validity": "الصلاحية", "startsAt": "يبدأ", "endsAt": "ينتهي",
		"targets": "يُطبَّق على", "targetsEmpty": "كل المشتريات عدا شحن المحفظة.", "addTarget": "إضافة شرط",
		"purpose": "نوع الشراء", "itemKind": "مقيّد بـ", "item": "العنصر",
		"save": "حفظ", "cancel": "إلغاء", "saved": "تم حفظ الكوبون.", "loadError": "تعذّر تحميل الكوبون."
	}
}
```

- [ ] **Step 2: Write the failing mapping tests**

`coupon-form.spec.ts`:

```ts
import type { Coupon } from "@/add-os/modules/pricing/types/coupon"
import { describe, expect, it } from "vitest"
import { couponToForm, emptyCouponForm, formToPayload, groupErrors } from "../coupon-form"

describe("coupon form mapping", () => {
	it("starts per_user_limit at 1 and usage_limit unlimited", () => {
		const payload = formToPayload({ ...emptyCouponForm(), code: "a-1", discount_value: 10 })
		expect(payload.per_user_limit).toBe(1)
		expect(payload.usage_limit).toBeNull()
		expect(payload.code).toBe("A-1")
	})

	it("sends null, not a missing key, for an unlimited per-member allowance", () => {
		const payload = formToPayload({ ...emptyCouponForm(), code: "X", discount_value: 10, per_user_unlimited: true, per_user_limit: 3 })
		expect(payload).toHaveProperty("per_user_limit", null)
	})

	it("drops the cap for points-off discounts", () => {
		const payload = formToPayload({ ...emptyCouponForm(), code: "X", discount_type: "amount_off", discount_value: 50, max_discount_points: 99 })
		expect(payload.max_discount_points).toBeNull()
	})

	it("always sends targets and user_ids, and maps a target row to one item column", () => {
		const form = { ...emptyCouponForm(), code: "X", discount_value: 10, targets: [
			{ purpose: "booking" as const, itemKey: "space_type" as const, itemValue: "room" },
			{ purpose: "plan_purchase" as const, itemKey: null, itemValue: null }
		] }
		const payload = formToPayload(form)
		expect(payload.user_ids).toEqual([])
		expect(payload.targets).toEqual([
			{ purpose: "booking", plan_id: null, space_id: null, space_type: "room", event_id: null },
			{ purpose: "plan_purchase", plan_id: null, space_id: null, space_type: null, event_id: null }
		])
	})

	it("sends empty bilingual text and empty times as null", () => {
		const payload = formToPayload({ ...emptyCouponForm(), code: "X", discount_value: 10, starts_at: "" as never })
		expect(payload.name).toBeNull()
		expect(payload.starts_at).toBeNull()
	})

	it("round-trips a detail through the form", () => {
		const coupon = { id: 1, code: "VIP", name: { ar: "كبار", en: "VIP" }, description: null, source: null, discount_type: "percentage", discount_value: 15, max_discount_points: 40, min_amount_points: 100, combinable_with_offers: false, usage_limit: null, per_user_limit: null, new_members_only: true, company_id: 2, starts_at: "2026-10-05T06:00:00.000000Z", ends_at: null, is_active: true, targets: [{ id: 5, purpose: "event_registration", plan_id: null, space_id: null, space_type: null, event_id: 8 }], user_ids: [3], created_by: 1, created_at: "x" } as Coupon
		const form = couponToForm(coupon)
		expect(form.per_user_unlimited).toBe(true)
		expect(form.usage_unlimited).toBe(true)
		expect(form.targets[0]).toEqual({ purpose: "event_registration", itemKey: "event_id", itemValue: 8 })
		const { id: _i, source: _s, created_by: _c, created_at: _a, ...rest } = coupon
		expect(formToPayload(form)).toEqual({ ...rest, targets: [{ purpose: "event_registration", plan_id: null, space_id: null, space_type: null, event_id: 8 }] })
	})
})

describe("groupErrors", () => {
	it("routes targets.N and targets.N.* to row N, user_ids.N to user_ids, and keeps unknown keys", () => {
		const grouped = groupErrors({
			"code": ["taken"],
			"targets.1": ["bad target"],
			"targets.1.plan_id": ["no plan"],
			"user_ids.0": ["no user"],
			"name.ar": ["required"],
			"mystery": ["?"]
		}, ["code", "name.ar", "user_ids"])
		expect(grouped.fields).toEqual({ "code": ["taken"], "name.ar": ["required"], "user_ids": ["no user"] })
		expect(grouped.targets).toEqual({ 1: ["bad target", "no plan"] })
		expect(grouped.other).toEqual(["?"])
	})
})
```

`known` is the list of field keys the form renders. Anything else goes to `other`.

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm vitest run src/add-os/modules/pricing/utils/__tests__/coupon-form.spec.ts`
Expected: FAIL (module missing).

- [ ] **Step 4: Implement `coupon-form.ts`**

```ts
import type { Bilingual } from "@/add-os/components/resource/field-types"
import type { Coupon, CouponPayload, PricingPurpose, TargetItemKey } from "@/add-os/modules/pricing/types/coupon"
import type { SpaceType } from "@/add-os/modules/spatial/types/space"
import type { ComposerTranslation } from "vue-i18n"
import { formatNumber } from "@/add-os/utils/format"
import { couponToPayload } from "./coupon-payload"

/** `20%` or `50 points` — the coupon's own terms, never a computed saving. */
export function discountLabel(t: ComposerTranslation, coupon: Pick<Coupon, "discount_type" | "discount_value">): string {
	return coupon.discount_type === "percentage"
		? t("coupons.detail.discountPercent", { value: formatNumber(coupon.discount_value) })
		: t("coupons.detail.discountPoints", { value: formatNumber(coupon.discount_value) })
}

export interface TargetRow {
	purpose: PricingPurpose | null
	itemKey: TargetItemKey | null
	itemValue: number | string | null
}

/**
 * The form's own model. The two `*_unlimited` flags exist so "no limit"
 * (`null`) is a deliberate choice and never the same thing as an empty box —
 * `per_user_limit` left out would fall back to 1 on the server.
 */
export interface CouponForm extends Omit<CouponPayload, "targets"> {
	usage_unlimited: boolean
	per_user_unlimited: boolean
	targets: TargetRow[]
}

export function emptyCouponForm(): CouponForm {
	return {
		code: "",
		name: { ar: "", en: "" },
		description: { ar: "", en: "" },
		discount_type: "percentage",
		discount_value: 10,
		max_discount_points: null,
		min_amount_points: null,
		combinable_with_offers: true,
		usage_limit: null,
		usage_unlimited: true,
		per_user_limit: 1,
		per_user_unlimited: false,
		new_members_only: false,
		company_id: null,
		starts_at: null,
		ends_at: null,
		is_active: true,
		targets: [],
		user_ids: []
	}
}

const ITEM_KEYS: TargetItemKey[] = ["plan_id", "space_id", "space_type", "event_id"]

export function couponToForm(coupon: Coupon): CouponForm {
	const payload = couponToPayload(coupon)
	return {
		...payload,
		name: payload.name ?? { ar: "", en: "" },
		description: payload.description ?? { ar: "", en: "" },
		usage_unlimited: payload.usage_limit === null,
		per_user_unlimited: payload.per_user_limit === null,
		targets: payload.targets.map((target) => {
			const itemKey = ITEM_KEYS.find(key => target[key] !== null) ?? null
			return { purpose: target.purpose, itemKey, itemValue: itemKey ? target[itemKey] : null }
		})
	}
}

function bilingualOrNull(value: Bilingual | null): Bilingual | null {
	return value && (value.ar.trim() || value.en.trim()) ? value : null
}

function emptyToNull<T>(value: T | "" | undefined): T | null {
	return value === "" || value === undefined ? null : value
}

/** The full body every write sends — nothing left out, nothing derived. */
export function formToPayload(form: CouponForm): CouponPayload {
	return {
		code: form.code.trim().toUpperCase(),
		name: bilingualOrNull(form.name),
		description: bilingualOrNull(form.description),
		discount_type: form.discount_type,
		discount_value: form.discount_value,
		max_discount_points: form.discount_type === "percentage" ? emptyToNull(form.max_discount_points) : null,
		min_amount_points: emptyToNull(form.min_amount_points),
		combinable_with_offers: form.combinable_with_offers,
		usage_limit: form.usage_unlimited ? null : emptyToNull(form.usage_limit),
		per_user_limit: form.per_user_unlimited ? null : emptyToNull(form.per_user_limit),
		new_members_only: form.new_members_only,
		company_id: emptyToNull(form.company_id),
		starts_at: emptyToNull(form.starts_at),
		ends_at: emptyToNull(form.ends_at),
		is_active: form.is_active,
		targets: form.targets
			.filter((row): row is TargetRow & { purpose: PricingPurpose } => row.purpose !== null)
			.map(row => ({
				purpose: row.purpose,
				plan_id: row.itemKey === "plan_id" ? (row.itemValue as number) : null,
				space_id: row.itemKey === "space_id" ? (row.itemValue as number) : null,
				space_type: row.itemKey === "space_type" ? (row.itemValue as SpaceType) : null,
				event_id: row.itemKey === "event_id" ? (row.itemValue as number) : null
			})),
		user_ids: [...form.user_ids]
	}
}

/**
 * A 422's `errors`, sorted by where the form shows them. Nothing is dropped:
 * a key the form has no place for goes to `other`, shown at the top.
 */
export function groupErrors(errors: Record<string, string[]>, known: string[]) {
	const fields: Record<string, string[]> = {}
	const targets: Record<number, string[]> = {}
	const other: string[] = []
	for (const [key, messages] of Object.entries(errors)) {
		const target = /^targets\.(\d+)(\..+)?$/.exec(key)
		if (target) {
			const index = Number(target[1])
			targets[index] = [...(targets[index] ?? []), ...messages]
		} else if (/^user_ids\.\d+$/.test(key)) {
			fields.user_ids = [...(fields.user_ids ?? []), ...messages]
		} else if (known.includes(key)) {
			fields[key] = messages
		} else {
			other.push(...messages)
		}
	}
	return { fields, targets, other }
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `pnpm vitest run src/add-os/modules/pricing/utils`
Expected: PASS.

- [ ] **Step 6: Implement `usePricingPickers.ts`**

```ts
import type { SelectOption } from "naive-ui"
import type { TargetItemKey } from "@/add-os/modules/pricing/types/coupon"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { SPACE_TYPES } from "@/add-os/modules/spatial/types/space"
import { listCompanies } from "@/add-os/services/companies"
import { listEvents } from "@/add-os/services/events"
import { listPlans } from "@/add-os/services/plans"
import { listSpaces } from "@/add-os/services/spaces"
import { listUsers } from "@/add-os/services/users"

/**
 * The option lists a coupon is written against, from the endpoints that
 * already exist: members (`admin/users?role=member`, unpaginated), companies,
 * plans, spaces, events, and the known space types. Loaded once per page.
 */
export function usePricingPickers() {
	const { t } = useI18n()
	const users = ref<SelectOption[]>([])
	const companies = ref<SelectOption[]>([])
	const plans = ref<SelectOption[]>([])
	const spaces = ref<SelectOption[]>([])
	const events = ref<SelectOption[]>([])
	const spaceTypes: SelectOption[] = SPACE_TYPES.map(type => ({ label: t(`spaces.spaceType.${type}`), value: type }))
	let loaded: Promise<void> | null = null

	function load(): Promise<void> {
		loaded ??= (async () => {
			const locale = currentLocale.value
			const [u, c, p, s, e] = await Promise.all([listUsers({ role: "member" }), listCompanies(), listPlans(), listSpaces(), listEvents()])
			users.value = u.map(user => ({ label: `${user.name} · ${user.phone ?? ""}`, value: user.id }))
			companies.value = c.map(company => ({ label: company.legal_name, value: company.id }))
			plans.value = p.map(plan => ({ label: pickLocalized(plan.name, locale), value: plan.id }))
			spaces.value = s.map(space => ({ label: space.name ? pickLocalized(space.name, locale) : `#${space.id}`, value: space.id }))
			events.value = e.map(event => ({ label: pickLocalized(event.title, locale), value: event.id }))
		})()
		return loaded
	}

	function optionsFor(key: TargetItemKey): SelectOption[] {
		return { plan_id: plans.value, space_id: spaces.value, space_type: spaceTypes, event_id: events.value }[key]
	}

	/** A name for an id, or `#id` when the list does not have it. */
	function nameOf(key: TargetItemKey | "company_id" | "user", id: number | string): string {
		const list = key === "company_id" ? companies.value : key === "user" ? users.value : optionsFor(key)
		return String(list.find(option => option.value === id)?.label ?? `#${id}`)
	}

	return { load, users, companies, plans, spaces, events, spaceTypes, optionsFor, nameOf }
}
```

Before use, check the actual field names: `grep -n "phone\|name" src/add-os/modules/system/types/user.ts`.
If `User` has no `phone`, use what it has (e.g. `email`) and keep the label format
`name · contact`. Also confirm `RoleName` includes `"member"`. If it doesn't, cast at
the call site with a comment explaining why.

- [ ] **Step 7: Write the failing drawer smoke test**

```ts
import { flushPromises, mount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import { ApiError } from "@/add-os/services/api"
import CouponFormDrawer from "../CouponFormDrawer.vue"

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))
vi.mock("@/add-os/services/coupons", () => ({ createCoupon: createMock, updateCoupon: vi.fn(), getCoupon: vi.fn() }))
vi.mock("@/add-os/modules/pricing/composables/usePricingPickers", () => ({
	usePricingPickers: () => ({ load: vi.fn().mockResolvedValue(undefined), users: { value: [] }, companies: { value: [] }, plans: { value: [] }, spaces: { value: [] }, events: { value: [] }, spaceTypes: [], optionsFor: () => [], nameOf: (_k: string, id: number) => `#${id}` })
}))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

describe("couponFormDrawer", () => {
	it("shows a targets.N error under that rule, and an unknown key at the top", async () => {
		createMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "x", errors: { "targets.0": ["That item cannot be bought that way."], "mystery": ["Something else."] } })))
		const wrapper = mount(CouponFormDrawer, { props: { show: true, couponId: null }, global: { plugins: [i18n], stubs: { teleport: true } }, attachTo: document.body })
		await flushPromises()
		const vm = wrapper.vm as unknown as { form: { code: string, targets: unknown[] }, submit: () => Promise<void> }
		vm.form.code = "X"
		vm.form.targets.push({ purpose: "booking", itemKey: null, itemValue: null })
		await vm.submit()
		await flushPromises()
		expect(wrapper.get("[data-test='coupon-target-error-0']").text()).toContain("That item cannot be bought that way.")
		expect(wrapper.get("[data-test='coupon-form-other-errors']").text()).toContain("Something else.")
	})

	it("submits per_user_limit 1 by default", async () => {
		createMock.mockReset().mockResolvedValue({ id: 1 })
		const wrapper = mount(CouponFormDrawer, { props: { show: true, couponId: null }, global: { plugins: [i18n], stubs: { teleport: true } }, attachTo: document.body })
		await flushPromises()
		const vm = wrapper.vm as unknown as { form: { code: string }, submit: () => Promise<void> }
		vm.form.code = "x"
		await vm.submit()
		expect(createMock.mock.calls[0][0]).toMatchObject({ code: "X", per_user_limit: 1, targets: [], user_ids: [] })
	})
})
```

- [ ] **Step 8: Run it to verify it fails**

Run: `pnpm vitest run src/add-os/modules/pricing/components`
Expected: FAIL (component missing).

- [ ] **Step 9: Implement `CouponFormDrawer.vue`**

```vue
<!-- src/add-os/modules/pricing/components/CouponFormDrawer.vue -->
<!--
	Create or edit one coupon. Every save sends the whole coupon — the server
	requires code, type and value on an update too — and edit mode is seeded
	from the detail endpoint, the only read that carries the member list.
-->
<template>
	<n-drawer v-model:show="show" :width="560" :placement="isRtl ? 'left' : 'right'">
		<n-drawer-content :title="couponId ? t('coupons.form.editTitle', { code: form.code }) : t('coupons.form.createTitle')" closable>
			<n-spin :show="loading">
				<n-alert v-if="grouped.other.length || loadFailed" type="error" :bordered="false" class="mb-4" data-test="coupon-form-other-errors">
					<div v-if="loadFailed">{{ t("coupons.form.loadError") }}</div>
					<div v-for="text in grouped.other" :key="text">{{ text }}</div>
				</n-alert>

				<n-form label-placement="top" class="flex flex-col gap-2">
					<h3 class="font-semibold">{{ t("coupons.form.basics") }}</h3>
					<n-form-item :label="t('coupons.form.code')" v-bind="fieldState('code')">
						<n-input :value="form.code" :maxlength="40" dir="ltr" @update:value="value => (form.code = value.toUpperCase())" />
					</n-form-item>
					<span class="text-xs text-secondary -mt-2 mb-2">{{ t("coupons.form.codeHint") }}</span>
					<div class="grid grid-cols-2 gap-3">
						<n-form-item :label="`${t('coupons.form.name')} (ع)`" v-bind="fieldState('name.ar')"><n-input v-model:value="nameAr" dir="rtl" /></n-form-item>
						<n-form-item :label="`${t('coupons.form.name')} (EN)`" v-bind="fieldState('name.en')"><n-input v-model:value="nameEn" dir="ltr" /></n-form-item>
						<n-form-item :label="`${t('coupons.form.description')} (ع)`" v-bind="fieldState('description.ar')"><n-input v-model:value="descriptionAr" type="textarea" :rows="2" dir="rtl" /></n-form-item>
						<n-form-item :label="`${t('coupons.form.description')} (EN)`" v-bind="fieldState('description.en')"><n-input v-model:value="descriptionEn" type="textarea" :rows="2" dir="ltr" /></n-form-item>
					</div>
					<n-form-item :label="t('coupons.form.isActive')"><n-switch v-model:value="form.is_active" /></n-form-item>

					<h3 class="font-semibold">{{ t("coupons.form.discount") }}</h3>
					<n-form-item :label="t('coupons.form.discountType')" v-bind="fieldState('discount_type')">
						<n-radio-group v-model:value="form.discount_type">
							<n-radio value="percentage">{{ t("coupons.form.percentage") }}</n-radio>
							<n-radio value="amount_off">{{ t("coupons.form.amountOff") }}</n-radio>
						</n-radio-group>
					</n-form-item>
					<div class="grid grid-cols-2 gap-3">
						<n-form-item :label="t('coupons.form.discountValue')" v-bind="fieldState('discount_value')">
							<n-input-number v-model:value="form.discount_value" :min="1" :max="form.discount_type === 'percentage' ? 100 : undefined" :precision="0" class="w-full" />
						</n-form-item>
						<n-form-item v-if="form.discount_type === 'percentage'" :label="t('coupons.form.maxDiscount')" v-bind="fieldState('max_discount_points')">
							<n-input-number v-model:value="form.max_discount_points" :min="1" :precision="0" clearable class="w-full" />
						</n-form-item>
					</div>

					<h3 class="font-semibold">{{ t("coupons.form.conditions") }}</h3>
					<n-form-item :label="t('coupons.form.minAmount')" :feedback="fieldState('min_amount_points').feedback ?? t('coupons.form.minAmountHint')" :validation-status="fieldState('min_amount_points')['validation-status']">
						<n-input-number v-model:value="form.min_amount_points" :min="0" :precision="0" clearable class="w-full" />
					</n-form-item>
					<n-form-item :label="t('coupons.form.combinable')"><n-switch v-model:value="form.combinable_with_offers" /></n-form-item>

					<h3 class="font-semibold">{{ t("coupons.form.limits") }}</h3>
					<div class="grid grid-cols-2 gap-3">
						<n-form-item :label="t('coupons.form.usageLimit')" v-bind="fieldState('usage_limit')">
							<div class="flex w-full flex-col gap-1">
								<n-input-number v-model:value="form.usage_limit" :min="1" :precision="0" :disabled="form.usage_unlimited" class="w-full" />
								<n-checkbox v-model:checked="form.usage_unlimited">{{ t("coupons.form.unlimited") }}</n-checkbox>
							</div>
						</n-form-item>
						<n-form-item :label="t('coupons.form.perUserLimit')" v-bind="fieldState('per_user_limit')">
							<div class="flex w-full flex-col gap-1">
								<n-input-number v-model:value="form.per_user_limit" :min="1" :precision="0" :disabled="form.per_user_unlimited" class="w-full" />
								<n-checkbox v-model:checked="form.per_user_unlimited">{{ t("coupons.form.unlimited") }}</n-checkbox>
							</div>
						</n-form-item>
					</div>

					<h3 class="font-semibold">{{ t("coupons.form.eligibility") }}</h3>
					<n-form-item :label="t('coupons.form.newMembersOnly')"><n-switch v-model:value="form.new_members_only" /></n-form-item>
					<n-form-item :label="t('coupons.form.company')" v-bind="fieldState('company_id')">
						<n-select v-model:value="form.company_id" :options="pickers.companies.value" filterable clearable />
					</n-form-item>
					<n-form-item :label="t('coupons.form.users')" :feedback="fieldState('user_ids').feedback ?? t('coupons.form.usersHint')" :validation-status="fieldState('user_ids')['validation-status']">
						<n-select v-model:value="form.user_ids" :options="pickers.users.value" multiple filterable clearable />
					</n-form-item>

					<h3 class="font-semibold">{{ t("coupons.form.validity") }}</h3>
					<n-form-item :label="t('coupons.form.startsAt')" v-bind="fieldState('starts_at')"><DateTimeInput v-model="form.starts_at" /></n-form-item>
					<n-form-item :label="t('coupons.form.endsAt')" v-bind="fieldState('ends_at')"><DateTimeInput v-model="form.ends_at" /></n-form-item>

					<h3 class="font-semibold">{{ t("coupons.form.targets") }}</h3>
					<p v-if="!form.targets.length" class="text-sm text-secondary">{{ t("coupons.form.targetsEmpty") }}</p>
					<div v-for="(row, index) in form.targets" :key="index" class="flex flex-col gap-1 rounded-lg border border-[var(--border-color)] p-2">
						<div class="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
							<n-select :value="row.purpose" :options="purposeOptions" :placeholder="t('coupons.form.purpose')" size="small" @update:value="value => setPurpose(row, value)" />
							<n-select :value="row.itemKey" :options="itemKindOptions(row)" :placeholder="t('coupons.form.itemKind')" :disabled="!row.purpose" size="small" clearable @update:value="value => setItemKey(row, value)" />
							<n-select v-model:value="row.itemValue" :options="row.itemKey ? pickers.optionsFor(row.itemKey) : []" :placeholder="t('coupons.form.item')" :disabled="!row.itemKey" filterable size="small" />
							<n-button quaternary circle size="small" :aria-label="t('coupons.form.cancel')" @click="form.targets.splice(index, 1)">
								<template #icon><Icon name="carbon:close" :size="16" /></template>
							</n-button>
						</div>
						<n-text v-if="grouped.targets[index]" type="error" class="text-xs" :data-test="`coupon-target-error-${index}`">
							<div v-for="text in grouped.targets[index]" :key="text">{{ text }}</div>
						</n-text>
					</div>
					<n-button dashed size="small" @click="form.targets.push({ purpose: null, itemKey: null, itemValue: null })">
						<template #icon><Icon name="carbon:add" :size="16" /></template>
						{{ t("coupons.form.addTarget") }}
					</n-button>
				</n-form>
			</n-spin>
			<template #footer>
				<div class="flex gap-2">
					<n-button @click="show = false">{{ t("coupons.form.cancel") }}</n-button>
					<n-button type="primary" :loading="saving" data-test="coupon-form-save" @click="submit">{{ t("coupons.form.save") }}</n-button>
				</div>
			</template>
		</n-drawer-content>
	</n-drawer>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { CouponForm, TargetRow } from "@/add-os/modules/pricing/utils/coupon-form"
import type { PricingPurpose, TargetItemKey } from "@/add-os/modules/pricing/types/coupon"
import { NAlert, NButton, NCheckbox, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NInputNumber, NRadio, NRadioGroup, NSelect, NSpin, NSwitch, NText, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import DateTimeInput from "@/add-os/components/form/DateTimeInput.vue"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { usePricingPickers } from "@/add-os/modules/pricing/composables/usePricingPickers"
import { ITEM_KEYS_BY_PURPOSE, PRICING_PURPOSES } from "@/add-os/modules/pricing/types/coupon"
import { couponToForm, emptyCouponForm, formToPayload, groupErrors } from "@/add-os/modules/pricing/utils/coupon-form"
import { ApiError } from "@/add-os/services/api"
import { createCoupon, getCoupon, updateCoupon } from "@/add-os/services/coupons"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{ couponId: number | null }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const pickers = usePricingPickers()
const isRtl = computed(() => currentLocale.value === "ar")

const KNOWN = ["code", "name.ar", "name.en", "description.ar", "description.en", "discount_type", "discount_value", "max_discount_points", "min_amount_points", "usage_limit", "per_user_limit", "company_id", "user_ids", "starts_at", "ends_at"]

const form = ref<CouponForm>(emptyCouponForm())
const errors = ref<Record<string, string[]>>({})
const grouped = computed(() => groupErrors(errors.value, KNOWN))
const loading = ref(false)
const loadFailed = ref(false)
const saving = ref(false)

function bilingual(key: "name" | "description", locale: "ar" | "en") {
	return computed({
		get: () => form.value[key]?.[locale] ?? "",
		set: (value: string) => {
			form.value[key] = { ar: "", en: "", ...form.value[key], [locale]: value }
		}
	})
}
const nameAr = bilingual("name", "ar")
const nameEn = bilingual("name", "en")
const descriptionAr = bilingual("description", "ar")
const descriptionEn = bilingual("description", "en")

function fieldState(key: string): { "feedback"?: string, "validation-status"?: "error" } {
	const list = grouped.value.fields[key]
	return list?.length ? { "feedback": list[0], "validation-status": "error" } : {}
}

const purposeOptions = computed<SelectOption[]>(() => PRICING_PURPOSES.map(value => ({ label: t(`pricing.purpose.${value}`), value })))
function itemKindOptions(row: TargetRow): SelectOption[] {
	return row.purpose ? ITEM_KEYS_BY_PURPOSE[row.purpose].map(key => ({ label: t(`pricing.item.${key}`), value: key })) : []
}
function setPurpose(row: TargetRow, purpose: PricingPurpose): void {
	row.purpose = purpose
	row.itemKey = null
	row.itemValue = null
}
function setItemKey(row: TargetRow, key: TargetItemKey | null): void {
	row.itemKey = key
	row.itemValue = null
}

async function open(): Promise<void> {
	errors.value = {}
	loadFailed.value = false
	form.value = emptyCouponForm()
	loading.value = true
	try {
		await pickers.load()
		if (props.couponId !== null) form.value = couponToForm(await getCoupon(props.couponId))
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		loadFailed.value = true
	} finally {
		loading.value = false
	}
}

watch(show, (visible) => {
	if (visible) void open()
}, { immediate: true })

async function submit(): Promise<void> {
	errors.value = {}
	saving.value = true
	try {
		const payload = formToPayload(form.value)
		if (props.couponId === null) {
			await createCoupon(payload)
			message.success(t("coupons.form.saved"))
		} else {
			message.success((await updateCoupon(props.couponId, payload)).message)
		}
		emit("saved")
		show.value = false
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (caught.status === 422 && caught.data?.errors) errors.value = caught.data.errors
		else errors.value = { _: [caught.data?.message ?? t("coupons.form.loadError")] }
	} finally {
		saving.value = false
	}
}

defineExpose({ form, submit })
</script>
```

The `(ع)` / `(EN)` suffixes copy the bilingual-label convention. **Check how
`ResourceFormDrawer` labels its ar/en inputs** (around line 30) and use the same i18n
keys instead of literals if they exist (`resourceCrud.form.*`). Literal strings in
templates break the "no literal strings" rule.

- [ ] **Step 10: Run the tests**

Run: `pnpm vitest run src/add-os/modules/pricing`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/add-os/modules/pricing/utils/coupon-form.ts src/add-os/modules/pricing/utils/__tests__/coupon-form.spec.ts src/add-os/modules/pricing/composables/usePricingPickers.ts src/add-os/modules/pricing/components/CouponFormDrawer.vue src/add-os/modules/pricing/components/__tests__/CouponFormDrawer.spec.ts src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(pricing): coupon form" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Coupon detail drawer with the redemption log

**Files:**
- Create: `src/add-os/modules/pricing/components/CouponDetailDrawer.vue`
- Modify: `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json` (`coupons.detail.*`, `coupons.redemption.*`)
- Test: `src/add-os/modules/pricing/components/__tests__/CouponDetailDrawer.spec.ts`

**Interfaces:**
- Consumes: `getCoupon`, `listCouponRedemptions` (Task 2); `usePricingPickers` (Task 7); `formatDateTime`, `formatNumber`.
- Consumes also: `discountLabel` from `coupon-form.ts` (Task 7).
- Produces: `<CouponDetailDrawer v-model:show :coupon-id="number | null" />`.

- [ ] **Step 1: i18n**

en:
```json
"detail": {
	"title": "Coupon {code}", "allPurchases": "All purchases except wallet top-ups", "everyone": "Everyone",
	"discountPercent": "{value}%", "discountPoints": "{value} points", "cap": "up to {value} points",
	"createdAt": "Created", "redemptions": "Uses", "noRedemptions": "Not used yet.", "loadError": "Could not load this coupon."
},
"redemption": {
	"member": "Member", "purpose": "Purchase", "record": "Record", "base": "Price", "discounted": "Discount", "date": "Date", "state": "State",
	"used": "Used", "refunded": "Refunded"
}
```
(nested under `coupons`). ar:
```json
"detail": {
	"title": "الكوبون {code}", "allPurchases": "كل المشتريات عدا شحن المحفظة", "everyone": "الجميع",
	"discountPercent": "{value}٪ خصم", "discountPoints": "{value} نقطة خصم", "cap": "حتى {value} نقطة",
	"createdAt": "أُنشئ في", "redemptions": "الاستخدامات", "noRedemptions": "لم يُستخدم بعد.", "loadError": "تعذّر تحميل هذا الكوبون."
},
"redemption": {
	"member": "العضو", "purpose": "نوع الشراء", "record": "السجل", "base": "السعر", "discounted": "الخصم", "date": "التاريخ", "state": "الحالة",
	"used": "مُستخدَم", "refunded": "مُستردّ"
}
```

- [ ] **Step 2: Write the failing test**

```ts
import { flushPromises, mount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import CouponDetailDrawer from "../CouponDetailDrawer.vue"

vi.mock("@/add-os/services/coupons", () => ({
	getCoupon: vi.fn().mockResolvedValue({ id: 7, code: "VIP", name: null, description: null, discount_type: "percentage", discount_value: 20, max_discount_points: 50, min_amount_points: null, combinable_with_offers: true, usage_limit: 10, per_user_limit: 1, new_members_only: false, company_id: null, starts_at: null, ends_at: null, is_active: true, used: 1, targets: [], user_ids: [], created_by: 1, created_at: "2026-10-05T05:00:00Z" }),
	listCouponRedemptions: vi.fn().mockResolvedValue({ data: [
		{ id: 1, user: { id: 4, name: "Reem", phone: "0990" }, purpose: "booking", booking_id: 12, walkin_session_id: null, event_attendee_id: null, payment_id: null, discount_type: "percentage", discount_value: 20, max_discount_points: 50, base_points: 120, points_discounted: 24, counts: true, created_at: "2026-10-05T07:00:00Z" },
		{ id: 2, user: { id: 5, name: "Omar", phone: "0991" }, purpose: "booking", booking_id: 13, walkin_session_id: null, event_attendee_id: null, payment_id: null, discount_type: "percentage", discount_value: 20, max_discount_points: 50, base_points: 120, points_discounted: 24, counts: false, created_at: "2026-10-05T08:00:00Z" }
	], meta: { current_page: 1, last_page: 1, per_page: 10, total: 2 } })
}))
vi.mock("@/add-os/modules/pricing/composables/usePricingPickers", () => ({
	usePricingPickers: () => ({ load: vi.fn().mockResolvedValue(undefined), optionsFor: () => [], nameOf: (_k: string, id: number) => `#${id}` })
}))

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

describe("couponDetailDrawer", () => {
	it("shows a given-back use as Refunded, not Used", async () => {
		const wrapper = mount(CouponDetailDrawer, { props: { show: true, couponId: 7 }, global: { plugins: [i18n], stubs: { teleport: true } }, attachTo: document.body })
		await flushPromises()
		const states = wrapper.findAll("[data-test='redemption-state']").map(node => node.text())
		expect(states).toEqual(["Used", "Refunded"])
	})
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm vitest run src/add-os/modules/pricing/components/__tests__/CouponDetailDrawer.spec.ts`
Expected: FAIL (component missing).

- [ ] **Step 4: Implement**

```vue
<!-- src/add-os/modules/pricing/components/CouponDetailDrawer.vue -->
<!--
	One coupon's terms, and every use of it. A use whose booking was
	cancelled, rejected or never paid was given back — it reads "Refunded",
	and no longer counts against the limits.
-->
<template>
	<n-drawer v-model:show="show" :width="620" :placement="isRtl ? 'left' : 'right'">
		<n-drawer-content :title="coupon ? t('coupons.detail.title', { code: coupon.code }) : ''" closable>
			<n-spin :show="loading">
				<n-alert v-if="failed" type="error" :bordered="false">{{ t("coupons.detail.loadError") }}</n-alert>
				<div v-if="coupon" class="flex flex-col gap-4 text-sm">
					<dl class="flex flex-col divide-y divide-[var(--border-color)]">
						<div v-for="field in fields" :key="field.label" class="flex justify-between gap-4 py-2">
							<dt class="text-secondary">{{ field.label }}</dt>
							<dd class="text-end font-medium">{{ field.value }}</dd>
						</div>
					</dl>

					<h3 class="font-semibold">{{ t("coupons.detail.redemptions") }}</h3>
					<n-data-table remote size="small" :columns :data="redemptions" :loading="redemptionsLoading" :pagination :bordered="false" @update:page="loadRedemptions" />
				</div>
			</n-spin>
		</n-drawer-content>
	</n-drawer>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Coupon, CouponRedemption } from "@/add-os/modules/pricing/types/coupon"
import { NAlert, NDataTable, NDrawer, NDrawerContent, NSpin, NTag } from "naive-ui"
import { computed, h, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { usePricingPickers } from "@/add-os/modules/pricing/composables/usePricingPickers"
import { discountLabel } from "@/add-os/modules/pricing/utils/coupon-form"
import { ApiError } from "@/add-os/services/api"
import { getCoupon, listCouponRedemptions } from "@/add-os/services/coupons"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"

const props = defineProps<{ couponId: number | null }>()
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()
const pickers = usePricingPickers()
const isRtl = computed(() => currentLocale.value === "ar")

const PAGE_SIZE = 10
const coupon = ref<Coupon | null>(null)
const loading = ref(false)
const failed = ref(false)
const redemptions = ref<CouponRedemption[]>([])
const redemptionsLoading = ref(false)
const page = ref(1)
const total = ref(0)
const pagination = computed(() => ({ page: page.value, pageSize: PAGE_SIZE, itemCount: total.value }))

const fields = computed(() => {
	const c = coupon.value
	if (!c) return []
	const dash = "—"
	return [
		{ label: t("coupons.form.name"), value: c.name ? pickLocalized(c.name, currentLocale.value) : dash },
		{ label: t("coupons.form.discount"), value: discountLabel(t, c) + (c.max_discount_points ? ` · ${t("coupons.detail.cap", { value: formatNumber(c.max_discount_points) })}` : "") },
		{ label: t("coupons.form.minAmount"), value: c.min_amount_points === null ? dash : formatNumber(c.min_amount_points) },
		{ label: t("coupons.form.combinable"), value: c.combinable_with_offers ? "✓" : "✗" },
		{ label: t("coupons.form.usageLimit"), value: `${formatNumber(c.used ?? 0)} / ${c.usage_limit === null ? "∞" : formatNumber(c.usage_limit)}` },
		{ label: t("coupons.form.perUserLimit"), value: c.per_user_limit === null ? t("coupons.form.unlimited") : formatNumber(c.per_user_limit) },
		{ label: t("coupons.form.newMembersOnly"), value: c.new_members_only ? "✓" : "✗" },
		{ label: t("coupons.form.company"), value: c.company_id === null ? dash : pickers.nameOf("company_id", c.company_id) },
		{ label: t("coupons.form.users"), value: c.user_ids?.length ? c.user_ids.map(id => pickers.nameOf("user", id)).join("، ") : t("coupons.detail.everyone") },
		{ label: t("coupons.form.startsAt"), value: c.starts_at ? formatDateTime(c.starts_at) : dash },
		{ label: t("coupons.form.endsAt"), value: c.ends_at ? formatDateTime(c.ends_at) : dash },
		{ label: t("coupons.form.targets"), value: c.targets?.length ? c.targets.map(target => targetLabel(target)).join(" · ") : t("coupons.detail.allPurchases") },
		{ label: t("coupons.detail.createdAt"), value: formatDateTime(c.created_at) }
	]
})

function targetLabel(target: NonNullable<Coupon["targets"]>[number]): string {
	const purpose = t(`pricing.purpose.${target.purpose}`)
	if (target.plan_id !== null) return `${purpose}: ${pickers.nameOf("plan_id", target.plan_id)}`
	if (target.space_id !== null) return `${purpose}: ${pickers.nameOf("space_id", target.space_id)}`
	if (target.space_type !== null) return `${purpose}: ${t(`spaces.spaceType.${target.space_type}`)}`
	if (target.event_id !== null) return `${purpose}: ${pickers.nameOf("event_id", target.event_id)}`
	return purpose
}

function recordOf(row: CouponRedemption): string {
	const id = row.booking_id ?? row.walkin_session_id ?? row.event_attendee_id ?? row.payment_id
	return id === null ? "—" : `#${id}`
}

const columns = computed<DataTableColumns<CouponRedemption>>(() => [
	{ title: t("coupons.redemption.member"), key: "user", render: row => (row.user ? h("div", { class: "flex flex-col" }, [h("span", row.user.name), h("bdi", { dir: "ltr", class: "text-xs text-secondary" }, row.user.phone)]) : "—") },
	{ title: t("coupons.redemption.purpose"), key: "purpose", render: row => t(`pricing.purpose.${row.purpose}`) },
	{ title: t("coupons.redemption.record"), key: "record", render: row => h("bdi", { dir: "ltr" }, recordOf(row)) },
	{ title: t("coupons.redemption.base"), key: "base_points", render: row => formatNumber(row.base_points) },
	{ title: t("coupons.redemption.discounted"), key: "points_discounted", render: row => formatNumber(row.points_discounted) },
	{ title: t("coupons.redemption.date"), key: "created_at", render: row => formatDateTime(row.created_at) },
	{
		title: t("coupons.redemption.state"),
		key: "counts",
		render: row => h(NTag, { "size": "small", "round": true, "bordered": false, "type": row.counts ? "success" : "default", "data-test": "redemption-state" }, { default: () => t(row.counts ? "coupons.redemption.used" : "coupons.redemption.refunded") })
	}
])

async function loadRedemptions(next = 1): Promise<void> {
	if (props.couponId === null) return
	page.value = next
	redemptionsLoading.value = true
	try {
		const result = await listCouponRedemptions(props.couponId, { page: next, per_page: PAGE_SIZE })
		redemptions.value = result.data
		total.value = result.meta.total
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		failed.value = true
	} finally {
		redemptionsLoading.value = false
	}
}

async function open(): Promise<void> {
	if (props.couponId === null) return
	coupon.value = null
	failed.value = false
	loading.value = true
	try {
		await pickers.load()
		coupon.value = await getCoupon(props.couponId)
		await loadRedemptions(1)
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		failed.value = true
	} finally {
		loading.value = false
	}
}

watch(() => [show.value, props.couponId] as const, ([visible]) => {
	if (visible) void open()
}, { immediate: true })
</script>
```

The ✓/✗ marks are symbols, not words, which is
acceptable in templates. **If** `messages.spec` or the literal-string guard flags them,
switch to `t("common.yes")`/`t("common.no")`, or whatever yes/no keys `en.json` already
has (grep `"yes"`).

- [ ] **Step 5: Run it to verify it passes**

Run: `pnpm vitest run src/add-os/modules/pricing/components`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/add-os/modules/pricing/components/CouponDetailDrawer.vue src/add-os/modules/pricing/components/__tests__/CouponDetailDrawer.spec.ts src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json
git commit -m "feat(pricing): coupon details and its redemption log" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Coupons page, nav and route

**Files:**
- Create: `src/add-os/modules/pricing/views/CouponsPage.vue`
- Modify: `src/add-os/navigation/sections.ts` (`plans.pages`: append `{ key: "coupons", path: "coupons" }`)
- Modify: `src/add-os/navigation/routes.ts` (`PAGE_COMPONENTS`: `"plans.coupons": () => import("@/add-os/modules/pricing/views/CouponsPage.vue")`)
- Modify: `src/add-os/lang/en/en.json`, `src/add-os/lang/ar/ar.json` (`nav.pages.coupons`, `coupons.page.*`, `coupons.columns.*`, `coupons.filters.*`, `coupons.state.*`, `coupons.delete.*`)
- Modify: `src/add-os/assets/icons.generated.json` (via `pnpm icons`)
- Test: `src/add-os/modules/pricing/views/__tests__/CouponsPage.spec.ts`

**Interfaces:**
- Consumes: `listCoupons`, `deleteCoupon`, `setCouponActive` (Task 2); `canManageCoupons` (Task 3); `CouponFormDrawer` and `discountLabel` (Task 7); `CouponDetailDrawer` (Task 8).

- [ ] **Step 1: i18n**

en (`nav.pages.coupons: "Coupons"`; under `coupons`):
```json
"page": { "description": "Discount codes members type at checkout, and who has used them.", "new": "New coupon", "refresh": "Refresh", "loadError": "Could not load the coupons.", "count": "{count} coupons", "searchPlaceholder": "Search by code" },
"filters": { "state": "Window", "active": "Status", "activeYes": "Active", "activeNo": "Inactive" },
"state": { "running": "Running", "scheduled": "Scheduled", "ended": "Ended" },
"columns": { "code": "Code", "name": "Name", "discount": "Discount", "targets": "Applies to", "usage": "Used", "window": "Valid", "active": "Active", "actions": "Actions" },
"delete": {
	"confirmTitle": "Delete coupon {code}?", "confirmBody": "This cannot be undone.", "confirm": "Delete", "cancel": "Cancel", "deleted": "Coupon deleted.",
	"conflictTitle": "This coupon cannot be deleted", "deactivateInstead": "Deactivate instead",
	"deactivateTitle": "Deactivate {code}?", "deactivateBody": "Members will no longer be able to use it. Its history is kept.", "deactivate": "Deactivate"
},
"edit": "Edit"
```
ar:
```json
"page": { "description": "أكواد الخصم التي يكتبها الأعضاء عند الدفع، ومن استخدمها.", "new": "كوبون جديد", "refresh": "تحديث", "loadError": "تعذّر تحميل الكوبونات.", "count": "{count} كوبون", "searchPlaceholder": "ابحث بالكود" },
"filters": { "state": "الفترة", "active": "الحالة", "activeYes": "مفعّل", "activeNo": "معطّل" },
"state": { "running": "سارٍ", "scheduled": "مجدول", "ended": "منتهٍ" },
"columns": { "code": "الكود", "name": "الاسم", "discount": "الخصم", "targets": "يُطبَّق على", "usage": "الاستخدام", "window": "الصلاحية", "active": "مفعّل", "actions": "إجراءات" },
"delete": {
	"confirmTitle": "حذف الكوبون {code}؟", "confirmBody": "لا يمكن التراجع عن ذلك.", "confirm": "حذف", "cancel": "إلغاء", "deleted": "تم حذف الكوبون.",
	"conflictTitle": "لا يمكن حذف هذا الكوبون", "deactivateInstead": "تعطيل بدلاً من الحذف",
	"deactivateTitle": "تعطيل {code}؟", "deactivateBody": "لن يتمكن الأعضاء من استخدامه بعد الآن، ويبقى سجله محفوظاً.", "deactivate": "تعطيل"
},
"edit": "تعديل"
```
ar `nav.pages.coupons: "الكوبونات"`.

- [ ] **Step 2: Write the failing test**

```ts
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import { ApiError } from "@/add-os/services/api"
import CouponsPage from "../CouponsPage.vue"

const { listMock, deleteMock, activeMock, gate, dialogs } = vi.hoisted(() => ({
	listMock: vi.fn(),
	deleteMock: vi.fn(),
	activeMock: vi.fn(),
	gate: { admin: true },
	dialogs: [] as { title: string, content?: unknown, positiveText?: string, onPositiveClick?: () => unknown }[]
}))

vi.mock("@/add-os/services/coupons", () => ({ listCoupons: listMock, deleteCoupon: deleteMock, setCouponActive: activeMock }))
vi.mock("@/add-os/config/permissions", () => ({ canManageCoupons: () => gate.admin }))
vi.mock("@/add-os/modules/pricing/components/CouponFormDrawer.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/add-os/modules/pricing/components/CouponDetailDrawer.vue", () => ({ default: { template: "<div />" } }))
// Dialogs are recorded; a test decides whether to "click" positive.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	const record = (options: (typeof dialogs)[number]) => { dialogs.push(options); return { destroy: vi.fn() } }
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }), useDialog: () => ({ warning: record, error: record, info: record }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })
const row = (overrides = {}) => ({ id: 7, code: "VIP", name: null, discount_type: "percentage", discount_value: 20, max_discount_points: null, usage_limit: 10, used: 3, targets: [], starts_at: null, ends_at: null, is_active: true, ...overrides })

async function mountPage() {
	const wrapper = mount(CouponsPage, { global: { plugins: [i18n] } })
	await flushPromises()
	return wrapper
}

describe("couponsPage", () => {
	beforeEach(() => {
		dialogs.length = 0
		gate.admin = true
		listMock.mockReset().mockResolvedValue({ data: [row(), row({ id: 8, code: "OPEN", usage_limit: null, used: 5 })], meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 } })
		deleteMock.mockReset()
		activeMock.mockReset().mockResolvedValue({ message: "Saved." })
	})

	it("shows usage as used / limit, with ∞ for no limit", async () => {
		const text = (await mountPage()).text()
		expect(text).toContain("3 / 10")
		expect(text).toContain("5 / ∞")
	})

	it("gives operations no write control", async () => {
		gate.admin = false
		const wrapper = await mountPage()
		expect(wrapper.find("[data-test='coupon-new']").exists()).toBe(false)
		expect(wrapper.find("[data-test='coupon-delete']").exists()).toBe(false)
		expect(wrapper.find("[data-test='coupon-active-switch']").exists()).toBe(false)
	})

	it("switches active through setCouponActive", async () => {
		const wrapper = await mountPage()
		await wrapper.get("[data-test='coupon-active-switch']").trigger("click")
		await flushPromises()
		expect(activeMock).toHaveBeenCalledWith(7, false)
	})

	it("on a 409 shows the server message and deactivates only after two confirmations", async () => {
		deleteMock.mockRejectedValue(new ApiError(409, JSON.stringify({ message: "This code has already been used." })))
		const wrapper = await mountPage()
		await wrapper.get("[data-test='coupon-delete']").trigger("click")
		await dialogs[0].onPositiveClick?.()
		await flushPromises()
		expect(dialogs[1].content).toBe("This code has already been used.")
		expect(dialogs[1].positiveText).toBe("Deactivate instead")
		expect(activeMock).not.toHaveBeenCalled()
		await dialogs[1].onPositiveClick?.()
		await flushPromises()
		expect(activeMock).not.toHaveBeenCalled()
		await dialogs[2].onPositiveClick?.()
		await flushPromises()
		expect(activeMock).toHaveBeenCalledWith(7, false)
	})

	it("keeps the newest answer when filters change quickly", async () => {
		let resolveOld!: (v: unknown) => void
		listMock.mockReset()
			.mockResolvedValueOnce({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } })
			.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
			.mockResolvedValueOnce({ data: [row({ code: "NEW" })], meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 } })
		const wrapper = await mountPage()
		const vm = wrapper.vm as unknown as { filters: { state: string | null } }
		vm.filters.state = "running"
		await flushPromises()
		vm.filters.state = "ended"
		await flushPromises()
		resolveOld({ data: [row({ code: "OLD" })], meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 } })
		await flushPromises()
		expect(wrapper.text()).toContain("NEW")
		expect(wrapper.text()).not.toContain("OLD")
	})
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm vitest run src/add-os/modules/pricing/views`
Expected: FAIL (component missing).

- [ ] **Step 4: Implement `CouponsPage.vue`**

```vue
<!-- src/add-os/modules/pricing/views/CouponsPage.vue -->
<!--
	Every discount code, paged by the server. Operations reads; only an admin
	sees the controls that change one. Deleting a used code is refused by the
	server (409) — the admin is offered deactivation, and decides.
-->
<template>
	<div class="flex flex-col gap-6">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.coupons") }}</h1>
				<p class="text-secondary">{{ t("coupons.page.description") }}</p>
			</div>
			<div class="flex gap-2">
				<n-button secondary size="small" :loading="isLoading" @click="fetchPage">
					<template #icon><Icon name="carbon:renew" :size="16" /></template>
					{{ t("coupons.page.refresh") }}
				</n-button>
				<n-button v-if="canWrite" type="primary" size="small" data-test="coupon-new" @click="openForm(null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("coupons.page.new") }}
				</n-button>
			</div>
		</div>

		<n-card size="small">
			<div class="flex flex-col gap-4">
				<div class="flex flex-wrap items-center gap-3">
					<div class="w-64 shrink-0">
						<n-input v-model:value="search" clearable size="small" :placeholder="t('coupons.page.searchPlaceholder')">
							<template #prefix><Icon name="carbon:search" :size="16" /></template>
						</n-input>
					</div>
					<n-select v-model:value="filters.state" :options="stateOptions" :placeholder="t('coupons.filters.state')" clearable size="small" class="w-44" />
					<n-select v-model:value="filters.is_active" :options="activeOptions" :placeholder="t('coupons.filters.active')" clearable size="small" class="w-44" />
					<span class="text-xs text-secondary ms-auto">{{ t("coupons.page.count", { count: formatNumber(total) }) }}</span>
				</div>
				<n-alert v-if="failed" type="error" :bordered="false">{{ t("coupons.page.loadError") }}</n-alert>
				<n-data-table remote :columns :data="rows" :loading="isLoading" :bordered="false" :row-key="(row: Coupon) => row.id" :pagination :row-props size="small" @update:page="onPage" />
			</div>
		</n-card>

		<CouponFormDrawer v-model:show="formVisible" :coupon-id="formId" @saved="fetchPage" />
		<CouponDetailDrawer v-model:show="detailVisible" :coupon-id="detailId" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { Coupon } from "@/add-os/modules/pricing/types/coupon"
import { NAlert, NButton, NCard, NDataTable, NInput, NSelect, NSwitch, NTag, useDialog, useMessage } from "naive-ui"
import { computed, h, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { canManageCoupons } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import CouponDetailDrawer from "@/add-os/modules/pricing/components/CouponDetailDrawer.vue"
import CouponFormDrawer from "@/add-os/modules/pricing/components/CouponFormDrawer.vue"
import { COUPON_STATES } from "@/add-os/modules/pricing/types/coupon"
import { discountLabel } from "@/add-os/modules/pricing/utils/coupon-form"
import { ApiError } from "@/add-os/services/api"
import { deleteCoupon, listCoupons, setCouponActive } from "@/add-os/services/coupons"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const canWrite = canManageCoupons()

const PAGE_SIZE = 20
const filters = reactive<{ state: string | null, is_active: number | null }>({ state: null, is_active: null })
const search = ref("")
const searchTerm = ref("")
const rows = ref<Coupon[]>([])
const total = ref(0)
const page = ref(1)
const isLoading = ref(false)
const failed = ref(false)
const toggling = ref<number | null>(null)
const formVisible = ref(false)
const formId = ref<number | null>(null)
const detailVisible = ref(false)
const detailId = ref<number | null>(null)
let request = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined

const stateOptions = computed<SelectOption[]>(() => COUPON_STATES.map(value => ({ label: t(`coupons.state.${value}`), value })))
const activeOptions = computed<SelectOption[]>(() => [{ label: t("coupons.filters.activeYes"), value: 1 }, { label: t("coupons.filters.activeNo"), value: 0 }])
const pagination = computed(() => ({ page: page.value, pageSize: PAGE_SIZE, itemCount: total.value }))

function usage(row: Coupon): string {
	return `${formatNumber(row.used ?? 0)} / ${row.usage_limit === null ? "∞" : formatNumber(row.usage_limit)}`
}

const columns = computed<DataTableColumns<Coupon>>(() => [
	{ title: t("coupons.columns.code"), key: "code", render: row => h("bdi", { dir: "ltr", class: "font-mono font-semibold" }, row.code) },
	{ title: t("coupons.columns.name"), key: "name", render: row => (row.name ? pickLocalized(row.name, currentLocale.value) || "—" : "—") },
	{ title: t("coupons.columns.discount"), key: "discount", render: row => discountLabel(t, row) },
	{
		title: t("coupons.columns.targets"),
		key: "targets",
		render: row => (row.targets?.length
			? h("div", { class: "flex flex-wrap gap-1" }, [...new Set(row.targets.map(target => target.purpose))].map(purpose => h(NTag, { size: "small", bordered: false }, { default: () => t(`pricing.purpose.${purpose}`) })))
			: t("coupons.detail.allPurchases"))
	},
	{ title: t("coupons.columns.usage"), key: "used", render: row => h("bdi", { dir: "ltr" }, usage(row)) },
	{ title: t("coupons.columns.window"), key: "window", render: row => `${row.starts_at ? formatDateTime(row.starts_at) : "—"} → ${row.ends_at ? formatDateTime(row.ends_at) : "—"}` },
	{
		title: t("coupons.columns.active"),
		key: "is_active",
		render: row => (canWrite
			? h("span", { "data-test": "coupon-active-switch", "onClick": (event: MouseEvent) => { event.stopPropagation(); void toggle(row) } }, [h(NSwitch, { value: row.is_active, loading: toggling.value === row.id, size: "small" })])
			: h(NTag, { size: "small", round: true, bordered: false, type: row.is_active ? "success" : "default" }, { default: () => t(row.is_active ? "coupons.filters.activeYes" : "coupons.filters.activeNo") }))
	},
	...(canWrite
		? [{
				title: t("coupons.columns.actions"),
				key: "actions",
				render: (row: Coupon) => h("div", { class: "flex gap-1" }, [
					h(NButton, { size: "tiny", quaternary: true, onClick: (event: MouseEvent) => { event.stopPropagation(); openForm(row.id) } }, { default: () => t("coupons.edit") }),
					h(NButton, { "size": "tiny", "quaternary": true, "type": "error", "data-test": "coupon-delete", "onClick": (event: MouseEvent) => { event.stopPropagation(); confirmDelete(row) } }, { default: () => t("coupons.delete.confirm") })
				])
			}]
		: [])
])

function rowProps(row: Coupon) {
	return { class: "cursor-pointer", onClick: () => { detailId.value = row.id; detailVisible.value = true } }
}

function query(): Record<string, unknown> {
	const q: Record<string, unknown> = { page: page.value, per_page: PAGE_SIZE }
	if (filters.state) q.state = filters.state
	if (filters.is_active !== null) q.is_active = filters.is_active
	if (searchTerm.value.trim()) q.search = searchTerm.value.trim()
	return q
}

async function fetchPage(): Promise<void> {
	const current = ++request
	isLoading.value = true
	failed.value = false
	try {
		const result = await listCoupons(query())
		if (current !== request) return
		rows.value = result.data
		total.value = result.meta.total
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (current === request) failed.value = true
	} finally {
		if (current === request) isLoading.value = false
	}
}

function onPage(next: number): void {
	page.value = next
	void fetchPage()
}

watch([filters, searchTerm], () => {
	page.value = 1
	void fetchPage()
}, { deep: true })
watch(search, (value) => {
	clearTimeout(searchTimer)
	searchTimer = setTimeout(() => (searchTerm.value = value ?? ""), 350)
})

function openForm(id: number | null): void {
	formId.value = id
	formVisible.value = true
}

async function toggle(row: Coupon): Promise<void> {
	toggling.value = row.id
	try {
		message.success((await setCouponActive(row.id, !row.is_active)).message)
		await fetchPage()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		message.error(caught.data?.message ?? t("coupons.page.loadError"))
	} finally {
		toggling.value = null
	}
}

function confirmDelete(row: Coupon): void {
	dialog.warning({
		title: t("coupons.delete.confirmTitle", { code: row.code }),
		content: t("coupons.delete.confirmBody"),
		positiveText: t("coupons.delete.confirm"),
		negativeText: t("coupons.delete.cancel"),
		onPositiveClick: () => remove(row)
	})
}

async function remove(row: Coupon): Promise<void> {
	try {
		await deleteCoupon(row.id)
		message.success(t("coupons.delete.deleted"))
		await fetchPage()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (caught.status !== 409) {
			message.error(caught.data?.message ?? t("coupons.page.loadError"))
			return
		}
		// Used codes stay: the server says why, and the admin decides.
		dialog.error({
			title: t("coupons.delete.conflictTitle"),
			content: caught.data?.message ?? "",
			positiveText: t("coupons.delete.deactivateInstead"),
			negativeText: t("coupons.delete.cancel"),
			onPositiveClick: () => confirmDeactivate(row)
		})
	}
}

function confirmDeactivate(row: Coupon): void {
	dialog.warning({
		title: t("coupons.delete.deactivateTitle", { code: row.code }),
		content: t("coupons.delete.deactivateBody"),
		positiveText: t("coupons.delete.deactivate"),
		negativeText: t("coupons.delete.cancel"),
		onPositiveClick: async () => {
			message.success((await setCouponActive(row.id, false)).message)
			await fetchPage()
		}
	})
}

void fetchPage()
defineExpose({ filters })
</script>
```

The `→` arrow in the window column is a symbol, like `∞`. In RTL, wrap that cell's text
in `<bdi>` if it renders reversed (check visually in Task 10).

- [ ] **Step 5: Nav and route**

`sections.ts`, `plans.pages`: append `{ key: "coupons", path: "coupons" }`.
`routes.ts`, `PAGE_COMPONENTS`: add `"plans.coupons": () => import("@/add-os/modules/pricing/views/CouponsPage.vue"),`.

- [ ] **Step 6: Icons**

Run: `pnpm icons`. Then `git diff --stat src/add-os/assets/icons.generated.json`.
Expected: the generator runs without error. Any new Carbon names used (`carbon:renew`,
`carbon:add`, `carbon:search`, `carbon:close` already exist elsewhere) are included.

- [ ] **Step 7: Run the tests**

Run: `pnpm vitest run src/add-os/modules/pricing src/add-os/navigation`
Expected: PASS. If a navigation spec counts pages per section, update its expectation
to include `coupons` and say so in the commit body.

- [ ] **Step 8: Commit**

```bash
git add src/add-os/modules/pricing/views/CouponsPage.vue src/add-os/modules/pricing/views/__tests__/CouponsPage.spec.ts src/add-os/navigation/sections.ts src/add-os/navigation/routes.ts src/add-os/lang/en/en.json src/add-os/lang/ar/ar.json src/add-os/assets/icons.generated.json
git commit -m "feat(pricing): coupons page" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Add any navigation spec you changed in Step 7 to the `git add`.)

---

### Task 10: Full verification

**Files:** none new. This task proves the branch.

- [ ] **Step 1: Unit suite, including every architecture guard**

Run: `pnpm test:unit`
Expected: all green. Watch for `messages.spec.ts` (an Arabic value with no Arabic
script), `no-inline-role-checks`, `no-external-urls` and `icons.spec.ts`. A
worker-startup timeout is machine contention: re-run on its own, and don't call it a
pass or a fail until the re-run.

- [ ] **Step 2: Types**

Run: `pnpm type-check`
Expected: exit 0.

- [ ] **Step 3: Lint (read-only)**

Run: `pnpm lint:check`
Expected: exit 0. **Do not run `pnpm lint`.**

- [ ] **Step 4: Hardcoded-value sweep on new code**

Run: `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgb\(|[0-9]+px" src/add-os/modules/pricing src/add-os/components/form`
Expected: no matches.

- [ ] **Step 5: Build**

Run: `pnpm build`
Expected: exit 0.

- [ ] **Step 6: Contract still pinned**

Run: `pnpm api:collection:check`
Expected: `MATCH`. A `MISMATCH` means the backend moved while this branch was built.
Stop and report rather than re-pinning silently.

- [ ] **Step 7: Confirm the user's edits were never touched**

Run: `git status --short src/add-os/modules/members && git log --name-only --format= main..HEAD | grep -c "modules/members" || true`
Expected: the three `M` files are still listed as modified (not staged), and the count is `0`.

- [ ] **Step 8: Report**

Report back with the outputs of Steps 1–7, verbatim where they're short. Name anything
that was skipped or that needed a judgement call (the `disabledWhen`/`datetime` check
in Task 5, the label convention in Task 7, the ✓/✗ marks in Task 8).
