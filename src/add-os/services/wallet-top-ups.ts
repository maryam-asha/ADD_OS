import type {
	WalletBalanceResponse,
	WalletTopUp,
	WalletTopUpPayload,
	WalletTopUpPreview,
	WalletTopUpPreviewPayload
} from "@/add-os/modules/payments/types/wallet-top-up"
import { get, post } from "./api"

const BASE = "/api/v1/admin/reception/wallet-top-ups"
const PREVIEW_URL = `${BASE}/preview`
const BALANCE_URL = "/api/v1/admin/reception/wallet-balance"

/**
 * Create-only. The collection exposes no GET/list for this resource, so there is
 * deliberately no `listWalletTopUps` here to go looking for — a top-up history
 * screen is blocked on a backend endpoint, not on this file.
 */
export async function createWalletTopUp(payload: WalletTopUpPayload): Promise<WalletTopUp> {
	const res = await post<{ data: WalletTopUp }>(BASE, payload)
	return res.data
}

/**
 * Quotes what a payment would buy, without writing anything.
 *
 * This exists so the dialog never divides cash by the point rate itself: the
 * ceil-once rounding rule lives on the server, and a client-side copy would
 * drift the moment an admin edits the rate. A payment too small to buy one
 * whole point comes back as a 422, not a zero-point success — callers must
 * surface that rather than treating it as "no preview available".
 */
export async function previewWalletTopUp(payload: WalletTopUpPreviewPayload): Promise<WalletTopUpPreview> {
	const res = await post<{ data: WalletTopUpPreview }>(PREVIEW_URL, payload)
	return res.data
}

export async function getWalletBalance(params: { user_id?: number; company_id?: number; currency?: string }): Promise<WalletBalanceResponse> {
	const res = await get<{ data: WalletBalanceResponse }>(BALANCE_URL, params)
	return res.data
}
