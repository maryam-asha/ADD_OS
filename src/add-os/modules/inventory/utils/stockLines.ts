// src/add-os/modules/inventory/utils/stockLines.ts

import type { Item, StockLine, StockOperationKind } from "@/add-os/modules/inventory/types/inventory"
import { localized } from "@/add-os/modules/inventory/utils/display"

/** One line of a stock operation as the form holds it. */
export interface LineDraft {
	itemId: number
	item: Item
	unitId: number
	/** Quantity, or for a count what was counted — in the chosen unit. */
	amount: number | null
	unitCost: number | null
}

export interface UnitChoice {
	label: string
	value: number
	/** How many main units one of it is. */
	factor: string
}

/** The item's main unit and its packs ("box (6)"). */
export function unitChoices(item: Item): UnitChoice[] {
	return [
		{ label: localized(item.unit.name), value: item.unit.id, factor: "1" },
		...(item.units ?? []).map(pack => ({ label: `${localized(pack.unit.name)} (${pack.factor})`, value: pack.unit.id, factor: pack.factor }))
	]
}

/** Adds the item in its main unit, or counts its line up by one when it is already there (a second scan). */
export function addItemLine(lines: LineDraft[], item: Item): LineDraft[] {
	const index = lines.findIndex(line => line.itemId === item.id)
	if (index >= 0) return lines.map((line, i) => (i === index ? { ...line, amount: (line.amount ?? 0) + 1 } : line))
	return [...lines, { itemId: item.id, item, unitId: item.unit.id, amount: 1, unitCost: null }]
}

const COSTED: readonly StockOperationKind[] = ["receive", "adjust"]

export function linesPayload(kind: StockOperationKind, lines: LineDraft[]): StockLine[] {
	return lines.map(line => ({
		item_id: line.itemId,
		unit_id: line.unitId,
		...(kind === "adjust" ? { counted: line.amount ?? 0 } : { quantity: line.amount ?? 0 }),
		...(COSTED.includes(kind) && line.unitCost !== null ? { unit_cost: line.unitCost } : {})
	}))
}

/** What stops the form from being sent, as an `inventory.operations` key; null when it may go. */
export function operationProblem(kind: StockOperationKind, form: { warehouse?: number | null; from?: number | null; to?: number | null; lines: LineDraft[] }): "needLine" | "sameWarehouse" | "needWarehouse" | null {
	if (kind === "transfer") {
		if (!form.from || !form.to) return "needWarehouse"
		if (form.from === form.to) return "sameWarehouse"
	} else if (!form.warehouse) {
		return "needWarehouse"
	}
	// A count may be zero (nothing left); a quantity must be more than nothing.
	const filled = (amount: number | null) => amount !== null && (kind === "adjust" ? amount >= 0 : amount > 0)
	if (!form.lines.length || !form.lines.every(line => filled(line.amount))) return "needLine"
	return null
}
