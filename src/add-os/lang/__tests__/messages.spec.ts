import { describe, expect, it } from "vitest"
import ar from "../ar"
import en from "../en"

/**
 * ADD OS bilingual invariant.
 *
 * Arabic and English are both first-class: no key may exist in one bundle and
 * not the other, and no English string may leak Arabic text (or vice versa).
 * `fallbackLocale` exists as a safety net, not as a translation strategy — if
 * these tests fail, a user somewhere is reading the wrong language.
 */

type Messages = Record<string, unknown>

function flattenKeys(source: Messages, prefix = ""): string[] {
	return Object.entries(source).flatMap(([key, value]) => {
		const path = prefix ? `${prefix}.${key}` : key
		return value !== null && typeof value === "object" ? flattenKeys(value as Messages, path) : [path]
	})
}

function flattenEntries(source: Messages, prefix = ""): [string, unknown][] {
	return Object.entries(source).flatMap(([key, value]): [string, unknown][] => {
		const path = prefix ? `${prefix}.${key}` : key
		return value !== null && typeof value === "object" ? flattenEntries(value as Messages, path) : [[path, value]]
	})
}

const ARABIC_SCRIPT = /\p{Script=Arabic}/u

const arKeys = flattenKeys(ar as Messages).sort()
const enKeys = flattenKeys(en as Messages).sort()

describe("ar / en key parity", () => {
	it("defines exactly the same keys in both languages", () => {
		expect(arKeys).toEqual(enKeys)
	})

	it("has no key that exists only in Arabic", () => {
		expect(arKeys.filter(key => !enKeys.includes(key))).toEqual([])
	})

	it("has no key that exists only in English", () => {
		expect(enKeys.filter(key => !arKeys.includes(key))).toEqual([])
	})

	it("is not empty — a passing parity check on zero keys would be meaningless", () => {
		expect(arKeys.length).toBeGreaterThan(0)
	})
})

describe("translation content", () => {
	it("has no blank values in either language", () => {
		const blanks = [...flattenEntries(ar as Messages), ...flattenEntries(en as Messages)].filter(
			([, value]) => typeof value !== "string" || value.trim() === ""
		)

		expect(blanks).toEqual([])
	})

	it("does not leak Arabic text into the English bundle", () => {
		const leaked = flattenEntries(en as Messages)
			.filter(([, value]) => typeof value === "string" && ARABIC_SCRIPT.test(value))
			.map(([key]) => key)

		expect(leaked).toEqual([])
	})

	it("actually translates the Arabic bundle rather than copying English", () => {
		const untranslated = flattenEntries(ar as Messages)
			.filter(([, value]) => typeof value === "string" && !ARABIC_SCRIPT.test(value))
			.map(([key]) => key)

		expect(untranslated).toEqual([])
	})
})
