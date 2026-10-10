import { flushPromises, mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { ApiError } from "@/add-os/services/api"
import WalletTopUpsPage from "../WalletTopUpsPage.vue"

const { listUsersMock, listCompaniesMock, createWalletTopUpMock, getWalletBalanceMock, messageErrorMock } = vi.hoisted(() => ({
	listUsersMock: vi.fn(),
	listCompaniesMock: vi.fn(),
	createWalletTopUpMock: vi.fn(),
	getWalletBalanceMock: vi.fn(),
	messageErrorMock: vi.fn()
}))

vi.mock("@/add-os/services/users", () => ({ listUsers: listUsersMock }))
vi.mock("@/add-os/services/companies", () => ({ listCompanies: listCompaniesMock }))
vi.mock("@/add-os/services/wallet-top-ups", () => ({
	createWalletTopUp: createWalletTopUpMock,
	getWalletBalance: getWalletBalanceMock
}))

// Same pitfall AddCompanyMemberDialog.spec.ts documents: the page calls
// useMessage() directly, which needs a provider it has no reason to mount.
// Mock only useMessage; every other naive-ui export stays real via importActual.
// The error spy is shared so a spec can assert what the operator was toasted.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: messageErrorMock }) }
})

const sampleUser = {
	id: 5,
	name: "Sara",
	phone: "0999111222",
	email: "s@add.sy",
	preferred_language: "ar",
	preferred_currency: "SYP",
	status: "active",
	roles: []
}

const sampleCompany = {
	id: 45,
	private_office_request_id: 2,
	legal_name: "Halab Tech",
	contract_ref: "C-001",
	branch_id: 1,
	status: "active"
}

const TOP_UP_CONFIG = {
	point_rate_usd: "0.10",
	min_points: 10,
	currencies: [
		{ code: "SYP", rate_to_base: "0.0068027211", cash_step: "1.00", decimal_places: 2 },
		{ code: "USD", rate_to_base: "1", cash_step: "1.00", decimal_places: 2 }
	]
}

const BALANCE = {
	owner_type: "user",
	owner_id: 5,
	owner_name: "Sara",
	owner_phone: "0999111222",
	balance_points: 1000,
	balance_usd: "100.00",
	balance_display: "14700.00",
	general_balance: "100.00",
	currency: "SYP",
	top_up: TOP_UP_CONFIG
}

const STALE = "Rates changed since this top-up was prepared. Review the new figures and submit again."
const RATES_UNAVAILABLE = "Couldn't load the rates for this wallet."

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			nav: { pages: { walletTopUps: "Wallet top-ups" } },
			walletTopUps: {
				description: "Record a manual wallet top-up.",
				recipientType: { user: "Member wallet", company: "Company wallet" },
				paymentMethod: { cash: "Cash" },
				form: {
					recipientType: "Top up",
					user: "Member",
					company: "Company",
					amount: "Amount",
					paymentMethod: "Payment method",
					description: "Description"
				},
				validation: {
					amountFormat: "Enter an amount greater than 0.",
					userRequired: "Select a member.",
					companyRequired: "Select a company."
				},
				submit: { button: "Record top-up", success: "Wallet topped up." },
				loadError: "Couldn't load recipients."
			},
			resourceCrud: {
				mutations: { genericError: "Something went wrong.", permissionError: "No permission." }
			},
			points: {
				unit: "points",
				credited: "Points credited",
				entryMode: { points: "Points", amount: "Amount" },
				pointsPlaceholder: "Number of points",
				collect: "Collect {amount} → {points}",
				buys: "Buys {points}",
				remainder: "{amount} is not enough for another point",
				raisedByRounding: "Raised to {points} by cash rounding",
				retry: "Try again",
				errors: {
					invalidPoints: "Enter a whole number of points.",
					invalidAmount: "Enter an amount above zero, with at most two decimals.",
					belowMinimum: "A top-up must be at least {min}.",
					notCashStep: "The amount must be a multiple of {step}.",
					currencyUnavailable: "This currency has no exchange rate yet.",
					ratesUnavailable: RATES_UNAVAILABLE
				}
			}
		}
	}
})

