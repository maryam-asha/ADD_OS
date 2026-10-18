import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enHr from "@/add-os/lang/en/hr.json"
import EmployeesPage from "../EmployeesPage.vue"

const { listEmployeesMock, replaceMock, route, permissions } = vi.hoisted(() => ({
	listEmployeesMock: vi.fn(),
	replaceMock: vi.fn(),
	route: { query: {} as Record<string, string> },
	permissions: { hire: true }
}))

vi.mock("@/add-os/config/permissions", () => ({ canHireEmployees: () => permissions.hire }))
vi.mock("@/add-os/services/hr/core", () => ({
	listEmployees: listEmployeesMock,
	listOrgUnits: vi.fn().mockResolvedValue([{ id: 4, name: { ar: "العمليات", en: "Operations" }, is_active: true, parent_id: null, code: null, head_employee_id: null }])
}))
vi.mock("@/add-os/modules/hr/components/HireEmployeeModal.vue", () => ({ default: { name: "HireEmployeeModal", render: () => null } }))
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: vi.fn(), replace: replaceMock }), useRoute: () => route }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr } } })
const page = (data: unknown[], lastPage = 1) => ({ data, meta: { current_page: 1, last_page: lastPage, per_page: 25, total: data.length } })

function mountPage() {
	return mount(EmployeesPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
}

describe("employeesPage", () => {
	// Bilingual HR values follow the app's own locale ref, not the test i18n.
	beforeAll(() => {
		setCurrentLocale("en")
	})
	beforeEach(() => {
		vi.clearAllMocks()
		permissions.hire = true
		route.query = {}
		listEmployeesMock.mockResolvedValue(
			page([{ id: 7, employee_number: "E-0007", name: { ar: "ريم", en: "Reem" }, status: "active", user_id: 3, hired_on: "2026-01-04", job_title: null, org_unit: null }])
		)
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("loads the first page and lists the employees", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(listEmployeesMock).toHaveBeenCalledTimes(1)
		expect(listEmployeesMock).toHaveBeenCalledWith({ page: 1, q: undefined, status: null, org_unit_id: null })
		expect(document.body.textContent).toContain("Reem")
		wrapper.unmount()
	})

	it("hides hiring from an account without hr.employees.create", async () => {
		permissions.hire = false
		const wrapper = mountPage()
		await flushPromises()

		expect(document.body.textContent).not.toContain("Hire employee")
		wrapper.unmount()
	})

	it("sends a chosen status and unit to the server, from page one", async () => {
		route.query = { page: "2" }
		const wrapper = mountPage()
		await flushPromises()
		listEmployeesMock.mockClear()

		const vm = wrapper.vm as unknown as { filters: { status: string | null; org_unit_id: number | null } }
		vm.filters.status = "probation"
		vm.filters.org_unit_id = 4
		await nextTick()
		await flushPromises()

		expect(listEmployeesMock).toHaveBeenCalledTimes(1)
		expect(listEmployeesMock).toHaveBeenCalledWith({ page: 1, q: undefined, status: "probation", org_unit_id: 4 })
		expect(replaceMock).toHaveBeenLastCalledWith({ query: { status: "probation", org_unit_id: "4" } })
		wrapper.unmount()
	})

	it("opens on the filters in the URL, so a shared link shows the same list", async () => {
		route.query = { q: "rim", status: "active", page: "2" }
		const wrapper = mountPage()
		await flushPromises()

		expect(listEmployeesMock).toHaveBeenCalledWith({ page: 2, q: "rim", status: "active", org_unit_id: null })
		wrapper.unmount()
	})
})
