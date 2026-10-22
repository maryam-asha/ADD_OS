import type { MenuMixedOption } from "naive-ui/es/menu/src/interface"
import type { RouteRecordRaw } from "vue-router"
import type { AdminUser } from "@/types/auth.d"
import { createPinia, setActivePinia } from "pinia"
import { describe, expect, it } from "vitest"
import ComingSoon from "@/add-os/views/ComingSoon.vue"
import getItems from "@/app-layouts/common/Navbar/items"
import { useAuthStore } from "@/stores/auth"
import ar from "../../lang/ar"
import en from "../../lang/en"
import { createAddOsRoutes } from "../routes"
import { HOME_REDIRECT, NAV_GROUPS, NAV_SECTIONS, navGroupTitleKey, navRouteName, navRoutePath } from "../sections"

/**
 * ADD OS — keeps the menu, the routes, and the translations in agreement.
 *
 * All three are derived from `sections.ts`, but derivation only helps if the
 * pieces it feeds actually line up: a section with no translation renders a raw
 * key, and a home redirect pointing at a removed page is a dead landing page.
 */

const routes = createAddOsRoutes()

function messagesAt(bundle: unknown, path: string): unknown {
	return path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], bundle)
}

function childrenOf(route: RouteRecordRaw): RouteRecordRaw[] {
	return route.children ?? []
}

describe("section list", () => {
	it("covers all operational sections", () => {
		expect(NAV_SECTIONS).toHaveLength(24)
	})

	it("marks exactly the built sections as active", () => {
		const active = NAV_SECTIONS.filter(section => section.status === "active").map(section => section.key)

		expect(active).toEqual([
			"dashboard",
			"spatial",
			"system",
			"members",
			"providers",
			"providerPortal",
			"bookings",
			"plans",
			"payments",
			"reports",
			"community",
			"address",
			"cms",
			"appContent",
			"hr",
			"hrTime",
			"hrPay",
			"hrTalent",
			"hrReports",
			"hrSettings",
			"myHr",
			"settings"
		])
	})

	it("gives every section at least one page", () => {
		const empty = NAV_SECTIONS.filter(section => section.pages.length === 0).map(section => section.key)

		expect(empty).toEqual([])
	})

	it("uses unique section keys and unique paths", () => {
		const keys = NAV_SECTIONS.map(section => section.key)
		const paths = NAV_SECTIONS.map(section => section.path)

		expect(new Set(keys).size).toBe(keys.length)
		expect(new Set(paths).size).toBe(paths.length)
	})

	it("uses unique route names across every page", () => {
		const names = NAV_SECTIONS.flatMap(section => section.pages.map(page => navRouteName(section, page)))

		expect(new Set(names).size).toBe(names.length)
	})
})

describe("routes", () => {
	it("emits one route per section", () => {
		expect(routes).toHaveLength(NAV_SECTIONS.length)
	})

	it("emits one child per page, at the expected path", () => {
		for (const [index, section] of NAV_SECTIONS.entries()) {
			const children = childrenOf(routes[index])

			expect(children).toHaveLength(section.pages.length)

			for (const [pageIndex, page] of section.pages.entries()) {
				expect(children[pageIndex].name).toBe(navRouteName(section, page))
				expect(`${routes[index].path}/${children[pageIndex].path}`).toBe(navRoutePath(section, page))
			}
		}
	})

	it("redirects each section to its own first page", () => {
		for (const [index, section] of NAV_SECTIONS.entries()) {
			expect(routes[index].redirect).toBe(navRoutePath(section, section.pages[0]))
		}
	})

	it("guards every section behind auth", () => {
		for (const route of routes) {
			expect(route.meta?.auth).toBe(true)
		}
	})

	/**
	 * `active` is a promise to the operator that the section leads somewhere.
	 * A section can legitimately mix real pages with placeholders — `payments`
	 * does — but one marked active with nothing behind it at all is a lie the
	 * status field is supposed to prevent. This also catches the quieter
	 * version: a `PAGE_COMPONENTS` key misspelled against `navRouteName`, which
	 * fails open to ComingSoon and looks exactly like work not started.
	 */
	it("gives every active section at least one page that is not the placeholder", () => {
		const placeholderOnly = NAV_SECTIONS.filter(
			(section, index) => section.status === "active" && childrenOf(routes[index]).every(child => child.component === ComingSoon)
		).map(section => section.key)

		expect(placeholderOnly).toEqual([])
	})

	it("points the home redirect at a page that exists", () => {
		const allPaths = NAV_SECTIONS.flatMap(section => section.pages.map(page => navRoutePath(section, page)))

		expect(allPaths).toContain(HOME_REDIRECT)
	})

	it("lands home on an active section, not a placeholder-only one", () => {
		const active = NAV_SECTIONS.filter(section => section.status === "active")
		const activePaths = active.flatMap(section => section.pages.map(page => navRoutePath(section, page)))

		expect(activePaths).toContain(HOME_REDIRECT)
	})
})

