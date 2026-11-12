import { describe, expect, it } from "vitest"
import { stickerFileName } from "@/add-os/utils/downloadSticker"

describe("stickerFileName", () => {
	it("names the file after the place, safe for any OS", () => {
		expect(stickerFileName("Desk 01")).toBe("qr-Desk-01.png")
		expect(stickerFileName("غرفة 1")).toBe("qr-غرفة-1.png")
		expect(stickerFileName(" a/b:c ")).toBe("qr-a-b-c.png")
	})

	it("falls back when the place has no name", () => {
		expect(stickerFileName("   ")).toBe("qr-sticker.png")
	})
})
