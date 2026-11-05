// src/add-os/modules/inventory/utils/itemUnits.ts

import type { SelectOption } from "naive-ui"
import type { Unit } from "@/add-os/modules/inventory/types/inventory"
import { localized } from "@/add-os/modules/inventory/utils/display"

/** One of an item's packs as the form holds it: how many main units one `unitId` holds. */
export interface PackRow {
	unitId: number | null
	factor: number | null
}

/** The units row `index` may choose: never the main unit, nor one another row already uses. */
export function packChoices(units: Unit[], mainUnitId: number | null, rows: PackRow[], index: number): SelectOption[] {
	const taken = new Set(rows.filter((_, i) => i !== index).map(row => row.unitId))
	return units.filter(unit => unit.id !== mainUnitId && !taken.has(unit.id)).map(unit => ({ label: localized(unit.name), value: unit.id }))
}

export function packRowsValid(rows: PackRow[]): boolean {
	return rows.every(row => row.unitId !== null && row.factor !== null && row.factor > 0)
}

export function packsPayload(rows: PackRow[]): { unit_id: number; factor: number }[] {
	return rows.filter(row => row.unitId !== null && row.factor !== null).map(row => ({ unit_id: row.unitId!, factor: row.factor! }))
}
