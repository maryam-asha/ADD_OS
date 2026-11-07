// src/add-os/modules/inventory/utils/stockLines.ts

import type { CostMethod, Item, StockLine, StockOperationKind } from "@/add-os/modules/inventory/types/inventory"
import { localized, quantity } from "@/add-os/modules/inventory/utils/display"

/** One line of a stock operation as the form holds it. */
export interface LineDraft {
	itemId: number
	item: Item
	unitId: number
	/** Quantity, or for a count what was counted — in the chosen unit. */
	amount: number | null
	unitCost: number | null
	/** A note on this line ("two cartons dented"). */
	note?: string
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

/** Whether a line's cost is sent: a count may price stock found beyond the book; a receipt only when its costs are entered. */
function sendsCost(kind: StockOperationKind, costMethod: CostMethod | undefined): boolean {
	return kind === "adjust" || (kind === "receive" && costMethod !== "average")
}

export function linesPayload(kind: StockOperationKind, lines: LineDraft[], costMethod?: CostMethod): StockLine[] {
	return lines.map(line => ({
		item_id: line.itemId,
		unit_id: line.unitId,
		...(kind === "adjust" ? { counted: line.amount ?? 0 } : { quantity: line.amount ?? 0 }),
		...(sendsCost(kind, costMethod) && line.unitCost !== null ? { unit_cost: line.unitCost } : {}),
		...(line.note?.trim() ? { note: line.note.trim() } : {})
	}))
}

function factorOf(line: LineDraft): number {
	return Number(unitChoices(line.item).find(choice => choice.value === line.unitId)?.factor ?? 1)
}

/** What the line comes to in the item's main unit, as a number. */
export function mainAmount(line: LineDraft): number {
	return (line.amount ?? 0) * factorOf(line)
}

/** What the line comes to in the item's main unit, for display (2 boxes of 6 → "12"). */
export function mainQuantity(line: LineDraft): string {
	return quantity(String(mainAmount(line)))
}

/** What the line is worth at the cost typed per chosen unit. */
export function lineValue(line: LineDraft): string {
	return quantity(String((line.amount ?? 0) * (line.unitCost ?? 0)))
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
