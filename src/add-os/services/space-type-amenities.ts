import type { SpaceTypeAmenities } from "@/add-os/modules/spatial/types/amenity"
import { get, put } from "./api"
import { rowsOf } from "./pagination"

const BASE = "/api/v1/admin/space-type-amenities"

export async function listSpaceTypeAmenities(): Promise<SpaceTypeAmenities[]> {
	const res = await get<{ data: SpaceTypeAmenities[] }>(BASE)
	return rowsOf<SpaceTypeAmenities>(res.data)
}

export async function updateSpaceTypeAmenities(spaceType: string, amenities: string[]): Promise<{ message?: string }> {
	return put<{ message?: string }>(`${BASE}/${encodeURIComponent(spaceType)}`, { amenities })
}
