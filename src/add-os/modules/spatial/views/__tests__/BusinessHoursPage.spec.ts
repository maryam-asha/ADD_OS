// src/add-os/modules/spatial/views/__tests__/BusinessHoursPage.spec.ts
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const FILE = path.resolve(__dirname, "..", "BusinessHoursPage.vue")
const source = readFileSync(FILE, "utf8")

describe("businessHoursPage wiring", () => {
	it("gates both tabs' delete actions behind canDeleteBusinessHours, not an inline role check", () => {
		expect(source).toContain('from "@/add-os/config/permissions"')
		expect(source).toContain("canDeleteHours ? (async row => { await hourMutations.remove(row.id) }) : undefined")
		expect(source).toContain("canDeleteHours ? (async row => { await exceptionMutations.remove(row.id) }) : undefined")
	})

	it("clears open_time/close_time when an exception is submitted as closed, per the backend's is_closed=true contract", () => {
		expect(source).toMatch(/if \(withBranch\.is_closed\) \{\s*withBranch\.open_time = null\s*withBranch\.close_time = null/)
	})

	it("scopes both lists to the selected branch via branch_id, not an unfiltered list", () => {
		expect(source).toContain("useResourceList<BusinessHour>(listBusinessHours, branchQuery)")
		expect(source).toContain("useResourceList<BusinessHourException>(listBusinessHourExceptions, branchQuery)")
	})

	it("never sends a raw HTTP call — only the composables/services layer", () => {
		expect(source).not.toMatch(/\bfetch\(/)
	})
})
