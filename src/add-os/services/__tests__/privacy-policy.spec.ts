import { beforeEach, describe, expect, it, vi } from "vitest"
import { getPrivacyPolicy, updatePrivacyPolicy } from "../privacy-policy"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("privacy-policy service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("getPrivacyPolicy fetches via GET /api/v1/admin/privacy-policy with wrapped data", async () => {
		const sampleData = {
			data: {
				content: {
					en: "Privacy policy in English",
					ar: "سياسة الخصوصية بالعربية"
				},
				updated_at: "2026-10-15T12:00:00Z"
			}
		}

		vi.mocked(fetch).mockResolvedValue(jsonResponse(sampleData))

		const policy = await getPrivacyPolicy()

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/privacy-policy",
			expect.objectContaining({ method: "GET" })
		)
		expect(policy.content.en).toBe("Privacy policy in English")
		expect(policy.content.ar).toBe("سياسة الخصوصية بالعربية")
		expect(policy.updated_at).toBe("2026-10-15T12:00:00Z")
	})

	it("getPrivacyPolicy handles direct { content } response", async () => {
		const sampleDirect = {
			content: {
				en: "Direct English",
				ar: "مباشر عربي"
			}
		}

		vi.mocked(fetch).mockResolvedValue(jsonResponse(sampleDirect))

		const policy = await getPrivacyPolicy()

		expect(policy.content.en).toBe("Direct English")
		expect(policy.content.ar).toBe("مباشر عربي")
	})

	it("updatePrivacyPolicy sends PATCH with content payload", async () => {
		const payload = {
			en: "Updated English policy",
			ar: "سياسة محدثة بالعربية"
		}

		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Privacy policy updated successfully." }))

		const res = await updatePrivacyPolicy(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/privacy-policy",
			expect.objectContaining({
				method: "PATCH",
				body: JSON.stringify({ content: payload })
			})
		)
		expect(res.message).toBe("Privacy policy updated successfully.")
	})
})
