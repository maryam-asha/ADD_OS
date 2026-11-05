import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { COLUMN, tableWidth } from "../display"

const overrides = resolve(__dirname, "../../../../theme-overrides")

describe("inventory table columns", () => {
	it("scrolls a table at the sum of its columns' least widths", () => {
		expect(tableWidth([COLUMN.code, COLUMN.name, COLUMN.place, COLUMN.status])).toBe(140 + 220 + 280 + 130)
		expect(tableWidth([{ width: "120" }, { minWidth: 80 }, {}])).toBe(200)
	})

	it("fixes the columns of short values and lets the ones that use room grow", () => {
		for (const fixed of [COLUMN.code, COLUMN.status, COLUMN.date, COLUMN.dateTime, COLUMN.money, COLUMN.quantity, COLUMN.count, COLUMN.flag, COLUMN.actions, COLUMN.person]) {
			expect(fixed).toHaveProperty("width")
			expect(fixed).not.toHaveProperty("minWidth")
		}
		for (const growing of [COLUMN.name, COLUMN.place, COLUMN.text]) {
			expect(growing).toHaveProperty("minWidth")
			expect(growing).not.toHaveProperty("width")
		}
	})

	it("cuts a place or a free text at its column, the whole of it on hover", () => {
		for (const cut of [COLUMN.place, COLUMN.person, COLUMN.text]) expect(cut.ellipsis).toEqual({ tooltip: true })
	})

	it("lines numbers up at the cell's logical end, through a class the override layer styles", () => {
		for (const end of [COLUMN.money, COLUMN.quantity, COLUMN.count]) expect(end.className).toBe("add-col-end")
		const scss = readFileSync(resolve(overrides, "_table-columns.scss"), "utf8")
		expect(scss).toMatch(/\.n-data-table \.n-data-table-td\.add-col-end/)
		expect(scss).toMatch(/text-align:\s*end/)
		expect(readFileSync(resolve(overrides, "index.scss"), "utf8")).toMatch(/@import "\.\/table-columns";/)
	})
})
