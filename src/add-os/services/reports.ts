import type { CurrencyCode } from "@/add-os/utils/format/currency"
import { get } from "./api"
import { formatCurrency, isCurrencyCode } from "@/add-os/utils/format/currency"
import { formatNumber } from "@/add-os/utils/format/numbers"

// ── Shared Types ─────────────────────────────────────────────────────────────

export interface OutstandingBalance {
	currency: string
	remaining: string
	overdue: string
}

export interface DebtAging {
	currency: string
	"0_30": string
	"31_60": string
	"60_plus": string
}

export interface ReportDateParams {
	from?: string | null
	to?: string | null
}

/** Formats money as it is — no trailing zeros ("300", "150.5") — with its own currency, never merged. */
export function formatReportMoney(amount: string | number, currency: string): string {
	if (isCurrencyCode(currency)) {
		return formatCurrency(amount, { currency: currency as CurrencyCode })
	}
	return `${formatNumber(amount, { trimZeros: true })} ${currency}`
}

// ── Provider Portal: Companies Report ────────────────────────────────────────

export interface CompanyMembershipReport {
	plan_name: string | null
	seats: number
	current_period_end: string | null
	auto_renew: boolean
	renewal_stop_reason: string | null
	renewal_stop_reason_label: string | null
}

export interface ProviderCompanyReportItem {
	id: number
	legal_name: string
	status: string
	members_count: number
	membership: CompanyMembershipReport | null
	active_leases_count: number
	outstanding: OutstandingBalance[]
}

export async function getProviderCompaniesReport(): Promise<ProviderCompanyReportItem[]> {
	const res = await get<{ data: ProviderCompanyReportItem[] }>("/api/v1/provider/reports/companies")
	return res.data
}

// ── Provider Portal: Invoices Statement ──────────────────────────────────────

export interface PayerInvoiceTotals {
	currency: string
	billed: string
	paid: string
	remaining: string
	overdue: string
}

export interface ProviderInvoiceTotals {
	currency: string
	billed: string
	paid: string
	remaining: string
	overdue: string
	by_payer: {
		provider: PayerInvoiceTotals
		company: PayerInvoiceTotals
	}
}

export interface CompanyInvoiceStatement {
	company: {
		id: number
		legal_name: string
	}
	totals: Array<{
		currency: string
		billed: string
		paid: string
		remaining: string
		overdue: string
	}>
}

export interface ProviderInvoicesReportData {
	totals: ProviderInvoiceTotals[]
	aging: DebtAging[]
	by_company: CompanyInvoiceStatement[]
}

export async function getProviderInvoicesReport(params?: ReportDateParams): Promise<ProviderInvoicesReportData> {
	const query: Record<string, unknown> = {}
	if (params?.from) query.from = params.from
	if (params?.to) query.to = params.to
	const res = await get<{ data: ProviderInvoicesReportData }>("/api/v1/provider/reports/invoices", query)
	return res.data
}

// ── Admin: Providers Report ──────────────────────────────────────────────────

export interface ProviderBranchShare {
	branch_id: number | null
	branch_name: string | null
	seats: number
	capacity: number
	share: string | null
}

export interface AdminProviderReportItem {
	id: number
	name: string
	status: string
	active_companies: number
	seats: number
	branch_share: ProviderBranchShare[]
	active_leases: number
	outstanding: OutstandingBalance[]
}

export async function getAdminProvidersReport(): Promise<AdminProviderReportItem[]> {
	const res = await get<{ data: AdminProviderReportItem[] }>("/api/v1/admin/reports/providers")
	return res.data
}

// ── Admin: Revenue Report ────────────────────────────────────────────────────

export type RevenueSourceKey = "plan_assignment" | "wallet_top_up" | "office_lease" | "membership_renewal"

export interface RevenueTotal {
	currency: string
	billed: string
	paid: string
	remaining: string
	overdue: string
}

export interface RevenueBySource {
	currency: string
	source: RevenueSourceKey
	billed: string
	paid: string
	remaining: string
}

export interface OverduePayer {
	payer: {
		type: "provider" | "company"
		id: number
		name: string | null
	}
	currency: string
	overdue: string
}

export interface AdminRevenueReportData {
	totals: RevenueTotal[]
	by_source: RevenueBySource[]
	aging: DebtAging[]
	top_overdue: OverduePayer[]
}

export interface AdminRevenueReportParams extends ReportDateParams {
	provider_id?: number | null
}

export async function getAdminRevenueReport(params?: AdminRevenueReportParams): Promise<AdminRevenueReportData> {
	const query: Record<string, unknown> = {}
	if (params?.from) query.from = params.from
	if (params?.to) query.to = params.to
	if (params?.provider_id) query.provider_id = params.provider_id
	const res = await get<{ data: AdminRevenueReportData }>("/api/v1/admin/reports/revenue", query)
	return res.data
}
