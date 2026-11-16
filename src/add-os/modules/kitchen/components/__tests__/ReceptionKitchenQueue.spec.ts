import type { KitchenOrder } from "@/add-os/modules/kitchen/types/kitchen"
import { flushPromises, mount } from "@vue/test-utils"
import { NSelect } from "naive-ui"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import { ApiError } from "@/add-os/services/api"
import { useCurrencyStore } from "@/stores/currency"
import ReceptionKitchenQueue from "../ReceptionKitchenQueue.vue"

const { listMock, confirmMock, turnDownMock, successMock, errorMock, subscriptions } = vi.hoisted(() => ({
	listMock: vi.fn(),
	confirmMock: vi.fn(),
	turnDownMock: vi.fn(),
	successMock: vi.fn(),
	errorMock: vi.fn(),
	subscriptions: [] as Array<{ handler: (event: string, payload: Record<string, unknown>) => void, events: readonly string[] }>
}))

vi.mock("@/add-os/services/kitchen", () => ({
	listOrdersToConfirm: listMock,
	confirmKitchenOrder: confirmMock,
	turnDownKitchenOrder: turnDownMock
}))

const { chimeMock } = vi.hoisted(() => ({ chimeMock: vi.fn() }))
vi.mock("@/add-os/composables/useNewArrivalChime", async () => {
	const actual = await vi.importActual<typeof import("@/add-os/composables/useNewArrivalChime")>("@/add-os/composables/useNewArrivalChime")
	return { ...actual, useNewArrivalChime: (items: Parameters<typeof actual.useNewArrivalChime>[0]) => actual.useNewArrivalChime(items, chimeMock) }
})

vi.mock("@/add-os/services/realtime", () => ({
	RECEPTION_EVENTS: ["kitchen_order.awaiting_reception"],
	isRealtimeConnected: () => true,
	subscribeReception: (handler: (event: string, payload: Record<string, unknown>) => void, events: readonly string[]) => {
		subscriptions.push({ handler, events })
		return () => {}
	}
}))

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: successMock, error: errorMock, warning: vi.fn() }) }
})

function orderOf(overrides: Partial<KitchenOrder> = {}): KitchenOrder {
	return {
		id: 41,
		status: "awaiting_reception",
		source: "qr",
		delivery: { type: "desk", label: "D-12", note: null },
		bill: null,
		route: "reception",
		payment: { choice: "wallet", wallet_owner_type: "user", paid: true },
		cash_due_points: null,
		cash_due_amounts: null,
		cash_return: null,
		lines: [{ sale_item_id: 1, name: "Latte", quantity: 2, unit_price_points: 625, line_points: 1250 }],
		total_points: 1250,
		rejection_reason: null,
		cancelled_by: null,
		timestamps: { submitted_at: "2026-11-14T09:00:00+03:00", accepted_at: null, ready_at: null, delivered_at: null },
		paid: true,
		member: { id: 9, name: "Sara Haddad", phone: "0912345678" },
		waited_seconds: 600,
		...overrides
	}
}

function cashOrder(overrides: Partial<KitchenOrder> = {}): KitchenOrder {
	return orderOf({ id: 42, payment: { choice: "cash", wallet_owner_type: null, paid: false }, paid: false, cash_due_points: 1250, ...overrides })
}

function page(data: KitchenOrder[]) {
	return { data, meta: { current_page: 1, last_page: 1, per_page: data.length, total: data.length } }
}

