import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import OfferReportPage from "../OfferReportPage.vue"

const { reportMock } = vi.hoisted(() => ({ reportMock: vi.fn() }))
vi.mock("@/add-os/services/offer-report", () => ({ getOfferReport: reportMock }))

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

const ROOMS = [{ purpose: "booking", plan_id: null, space_id: null, space_type: "room", event_id: null }]

function period(from: string, to: string, value: number) {
	return { from, to, discount_type: "percentage", discount_value: value, max_discount_points: null, min_amount_points: null, targets: ROOMS }
}

const offers = [
	{ id: 12, name: "Rooms week", code: null, deleted: false, periods: [period("2026-10-02T21:00:00+00:00", "2026-10-04T21:00:00+00:00", 20), period("2026-10-04T21:00:00+00:00", "2026-10-10T21:00:00+00:00", 30)], operations: 14, points: 560 },
	{ id: 15, name: "Packages", code: null, deleted: true, periods: [period("2026-10-15T09:00:00+00:00", "2026-10-20T13:30:00+00:00", 10)], operations: 3, points: 300 }
]

async function mountPage() {
	const wrapper = mount(OfferReportPage, { global: { plugins: [i18n] } })
	await flushPromises()
	return wrapper
}

/** GET admin/reports/offers — pinned collection 2026-10-07. */
describe("offerReportPage", () => {
	beforeEach(() => {
		reportMock.mockReset()
		reportMock.mockResolvedValue(offers)
	})

	it("asks for this month's offers on open", async () => {
		await mountPage()
		const query = reportMock.mock.calls[0][0]
		expect(query.type).toBe("offer")
		expect(query.from).toMatch(/^\d{4}-\d{2}-01$/)
		expect(query.to).toMatch(/^\d{4}-\d{2}-\d{2}$/)
	})

	it("lists each offer with every stretch it ran, on the terms it had then", async () => {
		const wrapper = await mountPage()
		const rows = wrapper.findAll("tbody tr").map(row => row.text())
		expect(rows).toHaveLength(2)
		expect(rows[0]).toContain("Rooms week")
		expect(rows[0]).toContain("20%")
		expect(rows[0]).toContain("30%")
		expect(rows[0]).toContain("14")
		expect(rows[0]).toContain("560")
		expect(wrapper.findAll("[data-test='offer-period']")).toHaveLength(3)
	})

	it("marks an offer deleted since", async () => {
		const rows = (await mountPage()).findAll("tbody tr")
		expect(rows[1].text()).toContain(en.offerReport.deleted)
		expect(rows[0].text()).not.toContain(en.offerReport.deleted)
	})

	it("switches to coupons", async () => {
		const wrapper = await mountPage()
		await wrapper.get("[data-test='offer-report-type-coupon']").trigger("click")
		await flushPromises()
		expect(reportMock.mock.lastCall?.[0].type).toBe("coupon")
	})

	it("says so when nothing ran", async () => {
		reportMock.mockResolvedValue([])
		expect((await mountPage()).text()).toContain(en.offerReport.empty)
	})
})
