import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import { ApiError } from "@/add-os/services/api"
import CouponFormDrawer from "../CouponFormDrawer.vue"

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))
vi.mock("@/add-os/services/coupons", () => ({ createCoupon: createMock, updateCoupon: vi.fn(), getCoupon: vi.fn() }))
vi.mock("@/add-os/modules/pricing/composables/usePricingPickers", () => ({
	usePricingPickers: () => ({
		load: vi.fn().mockResolvedValue(undefined),
		users: { value: [] },
		companies: { value: [] },
		plans: { value: [] },
		spaces: { value: [] },
		events: { value: [] },
		spaceTypes: [],
		optionsFor: () => [],
		nameOf: (_key: string, id: number) => `#${id}`
	})
}))
// The form calls useMessage() directly; NModal renders in place so its body is reachable.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue")
	const InPlace = defineComponent({ name: "ModalInPlace", inheritAttrs: false, setup: (_props, { slots }) => () => h("div", [slots.default?.(), slots.footer?.()]) })
	return { ...actual, NModal: InPlace, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

function mountDrawer() {
	return mount(CouponFormDrawer, { props: { "show": true, "couponId": null, "onUpdate:show": () => {} }, global: { plugins: [i18n] } })
}

interface DrawerVm { form: { code: string, targets: unknown[] }, submit: () => Promise<void> }

describe("couponFormDrawer", () => {
	// A block body: a function returned from beforeEach runs as teardown,
	// and returning the mock itself would call it after every test.
	beforeEach(() => {
		createMock.mockReset()
	})

	it("shows a targets.N error under that rule, and an unknown key at the top", async () => {
		createMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "x", errors: { "targets.0": ["That item cannot be bought that way."], "mystery": ["Something else."] } })))
		const wrapper = mountDrawer()
		await flushPromises()
		const vm = wrapper.vm as unknown as DrawerVm
		vm.form.code = "X"
		vm.form.targets.push({ purpose: "booking", itemKey: null, itemValue: null })
		await vm.submit()
		await flushPromises()
		expect(wrapper.get("[data-test='coupon-target-error-0']").text()).toContain("That item cannot be bought that way.")
		expect(wrapper.get("[data-test='coupon-form-other-errors']").text()).toContain("Something else.")
	})

	it("submits per_user_limit 1 by default, with targets and user_ids always present", async () => {
		createMock.mockResolvedValue({ id: 1 })
		const wrapper = mountDrawer()
		await flushPromises()
		const vm = wrapper.vm as unknown as DrawerVm
		vm.form.code = "x"
		await vm.submit()
		expect(createMock.mock.calls[0][0]).toMatchObject({ code: "X", per_user_limit: 1, targets: [], user_ids: [] })
	})

	it("refuses to send an emptied per-member limit as unlimited", async () => {
		const wrapper = mountDrawer()
		await flushPromises()
		const vm = wrapper.vm as unknown as DrawerVm & { form: { per_user_limit: number | null } }
		vm.form.code = "X"
		vm.form.per_user_limit = null
		await vm.submit()
		await flushPromises()
		expect(createMock).not.toHaveBeenCalled()
		expect(wrapper.text()).toContain(en.coupons.form.limitRequired)
	})

	// bb70ca6 replaced preset="card" with the coupon form's own card layout, on purpose.
	it("opens as a dialog", async () => {
		const wrapper = mountDrawer()
		await flushPromises()
		const modal = wrapper.findComponent({ name: "ModalInPlace" })
		expect(modal.exists()).toBe(true)
	})

	it("fills the code with a random one on request, still editable by hand", async () => {
		const wrapper = mountDrawer()
		await flushPromises()
		const vm = wrapper.vm as unknown as DrawerVm
		await wrapper.get("[data-test='coupon-code-generate']").trigger("click")
		expect(vm.form.code).toMatch(/^[A-Z2-9]{8}$/)
		vm.form.code = "SUMMER"
		expect(vm.form.code).toBe("SUMMER")
	})

	it("opens an offer with no code field and no fixed-price choice, and sends no code", async () => {
		createMock.mockResolvedValue({ id: 2 })
		const wrapper = mount(CouponFormDrawer, { props: { "show": true, "couponId": null, "automatic": true, "onUpdate:show": () => {} }, global: { plugins: [i18n] } })
		await flushPromises()
		expect(wrapper.text()).not.toContain(en.coupons.form.code)
		// Points off or a percentage, as for a coupon: the fixed price is gone.
		expect(wrapper.find("[data-test='coupon-fixed-price']").exists()).toBe(false)
		expect(wrapper.text()).not.toContain(en.coupons.form.combinable)
		await (wrapper.vm as unknown as DrawerVm).submit()
		const payload = createMock.mock.calls[0][0]
		expect(payload).not.toHaveProperty("code")
		expect(payload.is_automatic).toBe(true)
		expect(payload.per_user_limit).toBeNull()
	})

	// An offer is usually just a window: its limits wait behind "Usage limits (optional)".
	it("keeps a new offer's limits folded away until asked for", async () => {
		const wrapper = mount(CouponFormDrawer, { props: { "show": true, "couponId": null, "automatic": true, "onUpdate:show": () => {} }, global: { plugins: [i18n] } })
		await flushPromises()
		expect(wrapper.text()).not.toContain(en.coupons.form.usageLimit)
		await wrapper.get("[data-test='coupon-limits-toggle']").trigger("click")
		expect(wrapper.text()).toContain(en.coupons.form.usageLimit)
		expect(wrapper.text()).toContain(en.coupons.form.perUserLimit)
	})

	it("opens an offer that has a limit with its limits shown", async () => {
		const { getCoupon } = await import("@/add-os/services/coupons")
		vi.mocked(getCoupon).mockResolvedValue({ id: 3, code: null, is_automatic: true, name: { ar: "عرض", en: "Offer" }, description: null, source: "admin", discount_type: "percentage", discount_value: 20, max_discount_points: null, min_amount_points: null, combinable_with_offers: true, usage_limit: 50, per_user_limit: null, new_members_only: false, company_id: null, starts_at: null, ends_at: null, is_active: true, targets: [], user_ids: [], created_by: 1, created_at: "2026-10-06T00:00:00Z" })
		const wrapper = mount(CouponFormDrawer, { props: { "show": true, "couponId": 3, "onUpdate:show": () => {} }, global: { plugins: [i18n] } })
		await flushPromises()
		expect(wrapper.text()).toContain(en.coupons.form.usageLimit)
		expect(wrapper.find("[data-test='coupon-limits-toggle']").exists()).toBe(false)
	})

	it("always shows a typed coupon's limits", async () => {
		const wrapper = mountDrawer()
		await flushPromises()
		expect(wrapper.text()).toContain(en.coupons.form.usageLimit)
		expect(wrapper.find("[data-test='coupon-limits-toggle']").exists()).toBe(false)
	})
})
