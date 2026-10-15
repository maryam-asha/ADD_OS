import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import MarkdownViewer from "../MarkdownViewer.vue"

describe("MarkdownViewer", () => {
	it("renders formatted HTML from markdown string", () => {
		const wrapper = mount(MarkdownViewer, {
			props: {
				content: "# Hello ADD OS\n\n**Bold Text**"
			}
		})

		expect(wrapper.classes()).toContain("add-markdown-content")
		expect(wrapper.html()).toContain("<h1>Hello ADD OS</h1>")
		expect(wrapper.html()).toContain("<strong>Bold Text</strong>")
	})

	it("renders empty fallback text when content is empty", () => {
		const wrapper = mount(MarkdownViewer, {
			props: {
				content: "",
				emptyText: "لا يوجد محتوى"
			}
		})

		expect(wrapper.find(".add-markdown-content").exists()).toBe(false)
		expect(wrapper.text()).toBe("لا يوجد محتوى")
	})

	it("respects text direction prop", () => {
		const wrapper = mount(MarkdownViewer, {
			props: {
				content: "نص عربي بتنسيق **ماركداون**",
				dir: "rtl"
			}
		})

		expect(wrapper.attributes("dir")).toBe("rtl")
	})
})
