import type { RoleName } from "@/add-os/modules/system/types/role"

/**
 * Backend user-role domain (`Admin\StoreUserRequest` / `AssignRoleRequest`),
 * distinct from `types/auth.d.ts`'s route-guard `Role` — that one gates which
 * pages a session can reach; this one is a column on the `users` table. Custom
 * roles are now arbitrary operator-chosen strings (see `types/role.ts`), so
 * this is just an alias rather than a fixed 3-value union. (A `export type {
 * RoleName as UserRole } from ...` re-export only creates an export binding,
 * not a local one — `UserRole` still needs to resolve within this file, e.g.
 * in `User`/`CreateUserPayload` below — so it's imported and aliased here
 * instead.)
 */
export type UserRole = RoleName

export type UserStatus = "active" | "deactivated" | "blocked"

/** Shape of `UserResource` — every field ADDCore's API actually returns. */
export interface User {
	id: number
	name: string
	phone: string
	email: string
	preferred_language: string
	preferred_currency: string
	status: UserStatus
	roles: UserRole[]
}

/**
 * `StoreUserRequest` — member is never offered: only ops/admin (and any
 * custom role) accounts are created here. `role` is typed as the general
 * `UserRole` (now that custom roles exist) rather than a narrower
 * `"operations" | "admin"` literal union; `UsersPage.vue`'s
 * `createRoleOptions` is what actually restricts the dropdown at runtime —
 * it excludes `member` only, not any fixed set of the remaining roles, since
 * an admin can create an arbitrary number of custom roles via `RolesPage.vue`
 * and all of them are valid choices here.
 */
export interface CreateUserPayload {
	name: string
	phone: string
	email: string
	password: string
	password_confirmation: string
	role: UserRole
}

/** `UpdateUserRequest` — profile fields only, no password/role/status. */
export interface UpdateUserProfilePayload {
	name: string
	phone: string
	email: string
}

/** `UpdateUserStatusRequest` — `reason` is write-only, never echoed back by `UserResource`. */
export interface UpdateUserStatusPayload {
	status: UserStatus
	reason?: string
}
