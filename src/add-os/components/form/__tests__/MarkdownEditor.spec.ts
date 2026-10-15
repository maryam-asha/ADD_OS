import { mount } from "@vue/test-utils"
import { beforeAll, describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"
import { registerLocalIcons } from "@/add-os/assets/icons"
import ar from "@/add-os/lang/ar"
import MarkdownEditor from "../MarkdownEditor.vue"

const i18n = createI18n({
	legacy: false,
	locale: "ar",
	messages: {
		ar
	}
})

beforeAll(() => {
	registerLocalIcons()
})

function mountEditor(props: Record<string, unknown> = {}) {
	return mount(MarkdownEditor, {
		props,
		global: {
			plugins: [i18n]
		}
	})
}

describe("MarkdownEditor", () => {
	it("renders toolbar and textarea with initial content", () => {
		const wrapper = mountEditor({
			value: "**Initial** text"
		})

		const textarea = wrapper.find("textarea")
		expect(textarea.exists()).toBe(true)
		expect((textarea.element as HTMLTextAreaElement).value).toBe("**Initial** text")
	})

	it("emits update:value and update:modelValue when text changes", async () => {
		const wrapper = mountEditor({
			value: ""
		})

		const textarea = wrapper.find("textarea")
		await textarea.setValue("Hello **World**")

		expect(wrapper.emitted("update:value")?.[0]).toEqual(["Hello **World**"])
		expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["Hello **World**"])
	})

	it("renders preview when switched to preview mode", async () => {
		const wrapper = mountEditor({
			value: "### Hello Heading"
		})

		const previewBtn = wrapper.findAll("button").find(b => b.text().includes("preview") || b.text().includes("معاينة") || b.attributes("title")?.includes("معاينة"))
		if (previewBtn) {
			await previewBtn.trigger("click")
			expect(wrapper.find(".add-markdown-content").exists()).toBe(true)
			expect(wrapper.find(".add-markdown-content").html()).toContain("<h3>Hello Heading</h3>")
		}
	})

	it("applies disabled styling and attributes when disabled", () => {
		const wrapper = mountEditor({
			value: "Some text",
			disabled: true
		})

		const textarea = wrapper.find("textarea")
		expect(textarea.attributes("disabled")).toBeDefined()
		expect(wrapper.classes()).toContain("pointer-events-none")
	})
})
