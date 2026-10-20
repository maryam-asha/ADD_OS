import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { mount } from "@vue/test-utils"
import { NTabPane, NTabs } from "naive-ui"
import { describe, expect, it } from "vitest"
import { h } from "vue"

/**
 * ADD OS — guard for tabs RTL active bar alignment in `_tabs.scss`.
 *
 * In naive-ui line-type tabs, .n-tabs-bar is absolutely positioned inside
 * .n-tabs-nav-scroll-content using `barEl.style.left = tabEl.offsetLeft`.
 * In RTL mode, because .n-tabs-wrapper was shrink-to-fit (inline-flex),
 * it was pushed to the far right inside .n-tabs-nav-scroll-content, causing
 * tabEl.offsetLeft to be measured relative to the displaced wrapper rather than
 * the scroll-content origin. As a result, the active indicator line appeared
 * far to the left instead of directly underneath the active tab.
 *
 * `_tabs.scss` sets `width: 100%` and `min-width: 100%` on .n-tabs-wrapper under
 * `.direction-rtl`, aligning wrapper.offsetLeft to 0 so that tabEl.offsetLeft
 * matches the bar's coordinate space.
 */

describe("tabs RTL theme override", () => {
	it("is registered in index.scss aggregator", () => {
		const indexScss = readFileSync(
			resolve(__dirname, "../index.scss"),
			"utf-8"
		)
		expect(indexScss).toMatch(/@import\s+["']\.\/tabs["']/)
	})

	it("defines width and min-width 100% for .n-tabs-wrapper in RTL", () => {
		const tabsScss = readFileSync(
			resolve(__dirname, "../_tabs.scss"),
			"utf-8"
		)
		expect(tabsScss).toContain(".direction-rtl")
		expect(tabsScss).toContain(".n-tabs-wrapper")
		expect(tabsScss).toMatch(/width:\s*100%/)
		expect(tabsScss).toMatch(/min-width:\s*100%/)
	})

	it("renders n-tabs with active tab and indicator bar in DOM", async () => {
		const wrapper = mount(NTabs, {
			props: {
				type: "line",
				value: "members",
				animated: true
			},
			slots: {
				default: () => [
					h(NTabPane, { name: "members", tab: "الأعضاء" }),
					h(NTabPane, { name: "leases", tab: "عقود الإيجار" }),
					h(NTabPane, { name: "manage", tab: "الإدارة" })
				]
			},
			attachTo: document.body
		})

		const scrollContent = wrapper.find(".n-tabs-nav-scroll-content")
		expect(scrollContent.exists()).toBe(true)

		const tabsWrapper = wrapper.find(".n-tabs-wrapper")
		expect(tabsWrapper.exists()).toBe(true)

		const tabs = wrapper.findAll(".n-tabs-tab")
		expect(tabs.length).toBe(3)

		// The active tab should be "members"
		const activeTab = wrapper.find(".n-tabs-tab--active")
		expect(activeTab.exists()).toBe(true)
		expect(activeTab.attributes("data-name")).toBe("members")

		// The bar element should exist inside scroll-content
		const bar = wrapper.find(".n-tabs-bar")
		expect(bar.exists()).toBe(true)

		wrapper.unmount()
	})
})
