/**
 * A role's name is no longer one of a fixed 3-value union — custom roles
 *  are arbitrary operator-chosen strings.
 */
export type RoleName = string

export interface RoleRecord {
	id: number
	name: RoleName
	protected: boolean
	permissions: string[]
}

/** `StoreRoleRequest` — `name` is required on create. */
export interface CreateRolePayload {
	name: string
	permissions?: string[]
}

/**
 * `UpdateRoleRequest` — `name` is `sometimes` server-side, so a
 * permissions-only edit doesn't need to resend it. Deliberately NOT shared
 * with `CreateRolePayload` (unlike e.g. `BranchPayload`, which documents
 * create/update as "confirmed identical in the Postman collection") — here
 * the two shapes genuinely differ.
 */
export interface UpdateRolePayload {
	name?: string
	permissions?: string[]
}

export interface PermissionAction {
	name: string
	action: string
}

export interface PermissionModule {
	module: string
	actions: PermissionAction[]
}
