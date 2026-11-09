import type { Compensation, PayComponent } from "@/add-os/modules/hr/types/payroll"
import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enPayroll from "@/add-os/lang/en/hr-payroll.json"
import enTimesheets from "@/add-os/lang/en/hr-timesheets.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import CompensationModal from "../CompensationModal.vue"

const mocks = vi.hoisted(() => ({ change: vi.fn(), success: vi.fn(), error: vi.fn() }))

vi.mock("@/add-os/services/hr/payroll", () => ({
	changeCompensation: mocks.change,
	listCurrencyOptions: vi.fn().mockResolvedValue([{ code: "USD", name: "Dollar", symbol: "$" }])
}))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: mocks.success, error: mocks.error }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr, ...enTimesheets, ...enPayroll } } })

function component(overrides: Partial<PayComponent> = {}): PayComponent {
	return {
		id: 1,
		code: "basic",
		name: { ar: "الأساسي", en: "Basic" },
		kind: "earning",
		calculator: "fixed",
		config: null,
		applies_to_all: false,
		taxable: true,
		insurable: true,
		sort: 10,
		is_active: true,
		...overrides
	}
}

/** Mounts a dialog closed, then opens it, as a page does — its `watch(show)` fills the form. */
async function open(target: typeof CompensationModal, props: Record<string, unknown>) {
	const wrapper = mount(target as never, { props: { show: false, ...props }, global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body } as never) as ReturnType<typeof mount>
	await wrapper.setProps({ show: true })
	await flushPromises()
	return wrapper
}

describe("payroll forms", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	describe("pay change", () => {
		interface Vm {
			lines: { pay_component_id: number | null; amount: number | null; currency: string | null }[]
			effectiveFrom: string
			reason: string
			ready: boolean
			addLine: () => void
			save: () => Promise<void>
		}

		const current: Compensation[] = [
			{ id: 1, component: { id: 1, code: "basic", name: { ar: "الأساسي", en: "Basic" }, kind: "earning" }, amount: "1500.00", currency: "USD", effective_from: "2026-01-01", effective_to: null, event_id: 3 }
		]

		it("opens on the pay in force and starts after the latest change", async () => {
			const wrapper = await open(CompensationModal, { employeeId: 7, components: [component(), component({ id: 2, code: "housing" })], current, latestFrom: "2099-03-01" })
			const vm = wrapper.vm as unknown as Vm

			expect(vm.lines.map(l => [l.pay_component_id, l.amount, l.currency])).toEqual([[1, 1500, "USD"]])
			expect(vm.effectiveFrom).toBe("2099-03-02")
			vm.addLine()
			expect(vm.lines[1].currency).toBe("USD")
			expect(vm.ready).toBe(false)
			wrapper.unmount()
		})

		it("sends the whole pay with its reason, and shows the server's refusal", async () => {
			mocks.change.mockResolvedValueOnce({ message: "The pay has been updated." }).mockRejectedValueOnce(new ApiError(422, JSON.stringify({ message: "A pay change already starts on or after that date." })))
			const wrapper = await open(CompensationModal, { employeeId: 7, components: [component()], current, latestFrom: null })
			const vm = wrapper.vm as unknown as Vm
			vm.effectiveFrom = "2026-11-01"
			vm.lines[0].amount = 1650
			vm.reason = " annual raise "

			await vm.save()
			expect(mocks.change).toHaveBeenCalledWith(7, "2026-11-01", [{ pay_component_id: 1, amount: 1650, currency: "USD" }], "annual raise")
			expect(mocks.success).toHaveBeenCalledWith("The pay has been updated.")

			await vm.save()
			expect(mocks.error).toHaveBeenCalledWith("A pay change already starts on or after that date.")
			wrapper.unmount()
		})
	})
})
