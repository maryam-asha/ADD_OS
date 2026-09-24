// src/add-os/modules/spatial/types/amenity.ts

/**
 * Mirrors the backend's `App\Domain\Foundation\Enums\AmenityType` — a fixed,
 * known set of facility amenities, deliberately NOT modeled through
 * `Resource`/`ResourceCategory` (those stay equipment-only: things with a
 * real quantity and an admin-authored name, like a projector count).
 */
export type AmenityType = "wifi" | "power_outlet" | "printing" | "ergonomic_chairs" | "locker" | "cafe_access" | "ac" | "stage"

export const AMENITY_TYPES: readonly AmenityType[] = ["wifi", "power_outlet", "printing", "ergonomic_chairs", "locker", "cafe_access", "ac", "stage"]

/**
 * One row of the type -> amenity config matrix: which `AmenityType` values
 * are even selectable for a given `SpaceType`. Admin-editable (see the
 * Space Type Amenities page), and separate from a specific `Space`'s own
 * `amenities` (which of its type's applicable set is actually turned on).
 */
export interface SpaceTypeAmenities {
	space_type: string
	amenities: AmenityType[]
}
