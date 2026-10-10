import type {
	WalletBalanceResponse,
	WalletTopUp,
	WalletTopUpPayload
} from "@/add-os/modules/payments/types/wallet-top-up"
import { get, post } from "./api"

const BASE = "/api/v1/admin/reception/wallet-top-ups"
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

export async function getWalletBalance(params: { user_id?: number; company_id?: number; currency?: string }): Promise<WalletBalanceResponse> {
	const res = await get<{ data: WalletBalanceResponse }>(BALANCE_URL, params)
	return res.data
}
