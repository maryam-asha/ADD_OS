import type { FieldDescriptor } from "../field-types"

import { describe, expect, it } from "vitest"
import { buildPayload, pickLocalized } from "../field-types"

interface Widget {
	branch_id: number
	building_id: number
	label: string
}

describe("buildPayload", () => {
	const fields: FieldDescriptor<Widget>[] = [
		{ key: "branch_id", labelKey: "x.branch", type: "select", virtual: true },
		{ key: "building_id", labelKey: "x.building", type: "select" },
		{ key: "label", labelKey: "x.label", type: "text" }
	]

	it("drops virtual fields from the submitted payload", () => {
		const model: Widget = { branch_id: 1, building_id: 2, label: "A" }

		expect(buildPayload(fields, model)).toEqual({ building_id: 2, label: "A" })
	})

	it("includes every non-virtual field even when its value is falsy", () => {
		const fieldsWithSwitch: FieldDescriptor<{ is_active: boolean }>[] = [
			{ key: "is_active", labelKey: "x.active", type: "switch" }
		]

		expect(buildPayload(fieldsWithSwitch, { is_active: false })).toEqual({ is_active: false })
	})
})

describe("pickLocalized", () => {
	it("returns the Arabic half for the ar locale", () => {
		expect(pickLocalized({ ar: "الفرع الرئيسي", en: "Main Branch" }, "ar")).toBe("الفرع الرئيسي")
	})

	it("returns the English half for the en locale", () => {
		expect(pickLocalized({ ar: "الفرع الرئيسي", en: "Main Branch" }, "en")).toBe("Main Branch")
	})
})
