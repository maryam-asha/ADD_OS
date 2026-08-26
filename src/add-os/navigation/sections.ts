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
			{ key: "seatsDesks", path: "seats-desks" },
			{ key: "businessHours", path: "business-hours" }
		]
	},
	{
		key: "system",
		path: "/system",
		icon: "carbon:user-admin",
		status: "active",
		/**
		 * Global settings sits here, with Users and Roles, rather than in the
		 * `settings` section below — where a `systemSettings` placeholder pointing at
		 * `/settings/system` stood until 2026-08-26.
		 *
		 * The two sections divide on WHOSE settings they are, not on the word:
		 * `settings` is the signed-in operator's own account (Account & security),
		 * while these keys are platform-wide plumbing an admin changes for everybody
		 * — the same class of thing as promoting an account or editing a role. The
		 * backend agrees on where the boundary is: `PATCH /admin/settings/{key}` sits
		 * inside the very same `role:admin` group as every Users and Roles route.
		 *
		 * WHAT THIS GAVE UP: the `/settings/system` URL, and the reading that a
		 * section named "Settings" owns everything called a setting. Nothing links to
		 * that path yet, so there is nothing to redirect; if that changes, add a
		 * redirect rather than moving the page back and re-splitting the two ideas.
		 *
		 * Last in the list on purpose — a section redirects to its FIRST page, and
		 * `/system` should keep landing on Users.
		 */
		pages: [
			{ key: "users", path: "users" },
			{ key: "roles", path: "roles" },
			{ key: "globalSettings", path: "settings" }
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
		status: "active",
		/**
		 * Reception-desk pages lead, and that ordering is deliberate rather than
		 * alphabetical or historical: a section redirects to its FIRST page, so
		 * putting the two built screens ahead of the two placeholders is what
		 * makes `/bookings` land somewhere useful. `payments` shows the other
		 * outcome — it is active, but its first page is still ComingSoon.
		 *
		 * These two live here rather than under a new "Reception" section even
		 * though their endpoints sit under `reception/`. The precedent is
		 * `payments.walletTopUps`, which posts to `reception/wallet-top-ups` and
		 * is nonetheless filed under Payments: the URL prefix names the backend
		 * team that owns the endpoint, not the operator's mental model. A 14th
		 * top-level section also has a cost the other three do not — see the
		 * horizontal-nav note in `.claude/rules/shell-and-controls.md`.
		 */
		pages: [
			{ key: "approvalQueue", path: "approval-queue" },
			{ key: "activeSessions", path: "active-sessions" },
			/**
			 * The kiosk's arrival queue lands here rather than in a "Kiosk" section
			 * of its own, applying the rule above rather than making a new one: an
			 * arriving member is handled at the reception desk by the operator
			 * already working the two queues above it, and `arrival-requests` sits
			 * under the same `reception/` prefix `approvalQueue` and
			 * `activeSessions` do. A Kiosk section would have been the 14th.
			 *
			 * Its sibling page, Announcements, went to `cms` instead — the two are
			 * one feature to the backend but two different jobs to two different
			 * operators, and this list is ordered by the operator's day.
			 */
			{ key: "arrivalRequests", path: "arrival-requests" },
			{ key: "allBookings", path: "all" },
			{ key: "calendar", path: "calendar" }
		]
	},
	{
		key: "plans",
		path: "/plans",
		icon: "carbon:license",
		status: "active",
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
		status: "active",
		pages: [
			{ key: "transactions", path: "transactions" },
			{ key: "paymentMethods", path: "methods" },
			{ key: "exchangeRates", path: "exchange-rates" },
			// Sits after exchange-rates on purpose: the rates form's currency
			// options are rows of this resource, so the pair reads in the order
			// they depend on each other.
			{ key: "currencies", path: "currencies" },
			{ key: "walletTopUps", path: "wallet-top-ups" }
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
		status: "active",
		/**
		 * Kiosk banner content is content management, so it lives here rather than
		 * beside the arrival queue it ships with — the operator who schedules a
		 * banner is not the operator working the reception desk.
		 *
		 * Announcements leads the list deliberately: a section redirects to its
		 * FIRST page, and `content`/`partners` are still ComingSoon, so any other
		 * order would make `/cms` land on a placeholder the moment the section went
		 * active. Same consideration the `bookings` ordering note records.
		 */
		pages: [
			{ key: "announcements", path: "announcements" },
			{ key: "content", path: "content" },
			{ key: "partners", path: "partners" }
		]
	},
	{
		key: "settings",
		path: "/settings",
		icon: "carbon:settings",
		status: "coming-soon",
		/**
		 * REVERSAL, 2026-08-26: `{ key: "systemSettings", path: "system" }` was
		 * removed from this list. It was a ComingSoon placeholder for exactly the
		 * screen that shipped that day as `system.globalSettings`, so leaving it
		 * would have put a second "System settings" entry in the sidebar promising a
		 * page that already existed one section up — a nav entry that can only
		 * mislead, which is what invariant 4 is about. Its `nav.pages.systemSettings`
		 * key came out of both catalogues in the same change.
		 *
		 * What that gave up is recorded on the `system` section above. This section
		 * now holds one page, which is fine: it is the operator's own account, and
		 * `/settings` redirects to it.
		 */
		pages: [{ key: "accountSecurity", path: "account" }]
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
