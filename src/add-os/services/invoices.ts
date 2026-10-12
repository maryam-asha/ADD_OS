import type { Paginated } from "./pagination"
import type { Invoice, RecordInvoicePaymentPayload } from "@/add-os/modules/providers/types"
import { get, post } from "./api"

export async function listInvoices(query?: Record<string, unknown>): Promise<Paginated<Invoice>> {
	return get<Paginated<Invoice>>("/api/v1/admin/invoices", query)
}

export async function getInvoice(id: number): Promise<Invoice> {
	const res = await get<{ data: Invoice }>(`/api/v1/admin/invoices/${id}`)
	return res.data
}

export async function recordInvoicePayment(id: number, payload: RecordInvoicePaymentPayload): Promise<void> {
	await post(`/api/v1/admin/invoices/${id}/payments`, payload)
}

export async function voidInvoicePayment(paymentId: number, reason: string): Promise<void> {
	await post(`/api/v1/admin/invoice-payments/${paymentId}/void`, { reason })
}

export async function cancelInvoice(id: number, reason: string): Promise<void> {
	await post(`/api/v1/admin/invoices/${id}/cancel`, { reason })
}
