import type { DiscountReport, DiscountReportQuery, DiscountReportRow, DiscountReportTotals } from "@/add-os/modules/pricing/types/discount-report"
import { get } from "./api"

/**
 * The discount report — pinned collection 2026-10-06, `Admin (Dashboard) /
 * Reports / Discount Report`. Read by admin and operations alike, like the
 * coupon reads. Nothing here is computed: rows and totals are the server's.
 */
const BASE = "/api/v1/admin/reports/discounts"

interface RawDiscountReport {
	data: DiscountReportRow[]
	meta: { current_page: number, per_page: number, total: number, last_page: number, totals: DiscountReportTotals }
}

export async function getDiscountReport(query: DiscountReportQuery): Promise<DiscountReport> {
	// An unset filter is left out, not sent empty: the server validates what it gets.
	const params = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== null && value !== ""))
	const response = await get<RawDiscountReport>(BASE, params)

	return { data: response.data, total: response.meta.total, totals: response.meta.totals }
}
