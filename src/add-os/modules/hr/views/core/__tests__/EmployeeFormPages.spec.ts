import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import EditEmployeePage from "../EditEmployeePage.vue"
import HireEmployeePage from "../HireEmployeePage.vue"

const mocks = vi.hoisted(() => ({
	getEmployee: vi.fn(),
	updateEmployee: vi.fn(),
	hireEmployee: vi.fn(),
	push: vi.fn(),
	success: vi.fn(),
	error: vi.fn(),
	route: { params: { id: "5" } as Record<string, string>, query: {} }
}))

vi.mock("@/add-os/services/hr/core", () => ({
	getEmployee: mocks.getEmployee,
	updateEmployee: mocks.updateEmployee,
	hireEmployee: mocks.hireEmployee,
	listOrgUnits: vi.fn().mockResolvedValue([{ id: 4, name: { ar: "العمليات", en: "Operations" }, is_active: true, parent_id: null, code: null, head_employee_id: null }]),
	listJobGrades: vi.fn().mockResolvedValue([]),
	listWorkLocations: vi.fn().mockResolvedValue([]),
	listPositions: vi.fn().mockResolvedValue([]),
	searchAccounts: vi.fn().mockResolvedValue([])
}))
vi.mock("@/add-os/modules/hr/components/EmployeeSelect.vue", () => ({ default: { name: "EmployeeSelect", render: () => null } }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: mocks.success, error: mocks.error }) }
})
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: mocks.push }), useRoute: () => mocks.route }
})

const i18n = createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: { ...en, ...enHr } } })

