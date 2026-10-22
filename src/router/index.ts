import { watch } from "vue"
import { createRouter, createWebHistory } from "vue-router"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { homePath } from "@/add-os/navigation/access"
import { authGuard } from "@/add-os/navigation/authGuard"
import { createAddOsRoutes } from "@/add-os/navigation/routes"
import { i18nGlobal } from "@/lang"
import { Layout } from "@/types/theme.d"

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
			// ADD OS: the provider portal for providers; the dashboard for anyone
			// with a panel on it; else HOME_REDIRECT for admin and operations, and
			// the first page they may open for anyone else (`navigation/access.ts`).
			redirect: () => homePath()
		},

		...createAddOsRoutes(),

		{
			path: "/provider/suspended",
			name: "ProviderSuspended",
			component: () => import("@/add-os/modules/provider-portal/views/ProviderSuspendedPage.vue"),
			meta: {
				title: "providerPortal.suspended.title",
				auth: true,
				roles: ["provider"],
				theme: { layout: Layout.Blank, boxed: { enabled: false }, padded: { enabled: false } },
				skipPin: true
			}
		},

		{
			path: "/login",
			name: "Login",
			// ADD OS: ours, not the vendor page. The Pinx `views/Auth/Login.vue`
			// shipped a floating runtime control that repainted the panel from the
			// chart ramp, and its form strings were untranslated English literals.
			component: () => import("@/add-os/modules/auth/views/LoginPage.vue"),
			meta: {
				title: "auth.signIn.submit",
				theme: { layout: Layout.Blank, boxed: { enabled: false }, padded: { enabled: false } },
				// Sign-in is the one auth route that SHOULD bounce a signed-in caller:
				// there is nothing for them to do here. The two password routes below
				// deliberately do not — see the note on `/forgot-password`.
				checkAuth: true,
				skipPin: true
			}
		},
		{
			path: "/forgot-password",
			name: "ForgotPassword",
			// ADD OS: its own view now, rather than `views/Auth/Login.vue` driven by a
			// `formType` prop. Nothing under `views/Auth` or `components/auth` is
			// imported any more; those files stay on disk, unrouted, like the removed
			// Pinx demo views.
			component: () => import("@/add-os/modules/auth/views/ForgotPasswordPage.vue"),
			meta: {
				title: "auth.forgotPassword.title",
				theme: { layout: Layout.Blank, boxed: { enabled: false }, padded: { enabled: false } },
				// REVERSAL (2026-08-30). This carried `checkAuth: true`, copied from
				// `/login`. Measured: with a session in the store `authCheck()` returns
				// "/", so the page was unreachable — which is how it was reported.
				//
				// Given up by dropping it: a signed-in admin can now open a page they
				// arguably do not need. Bought: the page works when the store says
				// "signed in" and the server disagrees — a stale persisted `logged`,
				// which `initSession()` cannot clear while VITE_API_URL is empty
				// (see CLAUDE.md, Open · Infra). The server is the authority here, and
				// it answers: Fortify replies 409 to an authenticated caller, which
				// `ForgotPasswordPage.vue` already turns into its own message. That
				// branch was unreachable while the guard ran first.
				skipPin: true
			}
		},
		{
			path: "/reset-password",
			name: "ResetPassword",
			component: () => import("@/add-os/modules/auth/views/ResetPasswordPage.vue"),
			meta: {
				title: "auth.resetPassword.title",
				theme: { layout: Layout.Blank, boxed: { enabled: false }, padded: { enabled: false } },
				// Same reversal, and here it was the worse bug: this route is reached
				// from the emailed link, `?token=…&email=…`. Bouncing a caller whose
				// store still says "signed in" left them with a valid token they could
				// never spend — the one case where the page MUST render.
				skipPin: true
			}
		},
		{
			path: "/logout",
			name: "Logout",
			redirect: "/login"
		},
		{
			path: "/500",
			name: "ServerError",
			component: () => import("@/add-os/modules/errors/views/ServerErrorPage.vue"),
			meta: {
				title: "errors.serverError.title",
				theme: { layout: Layout.Blank, boxed: { enabled: false }, padded: { enabled: false } },
				skipPin: true
			}
		},
		{
			path: "/:pathMatch(.*)*",
			name: "NotFound",
			component: () => import("@/add-os/modules/errors/views/NotFoundPage.vue"),
			meta: {
				title: "errors.notFound.title",
				theme: { layout: Layout.Blank, boxed: { enabled: false }, padded: { enabled: false } },
				skipPin: true
			}
		}
	]
})

export function updateDocumentTitle(route = router.currentRoute.value): void {
	const baseTitle = "ADD | Aleppo Digital District"
	const rawTitle = route.meta?.title as string | undefined
	if (rawTitle) {
		const locale = currentLocale.value
		const translated = i18nGlobal.te(rawTitle, locale)
			? i18nGlobal.t(rawTitle, {}, { locale })
			: (i18nGlobal.te(rawTitle) ? i18nGlobal.t(rawTitle) : rawTitle)
		document.title = `${translated} | ${baseTitle}`
	} else {
		document.title = baseTitle
	}
}

router.beforeEach(route => {
	return authGuard(route)
})

router.afterEach(to => {
	updateDocumentTitle(to)
})

watch(currentLocale, () => {
	updateDocumentTitle()
})

export default router
