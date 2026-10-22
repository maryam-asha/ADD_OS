import type { DropdownOption } from "naive-ui"
import { renderIcon } from "@/utils"
import { accountMenuSections, menuPages } from "./access"
import { navPageTitleKey, navRouteName, navSectionTitleKey } from "./sections"

/**
 * ADD OS — the avatar menu's share of `sections.ts`: each `accountMenu`
 * section this account may see (My HR, since 2026-10-22) as a titled group of
 * its pages. Keys are `route-<route name>`, which the avatar menu routes.
 *
 * `t` comes from the caller's `computed`, so the labels follow the language.
 */
export function accountMenuOptions(t: (key: string) => string): DropdownOption[] {
	return accountMenuSections().map(section => ({
		type: "group",
		key: section.key,
		label: t(navSectionTitleKey(section)),
		children: menuPages(section).map(page => ({
			key: `route-${navRouteName(section, page)}`,
			label: t(navPageTitleKey(page)),
			icon: page.icon ? renderIcon(page.icon) : undefined
		}))
	}))
}
