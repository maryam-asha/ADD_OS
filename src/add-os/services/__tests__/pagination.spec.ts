import { describe, expect, it } from "vitest"
import { rowsOf, toPaginated } from "../pagination"

/**
 * The `"data": {}` case is the reason `rowsOf` exists.
 *
 * A list endpoint should send `"data": []` when it has no rows. PHP has no
 * distinct empty-list type, so an empty associative array serializes as an
 * object — the same endpoint sends `{}` when empty and `[]` when populated.
 * Observed against a live response 2026-09-23.
 */
describe("rowsOf", () => {
	it("passes a populated array through untouched", () => {
		const rows = [{ id: 1 }, { id: 2 }]
		expect(rowsOf<{ id: number }>(rows)).toBe(rows)
	})

	it("returns an empty array for an empty array", () => {
		expect(rowsOf([])).toEqual([])
	})

	it("converts an empty object to an empty array", () => {
		// The case this whole helper exists for.
		expect(rowsOf({})).toEqual([])
	})

	it("converts null and undefined to an empty array", () => {
		expect(rowsOf(null)).toEqual([])
		expect(rowsOf(undefined)).toEqual([])
	})

	it("does not try to salvage rows from a keyed object", () => {
		// Deliberate: `{"0": {...}}` has not been observed, and reconstructing an
		// array from it would invent rows the backend did not send.
		expect(rowsOf({ 0: { id: 1 } })).toEqual([])
	})
})

describe("toPaginated", () => {
	it("synthesizes a single-page meta when there is no meta", () => {
		const result = toPaginated({ data: [{ id: 1 }, { id: 2 }] })

		expect(result.data).toHaveLength(2)
		expect(result.meta).toEqual({ current_page: 1, last_page: 1, per_page: 2, total: 2 })
	})

	it("trusts a real meta and fills only the sub-fields the backend omits", () => {
		// `per_page` absent is the documented shape of the pending-approval
		// endpoint — it falls back to data.length, never to an invented number.
		const result = toPaginated({
			data: [{ id: 1 }],
			meta: { current_page: 3, last_page: 4, total: 87 }
		})

		expect(result.meta).toEqual({ current_page: 3, last_page: 4, per_page: 1, total: 87 })
	})

	it("does not produce undefined totals when an empty list arrives as an object", () => {
		// Before `rowsOf`, `raw.data.length` was `undefined` here, and both
		// `per_page` and `total` carried that `undefined` into the pager.
		const result = toPaginated({ data: {} as never })

		expect(result.data).toEqual([])
		expect(result.meta).toEqual({ current_page: 1, last_page: 1, per_page: 0, total: 0 })
	})

	it("keeps a real meta intact when the empty page arrives as an object", () => {
		const result = toPaginated({ data: {} as never, meta: { current_page: 2, last_page: 5, total: 40 } })

		expect(result.data).toEqual([])
		expect(result.meta.current_page).toBe(2)
		expect(result.meta.total).toBe(40)
		// per_page is absent from meta, so it falls back to the (now empty) row count.
		expect(result.meta.per_page).toBe(0)
	})
})
