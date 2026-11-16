import type { CashReturnRow, KitchenOrder } from "@/add-os/modules/kitchen/types/kitchen"
import { flushPromises, mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import { ApiError } from "@/add-os/services/api"
import KitchenCashReturns from "../KitchenCashReturns.vue"

const { listMock, returnedMock, creditMock, successMock, errorMock } = vi.hoisted(() => ({
	listMock: vi.fn(),
	returnedMock: vi.fn(),
	creditMock: vi.fn(),
	successMock: vi.fn(),
	errorMock: vi.fn()
}))

vi.mock("@/add-os/services/kitchen", () => ({
	listCashReturns: listMock,
	markCashReturned: returnedMock,
	creditCashAsPoints: creditMock
}))

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: successMock, error: errorMock, warning: vi.fn() }) }
})

function rowOf(id: number, overrides: Partial<CashReturnRow> = {}, order: Partial<KitchenOrder> = {}): CashReturnRow {
	return {
		order: {
			id,
			status: "rejected",
			source: "qr",
			delivery: { type: "desk", label: "D-12", note: null },
			bill: null,
			route: "reception",
			payment: { choice: "cash", wallet_owner_type: null, paid: true },
			cash_due_points: null,
			cash_return: "owed",
			lines: [],
			total_points: 1250,
			rejection_reason: "Out of milk",
			cancelled_by: null,
			timestamps: { submitted_at: null, accepted_at: null, ready_at: null, delivered_at: null },
			paid: true,
			member: { id: 9, name: "Sara Haddad", phone: "0912345678" },
			waited_seconds: 0,
			...order
		},
		points: 1250,
		received_amount: "5",
		received_currency: "USD",
		...overrides
	}
}

function page(data: CashReturnRow[]) {
	return { data, meta: { current_page: 1, last_page: 1, per_page: data.length, total: data.length } }
}

function mountIt(locale: "ar" | "en" = "en") {
	const i18n = createI18n({ legacy: false, locale, messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	return mount(KitchenCashReturns, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
}

/** Opens the row's popconfirm, then presses its positive button. */
async function confirmAction(wrapper: ReturnType<typeof mountIt>, id: number, action: "returned" | "credit"): Promise<void> {
	await wrapper.find(`[data-return='${id}'] [data-action='${action}']`).trigger("click")
	await flushPromises()
	const buttons = document.body.querySelectorAll<HTMLElement>(".n-popconfirm__action button")
	buttons[buttons.length - 1].click()
	await flushPromises()
}

beforeEach(() => {
	vi.clearAllMocks()
	document.body.innerHTML = ""
	setActivePinia(createPinia())
})

describe("kitchenCashReturns", () => {
	it("lists_cash_owed", async () => {
		listMock.mockResolvedValue(page([
			rowOf(1),
			rowOf(2, { received_amount: null, received_currency: null }, { status: "cancelled", rejection_reason: null, cancelled_by: "system" })
		]))
		const wrapper = mountIt()
		await flushPromises()

		const first = wrapper.find("[data-return='1']").text()
		expect(first).toContain("Sara Haddad")
		expect(first).toContain("#1")
		expect(first).toContain("$")
		expect(first).toContain("5")
		expect(first).toContain("Out of milk")
		const second = wrapper.find("[data-return='2']")
		expect(second.find("[data-test='received']").exists()).toBe(false)
		expect(second.text()).toContain("1,250")
		expect(second.find("[data-test='why']").text()).toBe(en.kitchen.cashReturns.why.expired)
		wrapper.unmount()
	})

	it("returned_removes_the_row", async () => {
		listMock.mockResolvedValueOnce(page([rowOf(1)])).mockResolvedValue(page([]))
		returnedMock.mockResolvedValue(rowOf(1))
		const wrapper = mountIt()
		await flushPromises()

		await confirmAction(wrapper, 1, "returned")

		expect(returnedMock).toHaveBeenCalledWith(1)
		expect(creditMock).not.toHaveBeenCalled()
		expect(successMock).toHaveBeenCalled()
		expect(listMock).toHaveBeenCalledTimes(2)
		expect(wrapper.find("[data-return='1']").exists()).toBe(false)
		wrapper.unmount()
	})

	it("credit_as_points_removes_the_row", async () => {
		listMock.mockResolvedValueOnce(page([rowOf(1)])).mockResolvedValue(page([]))
		creditMock.mockResolvedValue(rowOf(1))
		const wrapper = mountIt()
		await flushPromises()

		await confirmAction(wrapper, 1, "credit")

		expect(creditMock).toHaveBeenCalledWith(1)
		expect(returnedMock).not.toHaveBeenCalled()
		expect(listMock).toHaveBeenCalledTimes(2)
		expect(wrapper.find("[data-return='1']").exists()).toBe(false)
		wrapper.unmount()
	})

	it("hidden_when_nothing_owed", async () => {
		listMock.mockResolvedValue(page([]))
		const wrapper = mountIt()
		await flushPromises()

		expect(wrapper.find("[data-test='cash-returns']").exists()).toBe(false)
		expect(wrapper.html()).not.toContain(en.kitchen.cashReturns.title)
		wrapper.unmount()
	})

	it("shows_409_and_reloads", async () => {
		listMock.mockResolvedValueOnce(page([rowOf(1)])).mockResolvedValue(page([]))
		returnedMock.mockRejectedValue(new ApiError(409, JSON.stringify({ message: "Already handled." })))
		const wrapper = mountIt()
		await flushPromises()

		await confirmAction(wrapper, 1, "returned")

		expect(errorMock).toHaveBeenCalledWith("Already handled.")
		expect(listMock).toHaveBeenCalledTimes(2)
		expect(wrapper.find("[data-return='1']").exists()).toBe(false)
		wrapper.unmount()
	})
})
