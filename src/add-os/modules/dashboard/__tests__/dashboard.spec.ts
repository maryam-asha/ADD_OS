import type { BranchSeats } from "@/add-os/services/dashboard"
import { flushPromises, mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ref } from "vue"
import { createI18n } from "vue-i18n"
import { canViewDashboard, canViewDashboardSection } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en"
import AttentionList from "@/add-os/modules/dashboard/components/AttentionList.vue"
import DashboardPanel from "@/add-os/modules/dashboard/components/DashboardPanel.vue"
import InvoiceTotalsCards from "@/add-os/modules/dashboard/components/InvoiceTotalsCards.vue"
import PeakHeatmap from "@/add-os/modules/dashboard/components/PeakHeatmap.vue"
import ReceivablesAging from "@/add-os/modules/dashboard/components/ReceivablesAging.vue"
import OfficesGaugeCard from "@/add-os/modules/dashboard/components/stats/OfficesGaugeCard.vue"
import SeatsGaugeCard from "@/add-os/modules/dashboard/components/stats/SeatsGaugeCard.vue"
import StatusTiles from "@/add-os/modules/dashboard/components/stats/StatusTiles.vue"
import StatTile from "@/add-os/modules/dashboard/components/StatTile.vue"
import { useOverview } from "@/add-os/modules/dashboard/composables/useOverview"
import { addAmounts, amountIn, currenciesOf } from "@/add-os/modules/dashboard/config/money"
import { localDay, matchPreset, presetPeriod, previousPeriod } from "@/add-os/modules/dashboard/config/period"
import { NAV_SECTIONS } from "@/add-os/navigation/sections"
import * as api from "@/add-os/services/api"
import { getAppUsers, getBookingsByStatus, getDailyBookings, getDailyMembers, getFinanceOverview, getMembersOverview, getOperationsOverview, getServiceRequestStats, getSpacesOverview } from "@/add-os/services/dashboard"
import { useAuthStore } from "@/stores/auth"

function i18n() {
	return createI18n({ legacy: false, locale: "en", fallbackLocale: "en", messages: { en } })
}

describe("dashboard service", () => {
	it("asks for operations with the period and the branch", async () => {
		const spy = vi.spyOn(api, "get").mockResolvedValueOnce({ data: { now: {} } })

		await getOperationsOverview({ from: "2026-10-01", to: "2026-10-13", branch_id: 3 })

		expect(spy).toHaveBeenCalledWith("/api/v1/admin/dashboard/operations", { from: "2026-10-01", to: "2026-10-13", branch_id: 3 })
	})

	it("never sends a branch for finance — money belongs to no branch", async () => {
		const spy = vi.spyOn(api, "get").mockResolvedValueOnce({ data: {} })

		await getFinanceOverview({ from: "2026-10-01", to: "2026-10-13", branch_id: 3 })

		expect(spy).toHaveBeenCalledWith("/api/v1/admin/dashboard/finance", { from: "2026-10-01", to: "2026-10-13" })
	})

	it("asks for spaces with the type and the one space picked", async () => {
		const spy = vi.spyOn(api, "get").mockResolvedValueOnce({ data: {} })

		await getSpacesOverview({ from: "2026-10-01", to: "2026-10-13", branch_id: 3, space_type: "room", space_id: 7 })

		expect(spy).toHaveBeenCalledWith("/api/v1/admin/dashboard/spaces", { from: "2026-10-01", to: "2026-10-13", branch_id: 3, space_type: "room", space_id: 7 })
	})

	it("leaves out the filters that are not set", async () => {
		const spy = vi.spyOn(api, "get").mockResolvedValueOnce({ data: {} })

		await getMembersOverview({ from: null, to: null, branch_id: null })

		expect(spy).toHaveBeenCalledWith("/api/v1/admin/dashboard/members", {})
	})
})

describe("dashboard permissions", () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	it("shows each section only to whoever holds its permission", () => {
		const auth = useAuthStore()
		auth.permissions = ["dashboard.operations"]

		expect(canViewDashboardSection("operations")).toBe(true)
		expect(canViewDashboardSection("finance")).toBe(false)
		expect(canViewDashboardSection("members")).toBe(false)
		expect(canViewDashboardSection("spaces")).toBe(false)
		expect(canViewDashboard()).toBe(true)

		auth.permissions = []
		expect(canViewDashboard()).toBe(false)
	})

	it("is a live section with a real page", () => {
		expect(NAV_SECTIONS.find(section => section.key === "dashboard")?.status).toBe("active")
	})
})

