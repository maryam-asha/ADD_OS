import type { Kiosk } from "@/add-os/modules/spatial/types/kiosk"
import { mount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import KioskPairingCodeModal from "../KioskPairingCodeModal.vue"

const { copyMock } = vi.hoisted(() => ({ copyMock: vi.fn() }))

vi.mock("@vueuse/core", async importOriginal => {
	const { ref } = await import("vue")
	return {
		...await importOriginal<typeof import("@vueuse/core")>(),
		useClipboard: () => ({ copy: copyMock, copied: ref(false) })
	}
})

const i18n = createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: {} } })

const issued = { pairing_code: "MDAUCU97", expires_at: "2026-11-07T10:10:00+00:00" }

function kiosk(overrides: Partial<Kiosk> = {}): Kiosk {
	return { id: 3, name: "Main entrance", space_id: 9, is_active: true, is_paired: false, paired_at: null, last_used_at: null, created_at: null, ...overrides }
}

function mountModal(row: Kiosk) {
	return mount(KioskPairingCodeModal, {
		props: { show: true, kiosk: row, issued },
		global: {
			plugins: [i18n],
			// The real modal teleports to the body; naive-ui names it "Modal".
			stubs: { Modal: { template: "<div><slot /></div>" }, Icon: true }
		}
	})
}

describe("kiosk pairing code modal", () => {
	it("shows the code left to right, so it reads the same in Arabic", () => {
		const code = mountModal(kiosk()).find("[data-testid='kiosk-pairing-code']")

		expect(code.text()).toBe("MDAUCU97")
		expect(code.attributes("dir")).toBe("ltr")
	})

	it("copies the code", async () => {
		await mountModal(kiosk()).find("[data-testid='kiosk-pairing-copy']").trigger("click")

		expect(copyMock).toHaveBeenCalledWith("MDAUCU97")
	})

	it("warns that using the code cuts off the device paired now", () => {
		expect(mountModal(kiosk({ is_paired: true })).find("[data-testid='kiosk-pairing-replaces']").exists()).toBe(true)
		expect(mountModal(kiosk()).find("[data-testid='kiosk-pairing-replaces']").exists()).toBe(false)
	})
})
