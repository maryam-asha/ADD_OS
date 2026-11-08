import { describe, expect, it } from "vitest"
import { attachmentName, attachmentProblem } from "../attachments"

const file = (type: string, size: number) => ({ type, size }) as File

describe("attachments", () => {
	it("takes the server's image types and a PDF up to 2 MB", () => {
		expect(attachmentProblem(file("application/pdf", 2 * 1024 * 1024))).toBeNull()
		expect(attachmentProblem(file("image/webp", 1000))).toBeNull()
		expect(attachmentProblem(file("image/heic", 1000))).toBe("attachmentType")
		expect(attachmentProblem(file("application/zip", 1000))).toBe("attachmentType")
		expect(attachmentProblem(file("application/pdf", 2 * 1024 * 1024 + 1))).toBe("attachmentTooLarge")
	})

	it("names a stored attachment by the end of its URL", () => {
		expect(attachmentName("/storage/uploads/inventory/aB3x.pdf")).toBe("aB3x.pdf")
		expect(attachmentName("https://cdn.example.test/a/b.png?x=1")).toBe("b.png")
	})
})
