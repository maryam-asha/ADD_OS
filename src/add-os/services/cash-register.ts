import type {
	CashRegisterSession,
	CloseSessionPayload,
	OpenSessionPayload
} from "@/add-os/modules/payments/types/cash-register"
import { get, post } from "./api"

const BASE = "/api/v1/admin/reception/cash-register-sessions"

export async function getCurrentSession(): Promise<CashRegisterSession | null> {
	const res = await get<{ data: CashRegisterSession | null }>(`${BASE}/current`)
	return res.data ?? null
}

export async function openCashRegisterSession(payload: OpenSessionPayload): Promise<CashRegisterSession> {
	const res = await post<{ data: CashRegisterSession }>(`${BASE}/open`, payload)
	return res.data
}

export async function closeCashRegisterSession(id: number, payload: CloseSessionPayload): Promise<CashRegisterSession> {
	const res = await post<{ data: CashRegisterSession }>(`${BASE}/${id}/close`, payload)
	return res.data
}

export async function listCashRegisterSessions(params?: {
	status?: string
	branch_id?: number
	page?: number
}): Promise<{ data: CashRegisterSession[]; meta?: { current_page: number; last_page: number; total: number } }> {
	return get<{ data: CashRegisterSession[]; meta?: { current_page: number; last_page: number; total: number } }>(
		BASE,
		params
	)
}
