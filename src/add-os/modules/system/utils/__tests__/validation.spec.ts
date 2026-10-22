import { describe, expect, it } from "vitest"
import { isValidPassword } from "../validation"

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
