import type { RowAction } from "../row-actions"
import { describe, expect, it } from "vitest"
import { INLINE_ACTION_LIMIT, splitRowActions } from "../row-actions"

/** The one row layout every table shares (docs/UI-PATTERNS.md §Row actions). */

function action(key: string, danger = false): RowAction {
	return { key, label: key, icon: "carbon:edit", onClick: () => {}, danger }
}

describe("splitRowActions", () => {
	it("shows up to two ordinary actions inline", () => {
		const { inline, menu } = splitRowActions([action("edit"), action("status")])
		expect(inline.map(a => a.key)).toEqual(["edit", "status"])
		expect(menu).toEqual([])
		expect(INLINE_ACTION_LIMIT).toBe(2)
	})

	it("folds the third ordinary action and beyond into the menu, in order", () => {
		const { inline, menu } = splitRowActions([action("edit"), action("status"), action("amenities"), action("qr")])
		expect(inline.map(a => a.key)).toEqual(["edit", "status"])
		expect(menu.map(a => a.key)).toEqual(["amenities", "qr"])
	})

	it("never shows a destructive action inline, even when there is room", () => {
		const { inline, menu } = splitRowActions([action("edit"), action("delete", true)])
		expect(inline.map(a => a.key)).toEqual(["edit"])
		expect(menu.map(a => a.key)).toEqual(["delete"])
	})

	it("puts destructive actions last in the menu, whatever order they came in", () => {
		const { menu } = splitRowActions([action("delete", true), action("edit"), action("status"), action("archive"), action("revoke", true)])
		expect(menu.map(a => a.key)).toEqual(["archive", "delete", "revoke"])
	})

	it("returns nothing for a row with no actions", () => {
		expect(splitRowActions([])).toEqual({ inline: [], menu: [] })
	})
})
