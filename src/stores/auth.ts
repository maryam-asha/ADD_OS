import type { AdminUser, OpenedBy, Role, Roles } from "@/types/auth.d"
import _castArray from "lodash/castArray"
import { acceptHMRUpdate, defineStore } from "pinia"
import { hasApiUrl } from "@/add-os/config/env"
import { getMe } from "@/add-os/services/auth"

/** The two roles ADD Core lets into every admin route (`role:admin|operations`). */
const STAFF_ROLES: readonly string[] = ["admin", "operations"]

/** Roles that never open this dashboard's admin side: the member app, and the provider portal. */
const NON_DASHBOARD_ROLES: readonly string[] = ["member", "provider"]

/**
 * Who may use this dashboard at all: a provider (its portal), an account with
 * any role besides member and provider (admin, operations, or one made on the
 * Roles page), or an employee (My HR, whatever the role). The one rule for
 * sign-in, session restore and the route guard — sign-in kept its own copy,
 * without the employee, and refused every member who is also an employee
 * (live HR run, 2026-10-21).
 */
export function mayUseDashboard(user: Pick<AdminUser, "roles" | "employee">): boolean {
	const roles = user.roles ?? []
	return roles.includes("provider") || roles.some(role => !NON_DASHBOARD_ROLES.includes(role)) || Boolean(user.employee)
}

/** The account's roles: the signed-in user's, else the one kept across a reload until `/me` answers. */
function rolesOf(state: { role: Role | null; user: Partial<AdminUser> }): string[] {
	return state.user?.roles ?? (state.role ? [state.role] : [])
}

/** ADD OS primary role: provider, admin, operations, moderator, or custom. */
function primaryRole(roles: string[] | undefined): Role | null {
	if (roles?.includes("provider")) return "provider"
	if (roles?.includes("admin")) return "admin"
	if (roles?.includes("operations")) return "operations"
	if (roles?.includes("moderator")) return "moderator"
	return (roles?.[0] as Role) || null
}

export const useAuthStore = defineStore("auth", {
	state: () => ({
		logged: false,
		role: null as Role | null,
		permissions: [] as string[],
		user: {} as Partial<AdminUser>
	}),
	actions: {
		setLogged(user: AdminUser) {
			this.logged = true
			this.role = primaryRole(user.roles)
			this.permissions = user.permissions ?? []
			this.user = user
		},
		/** Clears local state only — callers that need the server session revoked call logout() first. */
		setLogout() {
			this.logged = false
			this.role = null
			this.permissions = []
			this.user = {}
		},
		/**
		 * Verifies the Fortify session cookie against the API at app boot, rather than
		 * trusting the persisted `logged`/`role` from localStorage — a session can expire
		 * or an account can be blocked server-side without the browser ever knowing.
		 */
		async initSession() {
			if (!hasApiUrl()) return
			try {
				const user = await getMe()
				if (!mayUseDashboard(user)) {
					this.setLogout()
					return
				}
				this.setLogged(user)
			} catch {
				this.setLogout()
			}
		}
	},
	getters: {
		isLogged(state) {
			return state.logged
		},
		userRole(state) {
			return state.role
		},
		isProvider(state) {
			return Boolean(state.user?.roles?.includes("provider") || state.role === "provider")
		},
		/**
		 * `mayUseDashboard` for the signed-in account. True while the user is
		 * not loaded yet (a reload, before `/me` answers): `initSession` decides
		 * then, and refusing early would sign out an employee with no role.
		 */
		mayUseDashboard(state) {
			return !state.user?.roles || mayUseDashboard(state.user as AdminUser)
		},
		/** Holds admin or operations: every admin route, as on the server. */
		isStaff(state) {
			return rolesOf(state).some(role => STAFF_ROLES.includes(role))
		},
		/** Holds a role that opens the admin side at all: admin, operations or a custom role — not member, provider or none. */
		hasDashboardRole(state) {
			return rolesOf(state).some(role => !NON_DASHBOARD_ROLES.includes(role))
		},
		/** Has an HR employee record: reaches My HR whatever the role. */
		isEmployee(state) {
			return Boolean(state.user?.employee)
		},
		isAdmin(state) {
			const isProv = Boolean(state.user?.roles?.includes("provider") || state.role === "provider")
			const isMember = Boolean(state.user?.roles?.length && state.user.roles.every(r => r === "member"))
			return state.logged && !isProv && !isMember
		},
		isRoleGranted(state) {
			return (roles?: Roles) => {
				if (!roles) {
					return true
				}
				if (!state.logged) {
					return false
				}

				const arrRoles: Role[] = _castArray(roles)

				if (arrRoles.includes("all")) {
					return true
				}

				const isProv = Boolean(state.user?.roles?.includes("provider") || state.role === "provider")
				const isMember = Boolean(state.user?.roles?.length && state.user.roles.every(r => r === "member"))

				if (arrRoles.includes("provider")) {
					return isProv
				}

				// The general admin gate: admin, operations, or a custom role — which
				// pages a custom role then reaches is `mayOpenAdminPage`'s call. An
				// account with no role used to pass here (it is neither provider nor
				// member), so an employee without dashboard access landed on admin
				// pages the server refused, not on My HR.
				if (arrRoles.includes("admin") && arrRoles.includes("operations")) {
					return !isProv && !isMember && rolesOf(state).some(role => !NON_DASHBOARD_ROLES.includes(role))
				}

				if (state.role && arrRoles.includes(state.role)) {
					return true
				}

				if (state.user?.roles?.some(r => arrRoles.includes(r as Role))) {
					return true
				}

				return false
			}
		},
		hasPermission(state) {
			return (permission: string) => state.permissions.includes(permission)
		},
		/**
		 * Whether a page behind the admin gate opens for this account. ADD Core
		 * keeps most admin routes for `role:admin|operations`; a few it serves on
		 * a permission alone, to any role. So admin and operations reach every
		 * page except one tagged with permissions they do not hold (the server
		 * would refuse them too), and any other dashboard role reaches only
		 * pages tagged "any" or with a permission it holds — not, as before,
		 * every admin page, each failing on 403.
		 */
		mayOpenAdminPage(state) {
			return (openedBy?: OpenedBy) => {
				const roles = rolesOf(state)
				const held = (list: readonly string[]) => list.some(permission => state.permissions.includes(permission))
				if (roles.some(role => STAFF_ROLES.includes(role))) return !Array.isArray(openedBy) || held(openedBy)
				if (!roles.some(role => !NON_DASHBOARD_ROLES.includes(role))) return false
				return openedBy === "any" || (Array.isArray(openedBy) && held(openedBy))
			}
		}
	},
	persist: {
		omit: ["user"]
	}
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
