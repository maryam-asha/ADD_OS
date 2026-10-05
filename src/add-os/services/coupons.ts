import type { Paginated, RawPaginatedResponse } from "./pagination"
import type { Coupon, CouponPayload, CouponRedemption } from "@/add-os/modules/pricing/types/coupon"
import { couponToPayload } from "@/add-os/modules/pricing/utils/coupon-payload"
import { del, get, post, put } from "./api"
import { toPaginated } from "./pagination"

/**
 * Discount coupons — collection pinned 2026-10-05, `Admin (Dashboard) /
 * Coupons`. Reads are open to admin and operations; writes are admin-only
 * on the server (`role:admin`), gated in the UI by `canManageCoupons()`.
 */
const BASE = "/api/v1/admin/coupons"

export async function listCoupons(query?: Record<string, unknown>): Promise<Paginated<Coupon>> {
	return toPaginated(await get<RawPaginatedResponse<Coupon>>(BASE, query))
}

/** The only read that carries `user_ids`. */
export async function getCoupon(id: number): Promise<Coupon> {
	return (await get<{ data: Coupon }>(`${BASE}/${id}`)).data
}

export async function listCouponRedemptions(id: number, query?: Record<string, unknown>): Promise<Paginated<CouponRedemption>> {
	return toPaginated(await get<RawPaginatedResponse<CouponRedemption>>(`${BASE}/${id}/redemptions`, query))
}

export async function createCoupon(payload: CouponPayload): Promise<Coupon> {
	return (await post<{ data: Coupon }>(BASE, payload)).data
}

/** Full body only — the server requires code, discount_type and discount_value on every update. */
export async function updateCoupon(id: number, payload: CouponPayload): Promise<{ message: string }> {
	return put<{ message: string }>(`${BASE}/${id}`, payload)
}

/** 204, or an `ApiError` 409 once the code has been used — the caller offers deactivation. */
export async function deleteCoupon(id: number): Promise<void> {
	await del<unknown>(`${BASE}/${id}`)
}

/**
 * Switches a coupon on or off without touching anything else: re-reads the
 * detail (so `user_ids` are the real ones) and sends all of it back.
 */
export async function setCouponActive(id: number, active: boolean): Promise<{ message: string }> {
	const payload = couponToPayload(await getCoupon(id))
	return updateCoupon(id, { ...payload, is_active: active })
}
