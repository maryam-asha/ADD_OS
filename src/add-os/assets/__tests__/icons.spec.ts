import { describe, expect, it } from "vitest"
import { buildCollections, collectIconNames } from "../../../../scripts/build-icons.js"
import generated from "../icons.generated.json"

/**
 * ADD OS — guards the offline icon bundle.
 *
 * `icons.generated.json` is produced by `npm run icons`. Nothing forces a
 * developer to re-run it after adding an icon, and a stale bundle would show up
 * only as a missing glyph on a VPN-isolated deployment — long after the change.
 *
 * These tests re-run the scanner and compare, so the drift fails here instead.
 */

const collections = generated as Record<string, { icons: Record<string, unknown>; aliases?: Record<string, unknown> }>

function bundledNames(): string[] {
	return Object.entries(collections)
		.flatMap(([prefix, collection]) => [
			...Object.keys(collection.icons ?? {}).map(name => `${prefix}:${name}`),
			...Object.keys(collection.aliases ?? {}).map(name => `${prefix}:${name}`)
		])
		.sort()
}

function referencedNames(): string[] {
	return [...collectIconNames()]
		.flatMap(([prefix, names]) => [...names].map(name => `${prefix}:${name}`))
		.sort()
}

describe("offline icon bundle", () => {
	it("contains every icon the source references", () => {
		const bundled = new Set(bundledNames())
		const missing = referencedNames().filter(name => !bundled.has(name))

		expect(missing, `Run \`npm run icons\` — these are referenced but not bundled:\n${missing.join("\n")}`).toEqual(
			[]
		)
	})

	it("resolves every referenced name against a real icon set", () => {
		// Catches typos: a name that exists nowhere in @iconify-json would render blank.
		const { missing } = buildCollections(collectIconNames())

		expect(missing, `These names do not exist in their icon set:\n${missing.join("\n")}`).toEqual([])
	})

	it("is not empty, so a passing check means something", () => {
		expect(bundledNames().length).toBeGreaterThan(50)
	})

	it("carries icon data, not just names", () => {
		const carbon = collections.carbon

		expect(carbon).toBeDefined()
		expect(Object.keys(carbon.icons).length).toBeGreaterThan(0)

		for (const [name, data] of Object.entries(carbon.icons)) {
			expect(data, `carbon:${name} has no body`).toHaveProperty("body")
		}
	})
})
