import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import en from "@/add-os/lang/en/en.json"
import PaymentMethodsPage from "../PaymentMethodsPage.vue"
import PaymentTransactionsPage from "../PaymentTransactionsPage.vue"

const { listMock, summaryMock, methodsMock, reverseMock, pushMock, successMock, routeQuery } = vi.hoisted(() => ({
	listMock: vi.fn(),
	summaryMock: vi.fn(),
	methodsMock: vi.fn(),
	reverseMock: vi.fn(),
	pushMock: vi.fn(),
	successMock: vi.fn(),
	routeQuery: { value: {} as Record<string, string> }
}))

vi.mock("@/add-os/services/payments", () => ({
	listPayments: listMock,
	getPaymentsSummary: summaryMock,
	listPaymentMethods: methodsMock,
	reversePayment: reverseMock
}))
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: pushMock }), useRoute: () => ({ query: routeQuery.value }) }
})
// The pages call useMessage()/useDialog() directly; the dialog confirms at once.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return {
		...actual,
		useMessage: () => ({ success: successMock, error: vi.fn() }),
		useDialog: () => ({ warning: (options: { onPositiveClick: () => void }) => options.onPositiveClick() })
	}
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

const methods = [
	{ key: "wallet", label: "Wallet points", enabled: true, gateway: false, purposes: [{ purpose: "booking", supported: true }, { purpose: "wallet_top_up", supported: false }], usage: { count: 4, accepted_count: 3, accepted_points: 240, open_count: 1, last_used_at: "2026-10-04T10:00:00+03:00" } },
	{ key: "paymera", label: "Paymera card", enabled: false, gateway: true, purposes: [{ purpose: "booking", supported: true }], usage: { count: 0, accepted_count: 0, accepted_points: 0, open_count: 0, last_used_at: null } }
]

function payment(overrides: Record<string, unknown> = {}) {
	return {
		id: 41,
		status: "accepted",
		purpose: "coworking_session",
		method: "cash",
		method_label: "Cash at reception",
		user: { id: 8, name: "Reem Halabi", phone: "0990000108" },
		charged_amount: null,
		currency: null,
		points_to_credit: 0,
		amount_points: 60,
		transaction_id: null,
		payable: { type: "walkin_session", id: 15 },
		expires_at: null,
		plan_id: null,
		membership_id: null,
		rrn: null,
		created_at: "2026-10-04T08:00:00Z",
		gateway_payment_id: null,
		review_reason: null,
		reversed_at: null,
		refunded_at: null,
		collected_via: "reception",
		received_amount: "6000",
		received_currency: "SYP",
		received_by: 2,
		received_by_name: "Rami",
		received_at: "2026-10-04T08:00:00Z",
		...overrides
	}
}

function summary() {
	return {
		total: 5,
		by_status: { accepted: 3, pending: 1, needs_review: 1 },
		accepted: { count: 3, points: 340 },
		by_method: [],
		cash: [{ currency: "SYP", amount: "6000" }],
		card: [{ currency: "USD", amount: "10.00" }]
	}
}

