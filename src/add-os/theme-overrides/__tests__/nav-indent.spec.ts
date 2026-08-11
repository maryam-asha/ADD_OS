import type { MenuOption } from "naive-ui"
import { mount } from "@vue/test-utils"
import { NMenu } from "naive-ui"
import { describe, expect, it } from "vitest"
import { h } from "vue"

/**
 * ADD OS — guard for the menu indentation fix in `_nav.scss`.
 *
 * The sidebar indentation is ours, not naive-ui's: we pass `indent=0` /
 * `rootIndent=0` so naive-ui stops emitting a PHYSICAL `padding-left`
 * (which cannot mirror in RTL), then restate the indent with
 * `padding-inline-start` (which does). See RTL-REPORT.md §5.3.
 *
 * The trap this file exists to pin down: `indent=0` does NOT remove the inline
 * style. `MenuOptionContent` builds it as `paddingLeft && `${paddingLeft}px``,
 * so a computed indent of 0 yields the NUMBER 0 — falsy, but not nullish — and
 * Vue only skips null/undefined style values. The element therefore ships
 * `style="padding-left: 0px"`, an inline declaration that silently beats our
 * stylesheet on whichever side is physically left:
 *
 *   RTL → padding-inline-start maps to padding-right → no clash → indent works
 *   LTR → padding-inline-start maps to padding-left  → clash  → indent lost
 *
 * That asymmetry is exactly how it shipped: correct in Arabic, flat in English.
 * The fix is `!important` on the logical padding, which is why these
 * assertions matter — if naive-ui ever stops emitting the inline style, this
 * test fails and the `!important` can be dropped.
 */

const OPTIONS: MenuOption[] = [
	{
		key: "spatial",
		label: () => "Spatial structure",
		children: [
			{ key: "spatial-branches", label: () => h("span", "Branches") },
			{ key: "spatial-buildings", label: () => h("span", "Buildings") }
		]
	}
]

function mountMenu() {
	return mount(NMenu, {
		props: {
			options: OPTIONS,
			indent: 0,
			rootIndent: 0,
			defaultExpandedKeys: ["spatial"]
		},
		attachTo: document.body
	})
}

describe("naive-ui menu indentation", () => {
	it("still writes an inline padding-left even when indent is 0", () => {
		const wrapper = mountMenu()
		const contents = wrapper.findAll(".n-menu-item-content")

		expect(contents.length).toBeGreaterThan(0)

		for (const content of contents) {
			// `style` is the attribute as rendered, so this asserts the inline
			// declaration is present — not merely that the computed value is 0.
			expect(content.attributes("style")).toContain("padding-left")
		}

		wrapper.unmount()
	})

	it("writes it on nested items too, so every depth needs the override", () => {
		const wrapper = mountMenu()
		const nested = wrapper.findAll(".n-submenu-children .n-menu-item-content")

		expect(nested.length).toBeGreaterThan(0)
		for (const content of nested) {
			expect(content.attributes("style")).toContain("padding-left: 0px")
		}

		wrapper.unmount()
	})

	it("keeps the horizontal mode free of it, which is why only the vertical menu is patched", () => {
		// `use-menu-child.mjs` returns undefined for paddingLeft in horizontal
		// mode, so Vue omits the declaration and no override is needed there.
		const wrapper = mount(NMenu, {
			props: { options: OPTIONS, mode: "horizontal", indent: 0, rootIndent: 0 },
			attachTo: document.body
		})

		const content = wrapper.find(".n-menu-item-content")

		expect(content.exists()).toBe(true)
		expect(content.attributes("style") ?? "").not.toContain("padding-left")

		wrapper.unmount()
	})
})
