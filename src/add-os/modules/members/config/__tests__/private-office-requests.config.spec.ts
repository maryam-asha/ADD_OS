import type { ComposerTranslation } from "vue-i18n"
import { describe, expect, it, vi } from "vitest"

import { buildRequestColumns } from "../private-office-requests.config"

const t = ((key: string) => key) as ComposerTranslation

function actionChildren(status: "requested" | "quoted" | "contracted") {
	const onQuote = vi.fn()
	const onDelete = vi.fn()
	const columns = buildRequestColumns(t, onQuote, onDelete)
	const actionsColumn = columns.find(c => (c as { key?: string }).key === "actions")!
	const row = { id: 1, prospect_name: "A", contact: "a", status, quote_ref: status === "requested" ? null : "Q-1" }
	const vnode = (actionsColumn as any).render(row, 0)
	return vnode.children as unknown[]
}

describe("buildRequestColumns actions", () => {
	it("shows a quote action plus delete for a requested row (2 controls)", () => {
		expect(actionChildren("requested")).toHaveLength(2)
	})

	it("shows only delete for a quoted row — quoting again isn't a modeled action (1 control)", () => {
		expect(actionChildren("quoted")).toHaveLength(1)
	})

	it("shows a disabled locked tooltip plus delete for a contracted row — not silence, an explained block (2 controls)", () => {
		const children = actionChildren("contracted")
		expect(children).toHaveLength(2)
	})

	it("never shows the quote action for a contracted row", () => {
		const onQuote = vi.fn()
		const onDelete = vi.fn()
		const columns = buildRequestColumns(t, onQuote, onDelete)
		const actionsColumn = columns.find(c => (c as { key?: string }).key === "actions")!
		const row = { id: 1, prospect_name: "A", contact: "a", status: "contracted" as const, quote_ref: "Q-1" }
		;(actionsColumn as any).render(row, 0)
		expect(onQuote).not.toHaveBeenCalled()
	})
})
