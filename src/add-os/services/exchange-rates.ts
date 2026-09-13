import type { ExchangeRate, ExchangeRatePayload, ExchangeRateSuggestion } from "@/add-os/modules/payments/types/exchange-rate"
import { get, post } from "./api"

const BASE = "/api/v1/admin/exchange-rates"

export async function listExchangeRates(): Promise<ExchangeRate[]> {
	const res = await get<{ data: ExchangeRate[] }>(BASE)
	return res.data
}

export async function createExchangeRate(payload: ExchangeRatePayload): Promise<ExchangeRate> {
	const res = await post<{ data: ExchangeRate }>(BASE, payload)
	return res.data
}

export async function getExchangeRateSuggestion(): Promise<ExchangeRateSuggestion> {
	return get<ExchangeRateSuggestion>(`${BASE}/suggestion`)
}

export async function dismissExchangeRateSuggestion(id: number): Promise<{ message: string }> {
	return post<{ message: string }>(`${BASE}/suggestion/${id}/dismiss`)
}

export async function syncExchangeRates(): Promise<{ message: string; data: ExchangeRate | null }> {
	return post<{ message: string; data: ExchangeRate | null }>(`${BASE}/sync`)
}

