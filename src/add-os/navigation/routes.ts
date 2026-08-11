import type { RouteRecordRaw } from "vue-router"
import ComingSoon from "@/add-os/views/ComingSoon.vue"
import { NAV_SECTIONS, navPageTitleKey, navRouteName, navRoutePath, navSectionTitleKey } from "./sections"

/**
 * ADD OS — routes generated from `./sections.ts`.
 *
 * The sidebar is built from the same list, so a menu entry cannot point at a
 * route that does not exist, and a route cannot go unreachable from the menu.
 *
 * Every page currently renders the shared ComingSoon placeholder — including the
 * pages of the two ACTIVE sections, whose real screens come next. Switching one
 * over means replacing `component` for that page; nothing else moves.
 *
 * `meta.title` holds an i18n KEY, not a label. `Toolbar/Breadcrumb.vue` and
 * `ComingSoon.vue` both translate it, so headings follow the language.
 *
 * ComingSoon is imported statically on purpose: all 28 pages share it, and lazy
 * loading would emit the same chunk 28 times over.
 */
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
				component: ComingSoon,
				props: { titleKey: navPageTitleKey(page) },
				meta: { title: navPageTitleKey(page) }
			}))
		}
	})
}
