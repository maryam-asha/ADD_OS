import type { AppliedDiscount } from "@/add-os/modules/pricing/types/applied-discount"
import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import AppliedDiscountList from "../AppliedDiscountList.vue"

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

function discount(overrides: Partial<AppliedDiscount> = {}): AppliedDiscount {
	return { kind: "offer", offer_id: 12, coupon_id: null, plan_discount_id: null, name: "Rooms week", code: null, discount_type: "percentage", discount_value: 20, max_discount_points: null, base_points: 100, points: 20, percent: 20, ...overrides }
}

function render(discounts: AppliedDiscount[] | undefined) {
	return mount(AppliedDiscountList, { props: { discounts }, global: { plugins: [i18n] } })
}

/** `discounts` on a booking, payment or registration — pinned collection 2026-10-07. */
describe("appliedDiscountList", () => {
	it("names the offer as it was locked, with what it took off", () => {
		const text = render([discount()]).text()
		expect(text).toContain(en.discountReport.kind.offer)
		expect(text).toContain("Rooms week")
		expect(text).toContain("−20")
		expect(text).toContain("20%")
	})

	it("shows a coupon by its code", () => {
		const text = render([discount({ kind: "coupon", offer_id: null, coupon_id: 7, name: "Welcome", code: "WELCOME10", points: 8, percent: 10 })]).text()
		expect(text).toContain(en.discountReport.kind.coupon)
		expect(text).toContain("WELCOME10")
		expect(text).toContain("−8")
	})

	it("lists every discount on the record, one line each", () => {
		const wrapper = render([discount(), discount({ kind: "coupon", offer_id: null, coupon_id: 7, code: "WELCOME10" })])
		expect(wrapper.findAll("[data-test='applied-discount']")).toHaveLength(2)
	})

	it("a package saving took nothing off: no minus", () => {
		const text = render([discount({ kind: "duration_saving", offer_id: null, name: "Monthly", points: 600, percent: 40 })]).text()
		expect(text).toContain(en.discountReport.kind.duration_saving)
		expect(text).toContain("600")
		expect(text).not.toContain("−600")
	})

	it("a dash when nothing was taken off, or the record predates discounts", () => {
		expect(render([]).text()).toBe("—")
		expect(render(undefined).text()).toBe("—")
	})
})
