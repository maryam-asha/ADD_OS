import type { ComposerTranslation } from "vue-i18n"
import { describe, expect, it } from "vitest"

import { buildSpaceFields, emptySpacePayload } from "../spaces.config"

const t = ((key: string) => key) as ComposerTranslation

/**
 * The two booking rules a space carries for itself
 * (ADDCore docs/decisions/booking-outcomes-and-extension.md): whether its
 * bookings can be extended, and how long before the start a member may still
 * cancel.
 */
describe("space booking rules on the space form", () => {
	const fields = buildSpaceFields(t, [], "en")
	const field = (key: string) => fields.find(candidate => candidate.key === key)

	it("offers a switch for whether bookings on the space can be extended", () => {
		expect(field("allows_extension")).toMatchObject({ type: "switch", labelKey: "spaces.form.allowsExtension" })
	})

	it("offers the cancellation window as whole, non-negative minutes, explained by a hint", () => {
		const window = field("cancellation_window_minutes")

		expect(window).toMatchObject({ type: "number", integer: true, min: 0, labelKey: "spaces.form.cancellationWindowMinutes" })
		expect(window?.required).toBeFalsy()
		expect(window?.hint?.(emptySpacePayload())).toBe("spaces.form.cancellationWindowHint")
	})

	/**
	 * A new space extends, as every space did before the switch existed, and
	 * leaves the window empty so the general setting applies.
	 */
	it("starts a new space extendable and on the general cancellation window", () => {
		expect(emptySpacePayload()).toMatchObject({ allows_extension: true, cancellation_window_minutes: null })
	})
})

describe("a sale on the hourly rate", () => {
	const fields = buildSpaceFields(t, [], "en")

	it("offers the three sale fields, disabled while there is no hourly rate", () => {
		const sale = fields.filter(f => ["sale_hourly_rate_points", "sale_starts_at", "sale_ends_at"].includes(f.key))
		expect(sale.map(f => f.type)).toEqual(["number", "datetime", "datetime"])
		for (const field of sale) {
			expect(field.disabledWhen?.({ ...emptySpacePayload(), hourly_rate_points: null })).toBe(true)
			expect(field.disabledWhen?.({ ...emptySpacePayload(), hourly_rate_points: 100 })).toBe(false)
		}
	})

	it("starts a new space with no sale", () => {
		expect(emptySpacePayload()).toMatchObject({ sale_hourly_rate_points: null, sale_starts_at: null, sale_ends_at: null })
	})
})