describe("dashboard periods", () => {
	const today = new Date(2026, 9, 13)

	it("ends every preset today", () => {
		expect(presetPeriod("today", today)).toEqual({ from: "2026-10-13", to: "2026-10-13" })
		expect(presetPeriod("last7Days", today)).toEqual({ from: "2026-10-07", to: "2026-10-13" })
		expect(presetPeriod("thisMonth", today)).toEqual({ from: "2026-10-01", to: "2026-10-13" })
		expect(presetPeriod("thisYear", today)).toEqual({ from: "2026-01-01", to: "2026-10-13" })
	})

	it("recognises a preset, and a custom range as none", () => {
		expect(matchPreset({ from: "2026-10-01", to: "2026-10-13" }, today)).toBe("thisMonth")
		expect(matchPreset({ from: "2026-10-02", to: "2026-10-13" }, today)).toBeNull()
	})

	it("compares with as many days again, ending the day before", () => {
		expect(previousPeriod({ from: "2026-10-01", to: "2026-10-15" })).toEqual({ from: "2026-09-16", to: "2026-09-30" })
		expect(previousPeriod({ from: "2026-10-13", to: "2026-10-13" })).toEqual({ from: "2026-10-12", to: "2026-10-12" })
		expect(previousPeriod({ from: "2026-03-01", to: "2026-03-31" })).toEqual({ from: "2026-01-29", to: "2026-02-28" })
	})

	it("reads a day as local midnight", () => {
		const day = localDay("2026-10-01")
		expect([day.getFullYear(), day.getMonth(), day.getDate(), day.getHours()]).toEqual([2026, 9, 1, 0])
	})
})

describe("dashboard money", () => {
	it("adds amounts exactly, without float cents", () => {
		expect(addAmounts(["0.1", "0.2"])).toBe("0.3")
		expect(addAmounts(["150000", "10.5", null])).toBe("150010.5")
		expect(addAmounts([])).toBe("0")
		expect(addAmounts(["-5", "2.25"])).toBe("-2.75")
	})

	it("keeps currencies apart", () => {
		const cash = [{ currency: "SYP", amount: "150000" }]
		const card = [{ currency: "USD", amount: "10" }]

		expect(currenciesOf(cash, card)).toEqual(["SYP", "USD"])
		expect(amountIn(cash, "USD")).toBeNull()
		expect(amountIn(card, "USD")).toBe("10")
	})
})

describe("statTile", () => {
	it("marks a rise as good news when more is better", () => {
		const wrapper = mount(StatTile, {
			props: { label: "Bookings", icon: "carbon:calendar", value: 12, previous: 9 },
			global: { plugins: [i18n()] }
		})

		expect(wrapper.text()).toContain("+3")
		expect(wrapper.text()).toContain("Previous period: 9")
		expect(wrapper.html()).toContain("--add-success-text")

		wrapper.unmount()
	})

	it("marks a rise as bad news when less is better, in percentage points", () => {
		const wrapper = mount(StatTile, {
			props: { label: "No-show rate", icon: "carbon:view-off", value: 33.33, previous: 25, kind: "percent", better: "down" },
			global: { plugins: [i18n()] }
		})

		expect(wrapper.text()).toContain("33.33%")
		expect(wrapper.text()).toContain("\u2066+8.33\u2069 pts")
		expect(wrapper.html()).toContain("--add-danger-text")

		wrapper.unmount()
	})

	it("says when nothing could be measured", () => {
		const wrapper = mount(StatTile, {
			props: { label: "No-show rate", icon: "carbon:view-off", value: null, previous: null, kind: "percent" },
			global: { plugins: [i18n()] }
		})

		expect(wrapper.text()).toContain("No data")

		wrapper.unmount()
	})
})

describe("attentionList", () => {
	it("shows only what is waiting, most first, and folds the rest into one line", () => {
		const wrapper = mount(AttentionList, {
			props: {
				items: [
					{ key: "a", label: "Bookings awaiting approval", count: 2 },
					{ key: "b", label: "Open service requests", count: 0 },
					{ key: "c", label: "New website inquiries", count: 5 }
				]
			},
			global: { plugins: [i18n()] }
		})

		const text = wrapper.text()
		expect(text.indexOf("New website inquiries")).toBeLessThan(text.indexOf("Bookings awaiting approval"))
		expect(text).not.toContain("Open service requests")
		expect(text).toContain("1 with nothing waiting")
		wrapper.unmount()
	})

	it("says when nothing is waiting", () => {
		const wrapper = mount(AttentionList, {
			props: { items: [{ key: "b", label: "Open service requests", count: 0 }] },
			global: { plugins: [i18n()] }
		})

		expect(wrapper.text()).toContain("Nothing waiting")
		wrapper.unmount()
	})
})

