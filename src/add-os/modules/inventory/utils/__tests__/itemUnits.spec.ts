import type { Unit } from "@/add-os/modules/inventory/types/inventory"
import { describe, expect, it } from "vitest"
import { packChoices, packRowsValid, packsPayload } from "../itemUnits"

const unit = (id: number, en: string): Unit => ({ id, code: en, name: { ar: en, en }, allows_fractions: false })
const units = [unit(1, "piece"), unit(2, "box"), unit(3, "carton")]

describe("item packs", () => {
	it("never offers the main unit, nor a unit already used by another row", () => {
		expect(packChoices(units, 1, [{ unitId: 2, factor: 6 }], 1).map(c => c.value)).toEqual([3])
		expect(packChoices(units, 1, [{ unitId: 2, factor: 6 }], 0).map(c => c.value)).toEqual([2, 3])
	})

	it("sends each pack as unit_id and factor", () => {
		expect(packsPayload([{ unitId: 2, factor: 6 }])).toEqual([{ unit_id: 2, factor: 6 }])
	})

	it("marks a row without a unit or with a factor of zero or less invalid", () => {
		expect(packRowsValid([{ unitId: 2, factor: 6 }])).toBe(true)
		expect(packRowsValid([{ unitId: null, factor: 6 }])).toBe(false)
		expect(packRowsValid([{ unitId: 2, factor: 0 }])).toBe(false)
		expect(packRowsValid([{ unitId: 2, factor: null }])).toBe(false)
	})
})