describe("paymentTransactionsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		routeQuery.value = {}
		listMock.mockResolvedValue({ data: [payment()], meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 } })
		summaryMock.mockResolvedValue(summary())
		methodsMock.mockResolvedValue(methods)
	})

	function mountPage() {
		return mount(PaymentTransactionsPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
	}

	it("lists the payments with their member and money, and totals them", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(listMock).toHaveBeenCalledWith({ page: 1, per_page: 20 })
		expect(summaryMock).toHaveBeenCalledWith({})
		const text = wrapper.text()
		expect(text).toContain("Reem Halabi")
		expect(text).toContain("Cash at reception")
		expect(text).toContain("Coworking session")
		// Totals: 340 points accepted, and two awaiting (one needing review).
		expect(wrapper.get("[data-test=payments-summary]").text()).toContain("340")
		expect(text).toContain("1 need review")
		wrapper.unmount()
	})

	it("starts filtered when a link names a method, and sends the same filters to the totals", async () => {
		routeQuery.value = { method: "wallet" }
		const wrapper = mountPage()
		await flushPromises()

		expect(listMock).toHaveBeenCalledWith({ method: "wallet", page: 1, per_page: 20 })
		expect(summaryMock).toHaveBeenCalledWith({ method: "wallet" })
		wrapper.unmount()
	})

	it("searches once typing pauses", async () => {
		vi.useFakeTimers()
		const wrapper = mountPage()
		await flushPromises()
		listMock.mockClear()

		await wrapper.get("[data-test=payments-search] input").setValue("reem")
		vi.advanceTimersByTime(400)
		await flushPromises()

		expect(listMock).toHaveBeenCalledWith({ search: "reem", page: 1, per_page: 20 })
		vi.useRealTimers()
		wrapper.unmount()
	})

	it("opens a payment's details and reverses an accepted card payment", async () => {
		methodsMock.mockResolvedValue([...methods.slice(0, 1), { ...methods[1], key: "paymera" }])
		listMock.mockResolvedValue({
			data: [payment({ id: 52, method: "paymera", method_label: "Paymera card", received_amount: null, received_currency: null, charged_amount: 10, currency: "USD", rrn: "RRN-77" })],
			meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 }
		})
		reverseMock.mockResolvedValue("The payment has been reversed.")
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.get("tbody tr").trigger("click")
		await flushPromises()

		const detail = document.body.querySelector("[data-test=payment-detail]")
		expect(detail?.textContent).toContain("RRN-77")
		;(document.body.querySelector("[data-test=payment-reverse]") as HTMLElement).click()
		await flushPromises()

		expect(reverseMock).toHaveBeenCalledWith(52)
		expect(successMock).toHaveBeenCalledWith("The payment has been reversed.")
		wrapper.unmount()
	})

	it("offers no reversal for cash", async () => {
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.get("tbody tr").trigger("click")
		await flushPromises()

		expect(document.body.querySelector("[data-test=payment-detail]")?.textContent).toContain("Rami")
		expect(document.body.querySelector("[data-test=payment-reverse]")).toBeNull()
		wrapper.unmount()
	})
})

describe("paymentMethodsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		methodsMock.mockResolvedValue(methods)
	})

	it("shows each method's state, use and purposes, and links to its payments", async () => {
		const wrapper = mount(PaymentMethodsPage, { global: { plugins: [i18n], stubs: { Icon: true } } })
		await flushPromises()

		const cards = wrapper.findAll("[data-test=payment-method]")
		expect(cards).toHaveLength(2)
		expect(cards[0].text()).toContain("Wallet points")
		expect(cards[0].text()).toContain("Enabled")
		expect(cards[0].text()).toContain("240")
		expect(cards[1].text()).toContain("Disabled")
		expect(cards[1].text()).toContain("Card gateway")
		expect(cards[1].text()).toContain("Not used yet")

		await cards[0].findAll("button").find(button => button.text() === "View its payments")!.trigger("click")
		expect(pushMock).toHaveBeenCalledWith({ name: "payments.transactions", query: { method: "wallet" } })
	})
})

// `discounts` — pinned collection 2026-10-07.
describe("paymentTransactionsPage discounts", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		routeQuery.value = {}
		listMock.mockResolvedValue({ data: [payment({ purpose: "plan_purchase", payable: null, discounts: [{ kind: "offer", offer_id: 12, coupon_id: null, plan_discount_id: null, name: "Rooms week", code: null, discount_type: "percentage", discount_value: 20, max_discount_points: null, base_points: 100, points: 20, percent: 20 }] })], meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 } })
		summaryMock.mockResolvedValue(summary())
		methodsMock.mockResolvedValue(methods)
	})

	it("shows the offer a payment was priced with, in the list and in its details", async () => {
		const wrapper = mount(PaymentTransactionsPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
		await flushPromises()

		expect(wrapper.get("[data-test='applied-discount']").text()).toContain("Rooms week")

		await wrapper.get("tbody tr").trigger("click")
		await flushPromises()

		const detail = document.body.querySelector("[data-test=payment-discounts]")
		expect(detail?.textContent).toContain(en.payments.transactions.discounts)
		expect(detail?.textContent).toContain("Rooms week")
		expect(detail?.textContent).toContain("−20")
		wrapper.unmount()
	})
})
