import type { MenuMixedOption } from "naive-ui/es/menu/src/interface"
import type { RouteLocationNormalized, RouteRecordRaw } from "vue-router"
import type { AdminUser } from "@/types/auth.d"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it } from "vitest"
import { accountMenuSections, homePath, maySeeSection, menuPages, sidebarSections } from "@/add-os/navigation/access"
import { accountMenuOptions } from "@/add-os/navigation/accountMenu"
import { authGuard } from "@/add-os/navigation/authGuard"
import { createAddOsRoutes } from "@/add-os/navigation/routes"
import { NAV_GROUPS, NAV_SECTIONS, navGroupMenuKey, navRouteName, navRoutePath } from "@/add-os/navigation/sections"
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
 */

const employee = { id: 9, employee_number: "ADD-0009", name: { ar: "يزن دبس", en: "Yazan Dibs" }, status: "probation" } as AdminUser["employee"]
const HR_ALL = ["hr.employees.view", "hr.org.view", "hr.alerts.view", "hr.approvals.manage", "hr.leave.view", "hr.attendance.view", "hr.timesheets.view", "hr.payroll.view", "hr.reports.view"]

const ACCOUNTS: Record<string, Partial<AdminUser>> = {
	"admin": { roles: ["admin"], permissions: ["branches.view", "providers.view", "provider-requests.view", "invoices.view", "office-leases.view", "renewals.manage", "reports.view", "dashboard.finance", "dashboard.spaces"] },
	"operations, branches only": { roles: ["operations"], permissions: ["branches.view", "branches.update"] },
	"operations, nothing": { roles: ["operations"], permissions: [] },
	"an HR role": { roles: ["hr_manager"], permissions: HR_ALL, employee },
	"a reports-only HR role": { roles: ["hr_qa_reports"], permissions: ["hr.reports.view"] },
	"a custom role for invoices": { roles: ["finance_clerk"], permissions: ["invoices.view", "dashboard.finance"] },
	"a custom role with nothing": { roles: ["empty_role"], permissions: [] },
	"an employee with no role": { roles: [], permissions: [], employee },
	"a member who is an employee": { roles: ["member"], permissions: [], employee },
	"a provider": { roles: ["provider"], permissions: [] }
}

/** Each page as the router sees it: the section's meta, then the page's. */
const PAGES = new Map<string, RouteLocationNormalized>()
for (const parent of createAddOsRoutes()) {
	for (const child of parent.children ?? ([] as RouteRecordRaw[])) {
		const path = `${parent.path}/${child.path}`
		PAGES.set(path, { path, fullPath: path, query: {}, meta: { ...parent.meta, ...child.meta } } as unknown as RouteLocationNormalized)
	}
}

/** The sections the sidebar lists, in order — a group's modules count as their own sections. */
function menuSections(items: MenuMixedOption[]): string[] {
	const groups = new Set(Object.values(NAV_GROUPS).map(navGroupMenuKey))
	return items
		.flatMap(item => (groups.has(String(item.key)) ? ((item as { children?: MenuMixedOption[] }).children ?? []) : [item]))
		.map(item => String(item.key).split(".")[0])
}

function signIn(account: Partial<AdminUser>) {
	useAuthStore().setLogged({ id: 1, name: "Account", email: "account@test.local", roles: [], ...account } as AdminUser)
}

describe("sidebar, route guard and \"/\" agree", () => {
	beforeEach(() => {
		localStorage.clear()
		setActivePinia(createPinia())
	})

	describe.each(Object.entries(ACCOUNTS))("%s", (_label, account) => {
		it("lets the guard through to every page the sidebar offers", () => {
			signIn(account)
			const refused: string[] = []
			for (const section of NAV_SECTIONS.filter(maySeeSection)) {
				for (const page of menuPages(section)) {
					const path = navRoutePath(section, page)
					const answer = authGuard(PAGES.get(path)!)
					if (answer !== undefined) refused.push(`${path} → ${JSON.stringify(answer)}`)
				}
			}
			expect(refused).toEqual([])
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

	it("shows an HR role only HR, its own file and the dashboard home — no admin page ADD Core keeps for admin and operations", () => {
		signIn(ACCOUNTS["an HR role"])
		expect(NAV_SECTIONS.filter(maySeeSection).map(section => section.key)).toEqual(["dashboard", "hr", "hrTime", "hrPay", "hrReports", "hrSettings", "myHr"])
		expect(homePath()).toBe("/hr/employees")
	})

	it("sends an employee with no role to My HR", () => {
		signIn(ACCOUNTS["an employee with no role"])
		expect(NAV_SECTIONS.filter(maySeeSection).map(section => section.key)).toEqual(["myHr"])
		expect(homePath()).toBe("/my-hr/profile")
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

	it("offers a custom role the admin pages its permissions open, and only those", () => {
		signIn(ACCOUNTS["a custom role for invoices"])
		const offered = NAV_SECTIONS.filter(maySeeSection).flatMap(section => menuPages(section).map(page => navRoutePath(section, page)))
		expect(offered).toEqual(["/dashboard/overview", "/payments/invoices"])
		expect(homePath()).toBe("/dashboard/overview")
	})

	it("keeps operations on its old landing when it holds no dashboard panel", () => {
		signIn(ACCOUNTS["operations, branches only"])
		expect(homePath()).toBe("/spatial/branches")
	})

	it("moves operations off a landing it may not open", () => {
		signIn(ACCOUNTS["operations, nothing"])
		const home = homePath()
		expect(home).not.toBe("/spatial/branches")
		expect(authGuard(PAGES.get(home)!)).toBeUndefined()
	})
})
