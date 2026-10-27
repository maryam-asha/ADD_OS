import type { MenuMixedOption } from "naive-ui/es/menu/src/interface"
import type { RouteLocationNormalized, RouteRecordRaw } from "vue-router"
import type { AdminUser } from "@/types/auth.d"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it } from "vitest"
import { DASHBOARD_SECTIONS } from "@/add-os/config/permissions"
import { accountMenuSections, homePath, maySeeSection, menuPages, sidebarSections } from "@/add-os/navigation/access"
import { accountMenuOptions } from "@/add-os/navigation/accountMenu"
import { authGuard } from "@/add-os/navigation/authGuard"
import { createAddOsRoutes } from "@/add-os/navigation/routes"
import { NAV_GROUPS, NAV_SECTIONS, navGroupMenuKey, navRouteName, navRoutePath } from "@/add-os/navigation/sections"
import ComingSoon from "@/add-os/views/ComingSoon.vue"
import getItems from "@/app-layouts/common/Navbar/items"
import { useAuthStore } from "@/stores/auth"

/**
 * ADD OS — the sidebar, the route guard and "/" agree, for every kind of account.
 *
 * The live HR run of 2026-10-21 found them apart: an HR role (`hr_manager`)
 * and an employee with no role were offered every admin section, each page a
 * 403 from ADD Core, and "/" sent both to `/spatial/branches`, which the server
 * refused them. The three now read `navigation/access.ts`; this checks the
 * promise they keep together — every page the sidebar offers, the guard lets
 * in, and "/" lands on one of them — so a fourth reader, or a tag on a page,
 * cannot quietly break it.
 *
 * Since 2026-10-27 there is one rule for staff pages — listed and routable iff
 * the account holds the page's `permission`, or, for a page with no API
 * (`allStaff`), is a staff account at all — and this also checks that every
 * staff page is tagged one way or the other, so a page cannot fall back to an
 * unstated default.
 */

const employee = { id: 9, employee_number: "ADD-0009", name: { ar: "يزن دبس", en: "Yazan Dibs" }, status: "probation" } as AdminUser["employee"]
const HR_ALL = ["hr.employees.view", "hr.org.view", "hr.alerts.view", "hr.approvals.manage", "hr.leave.view", "hr.attendance.view", "hr.timesheets.view", "hr.payroll.view", "hr.reports.view"]

/** Every permission a page names, plus the dashboard's panels: what admin holds (`PermissionSyncService` grants it all). */
const EVERY_PERMISSION = [...new Set([...NAV_SECTIONS.flatMap(section => section.pages.flatMap(page => (page.permission ? [page.permission] : []))), ...DASHBOARD_SECTIONS.map(panel => `dashboard.${panel}`)])]

/** Accounts that may use the dashboard. */
const ACCOUNTS: Record<string, Partial<AdminUser>> = {
	"admin": { roles: ["admin"], permissions: EVERY_PERMISSION },
	"operations, branches only": { roles: ["operations"], permissions: ["branches.view", "branches.update"] },
	"an HR role": { roles: ["hr_manager"], permissions: HR_ALL, employee },
	"a reports-only HR role": { roles: ["hr_qa_reports"], permissions: ["hr.reports.view"] },
	"a custom role for invoices": { roles: ["finance_clerk"], permissions: ["invoices.view", "dashboard.finance"] },
	"a custom role for amenities": { roles: ["stack_holder"], permissions: ["amenities.view"] },
	"an employee with no role": { roles: [], permissions: [], employee },
	"a member who is an employee": { roles: ["member"], permissions: [], employee },
	"a provider": { roles: ["provider"], permissions: [] }
}

/** Accounts holding no permission, no employee record and no portal: nothing here is theirs. */
const REFUSED: Record<string, Partial<AdminUser>> = {
	"operations granted nothing": { roles: ["operations"], permissions: [] },
	"a custom role granted nothing": { roles: ["empty_role"], permissions: [] },
	"a member only": { roles: ["member"], permissions: [] }
}

/** Each page as the router sees it: the section's meta, then the page's — and whether it renders the placeholder. */
const PAGES = new Map<string, RouteLocationNormalized>()
const PLACEHOLDERS = new Set<string>()
for (const parent of createAddOsRoutes()) {
	for (const child of parent.children ?? ([] as RouteRecordRaw[])) {
		const path = `${parent.path}/${child.path}`
		PAGES.set(path, { path, fullPath: path, query: {}, meta: { ...parent.meta, ...child.meta } } as unknown as RouteLocationNormalized)
		if (child.component === ComingSoon) PLACEHOLDERS.add(String(child.name))
	}
}

/** Real screens with no API of their own — the only ones besides placeholders that may be `allStaff`. */
const NO_API_SCREENS = ["dashboard.overview", "settings.accountSecurity"]

