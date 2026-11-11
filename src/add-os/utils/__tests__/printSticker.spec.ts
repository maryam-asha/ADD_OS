import { afterEach, describe, expect, it, vi } from "vitest"
import { printSticker } from "../printSticker"

afterEach(() => {
	document.body.innerHTML = ""
})

function canvas(): HTMLCanvasElement {
	const el = document.createElement("canvas")
	el.toDataURL = () => "data:image/png;base64,QR"
	return el
}

describe("printSticker", () => {
	it("printSticker_sets_text_not_html", () => {
		const hostile = "<img src=x onerror=alert(1)>"
		printSticker({ qrCanvas: canvas(), title: hostile, subtitle: hostile, hint: hostile, dir: "rtl" })

		const frame = document.querySelector("iframe")!
		const doc = frame.contentDocument!
		const printSpy = vi.spyOn(frame.contentWindow!, "print").mockImplementation(() => {})
		doc.querySelector("img")!.dispatchEvent(new Event("load"))

		expect(doc.querySelectorAll("img")).toHaveLength(1)
		expect(doc.querySelector(".place")?.textContent).toBe(hostile)
		expect(doc.querySelector(".hint")?.textContent).toBe(hostile)
		expect(doc.querySelector(".ref")?.textContent).toBe(hostile)
		expect(doc.documentElement.dir).toBe("rtl")
		expect(printSpy).toHaveBeenCalledOnce()

		frame.contentWindow!.dispatchEvent(new Event("afterprint"))
		expect(document.querySelector("iframe")).toBeNull()
	})
})
