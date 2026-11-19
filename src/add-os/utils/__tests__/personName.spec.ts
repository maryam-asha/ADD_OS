import { describe, expect, it } from "vitest"
import { filterPersonOption, personNameMatches, personSearchText } from "../personName"

// Shown in Arabic (the dashboard's language), with an English name added from the profile.
const sara = { name: "سارة خليل", name_ar: "سارة خليل", name_en: "Sara Khalil" }

describe("personNameMatches", () => {
	it("finds a person by either language of the name", () => {
		expect(personNameMatches(sara, "سارة")).toBe(true)
		expect(personNameMatches(sara, "sara")).toBe(true)
		expect(personNameMatches(sara, "  KHALIL ")).toBe(true)
		expect(personNameMatches(sara, "Omar")).toBe(false)
	})

	it("copes with a name held in one language only", () => {
		expect(personNameMatches({ name: "Omar", name_ar: null, name_en: "Omar" }, "oma")).toBe(true)
		expect(personNameMatches({ name: "Omar" }, "oma")).toBe(true)
	})
})

describe("filterPersonOption", () => {
	const option = { label: "سارة خليل · +963991234567", value: 1, search: personSearchText(sara) }

	it("matches the label, as Naive UI's default does", () => {
		expect(filterPersonOption("سارة", option)).toBe(true)
		expect(filterPersonOption("991234", option)).toBe(true)
	})

	it("matches the name in the language the label does not show", () => {
		expect(filterPersonOption("sara", option)).toBe(true)
		expect(filterPersonOption("khaled", option)).toBe(false)
	})

	it("still filters an option with no names, by its label", () => {
		expect(filterPersonOption("acme", { label: "Acme Ltd", value: 2 })).toBe(true)
	})
})
