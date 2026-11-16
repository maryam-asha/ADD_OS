import type { ComputedRef, Ref, WritableComputedRef } from "vue"
import type { PlaceChain, PlaceRef } from "@/add-os/modules/inventory/types/inventory"
import { computed } from "vue"

/**
 * A list's place filter kept in the URL: the place picker's levels as five
 * numeric query keys, so a refresh, the back button or a shared link opens
 * the list on the same place with the picker showing how it was reached.
 * Spread it into a `useRouteFilters` schema.
 */
export const PLACE_FILTER_SCHEMA = { branch: "number", building: "number", floor: "number", zone: "number", space: "number" } as const

export interface PlaceFilterValues {
	branch: number | null
	building: number | null
	floor: number | null
	zone: number | null
	space: number | null
}

/** The picker's levels from the URL keys; none without a branch, where every path starts. */
export function chainOf(values: PlaceFilterValues): PlaceChain | null {
	if (values.branch === null) return null
	return { branchId: values.branch, buildingId: values.building, floorId: values.floor, zoneId: values.zone, spaceId: values.space }
}

/** The deepest level chosen, as ADD Core's `{type, id}`; a space may sit straight in its building. */
export function placeOf(chain: PlaceChain | null): PlaceRef | null {
	if (!chain) return null
	if (chain.spaceId) return { type: "space", id: chain.spaceId }
	if (chain.zoneId) return { type: "zone", id: chain.zoneId }
	if (chain.floorId) return { type: "floor", id: chain.floorId }
	if (chain.buildingId) return { type: "building", id: chain.buildingId }
	if (chain.branchId) return { type: "branch", id: chain.branchId }
	return null
}

export function filtersOf(chain: PlaceChain | null): PlaceFilterValues {
	return {
		branch: chain?.branchId ?? null,
		building: chain?.buildingId ?? null,
		floor: chain?.floorId ?? null,
		zone: chain?.zoneId ?? null,
		space: chain?.spaceId ?? null
	}
}

/**
 * The place and the picker's levels over a page's route filters. Writing
 * `chain` sets all five keys in one change, so the list loads once.
 */
export function usePlaceFilter<F extends PlaceFilterValues>(filters: Ref<F>): { place: ComputedRef<PlaceRef | null>; chain: WritableComputedRef<PlaceChain | null> } {
	const chain = computed<PlaceChain | null>({
		get: () => chainOf(filters.value),
		set: next => {
			filters.value = { ...filters.value, ...filtersOf(next) }
		}
	})
	const place = computed(() => placeOf(chain.value))
	return { place, chain }
}
