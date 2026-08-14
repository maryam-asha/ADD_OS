import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/add-os/services/api"
import { useResourceMutations } from "../useResourceMutations"

const { successMock, errorMock } = vi.hoisted(() => ({
	successMock: vi.fn(),
	errorMock: vi.fn()
}))

vi.mock("naive-ui", () => ({
	useMessage: () => ({ success: successMock, error: errorMock })
}))

vi.mock("vue-i18n", () => ({
	useI18n: () => ({ t: (key: string) => (key === "resourceCrud.mutations.genericError" ? "Something went wrong. Please try again." : key) })
}))

const MESSAGES = { createSuccess: "Created.", updateSuccess: "Updated.", deleteSuccess: "Deleted." }

describe("useResourceMutations", () => {
	// The brief's mock spies (successMock/errorMock) are module-scoped so call
	// history survives across tests unless reset here — otherwise a later
	// "not.toHaveBeenCalled()" assertion sees leftover calls from earlier cases.
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("create() calls the api, toasts success, and refetches", async () => {
		const api = { create: vi.fn().mockResolvedValue({ id: 1 }), update: vi.fn(), remove: vi.fn() }
		const refetch = vi.fn().mockResolvedValue(undefined)
		const { create, isSubmitting } = useResourceMutations(api, refetch, MESSAGES)

		const promise = create({ label: "A" })
		expect(isSubmitting.value).toBe(true)
		await promise

		expect(api.create).toHaveBeenCalledWith({ label: "A" })
		expect(refetch).toHaveBeenCalledOnce()
		expect(successMock).toHaveBeenCalledWith("Created.")
		expect(isSubmitting.value).toBe(false)
	})

	it("update() calls the api, toasts success, and refetches (never merges the response)", async () => {
		const api = { create: vi.fn(), update: vi.fn().mockResolvedValue({ message: "Updated." }), remove: vi.fn() }
		const refetch = vi.fn().mockResolvedValue(undefined)
		const { update } = useResourceMutations(api, refetch, MESSAGES)

		await update(1, { label: "B" })

		expect(api.update).toHaveBeenCalledWith(1, { label: "B" })
		expect(refetch).toHaveBeenCalledOnce()
		expect(successMock).toHaveBeenCalledWith("Updated.")
	})

	it("remove() calls the api, toasts success, and refetches", async () => {
		const api = { create: vi.fn(), update: vi.fn(), remove: vi.fn().mockResolvedValue({ message: "Deleted." }) }
		const refetch = vi.fn().mockResolvedValue(undefined)
		const { remove } = useResourceMutations(api, refetch, MESSAGES)

		await remove(1)

		expect(api.remove).toHaveBeenCalledWith(1)
		expect(refetch).toHaveBeenCalledOnce()
		expect(successMock).toHaveBeenCalledWith("Deleted.")
	})

	it("on a non-422 ApiError, toasts the server message and does not refetch", async () => {
		const failure = new ApiError(403, JSON.stringify({ message: "This action is unauthorized." }))
		const api = { create: vi.fn().mockRejectedValue(failure), update: vi.fn(), remove: vi.fn() }
		const refetch = vi.fn()
		const { create } = useResourceMutations(api, refetch, MESSAGES)

		// create() re-throws after toasting (so the caller knows the mutation failed) —
		// assert the rejection explicitly so a future regression that dropped the
		// rethrow (leaving only the toast) would fail this test, not slip through.
		await expect(create({ label: "A" })).rejects.toBe(failure)

		expect(errorMock).toHaveBeenCalledWith("This action is unauthorized.")
		expect(refetch).not.toHaveBeenCalled()
	})

	it("on a non-422 ApiError with no server message, toasts the generic fallback", async () => {
		const failure = new ApiError(500, "")
		const api = { create: vi.fn().mockRejectedValue(failure), update: vi.fn(), remove: vi.fn() }
		const { create } = useResourceMutations(api, vi.fn(), MESSAGES)

		await expect(create({ label: "A" })).rejects.toBe(failure)

		expect(errorMock).toHaveBeenCalledWith("Something went wrong. Please try again.")
	})

	it("on a 422 ApiError, re-throws it (for the drawer to map onto form fields) without toasting", async () => {
		const failure = new ApiError(
			422,
			JSON.stringify({ message: "The given data was invalid.", errors: { label: ["Required."] } })
		)
		const api = { create: vi.fn().mockRejectedValue(failure), update: vi.fn(), remove: vi.fn() }
		const { create } = useResourceMutations(api, vi.fn(), MESSAGES)

		await expect(create({ label: "" })).rejects.toBe(failure)
		expect(errorMock).not.toHaveBeenCalled()
	})

	it("resets isSubmitting after a failure", async () => {
		const failure = new ApiError(500, "")
		const api = { create: vi.fn().mockRejectedValue(failure), update: vi.fn(), remove: vi.fn() }
		const { create, isSubmitting } = useResourceMutations(api, vi.fn(), MESSAGES)

		await expect(create({ label: "A" })).rejects.toBe(failure)

		expect(isSubmitting.value).toBe(false)
	})
})
