import type { RouteRecordRaw } from "vue-router"
import ComingSoon from "@/add-os/views/ComingSoon.vue"
import { NAV_SECTIONS, navPageTitleKey, navRouteName, navRoutePath, navSectionTitleKey } from "./sections"

/**
 * ADD OS — routes generated from `./sections.ts`.
 *
 * The sidebar is built from the same list, so a menu entry cannot point at a
 * route that does not exist, and a route cannot go unreachable from the menu.
 *
 * Most pages still render the shared ComingSoon placeholder. Pages with a real
 * screen are listed in `PAGE_COMPONENTS` below; switching one over means adding
 * it there — nothing else moves.
 *
 * `meta.title` holds an i18n KEY, not a label. `Toolbar/Breadcrumb.vue` and
 * `ComingSoon.vue` both translate it, so headings follow the language.
 *
 * ComingSoon is imported statically on purpose: the remaining placeholder pages
 * share it, and lazy loading would emit the same chunk once per page.
 *
 * Real pages, by contrast, are lazy on purpose and must stay that way. A static
 * import here pulls each page's whole module graph — view → service →
 * `services/api.ts` → `@/router` → back into this file — into this module's own
 * evaluation, and that cycle leaves `NAV_SECTIONS` uninitialised at the moment
 * `createAddOsRoutes()` runs ("Cannot access '__vite_ssr_import_N__' before
 * initialization"). Deferring to a factory means the page graph is only touched
 * once the router actually navigates, long after every module has settled.
 */

/** Pages with a real screen. Everything else still falls back to ComingSoon. */
const PAGE_COMPONENTS: Record<string, () => Promise<unknown>> = {
	"system.roles": () => import("@/add-os/modules/system/views/RolesPage.vue"),
	"system.users": () => import("@/add-os/modules/system/views/UsersPage.vue"),
	"spatial.branches": () => import("@/add-os/modules/spatial/views/BranchesPage.vue"),
	"spatial.buildings": () => import("@/add-os/modules/spatial/views/BuildingsPage.vue"),
	"spatial.floors": () => import("@/add-os/modules/spatial/views/FloorsPage.vue"),
	"spatial.zones": () => import("@/add-os/modules/spatial/views/ZonesPage.vue"),
	"spatial.spaces": () => import("@/add-os/modules/spatial/views/SpacesPage.vue"),
	"spatial.resources": () => import("@/add-os/modules/spatial/views/ResourcesPage.vue"),
	"spatial.seatsDesks": () => import("@/add-os/modules/spatial/views/SeatsDesksPage.vue")
}

export function createAddOsRoutes(): RouteRecordRaw[] {
	return NAV_SECTIONS.map(section => {
		const [firstPage] = section.pages

		return {
			path: section.path,
			redirect: navRoutePath(section, firstPage),
			meta: {
				auth: true,
				roles: "all",
				titleKey: navSectionTitleKey(section)
			},
			children: section.pages.map(page => ({
				path: page.path,
				name: navRouteName(section, page),
				component: PAGE_COMPONENTS[navRouteName(section, page)] ?? ComingSoon,
				props: { titleKey: navPageTitleKey(page) },
				meta: { title: navPageTitleKey(page) }
			}))
		}
	})
}
