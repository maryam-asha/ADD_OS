import { beforeEach, describe, expect, it, vi } from "vitest"
import * as hr from "../core"

const { getMock, postMock, putMock, patchMock, delMock, uploadMock } = vi.hoisted(() => ({
	getMock: vi.fn(),
	postMock: vi.fn(),
	putMock: vi.fn(),
	patchMock: vi.fn(),
	delMock: vi.fn(),
	uploadMock: vi.fn()
}))

vi.mock("../../api", () => ({ get: getMock, post: postMock, put: putMock, patch: patchMock, del: delMock, uploadFile: uploadMock }))

const BASE = "/api/v1/hr"

describe("hr core service", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("employees", () => {
		it("lists a page with only the filters that are set", async () => {
			getMock.mockResolvedValue({ data: [{ id: 1 }], meta: { current_page: 2, last_page: 3, per_page: 25, total: 60 } })

			const page = await hr.listEmployees({ page: 2, q: "rim", status: "active", org_unit_id: null })

			expect(getMock).toHaveBeenCalledWith(`${BASE}/employees`, { page: 2, q: "rim", status: "active" })
			expect(page.data).toEqual([{ id: 1 }])
			expect(page.meta.last_page).toBe(3)
		})

		it("patches the personal details and answers the server's message", async () => {
			patchMock.mockResolvedValue({ message: "تم تحديث بيانات الموظف." })

			await expect(hr.updateEmployee(7, { marital_status: "married" })).resolves.toEqual({ message: "تم تحديث بيانات الموظف." })
			expect(patchMock).toHaveBeenCalledWith(`${BASE}/employees/7`, { marital_status: "married" })
		})

		it("reads the sensitive fields from data", async () => {
			getMock.mockResolvedValue({ data: { national_id: "0101", bank_account: null } })

			await expect(hr.getEmployeeSensitive(7)).resolves.toEqual({ national_id: "0101", bank_account: null })
			expect(getMock).toHaveBeenCalledWith(`${BASE}/employees/7/sensitive`)
		})

		it("replaces the contacts and the dependents as whole lists", async () => {
			putMock.mockResolvedValue({ message: "ok" })

			await hr.replaceEmployeeContacts(7, [{ name: "سلمى", relation: "أخت", phone: "+963944000001" }])
			await hr.replaceEmployeeDependents(7, [])

			expect(putMock).toHaveBeenNthCalledWith(1, `${BASE}/employees/7/contacts`, { contacts: [{ name: "سلمى", relation: "أخت", phone: "+963944000001" }] })
			expect(putMock).toHaveBeenNthCalledWith(2, `${BASE}/employees/7/dependents`, { dependents: [] })
		})
	})

	describe("career", () => {
		it("records an event and answers the created event", async () => {
			postMock.mockResolvedValue({ data: { id: 30, type: "promotion" } })
			const payload = { type: "promotion" as const, effective_on: "2026-11-01", assignment: { job_grade_id: 4 } }

			await expect(hr.recordEmploymentEvent(7, payload)).resolves.toEqual({ id: 30, type: "promotion" })
			expect(postMock).toHaveBeenCalledWith(`${BASE}/employees/7/events`, payload)
		})

		it("reads the assignment and contract histories", async () => {
			getMock.mockResolvedValueOnce({ data: [{ id: 1 }] }).mockResolvedValueOnce({ data: [{ id: 2 }] })

			await expect(hr.listEmployeeAssignments(7)).resolves.toEqual([{ id: 1 }])
			await expect(hr.listEmployeeContracts(7)).resolves.toEqual([{ id: 2 }])
			expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/employees/7/assignments`)
			expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/employees/7/contracts`)
		})
	})

	describe("documents", () => {
		it("keeps the compliance block that comes beside the list", async () => {
			const compliance = { complete: false, missing: [{ id: 2, code: "id-card" }], expired: [9] }
			getMock.mockResolvedValue({ data: [{ id: 9 }], compliance })

			await expect(hr.listEmployeeDocuments(7)).resolves.toEqual({ documents: [{ id: 9 }], compliance })
		})

		it("uploads the file with only the fields that are filled", async () => {
			uploadMock.mockResolvedValue({ data: { id: 12 } })
			const file = new File(["x"], "id.pdf", { type: "application/pdf" })

			await hr.uploadEmployeeDocument(7, { document_type_id: 2, file, issued_on: "2026-01-02", expires_on: null, notes: null })

			expect(uploadMock).toHaveBeenCalledWith(`${BASE}/employees/7/documents`, file, "file", { document_type_id: "2", issued_on: "2026-01-02" })
		})

		it("deletes a document and a document type by id", async () => {
			delMock.mockResolvedValue(undefined)

			await hr.deleteEmployeeDocument(12)
			await expect(hr.deleteDocumentType(3)).resolves.toEqual({})

			expect(delMock).toHaveBeenNthCalledWith(1, `${BASE}/documents/12`)
			expect(delMock).toHaveBeenNthCalledWith(2, `${BASE}/document-types/3`)
		})

		it("creates and updates document types", async () => {
			postMock.mockResolvedValue({ data: { id: 3 } })
			patchMock.mockResolvedValue({ message: "ok" })
			const payload = { name: { ar: "هوية", en: null }, code: "id-card", is_required: true, contract_types: null, has_expiry: true, is_active: true }

			await expect(hr.createDocumentType(payload)).resolves.toEqual({ id: 3 })
			await hr.updateDocumentType(3, { is_active: false })

			expect(postMock).toHaveBeenCalledWith(`${BASE}/document-types`, payload)
			expect(patchMock).toHaveBeenCalledWith(`${BASE}/document-types/3`, { is_active: false })
		})
	})

	describe("checklists and alerts", () => {
		it("ticks a task with its notes", async () => {
			patchMock.mockResolvedValue({ message: "ok" })

			await hr.updateChecklistTask(4, { completed: true, notes: "تم" })

			expect(patchMock).toHaveBeenCalledWith(`${BASE}/checklist-tasks/4`, { completed: true, notes: "تم" })
		})

		it("reads an employee's checklist and the templates", async () => {
			getMock.mockResolvedValueOnce({ data: [{ id: 4 }] }).mockResolvedValueOnce({ data: [{ id: 1 }] })

			await expect(hr.listEmployeeChecklist(7)).resolves.toEqual([{ id: 4 }])
			await expect(hr.listChecklistTemplates()).resolves.toEqual([{ id: 1 }])
			expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/employees/7/checklist`)
			expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/checklist-templates`)
		})

		it("reads the alerts without a query: the server takes no filter", async () => {
			getMock.mockResolvedValue({ data: [{ type: "contract_ending" }] })

			await expect(hr.listHrAlerts()).resolves.toEqual([{ type: "contract_ending" }])
			expect(getMock).toHaveBeenCalledWith(`${BASE}/alerts`)
		})
	})

	describe("organisation", () => {
		it("reads the tree with tree=1 and positions by unit", async () => {
			getMock.mockResolvedValue({ data: [] })

			await hr.orgTree()
			await hr.listPositions(5)
			await hr.listPositions()

			expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/org-units`, { tree: 1 })
			expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/positions`, { org_unit_id: 5 })
			expect(getMock).toHaveBeenNthCalledWith(3, `${BASE}/positions`, undefined)
		})

		it.each([
			["org unit", () => hr.deleteOrgUnit(5), `${BASE}/org-units/5`],
			["position", () => hr.deletePosition(6), `${BASE}/positions/6`],
			["job grade", () => hr.deleteJobGrade(2), `${BASE}/job-grades/2`]
		])("deletes a %s", async (_name, call, path) => {
			delMock.mockResolvedValue(undefined)
			await call()
			expect(delMock).toHaveBeenCalledWith(path)
		})

		it("creates and updates positions and grades", async () => {
			postMock.mockResolvedValue({ data: { id: 1 } })
			patchMock.mockResolvedValue({ message: "ok" })
			const position = { title: { ar: "محاسب", en: null }, org_unit_id: 5, job_grade_id: null, code: null, headcount: 2, is_active: true }

			await hr.createPosition(position)
			await hr.updatePosition(6, { headcount: 3 })
			await hr.createJobGrade({ name: { ar: "أولى", en: null }, code: "G1", rank: 1 })

			expect(postMock).toHaveBeenNthCalledWith(1, `${BASE}/positions`, position)
			expect(patchMock).toHaveBeenNthCalledWith(1, `${BASE}/positions/6`, { headcount: 3 })
			expect(postMock).toHaveBeenNthCalledWith(2, `${BASE}/job-grades`, { name: { ar: "أولى", en: null }, code: "G1", rank: 1 })
		})

		it("lists ADD's branches as the work locations, read only", async () => {
			getMock.mockResolvedValue({ data: [{ id: 2, name: { ar: "حلب", en: "Aleppo" } }] })

			expect(await hr.listWorkLocations()).toEqual([{ id: 2, name: { ar: "حلب", en: "Aleppo" } }])
			expect(getMock).toHaveBeenCalledWith(`${BASE}/work-locations`)
			expect("createWorkLocation" in hr).toBe(false)
		})
	})

	describe("the person on the account", () => {
		it("finds accounts for the hire form", async () => {
			const match = { id: 7, name: "سارة", phone: "+963944000001", email: "sara@add.sy", employee_id: null }
			getMock.mockResolvedValue({ data: [match] })

			expect(await hr.searchAccounts("0944")).toEqual([match])
			expect(getMock).toHaveBeenCalledWith(`${BASE}/accounts`, { q: "0944" })
		})

		it("hires an existing account by its id alone", async () => {
			postMock.mockResolvedValue({ data: { id: 3 } })
			const payload = {
				user_id: 7,
				date_of_birth: "1995-04-02",
				hired_on: "2026-10-01",
				contract: { type: "open_ended" as const },
				assignment: { org_unit_id: 1, employment_type: "full_time" as const, work_mode: "on_site" as const }
			}

			await hr.hireEmployee(payload)

			expect(postMock).toHaveBeenCalledWith(`${BASE}/employees`, payload)
		})

		it("filters employees by their account", async () => {
			getMock.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 } })

			await hr.listEmployees({ user_id: 7 })

			expect(getMock).toHaveBeenCalledWith(`${BASE}/employees`, { page: 1, user_id: 7 })
		})
	})

	describe("my HR", () => {
		it("reads my events and replaces my contacts", async () => {
			getMock.mockResolvedValue({ data: [{ id: 1, type: "hire" }] })
			putMock.mockResolvedValue({ message: "ok" })

			await expect(hr.listMyEvents()).resolves.toEqual([{ id: 1, type: "hire" }])
			await hr.replaceMyContacts([])

			expect(getMock).toHaveBeenCalledWith(`${BASE}/me/events`)
			expect(putMock).toHaveBeenCalledWith(`${BASE}/me/contacts`, { contacts: [] })
		})

		it("reads both certificates from data", async () => {
			getMock.mockResolvedValueOnce({ data: { employee_number: "E-1" } }).mockResolvedValueOnce({ data: { employee_number: "E-1", monthly_pay: [] } })

			await expect(hr.getMyEmploymentCertificate()).resolves.toEqual({ employee_number: "E-1" })
			await expect(hr.getMySalaryCertificate()).resolves.toEqual({ employee_number: "E-1", monthly_pay: [] })
			expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/me/certificates/employment`)
			expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/me/certificates/salary`)
		})
	})
})
