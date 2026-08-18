import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/add-os/services/api"
import { useCompanyCreation, useCompanyStatusChange } from "../useCompanyMutations"

const { successMock, errorMock } = vi.hoisted(() => ({ successMock: vi.fn(), errorMock: vi.fn() }))

vi.mock("naive-ui", () => ({
	useMessage: () => ({ success: successMock, error: errorMock })
}))

vi.mock("vue-i18n", () => ({
	useI18n: () => ({
		t: (key: string) => {
			if (key === "resourceCrud.mutations.genericError") return "Something went wrong. Please try again."
			if (key === "resourceCrud.mutations.permissionError") return "You don't have permission for this action."
			if (key === "companies.create.success") return "Company created."
			if (key === "companies.changeStatus.success") return "Status updated."
			return key
		}
	})
}))

const createCompanyMock = vi.fn()
const updateCompanyStatusMock = vi.fn()

vi.mock("@/add-os/services/companies", () => ({
	createCompany: (payload: unknown) => createCompanyMock(payload),
	updateCompanyStatus: (id: number, payload: unknown) => updateCompanyStatusMock(id, payload)
}))

const samplePayload = { private_office_request_id: 1, legal_name: "Acme", contract_ref: "C-1", branch_id: 1 }
const sampleCompany = { id: 1, ...samplePayload, status: "active" }

describe("useCompanyCreation", () => {
	beforeEach(() => vi.clearAllMocks())

	it("creates, toasts success, and refetches both requests and companies", async () => {
		createCompanyMock.mockResolvedValue(sampleCompany)
		const refetchRequests = vi.fn().mockResolvedValue(undefined)
		const refetchCompanies = vi.fn().mockResolvedValue(undefined)
		const { submit } = useCompanyCreation(refetchRequests, refetchCompanies)

		const result = await submit(samplePayload)

		expect(createCompanyMock).toHaveBeenCalledWith(samplePayload)
		expect(successMock).toHaveBeenCalledWith("Company created.")
		expect(refetchRequests).toHaveBeenCalledOnce()
		expect(refetchCompanies).toHaveBeenCalledOnce()
		expect(result).toEqual(sampleCompany)
	})

	it("on a 422, rethrows without toasting (so the drawer maps field errors)", async () => {
		const failure = new ApiError(422, JSON.stringify({ message: "Invalid.", errors: { branch_id: ["Required."] } }))
		createCompanyMock.mockRejectedValue(failure)
		const refetchRequests = vi.fn()
		const refetchCompanies = vi.fn()
		const { submit } = useCompanyCreation(refetchRequests, refetchCompanies)

		await expect(submit(samplePayload)).rejects.toBe(failure)

		expect(errorMock).not.toHaveBeenCalled()
		expect(refetchRequests).not.toHaveBeenCalled()
	})

	it("on a 403, toasts the fixed permission message and rethrows", async () => {
		const failure = new ApiError(403, JSON.stringify({ message: "Unauthorized." }))
		createCompanyMock.mockRejectedValue(failure)
		const { submit } = useCompanyCreation(vi.fn(), vi.fn())

		await expect(submit(samplePayload)).rejects.toBe(failure)

		expect(errorMock).toHaveBeenCalledWith("You don't have permission for this action.")
	})

	it("on a non-422/403 ApiError, toasts the server message and rethrows", async () => {
		const failure = new ApiError(409, JSON.stringify({ message: "That request is not quoted." }))
		createCompanyMock.mockRejectedValue(failure)
		const { submit } = useCompanyCreation(vi.fn(), vi.fn())

		await expect(submit(samplePayload)).rejects.toBe(failure)

		expect(errorMock).toHaveBeenCalledWith("That request is not quoted.")
	})
})

describe("useCompanyStatusChange", () => {
	beforeEach(() => vi.clearAllMocks())

	it("updates status, toasts success, and refetches companies", async () => {
		updateCompanyStatusMock.mockResolvedValue({ message: "ok" })
		const refetchCompanies = vi.fn().mockResolvedValue(undefined)
		const { submit } = useCompanyStatusChange(refetchCompanies)

		await submit(1, { status: "inactive" })

		expect(updateCompanyStatusMock).toHaveBeenCalledWith(1, { status: "inactive" })
		expect(successMock).toHaveBeenCalledWith("Status updated.")
		expect(refetchCompanies).toHaveBeenCalledOnce()
	})

	it("on failure, toasts and rethrows without refetching", async () => {
		const failure = new ApiError(422, JSON.stringify({ message: "Invalid status." }))
		updateCompanyStatusMock.mockRejectedValue(failure)
		const refetchCompanies = vi.fn()
		const { submit } = useCompanyStatusChange(refetchCompanies)

		await expect(submit(1, { status: "inactive" })).rejects.toBe(failure)

		expect(errorMock).toHaveBeenCalledWith("Invalid status.")
		expect(refetchCompanies).not.toHaveBeenCalled()
	})
})
