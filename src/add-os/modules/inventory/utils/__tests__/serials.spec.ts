import { describe, expect, it } from "vitest"
import { errorsWithoutLine, resizeSerials, serialErrorKey, serialPayload } from "../serials"

describe("serials", () => {
	it("grows with the count, keeping what was typed", () => {
		expect(resizeSerials(["a"], 3)).toEqual(["a", "", ""])
	})

	it("shrinks with the count, dropping the last units", () => {
		expect(resizeSerials(["a", "b", "c"], 2)).toEqual(["a", "b"])
	})

	it("keeps one field for an empty or zero count", () => {
		expect(resizeSerials([], 0)).toEqual([""])
		expect(resizeSerials(["a", "b"], Number.NaN)).toEqual(["a"])
	})

	it("keeps what was typed while the count field is being retyped (cleared)", () => {
		expect(resizeSerials(["a", "b", "c"], null)).toEqual(["a", "b", "c"])
	})

	it("drops a removed line's errors and moves the later lines' errors up with them", () => {
		const errors = {
			"lines.0.serial_numbers.1": "taken",
			"lines.1.serial_number": "repeated",
			"lines.2.serial_numbers.0": "taken",
			currency: "needed"
		}
		expect(errorsWithoutLine(errors, 1)).toEqual({
			"lines.0.serial_numbers.1": "taken",
			"lines.1.serial_numbers.0": "taken",
			currency: "needed"
		})
	})

	it("sends one serial for a line of one", () => {
		expect(serialPayload([" S-1 "])).toEqual({ serial_number: "S-1" })
	})

	it("sends a serial per unit for several, blank as not known yet", () => {
		expect(serialPayload(["A", " ", " C "])).toEqual({ serial_numbers: ["A", null, "C"] })
	})

	it("sends nothing when no serial is known", () => {
		expect(serialPayload([""])).toEqual({})
		expect(serialPayload(["", "  "])).toEqual({})
	})

	it("names a unit's field as the API reports it", () => {
		expect(serialErrorKey(2, 0)).toBe("lines.2.serial_numbers.0")
	})
})
