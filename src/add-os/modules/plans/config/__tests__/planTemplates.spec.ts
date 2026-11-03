import { describe, expect, it } from "vitest"
import ar from "@/add-os/lang/ar/ar.json"
import { applyTemplate, emptyPlanPayload, planTemplateKeys } from "@/add-os/modules/plans/config/plans.config"

/** Every string under a JSON tree, for wording checks. */
function strings(node: unknown): string[] {
	if (typeof node === "string")
		return [node]
	if (node && typeof node === "object")
		return Object.values(node).flatMap(strings)
	return []
}

/**
 * A new plan starts from one of four templates; nine plans in ten are a
 * shared-workspace seat, so that is where the form begins (ADDCore, 2026-11-03).
 */
describe("plan templates", () => {
	it("applyTemplate keeps name, price and benefits and resets workspace fields", () => {
		const payload = {
			...emptyPlanPayload(),
			name: { ar: "باقة", en: "Plan" },
			price_points: 1500,
			coworking_seat: "dedicated" as const,
			discounts: [{ percentage: 30, space_type: "event_hall", usage_limit: 6, is_active: true }]
		}

		const result = applyTemplate(payload, "setHours")

		expect(result).toMatchObject({ coworking_seat: "flexible", coworking_hours: 20, allowance_cycle: "monthly", is_subscription: true, duration_days: 30 })
		expect(result.name).toEqual({ ar: "باقة", en: "Plan" })
		expect(result.price_points).toBe(1500)
		expect(result.discounts).toHaveLength(1)
	})

	it("offers the four agreed templates, monthly unlimited first", () => {
		expect(planTemplateKeys).toEqual(["monthlyUnlimited", "setHours", "dedicatedDesk", "noSeat"])
		expect(applyTemplate(emptyPlanPayload(), "monthlyUnlimited")).toMatchObject({ coworking_seat: "flexible", coworking_hours: null, allowance_cycle: "period", is_subscription: true })
		expect(applyTemplate(emptyPlanPayload(), "dedicatedDesk")).toMatchObject({ coworking_seat: "dedicated", coworking_hours: null })
		expect(applyTemplate(emptyPlanPayload(), "noSeat")).toMatchObject({ coworking_seat: "none", access_window_start: null, access_window_end: null })
	})

	it("no Arabic string says الكوركينغ", () => {
		expect(strings(ar).filter(s => s.includes("الكوركينغ"))).toEqual([])
	})
})
