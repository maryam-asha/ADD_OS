import { beforeEach, describe, expect, it, vi } from "vitest"
import { getTermsOfUse, updateTermsOfUse } from "../terms-of-use"

const { getMock, patchMock } = vi.hoisted(() => ({ getMock: vi.fn(), patchMock: vi.fn() }))

vi.mock("../api", () => ({ get: getMock, patch: patchMock }))

describe("terms-of-use service", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("reads both languages from data", async () => {
		getMock.mockResolvedValue({ data: { id: 1, content: { ar: "# الشروط", en: "# Terms" }, updated_at: "2026-10-15T12:00:00+00:00" } })

		await expect(getTermsOfUse()).resolves.toEqual({ content: { ar: "# الشروط", en: "# Terms" }, updated_at: "2026-10-15T12:00:00+00:00" })
		expect(getMock).toHaveBeenCalledWith("/api/v1/admin/terms-of-use")
	})

	it("starts empty before the first save", async () => {
		getMock.mockResolvedValue({ data: null })

		await expect(getTermsOfUse()).resolves.toEqual({ content: { ar: "", en: "" }, updated_at: null })
	})

	it("saves both languages under content", async () => {
		patchMock.mockResolvedValue({ message: "Updated." })

		await updateTermsOfUse({ ar: "أ", en: "a" })

		expect(patchMock).toHaveBeenCalledWith("/api/v1/admin/terms-of-use", { content: { ar: "أ", en: "a" } })
	})
})
