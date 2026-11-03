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
	/**
	 * A staff page is listed in the sidebar and routable if and only if the
	 * signed-in account holds this permission (from `/me`'s `permissions`) —
	 * whatever its roles are called, admin and operations included. It is the
	 * permission ADD Core guards the first route the page reads with (for a
	 * write-only page, the one it writes); a hidden detail page carries its
	 * list page's. `navigation/access.ts` is the one place that reads it.
	 *
	 * Every staff page carries exactly one of `permission` or `allStaff`
	 * (`__tests__/menu-matches-guard.spec.ts`). The provider portal
	 * (`roles: ["provider"]`) and My HR (`employee`) carry neither: they keep
	 * their own audience rules.
	 *
	 * History. 2026-10-21: `openedBy` was added so a custom role reached only
	 * the admin pages ADD Core served it on a permission. 2026-10-25: this
	 * field was added as well, to narrow operations' menu to what its role was
	 * granted, while the server still served most routes on
	 * `role:admin|operations`. 2026-10-27: ADD Core dropped that role check
	 * and guards every admin route by permission alone
	 * (`2026-10-27-permission-only-dashboard-access-design.md`), so `openedBy`
	 * and the admin gate went, and this is the whole rule for staff pages —
	 * a custom role granted `amenities.view` now sees Amenities, which neither
	 * earlier rule allowed.
	 */
	permission?: string
	/**
	 * A staff page with no API of its own — the dashboard home (its panels
	 * each ask for their own `dashboard.*`), the account's own security, a
	 * ComingSoon placeholder: open to every staff account, i.e. any account
	 * holding at least one permission and not a provider (`isStaff`). The same
	 * accounts ADD Core admits to `me` and `media/upload`. Never set it on a
	 * page that reads an API: that page names the API's `permission`.
	 */
	allStaff?: true
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
	/**
	 * An audience, not a staff gate: `["provider"]` marks the provider
	 * portal, the only pages a provider sees and the only ones nobody else
	 * does. A staff section carries none — its pages carry permissions.
	 */
	roles?: Roles
	/** Shown and routable only for accounts with an HR employee record. */
	employee?: boolean
	/**
	 * Folds the section into one sidebar entry with the other sections of the
	 * same group, where it reads as a module under that entry. Menu only: the
	 * section keeps its own path, route names and access rules.
	 */
	group?: NavGroupKey
	/**
	 * Listed in the avatar menu instead of the sidebar: the account's own
	 * pages rather than work done on the dashboard. The sidebar still lists it
	 * when it is all the account may open, rather than stand empty. Menu only:
	 * the section keeps its own path, route names and access rules.
	 */
	accountMenu?: boolean
}

export type NavGroupKey = "hr"

export interface NavGroup {
	/** i18n key under `nav.groups`. */
	key: NavGroupKey
	/** Iconify name — must exist in the locally bundled sets. */
	icon: string
}

/**
 * Sidebar entries that hold several sections as modules. HR administration
 * filled six top-level rows of the sidebar (about forty pages); since
 * 2026-10-22 it is one "Human resources" entry with a module for each:
 * people, time, pay, talent, reports and setup. My HR is not in it: it is
 * every employee's self-service, not HR's work, and sits in the avatar menu
 * (`accountMenu`, since 2026-10-22).
 */
export const NAV_GROUPS: Readonly<Record<NavGroupKey, NavGroup>> = {
	hr: { key: "hr", icon: "carbon:identification" }
}

