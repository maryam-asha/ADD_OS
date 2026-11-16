import { describe, expect, it } from "vitest"
import { custodianOf } from "../custodianFilter"

describe("custodianOf", () => {
	it("reads a custodian from its two URL keys", () => {
		expect(custodianOf("member", 3)).toEqual({ type: "member", id: 3 })
	})

	it("is none without both keys", () => {
		expect(custodianOf(null, 3)).toBeNull()
		expect(custodianOf("company", null)).toBeNull()
	})

	it("ignores a type ADD Core does not know, as a hand-edited link may carry", () => {
		expect(custodianOf("user", 3)).toBeNull()
	})
})
