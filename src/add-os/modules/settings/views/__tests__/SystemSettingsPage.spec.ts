import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const FILE = path.resolve(__dirname, "..", "SystemSettingsPage.vue")
const source = readFileSync(FILE, "utf8")

describe("systemSettingsPage wiring", () => {
	it("uses the settings service methods", () => {
		expect(source).toContain('from "@/add-os/services/settings"')
		expect(source).toContain("listSettings")
		expect(source).toContain("updateSetting")
	})

	it("renders search input, data table and edit modal", () => {
		expect(source).toContain("<n-data-table")
		expect(source).toContain("<n-modal")
		expect(source).toContain("editModalVisible")
	})

	it("translates titles and operations via vue-i18n", () => {
		expect(source).toContain('t("systemSettings.description")')
		expect(source).toContain('t("systemSettings.refresh")')
	})
})
