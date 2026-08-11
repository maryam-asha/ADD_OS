export type Role = "all" | "admin" | "operations" | "moderator"
export type Roles = Role | Role[]

export interface RouteMetaAuth {
	checkAuth?: boolean
	authRedirect?: string
	auth?: boolean
	roles?: Roles
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
}
