import { describe, expect, it } from "vitest"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import { countKey, PLURAL_CATEGORIES, pluralCategory } from "../plural"

type Messages = Record<string, unknown>

/** Every object in a bundle whose keys are plural categories: a counted message. */
function countedMessages(source: Messages, prefix = ""): [string, Messages][] {
	return Object.entries(source).flatMap(([key, value]): [string, Messages][] => {
		if (value === null || typeof value !== "object") return []
		const path = prefix ? `${prefix}.${key}` : key
		const keys = Object.keys(value)
		const counted = keys.includes("other") && keys.every(k => (PLURAL_CATEGORIES as readonly string[]).includes(k))
		return counted ? [[path, value as Messages]] : countedMessages(value as Messages, path)
	})
}

describe("pluralCategory — CLDR forms", () => {
	it("gives Arabic its six forms", () => {
		expect([0, 1, 2, 3, 10, 11, 99, 100].map(n => pluralCategory(n, "ar"))).toEqual(["zero", "one", "two", "few", "few", "many", "many", "other"])
	})

	it("gives English one and other", () => {
		expect([0, 1, 2, 11].map(n => pluralCategory(n, "en"))).toEqual(["other", "one", "other", "other"])
	})

	it("builds the message key", () => {
		expect(countKey("inventory.items.assetsCount", 2, "ar")).toBe("inventory.items.assetsCount.two")
	})
})

describe("counted messages", () => {
	const all = [...countedMessages(ar as Messages), ...countedMessages(en as Messages)]

	it("exist — the check below would pass on none", () => {
		expect(all.length).toBeGreaterThan(0)
	})

	it("define every category, so no count lands on a missing key", () => {
		const incomplete = all.filter(([, forms]) => PLURAL_CATEGORIES.some(c => !forms[c])).map(([path]) => path)
		expect(incomplete).toEqual([])
	})
})
