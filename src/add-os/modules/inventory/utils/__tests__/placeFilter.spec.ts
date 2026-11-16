import { describe, expect, it } from "vitest"
import { nextTick, ref } from "vue"
import { chainOf, filtersOf, placeOf, usePlaceFilter } from "../placeFilter"

const EMPTY = { branch: null, building: null, floor: null, zone: null, space: null }

describe("placeFilter", () => {
	it("names the deepest level chosen", () => {
		expect(placeOf({ branchId: 1, buildingId: 2, floorId: 3, zoneId: 4, spaceId: 5 })).toEqual({ type: "space", id: 5 })
		expect(placeOf({ branchId: 1, buildingId: 2, floorId: null, zoneId: null, spaceId: 9 })).toEqual({ type: "space", id: 9 })
		expect(placeOf({ branchId: 1, buildingId: 2, floorId: 3, zoneId: null, spaceId: null })).toEqual({ type: "floor", id: 3 })
		expect(placeOf({ branchId: 7, buildingId: null, floorId: null, zoneId: null, spaceId: null })).toEqual({ type: "branch", id: 7 })
		expect(placeOf(null)).toBeNull()
	})

	it("has no chain without a branch", () => {
		expect(chainOf(EMPTY)).toBeNull()
		expect(chainOf({ ...EMPTY, building: 2 })).toBeNull()
	})

	it("round-trips a chain through the URL keys", () => {
		const chain = { branchId: 1, buildingId: 2, floorId: null, zoneId: null, spaceId: 9 }
		expect(filtersOf(chain)).toEqual({ branch: 1, building: 2, floor: null, zone: null, space: 9 })
		expect(chainOf(filtersOf(chain))).toEqual(chain)
		expect(filtersOf(null)).toEqual(EMPTY)
	})

	it("writes all five keys at once and reads the place back", async () => {
		const filters = ref({ search: "x", ...EMPTY })
		const { place, chain } = usePlaceFilter(filters)
		chain.value = { branchId: 1, buildingId: 2, floorId: null, zoneId: null, spaceId: null }
		await nextTick()
		expect(filters.value).toEqual({ search: "x", branch: 1, building: 2, floor: null, zone: null, space: null })
		expect(place.value).toEqual({ type: "building", id: 2 })
		chain.value = null
		expect(filters.value).toEqual({ search: "x", ...EMPTY })
		expect(place.value).toBeNull()
	})
})
