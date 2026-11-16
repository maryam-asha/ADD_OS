import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enHr from "@/add-os/lang/en/hr.json"
import EmployeesPage from "../EmployeesPage.vue"

const { listEmployeesMock, downloadEmployeesMock, getEmployeeMock, listCompensationMock, pushMock, replaceMock, route, permissions } = vi.hoisted(() => ({
	listEmployeesMock: vi.fn(),
	downloadEmployeesMock: vi.fn(),
	getEmployeeMock: vi.fn(),
	listCompensationMock: vi.fn(),
	pushMock: vi.fn(),
	replaceMock: vi.fn(),
	route: { query: {} as Record<string, string> },
	permissions: { hire: true, update: true, payroll: true }
}))

vi.mock("@/add-os/config/permissions", () => ({
	canHireEmployees: () => permissions.hire,
	canUpdateEmployees: () => permissions.update,
	canViewPayroll: () => permissions.payroll
}))
vi.mock("@/add-os/services/hr/payroll", () => ({ listCompensation: listCompensationMock }))
vi.mock("@/add-os/services/hr/core", () => ({
	listEmployees: listEmployeesMock,
	downloadEmployees: downloadEmployeesMock,
	getEmployee: getEmployeeMock,
	listOrgUnits: vi.fn().mockResolvedValue([{ id: 4, name: { ar: "العمليات", en: "Operations" }, is_active: true, parent_id: null, code: null, head_employee_id: null }])
}))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: pushMock, replace: replaceMock }), useRoute: () => route }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr } } })

const reem = {
	id: 7,
	employee_number: "E-0007",
	name: { ar: "ريم", en: "Reem" },
	status: "active",
	user_id: 3,
	hired_on: "2026-01-04",
	job_title: { ar: "محاسبة", en: "Accountant" },
	org_unit: { id: 4, name: { ar: "العمليات", en: "Operations" } },
	work_email: "reem@add.test",
	employment_type: "full_time",
	manager: { id: 2, employee_number: "E-0002", name: { ar: "هالة", en: "Hala" } }
}
const omar = { ...reem, id: 9, employee_number: "E-0009", name: { ar: "عمر", en: "Omar" }, status: "probation", manager: null, work_email: null }
const page = (data: unknown[], lastPage = 1) => ({ data, meta: { current_page: 1, last_page: lastPage, per_page: 25, total: data.length } })

/** The file the employee view reads. */
const employee = {
	id: 7,
	employee_number: "E-0007",
	user_id: 3,
	name: { ar: "ريم", en: "Reem" },
	gender: "female",
	date_of_birth: "1995-04-02",
	nationality: "SY",
	marital_status: null,
	phone: "+963944000001",
	personal_email: null,
	work_email: "reem@add.test",
	address: null,
	has_national_id: false,
	has_bank_account: false,
	status: "active",
	hired_on: "2026-01-04",
	probation_ends_on: null,
	confirmed_on: "2026-04-04",
	terminated_on: null,
	termination_reason: null,
	current_assignment: null,
	current_contract: null,
	contacts: [],
	dependents: []
}
function pay(kind: string, amount: string) {
	return {
		id: 1,
		component: { id: 1, code: kind, name: { ar: kind, en: kind }, kind },
		amount,
		currency: "SYP",
		effective_from: "2020-01-01",
		effective_to: null,
		event_id: null
	}
}

interface PageVm {
	display: string
	page: number
	filters: { q: string; status: string | null; org_unit_id: number | null; sort: string | null }
}

function mountPage() {
	return mount(EmployeesPage, { global: { plugins: [i18n], stubs: { Icon: true, RouterLink: { template: "<a><slot /></a>" } } }, attachTo: document.body })
}

const cards = (wrapper: ReturnType<typeof mountPage>) => wrapper.findAll("[data-test='employee-card']")

