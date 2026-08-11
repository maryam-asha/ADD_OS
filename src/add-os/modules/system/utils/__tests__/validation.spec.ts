import { describe, expect, it } from "vitest"
import { isValidPassword, isValidSyrianPhone } from "../validation"

describe("isValidSyrianPhone", () => {
	it.each([
		["0988877766", true],
		["0912345678", true],
		["09123456", false], // too short
		["091234567890", false], // too long
		["+963988877766", false], // international prefix not accepted, matches backend
		["0888877766", false], // must start with 09
		["", false]
	])("treats %s as valid=%s", (phone, expected) => {
		expect(isValidSyrianPhone(phone)).toBe(expected)
	})
})

describe("isValidPassword", () => {
	it.each([
		["short7x", false], // 7 chars
		["exactly8", true], // 8 chars
		["a-longer-password", true],
		["", false]
	])("treats %s as valid=%s", (password, expected) => {
		expect(isValidPassword(password)).toBe(expected)
	})
})
