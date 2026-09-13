import { beforeEach, describe, expect, it, vi } from "vitest"
import { uploadMedia } from "../media"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

describe("media service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("uploadMedia POSTs file to /api/v1/admin/media/upload and returns URL", async () => {
		const mockResponse = {
			url: "/storage/uploads/sample.webp",
			path: "uploads/sample.webp",
			name: "sample.png",
			size: 1024,
			mime: "image/webp"
		}
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify(mockResponse), { status: 201, headers: { "content-type": "application/json" } })
		)

		const file = new File(["dummy content"], "sample.png", { type: "image/png" })
		const result = await uploadMedia(file)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/media/upload",
			expect.objectContaining({ method: "POST" })
		)
		expect(result).toEqual(mockResponse)
	})

	it("uploadMedia includes folder in FormData when provided", async () => {
		const mockResponse = {
			url: "/storage/uploads/events/event.webp",
			path: "uploads/events/event.webp",
			name: "event.png",
			size: 2048,
			mime: "image/webp"
		}
		let capturedBody: FormData | undefined
		vi.mocked(fetch).mockImplementation(async (_url, init) => {
			capturedBody = init?.body as FormData
			return new Response(JSON.stringify(mockResponse), { status: 201, headers: { "content-type": "application/json" } })
		})

		const file = new File(["event banner"], "event.png", { type: "image/png" })
		const result = await uploadMedia(file, "events")

		expect(capturedBody).toBeInstanceOf(FormData)
		expect(capturedBody?.get("folder")).toBe("events")
		expect(capturedBody?.get("file")).toBe(file)
		expect(result).toEqual(mockResponse)
	})
})
