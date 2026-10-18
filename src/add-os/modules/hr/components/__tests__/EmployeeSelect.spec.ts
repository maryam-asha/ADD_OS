import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enHr from "@/add-os/lang/en/hr.json"
import EmployeeSelect from "../EmployeeSelect.vue"

const { listMock, getMock, permissions } = vi.hoisted(() => ({ listMock: vi.fn(), getMock: vi.fn(), permissions: { view: true } }))

vi.mock("@/add-os/config/permissions", () => ({ canViewEmployees: () => permissions.view }))
vi.mock("@/add-os/services/hr/core", () => ({ listEmployees: listMock, getEmployee: getMock }))

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr } } })
const person = (id: number, status = "active") => ({ id, employee_number: `E-${id}`, name: { ar: "س", en: `Person ${id}` }, status })

function mountSelect(value: number | null, extra: Record<string, unknown> = {}) {
	return mount(EmployeeSelect, { props: { value, ...extra }, global: { plugins: [i18n] } })
}

interface SelectVm {
	search: (term: string) => Promise<void>
	options: { label: string; value: number }[]
}

describe("employeeSelect", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	beforeEach(() => {
		vi.clearAllMocks()
		permissions.view = true
		listMock.mockResolvedValue({ data: [person(1), person(2, "terminated")], meta: { current_page: 1, last_page: 1, per_page: 25, total: 2 } })
		getMock.mockResolvedValue(person(9))
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("searches, leaving out former employees and excluded ids", async () => {
		const wrapper = mountSelect(null, { exclude: [3] })
		const vm = wrapper.vm as unknown as SelectVm
		await vm.search("pe")

		expect(listMock).toHaveBeenCalledWith({ q: "pe" })
		expect(vm.options.map(o => o.value)).toEqual([1])
		wrapper.unmount()
	})

	it("keeps former employees for a filter over history", async () => {
		const wrapper = mountSelect(null, { includeFormer: true })
		const vm = wrapper.vm as unknown as SelectVm
		await vm.search("pe")

		expect(vm.options.map(o => o.value)).toEqual([1, 2])
		wrapper.unmount()
	})

	it("names a value that arrives without a label, such as one from the URL", async () => {
		const wrapper = mountSelect(9)
		await flushPromises()

		expect(getMock).toHaveBeenCalledWith(9)
		expect((wrapper.vm as unknown as SelectVm).options).toEqual([{ label: "Person 9 · E-9", value: 9 }])
		wrapper.unmount()
	})

	it("offers only the given choices without the permission to search", async () => {
		permissions.view = false
		const wrapper = mountSelect(4, { options: [{ label: "My manager", value: 4 }] })
		const vm = wrapper.vm as unknown as SelectVm
		await vm.search("pe")
		await flushPromises()

		expect(listMock).not.toHaveBeenCalled()
		expect(getMock).not.toHaveBeenCalled()
		expect(vm.options).toEqual([{ label: "My manager", value: 4 }])
		wrapper.unmount()
	})
})
