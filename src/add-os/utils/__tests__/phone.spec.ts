import { describe, expect, it } from "vitest"
import { isValidPhone, toInternationalPhone } from "../phone"

describe("toInternationalPhone", () => {
	it.each([
		["0991234567", "+963991234567"], // Syrian local mobile
		["+963991234567", "+963991234567"], // already international
		["00963991234567", "+963991234567"], // 00 for +
		["099 123 4567", "+963991234567"],
		["+963-99-123-4567", "+963991234567"],
		["(099) 123.4567", "+963991234567"],
		["٠٩٩١٢٣٤٥٦٧", "+963991234567"], // Arabic-Indic digits
		["۰۹۹۱۲۳۴۵۶۷", "+963991234567"], // Extended Arabic-Indic digits
		["\u200E+963991234567", "+963991234567"], // a direction mark pasted with it
		["+14155550123", "+14155550123"], // another country is left alone
		["0888877766", "0888877766"], // not a Syrian mobile: not guessed at
		["", ""]
	])("turns %j into %j", (input, expected) => {
		expect(toInternationalPhone(input)).toBe(expected)
	})
})

describe("isValidPhone", () => {
	it.each([
		["+963991234567", true],
		["0991234567", true], // sent as +963991234567
		["00963991234567", true],
		["+14155550123", true],
		["+0991234567", false], // a country code never starts with 0
		["963991234567", false], // no + and no 00: the country code is a guess
		["09123456", false], // too short for a local mobile
		["0888877766", false], // local, but not a mobile
		["+1234567890123456", false], // longer than 15 digits
		["+96399abc4567", false],
		["", false]
	])("treats %j as valid=%s", (input, expected) => {
		expect(isValidPhone(input)).toBe(expected)
	})
})
