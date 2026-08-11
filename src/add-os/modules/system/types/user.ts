/**
 * Backend user-role domain (`Admin\StoreUserRequest` / `AssignRoleRequest`),
 * distinct from `types/auth.d.ts`'s route-guard `Role` — that one gates which
 * pages a session can reach; this one is a column on the `users` table.
 */
export type UserRole = "member" | "operations" | "admin"

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

/** `StoreUserRequest` — member is never offered: only ops/admin accounts are created here. */
export interface CreateUserPayload {
	name: string
	phone: string
	email: string
	password: string
	password_confirmation: string
	role: "operations" | "admin"
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
