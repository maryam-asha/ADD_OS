import { describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import { applyTemplate, emptyPlanPayload } from "@/add-os/modules/plans/config/plans.config"
import { previewStats } from "@/add-os/modules/plans/utils/previewStats"

const { t } = createI18n({ legacy: false, locale: "en", messages: { en } }).global

/**
 * The form's preview follows the member app's card rules: a ring when there
 * is a total, a plain value when there is none — with sample usage.
 */
describe("previewStats", () => {
	it("an unlimited flexible plan previews a period ring and an hours value", () => {
		const cards = previewStats(applyTemplate(emptyPlanPayload(), "monthlyUnlimited"), t)

		expect(cards.map(c => c.key)).toEqual(["period", "workspace_hours"])
		expect(cards[0]).toMatchObject({ display: "ring", total: 30, used: 15 })
		expect(cards[1]).toMatchObject({ display: "value", total: null, used: 0 })
	})

	it("20 hours preview as a ring of 20", () => {
		const hours = previewStats(applyTemplate(emptyPlanPayload(), "setHours"), t).find(c => c.key === "workspace_hours")

		expect(hours).toMatchObject({ display: "ring", total: 20, used: 10, percent: 50 })
	})

	it("a 30% event-hall discount limited to 6 previews as a ring with percent_off 30", () => {
		const model = { ...emptyPlanPayload(), discounts: [{ percentage: 30, space_type: "event_hall", usage_limit: 6, is_active: true }] }
		const discount = previewStats(model, t).find(c => c.type === "discount")

		expect(discount).toMatchObject({ display: "ring", total: 6, used: 3, percent_off: 30 })
	})

	it("no seat previews no hours card", () => {
		expect(previewStats(applyTemplate(emptyPlanPayload(), "noSeat"), t).map(c => c.key)).toEqual(["period"])
	})
})