/** The sections the sidebar lists, in order — a group's modules count as their own sections. */
function menuSections(items: MenuMixedOption[]): string[] {
	const groups = new Set(Object.values(NAV_GROUPS).map(navGroupMenuKey))
	return items
		.flatMap(item => (groups.has(String(item.key)) ? ((item as { children?: MenuMixedOption[] }).children ?? []) : [item]))
		.map(item => String(item.key).split(".")[0])
}

/** Every page the sidebar offers this account, as paths. */
function offered(): string[] {
	return NAV_SECTIONS.filter(maySeeSection).flatMap(section => menuPages(section).map(page => navRoutePath(section, page)))
}

/** The pages the sidebar offers this account for a permission it holds — the real screens, less the ones open to all staff. */
function offeredByPermission(): string[] {
	return NAV_SECTIONS.filter(maySeeSection).flatMap(section => menuPages(section).filter(page => page.permission).map(page => navRoutePath(section, page)))
}

function signIn(account: Partial<AdminUser>) {
	useAuthStore().setLogged({ id: 1, name: "Account", email: "account@test.local", roles: [], ...account } as AdminUser)
}

describe("every staff page says who opens it", () => {
	const isAudiencePage = (sectionKey: string) => {
		const section = NAV_SECTIONS.find(candidate => candidate.key === sectionKey)!
		return Boolean(section.roles?.includes("provider")) || Boolean(section.employee)
	}

	it("tags every staff page with exactly one of a permission or allStaff", () => {
		const untagged: string[] = []
		for (const section of NAV_SECTIONS) {
			if (isAudiencePage(section.key)) continue
			for (const page of section.pages) {
				if (Boolean(page.permission) === Boolean(page.allStaff)) untagged.push(navRouteName(section, page))
			}
		}
		expect(untagged).toEqual([])
	})

	it("keeps allStaff to pages with no API — the placeholders and the screens named here", () => {
		const misused = NAV_SECTIONS.flatMap(section => section.pages.filter(page => page.allStaff).map(page => navRouteName(section, page)))
			.filter(name => !PLACEHOLDERS.has(name) && !NO_API_SCREENS.includes(name))
		expect(misused).toEqual([])
	})

	it("gives the audiences no staff tag: the provider portal and My HR keep their own rules", () => {
		const tagged = NAV_SECTIONS.filter(section => isAudiencePage(section.key))
			.flatMap(section => section.pages.filter(page => page.permission || page.allStaff).map(page => navRouteName(section, page)))
		expect(tagged).toEqual([])
	})

	it("names no role on a staff section — a role name decides no staff access", () => {
		const gated = NAV_SECTIONS.filter(section => section.roles && !section.roles.includes("provider")).map(section => section.key)
		expect(gated).toEqual([])
	})
})

