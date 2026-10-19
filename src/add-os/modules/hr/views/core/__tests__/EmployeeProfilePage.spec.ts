import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enHr from "@/add-os/lang/en/hr.json"
import EmployeeProfilePage from "../EmployeeProfilePage.vue"

const { getEmployeeMock, permissions } = vi.hoisted(() => ({
	getEmployeeMock: vi.fn(),
	permissions: { update: true, events: true, documents: true, checklists: true }
}))

vi.mock("@/add-os/config/permissions", () => ({
	canUpdateEmployees: () => permissions.update,
	canRecordEmploymentEvents: () => permissions.events,
	canViewEmployeeDocuments: () => permissions.documents,
	canManageChecklists: () => permissions.checklists,
	canViewEmployeeSensitive: () => false,
	canViewLeave: () => false,
	canViewAttendance: () => false,
	canViewTimesheets: () => false,
	canViewPayroll: () => false,
	canViewBenefits: () => false
}))
vi.mock("@/add-os/services/hr/core", () => ({
	getEmployee: getEmployeeMock,
	replaceEmployeeContacts: vi.fn(),
	replaceEmployeeDependents: vi.fn()
}))
vi.mock("@/add-os/modules/hr/components/core/CareerTab.vue", () => ({ default: { name: "CareerTab", render: () => null } }))
vi.mock("@/add-os/modules/hr/components/core/ChecklistTab.vue", () => ({ default: { name: "ChecklistTab", render: () => null } }))
vi.mock("@/add-os/modules/hr/components/core/EditEmployeeModal.vue", () => ({ default: { name: "EditEmployeeModal", props: ["show", "employee"], render: () => null } }))
vi.mock("@/add-os/modules/hr/components/core/EmployeeDocumentsTab.vue", () => ({ default: { name: "EmployeeDocumentsTab", render: () => null } }))
vi.mock("@/add-os/modules/hr/components/core/PeopleListModal.vue", () => ({ default: { name: "PeopleListModal", render: () => null } }))
vi.mock("@/add-os/modules/hr/components/core/RecordEventModal.vue", () => ({ default: { name: "RecordEventModal", props: ["show", "employee"], render: () => null } }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: vi.fn() }), useRoute: () => ({ params: { id: "7" } }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr } } })

function employee() {
	return {
		id: 7,
		employee_number: "E-0007",
		user_id: 3,
		name: { ar: "ريم", en: "Reem" },
		gender: "female",
		date_of_birth: "1994-03-02",
		nationality: "SY",
		marital_status: "single",
		phone: "+963944000000",
		personal_email: null,
		work_email: "reem@add.sy",
		address: null,
		has_national_id: true,
		has_bank_account: false,
		status: "active",
		hired_on: "2025-01-04",
		probation_ends_on: null,
		confirmed_on: null,
		terminated_on: null,
		termination_reason: null,
		current_assignment: null,
		current_contract: null,
		contacts: [],
		dependents: [{ id: 1, name: "Lana", relation: "Daughter", date_of_birth: "2020-05-01" }]
	}
}

function mountPage() {
	return mount(EmployeeProfilePage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
}

describe("employeeProfilePage", () => {
	// Bilingual HR values follow the app's own locale ref, not the test i18n.
	beforeAll(() => {
		setCurrentLocale("en")
	})
	beforeEach(() => {
		vi.clearAllMocks()
		Object.assign(permissions, { update: true, events: true, documents: true, checklists: true })
		getEmployeeMock.mockResolvedValue(employee())
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("shows the file with its new details, dependents and what is on file", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(getEmployeeMock).toHaveBeenCalledWith(7)
		const text = document.body.textContent ?? ""
		expect(text).toContain("Reem")
		expect(text).toContain("Female")
		expect(text).toContain("Lana")
		expect(text).toContain("On file")
		expect(text).toContain("Edit details")
		expect(text).toContain("Record event")
		expect(text).toContain("Checklist")
		wrapper.unmount()
	})

	it("hides editing, events and the checklist from an account without their permissions", async () => {
		Object.assign(permissions, { update: false, events: false, checklists: false })
		const wrapper = mountPage()
		await flushPromises()

		const text = document.body.textContent ?? ""
		expect(text).not.toContain("Edit details")
		expect(text).not.toContain("Record event")
		expect(text).not.toContain("Checklist")
		expect(wrapper.findComponent({ name: "RecordEventModal" }).exists()).toBe(false)
		wrapper.unmount()
	})

	it("reloads the file after an event is recorded", async () => {
		const wrapper = mountPage()
		await flushPromises()
		getEmployeeMock.mockClear()

		wrapper.findComponent({ name: "RecordEventModal" }).vm.$emit("recorded")
		await flushPromises()

		expect(getEmployeeMock).toHaveBeenCalledWith(7)
		wrapper.unmount()
	})
})
