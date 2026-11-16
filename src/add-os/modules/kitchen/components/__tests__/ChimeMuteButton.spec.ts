import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"
import { useChimeMute } from "@/add-os/composables/useNewArrivalChime"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import ChimeMuteButton from "../ChimeMuteButton.vue"

function mountButton(locale: "en" | "ar" = "en") {
	const i18n = createI18n({ legacy: false, locale, messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	return mount(ChimeMuteButton, { global: { plugins: [i18n] } })
}

describe("chimeMuteButton", () => {
	beforeEach(() => {
		useChimeMute().muted.value = false
	})

	afterEach(() => {
		useChimeMute().muted.value = false
		localStorage.clear()
	})

	it("mutes_and_unmutes_the_chime", async () => {
		const wrapper = mountButton()
		const button = wrapper.get("[data-test=chime-mute]")
		expect(button.attributes("aria-pressed")).toBe("false")
		expect(button.attributes("aria-label")).toBe(en.kitchen.chime.mute)

		await button.trigger("click")
		expect(useChimeMute().muted.value).toBe(true)
		expect(button.attributes("aria-pressed")).toBe("true")
		expect(button.attributes("aria-label")).toBe(en.kitchen.chime.unmute)

		await button.trigger("click")
		expect(useChimeMute().muted.value).toBe(false)
		wrapper.unmount()
	})

	it("labels_in_arabic", () => {
		const wrapper = mountButton("ar")
		expect(wrapper.get("[data-test=chime-mute]").attributes("aria-label")).toBe(ar.kitchen.chime.mute)
		wrapper.unmount()
	})
})
