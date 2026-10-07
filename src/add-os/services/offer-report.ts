import type { OfferReportQuery, OfferReportRow } from "@/add-os/modules/pricing/types/offer-report"
import { get } from "./api"

/**
 * Which offers ran in a period — pinned collection 2026-10-07, `Admin
 * (Dashboard) / Reports / Offer Report`. Read by admin and operations alike.
 * Not paginated. Nothing here is computed: the stretches are the server's.
 */
const BASE = "/api/v1/admin/reports/offers"

export async function getOfferReport(query: OfferReportQuery): Promise<OfferReportRow[]> {
	// Offers are the server's default; `type` is sent only for coupons.
	const params: Record<string, string> = { from: query.from, to: query.to }
	if (query.type === "coupon") params.type = "coupon"

	return (await get<{ data: OfferReportRow[] }>(BASE, params)).data
}
