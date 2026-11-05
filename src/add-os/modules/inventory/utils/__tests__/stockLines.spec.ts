import type { Item } from "@/add-os/modules/inventory/types/inventory"
import { describe, expect, it } from "vitest"
import { addItemLine, linesPayload, operationProblem, unitChoices } from "../stockLines"

const piece = { id: 1, code: "pc", name: { ar: "قطعة", en: "piece" }, allows_fractions: false }
const box = { id: 2, code: "box", name: { ar: "علبة", en: "box" }, allows_fractions: false }
const water = { id: 10, sku: "ITM-00010", barcode: "6291041500213", name: { ar: "مياه" }, kind: "stock", unit: piece, units: [{ unit: box, factor: "6" }] } as unknown as Item

describe("stock lines", () => {
	it("adds a scanned item once, in its main unit, and counts it up when scanned again", () => {
		const once = addItemLine([], water)
		expect(once).toHaveLength(1)
		expect(once[0]).toMatchObject({ itemId: 10, unitId: 1, amount: 1 })

		const twice = addItemLine(once, water)
		expect(twice).toHaveLength(1)
		expect(twice[0].amount).toBe(2)
	})

	it("offers the main unit and the item's packs with their factor", () => {
		expect(unitChoices(water).map(choice => [choice.value, choice.factor])).toEqual([
			[1, "1"],
			[2, "6"]
		])
	})

	it("keeps the chosen pack unit in the payload", () => {
		const [line] = addItemLine([], water)
		const payload = linesPayload("transfer", [{ ...line, unitId: 2, amount: 3 }])
		expect(payload).toEqual([{ item_id: 10, unit_id: 2, quantity: 3 }])
	})

	it("sends a count as counted, and a cost only where one is taken", () => {
		const [line] = addItemLine([], water)
		expect(linesPayload("adjust", [{ ...line, amount: 7, unitCost: 2 }])).toEqual([{ item_id: 10, unit_id: 1, counted: 7, unit_cost: 2 }])
		expect(linesPayload("receive", [{ ...line, amount: 4, unitCost: 1.5 }])).toEqual([{ item_id: 10, unit_id: 1, quantity: 4, unit_cost: 1.5 }])
		expect(linesPayload("issue", [{ ...line, amount: 4, unitCost: 1.5 }])).toEqual([{ item_id: 10, unit_id: 1, quantity: 4 }])
	})

	it("blocks a transfer into the same warehouse and an operation with no line", () => {
		const lines = addItemLine([], water)
		expect(operationProblem("transfer", { from: 1, to: 1, lines })).toBe("sameWarehouse")
		expect(operationProblem("transfer", { from: 1, to: 2, lines })).toBeNull()
		expect(operationProblem("receive", { warehouse: 1, lines: [] })).toBe("needLine")
		expect(operationProblem("receive", { warehouse: 1, lines: [{ ...lines[0], amount: null }] })).toBe("needLine")
		expect(operationProblem("adjust", { warehouse: 1, lines: [{ ...lines[0], amount: 0 }] })).toBeNull()
	})
})
