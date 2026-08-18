import type { Role } from "@/types/auth.d"
import { useAuthStore } from "@/stores/auth"

/**
 * Single source for "which role may delete which spatial resource" — sourced
 * verbatim from each DELETE endpoint's description in
 * ADD-OS.postman_collection.json, not from inference. Every one of the seven
 * spatial resources reads literally "Admin-only (not operations)." there
 * (Delete Branch/Building/Floor/Zone/Space/Resource/Seat-Desk).
 *
 * `users` and `roles` have no entries here, and that's settled, not an open
 * question: the collection has no DELETE endpoint for either resource at
 * all. Users are deactivated via `PATCH /api/v1/admin/users/{id}/status`
 * (see `UsersPage.vue`'s change-status modal), never hard-deleted. Roles
 * have no CRUD whatsoever — `GET /api/v1/admin/roles` is read-only; roles
 * are backend-seeded. There is nothing to gate here for either resource.
 */
export const SPATIAL_RESOURCE_DELETE_ROLE = {
	branches: "admin",
	buildings: "admin",
	floors: "admin",
	zones: "admin",
	spaces: "admin",
	resources: "admin",
	seatsDesks: "admin"
} as const satisfies Record<string, Role>

export type SpatialResourceKey = keyof typeof SPATIAL_RESOURCE_DELETE_ROLE

/**
 * Resources whose DELETE endpoint description in the collection says the
 * deletion "cascades through" children — confirmed per-resource, not a
 * guess:
 *   branches  → Building/Floor/Zone/Space/Resource/SeatDesk/Device
 *   buildings → Floor/Zone/Space/Resource/SeatDesk
 *   floors    → Zone/Space
 *   zones     → Space
 *   spaces    → Resource/SeatDesk
 * `resources` and `seatsDesks` carry no cascade wording in the collection —
 * they have no children to cascade through.
 */
export const CASCADING_SPATIAL_RESOURCES: ReadonlySet<SpatialResourceKey> = new Set([
	"branches",
	"buildings",
	"floors",
	"zones",
	"spaces"
])

/**
 * The gate itself — routed through the EXISTING auth store's
 * `isRoleGranted`, never re-implemented. This is the only place in the
 * codebase that should call `isRoleGranted` for a delete decision; the
 * seven spatial views ask this function, not the store directly, so no
 * view carries its own role comparison (enforced by
 * no-inline-role-checks.spec.ts).
 *
 * IMPORTANT: this only decides whether to SHOW the delete control. It is
 * NOT an authorization boundary — the backend still rejects the request
 * with 403 regardless of what this returns. Do not read a `true` here as
 * "this request will succeed"; read it as "this request isn't expected to
 * be rejected," which is exactly the class of surprise this exists to
 * prevent.
 */
export function canDeleteSpatialResource(resource: SpatialResourceKey): boolean {
	return useAuthStore().isRoleGranted(SPATIAL_RESOURCE_DELETE_ROLE[resource])
}