describe("translations", () => {
	it("translates every section title in both languages", () => {
		const missing: string[] = []

		for (const section of NAV_SECTIONS) {
			const key = `nav.sections.${section.key}`
			if (typeof messagesAt(ar, key) !== "string") missing.push(`ar → ${key}`)
			if (typeof messagesAt(en, key) !== "string") missing.push(`en → ${key}`)
		}

		expect(missing).toEqual([])
	})

	it("translates every page title in both languages", () => {
		const missing: string[] = []

		for (const section of NAV_SECTIONS) {
			for (const page of section.pages) {
				const key = `nav.pages.${page.key}`
				if (typeof messagesAt(ar, key) !== "string") missing.push(`ar → ${key}`)
				if (typeof messagesAt(en, key) !== "string") missing.push(`en → ${key}`)
			}
		}

		expect(missing).toEqual([])
	})

	it("translates every group title in both languages", () => {
		const missing: string[] = []

		for (const group of Object.values(NAV_GROUPS)) {
			const key = navGroupTitleKey(group)
			if (typeof messagesAt(ar, key) !== "string") missing.push(`ar → ${key}`)
			if (typeof messagesAt(en, key) !== "string") missing.push(`en → ${key}`)
		}

		expect(missing).toEqual([])
	})

	it("carries the badge text used by coming-soon sections", () => {
		expect(messagesAt(ar, "common.comingSoon")).toBe("قريباً")
		expect(typeof messagesAt(en, "common.comingSoon")).toBe("string")
	})
})

describe("sidebar menu items", () => {
	it("renders single-page sections like dashboard as direct top-level links without children", () => {
		setActivePinia(createPinia())
		const authStore = useAuthStore()
		authStore.logged = true
		authStore.role = "admin"

		const items = getItems({ mode: "vertical", collapsed: false })
		const dashboardItem = items.find(item => item.key === "dashboard.overview")

		expect(dashboardItem).toBeDefined()
		expect((dashboardItem as { children?: unknown }).children).toBeUndefined()

		// Multi-page sections like spatial should have children
		const spatialItem = items.find(item => item.key === "spatial")
		expect(spatialItem).toBeDefined()
		expect((spatialItem as { children?: unknown[] }).children?.length).toBeGreaterThan(0)
	})
})

describe("sidebar groups", () => {
	const HR_ALL = ["hr.employees.view", "hr.org.view", "hr.alerts.view", "hr.approvals.manage", "hr.leave.view", "hr.attendance.view", "hr.timesheets.view", "hr.payroll.view", "hr.recruitment.view", "hr.performance.view", "hr.training.view", "hr.benefits.view", "hr.loans.manage", "hr.reports.view", "hr.settings.manage"]
	const employee = { id: 9, employee_number: "ADD-0009", name: { ar: "يزن دبس", en: "Yazan Dibs" }, status: "active" } as AdminUser["employee"]

	function menuFor(account: Partial<AdminUser>): MenuMixedOption[] {
		setActivePinia(createPinia())
		useAuthStore().setLogged({ id: 1, name: "Account", email: "account@test.local", roles: [], ...account } as AdminUser)
		return getItems({ mode: "vertical", collapsed: false })
	}

	function childKeys(item: MenuMixedOption | undefined): string[] {
		return ((item as { children?: MenuMixedOption[] } | undefined)?.children ?? []).map(child => String(child.key))
	}

	it("tags exactly HR's six admin sections, in a row, and leaves My HR out of the group", () => {
		const tagged = NAV_SECTIONS.map((section, index) => ({ key: section.key, group: section.group, index })).filter(entry => entry.group === "hr")
		expect(tagged.map(entry => entry.key)).toEqual(["hr", "hrTime", "hrPay", "hrTalent", "hrReports", "hrSettings"])
		expect(tagged.at(-1)!.index - tagged[0].index).toBe(tagged.length - 1)
		expect(NAV_SECTIONS.find(section => section.key === "myHr")?.group).toBeUndefined()
	})

	it("gives HR one sidebar entry holding a module per section, each opening to its pages", () => {
		const items = menuFor({ roles: ["hr_manager"], permissions: HR_ALL, employee })
		expect(items.map(item => String(item.key))).toEqual(["dashboard.overview", "hrGroup"])

		const group = items.find(item => item.key === "hrGroup")
		expect(childKeys(group)).toEqual(["hr", "hrTime", "hrPay", "hrTalent", "hrReports", "hrSettings"])

		const time = (group as { children: MenuMixedOption[] }).children.find(child => child.key === "hrTime")
		expect(childKeys(time)).toContain("hrTime.hrLeaveRequests")
	})

	it("shows a group's only visible section as it stands, not inside a group of one", () => {
		const items = menuFor({ roles: ["hr_qa_reports"], permissions: ["hr.reports.view"] })
		const keys = items.map(item => String(item.key))
		expect(keys).toContain("hrReports")
		expect(keys).not.toContain("hrGroup")
	})
})
