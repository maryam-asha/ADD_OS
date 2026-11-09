import type { Device } from "@/add-os/modules/access/types/access"
import { mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import DeviceQrModal from "../DeviceQrModal.vue"

const i18n = createI18n({
	legacy: false,
	locale: "en",
	missingWarn: false,
	fallbackWarn: false,
	messages: {
		en: {
			accessDevices: {
				qr: { title: "Door sticker", hint: "Scan it.", download: "Download PNG", print: "Print sticker", printHint: "Scan with the ADD app to open this door.", regenerate: "New sticker" }
			}
		}
	}
})

// jsdom has no canvas: the QR is a canvas whose image is fixed here.
const stubs = {
	Modal: { template: "<div><slot /></div>" },
	QrCode: {
		mounted(this: { $el: HTMLCanvasElement }) {
			this.$el.toDataURL = () => "data:image/png;base64,QR"
		},
		template: "<canvas />"
	}
}

const device: Device = {
	id: 1,
	branch_id: 1,
	space_id: 2,
	type: "lock",
	hardware_mac: "21:C8:04:8C:02:D1",
	parent_device_id: null,
	qr_value: "sticker-value",
	external_ref: "33804038",
	metadata: null,
	status: "offline"
}

function mountModal(caption = "Room 1") {
	return mount(DeviceQrModal, {
		props: { show: true, device, caption, canRegenerate: false },
		global: { plugins: [i18n], stubs },
		attachTo: document.body
	})
}

afterEach(() => {
	document.body.innerHTML = ""
})

describe("deviceQrModal printing", () => {
	it("prints the sticker alone from a hidden frame: the QR, the room and the scan hint", async () => {
		const wrapper = mountModal()

		await wrapper.get("[data-test='sticker-print']").trigger("click")

		const frame = document.querySelector("iframe")!
		const doc = frame.contentDocument!
		const printSpy = vi.spyOn(frame.contentWindow!, "print").mockImplementation(() => {})
		const qr = doc.querySelector("img")!
		qr.dispatchEvent(new Event("load"))

		expect(qr.getAttribute("src")).toBe("data:image/png;base64,QR")
		expect(doc.querySelector(".place")?.textContent).toBe("Room 1")
		expect(doc.querySelector(".hint")?.textContent).toBe("Scan with the ADD app to open this door.")
		expect(doc.querySelector(".ref")?.textContent).toBe("#33804038")
		expect(printSpy).toHaveBeenCalledOnce()

		frame.contentWindow!.dispatchEvent(new Event("afterprint"))
		expect(document.querySelector("iframe")).toBeNull()
	})

	it("sets a staff-entered room name as text, never as markup", async () => {
		const wrapper = mountModal("<img src=x onerror=alert(1)>")

		await wrapper.get("[data-test='sticker-print']").trigger("click")

		const doc = document.querySelector("iframe")!.contentDocument!
		expect(doc.querySelectorAll("img")).toHaveLength(1)
		expect(doc.querySelector(".place")?.textContent).toBe("<img src=x onerror=alert(1)>")
	})
})
