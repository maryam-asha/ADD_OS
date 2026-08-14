import type { RouteRecordRaw } from "vue-router"
import BranchesPage from "@/add-os/modules/spatial/views/BranchesPage.vue"
import RolesPage from "@/add-os/modules/system/views/RolesPage.vue"
import UsersPage from "@/add-os/modules/system/views/UsersPage.vue"
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
 */

/** Pages with a real screen. Everything else still falls back to ComingSoon. */
const PAGE_COMPONENTS: Record<string, unknown> = {
	"system.roles": RolesPage,
	"system.users": UsersPage,
	"spatial.branches": BranchesPage
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