function mountPage(component: unknown) {
	return mount(component as never, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
}

function button(wrapper: ReturnType<typeof mountPage>, label: string) {
	const found = wrapper.findAll("button").find(b => b.text().trim() === label)
	if (!found) throw new Error(`No "${label}" button`)
	return found
}

const employee = {
	id: 5,
	employee_number: "ADD-0005",
	name: { ar: "ريم", en: "Reem" },
	phone: "+963944000005",
	work_email: "reem@add.test",
	gender: "female",
	date_of_birth: "1995-03-01",
	nationality: "SY",
	marital_status: "single",
	personal_email: null,
	address: null,
	has_national_id: true,
	has_bank_account: false,
	status: "active",
	current_assignment: { job_title: { ar: "محاسبة", en: "Accountant" }, org_unit: { id: 4, name: { ar: "العمليات", en: "Operations" } } }
}

describe("hR forms on pages of their own", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.route.params = { id: "5" }
		window.history.replaceState({}, "")
	})
	afterEach(() => {
		document.body.innerHTML = ""
	})
	afterAll(() => {
		setCurrentLocale("ar")
	})

	describe("editEmployeePage", () => {
		it("loads the employee named in the address and shows their account's identity beside the form", async () => {
			mocks.getEmployee.mockResolvedValue(employee)
			const wrapper = mountPage(EditEmployeePage)
			await flushPromises()

			expect(mocks.getEmployee).toHaveBeenCalledWith(5)
			const summary = document.querySelector("[data-test='employee-summary']")!
			expect(summary.textContent).toContain("Reem")
			expect(summary.textContent).toContain("Accountant · Operations")
			expect(summary.textContent).toContain("ADD-0005")
			expect(summary.textContent).toContain("+963944000005")
			expect(summary.textContent).toContain("reem@add.test")
			expect(document.querySelector(".n-modal")).toBeNull()
			wrapper.unmount()
		})

		it("says when the form holds unsaved changes, and not before", async () => {
			mocks.getEmployee.mockResolvedValue(employee)
			const wrapper = mountPage(EditEmployeePage)
			await flushPromises()

			expect(document.body.textContent).toContain("No changes yet")
			expect(document.querySelector("[data-test='unsaved']")).toBeNull()

			await wrapper.find("textarea").setValue("Aleppo")
			await flushPromises()

			expect(document.querySelector("[data-test='unsaved']")?.textContent).toContain("Unsaved changes")
			wrapper.unmount()
		})

		it("saves the personal details, leaves a blank national ID as it is on file, and returns to the file", async () => {
			mocks.getEmployee.mockResolvedValue(employee)
			mocks.updateEmployee.mockResolvedValue({ message: null })
			const wrapper = mountPage(EditEmployeePage)
			await flushPromises()

			await button(wrapper, "Save").trigger("click")
			await flushPromises()

			expect(mocks.updateEmployee).toHaveBeenCalledWith(5, {
				gender: "female",
				date_of_birth: "1995-03-01",
				nationality: "SY",
				marital_status: "single",
				personal_email: null,
				address: null
			})
			expect(mocks.push).toHaveBeenCalledWith({ name: "hr.employeeProfile", params: { id: 5 } })
			wrapper.unmount()
		})

		it("says so instead of showing an empty form when the employee cannot be loaded", async () => {
			mocks.getEmployee.mockRejectedValue(new ApiError(404, JSON.stringify({ message: "Not found." })))
			const wrapper = mountPage(EditEmployeePage)
			await flushPromises()

			expect(document.body.textContent).toContain("Could not load the data")
			expect(wrapper.findAll("button").some(b => b.text().trim() === "Save")).toBe(false)
			wrapper.unmount()
		})
	})

	describe("hireEmployeePage", () => {
		const account = { id: 31, name: "Sami", phone: "+963944000031", email: "sami@add.test", employee_id: null }

		it("preselects the account the Users page sent, and takes it out of the history so a reload starts blank", async () => {
			window.history.replaceState({ hireAccount: account }, "")
			const wrapper = mountPage(HireEmployeePage)
			await flushPromises()

			expect(document.body.textContent).toContain("sami@add.test")
			expect((window.history.state as { hireAccount?: unknown }).hireAccount).toBeUndefined()
			wrapper.unmount()
		})

		it("hires on the chosen account and opens the new employee's file", async () => {
			window.history.replaceState({ hireAccount: account }, "")
			mocks.hireEmployee.mockResolvedValue({ id: 77 })
			const wrapper = mountPage(HireEmployeePage)
			await flushPromises()

			const vm = wrapper.vm as unknown as { form: { hiredOn: string | null; orgUnitId: number | null } }
			vm.form.hiredOn = "2026-11-15"
			vm.form.orgUnitId = 4
			await flushPromises()
			await button(wrapper, "Hire").trigger("click")
			await flushPromises()

			expect(mocks.hireEmployee).toHaveBeenCalledTimes(1)
			expect(mocks.hireEmployee.mock.calls[0][0]).toMatchObject({
				user_id: 31,
				hired_on: "2026-11-15",
				contract: { type: "open_ended", ends_on: null },
				assignment: { org_unit_id: 4, employment_type: "full_time", work_mode: "on_site" }
			})
			expect(mocks.push).toHaveBeenCalledWith({ name: "hr.employeeProfile", params: { id: 77 } })
			wrapper.unmount()
		})

		it("refuses to hire an account that is already an employee", async () => {
			window.history.replaceState({ hireAccount: { ...account, employee_id: 9 } }, "")
			const wrapper = mountPage(HireEmployeePage)
			await flushPromises()

			expect(document.body.textContent).toContain("This account is already an employee.")
			expect(button(wrapper, "Hire").attributes("disabled")).toBeDefined()
			wrapper.unmount()
		})

		it("sends nothing while the job is incomplete", async () => {
			window.history.replaceState({ hireAccount: account }, "")
			const wrapper = mountPage(HireEmployeePage)
			await flushPromises()

			await button(wrapper, "Hire").trigger("click")
			await flushPromises()

			expect(mocks.hireEmployee).not.toHaveBeenCalled()
			wrapper.unmount()
		})
	})
})
