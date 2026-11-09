import type { AdminUser } from "@/types/auth.d"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it } from "vitest"
import { maySeeSection, menuPages } from "@/add-os/navigation/access"
import { filterPages, normalizeSearchText, searchablePages } from "@/add-os/navigation/pageSearch"
import { NAV_SECTIONS, navRouteName } from "@/add-os/navigation/sections"
import { useAuthStore } from "@/stores/auth"

/**
 * ADD OS — the toolbar search offers the dashboard's own pages, exactly the
 * ones this account's menus offer, and finds them in either language.
 */

function signIn(user: Partial<AdminUser>) {
	useAuthStore().setLogged({ id: 1, name: "Test", email: "t@example.test", roles: [], permissions: [], ...user } as AdminUser)
}

function names(entries: { name: string }[]): string[] {
	return entries.map(entry => entry.name)
}

beforeEach(() => {
	setActivePinia(createPinia())
})

describe("searchablePages", () => {
	it("lists exactly the pages the account's menus offer, in sidebar order", () => {
		signIn({ roles: ["finance_clerk"], permissions: ["invoices.view", "dashboard.finance"] })

		const expected = NAV_SECTIONS.filter(maySeeSection).flatMap(section => menuPages(section).map(page => navRouteName(section, page)))
		expect(names(searchablePages())).toEqual(expected)
		expect(names(searchablePages())).toContain("payments.invoices")
		expect(names(searchablePages())).not.toContain("system.users")
	})

	it("leaves out hidden detail pages", () => {
		signIn({ roles: ["admin"], permissions: ["members.view"] })

		expect(names(searchablePages())).not.toContain("members.memberProfile")
	})

	it("offers a provider only its portal", () => {
		signIn({ roles: ["provider"] })

		const offered = searchablePages()
		expect(offered.length).toBeGreaterThan(0)
		expect(offered.every(entry => entry.name.startsWith("providerPortal."))).toBe(true)
	})

	it("carries none of the template's demo entries", () => {
		signIn({ roles: ["admin"], permissions: ["invoices.view"] })

		expect(names(searchablePages()).some(name => name.startsWith("Apps-"))).toBe(false)
	})
})

describe("filterPages", () => {
	beforeEach(() => {
		signIn({ roles: ["finance_clerk"], permissions: ["invoices.view"] })
	})

	it("finds a page by its English title whatever the interface language", () => {
		expect(names(filterPages(searchablePages(), "invoices"))).toContain("payments.invoices")
	})

	it("finds a page by its Arabic title, ignoring hamza and ta marbuta spellings", () => {
		expect(names(filterPages(searchablePages(), "الفواتير"))).toContain("payments.invoices")
		expect(names(filterPages(searchablePages(), "الفواتير"))).not.toContain("dashboard.overview")
	})

	it("finds a page by its path", () => {
		expect(names(filterPages(searchablePages(), "/payments/invoices"))).toEqual(["payments.invoices"])
	})

	it("requires every word to match", () => {
		expect(filterPages(searchablePages(), "invoices zzzz")).toEqual([])
	})

	it("keeps everything for an empty query", () => {
		expect(filterPages(searchablePages(), "   ")).toHaveLength(searchablePages().length)
	})
})

describe("normalizeSearchText", () => {
	it("folds alef forms, ta marbuta, alef maqsura, diacritics and case", () => {
		expect(normalizeSearchText("أإآ")).toBe("ااا")
		expect(normalizeSearchText("فاتورة")).toBe("فاتوره")
		expect(normalizeSearchText("مبنى")).toBe("مبني")
		expect(normalizeSearchText("مُوَظَّف")).toBe("موظف")
		expect(normalizeSearchText("  Invoices   LIST ")).toBe("invoices list")
	})
})
