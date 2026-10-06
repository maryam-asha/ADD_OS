import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import DiscountReportPage from "../DiscountReportPage.vue"

const { reportMock } = vi.hoisted(() => ({ reportMock: vi.fn() }))
vi.mock("@/add-os/services/discount-report", () => ({ getDiscountReport: reportMock }))

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

const totals = { operations: 1, list_points: 200, final_points: 136, points_by_kind: { offer: 40, plan_discount: 0, coupon: 24 }, saving_points: 600, effective_percent: 32 }

function row(overrides: Record<string, unknown> = {}) {
	return {
		record: { type: "booking", id: 812, reference: "BK-2026-00812" },
		member: { id: 31, name: "Sara", phone: "0991234567" },
		purpose: "booking",
		at: "2026-10-06T10:00:00Z",
		status: "confirmed",
		counted: true,
		list_points: 200,
		final_points: 136,
		discounts: [
			{ kind: "offer", name: "Meeting rooms week", code: null, points: 40, percent: 20 },
			{ kind: "coupon", name: null, code: "WELCOME20", points: 24, percent: 15 }
		],
		saving: null,
		...overrides
	}
}

async function mountPage() {
	const wrapper = mount(DiscountReportPage, { global: { plugins: [i18n] } })
	await flushPromises()
	return wrapper
}

/** GET admin/reports/discounts — pinned collection 2026-10-06. */
describe("discountReportPage", () => {
	beforeEach(() => {
		reportMock.mockReset()
		reportMock.mockResolvedValue({ data: [row(), row({ record: { type: "payment", id: 5, reference: null }, counted: false, status: "failed", discounts: [], saving: { points: 600, percent: 40, reference_name: "Monthly", units: 12 } })], total: 2, totals })
	})

	it("shows the totals the server computed, savings apart", async () => {
		const totalsCard = (await mountPage()).get("[data-test='report-totals']").text()
		expect(totalsCard).toContain("32%")
		expect(totalsCard).toContain("600")
		expect(totalsCard).toContain("136")
	})

	it("lists each operation with its discounts, reference and whether it counts", async () => {
		const text = (await mountPage()).text()
		expect(text).toContain("BK-2026-00812")
		expect(text).toContain("Meeting rooms week")
		expect(text).toContain("WELCOME20")
		expect(text).toContain(en.discountReport.counted.no)
		expect(text).toContain("Monthly")
	})

	it("asks again from the first page when a filter changes", async () => {
		const wrapper = await mountPage()
		reportMock.mockClear()
		;(wrapper.vm as unknown as { filters: { kind: string | null } }).filters.kind = "coupon"
		await flushPromises()
		expect(reportMock).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "coupon", page: 1 }))
	})
})
