/**
 * ADD OS — the operational map of the dashboard.
 *
 * ONE definition drives BOTH the sidebar menu and the router. Keeping them in
 * separate files is how a menu entry ends up pointing at a route that no longer
 * exists, so they are derived from this list instead:
 *
 *   sections.ts  ──▶  app-layouts/common/Navbar/items.tsx   (the menu)
 *                └─▶  add-os/navigation/routes.ts           (the routes)
 *
 * Sections are ordered by operational flow, not alphabetically.
 *
 * ── Labels ──────────────────────────────────────────────────────────────────
 * `key` is an i18n key, never a label:
 *   section → `nav.sections.<key>`      page → `nav.pages.<key>`
 * Two namespaces, because a section and a page can share a name — "community"
 * is both — and a key cannot be a string and an object at once.
 *
 * ── Status ──────────────────────────────────────────────────────────────────
 * `coming-soon` sections render dimmed with a badge and route to the shared
 * ComingSoon page. Pages of `active` sections point there too for now; they
 * switch over one at a time as real screens land, by changing this file and
 * nothing else.
 *
 * ── Icons ───────────────────────────────────────────────────────────────────
 * All from `carbon`, so the sidebar reads as one family. Every name is bundled
 * locally — run `npm run icons` after changing one, or the icon guard fails.
 */

export type SectionStatus = "active" | "coming-soon"

export interface NavPage {
	/** i18n key under `nav.pages`, and the route-name suffix. */
	key: string
	/** URL segment, appended to the section path. */
	path: string
}

export interface NavSection {
	/** i18n key under `nav.sections`, and the route-name prefix. */
	key: string
	/** Absolute base path for the section. */
	path: string
	/** Iconify name — must exist in the locally bundled sets. */
	icon: string
	status: SectionStatus
	pages: NavPage[]
}

export const NAV_SECTIONS: readonly NavSection[] = [
	{
		key: "dashboard",
		path: "/dashboard",
		icon: "carbon:dashboard",
		status: "coming-soon",
		pages: [{ key: "overview", path: "overview" }]
	},
	{
		key: "spatial",
		path: "/spatial",
		icon: "carbon:building",
		status: "active",
		pages: [
			{ key: "branches", path: "branches" },
			{ key: "buildings", path: "buildings" },
			{ key: "floors", path: "floors" },
			{ key: "zones", path: "zones" },
			{ key: "spaces", path: "spaces" },
			{ key: "resources", path: "resources" },
			{ key: "seatsDesks", path: "seats-desks" }
		]
	},
	{
		key: "system",
		path: "/system",
		icon: "carbon:user-admin",
		status: "active",
		pages: [
			{ key: "users", path: "users" },
			{ key: "roles", path: "roles" }
		]
	},
	{
		key: "members",
		path: "/members",
		icon: "carbon:user-multiple",
		status: "active",
		pages: [
			{ key: "individuals", path: "individuals" },
			{ key: "companies", path: "companies" },
			{ key: "memberships", path: "memberships" }
		]
	},
	{
		key: "bookings",
		path: "/bookings",
		icon: "carbon:calendar",
		status: "coming-soon",
		pages: [
			{ key: "allBookings", path: "all" },
			{ key: "calendar", path: "calendar" }
		]
	},
	{
		key: "plans",
		path: "/plans",
		icon: "carbon:license",
		status: "coming-soon",
		pages: [
			{ key: "packages", path: "packages" },
			{ key: "wallet", path: "wallet" }
		]
	},
	{
		key: "access",
		path: "/access",
		icon: "carbon:locked",
		status: "coming-soon",
		pages: [
			{ key: "locks", path: "locks" },
			{ key: "accessLogs", path: "logs" }
		]
	},
	{
		key: "payments",
		path: "/payments",
		icon: "carbon:currency",
		status: "coming-soon",
		pages: [
			{ key: "transactions", path: "transactions" },
			{ key: "paymentMethods", path: "methods" },
			{ key: "exchangeRates", path: "exchange-rates" }
		]
	},
	{
		key: "community",
		path: "/community",
		icon: "carbon:events",
		status: "coming-soon",
		pages: [
			{ key: "events", path: "events" },
			{ key: "community", path: "directory" },
			{ key: "cafe", path: "cafe" }
		]
	},
	{
		key: "incubation",
		path: "/incubation",
		icon: "carbon:rocket",
		status: "coming-soon",
		pages: [
			{ key: "incubate", path: "incubate" },
			{ key: "accelerate", path: "accelerate" },
			{ key: "mentors", path: "mentors" }
		]
	},
	{
		key: "address",
		path: "/address",
		icon: "carbon:enterprise",
		status: "active",
		pages: [{ key: "privateOfficeRequests", path: "private-office-requests" }]
	},
	{
		key: "cms",
		path: "/cms",
		icon: "carbon:document",
		status: "coming-soon",
		pages: [
			{ key: "content", path: "content" },
			{ key: "partners", path: "partners" }
		]
	},
	{
		key: "settings",
		path: "/settings",
		icon: "carbon:settings",
		status: "coming-soon",
		pages: [
			{ key: "accountSecurity", path: "account" },
			{ key: "systemSettings", path: "system" }
		]
	}
]

/** Stable route name shared by the menu and the router, e.g. "spatial.branches". */
export function navRouteName(section: NavSection, page: NavPage): string {
	return `${section.key}.${page.key}`
}

/** Absolute path for a page, e.g. "/spatial/branches". */
export function navRoutePath(section: NavSection, page: NavPage): string {
	return `${section.path}/${page.path}`
}

/** i18n key for a page title — used by the router's `meta.title` and by ComingSoon. */
export function navPageTitleKey(page: NavPage): string {
	return `nav.pages.${page.key}`
}

/** i18n key for a section title. */
export function navSectionTitleKey(section: NavSection): string {
	return `nav.sections.${section.key}`
}

/**
 * Where "/" lands.
 *
 * Deliberately the first ACTIVE section rather than the dashboard: the dashboard
 * is scheduled last, so pointing home at it would leave the landing page saying
 * "coming soon" for most of the build. This becomes genuinely useful the moment
 * the first real screen ships. Revisit once the dashboard exists.
 */
export const HOME_REDIRECT = "/spatial/branches"
