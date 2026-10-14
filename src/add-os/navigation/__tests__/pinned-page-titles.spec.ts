import { readFileSync } from "node:fs"
import path from "node:path"
import { mount } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"
import { createMemoryHistory, createRouter } from "vue-router"
import en from "@/add-os/lang/en"
import PinnedPages from "@/app-layouts/common/Toolbar/PinnedPagesV2.vue"
import { PINNED_PAGES_FILE, rewritePinnedPageTitles } from "../pinnedPageTitles"

const VENDOR = path.resolve(__dirname, "../../../app-layouts/common/Toolbar/PinnedPagesV2.vue")

describe("pinned page titles override", () => {
	afterEach(() => {
		sessionStorage.clear()
		localStorage.clear()
	})

	it("targets the vendor file the toolbar mounts", () => {
		expect(PINNED_PAGES_FILE.test(VENDOR)).toBe(true)
	})

	it("rewrites every printed title of the real vendor file to its translation", () => {
		const rewritten = rewritePinnedPageTitles(readFileSync(VENDOR, "utf8"))

		expect(rewritten).not.toMatch(/\{\{\s*page\.title\s*\}\}/)
		expect(rewritten).toContain("{{ pageTitle(page.title) }}")
		expect(rewritten).toContain("const { t, te } = useI18n()")
	})

	it("fails loudly when the template no longer has what it rewrites", () => {
		expect(() => rewritePinnedPageTitles("<template><div /></template>")).toThrow(/add-os:pinned-page-titles/)
	})

	it("shows a remembered page by its translated name, and a plain title as is", () => {
		sessionStorage.setItem("latest-pages", JSON.stringify([
			{ name: "reports.spacesReport", fullPath: "/reports/spaces", title: "nav.pages.spacesReport" },
			{ name: "legacy", fullPath: "/legacy", title: "Legacy page" }
		]))
		const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { template: "<div />" } }] })
		const i18n = createI18n({ legacy: false, locale: "en", fallbackLocale: "en", messages: { en } })

		const wrapper = mount(PinnedPages, { global: { plugins: [router, i18n] } })

		expect(wrapper.text()).toContain("Spaces report")
		expect(wrapper.text()).not.toContain("nav.pages.spacesReport")
		expect(wrapper.text()).toContain("Legacy page")
		wrapper.unmount()
	})
})
