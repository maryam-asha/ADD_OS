import type { Role } from "@/types/auth.d"
import { useAuthStore } from "@/stores/auth"

/**
 * ADD OS's admin dashboard gates UI controls through two mechanisms that
 * deliberately coexist in this one file during an in-progress backend
 * migration (`docs/decisions/rbac-permission-pilot.md` in ADD Core):
 *
 * - Role-based gates (`canDeleteSpatialResource`, `canDeleteBusinessHours`,
 *   `canManageRoles`) — check the account's single primary role via the auth
 *   store's `isRoleGranted`. This is the original mechanism and still covers
 *   every resource below except Branches: buildings/floors/zones/spaces/
 *   resources/seatsDesks delete, Business Hours delete, and Role management
 *   (`RoleController`'s routes still run on `role:admin` middleware).
 * - The permission-based gate (`can`) — checks the account's actual granted
 *   permissions (from `GET /api/v1/admin/me`) via the auth store's
 *   `hasPermission`. Only Branches uses this today: its backend routes were
 *   migrated to `permission:branches.view|create|update|delete` middleware as
 *   a pilot, so a role check can no longer correctly express who's allowed —
 *   a custom role could hold `branches.delete` without being `"admin"`.
 *
 * This split is temporary migration state, not drift between two competing
 * patterns: as more resources' backend enforcement converts from role- to
 * permission-based middleware in follow-up work, they move from the first
 * list to the second. Use whichever mechanism matches the resource's actual
 * current backend middleware — check the route file, don't guess.
 */

/**
 * Single source for "which role may delete which spatial resource" — sourced
 * verbatim from each DELETE endpoint's description in
 * ADD-OS.postman_collection.json, not from inference. Every one of these six
 * spatial resources reads literally "Admin-only (not operations)." there
 * (Delete Building/Floor/Zone/Space/Resource/Seat-Desk). Branches is not in
 * this map — its delete decision is permission-gated now, via `can()` below;
 * see `LegacyGatedSpatialResourceKey`.
 *
 * `users` and `roles` have no entries here. Users: settled, not an open
 * question — the collection has no DELETE endpoint for the resource at all;
 * users are deactivated via `PATCH /api/v1/admin/users/{id}/status` (see
 * `UsersPage.vue`'s change-status modal), never hard-deleted. Roles: the
 * backend gained full Role CRUD in a prior task, so this claim used to be
 * true but no longer is — `GET /api/v1/admin/roles` is not read-only any
 * more. Role management is gated by `canManageRoles()` below instead of an
 * entry in this map, since it isn't a delete-only decision and isn't a
 * spatial resource.
 */
export const SPATIAL_RESOURCE_DELETE_ROLE = {
	buildings: "admin",
	floors: "admin",
	zones: "admin",
	spaces: "admin",
	resources: "admin",
	seatsDesks: "admin"
} as const satisfies Partial<Record<SpatialResourceKey, Role>>

/**
 * The full set of spatial resources, independent of which gating mechanism
 * currently covers each one. Kept separate from
 * `SPATIAL_RESOURCE_DELETE_ROLE`'s keys (which now exclude Branches) so
 * `CASCADING_SPATIAL_RESOURCES` — which still legitimately needs Branches —
 * has a type to be declared against.
 */
export type SpatialResourceKey = "branches" | "buildings" | "floors" | "zones" | "spaces" | "resources" | "seatsDesks"

/**
 * The subset of `SpatialResourceKey` still on the legacy role-based delete
 * gate — i.e. everything except Branches. Narrowing
 * `canDeleteSpatialResource`'s parameter to this type (instead of the full
 * `SpatialResourceKey`) makes `canDeleteSpatialResource("branches")` a
 * compile-time error: a permanent guardrail against ever reverting
 * `BranchesPage.vue` back to this now-stale check, since Branches' delete
 * decision must reflect its actual granted permission, which this role-based
 * map can no longer express correctly.
 */
export type LegacyGatedSpatialResourceKey = keyof typeof SPATIAL_RESOURCE_DELETE_ROLE

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
 * six remaining role-gated spatial views ask this function, not the store
 * directly, so no view carries its own role comparison (enforced by
 * no-inline-role-checks.spec.ts). Branches no longer calls this — see
 * `LegacyGatedSpatialResourceKey` for why `resource` can't be `"branches"`
 * any more.
 *
 * IMPORTANT: this only decides whether to SHOW the delete control. It is
 * NOT an authorization boundary — the backend still rejects the request
 * with 403 regardless of what this returns. Do not read a `true` here as
 * "this request will succeed"; read it as "this request isn't expected to
 * be rejected," which is exactly the class of surprise this exists to
 * prevent.
 */
export function canDeleteSpatialResource(resource: LegacyGatedSpatialResourceKey): boolean {
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
 * The generic permission-based gate — checks the current user's actual
 * granted permissions (from GET /api/v1/admin/me), not a role name. Use this
 * for any resource whose backend enforcement has moved to permission:
 * middleware. Today that's Branches only (`branches.view/create/update/delete`)
 * — every other resource in this file still uses the older role-based gates
 * above, because their backend enforcement hasn't moved yet. Both mechanisms
 * are expected to coexist here during the migration; see the file-level
 * comment for which resource uses which.
 */
export function can(permission: string): boolean {
	return useAuthStore().hasPermission(permission)
}

/**
 * Role management stays role-gated, not permission-gated: `RoleController`'s
 * routes are still behind `role:admin` middleware in this pilot (Branches is
 * the only resource whose backend moved to permission-based enforcement so
 * far). `RolesPage.vue` is a separate, later task's concern — this export
 * just makes the gate available to it.
 */
export const ROLE_MANAGEMENT_ROLE: Role = "admin"

export function canManageRoles(): boolean {
	return useAuthStore().isRoleGranted(ROLE_MANAGEMENT_ROLE)
}