describe("receivablesAging", () => {
	it("marks the largest band and explains the spread, one currency per card", () => {
		const wrapper = mount(ReceivablesAging, {
			props: { aging: [{ currency: "SYP", "0_30": "1681", "31_60": "126001", "60_plus": "7001" }] },
			global: { plugins: [i18n()], stubs: { RouterLink: true } }
		})

		const text = wrapper.text()
		expect(text).toContain("134,683")
		expect(text).toContain("Largest share")
		expect(text).toContain("93.6%")
		expect(text).toContain("turns critical within 30 days")
		wrapper.unmount()
	})

	it("says so when nothing is overdue", () => {
		const wrapper = mount(ReceivablesAging, {
			props: { aging: [] },
			global: { plugins: [i18n()], stubs: { RouterLink: true } }
		})

		expect(wrapper.text()).toContain("Nothing is overdue")
		wrapper.unmount()
	})
})

describe("peakHeatmap", () => {
	it("draws only the hours that saw a booking and names the busiest", () => {
		const minutes: number[][] = Array.from({ length: 7 }, () => Array.from<number>({ length: 24 }).fill(0))
		minutes[1][10] = 120
		minutes[2][13] = 60
		currentLocale.value = "en"

		const wrapper = mount(PeakHeatmap, {
			props: { peak: { minutes, busiest_weekday: 1, busiest_hour: 10 } },
			global: { plugins: [i18n()] }
		})

		// Hours 10 through 13, for each of the seven days.
		expect(wrapper.findAll("[title]").length).toBe(28)
		expect(wrapper.text()).toContain("Monday is the busiest day")
		wrapper.unmount()
		currentLocale.value = "ar"
	})
})

describe("dashboardPanel", () => {
	const mountPanel = () => mount(DashboardPanel, {
		props: { section: "spaces", title: "Spaces", icon: "carbon:workspace", isLoading: false, error: null, ready: true },
		slots: { default: "<p>Section body</p>" },
		global: { plugins: [i18n()] }
	})

	it("folds its section away and opens it again, remembering which", async () => {
		localStorage.clear()
		const wrapper = mountPanel()
		const toggle = wrapper.get("button")

		expect(toggle.attributes("aria-expanded")).toBe("true")
		await toggle.trigger("click")
		expect(toggle.attributes("aria-expanded")).toBe("false")
		expect(wrapper.get("#dashboard-section-spaces").isVisible()).toBe(false)
		wrapper.unmount()

		const again = mountPanel()
		expect(again.get("button").attributes("aria-expanded")).toBe("false")
		again.unmount()
		localStorage.clear()
	})
})

describe("invoiceTotalsCards", () => {
	const mountTotals = (totals: Array<{ currency: string; billed: string; paid: string; remaining: string; overdue: string }>) => mount(InvoiceTotalsCards, {
		props: { totals, detailsTo: "/payments/invoices" },
		global: { plugins: [i18n()], stubs: { RouterLink: true } }
	})

	it("splits what was billed into paid, not yet due and overdue, and flags the overdue", () => {
		const wrapper = mountTotals([{ currency: "USD", billed: "11110", paid: "6267.5", remaining: "4842.5", overdue: "1937.5" }])

		const text = wrapper.text()
		expect(text).toContain("11,110")
		// 6267.5 of 11110, and 4842.5 - 1937.5 = 2905 not yet due.
		expect(text).toContain("56.4%")
		expect(text).toContain("2,905")
		expect(text).toContain("Needs follow-up")
		expect(text).toContain("past due and needs follow-up")
		wrapper.unmount()
	})

	it("says so when everything billed is collected", () => {
		const wrapper = mountTotals([{ currency: "SYP", billed: "500", paid: "500", remaining: "0", overdue: "0" }])

		expect(wrapper.text()).toContain("Fully collected")
		expect(wrapper.text()).toContain("Everything billed in this period is collected.")
		wrapper.unmount()
	})
})

