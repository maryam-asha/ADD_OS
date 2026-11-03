import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import PlanTemplatePicker from "../PlanTemplatePicker.vue"

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

describe("planTemplatePicker", () => {
	it("preselects monthly unlimited and emits choose", async () => {
		const wrapper = mount(PlanTemplatePicker, { props: { modelValue: null }, global: { plugins: [i18n] } })

		expect(wrapper.get("[data-test=plan-template-monthlyUnlimited]").attributes("aria-pressed")).toBe("true")
		expect(wrapper.text()).toContain("Most used")

		await wrapper.get("[data-test=plan-template-continue]").trigger("click")
		expect(wrapper.emitted("choose")?.[0]).toEqual(["monthlyUnlimited"])

		await wrapper.get("[data-test=plan-template-noSeat]").trigger("click")
		expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["noSeat"])
	})
})
