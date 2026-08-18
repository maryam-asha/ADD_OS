import { describe, expect, it, vi } from "vitest"
import { ApiError } from "@/add-os/services/api"

const confirmPasswordMock = vi.fn()

vi.mock("@/add-os/services/account", () => ({
	confirmPassword: (password: string) => confirmPasswordMock(password)
}))

const { usePasswordConfirmation } = await import("../usePasswordConfirmation")

describe("usePasswordConfirmation", () => {
	it("passes through a successful action untouched, without opening the modal", async () => {
		const gate = usePasswordConfirmation()
		const action = vi.fn().mockResolvedValue("ok")

		const result = await gate.withConfirmation(action)

		expect(result).toBe("ok")
		expect(gate.modalVisible.value).toBe(false)
		expect(confirmPasswordMock).not.toHaveBeenCalled()
	})

	it("re-throws a non-423 failure without opening the modal", async () => {
		const gate = usePasswordConfirmation()
		const failure = new ApiError(422, JSON.stringify({ message: "Invalid." }))
		const action = vi.fn().mockRejectedValue(failure)

		await expect(gate.withConfirmation(action)).rejects.toBe(failure)
		expect(gate.modalVisible.value).toBe(false)
	})

	it("on a 423, opens the modal and retries the action once the password is confirmed", async () => {
		const gate = usePasswordConfirmation()
		const action = vi.fn().mockRejectedValueOnce(new ApiError(423, JSON.stringify({ message: "Password confirmation required." }))).mockResolvedValueOnce("ok")
		confirmPasswordMock.mockResolvedValue(undefined)

		const pending = gate.withConfirmation(action)
		await vi.waitUntil(() => gate.modalVisible.value)

		gate.password.value = "the-password"
		await gate.submit()

		await expect(pending).resolves.toBe("ok")
		expect(confirmPasswordMock).toHaveBeenCalledWith("the-password")
		expect(gate.modalVisible.value).toBe(false)
		expect(action).toHaveBeenCalledTimes(2)
	})

	it("surfaces a wrong-password error on the modal without resolving the pending action", async () => {
		const gate = usePasswordConfirmation()
		const action = vi.fn().mockRejectedValue(new ApiError(423, JSON.stringify({ message: "Password confirmation required." })))
		confirmPasswordMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "The provided password does not match." })))

		const pending = gate.withConfirmation(action)
		await vi.waitUntil(() => gate.modalVisible.value)

		gate.password.value = "wrong"
		await gate.submit()

		expect(gate.modalVisible.value).toBe(true)
		expect(gate.confirmError.value).toBe("The provided password does not match.")

		gate.cancel()
		await expect(pending).rejects.toThrow("password-confirmation-cancelled")
	})

	it("cancelling the modal rejects the pending action", async () => {
		const gate = usePasswordConfirmation()
		const action = vi.fn().mockRejectedValue(new ApiError(423, JSON.stringify({ message: "Password confirmation required." })))

		const pending = gate.withConfirmation(action)
		await vi.waitUntil(() => gate.modalVisible.value)

		gate.cancel()

		await expect(pending).rejects.toThrow("password-confirmation-cancelled")
		expect(gate.modalVisible.value).toBe(false)
	})
})
