import type { ExchangeRate, ExchangeRatePayload } from "@/add-os/modules/payments/types/exchange-rate"
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
