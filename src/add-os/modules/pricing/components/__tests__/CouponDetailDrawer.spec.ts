import { flushPromises, mount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import CouponDetailDrawer from "../CouponDetailDrawer.vue"

function use(id: number, counts: boolean) {
	return { id, user: { id, name: `Member ${id}`, phone: "0990" }, purpose: "booking", booking_id: 10 + id, walkin_session_id: null, event_attendee_id: null, payment_id: null, discount_type: "percentage", discount_value: 20, max_discount_points: 50, kind: "coupon", base_points: 120, points: 24, percent: 20, counts, created_at: "2026-10-05T07:00:00Z" }
}

function revision(id: number, action: string, value: number, active: boolean) {
	return { id, action, recorded_at: `2026-10-0${id === 8 ? 4 : 1}T09:00:00+00:00`, changed_by: 1, code: "VIP", name: null, discount_type: "percentage", discount_value: value, max_discount_points: null, min_amount_points: null, combinable_with_offers: true, usage_limit: 10, per_user_limit: 1, new_members_only: false, company_id: null, targets: [], user_ids: [], starts_at: null, ends_at: "2026-10-31T21:00:00+00:00", is_active: active }
}

vi.mock("@/add-os/services/coupons", () => ({
	getCoupon: vi.fn().mockResolvedValue({ id: 7, code: "VIP", is_automatic: false, name: null, description: null, source: null, discount_type: "percentage", discount_value: 20, max_discount_points: 50, min_amount_points: null, combinable_with_offers: true, usage_limit: 10, per_user_limit: 1, new_members_only: false, company_id: null, starts_at: null, ends_at: null, is_active: true, used: 1, targets: [], user_ids: [], created_by: 1, created_at: "2026-10-05T05:00:00Z" }),
	listCouponRedemptions: vi.fn().mockResolvedValue({ data: [use(1, true), use(2, false)], meta: { current_page: 1, last_page: 1, per_page: 10, total: 2 } }),
	listCouponRevisions: vi.fn().mockResolvedValue({ data: [revision(8, "updated", 30, false), revision(5, "created", 20, true)], meta: { current_page: 1, last_page: 1, per_page: 10, total: 2 } })
}))
vi.mock("@/add-os/modules/pricing/composables/usePricingPickers", () => ({
	usePricingPickers: () => ({ load: vi.fn().mockResolvedValue(undefined), optionsFor: () => [], nameOf: (_key: string, id: number) => `#${id}` })
}))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue")
	const InPlace = defineComponent((_props, { slots }) => () => h("div", slots.default?.()))
	return { ...actual, NDrawer: InPlace, NDrawerContent: InPlace }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

describe("couponDetailDrawer", () => {
	it("shows a given-back use as Refunded, not Used", async () => {
		const wrapper = mount(CouponDetailDrawer, { props: { "show": true, "couponId": 7, "onUpdate:show": () => {} }, global: { plugins: [i18n] } })
		await flushPromises()
		const states = wrapper.findAll("[data-test='redemption-state']").map(node => node.text())
		expect(states).toEqual(["Used", "Refunded"])
	})

	it("shows usage against the limit", async () => {
		const wrapper = mount(CouponDetailDrawer, { props: { "show": true, "couponId": 7, "onUpdate:show": () => {} }, global: { plugins: [i18n] } })
		await flushPromises()
		expect(wrapper.text()).toContain("1 / 10")
		expect(wrapper.text()).toContain("20%")
	})

	// GET admin/coupons/{coupon}/revisions — pinned collection 2026-10-07.
	it("shows every saved version, newest first, with the terms it had", async () => {
		const wrapper = mount(CouponDetailDrawer, { props: { "show": true, "couponId": 7, "onUpdate:show": () => {} }, global: { plugins: [i18n] } })
		await flushPromises()
		const history = wrapper.get("[data-test='coupon-history']")
		expect(history.text()).toContain(en.coupons.history.title)
		const rows = history.findAll("tbody tr").map(row => row.text())
		expect(rows).toHaveLength(2)
		expect(rows[0]).toContain(en.coupons.history.action.updated)
		expect(rows[0]).toContain("30%")
		expect(rows[0]).toContain(en.coupons.detail.no)
		expect(rows[1]).toContain(en.coupons.history.action.created)
		expect(rows[1]).toContain("20%")
	})
})
