import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const FILE = path.resolve(__dirname, "..", "CashRegisterPage.vue")
const source = readFileSync(FILE, "utf8")

describe("cashRegisterPage wiring", () => {
	it("uses cash-register service methods", () => {
		expect(source).toContain('from "@/add-os/services/cash-register"')
		expect(source).toContain("getCurrentSession")
		expect(source).toContain("openCashRegisterSession")
		expect(source).toContain("closeCashRegisterSession")
		expect(source).toContain("listCashRegisterSessions")
	})

	it("renders card, data table, and modals for open and close", () => {
		expect(source).toContain("<n-card")
		expect(source).toContain("<n-data-table")
		expect(source).toContain("openModalVisible")
		expect(source).toContain("closeModalVisible")
	})

	it("translates text and statuses via vue-i18n", () => {
		expect(source).toContain('t("cashRegister.openButton")')
		expect(source).toContain('t("cashRegister.closeButton")')
		expect(source).toContain('t("cashRegister.historyTitle")')
	})
})