function mountPage() {
	const pinia = createPinia()
	setActivePinia(pinia)
	return mount(WalletTopUpsPage, { global: { plugins: [i18n, pinia] }, attachTo: document.body })
}

describe("walletTopUpsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		setActivePinia(createPinia())
		listUsersMock.mockResolvedValue([sampleUser])
		listCompaniesMock.mockResolvedValue([sampleCompany])
		// Points are what the wallet actually holds; the cash keys stay because a
		// receipt still has to show what was paid.
		createWalletTopUpMock.mockResolvedValue({
			id: 789,
			amount: "50.00",
			points_credited: 500,
			previous_balance_points: 1000,
			new_balance_points: 1500,
			point_rate_usd: "0.1000",
			source: "top_up",
			payment_method: "cash",
			performed_by_user_id: 12
		})
		getWalletBalanceMock.mockResolvedValue(BALANCE)
	})

	it("posts the quoted points with the cash that buys them, then resets the form", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.form.user_id = 5
		await flushPromises()
		wrapper.vm.input = "500"
		wrapper.vm.form.description = "Front-desk cash top-up"
		await wrapper.vm.submit()
		await flushPromises()

		expect(createWalletTopUpMock).toHaveBeenCalledWith({
			points: 500,
			amount: "7350",
			currency: "SYP",
			payment_method: "cash",
			user_id: 5,
			description: "Front-desk cash top-up"
		})

		// A repeatable action screen: the next top-up must start blank.
		expect(wrapper.vm.input).toBe("")
		expect(wrapper.vm.form.user_id).toBeNull()
		expect(wrapper.vm.form.description).toBe("")
		wrapper.unmount()
	})

	it("posts a company top-up with company_id and no user_id", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.recipientType = "company"
		await flushPromises()
		wrapper.vm.form.company_id = 45
		await flushPromises()
		wrapper.vm.input = "500"
		await wrapper.vm.submit()
		await flushPromises()

		expect(createWalletTopUpMock).toHaveBeenCalledWith({
			points: 500,
			amount: "7350",
			currency: "SYP",
			payment_method: "cash",
			company_id: 45,
			description: null
		})
		expect(createWalletTopUpMock.mock.calls[0][0]).not.toHaveProperty("user_id")
		wrapper.unmount()
	})

	it("surfaces 422 field errors, re-reads the rates on a stale quote, and keeps the form filled", async () => {
		createWalletTopUpMock.mockRejectedValue(
			new ApiError(422, JSON.stringify({
				message: "The given data was invalid.",
				errors: { points: [STALE], payment_method: ["The selected payment method is invalid."] }
			}))
		)
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.form.user_id = 5
		await flushPromises()
		wrapper.vm.input = "500"
		await wrapper.vm.submit()
		await flushPromises()

		expect(wrapper.vm.fieldErrors.points).toEqual([STALE])
		expect(wrapper.vm.fieldErrors.payment_method).toEqual(["The selected payment method is invalid."])
		// The points error is rendered in its field, so it is not toasted as well.
		expect(messageErrorMock).not.toHaveBeenCalled()
		expect(getWalletBalanceMock).toHaveBeenCalledTimes(2)
		expect(createWalletTopUpMock).toHaveBeenCalledTimes(1)
		expect(wrapper.vm.input).toBe("500")
		expect(wrapper.vm.form.user_id).toBe(5)
		wrapper.unmount()
	})

	it("re-reads the rates after a 422 on any field, not just points, and never resubmits", async () => {
		createWalletTopUpMock.mockRejectedValue(
			new ApiError(422, JSON.stringify({
				message: "The given data was invalid.",
				errors: { currency: ["The selected currency has no active exchange rate."] }
			}))
		)
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.form.user_id = 5
		await flushPromises()
		wrapper.vm.input = "500"
		await wrapper.vm.submit()
		await flushPromises()

		expect(wrapper.vm.fieldErrors.currency).toEqual(["The selected currency has no active exchange rate."])
		// No input renders a currency error, so the operator is told by toast.
		expect(messageErrorMock).toHaveBeenCalledWith("The selected currency has no active exchange rate.")
		expect(getWalletBalanceMock).toHaveBeenCalledTimes(2)
		expect(createWalletTopUpMock).toHaveBeenCalledTimes(1)
		wrapper.unmount()
	})

	it("says the rates could not be loaded, and re-reads them when the operator retries", async () => {
		getWalletBalanceMock.mockRejectedValueOnce(new Error("network down"))
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.form.user_id = 5
		await flushPromises()

		expect(getWalletBalanceMock).toHaveBeenCalledTimes(1)
		expect(wrapper.text()).toContain(RATES_UNAVAILABLE)

		await wrapper.find("[data-testid=\"rates-retry\"]").trigger("click")
		await flushPromises()

		expect(getWalletBalanceMock).toHaveBeenCalledTimes(2)
		expect(wrapper.text()).not.toContain(RATES_UNAVAILABLE)
		wrapper.vm.input = "500"
		await flushPromises()
		expect(wrapper.text()).toContain("Collect 7,350 SYP → 500 points")
		wrapper.unmount()
	})

	it("clears the company selection when the recipient type switches to member, and vice versa", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.recipientType = "company"
		await flushPromises()
		wrapper.vm.form.company_id = 45
		await flushPromises()

		wrapper.vm.recipientType = "user"
		await flushPromises()
		expect(wrapper.vm.form.company_id).toBeNull()

		wrapper.vm.form.user_id = 5
		await flushPromises()
		wrapper.vm.recipientType = "company"
		await flushPromises()
		expect(wrapper.vm.form.user_id).toBeNull()
		wrapper.unmount()
	})

	it("never posts both user_id and company_id, even when a stale id survives in the model", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.form.user_id = 5
		wrapper.vm.form.company_id = 45
		await flushPromises()
		wrapper.vm.input = "100"
		await wrapper.vm.submit()
		await flushPromises()

		const payload = createWalletTopUpMock.mock.calls[0][0]
		expect(payload.user_id).toBe(5)
		expect(payload).not.toHaveProperty("company_id")
		wrapper.unmount()
	})

	it("does not post at all when no recipient is selected", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.input = "100"
		await wrapper.vm.submit()
		await flushPromises()

		expect(createWalletTopUpMock).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it("does not post fewer points than the minimum, or a malformed entry", async () => {
		const wrapper = mountPage()
		await flushPromises()
		wrapper.vm.form.user_id = 5
		await flushPromises()

		for (const entry of ["0", "9", "12.5", "abc", "-5"]) {
			wrapper.vm.input = entry
			await wrapper.vm.submit()
			await flushPromises()
		}

		expect(createWalletTopUpMock).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it("in amount mode, posts only multiples of the currency's cash step", async () => {
		getWalletBalanceMock.mockResolvedValue({
			...BALANCE,
			top_up: { ...TOP_UP_CONFIG, currencies: [{ code: "SYP", rate_to_base: "0.0068027211", cash_step: "10.00", decimal_places: 2 }] }
		})
		const wrapper = mountPage()
		await flushPromises()
		wrapper.vm.form.user_id = 5
		await flushPromises()

		wrapper.vm.mode = "amount"
		wrapper.vm.input = "4995"
		await wrapper.vm.submit()
		await flushPromises()
		expect(createWalletTopUpMock).not.toHaveBeenCalled()

		wrapper.vm.input = "5000"
		await wrapper.vm.submit()
		await flushPromises()
		expect(createWalletTopUpMock).toHaveBeenCalledWith(expect.objectContaining({ points: 340, amount: "5000", currency: "SYP" }))
		wrapper.unmount()
	})

	it("shows and posts the higher count when cash rounding raises it", async () => {
		const wrapper = mountPage()
		await flushPromises()
		wrapper.vm.form.user_id = 5
		await flushPromises()
		wrapper.vm.selectedCurrency = "USD"
		await flushPromises()

		wrapper.vm.input = "345"
		await flushPromises()
		expect(wrapper.text()).toContain("Raised to 350 points by cash rounding")

		await wrapper.vm.submit()
		await flushPromises()
		expect(createWalletTopUpMock).toHaveBeenCalledWith(expect.objectContaining({ points: 350, amount: "35", currency: "USD" }))
		wrapper.unmount()
	})

	it("posts a company top-up when an affiliated member selects company balance scope", async () => {
		listUsersMock.mockResolvedValue([{ ...sampleUser, companies: [{ id: 45, legal_name: "Halab Tech", status: "active" }] }])
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.form.user_id = 5
		await flushPromises()
		wrapper.vm.userBalanceScope = "company"
		await flushPromises()
		wrapper.vm.input = "500"
		await wrapper.vm.submit()
		await flushPromises()

		expect(createWalletTopUpMock).toHaveBeenCalledWith({
			points: 500,
			amount: "7350",
			currency: "SYP",
			payment_method: "cash",
			company_id: 45,
			description: "Top-up via member Sara"
		})
		wrapper.unmount()
	})

	it("posts a top-up with a custom selected currency (e.g. USD)", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.form.user_id = 5
		await flushPromises()
		wrapper.vm.selectedCurrency = "USD"
		await flushPromises()
		wrapper.vm.input = "1000"
		await wrapper.vm.submit()
		await flushPromises()

		expect(createWalletTopUpMock).toHaveBeenCalledWith({
			points: 1000,
			amount: "100",
			currency: "USD",
			payment_method: "cash",
			user_id: 5,
			description: null
		})
		wrapper.unmount()
	})

	it("blocks submit when selected company is inactive", async () => {
		listCompaniesMock.mockResolvedValue([{ ...sampleCompany, status: "inactive" }])
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.recipientType = "company"
		await flushPromises()
		wrapper.vm.form.company_id = 45
		await flushPromises()
		wrapper.vm.input = "500"
		await wrapper.vm.submit()
		expect(createWalletTopUpMock).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it("does not trigger validation errors when currency or language changes", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.find(".n-form-item-feedback__line").exists()).toBe(false)

		wrapper.vm.selectedCurrency = "USD"
		await flushPromises()
		expect(wrapper.find(".n-form-item-feedback__line").exists()).toBe(false)

		// @ts-ignore
		i18n.global.locale.value = "ar"
		await flushPromises()
		expect(wrapper.find(".n-form-item-feedback__line").exists()).toBe(false)

		wrapper.unmount()
	})

	it("adapts the back arrow to document direction", async () => {
		const { useThemeStore } = await import("@/stores/theme")
		const wrapper = mountPage()
		await flushPromises()

		useThemeStore().setRTL(true)
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: "Icon" }).props("name")).toBe("carbon:arrow-right")

		useThemeStore().setRTL(false)
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: "Icon" }).props("name")).toBe("carbon:arrow-left")

		wrapper.unmount()
	})

	it("opens the receipt modal with transaction details upon successful top-up", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.vm.receiptModalVisible).toBe(false)
		expect(wrapper.vm.lastReceipt).toBeNull()

		wrapper.vm.form.user_id = 5
		await flushPromises()
		wrapper.vm.input = "500"
		await wrapper.vm.submit()
		await flushPromises()

		expect(wrapper.vm.receiptModalVisible).toBe(true)
		expect(wrapper.vm.lastReceipt).toMatchObject({ id: 789, amount: "50.00", points_credited: 500 })

		wrapper.vm.closeReceiptModal()
		expect(wrapper.vm.receiptModalVisible).toBe(false)
		wrapper.unmount()
	})
})
