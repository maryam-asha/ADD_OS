/** A role's name is no longer one of a fixed 3-value union — custom roles
 *  are arbitrary operator-chosen strings. */
export type RoleName = string

export interface RoleRecord {
	id: number
	name: RoleName
	protected: boolean
	permissions: string[]
}

export interface RolePayload {
	name: string
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
