import { flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { ApiError } from "@/add-os/services/api"
import WalletTopUpDialog from "../WalletTopUpDialog.vue"

const { createWalletTopUpMock, previewWalletTopUpMock } = vi.hoisted(() => ({
	createWalletTopUpMock: vi.fn(),
	previewWalletTopUpMock: vi.fn()
}))

vi.mock("@/add-os/services/wallet-top-ups", () => ({
	createWalletTopUp: createWalletTopUpMock,
	previewWalletTopUp: previewWalletTopUpMock
}))

// Same pitfall the neighbouring dialog spec documents: the component calls
// useMessage() directly, which needs a provider it has no reason to mount.
// Mock only useMessage; every other naive-ui export stays real.
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
				label: "Points",
				rate: "Point rate",
				previewLoading: "Calculating…",
				belowOnePoint: "This amount is too small to buy a single point. Enter a larger amount.",
				previewFailed: "Could not calculate the point value. Check the amount and try again.",
				credited: "Points credited",
				newBalance: "New balance"
			},
			members: {
				topUp: {
					title: "Top Up Member Wallet",
					recipientMember: "Individual Member",
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
			walletTopUps: {
				paymentMethod: { cash: "Cash" },
				validation: { amountFormat: "Enter a valid positive amount" }
			},
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

/**
 * NModal teleports its body to document.body, so the mounted wrapper does not
 * contain the form — every query below goes through the document instead.
 */
function amountInput(): HTMLInputElement {
	const input = document.querySelector<HTMLInputElement>("input")
	if (!input) throw new Error("amount input not rendered")
	return input
}

function dialogText(): string {
	return document.body.textContent ?? ""
}

/** Types an amount the way the watcher sees it. */
async function typeAmount(amount: string) {
	const input = amountInput()
	input.value = amount
	input.dispatchEvent(new Event("input"))
	await flushPromises()
}

beforeEach(() => {
	vi.useFakeTimers()
	createWalletTopUpMock.mockReset()
	previewWalletTopUpMock.mockReset()
	successMessages.length = 0
	errorMessages.length = 0
})

afterEach(() => {
	// The modal teleports into document.body, so an un-unmounted dialog would
	// leave its text visible to the next test's dialogText().
	mounted?.unmount()
	mounted = null
	document.body.innerHTML = ""
	vi.useRealTimers()
})

describe("walletTopUpDialog point preview", () => {
	it("asks the server for the point value rather than computing one", async () => {
		previewWalletTopUpMock.mockResolvedValue({
			points: 340,
			usd: "34.00",
			payment_amount: "500000",
			payment_currency: "SYP",
			point_rate_usd: "0.1000"
		})

		mountDialog()
		await typeAmount("500000")

		// Nothing is requested until the debounce window closes.
		expect(previewWalletTopUpMock).not.toHaveBeenCalled()

		await vi.advanceTimersByTimeAsync(300)
		await flushPromises()

		expect(previewWalletTopUpMock).toHaveBeenCalledTimes(1)
		expect(previewWalletTopUpMock.mock.calls[0][0]).toMatchObject({
			user_id: 5,
			amount: "500000"
		})
		expect(dialogText()).toContain("340 points")
	})

	it("debounces a burst of keystrokes into a single request", async () => {
		previewWalletTopUpMock.mockResolvedValue({
			points: 34,
			usd: "3.40",
			payment_amount: "50000",
			payment_currency: "SYP",
			point_rate_usd: "0.1000"
		})

		mountDialog()
		await typeAmount("5")
		await typeAmount("50")
		await typeAmount("500")
		await typeAmount("50000")

		await vi.advanceTimersByTimeAsync(300)
		await flushPromises()

		expect(previewWalletTopUpMock).toHaveBeenCalledTimes(1)
		expect(previewWalletTopUpMock.mock.calls[0][0]).toMatchObject({ amount: "50000" })
	})

	/**
	 * The regression this guards: a slow answer for the old amount landing
	 * after a fast answer for the new one, leaving the operator looking at a
	 * point count that belongs to digits they already replaced.
	 */
	it("never lets a stale response overwrite a newer preview", async () => {
		let resolveSlow: (v: unknown) => void = () => {}
		const slow = new Promise(resolve => {
			resolveSlow = resolve
		})

		previewWalletTopUpMock.mockImplementationOnce(() => slow).mockResolvedValueOnce({
			points: 3400,
			usd: "340.00",
			payment_amount: "5000000",
			payment_currency: "SYP",
			point_rate_usd: "0.1000"
		})

		mountDialog()

		// First amount: its request goes out, then stalls.
		await typeAmount("500")
		await vi.advanceTimersByTimeAsync(300)
		await flushPromises()

		// Second amount supersedes it and resolves first.
		await typeAmount("5000000")
		await vi.advanceTimersByTimeAsync(300)
		await flushPromises()

		expect(dialogText()).toContain("3,400 points")

		// Now the stale one finally answers with the old figure.
		resolveSlow({
			points: 34,
			usd: "3.40",
			payment_amount: "500",
			payment_currency: "SYP",
			point_rate_usd: "0.1000"
		})
		await flushPromises()

		expect(dialogText()).toContain("3,400 points")
		expect(dialogText()).not.toContain("34 points")
	})

	it("surfaces the below-one-point rejection instead of failing silently", async () => {
		previewWalletTopUpMock.mockRejectedValue(
			new ApiError(422, JSON.stringify({ message: "The amount is below one point." }))
		)

		mountDialog()
		await typeAmount("0.01")
		await vi.advanceTimersByTimeAsync(300)
		await flushPromises()

		expect(dialogText()).toContain("The amount is below one point.")
	})

	it("falls back to its own wording when a 422 carries no message", async () => {
		previewWalletTopUpMock.mockRejectedValue(new ApiError(422, ""))

		mountDialog()
		await typeAmount("0.01")
		await vi.advanceTimersByTimeAsync(300)
		await flushPromises()

		expect(dialogText()).toContain("too small to buy a single point")
	})

	it("does not quote an empty or non-positive amount", async () => {
		mountDialog()

		await typeAmount("")
		await vi.advanceTimersByTimeAsync(300)
		await flushPromises()

		await typeAmount("0")
		await vi.advanceTimersByTimeAsync(300)
		await flushPromises()

		expect(previewWalletTopUpMock).not.toHaveBeenCalled()
	})

	it("reports credited points and the new balance after a successful top-up", async () => {
		previewWalletTopUpMock.mockResolvedValue({
			points: 340,
			usd: "34.00",
			payment_amount: "500000",
			payment_currency: "SYP",
			point_rate_usd: "0.1000"
		})
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
		await typeAmount("500000")
		await vi.advanceTimersByTimeAsync(300)
		await flushPromises()

		// Submit is the last button in the teleported dialog body.
		const buttons = [...document.querySelectorAll<HTMLButtonElement>("button")]
		buttons.at(-1)!.click()
		await flushPromises()

		expect(createWalletTopUpMock).toHaveBeenCalledTimes(1)
		const reported = successMessages.join(" ")
		expect(reported).toContain("340 points")
		expect(reported).toContain("400 points")
	})
})
