import type { FormType } from "@/components/auth/types.d"
import { createRouter, createWebHistory } from "vue-router"
import { createAddOsRoutes } from "@/add-os/navigation/routes"
import { HOME_REDIRECT } from "@/add-os/navigation/sections"
import { Layout } from "@/types/theme.d"
import { authCheck } from "@/utils/auth"

/**
 * ADD OS route table.
 *
 * The Pinx demo routes — Dashboard, Apps, Calendars, Cards, Charts, Tables, Maps,
 * Editors, Layout, Toolbox, Icons, Typography, MultiLanguage, Profile, and the
 * 466-line `./components.ts` — were removed from the router. Their `views/` files
 * stay on disk, simply unrouted, and drop out of the bundle because nothing
 * imports them any more.
 *
 * The operational sections come from `@/add-os/navigation/sections`, which also
 * builds the sidebar. Everything below that list is infrastructure the template
 * provided and ADD OS still needs: the auth guard, the auth screens, and 404.
 */
const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: "/",
			// ADD OS: the first ACTIVE section, not the dashboard. The dashboard is
			// scheduled last, so pointing home at it would leave the landing page
			// saying "coming soon" for most of the build. Revisit once it exists.
			redirect: HOME_REDIRECT
		},

		...createAddOsRoutes(),

		{
			path: "/login",
			name: "Login",
			component: () => import("@/views/Auth/Login.vue"),
			meta: {
				title: "Login",
				theme: { layout: Layout.Blank, boxed: { enabled: false }, padded: { enabled: false } },
				checkAuth: true,
				skipPin: true
			}
		},
		{
			path: "/register",
			name: "Register",
			component: () => import("@/views/Auth/Login.vue"),
			props: { formType: "signup" as FormType },
			meta: {
				title: "Register",
				theme: { layout: Layout.Blank, boxed: { enabled: false }, padded: { enabled: false } },
				checkAuth: true,
				skipPin: true
			}
		},
		{
			path: "/forgot-password",
			name: "ForgotPassword",
			component: () => import("@/views/Auth/Login.vue"),
			props: { formType: "forgotpassword" as FormType },
			meta: {
				title: "Forgot Password",
				theme: { layout: Layout.Blank, boxed: { enabled: false }, padded: { enabled: false } },
				checkAuth: true,
				skipPin: true
			}
		},
		{
			path: "/logout",
			name: "Logout",
			redirect: "/login"
		},
		{
			path: "/:pathMatch(.*)*",
			name: "NotFound",
			component: () => import("@/views/NotFound.vue"),
			meta: {
				theme: { layout: Layout.Blank, boxed: { enabled: false }, padded: { enabled: false } },
				skipPin: true
			}
		}
	]
})

router.beforeEach(route => {
	return authCheck(route)
})

export default router
