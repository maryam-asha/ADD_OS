import type { VNode } from "vue"
import type { ComposerTranslation } from "vue-i18n"
import type { RowAction } from "@/add-os/components/page/row-actions"
import { describe, expect, it, vi } from "vitest"

import { buildRequestColumns } from "../private-office-requests.config"

const t = ((key: string) => key) as ComposerTranslation

/**
 * The cell is RowActions (2026-11-17), handed its actions as data; a quoted
 * request for a new company also carries a hint tag beside it. Returns the
 * actions by key, and whether the hint is there.
 */
function actionCell(status: "requested" | "quoted" | "contracted") {
	const onQuote = vi.fn()
	const onDelete = vi.fn()
	const columns = buildRequestColumns(t, onQuote, onDelete)
	const actionsColumn = columns.find(c => (c as { key?: string }).key === "actions")! as unknown as { render: (row: object, index: number) => VNode }
	const row = { id: 1, prospect_name: "A", contact: "a", status, quote_ref: status === "requested" ? null : "Q-1" }
	const vnode = actionsColumn.render(row, 0)
	const rowActions = (vnode.type === "div" ? (vnode.children as VNode[]).at(-1)! : vnode)
	const actions = (rowActions.props as { actions: RowAction[] }).actions
	return { actions, keys: actions.map(action => action.key), hint: vnode.type === "div" }
}

describe("buildRequestColumns actions", () => {
	it("offers quoting plus delete for a requested row", () => {
		expect(actionCell("requested").keys).toEqual(["quote", "delete"])
	})

	it("shows the next-step hint plus delete for a quoted new-company row — quoting again isn't a modeled action", () => {
		const cell = actionCell("quoted")
		expect(cell.hint).toBe(true)
		expect(cell.keys).toEqual(["delete"])
	})

	it("shows a disabled, explained lock plus delete for a contracted row — not silence, an explained block", () => {
		const cell = actionCell("contracted")
		expect(cell.keys).toEqual(["locked", "delete"])
		expect(cell.actions[0].disabled).toBe(true)
		expect(cell.actions[0].label).toBe("privateOfficeRequests.contractedLocked")
	})

	it("never shows the quote action for a contracted row", () => {
		expect(actionCell("contracted").keys).not.toContain("quote")
	})

	it("puts delete last, as a destructive action", () => {
		const { actions } = actionCell("requested")
		expect(actions.at(-1)).toMatchObject({ key: "delete", danger: true })
	})
})
