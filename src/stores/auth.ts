import type { AdminUser, Role, Roles } from "@/types/auth.d"
import _castArray from "lodash/castArray"
import { acceptHMRUpdate, defineStore } from "pinia"
import { hasApiUrl } from "@/add-os/config/env"
import { getMe } from "@/add-os/services/auth"

/**
 * Who may use this dashboard at all: a provider (its portal), a staff account
 * — one holding at least one permission, whatever its roles are called — or
 * an employee (My HR, whatever the role). The one rule for sign-in, session
 * restore and the route guard — sign-in kept its own copy, without the
 * employee, and refused every member who is also an employee (live HR run,
 * 2026-10-21).
 *
 * 2026-10-27: a staff account is one holding a permission, not one holding a
 * role besides member and provider. ADD Core now guards every admin route by
 * permission alone and admits to `me` and `media/upload` any account holding
 * at least one, so a role granted nothing reaches nothing there; before, it
 * was let in here to a dashboard every page of which the server refused.
 */
export function mayUseDashboard(user: Pick<AdminUser, "roles" | "permissions" | "employee">): boolean {
	return Boolean(user.roles?.includes("provider")) || Boolean(user.permissions?.length) || Boolean(user.employee)
}

/** ADD OS primary role: provider, admin, operations, moderator, or custom. Display and the provider audience only — never staff access. */
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
			return !state.user?.roles || mayUseDashboard({ ...state.user, permissions: state.permissions } as AdminUser)
		},
		/**
		 * A staff account: not a provider, and holding at least one permission —
		 * whatever its roles are called. Opens the pages marked `allStaff`; every
		 * other staff page asks for its own permission (`navigation/access.ts`).
		 * Until 2026-10-27 this meant "holds admin or operations", and those two
		 * role names decided staff access; nothing checks a role name for it now.
		 */
		isStaff(state): boolean {
			const isProvider = Boolean(state.user?.roles?.includes("provider") || state.role === "provider")
			return !isProvider && state.permissions.length > 0
		},
		/** Has an HR employee record: reaches My HR whatever the role. */
		isEmployee(state) {
			return Boolean(state.user?.employee)
		},
		/**
		 * Whether the account holds one of `roles`. An audience check — the
		 * provider portal's `["provider"]` — never a staff gate: since 2026-10-27
		 * staff pages ask for a permission (`navigation/access.ts`), and the
		 * admin|operations branch that stood here for them is gone.
		 */
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

				if (arrRoles.includes("provider")) {
					return Boolean(state.user?.roles?.includes("provider") || state.role === "provider")
				}

				if (state.role && arrRoles.includes(state.role)) {
					return true
				}

				return Boolean(state.user?.roles?.some(r => arrRoles.includes(r as Role)))
			}
		},
		hasPermission(state) {
			return (permission: string) => state.permissions.includes(permission)
		}
	},
	persist: {
		omit: ["user"]
	}
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
