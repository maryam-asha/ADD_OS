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
	it("a_reference_subtitle_can_stay_ltr", () => {
		printSticker({ qrCanvas: canvas(), title: "Door", subtitle: "#A1", subtitleDir: "ltr", hint: "Scan", dir: "rtl" })

		const doc = document.querySelector("iframe")!.contentDocument!
		expect(doc.querySelector(".ref")?.getAttribute("dir")).toBe("ltr")
	})

	it("a_sticker_without_a_hint_prints_no_hint_line", () => {
		printSticker({ qrCanvas: canvas(), title: "Desk 01", subtitle: "", dir: "rtl" })

		const doc = document.querySelector("iframe")!.contentDocument!
		expect(doc.querySelector(".hint")).toBeNull()
		expect(doc.querySelector(".place")?.textContent).toBe("Desk 01")
	})

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
		// The subtitle follows its own text unless told otherwise; the door sticker's reference is pinned left-to-right.
		expect(doc.querySelector(".ref")?.getAttribute("dir")).toBe("auto")
		expect(printSpy).toHaveBeenCalledOnce()

		frame.contentWindow!.dispatchEvent(new Event("afterprint"))
		expect(document.querySelector("iframe")).toBeNull()
	})
})