describe("employeesPage", () => {
	// Bilingual HR values follow the app's own locale ref, not the test i18n.
	beforeAll(() => {
		setCurrentLocale("en")
	})
	beforeEach(() => {
		vi.clearAllMocks()
		permissions.hire = true
		permissions.update = true
		permissions.payroll = true
		route.query = {}
		localStorage.clear()
		listEmployeesMock.mockResolvedValue(page([reem]))
		downloadEmployeesMock.mockResolvedValue(undefined)
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("loads the first page, newest first, and lists the employees", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(listEmployeesMock).toHaveBeenCalledTimes(1)
		expect(listEmployeesMock).toHaveBeenCalledWith({ page: 1, q: undefined, status: null, org_unit_id: null, sort: "newest" })
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

	it("opens hiring on a page of its own, not a dialog over the list", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const hire = wrapper.findAll("button").find(b => b.text().includes("Hire employee"))
		await hire!.trigger("click")

		expect(pushMock).toHaveBeenCalledWith({ name: "hr.employeeCreate" })
		expect(document.querySelector(".n-modal")).toBeNull()
		wrapper.unmount()
	})

	it("sends a chosen status and unit to the server, from page one", async () => {
		const wrapper = mountPage()
		await flushPromises()
		const vm = wrapper.vm as unknown as PageVm
		vm.page = 2
		await flushPromises()
		expect(listEmployeesMock).toHaveBeenLastCalledWith({ page: 2, q: undefined, status: null, org_unit_id: null, sort: "newest" })
		listEmployeesMock.mockClear()

		vm.filters.status = "probation"
		vm.filters.org_unit_id = 4
		await nextTick()
		await flushPromises()

		expect(listEmployeesMock).toHaveBeenCalledTimes(1)
		expect(listEmployeesMock).toHaveBeenCalledWith({ page: 1, q: undefined, status: "probation", org_unit_id: 4, sort: "newest" })
		wrapper.unmount()
	})

	it("keeps the filters, the order and the page out of the address", async () => {
		route.query = { status: "active", sort: "name_desc", page: "2" }
		const wrapper = mountPage()
		await flushPromises()
		expect(listEmployeesMock).toHaveBeenCalledWith({ page: 1, q: undefined, status: null, org_unit_id: null, sort: "newest" })

		const vm = wrapper.vm as unknown as PageVm
		vm.filters.sort = "name_asc"
		vm.filters.org_unit_id = 5
		await nextTick()
		await flushPromises()

		expect(listEmployeesMock).toHaveBeenLastCalledWith({ page: 1, q: undefined, status: null, org_unit_id: 5, sort: "name_asc" })
		expect(replaceMock).not.toHaveBeenCalled()
		expect(pushMock).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it("searches once typing pauses", async () => {
		vi.useFakeTimers()
		try {
			const wrapper = mountPage()
			await flushPromises()
			listEmployeesMock.mockClear()

			;(wrapper.vm as unknown as PageVm).filters.q = "ri"
			await nextTick()
			;(wrapper.vm as unknown as PageVm).filters.q = "rim"
			await nextTick()
			expect(listEmployeesMock).not.toHaveBeenCalled()

			vi.advanceTimersByTime(350)
			await flushPromises()
			expect(listEmployeesMock).toHaveBeenCalledTimes(1)
			expect(listEmployeesMock).toHaveBeenCalledWith({ page: 1, q: "rim", status: null, org_unit_id: null, sort: "newest" })
			wrapper.unmount()
		} finally {
			vi.useRealTimers()
		}
	})

	it("shows employees as cards by default: who, where they sit, their manager", async () => {
		listEmployeesMock.mockResolvedValue(page([reem, omar]))
		const wrapper = mountPage()
		await flushPromises()

		expect(cards(wrapper)).toHaveLength(2)
		expect(cards(wrapper)[0].text()).toContain("Accountant")
		expect(cards(wrapper)[0].text()).toContain("Operations")
		expect(cards(wrapper)[0].text()).toContain("Hala")
		expect(cards(wrapper)[1].text()).toContain("No direct manager")
		expect(document.body.textContent).toContain("Showing 1–2 of 2 employees")
		wrapper.unmount()
	})

	it("switches to a table with the email, manager and employment type, and remembers the choice", async () => {
		const wrapper = mountPage()
		await flushPromises()

		;(wrapper.vm as unknown as PageVm).display = "table"
		await flushPromises()

		const table = wrapper.find(".n-data-table")
		expect(cards(wrapper)).toHaveLength(0)
		expect(table.text()).toContain("reem@add.test")
		expect(table.text()).toContain("Full time")
		expect(table.text()).toContain("Hala")
		expect(table.text()).toContain("Direct manager")
		expect(table.text()).toContain("Active")
		expect(localStorage.getItem("add-os.hr.employees.display")).toBe("table")
		wrapper.unmount()

		const again = mountPage()
		await flushPromises()
		expect(again.find(".n-data-table").exists()).toBe(true)
		again.unmount()
	})

	it("downloads every match with nothing chosen, and only the chosen employees otherwise", async () => {
		listEmployeesMock.mockResolvedValue(page([reem, omar]))
		const wrapper = mountPage()
		await flushPromises()

		const downloadButton = () => wrapper.findAll("button").find(b => b.text().startsWith("Download"))!
		await downloadButton().trigger("click")
		await flushPromises()
		expect(downloadEmployeesMock).toHaveBeenLastCalledWith({ q: undefined, status: null, org_unit_id: null, sort: "newest" }, [])

		await cards(wrapper)[1].find(".n-checkbox").trigger("click")
		await flushPromises()
		expect(downloadButton().text()).toBe("Download chosen (1)")
		await downloadButton().trigger("click")
		await flushPromises()
		expect(downloadEmployeesMock).toHaveBeenLastCalledWith({ q: undefined, status: null, org_unit_id: null, sort: "newest" }, [9])
		wrapper.unmount()
	})

	it("chooses every shown employee at once, and a new filter drops the choice", async () => {
		listEmployeesMock.mockResolvedValue(page([reem, omar]))
		const wrapper = mountPage()
		await flushPromises()

		const selectAll = wrapper.findAll(".n-checkbox").find(c => c.text().includes("Select all shown results"))!
		await selectAll.trigger("click")
		await flushPromises()
		expect(document.body.textContent).toContain("Chosen: 2")

		;(wrapper.vm as unknown as PageVm).filters.status = "active"
		await nextTick()
		await flushPromises()
		expect(document.body.textContent).not.toContain("Chosen:")
		wrapper.unmount()
	})

	it("hides the edit action from an account without hr.employees.update", async () => {
		permissions.update = false
		const wrapper = mountPage()
		await flushPromises()

		const card = cards(wrapper)[0]
		expect(card.find("[aria-label='View']").exists()).toBe(true)
		expect(card.find("[aria-label='Print']").exists()).toBe(true)
		expect(card.find("[aria-label='Edit']").exists()).toBe(false)
		wrapper.unmount()
	})

	it("opens the employee view with today's net pay and the sum it comes from", async () => {
		getEmployeeMock.mockResolvedValue(employee)
		listCompensationMock.mockResolvedValue([pay("earning", "500"), pay("earning", "500"), pay("deduction", "10"), pay("employer_contribution", "70")])
		const wrapper = mountPage()
		await flushPromises()

		await cards(wrapper)[0].find("[aria-label='View']").trigger("click")
		await flushPromises()

		const view = document.querySelector(".add-print-page")!
		expect(getEmployeeMock).toHaveBeenCalledWith(7)
		expect(listCompensationMock).toHaveBeenCalledWith(7)
		expect(view.textContent).toContain("Reem")
		expect(view.querySelector("[data-test='net-pay']")!.textContent).toContain("990")
		expect(view.querySelector("[data-test='net-pay']")!.textContent).toContain("500 + 500 − 10")
		expect(view.textContent).toContain("Identity")
		expect(view.textContent).toContain("Job and contact")
		expect(view.textContent).toContain("Linked to an account")
		wrapper.unmount()
	})

	it("shows no pay to an account without hr.payroll.view, and never asks for it", async () => {
		permissions.payroll = false
		getEmployeeMock.mockResolvedValue(employee)
		const wrapper = mountPage()
		await flushPromises()

		await cards(wrapper)[0].find("[aria-label='View']").trigger("click")
		await flushPromises()

		expect(document.querySelector(".add-print-page")).not.toBeNull()
		expect(document.querySelector("[data-test='net-pay']")).toBeNull()
		expect(listCompensationMock).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it("prints an employee's sheet once it has loaded", async () => {
		const printMock = vi.spyOn(window, "print").mockImplementation(() => {})
		getEmployeeMock.mockResolvedValue(employee)
		listCompensationMock.mockResolvedValue([])
		const wrapper = mountPage()
		await flushPromises()

		await cards(wrapper)[0].find("[aria-label='Print']").trigger("click")
		await flushPromises()

		expect(document.querySelector(".add-print-page")).not.toBeNull()
		expect(printMock).toHaveBeenCalledTimes(1)
		printMock.mockRestore()
		wrapper.unmount()
	})
})
