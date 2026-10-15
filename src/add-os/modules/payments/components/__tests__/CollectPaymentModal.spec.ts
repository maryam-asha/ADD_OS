import type { OutstandingPurpose } from "@/add-os/modules/booking/types/reception"
import { flushPromises, mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import { useCurrencyStore } from "@/stores/currency"
import CollectPaymentModal from "../CollectPaymentModal.vue"

const { getOutstandingMock, settleAtReceptionMock, successMock } = vi.hoisted(() => ({
	getOutstandingMock: vi.fn(),
	settleAtReceptionMock: vi.fn(),
	successMock: vi.fn()
}))

vi.mock("@/add-os/services/reception", () => ({
	getOutstanding: getOutstandingMock,
	settleAtReception: settleAtReceptionMock
}))

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: successMock, error: vi.fn() }) }
})

const i18n = createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: {} } })

/** What a booking of 200 points costs in each currency, as the server prices it. */
const PRICES: Record<string, string> = { USD: "20", SYP: "294000" }

function outstanding(currency: string) {
	return {
		items: [
			{ purpose: "booking", payable_id: 5, title: "Room A", starts_at: null, amount_points: 200, amount: { value: PRICES[currency], currency } },
			{ purpose: "coworking_session", payable_id: 9, title: "Open Space", starts_at: null, amount_points: 50, amount: { value: "5", currency } }
		],
		total_points: 250,
		total_amount: { value: "25", currency }
	}
}

interface Vm {
	items: { purpose: string }[]
	currency: string
	amount: string
	shortage: { shortage: string, currency: string } | null
	submit: () => Promise<void>
}

async function mountOpen(focus: { purpose: OutstandingPurpose, id: number } | null = { purpose: "booking", id: 5 }) {
	const wrapper = mount(CollectPaymentModal, { props: { show: false, userId: 3, focus }, global: { plugins: [i18n] }, attachTo: document.body })
	await wrapper.setProps({ show: true })
	await flushPromises()
	return { wrapper, vm: wrapper.vm as unknown as Vm }
}

describe("collectPaymentModal", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		setActivePinia(createPinia())
		const store = useCurrencyStore()
		store.hasFetched = true
		store.currency = "USD"
		getOutstandingMock.mockImplementation((_userId: number, currency: string) => Promise.resolve(outstanding(currency)))
		settleAtReceptionMock.mockResolvedValue({ points_credited: 200, points_charged: 200, change_points: 0 })
	})

	it("offers only the focused item, starting the amount at what it owes", async () => {
		const { wrapper, vm } = await mountOpen()

		expect(getOutstandingMock).toHaveBeenCalledWith(3, "USD")
		expect(vm.items).toHaveLength(1)
		expect(vm.amount).toBe("20")
		wrapper.unmount()
	})

	it("sends the money as it was handed over: the amount and currency entered", async () => {
		const { wrapper, vm } = await mountOpen()

		vm.currency = "SYP"
		await flushPromises()
		// Re-priced in the chosen currency.
		expect(getOutstandingMock).toHaveBeenLastCalledWith(3, "SYP")
		expect(vm.amount).toBe("294000")

		vm.amount = "300000"
		await vm.submit()
		await flushPromises()

		expect(settleAtReceptionMock).toHaveBeenCalledWith({
			purpose: "booking",
			payable_id: 5,
			collected_via: "cash",
			amount: "300000",
			currency: "SYP"
		})
		expect(wrapper.emitted("settled")).toHaveLength(1)
		expect(wrapper.emitted("update:show")?.at(-1)).toEqual([false])
		wrapper.unmount()
	})

	it("shows the shortage when too little was handed over, and stays open", async () => {
		settleAtReceptionMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "Too little.", shortage: "4000", currency: "SYP" })))
		const { wrapper, vm } = await mountOpen()

		vm.amount = "290000"
		await vm.submit()
		await flushPromises()

		expect(vm.shortage).toEqual({ shortage: "4000", currency: "SYP" })
		expect(wrapper.emitted("settled")).toBeUndefined()
		expect(wrapper.emitted("update:show")).toBeUndefined()
		wrapper.unmount()
	})

	it("offers every owed item when nothing is focused", async () => {
		const { wrapper, vm } = await mountOpen(null)

		expect(vm.items.map(item => item.purpose)).toEqual(["booking", "coworking_session"])
		wrapper.unmount()
	})
})
