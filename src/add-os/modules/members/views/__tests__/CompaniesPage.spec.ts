// src/add-os/modules/members/views/__tests__/CompaniesPage.spec.ts
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const FILE = path.resolve(__dirname, "..", "CompaniesPage.vue")
const DETAIL_PANEL_FILE = path.resolve(__dirname, "..", "..", "components", "CompanyDetailPanel.vue")

describe("companiesPage wiring", () => {
	it("imports AddCompanyMemberDialog from the shared component path — the same one CompanyDetailPanel uses", () => {
		const pageSource = readFileSync(FILE, "utf8")
		const panelSource = readFileSync(DETAIL_PANEL_FILE, "utf8")

		expect(pageSource).toContain('from "@/add-os/modules/members/components/AddCompanyMemberDialog.vue"')
		expect(panelSource).toContain('from "./AddCompanyMemberDialog.vue"')
	})

	it("passes the row's own id as company-id to the quick-add dialog, not a hardcoded value", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).toContain(":company-id=\"quickAddCompanyId\"")
		expect(source).toContain("quickAddCompanyId.value = row.id")
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
