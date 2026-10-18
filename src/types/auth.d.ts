import type { EmployeeSummary } from "@/add-os/modules/hr/types/hr"

export type Role = "all" | "admin" | "operations" | "moderator" | "provider" | (string & {})
export type Roles = Role | Role[]

export interface RouteMetaAuth {
	checkAuth?: boolean
	authRedirect?: string
	auth?: boolean
	roles?: Roles
	permission?: string
	/** HR: only accounts with an employee record (`employee` on GET auth/me). */
	employee?: boolean
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
	/** The account's HR employee record, when it has one (`employee` on GET auth/me). */
	employee?: EmployeeSummary | null
}