function mountQueue(locale: "ar" | "en" = "en") {
	const i18n = createI18n({ legacy: false, locale, messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	return mount(ReceptionKitchenQueue, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
}

function inBody<T extends HTMLElement = HTMLElement>(selector: string): T | null {
	return document.body.querySelector<T>(selector)
}

beforeEach(() => {
	vi.clearAllMocks()
	document.body.innerHTML = ""
	subscriptions.length = 0
	setActivePinia(createPinia())
	const store = useCurrencyStore()
	store.hasFetched = true
	store.availableCurrencies = [
		{ code: "USD", name: "Dollar", symbol: "$" },
		{ code: "SYP", name: "Pound", symbol: "ل.س", is_base: true }
	]
})

describe("receptionKitchenQueue", () => {
	it("lists_orders_with_payment_state", async () => {
		listMock.mockResolvedValue(page([
			orderOf(),
			orderOf({ id: 43, payment: { choice: "wallet", wallet_owner_type: "company", paid: true } }),
			orderOf({ id: 44, payment: { choice: "card", wallet_owner_type: null, paid: true } }),
			cashOrder()
		]))
		const wrapper = mountQueue()
		await flushPromises()

		expect(wrapper.findAll("[data-order]")).toHaveLength(4)
		const text = wrapper.text()
		expect(text).toContain("Sara Haddad")
		expect(text).toContain("0912345678")
		expect(text).toContain("Latte × 2")
		expect(text).toContain("D-12")
		expect(wrapper.find("[data-order='41'] [data-test='payment']").text()).toBe(en.kitchen.reception.payment.wallet)
		expect(wrapper.find("[data-order='43'] [data-test='payment']").text()).toBe(en.kitchen.reception.payment.companyWallet)
		expect(wrapper.find("[data-order='44'] [data-test='payment']").text()).toBe(en.kitchen.reception.payment.card)
		expect(wrapper.find("[data-order='42'] [data-test='cash-tag']").text()).toContain("1,250")
		expect(wrapper.find("[data-order='41'] [data-test='cash-tag']").exists()).toBe(false)
		wrapper.unmount()
	})

	it("confirms_a_paid_order_directly", async () => {
		listMock.mockResolvedValue(page([orderOf()]))
		confirmMock.mockResolvedValue(orderOf({ status: "pending" }))
		const wrapper = mountQueue()
		await flushPromises()

		await wrapper.find("[data-order='41'] [data-action='confirm']").trigger("click")
		await flushPromises()

		expect(confirmMock).toHaveBeenCalledTimes(1)
		expect(confirmMock.mock.calls[0][0]).toBe(41)
		expect(inBody("[data-test='confirm-cash-submit']")).toBeNull()
		expect(successMock).toHaveBeenCalled()
		expect(listMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	it("opens_cash_dialog_for_cash_order", async () => {
		listMock.mockResolvedValue(page([cashOrder()]))
		confirmMock.mockResolvedValue(cashOrder({ status: "pending" }))
		const wrapper = mountQueue()
		await flushPromises()

		await wrapper.find("[data-order='42'] [data-action='confirm']").trigger("click")
		await flushPromises()

		expect(confirmMock).not.toHaveBeenCalled()
		expect(inBody("[data-test='cash-due']")?.textContent).toContain("1,250")
		// The base currency is the one chosen, and no amount is asked for.
		expect(inBody("[data-test='cash-currency']")?.textContent).toContain("SYP")
		expect(inBody("input[inputmode='decimal']")).toBeNull()

		inBody("[data-test='confirm-cash-submit']")!.click()
		await flushPromises()

		expect(confirmMock).toHaveBeenCalledWith(42, "SYP")
		expect(listMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	it("shows_the_cash_to_collect_in_money_and_blocks_a_currency_with_no_rate", async () => {
		listMock.mockResolvedValue(page([cashOrder({ cash_due_amounts: [{ currency: "SYP", value: "125000" }] })]))
		const wrapper = mountQueue()
		await flushPromises()

		const tag = wrapper.get("[data-order='42'] [data-test='cash-tag']").text()
		expect(tag).toContain("125,000")
		expect(tag).toContain("1,250")

		await wrapper.find("[data-order='42'] [data-action='confirm']").trigger("click")
		await flushPromises()
		expect(inBody("[data-test='cash-due-amount']")?.textContent).toContain("125,000")
		expect(inBody("[data-test='cash-due']")?.textContent).toContain("1,250")
		expect(inBody("[data-test='no-rate']")).toBeNull()

		// USD is offered by the store but has no rate on the server's side.
		wrapper.findComponent(NSelect).vm.$emit("update:value", "USD")
		await flushPromises()
		expect(inBody("[data-test='cash-due-amount']")).toBeNull()
		expect(inBody("[data-test='no-rate']")?.textContent).toContain("USD")
		expect(inBody<HTMLButtonElement>("[data-test='confirm-cash-submit']")?.disabled).toBe(true)
		wrapper.unmount()
	})

	it("keeps_dialog_open_on_currency_unavailable", async () => {
		listMock.mockResolvedValue(page([cashOrder()]))
		confirmMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "No rate for USD yet." })))
		const wrapper = mountQueue()
		await flushPromises()

		await wrapper.find("[data-order='42'] [data-action='confirm']").trigger("click")
		await flushPromises()
		inBody("[data-test='confirm-cash-submit']")!.click()
		await flushPromises()

		expect(inBody("[data-test='confirm-cash-submit']")).not.toBeNull()
		expect(inBody("[data-test='confirm-cash-error']")?.textContent).toContain("No rate for USD yet.")
		expect(wrapper.find("[data-order='42']").exists()).toBe(true)
		wrapper.unmount()
	})

	it("reloads_after_conflict", async () => {
		listMock.mockResolvedValueOnce(page([orderOf()])).mockResolvedValue(page([]))
		confirmMock.mockRejectedValue(new ApiError(409, JSON.stringify({ message: "Already handled." })))
		const wrapper = mountQueue()
		await flushPromises()

		await wrapper.find("[data-order='41'] [data-action='confirm']").trigger("click")
		await flushPromises()

		expect(errorMock).toHaveBeenCalledWith("Already handled.")
		expect(listMock).toHaveBeenCalledTimes(2)
		expect(wrapper.find("[data-order='41']").exists()).toBe(false)
		wrapper.unmount()
	})

	it("tells_the_desk_after_a_conflict_reload", async () => {
		listMock.mockResolvedValueOnce(page([orderOf()])).mockResolvedValue(page([]))
		confirmMock.mockRejectedValue(new ApiError(409, JSON.stringify({ message: "Already handled." })))
		const wrapper = mountQueue()
		await flushPromises()

		await wrapper.find("[data-order='41'] [data-action='confirm']").trigger("click")
		await flushPromises()

		expect(wrapper.emitted("changed")).toHaveLength(1)
		wrapper.unmount()
	})

	it("keeps_dialog_usable_when_currencies_fail_to_load", async () => {
		listMock.mockResolvedValue(page([cashOrder()]))
		confirmMock.mockResolvedValue(cashOrder({ status: "pending" }))
		vi.spyOn(useCurrencyStore(), "fetchCurrencies").mockRejectedValue(new Error("offline"))
		const wrapper = mountQueue()
		await flushPromises()

		await wrapper.find("[data-order='42'] [data-action='confirm']").trigger("click")
		await flushPromises()

		expect(inBody("[data-test='currencies-failed']")).not.toBeNull()
		inBody("[data-test='confirm-cash-submit']")!.click()
		await flushPromises()
		expect(confirmMock).toHaveBeenCalledWith(42, "SYP")
		wrapper.unmount()
	})

	it("steps_back_a_page_when_the_last_row_drops", async () => {
		const meta = (last: number) => ({ current_page: 1, last_page: last, per_page: 1, total: last })
		listMock.mockImplementation(async ({ page: n }: { page: number }) => (n === 2 ? { data: [], meta: meta(1) } : { data: [orderOf()], meta: meta(1) }))
		const wrapper = mountQueue()
		await flushPromises()
		;(wrapper.vm as unknown as { page: number }).page = 2
		await flushPromises()

		expect((wrapper.vm as unknown as { page: number }).page).toBe(1)
		expect(wrapper.find("[data-order='41']").exists()).toBe(true)
		wrapper.unmount()
	})

	it("turns an order down with its reason", async () => {
		listMock.mockResolvedValue(page([orderOf()]))
		turnDownMock.mockResolvedValue(orderOf({ status: "rejected" }))
		const wrapper = mountQueue()
		await flushPromises()

		await wrapper.find("[data-order='41'] [data-action='turn-down']").trigger("click")
		await flushPromises()
		const input = inBody("[data-test='reject-reason'] textarea") as HTMLTextAreaElement
		input.value = "Not in the building"
		input.dispatchEvent(new Event("input"))
		await flushPromises()
		inBody("[data-test='reject-submit']")!.click()
		await flushPromises()

		expect(turnDownMock).toHaveBeenCalledWith(41, "Not in the building")
		expect(listMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	it("drops_row_on_realtime_update", async () => {
		listMock.mockResolvedValueOnce(page([orderOf()])).mockResolvedValue(page([]))
		const wrapper = mountQueue()
		await flushPromises()
		expect(wrapper.find("[data-order='41']").exists()).toBe(true)

		subscriptions.at(-1)!.handler("kitchen_order.awaiting_reception", { order_id: 41 })
		await flushPromises()

		expect(wrapper.find("[data-order='41']").exists()).toBe(false)
		wrapper.unmount()
	})

	it("chimes_when_a_new_order_waits_for_the_desk", async () => {
		chimeMock.mockClear()
		listMock.mockResolvedValueOnce(page([orderOf()])).mockResolvedValueOnce(page([orderOf(), orderOf({ id: 42 })]))
		const wrapper = mountQueue()
		await flushPromises()
		expect(chimeMock).not.toHaveBeenCalled()

		subscriptions.at(-1)!.handler("kitchen_order.awaiting_reception", { order_id: 42 })
		await flushPromises()

		expect(chimeMock).toHaveBeenCalledTimes(1)
		wrapper.unmount()
	})

	it("stays_silent_when_an_order_leaves_the_desk", async () => {
		chimeMock.mockClear()
		listMock.mockResolvedValueOnce(page([orderOf()])).mockResolvedValueOnce(page([]))
		const wrapper = mountQueue()
		await flushPromises()

		subscriptions.at(-1)!.handler("kitchen_order.awaiting_reception", { order_id: 41 })
		await flushPromises()

		expect(chimeMock).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it("renders_without_member", async () => {
		listMock.mockResolvedValue(page([orderOf({ member: null })]))
		const wrapper = mountQueue()
		await flushPromises()

		expect(wrapper.find("[data-order='41']").text()).toContain(en.kitchen.card.unknownMember)
		wrapper.unmount()
	})
})