export const NAV_SECTIONS: readonly NavSection[] = [
	{
		key: "dashboard",
		path: "/dashboard",
		icon: "carbon:dashboard",
		status: "active",
		// No permission of its own: the page shows one panel per
		// `dashboard.*` permission the account holds (config/permissions.ts),
		// and says so when it holds none — so it opens to every staff account.
		pages: [
			{ key: "overview", path: "overview", allStaff: true },
			// The account's own notifications, in full: what the bell's
			// "view all" opens. Every staff account has an inbox.
			{ key: "myNotifications", path: "notifications", hidden: true, allStaff: true }
		]
	},
	{
		key: "spatial",
		path: "/spatial",
		icon: "carbon:building",
		status: "active",
		pages: [
			{ key: "branches", path: "branches", permission: "branches.view" },
			{ key: "buildings", path: "buildings", permission: "buildings.view" },
			{ key: "floors", path: "floors", permission: "floors.view" },
			{ key: "zones", path: "zones", permission: "zones.view" },
			// The amenity catalog, then which a space type may offer. Equipment in
			// a space is an inventory asset (the Inventory section) since
			// 2026-10-24, when ADD Core retired `resources`.
			{ key: "amenities", path: "amenities", permission: "amenities.view" },
			{ key: "spaceTypeAmenities", path: "space-type-amenities", permission: "amenities.view" },
			{ key: "spaces", path: "spaces", permission: "spaces.view" },
			{ key: "seatsDesks", path: "seats-desks", permission: "seats-desks.view" },
			{ key: "businessHours", path: "business-hours", permission: "business-hours.view" }
		]
	},
	{
		key: "system",
		path: "/system",
		icon: "carbon:user-admin",
		status: "active",
		pages: [
			{ key: "users", path: "users", permission: "users.view" },
			{ key: "roles", path: "roles", permission: "roles.view" }
		]
	},
	{
		key: "members",
		path: "/members",
		icon: "carbon:user-multiple",
		status: "active",
		pages: [
			{ key: "individuals", path: "individuals", permission: "members.view" },
			{ key: "memberProfile", path: "individuals/:id", hidden: true, permission: "members.view" },
			{ key: "companies", path: "companies", permission: "companies.view" },
			// Behind the permission its button already checks, so a typed URL
			// does not reach a form whose submit the API would refuse.
			{ key: "companyCreate", path: "companies/create", hidden: true, permission: "office-leases.create" },
			{ key: "companyProfile", path: "companies/:id", hidden: true, permission: "companies.view" },
			{ key: "memberships", path: "memberships", permission: "memberships.view" },
			{ key: "officeLeases", path: "office-leases", permission: "office-leases.view" },
			{ key: "stoppedRenewals", path: "stopped-renewals", permission: "renewals.manage" }
		]
	},
	{
		key: "providers",
		path: "/providers",
		icon: "carbon:partnership",
		status: "active",
		pages: [
			{ key: "list", path: "list", permission: "providers.view" },
			{ key: "requests", path: "requests", permission: "provider-requests.view" }
		]
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
			{ key: "invoices", path: "invoices" },
			// The provider's own notifications, in full: what the bell's "view all" opens.
			{ key: "myNotifications", path: "notifications", hidden: true }
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
			{ key: "receptionDesk", path: "reception-desk", permission: "reception.view" },
			{ key: "arrivals", path: "arrivals", permission: "reception.view" },
			{ key: "approvalQueue", path: "approval-queue", permission: "reception.view" },
			{ key: "activeSessions", path: "active-sessions", permission: "reception.view" },
			{ key: "activeSessionDetail", path: "active-sessions/:type/:id", hidden: true, permission: "reception.view" },
			{ key: "closeSession", path: "close-session", permission: "reception.view" },
			{ key: "closeSessionDetail", path: "close-session/:type/:id", hidden: true, permission: "reception.view" },
			{ key: "allBookings", path: "all", permission: "bookings.view" },
			{ key: "calendar", path: "calendar", permission: "bookings.view" }
		]
	},
	{
		key: "plans",
		path: "/plans",
		icon: "carbon:license",
		status: "active",
		pages: [
			{ key: "packages", path: "packages", permission: "plans.view" },
			{ key: "modules", path: "modules", permission: "plan-modules.view" },
			{ key: "resourceTypes", path: "resource-types", permission: "resource-types.view" },
			// ComingSoon: no API yet.
			{ key: "wallet", path: "wallet", allStaff: true },
			{ key: "coupons", path: "coupons", permission: "coupons.view" },
			{ key: "discountReport", path: "discount-report", permission: "reports.view" },
			{ key: "offerReport", path: "offer-report", permission: "reports.view" },
			// Write-only: the sale it makes.
			{ key: "planPurchases", path: "plan-purchases", permission: "plan-purchases.create" },
			// Selling stock at reception (2026-10-24): the sale, beside the
			// plan sale above, and what may be sold at what price.
			{ key: "itemSales", path: "item-sales", permission: "item-sales.view" },
			{ key: "saleItems", path: "sale-items", permission: "sale-items.view" }
		]
	},
	{
		key: "access",
		path: "/access",
		icon: "carbon:locked",
		status: "coming-soon",
		pages: [
			// ComingSoon: no API yet.
			{ key: "locks", path: "locks", allStaff: true },
			{ key: "accessLogs", path: "logs", allStaff: true }
		]
	},
	{
		key: "payments",
		path: "/payments",
		icon: "carbon:currency",
		status: "active",
		pages: [
			{ key: "transactions", path: "transactions", permission: "payments.view" },
			{ key: "paymentMethods", path: "methods", permission: "payment-methods.view" },
			{ key: "currencies", path: "currencies", permission: "currencies.view" },
			{ key: "exchangeRates", path: "exchange-rates", permission: "exchange-rates.view" },
			{ key: "walletTopUps", path: "wallet-top-ups", permission: "wallet-top-ups.view" },
			{ key: "cashRegister", path: "cash-register", permission: "cash-register.view" },
			{ key: "invoices", path: "invoices", permission: "invoices.view" }
		]
	},
	{
		// Inventory (ADD Core's add/inventory package, 2026-10-24): assets
		// tracked one by one, consumable stock per place, and their catalog.
		// Every page carries its own inventory.* permission, as every route
		// does on the backend, so a store keeper's custom role works.
		key: "inventory",
		path: "/inventory",
		icon: "carbon:box",
		status: "active",
		pages: [
			{ key: "inventoryAssets", path: "assets", permission: "inventory.assets.view" },
			{ key: "inventoryAsset", path: "assets/:id", hidden: true, permission: "inventory.assets.view" },
			{ key: "inventoryStock", path: "stock", permission: "inventory.stock.view" },
			{ key: "inventoryMaintenance", path: "maintenance", permission: "inventory.assets.view" },
			{ key: "inventoryCustody", path: "custody", permission: "inventory.assets.view" },
			{ key: "inventoryItems", path: "items", permission: "inventory.catalog.view" },
			{ key: "inventoryCatalog", path: "catalog", permission: "inventory.catalog.view" },
			{ key: "inventoryReports", path: "reports", permission: "inventory.reports.view" }
		]
	},
	{
		key: "reports",
		path: "/reports",
		icon: "carbon:chart-line",
		status: "active",
		pages: [
			{ key: "providersReport", path: "providers", permission: "reports.view" },
			{ key: "revenueReport", path: "revenue", permission: "reports.view" },
			// The figures the dashboard sums up, in full; each behind the
			// permission of the dashboard section it expands. Until 2026-10-27
			// the section also asked for `reports.view`, which neither page's
			// API (the `admin/dashboard/…` routes) asks for. (No slash-star here:
			// scripts/build-icons.js would read it as a block comment and drop the
			// icons below it from the bundle.)
			{ key: "spacesReport", path: "spaces", permission: "dashboard.spaces" },
			{ key: "collectionsReport", path: "collections", permission: "dashboard.finance" }
		]
	},
	{
		key: "community",
		path: "/community",
		icon: "carbon:events",
		status: "active",
		pages: [
			{ key: "events", path: "events", permission: "events.view" },
			{ key: "eventCreate", path: "events/create", hidden: true, permission: "events.view" },
			{ key: "eventEdit", path: "events/:id/edit", hidden: true, permission: "events.view" },
			{ key: "eventCategories", path: "event-categories", permission: "event-categories.view" },
			{ key: "eventAttendees", path: "events/:eventId/attendees", hidden: true, permission: "events.view" },
			{ key: "community", path: "directory", permission: "community-members.view" },
			// ComingSoon: no API yet.
			{ key: "cafe", path: "cafe", allStaff: true }
		]
	},
	{
		key: "incubation",
		path: "/incubation",
		icon: "carbon:rocket",
		status: "coming-soon",
		pages: [
			// ComingSoon: no API yet.
			{ key: "incubate", path: "incubate", allStaff: true },
			{ key: "accelerate", path: "accelerate", allStaff: true },
			{ key: "mentors", path: "mentors", allStaff: true }
		]
	},
	{
		key: "address",
		path: "/address",
		icon: "carbon:enterprise",
		status: "active",
		pages: [
			{ key: "privateOfficeRequests", path: "private-office-requests", permission: "private-office-requests.view" },
			{ key: "operationsRequests", path: "operations-requests", permission: "service-requests.view" }
		]
	},
	{
		key: "cms",
		path: "/cms",
		icon: "carbon:document",
		status: "active",
		pages: [
			{ key: "announcements", path: "announcements", permission: "announcements.view" },
			{ key: "partners", path: "partners", permission: "partners.view" },
			{ key: "founders", path: "founders", permission: "founders.view" },
			{ key: "contactLinks", path: "contact-links", permission: "contact-links.view" },
			// Write-only: the broadcast it sends.
			{ key: "notifications", path: "notifications", permission: "notifications.broadcast" }
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
			{ key: "privacyPolicy", path: "privacy-policy", icon: "carbon:security", permission: "app-content.view" },
			{ key: "termsOfUse", path: "terms-of-use", icon: "carbon:document-tasks", permission: "app-content.view" },
			{ key: "helpSupport", path: "help-support", icon: "carbon:help", permission: "app-content.view" }
		]
	},
	{
		// HR administration (add/hr). Every page carries its own hr.*
		// permission, so a custom HR role works, as on the backend.
		key: "hr",
		group: "hr",
		path: "/hr",
		icon: "carbon:user-multiple",
		status: "active",
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
		group: "hr",
		path: "/hr-time",
		icon: "carbon:calendar",
		status: "active",
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
		group: "hr",
		path: "/hr-pay",
		icon: "carbon:money",
		status: "active",
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
		// Talent (add/hr Recruitment; performance and training join it).
		// Reading needs hr.recruitment.view; every change, on its page,
		// hr.recruitment.manage.
		key: "hrTalent",
		group: "hr",
		path: "/hr-talent",
		icon: "carbon:growth",
		status: "active",
		pages: [
			{ key: "hrRequisitions", path: "requisitions", permission: "hr.recruitment.view" },
			{ key: "hrJobOpenings", path: "job-openings", permission: "hr.recruitment.view" },
			{ key: "hrJobOpening", path: "job-openings/:id", hidden: true, permission: "hr.recruitment.view" },
			{ key: "hrApplication", path: "applications/:id", hidden: true, permission: "hr.recruitment.view" },
			{ key: "hrCandidates", path: "candidates", permission: "hr.recruitment.view" },
			{ key: "hrCandidate", path: "candidates/:id", hidden: true, permission: "hr.recruitment.view" },
			{ key: "hrReviewCycles", path: "review-cycles", permission: "hr.performance.view" },
			{ key: "hrReviewCycle", path: "review-cycles/:id", hidden: true, permission: "hr.performance.view" },
			{ key: "hrGoals", path: "goals", permission: "hr.performance.view" },
			{ key: "hrCourses", path: "courses", permission: "hr.training.view" },
			{ key: "hrTrainingSessions", path: "training-sessions", permission: "hr.training.view" },
			{ key: "hrTrainingSession", path: "training-sessions/:id", hidden: true, permission: "hr.training.view" },
			{ key: "hrCertifications", path: "certifications", permission: "hr.training.view" },
			{ key: "hrLearningBudgets", path: "learning-budgets", permission: "hr.training.view" }
		]
	},
	{
		// HR reports (add/hr Reports): the dashboard and the combined reports,
		// all behind hr.reports.view. Money in them (payroll, loans) still
		// needs hr.payroll.view, which the server checks.
		key: "hrReports",
		group: "hr",
		path: "/hr-reports",
		icon: "carbon:report",
		status: "active",
		pages: [
			{ key: "hrDashboard", path: "dashboard", permission: "hr.reports.view" },
			{ key: "hrHeadcount", path: "headcount", permission: "hr.reports.view" },
			{ key: "hrExceptionsReport", path: "attendance-exceptions", permission: "hr.reports.view" },
			{ key: "hrTimesheetCompliance", path: "timesheet-compliance", permission: "hr.reports.view" },
			{ key: "hrLiabilities", path: "liabilities", permission: "hr.reports.view" }
		]
	},
	{
		// HR setup. Each page needs its own setup permission (hr.settings.manage,
		// hr.approvals.manage), so the section shows only to whoever runs HR.
		key: "hrSettings",
		group: "hr",
		path: "/hr-settings",
		icon: "carbon:settings-adjust",
		status: "active",
		pages: [
			{ key: "hrDocumentTypes", path: "document-types", permission: "hr.settings.manage" },
			{ key: "hrChecklistTemplates", path: "checklist-templates", permission: "hr.settings.manage" },
			{ key: "hrApprovalFlows", path: "approval-flows", permission: "hr.approvals.manage" },
			{ key: "hrLeaveSettings", path: "leave", permission: "hr.leave.view" },
			{ key: "hrTimeSettings", path: "time", permission: "hr.attendance.view" },
			{ key: "hrCostCenters", path: "cost-centers", permission: "hr.timesheets.view" },
			{ key: "hrPayComponents", path: "pay-components", permission: "hr.payroll.view" },
			{ key: "hrRateTables", path: "rate-tables", permission: "hr.payroll.view" },
			{ key: "hrPipelineStages", path: "pipeline-stages", permission: "hr.recruitment.view" },
			{ key: "hrReviewTemplates", path: "review-templates", permission: "hr.performance.view" }
		]
	},
	{
		// The signed-in employee's own HR file — operations, sales, the café:
		// being an employee is an HR record, not a role. Opened from one entry
		// in the avatar menu; its pages share a vertical menu (MyHrLayout.vue).
		key: "myHr",
		path: "/my-hr",
		icon: "carbon:user-profile",
		status: "active",
		employee: true,
		accountMenu: true,
		pages: [
			{ key: "myProfile", path: "profile", icon: "carbon:user-profile" },
			{ key: "hrMyApprovals", path: "approvals", icon: "carbon:task-approved" },
			{ key: "hrMyLeave", path: "leave", icon: "carbon:calendar" },
			{ key: "hrMyAttendance", path: "attendance", icon: "carbon:time" },
			{ key: "hrMyTimesheets", path: "timesheets", icon: "carbon:event-schedule" },
			{ key: "hrMyPay", path: "pay", icon: "carbon:money" },
			{ key: "hrMyPayslip", path: "pay/payslips/:id", hidden: true },
			{ key: "hrMyBenefits", path: "benefits", icon: "carbon:gift" },
			{ key: "hrMyRecruitment", path: "jobs", icon: "carbon:portfolio" },
			{ key: "hrMyPerformance", path: "performance", icon: "carbon:growth" },
			{ key: "hrMyTraining", path: "training", icon: "carbon:education" },
			{ key: "hrMyCertificate", path: "certificates/:kind", hidden: true }
		]
	},
	{
		key: "settings",
		path: "/settings",
		icon: "carbon:settings",
		status: "active",
		pages: [
			{ key: "systemSettings", path: "system", permission: "settings.view" },
			// Fortify's own two-factor routes: every staff account's.
			{ key: "accountSecurity", path: "account", hidden: true, allStaff: true }
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

/** i18n key for a group title. */
export function navGroupTitleKey(group: NavGroup): string {
	return `nav.groups.${group.key}`
}

/** The group's sidebar key, e.g. "hrGroup" — apart from section keys and route names. */
export function navGroupMenuKey(group: NavGroup): string {
	return `${group.key}Group`
}

/**
 * Where "/" lands for a staff account holding at least one `dashboard.*`
 * permission (`homePath()` in `navigation/access.ts`).
 *
 * History. "/" first landed on HOME_REDIRECT, `/spatial/branches` —
 * deliberately the first ACTIVE section rather than the dashboard, which was
 * scheduled last and would have said "coming soon" for most of the build. The
 * dashboard existed from 2026-10-13, and HOME_REDIRECT was kept for an account
 * holding no dashboard panel — sending it to a dashboard with nothing to show
 * would trade a useful first screen for an empty one. 2026-10-27: HOME_REDIRECT
 * went. That account now lands on the first screen in sidebar order whose
 * permission it holds — `/spatial/branches` for admin and for operations as
 * before, but the account's own first screen for any other role, where the
 * fixed path was a page it might not hold.
 */
export const DASHBOARD_HOME = "/dashboard/overview"
