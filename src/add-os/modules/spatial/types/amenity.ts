// src/add-os/modules/spatial/types/amenity.ts

import type { Bilingual } from "@/add-os/components/resource/field-types"

/**
 * One entry of the amenity catalog (`GET /api/v1/admin/amenities`): what a
 * space offers without being equipment to track — Wi-Fi, café access, a
 * stage. Admin-managed since 2026-10-24, replacing the fixed `AmenityType`
 * enum; the equipment a space holds (a projector, a mic) is an inventory
 * asset instead (`modules/inventory`).
 *
 * `key` is what spaces and space types store and every endpoint sends —
 * fixed once created, so it is never in the update payload.
 */
export interface Amenity {
	id: number
	key: string
	name: Bilingual
	icon: string | null
	order: number
	is_active: boolean
}

export interface AmenityPayload extends Record<string, unknown> {
	/** Create only; derived from the English name when left empty. */
	key?: string
	name: Bilingual
	icon: string
	order: number
	is_active: boolean
}

/**
 * One row of the type -> amenity config matrix: which catalog amenities (by
 * `key`) are even selectable for a given `SpaceType`. Admin-editable (see the
 * Space Type Amenities page), and separate from a specific `Space`'s own
 * `amenities` (which of its type's applicable set is actually turned on).
 */
export interface SpaceTypeAmenities {
	space_type: string
	amenities: string[]
}
