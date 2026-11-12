// src/add-os/utils/downloadSticker.ts
/**
 * The same QR sticker `printSticker` prints, saved as a PNG instead: the code
 * and the place's name under it, on white, so it can be sent to a
 * print shop or dropped into a design. Text is drawn as text on the canvas,
 * never parsed as HTML (the place name is staff-entered).
 */

export interface StickerImageOptions {
	/** The canvas a rendered `NQrCode` drew. */
	qrCanvas: HTMLCanvasElement
	/** The place the sticker marks, in bold under the code; also names the file. */
	title: string
	dir: "rtl" | "ltr"
}

/*
 * A downloaded image is a separate artefact: it cannot carry the app's CSS
 * variables or design tokens, so its colours and sizes are literal on purpose,
 * the same deliberate exception as printSticker's frame (black on white,
 * whatever the app's theme).
 */
const SIZE = 600
const PADDING = 48
const QR_SIZE = SIZE - PADDING * 2
const TITLE_PX = 34
const INK = "#111111"
const PAPER = "#ffffff"

/** A file name safe on every OS, from the place's name. */
export function stickerFileName(title: string): string {
	const safe = title.trim().replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "")
	return `qr-${safe || "sticker"}.png`
}

/** Draws the sticker and saves it; returns false when the browser cannot draw it. */
export function downloadSticker(options: StickerImageOptions): boolean {
	const canvas = document.createElement("canvas")
	canvas.width = SIZE
	canvas.height = SIZE + TITLE_PX + PADDING
	const context = canvas.getContext("2d")
	if (!context) return false

	const font = getComputedStyle(document.body).fontFamily || "sans-serif"

	context.fillStyle = PAPER
	context.fillRect(0, 0, canvas.width, canvas.height)
	context.imageSmoothingEnabled = false
	context.drawImage(options.qrCanvas, PADDING, PADDING, QR_SIZE, QR_SIZE)

	context.direction = options.dir
	context.textAlign = "center"
	context.textBaseline = "top"

	context.fillStyle = INK
	context.font = `700 ${TITLE_PX}px ${font}`
	context.fillText(options.title, SIZE / 2, PADDING + QR_SIZE + 24, SIZE - PADDING)

	const link = document.createElement("a")
	link.href = canvas.toDataURL("image/png")
	link.download = stickerFileName(options.title)
	link.click()
	return true
}
