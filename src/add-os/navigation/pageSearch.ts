import type { SupportedLocale } from "@/add-os/lang/locales"
import type { NavPage, NavSection } from "@/add-os/navigation/sections"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import { maySeeSection, menuPages } from "@/add-os/navigation/access"
import { NAV_GROUPS, NAV_SECTIONS, navGroupTitleKey, navPageTitleKey, navRouteName, navRoutePath, navSectionTitleKey } from "@/add-os/navigation/sections"

/**
 * ADD OS — what the toolbar search (Ctrl/⌘ K) offers: the dashboard's own pages.
 *
 * It replaced the Pinx command palette on 2026-11-09, whose entries were fixed
 * demo values — "Add todo list", "Compose new email", three invented contacts —
 * each pointing at a template route ADD OS never registered.
 *
 * The list is read from `sections.ts` through `navigation/access.ts`, the same
 * pair the sidebar and the route guard read, so search never offers a page the
 * account would be turned away from, and a page added to `sections.ts` is
 * searchable with no change here. Hidden detail pages (`hidden`, a `:param`
 * to fill) are left out, exactly as the sidebar leaves them out. The avatar
 * menu's sections (My HR) are included: they are pages the account may open.
 *
 * A page matches on its title and its section's (and group's) title in BOTH
 * languages, and on its URL — staff type "invoices" with the interface in
 * Arabic as often as "الفواتير".
 */

export interface PageSearchEntry {
	/** Route name, e.g. "payments.invoices" — also the entry's stable key. */
	name: string
	/** Absolute path, e.g. "/payments/invoices". */
	path: string
	/** The page's own icon, else its section's. Always a bundled carbon name. */
	icon: string
	/** i18n key of the page title. */
	titleKey: string
	/** i18n key of the section title — the heading the entry is listed under. */
	sectionTitleKey: string
	/** i18n key of the group title, for a section folded into one (HR's modules). */
	groupTitleKey: string | null
	/** Route of the section's coming-soon placeholder rather than a built screen. */
	comingSoon: boolean
	/** Normalised text the query is matched against: titles in every language, plus the path. */
	haystack: string
}

const BUNDLES: Record<SupportedLocale, unknown> = { ar, en }

function message(locale: SupportedLocale, key: string): string {
	const value = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], BUNDLES[locale])
	return typeof value === "string" ? value : ""
}

/**
 * Folds text so a query matches regardless of how it was typed: case, Arabic
 * diacritics and tatweel, the alef forms (أ إ آ ٱ → ا), ة → ه and ى → ي — the
 * spellings a keyboard varies on.
 */
export function normalizeSearchText(text: string): string {
	return text
		.toLowerCase()
		// Combining marks — the Arabic harakat and superscript alef among them — and tatweel (U+0640).
		.replace(/[\p{Mn}ـ]/gu, "")
		.replace(/[آأإٱ]/g, "ا")
		.replace(/ة/g, "ه")
		.replace(/ى/g, "ي")
		.replace(/\s+/g, " ")
		.trim()
}

/** The words of a query, normalised. An empty query has none. */
export function searchWords(query: string): string[] {
	return normalizeSearchText(query).split(" ").filter(Boolean)
}

function entry(section: NavSection, page: NavPage): PageSearchEntry {
	const group = section.group ? NAV_GROUPS[section.group] : null
	const keys = [navPageTitleKey(page), navSectionTitleKey(section), ...(group ? [navGroupTitleKey(group)] : [])]
	const path = navRoutePath(section, page)
	const texts = [...keys.flatMap(key => (Object.keys(BUNDLES) as SupportedLocale[]).map(locale => message(locale, key))), path]

	return {
		name: navRouteName(section, page),
		path,
		icon: page.icon ?? section.icon,
		titleKey: navPageTitleKey(page),
		sectionTitleKey: navSectionTitleKey(section),
		groupTitleKey: group ? navGroupTitleKey(group) : null,
		comingSoon: section.status === "coming-soon",
		haystack: normalizeSearchText(texts.join(" "))
	}
}

/** Every page the signed-in account may open from a menu, in sidebar order. */
export function searchablePages(): PageSearchEntry[] {
	return NAV_SECTIONS.filter(maySeeSection).flatMap(section => menuPages(section).map(page => entry(section, page)))
}

/** The entries every word of the query appears in. An empty query keeps them all. */
export function filterPages(entries: readonly PageSearchEntry[], query: string): PageSearchEntry[] {
	const words = searchWords(query)
	if (!words.length) return [...entries]
	return entries.filter(candidate => words.every(word => candidate.haystack.includes(word)))
}
