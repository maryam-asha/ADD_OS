import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import OrgStructurePage from "../OrgStructurePage.vue"

const { orgTreeMock, listPositionsMock, deleteOrgUnitMock, successMock, errorMock, permissions } = vi.hoisted(() => ({
	orgTreeMock: vi.fn(),
	listPositionsMock: vi.fn(),
	deleteOrgUnitMock: vi.fn(),
	successMock: vi.fn(),
	errorMock: vi.fn(),
	permissions: { manage: true }
}))

vi.mock("@/add-os/config/permissions", () => ({ canManageOrgStructure: () => permissions.manage }))
vi.mock("@/add-os/services/hr/core", () => ({
	orgTree: orgTreeMock,
	listPositions: listPositionsMock,
	listJobGrades: vi.fn().mockResolvedValue([]),
	listWorkLocations: vi.fn().mockResolvedValue([]),
	deleteOrgUnit: deleteOrgUnitMock,
	deletePosition: vi.fn(),
	createOrgUnit: vi.fn(),
	updateOrgUnit: vi.fn(),
	createJobGrade: vi.fn(),
	updateJobGrade: vi.fn(),
	deleteJobGrade: vi.fn(),
	createWorkLocation: vi.fn(),
	updateWorkLocation: vi.fn(),
	deleteWorkLocation: vi.fn()
}))
vi.mock("@/add-os/modules/hr/components/core/PositionFormModal.vue", () => ({ default: { name: "PositionFormModal", render: () => null } }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return {
		...actual,
		// Drive the confirmation directly, as clicking "Delete" would.
		useDialog: () => ({ warning: (options: { onPositiveClick: () => unknown }) => options.onPositiveClick() }),
		useMessage: () => ({ success: successMock, error: errorMock, warning: vi.fn() })
	}
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr } } })
const unit = { id: 5, parent_id: null, code: "OPS", name: { ar: "العمليات", en: "Operations" }, head_employee_id: null, is_active: true, children: [] }

function mountPage() {
	return mount(OrgStructurePage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
}

interface PageVm { onSelect: (keys: number[]) => Promise<void>; confirmDeleteUnit: (u: typeof unit) => void }

describe("orgStructurePage", () => {
	// Bilingual HR values follow the app's own locale ref, not the test i18n.
	beforeAll(() => {
		setCurrentLocale("en")
	})
	beforeEach(() => {
		vi.clearAllMocks()
		permissions.manage = true
		orgTreeMock.mockResolvedValue([unit])
		listPositionsMock.mockResolvedValue([])
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("shows no add, edit or delete control to a reader without hr.org.manage", async () => {
		permissions.manage = false
		const wrapper = mountPage()
		await flushPromises()
		await (wrapper.vm as unknown as PageVm).onSelect([5])
		await flushPromises()

		const text = document.body.textContent ?? ""
		expect(text).toContain("Operations")
		expect(text).not.toContain("Add unit")
		expect(text).not.toContain("Add position")
		expect(text).not.toContain("Delete")
		wrapper.unmount()
	})

	it("deletes a unit after confirming, then reloads the tree", async () => {
		deleteOrgUnitMock.mockResolvedValue(undefined)
		const wrapper = mountPage()
		await flushPromises()
		orgTreeMock.mockClear()

		;(wrapper.vm as unknown as PageVm).confirmDeleteUnit(unit)
		await flushPromises()

		expect(deleteOrgUnitMock).toHaveBeenCalledWith(5)
		expect(successMock).toHaveBeenCalledWith("Unit deleted.")
		expect(orgTreeMock).toHaveBeenCalledTimes(1)
		wrapper.unmount()
	})

	it("shows the server's reason when a unit in use cannot be deleted", async () => {
		deleteOrgUnitMock.mockRejectedValue(new ApiError(409, JSON.stringify({ message: "This unit still has sub-units, positions or employees." })))
		const wrapper = mountPage()
		await flushPromises()
		orgTreeMock.mockClear()

		;(wrapper.vm as unknown as PageVm).confirmDeleteUnit(unit)
		await flushPromises()

		expect(errorMock).toHaveBeenCalledWith("This unit still has sub-units, positions or employees.")
		expect(orgTreeMock).not.toHaveBeenCalled()
		wrapper.unmount()
	})
})
