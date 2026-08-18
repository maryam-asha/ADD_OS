import { describe, expect, it, vi } from "vitest"
import { ApiError } from "@/add-os/services/api"

const accountMocks = {
	enableTwoFactorAuthentication: vi.fn(),
	getTwoFactorQrCode: vi.fn(),
	confirmTwoFactorAuthentication: vi.fn(),
	getTwoFactorRecoveryCodes: vi.fn(),
	regenerateTwoFactorRecoveryCodes: vi.fn(),
	disableTwoFactorAuthentication: vi.fn()
}

vi.mock("@/add-os/services/account", () => accountMocks)

const { useTwoFactorAuth } = await import("../useTwoFactorAuth")

/** A passthrough gate — these tests aren't about the confirm-password dance, `usePasswordConfirmation.spec.ts` owns that. */
const passthroughGate = <T>(action: () => Promise<T>) => action()

describe("useTwoFactorAuth", () => {
	it("loadStatus reports disabled when the QR probe returns an empty array (live-observed shape)", async () => {
		accountMocks.getTwoFactorQrCode.mockResolvedValue(null)
		const twoFactor = useTwoFactorAuth(passthroughGate)

		await twoFactor.loadStatus()

		expect(twoFactor.phase.value).toBe("disabled")
		expect(twoFactor.qrSvg.value).toBeNull()
		expect(twoFactor.recoveryCodes.value).toEqual([])
	})

	it("loadStatus reports active and fetches recovery codes when a secret exists", async () => {
		accountMocks.getTwoFactorQrCode.mockResolvedValue("<svg>...</svg>")
		accountMocks.getTwoFactorRecoveryCodes.mockResolvedValue(["code-1", "code-2"])
		const twoFactor = useTwoFactorAuth(passthroughGate)

		await twoFactor.loadStatus()

		expect(twoFactor.phase.value).toBe("active")
		expect(twoFactor.qrSvg.value).toBe("<svg>...</svg>")
		expect(twoFactor.recoveryCodes.value).toEqual(["code-1", "code-2"])
	})

	it("enable calls the service through the gate and reloads status", async () => {
		accountMocks.enableTwoFactorAuthentication.mockResolvedValue(undefined)
		accountMocks.getTwoFactorQrCode.mockResolvedValue("<svg>...</svg>")
		accountMocks.getTwoFactorRecoveryCodes.mockResolvedValue(["code-1"])
		const twoFactor = useTwoFactorAuth(passthroughGate)

		await twoFactor.enable()

		expect(accountMocks.enableTwoFactorAuthentication).toHaveBeenCalled()
		expect(twoFactor.phase.value).toBe("active")
	})

	it("confirm returns true and reloads status on success", async () => {
		accountMocks.confirmTwoFactorAuthentication.mockResolvedValue(undefined)
		accountMocks.getTwoFactorQrCode.mockResolvedValue("<svg>...</svg>")
		accountMocks.getTwoFactorRecoveryCodes.mockResolvedValue([])
		const twoFactor = useTwoFactorAuth(passthroughGate)

		const result = await twoFactor.confirm("123456")

		expect(result).toBe(true)
		expect(accountMocks.confirmTwoFactorAuthentication).toHaveBeenCalledWith("123456")
	})

	it("confirm returns false and surfaces the field error on a 422 (live-observed shape)", async () => {
		accountMocks.confirmTwoFactorAuthentication.mockRejectedValue(
			new ApiError(422, JSON.stringify({ message: "Invalid.", errors: { code: ["The provided two factor authentication code was invalid."] } }))
		)
		const twoFactor = useTwoFactorAuth(passthroughGate)

		const result = await twoFactor.confirm("000000")

		expect(result).toBe(false)
		expect(twoFactor.confirmCodeError.value).toBe("The provided two factor authentication code was invalid.")
	})

	it("confirm re-throws a non-422 failure", async () => {
		const failure = new ApiError(500, JSON.stringify({ message: "Server error." }))
		accountMocks.confirmTwoFactorAuthentication.mockRejectedValue(failure)
		const twoFactor = useTwoFactorAuth(passthroughGate)

		await expect(twoFactor.confirm("123456")).rejects.toBe(failure)
	})

	it("regenerateRecoveryCodes calls regenerate then re-fetches the new codes (live-confirmed: regenerate itself returns nothing)", async () => {
		accountMocks.regenerateTwoFactorRecoveryCodes.mockResolvedValue(undefined)
		accountMocks.getTwoFactorRecoveryCodes.mockResolvedValue(["fresh-1", "fresh-2"])
		const twoFactor = useTwoFactorAuth(passthroughGate)

		await twoFactor.regenerateRecoveryCodes()

		expect(accountMocks.regenerateTwoFactorRecoveryCodes).toHaveBeenCalled()
		expect(twoFactor.recoveryCodes.value).toEqual(["fresh-1", "fresh-2"])
	})

	it("disable clears local state without re-probing the API", async () => {
		accountMocks.disableTwoFactorAuthentication.mockResolvedValue(undefined)
		const twoFactor = useTwoFactorAuth(passthroughGate)
		twoFactor.phase.value = "active"
		twoFactor.qrSvg.value = "<svg>...</svg>"
		twoFactor.recoveryCodes.value = ["code-1"]

		await twoFactor.disable()

		expect(twoFactor.phase.value).toBe("disabled")
		expect(twoFactor.qrSvg.value).toBeNull()
		expect(twoFactor.recoveryCodes.value).toEqual([])
	})
})
