// src/add-os/utils/printSticker.ts
/**
 * A QR sticker alone on a page, printed from a hidden frame so the dashboard
 * itself is not what prints. Every text is set as text, never parsed as HTML:
 * the place name is staff-entered.
 */

export interface StickerOptions {
	/** The canvas a rendered `NQrCode` drew. */
	qrCanvas: HTMLCanvasElement
	/** The place the sticker marks, in bold under the code. */
	title: string
	/** A small reference line below the hint; may be empty. */
	subtitle: string
	/** What the person holding the phone should do. */
	hint: string
	dir: "rtl" | "ltr"
}

const STICKER_CSS = `
	@page { size: auto; margin: 12mm; }
	html, body { margin: 0; background: #fff; color: #111; font-family: system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif; }
	.sticker { box-sizing: border-box; width: 80mm; margin: 0 auto; padding: 8mm 6mm; border: 0.4mm dashed #999; border-radius: 4mm; text-align: center; }
	.sticker img { display: block; width: 62mm; height: 62mm; margin: 0 auto; image-rendering: pixelated; }
	.place { margin: 5mm 0 2mm; font-size: 15pt; font-weight: 700; }
	.hint { margin: 0; font-size: 9pt; color: #444; }
	.ref { margin: 3mm 0 0; font-size: 7pt; color: #888; direction: ltr; }
`

export function printSticker(opts: StickerOptions): void {
	const image = opts.qrCanvas.toDataURL("image/png")

	const frame = document.createElement("iframe")
	frame.setAttribute("aria-hidden", "true")
	frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;"
	document.body.appendChild(frame)

	const doc = frame.contentDocument
	const view = frame.contentWindow
	if (!doc || !view) {
		frame.remove()
		return
	}

	doc.open()
	doc.write("<!doctype html><html><head><meta charset=\"utf-8\"></head><body></body></html>")
	doc.close()
	doc.documentElement.lang = opts.dir === "rtl" ? "ar" : "en"
	doc.documentElement.dir = opts.dir
	doc.title = opts.title

	const style = doc.createElement("style")
	style.textContent = STICKER_CSS
	doc.head.appendChild(style)

	const card = doc.createElement("div")
	card.className = "sticker"
	const qr = doc.createElement("img")
	qr.alt = opts.title
	const place = doc.createElement("p")
	place.className = "place"
	place.textContent = opts.title
	const hint = doc.createElement("p")
	hint.className = "hint"
	hint.textContent = opts.hint
	const ref = doc.createElement("p")
	ref.className = "ref"
	ref.textContent = opts.subtitle
	card.append(qr, place, hint, ref)
	doc.body.appendChild(card)

	view.addEventListener("afterprint", () => frame.remove(), { once: true })
	qr.addEventListener("load", () => {
		view.focus()
		view.print()
	}, { once: true })
	qr.src = image
}
