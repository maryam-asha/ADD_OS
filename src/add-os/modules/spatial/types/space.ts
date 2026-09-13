import type { OperationalStatus } from "./operational-status"
// src/add-os/modules/spatial/types/space.ts

export type SpaceType = "co_space" | "room" | "business" | "event_hall"

/**
 * The same four values at runtime, next to the type they belong to — the
 * arrangement `PAYMENT_METHODS`/`PaymentMethod` already uses in
 * `modules/payments/types/wallet-top-up.ts`.
 *
 * Lives here rather than in `spaces.config.ts`, where it started, because a
 * second consumer arrived: the reception columns need to tell a known
 * `space_type` from an unrecognised one so an unexpected value renders as
 * itself instead of a missing-translation key.
 */
export const SPACE_TYPES: readonly SpaceType[] = ["co_space", "room", "business", "event_hall"]

export interface Space {
	id: number
	building_id: number
	zone_id: number | null
	space_type: SpaceType
	allocation_model: string | null
	is_lockable: boolean
	capacity: number
	/**
	 * Hourly rate in whole points — the authoritative figure, and what the
	 * backend charges against. `null` when the space is not hourly-priced.
	 */
	hourly_rate_points: number | null
	/**
	 * `hourly_rate_points` rendered in USD by the server, as a decimal string
	 * e.g. "2.50". Display only: never parse it back into points, and never
	 * divide by the rate here — the rate is server state and can change.
	 */
	hourly_rate_usd: string | null
	/** Same value in the request's display currency, decimal string. Pairs with `currency`. */
	hourly_rate_display: string | null
	/** ISO code `hourly_rate_display` is denominated in, e.g. "SYP". */
	currency: string
	status: OperationalStatus
	status_reason: string | null
	image_url?: string | null
	main_image?: string | null
	images?: string[] | null
}

/**
 * create/update — status fields are excluded entirely; they move only through
 * SpaceStatusPayload.
 *
 * Extends `Record<string, unknown>` explicitly: a plain interface has no
 * implicit index signature, so it isn't structurally assignable to
 * `ResourceFormDrawer`'s `TModel extends Record<string, unknown>` generic
 * constraint without this (declaration merging means TS won't infer one for
 * an interface the way it would for an object type literal/type alias).
 * `Space` above is never passed as that generic, so it's left untouched.
 *
 * This also has to hold for `SpaceFormModel` (spaces.config.ts), which is
 * declared as `interface SpaceFormModel extends SpacePayload { ... }` — an
 * interface extending another interface that already satisfies
 * `Record<string, unknown>` automatically satisfies that same generic
 * constraint itself, with no explicit `extends Record<string, unknown>`
 * needed on `SpaceFormModel` (same reasoning as `ZonePayload`/`ZoneFormModel`
 * — see zone.ts).
 */
export interface SpacePayload extends Record<string, unknown> {
	/**
	 * `number | null`, not `number`: `null` is the "nothing selected yet" sentinel
	 * for the form's `building_id` select. async-validator's `isEmptyValue` only
	 * treats `undefined`, `null`, an empty array (`type: 'array'`), or an empty
	 * string (`typeof value === 'string'`) as empty — a numeric `0` matches none
	 * of those branches, so a `required: true` rule would never fire against it.
	 * `null` is caught unconditionally by `isEmptyValue`'s very first check,
	 * regardless of the rule's `type`. By the time `ResourceFormDrawer`'s
	 * validation passes and `onSubmit` fires, this is guaranteed to hold a real
	 * building id, so the widening only affects transient form-editing state,
	 * never what's actually sent to the API. `Space.building_id` above stays
	 * `number` — it is never passed as `ResourceFormDrawer`'s model generic.
	 */
	building_id: number | null
	/** Genuinely optional FK — already nullable, no sentinel fix needed here. */
	zone_id: number | null
	space_type: SpaceType
	allocation_model: string | null
	is_lockable: boolean
	capacity: number
	/**
	 * Whole points, or `null` for an unpriced space. The backend validates
	 * `integer`, so a fraction is a 422 by design. No companion currency key:
	 * a rate in points does not carry one.
	 */
	hourly_rate_points: number | null
	image_url?: string | null
	main_image?: string | null
	images?: string[] | null
}

export interface SpaceStatusPayload {
	status: OperationalStatus
	status_reason?: string
}
