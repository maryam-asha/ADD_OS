import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import { canViewReports } from "@/add-os/config/permissions"
import { NAV_SECTIONS } from "@/add-os/navigation/sections"
import {
	formatReportMoney,
	getAdminProvidersReport,
	getAdminRevenueReport,
	getProviderCompaniesReport,
	getProviderInvoicesReport
} from "@/add-os/services/reports"
import * as api from "@/add-os/services/api"
import { useAuthStore } from "@/stores/auth"
import getItems from "@/app-layouts/common/Navbar/items"

describe("Reports Service & Money Formatter", () => {
	it("formats money as it is — no trailing zeros — with its own currency, never merged", () => {
		expect(formatReportMoney("300", "USD")).toContain("300 $")
		expect(formatReportMoney("300.00", "USD")).not.toContain(".00")
		expect(formatReportMoney("100.5", "EUR")).toContain("100.5 €")
		expect(formatReportMoney("12.75", "USD")).toContain("12.75")
		expect(formatReportMoney("500", "SYP")).toContain("500")
		// Unknown currency fallback:
		expect(formatReportMoney("250.70", "GBP")).toContain("250.7 GBP")
	})

	it("fetches provider companies report from expected endpoint", async () => {
		const mockData = [
			{
				id: 1,
				legal_name: "Tech Corp",
				status: "active",
				members_count: 5,
				membership: null,
				active_leases_count: 1,
				outstanding: [{ currency: "USD", remaining: "100.00", overdue: "0.00" }]
			}
		]
		vi.spyOn(api, "get").mockResolvedValueOnce({ data: mockData })

		const res = await getProviderCompaniesReport()
		expect(api.get).toHaveBeenCalledWith("/api/v1/provider/reports/companies")
		expect(res).toEqual(mockData)
	})

	it("fetches provider invoices report with period parameters", async () => {
		const mockData = {
			totals: [],
			aging: [],
			by_company: []
		}
		vi.spyOn(api, "get").mockResolvedValueOnce({ data: mockData })

		const res = await getProviderInvoicesReport({ from: "2026-01-01", to: "2026-03-31" })
		expect(api.get).toHaveBeenCalledWith("/api/v1/provider/reports/invoices", {
			from: "2026-01-01",
			to: "2026-03-31"
		})
		expect(res).toEqual(mockData)
	})

	it("fetches admin providers report from expected endpoint", async () => {
		const mockData = [
			{
				id: 1,
				name: "Provider A",
				status: "active",
				active_companies: 2,
				seats: 10,
				branch_share: [],
				active_leases: 1,
				outstanding: []
			}
		]
		vi.spyOn(api, "get").mockResolvedValueOnce({ data: mockData })

		const res = await getAdminProvidersReport()
		expect(api.get).toHaveBeenCalledWith("/api/v1/admin/reports/providers")
		expect(res).toEqual(mockData)
	})

	it("fetches admin revenue report with period and provider_id filter", async () => {
		const mockData = {
			totals: [],
			by_source: [],
			aging: [],
			top_overdue: []
		}
		vi.spyOn(api, "get").mockResolvedValueOnce({ data: mockData })

		const res = await getAdminRevenueReport({ from: "2026-01-01", to: "2026-06-30", provider_id: 42 })
		expect(api.get).toHaveBeenCalledWith("/api/v1/admin/reports/revenue", {
			from: "2026-01-01",
			to: "2026-06-30",
			provider_id: 42
		})
		expect(res).toEqual(mockData)
	})
})

describe("Reports Permissions & Navigation Gating", () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	it("canViewReports checks the reports.view permission", () => {
		const auth = useAuthStore()
		auth.permissions = ["reports.view"]

		expect(canViewReports()).toBe(true)

		auth.permissions = []
		expect(canViewReports()).toBe(false)
	})

	it("hides reports section from navbar if user lacks reports.view permission", () => {
		const auth = useAuthStore()
		auth.logged = true
		auth.role = "admin"
		auth.permissions = [] // no reports.view

		const itemsWithoutPerm = getItems({ mode: "vertical", collapsed: false })
		const hasReportsWithoutPerm = itemsWithoutPerm.some(item => item.key === "reports")
		expect(hasReportsWithoutPerm).toBe(false)

		// Grant permission
		auth.permissions = ["reports.view"]
		const itemsWithPerm = getItems({ mode: "vertical", collapsed: false })
		const hasReportsWithPerm = itemsWithPerm.some(item => item.key === "reports")
		expect(hasReportsWithPerm).toBe(true)
	})

	it("provider portal includes company report and invoice statement pages", () => {
		const providerSection = NAV_SECTIONS.find(s => s.key === "providerPortal")
		expect(providerSection).toBeDefined()
		const pageKeys = providerSection?.pages.map(p => p.key)
		expect(pageKeys).toContain("companyReport")
		expect(pageKeys).toContain("invoiceStatement")
	})

	it("admin reports section includes providers and revenue report pages", () => {
		const reportsSection = NAV_SECTIONS.find(s => s.key === "reports")
		expect(reportsSection).toBeDefined()
		expect(reportsSection?.permission).toBe("reports.view")
		const pageKeys = reportsSection?.pages.map(p => p.key)
		expect(pageKeys).toContain("providersReport")
		expect(pageKeys).toContain("revenueReport")
	})
})
