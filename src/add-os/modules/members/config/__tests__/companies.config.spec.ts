import { describe, expect, it } from "vitest"

import { quotedRequestOptions } from "../companies.config"

const requests = [
	{ id: 1, prospect_name: "Requested Co", contact: "a", status: "requested" as const, quote_ref: null },
	{ id: 2, prospect_name: "Quoted Co", contact: "b", status: "quoted" as const, quote_ref: "Q-1" },
	{ id: 3, prospect_name: "Contracted Co", contact: "c", status: "contracted" as const, quote_ref: "Q-2" }
]

describe("quotedRequestOptions", () => {
	it("includes only requests whose status is 'quoted'", () => {
		const options = quotedRequestOptions(requests)

		expect(options).toHaveLength(1)
		expect(options[0].value).toBe(2)
	})

	it("returns an empty array when nothing is quoted", () => {
		const options = quotedRequestOptions(requests.filter(r => r.status !== "quoted"))

		expect(options).toEqual([])
	})
})
