import type { RouteLocationNormalized, RouteLocationRaw } from "vue-router"
import type { RouteMetaAuth } from "@/types/auth.d"
import { useAuthStore } from "@/stores/auth"

/** Query key `/login` carries the page the caller was sent away from. */
export const REDIRECT_QUERY = "redirect"

/**
 * The in-app path to land on after sign-in, or "/" when there is none.
 *
 * Only a same-origin absolute path is accepted: `//host` and `/\host` are
 * protocol-relative to a browser, so a crafted `?redirect=` would otherwise
 * turn the sign-in page into an open redirect. `/login` itself is refused so a
 * signed-in caller can never be bounced back onto the page that bounced them.
 */
export function safeRedirect(raw: unknown): string {
	const value = Array.isArray(raw) ? raw[0] : raw
	if (typeof value !== "string") return "/"
	if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/"
	if (value === "/login" || value.startsWith("/login?") || value.startsWith("/login#")) return "/"
	return value
}

/**
 * ADD OS replacement for the vendor `authCheck()` (`src/utils/auth.ts`, left
 * on disk unrouted). Two changes, both about where the caller ends up:
 *
 *   · a signed-out caller is sent to `/login?redirect=<the page they asked for>`
 *     by a router redirect. The vendor built the login URL from
 *     `window.location.search` — the page being LEFT, not the one requested —
 *     and hard-reloaded, so the destination was lost every time.
 *   · a signed-in caller who reaches `/login` is sent straight on to that
 *     `redirect`, or home, instead of being shown the sign-in form.
 *
 * A signed-in caller whose role is not granted still goes to `/login`, but
 * without a `redirect`: carrying the refused page along would bounce them
 * straight back to it and loop.
 */
export function authGuard(route: RouteLocationNormalized): RouteLocationRaw | void {
	const { checkAuth, authRedirect, auth, roles }: RouteMetaAuth = route.meta
	const authStore = useAuthStore()

	if (route.redirectedFrom?.name === "Logout") authStore.setLogout()

	if (auth) {
		if (!authStore.isLogged) return { path: "/login", query: { [REDIRECT_QUERY]: route.fullPath } }
		if (roles && !authStore.isRoleGranted(roles)) return { path: "/login" }
		return
	}

	if (checkAuth && authStore.isLogged && (!roles || authStore.isRoleGranted(roles))) {
		const requested = route.query[REDIRECT_QUERY]
		return requested === undefined ? authRedirect || "/" : safeRedirect(requested)
	}
}
