import type { DropdownOption } from "naive-ui"
import { renderIcon } from "@/utils"
import { accountMenuSections, menuPages } from "./access"
import { navRouteName, navSectionTitleKey } from "./sections"

/**
 * ADD OS — the avatar menu's share of `sections.ts`: one entry for each
 * `accountMenu` section this account may see (My HR, since 2026-10-22),
 * opening its first page. Its other pages are reached from the section's own
 * vertical menu (MyHrLayout.vue). Keys are `route-<route name>`, which the
 * avatar menu routes.
 *
 * `t` comes from the caller's `computed`, so the labels follow the language.
 */
export function accountMenuOptions(t: (key: string) => string): DropdownOption[] {
	return accountMenuSections().map(section => ({
		key: `route-${navRouteName(section, menuPages(section)[0])}`,
		label: t(navSectionTitleKey(section)),
		icon: renderIcon(section.icon)
	}))
}
