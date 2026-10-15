import { beforeEach, describe, expect, it, vi } from "vitest"
import { getHelpSupport, updateHelpSupport } from "../help-support"

const { getMock, patchMock } = vi.hoisted(() => ({ getMock: vi.fn(), patchMock: vi.fn() }))

vi.mock("../api", () => ({ get: getMock, patch: patchMock }))

describe("help-support service", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("reads both languages from data", async () => {
		getMock.mockResolvedValue({ data: { id: 1, content: { ar: "# المساعدة", en: "# Help" }, updated_at: "2026-10-15T12:00:00+00:00" } })

		await expect(getHelpSupport()).resolves.toEqual({ content: { ar: "# المساعدة", en: "# Help" }, updated_at: "2026-10-15T12:00:00+00:00" })
		expect(getMock).toHaveBeenCalledWith("/api/v1/admin/help-support")
	})

	it("starts empty before the first save", async () => {
		getMock.mockResolvedValue({ data: null })

		await expect(getHelpSupport()).resolves.toEqual({ content: { ar: "", en: "" }, updated_at: null })
	})

	it("saves both languages under content", async () => {
		patchMock.mockResolvedValue({ message: "Updated." })

		await updateHelpSupport({ ar: "أ", en: "a" })

		expect(patchMock).toHaveBeenCalledWith("/api/v1/admin/help-support", { content: { ar: "أ", en: "a" } })
	})
})
