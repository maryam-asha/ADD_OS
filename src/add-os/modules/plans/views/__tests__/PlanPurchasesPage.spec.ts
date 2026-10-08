import { flushPromises, mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import PlanPurchasesPage from "../PlanPurchasesPage.vue"

const { previewMock, executeMock } = vi.hoisted(() => ({
	previewMock: vi.fn(),
	executeMock: vi.fn()
}))

vi.mock("@/add-os/services/users", () => ({ listUsers: vi.fn().mockResolvedValue([{ id: 5, name: "Sara" }]) }))
vi.mock("@/add-os/services/companies", () => ({ listCompanies: vi.fn().mockResolvedValue([]) }))
vi.mock("@/add-os/services/plans", () => ({
	listPlans: vi.fn().mockResolvedValue([{ id: 1, name: { en: "Monthly", ar: "شهري" }, is_active: true, is_subscription: true }])
}))
vi.mock("@/add-os/services/currencies", () => ({ listCurrencies: vi.fn().mockResolvedValue([{ code: "USD" }]) }))
vi.mock("@/add-os/services/wallet-top-ups", () => ({ getWalletBalance: vi.fn().mockResolvedValue({ balance_points: 1500 }) }))
vi.mock("@/add-os/services/reception", () => ({ previewPlanPurchase: previewMock, executePlanPurchase: executeMock }))

// The page calls useMessage() directly; see WalletTopUpsPage.spec.ts.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const i18n = createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: {} } })

function preview(walletCovers: boolean) {
	return { list_points: 1200, points: 1200, payment_amount: 120, payment_currency: "USD", balance_points: walletCovers ? 1500 : 100, wallet_covers: walletCovers }
}

async function mountReady(walletCovers: boolean) {
	previewMock.mockResolvedValue(preview(walletCovers))
	const pinia = createPinia()
	setActivePinia(pinia)
	const wrapper = mount(PlanPurchasesPage, { global: { plugins: [i18n, pinia] }, attachTo: document.body })
	await flushPromises()

	const vm = wrapper.vm as unknown as { form: { user_id: number | null, plan_id: number | null, payment_method: string } }
	vm.form.user_id = 5
	vm.form.plan_id = 1
	await flushPromises()
	await vi.advanceTimersByTimeAsync(600)
	await flushPromises()

	return { wrapper, vm }
}

function walletRadio(wrapper: ReturnType<typeof mount>) {
	return wrapper.find("input[name=\"payment_method\"][value=\"wallet\"]")
}

describe("planPurchasesPage — paying from points", () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.useRealTimers()
		document.body.innerHTML = ""
	})

	it("offers points only when they cover the whole plan", async () => {
		const short = await mountReady(false)
		expect(walletRadio(short.wrapper).attributes("disabled")).toBeDefined()
		short.wrapper.unmount()

		const covered = await mountReady(true)
		expect(walletRadio(covered.wrapper).attributes("disabled")).toBeUndefined()
	})

	it("buys from points without sending a currency", async () => {
		executeMock.mockResolvedValue({ transaction_code: "PLN-1", plan_name: "Monthly", payment_method: "wallet", points_charged: 1200, payment_amount: null, payment_currency: null, previous_balance_points: 1500, new_balance_points: 300, recipient_name: "Sara", performed_by_name: "Op" })
		const { wrapper, vm } = await mountReady(true)

		vm.form.payment_method = "wallet"
		await flushPromises()
		await (wrapper.vm as unknown as { submit: () => Promise<void> }).submit()
		await flushPromises()

		expect(executeMock).toHaveBeenCalledWith({ plan_id: 1, payment_method: "wallet", user_id: 5 })
	})

	it("falls back to cash when the points stop covering the plan", async () => {
		const { vm } = await mountReady(true)
		vm.form.payment_method = "wallet"
		await flushPromises()

		previewMock.mockResolvedValue(preview(false))
		vm.form.plan_id = 2
		await flushPromises()
		await vi.advanceTimersByTimeAsync(600)
		await flushPromises()

		expect(vm.form.payment_method).toBe("cash")
	})
})

describe("planPurchasesPage — offers and coupons", () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.useRealTimers()
		document.body.innerHTML = ""
	})

	async function settle() {
		await flushPromises()
		await vi.advanceTimersByTimeAsync(600)
		await flushPromises()
	}

	it("names the running offer and what it saves", async () => {
		const { wrapper } = await mountReady(false)
		previewMock.mockResolvedValue({
			...preview(false),
			points: 1000,
			offer: { name: "Autumn sale", discount_type: "percentage", discount_value: 20, saved_points: 200, ends_at: null },
			coupon: null
		})
		const vm = wrapper.vm as unknown as { form: { plan_id: number | null } }
		vm.form.plan_id = 2
		await settle()

		const offer = wrapper.find("[data-test=\"plan-offer\"]")
		expect(offer.text()).toContain("Autumn sale")
		expect(offer.text()).toContain("20%")
		expect(offer.text()).toContain("200")
	})

	it("sends the code only once applied, and drops one the server refuses", async () => {
		const { wrapper } = await mountReady(false)
		const vm = wrapper.vm as unknown as { couponInput: string, appliedCoupon: string | null, couponError: string | null, applyCoupon: () => void }

		const { ApiError } = await import("@/add-os/services/api")
		previewMock.mockRejectedValueOnce(new ApiError(422, JSON.stringify({ message: "This code does not exist.", reason: "not_found" })))
		previewMock.mockResolvedValue(preview(false))

		vm.couponInput = "NOPE"
		vm.applyCoupon()
		await settle()
		await settle()

		expect(previewMock).toHaveBeenCalledWith(expect.objectContaining({ coupon_code: "NOPE" }))
		expect(vm.couponError).toBe("This code does not exist.")
		expect(vm.appliedCoupon).toBeNull()
		expect(previewMock).toHaveBeenLastCalledWith(expect.not.objectContaining({ coupon_code: expect.anything() }))
	})
})
