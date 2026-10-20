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

import type { Roles } from "@/types/auth.d"

export type SectionStatus = "active" | "coming-soon"

export interface NavPage {
	/** i18n key under `nav.pages`, and the route-name suffix. */
	key: string
	/** URL segment, appended to the section path. */
	path: string
	/**
	 * Routable, but not offered in the sidebar — a detail screen reached from
	 * a row rather than from the menu, so its `:param` segment would have
	 * nothing to fill it if clicked cold. It still lives here so the route and
	 * the page stay defined in one place, which is the point of this file.
	 */
	hidden?: boolean
	permission?: string
	/**
	 * Iconify name drawn beside the page in the sidebar. Optional: most pages
	 * carry none and read by their label alone; it marks pages a quick glance
	 * should tell apart, like the app's content pages. Bundled like any icon.
	 */
	icon?: string
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
	roles?: Roles
	/** Shown and routable only for accounts with an HR employee record. */
	employee?: boolean
	permission?: string
}

export const NAV_SECTIONS: readonly NavSection[] = [
	{
		key: "dashboard",
		path: "/dashboard",
		icon: "carbon:dashboard",
		status: "active",
		// No section-level permission: the page shows one panel per
		// `dashboard.*` permission the account holds (config/permissions.ts),
		// and says so when it holds none.
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
			{ key: "spaceTypeAmenities", path: "space-type-amenities" },
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
			{ key: "memberProfile", path: "individuals/:id", hidden: true },
			{ key: "companies", path: "companies" },
			{ key: "companyProfile", path: "companies/:id", hidden: true },
			{ key: "memberships", path: "memberships" },
			{ key: "officeLeases", path: "office-leases" },
			{ key: "stoppedRenewals", path: "stopped-renewals" }
		]
	},
	{
		key: "providers",
		path: "/providers",
		icon: "carbon:partnership",
		status: "active",
		pages: [
			{ key: "list", path: "list" },
			{ key: "requests", path: "requests" }
		],
		roles: ["admin", "operations"]
	},
	{
		key: "providerPortal",
		path: "/provider",
		icon: "carbon:network-4",
		status: "active",
		pages: [
			{ key: "summary", path: "summary" },
			{ key: "companies", path: "companies" },
			{ key: "companyReport", path: "company-report" },
			{ key: "invoiceStatement", path: "invoice-statement" },
			{ key: "requests", path: "requests" },
			{ key: "officeRequests", path: "office-requests" },
			{ key: "officeLeases", path: "office-leases" },
			{ key: "invoices", path: "invoices" }
		],
		roles: ["provider"]
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
			{ key: "receptionDesk", path: "reception-desk" },
			{ key: "arrivals", path: "arrivals" },
			{ key: "approvalQueue", path: "approval-queue" },
			{ key: "activeSessions", path: "active-sessions" },
			{ key: "activeSessionDetail", path: "active-sessions/:type/:id", hidden: true },
			{ key: "closeSession", path: "close-session" },
			{ key: "closeSessionDetail", path: "close-session/:type/:id", hidden: true },
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
			{ key: "modules", path: "modules" },
			{ key: "resourceTypes", path: "resource-types" },
			{ key: "wallet", path: "wallet" },
			{ key: "coupons", path: "coupons" },
			{ key: "discountReport", path: "discount-report" },
			{ key: "offerReport", path: "offer-report" },
			{ key: "planPurchases", path: "plan-purchases" }
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
			{ key: "currencies", path: "currencies" },
			{ key: "exchangeRates", path: "exchange-rates" },
			{ key: "walletTopUps", path: "wallet-top-ups" },
			{ key: "cashRegister", path: "cash-register" },
			{ key: "invoices", path: "invoices" }
		]
	},
	{
		key: "reports",
		path: "/reports",
		icon: "carbon:chart-line",
		status: "active",
		pages: [
			{ key: "providersReport", path: "providers" },
			{ key: "revenueReport", path: "revenue" },
			// The figures the dashboard sums up, in full; each behind the
			// permission of the dashboard section it expands.
			{ key: "spacesReport", path: "spaces", permission: "dashboard.spaces" },
			{ key: "collectionsReport", path: "collections", permission: "dashboard.finance" }
		],
		roles: ["admin", "operations"],
		permission: "reports.view"
	},
	{
		key: "community",
		path: "/community",
		icon: "carbon:events",
		status: "active",
		pages: [
			{ key: "events", path: "events" },
			{ key: "eventCreate", path: "events/create", hidden: true },
			{ key: "eventEdit", path: "events/:id/edit", hidden: true },
			{ key: "eventCategories", path: "event-categories" },
			{ key: "eventAttendees", path: "events/:eventId/attendees", hidden: true },
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
		pages: [
			{ key: "privateOfficeRequests", path: "private-office-requests" },
			{ key: "operationsRequests", path: "operations-requests" }
		]
	},
	{
		key: "cms",
		path: "/cms",
		icon: "carbon:document",
		status: "active",
		pages: [
			{ key: "announcements", path: "announcements" },
			{ key: "partners", path: "partners" },
			{ key: "founders", path: "founders" },
			{ key: "contactLinks", path: "contact-links" },
			{ key: "notifications", path: "notifications" }
		]
	},
	{
		// What the member app shows as its own pages — apart from the website's
		// content above, since operations edit them for a different audience.
		key: "appContent",
		path: "/app-content",
		icon: "carbon:application-mobile",
		status: "active",
		pages: [
			{ key: "privacyPolicy", path: "privacy-policy", icon: "carbon:security" },
			{ key: "termsOfUse", path: "terms-of-use", icon: "carbon:document-tasks" },
			{ key: "helpSupport", path: "help-support", icon: "carbon:help" }
		]
	},
	{
		// HR administration (add/hr). No role gate: every page carries its
		// own hr.* permission, so a custom HR role works without
		// admin|operations, as on the backend.
		key: "hr",
		path: "/hr",
		icon: "carbon:user-multiple",
		status: "active",
		roles: ["all"],
		pages: [
			{ key: "employees", path: "employees", permission: "hr.employees.view" },
			{ key: "employeeProfile", path: "employees/:id", hidden: true, permission: "hr.employees.view" },
			{ key: "orgStructure", path: "org-structure", permission: "hr.org.view" },
			{ key: "hrAlerts", path: "alerts", permission: "hr.alerts.view" },
			{ key: "hrApprovalRequests", path: "approval-requests", permission: "hr.approvals.manage" }
		]
	},
	{
		// Time and leave (add/hr Leave; attendance and timesheets join it).
		// Every page carries its own hr.* permission, as on the backend.
		key: "hrTime",
		path: "/hr-time",
		icon: "carbon:calendar",
		status: "active",
		roles: ["all"],
		pages: [
			{ key: "hrLeaveRequests", path: "leave-requests", permission: "hr.leave.view" },
			{ key: "hrLeaveCalendar", path: "leave-calendar", permission: "hr.leave.view" },
			{ key: "hrAttendance", path: "attendance", permission: "hr.attendance.view" },
			{ key: "hrRoster", path: "roster", permission: "hr.attendance.view" },
			{ key: "hrTimeRequests", path: "time-requests", permission: "hr.attendance.view" },
			{ key: "hrTimePeriods", path: "time-periods", permission: "hr.attendance.view" },
			{ key: "hrTimesheets", path: "timesheets", permission: "hr.timesheets.view" },
			{ key: "hrTimeByCostCenter", path: "time-by-cost-center", permission: "hr.timesheets.view" }
		]
	},
	{
		// Pay (add/hr Payroll; benefits join it). Each step of a run carries
		// its own permission (hr.payroll.manage, .approve, .pay), checked on
		// its page; a page here needs only to read.
		key: "hrPay",
		path: "/hr-pay",
		icon: "carbon:money",
		status: "active",
		roles: ["all"],
		pages: [
			{ key: "hrPayrollRuns", path: "payroll-runs", permission: "hr.payroll.view" },
			{ key: "hrPayrollRun", path: "payroll-runs/:id", hidden: true, permission: "hr.payroll.view" },
			{ key: "hrPayslip", path: "payslips/:id", hidden: true, permission: "hr.payroll.view" },
			{ key: "hrLoans", path: "loans", permission: "hr.loans.manage" },
			{ key: "hrEndOfService", path: "end-of-service", permission: "hr.payroll.view" },
			{ key: "hrBenefits", path: "benefits", permission: "hr.benefits.view" },
			{ key: "hrBenefit", path: "benefits/:id", hidden: true, permission: "hr.benefits.view" },
			{ key: "hrBenefitGrants", path: "benefit-grants", permission: "hr.benefits.view" },
			{ key: "hrEmployeeCost", path: "employee-cost", permission: "hr.payroll.view" }
		]
	},
	{
		// HR setup. Each page needs its own setup permission (hr.settings.manage,
		// hr.approvals.manage), so the section shows only to whoever runs HR.
		key: "hrSettings",
		path: "/hr-settings",
		icon: "carbon:settings-adjust",
		status: "active",
		roles: ["all"],
		pages: [
			{ key: "hrDocumentTypes", path: "document-types", permission: "hr.settings.manage" },
			{ key: "hrChecklistTemplates", path: "checklist-templates", permission: "hr.settings.manage" },
			{ key: "hrApprovalFlows", path: "approval-flows", permission: "hr.approvals.manage" },
			{ key: "hrLeaveSettings", path: "leave", permission: "hr.leave.view" },
			{ key: "hrTimeSettings", path: "time", permission: "hr.attendance.view" },
			{ key: "hrCostCenters", path: "cost-centers", permission: "hr.timesheets.view" },
			{ key: "hrPayComponents", path: "pay-components", permission: "hr.payroll.view" },
			{ key: "hrRateTables", path: "rate-tables", permission: "hr.payroll.view" }
		]
	},
	{
		// The signed-in employee's own HR file — operations, sales, the café:
		// being an employee is an HR record, not a role.
		key: "myHr",
		path: "/my-hr",
		icon: "carbon:user-profile",
		status: "active",
		roles: ["all"],
		employee: true,
		pages: [
			{ key: "myProfile", path: "profile" },
			{ key: "hrMyApprovals", path: "approvals" },
			{ key: "hrMyLeave", path: "leave" },
			{ key: "hrMyAttendance", path: "attendance" },
			{ key: "hrMyTimesheets", path: "timesheets" },
			{ key: "hrMyPay", path: "pay" },
			{ key: "hrMyPayslip", path: "pay/payslips/:id", hidden: true },
			{ key: "hrMyBenefits", path: "benefits" },
			{ key: "hrMyCertificate", path: "certificates/:kind", hidden: true }
		]
	},
	{
		key: "settings",
		path: "/settings",
		icon: "carbon:settings",
		status: "active",
		pages: [
			{ key: "systemSettings", path: "system" },
			{ key: "accountSecurity", path: "account", hidden: true }
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

/**
 * The dashboard now exists (2026-10-13), so "/" lands on it for any staff
 * account holding at least one `dashboard.*` permission (`src/router/index.ts`).
 * HOME_REDIRECT above is kept, unchanged, as the landing page for an account
 * holding none — sending it to a dashboard with nothing to show would trade a
 * useful first screen for an empty one.
 */
export const DASHBOARD_HOME = "/dashboard/overview"
