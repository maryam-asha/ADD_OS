import type { NavPage, NavSection } from "@/add-os/navigation/sections"
import type { RouteMetaAuth } from "@/types/auth.d"
import { canViewDashboard } from "@/add-os/config/permissions"
import { DASHBOARD_HOME, NAV_SECTIONS, navRoutePath } from "@/add-os/navigation/sections"
import { useAuthStore } from "@/stores/auth"

/**
 * ADD OS — who reaches which section and page, in one place for the sidebar
 * (`Navbar/items.tsx`), the route guard (`authGuard.ts`) and where "/" lands
 * (`src/router/index.ts`). They read the same rules so the menu never offers a
 * page the guard turns away, and "/" never lands on one.
 *
 * Since 2026-10-27 there is one rule for staff pages: a page is listed and
 * routable if and only if the account holds its `permission`, or — for a page
 * with no API, marked `allStaff` — is a staff account at all. No role name
 * decides it; ADD Core guards every admin route by permission alone. Two
 * audiences keep rules of their own: the provider portal (`roles:
 * ["provider"]`), and My HR (`employee`).
 */

/** Whether the signed-in account may open a staff page: by its permission, or as any staff account. */
export function mayOpenStaffPage(page: Pick<RouteMetaAuth, "permission" | "allStaff">): boolean {
	const auth = useAuthStore()
	if (!auth.isStaff) return false
	if (page.permission) return auth.hasPermission(page.permission)
	return page.allStaff === true
}

/** The provider portal: a provider sees only it, and nobody else ever does. */
function isProviderPortal(section: NavSection): boolean {
	return section.key === "providerPortal" || Boolean(section.roles?.includes("provider"))
}

/** Whether the signed-in account may open a page of a section. */
export function mayOpenPage(section: NavSection, page: NavPage): boolean {
	const auth = useAuthStore()
	if (isProviderPortal(section)) return auth.isProvider
	// My HR: accounts with an employee record only, whatever their role.
	if (section.employee) return auth.isEmployee
	return mayOpenStaffPage(page)
}

/** The pages of a section the sidebar lists for this account. */
export function menuPages(section: NavSection): NavPage[] {
	return section.pages.filter(page => !page.hidden && mayOpenPage(section, page))
}

/** Whether the sidebar shows a section to this account. */
export function maySeeSection(section: NavSection): boolean {
	const auth = useAuthStore()
	// A provider sees only its portal; nobody else ever sees the portal.
	if (auth.isProvider !== isProviderPortal(section)) return false
	// A section with no page this account may open would open empty.
	return menuPages(section).length > 0
}

/**
 * The sections the sidebar lists for this account: those it sees, less the
 * ones the avatar menu carries (`accountMenu`) — unless those are all it sees,
 * as for an employee with no permission, whose sidebar would otherwise stand empty.
 */
export function sidebarSections(): NavSection[] {
	const visible = NAV_SECTIONS.filter(maySeeSection)
	const work = visible.filter(section => !section.accountMenu)
	return work.length ? work : visible
}

/** The sections the avatar menu lists for this account. */
export function accountMenuSections(): NavSection[] {
	return NAV_SECTIONS.filter(section => section.accountMenu && maySeeSection(section))
}

/** The first page in sidebar order this account may open that matches `accept`, if any. */
function firstOpenPage(accept: (section: NavSection, page: NavPage) => boolean): string | null {
	for (const section of NAV_SECTIONS) {
		if (!maySeeSection(section)) continue
		const page = menuPages(section).find(candidate => accept(section, candidate))
		if (page) return navRoutePath(section, page)
	}
	return null
}

/**
 * Where "/" lands. A provider: its portal. A staff account with a dashboard
 * panel: the dashboard. Any other staff account: the first screen in sidebar
 * order whose permission it holds — a real screen, ahead of the placeholders
 * every staff account may open — else the dashboard home, which is every staff
 * account's and says it has nothing to show. An employee with nothing else:
 * My HR, its first page. Anyone else — signed out, or about to be signed out
 * by the guard — the dashboard home, which sends them to sign in. Every answer
 * for a signed-in account is a page the guard lets it into, so a refusal that
 * sends it to "/" cannot loop.
 */
export function homePath(): string {
	const auth = useAuthStore()
	if (auth.isProvider) return "/provider/summary"
	if (auth.isStaff) {
		if (canViewDashboard()) return DASHBOARD_HOME
		return firstOpenPage((_section, page) => Boolean(page.permission)) ?? DASHBOARD_HOME
	}
	return firstOpenPage(() => true) ?? DASHBOARD_HOME
}
