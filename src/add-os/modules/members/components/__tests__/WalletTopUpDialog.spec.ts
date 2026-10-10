import { flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { ApiError } from "@/add-os/services/api"
import WalletTopUpDialog from "../WalletTopUpDialog.vue"

const TOP_UP_CONFIG = {
	point_rate_usd: "0.10",
	min_points: 10,
	currencies: [
		{ code: "SYP", rate_to_base: "0.0068027211", cash_step: "1.00", decimal_places: 2 },
		{ code: "USD", rate_to_base: "1", cash_step: "1.00", decimal_places: 2 }
	]
}

const STALE = "Rates changed since this top-up was prepared. Review the new figures and submit again."
const RATES_UNAVAILABLE = "Couldn't load the rates for this wallet."

const { createWalletTopUpMock, getWalletBalanceMock } = vi.hoisted(() => ({
	createWalletTopUpMock: vi.fn(),
	getWalletBalanceMock: vi.fn()
}))

vi.mock("@/add-os/services/wallet-top-ups", () => ({
	createWalletTopUp: createWalletTopUpMock,
	getWalletBalance: getWalletBalanceMock
}))

// The component calls useMessage() directly, which needs a provider it has no
// reason to mount. Mock only useMessage; every other naive-ui export stays real.
const successMessages: string[] = []
const errorMessages: string[] = []
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return {
		...actual,
		useMessage: () => ({
			success: (m: string) => successMessages.push(m),
			error: (m: string) => errorMessages.push(m)
		})
	}
})

const sampleMember = { id: 5, name: "Sara", phone: "0999111222" }

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			points: {
				unit: "points",
				credited: "Points credited",
				newBalance: "New balance",
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
			},
			members: {
				topUp: {
					title: "Top Up Member Wallet",
					amount: "Amount",
					amountPlaceholder: "Enter amount...",
					paymentMethod: "Payment Method",
					description: "Notes",
					descriptionPlaceholder: "Optional note...",
					submit: "Confirm Top-up",
					success: "Wallet topped up successfully."
				}
			},
			users: { form: { cancel: "Cancel" } },
			walletTopUps: { paymentMethod: { cash: "Cash" } },
			resourceCrud: { mutations: { genericError: "Something went wrong." } }
		}
	}
})

let mounted: ReturnType<typeof mount> | null = null

function mountDialog() {
	mounted = mount(WalletTopUpDialog, {
		props: { member: sampleMember as never, show: true, "onUpdate:show": () => {} },
		global: { plugins: [i18n] },
		attachTo: document.body
	})
	return mounted
}

// NModal teleports its body to document.body, so every query goes through the document.
function dialogText(): string {
	return document.body.textContent ?? ""
}

async function type(value: string) {
	const input = document.querySelector<HTMLInputElement>("[data-testid=\"top-up-input\"]")
	if (!input) throw new Error("top-up input not rendered")
	input.value = value
	input.dispatchEvent(new Event("input"))
	await flushPromises()
}

async function chooseMode(mode: "points" | "amount") {
	const radio = document.querySelector<HTMLInputElement>(`input[type="radio"][value="${mode}"]`)
	if (!radio) throw new Error(`${mode} mode radio not rendered`)
	radio.click()
	await flushPromises()
}

function retryButton(): HTMLButtonElement {
	const button = document.querySelector<HTMLButtonElement>("[data-testid=\"rates-retry\"]")
	if (!button) throw new Error("retry button not rendered")
	return button
}

function submitButton(): HTMLButtonElement {
	const button = [...document.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent?.includes("Confirm Top-up"))
	if (!button) throw new Error("submit button not rendered")
	return button
}

beforeEach(() => {
	createWalletTopUpMock.mockReset()
	getWalletBalanceMock.mockReset()
	getWalletBalanceMock.mockResolvedValue({ balance_points: 200, top_up: TOP_UP_CONFIG })
	successMessages.length = 0
	errorMessages.length = 0
})

afterEach(() => {
	mounted?.unmount()
	mounted = null
	document.body.innerHTML = ""
})

