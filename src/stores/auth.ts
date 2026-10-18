import type { AdminUser, Role, Roles } from "@/types/auth.d"
import _castArray from "lodash/castArray"
import { acceptHMRUpdate, defineStore } from "pinia"
import { hasApiUrl } from "@/add-os/config/env"
import { getMe } from "@/add-os/services/auth"

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
				// A member who is also an employee signs in for My HR.
				const isMemberOnly = Boolean(user.roles?.length && user.roles.every(r => r === "member")) && !user.employee
				if (isMemberOnly) {
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
		isMemberOnly(state) {
			return Boolean(state.user?.roles?.length && state.user.roles.every(r => r === "member")) && !state.user?.employee
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

				// If gating on general admin dashboard:
				if (arrRoles.includes("admin") && arrRoles.includes("operations")) {
					return !isProv && !isMember
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
		}
	},
	persist: {
		omit: ["user"]
	}
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
