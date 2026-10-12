export type Role = "all" | "admin" | "operations" | "moderator" | "provider" | (string & {})
export type Roles = Role | Role[]

export interface RouteMetaAuth {
	checkAuth?: boolean
	authRedirect?: string
	auth?: boolean
	roles?: Roles
	permission?: string
}

/** Shape of `/api/v1/admin/me`'s `user` object — Fortify/Sanctum session auth. */
export interface AdminUser {
	id: number
	name: string
	email: string
	phone?: string
	status?: string
	preferred_language?: string
	roles: string[]
	/** Flat list of every permission (`module.action`) the account holds via any of its roles. */
	permissions?: string[]
}
