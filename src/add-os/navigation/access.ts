import type { NavPage, NavSection } from "@/add-os/navigation/sections"
import type { Roles } from "@/types/auth.d"
import _castArray from "lodash/castArray"
import { canViewDashboard } from "@/add-os/config/permissions"
import { DASHBOARD_HOME, HOME_REDIRECT, NAV_SECTIONS, navRoutePath } from "@/add-os/navigation/sections"
import { useAuthStore } from "@/stores/auth"

/**
 * ADD OS — who reaches which section and page, in one place for the sidebar
 * (`Navbar/items.tsx`), the route guard (`authGuard.ts`) and where "/" lands
 * (`src/router/index.ts`). They read the same rules so the menu never offers a
 * page the guard turns away, and "/" never lands on one.
 */

/** A section with no `roles` sits behind the admin gate, as `routes.ts` gives it. */
const ADMIN_GATE: Roles = ["admin", "operations"]

/** The general admin gate: admin|operations, the way ADD Core's admin routes are guarded. */
export function isAdminGated(roles: Roles | undefined): boolean {
	const list = _castArray(roles ?? [])
	return list.includes("admin") && list.includes("operations")
}

/** Whether the signed-in account may open a page of a section. */
export function mayOpenPage(section: NavSection, page: NavPage): boolean {
	const auth = useAuthStore()
	if (page.permission && !auth.hasPermission(page.permission)) return false
	return !isAdminGated(section.roles ?? ADMIN_GATE) || auth.mayOpenAdminPage(page.openedBy)
}

/** The pages of a section the sidebar lists for this account. */
export function menuPages(section: NavSection): NavPage[] {
	return section.pages.filter(page => !page.hidden && mayOpenPage(section, page))
}

/** Whether the sidebar shows a section to this account. */
export function maySeeSection(section: NavSection): boolean {
	const auth = useAuthStore()
	const isPortal = section.key === "providerPortal" || Boolean(section.roles?.includes("provider"))
	// A provider sees only its portal; nobody else ever sees the portal.
	if (auth.isProvider !== isPortal) return false
	if (!auth.isRoleGranted(section.roles ?? ADMIN_GATE)) return false
	if (section.permission && !auth.hasPermission(section.permission)) return false
	// My HR: accounts with an employee record only.
	if (section.employee && !auth.isEmployee) return false
	// A section with no page this account may open would open empty.
	return menuPages(section).length > 0
}

/** The first page in sidebar order this account may open, if any. */
function firstOpenPage(skip?: string): string | null {
	for (const section of NAV_SECTIONS) {
		if (!maySeeSection(section)) continue
		const page = menuPages(section).find(candidate => navRoutePath(section, candidate) !== skip)
		if (page) return navRoutePath(section, page)
	}
	return null
}

function mayOpenPath(path: string): boolean {
	return NAV_SECTIONS.some(section => maySeeSection(section) && menuPages(section).some(page => navRoutePath(section, page) === path))
}

/**
 * Where "/" lands. A provider: its portal. Anyone with a dashboard panel: the
 * dashboard. Admin and operations without one: HOME_REDIRECT, as before, when
 * they may open it. Anyone else — a custom role, an employee with no role —
 * the first page in the sidebar they may open, before the dashboard's
 * empty home; an employee with nothing else lands on My HR that way. Every
 * answer is a page the guard lets this account into, so a refusal that sends
 * them to "/" cannot loop.
 */
export function homePath(): string {
	const auth = useAuthStore()
	if (auth.isProvider) return "/provider/summary"
	if (canViewDashboard()) return DASHBOARD_HOME
	if (auth.isStaff && mayOpenPath(HOME_REDIRECT)) return HOME_REDIRECT
	return firstOpenPage(DASHBOARD_HOME) ?? DASHBOARD_HOME
}