describe("statistics service", () => {
	it("asks each card's endpoint with its own filters, never the refresh counter", async () => {
		const spy = vi.spyOn(api, "get").mockResolvedValue({ data: {} })
		const period = { from: "2026-10-01", to: "2026-10-13", refresh: 3 }

		await getBookingsByStatus({ ...period, branch_id: 2, space_type: "room" })
		expect(spy).toHaveBeenLastCalledWith("/api/v1/admin/dashboard/stats/bookings-by-status", { from: "2026-10-01", to: "2026-10-13", branch_id: 2, space_type: "room" })

		await getServiceRequestStats(period)
		expect(spy).toHaveBeenLastCalledWith("/api/v1/admin/dashboard/stats/service-requests", { from: "2026-10-01", to: "2026-10-13" })

		await getDailyBookings(period)
		expect(spy).toHaveBeenLastCalledWith("/api/v1/admin/dashboard/stats/daily-bookings", { from: "2026-10-01", to: "2026-10-13" })

		await getDailyMembers(period)
		expect(spy).toHaveBeenLastCalledWith("/api/v1/admin/dashboard/stats/daily-members", { from: "2026-10-01", to: "2026-10-13" })

		await getAppUsers()
		expect(spy).toHaveBeenLastCalledWith("/api/v1/admin/dashboard/stats/app-users")
		spy.mockRestore()
	})
})

describe("statusTiles", () => {
	it("shows every tile with its label and count, zero included", () => {
		const wrapper = mount(StatusTiles, {
			props: {
				items: [
					{ key: "completed", label: "Completed", count: 1284, icon: "carbon:checkmark-filled", tone: "success" },
					{ key: "rejected", label: "Rejected", count: 0, icon: "carbon:misuse-outline", tone: "danger" }
				]
			},
			global: { stubs: { RouterLink: true } }
		})

		expect(wrapper.text()).toContain("Completed")
		expect(wrapper.text()).toContain("1,284")
		expect(wrapper.text()).toContain("Rejected")
		expect(wrapper.text()).toContain("0")
		wrapper.unmount()
	})
})

describe("branch gauges", () => {
	const gauge = { name: "apexchart", props: ["series", "options", "type", "height"], template: "<div class='gauge' />" }
	const branches: BranchSeats[] = [
		{ id: 1, name: "A", seats: 10, taken: 5, offices: 4, offices_leased: 1 },
		{ id: 2, name: "B", seats: 10, taken: 9, offices: 2, offices_leased: 2 },
		{ id: 3, name: "C", seats: 10, taken: 12, offices: 0, offices_leased: 0 }
	]
	const mountGauge = (card: typeof SeatsGaugeCard | typeof OfficesGaugeCard, branchId: number | null = null) => mount(card, {
		props: { branches, branchId, isLoading: false, error: null, ready: true },
		global: { plugins: [i18n()], stubs: { apexchart: gauge } }
	})

	it("shows the seats reserved across every branch as one share", () => {
		const wrapper = mountGauge(SeatsGaugeCard)

		expect(wrapper.findComponent(gauge).props("series")).toEqual([86.66666666666667])
		expect(wrapper.text()).toContain("26 of 30 reserved")
		expect(wrapper.text()).not.toContain("Over capacity")
		wrapper.unmount()
	})

	it("narrows the seats to the page's branch", () => {
		const wrapper = mountGauge(SeatsGaugeCard, 2)

		expect(wrapper.findComponent(gauge).props("series")).toEqual([90])
		expect(wrapper.text()).toContain("9 of 10 reserved")
		wrapper.unmount()
	})

	it("says by how much the seats were sold past capacity, the gauge stopping at full", () => {
		const wrapper = mountGauge(SeatsGaugeCard, 3)

		expect(wrapper.findComponent(gauge).props("series")).toEqual([100])
		expect(wrapper.text()).toContain("12 of 10 reserved")
		expect(wrapper.text()).toContain("Over capacity by 2")
		wrapper.unmount()
	})

	it("shows the private offices leased across every branch, then in the page's branch", () => {
		const all = mountGauge(OfficesGaugeCard)
		expect(all.findComponent(gauge).props("series")).toEqual([50])
		expect(all.text()).toContain("3 of 6 leased")
		all.unmount()

		const one = mountGauge(OfficesGaugeCard, 1)
		expect(one.findComponent(gauge).props("series")).toEqual([25])
		expect(one.text()).toContain("1 of 4 leased")
		one.unmount()
	})

	it("has nothing to measure in a branch without private offices", () => {
		const wrapper = mountGauge(OfficesGaugeCard, 3)

		expect(wrapper.findComponent(gauge).exists()).toBe(false)
		expect(wrapper.text()).toContain(en.dashboard.stats.noOffices)
		wrapper.unmount()
	})
})

describe("useOverview", () => {
	it("shows a request that never arrived as an error, not an empty card", async () => {
		const failing = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
		const { data, error, isLoading } = useOverview(failing, ref({}))

		await flushPromises()

		expect(data.value).toBeNull()
		expect(error.value).toBeInstanceOf(TypeError)
		expect(isLoading.value).toBe(false)
	})
})
