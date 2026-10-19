import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enTimesheets from "@/add-os/lang/en/hr-timesheets.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import CostAllocationModal from "../CostAllocationModal.vue"

const { replaceMock, successMock, errorMock } = vi.hoisted(() => ({ replaceMock: vi.fn(), successMock: vi.fn(), errorMock: vi.fn() }))

vi.mock("@/add-os/services/hr/timesheets", () => ({ replaceCostAllocations: replaceMock }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: successMock, error: errorMock }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr, ...enTimesheets } } })
const centers = [
	{ id: 1, code: "GRANT-A", name: { ar: "منحة", en: "Grant A" }, costable_type: null, costable_id: null, is_active: true },
	{ id: 2, code: "OPS", name: { ar: "العمليات", en: "Operations" }, costable_type: null, costable_id: null, is_active: true },
	{ id: 3, code: "OLD", name: { ar: "قديم", en: "Old" }, costable_type: null, costable_id: null, is_active: false }
]
const current = [
	{ id: 10, cost_center: { id: 1, code: "GRANT-A", name: { ar: "منحة", en: "Grant A" } }, percent: "60.00", effective_from: "2026-01-01", effective_to: null },
	{ id: 11, cost_center: { id: 2, code: "OPS", name: { ar: "العمليات", en: "Operations" } }, percent: "40.00", effective_from: "2026-01-01", effective_to: null }
]

interface ModalVm {
	lines: { cost_center_id: number | null; percent: number | null }[]
	effectiveFrom: string | null
	ready: boolean
	optionsFor: (own: number | null) => { value: number }[]
	save: () => Promise<void>
}

async function open(latestFrom: string | null = "2026-01-01") {
	const wrapper = mount(CostAllocationModal, {
		props: { show: false, employeeId: 7, centers, current, latestFrom },
		global: { plugins: [i18n], stubs: { Icon: true } },
		attachTo: document.body
	})
	await wrapper.setProps({ show: true })
	await flushPromises()
	return { wrapper, vm: wrapper.vm as unknown as ModalVm }
}

describe("costAllocationModal", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	beforeEach(() => {
		vi.clearAllMocks()
		replaceMock.mockResolvedValue({ message: "The cost split has been updated." })
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("opens on the split in force, ready to save as it adds up to 100", async () => {
		const { wrapper, vm } = await open()

		expect(vm.lines.map(l => [l.cost_center_id, l.percent])).toEqual([
			[1, 60],
			[2, 40]
		])
		expect(vm.ready).toBe(true)
		wrapper.unmount()
	})

	it("offers each active center once, never an inactive one", async () => {
		const { wrapper, vm } = await open()

		expect(vm.optionsFor(1).map(o => o.value)).toEqual([1])
		expect(vm.optionsFor(null).map(o => o.value)).toEqual([])
		wrapper.unmount()
	})

	it("holds a split that does not add up to 100", async () => {
		const { wrapper, vm } = await open()

		vm.lines[1].percent = 30
		await flushPromises()

		expect(vm.ready).toBe(false)
		wrapper.unmount()
	})

	it("sends the lines from the date and shows the server's message", async () => {
		const { wrapper, vm } = await open(null)
		vm.effectiveFrom = "2026-11-01"
		vm.lines[0].percent = 75
		vm.lines[1].percent = 25

		await vm.save()

		expect(replaceMock).toHaveBeenCalledWith(7, "2026-11-01", [
			{ cost_center_id: 1, percent: 75 },
			{ cost_center_id: 2, percent: 25 }
		])
		expect(successMock).toHaveBeenCalledWith("The cost split has been updated.")
		expect(wrapper.emitted("saved")).toHaveLength(1)
		wrapper.unmount()
	})

	it("starts after the latest split, and shows the server's refusal", async () => {
		replaceMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "A cost split already starts on or after that date." })))
		const { wrapper, vm } = await open("2099-01-01")

		expect(vm.effectiveFrom).toBe("2099-01-02")
		await vm.save()

		expect(errorMock).toHaveBeenCalledWith("A cost split already starts on or after that date.")
		expect(wrapper.emitted("saved")).toBeUndefined()
		wrapper.unmount()
	})
})
