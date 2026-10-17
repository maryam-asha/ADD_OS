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

	it("guides to Private Office Requests instead of opening an empty dropdown when nothing is quoted", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).toContain("companies.create.noQuotedRequestsTitle")
		// Never unconditionally opens the drawer as openCreate's first statement — it must
		// sit behind the quoted-requests guard. (The brief's original regex here was
		// `/createDrawerVisible\.value = true\s*$/m` with a bare `.not.toMatch`, which can
		// never pass against a correctly-guarded implementation in this codebase's
		// no-semicolon style: the assignment legitimately ends its own line inside the
		// guarded branch, so the pattern matches the *correct* code too. Verified via a
		// direct regex repro against the brief's own Step 1 code before changing this.)
		expect(source).not.toMatch(/function openCreate\(\) \{\s*createDrawerVisible\.value = true/)
	})

	it("never sends a raw HTTP call — only the composables/services layer", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).not.toMatch(/\bfetch\(/)
	})
})
