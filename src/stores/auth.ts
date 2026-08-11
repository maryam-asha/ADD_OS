import type { AdminUser, Role, Roles } from "@/types/auth.d"
import _castArray from "lodash/castArray"
import { acceptHMRUpdate, defineStore } from "pinia"
import { hasApiUrl } from "@/add-os/config/env"
import { getMe } from "@/add-os/services/auth"

/** ADD OS only ever gates on admin|operations — pick whichever the account holds. */
function primaryRole(roles: string[] | undefined): Role | null {
	if (roles?.includes("admin")) return "admin"
	if (roles?.includes("operations")) return "operations"
	return null
}

export const useAuthStore = defineStore("auth", {
	state: () => ({
		logged: false,
		role: null as Role | null,
		user: {} as Partial<AdminUser>
	}),
	actions: {
		setLogged(user: AdminUser) {
			this.logged = true
			this.role = primaryRole(user.roles)
			this.user = user
		},
		/** Clears local state only — callers that need the server session revoked call logout() first. */
		setLogout() {
			this.logged = false
			this.role = null
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
				this.setLogged(await getMe())
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
		isRoleGranted(state) {
			return (roles?: Roles) => {
				if (!roles) {
					return true
				}
				if (!state.role) {
					return false
				}

				const arrRoles: Role[] = _castArray(roles)

				if (arrRoles.includes("all")) {
					return true
				}

				return arrRoles.includes(state.role)
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
