// src/add-os/modules/members/views/__tests__/CompaniesPage.spec.ts
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const FILE = path.resolve(__dirname, "..", "CompaniesPage.vue")

describe("companiesPage wiring", () => {
	it("opens a company on its own page rather than in a modal", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).toContain('router.push({ name: "members.companyProfile", params: { id: row.id } })')
		expect(source).not.toMatch(/<n-modal|CompanyDetailPanel|AddCompanyMemberDialog/)
	})

	it("filters the create form's request dropdown to quoted requests only, via quotedRequestOptions/quotedRequests", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).toMatch(/quotedRequests\.value|quotedRequestOptions\(/)
	})

	it("guides to Private Office Requests instead of opening an empty form when nothing is quoted", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).toContain("companies.create.noQuotedRequestsTitle")
		// The page is reached only past the quoted-requests guard, never as
		// openCreate's first statement.
		expect(source).not.toMatch(/function openCreate\(\) \{\s*router\.push/)
	})

	it("creates a company on its own page rather than in a dialog", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).toContain('router.push({ name: "members.companyCreate" })')
		expect(source).not.toContain("CreateCompanyDrawer")
	})

	it("never sends a raw HTTP call — only the composables/services layer", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).not.toMatch(/\bfetch\(/)
	})
})
