import type { MenuMixedOption } from "naive-ui/es/menu/src/interface"
import type { NavGroup, NavPage, NavSection } from "@/add-os/navigation/sections"
import { NTag } from "naive-ui"
import { h } from "vue"
import { RouterLink } from "vue-router"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { menuPages, sidebarSections } from "@/add-os/navigation/access"
import { NAV_GROUPS, navGroupMenuKey, navGroupTitleKey, navPageTitleKey, navRouteName, navSectionTitleKey } from "@/add-os/navigation/sections"
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
 * not exist. Sections sharing a `group` there render as modules under one entry
 * (HR's six admin sections, since 2026-10-22): entry → module → page. An
 * `accountMenu` section (My HR) is the avatar menu's, not this one's — see
 * `sidebarSections()`.
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
		icon: page.icon ? renderIcon(page.icon) : undefined,
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

/** A single-page section (e.g. Dashboard) rendered directly as a top-level link, without a dropdown. */
function directSectionOption(section: NavSection, page: NavPage, collapsed: boolean): MenuMixedOption {
	const name = navRouteName(section, page)
	const soon = section.status === "coming-soon"

	return {
		key: name,
		icon: sectionIcon(section),
		label: () =>
			h(
				RouterLink,
				{ to: { name }, class: soon ? "add-os-nav-soon" : undefined },
				{
					default: () =>
						soon && !collapsed ? (
							<span class="add-os-nav-soon add-os-nav-section">
								<span class="add-os-nav-section__text">{t(navSectionTitleKey(section))}</span>
								<NTag size="tiny" round bordered={false} class="add-os-nav-section__badge">
									{t("common.comingSoon")}
								</NTag>
							</span>
						) : (
							t(navSectionTitleKey(section))
						)
				}
			)
	}
}

function sectionOption(section: NavSection, collapsed: boolean): MenuMixedOption {
	const visiblePages = menuPages(section)

	// When a section has only one page (like Dashboard), render it as a direct link instead of a dropdown
	if (visiblePages.length === 1) {
		return directSectionOption(section, visiblePages[0], collapsed)
	}

	return {
		key: section.key,
		label: sectionLabel(section, collapsed),
		icon: sectionIcon(section),
		children: visiblePages.map(page => pageOption(section, page))
	}
}

/** One entry holding a group's sections, each a module that opens to its pages. */
function groupOption(group: NavGroup, modules: MenuMixedOption[]): MenuMixedOption {
	return {
		key: navGroupMenuKey(group),
		label: () => t(navGroupTitleKey(group)),
		icon: renderIcon(group.icon),
		children: modules
	}
}

export default function getItems(args: { mode: "vertical" | "horizontal"; collapsed: boolean }): MenuMixedOption[] {
	// Dependency on the active language — see the note above. Do not remove.
	void currentLocale.value

	// Who sees what is `navigation/access.ts`'s call, shared with the route
	// guard and the "/" redirect so the menu never offers a refused page.
	const visible = sidebarSections()
	const options: MenuMixedOption[] = []

	for (const section of visible) {
		const group = section.group
		const modules = group ? visible.filter(other => other.group === group) : []

		// A group this account sees one section of shows that section as it
		// stands: a parent with a single child is a click for nothing.
		if (!group || modules.length < 2) {
			options.push(sectionOption(section, args.collapsed))
		} else if (modules[0] === section) {
			options.push(groupOption(NAV_GROUPS[group], modules.map(module => sectionOption(module, args.collapsed))))
		}
	}

	return options
}
