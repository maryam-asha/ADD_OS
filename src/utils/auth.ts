import type { RouteLocationNormalized } from "vue-router"
import type { RouteMetaAuth } from "@/types/auth.d"
import { useAuthStore } from "@/stores/auth"

export function authCheck(route: RouteLocationNormalized): string | false | void {
	const { checkAuth, authRedirect, auth, roles }: RouteMetaAuth = route.meta
	const authStore = useAuthStore()

	// Logout handling
	if (route?.redirectedFrom?.name === "Logout") authStore.setLogout()

	// Auth check: if not logged or role not granted
	const loginPath = `/login${window.location.search}`

	if (auth && (!authStore.isLogged || (roles && !authStore.isRoleGranted(roles)))) {
		window.location.replace(loginPath)
		return loginPath
	}

	// If checkAuth is true and user is logged in
	if (checkAuth && authStore.isLogged) {
		return !roles || authStore.isRoleGranted(roles) ? authRedirect || "/" : route.path
	}
}
