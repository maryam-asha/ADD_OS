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
// The drawer calls useMessage() directly; NDrawer renders in place so its body is reachable.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue")
	const InPlace = defineComponent((_props, { slots }) => () => h("div", [slots.default?.(), slots.footer?.()]))
	return { ...actual, NDrawer: InPlace, NDrawerContent: InPlace, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

function mountDrawer() {
	return mount(CouponFormDrawer, { props: { "show": true, "couponId": null, "onUpdate:show": () => {} }, global: { plugins: [i18n] } })
}

type DrawerVm = { form: { code: string, targets: unknown[] }, submit: () => Promise<void> }

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
})
