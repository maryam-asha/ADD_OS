import type { Paginated, RawPaginatedResponse } from "./pagination"
import type { AdminPayment, PaymentMethodInfo, PaymentsSummary } from "@/add-os/modules/payments/types/payment"
import { get, post } from "./api"
import { rowsOf, toPaginated } from "./pagination"

/**
 * The Payments section: every payment by any method, their totals, and the
 * methods themselves. The list and the summary take the same filters
 * (`status`, `method`, `purpose`, `from`/`to` as Y-m-d, `search`).
 */

const BASE = "/api/v1/admin/payments"

export type PaymentsQuery = Record<string, unknown>

export async function listPayments(query?: PaymentsQuery): Promise<Paginated<AdminPayment>> {
	return toPaginated(await get<RawPaginatedResponse<AdminPayment>>(BASE, query))
}

export async function getPaymentsSummary(query?: PaymentsQuery): Promise<PaymentsSummary> {
	const res = await get<{ data: PaymentsSummary }>(`${BASE}/summary`, query)
	return res.data
}

export async function getPayment(id: number): Promise<AdminPayment> {
	const res = await get<{ data: AdminPayment }>(`${BASE}/${id}`)
	return res.data
}

/** Reverses an accepted card payment at the bank. Needs `payments.reverse`. */
export async function reversePayment(id: number): Promise<string> {
	const res = await post<{ message: string }>(`${BASE}/${id}/reverse`)
	return res.message
}

export async function listPaymentMethods(): Promise<PaymentMethodInfo[]> {
	const res = await get<{ data: PaymentMethodInfo[] }>("/api/v1/admin/payment-methods")
	return rowsOf<PaymentMethodInfo>(res.data)
}
