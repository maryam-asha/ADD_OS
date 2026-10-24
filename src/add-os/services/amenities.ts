import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Amenity, AmenityPayload } from "@/add-os/modules/spatial/types/amenity"
import { createResourceApi } from "./resource-factory"

/**
 * The amenity catalog, `/api/v1/admin/amenities` (ADD Core `AmenityController`,
 * admin|operations). Update answers `{message}` and never takes `key`; deleting
 * an amenity turns it off for every space type and space that had it.
 */
const api = createResourceApi<Amenity, AmenityPayload, AmenityPayload>("/api/v1/admin/amenities")

export const listAmenities = api.list
export const createAmenity = api.create
export const updateAmenity = api.update
export const removeAmenity = api.remove

/** An amenity key's name in `locale`, from a loaded catalog; the key itself when it is not in it. */
export function amenityLabel(key: string, catalog: readonly Amenity[], locale: SupportedLocale): string {
	return catalog.find(amenity => amenity.key === key)?.name[locale] || key
}