describe("walletTopUpDialog", () => {
	it("shows the member's balance before and after the top-up", async () => {
		mountDialog()
		await flushPromises()
		expect(getWalletBalanceMock).toHaveBeenCalledWith({ user_id: 5 })

		await type("340")

		const text = dialogText()
		expect(text).toContain("200 points")
		expect(text).toContain("+ 340 points")
		expect(text).toContain("540 points")
	})

	it("turns typed points into the cash to collect without asking the server", async () => {
		mountDialog()
		await flushPromises()
		await type("340")

		expect(dialogText()).toContain("Collect 4,998 SYP → 340 points")
		expect(getWalletBalanceMock).toHaveBeenCalledTimes(1)
		expect(createWalletTopUpMock).not.toHaveBeenCalled()
	})

	it("turns a typed amount into points in amount mode", async () => {
		mountDialog()
		await flushPromises()
		await chooseMode("amount")
		await type("5000")

		expect(dialogText()).toContain("Buys 340 points")
		expect(dialogText()).toContain("2 SYP is not enough for another point")
	})

	it("will not submit fewer points than the minimum", async () => {
		mountDialog()
		await flushPromises()
		await type("9")

		expect(dialogText()).toContain("A top-up must be at least 10 points.")
		expect(submitButton().disabled).toBe(true)
		submitButton().click()
		await flushPromises()
		expect(createWalletTopUpMock).not.toHaveBeenCalled()
	})

	it("submits the quoted points with the cash that buys them", async () => {
		createWalletTopUpMock.mockResolvedValue({ points_credited: 340, new_balance_points: 540 })
		mountDialog()
		await flushPromises()
		await type("340")

		submitButton().click()
		await flushPromises()

		expect(createWalletTopUpMock).toHaveBeenCalledWith({
			user_id: 5,
			points: 340,
			amount: "4998",
			currency: "SYP",
			payment_method: "cash",
			description: null
		})
	})

	it("says the rates could not be loaded, and re-reads them when the operator retries", async () => {
		getWalletBalanceMock.mockRejectedValueOnce(new ApiError(500, JSON.stringify({ message: "boom" })))
		mountDialog()
		await flushPromises()

		expect(getWalletBalanceMock).toHaveBeenCalledTimes(1)
		expect(dialogText()).toContain(RATES_UNAVAILABLE)
		expect(submitButton().disabled).toBe(true)

		retryButton().click()
		await flushPromises()

		expect(getWalletBalanceMock).toHaveBeenCalledTimes(2)
		expect(dialogText()).not.toContain(RATES_UNAVAILABLE)
		await type("340")
		expect(dialogText()).toContain("Collect 4,998 SYP → 340 points")
		expect(submitButton().disabled).toBe(false)
	})

	it("on a stale quote, says why and re-reads the rates without resubmitting", async () => {
		createWalletTopUpMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "invalid", errors: { points: [STALE] } })))
		mountDialog()
		await flushPromises()
		await type("340")

		submitButton().click()
		await flushPromises()

		expect(errorMessages).toContain(STALE)
		expect(getWalletBalanceMock).toHaveBeenCalledTimes(2)
		expect(createWalletTopUpMock).toHaveBeenCalledTimes(1)
	})

	it("on any other 422, shows the server's reason and re-reads the rates without resubmitting", async () => {
		const NO_RATE = "The selected currency has no active exchange rate."
		createWalletTopUpMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "invalid", errors: { currency: [NO_RATE] } })))
		mountDialog()
		await flushPromises()
		await type("340")

		submitButton().click()
		await flushPromises()

		expect(errorMessages).toContain(NO_RATE)
		expect(getWalletBalanceMock).toHaveBeenCalledTimes(2)
		expect(createWalletTopUpMock).toHaveBeenCalledTimes(1)
	})

	it("reports credited points and the new balance after a successful top-up", async () => {
		createWalletTopUpMock.mockResolvedValue({
			id: 1,
			points_credited: 340,
			previous_balance_points: 60,
			new_balance_points: 400,
			point_rate_usd: "0.1000",
			amount: "34.00",
			source: "reception",
			payment_method: "cash",
			performed_by_user_id: 1
		})
		mountDialog()
		await flushPromises()
		await type("340")

		submitButton().click()
		await flushPromises()

		expect(createWalletTopUpMock).toHaveBeenCalledTimes(1)
		const reported = successMessages.join(" ")
		expect(reported).toContain("340 points")
		expect(reported).toContain("400 points")
	})
})