describe("sidebar, route guard and \"/\" agree", () => {
	beforeEach(() => {
		localStorage.clear()
		setActivePinia(createPinia())
	})

	describe.each(Object.entries(ACCOUNTS))("%s", (_label, account) => {
		it("lets the guard through to every page the sidebar offers", () => {
			signIn(account)
			const refused: string[] = []
			for (const path of offered()) {
				const answer = authGuard(PAGES.get(path)!)
				if (answer !== undefined) refused.push(`${path} → ${JSON.stringify(answer)}`)
			}
			expect(refused).toEqual([])
		})

		it("refuses every page the sidebar does not offer, so a typed URL meets the same rule", () => {
			signIn(account)
			const listed = new Set(offered())
			const hiddenOrUnlisted = NAV_SECTIONS.flatMap(section => section.pages.filter(page => !page.hidden).map(page => navRoutePath(section, page))).filter(path => !listed.has(path))
			const admitted = hiddenOrUnlisted.filter(path => authGuard(PAGES.get(path)!) === undefined)
			expect(admitted).toEqual([])
		})

		it("lands \"/\" on a page the guard lets it into, so a refusal cannot loop", () => {
			signIn(account)
			const home = homePath()
			if (home === "/provider/summary") return expect(useAuthStore().isProvider).toBe(true)
			expect(PAGES.has(home), `"/" lands on ${home}, which is no page`).toBe(true)
			expect(authGuard(PAGES.get(home)!)).toBeUndefined()
		})

		it("builds the sidebar and the avatar menu from the same rules", () => {
			signIn(account)
			const fromMenu = menuSections(getItems({ mode: "vertical", collapsed: false }))
			expect(fromMenu).toEqual(sidebarSections().map(section => section.key))
			const fromAvatar = accountMenuOptions(key => key).map(option => String(option.key))
			expect(fromAvatar).toEqual(accountMenuSections().map(section => `route-${navRouteName(section, menuPages(section)[0])}`))
		})

		it("lists every section it sees in the sidebar or the avatar menu", () => {
			signIn(account)
			const listed = new Set([...sidebarSections(), ...accountMenuSections()].map(section => section.key))
			expect([...listed].sort()).toEqual(NAV_SECTIONS.filter(maySeeSection).map(section => section.key).sort())
		})
	})

	describe.each(Object.entries(REFUSED))("%s", (_label, account) => {
		it("is signed out from every page, and offered none", () => {
			signIn(account)
			expect(offered()).toEqual([])
			for (const page of PAGES.values()) {
				signIn(account)
				expect(authGuard(page)).toEqual({ path: "/login" })
				expect(useAuthStore().isLogged).toBe(false)
			}
		})
	})

	it("offers a custom role holding only amenities.view the amenity screens and nothing it does not hold (2026-10-27)", () => {
		signIn(ACCOUNTS["a custom role for amenities"])
		expect(offeredByPermission()).toEqual(["/spatial/amenities", "/spatial/space-type-amenities"])
		expect(homePath()).toBe("/spatial/amenities")
		expect(authGuard(PAGES.get("/spatial/buildings")!)).toEqual({ path: "/" })
	})

	it("turns operations away from a page whose permission it does not hold — its name opens nothing", () => {
		signIn(ACCOUNTS["operations, branches only"])
		expect(offeredByPermission()).toEqual(["/spatial/branches"])
		expect(authGuard(PAGES.get("/spatial/buildings")!)).toEqual({ path: "/" })
		expect(authGuard(PAGES.get("/bookings/reception-desk")!)).toEqual({ path: "/" })
		expect(homePath()).toBe("/spatial/branches")
	})

	it("adds a screen to operations' menu as its role is granted the permission", () => {
		signIn({ roles: ["operations"], permissions: ["branches.view", "spaces.view", "events.view", "reception.view"] })
		expect(offeredByPermission()).toEqual(["/spatial/branches", "/spatial/spaces", "/bookings/reception-desk", "/bookings/arrivals", "/bookings/approval-queue", "/bookings/active-sessions", "/bookings/close-session", "/community/events"])
		expect(authGuard(PAGES.get("/community/events/create")!)).toBeUndefined()
		// A hidden detail page carries its list page's permission.
		expect(authGuard(PAGES.get("/bookings/active-sessions/:type/:id")!)).toBeUndefined()
	})

	it("offers an account holding every permission every staff page", () => {
		signIn(ACCOUNTS.admin)
		const staffPages = NAV_SECTIONS.filter(section => !section.roles?.includes("provider") && !section.employee)
			.flatMap(section => section.pages.filter(page => !page.hidden).map(page => navRoutePath(section, page)))
		expect(offered()).toEqual(staffPages)
		expect(homePath()).toBe("/dashboard/overview")
	})

	it("shows an HR role only HR, its own file, and what is open to every staff account", () => {
		signIn(ACCOUNTS["an HR role"])
		expect(offeredByPermission().every(path => path.startsWith("/hr"))).toBe(true)
		// dashboard + the ComingSoon placeholders (plans' wallet, access, the café, incubation), open to all staff.
		expect(NAV_SECTIONS.filter(maySeeSection).map(section => section.key)).toEqual(["dashboard", "plans", "access", "community", "incubation", "hr", "hrTime", "hrPay", "hrReports", "hrSettings", "myHr"])
		expect(homePath()).toBe("/hr/employees")
	})

	it("offers a custom role the pages its permissions open, and lands it on its dashboard panel", () => {
		signIn(ACCOUNTS["a custom role for invoices"])
		expect(offeredByPermission()).toEqual(["/payments/invoices", "/reports/collections"])
		expect(homePath()).toBe("/dashboard/overview")
	})

	it("sends an employee with no permission to My HR", () => {
		signIn(ACCOUNTS["an employee with no role"])
		expect(NAV_SECTIONS.filter(maySeeSection).map(section => section.key)).toEqual(["myHr"])
		expect(homePath()).toBe("/my-hr/profile")
		expect(authGuard(PAGES.get("/dashboard/overview")!)).toEqual({ path: "/my-hr/profile" })
	})

	it("shows a provider only its portal", () => {
		signIn(ACCOUNTS["a provider"])
		expect(NAV_SECTIONS.filter(maySeeSection).map(section => section.key)).toEqual(["providerPortal"])
		expect(homePath()).toBe("/provider/summary")
	})

	it("moves My HR to the avatar menu, out of a sidebar that has other work in it", () => {
		signIn(ACCOUNTS["an HR role"])
		expect(sidebarSections().map(section => section.key)).not.toContain("myHr")
		expect(accountMenuSections().map(section => section.key)).toEqual(["myHr"])
	})

	it("keeps My HR in the sidebar of an employee who has nothing else, rather than leave it empty", () => {
		signIn(ACCOUNTS["an employee with no role"])
		expect(sidebarSections().map(section => section.key)).toEqual(["myHr"])
		expect(accountMenuSections().map(section => section.key)).toEqual(["myHr"])
	})

	it("offers no My HR to an account with no employee record", () => {
		signIn(ACCOUNTS.admin)
		expect(accountMenuSections()).toEqual([])
	})
})
