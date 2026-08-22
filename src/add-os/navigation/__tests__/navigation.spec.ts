import type { RouteRecordRaw } from "vue-router"
import { describe, expect, it } from "vitest"
import ar from "../../lang/ar"
import en from "../../lang/en"
import { createAddOsRoutes } from "../routes"
import { HOME_REDIRECT, NAV_SECTIONS, navRouteName, navRoutePath } from "../sections"

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
	it("covers all thirteen operational sections", () => {
		expect(NAV_SECTIONS).toHaveLength(13)
	})

	it("marks exactly the six built sections as active", () => {
		const active = NAV_SECTIONS.filter(section => section.status === "active").map(section => section.key)

		expect(active).toEqual(["spatial", "system", "members", "plans", "payments", "address"])
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

	it("carries the badge text used by coming-soon sections", () => {
		expect(messagesAt(ar, "common.comingSoon")).toBe("قريباً")
		expect(typeof messagesAt(en, "common.comingSoon")).toBe("string")
	})
})
