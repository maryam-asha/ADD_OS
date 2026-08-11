import type { MenuMixedOption } from "naive-ui/es/menu/src/interface"
import type { NavPage, NavSection } from "@/add-os/navigation/sections"
import { NTag } from "naive-ui"
import { h } from "vue"
import { RouterLink } from "vue-router"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { NAV_SECTIONS, navPageTitleKey, navRouteName, navSectionTitleKey } from "@/add-os/navigation/sections"
import { i18nGlobal } from "@/lang"
import { renderIcon } from "@/utils"

/**
 * ADD OS — builds the sidebar from `@/add-os/navigation/sections`.
 *
 * The Pinx demo menu (apps / cards / charts / tables / maps / editors / layout /
 * toolbox, plus the "Multi level" and "Disabled item" samples) is gone. The group
 * files it imported — apps.ts, cards.ts, … — are no longer referenced; they stay
 * on disk, unused.
 *
 * This file holds RENDERING only. What the menu contains lives in `sections.ts`,
 * which the router reads too, so a menu entry cannot point at a route that does
 * not exist.
 *
 * ── Labels re-translate on language change ──────────────────────────────────
 * Reading `currentLocale.value` below registers a dependency in the caller's
 * `computed` (Navbar.vue), so the whole option tree is rebuilt when the language
 * changes. Without it the labels would be computed once and freeze in Arabic.
 */

function t(key: string): string {
	return i18nGlobal.t(key)
}

/** A page entry — always a real link, including for sections that are not built yet. */
function pageOption(section: NavSection, page: NavPage): MenuMixedOption {
	const name = navRouteName(section, page)
	const soon = section.status === "coming-soon"

	return {
		key: name,
		label: () =>
			h(
				RouterLink,
				{ to: { name }, class: soon ? "add-os-nav-soon" : undefined },
				{ default: () => t(navPageTitleKey(page)) }
			)
	}
}

/**
 * A section header. Sections that are not built yet are dimmed and carry a
 * "coming soon" badge, but stay expandable — the approved behaviour is a
 * placeholder page, not a dead entry.
 *
 * The badge is skipped while the sidebar is collapsed, where only the icon shows.
 */
function sectionLabel(section: NavSection, collapsed: boolean) {
	if (section.status === "active") {
		return () => t(navSectionTitleKey(section))
	}

	return () => (
		<span class="add-os-nav-soon add-os-nav-section">
			<span class="add-os-nav-section__text">{t(navSectionTitleKey(section))}</span>
			{!collapsed && (
				<NTag size="tiny" round bordered={false} class="add-os-nav-section__badge">
					{t("common.comingSoon")}
				</NTag>
			)}
		</span>
	)
}

/**
 * The section icon, wrapped so a deferred section's icon can recede.
 *
 * `renderIcon` returns a render function and the icon is a sibling of the label,
 * not a descendant — so the `.add-os-nav-soon` class on the label cannot reach
 * it. (The previous `opacity` on that class therefore dimmed the text only and
 * left the icon at full strength, which is not what it claimed to do.)
 *
 * The wrapper gives the icon its own hook. It recedes by COLOUR, never opacity:
 * opacity multiplies against whatever is behind it, so no ratio could be
 * asserted. See ComponentTokens.deferred in add-os/theme/tokens.ts.
 */
function sectionIcon(section: NavSection) {
	const icon = renderIcon(section.icon)

	if (section.status === "active") {
		return icon
	}

	return () => h("span", { class: "add-os-nav-soon-icon" }, [icon()])
}

export default function getItems(args: { mode: "vertical" | "horizontal"; collapsed: boolean }): MenuMixedOption[] {
	// Dependency on the active language — see the note above. Do not remove.
	void currentLocale.value

	return NAV_SECTIONS.map<MenuMixedOption>(section => ({
		key: section.key,
		label: sectionLabel(section, args.collapsed),
		icon: sectionIcon(section),
		children: section.pages.map(page => pageOption(section, page))
	}))
}
