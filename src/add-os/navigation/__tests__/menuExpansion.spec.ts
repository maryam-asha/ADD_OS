import { describe, expect, it } from "vitest"
import { expandedKeysAfter } from "../menuExpansion"

/**
 * ADD OS — inside a group entry, one module open at a time. The keys are what
 * naive-ui reports: the current open keys with the one just opened last.
 */
describe("sidebar expansion", () => {
	it("opens a group with no module open", () => {
		expect(expandedKeysAfter(["hrGroup"])).toEqual(["hrGroup"])
	})

	it("closes the open module when another one opens", () => {
		expect(expandedKeysAfter(["hrGroup", "hrTime", "hrPay"])).toEqual(["hrGroup", "hrPay"])
	})

	it("reopens a closed group with no module open", () => {
		// Closing the group leaves its module's key behind in the menu's state.
		expect(expandedKeysAfter(["hrTime", "hrGroup"])).toEqual(["hrGroup"])
	})

	it("opens the module of the page routed to, closing the one open before", () => {
		// `showOption` adds the page's path to what is already open.
		expect(expandedKeysAfter(["hrGroup", "hrPay", "hrTime"])).toEqual(["hrGroup", "hrTime"])
	})

	it("leaves everything outside a group to the menu", () => {
		expect(expandedKeysAfter(["spatial"])).toBeUndefined()
		expect(expandedKeysAfter(["hrTime", "spatial"])).toBeUndefined()
		expect(expandedKeysAfter([])).toBeUndefined()
	})
})
