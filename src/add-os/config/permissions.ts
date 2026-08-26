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

/**
 * Business Hours delete + Business Hour Exception delete are both "Admin-only
 * (not operations)." per the collection — same rule, so one shared constant and
 * one function cover both endpoints rather than duplicating
 * `SPATIAL_RESOURCE_DELETE_ROLE`'s per-resource map for a single value. Kept
 * separate from that map: Business Hours isn't a spatial resource, it just
 * lives in that nav section.
 */
export const BUSINESS_HOURS_DELETE_ROLE: Role = "admin"

export function canDeleteBusinessHours(): boolean {
	return useAuthStore().isRoleGranted(BUSINESS_HOURS_DELETE_ROLE)
}

/**
 * Global settings: the LIST is readable by `admin` and `operations`, but the
 * UPDATE is admin-only. Sourced from the collection pinned 2026-08-25
 * (`sha256 86d330d9…`), whose `Admin (Dashboard) > Settings` folder description
 * reads verbatim: "Global key/value config. List is available to admin and
 * operations; update is admin-only." Corroborated in
 * `ADDCore/routes/api/v1/admin.php`, where `GET settings` sits in the outer
 * `role:admin|operations` group and `PATCH settings/{key}` sits inside the
 * narrower `role:admin` one — the same `role:admin` group
 * `docs/add-os/2026-08-24-usersrolespage-permission-gap.md` reads, and which
 * that finding noted covered "PATCH /admin/settings/{key}, which has no screen
 * yet". It has one now.
 *
 * This gates the CONTROL, not the page: because the list is readable by both
 * roles, an operations account still gets the whole table and every value —
 * `SettingsPage` renders no edit control at all for it, rather than a page of
 * buttons that can only 403. That is the narrow version of the product decision
 * the Users/Roles finding left open, and it is available here only because this
 * resource's read and write differ in role, which Users/Roles does not.
 *
 * Same caveat as `canDeleteSpatialResource`: this decides what to SHOW. The
 * backend still rejects the request regardless of what this returns.
 */
export const SETTINGS_UPDATE_ROLE: Role = "admin"

export function canUpdateSettings(): boolean {
	return useAuthStore().isRoleGranted(SETTINGS_UPDATE_ROLE)
}
