import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/add-os/services/api"
import { useReceptionAction } from "../useReceptionAction"

const { successMock, errorMock } = vi.hoisted(() => ({
	successMock: vi.fn(),
	errorMock: vi.fn()
}))

vi.mock("naive-ui", () => ({
	useMessage: () => ({ success: successMock, error: errorMock })
}))

vi.mock("vue-i18n", () => ({
	useI18n: () => ({
		t: (key: string) => {
			if (key === "resourceCrud.mutations.genericError") return "Something went wrong. Please try again."
			if (key === "resourceCrud.mutations.permissionError") return "You don't have permission for this action."
			return key
		}
	})
}))

describe("useReceptionAction", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("reports success, toasts, and refetches", async () => {
		const refetch = vi.fn().mockResolvedValue(undefined)
		const { run } = useReceptionAction(refetch)

		const succeeded = await run(() => Promise.resolve({ message: "Booking approved." }), "Approved.")

		expect(succeeded).toBe(true)
		expect(successMock).toHaveBeenCalledWith("Approved.")
		expect(refetch).toHaveBeenCalledOnce()
	})

	it("flags isSubmitting for the duration of the action", async () => {
		const { run, isSubmitting } = useReceptionAction(vi.fn().mockResolvedValue(undefined))

		expect(isSubmitting.value).toBe(false)
		const promise = run(() => Promise.resolve({}), "Done.")
		expect(isSubmitting.value).toBe(true)
		await promise
		expect(isSubmitting.value).toBe(false)
	})

	/**
	 * These endpoints answer 409 far more often than a CRUD screen does — a
	 * booking approved from the kiosk a second earlier, a session already paid.
	 * The server's own wording is the useful part ("This booking is not awaiting
	 * approval."), so it is surfaced verbatim rather than flattened to a generic.
	 */
	it("reports failure and toasts the server's own message on a 409", async () => {
		const refetch = vi.fn()
		const { run } = useReceptionAction(refetch)
		const failure = new ApiError(409, JSON.stringify({ message: "This booking is not awaiting approval." }))

		const succeeded = await run(() => Promise.reject(failure), "Approved.")

		expect(succeeded).toBe(false)
		expect(errorMock).toHaveBeenCalledWith("This booking is not awaiting approval.")
		expect(successMock).not.toHaveBeenCalled()
		expect(refetch).not.toHaveBeenCalled()
	})

	it("toasts the fixed permission message on a 403, never the raw backend text", async () => {
		const { run } = useReceptionAction(vi.fn())
		const failure = new ApiError(403, JSON.stringify({ message: "This action is unauthorized." }))

		await run(() => Promise.reject(failure), "Approved.")

		expect(errorMock).toHaveBeenCalledWith("You don't have permission for this action.")
		expect(errorMock).not.toHaveBeenCalledWith("This action is unauthorized.")
	})

	it("falls back to the generic message when the server sends none", async () => {
		const { run } = useReceptionAction(vi.fn())

		await run(() => Promise.reject(new ApiError(500, "")), "Approved.")

		expect(errorMock).toHaveBeenCalledWith("Something went wrong. Please try again.")
	})

	/**
	 * The same split `useResourceMutations` documents: a 422 that names fields
	 * belongs on those fields, and toasting it too would say it twice.
	 */
	it("hands a 422's field errors to the caller instead of toasting them", async () => {
		const { run } = useReceptionAction(vi.fn())
		const onFieldErrors = vi.fn()
		const failure = new ApiError(422, JSON.stringify({ message: "The given data was invalid.", errors: { rejection_reason: ["A reason is required."] } }))

		const succeeded = await run(() => Promise.reject(failure), "Rejected.", onFieldErrors)

		expect(succeeded).toBe(false)
		expect(onFieldErrors).toHaveBeenCalledWith({ rejection_reason: ["A reason is required."] })
		expect(errorMock).not.toHaveBeenCalled()
	})

	it("toasts a 422 that names no fields, since nothing on the form could show it", async () => {
		const { run } = useReceptionAction(vi.fn())
		const failure = new ApiError(422, JSON.stringify({ message: "This booking is past its cancellation window." }))

		await run(() => Promise.reject(failure), "Cancelled.", vi.fn())

		expect(errorMock).toHaveBeenCalledWith("This booking is past its cancellation window.")
	})

	it("toasts a field-naming 422 when the caller has no form to put it on", async () => {
		const { run } = useReceptionAction(vi.fn())
		const failure = new ApiError(422, JSON.stringify({ message: "The given data was invalid.", errors: { additional_minutes: ["Too long."] } }))

		await run(() => Promise.reject(failure), "Extended.")

		expect(errorMock).toHaveBeenCalledWith("The given data was invalid.")
	})

	it("lets a non-ApiError through untouched rather than swallowing it", async () => {
		const { run } = useReceptionAction(vi.fn())
		const bug = new TypeError("row is undefined")

		await expect(run(() => Promise.reject(bug), "Approved.")).rejects.toBe(bug)
		expect(errorMock).not.toHaveBeenCalled()
	})

	it("clears isSubmitting after a failure", async () => {
		const { run, isSubmitting } = useReceptionAction(vi.fn())

		await run(() => Promise.reject(new ApiError(500, "")), "Approved.")

		expect(isSubmitting.value).toBe(false)
	})
})
