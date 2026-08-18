import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/add-os/services/api"
import { useCompanyDetail } from "../useCompanyDetail"

const getCompanyMock = vi.fn()
const listUsersMock = vi.fn()
const membersListMock = vi.fn()
const membersAddMock = vi.fn()
const membersUpdateDoorAccessMock = vi.fn()
const membersUpdateAdminFlagMock = vi.fn()
const membersRemoveMock = vi.fn()

vi.mock("@/add-os/services/companies", () => ({
	getCompany: (id: number) => getCompanyMock(id)
}))

vi.mock("@/add-os/services/users", () => ({
	listUsers: () => listUsersMock()
}))

vi.mock("@/add-os/services/company-members", () => ({
	createCompanyMembersApi: (companyId: number) => ({
		list: () => membersListMock(companyId),
		add: (payload: unknown) => membersAddMock(companyId, payload),
		updateDoorAccess: (userId: number, payload: unknown) => membersUpdateDoorAccessMock(companyId, userId, payload),
		updateAdminFlag: (userId: number, payload: unknown) => membersUpdateAdminFlagMock(companyId, userId, payload),
		remove: (userId: number) => membersRemoveMock(companyId, userId)
	})
}))

const sampleCompany = { id: 3, private_office_request_id: 1, legal_name: "Acme", contract_ref: "C-1", branch_id: 1, status: "active" }
const sampleMember = { user_id: 5, door_access_enabled: true, is_admin: false }
const sampleUser = { id: 5, name: "Sara", phone: "0999", email: "sara@add.sy", preferred_language: "ar", preferred_currency: "SYP", status: "active", roles: [] }

async function flush() {
	await Promise.resolve()
	await Promise.resolve()
}

describe("useCompanyDetail", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		getCompanyMock.mockResolvedValue(sampleCompany)
		listUsersMock.mockResolvedValue([sampleUser])
		membersListMock.mockResolvedValue([sampleMember])
		membersAddMock.mockResolvedValue(sampleMember)
		membersUpdateDoorAccessMock.mockResolvedValue({ message: "ok" })
		membersUpdateAdminFlagMock.mockResolvedValue({ message: "ok" })
		membersRemoveMock.mockResolvedValue({ message: "ok" })
	})

	it("eagerly fetches the company, its members, and the user list, scoped to companyId", async () => {
		const detail = useCompanyDetail(3)
		await flush()

		expect(getCompanyMock).toHaveBeenCalledWith(3)
		expect(membersListMock).toHaveBeenCalledWith(3)
		expect(listUsersMock).toHaveBeenCalled()
		expect(detail.company.value).toEqual(sampleCompany)
		expect(detail.members.value).toEqual([sampleMember])
		expect(detail.users.value).toEqual([sampleUser])
		expect(detail.isLoadingCompany.value).toBe(false)
		expect(detail.isLoadingMembers.value).toBe(false)
	})

	it("addMember() adds via the company-scoped members api and refetches members", async () => {
		const detail = useCompanyDetail(3)
		await flush()
		membersListMock.mockResolvedValueOnce([sampleMember, { user_id: 9, door_access_enabled: false, is_admin: false }])

		await detail.addMember({ user_id: 9, door_access_enabled: false, is_admin: false })

		expect(membersAddMock).toHaveBeenCalledWith(3, { user_id: 9, door_access_enabled: false, is_admin: false })
		expect(membersListMock).toHaveBeenCalledTimes(2)
		expect(detail.members.value).toHaveLength(2)
	})

	it("setDoorAccess() updates via the members api and refetches members", async () => {
		const detail = useCompanyDetail(3)
		await flush()

		await detail.setDoorAccess(5, { door_access_enabled: false })

		expect(membersUpdateDoorAccessMock).toHaveBeenCalledWith(3, 5, { door_access_enabled: false })
		expect(membersListMock).toHaveBeenCalledTimes(2)
	})

	it("setAdminFlag() updates via the members api and refetches members", async () => {
		const detail = useCompanyDetail(3)
		await flush()

		await detail.setAdminFlag(5, { is_admin: true })

		expect(membersUpdateAdminFlagMock).toHaveBeenCalledWith(3, 5, { is_admin: true })
		expect(membersListMock).toHaveBeenCalledTimes(2)
	})

	it("removeMember() removes via the members api and refetches members", async () => {
		const detail = useCompanyDetail(3)
		await flush()

		await detail.removeMember(5)

		expect(membersRemoveMock).toHaveBeenCalledWith(3, 5)
		expect(membersListMock).toHaveBeenCalledTimes(2)
	})

	it("refetchCompany() re-fetches only the company by its own id", async () => {
		const detail = useCompanyDetail(3)
		await flush()
		getCompanyMock.mockResolvedValueOnce({ ...sampleCompany, status: "inactive" })

		await detail.refetchCompany()

		expect(getCompanyMock).toHaveBeenCalledTimes(2)
		expect(detail.company.value?.status).toBe("inactive")
	})

	it("sets companyError on a failed company fetch, without throwing", async () => {
		getCompanyMock.mockRejectedValueOnce(new ApiError(403, JSON.stringify({ message: "Forbidden" })))

		const detail = useCompanyDetail(3)
		await flush()

		expect(detail.company.value).toBeNull()
		expect(detail.companyError.value).toBeInstanceOf(ApiError)
	})
})
