import type { RouteRecordRaw } from "vue-router"
import ComingSoon from "@/add-os/views/ComingSoon.vue"
import { NAV_SECTIONS, navPageTitleKey, navRouteName, navRoutePath, navSectionTitleKey } from "./sections"

/**
 * ADD OS — routes generated from `./sections.ts`.
 *
 * The sidebar is built from the same list, so a menu entry cannot point at a
 * route that does not exist, and a route cannot go unreachable from the menu.
 *
 * Most pages still render the shared ComingSoon placeholder. Pages with a real
 * screen are listed in `PAGE_COMPONENTS` below; switching one over means adding
 * it there — nothing else moves.
 *
 * `meta.title` holds an i18n KEY, not a label. `Toolbar/Breadcrumb.vue` and
 * `ComingSoon.vue` both translate it, so headings follow the language.
 *
 * ComingSoon is imported statically on purpose: the remaining placeholder pages
 * share it, and lazy loading would emit the same chunk once per page.
 *
 * Real pages, by contrast, are lazy on purpose and must stay that way. A static
 * import here pulls each page's whole module graph — view → service →
 * `services/api.ts` → `@/router` → back into this file — into this module's own
 * evaluation, and that cycle leaves `NAV_SECTIONS` uninitialised at the moment
 * `createAddOsRoutes()` runs ("Cannot access '__vite_ssr_import_N__' before
 * initialization"). Deferring to a factory means the page graph is only touched
 * once the router actually navigates, long after every module has settled.
 */

/** Pages with a real screen. Everything else still falls back to ComingSoon. */
const PAGE_COMPONENTS: Record<string, () => Promise<unknown>> = {
	"system.roles": () => import("@/add-os/modules/system/views/RolesPage.vue"),
	"system.users": () => import("@/add-os/modules/system/views/UsersPage.vue"),
	"settings.accountSecurity": () => import("@/add-os/modules/settings/views/AccountSecurityPage.vue"),
	"settings.systemSettings": () => import("@/add-os/modules/settings/views/SystemSettingsPage.vue"),
	"spatial.branches": () => import("@/add-os/modules/spatial/views/BranchesPage.vue"),
	"spatial.buildings": () => import("@/add-os/modules/spatial/views/BuildingsPage.vue"),
	"spatial.floors": () => import("@/add-os/modules/spatial/views/FloorsPage.vue"),
	"spatial.zones": () => import("@/add-os/modules/spatial/views/ZonesPage.vue"),
	"spatial.spaces": () => import("@/add-os/modules/spatial/views/SpacesPage.vue"),
	"spatial.resources": () => import("@/add-os/modules/spatial/views/ResourcesPage.vue"),
	"spatial.spaceTypeAmenities": () => import("@/add-os/modules/spatial/views/SpaceTypeAmenitiesPage.vue"),
	"spatial.seatsDesks": () => import("@/add-os/modules/spatial/views/SeatsDesksPage.vue"),
	"spatial.businessHours": () => import("@/add-os/modules/spatial/views/BusinessHoursPage.vue"),
	"address.privateOfficeRequests": () => import("@/add-os/modules/members/views/PrivateOfficeRequestsPage.vue"),
	"address.operationsRequests": () => import("@/add-os/modules/operations/views/OperationsRequestsPage.vue"),
	"bookings.receptionDesk": () => import("@/add-os/modules/reception/views/ReceptionDeskPage.vue"),
	"bookings.approvalQueue": () => import("@/add-os/modules/booking/views/ApprovalQueuePage.vue"),
	"bookings.activeSessions": () => import("@/add-os/modules/booking/views/ActiveSessionsPage.vue"),
	"bookings.closeSession": () => import("@/add-os/modules/booking/views/CloseSessionPage.vue"),
	"bookings.allBookings": () => import("@/add-os/modules/booking/views/AllBookingsPage.vue"),
	"bookings.calendar": () => import("@/add-os/modules/booking/views/BookingCalendarPage.vue"),
	"members.individuals": () => import("@/add-os/modules/members/views/IndividualMembersPage.vue"),
	"members.companies": () => import("@/add-os/modules/members/views/CompaniesPage.vue"),
	"members.memberships": () => import("@/add-os/modules/members/views/MembershipsPage.vue"),
	"plans.packages": () => import("@/add-os/modules/plans/views/PlansPage.vue"),
	"plans.modules": () => import("@/add-os/modules/plans/views/PlanModulesPage.vue"),
	"plans.resourceTypes": () => import("@/add-os/modules/plans/views/ResourceTypesPage.vue"),
	"payments.currencies": () => import("@/add-os/modules/payments/views/CurrenciesPage.vue"),
	"payments.exchangeRates": () => import("@/add-os/modules/payments/views/ExchangeRatesPage.vue"),
	"payments.walletTopUps": () => import("@/add-os/modules/payments/views/WalletTopUpsPage.vue"),
	"payments.cashRegister": () => import("@/add-os/modules/payments/views/CashRegisterPage.vue"),
	"community.events": () => import("@/add-os/modules/events/views/EventsPage.vue"),
	"community.eventCategories": () => import("@/add-os/modules/events/views/EventCategoriesPage.vue"),
	"community.eventCancellation": () => import("@/add-os/modules/events/views/EventCancellationDetailsPage.vue"),
	"community.eventAttendees": () => import("@/add-os/modules/events/views/EventAttendeesPage.vue"),
	"community.community": () => import("@/add-os/modules/community/views/CommunityMembersPage.vue"),
	"cms.announcements": () => import("@/add-os/modules/cms/views/AnnouncementsPage.vue"),
	"cms.partners": () => import("@/add-os/modules/cms/views/PartnersPage.vue"),
	"cms.founders": () => import("@/add-os/modules/cms/views/FoundersPage.vue"),
	"cms.contactLinks": () => import("@/add-os/modules/cms/views/ContactLinksPage.vue"),
	"cms.notifications": () => import("@/add-os/modules/cms/views/NotificationsPage.vue")
}

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
				component: PAGE_COMPONENTS[navRouteName(section, page)] ?? ComingSoon,
				props: { titleKey: navPageTitleKey(page) },
				meta: { title: navPageTitleKey(page) }
			}))
		}
	})
}
